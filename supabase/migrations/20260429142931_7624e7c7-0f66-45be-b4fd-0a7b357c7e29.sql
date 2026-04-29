-- role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  workspace text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, workspace)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read permissions"
ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Informatica manages permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'informatica'))
WITH CHECK (public.has_role(auth.uid(), 'informatica'));

CREATE TRIGGER role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow informatica to manage user_roles too (assign roles)
CREATE POLICY "Informatica manages user roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'informatica'))
WITH CHECK (public.has_role(auth.uid(), 'informatica'));

-- Allow informatica to view all profiles (to list users)
CREATE POLICY "Informatica can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'informatica'));

-- Seed default permissions
INSERT INTO public.role_permissions (role, workspace, can_view, can_edit) VALUES
-- informatica: ve y edita todo
('informatica','dashboard',true,true),
('informatica','clients',true,true),
('informatica','appraisals',true,true),
('informatica','sales',true,true),
('informatica','stock',true,true),
('informatica','workshop',true,true),
('informatica','spare-parts',true,true),
('informatica','reports',true,true),
('informatica','settings',true,true),
-- comercial: edita tasaciones, ventas; solo ve stock
('comercial','dashboard',true,false),
('comercial','clients',true,true),
('comercial','appraisals',true,true),
('comercial','sales',true,true),
('comercial','stock',true,false),
('comercial','workshop',false,false),
('comercial','spare-parts',false,false),
('comercial','reports',false,false),
('comercial','settings',false,false),
-- mecanico: ve stock; edita taller y recambios
('mecanico','dashboard',true,false),
('mecanico','clients',false,false),
('mecanico','appraisals',false,false),
('mecanico','sales',false,false),
('mecanico','stock',true,false),
('mecanico','workshop',true,true),
('mecanico','spare-parts',true,true),
('mecanico','reports',false,false),
('mecanico','settings',false,false),
-- administracion: gestiona stock, ventas, recambios, informes, clientes; solo ve taller
('administracion','dashboard',true,false),
('administracion','clients',true,true),
('administracion','appraisals',false,false),
('administracion','sales',true,true),
('administracion','stock',true,true),
('administracion','workshop',true,false),
('administracion','spare-parts',true,true),
('administracion','reports',true,true),
('administracion','settings',false,false),
-- gerente: gestiona clientes, tasaciones, ventas, taller, informes; solo ve stock, recambios
('gerente','dashboard',true,false),
('gerente','clients',true,true),
('gerente','appraisals',true,true),
('gerente','sales',true,true),
('gerente','stock',true,false),
('gerente','workshop',true,true),
('gerente','spare-parts',true,false),
('gerente','reports',true,true),
('gerente','settings',false,false),
-- legacy roles (admin/employee) leave them seeing all to avoid lockout
('admin','dashboard',true,true),
('admin','clients',true,true),
('admin','appraisals',true,true),
('admin','sales',true,true),
('admin','stock',true,true),
('admin','workshop',true,true),
('admin','spare-parts',true,true),
('admin','reports',true,true),
('admin','settings',true,true),
('employee','dashboard',true,true),
('employee','clients',true,true),
('employee','appraisals',true,true),
('employee','sales',true,true),
('employee','stock',true,true),
('employee','workshop',true,true),
('employee','spare-parts',true,true),
('employee','reports',true,true),
('employee','settings',false,false);