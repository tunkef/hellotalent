/* global IK_SHELL, IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Pipeline — PR-4 (3-sütun kanban)
   uzun_liste / kisa_liste / iletisime_gecildi.
   HTML5 drag-drop + skip-stage validation.
   Mobile: segment tabs + bottom-sheet stage mover.
   XSS-safe (textContent only).
   SOLID:
     - SRP: render / drag-drop / sheet ayri fonksiyonlar.
     - OCP: STAGES config-driven, yeni stage eklemek tek satir.
     - DIP: data sadece IK_DATA uzerinden.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* PR-4: 3-stage tanimlari (5-stage → 3-stage, stage_v2 field okunur) */
  var STAGES = [
    { key: 'uzun_liste',        label: 'Uzun Liste',        short: 'Uzun' },
    { key: 'kisa_liste',        label: 'Kısa Liste',        short: 'Kısa' },
    { key: 'iletisime_gecildi', label: 'İletişime Geçildi', short: 'Kontak' }
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
    /* PR-7: switcher kaldırıldı — posBtn/posTitle/posMenu artık DOM'da yok (graceful null) */
    dom.posBtn            = $('[data-ik-position-btn]');
    dom.posTitle          = $('[data-ik-position-title]');
    dom.posMenu           = $('[data-ik-position-menu]');
    dom.summary           = $('[data-ik-pipeline-summary]');
    /* 7 May refactor: detail sheet kaldırıldı, kanban board placeholder.
       Board ID null → kanban render no-op (tüm kullanım site'lerde guard var). */
    dom.board             = document.getElementById('ik-pos-detail-board');
    dom.loading           = $('[data-ik-pipeline-loading]');
    dom.sheetOverlay      = $('[data-ik-stage-sheet-overlay]');
    dom.sheet             = $('[data-ik-stage-sheet]');
    dom.sheetTitle        = $('[data-ik-stage-sheet-title]');
    dom.sheetSub          = $('[data-ik-stage-sheet-sub]');
    dom.sheetList         = $('[data-ik-stage-sheet-list]');
    dom.toast             = $('[data-ik-pipeline-toast]');
    /* PR-4: yeni DOM ref'leri */
    dom.refreshBanner     = document.getElementById('ik-pipeline-refresh-banner');
    dom.refreshBannerText = document.getElementById('ik-pipeline-refresh-banner-text');
    dom.refreshBtn        = document.getElementById('btn-pipeline-refresh');
    dom.refreshDismiss    = document.getElementById('btn-pipeline-refresh-dismiss');
    dom.staleChip         = document.getElementById('ik-pipeline-stale-chip');
    dom.mobileTabs        = document.getElementById('ik-pipeline-mobile-tabs');
  }

  /* ═══════ PR-4: PostHog helper ═══════ */
  function trackPipeline(eventName, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(eventName, props || {}); } catch (e) {}
  }

  /* ═══════ PR-4: Active mobile stage ═══════ */
  var _activeMobileStage = STAGES[0].key;

  function setActiveMobileStage(key) {
    _activeMobileStage = key;
    /* sütunları göster/gizle */
    $$('.ik-stage', dom.board).forEach(function (col) {
      var stageKey = col.getAttribute('data-stage-key') || col.getAttribute('data-stage');
      if (stageKey === key) {
        col.classList.add('is-active-mobile');
      } else {
        col.classList.remove('is-active-mobile');
      }
    });
    /* tab aktif */
    if (dom.mobileTabs) {
      $$('.ik-pipeline__mobile-tab', dom.mobileTabs).forEach(function (btn) {
        var isActive = btn.getAttribute('data-mobile-stage') === key;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }
  }

  function renderMobileTabs() {
    if (!dom.mobileTabs) return;
    clearChildren(dom.mobileTabs);
    STAGES.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ik-pipeline__mobile-tab' + (s.key === _activeMobileStage ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', s.key === _activeMobileStage ? 'true' : 'false');
      btn.setAttribute('data-mobile-stage', s.key);
      /* count badge */
      var cnt = state.pipelineEntries.filter(function (e) { return e.stage === s.key || e.stage_v2 === s.key; }).length;
      btn.textContent = s.label + (cnt ? ' · ' + cnt : '');
      btn.addEventListener('click', function () {
        setActiveMobileStage(s.key);
        trackPipeline('pipeline_card_stage_move_sheet', { from_stage: _activeMobileStage, to_stage: s.key });
      });
      dom.mobileTabs.appendChild(btn);
    });
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

  /* ═══════ Position switcher ═══════
     5 May Tuna bug fix: backend field adları (ad/sehir/exp), title/city/experience_years DEĞİL */
  function renderPositionSwitcher() {
    if (dom.posTitle && state.activePosition) {
      dom.posTitle.textContent = state.activePosition.ad || state.activePosition.title || 'Pozisyon';
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
      t.textContent = p.ad || p.title || '—';
      btn.appendChild(t);

      var meta = document.createElement('span');
      meta.className = 'ik-position-switcher__item-meta';
      var metaParts = [];
      if (p.sehir) metaParts.push(p.sehir);
      if (p.exp)   metaParts.push(p.exp);
      if (p.seg)   metaParts.push(p.seg);
      meta.textContent = metaParts.length ? metaParts.join(' · ') : '—';
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
      /* 5 May Tuna bug fix: data-position-id string, p.id number → loose compare */
      var pidStr = item.getAttribute('data-position-id');
      var pos = state.positions.find(function (p) { return String(p.id) === pidStr; });
      if (!pos) {
        dom.posMenu.classList.remove('is-open');
        dom.posBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      if (String(pos.id) === String(state.activePositionId)) {
        dom.posMenu.classList.remove('is-open');
        dom.posBtn.setAttribute('aria-expanded', 'false');
        return;
      }
      state.activePositionId = pos.id;
      state.activePosition = pos;
      if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
        IK_SHELL.setActivePositionId(pos.id);
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

  /* ═══════ PR-4: stage key resolver (stage_v2 → stage fallback) ═══════ */
  function resolveStage(entry) {
    /* PR-1 dual-write: stage_v2 mevcut ise onu kullan, yoksa legacy stage */
    return entry.stage_v2 || entry.stage || STAGES[0].key;
  }

  /* ═══════ Summary chips ═══════ */
  function renderSummary() {
    if (!dom.summary) return;
    clearChildren(dom.summary);

    var counts = {};
    STAGES.forEach(function (s) { counts[s.key] = 0; });
    state.pipelineEntries.forEach(function (e) {
      var sk = resolveStage(e);
      if (counts[sk] != null) counts[sk]++;
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

    /* PR-5 Sub-Task 5.3: auto badge — entry.metadata.auto_added (DB jsonb kolon).
       PR-4'te entry.auto_added flat field bekliyordu — DB'de yoktu.
       Şimdi hr_get_pipeline metadata jsonb döndürüyor; auto_added boolean içinde.
       Manuel eklenen kartlarda metadata={} → badge GÖRÜNMEZ. */
    var currentStage = resolveStage(entry);
    var isAutoAdded = !!(entry.metadata && entry.metadata.auto_added === true);
    if (isAutoAdded) {
      var autoBadge = document.createElement('span');
      autoBadge.className = 'ik-card-aday__auto-badge';
      autoBadge.textContent = 'Otomatik';
      autoBadge.setAttribute('aria-label', 'Otomatik eşleşme ile eklendi');
      head.appendChild(autoBadge);
    }

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

    /* PR-4: stage-aware card menu labels */
    var stageActions = [];
    if (currentStage === 'uzun_liste') {
      stageActions.push({ action: 'move_kisa',        label: 'Kısa Listeye Al' });
    } else if (currentStage === 'kisa_liste') {
      stageActions.push({ action: 'move_iletisim',    label: 'İletişime Geçildi Olarak İşaretle' });
      stageActions.push({ action: 'move_uzun',        label: 'Uzun Listeye Geri Al' });
    } else if (currentStage === 'iletisime_gecildi') {
      stageActions.push({ action: 'move_kisa',        label: 'Kısa Listeye Geri Al' });
    }
    var actions = [
      { action: 'detail',  label: 'Detayı aç' },
      { action: 'message', label: 'Mesaj yaz' }
    ].concat(stageActions).concat([
      { action: 'remove',  label: 'Listeden Çıkar', danger: true }
    ]);
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

  /* ═══════ PR-7 CLATU: Stage empty state metinleri (minimal) ═══════ */
  var STAGE_EMPTY = {
    uzun_liste:        'Henüz aday yok.',
    kisa_liste:        'Henüz aday yok.',
    iletisime_gecildi: 'Henüz aday yok.'
  };

  /* ═══════ Stage column render ═══════ */
  function renderStageColumn(stageDef) {
    var col = document.createElement('section');
    col.className = 'ik-stage';
    col.setAttribute('data-stage-key', stageDef.key);
    /* PR-4: data-stage attribute da set et (CSS selector için) */
    col.setAttribute('data-stage', stageDef.key);

    var header = document.createElement('header');
    header.className = 'ik-stage__header';
    var title = document.createElement('div');
    title.className = 'ik-stage__title';
    title.textContent = stageDef.label;
    header.appendChild(title);

    /* PR-4: stage_v2 ile filtrele */
    var entries = state.pipelineEntries.filter(function (e) {
      return resolveStage(e) === stageDef.key;
    });

    var countEl = document.createElement('div');
    countEl.className = 'ik-stage__count';
    /* PR-4: format: "N" — 99+ clamp */
    var cntDisplay = entries.length > 99 ? '99+' : String(entries.length);
    countEl.textContent = cntDisplay;
    countEl.setAttribute('aria-label', entries.length + ' aday');
    header.appendChild(countEl);

    col.appendChild(header);

    var body = document.createElement('div');
    body.className = 'ik-stage__body';
    body.setAttribute('data-stage-body', stageDef.key);

    if (entries.length === 0) {
      /* PR-7 CLATU: minimal empty state — arrow icon yok, text-only + ghost link */
      var empty = document.createElement('div');
      empty.className = 'ik-pipeline-empty';
      var et = document.createElement('p');
      et.className = 'ik-pipeline-empty__title';
      et.textContent = STAGE_EMPTY[stageDef.key] || 'Henüz aday yok.';
      empty.appendChild(et);
      if (stageDef.key === 'uzun_liste') {
        var cta = document.createElement('a');
        cta.className = 'ik-pipeline-empty__cta';
        cta.href = 'hr-pool.html';
        cta.textContent = 'Havuza git';
        empty.appendChild(cta);
      }
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
    /* PR-4: mobile tabs */
    renderMobileTabs();
    /* PR-4: mobile'da ilk sütunu göster */
    if (isMobileDevice()) {
      setActiveMobileStage(_activeMobileStage);
    }
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
        /* PR-4: PostHog drag_start */
        trackPipeline('pipeline_card_drag_start', {
          position_id: state.activePositionId,
          candidate_id: cid,
          from_stage: stage
        });
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
        var fromStage = state.dragging.fromStage;
        var cid = state.dragging.candidate_id;

        /* PR-4: skip-stage kısıtlaması — uzun_liste → iletisime_gecildi DROP YASAK */
        if (fromStage === 'uzun_liste' && newStage === 'iletisime_gecildi') {
          showToast('Önce kısa listeye al.', 'error');
          trackPipeline('pipeline_skip_stage_blocked', {
            position_id: state.activePositionId,
            from_stage: fromStage,
            to_stage: newStage
          });
          state.dragging = null;
          return;
        }
        /* PR-4: iletisime_gecildi → uzun_liste da yasak (spec: geriye skip yok) */
        if (fromStage === 'iletisime_gecildi' && newStage === 'uzun_liste') {
          showToast('Önce kısa listeye al.', 'error');
          state.dragging = null;
          return;
        }

        if (fromStage === newStage) {
          state.dragging = null;
          return;
        }

        /* PR-4: PostHog drag_drop event */
        trackPipeline('pipeline_card_drag_drop', {
          position_id: state.activePositionId,
          candidate_id: cid,
          from_stage: fromStage,
          to_stage: newStage,
          success: true
        });

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
      /* PR-4: stage-aware toast mesajı (copy spec §3D) */
      var c = state.candidatesById[candidate_id];
      var adSoyad = (c && c.full_name) ? c.full_name : 'Aday';
      var toastMsg;
      if (newStage === 'kisa_liste') {
        toastMsg = adSoyad + ' kısa listeye alındı.';
      } else if (newStage === 'iletisime_gecildi') {
        toastMsg = adSoyad + ' için kontak başlatıldı olarak işaretlendi.';
      } else if (newStage === 'uzun_liste') {
        toastMsg = adSoyad + ' uzun listeye geri alındı.';
      } else {
        var label = (STAGES.find(function (s) { return s.key === newStage; }) || {}).label || newStage;
        toastMsg = adSoyad + ' ' + label + ' aşamasına taşındı.';
      }
      showToast(toastMsg, 'success');
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
    /* PR-4: stage move actions */
    if (action === 'move_kisa') {
      moveCandidateToStage(candidate_id, 'kisa_liste');
    } else if (action === 'move_uzun') {
      moveCandidateToStage(candidate_id, 'uzun_liste');
    } else if (action === 'move_iletisim') {
      moveCandidateToStage(candidate_id, 'iletisime_gecildi');
    } else if (action === 'stage') {
      openStageSheet(candidate_id);
    } else if (action === 'remove') {
      IK_DATA.removeFromPipeline(candidate_id, state.activePositionId).then(function () {
        showToast('Listeden çıkarıldı', 'success');
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
      var currentStageKey = resolveStage(entry);
      STAGES.forEach(function (s) {
        /* PR-4: skip-stage kısıtlaması — uzun_liste'den iletisime_gecildi'ye gizle */
        if (currentStageKey === 'uzun_liste' && s.key === 'iletisime_gecildi') return;
        /* PR-4: iletisime_gecildi'den uzun_liste'ye de gizle */
        if (currentStageKey === 'iletisime_gecildi' && s.key === 'uzun_liste') return;

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ik-stage-sheet__option';
        if (s.key === currentStageKey) btn.classList.add('is-current');
        btn.setAttribute('data-sheet-stage', s.key);
        var lbl = document.createElement('span');
        lbl.textContent = s.label;
        btn.appendChild(lbl);
        if (s.key === currentStageKey) {
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
        /* PR-4: PostHog mobile stage move */
        trackPipeline('pipeline_card_stage_move_sheet', {
          position_id: state.activePositionId,
          from_stage: state.sheetCurrentStage,
          to_stage: newStage
        });
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

      /* Active position — 5 May Tuna bug fix:
         localStorage string döner, DB id number (bigint) → strict compare fail.
         Plus eski orphan id localStorage'da kalmış olabilir → validate ve fallback. */
      var rawPosId = (window.IK_SHELL && IK_SHELL.getActivePositionId)
        ? IK_SHELL.getActivePositionId() : null;
      var foundPos = rawPosId
        ? state.positions.find(function (p) { return String(p.id) === String(rawPosId); })
        : null;
      if (!foundPos && state.positions.length) {
        foundPos = state.positions[0];
      }
      state.activePositionId = foundPos ? foundPos.id : null;
      state.activePosition = foundPos || null;
      if (state.activePositionId && window.IK_SHELL && IK_SHELL.setActivePositionId) {
        IK_SHELL.setActivePositionId(state.activePositionId);
      }

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
    _posFormDom.fieldAd       = document.getElementById('pos-field-ad');
    _posFormDom.fieldSehir    = document.getElementById('pos-field-sehir');
    _posFormDom.fieldSeg      = document.getElementById('pos-field-seg');
    _posFormDom.fieldExp      = document.getElementById('pos-field-exp');
    _posFormDom.fieldAcik     = document.getElementById('pos-field-aciklama');
    _posFormDom.counter       = document.getElementById('pos-field-aciklama-counter');
    _posFormDom.adError       = document.getElementById('pos-field-ad-error');
    _posFormDom.srvError      = document.getElementById('pos-form-server-error');
    /* PR-2: yeni alanlar */
    _posFormDom.collapseBtn   = document.getElementById('btn-pos-collapse');
    _posFormDom.collapseBody  = document.getElementById('pos-form-collapse-body');
    _posFormDom.fieldMusaitlik  = document.getElementById('pos-field-musaitlik');
    _posFormDom.fieldEgitim     = document.getElementById('pos-field-egitim');
    _posFormDom.chipGridCalisma = document.querySelector('[data-chip-field="calisma_tipi"]');
    _posFormDom.chipGridDiller  = document.querySelector('[data-chip-field="diller"]');
    _posFormDom.chipGridSeg     = document.querySelector('[data-chip-field="tercih_segmentler"]');
  }

  function isDirty() {
    if (!_posFormDom.fieldAd) return false;
    /* PR-2: maas kaldırıldı, chip seçimi + yeni select'ler eklendi */
    var chipsDirty = (
      (_posFormDom.chipGridCalisma && _posFormDom.chipGridCalisma.querySelector('[aria-pressed="true"]') !== null) ||
      (_posFormDom.chipGridDiller  && _posFormDom.chipGridDiller.querySelector('[aria-pressed="true"]')  !== null) ||
      (_posFormDom.chipGridSeg     && _posFormDom.chipGridSeg.querySelector('[aria-pressed="true"]')     !== null)
    );
    return (
      _posFormDom.fieldAd.value.trim()         !== '' ||
      (_posFormDom.fieldSehir && _posFormDom.fieldSehir.value.trim() !== '') ||
      (_posFormDom.fieldSeg   && _posFormDom.fieldSeg.value          !== '') ||
      (_posFormDom.fieldExp   && _posFormDom.fieldExp.value          !== '') ||
      (_posFormDom.fieldMusaitlik && _posFormDom.fieldMusaitlik.value !== '') ||
      (_posFormDom.fieldEgitim    && _posFormDom.fieldEgitim.value    !== '') ||
      (_posFormDom.fieldAcik && _posFormDom.fieldAcik.value.trim()   !== '') ||
      chipsDirty
    );
  }

  function resetPosForm() {
    if (!_posFormDom.form) return;
    _posFormDom.form.reset();
    clearPosFieldError(_posFormDom.fieldAd, _posFormDom.adError);
    hidePosServerError();
    updateCounter();
    /* PR-2: chip reset */
    var allChips = _posFormDom.form.querySelectorAll('.ik-position-form__chip[aria-pressed="true"]');
    for (var i = 0; i < allChips.length; i++) {
      allChips[i].setAttribute('aria-pressed', 'false');
    }
    /* PR-2: collapse reset → kapalı */
    posCollapseClose(true);
    /* submit buton reset */
    if (_posFormDom.btnSubmit) {
      _posFormDom.btnSubmit.disabled = false;
      _posFormDom.btnSubmit.classList.remove('is-loading');
    }
  }

  /* PR-2: collapse helpers */
  function posCollapseOpen() {
    if (!_posFormDom.collapseBody || !_posFormDom.collapseBtn) return;
    _posFormDom.collapseBody.removeAttribute('hidden');
    _posFormDom.collapseBtn.setAttribute('aria-expanded', 'true');
    var lbl = _posFormDom.collapseBtn.querySelector('.ik-position-form__collapse-label');
    if (lbl) lbl.textContent = 'Ek kriterleri gizle';
    if (window.posthog) {
      try { window.posthog.capture('pos_form_collapse_open'); } catch (e) {}
    }
  }

  function posCollapseClose(silent) {
    if (!_posFormDom.collapseBody || !_posFormDom.collapseBtn) return;
    _posFormDom.collapseBody.setAttribute('hidden', '');
    _posFormDom.collapseBtn.setAttribute('aria-expanded', 'false');
    var lbl = _posFormDom.collapseBtn.querySelector('.ik-position-form__collapse-label');
    if (lbl) lbl.textContent = 'Daha iyi eşleşme için ek kriter ekle';
    if (!silent && window.posthog) {
      try { window.posthog.capture('pos_form_collapse_close'); } catch (e) {}
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
    /* PR-2: PostHog event */
    if (window.posthog) {
      try { window.posthog.capture('pos_form_open'); } catch (e) {}
    }
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

  /* ═══════ PR-7: Edit form sheet mode ═══════
     Mevcut pozisyon verilerini form sheet'e preload eder.
     data-editing-id attribute ile create vs edit ayrımı yapılır. */

  /* MATCH_AFFECTING_FIELDS — kriter değişim tespiti (UX spec §3) */
  var MATCH_AFFECTING_FIELDS = [
    'sehir', 'seg', 'exp',
    'calisma_tipi', 'musaitlik_pozisyon',
    'egitim_seviye', 'diller', 'tercih_segmentler'
  ];

  /* Snapshot — form açılışta mevcut değerleri kaydet */
  var _editSnapshot = null;

  function snapshotFormValues() {
    _editSnapshot = {
      sehir:              _posFormDom.fieldSehir    ? _posFormDom.fieldSehir.value.trim()    : '',
      seg:                _posFormDom.fieldSeg      ? _posFormDom.fieldSeg.value             : '',
      exp:                _posFormDom.fieldExp      ? _posFormDom.fieldExp.value             : '',
      musaitlik_pozisyon: _posFormDom.fieldMusaitlik ? _posFormDom.fieldMusaitlik.value       : '',
      egitim_seviye:      _posFormDom.fieldEgitim   ? _posFormDom.fieldEgitim.value          : '',
      calisma_tipi:       getChipValues(_posFormDom.chipGridCalisma).join(','),
      diller:             getChipValues(_posFormDom.chipGridDiller).join(','),
      tercih_segmentler:  getChipValues(_posFormDom.chipGridSeg).join(',')
    };
  }

  function hasMatchAffectingChange() {
    if (!_editSnapshot) return false;
    var current = {
      sehir:              _posFormDom.fieldSehir    ? _posFormDom.fieldSehir.value.trim()    : '',
      seg:                _posFormDom.fieldSeg      ? _posFormDom.fieldSeg.value             : '',
      exp:                _posFormDom.fieldExp      ? _posFormDom.fieldExp.value             : '',
      musaitlik_pozisyon: _posFormDom.fieldMusaitlik ? _posFormDom.fieldMusaitlik.value       : '',
      egitim_seviye:      _posFormDom.fieldEgitim   ? _posFormDom.fieldEgitim.value          : '',
      calisma_tipi:       getChipValues(_posFormDom.chipGridCalisma).join(','),
      diller:             getChipValues(_posFormDom.chipGridDiller).join(','),
      tercih_segmentler:  getChipValues(_posFormDom.chipGridSeg).join(',')
    };
    for (var i = 0; i < MATCH_AFFECTING_FIELDS.length; i++) {
      var f = MATCH_AFFECTING_FIELDS[i];
      if (current[f] !== _editSnapshot[f]) return true;
    }
    return false;
  }

  function preloadFormForEdit(pos) {
    if (!pos) return;
    /* Text / select alanlar */
    if (_posFormDom.fieldAd    && pos.ad)    _posFormDom.fieldAd.value    = pos.ad;
    if (_posFormDom.fieldSehir && pos.sehir) _posFormDom.fieldSehir.value = pos.sehir;
    if (_posFormDom.fieldSeg   && pos.seg)   _posFormDom.fieldSeg.value   = pos.seg;
    if (_posFormDom.fieldExp   && pos.exp)   _posFormDom.fieldExp.value   = pos.exp;
    if (_posFormDom.fieldMusaitlik && pos.musaitlik_pozisyon) {
      _posFormDom.fieldMusaitlik.value = pos.musaitlik_pozisyon;
    }
    if (_posFormDom.fieldEgitim && pos.egitim_seviye) {
      _posFormDom.fieldEgitim.value = pos.egitim_seviye;
    }
    if (_posFormDom.fieldAcik && pos.aciklama) {
      _posFormDom.fieldAcik.value = pos.aciklama;
      updateCounter();
    }

    /* Chip grids — her chip'te aria-pressed set et */
    function setChips(grid, arr) {
      if (!grid || !Array.isArray(arr)) return;
      var chips = grid.querySelectorAll('.ik-position-form__chip');
      for (var i = 0; i < chips.length; i++) {
        var v = chips[i].getAttribute('data-value');
        chips[i].setAttribute('aria-pressed', arr.indexOf(v) >= 0 ? 'true' : 'false');
      }
    }
    setChips(_posFormDom.chipGridCalisma, pos.calisma_tipi || []);
    setChips(_posFormDom.chipGridDiller,  pos.diller       || []);
    setChips(_posFormDom.chipGridSeg,     pos.tercih_segmentler || []);

    /* Dolu kriter varsa collapse aç */
    var hasExtra = (pos.calisma_tipi && pos.calisma_tipi.length) ||
                   (pos.diller && pos.diller.length) ||
                   (pos.tercih_segmentler && pos.tercih_segmentler.length) ||
                   pos.musaitlik_pozisyon || pos.egitim_seviye;
    if (hasExtra) posCollapseOpen();
  }

  function openFormSheetEditMode(positionId) {
    if (!_posFormDom.sheet) cachePosFormDom();
    if (!_posFormDom.sheet) return;

    var pos = null;
    if (window.IK_DATA && IK_DATA._getPositionSync) {
      pos = IK_DATA._getPositionSync(positionId);
    }
    /* Fallback: _htPosList'ten bak */
    if (!pos && window._htPosList) {
      var active = window._htPosList.getActivePositions();
      pos = active && active.find(function (p) { return String(p.id) === String(positionId); }) || null;
    }

    resetPosForm();

    /* Edit mode flags */
    _posFormDom.sheet.setAttribute('data-editing-id', String(positionId));

    /* Header copy */
    var eyebrow = document.getElementById('pos-sheet-eyebrow');
    var title   = document.getElementById('pos-sheet-title');
    var label   = document.getElementById('pos-form-submit-label');
    if (eyebrow) eyebrow.textContent = 'Pozisyonu Düzenle';
    if (title)   title.textContent   = (pos && pos.ad) ? pos.ad : 'Pozisyon';
    if (label)   label.textContent   = 'Değişiklikleri Kaydet';

    /* Preload form values */
    if (pos) preloadFormForEdit(pos);

    /* Preload notice (sadece ilk kez) */
    var noticeKey = 'ht_pos_edit_notice_' + positionId;
    var notice = document.getElementById('pos-form-preload-notice');
    if (notice) {
      var shown = false;
      try { shown = localStorage.getItem(noticeKey) === '1'; } catch (e) {}
      if (!shown) {
        notice.classList.add('is-visible');
        try { localStorage.setItem(noticeKey, '1'); } catch (e) {}
      }
    }

    /* Snapshot for change detection */
    snapshotFormValues();

    /* Bind change-hint on match-affecting fields */
    var changeHint = document.getElementById('pos-form-change-hint');
    var matchFields = [
      _posFormDom.fieldSehir, _posFormDom.fieldSeg, _posFormDom.fieldExp,
      _posFormDom.fieldMusaitlik, _posFormDom.fieldEgitim
    ];
    matchFields.forEach(function (f) {
      if (!f) return;
      f.addEventListener('change', function () {
        if (changeHint) {
          if (hasMatchAffectingChange()) changeHint.classList.add('is-visible');
          else changeHint.classList.remove('is-visible');
        }
      });
    });
    /* Chip grids için de dinle */
    var chipGrids = [_posFormDom.chipGridCalisma, _posFormDom.chipGridDiller, _posFormDom.chipGridSeg];
    chipGrids.forEach(function (grid) {
      if (!grid) return;
      grid.addEventListener('click', function () {
        setTimeout(function () {
          if (changeHint) {
            if (hasMatchAffectingChange()) changeHint.classList.add('is-visible');
            else changeHint.classList.remove('is-visible');
          }
        }, 50);
      });
    });

    /* Open sheet */
    _posFormOpener = document.activeElement;
    _posFormDom.overlay.removeAttribute('aria-hidden');
    _posFormDom.overlay.classList.add('is-open');
    _posFormDom.sheet.classList.add('is-open');
    _posFormDom.sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ht-scroll-lock');

    if (window.posthog) {
      try { window.posthog.capture('pos_form_edit_open', { position_id: positionId }); } catch (e) {}
    }
    setTimeout(function () {
      if (_posFormDom.fieldAd) _posFormDom.fieldAd.focus();
    }, 50);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewportResize);
    }
  }
  window._htOpenPositionEditSheet = openFormSheetEditMode;

  function closeNewPositionSheet(force) {
    if (!_posFormDom.sheet) return;
    if (!force && isDirty()) {
      var ok = window.confirm('Değişiklikler kaybolacak. Devam edilsin mi?');
      if (!ok) return;
      /* PR-2: abandon event — kullanıcı kirli formdan çıkmayı onayladı */
      if (window.posthog) {
        try { window.posthog.capture('pos_form_abandon'); } catch (e) {}
      }
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
    /* A24-CTR-01 fix (uat-tester 2026-05-04): iki seviye uyarı.
       maxlength=800 → 800+ pratik imkansız, is-over defensive. */
    if (len >= 800) _posFormDom.counter.classList.add('is-over');
    else if (len >= 700) _posFormDom.counter.classList.add('is-warning');
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

  /* PR-2: chip değerlerini array olarak topla */
  function getChipValues(grid) {
    if (!grid) return [];
    var pressed = grid.querySelectorAll('.ik-position-form__chip[aria-pressed="true"]');
    var vals = [];
    for (var i = 0; i < pressed.length; i++) {
      vals.push(pressed[i].getAttribute('data-value'));
    }
    return vals;
  }

  /* Client validation */
  function validatePosForm() {
    var valid = true;
    var ad = _posFormDom.fieldAd ? _posFormDom.fieldAd.value.trim() : '';
    clearPosFieldError(_posFormDom.fieldAd, _posFormDom.adError);
    if (!ad) {
      showPosFieldError(_posFormDom.fieldAd, _posFormDom.adError, 'Hata: Pozisyon adı boş bırakılamaz.');
      if (window.posthog) {
        try { window.posthog.capture('pos_form_validation_error', { error_type: 'ad_bos' }); } catch (e) {}
      }
      valid = false;
    } else if (ad.length < 2) {
      showPosFieldError(_posFormDom.fieldAd, _posFormDom.adError, 'Hata: En az 2 karakter girin.');
      valid = false;
    }
    /* aciklama length */
    if (_posFormDom.fieldAcik && _posFormDom.fieldAcik.value.length > 800) {
      if (window.posthog) {
        try { window.posthog.capture('pos_form_validation_error', { error_type: 'aciklama_limit' }); } catch (e) {}
      }
      valid = false;
    }
    /* PR-2: en az 1 kriter zorunlu (ad kriter sayılmaz) */
    if (valid) {
      var sehirDolu    = _posFormDom.fieldSehir    && _posFormDom.fieldSehir.value.trim()    !== '';
      var segDolu      = _posFormDom.fieldSeg      && _posFormDom.fieldSeg.value             !== '';
      var expDolu      = _posFormDom.fieldExp      && _posFormDom.fieldExp.value             !== '';
      var musaitDolu   = _posFormDom.fieldMusaitlik && _posFormDom.fieldMusaitlik.value       !== '';
      var egitimDolu   = _posFormDom.fieldEgitim   && _posFormDom.fieldEgitim.value          !== '';
      var calismaDolu  = getChipValues(_posFormDom.chipGridCalisma).length  > 0;
      var dillerDolu   = getChipValues(_posFormDom.chipGridDiller).length   > 0;
      var segTercipDolu = getChipValues(_posFormDom.chipGridSeg).length     > 0;
      var kriterDolu = sehirDolu || segDolu || expDolu || musaitDolu || egitimDolu || calismaDolu || dillerDolu || segTercipDolu;
      if (!kriterDolu) {
        showPosServerError('Hata: Eşleşme için en az bir kriter doldur: şehir, segment, deneyim veya aday tercihleri.');
        posCollapseOpen();
        if (window.posthog) {
          try { window.posthog.capture('pos_form_validation_error', { error_type: 'kriter_yok' }); } catch (e) {}
        }
        valid = false;
      }
    }
    return valid;
  }

  /* Submit handler — PR-7: create vs edit mode */
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
    var submitLabel = document.getElementById('pos-form-submit-label');
    if (submitLabel) submitLabel.textContent = 'Kaydediliyor...';

    var calismaTipiVals = getChipValues(_posFormDom.chipGridCalisma);
    var dillerVals      = getChipValues(_posFormDom.chipGridDiller);
    var tercihSegVals   = getChipValues(_posFormDom.chipGridSeg);
    var payload = {
      ad:                 _posFormDom.fieldAd.value.trim(),
      sehir:              _posFormDom.fieldSehir    ? _posFormDom.fieldSehir.value.trim()    : '',
      seg:                _posFormDom.fieldSeg      ? _posFormDom.fieldSeg.value             : '',
      exp:                _posFormDom.fieldExp      ? _posFormDom.fieldExp.value             : '',
      calisma_tipi:       calismaTipiVals.length    ? calismaTipiVals   : null,
      musaitlik_pozisyon: _posFormDom.fieldMusaitlik ? (_posFormDom.fieldMusaitlik.value || null) : null,
      egitim_seviye:      _posFormDom.fieldEgitim   ? (_posFormDom.fieldEgitim.value    || null) : null,
      diller:             dillerVals.length          ? dillerVals        : null,
      tercih_segmentler:  tercihSegVals.length       ? tercihSegVals     : null,
      aciklama:           _posFormDom.fieldAcik      ? _posFormDom.fieldAcik.value.trim()    : ''
    };

    /* PR-7: edit vs create branch */
    var editingId = _posFormDom.sheet ? _posFormDom.sheet.getAttribute('data-editing-id') : '';

    function resetSubmitBtn(labelText) {
      if (_posFormDom.btnSubmit) {
        _posFormDom.btnSubmit.disabled = false;
        _posFormDom.btnSubmit.classList.remove('is-loading');
      }
      if (submitLabel) submitLabel.textContent = labelText || 'Pozisyonu Oluştur';
    }

    if (editingId) {
      /* ── Edit mode ── */
      var criteriaChanged = hasMatchAffectingChange();
      payload._criteria_changed = criteriaChanged;

      IK_DATA.updatePosition(Number(editingId), payload).then(function (result) {
        if (!result.ok) {
          showPosServerError(result.error || 'Hata: Değişiklikler kaydedilemedi. Tekrar deneyin.');
          resetSubmitBtn('Değişiklikleri Kaydet');
          return;
        }
        if (window.posthog) {
          try { window.posthog.capture('position_edit_save', { position_id: Number(editingId), criteria_changed: criteriaChanged }); } catch (e2) {}
        }
        /* Cache sıfırla */
        if (window._htPosList) window._htPosList.refresh();

        closeNewPositionSheet(true);
        showToast('Değişiklikler kaydedildi.', 'success');

        /* Soft refresh prompt — kriter değiştiyse */
        if (criteriaChanged && window._htPipelineShowRefreshBanner) {
          var bannerText = document.getElementById('ik-pipeline-refresh-banner-text');
          if (bannerText) bannerText.textContent = 'Kriterler değişti — liste güncel değil.';
          window._htPipelineShowRefreshBanner(Number(editingId));
        }
      }).catch(function (err) {
        console.error('[ik-pipeline] updatePosition exception:', err && err.message);
        showPosServerError('Hata: Bağlantı sorunu. Tekrar deneyin.');
        resetSubmitBtn('Değişiklikleri Kaydet');
      });

    } else {
      /* ── Create mode (PR-2 orijinal akış) ── */
      IK_DATA.createPosition(payload).then(function (result) {
        if (!result.ok) {
          showPosServerError(result.error || 'Hata: Pozisyon kaydedilemedi. Tekrar deneyin.');
          resetSubmitBtn('Pozisyonu Oluştur');
          return;
        }
        var newRow = result.row;
        var normalized = {
          id:                 newRow.id,
          title:              newRow.ad,
          ad:                 newRow.ad,
          city:               newRow.sehir,
          sehir:              newRow.sehir,
          segment:            newRow.seg,
          seg:                newRow.seg,
          experience_years:   newRow.exp,
          exp:                newRow.exp,
          calisma_tipi:       newRow.calisma_tipi       || null,
          musaitlik_pozisyon: newRow.musaitlik_pozisyon  || null,
          egitim_seviye:      newRow.egitim_seviye       || null,
          diller:             newRow.diller              || null,
          tercih_segmentler:  newRow.tercih_segmentler   || null,
          aciklama:           newRow.aciklama,
          durum:              newRow.durum || 'active',
          created_at:         newRow.created_at,
          active_pipeline_count: 0
        };
        if (window.posthog) {
          try { window.posthog.capture('pos_form_submit_success'); } catch (e2) {}
        }
        state.positions.push(normalized);
        state.activePositionId = newRow.id;
        state.activePosition   = normalized;
        if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
          IK_SHELL.setActivePositionId(newRow.id);
        }
        closeNewPositionSheet(true);
        /* PR-7: kart grid'i yenile */
        if (window._htPosList) window._htPosList.refresh();
        loadPipeline();
        showToast((newRow.ad || 'Pozisyon') + ' pozisyonu açıldı.', 'success');
        _triggerAutoMatchAfterCreate(newRow.id, newRow.ad || 'Pozisyon');

      }).catch(function (err) {
        console.error('[ik-pipeline] submitNewPosition exception:', err && err.message);
        showPosServerError('Hata: Bağlantı sorunu. Tekrar deneyin.');
        resetSubmitBtn('Pozisyonu Oluştur');
      });
    }
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

    /* PR-2: collapse toggle */
    if (_posFormDom.collapseBtn) {
      _posFormDom.collapseBtn.addEventListener('click', function () {
        var isOpen = _posFormDom.collapseBtn.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          posCollapseClose(false);
        } else {
          posCollapseOpen();
        }
      });
    }

    /* PR-2: chip click handlers — event delegation per grid */
    var chipGrids = [_posFormDom.chipGridCalisma, _posFormDom.chipGridDiller, _posFormDom.chipGridSeg];
    for (var gi = 0; gi < chipGrids.length; gi++) {
      (function (grid) {
        if (!grid) return;
        grid.addEventListener('click', function (e) {
          var chip = e.target.closest('.ik-position-form__chip');
          if (!chip) return;
          var pressed = chip.getAttribute('aria-pressed') === 'true';
          chip.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        });
      })(chipGrids[gi]);
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

  /* ═══════ PR-4: Soft refresh banner bind ═══════ */
  function bindRefreshBanner() {
    if (!dom.refreshBtn || !dom.refreshDismiss) return;

    dom.refreshBtn.addEventListener('click', function () {
      if (!state.activePositionId) return;
      /* Banner kapat, RPC çağır */
      hideBanner();
      hideStaleChip();
      trackPipeline('pipeline_soft_refresh_accepted', { position_id: state.activePositionId });

      if (window._htMatchingEngine && window._htMatchingEngine.showSoftRefreshPrompt) {
        /* ik-matching-engine.js üzerinden RPC */
        return;
      }
      /* Fallback: doğrudan IK_DATA üzerinden (hr_refresh_position_pipeline RPC PR-1'de var) */
      if (IK_DATA.refreshPositionPipeline) {
        IK_DATA.refreshPositionPipeline(state.activePositionId).then(function (result) {
          var r = result || {};
          var added   = r.added   || 0;
          var removed = r.removed || 0;
          var msg;
          if (added > 0 && removed > 0) {
            msg = added + ' yeni eşleşme eklendi, ' + removed + ' aday çıkarıldı.';
          } else if (added > 0) {
            msg = added + ' yeni eşleşme eklendi.';
          } else if (removed > 0) {
            msg = removed + ' aday kriterlere uymadığı için çıkarıldı.';
          } else {
            msg = 'Liste güncellendi. Değişen aday yok.';
          }
          showToast(msg, 'success');
          loadPipeline();
        }).catch(function (err) {
          console.error('[ik-pipeline] refreshPositionPipeline error:', err && err.message);
          showToast('Bağlantı sorunu. Liste yenilemedi, tekrar dene.', 'error');
        });
      }
    });

    dom.refreshDismiss.addEventListener('click', function () {
      hideBanner();
      showStaleChip();
      trackPipeline('pipeline_soft_refresh_dismissed', {
        position_id: state.activePositionId,
        dismiss_count: getDismissCount(state.activePositionId)
      });
      incDismissCount(state.activePositionId);
    });

    if (dom.staleChip) {
      dom.staleChip.addEventListener('click', function () {
        hideStaleChip();
        showBanner();
      });
    }
  }

  function showBanner(msg) {
    if (!dom.refreshBanner) return;
    if (msg && dom.refreshBannerText) dom.refreshBannerText.textContent = msg;
    dom.refreshBanner.classList.add('is-visible');
    dom.refreshBanner.setAttribute('aria-hidden', 'false');
  }
  function hideBanner() {
    if (!dom.refreshBanner) return;
    dom.refreshBanner.classList.remove('is-visible');
    dom.refreshBanner.setAttribute('aria-hidden', 'true');
  }
  function showStaleChip() {
    if (dom.staleChip) {
      dom.staleChip.classList.add('is-visible');
      dom.staleChip.setAttribute('aria-hidden', 'false');
    }
  }
  function hideStaleChip() {
    if (dom.staleChip) {
      dom.staleChip.classList.remove('is-visible');
      dom.staleChip.setAttribute('aria-hidden', 'true');
    }
  }

  /* localStorage dismiss count helpers */
  function getDismissCount(positionId) {
    if (!positionId) return 0;
    try {
      return parseInt(localStorage.getItem('_ht_refresh_dismiss_' + positionId) || '0', 10);
    } catch (e) { return 0; }
  }
  function incDismissCount(positionId) {
    if (!positionId) return;
    try {
      var n = getDismissCount(positionId) + 1;
      localStorage.setItem('_ht_refresh_dismiss_' + positionId, String(n));
    } catch (e) {}
  }

  /* Expose banner show for ik-matching-engine.js */
  window._htPipelineShowRefreshBanner = showBanner;
  window._htPipelineHideBanner        = hideBanner;

  /* ═══════ PR-5 Sub-Task 5.1 — Auto-match trigger ═══════
     Pozisyon kayıt başarısından sonra non-blocking çağrılır.
     SRP: createPosition flow'undan ayrı — kendi try/catch + toast.
     Toast'a tıklanınca pozisyon detay sheet açılır (PR-4 pattern). */
  function _triggerAutoMatchAfterCreate(positionId, positionAd) {
    if (!positionId) return;
    if (!window.IK_DATA || !IK_DATA.addToPipelineAuto) return;

    /* Non-blocking: caller zaten toast gösterdi, bu ek toast */
    IK_DATA.addToPipelineAuto(positionId).then(function (result) {
      var r       = result || {};
      var added   = typeof r.added   === 'number' ? r.added   : 0;
      var skipped = typeof r.skipped === 'number' ? r.skipped : 0;
      var total   = typeof r.total_matched === 'number' ? r.total_matched : 0;
      var msg;

      if (added > 0) {
        msg = added + ' aday uzun listeye eklendi';
        if (total > added) msg += ' (' + total + ' eşleşme bulundu)';
      } else {
        msg = 'Eşleşen aday bulunamadı. Kriterleri genişletmeyi düşün.';
      }

      /* Toast — clickable → pozisyon detayı (PR-4 sheet pattern) */
      _showAutoMatchToast(msg, added > 0 ? 'success' : 'info', positionId);

      /* PostHog */
      trackPipeline('auto_match_triggered', {
        position_id:   positionId,
        added:         added,
        skipped:       skipped,
        total_matched: total
      });

      /* Pipeline'ı yenile: yeni adaylar kartlara yansısın */
      if (added > 0) {
        loadPipeline();
      }
    }).catch(function (err) {
      console.error('[ik-pipeline] auto-match trigger error:', err && err.message);
      showToast('Otomatik eşleştirme başarısız oldu. Pozisyon kaydedildi.', 'error');
    });
  }

  /* _showAutoMatchToast — auto-match sonuç toast'ı.
     Tıklanabilir: pozisyon detay sheet'i açar.
     kind: 'success' | 'info' | 'error' */
  function _showAutoMatchToast(msg, kind, positionId) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.remove(
      'ik-pipeline-toast--success',
      'ik-pipeline-toast--error',
      'ik-pipeline-toast--info',
      'ik-pipeline-toast--clickable'
    );
    if (kind === 'success') dom.toast.classList.add('ik-pipeline-toast--success');
    else if (kind === 'error') dom.toast.classList.add('ik-pipeline-toast--error');
    else dom.toast.classList.add('ik-pipeline-toast--info');

    /* Tıklanabilir: pozisyon detay sheet (positionId varsa) */
    if (positionId) {
      dom.toast.classList.add('ik-pipeline-toast--clickable');
      dom.toast.setAttribute('data-auto-toast-pos', String(positionId));
      dom.toast.setAttribute('role', 'button');
      dom.toast.setAttribute('tabindex', '0');
      dom.toast.setAttribute('aria-label', msg + ' — Detayı aç');
    } else {
      dom.toast.removeAttribute('data-auto-toast-pos');
      dom.toast.removeAttribute('role');
      dom.toast.removeAttribute('tabindex');
      dom.toast.removeAttribute('aria-label');
    }

    dom.toast.classList.add('is-visible');
    /* Auto-match toast daha uzun görünür (4 sn) */
    setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, 4000);
  }

  /* Toast click → pozisyon detay sheet (PR-4 pattern) */
  function _bindAutoMatchToastClick() {
    if (!dom.toast) return;
    dom.toast.addEventListener('click', function () {
      var posId = dom.toast.getAttribute('data-auto-toast-pos');
      if (!posId) return;
      /* PR-4 pozisyon detay sheet expose varsa kullan, yoksa position-switcher navigate */
      if (window._htPositionDetailOpen) {
        window._htPositionDetailOpen(posId);
      } else {
        /* Fallback: sadece pipeline yeniden yükle (position zaten active) */
        loadPipeline();
      }
    });
    dom.toast.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dom.toast.click();
      }
    });
  }

  /* ═══════ Init ═══════ */
  function init() {
    cacheDom();
    bindPositionSwitcher();
    bindStageSheet();
    bindPositionFormSheet();
    bindRefreshBanner();
    _bindAutoMatchToastClick(); /* PR-5: auto-match toast click → detay sheet */
    loadInit();
  }

  /* ═══════ 7 May refactor: accordion board attach API
     ik-position-detail.js her satır expand olduğunda accordion içindeki
     board container'ı bu modüle bağlar. dom.board re-target +
     state.activePositionId set + loadPipeline() trigger. ═══════ */
  window._htPipelineBoard = {
    attach: function (boardEl, positionId) {
      if (!boardEl || !positionId) return;
      dom.board = boardEl;
      state.activePositionId = positionId;
      if (window.IK_SHELL && IK_SHELL.setActivePositionId) {
        IK_SHELL.setActivePositionId(positionId);
      }
      return loadPipeline();
    },
    detach: function () {
      dom.board = null;
      state.activePositionId = null;
    }
  };

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
