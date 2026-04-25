/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Pool (Sprint 2 / FAZ B)

   Sorumluluklar:
   1. Auth gate (HRShell entegrasyonu)
   2. Position context: HRShell sessionStorage (Sprint 1 ile share)
   3. Adapter: HRData.searchCandidates(filters, sort, pagination)
   4. Render: sortable inbox-list, multi-select checkbox + tek tıkla "+ Ekle"
   5. Filter state: search (debounce 300ms) + 4 chip + sort key + selectedIds Set
   6. Pagination: 20'sar, "Daha Göster" page++
   7. Bulk action: selectedIds.size > 0 → toolbar göster → "Pipeline'a Ekle"
   8. Drawer: aday kart click (Sprint 1 ortak pattern)

   SOLID:
   - SRP: bu dosya sadece havuz panel.
   - DIP: HRData adapter interface'i (real/demo soyut).
   - OCP: yeni filter chip → FILTER_DEFS dizisine yeni satir.

   XSS: tum dinamik metin DOM API (textContent / createElement) ile basilir.
   innerHTML KULLANILMAZ. SVG sadece statik string'lerden parse edilir.
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── Constants ────────────────────────────────── */
  var PAGE_SIZE = 20;
  var SEARCH_DEBOUNCE_MS = 300;
  var DRAWER_BREAKPOINT = 900;

  // Filter chip tanimi — tek noktada acilir
  var FILTER_DEFS = [
    { key: 'sehir',       label: 'Şehir',     field: 'sehir',         type: 'string' },
    { key: 'pozisyon',    label: 'Pozisyon',  field: 'pozisyon',      type: 'string' },
    { key: 'segment',     label: 'Segment',   field: 'segment',       type: 'string', renderValue: segmentLabel },
    { key: 'musaitlik',   label: 'Müsaitlik', field: 'musaitlik',     type: 'string' }
  ];

  // Sort secenekleri
  var SORT_OPTIONS = [
    { key: 'match',     label: 'Eşleşme',     dir: 'desc' },
    { key: 'updated',   label: 'Son aktivite', dir: 'desc' },
    { key: 'name',      label: 'İsim (A→Z)',   dir: 'asc'  },
    { key: 'experience', label: 'Deneyim',     dir: 'desc' }
  ];

  /* ── State ────────────────────────────────────── */
  var _state = {
    positions: [],
    activePositionId: null,
    allCandidates: [],         // filtre oncesi tam liste
    pipelineByCandidate: {},   // { candidate_id: pipeline_row } — Sprint 1 ile share
    filteredRows: [],          // search + chip + sort sonrasi
    visibleCount: PAGE_SIZE,   // pagination cursor
    isMobile: false,
    drawerOpen: false,
    sortKey: 'match',
    searchQ: '',
    activeFilters: {},         // { sehir: 'İstanbul', segment: 'luks', ... }
    selectedIds: Object.create(null), // Set-like { 'c-001': true }
    selectedCount: 0,
    activeChipMenu: null,
    sortMenuOpen: false
  };

  var _searchDebounceTimer = null;

  /* ── Utilities ────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function clearChildren(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }
  function svgIcon(svgString) {
    // Static, hardcoded SVG'leri parse edip DOM node'a cevirir.
    var p = new DOMParser();
    var doc = p.parseFromString('<div xmlns="http://www.w3.org/1999/xhtml">' + svgString + '</div>', 'text/html');
    var src = doc.body.firstChild;
    var frag = document.createDocumentFragment();
    while (src && src.firstChild) frag.appendChild(src.firstChild);
    return frag;
  }
  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    var f = parts[0] ? parts[0].charAt(0) : '';
    var l = parts[1] ? parts[1].charAt(0) : '';
    return (f + l).toUpperCase() || '?';
  }
  function isMobileViewport() {
    return window.innerWidth <= DRAWER_BREAKPOINT;
  }
  function trLower(s) {
    if (!s) return '';
    return String(s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  }
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }
  function segmentLabel(s) {
    if (s === 'luks') return 'Lüks';
    if (s === 'premium') return 'Premium';
    if (s === 'high-street') return 'High-street';
    return s || '—';
  }
  function pluralAday(n) {
    return n + ' aday';
  }
  function relativeTimeTr(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      var now = Date.now();
      var diffMs = now - d.getTime();
      var diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'şimdi';
      if (diffMin < 60) return diffMin + ' dk önce';
      var diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return diffH + ' sa önce';
      var diffD = Math.floor(diffH / 24);
      if (diffD < 7) return diffD + ' gün önce';
      var diffW = Math.floor(diffD / 7);
      if (diffW < 5) return diffW + ' hafta önce';
      var diffMo = Math.floor(diffD / 30);
      return diffMo + ' ay önce';
    } catch (e) {
      return '—';
    }
  }
  function computeMatchScore(candidate, position) {
    if (!candidate) return null;
    if (!position) {
      // Pozisyon secilmediyse sadece is_active baz puan
      return candidate.is_active ? 60 : 40;
    }
    var score = 50;
    if (candidate.segment === position.segment) score += 20;
    if (candidate.sehir === position.city) score += 15;
    if (position.title && candidate.pozisyon &&
        position.title.toLowerCase().indexOf(candidate.pozisyon.toLowerCase()) !== -1) {
      score += 12;
    }
    if (score > 99) score = 99;
    return score;
  }
  function matchTier(score) {
    if (score == null) return 'low';
    if (score >= 80) return 'high';
    if (score >= 60) return 'mid';
    return 'low';
  }

  /* ── Static SVG strings (XSS-safe) ─────────────── */
  var ICON_PLUS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  var ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var ICON_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  var ICON_X = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ── Toast (Sprint 1 ortak) ────────────────────── */
  var _toastTimer = null;
  function toast(msg, isErr) {
    var t = $('[data-hr-toast]');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('hr-toast--err', !!isErr);
    t.setAttribute('data-show', 'true');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      t.setAttribute('data-show', 'false');
    }, 2500);
  }

  /* ── Position switcher (Sprint 1 ile birebir patten) ─── */
  function renderPositionMenu() {
    var menu = $('[data-hr-position-menu]');
    if (!menu) return;
    clearChildren(menu);

    var allBtn = el('button', 'hr-position-menu__item hr-position-menu__all');
    allBtn.type = 'button';
    allBtn.setAttribute('role', 'option');
    allBtn.setAttribute('data-pos-id', '');
    if (!_state.activePositionId) allBtn.setAttribute('aria-selected', 'true');
    allBtn.appendChild(el('span', 'hr-position-menu__item-title', 'Tüm pozisyonlar'));
    allBtn.appendChild(el('span', 'hr-position-menu__item-meta', _state.positions.length + ' aktif'));
    allBtn.addEventListener('click', function () { selectPosition(null); });
    menu.appendChild(allBtn);

    if (_state.positions.length) {
      menu.appendChild(el('div', 'hr-position-menu__sep'));
    }

    _state.positions.forEach(function (p) {
      var b = el('button', 'hr-position-menu__item');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('data-pos-id', p.id);
      if (String(_state.activePositionId) === String(p.id)) b.setAttribute('aria-selected', 'true');
      b.appendChild(el('span', 'hr-position-menu__item-title', p.title));
      var metaTxt = (p.city || '') + ' · ' +
        ((p.segment || '').replace(/-/g, ' ')).toLocaleUpperCase('tr-TR') +
        ' · ' + (p.experience_years || '—') + ' yıl';
      b.appendChild(el('span', 'hr-position-menu__item-meta', metaTxt));
      b.addEventListener('click', function () { selectPosition(p); });
      menu.appendChild(b);
    });
  }
  function bindPositionSwitcher() {
    var btn = $('[data-hr-position-btn]');
    var menu = $('[data-hr-position-menu]');
    if (!btn || !menu) return;
    function close() {
      menu.setAttribute('data-open', 'false');
      btn.setAttribute('aria-expanded', 'false');
    }
    function open() {
      menu.setAttribute('data-open', 'true');
      btn.setAttribute('aria-expanded', 'true');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menu.getAttribute('data-open') === 'true';
      if (isOpen) close(); else open();
    });
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') close();
    });
  }
  function selectPosition(pos) {
    _state.activePositionId = pos ? pos.id : null;
    if (window.HRShell && window.HRShell.setActivePosition) {
      window.HRShell.setActivePosition(pos || null);
    }
    var menu = $('[data-hr-position-menu]');
    if (menu) menu.setAttribute('data-open', 'false');
    var btn = $('[data-hr-position-btn]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    renderPositionMenu();
    updateMetaBar();
    applyAndRender();
  }

  /* ── Meta bar ─────────────────────────────────── */
  function updateMetaBar() {
    var p = _state.positions.find(function (x) { return String(x.id) === String(_state.activePositionId); });
    var posEl = $('[data-hr-pool-position]');
    var totalEl = $('[data-hr-pool-total]');
    var shownEl = $('[data-hr-pool-shown]');
    if (posEl) posEl.textContent = p ? p.title : 'Tüm pozisyonlar';
    if (totalEl) totalEl.textContent = String(_state.allCandidates.length);
    if (shownEl) shownEl.textContent = String(_state.filteredRows.length);
  }

  /* ── Filter chips render ───────────────────────── */
  function getDistinctValues(field) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < _state.allCandidates.length; i++) {
      var v = _state.allCandidates[i][field];
      if (v == null || v === '') continue;
      if (!seen[v]) { seen[v] = true; out.push(v); }
    }
    out.sort(function (a, b) { return trLower(a) < trLower(b) ? -1 : 1; });
    return out;
  }
  function renderFilterChips() {
    var bar = $('[data-hr-pool-filters]');
    if (!bar) return;
    // labelden sonrakileri sil
    var label = bar.querySelector('.hr-pool-filters__label');
    clearChildren(bar);
    if (label) bar.appendChild(label);

    FILTER_DEFS.forEach(function (def) {
      var wrap = el('div', 'hr-pool-chip-wrap');
      wrap.style.position = 'relative';

      var chip = el('button', 'hr-pool-chip');
      chip.type = 'button';
      chip.setAttribute('data-chip-key', def.key);
      chip.setAttribute('aria-haspopup', 'menu');
      chip.setAttribute('aria-expanded', 'false');

      var active = _state.activeFilters[def.key];
      var labelTxt = def.label;
      if (active) {
        chip.setAttribute('aria-pressed', 'true');
        var rendered = def.renderValue ? def.renderValue(active) : active;
        labelTxt = def.label + ': ' + rendered;
      } else {
        chip.setAttribute('aria-pressed', 'false');
      }
      chip.appendChild(document.createTextNode(labelTxt));
      chip.appendChild(svgIcon('<svg class="hr-pool-chip__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'));

      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleChipMenu(wrap, def);
      });

      wrap.appendChild(chip);
      bar.appendChild(wrap);
    });
  }
  function toggleChipMenu(wrap, def) {
    closeAllChipMenus();
    var existing = wrap.querySelector('.hr-pool-chip-menu');
    if (existing) { existing.remove(); return; }

    var menu = el('div', 'hr-pool-chip-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('data-open', 'true');
    menu.setAttribute('data-chip-menu', def.key);

    var values = getDistinctValues(def.field);
    var current = _state.activeFilters[def.key];

    if (!values.length) {
      var empty = el('div', 'hr-pool-chip-menu__option', 'Seçenek yok');
      empty.style.color = 'var(--muted)';
      empty.style.cursor = 'default';
      menu.appendChild(empty);
    } else {
      // Count map
      var countMap = Object.create(null);
      for (var i = 0; i < _state.allCandidates.length; i++) {
        var v = _state.allCandidates[i][def.field];
        if (v) countMap[v] = (countMap[v] || 0) + 1;
      }

      values.forEach(function (v) {
        var opt = el('button', 'hr-pool-chip-menu__option');
        opt.type = 'button';
        opt.setAttribute('role', 'menuitemradio');
        if (String(current) === String(v)) opt.setAttribute('aria-current', 'true');
        var displayTxt = def.renderValue ? def.renderValue(v) : v;
        opt.appendChild(document.createTextNode(displayTxt));
        opt.appendChild(el('span', 'hr-pool-chip-menu__count', String(countMap[v] || 0)));
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          if (_state.activeFilters[def.key] === v) {
            delete _state.activeFilters[def.key];
          } else {
            _state.activeFilters[def.key] = v;
          }
          menu.remove();
          renderFilterChips();
          renderActiveFilters();
          applyAndRender();
        });
        menu.appendChild(opt);
      });

      if (current) {
        var clear = el('button', 'hr-pool-chip-menu__clear', 'Filtreyi kaldır');
        clear.type = 'button';
        clear.addEventListener('click', function (e) {
          e.stopPropagation();
          delete _state.activeFilters[def.key];
          menu.remove();
          renderFilterChips();
          renderActiveFilters();
          applyAndRender();
        });
        menu.appendChild(clear);
      }
    }

    wrap.appendChild(menu);
    _state.activeChipMenu = menu;

    setTimeout(function () {
      function outside(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', outside);
        }
      }
      document.addEventListener('click', outside);
    }, 0);
  }
  function closeAllChipMenus() {
    $$('.hr-pool-chip-menu').forEach(function (m) { m.remove(); });
  }

  /* ── Active filter pills ──────────────────────── */
  function renderActiveFilters() {
    var bar = $('[data-hr-pool-active]');
    if (!bar) return;
    clearChildren(bar);

    var keys = Object.keys(_state.activeFilters);
    var hasSearch = !!_state.searchQ;
    if (!keys.length && !hasSearch) return;

    if (hasSearch) {
      bar.appendChild(buildActivePill('Arama', '"' + _state.searchQ + '"', function () {
        _state.searchQ = '';
        var input = $('[data-hr-pool-search]');
        if (input) input.value = '';
        var clearBtn = $('[data-hr-pool-search-clear]');
        if (clearBtn) clearBtn.hidden = true;
        renderActiveFilters();
        applyAndRender();
      }));
    }

    keys.forEach(function (k) {
      var def = FILTER_DEFS.find(function (d) { return d.key === k; });
      if (!def) return;
      var v = _state.activeFilters[k];
      var displayV = def.renderValue ? def.renderValue(v) : v;
      bar.appendChild(buildActivePill(def.label, displayV, function () {
        delete _state.activeFilters[k];
        renderFilterChips();
        renderActiveFilters();
        applyAndRender();
      }));
    });

    if (keys.length || hasSearch) {
      var clearAll = el('button', 'hr-pool-active-clear', 'Tümünü temizle');
      clearAll.type = 'button';
      clearAll.addEventListener('click', resetAllFilters);
      bar.appendChild(clearAll);
    }
  }
  function buildActivePill(label, value, onRemove) {
    var pill = el('span', 'hr-pool-active-pill');
    pill.appendChild(document.createTextNode(label + ': ' + value));
    var x = el('button', 'hr-pool-active-pill__x');
    x.type = 'button';
    x.setAttribute('aria-label', label + ' filtresini kaldır');
    x.appendChild(svgIcon(ICON_X));
    x.addEventListener('click', onRemove);
    pill.appendChild(x);
    return pill;
  }
  function resetAllFilters() {
    _state.searchQ = '';
    _state.activeFilters = {};
    var input = $('[data-hr-pool-search]');
    if (input) input.value = '';
    var clearBtn = $('[data-hr-pool-search-clear]');
    if (clearBtn) clearBtn.hidden = true;
    renderFilterChips();
    renderActiveFilters();
    applyAndRender();
  }

  /* ── Sort menu ────────────────────────────────── */
  function renderSortMenu() {
    var menu = $('[data-hr-pool-sort-menu]');
    if (!menu) return;
    clearChildren(menu);

    SORT_OPTIONS.forEach(function (s) {
      var opt = el('button', 'hr-pool-sort__option');
      opt.type = 'button';
      opt.setAttribute('role', 'menuitemradio');
      opt.setAttribute('data-sort-key', s.key);
      if (s.key === _state.sortKey) opt.setAttribute('aria-current', 'true');

      opt.appendChild(document.createTextNode(s.label));
      var check = el('span', 'hr-pool-sort__option-check');
      check.appendChild(svgIcon(ICON_CHECK));
      opt.appendChild(check);

      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        if (s.key === _state.sortKey) {
          closeSortMenu();
          return;
        }
        _state.sortKey = s.key;
        var label = $('[data-hr-pool-sort-current]');
        if (label) label.textContent = s.label;
        closeSortMenu();
        renderSortMenu();
        applyAndRender();
      });
      menu.appendChild(opt);
    });
  }
  function bindSortMenu() {
    var btn = $('[data-hr-pool-sort-btn]');
    var menu = $('[data-hr-pool-sort-menu]');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = menu.getAttribute('data-open') === 'true';
      if (open) { closeSortMenu(); }
      else {
        menu.setAttribute('data-open', 'true');
        btn.setAttribute('aria-expanded', 'true');
        _state.sortMenuOpen = true;
      }
    });
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) closeSortMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _state.sortMenuOpen) closeSortMenu();
    });
  }
  function closeSortMenu() {
    var menu = $('[data-hr-pool-sort-menu]');
    var btn = $('[data-hr-pool-sort-btn]');
    if (menu) menu.setAttribute('data-open', 'false');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    _state.sortMenuOpen = false;
  }

  /* ── Search bind ──────────────────────────────── */
  function bindSearch() {
    var input = $('[data-hr-pool-search]');
    var clear = $('[data-hr-pool-search-clear]');
    if (!input) return;

    var run = debounce(function (val) {
      _state.searchQ = val.trim();
      if (clear) clear.hidden = !_state.searchQ;
      renderActiveFilters();
      applyAndRender();
    }, SEARCH_DEBOUNCE_MS);

    input.addEventListener('input', function () { run(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        input.value = '';
        _state.searchQ = '';
        if (clear) clear.hidden = true;
        renderActiveFilters();
        applyAndRender();
      }
    });
    if (clear) {
      clear.addEventListener('click', function () {
        input.value = '';
        _state.searchQ = '';
        clear.hidden = true;
        input.focus();
        renderActiveFilters();
        applyAndRender();
      });
    }
  }

  /* ── Apply filter + sort ──────────────────────── */
  function applyFilters() {
    var rows = _state.allCandidates.slice();

    // search
    var q = trLower(_state.searchQ);
    if (q) {
      rows = rows.filter(function (r) {
        var bag = (r.full_name || '') + ' ' + (r.pozisyon || '') + ' ' +
                  (r.sehir || '') + ' ' + (r.ilce || '') + ' ' +
                  (r.markalar ? r.markalar.join(' ') : '');
        return trLower(bag).indexOf(q) !== -1;
      });
    }

    // chip filters
    Object.keys(_state.activeFilters).forEach(function (k) {
      var def = FILTER_DEFS.find(function (d) { return d.key === k; });
      if (!def) return;
      var val = _state.activeFilters[k];
      rows = rows.filter(function (r) { return r[def.field] === val; });
    });

    // sort
    var pos = _state.positions.find(function (x) { return String(x.id) === String(_state.activePositionId); });
    if (_state.sortKey === 'match') {
      rows.sort(function (a, b) {
        var sa = computeMatchScore(a, pos) || 0;
        var sb = computeMatchScore(b, pos) || 0;
        return sb - sa;
      });
    } else if (_state.sortKey === 'updated') {
      rows.sort(function (a, b) {
        var ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        var tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
      });
    } else if (_state.sortKey === 'name') {
      rows.sort(function (a, b) { return trLower(a.full_name) < trLower(b.full_name) ? -1 : 1; });
    } else if (_state.sortKey === 'experience') {
      rows.sort(function (a, b) { return (b.deneyim_yil || 0) - (a.deneyim_yil || 0); });
    }

    _state.filteredRows = rows;
  }
  function applyAndRender() {
    applyFilters();
    _state.visibleCount = PAGE_SIZE;
    updateMetaBar();
    renderList();
    updateBulkBar();
  }

  /* ── List render ──────────────────────────────── */
  function renderList() {
    var list = $('[data-hr-pool-list]');
    var loading = $('[data-hr-pool-loading]');
    var empty = $('[data-hr-pool-empty]');
    var paginate = $('[data-hr-pool-paginate]');
    var info = $('[data-hr-pool-list-info]');
    if (!list) return;

    if (loading) loading.style.display = 'none';

    var pos = _state.positions.find(function (x) { return String(x.id) === String(_state.activePositionId); });

    if (!_state.filteredRows.length) {
      clearChildren(list);
      list.style.display = 'none';
      if (empty) empty.hidden = false;
      if (paginate) paginate.hidden = true;
      if (info) info.textContent = '0 sonuç';
      updateSelectAll();
      return;
    }

    if (empty) empty.hidden = true;
    list.style.display = '';

    clearChildren(list);

    var visible = _state.filteredRows.slice(0, _state.visibleCount);
    visible.forEach(function (cand) {
      list.appendChild(buildRow(cand, pos));
    });

    var total = _state.filteredRows.length;
    var shown = visible.length;

    if (info) info.textContent = shown + ' / ' + total;

    if (paginate) {
      if (total > shown) {
        paginate.hidden = false;
        var pInfo = $('[data-hr-pool-paginate-info]');
        if (pInfo) pInfo.textContent = shown + ' / ' + total + ' aday gösteriliyor';
      } else {
        paginate.hidden = true;
      }
    }

    updateSelectAll();
  }

  function buildRow(c, position) {
    var row = el('li', 'hr-pool-row');
    row.setAttribute('data-cand-id', c.id);
    row.setAttribute('role', 'listitem');

    var inPipeline = !!_state.pipelineByCandidate[c.id];
    var sel = !!_state.selectedIds[c.id];
    if (sel) row.setAttribute('data-selected', 'true');

    // Checkbox
    var checkWrap = el('div', 'hr-pool-row__check');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = sel;
    cb.setAttribute('aria-label', c.full_name + ' seç');
    cb.addEventListener('click', function (e) { e.stopPropagation(); });
    cb.addEventListener('change', function () {
      if (cb.checked) {
        _state.selectedIds[c.id] = true;
        row.setAttribute('data-selected', 'true');
        _state.selectedCount++;
      } else {
        delete _state.selectedIds[c.id];
        row.removeAttribute('data-selected');
        _state.selectedCount--;
      }
      updateBulkBar();
      updateSelectAll();
    });
    checkWrap.appendChild(cb);
    row.appendChild(checkWrap);

    // Avatar
    row.appendChild(el('div', 'hr-pool-row__avatar', initials(c.full_name)));

    // Main (name + meta)
    var main = el('div', 'hr-pool-row__main');
    main.appendChild(el('div', 'hr-pool-row__name', c.full_name || '—'));
    var metaTxt = (c.pozisyon || '—') + ' · ' + (c.deneyim_yil != null ? c.deneyim_yil + ' yıl' : '—') +
                  ' · ' + segmentLabel(c.segment);
    main.appendChild(el('div', 'hr-pool-row__meta', metaTxt));
    row.appendChild(main);

    // Match
    var score = computeMatchScore(c, position);
    var tier = matchTier(score);
    var matchTxt = score != null ? ('%' + score) : '—';
    row.appendChild(el('span', 'hr-pool-row__match hr-pool-row__match--' + tier, matchTxt));

    // City
    var cityTxt = (c.sehir || '') + (c.ilce ? ' · ' + c.ilce : '');
    row.appendChild(el('span', 'hr-pool-row__city', cityTxt || '—'));

    // Activity
    row.appendChild(el('span', 'hr-pool-row__activity', relativeTimeTr(c.updated_at)));

    // Add button
    var addBtn = el('button', 'hr-pool-row__add');
    addBtn.type = 'button';
    addBtn.setAttribute('data-cand-id', c.id);
    if (inPipeline) {
      addBtn.setAttribute('data-added', 'true');
      addBtn.appendChild(svgIcon(ICON_CHECK));
      addBtn.appendChild(document.createTextNode('Eklendi'));
      addBtn.disabled = true;
      addBtn.setAttribute('aria-label', c.full_name + ' zaten pipeline\'da');
    } else {
      addBtn.appendChild(svgIcon(ICON_PLUS));
      addBtn.appendChild(document.createTextNode('Ekle'));
      addBtn.setAttribute('aria-label', c.full_name + ' adayını pipeline\'a ekle');
    }
    addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (inPipeline) return;
      addOneToPipeline(c.id);
    });
    row.appendChild(addBtn);

    // Row click → drawer
    row.addEventListener('click', function (e) {
      if (e.target.closest('input[type=checkbox]')) return;
      if (e.target.closest('.hr-pool-row__add')) return;
      openDrawer(c.id);
    });
    row.setAttribute('tabindex', '0');
    row.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (e.target === row) {
          e.preventDefault();
          openDrawer(c.id);
        }
      }
    });

    return row;
  }

  /* ── Select-all checkbox ─────────────────────── */
  function bindSelectAll() {
    var cb = $('[data-hr-pool-select-all]');
    if (!cb) return;
    cb.addEventListener('change', function () {
      var visible = _state.filteredRows.slice(0, _state.visibleCount);
      if (cb.checked) {
        visible.forEach(function (c) {
          if (_state.pipelineByCandidate[c.id]) return; // pipeline'daki secilmesin
          if (!_state.selectedIds[c.id]) {
            _state.selectedIds[c.id] = true;
            _state.selectedCount++;
          }
        });
      } else {
        visible.forEach(function (c) {
          if (_state.selectedIds[c.id]) {
            delete _state.selectedIds[c.id];
            _state.selectedCount--;
          }
        });
      }
      // Re-render rows to reflect checkbox state
      renderList();
      updateBulkBar();
    });
  }
  function updateSelectAll() {
    var cb = $('[data-hr-pool-select-all]');
    if (!cb) return;
    var visible = _state.filteredRows.slice(0, _state.visibleCount);
    var addable = visible.filter(function (c) { return !_state.pipelineByCandidate[c.id]; });
    if (!addable.length) {
      cb.checked = false;
      cb.indeterminate = false;
      return;
    }
    var selectedVisible = addable.filter(function (c) { return _state.selectedIds[c.id]; }).length;
    if (selectedVisible === 0) {
      cb.checked = false;
      cb.indeterminate = false;
    } else if (selectedVisible === addable.length) {
      cb.checked = true;
      cb.indeterminate = false;
    } else {
      cb.checked = false;
      cb.indeterminate = true;
    }
  }

  /* ── Bulk action bar ──────────────────────────── */
  function updateBulkBar() {
    var bar = $('[data-hr-pool-bulk]');
    var count = $('[data-hr-pool-bulk-count]');
    var addBtn = $('[data-hr-pool-bulk-add]');
    if (!bar) return;
    var n = _state.selectedCount;
    if (count) count.textContent = String(n);
    bar.setAttribute('data-show', n > 0 ? 'true' : 'false');
    if (addBtn) {
      var hasPos = !!_state.activePositionId;
      addBtn.disabled = !hasPos;
      addBtn.title = hasPos ? '' : 'Önce pozisyon seçin';
    }
  }
  function bindBulkActions() {
    var clearBtn = $('[data-hr-pool-bulk-clear]');
    var addBtn = $('[data-hr-pool-bulk-add]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        _state.selectedIds = Object.create(null);
        _state.selectedCount = 0;
        renderList();
        updateBulkBar();
      });
    }
    if (addBtn) {
      addBtn.addEventListener('click', addBulkToPipeline);
    }
  }

  /* ── Pipeline persistence (localStorage overlay) ── */
  var DEMO_PIPELINE_KEY = 'ht_hr_pipeline_demo_state';
  function readPipelineOverlay() {
    try {
      var raw = localStorage.getItem(DEMO_PIPELINE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writePipelineOverlay(rows) {
    try {
      localStorage.setItem(DEMO_PIPELINE_KEY, JSON.stringify(rows));
    } catch (e) {}
  }

  function addOneToPipeline(candId) {
    var posId = _state.activePositionId;
    if (!posId) {
      toast('Önce bir pozisyon seçin', true);
      return;
    }
    if (_state.pipelineByCandidate[candId]) {
      toast('Zaten pipeline\'da');
      return;
    }
    var c = _state.allCandidates.find(function (x) { return String(x.id) === String(candId); });
    var name = c ? c.full_name : 'Aday';

    var nowIso = new Date().toISOString();
    var newRow = {
      id: 'pl-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      position_id: posId,
      candidate_id: candId,
      stage: 'basvuru',
      added_at: nowIso,
      updated_at: nowIso
    };

    var overlay = readPipelineOverlay();
    overlay.push(newRow);
    writePipelineOverlay(overlay);

    _state.pipelineByCandidate[candId] = newRow;
    if (_state.selectedIds[candId]) {
      delete _state.selectedIds[candId];
      _state.selectedCount--;
    }

    // Adapter cache invalidate (Sprint 1 share)
    if (window.HRData && window.HRData._clearCache) {
      // pipeline cache silinmeli — getPipeline yeniden okusun
      try {
        if (window.HRData._invalidate) window.HRData._invalidate('pipeline');
      } catch (e) {}
    }

    // Fire async (best-effort) — demo mode fonksiyon yine bos donuyor ama API uyumu icin
    if (window.HRData && window.HRData.addToPipeline) {
      window.HRData.addToPipeline({
        position_id: posId,
        candidate_id: candId,
        stage: 'basvuru'
      }).catch(function () {});
    }

    renderList();
    updateBulkBar();
    toast(name + ' pipeline\'a eklendi');
  }

  function addBulkToPipeline() {
    var posId = _state.activePositionId;
    if (!posId) {
      toast('Önce bir pozisyon seçin', true);
      return;
    }
    var ids = Object.keys(_state.selectedIds).filter(function (id) {
      return !_state.pipelineByCandidate[id];
    });
    if (!ids.length) {
      toast('Eklenebilecek aday yok');
      return;
    }

    var overlay = readPipelineOverlay();
    var nowIso = new Date().toISOString();
    var added = 0;
    ids.forEach(function (id) {
      var newRow = {
        id: 'pl-' + Date.now() + '-' + Math.floor(Math.random() * 100000) + '-' + added,
        position_id: posId,
        candidate_id: id,
        stage: 'basvuru',
        added_at: nowIso,
        updated_at: nowIso
      };
      overlay.push(newRow);
      _state.pipelineByCandidate[id] = newRow;
      added++;
    });
    writePipelineOverlay(overlay);

    if (window.HRData && window.HRData.addToPipeline) {
      ids.forEach(function (id) {
        window.HRData.addToPipeline({
          position_id: posId,
          candidate_id: id,
          stage: 'basvuru'
        }).catch(function () {});
      });
    }

    _state.selectedIds = Object.create(null);
    _state.selectedCount = 0;

    renderList();
    updateBulkBar();
    toast(added + ' aday pipeline\'a eklendi');
  }

  /* ── Pagination ──────────────────────────────── */
  function bindPagination() {
    var btn = $('[data-hr-pool-more]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      _state.visibleCount += PAGE_SIZE;
      renderList();
    });
  }

  /* ── Empty reset ─────────────────────────────── */
  function bindEmptyReset() {
    var btn = $('[data-hr-pool-reset]');
    if (btn) btn.addEventListener('click', resetAllFilters);
  }

  /* ── Drawer (Sprint 1 patterni) ──────────────── */
  function bindDrawer() {
    var drawer = $('[data-hr-drawer]');
    if (!drawer) return;
    var bd = $('[data-hr-drawer-backdrop]');
    var cl = $('[data-hr-drawer-close]');
    if (bd) bd.addEventListener('click', closeDrawer);
    if (cl) cl.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _state.drawerOpen) closeDrawer();
    });
  }
  async function openDrawer(candidateId) {
    var drawer = $('[data-hr-drawer]');
    var body = $('[data-hr-drawer-body]');
    var idEl = $('[data-hr-drawer-id]');
    if (!drawer || !body) return;

    drawer.setAttribute('aria-hidden', 'false');
    _state.drawerOpen = true;
    document.body.style.overflow = 'hidden';

    if (idEl) idEl.textContent = '#' + candidateId;
    renderDrawerLoading(body);

    try {
      var res = await window.HRData.getCandidate(candidateId);
      if (res && res.error) throw new Error(res.error.message);
      var c = res && res.data;
      if (!c) {
        renderDrawerError(body, 'Aday bulunamadı.');
        return;
      }
      renderDrawerCandidate(c);
    } catch (e) {
      renderDrawerError(body, 'Aday yüklenemedi: ' + (e.message || 'bilinmeyen hata'));
    }
  }
  function closeDrawer() {
    var drawer = $('[data-hr-drawer]');
    if (!drawer) return;
    drawer.setAttribute('aria-hidden', 'true');
    _state.drawerOpen = false;
    document.body.style.overflow = '';
  }
  function renderDrawerLoading(body) {
    clearChildren(body);
    var w = el('div', 'hr-pl-loading hr-pl-loading--mini');
    w.appendChild(el('div', 'hr-pl-loading__spinner'));
    w.appendChild(el('p', '', 'Aday yükleniyor…'));
    body.appendChild(w);
  }
  function renderDrawerError(body, msg) {
    clearChildren(body);
    body.appendChild(el('div', 'hr-drawer__error', msg));
  }
  function renderDrawerCandidate(c) {
    var body = $('[data-hr-drawer-body]');
    if (!body) return;
    clearChildren(body);

    body.appendChild(el('h2', 'hr-drawer__name', c.full_name));

    var roleStr = (c.pozisyon || '—') + ' · ' + (c.sehir || '—') + (c.ilce ? ' / ' + c.ilce : '');
    body.appendChild(el('p', 'hr-drawer__role', roleStr));

    var grid = el('div', 'hr-drawer__grid');
    grid.appendChild(drawerField('Deneyim', (c.deneyim_yil != null ? c.deneyim_yil + ' yıl' : '—')));
    grid.appendChild(drawerField('Segment', segmentLabel(c.segment)));
    grid.appendChild(drawerField('Doğum yılı', c.dogum_yili || '—'));
    grid.appendChild(drawerField('Eğitim', c.egitim_seviye || '—'));
    grid.appendChild(drawerField('Müsaitlik', c.musaitlik || '—'));
    grid.appendChild(drawerField('Çalışma tipi', c.calisma_tipi || '—'));
    body.appendChild(grid);

    if (c.markalar && c.markalar.length) {
      var lab = el('div', 'hr-drawer__field-label', 'Markalar');
      lab.style.marginBottom = '6px';
      body.appendChild(lab);
      var brands = el('div', 'hr-drawer__brands');
      c.markalar.forEach(function (m) {
        brands.appendChild(el('span', 'hr-drawer__brand-chip', m));
      });
      body.appendChild(brands);
    }

    var cta = el('div', 'hr-drawer__cta-row');

    var inPipeline = !!_state.pipelineByCandidate[c.id];
    if (!inPipeline && _state.activePositionId) {
      var addBtn = el('button', 'hr-btn-primary', 'Pipeline\'a ekle');
      addBtn.type = 'button';
      addBtn.addEventListener('click', function () {
        addOneToPipeline(c.id);
        closeDrawer();
      });
      cta.appendChild(addBtn);
    } else if (inPipeline) {
      var inPill = el('div', 'hr-btn-ghost', 'Pipeline\'da mevcut');
      inPill.style.justifyContent = 'center';
      inPill.style.cursor = 'default';
      cta.appendChild(inPill);
    }

    var primary = el('a', 'hr-btn-ghost', 'Tüm aday detayı');
    primary.href = 'hr-candidate.html?id=' + encodeURIComponent(c.id);
    primary.style.justifyContent = 'center';
    cta.appendChild(primary);

    var msg = el('a', 'hr-btn-ghost', 'Mesaj gönder');
    msg.href = 'hr-messages.html?candidate=' + encodeURIComponent(c.id);
    msg.style.justifyContent = 'center';
    cta.appendChild(msg);

    body.appendChild(cta);
  }
  function drawerField(label, value) {
    var w = el('div');
    w.appendChild(el('div', 'hr-drawer__field-label', label));
    w.appendChild(el('div', 'hr-drawer__field-value', value));
    return w;
  }

  /* ── URL param handling (from=pipeline&position=…) ── */
  function readUrlContext() {
    try {
      var params = new URLSearchParams(window.location.search);
      var posId = params.get('position');
      if (posId && _state.positions.find(function (p) { return String(p.id) === String(posId); })) {
        _state.activePositionId = posId;
        var pos = _state.positions.find(function (p) { return String(p.id) === String(posId); });
        if (window.HRShell && window.HRShell.setActivePosition && pos) {
          window.HRShell.setActivePosition(pos);
        }
      }
    } catch (e) {}
  }

  /* ── Resize ──────────────────────────────────── */
  function bindResize() {
    var prevMobile = _state.isMobile;
    window.addEventListener('resize', debounce(function () {
      var nowMobile = isMobileViewport();
      if (nowMobile !== prevMobile) {
        prevMobile = nowMobile;
        _state.isMobile = nowMobile;
      }
    }, 150));
  }

  /* ── Data load ────────────────────────────────── */
  async function loadAll() {
    var tasks = [
      window.HRData.getPositions(),
      window.HRData.searchCandidates({ pageSize: 500 }),
      window.HRData.getPipeline(null)
    ];
    var results = await Promise.all(tasks);
    var posRes = results[0];
    var candRes = results[1];
    var plRes = results[2];

    _state.positions = (posRes && posRes.data) ? posRes.data : [];
    var candList = (candRes && candRes.data && candRes.data.rows) ? candRes.data.rows : [];
    _state.allCandidates = candList;

    var plRows = (plRes && plRes.data) ? plRes.data : [];
    var byCand = Object.create(null);
    plRows.forEach(function (r) {
      // Aktif pozisyon kontrolu render anında yapilacak; burada hepsi store
      byCand[r.candidate_id] = r;
    });
    _state.pipelineByCandidate = byCand;

    // Active position: HRShell sessionStorage > URL > ilk pozisyon > null
    var existing = window.HRShell && window.HRShell.getActivePosition && window.HRShell.getActivePosition();
    if (existing && _state.positions.find(function (p) { return String(p.id) === String(existing.id); })) {
      _state.activePositionId = existing.id;
    }
    readUrlContext(); // URL param > sessionStorage (intentional override from Pipeline link)
  }

  /* ── Init ─────────────────────────────────────── */
  async function init() {
    if (!window.HRShell || !window.HRData) {
      console.warn('[hr-pool] HRShell veya HRData hazır değil');
      return;
    }
    _state.isMobile = isMobileViewport();

    bindPositionSwitcher();
    bindSearch();
    bindSortMenu();
    bindBulkActions();
    bindSelectAll();
    bindPagination();
    bindEmptyReset();
    bindDrawer();
    bindResize();

    window.addEventListener('hr:position-changed', function (e) {
      var p = e && e.detail;
      _state.activePositionId = p ? p.id : null;
      renderPositionMenu();
      updateMetaBar();
      // Pipeline pos degisirse de re-fetch et
      reloadPipelineOverlay();
      applyAndRender();
    });

    await window.HRShell.ready();

    try {
      await loadAll();
    } catch (e) {
      console.error('[hr-pool] data load error', e);
      var loading = $('[data-hr-pool-loading]');
      if (loading) {
        clearChildren(loading);
        var p = el('p', '', 'Havuz verisi yüklenemedi.');
        p.style.color = 'var(--verm)';
        loading.appendChild(p);
      }
      return;
    }

    renderPositionMenu();
    renderFilterChips();
    renderActiveFilters();
    renderSortMenu();
    var sortLabel = SORT_OPTIONS.find(function (s) { return s.key === _state.sortKey; });
    var sortLabelEl = $('[data-hr-pool-sort-current]');
    if (sortLabelEl && sortLabel) sortLabelEl.textContent = sortLabel.label;
    updateMetaBar();
    applyAndRender();
  }

  // Pipeline overlay yenileme — position degistiginde de tetiklenir
  async function reloadPipelineOverlay() {
    try {
      // Cache temizle, sonra tekrar oku
      if (window.HRData && window.HRData._clearCache) {
        // pipeline cache spesifik silmek yerine overlay'i lokal okumak yeterli
      }
      var plRes = await window.HRData.getPipeline(null);
      var plRows = (plRes && plRes.data) ? plRes.data : [];
      var byCand = Object.create(null);
      plRows.forEach(function (r) { byCand[r.candidate_id] = r; });
      _state.pipelineByCandidate = byCand;
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Test hooks
  if (window.HR_POOL_TEST === true) {
    window._HRPool = {
      state: _state,
      FILTER_DEFS: FILTER_DEFS,
      SORT_OPTIONS: SORT_OPTIONS,
      computeMatchScore: computeMatchScore,
      matchTier: matchTier,
      trLower: trLower,
      relativeTimeTr: relativeTimeTr,
      applyFilters: applyFilters,
      addOneToPipeline: addOneToPipeline,
      addBulkToPipeline: addBulkToPipeline
    };
  }
})();
