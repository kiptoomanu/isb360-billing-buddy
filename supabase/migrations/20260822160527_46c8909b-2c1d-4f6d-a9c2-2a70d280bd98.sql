ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY loyalty_select_staff ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY loyalty_admin_write ON public.loyalty_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_apply_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clients SET loyalty_points = GREATEST(0, loyalty_points + NEW.points) WHERE id = NEW.client_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clients SET loyalty_points = GREATEST(0, loyalty_points - OLD.points) WHERE id = OLD.client_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_apply_loyalty_points ON public.loyalty_transactions;
CREATE TRIGGER trg_apply_loyalty_points
AFTER INSERT OR DELETE ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_apply_loyalty_points();