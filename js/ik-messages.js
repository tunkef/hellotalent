/* global IK_SHELL, IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Messages — Asama 86 Sprint C
   Mesajlar 2-pane controller.
   - Auth gate (IK_SHELL.init).
   - Thread list: search debounce + filter (all/unread) + active state.
   - Thread detail: header, message body, send box, templates.
   - Mobile slide-in: data-mobile-view='list' | 'detail'.
   - URL ?aday={id} → ilgili thread auto-select.
   - Optimistic UI: send → bubble eklenir + adapter call.
   XSS-safe: textContent only, innerHTML YASAK.
   SOLID:
     - SRP: state + render + event binding ayri fonksiyonlarda.
     - DIP: data sadece IK_DATA uzerinden gelir.
     - OCP: template config-driven, yeni alan eklemek tek satir.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ Config ═══════ */
  var SEARCH_DEBOUNCE_MS = 300;

  /* Quick reply templates (content-writer + avoid-ai-writing) */
  var TEMPLATES = [
    { id: 'tpl-1', short: 'Mülakat tarihi', body: 'Merhaba, başvurunuzu inceledik. Mülakat için hangi gün uygunsunuz?' },
    { id: 'tpl-2', short: 'Video görüşme',  body: 'İlk görüşmeyi video üzerinden yapabilir miyiz?' },
    { id: 'tpl-3', short: 'Ofis daveti',    body: 'Ofiste sizi bekliyoruz, adres ve detayı e-posta ile yolladık.' },
    { id: 'tpl-4', short: 'İlgi kontrol',   body: 'Pozisyon hâlâ sizi ilgilendiriyor mu? Kısa bir görüşme yapalım.' },
    { id: 'tpl-5', short: 'Referans',       body: 'Referanslarınızı paylaşır mısınız?' }
  ];

  var MOBILE_BREAKPOINT = 768;

  /* ═══════ State ═══════ */
  var state = {
    threads: [],          /* full thread list (sorted by last_activity_at desc) */
    filtered: [],         /* after filter + search */
    activeThreadId: null,
    activeThread: null,   /* current detail object */
    searchQuery: '',
    filterMode: 'all'     /* 'all' | 'unread' */
  };

  /* ═══════ DOM cache ═══════ */
  var dom = {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function cacheDom() {
    dom.layout         = $('[data-ik-msg-layout]');
    dom.list           = $('[data-ik-msg-list]');
    dom.listItems      = $('[data-ik-msg-list-items]');
    dom.listLoading    = $('[data-ik-msg-list-loading]');
    dom.listEmpty      = $('[data-ik-msg-list-empty]');
    dom.listEmptyTitle = $('[data-ik-msg-list-empty-title]');
    dom.listEmptyDesc  = $('[data-ik-msg-list-empty-desc]');
    dom.counter        = $('[data-ik-msg-counter]');
    dom.search         = $('[data-ik-msg-search]');
    dom.searchClear    = $('[data-ik-msg-search-clear]');
    dom.filterBtns     = $$('[data-ik-msg-filter]');

    dom.detail         = $('[data-ik-msg-detail]');
    dom.detailEmpty    = $('[data-ik-msg-detail-empty]');
    dom.detailActive   = $('[data-ik-msg-detail-active]');
    dom.detailBack     = $('[data-ik-msg-back]');
    dom.detailAvatar   = $('[data-ik-msg-detail-avatar]');
    dom.detailName     = $('[data-ik-msg-detail-name]');
    dom.detailPos      = $('[data-ik-msg-detail-pos]');
    dom.detailProfile  = $('[data-ik-msg-detail-profile]');
    dom.detailBody     = $('[data-ik-msg-detail-body]');
    dom.templates      = $('[data-ik-msg-templates]');
    dom.sendForm       = $('[data-ik-msg-send-form]');
    dom.textarea       = $('[data-ik-msg-textarea]');
    dom.sendBtn        = $('[data-ik-msg-send-btn]');

    dom.toast          = $('[data-ik-msg-toast]');
  }

  /* ═══════ Helpers ═══════ */
  function trLower(s) {
    if (!s) return '';
    return String(s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  }

  function safeStr(v) { return v == null ? '' : String(v); }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function initialOf(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function clearChildren(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  /* ── Time formatting (today/yesterday/this-week/older) ── */
  var WEEKDAYS_SHORT = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  var MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function formatTime(iso, mode) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    var isYesterday = d.toDateString() === yest.toDateString();
    var diffMs = now.getTime() - d.getTime();
    var diffDays = diffMs / 86400000;

    var hh = pad2(d.getHours());
    var mm = pad2(d.getMinutes());

    if (mode === 'list') {
      if (sameDay) return hh + ':' + mm;
      if (isYesterday) return 'Dün';
      if (diffDays < 7) return WEEKDAYS_SHORT[d.getDay()];
      if (d.getFullYear() === now.getFullYear()) {
        return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
      }
      return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }
    /* Bubble time */
    if (sameDay) return hh + ':' + mm;
    if (isYesterday) return 'Dün ' + hh + ':' + mm;
    if (diffDays < 7) return WEEKDAYS_SHORT[d.getDay()] + ' ' + hh + ':' + mm;
    if (d.getFullYear() === now.getFullYear()) {
      return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' · ' + hh + ':' + mm;
    }
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + hh + ':' + mm;
  }

  function dayKey(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function dayLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Bugün';
    var yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Dün';
    if (d.getFullYear() === now.getFullYear()) {
      return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
    }
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ── Toast ── */
  function showToast(msg, kind) {
    if (!dom.toast) return;
    dom.toast.textContent = safeStr(msg);
    dom.toast.classList.remove('ik-msg-toast--success', 'ik-msg-toast--error');
    if (kind === 'success') dom.toast.classList.add('ik-msg-toast--success');
    else if (kind === 'error') dom.toast.classList.add('ik-msg-toast--error');
    dom.toast.classList.add('is-visible');
    setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, 2400);
  }

  /* ═══════ Filter ═══════ */
  function applyFilter() {
    var q = trLower(state.searchQuery).trim();
    var arr = state.threads.slice();

    if (state.filterMode === 'unread') {
      arr = arr.filter(function (t) { return (t.unread_replies || 0) > 0; });
    }

    if (q) {
      arr = arr.filter(function (t) {
        var hay = trLower([
          t.candidate_name || '',
          t.subject || '',
          t.last_body || ''
        ].join(' '));
        return hay.indexOf(q) >= 0;
      });
    }

    state.filtered = arr;
  }

  /* ═══════ Render: thread list ═══════ */
  function renderList() {
    if (!dom.listItems) return;
    clearChildren(dom.listItems);

    if (!state.filtered.length) {
      dom.listItems.hidden = true;
      if (dom.listEmpty) {
        dom.listEmpty.hidden = false;
        if (state.searchQuery || state.filterMode === 'unread') {
          if (dom.listEmptyTitle) dom.listEmptyTitle.textContent = 'Eşleşen konuşma yok';
          if (dom.listEmptyDesc)  dom.listEmptyDesc.textContent  = 'Aramayı veya filtreyi gevşet, yeni konuşmalar geldikçe burada görünür.';
        } else {
          if (dom.listEmptyTitle) dom.listEmptyTitle.textContent = 'Henüz mesajınız yok';
          if (dom.listEmptyDesc)  dom.listEmptyDesc.textContent  = "Pipeline'a aldığınız adaylarla buradan yazışırsınız.";
        }
      }
      if (dom.counter) dom.counter.textContent = '0';
      return;
    }

    if (dom.listEmpty) dom.listEmpty.hidden = true;
    dom.listItems.hidden = false;

    state.filtered.forEach(function (t) {
      dom.listItems.appendChild(buildThreadRow(t));
    });

    if (dom.counter) dom.counter.textContent = String(state.filtered.length);
  }

  function buildThreadRow(t) {
    var li = document.createElement('li');
    li.className = 'ik-msg-thread';
    li.setAttribute('role', 'listitem');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ik-msg-thread__btn';
    btn.setAttribute('data-thread-id', t.message_id);
    if ((t.unread_replies || 0) > 0) btn.classList.add('is-unread');
    if (state.activeThreadId === t.message_id) {
      btn.classList.add('is-active');
      btn.setAttribute('aria-current', 'true');
    }
    btn.setAttribute('aria-label', 'Konuşma: ' + (t.candidate_name || ''));

    /* Avatar */
    var avatar = document.createElement('span');
    avatar.className = 'ik-msg-thread__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = initialOf(t.candidate_name);
    btn.appendChild(avatar);

    /* Meta */
    var meta = document.createElement('div');
    meta.className = 'ik-msg-thread__meta';

    var top = document.createElement('div');
    top.className = 'ik-msg-thread__top';

    var name = document.createElement('p');
    name.className = 'ik-msg-thread__name';
    name.textContent = t.candidate_name || '—';
    top.appendChild(name);

    var time = document.createElement('span');
    time.className = 'ik-msg-thread__time';
    time.textContent = formatTime(t.last_activity_at, 'list');
    top.appendChild(time);

    meta.appendChild(top);

    var preview = document.createElement('p');
    preview.className = 'ik-msg-thread__preview';
    preview.textContent = t.last_body || '';
    meta.appendChild(preview);

    btn.appendChild(meta);

    /* Unread badge */
    if ((t.unread_replies || 0) > 0) {
      var badge = document.createElement('span');
      badge.className = 'ik-msg-thread__badge';
      badge.setAttribute('aria-label', t.unread_replies + ' okunmamış mesaj');
      badge.textContent = String(t.unread_replies);
      btn.appendChild(badge);
    } else {
      var spacer = document.createElement('span');
      spacer.className = 'ik-msg-thread__badge-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      btn.appendChild(spacer);
    }

    btn.addEventListener('click', function () {
      selectThread(t.message_id);
    });

    li.appendChild(btn);
    return li;
  }

  /* ═══════ Render: thread detail ═══════ */
  function renderDetail() {
    if (!state.activeThread) {
      if (dom.detailEmpty) dom.detailEmpty.hidden = false;
      if (dom.detailActive) dom.detailActive.hidden = true;
      return;
    }

    if (dom.detailEmpty) dom.detailEmpty.hidden = true;
    if (dom.detailActive) dom.detailActive.hidden = false;

    var t = state.activeThread;

    if (dom.detailAvatar) dom.detailAvatar.textContent = initialOf(t.candidate_name);
    if (dom.detailName)   dom.detailName.textContent = t.candidate_name || '—';
    if (dom.detailPos)    dom.detailPos.textContent  = t.subject || '—';

    if (dom.detailProfile) {
      var cid = t.candidate_id || '';
      dom.detailProfile.setAttribute('href', cid ? ('hr-candidate.html?id=' + encodeURIComponent(cid)) : '#');
    }

    renderBody();
    renderTemplates();
  }

  function renderBody() {
    if (!dom.detailBody || !state.activeThread) return;
    clearChildren(dom.detailBody);

    var msgs = (state.activeThread.messages || []).slice().sort(function (a, b) {
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    var lastDay = '';
    msgs.forEach(function (m) {
      var k = dayKey(m.created_at);
      if (k && k !== lastDay) {
        var sep = document.createElement('div');
        sep.className = 'ik-msg-daysep';
        sep.textContent = dayLabel(m.created_at);
        dom.detailBody.appendChild(sep);
        lastDay = k;
      }
      dom.detailBody.appendChild(buildBubble(m));
    });

    /* scroll to bottom */
    requestAnimationFrame(function () {
      dom.detailBody.scrollTop = dom.detailBody.scrollHeight;
    });
  }

  function buildBubble(m) {
    var wrap = document.createElement('div');
    wrap.className = 'ik-msg-bubble';
    if (m.sender === 'employer') wrap.classList.add('ik-msg-bubble--out');
    else wrap.classList.add('ik-msg-bubble--in');
    if (m._pending) wrap.classList.add('ik-msg-bubble--pending');
    wrap.setAttribute('data-msg-id', m.item_id || '');

    var body = document.createElement('div');
    body.className = 'ik-msg-bubble__body';
    body.textContent = m.body || '';
    wrap.appendChild(body);

    var time = document.createElement('span');
    time.className = 'ik-msg-bubble__time';
    time.textContent = formatTime(m.created_at, 'bubble');
    wrap.appendChild(time);

    return wrap;
  }

  function renderTemplates() {
    if (!dom.templates) return;
    clearChildren(dom.templates);
    TEMPLATES.forEach(function (tpl) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ik-msg-template';
      btn.setAttribute('data-template-id', tpl.id);
      btn.textContent = tpl.short;
      btn.setAttribute('aria-label', 'Şablon ekle: ' + tpl.short);
      btn.addEventListener('click', function () {
        if (!dom.textarea) return;
        var current = dom.textarea.value;
        dom.textarea.value = current ? (current + (current.endsWith(' ') ? '' : ' ') + tpl.body) : tpl.body;
        updateSendBtnState();
        dom.textarea.focus();
      });
      dom.templates.appendChild(btn);
    });
  }

  /* ═══════ Thread selection ═══════ */
  function selectThread(thread_id) {
    if (!thread_id) return;
    state.activeThreadId = thread_id;

    if (window.IK_DATA && typeof IK_DATA.markThreadRead === 'function') {
      IK_DATA.markThreadRead(thread_id);
    }

    /* Load thread messages — adapter returns array */
    if (window.IK_DATA && typeof IK_DATA.getThread === 'function') {
      IK_DATA.getThread(thread_id).then(function (msgs) {
        if (!msgs || !Array.isArray(msgs)) {
          console.error('[ik-messages] getThread geçersiz yanıt:', thread_id);
          state.activeThread = null;
          renderDetail();
          showToast('Konuşma yüklenemedi', 'error');
          return;
        }
        /* Thread metadata state.threads listesinden — adapter shape */
        var meta = state.threads.find(function (x) { return x.message_id === thread_id; });
        state.activeThread = Object.assign({}, meta || {}, { messages: msgs });

        /* Read state UI sync */
        if (state.activeThread.unread_replies) state.activeThread.unread_replies = 0;
        var idx = state.threads.findIndex(function (x) { return x.message_id === thread_id; });
        if (idx >= 0) state.threads[idx].unread_replies = 0;

        applyFilter();
        renderList();
        renderDetail();
        if (isMobile() && dom.layout) {
          dom.layout.setAttribute('data-mobile-view', 'detail');
        }
      }).catch(function (e) {
        console.error('[ik-messages] getThread hata:', e && e.message);
        showToast('Hata: ' + (e && e.message || 'Konuşma yüklenemedi'), 'error');
      });
    }

    /* URL hash sync (deep link) */
    try {
      if (history && history.replaceState) {
        var url = new URL(location.href);
        url.hash = 'thread=' + thread_id;
        history.replaceState(null, '', url.toString());
      }
    } catch (e) { /* ignore */ }
  }

  function deselectThread() {
    state.activeThreadId = null;
    state.activeThread = null;
    renderList();
    renderDetail();
    if (dom.layout) dom.layout.setAttribute('data-mobile-view', 'list');
    try {
      if (history && history.replaceState) {
        var url = new URL(location.href);
        url.hash = '';
        history.replaceState(null, '', url.toString().replace(/#$/, ''));
      }
    } catch (e) { /* ignore */ }
  }

  /* ═══════ Send ═══════ */
  function updateSendBtnState() {
    if (!dom.sendBtn || !dom.textarea) return;
    var v = dom.textarea.value.trim();
    dom.sendBtn.disabled = !v || !state.activeThreadId;
  }

  function sendMessage() {
    if (!dom.textarea || !state.activeThreadId) return;
    var body = dom.textarea.value.trim();
    if (!body) return;

    /* Optimistic UI: tentative bubble */
    var pendingMsg = {
      item_id: 'pending-' + Date.now(),
      sender: 'employer',
      body: body,
      created_at: new Date().toISOString(),
      read_at: null,
      _pending: true
    };

    if (!state.activeThread) return;
    state.activeThread.messages = (state.activeThread.messages || []).concat([pendingMsg]);
    state.activeThread.last_body = body;
    state.activeThread.last_activity_at = pendingMsg.created_at;

    /* Sync threads list */
    var idx = state.threads.findIndex(function (x) { return x.message_id === state.activeThreadId; });
    if (idx >= 0) {
      state.threads[idx].last_body = body;
      state.threads[idx].last_activity_at = pendingMsg.created_at;
    }

    dom.textarea.value = '';
    updateSendBtnState();
    renderBody();

    if (!window.IK_DATA || typeof IK_DATA.replyToThread !== 'function') {
      showToast('Mesaj gönderilemedi: veri katmanı yok', 'error');
      return;
    }

    IK_DATA.replyToThread(state.activeThreadId, body).then(function (res) {
      if (state.activeThread && state.activeThread.messages) {
        var msgs = state.activeThread.messages;
        var pIdx = msgs.findIndex(function (m) { return m.item_id === pendingMsg.item_id; });
        if (pIdx >= 0) {
          if (res && res.ok) {
            /* Pending bubble'ı confirmed mesaj ile replace et */
            msgs[pIdx] = Object.assign({}, pendingMsg, {
              item_id: res.reply_id,
              _pending: false
            });
          } else {
            /* Hata: pending bubble'ı kaldır + Türkçe toast */
            msgs.splice(pIdx, 1);
            showToast('Mesaj gönderilemedi: ' + (res && res.error || 'bilinmeyen hata'), 'error');
            renderBody();
            return;
          }
        }
      }
      /* Re-sort threads (newest first) */
      state.threads.sort(function (a, b) {
        return new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0);
      });
      applyFilter();
      renderList();
      renderBody();
      showToast('Mesaj gönderildi', 'success');
    }).catch(function (err) {
      /* Exception path: pending bubble'ı kaldır + toast */
      if (state.activeThread && state.activeThread.messages) {
        var msgs = state.activeThread.messages;
        var pIdx = msgs.findIndex(function (m) { return m.item_id === pendingMsg.item_id; });
        if (pIdx >= 0) {
          msgs.splice(pIdx, 1);
          renderBody();
        }
      }
      showToast('Mesaj gönderilemedi: ' + (err && err.message || 'sunucu hatası'), 'error');
    });
  }

  /* ═══════ Bind events ═══════ */
  function bindEvents() {
    /* Search */
    if (dom.search) {
      var debounced = debounce(function () {
        state.searchQuery = dom.search.value;
        if (dom.searchClear) dom.searchClear.hidden = !state.searchQuery;
        applyFilter();
        renderList();
      }, SEARCH_DEBOUNCE_MS);
      dom.search.addEventListener('input', debounced);
    }
    if (dom.searchClear) {
      dom.searchClear.addEventListener('click', function () {
        if (!dom.search) return;
        dom.search.value = '';
        state.searchQuery = '';
        dom.searchClear.hidden = true;
        applyFilter();
        renderList();
        dom.search.focus();
      });
    }

    /* Filter tabs */
    dom.filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-ik-msg-filter') || 'all';
        state.filterMode = mode;
        dom.filterBtns.forEach(function (b) {
          var bMode = b.getAttribute('data-ik-msg-filter');
          if (bMode === mode) {
            b.classList.add('is-active');
            b.setAttribute('aria-selected', 'true');
          } else {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          }
        });
        applyFilter();
        renderList();
      });
    });

    /* Send form */
    if (dom.sendForm) {
      dom.sendForm.addEventListener('submit', function (e) {
        e.preventDefault();
        sendMessage();
      });
    }

    /* Textarea — Enter to send, Shift+Enter newline */
    if (dom.textarea) {
      dom.textarea.addEventListener('input', updateSendBtnState);
      dom.textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (!dom.sendBtn.disabled) sendMessage();
        }
      });
    }

    /* Mobile back */
    if (dom.detailBack) {
      dom.detailBack.addEventListener('click', function () {
        if (isMobile() && dom.layout) {
          dom.layout.setAttribute('data-mobile-view', 'list');
        } else {
          deselectThread();
        }
      });
    }

    /* Resize → if leaves mobile, ensure layout reset */
    window.addEventListener('resize', debounce(function () {
      if (!isMobile() && dom.layout) {
        dom.layout.setAttribute('data-mobile-view', 'list');
      }
    }, 200));
  }

  /* ═══════ Init ═══════ */
  function getQueryParam(name) {
    try {
      var url = new URL(location.href);
      return url.searchParams.get(name);
    } catch (e) { return null; }
  }

  function getHashThreadId() {
    var h = location.hash || '';
    var m = h.match(/thread=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function autoSelectFromUrl() {
    /* Priority: ?aday={candidate_id} > #thread={thread_id} */
    var candidateId = getQueryParam('aday');
    var threadId = getHashThreadId();

    if (candidateId) {
      var hit = state.threads.find(function (t) {
        return String(t.candidate_id) === String(candidateId);
      });
      if (hit) {
        selectThread(hit.message_id);
        return;
      }
    }
    if (threadId) {
      var t = state.threads.find(function (x) { return x.message_id === threadId; });
      if (t) {
        selectThread(threadId);
        return;
      }
    }

    /* Desktop: default to first thread */
    if (!isMobile() && state.threads.length) {
      selectThread(state.threads[0].message_id);
    }
  }

  async function init() {
    cacheDom();

    /* Auth gate */
    if (window.IK_SHELL && typeof IK_SHELL.init === 'function') {
      try { await IK_SHELL.init(); }
      catch (e) { console.warn('[ik-messages] shell init:', e && e.message); }
    }

    bindEvents();

    /* Load threads */
    if (!window.IK_DATA || typeof IK_DATA.getMessageThreads !== 'function') {
      if (dom.listLoading) dom.listLoading.hidden = true;
      showToast('Veri katmanı yüklenemedi', 'error');
      return;
    }

    try {
      var threads = await IK_DATA.getMessageThreads();
      state.threads = threads || [];

      if (dom.listLoading) dom.listLoading.hidden = true;

      applyFilter();
      renderList();
      autoSelectFromUrl();
    } catch (e) {
      if (dom.listLoading) dom.listLoading.hidden = true;
      console.warn('[ik-messages] load fail:', e && e.message);
      showToast('Konuşmalar yüklenemedi', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Test/debug expose — sadece localhost */
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window._ikMessagesState = state;
  }
})();
