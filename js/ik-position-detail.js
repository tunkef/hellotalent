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

  /* ═══════ Stage labels ═══════ */
  var STAGES = [
    { key: 'yeni',     label: 'Yeni' },
    { key: 'gorusme',  label: 'Görüşme' },
    { key: 'mulakat',  label: 'Mülakat' },
    { key: 'teklif',   label: 'Teklif' },
    { key: 'isealim',  label: 'İşe alım' }
  ];

  function fmtCount(n) {
    if (n == null || isNaN(n)) return '0';
    return n > 99 ? '99+' : String(n);
  }

  /* ═══════ Expand content render — KPI + mini pipeline + desc + actions ═══════ */
  function renderExpandContent(expandEl, position, summary) {
    while (expandEl.firstChild) expandEl.removeChild(expandEl.firstChild);

    var inner = document.createElement('div');
    inner.className = 'ik-pos-expand__inner';

    /* ── Head — eyebrow + title (tekrar, accordion içinde context) ── */
    var head = document.createElement('div');
    head.className = 'ik-pos-expand__head';
    var eyebrow = document.createElement('span');
    eyebrow.className = 'ik-pos-expand__eyebrow';
    eyebrow.textContent = 'POZİSYON DETAYI';
    head.appendChild(eyebrow);
    var title = document.createElement('h3');
    title.className = 'ik-pos-expand__title';
    title.textContent = position.ad || position.title || '—';
    head.appendChild(title);
    inner.appendChild(head);

    /* ── KPI 4-col ── */
    var kpi = document.createElement('div');
    kpi.className = 'ik-pos-expand__kpi';
    var kpiData = [
      { label: 'Toplam aday', value: (summary.uzun || 0) + (summary.kisa || 0) + (summary.iletisim || 0) },
      { label: 'Yeni',        value: summary.uzun || 0 },
      { label: 'Mülakat',     value: summary.kisa || 0 },
      { label: 'İşe alım',    value: summary.iletisim || 0 }
    ];
    kpiData.forEach(function (item) {
      var col = document.createElement('div');
      col.className = 'ik-pos-expand__kpi-item';
      var lbl = document.createElement('span');
      lbl.className = 'ik-pos-expand__kpi-label';
      lbl.textContent = item.label;
      col.appendChild(lbl);
      var val = document.createElement('span');
      val.className = 'ik-pos-expand__kpi-value';
      val.textContent = fmtCount(item.value);
      col.appendChild(val);
      kpi.appendChild(col);
    });
    inner.appendChild(kpi);

    /* ── Mini pipeline 5-stage (non-clickable, visual KPI) ── */
    var pipe = document.createElement('div');
    pipe.className = 'ik-pos-expand__pipeline';
    STAGES.forEach(function (st) {
      var stageEl = document.createElement('div');
      stageEl.className = 'ik-pos-expand__stage';
      stageEl.setAttribute('role', 'group');
      stageEl.setAttribute('aria-label', st.label);
      var lbl = document.createElement('span');
      lbl.className = 'ik-pos-expand__stage-label';
      lbl.textContent = st.label;
      stageEl.appendChild(lbl);
      var cnt = document.createElement('span');
      cnt.className = 'ik-pos-expand__stage-count';
      cnt.textContent = fmtCount((summary.stages && summary.stages[st.key]) || 0);
      stageEl.appendChild(cnt);
      pipe.appendChild(stageEl);
    });
    inner.appendChild(pipe);

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
    var isArchive = position.status === 'archive' || position.status === 'closed' || position.is_archive;

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'ik-pos-expand__action';
    editBtn.setAttribute('data-pos-action', 'edit');
    editBtn.setAttribute('data-pos-id', String(position.id));
    editBtn.textContent = 'Düzenle';
    actions.appendChild(editBtn);

    if (!isArchive) {
      var poolBtn = document.createElement('button');
      poolBtn.type = 'button';
      poolBtn.className = 'ik-pos-expand__action';
      poolBtn.setAttribute('data-pos-action', 'pool');
      poolBtn.setAttribute('data-pos-id', String(position.id));
      poolBtn.textContent = 'Adayları görüntüle';
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
