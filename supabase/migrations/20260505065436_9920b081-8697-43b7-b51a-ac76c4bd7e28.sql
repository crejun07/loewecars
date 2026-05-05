
-- 1) Add titularidad / holder field to vehicle_stock
ALTER TABLE public.vehicle_stock ADD COLUMN IF NOT EXISTS holder text;

-- 2) Rewrite audit trigger function using jsonb access to avoid compile-time
--    references to columns that don't exist on every table (e.g. status on sales).
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
  v_new_j jsonb;
  v_old_j jsonb;
  v_status_field text;
  v_old_status text;
  v_new_status text;
BEGIN
  v_user_name := COALESCE(public.audit_get_user_name(v_user_id), 'Sistema');

  IF TG_OP = 'DELETE' THEN
    v_old_j := to_jsonb(OLD);
    v_new_j := NULL;
    v_record_id := (v_old_j->>'id')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_j := to_jsonb(NEW);
    v_old_j := NULL;
    v_record_id := (v_new_j->>'id')::uuid;
  ELSE
    v_new_j := to_jsonb(NEW);
    v_old_j := to_jsonb(OLD);
    v_record_id := (v_new_j->>'id')::uuid;
  END IF;

  -- Friendly label per table
  IF v_table = 'clients' THEN
    v_label := 'cliente ' || COALESCE(COALESCE(v_new_j, v_old_j)->>'full_name', '');
  ELSIF v_table = 'vehicle_stock' THEN
    v_label := 'vehículo ' ||
      COALESCE(COALESCE(v_new_j, v_old_j)->>'brand', '') || ' ' ||
      COALESCE(COALESCE(v_new_j, v_old_j)->>'model', '') ||
      COALESCE(' (' || NULLIF(COALESCE(v_new_j, v_old_j)->>'license_plate', '') || ')', '');
  ELSIF v_table = 'vehicle_appraisals' THEN
    v_label := 'tasación ' ||
      COALESCE(COALESCE(v_new_j, v_old_j)->>'brand', '') || ' ' ||
      COALESCE(COALESCE(v_new_j, v_old_j)->>'model', '');
  ELSIF v_table = 'sales' THEN
    v_label := 'venta';
  ELSIF v_table = 'workshop' THEN
    v_label := 'tarea de taller "' || COALESCE(COALESCE(v_new_j, v_old_j)->>'task', '') || '"';
  ELSIF v_table = 'spare_parts' THEN
    v_label := 'recambio "' || COALESCE(COALESCE(v_new_j, v_old_j)->>'part_name', '') || '"';
  ELSE
    v_label := v_table;
  END IF;

  -- Decide status field name per table
  IF v_table = 'sales' THEN
    v_status_field := 'sale_status';
  ELSIF v_table = 'vehicle_appraisals' THEN
    v_status_field := 'deal_status';
  ELSE
    v_status_field := 'status';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_summary := v_user_name || ' ha añadido ' || v_label;
    v_changes := v_new_j;
  ELSIF TG_OP = 'DELETE' THEN
    v_summary := v_user_name || ' ha eliminado ' || v_label;
    v_changes := v_old_j;
  ELSE
    v_old_status := v_old_j->>v_status_field;
    v_new_status := v_new_j->>v_status_field;
    IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status IS NOT NULL THEN
      v_summary := v_user_name || ' ha cambiado el estado de ' || v_label || ' a "' || v_new_status || '"';
    ELSE
      v_summary := v_user_name || ' ha actualizado ' || v_label;
    END IF;
    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
    INTO v_changes
    FROM (
      SELECT n.key, o.value AS old_val, n.value AS new_val
      FROM jsonb_each(v_new_j) n
      LEFT JOIN jsonb_each(v_old_j) o ON o.key = n.key
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

-- 3) Add 'history' workspace permission rows for existing roles (default: view)
INSERT INTO public.role_permissions (role, workspace, can_view, can_edit)
SELECT r::app_role, 'history', true, false
FROM unnest(ARRAY['comercial','mecanico','administracion','informatica','gerente']) AS r
ON CONFLICT DO NOTHING;
