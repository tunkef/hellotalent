# Self-Audit Ledger — HelloTalent Studio v3.3

> **Reform 11 May 2026 — "Claim vs reality" canlı kayıt.** Her "kuruldu/aktif" iddiası test ile doğrulanmadıkça GEÇİT DEĞİL. chief-of-staff haftalık Pazar review'da bu dosyayı tarar; stale entry'leri yeniden test eder veya re-state ile günceller.

## Format

```markdown
| Claim | Verify (komut/test) | Last verified | Status |
|---|---|---|---|
```

Status legend:
- ✅ **VERIFIED** — test pass, son verify tarihinde
- ⚠ **STALE** — 30+ gün önce verify edildi, yeniden test gerek
- ❌ **FAILED** — test fail, fix gerek
- 📝 **PENDING** — claim yapıldı ama test yazılmadı

---

## 11 May 2026 Reform Claims

### Self-improving altyapı

| Claim | Verify | Last | Status |
|---|---|---|---|
| `detect-negative-feedback.sh` stdin JSON parse + NEG entry yazar | `bash tests/hooks/run-all.sh` (A1) | 2026-05-11 | ✅ |
| `detect-remember-intent.sh` save intent → hint inject | tests/hooks/run-all.sh (A2) | 2026-05-11 | ✅ |
| `session-end-si-review.sh` PR/NEG sayısı raporlar | tests/hooks/run-all.sh (A3) | 2026-05-11 | ✅ |
| `agent-learned-rules-helper.sh` PostToolUse Edit'te section check | tests/hooks/run-all.sh (A4) | 2026-05-11 | ✅ |
| `dispatch-chief-of-staff.sh` tier-detect + dispatch hint | tests/hooks/run-all.sh (A5) | 2026-05-11 | ✅ |
| 4 yeni hook settings.json'a bağlı | `grep <hook> .claude/settings.json` | 2026-05-11 | ✅ |
| Self-improving-agent plugin marketplace'te yüklü | `ls ~/.claude/plugins/marketplaces/claude-code-skills/engineering-team/self-improving-agent/` | 2026-05-11 | ✅ |
| `/si:review /si:promote /si:extract /si:status /si:remember` komutları çalışır | manuel `/si:status` çağrısı | — | 📝 G1 test |

### Agent stack (11 agent)

| Claim | Verify | Last | Status |
|---|---|---|---|
| Ana repo `.claude/agents/` 11 aktif agent | `ls ~/Downloads/Hellotalent/.claude/agents/*.md \| grep -v CHANGELOG \| wc -l` = 11 | 2026-05-11 | ✅ |
| Worktree 11 aktif agent | aynı (worktree path) | 2026-05-11 | ✅ |
| 12 eski agent `_archive/` | `ls ~/Downloads/Hellotalent/.claude/agents/_archive/ \| wc -l` = 12 | 2026-05-11 | ✅ |
| Reform 3 yeni agent: reviewer.md, frontend.md, writer.md | `ls .claude/agents/{reviewer,frontend,writer}.md` | 2026-05-11 | ✅ |
| Tüm 11 agent'ta `## Learned Rules` section | preflight-self-audit.sh check 7 | 2026-05-11 | ✅ |

### Disiplin kapıları (pre-commit + post-commit)

| Claim | Verify | Last | Status |
|---|---|---|---|
| `.husky/pre-commit` tier-detect.sh çağırır | `grep tier-detect .husky/pre-commit` | 2026-05-11 | ✅ |
| `.husky/pre-commit` cachebust-staged.sh çağırır | `grep cachebust-staged .husky/pre-commit` | 2026-05-11 | ✅ |
| `.husky/post-commit` check-v2-retrospective.sh çağırır | `grep check-v2-retrospective .husky/post-commit` | 2026-05-11 | ✅ |
| Pre-commit T2 CSS commit'i bypass marker'sız blok eder | `tests/hooks/test-t2-block.sh` | — | 📝 G2 test |
| `scripts/cachebust-staged.sh` staged HTML'leri otomatik git-sha bump | smoke test B | 2026-05-11 | ✅ partial (staged HTML yok dummy test) |

### Doc + state

| Claim | Verify | Last | Status |
|---|---|---|---|
| `CLAUDE.md` 178→101 satır radikal sade | `wc -l CLAUDE.md` | 2026-05-11 | ✅ |
| 12 memory `.claude/rules/learned/consolidated-2026-05.md`'ye graduate | `grep -c '^## L' .claude/rules/learned/consolidated-2026-05.md` ≥ 14 | 2026-05-11 | ✅ |
| Memory orijinalleri `archive/` | `ls ~/.claude/projects/.../memory/archive/feedback_*.md \| wc -l` = 12 | 2026-05-11 | ✅ |
| pending-rules.md PR2-13 audit trail | `grep -c 'PR2-PR13 \[GRADUATED' .claude/agent-memory/pending-rules.md` ≥ 1 | 2026-05-11 | ✅ |
| `docs/UI-DOD-template.md` mevcut | preflight check 11 | 2026-05-11 | ✅ |
| `docs/RPC-CONTRACT.md` mevcut | preflight check 11 | 2026-05-11 | ✅ |
| `docs/specs/`, `docs/retrospectives/`, `docs/plans/` klasör + README | preflight check 11 | 2026-05-11 | ✅ |

### Hook input protocol (CRITICAL)

| Claim | Verify | Last | Status |
|---|---|---|---|
| 5 yeni hook stdin JSON parse (jq ile) — Anthropic spec compliant | Hook input: `{prompt, cwd, hook_event_name, tool_name, tool_input.file_path}` stdin JSON. Env var YOK. | 2026-05-11 | ✅ |
| `$CLAUDE_USER_PROMPT` env var YOK (halüsinasyondu) | Anthropic docs (code.claude.com/docs/en/hooks) cross-check | 2026-05-11 | ✅ FIXED |
| Pre-flight self-audit SessionStart hook'a bağlı | `grep preflight .claude/settings.json` | 2026-05-11 | ✅ |
| Pre-flight 28/28 check pass | `bash scripts/preflight-self-audit.sh` | 2026-05-11 | ✅ |

### Pending / Reform after-action

| Claim | Verify | Last | Status |
|---|---|---|---|
| `/si:status` plugin gerçek çağrı testi | Tuna manuel /si:status | — | 📝 G1 |
| Pre-commit T2 block — dummy CSS commit dener, exit 1 doğrula | E2E senaryo testi | — | 📝 G2 |
| KPI: günlük commit 18 → ≤ 8 | maintenance reviewer agent haftalık ölç | — | 📝 4 hafta sonra |
| KPI: fix prefix %45 → ≤ %20 | maintenance reviewer | — | 📝 4 hafta |
| KPI: v2+ revize 34/ay → ≤ 5/ay | docs/retrospectives/ entry sayısı | — | 📝 4 hafta |
| KPI: agent dispatch ≥ %80 | ölçüm aracı? (TODO) | — | 📝 ölçüm metriği eksik |

---

## Meta — Bu ledger nasıl korunur?

1. **Yeni claim eklendiğinde** otomatik 📝 PENDING, test/verify yazılmadan ✅ olamaz.
2. **Haftalık Pazar review** (chief-of-staff): tüm ✅ entries 30+ gün eskise ⚠ STALE, yeniden test.
3. **Pre-flight self-audit** (SessionStart) hook her session başında bu ledger'in 28 entry'sini test eder, fail varsa session başında uyarı.
4. **Smoke test suite** (`tests/hooks/run-all.sh`) her commit'te koşulabilir.

## Lesson learned (11 May)

**Asıl problem:** "Hook kuruldu" demek + manuel test (env var elle set) ≠ gerçek production. Hook spec dokümante doğrulanmadan claim YASAK. Bu blind spot Tuna tarafından yakalandı (mesaj: "ben buldum ben de büyük açığı"); reform v2'de Anthropic docs cross-check yapıldı, 4 hook stdin JSON pattern'ine refactor edildi, smoke test suite eklendi.

**Kural (graduate L15 olabilir):** Her enforcement/automation claim'i somut test ile eşle. "Kuruldu" demeden önce: (a) gerçek input pattern doğrula (docs), (b) smoke test yaz, (c) testte assert et. Bu ledger living, her hafta refresh.
