import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import logoMark from "@/assets/logo-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "login" | "reset-email" | "reset-code";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
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

  async function resolveEmail(id: string): Promise<string | null> {
    let email = id.trim();
    if (!email.includes("@")) {
      const { data, error } = await supabase.functions.invoke("resolve-username", {
        body: { username: email },
      });
      if (error || !data?.email) return null;
      email = data.email as string;
    }
    return email;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    try {
      const email = await resolveEmail(identifier);
      if (!email) {
        toast.error("Usuario o contraseña incorrectos");
        return;
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

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setBusy(true);
    try {
      const email = await resolveEmail(resetEmail);
      if (!email) {
        toast.error("No existe ninguna cuenta con ese email o usuario");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
      });
      if (error) {
        toast.error("No se pudo enviar el código. Inténtalo de nuevo.");
        return;
      }
      setResetEmail(email);
      setMode("reset-code");
      toast.success("Te hemos enviado un código a tu correo");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== newPassword2) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: code.trim(),
        type: "recovery",
      });
      if (error) {
        toast.error("Código incorrecto o caducado. Pide uno nuevo.");
        return;
      }
      const { error: upErr } = await supabase.auth.updateUser({ password: newPassword });
      if (upErr) {
        toast.error("No se pudo cambiar la contraseña. Inténtalo de nuevo.");
        return;
      }
      toast.success("Contraseña actualizada. Ya puedes entrar.");
      await supabase.auth.signOut();
      setMode("login");
      setCode(""); setNewPassword(""); setNewPassword2(""); setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        {/* Banner */}
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/90 via-primary to-primary/90 px-8 py-8 text-center shadow-lg">
          <img
            src={logoMark}
            alt="LoeweCars — Coches que definen tu estilo"
            className="mx-auto h-28 w-28 object-contain drop-shadow-lg"
          />
          <p className="mt-3 text-sm text-primary-foreground/80">Sistema de gestión interna</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {mode === "login" && (
            <>
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
                <button
                  type="button"
                  onClick={() => setMode("reset-email")}
                  className="w-full text-center text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            </>
          )}

          {mode === "reset-email" && (
            <>
              <div className="mb-1 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Restablecer contraseña</h2>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Escribe tu email o usuario y te enviaremos un código a tu correo registrado.
              </p>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email o usuario</Label>
                  <Input
                    id="reset-email"
                    type="text"
                    autoComplete="username"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="tu@email.com o usuario"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
                </button>
              </form>
            </>
          )}

          {mode === "reset-code" && (
            <>
              <div className="mb-1 flex items-center gap-2">
                <MailCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Introduce el código</h2>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Hemos enviado un código a <span className="font-medium text-foreground">{resetEmail}</span>. Escríbelo aquí junto con tu nueva contraseña.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Código del correo</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password2">Repite la contraseña</Label>
                  <Input
                    id="new-password2"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar contraseña"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("reset-email")}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver a enviar el código
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          ¿Problemas para acceder? Contacta con el administrador.
        </p>
      </div>
    </div>
  );
}
