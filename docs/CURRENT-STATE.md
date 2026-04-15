# hellotalent.ai — Current State
> Son guncelleme: 15 Nisan 2026 | Asama 76 — Editorial dashboard sweep + dark mode + inbox viewport
> Aktif Odak: Candidate profil panelleri K067-K071c editorial + dark mode redesign tamamlandi. Sirada: K032 runtime Playwright smoke backlog ve Kim Bakti backend PVT-1..6 sprint (vault karar defterinde).

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

## 1c. Design & Content Operations Snapshot

- Public-site tasarim akisi icin dis referans stack kuruldu: `Google Stitch MCP` (layout/mockup referansi), `21st.dev` (component/pattern referansi), `Pro UI UX Max` (stil/palette direction), `Recraft API` (illustration/asset generation).
- Bu stack production code yazmaz; son implementasyon her zaman repo kurallarina uygun vanilla HTML/CSS/JS olarak elle uyarlanir.
- Public-site style direction kilitlendi: editorial, premium, sicak, whitespace agirlikli, brand-led. Vermillion baskin, navy authority. Generic SaaS gorunumu, mor gradient, stock-LLM estetik ve siradan marketing page dili istenmiyor.
- Illustration truth su an `docs/design-illustration-brief.md` icinde tutulur. Recraft ile uretilecek asset'ler burada tanimlanan karakter/stil sistemine uymak zorundadir. Aktif stil notlari: karakterlerde `Roundish flat` ana referans, `Vivid shapes` ikincil grafik destek, genis arka plan ve insansiz konseptlerde `Segmented Colors` referansi.
- Ilk execution scope yalnizca public pages: `index.html`, `aday.html`, `isveren.html`, `giris.html` ve gerekirse yeniden aktif edilecek diger marketing/content sayfalari. Bu design/revision track'inde `profil.html`, `ik.html`, `admin.html`, `coach-studio.html` ve dashboard yuzeylerine dokunulmaz; kullanici acikca isterse istisna olur.
- Content revizyon akisi `AI-SEO` + anti-AI-writing copy discipline ile yurur. Hedef sadece SEO degil; insan tarafinda ikna edici, LLM tarafinda extractable/citable, net ve guvenilir metinler uretmektir.
- Public copy kurallari: Turkce, somut, proje-ozel, abartisiz, fabricated proof/stat/testimonial yok, bos hype yok, yapay ve jenerik AI tonu yok. Feature yerine outcome dili, ama her claim gercek veriye veya urun gercegine dayanir.
- Siradaki ana is akisi: once `index.html` ve public-site sayfalarinin tasarim/revizyonu, paralelde site icindeki mevcut metinlerin HelloTalent positioning'ine gore temizlenmesi ve yeniden yazilmasi. Dashboard redesign bu fazin parcasi degildir.

## 2. Canli Ozellikler

- **Gate sayfasi (index.html)** — Clatu-first split gate: 2 zone (Is Ariyorum / Yetenek Ariyorum), smooth fade animasyonlar (opacity-first, minimal hareket), isveren illustration desktop mirror, SVG illustrasyonlar, prefers-color-scheme dark mode, responsive | `index.html`, `assets/gate/`
- **Aday landing (aday.html)** — Clatu editorial: hero (trust pills + Google signup + E-posta), features split + mini bento (6 esit kart), 3 step cards (vermillion numaralar, SVG illustrations), "Kimin icin?" 3 kategori, final CTA split layout (metin sol + gorsel sag), login popup bypass | `aday.html`, `assets/aday/`
- **Isveren landing (isveren.html)** — Navy theme: hero tek CTA (Yetenekleri Kesfet → lead form), features bento (6 esit kart, kompakt mobil), 3 step cards (ferah spacing), "Kimin icin?" split layout (3 minimal chip + gorsel sag), lead form (CRO copy), navy login button | `isveren.html`, `assets/isveren/`
- **Hakkimizda (hakkimizda.html)** — Premium editorial: vizyoner hero, quiet luxury mission split (kusursuz eslesme + diskresyon + tag'ler + kolon-hizali CTA butonlari), value cards (3 SVG), contained rounded scene gorsel | `hakkimizda.html`, `assets/hakkimizda/`
- **Iletisim (iletisim.html)** — Premium contact: hero + illustration, 3 contact cards (Mail Gonder/Demo Talep Et butonlari, yuvarlak ikonlar), HQ section (sadeles metin + adres + randevu CTA + kare sosyal ikonlar + Google Maps), contained rounded scene gorsel | `iletisim.html`, `assets/iletisim/`
- **Yasal (yasal.html)** — Tek sayfada 4 yasal metin: Gizlilik Politikasi, Kullanim Sartlari, KVKK Aydinlatma, Cerez Politikasi. Navy hero + tab butonlari, icerik degisiyor. URL hash destegi (#kvkk). Cerez tercihleri toggle. Dark mode. | `yasal.html`
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
- **Gate logged-in redirect** — aday→profil.html, isveren→ik.html, session check | `index.html`
- **Yasal birlestirme** — 4 eski yasal sayfa (gizlilik/kvkk/kullanim/cerez) yasal.html'e birlesti, eski dosyalar silindi | `yasal.html`
- **K029 Security Audit** — 3 katmanli (security/code-quality/a11y-perf), 50+ fix, 10 agent parallel audit | K029
- **Security hardening** — CV signed URLs (private bucket), employer PII strip (RPC wrapper), CSP header, X-Frame-Options, CORS restrict, password policy, hr_profiles INSERT guard, is_employer() onboarding check, input validation (telefon/email/sifre), modal focus trap, noopener | Asama 71
- **Studio CSS extraction** — profil-studio.js injectCSS (890 satir) → css/studio.css ayri dosya | `css/studio.css`
- **Unified Landing Page** — Gate kaldirildi, tek LP: Adaylar/Kurumsal segment toggle (bunq referans), Clatu-aligned CSS, sektor bazli brand social proof (her iki segment), navy kurumsal hero, mobil responsive toggle (desktop header / mobil hero), landscape optimize | `index.html`
- **Auth Pages Split** — Kayit (uye-ol.html) ve giris (giris.html) ayrildi. Aday: ad soyad + email + telefon + sifre + sifre tekrar + 2x KVKK checkbox + OAuth. Kurumsal: + sirket adi + web sitesi. Sifre goz ikonu. KVKK acik riza ayri checkbox | `uye-ol.html`, `giris.html`
- **Kurumsal Demo Dashboard** — Employer giris sonrasi demo placeholder: 4 statik fake aday karti, CTA, auth guard | `demo-dashboard-ik.html`
- **Bot Protection** — 3 katman: Cloudflare Turnstile (invisible) + honeypot field + server-side Edge Function verify. Registration rate limit (3/5dk). Password reset cooldown (60s) | `uye-ol.html`, `supabase/functions/verify-turnstile/`
- **Role Tampering Guard** — user_metadata.role → app_metadata.role (DB trigger: signup sync + update guard). Tum client-side role check'leri app_metadata'dan | 3 DB trigger, 8 dosya
- **KVKK Consent Audit Log** — consent_log tablosu, server-side timestamp, auto-insert trigger on signup, RLS korunmali | `consent_log` tablosu
- **Avatar signed URL sistemi** — Tum avatar/cover gorselleri private bucket signed URL ile yukleniyor, HT.signStorageUrl helper | shared.js, coach-studio, ik, profil-preview, profil-genel, admin-coach-content
- **CSP tightening** — wss:// realtime, Sentry ingest fix, Google Maps frame-src, dead Sentry entry cleanup | Tum 13 HTML

## 3. Dosya Haritasi

| Dosya | Gorev |
|-------|-------|
| `shared.js` | Supabase client init, header/footer inject, page-aware login redirect, hamburger menu (Adaylar/Isverenler/Hakkimizda/Iletisim), footer: 3-kolon (brand+nav sol, sosyal sag), copyright+DEI alt satir |
| `shared.css` | Design system tokenleri, glassmorphism header, mobile menu (opak dark bg), footer 3-kolon grid + kompakt mobil, LP tokenleri |
| `yasal.html` | 4-tab yasal bilgiler sayfasi (gizlilik/kullanim/kvkk/cerez), navy hero, dark mode, ~570 satir |
| `index.html` | Gate sayfasi — Clatu split (flex expansion hover), SVG illustrations, ~280 satir |
| `aday.html` | Aday landing — Clatu editorial, hero+bento+steps+who+CTA, ~520 satir |
| `isveren.html` | Isveren landing — navy theme, hero+bento+steps+who+lead form, ~510 satir |
| `hakkimizda.html` | Hakkimizda — premium editorial, hero+mission+values+CTA, ~230 satir |
| `iletisim.html` | Iletisim — contact cards+HQ split+map+scene, ~260 satir |
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
| `giris.html` | Login only (aday + kurumsal tab), LinkedIn/Google OAuth, Beni Hatirla, MFA |
| `uye-ol.html` | Kayit sayfasi: aday + kurumsal tab, KVKK checkbox, Turnstile, honeypot |
| `demo-dashboard-ik.html` | Kurumsal demo placeholder: fake aday kartlari, auth guard |
| `admin.html` | Admin paneli: aday/isveren/coach/ops/support/campaigns |
| `admin-*.js` | Admin alt modulleri (7 dosya) |
| `coach-studio.html` | Coach icerik olusturma arayuzu |

## 4. DB Durumu

- **Baseline:** `20260322000000_baseline.sql` (migration 001-064 arsivlendi)
- **Son migration:** `20260409160000_fix_hr_profiles_onboarding_completed.sql` (Supabase DEPLOYED)
- **Yeni tablolar (9 Nisan):** `consent_log` (KVKK audit)
- **Yeni trigger'lar (9 Nisan):** `trg_sync_role_on_signup`, `trg_guard_role_on_update`, `trg_log_consent_on_signup`
- **Yeni Edge Function (9 Nisan):** `verify-turnstile` (Cloudflare bot verification)
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
12. ~~**Design System CSS Overhaul (Kademe 0-3)**~~ — ✅ TAMAMLANDI (Session 67-68, 6 Nisan). profil.css → 7 modular CSS. ht- component class sistemi. Task 14: Eski class alias temizligi tamamlandi (chip/field/exp-card/modal/card/btn dual-write → tek ht- class). Task 15: Inline style temizligi (6 utility class, ~50 inline style → class). Kademe 3: Header nav sadelesti (3 item), bottom nav yeniden siralandi (Genel/Kesfet/Mesajlar/Teklifler/Profil). **820/820 Playwright test PASS.**
13. ~~**Public-site design + content revision**~~ — ✅ TAMAMLANDI (Session 69, 7 Nisan). 5 public sayfa tamamen yeniden tasarlandi (index, aday, isveren, hakkimizda, iletisim). Clatu-first editorial design sistemi: Bricolage Grotesque + Plus Jakarta Sans, Vermillion dominant, Navy authority. prefers-color-scheme dark mode tum sayfalarda. Glassmorphism header (blur, dark mode). Login popup kaldirildi (direkt page-aware redirect). Hamburger menu: Adaylar/Isverenler/Hakkimizda/Iletisim. Gemini UAT geribildirim dongusu ile premium copy iterasyonlari (quiet luxury, CRO, diskresyon). 196/196 Playwright QA test PASS. Footer mobile grid fix. Responsive 4 viewport (390/768/1024/1440). Edge-to-edge scene gorselleri (WebP optimize). Google Maps embed (iletisim). "hellohunter" logo easter egg (isveren). Commits: 57aadcf–b222bd7 (~30 commit).

14. **Agent Skills Upgrade + Hedefli Audit (K029)** — 8 Nisan 2026. 12 yeni engineering/design skill kuruldu (Addy Osmani/Google + Supabase official + secici Impeccable). 38 total skill. 3 katmanli hedefli audit planlanmis: Katman 1 Security Sweep (AU1-AU6, blocker), Katman 2 Code Simplification (AU7-AU11, MVP 2 oncesi), Katman 3 A11y+Performance (AU12-AU18, incremental). Detay: `vault/02-urun/yapilacaklar.md` ve `vault/06-kararlar/karar-defteri.md#K029`.

## 5b. Sosyal Layer Audit Kararlari (Session 45 — 30 Mart)

| # | Feature | Karar | Gerekce |
|---|---------|-------|---------|
| 41 | Kucuk Kohort Ligi | **DEFER** | Normalize skor yok, min 100+ aktif kullanici gerekli, kulturel shaming riski |
| 42 | Sosyal Karsilastirma | **DEFER** | Veri granulerligi yetersiz (binary rating), min 50+ aktif pratikci gerekli |
| 43 | Peer Practice | **DO NOT BUILD** | XL efor, video/realtime/moderation altyapisi yok, ayri urun seviyesi |

**Sonuc:** T02/T03/T04 otomatik DEFERRED. Onkosula: 50+ aktif pratikci icin T42-lite (topluluk nabzi karti) yeniden degerlendirilir.

## 6. Son 3 Session Ozeti

### Session 76 (15 Nisan — Asama 76: K067-K071c — Ayarlar/Premium/Inbox editorial + Dark mode feedback + Dashboard link audit)

**Aday profil panellerinde tam editorial sweep + dark mode parity + inbox LinkedIn-style yeniden yazimi + dashboard link audit + regression guard infra. Tek gunde ~30 commit, ~14 saat sureli session.**

**K067 — Ayarlar paneli editorial rewrite** (3 faz):
- Faz A: `css/panels/ayarlar.css` (~800 satir) + `profil.html` panel-ayarlar HTML tamamen yeniden yazildi. Bento `.ht-grid-3` yerine 6 editorial section stack (01 Hesap / 02 Guvenlik / 03 Gizlilik / 04 Bildirim / 05 Gorunum / 06 Hesap Yonetimi). `.ayr-*` namespace. Sirketler TOC pattern scroll-nav. 50+ kritik settings id korundu (profil-settings.js handler sifir dokunuldu).
- Faz B: `profil-ayarlar.js` yeni IIFE (~150 satir) — IntersectionObserver scroll-spy TOC + smooth-scroll hash nav.
- Faz C: Tema karti tri-state segment (Sistem / Acik / Koyu). Default Sistem — `prefers-color-scheme` dinliyor, storage event + matchMedia change listener senkron. Mevcut `setThemePreference()` tri-state infra'si zaten vardi, sadece UI eklendi.

**K068 + K068b — Dark mode feedback loop**:
- Tuna 6 darkmode geribildirimi + 4 ek geribildirim verdi. Hepsi uygulandi.
- `css/wizard-editorial.css` sonuna dark block — `--wz-*` token remap + success modal + step inputs + ms-selected-title/pill + MFA + wizard cards.
- `css/profil-extras.css` — `#exp-cards-container > .ht-card` dark rule duzlestirildi (Kariyer step Diller gibi flat frame-less), pp-drawer (profil onizleme) tam dark block.
- `css/layout.css` header popup body + seg + duyuru chip/title/body dark unified; `.header-msg`/`.header-notif`/`#header-kimbakti` transparent bg (rgba-white frame kaldirildi); `.mk-card--hero` dark border+bg kaldirildi.
- `profil-extras.css` chip/check-item checked state → solid `--editorial-vermillion` fill (eskiden `--accent-soft` transparent outline).
- `profil-locations.js` inline `--navy`/`--text`/`--muted` → `--editorial-*` token.
- Cache-bust `20260415k068` → `20260415k068b`.

**K068b hotfix (commit 4f31ff7)**: Profil-locations.js script tag `></script>` kapanisi cache-bust edit'inde dustu. HTML parser tum alt scriptleri open-tag'e gomdu → `ReferenceError: updateDashboardSummary/updateMerkezCards` → login broken. Tek satir fix.

**Prevention infra (commit 311f03e)**:
- `scripts/check-html-tags.sh` (POSIX sh, BSD+GNU compat) — 6 HTML entry icin `<script>` open/close count esitligi + orphan `<script src>` satir tarama. `.husky/pre-commit`'e bagli.
- `tests/p3.regression.spec.js` +24 test (6 entry × 2 guard).
- `vault/06-kararlar/karar-defteri.md` K032 — runtime Playwright smoke suite backlog entry.

**K069 — Premium paneli editorial redesign**:
- `css/panels/premium.css` (~360 satir) — `.prem-*` namespace. Bento asymmetric → 2-col symmetric. Hero (Bricolage vermillion 56 + mono kicker + hairline), beta strip (left-border accent), 6 feature kart (cream+hairline, 40px hairline icon box, mono italic kicker, Bricolage title), 3 plan kart (vermillion highlight center, DM Mono 44px price, 44px CTA).
- `profil-premium.js` `injectCSS()` no-op K069 marker, `render()` yeniden yazildi, `checkCurrentPremium()` + `showPurchaseStatus()` .prem-active/.prem-status class'larina cekildi. MVP_FREE_TIER + FEATURES/PLANS + RPC contract + ids korundu.
- Cache-bust `20260415k069`.

**K070 — Inbox viewport-locked 2-pane (LinkedIn-style)**:
- `#panel-inbox` `height:calc(100vh - --header-h,64px)`, flex column, overflow hidden.
- Hero kompakt flat editorial strip (bg/border kaldirildi, padding kisaltildi, headline 26-32px).
- `.ib-split` flex:1, overflow hidden, 280-340px fixed list + 1fr thread.
- `.ib-list` internal scroll + 6px vermillion scrollbar (K070b).
- `.ib-thread-body` internal scroll + 6px vermillion scrollbar.
- Composer flex-none, textarea resize none, min 68 max 140px.
- K070c: Mesaj balonlari — isveren navy bubble (bottom-left tail), aday vermillion bubble (bottom-right tail), max-width 76%.
- K070d: `profil-inbox.js` loadThread + appendBubble — gelen mesajlar da `.ib-bubble` ile wrap ediliyor (eskiden `<p>` direkt emit idi, bubble hic uygulanmiyordu).
- Cache-bust `20260415k070` → `20260415k071c`.

**K071 — Dashboard link audit (4 bug fix)**:
1. `header-kimbakti` double-binding temizlendi (profil-events.js + profil-inbox.js her ikisi bind ediyordu → `history.pushState` iki kayit → back button iki tik). K071b'de `__htKbBound` idempotent flag ile belt-and-suspenders.
2. Bildirim drawer `'studio'` dead panel name duzeltildi — `panel-studio` yok, valid isim `mulakat`. Routing table: `{koc:mulakat, is_teklifi:teklifler, teklif:teklifler, mesaj:inbox, default:bildirimler}`.
3. Mesaj drawer preview item `m.id` kaybediyordu → `window._htPendingInboxThreadId` closure ile yakalandi, `_htLoadInbox()` tail'de otomatik `openThread()`.
4. Notif routing fallback `teklifler` → `bildirimler`.

**K071c CRITICAL — Inbox display override regression (commit 7994862)**:
- K070 `#panel-inbox { display:flex }` unconditional — default `.panel { display:none }` + `.panel.active { display:block }` toggle sistemini override etti. Panel-inbox her zaman gorunur kaldi, `calc(100vh - header)` viewport kapladi, ust panelleri gizledi.
- Sonuc: gov, bildirim, avatar menu tiklayinca hedef panel aktive oldu ama altindaki panel-inbox ustunu kapadi → "her tik mesajlara atiyor" algisi.
- Fix: display:flex + height + overflow sadece `#panel-inbox.active` iken. `!important` eklenerek `.panel.active { display:block }` override edildi.

**Commits (kronolojik):** 298952a (p3 fix) → 4d1a5cc (K067 Faz A) → 9a3946b (K067 rewrite) → 98db418 (K067 Faz B+C) → 97e9e34 (K068) → a8d3801 (K068b) → 4f31ff7 (hotfix) → 311f03e (html tag guard) → 22a64ef (K069) → 368db79 (K070) → 99d0425 (K070b) → 5e2c8fb (K070c) → 6f47aab (K070d) → b7422dd (K071) → 7994862 (K071c).

**Test:** 910/0 yesil. HTML tag guard aktif (pre-commit + regression). Test sayisi asama 70 sonunda 868 idi → asama 76 sonunda 910 (+42 K069+K067+K068+K071 guard + 24 HTML structural integrity).

**Yeni dosyalar:**
- `css/panels/ayarlar.css` (K067)
- `css/panels/premium.css` (K069)
- `profil-ayarlar.js` (K067 Faz B+C)
- `scripts/check-html-tags.sh` (prevention)

**Acik riskler / backlog:**
- K032 Runtime Playwright smoke suite (vault karar defterinde) — localhost serve + pageerror listener. Auth mock/session injection gerekli.
- Kim Bakti backend PVT-1..6 (vault karar defterinde K031) — migration 040 promote + companies.segment join fix + is_premium wire + RLS verify. Tuna sabah darkmode sprint'i icin defer etti.
- `panel-yetkinlik` orphan div (switchPanel her yetkinlik'i mulakat'a normalize ediyor). Temizlik.
- `#avd-premium-btn` data-panel eksik, custom handler var; unify edilebilir.

**Insight:** K068b hotfix sinifi hata (cache-bust edit kapanis tag dusurme) K032 smoke suite'i hizlandirdi. HTML tag guard + regression test kombinasyonu static katman, runtime smoke semantic katman. Iki katman bir arada: sembolik (missing function) + yapi (tag unclosed) + kontrat (test suite) hepsini yakaliyor.

### Session 70 (7 Nisan — Asama 70: UX Polish + Footer Redesign + yasal.html)
**Tum public sayfalarda UX polish, footer tamamen yeniden tasarlandi, yasal.html olusturuldu.**

**Gate (index.html):** Smooth fade animasyonlar (expo-out → ease, opacity-first, hareket minimuma indirildi). Isveren illustrasyon desktop'ta mirror (scaleX(-1)).

**Aday (aday.html):** Trust pill'ler altmetne tasindi (border-bottom divider, max-width:360px). Bento kartlar normallesti (Studyo featured kaldirildi, 6 esit kart). Step kart spacing ferahlatildi (padding 24px, numara-baslik 8px). Step numaralari vermillion. "Kimin icin" summary altmetne birlesti. CTA section → hero-style split layout (metin sol, gorsel sag). Mobilde bento ikon/yazi kucultuldu.

**Isveren (isveren.html):** "Isveren Girisi" butonu kaldirildi → sadece "Yetenekleri Kesfet" (lead forma scroll). Bento featured kaldirildi (6 esit kart). Step spacing ferahlatildi. "Kimin icin" → split layout: 3 minimal chip (yan yana) + gorsel sag. Lead form baslik buyutuldu (24px), form notu jenerik yapildi. "hellohunter" easter egg kaldirildi. Full-bleed footer gorseli kaldirildi.

**Hakkimizda (hakkimizda.html):** Mission tag'ler neutral stil. CTA butonlari split kolonlarina hizalandi (Profil Olustur sol, Demo Talep Et sag). Values footer metni "Bizi farkli kilan" altmetnine tasindi. Scene gorsel contained + rounded (object-position: right 30%, responsive clamp max-height).

**Iletisim (iletisim.html):** Contact card'larda mailto butonlari (Mail Gonder/Demo Talep Et). Ikonlar yuvarlak (border-radius:50%). HQ section sadelesti (adres/email text paragraf, CTA hemen altinda). Sosyal ikonlar kare (footer ile tutarli). "24 saat donus" metni kaldirildi. Scene gorsel contained + rounded.

**Yasal (yasal.html — YENI):** 4 yasal sayfa tek sayfada birlesti. Navy hero + 4 tab butonu (Gizlilik/Kullanim/KVKK/Cerez). Tab tiklayinca icerik degisiyor. URL hash destegi. Cerez tercihleri toggle UI. Kapsamli dark mode. Header nav gizli.

**Footer (shared.js + shared.css):** Tamamen yeniden tasarlandi. 3 kolon: brand+tagline+nav (sol), bosluk, sosyal ikonlar (sag). Nav linkler dikey: Adaylar/Isverenler/Hakkimizda/Iletisim/Yasal Bilgiler. Alt satir: copyright (sol) + DEI (sag). Kompakt (padding azaltildi, logo 26px). Mobil: hepsi ortali, nav yatay wrap, sosyal ortali, copyright+DEI alt alta. Mobil menu opak dark bg.

**Cache:** Tum sayfalarda v=20260407z olarak birlesti.

**~35 commit. 8 dosya (aday/isveren/hakkimizda/iletisim/yasal/index/shared.js/shared.css).**

### Session 69 (7 Nisan — Asama 69: Public-Site Complete Redesign)
**5 public sayfa Clatu-first editorial tasarimla tamamen yeniden yazildi. Premium copy iterasyonlari. Dark mode. QA.**

**Sayfalar:** (1) `isveren.html` lead form CRO copy guncelleme (Demoyu Planla, Ucretsiz Demoyu Baslatin, sektore ozel dropdown) + edge-to-edge cta-scene gorsel. (2) `hakkimizda.html` sifirdan: vizyoner hero, quiet luxury mission split (kusursuz eslesme + diskresyon), value cards (3 SVG illustration), premium tags, CTA. (3) `iletisim.html` sifirdan: hero + 3 contact card + HQ split section (adres/email/4 sosyal ikon + Google Maps embed + lokasyon karti) + retail street scene.

**Shared infrastructure:** Login popup tamamen kaldirildi → page-aware direkt redirect (aday→giris?tab=aday, isveren→giris?tab=ik, diger→giris.html). Hamburger menu: Hakkimizda + Iletisim eklendi, Giris Yap cikarildi. Header: glassmorphism (blur 16px), dark mode (semi-transparent dark bg, beyaz hamburger/logo/links). Footer: mobile grid fix (display:flex→grid). Cache-bust: shared.css v=20260407g, shared.js v=20260407f.

**QA:** 3 paralel Playwright agent (196 test, 4 viewport x light/dark). 3 sorun bulundu ve fixlendi: footer mobile overflow, who-summary nowrap, gate illustration clip. Responsive: hero order (baslik once, gorsel sonra), cta-img max-height + object-fit:cover, gate illustrations right-aligned mobile. Step SVG dark mode bg. Trust items ortalanmis mobile.

**~30 commit. 5 dosya + shared.css + shared.js + 8 asset (WebP + SVG).**

### Session 68 (6 Nisan — Asama 68: Design System Full Migration — Task 14-15 + Kademe 3)
**Dual-write'tan tek class migration'i tamamlandi. Inline style temizligi. Header/bottom nav sadelesti.**

**Task 14 (Eski class alias temizligi):** (1) chip → ht-chip, selected → is-active (profil-ui/bootstrap/draft.js). (2) field → ht-input, field-error → has-error (profil-ui.js 6 factory, profil-wizard.js). (3) exp-card → #exp-cards-container > .ht-card (profil-ui/wizard/summary.js, components.css, merkezi.css). (4) modal-overlay → ht-modal__overlay, modal → ht-modal (profil.html 5 modal, profil-settings/events/inbox.js). (5) card/card-title/btn dual-write ~40 element temizlendi (profil.html). (6) CSS cleanup: .field, .btn (8 alias), .card, .card-title, .chip, .chip.selected, .field-error, .modal-overlay, .modal tanimlari components.css + merkezi.css'ten kaldirildi.

**Task 15 (Inline style temizligi):** (7) 6 utility class eklendi: flex-row-8, is-disabled, ht-panel-heading, ht-panel-heading--flex, ht-hint, ht-sub-card. (8) ~50 inline style → class'a donusturuldu. (9) 24 kacirilmis field ht-input dual-write temizlendi.

**Kademe 3 (Nav Restructure):** (10) Bottom nav yeniden siralandi: Genel → Kesfet (sirketler) → Mesajlar → Teklifler → Profil. Studyo bottom nav'dan cikarildi. (11) Header nav sadelesti: Teklifler + Studyo kaldirildi, Markalar → Kesfet yeniden adlandirildi. Header artik 3 item: Genel, Profil, Kesfet. (12) Task 16-19 (sidebar gruplari) onceki session'da implement edilmisti — dogrulandi.

**15 dosya degisti. 820/820 test PASS. DeepSeek 0 kritik bulgu.**

### Session 67 (6 Nisan — Asama 67: Design System CSS Overhaul Kademe 0-3)
**profil.css 3223 satir → 7 modular CSS dosyasina bolundu. ht- prefix'li component sinifi sistemi kuruldu. Sidebar ve bottom nav yeniden duzenlendi.**

**Kademe 0 (Tokens):** (1) `css/tokens.css` olusturuldu — 3 katmanli token mimarisi (primitive → semantic → component). (2) Dark mode overrides hex ile tanimlandi. (3) Geri-uyum aliasları (--verm, --navy vb.) korundu.

**Kademe 1 (CSS Split):** (4) `profil.css` (3223 sat) → `css/layout.css` (789), `css/components.css` (428), `css/wizard.css` (132), `css/panels/genel-bakis.css` (149), `css/panels/merkezi.css` (1668), `css/panels/sirketler.css` (193). (5) `profil.css` silindi. (6) `profil.html` CSS link'leri guncellendi. (7) `shared.css` 12 spacing duplicate temizlendi. (8) Dark mode + p3 regression testleri guncellendi (split CSS okuma).

**Kademe 2 (Component Classes + Dual-Write + Utility):** (9) `css/components.css`'e ht-btn (8 varyant + sm/lg + is-loading), ht-card (4 varyant), ht-chip (is-active state), ht-input (has-error), ht-modal, ht-toast, ht-toggle eklendi. (10) Task 13A: profil.html'de 141 dual-write class eklendi (eski class korunarak yeni ht- class eklendi). (11) Task 13B: JS factory fonksiyonlari (profil-ui.js 7x field→ht-input, chip→ht-chip, exp-card→ht-card; profil-settings.js modal-overlay→ht-modal; profil-wizard.js field-error→has-error; profil-bootstrap.js + profil-draft.js selected→is-active sync). (12) Task 15: Utility class'lar eklendi (d-flex, flex-wrap, gap-*, mb-*, pos-rel, pointer vb.), 17 inline margin-bottom:0 → CSS kurali, 5 gereksiz g-hero-inner inline style kaldirildi, mk-premium-toggle-card cursor fix.

**Kademe 3 (Nav Restructure):** (13) Sidebar 4 gruba ayrildi: Profil, Kesfet, Iletisim, Hesap. (14) Kim Bakti + Yetkinlikler sidebar nav item'lari eklendi. (15) Bottom nav'a 5. item (Studyo) eklendi. (16) sidebar-nav-label first-child spacing duzeltildi.

**Task 14-15 + Kademe 3 finali:** Session 68'de tamamlandi. Design system migration %100 bitti.

**820/820 Playwright test PASS.** DeepSeek + Codex gate review'lar gecti. 5 commit: 190b114→3845b40.

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
- **Public-site first:** bir sonraki design/content fazinda oncelik `index.html`, `aday.html`, `isveren.html`, `giris.html`; dashboardlara kullanici istemeden dokunma
- **Public-site design truth:** Clatu/Recraft protokolu aktif; business logic korunur ama eski layout referans alinmaz
- **Gate truth:** `index.html` sade, premium, tek-ekran aday/isveren karar yuzeyi olmali; ekstra aciklayici baslik/emoji/pill/ok gimmick'leri kullanma
- **No emoji:** public-site UI, badge, CTA, helper copy ve illustrasyon ustu etiketlerde emoji kullanma
- **Content revizyon standardi:** AI-SEO + anti-AI-writing; yapay/jenerik copy, uydurma proof ve bos hype kullanma
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
| Public-site design protocol | `docs/superpowers/specs/2026-04-06-design-gap-remediation-design.md` |
| Clatu illustration truth | `docs/design-illustration-brief.md` |
| Dev skill (mimari + component) | `.agents/skills/hellotalent-dev/SKILL.md` |
| AI-SEO content discipline | `.agents/skills/ai-seo/SKILL.md` |
| Copy discipline (anti-generic / no fabrication) | `.agents/skills/copywriting/SKILL.md` |
| Data strategy + matching | `.agents/skills/hellotalent-dev/references/data-strategy.md` |
| DB schema referansi | `docs/db-schema-reference.js` |
| Migration arsivi (001-064) | `docs/migrations/` |
| Aktif migration'lar | `supabase/migrations/` (baseline sonrasi 32 dosya) |
| Onceki session hafizasi | `claude-mem` MCP → `smart_search("hellotalent [konu]")` |
| Studio tasarim dokumani | `docs/studio-foundation.md` |
| Coach/support SOP | `docs/coach-support-sop.md` |
