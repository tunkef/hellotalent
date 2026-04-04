-- Add bio (hakkımda) field to candidates + update save RPC
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bio text;

-- Add bio to save_candidate_profile UPDATE — single column addition
-- The RPC already uses "CASE WHEN p_profile ? 'key'" pattern for optional fields
-- We need to re-create the function to add bio handling
-- Instead of full RPC rewrite, add a lightweight helper:
CREATE OR REPLACE FUNCTION update_candidate_bio(p_bio text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cid bigint;
BEGIN
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  UPDATE candidates SET bio = p_bio, updated_at = now() WHERE id = v_cid;
END;
$$;
