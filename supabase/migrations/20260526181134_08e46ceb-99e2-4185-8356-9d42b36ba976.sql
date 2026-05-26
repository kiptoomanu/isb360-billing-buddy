
CREATE TABLE public.routers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 443,
  username text NOT NULL,
  password text NOT NULL,
  use_https boolean NOT NULL DEFAULT true,
  station_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routers TO authenticated;
GRANT ALL ON public.routers TO service_role;

ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;

CREATE POLICY routers_admin_all ON public.routers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_routers_updated_at
  BEFORE UPDATE ON public.routers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.clients ADD COLUMN router_id uuid REFERENCES public.routers(id) ON DELETE SET NULL;
