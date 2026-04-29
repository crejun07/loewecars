import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePermissions, type Workspace } from "@/hooks/usePermissions";

export function PermissionGuard({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  const { canView, loading } = usePermissions();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!canView(workspace)) return <Navigate to="/" replace />;
  return <>{children}</>;
}