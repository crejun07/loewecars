ALTER TABLE public.vehicle_stock ADD COLUMN vin text, ADD COLUMN horsepower integer, ADD COLUMN first_registration_date date, ADD COLUMN insured boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.vehicle_stock.year IS 'Compatibility year: derived from first_registration_date when available; legacy years retained without inventing registration dates.';
CREATE TABLE public.vehicle_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 vehicle_id uuid NOT NULL REFERENCES public.vehicle_stock(id) ON DELETE CASCADE,
 name text NOT NULL,
 file_path text NOT NULL UNIQUE,
 file_name text NOT NULL,
 content_type text NOT NULL DEFAULT 'application/octet-stream',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_documents TO authenticated;
GRANT ALL ON public.vehicle_documents TO service_role;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_documents_view ON public.vehicle_documents FOR SELECT TO authenticated USING (public.user_can_view_workspace(auth.uid(), 'stock'));
CREATE POLICY vehicle_documents_insert ON public.vehicle_documents FOR INSERT TO authenticated WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY vehicle_documents_update ON public.vehicle_documents FOR UPDATE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'stock')) WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY vehicle_documents_delete ON public.vehicle_documents FOR DELETE TO authenticated USING (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY vehicle_files_view ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-documents' AND public.user_can_view_workspace(auth.uid(), 'stock'));
CREATE POLICY vehicle_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-documents' AND public.user_can_edit_workspace(auth.uid(), 'stock') AND EXISTS (SELECT 1 FROM public.vehicle_stock v WHERE v.id::text = (storage.foldername(name))[1]));
CREATE POLICY vehicle_files_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-documents' AND public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE INDEX vehicle_documents_vehicle_idx ON public.vehicle_documents(vehicle_id);