/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Messages panel (FAZ B Sprint 3)

   Sorumluluklar:
   - Thread liste (sol pane) + arama + filtre (Tümü / Okunmamış)
   - Aktif thread paneli (sağ pane) + mesaj geçmişi + send box
   - Position-aware filter (active position varsa sadece o pozisyon)
   - Mobile fallback: thread tıklanınca panel slide-in (CSS .is-thread-open)
   - Demo persist: localStorage ht_hr_messages_demo_state (gönderilen + okundu)
   - XSS guard: textContent + createElement only

   Kontrat: window.HRData.getMessageThreads() + sendMessage(threadId, body)
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── Constants ───────────────────────────────────────────────── */
  var MSG_OVERLAY_KEY = 'ht_hr_messages_demo_state';
  var ACTIVE_POSITION_KEY = 'ht_hr_active_position_id';

  /* ── State ───────────────────────────────────────────────────── */
  var _threads = [];           // baseline + overlay merged
  var _filteredThreads = [];   // current filter/search result
  var _activeThreadId = null;
  var _filter = 'all';         // 'all' | 'unread'
  var _query = '';
  var _activePositionId = null;

  /* ── DOM cache ───────────────────────────────────────────────── */
  var $wrap, $list, $listItems, $listLoading, $listEmpty;
  var $panel, $panelEmpty, $panelActive;
  var $threadAvatar, $threadName, $threadPos, $threadBody, $threadLink, $threadBack;
  var $compose, $input, $sendBtn, $search, $filterBtns;
  var $counter, $lede, $toast;

  /* ── Overlay (demo persist) ──────────────────────────────────── */
  function readOverlay() {
    try {
      var raw = localStorage.getItem(MSG_OVERLAY_KEY);
      if (!raw) return { sent: {}, read: {} };
      var p = JSON.parse(raw);
      return {
        sent: (p && p.sent) || {},
        read: (p && p.read) || {}
      };
    } catch (e) { return { sent: {}, read: {} }; }
  }
  function writeOverlay(state) {
    try { localStorage.setItem(MSG_OVERLAY_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ── Utility ─────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escTxt(v) { return v == null ? '' : String(v); }

  function fmtTimeShort(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var yest = new Date(now.getTime() - 86400000);
    var isYest = d.toDateString() === yest.toDateString();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    if (sameDay) return hh + ':' + mm;
    if (isYest) return 'Dün';
    var dayMs = 86400000;
    var diffDays = Math.floor((now.getTime() - d.getTime()) / dayMs);
    if (diffDays < 7) {
      var dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
      return dayNames[d.getDay()];
    }
    var dd = String(d.getDate()).padStart(2, '0');
    var MM = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '.' + MM;
  }

  function fmtTimeLong(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var dd = String(d.getDate()).padStart(2, '0');
    var MM = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return dd + '.' + MM + '.' + yy + ' ' + hh + ':' + mm;
  }

  function getInitial(name) {
    if (!name) return 'A';
    var t = String(name).trim();
    if (!t) return 'A';
    return t.charAt(0).toLocaleUpperCase('tr-TR');
  }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.textContent = msg;
    $toast.setAttribute('data-type', type || 'info');
    $toast.setAttribute('data-show', 'true');
    setTimeout(function () { $toast.setAttribute('data-show', 'false'); }, 2400);
  }

  /* ── Merge baseline + overlay ───────────────────────────────── */
  function mergeThreads(baseline) {
    var overlay = readOverlay();
    var rows = (baseline || []).map(function (t) {
      var copy = Object.assign({}, t);
      copy.messages = (t.messages || []).map(function (m) { return Object.assign({}, m); });
      // append sent overlay
      var sent = overlay.sent[t.id] || [];
      for (var i = 0; i < sent.length; i++) {
        copy.messages.push(sent[i]);
      }
      // recompute last_message + last_message_at if any sent exist
      if (sent.length > 0) {
        var lastSent = sent[sent.length - 1];
        copy.last_message = lastSent.body;
        copy.last_message_at = lastSent.sent_at;
      }
      // unread overlay (read flag wins)
      if (overlay.read[t.id]) {
        copy.unread_count = 0;
      }
      return copy;
    });
    // sort by last_message_at desc
    rows.sort(function (a, b) {
      var ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      var tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }

  /* ── Filter + search ─────────────────────────────────────────── */
  function applyFilter() {
    var rows = _threads.slice();
    // position scope
    if (_activePositionId) {
      rows = rows.filter(function (t) { return String(t.position_id) === String(_activePositionId); });
    }
    // unread filter
    if (_filter === 'unread') {
      rows = rows.filter(function (t) { return (t.unread_count || 0) > 0; });
    }
    // search
    if (_query) {
      var n = _query.toLocaleLowerCase('tr-TR');
      rows = rows.filter(function (t) {
        var name = (t.candidate_name || '').toLocaleLowerCase('tr-TR');
        var pos = (t.position_title || '').toLocaleLowerCase('tr-TR');
        var last = (t.last_message || '').toLocaleLowerCase('tr-TR');
        return name.indexOf(n) !== -1 || pos.indexOf(n) !== -1 || last.indexOf(n) !== -1;
      });
    }
    _filteredThreads = rows;
    return rows;
  }

  /* ── Render: thread list ─────────────────────────────────────── */
  function renderList() {
    if (!$listItems) return;
    var rows = _filteredThreads;
    // clear
    while ($listItems.firstChild) $listItems.removeChild($listItems.firstChild);

    if ($listLoading) $listLoading.hidden = true;

    if (!rows || rows.length === 0) {
      if ($listEmpty) $listEmpty.hidden = false;
      if ($counter) $counter.textContent = '0 konuşma';
      return;
    }
    if ($listEmpty) $listEmpty.hidden = true;

    rows.forEach(function (t) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'hr-msg-item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('data-hr-msg-thread', t.id);
      if (t.id === _activeThreadId) item.setAttribute('aria-current', 'true');
      if ((t.unread_count || 0) > 0) item.setAttribute('data-unread', 'true');

      var avatar = document.createElement('div');
      avatar.className = 'hr-msg-item__avatar';
      avatar.textContent = getInitial(t.candidate_name);
      item.appendChild(avatar);

      var body = document.createElement('div');
      body.className = 'hr-msg-item__body';

      var top = document.createElement('div');
      top.className = 'hr-msg-item__top';
      var name = document.createElement('span');
      name.className = 'hr-msg-item__name';
      name.textContent = escTxt(t.candidate_name) || '—';
      var time = document.createElement('span');
      time.className = 'hr-msg-item__time';
      time.textContent = fmtTimeShort(t.last_message_at);
      top.appendChild(name);
      top.appendChild(time);
      body.appendChild(top);

      var pos = document.createElement('div');
      pos.className = 'hr-msg-item__pos';
      pos.textContent = escTxt(t.position_title) || '';
      body.appendChild(pos);

      var bot = document.createElement('div');
      bot.className = 'hr-msg-item__bot';
      var preview = document.createElement('span');
      preview.className = 'hr-msg-item__preview';
      preview.textContent = escTxt(t.last_message) || '';
      bot.appendChild(preview);
      if ((t.unread_count || 0) > 0) {
        var badge = document.createElement('span');
        badge.className = 'hr-msg-item__badge';
        badge.textContent = String(t.unread_count);
        badge.setAttribute('aria-label', t.unread_count + ' okunmamış mesaj');
        bot.appendChild(badge);
      }
      body.appendChild(bot);

      item.appendChild(body);

      item.addEventListener('click', function () {
        openThread(t.id);
      });

      $listItems.appendChild(item);
    });

    if ($counter) $counter.textContent = rows.length + ' konuşma';
  }

  /* ── Render: active thread body ──────────────────────────────── */
  function renderThread(thread) {
    if (!$panelEmpty || !$panelActive) return;
    if (!thread) {
      $panelEmpty.hidden = false;
      $panelActive.hidden = true;
      $wrap.removeAttribute('data-thread-open');
      return;
    }
    $panelEmpty.hidden = true;
    $panelActive.hidden = false;
    $wrap.setAttribute('data-thread-open', 'true');

    if ($threadAvatar) $threadAvatar.textContent = getInitial(thread.candidate_name);
    if ($threadName) $threadName.textContent = escTxt(thread.candidate_name) || '—';
    if ($threadPos) $threadPos.textContent = escTxt(thread.position_title) || '';
    if ($threadLink) $threadLink.setAttribute('href', 'hr-candidate.html?id=' + encodeURIComponent(thread.candidate_id));

    // body messages
    while ($threadBody.firstChild) $threadBody.removeChild($threadBody.firstChild);

    var msgs = (thread.messages || []).slice();
    msgs.sort(function (a, b) {
      var ta = a.sent_at ? new Date(a.sent_at).getTime() : 0;
      var tb = b.sent_at ? new Date(b.sent_at).getTime() : 0;
      return ta - tb;
    });

    var prevDay = null;
    msgs.forEach(function (m) {
      var d = m.sent_at ? new Date(m.sent_at) : null;
      var dayKey = d ? d.toDateString() : '';
      if (dayKey && dayKey !== prevDay) {
        var sep = document.createElement('div');
        sep.className = 'hr-msg-day-sep';
        var sepLabel = document.createElement('span');
        sepLabel.className = 'hr-msg-day-sep__label';
        sepLabel.textContent = formatDayLabel(d);
        sep.appendChild(sepLabel);
        $threadBody.appendChild(sep);
        prevDay = dayKey;
      }

      var row = document.createElement('div');
      row.className = 'hr-msg-bubble-row';
      row.setAttribute('data-from', m.from === 'hr' ? 'hr' : 'candidate');

      var bubble = document.createElement('div');
      bubble.className = 'hr-msg-bubble';

      var bodyText = document.createElement('div');
      bodyText.className = 'hr-msg-bubble__body';
      bodyText.textContent = escTxt(m.body);
      bubble.appendChild(bodyText);

      var meta = document.createElement('div');
      meta.className = 'hr-msg-bubble__meta';
      var time = document.createElement('time');
      time.dateTime = m.sent_at || '';
      time.textContent = fmtTimeShort(m.sent_at);
      time.setAttribute('aria-label', fmtTimeLong(m.sent_at));
      meta.appendChild(time);
      bubble.appendChild(meta);

      row.appendChild(bubble);
      $threadBody.appendChild(row);
    });

    // scroll to bottom
    requestAnimationFrame(function () {
      $threadBody.scrollTop = $threadBody.scrollHeight;
    });
  }

  function formatDayLabel(d) {
    if (!d) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return 'Bugün';
    var yest = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yest.toDateString()) return 'Dün';
    var dd = String(d.getDate()).padStart(2, '0');
    var months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return dd + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ── Open thread ─────────────────────────────────────────────── */
  function openThread(id) {
    _activeThreadId = id;
    var t = _threads.find(function (x) { return x.id === id; });
    if (!t) return;

    // mark read
    if ((t.unread_count || 0) > 0) {
      t.unread_count = 0;
      var ov = readOverlay();
      ov.read[id] = true;
      writeOverlay(ov);
    }

    // re-render list (active state + read clear) + thread
    applyFilter();
    renderList();
    renderThread(t);

    // enable input
    if ($input) $input.value = '';
    if ($sendBtn) $sendBtn.disabled = true;
  }

  function closeThread() {
    _activeThreadId = null;
    if ($wrap) $wrap.removeAttribute('data-thread-open');
    if ($panelActive) $panelActive.hidden = true;
    if ($panelEmpty) $panelEmpty.hidden = false;
    // unmark active highlight in list
    $$('.hr-msg-item[aria-current="true"]').forEach(function (el) {
      el.removeAttribute('aria-current');
    });
  }

  /* ── Send ───────────────────────────────────────────────────── */
  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!_activeThreadId) return;
    var body = ($input && $input.value || '').trim();
    if (!body) return;

    var t = _threads.find(function (x) { return x.id === _activeThreadId; });
    if (!t) return;

    var nowIso = new Date().toISOString();
    var msg = {
      id: 'm-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      from: 'hr',
      body: body,
      sent_at: nowIso
    };

    // optimistic update
    t.messages = (t.messages || []).slice();
    t.messages.push(msg);
    t.last_message = body;
    t.last_message_at = nowIso;

    // overlay persist
    var ov = readOverlay();
    if (!ov.sent[_activeThreadId]) ov.sent[_activeThreadId] = [];
    ov.sent[_activeThreadId].push(msg);
    writeOverlay(ov);

    // send via adapter (demo: noop, real: RPC)
    try {
      var res = await window.HRData.sendMessage(_activeThreadId, body);
      if (res && res.error) {
        showToast('Mesaj gönderilemedi', 'error');
        // optional: rollback — demo mode no-op kept
      }
    } catch (err) {
      console.warn('[hr-messages] send error:', err && err.message);
    }

    // re-render
    applyFilter();
    renderList();
    renderThread(t);
    if ($input) $input.value = '';
    if ($sendBtn) $sendBtn.disabled = true;
    showToast('Mesaj gönderildi', 'success');
  }

  /* ── Bind events ─────────────────────────────────────────────── */
  function bindEvents() {
    if ($search) {
      $search.addEventListener('input', function () {
        _query = $search.value.trim();
        applyFilter();
        renderList();
      });
    }

    if ($filterBtns) {
      $filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-hr-msg-filter');
          if (!key) return;
          _filter = key;
          $filterBtns.forEach(function (b) {
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          });
          applyFilter();
          renderList();
        });
      });
    }

    if ($input) {
      $input.addEventListener('input', function () {
        var v = $input.value.trim();
        if ($sendBtn) $sendBtn.disabled = v.length === 0;
      });
      $input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    if ($compose) {
      $compose.addEventListener('submit', handleSend);
    }

    if ($threadBack) {
      $threadBack.addEventListener('click', closeThread);
    }

    // Position değişince listeyi süz
    window.addEventListener('hr:position-changed', function (e) {
      var pos = e && e.detail;
      _activePositionId = pos && pos.id ? pos.id : null;
      updateLede();
      applyFilter();
      renderList();
      // Aktif thread başka pozisyondaysa kapat
      if (_activeThreadId) {
        var t = _threads.find(function (x) { return x.id === _activeThreadId; });
        if (_activePositionId && t && String(t.position_id) !== String(_activePositionId)) {
          closeThread();
        }
      }
    });
  }

  function updateLede() {
    if (!$lede) return;
    if (_activePositionId) {
      var pos = window.HRShell && window.HRShell.getActivePosition && window.HRShell.getActivePosition();
      var posTitle = (pos && pos.title) || 'Aktif pozisyon';
      $lede.textContent = '“' + posTitle + '” pozisyonundaki konuşmalar gösteriliyor. Pozisyon seçimini başlıktan değiştirebilirsiniz.';
    } else {
      $lede.textContent = 'Konuşmalar adaya göre gruplanır. Pozisyon seçtiğinizde sadece o pozisyondaki yazışmalar görünür.';
    }
  }

  /* ── Position switcher render (header dropdown) ──────────────── */
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
          if (pos) window.HRShell.setActivePosition({ id: pos.id, title: pos.title });
        }
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        // re-render selected
        renderPositionSwitcher();
      });
      menu.appendChild(opt);
    }
    addOpt('Tüm pozisyonlar', null);
    positions.forEach(function (p) { addOpt(p.title || ('Pozisyon #' + p.id), p.id); });

    // Dropdown toggle
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

  /* ── Boot ───────────────────────────────────────────────────── */
  function cacheDom() {
    $wrap = $('[data-hr-msg-wrap]');
    $list = $('[data-hr-msg-list]');
    $listItems = $('[data-hr-msg-list-items]');
    $listLoading = $('[data-hr-msg-list-loading]');
    $listEmpty = $('[data-hr-msg-list-empty]');
    $panel = $('[data-hr-msg-panel]');
    $panelEmpty = $('[data-hr-msg-panel-empty]');
    $panelActive = $('[data-hr-msg-panel-active]');
    $threadAvatar = $('[data-hr-msg-thread-avatar]');
    $threadName = $('[data-hr-msg-thread-name]');
    $threadPos = $('[data-hr-msg-thread-pos]');
    $threadBody = $('[data-hr-msg-thread-body]');
    $threadLink = $('[data-hr-msg-thread-link]');
    $threadBack = $('[data-hr-msg-back]');
    $compose = $('[data-hr-msg-compose]');
    $input = $('[data-hr-msg-input]');
    $sendBtn = $('[data-hr-msg-send]');
    $search = $('[data-hr-msg-search]');
    $filterBtns = $$('[data-hr-msg-filter]');
    $counter = $('[data-hr-msg-counter]');
    $lede = $('[data-hr-msg-lede]');
    $toast = $('[data-hr-toast]');
  }

  async function init() {
    cacheDom();
    if (!window.HRShell) {
      console.warn('[hr-messages] HRShell yok, durdu');
      return;
    }

    await window.HRShell.ready();

    // Active position
    var ap = window.HRShell.getActivePosition();
    _activePositionId = ap && ap.id ? ap.id : null;
    updateLede();

    // Position switcher (best-effort, errored ignored)
    try { await renderPositionSwitcher(); } catch (e) {}

    // Load threads
    var res = await window.HRData.getMessageThreads();
    if (!res || res.error) {
      if ($listLoading) $listLoading.hidden = true;
      if ($listEmpty) {
        $listEmpty.hidden = false;
        $listEmpty.querySelector('p').textContent = 'Konuşmalar yüklenemedi.';
      }
      console.warn('[hr-messages] load error:', res && res.error && res.error.message);
      return;
    }

    _threads = mergeThreads(res.data || []);
    applyFilter();
    renderList();

    bindEvents();

    // Deep link: ?thread=th-001
    try {
      var params = new URLSearchParams(window.location.search);
      var deep = params.get('thread') || params.get('candidate');
      if (deep) {
        var match = _threads.find(function (t) {
          return t.id === deep || String(t.candidate_id) === String(deep);
        });
        if (match) openThread(match.id);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
