/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Company — Asama 86 Sprint D
   Sirket profili formu: Genel bilgi + Marka portfoyu + Iletisim.
   Demo: IK_DATA.getCompany() + updateCompany() (localStorage).
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
    name: '', website: '', sector: '', region: '', about: '',
    brands: [],
    contact_name: '', contact_email: '', contact_phone: '', contact_role: ''
  };

  function cacheEls() {
    els = {
      form: $('#ik-co-form'),
      name: $('#ik-co-name'),
      website: $('#ik-co-website'),
      sector: $('#ik-co-sector'),
      region: $('#ik-co-region'),
      about: $('#ik-co-about'),
      aboutCounter: $('#ik-co-about-counter'),
      brandInput: $('#ik-co-brand-input'),
      brandAddBtn: $('#ik-co-brand-add'),
      brandChips: $('#ik-co-brand-chips'),
      contactName: $('#ik-co-contact-name'),
      contactEmail: $('#ik-co-contact-email'),
      contactPhone: $('#ik-co-contact-phone'),
      contactRole: $('#ik-co-contact-role'),
      saveBtn: $('#ik-co-save'),
      resetBtn: $('#ik-co-reset'),
      msg: $('#ik-co-msg'),
      toast: $('#ik-toast')
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
    state.name = data.name || '';
    state.website = data.website || '';
    state.sector = data.sector || '';
    state.region = data.region || '';
    state.about = data.about || '';
    state.brands = Array.isArray(data.brands) ? data.brands.slice() : [];
    state.contact_name = data.contact_name || '';
    state.contact_email = data.contact_email || '';
    state.contact_phone = data.contact_phone || '';
    state.contact_role = data.contact_role || '';

    els.name.value = state.name;
    els.website.value = state.website;
    els.sector.value = state.sector;
    els.region.value = state.region;
    els.about.value = state.about;
    els.contactName.value = state.contact_name;
    els.contactEmail.value = state.contact_email;
    els.contactPhone.value = state.contact_phone;
    els.contactRole.value = state.contact_role;

    renderBrandChips();
    updateCounter();
  }

  function readForm() {
    return {
      name: els.name.value,
      website: els.website.value,
      sector: els.sector.value,
      region: els.region.value,
      about: els.about.value,
      brands: state.brands.slice(),
      contact_name: els.contactName.value,
      contact_email: els.contactEmail.value,
      contact_phone: els.contactPhone.value,
      contact_role: els.contactRole.value
    };
  }

  function validate(payload) {
    if (!payload.name || !payload.name.trim()) {
      return 'Şirket adı zorunlu.';
    }
    if (payload.contact_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email.trim())) {
      return 'Geçerli bir e-posta gir.';
    }
    if (payload.website &&
        !/^https?:\/\//i.test(payload.website.trim())) {
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
