# F1-F2-F3 Critical Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 known bugs from Asama 73 — avatar signed URL inconsistency (F1), dead "Beni Hatirla" checkbox (F2), CSP connect-src gaps (F3). Zero technical debt, full test coverage.

**Architecture:** F1 introduces a shared `signAvatarUrl(supaClient, path)` helper in shared.js and converts all avatar consumers from getPublicUrl/raw-path to signed URLs. F2 removes the non-functional checkbox entirely (Supabase v2 default localStorage is the correct behavior). F3 updates CSP meta tags across 13 HTML files with correct connect-src, frame-src, and script-src directives.

**Tech Stack:** Vanilla JS, Supabase JS v2 (CDN), Playwright tests, GitHub Pages

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `shared.js` | Modify | Add `signStorageUrl()` helper |
| `coach-studio.html` | Modify | Fix avatar upload (L619) + cover upload (L988): store path, sign on render |
| `ik.html` | Modify | Fix candidate avatar in loadFollowedCandidates (L1943-1948) |
| `profil-preview.js` | Modify | Sign avatar URL before rendering preview |
| `profil-genel.js` | Modify | Sign coach avatar in buildCoachAvatar (L352-365), showCoachCard (L398-409), identity card (L486-498) |
| `admin-coach-content.js` | Modify | Sign coach avatar in list + detail (L211-216, ~L586) |
| `giris.html` | Modify | Remove "Beni Hatirla" checkbox HTML + dead JS vars (L355-360, L406-411, L551, L597) |
| `profil.html` | Modify | CSP: add wss://, fix Sentry ingest |
| `ik.html` | Modify | CSP: add wss:// |
| `coach-studio.html` | Modify | CSP: add wss:// |
| `iletisim.html` | Modify | CSP: add frame-src for Google Maps |
| All 13 HTML files | Modify | CSP: clean Sentry from non-Sentry pages, add wss:// where Supabase realtime is used |
| `tests/f1-f2-f3-fixes.spec.js` | Create | Playwright tests for all 3 fixes |

---

## Task 1: Add `signStorageUrl()` Helper to shared.js

**Files:**
- Modify: `shared.js` (add helper to HT namespace)

- [ ] **Step 1: Write the failing test**

```javascript
// tests/f1-f2-f3-fixes.spec.js
const { test, expect } = require('@playwright/test');
const BASE = 'http://localhost:3000';

test.describe('F1 — Avatar Signed URL', () => {
  test('shared.js exposes HT.signStorageUrl function', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var hasFn = await page.evaluate(() => typeof window.HT !== 'undefined' && typeof window.HT.signStorageUrl === 'function');
    expect(hasFn).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Downloads/Hellotalent && npx playwright test tests/f1-f2-f3-fixes.spec.js --reporter=list`
Expected: FAIL — `HT.signStorageUrl` is not defined

- [ ] **Step 3: Implement signStorageUrl in shared.js**

Add inside the `window.HT` object (after `getSupa` function):

```javascript
/**
 * Sign a Supabase storage path to get a time-limited URL.
 * Returns signed URL string or '' if path is empty/falsy.
 * @param {string} storagePath - e.g. 'avatars/uid.png' or 'coach_avatars/id.jpg'
 * @param {number} [expiresIn=3600] - seconds (default 1 hour)
 */
signStorageUrl: async function(storagePath, expiresIn) {
  if (!storagePath) return '';
  var supa = window.HT.getSupa();
  if (!supa) return '';
  var res = await supa.storage.from('cvs').createSignedUrl(storagePath, expiresIn || 3600);
  return (res.data && res.data.signedUrl) || '';
},

/**
 * Batch sign multiple storage paths. Returns a Map<path, signedUrl>.
 * @param {string[]} paths
 * @param {number} [expiresIn=3600]
 */
signStorageUrls: async function(paths, expiresIn) {
  var map = {};
  if (!paths || paths.length === 0) return map;
  var supa = window.HT.getSupa();
  if (!supa) return map;
  var res = await supa.storage.from('cvs').createSignedUrls(paths, expiresIn || 3600);
  if (res.data) {
    res.data.forEach(function(item) {
      if (item.signedUrl && !item.error) map[item.path] = item.signedUrl;
    });
  }
  return map;
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "signStorageUrl" --reporter=list`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared.js tests/f1-f2-f3-fixes.spec.js
git commit -m "feat(F1): add HT.signStorageUrl + signStorageUrls helpers for private bucket"
```

---

## Task 2: Fix coach-studio.html Avatar Upload (store path, sign on render)

**Files:**
- Modify: `coach-studio.html:619-627` (avatar upload)
- Modify: `coach-studio.html:988-992` (cover image upload)

- [ ] **Step 1: Write the failing test**

```javascript
test.describe('F1 — coach-studio avatar', () => {
  test('coach-studio.html does not call getPublicUrl', async ({ page }) => {
    await page.goto(`${BASE}/coach-studio.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.textContent).join('\n');
    });
    expect(scriptContent).not.toContain('.getPublicUrl(');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "getPublicUrl" --reporter=list`
Expected: FAIL — coach-studio.html still contains `.getPublicUrl(`

- [ ] **Step 3: Fix avatar upload (line 619-627)**

Replace lines 619-627 in `coach-studio.html`:

OLD (lines 619-627):
```javascript
      var publicUrl = _supa.storage.from('cvs').getPublicUrl(path).data.publicUrl;
      var cleanUrl = publicUrl.split('?')[0];
      var dbRes = await _supa.from('coach_profiles').update({ avatar_url: cleanUrl }).eq('id', _coachProfile.id);
      if (dbRes.error) { showMsg(msgEl, 'Kayıt hatası: ' + dbRes.error.message, 'error'); return; }
      _coachProfile.avatar_url = cleanUrl;
      var preview = document.getElementById('cs-avatar-preview');
      if (preview) preview.src = cleanUrl + '?t=' + Date.now();
      showMsg(msgEl, 'Profil fotoğrafı güncellendi.', 'success');
      renderProfileCard();
```

NEW:
```javascript
      var dbRes = await _supa.from('coach_profiles').update({ avatar_url: path }).eq('id', _coachProfile.id);
      if (dbRes.error) { showMsg(msgEl, 'Kayıt hatası: ' + dbRes.error.message, 'error'); return; }
      _coachProfile.avatar_url = path;
      var signedUrl = await window.HT.signStorageUrl(path);
      var preview = document.getElementById('cs-avatar-preview');
      if (preview) preview.src = signedUrl;
      showMsg(msgEl, 'Profil fotoğrafı güncellendi.', 'success');
      renderProfileCard();
```

- [ ] **Step 4: Fix cover image upload (line 988-992)**

Replace lines 988-992 in `coach-studio.html`:

OLD (lines 988-992):
```javascript
      var publicUrl = _supa.storage.from('cvs').getPublicUrl(path).data.publicUrl;
      var cleanUrl = publicUrl.split('?')[0];
      var dbRes = await _supa.from('coach_posts').update({ cover_image_url: cleanUrl }).eq('id', postId);
      if (dbRes.error) { showMsg(msgEl, 'Kayıt hatası: ' + dbRes.error.message, 'error'); return false; }
      _pendingCoverFile = null; return true;
```

NEW:
```javascript
      var dbRes = await _supa.from('coach_posts').update({ cover_image_url: path }).eq('id', postId);
      if (dbRes.error) { showMsg(msgEl, 'Kayıt hatası: ' + dbRes.error.message, 'error'); return false; }
      _pendingCoverFile = null; return true;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "getPublicUrl" --reporter=list`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add coach-studio.html
git commit -m "fix(F1): coach-studio store path not public URL — avatar + cover upload"
```

---

## Task 3: Fix coach avatar rendering (profil-genel.js + admin-coach-content.js)

**Files:**
- Modify: `profil-genel.js:352-365` (buildCoachAvatar)
- Modify: `profil-genel.js:398-409` (showCoachCard)
- Modify: `profil-genel.js:486-498` (identity card avatar)
- Modify: `admin-coach-content.js:211-216` (coach list avatar)
- Modify: `admin-coach-content.js:~586` (coach detail avatar)

- [ ] **Step 1: Write the failing test**

```javascript
test.describe('F1 — coach avatar signing', () => {
  test('profil-genel.js buildCoachAvatar uses signStorageUrl', async ({ page }) => {
    await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script[src="profil-genel.js"]'));
      if (scripts.length === 0) return 'FILE_NOT_FOUND';
      return fetch(scripts[0].src).then(r => r.text());
    });
    // buildCoachAvatar must not directly assign cp.avatar_url to img.src
    // It should use signStorageUrl or an async signing pattern
    expect(scriptContent).toContain('signStorageUrl');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — profil-genel.js does not contain `signStorageUrl`

- [ ] **Step 3: Fix buildCoachAvatar (profil-genel.js:352-365)**

The function is synchronous and returns a DOM element. Since signing is async, convert to async and update all callers. However, since this is used in rendering loops, a better approach is to pre-sign URLs before rendering.

Replace `buildCoachAvatar` function:

OLD:
```javascript
  function buildCoachAvatar(cp, extraClass) {
    var avatar = el('div', 'gh-coach-avatar' + (extraClass ? ' ' + extraClass : ''));
    if (cp && cp.avatar_url) {
      var img = document.createElement('img');
      img.src = cp.avatar_url;
      img.alt = '';
      img.loading = 'lazy';
      avatar.appendChild(img);
    } else {
      var name = (cp && cp.display_name) || '?';
      avatar.textContent = name.charAt(0).toUpperCase();
    }
    return avatar;
  }
```

NEW:
```javascript
  function buildCoachAvatar(cp, extraClass) {
    var avatar = el('div', 'gh-coach-avatar' + (extraClass ? ' ' + extraClass : ''));
    if (cp && cp.avatar_url) {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      avatar.appendChild(img);
      // Sign the storage path asynchronously
      window.HT.signStorageUrl(cp.avatar_url).then(function(url) {
        if (url) img.src = url;
      });
    } else {
      var name = (cp && cp.display_name) || '?';
      avatar.textContent = name.charAt(0).toUpperCase();
    }
    return avatar;
  }
```

- [ ] **Step 4: Fix showCoachCard avatar (profil-genel.js:398-409)**

OLD:
```javascript
    if (cp.avatar_url) {
      var aImg = document.createElement('img');
      aImg.src = cp.avatar_url;
      aImg.alt = '';
      avatarDiv.appendChild(aImg);
    }
```

NEW:
```javascript
    if (cp.avatar_url) {
      var aImg = document.createElement('img');
      aImg.alt = '';
      avatarDiv.appendChild(aImg);
      window.HT.signStorageUrl(cp.avatar_url).then(function(url) {
        if (url) aImg.src = url;
      });
    }
```

- [ ] **Step 5: Fix identity card avatar (profil-genel.js:486-498)**

This uses `profile.avatar_url` for the candidate's own avatar. The bootstrap already signs it, but the in-memory `_loadedDBData.profile.avatar_url` still holds the raw path. Fix:

OLD:
```javascript
    if (avatarUrl) {
      var img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = '';
      avatar.appendChild(img);
    }
```

NEW:
```javascript
    if (avatarUrl) {
      var img = document.createElement('img');
      img.alt = '';
      avatar.appendChild(img);
      window.HT.signStorageUrl(avatarUrl).then(function(url) {
        if (url) img.src = url;
      });
    }
```

- [ ] **Step 6: Fix admin-coach-content.js coach list avatar (L211-216)**

OLD:
```javascript
        if (coach.avatar_url) {
          var avatarImg = document.createElement('img');
          avatarImg.src = coach.avatar_url;
          avatarImg.alt = '';
          avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          avatarEl.appendChild(avatarImg);
        }
```

NEW:
```javascript
        if (coach.avatar_url) {
          var avatarImg = document.createElement('img');
          avatarImg.alt = '';
          avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          avatarEl.appendChild(avatarImg);
          window.HT.signStorageUrl(coach.avatar_url).then(function(url) {
            if (url) avatarImg.src = url;
          });
        }
```

- [ ] **Step 7: Fix admin-coach-content.js coach detail avatar (~L586)**

Same pattern: find `img.src = coach.avatar_url` near line 586 and apply the async signing pattern (append img to DOM first, then set src in `.then()`).

- [ ] **Step 8: Run tests**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "coach avatar" --reporter=list`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add profil-genel.js admin-coach-content.js
git commit -m "fix(F1): sign coach avatar + cover URLs at render time — profil-genel + admin"
```

---

## Task 4: Fix ik.html Candidate Avatar + profil-preview.js

**Files:**
- Modify: `ik.html:1943-1948` (loadFollowedCandidates avatar)
- Modify: `profil-preview.js:33-35` (profile preview avatar)

- [ ] **Step 1: Write the failing test**

```javascript
test.describe('F1 — employer + preview avatar', () => {
  test('ik.html loadFollowedCandidates does not use raw avatar_url as src', async ({ page }) => {
    await page.goto(`${BASE}/ik.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.textContent).join('\n');
    });
    // Should not contain pattern: img.src = cand.avatar_url
    var hasRawAssign = /img\.src\s*=\s*cand\.avatar_url/.test(scriptContent);
    expect(hasRawAssign).toBe(false);
  });

  test('profil-preview.js uses signStorageUrl', async ({ page }) => {
    await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
    var content = await page.evaluate(() => fetch('profil-preview.js').then(r => r.text()));
    expect(content).toContain('signStorageUrl');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Expected: FAIL

- [ ] **Step 3: Fix ik.html loadFollowedCandidates (L1943-1948)**

OLD:
```javascript
      if(cand.avatar_url) {
        var img = document.createElement('img');
        img.src = cand.avatar_url;
        img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        avatar.appendChild(img);
      }
```

NEW:
```javascript
      if(cand.avatar_url) {
        var img = document.createElement('img');
        img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        avatar.appendChild(img);
        window.HT.signStorageUrl(cand.avatar_url).then(function(url) {
          if (url) img.src = url;
        });
      }
```

- [ ] **Step 4: Fix profil-preview.js (L33-35)**

The preview builds HTML as a string, so we need to make the function async and sign before rendering.

OLD:
```javascript
  var avatarInner = showPersonalInfo && p.avatar_url
    ? '<img src="' + _escHtml(p.avatar_url) + '" alt="">'
    : (showPersonalInfo ? initials : '?');
```

NEW:
```javascript
  var _signedAvatarUrl = (showPersonalInfo && p.avatar_url)
    ? await window.HT.signStorageUrl(p.avatar_url)
    : '';
  var avatarInner = _signedAvatarUrl
    ? '<img src="' + _escHtml(_signedAvatarUrl) + '" alt="">'
    : (showPersonalInfo ? initials : '?');
```

NOTE: This requires `openProfilePreview` to be `async`. Check that the function declaration already has `async` or add it. The function is called from a button click handler so making it async is safe.

- [ ] **Step 5: Run tests**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "employer|preview" --reporter=list`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add ik.html profil-preview.js
git commit -m "fix(F1): sign avatar URLs in ik.html candidate cards + profil-preview"
```

---

## Task 5: DB Data Migration — Fix Existing Broken coach avatar_url Values

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_fix_coach_avatar_urls.sql`

- [ ] **Step 1: Write migration to strip full URLs back to storage paths**

Existing `coach_profiles.avatar_url` and `coach_posts.cover_image_url` may contain full public URLs like:
`https://cpwibefquojehjehtrog.supabase.co/storage/v1/object/public/cvs/coach_avatars/...`

We need to extract just the path part (after `/public/cvs/`).

```sql
-- Fix coach_profiles.avatar_url: strip full public URL to storage path
UPDATE coach_profiles
SET avatar_url = regexp_replace(
  avatar_url,
  '^https://cpwibefquojehjehtrog\.supabase\.co/storage/v1/object/public/cvs/',
  ''
)
WHERE avatar_url LIKE 'https://cpwibefquojehjehtrog.supabase.co/storage/v1/object/public/cvs/%';

-- Fix coach_posts.cover_image_url: strip full public URL to storage path
UPDATE coach_posts
SET cover_image_url = regexp_replace(
  cover_image_url,
  '^https://cpwibefquojehjehtrog\.supabase\.co/storage/v1/object/public/cvs/',
  ''
)
WHERE cover_image_url LIKE 'https://cpwibefquojehjehtrog.supabase.co/storage/v1/object/public/cvs/%';
```

- [ ] **Step 2: Create migration file**

Run: `cd ~/Downloads/Hellotalent && npm run db:new -- fix_coach_avatar_urls`

Copy the SQL above into the generated migration file.

- [ ] **Step 3: Deploy migration**

Run: `npm run db:push`

- [ ] **Step 4: Verify**

Run via Supabase MCP or SQL editor:
```sql
SELECT id, avatar_url FROM coach_profiles WHERE avatar_url LIKE 'https://%';
-- Expected: 0 rows
SELECT id, cover_image_url FROM coach_posts WHERE cover_image_url LIKE 'https://%';
-- Expected: 0 rows
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "fix(F1): migrate coach avatar/cover URLs from full public URL to storage path"
```

---

## Task 6: Remove "Beni Hatirla" Checkbox (F2)

**Files:**
- Modify: `giris.html:355-360` (aday checkbox HTML)
- Modify: `giris.html:406-411` (IK checkbox HTML)
- Modify: `giris.html:551` (dead `var remember` in loginAday)
- Modify: `giris.html:597` (dead `var remember` in loginIK)

- [ ] **Step 1: Write the failing test**

```javascript
test.describe('F2 — Beni Hatirla removal', () => {
  test('giris.html has no remember-me checkbox', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var adayCheckbox = await page.$('#cb-remember-aday');
    var ikCheckbox = await page.$('#cb-remember-ik');
    expect(adayCheckbox).toBeNull();
    expect(ikCheckbox).toBeNull();
  });

  test('giris.html JS has no dead remember variable', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.textContent).join('\n');
    });
    expect(scriptContent).not.toContain("cb-remember-aday");
    expect(scriptContent).not.toContain("cb-remember-ik");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Expected: FAIL — checkboxes still exist

- [ ] **Step 3: Remove aday checkbox HTML (L355-360)**

Remove the entire `<div>` wrapper that contains the checkbox and "Sifremi Unuttum" link, then add back ONLY the "Sifremi Unuttum" link with right-alignment:

OLD (lines 355-360):
```html
        <div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0 12px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--text-base);color:var(--muted);cursor:pointer;">
            <input type="checkbox" id="cb-remember-aday" style="flex-shrink:0;"> Beni Hatırla
          </label>
          <a href="#" id="btn-forgot-password-aday" style="font-size:var(--text-base);color:var(--verm);text-decoration:none;">Şifremi Unuttum</a>
        </div>
```

NEW:
```html
        <div style="text-align:right;margin:4px 0 12px;">
          <a href="#" id="btn-forgot-password-aday" style="font-size:var(--text-base);color:var(--verm);text-decoration:none;">Şifremi Unuttum</a>
        </div>
```

- [ ] **Step 4: Remove IK checkbox HTML (L406-411)**

Same pattern:

OLD (lines 406-411):
```html
        <div style="display:flex;align-items:center;justify-content:space-between;margin:4px 0 12px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:var(--text-base);color:var(--muted);cursor:pointer;">
            <input type="checkbox" id="cb-remember-ik" style="flex-shrink:0;"> Beni Hatırla
          </label>
          <a href="#" id="btn-forgot-password-ik" style="font-size:var(--text-base);color:var(--verm);text-decoration:none;">Şifremi Unuttum</a>
        </div>
```

NEW:
```html
        <div style="text-align:right;margin:4px 0 12px;">
          <a href="#" id="btn-forgot-password-ik" style="font-size:var(--text-base);color:var(--verm);text-decoration:none;">Şifremi Unuttum</a>
        </div>
```

- [ ] **Step 5: Remove dead `var remember` in loginAday (L551)**

Remove line:
```javascript
  var remember = document.getElementById('cb-remember-aday').checked;
```

- [ ] **Step 6: Remove dead `var remember` in loginIK (L597)**

Remove line:
```javascript
  var remember = document.getElementById('cb-remember-ik').checked;
```

- [ ] **Step 7: Run tests**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "Beni Hatirla" --reporter=list`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add giris.html
git commit -m "fix(F2): remove non-functional Beni Hatirla checkbox — Supabase v2 localStorage is default"
```

---

## Task 7: Fix CSP — connect-src, frame-src, script-src Cleanup (F3)

**Files:**
- Modify: All 13 HTML files with CSP meta tags

### CSP Policy Decisions

| Issue | Fix | Scope |
|-------|-----|-------|
| `wss://` missing for Supabase Realtime | Add `wss://cpwibefquojehjehtrog.supabase.co` to connect-src | All pages with Supabase client (12 pages, not demo-dashboard) |
| Sentry ingest domain wrong | Replace `https://*.sentry.io` with `https://*.sentry.io https://o4511026567118848.ingest.de.sentry.io` | `profil.html` only (sole Sentry user) |
| Google Maps iframe blocked | Add `frame-src https://www.google.com` | `iletisim.html` only |
| Sentry in script-src of non-Sentry pages | Remove `https://browser.sentry-cdn.com` from script-src | 12 pages that don't load Sentry (keep only in profil.html) |
| `frame-ancestors` in meta tag ignored | Document as known limitation (GitHub Pages has no server headers) | N/A — informational |

- [ ] **Step 1: Write the failing test**

```javascript
test.describe('F3 — CSP fixes', () => {
  test('profil.html CSP includes wss:// in connect-src', async ({ page }) => {
    await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
    var csp = await page.evaluate(() => {
      var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.content : '';
    });
    expect(csp).toContain('wss://cpwibefquojehjehtrog.supabase.co');
  });

  test('profil.html CSP includes Sentry ingest domain', async ({ page }) => {
    await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
    var csp = await page.evaluate(() => {
      var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.content : '';
    });
    expect(csp).toContain('o4511026567118848.ingest.de.sentry.io');
  });

  test('iletisim.html CSP includes frame-src for Google Maps', async ({ page }) => {
    await page.goto(`${BASE}/iletisim.html`, { waitUntil: 'networkidle' });
    var csp = await page.evaluate(() => {
      var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.content : '';
    });
    expect(csp).toContain('frame-src');
    expect(csp).toContain('https://www.google.com');
  });

  test('giris.html CSP does not include Sentry CDN in script-src', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var csp = await page.evaluate(() => {
      var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.content : '';
    });
    expect(csp).not.toContain('browser.sentry-cdn.com');
  });

  test('all pages with Supabase have wss:// in connect-src', async ({ page }) => {
    var pages = ['index.html', 'admin.html', 'ik.html', 'coach-studio.html', 'giris.html', 'uye-ol.html'];
    for (var p of pages) {
      await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
      var csp = await page.evaluate(() => {
        var meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        return meta ? meta.content : '';
      });
      expect(csp, `${p} missing wss://`).toContain('wss://cpwibefquojehjehtrog.supabase.co');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Expected: FAIL on all CSP tests

- [ ] **Step 3: Define the 3 CSP templates**

**Template A — profil.html (Sentry + Realtime):**
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://browser.sentry-cdn.com https://www.googletagmanager.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cpwibefquojehjehtrog.supabase.co https://*.googleusercontent.com; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co wss://cpwibefquojehjehtrog.supabase.co https://*.google-analytics.com https://*.sentry.io https://o4511026567118848.ingest.de.sentry.io; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

**Template B — Standard app pages (no Sentry, with Realtime):**
Used by: `index.html`, `admin.html`, `ik.html`, `coach-studio.html`, `giris.html`, `sifre-yenile.html`, `hakkimizda.html`, `yasal.html`, `gate.html`
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.googletagmanager.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cpwibefquojehjehtrog.supabase.co https://*.googleusercontent.com; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co wss://cpwibefquojehjehtrog.supabase.co https://*.google-analytics.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

**Template C — uye-ol.html (Turnstile + Realtime, no Sentry):**
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.googletagmanager.com https://www.google.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cpwibefquojehjehtrog.supabase.co https://*.googleusercontent.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co wss://cpwibefquojehjehtrog.supabase.co https://*.google-analytics.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

**Template D — iletisim.html (Google Maps frame, no Sentry):**
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.googletagmanager.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cpwibefquojehjehtrog.supabase.co https://*.googleusercontent.com; frame-src https://www.google.com; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co wss://cpwibefquojehjehtrog.supabase.co https://*.google-analytics.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

**Template E — demo-dashboard-ik.html (minimal, no Sentry, no GTM):**
```
default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co wss://cpwibefquojehjehtrog.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

- [ ] **Step 4: Apply Template A to profil.html (line 6)**

Replace the entire CSP meta tag content attribute.

- [ ] **Step 5: Apply Template B to 9 standard pages**

Files: `index.html`, `admin.html`, `ik.html`, `coach-studio.html`, `giris.html`, `sifre-yenile.html`, `hakkimizda.html`, `yasal.html`, `gate.html`

Each file, line 6: replace CSP content attribute with Template B.

- [ ] **Step 6: Apply Template C to uye-ol.html (line 6)**

Replace CSP content attribute with Template C.

- [ ] **Step 7: Apply Template D to iletisim.html (line 6)**

Replace CSP content attribute with Template D.

- [ ] **Step 8: Apply Template E to demo-dashboard-ik.html (line 6)**

Replace CSP content attribute with Template E.

- [ ] **Step 9: Run CSP tests**

Run: `npx playwright test tests/f1-f2-f3-fixes.spec.js --grep "CSP" --reporter=list`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add index.html admin.html profil.html ik.html coach-studio.html giris.html sifre-yenile.html hakkimizda.html yasal.html gate.html uye-ol.html iletisim.html demo-dashboard-ik.html
git commit -m "fix(F3): CSP — add wss://, fix Sentry ingest, add Maps frame-src, remove dead Sentry entries"
```

---

## Task 8: Full Regression Test Suite

**Files:**
- Modify: `tests/f1-f2-f3-fixes.spec.js` (final shape)

- [ ] **Step 1: Run all existing tests**

```bash
cd ~/Downloads/Hellotalent && npx playwright test --reporter=list 2>&1 | tail -20
```

Expected: All previously passing tests (1250) still pass. New tests (F1/F2/F3) also pass.

- [ ] **Step 2: Run the new test file in isolation**

```bash
npx playwright test tests/f1-f2-f3-fixes.spec.js --reporter=list
```

Expected: All tests PASS

- [ ] **Step 3: Verify git diff stat — only intended files changed**

```bash
git diff --stat HEAD~$(git log --oneline | head -1 | wc -l)..HEAD
```

Verify: Only the files listed in the File Map were changed. No accidental modifications.

- [ ] **Step 4: Final commit (if any test fixes needed)**

Only if regression fixes were needed during this task.

---

## Task 9: Update Documentation

**Files:**
- Modify: `docs/AI-COLLAB.md`
- Modify: `docs/CURRENT-STATE.md`
- Modify: `vault/02-urun/yapilacaklar.md`

- [ ] **Step 1: Update AI-COLLAB.md**

Add a new completed section:

```markdown
**Asama 74 — F1/F2/F3 Critical Fixes (10 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| F1-1 | signStorageUrl helper (shared.js) | ✅ |
| F1-2 | coach-studio avatar/cover: getPublicUrl → path + sign | ✅ |
| F1-3 | Coach avatar rendering (profil-genel + admin) signed | ✅ |
| F1-4 | ik.html candidate avatar signed | ✅ |
| F1-5 | profil-preview.js avatar signed | ✅ |
| F1-6 | DB migration: strip broken full URLs to paths | ✅ |
| F2 | "Beni Hatirla" checkbox removed (dead code) | ✅ |
| F3-1 | CSP: wss:// added to connect-src (13 pages) | ✅ |
| F3-2 | CSP: Sentry ingest domain fixed (profil.html) | ✅ |
| F3-3 | CSP: Google Maps frame-src added (iletisim.html) | ✅ |
| F3-4 | CSP: Dead Sentry entries removed from 12 non-Sentry pages | ✅ |
```

Remove F1, F2, F3 from "Acil Fix" section.

- [ ] **Step 2: Update CURRENT-STATE.md**

Add to canli ozellikler section:
```
- **CSP tightening** — wss:// realtime, Sentry ingest fix, Google Maps frame-src, dead entry cleanup | All HTML
- **Avatar signed URL** — Tum avatar/cover gorselleri private bucket signed URL ile yukleniyor | shared.js, coach-studio, ik, profil-preview, profil-genel, admin-coach-content
```

- [ ] **Step 3: Update yapilacaklar.md**

No new items needed — F1/F2/F3 were tracked in AI-COLLAB only. But verify no related items need updating.

- [ ] **Step 4: Commit docs**

```bash
git add docs/AI-COLLAB.md docs/CURRENT-STATE.md
git commit -m "docs: Asama 74 — F1/F2/F3 fixes documented"
```

---

## Known Limitations (Documented, Not Fixed)

1. **`frame-ancestors 'none'` via `<meta>` tag is ignored by browsers.** GitHub Pages does not support custom HTTP headers. Mitigation: Cloudflare can add response headers if upgraded. Not a regression — this was always the case.

2. **Coach avatar signing adds 1 async round-trip per avatar.** For feeds with many coach posts, consider batch signing in the feed loader function (use `HT.signStorageUrls`). Not blocking for current traffic.

*Son guncelleme: 10 Nisan 2026*
