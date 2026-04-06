# Design Gap Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix HelloTalent's design system gaps: restructure CSS, standardize components, improve navigation IA.

**Architecture:** 4 sequential phases. Each phase completes one area fully. No phase depends on uncommitted work from a prior phase. CSS restructure moves code between files without changing class names. Component standardization introduces `ht-` prefixed BEM-lite classes with alias bridge for safe migration. IA changes add sidebar group labels and missing nav items.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase, GitHub Pages. No build tools. Playwright for testing.

**Spec:** `docs/superpowers/specs/2026-04-06-design-gap-remediation-design.md`

---

## File Map

### New Files (Kademe 0-1)

| File | Responsibility | Lines |
|------|---------------|-------|
| `css/tokens.css` | Design tokens: :root primitives, semantics, dark mode semantic overrides | ~140 |
| `css/layout.css` | App shell: header, sidebar, avatar dropdown, theme toggle, bottom nav, loading, app body | ~780 |
| `css/components.css` | Reusable UI: buttons, forms, cards, chips, tags, autocomplete, modals base, bento-grid base | ~280 |
| `css/wizard.css` | Onboarding wizard: progress bar, steps, wizard forms, wizard nav | ~200 |
| `css/panels/genel-bakis.css` | Panel: hero card, bento grid v3, completion bar | ~150 |
| `css/panels/merkezi.css` | Panel: identity card, MK cards, CV/AI grid, premium CTA | ~735 |
| `css/panels/sirketler.css` | Panel: brand editorial, flip cards, brand grid, multi-select | ~500 |
| `css/responsive.css` | All media queries consolidated: 768px, 640px, 480px | ~100 |
| `css/dark-mode.css` | Component + panel dark overrides (non-semantic) | ~450 |

### Modified Files

| File | Changes |
|------|---------|
| `profil.html:21,52` | Replace single `profil.css` link with 9 new CSS links |
| `profil.css` | Deleted after full extraction |
| `shared.css` | Remove 30 duplicate tokens, add `@import` for tokens.css |
| `profil.html:65-91` | Header nav reorder (Kademe 3) |
| `profil.html:199-236` | Sidebar: add group labels, add Yetkinlikler + Kim Bakti items |
| `profil.html:389-410` | Bottom nav: add 5th item (Kesfet) |
| `ik.html:523-573` | Sidebar: add group labels |

---

## Kademe 0 — Tool Setup + Token Audit

### Task 1: Install Design Tools

**Files:**
- Modify: `.claude/.mcp.json` (add Stitch + 21st.dev MCP configs)

- [ ] **Step 1: Install Google Stitch MCP**

```bash
npx @_davideast/stitch-mcp init
```

Follow the auth flow. Verify with:
```bash
npx @_davideast/stitch-mcp --version
```

- [ ] **Step 2: Install 21st.dev Magic MCP**

```bash
npx @21st-dev/cli@latest install claude
```

Requires API key from https://21st.dev/magic/console. Verify the MCP entry appears in `.claude/.mcp.json`.

- [ ] **Step 3: Install Pro UI UX Max skill**

```bash
npm install -g uipro-cli
uipro init --ai claude
```

Verify: `uipro --version`

- [ ] **Step 4: Disable Figma MCP**

In Claude Code settings, disable the Figma MCP server. It is replaced by Stitch + 21st.dev.

- [ ] **Step 5: Commit**

```bash
git add .claude/.mcp.json
git commit -m "chore: install design tools (Stitch, 21st.dev, Pro UI UX Max), disable Figma"
```

---

### Task 2: Create tokens.css — Single Source of Truth

**Files:**
- Create: `css/tokens.css`
- Read: `profil.css:6-135` (current token definitions)

- [ ] **Step 1: Take baseline screenshot**

```bash
npx playwright test tests/hellotalent.smoke.spec.js --reporter=list 2>&1 | tail -5
```

Record pass count. This is the baseline — no test should break during Kademe 0.

- [ ] **Step 2: Create css/ directory**

```bash
mkdir -p css/panels
```

- [ ] **Step 3: Create tokens.css with 3-layer naming**

Extract `profil.css:6-135` into `css/tokens.css`. Apply these changes during extraction:

```css
/* ── DESIGN TOKENS ── */

/* ═══ Layer 1: Primitives (raw values, never reference directly in rules) ═══ */
:root {
  color-scheme: light;
  --color-vermillion: #C94E28;
  --color-vermillion-light: #F5EDE9;
  --color-vermillion-dark: #b84420;
  --color-navy: #1E2D5E;
  --color-navy-light: #EEF0F7;
  --color-navy-deep: #162247;
  --color-gray: #F7F6F4;
  --color-green: #16a34a;
  --color-green-light: #F0FDF4;
  --color-green-border: #BBF7D0;
  --color-red: #dc2626;
  --color-red-light: #FEF2F2;
  --color-text: #111111;
  --color-muted: #6B7280;
  --color-border: #E5E3DF;

  /* Fonts */
  --font-head: 'Bricolage Grotesque', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
  --font-weight-normal: 400;
  --font-weight-medium: 500;

  /* Type scale */
  --text-xs: 10px;
  --text-sm: 11px;
  --text-base: 12px;
  --text-md: 13px;
  --text-lg: 14px;
  --text-xl: 16px;
  --text-2xl: 18px;
  --text-3xl: 20px;

  /* Spacing scale */
  --space-1: 2px;
  --space-2: 4px;
  --space-3: 6px;
  --space-4: 8px;
  --space-5: 10px;
  --space-6: 12px;
  --space-7: 14px;
  --space-8: 16px;
  --space-9: 20px;
  --space-10: 24px;
  --space-11: 28px;
  --space-12: 32px;

  /* Radius */
  --radius: 10px;
  --radius-sm: 7px;
  --radius-lg: 14px;

  /* Shadows */
  --shadow: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.07);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.08);

  /* Layout */
  --sidebar-w: 240px;
  --header-h: 60px;

/* ═══ Layer 2: Semantic (meaning — reference these in CSS rules) ═══ */

  /* Backwards compat aliases (keep until Kademe 2 migration completes) */
  --verm: var(--color-vermillion);
  --verm-light: var(--color-vermillion-light);
  --verm-dark: var(--color-vermillion-dark);
  --verm-text: var(--color-vermillion-dark);
  --navy: var(--color-navy);
  --navy-light: var(--color-navy-light);
  --navy-deep: var(--color-navy-deep);
  --gray: var(--color-gray);
  --text: var(--color-text);
  --muted: var(--color-muted);
  --border: var(--color-border);
  --green: var(--color-green);
  --green-light: var(--color-green-light);
  --green-border: var(--color-green-border);
  --red: var(--color-red);
  --red-light: var(--color-red-light);
  --mono: var(--font-mono);

  /* Surfaces */
  --bg-app: #ffffff;
  --bg-surface: #ffffff;
  --bg-elevated: var(--color-gray);

  /* Text */
  --text-primary: var(--color-text);
  --text-secondary: var(--color-navy);
  --text-muted: var(--color-muted);

  /* Borders */
  --border-subtle: var(--color-border);
  --border-strong: #D1D5DB;

  /* Accent */
  --accent: var(--color-vermillion);
  --accent-soft: var(--color-vermillion-light);
  --accent-text: var(--color-vermillion-dark);
  --accent-hover: var(--color-vermillion-dark);

  /* Status */
  --success: var(--color-green);
  --success-soft: var(--color-green-light);
  --warning: #B45309;
  --warning-soft: #FEF3C7;
  --danger: var(--color-red);
  --danger-soft: var(--color-red-light);

  /* Controls */
  --input-bg: #f3f3f5;
  --toggle-off: #cbced4;
  --focus-ring: rgba(0,0,0,0.1);

/* ═══ Layer 3: Component (usage) ═══ */

  --sidebar-bg: #ffffff;
  --sidebar-border: var(--border-subtle);
  --sidebar-accent: var(--color-gray);
  --sidebar-accent-foreground: var(--text-primary);
  --sidebar-primary: var(--color-vermillion);
  --sidebar-primary-foreground: #ffffff;
  --ring: var(--focus-ring);
}

/* ═══ Dark Mode — Semantic overrides ═══ */
html[data-theme="dark"] {
  color-scheme: dark;
  --bg-app: #050712;
  --bg-surface: #111827;
  --bg-elevated: #1F2937;

  --text-primary: #F9FAFB;
  --text-secondary: #E5E7EB;
  --text-muted: #9CA3AF;

  --border-subtle: #1F2937;
  --border-strong: #374151;

  --accent-soft: #2D1810;
  --success-soft: #0D2818;
  --warning: #F97316;
  --warning-soft: #2D1A0A;
  --danger-soft: #2D0A0A;

  --input-bg: #020617;
  --toggle-off: #4B5563;
  --focus-ring: rgba(96,165,250,0.6);

  --navy-deep: #0F1729;
  --navy: #7B93C4;
  --navy-light: rgba(123,147,196,0.12);
  --muted: #9CA3AF;

  --sidebar-bg: #020617;
  --sidebar-border: var(--border-subtle);
  --sidebar-accent: #0B1120;
  --sidebar-accent-foreground: var(--text-primary);
  --sidebar-primary: var(--color-vermillion);
  --sidebar-primary-foreground: #ffffff;
  --ring: var(--focus-ring);
}
```

Note: Dark mode `--accent-soft` now uses hex `#2D1810` instead of `rgba(201,78,40,0.18)` — consistent hex strategy per spec.

- [ ] **Step 4: Verify tokens.css is valid CSS**

Open in browser devtools or run:
```bash
npx stylelint css/tokens.css --fix 2>&1 || echo "No stylelint — visual check OK"
```

- [ ] **Step 5: Commit**

```bash
git add css/tokens.css
git commit -m "feat: create tokens.css with 3-layer naming convention"
```

---

### Task 3: Clean Up Token Issues

**Files:**
- Modify: `css/tokens.css` (remove unused, fix aliases — already done in Task 2)
- Modify: `profil.css:6-135` (replace with single-line import comment pointing to tokens.css)

This task verifies the 6 audit issues are resolved:

- [ ] **Step 1: Verify Issue 1 (duplicates) — resolved by tokens.css being single source**

```bash
# Count --verm definitions — should be 1 (in tokens.css as alias)
grep -r "\-\-verm:" css/tokens.css | wc -l
```
Expected: 1

- [ ] **Step 2: Verify Issue 2 (font vars) — resolved in tokens.css**

```bash
grep "\-\-font-head\|\-\-font-body\|\-\-font-mono" css/tokens.css
```
Expected: 3 lines (all three defined)

- [ ] **Step 3: Verify Issue 3 (naming) — resolved by 3-layer structure**

Primitive layer uses `--color-*`, semantic layer uses `--accent`, `--bg-*`, `--text-*`. Backwards compat aliases (`--verm`, `--navy`) bridge old references.

- [ ] **Step 4: Verify Issue 4 (dark RGBA) — resolved with hex pairs**

```bash
grep "accent-soft" css/tokens.css
```
Expected: Light `#F5EDE9` (via `--color-vermillion-light`), Dark `#2D1810` (hex, not rgba)

- [ ] **Step 5: Verify Issue 5 (unused tokens) — not carried over**

```bash
grep -E "\-\-aktif|\-\-pasif|\-\-gizli|\-\-tumur|\-\-none" css/tokens.css
```
Expected: 0 matches

- [ ] **Step 6: Verify Issue 6 (aliases) — removed**

```bash
grep "\-\-input-background\|\-\-switch-background" css/tokens.css
```
Expected: 0 matches (replaced with direct `--input-bg` and `--toggle-off`)

- [ ] **Step 7: Commit**

```bash
git add css/tokens.css
git commit -m "chore: verify all 6 token audit issues resolved"
```

---

## Kademe 1 — CSS Architecture Restructure

### Task 4: Extract layout.css

**Files:**
- Create: `css/layout.css`
- Read: `profil.css:145-923`

- [ ] **Step 1: Extract layout sections from profil.css**

Copy these exact line ranges from `profil.css` into `css/layout.css`:

| Section | Lines | Content |
|---------|-------|---------|
| Reset + focus | 136-162 | `*` reset, html, body, `:focus-visible` |
| Utilities | 164-179 | Margin, spacing, badge helpers |
| Header | 181-299 | Header, message icon, popup dropdown |
| Avatar button | 316-442 | Avatar button, avatar dropdown panel |
| Header nav | 443-504 | LinkedIn-style header nav |
| Sidebar | 505-614 | Sidebar nav, toggle, premium card |
| Theme toggle | 616-880 | Animated theme toggle (large section) |
| Loading | 881-904 | Loading animation, app body |
| Panels | 906-908 | Panel show/hide |
| Bottom nav | 910-923 | Mobile bottom navigation |

- [ ] **Step 2: Verify layout.css is self-contained**

All classes in `layout.css` should reference only tokens from `css/tokens.css` (loaded before it). Grep for any token not in tokens.css:

```bash
grep -oP 'var\(--[a-z-]+\)' css/layout.css | sort -u > /tmp/layout-vars.txt
grep -oP '\-\-[a-z-]+' css/tokens.css | sort -u > /tmp/token-vars.txt
comm -23 /tmp/layout-vars.txt /tmp/token-vars.txt
```
Expected: Empty (all vars defined in tokens)

- [ ] **Step 3: Commit**

```bash
git add css/layout.css
git commit -m "feat: extract layout.css from profil.css (header, sidebar, nav, theme toggle)"
```

---

### Task 5: Extract components.css

**Files:**
- Create: `css/components.css`
- Read: `profil.css:1057-1338`

- [ ] **Step 1: Extract component sections from profil.css**

Copy these exact line ranges into `css/components.css`:

| Section | Lines | Content |
|---------|-------|---------|
| Form fields | 1057-1079 | Input, select, textarea |
| Buttons | 1081-1128 | btn-primary, btn-secondary, btn-danger, etc. |
| Cards base | 1130-1139 | Base .card class |
| Experience cards | 1141-1181 | Experience-specific card styles |
| Delete button | 1183-1230 | Animated delete button (shared) |
| Dynamic rows | 1232-1255 | Education, language, cert row containers |
| Chips | 1257-1265 | Chip styles |
| Check items | 1267-1275 | Custom checkbox multi-select |
| Tags | 1277-1297 | Tag/badge variants |
| Autocomplete | 1298-1312 | Dropdown list |
| Dynamic rows JS | 1313-1321 | .dynamic-row |
| Chips row | 1323-1325 | Flex row |
| Required marker | 1327-1329 | Required field red asterisk |
| Field error | 1331-1332 | Error state |
| Modal premium | 1334-1338 | Modal footer |

Also extract `.bento-grid` base from line 1629 and 2333 — create one unified base:

```css
/* ── BENTO GRID BASE ── */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

Also extract modals base from lines 2531-2637 (modals, success modal, location modal).

Also extract toggle toast from lines 2481-2530.

- [ ] **Step 2: Verify no duplicate .bento-grid definitions**

```bash
grep -c "\.bento-grid" css/components.css
```
Expected: 1 (unified base class)

- [ ] **Step 3: Commit**

```bash
git add css/components.css
git commit -m "feat: extract components.css (buttons, cards, forms, chips, modals, bento base)"
```

---

### Task 6: Extract wizard.css

**Files:**
- Create: `css/wizard.css`
- Read: `profil.css:925-1050` + `profil.css:2658-2871`

- [ ] **Step 1: Extract wizard sections**

Copy these ranges into `css/wizard.css`:

| Section | Lines | Content |
|---------|-------|---------|
| Progress bar | 927-972 | Wizard progress bar |
| Wizard steps | 973-987 | Step containers |
| Wizard forms | 988-1017 | Step intro, form grouping, fields |
| Wizard inputs | 1018-1049 | Input consistency overrides |
| Wizard nav | 1050-1055 | Navigation buttons |
| Dashboard | 2658-2714 | Dashboard-specific |
| Step errors | 2715-2724 | Error messages |
| Custom checkbox | 2725-2778 | Custom checkbox styling |
| Work types | 2779-2786 | Calisma tipleri layout |
| Settings grid | 2787-2871 | Wizard step 6 settings |
| Section divider | 2872-2876 | Horizontal divider |
| Avatar upload | 2877-2889 | Avatar uploader |

- [ ] **Step 2: Commit**

```bash
git add css/wizard.css
git commit -m "feat: extract wizard.css (onboarding wizard, dashboard, settings grid)"
```

---

### Task 7: Extract panel CSS files

**Files:**
- Create: `css/panels/genel-bakis.css`
- Create: `css/panels/merkezi.css`
- Create: `css/panels/sirketler.css`
- Read: `profil.css:1340-1488`, `1489-2217`, `2218-2480`, `3157-3348`

- [ ] **Step 1: Extract genel-bakis.css**

Copy `profil.css:1340-1488` (Genel Bakis v3 hero + bento grid, locked cards).

- [ ] **Step 2: Extract merkezi.css**

Copy `profil.css:1489-2217` (Profil Merkezi identity card, MK bento, MK cards, controls, premium toggle, premium CTA, CV/AI grid cards).

- [ ] **Step 3: Extract sirketler.css**

Copy `profil.css:2218-2480` (Markalar editorial header, hero card, bento grid, section cards, experience items, education, tags, CV card, contact card, footer, empty state, stagger animation, responsive) + `profil.css:3157-3348` (brand editorial header, brand grid, flip cards, brand card v2, multi-select dropdown).

- [ ] **Step 4: Commit**

```bash
git add css/panels/
git commit -m "feat: extract panel CSS (genel-bakis, merkezi, sirketler)"
```

---

### Task 8: Extract responsive.css and dark-mode.css

**Files:**
- Create: `css/responsive.css`
- Create: `css/dark-mode.css`
- Read: `profil.css:2890-2950` (responsive), scattered dark mode lines

- [ ] **Step 1: Extract responsive.css**

Consolidate ALL media queries from profil.css:
- Lines 2890-2950: Main responsive block (768px, 480px, 640px)
- Line 977-979: Wizard step 2 width override
- Lines 2466-2480: Sirketler responsive
- Lines 3200-3204, 3270-3273: Brand grid breakpoints

Group by breakpoint:

```css
/* ── 768px (tablet/mobile) ── */
@media (max-width: 768px) {
  /* All 768px rules consolidated here */
}

/* ── 640px ── */
@media (max-width: 640px) {
  /* Wizard step overflow */
}

/* ── 480px (small mobile) ── */
@media (max-width: 480px) {
  /* All 480px rules consolidated here */
}
```

- [ ] **Step 2: Extract dark-mode.css**

Consolidate ALL non-semantic dark mode overrides:
- Lines 301-314: Dark popup
- Lines 425-441: Dark avatar dropdown
- Lines 2952-3155: Wizard steps 3-5 dark mode polish
- Lines 3308-3314: Brand cards dark
- Lines 3340-3347: Multi-select dark

Note: Semantic dark overrides (`:root` level `html[data-theme="dark"]`) stay in `tokens.css`. Only component/panel-level overrides go here.

- [ ] **Step 3: Commit**

```bash
git add css/responsive.css css/dark-mode.css
git commit -m "feat: extract responsive.css and dark-mode.css (consolidated from scattered rules)"
```

---

### Task 9: Wire Up New CSS Files in profil.html

**Files:**
- Modify: `profil.html:52` (replace single link with 9 links)

- [ ] **Step 1: Replace CSS link in profil.html**

Find at line 52:
```html
<link rel="stylesheet" href="profil.css?v=20260330a">
```

Replace with:
```html
<link rel="stylesheet" href="css/tokens.css?v=20260406a">
<link rel="stylesheet" href="css/layout.css?v=20260406a">
<link rel="stylesheet" href="css/components.css?v=20260406a">
<link rel="stylesheet" href="css/wizard.css?v=20260406a">
<link rel="stylesheet" href="css/panels/genel-bakis.css?v=20260406a">
<link rel="stylesheet" href="css/panels/merkezi.css?v=20260406a">
<link rel="stylesheet" href="css/panels/sirketler.css?v=20260406a">
<link rel="stylesheet" href="css/responsive.css?v=20260406a">
<link rel="stylesheet" href="css/dark-mode.css?v=20260406a">
```

- [ ] **Step 2: Run full smoke test**

```bash
npm run test:smoke
```

Expected: Same pass count as Task 2 Step 1 baseline. Zero regressions.

- [ ] **Step 3: Run dark mode test**

```bash
npx playwright test tests/dark-mode.spec.js --reporter=list
```

Expected: All pass.

- [ ] **Step 4: Delete profil.css**

Only after all tests pass:
```bash
rm profil.css
```

- [ ] **Step 5: Commit**

```bash
git add profil.html css/ && git rm profil.css
git commit -m "feat: wire modular CSS in profil.html, remove monolithic profil.css"
```

---

### Task 10: Update shared.css

**Files:**
- Modify: `shared.css`

- [ ] **Step 1: Remove duplicate tokens from shared.css**

In `shared.css`, find the `:root` block (around lines 9-59) that duplicates tokens from profil.css. Remove the 30 duplicated variables (`--verm`, `--navy`, `--gray`, spacing scale, type scale).

Keep landing-page-only tokens:
```css
:root {
  /* Landing page typography (responsive) */
  --heading-xl: clamp(36px, 5vw, 56px);
  --heading-lg: clamp(28px, 3.5vw, 40px);
  --heading-md: clamp(22px, 2.5vw, 32px);
  --heading-sm: 20px;
  --body-lg: 18px;
  --body-md: 16px;
  --body-sm: 14px;

  /* Landing page components */
  --lp-radius-pill: 24px;
  --lp-radius-btn: 28px;
  --lp-radius-card: 16px;
  --lp-section-pad: clamp(56px, 8vw, 96px) clamp(20px, 4vw, 48px);
  --lp-max-width: 1120px;
  --warm-gray: var(--color-gray);
}
```

- [ ] **Step 2: Add tokens.css import at top of shared.css**

Add as first line:
```css
@import url('css/tokens.css');
```

- [ ] **Step 3: Test landing pages**

Open `index.html`, `aday.html`, `isveren.html` in browser. Verify colors, fonts, spacing match pre-change appearance.

- [ ] **Step 4: Commit**

```bash
git add shared.css
git commit -m "refactor: shared.css imports tokens.css, remove 30 duplicate tokens"
```

---

## Kademe 2 — Component Standardization

### Task 11: Define ht-btn System

**Files:**
- Modify: `css/components.css` (add new classes at bottom)

- [ ] **Step 1: Add ht-btn base + variants to components.css**

Append to `css/components.css`:

```css
/* ══════════════════════════════════════════════
   HT COMPONENT SYSTEM — BEM-lite with ht- prefix
   ══════════════════════════════════════════════ */

/* ── HT-BTN ── */
.ht-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-8);
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  line-height: 1.4;
}
.ht-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ht-btn.is-loading { pointer-events: none; opacity: 0.7; }

.ht-btn--primary {
  background: var(--accent);
  color: #ffffff;
  border-color: var(--accent);
}
.ht-btn--primary:hover { background: var(--accent-hover); }

.ht-btn--secondary {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border-strong);
}
.ht-btn--secondary:hover { background: var(--bg-elevated); }

.ht-btn--danger {
  background: var(--danger);
  color: #ffffff;
  border-color: var(--danger);
}
.ht-btn--danger:hover { opacity: 0.9; }

.ht-btn--ghost {
  background: transparent;
  color: var(--accent-text);
  border-color: transparent;
  padding: var(--space-2) var(--space-4);
}
.ht-btn--ghost:hover { background: var(--accent-soft); }

.ht-btn--icon {
  padding: var(--space-3);
  border-radius: 50%;
  min-width: 36px;
  min-height: 36px;
}

.ht-btn--pill {
  border-radius: 24px;
  padding: var(--space-5) var(--space-10);
}

.ht-btn--sm { padding: var(--space-2) var(--space-5); font-size: var(--text-md); }
.ht-btn--lg { padding: var(--space-5) var(--space-10); font-size: var(--text-xl); }

/* Alias bridge — old classes forward to new system */
.btn-primary { composes: ht-btn ht-btn--primary; }
.btn-secondary { composes: ht-btn ht-btn--secondary; }
```

Note: `composes` is CSS Modules syntax and won't work in vanilla CSS. Instead, duplicate the properties in alias classes temporarily:

```css
/* ALIAS BRIDGE (temporary — remove after all HTML updated) */
/* These keep old class names working during migration */
```

Actually in vanilla CSS, the alias bridge means the old selectors keep their existing definitions. No changes needed — they already work. The bridge is implicit: old classes stay defined, new `ht-*` classes are added alongside. HTML is updated file-by-file to use new classes.

- [ ] **Step 2: Verify old classes still work**

```bash
npm run test:smoke
```

Expected: All pass (no classes were removed, only new ones added).

- [ ] **Step 3: Commit**

```bash
git add css/components.css
git commit -m "feat: add ht-btn component system (BEM-lite, 8 variants)"
```

---

### Task 12: Define ht-card, ht-chip, ht-modal, ht-toast, ht-input Systems

**Files:**
- Modify: `css/components.css`

- [ ] **Step 1: Add remaining component families**

Append to `css/components.css`:

```css
/* ── HT-CARD ── */
.ht-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  box-shadow: var(--shadow);
}
.ht-card__title {
  font-family: var(--font-head);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}
.ht-card__body { font-size: var(--text-lg); color: var(--text-primary); }
.ht-card--elevated { box-shadow: var(--shadow-md); }
.ht-card--frosted {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.ht-card--navy {
  background: var(--color-navy-deep);
  color: #ffffff;
  border-color: transparent;
}
.ht-card--interactive { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.ht-card--interactive:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }

/* ── HT-CHIP ── */
.ht-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-family: var(--font-body);
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}
.ht-chip.is-active {
  background: var(--accent-soft);
  color: var(--accent-text);
  border-color: var(--accent);
}
.ht-chip--removable { padding-right: var(--space-2); }
.ht-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px; height: 16px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 10px;
}
.ht-chip__remove:hover { background: var(--danger-soft); color: var(--danger); }

/* ── HT-MODAL ── */
.ht-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.ht-modal {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-10);
  max-width: 480px;
  width: 90%;
  box-shadow: var(--shadow-lg);
}
.ht-modal__title {
  font-family: var(--font-head);
  font-size: var(--text-2xl);
  font-weight: 600;
  margin-bottom: var(--space-6);
}
.ht-modal__actions {
  display: flex;
  gap: var(--space-4);
  justify-content: flex-end;
  margin-top: var(--space-8);
}

/* ── HT-TOAST ── */
.ht-toast {
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius);
  font-size: var(--text-lg);
  font-family: var(--font-body);
  display: none;
}
.ht-toast.is-visible { display: block; }
.ht-toast--success { background: var(--success-soft); color: var(--success); border: 1px solid var(--color-green-border); }
.ht-toast--error { background: var(--danger-soft); color: var(--danger); }

/* ── HT-INPUT ── */
.ht-input, .ht-select, .ht-textarea {
  width: 100%;
  padding: var(--space-4) var(--space-5);
  font-family: var(--font-body);
  font-size: var(--text-lg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.15s;
}
.ht-input:focus, .ht-select:focus, .ht-textarea:focus {
  border-color: var(--accent);
  outline: none;
}
.ht-input.is-error { border-color: var(--danger); }
.ht-textarea { min-height: 80px; resize: vertical; }

/* ── HT-TOGGLE ── */
.ht-toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.ht-toggle input { opacity: 0; width: 0; height: 0; }
.ht-toggle__slider {
  position: absolute;
  inset: 0;
  background: var(--toggle-off);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.ht-toggle__slider::before {
  content: '';
  position: absolute;
  left: 2px; top: 2px;
  width: 20px; height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.ht-toggle input:checked + .ht-toggle__slider { background: var(--accent); }
.ht-toggle input:checked + .ht-toggle__slider::before { transform: translateX(20px); }
```

- [ ] **Step 2: Run smoke tests**

```bash
npm run test:smoke
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add css/components.css
git commit -m "feat: add ht-card, ht-chip, ht-modal, ht-toast, ht-input, ht-toggle component systems"
```

---

### Task 13: Migrate HTML Files to ht- Classes (Page by Page)

**Files:**
- Modify: All 29 HTML files, one at a time

This is the longest task. Each HTML file is updated independently with a test after each.

- [ ] **Step 1: Create migration tracking file**

```bash
cat > /tmp/ht-migration-tracker.txt << 'EOF'
# HTML Migration Tracker — ht- class system
# Check off each file after migration + test pass
profil.html
ik.html
aday.html
isveren.html
index.html
giris.html
admin.html
coach-studio.html
hakkimizda.html
iletisim.html
blog.html
kariyer.html
pozisyonlar.html
sifre-yenile.html
gizlilik.html
kvkk.html
kullanim-sartlari.html
cerez-politikasi.html
gate.html
EOF
```

- [ ] **Step 2: For each HTML file, apply class substitutions**

Pattern for each file:
1. Open file
2. Search-replace button classes:
   - `class="btn-primary"` → `class="ht-btn ht-btn--primary"`
   - `class="btn-secondary"` → `class="ht-btn ht-btn--secondary"`
   - `class="btn btn-primary"` → `class="ht-btn ht-btn--primary"`
   - `class="btn btn-secondary btn-sm"` → `class="ht-btn ht-btn--secondary ht-btn--sm"`
   - `class="auth-btn primary"` → `class="ht-btn ht-btn--primary ht-btn--pill"`
   - `class="auth-btn outline"` → `class="ht-btn ht-btn--secondary ht-btn--pill"`
3. Run `npm run test:smoke` after each file
4. Commit after each file or batch of 3-5 similar files

Note: `profil.html` and `ik.html` are the largest — do those last after patterns are proven on smaller files.

- [ ] **Step 3: Start with small pages (gate.html, sifre-yenile.html, legal pages)**

These have minimal buttons and are low-risk.

- [ ] **Step 4: Migrate landing pages (aday.html, isveren.html, index.html)**

These use `.auth-btn` pattern — map to `.ht-btn--pill` variant.

- [ ] **Step 5: Migrate profil.html**

Largest file. Work section by section using HTML comment anchors. Do NOT rewrite entire file.

- [ ] **Step 6: Migrate ik.html**

Second largest. Same approach.

- [ ] **Step 7: Full regression test after all files migrated**

```bash
npm test
```

Expected: All 397+ tests pass.

- [ ] **Step 8: Commit**

```bash
git add *.html
git commit -m "feat: migrate all HTML files to ht- component class system"
```

---

### Task 14: Remove Old Class Aliases

**Files:**
- Modify: `css/components.css` (remove old class definitions)

- [ ] **Step 1: Grep for remaining old class usage**

```bash
grep -rn "btn-primary\|auth-btn\|tk-btn\|kc-btn\|mk-edit-btn\|fck-btn\|preset-btn\|follow-btn" *.html
```

Expected: 0 matches (all migrated to ht-*).

- [ ] **Step 2: Remove old button class definitions from components.css**

Remove all `.btn-primary`, `.btn-secondary`, `.auth-btn`, etc. definitions that are now superseded by `.ht-btn--*`.

Keep ONLY `.ht-*` classes.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add css/components.css
git commit -m "chore: remove legacy button class definitions, ht- system is sole owner"
```

---

### Task 15: Clean Inline Styles

**Files:**
- Modify: Multiple HTML files
- Modify: `css/components.css` (add utility classes if patterns repeat)

- [ ] **Step 1: Scan for repeated inline patterns**

```bash
grep -roh 'style="[^"]*"' *.html | sort | uniq -c | sort -rn | head -20
```

- [ ] **Step 2: Extract patterns used 2+ times to utility classes**

Add to `css/components.css`:

```css
/* ── HT UTILITIES ── */
.ht-text-muted { color: var(--text-muted); }
.ht-text-accent { color: var(--accent-text); }
.ht-text-center { text-align: center; }
.ht-mt-4 { margin-top: var(--space-4); }
.ht-mt-8 { margin-top: var(--space-8); }
.ht-hidden { display: none; }
```

Only add classes for patterns that actually repeat. Do not create speculative utilities.

- [ ] **Step 3: Replace inline styles in HTML files**

For each `style="color:var(--muted)"` → `class="ht-text-muted"` etc.

- [ ] **Step 4: Run smoke tests**

```bash
npm run test:smoke
```

- [ ] **Step 5: Commit**

```bash
git add css/components.css *.html
git commit -m "refactor: replace repeated inline styles with ht- utility classes"
```

---

## Kademe 3 — UI/UX Information Architecture

### Task 16: Add Sidebar Group Labels (profil.html)

**Files:**
- Modify: `profil.html:199-236`
- Modify: `css/layout.css` (add group label styles)

- [ ] **Step 1: Add group label styles to layout.css**

Append to `css/layout.css`:

```css
/* ── Sidebar Group Labels ── */
.sidebar-group-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: var(--space-6) var(--space-6) var(--space-2) var(--space-6);
  margin-top: var(--space-4);
}
.sidebar-group-label:first-child { margin-top: 0; }
.sidebar-separator {
  height: 1px;
  background: var(--border-subtle);
  margin: var(--space-4) var(--space-6);
}
```

- [ ] **Step 2: Update sidebar nav in profil.html**

Find sidebar nav at line 199-236. Replace with grouped structure:

```html
<nav class="sidebar-nav">
  <div class="sidebar-group-label">Profilim</div>
  <button class="nav-item active" id="nav-genel" data-panel="genel">
    <svg>...</svg><span>Genel Bakis</span>
  </button>
  <button class="nav-item" id="nav-merkez" data-panel="merkez">
    <svg>...</svg><span>Profil Merkezi</span>
  </button>
  <button class="nav-item" id="nav-yetkinlik" data-panel="yetkinlik">
    <svg>...</svg><span>Yetkinlikler</span>
  </button>
  <button class="nav-item" id="nav-kimbakti" data-panel="kimbakti">
    <svg>...</svg><span>Kim Bakti</span>
  </button>

  <div class="sidebar-group-label">Kesfet</div>
  <button class="nav-item" id="nav-sirketler" data-panel="sirketler">
    <svg>...</svg><span>Markalar</span>
  </button>
  <button class="nav-item" id="nav-teklifler" data-panel="teklifler">
    <svg>...</svg><span>Ozel Teklifler</span><span class="badge" id="badge-teklifler"></span>
  </button>
  <button class="nav-item" id="nav-mulakat" data-panel="mulakat">
    <svg>...</svg><span>Studyo</span>
  </button>

  <div class="sidebar-group-label">Iletisim</div>
  <button class="nav-item" id="nav-inbox" data-panel="inbox">
    <svg>...</svg><span>Mesajlar</span><span class="badge" id="badge-inbox-unread"></span>
  </button>
  <button class="nav-item" id="nav-bildirimler" data-panel="bildirimler">
    <svg>...</svg><span>Bildirimler</span><span class="badge" id="badge-bildirimler"></span>
  </button>

  <div class="sidebar-separator"></div>
  <button class="nav-item" id="nav-ayarlar" data-panel="ayarlar">
    <svg>...</svg><span>Ayarlar</span>
  </button>
</nav>
```

Note: Copy existing SVG icons from the original nav items. Add appropriate icons for Yetkinlikler and Kim Bakti.

- [ ] **Step 3: Verify panel switching works for new nav items**

The `data-panel` attribute must match existing panel IDs. `panel-yetkinlik` and `panel-kimbakti` already exist at profil.html lines 1622 and 1533.

Check that `shared.js` panel switching logic handles these panels:

```bash
grep -n "switchPanel\|data-panel" shared.js | head -20
```

- [ ] **Step 4: Run smoke tests**

```bash
npm run test:smoke
```

- [ ] **Step 5: Commit**

```bash
git add profil.html css/layout.css
git commit -m "feat: add grouped sidebar navigation with section labels (Profilim, Kesfet, Iletisim)"
```

---

### Task 17: Update Mobile Bottom Nav

**Files:**
- Modify: `profil.html:389-410`

- [ ] **Step 1: Update bottom nav to 5 items**

Find bottom nav at line 389. Replace inner content:

```html
<nav class="bottom-nav" id="bottom-nav">
  <div class="bottom-nav-inner">
    <button class="bn-item active" data-panel="genel">
      <svg><!-- existing grid icon --></svg>
      <span>Genel</span>
    </button>
    <button class="bn-item" data-panel="sirketler">
      <svg><!-- briefcase icon for Kesfet --></svg>
      <span>Kesfet</span>
    </button>
    <button class="bn-item" data-panel="inbox">
      <svg><!-- existing message icon --></svg>
      <span>Mesajlar</span>
      <span class="badge" id="badge-inbox-bn"></span>
    </button>
    <button class="bn-item" data-panel="teklifler">
      <svg><!-- existing gift icon --></svg>
      <span>Teklifler</span>
    </button>
    <button class="bn-item" data-panel="merkez">
      <svg><!-- existing profile icon --></svg>
      <span>Profil</span>
    </button>
  </div>
</nav>
```

- [ ] **Step 2: Verify 5 items fit on mobile viewport**

Check bottom nav CSS can handle 5 items. May need to reduce font-size or icon size slightly. Test at 390x844 viewport.

- [ ] **Step 3: Run smoke tests**

```bash
npm run test:smoke
```

- [ ] **Step 4: Commit**

```bash
git add profil.html
git commit -m "feat: add Kesfet to mobile bottom nav (5 items)"
```

---

### Task 18: Update Header Nav

**Files:**
- Modify: `profil.html:65-91`

- [ ] **Step 1: Reorder header nav items**

Find header nav at line 65. Update to:

```html
<nav class="header-nav" id="header-nav">
  <button class="hn-item active" data-panel="genel">
    <svg><!-- grid icon --></svg><span>Genel</span>
  </button>
  <button class="hn-item" data-panel="merkez">
    <svg><!-- clipboard icon --></svg><span>Profil</span>
  </button>
  <button class="hn-item" data-panel="sirketler">
    <svg><!-- briefcase icon --></svg><span>Kesfet</span>
  </button>
  <button class="hn-item" data-panel="inbox">
    <svg><!-- message icon --></svg><span>Mesajlar</span>
    <span class="badge" id="badge-inbox-hn"></span>
  </button>
  <button class="hn-item" data-panel="bildirimler">
    <svg><!-- bell icon --></svg><span>Bildirimler</span>
    <span class="badge" id="badge-bildirimler-hn"></span>
  </button>
</nav>
```

Changes from current:
- Teklifler removed from header (stays in sidebar)
- Studyo removed from header (accessible via Kesfet in sidebar)
- Mesajlar and Bildirimler added to header
- "Markalar" label changed to "Kesfet"

- [ ] **Step 2: Run smoke tests**

```bash
npm run test:smoke
```

- [ ] **Step 3: Commit**

```bash
git add profil.html
git commit -m "feat: reorder header nav (Genel, Profil, Kesfet, Mesajlar, Bildirimler)"
```

---

### Task 19: Add Sidebar Group Labels to ik.html

**Files:**
- Modify: `ik.html:523-573`
- Modify: `css/layout.css` (styles already added in Task 16)

- [ ] **Step 1: Update ik.html sidebar nav**

Find sidebar nav at line 523. Add group labels:

```html
<nav class="sidebar-nav">
  <div class="sidebar-group-label">Adaylar</div>
  <div class="nav-item active" data-panel="dashboard" onclick="switchPanel('dashboard',this)">
    <!-- existing icon + label -->
  </div>
  <div class="nav-item" data-panel="search" onclick="switchPanel('search',this)">
    <!-- existing -->
  </div>
  <div class="nav-item" data-panel="favoriler" onclick="switchPanel('favoriler',this)">
    <!-- existing -->
  </div>
  <div class="nav-item" data-panel="takipciler" onclick="switchPanel('takipciler',this)">
    <!-- existing -->
  </div>

  <div class="sidebar-group-label">Yonetim</div>
  <div class="nav-item" data-panel="pozisyonlar" onclick="switchPanel('pozisyonlar',this)">
    <!-- existing -->
  </div>
  <div class="nav-item" data-panel="kampanyalar" onclick="switchPanel('kampanyalar',this)">
    <!-- existing -->
  </div>
  <div class="nav-item" data-panel="mesajlar" onclick="switchPanel('mesajlar',this)">
    <!-- existing -->
  </div>

  <div class="sidebar-group-label">Sirket</div>
  <div class="nav-item" data-panel="sirket" onclick="switchPanel('sirket',this)">
    <!-- existing -->
  </div>
  <div class="nav-item" data-panel="ekip" onclick="switchPanel('ekip',this)">
    <!-- existing -->
  </div>

  <div class="sidebar-separator"></div>
  <div class="nav-item" data-panel="ayarlar" onclick="switchPanel('ayarlar',this)">
    <!-- existing -->
  </div>
</nav>
```

- [ ] **Step 2: Verify ik.html loads layout.css (or shared.css with group label styles)**

Check if ik.html uses shared.css or its own CSS. The `.sidebar-group-label` class needs to be available. If ik.html has its own `<style>` block for sidebar, add the group label styles there.

- [ ] **Step 3: Run smoke tests**

```bash
npm run test:smoke
```

- [ ] **Step 4: Commit**

```bash
git add ik.html
git commit -m "feat: add sidebar group labels to employer dashboard (Adaylar, Yonetim, Sirket)"
```

---

### Task 20: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: 397+ tests pass. Zero regressions.

- [ ] **Step 2: Run dark mode tests**

```bash
npx playwright test tests/dark-mode.spec.js --reporter=list
```

Expected: All pass.

- [ ] **Step 3: Visual check at both viewports**

Open profil.html at:
- Mobile: 390x844
- Desktop: 1440x900

Verify: sidebar groups visible, new nav items work, bottom nav shows 5 items, header nav reordered.

- [ ] **Step 4: Verify CSS file count and total lines**

```bash
echo "=== New CSS files ===" && wc -l css/*.css css/panels/*.css && echo "=== Total ===" && cat css/*.css css/panels/*.css | wc -l
```

Expected: ~3,300 lines total (same as original profil.css, now split across 9 files).

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: design gap remediation complete — 4 kademeler tamamlandi"
```

- [ ] **Step 6: Update docs/CURRENT-STATE.md**

Add entry documenting:
- CSS restructured: profil.css (3,349 lines) split into 9 modular files in css/
- Component system: ht- prefixed BEM-lite classes (7 families)
- Navigation: sidebar grouped (Profilim, Kesfet, Iletisim), Yetkinlikler + Kim Bakti added to nav
- Tools: Stitch MCP, 21st.dev, Pro UI UX Max installed. Figma MCP disabled.
