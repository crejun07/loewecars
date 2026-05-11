
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE(id uuid, full_name text, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.username
  FROM public.profiles p
  ORDER BY COALESCE(NULLIF(p.full_name, ''), p.username) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_all_users() TO authenticated;
