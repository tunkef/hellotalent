/* ═══════════════════════════════════════════════════════════════
   ADMIN STUDIO MODULES — Studio content management (Performans + Bilgiler)
   Lazy-loaded via window._htAdminLoadStudioModules()
   Pattern: matches admin-coach-content.js (IIFE, var, DOM APIs)
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var loaded = false;
var _modules = [];
var _currentSection = 'all';
var _editingId = null;

var SECTION_LABELS = {
  performans: 'Performans',
  bilgiler: 'HelloTalent\u2019ten Bilgiler'
};

var TYPE_LABELS = {
  article: 'Makale',
  video: 'Video',
  carousel: 'Carousel',
  lesson: 'Ders'
};

var STATUS_LABELS = {
  draft: 'Taslak',
  published: 'Yay\u0131nda',
  archived: 'Ar\u015fivlendi'
};

var STATUS_CSS = {
  draft: 'draft',
  published: 'approved',
  archived: 'ended'
};

// ── HELPERS ──

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function formatDate(d) {
  if (!d) return '\u2014';
  var dt = new Date(d);
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSupa() {
  return window._htAdminSupa;
}

// ── PUBLIC LOADER ──

window._htAdminLoadStudioModules = async function(forceRefresh) {
  var container = document.getElementById('studio-modules-content');
  if (!container) return;
  if (loaded && !forceRefresh) {
    if (!_editingId) renderList(container);
    return;
  }
  loaded = true;
  _editingId = null;
  await renderList(container);
};

// ── LIST VIEW ──

async function renderList(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
  _editingId = null;

  // Section filter tabs + New button
  var toolbar = el('div');
  toolbar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;';

  var tabBar = el('div', 'acc-tabs');
  var sections = [
    { key: 'all', label: 'T\u00fcm\u00fc' },
    { key: 'performans', label: 'Performans' },
    { key: 'bilgiler', label: 'Bilgiler' }
  ];
  for (var f = 0; f < sections.length; f++) {
    var tab = el('button', 'acc-tab' + (_currentSection === sections[f].key ? ' active' : ''), sections[f].label);
    tab.addEventListener('click', (function(key) {
      return function() { _currentSection = key; renderList(container); };
    })(sections[f].key));
    tabBar.appendChild(tab);
  }
  toolbar.appendChild(tabBar);

  var newBtn = el('button', 'btn btn-primary', '+ Yeni Mod\u00fcl');
  newBtn.addEventListener('click', function() { renderEditor(container, null); });
  toolbar.appendChild(newBtn);
  container.appendChild(toolbar);

  // Loading
  var loadEl = el('div', '', 'Y\u00fckleniyor\u2026');
  loadEl.style.cssText = 'text-align:center;padding:24px;color:var(--muted);font-size:13px;';
  container.appendChild(loadEl);

  // Fetch
  var supa = getSupa();
  if (!supa) return;

  try {
    var query = supa.from('studio_modules')
      .select('id, section, module_type, slug, title, status, sort_order, duration_minutes, published_at, created_at, updated_at')
      .order('sort_order', { ascending: true });

    if (_currentSection !== 'all') {
      query = query.eq('section', _currentSection);
    }

    var res = await query;
    container.removeChild(loadEl);

    if (res.error) {
      container.appendChild(el('div', '', 'Mod\u00fcller y\u00fcklenemedi: ' + res.error.message));
      return;
    }

    _modules = res.data || [];

    if (_modules.length === 0) {
      var emptyEl = el('div', 'empty-state');
      emptyEl.style.cssText = 'padding:60px 20px;text-align:center;';
      emptyEl.appendChild(el('div', 'empty-state-text', 'Bu filtrede mod\u00fcl bulunmuyor.'));
      var emptyBtn = el('button', 'btn btn-primary', '+ Yeni Mod\u00fcl Olu\u015ftur');
      emptyBtn.style.marginTop = '12px';
      emptyBtn.addEventListener('click', function() { renderEditor(container, null); });
      emptyEl.appendChild(emptyBtn);
      container.appendChild(emptyEl);
      return;
    }

    // Table
    var table = el('table', 'admin-table');
    var thead = el('thead');
    var hrow = el('tr');
    var headers = ['S\u0131ra', 'Ba\u015fl\u0131k', 'B\u00f6l\u00fcm', 'Tip', 'Durum', 'Tarih', ''];
    for (var h = 0; h < headers.length; h++) {
      hrow.appendChild(el('th', '', headers[h]));
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    var tbody = el('tbody');
    for (var i = 0; i < _modules.length; i++) {
      var m = _modules[i];
      var tr = el('tr');

      // Sort order
      var tdSort = el('td');
      tdSort.style.cssText = 'font-family:"DM Mono",monospace;font-size:12px;color:var(--muted);';
      tdSort.textContent = m.sort_order;
      tr.appendChild(tdSort);

      // Title
      var tdTitle = el('td');
      tdTitle.style.cssText = 'font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      tdTitle.textContent = m.title;
      tr.appendChild(tdTitle);

      // Section
      tr.appendChild(el('td', '', SECTION_LABELS[m.section] || m.section));

      // Type
      tr.appendChild(el('td', '', TYPE_LABELS[m.module_type] || m.module_type));

      // Status
      var tdStatus = el('td');
      var pill = el('span', 'status-pill ' + (STATUS_CSS[m.status] || 'draft'), STATUS_LABELS[m.status] || m.status);
      tdStatus.appendChild(pill);
      tr.appendChild(tdStatus);

      // Date
      var tdDate = el('td');
      tdDate.style.cssText = 'font-size:12px;color:var(--muted);white-space:nowrap;';
      tdDate.textContent = formatDate(m.status === 'published' ? m.published_at : m.updated_at);
      tr.appendChild(tdDate);

      // Actions
      var tdActions = el('td');
      tdActions.style.cssText = 'white-space:nowrap;';
      var editBtn = el('button', 'btn btn-sm', 'D\u00fczenle');
      editBtn.addEventListener('click', (function(mod) {
        return function() { loadAndEdit(container, mod.id); };
      })(m));
      tdActions.appendChild(editBtn);

      if (m.status === 'draft' || m.status === 'archived') {
        var pubBtn = el('button', 'btn btn-sm btn-approve', 'Yay\u0131nla');
        pubBtn.style.marginLeft = '6px';
        pubBtn.addEventListener('click', (function(mod) {
          return function() { doPublish(mod.id, container); };
        })(m));
        tdActions.appendChild(pubBtn);
      }

      if (m.status === 'published') {
        var archBtn = el('button', 'btn btn-sm btn-reject', 'Ar\u015fivle');
        archBtn.style.marginLeft = '6px';
        archBtn.addEventListener('click', (function(mod) {
          return function() { doArchive(mod.id, container); };
        })(m));
        tdActions.appendChild(archBtn);
      }

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);

  } catch (e) {
    container.removeChild(loadEl);
    console.error('studio_modules load error:', e);
    container.appendChild(el('div', '', 'Bir hata olu\u015ftu.'));
  }
}

// ── EDITOR VIEW ──

async function loadAndEdit(container, moduleId) {
  var supa = getSupa();
  var res = await supa.from('studio_modules').select('*').eq('id', moduleId).maybeSingle();
  if (res.error || !res.data) {
    window.alert('Mod\u00fcl y\u00fcklenemedi.');
    return;
  }
  renderEditor(container, res.data);
}

function renderEditor(container, mod) {
  while (container.firstChild) container.removeChild(container.firstChild);
  _editingId = mod ? mod.id : null;
  var isNew = !mod;

  // Back
  var backBtn = el('button', 'btn btn-sm', '\u2190 Mod\u00fcl Listesi');
  backBtn.addEventListener('click', function() { renderList(container); });
  container.appendChild(backBtn);

  var title = el('h3');
  title.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:700;margin:16px 0 12px;';
  title.textContent = isNew ? 'Yeni Mod\u00fcl' : 'Mod\u00fcl D\u00fczenle';
  container.appendChild(title);

  var form = el('div');
  form.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;';

  // Section
  form.appendChild(makeSelect('sm-section', 'B\u00f6l\u00fcm', [
    { value: 'performans', label: 'Performans' },
    { value: 'bilgiler', label: 'HelloTalent\'ten Bilgiler' }
  ], mod ? mod.section : 'performans'));

  // Type
  form.appendChild(makeSelect('sm-type', 'Tip', [
    { value: 'article', label: 'Makale' },
    { value: 'video', label: 'Video' },
    { value: 'carousel', label: 'Carousel' },
    { value: 'lesson', label: 'Ders' }
  ], mod ? mod.module_type : 'article'));

  // Title
  form.appendChild(makeInput('sm-title', 'Ba\u015fl\u0131k', mod ? mod.title : '', 'span2'));

  // Slug
  form.appendChild(makeInput('sm-slug', 'Slug (URL)', mod ? mod.slug : ''));

  // Sort order
  form.appendChild(makeInput('sm-sort', 'S\u0131ra', mod ? String(mod.sort_order) : '0', '', 'number'));

  // Duration
  form.appendChild(makeInput('sm-duration', 'S\u00fcre (dk)', mod && mod.duration_minutes ? String(mod.duration_minutes) : '', '', 'number'));

  // CTA Label
  form.appendChild(makeInput('sm-cta-label', 'CTA Etiket', mod ? (mod.cta_label || '') : ''));

  // Summary
  form.appendChild(makeTextarea('sm-summary', '\u00d6zet', mod ? (mod.summary || '') : '', 'span2'));

  // Body
  form.appendChild(makeTextarea('sm-body', '\u0130\u00e7erik (Markdown)', mod ? (mod.body_md || '') : '', 'span2', 120));

  // Cover image URL
  form.appendChild(makeInput('sm-cover', 'Kapak G\u00f6rseli URL', mod ? (mod.cover_image_url || '') : '', 'span2'));

  // CTA URL
  form.appendChild(makeInput('sm-cta-url', 'CTA URL', mod ? (mod.cta_url || '') : '', 'span2'));

  container.appendChild(form);

  // Error
  var errDiv = el('div');
  errDiv.id = 'sm-error';
  errDiv.style.cssText = 'color:#ef4444;font-size:13px;display:none;margin-bottom:10px;';
  container.appendChild(errDiv);

  // Save button
  var saveRow = el('div');
  saveRow.style.cssText = 'display:flex;gap:10px;';
  var saveBtn = el('button', 'btn btn-primary', isNew ? 'Olu\u015ftur' : 'Kaydet');
  saveBtn.addEventListener('click', function() { doSave(container, mod); });
  saveRow.appendChild(saveBtn);

  if (!isNew && mod.status === 'draft') {
    var savePubBtn = el('button', 'btn btn-approve', 'Kaydet ve Yay\u0131nla');
    savePubBtn.addEventListener('click', function() { doSave(container, mod, true); });
    saveRow.appendChild(savePubBtn);
  }

  container.appendChild(saveRow);
}

function makeInput(id, label, value, spanClass, type) {
  var wrap = el('div');
  if (spanClass === 'span2') wrap.style.gridColumn = 'span 2';
  var lbl = el('label', '', label);
  lbl.style.cssText = 'display:block;font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;';
  wrap.appendChild(lbl);
  var inp = document.createElement('input');
  inp.type = type || 'text';
  inp.id = id;
  inp.value = value || '';
  inp.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box;';
  wrap.appendChild(inp);
  return wrap;
}

function makeTextarea(id, label, value, spanClass, minH) {
  var wrap = el('div');
  if (spanClass === 'span2') wrap.style.gridColumn = 'span 2';
  var lbl = el('label', '', label);
  lbl.style.cssText = 'display:block;font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;';
  wrap.appendChild(lbl);
  var ta = document.createElement('textarea');
  ta.id = id;
  ta.value = value || '';
  ta.style.cssText = 'width:100%;min-height:' + (minH || 60) + 'px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;box-sizing:border-box;';
  wrap.appendChild(ta);
  return wrap;
}

function makeSelect(id, label, options, selected) {
  var wrap = el('div');
  var lbl = el('label', '', label);
  lbl.style.cssText = 'display:block;font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px;';
  wrap.appendChild(lbl);
  var sel = document.createElement('select');
  sel.id = id;
  sel.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px;';
  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].value;
    opt.textContent = options[i].label;
    if (options[i].value === selected) opt.selected = true;
    sel.appendChild(opt);
  }
  wrap.appendChild(sel);
  return wrap;
}

// ── ACTIONS ──

async function doSave(container, existingMod, publishAfter) {
  var errDiv = document.getElementById('sm-error');
  var title = (document.getElementById('sm-title') || {}).value || '';
  var slug = (document.getElementById('sm-slug') || {}).value || '';

  if (!title.trim()) {
    if (errDiv) { errDiv.textContent = 'Ba\u015fl\u0131k zorunlu.'; errDiv.style.display = 'block'; }
    return;
  }
  if (!slug.trim()) {
    if (errDiv) { errDiv.textContent = 'Slug zorunlu.'; errDiv.style.display = 'block'; }
    return;
  }
  if (errDiv) errDiv.style.display = 'none';

  var supa = getSupa();
  var section = (document.getElementById('sm-section') || {}).value || 'performans';
  var moduleType = (document.getElementById('sm-type') || {}).value || 'article';
  var sortOrder = parseInt((document.getElementById('sm-sort') || {}).value, 10) || 0;
  var duration = parseInt((document.getElementById('sm-duration') || {}).value, 10) || null;
  var summary = (document.getElementById('sm-summary') || {}).value || null;
  var bodyMd = (document.getElementById('sm-body') || {}).value || null;
  var cover = (document.getElementById('sm-cover') || {}).value || null;
  var ctaLabel = (document.getElementById('sm-cta-label') || {}).value || null;
  var ctaUrl = (document.getElementById('sm-cta-url') || {}).value || null;

  if (!existingMod) {
    // Create
    var res = await supa.rpc('admin_create_studio_module', {
      p_section: section,
      p_module_type: moduleType,
      p_title: title.trim(),
      p_slug: slug.trim(),
      p_summary: summary,
      p_body_md: bodyMd,
      p_cover_image_url: cover,
      p_duration_minutes: duration,
      p_cta_label: ctaLabel,
      p_cta_url: ctaUrl,
      p_sort_order: sortOrder
    });
    if (res.error) {
      if (errDiv) { errDiv.textContent = 'Hata: ' + res.error.message; errDiv.style.display = 'block'; }
      return;
    }
    var newId = res.data;
    if (publishAfter && newId) {
      await supa.rpc('admin_publish_studio_module', { p_id: newId });
    }
  } else {
    // Update
    var data = {
      section: section,
      module_type: moduleType,
      title: title.trim(),
      slug: slug.trim(),
      summary: summary,
      body_md: bodyMd,
      cover_image_url: cover,
      duration_minutes: duration ? String(duration) : null,
      cta_label: ctaLabel,
      cta_url: ctaUrl,
      sort_order: String(sortOrder)
    };
    var res2 = await supa.rpc('admin_update_studio_module', {
      p_id: existingMod.id,
      p_data: data
    });
    if (res2.error) {
      if (errDiv) { errDiv.textContent = 'Hata: ' + res2.error.message; errDiv.style.display = 'block'; }
      return;
    }
    if (publishAfter) {
      await supa.rpc('admin_publish_studio_module', { p_id: existingMod.id });
    }
  }

  renderList(container);
}

async function doPublish(moduleId, container) {
  var supa = getSupa();
  var res = await supa.rpc('admin_publish_studio_module', { p_id: moduleId });
  if (res.error) {
    window.alert('Hata: ' + res.error.message);
    return;
  }
  renderList(container);
}

async function doArchive(moduleId, container) {
  if (!window.confirm('Bu mod\u00fcl\u00fc ar\u015fivlemek istedi\u011finize emin misiniz?')) return;
  var supa = getSupa();
  var res = await supa.rpc('admin_archive_studio_module', { p_id: moduleId });
  if (res.error) {
    window.alert('Hata: ' + res.error.message);
    return;
  }
  renderList(container);
}

})();
