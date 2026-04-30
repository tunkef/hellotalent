-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Migration: hr_employer_rpc_gap_fix                                 ║
-- ║  Tarih: 2026-04-30                                                  ║
-- ║  Amaç: Phase D2 prereq — 2 eksik employer RPC ekle                  ║
-- ║                                                                      ║
-- ║  Wave 2 fix (2026-04-30): 6 MEDIUM bulgu apply                      ║
-- ║    1. REVOKE EXECUTE FROM PUBLIC (defense in depth)                  ║
-- ║    2. employer_role guard (admin|recruiter — viewer yasak)           ║
-- ║       Schema verify: text CHECK 'admin'|'recruiter'|'viewer'        ║
-- ║    3. bulk array size limit 500 (DOS protection)                     ║
-- ║    4. errors[] truncate 50 + SQLERRM sanitize (PII protection)      ║
-- ║    5. positions.durum IN ('closed','archived') guard (KVKK md.4)    ║
-- ║       Schema verify: text CHECK 'active'|'draft'|'closed'|'archived'║
-- ║  Wave 2.W3 (delta): convergent re-audit finding fix                 ║
-- ║    7. positions.durum 'archived' guard eklendi                      ║
-- ║       (KVKK md.4 — auditor NF3 + reviewer W2-LOW1 convergent)      ║
-- ║    6. forbidden message v_pos_company_id removed (IDOR fix)          ║
-- ║  Wave 2.W4 (delta): Codex T3 HIGH finding fix                      ║
-- ║    8. SET search_path = pg_catalog, public, pg_temp                 ║
-- ║       (was 'public') — pg_temp shadow defense                       ║
-- ║       (PostgreSQL SECURITY DEFINER best practice)                   ║
-- ║                                                                      ║
-- ║  RPC 1: mark_employer_thread_read(p_message_id bigint)              ║
-- ║    Employer mesajını 'read' olarak işaretler.                       ║
-- ║    Mevcut mark_employer_replies_read() candidate-side'dır,          ║
-- ║    employer-side read flag bu RPC ile sağlanır.                     ║
-- ║                                                                      ║
-- ║  RPC 2: bulk_add_to_pipeline(...)                                   ║
-- ║    Pool'dan toplu aday ekleme — tek tek RPC'ye alternatif.          ║
-- ║    Idempotent (position_id, candidate_id) UNIQUE üzerinden.         ║
-- ║                                                                      ║
-- ║  Dependency:                                                         ║
-- ║    - employer_messages (status: 'sent'|'read'|'archived'|'deleted') ║
-- ║    - candidate_pipeline_state UNIQUE(position_id, candidate_id)     ║
-- ║    - pipeline_stage enum: yeni|gorustum|mulakat|teklif|kapandi_*    ║
-- ║    - hr_profiles.company_id bigint, hr_profiles.id uuid             ║
-- ║    - positions.company_id bigint                                     ║
-- ║                                                                      ║
-- ║  NOT: Bu migration CREATE TABLE içermez — sadece FUNCTION.          ║
-- ║  RLS/GRANT: FUNCTION seviyesinde SECURITY DEFINER + GRANT EXECUTE.  ║
-- ║  Tablo RLS TEMPLATE şartından muaf (yeni tablo yok).                ║
-- ║                                                                      ║
-- ║  Rollback:                                                           ║
-- ║    DROP FUNCTION IF EXISTS mark_employer_thread_read(bigint);       ║
-- ║    DROP FUNCTION IF EXISTS bulk_add_to_pipeline(bigint,bigint[],    ║
-- ║      pipeline_stage);                                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- SCHEMA VERİFY NOTU (2026-04-30 live check sonuçları)
-- employer_messages.status → CHECK constraint: 'sent'|'read'|'archived'|'deleted'
-- employer_messages.read_at → timestamptz NULL — MEVCUT (ALTER TABLE gerekmez)
-- employer_messages.company_id → bigint NOT NULL
-- candidate_pipeline_state UNIQUE → (position_id, candidate_id) — MEVCUT
-- pipeline_stage enum → {yeni,gorustum,mulakat,teklif,kapandi_win,kapandi_loss}
-- hr_profiles.id → uuid, hr_profiles.company_id → bigint
-- hr_profiles.employer_role → text NOT NULL, CHECK: 'admin'|'recruiter'|'viewer'
-- positions.company_id → bigint
-- positions.durum → text NOT NULL, CHECK: 'active'|'draft'|'closed'|'archived'
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- RPC 1: mark_employer_thread_read
-- ═══════════════════════════════════════════════════════════════
-- Employer kendi company_id'sine ait mesajı 'read' olarak işaretler.
-- SECURITY DEFINER: employer_messages RLS'i bypass etmeden DEFINER
-- bağlamında çalışır; company_id kontrolü fonksiyon içinde yapılır.
-- search_path = public: SECURITY DEFINER injection koruması (zorunlu).
--
-- Güvenlik notu:
--   - auth.uid() → hr_profiles.id (uuid FK) üzerinden company_id alınır
--   - company_id verify: caller'ın company'si != mesajın company'si ise
--     UPDATE 0 row döner, exception RAISE edilmez (silent no-op yerine
--     explicit exception tercih edildi — audit trail için)
--   - auth.users'a SELECT YAPILMAZ — auth.uid() yeterli
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mark_employer_thread_read(p_message_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_company_id bigint;
  v_role       text;
  v_msg_exists boolean;
BEGIN
  -- Caller'ın employer olduğunu, company_id ve role'ünü doğrula
  SELECT company_id, employer_role
    INTO v_company_id, v_role
    FROM hr_profiles
   WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: caller is not a linked employer (hr_profiles.company_id is null or record missing)'
      USING ERRCODE = 'P0001';
  END IF;

  -- Fix 2: employer_role guard — viewer okuma yapar, mesaj işaretleme yasak
  IF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: insufficient role'
      USING ERRCODE = 'P0001';
  END IF;

  -- Mesajın bu company'ye ait olduğunu doğrula (cross-company injection guard)
  SELECT EXISTS (
    SELECT 1
      FROM employer_messages
     WHERE id = p_message_id
       AND company_id = v_company_id
  ) INTO v_msg_exists;

  IF NOT v_msg_exists THEN
    RAISE EXCEPTION 'not_found: message does not belong to your company'
      USING ERRCODE = 'P0002';
  END IF;

  -- Zaten 'read' ise idempotent — gereksiz UPDATE'i önle
  UPDATE employer_messages
     SET status  = 'read',
         read_at = COALESCE(read_at, now())
   WHERE id         = p_message_id
     AND company_id = v_company_id
     AND status    != 'read';

END;
$$;

-- Fix 1: REVOKE FROM PUBLIC önce, sonra authenticated'a grant (defense in depth)
REVOKE EXECUTE ON FUNCTION public.mark_employer_thread_read(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_employer_thread_read(bigint) TO authenticated;

COMMENT ON FUNCTION public.mark_employer_thread_read(bigint) IS
  'Employer-side: p_message_id mesajını read olarak işaretle. '
  'Caller hr_profiles.company_id ile company ownership doğrulanır. '
  'employer_role IN (admin, recruiter) zorunlu — viewer yasak. '
  'Wave 2 fix: REVOKE PUBLIC + role guard + IDOR sanitize. Phase D2 prereq — 2026-04-30';


-- ═══════════════════════════════════════════════════════════════
-- RPC 2: bulk_add_to_pipeline
-- ═══════════════════════════════════════════════════════════════
-- Pool'dan toplu aday ekleme. 50+ aday için tek tek RPC yerine
-- array parametresi ile batch INSERT.
--
-- Döndürür: jsonb { added: N, skipped: M, errors: [] }
--   added   → başarıyla eklenen
--   skipped → (position_id, candidate_id) zaten var, atlandı
--   errors  → beklenmedik hata varsa string array (partial success)
--
-- Güvenlik notu:
--   - Caller'ın company_id'si verify edilir (hr_profiles)
--   - position_id'nin caller'ın company'sine ait olduğu doğrulanır
--     (positions.company_id = v_company_id)
--   - Candidate id'leri doğrulanmaz — candidates tablosu public-readable,
--     FK constraint insert'te zaten korur (candidates(id) FK var mı?)
--     → Sprint 7 migration'da FK yok; sadece bigint, FK eklenmedi.
--     Mevcut tasarımda geçersiz candidate_id INSERT'i FK yoksa geçer.
--     Bu kabul edilebilir — pipeline UI zaten active candidate listesinden seçer.
--   - Boş array girişi: 0 added, 0 skipped, no-op
--   - search_path = public: SECURITY DEFINER injection koruması
--
-- Idempotency:
--   ON CONFLICT (position_id, candidate_id) DO NOTHING → skip sayacı artar
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.bulk_add_to_pipeline(
  p_position_id   bigint,
  p_candidate_ids bigint[],
  p_stage         pipeline_stage DEFAULT 'yeni'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_company_id     bigint;
  v_role           text;
  v_pos_company_id bigint;
  v_pos_durum      text;
  v_cid            bigint;
  v_added          int := 0;
  v_skipped        int := 0;
  v_errors         text[] := '{}';
  v_inserted       int;
BEGIN
  -- 1. Caller employer verify + role fetch
  SELECT company_id, employer_role
    INTO v_company_id, v_role
    FROM hr_profiles
   WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: caller is not a linked employer'
      USING ERRCODE = 'P0001';
  END IF;

  -- Fix 2: employer_role guard — viewer pipeline'a aday ekleyemez
  IF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: insufficient role'
      USING ERRCODE = 'P0001';
  END IF;

  -- Fix 3: array size limit — DOS protection
  IF p_candidate_ids IS NULL OR array_length(p_candidate_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('added', 0, 'skipped', 0, 'errors', '[]'::jsonb, 'truncated', false);
  END IF;

  IF array_length(p_candidate_ids, 1) > 500 THEN
    RAISE EXCEPTION 'too_large: max 500 candidates per batch (got %)', array_length(p_candidate_ids, 1)
      USING ERRCODE = 'P0004';
  END IF;

  -- 2. Position ownership verify — cross-company injection guard
  SELECT company_id, durum
    INTO v_pos_company_id, v_pos_durum
    FROM positions
   WHERE id = p_position_id;

  IF v_pos_company_id IS NULL THEN
    RAISE EXCEPTION 'not_found: position does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  -- Fix 6: IDOR fix — karşı şirketin company_id'si mesajda sızdırılmaz
  IF v_pos_company_id != v_company_id THEN
    RAISE EXCEPTION 'forbidden: position does not belong to your company'
      USING ERRCODE = 'P0003';
  END IF;

  -- Fix 5: kapalı/arşivli pozisyon guard — positions.durum CHECK: 'active'|'draft'|'closed'|'archived'
  -- Wave 2.W3 delta: 'archived' eklendi (auditor NF3 + reviewer W2-LOW1 convergent finding)
  IF v_pos_durum IN ('closed', 'archived') THEN
    RAISE EXCEPTION 'forbidden: position is not active (closed or archived)'
      USING ERRCODE = 'P0005';
  END IF;

  -- 4. Her aday için INSERT ON CONFLICT → added/skipped say
  FOREACH v_cid IN ARRAY p_candidate_ids
  LOOP
    BEGIN
      INSERT INTO candidate_pipeline_state (
        position_id,
        candidate_id,
        stage,
        added_by,
        added_at,
        updated_at
      ) VALUES (
        p_position_id,
        v_cid,
        p_stage,
        auth.uid(),
        now(),
        now()
      )
      ON CONFLICT (position_id, candidate_id) DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      IF v_inserted = 1 THEN
        v_added := v_added + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Fix 4: SQLERRM sanitize — sadece candidate_id + generic mesaj, internal hata sızdırılmaz
      -- errors[] 50 ile sınırlandırıldı (PII/log flood protection)
      IF array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) < 50 THEN
        v_errors := array_append(
          v_errors,
          format('candidate_id=%s: insert_failed', v_cid)
        );
      END IF;
      -- 50+ ise sessizce skip — truncated flag response'da set edilecek
    END;
  END LOOP;

  -- Fix 4: truncated flag — 50 error limitine ulaşıldığında caller'ı bilgilendir
  RETURN jsonb_build_object(
    'added',     v_added,
    'skipped',   v_skipped,
    'errors',    to_jsonb(v_errors),
    'truncated', (array_length(v_errors, 1) IS NOT NULL AND array_length(v_errors, 1) >= 50)
  );
END;
$$;

-- Fix 1: REVOKE FROM PUBLIC önce, sonra authenticated'a grant (defense in depth)
REVOKE EXECUTE ON FUNCTION public.bulk_add_to_pipeline(bigint, bigint[], pipeline_stage) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_add_to_pipeline(bigint, bigint[], pipeline_stage) TO authenticated;

COMMENT ON FUNCTION public.bulk_add_to_pipeline(bigint, bigint[], pipeline_stage) IS
  'Pool toplu pipeline ekleme. Caller company ownership + position ownership doğrulanır. '
  'employer_role IN (admin, recruiter) zorunlu. Max 500 aday per batch. '
  'positions.durum=closed reddedilir. errors[] max 50 satır truncate. '
  'Idempotent: ON CONFLICT (position_id, candidate_id) DO NOTHING. '
  'Döner: {added, skipped, errors[], truncated}. Wave 2 fix. Phase D2 prereq — 2026-04-30';
