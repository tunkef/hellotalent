-- ╔══════════════════════════════════════════════════════════════╗
-- ║  A8-B Task 2 — HR Lifecycle RPCs (5 fonksiyon)             ║
-- ║  Migration: 20260503190000_hr_lifecycle_rpcs.sql           ║
-- ║  Tier: T3 — auditor + code-reviewer + Codex zorunlu        ║
-- ║  Bağımlı: 20260503180000_hr_profiles_lifecycle.sql         ║
-- ║                                                             ║
-- ║  Kapsam:                                                    ║
-- ║    1. hr_freeze_account()       active → frozen            ║
-- ║    2. hr_unfreeze_account()     frozen → active            ║
-- ║    3. hr_request_deletion()     active → pending_deletion  ║
-- ║       + lone-admin guard                                    ║
-- ║    4. hr_cancel_deletion()      pending_deletion → active  ║
-- ║    5. hr_reactivate_after_purge() soft_deleted → active    ║
-- ║                                                             ║
-- ║  Güvenlik:                                                  ║
-- ║    - SECURITY DEFINER + SET search_path = public           ║
-- ║    - set_config('hr.lifecycle_rpc','true',true) flag        ║
-- ║      → hr_profiles_freeze_sensitive_fields() trigger bypass ║
-- ║    - auth.uid() NULL guard (her fonksiyonda)               ║
-- ║    - pii_redacted=true → reactivation BLOCKER              ║
-- ║                                                             ║
-- ║  RLS: yeni tablo yok → ALTER/POLICY yok                    ║
-- ║  GRANT: EXECUTE ON FUNCTION ... TO authenticated (5 adet)  ║
-- ║                                                             ║
-- ║  DRY-RUN — APPLY YAPMA                                      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 0. H1 FIX — Column-level GRANT UPDATE (defense-in-depth)
--    Auditor T3 H1 HIGH: GRANT UPDATE ON hr_profiles tüm kolonları açıyor.
--    Hassas kolonlar (account_status, employer_role, feature_flags,
--    company_id, frozen_at, deletion_scheduled_at, soft_deleted_at,
--    pii_redacted, id, created_at, updated_at, onboarding_completed,
--    onboarding_step) sadece RPC veya service_role üzerinden değişir.
--
--    Strateji:
--    1. Mevcut GRANT UPDATE (tüm kolonlar) revoke et
--    2. Sadece güvenli kolonlara GRANT ver
--    Trigger (B1) + policy (A1) hâlâ guard eder — bu GRANT ekstra layer.
--
--    Hariç tutulan kolonlar (sadece RPC/service_role):
--      account_status, employer_role, feature_flags, company_id,
--      frozen_at, deletion_scheduled_at, soft_deleted_at, pii_redacted,
--      id, created_at, updated_at, onboarding_completed, onboarding_step
-- ═══════════════════════════════════════════════
REVOKE UPDATE ON public.hr_profiles FROM authenticated;

GRANT UPDATE (
  ad, soyad, telefon, sirket, sektor, buyukluk, web_sitesi, segment,
  merkez_sehir, magaza_sayisi, aciklama, aranan_profil, calisma_saatleri,
  linkedin, company_type, domain_verified, career_page_url, team_id,
  email, last_active_at, is_active
) ON public.hr_profiles TO authenticated;

-- NOT: is_active kullanıcı tarafından (havuz görünürlüğü) değiştirilebilir.
-- last_active_at: profil aktif kullanım sonrası JS client günceller.
-- Trigger (hr_profiles_freeze_sensitive_trg) + RLS policy (hr_profiles_update_own)
-- birlikte defense-in-depth sağlar: bu GRANT üçüncü katman.

-- ═══════════════════════════════════════════════
-- 1. hr_freeze_account()
--    Guard:  account_status = 'active'
--    Action: status → 'frozen'
--            trigger (hr_sync_account_status) sets:
--              is_active = false, frozen_at = now()
--    Return: {account_status, frozen_at}
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_freeze_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid;
  v_old_status account_status_enum;
  v_result     jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT account_status INTO v_old_status
  FROM public.hr_profiles
  WHERE id = v_uid;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'hr_profile bulunamadı'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'active' THEN
    RAISE EXCEPTION 'Hesap zaten %', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Trigger bypass: transaction-local flag
  -- hr_profiles_freeze_sensitive_fields() bu flag olmadan account_status
  -- değişimine izin vermez (B1 guard). third arg = true → transaction-local.
  PERFORM set_config('hr.lifecycle_rpc', 'true', true);

  UPDATE public.hr_profiles
  SET account_status = 'frozen'
  WHERE id = v_uid
  RETURNING jsonb_build_object(
    'account_status', account_status,
    'frozen_at',      frozen_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════
-- 2. hr_unfreeze_account()
--    Guard:  account_status = 'frozen'
--    Action: status → 'active'
--            trigger sets: frozen_at = NULL, deletion_scheduled_at = NULL
--            is_active: DOKUNULMAZ (kullanıcı tercihi)
--    Return: {account_status}
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_unfreeze_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid;
  v_old_status account_status_enum;
  v_result     jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT account_status INTO v_old_status
  FROM public.hr_profiles
  WHERE id = v_uid;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'hr_profile bulunamadı'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'frozen' THEN
    RAISE EXCEPTION 'Hesap dondurulmuş değil (mevcut durum: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM set_config('hr.lifecycle_rpc', 'true', true);

  UPDATE public.hr_profiles
  SET account_status = 'active'
  WHERE id = v_uid
  RETURNING jsonb_build_object(
    'account_status', account_status
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════
-- 3. hr_request_deletion()
--    Guard:  account_status = 'active'
--            lone-admin check (employer_role = 'admin' AND tek admin)
--    Action: status → 'pending_deletion'
--            trigger sets: is_active = false,
--              deletion_scheduled_at = now() + 30 days
--    Return: {account_status, deletion_scheduled_at}
--
--    Lone-admin race:
--      İki admin aynı anda çağırırsa → her ikisi de admin sayısını
--      "2" görür → her ikisi de geçer (şirket adminsiz kalmaz).
--      İlk admin deletion'a girince ikincisi artık tek admin olur.
--      KVKK açısından kabul edilebilir: ikinci admin unfreeze yapabilir.
--      Stricter guard (SELECT FOR UPDATE) P3 scope.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_request_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid;
  v_old_status  account_status_enum;
  v_role        text;
  v_company_id  bigint;
  v_admin_count int;
  v_result      jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT account_status, employer_role, company_id
  INTO v_old_status, v_role, v_company_id
  FROM public.hr_profiles
  WHERE id = v_uid;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'hr_profile bulunamadı'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'active' THEN
    RAISE EXCEPTION 'Hesap zaten %', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Lone-admin guard
  -- Admin ise ve şirketin tek aktif admin'iyse → reddet.
  -- company_id NULL (bağımsız hesap): guard uygulanmaz.
  IF v_role = 'admin' AND v_company_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.hr_profiles
    WHERE company_id    = v_company_id
      AND employer_role = 'admin'
      AND account_status = 'active'
      AND id != v_uid;          -- kendisi hariç diğer adminleri say

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'lone_admin: Önce başka bir admin atayın, ardından hesabı silin'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  PERFORM set_config('hr.lifecycle_rpc', 'true', true);

  UPDATE public.hr_profiles
  SET account_status = 'pending_deletion'
  WHERE id = v_uid
  RETURNING jsonb_build_object(
    'account_status',        account_status,
    'deletion_scheduled_at', deletion_scheduled_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════
-- 4. hr_cancel_deletion()
--    Guard:  account_status = 'pending_deletion'
--            H2 FIX: deletion_scheduled_at > now() (30g içinde olmalı)
--            Grace süresi dolmuşsa kullanıcı support'a başvurmalı.
--    Action: status → 'active'
--            trigger sets: frozen_at = NULL, deletion_scheduled_at = NULL
--            is_active: DOKUNULMAZ
--    Return: {account_status}
--
--    H2 KVKK md.11 analizi:
--    Cron (pending → soft_delete) 30g sonunda çalışır. Cron geç kalırsa
--    kullanıcı hâlâ pending_deletion'da ama grace süresi dolmuş.
--    Bu durumda hr_cancel_deletion'a izin vermek KVKK md.11 ihlali.
--    FIX: deletion_scheduled_at <= now() ise RAISE → support yönlendir.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_cancel_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid                  uuid;
  v_old_status           account_status_enum;
  v_deletion_scheduled   timestamptz;
  v_result               jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT account_status, deletion_scheduled_at
  INTO v_old_status, v_deletion_scheduled
  FROM public.hr_profiles
  WHERE id = v_uid;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'hr_profile bulunamadı'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'pending_deletion' THEN
    RAISE EXCEPTION 'Hesap silinme beklemiyor (mevcut durum: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- H2 FIX: 30g grace süresi dolmuşsa iptal yasak (KVKK md.11)
  IF v_deletion_scheduled IS NOT NULL AND v_deletion_scheduled <= now() THEN
    RAISE EXCEPTION 'Silinme süresi doldu. Hesabınızı geri almak için destek ekibiyle iletişime geçin.'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('hr.lifecycle_rpc', 'true', true);

  UPDATE public.hr_profiles
  SET account_status = 'active'
  WHERE id = v_uid
  RETURNING jsonb_build_object(
    'account_status', account_status
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════
-- 5. hr_reactivate_after_purge()
--    Guard:  soft_deleted_at IS NOT NULL (soft-delete yapılmış)
--            pii_redacted = false (geri alınabilir durum)
--    Action: account_status → 'active'
--            soft_deleted_at = NULL
--            is_active = true
--            last_active_at = now()
--    Return: {account_status, reactivated_at}
--
--    Notlar:
--    - pii_redacted = true → BLOCKER, irreversible.
--      PII silinmiş hesap geri alınamaz, yeni signup gerekli.
--    - account_status_enum'a 'soft_deleted' değeri yok —
--      soft_deleted_at IS NOT NULL + account_status = 'pending_deletion'
--      (veya herhangi) kombinasyonu soft-deleted durumu temsil eder.
--    - Bu RPC, cron'un soft_deleted_at set etmesinden ÖNCE kullanıcı
--      giriş yapıp hesabını geri almak istediğinde çalışır.
--      (30g grace window içinde)
--    - account_status trigger bypass: set_config flag gerekli
--      çünkü pending_deletion → active geçişi trigger'dan geçer.
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_reactivate_after_purge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid;
  v_soft_deleted  timestamptz;
  v_pii_redacted  boolean;
  v_result        jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT soft_deleted_at, pii_redacted
  INTO v_soft_deleted, v_pii_redacted
  FROM public.hr_profiles
  WHERE id = v_uid;

  IF v_soft_deleted IS NULL THEN
    RAISE EXCEPTION 'Hesap soft-delete durumunda değil'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Irreversible blocker: PII silinmiş hesap geri alınamaz
  IF v_pii_redacted = true THEN
    RAISE EXCEPTION 'pii_redacted: Hesap geri alınamaz, yeni kayıt gerekli'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM set_config('hr.lifecycle_rpc', 'true', true);

  UPDATE public.hr_profiles
  SET account_status  = 'active',
      soft_deleted_at = NULL,
      is_active       = true,
      last_active_at  = now()
  WHERE id = v_uid
  RETURNING jsonb_build_object(
    'account_status',  account_status,
    'reactivated_at',  last_active_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ═══════════════════════════════════════════════
-- GRANT — 5 fonksiyon, authenticated role
-- ═══════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.hr_freeze_account()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_unfreeze_account()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_request_deletion()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_cancel_deletion()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_reactivate_after_purge()  TO authenticated;

-- ═══════════════════════════════════════════════
-- ROLLBACK
-- ═══════════════════════════════════════════════
-- H1 GRANT rollback: column-level grant'ı geri al, tüm kolonları geri ver
-- REVOKE UPDATE ON public.hr_profiles FROM authenticated;
-- GRANT UPDATE ON public.hr_profiles TO authenticated;
--
-- RPC rollback:
-- REVOKE EXECUTE ON FUNCTION public.hr_freeze_account()          FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.hr_unfreeze_account()        FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.hr_request_deletion()        FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.hr_cancel_deletion()         FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION public.hr_reactivate_after_purge()  FROM authenticated;
-- DROP FUNCTION IF EXISTS public.hr_freeze_account();
-- DROP FUNCTION IF EXISTS public.hr_unfreeze_account();
-- DROP FUNCTION IF EXISTS public.hr_request_deletion();
-- DROP FUNCTION IF EXISTS public.hr_cancel_deletion();
-- DROP FUNCTION IF EXISTS public.hr_reactivate_after_purge();
