-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FAZ B Sprint 7 — HR Pipeline + Notes (MVP 2 hazirligi)      ║
-- ║  Tier: T3 (auth + KVKK + RLS migration)                      ║
-- ║                                                              ║
-- ║  Kapsam:                                                     ║
-- ║   1. pipeline_stage ENUM (6 stage)                           ║
-- ║   2. candidate_pipeline_state tablo + RLS + GRANT            ║
-- ║   3. employer_candidate_notes tablo + RLS + GRANT            ║
-- ║   4. hr_profiles.feature_flags jsonb                         ║
-- ║   5. companies.metadata jsonb                                ║
-- ║   6. RPC'ler:                                                ║
-- ║      - hr_get_pipeline(p_position_id)                        ║
-- ║      - hr_move_pipeline_stage(p_id, p_stage)                 ║
-- ║      - hr_add_to_pipeline(p_position_id, p_candidate_id...)  ║
-- ║      - hr_add_note(p_candidate_id, p_position_id, p_body)    ║
-- ║      - hr_list_notes(p_candidate_id)                         ║
-- ║   7. is_paid_employer() helper                               ║
-- ║                                                              ║
-- ║  Auditor + supabase-agent + Codex T3 inceleme zinciri        ║
-- ║  Real mode aktivasyonu: window.HR_REAL_MODE_ENABLED=true     ║
-- ║  default false. MVP 2'de Iyzico + KVKK guard'la birlikte     ║
-- ║  flag flip.                                                  ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. PIPELINE STAGE ENUM
-- ═══════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_stage') THEN
    CREATE TYPE pipeline_stage AS ENUM (
      'yeni',
      'gorustum',
      'mulakat',
      'teklif',
      'kapandi_win',
      'kapandi_loss'
    );
  END IF;
END$$;

-- ═══════════════════════════════════════════════
-- 2. candidate_pipeline_state
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS candidate_pipeline_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id bigint NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  stage pipeline_stage NOT NULL DEFAULT 'yeni',
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (position_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_state_position
  ON candidate_pipeline_state(position_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_state_candidate
  ON candidate_pipeline_state(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_state_stage
  ON candidate_pipeline_state(position_id, stage);

ALTER TABLE candidate_pipeline_state ENABLE ROW LEVEL SECURITY;

-- Pozisyon sahibinin sirketindeki kullanicilar (employer team) erisir
DROP POLICY IF EXISTS pipeline_state_select_team
  ON candidate_pipeline_state;
CREATE POLICY pipeline_state_select_team
  ON candidate_pipeline_state
  FOR SELECT TO authenticated
  USING (
    position_id IN (
      SELECT p.id
      FROM positions p
      JOIN hr_profiles hp ON hp.company_id = p.company_id
      WHERE hp.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS pipeline_state_insert_team
  ON candidate_pipeline_state;
CREATE POLICY pipeline_state_insert_team
  ON candidate_pipeline_state
  FOR INSERT TO authenticated
  WITH CHECK (
    position_id IN (
      SELECT p.id
      FROM positions p
      JOIN hr_profiles hp ON hp.company_id = p.company_id
      WHERE hp.id = auth.uid()
        AND hp.employer_role IN ('admin', 'recruiter')
    )
  );

DROP POLICY IF EXISTS pipeline_state_update_team
  ON candidate_pipeline_state;
CREATE POLICY pipeline_state_update_team
  ON candidate_pipeline_state
  FOR UPDATE TO authenticated
  USING (
    position_id IN (
      SELECT p.id
      FROM positions p
      JOIN hr_profiles hp ON hp.company_id = p.company_id
      WHERE hp.id = auth.uid()
        AND hp.employer_role IN ('admin', 'recruiter')
    )
  )
  WITH CHECK (
    position_id IN (
      SELECT p.id
      FROM positions p
      JOIN hr_profiles hp ON hp.company_id = p.company_id
      WHERE hp.id = auth.uid()
        AND hp.employer_role IN ('admin', 'recruiter')
    )
  );

DROP POLICY IF EXISTS pipeline_state_delete_admin
  ON candidate_pipeline_state;
CREATE POLICY pipeline_state_delete_admin
  ON candidate_pipeline_state
  FOR DELETE TO authenticated
  USING (
    position_id IN (
      SELECT p.id
      FROM positions p
      JOIN hr_profiles hp ON hp.company_id = p.company_id
      WHERE hp.id = auth.uid()
        AND hp.employer_role = 'admin'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON candidate_pipeline_state TO authenticated;

-- ═══════════════════════════════════════════════
-- 2b. is_employer_team_member(uuid) helper
--     Buraya tasindi: notes_select_team policy'si section 3'te
--     bu fonksiyona bagimli, dolayisiyla CREATE oncesinde
--     tanimlanmali. STABLE + SECURITY DEFINER — HR policies icin
--     tekrar kullanilabilir team membership check.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION is_employer_team_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hr_profiles hp1
    JOIN hr_profiles hp2 ON hp1.company_id = hp2.company_id
    WHERE hp1.id = auth.uid()
      AND hp2.id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION is_employer_team_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_employer_team_member(uuid) TO authenticated;

-- ═══════════════════════════════════════════════
-- 3. employer_candidate_notes
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS employer_candidate_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  position_id bigint REFERENCES positions(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_candidate ON employer_candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notes_author ON employer_candidate_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_position ON employer_candidate_notes(position_id);

ALTER TABLE employer_candidate_notes ENABLE ROW LEVEL SECURITY;

-- Sirket icindeki kullanicilar gorur (note paylasimi ekip-icine acik)
DROP POLICY IF EXISTS notes_select_team
  ON employer_candidate_notes;
CREATE POLICY notes_select_team
  ON employer_candidate_notes
  FOR SELECT TO authenticated
  USING (is_employer_team_member(author_id));

DROP POLICY IF EXISTS notes_insert_self
  ON employer_candidate_notes;
CREATE POLICY notes_insert_self
  ON employer_candidate_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM hr_profiles
      WHERE id = auth.uid()
        AND employer_role IN ('admin', 'recruiter')
    )
  );

DROP POLICY IF EXISTS notes_update_self
  ON employer_candidate_notes;
CREATE POLICY notes_update_self
  ON employer_candidate_notes
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS notes_delete_self_or_admin
  ON employer_candidate_notes;
CREATE POLICY notes_delete_self_or_admin
  ON employer_candidate_notes
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM hr_profiles hp
      WHERE hp.id = auth.uid()
        AND hp.employer_role = 'admin'
        AND hp.company_id = (
          SELECT company_id FROM hr_profiles hp2 WHERE hp2.id = employer_candidate_notes.author_id
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON employer_candidate_notes TO authenticated;

-- ═══════════════════════════════════════════════
-- 4. hr_profiles.feature_flags + companies.metadata
--    Ileride feature gating ve subscription tier icin
-- ═══════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hr_profiles' AND column_name = 'feature_flags'
  ) THEN
    ALTER TABLE hr_profiles ADD COLUMN feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE companies ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END$$;

-- ═══════════════════════════════════════════════
-- 5. is_paid_employer() helper (MVP 2 Iyzico icin)
--    Default: feature_flags.paid = true varsa odeme aktif
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION is_paid_employer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (hp.feature_flags ->> 'paid')::boolean
      FROM hr_profiles hp
      WHERE hp.id = auth.uid()
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION is_paid_employer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_paid_employer() TO authenticated;

-- ═══════════════════════════════════════════════
-- 6. RPC'ler
-- ═══════════════════════════════════════════════

-- 6.1 hr_get_pipeline — pozisyon-bazli kanban data
CREATE OR REPLACE FUNCTION hr_get_pipeline(p_position_id bigint)
RETURNS TABLE (
  id uuid,
  position_id bigint,
  candidate_id bigint,
  stage pipeline_stage,
  added_at timestamptz,
  updated_at timestamptz,
  candidate_name text,
  candidate_pozisyon text,
  candidate_sehir text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cps.id,
    cps.position_id,
    cps.candidate_id,
    cps.stage,
    cps.added_at,
    cps.updated_at,
    c.full_name,
    c.pozisyon,
    c.sehir
  FROM candidate_pipeline_state cps
  JOIN candidates c ON c.id = cps.candidate_id
  WHERE cps.position_id = p_position_id
  ORDER BY cps.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION hr_get_pipeline(bigint) TO authenticated;

-- 6.2 hr_move_pipeline_stage
CREATE OR REPLACE FUNCTION hr_move_pipeline_stage(
  p_id uuid,
  p_stage pipeline_stage
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row candidate_pipeline_state%ROWTYPE;
BEGIN
  UPDATE candidate_pipeline_state
  SET stage = p_stage,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Pipeline kaydı bulunamadı veya yetki yok'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'stage', v_row.stage,
    'updated_at', v_row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION hr_move_pipeline_stage(uuid, pipeline_stage) TO authenticated;

-- 6.3 hr_add_to_pipeline — idempotent (UNIQUE constraint koruyor)
CREATE OR REPLACE FUNCTION hr_add_to_pipeline(
  p_position_id bigint,
  p_candidate_id bigint,
  p_stage pipeline_stage DEFAULT 'yeni'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row candidate_pipeline_state%ROWTYPE;
  v_duplicate boolean := false;
BEGIN
  INSERT INTO candidate_pipeline_state (
    position_id, candidate_id, stage, added_by
  )
  VALUES (
    p_position_id, p_candidate_id, p_stage, auth.uid()
  )
  ON CONFLICT (position_id, candidate_id)
  DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    v_duplicate := true;
    SELECT * INTO v_row
    FROM candidate_pipeline_state
    WHERE position_id = p_position_id AND candidate_id = p_candidate_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', v_duplicate,
    'row', to_jsonb(v_row)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION hr_add_to_pipeline(bigint, bigint, pipeline_stage) TO authenticated;

-- 6.4 hr_add_note
CREATE OR REPLACE FUNCTION hr_add_note(
  p_candidate_id bigint,
  p_position_id bigint,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_body IS NULL OR char_length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Not içeriği boş olamaz' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO employer_candidate_notes (
    candidate_id, position_id, author_id, body
  )
  VALUES (
    p_candidate_id, p_position_id, auth.uid(), trim(p_body)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION hr_add_note(bigint, bigint, text) TO authenticated;

-- 6.5 hr_list_notes
CREATE OR REPLACE FUNCTION hr_list_notes(p_candidate_id bigint)
RETURNS TABLE (
  id uuid,
  candidate_id bigint,
  position_id bigint,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ecn.id,
    ecn.candidate_id,
    ecn.position_id,
    ecn.author_id,
    coalesce(hp.ad || ' ' || hp.soyad, hp.email, 'Ekip üyesi') AS author_name,
    ecn.body,
    ecn.created_at,
    ecn.updated_at
  FROM employer_candidate_notes ecn
  LEFT JOIN hr_profiles hp ON hp.id = ecn.author_id
  WHERE ecn.candidate_id = p_candidate_id
  ORDER BY ecn.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION hr_list_notes(bigint) TO authenticated;

-- ═══════════════════════════════════════════════
-- 7. Update trigger (updated_at otomatik)
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipeline_state_updated_at ON candidate_pipeline_state;
CREATE TRIGGER pipeline_state_updated_at
  BEFORE UPDATE ON candidate_pipeline_state
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS notes_updated_at ON employer_candidate_notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON employer_candidate_notes
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ═══════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════
-- Onerilen test:
--   SELECT hr_add_to_pipeline(1, 1, 'yeni');
--   SELECT * FROM hr_get_pipeline(1);
--   SELECT hr_add_note(1, 1, 'Test not');
--   SELECT * FROM hr_list_notes(1);
