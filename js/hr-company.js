/* HR Company panel — Sprint 0 iskelet
   Sprint 6'da: sirket profil formu + marka portfoy yonetimi + adaylara acik alan kontrolu. */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      console.warn('[hr-company] iskelet hazir, Sprint 6\'da doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
