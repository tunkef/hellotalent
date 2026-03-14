# hellotalent.ai — Project Context

## Tech Stack
- Frontend: Static HTML/CSS/JS (vanilla, no framework)
- Backend: Supabase (PostgreSQL + Auth + Storage + RLS)
- Hosting: GitHub Pages (custom domain: hellotalent.ai)
- Repo: github.com/tunkef/hellotalent

## Design System
- Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body), DM Mono (data)
- Colors: Vermillion #C94E28, Navy #1E2D5E, Background #F7F6F4
- Forbidden fonts: Inter, Roboto
- Forbidden styles: purple gradients
- Forbidden word: "röportaj" — always use "mülakat" or "iş görüşmesi"

## Key Rules
- Homepage = index.html (never index_new.html)
- No console.log in production (only console.error/warn)
- candidates.id = bigint, companies.id = bigint (NOT uuid)
- hr_profiles.id = uuid (FK to auth.users)
- candidate_experiences.id = uuid, candidate_id = bigint
- Always use .maybeSingle() not .single() for new user queries
- UI language: Turkish throughout
- Step-by-step with verification — never skip ahead without approval

## DB Quick Reference
- 15 tables live, all with RLS
- candidate_blocked_companies exists but UI hidden (display:none, activates at 30+ companies)
- account_status enum: active / frozen / pending_deletion
- brands table: 96 entries with company_id FK
- brands.tr_operator_company_id: TR distributor mapping (P3, nullable)
- hr_profiles.company_id: nullable (employer claim P3)
- hr_profiles.employer_role: admin | recruiter | viewer

## Supabase Config
- Single source of truth: shared.js (HT_SUPA_URL, HT_SUPA_KEY)
- 3 pages create own client (need auth before shared.js): profil.html, ik.html, giris.html
- If URL/KEY change, update shared.js AND those 3 files
- Service role key bypasses RLS — use for admin ops only

## File Size Reference
- profil.html: 6300+ lines — always edit section-by-section
- ik.html: ~1900 lines
- index.html: ~2600 lines
- shared.css: ~800 lines (includes content page shared styles)

## Current State
- See docs/handoff.md for full project state
- P2 COMPLETE (all tasks #7-#10 done)
- Next: P3 (Employer Onboarding & Team System)

## Context7
Always use context7 when working with Supabase API, CSS, or any library docs.
