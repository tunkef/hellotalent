# Spec: Form Input Label A11y Fix (FIX-3)

> **Tarih:** 2026-05-11 | **Tier:** T2 (UI/component) | **Status:** draft
> **Frontend agent dispatch:** spec mode → Tuna onay → impl mode

## Context

P3 a11y audit: 53 input `<label for="">` association eksik. Wrapper label heuristik 21 tanesinde mevcut (`<label>...<input id></label>` implicit). Gerçek issue: **32 input hiç label yok**.

WCAG 2.1 AA gereksinimleri:
- 1.3.1 Info and Relationships
- 3.3.2 Labels or Instructions
- 4.1.2 Name, Role, Value

## Action plan

### Kategori 1: HIDDEN INPUTS (8 input)
Label gerekmez (file input opener veya honeypot):
- `aday-hp` (honeypot)
- `avatar-file-hidden`, `avatar-file-input`, `cv-file-input` (file input behind button)
- `cb-aday-kvkk`, `cb-aday-newsletter`, `cb-aday-privacy` (signup checkbox — wrapper label var muhtemelen)
- `cb-k-kvkk`, `cb-k-newsletter`, `cb-k-privacy` (employer signup, aynı)

**Aksiyon:** verify wrapper label, aria-label ekle hidden inputlara açıklayıcı text.

### Kategori 2: SEARCH/COMMAND INPUTS (8 input)
`aria-label` yeterli, label.for opsiyonel:
- `adm-brands-search`, `brand-search`, `brand-follows-popup-search`
- `cmdk-input` (command palette)
- `brand-input` (filter)

**Aksiyon:** `aria-label="..."` ekle her birine.

### Kategori 3: FORM FIELDS (12+ kritik input — gerçek a11y issue)
Bu inputlar mutlaka `<label for="">` veya `aria-labelledby` gerekli:
- `confirm-password` (signup)
- `ekip-invite-email`
- `ik-co-brand-input`, `ik-co-name`, `ik-co-website`
- `ik-set-email`, `ik-set-fullname`, `ik-set-phone`
- `ik-set-notify-msg`, `ik-set-notify-pipeline`, `ik-set-notify-weekly`
- `f-brand-interest`
- `filter-exp-min`, `filter-exp-max`
- `avd-theme-checkbox`

**Aksiyon:** her form input için explicit `<label for="X">Açıklama</label>` ekle.

## ASCII layout

Mevcut form yapılarına dokunulmaz, sadece label HTML ekle.

```
<!-- ÖNCE -->
<input id="ik-set-email" type="email" placeholder="E-posta">

<!-- SONRA -->
<label for="ik-set-email" class="ht-form-label">E-posta</label>
<input id="ik-set-email" type="email" placeholder="E-posta">
```

## Token table

| Element | Property | Token | Light | Dark |
|---|---|---|---|---|
| `.ht-form-label` | color | `--editorial-ink-muted` | rgba(26,26,26,0.7) | rgba(240,240,240,0.7) |
| `.ht-form-label` | font-size | `--font-size-sm` | 13px | aynı |
| `.ht-form-label` | font-family | `--font-body` | Plus Jakarta | aynı |

## Verification

- `comm -23 <(input ids) <(label fors)` çıktısı 12 → ≤ 4 (sadece hidden + cb-* wrapper)
- AccessLint MCP scan WCAG 1.3.1, 3.3.2, 4.1.2 pass
- Playwright e2e screen reader test (axe-core integration)

## Codex review hedef

T2 değil — bu pure HTML edit, kod mantığı değişmez. Reviewer (review mode) yeterli.

## Approved? (Tuna)

- [ ] Onayla → frontend agent impl mode (32 input fix)
- [ ] Reddet
- [ ] Değiştir
