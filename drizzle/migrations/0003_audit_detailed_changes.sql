CREATE OR REPLACE FUNCTION public.audit_trigger_func()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_summary text;
  v_record_id uuid;
  v_table text := TG_TABLE_NAME;
  v_changes jsonb;
  v_label text;
  v_new_j jsonb;
  v_old_j jsonb;
  v_r jsonb;
  v_detail text;
  v_veh text;
  v_labels jsonb := '{"vin":"bastidor","horsepower":"CV","first_registration_date":"fecha de matriculación","insured":"seguro","license_plate":"matrícula","brand":"marca","model":"modelo","year":"año","mileage":"kilometraje","fuel_type":"combustible","transmission":"cambio","purchase_price":"precio de compra","selling_price":"precio de venta","profit_margin":"margen","status":"estado","sale_status":"estado","deal_status":"estado","listing_status":"anuncio","entry_date":"fecha de entrada","next_itv_date":"próxima ITV","bate_date":"fecha BATE","location":"ubicación","holder":"titularidad","vat_type":"IVA","image_url":"foto","notes":"notas","description":"descripción","photos":"fotos","full_name":"nombre","phone":"teléfono","email":"email","dni":"DNI","managed_by":"gestor","client_type":"tipo de cliente","last_contact_date":"último contacto","task":"tarea","task_date":"fecha","cost":"coste","priority":"prioridad","part_name":"pieza","part_reference":"referencia","supplier":"proveedor","order_date":"fecha de pedido","delivery_date":"fecha de entrega","ordered_by":"pedido por","payment_method":"método de pago","payment_status":"estado de pago","part_purpose":"propósito","cancellation_reason":"motivo de cancelación","vehicle_id":"vehículo","client_id":"cliente","workshop_id":"tarea de taller","assigned_to":"asignado a","customer_budget":"presupuesto","next_contact_date":"próximo contacto","payment_done":"pago realizado","withdrawal_authorized":"retirada autorizada","ready_for_pickup":"listo para retirar","picked_up":"retirado","picked_up_by":"retirado por","burofax_sent":"burofax enviado","burofax_received":"burofax recibido","sent_to_lawyer":"enviado al abogado","has_citation":"citación","has_lawsuit":"demanda","has_judgment":"sentencia","amount_claimed":"cantidad reclamada","response_deadline":"plazo de contestación","deadline_done":"contestado","title":"título","event_date":"fecha"}'::jsonb;
BEGIN
  v_user_name := COALESCE(public.audit_get_user_name(v_user_id), 'Sistema');
  IF TG_OP <> 'INSERT' THEN v_old_j := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new_j := to_jsonb(NEW); END IF;
  v_r := COALESCE(v_new_j, v_old_j);
  v_record_id := (v_r->>'id')::uuid;

  IF v_r ? 'vehicle_id' AND v_r->>'vehicle_id' IS NOT NULL THEN
    SELECT brand || ' ' || model || COALESCE(' (' || NULLIF(license_plate,'') || ')', '') INTO v_veh
    FROM public.vehicle_stock WHERE id = (v_r->>'vehicle_id')::uuid;
  END IF;

  v_label := CASE v_table
    WHEN 'clients' THEN 'cliente ' || COALESCE(v_r->>'full_name','')
    WHEN 'vehicle_stock' THEN 'vehículo ' || COALESCE(v_r->>'brand','') || ' ' || COALESCE(v_r->>'model','') || COALESCE(' (' || NULLIF(v_r->>'license_plate','') || ')', '')
    WHEN 'vehicle_appraisals' THEN 'tasación ' || COALESCE(v_r->>'brand','') || ' ' || COALESCE(v_r->>'model','')
    WHEN 'online_appraisals' THEN 'tasación online ' || COALESCE(v_r->>'brand','') || ' ' || COALESCE(v_r->>'model','') || COALESCE(' (' || NULLIF(v_r->>'reference','') || ')', '')
    WHEN 'sales' THEN 'venta' || COALESCE(' del vehículo ' || v_veh, '')
    WHEN 'workshop' THEN 'tarea de taller "' || COALESCE(v_r->>'task','') || '"' || COALESCE(' en ' || v_veh, '')
    WHEN 'spare_parts' THEN 'recambio "' || COALESCE(v_r->>'part_name','') || '"' || COALESCE(' para ' || v_veh, '')
    WHEN 'vehicle_documents' THEN 'el documento "' || COALESCE(v_r->>'name','') || '"' || COALESCE(' del vehículo ' || v_veh, '')
    WHEN 'auctions' THEN 'subasta ' || COALESCE(v_r->>'brand','') || ' ' || COALESCE(v_r->>'model','') || COALESCE(' (' || NULLIF(v_r->>'license_plate','') || ')', '')
    WHEN 'claims' THEN 'reclamación "' || COALESCE(v_r->>'title','') || '"'
    WHEN 'claim_events' THEN 'evento "' || COALESCE(v_r->>'title','') || '" de una reclamación'
    WHEN 'claim_documents' THEN 'documento "' || COALESCE(v_r->>'name','') || '" de una reclamación'
    ELSE v_table END;

  IF TG_OP = 'INSERT' THEN
    v_summary := v_user_name || CASE WHEN v_table IN ('vehicle_documents','claim_documents') THEN ' ha subido ' ELSE ' ha añadido ' END || v_label;
    v_changes := v_new_j;
  ELSIF TG_OP = 'DELETE' THEN
    v_summary := v_user_name || ' ha eliminado ' || v_label;
    v_changes := v_old_j;
  ELSE
    SELECT jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value)),
      string_agg(
        CASE
          WHEN jsonb_typeof(n.value) = 'boolean' THEN COALESCE(v_labels->>n.key, n.key) || CASE WHEN n.value = 'true'::jsonb THEN ' activado' ELSE ' desactivado' END
          WHEN n.key IN ('notes','description','photos','image_url','metadata','extra_data','requested_solution') OR n.key LIKE '%\_id' OR n.key = 'managed_by' THEN COALESCE(v_labels->>n.key, n.key) || ' modificado'
          WHEN n.value = 'null'::jsonb OR n.value #>> '{}' = '' THEN COALESCE(v_labels->>n.key, n.key) || ' borrado'
          ELSE COALESCE(v_labels->>n.key, n.key) || ': ' || COALESCE(o.value #>> '{}', '—') || ' → ' || left(n.value #>> '{}', 80)
        END, '; ' ORDER BY n.key)
    INTO v_changes, v_detail
    FROM jsonb_each(v_new_j) n LEFT JOIN jsonb_each(v_old_j) o ON o.key = n.key
    WHERE n.value IS DISTINCT FROM o.value
      AND n.key NOT IN ('updated_at','created_at','stock_request_status','stock_vehicle_id','completed_at','appraisal_number');
    IF v_detail IS NULL THEN RETURN NEW; END IF;
    v_summary := v_user_name || ' ha actualizado ' || v_label || ' — ' || v_detail;
  END IF;

  INSERT INTO public.audit_log(user_id, user_name, table_name, record_id, action, summary, changes)
  VALUES (v_user_id, v_user_name, v_table, v_record_id, TG_OP, v_summary, v_changes);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','vehicle_stock','vehicle_appraisals','online_appraisals','sales','workshop','spare_parts','vehicle_documents','auctions','claims','claim_events','claim_documents'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %1$s_audit ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()', t);
  END LOOP;
END $$;