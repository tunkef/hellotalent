-- SEC-1: Move role from user_metadata (client-writable) to app_metadata (server-only)
-- Prevents privilege escalation via auth.updateUser({ data: { role: 'employer' } })
-- DEPLOYED: 9 Nisan 2026

-- 1. Trigger: on signup, copy role to app_metadata
CREATE OR REPLACE FUNCTION public.sync_role_to_app_metadata()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'employer' THEN
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "employer"}'::jsonb;
  ELSE
    NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "candidate"}'::jsonb;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_role_on_signup ON auth.users;
CREATE TRIGGER trg_sync_role_on_signup
  BEFORE INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_app_metadata();

-- 2. Guard: prevent role tampering via user_metadata update
CREATE OR REPLACE FUNCTION public.guard_role_metadata()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' IS DISTINCT FROM OLD.raw_user_meta_data->>'role' THEN
    NEW.raw_user_meta_data = NEW.raw_user_meta_data || jsonb_build_object(
      'role', COALESCE(OLD.raw_app_meta_data->>'role', 'candidate')
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_role_on_update ON auth.users;
CREATE TRIGGER trg_guard_role_on_update
  BEFORE UPDATE ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.guard_role_metadata();

-- 3. Backfill existing users
UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "employer"}'::jsonb
WHERE raw_user_meta_data->>'role' = 'employer' AND (raw_app_meta_data->>'role') IS DISTINCT FROM 'employer';

UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "candidate"}'::jsonb
WHERE (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'employer') AND (raw_app_meta_data->>'role') IS NULL;
