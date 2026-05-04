REVOKE ALL ON FUNCTION public.audit_get_user_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_trigger_func() FROM PUBLIC, anon, authenticated;