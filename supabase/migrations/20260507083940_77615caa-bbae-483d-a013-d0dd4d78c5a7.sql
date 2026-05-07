ALTER TABLE public.spare_parts
  ADD CONSTRAINT spare_parts_workshop_id_fkey
  FOREIGN KEY (workshop_id) REFERENCES public.workshop(id) ON DELETE SET NULL;