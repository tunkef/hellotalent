# v3 Dashboard Refinement — Design Document

**Date:** 2026-03-11
**Scope:** 6-area UI/UX refinement pass on profil.html (Profil Merkezi + Genel Bakış)
**File:** `/Users/peopleintk/Downloads/Hellotalent/profil.html`

---

## 1. Completion vs Score Feedback

**Current:** Two identical-looking stat cards. Score hint hidden by default. Same visual weight.

**Change:**
- Add colored left-border accent: green for Completion, verm for Score
- Always show score hint when < 100 (bold, verm-tinted background, arrow icon)
- Show up to 2 hints instead of 1
- Premium wording: "Tüm alanlar dolduruldu ✓" (completion 100%), "Mükemmel skor!" (score 100)

## 2. CV Upload — Active with Supabase Storage

**Current:** Fully placeholder (disabled button, "yakında aktif olacak" text).

**Change:**
- Real `<input type="file" accept=".pdf,.doc,.docx">` with 5MB limit
- Upload to Supabase Storage bucket `cv-uploads/{user_id}/{filename}`
- Store metadata in candidates table: `cv_url`, `cv_filename`, `cv_uploaded_at`
- Move CV area below section cards (Hero → Stats → Sections → CV)
- Show uploaded file state with filename, date, delete/re-upload options
- AI CV teaser stays as premium "Yakında" card

**DB Migration:**
```sql
ALTER TABLE candidates ADD COLUMN cv_url text;
ALTER TABLE candidates ADD COLUMN cv_filename text;
ALTER TABLE candidates ADD COLUMN cv_uploaded_at timestamptz;
```

## 3. Wizard Exit Protection

**Current:** No guard — clicking sidebar/nav during wizard silently discards all edits.

**Change:**
- Track `wizardDirty` flag via input event listeners in wizard
- Intercept `switchPanel()` when leaving `panel-profil` with dirty state
- Show confirmation modal with "Düzenlemeye dön" / "Kaydetmeden çık" buttons
- Guard also applies to sidebar nav, bottom nav, and browser back button

## 4. Hero Card — Full Identity

**Current:** Shows name + city only. `merkez-role` and `merkez-company` IDs missing from HTML.

**Change:**
- Add `<div class="m-role" id="merkez-role">` and `<span id="merkez-company">` inside m-info
- Layout: Name → Role @ Company → City · Experience
- Stronger avatar: gradient background, slight border ring, larger text

## 5. Controls Horizontal Alignment

**Current:** Toggle and locked button stacked vertically with premium hint below.

**Change:**
- Flatten to single horizontal row
- Remove wrapping div around m-btn-locked
- Move premium hint to tooltip on hover
- Equal height pill backgrounds for both controls

## 6. Visual Polish

- Increase hero-to-stats gap: 12px → 16px
- Section cards: colored left-border (subtle, by wizard step)
- "Profil Bölümleri" header: more top margin
- Footer teaser: subtle gradient background
- Consistent 16px section gaps

---

## Implementation Order

1. CSS: stat borders, controls layout, spacing, CV repositioning
2. HTML: hero identity elements, controls flatten, CV active upload markup, move CV below sections
3. JS: wizard dirty tracking, switchPanel guard, modal, CV upload logic, hint improvements, updateMerkezIdentity fix
4. DB: SQL migration for cv columns
