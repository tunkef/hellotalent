/* ════════════════════════════════════════════════════════════════
   IK Campaigns — D2.5 empty state
   MVP 2 sonrasi Iyzico entegrasyonu ile aktif olacak.
   Su an: empty state goster, disabled buton listener.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function showToast(text, kind) {
    var el = document.getElementById('ik-toast');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'ik-toast is-visible' + (kind ? ' ik-toast--' + kind : '');
    setTimeout(function () { el.classList.remove('is-visible'); }, 3200);
  }

  function init() {
    var disabledBtn = document.getElementById('btn-cmp-disabled');
    if (disabledBtn) {
      disabledBtn.addEventListener('click', function (e) {
        e.preventDefault();
        showToast('Kampanyalar henüz aktif değil. MVP 2 sonrası açılacak.', 'ok');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
