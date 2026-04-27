-- Add plug-in hybrid to existing fuel_type enum
ALTER TYPE public.fuel_type ADD VALUE IF NOT EXISTS 'plug_in_hybrid';

-- Listing status enum for web publication
DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('listed', 'pending_listing', 'not_listed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reuse transmission_type created previously for appraisals
ALTER TABLE public.vehicle_stock
  ADD COLUMN IF NOT EXISTS transmission public.transmission_type,
  ADD COLUMN IF NOT EXISTS listing_status public.listing_status NOT NULL DEFAULT 'pending_listing';