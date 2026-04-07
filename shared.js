/* global supabase */
/* ════════════════════════════════════════════════════
   HELLOTALENT — SHARED JS
   Çalışma mantığı:
   1. Sayfa URL'sine bakarak hangi nav item'ın aktif olduğunu belirler
   2. Header ve footer HTML'ini ilgili placeholder div'lere inject eder
   3. Ortak event listener'ları kurar (login dropdown, mobile menu)
   ════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── SUPABASE CONFIG (single source of truth) ── */
  var HT_SUPA_URL = 'https://cpwibefquojehjehtrog.supabase.co';
  var HT_SUPA_KEY = 'sb_publishable_POUtNwJyjAAheukwYP5hmA_TKKjphwa';

  /* ── ACTIVE PAGE DETECTION ── */
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  var PAGE = 'home';
  var pageMap = {
    '/aday': 'aday', '/aday.html': 'aday',
    '/isveren': 'isveren', '/isveren.html': 'isveren',
  };
  if (pageMap[path]) PAGE = pageMap[path];

  /* ── SVG ICONS ── */
  var CHEVRON = '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

  function svgIcon(path) {
    return '<svg class="nav-dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + path + '</svg>';
  }

  /* ── NAV HELPER ── */
  function navLink(label, href, key) {
    var cls = 'nav-link' + (PAGE === key ? ' active active-' + key : '');
    return '<a class="' + cls + '" href="' + href + '">' + label + '</a>';
  }

  function ddItem(label, href, key, icon) {
    var cls = 'nav-dd-item' + (PAGE === key ? ' dd-active' : '');
    return '<a class="' + cls + '" href="' + href + '">' + svgIcon(icon) + ' ' + label + '</a>';
  }

  function mobileLink(label, href, key, extraCls) {
    var cls = 'mobile-nav-link' + (PAGE === key ? ' active' : '') + (extraCls ? ' ' + extraCls : '');
    return '<a class="' + cls + '" href="' + href + '">' + label + '</a>';
  }

  /* ── HEADER HTML ── */
  var HEADER_HTML = [
    '<header class="site-header" id="site-header">',
    '  <button class="hamburger" id="hamburger" onclick="HT.toggleMenu()" aria-label="Menü" aria-expanded="false">',
    '    <span></span><span></span><span></span>',
    '  </button>',
    '  <a class="header-logo" href="index.html">hello<span>talent</span></a>',
    '  <nav class="header-nav">',
    navLink('Adaylar İçin', 'aday.html', 'aday'),
    navLink('İşverenler İçin', 'isveren.html', 'isveren'),
    '  </nav>',
    '  <div class="header-actions">',
    '    <button class="btn-nav-login" id="login-btn" onclick="HT.toggleLogin()" aria-expanded="false" aria-haspopup="true">',
    '      Giriş Yap',
    '      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
    '    </button>',
    '  </div>',
    '</header>',
    /* Login Modal — centered overlay */
    '<div class="login-modal-overlay" id="login-modal-overlay" onclick="if(event.target===this)HT.toggleLogin()">',
    '  <div class="login-modal" id="login-modal">',
    '    <button class="login-modal-close" onclick="HT.toggleLogin()">&times;</button>',
    '    <div class="login-modal-title">Giriş Yap</div>',
    '    <div class="login-modal-sub">Devam etmek istediğin hesap türünü seç.</div>',
    '    <div class="login-modal-cards">',
    '      <div class="login-modal-card" onclick="HT.go(\'giris.html?tab=aday\')">',
    '        <div class="lmc-icon" style="background:var(--verm-light);color:var(--verm);">',
    '          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    '        </div>',
    '        <div class="lmc-title">Aday Girişi</div>',
    '        <div class="lmc-desc">Profil oluştur, kariyer hedefini paylaş</div>',
    '        <div class="lmc-arrow">&rarr;</div>',
    '      </div>',
    '      <div class="login-modal-card" onclick="HT.go(\'giris.html?tab=ik\')">',
    '        <div class="lmc-icon" style="background:var(--navy-light);color:var(--navy);">',
    '          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    '        </div>',
    '        <div class="lmc-title">İK / İşveren Girişi</div>',
    '        <div class="lmc-desc">Aday havuzuna eriş, demo talep et</div>',
    '        <div class="lmc-arrow">&rarr;</div>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
    /* Mobile menu — simplified, no dropdowns */
    '<div class="mobile-menu" id="mobile-menu">',
    mobileLink('Adaylar İçin',    'aday.html',    'aday'),
    mobileLink('İşverenler İçin', 'isveren.html', 'isveren'),
    '  <div class="mobile-nav-divider"></div>',
    mobileLink('Hakkımızda', 'hakkimizda.html', null),
    mobileLink('İletişim',   'iletisim.html',   null),
    '</div>',
  ].join('\n');

  /* ── FOOTER HTML ── */
  var FOOTER_HTML = [
    '<footer class="site-footer">',
    '  <div class="footer-top">',
    '    <div class="footer-left">',
    '      <div class="footer-brand">hello<span>talent</span></div>',
    '      <div class="footer-tagline">Türkiye\'nin retail talent marketplace\'i.<br>Doğru yetenek, doğru marka.</div>',
    '      <div class="footer-nav">',
    '        <a class="footer-link" href="aday.html">Adaylar İçin</a>',
    '        <a class="footer-link" href="isveren.html">İşverenler İçin</a>',
    '        <a class="footer-link" href="hakkimizda.html">Hakkımızda</a>',
    '        <a class="footer-link" href="iletisim.html">İletişim</a>',
    '        <a class="footer-link" href="yasal.html">Yasal Bilgiler</a>',
    '      </div>',
    '    </div>',
    '    <div class="footer-social">',
    '      <a class="social-link" href="https://x.com/hellotalent" target="_blank" rel="noopener" title="X">',
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    '      </a>',
    '      <a class="social-link" href="https://www.tiktok.com/@hellotalent" target="_blank" rel="noopener" title="TikTok">',
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.3z"/></svg>',
    '      </a>',
    '      <a class="social-link" href="https://www.instagram.com/hellotalent.ai" target="_blank" rel="noopener" title="Instagram">',
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>',
    '      </a>',
    '      <a class="social-link" href="https://www.linkedin.com/company/hello-talentai/" target="_blank" rel="noopener" title="LinkedIn">',
    '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    '      </a>',
    '    </div>',
    '  </div>',
    '  <div class="footer-bottom">',
    '    <span class="footer-copyright">&copy; 2026 hellotalent.ai &mdash; Tüm hakları saklıdır.</span>',
    '    <span class="footer-dei">HelloTalent\'ta herkes eşittir. Perakende sektörünün gücü farklılıklarımızdan gelir. Tüm adaylara adil ve eşit bir şekilde davranmayı taahhüt ediyoruz.</span>',
    '  </div>',
    '</footer>',
  ].join('\n');

  /* ── INJECT ── */
  function inject() {
    var headerEl = document.getElementById('ht-header');
    var footerEl = document.getElementById('ht-footer');
    if (headerEl) headerEl.outerHTML = HEADER_HTML;
    if (footerEl) footerEl.outerHTML = FOOTER_HTML;
    bindEvents();
  }

  /* ── EVENT LISTENERS ── */
  function bindEvents() {
    /* ESC ile modal kapat */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var overlay = document.getElementById('login-modal-overlay');
        if (overlay && overlay.classList.contains('open')) {
          window.HT.toggleLogin();
        }
        var menu = document.getElementById('mobile-menu');
        if (menu && menu.classList.contains('open')) {
          window.HT.toggleMenu();
        }
      }
    });
  }

  /* ── PUBLIC API ── */
  window.HT = {
    go: function (url) { window.location.href = url; },
    SUPA_URL: HT_SUPA_URL,
    SUPA_KEY: HT_SUPA_KEY,
    getSupa: function () {
      if (!window._htSupa) {
        if (typeof supabase === 'undefined') { console.warn('Supabase CDN not loaded'); return null; }
        window._htSupa = supabase.createClient(HT_SUPA_URL, HT_SUPA_KEY);
      }
      return window._htSupa;
    },

    toggleLogin: function () {
      /* Page-aware direct redirect — no popup */
      if (PAGE === 'aday') {
        document.body.style.transition = 'opacity 0.4s ease';
        document.body.style.opacity = '0';
        setTimeout(function(){ window.location.href = '/giris.html?tab=aday'; }, 400);
        return;
      }
      if (PAGE === 'isveren') {
        document.body.style.transition = 'opacity 0.4s ease';
        document.body.style.opacity = '0';
        setTimeout(function(){ window.location.href = '/giris.html?tab=ik'; }, 400);
        return;
      }
      /* Other pages: direct to giris.html (no popup) */
      window.location.href = '/giris.html';
    },

    toggleMenu: function () {
      var menu = document.getElementById('mobile-menu');
      var ham = document.getElementById('hamburger');
      if (!menu) return;
      var open = menu.classList.toggle('open');
      if (ham) { ham.classList.toggle('open', open); ham.setAttribute('aria-expanded', String(open)); }
      document.body.style.overflow = open ? 'hidden' : '';
    },

    toggleAccordion: function (btn) {
      var panel = btn.nextElementSibling;
      if (!panel) return;
      var open = panel.classList.toggle('open');
      var svg = btn.querySelector('svg');
      if (svg) svg.style.transform = open ? 'rotate(180deg)' : '';
    },

    toggleShowMore: function (btn, gridId) {
      var grid = document.getElementById(gridId);
      if (!grid) return;
      var expanded = grid.classList.toggle('expanded');
      btn.classList.toggle('expanded', expanded);
      btn.innerHTML = expanded
        ? 'Daha Az Göster <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
        : 'Daha Fazla Göster <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    },

    toggleFooterCol: function (btn) {
      var parent = btn.parentElement;
      var links = parent ? parent.querySelector('.footer-col-links') : null;
      if (!links) return;
      var open = links.classList.toggle('open');
      btn.classList.toggle('open', open);
    },

    /* ── Analytics Event Tracking (LB1) ── */
    trackEvent: function (eventName, eventData) {
      try {
        var sb = window.HT.getSupa();
        if (!sb) return;
        sb.auth.getUser().then(function (res) {
          var userId = res && res.data && res.data.user ? res.data.user.id : null;
          if (!userId) return;
          sb.from('analytics_events').insert({
            user_id: userId,
            event_name: eventName,
            event_data: eventData || {},
            page: window.location.pathname
          }).then(function () { /* fire and forget */ });
        });
      } catch (_e) { /* silent — analytics must never break UX */ }
    },
  };

  /* ── go() global alias (geriye dönük uyumluluk) ── */
  window.go = window.HT.go;
  window.toggleLoginDropdown = window.HT.toggleLogin;
  window.toggleMobileMenu = window.HT.toggleMenu;

  /* ── RUN ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
