/* global _htCloseAllPopups:writable, _htPopulateAvatarDropdown:writable, _htRunStepInits, applyDraft, clearDraft, closeProfilePreview, closeTgToast, closeMobileSidebar, generateCV, ht_track, initThemeFromStorage, loadDraft, openProfilePreview, pendingPanelSwitch, renderSelectedCities, returnToPanel, saveProfileRPC, supabase, switchPanel, titleCaseTR, toggleMobileSidebar, wizBack, wizGoTo, wizNext, wizStep, wizardDirty */
// ═══════════════════════════════════════════════════
// PROFIL EVENTS — DOMContentLoaded event wiring, page glue
// Extracted from profil.html inline scripts.
// Must load AFTER profil-bootstrap.js (last external before this).
// ═══════════════════════════════════════════════════

// DOMContentLoaded may have already fired by the time this file loads (position 20 in script order).
// Use readyState check to handle both cases.
function _htInitEvents() {
  // PostHog: profile page viewed
  ht_track('profile_page_viewed');

  // Theme: initialize from localStorage / system, then sync toggle buttons
  initThemeFromStorage();
  if (window.syncThemeToggleButtons) window.syncThemeToggleButtons();

  // Sidebar/header/bento nav clicks handled by document-level [data-panel] delegation.
  // Only elements WITHOUT data-panel need direct bindings:

  // Logo → Genel Bakış (no data-panel attr)
  var logoBtn = document.getElementById('btn-logo-home');
  if (logoBtn) logoBtn.addEventListener('click', function() { switchPanel('genel'); });

  // Kim Baktı header icon (no data-panel attr)
  var kbBtn = document.getElementById('header-kimbakti');
  if (kbBtn) kbBtn.addEventListener('click', function() { switchPanel('kimbakti'); });

  // mk-card clicks — card itself OR edit button inside it
  document.querySelectorAll('.mk-card[data-step]').forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var step = parseInt(this.dataset.step);
      if (step) window.editSection(step);
    });
  });
  document.querySelectorAll('.mk-edit-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var card = this.closest('.mk-card[data-step]');
      if (card) {
        var step = parseInt(card.dataset.step);
        if (step) window.editSection(step);
      }
    });
  });

  // Profile preview & toast
  var ppOverlay = document.getElementById('pp-overlay');
  var ppClose = document.getElementById('btn-close-preview');
  var ppOpen = document.getElementById('btn-preview-profile');
  if (ppOverlay) ppOverlay.addEventListener('click', function() { if (typeof closeProfilePreview === 'function') closeProfilePreview(); });
  if (ppClose) ppClose.addEventListener('click', function() { if (typeof closeProfilePreview === 'function') closeProfilePreview(); });
  if (ppOpen) ppOpen.addEventListener('click', function() { if (typeof openProfilePreview === 'function') openProfilePreview(); });
  var toastClose = document.getElementById('btn-close-toast');
  if (toastClose) toastClose.addEventListener('click', function() { if (typeof closeTgToast === 'function') closeTgToast(); });

  // ── Command Palette (Cmd+K / Ctrl+K) ──
  var cmdkItems = [
    { label: 'Genel Bak\u0131\u015F', panel: 'genel', icon: '\uD83D\uDCCA' },
    { label: 'Profil Merkezi', panel: 'merkez', icon: '\uD83D\uDCCB' },
    { label: 'Markalar', panel: 'sirketler', icon: '\uD83C\uDFE2' },
    { label: '\u00D6zel Teklifler', panel: 'teklifler', icon: '\uD83C\uDF81' },
    { label: 'Mesajlar', panel: 'inbox', icon: '\u2709\uFE0F' },
    { label: 'Bildirimler', panel: 'bildirimler', icon: '\uD83D\uDD14' },
    { label: 'Ayarlar', panel: 'ayarlar', icon: '\u2699\uFE0F' },
    { label: 'Profil D\u00FCzenle', panel: 'profil', icon: '\u270F\uFE0F' },
    { label: 'St\u00fcdyo', panel: 'mulakat', icon: '\uD83D\uDCDA' },
    { label: 'Destek Merkezi', panel: 'destek', icon: '\u2753' }
  ];
  var cmdkOverlay = document.getElementById('modal-cmdk');
  var cmdkInput = document.getElementById('cmdk-input');
  var cmdkResults = document.getElementById('cmdk-results');

  function openCmdk() {
    if (!cmdkOverlay) return;
    cmdkOverlay.style.display = 'flex';
    cmdkInput.value = '';
    renderCmdkResults('');
    setTimeout(function() { cmdkInput.focus(); }, 50);
  }
  function closeCmdk() {
    if (cmdkOverlay) cmdkOverlay.style.display = 'none';
  }
  function renderCmdkResults(query) {
    while (cmdkResults.firstChild) cmdkResults.removeChild(cmdkResults.firstChild);
    var q = query.toLowerCase().replace(/\u0131/g, 'i').replace(/\u00fc/g, 'u').replace(/\u00f6/g, 'o').replace(/\u015f/g, 's').replace(/\u00e7/g, 'c').replace(/\u011f/g, 'g');
    var filtered = cmdkItems.filter(function(item) {
      var normalized = item.label.toLowerCase().replace(/\u0131/g, 'i').replace(/\u00fc/g, 'u').replace(/\u00f6/g, 'o').replace(/\u015f/g, 's').replace(/\u00e7/g, 'c').replace(/\u011f/g, 'g');
      return !q || normalized.indexOf(q) > -1;
    });
    filtered.forEach(function(item) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .15s;';
      row.addEventListener('mouseenter', function() { this.style.background = 'var(--bg-elevated, #F3F4F6)'; });
      row.addEventListener('mouseleave', function() { this.style.background = 'transparent'; });
      var iconEl = document.createElement('span');
      iconEl.style.cssText = 'font-size:18px;flex-shrink:0;width:28px;text-align:center;';
      iconEl.textContent = item.icon;
      var labelEl = document.createElement('span');
      labelEl.style.cssText = 'font-size:14px;font-weight:500;color:var(--text);';
      labelEl.textContent = item.label;
      row.appendChild(iconEl);
      row.appendChild(labelEl);
      row.addEventListener('click', function() {
        closeCmdk();
        switchPanel(item.panel);
      });
      cmdkResults.appendChild(row);
    });
    if (filtered.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:20px;text-align:center;color:var(--text-muted);font-size:13px;';
      empty.textContent = 'Sonu\u00E7 bulunamad\u0131';
      cmdkResults.appendChild(empty);
    }
  }

  if (cmdkInput) {
    cmdkInput.addEventListener('input', function() { renderCmdkResults(this.value); });
    cmdkInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeCmdk();
      if (e.key === 'Enter') {
        var first = cmdkResults.querySelector('div[style]');
        if (first) first.click();
      }
    });
  }
  if (cmdkOverlay) {
    cmdkOverlay.addEventListener('click', function(e) {
      if (e.target === cmdkOverlay) closeCmdk();
    });
  }

  // Keyboard shortcut: Cmd+K / Ctrl+K + ESC closes modals
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (cmdkOverlay && cmdkOverlay.style.display === 'flex') closeCmdk();
      else openCmdk();
    }
    if (e.key === 'Escape') {
      var openModals = document.querySelectorAll('.modal-overlay.show, .lok-modal-overlay.show');
      for (var i = 0; i < openModals.length; i++) {
        openModals[i].classList.remove('show');
      }
      closeCmdk();
    }
  });

  // Bottom nav clicks
  document.querySelectorAll('.bn-item').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var panel = this.dataset.panel;
      if (panel) switchPanel(panel);
    });
  });

  // ── Avatar dropdown ──
  (function() {
    // One-time migration: remove stale key written by old theme toggle code
    try { localStorage.removeItem('ht-theme'); } catch(e) {}

    var avatarBtn = document.getElementById('header-avatar-wrap');
    var dropdown = document.getElementById('avatar-dropdown');
    if (!avatarBtn || !dropdown) return;

    avatarBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var isOpen = dropdown.style.display !== 'none';
      if (window._htCloseAllPopups) window._htCloseAllPopups();
      dropdown.style.display = isOpen ? 'none' : '';
    });

    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target) && e.target !== avatarBtn && !avatarBtn.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    var origClose = window._htCloseAllPopups;
    window._htCloseAllPopups = function() {
      if (origClose) origClose();
      dropdown.style.display = 'none';
    };

    window._htPopulateAvatarDropdown = function(name, email, avatarUrl) {
      var avdName = document.getElementById('avd-user-name');
      var avdAvatar = document.getElementById('avd-avatar-img');
      if (avdName && name) avdName.textContent = typeof titleCaseTR === 'function' ? titleCaseTR(name) : name;
      if (avdAvatar && avatarUrl) {
        avdAvatar.textContent = '';
        var img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = name || '';
        avdAvatar.appendChild(img);
      }
    };

    var themeCheckbox = document.getElementById('avd-theme-checkbox');
    if (themeCheckbox) {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeCheckbox.checked = isDark;
      themeCheckbox.addEventListener('change', function() {
        var newTheme = this.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        if (typeof window.setThemePreference === 'function') window.setThemePreference(newTheme);
        if (window.syncThemeToggleButtons) window.syncThemeToggleButtons();
      });
      var observer = new MutationObserver(function() {
        themeCheckbox.checked = document.documentElement.getAttribute('data-theme') === 'dark';
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    var premBtn = document.getElementById('avd-premium-btn');
    if (premBtn) premBtn.addEventListener('click', function() {
      dropdown.style.display = 'none';
      if (typeof switchPanel === 'function') switchPanel('premium');
    });

    var logoutBtn = document.getElementById('avd-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', function() {
      dropdown.style.display = 'none';
      if (typeof supabase !== 'undefined') {
        supabase.auth.signOut().then(function() {
          window.location.href = 'giris.html';
        });
      }
    });
  })();

  // Mobile sidebar
  var mobileBtn = document.getElementById('mobile-sidebar-btn');
  if (mobileBtn) mobileBtn.addEventListener('click', toggleMobileSidebar);
  var sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Wizard nav
  var btnBack = document.getElementById('btn-wiz-back');
  var btnNext = document.getElementById('btn-wiz-next');
  if (btnBack) btnBack.addEventListener('click', wizBack);
  if (btnNext) btnNext.addEventListener('click', wizNext);

  // Progress bar step clicks
  document.querySelectorAll('.wiz-progress-step').forEach(function(stepEl) {
    stepEl.addEventListener('click', function() {
      var target = parseInt(this.dataset.wstep);
      if (target <= wizStep) wizGoTo(target);
    });
  });

  // Global premium CTA delegation
  document.addEventListener('click', function(e) {
    var t = e.target;
    var premiumHost = t.closest && t.closest('[data-premium-cta]');
    if (premiumHost) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof switchPanel === 'function') switchPanel('premium');
      var premOv = premiumHost.closest('.modal-overlay');
      if (premOv) premOv.style.display = 'none';
      return;
    }
    if (t.classList.contains('ls-premium-cta') ||
        t.classList.contains('ig-q-lock-cta') ||
        t.classList.contains('tk-lock-btn') ||
        t.classList.contains('kb-premium-btn')) {
      e.preventDefault();
      e.stopPropagation();
      switchPanel('premium');
    }
  });

  // Hash restore is deferred to the end of DOMContentLoaded — see below

  // Dashboard buttons
  var btnStart = document.getElementById('btn-start-wizard');
  if (btnStart) btnStart.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.editSection(1); });
  var btnEdit = document.getElementById('btn-edit-profile');
  if (btnEdit) btnEdit.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.editSection(1); });

  // Wizard complete button
  var btnComplete = document.getElementById('btn-wiz-complete');
  if (btnComplete) btnComplete.addEventListener('click', function() { saveProfileRPC(); });

  // Kaydet ve Çık — save from any step and return to merkez
  // NOTE: saveExitLabel contains a static SVG icon — safe, no user data
  var btnSaveExit = document.getElementById('btn-wiz-save-exit');
  var saveExitLabel = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Kaydet ve \u00C7\u0131k';  if (btnSaveExit) {
    btnSaveExit.addEventListener('click', function() {
      btnSaveExit.disabled = true;
      btnSaveExit.textContent = 'Kaydediliyor...';
      saveProfileRPC(function() {
        wizardDirty = false;
        switchPanel('merkez');
      }).finally(function() {
        btnSaveExit.disabled = false;
        btnSaveExit.innerHTML = saveExitLabel;
      });
    });
  }

  // Retry button
  var btnRetry = document.getElementById('btn-retry');
  if (btnRetry) btnRetry.addEventListener('click', function() {
    document.getElementById('modal-error').classList.remove('show');
    saveProfileRPC();
  });

  // CV generation buttons
  var btnGenCVDash = document.getElementById('btn-gen-cv');
  if (btnGenCVDash) btnGenCVDash.addEventListener('click', generateCV);
  var btnGenCVMerkez = document.getElementById('btn-generate-cv-merkez');
  if (btnGenCVMerkez) btnGenCVMerkez.addEventListener('click', function() { generateCV(); });

  // AI CV Optimize button (premium) — source-aware
  var btnAiCV = document.getElementById('btn-ai-cv-optimize');
  if (btnAiCV) {
    /* Dynamic label based on CV availability */
    var _db = typeof window._loadedDBData !== 'undefined' ? window._loadedDBData : null;
    var hasUploadedCV = _db && _db.profile && _db.profile.cv_url;
    var aiSubEl = btnAiCV.parentElement ? btnAiCV.parentElement.querySelector('.mk-ai-sub') : null;
    if (aiSubEl) aiSubEl.textContent = hasUploadedCV ? 'CV\'ni + profilini AI ile g\u00fc\u00e7lendir' : 'Profilini AI ile g\u00fc\u00e7lendir';

    btnAiCV.addEventListener('click', function() {
      /* Premium gate */
      var _dbClick = typeof window._loadedDBData !== 'undefined' ? window._loadedDBData : null;
      var isPremium = _dbClick && _dbClick.profile && _dbClick.profile.is_premium === true;
      if (!isPremium) {
        if (typeof window.switchPanel === 'function') window.switchPanel('premium');
        return;
      }
      /* AI flow */
      btnAiCV.disabled = true;
      btnAiCV.textContent = 'Optimize ediliyor\u2026';
      var cvData = typeof window.normalizeCVData === 'function' ? window.normalizeCVData() : {};
      window.requestCVOptimize(cvData).then(function(result) {
        btnAiCV.disabled = false;
        btnAiCV.textContent = 'Optimize Edildi \u2713';
        btnAiCV.style.background = 'var(--green, #059669)';

        /* Source feedback toast */
        var sourceMsg = '';
        if (result.sourceUsed === 'profile_and_cv') sourceMsg = 'Profil + y\u00fckl\u00fc CV kullan\u0131larak optimize edildi';
        else if (result.sourceUsed === 'profile_fallback') sourceMsg = 'CV okunamad\u0131, profil verisiyle optimize edildi';
        else sourceMsg = 'Profil verisiyle optimize edildi';
        if (typeof window.showToast === 'function') window.showToast(sourceMsg, 'success');

        /* Generate with AI-optimized content */
        generateCV(result);
      }).catch(function(err) {
        btnAiCV.disabled = false;
        btnAiCV.textContent = 'Tekrar Dene';
        btnAiCV.style.background = 'var(--verm, #C94E28)';
        console.error('[HT] AI CV optimize error:', err.message);
        if (typeof window.showToast === 'function') window.showToast('AI optimizasyonu ba\u015far\u0131s\u0131z: ' + err.message, 'error');
      });
    });
  }

  // Draft resume button
  var btnDraftResume = document.getElementById('btn-draft-resume');
  if (btnDraftResume) btnDraftResume.addEventListener('click', function() {
    var draft = loadDraft();
    if (draft) applyDraft(draft);
    document.getElementById('modal-draft').classList.remove('show');
    returnToPanel = 'merkez';
    switchPanel('profil');
  });

  // Sign out
  var btnSignout = document.getElementById('btn-signout');
  if (btnSignout) btnSignout.addEventListener('click', async function() {
    await supabase.auth.signOut();
    window.location.href = 'giris.html';
  });

  // Modal close buttons
  var btnSuccessOk = document.getElementById('btn-success-ok');
  if (btnSuccessOk) btnSuccessOk.addEventListener('click', function() {
    document.getElementById('modal-success').classList.remove('show');
    var dest = returnToPanel || 'genel';
    returnToPanel = null;
    switchPanel(dest);
  });
  var btnErrorClose = document.getElementById('btn-error-close');
  if (btnErrorClose) btnErrorClose.addEventListener('click', function() {
    document.getElementById('modal-error').classList.remove('show');
  });
  var btnDraftDiscard = document.getElementById('btn-draft-discard');
  if (btnDraftDiscard) btnDraftDiscard.addEventListener('click', function() {
    clearDraft();
    document.getElementById('modal-draft').classList.remove('show');
  });

  // Wizard exit confirmation modal
  var btnWizardStay = document.getElementById('btn-wizard-stay');
  if (btnWizardStay) btnWizardStay.addEventListener('click', function() {
    document.getElementById('modal-wizard-exit').classList.remove('show');
    pendingPanelSwitch = null;
  });
  var btnWizardLeave = document.getElementById('btn-wizard-leave');
  if (btnWizardLeave) btnWizardLeave.addEventListener('click', function() {
    document.getElementById('modal-wizard-exit').classList.remove('show');
    wizardDirty = false;
    clearDraft();
    if (pendingPanelSwitch) {
      var dest = pendingPanelSwitch;
      pendingPanelSwitch = null;
      switchPanel(dest);
    }
  });

  // Step inits, reapply, career_goal prefill, visibility mirrors, load timer
  _htRunStepInits();

  // Location modal
  var btnLokClose = document.getElementById('btn-lok-close');
  if (btnLokClose) btnLokClose.addEventListener('click', function() {
    document.getElementById('lok-modal-overlay').classList.remove('show');
  });
  var btnLokDone = document.getElementById('btn-lok-done');
  if (btnLokDone) btnLokDone.addEventListener('click', function() {
    document.getElementById('lok-modal-overlay').classList.remove('show');
    renderSelectedCities();
  });
  var lokOverlay = document.getElementById('lok-modal-overlay');
  if (lokOverlay) lokOverlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });

  // ── Hash restore — must run AFTER _htRunStepInits and all wiring ──
  // Waits for bootstrap-done so async data load doesn't override the panel.
  var hashPanel = window.location.hash.replace('#', '');
  if (hashPanel && document.getElementById('panel-' + hashPanel)) {
    var _applyHash = function() { switchPanel(hashPanel); };
    if (window._htBootstrapDone) {
      // Bootstrap already done — use setTimeout(0) to yield after any pending microtasks
      setTimeout(_applyHash, 0);
    } else {
      document.addEventListener('ht:bootstrap-done', function() {
        setTimeout(_applyHash, 0);
      }, { once: true });
    }
  }
}

// Fire immediately if DOM already ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _htInitEvents);
} else {
  _htInitEvents();
}
