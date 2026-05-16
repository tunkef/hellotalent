/**
 * cookie-consent.js — KVKK Çerez Bildirim Banner (XSS-safe DOM API)
 * Reform v3.4 FIX-8 (11 May 2026)
 *
 * Minimal CMP:
 * - localStorage 'ht-cookie-consent' yoksa banner inject
 * - Kabul Et/Sadece Zorunlu → localStorage set, 1 yıl
 * - "Çerez politikası" → yasal.html#cerez-politikasi
 * - WCAG 2.1 AA: role=dialog, aria-label, focus, keyboard
 *
 * Reset: window._htCookieConsent.reset() veya localStorage.removeItem
 */
(function () {
  'use strict';

  var CONSENT_KEY = 'ht-cookie-consent';
  var CONSENT_VERSION = '2026-05-11';
  var STORE_TTL = 365;

  function readConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION) return null;
      var age = (Date.now() - parsed.ts) / 86400000;
      if (age > STORE_TTL) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(accepted) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        accepted: !!accepted,
        version: CONSENT_VERSION,
        ts: Date.now(),
      }));
    } catch (e) {}
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function injectBanner() {
    if (document.getElementById('ht-cookie-banner')) return;

    var banner = el('div', {
      id: 'ht-cookie-banner',
      role: 'dialog',
      'aria-labelledby': 'ht-cookie-title',
      'aria-describedby': 'ht-cookie-desc',
    });

    var content = el('div', { class: 'ht-cookie-content' });
    var title = el('h2', { id: 'ht-cookie-title', class: 'ht-cookie-title' }, 'Çerez Bilgilendirme');

    var desc = el('p', { id: 'ht-cookie-desc', class: 'ht-cookie-desc' });
    desc.appendChild(document.createTextNode(
      'HelloTalent platformunda deneyiminizi iyileştirmek için teknik çerezler kullanıyoruz. ' +
      'Analitik çerezler kabulünüz sonrası aktive edilir. '
    ));
    var link = el('a', { href: 'yasal.html#cerez-politikasi', class: 'ht-cookie-link' }, 'Çerez politikası');
    desc.appendChild(link);

    var actions = el('div', { class: 'ht-cookie-actions' });
    var declineBtn = el('button', {
      type: 'button',
      id: 'ht-cookie-decline',
      class: 'ht-cookie-btn ht-cookie-btn-secondary',
      'aria-label': 'Sadece zorunlu çerezleri kabul et',
    }, 'Sadece Zorunlu');
    var acceptBtn = el('button', {
      type: 'button',
      id: 'ht-cookie-accept',
      class: 'ht-cookie-btn ht-cookie-btn-primary',
      'aria-label': 'Tüm çerezleri kabul et',
    }, 'Tümünü Kabul');

    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);
    content.appendChild(title);
    content.appendChild(desc);
    content.appendChild(actions);
    banner.appendChild(content);

    // CSS inline (static template)
    var style = el('style', null, null);
    style.appendChild(document.createTextNode([
      '#ht-cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:9998;',
      'background:var(--editorial-paper,#fff);border-top:1px solid var(--editorial-hairline-strong,#e0e0e0);',
      'box-shadow:0 -4px 12px rgba(0,0,0,0.08);padding:16px 20px;',
      'font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:var(--editorial-ink,#1a1a1a)}',
      '.ht-cookie-content{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:20px;flex-wrap:wrap}',
      '.ht-cookie-title{font-family:"Bricolage Grotesque",serif;font-size:16px;margin:0;font-weight:600}',
      '.ht-cookie-desc{flex:1;min-width:280px;font-size:13px;line-height:1.5;margin:0}',
      '.ht-cookie-link{color:var(--verm,#C94E28);text-decoration:underline}',
      '.ht-cookie-actions{display:flex;gap:8px;flex-shrink:0}',
      '.ht-cookie-btn{padding:8px 16px;border-radius:10px;border:1px solid var(--editorial-hairline-strong,#e0e0e0);',
      'cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;transition:all 0.15s}',
      '.ht-cookie-btn-primary{background:var(--verm,#C94E28);color:#fff;border-color:var(--verm,#C94E28)}',
      '.ht-cookie-btn-primary:hover{filter:brightness(1.05)}',
      '.ht-cookie-btn-secondary{background:transparent;color:var(--editorial-ink,#1a1a1a)}',
      '.ht-cookie-btn-secondary:hover{background:var(--editorial-paper-soft,#f5f5f5)}',
      '.ht-cookie-btn:focus-visible{outline:2px solid var(--verm,#C94E28);outline-offset:2px}',
      'html[data-theme="dark"] #ht-cookie-banner{background:var(--editorial-paper,#1A1A1A);',
      'border-color:var(--editorial-hairline-strong,#3a3a3a);color:var(--editorial-ink,#f0f0f0)}',
      '@media (max-width:640px){.ht-cookie-content{flex-direction:column;align-items:stretch}',
      '.ht-cookie-actions{justify-content:stretch}.ht-cookie-btn{flex:1}}',
    ].join('')));

    document.head.appendChild(style);
    document.body.appendChild(banner);

    acceptBtn.addEventListener('click', function () {
      writeConsent(true);
      banner.remove();
      if (typeof window.htOnConsentGranted === 'function') {
        window.htOnConsentGranted();
      }
    });

    declineBtn.addEventListener('click', function () {
      writeConsent(false);
      banner.remove();
    });

    setTimeout(function () {
      declineBtn.focus();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!readConsent()) injectBanner();
    });
  } else {
    if (!readConsent()) injectBanner();
  }

  window._htCookieConsent = {
    read: readConsent,
    reset: function () {
      try { localStorage.removeItem(CONSENT_KEY); } catch (e) {}
      window.location.reload();
    },
  };
})();
