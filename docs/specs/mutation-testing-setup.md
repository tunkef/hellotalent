# Spec: Mutation Testing Setup (D6)

> **Tarih:** 2026-05-12 | **Tier:** T2 (test infrastructure) | **Status:** draft

## Context

Reform v3.4 P4.34 audit: mutation testing yok. Mevcut Playwright suite (70 test) bug yakalıyor mu doğrulanmamış. Mutation testing kodu küçük değişikliklerle "mutate" eder, testler bu değişiklikleri yakalıyor mu ölçer. Düşük mutation score = zayıf test coverage.

## Tool: Stryker Mutator

`@stryker-mutator/core` — JavaScript için en popüler mutation test tool. Vanilla JS projemiz için uygun.

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/playwright-runner
```

## Config

`stryker.conf.json`:

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "_comment": "Reform v3.4 D6 — vanilla JS mutation testing",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "command",
  "commandRunner": {
    "command": "npm test"
  },
  "coverageAnalysis": "off",
  "mutate": [
    "shared.js",
    "js/ik-pipeline.js",
    "js/ik-matching-engine.js",
    "js/ik-pos-list.js",
    "js/cookie-consent.js"
  ],
  "ignorePatterns": [
    "node_modules",
    "tests",
    "scripts",
    "_archive*"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "htmlReporter": {
    "fileName": ".stryker-tmp/mutation-report.html"
  }
}
```

## npm script

`package.json` ekleme:

```json
{
  "scripts": {
    "test:mutation": "stryker run",
    "test:mutation:dry": "stryker run --dryRunOnly"
  }
}
```

## CI integration

`.github/workflows/mutation-test.yml`:

```yaml
name: Mutation Testing (weekly)

on:
  schedule:
    - cron: '0 6 * * 6'  # Cumartesi 06:00 UTC
  workflow_dispatch:

jobs:
  mutate:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:mutation
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: mutation-report
          path: .stryker-tmp/
          retention-days: 30
```

## Verify

```bash
# Local dry-run (mutations listele, çalıştırma)
npm run test:mutation:dry

# Full mutation testing (5-15 dakika, mutation sayısına göre)
npm run test:mutation

# Rapor görüntüle
open .stryker-tmp/mutation-report.html
```

## Threshold yorumu

- **High ≥ 80%:** İyi — testlerin %80'i mutation yakalıyor
- **Low 60-80%:** Kabul edilebilir
- **Break < 50%:** CI fail — testler yetersiz

## İlk hedef (baseline)

İlk run sonrası mutation score'a göre öncelik:
- shared.js — kritik (auth, session)
- js/ik-pipeline.js — büyük, çok logic
- js/ik-matching-engine.js — match algoritma

Düşük score'lu modüller → daha fazla test yazılır.

## Apply

- [ ] Tuna onayla → `npm install --save-dev @stryker-mutator/core @stryker-mutator/playwright-runner`
- [ ] stryker.conf.json ekle
- [ ] package.json script ekle
- [ ] Workflow ekle
- [ ] İlk run → baseline rapor

## Approved? (Tuna)

- [ ] Onayla → Claude npm install + config setup yapsın
- [ ] Reddet
- [ ] Sadece config yaz, install Tuna manuel
