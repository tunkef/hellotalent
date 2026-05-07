/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Position Detail — 7 May refactor: inline accordion expand
   (modal sheet kaldırıldı, paradigm shift T3)

   Public API:
     window._htExpandPositionRow(positionId, rowEl)  — toggle expand
     window._htCollapsePositionRows()                 — collapse all
     window._htOpenPositionDetailSheet(id, src)       — backwards-compat alias

   Single-row policy: aynı anda yalnız bir satır expanded.
   Esc → collapse.
   Deep-link: ?pos=X → page load'da o satır otomatik expand + scrollIntoView.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _state = {
    expandedId: null,
    expandedRow: null,
    contentCache: {}
  };

  /* ═══════ PostHog helper ═══════ */
  function track(name, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(name, props || {}); } catch (e) {}
  }

  function fmtCount(n) {
    if (n == null || isNaN(n)) return '0';
    return n > 99 ? '99+' : String(n);
  }

  /* Tarih helper'ları — ik-pos-list.js'teki spec ile bire-bir aynı (copy spec §6C) */
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

  /* ═══════ Expand content render — KPI + mini pipeline + desc + actions ═══════ */
  function renderExpandContent(expandEl, position, summary) {
    while (expandEl.firstChild) expandEl.removeChild(expandEl.firstChild);

    var inner = document.createElement('div');
    inner.className = 'ik-pos-expand__inner';

    /* ── Açılış meta satırı (Tuna 7 May: tarih satırdan kaldırıldı, burada gösterilir) ── */
    var isArchive = position.durum === 'closed';
    var rawDate = isArchive
      ? (position.updated_at || position.closed_at)
      : position.created_at;
    var dateText = isArchive
      ? formatKapatmaTarihi(rawDate)
      : (formatAcilmaTarihi(rawDate) || '—');
    if (dateText) {
      var meta = document.createElement('div');
      meta.className = 'ik-pos-expand__meta';
      var metaLabel = document.createElement('span');
      metaLabel.className = 'ik-pos-expand__meta-label';
      metaLabel.textContent = isArchive ? 'KAPANIŞ' : 'AÇILIŞ';
      meta.appendChild(metaLabel);
      var metaValue = document.createElement('span');
      metaValue.className = 'ik-pos-expand__meta-value';
      metaValue.textContent = dateText;
      meta.appendChild(metaValue);
      inner.appendChild(meta);
    }

    /* ── Mini board: 3-sütun pipeline (drag-drop ik-pipeline.js reuse)
       Sadece aktif pozisyonlar için; arşivde board yok. ── */
    if (!isArchive) {
      var board = document.createElement('div');
      board.id = 'ik-pos-expand-board-' + position.id;
      board.className = 'ik-pos-expand__board';
      board.setAttribute('data-pos-board', String(position.id));
      inner.appendChild(board);

      /* Board attach — ik-pipeline.js dom.board re-target + load */
      setTimeout(function () {
        if (window._htPipelineBoard) {
          window._htPipelineBoard.attach(board, position.id);
        }
      }, 0);
    }

    /* ── Description ── */
    if (position.aciklama || position.description) {
      var descBlock = document.createElement('div');
      descBlock.className = 'ik-pos-expand__desc-block';
      var descLbl = document.createElement('span');
      descLbl.className = 'ik-pos-expand__desc-label';
      descLbl.textContent = 'Açıklama';
      descBlock.appendChild(descLbl);
      var descP = document.createElement('p');
      descP.className = 'ik-pos-expand__desc';
      descP.textContent = position.aciklama || position.description;
      descBlock.appendChild(descP);
      inner.appendChild(descBlock);
    }

    /* ── Footer actions ── */
    var actions = document.createElement('div');
    actions.className = 'ik-pos-expand__actions';
    /* positions.durum kolonu: 'active' | 'closed' (NOT NULL DEFAULT 'active', migration 20260505130000) */
    var isArchive = position.durum === 'closed';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'ik-pos-expand__action';
    editBtn.setAttribute('data-pos-action', 'edit');
    editBtn.setAttribute('data-pos-id', String(position.id));
    editBtn.textContent = 'Düzenle';
    actions.appendChild(editBtn);

    if (!isArchive) {
      /* 7 May Tuna feedback: stage empty state'inden "Havuza git" buraya taşındı */
      var poolBtn = document.createElement('button');
      poolBtn.type = 'button';
      poolBtn.className = 'ik-pos-expand__action';
      poolBtn.setAttribute('data-pos-action', 'pool');
      poolBtn.setAttribute('data-pos-id', String(position.id));
      poolBtn.textContent = 'Havuza git';
      actions.appendChild(poolBtn);
    }

    var dangerBtn = document.createElement('button');
    dangerBtn.type = 'button';
    dangerBtn.className = 'ik-pos-expand__action ik-pos-expand__action--danger';
    dangerBtn.setAttribute('data-pos-action', isArchive ? 'reopen' : 'close');
    dangerBtn.setAttribute('data-pos-id', String(position.id));
    dangerBtn.textContent = isArchive ? 'Yeniden aç' : 'Kapat';
    actions.appendChild(dangerBtn);

    inner.appendChild(actions);

    expandEl.appendChild(inner);
  }

  /* ═══════ Lazy load + render ═══════ */
  function loadAndRender(positionId, expandEl) {
    var position = null;
    if (window.IK_DATA && IK_DATA._getPositionSync) {
      position = IK_DATA._getPositionSync(positionId);
    }
    if (!position) {
      position = { id: positionId, ad: '—' };
    }

    var cached = _state.contentCache[positionId];
    if (cached) {
      renderExpandContent(expandEl, position, cached);
      return;
    }

    /* Loading placeholder */
    while (expandEl.firstChild) expandEl.removeChild(expandEl.firstChild);
    var loading = document.createElement('div');
    loading.className = 'ik-pos-expand__inner';
    var p = document.createElement('p');
    p.className = 'ik-pos-expand__desc';
    p.textContent = 'Yükleniyor…';
    loading.appendChild(p);
    expandEl.appendChild(loading);

    /* Fetch summary */
    if (window.IK_DATA && IK_DATA.getPipelineSummary) {
      IK_DATA.getPipelineSummary(positionId).then(function (summary) {
        _state.contentCache[positionId] = summary || {};
        renderExpandContent(expandEl, position, summary || {});
      }).catch(function (e) {
        console.error('[ik-position-detail] summary fetch error:', e && e.message);
        renderExpandContent(expandEl, position, {});
      });
    } else {
      renderExpandContent(expandEl, position, {});
    }
  }

  /* ═══════ Collapse all rows ═══════ */
  function collapseAllRows() {
    var grid = document.getElementById('ik-pos-grid');
    if (!grid) return;
    var openRows = grid.querySelectorAll('.ik-pos-row.is-expanded');
    for (var i = 0; i < openRows.length; i++) {
      openRows[i].classList.remove('is-expanded');
      var main = openRows[i].querySelector('.ik-pos-row__main');
      if (main) main.setAttribute('aria-expanded', 'false');
      var expand = openRows[i].querySelector('.ik-pos-row__expand');
      if (expand) expand.hidden = true;
    }
    _state.expandedId = null;
    _state.expandedRow = null;
    /* P2.1: drag state cross-position contamination guard */
    if (window.IK_PIPELINE_STATE) {
      window.IK_PIPELINE_STATE.dragging = null;
    }
    /* P2.1: drawer açıksa kapat (cross-state temizlik) */
    if (typeof window._htCloseCandidateDrawer === 'function') {
      window._htCloseCandidateDrawer();
    }
  }

  /* ═══════ Expand row (toggle) — single-row policy ═══════ */
  function expandPositionRow(positionId, rowEl) {
    if (!rowEl) {
      rowEl = document.querySelector('.ik-pos-row[data-pos-id="' + positionId + '"]');
    }
    if (!rowEl) return;

    var alreadyExpanded = rowEl.classList.contains('is-expanded');

    /* Collapse others first */
    collapseAllRows();

    if (alreadyExpanded) {
      /* Toggle off — URL temizle */
      try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
      return;
    }

    /* Expand target */
    rowEl.classList.add('is-expanded');
    var main = rowEl.querySelector('.ik-pos-row__main');
    if (main) main.setAttribute('aria-expanded', 'true');
    var expand = rowEl.querySelector('.ik-pos-row__expand');
    if (expand) {
      expand.hidden = false;
      loadAndRender(positionId, expand);
    }
    _state.expandedId = positionId;
    _state.expandedRow = rowEl;

    /* Deep-link URL update */
    try {
      history.replaceState(
        { posExpand: positionId },
        '',
        window.location.pathname + '?pos=' + encodeURIComponent(positionId)
      );
    } catch (e) {
      console.warn('[ik-position-detail] replaceState error:', e && e.message);
    }

    /* Scroll into view (smooth, top of row visible) */
    setTimeout(function () {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    track('pipeline_row_expand', {
      position_id: positionId,
      source: 'row_click'
    });
  }

  /* ═══════ Backwards-compat alias (eski card_action_menu çağrıları) ═══════ */
  function openPositionDetailSheet(positionId, source) {
    expandPositionRow(positionId, null);
    track('pipeline_compat_alias', { position_id: positionId, source: source || 'unknown' });
  }

  /* ═══════ Esc keyboard handler ═══════ */
  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _state.expandedId) {
        collapseAllRows();
        try { history.replaceState(null, '', window.location.pathname); } catch (err) {}
      }
    });
  }

  /* ═══════ Deep-link auto-expand on page load (?pos=X) ═══════ */
  function autoExpandFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var posId = params.get('pos');
    if (!posId) return;

    /* Wait for rows to render */
    var tries = 0;
    var poll = setInterval(function () {
      var rowEl = document.querySelector('.ik-pos-row[data-pos-id="' + posId + '"]');
      if (rowEl) {
        clearInterval(poll);
        expandPositionRow(posId, rowEl);
      } else if (++tries > 50) {
        clearInterval(poll);
      }
    }, 100);
  }

  /* ═══════ Init ═══════ */
  function init() {
    bindKeyboard();
    /* Wait for ik-pos-list render */
    if (window._htPosList) {
      autoExpandFromUrl();
    } else {
      var fired = false;
      function onReady() {
        if (fired) return;
        fired = true;
        autoExpandFromUrl();
      }
      document.addEventListener('ik-shell:ready', onReady, { once: true });
      setTimeout(onReady, 800);
    }
  }

  /* ═══════ Public API ═══════ */
  window._htExpandPositionRow      = expandPositionRow;
  window._htCollapsePositionRows   = collapseAllRows;
  /* Backwards-compat */
  window._htOpenPositionDetailSheet  = openPositionDetailSheet;
  window._htClosePositionDetailSheet = collapseAllRows;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
