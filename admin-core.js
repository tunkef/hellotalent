/* ═══ admin-core.js — Shared Utility + Panel Mount Helper ═══
   Purpose: admin-*.js modüllerinin ortak helper'larını tek yerde topla.
   Duplikasyon: esc/fmtDate/getSupa birkaç modülde ayrı tanımlıydı, temizlendi.
   Mount pattern: profil.html yaklaşımı — panel HTML'leri admin-*.js template
   string olarak tutar, _htAdminCore.mount(panelEl, html) ile inject edilir.
   Güvenlik: mount() Range.createContextualFragment kullanır — script execute
   etmez, çağıran modül dynamic data'yı esc() ile kaçırmakla yükümlü.
*/
(function(){
  'use strict';

  function getSupa() {
    if (window.HT && typeof window.HT.getSupa === 'function') return window.HT.getSupa();
    if (window._htAdminSupa) return window._htAdminSupa;
    return null;
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return String(d); }
  }

  // Panel mount — parsedan HTML fragment inject eder. Script element'leri
  // Range.createContextualFragment ile parse edilince execute edilmez;
  // inline event handler attribute'ları çağrılmaz. Çağıran modül dynamic
  // data'yı esc() ile kaçırmaktan sorumludur.
  function mount(panelEl, html) {
    if (!panelEl) return;
    while (panelEl.firstChild) panelEl.removeChild(panelEl.firstChild);
    var range = document.createRange();
    range.selectNodeContents(panelEl);
    var fragment = range.createContextualFragment(html);
    panelEl.appendChild(fragment);
  }

  function buildStatCard(label, value, emoji, extra) {
    var card = document.createElement('div');
    card.className = 'stat-card';
    var labelDiv = document.createElement('div');
    labelDiv.className = 'stat-card-label';
    labelDiv.textContent = (emoji ? emoji + ' ' : '') + label;
    card.appendChild(labelDiv);
    var valueDiv = document.createElement('div');
    valueDiv.className = 'stat-card-value';
    valueDiv.textContent = value;
    card.appendChild(valueDiv);
    if (extra) {
      var extraDiv = document.createElement('div');
      extraDiv.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;';
      extraDiv.textContent = extra;
      card.appendChild(extraDiv);
    }
    return card;
  }

  function buildRow(cards) {
    var grid = document.createElement('div');
    grid.className = 'stats-grid';
    for (var i = 0; i < cards.length; i++) grid.appendChild(cards[i]);
    return grid;
  }

  function buildSectionLabel(text) {
    var label = document.createElement('div');
    label.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin:24px 0 12px;';
    label.textContent = text;
    return label;
  }

  // Public surface
  window._htAdminCore = {
    getSupa: getSupa,
    esc: esc,
    fmtDate: fmtDate,
    mount: mount,
    buildStatCard: buildStatCard,
    buildRow: buildRow,
    buildSectionLabel: buildSectionLabel,
  };

  // Backward-compat aliases — mevcut modüller refactor edilene kadar çalışmaya
  // devam etsin. Faz 3 sonunda 6 ay sonra sweep edilebilir.
  window._htAdminBuildStatCard = buildStatCard;
  window._htAdminBuildRow = buildRow;
  window._htAdminBuildSectionLabel = buildSectionLabel;
})();
