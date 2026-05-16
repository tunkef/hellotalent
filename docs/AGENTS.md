# HelloTalent Studio — Agent Team Reference (v3.3 — Reform 11 May 2026)

> **11 native Claude agent + 1 hybrid (Codex).** 20→11 konsolidasyon, role-overlap eliminated. Eski 12 agent `.claude/agents/_archive/` altında — referans için korundu.

## Quick Index

| # | Agent | Model | Scope | Invoke |
|---|-------|-------|-------|--------|
| 1 | [chief-of-staff](../.claude/agents/chief-of-staff.md) | opus | Teams lead + tier detect + Codex gate + briefer + watchdog + compactor (gömülü) | main session default |
| 2 | [reviewer](../.claude/agents/reviewer.md) | sonnet | 5-axis review + KVKK/RLS audit + tech debt (mode flag) | pre-merge, pre-migration, weekly |
| 3 | [frontend](../.claude/agents/frontend.md) | opus | Designer spec mode + ui-agent impl mode (birleşti) | her UI/component iş |
| 4 | [writer](../.claude/agents/writer.md) | sonnet | App copy + marketing (mode flag) | UI label, email, blog, social |
| 5 | [supabase-agent](../.claude/agents/supabase-agent.md) | sonnet | Schema, RLS, Edge Functions | DB iş |
| 6 | [infra-ops](../.claude/agents/infra-ops.md) | sonnet | Deploy, Cloudflare, secrets (izole perms) | deploy, rollback |
| 7 | [ux-agent](../.claude/agents/ux-agent.md) | sonnet | User research, flow, CRO | yeni flow, A/B test |
| 8 | [darkmode-auditor](../.claude/agents/darkmode-auditor.md) | haiku | Dark mode + WCAG contrast (AccessLint) | UI değişikliği |
| 9 | [uat-tester](../.claude/agents/uat-tester.md) | sonnet | Playwright E2E + smoke | pre/post-deploy |
| 10 | [researcher](../.claude/agents/researcher.md) | sonnet | Web research + fact-check + prospecting | rakip scan, claim verify |
| 11 | [legal-reviewer](../.claude/agents/legal-reviewer.md) | sonnet | KVKK metin drift, avukat brief | legal copy, KVKK audit |
| H | Codex (external) | GPT-5 | T3/T4 ikinci göz | otomatik trigger (T3/T4) |

## Tier Matrix → Zincir

| Tier | İş tipi | Zincir |
|---|---|---|
| **T1** | typo, single-line copy | solo OK |
| **T2** | UI, component, kod mantığı | **frontend (spec→Tuna onay→impl) → darkmode-auditor → reviewer (review mode)** |
| **T3** | RLS, migration, payment, auth, paradigm | supabase-agent + reviewer (audit mode) + **Codex auto** |
| **T4** | architecture, API contract, major refactor | chief-of-staff (architect mode) + reviewer + **Codex auto** |

`scripts/tier-detect.sh` git diff bazlı otomatik tier detect; T3/T4 ise `scripts/codex-review-real.sh` çalışır (Codex CLI 0.130.0 `codex review --uncommitted`). BLOCKER/CRITICAL → commit BLOK + `.claude/agent-memory/pending-approvals.md` auto entry. Bypass: commit msg `[codex-bypass]` (auditable).

## Konsolidasyon notları

### Silinen 12 agent (`.claude/agents/_archive/`)

| Eski | Yeni | Sebep |
|---|---|---|
| code-reviewer | reviewer (review mode) | 4 review agent → 1 |
| auditor | reviewer (audit mode) | role-overlap |
| maintenance-agent | reviewer (maintenance mode) | role-overlap |
| designer | frontend (spec mode) | spec/impl ayrı agent gereksiz |
| ui-agent | frontend (impl mode) | spec'siz impl zaten yasak |
| content-writer | writer (app-copy mode) | copy = copy, mode flag yeter |
| marketing-writer | writer (marketing mode) | role-overlap |
| watchdog | chief-of-staff (built-in observer) | dispatch lead zaten observer |
| briefer | chief-of-staff (built-in session brief) | session start gömülü |
| compactor-agent | hook (agent değil) | image summary hook olarak |
| architect | chief-of-staff (architect mode) | T4 zaten chief-of-staff lead |
| data-analyst | chief-of-staff (expand) | PostHog ad-hoc, agent gereksiz |

## Handoff Pattern

`chief-of-staff` → `Task(agent, prompt)` dispatch:
1. **Sequential** (örn: frontend spec → Tuna onay → frontend impl)
2. **Parallel** (örn: reviewer + darkmode-auditor aynı PR)
3. **Codex gate** (T3/T4 zorunlu, agreement check)

Çıktı format her agent için JSON:

```json
{
  "agent": "<name>",
  "mode": "<mode flag>",
  "findings": [...],
  "summary": "...",
  "recommendation": "MERGE_OK | REQUEST_CHANGES | BLOCK"
}
```

## Memory + Rules

- **Memory** (`~/.claude/projects/.../memory/`): project-level facts, brand data, future plans. **Behavioral rules YOK** (Reform: graduate edildi).
- **Rules** (`.claude/rules/`): enforced disipliner kurallar. `.claude/rules/learned/` graduate edilenler.
- **Pending rules** (`.claude/agent-memory/pending-rules.md`): chief-of-staff weekly Pazar review, %50+ tekrar → graduate.
- **Pending approvals** (`.claude/agent-memory/pending-approvals.md`): Codex çelişki, secret rotation, T3/T4 batch.

## Source

- Reform plan: `~/.claude/plans/imdi-agent-check-ve-dynamic-piglet.md`
- CLAUDE.md Hot Rules
- `.claude/rules/learned/consolidated-2026-05.md` (12 graduate kural)
- `docs/UI-DOD-template.md`
- `docs/RPC-CONTRACT.md`
