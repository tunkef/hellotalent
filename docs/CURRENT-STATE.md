# hellotalent.ai — Current State
> Son guncelleme: 29 Mart 2026 | Session 44 | 514/553 test (27 fail — infra/public-page, core 446/446 PASS)

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
- **Son migration:** `20260329010000_studio_duration_fix.sql` (Supabase deploy bekliyor)
- **Toplam migration (baseline sonrasi):** 33 dosya
- **Key tablolar:** `candidates` (bigint id), `companies` (bigint), `brands` (bigint), `hr_profiles` (uuid→auth.users), `experiences`, `education`, `candidate_languages`, `certificates`, `candidate_target_roles`, `candidate_blocked_companies`, `employer_messages`, `candidate_message_replies`, `employer_message_replies`, `email_outbox`, `subscriptions`, `employer_daily_usage`, `competency_definitions`, `role_competency_map`, `candidate_competencies`, `candidate_streaks`, `coach_profiles`, `coach_posts`, `coach_post_likes`, `coach_invites`, `studio_modules`, `candidate_studio_progress`, `badge_definitions`, `candidate_badges`, `candidate_journals`, `support_articles`, `support_tickets`, `company_teams`, `company_invitations`

## 5. Aktif Backlog

1. **Studio duration migration deploy** — `20260329010000_studio_duration_fix.sql` Supabase'e uygulanmali (`npm run db:push`)
2. **Isveren kampanya wizard** — `ik.html` icinde planlanmis
3. **Coach media V1 DB deploy** — `20260322142905_coach_media_fields.sql` henuz Supabase'e uygulanmadi
4. **Badge genisletme** — Yetenek pratik badge'leri (evaluate_candidate_badges extension)
5. **Design system token migration** — token'lar tanimlandi, 267 hardcoded rgba() toplu migration bekliyor
6. **Smoke test fix** — 24 public page assertion guncellenmeli (header/footer, signup form, meta tags)
7. **Auth setup fix** — test credential sorunu, 12 authenticated testi blokluyor
8. **Label accessibility audit** — 43 uyari bekliyor
9. **Dark mode remaining** — profil-settings.js alert->modal (7 instance), ik/giris/gate sayfalari
10. **iyzico/Stripe checkout** — schema hazir, merchant hesap + API key gerekli (**her zaman en son**)

## 6. Son 3 Session Ozeti

### Session 41 (27 Mart)
Icerik dogallastirma + streak temeli. 29 yetkinligin ~460 davranissal maddesi AI kaliplari kaldirarak yeniden yazildi. Streak DB foundation (migration 20260327020000: candidate_streaks tablosu + 2 RPC). Lobby kisisellestirme: isimle karsilama, growing yetkinlik onerisi. 422/422 test.

### Session 42 (28 Mart)
FAZ 2C streak freeze/geri kazanim mekanigi (migration 20260328010000). FAZ 4C detail->practice bridge: modul/koc detayindan yetkinlik pratigine CTA. AI feedback hardening: gpt-4.1-mini, self-reflection, error sanitization. Edge Function deploy + canli AI E2E PASS. 422/422 test.

### Session 43 (29 Mart — sabah)
FAZ 2C deploy (migration + frontend + canli smoke 4 state). FAZ 2D spaced repetition: needsReview(), review pill, daily pick onceligi. Phase 5B AI feedback redesign: hero kart + accordion progressive disclosure. AI pipeline fix: CORS + pg_cron + 75s poll. Canli E2E PASS.

### Session 44 (29 Mart — aksam)
**4 mini sweep kapandi:**
- Bos state: badge strip empty hint ("Pratik yaparak ilk rozetini kazanabilirsin")
- Mobil practice: Hazirlik Notlari accordion (signal+weak+followup mobilede kapali, desktopda acik)
- Design system: type scale (--text-xs..3xl), spacing scale (--space-1..12), vermillion contrast fix (--verm-text:#b84420, WCAG AA 5.47:1)
- Onboarding: "Ilk Adimin" spotlight karti (ilk giris), "Gunde 5 dakika" hero subtitle, daily card "hizli" tag
- Studio duration: 10dk modul→7dk (migration pending deploy)
- 446/446 core test PASS. 3 commit pushed: `69cf6d4`, `327eb6e`, `1ca07c8`.

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
