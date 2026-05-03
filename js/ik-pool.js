/* global IK_SHELL, IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Pool — Asama 86 Sprint B
   Aday Havuzu sayfa controller.
   - Filter (search debounce + 4 chip + sort)
   - Bulk select + add to pipeline
   - Pagination (20'sar)
   - Row menu (Mesaj / Detay / Bloke et)
   - XSS-safe (textContent only, innerHTML YASAK)
   SOLID:
     - SRP: state + render + event binding islerini ayri fonksiyonlarda.
     - OCP: filter chip yapisi config-driven.
     - DIP: data sadece IK_DATA uzerinden gelir.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ Config ═══════ */
  var PAGE_SIZE = 20;
  var SEARCH_DEBOUNCE_MS = 300;

  var SORT_OPTIONS = [
    { value: 'match',      label: 'Eşleşme oranı' },
    { value: 'recent',     label: 'Son aktivite' },
    { value: 'name',       label: 'İsim (A-Z)' },
    { value: 'experience', label: 'Deneyim (yıl)' }
  ];

  /* Filter chip config — value=field key on candidate (Phase D2.3: field rename)
     isArrayField=true → buildFacets/applyFilters dizi alanı işler (calisma_tipleri, diller). */
  var FILTER_CHIPS = [
    { key: 'city',      label: 'Şehir',       field: 'adres_il' },
    { key: 'position',  label: 'Pozisyon',    field: 'son_pozisyon' },
    { key: 'segment',   label: 'Segment',     field: 'segment' },
    { key: 'musaitlik', label: 'Müsaitlik',   field: 'musaitlik' },
    { key: 'egitim',    label: 'Eğitim',      field: 'egitim_seviye' },
    { key: 'calisma',   label: 'Çalışma tipi', field: 'calisma_tipleri', isArrayField: true },
    { key: 'dil',       label: 'Dil',         field: 'diller', isArrayField: true, arrayItemKey: 'dil' }
  ];

  /* ═══════ State ═══════ */
  var state = {
    candidates: [],   /* full filtered+sorted result */
    loaded: 0,        /* shown count */
    selected: new Set(),
    filters: {
      search: '',
      city: '',
      position: '',
      segment: '',
      musaitlik: '',
      egitim: '',
      calisma: '',
      dil: '',
      sort: 'match'
    },
    activePositionId: null,
    activePosition: null,
    facets: {} /* {city: ['İstanbul', ...], position: [...], ...} */
  };

  /* OCP: yeni FILTER_CHIPS eklenince clear-all/empty-reset otomatik kapsar */
  function makeEmptyFilters(keepSort) {
    var f = { search: '', sort: keepSort || 'match' };
    FILTER_CHIPS.forEach(function (cfg) { f[cfg.key] = ''; });
    return f;
  }

  /* ═══════ DOM cache ═══════ */
  var dom = {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function cacheDom() {
    dom.search       = $('[data-ik-pool-search]');
    dom.searchClear  = $('[data-ik-pool-search-clear]');
    dom.sortBtn      = $('[data-ik-pool-sort-btn]');
    dom.sortCurrent  = $('[data-ik-pool-sort-current]');
    dom.sortMenu     = $('[data-ik-pool-sort-menu]');
    dom.filters      = $('[data-ik-pool-filters]');
    dom.active       = $('[data-ik-pool-active]');
    dom.bulk         = $('[data-ik-pool-bulk]');
    dom.bulkCount    = $('[data-ik-pool-bulk-count]');
    dom.bulkClear    = $('[data-ik-pool-bulk-clear]');
    dom.bulkAdd      = $('[data-ik-pool-bulk-add]');
    dom.list         = $('[data-ik-pool-list]');
    dom.listInfo     = $('[data-ik-pool-list-info]');
    dom.selectAll    = $('[data-ik-pool-select-all]');
    dom.loading      = $('[data-ik-pool-loading]');
    dom.empty        = $('[data-ik-pool-empty]');
    dom.emptyReset   = $('[data-ik-pool-reset]');
    dom.paginate     = $('[data-ik-pool-paginate]');
    dom.paginateInfo = $('[data-ik-pool-paginate-info]');
    dom.more         = $('[data-ik-pool-more]');
    dom.toast        = $('[data-ik-pool-toast]');
    dom.metaPos      = $('[data-ik-pool-position]');
    dom.metaTotal    = $('[data-ik-pool-total]');
    dom.metaShown    = $('[data-ik-pool-shown]');
  }

  /* ═══════ Helpers ═══════ */
  function trLower(s) {
    if (!s) return '';
    return String(s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function relativeTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'şimdi';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' sa önce';
    if (diff < 604800) return Math.floor(diff / 86400) + ' gün önce';
    return Math.floor(diff / 604800) + ' hf önce';
  }

  function initialOf(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function showToast(msg, kind) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.remove('ik-pool-toast--success', 'ik-pool-toast--error');
    if (kind === 'success') dom.toast.classList.add('ik-pool-toast--success');
    else if (kind === 'error') dom.toast.classList.add('ik-pool-toast--error');
    dom.toast.classList.add('is-visible');
    setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, 2400);
  }

  function clearChildren(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  /* ═══════ Facets (filter dropdown options) ═══════
     FILTER_CHIPS config'inden generic facet builder. Array field'lar için
     isArrayField=true; her array item ayrı facet entry üretir. */
  function buildFacets(candidates) {
    var f = {};
    FILTER_CHIPS.forEach(function (cfg) { f[cfg.key] = {}; });

    candidates.forEach(function (c) {
      FILTER_CHIPS.forEach(function (cfg) {
        var raw = c[cfg.field];
        if (raw == null || raw === '') return;
        if (cfg.isArrayField) {
          if (!Array.isArray(raw)) return;
          raw.forEach(function (item) {
            /* Defensive: object item ise arrayItemKey ile çek, string ise item kendisi.
               diller array shape değişebilir (string[] vs [{dil,seviye}]). */
            var v;
            if (cfg.arrayItemKey && item && typeof item === 'object') {
              v = item[cfg.arrayItemKey];
            } else {
              v = item;
            }
            if (v == null || v === '') return;
            f[cfg.key][v] = (f[cfg.key][v] || 0) + 1;
          });
        } else {
          f[cfg.key][raw] = (f[cfg.key][raw] || 0) + 1;
        }
      });
    });

    var out = {};
    Object.keys(f).forEach(function (k) {
      out[k] = Object.keys(f[k]).map(function (v) {
        return { value: v, count: f[k][v] };
      }).sort(function (a, b) { return b.count - a.count; });
    });
    state.facets = out;
  }

  /* ═══════ Filter chips render ═══════ */
  function renderFilterChips() {
    if (!dom.filters) return;
    /* Label korunur, chip'ler temizlenip yeniden basilir */
    var label = dom.filters.querySelector('.ik-pool-filters__label');
    clearChildren(dom.filters);
    if (label) dom.filters.appendChild(label);

    FILTER_CHIPS.forEach(function (cfg) {
      var wrap = document.createElement('div');
      wrap.className = 'ik-pool-chip-wrap';
      wrap.setAttribute('data-chip-key', cfg.key);

      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ik-pool-chip';
      chip.setAttribute('data-ik-pool-chip', cfg.key);
      chip.setAttribute('aria-haspopup', 'menu');
      chip.setAttribute('aria-expanded', 'false');

      var lbl = document.createElement('span');
      lbl.className = 'ik-pool-chip__label';
      var current = state.filters[cfg.key];
      if (current) {
        var disp = (cfg.valueLabels && cfg.valueLabels[current]) ? cfg.valueLabels[current] : current;
        lbl.textContent = cfg.label + ': ' + disp;
        chip.classList.add('is-active');
      } else {
        lbl.textContent = cfg.label;
      }
      chip.appendChild(lbl);

      var chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chev.setAttribute('class', 'ik-pool-chip__chev');
      chev.setAttribute('viewBox', '0 0 24 24');
      chev.setAttribute('fill', 'none');
      chev.setAttribute('stroke', 'currentColor');
      chev.setAttribute('stroke-width', '2.2');
      chev.setAttribute('stroke-linecap', 'round');
      chev.setAttribute('stroke-linejoin', 'round');
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('points', '6 9 12 15 18 9');
      chev.appendChild(poly);
      chip.appendChild(chev);

      wrap.appendChild(chip);

      /* Menu */
      var menu = document.createElement('div');
      menu.className = 'ik-pool-chip-menu';
      menu.setAttribute('data-chip-menu', cfg.key);
      menu.setAttribute('role', 'menu');

      var anyItem = document.createElement('button');
      anyItem.type = 'button';
      anyItem.className = 'ik-pool-chip-menu__item' + (current ? '' : ' is-selected');
      anyItem.setAttribute('data-chip-value', '');
      var anyLabel = document.createElement('span');
      anyLabel.textContent = 'Tümü';
      anyItem.appendChild(anyLabel);
      menu.appendChild(anyItem);

      var facetList = (state.facets[cfg.key] || []);
      facetList.forEach(function (entry) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ik-pool-chip-menu__item';
        if (entry.value === current) btn.classList.add('is-selected');
        btn.setAttribute('data-chip-value', entry.value);

        var t = document.createElement('span');
        var disp = (cfg.valueLabels && cfg.valueLabels[entry.value]) ? cfg.valueLabels[entry.value] : entry.value;
        t.textContent = disp;
        btn.appendChild(t);

        var n = document.createElement('span');
        n.className = 'ik-pool-chip-menu__item-count';
        n.textContent = String(entry.count);
        btn.appendChild(n);

        menu.appendChild(btn);
      });

      wrap.appendChild(menu);
      dom.filters.appendChild(wrap);
    });

    /* Active pills row */
    renderActivePills();
  }

  function renderActivePills() {
    if (!dom.active) return;
    clearChildren(dom.active);

    var hasAny = false;
    FILTER_CHIPS.forEach(function (cfg) {
      var v = state.filters[cfg.key];
      if (!v) return;
      hasAny = true;
      var pill = document.createElement('span');
      pill.className = 'ik-pool-active__pill';
      var disp = (cfg.valueLabels && cfg.valueLabels[v]) ? cfg.valueLabels[v] : v;
      var lbl = document.createElement('span');
      lbl.textContent = cfg.label + ': ' + disp;
      pill.appendChild(lbl);

      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'ik-pool-active__pill-x';
      x.setAttribute('aria-label', cfg.label + ' filtresini kaldır');
      x.setAttribute('data-pill-clear', cfg.key);
      var xs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      xs.setAttribute('width', '12');
      xs.setAttribute('height', '12');
      xs.setAttribute('viewBox', '0 0 24 24');
      xs.setAttribute('fill', 'none');
      xs.setAttribute('stroke', 'currentColor');
      xs.setAttribute('stroke-width', '2.4');
      xs.setAttribute('stroke-linecap', 'round');
      var l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6');
      l1.setAttribute('x2', '6');  l1.setAttribute('y2', '18');
      var l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l2.setAttribute('x1', '6');  l2.setAttribute('y1', '6');
      l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
      xs.appendChild(l1);
      xs.appendChild(l2);
      x.appendChild(xs);
      pill.appendChild(x);

      dom.active.appendChild(pill);
    });

    if (state.filters.search) {
      hasAny = true;
      var pill2 = document.createElement('span');
      pill2.className = 'ik-pool-active__pill';
      var lbl2 = document.createElement('span');
      lbl2.textContent = 'Arama: ' + state.filters.search;
      pill2.appendChild(lbl2);
      var x2 = document.createElement('button');
      x2.type = 'button';
      x2.className = 'ik-pool-active__pill-x';
      x2.setAttribute('data-pill-clear', 'search');
      x2.setAttribute('aria-label', 'Aramayı temizle');
      x2.textContent = '×';
      pill2.appendChild(x2);
      dom.active.appendChild(pill2);
    }

    if (hasAny) {
      var clr = document.createElement('button');
      clr.type = 'button';
      clr.className = 'ik-pool-active__clear';
      clr.setAttribute('data-pill-clear-all', '1');
      clr.textContent = 'Tümünü temizle';
      dom.active.appendChild(clr);
    }
  }

  /* ═══════ Sort menu render ═══════ */
  function renderSortMenu() {
    if (!dom.sortMenu) return;
    clearChildren(dom.sortMenu);
    SORT_OPTIONS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ik-pool-sort__item';
      if (state.filters.sort === opt.value) btn.classList.add('is-selected');
      btn.setAttribute('data-sort-value', opt.value);
      btn.setAttribute('role', 'menuitem');
      btn.textContent = opt.label;
      dom.sortMenu.appendChild(btn);
    });
    var current = SORT_OPTIONS.find(function (o) { return o.value === state.filters.sort; });
    if (dom.sortCurrent && current) dom.sortCurrent.textContent = current.label.split(' ')[0];
  }

  /* ═══════ Row render ═══════ */
  function matchClass(score) {
    if (score >= 70) return '';
    if (score >= 40) return 'ik-pool-row__match--mid';
    return 'ik-pool-row__match--low';
  }

  function renderRow(c) {
    var li = document.createElement('li');
    li.className = 'ik-pool-row';
    li.setAttribute('data-row-id', c.id);
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    if (state.selected.has(c.id)) li.classList.add('is-selected');

    /* check */
    var checkLbl = document.createElement('label');
    checkLbl.className = 'ik-pool-row__check';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('data-row-check', c.id);
    checkbox.setAttribute('aria-label', c.full_name + ' seç');
    checkbox.checked = state.selected.has(c.id);
    checkLbl.appendChild(checkbox);
    li.appendChild(checkLbl);

    /* avatar */
    var av = document.createElement('div');
    av.className = 'ik-pool-row__avatar';
    av.textContent = initialOf(c.full_name);
    av.setAttribute('aria-hidden', 'true');
    li.appendChild(av);

    /* main (name + meta) */
    var main = document.createElement('div');
    main.className = 'ik-pool-row__main';
    var name = document.createElement('div');
    name.className = 'ik-pool-row__name';
    name.textContent = c.full_name;
    main.appendChild(name);

    var meta = document.createElement('div');
    meta.className = 'ik-pool-row__meta';
    var poz = document.createElement('span');
    poz.textContent = c.son_pozisyon || '—';
    meta.appendChild(poz);
    if (c.adres_il) {
      var s1 = document.createElement('span');
      s1.className = 'ik-pool-row__sep';
      s1.textContent = '·';
      meta.appendChild(s1);
      var sehir = document.createElement('span');
      sehir.textContent = c.adres_il;
      meta.appendChild(sehir);
    }
    var deneyimYil = IK_DATA.getDeneyimYil(c);
    if (deneyimYil > 0) {
      var s2 = document.createElement('span');
      s2.className = 'ik-pool-row__sep';
      s2.textContent = '·';
      meta.appendChild(s2);
      var dyl = document.createElement('span');
      dyl.textContent = deneyimYil + ' yıl';
      meta.appendChild(dyl);
    }
    main.appendChild(meta);

    /* match_reasons chips (max 3) — Phase D2.3 */
    var reasons = Array.isArray(c.match_reasons) ? c.match_reasons : [];
    if (reasons.length) {
      var chipsRow = document.createElement('div');
      chipsRow.className = 'ik-pool-row__reasons';
      reasons.slice(0, 3).forEach(function (r) {
        var chip = document.createElement('span');
        chip.className = 'ik-match-chip';
        chip.textContent = r;
        chipsRow.appendChild(chip);
      });
      main.appendChild(chipsRow);
    }

    li.appendChild(main);

    /* match pill */
    var match = document.createElement('span');
    match.className = 'ik-pool-row__match ' + matchClass(c.match_score || 0);
    var mn = document.createElement('span');
    mn.className = 'ik-pool-row__match-num';
    mn.textContent = (c.match_score || 0) + '%';
    match.appendChild(mn);
    var mlbl = document.createElement('span');
    mlbl.textContent = 'eşleşme';
    match.appendChild(mlbl);
    li.appendChild(match);

    /* activity */
    var act = document.createElement('span');
    act.className = 'ik-pool-row__activity';
    act.textContent = relativeTime(c.updated_at);
    li.appendChild(act);

    /* menu btn */
    var menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'ik-pool-row__menu-btn';
    menuBtn.setAttribute('aria-label', c.full_name + ' menüsü');
    menuBtn.setAttribute('data-row-menu-btn', c.id);
    var dotsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dotsSvg.setAttribute('viewBox', '0 0 24 24');
    dotsSvg.setAttribute('fill', 'none');
    dotsSvg.setAttribute('stroke', 'currentColor');
    dotsSvg.setAttribute('stroke-width', '2');
    dotsSvg.setAttribute('stroke-linecap', 'round');
    [5, 12, 19].forEach(function (cy) {
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', '12');
      dot.setAttribute('cy', String(cy));
      dot.setAttribute('r', '1.4');
      dot.setAttribute('fill', 'currentColor');
      dotsSvg.appendChild(dot);
    });
    menuBtn.appendChild(dotsSvg);
    li.appendChild(menuBtn);

    /* Row menu */
    var menu = document.createElement('div');
    menu.className = 'ik-pool-row__menu';
    menu.setAttribute('data-row-menu', c.id);
    menu.setAttribute('role', 'menu');

    var mItems = [
      { action: 'detail', label: 'Detayı aç' },
      { action: 'message', label: 'Mesaj yaz' },
      { action: 'add', label: 'Pipeline\'a ekle' },
      { action: 'block', label: 'Bloke et', danger: true }
    ];
    mItems.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ik-pool-row__menu-item' + (it.danger ? ' ik-pool-row__menu-item--danger' : '');
      b.setAttribute('data-row-action', it.action);
      b.setAttribute('data-row-id', c.id);
      b.setAttribute('role', 'menuitem');
      b.textContent = it.label;
      menu.appendChild(b);
    });
    li.appendChild(menu);

    return li;
  }

  /* ═══════ List render ═══════ */
  function renderList() {
    if (!dom.list) return;
    clearChildren(dom.list);

    var slice = state.candidates.slice(0, state.loaded);
    slice.forEach(function (c) {
      dom.list.appendChild(renderRow(c));
    });

    var total = state.candidates.length;
    var shown = slice.length;

    if (dom.metaTotal) dom.metaTotal.textContent = String(total);
    if (dom.metaShown) dom.metaShown.textContent = String(shown);
    if (dom.listInfo) dom.listInfo.textContent = shown + ' / ' + total;
    if (dom.metaPos) {
      dom.metaPos.textContent = state.activePosition ? state.activePosition.title : 'Tümü';
    }

    if (dom.loading) dom.loading.hidden = true;

    if (total === 0) {
      if (dom.empty) dom.empty.hidden = false;
      if (dom.paginate) dom.paginate.hidden = true;
      if (dom.list) dom.list.hidden = true;
    } else {
      if (dom.empty) dom.empty.hidden = true;
      if (dom.list) dom.list.hidden = false;
      var hasMore = shown < total;
      if (dom.paginate) {
        dom.paginate.hidden = !hasMore;
        if (dom.paginateInfo && hasMore) {
          var remaining = total - shown;
          dom.paginateInfo.textContent = 'Devamı: ' + remaining + ' aday';
        }
      }
    }

    /* Update select-all */
    if (dom.selectAll) {
      var visibleIds = slice.map(function (c) { return c.id; });
      var allSelected = visibleIds.length > 0 && visibleIds.every(function (id) {
        return state.selected.has(id);
      });
      dom.selectAll.checked = allSelected;
      dom.selectAll.indeterminate = !allSelected && visibleIds.some(function (id) {
        return state.selected.has(id);
      });
    }

    updateBulkBar();
  }

  function updateBulkBar() {
    if (!dom.bulk) return;
    var n = state.selected.size;
    if (dom.bulkCount) dom.bulkCount.textContent = String(n) + ' ';
    dom.bulk.setAttribute('data-show', n > 0 ? 'true' : 'false');

    if (dom.bulkAdd) {
      dom.bulkAdd.disabled = n === 0 || !state.activePositionId;
    }
  }

  /* ═══════ Data load ═══════ */
  function loadData() {
    if (dom.loading) dom.loading.hidden = false;
    if (dom.empty) dom.empty.hidden = true;

    return Promise.all([
      IK_DATA.getPositions(),
      IK_DATA.searchCandidates({}, null) /* full list for facets */
    ]).then(function (results) {
      var positions = results[0];
      var allCandidates = results[1];

      buildFacets(allCandidates);

      /* Active position seed */
      var posId = (window.IK_SHELL && IK_SHELL.getActivePositionId)
        ? IK_SHELL.getActivePositionId() : null;
      if (!posId && positions && positions.length) {
        posId = positions[0].id;
        if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
          IK_SHELL.setActivePositionId(posId);
        }
      }
      state.activePositionId = posId;
      state.activePosition = positions.find(function (p) { return p.id === posId; }) || null;

      return applyFilters();
    }).catch(function (e) {
      console.warn('[ik-pool] load fail:', e && e.message);
      state.candidates = [];
      renderList();
    });
  }

  function applyFilters() {
    return IK_DATA.searchCandidates(state.filters, state.activePositionId).then(function (list) {
      state.candidates = list;
      state.loaded = Math.min(PAGE_SIZE, list.length);
      renderFilterChips();
      renderSortMenu();
      renderList();
    });
  }

  /* ═══════ Event binding ═══════ */
  function bindSearch() {
    if (!dom.search) return;
    var debounced = debounce(function () {
      state.filters.search = dom.search.value || '';
      if (dom.searchClear) dom.searchClear.hidden = !state.filters.search;
      applyFilters();
    }, SEARCH_DEBOUNCE_MS);

    dom.search.addEventListener('input', debounced);

    if (dom.searchClear) {
      dom.searchClear.addEventListener('click', function () {
        dom.search.value = '';
        state.filters.search = '';
        dom.searchClear.hidden = true;
        applyFilters();
        dom.search.focus();
      });
    }
  }

  function bindSort() {
    if (!dom.sortBtn || !dom.sortMenu) return;

    dom.sortBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dom.sortMenu.classList.toggle('is-open');
      dom.sortBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      closeAllChipMenus();
    });

    dom.sortMenu.addEventListener('click', function (e) {
      var t = e.target.closest('[data-sort-value]');
      if (!t) return;
      var v = t.getAttribute('data-sort-value');
      state.filters.sort = v;
      dom.sortMenu.classList.remove('is-open');
      dom.sortBtn.setAttribute('aria-expanded', 'false');
      applyFilters();
    });

    document.addEventListener('click', function (e) {
      if (!dom.sortMenu) return;
      if (!dom.sortMenu.contains(e.target) && !dom.sortBtn.contains(e.target)) {
        dom.sortMenu.classList.remove('is-open');
        dom.sortBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dom.sortMenu.classList.contains('is-open')) {
        dom.sortMenu.classList.remove('is-open');
        dom.sortBtn.setAttribute('aria-expanded', 'false');
        dom.sortBtn.focus();
      }
    });
  }

  function closeAllChipMenus() {
    $$('.ik-pool-chip-menu.is-open').forEach(function (m) {
      m.classList.remove('is-open');
    });
    $$('[data-ik-pool-chip][aria-expanded="true"]').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
  }

  function bindFilterChips() {
    if (!dom.filters) return;

    dom.filters.addEventListener('click', function (e) {
      var chipBtn = e.target.closest('[data-ik-pool-chip]');
      if (chipBtn) {
        e.stopPropagation();
        var key = chipBtn.getAttribute('data-ik-pool-chip');
        var menu = dom.filters.querySelector('[data-chip-menu="' + key + '"]');
        var isOpen = menu && menu.classList.contains('is-open');
        closeAllChipMenus();
        if (menu && !isOpen) {
          menu.classList.add('is-open');
          chipBtn.setAttribute('aria-expanded', 'true');
        }
        return;
      }
      var menuItem = e.target.closest('[data-chip-value]');
      if (menuItem) {
        e.stopPropagation();
        var menu2 = menuItem.closest('[data-chip-menu]');
        var key2 = menu2 ? menu2.getAttribute('data-chip-menu') : null;
        var val = menuItem.getAttribute('data-chip-value');
        if (key2) {
          state.filters[key2] = val || '';
          closeAllChipMenus();
          applyFilters();
        }
      }
    });

    /* Active pills clear */
    if (dom.active) {
      dom.active.addEventListener('click', function (e) {
        var single = e.target.closest('[data-pill-clear]');
        if (single) {
          var k = single.getAttribute('data-pill-clear');
          if (k === 'search') {
            state.filters.search = '';
            if (dom.search) dom.search.value = '';
            if (dom.searchClear) dom.searchClear.hidden = true;
          } else {
            state.filters[k] = '';
          }
          applyFilters();
          return;
        }
        if (e.target.closest('[data-pill-clear-all]')) {
          state.filters = makeEmptyFilters(state.filters.sort);
          if (dom.search) dom.search.value = '';
          if (dom.searchClear) dom.searchClear.hidden = true;
          applyFilters();
        }
      });
    }

    /* Outside click closes chip menus */
    document.addEventListener('click', function (e) {
      if (!dom.filters.contains(e.target)) closeAllChipMenus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllChipMenus();
    });
  }

  function bindEmpty() {
    if (dom.emptyReset) {
      dom.emptyReset.addEventListener('click', function () {
        state.filters = makeEmptyFilters('match');
        if (dom.search) dom.search.value = '';
        if (dom.searchClear) dom.searchClear.hidden = true;
        applyFilters();
      });
    }
  }

  function bindPaginate() {
    if (!dom.more) return;
    dom.more.addEventListener('click', function () {
      state.loaded = Math.min(state.candidates.length, state.loaded + PAGE_SIZE);
      renderList();
    });
  }

  function bindList() {
    if (!dom.list) return;

    dom.list.addEventListener('click', function (e) {
      var checkbox = e.target.closest('[data-row-check]');
      if (checkbox) {
        e.stopPropagation();
        var id = checkbox.getAttribute('data-row-check');
        if (checkbox.checked) state.selected.add(id);
        else state.selected.delete(id);
        var row = checkbox.closest('.ik-pool-row');
        if (row) row.classList.toggle('is-selected', checkbox.checked);
        updateBulkBar();
        if (dom.selectAll) {
          var slice = state.candidates.slice(0, state.loaded);
          var ids = slice.map(function (c) { return c.id; });
          dom.selectAll.checked = ids.length > 0 && ids.every(function (i) { return state.selected.has(i); });
          dom.selectAll.indeterminate = !dom.selectAll.checked && ids.some(function (i) { return state.selected.has(i); });
        }
        return;
      }

      var menuBtn = e.target.closest('[data-row-menu-btn]');
      if (menuBtn) {
        e.stopPropagation();
        var rid = menuBtn.getAttribute('data-row-menu-btn');
        var menu = dom.list.querySelector('[data-row-menu="' + rid + '"]');
        var isOpen = menu && menu.classList.contains('is-open');
        $$('.ik-pool-row__menu.is-open', dom.list).forEach(function (m) {
          m.classList.remove('is-open');
        });
        if (menu && !isOpen) menu.classList.add('is-open');
        return;
      }

      var actionBtn = e.target.closest('[data-row-action]');
      if (actionBtn) {
        e.stopPropagation();
        var act = actionBtn.getAttribute('data-row-action');
        var aid = actionBtn.getAttribute('data-row-id');
        $$('.ik-pool-row__menu.is-open', dom.list).forEach(function (m) {
          m.classList.remove('is-open');
        });
        handleRowAction(act, aid);
        return;
      }

      var row = e.target.closest('.ik-pool-row');
      if (row) {
        var cid = row.getAttribute('data-row-id');
        if (cid) location.href = 'hr-candidate.html?id=' + encodeURIComponent(cid);
      }
    });

    dom.list.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var row = e.target.closest('.ik-pool-row');
      if (!row) return;
      if (e.target.closest('[data-row-check]') || e.target.closest('[data-row-menu-btn]')) return;
      var cid = row.getAttribute('data-row-id');
      if (cid) location.href = 'hr-candidate.html?id=' + encodeURIComponent(cid);
    });

    /* Outside click closes row menus */
    document.addEventListener('click', function (e) {
      if (dom.list && !dom.list.contains(e.target)) {
        $$('.ik-pool-row__menu.is-open', dom.list).forEach(function (m) {
          m.classList.remove('is-open');
        });
      }
    });
  }

  function handleRowAction(action, candidate_id) {
    if (action === 'detail') {
      location.href = 'hr-candidate.html?id=' + encodeURIComponent(candidate_id);
    } else if (action === 'message') {
      location.href = 'hr-messages.html?aday=' + encodeURIComponent(candidate_id);
    } else if (action === 'add') {
      if (!state.activePositionId) {
        showToast('Önce bir pozisyon seç', 'error');
        return;
      }
      IK_DATA.addToPipeline(candidate_id, state.activePositionId).then(function (res) {
        if (res.duplicate) showToast('Aday zaten pipeline\'da', 'error');
        else showToast('Pipeline\'a eklendi', 'success');
      });
    } else if (action === 'block') {
      IK_DATA.blockCandidate(candidate_id).then(function () {
        showToast('Aday bloke edildi', 'success');
        state.candidates = state.candidates.filter(function (c) { return c.id !== candidate_id; });
        state.selected.delete(candidate_id);
        renderList();
      });
    }
  }

  function bindBulk() {
    if (dom.bulkClear) {
      dom.bulkClear.addEventListener('click', function () {
        state.selected.clear();
        $$('.ik-pool-row.is-selected', dom.list).forEach(function (r) {
          r.classList.remove('is-selected');
        });
        $$('[data-row-check]', dom.list).forEach(function (cb) {
          cb.checked = false;
        });
        updateBulkBar();
        if (dom.selectAll) {
          dom.selectAll.checked = false;
          dom.selectAll.indeterminate = false;
        }
      });
    }

    if (dom.bulkAdd) {
      dom.bulkAdd.addEventListener('click', function () {
        if (!state.activePositionId) {
          showToast('Önce bir pozisyon seç', 'error');
          return;
        }
        if (state.selected.size === 0) return;

        var ids = Array.from(state.selected);
        var promises = ids.map(function (id) {
          return IK_DATA.addToPipeline(id, state.activePositionId);
        });
        Promise.all(promises).then(function (results) {
          var added = results.filter(function (r) { return r && !r.duplicate; }).length;
          var dup = results.length - added;
          var msg = added + ' aday eklendi';
          if (dup > 0) msg += ', ' + dup + ' zaten vardı';
          showToast(msg, 'success');
          state.selected.clear();
          updateBulkBar();
          renderList();
        }).catch(function () {
          showToast('Ekleme başarısız', 'error');
        });
      });
    }

    if (dom.selectAll) {
      dom.selectAll.addEventListener('change', function () {
        var slice = state.candidates.slice(0, state.loaded);
        var checked = dom.selectAll.checked;
        slice.forEach(function (c) {
          if (checked) state.selected.add(c.id);
          else state.selected.delete(c.id);
        });
        $$('[data-row-check]', dom.list).forEach(function (cb) {
          cb.checked = checked;
          var row = cb.closest('.ik-pool-row');
          if (row) row.classList.toggle('is-selected', checked);
        });
        updateBulkBar();
      });
    }
  }

  /* ═══════ Init ═══════ */
  function init() {
    cacheDom();
    bindSearch();
    bindSort();
    bindFilterChips();
    bindEmpty();
    bindPaginate();
    bindList();
    bindBulk();

    /* IK_SHELL.ctx hazırsa hemen yükle, değilse ready event + polling fallback.
       fireOnce guard hem event hem poll tarafından tek loadData() garanti eder. */
    if (window.IK_SHELL && window.IK_SHELL.ctx) {
      loadData();
    } else {
      var fired = false;
      var poll = null;
      function fireOnce() {
        if (fired) return;
        fired = true;
        if (poll) clearInterval(poll);
        loadData();
      }
      document.addEventListener('ik-shell:ready', fireOnce, { once: true });
      var tries = 0;
      poll = setInterval(function () {
        if (window.IK_SHELL && window.IK_SHELL.ctx) fireOnce();
        else if (++tries > 30) fireOnce(); /* 3sn timeout — son çare empty state */
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
