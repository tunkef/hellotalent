# 007 — Employer Implementation Backlog

**Date:** 2026-03-11
**Status:** Draft — derived from 006_employer_access_model.md
**Scope:** Practical task list to bring employer dashboard to production-ready state

---

## Must-Do Before Employer Dashboard Goes Live

These items block any real employer usage of `ik.html`.

### M1. Formalize `hr_profiles` table in a migration file

- Write a reconciliation migration (like 004) that declares `hr_profiles` with all known columns
- Idempotent — `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS` for extended columns
- The table already exists in production; this tracks it in version control
- Confirm PK is `id uuid` referencing `auth.users(id)`

### M2. Add RLS to `hr_profiles`

- Enable RLS on `hr_profiles` (currently unprotected)
- Self-access policy: employer can read/update own row only (`id = auth.uid()`)
- No cross-employer visibility needed

### M3. Add session guard to `ik.html`

- On page load, verify `auth.getSession()` returns a valid session
- Verify the session user has a row in `hr_profiles`
- If either check fails, redirect to `giris.html`
- Prevents candidates or unauthenticated users from seeing the dashboard

### M4. Add employer read policies to candidate tables

- New RLS policy on `candidates`: allow SELECT when `EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())`
- Same pattern on all 9 child tables (`candidate_experiences`, `candidate_education`, etc.)
- Read-only — no INSERT/UPDATE/DELETE for employers
- Must coexist with existing candidate self-access policies (OR condition)

### M5. Replace hardcoded candidate data in `ik.html`

- Replace the `ADAYLAR` array with live Supabase queries
- Query `candidates` + derived fields for card list
- Query child tables for detail view
- Respect the column visibility defined in 006 (no `user_id`, no `id` as external identifier)

### M6. Decide candidate visibility scope

- **Product decision required.** Options:
  - All candidates where `is_active = true`
  - All candidates where `profile_completed = true`
  - Candidates who opt in via a new `visible_to_employers` flag
- This decision shapes the RLS policy WHERE clause in M4
- Default recommendation: `is_active = true AND profile_completed = true`

---

## Should-Do Soon After Launch

These items improve security and UX but don't block initial employer access.

### S1. Fix stale login redirect

- `giris.html:465` currently redirects employer login to `isveren.html` (marketing page)
- Change to `ik.html` (the actual dashboard)
- Small change, high user-facing impact

### S2. Enforce role metadata on login

- Employer login (`giris.html:loginIK`) should verify `raw_user_meta_data.role = 'employer'` after `signInWithPassword`
- If a candidate account tries the IK login form, show an error instead of redirecting
- Similarly, candidate login should not redirect employer accounts to `profil.html`

### S3. Add session guard to prevent cross-role dashboard access

- `profil.html`: if `hr_profiles` row exists for current user, redirect to `ik.html`
- `ik.html`: if `candidates` row exists but no `hr_profiles` row, redirect to `profil.html`
- Handles edge case of direct URL navigation

### S4. Move favorites from localStorage to database

- `ik.html` currently stores favorites in `localStorage` key `ht_ik_favs`
- Create `employer_favorites` table: `hr_profile_id uuid`, `candidate_id bigint`, `created_at`
- Add RLS so employers can only manage their own favorites
- Enables favorites to persist across devices/browsers

### S5. Exclude sensitive columns from employer queries

- Employer SELECT policies should not return `candidates.user_id`
- Options: use a Postgres view (`employer_candidate_view`) that omits `user_id`, or handle column selection in the frontend query
- Recommendation: frontend query with explicit `.select()` column list for now; view later if needed

---

## Later-Scale Items

These depend on product growth and employer feature complexity.

### L1. Signed URLs for CV access

- Migrate `cv_url` canonical reference from public URL to storage path
- Build edge function or RPC to generate time-limited signed URLs
- Scope: employer must be authenticated; URL expires after N minutes
- Avatar stays public URL (inherently public on cards)
- Prerequisites: M4 live, canonical storage design finalized

### L2. Contact data gating

- Add unlock/credit mechanism for viewing candidate phone/email
- Options: per-candidate unlock, subscription tier, or credit pool
- Requires new tables: `employer_unlocks` or `employer_credits`
- Phase 1 shows contact data openly; this adds a gate later

### L3. Multi-user employer accounts

- Current: one auth user per company (PK = auth.uid)
- Later: `employer_users` join table with roles (admin, viewer, hiring manager)
- Enables team access with granular permissions
- Requires refactoring RLS from `hr_profiles.id = auth.uid()` to role-based lookup

### L4. Employer activity audit trail

- `employer_candidate_views` table logging which employer viewed which candidate
- Useful for analytics, compliance, and candidate-side "who viewed my profile"
- Low priority until employer base grows

### L5. Position-based candidate matching

- Replace "all active candidates" visibility with position-specific matching
- Employer creates a position → system suggests matching candidates
- Requires the positions panel in `ik.html` to have DB backing first

---

## Recommended Implementation Order

```
M6 → M1 → M2 → M4 → M3 → M5 → S1 → S2 → S3 → S4 → S5
```

**Rationale:**
- M6 first: product decision on visibility scope determines the shape of everything else
- M1-M2: formalize and secure `hr_profiles` before adding cross-table access
- M4 before M3: RLS policies must exist before the dashboard serves live data
- M3-M5 together: session guard + live queries are the dashboard go-live moment
- S1-S2 immediately after: routing and role enforcement are quick wins
- S3-S5 follow as hardening

---

## Dependencies

| Item | Depends on |
|------|-----------|
| M2 (hr_profiles RLS) | M1 (table formalized) |
| M4 (employer read policies) | M1 + M6 (visibility decision) |
| M3 (session guard) | M2 (hr_profiles accessible) |
| M5 (live queries) | M4 (read policies exist) |
| S4 (favorites DB) | M1 (hr_profiles formalized) |
| L1 (signed URLs) | M4 live + storage canonical decision |
| L3 (multi-user) | L-scale product decision |
