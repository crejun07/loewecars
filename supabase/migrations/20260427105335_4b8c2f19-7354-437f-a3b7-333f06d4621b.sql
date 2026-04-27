-- Enums for status fields
CREATE TYPE client_type AS ENUM ('seller', 'buyer', 'both');
CREATE TYPE client_status AS ENUM ('new', 'in_followup', 'closed');
CREATE TYPE appraisal_status AS ENUM ('pending', 'offer_sent', 'negotiating', 'purchased', 'rejected');
CREATE TYPE sale_status AS ENUM ('new_lead', 'interested', 'test_drive', 'negotiating', 'reserved', 'sold', 'lost');
CREATE TYPE stock_status AS ENUM ('preparing', 'available', 'reserved', 'sold');
CREATE TYPE workshop_status AS ENUM ('pending', 'in_progress', 'completed', 'waiting_parts');
CREATE TYPE fuel_type AS ENUM ('gasoline', 'diesel', 'hybrid', 'electric', 'lpg', 'other');

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  client_type client_type NOT NULL DEFAULT 'buyer',
  status client_status NOT NULL DEFAULT 'new',
  notes TEXT,
  last_contact_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VEHICLE STOCK
CREATE TABLE public.vehicle_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  mileage INTEGER,
  fuel_type fuel_type,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit_margin NUMERIC(12,2) GENERATED ALWAYS AS (selling_price - purchase_price) STORED,
  status stock_status NOT NULL DEFAULT 'preparing',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_itv_date DATE,
  location TEXT,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VEHICLE APPRAISALS (cars clients want to sell us)
CREATE TABLE public.vehicle_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  mileage INTEGER,
  fuel_type fuel_type,
  vehicle_condition TEXT,
  estimated_price NUMERIC(12,2),
  offered_price NUMERIC(12,2),
  deal_status appraisal_status NOT NULL DEFAULT 'pending',
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicle_stock(id) ON DELETE SET NULL,
  customer_budget NUMERIC(12,2),
  sale_status sale_status NOT NULL DEFAULT 'new_lead',
  next_contact_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORKSHOP
CREATE TABLE public.workshop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicle_stock(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status workshop_status NOT NULL DEFAULT 'pending',
  cost NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stock_updated BEFORE UPDATE ON public.vehicle_stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_appraisals_updated BEFORE UPDATE ON public.vehicle_appraisals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workshop_updated BEFORE UPDATE ON public.workshop FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: open access (internal tool, no auth)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.vehicle_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.vehicle_appraisals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.workshop FOR ALL USING (true) WITH CHECK (true);