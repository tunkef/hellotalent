/* ════════════════════════════════════════════════════
   HELLOTALENT — SHARED JS
   Çalışma mantığı:
   1. Sayfa URL'sine bakarak hangi nav item'ın aktif olduğunu belirler
   2. Header ve footer HTML'ini ilgili placeholder div'lere inject eder
   3. Ortak event listener'ları kurar (login dropdown, mobile menu)
   ════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── ACTIVE PAGE DETECTION ── */
  var path = window.location.pathname.replace(/\/$/, '') || '/';
  var PAGE = 'home';
  var pageMap = {
    'isalim-rotasi.html': 'isalim',
    '/aday': 'aday', '/aday.html': 'aday',
    '/isveren': 'isveren', '/isveren.html': 'isveren',
    '/kariyer': 'kariyer', '/kariyer.html': 'kariyer',
    '/pozisyonlar': 'kariyer', '/pozisyonlar.html': 'kariyer',
    '/yetkinlik': 'kariyer', '/yetkinlik.html': 'kariyer',
    '/blog': 'kariyer', '/blog.html': 'kariyer',
  };
  if (pageMap[path]) PAGE = pageMap[path];

  /* ── SVG ICONS ── */
  var CHEVRON = '<svg class="dd-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

  function svgIcon(path) {
    return '<svg class="nav-dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + path + '</svg>';
  }

  /* ── NAV HELPER ── */
  function navLink(label, href, key) {
    var cls = 'nav-link' + (PAGE === key ? ' active' : '');
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
  var ddTriggerCls = 'nav-dropdown-trigger' + (PAGE === 'kariyer' ? ' active' : '');

  var HEADER_HTML = [
    '<header class="site-header" id="site-header">',
    '  <button class="hamburger" id="hamburger" onclick="HT.toggleMenu()" aria-label="Menü" aria-expanded="false">',
    '    <span></span><span></span><span></span>',
    '  </button>',
    '  <a class="header-logo" href="index.html">hello<span>talent</span></a>',
    '  <nav class="header-nav">',
    navLink('Adaylar İçin', 'aday.html', 'aday'),
    navLink('İşverenler İçin', 'isveren.html', 'isveren'),
    '  <div class="nav-dropdown">',
    '    <span class="' + ddTriggerCls + '">Kariyer Rotası ' + CHEVRON + '</span>',
    '    <div class="nav-dropdown-menu">',
    ddItem('Kariyer Rotaları',  'kariyer.html',     'kariyer',     '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
    '      <div class="nav-dd-divider"></div>',
    ddItem('Retail Pozisyonlar','pozisyonlar.html', 'pozisyonlar', '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>'),
    ddItem('Yetkinlik Rehberi', 'yetkinlik.html',   'yetkinlik',   '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
    ddItem('Retail Blog',       'blog.html',        'blog',        '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    '    </div>',
    '  </div>',
    '  <div class="nav-dropdown">',
    '    <span class="' + (PAGE === 'isalim' ? 'nav-dropdown-trigger active' : 'nav-dropdown-trigger') + '">İşe Alım Rotası ' + CHEVRON + '</span>',
    '    <div class="nav-dropdown-menu">',
    ddItem('İşe Alım Rotaları', 'isalim-rotasi.html', 'isalim', '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    '    </div>',
    '  </div>',
    navLink('Hakkımızda', 'index.html#about', 'about'),
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
    '      <div class="login-modal-card" onclick="HT.go(\'aday.html#kayit\')">',
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
    /* Mobile menu */
    '<div class="mobile-menu" id="mobile-menu">',
    mobileLink('Adaylar İçin',    'aday.html',          'aday'),
    mobileLink('İşverenler İçin', 'isveren.html',       'isveren'),
    mobileLink('Kariyer Rotaları','kariyer.html',        'kariyer'),
    mobileLink('Retail Pozisyonlar','pozisyonlar.html',  null, 'mobile-nav-sub'),
    mobileLink('Yetkinlik Rehberi', 'yetkinlik.html',    null, 'mobile-nav-sub'),
    mobileLink('Retail Blog',       'blog.html',         null, 'mobile-nav-sub'),
    mobileLink('İşe Alım Rotaları', 'isalim-rotasi.html', 'isalim'),
    mobileLink('Hakkımızda',      'index.html#about',   'about'),
    '  <div class="mobile-nav-divider"></div>',
    '  <div class="mobile-cta-row">',
    '    <button class="mobile-cta-btn" style="background:white;color:var(--navy);border:1.5px solid var(--navy);" onclick="HT.go(\'aday.html#kayit\')">Aday Girişi</button>',
    '    <button class="mobile-cta-btn" style="background:var(--verm);color:white;" onclick="HT.go(\'giris.html?tab=ik\')">İK Girişi</button>',
    '  </div>',
    '</div>',
  ].join('\n');

  /* ── FOOTER HTML ── */
  var FOOTER_HTML = [
    '<footer class="site-footer">',
    '  <div class="footer-inner">',
    '    <div>',
    '      <div class="footer-brand">hello<span>talent</span></div>',
    '      <div class="footer-tagline">Türkiye\'nin retail talent marketplace\'i.<br>Doğru yetenek, doğru marka.</div>',
    '      <div class="footer-social">',
    '        <a class="social-link" href="https://www.instagram.com/hellotalent.ai?igsh=MTIwMXNnY3B4YnVncg%3D%3D&utm_source=qr" target="_blank" rel="noopener" title="Instagram">',
    '          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>',
    '        </a>',
    '        <a class="social-link" href="https://www.linkedin.com/company/hello-talentai/" target="_blank" rel="noopener" title="LinkedIn">',
    '          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    '        </a>',
    '      </div>',
    '    </div>',
    '    <div>',
    '      <div class="footer-col-title">Platform</div>',
    '      <a class="footer-link" href="aday.html">Adaylar İçin</a>',
    '      <a class="footer-link" href="isveren.html">İşverenler İçin</a>',
    '      <a class="footer-link" href="giris.html?tab=aday">Profil Oluştur</a>',
    '      <a class="footer-link" href="giris.html?tab=ik">İK Kaydı</a>',
    '    </div>',
    '    <div>',
    '      <div class="footer-col-title">Rotalar</div>',
    '      <a class="footer-link" href="kariyer.html">Kariyer Rotaları</a>',
    '      <a class="footer-link" href="isalim-rotasi.html">İşe Alım Rotası</a>',
    '      <a class="footer-link" href="pozisyonlar.html">Retail Pozisyonlar</a>',
    '      <a class="footer-link" href="yetkinlik.html">Yetkinlik Rehberi</a>',
    '      <a class="footer-link" href="blog.html">Retail Blog</a>',
    '    </div>',
    '    <div class="footer-col">',
    '      <div class="footer-col-title">Şirket</div>',
    '      <a class="footer-link" href="index.html#about">Hakkımızda</a>',
    '      <a class="footer-link" href="iletisim.html">İletişim</a>',
    '      <a class="footer-link" href="gizlilik.html">Gizlilik Politikası</a>',
    '      <a class="footer-link" href="kullanim-sartlari.html">Kullanım Şartları</a>',
    '    </div>',
    '  </div>',
    '  <div class="footer-bottom">',
    '    <span class="footer-copyright">© 2025 hellotalent.ai — Tüm hakları saklıdır.</span>',
    '    <div class="footer-legal">',
    '      <a href="kvkk.html">KVKK Aydınlatma</a>',
    '      <a href="cerez-politikasi.html">Çerez Politikası</a>',
    '      <a href="gizlilik.html">Gizlilik</a>',
    '    </div>',
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

    toggleLogin: function () {
      var overlay = document.getElementById('login-modal-overlay');
      var btn = document.getElementById('login-btn');
      if (!overlay) return;
      var open = overlay.classList.toggle('open');
      if (btn) btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    },

    toggleMenu: function () {
      var menu = document.getElementById('mobile-menu');
      var ham = document.getElementById('hamburger');
      if (!menu) return;
      var open = menu.classList.toggle('open');
      if (ham) { ham.classList.toggle('open', open); ham.setAttribute('aria-expanded', String(open)); }
      document.body.style.overflow = open ? 'hidden' : '';
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
