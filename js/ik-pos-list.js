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

  /* ═══════ DOM cache ═══════ */
  function cacheDom() {
    _dom.grid    = document.getElementById('ik-pos-grid');
    _dom.subline = document.getElementById('ik-pos-subline'); /* PR-7: ik-pos-count → ik-pos-subline */
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

  /* ═══════ Kart DOM inşaatı ═══════ */
  function buildCard(pos, isArchive) {
    var card = document.createElement('div');
    card.className = 'ik-pos-card' + (isArchive ? ' ik-pos-card--archive' : '');
    card.setAttribute('data-pos-id', pos.id);
    card.setAttribute('data-status', isArchive ? 'archive' : 'active');
    card.setAttribute('role', 'listitem');

    /* ── Header ── */
    var header = document.createElement('div');
    header.className = 'ik-pos-card__header';

    /* PR-7 CLATU — status eyebrow (badge container kaldırıldı) */
    var titleBlock = document.createElement('div');
    titleBlock.className = 'ik-pos-card__title-block';

    var statusKey = isArchive ? 'archive' : 'active';
    var eyebrow = document.createElement('span');
    eyebrow.className = 'ik-pos-card__status-eyebrow ik-pos-card__status-eyebrow--' + statusKey;
    eyebrow.textContent = isArchive ? 'ARŞİV' : 'AKTİF';
    titleBlock.appendChild(eyebrow);

    var nameEl = document.createElement('div');
    nameEl.className = 'ik-pos-card__name';
    nameEl.textContent = pos.ad || pos.title || '—';
    titleBlock.appendChild(nameEl);

    var metaParts = [];
    if (pos.sehir || pos.city) metaParts.push(pos.sehir || pos.city);
    if (pos.seg   || pos.segment) metaParts.push(pos.seg || pos.segment);
    if (pos.exp   || pos.experience_years) metaParts.push(pos.exp || pos.experience_years);
    if (metaParts.length) {
      var meta = document.createElement('div');
      meta.className = 'ik-pos-card__meta';
      meta.textContent = metaParts.join(' · ');
      titleBlock.appendChild(meta);
    }
    header.appendChild(titleBlock);

    /* Kebab menu wrap */
    var menuWrap = document.createElement('div');
    menuWrap.className = 'ik-pos-card__menu-wrap';

    var menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'ik-pos-card__menu-btn';
    menuBtn.setAttribute('aria-label', 'Pozisyon seçenekleri');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-haspopup', 'menu');
    menuBtn.appendChild(makeKebabSvg());

    var dropdown = document.createElement('div');
    dropdown.className = 'ik-pos-card__dropdown';
    dropdown.setAttribute('role', 'menu');

    var menuItems = isArchive
      ? [{ label: 'Görüntüle', action: 'view', danger: false }, { label: 'Yeniden Aç', action: 'reopen', danger: false }]
      : [{ label: 'Görüntüle', action: 'view', danger: false }, { label: 'Düzenle', action: 'edit', danger: false }, { label: 'Kapat', action: 'close', danger: true }];

    menuItems.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ik-pos-card__dropdown-item' + (item.danger ? ' ik-pos-card__dropdown-item--danger' : '');
      btn.setAttribute('role', 'menuitem');
      btn.setAttribute('data-action', item.action);
      btn.setAttribute('data-pos-id', String(pos.id));
      btn.textContent = item.label;
      dropdown.appendChild(btn);
    });

    menuWrap.appendChild(menuBtn);
    menuWrap.appendChild(dropdown);
    header.appendChild(menuWrap);
    card.appendChild(header);

    /* ── Kriter chip preview ── */
    var allChips = buildChipList(pos);
    if (allChips.length) {
      var chipsRow = document.createElement('div');
      chipsRow.className = 'ik-pos-card__chips';
      var maxShow = 4;
      var overflow = allChips.length - maxShow;
      allChips.slice(0, maxShow).forEach(function (c) {
        var chip = document.createElement('span');
        chip.className = 'ik-pos-card__chip';
        chip.textContent = c;
        chipsRow.appendChild(chip);
      });
      if (overflow > 0) {
        var overChip = document.createElement('span');
        overChip.className = 'ik-pos-card__chip ik-pos-card__chip--overflow';
        overChip.textContent = '+' + overflow + ' daha';
        chipsRow.appendChild(overChip);
      }
      card.appendChild(chipsRow);
    }

    /* ── Aday count — PR-7 CLATU: vertical label/value stack ── */
    var countsRow = document.createElement('div');
    countsRow.className = 'ik-pos-card__counts';
    countsRow.setAttribute('data-counts-pos', String(pos.id));
    var countDefs = [
      { key: 'uzun',     label: 'UZUN' },
      { key: 'kisa',     label: 'KISA' },
      { key: 'iletisim', label: 'İLETİŞİM' }
    ];
    countDefs.forEach(function (def) {
      var item = document.createElement('div');
      item.className = 'ik-pos-card__count-item';

      var lbl = document.createElement('span');
      lbl.className = 'ik-pos-card__count-label';
      lbl.textContent = def.label;

      var val = document.createElement('span');
      val.className = 'ik-pos-card__count-value';
      val.setAttribute('data-count-key', def.key);
      val.textContent = '0';

      item.appendChild(lbl);
      item.appendChild(val);
      countsRow.appendChild(item);
    });
    card.appendChild(countsRow);

    /* ── Footer ── */
    var footer = document.createElement('div');
    footer.className = 'ik-pos-card__footer';

    var dateEl = document.createElement('span');
    dateEl.className = 'ik-pos-card__date';
    dateEl.textContent = isArchive
      ? formatKapatmaTarihi(pos.updated_at || pos.closed_at)
      : (formatAcilmaTarihi(pos.created_at) || 'Aktif');
    footer.appendChild(dateEl);

    var viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'ik-pos-card__view-btn';
    viewBtn.setAttribute('data-action', 'view');
    viewBtn.setAttribute('data-pos-id', String(pos.id));
    viewBtn.textContent = 'Görüntüle';
    footer.appendChild(viewBtn);

    card.appendChild(footer);
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

  /* ═══════ Render grid ═══════ */
  function renderGrid() {
    if (!_dom.grid) return;
    while (_dom.grid.firstChild) _dom.grid.removeChild(_dom.grid.firstChild);

    var isArchive = _state.view === 'archive';
    var list = isArchive ? _state.archivedPositions : _state.positions;

    /* PR-7 CLATU — subline format "N aktif · M arşiv" */
    if (_dom.subline) {
      var aktifSayi  = _state.positions.length;
      var arsivSayi  = _state.archivedPositions.length;
      _dom.subline.textContent = aktifSayi + ' aktif · ' + arsivSayi + ' arşiv';
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
