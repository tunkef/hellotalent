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

## Pre-migration State

| Bulgu | Detay |
|-------|-------|
| Hardcoded `hellotalent.ai` | **61 dosya** etkilenir |
| Email senders (Supabase ENV) | 4 adres |
| Supabase URL | `cpwibefquojehjehtrog.supabase.co` — değişmez |
| OAuth | Google + LinkedIn OIDC |
| GitHub Pages cert | `bad_authz` (zaten broken — re-cert şart) |
| Auth redirect kod | `window.location.origin + path` — dynamic, kod değişmez |
| DNS | hellotalent.ai + peoplein.com.tr ikisi de **Cloudflare** üstünde |
| WHOIS expiry | hellotalent.ai → 2027-06-16 |

## 10-Aşamalı Plan

Detay: `docs/DOMAIN-MIGRATION-CHECKLIST.md`

| Aşama | Görev | Kim | Süre |
|-------|-------|-----|------|
| 0 | Resend verify + email mailbox | Tuna (Cuma'ya kadar) | 30dk-2sa |
| 1 | DNS subdomain CNAME | Tuna (Cumartesi 22:00) | 5dk+5dk DNS |
| 2 | GitHub Pages CNAME switch | Claude commit + Tuna GH settings | 5dk+30dk SSL |
| 3 | Supabase Auth URL config | Tuna | 10dk |
| 4 | Google + LinkedIn OAuth callbacks | Tuna | 20dk |
| 5 | Supabase Edge Function ENV (email) | Tuna | 10dk |
| 6 | Sed replace 61 dosya | Claude | 10dk + diff review |
| 7 | Meta/Sitemap (Aşama 6 ile) | Claude | dahil |
| 8 | CF Page Rule 301 redirect | Tuna | 10dk |
| 9 | Smoke test 13 senaryo | Birlikte | 30dk |
| 10 | Docs + PR + Codex review | Claude | 20dk |

**Aktif iş:** ~3 saat. **Takvim süresi (SSL/DNS dahil):** 5-6 saat.

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
