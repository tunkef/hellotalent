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
    var label = document.createElement('h3');
    label.className = 'admin-h3';
    label.textContent = text;
    return label;
  }

  // SVG icon helper for empty states — no emoji, brand-compliant
  // types: 'empty' | 'loading' | 'coming-soon' | 'error'
  function emptyStateIcon(type) {
    var size = 48;
    var stroke = 'currentColor';
    var svgAttrs = 'width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    if (type === 'loading') {
      return '<svg ' + svgAttrs + ' style="animation:htSpin 1.2s linear infinite;"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/></svg>';
    }
    if (type === 'coming-soon') {
      return '<svg ' + svgAttrs + '><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    }
    if (type === 'error') {
      return '<svg ' + svgAttrs + '><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    }
    // default: empty
    return '<svg ' + svgAttrs + '><path d="M3 3h18v4H3zM5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7"/><path d="M10 11h4"/></svg>';
  }

  // Toast notification — 4 variant: success | error | warning | info
  // Auto-dismiss after 4000ms; stack on right-bottom.
  var toastContainer = null;
  function ensureToastContainer() {
    if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.className = 'ht-toast-container';
    toastContainer.setAttribute('role', 'region');
    toastContainer.setAttribute('aria-label', 'Bildirimler');
    document.body.appendChild(toastContainer);
    return toastContainer;
  }
  function toast(message, type) {
    var t = document.createElement('div');
    t.className = 'ht-toast ht-toast--' + (type || 'info');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.textContent = message;
    ensureToastContainer().appendChild(t);
    setTimeout(function(){
      t.classList.add('is-hiding');
      setTimeout(function(){ if (t.parentNode) t.parentNode.removeChild(t); }, 200);
    }, 4000);
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
    emptyStateIcon: emptyStateIcon,
    toast: toast,
  };

  // Backward-compat aliases — mevcut modüller refactor edilene kadar çalışmaya
  // devam etsin. Faz 3 sonunda 6 ay sonra sweep edilebilir.
  window._htAdminBuildStatCard = buildStatCard;
  window._htAdminBuildRow = buildRow;
  window._htAdminBuildSectionLabel = buildSectionLabel;
})();
