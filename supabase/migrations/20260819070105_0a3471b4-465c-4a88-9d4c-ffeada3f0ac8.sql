CREATE TABLE public.user_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  priority integer NOT NULL DEFAULT 3,
  done boolean NOT NULL DEFAULT false,
  due_date date,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tasks TO authenticated;
GRANT ALL ON public.user_tasks TO service_role;

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own tasks"
ON public.user_tasks FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_tasks_updated
BEFORE UPDATE ON public.user_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();