import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Req = { bucket: string; path: string; name: string };
type Loaded = { blob: Blob; blobUrl: string; signedUrl: string | null; kind: "pdf" | "image" | "other"; fileName: string };
const EVT = "open-pdf-viewer";

export function openStoredPdf(bucket: string, path: string, name: string) {
  window.dispatchEvent(new CustomEvent<Req>(EVT, { detail: { bucket, path, name } }));
}

export function PdfViewerHost() {
  const [req, setReq] = useState<Req | null>(null);
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(0);
  const [width, setWidth] = useState(800);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = async (e: Event) => {
      const r = (e as CustomEvent<Req>).detail;
      setReq(r); setDoc(null); setPages(0); setLoading(true);
      const [dl, signed] = await Promise.all([
        supabase.storage.from(r.bucket).download(r.path),
        supabase.storage.from(r.bucket).createSignedUrl(r.path, 3600),
      ]);
      setLoading(false);
      if (dl.error || !dl.data) { toast.error("No se pudo cargar el documento"); setReq(null); return; }
      const lower = r.path.toLowerCase();
      const ext = lower.split(".").pop() || "";
      const kind: Loaded["kind"] = ext === "pdf" || dl.data.type === "application/pdf" ? "pdf" : dl.data.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? "image" : "other";
      const blob = kind === "pdf" ? new Blob([dl.data], { type: "application/pdf" }) : dl.data;
      const fileName = ext && !r.name.toLowerCase().endsWith(`.${ext}`) ? `${r.name}.${ext}` : r.name;
      setDoc({ blob, blobUrl: URL.createObjectURL(blob), signedUrl: signed.data?.signedUrl ?? null, kind, fileName });
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  useEffect(() => () => { if (doc) URL.revokeObjectURL(doc.blobUrl); }, [doc]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(280, el.clientWidth - 32)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [req, doc]);

  return (
    <Dialog open={!!req} onOpenChange={(o) => { if (!o) { setReq(null); setDoc(null); } }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
          <DialogTitle className="truncate">{req?.name}</DialogTitle>
          {doc && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={doc.blobUrl} download={doc.fileName}><Download className="h-4 w-4 mr-1" />Descargar</a>
              </Button>
              {doc.signedUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={doc.signedUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Pestaña nueva</a>
                </Button>
              )}
            </div>
          )}
        </DialogHeader>
        <div ref={box} className="flex-1 min-h-0 overflow-auto rounded-md border bg-muted p-4">
          {loading && <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {doc?.kind === "pdf" && (
            <Document
              file={doc.blob}
              onLoadSuccess={({ numPages }) => setPages(numPages)}
              loading={<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}
              error={<p className="py-10 text-center text-sm text-destructive">No se pudo mostrar el PDF. Puedes descargarlo.</p>}
            >
              <div className="flex flex-col items-center gap-4">
                {Array.from({ length: pages }, (_, i) => (
                  <Page key={i} pageNumber={i + 1} width={width} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-md" />
                ))}
              </div>
            </Document>
          )}
          {doc?.kind === "image" && <img src={doc.blobUrl} alt={req?.name} className="mx-auto max-h-full max-w-full object-contain" />}
          {doc?.kind === "other" && <p className="py-10 text-center text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo. Puedes descargarlo.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
