/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Pos Close — PR-7 Pozisyon Yaşam Döngüsü
   Kapat + yeniden aç confirm modal lifecycle.
   Tek modal HTML element — data-modal-type ile context değişir.
   XSS-safe (textContent only).
   SOLID:
     - SRP: sadece modal open/close + RPC dispatch.
     - OCP: modal content tablosu genişletilebilir.
     - DIP: data yalnızca IK_DATA üzerinden.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Modal DOM refs ── */
  var _dom = {};
  var _currentType    = null; /* 'close' | 'reopen' */
  var _currentPosId   = null;
  var _onConfirmCb    = null;

  /* ── Modal content tablosu ── */
  var MODAL_CONTENT = {
    'close': {
      title:       'Pozisyonu kapat',
      desc:        'Bu pozisyonu kapattığında uzun liste, kısa liste ve iletişime geçilen adayların tümü arşive taşınacak. Daha sonra yeniden açabilirsin.',
      confirmText: 'Evet, kapat',
      cancelText:  'Vazgeç'
    },
    'reopen': {
      title:       'Pozisyonu yeniden aç',
      desc:        'Bu pozisyonu yeniden açmak istediğine emin misin? Aday listesi güncel kriterlere göre yenilenecek.',
      confirmText: 'Evet, yeniden aç',
      cancelText:  'Vazgeç'
    }
  };

  /* ── PostHog helper ── */
  function track(name, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(name, props || {}); } catch (e) {}
  }

  /* ── Toast helper (ik-pipeline.js showToast reuse) ── */
  function showToast(msg, kind) {
    var toast = document.querySelector('[data-ik-pipeline-toast]');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'ik-pipeline-toast';
    if (kind === 'success') toast.classList.add('ik-pipeline-toast--success');
    else if (kind === 'error') toast.classList.add('ik-pipeline-toast--error');
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 4000);
  }

  /* ── Cache DOM ── */
  function cacheDom() {
    _dom.overlay    = document.getElementById('ik-pos-modal-overlay');
    _dom.modal      = document.getElementById('ik-pos-modal');
    _dom.title      = document.getElementById('ik-pos-modal-title');
    _dom.desc       = document.getElementById('ik-pos-modal-desc');
    _dom.btnCancel  = document.getElementById('btn-pos-modal-cancel');
    _dom.btnConfirm = document.getElementById('btn-pos-modal-confirm');
  }

  /* ── Open modal ── */
  function openModal(type, posId, onConfirm) {
    if (!_dom.modal) return;
    var content = MODAL_CONTENT[type];
    if (!content) return;

    _currentType  = type;
    _currentPosId = posId;
    _onConfirmCb  = onConfirm || null;

    /* Set content */
    if (_dom.title)      _dom.title.textContent      = content.title;
    if (_dom.desc)       _dom.desc.textContent        = content.desc;
    if (_dom.btnConfirm) _dom.btnConfirm.textContent  = content.confirmText;
    if (_dom.btnCancel)  _dom.btnCancel.textContent   = content.cancelText;

    /* Show */
    if (_dom.overlay) {
      _dom.overlay.classList.add('is-open');
      _dom.overlay.setAttribute('aria-hidden', 'false');
    }
    _dom.modal.classList.add('is-open');
    _dom.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    /* Focus confirm button */
    setTimeout(function () {
      if (_dom.btnConfirm) _dom.btnConfirm.focus();
    }, 50);
  }

  /* ── Close modal ── */
  function closeModal() {
    if (!_dom.modal) return;
    _dom.modal.classList.remove('is-open');
    _dom.modal.setAttribute('aria-hidden', 'true');
    if (_dom.overlay) {
      _dom.overlay.classList.remove('is-open');
      _dom.overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
    _currentType  = null;
    _currentPosId = null;
    _onConfirmCb  = null;
  }

  /* ── Confirm handler ── */
  function handleConfirm() {
    var type  = _currentType;
    var posId = _currentPosId;
    var cb    = _onConfirmCb;

    closeModal();

    if (!window.IK_DATA) return;

    if (type === 'close') {
      track('position_close_confirm', { position_id: posId });
      IK_DATA.closePosition(posId).then(function (result) {
        if (!result.ok) {
          showToast(result.error || 'Hata: Pozisyon kapatılamadı. Tekrar deneyin.', 'error');
          return;
        }
        showToast('Pozisyon arşive taşındı. Arşiv sekmesinden yeniden açabilirsin.', 'success');
        if (typeof cb === 'function') cb(result);
      }).catch(function (e) {
        console.error('[ik-pos-close] closePosition error:', e && e.message);
        showToast('Hata: Bağlantı sorunu. Tekrar deneyin.', 'error');
      });
      return;
    }

    if (type === 'reopen') {
      track('position_reopen_confirm', { position_id: posId });
      IK_DATA.reopenPosition(posId).then(function (result) {
        if (!result.ok) {
          showToast(result.error || 'Hata: Pozisyon yeniden açılamadı. Tekrar deneyin.', 'error');
          return;
        }
        var added = result.added || 0;
        var msg;
        if (added === 0) {
          msg = 'Pozisyon yeniden aktif. Eşleşen aday yok — kriterleri gözden geçir.';
        } else if (added === 1) {
          msg = 'Pozisyon yeniden aktif. 1 yeni aday uzun listeye eklendi.';
        } else {
          msg = 'Pozisyon yeniden aktif. ' + added + ' yeni aday uzun listeye eklendi.';
        }
        showToast(msg, 'success');
        if (typeof cb === 'function') cb(result);
      }).catch(function (e) {
        console.error('[ik-pos-close] reopenPosition error:', e && e.message);
        showToast('Hata: Bağlantı sorunu. Tekrar deneyin.', 'error');
      });
      return;
    }
  }

  /* ── Cancel handler ── */
  function handleCancel() {
    if (_currentType === 'close') {
      track('position_close_cancel', { position_id: _currentPosId });
    } else if (_currentType === 'reopen') {
      track('position_reopen_cancel', { position_id: _currentPosId });
    }
    closeModal();
  }

  /* ── Focus trap ── */
  function trapFocus(e) {
    if (!_dom.modal || !_dom.modal.classList.contains('is-open')) return;
    var focusable = Array.prototype.slice.call(
      _dom.modal.querySelectorAll('button:not([disabled])')
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

  /* ── Bind events ── */
  function bind() {
    if (_dom.btnConfirm) {
      _dom.btnConfirm.addEventListener('click', handleConfirm);
    }
    if (_dom.btnCancel) {
      _dom.btnCancel.addEventListener('click', handleCancel);
    }
    if (_dom.overlay) {
      _dom.overlay.addEventListener('click', handleCancel);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _dom.modal && _dom.modal.classList.contains('is-open')) {
        handleCancel();
      }
    });
    if (_dom.modal) {
      _dom.modal.addEventListener('keydown', trapFocus);
    }
  }

  /* ── Init ── */
  function init() {
    cacheDom();
    if (!_dom.modal) return;
    bind();
  }

  /* ── 7 May Tuna feedback: "allah aşkına yok et şunu" — custom modal
     unstyled görünüyordu (cache veya cascade override sebebi belirsiz).
     Native window.confirm() ile değiştirildi; modal markup + CSS dead. ── */
  function nativeConfirm(type, posId, onConfirm) {
    var content = MODAL_CONTENT[type];
    if (!content) return;
    var msg = content.title + '\n\n' + content.desc;
    var ok = window.confirm(msg);
    if (!ok) {
      track('position_' + type + '_cancel', { position_id: posId });
      return;
    }
    /* Set state for handleConfirm reuse (existing RPC flow + toast) */
    _currentType  = type;
    _currentPosId = posId;
    _onConfirmCb  = onConfirm || null;
    handleConfirm();
  }

  /* ── Public API ── */
  window._htPosClose = {
    confirmClose:  function (posId, onConfirm) { nativeConfirm('close',  posId, onConfirm); },
    confirmReopen: function (posId, onConfirm) { nativeConfirm('reopen', posId, onConfirm); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
