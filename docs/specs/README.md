# docs/specs/ — UI/Feature Design Specs

> **Reform 11 May 2026 — PCV (Plan-Code-Verify) zorunluluğu.** Her T2+ UI feature için bu klasörde spec dosyası ZORUNLU. Pre-commit hook `scripts/tier-detect.sh` bloklar.

## Spec dosyası gereksinimleri

`docs/specs/<feature>.md` formatı:

```markdown
# Spec: <Feature adı>

> **Tarih:** YYYY-MM-DD | **Tier:** T2/T3 | **Status:** draft / approved / shipped

## Context
Niye bu feature? Hangi problem? Kullanıcı ne kazanır?

## ASCII Layout
```
┌─────────────────────────────────┐
│  [Avatar]  Aday Adı        ⋮   │
│            Marka · Pozisyon     │
│  ─────────────────────────────  │
│  Lokasyon · Deneyim   [Match]  │
└─────────────────────────────────┘
```

## Token Table
| Element | Property | Token | Light | Dark |
|---|---|---|---|---|
| Card BG | background | `--editorial-paper` | #FFFFFF | #1A1A1A |
| Card border | border-color | `--editorial-hairline-strong` | rgba(...) | rgba(...) |
| ... | ... | ... | ... | ... |

## Anatomy
- Dimensions: 280×120px (mobile 100% width)
- Spacing: padding `var(--space-5)`, gap `var(--space-3)`
- Typography: name `var(--font-body)` 14px, brand `var(--font-mono)` 11px
- Radius: card `var(--radius)` (10px), badge `var(--radius-pill)`

## Dark mode parity
Token table'da dark column ZORUNLU. Opacity-only YASAK.

## Edge cases
- Empty: "Aday bulunamadı" placeholder
- Loading: skeleton shimmer
- Error: red border + "Tekrar dene" button
- Disabled: opacity 0.5, cursor not-allowed

## Visual mockup
`docs/specs/<feature>.png` (Stitch/Recraft MCP veya designer manuel)

## Implementation notes
- CSS file: `css/panels/...`
- JS file: `js/...`
- HTML file: `<page>.html`
- Cache-bust: otomatik (`scripts/cachebust.sh` pre-commit)

## Tuna onay
- [ ] Mockup gösterildi
- [ ] Spec onaylandı (chat'te "ok/yap")
- [ ] Implementation greenlight
```

## İş akışı

1. **frontend agent spec mode** — bu template'le doldur, mockup üret
2. **Tuna onay** — chat'te explicit "ok/yap"
3. **frontend agent impl mode** — kod yaz, spec'ten sapma YASAK
4. **darkmode-auditor** — WCAG verify
5. **uat-tester** — Playwright screenshot (varsa)
6. **reviewer (review mode)** — 5-axis
7. **Commit** — `UI_VERIFIED=1 git commit -m "feat(<scope>): ... design-spec: docs/specs/<feature>.md"`

## Spec arşivlemek

Feature ship'lendikten sonra spec dosyası `status: shipped` olur, korunur. Silinmez — gelecek revize için kaynak.
