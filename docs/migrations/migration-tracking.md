# Migration Tracking

> Last updated: 2026-03-11

---

## Migration Files in Repo

| File | Description | Applied? | How |
|------|------------|----------|-----|
| `001_normalized_profile_schema.sql` | Child tables, derived columns, RLS on child tables, `save_candidate_profile()` RPC, `get_my_candidate_id()` | Yes | Manually in Supabase SQL Editor |
| `002_career_type_multi_select.sql` | Allow comma-separated `career_type` values | Yes | Manually in Supabase SQL Editor |
| `003_cv_storage.sql` | Add `cv_url`, `cv_filename`, `cv_uploaded_at` to `candidates` | Yes | Manually in Supabase SQL Editor |
| `004_candidates_rls_storage_policies.sql` | RLS on `candidates` table + storage policies on `cvs` bucket | Yes | Manually in Supabase SQL Editor |

---

## Manual Actions Applied Outside Repo

These were done directly in the Supabase dashboard or SQL Editor and are **not** captured in any automated migration pipeline:

| Action | Where | Status |
|--------|-------|--------|
| Created `cvs` storage bucket | Supabase Dashboard → Storage | Done |
| Set `cvs` bucket to PUBLIC | Supabase Dashboard → Storage → Bucket settings | Done (temporary — see architecture doc section 9) |
| Applied migration 001 SQL | Supabase SQL Editor | Done |
| Applied migration 002 SQL | Supabase SQL Editor | Done |
| Applied migration 003 SQL | Supabase SQL Editor | Done |
| Applied migration 004 SQL (RLS + storage policies) | Supabase SQL Editor | Done |

---

## What Still Needs to Be Formalized

| Item | Priority | Notes |
|------|----------|-------|
| Automated migration runner | Low | Currently all SQL is run manually. Consider Supabase CLI migrations or a simple numbered-script runner when team grows. |
| Seed data / test fixtures | Low | No seed data exists. Manual testing accounts only. |
| Bucket privacy hardening | **High** (before recruiter launch) | Switch CVs to signed URLs or split into public `avatars` + private `cvs` buckets. See migration 004 comments for options. |
| Supabase project config in repo | Low | No `supabase/config.toml` or project ref tracked in repo. Dashboard is the only source for project settings. |

---

## Convention

- Migration files are numbered sequentially: `001_`, `002_`, etc.
- Each file is designed to be idempotent (uses `IF NOT EXISTS`, `DROP IF EXISTS` where possible)
- All migrations are currently run manually — always note the date and who ran it
- Future migrations should continue in `docs/migrations/` until an automated pipeline exists
