/* global addCertificateRow, addEducationRow, addExperienceCard, addLanguageRow, addTargetRoleRow, certCounter, collectCertificates, collectEducation, collectExperiences, collectLanguages, collectLocations, collectTargetRoles, collectWorkPrefs, eduCounter, expCounter, initStep5, langCounter, monthIndexToName, populateIlceSelect, renderBrandInterestChips, renderSelectedLocations, renderWizard, roleCounter, selectedBrandInterests, selectedCalismaTipleri, selectedCareerTypes, selectedLocations, selectedMusaitlik, selectedSegmentler, showCVEmpty, showCVUploaded, val, wizStep */
// ═══════════════════════════════════════════════════
// PROFIL DRAFT — localStorage draft save/load/apply + setVal helper
// Extracted from profil.html inline scripts.
// Depends on: profil-core.js (val), profil-ui.js (collect*, add*Row,
//   renderBrandInterestChips, counters), profil-locations.js
//   (selectedLocations, renderSelectedCities, updateCityChipStates,
//   collectLocations).
// Must load BEFORE profil-bootstrap.js (bootstrap calls applyDraft/loadDraft).
// ═══════════════════════════════════════════════════

var DRAFT_KEY = 'ht_wizard_draft_v2';

function setVal(id, value) {
  if (value == null) return;
  var el = document.getElementById(id);
  if (!el) return;
  el.value = value;
}

function saveDraft() {
  var draft = {
    step: wizStep,
    timestamp: new Date().toISOString(),
    profile: {
      full_name: val('f-adsoyad'),
      telefon: val('f-telefon'),
      linkedin: val('f-linkedin'),
      cinsiyet: val('f-cinsiyet'),
      dogum_yili: val('f-dogumyili'),
      adres_il: val('f-adresil'),
      adres_ilce: val('f-adresilce'),
      engel_durumu: val('f-engel'),
      askerlik_durumu: val('f-askerlik'),
      bio: val('f-bio')
    },
    no_experience: document.getElementById('cb-no-experience') ? document.getElementById('cb-no-experience').checked : false,
    experiences: collectExperiences().map(function(e) {
      // Convert month integers to names so draft restore matches makeSelectField expectations
      e.baslangic_ay = monthIndexToName(e.baslangic_ay);
      e.bitis_ay = monthIndexToName(e.bitis_ay);
      if (e.baslangic_yil != null) e.baslangic_yil = String(e.baslangic_yil);
      if (e.bitis_yil != null) e.bitis_yil = String(e.bitis_yil);
      return e;
    }),
    education: collectEducation(),
    languages: collectLanguages(),
    certificates: collectCertificates(),
    target_roles: collectTargetRoles(),
    work_prefs: collectWorkPrefs(),
    brand_interests: selectedBrandInterests.slice(),
    locations: collectLocations()
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  var raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function applyDraft(draft) {
  if (!draft) return;
  // Step 1: Profile fields
  if (draft.profile) {
    setVal('f-adsoyad', draft.profile.full_name);
    setVal('f-telefon', draft.profile.telefon);
    setVal('f-linkedin', draft.profile.linkedin);
    setVal('f-cinsiyet', draft.profile.cinsiyet);
    setVal('f-dogumyili', draft.profile.dogum_yili);
    setVal('f-adresil', draft.profile.adres_il);
    // Trigger il→ilce population
    if (draft.profile.adres_il) populateIlceSelect('f-adresilce', draft.profile.adres_il);
    setTimeout(function() { setVal('f-adresilce', draft.profile.adres_ilce); }, 50);
    setVal('f-engel', draft.profile.engel_durumu);
    setVal('f-askerlik', draft.profile.askerlik_durumu);
    if (draft.profile.bio) setVal('f-bio', draft.profile.bio);
    // Show askerlik if cinsiyet=Erkek
    if (draft.profile.cinsiyet === 'Erkek') {
      var fa = document.getElementById('field-askerlik');
      if (fa) fa.style.display = '';
    }
    if (draft.profile.cv_url) {
      if (typeof showCVUploaded === 'function') showCVUploaded(draft.profile.cv_url, draft.profile.cv_uploaded_at ? new Date(draft.profile.cv_uploaded_at) : new Date());
    } else {
      if (typeof showCVEmpty === 'function') showCVEmpty();
    }
  }

  // Step 2: Experiences
  if (draft.no_experience) {
    var cbNoExp = document.getElementById('cb-no-experience');
    if (cbNoExp) { cbNoExp.checked = true; cbNoExp.dispatchEvent(new Event('change')); }
  }
  if (draft.experiences && draft.experiences.length > 0) {
    // Remove default card
    var container = document.getElementById('exp-cards-container');
    if (container) container.textContent = '';
    expCounter = 0;
    draft.experiences.forEach(function(exp) { addExperienceCard(exp); });
  }

  // Step 3: Education
  if (draft.education && draft.education.length > 0) {
    var eduContainer = document.getElementById('edu-rows-container');
    if (eduContainer) eduContainer.textContent = '';
    eduCounter = 0;
    draft.education.forEach(function(edu) { addEducationRow(edu); });
  }
  if (draft.languages && draft.languages.length > 0) {
    var langContainer = document.getElementById('lang-rows-container');
    if (langContainer) langContainer.textContent = '';
    langCounter = 0;
    draft.languages.forEach(function(lang) { addLanguageRow(lang); });
  }
  if (draft.certificates && draft.certificates.length > 0) {
    var certContainer = document.getElementById('cert-rows-container');
    if (certContainer) { certContainer.textContent = ''; certCounter = 0; }
    draft.certificates.forEach(function(cert) { addCertificateRow(cert); });
  }

  // Step 4: Preferences
  if (draft.target_roles && draft.target_roles.length > 0) {
    var roleContainer = document.getElementById('target-roles-container');
    if (roleContainer) roleContainer.textContent = '';
    roleCounter = 0;
    draft.target_roles.forEach(function(r) { addTargetRoleRow(r); });
  }
  if (draft.work_prefs) {
    var wp = draft.work_prefs;
    if (wp.musaitlik) {
      selectedMusaitlik = wp.musaitlik;
      document.querySelectorAll('#musaitlik-chips .ht-chip').forEach(function(c) {
        c.classList.toggle('is-active', c.textContent === wp.musaitlik);
      });
    }
    if (wp.calisma_tipleri && wp.calisma_tipleri.length > 0) {
      selectedCalismaTipleri = wp.calisma_tipleri.slice();
      document.querySelectorAll('#calisma-tipleri-checks .check-item').forEach(function(btn) {
        btn.classList.toggle('checked', wp.calisma_tipleri.indexOf(btn.textContent) !== -1);
      });
    }
    if (wp.tercih_segmentler && wp.tercih_segmentler.length > 0) {
      selectedSegmentler = wp.tercih_segmentler.slice();
      document.querySelectorAll('#segment-chips .ht-chip').forEach(function(c) {
        c.classList.toggle('is-active', wp.tercih_segmentler.indexOf(c.textContent) !== -1);
      });
    }
    // Career type single-select restore (legacy tolerance: lider→yukari)
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
    // Travel, shift, notice restore from draft
    if (wp.travel_willingness) setVal('f-seyahat', wp.travel_willingness);
    if (wp.shift_flexibility) setVal('f-vardiya', wp.shift_flexibility);
    if (wp.notice_period) setVal('f-ihbar', wp.notice_period);
  }
  if (draft.brand_interests && draft.brand_interests.length > 0) {
    selectedBrandInterests = draft.brand_interests.slice();
    renderBrandInterestChips();
  }

  // Step 5: Locations
  if (draft.locations && draft.locations.length > 0) {
    selectedLocations = {};
    draft.locations.forEach(function(loc) {
      selectedLocations[loc.sehir] = loc.ilceler || [];
    });
    // Re-init multi-select UI to reflect restored selections
    if (typeof initStep5 === 'function') initStep5();
  }

  // Navigate to saved step
  if (draft.step && draft.step > 1) {
    wizStep = draft.step;
    renderWizard();
  }
}
