/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Hub Shell JS (Sprint 0 / FAZ B)
   Sorumluluklar:
   1. Auth gate — Supabase getSession + role=employer kontrolu
   2. Onboarding gate — hr_profiles.onboarding_completed=false ise
      isveren-onboarding.html'e resume yonlendirme
   3. Position switcher state (sessionStorage)
   4. Subnav active highlight (data-hr-page)
   5. User menu dropdown (open/close + outside click + ESC)
   6. Logout
   7. Theme toggle hook (light/dark)

   Her hr-*.html sayfasi bu dosyayi <script defer src="js/hr-shell.js"> ile yukler.
   Sayfa-spesifik logic kendi js/hr-*.js dosyasinda kalir.

   Global API: window.HRShell.{ ready, getUser, getProfile, getActivePosition,
                                setActivePosition, signOut, refreshSubnav }
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── Constants ───────────────────────────────── */
  var ACTIVE_POSITION_KEY = 'ht_hr_active_position_id';
  var GIRIS_URL = 'giris.html?tab=ik';
  var ONBOARDING_URL = 'isveren-onboarding.html';

  /* Page registry — data-hr-page attribute → URL map */
  var PANEL_REGISTRY = [
    { key: 'hub',         href: 'ik.html',           label: 'Genel Bakış' },
    { key: 'pipeline',    href: 'hr-pipeline.html',  label: 'Pipeline' },
    { key: 'pool',        href: 'hr-pool.html',      label: 'Havuz' },
    { key: 'messages',    href: 'hr-messages.html',  label: 'Mesajlar' },
    { key: 'candidate',   href: 'hr-candidate.html', label: 'Adaylar' },
    { key: 'campaigns',   href: 'hr-campaigns.html', label: 'Kampanyalar' },
    { key: 'company',     href: 'hr-company.html',   label: 'Şirket' },
    { key: 'team',        href: 'hr-team.html',      label: 'Ekip' },
    { key: 'settings',    href: 'hr-settings.html',  label: 'Ayarlar' }
  ];

  /* ── State ───────────────────────────────────── */
  var _user = null;
  var _profile = null;
  var _supa = null;
  var _readyResolvers = [];
  var _readyPromise = new Promise(function (resolve) {
    _readyResolvers.push(resolve);
  });

  /* ── Supabase getter (HT.getSupa from shared.js) ── */
  function getSupa() {
    if (_supa) return _supa;
    if (window.HT && typeof window.HT.getSupa === 'function') {
      _supa = window.HT.getSupa();
      return _supa;
    }
    // Fallback: direct create (shared.js bekleniyor olabilir)
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      _supa = window.supabase.createClient(
        'https://cpwibefquojehjehtrog.supabase.co',
        'sb_publishable_POUtNwJyjAAheukwYP5hmA_TKKjphwa'
      );
      return _supa;
    }
    return null;
  }

  /* ── Auth + onboarding gate ───────────────────── */
  async function authGate() {
    var supa = getSupa();
    if (!supa) {
      console.warn('[HRShell] Supabase yuklenmedi, auth gate atlandi');
      return false;
    }
    var sessionRes = await supa.auth.getSession();
    var session = sessionRes && sessionRes.data && sessionRes.data.session;
    if (!session || !session.user) {
      // Oturum yok → giris.html'e yonlendir, geri donus url'i sakla
      try { sessionStorage.setItem('ht_hr_return_url', window.location.pathname + window.location.search); } catch (e) {}
      window.location.replace(GIRIS_URL);
      return false;
    }
    var role = session.user.app_metadata && session.user.app_metadata.role;
    if (role !== 'employer') {
      // Aday hesabi → kendi sayfasina yonlendir
      console.warn('[HRShell] Bu sayfa kurumsal hesaba ozeldir, aday hesabi /profil.html\'e yonlendiriliyor');
      window.location.replace('profil.html');
      return false;
    }
    _user = session.user;

    // Onboarding kontrolu
    try {
      var stRes = await supa.rpc('get_onboarding_state');
      var st = stRes && stRes.data;
      if (st && st.onboarding_completed === false) {
        // Hala wizard'da → resume
        window.location.replace(ONBOARDING_URL);
        return false;
      }
    } catch (e) {
      // RPC hatasi durumunda kati gate kapatma — log ve devam (defensive)
      console.warn('[HRShell] get_onboarding_state hata:', e && e.message);
    }

    // Profil oku (display name vs)
    try {
      var profRes = await supa
        .from('hr_profiles')
        .select('id, ad, soyad, email, sirket, company_id, employer_role, onboarding_completed')
        .eq('id', _user.id)
        .maybeSingle();
      if (profRes && profRes.data) _profile = profRes.data;
    } catch (e) {
      console.warn('[HRShell] hr_profiles okuma hata:', e && e.message);
    }

    return true;
  }

  /* ── Subnav active highlight ──────────────────── */
  function highlightSubnav() {
    var page = document.body && document.body.getAttribute('data-hr-page');
    if (!page) return;
    var links = document.querySelectorAll('.hr-subnav-link');
    for (var i = 0; i < links.length; i++) {
      var key = links[i].getAttribute('data-hr-link');
      if (key === page) {
        links[i].setAttribute('aria-current', 'page');
      } else {
        links[i].removeAttribute('aria-current');
      }
    }
  }

  /* ── User menu dropdown ───────────────────────── */
  function bindUserMenu() {
    var btn = document.querySelector('[data-hr-user-menu-btn]');
    var menu = document.querySelector('[data-hr-user-menu]');
    if (!btn || !menu) return;

    function close() {
      menu.setAttribute('data-open', 'false');
      btn.setAttribute('aria-expanded', 'false');
    }
    function open() {
      menu.setAttribute('data-open', 'true');
      btn.setAttribute('aria-expanded', 'true');
    }
    function toggle(e) {
      e.stopPropagation();
      var isOpen = menu.getAttribute('data-open') === 'true';
      if (isOpen) close(); else open();
    }
    btn.addEventListener('click', toggle);
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    // Logout button
    var logoutBtn = menu.querySelector('[data-hr-logout]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        signOut();
      });
    }
  }

  /* ── User menu populate ───────────────────────── */
  function populateUserMenu() {
    if (!_user) return;
    var avatarEl = document.querySelector('[data-hr-user-avatar]');
    var nameEl = document.querySelector('[data-hr-user-name]');
    var fullNameEl = document.querySelector('[data-hr-user-fullname]');
    var emailEl = document.querySelector('[data-hr-user-email]');

    var first = (_profile && _profile.ad) || '';
    var last = (_profile && _profile.soyad) || '';
    var email = (_profile && _profile.email) || (_user && _user.email) || '';
    var displayName = (first || last) ? (first + ' ' + last).trim() : (email ? email.split('@')[0] : 'Kullanıcı');
    var initial = (first || email || 'K').charAt(0).toUpperCase();

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = displayName;
    if (fullNameEl) fullNameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
  }

  /* ── Position switcher ────────────────────────── */
  function getActivePosition() {
    try {
      var raw = sessionStorage.getItem(ACTIVE_POSITION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function setActivePosition(pos) {
    try {
      if (pos) sessionStorage.setItem(ACTIVE_POSITION_KEY, JSON.stringify(pos));
      else sessionStorage.removeItem(ACTIVE_POSITION_KEY);
    } catch (e) {}
    refreshPositionSwitcher();
    // Notify panel-spesifik kod
    try {
      window.dispatchEvent(new CustomEvent('hr:position-changed', { detail: pos }));
    } catch (e) {}
  }
  function refreshPositionSwitcher() {
    var el = document.querySelector('[data-hr-position-value]');
    if (!el) return;
    var pos = getActivePosition();
    if (pos && pos.title) {
      el.textContent = pos.title;
    } else {
      el.textContent = 'Tüm pozisyonlar';
    }
  }

  /* ── Logout ───────────────────────────────────── */
  async function signOut() {
    var supa = getSupa();
    if (!supa) {
      window.location.href = GIRIS_URL;
      return;
    }
    try {
      await supa.auth.signOut();
    } catch (e) {
      console.warn('[HRShell] signOut hata:', e && e.message);
    }
    try {
      sessionStorage.removeItem(ACTIVE_POSITION_KEY);
      sessionStorage.removeItem('ht_hr_return_url');
    } catch (e) {}
    window.location.replace('giris.html');
  }

  /* ── Theme toggle hook (read from localStorage) ── */
  function applyTheme() {
    try {
      var pref = localStorage.getItem('ht_theme_preference');
      var dark = pref === 'dark' ||
        (pref !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      if (dark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch (e) {}
  }

  /* ── Public API ──────────────────────────────── */
  window.HRShell = {
    ready: function () { return _readyPromise; },
    getUser: function () { return _user; },
    getProfile: function () { return _profile; },
    getActivePosition: getActivePosition,
    setActivePosition: setActivePosition,
    signOut: signOut,
    refreshSubnav: highlightSubnav,
    getSupa: getSupa,
    PANEL_REGISTRY: PANEL_REGISTRY
  };

  /* ── Boot ────────────────────────────────────── */
  async function boot() {
    applyTheme();
    highlightSubnav();
    bindUserMenu();
    refreshPositionSwitcher();

    var ok = await authGate();
    if (!ok) return; // Redirect zaten basladi

    populateUserMenu();

    // Resolve ready promise
    for (var i = 0; i < _readyResolvers.length; i++) {
      try { _readyResolvers[i]({ user: _user, profile: _profile }); } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
