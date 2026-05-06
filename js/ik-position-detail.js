/* global IK_SHELL, IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Position Detail Sheet — PR-4
   Pozisyon detay sheet lifecycle: open / close / history.pushState.
   #ik-pos-detail-sheet — A24 form sheet'ten AYRI (z=901 vs z=810).
   XSS-safe (textContent only).
   SOLID:
     - SRP: sadece detay sheet lifecycle yönetir.
     - OCP: board render ik-pipeline.js'ten delegate edilir.
     - DIP: data IK_DATA üzerinden.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _state = {
    positionId: null,
    isOpen: false
  };

  var _dom = {};

  function cacheDom() {
    _dom.overlay    = document.getElementById('ik-pos-detail-overlay');
    _dom.sheet      = document.getElementById('ik-pos-detail-sheet');
    _dom.title      = document.querySelector('[data-pos-detail-title]');
    _dom.eyebrow    = document.querySelector('[data-pos-detail-eyebrow]');
    _dom.chips      = document.querySelector('[data-pos-detail-chips]');
    _dom.board      = document.getElementById('ik-pos-detail-board');
    _dom.stageTabs  = document.getElementById('ik-pos-detail-stage-tabs');
    _dom.btnClose   = document.getElementById('btn-pos-detail-close');
    _dom.btnKriter  = document.getElementById('btn-pos-detail-kriter');
    _dom.btnKapat   = document.getElementById('btn-pos-detail-kapat');
  }

  /* ── PostHog helper ── */
  function track(eventName, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(eventName, props || {}); } catch (e) {}
  }

  /* ── Chip builder (XSS-safe) ── */
  function makeMetaChip(text) {
    var chip = document.createElement('span');
    chip.className = 'ik-pos-detail-sheet__meta-chip';
    chip.textContent = text;
    return chip;
  }

  /* ── Clear children helper ── */
  function clearChildren(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  /* ── Render sheet header with position data ── */
  function renderSheetHeader(position) {
    if (!position) return;

    if (_dom.title) {
      _dom.title.textContent = position.ad || position.title || '—';
    }
    if (_dom.eyebrow) {
      _dom.eyebrow.textContent = 'Pozisyon detayı';
    }
    if (_dom.chips) {
      clearChildren(_dom.chips);
      /* Şehir chip */
      var sehir = position.sehir || position.city;
      if (sehir) _dom.chips.appendChild(makeMetaChip(sehir));
      /* Segment chip */
      var seg = position.seg || position.segment;
      if (seg) _dom.chips.appendChild(makeMetaChip(seg));
      /* Deneyim chip */
      var exp = position.exp || position.experience_years;
      if (exp) _dom.chips.appendChild(makeMetaChip(exp));
    }
  }

  /* ── Open ── */
  function openPositionDetailSheet(positionId, source) {
    if (!_dom.sheet) return;
    _state.positionId = positionId;
    _state.isOpen     = true;

    /* history.pushState — back button kapatır */
    try {
      history.pushState(
        { posDetailSheet: positionId },
        '',
        window.location.pathname + '?pos=' + encodeURIComponent(positionId)
      );
    } catch (e) {
      console.warn('[ik-position-detail] pushState error:', e && e.message);
    }

    /* Header populate */
    var position = null;
    if (window.IK_DATA && IK_DATA._getPositionSync) {
      position = IK_DATA._getPositionSync(positionId);
    }
    renderSheetHeader(position);

    /* Show overlay + sheet */
    if (_dom.overlay) {
      _dom.overlay.classList.add('is-open');
      _dom.overlay.setAttribute('aria-hidden', 'false');
    }
    _dom.sheet.classList.add('is-open');
    _dom.sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ht-scroll-lock');

    /* Focus management — close button */
    setTimeout(function () {
      if (_dom.btnClose) _dom.btnClose.focus();
    }, 50);

    /* PostHog */
    track('pipeline_board_open', {
      position_id: positionId,
      source: source || 'switcher_click'
    });
  }

  /* ── Close ── */
  function closePositionDetailSheet(force) {
    if (!_dom.sheet) return;
    _state.isOpen = false;

    /* URL temizle */
    try {
      history.replaceState(null, '', window.location.pathname);
    } catch (e) {}

    if (_dom.overlay) {
      _dom.overlay.classList.remove('is-open');
      _dom.overlay.setAttribute('aria-hidden', 'true');
    }
    _dom.sheet.classList.remove('is-open');
    _dom.sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ht-scroll-lock');
    _state.positionId = null;
  }

  /* ── Focus trap ── */
  function trapFocus(e) {
    if (!_dom.sheet || !_dom.sheet.classList.contains('is-open')) return;
    var focusable = Array.prototype.slice.call(
      _dom.sheet.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  /* ── Bind ── */
  function bind() {
    /* Kapat butonu */
    if (_dom.btnClose) {
      _dom.btnClose.addEventListener('click', function () {
        closePositionDetailSheet(false);
      });
    }

    /* Overlay click */
    if (_dom.overlay) {
      _dom.overlay.addEventListener('click', function () {
        closePositionDetailSheet(false);
      });
    }

    /* ESC — sadece detay sheet açıkken (soft refresh modal açıksa ESC sadece modal'ı kapatır) */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      /* Soft refresh modal açıksa önce onu kapat */
      var modal = document.getElementById('ik-soft-refresh-modal');
      if (modal && modal.style.display !== 'none') return;
      if (_state.isOpen) {
        e.stopPropagation();
        closePositionDetailSheet(false);
      }
    });

    /* Focus trap */
    if (_dom.sheet) {
      _dom.sheet.addEventListener('keydown', trapFocus);
    }

    /* popstate — back button */
    window.addEventListener('popstate', function (e) {
      if (_state.isOpen && (!e.state || !e.state.posDetailSheet)) {
        closePositionDetailSheet(true);
      }
    });

    /* "Kriter düzenle" — mevcut PR-2 form sheet'i aç */
    if (_dom.btnKriter) {
      _dom.btnKriter.addEventListener('click', function () {
        /* Form sheet edit modu — mevcut pozisyon ID ile */
        if (window._htOpenNewPositionSheet) {
          window._htOpenNewPositionSheet(_dom.btnKriter);
        }
      });
    }

    /* "Pozisyonu kapat" */
    if (_dom.btnKapat) {
      _dom.btnKapat.addEventListener('click', function () {
        var ok = window.confirm(
          'Bu pozisyon kapatılacak. Pipeline\'daki tüm adaylar arşivlenecek. Devam edilsin mi?'
        );
        if (!ok) return;
        track('pipeline_position_close', { position_id: _state.positionId });
        closePositionDetailSheet(true);
        /* TODO PR-3+: hr_archive_position RPC çağrısı */
      });
    }
  }

  /* ── Init ── */
  function init() {
    cacheDom();
    if (!_dom.sheet) return; /* sadece hr-pipeline.html'de çalışır */
    bind();
  }

  /* Expose */
  window._htOpenPositionDetailSheet  = openPositionDetailSheet;
  window._htClosePositionDetailSheet = closePositionDetailSheet;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
