# Özel Teklifler (Special Offers) — MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium campaign system where employers publish curated offers/branding/hiring campaigns to candidates, moderated by admin, with real payment authorization.

**Architecture:** Supabase-backed campaign system with 4 surfaces: candidate feed panel (profil.html), employer wizard (ik.html), admin moderation console (admin.html on admin.hellotalent.ai), and unified inbox. Provider-abstracted iyzico payment with authorize→capture flow. Rule-based moderation flags with human approval.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions), iyzico payment gateway

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Status Machines](#2-status-machines)
3. [Database Schema](#3-database-schema)
4. [File Structure](#4-file-structure)
5. [Phase 0 — DB Foundation](#phase-0--db-foundation)
6. [Phase 1 — Admin Surface + Auth](#phase-1--admin-surface--auth)
7. [Phase 2 — Employer Campaign Wizard](#phase-2--employer-campaign-wizard)
8. [Phase 3 — Admin Moderation Console](#phase-3--admin-moderation-console)
9. [Phase 4 — Candidate Feed Panel](#phase-4--candidate-feed-panel)
10. [Phase 5 — Unified Inbox](#phase-5--unified-inbox)
11. [Phase 6 — Payment Integration](#phase-6--payment-integration)
12. [Phase 7 — Email Delivery + Analytics](#phase-7--email-delivery--analytics)
13. [Validation & Moderation Rules](#validation--moderation-rules)
14. [Asset Upload Standards](#asset-upload-standards)
15. [Audience Targeting Logic](#audience-targeting-logic)
16. [Open Decisions for Future](#open-decisions-for-future)

---

## 1. System Overview

### Four Surfaces

```
┌─────────────────────────────────────────────────────────────┐
│                    EMPLOYER (ik.html)                         │
│  Campaign Wizard → Submit → Payment Auth → Pending Review    │
└──────────────────────┬──────────────────────────────────────┘
                       │ INSERT campaign (status=pending_review)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN (admin.html @ admin.hellotalent.ai)        │
│  Review Queue → Approve/Reject/Revise → Publish/Release      │
└──────────────────────┬──────────────────────────────────────┘
                       │ UPDATE status → active (+ capture payment)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  CANDIDATE (profil.html)                      │
│  Sidebar: "Özel Teklifler" → Feed Panel → Card Grid          │
│  Unified Inbox → Campaign messages appear here too            │
└─────────────────────────────────────────────────────────────┘
```

### Campaign Types (enum: campaign_type)
| Value | Label (TR) | Description |
|-------|-----------|-------------|
| `offer` | Teklif Kampanyası | Discount code, employee perk, event invite, free trial, welcome benefit |
| `employer_branding` | İşveren Markası | Culture story, team story, growth environment, employee experience |
| `hiring_boost` | İşe Alım | Premium talent attraction — NOT a job board listing, feels like "join this brand world" |

### Distribution Modes (enum: distribution_mode)
| Value | Label (TR) | Behavior |
|-------|-----------|----------|
| `followers_only` | Sadece Takipçiler | Only candidates who follow this brand |
| `followers_plus_similar` | Takipçiler + Benzer | Followers + similar audience (same segment, city, seniority) |
| `broad_discovery` | Geniş Keşif | All candidates matching basic targeting + discovery expansion |

### Access Modes (enum: access_mode)
| Value | Label (TR) | Behavior |
|-------|-----------|----------|
| `public_all` | Herkese Açık | All candidates see + redeem |
| `visible_redeemable_premium` | Görünür, Premium Kullanım | All see, only premium candidates redeem specific perks |
| `premium_exclusive` | Premium'a Özel | Only premium candidates see + redeem |

### Delivery Channels (stored as text[] on campaign)
| Channel | Description | Package Tier |
|---------|-------------|-------------|
| `feed` | Appears in Özel Teklifler panel | Basic |
| `inbox` | Delivered to unified inbox | Boost |
| `email` | Sent via noreply@hellotalent.ai | Premium |

### Employer Packages (enum: campaign_package)
| Value | Channels | Price (TBD) |
|-------|----------|-------------|
| `basic` | feed | - |
| `boost` | feed + inbox | - |
| `premium` | feed + inbox + email | - |

---

## 2. Status Machines

### 2.1 Campaign Lifecycle

```
                    ┌──────────┐
                    │  draft    │ ← Employer saves incomplete wizard
                    └────┬─────┘
                         │ employer submits
                         ▼
                    ┌──────────────────┐
                    │ pending_review    │ ← Payment authorized (not captured)
                    └────┬─────────────┘
                         │ admin reviews
              ┌──────────┼──────────────┐
              ▼          ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌────────────────┐
        │ approved  │ │ rejected │ │ revision_needed │
        └────┬─────┘ └────┬─────┘ └───────┬────────┘
             │            │               │ employer edits + resubmits
             │            │               └──→ pending_review
             │            │
             │            └──→ payment released, campaign dead
             ▼
        ┌──────────┐
        │ active    │ ← Payment captured, visible to candidates
        └────┬─────┘
             │ schedule end_date reached OR admin pauses
             ▼
        ┌──────────┐      ┌──────────┐
        │ ended     │      │ paused    │ ← admin can pause anytime
        └────┬─────┘      └────┬─────┘
             │                 │ admin resumes
             │                 └──→ active
             │
             ▼
        ┌──────────┐
        │ archived  │ ← employer sees in history, can duplicate/relaunch
        └────┬─────┘
             │ employer relaunches (new payment auth)
             ▼
        ┌──────────────────┐
        │ pending_review    │ ← full review cycle again
        └──────────────────┘
```

**Valid transitions:**

| From | To | Actor | Condition |
|------|----|-------|-----------|
| draft | pending_review | employer | all required fields filled + payment authorized |
| pending_review | approved | admin | review passed |
| pending_review | rejected | admin | policy violation |
| pending_review | revision_needed | admin | fixable issues |
| revision_needed | pending_review | employer | edits made + resubmit |
| approved | active | system | start_date reached (or immediate if start_date <= now) |
| active | paused | admin | manual pause |
| active | ended | system | end_date reached |
| paused | active | admin | resume |
| ended | archived | system/employer | auto-archive after 7 days, or manual |
| archived | pending_review | employer | relaunch (new payment auth required) |
| rejected | draft | employer | wants to retry (optional, releases old auth) |

### 2.2 Payment Lifecycle

```
        ┌──────────────┐
        │ none          │ ← draft, no payment yet
        └─────┬────────┘
              │ employer submits campaign
              ▼
        ┌──────────────┐
        │ authorized    │ ← card charged hold, not captured
        └─────┬────────┘
              │ admin decision
        ┌─────┼──────────────┐
        ▼     ▼              ▼
  ┌──────────┐ ┌──────────┐ ┌────────────────┐
  │ captured  │ │ released │ │ authorized      │ ← revision keeps auth
  └──────────┘ └──────────┘ └────────────────┘
       │
       │ refund (edge case: admin-initiated)
       ▼
  ┌──────────┐
  │ refunded  │
  └──────────┘
```

**States:** `none` → `authorized` → `captured` | `released` | `refunded`

- **authorized:** hold placed via iyzico, amount reserved
- **captured:** admin approved → capture the hold
- **released:** admin rejected → release the hold
- **revision_needed:** auth stays alive (iyzico holds ~7 days; if revision takes longer, re-auth on resubmit)
- **refunded:** post-capture refund (admin-only, edge case)

### 2.3 Review Lifecycle (per review action)

Each admin action creates a `campaign_reviews` row:

```
pending_review → admin opens → reviews content → decides:
  ├── approve (note optional)
  ├── reject (reason required)
  └── revision_needed (specific feedback required)
```

Review history is append-only — never deleted. Employer sees latest status + feedback.

### 2.4 Delivery Lifecycle

```
campaign becomes active
  │
  ├── feed: campaign appears in candidate feed panel (real-time via query)
  │
  ├── inbox: system creates inbox_messages for matching candidates
  │         status: pending → delivered → read → (clicked)
  │
  └── email: system queues email_jobs for matching candidates
            status: queued → sent → delivered → opened → clicked
            (email sending is Phase 7 — initially queued but not sent)
```

---

## 3. Database Schema

### 3.0 Enums (created first)

```sql
-- Campaign enums
CREATE TYPE campaign_type AS ENUM ('offer', 'employer_branding', 'hiring_boost');
CREATE TYPE campaign_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'revision_needed', 'active', 'paused', 'ended', 'archived');
CREATE TYPE distribution_mode AS ENUM ('followers_only', 'followers_plus_similar', 'broad_discovery');
CREATE TYPE access_mode AS ENUM ('public_all', 'visible_redeemable_premium', 'premium_exclusive');
CREATE TYPE campaign_package AS ENUM ('basic', 'boost', 'premium');
CREATE TYPE payment_status AS ENUM ('none', 'authorized', 'captured', 'released', 'refunded');
CREATE TYPE review_action AS ENUM ('approve', 'reject', 'revision_needed', 'pause', 'resume', 'archive', 'feature');
CREATE TYPE inbox_message_type AS ENUM ('campaign', 'system', 'employer_dm');
CREATE TYPE inbox_message_status AS ENUM ('pending', 'delivered', 'read');
CREATE TYPE email_job_status AS ENUM ('queued', 'sent', 'delivered', 'opened', 'clicked', 'failed');
```

### 3.1 campaigns (main table)

```sql
CREATE TABLE campaigns (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,

  -- Ownership
  company_id      bigint NOT NULL REFERENCES companies(id),
  brand_id        bigint REFERENCES brands(id),           -- nullable: company-level campaign
  created_by      uuid NOT NULL REFERENCES auth.users(id), -- hr_profiles user

  -- Content
  campaign_type   campaign_type NOT NULL,
  title           text NOT NULL,
  short_desc      text NOT NULL,                           -- max 160 chars
  full_desc       text,                                    -- rich text (sanitized HTML or markdown)
  cta_label       text NOT NULL DEFAULT 'Detayları Gör',   -- button text
  cta_url         text,                                    -- landing page URL
  promo_code      text,                                    -- optional discount/perk code

  -- Assets (Supabase Storage paths)
  cover_image_url text,                                    -- required for publish
  logo_url        text,                                    -- optional override (defaults to brand logo)

  -- Targeting
  distribution_mode distribution_mode NOT NULL DEFAULT 'followers_only',
  access_mode     access_mode NOT NULL DEFAULT 'public_all',
  target_cities   text[],                                  -- null = all cities
  target_segments text[],                                  -- brand segments: LUXURY, PREMIUM, etc.
  target_seniority text[],                                 -- junior, mid, senior, manager
  target_tags     text[],                                  -- free-form tags for future use

  -- Schedule
  start_date      timestamptz,                             -- null = immediately on approval
  end_date        timestamptz,                             -- nullable for drafts, required for submit
  -- CHECK: end_date must be set for non-draft campaigns
  CONSTRAINT campaigns_end_date_required CHECK (status = 'draft' OR end_date IS NOT NULL)

  -- Package & Delivery
  package         campaign_package NOT NULL DEFAULT 'basic',
  delivery_channels text[] NOT NULL DEFAULT '{feed}',      -- '{feed}', '{feed,inbox}', '{feed,inbox,email}'

  -- Status
  status          campaign_status NOT NULL DEFAULT 'draft',

  -- Payment
  payment_status  payment_status NOT NULL DEFAULT 'none',
  payment_amount  integer,                                 -- kuruş (smallest unit)
  payment_currency text DEFAULT 'TRY',
  payment_provider text DEFAULT 'iyzico',
  payment_auth_id text,                                    -- iyzico auth reference
  payment_capture_id text,                                 -- iyzico capture reference

  -- Moderation
  moderation_flags text[],                                 -- auto-detected flags: ['url_mismatch', 'keyword_flag', etc.]
  moderation_score integer DEFAULT 0,                      -- 0=clean, higher=more flags
  is_featured     boolean DEFAULT false,                   -- admin can mark as featured

  -- Metrics (denormalized counters, updated by triggers/cron)
  impression_count integer DEFAULT 0,
  click_count     integer DEFAULT 0,
  redeem_count    integer DEFAULT 0,

  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  submitted_at    timestamptz,                             -- when employer first submitted
  approved_at     timestamptz,
  published_at    timestamptz,                             -- when status became active
  ended_at        timestamptz,
  archived_at     timestamptz,

  -- Relaunch tracking
  parent_campaign_id bigint REFERENCES campaigns(id),      -- if relaunched from archived campaign
  relaunch_count  integer DEFAULT 0
);

-- Indexes
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_company ON campaigns(company_id);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_active_dates ON campaigns(status, start_date, end_date) WHERE status = 'active';
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
```

### 3.2 campaign_reviews (append-only audit log)

```sql
CREATE TABLE campaign_reviews (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL REFERENCES auth.users(id),  -- admin user
  action          review_action NOT NULL,
  note            text,                                      -- required for reject/revision_needed
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_reviews_campaign ON campaign_reviews(campaign_id, created_at DESC);
```

### 3.3 campaign_impressions (analytics - lightweight)

```sql
CREATE TABLE campaign_impressions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  candidate_id    bigint NOT NULL REFERENCES candidates(id),
  impression_type text NOT NULL DEFAULT 'feed',              -- 'feed', 'inbox', 'email'
  created_at      timestamptz DEFAULT now(),

  UNIQUE(campaign_id, candidate_id, impression_type)         -- one impression per type per candidate
);

CREATE INDEX idx_impressions_campaign ON campaign_impressions(campaign_id);
CREATE INDEX idx_impressions_candidate ON campaign_impressions(candidate_id);
```

### 3.4 campaign_clicks

```sql
CREATE TABLE campaign_clicks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  candidate_id    bigint NOT NULL REFERENCES candidates(id),
  click_type      text NOT NULL DEFAULT 'cta',               -- 'cta', 'card', 'redeem'
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_clicks_campaign ON campaign_clicks(campaign_id);
```

### 3.5 campaign_redemptions

```sql
CREATE TABLE campaign_redemptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     bigint NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  candidate_id    bigint NOT NULL REFERENCES candidates(id),
  redeemed_at     timestamptz DEFAULT now(),

  UNIQUE(campaign_id, candidate_id)                          -- one redemption per candidate
);

CREATE INDEX idx_redemptions_campaign ON campaign_redemptions(campaign_id);
```

### 3.6 inbox_messages (unified inbox)

```sql
CREATE TABLE inbox_messages (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Recipient
  recipient_id    bigint NOT NULL REFERENCES candidates(id),

  -- Sender context
  sender_type     text NOT NULL,                             -- 'system', 'campaign', 'employer'
  sender_user_id  uuid REFERENCES auth.users(id),            -- employer user (null for system)
  company_id      bigint REFERENCES companies(id),
  brand_id        bigint REFERENCES brands(id),
  campaign_id     bigint REFERENCES campaigns(id),           -- null for DM/system messages

  -- Content
  message_type    inbox_message_type NOT NULL DEFAULT 'campaign',
  title           text NOT NULL,
  body            text NOT NULL,
  cta_label       text,
  cta_url         text,
  cover_image_url text,

  -- State
  status          inbox_message_status NOT NULL DEFAULT 'pending',
  read_at         timestamptz,

  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  delivered_at    timestamptz
);

CREATE INDEX idx_inbox_recipient ON inbox_messages(recipient_id, created_at DESC);
CREATE INDEX idx_inbox_campaign ON inbox_messages(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_inbox_unread ON inbox_messages(recipient_id, status) WHERE status != 'read';
```

### 3.7 email_jobs (email delivery queue)

```sql
CREATE TABLE email_jobs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     bigint REFERENCES campaigns(id),
  recipient_id    bigint NOT NULL REFERENCES candidates(id),
  recipient_email text NOT NULL,

  -- Content snapshot (frozen at send time)
  subject         text NOT NULL,
  html_body       text NOT NULL,

  -- State
  status          email_job_status NOT NULL DEFAULT 'queued',
  sent_at         timestamptz,
  delivered_at    timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  error_message   text,

  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_email_jobs_status ON email_jobs(status) WHERE status = 'queued';
CREATE INDEX idx_email_jobs_campaign ON email_jobs(campaign_id);
```

### 3.8 admin_users (admin role management)

```sql
CREATE TABLE admin_users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id),
  role            text NOT NULL DEFAULT 'superadmin',        -- 'superadmin', 'moderator', 'viewer'
  display_name    text,
  created_at      timestamptz DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)
);

-- This is NOT based on user_metadata.role — it's a separate, secure table
-- Only superadmin can INSERT into this table (manual or via admin UI)
```

### 3.9 candidates table additions

```sql
-- Add premium support column (placeholder for future premium system)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS premium_until timestamptz;

-- Add unread inbox counter (denormalized for fast badge display)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS unread_inbox_count integer DEFAULT 0;
```

### 3.10 Updated at trigger (reusable)

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══ Unread inbox counter trigger ═══
-- Keeps candidates.unread_inbox_count in sync with inbox_messages
CREATE OR REPLACE FUNCTION update_unread_inbox_count()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT of new message (status != 'read'): increment
  IF TG_OP = 'INSERT' AND NEW.status != 'read' THEN
    UPDATE candidates SET unread_inbox_count = COALESCE(unread_inbox_count, 0) + 1
    WHERE id = NEW.recipient_id;
  END IF;

  -- On UPDATE (message marked as read): decrement
  IF TG_OP = 'UPDATE' AND OLD.status != 'read' AND NEW.status = 'read' THEN
    UPDATE candidates SET unread_inbox_count = GREATEST(COALESCE(unread_inbox_count, 0) - 1, 0)
    WHERE id = NEW.recipient_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER inbox_unread_counter
  AFTER INSERT OR UPDATE OF status ON inbox_messages
  FOR EACH ROW EXECUTE FUNCTION update_unread_inbox_count();
```

### 3.11 RLS Policies

```sql
-- ═══ campaigns ═══
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Employer: own company campaigns
-- NOTE: hr_profiles.company_id is nullable (employer may not have claimed a company yet)
-- NULL company_id means NULL IN (...) → FALSE in PostgreSQL, so unclaimed employers correctly get no access
-- The employer wizard UI must check company_id != null before allowing campaign creation
CREATE POLICY campaigns_employer_select ON campaigns
  FOR SELECT USING (
    created_by = auth.uid() OR
    company_id IN (SELECT company_id FROM hr_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY campaigns_employer_insert ON campaigns
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    company_id IN (SELECT company_id FROM hr_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
  );

CREATE POLICY campaigns_employer_update ON campaigns
  FOR UPDATE USING (
    created_by = auth.uid() AND
    status IN ('draft', 'revision_needed')
  );

-- Candidate: active campaigns only (feed)
-- Enforces premium_exclusive access mode at RLS level (not just client-side)
CREATE POLICY campaigns_candidate_read ON campaigns
  FOR SELECT USING (
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM candidates c
      WHERE c.user_id = auth.uid()
        AND (access_mode != 'premium_exclusive' OR c.is_premium = true)
    )
  );

-- Admin: full access (via admin_users table check)
CREATE POLICY campaigns_admin_all ON campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- ═══ inbox_messages ═══
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbox_candidate_select ON inbox_messages
  FOR SELECT USING (
    recipient_id = get_my_candidate_id()
  );

CREATE POLICY inbox_candidate_update ON inbox_messages
  FOR UPDATE USING (
    recipient_id = get_my_candidate_id()
  ) WITH CHECK (
    recipient_id = get_my_candidate_id()
  );

-- Employer: can see campaign inbox messages they sent
CREATE POLICY inbox_employer_select ON inbox_messages
  FOR SELECT USING (
    sender_user_id = auth.uid()
  );

-- Admin: full access
CREATE POLICY inbox_admin_all ON inbox_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

-- ═══ campaign_impressions / clicks / redemptions ═══
ALTER TABLE campaign_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_redemptions ENABLE ROW LEVEL SECURITY;

-- Candidates: insert own
CREATE POLICY impressions_candidate_insert ON campaign_impressions
  FOR INSERT WITH CHECK (candidate_id = get_my_candidate_id());

CREATE POLICY clicks_candidate_insert ON campaign_clicks
  FOR INSERT WITH CHECK (candidate_id = get_my_candidate_id());

CREATE POLICY redemptions_candidate_insert ON campaign_redemptions
  FOR INSERT WITH CHECK (candidate_id = get_my_candidate_id());

-- Employer: read own campaign analytics
CREATE POLICY impressions_employer_read ON campaign_impressions
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE company_id IN (SELECT company_id FROM hr_profiles WHERE id = auth.uid()))
  );

CREATE POLICY clicks_employer_read ON campaign_clicks
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE company_id IN (SELECT company_id FROM hr_profiles WHERE id = auth.uid()))
  );

CREATE POLICY redemptions_employer_read ON campaign_redemptions
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE company_id IN (SELECT company_id FROM hr_profiles WHERE id = auth.uid()))
  );

-- Admin: full read
CREATE POLICY impressions_admin ON campaign_impressions FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY clicks_admin ON campaign_clicks FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY redemptions_admin ON campaign_redemptions FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ═══ campaign_reviews ═══
ALTER TABLE campaign_reviews ENABLE ROW LEVEL SECURITY;

-- Admin only write
CREATE POLICY reviews_admin_all ON campaign_reviews
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Employer: read reviews for own campaigns
CREATE POLICY reviews_employer_read ON campaign_reviews
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM campaigns WHERE created_by = auth.uid())
  );

-- ═══ admin_users ═══
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_users_self_read ON admin_users
  FOR SELECT USING (id = auth.uid());

-- Superadmin manages other admins
-- IMPORTANT: Uses SECURITY DEFINER helper to avoid infinite RLS recursion
-- (querying admin_users from within admin_users policy would loop)
CREATE POLICY admin_users_superadmin ON admin_users
  FOR ALL USING (is_admin_role('superadmin'));

-- ═══ email_jobs ═══
ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_jobs_admin ON email_jobs
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
```

### 3.12 Helper Functions

```sql
-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin with specific role
CREATE OR REPLACE FUNCTION is_admin_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══ IMPORTANT: Segment key mapping ═══
-- brands.segment stores INTERNAL keys: 'luxury', 'premium', 'mid', 'sportswear', 'beauty', 'tech'
-- campaigns.target_segments must store the SAME internal keys
-- UI displays: LUXURY, PREMIUM, MODA, SPORT, BEAUTY, TECH (mapped in JS)
-- JS mapping: { luxury:'LUXURY', premium:'PREMIUM', mid:'MODA', sportswear:'SPORT', beauty:'BEAUTY', tech:'TECH' }

-- Get matching candidates for a campaign's targeting
-- NOTE: City matching uses candidate_location_preferences table (NOT candidates.tercih_sehirler which doesn't exist)
-- NOTE: Seniority matching uses candidate_experiences.deneyim_yil ranges (NOT a seniority enum)
-- NOTE: candidate_brand_follows must exist (created in P2 Markalar session) — verify before running
CREATE OR REPLACE FUNCTION get_campaign_audience(p_campaign_id bigint)
RETURNS TABLE(candidate_id bigint) AS $$
DECLARE
  v_campaign campaigns%ROWTYPE;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  RETURN QUERY
  SELECT c.id FROM candidates c
  WHERE c.is_active = true
    AND c.profile_completed = true
    -- City filter: uses candidate_location_preferences table
    AND (v_campaign.target_cities IS NULL OR
         EXISTS (
           SELECT 1 FROM candidate_location_preferences clp
           WHERE clp.candidate_id = c.id
           AND clp.city = ANY(v_campaign.target_cities)
         ))
    -- Segment filter (via brand follows) — uses INTERNAL segment keys (mid, sportswear, etc.)
    AND (v_campaign.target_segments IS NULL OR
         EXISTS (
           SELECT 1 FROM candidate_brand_follows cbf
           JOIN brands b ON b.id = cbf.brand_id
           WHERE cbf.candidate_id = c.id
           AND b.segment = ANY(v_campaign.target_segments)
         ))
    -- Seniority filter: maps to deneyim_yil ranges
    -- 'junior' = 0-2 yrs, 'mid' = 3-5 yrs, 'senior' = 6-10 yrs, 'manager' = 10+ yrs
    AND (v_campaign.target_seniority IS NULL OR
         (
           ('junior' = ANY(v_campaign.target_seniority) AND COALESCE(c.deneyim_yil, 0) <= 2) OR
           ('mid' = ANY(v_campaign.target_seniority) AND c.deneyim_yil BETWEEN 3 AND 5) OR
           ('senior' = ANY(v_campaign.target_seniority) AND c.deneyim_yil BETWEEN 6 AND 10) OR
           ('manager' = ANY(v_campaign.target_seniority) AND c.deneyim_yil > 10)
         ))
    -- Distribution mode
    AND (
      CASE v_campaign.distribution_mode
        WHEN 'followers_only' THEN
          EXISTS (
            SELECT 1 FROM candidate_brand_follows cbf
            WHERE cbf.candidate_id = c.id AND cbf.brand_id = v_campaign.brand_id
          )
        WHEN 'followers_plus_similar' THEN
          EXISTS (
            SELECT 1 FROM candidate_brand_follows cbf
            WHERE cbf.candidate_id = c.id AND cbf.brand_id = v_campaign.brand_id
          )
          OR EXISTS (
            SELECT 1 FROM candidate_brand_follows cbf2
            JOIN brands b2 ON b2.id = cbf2.brand_id
            WHERE cbf2.candidate_id = c.id
            AND b2.segment = ANY(
              SELECT b3.segment FROM brands b3 WHERE b3.id = v_campaign.brand_id
            )
          )
        WHEN 'broad_discovery' THEN true
        ELSE false
      END
    )
    -- Access mode: premium filter
    AND (
      CASE v_campaign.access_mode
        WHEN 'premium_exclusive' THEN c.is_premium = true
        ELSE true  -- public_all and visible_redeemable_premium show to everyone
      END
    )
    -- Blocked company filter
    AND NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = c.id AND cbc.company_id = v_campaign.company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══ Campaign Lifecycle Cron Functions ═══

-- Transition approved → active when start_date is reached
-- NOTE: Payment capture happens at admin approve time (not here).
-- Rationale: iyzico pre-auth holds expire after ~7 days. If start_date is far future,
-- the hold would expire. So we capture immediately on approve, and only delay visibility.
-- This means payment_status='captured' when status='approved' (waiting for start_date).
CREATE OR REPLACE FUNCTION activate_due_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET status = 'active', published_at = now()
  WHERE status = 'approved'
    AND payment_status = 'captured'  -- safety: only activate if payment was captured
    AND (start_date IS NULL OR start_date <= now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transition active → ended when end_date is passed
CREATE OR REPLACE FUNCTION end_expired_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET status = 'ended', ended_at = now()
  WHERE status = 'active'
    AND end_date <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-archive ended campaigns after 7 days
CREATE OR REPLACE FUNCTION archive_old_ended_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET status = 'archived', archived_at = now()
  WHERE status = 'ended'
    AND ended_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule these via pg_cron (run every 5 minutes):
-- SELECT cron.schedule('activate-campaigns', '*/5 * * * *', 'SELECT activate_due_campaigns()');
-- SELECT cron.schedule('end-campaigns', '*/5 * * * *', 'SELECT end_expired_campaigns()');
-- SELECT cron.schedule('archive-campaigns', '0 3 * * *', 'SELECT archive_old_ended_campaigns()');
```

---

## 4. File Structure

### New Files

| File | Responsibility | Estimated Lines |
|------|----------------|-----------------|
| `admin.html` | Admin moderation console (campaign review) | ~2000 |
| `profil-teklifler.js` | Candidate offer feed logic (load, filter, impression tracking) | ~400 |
| `ik-kampanya.js` | Employer campaign wizard logic (create, edit, submit) | ~600 |
| `docs/migrations/014_ozel_teklifler_schema.sql` | All DB schema for Phase 0 | ~300 |

### Modified Files

| File | Changes |
|------|---------|
| `profil.html` | +sidebar nav item, +panel HTML, +bento card rename, +bottom nav item |
| `profil.css` | +teklifler panel styles, +campaign card styles |
| `profil-ui.js` | +switchPanel hook for teklifler, +bento card activation |
| `ik.html` | +sidebar nav item "Kampanyalar", +panel-kampanyalar HTML, +wizard HTML |
| `shared.js` | +is_admin check helper (optional) |

### NOT Creating (explicitly excluded)

- `teklifler.html` — lives inside profil.html as panel
- `kampanya.html` — lives inside ik.html as panel
- AI moderation service — not MVP
- Real-time subscription for feed — not MVP (polling/manual refresh)

---

## Phase 0 — DB Foundation

**Goal:** Create all database tables, enums, functions, RLS policies, and indexes.

### Task 0.1: Create Migration File

**Files:**
- Create: `docs/migrations/014_ozel_teklifler_schema.sql`

- [ ] **Step 1:** Write the complete SQL migration combining all schema from Section 3 above (enums → tables → indexes → triggers → RLS → functions). Order matters: enums first, then tables without FK deps, then tables with FK deps, then RLS, then functions.

- [ ] **Step 2:** Review the migration for:
  - All FK references point to existing tables (candidates, companies, brands, auth.users, hr_profiles)
  - No `GENERATED ALWAYS` on ID columns that need upsert (use `GENERATED BY DEFAULT`)
  - `campaign_impressions` UNIQUE constraint allows one per type per candidate
  - `is_premium` + `premium_until` + `unread_inbox_count` ALTER TABLE on candidates
  - **PRE-CHECK (CRITICAL):** Verify `candidate_brand_follows` table exists in live DB.
    **Finding:** Migration SQL dosyası repo'da YOK, ama profil-ui.js (satır 2470, 2641, 2644)
    aktif olarak kullanıyor (follow/unfollow çalışıyor). Tablo Supabase SQL editor'dan manuel
    oluşturulmuş ama commit edilmemiş.
    ```sql
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candidate_brand_follows');
    ```
    If TRUE → devam et, ayrıca migration dosyasını retroaktif olarak commit et
    If FALSE → oluştur:
    ```sql
    CREATE TABLE candidate_brand_follows (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      brand_id bigint NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(candidate_id, brand_id)
    );
    CREATE INDEX idx_cbf_candidate ON candidate_brand_follows(candidate_id);
    CREATE INDEX idx_cbf_brand ON candidate_brand_follows(brand_id);
    ALTER TABLE candidate_brand_follows ENABLE ROW LEVEL SECURITY;
    CREATE POLICY cbf_candidate_own ON candidate_brand_follows
      FOR ALL USING (candidate_id = get_my_candidate_id());
    CREATE POLICY cbf_employer_read ON candidate_brand_follows
      FOR SELECT USING (is_employer());
    ```

- [ ] **Step 3:** Run migration on Supabase SQL editor

- [ ] **Step 4:** Verify tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name LIKE 'campaign%' OR table_name IN ('inbox_messages', 'email_jobs', 'admin_users')
  ORDER BY table_name;
  ```

- [ ] **Step 5:** Insert your admin user:
  ```sql
  INSERT INTO admin_users (id, role, display_name)
  VALUES ('[YOUR_AUTH_USER_ID]', 'superadmin', 'Admin');
  ```

- [ ] **Step 6:** Commit migration file

### Task 0.2: Verify RLS

- [ ] **Step 1:** Test admin policy: login as admin user, query campaigns table — should see all
- [ ] **Step 2:** Test employer policy: login as employer, try inserting a campaign for their company — should work
- [ ] **Step 3:** Test candidate policy: login as candidate, query campaigns — should only see status='active'
- [ ] **Step 4:** Test cross-company isolation: employer A cannot see employer B's campaigns

---

## Phase 1 — Admin Surface + Auth

**Goal:** Create admin.html as a standalone page with secure admin auth, deployable on admin.hellotalent.ai.

### Task 1.1: Admin Auth Strategy

**Design decision:** Admin auth uses the SAME Supabase auth (same project), but access is gated by `admin_users` table lookup. The page itself is NOT in the main site navigation — it lives at admin.hellotalent.ai (Cloudflare DNS + GitHub Pages or separate hosting).

**Security layers:**
1. Supabase auth (email+password login)
2. `admin_users` table check after login
3. Page has no links from public site
4. Future: IP allowlisting via Cloudflare

**Files:**
- Create: `admin.html`

- [ ] **Step 1:** Create `admin.html` with:
  - Same Supabase CDN import
  - Login form (email + password only, no social auth)
  - On login success: check `admin_users` table for auth.uid()
  - If not admin: show "Yetkisiz erişim" and sign out
  - If admin: show admin dashboard shell

- [ ] **Step 2:** Admin shell layout:
  - Navy sidebar (same design language as ik.html)
  - Nav items: Kampanya İncele, Tüm Kampanyalar, Ayarlar
  - Top bar: admin name + role + sign out
  - Main content area

- [ ] **Step 3:** No gate.html check (admin page is independent)

- [ ] **Step 4:** Commit

### Task 1.2: Admin DNS + Cloudflare Access Setup (REQUIRED before deploy)

> **SECURITY REQUIREMENT:** admin.html must NOT be publicly accessible without Cloudflare Access.
> Even though Supabase RLS protects data, the admin UI source code and login surface should not
> be discoverable. Cloudflare Access must be configured BEFORE admin.html goes live.

- [ ] **Step 1:** Configure Cloudflare DNS: `admin.hellotalent.ai` → same GitHub Pages
- [ ] **Step 2:** Configure Cloudflare Access policy for `admin.hellotalent.ai`:
  - Authentication: Email OTP (or Google, if already set up)
  - Allowed emails: owner's email only (for MVP)
  - All other traffic: blocked at Cloudflare edge (never reaches server)
- [ ] **Step 3:** Same repo for MVP. admin.html in root directory.
- [ ] **Step 4:** Verify: accessing admin.hellotalent.ai without Cloudflare Access auth shows Cloudflare block page
- [ ] **Step 5:** Verify: accessing hellotalent.ai/admin.html is also blocked (Cloudflare rule on path)

> **DECIDED:** Same repo for MVP with Cloudflare Access protection. (Owner confirmed 2026-03-16)

---

## Phase 2 — Employer Campaign Wizard

**Goal:** Employer can create, edit, and submit campaigns from ik.html.

### Task 2.1: Add Kampanyalar Nav Item to ik.html

**Files:**
- Modify: `ik.html` (sidebar nav + bottom nav + panel HTML)

- [ ] **Step 1:** Add sidebar nav item after "Şirket Profili":
  ```html
  <div class="nav-item" data-panel="kampanyalar" onclick="switchPanel('kampanyalar',this)">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
    Kampanyalar
    <span class="nav-badge" id="badge-kampanya-pending" style="display:none;">0</span>
  </div>
  ```

- [ ] **Step 2:** Add bottom nav item for mobile

- [ ] **Step 3:** Add empty panel:
  ```html
  <!-- ═══ PANEL: KAMPANYALAR ═══ -->
  <div class="panel" id="panel-kampanyalar">
    <div class="panel-header">
      <h2>Kampanyalar</h2>
      <button class="btn-primary btn-sm" id="btn-new-campaign">+ Yeni Kampanya</button>
    </div>
    <div id="campaign-list"></div>
    <div id="campaign-wizard" style="display:none;"></div>
  </div>
  ```

- [ ] **Step 4:** Verify switchPanel handles 'kampanyalar' correctly

- [ ] **Step 5:** Commit

### Task 2.2: Campaign List View

**Files:**
- Create: `ik-kampanya.js`
- Modify: `ik.html` (add script tag)

- [ ] **Step 1:** Create `ik-kampanya.js` with IIFE pattern:
  ```javascript
  (function(){
    'use strict';
    // IMPORTANT: Before loading campaigns or showing wizard, check hr_profiles.company_id != null
    // Employers who haven't claimed a company cannot create campaigns.
    // Show message: "Kampanya oluşturmak için önce şirketinizi tanımlayın."
    window._htLoadCampaigns = async function() {
      // First verify employer has company_id
      if (!window._htHrProfile || !window._htHrProfile.company_id) {
        // Show "claim your company first" message, hide wizard button
        return;
      }
      // Load campaigns for current employer's company
    };
  })();
  ```

- [ ] **Step 2:** Load campaigns grouped by status:
  - Active (status: active) — green indicator
  - Beklemede (status: pending_review) — yellow indicator
  - Taslak (status: draft) — gray indicator
  - Düzenleme İstendi (status: revision_needed) — orange indicator
  - Arşiv (status: archived, ended, rejected) — muted

- [ ] **Step 3:** Each campaign card shows:
  - Title + campaign_type badge
  - Status pill (color-coded)
  - Date range (start_date — end_date)
  - Basic metrics (impressions, clicks) if active
  - Actions: Düzenle (draft/revision), Görüntüle (all), Yeniden Yayınla (archived), Sil (draft only)

- [ ] **Step 4:** Commit

### Task 2.3: Campaign Wizard — Multi-Step Form

**Files:**
- Modify: `ik-kampanya.js`
- Modify: `ik.html` (wizard HTML structure)

**Wizard steps:**

**Step 1: Kampanya Türü**
- 3 cards: Teklif, İşveren Markası, İşe Alım
- Each card: icon + title + short description
- Select one → next

**Step 2: İçerik**
- Title (text, max 80 chars, required)
- Short description (textarea, max 160 chars, required)
- Full description (textarea, max 2000 chars, optional)
- CTA label (text, default "Detayları Gör", max 30 chars)
- CTA URL (url, required)
- Promo code (text, optional — shown only for campaign_type=offer)
- Cover image upload (required)
- Logo override (optional — defaults to brand logo)

**Step 3: Hedef Kitle**
- Distribution mode: 3 radio cards (followers_only, followers_plus_similar, broad_discovery)
- Access mode: 3 radio cards (public_all, visible_redeemable_premium, premium_exclusive)
- City filter: multi-select (same city list as candidate profil)
- Segment filter: checkboxes displayed as (LUXURY, PREMIUM, MODA, SPORT, BEAUTY, TECH)
  **CRITICAL:** Store INTERNAL keys in DB: `luxury`, `premium`, `mid`, `sportswear`, `beauty`, `tech`
  JS mapping: `{ luxury:'LUXURY', premium:'PREMIUM', mid:'MODA', sportswear:'SPORT', beauty:'BEAUTY', tech:'TECH' }`
  These must match brands.segment values exactly.
- Seniority filter: checkboxes (Giriş Seviye=junior, Orta=mid, Kıdemli=senior, Yönetici=manager)
  Maps to deneyim_yil ranges in get_campaign_audience function.

**Step 4: Zamanlama**
- Start date (date picker, min=today)
- End date (date picker, min=start+1day, required)
- Duration preview: "Bu kampanya X gün sürecek"

**Step 5: Paket Seçimi**
- 3 package cards: Basic (feed), Boost (feed+inbox), Premium (feed+inbox+email)
- Each shows: channels included, price (TBD / placeholder for MVP)
- Select one → shows delivery channels as confirmed chips

**Step 6: Önizleme & Gönder**
- Full preview of campaign as candidate would see it
- Preview of inbox message (if boost/premium)
- Preview of email (if premium)
- Summary: type, targeting, schedule, package, estimated audience count
- "Taslak Kaydet" button (saves as draft)
- "Gönder ve Ödeme Yap" button (validates → triggers payment auth → submits)

- [ ] **Step 1:** Build wizard HTML skeleton in ik.html (6 steps with progress indicator)
- [ ] **Step 2:** Build Step 1 (campaign type selection) UI + JS
- [ ] **Step 3:** Build Step 2 (content inputs) UI + JS
- [ ] **Step 4:** Build Step 3 (targeting) UI + JS
- [ ] **Step 5:** Build Step 4 (scheduling) UI + JS
- [ ] **Step 6:** Build Step 5 (package selection) UI + JS
- [ ] **Step 7:** Build Step 6 (preview + submit) UI + JS
- [ ] **Step 8:** Implement draft save (upsert to campaigns with status='draft')
- [ ] **Step 9:** Implement submit flow (validate → set status='pending_review' + submitted_at)
- [ ] **Step 10:** Commit

### Task 2.4: Campaign Image Upload

**Files:**
- Modify: `ik-kampanya.js`

> **IMPORTANT ordering:** Cover image upload happens in wizard Step 2 (content), but the campaign
> row may not exist yet. Solution: auto-save a draft row when entering Step 2 if no campaign_id
> exists yet. This gives us a real campaign_id for the storage path.
> Alternative: use a temp path `campaign-assets/{company_id}/temp_{timestamp}_{filename}` and
> rename on draft save. But Supabase Storage has no native rename — would need copy+delete.
> **Recommended approach:** Auto-create draft on wizard Step 1 completion → use real campaign_id.

- [ ] **Step 1:** Create Supabase Storage bucket `campaign-assets` (via SQL or dashboard)
- [ ] **Step 2:** Auto-save draft on Step 1 → Step 2 transition:
  ```javascript
  // When user selects campaign type and clicks Next:
  if (!currentCampaignId) {
    var { data } = await supa.from('campaigns')
      .insert({ company_id: hrProfile.company_id, created_by: userId, campaign_type: selectedType, status: 'draft' })
      .select('id')
      .maybeSingle();
    currentCampaignId = data.id;
  }
  ```
- [ ] **Step 3:** Upload path: `campaign-assets/{company_id}/{campaign_id}/{timestamp}_{filename}`
- [ ] **Step 4:** Implement drag-drop + click-to-upload zone (same pattern as avatar upload in profil)
- [ ] **Step 5:** Client-side validation before upload:
  - Formats: jpg, png, webp only
  - Max size: 2MB
  - Recommended dimensions: 1200×628 (OG image ratio) — show warning if different
  - Min dimensions: 600×314
- [ ] **Step 6:** Show upload preview with crop/resize suggestion
- [ ] **Step 7:** Commit

### Task 2.5: Campaign Edit & Revision Flow

**Files:**
- Modify: `ik-kampanya.js`

- [ ] **Step 1:** "Düzenle" button on draft/revision_needed campaigns opens wizard pre-filled
- [ ] **Step 2:** Load campaign data → populate all wizard fields
- [ ] **Step 3:** For revision_needed: show admin feedback banner at top of wizard
- [ ] **Step 4:** "Güncelle ve Yeniden Gönder" button → status back to pending_review
- [ ] **Step 5:** Commit

---

## Phase 3 — Admin Moderation Console

**Goal:** Admin can review, approve, reject, and manage campaigns.

### Task 3.1: Review Queue

**Files:**
- Modify: `admin.html`

- [ ] **Step 1:** Build review queue panel showing campaigns with status='pending_review', ordered by submitted_at ASC (FIFO)

- [ ] **Step 2:** Each queue item card shows:
  - Company/brand name + logo
  - Campaign type badge
  - Title + short description
  - Cover image thumbnail
  - Submitted date + time
  - Moderation score badge (0=green, 1-2=yellow, 3+=red)
  - Moderation flags list (if any)

- [ ] **Step 3:** Click to open full review detail view

- [ ] **Step 4:** Commit

### Task 3.2: Campaign Review Detail

**Files:**
- Modify: `admin.html`

- [ ] **Step 1:** Full detail view with sections:

  **Header:** Company logo + name + campaign type + status pill

  **Content Preview:**
  - Title, short desc, full desc
  - Cover image (full size)
  - CTA button preview (label + URL — URL shown, clickable)
  - Promo code (if any)

  **Targeting Summary:**
  - Distribution mode + access mode
  - Cities, segments, seniority (as pills)
  - Estimated audience count (call get_campaign_audience RPC)

  **Schedule:**
  - Start date → End date (duration in days)

  **Delivery:**
  - Package name + channels list

  **Payment:**
  - Amount + currency + status + auth ID

  **Moderation:**
  - Auto-flags list with explanations
  - Score badge

  **Previews:**
  - "Aday Feed Kartı" — exactly how candidate will see it
  - "Inbox Mesajı" — inbox message preview (if boost/premium)
  - "Email" — email preview (if premium)

  **Review History:**
  - All previous campaign_reviews rows (chronological)

- [ ] **Step 2:** Admin action buttons at bottom:
  - ✅ Onayla (approve) — optional note
  - ❌ Reddet (reject) — reason required (textarea)
  - ✏️ Düzenleme İste (revision_needed) — specific feedback required (textarea)
  - ⭐ Öne Çıkar (toggle is_featured)

- [ ] **Step 3:** On approve:
  - Insert campaign_reviews row (action=approve)
  - Update campaign status=approved (or active if start_date <= now)
  - Set approved_at, published_at
  - Trigger payment capture (Phase 6) — Edge Function must verify `payment_status = 'authorized'` atomically before capturing (prevent double-capture from replay/double-click)
  - If package includes inbox: generate inbox_messages for audience via **Supabase Edge Function using service_role key** (RLS policies do not allow admin to INSERT into inbox_messages for arbitrary candidates — service_role bypasses RLS)
  - If package includes email: generate email_jobs for audience via **same Edge Function with service_role** (queued, not sent until Phase 7)

- [ ] **Step 4:** On reject:
  - Insert campaign_reviews row (action=reject, note required)
  - Update campaign status=rejected
  - Trigger payment release (Phase 6)

- [ ] **Step 5:** On revision_needed:
  - Insert campaign_reviews row (action=revision_needed, note required)
  - Update campaign status=revision_needed
  - Payment auth stays (or re-auth if expired)

- [ ] **Step 6:** Commit

### Task 3.3: All Campaigns View

**Files:**
- Modify: `admin.html`

- [ ] **Step 1:** Table/grid of all campaigns with filters:
  - Status filter (all, active, pending_review, etc.)
  - Company filter (search)
  - Date range filter
  - Sort by: submitted_at, created_at, end_date

- [ ] **Step 2:** Bulk actions: pause, archive

- [ ] **Step 3:** Commit

### Task 3.4: Campaign Pause / End / Archive

**Files:**
- Modify: `admin.html`

- [ ] **Step 1:** Active campaigns: "Duraklat" button → status=paused
- [ ] **Step 2:** Paused campaigns: "Devam Ettir" button → status=active
- [ ] **Step 3:** Ended campaigns auto-transition: cron check or on-access check
- [ ] **Step 4:** Archive button on ended campaigns
- [ ] **Step 5:** Commit

---

## Phase 4 — Candidate Feed Panel

**Goal:** Candidates see curated campaign feed in profil.html.

### Task 4.1: Add Sidebar Nav + Panel Shell

**Files:**
- Modify: `profil.html` (sidebar + bottom nav + panel HTML)
- Modify: `profil.css` (panel styles)
- Modify: `profil-ui.js` (switchPanel hook)

- [ ] **Step 1:** Add sidebar nav item BETWEEN "Markalar" and "Ayarlar":
  ```html
  <button class="nav-item" id="nav-teklifler" data-panel="teklifler">
    <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span>
    Özel Teklifler
  </button>
  ```

- [ ] **Step 2:** Add bottom nav item for mobile (between Profil and Ayarlar)

- [ ] **Step 3:** Add panel shell:
  ```html
  <!-- ═══ PANEL: ÖZEL TEKLİFLER ═══ -->
  <main class="panel" id="panel-teklifler" data-panel="teklifler">
    <div class="teklifler-header">
      <h2 class="teklifler-title">Sana Özel Marka Teklifleri</h2>
      <p class="teklifler-subtitle">Çalışmak istediğin markalardan kampanyalar, employee experience içerikleri ve özel avantajlar.</p>
    </div>
    <div class="teklifler-filters" id="teklifler-filters"></div>
    <div class="teklifler-grid" id="teklifler-grid"></div>
    <div class="teklifler-empty" id="teklifler-empty" style="display:none;">
      <p>Şu an aktif teklif bulunmuyor. Yeni teklifler geldiğinde burada göreceksin.</p>
    </div>
  </main>
  ```

- [ ] **Step 4:** Update switchPanel in profil-ui.js to handle 'teklifler':
  ```javascript
  if (name === 'teklifler') { window._htLoadTeklifler && window._htLoadTeklifler(); }
  ```

- [ ] **Step 5:** Update breadcrumb labels map in profil.html (line ~1466):
  ```javascript
  // Find the labels object in switchPanel and add:
  var labels = { genel: 'Genel Bakış', merkez: 'Profil Merkezi', sirketler: 'Markalar', teklifler: 'Özel Teklifler', inbox: 'Mesajlar', ayarlar: 'Ayarlar', profil: 'Profil' };
  ```

- [ ] **Step 6:** Commit

### Task 4.2: Rename Bento Card

**Files:**
- Modify: `profil.html` (bento card at lines 375-385)

- [ ] **Step 1:** Replace the locked "Fırsatlar" bento card:
  ```html
  <!-- 6. Özel Teklifler -->
  <div class="bento-card active" onclick="switchPanel('teklifler')" id="bento-teklifler">
    <div class="bento-content">
      <div class="bento-icon green">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" fill="currentColor" opacity="0.15"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
      </div>
      <div class="bento-title">Özel Teklifler</div>
      <div class="bento-desc" id="bento-teklifler-count">Marka kampanyaları ve avantajlar</div>
    </div>
  </div>
  ```
  - Remove `locked` class
  - Remove `bento-badge-soon` YAKINDA badge
  - Add onclick → switchPanel('teklifler')
  - Add dynamic count in bento-desc

- [ ] **Step 2:** Update bento card count on page load:
  ```javascript
  // In profil-ui.js, after loading campaigns count
  var countEl = document.getElementById('bento-teklifler-count');
  if (countEl && activeCampaignCount > 0) {
    countEl.textContent = activeCampaignCount + ' aktif teklif';
  }
  ```

- [ ] **Step 3:** Commit

### Task 4.3: Campaign Feed Logic

**Files:**
- Create: `profil-teklifler.js`
- Modify: `profil.html` (add script tag)

- [ ] **Step 1:** Create `profil-teklifler.js` with IIFE:
  ```javascript
  (function(){
    'use strict';
    // IMPORTANT: Supabase client in profil scope is exposed as window._htSupa
    // (defined in profil-core.js). Use this variable for all queries.
    // Do NOT use _supa — that variable does not exist in profil context.

    window._htLoadTeklifler = async function() {
      var supa = window._htSupa;
      if (!supa) { console.error('Supabase client not initialized'); return; }
      // Load active campaigns visible to this candidate
      // Filter by access_mode (premium_exclusive only if is_premium)
      // Filter by blocked companies
      // Sort: is_featured DESC, created_at DESC
    };
  })();
  ```

- [ ] **Step 2:** Campaign query (verify Supabase client variable name in profil-core.js before implementing):
  ```javascript
  var supa = window._htSupa;
  var { data: campaigns } = await supa
    .from('campaigns')
    .select('*, brands(name, logo_url, segment), companies(name)')
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });
  ```
  Note: RLS handles visibility. Client-side filter for blocked companies as extra safety.
  Note: In ik.html, the Supabase client variable may be different (check ik.html script section). Use whatever variable is already defined there.

- [ ] **Step 3:** Render campaign cards (editorial premium design):

  **Card layout:**
  ```
  ┌─────────────────────────────────┐
  │  [Cover Image — 16:9 ratio]     │
  │                                  │
  ├─────────────────────────────────┤
  │  [Brand Logo] Brand Name         │
  │  [Type Badge]  [Segment Pill]    │
  │                                  │
  │  Campaign Title (Bricolage, 17px)│
  │  Short description (Jakarta, 13) │
  │                                  │
  │  [CTA Button]    [Tarih Aralığı] │
  └─────────────────────────────────┘
  ```

  - Cover image with lazy loading
  - Brand logo (40px) + name
  - Type badge color: offer=green, employer_branding=navy, hiring_boost=vermillion
  - Premium-only perks show 🔒 icon for non-premium candidates
  - is_featured campaigns get subtle gold border + "Öne Çıkan" label
  - Card hover: subtle lift + shadow (same as bento cards)

- [ ] **Step 4:** Filter bar:
  - "Tümü" | "Teklifler" | "İşveren Markası" | "İşe Alım" (type filter pills)
  - Optional: "Takip Ettiklerim" toggle

- [ ] **Step 5:** Empty state when no campaigns match

- [ ] **Step 6:** Commit

### Task 4.4: Impression & Click Tracking

**Files:**
- Modify: `profil-teklifler.js`

- [ ] **Step 1:** Track impressions when card enters viewport (IntersectionObserver):
  ```javascript
  // Use the same supa variable captured at IIFE top: var supa = window._htSupa || supabase;
  // One impression per campaign per candidate per type
  await supa.from('campaign_impressions')
    .upsert({ campaign_id: cid, candidate_id: myId, impression_type: 'feed' },
            { onConflict: 'campaign_id,candidate_id,impression_type' });
  ```

- [ ] **Step 2:** Track clicks when CTA button clicked:
  ```javascript
  await supa.from('campaign_clicks')
    .insert({ campaign_id: cid, candidate_id: myId, click_type: 'cta' });
  ```

- [ ] **Step 3:** Track redemptions for offer campaigns with promo code:
  - Show promo code reveal button
  - On reveal: insert redemption + copy code to clipboard
  - Premium-gated redemptions: check is_premium before revealing

- [ ] **Step 4:** Commit

### Task 4.5: Campaign Detail Modal/Drawer

**Files:**
- Modify: `profil-teklifler.js`
- Modify: `profil.html` (detail drawer HTML)
- Modify: `profil.css` (drawer styles)

- [ ] **Step 1:** Click campaign card → open detail drawer (same pattern as profil preview drawer):
  - Full cover image
  - Brand identity (logo + name + segment)
  - Full description (rendered markdown/text)
  - CTA button (prominent)
  - Promo code section (if offer type, with reveal + copy)
  - Campaign dates
  - Related campaigns from same brand (optional, nice-to-have)

- [ ] **Step 2:** Drawer close button + click-outside-to-close

- [ ] **Step 3:** Commit

---

## Phase 5 — Unified Inbox

**Goal:** Build a single inbox for campaign messages, system notifications, and future employer DMs.

### Task 5.1: Inbox Panel in profil.html

**Files:**
- Modify: `profil.html` (sidebar + panel)
- Modify: `profil.css`
- Create: `profil-inbox.js`

- [ ] **Step 1:** Add sidebar nav item (between Özel Teklifler and Ayarlar):
  ```html
  <button class="nav-item" id="nav-inbox" data-panel="inbox">
    <span class="nav-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
    Mesajlar
    <span class="nav-badge" id="badge-inbox-unread" style="display:none;">0</span>
  </button>
  ```

- [ ] **Step 2:** Add panel:
  ```html
  <!-- ═══ PANEL: MESAJLAR (Unified Inbox) ═══ -->
  <main class="panel" id="panel-inbox" data-panel="inbox">
    <div class="inbox-header">
      <h2>Mesajlar</h2>
      <div class="inbox-tabs">
        <button class="inbox-tab active" data-filter="all">Tümü</button>
        <button class="inbox-tab" data-filter="campaign">Kampanyalar</button>
        <button class="inbox-tab" data-filter="system">Bildirimler</button>
        <button class="inbox-tab" data-filter="employer_dm">İşveren Mesajları</button>
      </div>
    </div>
    <div class="inbox-list" id="inbox-list"></div>
    <div class="inbox-empty" id="inbox-empty" style="display:none;">
      <p>Henüz mesajın yok.</p>
    </div>
  </main>
  ```

- [ ] **Step 3:** Create `profil-inbox.js`:
  ```javascript
  (function(){
    'use strict';
    // Capture Supabase client — verify variable name in profil-core.js before using
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);

    window._htLoadInbox = async function(filter) {
      if (!supa) { console.error('Supabase client not initialized'); return; }
      var query = supa.from('inbox_messages')
        .select('*, companies(name), brands(name, logo_url)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (filter && filter !== 'all') {
        query = query.eq('message_type', filter);
      }
      // ... render messages
    };
  })();
  ```

- [ ] **Step 4:** Inbox message card design:
  ```
  ┌─────────────────────────────────────────┐
  │ [Logo] Brand Name          2 saat önce  │
  │ [●] Message Title (bold if unread)       │
  │ Body preview (1 line, truncated)...      │
  │ [CTA Button if exists]                   │
  └─────────────────────────────────────────┘
  ```
  - Unread: left border vermillion + bold title + blue dot
  - Read: normal styling
  - Click: mark as read + open detail

- [ ] **Step 5:** Unread badge on sidebar (loaded on page init):
  ```javascript
  var { count } = await supa
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'read');
  ```

- [ ] **Step 6:** Mark as read on open:
  ```javascript
  await supa.from('inbox_messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', messageId);
  ```

- [ ] **Step 7:** Update candidates.unread_inbox_count via DB trigger (defined in Phase 0 migration):
  The trigger `update_unread_inbox_count` fires AFTER INSERT/UPDATE on inbox_messages and keeps the denormalized counter in sync. Client does NOT manage this counter.

- [ ] **Step 8:** Commit

### Task 5.2: Bottom Nav Update

**Files:**
- Modify: `profil.html`

- [ ] **Step 1:** Mobile bottom nav now has 4 items max. Decision:
  - Dashboard | Profil | Mesajlar (with badge) | Ayarlar
  - "Markalar" and "Özel Teklifler" accessible via sidebar only on mobile
  - OR: Dashboard | Teklifler | Mesajlar | Profil (Ayarlar via sidebar)

> **DECIDED:** Mobile bottom nav = Dashboard | Teklifler | Mesajlar | Profil
> Rationale: Proje ileride mobile app'e dönüşecek. Teklifler gelir modeli olduğu için bottom nav'da olmalı.
> Mesajlar engagement için kritik. Profil her zaman erişilebilir olmalı. Ayarlar + Markalar sidebar'dan erişilir.
> (Owner confirmed 2026-03-16)

- [ ] **Step 2:** Commit

---

## Phase 6 — Payment Integration

**Goal:** iyzico authorize→capture flow with provider abstraction.

### Task 6.1: Payment Module Design

**Files:**
- Create: Supabase Edge Function `functions/payment-authorize/index.ts`
- Create: Supabase Edge Function `functions/payment-capture/index.ts`
- Create: Supabase Edge Function `functions/payment-release/index.ts`

> **Why Edge Functions?** iyzico API key must NEVER be exposed to client. Edge Functions run server-side in Supabase, have access to service_role key, and can securely call iyzico.

- [ ] **Step 1:** Create payment provider abstraction:
  ```typescript
  // Shared interface
  interface PaymentProvider {
    authorize(params: AuthorizeParams): Promise<AuthResult>;
    capture(authId: string): Promise<CaptureResult>;
    release(authId: string): Promise<ReleaseResult>;
    refund(captureId: string, amount?: number): Promise<RefundResult>;
  }

  // iyzico implementation
  class IyzicoProvider implements PaymentProvider { ... }
  ```

- [ ] **Step 2:** Authorize flow (called from employer wizard submit):
  - Client calls Edge Function with campaign_id
  - Edge Function verifies employer owns campaign
  - Edge Function calls iyzico PreAuth
  - On success: updates campaign payment_status='authorized', payment_auth_id
  - Returns result to client

- [ ] **Step 3:** Capture flow (called from admin approve):
  - Admin approve triggers Edge Function
  - Edge Function calls iyzico PostAuth (capture)
  - On success: updates payment_status='captured', payment_capture_id

- [ ] **Step 4:** Release flow (called from admin reject):
  - Admin reject triggers Edge Function
  - Edge Function calls iyzico Cancel
  - On success: updates payment_status='released'

- [ ] **Step 5:** Commit

### Task 6.2: MVP Payment Simulation Mode

For development/testing before iyzico is fully set up:

- [ ] **Step 1:** Add `PAYMENT_MODE` env var: 'live' | 'simulation'
- [ ] **Step 2:** In simulation mode: authorize/capture/release always succeed, no real API call
- [ ] **Step 3:** Payment status still transitions correctly in DB
- [ ] **Step 4:** Commit

### Task 6.3: iyzico Integration

- [ ] **Step 1:** Create iyzico sandbox account
- [ ] **Step 2:** Store iyzico API key + secret in Supabase Vault (or Edge Function env)
- [ ] **Step 3:** Implement real iyzico PreAuth / PostAuth / Cancel calls
- [ ] **Step 4:** Test full authorize → capture cycle
- [ ] **Step 5:** Test authorize → release cycle
- [ ] **Step 6:** Commit

---

## Phase 7 — Email Delivery + Analytics

**Goal:** Send campaign emails and track analytics.

### Task 7.1: Email Service Setup

- [ ] **Step 1:** Choose email provider: Resend recommended (simple API, good deliverability, noreply@ custom domain)
- [ ] **Step 2:** Configure DNS: noreply@hellotalent.ai (SPF, DKIM, DMARC)
- [ ] **Step 3:** Create Supabase Edge Function `functions/send-campaign-email/index.ts`

### Task 7.2: Email Template

- [ ] **Step 1:** Design HTML email template:
  - hellotalent.ai header (logo, vermillion accent)
  - Cover image
  - Brand logo + name
  - Campaign title + description
  - CTA button (vermillion)
  - Footer: unsubscribe link + hellotalent.ai branding
  - Responsive (mobile-first)

- [ ] **Step 2:** Template variables: {brand_name}, {title}, {description}, {cta_label}, {cta_url}, {cover_image}, {unsubscribe_url}

### Task 7.3: Email Send Queue Processing

- [ ] **Step 1:** Edge Function that processes email_jobs where status='queued'
- [ ] **Step 2:** Batch processing (50 per invocation)
- [ ] **Step 3:** Update status to 'sent' on success, 'failed' on error
- [ ] **Step 4:** Cron: Supabase pg_cron or external trigger every 5 minutes

### Task 7.4: Analytics Dashboard (Employer Side)

- [ ] **Step 1:** Add analytics panel to employer campaign detail view in ik.html:
  - Impressions (feed + inbox + email)
  - Clicks
  - Redemptions (for offer type)
  - Click-through rate
  - Timeline chart (daily, simple bar chart with CSS)

- [ ] **Step 2:** Commit

### Task 7.5: Analytics Dashboard (Admin Side)

- [ ] **Step 1:** Admin sees aggregate stats:
  - Total active campaigns
  - Total impressions this week
  - Top performing campaigns
  - Revenue total (captured payments)
  - Campaigns pending review count

- [ ] **Step 2:** Commit

---

## Validation & Moderation Rules

### Client-Side Validation (Employer Wizard)

| Field | Rule | Error Message (TR) |
|-------|------|-------------------|
| title | Required, 5-80 chars | "Başlık 5-80 karakter olmalı" |
| short_desc | Required, 10-160 chars | "Kısa açıklama 10-160 karakter olmalı" |
| full_desc | Optional, max 2000 chars | "Açıklama en fazla 2000 karakter olabilir" |
| cta_label | Required, 3-30 chars | "Buton metni 3-30 karakter olmalı" |
| cta_url | Required, valid URL, https only | "Geçerli bir HTTPS bağlantısı girin" |
| promo_code | Optional, 3-30 chars, alphanumeric + dash | "Promosyon kodu geçersiz" |
| cover_image | Required for submit (not draft) | "Kapak görseli zorunludur" |
| end_date | Required, must be > start_date, must be > now | "Bitiş tarihi gelecekte olmalı" |
| end_date | Max 90 days from start | "Kampanya en fazla 90 gün sürebilir" |

### Server-Side Moderation (Auto-Flags)

| Flag | Detection | Score |
|------|-----------|-------|
| `keyword_flag` | Title/description contains blacklisted words | +2 |
| `url_mismatch` | CTA URL domain doesn't match company website | +1 |
| `external_url` | CTA URL goes to non-brand external site | +1 |
| `missing_brand_logo` | No logo provided and brand has no default | +1 |
| `long_promo_code` | Promo code > 20 chars (suspicious) | +1 |
| `short_campaign` | Duration < 3 days | +1 |
| `very_long_campaign` | Duration > 60 days | +1 |
| `broad_no_targeting` | broad_discovery + no city/segment filters | +1 |

**Keyword blacklist (MVP starter):**
Turkish + English inappropriate/misleading words. Maintained in DB or config.

**Scoring:** 0 = auto-green, 1-2 = yellow (review with attention), 3+ = red (high risk flag)

**Important:** Flags do NOT auto-block. They are advisory for admin. Admin always has final say.

---

## Asset Upload Standards

### Campaign Cover Image

| Attribute | Requirement |
|-----------|------------|
| Formats | JPG, PNG, WebP |
| Max file size | 2 MB |
| Recommended dimensions | 1200 × 628 px (1.91:1 — OG image ratio) |
| Min dimensions | 600 × 314 px |
| Orientation | Landscape only |
| Storage path | `campaign-assets/{company_id}/{campaign_id}/cover_{timestamp}.{ext}` |

### Campaign Logo Override

| Attribute | Requirement |
|-----------|------------|
| Formats | PNG (transparent preferred), JPG, WebP |
| Max file size | 500 KB |
| Recommended dimensions | 200 × 200 px (square) |
| Min dimensions | 100 × 100 px |
| Storage path | `campaign-assets/{company_id}/{campaign_id}/logo_{timestamp}.{ext}` |

---

## Audience Targeting Logic

### How targeting resolves per distribution_mode:

**followers_only:**
```sql
SELECT c.id FROM candidates c
JOIN candidate_brand_follows cbf ON cbf.candidate_id = c.id
WHERE cbf.brand_id = campaign.brand_id
  AND c.is_active = true
  AND c.profile_completed = true
  -- plus city/segment/seniority filters if set
```

**followers_plus_similar:**
```
followers UNION similar_audience
similar_audience = candidates who:
  - follow brands in same segment as campaign brand
  - OR are in same target cities
  - OR match target seniority
  - AND are NOT already followers
```

**broad_discovery:**
```
All active candidates matching:
  - target_cities (if set, otherwise all)
  - target_segments (if set, otherwise all)
  - target_seniority (if set, otherwise all)
  - NOT blocked the campaign company
```

### Access mode interaction:
- `premium_exclusive` further filters to `is_premium = true`
- `visible_redeemable_premium` shows to all, but redemption checks `is_premium`
- `public_all` no additional filter

---

## Open Decisions for Future

These are deliberately NOT in MVP but the schema supports them:

| Decision | Current State | Future |
|----------|--------------|--------|
| Premium candidate pricing | is_premium column exists, always false | Payment flow for candidates |
| Real email sending | email_jobs queued but not sent | Phase 7 activates sending |
| Employer DM | inbox_messages supports message_type='employer_dm' | Phase 5+ DM feature |
| iyzico live keys | Simulation mode | Real keys after business setup |
| AI moderation | Not included | Future: image + text AI review |
| Campaign A/B testing | Not included | Future: variant support |
| Real-time feed updates | Manual refresh / on-panel-switch | Future: Supabase realtime |
| Audience estimation | Basic count query | Future: ML-based reach prediction |
| Multi-brand campaigns | brand_id nullable | Future: campaign targets multiple brands |
| Campaign templates | Not included | Future: reusable employer templates |

---

## Implementation Order Summary

```
Phase 0: DB Foundation           → ~1 session
Phase 1: Admin Surface + Auth    → ~1 session
Phase 2: Employer Campaign Wizard → ~2-3 sessions
Phase 3: Admin Moderation Console → ~1-2 sessions
Phase 4: Candidate Feed Panel    → ~1-2 sessions
Phase 5: Unified Inbox           → ~1-2 sessions
Phase 6: Payment Integration     → ~1-2 sessions
Phase 7: Email + Analytics       → ~1-2 sessions
```

**Total estimated: 9-14 sessions**

Each phase is independently deployable. Phase 0 must be first. After that, Phase 1-2-3 can be done in order (employer creates → admin reviews → candidate sees). Phase 5-6-7 build on top.

**Minimum Viable Loop (first working E2E):**
Phase 0 → Phase 2 → Phase 3 → Phase 4 = employer creates campaign → admin approves → candidate sees it in feed.

Payment (Phase 6) and email (Phase 7) can be added after the core loop works.
