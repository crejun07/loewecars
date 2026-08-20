import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import ClientsPage from "./pages/databases/Clients.tsx";
import StockPage from "./pages/databases/Stock.tsx";
import AuctionsPage from "./pages/databases/Auctions.tsx";
import AppraisalsPage from "./pages/databases/Appraisals.tsx";
import SalesPage from "./pages/databases/Sales.tsx";
import WorkshopPage from "./pages/databases/Workshop.tsx";
import SparePartsPage from "./pages/databases/SpareParts.tsx";
import ReportsPage from "./pages/databases/Reports.tsx";
import SettingsPage from "./pages/Settings.tsx";
import HistoryPage from "./pages/History.tsx";
import AuthPage from "./pages/Auth.tsx";
import ChatPage from "./pages/Chat.tsx";
import CatalogPage from "./pages/Catalog.tsx";
import AgendaPage from "./pages/Agenda.tsx";
import TasksPage from "./pages/Tasks.tsx";
import { AppLayout } from "./components/layout/AppLayout.tsx";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PermissionsProvider } from "./hooks/usePermissions";
import { PermissionGuard } from "./components/PermissionGuard";
import { ChatNotificationsProvider } from "./hooks/useChatNotifications";
import { useAgendaNotifications } from "./hooks/useAgendaNotifications";

const queryClient = new QueryClient();

function AppShell({ children }: { children: ReactNode }) {
  useAgendaNotifications();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <PermissionsProvider>
                    <ChatNotificationsProvider>
                    <AppShell>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/clients" element={<PermissionGuard workspace="clients"><ClientsPage /></PermissionGuard>} />
                        <Route path="/appraisals" element={<PermissionGuard workspace="appraisals"><AppraisalsPage /></PermissionGuard>} />
                        <Route path="/sales" element={<PermissionGuard workspace="sales"><SalesPage /></PermissionGuard>} />
                        <Route path="/stock" element={<PermissionGuard workspace="stock"><StockPage /></PermissionGuard>} />
                        <Route path="/auctions" element={<PermissionGuard workspace="stock"><AuctionsPage /></PermissionGuard>} />
                        <Route path="/workshop" element={<PermissionGuard workspace="workshop"><WorkshopPage /></PermissionGuard>} />
                        <Route path="/spare-parts" element={<PermissionGuard workspace="spare-parts"><SparePartsPage /></PermissionGuard>} />
                        <Route path="/catalog" element={<CatalogPage />} />
                        <Route path="/agenda" element={<AgendaPage />} />
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/reports" element={<PermissionGuard workspace="reports"><ReportsPage /></PermissionGuard>} />
                        <Route path="/history" element={<PermissionGuard workspace="history"><HistoryPage /></PermissionGuard>} />
                        <Route path="/settings" element={<PermissionGuard workspace="settings"><SettingsPage /></PermissionGuard>} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                    </AppShell>
                    </ChatNotificationsProvider>
                  </PermissionsProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
