CREATE TABLE public.renewal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'mpesa',
  reference text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_requests TO authenticated;
GRANT ALL ON public.renewal_requests TO service_role;

ALTER TABLE public.renewal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY renewal_requests_select_staff ON public.renewal_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY renewal_requests_admin_write ON public.renewal_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_renewal_requests_updated_at
  BEFORE UPDATE ON public.renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_renewal_requests_client ON public.renewal_requests(client_id, created_at DESC);