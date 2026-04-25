/* HR Pool panel — Sprint 0 iskelet
   Sprint 2'de: filtre paneli + arama + sonuc kartlari + pipeline'a ekleme. */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      console.warn('[hr-pool] iskelet hazir, Sprint 2\'de doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
