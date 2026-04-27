import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import ClientsPage from "./pages/databases/Clients.tsx";
import StockPage from "./pages/databases/Stock.tsx";
import AppraisalsPage from "./pages/databases/Appraisals.tsx";
import SalesPage from "./pages/databases/Sales.tsx";
import WorkshopPage from "./pages/databases/Workshop.tsx";
import { AppLayout } from "./components/layout/AppLayout.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/appraisals" element={<AppraisalsPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/workshop" element={<WorkshopPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
