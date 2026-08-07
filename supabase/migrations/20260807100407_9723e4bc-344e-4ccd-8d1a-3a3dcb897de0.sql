ALTER TABLE public.vehicle_appraisals
  ADD COLUMN IF NOT EXISTS stock_request_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stock_vehicle_id uuid REFERENCES public.vehicle_stock(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.appraisal_stock_request_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deal_status = 'purchased'
     AND (TG_OP = 'INSERT' OR OLD.deal_status IS DISTINCT FROM NEW.deal_status)
     AND COALESCE(NEW.stock_request_status, 'none') = 'none' THEN
    NEW.stock_request_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appraisal_stock_request ON public.vehicle_appraisals;
CREATE TRIGGER trg_appraisal_stock_request
BEFORE INSERT OR UPDATE ON public.vehicle_appraisals
FOR EACH ROW EXECUTE FUNCTION public.appraisal_stock_request_trigger();

CREATE TYPE public.online_appraisal_status AS ENUM ('pending','interested','will_come','not_interested','too_many_km','rejected');

CREATE TABLE public.online_appraisals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  brand text NOT NULL,
  model text NOT NULL,
  version text,
  vehicle_age text,
  mileage integer,
  horsepower integer,
  fuel_type fuel_type,
  market_value numeric,
  offered_value numeric,
  status online_appraisal_status NOT NULL DEFAULT 'pending',
  contact_name text,
  contact_email text,
  contact_phone text,
  wants_appointment boolean NOT NULL DEFAULT false,
  appointment_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_appraisals TO authenticated;
GRANT ALL ON public.online_appraisals TO service_role;

ALTER TABLE public.online_appraisals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view online appraisals" ON public.online_appraisals
FOR SELECT TO authenticated
USING (public.user_can_view_workspace(auth.uid(), 'appraisals'));

CREATE POLICY "insert online appraisals" ON public.online_appraisals
FOR INSERT TO authenticated
WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'appraisals'));

CREATE POLICY "update online appraisals" ON public.online_appraisals
FOR UPDATE TO authenticated
USING (public.user_can_edit_workspace(auth.uid(), 'appraisals'))
WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'appraisals'));

CREATE POLICY "delete online appraisals" ON public.online_appraisals
FOR DELETE TO authenticated
USING (public.user_can_edit_workspace(auth.uid(), 'appraisals'));

CREATE TRIGGER trg_online_appraisals_updated
BEFORE UPDATE ON public.online_appraisals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();