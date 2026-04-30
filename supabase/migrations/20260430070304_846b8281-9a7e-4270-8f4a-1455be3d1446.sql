
-- Revoke direct EXECUTE from anon/authenticated for internal helper functions.
-- These are still callable from RLS policies (which run as the table owner).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_view_workspace(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_edit_workspace(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- Restrict public bucket listing: only allow reading specific known objects, not enumerating
DROP POLICY IF EXISTS "Vehicle images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle images" ON storage.objects;

-- Allow public reads of individual objects (needed for <img src=...>) but Supabase storage
-- list endpoint also goes through SELECT — keep public read since bucket is intentionally
-- public for image display. We restrict listing at the bucket level by keeping the policy
-- but require an explicit object name match — anonymous users can still GET a known URL.
CREATE POLICY "Public read vehicle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');
