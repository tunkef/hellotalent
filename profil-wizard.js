/* global _loadedDBData, applyAllVisibilityMirrorsFromProfile, getCurrentEmployerDisplayFromExperiences, ht_track, loadSirketlerPanel, saveDraft, selectedMusaitlik, setVal, syncAccountEmail, updateCompletionUI, updateMerkezCards, updateStep6HideState, val */
// ═══════════════════════════════════════════════════
// PROFIL WIZARD — state machine, validation, panel switching, mobile sidebar
// Extracted from profil.html inline scripts.
// Depends on: profil-core.js (val, ht_track), profil-ui.js (updateStep6HideState,
//   loadSirketlerPanel), profil-draft.js (saveDraft, setVal),
//   profil-summary.js (updateMerkezCards, updateCompletionUI),
//   profil-visibility.js (applyAllVisibilityMirrorsFromProfile).
// Must load BEFORE profil-draft.js (draft reads/writes wizStep, calls renderWizard).
// ═══════════════════════════════════════════════════

// ── WIZARD STATE ──────────────────────────────────
var wizStep = 1;
var TOTAL_STEPS = 6;

function wizGoTo(step) {
  if (step < 1 || step > TOTAL_STEPS) return;
  // Validate current step before moving forward
  if (step > wizStep && !validateStep(wizStep)) return;
  // Save draft on forward move
  if (step > wizStep) saveDraft();
  wizStep = step;
  renderWizard();
  ht_track('wizard_step_reached', { step: step });
}

function wizNext() { if (wizStep < TOTAL_STEPS) wizGoTo(wizStep + 1); }
function wizBack() { if (wizStep > 1) wizGoTo(wizStep - 1); }

function renderWizard() {
  // Update progress bar
  for (var i = 1; i <= TOTAL_STEPS; i++) {
    var stepEl = document.querySelector('.wiz-progress-step[data-wstep="' + i + '"]');
    var lineEl = document.querySelector('.wiz-progress-line[data-wline="' + i + '"]');
    if (stepEl) {
      stepEl.classList.remove('active', 'done');
      if (i === wizStep) stepEl.classList.add('active');
      else if (i < wizStep) stepEl.classList.add('done');
    }
    if (lineEl) {
      lineEl.classList.remove('done');
      if (i < wizStep) lineEl.classList.add('done');
    }
  }
  // Show/hide step containers
  for (var j = 1; j <= TOTAL_STEPS; j++) {
    var ws = document.getElementById('wiz-step-' + j);
    if (ws) {
      ws.classList.remove('active');
      if (j === wizStep) ws.classList.add('active');
    }
  }
  // Update nav buttons
  var btnBack = document.getElementById('btn-wiz-back');
  var btnNext = document.getElementById('btn-wiz-next');
  var btnComplete = document.getElementById('btn-wiz-complete');
  if (btnBack) btnBack.style.display = wizStep > 1 ? '' : 'none';
  if (btnNext) btnNext.style.display = wizStep < TOTAL_STEPS ? '' : 'none';
  if (btnComplete) btnComplete.style.display = wizStep === TOTAL_STEPS ? '' : 'none';
  var progStep = document.getElementById('wiz-current-step');
  if (progStep) progStep.textContent = wizStep;
  // Scroll to top of wizard
  var wizPanel = document.getElementById('panel-profil');
  if (wizPanel) wizPanel.scrollTop = 0;
  window.scrollTo({top: 0, behavior: 'smooth'});
  // Refresh Step 6 employer state when entering that step
  if (wizStep === 6) updateStep6HideState();
}

// ── STEP VALIDATION ───────────────────────────────
function validateStep(step) {
  clearStepErrors();
  if (step === 6) return true;
  switch(step) {
    case 1: return validateKisisel();
    case 2: return validateKariyer();
    case 3: return validateEgitim();
    case 4: return validateTercihler();
    case 5: return validateLokasyon();
    default: return true;
  }
}

function validateKisisel() {
  var errors = [];
  if (!val('f-adsoyad')) errors.push('Ad Soyad zorunludur');
  if (!val('f-telefon')) errors.push('Telefon zorunludur');
  if (!val('f-adresil')) errors.push('Adres / İl zorunludur');
  // LinkedIn format validation (optional field, but if filled must be valid)
  var li = val('f-linkedin');
  if (li && !/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/i.test(li)) {
    errors.push('LinkedIn URL formatı geçersiz. Örnek: https://linkedin.com/in/adiniz');
    markFieldError('f-linkedin');
  }
  if (errors.length > 0) {
    showStepErrors(errors);
    if (!val('f-adsoyad')) markFieldError('f-adsoyad');
    if (!val('f-telefon')) markFieldError('f-telefon');
    if (!val('f-adresil')) markFieldError('f-adresil');
    return false;
  }
  return true;
}

function markFieldError(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('field-error');
}
function validateKariyer() {
  var cbNoExp = document.getElementById('cb-no-experience');
  if (cbNoExp && cbNoExp.checked) return true;
  var cards = document.querySelectorAll('.exp-card');
  if (cards.length === 0) {
    showStepErrors(['En az bir deneyim ekleyin veya "Henüz iş deneyimim yok" seçin']);
    return false;
  }
  var errors = [];
  cards.forEach(function(card, i) {
    var prefix = card.id + '-';
    var num = i + 1;
    if (!val(prefix + 'sirket')) errors.push('Deneyim #' + num + ': \u015Eirket zorunludur');
    var pozSecVal = val(prefix + 'unvan-sec');
    var pozVal = (pozSecVal === '__custom__') ? val(prefix + 'unvan-custom') : (pozSecVal || val(prefix + 'unvan-custom'));
    if (!pozVal) errors.push('Deneyim #' + num + ': Pozisyon zorunludur');
    if (!val(prefix + 'basyil')) errors.push('Deneyim #' + num + ': Ba\u015Flang\u0131\u00E7 y\u0131l\u0131 zorunludur');
  });
  if (errors.length > 0) { showStepErrors(errors); return false; }
  return true;
}
function validateEgitim() { return true; }
function validateTercihler() {
  var errors = [];
  if (typeof selectedMusaitlik === 'undefined' || !selectedMusaitlik) {
    errors.push('Müsaitlik alanı zorunludur. Yeni bir işe ne kadar sürede başlayabileceğini seç.');
    var chipsRow = document.getElementById('musaitlik-chips');
    if (chipsRow) chipsRow.classList.add('field-error');
  }
  if (errors.length > 0) { showStepErrors(errors); return false; }
  return true;
}
function validateLokasyon() { return true; }

function showStepErrors(errors) {
  clearStepErrors();
  var activeStep = document.getElementById('wiz-step-' + wizStep);
  if (!activeStep || errors.length === 0) return;
  var wrap = document.createElement('div');
  wrap.className = 'step-errors';
  wrap.id = 'step-errors-box';
  var title = document.createElement('div');
  title.className = 'step-errors-title';
  title.textContent = 'Eksik alanlar:';
  wrap.appendChild(title);
  var ul = document.createElement('ul');
  ul.className = 'step-errors-list';
  errors.forEach(function(msg) {
    var li = document.createElement('li');
    li.textContent = msg;
    ul.appendChild(li);
  });
  wrap.appendChild(ul);
  var content = activeStep.querySelector('[id^="step"]') || activeStep;
  activeStep.insertBefore(wrap, content);
}

function clearStepErrors() {
  var box = document.getElementById('step-errors-box');
  if (box) box.remove();
  document.querySelectorAll('.field-error').forEach(function(el) {
    el.classList.remove('field-error');
  });
}

// ── PANEL SWITCHING ───────────────────────────────
var wizardDirty = false;
var pendingPanelSwitch = null;

function markWizardDirty() { wizardDirty = true; }

function attachWizardDirtyListeners() {
  var wizPanel = document.getElementById('panel-profil');
  if (!wizPanel) return;
  wizPanel.querySelectorAll('input, select, textarea').forEach(function(el) {
    el.addEventListener('input', markWizardDirty);
    el.addEventListener('change', markWizardDirty);
  });
}

function switchPanel(name) {
  // Guard: if leaving wizard with unsaved changes, show confirmation
  var currentPanel = document.querySelector('.panel.active');
  if (currentPanel && currentPanel.id === 'panel-profil' && wizardDirty && name !== 'profil') {
    pendingPanelSwitch = name;
    document.getElementById('modal-wizard-exit').classList.add('show');
    return;
  }
  // Normalize legacy panel aliases before switching
  var effectiveName = (name === 'yetkinlik') ? 'mulakat' : name;
  _doSwitchPanel(effectiveName);
  // Persist active panel in URL hash
  if (effectiveName && effectiveName !== 'genel') {
    history.replaceState(null, '', '#' + effectiveName);
  } else {
    history.replaceState(null, '', window.location.pathname);
  }
}

function _doSwitchPanel(name) {
  wizardDirty = false;
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  var target = document.getElementById('panel-' + name);
  if (target) target.classList.add('active');
  var bc = document.getElementById('breadcrumb-current');
  if (bc) {
    var labels = { genel: 'Genel Bakış', merkez: 'Profil Merkezi', sirketler: 'Markalar', teklifler: 'Özel Teklifler', inbox: 'Mesajlar', bildirimler: 'Bildirimler', ayarlar: 'Ayarlar', profil: 'Profil', yetkinlik: 'Mülakat Koçu', mulakat: 'Mülakat Koçu', premium: 'Premium', kimbakti: 'Kim Baktı' };
    bc.textContent = labels[name] || name;
  }
  // Update sidebar nav
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.panel === name) btn.classList.add('active');
  });
  // Update header nav
  document.querySelectorAll('.header-nav .hn-item').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.panel === name) btn.classList.add('active');
  });
  // Update bottom nav
  document.querySelectorAll('.bn-item').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.panel === name) btn.classList.add('active');
  });
  // Refresh Genel home when returning to it (picks up profile/settings changes)
  if (name === 'genel') { window._htRefreshGenelHome && window._htRefreshGenelHome(); }
  // Refresh Profil Merkezi cards when switching to it
  if (name === 'merkez') {
    updateMerkezCards();
    updateCompletionUI();
    if (typeof applyAllVisibilityMirrorsFromProfile === 'function') applyAllVisibilityMirrorsFromProfile();
    ht_track('merkez_viewed');
  }
  // Lazy-load Şirketler data on first visit
  if (name === 'sirketler') { loadSirketlerPanel(); }
  // Lazy-load Teklifler data on first visit
  if (name === 'teklifler') { window._htLoadTeklifler && window._htLoadTeklifler(); }
  // Lazy-load Inbox messages on first visit
  if (name === 'inbox') { window._htLoadInbox && window._htLoadInbox(); }
  // Note: yetkinlik → mulakat normalization handled in switchPanel() before this is called
  // Lazy-load Mulakat panel on first visit (also load yetkinlik bridge data)
  if (name === 'mulakat') { window._htLoadYetkinlik && window._htLoadYetkinlik(); window._htLoadMulakat && window._htLoadMulakat(); }
  // Lazy-load Premium panel on first visit
  if (name === 'premium') { window._htLoadPremium && window._htLoadPremium(); }
  // Lazy-load Bildirimler on first visit
  if (name === 'bildirimler') { window._htLoadBildirimler && window._htLoadBildirimler(); }
  // Populate Settings from Profile when opening Ayarlar
  if (name === 'ayarlar') {
    setVal('settings-adsoyad', val('f-adsoyad'));
    setVal('settings-telefon', val('f-telefon'));
    syncAccountEmail();
    var visToggle = document.getElementById('settings-visibility-active');
    if (visToggle) {
      visToggle.checked = _loadedDBData && _loadedDBData.profile && _loadedDBData.profile.is_active !== false;
    }
    var beniOnerHint = document.getElementById('settings-benioner-hint');
    if (beniOnerHint && visToggle) {
      beniOnerHint.textContent = visToggle.checked ? 'Profilin ve CV\'n işverenlerle paylaşılır' : 'Profilin ve CV\'n işverenlerle paylaşılmaz';
      beniOnerHint.style.color = visToggle.checked ? '#059669' : '#ef4444';
    }
    var empName = document.getElementById('settings-current-employer-name');
    var hideToggle = document.getElementById('settings-hide-from-current-employer');
    var hideHint = document.getElementById('settings-hide-hint');
    var currentEmp = getCurrentEmployerDisplayFromExperiences(_loadedDBData ? _loadedDBData.experiences : null);
    var cbNoExp = document.getElementById('cb-no-experience');
    var noExperience = !!(cbNoExp && cbNoExp.checked);
    if (empName) empName.textContent = currentEmp || 'Şu an çalışmıyor';
    if (hideToggle) {
      hideToggle.checked = _loadedDBData && _loadedDBData.profile && _loadedDBData.profile.hide_from_current_employer === true;
      hideToggle.disabled = !currentEmp || noExperience;
    }
    if (hideHint) {
      if (noExperience) {
        hideHint.textContent = 'Bu ayarı kullanmak için önce iş deneyimi eklemelisin.';
        hideHint.style.display = 'block';
      } else {
        hideHint.textContent = 'Bu ayarı kullanabilmek için mevcut işverenini aktif olarak belirtmelisin.';
        hideHint.style.display = currentEmp ? 'none' : 'block';
      }
    }
    var ne = document.getElementById('settings-notify-email-messages');
    if (ne && _loadedDBData && _loadedDBData.profile) ne.checked = _loadedDBData.profile.notify_email_messages !== false;
    var nj = document.getElementById('settings-notify-email-jobs');
    if (nj && _loadedDBData && _loadedDBData.profile) nj.checked = _loadedDBData.profile.notify_email_jobs !== false;
    var ce = document.getElementById('settings-contact-email');
    if(ce && _loadedDBData && _loadedDBData.profile) ce.checked = _loadedDBData.profile.contact_pref_email !== false;
    var cp = document.getElementById('settings-contact-phone');
    if(cp && _loadedDBData && _loadedDBData.profile) cp.checked = _loadedDBData.profile.contact_pref_phone === true;
    var cw = document.getElementById('settings-contact-whatsapp');
    if(cw && _loadedDBData && _loadedDBData.profile) cw.checked = _loadedDBData.profile.contact_pref_whatsapp === true;
    var al = document.getElementById('settings-actively-looking');
    if(al && _loadedDBData && _loadedDBData.profile) al.checked = _loadedDBData.profile.is_actively_looking === true;
    if (window._htLoadBlockedCompanies) window._htLoadBlockedCompanies();
    if (typeof applyAllVisibilityMirrorsFromProfile === 'function') applyAllVisibilityMirrorsFromProfile();
  }
  // Close mobile sidebar
  closeMobileSidebar();
}

// ── EDIT SECTION ──────────────────────────────────
var returnToPanel = null;

function editSection(step) {
  try {
    returnToPanel = 'merkez';
    wizardDirty = false;
    wizStep = step;
    renderWizard();
    _doSwitchPanel('profil');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    ht_track('wizard_started', { entry_step: step });
    setTimeout(attachWizardDirtyListeners, 100);
  } catch(err) {
    console.error('editSection error:', err);
  }
}
window.editSection = editSection;

// ── MOBILE SIDEBAR ────────────────────────────────
function toggleMobileSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
  // Lock background scroll while sidebar is open (prevents iOS scroll-bleed)
  var isOpen = sidebar && sidebar.classList.contains('open');
  document.documentElement.classList.toggle('ht-scroll-lock', !!isOpen);
}
function closeMobileSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  document.documentElement.classList.remove('ht-scroll-lock');
}
