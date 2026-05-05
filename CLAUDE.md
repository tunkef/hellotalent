# hellotalent.ai — Project Context (Studio v3)

> **Studio v3** — 22 Nisan 2026. 16 native Claude agent + Codex hybrid. External API orchestration (DeepSeek/Grok/Cerebras/SambaNova/Gemini) retired. See `docs/AGENTS.md` for full team roster.

## Tech Stack
- Frontend: Static HTML/CSS/JS (vanilla, no framework)
- Backend: Supabase (PostgreSQL + Auth + Storage + RLS)
- Hosting: GitHub Pages (custom domain: hellotalent.ai)
- Repo: github.com/tunkef/hellotalent

## Design System
- Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body), DM Mono (data)
- Colors: Vermillion #C94E28, Navy #1E2D5E, Background #F7F6F4
- Forbidden: Inter, Roboto, purple gradients, röportaj
- Always use mulakat or is gorusmesi for interviews
- No emoji in UI or supporting copy
- Public-site = editorial, minimal, premium, illustration-aware (Clatu pass 1-6)

## Key Rules
- Homepage = index.html (never index_new.html)
- No console.log in production (only console.error/warn)
- candidates.id = bigint, companies.id = bigint (NOT uuid)
- hr_profiles.id = uuid (FK to auth.users)
- Always use .maybeSingle() not .single() for new user queries
- UI language: Turkish throughout

## Current State — Katmanlı Handoff Sistemi
Her session başında SADECE `docs/CURRENT-STATE.md` oku (~3K token).
- `docs/CURRENT-STATE.md` → Mevcut durum, dosya haritası, backlog, son 3 session
- `docs/ARCHITECTURE.md` → Mimari, data contracts, pipeline'lar (feature yazarken oku)
- `docs/SESSION-LOG.md` → Tüm session tarihçesi (~70K, sadece gerektiğinde grep/search)
- `docs/AGENTS.md` → 16 agent rol kartı, Teams chat örnekleri, handoff pattern
- `docs/EMERGENCY.md` → Agent Teams stall, service_role leak, migration rollback, Codex timeout playbook
- `docs/handoff.md` → Legacy alias

## Studio Çalışma Protokolü

### Agent Teams Default (Day 1)
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` aktif. **chief-of-staff** Teams lead, diğer 18 ajan teammate (compactor-agent izole).

Session başlatma:
```
/cook hellotalent
```
(veya `cook` yaz, hook shortcut'lar)

### 20 Agent Kadrosu (v3.2 — 22 Nisan)
| # | Agent | Rol |
|---|-------|-----|
| 1 | chief-of-staff | Teams lead, tier detect, Codex gate, synthesis |
| 2 | briefer | Session context özeti (300 token) |
| 3 | compactor-agent | Auto image summary + context snapshot |
| 4 | auditor | Security, KVKK, RLS, PII, OWASP, ISO27001 |
| 5 | code-reviewer | 5-axis PR review |
| 6 | uat-tester | Playwright E2E + smoke (lackeyjb/playwright-skill) |
| 7 | darkmode-auditor | Dark mode + WCAG contrast (AccessLint MCP) |
| 8 | designer | Pure aesthetic, brand, tokens (Figma MCP yok) |
| 9 | ui-agent | Frontend implementation (vanilla HTML/CSS/JS) |
| 10 | ux-agent | User research, flow, CRO (PostHog) |
| 11 | architect | Spec/Plan/Tasks, system architecture |
| 12 | supabase-agent | Schema, RLS, migration (service_role access) |
| 13 | infra-ops | Deploy, Cloudflare, GitHub, secret rotation (izole perms) |
| 14 | content-writer | Site copy + email + onboarding (avoid-ai-writing) |
| 15 | marketing-writer | SEO + social + campaign (Ahrefs) |
| 16 | maintenance-agent | Tech debt, post-deploy, postmortem |
| 17 | legal-reviewer | KVKK metin drift + avukat brief |
| 18 | data-analyst | PostHog funnel + cohort + A/B analiz |
| 19 | watchdog | Peer chat observer (stall/loop/drift detect) |
| 20 | researcher | Web research + fact-check + prospecting (Firecrawl/Ahrefs/Vibe/WebFetch) |

### Codex Hybrid (T3/T4 Otomatik)

| Tier | İş | Review Zinciri | Codex |
|------|---|----------------|-------|
| T1 | Typo, copy, asset | solo push | — |
| T2 | UI, kod mantığı | code-reviewer | — |
| **T3** | Security/RLS/migration/payment/auth | auditor + code-reviewer + **Codex otomatik** | Evet |
| **T4** | Architecture/major refactor/API contract | architect + code-reviewer + **Codex otomatik** | Evet |

**Otomatik trigger:** Git pre-commit hook tier detect eder. T3/T4 ise `scripts/codex-review.sh` otomatik çağırır. Agreement >=%70 → geçer. Çelişki %30+ → `.claude/agent-memory/pending-approvals.md`'ye düşer, Tuna görür.

### SOLID Architecture Enforcement
- **SRP:** Her fonksiyon/modül tek iş. 50+ satır fonksiyon → parçala.
- **OCP:** Yeni özellik eklerken mevcut fonksiyonu değiştirmek yerine genişlet.
- **LSP:** Model/sağlayıcı değişiminde config dışında kod değişmesin.
- **ISP:** Agent'lar sadece kendi tool'larını görsün, gereksiz bağımlılık ekleme.
- **DIP:** Somut API yerine soyut kontrat kullan.

### Source of Truth Sırası
1. `docs/CURRENT-STATE.md`
2. `docs/AI-COLLAB.md`
3. `docs/AGENTS.md` (ajan seçimi için)
4. `docs/ARCHITECTURE.md` (feature veya data contract etkiliyorsa)
5. `docs/EMERGENCY.md` (sorun anında)
6. `docs/SESSION-LOG.md` sadece gerektiğinde (grep)

### Self-Improving Agent Plugin

`self-improving-agent` (Alireza Rezvani) kurulu. Komutlar:
- `/si:review` — MEMORY.md analiz, promotion adayları
- `/si:promote` — patterni CLAUDE.md/rules/'a graduate et
- `/si:extract` — patterni skill'e çevir
- `/si:status` — memory sağlık paneli
- `/si:remember` — explicit save

Ajanlar kendi `## Learned Rules` section'larına append yapar (her agent .md'nin sonunda). Tuna `pending-rules.md`'den approve eder, sonra `/si:promote` ile graduate.

### AI-COLLAB Disiplini
`docs/AI-COLLAB.md` canlı çalışma defteridir.
- Her turda "Amaç / aktif hedef" oku
- "Claude için görev" dışına çıkma
- İş bitince: Yapılan iş, değişen dosyalar, test durumu, riskler, sonraki adım
- **5000 satır limitine** ulaşınca `docs/ai-collab/AI-COLLAB-archive-asama{X}-{Y}.md`'e arşivle

### Token Verimliliği — Caveman Mode
- Caveman skill otomatik aktif. Her session caveman full modunda başlar.
- Kısa, öz, teknik doğruluğu koruyan cevaplar.
- Filler/hedging/pleasantries yok.
- Tuna "detaylı anlat" veya "normal mode" derse kapat.

### Mühendislik Standardı
- Geçici workaround yok
- Teknik borcu büyüten çözüm yok
- Scale hedefini bozacak kısa yol yok
- Supabase/RLS/auth/data contract'ta kalıcı çözüm
- Scope dışı değişiklik yok
- Test etmeden "bitti" deme
- Regression guard ekle gerektiğinde
- **UI commit zorunlu görsel verify:** Dashboard/shell CSS+JS commit'lerinde browser hard-refresh + bento gözle tarama zorunlu. Pre-commit hook (`scripts/check-ui-verify.sh`) `UI_VERIFIED=1` env yoksa BLOK eder. Kural detay: `.claude/rules/ui-commit-discipline.md`. (5 May 2026 — Tuna direktifi: "kanıtlı bir kural")

## Ultraplan Hatirlatma

Kullanıcı aşağıdaki koşullardan birini karşılayan iş istediğinde `/ultraplan` öner:
- 5+ dosyayı etkileyen faz/feature başlangıcı
- Mimari karar (yeni tablo, RLS policy, Edge Function, API contract)
- Backlog Yüksek Öncelik maddeleri (Iyzico, İşveren P3, Kampanya Wizardı)
- "planla", "nasıl yapalım", "nereden başlayalım" planlama sinyali

## Context7
Always use context7 when working with Supabase API, CSS, or any library docs.

## Model Routing

Ana session default: **Opus 4.7**. Subagent default **Sonnet**, sadece plan/mimari/debug için Opus, basit dispatch için Haiku.

| İş | Model |
|----|-------|
| Explore | sonnet |
| Code review | sonnet |
| Grep/glob | haiku |
| Docs research | sonnet |
| Plan/mimari | opus-4-7 |
| Implementation | opus-4-7 |
| Debugging | opus-4-7 |
| Image summary | haiku |

## Public-Site Design Truth
Public-site legacy bento-grid/dashboard language kullanılmaz.

Her yeni public-site HTML/CSS/JS öncesi oku:
1. `docs/design-illustration-brief.md`
2. `.claude/skills/hellotalent-dev/SKILL.md`
3. `.claude/skills/ai-seo/SKILL.md` (content ise)

Kurallar:
- Business logic korunur, homepage yapısı dondurulmaz
- Clatu-first: minimal, editorial, premium, illustration-aware
- `index.html` = aday/işveren decision gate, minimal
- Emoji YASAK public-site UI ve copy'de
- Bento-grid public-site zorunlu değil
- Legacy dashboard patterns kendi surface'lerinde, homepage constraint değil

## Emergency Quick Ref
Agent Teams stall / service_role leak / migration rollback / Codex timeout → `docs/EMERGENCY.md`

Secret rotation → `infra-ops` agent, 90-gün cron

Rollback → `git revert` + force push (Tuna explicit approval)
