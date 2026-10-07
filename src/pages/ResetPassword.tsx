import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const t = setTimeout(() => setReady((r) => r), 0);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (p1.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (p1 !== p2) return toast.error("Las contraseñas no coinciden");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setBusy(false);
    if (error) return toast.error("No se pudo cambiar la contraseña. Pide un nuevo enlace.");
    toast.success("Contraseña actualizada");
    navigate("/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Nueva contraseña</h1>
        </div>
        {!ready ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando enlace…
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Repite la contraseña</Label>
              <Input type="password" value={p2} onChange={(e) => setP2(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar contraseña
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
