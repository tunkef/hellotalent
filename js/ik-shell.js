/* global supabase, HT */
/* ════════════════════════════════════════════════════════════════
   IK Shell — Asama 86 Sprint A
   Auth gate + segment active state + avatar dropdown + mobile drawer.
   IK sayfalarinin hepsi (ik.html, hr-pipeline.html, ...) bunu yukler.
   SOLID: tek sorumluluk = shell behavior. Data adapter Sprint B'de.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ Storage keys ═══════ */
  var LS_PREFS = 'ht_ik_prefs_v1';
  var LS_ACTIVE_POSITION = 'ht_ik_active_position_id';

  /* ═══════ Page → segment map ═══════ */
  var PAGE_TO_SEGMENT = {
    'ik.html': 'anasayfa',
    'hr-pipeline.html': 'adaylar',
    'hr-pool.html': 'adaylar',
    'hr-candidate.html': 'adaylar',
    'hr-messages.html': 'mesajlar',
    'hr-company.html': null,
    'hr-team.html': null,
    'hr-campaigns.html': null,
    'hr-settings.html': null
  };

  var PAGE_TO_SUBNAV = {
    'hr-pipeline.html': 'pipeline',
    'hr-pool.html': 'havuz',
    'hr-candidate.html': 'aday'
  };

  /* ═══════ Helpers ═══════ */
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function getCurrentPage() {
    var path = location.pathname.split('/').pop() || 'ik.html';
    return path;
  }
  function readPrefs() {
    try {
      var raw = localStorage.getItem(LS_PREFS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function writePrefs(prefs) {
    try {
      localStorage.setItem(LS_PREFS, JSON.stringify(prefs || {}));
    } catch (e) {
      console.warn('[ik-shell] prefs write fail:', e && e.message);
    }
  }

  /* ═══════ Auth gate ═══════ */
  async function authGate() {
    if (!window.HT || typeof window.HT.getSupa !== 'function') {
      /* Demo mode: shared.js yok, gate atla */
      return { user: null, hr: null, demo: true };
    }
    var supa = window.HT.getSupa();
    if (!supa) {
      return { user: null, hr: null, demo: true };
    }

    var sessionRes = await supa.auth.getSession();
    var user = sessionRes && sessionRes.data && sessionRes.data.session
      ? sessionRes.data.session.user
      : null;

    if (!user) {
      /* Demo mode: localStorage'da demo flag varsa redirect atla */
      var demoFlag = localStorage.getItem('ht_ik_demo_mode');
      if (demoFlag === '1') {
        return { user: null, hr: null, demo: true };
      }
      var rt = encodeURIComponent(location.pathname);
      location.replace('giris.html?return=' + rt);
      return null;
    }

    /* Role check: user_metadata.role === 'employer' */
    var role = user.user_metadata && user.user_metadata.role;
    if (role && role !== 'employer') {
      location.replace('profil.html');
      return null;
    }

    /* Onboarding completed kontrol */
    try {
      var profRes = await supa.from('hr_profiles')
        .select('id, onboarding_completed, full_name, company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profRes.error && profRes.data && profRes.data.onboarding_completed === false) {
        location.replace('isveren-onboarding.html');
        return null;
      }

      return { user: user, hr: profRes.data || null, demo: false };
    } catch (e) {
      console.warn('[ik-shell] hr_profiles fetch:', e && e.message);
      return { user: user, hr: null, demo: false };
    }
  }

  /* ═══════ Segment active state ═══════ */
  function applySegmentState() {
    var page = getCurrentPage();
    var segment = PAGE_TO_SEGMENT[page];
    var subNav = PAGE_TO_SUBNAV[page];

    if (segment) {
      $$('.lp-hdr-ik__segment').forEach(function (el) {
        var s = el.getAttribute('data-segment');
        if (s === segment) {
          el.classList.add('is-active');
          el.setAttribute('aria-current', 'page');
        } else {
          el.classList.remove('is-active');
          el.removeAttribute('aria-current');
        }
      });
    }

    /* Sub-nav (Adaylar segment) */
    var subnavEl = $('#ik-subnav');
    if (subnavEl) {
      if (segment === 'adaylar') {
        subnavEl.classList.add('is-visible');
        document.body.classList.add('has-ik-subnav');
        $$('.ik-subnav__item', subnavEl).forEach(function (el) {
          var t = el.getAttribute('data-subnav');
          if (t === subNav) {
            el.classList.add('is-active');
            el.setAttribute('aria-current', 'page');
          } else {
            el.classList.remove('is-active');
            el.removeAttribute('aria-current');
          }
        });
      } else {
        subnavEl.classList.remove('is-visible');
        document.body.classList.remove('has-ik-subnav');
      }
    }

    /* Bottom nav (mobile) */
    $$('.ik-bottom-nav__item').forEach(function (el) {
      var s = el.getAttribute('data-segment');
      if (s === segment) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });

    /* Mobile drawer link state */
    $$('.ik-mobile-drawer__link').forEach(function (el) {
      var href = el.getAttribute('href');
      if (href && href === page) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    });
  }

  /* ═══════ Avatar dropdown ═══════ */
  function bindAvatarDropdown() {
    var btn = $('#ik-avatar-btn');
    var dd = $('#ik-avatar-dropdown');
    if (!btn || !dd) return;

    function open() {
      dd.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      dd.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      if (dd.classList.contains('is-open')) close();
      else open();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    document.addEventListener('click', function (e) {
      if (!dd.classList.contains('is-open')) return;
      if (dd.contains(e.target) || btn.contains(e.target)) return;
      close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dd.classList.contains('is-open')) {
        close();
        btn.focus();
      }
    });

    /* Logout button */
    var logoutBtn = $('#ik-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function () {
        try {
          if (window.HT && typeof window.HT.getSupa === 'function') {
            var supa = window.HT.getSupa();
            if (supa) await supa.auth.signOut();
          }
        } catch (e) {
          console.warn('[ik-shell] signOut:', e && e.message);
        }
        try {
          localStorage.removeItem(LS_PREFS);
          localStorage.removeItem(LS_ACTIVE_POSITION);
        } catch (e) { /* ignore */ }
        location.replace('giris.html');
      });
    }
  }

  /* ═══════ Mobile drawer + bottom nav ═══════ */
  function bindMobileDrawer() {
    var hamburger = $('#ik-hamburger');
    var overlay = $('#ik-mobile-overlay');
    var drawer = $('#ik-mobile-drawer');
    var closeBtn = $('#ik-mobile-drawer-close');
    if (!hamburger || !overlay || !drawer) return;

    function open() {
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
      document.body.classList.add('ht-scroll-lock');
      hamburger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      overlay.classList.remove('is-open');
      drawer.classList.remove('is-open');
      document.body.classList.remove('ht-scroll-lock');
      hamburger.setAttribute('aria-expanded', 'false');
    }

    hamburger.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
  }

  /* ═══════ Hydrate user info (avatar + dropdown header) ═══════ */
  function hydrateUserInfo(ctx) {
    var name = '';
    var initial = '?';
    var role = 'Kurumsal';

    if (ctx && ctx.hr && ctx.hr.full_name) {
      name = ctx.hr.full_name;
      initial = name.charAt(0).toUpperCase();
    } else if (ctx && ctx.user && ctx.user.email) {
      name = ctx.user.email.split('@')[0];
      initial = name.charAt(0).toUpperCase();
    } else if (ctx && ctx.demo) {
      name = 'Demo Hesap';
      initial = 'D';
      role = 'Demo';
    }

    var avatarBtn = $('#ik-avatar-btn');
    if (avatarBtn) {
      avatarBtn.textContent = initial;
      avatarBtn.setAttribute('aria-label', name + ' menüsü');
    }

    var ddName = $('#ik-dropdown-name');
    if (ddName) ddName.textContent = name || 'Hesap';

    var ddAvatar = $('#ik-dropdown-avatar');
    if (ddAvatar) ddAvatar.textContent = initial;

    var ddRole = $('#ik-dropdown-role');
    if (ddRole) ddRole.textContent = role;
  }

  /* ═══════ Public API ═══════ */
  window.IK_SHELL = {
    init: async function () {
      var ctx = await authGate();
      if (!ctx) return null;

      applySegmentState();
      bindAvatarDropdown();
      bindMobileDrawer();
      hydrateUserInfo(ctx);

      window.IK_SHELL.ctx = ctx;
      document.documentElement.setAttribute('data-ik-shell-ready', '1');
      return ctx;
    },
    ctx: null,
    /* Storage helpers shared across IK sayfalari */
    getActivePositionId: function () {
      try { return localStorage.getItem(LS_ACTIVE_POSITION) || null; }
      catch (e) { return null; }
    },
    setActivePositionId: function (id) {
      try {
        if (id) localStorage.setItem(LS_ACTIVE_POSITION, id);
        else localStorage.removeItem(LS_ACTIVE_POSITION);
      } catch (e) { /* ignore */ }
    },
    getPrefs: readPrefs,
    setPrefs: writePrefs
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.IK_SHELL.init();
    });
  } else {
    window.IK_SHELL.init();
  }
})();
