import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
      <div className="h-dvh flex w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-2 text-xs text-muted-foreground">Internal · Dealership Management</div>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}