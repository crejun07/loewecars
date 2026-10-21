import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useClients } from "@/hooks/data/useDealership";
import { buildVehicleMessage, defaultHighlights, normalizePhone, vehicleHighlights, whatsappUrl } from "@/lib/whatsapp";

export function WhatsAppShare({ vehicle }: { vehicle: any }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [text, setText] = useState("");
  const { data: clients = [] } = useClients() as any;

  useEffect(() => {
    if (open) {
      const h = defaultHighlights(vehicle);
      setHighlights(h);
      setText(buildVehicleMessage(vehicle, h));
      setPhone(""); setClientQuery(""); setExtra("");
    }
  }, [open, vehicle]);

  const regen = (h: string[]) => { setHighlights(h); setText(buildVehicleMessage(vehicle, h)); };
  const toggle = (h: string) => regen(highlights.includes(h) ? highlights.filter((x) => x !== h) : [...highlights, h]);
  const addExtra = () => { const t = extra.trim(); if (t && !highlights.includes(t)) regen([...highlights, t]); setExtra(""); };

  const matches = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return [];
    return (clients as any[]).filter((c) => c.phone && `${c.full_name ?? ""} ${c.phone}`.toLowerCase().includes(q)).slice(0, 6);
  }, [clientQuery, clients]);

  const allOptions = [...vehicleHighlights, ...highlights.filter((h) => !(vehicleHighlights as readonly string[]).includes(h))];
  const valid = normalizePhone(phone).length >= 10;

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="w-full gap-2 bg-success text-success-foreground hover:bg-success/90">
        <MessageCircle className="h-4 w-4" /> Compartir por WhatsApp
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Enviar {vehicle.brand} {vehicle.model} por WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Buscar cliente</Label>
              <Input placeholder="Nombre o teléfono…" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
              {matches.length > 0 && (
                <div className="rounded-md border border-border">
                  {matches.map((c) => (
                    <button key={c.id} type="button" className="flex w-full justify-between px-3 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => { setPhone(c.phone); setClientQuery(""); }}>
                      <span>{c.full_name}</span><span className="text-muted-foreground">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input aria-label="Teléfono" placeholder="600 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Puntos a favor</Label>
              <div className="grid gap-1.5">
                {allOptions.map((h) => (
                  <label key={h} className="flex items-start gap-2 text-sm">
                    <Checkbox checked={highlights.includes(h)} onCheckedChange={() => toggle(h)} className="mt-0.5" />{h}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Añadir otro punto (ej. Techo panorámico)" value={extra} onChange={(e) => setExtra(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtra(); } }} />
                <Button type="button" variant="outline" onClick={addExtra}>Añadir</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mensaje (puedes editarlo)</Label>
              <Textarea aria-label="Mensaje" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <Button type="button" disabled={!valid} className="w-full gap-2"
              onClick={() => window.open(whatsappUrl(phone, text), "_blank", "noopener")}>
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
