-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mecanico';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administracion';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'informatica';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';