/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Pos List — PR-7 Pozisyon Yaşam Döngüsü
   Landing kart grid render: aktif + arşiv toggle.
   Segment toggle (Aktif / Arşiv) + empty state + aday sayaçları.
   Kart action menu: Görüntüle / Düzenle / Kapat / Yeniden Aç.
   XSS-safe (textContent + createElementNS only, innerHTML yasak).
   SOLID:
     - SRP: sadece landing kart grid lifecycle.
     - OCP: yeni action menü ögesi ACTIONS config'e eklenir.
     - DIP: data yalnızca IK_DATA üzerinden.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ State ═══════ */
  var _state = {
    view: 'active',          /* 'active' | 'archive' */
    positions: [],
    archivedPositions: [],
    summaries: {}            /* { [positionId]: { uzun, kisa, iletisim } } */
  };

  var _dom = {};

  /* ═══════ DOM cache — PR-7 rework #4: bento-grid (anasayfa pattern) ═══════ */
  function cacheDom() {
    _dom.grid    = document.getElementById('ik-pos-grid');         /* bento container */
    _dom.chip    = document.getElementById('ik-pos-chip');         /* hero chip "X aktif" */
    /* Backwards-compat alias */
    _dom.list    = _dom.grid;
    _dom.subline = _dom.chip;
    _dom.segAktif = document.getElementById('btn-pos-seg-aktif');
    _dom.segArsiv = document.getElementById('btn-pos-seg-arsiv');
  }

  /* ═══════ PostHog helper ═══════ */
  function track(name, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(name, props || {}); } catch (e) {}
  }

  /* ═══════ SVG builder — XSS-safe (DOM API) ═══════ */
  function makeChevronSvg() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    p.setAttribute('points', '6 9 12 15 18 9');
    svg.appendChild(p);
    return svg;
  }

  /* ═══════ Tarih format (copy spec §6C) ═══════ */
  function formatKapatmaTarihi(dateStr) {
    if (!dateStr) return '';
    try {
      var diff = Date.now() - new Date(dateStr).getTime();
      var gun  = Math.floor(diff / 86400000);
      if (gun < 1)  return 'Bugün kapandı';
      if (gun < 7)  return gun + ' gün önce kapandı';
      var hafta = Math.floor(gun / 7);
      if (hafta < 4) return hafta + ' hafta önce kapandı';
      var ay = Math.floor(gun / 30);
      if (ay < 12)  return ay + ' ay önce kapandı';
      return new Date(dateStr).getFullYear() + ' yılında kapandı';
    } catch (e) { return ''; }
  }

  function formatAcilmaTarihi(dateStr) {
    if (!dateStr) return '';
    try {
      var diff = Date.now() - new Date(dateStr).getTime();
      var gun  = Math.floor(diff / 86400000);
      if (gun < 1)  return 'Bugün açıldı';
      if (gun < 7)  return gun + ' gün önce açıldı';
      var hafta = Math.floor(gun / 7);
      if (hafta < 4) return hafta + ' hafta önce açıldı';
      var ay = Math.floor(gun / 30);
      if (ay < 12)  return ay + ' ay önce açıldı';
      return Math.floor(gun / 365) + ' yıl önce açıldı';
    } catch (e) { return ''; }
  }

  /* ═══════ Count format (99+) ═══════ */
  function fmtCount(n) {
    if (n == null || isNaN(n)) return '0';
    return n > 99 ? '99+' : String(n);
  }

  /* ═══════ Kriter chips list ═══════ */
  function buildChipList(pos) {
    var chips = [];
    if (Array.isArray(pos.calisma_tipi) && pos.calisma_tipi.length) {
      chips = chips.concat(pos.calisma_tipi);
    }
    if (Array.isArray(pos.tercih_segmentler) && pos.tercih_segmentler.length) {
      chips = chips.concat(pos.tercih_segmentler);
    }
    if (Array.isArray(pos.diller) && pos.diller.length) {
      chips = chips.concat(pos.diller);
    }
    if (pos.musaitlik_pozisyon) chips.push(pos.musaitlik_pozisyon);
    if (pos.egitim_seviye) chips.push(pos.egitim_seviye);
    return chips;
  }

  /* ═══════ Row DOM — 7 May refactor: wide list + inline accordion expand
     Modal sheet kaldırıldı; her satır kendi expand panelini içerir.
     Click → _htExpandPositionRow(posId, rowEl) (single-row policy).
     ═══════ */
  function buildRow(pos, isArchive) {
    var row = document.createElement('div');
    row.className = 'ik-pos-row';
    row.setAttribute('data-pos-id', String(pos.id));
    row.setAttribute('data-status', isArchive ? 'archive' : 'active');
    row.setAttribute('role', 'row');

    /* ── Main click area (button for keyboard a11y) ── */
    var main = document.createElement('button');
    main.type = 'button';
    main.className = 'ik-pos-row__main';
    main.setAttribute('aria-expanded', 'false');
    main.setAttribute('aria-controls', 'pos-expand-' + pos.id);

    var title = document.createElement('h3');
    title.className = 'ik-pos-row__title';
    title.textContent = pos.ad || pos.title || '—';
    main.appendChild(title);

    var segCell = document.createElement('span');
    segCell.className = 'ik-pos-row__cell ik-pos-row__cell--segment';
    segCell.textContent = pos.seg || pos.segment || '—';
    main.appendChild(segCell);

    var locCell = document.createElement('span');
    locCell.className = 'ik-pos-row__cell ik-pos-row__cell--mono ik-pos-row__cell--location';
    locCell.textContent = pos.sehir || pos.city || '—';
    main.appendChild(locCell);

    var expCell = document.createElement('span');
    expCell.className = 'ik-pos-row__cell ik-pos-row__cell--mono ik-pos-row__cell--exp';
    expCell.textContent = pos.exp || pos.experience_years || '—';
    main.appendChild(expCell);

    var candCell = document.createElement('span');
    candCell.className = 'ik-pos-row__cell ik-pos-row__cell--candidates';
    candCell.setAttribute('data-row-cand', String(pos.id));
    candCell.textContent = '—';
    main.appendChild(candCell);

    /* 7 May refactor: aktif view'da chip kaldırıldı (Tuna feedback "zaten aktif
       listesinin içindeyiz"). Sadece arşiv view'da read-only context göstergesi. */
    if (isArchive) {
      var chip = document.createElement('span');
      chip.className = 'ik-pos-row__chip ik-pos-row__chip--archive';
      chip.textContent = 'Arşiv';
      main.appendChild(chip);
    }

    /* 7 May Tuna feedback: time satırdan kaldırıldı, expand içinde "Açılış" satırında render edilir */

    var chev = document.createElement('span');
    chev.className = 'ik-pos-row__chevron';
    chev.setAttribute('aria-hidden', 'true');
    chev.appendChild(makeChevronSvg());
    main.appendChild(chev);

    row.appendChild(main);

    /* ── Expand panel (lazy content fill on first expand) ── */
    var expand = document.createElement('div');
    expand.className = 'ik-pos-row__expand';
    expand.id = 'pos-expand-' + pos.id;
    expand.hidden = true;
    expand.setAttribute('role', 'region');
    expand.setAttribute('aria-label', 'Pozisyon detayı');
    row.appendChild(expand);

    /* Click → toggle expand (single-row policy via ik-position-detail.js) */
    main.addEventListener('click', function () {
      if (window._htExpandPositionRow) {
        window._htExpandPositionRow(pos.id, row);
      }
      track('position_list_item_click', { id: pos.id, view: isArchive ? 'archive' : 'active' });
    });
    return row;
  }

  /* ═══════ Header row — column labels (editorial table head) ═══════ */
  function buildHeaderRow(isArchive) {
    var head = document.createElement('div');
    head.className = 'ik-pos-table__head' + (isArchive ? ' ik-pos-table__head--archive' : '');
    head.setAttribute('role', 'row');

    var cols = [
      { label: 'POZİSYON',  cls: '' },
      { label: 'SEGMENT',   cls: '' },
      { label: 'LOKASYON',  cls: '' },
      { label: 'DENEYİM',   cls: '' },
      { label: 'ADAY',      cls: 'ik-pos-table__head-cell--right' }
    ];
    if (isArchive) {
      cols.push({ label: 'DURUM', cls: '' });
    }
    cols.push({ label: '',       cls: '' }); /* chevron spacer */

    cols.forEach(function (c) {
      var span = document.createElement('span');
      span.className = 'ik-pos-table__head-cell ' + c.cls;
      span.textContent = c.label;
      head.appendChild(span);
    });
    return head;
  }

  /* ═══════ Empty state — PR-7 CLATU: eyebrow + centered + CTA ═══════ */
  function buildEmptyState(isArchive) {
    var wrap = document.createElement('div');
    wrap.className = 'ik-pos-empty' + (isArchive ? ' ik-pos-empty--archive' : '');

    var eyebrow = document.createElement('span');
    eyebrow.className = 'ik-pos-empty__eyebrow';
    eyebrow.textContent = isArchive ? 'ARŞİV BOŞ' : 'AÇIK POZİSYON YOK';
    wrap.appendChild(eyebrow);

    var h = document.createElement('h2');
    h.className = 'ik-pos-empty__heading';
    h.textContent = isArchive ? 'Arşivde pozisyon bulunmuyor' : 'İlk pozisyonunu oluştur';
    wrap.appendChild(h);

    if (!isArchive) {
      var desc = document.createElement('p');
      desc.className = 'ik-pos-empty__desc';
      desc.textContent = 'Eşleşen adaylar otomatik listene gelir.';
      wrap.appendChild(desc);

      var cta = document.createElement('button');
      cta.type = 'button';
      cta.className = 'ik-pos-empty__cta';
      cta.id = 'btn-empty-new-position';
      cta.textContent = 'Yeni Pozisyon';
      cta.addEventListener('click', function () {
        var mainCta = document.getElementById('btn-new-position');
        if (mainCta) mainCta.click();
      });
      wrap.appendChild(cta);
    }
    return wrap;
  }

  /* ═══════ Count update — 7 May refactor: row data-row-cand güncelle ═══════ */
  function updateCountChips(posId, summary) {
    var cell = document.querySelector('[data-row-cand="' + posId + '"]');
    if (!cell) return;
    var total = (summary.uzun || 0) + (summary.kisa || 0) + (summary.iletisim || 0);
    cell.textContent = fmtCount(total) + ' aday';
  }

  /* ═══════ Render list — PR-7 rework #3: ik-list pattern ═══════ */
  function renderGrid() {
    if (!_dom.list) return;
    while (_dom.list.firstChild) _dom.list.removeChild(_dom.list.firstChild);

    var isArchive = _state.view === 'archive';
    var list = isArchive ? _state.archivedPositions : _state.positions;

    /* PR-7 rework #3 — ik-card__chip head: "N aktif" veya "N arşiv" */
    if (_dom.chip) {
      var aktifSayi  = _state.positions.length;
      var arsivSayi  = _state.archivedPositions.length;
      _dom.chip.textContent = isArchive
        ? (arsivSayi + ' arşiv')
        : (aktifSayi + ' aktif');
    }

    if (!list.length) {
      _dom.grid.appendChild(buildEmptyState(isArchive));
      return;
    }

    /* Editorial column header — alignment netleştirir, table head pattern */
    _dom.grid.appendChild(buildHeaderRow(isArchive));

    list.forEach(function (pos) {
      _dom.grid.appendChild(buildRow(pos, isArchive));
    });

    /* Load count summaries async */
    list.forEach(function (pos) {
      if (_state.summaries[pos.id]) {
        updateCountChips(pos.id, _state.summaries[pos.id]);
      } else if (window.IK_DATA && IK_DATA.getPipelineSummary) {
        IK_DATA.getPipelineSummary(pos.id).then(function (s) {
          _state.summaries[pos.id] = s;
          updateCountChips(pos.id, s);
        });
      }
    });

    track('position_list_view', { view: _state.view, count: list.length });
  }

  /* ═══════ Segment toggle ═══════ */
  function setView(view) {
    _state.view = view;
    var isArsiv = view === 'archive';
    if (_dom.segAktif) {
      _dom.segAktif.classList.toggle('is-active', !isArsiv);
      _dom.segAktif.setAttribute('aria-selected', isArsiv ? 'false' : 'true');
    }
    if (_dom.segArsiv) {
      _dom.segArsiv.classList.toggle('is-active', isArsiv);
      _dom.segArsiv.setAttribute('aria-selected', isArsiv ? 'true' : 'false');
    }
  }

  function bindSegmentToggle() {
    if (_dom.segAktif) {
      _dom.segAktif.addEventListener('click', function () {
        if (_state.view === 'active') return;
        setView('active');
        renderGrid();
      });
    }
    if (_dom.segArsiv) {
      _dom.segArsiv.addEventListener('click', function () {
        if (_state.view === 'archive') return;
        setView('archive');
        if (!_state.archivedPositions.length && window.IK_DATA && IK_DATA.getArchivedPositions) {
          IK_DATA.getArchivedPositions().then(function (list) {
            _state.archivedPositions = list || [];
            renderGrid();
          });
        } else {
          renderGrid();
        }
        track('position_list_view', { view: 'archive' });
      });
    }
  }

  /* ═══════ Action dispatch — accordion expand footer butonları çağırır
     (data-pos-action attribute via ik-position-detail.js) ═══════ */
  function bindActionDelegate() {
    if (!_dom.grid) return;
    _dom.grid.addEventListener('click', function (e) {
      var actionBtn = e.target.closest('[data-pos-action]');
      if (!actionBtn) return;
      e.stopPropagation();
      var action = actionBtn.getAttribute('data-pos-action');
      var posId  = actionBtn.getAttribute('data-pos-id');
      if (posId) handleAction(action, posId);
    });
  }

  function handleAction(action, posIdStr) {
    var posId = isNaN(posIdStr) ? posIdStr : Number(posIdStr);

    if (action === 'edit') {
      if (window._htOpenPositionEditSheet) {
        window._htOpenPositionEditSheet(posId);
      }
      track('position_edit_open', { position_id: posId, source: 'row_expand_footer' });
      return;
    }

    if (action === 'pool') {
      window.location.href = 'hr-pool.html?pos=' + encodeURIComponent(posId);
      track('position_pool_open', { position_id: posId, source: 'row_expand_footer' });
      return;
    }

    if (action === 'close') {
      if (window._htPosClose && window._htPosClose.confirmClose) {
        window._htPosClose.confirmClose(posId, function () {
          _state.positions = _state.positions.filter(function (p) {
            return String(p.id) !== String(posId);
          });
          delete _state.summaries[posId];
          _state.archivedPositions = [];
          renderGrid();
        });
      }
      return;
    }

    if (action === 'reopen') {
      if (window._htPosClose && window._htPosClose.confirmReopen) {
        window._htPosClose.confirmReopen(posId, function () {
          _state.archivedPositions = _state.archivedPositions.filter(function (p) {
            return String(p.id) !== String(posId);
          });
          _state.positions = [];
          setView('active');
          loadAndRender();
        });
      }
      return;
    }
  }

  /* ═══════ Load & render ═══════ */
  function loadAndRender() {
    if (!window.IK_DATA) return;
    IK_DATA.getPositions().then(function (list) {
      _state.positions = list || [];
      renderGrid();
    }).catch(function (e) {
      console.error('[ik-pos-list] loadAndRender error:', e && e.message);
    });
  }

  /* ═══════ Init ═══════ */
  function init() {
    cacheDom();
    if (!_dom.grid) return;
    bindSegmentToggle();
    bindActionDelegate();

    if (window.IK_SHELL && window.IK_SHELL.ctx) {
      loadAndRender();
    } else {
      var fired = false;
      function onReady() {
        if (fired) return;
        fired = true;
        loadAndRender();
      }
      document.addEventListener('ik-shell:ready', onReady, { once: true });
      var tries = 0;
      var poll = setInterval(function () {
        if (window.IK_SHELL && window.IK_SHELL.ctx) {
          clearInterval(poll);
          onReady();
        } else if (++tries > 30) {
          clearInterval(poll);
        }
      }, 100);
    }
  }

  /* ═══════ Public API ═══════ */
  window._htPosList = {
    init:    init,
    refresh: loadAndRender,
    getActivePositions: function () { return _state.positions; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
