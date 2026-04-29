ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS managed_by uuid;
CREATE INDEX IF NOT EXISTS idx_clients_managed_by ON public.clients(managed_by);