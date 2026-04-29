import { LayoutDashboard, Users, ClipboardList, ShoppingCart, Car, Wrench, Package, FileText, LogOut, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, type Workspace } from "@/hooks/usePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items: { title: string; url: string; icon: any; ws: Workspace }[] = [
  { title: "Panel", url: "/", icon: LayoutDashboard, ws: "dashboard" },
  { title: "Clientes", url: "/clients", icon: Users, ws: "clients" },
  { title: "Tasaciones", url: "/appraisals", icon: ClipboardList, ws: "appraisals" },
  { title: "Ventas", url: "/sales", icon: ShoppingCart, ws: "sales" },
  { title: "Stock", url: "/stock", icon: Car, ws: "stock" },
  { title: "Taller", url: "/workshop", icon: Wrench, ws: "workshop" },
  { title: "Recambios", url: "/spare-parts", icon: Package, ws: "spare-parts" },
  { title: "Informes", url: "/reports", icon: FileText, ws: "reports" },
  { title: "Ajustes", url: "/settings", icon: Settings, ws: "settings" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { canView } = usePermissions();
  const visibleItems = items.filter((it) => it.ws === "dashboard" || canView(it.ws));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Car className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">Driveline</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Gestión Concesionario</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Espacio de trabajo</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const active =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          {!collapsed && user?.email && (
            <div className="truncate px-2 py-1 text-[11px] text-muted-foreground" title={user.email}>
              {user.email}
            </div>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}