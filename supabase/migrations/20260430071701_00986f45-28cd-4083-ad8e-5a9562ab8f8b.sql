CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.user_can_view_workspace(_user_id uuid, _workspace text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.workspace = _workspace
      AND rp.can_view = true
  )
$$;

CREATE OR REPLACE FUNCTION private.user_can_edit_workspace(_user_id uuid, _workspace text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.workspace = _workspace
      AND rp.can_edit = true
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.user_can_view_workspace(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.user_can_edit_workspace(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_can_view_workspace(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_can_edit_workspace(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Informatica can view all profiles" ON public.profiles;
CREATE POLICY "Informatica can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'informatica'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Informatica selects user roles" ON public.user_roles;
CREATE POLICY "Informatica selects user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'informatica'::public.app_role));

DROP POLICY IF EXISTS "Informatica inserts user roles" ON public.user_roles;
CREATE POLICY "Informatica inserts user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'informatica'::public.app_role)
  AND role <> 'admin'::public.app_role
);

DROP POLICY IF EXISTS "Informatica updates user roles" ON public.user_roles;
CREATE POLICY "Informatica updates user roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'informatica'::public.app_role)
  AND role <> 'admin'::public.app_role
)
WITH CHECK (
  private.has_role(auth.uid(), 'informatica'::public.app_role)
  AND role <> 'admin'::public.app_role
);

DROP POLICY IF EXISTS "Informatica deletes user roles" ON public.user_roles;
CREATE POLICY "Informatica deletes user roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'informatica'::public.app_role)
  AND role <> 'admin'::public.app_role
);

DROP POLICY IF EXISTS "Informatica manages permissions" ON public.role_permissions;
CREATE POLICY "Informatica manages permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'informatica'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'informatica'::public.app_role));

DROP POLICY IF EXISTS "clients_select" ON public.clients;
CREATE POLICY "clients_select" ON public.clients
FOR SELECT TO authenticated
USING (private.user_can_view_workspace(auth.uid(), 'clients'));
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'clients'));
DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
FOR UPDATE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'clients'))
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'clients'));
DROP POLICY IF EXISTS "clients_delete" ON public.clients;
CREATE POLICY "clients_delete" ON public.clients
FOR DELETE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'clients'));

DROP POLICY IF EXISTS "stock_select" ON public.vehicle_stock;
CREATE POLICY "stock_select" ON public.vehicle_stock
FOR SELECT TO authenticated
USING (private.user_can_view_workspace(auth.uid(), 'stock'));
DROP POLICY IF EXISTS "stock_insert" ON public.vehicle_stock;
CREATE POLICY "stock_insert" ON public.vehicle_stock
FOR INSERT TO authenticated
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'stock'));
DROP POLICY IF EXISTS "stock_update" ON public.vehicle_stock;
CREATE POLICY "stock_update" ON public.vehicle_stock
FOR UPDATE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'stock'))
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'stock'));
DROP POLICY IF EXISTS "stock_delete" ON public.vehicle_stock;
CREATE POLICY "stock_delete" ON public.vehicle_stock
FOR DELETE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'stock'));

DROP POLICY IF EXISTS "appraisals_select" ON public.vehicle_appraisals;
CREATE POLICY "appraisals_select" ON public.vehicle_appraisals
FOR SELECT TO authenticated
USING (private.user_can_view_workspace(auth.uid(), 'appraisals'));
DROP POLICY IF EXISTS "appraisals_insert" ON public.vehicle_appraisals;
CREATE POLICY "appraisals_insert" ON public.vehicle_appraisals
FOR INSERT TO authenticated
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'appraisals'));
DROP POLICY IF EXISTS "appraisals_update" ON public.vehicle_appraisals;
CREATE POLICY "appraisals_update" ON public.vehicle_appraisals
FOR UPDATE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'appraisals'))
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'appraisals'));
DROP POLICY IF EXISTS "appraisals_delete" ON public.vehicle_appraisals;
CREATE POLICY "appraisals_delete" ON public.vehicle_appraisals
FOR DELETE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'appraisals'));

DROP POLICY IF EXISTS "sales_select" ON public.sales;
CREATE POLICY "sales_select" ON public.sales
FOR SELECT TO authenticated
USING (private.user_can_view_workspace(auth.uid(), 'sales'));
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
CREATE POLICY "sales_insert" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'sales'));
DROP POLICY IF EXISTS "sales_update" ON public.sales;
CREATE POLICY "sales_update" ON public.sales
FOR UPDATE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'sales'))
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'sales'));
DROP POLICY IF EXISTS "sales_delete" ON public.sales;
CREATE POLICY "sales_delete" ON public.sales
FOR DELETE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'sales'));

DROP POLICY IF EXISTS "workshop_select" ON public.workshop;
CREATE POLICY "workshop_select" ON public.workshop
FOR SELECT TO authenticated
USING (private.user_can_view_workspace(auth.uid(), 'workshop'));
DROP POLICY IF EXISTS "workshop_insert" ON public.workshop;
CREATE POLICY "workshop_insert" ON public.workshop
FOR INSERT TO authenticated
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'workshop'));
DROP POLICY IF EXISTS "workshop_update" ON public.workshop;
CREATE POLICY "workshop_update" ON public.workshop
FOR UPDATE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'workshop'))
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'workshop'));
DROP POLICY IF EXISTS "workshop_delete" ON public.workshop;
CREATE POLICY "workshop_delete" ON public.workshop
FOR DELETE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'workshop'));

DROP POLICY IF EXISTS "spare_parts_select" ON public.spare_parts;
CREATE POLICY "spare_parts_select" ON public.spare_parts
FOR SELECT TO authenticated
USING (private.user_can_view_workspace(auth.uid(), 'spare-parts'));
DROP POLICY IF EXISTS "spare_parts_insert" ON public.spare_parts;
CREATE POLICY "spare_parts_insert" ON public.spare_parts
FOR INSERT TO authenticated
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'spare-parts'));
DROP POLICY IF EXISTS "spare_parts_update" ON public.spare_parts;
CREATE POLICY "spare_parts_update" ON public.spare_parts
FOR UPDATE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'spare-parts'))
WITH CHECK (private.user_can_edit_workspace(auth.uid(), 'spare-parts'));
DROP POLICY IF EXISTS "spare_parts_delete" ON public.spare_parts;
CREATE POLICY "spare_parts_delete" ON public.spare_parts
FOR DELETE TO authenticated
USING (private.user_can_edit_workspace(auth.uid(), 'spare-parts'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_view_workspace(uuid, text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_edit_workspace(uuid, text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO service_role;