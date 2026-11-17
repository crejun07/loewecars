-- Módulo Correo: cuentas de email multi-proveedor (IMAP con contraseña de
-- aplicación), sus secretos (aislados del cliente) y los mensajes sincronizados
-- con triaje de IA. Gestión reservada al rol 'informatica'.

-- Enums --------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.email_provider AS ENUM ('gmail', 'outlook', 'hotmail', 'imap');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_account_status AS ENUM ('pending', 'connected', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cuentas ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      public.email_provider NOT NULL,
  email         text NOT NULL,
  display_name  text,
  imap_host     text,                 -- solo para proveedor 'imap' (hosting propio)
  imap_port     integer DEFAULT 993,
  smtp_host     text,
  smtp_port     integer DEFAULT 465,
  status        public.email_account_status NOT NULL DEFAULT 'pending',
  last_sync_at  timestamptz,
  last_error    text,
  created_by    uuid DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Secretos: SIN políticas para usuarios autenticados → solo el service_role
-- (las edge functions) puede leer/escribir. El navegador nunca ve la contraseña.
CREATE TABLE IF NOT EXISTS public.email_account_secrets (
  account_id    uuid PRIMARY KEY REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  app_password  text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Mensajes sincronizados ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  uid                text NOT NULL,          -- UID IMAP del mensaje
  message_id         text,
  from_name          text,
  from_address       text,
  subject            text,
  preview            text,
  received_at        timestamptz,
  is_read            boolean NOT NULL DEFAULT false,
  -- Triaje de IA
  ai_category          text,                 -- lead / proveedor / reclamacion / otro
  ai_summary           text,
  ai_suggested_reply   text,
  ai_contact_name      text,
  ai_contact_phone     text,
  ai_vehicle_interest  text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, uid)
);

CREATE INDEX IF NOT EXISTS email_messages_account_received_idx
  ON public.email_messages (account_id, received_at DESC);

-- RLS ----------------------------------------------------------------------
ALTER TABLE public.email_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_account_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages        ENABLE ROW LEVEL SECURITY;

-- Cuentas: las gestiona el rol informatica.
DROP POLICY IF EXISTS "informatica manage email accounts" ON public.email_accounts;
CREATE POLICY "informatica manage email accounts" ON public.email_accounts
  FOR ALL USING (public.has_role(auth.uid(), 'informatica'))
  WITH CHECK (public.has_role(auth.uid(), 'informatica'));

-- Secretos: ninguna política → inaccesibles desde el cliente (solo service_role).

-- Mensajes: cualquiera autenticado los lee (p. ej. ventas ve los leads);
-- marcar leído / editar queda para informatica.
DROP POLICY IF EXISTS "read email messages" ON public.email_messages;
CREATE POLICY "read email messages" ON public.email_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "informatica edit email messages" ON public.email_messages;
CREATE POLICY "informatica edit email messages" ON public.email_messages
  FOR UPDATE USING (public.has_role(auth.uid(), 'informatica'))
  WITH CHECK (public.has_role(auth.uid(), 'informatica'));
