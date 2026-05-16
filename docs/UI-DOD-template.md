# UI Definition of Done — Template (Reform 11 May 2026)

> Her T2+ UI feature için bu checklist tamamlanmadan **bitti** denmez. Pre-commit hook `scripts/tier-detect.sh` enforce eder.

## Checklist

### 1. Spec (frontend agent spec mode)
- [ ] `docs/specs/<feature>.md` dosyası mevcut
- [ ] ASCII layout çizildi
- [ ] Token table (Element/Property/Token/Light/Dark) dolduruldu
- [ ] Anatomy: dimension + spacing + typography + radius tanımlı
- [ ] Dark mode parity: opacity-only YOK, light → dark token map var
- [ ] Edge cases: empty / loading / error / disabled state çözüldü
- [ ] Visual mockup `docs/specs/<feature>.png` (Stitch/Recraft MCP)

### 2. Tuna onayı
- [ ] Tuna mockup'ı gördü
- [ ] Chat'te explicit "ok/yap" dedi
- [ ] Spec status `approved` set edildi

### 3. Implementation (frontend agent impl mode)
- [ ] Vanilla HTML/CSS/JS (no framework)
- [ ] `ht-` prefix BEM-lite class
- [ ] Token-strict: hardcoded hex/px YOK
- [ ] Spec dimension/spacing/typography'den sapma YOK
- [ ] IIFE wrap, `window._htX` cross-IIFE
- [ ] `console.log` YOK production
- [ ] Cache-bust manuel YOK (`scripts/cachebust.sh` pre-commit otomatik)
- [ ] Mobile-first 390×844
- [ ] WCAG AA: aria-label + focus + keyboard nav

### 4. Verify
- [ ] darkmode-auditor WCAG verify (light + dark contrast ratio)
- [ ] uat-tester Playwright screenshot (varsa)
- [ ] Local server hard-refresh: ik.html / profil.html / hr-pipeline.html scan
- [ ] Dark mode toggle test
- [ ] Mobile viewport test (390×844)
- [ ] Desktop viewport test (1440×900)
- [ ] Buton içinde simge/ok/+/→/emoji YOK
- [ ] Türkçe karakter tam (ç,ğ,ı,İ,ö,ş,ü)
- [ ] "Röportaj" YOK ("mülakat"/"iş görüşmesi")

### 5. Review
- [ ] reviewer (review mode) 5-axis pass
- [ ] BLOCKER yok
- [ ] HIGH bulgular fix edildi veya plana eklendi

### 6. Commit
- [ ] Commit message format: `feat(<scope>): <özet> — design-spec: docs/specs/<feature>.md`
- [ ] `UI_VERIFIED=1` env set
- [ ] Pre-commit hook chain PASS
- [ ] Push sonrası GH Pages hard refresh test

## Bypass (auditable)

Gerçekten hızlı geçici fix gerekiyorsa:

```bash
UI_VERIFIED=1 git commit -m "fix(<scope>): ... [design-bypass] gerekçe"
```

Bypass otomatik retrospective entry tetikler (`docs/retrospectives/<date>.md`). chief-of-staff haftalık Pazar review'da bakar.

## Önleyici hook'lar

- `scripts/tier-detect.sh` — T2 + spec marker yoksa pre-commit BLOK
- `scripts/check-ui-verify.sh` — UI_VERIFIED env yoksa BLOK
- `scripts/check-v2-retrospective.sh` — v2/redesign commit'lerde post-commit retrospective entry
- `scripts/cachebust.sh` — manuel `?v=` override

## Source

- CLAUDE.md Hot Rules
- `.claude/rules/learned/consolidated-2026-05.md` L2 (design system gate)
- `.claude/rules/ui-commit-discipline.md`
- `~/.claude/plans/imdi-agent-check-ve-dynamic-piglet.md` (Reform plan)
