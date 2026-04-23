/* ═══════════════════════════════════════════════════════════════════════
   K067 Faz B + C — Ayarlar panel interactions
   TF6 revize (23 Nisan 2026): scroll-spy → section tab switcher.
   - Section'lar artik bir anda sadece biri gorunur (TOC tab click)
   - URL hash senkronizasyonu (deep link support)
   - aria-current="page" + aria-hidden="true" a11y
   - Theme tri-state segment (System / Light / Dark) devam ediyor
   ═══════════════════════════════════════════════════════════════════════ */
/* global setThemePreference */
(function() {
  'use strict';

  var THEME_STORAGE_KEY = 'ht_theme_preference';

  // ── Wait for panel DOM ──
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  // ──────────────────────────────────────────────────────────────
  // TF6: Section tab switcher (scroll-spy yerine)
  // TOC tab click → sadece o section gorunur, digerleri aria-hidden.
  // ──────────────────────────────────────────────────────────────
  function initSectionTabs() {
    var panel = document.getElementById('panel-ayarlar');
    if (!panel) return;
    var tabs = Array.prototype.slice.call(panel.querySelectorAll('.ayr-toc__tab'));
    var sections = Array.prototype.slice.call(panel.querySelectorAll('.ayr-section'));
    if (!tabs.length || !sections.length) return;

    function activate(targetId) {
      sections.forEach(function(s) {
        if (s.id === targetId) {
          s.setAttribute('aria-hidden', 'false');
          s.removeAttribute('hidden');
        } else {
          s.setAttribute('aria-hidden', 'true');
          s.setAttribute('hidden', '');
        }
      });
      tabs.forEach(function(t) {
        var hid = (t.getAttribute('href') || '').replace('#', '');
        if (hid === targetId) {
          t.classList.add('is-active');
          t.setAttribute('aria-current', 'page');
        } else {
          t.classList.remove('is-active');
          t.removeAttribute('aria-current');
        }
      });
      // Panel basinda scroll'u sifirla — tab degistikce kullanici ustten baslasin
      var panelTop = panel.getBoundingClientRect().top + window.pageYOffset - 12;
      if (window.pageYOffset > panelTop) {
        window.scrollTo({ top: panelTop, behavior: 'smooth' });
      }
    }

    tabs.forEach(function(tab) {
      // Anchor → button semantic pivot (click + keyboard)
      tab.addEventListener('click', function(e) {
        var href = tab.getAttribute('href') || '';
        var id = href.replace('#', '');
        if (!id || !document.getElementById(id)) return;
        e.preventDefault();
        activate(id);
        try { history.replaceState(null, '', '#' + id); } catch (_) {}
      });
      tab.addEventListener('keydown', function(e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var idx = tabs.indexOf(tab);
        var next = e.key === 'ArrowRight' ? (idx + 1) % tabs.length : (idx - 1 + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });

    // TOC accessibility: role="tablist" semantic hint
    var toc = panel.querySelector('.ayr-toc');
    if (toc) toc.setAttribute('role', 'tablist');
    tabs.forEach(function(t) {
      t.setAttribute('role', 'tab');
    });

    // Initial section selection: URL hash → fallback ilk tab
    var initial = (window.location.hash || '').replace('#', '');
    if (initial && document.getElementById(initial) && panel.querySelector('#' + initial + '.ayr-section')) {
      activate(initial);
    } else {
      var firstHref = (tabs[0].getAttribute('href') || '').replace('#', '');
      if (firstHref) activate(firstHref);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // FAZ C: Theme tri-state segment
  // ──────────────────────────────────────────────────────────────
  function readThemePref() {
    try {
      var v = localStorage.getItem(THEME_STORAGE_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch (e) {}
    return 'system';
  }

  function syncThemeSeg() {
    var pref = readThemePref();
    var opts = document.querySelectorAll('.ayr-theme-seg__opt');
    opts.forEach(function(opt) {
      var match = opt.getAttribute('data-theme-pref') === pref;
      if (match) opt.classList.add('is-active');
      else opt.classList.remove('is-active');
      opt.setAttribute('aria-checked', match ? 'true' : 'false');
    });
  }

  function initThemeSegment() {
    var opts = document.querySelectorAll('.ayr-theme-seg__opt');
    if (!opts.length) return;

    opts.forEach(function(opt) {
      opt.addEventListener('click', function() {
        var pref = opt.getAttribute('data-theme-pref') || 'system';
        if (typeof setThemePreference === 'function') {
          setThemePreference(pref);
        }
        syncThemeSeg();
        if (typeof window.syncThemeToggleButtons === 'function') {
          window.syncThemeToggleButtons();
        }
      });
    });

    syncThemeSeg();

    // Keep segment in sync when external theme toggle flips
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq && typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', syncThemeSeg);
      }
    }
    window.addEventListener('storage', function(e) {
      if (e && e.key === THEME_STORAGE_KEY) syncThemeSeg();
    });
  }

  onReady(function() {
    initSectionTabs();
    initThemeSegment();
  });
})();
