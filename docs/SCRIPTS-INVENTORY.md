# Scripts Inventory — HelloTalent Studio v3.3

> **Reform 11 May 2026.** `scripts/` altındaki 27 script statüs envanteri. Dead code temizliği + dokümante kullanım. Haftalık `weekly-maintenance.sh` (launchd) bu inventory'yi günceller.

## Status legend

- ✅ **ACTIVE** — pre-commit/post-commit/pre-push chain'inde otomatik çalışır
- 🕐 **CRON** — launchd cron ile haftalık/günlük çalışır
- 🖐 **MANUAL** — Tuna veya agent elle çağırır
- 💀 **DEAD** — kullanım yok, sil aday
- 🔧 **HELPER** — başka script tarafından çağrılır

## Pre-commit chain (`.husky/pre-commit`)

| Script | Status | Görev |
|---|---|---|
| `check-truth-sync.sh` | ✅ ACTIVE | Product/data dosyaları staged'sa docs truth-sync zorunluluğu |
| `check-html-tags.sh` | ✅ ACTIVE | HTML closing tag drop guard |
| `check-clatu-layout.sh` | ✅ ACTIVE | CLATU master layout uyumluluk (lp-hdr, lp-logo, ht-foot) |
| `tier-detect.sh` | ✅ ACTIVE | Git diff bazlı T1-T4 tier detect + T2 design-spec marker check + T3/T4 Codex auto-trigger |
| `check-ui-verify.sh` | ✅ ACTIVE | UI commit'lerde `UI_VERIFIED=1` env zorunluluğu |
| `cachebust-staged.sh` | ✅ ACTIVE | Staged HTML'lerde `?v=` otomatik git-sha bump |
| `check-token-strict.sh` | ✅ ACTIVE (lint-staged) | CSS hardcoded hex/px warning (token-strict) |

## Post-commit (`.husky/post-commit`)

| Script | Status | Görev |
|---|---|---|
| `check-v2-retrospective.sh` | ✅ ACTIVE | v2/redesign commit'lerinde otomatik retrospective entry |

## Pre-push (`.husky/pre-push`)

| Script | Status | Görev |
|---|---|---|
| `check-rls-guard.sh` | ✅ ACTIVE | RLS policy guard (push öncesi security check) |

## Codex hybrid (T3/T4 trigger)

| Script | Status | Görev |
|---|---|---|
| `codex-review-real.sh` | ✅ ACTIVE | Modern Codex CLI 0.130.0 `codex review --uncommitted` çağrı, BLOCKER pattern tespit, pending-approvals auto-append |
| `codex-bridge.sh` | 💀 DEAD | Eski Computer Use bridge — `archive/`'a taşınmalı |
| `codex-review.sh` | 💀 DEAD | Eski placeholder — yerine `codex-review-real.sh` |

## Cron (launchd, Pazar 09:00 + 10:00)

| Script | Status | Görev |
|---|---|---|
| `weekly-maintenance.sh` | 🕐 CRON | Dead code/TODO/FIXME scan, Sentry trend, PostHog funnel, maintenance-report |
| `review-learned-rules.sh` | 🕐 CRON | Learned rules section'larda %50+ tekrar pattern tespit, graduate aday |
| `install-launchd.sh` | 🔧 HELPER | launchd plist install/uninstall/status |

## Self-improving / audit

| Script | Status | Görev |
|---|---|---|
| `preflight-self-audit.sh` | ✅ ACTIVE (SessionStart) | 28 check (hook/agent/plugin sağlık) |

## Cache-bust

| Script | Status | Görev |
|---|---|---|
| `bump-cache-bust.sh` | 💀 DEAD | cachebust.sh duplicate, eski K045 helper |
| `cachebust.sh` | 🖐 MANUAL | Tüm HTML'lerde manuel `?v=<id>` bump (debug için) |

## Test / seed

| Script | Status | Görev |
|---|---|---|
| `seed-test-candidates.js` | 🖐 MANUAL | `npm run seed:test` ile test aday seed |
| `seed-test-admin.mjs` | 🖐 MANUAL | Admin user seed |
| `seed-test-employer.mjs` | 🖐 MANUAL | Employer user seed |
| `seed-test-user.mjs` | 🖐 MANUAL | Generic user seed |
| `sprint8-screenshot.js` | 💀 DEAD | Eski Sprint 8 screenshot, kullanılmıyor |

## Deploy / ops

| Script | Status | Görev |
|---|---|---|
| `cf-purge.sh` | 🖐 MANUAL | Cloudflare cache purge |
| `inject-deploy-sql.js` | 🖐 MANUAL | Supabase SQL editor monaco injection (deploy helper) |
| `_supa-admin.mjs` | 🖐 MANUAL | Supabase admin helper script |
| `state.sh` | 🖐 MANUAL | CURRENT-STATE/AI-COLLAB sync helper |
| `aider-commit.sh` | 💀 DEAD | Aider AI commit aracı — proje uyumsuz |
| `backup-teams-transcripts.sh` | 🖐 MANUAL | Agent Teams transcript yedek |

## Metrics

| Script | Status | Görev |
|---|---|---|
| `agent-metrics.sh` | 🖐 MANUAL | CSV log (manuel `./scripts/agent-metrics.sh log <agent> ...`) |
| `.claude/hooks/track-agent-dispatch.sh` | ✅ ACTIVE (PostToolUse Task) | Otomatik dispatch CSV log |

## Cleanup önerisi

**Sil aday (💀 DEAD — `scripts/_archive_dead/`'a taşı):**
- `aider-commit.sh`
- `bump-cache-bust.sh` (cachebust.sh + cachebust-staged.sh yeter)
- `codex-bridge.sh` (codex-review-real.sh yeter)
- `codex-review.sh` (eski placeholder)
- `sprint8-screenshot.js`

**Toplam:** 5 dead script (~17KB) cleanup adayı.

## Bakım

- Bu inventory `weekly-maintenance.sh` her Pazar günceller (gelecek).
- Yeni script eklenirse: status burada belirtilmeli, yoksa `weekly-maintenance` 💀 olarak işaretler.
- Dead script'ler 1 ay boyunca `_archive_dead/`'da kalır, sonra silinir.
