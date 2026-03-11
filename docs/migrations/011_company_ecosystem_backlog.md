# 011 — Company Ecosystem Implementation Backlog

**Date:** 2026-03-11
**Status:** Draft — no code changes
**Source of truth:** 010_company_ecosystem_schema.md

---

## Must-Do for MVP

These items unlock the "Şirketler" card (`profil.html:1004`) and deliver the core candidate-facing company experience.

### M1. Create `companies` table

- First table created — everything else depends on it
- Include `updated_at` auto-trigger (same pattern as migration 005)
- Enable RLS: authenticated users can SELECT where `is_active = true`
- No INSERT/UPDATE/DELETE for candidates or employers in MVP

### M2. Create `brands` table

- Depends on M1 (`company_id` FK)
- Enable RLS: authenticated users can SELECT where `is_active = true`
- Standalone brands (empty `parent` in `BRAND_DB`) get a same-name company row in M1 and a brand row here

### M3. Create `candidate_company_follows` table

- Depends on M1
- Unique constraint on `(candidate_id, company_id)`
- RLS: candidate can SELECT/INSERT/DELETE own rows only (same `get_my_candidate_id()` pattern used by other candidate tables)
- No employer access to this table

### M4. Create `company_updates` table

- Depends on M1
- RLS: authenticated users can SELECT where `is_active = true`
- `created_by` is nullable (admin-seeded rows have no author)
- No candidate or employer INSERT in MVP — admin only

### M5. Create `company_locations` table

- Depends on M1
- Unique constraint on `(company_id, city, location_type)`
- RLS: authenticated users can SELECT
- Optional for initial launch — can ship M1-M4 first, add locations when data is ready

### M6. Seed company and brand data

- Write a seed migration (idempotent INSERT ... ON CONFLICT DO NOTHING)
- Source: `BRAND_DB` array in `profil.html:1704-1723`
- Step 1: Extract ~30 unique parent companies + standalone brands → `companies` rows
- Step 2: All ~90 `BRAND_DB` entries → `brands` rows with correct `company_id` FK
- Slugs generated from names: lowercase, Turkish chars normalized, spaces → hyphens
- Logos, descriptions, career URLs, locations are **not** seeded now — populated manually later
- `company_updates` gets 2-3 sample rows per top company for UI testing, clearly marked as placeholder

**Table creation order:** M1 → M2 → M3 → M4 → M5 → M6 (seed)

---

### M7. Build "Şirketler" sidebar panel in `profil.html`

Unlock the locked card and add a new panel. Scope is intentionally minimal.

**Panel structure:**

```
┌─────────────────────────────────────────┐
│  🔍 Search bar (brand/company name)     │
├─────────────────────────────────────────┤
│  Takip Ettiklerin (3)          Tümü →   │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ Logo │ │ Logo │ │ Logo │            │
│  │ Zara │ │ Nike │ │ IKEA │            │
│  └──────┘ └──────┘ └──────┘            │
├─────────────────────────────────────────┤
│  Öne Çıkan Şirketler                   │
│  ┌─────────────────────────────────┐    │
│  │ Logo  Company / Brand Name      │    │
│  │       Sector · City             │    │
│  │       [Takip Et]                │    │
│  └─────────────────────────────────┘    │
│  ... (repeating cards)                  │
└─────────────────────────────────────────┘
```

**What the panel includes (MVP):**
- Search input: filters brands by name, shows parent company as secondary text
- Followed companies row: horizontal scroll of followed company cards (logo + name)
- Featured companies list: vertical card list, each card shows logo, brand name, parent company, sector, HQ city, follow/unfollow button
- Empty state: friendly message when no companies match search

**What stays out of MVP:**
- Company detail/profile page (click-through to full profile)
- Company updates feed on the panel (updates exist in DB but are not rendered yet)
- Career page link display
- Location/store list display
- Brand grouping under parent company (flat list for now)

### M8. Search behavior

- Client-side filter over a pre-fetched brand list (same pattern as `BRAND_DB` autocomplete)
- On panel load: `supabase.from('brands').select('id, name, slug, logo_url, company_id, companies(name, slug, sector, headquarters_city, logo_url)').eq('is_active', true)`
- Cache in memory for session duration — brand list is small (~90 rows)
- Search input filters by `brand.name` (case-insensitive, Turkish locale-aware with `toLocaleLowerCase('tr')`)
- Show parent company name as subtext: "Zara · İnditex"
- If brand name = company name (standalone), show sector instead: "Nike · Spor"

### M9. Follow behavior

- Follow button on each company card: `INSERT INTO candidate_company_follows`
- Unfollow: `DELETE FROM candidate_company_follows WHERE candidate_id = ? AND company_id = ?`
- Follow state loaded on panel open: `supabase.from('candidate_company_follows').select('company_id').eq('candidate_id', cid)`
- Follow count shown on the "Takip Ettiklerin" section header
- Optimistic UI: button toggles immediately, revert on error
- Follow limit: none for MVP (revisit if abuse appears)

### M10. Wire sidebar navigation

- Add "Şirketler" nav button to the sidebar (`profil.html:778-806`) after "Ayarlar"
- Create `panel-sirketler` section
- Update `switchPanel()` to handle the new panel
- Remove the `locked` class and "Yakında" badge from the Şirketler dash card (`profil.html:1004`)
- Make the dash card clickable: `onclick="switchPanel('sirketler')"`

---

## Should-Do Soon After MVP

These items improve the experience but don't block initial launch.

### S1. Company detail view

- Clicking a company card opens a detail overlay or sub-panel
- Shows: logo, full description, career page link, locations, recent updates
- Back button returns to company list
- No new tables needed — uses existing `companies`, `brands`, `company_locations`, `company_updates`

### S2. Render company updates in detail view

- Query: `supabase.from('company_updates').select('*').eq('company_id', id).eq('is_active', true).order('published_at', {ascending: false}).limit(5)`
- Simple card list: title, body, date, optional image
- Read-only — no interactions

### S3. Display career page links

- Show `career_page_url` as an external link button on the company card/detail
- Opens in new tab
- Only shown when URL exists

### S4. Migrate `candidate_brand_interests` to follow-aware state

- For each existing `candidate_brand_interests.marka` value:
  - Find matching `brands.name`
  - Resolve to `company_id`
  - Insert into `candidate_company_follows` if not already following
- Keep `candidate_brand_interests` table intact (still used by wizard `profil.html:1405`)
- The wizard "İlgilendiğin Markalar" section should eventually query `brands` table instead of `BRAND_DB`, but this is a separate refactor

### S5. Logo enrichment pass

- Manually add `logo_url` for top ~30 companies
- Use Supabase Storage bucket `company-logos/` with public access
- Reference in `companies.logo_url` and optionally `brands.logo_url`
- Fallback in UI: show first letter of company name in a colored circle when no logo

### S6. Populate `company_locations` for major companies

- Admin seeds city-level presence for top 15-20 companies
- Focus on Turkish cities where the company has stores/offices
- Displayed in company detail view (S1)

---

## Later-Scale Items

These depend on employer ecosystem maturity and product growth.

### L1. Employer company claim flow

- Tables: `employer_company_claims`, `company_employer_access` (defined in 010)
- UI in employer dashboard (`ik.html`): "Claim your company" button
- Backend: validate email domain against personal-email blocklist, create pending claim
- Admin review interface (Supabase Dashboard or simple admin page)
- On approval: insert `company_employer_access` row, optionally add `company_id` FK to `hr_profiles`

### L2. Employer-managed company updates

- Requires L1 (verified company access)
- Employer with `company_employer_access.role IN ('admin', 'editor')` can create `company_updates`
- RLS: INSERT allowed when user has active access row for the target company
- Moderation: updates visible immediately (no approval queue for MVP of this feature)

### L3. Employer-managed company profile

- Requires L1
- Verified employer can edit: `description`, `logo_url`, `career_page_url`, `website`
- RLS: UPDATE on `companies` allowed when user has admin access
- Audit: `updated_at` auto-trigger tracks last change

### L4. Company domain registry

- New table: `company_domains(id, company_id, domain, verified_at)`
- Used to auto-suggest company match during employer signup (not auto-grant)
- Used to streamline claim review: if employer email domain matches a registered domain, claim is pre-approved or fast-tracked

### L5. Premium candidate visibility to followed companies

- Premium candidates can "highlight" their profile to companies they follow
- Employers see highlighted candidates in a separate section
- Requires: premium tier system, `candidate_company_follows` already exists as the base

### L6. Notification / feed system

- As described in 010 "Notification / Read-State" section
- Query-based approach first: show updates from followed companies newer than last visit
- Fan-out to `candidate_notifications` table only if query approach becomes insufficient

### L7. `BRAND_DB` refactor

- Replace hardcoded `BRAND_DB` array in `profil.html` with a Supabase query to `brands`
- Wizard brand autocomplete and Şirketler panel share the same data source
- Removes the need to keep two copies of brand data in sync

---

## What Stays Out of MVP (Explicit)

| Feature | Why not now |
|---------|-------------|
| Company detail page | MVP is discovery + follow only; detail is S1 |
| Company updates in UI | Data seeded in DB but not rendered until S2 |
| Career page links | Needs data enrichment first (S3 + S5) |
| Location/store display | Needs data enrichment (S6) |
| Employer claim flow | Requires admin tooling, domain validation (L1) |
| Employer posting | Requires claim flow (L2) |
| Brand grouping in UI | Flat list is simpler; group later if needed |
| `candidate_brand_interests` migration | MVP keeps both tables; reconcile in S4 |
| Notification badges | Later-scale (L6) |
| `BRAND_DB` array removal | Later refactor (L7) |

---

## Recommended Implementation Order

```
M1 → M2 → M3 → M4 → M5 → M6 → M10 → M8 → M9 → M7
```

**Rationale:**
- M1-M5: tables first, in FK dependency order
- M6: seed data so UI has something to show
- M10: wire sidebar navigation (minimal UI scaffolding)
- M8: search loads and filters brands (core data flow)
- M9: follow behavior (core interaction)
- M7: assemble the full panel (depends on M8 + M9 working)

**Then:** S5 (logos) → S1 (detail view) → S2 (updates) → S3 (career links) → S4 (brand interest migration) → S6 (locations)

---

## Dependencies

| Item | Depends on |
|------|-----------|
| M2 (brands) | M1 (companies) |
| M3 (follows) | M1 (companies) |
| M4 (updates) | M1 (companies) |
| M5 (locations) | M1 (companies) |
| M6 (seed) | M1 + M2 |
| M7 (panel) | M6 + M8 + M9 + M10 |
| M8 (search) | M6 (data exists) |
| M9 (follow) | M3 + M6 |
| M10 (nav) | None (pure UI) |
| S1 (detail) | M7 |
| S2 (updates UI) | S1 + M4 |
| S4 (interest migration) | M3 + M6 |
| L1 (claim) | M1 + 006/007 employer model |
| L2 (employer updates) | L1 + M4 |
