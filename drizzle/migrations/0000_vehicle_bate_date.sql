ALTER TABLE public.vehicle_stock ADD COLUMN IF NOT EXISTS bate_date date;

CREATE OR REPLACE FUNCTION public.vehicle_bate_agenda_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.bate_date IS NOT DISTINCT FROM OLD.bate_date THEN
    RETURN NEW;
  END IF;
  DELETE FROM public.agenda_events
   WHERE vehicle_id = NEW.id AND metadata->>'auto' = 'bate' AND status <> 'done';
  IF NEW.bate_date IS NOT NULL THEN
    INSERT INTO public.agenda_events (user_id, created_by, is_broadcast, event_type, title, description, event_date, vehicle_id, status, metadata)
    VALUES (NULL, auth.uid(), true, 'custom',
      'BATE: 1 año en 30 días — ' || NEW.brand || ' ' || NEW.model || COALESCE(' (' || NEW.license_plate || ')', ''),
      'El vehículo está en baja temporal desde ' || to_char(NEW.bate_date, 'DD/MM/YYYY') || '. Cumple 1 año el ' || to_char(NEW.bate_date + interval '1 year', 'DD/MM/YYYY') || '.',
      ((NEW.bate_date + interval '1 year' - interval '30 days')::date + time '09:00')::timestamptz,
      NEW.id, 'pending', jsonb_build_object('auto','bate'));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS vehicle_bate_agenda ON public.vehicle_stock;
CREATE TRIGGER vehicle_bate_agenda AFTER INSERT OR UPDATE OF bate_date ON public.vehicle_stock
FOR EACH ROW EXECUTE FUNCTION public.vehicle_bate_agenda_trigger();