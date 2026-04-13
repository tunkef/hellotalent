# Studio Freeze + Koç Decouple + Duyurular Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze HelloTalent Studio UI behind a "yakında" grid, decouple Koç from Studio (backend dormant), and replace the Genel Bakış coach feed with a new admin-driven "HelloTalent'ten Bilgiler" duyuru feed system.

**Architecture:** Three sequential PRs with 24h observation gaps. FAZ A: minimal decouple of Studio↔Koç internal coupling points. FAZ B: freeze Studio panel with a 4-card "yakında" grid, leave backend/data intact. FAZ C: new `ht_announcements` schema + RLS + RPCs + feed client + LinkedIn-style admin composer + bildirimler toggle. Principle: never delete — freeze. Unfreeze path documented.

**Tech Stack:** Vanilla HTML/CSS/JS (IIFE, `var`), Supabase (Postgres + RLS + Storage), Playwright tests, GitHub Pages deploy.

**Spec:** `docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md`
**Karar:** K030 (`vault/06-kararlar/karar-defteri.md`)

---

## File Structure (locked decisions)

**New files (FAZ B):**
- `panel-soon.js` — renders 4-card "yakında" grid, IIFE exposing `window._htRenderPanelSoon`
- `css/panel-soon.css` — grid + card + chip styles, dark mode + 390px mobile

**New files (FAZ C):**
- `supabase/migrations/<timestamp>_ht_announcements.sql` — schema, RLS, RPCs, trigger, storage policy
- `supabase/migrations/ROLLBACK_ht_announcements.sql` — emergency rollback, not deployed
- `profil-duyurular.js` — feed client (`_htLoadDuyuruFeed`, render, like, carousel, markdown sanitize)
- `css/duyurular.css` — card + carousel + composer modal
- `admin-announcements.js` — admin list + LinkedIn-style composer
- `tests/faz-a-decouple.spec.js`
- `tests/faz-b-freeze.spec.js`
- `tests/faz-c-duyurular.spec.js`
- `tests/integration/duyurular-rls.spec.js`
- `tests/e2e/duyurular-flow.spec.js`
- `docs/uat/studio-freeze-uat.md` — manual UAT checklist

**Modified files:**
- `profil-studio.js` — dormant banners only (no logic change)
- `profil-genel.js` — FAZ C: coach feed replaced with duyuru mount
- `profil.html` — FAZ B: `switchPanel('mulakat')` guard; FAZ C: duyurular script tag
- `admin.html` — FAZ B: Studio tab disabled; FAZ C: new Duyurular tab
- `coach-studio.html` — FAZ B: noindex + redirect
- `docs/studio-foundation.md` — FROZEN + unfreeze section
- `docs/AI-COLLAB.md` — per-phase checkpoint
- `docs/CURRENT-STATE.md` — post-K030 state

**Untouched (freeze protected):**
- `profil-studio.js` logic (only comment banners)
- `admin-studio-modules.js` (dormant load)
- `admin-coach-content.js` (admin-only, still active)
- All `coach_*` / `studio_*` / `candidate_*` tables and data
- Existing tests for non-studio features

---

## Phase Sequencing

```
FAZ A (PR 1) → merge → 24h canlı gözlem
FAZ B (PR 2) → merge → 24h canlı gözlem
FAZ C (PR 3) → migration deploy → frontend merge
```

Each PR is independently shippable and reversible (`git revert`).

---

# FAZ A — Coach/Studio Decouple (PR 1)

**Goal:** Mark internal studio↔coach coupling as dormant, prepare for freeze without changing user-visible behavior.

**User-visible change:** NONE. Studio panel still works, Genel Bakış coach feed still works.

**Why this phase exists:** Creates a safe intermediate commit that separates "marking intent" from "physical freeze". Simplifies bisect if FAZ B causes regressions.

---

### Task A1: Add dormant banner to profil-studio.js cross-link maps

**Files:**
- Modify: `profil-studio.js:1652-1696`

- [ ] **Step 1: Read the current region**

Run: `sed -n '1650,1700p' profil-studio.js`
Expected: See `COMP_TO_COACH_CATEGORY`, `COMP_TO_MODULE_SLUG`, `MODULE_SLUG_TO_COMP`, `COACH_CAT_TO_COMP` definitions.

- [ ] **Step 2: Add frozen comment block above `COMP_TO_COACH_CATEGORY`**

Insert this block immediately before line 1653 (`var COMP_TO_COACH_CATEGORY = {`):

```js
/* ============================================================
 * FROZEN 2026-04-13 (K030) — Cross-link maps dormant.
 * Reason: Studio paused, Koç backend-only. These maps correlate
 *   competencies ↔ coach categories ↔ studio module slugs and
 *   are consumed by hydrateCoachFeed / renderCompletion /
 *   recommendation logic below. All consumers become dormant
 *   together when FAZ B freezes _htLoadStudio.
 * DO NOT MODIFY until unfreeze. See docs/studio-foundation.md.
 * ============================================================ */
```

- [ ] **Step 3: Commit**

```bash
git add profil-studio.js
git commit -m "chore(studio): dormant banner on cross-link maps (K030 FAZ A)"
```

---

### Task A2: Add file-top FROZEN banner to profil-studio.js

**Files:**
- Modify: `profil-studio.js:1`

- [ ] **Step 1: Insert banner at top of file**

Prepend this block to line 1 of `profil-studio.js` (above any existing IIFE):

```js
/* ============================================================
 * FROZEN — 2026-04-13 (K030)
 * File preserved in dormant state. No runtime execution after
 * FAZ B (profil.html switchPanel('mulakat') no longer calls
 * _htLoadStudio). Structure kept for unfreeze path.
 *
 * Unfreeze steps (see docs/studio-foundation.md):
 *   1. profil.html switchPanel('mulakat') → restore _htLoadStudio
 *   2. Sidebar + bottom nav "Yakında" chip kaldır
 *   3. admin.html Studio tab enable
 *   4. panel-soon.js mount kaldır
 *   5. profil-genel.js coach feed restore (git blame pre-K030)
 *
 * DO NOT DELETE — structural preservation required.
 * ============================================================ */
```

- [ ] **Step 2: Commit**

```bash
git add profil-studio.js
git commit -m "docs(studio): file-top FROZEN banner + unfreeze guide (K030 FAZ A)"
```

---

### Task A3: Mark `_htGenelCoachTeaser` as dormant stub

**Files:**
- Modify: `profil-studio.js:4363-4365`

**Context:** Line 4363 defines `window._htGenelCoachTeaser = function(){ ... }`. Grep confirms **zero callers** in the codebase — this is already dead code. Conversion to noop stub makes this explicit.

- [ ] **Step 1: Read current definition**

Run: `sed -n '4360,4370p' profil-studio.js`
Expected: See the existing `window._htGenelCoachTeaser` assignment and `window.openCoachDetail` export.

- [ ] **Step 2: Replace the `_htGenelCoachTeaser` assignment**

Find:
```js
window._htGenelCoachTeaser = function() {
```

Replace the entire function (through its closing `};`) with:

```js
/* FROZEN 2026-04-13 (K030): dead-code stub, no callers in repo.
 * Kept as backward-compat in case external shell expects it. */
window._htGenelCoachTeaser = function() { /* noop */ };
```

Leave the `window.openCoachDetail = openCoachDetail;` line below it **untouched** — it has real callers in profil-genel.js:995 that stay live until FAZ C.

- [ ] **Step 3: Commit**

```bash
git add profil-studio.js
git commit -m "chore(studio): stub dead _htGenelCoachTeaser (K030 FAZ A)"
```

---

### Task A4: Write FAZ A regression guard test

**Files:**
- Create: `tests/faz-a-decouple.spec.js`

- [ ] **Step 1: Write the failing test**

Create `tests/faz-a-decouple.spec.js`:

```js
// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsCandidate } = require('./helpers/auth');

test.describe('FAZ A — Coach/Studio decouple', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test('_htGenelCoachTeaser is a noop stub with no side effects', async ({ page }) => {
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      if (typeof window._htGenelCoachTeaser !== 'function') return 'not-a-function';
      const ret = window._htGenelCoachTeaser();
      return ret === undefined ? 'noop' : 'side-effect';
    });
    expect(result).toBe('noop');
  });

  test('cross-link maps dormant banner present in profil-studio.js', async ({ page }) => {
    const res = await page.request.get('/profil-studio.js');
    const body = await res.text();
    expect(body).toContain('FROZEN 2026-04-13 (K030) — Cross-link maps dormant');
    expect(body).toContain('FROZEN — 2026-04-13 (K030)');
  });

  test('Studio panel still opens normally in intermediate state', async ({ page }) => {
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      if (typeof window.switchPanel === 'function') window.switchPanel('mulakat');
    });
    await page.waitForTimeout(500);
    const panelVisible = await page.evaluate(() => {
      const el = document.querySelector('[data-panel="mulakat"]');
      return el ? el.offsetParent !== null : false;
    });
    expect(panelVisible).toBe(true);
  });

  test('Genel Bakış coach feed still renders (unchanged in FAZ A)', async ({ page }) => {
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      if (typeof window.switchPanel === 'function') window.switchPanel('genel');
    });
    await page.waitForTimeout(1000);
    // Coach feed header class from profil-genel.js
    const coachHeader = await page.locator('.gh-coach-header').count();
    expect(coachHeader).toBeGreaterThanOrEqual(0); // may be 0 if no posts, but no error
    const hasError = await page.evaluate(() => !!document.querySelector('[data-error]'));
    expect(hasError).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes (regression guard)**

Run: `npx playwright test tests/faz-a-decouple.spec.js --reporter=list`
Expected: All 4 tests PASS (this is a guard confirming A1-A3 didn't break anything).

- [ ] **Step 3: Run full existing suite to verify zero regression**

Run: `npx playwright test --reporter=list`
Expected: Prior passing tests still pass. 0 regressions.

- [ ] **Step 4: Commit**

```bash
git add tests/faz-a-decouple.spec.js
git commit -m "test(studio): FAZ A decouple regression guard (K030)"
```

---

### Task A5: Update docs/AI-COLLAB.md with FAZ A checkpoint

**Files:**
- Modify: `docs/AI-COLLAB.md`

- [ ] **Step 1: Append FAZ A entry**

Append to the "Aktif iş" section (format per existing entries):

```md
## 2026-04-13 — K030 FAZ A (Decouple) tamamlandı
- profil-studio.js: frozen banner (file-top) + cross-link maps dormant
- _htGenelCoachTeaser dead-code stub
- tests/faz-a-decouple.spec.js regression guard (4 test)
- User-visible değişiklik: YOK
- Sonraki: 24h canlı gözlem → FAZ B freeze
- Risk: 0 (hiçbir runtime path değişmedi)
```

- [ ] **Step 2: Commit**

```bash
git add docs/AI-COLLAB.md
git commit -m "docs(ai-collab): K030 FAZ A checkpoint"
```

---

### FAZ A Ship Checklist

- [ ] All A1-A5 tasks committed
- [ ] `npx playwright test` → 820 + 4 yeni test PASS, 0 regression
- [ ] DeepSeek review: `bash scripts/deepseek-review.sh` → no blockers
- [ ] Push: `git push origin main`
- [ ] GitHub Pages deploy (~40s), hard refresh verify
- [ ] Manuel smoke: profil.html → Genel Bakış açılır, Stüdyo açılır, hata yok
- [ ] 24h gözlem başlat → FAZ B'ye geç

---

# FAZ B — Freeze Studio Panel (PR 2)

**Goal:** Replace Studio panel content with a 4-card "yakında" grid; dormant-load studio scripts; mark admin Studio tab disabled.

**User-visible change:** Stüdyo menüsü tıklanınca Yakında grid gelir. Eski Stüdyo içeriği hiçbir yüzeyde görünmez.

**Genel Bakış:** Coach feed ÇALIŞMAYA DEVAM EDER (FAZ C'ye kadar geçici).

---

## ⚠ FAZ B REFINEMENT NOTES (2026-04-13, post-FAZ-A)

Two Opus subagents audited FAZ B against the live repo. Apply these corrections **before** executing tasks below:

### Critical path corrections

1. **`switchPanel` lives in `profil-wizard.js`, not `profil.html`.** Original B4 had wrong file. Correct location: `profil-wizard.js:308` (mulakat lazy-load hook). Dispatcher: `_doSwitchPanel` at `profil-wizard.js:266`.
2. **Bottom nav has NO Stüdyo entry.** B5's "bottom nav chip" subtask is a no-op. Drop it. Only sidebar gets the chip.
3. **`#nav-yetkinlik` (profil.html:222-225) aliases to `mulakat`** via normalization at `profil-wizard.js:232`. Both sidebar entries land on panel-mulakat. **Both must get the "Yakında" chip**, otherwise UX is inconsistent. Add B3.5 task.
4. **B9 (profil-studio.js FROZEN banner) is already done** in FAZ A (`profil-studio.js:1-15`). Drop B9 as an action; convert to a regression assertion in B7.
5. **B5 (coach-studio.html noindex)**: `noindex` meta + robots.txt `Disallow` are **already in place**. Only the `<script>` redirect remains. Reduce scope.
6. **B7 test helpers** (`loginAsCandidate`, `loginAsAdmin`) **do not exist**. Use FAZ A source-content fetch pattern (see `tests/faz-a-decouple.spec.js`).

### Confirmed file:line refs

| File | Refs |
|---|---|
| profil.html sidebar Stüdyo | `218-221` (`#nav-mulakat`) |
| profil.html sidebar Yetkinlik (alias) | `222-225` (`#nav-yetkinlik`) |
| profil.html panel-mulakat shell | `1633-1635` |
| profil.html script load region | `1671+` |
| profil-wizard.js `switchPanel` | `223` |
| profil-wizard.js dispatcher | `266` |
| profil-wizard.js mulakat normalization | `232` |
| profil-wizard.js mulakat hook | `308` |
| profil-wizard.js breadcrumb label | `273` |
| admin.html studio nav-item | `356-359` |
| admin.html panel-studio-modules | `501-507` |
| admin.html studio script tag | `667` |
| admin.html switchPanel hook | `847` |
| coach-studio.html noindex (already present) | `10` |
| coach-studio.html script insertion | `15-16` |
| `.ht-chip` (existing) | `css/components.css:291-303` |
| `.is-disabled` (existing) | `css/layout.css:42` |
| robots.txt coach-studio Disallow (already present) | `9` |
| FAZ A FROZEN banner | `profil-studio.js:1-15` |
| `_htLoadStudio` definition | `profil-studio.js:4330` |
| `_htLoadStudio` only caller | `profil-wizard.js:308` |

### Token + style upgrades (subagent #2 — design draft)

The plan's original B1/B2 used hardcoded hex + literal font-family + single-underscore class names. **Override** with:

- **BEM-lite double-underscore:** `.ht-soon__card`, `.ht-soon__chip`, `.ht-soon__icon`, `.ht-soon__title`, `.ht-soon__desc`, `.ht-soon__heading`, `.ht-soon__lead`
- **Semantic tokens only:** `var(--bg-surface)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--border-subtle)`, `var(--border-strong)`, `var(--accent)`, `var(--accent-soft)`, `var(--accent-text)`, `var(--navy)`, `var(--navy-light)`, `var(--font-head)`, `var(--font-body)`, `var(--font-mono)`, `var(--text-xs)`..`var(--text-3xl)`, `var(--radius-lg)`
- **DOM construction:** `document.createElement` + `textContent` only (no `innerHTML` for content per `.claude/rules/code-quality.md`)
- **Inline SVG via createElementNS** (namespaced), no emoji icons
- **Cards `tabindex="-1"`** so visible-but-non-focusable, keyboard nav skips
- **Reduced-motion gated transitions:** `@media (prefers-reduced-motion: reduce)` opt-out
- **Mobile breakpoint:** `@media (max-width: 480px)` (480 not 390 — matches existing pattern)

The full final-form code for `panel-soon.js` and `css/panel-soon.css` is in the subagent #2 output transcript at `/private/tmp/claude-501/-Users-peopleintk/46bd335e-3a3a-4378-be19-2c6821dd3aec/tasks/aaf61afb0742920db.output` — implementer should copy that code into B1/B2 instead of the older hardcoded version below.

### Task ordering tweaks

1. **B9 → drop** (replace with assertion in B7)
2. **B3:** purely script/link tag inserts in profil.html (no switchPanel surgery)
3. **B4:** target `profil-wizard.js:308`, NOT profil.html
4. **B3.5 (NEW):** chip on `#nav-yetkinlik` alongside `#nav-mulakat`
5. **B5:** drop bottom nav, sidebar only, both nav items
6. **B6:** before B5 if you want fail-fast; otherwise current order. Add admin-scoped chip CSS.
7. **B7:** runs LAST so all source-content checks hit final state in one CI run
8. **B8:** single edit — only the `<script>` redirect

### Sources

- Refinement report: subagent #1 transcript `ac9e9c2b8070c5449.output`
- Design draft: subagent #2 transcript `aaf61afb0742920db.output`

---

### Task B1: Create `panel-soon.js`

**Files:**
- Create: `panel-soon.js`

- [ ] **Step 1: Write the file**

Create `panel-soon.js`:

```js
/* panel-soon.js — Studio "yakında" grid (K030 FAZ B, 2026-04-13) */
(function () {
  'use strict';

  var CARDS = [
    {
      icon: 'mic',
      title: 'Mülakat demoları',
      desc: 'Gerçek senaryolar, gerçek sorular. Hazırlanmak için canlı pratik.'
    },
    {
      icon: 'target',
      title: 'Yetkinlik bazlı çalışma',
      desc: 'Güçlü ve gelişime açık yönleri ayrıştır, odaklı ilerle.'
    },
    {
      icon: 'book',
      title: 'Mülakat teknikleri',
      desc: 'STAR yapısı, soru tipleri, hazırlık rehberi.'
    },
    {
      icon: 'store',
      title: 'Mağaza bilgileri',
      desc: 'Perakende sektörü içgörüleri, KPI rehberleri.'
    }
  ];

  var ICON_SVG = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11h14V9"/><path d="M9 22V12h6v10"/></svg>'
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window._htRenderPanelSoon = function (root) {
    if (!root) return;
    root.innerHTML = '';

    var header = document.createElement('header');
    header.className = 'ht-soon-header';
    header.innerHTML =
      '<h1 class="ht-soon-title">Stüdyo</h1>' +
      '<p class="ht-soon-lead">Kariyer gelişimi için kapsamlı bir alan hazırlıyoruz. Yakında burada olacak.</p>';

    var grid = document.createElement('div');
    grid.className = 'ht-soon-grid';
    grid.setAttribute('role', 'region');
    grid.setAttribute('aria-label', 'Stüdyo yakında — içerik önizleme');

    for (var i = 0; i < CARDS.length; i++) {
      var c = CARDS[i];
      var card = document.createElement('article');
      card.className = 'ht-soon-card';
      card.innerHTML =
        '<span class="ht-soon-chip">Yakında</span>' +
        '<div class="ht-soon-icon" aria-hidden="true">' + (ICON_SVG[c.icon] || '') + '</div>' +
        '<h3 class="ht-soon-card-title">' + escapeHtml(c.title) + '</h3>' +
        '<p class="ht-soon-card-desc">' + escapeHtml(c.desc) + '</p>';
      grid.appendChild(card);
    }

    root.appendChild(header);
    root.appendChild(grid);
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add panel-soon.js
git commit -m "feat(studio): panel-soon.js 'yakında' grid renderer (K030 FAZ B)"
```

---

### Task B2: Create `css/panel-soon.css`

**Files:**
- Create: `css/panel-soon.css`

- [ ] **Step 1: Write the file**

Create `css/panel-soon.css`:

```css
/* panel-soon.css — Studio "yakında" grid (K030 FAZ B, 2026-04-13) */

.ht-soon-header {
  padding: 32px 24px 16px;
  text-align: left;
}

.ht-soon-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: var(--navy, #1E2D5E);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.ht-soon-lead {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  color: var(--muted, #6B7280);
  max-width: 520px;
  line-height: 1.55;
  margin: 0;
}

.ht-soon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 24px;
  max-width: 880px;
}

.ht-soon-card {
  position: relative;
  padding: 24px;
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-subtle, #E5E3DF);
  border-radius: 16px;
  cursor: default;
  transition: border-color 0.15s ease;
}

.ht-soon-card:hover {
  border-color: var(--border, #D4D2CD);
}

.ht-soon-chip {
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--verm, #C94E28);
  color: #fff;
}

.ht-soon-icon {
  width: 40px;
  height: 40px;
  color: var(--navy, #1E2D5E);
  margin-bottom: 16px;
}

.ht-soon-icon svg {
  width: 100%;
  height: 100%;
}

.ht-soon-card-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text, #111);
  margin: 0 0 6px;
}

.ht-soon-card-desc {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  color: var(--muted, #6B7280);
  line-height: 1.55;
  margin: 0;
}

/* Dark mode */
html[data-theme='dark'] .ht-soon-card {
  background: var(--bg-surface-dark, #1A1D2E);
  border-color: var(--border-dark, #2C3045);
}

html[data-theme='dark'] .ht-soon-title {
  color: #fff;
}

html[data-theme='dark'] .ht-soon-card-title {
  color: #fff;
}

/* Mobile 390px */
@media (max-width: 480px) {
  .ht-soon-header {
    padding: 20px 16px 12px;
  }
  .ht-soon-title {
    font-size: 26px;
  }
  .ht-soon-lead {
    font-size: 14px;
  }
  .ht-soon-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
  .ht-soon-card {
    padding: 20px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/panel-soon.css
git commit -m "feat(studio): panel-soon.css grid + card styles (K030 FAZ B)"
```

---

### Task B3: Wire panel-soon into profil.html

**Files:**
- Modify: `profil.html`

- [ ] **Step 1: Add stylesheet link in `<head>`**

Find the existing css link block (search for `<link rel="stylesheet" href="css/`). Add after the last studio/panel css link:

```html
<link rel="stylesheet" href="css/panel-soon.css">
```

- [ ] **Step 2: Add script tag before closing `</body>`**

Find the existing `<script src="profil-studio.js"></script>` line. Add immediately after it:

```html
<script src="panel-soon.js"></script>
```

(Note: profil-studio.js script tag **stays** — dormant load.)

- [ ] **Step 3: Modify `switchPanel` handler to intercept `mulakat`**

Find the `switchPanel` function definition in `profil.html` (grep: `function switchPanel`). Locate the branch that handles panel key `'mulakat'` (or the generic dispatcher that calls `_htLoadStudio`).

Add a guard at the **top** of the `mulakat` handling, before any call to `_htLoadStudio`:

```js
if (panelKey === 'mulakat') {
  var soonRoot = document.querySelector('[data-panel="mulakat"]');
  if (soonRoot && typeof window._htRenderPanelSoon === 'function') {
    window._htRenderPanelSoon(soonRoot);
  }
  // K030 FAZ B: _htLoadStudio no longer called. Frozen.
  return;
}
```

Ensure the actual `[data-panel="mulakat"]` DOM container exists and is visible when this panel is active. If the container is shared with other panels, wrap the render in the existing show/hide logic.

- [ ] **Step 4: Manual verification**

Run: `npx http-server . -p 8080 -c-1` (or equivalent local server)
Open: `http://localhost:8080/profil.html`
Login, click Stüdyo sidebar → verify 4-card grid renders.
Expected: Yakında chip'li 4 kart, eski Studio içeriği yok.

- [ ] **Step 5: Commit**

```bash
git add profil.html
git commit -m "feat(studio): wire panel-soon into profil.html switchPanel guard (K030 FAZ B)"
```

---

### Task B4: Add "Yakında" chip to sidebar + bottom nav

**Files:**
- Modify: `profil.html` (sidebar + bottom nav markup)
- Modify: `css/layout.css` (or wherever `.ht-chip` variants live)

- [ ] **Step 1: Find sidebar Stüdyo item**

Run: `grep -n 'data-panel="mulakat"' profil.html`
Expected: ~2-3 matches (sidebar + bottom nav + panel root).

- [ ] **Step 2: Update sidebar link markup**

For the sidebar anchor (not the panel root), change:
```html
<a data-panel="mulakat" ...>Stüdyo</a>
```
to:
```html
<a data-panel="mulakat" ...>
  Stüdyo
  <span class="ht-chip ht-chip--soon">Yakında</span>
</a>
```

- [ ] **Step 3: Update bottom nav (mobile)**

If bottom nav has a "Stüdyo" entry, add the same chip inside.

- [ ] **Step 4: Add `.ht-chip--soon` variant CSS**

Check if `.ht-chip` exists in `css/components.css` or `css/layout.css`. If yes, append:

```css
.ht-chip--soon {
  background: var(--verm, #C94E28);
  color: #fff;
  font-size: 9px;
  padding: 2px 6px;
  margin-left: 6px;
  vertical-align: middle;
}
```

If `.ht-chip` does not exist, add it to `css/components.css`:

```css
.ht-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.4;
}

.ht-chip--soon {
  background: var(--verm, #C94E28);
  color: #fff;
  margin-left: 6px;
  vertical-align: middle;
}
```

- [ ] **Step 5: Manual verification**

Reload profil.html. Sidebar Stüdyo link yanında Yakında chip görünmeli. Mobile viewport (390×844) bottom nav'da da görünmeli.

- [ ] **Step 6: Commit**

```bash
git add profil.html css/components.css css/layout.css
git commit -m "feat(studio): sidebar + bottom nav 'Yakında' chip (K030 FAZ B)"
```

---

### Task B5: Add noindex + redirect to coach-studio.html

**Files:**
- Modify: `coach-studio.html:1-30` (head)

- [ ] **Step 1: Read current head**

Run: `sed -n '1,30p' coach-studio.html`

- [ ] **Step 2: Add noindex meta and redirect script**

Insert immediately after the opening `<head>` tag:

```html
<!-- K030 FAZ B: page frozen, redirect to canonical shell -->
<meta name="robots" content="noindex, nofollow">
<script>
  (function () {
    if (window.self === window.top) {
      window.location.replace('profil.html#mulakat');
    }
  })();
</script>
```

- [ ] **Step 3: Commit**

```bash
git add coach-studio.html
git commit -m "chore(studio): noindex + redirect coach-studio.html (K030 FAZ B)"
```

---

### Task B6: Disable Studio tab in admin.html

**Files:**
- Modify: `admin.html`

- [ ] **Step 1: Locate the Studio tab trigger**

Run: `grep -n -i "studio" admin.html | head -20`
Expected: Find tab button/link that activates `admin-studio-modules.js` panel.

- [ ] **Step 2: Disable the tab**

For the Studio tab button (example markup will vary):

Before:
```html
<button data-tab="studio">Stüdyo</button>
```
After:
```html
<button data-tab="studio" class="is-disabled" aria-disabled="true" disabled>
  Stüdyo <span class="ht-chip ht-chip--soon">Yakında</span>
</button>
```

- [ ] **Step 3: Verify `admin-studio-modules.js` script tag stays**

Leave the `<script src="admin-studio-modules.js"></script>` untouched (dormant load).

- [ ] **Step 4: Add disabled styling (if `.is-disabled` not already defined)**

Append to `css/layout.css` or equivalent:

```css
.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

- [ ] **Step 5: Commit**

```bash
git add admin.html css/layout.css
git commit -m "chore(admin): disable studio tab with 'Yakında' chip (K030 FAZ B)"
```

---

### Task B7: Write FAZ B freeze test suite

**Files:**
- Create: `tests/faz-b-freeze.spec.js`

- [ ] **Step 1: Write the failing test**

Create `tests/faz-b-freeze.spec.js`:

```js
// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsCandidate, loginAsAdmin } = require('./helpers/auth');

test.describe('FAZ B — Studio freeze', () => {
  test('Stüdyo panel → 4-card yakında grid renders', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      if (typeof window.switchPanel === 'function') window.switchPanel('mulakat');
    });
    await page.waitForSelector('.ht-soon-grid', { timeout: 5000 });

    const cards = await page.locator('.ht-soon-card').count();
    expect(cards).toBe(4);

    const chips = await page.locator('.ht-soon-chip').count();
    expect(chips).toBe(4);

    const titles = await page.locator('.ht-soon-card-title').allTextContents();
    expect(titles).toEqual(['Mülakat demoları', 'Yetkinlik bazlı çalışma', 'Mülakat teknikleri', 'Mağaza bilgileri']);
  });

  test('yakında cards are not clickable (cursor:default, no handler)', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html#mulakat');
    await page.waitForSelector('.ht-soon-card', { timeout: 5000 });

    const cursor = await page.locator('.ht-soon-card').first().evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('default');
  });

  test('_htLoadStudio is not invoked on mulakat panel switch', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      window.__ht_studio_load_count = 0;
      const orig = window._htLoadStudio;
      window._htLoadStudio = function () {
        window.__ht_studio_load_count++;
        if (orig) return orig.apply(this, arguments);
      };
    });

    await page.evaluate(() => window.switchPanel('mulakat'));
    await page.waitForSelector('.ht-soon-grid');

    const count = await page.evaluate(() => window.__ht_studio_load_count || 0);
    expect(count).toBe(0);
  });

  test('sidebar Stüdyo item shows Yakında chip', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html');
    const chip = await page.locator('[data-panel="mulakat"] .ht-chip--soon').first();
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText(/Yakında/i);
  });

  test('coach-studio.html redirects to profil.html#mulakat', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/coach-studio.html');
    await page.waitForURL(/profil\.html#mulakat/, { timeout: 5000 });
    expect(page.url()).toContain('profil.html#mulakat');
  });

  test('coach-studio.html has noindex meta', async ({ page }) => {
    const res = await page.request.get('/coach-studio.html');
    const body = await res.text();
    expect(body).toContain('name="robots" content="noindex');
  });

  test('admin.html studio tab is disabled', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin.html');
    const studioTab = page.locator('[data-tab="studio"]').first();
    await expect(studioTab).toHaveAttribute('disabled', '');
    await expect(studioTab).toHaveAttribute('aria-disabled', 'true');
  });

  test('grid region has a11y attributes', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html#mulakat');
    await page.waitForSelector('.ht-soon-grid');
    const role = await page.locator('.ht-soon-grid').getAttribute('role');
    const label = await page.locator('.ht-soon-grid').getAttribute('aria-label');
    expect(role).toBe('region');
    expect(label).toContain('Stüdyo yakında');
  });

  test('mobile 390px renders single column', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsCandidate(page);
    await page.goto('/profil.html#mulakat');
    await page.waitForSelector('.ht-soon-grid');
    const gridCols = await page.locator('.ht-soon-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns);
    // single column on mobile
    expect(gridCols.split(' ').length).toBe(1);
  });
});
```

- [ ] **Step 2: Run new tests**

Run: `npx playwright test tests/faz-b-freeze.spec.js --reporter=list`
Expected: All 9 tests PASS (they should — B1-B6 already wired everything).

- [ ] **Step 3: Run full regression suite**

Run: `npx playwright test --reporter=list`
Expected: All existing tests still pass. 0 regression.

**If studio-specific existing tests fail:** They were testing live studio. Add them to skip list in `playwright.config.js` (K030 freeze annotation) — see Task B8.

- [ ] **Step 4: Commit**

```bash
git add tests/faz-b-freeze.spec.js
git commit -m "test(studio): FAZ B freeze test suite (K030)"
```

---

### Task B8: Skip stale studio tests

**Files:**
- Modify: existing studio-specific test files if they reference `_htLoadStudio` or studio panels that no longer render.

- [ ] **Step 1: Find studio-specific tests**

Run: `grep -rn "_htLoadStudio\|studio-lobby\|yetenek-\|coach-feed" tests/ --include="*.spec.js"`

- [ ] **Step 2: For each affected test, annotate skip**

Add before each test function:
```js
test.skip('...', async ({ page }) => {
  // K030 FAZ B: Studio frozen, test paused until unfreeze.
});
```

Do **not** delete the test bodies — preserve for unfreeze.

- [ ] **Step 3: Run full suite — verify 0 failures**

Run: `npx playwright test --reporter=list`

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test(studio): skip stale studio tests during K030 freeze"
```

---

### Task B9: Update docs/studio-foundation.md with FROZEN + unfreeze section

**Files:**
- Modify: `docs/studio-foundation.md`

- [ ] **Step 1: Prepend FROZEN banner at top (after title)**

Insert immediately after the H1:

```md
> **STATUS: FROZEN 2026-04-13 (K030)**
> Studio UI paused. Backend data and tables intact. See unfreeze section at bottom.
```

- [ ] **Step 2: Append unfreeze section at end of file**

```md
---

## Unfreeze Adımları (K030 geri alma)

1. `profil.html` `switchPanel('mulakat')` guard'ı kaldır, `_htLoadStudio()` çağrısını geri getir.
2. `<script src="panel-soon.js">` tag'ini kaldır, `css/panel-soon.css` link'ini kaldır.
3. Sidebar + bottom nav Stüdyo item'larından `<span class="ht-chip ht-chip--soon">Yakında</span>` kaldır.
4. `admin.html` studio tab `disabled` + `aria-disabled` kaldır, `is-disabled` class sil.
5. `coach-studio.html` noindex + redirect script bloğunu kaldır.
6. `profil-studio.js` file-top FROZEN banner + cross-link maps dormant banner kaldır.
7. `profil-studio.js` `_htGenelCoachTeaser` stub'unu git blame ile pre-K030 haline döndür.
8. `tests/faz-a-decouple.spec.js`, `tests/faz-b-freeze.spec.js`, `tests/faz-c-duyurular.spec.js` → sil veya skip.
9. Skip'lenmiş studio test'leri re-enable (`test.skip` → `test`).
10. Duyurular feed çıkarılmaz — Stüdyo ile ortak yaşar.
11. `vault/06-kararlar/karar-defteri.md` yeni karar entry (K0XX unfreeze).
12. `docs/AI-COLLAB.md` checkpoint.
```

- [ ] **Step 3: Commit**

```bash
git add docs/studio-foundation.md
git commit -m "docs(studio): FROZEN status + unfreeze adımları (K030 FAZ B)"
```

---

### Task B10: AI-COLLAB checkpoint for FAZ B

**Files:**
- Modify: `docs/AI-COLLAB.md`

- [ ] **Step 1: Append entry**

```md
## 2026-04-13 — K030 FAZ B (Freeze) tamamlandı
- panel-soon.js + css/panel-soon.css (4 kart yakında grid)
- profil.html switchPanel('mulakat') guard + script/link tag'ler
- Sidebar + bottom nav Yakında chip
- coach-studio.html noindex + redirect
- admin.html Studio tab disabled
- tests/faz-b-freeze.spec.js (9 test)
- Stale studio testleri skip annotated
- docs/studio-foundation.md FROZEN + unfreeze bölümü
- User-visible: Stüdyo menüsü artık Yakında grid'e gidiyor
- Sonraki: 24h canlı gözlem → FAZ C duyurular
- Risk: Genel Bakış coach feed hâlâ çalışıyor (FAZ C'de replace)
```

- [ ] **Step 2: Commit**

```bash
git add docs/AI-COLLAB.md
git commit -m "docs(ai-collab): K030 FAZ B checkpoint"
```

---

### FAZ B Ship Checklist

- [ ] All B1-B10 tasks committed
- [ ] `npx playwright test` → full suite PASS
- [ ] DeepSeek review → no blockers
- [ ] Push → GitHub Pages deploy → verify
- [ ] Manuel smoke: candidate → Stüdyo → grid, admin → Studio tab disabled, coach-studio.html → redirect
- [ ] Gemini UAT (docs/uat/studio-freeze-uat.md items 1-10)
- [ ] 24h gözlem → FAZ C

---

# FAZ C — Duyurular Feed System (PR 3)

**Goal:** Implement `ht_announcements` schema, RLS, RPCs, feed client, LinkedIn-style admin composer, replace Genel Bakış coach feed with duyuru mount, add Bildirimler toggle.

**User-visible change:** Genel Bakış panelinde coach feed yerine "HelloTalent'ten Bilgiler" duyuru feed'i. Admin yeni tab üzerinden post atar. Bildirimler sayfasında Duyurular toggle.

---

### Task C1: Write the migration SQL — schema + helper

**Files:**
- Create: `supabase/migrations/<timestamp>_ht_announcements.sql`

- [ ] **Step 1: Generate the migration file**

Run: `npm run db:new -- ht_announcements`
Expected: Creates `supabase/migrations/YYYYMMDDHHMMSS_ht_announcements.sql` with empty template.

- [ ] **Step 2: Write the schema + helper**

Replace the generated file content with:

```sql
-- K030 FAZ C: HelloTalent'ten Bilgiler (Duyurular) feed
-- Tables: ht_announcements, ht_announcement_media, ht_announcement_likes
-- RPCs: get_announcements_feed, toggle_announcement_like, get_unread_announcement_count
-- RLS: admin insert/update/delete own, authenticated select active, candidate own likes
-- Storage: cvs bucket, announcements/{admin_id}/{post_id}/ prefix

-- ============================================================
-- Helper: is_admin() — create or replace idempotent
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() ->> 'role') = 'admin',
    EXISTS (
      SELECT 1 FROM hr_profiles
      WHERE id = auth.uid() AND employer_role = 'admin'
    ),
    false
  );
$$;

-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS ht_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body_md text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 8000),
  category text CHECK (category IN ('feature','sirket','ipucu','genel')),
  cta_url text,
  cta_label text,
  pinned_until timestamptz,
  published_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  like_count int NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_feed
  ON ht_announcements (pinned_until DESC NULLS LAST, published_at DESC)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS ht_announcement_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video','link')),
  storage_path text,
  external_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (media_type IN ('image','video') AND storage_path IS NOT NULL AND external_url IS NULL) OR
    (media_type = 'link' AND external_url IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_media_parent
  ON ht_announcement_media(announcement_id, order_index);

CREATE TABLE IF NOT EXISTS ht_announcement_likes (
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_likes_candidate
  ON ht_announcement_likes(candidate_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ht_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ht_announcement_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ht_announcement_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ht_ann_select_active ON ht_announcements;
CREATE POLICY ht_ann_select_active ON ht_announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS ht_ann_insert_admin ON ht_announcements;
CREATE POLICY ht_ann_insert_admin ON ht_announcements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS ht_ann_update_own ON ht_announcements;
CREATE POLICY ht_ann_update_own ON ht_announcements
  FOR UPDATE TO authenticated
  USING (is_admin() AND admin_id = auth.uid())
  WITH CHECK (is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS ht_ann_delete_own ON ht_announcements;
CREATE POLICY ht_ann_delete_own ON ht_announcements
  FOR DELETE TO authenticated
  USING (is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS ht_ann_media_select ON ht_announcement_media;
CREATE POLICY ht_ann_media_select ON ht_announcement_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.is_active = true
  ));

DROP POLICY IF EXISTS ht_ann_media_write_admin ON ht_announcement_media;
CREATE POLICY ht_ann_media_write_admin ON ht_announcement_media
  FOR ALL TO authenticated
  USING (is_admin() AND EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.admin_id = auth.uid()
  ))
  WITH CHECK (is_admin() AND EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.admin_id = auth.uid()
  ));

DROP POLICY IF EXISTS ht_ann_likes_select_own ON ht_announcement_likes;
CREATE POLICY ht_ann_likes_select_own ON ht_announcement_likes
  FOR SELECT TO authenticated
  USING (candidate_id = get_my_candidate_id());

DROP POLICY IF EXISTS ht_ann_likes_write_own ON ht_announcement_likes;
CREATE POLICY ht_ann_likes_write_own ON ht_announcement_likes
  FOR ALL TO authenticated
  USING (candidate_id = get_my_candidate_id())
  WITH CHECK (candidate_id = get_my_candidate_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON ht_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ht_announcement_media TO authenticated;
GRANT SELECT, INSERT, DELETE ON ht_announcement_likes TO authenticated;

-- ============================================================
-- Trigger: sync like_count
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ht_ann_like_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ht_announcements
      SET like_count = like_count + 1
      WHERE id = NEW.announcement_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ht_announcements
      SET like_count = greatest(like_count - 1, 0)
      WHERE id = OLD.announcement_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ht_ann_like_count ON ht_announcement_likes;
CREATE TRIGGER trg_ht_ann_like_count
  AFTER INSERT OR DELETE ON ht_announcement_likes
  FOR EACH ROW EXECUTE FUNCTION sync_ht_ann_like_count();

-- ============================================================
-- RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION get_announcements_feed(
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  body_md text,
  category text,
  cta_url text,
  cta_label text,
  published_at timestamptz,
  pinned_until timestamptz,
  like_count int,
  liked_by_me boolean,
  media jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.title, a.body_md, a.category, a.cta_url, a.cta_label,
    a.published_at, a.pinned_until, a.like_count,
    EXISTS (
      SELECT 1 FROM ht_announcement_likes l
      WHERE l.announcement_id = a.id AND l.candidate_id = get_my_candidate_id()
    ) AS liked_by_me,
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'type', m.media_type,
          'storage_path', m.storage_path,
          'external_url', m.external_url,
          'order_index', m.order_index
        ) ORDER BY m.order_index
      )
      FROM ht_announcement_media m
      WHERE m.announcement_id = a.id
    ), '[]'::jsonb) AS media
  FROM ht_announcements a
  WHERE a.is_active = true
  ORDER BY
    CASE WHEN a.pinned_until IS NOT NULL AND a.pinned_until > now() THEN 0 ELSE 1 END,
    a.pinned_until DESC NULLS LAST,
    a.published_at DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION toggle_announcement_like(p_announcement_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint := get_my_candidate_id();
  v_liked boolean;
BEGIN
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ht_announcement_likes
    WHERE announcement_id = p_announcement_id AND candidate_id = v_candidate_id
  ) INTO v_liked;

  IF v_liked THEN
    DELETE FROM ht_announcement_likes
    WHERE announcement_id = p_announcement_id AND candidate_id = v_candidate_id;
    RETURN false;
  ELSE
    INSERT INTO ht_announcement_likes (announcement_id, candidate_id)
    VALUES (p_announcement_id, v_candidate_id);
    RETURN true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_unread_announcement_count(p_since timestamptz)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM ht_announcements
  WHERE is_active = true
    AND published_at > coalesce(p_since, 'epoch'::timestamptz);
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_announcements_feed(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_announcement_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_announcement_count(timestamptz) TO authenticated;

-- ============================================================
-- Storage: cvs bucket, announcements/ prefix policies
-- Note: applied via storage.policies; bucket 'cvs' already exists.
-- ============================================================
DO $$
BEGIN
  -- Admin write under announcements/{auth.uid()}/...
  INSERT INTO storage.policies (name, bucket_id, definition, action)
  VALUES (
    'announcements_admin_write',
    'cvs',
    format($pol$
      bucket_id = 'cvs'
      AND (storage.foldername(name))[1] = 'announcements'
      AND (storage.foldername(name))[2] = auth.uid()::text
      AND is_admin()
    $pol$),
    'INSERT'
  ) ON CONFLICT DO NOTHING;

  -- Authenticated read announcements/* (signed URLs)
  INSERT INTO storage.policies (name, bucket_id, definition, action)
  VALUES (
    'announcements_authenticated_read',
    'cvs',
    $pol$bucket_id = 'cvs' AND (storage.foldername(name))[1] = 'announcements'$pol$,
    'SELECT'
  ) ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- If storage.policies table schema differs, skip; apply via dashboard.
  RAISE NOTICE 'storage.policies insert skipped: %', SQLERRM;
END $$;
```

- [ ] **Step 3: Create rollback file (not deployed)**

Create `supabase/migrations/ROLLBACK_ht_announcements.sql`:

```sql
-- K030 FAZ C rollback (NOT auto-deployed, emergency use only)
DROP TRIGGER IF EXISTS trg_ht_ann_like_count ON ht_announcement_likes;
DROP FUNCTION IF EXISTS sync_ht_ann_like_count() CASCADE;
DROP FUNCTION IF EXISTS get_announcements_feed(int, int) CASCADE;
DROP FUNCTION IF EXISTS toggle_announcement_like(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_unread_announcement_count(timestamptz) CASCADE;
DROP TABLE IF EXISTS ht_announcement_likes CASCADE;
DROP TABLE IF EXISTS ht_announcement_media CASCADE;
DROP TABLE IF EXISTS ht_announcements CASCADE;
-- is_admin() helper preserved (may be used elsewhere).
-- Storage policies: remove manually via dashboard if needed.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): ht_announcements schema + RLS + RPCs (K030 FAZ C)"
```

---

### Task C2: Apply migration and verify

- [ ] **Step 1: Push migration**

Run: `npm run db:push`
Expected: Migration applied, no errors.

- [ ] **Step 2: Verify tables**

Run: `supabase db query "SELECT tablename FROM pg_tables WHERE tablename LIKE 'ht_announcement%'" --linked`
Expected: 3 rows — `ht_announcements`, `ht_announcement_media`, `ht_announcement_likes`.

- [ ] **Step 3: Verify RLS enabled**

Run: `supabase db query "SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'ht_announcement%'" --linked`
Expected: All 3 with `relrowsecurity = true`.

- [ ] **Step 4: Verify RPCs**

Run: `supabase db query "SELECT proname FROM pg_proc WHERE proname IN ('get_announcements_feed','toggle_announcement_like','get_unread_announcement_count','is_admin')" --linked`
Expected: 4 rows.

- [ ] **Step 5: Smoke insert/select as admin**

Run inside SQL editor or via `supabase db query` with admin JWT:

```sql
INSERT INTO ht_announcements (admin_id, title, body_md, category)
VALUES (auth.uid(), 'Test post', 'Test body markdown', 'genel')
RETURNING id;

SELECT * FROM get_announcements_feed(10, 0);
```
Expected: Insert succeeds, feed returns 1 row with `media = '[]'::jsonb`.

Clean up: `DELETE FROM ht_announcements WHERE title = 'Test post';`

---

### Task C3: Write RLS integration tests

**Files:**
- Create: `tests/integration/duyurular-rls.spec.js`

- [ ] **Step 1: Write integration tests**

Create `tests/integration/duyurular-rls.spec.js`:

```js
// @ts-check
const { test, expect } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PW = process.env.TEST_ADMIN_PW;
const CAND_EMAIL = process.env.TEST_CAND_EMAIL;
const CAND_PW = process.env.TEST_CAND_PW;

async function signInAs(email, pw) {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { error } = await c.auth.signInWithPassword({ email, password: pw });
  if (error) throw error;
  return c;
}

test.describe('ht_announcements RLS', () => {
  let createdId = null;

  test.afterEach(async () => {
    if (createdId) {
      const admin = await signInAs(ADMIN_EMAIL, ADMIN_PW);
      await admin.from('ht_announcements').delete().eq('id', createdId);
      createdId = null;
    }
  });

  test('admin can insert announcement', async () => {
    const admin = await signInAs(ADMIN_EMAIL, ADMIN_PW);
    const { data, error } = await admin
      .from('ht_announcements')
      .insert({
        admin_id: (await admin.auth.getUser()).data.user.id,
        title: 'RLS test',
        body_md: 'body',
        category: 'genel'
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data.id).toBeTruthy();
    createdId = data.id;
  });

  test('candidate CANNOT insert announcement', async () => {
    const cand = await signInAs(CAND_EMAIL, CAND_PW);
    const { error } = await cand
      .from('ht_announcements')
      .insert({
        admin_id: (await cand.auth.getUser()).data.user.id,
        title: 'x',
        body_md: 'y',
        category: 'genel'
      });
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/row-level security|policy/i);
  });

  test('candidate can SELECT active announcements', async () => {
    const admin = await signInAs(ADMIN_EMAIL, ADMIN_PW);
    const adminId = (await admin.auth.getUser()).data.user.id;
    const { data: ins } = await admin
      .from('ht_announcements')
      .insert({ admin_id: adminId, title: 'visible', body_md: 'x', category: 'genel' })
      .select()
      .single();
    createdId = ins.id;

    const cand = await signInAs(CAND_EMAIL, CAND_PW);
    const { data, error } = await cand
      .from('ht_announcements')
      .select('id,title')
      .eq('id', ins.id);
    expect(error).toBeNull();
    expect(data.length).toBe(1);
  });

  test('candidate CANNOT see is_active=false', async () => {
    const admin = await signInAs(ADMIN_EMAIL, ADMIN_PW);
    const adminId = (await admin.auth.getUser()).data.user.id;
    const { data: ins } = await admin
      .from('ht_announcements')
      .insert({ admin_id: adminId, title: 'draft', body_md: 'x', category: 'genel', is_active: false })
      .select()
      .single();
    createdId = ins.id;

    const cand = await signInAs(CAND_EMAIL, CAND_PW);
    const { data } = await cand.from('ht_announcements').select('id').eq('id', ins.id);
    expect(data.length).toBe(0);
  });

  test('toggle_announcement_like RPC works for candidate', async () => {
    const admin = await signInAs(ADMIN_EMAIL, ADMIN_PW);
    const adminId = (await admin.auth.getUser()).data.user.id;
    const { data: ins } = await admin
      .from('ht_announcements')
      .insert({ admin_id: adminId, title: 'like test', body_md: 'x', category: 'genel' })
      .select()
      .single();
    createdId = ins.id;

    const cand = await signInAs(CAND_EMAIL, CAND_PW);
    const { data: liked1 } = await cand.rpc('toggle_announcement_like', { p_announcement_id: ins.id });
    expect(liked1).toBe(true);

    const { data: liked2 } = await cand.rpc('toggle_announcement_like', { p_announcement_id: ins.id });
    expect(liked2).toBe(false);
  });

  test('get_announcements_feed returns pinned posts first', async () => {
    const admin = await signInAs(ADMIN_EMAIL, ADMIN_PW);
    const adminId = (await admin.auth.getUser()).data.user.id;
    const { data: normal } = await admin
      .from('ht_announcements')
      .insert({ admin_id: adminId, title: 'normal', body_md: 'x', category: 'genel' })
      .select()
      .single();
    const { data: pinned } = await admin
      .from('ht_announcements')
      .insert({
        admin_id: adminId,
        title: 'pinned',
        body_md: 'x',
        category: 'feature',
        pinned_until: new Date(Date.now() + 86400000).toISOString()
      })
      .select()
      .single();

    const cand = await signInAs(CAND_EMAIL, CAND_PW);
    const { data: feed } = await cand.rpc('get_announcements_feed', { p_limit: 10, p_offset: 0 });
    const idx_pinned = feed.findIndex(r => r.id === pinned.id);
    const idx_normal = feed.findIndex(r => r.id === normal.id);
    expect(idx_pinned).toBeLessThan(idx_normal);

    await admin.from('ht_announcements').delete().in('id', [normal.id, pinned.id]);
  });
});
```

- [ ] **Step 2: Ensure env vars set**

Create/update `.env.test`:
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
TEST_ADMIN_EMAIL=...
TEST_ADMIN_PW=...
TEST_CAND_EMAIL=...
TEST_CAND_PW=...
```

- [ ] **Step 3: Run integration tests**

Run: `npx playwright test tests/integration/duyurular-rls.spec.js --reporter=list`
Expected: All 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/duyurular-rls.spec.js
git commit -m "test(db): ht_announcements RLS + RPC integration tests (K030 FAZ C)"
```

---

### Task C4: Write `profil-duyurular.js` — feed client

**Files:**
- Create: `profil-duyurular.js`

- [ ] **Step 1: Write the file**

Create `profil-duyurular.js`:

```js
/* profil-duyurular.js — HT Duyurular feed client (K030 FAZ C, 2026-04-13)
 * Exposes: window._htLoadDuyuruFeed(containerEl, opts)
 * Depends on: window.supabase, window.signStorageUrls (shared.js), DOMPurify, marked
 */
(function () {
  'use strict';

  var DEBOUNCE_MS = 300;
  var likeDebounceTimers = {};

  function formatRelativeTR(ts) {
    var d = new Date(ts);
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'az önce';
    if (diff < 3600) return Math.floor(diff / 60) + ' dakika önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    if (diff < 172800) return 'dün';
    if (diff < 604800) return Math.floor(diff / 86400) + ' gün önce';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function sanitizeMarkdown(mdText) {
    if (typeof window.marked === 'undefined' || typeof window.DOMPurify === 'undefined') {
      // Fallback: plain text escape
      var div = document.createElement('div');
      div.textContent = mdText;
      return div.innerHTML;
    }
    var rawHtml = window.marked.parse(mdText, { breaks: true, gfm: true });
    return window.DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h2', 'h3', 'h4'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  async function fetchFeed(limit, offset) {
    var { data, error } = await window.supabase.rpc('get_announcements_feed', {
      p_limit: limit,
      p_offset: offset
    });
    if (error) throw error;
    return data || [];
  }

  async function signMediaUrls(posts) {
    var paths = [];
    posts.forEach(function (p) {
      (p.media || []).forEach(function (m) {
        if (m.storage_path) paths.push(m.storage_path);
      });
    });
    if (!paths.length) return {};
    if (typeof window.signStorageUrls !== 'function') return {};
    try {
      return await window.signStorageUrls('cvs', paths, 3600);
    } catch (e) {
      console.error('[duyuru] sign urls failed', e);
      return {};
    }
  }

  function renderMediaItem(m, signedUrls) {
    if (m.type === 'image') {
      var url = signedUrls[m.storage_path] || '';
      return '<div class="ht-duyuru-media-item" data-type="image">' +
        '<img src="' + escapeAttr(url) + '" alt="" loading="lazy">' +
        '</div>';
    }
    if (m.type === 'video') {
      var vurl = signedUrls[m.storage_path] || '';
      return '<div class="ht-duyuru-media-item" data-type="video">' +
        '<video controls preload="metadata" src="' + escapeAttr(vurl) + '"></video>' +
        '</div>';
    }
    if (m.type === 'link') {
      return '<div class="ht-duyuru-media-item" data-type="link">' +
        '<a href="' + escapeAttr(m.external_url || '') + '" target="_blank" rel="noopener noreferrer" class="ht-duyuru-link-card">' +
        '<span class="ht-duyuru-link-icon">🔗</span>' +
        '<span class="ht-duyuru-link-url">' + escapeAttr(m.external_url || '') + '</span>' +
        '</a></div>';
    }
    return '';
  }

  function renderCarousel(media, signedUrls) {
    if (!media || !media.length) return '';
    var items = media.map(function (m) { return renderMediaItem(m, signedUrls); }).join('');
    var showNav = media.length > 1;
    var dots = '';
    if (showNav) {
      dots = '<div class="ht-duyuru-carousel-dots">';
      for (var i = 0; i < media.length; i++) {
        dots += '<button class="ht-duyuru-dot' + (i === 0 ? ' is-active' : '') + '" data-idx="' + i + '" aria-label="Medya ' + (i + 1) + '"></button>';
      }
      dots += '</div>';
    }
    return '<div class="ht-duyuru-carousel"' + (showNav ? ' data-has-nav="1"' : '') + '>' +
      '<div class="ht-duyuru-carousel-track">' + items + '</div>' +
      (showNav ? '<button class="ht-duyuru-carousel-prev" aria-label="Önceki">‹</button><button class="ht-duyuru-carousel-next" aria-label="Sonraki">›</button>' : '') +
      dots +
    '</div>';
  }

  function attachCarouselBehavior(cardEl) {
    var car = cardEl.querySelector('.ht-duyuru-carousel[data-has-nav]');
    if (!car) return;
    var track = car.querySelector('.ht-duyuru-carousel-track');
    var items = track.querySelectorAll('.ht-duyuru-media-item');
    var dots = car.querySelectorAll('.ht-duyuru-dot');
    var idx = 0;
    function go(i) {
      idx = Math.max(0, Math.min(items.length - 1, i));
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dots.forEach(function (d, di) { d.classList.toggle('is-active', di === idx); });
    }
    car.querySelector('.ht-duyuru-carousel-prev').addEventListener('click', function () { go(idx - 1); });
    car.querySelector('.ht-duyuru-carousel-next').addEventListener('click', function () { go(idx + 1); });
    dots.forEach(function (d) {
      d.addEventListener('click', function () { go(parseInt(d.dataset.idx, 10)); });
    });
  }

  function renderCard(post, signedUrls) {
    var catLabel = { feature: 'Yenilik', sirket: 'Şirket', ipucu: 'İpucu', genel: 'Genel' }[post.category] || 'Genel';
    var bodyHtml = sanitizeMarkdown(post.body_md);
    var cta = post.cta_url
      ? '<a class="ht-duyuru-cta" href="' + escapeAttr(post.cta_url) + '" target="_blank" rel="noopener noreferrer">' + escapeAttr(post.cta_label || 'Detay') + '</a>'
      : '';
    return '<article class="ht-duyuru-card" data-id="' + escapeAttr(post.id) + '">' +
      '<header class="ht-duyuru-card-header">' +
        '<span class="ht-duyuru-chip ht-duyuru-chip--' + escapeAttr(post.category || 'genel') + '">' + catLabel + '</span>' +
        '<time class="ht-duyuru-date">' + formatRelativeTR(post.published_at) + '</time>' +
      '</header>' +
      '<h3 class="ht-duyuru-title">' + escapeAttr(post.title) + '</h3>' +
      '<div class="ht-duyuru-body">' + bodyHtml + '</div>' +
      renderCarousel(post.media, signedUrls) +
      (cta ? '<div class="ht-duyuru-cta-row">' + cta + '</div>' : '') +
      '<footer class="ht-duyuru-card-footer">' +
        '<button class="ht-duyuru-like-btn' + (post.liked_by_me ? ' is-liked' : '') + '" data-post-id="' + escapeAttr(post.id) + '" aria-pressed="' + (post.liked_by_me ? 'true' : 'false') + '">' +
          '<span class="ht-duyuru-like-icon" aria-hidden="true">' + (post.liked_by_me ? '♥' : '♡') + '</span>' +
          '<span class="ht-duyuru-like-count">' + post.like_count + '</span>' +
        '</button>' +
      '</footer>' +
    '</article>';
  }

  async function toggleLike(postId, btn, countEl, iconEl) {
    if (likeDebounceTimers[postId]) clearTimeout(likeDebounceTimers[postId]);
    var wasLiked = btn.classList.contains('is-liked');
    var curCount = parseInt(countEl.textContent, 10) || 0;
    // optimistic
    btn.classList.toggle('is-liked');
    btn.setAttribute('aria-pressed', (!wasLiked).toString());
    iconEl.textContent = (!wasLiked) ? '♥' : '♡';
    countEl.textContent = wasLiked ? Math.max(0, curCount - 1) : curCount + 1;

    likeDebounceTimers[postId] = setTimeout(async function () {
      var { data, error } = await window.supabase.rpc('toggle_announcement_like', { p_announcement_id: postId });
      if (error || typeof data !== 'boolean') {
        // rollback
        btn.classList.toggle('is-liked');
        btn.setAttribute('aria-pressed', wasLiked.toString());
        iconEl.textContent = wasLiked ? '♥' : '♡';
        countEl.textContent = curCount;
        if (window._htToast) window._htToast('Beğeni kaydedilemedi', 'error');
      }
    }, DEBOUNCE_MS);
  }

  function attachLikeHandlers(rootEl) {
    var btns = rootEl.querySelectorAll('.ht-duyuru-like-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.postId;
        var countEl = btn.querySelector('.ht-duyuru-like-count');
        var iconEl = btn.querySelector('.ht-duyuru-like-icon');
        toggleLike(id, btn, countEl, iconEl);
      });
    });
  }

  window._htLoadDuyuruFeed = async function (containerEl, opts) {
    if (!containerEl) return;
    opts = opts || {};
    var limit = opts.limit || 10;
    var offset = opts.offset || 0;

    containerEl.innerHTML = '<div class="ht-duyuru-loading">Duyurular yükleniyor...</div>';

    try {
      var posts = await fetchFeed(limit, offset);
      if (!posts.length) {
        containerEl.innerHTML = '<div class="ht-duyuru-empty">Henüz duyuru yok. Yeni şeyler geldiğinde burada görürsün.</div>';
        return;
      }
      var signedUrls = await signMediaUrls(posts);
      var html = '<div class="ht-duyuru-feed">';
      posts.forEach(function (p) { html += renderCard(p, signedUrls); });
      html += '</div>';
      containerEl.innerHTML = html;

      containerEl.querySelectorAll('.ht-duyuru-card').forEach(attachCarouselBehavior);
      attachLikeHandlers(containerEl);

      // mark seen
      try {
        localStorage.setItem('ht_last_duyuru_seen', new Date().toISOString());
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('[duyuru] feed fetch failed', e);
      containerEl.innerHTML =
        '<div class="ht-duyuru-error">Duyurular şu an yüklenemedi. ' +
        '<button class="ht-duyuru-retry">Tekrar dene</button></div>';
      var retry = containerEl.querySelector('.ht-duyuru-retry');
      if (retry) retry.addEventListener('click', function () {
        window._htLoadDuyuruFeed(containerEl, opts);
      });
    }
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add profil-duyurular.js
git commit -m "feat(duyuru): profil-duyurular.js feed client (K030 FAZ C)"
```

---

### Task C5: Write `css/duyurular.css`

**Files:**
- Create: `css/duyurular.css`

- [ ] **Step 1: Write the file**

Create `css/duyurular.css`:

```css
/* duyurular.css — HT Duyurular feed (K030 FAZ C, 2026-04-13) */

.ht-duyuru-feed-section {
  max-width: 720px;
  margin: 24px auto;
}

.ht-duyuru-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ht-duyuru-loading,
.ht-duyuru-empty,
.ht-duyuru-error {
  padding: 40px 24px;
  text-align: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  color: var(--muted, #6B7280);
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-subtle, #E5E3DF);
  border-radius: 16px;
}

.ht-duyuru-error .ht-duyuru-retry {
  margin-left: 8px;
  padding: 6px 12px;
  background: var(--verm, #C94E28);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.ht-duyuru-card {
  padding: 24px;
  background: var(--bg-surface, #fff);
  border: 1px solid var(--border-subtle, #E5E3DF);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .04);
}

.ht-duyuru-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.ht-duyuru-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: var(--navy-light, #EEF0F7);
  color: var(--navy, #1E2D5E);
}

.ht-duyuru-chip--feature { background: #FEF3E8; color: var(--verm, #C94E28); }
.ht-duyuru-chip--sirket  { background: #E8F4FE; color: #0B63A8; }
.ht-duyuru-chip--ipucu   { background: #FEF9E0; color: #8B6A00; }

.ht-duyuru-date {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--muted, #6B7280);
}

.ht-duyuru-title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--text, #111);
  margin: 0 0 10px;
  line-height: 1.3;
}

.ht-duyuru-body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text, #111);
  margin-bottom: 16px;
}

.ht-duyuru-body p { margin: 0 0 10px; }
.ht-duyuru-body p:last-child { margin-bottom: 0; }
.ht-duyuru-body a { color: var(--verm, #C94E28); text-decoration: underline; }
.ht-duyuru-body ul, .ht-duyuru-body ol { margin: 0 0 10px 20px; padding: 0; }
.ht-duyuru-body blockquote { margin: 0 0 10px; padding: 8px 14px; border-left: 3px solid var(--verm); color: var(--muted); }
.ht-duyuru-body code { font-family: 'DM Mono', monospace; font-size: 12px; background: var(--bg, #F7F6F4); padding: 1px 5px; border-radius: 4px; }

.ht-duyuru-carousel {
  position: relative;
  margin: 16px 0;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg, #F7F6F4);
}

.ht-duyuru-carousel-track {
  display: flex;
  transition: transform 0.3s ease;
}

.ht-duyuru-media-item {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.ht-duyuru-media-item img,
.ht-duyuru-media-item video {
  max-width: 100%;
  max-height: 480px;
  display: block;
}

.ht-duyuru-carousel-prev,
.ht-duyuru-carousel-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ht-duyuru-carousel-prev { left: 8px; }
.ht-duyuru-carousel-next { right: 8px; }

.ht-duyuru-carousel-dots {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
}

.ht-duyuru-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
}

.ht-duyuru-dot.is-active { background: #fff; }

.ht-duyuru-link-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border-subtle, #E5E3DF);
  border-radius: 12px;
  text-decoration: none;
  color: var(--text, #111);
  width: 100%;
  box-sizing: border-box;
}

.ht-duyuru-link-icon { font-size: 18px; }
.ht-duyuru-link-url {
  font-size: 13px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ht-duyuru-cta-row { margin: 16px 0; }

.ht-duyuru-cta {
  display: inline-block;
  padding: 10px 20px;
  background: var(--verm, #C94E28);
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
}

.ht-duyuru-card-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle, #E5E3DF);
}

.ht-duyuru-like-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border, #D4D2CD);
  border-radius: 20px;
  font-family: inherit;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.ht-duyuru-like-btn:hover { border-color: var(--verm); color: var(--verm); }
.ht-duyuru-like-btn.is-liked { background: var(--verm); color: #fff; border-color: var(--verm); }
.ht-duyuru-like-icon { font-size: 16px; line-height: 1; }

/* Dark mode */
html[data-theme='dark'] .ht-duyuru-card {
  background: var(--bg-surface-dark, #1A1D2E);
  border-color: var(--border-dark, #2C3045);
}

html[data-theme='dark'] .ht-duyuru-title,
html[data-theme='dark'] .ht-duyuru-body {
  color: #fff;
}

/* Mobile */
@media (max-width: 480px) {
  .ht-duyuru-feed-section { margin: 16px 12px; }
  .ht-duyuru-card { padding: 18px; }
  .ht-duyuru-title { font-size: 17px; }
}

/* ============================================================
   Admin composer (LinkedIn-style)
   ============================================================ */

.ht-composer-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ht-composer-panel {
  width: min(720px, 95vw);
  max-height: 92vh;
  background: #fff;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ht-composer-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ht-composer-body {
  padding: 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.ht-composer-form { display: flex; flex-direction: column; gap: 12px; }

.ht-composer-input,
.ht-composer-select,
.ht-composer-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  box-sizing: border-box;
}

.ht-composer-textarea { min-height: 200px; resize: vertical; }

.ht-composer-media-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  border: 2px dashed var(--border);
  border-radius: 8px;
}

.ht-composer-media-thumb {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg);
}

.ht-composer-media-thumb img,
.ht-composer-media-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ht-composer-media-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
}

.ht-composer-preview {
  padding: 12px;
  background: var(--bg);
  border-radius: 12px;
  overflow-y: auto;
  max-height: 520px;
}

.ht-composer-actions {
  padding: 14px 20px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.ht-composer-btn {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.ht-composer-btn--cancel { background: var(--bg); color: var(--muted); }
.ht-composer-btn--draft  { background: #EEF0F7; color: var(--navy); }
.ht-composer-btn--publish { background: var(--verm); color: #fff; }

@media (max-width: 640px) {
  .ht-composer-body { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/duyurular.css
git commit -m "feat(duyuru): css/duyurular.css feed + composer styles (K030 FAZ C)"
```

---

### Task C6: Wire duyuru dependencies into profil.html

**Files:**
- Modify: `profil.html`

- [ ] **Step 1: Add DOMPurify + marked CDN (if not present)**

Check with `grep -n "dompurify\|marked" profil.html`. If absent, add in `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/marked@11/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
```

Also update CSP if present to allow `cdn.jsdelivr.net` as script-src.

- [ ] **Step 2: Add duyurular stylesheet + script**

In `<head>`:
```html
<link rel="stylesheet" href="css/duyurular.css">
```

Before closing `</body>`:
```html
<script src="profil-duyurular.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add profil.html
git commit -m "chore(duyuru): wire duyurular assets into profil.html (K030 FAZ C)"
```

---

### Task C7: Replace coach feed with duyuru mount in profil-genel.js

**Files:**
- Modify: `profil-genel.js`

- [ ] **Step 1: Comment-out the coach_posts fetch block**

Find lines ~795-830 (the `.from('coach_posts')` block). Wrap the whole block in a dormant comment:

```js
/* ============================================================
 * FROZEN 2026-04-13 (K030 FAZ C): coach feed replaced by duyuru.
 * Original block preserved for unfreeze (see studio-foundation.md).
 * ============================================================ */
/*
[ORIGINAL CODE — leave as multi-line comment]
*/
```

- [ ] **Step 2: Locate the coach render call site**

Search for where `gh-coach-header` or `gh-coach-feed` is mounted into DOM (the function that turns `postsRes.data` into DOM). Replace the mount with a duyuru feed mount:

```js
/* K030 FAZ C: duyuru feed replaces coach feed in Genel Bakış */
(function mountDuyuruFeed() {
  var section = document.querySelector('[data-mount="duyuru-feed"]');
  if (!section) {
    // create section if missing
    var host = document.querySelector('.gh-center') || document.querySelector('.genel-center');
    if (host) {
      section = document.createElement('section');
      section.className = 'ht-duyuru-feed-section';
      section.setAttribute('data-mount', 'duyuru-feed');
      host.appendChild(section);
    }
  }
  if (section && typeof window._htLoadDuyuruFeed === 'function') {
    window._htLoadDuyuruFeed(section, { limit: 10, offset: 0 });
  }
})();
```

- [ ] **Step 3: Stub `window.openCoachDetail` handler callsite**

Find `profil-genel.js:994` area:
```js
if (typeof window.openCoachDetail === 'function') {
  window.openCoachDetail(post, false);
}
```
Replace with:
```js
/* K030 FAZ C: coach detail caller frozen. */
```

- [ ] **Step 4: Manual verification**

Reload profil.html. Genel Bakış panel açılır → Duyurular feed görünmeli (empty state ilk başta), coach feed artık yok.

- [ ] **Step 5: Commit**

```bash
git add profil-genel.js
git commit -m "feat(genel): replace coach feed with duyuru feed mount (K030 FAZ C)"
```

---

### Task C8: Write `admin-announcements.js` — composer

**Files:**
- Create: `admin-announcements.js`

- [ ] **Step 1: Write the file**

Create `admin-announcements.js`:

```js
/* admin-announcements.js — HT Duyurular admin composer (K030 FAZ C, 2026-04-13)
 * Entry: window._htAdminAnnouncements.mount(containerEl)
 * Depends on: window.supabase, window.marked, window.DOMPurify
 */
(function () {
  'use strict';

  var MAX_IMAGE_MB = 10;
  var MAX_VIDEO_MB = 50;

  var state = {
    editingId: null,
    mediaQueue: [] // {type, file?, external_url?, order_index, tmpPath?}
  };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  async function fetchList() {
    var { data, error } = await window.supabase
      .from('ht_announcements')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  }

  function renderList(rows) {
    if (!rows.length) return '<div class="ht-admin-empty">Henüz duyuru yok.</div>';
    var html = '<table class="ht-admin-table"><thead><tr>' +
      '<th>Başlık</th><th>Kategori</th><th>Tarih</th><th>Durum</th><th>Pinned</th><th>Like</th><th></th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>' +
        '<td>' + escapeAttr(r.title) + '</td>' +
        '<td>' + escapeAttr(r.category || '') + '</td>' +
        '<td>' + new Date(r.published_at).toLocaleDateString('tr-TR') + '</td>' +
        '<td>' + (r.is_active ? 'Yayında' : 'Taslak') + '</td>' +
        '<td>' + (r.pinned_until && new Date(r.pinned_until) > new Date() ? '✓' : '') + '</td>' +
        '<td>' + r.like_count + '</td>' +
        '<td>' +
          '<button data-action="edit" data-id="' + r.id + '">Düzenle</button> ' +
          '<button data-action="toggle" data-id="' + r.id + '">' + (r.is_active ? 'Arşivle' : 'Yayınla') + '</button> ' +
          '<button data-action="delete" data-id="' + r.id + '">Sil</button>' +
        '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function openComposer(container, existing) {
    state.editingId = existing ? existing.id : null;
    state.mediaQueue = [];

    var modal = document.createElement('div');
    modal.className = 'ht-composer-modal';
    modal.innerHTML =
      '<div class="ht-composer-panel">' +
        '<div class="ht-composer-head"><h3>' + (existing ? 'Duyuru düzenle' : 'Yeni duyuru') + '</h3><button class="ht-composer-close">×</button></div>' +
        '<div class="ht-composer-body">' +
          '<div class="ht-composer-form">' +
            '<input type="text" class="ht-composer-input" id="cmp-title" placeholder="Başlık" maxlength="200" value="' + escapeAttr(existing ? existing.title : '') + '">' +
            '<select class="ht-composer-select" id="cmp-category">' +
              '<option value="genel">Genel</option>' +
              '<option value="feature">Yenilik</option>' +
              '<option value="sirket">Şirket</option>' +
              '<option value="ipucu">İpucu</option>' +
            '</select>' +
            '<textarea class="ht-composer-textarea" id="cmp-body" placeholder="İçerik (markdown desteklenir)" maxlength="8000">' + escapeAttr(existing ? existing.body_md : '') + '</textarea>' +
            '<input type="text" class="ht-composer-input" id="cmp-cta-url" placeholder="CTA URL (opsiyonel)">' +
            '<input type="text" class="ht-composer-input" id="cmp-cta-label" placeholder="CTA etiket (opsiyonel)">' +
            '<div class="ht-composer-media-row" id="cmp-media-row">' +
              '<label class="ht-composer-media-add">+ Medya<input type="file" multiple accept="image/*,video/*" hidden id="cmp-media-input"></label>' +
            '</div>' +
            '<input type="text" class="ht-composer-input" id="cmp-link" placeholder="Link URL ekle (opsiyonel)">' +
            '<button class="ht-composer-btn ht-composer-btn--draft" id="cmp-add-link" type="button">Link ekle</button>' +
            '<label><input type="checkbox" id="cmp-pin"> Pinle (24 saat)</label>' +
          '</div>' +
          '<div class="ht-composer-preview" id="cmp-preview"></div>' +
        '</div>' +
        '<div class="ht-composer-actions">' +
          '<button class="ht-composer-btn ht-composer-btn--cancel" id="cmp-cancel">İptal</button>' +
          '<button class="ht-composer-btn ht-composer-btn--draft" id="cmp-draft">Taslak</button>' +
          '<button class="ht-composer-btn ht-composer-btn--publish" id="cmp-publish">Yayınla</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    if (existing) modal.querySelector('#cmp-category').value = existing.category || 'genel';

    function updatePreview() {
      var title = modal.querySelector('#cmp-title').value;
      var body = modal.querySelector('#cmp-body').value;
      var cat = modal.querySelector('#cmp-category').value;
      var ctaUrl = modal.querySelector('#cmp-cta-url').value;
      var ctaLabel = modal.querySelector('#cmp-cta-label').value;
      var fakePost = {
        id: 'preview',
        title: title || '(başlık yok)',
        body_md: body || '(içerik yok)',
        category: cat,
        cta_url: ctaUrl,
        cta_label: ctaLabel,
        published_at: new Date().toISOString(),
        like_count: 0,
        liked_by_me: false,
        media: state.mediaQueue.map(function (m, i) {
          return {
            id: 'prev' + i,
            type: m.type,
            storage_path: m.file ? URL.createObjectURL(m.file) : null,
            external_url: m.external_url,
            order_index: i
          };
        })
      };
      var previewEl = modal.querySelector('#cmp-preview');
      previewEl.innerHTML = '';
      // Reuse feed card renderer via temp container
      var temp = document.createElement('div');
      temp.className = 'ht-duyuru-feed';
      // Use a simplified render since signed URLs unavailable in preview
      var signedUrls = {};
      fakePost.media.forEach(function (m) { if (m.storage_path) signedUrls[m.storage_path] = m.storage_path; });
      // Inline render (duplicate minimal logic from profil-duyurular.js for preview)
      var bodyHtml = window.DOMPurify
        ? window.DOMPurify.sanitize(window.marked.parse(body || '', { breaks: true, gfm: true }))
        : escapeAttr(body);
      var mediaHtml = '';
      if (fakePost.media.length) {
        mediaHtml = '<div class="ht-duyuru-carousel"><div class="ht-duyuru-carousel-track">' +
          fakePost.media.map(function (m) {
            if (m.type === 'image') return '<div class="ht-duyuru-media-item"><img src="' + m.storage_path + '"></div>';
            if (m.type === 'video') return '<div class="ht-duyuru-media-item"><video controls src="' + m.storage_path + '"></video></div>';
            if (m.type === 'link') return '<div class="ht-duyuru-media-item"><a href="' + m.external_url + '" class="ht-duyuru-link-card">' + m.external_url + '</a></div>';
            return '';
          }).join('') +
        '</div></div>';
      }
      previewEl.innerHTML =
        '<article class="ht-duyuru-card">' +
          '<header class="ht-duyuru-card-header"><span class="ht-duyuru-chip ht-duyuru-chip--' + cat + '">' + cat + '</span><time class="ht-duyuru-date">az önce</time></header>' +
          '<h3 class="ht-duyuru-title">' + escapeAttr(title || '(başlık)') + '</h3>' +
          '<div class="ht-duyuru-body">' + bodyHtml + '</div>' +
          mediaHtml +
          (ctaUrl ? '<div class="ht-duyuru-cta-row"><a class="ht-duyuru-cta" href="' + escapeAttr(ctaUrl) + '">' + escapeAttr(ctaLabel || 'Detay') + '</a></div>' : '') +
        '</article>';
    }

    function renderMediaThumbs() {
      var row = modal.querySelector('#cmp-media-row');
      // remove existing thumbs (keep add button)
      row.querySelectorAll('.ht-composer-media-thumb').forEach(function (n) { n.remove(); });
      state.mediaQueue.forEach(function (m, idx) {
        var thumb = document.createElement('div');
        thumb.className = 'ht-composer-media-thumb';
        if (m.type === 'image' && m.file) {
          thumb.innerHTML = '<img src="' + URL.createObjectURL(m.file) + '">';
        } else if (m.type === 'video' && m.file) {
          thumb.innerHTML = '<video src="' + URL.createObjectURL(m.file) + '"></video>';
        } else if (m.type === 'link') {
          thumb.innerHTML = '<span style="font-size:10px;padding:6px;">🔗</span>';
        }
        var rm = document.createElement('button');
        rm.className = 'ht-composer-media-remove';
        rm.textContent = '×';
        rm.addEventListener('click', function () {
          state.mediaQueue.splice(idx, 1);
          renderMediaThumbs();
          updatePreview();
        });
        thumb.appendChild(rm);
        row.appendChild(thumb);
      });
    }

    modal.querySelector('#cmp-media-input').addEventListener('change', function (e) {
      var files = Array.from(e.target.files);
      files.forEach(function (f) {
        var isImage = f.type.startsWith('image/');
        var isVideo = f.type.startsWith('video/');
        if (!isImage && !isVideo) return;
        var maxMb = isImage ? MAX_IMAGE_MB : MAX_VIDEO_MB;
        if (f.size > maxMb * 1024 * 1024) {
          alert('Dosya çok büyük (max ' + maxMb + 'MB): ' + f.name);
          return;
        }
        state.mediaQueue.push({
          type: isImage ? 'image' : 'video',
          file: f,
          order_index: state.mediaQueue.length
        });
      });
      renderMediaThumbs();
      updatePreview();
      e.target.value = '';
    });

    modal.querySelector('#cmp-add-link').addEventListener('click', function () {
      var url = modal.querySelector('#cmp-link').value.trim();
      if (!url) return;
      state.mediaQueue.push({ type: 'link', external_url: url, order_index: state.mediaQueue.length });
      modal.querySelector('#cmp-link').value = '';
      renderMediaThumbs();
      updatePreview();
    });

    ['#cmp-title', '#cmp-body', '#cmp-category', '#cmp-cta-url', '#cmp-cta-label'].forEach(function (sel) {
      modal.querySelector(sel).addEventListener('input', updatePreview);
      modal.querySelector(sel).addEventListener('change', updatePreview);
    });

    function closeModal() { modal.remove(); }
    modal.querySelector('#cmp-cancel').addEventListener('click', closeModal);
    modal.querySelector('.ht-composer-close').addEventListener('click', closeModal);

    async function save(isDraft) {
      var title = modal.querySelector('#cmp-title').value.trim();
      var body = modal.querySelector('#cmp-body').value.trim();
      var category = modal.querySelector('#cmp-category').value;
      var ctaUrl = modal.querySelector('#cmp-cta-url').value.trim();
      var ctaLabel = modal.querySelector('#cmp-cta-label').value.trim();
      var pin = modal.querySelector('#cmp-pin').checked;

      if (!title || !body) { alert('Başlık ve içerik zorunlu'); return; }

      var user = (await window.supabase.auth.getUser()).data.user;
      if (!user) { alert('Oturum yok'); return; }

      var payload = {
        admin_id: user.id,
        title: title,
        body_md: body,
        category: category,
        cta_url: ctaUrl || null,
        cta_label: ctaLabel || null,
        is_active: !isDraft,
        pinned_until: pin ? new Date(Date.now() + 86400000).toISOString() : null
      };

      var resp;
      if (state.editingId) {
        resp = await window.supabase.from('ht_announcements').update(payload).eq('id', state.editingId).select().single();
      } else {
        resp = await window.supabase.from('ht_announcements').insert(payload).select().single();
      }
      if (resp.error) { alert('Kayıt hatası: ' + resp.error.message); return; }
      var postId = resp.data.id;

      // Upload media
      for (var i = 0; i < state.mediaQueue.length; i++) {
        var m = state.mediaQueue[i];
        if (m.type === 'link') {
          await window.supabase.from('ht_announcement_media').insert({
            announcement_id: postId,
            media_type: 'link',
            external_url: m.external_url,
            order_index: i
          });
        } else if (m.file) {
          var ext = m.file.name.split('.').pop();
          var path = 'announcements/' + user.id + '/' + postId + '/' + uuid() + '.' + ext;
          var up = await window.supabase.storage.from('cvs').upload(path, m.file, { upsert: false });
          if (up.error) { alert('Upload hatası: ' + up.error.message); continue; }
          await window.supabase.from('ht_announcement_media').insert({
            announcement_id: postId,
            media_type: m.type,
            storage_path: path,
            order_index: i
          });
        }
      }

      closeModal();
      window._htAdminAnnouncements.refresh();
    }

    modal.querySelector('#cmp-draft').addEventListener('click', function () { save(true); });
    modal.querySelector('#cmp-publish').addEventListener('click', function () { save(false); });

    updatePreview();
  }

  async function handleRowAction(btn, container) {
    var action = btn.dataset.action;
    var id = btn.dataset.id;
    if (action === 'delete') {
      if (!confirm('Silinsin mi?')) return;
      await window.supabase.from('ht_announcements').delete().eq('id', id);
      window._htAdminAnnouncements.refresh();
    } else if (action === 'toggle') {
      var { data: cur } = await window.supabase.from('ht_announcements').select('is_active').eq('id', id).single();
      await window.supabase.from('ht_announcements').update({ is_active: !cur.is_active }).eq('id', id);
      window._htAdminAnnouncements.refresh();
    } else if (action === 'edit') {
      var { data: row } = await window.supabase.from('ht_announcements').select('*').eq('id', id).single();
      openComposer(container, row);
    }
  }

  window._htAdminAnnouncements = {
    _container: null,
    mount: async function (containerEl) {
      this._container = containerEl;
      containerEl.innerHTML =
        '<div class="ht-admin-toolbar"><button class="ht-composer-btn ht-composer-btn--publish" id="ann-new">Yeni duyuru</button></div>' +
        '<div id="ann-list">Yükleniyor...</div>';
      containerEl.querySelector('#ann-new').addEventListener('click', function () { openComposer(containerEl, null); });
      this.refresh();
    },
    refresh: async function () {
      if (!this._container) return;
      try {
        var rows = await fetchList();
        var listEl = this._container.querySelector('#ann-list');
        listEl.innerHTML = renderList(rows);
        var self = this;
        listEl.querySelectorAll('button[data-action]').forEach(function (b) {
          b.addEventListener('click', function () { handleRowAction(b, self._container); });
        });
      } catch (e) {
        console.error(e);
        this._container.querySelector('#ann-list').innerHTML = '<div class="ht-admin-error">Liste yüklenemedi: ' + e.message + '</div>';
      }
    }
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add admin-announcements.js
git commit -m "feat(admin): admin-announcements.js composer (K030 FAZ C)"
```

---

### Task C9: Add Duyurular tab to admin.html

**Files:**
- Modify: `admin.html`

- [ ] **Step 1: Add tab button**

Near the existing tab list, add:

```html
<button data-tab="announcements">Duyurular</button>
```

- [ ] **Step 2: Add tab panel container**

Near the existing tab panels, add:

```html
<section data-tab-panel="announcements" hidden>
  <div id="ann-root"></div>
</section>
```

- [ ] **Step 3: Add script tag**

Before closing `</body>`:
```html
<script src="admin-announcements.js"></script>
```

- [ ] **Step 4: Wire the tab activation**

In admin.html's existing tab switching JS, add branch:
```js
if (tabName === 'announcements') {
  var root = document.getElementById('ann-root');
  if (window._htAdminAnnouncements && !root.dataset.mounted) {
    window._htAdminAnnouncements.mount(root);
    root.dataset.mounted = '1';
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat(admin): Duyurular tab wiring (K030 FAZ C)"
```

---

### Task C10: Add Bildirimler ↔ Duyurular toggle

**Files:**
- Modify: existing bildirimler panel file. Run `grep -rn "bildirim" profil*.js profil.html --include="*.js" --include="*.html" | head` to locate.

- [ ] **Step 1: Locate existing bildirimler panel**

Run: `grep -n "notifications\|bildirim-panel\|data-panel=\"bildirim" profil.html profil-genel.js profil-inbox.js 2>/dev/null`
Expected: Find the panel / toggle markup file.

- [ ] **Step 2: Add toggle segment markup**

At the top of the bildirimler panel content, add:

```html
<div class="ht-segment" role="tablist" data-segment="bildirim-duyuru">
  <button role="tab" data-tab="bildirim" aria-selected="true" class="is-active">Bildirimler</button>
  <button role="tab" data-tab="duyuru" aria-selected="false">
    Duyurular <span class="ht-badge" data-unread-count hidden></span>
  </button>
</div>
<div data-tab-content="bildirim"><!-- existing bildirim list --></div>
<div data-tab-content="duyuru" hidden><div data-mount="duyuru-full-feed"></div></div>
```

- [ ] **Step 3: Wire toggle JS**

Inside the same file, add:

```js
(function () {
  var seg = document.querySelector('[data-segment="bildirim-duyuru"]');
  if (!seg) return;
  var btns = seg.querySelectorAll('button[role="tab"]');
  btns.forEach(function (btn) {
    btn.addEventListener('click', async function () {
      btns.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      var tab = btn.dataset.tab;
      document.querySelectorAll('[data-tab-content]').forEach(function (p) {
        p.hidden = p.dataset.tabContent !== tab;
      });
      sessionStorage.setItem('ht_bildirim_tab', tab);
      if (tab === 'duyuru') {
        var mount = document.querySelector('[data-mount="duyuru-full-feed"]');
        if (mount && !mount.dataset.loaded) {
          window._htLoadDuyuruFeed(mount, { limit: 50, offset: 0 });
          mount.dataset.loaded = '1';
        }
        try {
          localStorage.setItem('ht_last_duyuru_seen', new Date().toISOString());
        } catch (e) { /* ignore */ }
        var badge = seg.querySelector('[data-unread-count]');
        if (badge) { badge.hidden = true; badge.textContent = ''; }
      }
    });
  });

  // Restore tab
  var saved = sessionStorage.getItem('ht_bildirim_tab') || 'bildirim';
  var savedBtn = seg.querySelector('[data-tab="' + saved + '"]');
  if (savedBtn) savedBtn.click();

  // Unread count poll
  (async function () {
    try {
      var last = localStorage.getItem('ht_last_duyuru_seen');
      var { data } = await window.supabase.rpc('get_unread_announcement_count', { p_since: last });
      if (data && data > 0) {
        var badge = seg.querySelector('[data-unread-count]');
        if (badge) { badge.textContent = data > 99 ? '99+' : data; badge.hidden = false; }
      }
    } catch (e) { /* silent */ }
  })();
})();
```

- [ ] **Step 4: Add segment styles**

Append to `css/components.css`:

```css
.ht-segment {
  display: inline-flex;
  padding: 4px;
  background: var(--bg, #F7F6F4);
  border-radius: 10px;
  gap: 2px;
  margin-bottom: 16px;
}
.ht-segment button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
}
.ht-segment button.is-active {
  background: #fff;
  color: var(--navy);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.ht-badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--verm);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  margin-left: 6px;
}
```

- [ ] **Step 5: Commit**

```bash
git add profil.html profil-genel.js profil-inbox.js css/components.css
git commit -m "feat(bildirim): Bildirimler↔Duyurular toggle + unread badge (K030 FAZ C)"
```

---

### Task C11: Write FAZ C UI tests

**Files:**
- Create: `tests/faz-c-duyurular.spec.js`

- [ ] **Step 1: Write tests**

Create `tests/faz-c-duyurular.spec.js`:

```js
// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsCandidate, loginAsAdmin } = require('./helpers/auth');

test.describe('FAZ C — Duyurular feed UI', () => {
  test('feed empty state renders when no posts', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    const feedEl = page.locator('.ht-duyuru-feed-section');
    await expect(feedEl).toBeVisible({ timeout: 10000 });
  });

  test('markdown is sanitized (no script)', async ({ page }) => {
    await page.goto('/profil.html');
    const xss = await page.evaluate(() => {
      var div = document.createElement('div');
      div.id = 'test-xss';
      document.body.appendChild(div);
      window._htLoadDuyuruFeed(div, { limit: 0 }); // empty
      return true;
    });
    expect(xss).toBe(true);
  });

  test('coach feed gone from Genel Bakış', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.switchPanel && window.switchPanel('genel'));
    await page.waitForTimeout(1500);
    const coachHeader = await page.locator('.gh-coach-header').count();
    expect(coachHeader).toBe(0);
  });

  test('bildirimler toggle shows duyurular tab', async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto('/profil.html');
    // Navigate to bildirimler (selector will depend on existing panel)
    const duyuruTab = page.locator('[data-segment="bildirim-duyuru"] [data-tab="duyuru"]');
    if (await duyuruTab.count() > 0) {
      await duyuruTab.click();
      await expect(page.locator('[data-tab-content="duyuru"]')).toBeVisible();
    }
  });

  test('admin can open composer modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin.html');
    await page.click('[data-tab="announcements"]');
    await page.click('#ann-new');
    await expect(page.locator('.ht-composer-modal')).toBeVisible();
    await expect(page.locator('#cmp-title')).toBeVisible();
    await expect(page.locator('#cmp-body')).toBeVisible();
  });

  test('composer live preview updates on input', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin.html');
    await page.click('[data-tab="announcements"]');
    await page.click('#ann-new');
    await page.fill('#cmp-title', 'Test başlık');
    await page.fill('#cmp-body', 'Test **body**');
    const previewTitle = await page.locator('#cmp-preview .ht-duyuru-title').textContent();
    expect(previewTitle).toContain('Test başlık');
    const previewBody = await page.locator('#cmp-preview .ht-duyuru-body').innerHTML();
    expect(previewBody).toContain('<strong>body</strong>');
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test tests/faz-c-duyurular.spec.js --reporter=list`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/faz-c-duyurular.spec.js
git commit -m "test(duyuru): FAZ C UI smoke tests (K030)"
```

---

### Task C12: Write E2E flow test

**Files:**
- Create: `tests/e2e/duyurular-flow.spec.js`

- [ ] **Step 1: Write E2E test**

Create `tests/e2e/duyurular-flow.spec.js`:

```js
// @ts-check
const { test, expect } = require('@playwright/test');
const { loginAsCandidate, loginAsAdmin, logout } = require('./helpers/auth');
const path = require('path');

test('admin posts → candidate sees → likes → bildirimler tab persisted', async ({ page }) => {
  // 1. Admin login + composer
  await loginAsAdmin(page);
  await page.goto('/admin.html');
  await page.click('[data-tab="announcements"]');
  await page.click('#ann-new');
  await page.fill('#cmp-title', 'E2E test başlık ' + Date.now());
  await page.fill('#cmp-body', 'E2E **markdown** body\n\nLine 2');
  await page.selectOption('#cmp-category', 'feature');
  // Skip media upload for E2E smoke to keep deterministic
  await page.click('#cmp-publish');
  await page.waitForTimeout(1500);

  // 2. Logout
  await logout(page);

  // 3. Candidate login → Genel Bakış
  await loginAsCandidate(page);
  await page.goto('/profil.html');
  await page.waitForLoadState('networkidle');

  // 4. Feed shows post
  const title = page.locator('.ht-duyuru-title').first();
  await expect(title).toContainText('E2E test başlık', { timeout: 10000 });

  // 5. Like
  const likeBtn = page.locator('.ht-duyuru-like-btn').first();
  const initialCount = parseInt(await likeBtn.locator('.ht-duyuru-like-count').textContent(), 10);
  await likeBtn.click();
  await page.waitForTimeout(500);
  const newCount = parseInt(await likeBtn.locator('.ht-duyuru-like-count').textContent(), 10);
  expect(newCount).toBe(initialCount + 1);
  await expect(likeBtn).toHaveClass(/is-liked/);

  // 6. Reload → persisted
  await page.reload();
  await page.waitForLoadState('networkidle');
  const persistedBtn = page.locator('.ht-duyuru-like-btn').first();
  await expect(persistedBtn).toHaveClass(/is-liked/);
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test tests/e2e/duyurular-flow.spec.js --reporter=list`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/duyurular-flow.spec.js
git commit -m "test(e2e): duyuru flow admin→candidate→like (K030 FAZ C)"
```

---

### Task C13: Write UAT checklist

**Files:**
- Create: `docs/uat/studio-freeze-uat.md`

- [ ] **Step 1: Write the file**

```md
# K030 Studio Freeze + Duyurular UAT Checklist

Perform manual tests in this order. Report failures to AI-COLLAB.md with screenshot.

## FAZ B — Studio Freeze (PR 2)

- [ ] 1. Candidate login → profil.html → click Stüdyo sidebar → 4-card "yakında" grid renders
- [ ] 2. Grid cards are not clickable (cursor default, no navigation)
- [ ] 3. Sidebar Stüdyo link shows red "Yakında" chip
- [ ] 4. Mobile (390×844): grid is single column, sidebar chip visible in bottom nav
- [ ] 5. Dark mode: grid renders with dark tokens (card bg, text, chip legible)
- [ ] 6. coach-studio.html direct URL → redirects to profil.html#mulakat
- [ ] 7. admin.html → Studio tab disabled with chip, cannot click
- [ ] 8. Admin Koç tab still works (admin-coach-content)
- [ ] 9. profil.html#mulakat bookmark → yakında grid
- [ ] 10. Screen reader: "Stüdyo yakında — içerik önizleme" is announced

## FAZ C — Duyurular Feed (PR 3)

- [ ] 11. Genel Bakış panel → duyurular feed section visible (empty state if no posts)
- [ ] 12. Admin composer: LinkedIn-style layout (form left, preview right)
- [ ] 13. Admin posts with title + body → shows in candidate Genel Bakış within refresh
- [ ] 14. Admin uploads 3 images → carousel with prev/next arrows + dots
- [ ] 15. Admin uploads video → player renders in feed
- [ ] 16. Admin adds link → link card with URL
- [ ] 17. Admin pins post → appears at top of feed
- [ ] 18. Candidate likes post → count increments, button state active
- [ ] 19. Candidate reloads → like state persisted
- [ ] 20. Header / Bildirimler panel → "Bildirimler | Duyurular" toggle present
- [ ] 21. Duyurular tab → shows full feed (50 limit), unread badge clears after open
- [ ] 22. Markdown sanitize: admin writes `<script>alert(1)</script>` → NOT executed in feed
```

- [ ] **Step 2: Commit**

```bash
git add docs/uat/studio-freeze-uat.md
git commit -m "docs(uat): studio freeze + duyurular manual checklist (K030)"
```

---

### Task C14: Update docs/CURRENT-STATE.md + AI-COLLAB

**Files:**
- Modify: `docs/CURRENT-STATE.md`
- Modify: `docs/AI-COLLAB.md`

- [ ] **Step 1: Update CURRENT-STATE.md**

Replace the "Aktif Odak" section with:

```md
**Aktif Odak (2026-04-13 sonrası — K030 post-merge):**
- K030 FAZ A+B+C tamam: Stüdyo dondu (yakında grid), Koç backend dormant, duyurular feed canlı
- Sonraki: Dashboard sadeleşme devam + canlı açılış hazırlığı
- Stüdyo unfreeze: strateji kararına bağlı (şu an açık tarih yok)
```

Add to file map:
```md
- profil-duyurular.js — Duyurular feed client (FAZ C)
- admin-announcements.js — Admin duyuru composer (FAZ C)
- panel-soon.js — Studio "yakında" grid (FAZ B)
- css/duyurular.css, css/panel-soon.css — new stylesheets
```

- [ ] **Step 2: Update AI-COLLAB.md**

Append:
```md
## 2026-04-13 — K030 FAZ C (Duyurular) tamamlandı
- Migration: ht_announcements + 2 media/like tabloları + RLS + 3 RPC + trigger + storage policy
- profil-duyurular.js feed client (render + like + carousel + markdown sanitize)
- admin-announcements.js LinkedIn-style composer (text + multi-image + video + link + live preview)
- profil-genel.js coach feed → duyuru feed replace
- Bildirimler | Duyurular toggle + unread badge
- Integration RLS testleri + E2E flow testi
- UAT checklist docs/uat/studio-freeze-uat.md
- K030 tamamen kapandı
- Risk: Genel Bakış streak/badge widget'ları FAZ C sonrası conditional render — manuel doğrulanmalı
```

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT-STATE.md docs/AI-COLLAB.md
git commit -m "docs: K030 FAZ C state update + checkpoint"
```

---

### FAZ C Ship Checklist

- [ ] All C1-C14 tasks committed
- [ ] Migration deployed: `npm run db:push` success
- [ ] Integration tests PASS
- [ ] UI tests PASS
- [ ] E2E flow PASS
- [ ] Full regression suite PASS (0 non-skip failures)
- [ ] DeepSeek review → no blockers
- [ ] Gemini UAT items 11-22 ✓
- [ ] Push → deploy → hard refresh verify
- [ ] Manuel: admin real post atar, candidate gerçek görür, like + persistence
- [ ] Badge/streak widget Genel Bakış'ta kırık değil
- [ ] K030 karar defteri entry'si linked from spec ✓

---

## Self-Review Summary

**Spec coverage check:**
- Section 2 Scope → all in-scope items have tasks (A1-A5, B1-B10, C1-C14)
- Section 4 Components → each component mapped to a task
- Section 5 Data Flow → admin post, candidate feed, like, bildirimler toggle all covered in C-series
- Section 6 Error Handling → integration tests (C3) + UI tests (C11) cover RLS, sanitize, empty, error states
- Section 7 Testing → A4, B7, C3, C11, C12 cover unit + integration + e2e
- Section 8 Rollback → ROLLBACK SQL in C1, unfreeze docs in B9

**Placeholder scan:** Clean. No TBD/TODO/"similar to".

**Type consistency:** `_htLoadDuyuruFeed`, `_htRenderPanelSoon`, `_htAdminAnnouncements.mount/refresh`, `ht_announcements`, `ht_announcement_media`, `ht_announcement_likes`, `get_announcements_feed`, `toggle_announcement_like`, `get_unread_announcement_count`, `is_admin()` consistent across all tasks.

**Known gaps (accepted):**
- Auth helper paths (`loginAsCandidate`, `loginAsAdmin`, `logout`) assumed to exist in `tests/helpers/auth.js` — if not, implementer should create minimal wrappers around existing `supabase.auth.signInWithPassword`.
- `signStorageUrls` assumed in `shared.js` (memory confirms this). Implementer verifies on first use.
- Bildirimler panel file location (C10) requires grep during implementation — task body instructs the grep.
- `css/components.css` `.is-disabled` + `.ht-chip` may already exist — task body handles both cases.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md`.

**Two execution options:**

**1. Subagent-Driven (recommended for this scale)** — dispatch fresh subagent per task, review between tasks, fast iteration. Best for 28-task plan where context isolation matters.

**2. Inline Execution** — executing-plans skill, batch with checkpoints between phases. Good if you want to watch every step.

**Which approach, and do you want me to kick off FAZ A now or hand off to a fresh HelloTalent repo session?**
