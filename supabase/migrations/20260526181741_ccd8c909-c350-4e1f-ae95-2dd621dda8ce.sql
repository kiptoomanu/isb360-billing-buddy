
-- 1. Tighten signup: no automatic role for non-first users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  -- Only bootstrap the very first user as admin. Subsequent signups get no
  -- role and therefore cannot read any customer data until an admin grants
  -- them one explicitly via the user_roles table.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END $function$;

-- 2. Restrict clients to admin/staff only
DROP POLICY IF EXISTS clients_select_auth ON public.clients;
CREATE POLICY clients_select_staff ON public.clients
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 3. Restrict stations to admin/staff only
DROP POLICY IF EXISTS stations_select_auth ON public.stations;
CREATE POLICY stations_select_staff ON public.stations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- 4. Profiles: only owner or admin can read
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
