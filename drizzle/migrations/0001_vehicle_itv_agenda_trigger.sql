CREATE OR REPLACE FUNCTION public.vehicle_itv_agenda_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.next_itv_date IS NOT DISTINCT FROM OLD.next_itv_date THEN
    RETURN NEW;
  END IF;
  DELETE FROM public.agenda_events
   WHERE vehicle_id = NEW.id AND metadata->>'auto' = 'itv' AND status <> 'done';
  IF NEW.next_itv_date IS NOT NULL THEN
    INSERT INTO public.agenda_events (user_id, created_by, is_broadcast, event_type, title, description, event_date, vehicle_id, status, metadata)
    VALUES (NULL, auth.uid(), true, 'itv',
      'ITV caduca — ' || NEW.brand || ' ' || NEW.model || COALESCE(' (' || NEW.license_plate || ')', ''),
      'La ITV del vehículo caduca el ' || to_char(NEW.next_itv_date, 'DD/MM/YYYY') || '.',
      (NEW.next_itv_date + time '09:00')::timestamptz,
      NEW.id, 'pending', jsonb_build_object('auto','itv'));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vehicle_itv_agenda ON public.vehicle_stock;
CREATE TRIGGER vehicle_itv_agenda AFTER INSERT OR UPDATE OF next_itv_date ON public.vehicle_stock
FOR EACH ROW EXECUTE FUNCTION public.vehicle_itv_agenda_trigger();

-- Backfill: create ITV events for vehicles that already have next_itv_date
INSERT INTO public.agenda_events (user_id, created_by, is_broadcast, event_type, title, description, event_date, vehicle_id, status, metadata)
SELECT NULL, NULL, true, 'itv',
  'ITV caduca — ' || v.brand || ' ' || v.model || COALESCE(' (' || v.license_plate || ')', ''),
  'La ITV del vehículo caduca el ' || to_char(v.next_itv_date, 'DD/MM/YYYY') || '.',
  (v.next_itv_date + time '09:00')::timestamptz,
  v.id, 'pending', jsonb_build_object('auto','itv')
FROM public.vehicle_stock v
WHERE v.next_itv_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.agenda_events e
    WHERE e.vehicle_id = v.id AND e.metadata->>'auto' = 'itv' AND e.status <> 'done'
  );