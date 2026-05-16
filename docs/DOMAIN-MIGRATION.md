# Domain Migration: hellotalent.ai → talent.peoplein.com.tr

> **Status:** Planlandı (2026-05-16) — Deploy pencere: hafta sonu (Cumartesi gece → Pazar test → Pazartesi sabah live)
> **Plan dosyası:** `~/.claude/plans/melodic-dreaming-marshmallow.md`
> **Tier:** T4 (architecture change)
> **Karar trail:** Tuna ses kaydı 2026-05-16 13:44 (transcript: `~/Downloads/audio-transcripts/2026-05-16-135101-Yeni-Kay-t-.txt`)

## Context

HelloTalent.ai domain Tuna'nın bütçesini aşıyor. PeopleIn.com.tr (Tuna'nın domaini, 2 yıl ücretsiz) kullanılarak `talent.peoplein.com.tr` subdomain altında HelloTalent uygulaması yayınlanacak. PeopleIn WordPress site'i dokunulmaz.

**Tuna kararları (AskUserQuestion):**
- ✅ Subdomain: `talent.peoplein.com.tr`
- ✅ Brand: **Hibrit** — Peoplein üst marka, HelloTalent app adı kalır
- ✅ Email: `noreply@peoplein.com.tr`, `bulten@`, `support@`, `admin@`
- ✅ Geçiş: hafta sonu
- ✅ 301 redirect: hemen

## Pre-migration State (2026-05-16 derin audit sonrası)

| Bulgu | Detay |
|-------|-------|
| Hardcoded `hellotalent.ai` | **61 dosya** (HTML/JS/MD/XML) + edge functions (.ts) + CI workflows (.yml) — ~65 toplam |
| Email senders (Supabase ENV) | 4 adres: noreply/bulten/support/admin |
| Supabase URL | `cpwibefquojehjehtrog.supabase.co` — değişmez |
| OAuth | Google + LinkedIn OIDC (callback URL update) |
| GitHub Pages cert | `bad_authz` (zaten broken — re-cert şart) |
| Auth redirect kod | `window.location.origin + path` — dynamic, kod değişmez ✅ |
| DNS | hellotalent.ai + peoplein.com.tr ikisi de **Cloudflare** üstünde |
| WHOIS expiry | hellotalent.ai → 2027-06-16 (Tuna yenilemeyecek, 1.5 ay tahmini) |
| **Resend (Yeni keşif)** | peoplein.com.tr **PeopleIn account'unda verified** (HelloTalent account'ta DEĞİL — 1 domain limit). "HelloTalent App" key oluşturuldu |
| **SPF/DMARC** | peoplein.com.tr SPF YANLIŞ (Microsoft 365 dahil). Tuna **Google Workspace** kullanıyor. Düzeltilmeli |
| **Edge fn hardcoded URLs** | `newsletter-confirm/index.ts`: 3 hellotalent.ai URL → redeploy gerek |
| **CI/CD** | `uptime-check.yml`, `lighthouse-ci.yml`, `playwright.config.js` — hellotalent.ai refs (sed yakalar) |
| **Iyzico webhook** | Supabase domain'i kullanıyor (`cpwibefquojehjehtrog.supabase.co`) — etkilenmez ✅ |
| **CF Turnstile** | Zaten kaldırılmış (K-063 fix, sitekey domain mismatch). Risk yok ✅ |
| **PWA/Service Worker** | YOK — risk yok ✅ |
| **Google Workspace MX** | peoplein.com.tr'de `smtp.google.com` zaten kurulu ✅ |
| **GA4** | Cross-domain `G-54BCV5QYCZ` (PeopleIn + HelloTalent shared) — hostname whitelist update gerek |
| **Google Ads / Meta Pixel / LinkedIn Insight** | Kod'da YOK — Tuna Ads dashboard kontrolü ayrı |

## 10-Aşamalı Plan

Detay: `docs/DOMAIN-MIGRATION-CHECKLIST.md`

| Aşama | Görev | Kim | Süre |
|-------|-------|-----|------|
| 0 | Resend + SPF/DMARC + email mailbox/alias | Tuna manuel + Claude Chrome MCP (Cuma'ya kadar) | 30dk-2sa |
| 1 | DNS subdomain CNAME (talent) | Claude Chrome MCP | 5dk+5dk DNS |
| 2 | GitHub Pages CNAME switch | Claude (commit + gh api) | 5dk+30dk SSL |
| 3 | Supabase Auth URL config | Claude Chrome MCP | 10dk |
| 4 | Google + LinkedIn OAuth callbacks | Claude Chrome MCP | 20dk |
| 5 | Supabase Edge Fn ENV + redeploy newsletter-confirm | Claude Chrome MCP + CLI | 15dk |
| 6 | Sed replace ~65 dosya (HTML/JS/TS/YAML) | Claude | 10dk + diff review |
| 7 | Meta/Sitemap/Workflows (Aşama 6 ile) | Claude | dahil |
| 8 | CF Page Rule 301 redirect | Claude Chrome MCP | 10dk |
| 9 | Smoke test **17 senaryo** | Birlikte | 30-45dk |
| 10 | Docs + PR + Codex review | Claude | 20dk |

**Aktif iş:** ~3 saat. **Takvim süresi (SSL/DNS dahil):** 5-6 saat.

## Pre-migration Hazırlık (Cuma akşam — şu an)

Tuna onayı ile yapılacak (henüz dashboard işlemi YOK):

| # | İş | Tier | Kim | Status |
|---|-----|------|-----|--------|
| H1 | Resend PeopleIn account "HelloTalent App" API key | T1 | Claude Chrome MCP | ✅ DONE (2026-05-16) |
| H2 | Key `.env.local`'a kaydet | T1 | Claude bash | ✅ DONE |
| H3 | PR #18 docs commit | T1 | Claude git | ✅ DONE |
| H4 | SPF/DMARC fix (Cloudflare DNS) | T3 | Claude Chrome MCP | ⏳ Tuna "yap" derse |
| H5 | DNS TTL düşür (hellotalent.ai 300sn) | T3 | Claude Chrome MCP | ⏳ Tuna "yap" derse |
| H6 | Git tag `pre-domain-migration` rollback noktası | T1 | Claude git | ⏳ Tuna "yap" derse |
| H7 | Sed dry-run feature branch'te | T1 | Claude bash | ⏳ Tuna "yap" derse |
| H8 | Resend test email gönder (yeni key + domain) | T1 | Claude curl | ⏳ Tuna "yap" derse |
| H9 | Email alias setup Google Workspace | T1 | Tuna manuel | ⏳ Cuma |
| H10 | Google Ads campaign envanteri (varsa) | T1 | Tuna kontrol | ⏳ Tuna |

## Verification

13 smoke test senaryosu — checklist'te detaylı:
- DNS resolution, HTTPS cert, aday login, İK login, magic link, OAuth, password reset, 301 redirect, Supabase Storage

## Risk + Rollback

| Aşama | Rollback | Süre |
|-------|----------|------|
| 1 (DNS) | CF dashboard talent CNAME delete | 5dk |
| 2 (CNAME) | `git revert` + push + GH Pages re-cert | 30dk |
| 3 (Supabase URL) | Dashboard eski URL geri | 5dk |
| 4 (OAuth) | Provider settings revert | 10dk |
| 5 (Email ENV) | Supabase Secrets eski değerleri | 5dk |
| 6 (sed) | `git revert <commit>` | 5dk |
| 8 (301) | CF Page Rule disable | 2dk |

**Worst case:** Tüm revert + DNS hellotalent.ai → **30dk**.

**Kritik risk:** GitHub Pages cert "bad_authz" — Aşama 2 sırasında ACME re-trigger gerekir. Çözüm: GH Pages custom domain remove + re-add.

## Out of Scope

- PeopleIn WordPress dokunulmaz
- Subdirectory routing (`peoplein.com.tr/app`)
- WordPress + HelloTalent SSO
- Mobile app deep links
- Email template/content redesign

## Critical Files

| Path | Değişiklik |
|------|-----------|
| `CNAME` | rewrite |
| 22 HTML root | sed |
| ~10 JS | sed |
| `sitemap.xml`, `manifest.json` (varsa) | sed |
| `README.md`, `CLAUDE.md` | sed + manuel |
| `docs/CURRENT-STATE.md` | migration kayıt |
| `docs/DOMAIN-MIGRATION.md` (bu dosya) | full rehber |
| `docs/SECURITY-OVERRIDES.md` | SO2 entry |

## Related

- Plan: `~/.claude/plans/melodic-dreaming-marshmallow.md`
- Checklist: `docs/DOMAIN-MIGRATION-CHECKLIST.md`
- Audio source: `~/Downloads/audio-transcripts/2026-05-16-135101-Yeni-Kay-t-.txt`
- Security override: `docs/SECURITY-OVERRIDES.md` SO2
