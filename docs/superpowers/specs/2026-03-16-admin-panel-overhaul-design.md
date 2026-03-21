# Admin Panel Overhaul — Design Spec

> **For agentic workers:** Use superpowers:writing-plans to create implementation plan from this spec.

**Goal:** Transform admin.html from campaign-only moderation into a full platform management dashboard with Candidates, Employers, Sales (Power BI level), and Team Management panels.

**Architecture:** Modular JS pattern (proven in profil.html). admin.html stays as shell (sidebar + auth + panel HTML). Each section gets its own JS file as IIFE. Lazy-loaded on panel switch.

**Decision Date:** 2026-03-16 (Owner confirmed)

---

## 1. Architecture Decision

**Chosen: Option B — Modular JS Files**

```
admin.html          → shell (sidebar, auth, panel HTML containers)
admin-campaigns.js  → extracted from current inline JS
admin-candidates.js → candidate analytics dashboard
admin-employers.js  → employer analytics dashboard
admin-sales.js      → sales KPI dashboard (4 tabs)
admin-team.js       → team management + role-based access
```

Each JS file follows IIFE pattern with `var` (Safari safety). Functions exposed via `window._htAdmin*` namespace. Panels lazy-loaded on first sidebar click.

---

## 2. Sidebar Navigation Structure

```
📊 Dashboard          (overview — 4 stat cards)
── Moderasyon ──
   ▸ Kampanya İncele   (existing — pending review)
   ▸ Tüm Kampanyalar   (existing — all campaigns)
── Yönetim ──
   ▸ Adaylar           (NEW)
   ▸ İşverenler        (NEW)
── Gelir ──
   ▸ Satışlar          (NEW — 4 tabs)
── Sistem ──
   ▸ Ekip Yönetimi     (NEW)
   ▸ Ayarlar           (existing placeholder)
```

Role-based sidebar filtering: each nav item has `data-role-min` attribute. JS checks `adminUser.role` against `ROLE_PANELS` map and hides unauthorized items.

**Sprint A placeholder:** Panels not yet implemented (Satışlar, Ekip) show a "Yakında — Bu bölüm bir sonraki güncellemede aktif olacak" placeholder instead of blank content. This prevents broken UX during incremental deployment.

---

## 3. Panel Designs

### 3.1 Dashboard (Overview)

4 headline stat cards:
- Toplam Aday (candidates COUNT)
- Toplam İşveren (hr_profiles COUNT)
- Aktif Kampanya (campaigns WHERE status='active' COUNT)
- Onay Bekleyen (campaigns WHERE status='pending_review' COUNT)

All read-only SQL COUNT queries. No new tables.

### 3.2 Adaylar Panel

**Data source:** `candidates` table (existing columns only)

**Note:** `account_status` enum and `frozen_at`/`deletion_requested_at` columns were applied to live DB via SQL Editor (P2 #9) but have no committed migration file. These columns exist in production and are safe to query.

Stat cards (3 rows):

Row 1 (headline):
- Toplam Kayıtlı: COUNT(*)
- Profil Tamamlamış: COUNT WHERE profile_completed=true + percentage
- Aktif İş Arıyor: COUNT WHERE is_active=true

Row 2 (status breakdown):
- Beni Öner ✅: COUNT WHERE is_active=true
- Beni Önerme ❌: COUNT WHERE is_active=false AND profile_completed=true
- İşverenden Gizli 🙈: COUNT WHERE hide_from_current_employer=true
- Premium ⭐: COUNT WHERE is_premium=true

Row 3 (lifecycle):
- Dondurulmuş 🧊: COUNT WHERE account_status='frozen'
- Silme Bekleyen 🗑️: COUNT WHERE account_status='pending_deletion'
- Son 7 Gün Kayıt: COUNT WHERE created_at > now() - interval '7 days'

**No new tables or columns needed.**

### 3.3 İşverenler Panel

**Data source:** `hr_profiles` + `companies` + `campaigns` + `subscriptions` tables

Stat cards:

Row 1:
- Toplam İşveren: COUNT hr_profiles
- Şirket Kaydı Tamamlamış: COUNT WHERE company_id IS NOT NULL
- Onboarding Bekleyen: COUNT WHERE company_id IS NULL (not sirket — company_id is the authoritative link)

Row 2:
- Aktif Kampanyası Var: COUNT DISTINCT created_by FROM campaigns WHERE status IN ('active','approved','pending_review')
- Freemium: total - premium count (no is_premium column on hr_profiles; derive from subscriptions table)
- Premium ⭐: COUNT subscriptions WHERE user_type='employer' AND status='active'

**Important:** `hr_profiles` has NO `is_premium` column. Employer premium status is derived from `subscriptions` table via JOIN: `SELECT COUNT(*) FROM subscriptions WHERE user_type='employer' AND status='active'`. Freemium count = total hr_profiles - active employer subscriptions.

Table: Son Kaydolanlar (last 10 hr_profiles ordered by created_at DESC)

### 3.4 Satışlar Panel (4 Tabs)

#### MRR Calculation Rule (applies to ALL tabs)

**Critical:** Annual plans must be normalized to monthly for MRR:
```sql
SUM(CASE
  WHEN plan = 'monthly' THEN amount
  WHEN plan = 'annual' THEN amount / 12.0
END) WHERE status = 'active'
```
ARR = MRR × 12. This normalization applies everywhere MRR/ARR appears: Total Sales, Aday tab, İşveren tab, ARPU, revenue churn, NRR.

#### NRR (Net Revenue Retention) — Simplified Formula

NRR is approximated as:
```
NRR = (current month active MRR from users who were active last month) / (last month total MRR) × 100
```
This is a basic retained-MRR ratio. It does not separately track expansion/contraction (no plan upgrade tracking in MVP schema). This is a known simplification — accurate enough for early-stage metrics. Full cohort tracking requires a `previous_subscription_id` FK which is deferred to post-MVP.

#### Tab 1: Total Sales (Power BI Level)

**Dönem Seçici:** Bu Ay | Bu Çeyrek | Bu Yıl | Tüm Zamanlar
- JS filters all queries with date range
- Default: Bu Ay

**10 sections:**

1. **Headline Revenue** (4 gradient cards)
   - Platform MRR: normalized SUM from active subscriptions + campaigns monthly equivalent
   - Platform ARR: MRR × 12
   - Kümülatif Toplam: SUM all captured payments (subscriptions + campaigns)
   - Bu Ay Gelir: filtered by selected period + MoM %

2. **Gelir Kaynakları Dağılımı** (3 source cards with progress bars)
   - Kampanya geliri: SUM campaigns.payment_amount WHERE payment_status='captured'
   - Aday premium geliri: SUM subscriptions WHERE user_type='candidate' (normalized)
   - İşveren premium geliri: SUM subscriptions WHERE user_type='employer' (normalized)
   - Each shows: total, MRR contribution, percentage of platform

3. **Aylık Karşılaştırma (MoM)** — table: 2 ay önce | geçen ay | bu ay | değişim %
   - Metrics: MRR, yeni satış, churn, ücretli kullanıcı, NRR

4. **Çeyreklik Karşılaştırma (QoQ)** — table: Q-2 | Q-1 | current Q | QoQ %
   - Metrics: çeyrek geliri, yeni müşteri, churn rate, kampanya satışı

5. **Büyüme Analizi** (4 cards)
   - MRR büyüme MoM %, ARR büyüme YoY %, müşteri büyüme MoM %, ARPU (normalized MRR / active users)

6. **Platform Sağlık & Risk** (4 cards)
   - Churn rate (monthly), revenue churn (₺ lost normalized MRR), NRR %, churn risk pool (auto_renew=false count)

7. **Dönüşüm Hunisi** (2 side-by-side funnel visuals)
   - Aday: kayıtlı → profil tam → aktif → premium (with % at each step)
   - İşveren: kayıtlı → onboarded (company_id != NULL) → premium → kampanyalı

8. **Yaşam Boyu Değer** (4 cards)
   - Aday LTV, İşveren LTV, ort. aday abone süresi, ort. işveren abone süresi

9. **Yaklaşan Bitiş Alerts** (3 cards — red/amber/green)
   - 7 gün içinde bitiyor (🔴), 30 gün içinde bitiyor (🟠), yenileme oranı son 30 gün

10. **Yıllık Karşılaştırma (YoY)** — table
    - Metrics: toplam gelir, ücretli kullanıcı, kampanya satışı, ARPU

#### Tab 2: Kampanya Gelirleri

- Toplam kampanya geliri, bu ay, ort. kampanya değeri
- Toplam ücretli, bu ay yeni, tekrar satın alan (COUNT DISTINCT created_by having >1 campaign with payment_status='captured'), ödeme bekleyen (authorized)
- Paket dağılımı: Basic / Boost / Premium counts
- Engagement: gösterim, tıklama, CTR, promo kullanım

**Note:** "Tekrar alan" = employers with 2+ paid campaigns, NOT relaunch_count (which only tracks relaunches from same parent). This measures repeat customers accurately.

**Data sources:** `campaigns`, `campaign_impressions`, `campaign_clicks`, `campaign_redemptions`

#### Tab 3: Aday Abonelikleri

- MRR (normalized), ARR, kümülatif gelir
- Aktif premium, aylık plan, yıllık plan, freemium (+ conversion %)
- Lifecycle: yeni premium, yenilenmiş, churn, geri kazanım (bu ay)
- Retention: oto-yenileme açık/kapalı, 7 gün bitiyor
- Business: ort. süre, LTV, NRR (simplified)

**Data source:** `subscriptions` WHERE user_type='candidate'

#### Tab 4: İşveren Abonelikleri

Same structure as Tab 3 but filtered for user_type='employer'. İşveren plans are annual-focused (₺9,000/yıl).

---

## 4. Team Management (KISS)

### 4.1 Role System

**No new tables.** Extend existing `admin_users.role` column to accept 4 values:

```
superadmin        → all panels
marketing         → dashboard + campaigns
sales_candidates  → dashboard + candidates + sales
sales_employers   → dashboard + employers + sales
```

### 4.2 Role → Panel Access Map (hardcoded in JS)

```javascript
var ROLE_PANELS = {
  superadmin:       ['dashboard','campaigns','all-campaigns','candidates','employers','sales','team','settings'],
  marketing:        ['dashboard','campaigns','all-campaigns'],
  sales_candidates: ['dashboard','candidates','sales'],
  sales_employers:  ['dashboard','employers','sales']
};
```

On admin load: read `adminUser.role`, filter sidebar nav items by checking `ROLE_PANELS[role].includes(panelName)`. Hide unauthorized panels.

**Known limitation:** Role enforcement is client-side only. All admin users (any role) can query all admin-accessible data via Supabase JS console because `is_admin()` does not check role. The existing `is_admin_role(required_role)` function could enforce per-role RLS in the future, but for MVP with a small trusted team, client-side panel hiding is sufficient. This is an acceptable trade-off for KISS.

### 4.3 Team Management UI

- List all admin_users: name, email, role (badge), created_at
- Superadmin can: invite new member (create auth user + admin_users row), change role, remove member
- Invite flow: email + role selection → Supabase auth.admin.createUser() or manual seed
- Non-superadmins cannot see Ekip Yönetimi panel

### 4.4 DB Changes

```sql
-- Update admin_users role check constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('superadmin', 'marketing', 'sales_candidates', 'sales_employers'));
```

No new tables. KISS.

---

## 5. Database: subscriptions Table

Single new table for both candidate and employer premium tracking:

```sql
CREATE TABLE subscriptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id),
  user_type       text NOT NULL CHECK (user_type IN ('candidate', 'employer')),
  plan            text NOT NULL CHECK (plan IN ('monthly', 'annual')),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  auto_renew      boolean NOT NULL DEFAULT true,
  amount          integer NOT NULL,
  currency        text NOT NULL DEFAULT 'TRY',
  started_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  renewed_at      timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Updated_at trigger (reuse existing function or create)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_admin_all ON subscriptions FOR ALL USING (is_admin());
CREATE POLICY subscriptions_user_read ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, user_type);
CREATE INDEX idx_subscriptions_status ON subscriptions(status, expires_at);
CREATE INDEX idx_subscriptions_type_status ON subscriptions(user_type, status);
```

Each subscription period = new row. Renewal = new row with renewed_at set. Churn = status='expired' or 'cancelled'. Re-acquisition = new 'active' row after a 'cancelled' row.

---

## 6. Missing Fix: is_employer() Function

```sql
CREATE OR REPLACE FUNCTION is_employer()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
```

Includes `SET search_path = public` for security (prevents search path injection on SECURITY DEFINER functions). This fixes the broken `cbf_employer_read` RLS policy on candidate_brand_follows.

---

## 7. Sprint Sequencing

### Sprint A (Immediate): Admin Shell + Candidates + Employers + Campaign Polish
- Refactor admin.html sidebar (new nav structure)
- Extract campaigns JS to admin-campaigns.js
- Build admin-candidates.js (read-only SQL COUNTs)
- Build admin-employers.js (read-only SQL COUNTs — employer premium via subscriptions JOIN)
- Dashboard overview panel
- Fix is_employer() function
- Add "Yakında" placeholder for unimplemented panels (Satışlar, Ekip)
- **DB changes:** is_employer() function only. Zero new tables.

### Sprint B: Sales Dashboard
- Create subscriptions table (migration 017)
- Build admin-sales.js with 4 tabs
- Total Sales Power BI dashboard (10 sections)
- Campaign revenue tab
- Candidate subscriptions tab
- Employer subscriptions tab
- Period selector (Bu Ay / Çeyrek / Yıl / Tüm Zamanlar)
- **Note:** Sprint A İşverenler premium count will show 0 until subscriptions table exists. This is acceptable — "premium = 0, freemium = all" is accurate before subscriptions launch.

### Sprint C: Team Management
- Extend admin_users.role constraint (migration 018)
- Build admin-team.js
- Role-based sidebar filtering
- Team list + invite + role change + remove
- Panel access enforcement
- Replace "Yakında" placeholder on Ekip panel with real content

---

## 8. File Impact Summary

| File | Action | Description |
|------|--------|-------------|
| admin.html | MODIFY | New sidebar, panel HTML shells, script tags, auth refactor |
| admin-campaigns.js | CREATE | Extract existing campaign code from admin.html inline |
| admin-candidates.js | CREATE | Candidate analytics dashboard |
| admin-employers.js | CREATE | Employer analytics dashboard |
| admin-sales.js | CREATE | Sales KPI dashboard (4 tabs, Power BI level) |
| admin-team.js | CREATE | Team management + role enforcement |
| docs/migrations/017_subscriptions.sql | CREATE | subscriptions table + RLS + updated_at trigger |
| docs/migrations/018_admin_roles.sql | CREATE | admin_users role constraint update |
| docs/migrations/019_is_employer_fix.sql | CREATE | is_employer() function with SET search_path |

---

## 9. Review Log

### Review #1 (2026-03-16, automated spec review)
10 issues found, all resolved in this revision:

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Missing updated_at on subscriptions | Added column + trigger to section 5 |
| 2 | MRR miscalculation for annual plans | Added normalization rule (amount/12) in section 3.4 |
| 3 | NRR undefined and incomputable | Added simplified formula + known limitation note |
| 4 | Role access client-side only | Acknowledged as known limitation in section 4.2 |
| 5 | is_employer() missing SET search_path | Fixed in section 6 |
| 6 | hr_profiles.is_premium does not exist | Fixed section 3.3 to use subscriptions JOIN |
| 7 | Wrong column for employer onboarding | Fixed to use company_id IS NULL consistently |
| 8 | account_status no committed migration | Added note in section 3.2 |
| 9 | Unimplemented panels visible without fallback | Added "Yakında" placeholder requirement |
| 10 | relaunch_count misleading for repeat buyers | Fixed to COUNT DISTINCT created_by with >1 paid campaign |
