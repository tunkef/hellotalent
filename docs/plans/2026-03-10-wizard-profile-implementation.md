# Wizard Profil Düzenleme — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the 5 stacked section-cards in profil.html into a step-by-step wizard flow with progress bar, per-step validation, slide animations, and a welcoming intro screen for first-time candidates.

**Architecture:** Single-file SPA transformation. The 5 existing section-card elements (lines 1303-1573) become wizard steps. A new wizard-progress bar and wizard-nav bottom bar wrap around them. CSS handles visibility (only active step shown), JS manages step state and transitions. All existing form logic, validation, and Supabase save remain intact — we add a wizard layer on top.

**Tech Stack:** Vanilla HTML/CSS/JS (no frameworks), Supabase (existing), Plus Jakarta Sans + Bricolage Grotesque fonts (existing)

**File:** `/private/tmp/hellotalent-push/profil.html` (single-file SPA, ~3954 lines)

---

### Task 1: Add ilk_deneyim Column to Supabase

**Context:** The kariyer step needs an "ilk deneyimim" checkbox. This boolean must persist in Supabase for HR filtering.

**Step 1: Run SQL migration**

Use the Supabase SQL Editor at `https://supabase.com/dashboard/project/cpwibefquojehjehtrog/sql` or via curl:
```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ilk_deneyim boolean DEFAULT false;
```

**Step 2: Verify column exists**

Query the candidates table to confirm ilk_deneyim appears.

---

### Task 2: CSS — Wizard Progress Bar, Bottom Nav, Step Visibility, Animations

**Files:**
- Modify: `/private/tmp/hellotalent-push/profil.html` (CSS section, add before closing style tag)

**Step 1: Add wizard CSS block**

Insert before the closing style tag. This CSS covers:

- `.wizard-intro` — fullscreen overlay with centered card for welcoming message
- `.wizard-intro-card` — white card with border-radius 16px, shadow, fade-in animation
- `.wizard-intro-btn` — primary verm-colored CTA button
- `.wizard-progress` — sticky bar below header (top:60px), flex layout with step dots and connecting lines
- `.wiz-step-dot` — 32x32 circles, states: default (gray border), active (navy bg + pulse animation), completed (green bg + checkmark), locked (50% opacity)
- `.wiz-step-label` — 11px labels below dots, hidden on mobile
- `.wiz-step-line` — 32px connecting lines between dots, green when completed
- `.wizard-nav` — fixed bottom bar with safe-area padding, flex between back/next buttons
- `.wiz-btn-back` — ghost style (gray bg)
- `.wiz-btn-next` — primary style (verm bg)
- `.wiz-btn-save` — success style (green bg)
- Step visibility: `.wizard-active .section-card` hidden by default, `.wiz-visible` shows active card
- Slide animations: `wizSlideLeft`, `wizSlideRight`, `wizEnterLeft`, `wizEnterRight` — translateX based, 300ms ease
- In wizard mode: hide card-edit-btn, card-save-btn, completion-card, cv-hero, feature-card
- In wizard mode: override card-view-mode styles so all inputs are interactive (pointer-events:auto, opacity:1)
- `.ilk-deneyim-card` — navy-light bg card with centered text, custom checkbox label
- Mobile responsive: smaller dots (28px), hidden labels, tighter padding

Use existing CSS variables: --verm, --navy, --green, --gray, --border, --text, --muted, --navy-light

**Step 2: Commit**

```bash
git add profil.html && git commit -m "style: add wizard CSS — progress bar, nav, animations, intro screen"
```

---

### Task 3: HTML — Wizard Progress Bar + Bottom Nav + Intro Overlay + Ilk Deneyim Card

**Files:**
- Modify: `/private/tmp/hellotalent-push/profil.html` (HTML section, lines 1249-1584)

**Step 1: Add wizard intro overlay**

Insert BEFORE line 1249 (`<main class="main panel" id="main-dashboard">`):

A div with class wizard-intro, id wizard-intro, initially display:none. Contains:
- wizard-intro-card with h2 "Profilini Eksiksiz Doldur"
- Paragraph explaining that employer HR teams will use this data to match positions
- Highlight that deneyimler, dil bilgisi, maas beklentisi, lokasyon tercihleri should be filled completely
- Note that they can update anytime
- Button "Baslayalim" calling dismissWizardIntro()

Use proper Turkish characters throughout.

**Step 2: Add progress bar**

Insert right after the opening main tag of main-dashboard, before completion-card:

5 wiz-step divs with data-step 0-4, each containing a wiz-step-dot (numbered 1-5) and wiz-step-label (Kisisel, Kariyer, Egitim, Tercihler, Lokasyon). Connected by wiz-step-line divs. Each step has onclick="wizGoToStep(N)". Initially display:none.

**Step 3: Add Ilk Deneyim card inside kariyer section**

Inside the kariyer section-card, after the section-title, before exp-container. A div with class ilk-deneyim-card, id ilk-deneyim-card, initially display:none. Contains:
- h3: "Ilk Adimini At!"
- p: encouraging message for first-timers
- Label with checkbox input (id cb-ilk-deneyim, onchange toggleIlkDeneyim(this)) and custom check span
- Text: "Henuz is deneyimim yok, ilk adimimi atmak istiyorum"
- Divider with "veya" text

**Step 4: Add bottom wizard nav**

After the lokasyon section-card closing div, before the feature-card. A div with class wizard-nav, id wizard-nav, initially display:none. Two buttons:
- wiz-btn-back: "Geri" with onclick wizBack()
- wiz-btn-next: "Ileri" with onclick wizNext()

**Step 5: Commit**

```bash
git add profil.html && git commit -m "feat: add wizard HTML — progress bar, intro overlay, nav bar, ilk deneyim card"
```

---

### Task 4: JS — Wizard State Machine and Navigation

**Files:**
- Modify: `/private/tmp/hellotalent-push/profil.html` (JS section, after global variable declarations ~line 2074)

**Step 1: Add wizard state variables**

After the existing global variable declarations (line ~2073), add:

```javascript
var WIZARD_STEPS=['kisisel','kariyer','egitim','tercihler','lokasyon'];
var WIZARD_LABELS=['Kisisel','Kariyer','Egitim','Tercihler','Lokasyon'];
var wizCurrentStep=0;
var wizMaxReached=0;
var wizIsReturningUser=false;
var ilkDeneyimChecked=false;
```

**Step 2: Add initWizard(isReturning) function**

This function:
- Adds 'wizard-active' class to main-dashboard
- Shows progress bar and nav bar
- Removes card-view-mode from all section cards
- If returning user: sets wizMaxReached to max, loads last step from localStorage
- If new user: sets step 0, shows intro overlay
- Calls updateIlkDeneyimVisibility() and wizRenderStep(false)

**Step 3: Add dismissWizardIntro() function**

Hides the wizard-intro overlay.

**Step 4: Add wizRenderStep(animate, direction) function**

This function:
- Updates progress bar dots: completed (green checkmark), active (navy with pulse), locked (gray 50% opacity)
- Updates connecting lines: green if before current step
- Shows only the active section-card (adds wiz-visible class)
- If animate=true: adds slide animation classes (wiz-enter-right for next, wiz-enter-left for back)
- Updates nav buttons: hides "Geri" on step 0, shows "Kaydet" on last step
- Scrolls to top smoothly
- Saves current step to localStorage

IMPORTANT: For the checkmark in completed step dots, use textContent with the Unicode checkmark character, NOT innerHTML.

**Step 5: Add wizNext() function**

- Gets current step card type from WIZARD_STEPS array
- If kariyer step: checks ilkDeneyimChecked OR deneyimler.length > 0, shows error if neither
- Runs validateCard() on current card, shows error if fails
- Animates current card out (slide left), increments step, renders new step (enter from right)
- Updates wizMaxReached

**Step 6: Add wizBack() function**

- If step > 0: animates current card out (slide right), decrements step, renders new step (enter from left)

**Step 7: Add wizGoToStep(stepIndex) function**

- Only allows clicking steps <= wizMaxReached (or any step for returning users)
- Determines direction (next/back) based on comparison with current step
- Animates transition and renders target step

**Step 8: Add wizSave() async function**

- Calls await saveProfile()
- If successful: sets wizIsReturningUser=true, wizMaxReached=max, re-renders progress, clears localStorage

**Step 9: Add toggleIlkDeneyim(cb) function**

- Sets ilkDeneyimChecked = cb.checked
- If checked: hides exp-container and btn-add-exp, clears deneyimler array
- If unchecked: shows exp-container and btn-add-exp

**Step 10: Add updateIlkDeneyimVisibility() function**

- Shows ilk-deneyim-card if deneyimler.length === 0
- Hides it if deneyimler exist

**Step 11: Commit**

```bash
git add profil.html && git commit -m "feat: wizard JS state machine, navigation, step transitions, ilk deneyim toggle"
```

---

### Task 5: JS — Integrate Wizard with loadProfile() and saveProfile()

**Files:**
- Modify: `/private/tmp/hellotalent-push/profil.html`
  - loadProfile() at line ~3136
  - saveProfile() at line ~3771
  - setAllCardsViewMode() at line ~3061
  - addExperience() at line ~2646

**Step 1: Modify loadProfile() — init wizard after data load**

At the end of the if(data) block, after existing code, add:
- Determine isReturning = data exists and has full_name
- Call initWizard(isReturning)
- If data.ilk_deneyim is true: set ilkDeneyimChecked=true, check the checkbox, call toggleIlkDeneyim

For the else case (no data = new user), add:
- Call initWizard(false)

**Step 2: Modify saveProfile() — add ilk_deneyim to profileData**

In the profileData object (line ~3853), add:
```javascript
ilk_deneyim: ilkDeneyimChecked,
```

**Step 3: Modify saveProfile() — kariyer validation with ilk_deneyim**

Wrap the experience card validation block (lines ~3787-3800) with:
```javascript
if(!ilkDeneyimChecked) {
  // existing exp card validation
}
```

Also add: if not ilkDeneyimChecked and deneyimler.length === 0, push a validation error for kariyer.

**Step 4: Modify saveProfile() — return success/failure**

Change the early return on validation failure to `return false;`
Add `return true;` at the end of successful save.

**Step 5: Modify setAllCardsViewMode() — skip in wizard mode**

At the top of setAllCardsViewMode(), add early return if main-dashboard has wizard-active class.

**Step 6: Modify addExperience() — uncheck ilk deneyim when adding experience**

At the top of addExperience(), if ilkDeneyimChecked is true:
- Set ilkDeneyimChecked = false
- Uncheck the checkbox
- Show exp-container and btn-add-exp
- Call updateIlkDeneyimVisibility()

**Step 7: Commit**

```bash
git add profil.html && git commit -m "feat: integrate wizard with loadProfile/saveProfile, ilk_deneyim data flow"
```

---

### Task 6: Test and Polish

**Step 1: Test new user flow**

- Intro overlay appears with welcoming message
- Progress bar shows step 1 active, 2-5 locked
- Only Kisisel card visible
- No "Geri" button on step 1

**Step 2: Test step navigation and validation**

- Fill Kisisel fields, click Ileri — slide animation, step 2
- Kariyer: test ilk deneyim checkbox and deneyim add
- Navigate through all 5 steps
- Last step shows "Kaydet" button

**Step 3: Test validation blocks**

- Empty Kisisel fields — error, stays on step
- Empty Kariyer (no deneyim, no ilk_deneyim) — error
- Empty Tercihler fields — error on final save

**Step 4: Test returning user**

- Save profile, reload page
- No intro overlay
- All steps completed (green checkmarks)
- Can click any step to jump directly
- All fields pre-filled

**Step 5: Fix any issues and commit**

```bash
git add profil.html && git commit -m "fix: wizard polish and visual adjustments"
```

---

### Task 7: Push to Remote

**Step 1: Push**

```bash
git push origin main
```

**Step 2: Verify on live site with cache-bust**

---

## Summary

| Area | Changes |
|------|---------|
| Supabase | Add ilk_deneyim boolean column |
| CSS (~80 lines) | Wizard progress bar, bottom nav, intro overlay, ilk deneyim card, slide animations, mobile responsive |
| HTML (~40 lines) | Progress bar, intro overlay, bottom nav, ilk deneyim card inside kariyer section |
| JS (~180 lines) | Wizard state machine, step navigation, animations, ilk deneyim toggle, localStorage persist, loadProfile/saveProfile integration |
| Hidden in wizard | card-edit-btn, card-save-btn, completion-card, cv-hero, feature-card |
| Preserved | All existing form logic, validation, Supabase save, chip/tag systems, dil/ekstra egitim rows |
