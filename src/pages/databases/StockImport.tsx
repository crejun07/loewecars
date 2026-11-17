import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Copy, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  parseCsv, detectDelimiter, guessField, mapRow, analyzeRows,
  STOCK_FIELDS, normalizePlate, normalizeVin,
  type StockField, type AnalyzedRow, type ExistingVehicle,
} from "@/lib/vehicleImport";
import { fuelTypeLabels, transmissionLabels, stockStatusLabels, vehicleHolderLabels } from "@/lib/labels";

type Step = "upload" | "map" | "preview" | "done";
type DupMode = "skip" | "update";

const SAMPLE = `marca;modelo;matricula;bastidor;ano;km;combustible;cambio;cv;precio_venta;foto
SEAT;León 1.5 TSI;1234 ABC;VSSZZZ5FZJR000001;2019;68000;gasolina;manual;130;15900;https://ejemplo.com/leon.jpg
BMW;320d;5678-DEF;WBA8E1100JA000002;2020;95000;diesel;automatico;190;21500;https://ejemplo.com/320d.jpg`;

export default function StockImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, StockField | "">>({});
  const [analyzed, setAnalyzed] = useState<AnalyzedRow[]>([]);
  const [dupMode, setDupMode] = useState<DupMode>("skip");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Step 1: load the file / pasted text -------------------------------
  function loadText(text: string) {
    setRaw(text);
    const matrix = parseCsv(text);
    if (matrix.length < 2) {
      toast.error("El archivo necesita una fila de cabecera y al menos un coche.");
      return;
    }
    const hdr = matrix[0].map((h) => h.trim());
    const body = matrix.slice(1);
    setHeaders(hdr);
    setRows(body);
    const guessed: Record<number, StockField | ""> = {};
    hdr.forEach((h, i) => { guessed[i] = guessField(h); });
    setMapping(guessed);
    setStep("map");
    toast.success(`Detectadas ${body.length} filas · separador "${detectDelimiter(text)}"`);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => loadText(String(r.result || ""));
    r.onerror = () => toast.error("No se pudo leer el archivo.");
    r.readAsText(f, "UTF-8");
  }

  // ---- Step 2: mapping ----------------------------------------------------
  const mappedFields = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const hasBrand = mappedFields.has("brand");
  const hasModel = mappedFields.has("model");

  function setCol(idx: number, field: StockField | "") {
    setMapping((m) => ({ ...m, [idx]: field }));
  }

  async function analyze() {
    if (!hasBrand || !hasModel) {
      toast.error("Debes mapear al menos Marca y Modelo.");
      return;
    }
    const mapped = rows.map((r) => mapRow(r, mapping));
    // Fetch existing stock (plate + vin) to compare. RLS keeps it scoped.
    const { data, error } = await supabase
      .from("vehicle_stock")
      .select("id, brand, model, license_plate, vin");
    if (error) { toast.error("No se pudo leer el stock actual: " + error.message); return; }
    const existing = (data || []) as ExistingVehicle[];
    setAnalyzed(analyzeRows(mapped, existing));
    setStep("preview");
  }

  // ---- Step 3: preview summary -------------------------------------------
  const counts = useMemo(() => {
    const c = { new: 0, duplicate_db: 0, duplicate_file: 0, invalid: 0 };
    for (const a of analyzed) c[a.status]++;
    return c;
  }, [analyzed]);

  const importableCount = counts.new + (dupMode === "update" ? counts.duplicate_db : 0);

  // ---- Import -------------------------------------------------------------
  async function runImport() {
    setImporting(true);
    setProgress(0);
    const today = new Date().toISOString().slice(0, 10);
    let created = 0, updated = 0, skipped = 0, failed = 0;

    const toInsert: any[] = [];
    const toUpdate: { id: string; patch: any }[] = [];

    for (const a of analyzed) {
      if (a.status === "invalid") { skipped++; continue; }
      if (a.status === "duplicate_file") { skipped++; continue; }
      const row = a.row;
      const plate = row.license_plate ? row.license_plate.trim().toUpperCase() : null;
      const vin = row.vin ? normalizeVin(row.vin) : null;
      const year = row.first_registration_date
        ? Number(row.first_registration_date.slice(0, 4))
        : row.year ?? null;

      if (a.status === "duplicate_db") {
        if (dupMode === "skip" || !a.existingId) { skipped++; continue; }
        // Update only the fields that commonly change, and only when present,
        // so we never wipe existing data with blanks from the file.
        const patch: any = {};
        if (row.selling_price != null) patch.selling_price = row.selling_price;
        if (row.purchase_price != null) patch.purchase_price = row.purchase_price;
        if (row.mileage != null) patch.mileage = row.mileage;
        if (row.image_url) patch.image_url = row.image_url;
        if (row.location) patch.location = row.location;
        if (row.next_itv_date) patch.next_itv_date = row.next_itv_date;
        if (row.status) patch.status = row.status;
        if (row.notes) patch.notes = row.notes;
        if (Object.keys(patch).length === 0) { skipped++; continue; }
        toUpdate.push({ id: a.existingId, patch });
      } else {
        toInsert.push({
          brand: row.brand,
          model: row.model,
          license_plate: plate,
          vin: vin || null,
          year,
          first_registration_date: row.first_registration_date,
          mileage: row.mileage,
          fuel_type: row.fuel_type,
          transmission: row.transmission,
          horsepower: row.horsepower,
          holder: row.holder,
          purchase_price: row.purchase_price ?? 0,
          selling_price: row.selling_price ?? 0,
          status: row.status || "preparing",
          listing_status: "pending_listing",
          location: row.location,
          next_itv_date: row.next_itv_date,
          vat_type: row.vat_type || "rg",
          notes: row.notes,
          image_url: row.image_url,
          entry_date: today,
          insured: false,
        });
      }
    }

    const total = toInsert.length + toUpdate.length || 1;
    let done = 0;

    // Insert in chunks
    for (let i = 0; i < toInsert.length; i += 50) {
      const chunk = toInsert.slice(i, i + 50);
      const { error, count } = await supabase
        .from("vehicle_stock")
        .insert(chunk, { count: "exact" });
      if (error) { failed += chunk.length; }
      else created += count ?? chunk.length;
      done += chunk.length;
      setProgress(Math.round((done / total) * 100));
    }

    // Updates one by one (different patch each)
    for (const u of toUpdate) {
      const { error } = await supabase.from("vehicle_stock").update(u.patch).eq("id", u.id);
      if (error) failed++; else updated++;
      done++;
      setProgress(Math.round((done / total) * 100));
    }

    setResult({ created, updated, skipped, failed });
    setImporting(false);
    setStep("done");
    if (failed === 0) toast.success(`Importación completada: ${created} nuevos, ${updated} actualizados.`);
    else toast.warning(`Importado con ${failed} errores.`);
  }

  // ---- Render -------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Importar coches"
        description="Sube un CSV (de WordPress, Excel…) y controla los duplicados por matrícula y bastidor antes de añadirlos al stock."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/stock")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver a stock
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto p-6">
        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => {
            const labels = { upload: "1 · Archivo", map: "2 · Columnas", preview: "3 · Revisar", done: "4 · Listo" };
            const active = step === s;
            const past = (["upload", "map", "preview", "done"] as Step[]).indexOf(step) > i;
            return (
              <div key={s} className={`rounded-full px-3 py-1 ${active ? "bg-primary text-primary-foreground" : past ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                {labels[s]}
              </div>
            );
          })}
        </div>

        {/* STEP 1 — upload */}
        {step === "upload" && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card
              className="flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-10 text-center hover:border-primary/50"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Haz clic para elegir un archivo CSV</p>
                <p className="text-sm text-muted-foreground">Exporta tu stock de WordPress/WooCommerce o Excel como CSV</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={onFile} />
            </Card>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">…o pega los datos directamente:</p>
              <Textarea
                rows={6}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="Pega aquí el contenido del CSV (primera fila = nombres de columna)"
                className="font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button onClick={() => loadText(raw)} disabled={!raw.trim()}>
                  <FileText className="mr-1.5 h-4 w-4" /> Procesar datos pegados
                </Button>
                <Button variant="ghost" onClick={() => { setRaw(SAMPLE); }}>
                  <Copy className="mr-1.5 h-4 w-4" /> Rellenar con ejemplo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — mapping */}
        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Asigna cada columna del archivo a un campo del stock. Hemos intentado adivinarlas.
              <strong className="text-foreground"> Marca</strong> y <strong className="text-foreground">Modelo</strong> son obligatorias;
              la <strong className="text-foreground">matrícula</strong> (y el bastidor) son las que evitan duplicados.
            </p>
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Columna del archivo</TableHead>
                    <TableHead className="w-[30%]">Se importa como</TableHead>
                    <TableHead>Ejemplo (primera fila)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{h || <span className="text-muted-foreground">(col {i + 1})</span>}</TableCell>
                      <TableCell>
                        <Select value={mapping[i] || "none"} onValueChange={(v) => setCol(i, v === "none" ? "" : (v as StockField))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— No importar —</SelectItem>
                            {STOCK_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key} disabled={mappedFields.has(f.key) && mapping[i] !== f.key}>
                                {f.label}{f.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="max-w-[1px] truncate text-sm text-muted-foreground">{rows[0]?.[i] || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("upload")}>Atrás</Button>
              <div className="flex items-center gap-3">
                {(!hasBrand || !hasModel) && (
                  <span className="flex items-center gap-1 text-sm text-amber-600"><AlertTriangle className="h-4 w-4" /> Falta mapear {!hasBrand ? "Marca" : "Modelo"}</span>
                )}
                <Button onClick={analyze} disabled={!hasBrand || !hasModel}>Revisar duplicados →</Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryTile label="Nuevos" value={counts.new} tone="green" />
              <SummaryTile label="Ya existen" value={counts.duplicate_db} tone="amber" />
              <SummaryTile label="Repetidos en archivo" value={counts.duplicate_file} tone="slate" />
              <SummaryTile label="Con errores" value={counts.invalid} tone="red" />
            </div>

            {counts.duplicate_db > 0 && (
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">¿Qué hago con los {counts.duplicate_db} coches que ya existen?</p>
                <RadioGroup value={dupMode} onValueChange={(v) => setDupMode(v as DupMode)} className="gap-2">
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="skip" id="skip" className="mt-0.5" />
                    <Label htmlFor="skip" className="font-normal">
                      <span className="font-medium">Omitir</span> — no tocar los que ya están (recomendado)
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="update" id="update" className="mt-0.5" />
                    <Label htmlFor="update" className="font-normal">
                      <span className="font-medium">Actualizar</span> — refrescar precio, km, foto, ubicación y estado de los existentes
                    </Label>
                  </div>
                </RadioGroup>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="max-h-[42vh] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Marca / Modelo</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Bastidor</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyzed.map((a, i) => (
                      <TableRow key={i} className={a.status === "invalid" ? "opacity-60" : ""}>
                        <TableCell><RowIcon status={a.status} /></TableCell>
                        <TableCell><RowBadge a={a} dupMode={dupMode} /></TableCell>
                        <TableCell className="font-medium">{[a.row.brand, a.row.model].filter(Boolean).join(" ") || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{a.row.license_plate || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.row.vin || "—"}</TableCell>
                        <TableCell className="text-right">{a.row.selling_price != null ? a.row.selling_price.toLocaleString("es-ES") + " €" : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.errors.length ? <span className="text-red-600">{a.errors.join(" · ")}</span>
                            : a.existingLabel ? `Coincide con: ${a.existingLabel}` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {importing && <Progress value={progress} className="h-2" />}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("map")} disabled={importing}>Atrás</Button>
              <Button onClick={runImport} disabled={importing || importableCount === 0}>
                {importing ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Importando…</>
                  : <>Importar {importableCount} {importableCount === 1 ? "coche" : "coches"}</>}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — done */}
        {step === "done" && result && (
          <div className="mx-auto max-w-md space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="text-lg font-semibold">Importación completada</h2>
            <Card className="p-4 text-left">
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between"><span>Nuevos añadidos</span><strong>{result.created}</strong></li>
                <li className="flex justify-between"><span>Actualizados</span><strong>{result.updated}</strong></li>
                <li className="flex justify-between"><span>Omitidos (duplicados/errores)</span><strong>{result.skipped}</strong></li>
                {result.failed > 0 && <li className="flex justify-between text-red-600"><span>Fallidos</span><strong>{result.failed}</strong></li>}
              </ul>
            </Card>
            <div className="flex justify-center gap-2">
              <Button onClick={() => navigate("/stock")}><Car className="mr-1.5 h-4 w-4" /> Ver stock</Button>
              <Button variant="outline" onClick={() => { setStep("upload"); setRaw(""); setRows([]); setHeaders([]); setAnalyzed([]); setResult(null); }}>
                Importar otro archivo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "slate" | "red" }) {
  const tones = {
    green: "text-green-600", amber: "text-amber-600", slate: "text-foreground", red: "text-red-600",
  };
  return (
    <Card className="p-4">
      <div className={`text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}

function RowIcon({ status }: { status: AnalyzedRow["status"] }) {
  if (status === "new") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "invalid") return <AlertTriangle className="h-4 w-4 text-red-600" />;
  return <AlertTriangle className="h-4 w-4 text-amber-600" />;
}

function RowBadge({ a, dupMode }: { a: AnalyzedRow; dupMode: DupMode }) {
  if (a.status === "new") return <Badge className="bg-green-600 hover:bg-green-600">Nuevo</Badge>;
  if (a.status === "invalid") return <Badge variant="destructive">Error</Badge>;
  if (a.status === "duplicate_file") return <Badge variant="secondary">Repetido</Badge>;
  return <Badge variant="outline" className="border-amber-500 text-amber-600">{dupMode === "update" ? "Actualizar" : "Ya existe"}</Badge>;
}
