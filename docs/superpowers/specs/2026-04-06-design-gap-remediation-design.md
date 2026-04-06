# HelloTalent Design Gap Remediation Spec

**Date:** 2026-04-06
**Approach:** Hybrid — B depth, A scope control
**Stack constraint:** Vanilla HTML/CSS/JS (no framework migration)
**Design rule:** No emoji in any UI output

## Overview

4 phased remediation of HelloTalent design system gaps. Each phase completes one area fully before moving to the next. Phases are sequential — each builds on the prior.

```
Kademe 0: Tool Setup + Token Audit (no code changes)
Kademe 1: CSS Architecture Restructure (CSS only, no HTML changes)
Kademe 2: Component Standardization (CSS + HTML class updates)
Kademe 3: UI/UX Information Architecture (HTML nav + sidebar structure)
```

---

## Kademe 0 — Tool Setup + Token Audit

### 0.1 Tool Installation

| Tool | Type | Install | Purpose |
|------|------|---------|---------|
| Google Stitch MCP | MCP Server | `npx @_davideast/stitch-mcp init` | AI UI design reference — generates HTML/CSS mockups |
| 21st.dev Magic MCP | MCP Server | `npx @21st-dev/cli@latest install claude` | React component registry — vanilla reference/inspiration |
| Pro UI UX Max | Claude Skill | `npm install -g uipro-cli && uipro init --ai claude` | Design intelligence — 50+ styles, 161 palettes |
| Nano Banana 2 | Web/API | `gemini.google/overview/image-generation` | AI image generation for assets/illustrations |

**Figma MCP:** Disable in Claude Code settings. Stitch + 21st.dev replace it.

### 0.2 Token Audit — 6 Issues to Fix

**Issue 1: 30 duplicate tokens between shared.css and profil.css**
Both files define identical `--verm`, `--navy`, `--gray`, spacing scale, and type scale. Change in one requires change in both.
- Fix: Single `tokens.css` as source of truth. Both files import from it.

**Issue 2: Font variables missing**
`--mono` is defined but `--font-head` (Bricolage Grotesque) and `--font-body` (Plus Jakarta Sans) are hardcoded in CSS.
- Fix: Define `--font-head`, `--font-body`, `--font-mono` in tokens.css.

**Issue 3: Mixed naming conventions**
`--verm` (shorthand) + `--accent` (semantic) + `--lp-radius-pill` (prefixed) = 3 different conventions coexist.
- Fix: Adopt 3-layer naming standard (see 0.3).

**Issue 4: Dark mode RGBA inconsistency**
Light mode uses hex (`--accent-soft: #F5EDE9`), dark mode uses rgba (`rgba(201,78,40,0.18)`). Different visual strategies for the same token.
- Fix: Use hex pairs for both modes. Light `--accent-soft: #F5EDE9`, dark `--accent-soft: #2D1810`. Hex is consistent, inspectable, and avoids opacity stacking issues on nested elements.

**Issue 5: 5 unused tokens**
`--aktif`, `--pasif`, `--gizli`, `--tumur`, `--none` defined but never referenced.
- Fix: Delete them.

**Issue 6: Unnecessary aliases**
`--input-bg` aliases `--input-background`, `--ring` aliases `--focus-ring` — single indirection with no benefit.
- Fix: Remove aliases, use one name per token.

### 0.3 Token Naming Convention

3-layer system: Primitive -> Semantic -> Component. Each layer references only the layer above it.

```css
/* Layer 1: Primitive (raw values) */
--color-vermillion: #C94E28;
--color-navy: #1E2D5E;
--color-gray: #F7F6F4;

/* Layer 2: Semantic (meaning) */
--accent: var(--color-vermillion);
--bg-app: #ffffff;
--text-primary: #111111;

/* Layer 3: Component (usage) */
--sidebar-bg: var(--bg-app);
--btn-primary-bg: var(--accent);
--input-bg: var(--bg-elevated);
```

Usage rules:
- HTML/CSS references should use semantic tokens (Layer 2) by default.
- Component tokens (Layer 3) only when a component needs to deviate from semantic defaults.
- Primitive tokens (Layer 1) never referenced directly in CSS rules — only by semantic tokens.

---

## Kademe 1 — CSS Architecture Restructure

### 1.1 File Structure

**Current:** 2 CSS files (shared.css 878 lines + profil.css 3,349 lines) + 29 inline `<style>` blocks.

**Target:**

```
hellotalent/css/
  tokens.css          ~140 lines   Design tokens (:root + dark semantic overrides)
  layout.css          ~780 lines   Header, sidebar, avatar dropdown, theme toggle, bottom nav, app body
  components.css      ~280 lines   Buttons, forms, cards, chips, tags, autocomplete, modals base
  wizard.css          ~200 lines   4-step onboarding wizard + wizard-specific dark overrides
  responsive.css      ~100 lines   All media queries: 768px, 640px, 480px breakpoints
  dark-mode.css       ~450 lines   Component + panel dark overrides (excluding semantic tokens)
  panels/
    genel-bakis.css   ~150 lines   Hero card, bento grid v3, completion bar
    merkezi.css       ~735 lines   Identity card, MK cards, CV/AI grid, premium CTA + shimmer
    sirketler.css     ~500 lines   Brand editorial, flip cards, brand grid, multi-select

  shared.css          ~500 lines   Landing pages only (imports tokens.css, keeps lp-* tokens)
```

### 1.2 Load Order

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/wizard.css">
<link rel="stylesheet" href="css/panels/genel-bakis.css">
<link rel="stylesheet" href="css/panels/merkezi.css">
<link rel="stylesheet" href="css/panels/sirketler.css">
<link rel="stylesheet" href="css/responsive.css">
<link rel="stylesheet" href="css/dark-mode.css">
```

Each file depends only on files loaded before it. No circular dependencies.

### 1.3 Key Rules

- **No class name changes.** `class="btn-primary"` in HTML continues to work. Only the file where `.btn-primary` is defined moves.
- **Duplicate `.bento-grid`** (defined in both genel-bakis line 1385 and merkezi line 1630): move base class to `components.css`, panel-specific variants stay in panel files.
- **Scattered media queries** (found at lines 977, 2890, 3200, 3270): consolidate all into `responsive.css`.
- **Scattered dark mode** (found at lines 301, 425, 2937-3155, 3308, 3340): consolidate into `dark-mode.css`.
- **shared.css** loses 30 duplicate tokens, imports `tokens.css` instead. Landing-page-only tokens (`--heading-xl`, `--lp-*`) stay in shared.css.

### 1.4 Safety Net

1. Work in `feature/css-restructure` branch.
2. After each file move, run Playwright smoke tests (`npm run test:smoke`).
3. Each cluster (foundation, components, panels) gets its own commit + test.
4. Visual regression: compare screenshots before/after at 390x844 and 1440x900.

---

## Kademe 2 — Component Standardization

### 2.1 Current State

8 different button naming patterns found across 29 HTML files:
- `.btn-primary` (6x), `.auth-btn.primary` (8x), `.tk-btn` (6x), `.kc-btn` (6x)
- `.mk-edit-btn` (5x), `.fck-btn-primary` (5x), `.preset-btn` (11x), `.follow-btn` (6x)

### 2.2 Seven Component Families

| Family | Prefix | Variants | Current State |
|--------|--------|----------|---------------|
| Buttons | `ht-btn` | `--primary`, `--secondary`, `--danger`, `--ghost`, `--icon`, `--pill`, `--sm`, `--lg` | 8 different patterns |
| Cards | `ht-card` | `--elevated`, `--frosted`, `--navy`, `--interactive` | 5+ inconsistent variants |
| Form Elements | `ht-input`, `ht-select`, `ht-toggle`, `ht-checkbox` | size modifiers | scattered definitions |
| Modals | `ht-modal` | `--success`, `--picker` | 3 separate implementations |
| Chips & Tags | `ht-chip` | `--removable`, `--active` | similar but not unified |
| Bento Grid | `ht-bento` | col-span utilities | duplicate across 2 panels |
| Toast & Feedback | `ht-toast` | `--success`, `--error` | `div#[feature]-msg` pattern |

### 2.3 Naming Convention: BEM-lite with ht- prefix

```css
/* Block */
.ht-btn { }
.ht-card { }

/* Modifier (--variant) */
.ht-btn--primary { }
.ht-btn--sm { }

/* Element (__child) — only when needed */
.ht-card__title { }
.ht-modal__overlay { }

/* State (is-/has-) */
.ht-btn.is-loading { }
.ht-chip.is-active { }
```

`ht-` prefix = HelloTalent namespace. Prevents collision with any future 3rd party CSS.

### 2.4 Migration Strategy

1. **Define new classes** in `components.css`. All `ht-btn`, `ht-card` etc. written fresh.
2. **Create alias bridge.** Old classes temporarily retain their properties so nothing breaks.
3. **Update HTML page by page.** `class="btn-primary"` becomes `class="ht-btn ht-btn--primary"`. Playwright smoke test after each file.
4. **Delete aliases.** Once all 29 HTML files updated, grep for unused old classes and remove them.

### 2.5 Inline Style Cleanup

For the 29 HTML `<style>` blocks:
- Pattern used in 2+ pages: extract to `components.css`.
- Pattern used in 1 page only: stays page-specific.
- Inline `style=""` attributes using tokens (`style="color:var(--muted)"`): convert to utility classes (`class="ht-text-muted"`).

Rule: A pattern earns a place in `components.css` only when it repeats across pages.

---

## Kademe 3 — UI/UX Information Architecture

### 3.1 Current State (profil.html)

13 panels distributed across 3 navigation layers:
- **Header nav** (5 panels): Genel, Profil, Markalar, Teklifler, Studyo
- **Sidebar** (8 panels): Genel, Profil, Markalar, Studyo, Teklifler, Mesajlar, Bildirimler, Ayarlar
- **Avatar dropdown** (3 panels): Destek, Ayarlar, Beta

Problems:
- Yetkinlikler and Kim Bakti have NO nav entry — only reachable via bento card click.
- 3 nav layers with overlapping but inconsistent items.
- No visual grouping in sidebar — flat list of 8 items.

### 3.2 Panel Grouping (4 groups)

**Profilim** (user's own data):
- Genel Bakis (feed + overview)
- Profil Merkezi (bento cards)
- Yetkinlikler (29 skill bento)
- Kim Bakti (analytics)

**Kesfet** (outward-facing):
- Markalar (96 brand grid)
- Ozel Teklifler (job offers)
- Studyo (STAR+T coaching)

**Iletisim** (messaging):
- Mesajlar (bi-directional inbox)
- Bildirimler (activity feed)

**Hesap** (settings & support):
- Ayarlar (account + privacy)
- Destek Merkezi (help + tickets)
- Beta Avantajlari (premium)

### 3.3 Navigation Changes

**Sidebar redesign:**
- Add group labels (Profilim, Kesfet, Iletisim) as section dividers. Not collapsible — visual separation only.
- Add Yetkinlikler nav item under Profilim group.
- Add Kim Bakti nav item under Profilim group.
- Hesap group items below a subtle separator.

**Header nav update:**
- New order: Genel, Profil, Kesfet, Mesajlar, Bildirimler
- "Teklifler" moves to sidebar only (premium feature, creates noise in header).
- "Kesfet" is a new hub item — navigates to Markalar by default, with sub-nav to Studyo.

**Mobile bottom nav:**
- Current 4 items: Genel, Teklifler, Mesajlar, Profil
- New 5 items: Genel, Kesfet, Mesajlar, Teklifler, Profil
- "Kesfet" serves as mobile entry point to Markalar + Studyo.

### 3.4 ik.html (Employer) — Minimal Changes

Employer dashboard has 9 panels with a flatter structure. No radical changes needed.

Add sidebar group labels only:
- **Adaylar:** Dashboard, Aday Ara, Favoriler, Takipciler
- **Yonetim:** Pozisyonlar, Kampanyalar, Mesajlar
- **Sirket:** Sirket Profili, Ekip, Ayarlar

### 3.5 Implementation Steps

1. Add group labels to profil.html sidebar (CSS + minimal HTML).
2. Add Yetkinlikler and Kim Bakti as new sidebar nav items.
3. Add 5th mobile bottom nav item ("Kesfet").
4. Update header nav order (Genel, Profil, Kesfet, Mesajlar, Bildirimler).
5. Add group labels to ik.html sidebar.

---

## Cross-Cutting Concerns

### Testing Strategy
- Each kademe runs full Playwright smoke test suite after completion.
- Visual regression screenshots at 390x844 (mobile) and 1440x900 (desktop).
- Kademe 1 (CSS split) is highest risk — test after each cluster.
- Kademe 2 (component rename) tests after each HTML file update.

### Git Strategy
- Each kademe gets its own feature branch.
- Incremental commits within each kademe (per cluster / per file).
- Merge to main only after full test pass.

### Tools Usage
- Stitch + 21st.dev: reference for component design decisions in Kademe 2.
- Pro UI UX Max: design system generation and validation.
- Nano Banana 2: asset generation if needed for illustrations.
- All tools produce reference output only — final code is always vanilla HTML/CSS/JS.

### Constraints
- No emoji in any UI output.
- Turkish-only user-facing text.
- `var` (not const/let) for JavaScript.
- Cache-bust imports with `?v=YYYYMMDDx`.
- profil.html is 1708 lines — never rewrite entire file, edit section-by-section.
- ik.html is 4768 lines — same rule applies.
- Fonts: only Bricolage Grotesque, Plus Jakarta Sans, DM Mono. Never Inter or Roboto.
- No salary/maas features (deliberately removed).
- JavaScript uses IIFE pattern with `window._ht` namespace.
