# HelloTalent — Contributing

> Reform v3.4 — 12 May 2026. HelloTalent perakende sektörü için Türkiye odaklı talent marketplace. Vanilla HTML/CSS/JS + Supabase + GitHub Pages.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no framework)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Hosting:** GitHub Pages, custom domain `hellotalent.ai`, Cloudflare proxy
- **CI:** GitHub Actions (Playwright + Lighthouse + Uptime)
- **AI Pair:** Claude Code (Opus 4.7), Codex CLI (gpt-5.4) — Studio v3.3 agentic workflow

## Setup

```bash
git clone git@github.com:tunkef/hellotalent.git
cd hellotalent
npm install
cp .env.example .env.local  # dolurmak gerekli, Tuna'dan iste
```

`.env.local` gerekli:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` (production gated test)
- `RESEND_API_KEY` (email outbox)

## Çalıştırma

```bash
# Dev server
python3 -m http.server 3000

# Tests (Chrome only, default)
npm test

# Browser matrix (Safari + Firefox de)
PW_BROWSER_MATRIX=1 npm test

# Test database seed (dev/staging only — production guard var)
npm run seed:test

# Database migration push
npm run db:push
```

## Studio v3.3 — AI Pair Disiplini

Bu proje **Anthropic Claude Code** agentic workflow ile geliştirilir. Her T2+ iş için:

1. **Tier-detect** (otomatik) — git diff bazlı T1/T2/T3/T4
2. **Agent chain** zorunlu:
   - T2 UI: frontend (spec → Tuna onay → impl) → darkmode-auditor → reviewer
   - T3 security: supabase-agent + reviewer (audit) + Codex auto
   - T4 architecture: chief-of-staff (architect) + reviewer + Codex
3. **Solo Edit/Write T2+ tier YASAK** (CLAUDE.md L1)

Hot rules (`CLAUDE.md`):
1. T2+ plan mode, design-spec dosyası zorunlu (`docs/specs/<feature>.md`)
2. Read FIRST, Edit SECOND
3. Data contract grep zorunlu (uydurma yasak)
4. Cache-bust merkezi (manuel `?v=` yasak)
5. Agent dispatch zorunlu

## Commit Convention

```
<type>(<scope>): <kısa açıklama>

<gövde — neden + ne değişti>

[bypass marker varsa — açıklama]

🤖 Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `audit`, `test`

T2+ commit message gereksinimleri:
- `design-spec: docs/specs/<feature>.md` referansı veya
- `[design-bypass]` marker + gerekçe veya
- `[agent-bypass]` marker (T2 dışı geniş bypass)

## Test Disiplini

- Pre-commit (`.husky/pre-commit`): `tier-detect`, `cachebust-staged`, `check-ui-verify`, `check-clatu-layout`
- Commit-msg (`.husky/commit-msg`): marker check (T2+)
- Post-commit (`.husky/post-commit`): v2/redesign retrospective entry
- Pre-push (`.husky/pre-push`): RLS guard

Test çalıştırmadan önce:
```bash
bash tests/hooks/run-all.sh        # hook smoke
bash scripts/preflight-self-audit.sh   # 61-check
```

## Migration

```bash
npm run db:new -- migration_name   # yeni migration
# Edit supabase/migrations/<timestamp>_*.sql
npm run db:status                  # linked durum
npm run db:push                    # production'a push
```

RLS migration template: `supabase/migrations/TEMPLATE.sql`.

T3 migration commit'leri Codex auto-trigger ile review edilir (`scripts/codex-review-real.sh`).

## Issue / PR

- Issue template: `.github/ISSUE_TEMPLATE/` — bug, feature, security
- PR template: `.github/pull_request_template.md`
- Major change (T3+) PR'larında Codex review marker + reviewer agent approval zorunlu

## Self-improving

Sen "yanlış yaptın" / "şunu hatırla" gibi feedback verirsen, otomatik `pending-rules.md`'ye düşer. Haftalık Pazar review (`/si:review`) graduate aday'ı önerir, sen `/si:promote` ile CLAUDE.md'ye taşırsın.

## Süreç Belgeleri

- `docs/CURRENT-STATE.md` — anlık durum (session sonu güncellenir)
- `docs/ARCHITECTURE.md` — sistem mimarisi
- `docs/RPC-CONTRACT.md` — Supabase RPC schema
- `docs/UI-DOD-template.md` — UI Definition of Done
- `docs/SELF-AUDIT.md` — claim vs reality ledger
- `docs/SCRIPTS-INVENTORY.md` + `docs/SKILLS-INVENTORY.md` + `docs/PLUGIN-INVENTORY.md`
- `docs/AGENTS.md` — 11 native agent matrix
- `docs/EMERGENCY.md` — incident playbook

## License

ISC (bkz: `LICENSE`).

## İletişim

İletişim için Tuna Kefeli — kefelituna@gmail.com (proje sahibi).
