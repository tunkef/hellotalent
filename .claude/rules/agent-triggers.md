# Agent Triggers — Zorunlu Ajan Zincirleri

> Bu dosya HelloTalent Studio v3'te **hangi iş tipinin hangi ajan zincirini tetiklediğini** tanımlar.
> chief-of-staff dispatch sırasında bu kuralları kontrol eder; bypass için Tuna explicit "atla" demeli.
> Source: `docs/AGENTS.md` matrix + 25 Nisan 2026 ders (lead form solo push hatası).

## Tetikleme Matrisi

| İş Tipi | Tespit | Zorunlu Zincir | Tier |
|---|---|---|---|
| **Form / onboarding UI** | yeni `*-onboarding.html`, signup form, wizard, multi-step input | content-writer → ux-agent → designer → ui-agent → darkmode-auditor → uat-tester → code-reviewer | T2 |
| **UI component değişikliği** | `*.css`, inline `<style>`, component yenileme | designer → ui-agent → darkmode-auditor → code-reviewer | T2 |
| **Yeni HTML sayfası** | `*.html` root'ta veya `mockups/` altında yeni dosya | content-writer → designer → ui-agent → darkmode-auditor → uat-tester → code-reviewer | T2 |
| **Dark mode dokunuşu** | `data-theme="dark"`, `prefers-color-scheme`, dark token | designer → ui-agent → darkmode-auditor (zorunlu) | T2 |
| **Mikro-copy / içerik** | label, placeholder, button text, error msg, success | content-writer + avoid-ai-writing skill | T1 |
| **Marketing/landing copy** | `index.html` hero, kurumsal page, SEO | marketing-writer + ahrefs MCP | T1 |
| **Migration / RLS** | `supabase/migrations/*.sql` | supabase-agent → auditor → code-reviewer + Codex | T3 |
| **Edge Function** | `supabase/functions/*/index.ts` | supabase-agent → auditor → code-reviewer | T3 |
| **Auth / payment / KVKK** | giris, signup, Iyzico, sözleşme akışı | auditor → legal-reviewer → code-reviewer + Codex | T3 |
| **Architecture decision** | yeni table, API contract, major refactor | architect → auditor → code-reviewer + Codex | T4 |
| **Test eklenmesi/değişimi** | `tests/*.spec.js` | uat-tester | T1 |
| **Security audit** | RLS policy, PII handling | auditor (zorunlu) | T3 |
| **Public-site editorial** | Clatu-tarzı editorial sayfa | designer → ui-agent → content-writer → darkmode-auditor | T2 |

## Lead Form / Form UI Zincir (DETAY)

Form / onboarding / wizard değişikliklerinde **bypass yasak**:

```
1. content-writer + avoid-ai-writing skill
   → Tüm copy AI-ism'siz, Türk iş ton, persona-aware

2. ux-agent + onboarding-cro skill (opsiyonel ama önerilen)
   → Drop-off riski analizi, step sıralama

3. designer + impeccable-design skill (+ Stitch MCP varsa)
   → Token spec, light + dark mode + mobile breakpoint

4. ui-agent
   → Vanilla impl, BEM class, mobile-first, accessibility

5. darkmode-auditor + AccessLint MCP
   → WCAG AA contrast (light + dark), state'ler

6. uat-tester
   → Playwright matrix (4 viewport × 2 mode = 8+ senaryo)

7. code-reviewer
   → 5-axis review (correctness, readability, architecture, security, perf)

8. auditor (form KVKK consent içeriyorsa, ya da PII topluyor)
   → KVKK md.7/9/11 uyum, PII flow, service_role usage
```

## chief-of-staff Dispatch Disiplini

Chief-of-staff bir görev aldığında:

1. **Tier detect** — tabloya göre T1-T4 belirle
2. **Zincir tetikle** — bypass yasak; her ajan tamamlanmadan sonraki başlamaz (paralel olabilen ajanlar exception)
3. **Synthesize** — tüm ajan çıktılarını sentezleyip Tuna'ya tek raporla sun
4. **Pending approvals** — T3/T4 tier'da Codex çelişki varsa `.claude/agent-memory/pending-approvals.md`'ye düşür

## İhlal Halinde

- Solo push T2+ tier'da → code-reviewer kapısı reddetmeli (FAIL)
- Auto mode'a girince zincir bypass yasak — "execute immediately" = "ajanları hızla dispatch et", "tek başına yaz" değil
- Yanlışlıkla bypass'lanan iş tespit edilirse, `/si:review` ile pattern incelemesi → eğer recurring ise CLAUDE.md'ye ekle

## self-improving-agent Promote Süreci

Bu kural deposu büyürse `/si:promote` ile CLAUDE.md'ye graduate edilebilir. Mevcut başlangıç hâli: 25 Nisan 2026 lead form solo push hatasından öğrenilen pattern.

## Refs

- `docs/AGENTS.md` (lines 35-62) — full matrix + handoff pattern
- `CLAUDE.md` Studio v3 — tier sistemi
- `.claude/agent-memory/pending-rules.md` — graduate adayı kurallar
- 25 Nisan 2026 commit `cdc1298` + `8501fd8` — solo push case study
