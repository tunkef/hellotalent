# HelloTalent AI-COLLAB — Aktif Calisma Defteri

> Bu dosya yalnizca aktif is, son kararlar, acik riskler ve bir sonraki net adimi tasir.
> Kapanmis asamalar: `docs/ai-collab/AI-COLLAB-archive-asama1-61.md`
> Dosya buyudugunde (500+ satir) yeni arsiv dosyasina tasinir.

## Mevcut Durum

**Aktif is:** K030 FAZ B APPROVED post-push (Codex gate GO). 24h gozlem basliyor.
**Sonraki:** 24h gozlem + Gemini UAT runtime smoke → FAZ C (migration + duyurular feed)
**Son commit:** f4a93e6 (sub-10px fix) — 12 commit FAZ B serisi canlida
**FAZ B ozet:** 13 dosya (+591/-56), 1293/1293 regression PASS, 18/18 FAZ B test PASS
**DeepSeek:** 0 blocker (1 false positive icon mapping)
**Runtime smoke:** YOK (subagent browser yok, Gemini UAT'a birakildi)
**Spec:** docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md
**Plan:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md

## 2026-04-13 — K030 FAZ B Post-Push Stage-Gate

### Verdict: APPROVE
- `bbc6f67`→`f4a93e6` sirasi, ROUND 3 onayli 12-adim FAZ B exec dizisini birebir izliyor.
- `59eb008`, push sonrasi AI-COLLAB guncellemesi; son kod degisikligi halen `f4a93e6`.
- `shared.js` freeze flag'i IIFE oncesinde tek otorite olarak tanimli.
- `profil-wizard.js` panel-mulakat icinde Yakinda mount ediyor, iki nav'i aktifliyor, breadcrumb'i degistiriyor.
- `profil-genel.js` ve `profil-studio.js`, Studio'ya donen tum CTA koprulerini ayni flag ile kapatiyor.
- `profil.html`, `admin.html`, `coach-studio.html` ve test spec'i plan override ile uyumlu.

### Spot-check results
- freeze flag in `shared.js`: ✓
- `profil-wizard.js` freeze mount: ✓
- dual nav active: ✓
- breadcrumb ternary: ✓
- `profil-genel.js` CTA gates (3 sites): ✓
- `profil-studio.js` overlay gates (3 sites): ✓
- `profil.html` wiring + chips + cache-bust: ✓
- `admin.html` disable + early return: ✓
- `coach-studio.html` redirect: ✓
- test spec source-content only: ✓

### Outstanding risks
- Runtime smoke not performed (no browser); Gemini UAT pending
- Dark mode visual not verified
- Playwright rerun burada sandbox webServer bind izni nedeniyle yapilamadi

### Go/no-go for FAZ C start
GO for FAZ C after 24h observation

### Recommended 24h observation checks
1. `profil.html#mulakat` ve `profil.html#yetkinlik`, ayni Yakinda panelini aciyor ve iki nav da aktif kaliyor mu?
2. `admin.html` Studio Modulleri inert kaliyor, `coach-studio.html` ise `profil.html#mulakat`a yonleniyor mu?

## 2026-04-13 — K030 FAZ B exec tamamlandi

### Degisen dosyalar
- `shared.js` — freeze flag `window._HT_STUDIO_FROZEN = true` (top, pre-IIFE)
- `panel-soon.js` (yeni) — `_htRenderPanelSoon(rootEl)` + 4 kart + inline SVG
- `css/panel-soon.css` (yeni) — BEM-lite, dark mode, mobile, reduced-motion
- `profil-wizard.js` — freeze mount @ `mulakat`, dual-nav active, breadcrumb `Stüdyo - Yakinda`
- `profil-genel.js` — 3 CTA gated (header practiceBtn+seeAll, card practiceBtn, openArticleInCoach panel switch removed)
- `profil-studio.js` — 3 bridge appendChild sites gated (FAZ 4C bridge, related_role bridge, general bridge); like button intact
- `profil.html` — panel-soon.css/js wire, `ht-chip--soon` on nav-mulakat + nav-yetkinlik, `?v=20260413a` on shared/profil-studio/profil-genel/profil-wizard/components.css/panel-soon
- `css/components.css` — `.ht-chip--soon` variant
- `admin.html` — studio-modules `is-disabled` + `aria-disabled` + chip + switchPanel early-return
- `coach-studio.html` — top-level redirect script to `profil.html#mulakat`
- `tests/faz-b-freeze.spec.js` (yeni) — 9 source-content testi

### Test durumu
- `npx playwright test tests/faz-b-freeze.spec.js --reporter=list` → **18/18 passed** (9 test × desktop+mobile projects), 876ms
- FAZ A source-content guard intact (FROZEN banner + stub).

### Riskler / acik noktalar
- `docs/AI-COLLAB.md` pre-existing uncommitted edit bu commit oncesinde vardi; FAZ B exec'e dokunulmadi (korundu).
- `profil-genel.js` `openArticleInCoach()` icinde `setTimeout` + `switchPanel('mulakat')` cagrisi **kaliciyen kaldirildi** (unfreeze'de de panel switch yapilmayacak). Plan'in direktifi boyleydi — unfreeze'de tekrar degerlendirilmeli.
- Runtime smoke henuz kosulmadi (source-content tests yesil, DOM render Tuna/Claude tarafindan dogrulanmali).
- `panel-soon.js` tabindex=-1 yaptigi icin cards klavye fokuslanamiyor; bu freeze donemi icin kasitli.
- Prod push yapilmadi (parent yapacak).

### Bir sonraki net adim
1. DeepSeek review (`scripts/deepseek-review.sh`).
2. Full `npx playwright test --reporter=list` regression.
3. Push `origin main` (parent yetkisiyle).

## 2026-04-13 — K030 Codex Re-Review ROUND 3 (post-wording-fixes)

### Verdict: APPROVE

### Wording fix status
- A (count 5): ✓ — `5 additional edits` yaziyor.
- B (freeze flag binding): ✓ — Tek flag, `shared.js` tanimi, alias yok.
- C (RE-5 Option A): ✓ — Option A binding acik, Option B reddedilmis.
- D (override authority): ✓ — Override authoritative, task bodies audit trail only.

### Remaining gaps (if any)
- Yok.

### Go/no-go for FAZ B execution
GO

### If GO, recommended exec sequence
1. `shared.js`e `window._HT_STUDIO_FROZEN = true;` ekleyin.
2. `profil-wizard.js:273,277-280,308` freeze mount ve dual-nav active durumunu uygulayin.
3. `profil-genel.js`te B3.6 CTA gizleme ve route duzeltmesini yapin.
4. `profil-studio.js:2235,2264,2277` appendChild cagrilarini freeze flag ile gate edin.
5. `profil.html` asset `?v=` bump ve B6/B7 test duzeltmelerini tamamlayin.

## 2026-04-13 — K030 Codex Re-Review (post-RE-1..RE-5)

### Verdict: NEEDS-CHANGES

### RE-1..RE-5 status
- RE-1 (B4 stop both loaders): ✓ — Override targets both loaders; `Task B3` below still points at `profil.html switchPanel`.
- RE-2 (B3.6 Genel coach CTAs): ✓ — Override covers header CTAs, card CTA, and `openArticleInCoach()` route.
- RE-3 (B3.7 Studio coach detail CTAs): ✓ — Override covers both overlay practice CTAs at `profil-studio.js:2232-2276`.
- RE-4 (B6/B7 fixes): ✓ — Override fixes selector and test direction; lower examples remain stale.
- RE-5 (alias UX + cache-bust): ✗ — Default Option A is not bound; cache-bust steps stay implicit.

### Remaining gaps (if any)
- Change `plan:394` from `4 additional edits` to `5 additional edits`.
- Rewrite `Task B3` to patch `profil-wizard.js:308`, not `profil.html switchPanel`.
- Add concrete `B3.6` and `B3.7` task bodies below the override.
- Rewrite `Task B6` examples to `.nav-item[data-panel="studio-modules"]`.
- Rewrite `Task B7` as source-content tests; remove `loginAs*` and `[data-tab="studio"]`.
- Bind RE-5 to Option A explicitly: activate `#nav-mulakat` and `#nav-yetkinlik`.
- Pick one freeze flag: `window._HT_STUDIO_FROZEN = true` across both files.
- Change `B1` sample `<h1>` to `<h2>` to match binding Q2.
- Add explicit `?v=` bump steps for all touched assets.

### GO / BLOCKED
BLOCKED

### Recommended FAZ B exec order (if GO)
1. N/A — blocked pending plan cleanup.

**Aktif is:** K030 FAZ A APPROVED (canli) + FAZ B plan NEEDS-CHANGES (override landed, exec blocked)
**Sonraki:** Plan cleanup (B1/B3/B6/B7 + flag/RE-5 bind) → Codex re-review → FAZ B exec
**Son commit:** 837f2bf (CODEX STAGE-GATE OVERRIDE)
**Spec:** docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md
**Plan:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md

## 2026-04-13 — K030 Codex Stage-Gate Verdict (FAZ A + FAZ B plan)

### FAZ A verdict: APPROVE
- `b67dfd9`, `91398ea`, `320feb5` only touch claimed files and scopes.
- `profil-studio.js:1-15,1668-1674,4386-4388` are comment/stub-only; no in-repo `_htGenelCoachTeaser` caller found.
- `profil-wizard.js:308` is unchanged; FAZ A leaves end-user DOM/network paths untouched.
- `tests/faz-a-decouple.spec.js` exists; local run blocked by `playwright.config.js:4-9` webServer bind permission.
- `profil-studio.js:1-15,1668-1674` banners are static comments; no re-freeze guard flag or early return exists.

### FAZ B plan refinement verdict: NEEDS-CHANGES
- `REFINEMENT NOTES` refs match live repo: `profil.html`, `profil-wizard.js`, `admin.html`, `coach-studio.html`, CSS refs.
- B9 drop, B3.5 add, B5 reduce are correct against `profil.html:218-225,402-419`.
- `profil-wizard.js:308` still calls `_htLoadYetkinlik`; B4 must stop both loaders, not only Studio.
- `profil-genel.js:770-776,924-930,991-997` keeps live coach-to-Studio routes; FAZ B plan does not neutralize them.
- B6/B7 bodies stay stale: `data-tab="studio"` and missing auth helpers contradict `admin.html:356-359` and notes.

### Answers to 5 open questions
- **Q1 (mount point):** Replace/mount inside `#panel-mulakat`; `profil-wizard.js:269-270` targets that shell, so a new sibling panel is wrong.
- **Q2 (heading level):** `h2`; `profil.html` has no `<h1>`, and panel titles are sectional surfaces (`profil.html:1102,1144,1160,1224,1553`).
- **Q3 (cache-bust):** Yes; `profil.html:56-63,1671-1694` uses `?v=YYYYMMDDx` on CSS and JS tags.
- **Q4 (yetkinlik bridge):** Freeze the route, keep the bridge export; stop `_htLoadYetkinlik` at `profil-wizard.js:308`, keep `profil-yetkinlik.js:740-741`.
- **Q5 (breadcrumb label):** Change; `profil-wizard.js:273` should say `Stüdyo - Yakinda` while the panel is frozen.

### Additional gaps Claude missed (if any)
- `profil-wizard.js:277-280` activates only `data-panel="mulakat"`; `#nav-yetkinlik` never stays active after alias normalization.
- `profil-studio.js:2232-2276` detail overlay still exposes live practice CTA paths after freeze.
- `profil.html:56-63,1671-1694` versioned assets mean touched files/new assets need fresh `?v=` bumps.
- `profil-studio.js:9` says bottom-nav chip exists, but `profil.html:402-419` has no Studio bottom nav.

### Go/no-go for FAZ B execution
BLOCKED — fix B4 loader removal, Genel coach CTA paths, B6/B7 stale task bodies, and cache-bust/alias UX first.

### Required edits before FAZ B
1. Rewrite B4 around `profil-wizard.js:308` to render the soon state and remove both `_htLoadStudio` and `_htLoadYetkinlik`.
2. Add a FAZ B task for `profil-genel.js:770-776,924-930,991-997` and `profil-studio.js:2232-2276` CTA/detail freeze handling.
3. Replace B6/B7 stale examples with `admin.html:356-359` `.nav-item[data-panel="studio-modules"]` and source-content tests, not `data-tab` or missing auth helpers.
4. Define alias UX and shipping hygiene: update `profil-wizard.js:273,277-280` and bump touched/new asset `?v=` values in `profil.html`.

**Aktif is:** K030 FAZ A push edildi (5 commit, GitHub Pages canli) + FAZ B plan refined
**Sonraki:** Codex stage-gate review FAZ A → onay → FAZ B exec subagent dispatch
**Codex rapor:** FAZ A detaylari asagida — onay sonrasi FAZ B basla
**Plan refinement:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md icine FAZ B REFINEMENT NOTES bolumu eklendi (8 kritik bulgu + final-form tokens)

## 2026-04-13 — FAZ B Plan Refinement (subagent x2)
- **Subagent #1 (code-architect, opus):** B1-B10 audit. 8 kritik bulgu:
  - switchPanel profil-wizard.js'te (B4 hedef hatali)
  - bottom nav phantom (B5 no-op)
  - #nav-yetkinlik mulakat'a alias (B3.5 yeni task)
  - B9 zaten yapildi (FAZ A FROZEN banner)
  - B5 noindex/robots zaten present (sadece redirect kaldi)
  - test helpers yok (source-content fallback)
  - admin scoped chip style gerek
  - dispatcher line 847 guard
- **Subagent #2 (code-architect, opus):** panel-soon.js + css final-form kod.
  - Semantic tokens (--bg-surface, --text-primary, --accent vb)
  - BEM-lite double-underscore (.ht-soon__card)
  - DOM createElement (innerHTML yok)
  - tabindex=-1 non-interactive
  - Reduced-motion gated
- Plan dosyasi guncellendi: REFINEMENT NOTES section eklendi (line 311+)
- Original B1-B10 task body'leri korundu (audit trail) ama notes override eder

## 2026-04-13 — K030 FAZ A Codex Brief
**Yapilan is:**
- profil-studio.js: file-top FROZEN banner + cross-link maps dormant banner + _htGenelCoachTeaser noop stub
- tests/faz-a-decouple.spec.js: 5 kaynak-icerik test (10 pass, desktop+mobile)
- DeepSeek review: 0 kritik, 0 yuksek, 2 orta + 3 dusuk → 2 orta fix uygulandi (var pattern + toContain assertions)
- Full regression: 1277 pass, 14 fail (HEPSI pre-existing, studio/coach disi), 0 K030 kaynakli

**Degisen dosyalar:**
- profil-studio.js (+28 -4 satir, logic yok, sadece comment banner + stub literali)
- tests/faz-a-decouple.spec.js (+48 yeni)
- docs/AI-COLLAB.md (bu dosya)

**Test durumu:**
- K030 FAZ A suite: 10/10 PASS
- Full regression: 1277 PASS, 14 pre-existing fail (auth.setup env, dark-mode pre-paint, LP segment toggle, kurumsal brand viewport'lari)
- 0 yeni regresyon

**Riskler / blocker'lar:**
- Yok. Runtime path degismedi. User-visible degisiklik YOK.
- Intermediate state: Studio paneli hala acilir, Koc feed Genel'de hala calisir.

**Sonraki net adim:**
- Codex onayiyla push → GitHub Pages deploy → 24h gozlem
- Gozlem sonrasi FAZ B: panel-soon.js + switchPanel guard + sidebar/bottom nav chip + coach-studio.html noindex
**Spec:** docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md
**Plan:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md

## 2026-04-13 — K030 FAZ A TAMAMLANDI
- profil-studio.js: file-top FROZEN banner + cross-link maps dormant + _htGenelCoachTeaser noop stub
- tests/faz-a-decouple.spec.js — 5 kaynak-icerik test (desktop+mobile = 10 pass)
- User-visible degisiklik: YOK (intermediate state)
- Risk: 0 (runtime path degismedi, dead-code stub, orijinal kod korundu)
- Commit: b67dfd9 (A1-A3), next commit (A4 test + A5 checkpoint)
- Next: push → 24h gozlem → FAZ B (panel-soon.js + switchPanel guard)

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
