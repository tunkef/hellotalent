-- ═══════════════════════════════════════════════════════════════════
-- A8b: candidate_notes_about_me RPC (KVKK md.11/c access right)
-- Tarih: 2026-05-05 13:50
-- Tier: T3 (legal-sensitive RPC, SECURITY DEFINER)
--
-- ÖZET:
-- KVKK md.11/c — ilgili kişi, kişisel verilerinin işlenme amacını ve
-- amaca uygun kullanılıp kullanılmadığını öğrenme hakkına sahip.
-- Mevcut sistem: aday `employer_candidate_notes` tablosuna erişemiyor
-- (RLS sadece is_employer_team_member). Aday hakkında not tutulduğunu
-- öğrenemez → md.11/c gap.
--
-- ÇÖZÜM (KONSERVATIF — avukat onayına bağlı):
-- Bu RPC aday'a hakkındaki notların "varlık + metadata"'sını gösterir:
-- - Not sayısı (toplam)
-- - Hangi şirket (company_name) tarafından
-- - Hangi pozisyon için (position.ad)
-- - Tarih (created_at)
-- - Body içeriği DAHIL DEĞIL (legal-reviewer flag — content disclosure
--   tartışmalı; avukat onayı sonrası ek RPC veya bu RPC'nin extension'u)
--
-- Aday "içerik için" info@hellotalent.ai başvurur (KVKK md.13). Bu yaklaşım
-- md.11/c'nin "amacın öğrenilmesi" hakkını korur, hukuki risk minimize.
--
-- KAYNAK: legal-reviewer A8 audit (5 May 2026) HIGH md.11/c finding.
--
-- ROLLBACK:
-- DROP FUNCTION IF EXISTS public.candidate_notes_about_me();
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.candidate_notes_about_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_candidate_id bigint;
  v_uid          uuid;
  v_total        int;
  v_items        jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- get_my_candidate_id() helper mevcut (mig 20260408 candidate auth gate)
  v_candidate_id := public.get_my_candidate_id();
  IF v_candidate_id IS NULL THEN
    -- Aday değil — boş response (employer/admin için bu RPC anlamsız)
    RETURN jsonb_build_object(
      'ok',          true,
      'total',       0,
      'items',       '[]'::jsonb,
      'note',        'Bu özellik sadece aday hesapları için.'
    );
  END IF;

  SELECT count(*) INTO v_total
  FROM public.employer_candidate_notes
  WHERE candidate_id = v_candidate_id;

  -- Metadata only — body YOK (legal flag)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'note_id',      n.id,
        'created_at',   n.created_at,
        'company_name', co.company_name,
        'position_title', pos.ad
      )
      ORDER BY n.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_items
  FROM public.employer_candidate_notes n
  LEFT JOIN public.hr_profiles hp ON hp.id = n.author_id
  LEFT JOIN public.companies co   ON co.id = hp.company_id
  LEFT JOIN public.positions pos  ON pos.id = n.position_id
  WHERE n.candidate_id = v_candidate_id;

  RETURN jsonb_build_object(
    'ok',         true,
    'total',      v_total,
    'items',      v_items,
    'kvkk_note',  'KVKK md.11/c kapsamında hakkınızda tutulan notların metadata bilgisi. İçerik için info@hellotalent.ai adresine başvurabilirsiniz (md.13 — 30 gün yanıt süresi).'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.candidate_notes_about_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.candidate_notes_about_me() TO authenticated;

COMMENT ON FUNCTION public.candidate_notes_about_me IS
  'A8b (5 May 2026): KVKK md.11/c — aday hakkında tutulan notların metadata erişimi. '
  'İçerik (body) DAHIL DEĞIL — avukat onayı sonrası ek RPC ile açılabilir. '
  'Sadece aday hesapları için (get_my_candidate_id() check).';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (manuel)
-- ═══════════════════════════════════════════════════════════════════
-- 1. Function tanımı + grant:
--    SELECT proname, prosecdef, proacl FROM pg_proc WHERE proname = 'candidate_notes_about_me';
--
-- 2. Aday kontekstinde test (logged in candidate):
--    SELECT candidate_notes_about_me();
--    → { ok: true, total: N, items: [...], kvkk_note: '...' }
--
-- 3. Employer kontekstinde test (admin user):
--    SELECT candidate_notes_about_me();
--    → { ok: true, total: 0, items: [], note: 'Bu özellik sadece aday hesapları...' }
--
-- 4. Anonymous test:
--    → 'Not authenticated' exception
