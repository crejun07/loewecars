ALTER TABLE public.spare_parts
  ADD CONSTRAINT spare_parts_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicle_stock(id) ON DELETE SET NULL;