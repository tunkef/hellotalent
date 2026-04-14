/*!
 * HelloTalent Admin — Markalar panel (K038 Faz 3)
 * Admin-only brand & company CRUD + archive UI.
 * RPCs: admin_upsert_brand, admin_upsert_company,
 *       admin_archive_brand, admin_archive_company,
 *       admin_restore_brand, admin_restore_company
 * Storage bucket: 'brand-assets' — logos/ and covers/ sub-paths.
 * Safari-safe: IIFE + var only, no top-level const/let/arrow.
 */
(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────── */
  var _state = {
    tab: 'brands',
    brands: [],
    companies: [],
    archivedBrands: [],
    archivedCompanies: [],
    searchQuery: '',
    loaded: false,
    loading: false,
    editing: null,     /* { type:'brand'|'company', data:{} } */
    dirty: false
  };

  var SEGMENTS = ['LUXURY', 'PREMIUM', 'MODA', 'SPORT', 'BEAUTY', 'TECH'];

  /* ── Utilities ───────────────────────────────────────── */
  function supa() {
    return window._htAdminSupa || null;
  }

  function showToast(msg, kind) {
    try {
      var t = document.createElement('div');
      t.className = 'adm-toast' + (kind ? ' adm-toast--' + kind : '');
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () {
        if (t && t.parentNode) t.parentNode.removeChild(t);
      }, 3000);
    } catch (e) {}
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function slugify(s) {
    if (!s) return '';
    var out = String(s).toLowerCase();
    out = out
      .replace(/ı/g, 'i').replace(/İ/g, 'i')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/Ü/g, 'u')
      .replace(/ş/g, 's').replace(/Ş/g, 's')
      .replace(/ö/g, 'o').replace(/Ö/g, 'o')
      .replace(/ç/g, 'c').replace(/Ç/g, 'c');
    out = out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return out || '';
  }

  function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Data fetchers ───────────────────────────────────── */
  function fetchBrands() {
    var s = supa();
    if (!s) return Promise.reject(new Error('Supabase client yok'));
    return s.from('brands')
      .select('*, companies!brands_company_id_fkey(id,company_name)')
      .is('archived_at', null)
      .order('brand_name', { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function fetchCompanies() {
    var s = supa();
    if (!s) return Promise.reject(new Error('Supabase client yok'));
    return s.from('companies')
      .select('*')
      .is('archived_at', null)
      .order('company_name', { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function fetchArchivedBrands() {
    var s = supa();
    return s.from('brands')
      .select('*, companies!brands_company_id_fkey(id,company_name)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function fetchArchivedCompanies() {
    var s = supa();
    return s.from('companies')
      .select('*')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function refreshAll() {
    if (_state.loading) return Promise.resolve();
    _state.loading = true;
    return Promise.all([
      fetchBrands(),
      fetchCompanies(),
      fetchArchivedBrands(),
      fetchArchivedCompanies()
    ]).then(function (arr) {
      _state.brands = arr[0];
      _state.companies = arr[1];
      _state.archivedBrands = arr[2];
      _state.archivedCompanies = arr[3];
      _state.loaded = true;
      _state.loading = false;
      render();
    }).catch(function (err) {
      _state.loading = false;
      console.error('[markalar] fetch error', err);
      showToast('Markalar yüklenemedi: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    });
  }

  /* ── Rendering ───────────────────────────────────────── */
  function getListRoot() { return document.getElementById('adm-brands-list'); }

  function render() {
    updateCounts();
    updateTabActive();
    renderList();
  }

  function updateCounts() {
    var set = function (id, v) {
      var e = document.getElementById(id);
      if (e) e.textContent = String(v);
    };
    set('adm-brands-count-active', _state.brands.length);
    set('adm-companies-count-active', _state.companies.length);
    set('adm-archive-count', _state.archivedBrands.length + _state.archivedCompanies.length);
  }

  function updateTabActive() {
    var tabs = document.querySelectorAll('.adm-brands-tab');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (t.getAttribute('data-brands-tab') === _state.tab) t.classList.add('is-active');
      else t.classList.remove('is-active');
    }
  }

  function filterBySearch(items, fields) {
    var q = (_state.searchQuery || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter(function (it) {
      for (var i = 0; i < fields.length; i++) {
        var v = it[fields[i]];
        if (v && String(v).toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    });
  }

  function renderList() {
    var root = getListRoot();
    if (!root) return;
    root.innerHTML = '';
    if (!_state.loaded) {
      root.appendChild(el('div', 'adm-list-empty', 'Yükleniyor...'));
      return;
    }
    if (_state.tab === 'brands') renderBrandsList(root);
    else if (_state.tab === 'companies') renderCompaniesList(root);
    else if (_state.tab === 'archive') renderArchiveList(root);
  }

  function renderBrandsList(root) {
    var items = filterBySearch(_state.brands, ['brand_name', 'segment', 'hq_city', 'slug']);
    if (!items.length) {
      root.appendChild(el('div', 'adm-list-empty', 'Marka bulunamadı.'));
      return;
    }
    for (var i = 0; i < items.length; i++) {
      root.appendChild(buildBrandRow(items[i], false));
    }
  }

  function renderCompaniesList(root) {
    var items = filterBySearch(_state.companies, ['company_name', 'industry', 'segment', 'slug']);
    if (!items.length) {
      root.appendChild(el('div', 'adm-list-empty', 'Grup bulunamadı.'));
      return;
    }
    for (var i = 0; i < items.length; i++) {
      root.appendChild(buildCompanyRow(items[i], false));
    }
  }

  function renderArchiveList(root) {
    var b = filterBySearch(_state.archivedBrands, ['brand_name', 'segment', 'slug']);
    var c = filterBySearch(_state.archivedCompanies, ['company_name', 'industry', 'slug']);
    if (!b.length && !c.length) {
      root.appendChild(el('div', 'adm-list-empty', 'Arşiv boş.'));
      return;
    }
    for (var i = 0; i < b.length; i++) root.appendChild(buildBrandRow(b[i], true));
    for (var j = 0; j < c.length; j++) root.appendChild(buildCompanyRow(c[j], true));
  }

  function buildLogoCell(url, label) {
    var wrap = el('div', 'adm-brand-row__logo');
    if (url) {
      var img = document.createElement('img');
      img.src = url;
      img.alt = label || '';
      img.loading = 'lazy';
      wrap.appendChild(img);
    } else {
      wrap.classList.add('adm-brand-row__logo--empty');
      wrap.textContent = (label || '?').substring(0, 2).toUpperCase();
    }
    return wrap;
  }

  function buildBrandRow(brand, archived) {
    var row = el('div', 'adm-brand-row');
    row.appendChild(buildLogoCell(brand.logo_url, brand.brand_name));

    var main = el('div', 'adm-brand-row__main');
    var name = el('div', 'adm-brand-row__name', brand.brand_name || '(isimsiz)');
    main.appendChild(name);
    var parent = brand.companies && brand.companies.company_name ? brand.companies.company_name : '—';
    var sub = el('div', 'adm-brand-row__sub', (brand.segment || '—') + ' · ' + parent);
    main.appendChild(sub);
    row.appendChild(main);

    var meta1 = el('div', 'adm-brand-row__meta', brand.hq_city || '—');
    row.appendChild(meta1);

    var stores = (brand.store_count_tr != null ? brand.store_count_tr + ' mağaza' : '—');
    var meta2 = el('div', 'adm-brand-row__meta', stores);
    row.appendChild(meta2);

    var actions = el('div', 'adm-brand-row__actions');
    if (archived) {
      var restoreBtn = el('button', 'adm-btn adm-btn--sm', 'Geri Yükle');
      restoreBtn.type = 'button';
      restoreBtn.addEventListener('click', function () { restoreBrand(brand.id); });
      actions.appendChild(restoreBtn);
    } else {
      var editBtn = el('button', 'adm-btn adm-btn--sm', 'Düzenle');
      editBtn.type = 'button';
      editBtn.addEventListener('click', function () { openEditDrawer('brand', brand); });
      actions.appendChild(editBtn);

      var archBtn = el('button', 'adm-btn adm-btn--sm adm-btn--ghost', 'Arşivle');
      archBtn.type = 'button';
      archBtn.addEventListener('click', function () { archiveBrand(brand.id, brand.brand_name); });
      actions.appendChild(archBtn);
    }
    row.appendChild(actions);
    return row;
  }

  function buildCompanyRow(company, archived) {
    var row = el('div', 'adm-brand-row');
    row.appendChild(buildLogoCell(company.logo_url, company.company_name));

    var main = el('div', 'adm-brand-row__main');
    main.appendChild(el('div', 'adm-brand-row__name', company.company_name || '(isimsiz)'));
    main.appendChild(el('div', 'adm-brand-row__sub', (company.industry || '—') + ' · ' + (company.segment || '—')));
    row.appendChild(main);

    row.appendChild(el('div', 'adm-brand-row__meta', company.legal_name || '—'));

    var brandCount = 0;
    for (var k = 0; k < _state.brands.length; k++) {
      if (_state.brands[k].company_id === company.id) brandCount++;
    }
    row.appendChild(el('div', 'adm-brand-row__meta', brandCount + ' marka'));

    var actions = el('div', 'adm-brand-row__actions');
    if (archived) {
      var rb = el('button', 'adm-btn adm-btn--sm', 'Geri Yükle');
      rb.type = 'button';
      rb.addEventListener('click', function () { restoreCompany(company.id); });
      actions.appendChild(rb);
    } else {
      var eb = el('button', 'adm-btn adm-btn--sm', 'Düzenle');
      eb.type = 'button';
      eb.addEventListener('click', function () { openEditDrawer('company', company); });
      actions.appendChild(eb);
      var ab = el('button', 'adm-btn adm-btn--sm adm-btn--ghost', 'Arşivle');
      ab.type = 'button';
      ab.addEventListener('click', function () { archiveCompany(company.id, company.company_name); });
      actions.appendChild(ab);
    }
    row.appendChild(actions);
    return row;
  }

  /* ── Drawer form ─────────────────────────────────────── */
  function openEditDrawer(type, item) {
    _state.editing = { type: type, data: item ? copy(item) : {} };
    _state.dirty = false;

    var drawer = document.getElementById('adm-brand-drawer');
    var title = document.getElementById('adm-drawer-title');
    var body = document.getElementById('adm-drawer-body');
    if (!drawer || !body) return;

    if (type === 'brand') {
      title.textContent = item && item.id ? 'Markayı düzenle' : 'Yeni marka';
      body.innerHTML = '';
      body.appendChild(buildBrandForm(_state.editing.data));
    } else {
      title.textContent = item && item.id ? 'Grubu düzenle' : 'Yeni grup';
      body.innerHTML = '';
      body.appendChild(buildCompanyForm(_state.editing.data));
    }
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer(force) {
    if (!force && _state.dirty) {
      if (!window.confirm('Kaydedilmemiş değişiklikler var. Kapatılsın mı?')) return;
    }
    var drawer = document.getElementById('adm-brand-drawer');
    if (drawer) {
      drawer.hidden = true;
      drawer.setAttribute('aria-hidden', 'true');
    }
    _state.editing = null;
    _state.dirty = false;
  }

  function copy(o) {
    var r = {};
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    return r;
  }

  function markDirty() { _state.dirty = true; }

  function field(label) {
    var wrap = el('div', 'adm-form-field');
    wrap.appendChild(el('label', null, label));
    return wrap;
  }

  function textInput(label, value, key, onInput, type) {
    var f = field(label);
    var i = document.createElement('input');
    i.type = type || 'text';
    i.value = value == null ? '' : value;
    i.setAttribute('data-field', key);
    i.addEventListener('input', function () {
      markDirty();
      if (onInput) onInput(i.value);
    });
    f.appendChild(i);
    return f;
  }

  function textareaInput(label, value, key) {
    var f = field(label);
    var t = document.createElement('textarea');
    t.rows = 3;
    t.value = value == null ? '' : value;
    t.setAttribute('data-field', key);
    t.addEventListener('input', markDirty);
    f.appendChild(t);
    return f;
  }

  function selectInput(label, value, key, options) {
    var f = field(label);
    var s = document.createElement('select');
    s.setAttribute('data-field', key);
    for (var i = 0; i < options.length; i++) {
      var o = document.createElement('option');
      o.value = options[i].value;
      o.textContent = options[i].label;
      if (options[i].value === value || (value == null && options[i].value === '')) o.selected = true;
      s.appendChild(o);
    }
    s.addEventListener('change', markDirty);
    f.appendChild(s);
    return f;
  }

  function checkInput(label, value, key) {
    var wrap = el('label', 'adm-form-check');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!value;
    cb.setAttribute('data-field', key);
    cb.addEventListener('change', markDirty);
    wrap.appendChild(cb);
    wrap.appendChild(document.createTextNode(' ' + label));
    return wrap;
  }

  function colorInput(label, value, key) {
    var f = field(label);
    var row = el('div', 'adm-form-color');
    var c = document.createElement('input');
    c.type = 'color';
    c.value = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#1E2D5E';
    c.setAttribute('data-field', key);
    var hex = document.createElement('input');
    hex.type = 'text';
    hex.value = value || '';
    hex.placeholder = '#RRGGBB';
    hex.setAttribute('data-field-hex', key);
    c.addEventListener('input', function () { hex.value = c.value; markDirty(); });
    hex.addEventListener('input', function () {
      markDirty();
      if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) c.value = hex.value;
    });
    row.appendChild(c);
    row.appendChild(hex);
    f.appendChild(row);
    return f;
  }

  function uploadField(label, aspectRatio, outW, outH, pathPrefix, currentUrl, key, getFilenameHint) {
    var f = field(label);
    var wrap = el('div', 'adm-form-upload');
    var preview = el('div', 'adm-form-upload__preview');
    if (aspectRatio !== 1) preview.classList.add('adm-form-upload__preview--cover');
    if (currentUrl) {
      var img = document.createElement('img');
      img.src = currentUrl;
      preview.appendChild(img);
    } else {
      preview.appendChild(el('span', 'adm-form-upload__empty', 'YOK'));
    }
    wrap.appendChild(preview);

    var info = el('div', 'adm-form-upload__info');
    var urlHidden = document.createElement('input');
    urlHidden.type = 'text';
    urlHidden.value = currentUrl || '';
    urlHidden.placeholder = 'https://...';
    urlHidden.setAttribute('data-field', key);
    urlHidden.addEventListener('input', markDirty);
    info.appendChild(urlHidden);

    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/jpeg,image/png,image/webp';
    picker.style.marginTop = '8px';
    picker.addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      if (!window.htImageEditor || !window.htImageEditor.open) {
        showToast('Image editor yüklenemedi', 'error');
        return;
      }
      window.htImageEditor.open({
        file: file,
        aspectRatio: aspectRatio,
        outputWidth: outW,
        outputHeight: outH,
        outputFormat: 'webp',
        quality: 0.9,
        onSave: function (blob) {
          var hint = getFilenameHint() || ('brand-' + Date.now());
          var path = pathPrefix + '/' + hint + '-' + Date.now() + '.webp';
          window.htImageEditor.upload(blob, path).then(function (publicUrl) {
            if (!publicUrl) {
              showToast('Yükleme başarısız', 'error');
              return;
            }
            urlHidden.value = publicUrl;
            markDirty();
            preview.innerHTML = '';
            var im = document.createElement('img');
            im.src = publicUrl;
            preview.appendChild(im);
            showToast('Görsel yüklendi', 'success');
          }).catch(function (err) {
            console.error('[markalar] upload failed', err);
            showToast('Yükleme hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
          });
        }
      });
      picker.value = '';
    });
    info.appendChild(picker);
    var hint = el('small', null, 'Önerilen boyut: ' + outW + '×' + outH);
    info.appendChild(hint);
    wrap.appendChild(info);
    f.appendChild(wrap);
    return f;
  }

  function segmentOptions() {
    var opts = [{ value: '', label: '— seçiniz —' }];
    for (var i = 0; i < SEGMENTS.length; i++) opts.push({ value: SEGMENTS[i], label: SEGMENTS[i] });
    return opts;
  }

  function companyOptions() {
    var opts = [{ value: '', label: '— grup seç —' }];
    for (var i = 0; i < _state.companies.length; i++) {
      opts.push({ value: String(_state.companies[i].id), label: _state.companies[i].company_name });
    }
    return opts;
  }

  function buildBrandForm(data) {
    var container = document.createElement('div');
    var slugAuto = !data.slug;

    container.appendChild(el('div', 'adm-section-title', 'Temel Bilgiler'));

    var nameField = textInput('Marka Adı', data.brand_name, 'brand_name', function (v) {
      if (slugAuto) {
        var slugField = container.querySelector('input[data-field="slug"]');
        if (slugField) slugField.value = slugify(v);
      }
    });
    container.appendChild(nameField);

    var slugField = textInput('Slug', data.slug, 'slug', function () { slugAuto = false; });
    container.appendChild(slugField);

    var row1 = el('div', 'adm-form-row');
    row1.appendChild(selectInput('Segment', data.segment, 'segment', segmentOptions()));
    row1.appendChild(selectInput('Ana Grup', data.company_id != null ? String(data.company_id) : '', 'company_id', companyOptions()));
    container.appendChild(row1);

    container.appendChild(textareaInput('Kısa Açıklama', data.short_description, 'short_description'));

    container.appendChild(el('div', 'adm-section-title', 'Lokasyon ve Ölçek'));
    var row2 = el('div', 'adm-form-row');
    row2.appendChild(textInput('Merkez Şehir', data.hq_city, 'hq_city'));
    row2.appendChild(textInput('Mağaza Sayısı (TR)', data.store_count_tr, 'store_count_tr', null, 'number'));
    container.appendChild(row2);

    var row3 = el('div', 'adm-form-row');
    row3.appendChild(textInput('Çalışan Sayısı (TR)', data.employee_count_tr, 'employee_count_tr', null, 'number'));
    var cities = Array.isArray(data.store_cities) ? data.store_cities.join(', ') : '';
    row3.appendChild(textInput('Şehirler (virgülle)', cities, 'store_cities'));
    container.appendChild(row3);

    container.appendChild(el('div', 'adm-section-title', 'Linkler'));
    container.appendChild(textInput('Website', data.website_url, 'website_url', null, 'url'));
    container.appendChild(textInput('Instagram', data.instagram_url, 'instagram_url', null, 'url'));

    container.appendChild(el('div', 'adm-section-title', 'Görseller'));
    container.appendChild(uploadField(
      'Logo (1:1 · 1024×1024)',
      1, 1024, 1024,
      'logos',
      data.logo_url,
      'logo_url',
      function () { return slugify(getFormValue(container, 'slug') || getFormValue(container, 'brand_name')); }
    ));
    container.appendChild(uploadField(
      'Kapak (16:9 · 1600×900)',
      16 / 9, 1600, 900,
      'covers',
      data.cover_image_url,
      'cover_image_url',
      function () { return slugify(getFormValue(container, 'slug') || getFormValue(container, 'brand_name')); }
    ));

    container.appendChild(el('div', 'adm-section-title', 'Görünüm'));
    container.appendChild(colorInput('Vurgu Rengi', data.accent_color, 'accent_color'));
    container.appendChild(checkInput('Öne çıkan (is_featured)', data.is_featured, 'is_featured'));
    container.appendChild(checkInput('Aktif (is_active)', data.is_active !== false, 'is_active'));

    if (data.id) {
      var idHidden = document.createElement('input');
      idHidden.type = 'hidden';
      idHidden.value = data.id;
      idHidden.setAttribute('data-field', 'id');
      container.appendChild(idHidden);
    }
    return container;
  }

  function buildCompanyForm(data) {
    var container = document.createElement('div');
    var slugAuto = !data.slug;

    container.appendChild(el('div', 'adm-section-title', 'Grup Bilgileri'));
    container.appendChild(textInput('Grup Adı', data.company_name, 'company_name', function (v) {
      if (slugAuto) {
        var slugField = container.querySelector('input[data-field="slug"]');
        if (slugField) slugField.value = slugify(v);
      }
    }));
    container.appendChild(textInput('Slug', data.slug, 'slug', function () { slugAuto = false; }));
    container.appendChild(textInput('Yasal Ünvan', data.legal_name, 'legal_name'));

    var row1 = el('div', 'adm-form-row');
    row1.appendChild(textInput('Sektör', data.industry, 'industry'));
    row1.appendChild(selectInput('Segment', data.segment, 'segment', segmentOptions()));
    container.appendChild(row1);

    container.appendChild(textareaInput('Kısa Açıklama', data.short_description, 'short_description'));

    container.appendChild(el('div', 'adm-section-title', 'Linkler'));
    container.appendChild(textInput('Website', data.website_url, 'website_url', null, 'url'));
    container.appendChild(textInput('Kariyer', data.career_url, 'career_url', null, 'url'));
    container.appendChild(textInput('LinkedIn', data.linkedin_url, 'linkedin_url', null, 'url'));

    container.appendChild(el('div', 'adm-section-title', 'Logo'));
    container.appendChild(uploadField(
      'Logo (1:1 · 1024×1024)',
      1, 1024, 1024,
      'logos',
      data.logo_url,
      'logo_url',
      function () { return 'group-' + slugify(getFormValue(container, 'slug') || getFormValue(container, 'company_name')); }
    ));

    container.appendChild(el('div', 'adm-section-title', 'Durum'));
    container.appendChild(checkInput('Aktif (is_active)', data.is_active !== false, 'is_active'));

    if (data.id) {
      var idHidden = document.createElement('input');
      idHidden.type = 'hidden';
      idHidden.value = data.id;
      idHidden.setAttribute('data-field', 'id');
      container.appendChild(idHidden);
    }
    return container;
  }

  function getFormValue(container, key) {
    var e = container.querySelector('[data-field="' + key + '"]');
    if (!e) return null;
    if (e.type === 'checkbox') return e.checked;
    return e.value;
  }

  function collectFormValues() {
    var body = document.getElementById('adm-drawer-body');
    if (!body) return {};
    var fields = body.querySelectorAll('[data-field]');
    var payload = {};
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var key = f.getAttribute('data-field');
      if (!key) continue;
      if (f.type === 'checkbox') payload[key] = f.checked;
      else payload[key] = f.value;
    }
    return payload;
  }

  /* ── Save flows ──────────────────────────────────────── */
  function saveCurrent() {
    if (!_state.editing) return;
    if (_state.editing.type === 'brand') saveBrand();
    else saveCompany();
  }

  function saveBrand() {
    var raw = collectFormValues();
    if (!raw.brand_name) { showToast('Marka adı gerekli', 'error'); return; }

    var payload = {
      brand_name: raw.brand_name || null,
      slug: raw.slug || slugify(raw.brand_name),
      segment: raw.segment || null,
      company_id: raw.company_id || null,
      short_description: raw.short_description || null,
      hq_city: raw.hq_city || null,
      store_count_tr: raw.store_count_tr || null,
      employee_count_tr: raw.employee_count_tr || null,
      website_url: raw.website_url || null,
      instagram_url: raw.instagram_url || null,
      logo_url: raw.logo_url || null,
      cover_image_url: raw.cover_image_url || null,
      accent_color: raw.accent_color || null,
      is_featured: !!raw.is_featured,
      is_active: raw.is_active !== false
    };
    if (raw.store_cities) {
      payload.store_cities = String(raw.store_cities).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (raw.id) payload.id = raw.id;

    var btn = document.getElementById('adm-drawer-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    supa().rpc('admin_upsert_brand', { payload: payload }).then(function (res) {
      if (res.error) throw res.error;
      showToast('Marka kaydedildi', 'success');
      closeDrawer(true);
      refreshAll();
    }).catch(function (err) {
      console.error('[markalar] saveBrand error', err);
      showToast('Kayıt hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Kaydet'; }
    });
  }

  function saveCompany() {
    var raw = collectFormValues();
    if (!raw.company_name) { showToast('Grup adı gerekli', 'error'); return; }

    var payload = {
      company_name: raw.company_name || null,
      slug: raw.slug || slugify(raw.company_name),
      legal_name: raw.legal_name || null,
      industry: raw.industry || null,
      segment: raw.segment || null,
      short_description: raw.short_description || null,
      website_url: raw.website_url || null,
      career_url: raw.career_url || null,
      linkedin_url: raw.linkedin_url || null,
      logo_url: raw.logo_url || null,
      is_active: raw.is_active !== false
    };
    if (raw.id) payload.id = raw.id;

    var btn = document.getElementById('adm-drawer-save');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    supa().rpc('admin_upsert_company', { payload: payload }).then(function (res) {
      if (res.error) throw res.error;
      showToast('Grup kaydedildi', 'success');
      closeDrawer(true);
      refreshAll();
    }).catch(function (err) {
      console.error('[markalar] saveCompany error', err);
      showToast('Kayıt hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Kaydet'; }
    });
  }

  /* ── Archive / restore ───────────────────────────────── */
  function archiveBrand(id, name) {
    if (!window.confirm('"' + (name || 'bu marka') + '" arşivlensin mi?')) return;
    supa().rpc('admin_archive_brand', { p_id: id }).then(function (res) {
      if (res.error) throw res.error;
      showToast('Marka arşivlendi', 'success');
      refreshAll();
    }).catch(function (err) {
      console.error('[markalar] archiveBrand error', err);
      showToast('Arşivleme hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    });
  }

  function restoreBrand(id) {
    supa().rpc('admin_restore_brand', { p_id: id }).then(function (res) {
      if (res.error) throw res.error;
      showToast('Marka geri yüklendi', 'success');
      refreshAll();
    }).catch(function (err) {
      console.error('[markalar] restoreBrand error', err);
      showToast('Geri yükleme hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    });
  }

  function archiveCompany(id, name) {
    if (!window.confirm('"' + (name || 'bu grup') + '" arşivlensin mi? (Bağlı markalar OTOMATİK arşivlenmez — ayrıca arşivlemen gerekir.)')) return;
    supa().rpc('admin_archive_company', { p_id: id }).then(function (res) {
      if (res.error) throw res.error;
      showToast('Grup arşivlendi', 'success');
      refreshAll();
    }).catch(function (err) {
      console.error('[markalar] archiveCompany error', err);
      showToast('Arşivleme hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    });
  }

  function restoreCompany(id) {
    supa().rpc('admin_restore_company', { p_id: id }).then(function (res) {
      if (res.error) throw res.error;
      showToast('Grup geri yüklendi', 'success');
      refreshAll();
    }).catch(function (err) {
      console.error('[markalar] restoreCompany error', err);
      showToast('Geri yükleme hatası: ' + (err && err.message ? err.message : 'bilinmeyen'), 'error');
    });
  }

  /* ── Wiring ──────────────────────────────────────────── */
  function wire() {
    var panel = document.getElementById('panel-brands');
    if (!panel || panel.dataset.wired === '1') return;
    panel.dataset.wired = '1';

    var tabs = panel.querySelectorAll('.adm-brands-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (t) {
        t.addEventListener('click', function () {
          var name = t.getAttribute('data-brands-tab');
          if (!name) return;
          _state.tab = name;
          render();
        });
      })(tabs[i]);
    }

    var addBtn = document.getElementById('adm-brands-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (_state.tab === 'companies') openEditDrawer('company', null);
        else openEditDrawer('brand', null);
      });
    }

    var search = document.getElementById('adm-brands-search');
    if (search) {
      search.addEventListener('input', function () {
        _state.searchQuery = search.value || '';
        renderList();
      });
    }

    var closeBtn = document.getElementById('adm-drawer-close');
    var cancelBtn = document.getElementById('adm-drawer-cancel');
    var overlay = document.getElementById('adm-drawer-overlay');
    var saveBtn = document.getElementById('adm-drawer-save');
    if (closeBtn) closeBtn.addEventListener('click', function () { closeDrawer(false); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeDrawer(false); });
    if (overlay) overlay.addEventListener('click', function () { closeDrawer(false); });
    if (saveBtn) saveBtn.addEventListener('click', saveCurrent);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var drawer = document.getElementById('adm-brand-drawer');
        if (drawer && !drawer.hidden) closeDrawer(false);
      }
    });
  }

  function openPanel() {
    wire();
    if (!_state.loaded) refreshAll();
    else render();
  }

  /* ── Public API ──────────────────────────────────────── */
  window._htAdminMarkalar = {
    open: openPanel,
    refresh: refreshAll,
    version: '1.0.0'
  };

  /* Auto-wire once DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
