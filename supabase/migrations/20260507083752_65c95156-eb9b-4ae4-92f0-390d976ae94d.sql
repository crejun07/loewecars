-- 1. Sales: assigned employee
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS assigned_to text;

-- 2. Spare parts: link to a workshop task
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS workshop_id uuid;
CREATE INDEX IF NOT EXISTS idx_spare_parts_workshop_id ON public.spare_parts(workshop_id);

-- 3. Role permissions: ability to view sensitive data per workspace
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS can_view_sensitive boolean NOT NULL DEFAULT false;