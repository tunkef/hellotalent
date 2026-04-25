/* HR Team panel — Sprint 0 iskelet
   Sprint 6'da: ekip uye listesi + davet akisi + rol matrisi (admin/recruiter/viewer). */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      console.warn('[hr-team] iskelet hazir, Sprint 6\'da doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
