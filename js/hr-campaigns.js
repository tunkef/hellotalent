/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Campaigns panel (FAZ B Sprint 5)

   Sorumluluklar:
   - Kampanya liste (status filter chips + counts)
   - 6-step wizard modal: İsim → Kanal → Filtre → Mesaj → Zamanlama → Önizleme
   - Demo persist: localStorage ht_hr_campaigns_demo_drafts
   - "Yayınla" disabled (MVP 2 ile aktif)
   - Position-aware (active position varsa filtre default city/segment)
   - XSS guard: textContent + createElement only
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── Constants ───────────────────────────────────────────────── */
  var DRAFTS_KEY = 'ht_hr_campaigns_demo_drafts';
  var TOTAL_STEPS = 6;

  /* ── State ───────────────────────────────────────────────────── */
  var _all = [];
  var _filter = 'all';
  var _wizardStep = 1;
  var _wizardData = emptyWizardData();
  var _candidatesCache = null;

  function emptyWizardData() {
    return {
      title: '',
      channel: 'email',
      filters: { city: '', segment: '', position: '', minExp: 0 },
      subject: '',
      body: '',
      schedule: { mode: 'now', at: '' }
    };
  }

  /* ── DOM cache ───────────────────────────────────────────────── */
  var $list, $loading, $empty;
  var $filterBtns;
  var $countAll, $countDraft, $countScheduled, $countSent;
  var $btnNew;
  var $modal, $modalClose, $modalBackdrop;
  var $steps, $stepSections, $btnPrev, $btnNext, $btnSave, $btnPublish;
  var $inpTitle, $inpSubject, $inpBody;
  var $inpCity, $inpSegment, $inpPosition, $inpMinExp;
  var $inpSchedule;
  var $targetPreview;
  var $prevTitle, $prevChannel, $prevTarget, $prevMsg, $prevSchedule;
  var $toast;

  /* ── Utility ─────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var dd = String(d.getDate()).padStart(2, '0');
    var months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return dd + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.textContent = msg;
    $toast.setAttribute('data-type', type || 'info');
    $toast.setAttribute('data-show', 'true');
    setTimeout(function () { $toast.setAttribute('data-show', 'false'); }, 2400);
  }

  function readDrafts() {
    try {
      var raw = localStorage.getItem(DRAFTS_KEY);
      if (!raw) return [];
      var p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
  }
  function writeDrafts(rows) {
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(rows)); } catch (e) {}
  }

  function statusLabel(s) {
    var map = { draft: 'Taslak', scheduled: 'Zamanlanmış', sent: 'Gönderilmiş' };
    return map[s] || s;
  }

  function segmentLabel(s) {
    var map = { luks: 'Lüks', premium: 'Premium', 'high-street': 'High-street' };
    return map[s] || s || 'Tüm segmentler';
  }

  /* ── Render: list ────────────────────────────────────────────── */
  function renderList() {
    if (!$list) return;
    while ($list.firstChild) $list.removeChild($list.firstChild);

    var rows = _all;
    if (_filter !== 'all') {
      rows = rows.filter(function (c) { return c.status === _filter; });
    }

    if (rows.length === 0) {
      if ($empty) $empty.hidden = false;
      return;
    }
    if ($empty) $empty.hidden = true;

    rows.forEach(function (c) {
      var item = document.createElement('article');
      item.className = 'hr-cmp-item';
      item.setAttribute('data-status', c.status);

      var head = document.createElement('div');
      head.className = 'hr-cmp-item__head';

      var title = document.createElement('h3');
      title.className = 'hr-cmp-item__title';
      title.textContent = c.title;
      head.appendChild(title);

      var status = document.createElement('span');
      status.className = 'hr-cmp-item__status';
      status.setAttribute('data-status', c.status);
      status.textContent = statusLabel(c.status);
      head.appendChild(status);

      item.appendChild(head);

      var meta = document.createElement('div');
      meta.className = 'hr-cmp-item__meta';
      meta.textContent = c.filter_summary || '—';
      item.appendChild(meta);

      var stats = document.createElement('div');
      stats.className = 'hr-cmp-item__stats';
      stats.appendChild(stat('Hedef', String(c.target_count || 0)));
      stats.appendChild(stat('Gönderildi', String(c.sent_count || 0)));
      stats.appendChild(stat('Açıldı', String(c.opened_count || 0)));
      stats.appendChild(stat('Yanıt', String(c.replied_count || 0)));
      item.appendChild(stats);

      var foot = document.createElement('div');
      foot.className = 'hr-cmp-item__foot';
      var time = document.createElement('time');
      time.className = 'hr-cmp-item__time';
      time.dateTime = c.created_at || '';
      time.textContent = 'Oluşturuldu: ' + fmtDate(c.created_at);
      foot.appendChild(time);
      item.appendChild(foot);

      $list.appendChild(item);
    });
  }

  function stat(label, value) {
    var s = document.createElement('div');
    s.className = 'hr-cmp-item__stat';
    var v = document.createElement('span');
    v.className = 'hr-cmp-item__stat-value';
    v.textContent = value;
    var l = document.createElement('span');
    l.className = 'hr-cmp-item__stat-label';
    l.textContent = label;
    s.appendChild(v);
    s.appendChild(l);
    return s;
  }

  function renderCounts() {
    var counts = { all: _all.length, draft: 0, scheduled: 0, sent: 0 };
    _all.forEach(function (c) {
      if (counts[c.status] !== undefined) counts[c.status] += 1;
    });
    if ($countAll) $countAll.textContent = counts.all;
    if ($countDraft) $countDraft.textContent = counts.draft;
    if ($countScheduled) $countScheduled.textContent = counts.scheduled;
    if ($countSent) $countSent.textContent = counts.sent;
  }

  /* ── Wizard ──────────────────────────────────────────────────── */
  function openWizard() {
    _wizardStep = 1;
    _wizardData = emptyWizardData();
    // Active position'dan hint
    var ap = window.HRShell && window.HRShell.getActivePosition && window.HRShell.getActivePosition();
    if (ap) {
      if (ap.city) _wizardData.filters.city = ap.city;
      if (ap.segment) _wizardData.filters.segment = ap.segment;
    }

    populateInputs();
    showStep(1);
    if ($modal) {
      $modal.setAttribute('aria-hidden', 'false');
      $modal.setAttribute('data-open', 'true');
    }
    setTimeout(function () {
      if ($inpTitle) $inpTitle.focus();
    }, 50);
  }

  function closeWizard() {
    if ($modal) {
      $modal.setAttribute('aria-hidden', 'true');
      $modal.setAttribute('data-open', 'false');
    }
  }

  function populateInputs() {
    if ($inpTitle) $inpTitle.value = _wizardData.title;
    if ($inpSubject) $inpSubject.value = _wizardData.subject;
    if ($inpBody) $inpBody.value = _wizardData.body;
    if ($inpCity) $inpCity.value = _wizardData.filters.city;
    if ($inpSegment) $inpSegment.value = _wizardData.filters.segment;
    if ($inpPosition) $inpPosition.value = _wizardData.filters.position;
    if ($inpMinExp) $inpMinExp.value = _wizardData.filters.minExp || '';
    var ch = $$('input[name="hr-cmp-channel"]');
    ch.forEach(function (i) { i.checked = (i.value === _wizardData.channel); });
    var sch = $$('input[name="hr-cmp-schedule"]');
    sch.forEach(function (i) { i.checked = (i.value === _wizardData.schedule.mode); });
    if ($inpSchedule) {
      $inpSchedule.disabled = (_wizardData.schedule.mode !== 'later');
      $inpSchedule.value = _wizardData.schedule.at || '';
    }
  }

  function showStep(n) {
    _wizardStep = n;
    if ($stepSections) {
      $stepSections.forEach(function (sec) {
        var k = parseInt(sec.getAttribute('data-hr-cmp-step'), 10);
        sec.hidden = (k !== n);
      });
    }
    if ($steps) {
      var items = $$('[data-hr-cmp-step-ind]', $steps);
      items.forEach(function (it) {
        var k = parseInt(it.getAttribute('data-hr-cmp-step-ind'), 10);
        it.removeAttribute('aria-current');
        it.setAttribute('data-state', k < n ? 'done' : (k === n ? 'current' : 'pending'));
        if (k === n) it.setAttribute('aria-current', 'step');
      });
    }
    // Buttons
    if ($btnPrev) $btnPrev.hidden = (n === 1);
    if ($btnNext) $btnNext.hidden = (n === TOTAL_STEPS);
    if ($btnSave) $btnSave.hidden = (n !== TOTAL_STEPS);
    if ($btnPublish) $btnPublish.hidden = (n !== TOTAL_STEPS);

    if (n === 3) updateTargetPreview();
    if (n === TOTAL_STEPS) renderPreview();
  }

  function captureStep(n) {
    if (n === 1) {
      _wizardData.title = ($inpTitle && $inpTitle.value.trim()) || '';
    } else if (n === 2) {
      var ch = $$('input[name="hr-cmp-channel"]:checked');
      _wizardData.channel = (ch[0] && ch[0].value) || 'email';
    } else if (n === 3) {
      _wizardData.filters.city = ($inpCity && $inpCity.value) || '';
      _wizardData.filters.segment = ($inpSegment && $inpSegment.value) || '';
      _wizardData.filters.position = ($inpPosition && $inpPosition.value) || '';
      _wizardData.filters.minExp = parseInt(($inpMinExp && $inpMinExp.value) || '0', 10) || 0;
    } else if (n === 4) {
      _wizardData.subject = ($inpSubject && $inpSubject.value.trim()) || '';
      _wizardData.body = ($inpBody && $inpBody.value.trim()) || '';
    } else if (n === 5) {
      var sch = $$('input[name="hr-cmp-schedule"]:checked');
      _wizardData.schedule.mode = (sch[0] && sch[0].value) || 'now';
      _wizardData.schedule.at = ($inpSchedule && $inpSchedule.value) || '';
    }
  }

  function validateStep(n) {
    if (n === 1) {
      if (!_wizardData.title) {
        showToast('Kampanya adı zorunlu', 'warn');
        return false;
      }
    }
    if (n === 4) {
      if (!_wizardData.subject) {
        showToast('Konu zorunlu', 'warn');
        return false;
      }
      if (!_wizardData.body) {
        showToast('Mesaj gövdesi zorunlu', 'warn');
        return false;
      }
    }
    if (n === 5) {
      if (_wizardData.schedule.mode === 'later' && !_wizardData.schedule.at) {
        showToast('Tarih seçin', 'warn');
        return false;
      }
    }
    return true;
  }

  async function updateTargetPreview() {
    if (!$targetPreview) return;
    if (!_candidatesCache) {
      var res = await window.HRData.searchCandidates({ filters: {}, page: 1, pageSize: 1000 });
      _candidatesCache = (res && res.data && res.data.rows) || [];
    }
    var f = _wizardData.filters;
    var matched = _candidatesCache.filter(function (c) {
      if (f.city && c.sehir !== f.city) return false;
      if (f.segment && c.segment !== f.segment) return false;
      if (f.position && c.pozisyon !== f.position) return false;
      if (f.minExp && (c.deneyim_yil || 0) < f.minExp) return false;
      return true;
    });
    var anyFilter = (f.city || f.segment || f.position || f.minExp);
    if (!anyFilter) {
      $targetPreview.textContent = 'Filtre uygulanmadı — tüm havuz (' + _candidatesCache.length + ' aday)';
    } else {
      $targetPreview.textContent = 'Filtreyle eşleşen aday: ' + matched.length;
    }
    $targetPreview.setAttribute('data-count', matched.length);
  }

  function renderPreview() {
    if ($prevTitle) $prevTitle.textContent = _wizardData.title || '—';
    if ($prevChannel) $prevChannel.textContent = _wizardData.channel === 'email' ? 'E-posta' : 'SMS';
    if ($prevTarget) {
      var f = _wizardData.filters;
      var parts = [];
      if (f.city) parts.push(f.city);
      if (f.segment) parts.push(segmentLabel(f.segment));
      if (f.position) parts.push(f.position);
      if (f.minExp) parts.push(f.minExp + '+ yıl');
      $prevTarget.textContent = parts.length ? parts.join(' · ') : 'Tüm havuz';
    }
    if ($prevMsg) {
      var msg = (_wizardData.subject ? '[' + _wizardData.subject + '] ' : '') + (_wizardData.body || '—');
      $prevMsg.textContent = msg.length > 200 ? msg.substring(0, 200) + '…' : msg;
    }
    if ($prevSchedule) {
      $prevSchedule.textContent = _wizardData.schedule.mode === 'now'
        ? 'Yayına alındığında hemen'
        : ('Belirli tarih: ' + (_wizardData.schedule.at || '—'));
    }
  }

  /* ── Save draft ──────────────────────────────────────────────── */
  function saveDraft() {
    captureStep(_wizardStep);
    if (!validateStep(1) || !validateStep(4)) {
      showStep(_wizardData.title ? 4 : 1);
      return;
    }
    var f = _wizardData.filters;
    var summary = [];
    if (f.city) summary.push(f.city);
    if (f.segment) summary.push(segmentLabel(f.segment));
    if (f.position) summary.push(f.position);
    if (f.minExp) summary.push(f.minExp + '+ yıl deneyim');

    var newCmp = {
      id: 'draft-' + Date.now(),
      title: _wizardData.title,
      status: 'draft',
      created_at: new Date().toISOString(),
      filter_summary: summary.length ? summary.join(' · ') : 'Tüm havuz',
      target_count: parseInt($targetPreview && $targetPreview.getAttribute('data-count') || '0', 10),
      sent_count: 0,
      opened_count: 0,
      replied_count: 0,
      _payload: _wizardData
    };

    var drafts = readDrafts();
    drafts.unshift(newCmp);
    writeDrafts(drafts);

    _all = drafts.concat(_all.filter(function (c) { return !String(c.id).startsWith('draft-'); }));

    closeWizard();
    showToast('Taslak kaydedildi', 'success');
    renderCounts();
    renderList();
  }

  /* ── Filters ─────────────────────────────────────────────────── */
  function setFilter(key) {
    _filter = key;
    if ($filterBtns) {
      $filterBtns.forEach(function (b) {
        var k = b.getAttribute('data-hr-cmp-status');
        b.setAttribute('aria-selected', k === key ? 'true' : 'false');
      });
    }
    renderList();
  }

  /* ── Bind events ─────────────────────────────────────────────── */
  function bindEvents() {
    if ($filterBtns) {
      $filterBtns.forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-hr-cmp-status');
          if (k) setFilter(k);
        });
      });
    }

    if ($btnNew) {
      $btnNew.addEventListener('click', openWizard);
    }
    if ($modalClose) $modalClose.addEventListener('click', closeWizard);
    if ($modalBackdrop) $modalBackdrop.addEventListener('click', closeWizard);

    if ($btnPrev) {
      $btnPrev.addEventListener('click', function () {
        captureStep(_wizardStep);
        if (_wizardStep > 1) showStep(_wizardStep - 1);
      });
    }
    if ($btnNext) {
      $btnNext.addEventListener('click', function () {
        captureStep(_wizardStep);
        if (!validateStep(_wizardStep)) return;
        if (_wizardStep < TOTAL_STEPS) showStep(_wizardStep + 1);
      });
    }
    if ($btnSave) {
      $btnSave.addEventListener('click', saveDraft);
    }
    if ($btnPublish) {
      $btnPublish.addEventListener('click', function () {
        showToast('Yayın MVP 2 ile aktif olur', 'info');
      });
    }

    // Schedule radio toggle
    $$('input[name="hr-cmp-schedule"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if ($inpSchedule) $inpSchedule.disabled = (r.value !== 'later');
      });
    });

    // Filter inputs → live update preview when on step 3
    [$inpCity, $inpSegment, $inpPosition, $inpMinExp].forEach(function (el) {
      if (el) {
        el.addEventListener('change', function () {
          captureStep(3);
          updateTargetPreview();
        });
        el.addEventListener('input', function () {
          captureStep(3);
          updateTargetPreview();
        });
      }
    });

    // ESC to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $modal && $modal.getAttribute('data-open') === 'true') {
        closeWizard();
      }
    });
  }

  /* ── Position switcher ───────────────────────────────────────── */
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
      opt.setAttribute('data-pos-id', value || '');
      opt.textContent = label;
      var active = window.HRShell.getActivePosition();
      var isActive = (!value && !active) || (active && String(active.id) === String(value));
      if (isActive) opt.setAttribute('aria-selected', 'true');
      opt.addEventListener('click', function () {
        if (!value) {
          window.HRShell.setActivePosition(null);
        } else {
          var pos = positions.find(function (p) { return String(p.id) === String(value); });
          if (pos) window.HRShell.setActivePosition({ id: pos.id, title: pos.title, city: pos.city, segment: pos.segment, min_experience: pos.min_experience });
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

  /* ── Boot ────────────────────────────────────────────────────── */
  function cacheDom() {
    $list = $('[data-hr-cmp-list]');
    $loading = $('[data-hr-cmp-loading]');
    $empty = $('[data-hr-cmp-empty]');
    $filterBtns = $$('[data-hr-cmp-status]');
    $countAll = $('[data-hr-cmp-count-all]');
    $countDraft = $('[data-hr-cmp-count-draft]');
    $countScheduled = $('[data-hr-cmp-count-scheduled]');
    $countSent = $('[data-hr-cmp-count-sent]');

    $btnNew = $('[data-hr-cmp-new]');
    $modal = $('[data-hr-cmp-modal]');
    $modalClose = $('[data-hr-cmp-modal-close]');
    $modalBackdrop = $('[data-hr-cmp-modal-backdrop]');

    $steps = $('[data-hr-cmp-steps]');
    $stepSections = $$('[data-hr-cmp-step]');
    $btnPrev = $('[data-hr-cmp-prev]');
    $btnNext = $('[data-hr-cmp-next]');
    $btnSave = $('[data-hr-cmp-save]');
    $btnPublish = $('[data-hr-cmp-publish]');

    $inpTitle = $('[data-hr-cmp-input-title]');
    $inpSubject = $('[data-hr-cmp-input-subject]');
    $inpBody = $('[data-hr-cmp-input-body]');
    $inpCity = $('[data-hr-cmp-input-city]');
    $inpSegment = $('[data-hr-cmp-input-segment]');
    $inpPosition = $('[data-hr-cmp-input-position]');
    $inpMinExp = $('[data-hr-cmp-input-min-exp]');
    $inpSchedule = $('[data-hr-cmp-input-schedule]');
    $targetPreview = $('[data-hr-cmp-target-preview]');

    $prevTitle = $('[data-hr-cmp-preview-title]');
    $prevChannel = $('[data-hr-cmp-preview-channel]');
    $prevTarget = $('[data-hr-cmp-preview-target]');
    $prevMsg = $('[data-hr-cmp-preview-msg]');
    $prevSchedule = $('[data-hr-cmp-preview-schedule]');

    $toast = $('[data-hr-toast]');
  }

  async function init() {
    cacheDom();
    if (!window.HRShell) return;
    await window.HRShell.ready();

    try { await renderPositionSwitcher(); } catch (e) {}

    if ($loading) $loading.hidden = false;
    var res = await window.HRData.getCampaigns();
    if ($loading) $loading.hidden = true;

    if (!res || res.error) {
      console.warn('[hr-campaigns] load error:', res && res.error && res.error.message);
      _all = readDrafts();
    } else {
      _all = (res.data || []).slice();
      // Drafts overlay (kullanici taslagi)
      var drafts = readDrafts();
      _all = drafts.concat(_all);
    }

    renderCounts();
    renderList();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
