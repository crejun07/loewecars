CREATE POLICY "claim_docs_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'claim-documents' AND public.user_can_view_workspace(auth.uid(), 'claims'));

CREATE POLICY "claim_docs_storage_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'claim-documents' AND public.user_can_edit_workspace(auth.uid(), 'claims'));

CREATE POLICY "claim_docs_storage_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'claim-documents' AND public.user_can_edit_workspace(auth.uid(), 'claims'))
WITH CHECK (bucket_id = 'claim-documents' AND public.user_can_edit_workspace(auth.uid(), 'claims'));

CREATE POLICY "claim_docs_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'claim-documents' AND public.user_can_edit_workspace(auth.uid(), 'claims'));