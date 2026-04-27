-- Enum para el estado de la pieza
CREATE TYPE public.spare_part_status AS ENUM (
  'pending',
  'ordered',
  'shipped',
  'received',
  'return',
  'refunded'
);

-- Tabla de recambios
CREATE TABLE public.spare_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid,
  part_name text NOT NULL,
  part_reference text,
  supplier text,
  order_date date,
  delivery_date date,
  managed_by text,
  ordered_by text,
  status public.spare_part_status NOT NULL DEFAULT 'pending',
  cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.spare_parts FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER set_spare_parts_updated_at
BEFORE UPDATE ON public.spare_parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();