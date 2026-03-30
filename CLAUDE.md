# hellotalent.ai — Project Context

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
- `docs/handoff.md` → Legacy alias (SESSION-LOG ile aynı içerik)

## Context7
Always use context7 when working with Supabase API, CSS, or any library docs.

## Model Routing — Token Tasarrufu
Subagent (Agent tool) çağırırken iş tipine göre model seç:

| İş Tipi | Model | Neden |
|----------|-------|-------|
| Explore (dosya arama, codebase keşif) | `sonnet` | Arama/okuma Opus gerektirmez |
| Code review, PR review | `sonnet` | Pattern matching yeterli |
| Basit grep/glob araştırma | `haiku` | En hızlı, en ucuz |
| Docs araştırma (context7, web) | `sonnet` | Dökümantasyon okuma |
| Plan yazma, mimari karar | `opus` | Karmaşık reasoning gerekli |
| Feature implementation | `opus` | Doğru kod üretimi kritik |
| Debugging, root cause analiz | `opus` | Derin analiz gerekli |

**Kural:** Default subagent modeli `sonnet`. Sadece plan/mimari/implementation/debug için `opus` kullan.
**c-level-skills:** Sadece kullanıcı strateji/iş modeli/yatırım konusunda açıkça sorduğunda invoke et.

## 🚨 CRITICAL AI DIRECTIVE (READ THIS FIRST)
Before you write ANY HTML, CSS, or JS for a new feature, you MUST forcefully read and load these two files into your context:
1. `.agents/skills/bento-grid-design/SKILL.md` -> Contains the EXACT HTML/CSS templates for Bento grids and cards. 
2. `.agents/skills/hellotalent-dev/SKILL.md` -> Contains architecture and component rules.
**DO NOT generate any UI code from scratch without reading the Bento Grid SKILL.md file first.**
