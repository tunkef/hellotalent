/* HR Messages panel — Sprint 0 iskelet
   Sprint 3'te: thread list + active thread paneli + mesaj gonderme + read/unread sayac. */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      console.warn('[hr-messages] iskelet hazir, Sprint 3\'te doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
