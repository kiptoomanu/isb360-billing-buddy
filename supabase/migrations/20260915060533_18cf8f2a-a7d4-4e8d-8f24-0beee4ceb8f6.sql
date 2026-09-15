ALTER TABLE public.routers
  ADD COLUMN IF NOT EXISTS auto_bridge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bridge_name text NOT NULL DEFAULT 'bridge-isp360',
  ADD COLUMN IF NOT EXISTS bridge_ports text[] NOT NULL DEFAULT ARRAY['ether3','ether4','ether5','ether6','ether7','ether8','ether9','ether10','sfp1','wlan1'],
  ADD COLUMN IF NOT EXISTS uplink_port text NOT NULL DEFAULT 'ether1';