import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, type AppRole, type Workspace, type PermissionRow } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ROLES: AppRole[] = ["comercial", "mecanico", "administracion", "informatica", "gerente"];
const WORKSPACES: { key: Workspace; label: string }[] = [
  { key: "dashboard", label: "Panel" },
  { key: "clients", label: "Clientes" },
  { key: "appraisals", label: "Tasaciones" },
  { key: "sales", label: "Ventas" },
  { key: "stock", label: "Stock" },
  { key: "workshop", label: "Taller" },
  { key: "spare-parts", label: "Recambios" },
  { key: "reports", label: "Informes" },
  { key: "history", label: "Historial" },
  { key: "settings", label: "Ajustes" },
];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin (legado)",
  employee: "Empleado (legado)",
  comercial: "Comercial",
  mecanico: "Mecánico",
  administracion: "Administración",
  informatica: "Informática",
  gerente: "Gerente",
};

interface UserRow {
  id: string;
  full_name: string | null;
  username: string | null;
  role: AppRole | null;
}

export default function SettingsPage() {
  const { isInformatica, loading, permissions, refresh } = usePermissions();
  const [perms, setPerms] = useState<PermissionRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    username: "",
    role: "comercial" as AppRole,
  });

  useEffect(() => {
    setPerms(permissions);
  }, [permissions]);

  useEffect(() => {
    if (!isInformatica) return;
    loadUsers();
  }, [isInformatica]);

  async function loadUsers() {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, username");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, AppRole>();
    (roles ?? []).forEach((r: any) => map.set(r.user_id, r.role));
    setUsers(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        role: map.get(p.id) ?? null,
      })),
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isInformatica) return <Navigate to="/" replace />;

  function getCell(role: AppRole, ws: Workspace) {
    return perms.find((p) => p.role === role && p.workspace === ws) ?? {
      role,
      workspace: ws,
      can_view: false,
      can_edit: false,
    };
  }

  function setCell(role: AppRole, ws: Workspace, patch: Partial<PermissionRow>) {
    setPerms((prev) => {
      const idx = prev.findIndex((p) => p.role === role && p.workspace === ws);
      const base = idx >= 0 ? prev[idx] : { role, workspace: ws, can_view: false, can_edit: false };
      const next = { ...base, ...patch };
      if (next.can_edit) next.can_view = true;
      const copy = [...prev];
      if (idx >= 0) copy[idx] = next;
      else copy.push(next);
      return copy;
    });
  }

  async function savePermissions() {
    setSaving(true);
    const rows = ROLES.flatMap((r) =>
      WORKSPACES.map((w) => {
        const c = getCell(r, w.key);
        return { role: r, workspace: w.key, can_view: c.can_view, can_edit: c.can_edit, can_view_sensitive: !!c.can_view_sensitive };
      }),
    );
    const { error } = await supabase
      .from("role_permissions")
      .upsert(rows, { onConflict: "role,workspace" });
    setSaving(false);
    if (error) {
      toast.error("Error al guardar permisos: " + error.message);
    } else {
      toast.success("Permisos guardados");
      await refresh();
    }
  }

  async function changeUserRole(userId: string, role: AppRole) {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Rol actualizado");
    loadUsers();
  }

  async function createUser() {
    if (!newUser.email || !newUser.password) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: newUser,
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Error al crear usuario");
      return;
    }
    toast.success("Usuario creado");
    setCreateOpen(false);
    setNewUser({ email: "", password: "", full_name: "", username: "", role: "comercial" });
    loadUsers();
  }

  return (
    <div>
      <PageHeader title="Ajustes" description="Gestión de permisos y roles de usuarios" />
      <div className="p-6">
        <Tabs defaultValue="permissions">
          <TabsList>
            <TabsTrigger value="permissions">Permisos por rol</TabsTrigger>
            <TabsTrigger value="users">Usuarios y roles</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-4">
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Espacio</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WORKSPACES.map((w) => (
                    <TableRow key={w.key}>
                      <TableCell className="font-medium">{w.label}</TableCell>
                      {ROLES.map((r) => {
                        const c = getCell(r, w.key);
                        return (
                          <TableCell key={r} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <label className="flex items-center gap-1 text-xs">
                                <Checkbox
                                  checked={c.can_view}
                                  onCheckedChange={(v) =>
                                    setCell(r, w.key, { can_view: !!v, can_edit: !v ? false : c.can_edit })
                                  }
                                />
                                Ver
                              </label>
                              <label className="flex items-center gap-1 text-xs">
                                <Checkbox
                                  checked={c.can_edit}
                                  onCheckedChange={(v) => setCell(r, w.key, { can_edit: !!v })}
                                />
                                Editar
                              </label>
                              <label className="flex items-center gap-1 text-xs" title="Ver datos sensibles (precio de compra, márgenes...)">
                                <Checkbox
                                  checked={!!c.can_view_sensitive}
                                  onCheckedChange={(v) => setCell(r, w.key, { can_view_sensitive: !!v })}
                                />
                                Sensible
                              </label>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={savePermissions} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="mb-3 flex justify-end">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" /> Añadir usuario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo usuario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nombre completo</Label>
                      <Input
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Usuario</Label>
                      <Input
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="opcional, para login"
                      />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Contraseña *</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <Label>Rol *</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(v) => setNewUser({ ...newUser, role: v as AppRole })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                      Cancelar
                    </Button>
                    <Button onClick={createUser} disabled={creating}>
                      {creating ? "Creando..." : "Crear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="w-[240px]">Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.username || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role ?? undefined}
                          onValueChange={(v) => changeUserRole(u.id, v as AppRole)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin rol" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        No hay usuarios
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}