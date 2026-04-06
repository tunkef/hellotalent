# hellotalent.ai — Current State
> Son guncelleme: 6 Nisan 2026 | Asama 67: Design System CSS Overhaul (Kademe 0-2)

## 1. Proje Ozeti

hellotalent.ai, Turkiye perakende sektorune ozel bir yetenek pazaryeri. Adaylar profil olusturup yetkinlik pratigi yapar, isverenler aday arar ve mesaj atar. Tech stack: vanilla HTML/CSS/JS (framework yok), Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions), GitHub Pages (custom domain). Repo: `github.com/tunkef/hellotalent`. P1-P3 tamamlandi, P4 planlanmis.

## 1b. AI Routing Snapshot

- Varsayilan operasyon modeli `free-cloud-first`.
- Mevcut `8GB MacBook Air` uzerinde local LLM/Ollama operasyonel bulunmadi; bu cihaz icin iptal edildi. Daha guclu donanimda yeniden degerlendirilebilir.
- `Playwright` tek UAT sahibidir; deploy sonrasi smoke, auth regression, candidate/employer kritik path ve bug reproduction burada kosar.
- `Groq` hizli Q&A/explain/translate katmani olarak kullanilir.
- `Cerebras` derin dosya review ve cross-file analiz katmanidir.
- `DeepSeek` diff review, security audit ve stage gate denetcisidir.
- `OpenRouter` ve `SambaNova` fallback havuzudur.
- `Claude Sonnet` varsayilan implementation modelidir.
- `Claude Opus` sadece escalation ile kullanilir; mimari trade-off, RLS/data contract ve belirsiz root-cause debugging gibi durumlara ayrilir.
- `Claude Haiku` mekanik okuma/ozet/modelidir; kod sahibi degildir.
- `Gemini` bugun operasyonel helper olarak bagli degildir; sadece status/health-check seviyesindedir. Ileride screenshot/log yorumlayici rolunde yeniden degerlendirilebilir.
- `scripts/aider-commit.sh` bir commit-message draft araci degil; `AI-assisted edit + auto-commit flow` aracidir.

## 2. Canli Ozellikler

- **Gate sayfasi (index.html)** — Tam ekran split landing: sol aday / sag isveren, sirt-sirta illustrasyonlar (aday sag alt, isveren sol alt ayna), gradient arka planlar (vermillion warm / navy cool), hover radial glow + buton scale efekti, logo sol + giris yap sag ust (~140 satir) | `index.html`, `assets/gate/gate-aday.png`, `assets/gate/gate-isveren.svg`
- **Aday landing (aday.html)** — LinkedIn tarzinda: Google signup CTA, pill ozellikler, 3 adim onboarding akisi, "Kimin icin?" bolumu (~476 satir) | `aday.html`
- **Isveren landing (isveren.html)** — LinkedIn tarzinda: navy hero, lead form, marka pill'leri, alternating white/warm-gray bolumler (~586 satir) | `isveren.html`
- **Aday profil wizard** — 4 adimli onboarding, deneyim/egitim/dil/sertifika/tercih | `profil-wizard.js`
- **Glassmorphic float header** — LinkedIn-style, 5 nav, avatar dropdown, dark mode toggle | `profil.html`
- **Markalar paneli** — 96 marka, informative card v2 (cover gorsel, magaza/calisan sayisi, takip butonu), 31 marka gorseli optimize, company/brand hierarchy | `profil-markalar.js`
- **Yetkinlik sistemi** — 29 KF yetkinlik, 34 rol haritasi, bento grid, premium reading view | `profil-yetkinlik.js`
- **Mulakat Kocu (Studio)** — STAR+T metodu, lobby + kurs detay + odak modu + completion, streak, spaced repetition, inline rol secimi, **mini egitim dashboard (rozet tooltip + ilerleme karti + sonraki oneri CTA)**, AI degerlendirme (1 hak/beta) | `profil-studio.js`
- **AI feedback** — Edge Function (gpt-4.1-mini), pg_cron pipeline, hero kart + accordion UI | `supabase/functions/journal-feedback/`
- **AI CV Optimize** — Anthropic (claude-sonnet-4) Edge Function, canonical ATS template, source CV ingestion (PDF text + DOCX unzip + DOC best-effort), **Beta: 1 kullanim hakki/aday (ai_cv_used), hak bittikten sonra "cok yakinda" mesaji** | `supabase/functions/cv-optimize/`, `profil-cv.js`
- **Streak sistemi** — gunluk seri, freeze/geri kazanim, review oneri | migration 20260327-28
- **Employer onboarding (P3)** — tek/coklu marka, company linking, kampanya wizard, team system live; domain verify planli, portfolio management sinirli | `ik.html`
- **Bi-directional messaging** — employer DM, candidate reply, split-pane, realtime | `profil-inbox.js`
- **Email infrastructure** — outbox pattern, Resend API, pg_cron, 3 template | Edge Functions
- **Coach sistemi** — coach_invites, posts, likes, 6 kategori | `coach-studio.html`
- **Premium gating** — subscription schema hazir, iyzico defer; **MVP_FREE_TIER=true: beta 3 ay ucretsiz**. AI ozellikleri 1 hak/kullanici (ai_cv_used + ai_assessment_used). Tum badge'ler "PREMIUM · 3 ay ucretsiz". Beni One Cikar aktif. Teklifler tab acik (blur kaldirildi) + beta erisim notu | `profil-premium.js`, `profil-teklifler.js`
- **Destek merkezi** — support_articles + tickets, 6 seed makale | `profil-destek.js`
- **Ops Health dashboard** — admin panel, failed email tracking | `admin-ops-health.js`
- **Security monitoring** — security_audit_log tablosu, haftalik RLS audit cron (Pazar 4am), get_security_dashboard() admin RPC | `20260406100135_lb6_security_monitoring.sql`
- **Iki adimli dogrulama (2FA/TOTP)** — Supabase MFA API, profil ayarlarinda etkinlestir/kapat, giris sirasinda challenge modal, Google/LinkedIn OAuth dahil tum login akislarinda | `profil-settings.js`, `giris.html`
- **Kim Bakti** — header icon, goruntulenme sayaci | `profil-kimbakti.js`
- **Dark mode** — 7-faz hardening, 24+ test | `css/tokens.css`, `css/layout.css`
- **Design system CSS overhaul** — profil.css (3223 sat) → 7 modular CSS dosyasina bolundu, 3-katmanli token sistemi (primitive/semantic/component), ht- prefix'li component class'lari (ht-btn, ht-card, ht-chip, ht-input, ht-modal, ht-toast, ht-toggle), dual-write migration (eski class'lar korunarak yeni class'lar eklendi), JS factory fonksiyonlari guncellendi | `css/`, `profil-ui.js`, `profil-wizard.js`, `profil-settings.js`, `profil-bootstrap.js`, `profil-draft.js`
- **Beni Oner** — aday gorunurluk toggle, avatar yesil glow | `profil-visibility.js`
- **Profile completion scoring** — >=45% threshold, sync trigger | migration 035-036

## 3. Dosya Haritasi

| Dosya | Gorev |
|-------|-------|
| `shared.js` | Supabase client init, ortak helper'lar, tek config noktasi; header nav sadeleştirildi (6 sayfa delinked: kariyer, pozisyonlar, yetkinlik, blog, hakkimizda, isalim-rotasi); footer 2 kolon: Platform + Yasal |
| `shared.css` | Design system tokenleri, ortak stiller; 14 yeni LinkedIn-tipi tipografi tokeni eklendi (--heading-xl/lg/md/sm, --body-lg/md/sm, --lp-radius-*, --lp-section-pad, --lp-max-width, --warm-gray) |
| `index.html` | Gate sayfasi — tam ekran split (aday/isveren secimi), ~110 satir |
| `aday.html` | Aday landing — LinkedIn tarzinda, Google signup, pill features, 3 adim, "kimin icin" bolumu, ~476 satir |
| `isveren.html` | Isveren landing — LinkedIn tarzinda, navy hero, lead form, marka pill'leri, ~586 satir |
| `profil.html` | Ana aday sayfasi (~6300 satir), panel switch, header |
| `css/tokens.css` | 3-katmanli design token sistemi (primitive → semantic → component) + dark mode overrides |
| `css/layout.css` | Reset, header, sidebar, theme toggle, loading, panels, bottom nav |
| `css/components.css` | Forms, buttons (ht-btn 8 varyant), cards (ht-card), chips (ht-chip), inputs (ht-input), modals (ht-modal), toasts |
| `css/wizard.css` | Wizard progress bar, steps, form gruplama |
| `css/panels/genel-bakis.css` | Genel Bakis paneli stilleri |
| `css/panels/merkezi.css` | Merkezi panel (profil formlari) stilleri |
| `css/panels/sirketler.css` | Sirketler paneli stilleri |
| `profil-core.js` | Auth guard, session init, panel routing |
| `profil-data.js` | DB CRUD (save_candidate_profile RPC), veri yukle/kaydet |
| `profil-ui.js` | DOM helpers, avatar, delete confirm, panel render (~1870 satir) |
| `profil-wizard.js` | 4-step onboarding wizard, dirty flag, draft |
| `profil-draft.js` | LocalStorage draft kaydet/yukle/temizle |
| `profil-helpers.js` | trLower, titleCaseTR, PRESERVE_CASE, normalize |
| `profil-events.js` | Global event listeners, Cmd+K palette |
| `profil-bootstrap.js` | Sayfa yuklendiginde calisacak init sequence |
| `profil-genel.js` | Genel Bakis dashboard, HT info karti, brand teaser (cover gorsel), coach feed |
| `profil-summary.js` | Profil ozet karti, completion bar |
| `profil-settings.js` | Ayarlar paneli, bildirim toggle'lari, hesap islemleri |
| `profil-markalar.js` | Marka flip-card grid, _BRAND_COLORS, hover reveal |
| `profil-yetkinlik.js` | 29 yetkinlik + 34 rol haritasi, wizard, bento reading view |
| `profil-studio.js` | Studio: STAR+T, streak, AI feedback, spaced repetition, modules |
| `profil-inbox.js` | Mesaj kutusucandidatethread, reply, realtime subscription |
| `profil-kimbakti.js` | Kim Bakti goruntuleme widget |
| `profil-visibility.js` | Beni Oner toggle, is_active kontrol |
| `profil-premium.js` | Premium gate, demo checkout, entitlement check |
| `profil-teklifler.js` | Teklifler paneli (freemium/premium tab, beta erisim notu) |
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

## 4. DB Durumu

- **Baseline:** `20260322000000_baseline.sql` (migration 001-064 arsivlendi)
- **Son migration:** `20260406105521_zero_tech_debt_aal2_authusers.sql` (Supabase DEPLOYED)
- **Toplam migration (baseline sonrasi):** 41+ dosya
- **Key tablolar:** `candidates` (bigint id), `companies` (bigint), `brands` (bigint), `hr_profiles` (uuid→auth.users), `experiences`, `education`, `candidate_languages`, `certificates`, `candidate_target_roles`, `candidate_blocked_companies`, `employer_messages`, `candidate_message_replies`, `employer_message_replies`, `email_outbox`, `subscriptions`, `employer_daily_usage`, `competency_definitions`, `role_competency_map`, `candidate_competencies`, `candidate_streaks`, `coach_profiles`, `coach_posts`, `coach_post_likes`, `coach_invites`, `studio_modules`, `candidate_studio_progress`, `badge_definitions`, `candidate_badges`, `candidate_journals`, `support_articles`, `support_tickets`, `company_teams`, `company_invitations`, `campaigns` (bigint GENERATED BY DEFAULT id), `campaign_reviews` (uuid id)

## 5. Aktif Backlog

1. ~~**Landing Page Redesign + Dark Mode**~~ — ✅ TAMAMLANDI (Session 63, 2 Nisan gece). index.html gate sayfasina donusturuldu (~110 satir). aday.html LinkedIn-tarzinda yeniden yazildi (~476 satir). isveren.html LinkedIn-tarzinda yeniden yazildi (~586 satir). shared.js header nav sadeleştirildi: kariyer, pozisyonlar, yetkinlik, blog, hakkimizda, isalim-rotasi **nav'dan kaldirildi**. shared.css 14 LP tokeni eklendi. Dark mode eklendi (3 sayfa, system preference default). Nav active link brand renkleri: aday=vermillion, isveren=navy. **397 test PASS** (365 P3 + 32 smoke). Commits: 679c4e2–ba9e452 (12 commit).
2. ~~**Studio duration migration deploy**~~ — ✅ TAMAMLANDI (30 Mart). `20260329010000_studio_duration_fix.sql` deploy edildi.
2. ~~**T12 — Isveren kampanya wizard DB**~~ — ✅ TAMAMLANDI (Session 52, 30 Mart). Tablolar (`campaigns` 45 kolon + `campaign_reviews`), 5 enum type, RLS (6 policy: select/insert/update/delete employer + admin ALL), `campaign-assets` Storage bucket (public read, authenticated upload), `updated_at` trigger — hepsi canli. Eksik employer DELETE policy `20260330093056_campaign_wizard_backend.sql` ile eklendi. Frontend (`ik-kampanya.js` 1179 sat, `admin-campaigns.js` 231 sat) hazir. Wizard end-to-end calismaya hazir.
3. **Coach media V1 DB deploy** — `20260322142905_coach_media_fields.sql` ✅ TAMAMLANDI (Session 49, 30 Mart). `coach_posts.cover_image_url` + `cover_image_alt` kolonlari canli, nullable text.
4. **Badge genisletme** — ✅ TAMAMLANDI (Session 50, 30 Mart). 9 yeni rozet (pratik 5/10/25/50, seri 7/30 gun, jurnal 1/5/10). 3 yeni rule_type (practice_total, streak_longest, journal_count). evaluate_candidate_badges genisletildi + record_yetenek_practice/update_candidate_streak/upsert_studio_journal hook'landi. 5 yeni ikon (flame, pen, medal, diamond, star). Migration: `20260330010000_badge_extension.sql`.
5. **Design system token migration** — ✅ T05-T08 product tarafinda TAMAMLANDI (Slice A+B+C+D). Session 48 Slice C: 8 HTML dosyasi (giris, gate, sifre-yenile, coach-studio, admin, isveren, aday, index) — font-size + brand hex → token. profil.css T07 regression da duzeltildi (5x color:var(--text) → var(--text-primary)). Session 59 / Asama 33-35 ile Slice D kapandi: `ik.html` local style blok token migration'i yapildi, local `--text-*` token source fix eklendi, p3 regression guard yazildi. Kalan yalnizca **Slice E**: JS `.style.` track'i (defer, product blocker degil).
6. ~~**T13 — Smoke/Auth test hygiene**~~ — ✅ TAMAMLANDI (Session 53, 30 Mart). 25 fail → 1. Root cause: Cloudflare Access tum live sayfalari blokluyor, Playwright DOM'a erisemiyor. Fix: `playwright.config.js`'e `webServer` (npx serve -p 3000) + `baseURL: localhost:3000` eklendi. `hellotalent.smoke.spec.js` hardcoded `https://hellotalent.ai` → relative path. Gate testi form doldurma ile duzeltildi. Font testi `document.fonts.load()` ile duzeltildi. `giris.html` login button'a `id="btn-aday-giris"` eklendi. Auth setup BLOCKED: `HT_TEST_EMAIL` / `HT_TEST_PASSWORD` env var'lari set edilmeli — set edilince 12 e2e testi de calismaya hazir.
7. ~~**T14 — Label accessibility audit**~~ — ✅ TAMAMLANDI (Session 54, 30 Mart). 4 dosya: `giris.html` (10 label for + 1 modal close aria-label + 1 forgot-email label), `gate.html` (2 label for), `index.html` (6 aria-label + 5 label for HR modal), `ik.html` (filter-sehir span→label, 2 range aria-label, 2 select aria-label, 2 modal-close aria-label, 26 form-label for attr, 2 team invite aria-label). 68/68 smoke pass.
8. ~~**Dark mode remaining**~~ — ✅ TAMAMLANDI (Session 55, 30 Mart). `profil-settings.js` 7 alert()/confirm() → `_htAlert()`/`_htConfirm()` dark-mode-aware DOM modal'larına çevrildi. `gate.html` + `giris.html` + `ik.html`: theme-init script + `html[data-theme="dark"]` CSS eklendi. 68/68 smoke pass.
9. **Pozisyon gorunum/esleme metrikleri** — backend counter/trigger gerekli, frontend truth-sync edildi (sahte 0 yerine "yakinda aktif" mesaji)
10. **iyzico/Stripe checkout** — schema hazir, merchant hesap + API key gerekli (**her zaman en son**)
11. ~~**Supabase Advisor Fix'leri (SA1-SA5) + LB6 + 2FA**~~ — ✅ TAMAMLANDI (Session 66, 6 Nisan). SA1-SA5: search_path + FK index + cron + bio RPC. LB6: security_audit_log + haftalik RLS audit + security dashboard. 2FA: TOTP enrollment (ayarlar) + login challenge (giris.html). Code review fix'leri: Sonnet reviewer 6 sorun + DeepSeek 4 ek bulgu — hepsi duzeltildi. **820/833 Playwright test PASS** (12 auth = bilinen blocker, 1 setup = env var eksik).

## 5b. Sosyal Layer Audit Kararlari (Session 45 — 30 Mart)

| # | Feature | Karar | Gerekce |
|---|---------|-------|---------|
| 41 | Kucuk Kohort Ligi | **DEFER** | Normalize skor yok, min 100+ aktif kullanici gerekli, kulturel shaming riski |
| 42 | Sosyal Karsilastirma | **DEFER** | Veri granulerligi yetersiz (binary rating), min 50+ aktif pratikci gerekli |
| 43 | Peer Practice | **DO NOT BUILD** | XL efor, video/realtime/moderation altyapisi yok, ayri urun seviyesi |

**Sonuc:** T02/T03/T04 otomatik DEFERRED. Onkosula: 50+ aktif pratikci icin T42-lite (topluluk nabzi karti) yeniden degerlendirilir.

## 6. Son 3 Session Ozeti

### Session 67 (6 Nisan — Asama 67: Design System CSS Overhaul Kademe 0-2)
**profil.css 3223 satir → 7 modular CSS dosyasina bolundu. ht- prefix'li component sinifi sistemi kuruldu.**

**Kademe 0 (Tokens):** (1) `css/tokens.css` olusturuldu — 3 katmanli token mimarisi (primitive → semantic → component). (2) Dark mode overrides hex ile tanimlandi. (3) Geri-uyum aliasları (--verm, --navy vb.) korundu.

**Kademe 1 (CSS Split):** (4) `profil.css` (3223 sat) → `css/layout.css` (789), `css/components.css` (428), `css/wizard.css` (132), `css/panels/genel-bakis.css` (149), `css/panels/merkezi.css` (1668), `css/panels/sirketler.css` (193). (5) `profil.css` silindi. (6) `profil.html` CSS link'leri guncellendi. (7) `shared.css` 12 spacing duplicate temizlendi. (8) Dark mode + p3 regression testleri guncellendi (split CSS okuma).

**Kademe 2 (Component Classes + Dual-Write):** (9) `css/components.css`'e ht-btn (8 varyant + sm/lg + is-loading), ht-card (4 varyant), ht-chip (is-active state), ht-input (has-error), ht-modal, ht-toast, ht-toggle eklendi. (10) Task 13A: profil.html'de 141 dual-write class eklendi (eski class korunarak yeni ht- class eklendi). (11) Task 13B: JS factory fonksiyonlari (profil-ui.js 7x field→ht-input, chip→ht-chip, exp-card→ht-card; profil-settings.js modal-overlay→ht-modal; profil-wizard.js field-error→has-error; profil-bootstrap.js + profil-draft.js selected→is-active sync). (12) DeepSeek review + Codex gate review 6/6 PASS. **820/820 Playwright test PASS.**

### Session 65 (5-6 Nisan — Asama 65: Gate Illustrasyon Redesign + AI Routing Policy)
**Gate sayfasi editorial illustrasyon redesign + free-cloud-first AI routing policy olusturuldu.**

**Gate Sayfasi Redesign:** (1) Aday ve isveren tarafina editorial flat-vector illustrasyonlar eklendi (`assets/gate/`). (2) PNG arka plan Python flood-fill ile seffaflastirildi. (3) SVG arka plan dolgu path'leri kaldirildi (1 background rect + 14 buyuk #F5F5F0 + sol ust beyaz kose). (4) Sirt-sirta layout: aday gorseli sag alt, isveren gorseli sol alt + scaleX(-1) ayna. (5) Gradient arka planlar (vermillion warm / navy cool). (6) Hover efektleri: radial glow + buton scale + illustrasyon lift. (7) Logo sola, Giris Yap sag uste hizalandi. (8) Accent cizgileri ve buton oklari kaldirildi. (9) Yazi hizasi: aday sol, isveren sag. (10) Mobile responsive (768px + 380px breakpoint).

**AI Routing Policy:** (11) Local Ollama denendi (phi4-mini, 8GB Air) — kalite + RAM + guvenilirlik fail → iptal. (12) Free-cloud-first routing policy olusturuldu ve CLAUDE.md'ye eklendi. (13) Claude model routing: Haiku=mekanik okuyucu, Sonnet=default muhendis, Opus=sadece escalation. (14) Gemini bugun operasyonel degil, gelecekte yorumlayici/extractor olarak degerlendirilebilir. (15) Playwright tek UAT sahibi olarak teyit edildi.

**Kararlar:** K026: Local LLM mevcut 8GB Air icin iptal, daha guclu donanimda yeniden degerlendirilebilir. K027: Free-cloud-first varsayilan routing modeli.

**3 commit:** c13e4e7→13b90ea.

### Session 64 (4-5 Nisan — Asama 64: Mega Session — 2 gun, ~35 commit, 8 migration)
**Proje tarihinin en buyuk session'i.** Kategoriler:

**KVKK Revizyonlari:** (1) KV1-KV3: cinsiyet, dogum yili, askerlik, engel durumu opsiyonel — default "Belirtmek istemiyorum". (2) KV4: isveren filtresinde yas/cinsiyet zaten yoktu. (3) LB5: giris.html'e KVKK riza checkbox + 18 yas beyani eklendi, buton disabled olmadan kayit yapilamaz, `privacy_consent_at` + `age_confirmed` user_metadata'ya kaydediliyor. (4) kullanim-sartlari.html'e yas beyani sorumlulugu maddesi eklendi.

**Apple Benchmark Profil Iyilestirmeleri:** (5) AP5 (AKS-1): deneyim kartina "Is Tanimi" textarea — `candidate_experiences.description`. (6) AP6 (AKS-3): seyahat istegi dropdown. (7) AP3+AP4: vardiya esnekligi + ihbar suresi dropdown. (8) LB7 (AKS-6): DEI beyani footer.

**Zorunlu Alanlar Guclendirme:** (9) Ilce zorunlu (Step 1). (10) Sektor + segment zorunlu (Step 2). (11) Calisma tipleri + segment tercihleri zorunlu (Step 4). (12) En az 1 egitim zorunlu (Step 3). (13) Turkce-Anadil default dil.

**UX Iyilestirmeleri:** (14) Apple tarzi search→chip lokasyon secici (Step 5 redesign). (15) Tum dropdown'lar alfabetik siralandi. (16) Opsiyonel alanlara motivasyon hint'leri (KVKK alanlari "(opsiyonel)" kaldi, diger alanlar fayda odakli). (17) "Henuz is deneyimim yok" auto-toggle (kart eklenince kalkar, silinince geri gelir).

**Altyapi:** (18) LB1: analytics_events tablosu + HT.trackEvent() + ht_track bridge. (19) LB2: Cloudflare Web Analytics zaten aktifti. (20) Isveren lead sistemi: employer_leads tablosu + submit_employer_lead RPC + email_outbox bildirimi + admin panelde Leads sekmesi (durum yonetimi + not).

**Audit & Bugfix:** (21) Code review: p_work_prefs'e travel/shift/notice eksikti — fix. (22) Description cache eksikti — fix. (23) Full pipeline audit: draft restore eksik 3 alan — fix. (24) search_employer_candidates RPC'ye yeni alanlar eklendi (description, takim_buyuklugu, travel, shift, notice). (25) target_roles cache, bos egitim validation, profil puani rebalance, profile_completed flag — hepsi fix.

**Kararlar:** K025a-f: pgvector DEFER, conversational koc DEFER, schema.org KISMI, GEO/FAQ YAKIN, AI ozetleme DEFER, Gemma 4 DEFER.

**Wizard Redesign (5 Nisan devam):** (26) Wizard 6→7 step: CV & Hakkimda ayri step. (27) Hakkimda Step 2'ye tasindi (deneyimlerden once). (28) Musaitlik tamamen kaldirildi (ihbar suresi kapsiyor). (29) Seyahat/Vardiya/Ihbar → Step 5 "Lokasyon & Uygunluk". (30) Lokasyon: custom multi-select dropdown (checkbox listesi + arama filtresi + secilen lokasyonlar altta). (31) AI ile Turkceye Cevir: Claude Haiku Edge Function (translate-text), Ingilizce algilaninca buton gorunur. (32) Kariyer Yonelimi coklu secim. (33) Hedef pozisyon max 3 siniri. (34) "Halen burada calisiyorum" tarih ustune tasindi. (35) Profil tamamlama sistemi redesign: granüler 100p, CV 15p + Bio 5p, hint'ler tiklanabilir. (36) Profil onizleme: completion donut + bio + iletisim yatay bar + deneyim full-width. (37) Egitim "(En az 1 egitim gerekli)" label. (38) Bio 1000 karakter, font normalize. (39) Dropdown'lar alfabetik siralama (6 liste).

**Altyapi & Fix (5 Nisan):** (40) employer_lead_notification email template eklendi + deploy. (41) admin_get_leads/admin_update_lead RPC: auth.users → auth.jwt() fix. (42) Supabase Advisor bulgulari yapilacaklara eklendi (SA1-SA5). (43) Var hoisting bug (seyahat/vardiya/ihbar pills), bio draft/cache fix.

**Acik kalanlar (sonraki session):** Admin panel leads "Yukleniyor" — logout+login gerekli (JWT refresh). Google Search Console robots.txt — Cloudflare Access bypass rules. Lokasyon checkbox hizasi son polish.

**8 migration, ~35 commit:** 5beac24→6b4f279.

### Session 63 (2 Nisan gece — Asama 63: Landing Page Redesign + Dark Mode + Nav Polish)
**index.html monolitik ana sayfa → minimal gate sayfasina donusturuldu. aday.html ve isveren.html LinkedIn-tarzinda sifirdan yeniden yazildi. Dark mode + nav brand renkleri eklendi.** (1) `index.html`: 2659 → ~130 satir gate page (tam ekran split, sol aday/sag isveren). (2) `aday.html`: 1029 → ~520 satir LinkedIn-style LP (Google signup, pills, steps, "kimin icin"). (3) `isveren.html`: 620 → ~640 satir LinkedIn-style LP (navy hero, lead form, marka pills). (4) `shared.js` nav: 6 sayfa kaldirildi, footer 2 kolon. (5) `shared.css` 14 LP tokeni. (6) **Dark mode:** 3 sayfaya theme-init script + html[data-theme="dark"] overrides eklendi (system preference default). (7) **Nav brand colors:** active link aday=vermillion, isveren=navy. (8) P3 regression test fix (stale 68/68 → flexible regex). **397 test PASS** (365 P3 + 32 smoke). 12 commit: 679c4e2–ba9e452.

### Session 62 (2 Nisan — Asama 48-61: Beta Launch Paketi)
**Tek gunde 12 asama tamamlandi.** (1) Tekrar eden hata guard'lari: ESLint .single() kuralı, truth-sync pre-commit hook, RLS pre-push guard, migration template. (2) Beta premium gate: AI CV + AI yetkinlik degerlendirme 1 hak/kullanici, non-AI premium full acik, "PREMIUM · 3 ay ucretsiz" badge. (3) Teklifler tab blur/gate kaldirildi, premium kartlarda beta erisim notu. (4) "Beni One Cikar" aktif (disabled kaldi). (5) CV template 6 ATS standardiyla optimize (avatar removed, metadata, skills section, normal font). (6) 31 marka gorseli optimize + brands.cover_image_url + informative card v2 redesign (cover, stats, takip). (7) Mini egitim dashboard: rozet strip → progress bar alti, hover tooltip, ilerleme karti + sonraki yetkinlik onerisi. (8) Hello Talent info karti Genel sayfaya eklendi (center feed + left rail compact). (9) Visual QA: 12 screenshot, kritik sorun yok. Pipeline infra: Codex plugin kuruldu (codex review gate), Supabase MCP OAuth baglandi, autopilot kaldirildi, Telegram bot daily ritual sistemi. **730 Playwright + 66 BATS test geciyor.**


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
