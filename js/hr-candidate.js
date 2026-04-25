/* HR Candidate detail panel — Sprint 0 iskelet
   Sprint 4'te: ?id=... URL parsing + getCandidateById + profil paneli + not paneli + aksiyon menusu. */
'use strict';

(function () {
  function getCandidateIdFromUrl() {
    try {
      var sp = new URLSearchParams(window.location.search);
      return sp.get('id') || null;
    } catch (e) { return null; }
  }

  function init() {
    if (!window.HRShell) return;
    window.HRShell.ready().then(function () {
      var id = getCandidateIdFromUrl();
      console.warn('[hr-candidate] iskelet hazir, Sprint 4\'te doldurulacak. ?id=' + (id || 'yok'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
