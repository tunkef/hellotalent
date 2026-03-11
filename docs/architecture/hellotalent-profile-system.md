# Hellotalent Candidate Profile System — Architecture Reference

> Last updated: 2026-03-11
> Status: **live and working** — this document describes the current production state.

---

## 1. Source of Truth

The active candidate dashboard and profile system lives in **`profil.html`** (root of repo).

There is **one** active file for the candidate-facing experience. All other copies (`profil_backup.html`, `aday_backup.html`, `index_new.html`) were removed from `main`.

---

## 2. Candidate Dashboard / Profile Flow

### High-level flow

1. Candidate logs in → lands on `profil.html`
2. Dashboard shows completion score, profile summary, and section cards
3. "Edit" on any section opens a 5-step wizard:
   - Step 1: Kişisel Bilgiler (personal info, avatar upload)
   - Step 2: Kariyer Geçmişi (work experience — repeating cards)
   - Step 3: Eğitim & Sertifikalar (education, certificates, languages)
   - Step 4: Kariyer Tercihleri (target roles, work preferences, brand interests)
   - Step 5: Lokasyon Tercihleri (city/district preferences)
4. Wizard saves via `save_candidate_profile()` RPC (single transaction)
5. CV upload/replace/delete is handled separately outside the wizard
6. Dashboard re-renders from DB after save

### Wizard state management

- **Draft saving**: wizard state is backed up to `localStorage` on every change (`saveDraft()`)
- **Dirty tracking**: `wizardDirty` flag triggers unsaved-changes warning on navigation
- **Restore**: `loadDraft()` / `applyDraft()` repopulate steps 2–5 correctly after refresh
- **Clear**: draft is cleared on successful RPC save

---

## 3. Active Database Tables

### Parent table

| Table | Purpose |
|-------|---------|
| `candidates` | One row per candidate. Stores personal info, derived fields, CV metadata. |

Key columns added by migrations:
- `son_sirket`, `son_pozisyon`, `son_marka`, `halen_calisiyor`, `toplam_deneyim_ay` — derived from latest experience
- `profile_completed` — boolean
- `cv_url`, `cv_filename`, `cv_uploaded_at` — CV metadata (migration 003)
- `updated_at`

### Child tables (all from migration 001)

| Table | Purpose |
|-------|---------|
| `candidate_experiences` | Work history entries (repeating) |
| `candidate_education` | Education entries (repeating) |
| `candidate_certificates` | Certificate entries (repeating) |
| `candidate_languages` | Language proficiency entries |
| `candidate_target_roles` | Desired role entries |
| `candidate_work_preferences` | Career type, salary, travel prefs |
| `candidate_brand_interests` | Target brands (chip-style) |
| `candidate_location_preferences` | Preferred cities |
| `candidate_location_pref_districts` | Preferred districts within cities |

All child tables use `candidate_id bigint REFERENCES candidates(id) ON DELETE CASCADE`.

---

## 4. Active RPCs

| Function | Purpose |
|----------|---------|
| `save_candidate_profile(...)` | Transaction-safe upsert of all profile data. Deletes old child rows, inserts new ones, updates derived fields on `candidates`. Called from wizard "Save" action. |
| `get_my_candidate_id()` | Returns current user's candidate.id. Used internally. |

CV metadata (`cv_url`, `cv_filename`, `cv_uploaded_at`) is updated via direct `candidates` table update, **not** through the RPC.

---

## 5. Storage Contract

### Bucket

Single bucket: **`cvs`** (set to PUBLIC in Supabase dashboard).

### Path conventions

| Asset | Path pattern | Example |
|-------|-------------|---------|
| Avatar | `avatars/{user_id}.{ext}` | `avatars/a1b2c3d4-...-uuid.jpg` |
| CV | `cv/{user_id}/cv.{ext}` | `cv/a1b2c3d4-...-uuid/cv.pdf` |

### Rules

- **Single active CV per user**: uploading a new CV replaces the old one (delete then upload). Only one CV file exists at any time.
- **Single active avatar per user**: uploading a new avatar overwrites the old one via `upsert: true`.
- Both use `getPublicUrl()` for URL generation (see security note below).

### Client-side operations

- **CV upload**: `supabase.storage.from('cvs').upload('cv/{uid}/cv.{ext}', file)`
- **CV delete**: `supabase.storage.from('cvs').remove(['cv/{uid}/cv.{ext}'])`
- **Avatar upload**: `supabase.storage.from('cvs').upload('avatars/{uid}.{ext}', file, { upsert: true })`
- **Avatar list**: `supabase.storage.from('cvs').list('avatars', { search: uid })`

---

## 6. Security — Row Level Security (RLS)

### candidates table (migration 004)

- `candidates_select_own` — SELECT where `user_id = auth.uid()`
- `candidates_insert_own` — INSERT where `user_id = auth.uid()`
- `candidates_update_own` — UPDATE where `user_id = auth.uid()`
- No DELETE policy (admin-only operation)

### Child tables (migration 001)

All child tables have RLS policies scoped to `candidate_id` belonging to the current user (resolved via `get_my_candidate_id()`).

### Storage policies (migration 004)

Four policies on `storage.objects` for bucket `cvs`:
- `cvs_bucket_insert` — upload own CV or avatar
- `cvs_bucket_select` — read own CV or avatar
- `cvs_bucket_update` — overwrite own files (upsert)
- `cvs_bucket_delete` — delete own files

All scoped by path pattern matching `auth.uid()`.

---

## 7. Known Assumptions

- Supabase project is the single backend. No custom server.
- `profil.html` is served as a static file (GitHub Pages or similar).
- Auth is Supabase Auth (email/password). Session stored in Supabase client.
- Gate check: `sessionStorage.getItem("ht_gate")` controls access.
- All candidate data lives in one Supabase project/schema.
- CV and avatar storage share a single bucket (`cvs`).

---

## 8. Known Manual Infrastructure Dependencies

The following were applied **manually in the Supabase SQL Editor** and are not enforced by CI/CD:

- RLS on `candidates` table (migration 004 SQL was run manually)
- Storage policies on `storage.objects` for bucket `cvs` (migration 004 SQL was run manually)
- CV columns on `candidates` table (migration 003 SQL was run manually)
- The `cvs` bucket itself was created manually in the Supabase dashboard
- The `cvs` bucket is set to **PUBLIC** in the Supabase dashboard

See `docs/migrations/migration-tracking.md` for details.

---

## 9. Security: Public CV URLs — Temporary Compromise

**Current state**: The `cvs` bucket is PUBLIC. Both avatars and CVs use `getPublicUrl()`, so anyone with the URL can download the file without authentication.

**Why this is acceptable now**:
- CV URLs contain a UUID path segment (`cv/{uuid}/cv.pdf`) — unguessable in practice
- User base is small (early MVP)
- RLS still protects upload/delete/overwrite operations

**What must happen before recruiter-facing CV access goes live**:
- Switch to signed URLs for CVs, OR split into separate `avatars` (public) and `cvs` (private) buckets
- See migration 004 comments for detailed options (Option A: split buckets, Option B: signed URLs)
- This is **not optional** — recruiter access increases URL exposure and risk

---

## 10. What This Document Does NOT Cover

- Recruiter-side pages (not yet built)
- Landing pages (`index.html`, `kariyer.html`, etc.)
- Blog, contact, or employer pages
- Future notification or messaging features
- Deployment pipeline (currently manual)
