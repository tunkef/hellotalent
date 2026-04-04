/* global _loadedDBData, _initBrandCompanyLookup, addTargetRoleRow, applyAllVisibilityMirrorsFromProfile, applyDraft, canonicalizeRole, currentCVStoragePath, currentUser, getProfilAuthSession, ht_track, initCVUpload, initStep1, initStep2, initStep3, initStep4, initStep5, initStep6, loadDraft, loadProfileFromDB, loadViewersCard, populateIlceSelect, RETAIL_POSITIONS, selectedCalismaTipleri, selectedCareerTypes, selectedMusaitlik, selectedSegmentler, setAvatarImage, setVal, showCVUploaded, STORAGE, supabase, syncAccountEmail, titleCaseTR, trLower, updateCityChipStates, updateCompletionUI, updateDashboardSummary, updateMerkezCards */
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
    setVal('f-dogumyili', db.profile.dogum_yili);
    setVal('f-adresil', db.profile.adres_il);
    if (db.profile.adres_il) {
      populateIlceSelect('f-adresilce', db.profile.adres_il);
      setVal('f-adresilce', db.profile.adres_ilce);
    }
  }

  // Step 4 selects + chips (options/chips created by initStep4)
  if (db.work_prefs) {
    var wp = db.work_prefs;
    // Müsaitlik chips
    if (wp.musaitlik) {
      selectedMusaitlik = wp.musaitlik;
      document.querySelectorAll('#musaitlik-chips .chip').forEach(function(c) {
        c.classList.toggle('selected', c.textContent === wp.musaitlik);
      });
    }
    // Calisma tipleri check-item buttons
    if (wp.calisma_tipleri && wp.calisma_tipleri.length > 0) {
      selectedCalismaTipleri = wp.calisma_tipleri.slice();
      document.querySelectorAll('#calisma-tipleri-checks .check-item').forEach(function(btn) {
        btn.classList.toggle('checked', wp.calisma_tipleri.indexOf(btn.textContent) !== -1);
      });
    }
    // Segment chips
    if (wp.tercih_segmentler && wp.tercih_segmentler.length > 0) {
      document.querySelectorAll('#segment-chips .chip').forEach(function(c) {
        c.classList.toggle('selected', wp.tercih_segmentler.indexOf(c.textContent) !== -1);
      });
    }
    // Career type check-item buttons
    if (wp.career_type) {
      var types = typeof wp.career_type === 'string' ? wp.career_type.split(',') : [];
      // Legacy normalization: lider→yukari, single-select
      var _ctNorm = null;
      for (var _cti = 0; _cti < types.length; _cti++) {
        if (types[_cti] === 'yukari' || types[_cti] === 'lider') { _ctNorm = 'yukari'; break; }
        if (types[_cti] === 'yatay') { _ctNorm = 'yatay'; }
      }
      selectedCareerTypes = _ctNorm ? [_ctNorm] : [];
      document.querySelectorAll('#career-type-checks .check-item').forEach(function(btn) {
        btn.classList.toggle('checked', selectedCareerTypes.indexOf(btn.dataset.value) !== -1);
      });
    }
    // Travel willingness
    if (wp.travel_willingness) {
      setVal('f-seyahat', wp.travel_willingness);
    }
  }

  // Step 5 city chip visual state (chips created by initStep5)
  updateCityChipStates();
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
  var _loadStart = Date.now();
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
  if (currentUser.user_metadata && currentUser.user_metadata.role === 'employer') {
    window.location.href = 'ik.html';
    return;
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
    if (dbData.profile && dbData.profile.avatar_url) setAvatarImage(dbData.profile.avatar_url);
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
      showCVUploaded(dbData.profile.cv_url, new Date(dbData.profile.cv_uploaded_at || Date.now()));
      // Reconstruct storage path from URL for cleanup tracking
      try {
        currentCVStoragePath = STORAGE.extractStoragePath(dbData.profile.cv_url);
      } catch (e) {}
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
    // ── Final DOM state snapshot ──
    setTimeout(function() {
      var ec = document.getElementById('exp-cards-container');
      var lc = document.getElementById('lang-rows-container');
      var edc = document.getElementById('edu-rows-container');
      var activePanel = document.querySelector('.panel.active');
      if (ec && ec.children.length) {
        var c = ec.children[0];
        var s = c.querySelector('input[id$="-sirket"]');
        var p = c.querySelector('input[id$="-pozisyon"]');
        var dep = c.querySelector('select[id$="-departman"]');
        var seg = c.querySelector('select[id$="-segment"]');
        var ist = c.querySelector('select[id$="-istihdam"]');
        var bay = c.querySelector('select[id$="-basay"]');
      }
      if (lc && lc.children.length) {
        var lr = lc.children[0];
        var dil = lr.querySelector('select[id$="-dil"]');
        var sev = lr.querySelector('select[id$="-seviye"]');
      }
      if (edc && edc.children.length) {
        var er = edc.children[0];
        var sev2 = er.querySelector('select[id$="-seviye"]');
        var okul = er.querySelector('input[id$="-okul"]');
      }
    }, 500);
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
  initStep6();

  // Re-apply DB values to selects/chips that were just created by initStep1/4/5.
  // Covers the race where applyDraft ran before these options/chips existed.
  reapplyDynamicFields();
  // Apply ?career_goal= prefill now that Step 4 rows exist
  _htApplyCareerGoalPrefill();
  if (typeof applyAllVisibilityMirrorsFromProfile === 'function' && _loadedDBData && _loadedDBData.profile) {
    applyAllVisibilityMirrorsFromProfile();
  }
  console.timeEnd('[HT] total-load'); // eslint-disable-line no-console
}
