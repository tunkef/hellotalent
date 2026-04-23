/* global _applyWorkPrefs, _loadedDBData, _initBrandCompanyLookup, addTargetRoleRow, applyAllVisibilityMirrorsFromProfile, applyDraft, calculateCompletion, canonicalizeRole, currentCVStoragePath, currentUser, getProfilAuthSession, ht_track, initCVUpload, initStep1, initStep2, initStep3, initStep4, initStep5, initStep6, loadDraft, loadProfileFromDB, loadViewersCard, populateIlceSelect, renderSelectedLocations, RETAIL_POSITIONS, selectedCalismaTipleri, selectedCareerTypes, selectedMusaitlik, selectedSegmentler, setAvatarImage, setVal, showCVUploaded, STORAGE, supabase, syncAccountEmail, titleCaseTR, trLower, updateCompletionUI, updateDashboardSummary, updateMerkezCards, uploadCV */
'use strict';
// K049 Faz 2 — strict mode (currentUser/currentCVStoragePath cross-module shared, profil-core.js declared).
// ═══════════════════════════════════════════════════
// PROFIL BOOTSTRAP — auth, hydration, step-init orchestration
// Extracted from profil.html inline scripts.
// Depends on: profil-core.js, profil-data.js, profil-ui.js,
//   profil-locations.js, profil-summary.js, profil-visibility.js,
//   profil-preview.js, profil-cv.js (all loaded before this file).
// ═══════════════════════════════════════════════════

// ── reapplyDynamicFields ──────────────────────────
// Re-apply dynamically-populated selects and chips after initStep1/4/5 have created them.
// Covers the race where applyDraft ran before DOMContentLoaded (options didn't exist yet).
// Safe to call when no DB data was loaded (_loadedDBData is null) — returns immediately.
function reapplyDynamicFields() {
  var db = _loadedDBData;
  if (!db) return;

  // Step 1 selects (options created by initStep1)
  if (db.profile) {
    if (db.profile.bio) setVal('f-bio', db.profile.bio);
    setVal('f-dogumyili', db.profile.dogum_yili);
    setVal('f-adresil', db.profile.adres_il);
    if (db.profile.adres_il) {
      populateIlceSelect('f-adresilce', db.profile.adres_il);
      setVal('f-adresilce', db.profile.adres_ilce);
    }
  }

  // Step 4 selects + chips (options/chips created by initStep4)
  if (db.work_prefs) {
    _applyWorkPrefs(db.work_prefs);
  }

  // Step 5 location display — re-init multi-select to sync checkboxes/chips
  if (typeof initStep5 === 'function') initStep5();
}

// ── Career goal prefill ───────────────────────────
// Capture incoming ?career_goal= or localStorage value early.
// Actual DOM apply deferred to _htRunStepInits() after Step 4 rows exist.
var _htPrefillParams = new URLSearchParams(window.location.search);
var _htPendingCareerGoal = _htPrefillParams.get('career_goal') || localStorage.getItem('ht_career_goal') || '';

function _htApplyCareerGoalPrefill() {
  var goal = _htPendingCareerGoal;
  if (!goal || typeof RETAIL_POSITIONS === 'undefined') return;
  _htPendingCareerGoal = ''; // consume once
  localStorage.removeItem('ht_career_goal');
  localStorage.removeItem('ht_career_goal_set');

  // Match against retail position catalog (exact or canonical)
  var goalNorm = trLower(goal.trim());
  var matchedPos = RETAIL_POSITIONS.find(function(p) { return trLower(p) === goalNorm; });
  if (!matchedPos && typeof canonicalizeRole === 'function') {
    var canon = canonicalizeRole(goal);
    if (canon && canon.canonical) {
      matchedPos = RETAIL_POSITIONS.find(function(p) { return trLower(p) === trLower(canon.canonical); });
    }
  }
  if (matchedPos) {
    // Ensure at least one target-role row exists
    var firstRow = document.querySelector('#target-roles-container .dynamic-row');
    if (!firstRow && typeof addTargetRoleRow === 'function') {
      addTargetRoleRow();
      firstRow = document.querySelector('#target-roles-container .dynamic-row');
    }
    if (firstRow) {
      var sel = firstRow.querySelector('select[id$="-unvan"]');
      if (sel) sel.value = matchedPos;
    }
  }
  // Clean the URL without reload
  if (_htPrefillParams.has('career_goal')) {
    _htPrefillParams.delete('career_goal');
    var cleanUrl = window.location.pathname + (_htPrefillParams.toString() ? '?' + _htPrefillParams.toString() : '');
    window.history.replaceState({}, '', cleanUrl);
  }
}

// ── Auth + data bootstrap ─────────────────────────
(async function() {
  console.time('[HT] total-load'); // eslint-disable-line no-console
  var sessionRes = await getProfilAuthSession();
  if (!sessionRes.data.session) {
    if (window.Sentry) Sentry.addBreadcrumb({ category: 'auth', message: 'No session — redirecting to login', level: 'warning' });
    console.warn('[HT] No session found — redirecting to giris.html');
    window.location.href = 'giris.html';
    return;
  }
  currentUser = sessionRes.data.session.user;
  // Role guard: employer should not access candidate dashboard
  if (currentUser.app_metadata && currentUser.app_metadata.role === 'employer') {
    window.location.href = 'demo-dashboard-ik.html';
    return;
  }
  // MFA enforcement: if user has TOTP enrolled but session is aal1, redirect to login for challenge
  try {
    var aalRes = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalRes.data && aalRes.data.nextLevel === 'aal2' && aalRes.data.currentLevel === 'aal1') {
      console.warn('[HT] MFA enrolled but not verified — redirecting to login for challenge');
      window.location.href = 'giris.html';
      return;
    }
  } catch (e) {
    console.error('[HT] MFA AAL check failed:', e);
  }
  // Sentry: set user context (id only — no PII)
  if (window.Sentry) Sentry.setUser({ id: currentUser.id });

  // Set email in sidebar and settings
  var email = currentUser.email || '';
  var emailEl = document.getElementById('sidebar-email-text');
  if (emailEl) emailEl.textContent = email;
  syncAccountEmail();

  // Set name from metadata
  var metaName = (currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name)) || '';

  // Pre-fill wizard ad soyad from user_metadata (if field exists and is empty)
  var nameField = document.getElementById('f-adsoyad');
  if (nameField && !nameField.value && metaName) {
    nameField.value = metaName;
  }

  // Pre-fill wizard telefon from user_metadata
  var metaPhone = (currentUser.user_metadata && currentUser.user_metadata.phone) || '';
  var phoneField = document.getElementById('f-telefon');
  if (phoneField && !phoneField.value && metaPhone) {
    var d = metaPhone.replace(/\D/g, '');
    if (d.length === 11) {
      phoneField.value = d.slice(0,4) + ' ' + d.slice(4,7) + ' ' + d.slice(7,9) + ' ' + d.slice(9,11);
    } else {
      phoneField.value = metaPhone;
    }
  }

  var fallbackName = metaName || email.split('@')[0];
  var nameEl = document.getElementById('sidebar-user-name');
  if (nameEl) nameEl.textContent = fallbackName;

  // Set initials in avatars
  var initials = fallbackName.split(' ').map(function(w) { return w[0]; }).join('').substring(0,2).toUpperCase() || '?';
  document.querySelectorAll('#user-avatar-header, #sidebar-avatar, #ps-avatar').forEach(function(el) {
    el.textContent = initials;
  });

  // Populate avatar dropdown
  if (window._htPopulateAvatarDropdown) {
    window._htPopulateAvatarDropdown(fallbackName, email, null);
  }

  // Show app body behind loading screen
  document.getElementById('app-body').style.display = 'block';

  // Init brand/company id lookup (non-blocking — enriches BRAND_DB with FK ids)
  if (typeof _initBrandCompanyLookup === 'function') await _initBrandCompanyLookup();

  // Try loading profile data from DB
  var dbData = await loadProfileFromDB();
  _loadedDBData = dbData; // Store for post-init re-apply
  var btnPreview = document.getElementById('btn-preview-profile');
  if (btnPreview) btnPreview.style.display = (dbData && dbData.profile) ? 'inline-flex' : 'none';
  if (dbData) {
    applyDraft(dbData); // reuse applyDraft to populate all fields
    if (dbData.profile && dbData.profile.avatar_url) {
      var _avPath = dbData.profile.avatar_url;
      if (_avPath.indexOf('http') === 0) {
        try { _avPath = STORAGE.extractStoragePath(_avPath) || _avPath; } catch (_e2) {}
      }
      var _avSigned = await supabase.storage.from(STORAGE.BUCKET).createSignedUrl(_avPath, 3600);
      setAvatarImage((_avSigned.data && _avSigned.data.signedUrl) || '');
    }
    if (dbData.profile && dbData.profile.full_name) {
      var n = dbData.profile.full_name;
      var displayName = typeof titleCaseTR === 'function' ? titleCaseTR(n) : n;
      document.getElementById('sidebar-user-name').textContent = displayName;
      var avdNameEl = document.getElementById('avd-user-name');
      if (avdNameEl) avdNameEl.textContent = displayName;
      var ini = n.split(' ').map(function(w) { return w[0]; }).join('').substring(0,2).toUpperCase();
      document.querySelectorAll('#user-avatar-header, #sidebar-avatar, #ps-avatar').forEach(function(el) {
        if (!el.querySelector('img')) el.textContent = ini;
      });
    }
    // Load CV state if exists
    if (dbData.profile.cv_url && dbData.profile.cv_filename) {
      // cv_url is now a storage path — generate signed URL for display
      var _cvPath = dbData.profile.cv_url;
      // Handle legacy full URLs: extract path if needed
      if (_cvPath.indexOf('http') === 0) {
        try { _cvPath = STORAGE.extractStoragePath(_cvPath) || _cvPath; } catch (_e) {}
      }
      currentCVStoragePath = _cvPath;
      var _cvSignedRes = await supabase.storage.from(STORAGE.BUCKET).createSignedUrl(_cvPath, 3600);
      var _cvDisplayUrl = (_cvSignedRes.data && _cvSignedRes.data.signedUrl) || '';
      showCVUploaded(_cvDisplayUrl, new Date(dbData.profile.cv_uploaded_at || Date.now()));
      // Also update wizard CV zone (Step 6)
      var wizEmpty = document.getElementById('wiz-cv-empty');
      var wizUploaded = document.getElementById('wiz-cv-uploaded');
      var wizFname = document.getElementById('wiz-cv-filename');
      if (wizEmpty) wizEmpty.style.display = 'none';
      if (wizUploaded) wizUploaded.style.display = '';
      if (wizFname) wizFname.textContent = dbData.profile.cv_filename;
    }
    updateDashboardSummary(dbData.profile, dbData.experiences);
    if (typeof window._htLoadGenelHome === 'function') window._htLoadGenelHome();
    updateMerkezCards(); // Populate Profil Merkezi section cards
    if (typeof applyAllVisibilityMirrorsFromProfile === 'function') applyAllVisibilityMirrorsFromProfile();
    syncAccountEmail();
    // Auto-sync auth email → candidates.email if they differ
    if (_loadedDBData && _loadedDBData.profile && currentUser.email) {
      var dbEmail = _loadedDBData.profile.email || '';
      if (dbEmail && dbEmail !== currentUser.email) {
        await supabase.from('candidates').update({ email: currentUser.email }).eq('user_id', currentUser.id);
      }
    }
  } else {
    // No DB data — check for draft
    var draft = loadDraft();
    if (draft) {
      // Show draft timestamp if available
      var _draftHint = document.getElementById('draft-timestamp-hint');
      if (_draftHint && draft.timestamp) {
        try {
          var _d = new Date(draft.timestamp);
          _draftHint.textContent = 'Kaydedilme: ' + _d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch(e) { _draftHint.textContent = ''; }
      }
      document.getElementById('modal-draft').classList.add('show');
    }
    var _dep = document.getElementById('dash-empty-prompt');
    if (_dep) _dep.style.display = 'block';
    /* Genel home handles empty state via _htLoadGenelHome */
    if (typeof window._htLoadGenelHome === 'function') window._htLoadGenelHome();
  }

  // ── Dismiss loading screen now that data is ready ──
  var _ls = document.getElementById('loading-screen');
  if (_ls) {
    _ls.classList.add('fade-out');
    setTimeout(function() { _ls.style.display = 'none'; }, 500);
  }

  // ── Load Görüntüleyenler lab card (fire-and-forget) ──
  if (_loadedDBData && _loadedDBData.profile && _loadedDBData.profile.id) {
    (function(cid) {
      loadViewersCard(cid);
    })(_loadedDBData.profile.id);
  }

  // K-064: New / incomplete user → wizard (panel-profil). Completed → genel bakış.
  // Hash kullanıcısı kendi tercihini yaptı (bookmark), onboarding redirect'i override etmesin.
  var _hashExplicit = window.location.hash && window.location.hash.length > 1;
  if (!_hashExplicit) {
    var _completed = _loadedDBData && _loadedDBData.profile && _loadedDBData.profile.profile_completed === true;
    if (!_completed && typeof window.switchPanel === 'function') {
      window.switchPanel('profil');
    }
  }

  // K-068: Welcome modal — profile completion < 25% için her girişte göster.
  // ≥25 olduğunda artık sus (kullanıcı başladı, engel olma).
  // "Sonra hatırlat" → sessionStorage ile aynı oturumda suppressed.
  try {
    var _pct = (typeof calculateCompletion === 'function') ? (calculateCompletion() || 0) : 0;
    var _snoozed = false;
    try { _snoozed = sessionStorage.getItem('ht_wlc_snoozed') === '1'; } catch (_) {}
    if (_pct < 25 && !_snoozed) {
      var wlc = document.getElementById('wlc-modal');
      if (wlc) {
        var wlcFill = document.getElementById('wlc-progress-fill');
        var wlcPctEl = document.getElementById('wlc-progress-pct');
        if (wlcFill) wlcFill.style.width = Math.max(2, _pct) + '%';
        if (wlcPctEl) wlcPctEl.textContent = '%' + Math.round(_pct);
        // K041: .show class (+ hidden attr retained for prod discoverability).
        // Unified modal observer picks up focus trap + scroll lock.
        wlc.hidden = false;
        wlc.classList.add('show');
        var closeWlc = function() {
          wlc.hidden = true;
          wlc.classList.remove('show');
        };
        var snoozeWlc = function() {
          try { sessionStorage.setItem('ht_wlc_snoozed', '1'); } catch (_) {}
          closeWlc();
        };
        var btnStart = document.getElementById('wlc-modal-start');
        var btnX = document.getElementById('wlc-modal-close-x');
        var btnSnooze = document.getElementById('wlc-modal-snooze');
        if (btnStart) btnStart.addEventListener('click', closeWlc);
        if (btnX) btnX.addEventListener('click', closeWlc);
        if (btnSnooze) btnSnooze.addEventListener('click', snoozeWlc);
        wlc.addEventListener('click', function(e) {
          if (e.target === wlc) closeWlc();
        });
        // ESC closing handled by unified modal observer (profil-events.js) —
        // no per-modal listener needed.
      }
    }
  } catch (e) { console.warn('welcome modal skipped:', e); }

  // K-068: Milestone toast + wizard pulse — completion % değiştiğinde 50/75/100
  // eşiklerini geçince tebrik. localStorage 'ht_milestones_seen' ile kalıcı dedupe.
  // Wizard ileri butonunda progress bar pulse.
  try {
    var MILESTONES = [
      { pct: 50,  title: 'Yarı yoldasın',       body: 'Markalar profilini fark etmeye başladı.' },
      { pct: 75,  title: 'Neredeyse tamam',      body: 'Son birkaç alan seni öne çıkarır.' },
      { pct: 100, title: 'Profilin tam kapasitede', body: 'Artık sana uygun her fırsatla eşleşebilirsin.' }
    ];
    var mstoneToast = document.getElementById('ht-mstone-toast');
    var _mstoneTimer = null;
    var _getSeen = function() {
      try { return JSON.parse(localStorage.getItem('ht_milestones_seen') || '[]'); } catch (_) { return []; }
    };
    var _markSeen = function(pct) {
      var seen = _getSeen();
      if (seen.indexOf(pct) === -1) {
        seen.push(pct);
        try { localStorage.setItem('ht_milestones_seen', JSON.stringify(seen)); } catch (_) {}
      }
    };
    var _showMstone = function(m) {
      if (!mstoneToast) return;
      var titleEl = document.getElementById('ht-mstone-toast-title');
      var bodyEl = document.getElementById('ht-mstone-toast-body');
      if (titleEl) titleEl.textContent = m.title;
      if (bodyEl) bodyEl.textContent = m.body;
      mstoneToast.hidden = false;
      void mstoneToast.offsetWidth; // force reflow for transition
      mstoneToast.classList.add('is-visible');
      if (_mstoneTimer) clearTimeout(_mstoneTimer);
      _mstoneTimer = setTimeout(function() {
        mstoneToast.classList.remove('is-visible');
        setTimeout(function() { mstoneToast.hidden = true; }, 350);
      }, 4200);
    };
    var _lastPct = _pct;
    window._htCheckMilestones = function() {
      var curPct = (typeof calculateCompletion === 'function') ? (calculateCompletion() || 0) : 0;
      var seen = _getSeen();
      for (var i = 0; i < MILESTONES.length; i++) {
        var m = MILESTONES[i];
        if (curPct >= m.pct && _lastPct < m.pct && seen.indexOf(m.pct) === -1) {
          _showMstone(m);
          _markSeen(m.pct);
          break; // one at a time
        }
      }
      _lastPct = curPct;
    };
    // Hook updateCompletionUI — wrap existing fn
    if (typeof window.updateCompletionUI === 'function') {
      var _origUpdate = window.updateCompletionUI;
      window.updateCompletionUI = function() {
        _origUpdate.apply(this, arguments);
        try { window._htCheckMilestones(); } catch (_) {}
      };
    }
    // Wizard step advance pulse — wrap wizGoTo
    if (typeof window.wizGoTo === 'function') {
      var _origGo = window.wizGoTo;
      window.wizGoTo = function(step) {
        _origGo.apply(this, arguments);
        try {
          var bar = document.querySelector('.wz-progress-bar');
          if (bar) {
            bar.classList.remove('is-pulse');
            void bar.offsetWidth;
            bar.classList.add('is-pulse');
          }
        } catch (_) {}
      };
    }
  } catch (e) { console.warn('milestone/pulse hooks skipped:', e); }

  // Signal that async bootstrap is complete — hash restore waits for this
  window._htBootstrapDone = true;
  document.dispatchEvent(new Event('ht:bootstrap-done'));
})();

// ── Step-init orchestration ───────────────────────
// Called from DOMContentLoaded after all event handlers are wired.
// initStep1-6 create dynamic options/chips; reapplyDynamicFields re-applies DB values;
// career_goal prefill runs after Step 4 rows exist.
function _htRunStepInits() {
  // CV upload initialization
  initCVUpload();

  // ══ STEP INITS ══
  initStep1();
  initStep2();
  initStep3();
  initStep4();
  initStep5();

  // Step 6 CV upload wire-up (wizard CV input → existing uploadCV)
  var wizCvInput = document.getElementById('wiz-cv-input');
  if (wizCvInput) {
    wizCvInput.addEventListener('change', function() {
      if (wizCvInput.files[0] && typeof uploadCV === 'function') {
        uploadCV(wizCvInput.files[0]);
        // Update wizard CV zone visual
        var emptyZone = document.getElementById('wiz-cv-empty');
        var uploadedZone = document.getElementById('wiz-cv-uploaded');
        var fnameEl = document.getElementById('wiz-cv-filename');
        if (emptyZone) emptyZone.style.display = 'none';
        if (uploadedZone) uploadedZone.style.display = '';
        if (fnameEl) fnameEl.textContent = wizCvInput.files[0].name;
      }
    });
  }
  var wizCvRemove = document.getElementById('wiz-cv-remove');
  if (wizCvRemove) {
    wizCvRemove.addEventListener('click', function() {
      var emptyZone = document.getElementById('wiz-cv-empty');
      var uploadedZone = document.getElementById('wiz-cv-uploaded');
      if (emptyZone) emptyZone.style.display = '';
      if (uploadedZone) uploadedZone.style.display = 'none';
      var wizInput = document.getElementById('wiz-cv-input');
      if (wizInput) wizInput.value = '';
    });
  }
  // Bio character counter
  var bioTa = document.getElementById('f-bio');
  var bioCount = document.getElementById('bio-char-count');
  if (bioTa && bioCount) {
    var _bioEngPattern = /\b(the|and|with|for|team|management|experience|store|sales|customer|retail|manager|lead|drive|deliver)\b/i;
    var bioTransBtn = document.getElementById('btn-bio-translate');
    var _bioInputHandler = function() {
      var len = bioTa.value.length;
      bioCount.textContent = len + ' / 1000';
      bioCount.style.color = len > 1000 ? 'var(--verm)' : 'var(--muted)';
      if (len > 1000) bioTa.value = bioTa.value.substring(0, 1000);
      // Show translate button only when English text detected
      if (bioTransBtn) {
        var txt = bioTa.value || '';
        bioTransBtn.style.display = (_bioEngPattern.test(txt) && txt.length > 20) ? '' : 'none';
      }
    }
    bioTa.addEventListener('input', _bioInputHandler);
    bioTa.addEventListener('paste', function() { setTimeout(_bioInputHandler, 50); });
    bioTa.addEventListener('change', _bioInputHandler);
    // Run once on init in case bio was pre-filled from DB
    if (bioTa.value) _bioInputHandler();
  }

  // Restore CV state in wizard if already uploaded
  if (_loadedDBData && _loadedDBData.profile && _loadedDBData.profile.cv_filename) {
    var emptyZone = document.getElementById('wiz-cv-empty');
    var uploadedZone = document.getElementById('wiz-cv-uploaded');
    var fnameEl = document.getElementById('wiz-cv-filename');
    if (emptyZone) emptyZone.style.display = 'none';
    if (uploadedZone) uploadedZone.style.display = '';
    if (fnameEl) fnameEl.textContent = _loadedDBData.profile.cv_filename;
  }

  initStep6();

  // Re-apply DB values to selects/chips that were just created by initStep1/4/5.
  // Covers the race where applyDraft ran before these options/chips existed.
  reapplyDynamicFields();
  // Re-run merkez cards now that all form fields are populated from DB
  updateMerkezCards();
  // Apply ?career_goal= prefill now that Step 4 rows exist
  _htApplyCareerGoalPrefill();
  if (typeof applyAllVisibilityMirrorsFromProfile === 'function' && _loadedDBData && _loadedDBData.profile) {
    applyAllVisibilityMirrorsFromProfile();
  }
  console.timeEnd('[HT] total-load'); // eslint-disable-line no-console
}
