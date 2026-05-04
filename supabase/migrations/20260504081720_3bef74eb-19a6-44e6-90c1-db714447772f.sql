-- Audit log table for tracking all data changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL, -- INSERT, UPDATE, DELETE
  summary text NOT NULL,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view the audit log
CREATE POLICY "Authenticated can view audit log"
ON public.audit_log FOR SELECT
TO authenticated
USING (true);

-- Only the system (triggers) can insert; block direct insert/update/delete from clients
-- (no insert/update/delete policies = denied for non-service roles)

-- Helper function to get a friendly user display name
CREATE OR REPLACE FUNCTION public.audit_get_user_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(p.full_name, ''), NULLIF(p.username, ''), 'Usuario')
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1
$$;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_summary text;
  v_record_id uuid;
  v_table text := TG_TABLE_NAME;
  v_action text := TG_OP;
  v_changes jsonb;
  v_label text;
  v_old_status text;
  v_new_status text;
BEGIN
  v_user_name := COALESCE(public.audit_get_user_name(v_user_id), 'Sistema');

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
  ELSE
    v_record_id := NEW.id;
  END IF;

  -- Build a friendly label for the record per table
  IF v_table = 'clients' THEN
    v_label := 'cliente ' || COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.full_name ELSE NEW.full_name END), '');
  ELSIF v_table = 'vehicle_stock' THEN
    v_label := 'vehículo ' ||
      COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.brand ELSE NEW.brand END), '') || ' ' ||
      COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.model ELSE NEW.model END), '') ||
      COALESCE(' (' || NULLIF((CASE WHEN TG_OP='DELETE' THEN OLD.license_plate ELSE NEW.license_plate END), '') || ')', '');
  ELSIF v_table = 'vehicle_appraisals' THEN
    v_label := 'tasación ' ||
      COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.brand ELSE NEW.brand END), '') || ' ' ||
      COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.model ELSE NEW.model END), '');
  ELSIF v_table = 'sales' THEN
    v_label := 'venta';
  ELSIF v_table = 'workshop' THEN
    v_label := 'tarea de taller "' || COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.task ELSE NEW.task END), '') || '"';
  ELSIF v_table = 'spare_parts' THEN
    v_label := 'recambio "' || COALESCE((CASE WHEN TG_OP='DELETE' THEN OLD.part_name ELSE NEW.part_name END), '') || '"';
  ELSE
    v_label := v_table;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_summary := v_user_name || ' ha añadido ' || v_label;
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_summary := v_user_name || ' ha eliminado ' || v_label;
    v_changes := to_jsonb(OLD);
  ELSE -- UPDATE
    -- Detect status change for friendlier message
    IF v_table = 'vehicle_stock' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_summary := v_user_name || ' ha cambiado el estado del ' || v_label || ' a "' || NEW.status::text || '"';
    ELSIF v_table = 'sales' AND OLD.sale_status IS DISTINCT FROM NEW.sale_status THEN
      v_summary := v_user_name || ' ha cambiado el estado de la venta a "' || NEW.sale_status::text || '"';
    ELSIF v_table = 'workshop' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_summary := v_user_name || ' ha cambiado el estado de la ' || v_label || ' a "' || NEW.status::text || '"';
    ELSIF v_table = 'spare_parts' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_summary := v_user_name || ' ha cambiado el estado del ' || v_label || ' a "' || NEW.status::text || '"';
    ELSIF v_table = 'clients' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_summary := v_user_name || ' ha cambiado el estado del ' || v_label || ' a "' || NEW.status::text || '"';
    ELSIF v_table = 'vehicle_appraisals' AND OLD.deal_status IS DISTINCT FROM NEW.deal_status THEN
      v_summary := v_user_name || ' ha cambiado el estado de la ' || v_label || ' a "' || NEW.deal_status::text || '"';
    ELSE
      v_summary := v_user_name || ' ha actualizado ' || v_label;
    END IF;
    -- Compute diff
    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
    INTO v_changes
    FROM (
      SELECT n.key, o.value AS old_val, n.value AS new_val
      FROM jsonb_each(to_jsonb(NEW)) n
      LEFT JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = n.key
      WHERE n.value IS DISTINCT FROM o.value
        AND n.key NOT IN ('updated_at', 'created_at')
    ) diff;
  END IF;

  INSERT INTO public.audit_log(user_id, user_name, table_name, record_id, action, summary, changes)
  VALUES (v_user_id, v_user_name, v_table, v_record_id, v_action, v_summary, v_changes);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to relevant tables
DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_vehicle_stock ON public.vehicle_stock;
CREATE TRIGGER audit_vehicle_stock AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_stock
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_vehicle_appraisals ON public.vehicle_appraisals;
CREATE TRIGGER audit_vehicle_appraisals AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_appraisals
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_sales ON public.sales;
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_workshop ON public.workshop;
CREATE TRIGGER audit_workshop AFTER INSERT OR UPDATE OR DELETE ON public.workshop
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_spare_parts ON public.spare_parts;
CREATE TRIGGER audit_spare_parts AFTER INSERT OR UPDATE OR DELETE ON public.spare_parts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();