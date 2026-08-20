CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  license_plate text,
  year integer,
  mileage integer,
  fuel_type fuel_type,
  transmission transmission_type,
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  auction_house text,
  auction_date date,
  lot_reference text,
  payment_done boolean NOT NULL DEFAULT false,
  payment_date date,
  withdrawal_authorized boolean NOT NULL DEFAULT false,
  ready_for_pickup boolean NOT NULL DEFAULT false,
  picked_up boolean NOT NULL DEFAULT false,
  picked_up_date date,
  picked_up_by text,
  image_url text,
  notes text,
  stock_request_status text NOT NULL DEFAULT 'none',
  stock_vehicle_id uuid REFERENCES public.vehicle_stock(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auctions_select" ON public.auctions FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'stock'));
CREATE POLICY "auctions_insert" ON public.auctions FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY "auctions_update" ON public.auctions FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'stock'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY "auctions_delete" ON public.auctions FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'stock'));

CREATE TRIGGER trg_auctions_updated BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.auction_stock_request_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.picked_up = true
     AND (TG_OP = 'INSERT' OR OLD.picked_up IS DISTINCT FROM NEW.picked_up)
     AND COALESCE(NEW.stock_request_status, 'none') = 'none' THEN
    NEW.stock_request_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auction_stock_request BEFORE INSERT OR UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.auction_stock_request_trigger();

CREATE TRIGGER audit_auctions AFTER INSERT OR UPDATE OR DELETE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();