import { useRef, useState } from "react";
import { Camera, Upload, Trash2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Photo = { position: string; url: string; path: string };

const SLOTS: { key: string; label: string }[] = [
  { key: "front", label: "Frontal" },
  { key: "left", label: "Lateral izq." },
  { key: "right", label: "Lateral der." },
  { key: "rear", label: "Trasera" },
  { key: "interior", label: "Interior" },
];

interface Props {
  appraisalId: string | null;
  photos: Photo[];
  onChange: (next: Photo[]) => void;
}

export function AppraisalPhotos({ appraisalId, photos, onChange }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!appraisalId) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        Guarda la tasación antes de subir fotos.
      </div>
    );
  }

  async function handleFile(key: string, file: File | null | undefined) {
    if (!file || !appraisalId) return;
    setBusyKey(key);
    try {
      const existing = photos.find((p) => p.position === key);
      if (existing?.path) {
        await supabase.storage.from("vehicle-images").remove([existing.path]);
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `appraisals/${appraisalId}/${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("vehicle-images")
        .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (error) { toast.error(error.message); return; }
      const { data } = supabase.storage.from("vehicle-images").getPublicUrl(path);
      const next = photos.filter((p) => p.position !== key);
      next.push({ position: key, url: data.publicUrl, path });
      const { error: upErr } = await supabase
        .from("vehicle_appraisals")
        .update({ photos: next as any })
        .eq("id", appraisalId);
      if (upErr) { toast.error(upErr.message); return; }
      onChange(next);
      toast.success("Foto guardada");
    } finally {
      setBusyKey(null);
    }
  }

  async function removePhoto(key: string) {
    const p = photos.find((x) => x.position === key);
    if (!p || !appraisalId) return;
    if (!confirm("¿Eliminar foto?")) return;
    setBusyKey(key);
    try {
      if (p.path) await supabase.storage.from("vehicle-images").remove([p.path]);
      const next = photos.filter((x) => x.position !== key);
      const { error } = await supabase
        .from("vehicle_appraisals")
        .update({ photos: next as any })
        .eq("id", appraisalId);
      if (error) { toast.error(error.message); return; }
      onChange(next);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {SLOTS.map((slot) => {
        const photo = photos.find((p) => p.position === slot.key);
        const busy = busyKey === slot.key;
        return (
          <div key={slot.key} className="flex flex-col gap-2 rounded-md border border-border bg-card p-2">
            <div className="text-xs font-medium text-muted-foreground">{slot.label}</div>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded bg-muted">
              {photo ? (
                <img src={photo.url} alt={slot.label} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              )}
              {busy && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs">Subiendo…</div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <input
                ref={(el) => (uploadRefs.current[slot.key] = el)}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleFile(slot.key, e.target.files?.[0]); e.target.value = ""; }}
              />
              <input
                ref={(el) => (cameraRefs.current[slot.key] = el)}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => { handleFile(slot.key, e.target.files?.[0]); e.target.value = ""; }}
              />
              <Button
                type="button" size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled={busy}
                onClick={() => uploadRefs.current[slot.key]?.click()}
              >
                <Upload className="mr-1 h-3 w-3" />Subir
              </Button>
              <Button
                type="button" size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled={busy}
                onClick={() => cameraRefs.current[slot.key]?.click()}
              >
                <Camera className="mr-1 h-3 w-3" />Cámara
              </Button>
              {photo && (
                <Button
                  type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                  disabled={busy} onClick={() => removePhoto(slot.key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}