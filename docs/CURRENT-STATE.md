# hellotalent.ai — Current State
> Son guncelleme: 19 Nisan 2026 | Asama 80 — Public-site v2 feedback iterasyonu + index hero video loop canli
> Aktif Odak: Tuna handoff molasi. Index hero (aday + kurumsal) Grok interview video'larina cevrildi, seamless 6sn loop autoplay/muted/playsinline. Acik isler: hakkimizda + iletisim hero video entegrasyonu, story card AI portrelerinin yenilenmesi, CLATU memory video spec. Dark mode toggle kaldirildi, OS prefers-color-scheme only.

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
- `Claude Opus 4.7` varsayilan implementation modelidir (16 Nisan 2026 — Tuna Opus 4.7'yi test ediyor). Mimari trade-off, RLS/data contract ve root-cause debugging de ayni modelde.
- `Claude Sonnet` sadece Tuna ile home session iletisim modelidir; kod sahibi degildir.
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
- **Premium gating** — subscription schema hazir, iyzico defer; **MVP_FREE_TIER=true: beta 3 ay ucretsiz**. AI ozellikleri 1 hak/kullanici (ai_cv_used + ai_assessment_used). Tum badge'ler "PREMIUM · 3 ay ucretsiz". Beni One Cikar aktif. Firsatlar (eski Teklifler) tab acik (blur kaldirildi) + beta erisim notu — FAZ A rename yapildi, FAZ B rewrite'da premium gate tamamen kalkacak | `profil-premium.js`, `profil-firsatlar.js`
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
| `profil-firsatlar.js` | Firsatlar paneli editorial rewrite (FAZ B + C): .frs-* namespace DOM emitter, premium gate kaldirildi, campaigns RPC filtered to 4 type ('offer','employer_branding','store_opening','brand_story'). hiring_boost hariç. Demo fallback DB bos ise. textContent-only (no innerHTML user data). |
| `css/panels/firsatlar.css` | Firsatlar FAZ B+C editorial stylesheet — .frs-* vocabulary + 4 type accent modifier (offer/branding/opening/story), K069 premium pattern turevi, dark mode via --editorial-* tokens. |
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

15. ~~**K032 Runtime Playwright Smoke Suite — Faz 1**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78). `tests/smoke.runtime.spec.js` (106 satir) — 4 hedef sayfa (profil/ik/admin/coach-studio) × 2 tema (light+dark) × 2 viewport (mobile+desktop) = 16 test. Auth mock yok (boot-time hata redirect oncesi fırlar). Codex K034 review: ilk FAIL (3 fix) → 2. PASS. 16/16 yesil. Commit `a9199b5`.

16. ~~**K032 Runtime Playwright Smoke Suite — Faz 2**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 devam). `tests/smoke.runtime.e2e.spec.js` (109 satir) + `scripts/seed-test-user.mjs`. profil.html 13 panel hash × 2 tema × 2 viewport = 52 test. Test user: kefelituna+k032@gmail.com candidate id=77. 52/52 yesil (~5.5dk). Commit `0c25753`+`67db4fb`.

17. ~~**K032 Runtime Playwright Smoke Suite — Faz 3**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 gece). 2 yeni test dosyasi + 2 yeni seed + 2 yeni auth setup + playwright.config.js 3 setup/6 e2e project. Test user'lar: `tkefeli@peoplein.com.tr` (employer) + `admin+k032@peoplein.com.tr` (admin). Prod admin guard: `kefelituna@gmail.com` hard-refuse. ik 40/40 + admin 48/48 = 88/88 yesil. **Bes bacakli koruma aktif.** K035 admin sertleştirme karar entry eklendi.

18. ~~**K032 Audit + Husky --no-stash Fix**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 gece kapanis). Commit `3668add`. Paralel agent audit (feature-dev:code-reviewer + Explore husky-drift) + targeted regression. 3 KRITIK + 4 ORTA + 3 LOW bulgu. **2 kritik fix:** (a) `.husky/pre-commit` `npx lint-staged --no-stash` — paralel tasarim session drift'i tamamen engellendi (bug root cause: lint-staged v16.4.0 `git stash --keep-index` partial staging durumunda unstaged dosyalari commit'e aliyordu). (b) `scripts/seed-test-user.mjs` `user_metadata.test_account: true` eklendi + `updateUserPassword` → `updateUser` (mevcut user'da da metadata sync). Targeted regression 479/479 yesil. **Faz 4 backlog somutlasti:** K-2 (panel activation assert, 15 dk), K-3 (admin setup navigate verify, 10 dk), O-1 (scripts/_supa-admin.mjs helper), O-2 (tests/helpers/runtime-signals.js helper + admin.e2e IGNORE drift), O-3 (waitForTimeout → waitForFunction), O-4 (docs/SECURITY-RUNBOOK.md service_role rotate). Genel verdict: **Dusuk borc.**

19. ~~**K032 Faz 4 kapanis (test suite hardening + seed/runtime helpers + security runbook)**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 bitis). Commit `3c88ad1`. K-2 panel activation assertion (3 spec, profil `yetkinlik → mulakat` alias map), K-3 admin auth setup `#admin-shell.active` guard. O-1 `scripts/_supa-admin.mjs` shared admin API plumbing (3 seed refaktör, +145/-160 satir). O-2 `tests/helpers/runtime-signals.js` IGNORE/REGRESSION/attachCollectors/criticalFrom/contextSnapshot/waitForBootSettle (4 spec refaktör). O-3 `waitForBootSettle` two-phase wait (`_htBootstrapDone` sentinel + microtask flush). O-4 `docs/SECURITY-RUNBOOK.md` service_role rotate + test_account audit + incident response checklist. 161/161 K032 suite yesil (16 Faz 1 + 54 Faz 2 + 40 Faz 3A + 48 Faz 3B + 3 setup). K-036 + K-037 backlog tespit edildi.

20. ~~**K-036 + K-037 + K-038 (admin hash-restore + ik onboarding gate + ik SELECT repair)**~~ — ✅ TAMAMLANDI (18 Nisan 2026). Commit `a8910e4`. K-036: `admin.html` showAdminDashboard artik `window.location.hash` okuyup switchPanel ile target panele iner + hashchange listener (browser back/forward + derin link). K-037: `ik.html:2427` + `ik.html:2508` onboarding gate `!hrProfile.sirket` → `!hrProfile.company_id` (sirket kolonu SELECT'te yoktu); `saveSirket` link_employer_to_company success sonrasi `onboarding_completed=true` set eder (is_employer() RPC gate). K-038: `ik.html:2365` SELECT `avatar_url` kolonu hr_profiles'ta yok — PostgREST 400 sessizce yutuluyordu, prof null kaliyordu, K-037 fix bile etkisizdi. SELECT listesinden `avatar_url` cikarildi, form-prefill kolonlari (sirket, sektor, buyukluk, web_sitesi, segment, merkez_sehir, magaza_sayisi, aciklama, aranan_profil, calisma_saatleri, linkedin, career_page_url, company_type) eklendi. Seed employer (`scripts/seed-test-employer.mjs`) artik companies tablosuna Peoplein Test row ekleyip hr_profile.company_id link ediyor + `onboarding_completed=true` seed'de set. K-2 ik/admin e2e assertion strict `panel-<hash>` (eski "always sirket/dashboard" kaldirildi). Codex GO-WITH-FIX: `saveSirket` missing `onboarding_completed` write blocker'i ayni commit'te kapatildi. 159/159 K032 suite yesil + pre-existing profil.ayarlar-toggles 6 fail (sidebar race, scope disi).

21. ~~**Public-site v2 redesign (index + hakkimizda + iletisim + yasal)**~~ — ✅ TAMAMLANDI (18-19 Nisan 2026). Commit `f8acd5c`. Rocket Mortgage bold imperative direction + Clatu-first HelloTalent brand merge. Bricolage Grotesque 800 display + Plus Jakarta Sans + DM Mono. 4 public sayfa yeniden tasarlandi; giris.html/aday.html/isveren.html/uye-ol.html korundu (prod flow intact). 8 Recraft Türk tipi portre (fair Mediterranean skin, kumral saç, young/adult mixed) cwebp q=70 → 17MB → 434KB (40× compress). Yeni `shared-v2.css` (~42KB) — mevcut `shared.css` diğer sayfalar için korundu, regression yok. Yeni `assets/v2/` namespace. Mobile hamburger menü (segment toggle + linkler + Giriş CTA), hero portrait order -1 (image first on mobile), hero badge safe positioning, stories mobile collapse (2 + "Tüm hikayeleri gör"), brand strip 1-col stacked + separators @520. Dark mode `html.dark` class + `@media prefers-color-scheme` dual support, 80+ targeted overrides (muted token `#5D6283` WCAG AA, coral-soft dark variant, `.step-p` inline style class extraction, `.about-hero`/`.contact-hero` dark bg, value-card p/h4, split-2, contact-card, hq-info, kvkk table, yasal panel headings). A11y: skip-to-content, focus-visible brand outline, prefers-reduced-motion respect, `<main>` landmark, aria-expanded/aria-hidden hamburger. SEO: CSP + OG + Twitter card + Schema.org JSON-LD + canonical tüm 4 sayfa. Index auth redirect (`app_metadata.role` → profil/ik) korundu. İletişim map area styled placeholder (grid + pulsing verm pin) Google Maps iframe yerine. SAAS dil temizligi: "Demo talep et" tüm instances → "Kurumsal hesap aç" (direct sign-up → demo panel auto). Copy: "96 marka arasından seni seçsin" grammar fix, `retail` → `perakende` consistency, story disclaimer (temsili). Playwright 4 sayfa × light/dark × desktop/mobile = 16+ view verify. Source: `mockups/v2/` kept for iterations.

22. ~~**Public-site v2 feedback iterasyonu (Pass 1-6)**~~ — ✅ TAMAMLANDI (19 Nisan 2026). 6 commit peş peşe canlıya gitti. Palet drift fix (`--ink #0A0E27 → navy #1E2D5E`), dark mode toggle + contrast tweak (pass 1), footer canonical + logo 26→38px bold + şirket adı "Peoplein İK Ltd. Şti." + mockup badge/story disclaimer temizlik + button radius 999→10px + eyebrow 18px margin + seg-toggle `:has()` renk davranışı (aday verm / kurumsal navy, dark glow) + Hakkımızda split-2 → `.split-card` (Aday sol / Kurumsal sağ, trust-pill chip'ler silindi, eşit yükseklik) + Hakkımızda fact ortalı + İletişim "Hesap aç" CTA → `uye-ol.html?tab=kurumsal` + iletişim Google Maps iframe (CSP `frame-src`) (pass 2). Footer Aday kolondan Hakkımızda drop, Bilgi kolonu canonical. Hero alignment: hakkimizda + iletişim top padding index ile hizalandı (48-96/64-112 clamp), `.about-hero-vis` 16:10 → 4:5, `.contact-hero-vis` 4:3 → 4:5 (pass 3). Index header Giriş Yap segment-aware (`switchSeg` href update `?tab=aday|ik`, initial sync). `#k-nasil` eyebrow → "Neden HelloTalent" + retail spesifik lede. CLATU v2 memory'de portre casting brief (beyaz Türk, 25-32, yakışıklı/güzel). Dark mode toggle KALDIRILDI, OS `prefers-color-scheme` only + `matchMedia('change')` listener ile live takip (pass 4). Index hero ikiliye Grok interview video entegrasyonu: `hero-aday.mp4` (540KB) + `hero-isveren.mp4` (410KB), 6sn seamless loop, autoplay/muted/loop/playsinline, ffmpeg first-frame poster (30KB), `object-fit: cover`, CSP `media-src 'self'` (pass 5). Font Bricolage footer logo `font-variation-settings: wght 800, opsz 14`. Cache bump chain: `v=20260419` → `d` → `e` → `f` → `g`. Commit'ler: `8050cce → dd79677 → ae13763 → 377cf9b → 06e9599 → 28e270f → 93fee09 → a1bad9e`. **Seg-toggle pill radius intentional olarak 999px bırakıldı (video üstünde estetik).**

## 5a. Açık İşler — Public-site v2 Pass 7+ (Sonraki Oturum)

1. **Hakkımızda + İletişim hero video** — index'teki Grok interview video pattern'ini o iki sayfaya da taşı. Aynı `<video autoplay muted loop playsinline poster>` + `object-fit: cover` + 4:5 aspect. Yeni prompt variant'ları (hakkımızda: team office cinematic, iletişim: warm support/handshake). Grok ile üret, Tuna onayla, ffmpeg ile optimize et.
2. **Aday story card portreleri** — `story-selin.webp`, `story-kerem.webp`, `story-zeynep.webp` hala eski Recraft generation, Güney Asya'ya kaymış. Grok ile Türk modeller (aynı casting brief: beyaz Türk, 25-32, yakışıklı/güzel, warm smile, Mediterranean features, editorial studio). Landscape 5:4 ya da 1:1. Ana lede "temsilidir" notu kaldırıldı, yeni portrelerle uyumlu olacak.
3. **Kurumsal story card portreleri** — kurumsal segment'teki 3 story card (Sephora İK, Zara Talent, Koton HR) aynı AI drift sorunu. Aynı yenileme.
4. **CLATU memory video spec** — `project_clatu_style.md` içine video section ekle: 6sn seamless loop, H.264 MP4 CRF 23, audio strip (ffmpeg `-an`), faststart, ilk frame poster JPG, CSP `media-src 'self'`, aspect 2:3 veya 4:5, boyut hedef ≤1MB. Grok prompt şablonu (aday POV over-the-shoulder + kurumsal POV ters over-shoulder).
5. **Grok prompt hygiene** — "no hijab, no Middle Eastern stereotypes, European Mediterranean Turkish features" negative prompt kalıbını story + hakkımızda + iletişim prompt'larına da uygula.

Commit listesi son oturum:
| Commit | İş |
|--------|-----|
| `8050cce` | palet restore + dark mode init (pass 1) |
| `dd79677` | feedback pass 2: footer, buttons, seg-toggle, fact cards |
| `ae13763` | feedback pass 3: contact map, split cards, button radii |
| `377cf9b` | footer logotype bold |
| `06e9599` | footer Aday Hakkımızda drop |
| `28e270f` | hero alignment + segment-aware login + kurumsal eyebrow |
| `93fee09` | dark toggle kaldırıldı, OS-only |
| `a1bad9e` | index hero Grok video loop |

## 5b. Sosyal Layer Audit Kararlari (Session 45 — 30 Mart)

| # | Feature | Karar | Gerekce |
|---|---------|-------|---------|
| 41 | Kucuk Kohort Ligi | **DEFER** | Normalize skor yok, min 100+ aktif kullanici gerekli, kulturel shaming riski |
| 42 | Sosyal Karsilastirma | **DEFER** | Veri granulerligi yetersiz (binary rating), min 50+ aktif pratikci gerekli |
| 43 | Peer Practice | **DO NOT BUILD** | XL efor, video/realtime/moderation altyapisi yok, ayri urun seviyesi |

**Sonuc:** T02/T03/T04 otomatik DEFERRED. Onkosula: 50+ aktif pratikci icin T42-lite (topluluk nabzi karti) yeniden degerlendirilir.

## 6. Son 3 Session Ozeti

### Session 79 (18-19 Nisan — Asama 79: K032 Faz 4 + K-036/037/038 + Public-site v2 redesign canli)

**Üç büyük iş blok: Test suite hardening (Faz 4), üç hotfix (K-036 + K-037 + K-038), public-site yeniden tasarım (v2) → canlıya.**

**K032 Faz 4 kapanis (commit `3c88ad1`):**
- **K-2 panel activation assert** (3 spec): `tests/smoke.runtime.{e2e,ik.e2e,admin.e2e}.spec.js` — panel.active elementinin `id` attribute'u `panel-<hash>` ile eşleşir mi assert. profil `yetkinlik` hash `panel-mulakat`'a aliaslanir (profil-events.js:508) — `PANEL_ID_ALIASES` map + `expectedPanelIdFor(hash)` helper.
- **K-3 admin auth setup** (tests/auth.setup.admin.js): login sonrası /admin.html navigate + `#admin-shell.active` visibility guard + ondan sonra `storageState` save. admin_users lookup gate setup asamasinda kaniti işlenir (48 admin e2e testi once degil).
- **O-1 seed helper**: `scripts/_supa-admin.mjs` — `loadAdminEnv`, `makeReq`, `ensureUser`, `refuseEmail`, `validateCreds`, `findUserByEmail`. 3 seed scripti refaktör, ortak Supabase admin API plumbing tek kaynakta. refuseEmail opsiyonel prod guard (`kefelituna@gmail.com` admin seed refuse).
- **O-2 test helper**: `tests/helpers/runtime-signals.js` — `IGNORE_PATTERNS`, `REGRESSION_PATTERNS`, `attachCollectors`, `criticalFrom`, `contextSnapshot`, `waitForBootSettle`. 4 smoke spec refaktör (demo-dashboard-ik IGNORE drift tek yerde).
- **O-3 flakiness**: `waitForBootSettle(page, {sentinelTimeoutMs, settleMs})` two-phase — profil.html `_htBootstrapDone` sentinel varsa erken exit (tipik <500ms), yoksa bounded fallback. `waitForTimeout(1500-1800)` yerine.
- **O-4 security runbook**: `docs/SECURITY-RUNBOOK.md` — §1 service_role rotate prosedür (Supabase dashboard → .env.local → edge functions), §2 test_account monthly audit (4 SQL query), §3 incident response checklist (containment/scope/notification/recovery), §4 local dev hygiene.

**K-036 + K-037 + K-038 (commit `a8910e4`):**
- **K-036 admin hash-restore**: `admin.html` `showAdminDashboard` artik `window.location.hash` okur + `switchPanel` çağırır + `hashchange` listener (`#admin-shell.active` guard). Bookmarklar ve browser geri/ileri çalışır.
- **K-037 ik onboarding gate**: `ik.html:2427` + `ik.html:2508` `!hrProfile.sirket` → `!hrProfile.company_id`. `sirket` SELECT'te yoktu — her fresh load'da undefined, her aday sessiz biçimde #sirket'e zorlanmış. `company_id` semantik olarak doğru + SELECT'te mevcut + `link_employer_to_company` RPC ile set edilir. Failure fail-safe: RPC fail olursa `company_id=null` kalır, kullanıcı retry eder.
- **K-038 ik SELECT repair**: `avatar_url` kolonu `hr_profiles` tablosunda YOK — PostgREST 400 hatası try/catch ile yutuluyordu, `prof` null kalıyordu, `hrProfile={}` → K-037 fix etkisizdi. SELECT listesinden çıkarıldı + form-prefill kolonları (sirket/sektor/buyukluk/web_sitesi/segment/merkez_sehir/magaza_sayisi/aciklama/aranan_profil/calisma_saatleri/linkedin/career_page_url/company_type) eklendi. K-037 + K-038 codependent — production'da da aynı davranışı açıklar.
- `saveSirket` Codex review blocker: `link_employer_to_company` success sonrası `onboarding_completed=true` PATCH (is_employer() RPC gate bekliyor). Fire-and-forget, re-save retry eder.
- Test employer seed (`scripts/seed-test-employer.mjs`) artik companies tablosuna "Peoplein Test" row + hr_profile.company_id + `onboarding_completed=true`.
- Test assertion reversal: ik e2e K-2 "always panel-sirket" → strict `panel-<hash>`. admin e2e K-2 "always panel-dashboard" → strict `panel-<hash>` (K-036 landed).
- Codex GO-WITH-FIX: blocker ayni commit'te kapatildi. 159/159 K032 suite yesil.

**Public-site v2 redesign (commit `f8acd5c`):**
- **4 sayfa yeniden tasarim**: `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html`. Giriş sayfaları (`giris.html`, `aday.html`, `isveren.html`, `uye-ol.html`) dokunulmadı — auth flow intact.
- **Design merge**: Rocket Mortgage bold imperative direction + HelloTalent Clatu-first brand. Bricolage Grotesque 800 display (clamp 40-96px), Plus Jakarta Sans body, DM Mono.
- **Palette koruma**: Vermillion #C94E28 (aday), Navy #1E2D5E (kurumsal), Cream #F7F6F4 (base). Coral #FF6B4A yeni dark mode accent.
- **Recraft portraits**: 8 Türk tipi görsel (fair Mediterranean skin, kumral/chestnut saç, young adult + adult karışık, kadın/erkek). 2 iterasyon — ilki "eli yüzü düzgün" feedback ile yeniden. cwebp q=70 m=6 → 17MB → 434KB (40× azalma).
- **Yeni dosyalar**: `shared-v2.css` (~42KB prod-dedicated, mevcut `shared.css` korundu), `assets/v2/` namespace (orijinal `assets/` korundu).
- **Mobile responsive**: Hamburger menü (segment toggle + 3 link + Giriş CTA), hero portrait `order: -1` (mobile'da image first), hero badge safe positioning, stories mobile collapse (ilk 2 + "Tüm hikayeleri gör" toggle), brand strip 1-col stacked + separators @520, footer 2-col @960 / 1-col @560.
- **Dark mode**: `html.dark` class + `@media (prefers-color-scheme: dark)` dual support. 80+ targeted override (6 inline `style="color:var(--ink-soft)"` → `.step-p` class extraction kritik fix; `.lede`, `.fact span`, `.contact-card p`, `.hq-info p`, `.value-card p`, `.step-card p`, `.split-2 p`, `.closing p`, yasal `h2`/`h3`/`p`/table, map placeholder). `--muted: rgba(247,246,244,.72)` dark override (class-level tokenları overridelamiyor — targeted override tercih). Coral-soft dark variant.
- **A11y**: skip-to-content utility, focus-visible brand outline (`outline: 2px solid var(--verm)`), prefers-reduced-motion respect, `<main>` landmark, aria-expanded + aria-hidden hamburger, semantic nav role. `--muted` #5D6283 (was #6F7493) → WCAG AA 4.9:1 on cream.
- **Value cards**: `display: flex; flex-direction: column; height: 100%`; `.vp-more { margin-top: auto }` → CTA ankor bottom regardless of copy length.
- **SEO**: CSP + OG + Twitter card + Schema.org JSON-LD + canonical URL her sayfada. index.html auth redirect script (Supabase session → profil/ik) aynen korundu.
- **Copy fix**: "96 markası seni arasında bulsun" → "96 markası arasından seni seçsin" (grammar). "retail" → "perakende" tutarlılık. Story alt text descriptive. Disclaimer eklendi (hikayeler temsili).
- **SAAS dil temizligi**: "Demo talep et" tüm instances → "Kurumsal hesap aç" (direct sign-up flow, demo panel login sonrası otomatik). "demo panel ve canlı havuz" → "yetenek havuzu ve işveren araçları".
- **Hakkımızda 2-split CTA fix**: Eski "Adaylar için" bloğu işveren copy'si içeriyordu ("Pasif yetenek havuzuna erişin") — ters eşleşme. Copy "Profilini oluştur, markalar seni bulsun" + tags ("Görünmez mod / Ücretsiz profil / Direkt marka mesajı") aday odaklı düzeltildi.
- **İletişim map placeholder**: Google Maps iframe yerine diagonal gradient + grid pattern + pulsing vermillion location pin + HQ info card. localhost + CSP güvenli.
- **Test**: Playwright 4 sayfa × light/dark × desktop 1440 + mobile 390 = 16+ view verify. Mobile hamburger açık doğrulandı (seg-toggle + linkler + Giriş).
- **Production integration**: shared-v2.css yeni bağımsız stylesheet (diğer sayfalar `shared.css` kullanmaya devam), assets/v2/ yeni namespace → mevcut `assets/` dokunulmadı → zero regression risk.

**Canlı uyari**: K-037 + K-038 production'daki real employer login flow'unu da etkiliyordu — her fresh load'da işveren #sirket'e zorlanıyor ve sirket kolonu undefined olduğu için onboarding döngüsünden çıkamıyordu. Bu commit gerçek işverenler için ilk kez gate release ediyor.

**Dosyalar (commitlere göre):**
- `3c88ad1`: `scripts/_supa-admin.mjs`, `scripts/seed-test-{user,employer,admin}.mjs`, `tests/helpers/runtime-signals.js`, `tests/smoke.runtime.{spec,e2e.spec,ik.e2e.spec,admin.e2e.spec}.js`, `tests/auth.setup.admin.js`, `docs/SECURITY-RUNBOOK.md`, `docs/CURRENT-STATE.md`
- `a8910e4`: `ik.html`, `admin.html`, `scripts/seed-test-employer.mjs`, `tests/smoke.runtime.{ik.e2e,admin.e2e}.spec.js`, `docs/CURRENT-STATE.md`
- `f8acd5c`: `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html`, `shared-v2.css`, `assets/v2/*.webp` (8), `mockups/v2/*` (source kept)

**Insight Session 79**: Mockup v2'nin production'a taşınmasında 2 kritik karar — (a) yeni `shared-v2.css` + `assets/v2/` namespace ayrimi (mevcut CSS + assets'e dokunmadan sıfır regression), (b) inline style'ların dark mode override'ı bloke edişi (6 step-p inline style `.step-p` class'a çıkarıldı — dark mode kontrast için bu pattern her yeni mockup'ta kritik). K-037 + K-038 ilişkisi ise "sessiz hata yutan `try/catch`" antipattern'ının klasik örneği: PostgREST 400 hatası sessizce null prof döndürüyordu, gate tek başına fixlenemez.

**Acik riskler / yarin:**
- **Canli UAT bekliyor**: Tuna yeni gün `hellotalent.ai` + `hellotalent.ai/hakkimizda.html` + `hellotalent.ai/iletisim.html` + `hellotalent.ai/yasal.html` production'da dark mode + mobile + hamburger test etsin.
- **Giriş sayfaları v2 redesign** — henüz yapılmadı (prod'da ayrı aday/ik sayfaları var). Sonraki mockup iterasyonu.
- **K-036 post-push regression smoke** — admin.html hash-restore production'da doğrulanmalı (bookmark paylaşım linki testi).
- **K-037 gerçek employer validasyon** — production'da mevcut hr_profile'lara sahip gerçek employer login → onboarding gate artık sessizce takılmıyor mu, onboarding_completed=true flow düzgün mü. Gerekirse DeepSeek audit (gerçek employer data etkileşimi).
- pre-existing `profil.ayarlar-toggles.e2e` 6 fail (sidebar-user-name race) — scope dışı ama ayrı sprint'te çözüm.
- Iletisim map iframe — canlıda Google Maps embed geri eklenebilir (localhost CSP engeli kalkar).
- Kim Bakti backend PVT-1..6 (K031) hala backlog.

### Session 78 (17 Nisan — Asama 78: K032 Faz 1 + Faz 2 Runtime Playwright Smoke Suite)

**Tek odak: K068b sinifi regresyonu yakalayan runtime smoke suite — Faz 1 (unauth boot) + Faz 2 (auth panel hash).**

**K032 Faz 1 — `tests/smoke.runtime.spec.js`:**
- 4 hedef sayfa: profil.html, ik.html, admin.html, coach-studio.html
- 2 tema (light+dark) × 2 viewport (mobile+desktop) = 16 test
- Auth mock yok (boot-time hata redirect oncesi firlar — K068b krurgusu)
- `page.on('pageerror')` + `page.on('console', msg=>error)` collector
- `page.addInitScript(localStorage.setItem('ht_theme_preference', theme))` navigate oncesi (profil-core.js:62 dogrulandi)
- `networkidle` timeout 15s + catch sadece `/Timeout|timeout/` (diger rejection throw)
- IGNORE: supabase/posthog/sentry/cloudflare+turnstile/redirect/CSP (raw network pattern'ler cikarildi — over-permissive filtre engellendi)
- REGRESSION: ReferenceError/TypeError/SyntaxError/Unexpected token/end-of-input/is not defined/Cannot read propert/is not a function
- Fingerprint kanit: shared.js sonuna gecici `window.__k032FingerprintMissingFn_zzz()` enjekte → TypeError yakalandi → restore, git diff bos. Sentry dev env SDK hatayi yakaladi (ders: gelecekte `page.evaluate(throw)` ile izole et).

**K034 Review (iki kisi pattern):**
- Spec: Codex (önceki turn). Filter listesi, REGRESSION regex, dark mode approach (addInitScript vs reload), faz 2 hazirligi.
- Implement: Claude (bu turn). 106 satirlik tek dosya.
- Review 1: Codex FAIL — (1) SyntaxError pattern eksik (K068b benzeri kirik script tag yakalanmaz), (2) `networkidle.catch(()=>{})` tum rejection'lari yutuyor, (3) filter over-permissive (raw Failed to fetch/NetworkError gercek bug'i maskeleyebilir).
- Fix: 3 madde uygulandi. REGRESSION genisletildi (+SyntaxError/Unexpected token/end-of-input). catch daraltildi (sadece Timeout). IGNORE daraltildi (raw network pattern'leri kaldirildi — 3rd-party domain regex zaten URL uzerinde yakaliyor).
- Review 2: PASS.

**K032 Faz 2 — Authenticated Panel Hash (aynı gun akşam):**
- `tests/smoke.runtime.e2e.spec.js` (109 satir) — profil.html 13 panel hash (genel/merkez/sirketler/kimbakti/mulakat/yetkinlik/firsatlar/inbox/bildirimler/ayarlar/premium/destek/profil) × 2 tema × 2 viewport = 52 test
- `scripts/seed-test-user.mjs` (~140 satir) — idempotent Supabase Admin API seed (auth.users create/update + candidates upsert, service_role key `.env.local`'de)
- Test user: kefelituna+k032@gmail.com, candidate id=77, profile_completed=true, is_active=true
- `tests/auth.setup.js` storageState → `playwright/.auth/candidate.json`
- `page.goto('/profil.html#' + hash)` fresh page, hashchange listener → switchPanel (user-flow gerçekçi)
- 1800ms panel lazy init bekleme
- IGNORE + REGRESSION Faz 1 ile AYNI (duplication kabul — 3. tüketici gelince helper modul)
- 52/52 yesil (e2e-desktop 2.6dk + e2e-mobile 2.9dk)

**K034 Faz 2 review:**
- Codex spec turu 2 kez "no output" döndü (subagent runtime hatasi şüpheli).
- Pragmatik çözüm: Claude self-spec (kısa internal plan) + implement + Codex review gate. K034 ruhu (iki kişi kontrolü) gate'te korundu.
- Codex review: PASS. Opsiyonel iyileştirmeler (ertelenen): (a) existing-user branch'ta role metadata heal + pagination limit, (b) 1800ms yerine lokator-bazli panel hazir sinyali, (c) hash→data-panel contract assert, (d) helper modul extraction.

**K032 Faz 3 — ik.html + admin.html Authenticated (aynı gun gece):**
- Faz 3A: `tests/smoke.runtime.ik.e2e.spec.js` 10 panel × 2 tema × 2 viewport = 40 test
- Faz 3B: `tests/smoke.runtime.admin.e2e.spec.js` 12 panel × 2 tema × 2 viewport = 48 test
- Test users: `tkefeli@peoplein.com.tr` (employer, Tuna şirket mail) + `admin+k032@peoplein.com.tr` (admin, yeni seed)
- Prod admin guard: `kefelituna@gmail.com` seed-test-admin.mjs'te hard-refuse
- `scripts/seed-test-employer.mjs` + `scripts/seed-test-admin.mjs` idempotent
- `tests/auth.setup.employer.js` + `tests/auth.setup.admin.js` ayrı storageState
- `playwright.config.js` 3 setup + 6 e2e project (e2e/e2e-ik/e2e-admin × mobile/desktop), testIgnore regex isolation
- Ortak password `2395857Tna2.` (`.env.local`, git-ignored)
- `scripts/seed-test-user.mjs` password min length 12→10
- **K035 karar entry:** Prod admin panel sertleştirme (MFA zorunlu, IP allowlist, short session, sudo re-auth, audit log, geo anomaly) — ayrı sprint backlog
- 88/88 yesil (ik desktop 1.3dk + admin desktop 1.8dk + mobile paralel ~1.7dk)

**Test sayisi:** 910 → 926 (+16 Faz 1) → 978 (+52 Faz 2) → 1066 (+88 Faz 3).

**Audit paketi (gece kapanis, commit `3668add`):**
- 2 paralel agent (feature-dev:code-reviewer + Explore husky-drift) + targeted regression
- Bulgular: 3 KRITIK + 4 ORTA + 3 LOW
- 2 KRITIK simdi fix:
  1. Husky `--no-stash`: lint-staged v16.4.0 `git stash --keep-index` partial staging durumunda unstaged dosyalari commit'e aliyordu (paralel tasarim session drift'i). 1 satir fix, backup stash devre disi.
  2. K-1 test_account flag: `seed-test-user.mjs` candidate metadata'ya `test_account: true` eklendi + `updateUserPassword` → `updateUser` rename (mevcut user'da da metadata sync).
- K-2/K-3 + O-1..O-4 Faz 4 backlog'a somut kapsamla gecti (~40 dk)
- Secret hijyen TEMIZ, Design Refactor Faz 1c (scope-drift 0c25753 icerik) sagliklı DRY
- Targeted regression smoke.runtime + p3.regression desktop: **479/479 yesil (7.2s)**
- Verdict: Orta borc → **Dusuk borc**

**Dosyalar:**
- YENI: `tests/smoke.runtime.spec.js` (Faz 1, 106 satir)
- YENI: `tests/smoke.runtime.e2e.spec.js` (Faz 2, 109 satir)
- YENI: `scripts/seed-test-user.mjs` (idempotent Supabase seed, ~140 satir)
- GUNCEL: `.env.local` (HT_TEST_EMAIL, HT_TEST_PASSWORD, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL — git-ignored)
- GUNCEL: `vault/06-kararlar/karar-defteri.md` K032 entry (Faz 1 + Faz 2 TAMAMLANDI)
- GUNCEL: `docs/CURRENT-STATE.md` backlog item 15 + 16 + Asama 78 session entry
- GUNCEL: `docs/AI-COLLAB.md` yeni entry'ler

**Insight K032:** Static katman (check-html-tags.sh pre-commit) + Runtime katman (Playwright boot smoke) + Panel katman (Faz 2 auth hash) + Kontrat katman (p3.regression) dört bacakli koruma. Static yapisal integrity, runtime unauth bootability, auth panel activation hatalari, kontrat surface area guarantees — her katman farkli sinif hata yakalar.

**Acik riskler / yarin:**
- Faz 3 (ik.html + admin.html tab iterasyon) — hr_profile test user seed gerekli (employer + admin role).
- Kim Bakti backend PVT-1..6 (K031) hala backlog.
- ~~Markalar grid hover glow dark mode visual confirm~~ — ✅ TAMAMLANDI (Tuna onayi, 18 Nisan 2026).
- Wizard hiring_boost drop sonrasi admin tooling smoke test.
- ~~**K-036 — admin.html hash-restore**~~ — ✅ TAMAMLANDI (18 Nisan 2026, Faz 4 asamasi 2). `showAdminDashboard` artik `window.location.hash` okuyup `switchPanel` ile hedef panele iniyor, bilinmeyen hash'lerde dashboard'a dusuyor. Tamamlayici `hashchange` listener browser geri/ileri + derin linklemeyi destekliyor. Faz 3B e2e K-2 assertion strict `panel-<hash>`'e donuldu.
- ~~**K-037 — ik.html onboarding gate broken-on-reload**~~ — ✅ TAMAMLANDI (18 Nisan 2026, Faz 4 asamasi 2). Gate `!hrProfile.sirket` (kolon SELECT'te yoktu) yerine `!hrProfile.company_id` kontrolune gecti. Save flow `link_employer_to_company` RPC'siyle `company_id` set ediyor; RPC basarisiz olursa gate kapali kalir (fail-safe). Test employer seed (`scripts/seed-test-employer.mjs`) artik `companies` tablosuna row ekleyip `hr_profile.company_id`'yi set ediyor, Faz 3A e2e K-2 strict hale dondu.
- ~~**K-038 — ik.html hr_profiles SELECT'te geçersiz kolon**~~ — ✅ TAMAMLANDI (18 Nisan 2026, K-037 regression testinde debug sirasinda kesfedildi). ik.html:2365 SELECT `avatar_url` kolonunu istiyordu ama hr_profiles tablosunda bu kolon hic yok. PostgREST 400 `column hr_profiles.avatar_url does not exist` donuyordu, hata `try{}catch(e){}` icinde sessizce yutuluyordu, `prof` null kaliyordu, `hrProfile` bos objede kaliyordu — K-037 gate fix'i bile bu yuzden hic islememis olurdu. SELECT listesinden `avatar_url` cikarildi (dosyada zaten tuketilmiyordu), eksik form-prefill kolonlari (sirket, sektor, buyukluk, web_sitesi, segment, merkez_sehir, magaza_sayisi, aciklama, aranan_profil, calisma_saatleri, linkedin, career_page_url, company_type) eklendi. Insight: K-037 ile K-038 tek commit — K-037 tek basina degildir, production'da ayni davranisi acikliyor.

### Session 77 (16-17 Nisan — Asama 77: K033 model swap + K034 two-person + Firsatlar rename + Bildirimler hero + Markalar redesign)

**Iki gunluk sweep: model routing degisikligi, calisma protokolu yeniden tanimi, 4 fazli Teklifler→Firsatlar rename, Bildirimler segment sadeligi, Markalar panelinde 5 ayri UX pass.**

**K033 — Opus 4.7 default implementation modeli**:
- `CLAUDE.md` Model Routing tablosu: implementation/plan/debug → Opus 4.7. Subagent default Sonnet kalir, sadece plan/mimari/implementation/debug icin Opus 4.7.
- Sonnet home session iletisim modeli (HelloTalent disi).
- `vault/06-kararlar/karar-defteri.md` K033 entry.

**K034 — Iki kisi pattern (zorunlu)**:
- Tuna: "her isi iki kisi yaptiginizda daha iyi oluyor". Hotfix dahil her commit Codex review'dan gecer.
- Feature/MVP: Codex plan + spec → Claude implement → Codex review (diff) → Tuna onay → push.
- Hotfix: Claude implement → Codex review (diff) → push (skip yok).
- Security/RLS/migration/data contract: + DeepSeek audit.
- Canli regression supheli: Gemini UAT once, kod sonra.
- `CLAUDE.md` Is Bolumu bolumu yeniden yazildi. K034 entry karar defterine.

**Admin announcement composer hardening (4 Codex pass)**:
- `admin-announcements.js` — hydrate existing media async IIFE (`hydratePromise` race guard, `mediaInput.disabled` during hydrate), aggregate `mediaErrors[]` -> alert, retry-safe `m.uploaded` flag (sadece DB insert success sonrasi), `existingRow.published_at` UPDATE sonrasi closure sync, `baseOrderIndex = max(order_index)+1` (throw on error).
- LinkedIn-style image editor: `htImageEditor.open()` Cropper.js 1.6.2, 16:9 aspect, output WebP 1600x900 quality 0.9.
- 4 pass review: Codex H1 (retry semantics) + H2 (4 iterasyon hydrate race) + FAZ D publish_at race + CHECK constraint backfill — hepsi cozuldu.

**FAZ A-D — Teklifler → Firsatlar rename**:
- FAZ A: Infrastructure rename + routing aliases (`#teklifler` → `#firsatlar`) + dead link audit.
- FAZ B: Editorial rewrite, `.frs-*` namespace, premium gate kaldirildi, `offer` + `employer_branding` filter.
- FAZ C: Migration `20260416120000` `ALTER TYPE campaign_type ADD VALUE 'store_opening', 'brand_story'`. Wizard hiring_boost dropped (is ilani yasak).
- FAZ D: Admin existing duyuru composer'dan firsat yayinlar (campaign_type optional column). Migration `20260417100000`: `ht_announcements.campaign_type` + named CHECK constraint + storage RLS SELECT (`ht_ann_storage_candidate_read`) + `get_firsat_announcements()` RPC + `get_announcements_feed` signature update. `profil-firsatlar.js` dual-source `Promise.all(fetchCampaigns, fetchFirsatAnnouncements)`, client-side `filterAllowed()` (no `.in()`, enum cast safety), `buildEmpty()` only failure UI (no error state, no demo cards).

**Gundem feed**:
- `.gb-item__headline` overflow-wrap + word-break + hyphens + parent shrink (`min-width:0`, `max-width:100%`).
- PAGE_SIZE 5 → 10. PAGE_SIZE+1 fetch ile hasMore detection. "Daha fazla goster" pill → `sessionStorage.setItem('ht_bildirim_tab','duyuru')` + `switchPanel('bildirimler')` deep link.
- Migration `20260417110000` `archive_stale_announcements()` SECURITY DEFINER + pg_cron daily 01:15 UTC. `published_at <= now() - 60d AND (pinned_until IS NULL OR pinned_until <= now())`. Pinned korunur.

**Bildirimler segment sadeligi (Tuna karar A)**:
- Toggle yanindaki `data-bildirim-count` + `data-duyuru-badge` DOM'dan kaldirildi.
- `updateHeroForMode(mode)` hero meta strip mode-aware (bildirim/duyuru ayri authoritative metric).
- `loadUnreadCount` re-renders hero when duyuru tab active. Cross-IIFE expose: `window._htUpdateBildirimHeroForMode`.
- `NOTIF_ROUTING` kampanya → firsatlar.

**Profil merkezi hero dark mode restore**:
- `mk-card--hero` dark mode `var(--editorial-card)` + `var(--editorial-hairline-strong)` (gorulebilir frame). Eskiden K068 drop ile transparent kalmisti.
- `layout.css` `mk-card:hover` dark mode vermillion border → `editorial-hairline-strong` ('inner card' illusion fix).
- `pp-exp__role` + `pp-ident__name` font-weight 700 → 600 (semibold okunabilirlik).

**Markalar paneli — 5 UX pass**:
1. Follow btn minimal pill (sag ust kose absolute, person SVG icon, "Takip Et" / "Takipte"). Default hairline, following solid vermillion. JS `_buildBrandCard` pill structure + `_updateAllFollowBtns` sadece label span.
2. Hover effect: bg-flood degil donen glow border. CSS `@property --sk-glow-angle` Houdini animatable angle, `::after` conic-gradient masked 1.5px ring, 2.4s linear infinite. Light vermillion glow, dark rgba(255,255,255,0.92).
3. Follow btn radius 999px → 10px (Tuna: hap kenarli olmus, standart kose).
4. Takip Ettiklerin strip aksanlari ilk vermillion → navy (Tuna: heroyu bolme), sonra Tuna: kart bg vermillion + yazilar beyaz tam invert iste. Logo chip'leri beyaz bg korundu (marka logolari okunaklilik).
5. Marka ara filter card bg navy + yazilar beyaz, search transparent + beyaz border, active underline 3px vermillion. Codex pass: dark mode token regression literal hex pin (`--editorial-vermillion` dark'ta `#E8845C` lighter peach'e kayiyordu, `--navy` dark'ta `#7B93C4`); count + hover opacity AA fail kaldirildi; search-wrap border alpha bump + focus-within ring.

**Insight K069 mimari karari**: K069 brand card pattern (`@property` + conic-gradient mask + literal hex theme pin) tema-agnostic brand identity sinyali tasiyor. Token-based renkler dark mode'da kayiyor — semantik invariant brand color (vermillion/navy) icin literal pin tercih edilir, semantic invariant olmayan (text/border/bg) icin token. Bu ayrim K079+ panellerinde de uygulanmali.

**Cache-bust kronolojisi (Markalar):** `20260417a` → `20260417j`. Truth-sync git hook her commit'te `docs/AI-COLLAB.md` co-staged.

**Gundem feed headline wrap pass2 (commit `eaba102`)**:
- Pass1'de `.gb-item min-width:0 + max-width:100%` + headline overflow-wrap:anywhere yetersizdi — uzun baslik ("Peoplein Insan Kaynaklari Yetenek Avini HelloTalent Araciligi ile Yapiyor") kartin cercevesini asiyordu.
- Root cause: `.gb-spine` (grid 1fr cell > .gb-gundem > .gb-spine > .gb-item) intermediate container min-width:0 eksikti. Grid min-content contribution headline tek-satir genisligini kabul ederek cell'i genisletiyordu.
- Fix: `.gb-spine { min-width: 0 }` + `.gb-item__headline { max-width: min(640px, 100%) }` (media/excerpt/body ile align editorial feed gorunumu). Cache-bust `20260417b` → `20260417c`.
- Tuna pozitif geribildirim: "markalar cok guzel duruyor" — vermillion+navy strip inversion pattern onaylandi, memory'ye kaydedildi (`feedback_strip_color_inversion.md`).

**Acik riskler / yarinin devam noktasi:**
- Tuna UAT bekliyor (yarin yeni gun mesajiyla baslayacak — vermillion followed + navy filter strip canlida nasil gozukuyor).
- Markalar grid kart hover glow effect dark mode visual confirm bekliyor.
- K032 Runtime Playwright smoke suite (vault karar defterinde) hala backlog.
- Kim Bakti backend PVT-1..6 (K031 vault) hala defer.
- Wizard hiring_boost dropped sonrasi admin tooling smoke test gerek.

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
