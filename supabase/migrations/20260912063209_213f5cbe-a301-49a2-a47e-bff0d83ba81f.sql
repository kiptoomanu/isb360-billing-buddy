ALTER TABLE public.routers
  ADD COLUMN IF NOT EXISTS provision_token text UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS reported_ip text,
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS auto_configured boolean NOT NULL DEFAULT false;

UPDATE public.routers SET provision_token = encode(gen_random_bytes(24),'hex') WHERE provision_token IS NULL;
ALTER TABLE public.routers ALTER COLUMN provision_token SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.router_events (
  id uuid primary key default gen_random_uuid(),
  router_id uuid not null references public.routers(id) on delete cascade,
  stage text not null,
  message text not null,
  level text not null default 'info',
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.router_events TO authenticated;
GRANT ALL ON public.router_events TO service_role;
ALTER TABLE public.router_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY router_events_select_staff ON public.router_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY router_events_admin_write ON public.router_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS router_events_router_idx ON public.router_events(router_id, created_at DESC);