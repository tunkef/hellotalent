/* HR Pipeline panel — Sprint 0 iskelet
   Sprint 1'de: kanban + drag-drop + stage move + position-aware filter.
   Sprint 0'da: HRShell ready + data adapter probe (smoke). */
'use strict';

(function () {
  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      // Sprint 1 hook noktasi — burada kanban render edilecek
      console.warn('[hr-pipeline] iskelet hazir, Sprint 1\'de doldurulacak');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
