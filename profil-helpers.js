/* global _loadedDBData, setVal, switchPanel, syncBeniOner, updateMerkezCards */
// ═══════════════════════════════════════════════════
// PROFIL HELPERS — small cross-cutting helpers + [data-panel] delegation
// Extracted from profil.html inline scripts.
// Must load AFTER profil-draft.js (uses setVal) and profil-wizard.js (uses switchPanel).
// ═══════════════════════════════════════════════════

// ── Document-level panel click delegation ─────────
// Handles ALL [data-panel] clicks across sidebar, header, bento cards, etc.
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-panel]');
  if (!el) return;
  // Ignore panel root <main class="panel"> — inner clicks (toggles, inputs) would otherwise
  // match this node and re-run switchPanel, resetting Ayarlar/Merkez from _loadedDBData.
  if (el.tagName === 'MAIN' && el.classList && el.classList.contains('panel')) return;
  var panelName = el.getAttribute('data-panel');
  if (!panelName) return;
  e.stopPropagation();
  if (window.switchPanel) switchPanel(panelName);
  var dropdownId = el.getAttribute('data-close-dropdown');
  if (dropdownId) {
    var dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.style.display = 'none';
  }
});

// ── Settings save callback ────────────────────────
function refreshAfterSettingsSave(savedFullName, savedTelefon) {
  setVal('f-adsoyad', savedFullName);
  setVal('f-telefon', savedTelefon);
  var sidebar = document.getElementById('sidebar-user-name');
  if (sidebar) sidebar.textContent = savedFullName || '\u2014';
  if (_loadedDBData && _loadedDBData.profile) {
    _loadedDBData.profile.full_name = savedFullName;
    _loadedDBData.profile.telefon = savedTelefon;
  }
  updateMerkezCards();
}

// ── Visibility save redirect (defensive) ──────────
function refreshAfterVisibilitySave(isActive) {
  if (typeof syncBeniOner === 'function') syncBeniOner(isActive, 'ayarlar');
}

// ── Current employer display helper ───────────────
function getCurrentEmployerDisplayFromExperiences(experiences) {
  if (!experiences || !experiences.length) return '';
  var i, e, name;
  for (i = 0; i < experiences.length; i++) {
    e = experiences[i];
    if (e && e.devam_ediyor === true) {
      name = (e.marka || e.sirket_adi || e.sirket || '').toString().trim();
      return name || '';
    }
  }
  return '';
}

// ── Visibility summary render ─────────────────────
function refreshVisibilitySummary() {
  var profile = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile : null;
  var experiences = _loadedDBData && _loadedDBData.experiences ? _loadedDBData.experiences : null;
  var currentEmp = getCurrentEmployerDisplayFromExperiences(experiences);
  var hideFrom = profile && profile.hide_from_current_employer === true;

  var row = document.getElementById('visibility-summary-genel');
  var helper = document.getElementById('vis-hide-helper');

  if (!currentEmp) {
    if (row) row.style.display = 'none';
    return;
  }

  var hideStateText, hidePillClass;
  if (hideFrom) {
    hideStateText = 'Göremez';
    hidePillClass = 'visibility-pill visibility-pill--tumur';
  } else {
    hideStateText = 'Görebilir';
    hidePillClass = 'visibility-pill visibility-pill--warning';
  }

  if (row) row.style.display = '';
  if (helper) helper.style.display = 'block';

  var s3 = document.getElementById('vis-hide-state');
  if (s3) { s3.textContent = hideStateText; s3.className = hidePillClass; }
}
