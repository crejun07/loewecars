DO $$ BEGIN
  CREATE TYPE public.transmission_type AS ENUM ('manual', 'automatic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.vehicle_appraisals
  ADD COLUMN IF NOT EXISTS transmission public.transmission_type,
  ADD COLUMN IF NOT EXISTS assigned_to text;