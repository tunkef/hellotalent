# Playwright Test Workflow — Local-First (Reform v3.4 D7)

> **12 May 2026.** Tuna direktifi: "Önce lokalda test, sonra commit + push." Bu doküman test pyramid'i ve workflow tier'larını tanımlar.

## Test envanteri (70 spec)

| Kategori | Sayı | Pattern | Çalışma süresi (yaklaşık) |
|---|---|---|---|
| **Smoke** | 4 | `tests/*smoke*.spec.js` | 30-60s — temel sağlık |
| **E2E (aday)** | ? | `tests/*.e2e.spec.js` (ik/admin hariç) | 2-5dk — full user journey |
| **E2E (employer)** | ? | `tests/*.ik.e2e.spec.js` | 2-5dk |
| **E2E (admin)** | 1 | `tests/*.admin.e2e.spec.js` | 1-3dk |
| **Unit-like** | 59 | tests/*.spec.js (e2e değil) | Toplam ~5-10dk |
| **Disabled** | 14 | `tests/_disabled_archive/` | — (re-write aday) |

Toplam aktif: 70 spec, browser matrix `mobile` + `desktop` (chromium only default; Safari/Firefox `PW_BROWSER_MATRIX=1` ile opt-in).

## Üç tier test workflow

### Tier 1: Pre-commit (hızlı, blocking)

**Hedef:** 30 saniye içinde sonuç. Sadece staged dosyalarla ilgili kritik smoke.

```bash
# .husky/pre-commit chain'inde otomatik
./scripts/test-staged-smoke.sh
```

Script staged dosyalardan dependency analiz eder, ilgili smoke test'leri çalıştırır:
- `css/`, `js/ik-*` değişimi → `pipeline-accordion-audit.spec.js`
- `profil.html` değişimi → `hellotalent.smoke.spec.js` (candidate flow)
- `ik.html` veya `hr-*.html` → `d2-8-smoke.ik.e2e.spec.js`
- Sadece doc/script değişimi → skip

Fail durumunda commit blok. Bypass: `SKIP_PRECOMMIT_TEST=1 git commit ...`

### Tier 2: Pre-push (orta, blocking)

**Hedef:** 3-5 dakika. Tüm smoke + son değişen feature için E2E.

```bash
# .husky/pre-push chain'inde
./scripts/test-pre-push.sh
```

Script:
- Tüm `*smoke*` spec'leri çalıştır
- Branch diff'inde değişen feature'lar için E2E (örn: kart redesign → pipeline E2E)
- Mobile + Desktop viewport
- Headless Chrome

Fail → push reject. Bypass: `SKIP_PRE_PUSH_TEST=1 git push ...`

### Tier 3: CI (yavaş, comprehensive)

**Hedef:** 15-30 dakika. Full matrix + Safari + Firefox + visual regression.

`.github/workflows/playwright.yml` (mevcut) — push main + PR'da otomatik.

- Tüm 70 spec
- 7 project (mobile, desktop, e2e-{mobile,desktop}, e2e-ik-{mobile,desktop}, e2e-admin-{mobile,desktop})
- Browser matrix opt-in (PW_BROWSER_MATRIX=1)
- Visual regression snapshot diff (15 snapshot)

## Local-first commands

```bash
# Hızlı smoke (pre-commit equivalent)
npm run test:smoke

# Specific feature smoke
npx playwright test tests/pipeline-accordion-audit.spec.js

# E2E aday session
npm run test:profil-delegation
npm run test:profil-ayarlar-e2e

# Full local (CI öncesi)
npm test

# Browser matrix (Safari + Firefox dahil)
PW_BROWSER_MATRIX=1 npm test

# Headed mode (debug)
npx playwright test --headed --debug
```

## Audit bulguları

🟢 **İyi olan:**
- 70 spec — kapsamlı
- E2E auth setup (candidate, employer, admin) ayrı
- Mobile + Desktop viewport default
- Visual regression baseline mevcut (15 snapshot)

🟠 **İyileştirme gerekenler:**
- **Test çalışma süresi metriği yok** — hangi test ne kadar sürüyor bilinmiyor
- **Browser matrix opt-in default off** — Safari users coverage düşük
- **Pre-commit'te test yok** (mevcut: sadece lint + cachebust). Local-first eksik
- **Test data hygiene** — seed-test scripts production guard var ama Playwright'ın hangi DB'ye yazdığı belirsiz
- **Flaky test detect** yok — retries config 0
- **Test parallelization** yok — sequential çalışıyor

🔴 **Riskli:**
- 14 disabled test (P1-P7 audit'te archive'a taşındı, re-write planlanıyor)
- HR Hub (Asama 86) sonrası test coverage gap (11 disabled hr-* test re-write)

## Önerilen aksiyon planı

### Faz 1 — Local-first workflow (hemen)

1. **`scripts/test-staged-smoke.sh` yaz** — staged dosyalardan dependency map + minimal smoke run
2. **`scripts/test-pre-push.sh` yaz** — branch diff bazlı E2E selection
3. **`.husky/pre-commit` chain'e ekle** — `SKIP_PRECOMMIT_TEST` bypass
4. **`.husky/pre-push` chain'e ekle** — `SKIP_PRE_PUSH_TEST` bypass
5. **package.json scripts** — `test:smoke`, `test:pre-push`, `test:full` net ayrım

### Faz 2 — Quality iyileştirme

6. **Retries config** — `retries: 1` (CI), `retries: 0` (local)
7. **Parallelization** — `workers: 4` test config
8. **Flaky detect** — Playwright report'ta retry yapan testleri haftalık raporla
9. **Test timing metric** — her test için ortalama süre tracking
10. **HR Hub disabled test re-write** — 11 test yeni surface'e göre

### Faz 3 — Coverage genişletme

11. **Safari default on** — PW_BROWSER_MATRIX default true (TR Apple kullanıcı oranı yüksek)
12. **Visual regression genişlet** — yeni feature'lar için screenshot
13. **Accessibility integration** — axe-core Playwright integration (WCAG audit)
14. **Mutation testing** (D6 spec) — testlerin kalitesini ölç

## Apply

Faz 1 hemen uygulanabilir. Bu commit'te `scripts/test-staged-smoke.sh` + `scripts/test-pre-push.sh` yazılıyor.

Faz 2 + 3 Tuna onayı + zaman.
