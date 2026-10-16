import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Download, Eye, FilePlus2, Loader2, Trash2, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const BUCKET = "vehicle-documents";

export function VehicleDocuments({ vehicleId }: { vehicleId: string | null }) {
  const { canEdit } = usePermissions();
  const editable = canEdit("stock");
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ name: string; fileName: string; url: string; type: string } | null>(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [previewWidth, setPreviewWidth] = useState(600);
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ["vehicle_documents", vehicleId], enabled: !!vehicleId,
    queryFn: async () => {
      if (!vehicleId) return [];
      const { data, error } = await supabase.from("vehicle_documents").select("*").eq("vehicle_id", vehicleId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function upload() {
    if (!vehicleId || !file || !name.trim() || busy) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("El archivo no puede superar 25 MB"); return; }
    setBusy(true);
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadError) throw uploadError;
      const { error: saveError } = await supabase.from("vehicle_documents").insert({ vehicle_id: vehicleId, name: name.trim(), file_path: path, file_name: file.name, content_type: file.type || "application/octet-stream" });
      if (saveError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw saveError;
      }
      setName(""); setFile(null);
      await qc.invalidateQueries({ queryKey: ["vehicle_documents", vehicleId] });
      toast.success("Documento añadido");
    } catch { toast.error("No se pudo guardar el documento. Vuelve a intentarlo."); }
    finally { setBusy(false); }
  }

  async function show(doc: typeof documents[number]) {
    setBusy(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600);
      if (error || !data) throw error;
      setPage(1); setPages(0);
      setPreview({ name: doc.name, fileName: doc.file_name, url: data.signedUrl, type: doc.file_name.toLowerCase().endsWith(".pdf") ? "application/pdf" : doc.content_type });
    } catch { toast.error("No se pudo abrir el documento"); }
    finally { setBusy(false); }
  }

  async function remove(doc: typeof documents[number]) {
    if (!confirm(`¿Eliminar el documento «${doc.name}»?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("vehicle_documents").delete().eq("id", doc.id);
      if (error) throw error;
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.file_path]);
      if (storageError) toast.error("Documento eliminado de la ficha; no se pudo borrar el archivo almacenado");
      await qc.invalidateQueries({ queryKey: ["vehicle_documents", vehicleId] });
    } catch { toast.error("No se pudo eliminar el documento"); }
    finally { setBusy(false); }
  }

  return (
    <section className="col-span-2 min-w-0 space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Documentación del vehículo</h3>
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {error && <p className="text-sm text-destructive">No se pudo cargar la documentación.</p>}
      {documents.map((doc) => <div key={doc.id} className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => show(doc)} className="h-auto min-h-9 min-w-0 flex-1 justify-start whitespace-normal break-words text-left"><Eye className="mr-2 h-4 w-4 shrink-0" />Ver {doc.name}</Button>
        {editable && <Button type="button" variant="ghost" size="icon" title={`Eliminar ${doc.name}`} disabled={busy} onClick={() => remove(doc)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
      </div>)}
      {vehicleId && !isLoading && !error && documents.length === 0 && <p className="text-xs text-muted-foreground">Sin documentación.</p>}
      {!vehicleId ? <p className="text-xs text-muted-foreground">Guarda el vehículo para añadir documentación.</p> : editable && <div className="space-y-2">
        <Input aria-label="Nombre del documento" placeholder="Nombre del documento" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
        <Button type="button" variant="outline" disabled={busy} className={`h-auto min-h-20 w-full flex-col gap-2 whitespace-normal border-dashed ${dragging ? "border-primary bg-primary/10" : ""}`} onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) setFile(e.dataTransfer.files[0] ?? null); }}>
          <Upload className="h-5 w-5 shrink-0" /><span className="max-w-full break-all">{file?.name || "Seleccionar archivo o arrastrar aquí"}</span>
        </Button>
        <input ref={input} type="file" className="hidden" aria-label="Archivo del documento" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <Button type="button" size="sm" disabled={busy || !file || !name.trim()} onClick={upload}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}Añadir documentación</Button>
      </div>}
      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col">
          <DialogHeader><DialogTitle className="break-words pr-6">{preview?.name}</DialogTitle></DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto" ref={(el) => { if (el && el.clientWidth !== previewWidth) setPreviewWidth(el.clientWidth); }}>
            {preview?.type === "application/pdf" ? <Document file={preview.url} onLoadSuccess={({ numPages }) => setPages(numPages)} loading={<p>Cargando documento…</p>} error={<p className="text-destructive">No se pudo visualizar el PDF. Puedes descargarlo.</p>}><Page pageNumber={page} width={previewWidth} renderTextLayer={false} renderAnnotationLayer={false} /></Document> : preview?.type.startsWith("image/") ? <img src={preview.url} alt={preview.name} className="mx-auto max-h-[65vh] max-w-full object-contain" /> : <p className="py-6 text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">{pages > 0 && <><Button type="button" size="icon" variant="outline" title="Página anterior" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">{page} / {pages}</span><Button type="button" size="icon" variant="outline" title="Página siguiente" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></>}</div>
            {preview && <Button type="button" variant="outline" asChild><a href={preview.url} download={preview.fileName} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Descargar</a></Button>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}