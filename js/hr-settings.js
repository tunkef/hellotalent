/* HR Settings panel — Sprint 0 iskelet
   Sprint 6'da: bildirim tercihleri + tema secici + sifre/2FA + plan bilgileri. */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      console.warn('[hr-settings] iskelet hazir, Sprint 6\'da doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
