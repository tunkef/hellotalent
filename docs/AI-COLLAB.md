# HelloTalent AI-COLLAB — Aktif Calisma Defteri

> Bu dosya yalnizca aktif is, son kararlar, acik riskler ve bir sonraki net adimi tasir.
> Kapanmis asamalar: `docs/ai-collab/AI-COLLAB-archive-asama1-61.md`
> Dosya buyudugunde (500+ satir) yeni arsiv dosyasina tasinir.

## Mevcut Durum

**Son tamamlanan:** Asama 74 (10 Nisan 2026) — F1/F2/F3 Critical Fixes + Hotfix
**Son commit:** 4b52925 — brand logos signed URL + cover image relative path fix
**Test durumu:** 28/28 F1/F2/F3 PASS, 325/336 regression (11 pre-existing)
**Beta Launch Paketi:** TAMAMLANDI (Asama 48-61)
**Landing Page Redesign:** TAMAMLANDI (Asama 63)
**Public-Site Redesign:** TAMAMLANDI (Asama 69)
**UX Polish + Footer + Yasal:** TAMAMLANDI (Asama 70)
**Page Cleanup + K029 + Security:** TAMAMLANDI (Asama 71)
**Unified Landing Page:** TAMAMLANDI (Asama 72)

## Tamamlanan Bloklar

| Blok | Asamalar | Durum |
|------|----------|-------|
| Tekrar eden hata guard'lari | 48-49 | ✅ ESLint, truth-sync, RLS, migration template |
| Beta Premium Gate | 50-52 | ✅ AI 1-use, badge, One Cikar aktif |
| CV ATS Optimizasyonu | 53 | ✅ 6 global standart uygulandı |
| Marka Gorselleri + Redesign | 54-56 | ✅ 31 gorsel, informative card v2 |
| Teklifler Beta Vurgusu | 57 | ✅ Premium badge + beta notu |
| Egitim Dashboard | 58-59 | ✅ Rozet tooltip, ilerleme karti |
| HT Info Revizyon | 60-61 | ✅ Center feed + left rail compact |
| Landing Page Redesign | 63 | ✅ Gate + dual LP, dark mode, 397 test PASS |
| Public-Site Redesign | 69 | ✅ 5 sayfa Clatu-first editorial, QA 196 PASS |
| UX Polish + Footer + Yasal | 70 | ✅ Gate fade, footer 3-kolon, yasal.html 4-tab |
| Page Cleanup + K029 + Security | 71 | ✅ Asagida detay |

### Asama 71 Detay (8 Nisan 2026)

**7 commit, 50+ fix, 4500+ satir silindi:**

1. `1d53fc6` — Page cleanup: 9 orphan sayfa silindi, gate logged-in redirect, email template polish, yasal link guncelleme, sitemap genisleme
2. `82cd2cb` — K029 Layer 1 (Security): XSS escape, X-Frame-Options, CORS restrict, telefon/email/sifre validation, innerHTML sanitize, PII logging, noopener, robots.txt
3. `fe13e5a` — K029 Layer 2+3 (Code Quality + A11y): preconnect, dead code, SVG CLS, INP fix, query limits, font cleanup, explicit select, work_prefs dedup, modal dialog roles, aria-labels, Escape handler, sidebar keyboard
4. `645f422` — Admin builder dedup + unused gate assets cleanup (386KB)
5. `b2aff82` — Studio CSS extraction (890 satir → css/studio.css) + modal focus trap (profil/ik/giris)
6. `3a27138` — Security hardening: CV signed URLs, employer PII strip, password policy, CSP, hr_profiles guard
7. Dashboard: cvs bucket private yapildi (manuel)

**Edge Functions deploy:** 4 fonksiyon (content-moderate, cv-optimize, journal-feedback, translate-text) CORS fix ile deploy edildi.
**DB Migrations deploy:** 2 migration (sec_strip_employer_pii + sec_hr_profiles_guard) production'a uygulandi.

## Pipeline Infra (2 Nisan 2026)

- Codex plugin: ✅ kurulu (codex review, codex exec)
- Supabase MCP: ✅ OAuth bagli
- Telegram bot: ✅ aktif (daily ritual, devam/onay flow)
- Autopilot: ❌ kaldirildi (Codex plugin yerini aldi)
- DeepSeek review: ✅ 3x retry, deepseek-chat model
- Cerebras review: ✅ STEP_RESULTS tracking
- 66 BATS infra test: ✅ PASS

## Acik Riskler / Blocker

1. Playwright smoke flaky — Cloudflare Access arkasinda, local server ile test ediliyor
2. iyzico entegrasyonu — DEFER (beta 3 ay boyunca ucretsiz)

## Guvenlik Durumu (9 Nisan 2026)

| Alan | Durum |
|------|-------|
| Sifreler (bcrypt) | ✅ GUVENDE |
| Sifre politikasi (8+ karakter, complexity) | ✅ GUVENDE |
| Aday↔Aday izolasyonu (RLS) | ✅ GUVENDE |
| CV/Avatar dosyalari (signed URL + private bucket) | ✅ GUVENDE |
| Isveren PII erisimi (RPC wrapper strip) | ✅ GUVENDE |
| Admin paneli (admin_users guard) | ✅ GUVENDE |
| CSP header (tum sayfalar) | ✅ GUVENDE |
| X-Frame-Options (clickjacking) | ✅ GUVENDE |
| CORS (origin restrict) | ✅ GUVENDE |
| hr_profiles INSERT guard | ✅ GUVENDE |
| is_employer() onboarding check | ✅ GUVENDE |
| CSRF (JWT mimari) | ✅ GUVENDE |
| SQL injection (parametrize) | ✅ GUVENDE |
| Role tampering (app_metadata + guard trigger) | ✅ GUVENDE |
| KVKK consent audit log (server-side timestamp) | ✅ GUVENDE |
| Registration rate limit (3/5dk) | ✅ GUVENDE |
| Password reset cooldown (60s) | ✅ GUVENDE |
| Remember-me storage isolation | ✅ Checkbox kaldirildi (dead code temizlendi) |
| Bot korumasi (Turnstile + honeypot) | ✅ GUVENDE |
| hr_profiles.onboarding_completed | ✅ DUZELTILDI (eksik kolon eklendi) |

## Bir Sonraki Adim

**Asama 72 — Unified Landing Page: TAMAMLANDI (9 Nisan 2026)**

**Yapilan isler:**
| # | Gorev | Durum |
|---|-------|-------|
| ULP-1 | index.html: Gate → tek LP, Adaylar/Kurumsal segment toggle (bunq referans) | ✅ |
| ULP-2 | shared.js header/footer/mobile nav → index.html#adaylar / #kurumsal, SPA-like hash nav | ✅ |
| ULP-3 | aday.html + isveren.html → 3-katmanli redirect (meta+canonical+JS), sitemap, 4 test dosyasi adapte | ✅ |
| ULP-4 | Sub-page link guncelleme (hakkimizda/iletisim/giris), copy review | ✅ |
| ULP-5 | Test port tutarsizliklari fix (8888/3001→relative), selector scope, 1218/1221 PASS (3 bilinen auth) | ✅ |
| ULP-6 | 7 mockup + backup sil, .gitignore (.firecrawl/, qa-screenshots/), cache-bust birlestir | ✅ |

**Degisen dosyalar:** shared.js, index.html, aday.html (redirect), isveren.html (redirect), hakkimizda.html, iletisim.html, giris.html, sitemap.xml, .gitignore, 4 test dosyasi (smoke/qa-public-pages/gate-qa/responsive-qa)

**Test durumu:** 1218 PASS / 3 fail (bilinen: auth env var eksik)

**Asama 73 — Auth Pages Split: TAMAMLANDI (9 Nisan 2026)**

**Yapilan isler:**
| # | Gorev | Durum |
|---|-------|-------|
| T1-2 | uye-ol.html olusturuldu (aday + kurumsal kayit formlari) | ✅ |
| T3-4 | JS: tab switch, validation, phone format, strength, signUp, OAuth | ✅ |
| T5 | demo-dashboard-ik.html kurumsal demo placeholder | ✅ |
| T6 | giris.html: kayit formlari cikarildi, IK→Kurumsal, logo .ai kaldirildi | ✅ |
| T7 | shared.js login modal + index.html CTA'lari uye-ol.html'e | ✅ |
| T8 | profil-bootstrap: employer→demo routing, wizard pre-fill (full_name+phone) | ✅ |
| T9-10 | sitemap, auth-pages testleri (32 yeni), cache-bust, full test | ✅ |

**Yeni dosyalar:** uye-ol.html, demo-dashboard-ik.html, tests/auth-pages.spec.js
**Test durumu:** 1250/1253 PASS (3 bilinen: auth env + dark-mode)

**Asama 73b — Security Hardening + Bot Protection (9 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| SEC-1 | role → app_metadata (2 DB trigger + backfill + 8 dosya) | ✅ |
| SEC-2 | Registration rate limit (3/5dk) | ✅ |
| SEC-3 | KVKK consent_log tablosu + server-side trigger | ✅ |
| SEC-4 | ik.html app_metadata role check | ✅ |
| SEC-5 | Remember-me race condition fix (simdilik devre disi) | ✅ |
| SEC-6 | Password reset 60s cooldown | ✅ |
| BOT | Cloudflare Turnstile (invisible) + honeypot + Edge Function | ✅ |

**Asama 73c — Mobil UX + Landing Page Polish (9 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| MX-1 | Mobil header 2 satir → toggle hero icine gomulu | ✅ |
| MX-2 | Desktop toggle header'da, mobil hero'da (responsive split) | ✅ |
| MX-3 | Landscape hero kompakt + gorsel kucultme | ✅ |
| MX-4 | Sticky header fix (overflow-x:clip) | ✅ |
| MX-5 | Adaylar brand social proof section | ✅ |
| MX-6 | Kurumsal CTA gorsel (mulakat illustrasyon) | ✅ |
| MX-7 | Section renk alternani (beyaz/warm) | ✅ |
| MX-8 | "Kimler icin?" label | ✅ |

**Critical Bug Fix (9 Nisan 2026)**
- `hr_profiles.onboarding_completed` eksik kolon → `is_employer()` RLS kiriliyordu → tum candidates SELECT 400 → profil yuklenemiyordu. Kolon eklendi, mevcut employer'lar true set edildi.

**Asama 74 — F1/F2/F3 Critical Fixes (10 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| F1-1 | signStorageUrl + signStorageUrls helper (shared.js) | ✅ |
| F1-2 | coach-studio avatar/cover: getPublicUrl → path + signStorageUrl | ✅ |
| F1-3 | Coach avatar rendering signed (profil-genel + admin-coach-content) | ✅ |
| F1-4 | ik.html candidate avatar signed | ✅ |
| F1-5 | profil-preview.js avatar signed | ✅ |
| F1-6 | DB migration: strip broken full URLs to storage paths | ✅ |
| F2 | "Beni Hatirla" checkbox removed (dead code) | ✅ |
| F3-1 | CSP: wss:// added to connect-src (13 pages) | ✅ |
| F3-2 | CSP: Sentry ingest domain fixed (profil.html) | ✅ |
| F3-3 | CSP: Google Maps frame-src added (iletisim.html) | ✅ |
| F3-4 | CSP: Dead Sentry entries removed from 12 non-Sentry pages | ✅ |

**Degisen dosyalar:** shared.js, coach-studio.html, profil-genel.js, admin-coach-content.js, ik.html, profil-preview.js, giris.html, profil-markalar.js, 13 HTML (CSP), 1 migration, 1 test dosyasi
**Test durumu:** 28/28 F1/F2/F3 tests PASS, 325/336 regression (11 pre-existing fail)
**Yeni dosyalar:** tests/f1-f2-f3-fixes.spec.js, supabase/migrations/20260410165047_fix_coach_avatar_urls.sql

**Hotfix (10 Nisan 2026, post-deploy):**
| # | Gorev | Durum |
|---|-------|-------|
| HF-1 | signStorageUrl legacy full URL handling (prefix strip) | ✅ |
| HF-2 | Brand cover image: relative path regex engeli kaldirildi (line 276) | ✅ |
| HF-3 | Brand logos: batch signing eklendi (signStorageUrls) | ✅ |

**Acil fix yok**

**Sonraki asamalar:**
- **Pozisyon gorunum/esleme metrikleri** — DEFER
- **iyzico/Stripe checkout** — DEFER (beta 3 ay ucretsiz)
