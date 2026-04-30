import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Car, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    try {
      let email = identifier.trim();
      // If it doesn't look like an email, treat as username and resolve
      if (!email.includes("@")) {
        const { data, error } = await supabase.functions.invoke("resolve-username", {
          body: { username: email },
        });
        if (error || !data?.email) {
          toast.error("Usuario o contraseña incorrectos");
          return;
        }
        email = data.email as string;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Usuario o contraseña incorrectos");
        return;
      }
      toast.success("Bienvenido");
      navigate("/", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Banner */}
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/90 via-primary to-primary/90 px-8 py-10 text-center shadow-lg">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15 backdrop-blur-sm">
            <Car className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary-foreground">Loewe Cars</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">Sistema de gestión interna</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Iniciar sesión</h2>
          <p className="mb-5 text-sm text-muted-foreground">Accede con tu email o nombre de usuario</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email o usuario</Label>
              <Input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="tu@email.com o usuario"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          ¿Problemas para acceder? Contacta con el administrador.
        </p>
      </div>
    </div>
  );
}