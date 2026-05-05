import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Workspace =
  | "dashboard"
  | "clients"
  | "appraisals"
  | "sales"
  | "stock"
  | "workshop"
  | "spare-parts"
  | "reports"
  | "history"
  | "settings";

export type AppRole =
  | "admin"
  | "employee"
  | "comercial"
  | "mecanico"
  | "administracion"
  | "informatica"
  | "gerente";

export interface PermissionRow {
  role: AppRole;
  workspace: Workspace;
  can_view: boolean;
  can_edit: boolean;
}

interface PermissionsContextValue {
  roles: AppRole[];
  permissions: PermissionRow[];
  loading: boolean;
  canView: (ws: Workspace) => boolean;
  canEdit: (ws: Workspace) => boolean;
  isInformatica: boolean;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) {
      setRoles([]);
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Retry up to 3 times with backoff to survive transient backend issues
    let attempt = 0;
    while (attempt < 3) {
      const [rolesRes, permsRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("role_permissions").select("role,workspace,can_view,can_edit"),
      ]);
      if (!rolesRes.error && !permsRes.error) {
        setRoles((rolesRes.data ?? []).map((r: any) => r.role as AppRole));
        setPermissions((permsRes.data ?? []) as PermissionRow[]);
        setLoading(false);
        return;
      }
      attempt++;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
    // Final attempt failed — keep previous state but stop loading
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const canView = (ws: Workspace) =>
    permissions.some((p) => roles.includes(p.role) && p.workspace === ws && p.can_view);
  const canEdit = (ws: Workspace) =>
    permissions.some((p) => roles.includes(p.role) && p.workspace === ws && p.can_edit);
  const isInformatica = roles.includes("informatica");

  return (
    <PermissionsContext.Provider
      value={{ roles, permissions, loading, canView, canEdit, isInformatica, refresh: load }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}