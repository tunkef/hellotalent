/* HR Campaigns panel — Sprint 0 iskelet
   Sprint 5'te: kampanya listesi + wizard akisi + segment filtre + mesaj sablonu + gonderim takibi. */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      console.warn('[hr-campaigns] iskelet hazir, Sprint 5\'te doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
