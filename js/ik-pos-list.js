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
  function makeKebabSvg() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    [5, 12, 19].forEach(function (cy) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', '12');
      c.setAttribute('cy', String(cy));
      c.setAttribute('r', '2');
      svg.appendChild(c);
    });
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

  /* ═══════ Kart DOM — PR-7 rework #4: bento-grid (her pozisyon AYRI ik-card)
     Anasayfa ik-card pattern reuse (image #6).
     Click → detail sheet (PR-4). Edit/Kapat detail sheet header'da.
     ═══════ */
  function buildCard(pos, isArchive) {
    var card = document.createElement('article');
    card.className = 'ik-card ik-card--position-tile';
    card.setAttribute('data-pos-id', String(pos.id));
    card.setAttribute('data-status', isArchive ? 'archive' : 'active');
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');

    /* ── Head: title + chip ── */
    var head = document.createElement('div');
    head.className = 'ik-card__head';

    var titleEl = document.createElement('h3');
    titleEl.className = 'ik-card__title';
    titleEl.textContent = pos.ad || pos.title || '—';
    head.appendChild(titleEl);

    var chip = document.createElement('span');
    chip.className = 'ik-card__chip' + (isArchive ? '' : ' ik-card__chip--accent');
    chip.textContent = isArchive ? 'Arşiv' : 'Aktif';
    head.appendChild(chip);

    card.appendChild(head);

    /* ── Body: meta (sehir · seg · exp) ── */
    var metaParts = [];
    if (pos.sehir || pos.city) metaParts.push(pos.sehir || pos.city);
    if (pos.seg   || pos.segment) metaParts.push(pos.seg || pos.segment);
    if (pos.exp   || pos.experience_years) metaParts.push(pos.exp || pos.experience_years);
    if (metaParts.length) {
      var body = document.createElement('div');
      body.className = 'ik-card__body';
      var meta = document.createElement('span');
      meta.className = 'ik-list__meta';
      meta.textContent = metaParts.join(' · ');
      body.appendChild(meta);
      card.appendChild(body);
    }

    /* ── Footer: time ago (split, right-end) ── */
    var footer = document.createElement('div');
    footer.className = 'ik-card__footer ik-card__footer--split';

    var timeEl = document.createElement('span');
    timeEl.className = 'ik-list__time';
    var rawDate = isArchive
      ? (pos.updated_at || pos.closed_at)
      : pos.created_at;
    timeEl.textContent = isArchive
      ? formatKapatmaTarihi(rawDate)
      : (formatAcilmaTarihi(rawDate) || '—');
    footer.appendChild(timeEl);

    card.appendChild(footer);

    /* Click + keyboard → detail sheet (PR-4 reuse). Edit/Kapat detail header'da. */
    function openDetail() {
      if (window._htOpenPositionDetailSheet) {
        window._htOpenPositionDetailSheet(pos.id, 'card_click');
      }
      track('position_list_item_click', { id: pos.id, view: isArchive ? 'archive' : 'active' });
    }
    card.addEventListener('click', openDetail);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail();
      }
    });
    return card;
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

  /* ═══════ Count update — PR-7: count-chip--value → count-value ═══════ */
  function updateCountChips(posId, summary) {
    var row = document.querySelector('[data-counts-pos="' + posId + '"]');
    if (!row) return;
    var mapping = { uzun: summary.uzun, kisa: summary.kisa, iletisim: summary.iletisim };
    Object.keys(mapping).forEach(function (k) {
      var el = row.querySelector('.ik-pos-card__count-value[data-count-key="' + k + '"]');
      if (el) el.textContent = fmtCount(mapping[k]);
    });
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

    list.forEach(function (pos) {
      _dom.grid.appendChild(buildCard(pos, isArchive));
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

  /* ═══════ Dropdown management ═══════ */
  function closeAllDropdowns() {
    if (!_dom.grid) return;
    var openDDs = _dom.grid.querySelectorAll('.ik-pos-card__dropdown.is-open');
    for (var i = 0; i < openDDs.length; i++) {
      openDDs[i].classList.remove('is-open');
      var wrap = openDDs[i].closest('.ik-pos-card__menu-wrap');
      if (wrap) {
        var mb = wrap.querySelector('.ik-pos-card__menu-btn');
        if (mb) mb.setAttribute('aria-expanded', 'false');
      }
    }
  }

  function bindDropdowns() {
    if (!_dom.grid) return;

    _dom.grid.addEventListener('click', function (e) {
      var menuBtn = e.target.closest('.ik-pos-card__menu-btn');
      if (menuBtn) {
        e.stopPropagation();
        var wrap = menuBtn.closest('.ik-pos-card__menu-wrap');
        var dd = wrap && wrap.querySelector('.ik-pos-card__dropdown');
        var isOpen = dd && dd.classList.contains('is-open');
        closeAllDropdowns();
        if (dd && !isOpen) {
          dd.classList.add('is-open');
          menuBtn.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        closeAllDropdowns();
        var action = actionBtn.getAttribute('data-action');
        var posId  = actionBtn.getAttribute('data-pos-id');
        if (posId) handleAction(action, posId);
        return;
      }
    });

    document.addEventListener('click', function () { closeAllDropdowns(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDropdowns();
    });
  }

  /* ═══════ Action dispatch ═══════ */
  function handleAction(action, posIdStr) {
    var posId = isNaN(posIdStr) ? posIdStr : Number(posIdStr);

    if (action === 'view') {
      if (window._htOpenPositionDetailSheet) {
        window._htOpenPositionDetailSheet(posId, 'card_action_menu');
      }
      return;
    }

    if (action === 'edit') {
      if (window._htOpenPositionEditSheet) {
        window._htOpenPositionEditSheet(posId);
      }
      track('position_edit_open', { position_id: posId, source: 'card_action_menu' });
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
    bindDropdowns();

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
