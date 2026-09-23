CREATE TYPE public.claim_status AS ENUM ('open','burofax_sent','with_lawyer','citation','lawsuit','judgment','resolved','closed');

CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  person_name text NOT NULL,
  person_phone text,
  person_dni text,
  person_address text,
  person_email text,
  vehicle_id uuid REFERENCES public.vehicle_stock(id) ON DELETE SET NULL,
  vehicle_model text,
  vehicle_plate text,
  subject text,
  status public.claim_status NOT NULL DEFAULT 'open',
  burofax_sent boolean NOT NULL DEFAULT false,
  burofax_sent_date date,
  burofax_received boolean NOT NULL DEFAULT false,
  burofax_received_date date,
  sent_to_lawyer boolean NOT NULL DEFAULT false,
  lawyer_date date,
  lawyer_name text,
  has_citation boolean NOT NULL DEFAULT false,
  citation_date date,
  has_lawsuit boolean NOT NULL DEFAULT false,
  lawsuit_date date,
  has_judgment boolean NOT NULL DEFAULT false,
  judgment_date date,
  judgment_result text,
  response_deadline date,
  amount_claimed numeric,
  requested_solution text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claims_select" ON public.claims FOR SELECT TO authenticated USING (public.user_can_view_workspace(auth.uid(), 'claims'));
CREATE POLICY "claims_insert" ON public.claims FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE POLICY "claims_update" ON public.claims FOR UPDATE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'claims')) WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE POLICY "claims_delete" ON public.claims FOR DELETE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'claims'));

CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_claims AFTER INSERT OR UPDATE OR DELETE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TABLE public.claim_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  doc_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_documents TO authenticated;
GRANT ALL ON public.claim_documents TO service_role;
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claim_docs_select" ON public.claim_documents FOR SELECT TO authenticated USING (public.user_can_view_workspace(auth.uid(), 'claims'));
CREATE POLICY "claim_docs_insert" ON public.claim_documents FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE POLICY "claim_docs_update" ON public.claim_documents FOR UPDATE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'claims')) WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'claims'));
CREATE POLICY "claim_docs_delete" ON public.claim_documents FOR DELETE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'claims'));

CREATE TRIGGER trg_claim_docs_updated BEFORE UPDATE ON public.claim_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.role_permissions (role, workspace, can_view, can_edit, can_view_sensitive)
SELECT r::public.app_role, 'claims', r IN ('informatica','gerente','administracion'), r IN ('informatica','gerente','administracion'), r IN ('informatica','gerente')
FROM unnest(ARRAY['admin','employee','comercial','mecanico','administracion','informatica','gerente']) AS r
ON CONFLICT DO NOTHING;