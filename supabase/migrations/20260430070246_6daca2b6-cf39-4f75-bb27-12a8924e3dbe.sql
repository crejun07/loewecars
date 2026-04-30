
-- =========================================================
-- 1. Helper functions for workspace permission checks
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_can_view_workspace(_user_id uuid, _workspace text)
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

CREATE OR REPLACE FUNCTION public.user_can_edit_workspace(_user_id uuid, _workspace text)
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

REVOKE EXECUTE ON FUNCTION public.user_can_view_workspace(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_edit_workspace(uuid, text) FROM anon;

-- =========================================================
-- 2. Replace permissive policies on business tables
-- =========================================================

-- clients
DROP POLICY IF EXISTS "public all" ON public.clients;
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'clients'));
CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'clients'));
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'clients'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'clients'));
CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'clients'));

-- vehicle_stock
DROP POLICY IF EXISTS "public all" ON public.vehicle_stock;
CREATE POLICY "stock_select" ON public.vehicle_stock
  FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'stock'));
CREATE POLICY "stock_insert" ON public.vehicle_stock
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY "stock_update" ON public.vehicle_stock
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'stock'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'stock'));
CREATE POLICY "stock_delete" ON public.vehicle_stock
  FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'stock'));

-- vehicle_appraisals
DROP POLICY IF EXISTS "public all" ON public.vehicle_appraisals;
CREATE POLICY "appraisals_select" ON public.vehicle_appraisals
  FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'appraisals'));
CREATE POLICY "appraisals_insert" ON public.vehicle_appraisals
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'appraisals'));
CREATE POLICY "appraisals_update" ON public.vehicle_appraisals
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'appraisals'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'appraisals'));
CREATE POLICY "appraisals_delete" ON public.vehicle_appraisals
  FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'appraisals'));

-- sales
DROP POLICY IF EXISTS "public all" ON public.sales;
CREATE POLICY "sales_select" ON public.sales
  FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'sales'));
CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'sales'));
CREATE POLICY "sales_update" ON public.sales
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'sales'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'sales'));
CREATE POLICY "sales_delete" ON public.sales
  FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'sales'));

-- workshop
DROP POLICY IF EXISTS "public all" ON public.workshop;
CREATE POLICY "workshop_select" ON public.workshop
  FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'workshop'));
CREATE POLICY "workshop_insert" ON public.workshop
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'workshop'));
CREATE POLICY "workshop_update" ON public.workshop
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'workshop'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'workshop'));
CREATE POLICY "workshop_delete" ON public.workshop
  FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'workshop'));

-- spare_parts
DROP POLICY IF EXISTS "public all" ON public.spare_parts;
CREATE POLICY "spare_parts_select" ON public.spare_parts
  FOR SELECT TO authenticated
  USING (public.user_can_view_workspace(auth.uid(), 'spare-parts'));
CREATE POLICY "spare_parts_insert" ON public.spare_parts
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'spare-parts'));
CREATE POLICY "spare_parts_update" ON public.spare_parts
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'spare-parts'))
  WITH CHECK (public.user_can_edit_workspace(auth.uid(), 'spare-parts'));
CREATE POLICY "spare_parts_delete" ON public.spare_parts
  FOR DELETE TO authenticated
  USING (public.user_can_edit_workspace(auth.uid(), 'spare-parts'));

-- =========================================================
-- 3. Storage bucket vehicle-images: restrict writes to authenticated
-- =========================================================
DROP POLICY IF EXISTS "Anyone can upload vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update vehicle images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete vehicle images" ON storage.objects;

CREATE POLICY "Auth upload vehicle images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "Auth update vehicle images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-images')
  WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "Auth delete vehicle images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-images');

-- =========================================================
-- 4. Revoke anon access to get_email_by_username (account enumeration)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO service_role;

-- =========================================================
-- 5. Prevent informatica from assigning legacy 'admin' role (privilege escalation)
-- =========================================================
DROP POLICY IF EXISTS "Informatica manages user roles" ON public.user_roles;

CREATE POLICY "Informatica selects user roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'informatica'::app_role));

CREATE POLICY "Informatica inserts user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'informatica'::app_role)
    AND role <> 'admin'::app_role
  );

CREATE POLICY "Informatica updates user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'informatica'::app_role)
    AND role <> 'admin'::app_role
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'informatica'::app_role)
    AND role <> 'admin'::app_role
  );

CREATE POLICY "Informatica deletes user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'informatica'::app_role)
    AND role <> 'admin'::app_role
  );
