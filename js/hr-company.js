/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Company profile (FAZ B Sprint 6)

   Sorumluluklar:
   - Şirket profil formu (genel bilgi + marka portföyü + iletişim)
   - Brand tag input (Enter / virgül ile ekle, X ile kaldır)
   - Demo persist: localStorage ht_hr_company_demo_state
   - Onboarding'ten gelen veriyi default doldur (sirket alanı)
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  var STATE_KEY = 'ht_hr_company_demo_state';

  var $form;
  var $name, $website, $sector, $region;
  var $about, $aboutCounter;
  var $brandInput, $brandAdd, $brandTags;
  var $contactName, $contactEmail, $contactPhone, $contactRole;
  var $btnSave, $btnReset;
  var $toast;

  var _brands = [];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function readState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function writeState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.textContent = msg;
    $toast.setAttribute('data-type', type || 'info');
    $toast.setAttribute('data-show', 'true');
    setTimeout(function () { $toast.setAttribute('data-show', 'false'); }, 2400);
  }

  function renderBrands() {
    if (!$brandTags) return;
    while ($brandTags.firstChild) $brandTags.removeChild($brandTags.firstChild);
    _brands.forEach(function (b, i) {
      var tag = document.createElement('span');
      tag.className = 'hr-form__brand-tag';
      var label = document.createElement('span');
      label.textContent = b;
      tag.appendChild(label);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hr-form__brand-tag-del';
      del.setAttribute('aria-label', b + ' markasını kaldır');
      del.textContent = '×';
      del.addEventListener('click', function () {
        _brands.splice(i, 1);
        renderBrands();
      });
      tag.appendChild(del);
      $brandTags.appendChild(tag);
    });
  }

  function addBrand() {
    if (!$brandInput) return;
    var raw = $brandInput.value.trim();
    if (!raw) return;
    var parts = raw.split(/[,;]+/).map(function (p) { return p.trim(); }).filter(Boolean);
    parts.forEach(function (p) {
      var exists = _brands.some(function (b) { return b.toLocaleLowerCase('tr-TR') === p.toLocaleLowerCase('tr-TR'); });
      if (!exists) _brands.push(p);
    });
    $brandInput.value = '';
    renderBrands();
  }

  function loadFromState() {
    var s = readState();
    if (!s) return;
    if ($name) $name.value = s.name || '';
    if ($website) $website.value = s.website || '';
    if ($sector) $sector.value = s.sector || '';
    if ($region) $region.value = s.region || '';
    if ($about) $about.value = s.about || '';
    _brands = Array.isArray(s.brands) ? s.brands.slice() : [];
    if ($contactName) $contactName.value = s.contact_name || '';
    if ($contactEmail) $contactEmail.value = s.contact_email || '';
    if ($contactPhone) $contactPhone.value = s.contact_phone || '';
    if ($contactRole) $contactRole.value = s.contact_role || '';
    renderBrands();
    updateAboutCounter();
  }

  function loadFromProfile() {
    var profile = window.HRShell && window.HRShell.getProfile && window.HRShell.getProfile();
    if (!profile) return;
    if ($name && !$name.value && profile.sirket) $name.value = profile.sirket;
    if ($contactName && !$contactName.value && (profile.ad || profile.soyad)) {
      $contactName.value = ((profile.ad || '') + ' ' + (profile.soyad || '')).trim();
    }
    if ($contactEmail && !$contactEmail.value && profile.email) $contactEmail.value = profile.email;
  }

  function updateAboutCounter() {
    if (!$about || !$aboutCounter) return;
    var l = ($about.value || '').length;
    $aboutCounter.textContent = l + ' / 500';
  }

  function captureAndSave(e) {
    if (e) e.preventDefault();
    var state = {
      name: $name && $name.value.trim() || '',
      website: $website && $website.value.trim() || '',
      sector: $sector && $sector.value || '',
      region: $region && $region.value || '',
      about: $about && $about.value.trim() || '',
      brands: _brands.slice(),
      contact_name: $contactName && $contactName.value.trim() || '',
      contact_email: $contactEmail && $contactEmail.value.trim() || '',
      contact_phone: $contactPhone && $contactPhone.value.trim() || '',
      contact_role: $contactRole && $contactRole.value.trim() || '',
      saved_at: new Date().toISOString()
    };
    writeState(state);
    showToast('Profil kaydedildi (demo)', 'success');
  }

  function bindEvents() {
    if ($form) $form.addEventListener('submit', captureAndSave);
    if ($btnSave) $btnSave.addEventListener('click', captureAndSave);
    if ($btnReset) {
      $btnReset.addEventListener('click', function () {
        if (confirm('Tüm değişiklikleri silmek istiyor musunuz?')) {
          loadFromState();
        }
      });
    }
    if ($brandInput) {
      $brandInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addBrand();
        }
      });
    }
    if ($brandAdd) $brandAdd.addEventListener('click', addBrand);
    if ($about) $about.addEventListener('input', updateAboutCounter);
  }

  async function renderPositionSwitcher() {
    var btn = $('[data-hr-position-btn]');
    var menu = $('[data-hr-position-menu]');
    if (!btn || !menu) return;
    var loadingEl = $('[data-hr-position-loading]', menu);
    var posRes = await window.HRData.getPositions();
    if (loadingEl) loadingEl.remove();
    var positions = (posRes && posRes.data) || [];
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    function addOpt(label, value) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'hr-position-menu__opt';
      opt.setAttribute('role', 'option');
      opt.textContent = label;
      var active = window.HRShell.getActivePosition();
      var isActive = (!value && !active) || (active && String(active.id) === String(value));
      if (isActive) opt.setAttribute('aria-selected', 'true');
      opt.addEventListener('click', function () {
        if (!value) window.HRShell.setActivePosition(null);
        else {
          var p = positions.find(function (x) { return String(x.id) === String(value); });
          if (p) window.HRShell.setActivePosition({ id: p.id, title: p.title });
        }
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        renderPositionSwitcher();
      });
      menu.appendChild(opt);
    }
    addOpt('Tüm pozisyonlar', null);
    positions.forEach(function (p) { addOpt(p.title || ('Pozisyon #' + p.id), p.id); });

    btn.onclick = function (e) {
      e.stopPropagation();
      var isOpen = menu.getAttribute('data-open') === 'true';
      menu.setAttribute('data-open', isOpen ? 'false' : 'true');
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    };
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function cacheDom() {
    $form = $('[data-hr-co-form]');
    $name = $('[data-hr-co-name]');
    $website = $('[data-hr-co-website]');
    $sector = $('[data-hr-co-sector]');
    $region = $('[data-hr-co-region]');
    $about = $('[data-hr-co-about]');
    $aboutCounter = $('[data-hr-co-about-counter]');
    $brandInput = $('[data-hr-co-brand-input]');
    $brandAdd = $('[data-hr-co-brand-add]');
    $brandTags = $('[data-hr-co-brand-tags]');
    $contactName = $('[data-hr-co-contact-name]');
    $contactEmail = $('[data-hr-co-contact-email]');
    $contactPhone = $('[data-hr-co-contact-phone]');
    $contactRole = $('[data-hr-co-contact-role]');
    $btnSave = $('[data-hr-co-save]');
    $btnReset = $('[data-hr-co-reset]');
    $toast = $('[data-hr-toast]');
  }

  async function init() {
    cacheDom();
    if (!window.HRShell) return;
    await window.HRShell.ready();
    try { await renderPositionSwitcher(); } catch (e) {}
    loadFromState();
    loadFromProfile();
    updateAboutCounter();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
