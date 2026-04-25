/* HR Hub (ik.html) — Sprint 0
   Sorumluluk: KPI doldurma + greeting kisilestirme.
   Pipeline / pool / messages count Sprint 1+ panel'lerde gercek veriyle dolar;
   Sprint 0'da demo data uzerinden hesaplanir. */
'use strict';

(function () {
  function $(sel) { return document.querySelector(sel); }

  function setKpi(key, value) {
    var el = document.querySelector('[data-hr-kpi="' + key + '"]');
    if (el) el.textContent = value;
    var deltaEl = el && el.parentNode ? el.parentNode.querySelector('.hr-kpi__delta') : null;
    if (deltaEl) deltaEl.textContent = window.HRData && window.HRData.isRealMode() ? 'Canlı veri' : 'Demo veri';
  }

  function setGreeting(profile) {
    var el = document.querySelector('[data-hr-greeting]');
    if (!el) return;
    var first = profile && profile.ad ? String(profile.ad).trim() : '';
    if (first) {
      el.textContent = 'Hoş geldiniz, ' + first + '.';
    }
  }

  async function init() {
    if (!window.HRShell) return;
    var ctx = await window.HRShell.ready();
    setGreeting(ctx && ctx.profile);

    if (!window.HRData) return;
    try {
      var posRes = await window.HRData.getPositions();
      setKpi('positions', posRes && posRes.data ? posRes.data.length : 0);
    } catch (e) { setKpi('positions', 0); }

    try {
      var pipRes = await window.HRData.getPipeline(null);
      setKpi('pipeline', pipRes && pipRes.data ? pipRes.data.length : 0);
    } catch (e) { setKpi('pipeline', 0); }

    try {
      var msgRes = await window.HRData.getMessageThreads();
      var unread = 0;
      if (msgRes && msgRes.data && msgRes.data.length) {
        for (var i = 0; i < msgRes.data.length; i++) {
          unread += parseInt(msgRes.data[i].unread_count || 0, 10);
        }
      }
      setKpi('messages', unread);
    } catch (e) { setKpi('messages', 0); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
