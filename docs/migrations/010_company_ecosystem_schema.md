# 010 — Company / Brand Ecosystem Schema (Design Doc)

**Date:** 2026-03-11
**Status:** Draft — no SQL changes
**Depends on:** 006 (employer access model), 007 (employer backlog)

---

## Context

The candidate dashboard has a locked "Şirketler" card (`profil.html:1004`) marked "Yakında".
Candidates already select brand interests via `BRAND_DB` (~90 brands with parent-company
relationships, `profil.html:1704-1723`) persisted to `candidate_brand_interests`.

This doc designs the database layer that powers:
1. **Candidate side:** company/brand discovery, following, career pages, employer updates
2. **Employer side (later):** company claim, verified ownership, team access

---

## Core Product Rules

1. **DB is company-centered.** The `companies` table is the primary entity. Brands are children of companies.
2. **UI is brand-friendly.** Candidates see brand names and logos first. The parent company is secondary context (e.g. "Zara · İnditex").
3. **Employer ownership is never automatic.** Signing up with `@zara.com` does not auto-grant control. A claim must be submitted and reviewed.
4. **Claim requires review/approval.** Admin (or automated domain-match + manual review) approves claims.
5. **Domain-email gating.** Employer/company access is tied to verified corporate email domains. Personal email domains (`gmail.com`, `hotmail.com`, `yahoo.com`, etc.) are blocked from ownership flows.

---

## MVP Tables

### 1. `companies`

**Purpose:** Central registry of companies. One row per legal entity / parent organization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `name` | `text not null` | Display name (e.g. "İnditex", "Nike", "Migros") |
| `slug` | `text not null unique` | URL-safe key, lowercase (e.g. `inditex`, `nike`) |
| `logo_url` | `text` | Public logo URL (Supabase Storage or CDN) |
| `website` | `text` | Corporate website |
| `description` | `text` | Short company description / about |
| `sector` | `text` | Industry / sector label |
| `employee_count_range` | `text` | e.g. `51-200`, `1000+` |
| `headquarters_city` | `text` | Primary city |
| `career_page_url` | `text` | Link to careers page |
| `is_active` | `boolean default true` | Soft-delete / visibility flag |
| `created_at` | `timestamptz default now()` | |
| `updated_at` | `timestamptz default now()` | Auto-trigger |

**Relationships:** Parent of `brands`, `company_locations`, `company_updates`.

**Seeding:** Initial data derived from `BRAND_DB` parent entries — every unique non-empty `parent` value plus standalone brands become company rows.

---

### 2. `brands`

**Purpose:** Brand names that belong to a company. One company may have many brands. Brands without a parent are self-referencing (company = brand).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `company_id` | `bigint not null references companies(id)` | FK |
| `name` | `text not null` | Brand display name (e.g. "Zara", "Bershka") |
| `slug` | `text not null unique` | URL-safe key |
| `logo_url` | `text` | Brand-specific logo (falls back to company logo) |
| `is_active` | `boolean default true` | |
| `created_at` | `timestamptz default now()` | |

**Key rule:** For standalone companies (Nike, Migros), the company and a single brand row share the same name. This keeps the query model uniform — the UI always queries brands.

**Seeding:** Every entry in `BRAND_DB` becomes a brand row. If `parent` is empty, a company row is also created with the same name.

---

### 3. `company_locations`

**Purpose:** Cities / regions where the company has retail stores, offices, or operational presence.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `company_id` | `bigint not null references companies(id)` | FK |
| `city` | `text not null` | City name (e.g. "İstanbul", "Ankara") |
| `location_type` | `text default 'store'` | `store`, `office`, `headquarters`, `warehouse` |
| `address` | `text` | Optional street address |
| `created_at` | `timestamptz default now()` | |

**Unique:** `(company_id, city, location_type)` — prevents duplicate entries.

**MVP scope:** City-level granularity is sufficient. Street addresses are optional/later.

---

### 4. `company_updates`

**Purpose:** Short employer-branding posts visible on the company profile. Think LinkedIn-style company updates, but simpler.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `company_id` | `bigint not null references companies(id)` | FK |
| `title` | `text` | Optional headline |
| `body` | `text not null` | Update content (plain text, max ~500 chars) |
| `image_url` | `text` | Optional attached image |
| `published_at` | `timestamptz default now()` | |
| `is_active` | `boolean default true` | |
| `created_by` | `uuid references auth.users(id)` | Which employer posted it (null for seeded/admin content) |

**MVP scope:** Read-only for candidates. Initially seeded by admin. After employer claim flow ships, verified employers can post updates.

---

### 5. `candidate_company_follows`

**Purpose:** Candidates follow companies to see updates and signal interest.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `candidate_id` | `bigint not null references candidates(id)` | FK |
| `company_id` | `bigint not null references companies(id)` | FK |
| `created_at` | `timestamptz default now()` | |

**Unique:** `(candidate_id, company_id)` — one follow per company per candidate.

**Relationship to `candidate_brand_interests`:** The existing `candidate_brand_interests` table stores free-text brand names from the wizard. Once the companies/brands tables exist, a migration should:
- Map existing `candidate_brand_interests.marka` values to `brands.id`
- Convert brand follows into `candidate_company_follows` rows (following the parent company)
- Keep `candidate_brand_interests` read-only/deprecated, or drop it after migration

**RLS:** Candidate can INSERT/DELETE own follows only (`candidate_id` matches their candidate row).

---

## Later Tables

### 6. `employer_company_claims` (post-MVP)

**Purpose:** An employer requests ownership of a company profile.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `company_id` | `bigint not null references companies(id)` | FK |
| `claimed_by` | `uuid not null references auth.users(id)` | The employer user |
| `claimed_email` | `text not null` | Corporate email used for the claim |
| `email_domain` | `text not null` | Extracted domain (e.g. `zara.com`) |
| `status` | `text not null default 'pending'` | `pending`, `approved`, `rejected` |
| `reviewed_by` | `uuid references auth.users(id)` | Admin who reviewed |
| `reviewed_at` | `timestamptz` | |
| `rejection_reason` | `text` | |
| `created_at` | `timestamptz default now()` | |

**Flow:**
1. Employer clicks "Claim this company" from employer dashboard
2. System extracts email domain from their auth email
3. If domain is in the personal-email blocklist → claim rejected immediately
4. Claim row created with `status = 'pending'`
5. Admin reviews and approves/rejects
6. On approval → row inserted into `company_employer_access`

**Personal email blocklist** (enforced in application logic or a `blocked_email_domains` table):
`gmail.com`, `hotmail.com`, `yahoo.com`, `outlook.com`, `icloud.com`, `yandex.com`,
`mail.com`, `protonmail.com`, `gmx.com`, `hotmail.co.uk`, `live.com`, etc.

---

### 7. `company_employer_access` (post-MVP)

**Purpose:** Grants an employer user verified access to manage a company profile.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint generated always as identity` | PK |
| `company_id` | `bigint not null references companies(id)` | FK |
| `user_id` | `uuid not null references auth.users(id)` | FK |
| `role` | `text not null default 'admin'` | `admin`, `editor`, `viewer` |
| `granted_via` | `text not null` | `claim_approval`, `invite`, `admin_grant` |
| `granted_at` | `timestamptz default now()` | |
| `is_active` | `boolean default true` | Revocable |

**Unique:** `(company_id, user_id)` — one access row per user per company.

**Relationship to `hr_profiles`:** `hr_profiles` stores the employer's self-declared company name as free text (`sirket`). Once a claim is approved, the employer's profile is linked to a real `companies` row. `hr_profiles` may later gain a `company_id` FK, but this is not required for MVP.

---

## Schema Relationship Map

```
companies (1)
  ├── brands (N)
  ├── company_locations (N)
  ├── company_updates (N)
  ├── candidate_company_follows (N) ←── candidates
  ├── employer_company_claims (N, later) ←── auth.users (employers)
  └── company_employer_access (N, later) ←── auth.users (employers)
```

---

## MVP vs Later Summary

| Concern | MVP | Later |
|---------|-----|-------|
| Company/brand data | Seeded from `BRAND_DB`, admin-managed | Employer-managed after claim |
| Company updates | Admin-seeded content | Verified employers post updates |
| Candidate follows | `candidate_company_follows` with RLS | Feed of updates from followed companies |
| Employer claim | Not available | `employer_company_claims` with review flow |
| Employer access | Not available | `company_employer_access` with roles |
| Brand interest migration | Keep `candidate_brand_interests` as-is | Migrate to `candidate_company_follows` |
| Company logos | Manual upload / CDN | Employer uploads after claim |
| Location data | City-level, admin-seeded | Employer-managed store lists |

---

## RLS Strategy (MVP)

| Table | Candidate | Employer | Public |
|-------|-----------|----------|--------|
| `companies` | SELECT where `is_active = true` | SELECT where `is_active = true` | — |
| `brands` | SELECT where `is_active = true` | SELECT where `is_active = true` | — |
| `company_locations` | SELECT | SELECT | — |
| `company_updates` | SELECT where `is_active = true` | SELECT where `is_active = true` | — |
| `candidate_company_follows` | SELECT/INSERT/DELETE own rows | — | — |

All tables: no public (anon) access. Authenticated users only.

---

## Notification / Read-State (Later — Not MVP)

> **This section is future direction only. Do not implement now.**

When the company ecosystem matures, candidates who follow companies will want to see new updates. This requires:

- **`candidate_notifications`** table: `id`, `candidate_id`, `type` (e.g. `company_update`), `reference_id`, `is_read`, `created_at`
- **Trigger or cron:** When a `company_updates` row is inserted, fan-out notification rows to all followers
- **Read state:** `is_read` boolean, updated when candidate views the notification
- **Badge count:** `SELECT count(*) FROM candidate_notifications WHERE candidate_id = ? AND is_read = false`
- **Alternative:** Skip fan-out; instead query `company_updates WHERE company_id IN (followed companies) AND published_at > last_seen_at`. Simpler but less flexible.

The fan-out model is better for scale but adds write amplification. For early stage, the query-based approach is sufficient.

---

## Seeding Strategy

The `BRAND_DB` array in `profil.html` provides the initial dataset:

1. Extract unique parent companies → insert into `companies`
2. For brands with empty `parent`, create both a `companies` row and a `brands` row with the same name
3. For brands with a `parent`, create the `brands` row pointing to the parent company
4. Result: ~30 company rows, ~90 brand rows
5. Logos, descriptions, and locations are populated manually or via a separate data enrichment pass

The `BRAND_DB` array in `profil.html` should eventually reference `brands.id` instead of hardcoded names, but this is a later refactor after the tables are stable.

---

## Open Questions

1. **Should `candidate_brand_interests` be migrated to `candidate_company_follows` immediately, or kept separate?**
   Recommendation: Keep separate for MVP. They serve different purposes — brand interest is a profile preference (visible to employers), company follow is a content subscription. Merge later if product says they're the same.

2. **Should the `companies` table store verified email domains (`company_domains`) for the claim flow?**
   Recommendation: Yes, but as a separate later table `company_domains(company_id, domain, verified_at)` — a company may have multiple domains. Not needed for MVP.

3. **Who can create company/brand rows?**
   MVP: Admin only (seeded). Later: employer claim flow may request adding a new company if it doesn't exist.
