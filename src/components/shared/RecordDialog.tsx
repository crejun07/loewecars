import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  trigger: ReactNode;
  title: string;
  description?: string;
  onSubmit: () => Promise<void> | void;
  children: ReactNode;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RecordDialog({ trigger, title, description, onSubmit, children, submitLabel = "Guardar", open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open! : internalOpen;
  const setOpenRaw = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const setOpen = (v: boolean) => {
    if (!v) setConfirming(false);
    setOpenRaw(v);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!confirming) {
              setConfirming(true);
              return;
            }
            setBusy(true);
            try {
              await onSubmit();
              setOpen(false);
            } finally {
              setBusy(false);
              setConfirming(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">{children}</div>
          {confirming && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">¿Confirmar guardado?</div>
                <div className="text-xs opacity-90">Revisa los datos antes de continuar. Pulsa de nuevo para confirmar.</div>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={busy}
              variant={confirming ? "destructive" : "default"}
            >
              {busy ? "Guardando…" : confirming ? "Confirmar" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${full ? "col-span-2" : ""}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}