ALTER TABLE public.renewal_requests
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS checkout_id text,
  ADD COLUMN IF NOT EXISTS gateway_ref text,
  ADD COLUMN IF NOT EXISTS payer_phone text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;

CREATE INDEX IF NOT EXISTS renewal_requests_checkout_id_idx ON public.renewal_requests (checkout_id);
CREATE INDEX IF NOT EXISTS renewal_requests_gateway_ref_idx ON public.renewal_requests (gateway_ref);