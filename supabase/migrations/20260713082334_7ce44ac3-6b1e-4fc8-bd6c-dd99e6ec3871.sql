DROP POLICY IF EXISTS "Delete own events or admin" ON public.agenda_events;
DROP POLICY IF EXISTS "Insert own events or admin any" ON public.agenda_events;
DROP POLICY IF EXISTS "Update own events or admin" ON public.agenda_events;
DROP POLICY IF EXISTS "View own or broadcast events" ON public.agenda_events;

CREATE POLICY "Delete own events or admin" ON public.agenda_events
FOR DELETE USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'informatica')
  OR public.has_role(auth.uid(), 'administracion')
);

CREATE POLICY "Insert own events or admin any" ON public.agenda_events
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND (
    user_id = auth.uid()
    OR is_broadcast = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'informatica')
    OR public.has_role(auth.uid(), 'administracion')
  )
);

CREATE POLICY "Update own events or admin" ON public.agenda_events
FOR UPDATE USING (
  user_id = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'informatica')
  OR public.has_role(auth.uid(), 'administracion')
);

CREATE POLICY "View own or broadcast events" ON public.agenda_events
FOR SELECT USING (
  is_broadcast = true
  OR user_id = auth.uid()
  OR created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'informatica')
  OR public.has_role(auth.uid(), 'administracion')
);