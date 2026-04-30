/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Company — Asama 86 Sprint D
   Sirket profili formu: Genel bilgi + Marka portfoyu.
   IK_DATA.getCompany() + updateCompany() real Supabase.
   SOLID:
     - SRP: tek sorumluluk = company form behavior + brand chip mgmt.
     - DIP: IK_DATA public API'sine bagli, gercek/demo mode degisir.
   XSS-safe: textContent + DOM, hicbir innerHTML kullanmayiz.
   Token-strict: CSS var(--*) zaten panel CSS'inde.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  var els = null;
  var state = {
    company_name: '', website_url: '', industry: '', segment: '', short_description: '',
    brands: [],
    legal_name: '', career_url: '', linkedin_url: '', logo_url: ''
  };

  function cacheEls() {
    els = {
      form:        $('#ik-co-form'),
      name:        $('#ik-co-name'),
      website:     $('#ik-co-website'),
      sector:      $('#ik-co-sector'),
      region:      $('#ik-co-region'),
      about:       $('#ik-co-about'),
      aboutCounter: $('#ik-co-about-counter'),
      brandInput:  $('#ik-co-brand-input'),
      brandAddBtn: $('#ik-co-brand-add'),
      brandChips:  $('#ik-co-brand-chips'),
      saveBtn:     $('#ik-co-save'),
      resetBtn:    $('#ik-co-reset'),
      msg:         $('#ik-co-msg'),
      toast:       $('#ik-toast')
    };
  }

  function showToast(text, kind) {
    if (!els.toast) return;
    els.toast.textContent = text || '';
    els.toast.className = 'ik-toast is-visible' + (kind ? ' ik-toast--' + kind : '');
    setTimeout(function () { els.toast.classList.remove('is-visible'); }, 3200);
  }

  function setMsg(text, kind) {
    if (!els.msg) return;
    els.msg.textContent = text || '';
    els.msg.className = 'ik-co-msg' + (kind ? ' ik-co-msg--' + kind : '');
  }

  function updateCounter() {
    if (!els.aboutCounter || !els.about) return;
    var len = (els.about.value || '').length;
    els.aboutCounter.textContent = len + ' / 500';
  }

  function renderBrandChips() {
    if (!els.brandChips) return;
    els.brandChips.textContent = '';
    if (!state.brands.length) return;

    state.brands.forEach(function (brand, idx) {
      var chip = document.createElement('span');
      chip.className = 'ik-co-chip';
      chip.setAttribute('role', 'listitem');

      var label = document.createElement('span');
      label.className = 'ik-co-chip__label';
      label.textContent = brand;

      var rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'ik-co-chip__rm';
      rmBtn.setAttribute('aria-label', brand + ' markasını kaldır');
      rmBtn.dataset.idx = String(idx);
      rmBtn.textContent = '×';

      chip.appendChild(label);
      chip.appendChild(rmBtn);
      els.brandChips.appendChild(chip);
    });
  }

  function addBrand(raw) {
    var clean = String(raw || '').trim();
    if (!clean) return false;
    /* Virgül ile gelirse split */
    var parts = clean.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var added = 0;
    parts.forEach(function (p) {
      if (state.brands.length >= 30) return;
      if (state.brands.indexOf(p) >= 0) return; /* dup guard */
      state.brands.push(p.slice(0, 60));
      added++;
    });
    if (added > 0) renderBrandChips();
    return added > 0;
  }

  function removeBrand(idx) {
    if (idx < 0 || idx >= state.brands.length) return;
    state.brands.splice(idx, 1);
    renderBrandChips();
  }

  function bindBrands() {
    if (!els.brandInput || !els.brandAddBtn) return;

    function tryAdd() {
      var v = els.brandInput.value;
      if (addBrand(v)) {
        els.brandInput.value = '';
        els.brandInput.focus();
      }
    }

    els.brandAddBtn.addEventListener('click', tryAdd);

    els.brandInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        tryAdd();
      }
    });

    els.brandChips.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('ik-co-chip__rm')) {
        var idx = parseInt(t.dataset.idx, 10);
        if (!isNaN(idx)) removeBrand(idx);
      }
    });
  }

  function hydrate(data) {
    if (!data) return;
    state.company_name     = data.company_name     || '';
    state.website_url      = data.website_url      || '';
    state.industry         = data.industry         || '';
    state.segment          = data.segment          || '';
    state.short_description = data.short_description || '';
    state.legal_name       = data.legal_name       || '';
    state.career_url       = data.career_url       || '';
    state.linkedin_url     = data.linkedin_url     || '';
    state.logo_url         = data.logo_url         || '';
    state.brands           = Array.isArray(data.brands) ? data.brands.slice() : [];

    if (els.name)        els.name.value    = state.company_name;
    if (els.website)     els.website.value = state.website_url;
    if (els.sector)      els.sector.value  = state.industry;
    if (els.region)      els.region.value  = state.segment;
    if (els.about)       els.about.value   = state.short_description;

    renderBrandChips();
    updateCounter();
  }

  function readForm() {
    return {
      company_name:      els.name    ? els.name.value    : '',
      website_url:       els.website ? els.website.value : '',
      industry:          els.sector  ? els.sector.value  : '',
      segment:           els.region  ? els.region.value  : '',
      short_description: els.about   ? els.about.value   : '',
      legal_name:        state.legal_name,
      career_url:        state.career_url,
      linkedin_url:      state.linkedin_url,
      logo_url:          state.logo_url
    };
  }

  function validate(payload) {
    if (!payload.company_name || !payload.company_name.trim()) {
      return 'Şirket adı zorunlu.';
    }
    if (payload.website_url &&
        !/^https?:\/\//i.test(payload.website_url.trim())) {
      return 'Web sitesi http:// veya https:// ile başlamalı.';
    }
    return null;
  }

  function save() {
    if (!els.saveBtn) return;
    var payload = readForm();
    var err = validate(payload);
    if (err) {
      setMsg(err, 'err');
      showToast(err, 'err');
      return;
    }
    els.saveBtn.disabled = true;
    var orig = els.saveBtn.textContent;
    els.saveBtn.textContent = 'Kaydediliyor…';

    IK_DATA.updateCompany(payload).then(function () {
      setMsg('Şirket profili kaydedildi.', 'ok');
      showToast('Şirket profili kaydedildi', 'ok');
    }).catch(function (e) {
      var m = (e && e.message) || 'Kaydetme başarısız.';
      setMsg('Hata: ' + m, 'err');
      showToast('Hata: ' + m, 'err');
    }).then(function () {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = orig;
    });
  }

  function reset() {
    /* Reload demo data */
    setMsg('', '');
    return IK_DATA.getCompany().then(hydrate);
  }

  function bindForm() {
    if (els.about) {
      els.about.addEventListener('input', updateCounter);
    }
    if (els.saveBtn) {
      els.saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        save();
      });
    }
    if (els.form) {
      els.form.addEventListener('submit', function (e) {
        e.preventDefault();
        save();
      });
    }
    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        reset();
      });
    }
  }

  function init() {
    cacheEls();
    if (!els.form) return;
    bindBrands();
    bindForm();
    IK_DATA.getCompany().then(hydrate).catch(function (e) {
      console.warn('[ik-company] load fail:', e && e.message);
      setMsg('Profil yüklenemedi. Yenilemeyi dene.', 'err');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
