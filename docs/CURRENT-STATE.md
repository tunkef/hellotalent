# hellotalent.ai — Current State
> Son guncelleme: 30 Mart 2026 | Session 55 | T15 dark mode remaining complete

## 1. Proje Ozeti

hellotalent.ai, Turkiye perakende sektorune ozel bir yetenek pazaryeri. Adaylar profil olusturup yetkinlik pratigi yapar, isverenler aday arar ve mesaj atar. Tech stack: vanilla HTML/CSS/JS (framework yok), Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions), GitHub Pages (custom domain). Repo: `github.com/tunkef/hellotalent`. P1-P3 tamamlandi, P4 planlanmis.

## 2. Canli Ozellikler

- **Aday profil wizard** — 4 adimli onboarding, deneyim/egitim/dil/sertifika/tercih | `profil-wizard.js`
- **Glassmorphic float header** — LinkedIn-style, 5 nav, avatar dropdown, dark mode toggle | `profil.html`
- **Markalar paneli** — 96 marka flip-card grid, company/brand hierarchy | `profil-markalar.js`
- **Yetkinlik sistemi** — 29 KF yetkinlik, 34 rol haritasi, bento grid, premium reading view | `profil-yetkinlik.js`
- **Mulakat Kocu (Studio)** — STAR+T metodu, 6 ekranli flow, streak, spaced repetition, ilk giris onboarding spotlight | `profil-mulakatkocu.js`
- **AI feedback** — Edge Function (gpt-4.1-mini), pg_cron pipeline, hero kart + accordion UI | `supabase/functions/journal-feedback/`
- **Streak sistemi** — gunluk seri, freeze/geri kazanim, review oneri | migration 20260327-28
- **Employer onboarding (P3)** — tek/coklu marka, domain verify, team system | `ik.html`
- **Bi-directional messaging** — employer DM, candidate reply, split-pane, realtime | `profil-inbox.js`
- **Email infrastructure** — outbox pattern, Resend API, pg_cron, 3 template | Edge Functions
- **Coach sistemi** — coach_invites, posts, likes, 6 kategori | `coach-studio.html`
- **Premium gating** — subscription schema, demo flow, is_premium truth | `profil-premium.js`
- **Destek merkezi** — support_articles + tickets, 6 seed makale | `profil-destek.js`
- **Ops Health dashboard** — admin panel, failed email tracking | `admin-ops-health.js`
- **Kim Bakti** — header icon, goruntulenme sayaci | `profil-kimbakti.js`
- **Dark mode** — profil.css 7-faz hardening, 24+ test | `profil.css`
- **Beni Oner** — aday gorunurluk toggle, avatar yesil glow | `profil-visibility.js`
- **Profile completion scoring** — >=45% threshold, sync trigger | migration 035-036

## 3. Dosya Haritasi

| Dosya | Gorev |
|-------|-------|
| `shared.js` | Supabase client init, ortak helper'lar, tek config noktasi |
| `shared.css` | Design system tokenleri, ortak stiller |
| `profil.html` | Ana aday sayfasi (~6300 satir), panel switch, header |
| `profil.css` | Profil sayfa stilleri + dark mode |
| `profil-core.js` | Auth guard, session init, panel routing |
| `profil-data.js` | DB CRUD (save_candidate_profile RPC), veri yukle/kaydet |
| `profil-ui.js` | DOM helpers, avatar, delete confirm, panel render (~1870 satir) |
| `profil-wizard.js` | 4-step onboarding wizard, dirty flag, draft |
| `profil-draft.js` | LocalStorage draft kaydet/yukle/temizle |
| `profil-helpers.js` | trLower, titleCaseTR, PRESERVE_CASE, normalize |
| `profil-events.js` | Global event listeners, Cmd+K palette |
| `profil-bootstrap.js` | Sayfa yuklendiginde calisacak init sequence |
| `profil-genel.js` | Genel Bakis dashboard, bento grid kartlari |
| `profil-summary.js` | Profil ozet karti, completion bar |
| `profil-settings.js` | Ayarlar paneli, bildirim toggle'lari, hesap islemleri |
| `profil-markalar.js` | Marka flip-card grid, _BRAND_COLORS, hover reveal |
| `profil-yetkinlik.js` | 29 yetkinlik + 34 rol haritasi, wizard, bento reading view |
| `profil-mulakatkocu.js` | Studio: STAR+T, streak, AI feedback, spaced repetition, modules |
| `profil-inbox.js` | Mesaj kutusucandidatethread, reply, realtime subscription |
| `profil-kimbakti.js` | Kim Bakti goruntuleme widget |
| `profil-visibility.js` | Beni Oner toggle, is_active kontrol |
| `profil-premium.js` | Premium gate, demo checkout, entitlement check |
| `profil-teklifler.js` | Teklifler paneli (placeholder) |
| `profil-locations.js` | Sehir/lokasyon secimi |
| `profil-cv.js` | CV yukleme/indirme |
| `profil-destek.js` | Destek merkezi, ticket olusturma |
| `profil-preview.js` | Profil onizleme |
| `ik.html` | Isveren paneli: aday arama, mesajlasma, onboarding |
| `ik-kampanya.js` | Isveren kampanya yonetimi |
| `giris.html` | Login/register (aday + IK tab), LinkedIn OAuth |
| `admin.html` | Admin paneli: aday/isveren/coach/ops/support/campaigns |
| `admin-*.js` | Admin alt modulleri (7 dosya) |
| `coach-studio.html` | Coach icerik olusturma arayuzu |
| `index.html` | Homepage (daima bu, asla index_new.html) |

## 4. DB Durumu

- **Baseline:** `20260322000000_baseline.sql` (migration 001-064 arsivlendi)
- **Son migration:** `20260330093056_campaign_wizard_backend.sql` (Supabase DEPLOYED)
- **Toplam migration (baseline sonrasi):** 35 dosya
- **Key tablolar:** `candidates` (bigint id), `companies` (bigint), `brands` (bigint), `hr_profiles` (uuid→auth.users), `experiences`, `education`, `candidate_languages`, `certificates`, `candidate_target_roles`, `candidate_blocked_companies`, `employer_messages`, `candidate_message_replies`, `employer_message_replies`, `email_outbox`, `subscriptions`, `employer_daily_usage`, `competency_definitions`, `role_competency_map`, `candidate_competencies`, `candidate_streaks`, `coach_profiles`, `coach_posts`, `coach_post_likes`, `coach_invites`, `studio_modules`, `candidate_studio_progress`, `badge_definitions`, `candidate_badges`, `candidate_journals`, `support_articles`, `support_tickets`, `company_teams`, `company_invitations`, `campaigns` (bigint GENERATED BY DEFAULT id), `campaign_reviews` (uuid id)

## 5. Aktif Backlog

1. ~~**Studio duration migration deploy**~~ — ✅ TAMAMLANDI (30 Mart). `20260329010000_studio_duration_fix.sql` deploy edildi.
2. ~~**T12 — Isveren kampanya wizard DB**~~ — ✅ TAMAMLANDI (Session 52, 30 Mart). Tablolar (`campaigns` 45 kolon + `campaign_reviews`), 5 enum type, RLS (6 policy: select/insert/update/delete employer + admin ALL), `campaign-assets` Storage bucket (public read, authenticated upload), `updated_at` trigger — hepsi canli. Eksik employer DELETE policy `20260330093056_campaign_wizard_backend.sql` ile eklendi. Frontend (`ik-kampanya.js` 1179 sat, `admin-campaigns.js` 231 sat) hazir. Wizard end-to-end calismaya hazir.
3. **Coach media V1 DB deploy** — `20260322142905_coach_media_fields.sql` ✅ TAMAMLANDI (Session 49, 30 Mart). `coach_posts.cover_image_url` + `cover_image_alt` kolonlari canli, nullable text.
4. **Badge genisletme** — ✅ TAMAMLANDI (Session 50, 30 Mart). 9 yeni rozet (pratik 5/10/25/50, seri 7/30 gun, jurnal 1/5/10). 3 yeni rule_type (practice_total, streak_longest, journal_count). evaluate_candidate_badges genisletildi + record_yetenek_practice/update_candidate_streak/upsert_studio_journal hook'landi. 5 yeni ikon (flame, pen, medal, diamond, star). Migration: `20260330010000_badge_extension.sql`.
5. **Design system token migration** — T05-T08 TAMAMLANDI (Slice A+B+C). Session 48 Slice C: 8 HTML dosyasi (giris, gate, sifre-yenile, coach-studio, admin, isveren, aday, index) — font-size + brand hex → token. profil.css T07 regression da duzeltildi (5x color:var(--text) → var(--text-primary)). Commit: `90b8fa9`. Kalan: Slice D (ik.html + profil.html — riskli, sadece style blok), Slice E (JS .style. track — defer), spacing token kullanimi D'de.
6. ~~**T13 — Smoke/Auth test hygiene**~~ — ✅ TAMAMLANDI (Session 53, 30 Mart). 25 fail → 1. Root cause: Cloudflare Access tum live sayfalari blokluyor, Playwright DOM'a erisemiyor. Fix: `playwright.config.js`'e `webServer` (npx serve -p 3000) + `baseURL: localhost:3000` eklendi. `hellotalent.smoke.spec.js` hardcoded `https://hellotalent.ai` → relative path. Gate testi form doldurma ile duzeltildi. Font testi `document.fonts.load()` ile duzeltildi. `giris.html` login button'a `id="btn-aday-giris"` eklendi. Auth setup BLOCKED: `HT_TEST_EMAIL` / `HT_TEST_PASSWORD` env var'lari set edilmeli — set edilince 12 e2e testi de calismaya hazir.
7. ~~**T14 — Label accessibility audit**~~ — ✅ TAMAMLANDI (Session 54, 30 Mart). 4 dosya: `giris.html` (10 label for + 1 modal close aria-label + 1 forgot-email label), `gate.html` (2 label for), `index.html` (6 aria-label + 5 label for HR modal), `ik.html` (filter-sehir span→label, 2 range aria-label, 2 select aria-label, 2 modal-close aria-label, 26 form-label for attr, 2 team invite aria-label). 68/68 smoke pass.
8. ~~**Dark mode remaining**~~ — ✅ TAMAMLANDI (Session 55, 30 Mart). `profil-settings.js` 7 alert()/confirm() → `_htAlert()`/`_htConfirm()` dark-mode-aware DOM modal'larına çevrildi. `gate.html` + `giris.html` + `ik.html`: theme-init script + `html[data-theme="dark"]` CSS eklendi. 68/68 smoke pass.
9. **iyzico/Stripe checkout** — schema hazir, merchant hesap + API key gerekli (**her zaman en son**)

## 5b. Sosyal Layer Audit Kararlari (Session 45 — 30 Mart)

| # | Feature | Karar | Gerekce |
|---|---------|-------|---------|
| 41 | Kucuk Kohort Ligi | **DEFER** | Normalize skor yok, min 100+ aktif kullanici gerekli, kulturel shaming riski |
| 42 | Sosyal Karsilastirma | **DEFER** | Veri granulerligi yetersiz (binary rating), min 50+ aktif pratikci gerekli |
| 43 | Peer Practice | **DO NOT BUILD** | XL efor, video/realtime/moderation altyapisi yok, ayri urun seviyesi |

**Sonuc:** T02/T03/T04 otomatik DEFERRED. Onkosula: 50+ aktif pratikci icin T42-lite (topluluk nabzi karti) yeniden degerlendirilir.

## 6. Son 3 Session Ozeti

### Session 55 (30 Mart — T15 Dark Mode Remaining)
**Dark mode backlog tamamen kapatıldı:** 4 dosya. `profil-settings.js`: 7 native `alert()`/`confirm()` → `_htAlert()`/`_htConfirm()` DOM modal'larına dönüştürüldü. Helper IIFE `.modal-overlay` + `.modal` + `.btn-primary/secondary` + `.modal-confirm-body` sınıflarını dinamik oluşturuyor; `profil.css` semantic tokenları (`--bg-surface`, `--text-primary` vb.) sayesinde dark mode'da otomatik çalışıyor. `gate.html`: theme-init `<script>` + `html[data-theme="dark"]` CSS (kart, input, hata). `giris.html`: theme-init + dark mode body/header/card/form/tab-toggle/Google-LinkedIn buton/forgot-modal. `ik.html`: theme-init + token override (`--text/muted/border/bg`) + topbar/stat-card/filter/candidate-card/modal/drawer/button/chip/input/accordion/activity explicit override'ları. 68/68 smoke pass.

### Session 54 (30 Mart — T14 Label Accessibility Audit)
**43 erişilebilirlik uyarısı kapatıldı:** 4 dosyada sistematik label fix. `giris.html`: tüm form label'larına `for` attr eklendi (10 adet), modal kapatma butonu `aria-label="Kapat"`, şifre sıfırlama modalında unlabelled input için `<label>` eklendi. `gate.html`: 2 label for. `index.html`: kayıt/login formlarında görünür label yerine `aria-label` (6 input), HR modal'daki 5 label'a `for` attr, dark section'da 4 input `aria-label`. `ik.html`: `filter-sehir` için `<span>` → `<label for>`, range inputlarına `aria-label`, sort/position select'lere `aria-label`, 2 modal close `aria-label`, 26 `form-label for` attr (onboarding sc-*, lokasyon, mesaj, pozisyon, ayarlar). Smoke: 68/68 PASS.

### Session 53 (30 Mart — T13 Smoke/Auth Test Hygiene)
**Smoke test 25→1 fail:** Root cause: Cloudflare Access tum live sayfaları Playwright'tan blokluyor. Fix 1: `playwright.config.js`'e `webServer: { command: 'npx serve . -p 3000', port: 3000 }` + `baseURL: 'http://localhost:3000'` eklendi. Fix 2: `hellotalent.smoke.spec.js` — `withGate()` hardcoded `https://hellotalent.ai` → relative path, Gate testi form doldurma akisiyla duzeltildi, Brand fonts testi `document.fonts.load()` bekleme ile duzeltildi. Fix 3: `giris.html` login button'a `id="btn-aday-giris"` eklendi (auth.setup.js selector duzeltmesi). Sonuc: 540 passed, 1 failed (auth.setup — BLOCKED: env var yok), 12 did not run (e2e bloke). Auth setup env var: `HT_TEST_EMAIL` + `HT_TEST_PASSWORD` set edilince 12 e2e testi de aktif olacak.

### Session 52 (30 Mart — T12 Campaign Wizard DB)
**Kampanya wizard DB tamamlama:** T11 audit "DB tamamen bos" dedi ama aslinda tablolar, enumlar, RLS, trigger ve bucket onceden deploy edilmisti. Schema dogrulamasi yapildi: `campaigns` (45 kolon, bigint GENERATED BY DEFAULT id, 5 enum type), `campaign_reviews` (uuid id, ON DELETE CASCADE), 5 RLS policy (employer select/insert/update + admin ALL + candidate read), `campaign-assets` bucket (public read, authenticated upload with company_id folder check). Eksik: employer DELETE policy (draft-only). Migration `20260330093056_campaign_wizard_backend.sql` bu tek policy'yi ekledi. 512/533 test PASS (21 fail pre-existing baseline — backlog 6-8). Wizard end-to-end DB-ready.

### Session 51 (30 Mart — T11 Campaign Wizard Audit)
**Kampanya wizard truth audit:** `ik-kampanya.js` (1179 sat) ve `admin-campaigns.js` (231 sat) tamamen yazilmis, 6 adimli wizard, cover image upload, admin moderation, status lifecycle — hepsi hazir. Kritik bulgu: `campaigns` tablosu ve `campaign_reviews` tablosu hicbir migration'da yok. Storage bucket `campaign-assets` yok. Schema frontend'den reverse-engineer edildi. T12 tek is: 1 migration + 1 bucket. Bağımlılık yok (wizard plan-agnostic, package pricing '—'). Risk: switchPanel override pattern (son script tag — dusuk risk).

### Session 50 (30 Mart — T10 Badge Extension MVP)
**Badge sistem genisletmesi:** 9 yeni rozet eklendi (6→15 toplam). 3 yeni rule_type: `practice_total` (yetenek pratik seansi SUM), `streak_longest` (en uzun seri candidate_streaks), `journal_count` (STAR+T gunluk sayisi). Pratik milestones: 5/10/25/50 seans. Seri milestones: 7/30 gun. Jurnal milestones: 1/5/10 kayit. `evaluate_candidate_badges()` RPC genisletildi, 3 ek RPC'ye hook eklendi: `record_yetenek_practice`, `update_candidate_streak`, `upsert_studio_journal`. Frontend'e 5 yeni ikon SVG: flame, pen, medal, diamond, star. 24/24 dark-mode test PASS. Migration `20260330010000_badge_extension.sql` Supabase'e deploy edildi.

### Session 48 (30 Mart — T08 Slice C)
**Design token migration Slice C:** 8 HTML dosyasi tamamen tokenize edildi. (1) gate/giris/sifre-yenile: font-size + brand hex → var(), lokal :root font token eklendi. (2) coach-studio/admin: font-size + muted color → var(), lokal :root font token eklendi. (3) isveren: font-size + #b84420/#C94E28 → var(--verm-dark/verm). (4) aday: 72 font-size + hover colors → token. (5) index: 114 font-size + brand hex → token (style block + inline HTML). Ayrica: profil.css T07 regression fix — 5x `color:var(--text)` → `color:var(--text-primary)` (dark mode semantics). 514 test gecti, 25 failure (pre-existing, ayni baseline). Commit: `90b8fa9`.

### Session 47 (30 Mart — T07 Slice B)
**Design token migration Slice B:** `profil.css` 183 font-size literal (10px..20px) → `var(--text-*)`, 35 hex renk literal (#C94E28, #1E2D5E, #6B7280 vb.) → `var(--verm/verm-dark/navy/navy-deep/muted/gray/text)`. `shared.css` 80 font-size literal → `var(--text-*)`. Gradient stops da token'a donusturuldu. Token def'leri dokunulmadi (dairesel referans riski), `!important` rule'lari korundu. 514 test gecti, regression yok. Commit: `3cbbacc`.

## 7. Kritik Kurallar (Quick Ref)

- **`var` kullan**, `const`/`let` degil (Safari SyntaxError onlemi)
- **`.maybeSingle()`** kullan, `.single()` degil (bos sonuc guvenli)
- **UI dili: Turkce** — asla "roportaj", her zaman "mulakat" veya "is gorusmesi"
- **Fontlar:** Bricolage Grotesque (baslik), Plus Jakarta Sans (body), DM Mono (data) — Inter/Roboto yasak
- **Renkler:** Vermillion `#C94E28`, Navy `#1E2D5E`, BG `#F7F6F4` — mor gradient yasak
- **Bento grid SKILL zorunlu:** UI kodu yazmadan once `.agents/skills/bento-grid-design/SKILL.md` oku
- **candidates.id = bigint**, hr_profiles.id = uuid, companies/brands.id = bigint
- **console.log yasak** — sadece console.error/warn
- **IIFE pattern:** yeni feature `(function(){ ... })();` ile sar, `window._htX` ile expose et
- **profil.html 6300+ satir** — asla butun dosyayi yeniden yazma, section-by-section edit
- **Deploy:** `git push origin main` → ~40s → Cmd+Shift+R
- **Migration:** `npm run db:new -- name` → edit → `npm run db:push`
- **Cache-bust:** JS import'lara `?v=YYYYMMDDx` ekle

## 8. Derin Dalis Rehberi

| Konu | Kaynak |
|------|--------|
| Tam proje gecmisi (43 session) | `docs/handoff.md` — 3150+ satir |
| Mimari kararlar | `.claude/rules/architecture-decisions.md` |
| Kod kalite kurallari | `.claude/rules/code-quality.md` |
| Deploy workflow | `.claude/rules/deploy-workflow.md` |
| Supabase patterns | `.claude/rules/supabase-patterns.md` |
| Turkce UI kurallari | `.claude/rules/turkish-ui.md` |
| Bento grid tasarim | `.agents/skills/bento-grid-design/SKILL.md` |
| Dev skill (mimari + component) | `.agents/skills/hellotalent-dev/SKILL.md` |
| Data strategy + matching | `.agents/skills/hellotalent-dev/references/data-strategy.md` |
| DB schema referansi | `docs/db-schema-reference.js` |
| Migration arsivi (001-064) | `docs/migrations/` |
| Aktif migration'lar | `supabase/migrations/` (baseline sonrasi 32 dosya) |
| Onceki session hafizasi | `claude-mem` MCP → `smart_search("hellotalent [konu]")` |
| Studio tasarim dokumani | `docs/studio-foundation.md` |
| Coach/support SOP | `docs/coach-support-sop.md` |
