/* global _loadedDBData, applyAllVisibilityMirrorsFromProfile, getCurrentEmployerDisplayFromExperiences, ht_track, loadSirketlerPanel, saveDraft, selectedCalismaTipleri, selectedMusaitlik, selectedSegmentler, setVal, showTgToast, syncAccountEmail, updateCompletionUI, updateMerkezCards, updateStep6HideState, val */
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
var TOTAL_STEPS = 7;

function wizGoTo(step) {
  if (step < 1 || step > TOTAL_STEPS) return;
  // Validate current step before moving forward
  if (step > wizStep && !validateStep(wizStep)) return;
  // Save draft on forward move (silent — no toast)
  if (step > wizStep) {
    saveDraft();
  }
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
  var btnSkip = document.getElementById('btn-wiz-skip');
  if (btnBack) btnBack.style.display = wizStep > 1 ? '' : 'none';
  if (btnNext) btnNext.style.display = wizStep < TOTAL_STEPS ? '' : 'none';
  if (btnComplete) btnComplete.style.display = wizStep === TOTAL_STEPS ? '' : 'none';
  // K045 Faz 2E: skip visible only when zorunlu iki step bitti (Step >= 3) ve
  // henüz son step değilse. Final step = "Tamamla" daha anlamlı.
  if (btnSkip) btnSkip.style.display = (wizStep >= 3 && wizStep < TOTAL_STEPS) ? '' : 'none';
  var progStep = document.getElementById('wiz-current-step');
  if (progStep) progStep.textContent = wizStep;
  // K049 editorial chrome: header meta + progress bar + right-rail spine
  updateEditorialChrome();
  // Scroll to top of wizard
  var wizPanel = document.getElementById('panel-profil');
  if (wizPanel) wizPanel.scrollTop = 0;
  window.scrollTo({top: 0, behavior: 'smooth'});
  // Refresh Step 6 employer state when entering that step
  if (wizStep === 7) updateStep6HideState();
}

// ── K049 EDITORIAL CHROME ─────────────────────────
// Updates the new editorial header (step num, label, pct, progress bar) and
// the right-rail spine states. Runs after renderWizard() advances wizStep.
var WZ_STEP_LABELS = ['Kişisel Bilgiler', 'Kariyer / Deneyimler', 'Eğitim, Diller, Sertifikalar', 'Tercihlerim', 'Lokasyon & Uygunluk', 'CV Yükle', 'Profil Ayarları'];

function updateEditorialChrome() {
  var total = TOTAL_STEPS;
  var pad = function(n) { return (n < 10 ? '0' : '') + n; };
  var pct = Math.round((wizStep / total) * 100);

  var stepNum = document.getElementById('wz-step-num');
  if (stepNum) stepNum.textContent = pad(wizStep) + ' / ' + pad(total);

  var stepLabel = document.getElementById('wz-step-label');
  if (stepLabel) stepLabel.textContent = WZ_STEP_LABELS[wizStep - 1] || '';

  var stepPct = document.getElementById('wz-step-pct');
  if (stepPct) stepPct.textContent = '%' + pct;

  var railPct = document.getElementById('wz-rail-pct');
  if (railPct) railPct.textContent = '%' + pct;

  var bar = document.getElementById('wz-progress-bar');
  if (bar) {
    bar.style.setProperty('--wz-progress', pct + '%');
    bar.setAttribute('aria-valuenow', String(pct));
  }

  var railItems = document.querySelectorAll('.wz-spine-item[data-wzrail-step]');
  railItems.forEach(function(el) {
    var s = parseInt(el.getAttribute('data-wzrail-step'), 10);
    el.classList.remove('is-current', 'is-complete');
    el.removeAttribute('aria-current');
    if (s === wizStep) {
      el.classList.add('is-current');
      el.setAttribute('aria-current', 'step');
    } else if (s < wizStep) {
      el.classList.add('is-complete');
    }
  });
}

// Wire rail step clicks once on script load (buttons are server-rendered)
(function wireWzRail() {
  if (typeof document === 'undefined') return;
  var bind = function() {
    var items = document.querySelectorAll('.wz-spine-item[data-wzrail-step]');
    items.forEach(function(el) {
      if (el.__wzBound) return;
      el.__wzBound = true;
      el.addEventListener('click', function() {
        var s = parseInt(el.getAttribute('data-wzrail-step'), 10);
        if (!isNaN(s)) wizGoTo(s);
      });
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

// ── STEP VALIDATION ───────────────────────────────
function validateStep(step) {
  clearStepErrors();
  if (step === 7) return true;
  switch(step) {
    case 1: return validateKisisel();
    case 2: return validateKariyer();
    case 3: return validateEgitim();
    case 4: return validateTercihler();
    case 5: return validateLokasyon();
    case 6: return true; // CV + Bio — opsiyonel
    default: return true;
  }
}

function validateKisisel() {
  var errors = [];
  if (!val('f-adsoyad')) errors.push('Ad Soyad zorunludur');
  if (!val('f-telefon')) errors.push('Telefon zorunludur');
  else if (!/^(\+90|0)?5[0-9]{9}$/.test(val('f-telefon').replace(/\s/g, ''))) {
    errors.push('Geçerli bir cep telefonu numarası girin (05XX XXX XX XX)');
    markFieldError('f-telefon');
  }
  if (!val('f-adresil')) errors.push('Adres / İl zorunludur');
  if (val('f-adresil') && !val('f-adresilce')) errors.push('İlçe zorunludur');
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
    if (val('f-adresil') && !val('f-adresilce')) markFieldError('f-adresilce');
    return false;
  }
  return true;
}

function markFieldError(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('has-error');
}
function validateKariyer() {
  var cbNoExp = document.getElementById('cb-no-experience');
  if (cbNoExp && cbNoExp.checked) return true;
  var cards = document.querySelectorAll('#exp-cards-container > .ht-card');
  if (cards.length === 0) {
    showStepErrors(['En az bir deneyim ekleyin veya "Henüz iş deneyimim yok" seçin']);
    return false;
  }
  var errors = [];
  cards.forEach(function(card, i) {
    var prefix = card.id + '-';
    var num = i + 1;
    if (!val(prefix + 'sirket')) errors.push('Deneyim #' + num + ': Şirket zorunludur');
    var pozSecVal = val(prefix + 'unvan-sec');
    var pozVal = (pozSecVal === '__custom__') ? val(prefix + 'unvan-custom') : (pozSecVal || val(prefix + 'unvan-custom'));
    if (!pozVal) errors.push('Deneyim #' + num + ': Pozisyon zorunludur');
    if (!val(prefix + 'basyil')) errors.push('Deneyim #' + num + ': Başlangıç yılı zorunludur');
    if (!val(prefix + 'sektor')) errors.push('Deneyim #' + num + ': Sektör zorunludur');
    if (!val(prefix + 'segment')) errors.push('Deneyim #' + num + ': Segment zorunludur');
  });
  if (errors.length > 0) { showStepErrors(errors); return false; }
  return true;
}
function validateEgitim() {
  var errors = [];
  var eduRows = document.querySelectorAll('#edu-rows-container .dynamic-row');
  if (eduRows.length === 0) {
    errors.push('En az bir eğitim bilgisi eklemelisin.');
  } else {
    // Check first row has at least seviye filled
    var firstRow = eduRows[0];
    var seviyeSelect = firstRow ? firstRow.querySelector('select') : null;
    if (seviyeSelect && !seviyeSelect.value) {
      errors.push('Eğitim seviyesi zorunludur.');
    }
  }
  if (errors.length > 0) { showStepErrors(errors); return false; }
  return true;
}
function validateTercihler() {
  var errors = [];
  if (typeof selectedCalismaTipleri === 'undefined' || !selectedCalismaTipleri || selectedCalismaTipleri.length === 0) {
    errors.push('En az bir çalışma tipi seçmelisin (Tam Zamanlı, Yarı Zamanlı vb.)');
    var ctChecks = document.getElementById('calisma-tipleri-checks');
    if (ctChecks) ctChecks.classList.add('has-error');
  }
  // Müsaitlik kaldırıldı — ihbar süresi aynı bilgiyi kapsıyor
  if (typeof selectedSegmentler === 'undefined' || !selectedSegmentler || selectedSegmentler.length === 0) {
    errors.push('En az bir segment tercihi seçmelisin (Lüks, Fast Fashion vb.)');
    var segChips = document.getElementById('segment-chips');
    if (segChips) segChips.classList.add('has-error');
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
  // K041 Faz 1E: role=alert + assertive live → screen reader announces
  // eksikleri anında. scrollIntoView → kullanıcı uzun formda "İleri" tıkladıktan
  // sonra üste döner, hataları görür.
  wrap.setAttribute('role', 'alert');
  wrap.setAttribute('aria-live', 'assertive');
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
  // Smooth scroll, block:center — kutu viewport'un ortasında kalır, mobile'da
  // iyi çalışır. Reduced-motion respect için 'smooth' yerine 'auto' seçilebilir
  // ama scrollIntoView 'smooth' zaten prefers-reduced-motion ile downgrade olur.
  try { wrap.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { wrap.scrollIntoView(); }
}

function clearStepErrors() {
  var box = document.getElementById('step-errors-box');
  if (box) box.remove();
  document.querySelectorAll('.has-error').forEach(function(el) {
    el.classList.remove('has-error');
  });
}

// ── PANEL SWITCHING ───────────────────────────────
var wizardDirty = false;
var pendingPanelSwitch = null;
var _currentHistoryPanel = null;

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
  // Normalize legacy panel aliases before switching.
  // - yetkinlik → mulakat: K030 studio freeze alias
  // - teklifler → firsatlar: K030+ rename deprecation (1 sprint window)
  var effectiveName = name;
  if (effectiveName === 'yetkinlik') effectiveName = 'mulakat';
  if (effectiveName === 'teklifler') effectiveName = 'firsatlar';
  _doSwitchPanel(effectiveName);
  // Persist active panel in URL and push to history for back/forward support
  var newUrl = (effectiveName && effectiveName !== 'genel') ? '#' + effectiveName : window.location.pathname;
  if (_currentHistoryPanel === null) {
    // First switch: anchor 'genel' as the origin state so back returns to it
    history.replaceState({ panel: 'genel' }, '', window.location.pathname);
    if (effectiveName !== 'genel') {
      history.pushState({ panel: effectiveName }, '', newUrl);
    }
  } else if (effectiveName !== _currentHistoryPanel) {
    history.pushState({ panel: effectiveName }, '', newUrl);
  }
  _currentHistoryPanel = effectiveName;
}

// Back/forward: restore panel without adding another history entry
window.addEventListener('popstate', function(e) {
  var panel = e.state && e.state.panel;
  if (!panel) return;
  // Dirty guard: re-push current state to undo browser back, then show exit modal
  var activePanel = document.querySelector('.panel.active');
  if (activePanel && activePanel.id === 'panel-profil' && wizardDirty) {
    var guardUrl = (_currentHistoryPanel && _currentHistoryPanel !== 'genel') ? '#' + _currentHistoryPanel : window.location.pathname;
    history.pushState({ panel: _currentHistoryPanel }, '', guardUrl);
    pendingPanelSwitch = panel;
    var exitModal = document.getElementById('modal-wizard-exit');
    if (exitModal) exitModal.classList.add('show');
    return;
  }
  // Normalize legacy state payloads (pre-rename bookmarks / open tabs).
  if (panel === 'teklifler') panel = 'firsatlar';
  if (panel === 'yetkinlik') panel = 'mulakat';
  _currentHistoryPanel = panel;
  _doSwitchPanel(panel);
});

function _doSwitchPanel(name) {
  wizardDirty = false;
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  var target = document.getElementById('panel-' + name);
  if (target) target.classList.add('active');
  var bc = document.getElementById('breadcrumb-current');
  if (bc) {
    var _studioLabel = (window._HT_STUDIO_FROZEN === true) ? 'St\u00fcdyo - Yakinda' : 'St\u00fcdyo';
    var labels = { genel: 'Genel Bak\u0131\u015f', merkez: 'Profil Merkezi', sirketler: 'Markalar', firsatlar: 'F\u0131rsatlar', inbox: 'Mesajlar', bildirimler: 'Bildirimler', ayarlar: 'Ayarlar', profil: 'Profil', yetkinlik: _studioLabel, mulakat: _studioLabel, premium: 'Premium', kimbakti: 'Kim Bakt\u0131', destek: 'Destek Merkezi' };
    bc.textContent = labels[name] || name;
  }
  // K030 FAZ B: when frozen and mulakat panel is active, activate BOTH
  // #nav-mulakat AND #nav-yetkinlik aliases (Option A binding).
  var _frozenDualNav = (window._HT_STUDIO_FROZEN === true && name === 'mulakat');
  function _navMatch(btn) {
    if (btn.dataset.panel === name) return true;
    if (_frozenDualNav && btn.dataset.panel === 'yetkinlik') return true;
    return false;
  }
  // Update sidebar nav
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(function(btn) {
    btn.classList.remove('active');
    if (_navMatch(btn)) btn.classList.add('active');
  });
  // Update header nav
  document.querySelectorAll('.header-nav .hn-item').forEach(function(btn) {
    btn.classList.remove('active');
    if (_navMatch(btn)) btn.classList.add('active');
  });
  // Update bottom nav
  document.querySelectorAll('.bn-item').forEach(function(btn) {
    btn.classList.remove('active');
    if (_navMatch(btn)) btn.classList.add('active');
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
  // Lazy-load Firsatlar data on first visit (panel renamed from 'teklifler')
  if (name === 'firsatlar') { window._htLoadFirsatlar && window._htLoadFirsatlar(); }
  // Lazy-load Inbox messages on first visit
  if (name === 'inbox') { window._htLoadInbox && window._htLoadInbox(); }
  // Note: yetkinlik → mulakat normalization handled in switchPanel() before this is called
  // Lazy-load Mulakat panel on first visit (also load yetkinlik bridge data)
  if (name === 'mulakat') {
    // K030 FAZ B: when frozen, render the "Yakında" placeholder inside #panel-mulakat
    // and SKIP both Studio and Yetkinlik loaders. Flip window._HT_STUDIO_FROZEN = false
    // in shared.js to unfreeze.
    if (window._HT_STUDIO_FROZEN === true) {
      var soonRoot = document.getElementById('panel-mulakat');
      if (soonRoot && typeof window._htRenderPanelSoon === 'function') {
        window._htRenderPanelSoon(soonRoot);
      }
      return;
    }
    window._htLoadYetkinlik && window._htLoadYetkinlik();
    window._htLoadStudio && window._htLoadStudio();
  }
  // Lazy-load Premium panel on first visit
  if (name === 'premium') { window._htLoadPremium && window._htLoadPremium(); }
  // Lazy-load Bildirimler on first visit
  if (name === 'bildirimler') { window._htLoadBildirimler && window._htLoadBildirimler(); }
  // Lazy-load Destek Merkezi on first visit
  if (name === 'destek') { window._htLoadDestek && window._htLoadDestek(); }
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
    var nnl = document.getElementById('settings-notify-email-newsletter');
    if (nnl && _loadedDBData && _loadedDBData.profile) nnl.checked = _loadedDBData.profile.notify_email_newsletter === true;
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
