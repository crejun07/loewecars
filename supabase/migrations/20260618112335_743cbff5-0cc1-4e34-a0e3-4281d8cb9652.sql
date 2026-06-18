
-- Sequence for appraisal number
CREATE SEQUENCE IF NOT EXISTS public.vehicle_appraisal_number_seq;

ALTER TABLE public.vehicle_appraisals
  ADD COLUMN IF NOT EXISTS appraisal_number INTEGER NOT NULL DEFAULT nextval('public.vehicle_appraisal_number_seq'),
  ADD COLUMN IF NOT EXISTS appraisal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS operation_type TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS metallic BOOLEAN,
  ADD COLUMN IF NOT EXISTS doors INTEGER,
  ADD COLUMN IF NOT EXISTS license_plate TEXT,
  ADD COLUMN IF NOT EXISTS first_registration_date DATE,
  ADD COLUMN IF NOT EXISTS displacement INTEGER,
  ADD COLUMN IF NOT EXISTS horsepower INTEGER,
  ADD COLUMN IF NOT EXISTS climate_control TEXT,
  ADD COLUMN IF NOT EXISTS service_manual BOOLEAN,
  ADD COLUMN IF NOT EXISTS service_history BOOLEAN,
  ADD COLUMN IF NOT EXISTS service_seal BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_invoices BOOLEAN,
  ADD COLUMN IF NOT EXISTS timing_belt_done BOOLEAN,
  ADD COLUMN IF NOT EXISTS timing_belt_invoice BOOLEAN,
  ADD COLUMN IF NOT EXISTS clutch_done BOOLEAN,
  ADD COLUMN IF NOT EXISTS clutch_invoice BOOLEAN,
  ADD COLUMN IF NOT EXISTS upholstery TEXT,
  ADD COLUMN IF NOT EXISTS keys_count INTEGER,
  ADD COLUMN IF NOT EXISTS anti_theft BOOLEAN,
  ADD COLUMN IF NOT EXISTS parcel_shelf BOOLEAN,
  ADD COLUMN IF NOT EXISTS spare_wheel BOOLEAN,
  ADD COLUMN IF NOT EXISTS heated_seats BOOLEAN,
  ADD COLUMN IF NOT EXISTS multifunction_steering BOOLEAN,
  ADD COLUMN IF NOT EXISTS navigator BOOLEAN,
  ADD COLUMN IF NOT EXISTS bluetooth BOOLEAN,
  ADD COLUMN IF NOT EXISTS sunroof BOOLEAN,
  ADD COLUMN IF NOT EXISTS led_xenon TEXT,
  ADD COLUMN IF NOT EXISTS rear_camera BOOLEAN,
  ADD COLUMN IF NOT EXISTS front_camera BOOLEAN,
  ADD COLUMN IF NOT EXISTS camera_360 BOOLEAN,
  ADD COLUMN IF NOT EXISTS electric_seats BOOLEAN,
  ADD COLUMN IF NOT EXISTS alloy_wheels BOOLEAN,
  ADD COLUMN IF NOT EXISTS drive_type TEXT,
  ADD COLUMN IF NOT EXISTS industrial_type TEXT,
  ADD COLUMN IF NOT EXISTS body_type TEXT,
  ADD COLUMN IF NOT EXISTS tires_front TEXT,
  ADD COLUMN IF NOT EXISTS tires_rear TEXT,
  ADD COLUMN IF NOT EXISTS interior_steering TEXT,
  ADD COLUMN IF NOT EXISTS interior_knob TEXT,
  ADD COLUMN IF NOT EXISTS interior_seats TEXT,
  ADD COLUMN IF NOT EXISTS appraisal_value NUMERIC,
  ADD COLUMN IF NOT EXISTS workshop_value NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_other TEXT;

ALTER SEQUENCE public.vehicle_appraisal_number_seq OWNED BY public.vehicle_appraisals.appraisal_number;

-- Unique appraisal number
CREATE UNIQUE INDEX IF NOT EXISTS vehicle_appraisals_appraisal_number_key
  ON public.vehicle_appraisals(appraisal_number);
