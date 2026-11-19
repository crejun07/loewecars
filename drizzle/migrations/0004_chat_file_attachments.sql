ALTER TABLE public.chat_messages
  ADD COLUMN attachment_path text,
  ADD COLUMN attachment_name text,
  ADD COLUMN attachment_type text,
  ADD COLUMN attachment_size bigint;

CREATE POLICY chat_attachments_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = 'group'
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

CREATE POLICY chat_attachments_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      (storage.foldername(name))[2] = 'group'
      OR (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  );

CREATE POLICY chat_attachments_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );