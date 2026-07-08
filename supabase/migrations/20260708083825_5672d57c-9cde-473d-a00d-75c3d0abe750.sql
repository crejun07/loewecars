
CREATE TABLE public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_broadcast boolean NOT NULL DEFAULT false,
  event_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  vehicle_id uuid REFERENCES public.vehicle_stock(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT ALL ON public.agenda_events TO service_role;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or broadcast events"
  ON public.agenda_events FOR SELECT
  TO authenticated
  USING (
    is_broadcast = true
    OR user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Insert own events or admin any"
  ON public.agenda_events FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
      OR is_broadcast = true
    )
  );

CREATE POLICY "Update own events or admin"
  ON public.agenda_events FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Delete own events or admin"
  ON public.agenda_events FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_agenda_events_updated
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_agenda_events_user_date ON public.agenda_events(user_id, event_date);
CREATE INDEX idx_agenda_events_broadcast_date ON public.agenda_events(is_broadcast, event_date);
