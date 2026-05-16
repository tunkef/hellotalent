# Skills Inventory — HelloTalent Studio v3.3

> **Reform 11 May 2026.** `.claude/skills/` 40 lokal skill envanteri + relevance scoring. Reform öncesi rastgele skill yüklemesi vardı, şimdi sadece proje-relevant olanlar aktif tutulur, gerisi cache'te kalır.

## Skill kategorize

### 🟢 PROJE-CORE (aktif tutulmalı, sık çağrılır)

| Skill | Niçin |
|---|---|
| `hellotalent-dev` | Proje-specific dev rehberi (vanilla HTML/CSS/JS pattern, Supabase RLS, Türkçe UI) |
| `impeccable-design` | CLATU manifest compliance (editorial, minimal, premium) |
| `supabase-mastery` | Supabase API + RLS + migration + Edge Function pattern |
| `gdpr-data-handling` | KVKK + retention + right of access |
| `security-hardening` | Auth, payment, RLS audit |
| `frontend-engineering` | Vanilla HTML/CSS/JS production patterns |
| `code-review-quality` | 5-axis review skill (reviewer agent default) |
| `code-simplification` | Refactor + simplify (reviewer maintenance mode) |
| `spec-driven-dev` | Plan-Code-Verify loop (Reform L2) |
| `tdd-enhanced` | TDD pattern (backend RPC + Edge Function) |
| `planning-tasks` | Multi-step task planning |
| `database-design` | Schema design (new table önce buraya bak) |
| `performance-optimization` | Web Vitals, bundle, render |

### 🟡 SITUATIONAL (gerek olunca çağrılır)

| Skill | Niçin |
|---|---|
| `analytics-tracking` | PostHog event tracking |
| `ab-test-setup` | A/B test (UX flow değişikliği) |
| `form-cro` | Form conversion (signup/onboarding) |
| `onboarding-cro` | Onboarding flow (wizard) |
| `page-cro` | Landing page conversion |
| `payment-integration` | Iyzico (P3) |
| `email-systems` | Resend + email template |
| `email-sequence` | Cold email + drip campaign |
| `cold-email` | İlk temas email |
| `lead-magnets` | Lead magnet content |
| `growth-engine` | Growth loop tasarım |
| `monetization` | Pricing, plan, upsell |
| `launch-strategy` | Public launch playbook |
| `content-strategy` | İçerik stratejisi |
| `copywriting` | Marketing copy |
| `marketing-ideas` | Campaign ideas |
| `marketing-psychology` | Influence + Cialdini |
| `competitive-landscape` | Rakip analizi |
| `ai-seo` | AI-era SEO (LLM citation) |
| `api-design-principles` | REST API tasarım |
| `api-interface-design` | API contract |
| `browser-use` | Browser automation (Playwright + Claude_in_Chrome) |
| `deploy` | GitHub Pages + Cloudflare deploy |
| `multi-agent-brainstorming` | Brainstorm phase |
| `multi-agent-patterns` | Agent orchestration patterns |
| `ui-ux-pro-max` | Detaylı UI/UX audit |
| `self-improving-agent` | Plugin entrypoint (`/si:*` komutlar) |
| `test` | Test infrastructure |

### 🔴 CANDIDATE CLEANUP (proje-dışı veya redundant)

Şu skill'ler proje-relevant değil veya başka kapsamlı skill'lerle örtüşüyor. `.claude/skills/_archive_dead/`'a taşı aday:

- (Şu an itibarıyla 40 skill'in hepsi `hellotalent-dev` core pakete uyuyor — explicit silme yok. Haftalık review'da kullanım metriği toplanır, 30 gün çağırılmayan skill cleanup'a düşer.)

## Plugin skill'leri (marketplace'ten gelen, dış)

System reminder'larda gelen skill'ler (lokal değil):

| Plugin | İlgili skill'ler | Aktif mi? |
|---|---|---|
| `playwright-skill` | playwright-skill | ✅ |
| `self-improving-agent@claude-code-skills` | si:* komutları | ✅ |
| `vercel-plugin` | vercel-storage, ai-sdk, nextjs, vs. | ⚠ Auto-injection (proje irrelevant, P2.5 disable hedef) |
| `anthropic-skills` | docx, pdf, xlsx, pptx | 🖐 Manuel |
| `superpowers` | brainstorming, executing-plans, verification | 🟡 Reform önerdi (verification default) |
| `coderabbit` | code-reviewer alternatif | 🟡 T2 review için seçenek |
| `codex` | codex-rescue, codex-cli-runtime | ✅ (codex-review-real.sh CLI ile bağlı) |
| `posthog` | analytics tools | 🟡 Future P4 |
| `brand-voice` | brand discovery, content gen | 🟡 marketing-writer (writer agent) |
| `design` | design-system, ux-copy | 🟡 frontend agent destek |

## Skill load metrics (gelecek)

`.claude/agent-memory/skill-usage.csv` — her skill invocation log'lanacak (TODO). Şu an manuel sayım yok. Reform v3.4 hedefi: PostToolUse Skill matcher hook ile track.

## Bakım

- Yeni skill çağrılırsa kullanım sayımı log'lanır
- 30 gün invoke edilmeyen 🟡 skill → `_archive_dead/` aday
- 🟢 PROJE-CORE skill listesi haftalık review'da güncellenir
