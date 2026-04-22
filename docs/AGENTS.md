# HelloTalent Studio — Agent Team Reference (v3)

> 16 native Claude agent + 1 hybrid (Codex). Agent Teams (experimental) aktif, peer-to-peer chat ile koordinasyon. Her ajan proje-scoped `.claude/agents/` altında tanımlı.

## Quick Index

| # | Agent | Model | Scope | Invoke |
|---|-------|-------|-------|--------|
| 1 | [chief-of-staff](../.claude/agents/chief-of-staff.md) | opus | Teams lead, tier detect, Codex gate | main session default |
| 2 | [briefer](../.claude/agents/briefer.md) | haiku | Session başı context | `/cook hellotalent` |
| 3 | [compactor-agent](../.claude/agents/compactor-agent.md) | haiku | Image özet + context snapshot | hook otomatik |
| 4 | [auditor](../.claude/agents/auditor.md) | sonnet | Security, KVKK, RLS, PII | migration/auth/payment |
| 5 | [code-reviewer](../.claude/agents/code-reviewer.md) | sonnet | 5-axis PR review | pre-merge |
| 6 | [uat-tester](../.claude/agents/uat-tester.md) | sonnet | Playwright E2E | pre/post-deploy |
| 7 | [darkmode-auditor](../.claude/agents/darkmode-auditor.md) | haiku | Dark mode + WCAG contrast | UI değişikliği |
| 8 | [designer](../.claude/agents/designer.md) | sonnet | Brand, aesthetic, tokens | yeni feature/page |
| 9 | [ui-agent](../.claude/agents/ui-agent.md) | sonnet | Frontend implementation | designer spec sonrası |
| 10 | [ux-agent](../.claude/agents/ux-agent.md) | sonnet | User research, flow, CRO | yeni flow, A/B test |
| 11 | [architect](../.claude/agents/architect.md) | opus | Spec/Plan/Tasks, mimari | yeni MVP faz, 5+ dosya |
| 12 | [supabase-agent](../.claude/agents/supabase-agent.md) | sonnet | Schema, RLS, Edge Functions | DB iş |
| 13 | [infra-ops](../.claude/agents/infra-ops.md) | sonnet | Deploy, Cloudflare, secrets (izole perms) | deploy, rollback |
| 14 | [content-writer](../.claude/agents/content-writer.md) | sonnet | Site copy, email, onboarding | mikro-copy |
| 15 | [marketing-writer](../.claude/agents/marketing-writer.md) | sonnet | SEO, social, campaign | landing, blog |
| 16 | [maintenance-agent](../.claude/agents/maintenance-agent.md) | sonnet | Tech debt, postmortem | haftalık, post-deploy |
| H | Codex (external) | GPT-5 | T3/T4 ikinci göz | otomatik trigger |

## Agent Selection Matrix

İş tipi → ajan zinciri:

| İş Tipi | Zincir | Tier |
|---------|--------|------|
| UI component değişikliği | designer → ui-agent → code-reviewer → uat-tester | T2 |
| Dark mode fix | darkmode-auditor → ui-agent → uat-tester | T2 |
| Yeni sayfa/flow | designer → ux-agent → ui-agent → code-reviewer → uat-tester | T3 |
| Onboarding/form UX | ux-agent → ui-agent → uat-tester → content-writer | T2 |
| Copy/mikro-metin | content-writer → ui-agent | T1-T2 |
| SEO/landing copy | marketing-writer → ui-agent → code-reviewer | T2 |
| DB schema/migration | supabase-agent → auditor → code-reviewer → **Codex** | T3 |
| RLS policy değişikliği | supabase-agent → auditor → **Codex** | T3 |
| Edge Function | supabase-agent → code-reviewer → auditor | T3 |
| Auth flow | auditor → supabase-agent → code-reviewer → uat-tester → **Codex** | T3 |
| Payment (Iyzico/Stripe) | supabase-agent → auditor → code-reviewer → **Codex** | T3 |
| Architecture refactor | architect → code-reviewer → auditor → **Codex** | T4 |
| Deploy | infra-ops → uat-tester (pre) → maintenance-agent (post) | T3 |
| Bug fix (tech debt) | code-reviewer → maintenance-agent | T2 |
| Performance | maintenance-agent → uat-tester | T2-T3 |
| Security audit | auditor → code-reviewer → **Codex** | T3 |
| Image upload | compactor-agent (otomatik, önce) | - |

## Peer Chat Topology

```
                    chief-of-staff (lead)
                    ↙      ↓      ↘
              briefer    architect    [review cluster]
                                     ↙   ↓   ↘
                                auditor code-reviewer uat-tester
                                     ↕         ↕
                              [build cluster]
                               ↙    ↓    ↘
                          designer ui-agent ux-agent
                               ↕
                        [data cluster]
                         ↙         ↘
                supabase-agent   infra-ops
                         ↕
                   [content cluster]
                    ↙           ↘
           content-writer  marketing-writer
                         ↕
                 maintenance-agent
```

compactor-agent topology dışında (isolated, hook-driven).

## Codex Hybrid Gate

T3 ve T4 işlerinde **otomatik** tetiklenir:
- Pre-commit hook tier detect eder
- `scripts/codex-review.sh --tier=$TIER` otomatik çalışır
- Native (auditor + code-reviewer) rapor ile karşılaştırma
- Agreement ≥ %70 → sessiz geç
- Çelişki %30+ → commit blokla, `pending-approvals.md`'ye düşer

## Self-Improving Protocol

Her agent .md sonunda `## Learned Rules` section'ı var.

Pattern 2+ kez tekrar ederse:
1. chief-of-staff peer chat'te "bu rule yaz" deyince
2. İlgili agent kendi `## Learned Rules`'a append yapar (append-only)
3. `.claude/agent-memory/pending-rules.md`'e queue girer
4. Tuna approve eder
5. `self-improving-agent` plugin `/si:promote` ile CLAUDE.md veya `.claude/rules/`'a graduate

Safeguards:
- Append-only (silme yok, SUPERSEDED etiketi var)
- Max 20 aktif rule per agent
- Haftalık chief-of-staff review
- Tuna approval gate

## Handoff Dosyaları

`.claude/agent-memory/` altında:

| Dosya | Kim yazar | Ne için |
|-------|-----------|---------|
| `handoff-{scope}-{ts}.json` | her agent | structured handoff |
| `image-summaries/img-{ts}.md` | compactor-agent | image özeti |
| `context-snapshots/snap-{ts}.md` | compactor-agent | context snapshot |
| `codex-reviews/codex-{ts}.json` | codex-review.sh | Codex output |
| `audit-{scope}-{ts}.json` | auditor | security audit |
| `review-{scope}-{ts}.json` | code-reviewer | PR review |
| `uat-{ts}.json` | uat-tester | UAT sonuç |
| `pending-approvals.md` | chief-of-staff | Tuna batch approval queue |
| `pending-rules.md` | any agent | self-improve queue |
| `maintenance-reports/weekly-{YYYYMMDD}.md` | maintenance-agent | weekly scan |

## Skill Bindings Quick Ref

Özet — detay her agent .md'nin "Skills" section'ında:

- **Security cluster:** auditor → senior-security, ciso-advisor, skill-security-auditor, iso27001, security-hardening, gdpr
- **Design cluster:** designer → brand-guidelines, ui-design-system, epic-design, impeccable-design, canvas-design, bold, oiloil-ui-ux
- **Frontend cluster:** ui-agent → frontend-engineering, hellotalent-dev, senior-frontend, ui-design-system, impeccable-design
- **UX cluster:** ux-agent → ux-researcher-designer, cs-ux-researcher, onboarding-cro, form-cro, page-cro, experiment-designer, marketing-psychology
- **Data cluster:** supabase-agent → supabase-mastery, database-designer, database-schema-designer, security-hardening, stripe-integration-expert
- **Content cluster:** content-writer → copywriting, avoid-ai-writing, email-template-builder, email-systems, pyramid-principle
- **Marketing cluster:** marketing-writer → ai-seo, content-strategy, launch-strategy, lead-magnets, marketing-ideas, marketing-psychology, growth-engine, competitive-landscape, programmatic-seo, cs-content-creator
- **Architect cluster:** architect → spec-driven-dev, planning-tasks, architecture-designer, api-interface-design, consulting-* (MECE, hypothesis)
- **Maintenance cluster:** maintenance-agent → performance-optimization, code-simplification, postmortem, focused-fix, change-management

## Invocation Patterns

**Teams mode (default):**
```
chief-of-staff → SendMessage(to: "auditor", msg: "...")
```

**Task mode (fallback):**
```
Task(auditor, "profil.js RLS check, PII leak var mı?")
```

**Hook-driven (otomatik):**
- Image upload → compactor-agent
- Git commit (T3/T4) → pre-commit tier-detect hook → Codex auto
- >25 tool uses → context-budget hook → compactor snapshot hint

## Stall Handling

Agent Teams experimental — stall durumunda:
1. 90 saniye timeout detect
2. Katman 2 fallback: `Task(agent, ...)` sync dispatch
3. Eğer hala fail: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0` rollback
4. Tuna'ya bildir

Detay → `docs/EMERGENCY.md`
