/* global IK_SHELL, IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Pipeline — Asama 86 Sprint B
   5-stage kanban + HTML5 drag-drop + position switcher.
   Mobile: bottom-sheet stage mover.
   XSS-safe (textContent only).
   SOLID:
     - SRP: render / drag-drop / sheet ayri fonksiyonlar.
     - OCP: STAGES config-driven, yeni stage eklemek tek satir.
     - DIP: data sadece IK_DATA uzerinden.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Stage tanimlari (UI label override demo data key'lerini saklar) */
  var STAGES = [
    { key: 'basvuru',  label: 'Yeni',     short: 'Yeni' },
    { key: 'on_eleme', label: 'Görüştüm', short: 'Görüştüm' },
    { key: 'mulakat',  label: 'Mülakat',  short: 'Mülakat' },
    { key: 'teklif',   label: 'Teklif',   short: 'Teklif' },
    { key: 'kapali',   label: 'Kapandı',  short: 'Kapandı' }
  ];

  /* ═══════ State ═══════ */
  var state = {
    positions: [],
    activePositionId: null,
    activePosition: null,
    pipelineEntries: [],   /* {id, position_id, candidate_id, stage, ...} */
    candidatesById: {},    /* lookup */
    dragging: null,        /* {candidate_id, fromStage} */
    sheetCandidate: null,
    sheetCurrentStage: null
  };

  var dom = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function cacheDom() {
    dom.posBtn       = $('[data-ik-position-btn]');
    dom.posTitle     = $('[data-ik-position-title]');
    dom.posMenu      = $('[data-ik-position-menu]');
    dom.summary      = $('[data-ik-pipeline-summary]');
    dom.board        = $('[data-ik-pipeline-board]');
    dom.loading      = $('[data-ik-pipeline-loading]');
    dom.sheetOverlay = $('[data-ik-stage-sheet-overlay]');
    dom.sheet        = $('[data-ik-stage-sheet]');
    dom.sheetTitle   = $('[data-ik-stage-sheet-title]');
    dom.sheetSub     = $('[data-ik-stage-sheet-sub]');
    dom.sheetList    = $('[data-ik-stage-sheet-list]');
    dom.toast        = $('[data-ik-pipeline-toast]');
  }

  /* ═══════ Helpers ═══════ */
  function initialOf(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function clearChildren(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function isMobileDevice() {
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function showToast(msg, kind) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.remove('ik-pipeline-toast--success', 'ik-pipeline-toast--error');
    if (kind === 'success') dom.toast.classList.add('ik-pipeline-toast--success');
    else if (kind === 'error') dom.toast.classList.add('ik-pipeline-toast--error');
    dom.toast.classList.add('is-visible');
    setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, 2200);
  }

  function matchClass(score) {
    if (score >= 70) return '';
    if (score >= 40) return 'ik-card-aday__match--mid';
    return 'ik-card-aday__match--low';
  }

  /* ═══════ Position switcher ═══════ */
  function renderPositionSwitcher() {
    if (dom.posTitle && state.activePosition) {
      dom.posTitle.textContent = state.activePosition.title;
    } else if (dom.posTitle) {
      dom.posTitle.textContent = 'Pozisyon yok';
    }

    if (!dom.posMenu) return;
    clearChildren(dom.posMenu);
    state.positions.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ik-position-switcher__item';
      if (state.activePositionId === p.id) btn.classList.add('is-selected');
      btn.setAttribute('data-position-id', p.id);
      btn.setAttribute('role', 'option');

      var t = document.createElement('span');
      t.textContent = p.title;
      btn.appendChild(t);

      var meta = document.createElement('span');
      meta.className = 'ik-position-switcher__item-meta';
      meta.textContent = (p.city || '—') +
        (p.experience_years ? ' · ' + p.experience_years + ' yıl' : '') +
        (p.active_pipeline_count != null ? ' · ' + p.active_pipeline_count + ' aday' : '');
      btn.appendChild(meta);

      dom.posMenu.appendChild(btn);
    });
  }

  function bindPositionSwitcher() {
    if (!dom.posBtn || !dom.posMenu) return;

    dom.posBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dom.posMenu.classList.toggle('is-open');
      dom.posBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    dom.posMenu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-position-id]');
      if (!item) return;
      var pid = item.getAttribute('data-position-id');
      if (pid === state.activePositionId) {
        dom.posMenu.classList.remove('is-open');
        dom.posBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      state.activePositionId = pid;
      state.activePosition = state.positions.find(function (p) { return p.id === pid; }) || null;
      if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
        IK_SHELL.setActivePositionId(pid);
      }
      dom.posMenu.classList.remove('is-open');
      dom.posBtn.setAttribute('aria-expanded', 'false');
      renderPositionSwitcher();
      loadPipeline();
    });

    document.addEventListener('click', function (e) {
      if (!dom.posMenu.contains(e.target) && !dom.posBtn.contains(e.target)) {
        dom.posMenu.classList.remove('is-open');
        dom.posBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dom.posMenu.classList.contains('is-open')) {
        dom.posMenu.classList.remove('is-open');
        dom.posBtn.setAttribute('aria-expanded', 'false');
        dom.posBtn.focus();
      }
    });
  }

  /* ═══════ Summary chips ═══════ */
  function renderSummary() {
    if (!dom.summary) return;
    clearChildren(dom.summary);

    var counts = {};
    STAGES.forEach(function (s) { counts[s.key] = 0; });
    state.pipelineEntries.forEach(function (e) {
      if (counts[e.stage] != null) counts[e.stage]++;
    });

    STAGES.forEach(function (s) {
      var chip = document.createElement('div');
      chip.className = 'ik-pipeline__summary-chip';
      var n = document.createElement('strong');
      n.textContent = String(counts[s.key]);
      chip.appendChild(n);
      var l = document.createElement('span');
      l.textContent = s.label;
      chip.appendChild(l);
      dom.summary.appendChild(chip);
    });
  }

  /* ═══════ Card render ═══════ */
  function renderCard(entry) {
    var c = state.candidatesById[entry.candidate_id];
    if (!c) {
      var ph = document.createElement('div');
      ph.className = 'ik-card-aday';
      var t = document.createElement('div');
      t.className = 'ik-card-aday__name';
      t.textContent = '— Aday bulunamadı —';
      ph.appendChild(t);
      return ph;
    }

    var card = document.createElement('article');
    card.className = 'ik-card-aday';
    card.setAttribute('data-card-cid', c.id);
    card.setAttribute('data-card-stage', entry.stage);
    card.setAttribute('draggable', 'true');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', c.full_name + ' kartı');

    /* head */
    var head = document.createElement('div');
    head.className = 'ik-card-aday__head';

    var av = document.createElement('div');
    av.className = 'ik-card-aday__avatar';
    av.textContent = initialOf(c.full_name);
    av.setAttribute('aria-hidden', 'true');
    head.appendChild(av);

    var main = document.createElement('div');
    main.className = 'ik-card-aday__main';
    var name = document.createElement('div');
    name.className = 'ik-card-aday__name';
    name.textContent = c.full_name;
    main.appendChild(name);
    var poz = document.createElement('div');
    poz.className = 'ik-card-aday__poz';
    poz.textContent = c.son_pozisyon || '—';
    main.appendChild(poz);
    head.appendChild(main);

    var menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'ik-card-aday__menu-btn';
    menuBtn.setAttribute('aria-label', c.full_name + ' menüsü');
    menuBtn.setAttribute('data-card-menu-btn', c.id);
    var dotsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dotsSvg.setAttribute('viewBox', '0 0 24 24');
    dotsSvg.setAttribute('fill', 'none');
    [5, 12, 19].forEach(function (cy) {
      var d = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      d.setAttribute('cx', '12');
      d.setAttribute('cy', String(cy));
      d.setAttribute('r', '1.4');
      d.setAttribute('fill', 'currentColor');
      dotsSvg.appendChild(d);
    });
    menuBtn.appendChild(dotsSvg);
    head.appendChild(menuBtn);

    card.appendChild(head);

    /* meta (match + adres_il) */
    var meta = document.createElement('div');
    meta.className = 'ik-card-aday__meta';

    /* Phase D2.3: match_score RPC field; fallback calcMatch */
    var match = (c.match_score != null) ? c.match_score : null;
    if (match == null && state.activePosition) {
      match = IK_DATA.calcMatch(c, state.activePosition);
    }
    if (match != null) {
      var mp = document.createElement('span');
      mp.className = 'ik-card-aday__match ' + matchClass(match);
      var mn = document.createElement('span');
      mn.textContent = match + '%';
      mp.appendChild(mn);
      meta.appendChild(mp);
    }

    if (c.adres_il) {
      if (meta.children.length) {
        var sep = document.createElement('span');
        sep.className = 'ik-card-aday__sep';
        sep.textContent = '·';
        meta.appendChild(sep);
      }
      var s = document.createElement('span');
      s.textContent = c.adres_il;
      meta.appendChild(s);
    }

    card.appendChild(meta);

    /* match_reasons chips (kompakt, max 2) — Phase D2.3 */
    var reasons = Array.isArray(c.match_reasons) ? c.match_reasons : [];
    if (reasons.length) {
      var reasonsRow = document.createElement('div');
      reasonsRow.className = 'ik-card-aday__reasons';
      reasons.slice(0, 2).forEach(function (r) {
        var chip = document.createElement('span');
        chip.className = 'ik-match-chip';
        chip.textContent = r;
        reasonsRow.appendChild(chip);
      });
      card.appendChild(reasonsRow);
    }

    /* menu */
    var menu = document.createElement('div');
    menu.className = 'ik-card-aday__menu';
    menu.setAttribute('data-card-menu', c.id);

    var actions = [
      { action: 'detail',  label: 'Detayı aç' },
      { action: 'message', label: 'Mesaj yaz' },
      { action: 'stage',   label: 'Aşamayı değiştir' },
      { action: 'remove',  label: 'Pipeline\'dan çıkar', danger: true }
    ];
    actions.forEach(function (a) {
      var b;
      if (a.action === 'detail' || a.action === 'message') {
        b = document.createElement('a');
        if (a.action === 'detail') b.href = 'hr-candidate.html?id=' + encodeURIComponent(c.id);
        else b.href = 'hr-messages.html?aday=' + encodeURIComponent(c.id);
      } else {
        b = document.createElement('button');
        b.type = 'button';
      }
      b.className = 'ik-card-aday__menu-item' + (a.danger ? ' ik-card-aday__menu-item--danger' : '');
      b.setAttribute('data-card-action', a.action);
      b.setAttribute('data-card-cid', c.id);
      b.textContent = a.label;
      menu.appendChild(b);
    });
    card.appendChild(menu);

    return card;
  }

  /* ═══════ Stage column render ═══════ */
  function renderStageColumn(stageDef) {
    var col = document.createElement('section');
    col.className = 'ik-stage';
    col.setAttribute('data-stage-key', stageDef.key);

    var header = document.createElement('header');
    header.className = 'ik-stage__header';
    var title = document.createElement('div');
    title.className = 'ik-stage__title';
    title.textContent = stageDef.label;
    header.appendChild(title);

    var entries = state.pipelineEntries.filter(function (e) { return e.stage === stageDef.key; });
    var count = document.createElement('div');
    count.className = 'ik-stage__count';
    count.textContent = String(entries.length);
    count.setAttribute('aria-label', entries.length + ' aday');
    header.appendChild(count);

    col.appendChild(header);

    var body = document.createElement('div');
    body.className = 'ik-stage__body';
    body.setAttribute('data-stage-body', stageDef.key);

    if (entries.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'ik-pipeline-empty';
      var icon = document.createElement('div');
      icon.className = 'ik-pipeline-empty__icon';
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      var pp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pp.setAttribute('d', 'M5 12h14M12 5l7 7-7 7');
      svg.appendChild(pp);
      icon.appendChild(svg);
      empty.appendChild(icon);
      var et = document.createElement('p');
      et.className = 'ik-pipeline-empty__title';
      et.textContent = 'Bu aşamada aday yok';
      empty.appendChild(et);
      var cta = document.createElement('a');
      cta.className = 'ik-pipeline-empty__cta';
      cta.href = 'hr-pool.html';
      cta.textContent = 'Havuza git';
      empty.appendChild(cta);
      body.appendChild(empty);
    } else {
      entries.forEach(function (e) {
        body.appendChild(renderCard(e));
      });
    }

    col.appendChild(body);
    return col;
  }

  /* ═══════ Board render ═══════ */
  function renderBoard() {
    if (!dom.board) return;
    clearChildren(dom.board);
    STAGES.forEach(function (s) {
      dom.board.appendChild(renderStageColumn(s));
    });
    bindDragDrop();
    bindCardEvents();
  }

  /* ═══════ Drag-drop ═══════ */
  function bindDragDrop() {
    var cards = $$('[data-card-cid]', dom.board);
    cards.forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        if (isMobileDevice()) {
          e.preventDefault();
          return;
        }
        var cid = card.getAttribute('data-card-cid');
        var stage = card.getAttribute('data-card-stage');
        state.dragging = { candidate_id: cid, fromStage: stage };
        card.classList.add('ik-card-aday--dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', cid); } catch (err) { /* ignore */ }
        }
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('ik-card-aday--dragging');
        $$('.ik-stage--drop-target', dom.board).forEach(function (c) {
          c.classList.remove('ik-stage--drop-target');
        });
        state.dragging = null;
      });
    });

    var stages = $$('.ik-stage', dom.board);
    stages.forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        if (!state.dragging) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        col.classList.add('ik-stage--drop-target');
      });
      col.addEventListener('dragleave', function (e) {
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('ik-stage--drop-target');
        }
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('ik-stage--drop-target');
        if (!state.dragging) return;
        var newStage = col.getAttribute('data-stage-key');
        var cid = state.dragging.candidate_id;
        if (state.dragging.fromStage === newStage) {
          state.dragging = null;
          return;
        }
        moveCandidateToStage(cid, newStage);
      });
    });
  }

  function moveCandidateToStage(candidate_id, newStage) {
    if (!state.activePositionId) return;
    /* Optimistic update */
    state.pipelineEntries = state.pipelineEntries.map(function (e) {
      if (e.candidate_id === candidate_id && e.position_id === state.activePositionId) {
        return Object.assign({}, e, { stage: newStage, updated_at: new Date().toISOString() });
      }
      return e;
    });
    renderSummary();
    renderBoard();

    IK_DATA.moveStage(candidate_id, state.activePositionId, newStage).then(function () {
      var label = (STAGES.find(function (s) { return s.key === newStage; }) || {}).label || newStage;
      showToast(label + ' aşamasına taşındı', 'success');
    }).catch(function () {
      showToast('Taşıma başarısız', 'error');
      loadPipeline();
    });
  }

  /* ═══════ Card events (menu + click) ═══════ */
  function bindCardEvents() {
    if (!dom.board) return;

    /* Menu toggle */
    dom.board.addEventListener('click', function (e) {
      var menuBtn = e.target.closest('[data-card-menu-btn]');
      if (menuBtn) {
        e.stopPropagation();
        var cid = menuBtn.getAttribute('data-card-menu-btn');
        var menu = dom.board.querySelector('[data-card-menu="' + cid + '"]');
        var isOpen = menu && menu.classList.contains('is-open');
        $$('.ik-card-aday__menu.is-open', dom.board).forEach(function (m) {
          m.classList.remove('is-open');
        });
        if (menu && !isOpen) menu.classList.add('is-open');
        return;
      }

      var actBtn = e.target.closest('[data-card-action]');
      if (actBtn) {
        var act = actBtn.getAttribute('data-card-action');
        if (act === 'detail' || act === 'message') {
          /* anchor — let it navigate */
          return;
        }
        e.stopPropagation();
        e.preventDefault();
        var cid2 = actBtn.getAttribute('data-card-cid');
        $$('.ik-card-aday__menu.is-open', dom.board).forEach(function (m) {
          m.classList.remove('is-open');
        });
        handleCardAction(act, cid2);
        return;
      }

      var card = e.target.closest('[data-card-cid]');
      if (card) {
        var c = card.getAttribute('data-card-cid');
        if (isMobileDevice()) {
          /* Mobile: tap → bottom-sheet */
          openStageSheet(c);
        } else {
          location.href = 'hr-candidate.html?id=' + encodeURIComponent(c);
        }
      }
    });

    dom.board.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('[data-card-cid]');
      if (!card) return;
      if (e.target.closest('[data-card-menu-btn]') || e.target.closest('[data-card-action]')) return;
      e.preventDefault();
      var cid = card.getAttribute('data-card-cid');
      if (isMobileDevice()) openStageSheet(cid);
      else location.href = 'hr-candidate.html?id=' + encodeURIComponent(cid);
    });

    /* Outside click closes menus */
    document.addEventListener('click', function (e) {
      if (dom.board && !dom.board.contains(e.target)) {
        $$('.ik-card-aday__menu.is-open', dom.board).forEach(function (m) {
          m.classList.remove('is-open');
        });
      }
    });
  }

  function handleCardAction(action, candidate_id) {
    if (action === 'stage') {
      openStageSheet(candidate_id);
    } else if (action === 'remove') {
      IK_DATA.removeFromPipeline(candidate_id, state.activePositionId).then(function () {
        showToast('Pipeline\'dan çıkarıldı', 'success');
        state.pipelineEntries = state.pipelineEntries.filter(function (e) {
          return !(e.candidate_id === candidate_id && e.position_id === state.activePositionId);
        });
        renderSummary();
        renderBoard();
      });
    }
  }

  /* ═══════ Bottom-sheet (stage mover) ═══════ */
  function openStageSheet(candidate_id) {
    var entry = state.pipelineEntries.find(function (e) {
      return e.candidate_id === candidate_id && e.position_id === state.activePositionId;
    });
    if (!entry) return;
    state.sheetCandidate = candidate_id;
    state.sheetCurrentStage = entry.stage;

    var c = state.candidatesById[candidate_id];
    if (dom.sheetTitle) {
      dom.sheetTitle.textContent = (c && c.full_name) || 'Aday';
    }
    if (dom.sheetSub) {
      var stLbl = (STAGES.find(function (s) { return s.key === entry.stage; }) || {}).label || entry.stage;
      dom.sheetSub.textContent = 'Şu anki aşama: ' + stLbl;
    }

    if (dom.sheetList) {
      clearChildren(dom.sheetList);
      STAGES.forEach(function (s) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ik-stage-sheet__option';
        if (s.key === entry.stage) btn.classList.add('is-current');
        btn.setAttribute('data-sheet-stage', s.key);
        var lbl = document.createElement('span');
        lbl.textContent = s.label;
        btn.appendChild(lbl);
        if (s.key === entry.stage) {
          var cur = document.createElement('span');
          cur.className = 'ik-stage-sheet__option-current';
          cur.textContent = 'şu anki';
          btn.appendChild(cur);
        }
        dom.sheetList.appendChild(btn);
      });
    }

    if (dom.sheet) {
      dom.sheet.classList.add('is-open');
      dom.sheet.setAttribute('aria-hidden', 'false');
    }
    if (dom.sheetOverlay) dom.sheetOverlay.classList.add('is-open');
    document.body.classList.add('ht-scroll-lock');
  }

  function closeStageSheet() {
    if (dom.sheet) {
      dom.sheet.classList.remove('is-open');
      dom.sheet.setAttribute('aria-hidden', 'true');
    }
    if (dom.sheetOverlay) dom.sheetOverlay.classList.remove('is-open');
    document.body.classList.remove('ht-scroll-lock');
    state.sheetCandidate = null;
  }

  function bindStageSheet() {
    if (dom.sheetOverlay) {
      dom.sheetOverlay.addEventListener('click', closeStageSheet);
    }
    if (dom.sheetList) {
      dom.sheetList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-sheet-stage]');
        if (!btn) return;
        var newStage = btn.getAttribute('data-sheet-stage');
        if (newStage === state.sheetCurrentStage) {
          closeStageSheet();
          return;
        }
        var cid = state.sheetCandidate;
        closeStageSheet();
        if (cid) moveCandidateToStage(cid, newStage);
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dom.sheet && dom.sheet.classList.contains('is-open')) {
        closeStageSheet();
      }
    });
  }

  /* ═══════ Data load ═══════ */
  function loadInit() {
    if (dom.loading) dom.loading.hidden = false;

    return Promise.all([
      IK_DATA.getPositions(),
      /* tum candidates'lar lookup icin */
      IK_DATA.searchCandidates({}, null)
    ]).then(function (results) {
      state.positions = results[0] || [];
      var candList = results[1] || [];
      state.candidatesById = {};
      candList.forEach(function (c) { state.candidatesById[c.id] = c; });

      /* Active position */
      var posId = (window.IK_SHELL && IK_SHELL.getActivePositionId)
        ? IK_SHELL.getActivePositionId() : null;
      if (!posId && state.positions.length) {
        posId = state.positions[0].id;
        if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
          IK_SHELL.setActivePositionId(posId);
        }
      }
      state.activePositionId = posId;
      state.activePosition = state.positions.find(function (p) { return p.id === posId; }) || null;

      renderPositionSwitcher();
      return loadPipeline();
    }).catch(function (e) {
      console.warn('[ik-pipeline] init fail:', e && e.message);
      if (dom.loading) {
        dom.loading.querySelector('.ik-pipeline__loading-text').textContent = 'Yükleme başarısız';
      }
    });
  }

  function loadPipeline() {
    if (!state.activePositionId) {
      state.pipelineEntries = [];
      renderSummary();
      renderBoard();
      return Promise.resolve();
    }
    if (dom.loading) dom.loading.hidden = false;
    return IK_DATA.getPipeline(state.activePositionId).then(function (entries) {
      state.pipelineEntries = entries || [];
      if (dom.loading) dom.loading.hidden = true;
      renderSummary();
      renderBoard();
    });
  }

  /* ═══════ A24: Pozisyon Formu Sheet ═══════ */

  var _posFormDom = {};
  var _posFormOpener = null; /* focus iade için */

  function cachePosFormDom() {
    _posFormDom.overlay   = document.getElementById('ik-pos-form-overlay');
    _posFormDom.sheet     = document.getElementById('ik-pos-form-sheet');
    _posFormDom.form      = document.getElementById('ik-pos-form');
    _posFormDom.btnClose  = document.getElementById('btn-pos-form-close');
    _posFormDom.btnCancel = document.getElementById('btn-pos-form-cancel');
    _posFormDom.btnSubmit = document.getElementById('btn-pos-form-submit');
    _posFormDom.btnNew    = document.getElementById('btn-new-position');
    _posFormDom.fieldAd   = document.getElementById('pos-field-ad');
    _posFormDom.fieldSehir= document.getElementById('pos-field-sehir');
    _posFormDom.fieldSeg  = document.getElementById('pos-field-seg');
    _posFormDom.fieldExp  = document.getElementById('pos-field-exp');
    _posFormDom.fieldMaas = document.getElementById('pos-field-maas');
    _posFormDom.fieldAcik = document.getElementById('pos-field-aciklama');
    _posFormDom.counter   = document.getElementById('pos-field-aciklama-counter');
    _posFormDom.adError   = document.getElementById('pos-field-ad-error');
    _posFormDom.srvError  = document.getElementById('pos-form-server-error');
  }

  function isDirty() {
    if (!_posFormDom.fieldAd) return false;
    return (
      _posFormDom.fieldAd.value.trim()    !== '' ||
      _posFormDom.fieldSehir.value.trim() !== '' ||
      _posFormDom.fieldSeg.value          !== '' ||
      _posFormDom.fieldExp.value          !== '' ||
      _posFormDom.fieldMaas.value.trim()  !== '' ||
      _posFormDom.fieldAcik.value.trim()  !== ''
    );
  }

  function resetPosForm() {
    if (!_posFormDom.form) return;
    _posFormDom.form.reset();
    clearPosFieldError(_posFormDom.fieldAd, _posFormDom.adError);
    hidePosServerError();
    updateCounter();
    /* submit buton reset */
    if (_posFormDom.btnSubmit) {
      _posFormDom.btnSubmit.disabled = false;
      _posFormDom.btnSubmit.classList.remove('is-loading');
    }
  }

  function openNewPositionSheet(opener) {
    if (!_posFormDom.sheet) return;
    _posFormOpener = opener || document.getElementById('btn-new-position');
    resetPosForm();
    _posFormDom.overlay.removeAttribute('aria-hidden');
    _posFormDom.overlay.classList.add('is-open');
    _posFormDom.sheet.classList.add('is-open');
    _posFormDom.sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ht-scroll-lock');
    /* autofocus + visualViewport guard */
    setTimeout(function () {
      if (_posFormDom.fieldAd) _posFormDom.fieldAd.focus();
    }, 50);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewportResize);
    }
  }
  /* Expose for pool coaching banner hash trigger */
  window._htOpenNewPositionSheet = openNewPositionSheet;

  function closeNewPositionSheet(force) {
    if (!_posFormDom.sheet) return;
    if (!force && isDirty()) {
      var ok = window.confirm('Değişiklikler kaydedilmedi. Çıkmak istediğinize emin misiniz?');
      if (!ok) return;
    }
    _posFormDom.overlay.setAttribute('aria-hidden', 'true');
    _posFormDom.overlay.classList.remove('is-open');
    _posFormDom.sheet.classList.remove('is-open');
    _posFormDom.sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ht-scroll-lock');
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', onViewportResize);
    }
    /* focus iade */
    if (_posFormOpener && typeof _posFormOpener.focus === 'function') {
      _posFormOpener.focus();
    }
  }

  function onViewportResize() {
    if (!_posFormDom.sheet) return;
    if (window.innerWidth <= 768) {
      _posFormDom.sheet.style.height = window.visualViewport.height + 'px';
    } else {
      _posFormDom.sheet.style.height = '';
    }
  }

  /* Focus trap */
  function trapFocus(e) {
    if (!_posFormDom.sheet || !_posFormDom.sheet.classList.contains('is-open')) return;
    var focusable = Array.prototype.slice.call(
      _posFormDom.sheet.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
  }

  /* Char counter */
  function updateCounter() {
    if (!_posFormDom.fieldAcik || !_posFormDom.counter) return;
    var len = _posFormDom.fieldAcik.value.length;
    _posFormDom.counter.textContent = len + ' / 800';
    _posFormDom.counter.classList.remove('is-warning', 'is-over');
    if (len > 800) _posFormDom.counter.classList.add('is-over');
    else if (len > 700) _posFormDom.counter.classList.add('is-warning');
  }

  /* Field error helpers */
  function showPosFieldError(input, errorEl, msg) {
    if (!input || !errorEl) return;
    input.classList.add('has-error');
    errorEl.textContent = msg;
    errorEl.classList.add('is-visible');
  }
  function clearPosFieldError(input, errorEl) {
    if (!input || !errorEl) return;
    input.classList.remove('has-error');
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
  }
  function showPosServerError(msg) {
    if (!_posFormDom.srvError) return;
    _posFormDom.srvError.textContent = msg;
    _posFormDom.srvError.classList.add('is-visible');
  }
  function hidePosServerError() {
    if (!_posFormDom.srvError) return;
    _posFormDom.srvError.textContent = '';
    _posFormDom.srvError.classList.remove('is-visible');
  }

  /* Client validation */
  function validatePosForm() {
    var valid = true;
    var ad = _posFormDom.fieldAd ? _posFormDom.fieldAd.value.trim() : '';
    clearPosFieldError(_posFormDom.fieldAd, _posFormDom.adError);
    if (!ad) {
      showPosFieldError(_posFormDom.fieldAd, _posFormDom.adError, 'Hata: Pozisyon adı gerekli.');
      valid = false;
    } else if (ad.length < 2) {
      showPosFieldError(_posFormDom.fieldAd, _posFormDom.adError, 'Hata: En az 2 karakter girin.');
      valid = false;
    }
    /* aciklama length */
    if (_posFormDom.fieldAcik && _posFormDom.fieldAcik.value.length > 800) {
      valid = false;
    }
    return valid;
  }

  /* Submit handler */
  function submitNewPosition(e) {
    e.preventDefault();
    hidePosServerError();

    if (!validatePosForm()) {
      if (_posFormDom.fieldAd) _posFormDom.fieldAd.focus();
      return;
    }

    /* Double-submit guard */
    if (_posFormDom.btnSubmit && _posFormDom.btnSubmit.disabled) return;
    if (_posFormDom.btnSubmit) {
      _posFormDom.btnSubmit.disabled = true;
      _posFormDom.btnSubmit.classList.add('is-loading');
    }

    var payload = {
      ad:       _posFormDom.fieldAd.value.trim(),
      sehir:    _posFormDom.fieldSehir ? _posFormDom.fieldSehir.value.trim() : '',
      seg:      _posFormDom.fieldSeg   ? _posFormDom.fieldSeg.value   : '',
      exp:      _posFormDom.fieldExp   ? _posFormDom.fieldExp.value   : '',
      maas:     _posFormDom.fieldMaas  ? _posFormDom.fieldMaas.value.trim()  : '',
      aciklama: _posFormDom.fieldAcik  ? _posFormDom.fieldAcik.value.trim()  : ''
    };

    IK_DATA.createPosition(payload).then(function (result) {
      if (!result.ok) {
        showPosServerError(result.error || 'Hata: Pozisyon kaydedilemedi. Tekrar deneyin.');
        if (_posFormDom.btnSubmit) {
          _posFormDom.btnSubmit.disabled = false;
          _posFormDom.btnSubmit.classList.remove('is-loading');
        }
        return;
      }
      /* Başarı — in-memory update */
      var newRow = result.row;
      /* positions tablosu field'ları → pipeline state'e normalize */
      var normalized = {
        id:         newRow.id,
        title:      newRow.ad,
        city:       newRow.sehir,
        segment:    newRow.seg,
        experience_years: newRow.exp,
        maas:       newRow.maas,
        aciklama:   newRow.aciklama,
        durum:      newRow.durum || 'active',  /* R3 fix: DB default 'active' */
        active_pipeline_count: 0
      };
      state.positions.push(normalized);
      state.activePositionId = newRow.id;
      state.activePosition   = normalized;
      if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
        IK_SHELL.setActivePositionId(newRow.id);
      }
      closeNewPositionSheet(true); /* force close — form kayıt başarılı */
      renderPositionSwitcher();
      loadPipeline();
      showToast((newRow.ad || 'Pozisyon') + ' pozisyonu açıldı.', 'success');
    }).catch(function (err) {
      console.error('[ik-pipeline] submitNewPosition exception:', err && err.message);
      showPosServerError('Hata: Bağlantı sorunu. Tekrar deneyin.');
      if (_posFormDom.btnSubmit) {
        _posFormDom.btnSubmit.disabled = false;
        _posFormDom.btnSubmit.classList.remove('is-loading');
      }
    });
  }

  function bindPositionFormSheet() {
    cachePosFormDom();
    if (!_posFormDom.sheet) return;

    /* "Yeni pozisyon" butonu */
    if (_posFormDom.btnNew) {
      _posFormDom.btnNew.addEventListener('click', function () {
        openNewPositionSheet(_posFormDom.btnNew);
      });
    }

    /* Kapat butonu */
    if (_posFormDom.btnClose) {
      _posFormDom.btnClose.addEventListener('click', function () {
        closeNewPositionSheet(false);
      });
    }

    /* Vazgeç butonu */
    if (_posFormDom.btnCancel) {
      _posFormDom.btnCancel.addEventListener('click', function () {
        closeNewPositionSheet(false);
      });
    }

    /* Overlay click */
    if (_posFormDom.overlay) {
      _posFormDom.overlay.addEventListener('click', function () {
        closeNewPositionSheet(false);
      });
    }

    /* ESC — sadece pos form sheet açıkken (stage sheet ile çakışmayı önle) */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _posFormDom.sheet && _posFormDom.sheet.classList.contains('is-open')) {
        e.stopPropagation();
        closeNewPositionSheet(false);
      }
    });

    /* Focus trap */
    if (_posFormDom.sheet) {
      _posFormDom.sheet.addEventListener('keydown', trapFocus);
    }

    /* ad — onBlur validation */
    if (_posFormDom.fieldAd) {
      _posFormDom.fieldAd.addEventListener('blur', function () {
        var v = _posFormDom.fieldAd.value.trim();
        if (v && v.length < 2) {
          showPosFieldError(_posFormDom.fieldAd, _posFormDom.adError, 'Hata: En az 2 karakter girin.');
        } else if (v) {
          clearPosFieldError(_posFormDom.fieldAd, _posFormDom.adError);
        }
      });
      _posFormDom.fieldAd.addEventListener('input', function () {
        if (_posFormDom.adError && _posFormDom.adError.classList.contains('is-visible')) {
          clearPosFieldError(_posFormDom.fieldAd, _posFormDom.adError);
        }
      });
    }

    /* aciklama — onChange debounce 400ms char counter */
    if (_posFormDom.fieldAcik) {
      var _counterDebounce = null;
      _posFormDom.fieldAcik.addEventListener('input', function () {
        clearTimeout(_counterDebounce);
        _counterDebounce = setTimeout(updateCounter, 400);
        /* disable submit if over limit */
        var over = _posFormDom.fieldAcik.value.length > 800;
        if (_posFormDom.btnSubmit) _posFormDom.btnSubmit.disabled = over;
      });
    }

    /* Form submit */
    if (_posFormDom.form) {
      _posFormDom.form.addEventListener('submit', submitNewPosition);
    }

    /* Hash trigger — pool coaching banner linki #new-position */
    if (window.location.hash === '#new-position') {
      setTimeout(function () { openNewPositionSheet(); }, 300);
      history.replaceState(null, '', window.location.pathname);
    }
  }

  /* renderBoard override: 0 pozisyon → empty state */
  var _origRenderBoard = renderBoard;
  renderBoard = function () {
    if (!dom.board) return;
    if (state.positions.length === 0) {
      renderZeroState();
    } else {
      _origRenderBoard();
    }
  };

  function renderZeroState() {
    if (!dom.board) return;
    clearChildren(dom.board);
    var wrap = document.createElement('div');
    wrap.className = 'ik-pipeline__zero-state';

    /* SVG illustration */
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ik-empty-illustration');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    /* Clipboard body */
    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '28'); rect.setAttribute('y', '30');
    rect.setAttribute('width', '64'); rect.setAttribute('height', '76');
    rect.setAttribute('rx', '5');
    svg.appendChild(rect);
    /* Clip top */
    var clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    clipPath.setAttribute('d', 'M44 30v-8a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v8');
    svg.appendChild(clipPath);
    /* Lines */
    [[40, 56, 80, 56], [40, 68, 80, 68], [40, 80, 64, 80]].forEach(function (l) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', l[0]); line.setAttribute('y1', l[1]);
      line.setAttribute('x2', l[2]); line.setAttribute('y2', l[3]);
      svg.appendChild(line);
    });
    wrap.appendChild(svg);

    var h = document.createElement('h2');
    h.className = 'ik-pipeline__zero-state-title';
    h.textContent = 'Henüz açık pozisyon yok.';
    wrap.appendChild(h);

    var p = document.createElement('p');
    p.className = 'ik-pipeline__zero-state-body';
    p.textContent = 'İlk pozisyonu açtığınızda pipeline\'a aday eklemeye başlayabilirsiniz.';
    wrap.appendChild(p);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ik-pipeline__zero-state-cta';
    btn.textContent = 'İlk pozisyonu aç';
    btn.addEventListener('click', function () {
      openNewPositionSheet(btn);
    });
    wrap.appendChild(btn);

    dom.board.appendChild(wrap);
  }

  /* ═══════ Init ═══════ */
  function init() {
    cacheDom();
    bindPositionSwitcher();
    bindStageSheet();
    bindPositionFormSheet();
    loadInit();
  }

  /* IK_SHELL.ctx race fix (eb8ad40 pattern, 2026-05-04 cache a23h2) */
  function bootstrap() {
    if (window.IK_SHELL && window.IK_SHELL.ctx) { init(); return; }
    var fired = false; var poll = null;
    function fireOnce() { if (fired) return; fired = true; if (poll) clearInterval(poll); init(); }
    document.addEventListener('ik-shell:ready', fireOnce, { once: true });
    var tries = 0;
    poll = setInterval(function () {
      if (window.IK_SHELL && window.IK_SHELL.ctx) fireOnce();
      else if (++tries > 30) fireOnce();
    }, 100);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
