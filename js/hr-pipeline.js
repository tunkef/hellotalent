/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Pipeline (Sprint 1 / FAZ B)

   Sorumluluklar:
   1. Position switcher (HRShell sessionStorage state)
   2. 5-stage kanban render (Yeni · Görüştüm · Mülakat · Teklif · Kapandı)
   3. HTML5 native drag-drop (desktop)
   4. Mobile fallback: "Aşamayı değiştir" bottom-sheet modal
   5. Card context menu (Mesaj / Not / Pipeline'dan çıkar)
   6. Aday detay drawer (sag panel)
   7. Demo persist (localStorage overlay HRData uzerinden)

   SOLID:
   - SRP: bu dosya sadece pipeline panel.
   - DIP: HRData adapter interface'i kullaniliyor (real/demo soyut).
   - OCP: yeni stage eklemek STAGES dizisine yeni satir, render kodu degismez.

   XSS: tum dinamik metin DOM API (textContent / createElement) ile basilir.
   innerHTML kullanilmaz. SVG ikonlari sadece statik string'lerden gelir.
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── Constants ────────────────────────────────── */
  // Stage spec — 5 column, demo data 4 raw stage'e map'lenir
  var STAGES = [
    { key: 'yeni',     title: 'Yeni',     dot: 'yeni',     raws: ['basvuru'] },
    { key: 'gorustum', title: 'Görüştüm', dot: 'gorustum', raws: ['on_eleme'] },
    { key: 'mulakat',  title: 'Mülakat',  dot: 'mulakat',  raws: ['mulakat'] },
    { key: 'teklif',   title: 'Teklif',   dot: 'teklif',   raws: ['teklif'] },
    { key: 'kapandi',  title: 'Kapandı',  dot: 'kapandi',  raws: ['kapandi_kazandi', 'kapandi_kaybettik', 'kapandi'] }
  ];
  var MOBILE_BREAKPOINT = 900;

  /* ── State ────────────────────────────────────── */
  var _state = {
    positions: [],
    activePositionId: null,
    pipelineRows: [],
    candidatesById: {},
    isMobile: false,
    draggingId: null,
    activeMenuEl: null,
    drawerOpen: false,
    stageModalOpen: false
  };

  /* ── Utilities ────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function svgIcon(svgString) {
    // Static, hardcoded SVG'leri parse edip DOM node'a cevirir.
    // Caller'in svgString'i KESINLIKLE kullanici girdisinden gelmemeli.
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
  function rawToStageKey(rawStage) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].raws.indexOf(rawStage) !== -1) return STAGES[i].key;
    }
    return 'yeni';
  }
  function stageKeyToRaw(stageKey) {
    var s = STAGES.find(function (x) { return x.key === stageKey; });
    return s ? s.raws[0] : 'basvuru';
  }
  function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }
  function computeMatchScore(candidate, position) {
    if (!candidate || !position) return null;
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
  function segmentLabel(s) {
    if (s === 'luks') return 'Lüks';
    if (s === 'premium') return 'Premium';
    if (s === 'high-street') return 'High-street';
    return s || '—';
  }
  function clearChildren(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  /* ── Static SVG strings (hardcoded, XSS-safe) ─── */
  var ICON_MENU_DOTS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18" r="1"/></svg>';

  /* ── Toast ────────────────────────────────────── */
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

  /* ── Position switcher ────────────────────────── */
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
    renderBoard();
  }

  /* ── Meta bar ─────────────────────────────────── */
  function updateMetaBar() {
    var p = _state.positions.find(function (x) { return String(x.id) === String(_state.activePositionId); });
    var posEl = $('[data-hr-pl-position]');
    var totalEl = $('[data-hr-pl-total]');
    var activeEl = $('[data-hr-pl-active]');
    if (posEl) posEl.textContent = p ? p.title : 'Tüm pozisyonlar';

    var rows = filterRowsForActive();
    if (totalEl) totalEl.textContent = String(rows.length);
    var activeStages = 0;
    var seen = {};
    for (var i = 0; i < rows.length; i++) {
      var k = rawToStageKey(rows[i].stage);
      if (k !== 'kapandi' && !seen[k]) { seen[k] = 1; activeStages++; }
    }
    if (activeEl) activeEl.textContent = String(activeStages);
  }
  function filterRowsForActive() {
    if (!_state.activePositionId) return _state.pipelineRows.slice();
    return _state.pipelineRows.filter(function (r) {
      return String(r.position_id) === String(_state.activePositionId);
    });
  }

  /* ── Board render ─────────────────────────────── */
  function renderBoard() {
    var board = $('[data-hr-board]');
    var emptyEl = $('[data-hr-board-empty]');
    var loading = $('[data-hr-board-loading]');
    if (!board) return;

    if (loading) loading.style.display = 'none';

    var rows = filterRowsForActive();

    if (!rows.length) {
      clearChildren(board);
      board.style.display = 'none';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    board.style.display = '';

    var grouped = {};
    STAGES.forEach(function (s) { grouped[s.key] = []; });
    rows.forEach(function (r) {
      var k = rawToStageKey(r.stage);
      grouped[k].push(r);
    });

    clearChildren(board);
    var activePos = _state.positions.find(function (x) { return String(x.id) === String(_state.activePositionId); });

    STAGES.forEach(function (s) {
      var col = el('div', 'hr-stage');
      col.setAttribute('data-stage', s.key);

      var head = el('div', 'hr-stage__head');
      var title = el('div', 'hr-stage__title');
      title.appendChild(el('span', 'hr-stage__dot hr-stage__dot--' + s.dot));
      title.appendChild(document.createTextNode(s.title));
      var count = el('span', 'hr-stage__count', String(grouped[s.key].length));
      head.appendChild(title);
      head.appendChild(count);

      var body = el('div', 'hr-stage__body');
      body.setAttribute('data-stage-body', s.key);

      if (!grouped[s.key].length) {
        body.appendChild(el('div', 'hr-stage__empty', 'Bu aşamada aday yok'));
      } else {
        grouped[s.key].forEach(function (row) {
          body.appendChild(buildCard(row, activePos));
        });
      }

      col.appendChild(head);
      col.appendChild(body);
      board.appendChild(col);
    });

    if (!_state.isMobile) {
      bindColumnDrop();
    }
  }

  function buildCard(row, position) {
    var c = _state.candidatesById[row.candidate_id] || {
      full_name: 'Bilinmeyen Aday', pozisyon: '—', sehir: ''
    };
    var card = el('div', 'hr-card-pl');
    card.setAttribute('data-pl-id', row.id);
    card.setAttribute('data-cand-id', row.candidate_id);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', c.full_name + ', ' + (c.pozisyon || '—') + ', detayı aç');

    if (!_state.isMobile) card.setAttribute('draggable', 'true');

    var top = el('div', 'hr-card-pl__top');
    top.appendChild(el('div', 'hr-card-pl__avatar', initials(c.full_name)));

    var nameWrap = el('div', 'hr-card-pl__name-wrap');
    nameWrap.appendChild(el('div', 'hr-card-pl__name', c.full_name));
    nameWrap.appendChild(el('div', 'hr-card-pl__role', c.pozisyon || '—'));
    top.appendChild(nameWrap);

    var menuBtn = el('button', 'hr-card-pl__menu-btn');
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label', 'Aday eylemleri');
    menuBtn.appendChild(svgIcon(ICON_MENU_DOTS));
    top.appendChild(menuBtn);

    var bottom = el('div', 'hr-card-pl__bottom');
    var match = computeMatchScore(c, position);
    var tier = matchTier(match);
    var matchTxt = match != null ? ('%' + match + ' eşleşme') : '— eşleşme';
    bottom.appendChild(el('span', 'hr-card-pl__match hr-card-pl__match--' + tier, matchTxt));
    var cityTxt = (c.sehir || '') + (c.ilce ? ' · ' + c.ilce : '');
    bottom.appendChild(el('span', 'hr-card-pl__city', cityTxt));

    card.appendChild(top);
    card.appendChild(bottom);

    bindCardEvents(card, row);
    return card;
  }

  /* ── Card events ──────────────────────────────── */
  function bindCardEvents(card, row) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.hr-card-pl__menu-btn') || e.target.closest('.hr-card-pl__menu')) return;
      openDrawer(row.candidate_id);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDrawer(row.candidate_id);
      }
    });

    var menuBtn = card.querySelector('.hr-card-pl__menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleCardMenu(card, row);
      });
    }

    if (!_state.isMobile) {
      card.addEventListener('dragstart', function (e) {
        _state.draggingId = row.id;
        card.classList.add('hr-card-pl--dragging');
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', row.id);
        } catch (err) {}
      });
      card.addEventListener('dragend', function () {
        _state.draggingId = null;
        card.classList.remove('hr-card-pl--dragging');
        $$('.hr-stage--drop-target').forEach(function (s) {
          s.classList.remove('hr-stage--drop-target');
        });
      });
    }
  }

  function toggleCardMenu(card, row) {
    closeAllCardMenus();
    var existing = card.querySelector('.hr-card-pl__menu');
    if (existing) { existing.remove(); return; }

    var menu = el('div', 'hr-card-pl__menu');
    menu.setAttribute('data-open', 'true');

    var actions = [
      { label: 'Mesaj gönder', action: 'message', danger: false },
      { label: 'Not ekle', action: 'note', danger: false }
    ];
    if (_state.isMobile) {
      actions.unshift({ label: 'Aşamayı değiştir', action: 'stage', danger: false });
    }
    actions.push({ label: 'Pipeline\'dan çıkar', action: 'remove', danger: true });

    actions.forEach(function (a) {
      var b = el('button',
        'hr-card-pl__menu-item' + (a.danger ? ' hr-card-pl__menu-item--danger' : ''),
        a.label);
      b.type = 'button';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        menu.remove();
        handleCardAction(a.action, row);
      });
      menu.appendChild(b);
    });

    card.appendChild(menu);
    _state.activeMenuEl = menu;

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
  function closeAllCardMenus() {
    $$('.hr-card-pl__menu').forEach(function (m) { m.remove(); });
  }

  function handleCardAction(action, row) {
    if (action === 'message') {
      window.location.href = 'hr-messages.html?candidate=' + encodeURIComponent(row.candidate_id);
      return;
    }
    if (action === 'note') {
      toast('Not ekleme Sprint 4\'te açılır');
      return;
    }
    if (action === 'remove') {
      removeFromPipeline(row);
      return;
    }
    if (action === 'stage') {
      openStageModal(row);
      return;
    }
  }

  async function removeFromPipeline(row) {
    var name = (_state.candidatesById[row.candidate_id] || {}).full_name || 'Aday';
    var ok = window.confirm(name + ' pipeline\'dan çıkarılsın mı?');
    if (!ok) return;
    _state.pipelineRows = _state.pipelineRows.filter(function (r) { return r.id !== row.id; });
    try { await window.HRData.moveStage(row.id, 'kapandi_kaybettik'); } catch (e) {}
    updateMetaBar();
    renderBoard();
    toast(name + ' kaldırıldı');
  }

  /* ── Stage modal (mobile fallback) ────────────── */
  function openStageModal(row) {
    var modal = $('[data-hr-stage-modal]');
    var nameEl = $('[data-hr-stage-modal-name]');
    var list = $('[data-hr-stage-modal-list]');
    if (!modal || !list) return;

    var c = _state.candidatesById[row.candidate_id] || {};
    if (nameEl) nameEl.textContent = c.full_name || 'Aday';

    clearChildren(list);
    var currentKey = rawToStageKey(row.stage);

    STAGES.forEach(function (s) {
      var btn = el('button', 'hr-stage-modal__option');
      btn.type = 'button';
      if (s.key === currentKey) btn.setAttribute('aria-current', 'true');

      var left = el('span', 'hr-stage-modal__option-left');
      left.appendChild(el('span', 'hr-stage__dot hr-stage__dot--' + s.dot));
      left.appendChild(document.createTextNode(s.title));
      btn.appendChild(left);

      if (s.key === currentKey) {
        var current = el('span', '', 'mevcut');
        current.style.fontSize = '11px';
        current.style.fontFamily = 'var(--font-mono)';
        current.style.color = 'var(--muted)';
        current.style.textTransform = 'uppercase';
        current.style.letterSpacing = '.08em';
        btn.appendChild(current);
      }

      btn.addEventListener('click', function () {
        if (s.key === currentKey) { closeStageModal(); return; }
        closeStageModal();
        moveCardToStage(row.id, s.key);
      });
      list.appendChild(btn);
    });

    modal.setAttribute('aria-hidden', 'false');
    _state.stageModalOpen = true;
    document.body.style.overflow = 'hidden';
  }
  function closeStageModal() {
    var modal = $('[data-hr-stage-modal]');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    _state.stageModalOpen = false;
    document.body.style.overflow = '';
  }
  function bindStageModal() {
    var modal = $('[data-hr-stage-modal]');
    if (!modal) return;
    var bd = $('[data-hr-stage-modal-backdrop]');
    var cl = $('[data-hr-stage-modal-close]');
    if (bd) bd.addEventListener('click', closeStageModal);
    if (cl) cl.addEventListener('click', closeStageModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _state.stageModalOpen) closeStageModal();
    });
  }

  /* ── Drag-drop column binding ─────────────────── */
  function bindColumnDrop() {
    $$('.hr-stage').forEach(function (col) {
      col.addEventListener('dragover', function (e) {
        if (!_state.draggingId) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
        col.classList.add('hr-stage--drop-target');
      });
      col.addEventListener('dragleave', function (e) {
        if (e.relatedTarget && col.contains(e.relatedTarget)) return;
        col.classList.remove('hr-stage--drop-target');
      });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        col.classList.remove('hr-stage--drop-target');
        var dropId = _state.draggingId;
        if (!dropId) return;
        var stageKey = col.getAttribute('data-stage');
        if (!stageKey) return;
        moveCardToStage(dropId, stageKey);
      });
    });
  }

  async function moveCardToStage(pipelineId, stageKey) {
    var row = _state.pipelineRows.find(function (r) { return String(r.id) === String(pipelineId); });
    if (!row) return;
    var prevKey = rawToStageKey(row.stage);
    if (prevKey === stageKey) return;

    var rawStage = stageKeyToRaw(stageKey);
    row.stage = rawStage;
    row.updated_at = new Date().toISOString();
    updateMetaBar();
    renderBoard();

    try {
      var res = await window.HRData.moveStage(pipelineId, rawStage);
      if (res && res.error) {
        toast('Aşama güncellenemedi', true);
        row.stage = stageKeyToRaw(prevKey);
        renderBoard();
        return;
      }
      var stageObj = STAGES.find(function (s) { return s.key === stageKey; });
      var c = _state.candidatesById[row.candidate_id] || {};
      toast((c.full_name || 'Aday') + ' → ' + (stageObj ? stageObj.title : stageKey));
    } catch (e) {
      toast('Aşama güncellenemedi', true);
      row.stage = stageKeyToRaw(prevKey);
      renderBoard();
    }
  }

  /* ── Drawer (aday detay) ──────────────────────── */
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
    var primary = el('a', 'hr-btn-primary', 'Tüm aday detayı');
    primary.href = 'hr-candidate.html?id=' + encodeURIComponent(c.id);
    cta.appendChild(primary);
    var ghost = el('a', 'hr-btn-ghost', 'Mesaj gönder');
    ghost.href = 'hr-messages.html?candidate=' + encodeURIComponent(c.id);
    cta.appendChild(ghost);
    body.appendChild(cta);
  }
  function drawerField(label, value) {
    var w = el('div');
    w.appendChild(el('div', 'hr-drawer__field-label', label));
    w.appendChild(el('div', 'hr-drawer__field-value', value));
    return w;
  }

  /* ── Action: yeni pozisyon ────────────────────── */
  function bindNewPositionCta() {
    var btn = $('[data-hr-new-position]');
    if (btn) {
      btn.addEventListener('click', function () {
        toast('Pozisyon oluşturma sihirbazı yakında');
      });
    }
    var addBtn = $('[data-hr-add-candidate]');
    if (addBtn) {
      addBtn.addEventListener('click', function (e) {
        if (_state.activePositionId) {
          e.preventDefault();
          window.location.href = 'hr-pool.html?from=pipeline&position=' + encodeURIComponent(_state.activePositionId);
        }
      });
    }
  }

  /* ── Resize handler ───────────────────────────── */
  function bindResize() {
    var prevMobile = _state.isMobile;
    window.addEventListener('resize', debounce(function () {
      var nowMobile = isMobileViewport();
      if (nowMobile !== prevMobile) {
        prevMobile = nowMobile;
        _state.isMobile = nowMobile;
        renderBoard();
      }
    }, 150));
  }
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /* ── Data load ────────────────────────────────── */
  async function loadAll() {
    var tasks = [
      window.HRData.getPositions(),
      window.HRData.getPipeline(null),
      window.HRData.searchCandidates({ pageSize: 200 })
    ];
    var results = await Promise.all(tasks);
    var posRes = results[0];
    var plRes = results[1];
    var candRes = results[2];

    _state.positions = (posRes && posRes.data) ? posRes.data : [];
    _state.pipelineRows = (plRes && plRes.data) ? plRes.data : [];

    var candList = (candRes && candRes.data && candRes.data.rows) ? candRes.data.rows : [];
    var byId = {};
    candList.forEach(function (c) { byId[c.id] = c; });
    _state.candidatesById = byId;

    var existing = window.HRShell && window.HRShell.getActivePosition && window.HRShell.getActivePosition();
    if (existing && _state.positions.find(function (p) { return String(p.id) === String(existing.id); })) {
      _state.activePositionId = existing.id;
    } else if (_state.positions.length) {
      _state.activePositionId = _state.positions[0].id;
      if (window.HRShell && window.HRShell.setActivePosition) {
        window.HRShell.setActivePosition(_state.positions[0]);
      }
    } else {
      _state.activePositionId = null;
    }
  }

  /* ── Init ─────────────────────────────────────── */
  async function init() {
    if (!window.HRShell || !window.HRData) {
      console.warn('[hr-pipeline] HRShell veya HRData hazır değil');
      return;
    }
    _state.isMobile = isMobileViewport();

    bindPositionSwitcher();
    bindDrawer();
    bindStageModal();
    bindNewPositionCta();
    bindResize();

    window.addEventListener('hr:position-changed', function (e) {
      var p = e && e.detail;
      _state.activePositionId = p ? p.id : null;
      renderPositionMenu();
      updateMetaBar();
      renderBoard();
    });

    await window.HRShell.ready();

    try {
      await loadAll();
    } catch (e) {
      console.error('[hr-pipeline] data load error', e);
      var loading = $('[data-hr-board-loading]');
      if (loading) {
        clearChildren(loading);
        var p = el('p', '', 'Pipeline verisi yüklenemedi.');
        p.style.color = 'var(--verm)';
        loading.appendChild(p);
      }
      return;
    }

    renderPositionMenu();
    updateMetaBar();
    renderBoard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (window.HR_PIPELINE_TEST === true) {
    window._HRPipeline = {
      state: _state,
      STAGES: STAGES,
      rawToStageKey: rawToStageKey,
      stageKeyToRaw: stageKeyToRaw,
      moveCardToStage: moveCardToStage,
      computeMatchScore: computeMatchScore
    };
  }
})();
