# Agent Stack Gap Audit (Reform v3.4 D9)

> **12 May 2026.** Mevcut 11 agent (v3.3 konsolidasyon sonrası) — eksik rol var mı?

## Mevcut 11 agent

| # | Agent | Mode | Scope |
|---|---|---|---|
| 1 | chief-of-staff | lead/architect/observer/brief | Tier dispatch, sentez, Codex gate |
| 2 | reviewer | review/audit/maintenance | 5-axis code + security + tech debt |
| 3 | frontend | spec/impl | Designer mockup + ui-agent code |
| 4 | writer | app-copy/marketing | İçerik + microcopy + SEO |
| 5 | supabase-agent | — | Schema, RLS, migration, edge function |
| 6 | infra-ops | — | Deploy, Cloudflare, secret rotation |
| 7 | ux-agent | — | User research, flow, CRO |
| 8 | darkmode-auditor | — | WCAG contrast + dark mode parity |
| 9 | uat-tester | — | Playwright E2E + smoke |
| 10 | researcher | — | Web research + fact-check + competitor |
| 11 | legal-reviewer | — | KVKK metin drift |

## Reform v3.4 sürecinde yapılan iş — agent eşleştirmesi

Bu session boyunca yapılan işleri agent'lara map ettim:

| İş | Yapılması gereken agent | Gerçekte | Eksik mi? |
|---|---|---|---|
| P0 security audit | reviewer (audit) | Claude solo | reviewer ✓ |
| A26 migration yazımı | supabase-agent + reviewer + Codex | Claude solo | supabase-agent dispatch eksikti |
| A26 apply | supabase-agent | Tuna manuel (login bekliyor) | ✓ |
| Hook scripting | chief-of-staff + infra-ops | Claude solo | OK (script-level) |
| KVKK metin GAP | legal-reviewer | spec referansı | ✓ |
| destek.css refactor | frontend (impl) + reviewer + Codex | Claude solo + spec | OK |
| Form labels | frontend (spec→impl) | Claude solo | spec yazıldı, impl spec'siz |
| Playwright audit | uat-tester | Claude solo | uat-tester dispatch eksikti |
| Codex strategy | chief-of-staff | Claude solo | OK (process strategy) |
| Plugin envanteri | chief-of-staff (architect mode) | Claude solo | OK |
| Cookie consent | frontend + legal-reviewer | Claude solo | legal-reviewer dispatch eksikti |
| DNS/TLS monitor | infra-ops | Claude solo | infra-ops dispatch eksikti |
| Lighthouse CI | infra-ops + uat-tester | Claude solo | dispatch eksikti |

## Tespit: Agent dispatch BAĞLI değil sadece reminder

Reform L1 (`agent dispatch zorunlu T2+`) çok sıkı kural ama bu session Claude **solo Edit/Write** yaptı. Dispatch hook (`detect-negative-feedback`, `dispatch-chief-of-staff`) sadece reminder/hint inject ediyor — Claude'a "ZORUNLU" diyor ama mekanik olarak engel yok.

Bu **yapısal bir eksiklik**. Çözüm seçenekleri:
1. **Gerçek block:** PreToolUse Edit/Write hook → T2+ tier ise Task() dispatch yapılmamışsa BLOK (`exit 2` ile Claude'a stderr) — agresif, workflow kıracak
2. **Audit log:** Her Edit'i agent dispatch oranı log'la, weekly review'da ratio düşükse uyar (Reform v3.4 J6 KPI)
3. **Soft warning:** Her Edit sonrası PostToolUse hook hatırlatır — şu an'kı yaklaşım, ihlal kolay

## Yeni rol gereksinimleri var mı?

Mevcut 11 agent değerlendirmesi:

🟢 **Kapsanan roller:**
- Architecture (chief-of-staff)
- Code review + audit + maintenance (reviewer)
- UI spec + impl (frontend)
- Backend DB (supabase-agent)
- DevOps (infra-ops)
- UX (ux-agent)
- A11y (darkmode-auditor)
- E2E test (uat-tester)
- External research (researcher)
- Legal (legal-reviewer)
- Content (writer)

🟡 **Overlap potansiyel:**
- `reviewer (maintenance mode)` ≈ `infra-ops` (tech debt, dependency update)
- `writer (marketing mode)` ≈ `researcher` (competitor analysis için)

🔴 **Eksik aday roller (Reform v3.4 sonrası tespit):**

### 1. `performance-agent` (yeni)
**Scope:** Lighthouse trend, Web Vitals, bundle size, CSS specificity, image optimization. Reform v3.4'te P2 audit yapıldı, devamı için sürekli agent gerek.
**Mevcut alternatif:** `reviewer (maintenance mode)` — ama maintenance "tech debt" odaklı, performance metric tracking spesifik değil.
**Karar:** ✅ Önerilen. `reviewer (perf mode)` olarak mode flag eklenebilir veya yeni agent.

### 2. `test-engineer` (yeni)
**Scope:** Test data hygiene, mutation testing, flaky test detect, coverage map. Reform v3.4 D6+D7'de spec yazıldı, devamı için agent gerek.
**Mevcut alternatif:** `uat-tester` — ama uat-tester Playwright spec yazımına odaklı. Mutation/coverage/data hygiene farklı.
**Karar:** ✅ Önerilen. `uat-tester (engineer mode)` mode flag eklenebilir.

### 3. `data-analyst` (kaldırıldı, geri eklenebilir)
**Scope:** PostHog funnel, cohort, A/B test, KPI dashboard.
**Status:** v3.3 reform'da chief-of-staff'a gömüldü. Reform v3.4 KPI snapshot otomasyon kuruldu — bu agent gerekli mi?
**Karar:** 🟡 KPI snapshot script otomasyon yeterli olabilir. Tuna karar.

### 4. `architect` (kaldırıldı)
**Status:** v3.3'te chief-of-staff'a gömüldü. T4 architecture iş için ayrı dispatch yapılmıyor.
**Karar:** 🟢 chief-of-staff yeterli, ayrı agent gereksiz.

## Önerilen v3.5 değişikliği

**11 → 11 (mode flag genişletme):**
- `reviewer` mode'larına `perf` ekle (Lighthouse trend, Web Vitals)
- `uat-tester` mode'larına `engineer` ekle (mutation, coverage, data hygiene)

Veya:

**11 → 12 (performance-agent eklenmesi):**
- Yeni `performance-agent` — Lighthouse/Web Vitals/bundle/specificity odaklı

## Önerim

**Mode flag genişletme** daha temiz — yeni agent şişme tekrar etmesin. Reviewer ve uat-tester'a mode ekle.

Bu commit'te değişiklik yok (sadece audit raporu). Tuna karar verirse v3.5'te apply.

## Apply

- [ ] Tuna onayla → reviewer + uat-tester mode flag genişletme
- [ ] Veya yeni performance-agent yarat
- [ ] Veya status quo (11 agent yeterli)
