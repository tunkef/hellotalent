/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Matching Engine — PR-4
   Soft refresh prompt lifecycle + dismiss count + agresif CTA.
   match-affecting alan değişimi → banner/modal tetikler.
   XSS-safe (textContent only).
   SOLID:
     - SRP: sadece soft refresh prompt lifecycle yönetir.
     - OCP: MATCH_AFFECTING_FIELDS config-driven.
     - DIP: banner show/hide ik-pipeline.js expose'larına delegate.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* PR-4 UX spec §1 trigger matrix */
  var MATCH_AFFECTING_FIELDS = [
    'sehir', 'seg', 'exp', 'calisma_tipi',
    'musaitlik', 'musaitlik_pozisyon',
    'egitim_seviye', 'diller', 'tercih_segmentler'
  ];

  /* localStorage namespace */
  var LS_PREFIX = '_ht_refresh_dismiss_';

  /* ── Helpers ── */
  function getDismissCount(positionId) {
    if (!positionId) return 0;
    try {
      return parseInt(localStorage.getItem(LS_PREFIX + positionId) || '0', 10);
    } catch (e) { return 0; }
  }

  function incDismissCount(positionId) {
    if (!positionId) return 0;
    try {
      var n = getDismissCount(positionId) + 1;
      localStorage.setItem(LS_PREFIX + positionId, String(n));
      return n;
    } catch (e) { return 0; }
  }

  function resetDismissCount(positionId) {
    if (!positionId) return;
    try { localStorage.removeItem(LS_PREFIX + positionId); } catch (e) {}
  }

  /* ── PostHog helper ── */
  function track(eventName, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(eventName, props || {}); } catch (e) {}
  }

  /* ── Match-affecting change detection ── */
  function hasMatchAffectingChange(prev, next) {
    if (!prev || !next) return false;
    for (var i = 0; i < MATCH_AFFECTING_FIELDS.length; i++) {
      var f = MATCH_AFFECTING_FIELDS[i];
      if (JSON.stringify(prev[f] != null ? prev[f] : null) !==
          JSON.stringify(next[f] != null ? next[f] : null)) {
        return true;
      }
    }
    return false;
  }

  /* ── Changed fields collector (PostHog props için) ── */
  function getChangedFields(prev, next) {
    if (!prev || !next) return [];
    var changed = [];
    for (var i = 0; i < MATCH_AFFECTING_FIELDS.length; i++) {
      var f = MATCH_AFFECTING_FIELDS[i];
      if (JSON.stringify(prev[f] != null ? prev[f] : null) !==
          JSON.stringify(next[f] != null ? next[f] : null)) {
        changed.push(f);
      }
    }
    return changed;
  }

  /* ── Soft refresh modal DOM ── */
  var _modal      = null;
  var _modalBody  = null;
  var _btnAccept  = null;
  var _btnDismiss = null;

  function cacheDom() {
    _modal      = document.getElementById('ik-soft-refresh-modal');
    _modalBody  = document.getElementById('ik-soft-refresh-modal-body');
    _btnAccept  = document.getElementById('btn-soft-refresh-accept');
    _btnDismiss = document.getElementById('btn-soft-refresh-dismiss');
  }

  function showModal() {
    if (!_modal) return;
    _modal.style.display = 'flex';
    _modal.setAttribute('aria-hidden', 'false');
    if (_btnAccept) setTimeout(function () { _btnAccept.focus(); }, 50);
  }

  function hideModal() {
    if (!_modal) return;
    _modal.style.display = 'none';
    _modal.setAttribute('aria-hidden', 'true');
  }

  /* ── Modal body text (textContent, XSS-safe) ── */
  function setModalBody(line1, line2) {
    if (!_modalBody) return;
    /* Clear children */
    while (_modalBody.firstChild) _modalBody.removeChild(_modalBody.firstChild);
    var p1 = document.createElement('span');
    p1.textContent = line1;
    _modalBody.appendChild(p1);
    if (line2) {
      _modalBody.appendChild(document.createElement('br'));
      var p2 = document.createElement('span');
      p2.textContent = line2;
      _modalBody.appendChild(p2);
    }
  }

  /* ── showSoftRefreshPrompt — ana entry point ── */
  function showSoftRefreshPrompt(positionId, changedFields, onAccept, onDismiss) {
    if (!positionId) return;

    var count = getDismissCount(positionId);

    /* PostHog */
    track('pipeline_soft_refresh_prompt_shown', {
      position_id: positionId,
      changed_fields: changedFields || []
    });

    /* 3+ dismiss → agresif CTA modu */
    if (count >= 3) {
      setModalBody(
        'Listedeki adayların bir kısmı artık kriterlere uymuyor olabilir. Yenilemeyi öneriyoruz.',
        'Kısa listendeki ve görüştüğün adaylar korunacak.'
      );
    }
    /* count 1-2: static HTML body yeterli (hr-pipeline.html'deki Türkçe metin) */

    /* İnline banner da göster */
    if (window._htPipelineShowRefreshBanner) {
      window._htPipelineShowRefreshBanner('Kriterler güncellendi. Uzun liste eski kriterlere göre.');
    }

    /* Modal — ilk kullanım (count=0) veya agresif mod (count>=3) */
    if (count === 0 || count >= 3) {
      showModal();
    }

    /* Accept handler — clone ile önceki listener'ı temizle */
    if (_btnAccept) {
      var newAccept = _btnAccept.cloneNode(true);
      _btnAccept.parentNode.replaceChild(newAccept, _btnAccept);
      _btnAccept = newAccept;
      _btnAccept.addEventListener('click', function () {
        hideModal();
        if (window._htPipelineHideBanner) window._htPipelineHideBanner();
        resetDismissCount(positionId);
        track('pipeline_soft_refresh_accepted', { position_id: positionId });
        if (typeof onAccept === 'function') {
          onAccept();
        } else {
          _callRefreshRpc(positionId);
        }
      });
    }

    /* Dismiss handler */
    if (_btnDismiss) {
      var newDismiss = _btnDismiss.cloneNode(true);
      _btnDismiss.parentNode.replaceChild(newDismiss, _btnDismiss);
      _btnDismiss = newDismiss;
      _btnDismiss.addEventListener('click', function () {
        hideModal();
        var newCount = incDismissCount(positionId);
        track('pipeline_soft_refresh_dismissed', {
          position_id: positionId,
          dismiss_count: newCount
        });
        if (typeof onDismiss === 'function') onDismiss();
      });
    }
  }

  /* ── RPC wrapper (fallback: onAccept callback yoksa) ── */
  function _callRefreshRpc(positionId) {
    if (!window.IK_DATA || !IK_DATA.refreshPositionPipeline) return;
    IK_DATA.refreshPositionPipeline(positionId).then(function (result) {
      var r       = result || {};
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
      _showToastDirect(msg, 'success');
    }).catch(function (err) {
      console.error('[ik-matching-engine] refreshPositionPipeline error:', err && err.message);
      _showToastDirect('Bağlantı sorunu. Liste yenilemedi, tekrar dene.', 'error');
    });
  }

  /* ── Toast fallback (ik-pipeline.js showToast expose olmadığında) ── */
  function _showToastDirect(msg, kind) {
    var toast = document.querySelector('[data-ik-pipeline-toast]');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('ik-pipeline-toast--success', 'ik-pipeline-toast--error');
    if (kind === 'success') toast.classList.add('ik-pipeline-toast--success');
    else if (kind === 'error') toast.classList.add('ik-pipeline-toast--error');
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 3500);
  }

  /* ── ESC modal kapat ── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (_modal && _modal.style.display !== 'none') {
      hideModal();
    }
  });

  /* ── Init ── */
  function init() {
    cacheDom();
  }

  /* Expose public API */
  window._htMatchingEngine = {
    hasMatchAffectingChange: hasMatchAffectingChange,
    getChangedFields:        getChangedFields,
    showSoftRefreshPrompt:   showSoftRefreshPrompt,
    getDismissCount:         getDismissCount
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
