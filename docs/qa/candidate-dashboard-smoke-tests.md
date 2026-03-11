# Candidate Dashboard — Smoke Test Checklist

> Last updated: 2026-03-11
> Run these tests against the live `profil.html` page after any change to the candidate profile system.

---

## Prerequisites

- A registered candidate account with Supabase Auth credentials
- Access to the live site (or local preview)
- Browser DevTools open (Console + Network tabs)

---

## 1. Profile Restore Test

**Goal**: Verify that a saved profile loads correctly from the database on page load.

| # | Step | Expected |
|---|------|----------|
| 1 | Log in as a candidate with a previously saved profile | Dashboard loads |
| 2 | Check dashboard summary cards | Name, current company, current role display correctly |
| 3 | Click "Edit" on any section to open wizard | Wizard opens at the correct step |
| 4 | Verify Step 1 (Kişisel) | Name, email, phone, birth year, gender populated |
| 5 | Navigate to Step 2 (Kariyer) | Experience cards populated with saved data |
| 6 | Navigate to Step 3 (Eğitim) | Education, certificates, languages populated |
| 7 | Navigate to Step 4 (Tercihler) | Target roles, work prefs, brand interests populated |
| 8 | Navigate to Step 5 (Lokasyon) | City and district selections populated |
| 9 | Check avatar in sidebar/hero | Avatar image loads (if previously uploaded) |

**Pass criteria**: All saved data appears correctly. No console errors.

---

## 2. CV Upload / Replace / Delete Test

**Goal**: Verify the full CV lifecycle.

| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to CV section on dashboard | Shows empty state OR existing CV |
| 2 | Upload a PDF file (< 5 MB) | Upload completes, filename displayed, "Uploaded" state shown |
| 3 | Refresh the page | CV still shown (persisted in DB + storage) |
| 4 | Upload a different PDF (replace) | Old file replaced, new filename displayed |
| 5 | Refresh the page | New CV still shown |
| 6 | Click delete/remove CV | CV removed, empty state shown |
| 7 | Refresh the page | CV section still shows empty state |
| 8 | Check Supabase Storage (`cvs` bucket, `cv/{uid}/` path) | File present after upload, gone after delete |

**Pass criteria**: Upload, replace, delete all work. State persists across refresh. No orphaned files.

---

## 3. Wizard Save / Refresh Test

**Goal**: Verify that wizard changes persist after save and page refresh.

| # | Step | Expected |
|---|------|----------|
| 1 | Open wizard, go to Step 2 | |
| 2 | Add a new experience entry | Card appears |
| 3 | Fill in required fields (company, position, dates) | |
| 4 | Click Save (complete wizard) | Toast confirms save. Wizard closes. |
| 5 | Refresh the page | |
| 6 | Open wizard, go to Step 2 | New experience entry is present |
| 7 | Repeat for Step 3 (add education) | Persists after refresh |
| 8 | Repeat for Step 4 (add target role) | Persists after refresh |
| 9 | Repeat for Step 5 (add city) | Persists after refresh |

**Pass criteria**: All wizard data round-trips through the RPC and back.

---

## 4. Draft / Dirty State Test

**Goal**: Verify unsaved wizard changes are protected and recoverable.

| # | Step | Expected |
|---|------|----------|
| 1 | Open wizard, make a change (don't save) | |
| 2 | Try to navigate away (click sidebar link) | Unsaved-changes warning appears |
| 3 | Cancel navigation | Stay in wizard, changes preserved |
| 4 | Refresh the page (without saving) | |
| 5 | Open wizard again | Draft data restored from localStorage (steps 2–5) |

**Pass criteria**: Dirty state guard fires. Draft restore works.

---

## 5. Avatar Upload / Persistence Test

**Goal**: Verify avatar upload and display.

| # | Step | Expected |
|---|------|----------|
| 1 | Open wizard Step 1 or avatar upload area | |
| 2 | Upload a JPG/PNG image | Avatar preview updates immediately |
| 3 | Save wizard | |
| 4 | Refresh the page | Avatar displays in sidebar and hero card |
| 5 | Upload a different image (replace) | New avatar shown |
| 6 | Refresh | New avatar persists |
| 7 | Check Supabase Storage (`cvs` bucket, `avatars/` path) | Single file: `{uid}.{ext}` |

**Pass criteria**: Avatar uploads, displays, persists, and replaces cleanly. Only one avatar file per user.

---

## 6. Basic Live Verification Checklist

Quick go/no-go check after deployment:

- [ ] Page loads without console errors
- [ ] Login redirects to dashboard correctly
- [ ] Dashboard completion score displays
- [ ] Profile summary cards render
- [ ] Wizard opens and closes
- [ ] At least one wizard save round-trips successfully
- [ ] CV upload works
- [ ] Avatar displays
- [ ] Mobile layout renders (sidebar collapses)
- [ ] No network errors in DevTools (401, 403, 500)

---

## Notes

- All storage operations target the `cvs` bucket
- Avatar path: `avatars/{user_id}.{ext}`
- CV path: `cv/{user_id}/cv.{ext}`
- The `cvs` bucket is currently PUBLIC (see `docs/architecture/hellotalent-profile-system.md` section 9)
