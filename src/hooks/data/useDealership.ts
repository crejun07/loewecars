import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStock() {
  return useQuery({
    queryKey: ["vehicle_stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_stock")
        .select("*")
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAppraisals() {
  return useQuery({
    queryKey: ["vehicle_appraisals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_appraisals")
        .select("*, client:clients(id, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, client:clients(id, full_name), vehicle:vehicle_stock(id, brand, model, year, license_plate)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkshop() {
  return useQuery({
    queryKey: ["workshop"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workshop")
        .select("*, vehicle:vehicle_stock(id, brand, model, year, license_plate)")
        .order("task_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSpareParts() {
  return useQuery({
    queryKey: ["spare_parts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spare_parts")
        .select("*, vehicle:vehicle_stock(id, brand, model, year, license_plate)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}