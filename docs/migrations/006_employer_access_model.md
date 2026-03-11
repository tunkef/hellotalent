# 006 — Employer Access Model (Design Doc)

**Date:** 2026-03-11
**Status:** Draft — no SQL changes

---

## What Already Exists

### `hr_profiles` table (active, partially wired)

Created outside version control. Used by:
- **Signup** (`index.html:2432`): inserts `id`, `ad`, `soyad`, `sirket`, `email`, `created_at`
- **Dashboard read** (`ik.html:1213`): `select('*').eq('id', currentUser.id).single()`
- **Dashboard save** (`ik.html:1684`): upserts full payload with fallback to core fields if extended columns don't exist yet

Known columns from code:
- Core: `id` (uuid, PK = auth.uid), `ad`, `soyad`, `sirket`, `email`, `created_at`
- Extended: `sektor`, `buyukluk`, `web_sitesi`, `segment`, `telefon`, `merkez_sehir`, `magaza_sayisi`, `aciklama`, `aranan_profil`, `calisma_saatleri`, `linkedin`

**No migration file tracks this table. No RLS policies exist for it.**

### Auth role metadata (active, unenforced)

Employer signup sets `raw_user_meta_data.role = 'employer'` (`index.html:2422`).
This value is never checked:
- Not in `giris.html` login flow (no role guard)
- Not in any RLS policy
- Not in `ik.html` session init

### Login and routing (active, incomplete)

| Flow | What happens |
|------|-------------|
| Employer signup (`index.html`) | `auth.signUp` with `role:'employer'` → `hr_profiles.insert` → success modal |
| Employer login (`giris.html`) | `signInWithPassword` → redirect to `isveren.html` (marketing page, not dashboard) |
| Candidate login (`giris.html`) | `signInWithPassword` → redirect to `profil.html` |
| `ik.html` access | No session guard — loads for anyone who navigates directly |

**Gap:** `giris.html:465` redirects to `isveren.html` instead of `ik.html`. The dashboard exists but the login doesn't route to it.

### `ik.html` dashboard (active UI, no live candidate data)

- Reads `hr_profiles` for company profile section
- Candidate list is hardcoded sample data (`ADAYLAR` array)
- Favorites stored in `localStorage` (`ht_ik_favs`)
- Positions panel has no DB backing
- No Supabase queries for candidate data

---

## Access Layers

### Layer 1: Candidate self-access (fully implemented)

- `auth.uid()` → `candidates.user_id` via `get_my_candidate_id()`
- RLS on all 9 child tables + candidates
- Read/write own data only

### Layer 2: Employer access (to be built on existing `hr_profiles`)

- `auth.uid()` → `hr_profiles.id` confirms employer identity
- Read-only access to candidate profiles
- Must NOT grant write access to any candidate data
- Must NOT expose `candidates.user_id`

### Layer 3: Internal admin (future, out of scope)

- Service-role or Supabase Dashboard
- Not modeled in RLS

---

## Phase 1: What Employers See

| Data | Source | Access |
|------|--------|--------|
| Profile summary (ad, soyad, sehir, dogum_yili, cinsiyet) | `candidates` | Read |
| Derived fields (son_sirket, son_pozisyon, son_marka, toplam_deneyim_ay) | `candidates` | Read |
| Experience entries | `candidate_experiences` | Read |
| Education entries | `candidate_education` | Read |
| Certificates | `candidate_certificates` | Read |
| Languages | `candidate_languages` | Read |
| Avatar | `candidates.avatar_url` | Read (see storage section) |
| CV | `candidates.cv_url` | Read (see storage section) |
| Contact (telefon, email) | `candidates` | Read |

**Not exposed:** `candidates.user_id`, `candidates.id` as external identifier, raw storage paths.

---

## Storage Access: CV and Avatar

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A: Public URL** (current) | DB stores full URL, browser fetches directly | Zero implementation cost; no latency | No access control or revocation |
| **B: Signed URL** | DB stores storage path; backend generates time-limited URL | URLs expire; access can be logged | Requires canonical reference migration + edge function |
| **C: App-mediated proxy** | Backend streams file after auth check | Full control; rate-limit, watermark | Bandwidth bottleneck; highest cost |

### Recommendation

**Phase 1: Option A (public URL).** `avatar_url` and `cv_url` already store public URLs. The employer dashboard has no backend wiring yet — adding signed URL infra before basic read access exists is premature. Avatar is inherently public (card display).

**Phase 2: Option B for CV only.** Prerequisites: employer RLS live, canonical CV reference migrated to storage path, edge function for signed URL generation. Avatar stays public URL.

---

## RLS Strategy (builds on existing `hr_profiles`)

The employer read policy checks for a row in `hr_profiles` matching the current auth user. This reuses the table that already exists rather than creating a new identity structure.

```sql
-- Illustrative — not final SQL
CREATE POLICY employer_read_candidates ON candidates FOR SELECT
  USING (
    -- candidate self-access (existing)
    user_id = auth.uid()
    OR
    -- employer access
    EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())
  );
```

Same pattern extends to child tables. The policy shape depends on product decisions below.

---

## Open Product Decisions (must resolve before writing SQL)

1. **Candidate visibility scope:** Do employers see all active candidates, or only those matching open positions?
2. **Candidate opt-in:** Is there a visibility toggle (`is_visible_to_employers`) on the candidate side?
3. **Contact data gating:** Open to all employers in phase 1, or gated behind unlock/credit?
4. **Login routing fix:** Should `giris.html:465` redirect to `ik.html` instead of `isveren.html`?
5. **Session guard on `ik.html`:** What happens if a candidate auth.uid navigates to `ik.html`?

---

## Phase 1 vs Later

| Concern | Phase 1 | Later |
|---------|---------|-------|
| Employer identity | `hr_profiles` (existing, one user per company) | `employer_users` join table with roles (admin, viewer, hiring manager) |
| Candidate visibility | All active candidates (or opt-in flag) | Position-based matching |
| CV access | Public URL (current) | Signed URL via edge function |
| Contact data | Visible to all employers | Gated behind unlock/credit |
| RLS | One `employer_read` policy per table using `hr_profiles` | Per-role policies, team-scoped |
| Audit trail | None | `employer_candidate_views` log table |

---

## Next Steps (ordered)

1. Resolve the five open product decisions above
2. Migration 007: formalize `hr_profiles` table definition + add RLS (self-access for employers)
3. Migration 008: add employer read policies to candidate tables
4. Wire `ik.html`: session guard + live Supabase queries replacing hardcoded data
5. Fix `giris.html:465` redirect to `ik.html`
6. Later: signed URL infrastructure for CV
