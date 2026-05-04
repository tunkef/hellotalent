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

  /* ═══════ New position modal (2026-05-04 — pozisyon yaratma flow) ═══════ */
  function bindNewPositionModal() {
    var openBtn = document.querySelector('[data-ik-new-position]');
    var modal   = document.querySelector('[data-ik-pos-modal]');
    var form    = document.querySelector('[data-ik-pos-form]');
    var cancel  = document.querySelector('[data-ik-pos-cancel]');
    var errEl   = document.querySelector('[data-ik-pos-error]');
    var submit  = document.querySelector('[data-ik-pos-submit]');
    if (!openBtn || !modal || !form) return;

    function openModal() {
      modal.hidden = false;
      modal.style.display = 'flex';
      var firstInput = form.querySelector('input[name="ad"]');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 50);
    }
    function closeModal() {
      modal.hidden = true;
      modal.style.display = 'none';
      form.reset();
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      if (submit) { submit.disabled = false; submit.textContent = 'Oluştur'; }
    }

    openBtn.addEventListener('click', openModal);
    if (cancel) cancel.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      var fd = new FormData(form);
      var payload = {
        ad:       fd.get('ad'),
        sehir:    fd.get('sehir'),
        seg:      fd.get('seg'),
        exp:      fd.get('exp'),
        maas:     fd.get('maas'),
        aciklama: fd.get('aciklama')
      };
      if (submit) { submit.disabled = true; submit.textContent = 'Oluşturuluyor…'; }
      IK_DATA.createPosition(payload).then(function (res) {
        if (!res || res.ok === false) {
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = (res && res.error) || 'Pozisyon oluşturulamadı.';
          }
          if (submit) { submit.disabled = false; submit.textContent = 'Oluştur'; }
          return;
        }
        if (window.IK_SHELL && IK_SHELL.setActivePositionId && res.position) {
          IK_SHELL.setActivePositionId(res.position.id);
        }
        // Sayfayı yenile — yeni pozisyon switcher + pipeline'da görünür olsun
        location.reload();
      });
    });
  }

  /* ═══════ Init ═══════ */
  function init() {
    cacheDom();
    bindPositionSwitcher();
    bindStageSheet();
    bindNewPositionModal();
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
