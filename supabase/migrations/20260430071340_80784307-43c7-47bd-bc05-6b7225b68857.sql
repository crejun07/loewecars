GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_workspace(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_edit_workspace(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_view_workspace(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_edit_workspace(uuid, text) FROM anon, PUBLIC;