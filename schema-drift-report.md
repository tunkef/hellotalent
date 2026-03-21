# Hellotalent — Schema Drift Report
**Date:** 14 March 2026
**Source:** Live Supabase (cpwibefquojehjehtrog) vs repo migrations (001-013)

---

## 🔴 CRITICAL — Must Fix

### 1. Missing Trigger: trg_candidates_updated_at
**Migration 005** defines `trg_candidates_updated_at` (BEFORE UPDATE on candidates → set updated_at = now()).
**Live:** Only `trg_companies_updated_at` exists. candidates trigger is MISSING.
**Impact:** `candidates.updated_at` never auto-updates. Stale data signals for employer filtering.
**Fix:** Run migration 005 in Supabase SQL Editor.

### 2. Duplicate RLS Policies on candidates
**Live has 7 policies, should have 4:**
- `candidates_select` AND `candidates_select_own` — both do the same thing (auth.uid() = user_id)
- `candidates_insert` AND `candidates_insert_own` — both have null qual
- `candidates_update` AND `candidates_update_own` — both do the same thing
- `candidates_delete` — only one, correct

**Impact:** No functional harm (duplicate permissive policies just OR together) but confusing and maintenance risk.
**Fix:**
```sql
DROP POLICY IF EXISTS candidates_select ON candidates;
DROP POLICY IF EXISTS candidates_insert ON candidates;
DROP POLICY IF EXISTS candidates_update ON candidates;
-- Keep candidates_select_own, candidates_insert_own, candidates_update_own, candidates_delete
```

---

## 🟡 WARNING — Should Fix Soon

### 3. hr_profiles INSERT Policy Has No WITH CHECK
**Live:** `hr_insert` policy has `cmd: INSERT, qual: null` — no enforcement on who can insert.
**Expected (migration 009):** INSERT should enforce `auth.uid() = id`
**Impact:** Any authenticated user could insert an hr_profiles row with any id.
**Fix:**
```sql
DROP POLICY IF EXISTS hr_insert ON hr_profiles;
CREATE POLICY hr_insert_own ON hr_profiles FOR INSERT TO public
  WITH CHECK (auth.uid() = id);
```

### 4. candidates Table Has 20+ Legacy Columns
**Live columns that are NOW handled by child tables:**
- `pozisyon`, `deneyim_yil`, `sehir`, `yas_araligi`, `markalar` — replaced by candidate_experiences + candidate_target_roles + candidate_location_preferences
- `egitim_seviye`, `mezun_yil`, `okul`, `bolum` — replaced by candidate_education
- `maas_beklenti`, `diller`, `calisma_tipi`, `musaitlik`, `segmentler` — replaced by candidate_work_preferences + candidate_languages
- `tercih_markalar`, `tercih_sehirler`, `tercih_ilceler` — replaced by candidate_brand_interests + candidate_location_preferences
- `calisma_durumu`, `mevcut_sirket`, `mevcut_pozisyon`, `ayrilma_nedeni`, `deneyimler`, `ekstra_egitimler` — replaced by candidate_experiences

**Impact:** No functional harm (additive migration strategy — old columns preserved for backward compat). But 20+ dead columns add confusion.
**Fix:** NOT NOW. These can be dropped in a future cleanup migration after confirming no code reads them.

---

## 🟢 ALIGNED — No Action Needed

### Tables — All Present ✅
All 14 tables from migrations exist in live:
- candidates, candidate_experiences, candidate_education, candidate_certificates
- candidate_languages, candidate_target_roles, candidate_work_preferences
- candidate_brand_interests, candidate_location_preferences, candidate_location_pref_districts
- companies, brands, candidate_company_follows, hr_profiles

### Child Table RLS — Correct ✅
All child tables have proper CRUD policies using `get_my_candidate_id()`:
- candidate_experiences: exp_select/insert/update/delete ✅
- candidate_education: edu_select/insert/update/delete ✅
- candidate_certificates: cert_select/insert/update/delete ✅
- candidate_languages: lang_select/insert/update/delete ✅
- candidate_target_roles: roles_select/insert/update/delete ✅
- candidate_work_preferences: wp_select/insert/update/delete ✅
- candidate_brand_interests: brand_select/insert/update/delete ✅
- candidate_location_preferences: loc_select/insert/update/delete ✅
- candidate_location_pref_districts: locd_select/insert/update/delete ✅

### Company Tables — Correct ✅
- companies: companies_select_active (authenticated, is_active = true) ✅
- brands: brands_select_active (authenticated, is_active = true) ✅
- candidate_company_follows: follows_select/insert/delete_own (authenticated, get_my_candidate_id()) ✅

### Functions — All Present ✅
- get_my_candidate_id() ✅
- save_candidate_profile() ✅
- update_companies_updated_at() ✅
- rls_auto_enable() ✅

### Triggers — Partial
- trg_companies_updated_at ✅
- trg_candidates_updated_at ❌ MISSING (see Critical #1)

### Migration 013 (hide_from_current_employer) ✅
- `candidates.hide_from_current_employer` boolean DEFAULT false — present in live ✅

---

## Action Plan

### Immediate (run today):
```sql
-- Fix 1: Apply missing candidates updated_at trigger
CREATE OR REPLACE FUNCTION set_candidates_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_candidates_updated_at ON candidates;
CREATE TRIGGER trg_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_candidates_updated_at();

-- Fix 2: Clean duplicate RLS policies
DROP POLICY IF EXISTS candidates_select ON candidates;
DROP POLICY IF EXISTS candidates_insert ON candidates;
DROP POLICY IF EXISTS candidates_update ON candidates;

-- Fix 3: Enforce hr_profiles INSERT
DROP POLICY IF EXISTS hr_insert ON hr_profiles;
CREATE POLICY hr_insert_own ON hr_profiles FOR INSERT TO public
  WITH CHECK (auth.uid() = id);
```

### Later (P3+):
- Drop legacy columns from candidates table
- Add employer read policies when ik.html goes live
