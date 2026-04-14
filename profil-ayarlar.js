/* ═══════════════════════════════════════════════════════════════════════
   K067 Faz B + C — Ayarlar panel interactions
   Faz B: TOC scroll-spy (IntersectionObserver)
   Faz C: Theme tri-state segment (System / Light / Dark)
   Reads/writes ht_theme_preference via setThemePreference() from profil-core.
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
  // FAZ B: TOC scroll-spy
  // ──────────────────────────────────────────────────────────────
  function initScrollSpy() {
    var panel = document.getElementById('panel-ayarlar');
    if (!panel) return;
    var tabs = panel.querySelectorAll('.ayr-toc__tab');
    if (!tabs.length) return;

    var sections = [];
    tabs.forEach(function(tab) {
      var href = tab.getAttribute('href') || '';
      var id = href.replace('#', '');
      var sec = document.getElementById(id);
      if (sec) sections.push({ id: id, el: sec, tab: tab });
    });
    if (!sections.length) return;

    function setActive(id) {
      tabs.forEach(function(t) {
        var hid = (t.getAttribute('href') || '').replace('#', '');
        if (hid === id) t.classList.add('is-active');
        else t.classList.remove('is-active');
      });
    }

    if (!('IntersectionObserver' in window)) {
      setActive(sections[0].id);
      return;
    }

    var visible = {};
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var id = entry.target.id;
        if (entry.isIntersecting) {
          visible[id] = entry.intersectionRatio;
        } else {
          delete visible[id];
        }
      });
      var best = null;
      var bestRatio = -1;
      Object.keys(visible).forEach(function(k) {
        if (visible[k] > bestRatio) {
          bestRatio = visible[k];
          best = k;
        }
      });
      if (best) setActive(best);
    }, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0, 0.1, 0.25, 0.5]
    });

    sections.forEach(function(s) { observer.observe(s.el); });

    // Smooth scroll on tab click (hash nav jump-free)
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function(e) {
        var href = tab.getAttribute('href') || '';
        var id = href.replace('#', '');
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActive(id);
        }
      });
    });

    setActive(sections[0].id);
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
    initScrollSpy();
    initThemeSegment();
  });
})();
