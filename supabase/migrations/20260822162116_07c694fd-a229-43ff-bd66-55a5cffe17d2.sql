ALTER TABLE public.routers
  ADD COLUMN IF NOT EXISTS provision_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS services text[] NOT NULL DEFAULT ARRAY['pppoe']::text[];