# Self-Audit Ledger — HelloTalent Studio v3.3

> **Reform 11 May 2026 — "Claim vs reality" canlı kayıt.** Her "kuruldu/aktif" iddiası test ile doğrulanmadıkça GEÇİT DEĞİL. chief-of-staff haftalık Pazar review'da bu dosyayı tarar; stale entry'leri yeniden test eder veya re-state ile günceller.
>
> **Bu dosya `weekly-maintenance.sh` (launchd Pazar 09:00) tarafından güncellenir.**

## Format

| Claim | Verify (komut/test) | Last verified | Status |

Status legend: ✅ **VERIFIED** | ⚠ **STALE** (30+ gün) | ❌ **FAILED** | 📝 **PENDING** | 💀 **DEPRECATED**

---

## A. Self-improving altyapı (5 hook)

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| A1 | `detect-negative-feedback.sh` stdin JSON + NEG entry yazar | `bash tests/hooks/run-all.sh` (A1) | 2026-05-11 | ✅ |
| A2 | `detect-remember-intent.sh` save intent → hint inject | smoke test A2 | 2026-05-11 | ✅ |
| A3 | `session-end-si-review.sh` PR/NEG rapor | smoke test A3 | 2026-05-11 | ✅ |
| A4 | `agent-learned-rules-helper.sh` PostToolUse Edit check | smoke test A4 | 2026-05-11 | ✅ |
| A5 | `dispatch-chief-of-staff.sh` tier-detect hint | smoke test A5 | 2026-05-11 | ✅ |
| A6 | 5 hook stdin JSON spec compliant (Anthropic docs) | code.claude.com/docs/en/hooks cross-check | 2026-05-11 | ✅ FIXED |
| A7 | `$CLAUDE_USER_PROMPT` env var YOK (halüsinasyon) | Docs verify | 2026-05-11 | ✅ FIXED |
| A8 | Settings.json'da 5 hook bağlı | `grep <hook> .claude/settings.json` | 2026-05-11 | ✅ |
| A9 | Self-improving plugin marketplace'te | `ls ~/.claude/plugins/marketplaces/claude-code-skills/engineering-team/self-improving-agent/` | 2026-05-11 | ✅ |
| A10 | `/si:review /si:promote /si:extract /si:status /si:remember` skill listesinde | system reminder skill list | 2026-05-11 | ✅ |
| A11 | `/si:status` plugin gerçek çağrı | Tuna manuel `/si:status` | — | 📝 PENDING |

## B. Agent stack (11 agent v3.3)

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| B1 | Ana repo 11 aktif agent | `ls ~/Downloads/Hellotalent/.claude/agents/*.md \| grep -v CHANGELOG \| wc -l` = 11 | 2026-05-11 | ✅ |
| B2 | Worktree 11 aktif agent | aynı (worktree path) | 2026-05-11 | ✅ |
| B3 | 12 eski agent `_archive/` | `ls _archive/ \| wc -l` = 12 | 2026-05-11 | ✅ |
| B4 | reviewer.md mevcut | `ls .claude/agents/reviewer.md` | 2026-05-11 | ✅ |
| B5 | frontend.md mevcut | `ls .claude/agents/frontend.md` | 2026-05-11 | ✅ |
| B6 | writer.md mevcut | `ls .claude/agents/writer.md` | 2026-05-11 | ✅ |
| B7 | Tüm 11 agent'ta `## Learned Rules` section | preflight check 7 | 2026-05-11 | ✅ |

## C. Disiplin kapıları (pre-commit + post-commit + pre-push)

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| C1 | `.husky/pre-commit` tier-detect | `grep tier-detect .husky/pre-commit` | 2026-05-11 | ✅ |
| C2 | `.husky/pre-commit` cachebust-staged | `grep cachebust-staged .husky/pre-commit` | 2026-05-11 | ✅ |
| C3 | `.husky/post-commit` v2-retrospective | `grep check-v2-retrospective .husky/post-commit` | 2026-05-11 | ✅ |
| C4 | `.husky/pre-push` check-rls-guard | `grep check-rls-guard .husky/pre-push` | 2026-05-11 | ✅ |
| C5 | Pre-commit T2 marker yoksa BLOK | E2E test: marker yok → exit 1 | 2026-05-11 | ✅ |
| C6 | Pre-commit T2 marker var → geç | E2E test: design-spec/[design-bypass] → exit 0 | 2026-05-11 | ✅ |
| C7 | `cachebust-staged.sh` staged HTML auto git-sha bump | smoke test B | 2026-05-11 | ✅ partial |
| C8 | Lint-staged: js eslint + css token-strict + html tags | `cat package.json` lint-staged | 2026-05-11 | ✅ |
| C9 | `check-token-strict.sh` hardcoded hex/px warning | manuel test pending | — | 📝 |

## D. Codex hybrid (T3/T4 auto-trigger)

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| D1 | Codex CLI 0.130.0 yüklü | `codex --version` | 2026-05-11 | ✅ |
| D2 | Codex auth (ChatGPT) | `codex login status` | 2026-05-11 | ✅ |
| D3 | `codex-review-real.sh` modern `codex review --uncommitted` | manuel dry-run T1 → exit 0 | 2026-05-11 | ✅ partial |
| D4 | tier-detect T3/T4 → codex-review-real.sh otomatik tetik | code review `tier-detect.sh:T3/T4 branch` | 2026-05-11 | ✅ |
| D5 | BLOCKER pattern tespit → exit 1 + pending-approvals auto-append | E2E test gerek (gerçek T3 commit) | — | 📝 PENDING |
| D6 | `[codex-bypass]` marker auditable | manuel test | — | 📝 PENDING |
| D7 | CLAUDE.md "T3/T4 → Codex auto-trigger" claim doğru | claim vs code match | 2026-05-11 | ✅ FIXED |
| D8 | docs/AGENTS.md aynı | aynı | 2026-05-11 | ✅ FIXED |
| D9 | Eski `codex-bridge.sh` `codex-review.sh` 💀 DEPRECATED | docs/SCRIPTS-INVENTORY.md belirtir | 2026-05-11 | ✅ |

## E. Cron (launchd, Pazar)

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| E1 | launchd weekly-maintenance Pazar 09:00 | `launchctl list \| grep hellotalent` | 2026-05-11 | ✅ LOADED |
| E2 | launchd weekly-review Pazar 10:00 | `launchctl list \| grep hellotalent` | 2026-05-11 | ✅ LOADED |
| E3 | `scripts/install-launchd.sh status` | dual `LOADED` | 2026-05-11 | ✅ |
| E4 | `weekly-maintenance.sh` ilk Pazar gerçek çalışma | `.claude/agent-memory/maintenance-reports/weekly-*.md` ilk entry | — | 📝 17 May Pazar bekleniyor |
| E5 | `review-learned-rules.sh` ilk Pazar gerçek çalışma | aynı | — | 📝 |

## F. Doc + state

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| F1 | `CLAUDE.md` 178→101 satır | `wc -l CLAUDE.md` | 2026-05-11 | ✅ |
| F2 | 12 memory `consolidated-2026-05.md`'ye graduate | `grep -c '^## L' .claude/rules/learned/consolidated-2026-05.md` ≥ 14 | 2026-05-11 | ✅ |
| F3 | Memory orijinalleri `archive/` | `ls memory/archive/feedback_*.md \| wc -l` = 12 | 2026-05-11 | ✅ |
| F4 | pending-rules.md PR2-13 audit trail | `grep 'GRADUATED' pending-rules.md` | 2026-05-11 | ✅ |
| F5 | `docs/UI-DOD-template.md` | `ls docs/UI-DOD-template.md` | 2026-05-11 | ✅ |
| F6 | `docs/RPC-CONTRACT.md` | aynı | 2026-05-11 | ✅ |
| F7 | `docs/specs/`, `docs/retrospectives/` klasör + README | preflight check | 2026-05-11 | ✅ |
| F8 | `docs/SCRIPTS-INVENTORY.md` 27 script status | manuel | 2026-05-11 | ✅ |
| F9 | `docs/SKILLS-INVENTORY.md` 40 skill kategorize | manuel | 2026-05-11 | ✅ |

## G. Custom slash commands

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| G1 | `/cook` slash command | `.claude/commands/cook.md` | 2026-05-11 | ✅ |
| G2 | `/plan-ui` slash command | `.claude/commands/plan-ui.md` + system reminder skill list | 2026-05-11 | ✅ |
| G3 | `/verify-design` slash command | aynı | 2026-05-11 | ✅ |
| G4 | `/codex-gate` slash command | aynı | 2026-05-11 | ✅ |

## H. Plugins + MCP

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| H1 | `enabledPlugins`: playwright-skill + self-improving-agent | `jq '.enabledPlugins' .claude/settings.json` | 2026-05-11 | ✅ |
| H2 | AccessLint plugin marketplace'te YOK | `ls ~/.claude/plugins/marketplaces/accesslint*` boş | 2026-05-11 | ✅ FIXED (kaldırıldı) |
| H3 | Native MCP: apify + playwright | `jq '.mcpServers \| keys' ~/.claude/.mcp.json` | 2026-05-11 | ✅ |
| H4 | Plugin MCP'ler (system reminder'da): vercel, posthog, sentry, brand-voice, design, data, productivity, frontend-design, claude-mem, vs. | skill list audit | 2026-05-11 | ✅ envanter |
| H5 | Vercel plugin auto-injection (proje irrelevant) | system reminder her promptta `vercel-plugin` match | 2026-05-11 | ⚠ rahatsızlık |
| H6 | Vercel injection disable yöntemi | research: marketplace.json plugin disable veya plugin uninstall | — | 📝 manuel (Tuna karar) |
| H7 | `claude-mem` MCP (system reminder'da görünüyor) | `~/.claude/plugins/marketplaces/`'te yok ama plugin metadata'da olabilir | 2026-05-11 | ⚠ belirsiz |
| H8 | `~/.claude/.mcp.json` content secret içermez | `jq '.mcpServers \| keys'` sadece keys | 2026-05-11 | ✅ |

## I. Pre-flight self-audit

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| I1 | `preflight-self-audit.sh` SessionStart'a bağlı | `grep preflight .claude/settings.json` | 2026-05-11 | ✅ |
| I2 | Preflight 28/28 check pass | `bash scripts/preflight-self-audit.sh` | 2026-05-11 | ✅ |
| I3 | Preflight 50+ entry'ye genişletme | TODO: bu ledger'deki tüm entries'i preflight kapsasın | — | 📝 P3 future |
| I4 | Worktree ↔ ana repo agent sync | preflight check 12 | 2026-05-11 | ✅ |

## J. Metrics

| # | Claim | Verify | Last | Status |
|---|---|---|---|---|
| J1 | `track-agent-dispatch.sh` PostToolUse Task hook | smoke test (CSV entry doğrulandı) | 2026-05-11 | ✅ |
| J2 | `agent-dispatch.csv` log büyüyor | `wc -l reviews/agent-dispatch.csv` haftalık trend | — | 📝 ilk Pazar |
| J3 | KPI: günlük commit ≤ 8 | 4 hafta sonra ölç | — | 📝 |
| J4 | KPI: fix prefix ≤ %20 | 4 hafta sonra | — | 📝 |
| J5 | KPI: v2+ revize ≤ 5/ay | 4 hafta sonra (docs/retrospectives/ count) | — | 📝 |
| J6 | KPI: agent dispatch oranı ≥ %80 | agent-dispatch.csv / git log ratio | — | 📝 |

## K. Lessons learned

### 11 May Reform v1 (commit `148738e`)
- "Hook kuruldu" iddia + manuel env var test ≠ gerçek hook invocation
- 4 hook stdin JSON spec compliant değildi (env var halüsinasyon)
- Tuna yakaladı, Reform v2 ile fix

### 11 May Reform v2 (commit `f0d2050`)
- Anthropic docs cross-check zorunlu
- Smoke test suite (tests/hooks/run-all.sh) yazıldı, 14/14 PASS
- Pre-flight self-audit SessionStart'a bağlandı (28 check)

### 11 May Reform v3 (commit 7333767)
- 360-derece audit istendi, 10+ blind spot daha çıktı
- Codex CLI 0.130.0 gerçek entegrasyon — modern `codex review --uncommitted`
- tier-detect T3/T4 → codex-review-real.sh otomatik tetik
- weekly-maintenance launchd cron kuruldu (Pazar 09:00 + 10:00)
- Lint-staged genişletildi (css token-strict, html tags)
- 3 custom slash command yazıldı (/plan-ui, /verify-design, /codex-gate)
- Scripts inventory + Skills inventory dokümante edildi
- Vercel plugin auto-injection araştırıldı, çözüm manuel (Tuna karar)

### 11 May P0 Security audit (commit d533938)
- 75 audit item sıralı başladı, P0 batch tamam
- 3 BLOCKER tespit: service_role plain (14×) + GitHub PAT plain + 11+ SECURITY DEFINER search_path eksik
- A26 migration yazıldı (dynamic DO block, runtime'da eksik fonksiyonlar bulunup ALTER)
- clean-settings-secrets.sh hazır (Tuna rotate sonra çağırır)
- pending-approvals.md A_AUTO_P0_SETTINGS_SECRET + A26 entries

### 11 May P0-P7 Audit FIX batch (commit pending)
**FIX-1 KVKK:** `yasal.html` 497 satır mevcut (audit yanlışı). 5 GAP avukat pending → A27 pending-approvals entry.
**FIX-3 Form labels:** Audit yanlışı 19 → gerçek 53 input wrapper label kontrolü yapılmadı. Frontend agent T2 dispatch spec hazırlanacak.
**FIX-4 Browser matrix:** Playwright Safari mobile/desktop + Firefox desktop project'ler eklendi (opt-in `PW_BROWSER_MATRIX=1`).
**FIX-5 Backup:** `scripts/backup-supabase-weekly.sh` + launchd plist (Pazar 04:00). 24-gün retention.
**FIX-6 Seed guard:** `scripts/_supa-admin.mjs` + `seed-test-candidates.js` production project ref check (bypass `ALLOW_SEED_PRODUCTION=1`).
**FIX-7 Disabled tests:** 14 disabled test `tests/_disabled_archive/`'a taşındı + README (re-write aday).
**FIX-8 Cookie consent:** `js/cookie-consent.js` minimal CMP (XSS-safe DOM API, WCAG 2.1 AA, 1 yıl localStorage).
**FIX-9 Uptime:** `.github/workflows/uptime-check.yml` 15dk cron + curl + fail → GitHub Issue auto-create.
**FIX-2 destek.css 471 !important @layer refactor:** T3 büyük iş, Tuna karar bekliyor (ayrı commit).

### 11 May Codex auto-trigger HIDDEN BUG (commit 00f4c3c)
**Bulgu:** P0 commit'inde Codex auto-trigger TETİKLENMEDİ (sessiz skip).
**Sebep:** `scripts/tier-detect.sh` `.git/COMMIT_EDITMSG` relative path kullanıyordu. Worktree'de `.git` dosya, gerçek dir `/Users/.../Hellotalent/.git/worktrees/<branch>/COMMIT_EDITMSG`. Relative path resolve edilemediği için T3 detect edip "marker check skip" yapıp sessiz exit 0 verdi → Codex çağrılmadı.
**Fix:** `git rev-parse --git-path COMMIT_EDITMSG` worktree-aware path resolve. Fallback olarak `.git` dosya parse ile `gitdir:` extract.
**Verify:** Worktree'de test edildi, resolved path `/Users/.../worktrees/suspicious-joliot-c826ef/COMMIT_EDITMSG` MEVCUT.
**Kural (graduate L15 aday):** Worktree-aware path resolve her git tooling script'inde zorunlu. Relative `.git/` path kullanmak worktree senaryolarında silent fail üretir.

### Kural (graduate L15 aday)
**Her enforcement/automation claim'i somut test ile eşle.** "Kuruldu" demeden önce:
1. Gerçek input pattern doğrula (docs)
2. Smoke test yaz
3. Testte assert et
4. SELF-AUDIT.md ledger'de ✅/📝 işaretle

Bu ledger living, her hafta `weekly-maintenance.sh` günceller. 30+ gün stale entry'ler yeniden test edilir.

---

## Bu ledger nasıl korunur?

1. **Yeni claim** → otomatik 📝 PENDING, test yazılmadan ✅ olamaz
2. **Haftalık Pazar review** (chief-of-staff): 30+ gün ✅ entries → ⚠ STALE, yeniden test
3. **Pre-flight self-audit** SessionStart'ta her session başı 28 → 50 check (genişleme planlı)
4. **Smoke test** `tests/hooks/run-all.sh` her commit'te koşulabilir
5. **Codex review log** `.claude/agent-memory/codex-reviews/<date>-<sha>.md` audit trail
