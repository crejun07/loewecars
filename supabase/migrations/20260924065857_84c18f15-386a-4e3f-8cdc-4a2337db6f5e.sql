CREATE TABLE public.claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_events TO authenticated;
GRANT ALL ON public.claim_events TO service_role;
ALTER TABLE public.claim_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY claim_events_select ON public.claim_events FOR SELECT TO authenticated USING (public.user_can_view_workspace(auth.uid(), 'claims'));
CREATE POLICY claim_events_insert ON public.claim_events FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE POLICY claim_events_update ON public.claim_events FOR UPDATE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'claims')) WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE POLICY claim_events_delete ON public.claim_events FOR DELETE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE INDEX claim_events_claim_idx ON public.claim_events(claim_id, event_date);
CREATE TRIGGER trg_claim_events_updated BEFORE UPDATE ON public.claim_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();