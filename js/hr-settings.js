/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Settings (FAZ B Sprint 6)
   - Tema seçici (light / dark / system)
   - Bildirim tercihleri (3 toggle, demo persist)
   - Güvenlik bölümü (MVP 2 disabled)
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  var THEME_KEY = 'ht_theme_preference';
  var STATE_KEY = 'ht_hr_settings_demo_state';

  var $form, $themeRadios;
  var $tMsg, $tPipeline, $tWeekly;
  var $btnSave, $btnReset;
  var $toast;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function readState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function writeState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.textContent = msg;
    $toast.setAttribute('data-type', type || 'info');
    $toast.setAttribute('data-show', 'true');
    setTimeout(function () { $toast.setAttribute('data-show', 'false'); }, 2400);
  }

  function readThemePref() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) { return 'system'; }
  }
  function writeThemePref(v) {
    try {
      if (v === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, v);
    } catch (e) {}
  }

  function applyTheme(v) {
    var dark;
    if (v === 'dark') dark = true;
    else if (v === 'light') dark = false;
    else {
      dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }

  function loadFromState() {
    var pref = readThemePref();
    if ($themeRadios) {
      $themeRadios.forEach(function (r) { r.checked = (r.value === pref); });
    }

    var s = readState();
    if (s) {
      if ($tMsg) $tMsg.checked = !!s.notify_msg;
      if ($tPipeline) $tPipeline.checked = !!s.notify_pipeline;
      if ($tWeekly) $tWeekly.checked = !!s.notify_weekly;
    }
  }

  function captureAndSave(e) {
    if (e) e.preventDefault();
    var pref = 'system';
    if ($themeRadios) {
      var sel = $themeRadios.find(function (r) { return r.checked; });
      if (sel) pref = sel.value;
    }
    writeThemePref(pref);
    applyTheme(pref);

    var state = {
      theme: pref,
      notify_msg: $tMsg ? $tMsg.checked : false,
      notify_pipeline: $tPipeline ? $tPipeline.checked : false,
      notify_weekly: $tWeekly ? $tWeekly.checked : false,
      saved_at: new Date().toISOString()
    };
    writeState(state);
    showToast('Tercihleriniz kaydedildi', 'success');
  }

  function bindEvents() {
    if ($form) $form.addEventListener('submit', captureAndSave);
    if ($btnSave) $btnSave.addEventListener('click', captureAndSave);
    if ($btnReset) {
      $btnReset.addEventListener('click', function () {
        loadFromState();
      });
    }
    // Tema canlı önizleme
    if ($themeRadios) {
      $themeRadios.forEach(function (r) {
        r.addEventListener('change', function () {
          applyTheme(r.value);
        });
      });
    }
  }

  async function renderPositionSwitcher() {
    var btn = $('[data-hr-position-btn]');
    var menu = $('[data-hr-position-menu]');
    if (!btn || !menu) return;
    var loadingEl = $('[data-hr-position-loading]', menu);
    var posRes = await window.HRData.getPositions();
    if (loadingEl) loadingEl.remove();
    var positions = (posRes && posRes.data) || [];
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    function addOpt(label, value) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'hr-position-menu__opt';
      opt.setAttribute('role', 'option');
      opt.textContent = label;
      var active = window.HRShell.getActivePosition();
      var isActive = (!value && !active) || (active && String(active.id) === String(value));
      if (isActive) opt.setAttribute('aria-selected', 'true');
      opt.addEventListener('click', function () {
        if (!value) window.HRShell.setActivePosition(null);
        else {
          var p = positions.find(function (x) { return String(x.id) === String(value); });
          if (p) window.HRShell.setActivePosition({ id: p.id, title: p.title });
        }
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        renderPositionSwitcher();
      });
      menu.appendChild(opt);
    }
    addOpt('Tüm pozisyonlar', null);
    positions.forEach(function (p) { addOpt(p.title || ('Pozisyon #' + p.id), p.id); });

    btn.onclick = function (e) {
      e.stopPropagation();
      var isOpen = menu.getAttribute('data-open') === 'true';
      menu.setAttribute('data-open', isOpen ? 'false' : 'true');
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    };
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function cacheDom() {
    $form = $('[data-hr-set-form]');
    $themeRadios = $$('[data-hr-set-theme]');
    $tMsg = $('[data-hr-set-notify-msg]');
    $tPipeline = $('[data-hr-set-notify-pipeline]');
    $tWeekly = $('[data-hr-set-notify-weekly]');
    $btnSave = $('[data-hr-set-save]');
    $btnReset = $('[data-hr-set-reset]');
    $toast = $('[data-hr-toast]');
  }

  async function init() {
    cacheDom();
    if (!window.HRShell) return;
    await window.HRShell.ready();
    try { await renderPositionSwitcher(); } catch (e) {}
    loadFromState();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
