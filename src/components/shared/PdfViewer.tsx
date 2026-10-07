import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Req = { bucket: string; path: string; name: string };
const EVT = "open-pdf-viewer";

export function openStoredPdf(bucket: string, path: string, name: string) {
  window.dispatchEvent(new CustomEvent<Req>(EVT, { detail: { bucket, path, name } }));
}

export function PdfViewerHost() {
  const [req, setReq] = useState<Req | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = async (e: Event) => {
      const r = (e as CustomEvent<Req>).detail;
      setReq(r); setUrl(null); setLoading(true);
      const { data, error } = await supabase.storage.from(r.bucket).download(r.path);
      setLoading(false);
      if (error || !data) { toast.error("No se pudo cargar el documento"); setReq(null); return; }
      const isPdf = r.path.toLowerCase().endsWith(".pdf") || data.type === "application/pdf";
      const blob = isPdf ? new Blob([data], { type: "application/pdf" }) : data;
      setUrl(URL.createObjectURL(blob));
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  return (
    <Dialog open={!!req} onOpenChange={(o) => { if (!o) { setReq(null); setUrl(null); } }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
          <DialogTitle className="truncate">{req?.name}</DialogTitle>
          {url && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={url} download={req?.name}><Download className="h-4 w-4 mr-1" />Descargar</a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Pestaña nueva</a>
              </Button>
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 min-h-0 rounded-md border bg-muted">
          {loading && <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {url && (
            <object data={url} type="application/pdf" className="w-full h-full rounded-md">
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Tu navegador ha bloqueado el visor integrado. Abre el documento en una pestaña nueva o descárgalo.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" asChild>
                    <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" />Abrir en pestaña nueva</a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={url} download={req?.name}><Download className="h-4 w-4 mr-1" />Descargar</a>
                  </Button>
                </div>
              </div>
            </object>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
