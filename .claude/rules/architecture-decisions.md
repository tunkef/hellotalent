# Architecture Decisions

## Company-Brand Hierarchy
- companies table: 61 holdings/groups (İnditex, LVMH, Fiba Retail, etc.)
- brands table: 96 brands with company_id FK (Zara→İnditex, Sephora→LVMH)
- brands.tr_operator_company_id: TR distributor (nullable, P3)
- Example: Balenciaga owned by Kering, operated in TR by Beymen
- Blocking is company-level, not brand-level (MVP decision)

## Employer System (P3 Design — NOT YET BUILT)
- Tek marka / çoklu marka onboarding flow
- Domain verification for company claim
- hr_profiles.company_id links employer to company
- hr_profiles.employer_role: admin | recruiter | viewer
- Team system: company_teams + company_invitations (future tables)
- Headhunter role: operates like employer but serves external clients

## Blocking System
- candidate_blocked_companies: candidate_id + company_id (both bigint)
- UI currently hidden (display:none) — activates when 30+ companies registered
- ik.html has enforcement code ready (filters blocked candidates from loadLiveCandidates)
- Crowdsourced data: companies self-declare their brand portfolio during onboarding

## Account Lifecycle
- account_status enum: active → frozen → pending_deletion
- Trigger: sync_account_status_to_active() — frozen/deletion → is_active=false
- On unfreeze (active): is_active NOT touched (preserves user's visibility preference)
- KVKK md.11: 30-day grace period for deletion, then cron purge
- Login allowed for frozen/pending_deletion (user can self-recover)

## Auth Flow
- giris.html → candidate tab → profil.html
- giris.html → İK tab → ik.html  
- gate.html → sessionStorage gate for content pages
- Legal pages (gizlilik, kvkk, kullanim-sartlari, cerez-politikasi): no gate

## Notification System
- 4 boolean columns on candidates table
- notify_email_messages + notify_email_jobs: active (default true)
- notify_sms_enabled + notify_push_enabled: future (default false, UI disabled)
- Backend notification worker: NOT YET BUILT (P3)
