# hellotalent.ai — Project Context (Studio v3.3 — Reform 11 May 2026)

> **Quality Reform 11 May 2026** — Studio v3 agentic yapı yanlış kurulduğu için son 30 gün 540 commit / %45 fix / 34 revize. Reform: 20→11 agent, CLAUDE.md sade, PCV her T2+ işte, design-spec dosya + visual mockup zorunlu. Reform planı: `~/.claude/plans/imdi-agent-check-ve-dynamic-piglet.md`.

## Tech Stack
Vanilla HTML/CSS/JS (no framework). Supabase (Postgres + Auth + Storage + RLS). GitHub Pages (hellotalent.ai). Repo: github.com/tunkef/hellotalent.

## Top 5 Hot Rules (en sık ihlal — bunları unutma)

1. **T2+ iş plan mode'da başlar.** `docs/specs/<feature>.md` + visual mockup + Tuna onayı olmadan UI kod yazmak YASAK. Pre-commit `scripts/tier-detect.sh` bloklar.
2. **Read FIRST, Edit SECOND.** Edit/Write öncesi dosya bu session'da Read edilmiş olmalı (3 kez ihlal).
3. **Data contract grep ZORUNLU.** RPC/DB shape uydurmak yasak. `docs/RPC-CONTRACT.md` veya kaynak grep.
4. **Cache-bust merkezi.** Manuel `?v=tarih` YASAK. `scripts/cachebust.sh` git-sha enjeksiyon.
5. **Agent dispatch ZORUNLU (T2+).** chief-of-staff bypass `[agent-bypass]` marker zorlar.

## Tier matrix

| Tier | İş | Zincir |
|---|---|---|
| T1 | typo, copy | solo OK |
| T2 | UI, component, kod | **frontend (spec→impl) → darkmode-auditor → reviewer** |
| T3 | RLS, migration, payment, auth, paradigm | supabase-agent + reviewer (audit) + Codex |
| T4 | architecture, API contract, major refactor | chief-of-staff (architect mode) + reviewer + Codex |

Detay: `.claude/rules/agent-triggers.md`. Otomatik: `scripts/tier-detect.sh`.

## Design Truth (asla bypass)

- Renkler: Vermillion `#C94E28`, Navy `#1E2D5E`, BG `#F7F6F4`
- Fontlar: Bricolage Grotesque (heading), Plus Jakarta Sans (body), DM Mono (data)
- YASAK: Inter, Roboto, purple gradient, "röportaj" (→ "mülakat"/"iş görüşmesi"), emoji
- **Buton içinde simge/+/→/ikon 100% YASAK** — sadece text
- Radius: pill (999) sadece avatar/seg-toggle, button/badge radius (10px), chip radius-sm (4px)
- Token-strict: hardcoded hex/px YASAK, sadece `var(--editorial-*)` / `var(--space-*)`
- Dark mode parity: her light token için `html[data-theme="dark"]` override
- UI dili: Türkçe tam (ç,ğ,ı,İ,ö,ş,ü)

## DB invariants
- `candidates.id`, `companies.id`, `brands.id` = **bigint**
- `hr_profiles.id` = **uuid** (FK auth.users)
- Child table id = uuid, candidate_id = bigint
- `.maybeSingle()` not `.single()` for new user queries
- RLS migration template: `supabase/migrations/TEMPLATE.sql`
- `auth.users` direkt query YASAK → `auth.jwt() ->> 'email'`

## Agent Stack v3.3 (11 agent — TAM konsolide)

1. **chief-of-staff** — Lead + observer + session brief + tier dispatch (eski watchdog/briefer/compactor/architect/data-analyst gömüldü)
2. **reviewer** (mode: review/audit/maintenance) — 5-axis + security + tech debt (eski code-reviewer + auditor + maintenance-agent)
3. **frontend** (mode: spec/impl) — designer mockup + ui-agent implementation (birleşti)
4. **writer** (mode: app-copy/marketing) — content + marketing tek agent
5. **supabase-agent** — schema, RLS, Edge Function
6. **infra-ops** — deploy, CF, secret rotation
7. **ux-agent** — user research, flow, CRO
8. **darkmode-auditor** — WCAG + AccessLint
9. **uat-tester** — Playwright E2E
10. **researcher** — Firecrawl/Ahrefs/Vibe/WebFetch
11. **legal-reviewer** — KVKK metin drift

Detay: `.claude/agents/*.md`. Eski 9 agent: `.claude/agents/_archive/`.

## Source of Truth Sırası

1. `docs/CURRENT-STATE.md` — aktif durum
2. `.claude/rules/` — enforced kurallar
3. `docs/RPC-CONTRACT.md` — RPC schema (hallucination önleyici)
4. `docs/UI-DOD-template.md` — UI Definition of Done
5. `docs/ARCHITECTURE.md` — feature/data contract
6. `docs/EMERGENCY.md` — sorun anında
7. `docs/SESSION-LOG.md` — grep ile geçmiş

## Mühendislik Standardı

1. Geçici workaround yasak — root cause fix
2. Scope dışı değişiklik yasak
3. Test etmeden "bitti" deme — UI için Tuna görsel onayı şart
4. Regression guard ekle gerektiğinde
5. UI commit'lerde `UI_VERIFIED=1` zorunlu, bypass auditable
6. SOLID: SRP (50+ satır fonksiyon parçala), OCP (genişlet), DIP (soyut kontrat)

## Session start

```
/cook hellotalent
```
SessionStart hook → chief-of-staff (briefer gömülü). UserPromptSubmit hook her prompt'ta tier-detect + dispatch.

## Context7 + Model

Context7 MCP zorunlu: Supabase, CSS, library docs. Ana session **Opus 4.7**, subagent Sonnet default (plan/mimari/debug Opus, basit dispatch Haiku).

## Caveman + Disiplin

Caveman skill default. Kısa öz teknik. Filler yok. Tuna "normal" derse kapat.

## Emergency

- Agent stall / migration rollback / secret leak → `docs/EMERGENCY.md`
- Codex T3/T4 çelişki → `.claude/agent-memory/pending-approvals.md`
- Rollback → `git revert` + Tuna explicit approval
- Secret rotation → infra-ops 90-gün cron
