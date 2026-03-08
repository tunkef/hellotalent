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
    navLink('Hakkımızda', 'index.html#about', 'about'),
    '  </nav>',
    '  <div class="header-actions">',
    '    <button class="btn-nav-login" id="login-btn" onclick="HT.toggleLogin()" aria-expanded="false" aria-haspopup="true">',
    '      Giriş Yap',
    '      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
    '    </button>',
    '    <div class="login-dropdown" id="login-dropdown">',
    '      <div class="ld-block">',
    '        <div class="ld-label">Adaylar İçin</div>',
    '        <div class="ld-desc">Kariyer hedefini paylaş, doğru markalar seni bulsun.</div>',
    '        <div class="ld-btns">',
    '          <button class="ld-btn-outline" onclick="HT.go(\'giris.html?tab=aday\')">Giriş Yap</button>',
    '          <button class="ld-btn-fill" onclick="HT.go(\'giris.html?tab=aday&mode=register\')">Üye Ol</button>',
    '        </div>',
    '      </div>',
    '      <div class="ld-block">',
    '        <div class="ld-label">İşverenler İçin</div>',
    '        <div class="ld-desc">Retail aday havuzuna eriş, doğru profilleri bul.</div>',
    '        <div class="ld-btns">',
    '          <button class="ld-btn-outline" onclick="HT.go(\'giris.html?tab=ik\')">Giriş Yap</button>',
    '          <button class="ld-btn-fill navy" onclick="HT.go(\'giris.html?tab=ik&mode=register\')">Üye Ol</button>',
    '        </div>',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <button class="hamburger" id="hamburger" onclick="HT.toggleMenu()" aria-label="Menü" aria-expanded="false">',
    '    <span></span><span></span><span></span>',
    '  </button>',
    '</header>',
    /* Mobile menu */
    '<div class="mobile-menu" id="mobile-menu">',
    mobileLink('Adaylar İçin',    'aday.html',          'aday'),
    mobileLink('İşverenler İçin', 'isveren.html',       'isveren'),
    mobileLink('Kariyer Rotaları','kariyer.html',        'kariyer'),
    mobileLink('Retail Pozisyonlar','pozisyonlar.html',  null, 'mobile-nav-sub'),
    mobileLink('Yetkinlik Rehberi', 'yetkinlik.html',    null, 'mobile-nav-sub'),
    mobileLink('Retail Blog',       'blog.html',         null, 'mobile-nav-sub'),
    mobileLink('Hakkımızda',      'index.html#about',   'about'),
    '  <div class="mobile-nav-divider"></div>',
    '  <div class="mobile-cta-row">',
    '    <button class="mobile-cta-btn" style="background:white;color:var(--navy);border:1.5px solid var(--navy);" onclick="HT.go(\'giris.html?tab=aday\')">Aday Girişi</button>',
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
    '      <div class="footer-col-title">Kariyer</div>',
    '      <a class="footer-link" href="kariyer.html">Kariyer Rotaları</a>',
    '      <a class="footer-link" href="pozisyonlar.html">Retail Pozisyonlar</a>',
    '      <a class="footer-link" href="yetkinlik.html">Yetkinlik Rehberi</a>',
    '      <a class="footer-link" href="blog.html">Retail Blog</a>',
    '    </div>',
    '    <div>',
    '      <div class="footer-col-title">Şirket</div>',
    '      <a class="footer-link" href="index.html#about">Hakkımızda</a>',
    '      <a class="footer-link" href="mailto:hello@hellotalent.ai">İletişim</a>',
    '      <a class="footer-link" href="#">Gizlilik Politikası</a>',
    '      <a class="footer-link" href="#">Kullanım Şartları</a>',
    '    </div>',
    '  </div>',
    '  <div class="footer-bottom">',
    '    <span class="footer-copyright">© 2025 hellotalent.ai — Tüm hakları saklıdır.</span>',
    '    <div class="footer-legal">',
    '      <a href="#">KVKK Aydınlatma</a>',
    '      <a href="#">Gizlilik</a>',
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
    /* Login dropdown — dışarı tıklayınca kapat */
    document.addEventListener('click', function (e) {
      var dd = document.getElementById('login-dropdown');
      var btn = document.getElementById('login-btn');
      if (dd && dd.classList.contains('open')) {
        if (!dd.contains(e.target) && btn && !btn.contains(e.target)) {
          dd.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  /* ── PUBLIC API ── */
  window.HT = {
    go: function (url) { window.location.href = url; },

    toggleLogin: function () {
      var dd = document.getElementById('login-dropdown');
      var btn = document.getElementById('login-btn');
      if (!dd) return;
      var open = dd.classList.toggle('open');
      if (btn) btn.setAttribute('aria-expanded', String(open));
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
