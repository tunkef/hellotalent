# Audit P1-P7 Results — 11 May 2026

> Tuna 75-item audit sıralı yürütme — P0 Security ayrı (commit `d533938`). P1-P7 batch bulguları.

## P1 Database integrity

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 1.1 | Migration drift local vs production | 123 local migration. `supabase link` worktree'de uncoupled (`Cannot find project ref`). Drift saptanamıyor. | 🟠 HIGH |
| 1.2 | Index coverage | 78 CREATE INDEX. FK referans: candidates(12), auth(12), public(9), positions(2). Görünür iyi, gerçek perf `pg_stat_statements` gerek. | 🟢 OK |
| 1.3 | Schema constraint | 9 UNIQUE (düşük olabilir — candidates.email/telefon doğrula), 124 CHECK (yüksek, sağlam) | 🟡 MEDIUM |
| 1.4 | Trigger search_path | A26 migration ile fix (apply Tuna onayı bekliyor) | 🟢 plan |
| 1.5 | FK cascade | 32 CASCADE + 8 SET NULL/RESTRICT + 2 default. 85+ toplam FK, ~43 explicit ON DELETE eksik olabilir. | 🟡 MEDIUM |
| 1.6 | Backup strategy | Sadece teams-transcripts backup. Supabase plan tier + PITR durumu belirsiz. Local pg_dump weekly cron YOK. | 🔴 HIGH |

**Aksiyon:** `supabase link --project-ref cpwibefquojehjehtrog` worktree'de + Supabase dashboard plan tier check + scripts/backup-supabase-weekly.sh yaz.

## P2 Frontend performance

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 2.17 | Bundle size | CSS 420KB, JS **1.7MB**, HTML 864KB. profil-studio.js 200KB, profil-yetkinlik.js 120KB | 🟠 HIGH |
| 2.18 | Lighthouse score | Ölçüm yok | 📝 PENDING |
| 2.19 | Web Vitals | Ölçüm yok | 📝 PENDING |
| 2.20 | Image opt | 18 WebP, 10 PNG/JPG — modern format kullanılıyor | 🟢 OK |
| 2.21 | Font loading | Bricolage/Plus Jakarta — manuel verify gerek | 🟡 |
| 2.22 | `!important` wars | **destek.css 471×**, wizard-editorial 135×, ik-pipeline 66×, profil-extras 40×. **700+ toplam!** | 🔴 CRITICAL |
| 2.23 | Dead CSS | ik-pipeline tanım 100+ class, runtime kullanım sayımı gerek (PurgeCSS) | 🟡 |
| 2.24 | Z-index hierarchy | Manuel check gerek (kebab 9999 vs drawer 1000) | 🟡 |
| 2.25 | profil.html size | **1998 satır** (önceki 6300+'tan refactor edilmiş) | 🟢 IMPROVED |
| 2.26 | ik.legacy.html | `_archive-ik-legacy/ik.legacy.html: 4904 satır 240KB` arşivlenmiş — silinebilir | 🟡 cleanup |

**Aksiyon:** destek.css 471 `!important` `@layer` refactor (T3, Codex). JS code splitting değerlendirme. Lighthouse CI ekle.

## P3 Accessibility (WCAG 2.1 AA proxy)

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 3.27 | WCAG 2.1 AA | AccessLint MCP eksik (settings'ten kaldırıldı). Otomatik audit yok. | 🟡 |
| 3.28 | Focus management | 19 `aria-modal="true"` + 22 `role="dialog"` — modal/drawer pattern doğru | 🟢 |
| 3.29 | Form labels | **126 input id vs 107 label for — 19 input label'sız!** | 🟠 HIGH |
| 3.30 | Color-only info | 0 inline color-only style — temiz | 🟢 |
| 3.31 | Keyboard nav | 54 tabindex="0" + 6 tabindex="-1". 0 anti-pattern tabindex>0 | 🟢 |
| 3.32 | ARIA live regions | 37 `aria-live="polite"` — mesaj region'lar mevcut | 🟢 |

**334 aria-label** kullanımı — yüksek. Şu an a11y aşırı kötü değil ama **19 input label'sız** fix gerek.

## P4 Testing

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 4.33 | Playwright coverage | 70 test file, **14 disabled (%20!)** | 🟠 HIGH |
| 4.34 | Mutation testing | Yok | 📝 |
| 4.35 | Browser matrix | Sadece Chromium (mobile + desktop). Safari/Firefox/Edge eksik. | 🟠 HIGH |
| 4.36 | Visual regression | **15 snapshot baseline mevcut** (önceki audit yanlış) | 🟢 |
| 4.37 | Load testing | Yok | 📝 |
| 4.38 | Test data hygiene | seed-test-candidates.js DELETE+service_role kullanım. Env isolation kritik. | 🟠 HIGH |

**Aksiyon:** 14 disabled test re-enable veya silme planı. Browser matrix genişlet (Safari at minimum — Apple kullanıcılar). Seed scripts production guard.

## P5 Production / Deploy

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 5.39 | GitHub Pages + CF | CNAME `hellotalent.ai` ✓, wrangler.toml yok (CF worker pattern değil) | 🟢 |
| 5.40 | TLS cert expiry | Manuel curl check gerek | 📝 |
| 5.41 | Rollback procedure | docs/EMERGENCY.md'de tanımlı, test edilmedi | 🟡 |
| 5.42 | Sentry alert | `Sentry.init` profil.html'de ✓, alert thresholds belirsiz | 🟡 |
| 5.43 | PostHog instrumentation | 5+ JS dosyada `posthog.capture` ✓ | 🟢 |
| 5.44 | Uptime ping | Monitor script yok | 🟠 |
| 5.45 | Cost tracking | Dashboard manuel | 📝 |
| 5.46 | DNS records | Manuel doğrula | 📝 |
| 5.47 | Email SPF/DKIM/DMARC | Resend domain manuel check | 📝 |

**Aksiyon:** Uptime monitoring (Better Stack / UptimeRobot — free tier). Sentry alert thresholds setup. Rollback dry-run.

## P6 KVKK + compliance

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 6.48 | KVKK aydınlatma metni | **HTML olarak YOK! Sadece spec `.claude/agent-memory/specs/pr-6-legal-kvkk.md`** | 🔴 BLOCKER |
| 6.49 | Cookie consent flow | grep'te bulunamadı | 🟠 HIGH |
| 6.50 | Privacy policy public | Yok | 🔴 BLOCKER |
| 6.51 | Cookies 3rd party | PostHog, Resend, Sentry, CF, GH Pages — listele gerek | 🟡 |
| 6.52 | Data residency | Supabase region (cpwibefquojehjehtrog ref'i AWS eu-central-1 olabilir) — KVKK için kontrol | 🟡 |
| 6.53 | PII retention cron | `purge_old_employer_notes` günlük 00:00 UTC migration var | 🟢 |
| 6.54 | Right of access (md.11) | A23q7 audit log var, endpoint belirsiz | 🟡 |
| 6.55 | Right of erasure (md.7) | account_status enum + 30-gün grace + cron purge migration var | 🟢 |

**KRITIK:** Site canlı yayına alındığında KVKK aydınlatma + gizlilik politikası HTML olmadan ihlal. PR-6 deploy avukat görüşmesi pending (memory'de project_kvkk_lawyer_review_pr6).

## P7 Agentic + DX

| # | Kontrol | Bulgu | Severity |
|---|---|---|---|
| 7.56 | chief-of-staff dispatch | UserPromptSubmit hook reminder + heuristic ✓, gerçek Task() dispatch test edilmedi | 🟡 |
| 7.57 | Sub-agent context isolation | Reform v2 audit'te yapılmadı | 📝 |
| 7.58 | Codex agreement % | Pattern detect (BLOCKER/MERGE_OK), %-based metric yok | 🟡 |
| 7.59 | Agent peer chat | Teams transcript var (backup-teams-transcripts), aktif kullanım belirsiz | 🟡 |
| 7.60-63 | Hook timeout/limit/cascade/perf | Anthropic spec ile cross-check edilmedi | 📝 |
| 7.64 | README setup steps | 98 satır var | 🟢 |
| 7.65 | CONTRIBUTING.md | **YOK** | 🟠 |
| 7.66 | Issue/PR templates | **YOK** (.github/ klasör eksik) | 🟠 |
| 7.67 | LICENSE | ✓ | 🟢 |
| 7.68 | Onboarding doc | Yok | 🟡 |
| 7.69 | /si:status manuel test | Tuna chat'ten çağrı gerek | 📝 |
| 7.70 | Vercel injection disable | Script hazır (`disable-vercel-injection.sh`), Tuna yetki bekliyor | 📝 |
| 7.71 | Mockup MCP test | Stitch/Recraft/21st-magic gerçek pipeline test yok | 📝 |
| 7.72 | superpowers:verification default | Doğrulanmadı | 📝 |
| 7.73 | Plugin marketplace cache size | 50+ plugin ~500MB disk (audit hesap yapılmadı) | 🟡 |
| 7.74 | Brand voice plugin auth | Box/Gong/Granola/Notion/M365 — hiç bağlanmamış muhtemelen | 🟡 |
| 7.75 | Codex E2E real T3 commit | tier-detect.sh hidden bug fix sonrası gerçek E2E test gerek | 📝 |

---

## Severity özet

| Severity | Sayı |
|---|---|
| 🔴 BLOCKER | 3 (KVKK aydınlatma, gizlilik HTML yok / destek.css 471 !important) |
| 🟠 HIGH | 8 (supabase link, backup, JS bundle, form labels, disabled tests, browser matrix, seed hygiene, cookie consent, no uptime, CONTRIBUTING/templates) |
| 🟡 MEDIUM | 13 |
| 🟢 OK | 11 |
| 📝 PENDING | 14 (manuel audit/test gerek) |

**Toplam:** 49 item P1-P7 (P0'daki 10 hariç) → **75 item / Reform v3.4 audit**.

## Acil aksiyon (TOP 5)

1. 🔴 **KVKK aydınlatma + gizlilik politikası HTML** yaz (legal review zorunlu) — site canlı öncesi BLOCKER
2. 🔴 **destek.css 471 !important** — `@layer` refactor (T3, Codex review)
3. 🟠 **supabase link worktree** — drift saptansın (Tuna manuel)
4. 🟠 **19 input label'sız** — form a11y fix
5. 🟠 **Browser matrix Safari ekle** — Apple kullanıcılar test edilmiyor

## Devam (sonraki batch)

P0-P7 envanter tamam. Şimdi her item için fix migration/PR/spec yazma. Tuna karar:
- A) Tüm BLOCKER + HIGH fix (1 hafta)
- B) Sadece BLOCKER fix (1-2 gün)
- C) Audit ledger'a düşür, Tuna explicit karar
