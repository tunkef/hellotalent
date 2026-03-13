# Hellotalent — Project Operating Map

**Status:** Operating map for AI collaboration only; not a deployment or runtime guarantee.

**Purpose:** Strict operating reset for AI collaboration. No code changes, no refactors, no patches.  
**Scope:** Source-of-truth identification, module map, Supabase flows, stability/drift, and recommended workstreams.  
**Vision:** Preserved. This document does not alter project structure, files, or product direction.

---

## Confirmed source-of-truth files (from current repo)

- **shared.js** — Defines `window.HT` (go, toggleLogin, toggleMenu, toggleAccordion, toggleShowMore, toggleFooterCol), injects header/footer into elements it finds by id. Contains page map, header/footer HTML strings, and bindEvents. **Confirmed:** present at repo root and used by pages that mount shared chrome.
- **shared.css** — Defines `:root` variables (--verm, --navy, --gray, --text, --muted, --border), reset, header, nav, dropdowns, footer, login modal, mobile menu. **Confirmed:** present at repo root.
- **gate.html** — Sets `sessionStorage.setItem('ht_gate', 'ok')` and can redirect when gate is already ok. **Confirmed:** in repo.
- **index.html** — Has gate check `sessionStorage.getItem("ht_gate")!=="ok"` → replace with gate.html; loads Supabase and has candidate signup/login and session redirect. **Confirmed:** in repo.
- **giris.html** — Gate check same key; Supabase auth; on load, if session exists, redirects by `user_metadata?.role` (employer → `ik.html`, else → `profil.html`); on IK login success, redirects to `ik.html`; on Aday login success, to `profil.html`. **Confirmed:** in repo.
- **profil.html** — Gate check; Supabase client; `STORAGE.BUCKET = 'cvs'`; RPC `save_candidate_profile`; candidate + child tables and Storage usage. **Confirmed:** in repo. Does **not** contain `ht-header`/`ht-footer` (own layout).
- **ik.html** — Gate check; Supabase client; on init: `getSession()` → no session → `giris.html?tab=ik`; `role !== 'employer'` → `profil.html`; then loads `hr_profiles` and renders candidate list from a **hardcoded** `ADAYLAR` array. **Confirmed:** in repo. Does **not** use `ht-header`/`ht-footer`.
- **aday.html, isveren.html, kariyer.html, yetkinlik.html, pozisyonlar.html, blog.html** — Each has gate check and (where used) own Supabase init. **Confirmed:** in repo.
- **hakkimizda.html, iletisim.html, gizlilik.html, kullanim-sartlari.html, kvkk.html, cerez-politikasi.html, isalim-rotasi.html** — Static/legal/content. **Confirmed:** in repo.
- **sitemap.xml, robots.txt, CNAME** — **Confirmed:** in repo.

**Shared chrome usage:** Pages that contain `id="ht-header"` and `id="ht-footer"` (and load shared.js/shared.css) use shared nav/footer. **Confirmed:** index, aday, isveren, kariyer, yetkinlik, blog, pozisyonlar, isalim-rotasi, hakkimizda, iletisim, gizlilik, kullanim-sartlari, kvkk, cerez-politikasi. **profil.html, gate.html, ik.html** do **not** have those placeholders — they use their own layout.

---

## Confirmed modules (from repo structure and code)

- **Gate + landing** — gate.html sets ht_gate; index.html enforces it and hosts landing, candidate signup/login, HR demo (Formspree). No ambiguity in files.
- **Candidate auth** — index.html and giris.html; Supabase Auth; candidate signup inserts into `candidates`. Confirmed in code.
- **Candidate profile (Profil Merkezi)** — profil.html; Supabase RPC + candidate tables + Storage (bucket `cvs`). Confirmed in code.
- **Employer auth** — index.html (HR modal) and giris.html (IK tab); Supabase Auth; employer signup writes to `hr_profiles` (and metadata). Confirmed in code.
- **Employer dashboard** — ik.html; session + role check; reads/upserts `hr_profiles`; candidate list from **hardcoded** `ADAYLAR`. Confirmed in code.
- **Content/career** — kariyer, yetkinlik, pozisyonlar, blog; each has own Supabase client when needed. Confirmed in repo.
- **Marketing** — aday, isveren. Confirmed in repo.

---

## Confirmed Supabase-dependent flows (from code only)

- **Gate** — Session-only; no Supabase. Confirmed.
- **Candidate signup (index)** — `auth.signUp` then insert `candidates` (user_id, full_name, email, telefon, is_approved). Confirmed.
- **Candidate login (index / giris)** — `signInWithPassword`; redirect to profil.html. Confirmed.
- **Profil load** — Session → fetch `candidates` by user_id; then parallel fetch of candidate_experiences, candidate_education, candidate_certificates, candidate_languages, candidate_target_roles, candidate_work_preferences, candidate_brand_interests, candidate_location_preferences (and districts). Confirmed in profil.html.
- **Profil save** — `supabase.rpc('save_candidate_profile', { ... })`. Confirmed.
- **Avatar/CV (profil)** — Storage bucket from `STORAGE.BUCKET` ('cvs'); upload/remove + `candidates` update for avatar_url / cv_url. Paths from STORAGE.avatarPath / STORAGE.cvPath. Confirmed.
- **Employer login (giris)** — `signInWithPassword` (IK form) → redirect to **ik.html**. Confirmed. Already-logged-in employer → ik.html by role. Confirmed.
- **ik.html init** — `getSession()`; no session → replace with giris.html?tab=ik; role !== 'employer' → replace with profil.html; then `hr_profiles` select by current user id; render from `ADAYLAR`. Confirmed.
- **Company/brand (profil)** — Queries `brands` and `candidate_company_follows`. Schema in migrations 012/012a. Repo confirms usage in profil; exact query shape is in file.

**Not in repo (design only):** Employer read access to candidate tables (RLS), live candidate list from DB, company_updates, employer claim flow — these are in docs, not in current code.

---

## Stable areas

- **Gate contract** — Key `ht_gate`, value `ok`; gate.html sets it; index, giris, ik, aday, isveren enforce it. Consistent across checked files.
- **shared.js / shared.css** — Single definition of shared chrome and `HT` API; pages that use ht-header/ht-footer depend on it. No duplicate nav definition in those pages.
- **Candidate data model** — Migration 001 (and related) + RPC `save_candidate_profile`; profil.html aligned with that. Schema and RPC are the intended contract.
- **Supabase project** — One URL and one anon key string used across HTML files. No second project in code.
- **Storage bucket name in profil** — `STORAGE.BUCKET = 'cvs'` in profil.html. Migration 004 states production uses `cvs`; repo matches that.
- **Employer routing from giris** — Employer → ik.html (both on existing session and on IK login success). No redirect to isveren in giris for post-login.
- **ik.html auth** — Session check and role check present; redirect to giris or profil when not employer. No “no guard” in current code.

---

## Drift-prone areas (structure, not “already broken”)

- **Supabase client init** — URL and anon key repeated in multiple HTML files. New or edited pages could paste an old or wrong key/URL.
- **profil.html size** — One large file; wizard, panels, and Supabase logic intertwined. Changes risk missing a call site or RPC contract.
- **Candidate list on ik.html** — Still `ADAYLAR` in code; any future switch to DB-backed list must align with RLS and visibility rules (docs 006/007).
- **Company/brand data** — Migrations 012/012a and design 010/011; profil already uses `brands` and follows. Any further move from hardcoded lists to DB should be checked against current usage so nothing is half-migrated.
- **Role metadata** — Set at employer signup; giris (session redirect) and ik (guard) use it. Other uses (e.g. candidate guard on profil, or RLS) not verified in this pass; future changes could assume more or less enforcement.

---

## Items that require verification (not confirmed by repo alone)

- **Runtime/live:** That the Supabase project (cpwibefquojehjehtrog) is the one in use and that anon key is correct and not rotated.
- **Runtime/live:** That migrations 001, 004, 008, 009, 012, 012a (and any others) are actually applied in the live DB in the order implied by docs.
- **Runtime/live:** That Storage bucket `cvs` exists and policies allow the avatar/CV operations used in profil.html.
- **Runtime/live:** That employer signup (index HR modal) actually sets `user_metadata.role = 'employer'` and inserts into `hr_profiles` — code paths should be traced once if this is critical.
- **Profil.html:** Whether any candidate guard exists (e.g. redirect to giris if no session, or redirect employer to ik) — not fully traced; would need a quick read if you need “confirmed” for that.
- **Design docs** — Whether docs/plans and docs/migrations still reflect current product intent (human/team decision, not verifiable from repo alone).

---

## Recommended next workstreams

**Priority order:**

1. **P1 — Verification before changes**  
   Before changing auth or employer flows, run the “Items that require verification” list (session behavior, migrations applied, bucket/policies, role set on signup, profil guards) in the real environment or with a quick code trace as needed.

2. **P2 — Employer dashboard data**  
   Replace `ADAYLAR` with Supabase-backed candidate list only after: (a) resolving visibility scope (006/007), (b) adding employer read policies on candidate tables, (c) verifying RLS in a real environment.

3. **P3 — Candidate profile consistency**  
   Keep any new fields or wizard steps in sync with migration 001, `save_candidate_profile` RPC, and plan docs; avoid creating a parallel “v2” flow unless the documented swap strategy is followed.

4. **P4 — Company/brand**  
   When replacing more hardcoded data with companies/brands/follows, verify in code where `BRAND_DB` vs Supabase is used so migration is consistent.

5. **P5 — Single source of truth for Supabase config**  
   For Supabase URL/key, either keep a short comment in this map or a single reference comment in repo; new pages should not add a new copy without checking.
