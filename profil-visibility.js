/* global _loadedDBData, currentUser, getCurrentEmployerDisplayFromExperiences, refreshVisibilitySummary, supabase, updateStatusUI, updateStep6HideState */
// ═══════════════════════════════════════════════════
// profil-visibility.js — Visibility/toggle sync domain
// Extracted from profil-ui.js to reduce change-risk.
// Single source of truth for all visibility toggles:
//   Beni Öner (is_active), Aktif Arıyorum, Hide From Employer.
// Exports: window.updateMerkezVisState, syncBeniOner,
//   syncActivelyLooking, syncHideFromEmployer,
//   applyAllVisibilityMirrorsFromProfile
// ═══════════════════════════════════════════════════

// ── Toggle toast (positioned near toggle cell) ──
var _tgToastTimer = null;

function showTgToast(message, anchorEl) {
  var toast = document.getElementById('tg-toast');
  var text = document.getElementById('tg-toast-text');
  if (!toast || !text) return;

  text.textContent = message;

  if (anchorEl) {
    var rect = anchorEl.getBoundingClientRect();
    toast.style.top = (rect.bottom + 8) + 'px';
    toast.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 340)) + 'px';
    toast.style.right = 'auto';
    toast.style.bottom = 'auto';
    toast.style.transform = '';
  } else {
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.right = 'auto';
    toast.style.top = 'auto';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }

  toast.classList.add('visible');

  if (_tgToastTimer) clearTimeout(_tgToastTimer);
  _tgToastTimer = setTimeout(function() {
    closeTgToast();
  }, 5000);
}

function closeTgToast() {
  var toast = document.getElementById('tg-toast');
  if (toast) toast.classList.remove('visible');
  if (_tgToastTimer) { clearTimeout(_tgToastTimer); _tgToastTimer = null; }
}

// ═══════════════════════════════════════════════════
// SHARED TOGGLE SYNC — Single source of truth for all visibility toggles
// Each toggle (Beni Öner, Aktif Arıyorum, Hide From Employer) has ONE
// shared sync function that: syncs all UI instances, updates _loadedDBData,
// writes to DB ONCE, rolls back ALL toggles on failure.
// ═══════════════════════════════════════════════════
(function() {

  // ── Helper: update Merkez visual state from current toggle values ──
  function updateVisState() {
    var visToggle = document.getElementById('merkez-toggle-visibility');
    if (!visToggle) return;
    var isOn = visToggle.checked;

    var dot = document.getElementById('mk-status-dot');
    var text = document.getElementById('mk-status-text');
    if (dot) dot.classList.toggle('off', !isOn);
    if (text) {
      text.textContent = isOn ? 'Profilin aktif' : 'Profilin gizli';
      text.classList.toggle('off', !isOn);
    }
    var hideCell = document.getElementById('merkez-hide-row');
    if (hideCell) hideCell.classList.toggle('disabled', !isOn);

    var sidebarDesc = document.getElementById('sidebar-benioner-desc');
    if (sidebarDesc) {
      sidebarDesc.textContent = isOn ? 'Profilin ve CV\'n işverenlerle paylaşılır' : 'Profilin ve CV\'n işverenlerle paylaşılmaz';
      sidebarDesc.style.color = isOn ? 'var(--text-muted)' : '#ef4444';
    }

    var settingsHint = document.getElementById('settings-benioner-hint');
    if (settingsHint) {
      settingsHint.textContent = isOn ? 'Profilin ve CV\'n işverenlerle paylaşılır' : 'Profilin ve CV\'n işverenlerle paylaşılmaz';
      settingsHint.style.color = isOn ? '#059669' : '#ef4444';
    }
  }

  // ════════════════════════════════════════════════
  // 1. syncBeniOner — is_active toggle
  //    source: 'merkez' | 'sidebar' | 'ayarlar'
  // ════════════════════════════════════════════════
  function syncBeniOner(newValue, source) {
    var merkez = document.getElementById('merkez-toggle-visibility');
    var sidebar = document.getElementById('sidebar-toggle-benioner');
    var ayarlar = document.getElementById('settings-visibility-active');
    var wiz = document.getElementById('wiz-toggle-visibility');

    // Optimistic UI: sync all toggles immediately
    if (merkez) merkez.checked = newValue;
    if (sidebar) sidebar.checked = newValue;
    if (ayarlar) ayarlar.checked = newValue;
    if (wiz) wiz.checked = newValue;
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_active = newValue;
    updateVisState();
    if (typeof updateStatusUI === 'function') updateStatusUI(newValue);
    if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();

    // DB write — single path regardless of source
    if (typeof supabase === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    supabase.from('candidates')
      .update({ is_active: newValue })
      .eq('user_id', currentUser.id)
      .then(function(res) {
        if (res.error) {
          console.error('[HT] beni-oner save failed', res.error);
          // Rollback all toggles
          var rollback = !newValue;
          if (merkez) merkez.checked = rollback;
          if (sidebar) sidebar.checked = rollback;
          if (ayarlar) ayarlar.checked = rollback;
          if (wiz) wiz.checked = rollback;
          if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_active = rollback;
          updateVisState();
          if (typeof updateStatusUI === 'function') updateStatusUI(rollback);
          if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
          showTgToast('Hata: Görünürlük kaydedilemedi. Lütfen tekrar deneyin.', null);
        }
      });
  }

  // ════════════════════════════════════════════════
  // 2. syncActivelyLooking — is_actively_looking toggle
  //    source: 'merkez' | 'ayarlar'
  // ════════════════════════════════════════════════
  function syncActivelyLooking(newValue, source) {
    var merkez = document.getElementById('merkez-toggle-active');
    var ayarlar = document.getElementById('settings-actively-looking');
    var wiz = document.getElementById('wiz-toggle-active');
    var msg = document.getElementById('actively-looking-msg');

    // Optimistic UI: sync all toggles
    if (merkez) merkez.checked = newValue;
    if (ayarlar) ayarlar.checked = newValue;
    if (wiz) wiz.checked = newValue;
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_actively_looking = newValue;

    // DB write — single path
    if (typeof supabase === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    supabase.from('candidates')
      .update({ is_actively_looking: newValue })
      .eq('user_id', currentUser.id)
      .then(function(res) {
        if (res.error) {
          console.error('[HT] actively-looking save failed', res.error);
          // Rollback all toggles
          var rollback = !newValue;
          if (merkez) merkez.checked = rollback;
          if (ayarlar) ayarlar.checked = rollback;
          if (wiz) wiz.checked = rollback;
          if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_actively_looking = rollback;
          if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Hata: Kaydedilemedi. Lütfen tekrar deneyin.'; msg.style.display = 'block'; }
          showTgToast('Hata: Kaydedilemedi. Lütfen tekrar deneyin.', null);
        } else {
          if (msg) {
            msg.style.color = 'var(--green)';
            msg.textContent = newValue ? 'Aktif arama modu açıldı.' : 'Aktif arama modu kapatıldı.';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 3000);
          }
        }
      });
  }

  // ════════════════════════════════════════════════
  // 3. syncHideFromEmployer — hide_from_current_employer toggle
  //    source: 'merkez' | 'ayarlar'
  // ════════════════════════════════════════════════
  function syncHideFromEmployer(newValue, source) {
    var merkez = document.getElementById('merkez-hide-from-current-employer');
    var ayarlar = document.getElementById('settings-hide-from-current-employer');
    var wiz = document.getElementById('wiz-toggle-hide');

    // Eligibility guard: don't save if disabled
    if (merkez && merkez.disabled) return;
    if (ayarlar && ayarlar.disabled) return;
    if (wiz && wiz.disabled) return;

    // Optimistic UI: sync all toggles
    if (merkez) merkez.checked = newValue;
    if (ayarlar) ayarlar.checked = newValue;
    if (wiz) wiz.checked = newValue;
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.hide_from_current_employer = newValue;
    if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();

    // DB write — single path
    if (typeof supabase === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    supabase.from('candidates')
      .update({ hide_from_current_employer: newValue })
      .eq('user_id', currentUser.id)
      .then(function(res) {
        if (res.error) {
          console.error('[HT] hide-from-employer save failed', res.error);
          // Rollback all toggles
          var rollback = !newValue;
          if (merkez) merkez.checked = rollback;
          if (ayarlar) ayarlar.checked = rollback;
          if (wiz) wiz.checked = rollback;
          if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.hide_from_current_employer = rollback;
          if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
          showTgToast('Hata: Kaydedilemedi. Lütfen tekrar deneyin.', null);
        }
      });
  }

  // Tek kaynak: _loadedDBData.profile → tüm Beni öner / aktif arıyorum / mevcut işveren aynaları
  function applyAllVisibilityMirrorsFromProfile() {
    var p = _loadedDBData && _loadedDBData.profile;
    if (!p) return;
    var isActive = p.is_active !== false;
    var actively = p.is_actively_looking === true;
    var hide = p.hide_from_current_employer === true;

    var merkezV = document.getElementById('merkez-toggle-visibility');
    var merkezA = document.getElementById('merkez-toggle-active');
    var merkezH = document.getElementById('merkez-hide-from-current-employer');
    var side = document.getElementById('sidebar-toggle-benioner');
    var setV = document.getElementById('settings-visibility-active');
    var setA = document.getElementById('settings-actively-looking');
    var setH = document.getElementById('settings-hide-from-current-employer');
    var wizV = document.getElementById('wiz-toggle-visibility');
    var wizA = document.getElementById('wiz-toggle-active');
    var wizH = document.getElementById('wiz-toggle-hide');

    if (merkezV) merkezV.checked = isActive;
    if (side) side.checked = isActive;
    if (setV) setV.checked = isActive;
    if (wizV) wizV.checked = isActive;

    if (merkezA) merkezA.checked = actively;
    if (setA) setA.checked = actively;
    if (wizA) wizA.checked = actively;

    var currentEmp = typeof getCurrentEmployerDisplayFromExperiences === 'function'
      ? getCurrentEmployerDisplayFromExperiences(_loadedDBData ? _loadedDBData.experiences : null)
      : null;
    var cbNoExp = document.getElementById('cb-no-experience');
    var noExperience = !!(cbNoExp && cbNoExp.checked);
    var hideEligible = !!currentEmp && !noExperience;

    if (merkezH) {
      merkezH.disabled = !hideEligible;
      merkezH.checked = hideEligible ? hide : false;
    }
    if (setH) {
      setH.disabled = !hideEligible;
      setH.checked = hideEligible ? hide : false;
    }
    if (wizH) {
      wizH.disabled = !hideEligible;
      wizH.checked = hideEligible ? hide : false;
    }

    updateVisState();
    if (typeof updateStatusUI === 'function') updateStatusUI(isActive);
    if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
    if (typeof updateStep6HideState === 'function') updateStep6HideState();
  }

  // ── Wire Merkez toggles ──
  var visToggle = document.getElementById('merkez-toggle-visibility');
  if (visToggle) {
    visToggle.addEventListener('change', function() {
      var cell = visToggle.closest('.mk-controls-item');
      if (visToggle.checked) {
        showTgToast('Profilin ve kişisel bilgilerin işverenlerle paylaşılacak.', cell);
      } else {
        showTgToast('Profilin gizlendi. İşverenler kişisel bilgilerini ve CV\'ni göremez.', cell);
      }
      syncBeniOner(visToggle.checked, 'merkez');
    });
    updateVisState();
  }

  var sidebarToggle = document.getElementById('sidebar-toggle-benioner');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('change', function() {
      syncBeniOner(sidebarToggle.checked, 'sidebar');
    });
  }

  var aktifToggle = document.getElementById('merkez-toggle-active');
  if (aktifToggle) {
    aktifToggle.addEventListener('change', function() {
      var newVal = this.checked;
      var cell = this.closest('.mk-controls-item');
      if (newVal) {
        showTgToast('İşverenler profilinde "Aktif iş arıyor" rozeti görecek.', cell);
      } else {
        showTgToast('Rozet kaldırıldı. Profilin hâlâ görünür, sadece aktif arama rozeti gizli.', cell);
      }
      syncActivelyLooking(newVal, 'merkez');
    });
  }

  var hideToggle = document.getElementById('merkez-hide-from-current-employer');
  if (hideToggle) {
    hideToggle.addEventListener('change', function() {
      var cell = this.closest('.mk-controls-item');
      if (this.checked) {
        showTgToast('Mevcut işverenin profilini göremeyecek.', cell);
      } else {
        showTgToast('Mevcut işverenin de dahil tüm işverenler profilini görebilir.', cell);
      }
      syncHideFromEmployer(this.checked, 'merkez');
    });
  }

  // ── Expose to other modules (profil-settings.js, profil.html) ──
  window.updateMerkezVisState = updateVisState;
  window.syncBeniOner = syncBeniOner;
  window.syncActivelyLooking = syncActivelyLooking;
  window.syncHideFromEmployer = syncHideFromEmployer;
  window.applyAllVisibilityMirrorsFromProfile = applyAllVisibilityMirrorsFromProfile;
  window.showTgToast = showTgToast;
  window.closeTgToast = closeTgToast;
})();
