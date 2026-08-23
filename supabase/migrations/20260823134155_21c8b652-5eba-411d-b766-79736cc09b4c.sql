CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type client_type NOT NULL DEFAULT 'pppoe',
  download_kbps integer NOT NULL DEFAULT 0,
  upload_kbps integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 30,
  device_limit integer NOT NULL DEFAULT 1,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_admin_write ON public.plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY plans_select_staff ON public.plans FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.clients ADD COLUMN plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL;