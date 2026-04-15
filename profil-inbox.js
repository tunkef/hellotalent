/* global supabase, switchPanel */
/* ═══════════════════════════════════════════════════════════════
   HELLOTALENT — PROFİL INBOX JS
   Instagram DM-style inbox: conversation list + thread view
   Depends on: profil-core.js (supabase), profil-ui.js (_ht_candidate_id)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var loaded = false;
  var allMessages = [];
  var currentFilter = 'all';
  var activeThreadMsgId = null;

  var FILTERS = [
    { key: 'all',         label: 'Tümü' },
    { key: 'employer_dm', label: 'İşveren' },
    { key: 'unread',      label: 'Okunmamış' },
    { key: 'deleted',     label: 'Silinenler' }
  ];

  var TR_DAYS = ['Pazar','Pazartesi','Sal\u0131','\u00C7ar\u015Famba','Per\u015Fembe','Cuma','Cumartesi'];
  var TR_MONTHS = ['Oca','\u015Eub','Mar','Nis','May','Haz','Tem','A\u011Fu','Eyl','Eki','Kas','Ara'];

  /* ═══ TIME HELPERS ═══ */
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'az \u00F6nce';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk \u00F6nce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat \u00F6nce';
    if (diff < 172800) return 'D\u00FCn';
    if (diff < 604800) return Math.floor(diff / 86400) + ' g\u00FCn \u00F6nce';
    var d = new Date(dateStr);
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()];
  }

  function formatRowTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) {
      var h = d.getHours(), m = d.getMinutes();
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()].toUpperCase();
  }

  function bubbleTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }

  function dateSeparatorLabel(dateStr) {
    var d = new Date(dateStr);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diffDays = Math.round((today - target) / 86400000);
    if (diffDays === 0) return 'Bug\u00FCn';
    if (diffDays === 1) return 'D\u00FCn';
    if (diffDays < 7) return TR_DAYS[d.getDay()];
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function isSameDay(a, b) {
    var da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }

  function getSupa() {
    return window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
  }

  /* ═══════════════════════════════════════════════════════════════
     LOAD MESSAGES via canonical get_candidate_thread_summaries RPC
     Single source of truth for all candidate messaging surfaces.
     ═══════════════════════════════════════════════════════════════ */
  window._htLoadInbox = async function(filter) {
    var supa = getSupa();
    var listEl = document.getElementById('inbox-list');
    var emptyEl = document.getElementById('inbox-empty');
    var tabsEl = document.getElementById('inbox-tabs');
    if (!listEl || !supa) return;

    if (tabsEl && !tabsEl.hasChildNodes()) renderFilterTabs(tabsEl);

    if (!loaded) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var ld = document.createElement('div');
      ld.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted,#6B7280);font-size:13px;';
      ld.textContent = 'Mesajlar y\u00FCkleniyor...';
      listEl.appendChild(ld);
    }

    try {
      var res = await supa.rpc('get_candidate_thread_summaries', { p_limit: 50, p_offset: 0 });

      if (res.error) {
        console.error('Inbox load error:', res.error.message);
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        loaded = true;
        renderMessages();
        return;
      }

      allMessages = (res.data || []).map(function(t) {
        var hasLatest = t.last_sender !== 'employer' || t.last_body !== t.subject;
        return {
          id: t.message_id,
          message_type: 'employer_dm',
          title: t.subject,
          body: t.last_body,
          status: t.status,
          created_at: t.last_activity_at,
          company_name: t.company_name,
          company_logo: t.company_logo,
          latest_reply: hasLatest ? { body: t.last_body, created_at: t.last_activity_at } : null,
          latest_sender: t.last_sender,
          unread_followups: t.unread_followups || 0,
          is_unread: t.is_unread,
          last_activity: t.last_activity_at
        };
      });
      // Already sorted by last_activity_at DESC from RPC

      loaded = true;
      if (filter) currentFilter = filter;
      renderMessages();
      updateUnreadBadges();
      /* K071: drawer preview click sets window._htPendingInboxThreadId.
         If that thread is in the current filtered set, auto-open it. */
      if (window._htPendingInboxThreadId) {
        var pendingId = window._htPendingInboxThreadId;
        window._htPendingInboxThreadId = null;
        for (var pi = 0; pi < allMessages.length; pi++) {
          if (allMessages[pi].id === pendingId && allMessages[pi].status !== 'deleted') {
            openThread(allMessages[pi]);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Inbox load exception:', err);
    }
  };

  /* ═══ RENDER FILTER TABS (K063 editorial) ═══ */
  function renderFilterTabs(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    FILTERS.forEach(function(f, idx) {
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.className = 'ib-tab-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '\u00B7';
        container.appendChild(sep);
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ib-tab' + (f.key === currentFilter ? ' is-active' : '');
      btn.dataset.filter = f.key;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', f.key === currentFilter ? 'true' : 'false');
      btn.textContent = f.label;
      btn.addEventListener('click', function() {
        currentFilter = f.key;
        var tabs = container.querySelectorAll('button.ib-tab');
        for (var i = 0; i < tabs.length; i++) {
          var active = tabs[i].dataset.filter === currentFilter;
          tabs[i].classList.toggle('is-active', active);
          tabs[i].setAttribute('aria-selected', active ? 'true' : 'false');
        }
        renderMessages();
      });
      container.appendChild(btn);
    });
  }

  /* ═══ RENDER MESSAGE LIST ═══ */
  function renderMessages() {
    var listEl = document.getElementById('inbox-list');
    var emptyEl = document.getElementById('inbox-empty');
    if (!listEl) return;

    var filtered;
    if (currentFilter === 'deleted') {
      filtered = allMessages.filter(function(m) { return m.status === 'deleted'; });
    } else if (currentFilter === 'unread') {
      filtered = allMessages.filter(function(m) {
        return m.status !== 'deleted' && m.is_unread;
      });
    } else if (currentFilter === 'all') {
      filtered = allMessages.filter(function(m) { return m.status !== 'deleted'; });
    } else {
      filtered = allMessages.filter(function(m) { return m.message_type === currentFilter && m.status !== 'deleted'; });
    }

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (filtered.length === 0) {
      if (emptyEl) {
        var et = emptyEl.querySelector('.empty-title');
        var ed = emptyEl.querySelector('.sub-text');
        if (currentFilter === 'deleted') {
          if (et) et.textContent = 'Silinen mesaj yok';
          if (ed) ed.textContent = 'Sildi\u011Finiz mesajlar burada g\u00F6r\u00FCnecek';
        } else {
          if (et) et.textContent = 'Hen\u00FCz mesaj\u0131n yok';
          if (ed) ed.textContent = '\u0130\u015Fveren mesajlar\u0131 burada g\u00F6r\u00FCnecek';
        }
        emptyEl.hidden = false;
      }
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    filtered.forEach(function(msg) { listEl.appendChild(buildConversationRow(msg)); });

    // Desktop: keep right pane consistent with filtered list
    if (isDesktop()) {
      var activeStillVisible = false;
      if (activeThreadMsgId) {
        for (var fi = 0; fi < filtered.length; fi++) {
          if (filtered[fi].id === activeThreadMsgId && filtered[fi].status !== 'deleted') { activeStillVisible = true; break; }
        }
      }
      if (!activeStillVisible) {
        activeThreadMsgId = null;
        var nonDeleted = filtered.filter(function(m) { return m.status !== 'deleted'; });
        if (nonDeleted.length > 0) {
          openThread(nonDeleted[0]);
        } else {
          // Show placeholder
          var rightPane = document.getElementById('inbox-right-pane');
          if (rightPane) {
            rightPane.textContent = '';
            var ph = document.createElement('div');
            ph.className = 'ib-thread-empty';
            ph.id = 'inbox-thread-placeholder';
            ph.textContent = 'Bir konu\u015Fma se\u00E7in';
            rightPane.appendChild(ph);
          }
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     BUILD CONVERSATION ROW — slim DM-style
     ═══════════════════════════════════════════════════════════════ */
  function buildConversationRow(msg) {
    var isUnread = msg.is_unread && msg.status !== 'deleted';
    var isDeleted = msg.status === 'deleted';
    var isActive = activeThreadMsgId && activeThreadMsgId == msg.id;
    var hasReply = msg.latest_reply !== null;

    var row = document.createElement('div');
    row.dataset.msgId = msg.id;
    row.className = 'ib-row' + (isUnread ? ' is-unread' : '') + (isActive ? ' is-active' : '');
    row.setAttribute('role', 'listitem');

    // Avatar
    var avatar = document.createElement('div');
    avatar.className = 'ib-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (msg.company_logo) {
      var img = document.createElement('img');
      img.src = msg.company_logo;
      img.alt = '';
      avatar.appendChild(img);
    } else {
      var initial = (msg.company_name || '\u0130').charAt(0).toUpperCase();
      avatar.textContent = initial;
    }
    row.appendChild(avatar);

    // Meta (sender + preview)
    var meta = document.createElement('div');
    meta.className = 'ib-meta';
    var nameEl = document.createElement('p');
    nameEl.className = 'ib-sender';
    nameEl.textContent = msg.company_name || '\u0130\u015Fveren';
    meta.appendChild(nameEl);

    var previewEl = document.createElement('p');
    previewEl.className = 'ib-preview';
    var previewText = msg.body || msg.title || '';
    if (hasReply) {
      previewText = msg.latest_sender === 'candidate' ? ('Sen: ' + msg.latest_reply.body) : (msg.company_name || '\u0130\u015Fveren') + ': ' + msg.latest_reply.body;
    }
    previewEl.textContent = previewText;
    meta.appendChild(previewEl);
    row.appendChild(meta);

    // Right column (time + actions)
    var rightCol = document.createElement('div');
    rightCol.className = 'ib-row-actions';
    var timeEl = document.createElement('span');
    timeEl.className = 'ib-time';
    timeEl.textContent = formatRowTime(msg.last_activity);
    rightCol.appendChild(timeEl);

    if (isDeleted) {
      var restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.className = 'ib-row-btn';
      restoreBtn.textContent = 'Geri Al';
      restoreBtn.addEventListener('click', function(e) { e.stopPropagation(); restoreMessage(msg.id); });
      rightCol.appendChild(restoreBtn);
    } else {
      var trashBtn = document.createElement('button');
      trashBtn.type = 'button';
      trashBtn.className = 'ib-row-trash';
      trashBtn.title = 'Sil';
      trashBtn.setAttribute('aria-label', 'Sil');
      trashBtn.textContent = '\u00D7';
      trashBtn.addEventListener('click', function(e) { e.stopPropagation(); softDeleteMessage(msg.id); });
      rightCol.appendChild(trashBtn);
    }
    row.appendChild(rightCol);

    row.addEventListener('click', function() {
      if (isDeleted) return;
      openThread(msg);
      if (isUnread) {
        if (msg.status === 'sent') markAsRead(msg.id);
        msg.status = 'read';
        msg.is_unread = false;
        msg.unread_followups = 0;
        renderMessages();
        updateUnreadBadges();
        preloadUnreadCount();
      }
    });
    return row;
  }

  /* ═══════════════════════════════════════════════════════════════
     OPEN THREAD — inline split-pane on desktop, sheet on mobile
     ═══════════════════════════════════════════════════════════════ */
  function isDesktop() { return window.innerWidth > 768; }

  function openThread(msg) {
    activeThreadMsgId = msg.id;

    // Highlight active row in list
    var rows = document.querySelectorAll('#inbox-list > .ib-row');
    for (var r = 0; r < rows.length; r++) {
      rows[r].classList.toggle('is-active', rows[r].dataset.msgId == msg.id);
    }

    if (isDesktop()) {
      openThreadInline(msg);
    } else {
      openThreadSheet(msg);
    }
  }

  function buildThreadContent(msg, container) {
    // Thread wrapper
    var thread = document.createElement('div');
    thread.className = 'ib-thread';

    // Header
    var header = document.createElement('div');
    header.className = 'ib-thread-head';

    var avi = document.createElement('div');
    avi.className = 'ib-avatar ib-avatar--lg';
    avi.setAttribute('aria-hidden', 'true');
    if (msg.company_logo) {
      var aviImg = document.createElement('img');
      aviImg.src = msg.company_logo;
      aviImg.alt = '';
      avi.appendChild(aviImg);
    } else {
      avi.textContent = (msg.company_name || '\u0130').charAt(0).toUpperCase();
    }
    header.appendChild(avi);

    var hInfo = document.createElement('div');
    hInfo.className = 'ib-thread-brand';
    if (msg.title) {
      var hEyebrow = document.createElement('span');
      hEyebrow.className = 'ib-thread-eyebrow';
      hEyebrow.textContent = msg.title;
      hInfo.appendChild(hEyebrow);
    }
    var hName = document.createElement('h2');
    hName.className = 'ib-thread-title';
    hName.textContent = msg.company_name || '\u0130\u015Fveren';
    hInfo.appendChild(hName);
    header.appendChild(hInfo);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ib-close';
    closeBtn.setAttribute('aria-label', 'Konu\u015Fmay\u0131 kapat');
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', function() {
      activeThreadMsgId = null;
      var rows = document.querySelectorAll('#inbox-list > .ib-row');
      for (var r = 0; r < rows.length; r++) rows[r].classList.remove('is-active');
      var rp = document.getElementById('inbox-right-pane');
      if (rp) {
        rp.textContent = '';
        var ph = document.createElement('div');
        ph.className = 'ib-thread-empty';
        ph.id = 'inbox-thread-placeholder';
        ph.textContent = 'Bir konu\u015Fma se\u00E7in';
        rp.appendChild(ph);
      }
    });
    header.appendChild(closeBtn);
    thread.appendChild(header);

    // Messages area
    var msgArea = document.createElement('div');
    msgArea.id = 'thread-messages';
    msgArea.className = 'ib-thread-body';
    var threadLoading = document.createElement('div');
    threadLoading.className = 'ib-daysep';
    threadLoading.textContent = 'Y\u00FCkleniyor\u2026';
    msgArea.appendChild(threadLoading);
    thread.appendChild(msgArea);

    // Composer
    var composerWrap = document.createElement('div');
    composerWrap.className = 'ib-composer-wrap';
    var cap = document.createElement('span');
    cap.className = 'ib-composer-cap';
    cap.textContent = 'YANITIN \u0130\u015EVERENE ANINDA \u0130LET\u0130L\u0130R';
    composerWrap.appendChild(cap);

    var composer = document.createElement('form');
    composer.className = 'ib-composer';
    composer.addEventListener('submit', function(e) { e.preventDefault(); });

    var textarea = document.createElement('textarea');
    textarea.placeholder = 'Mesaj\u0131n\u0131 yaz\u2026';
    textarea.maxLength = 5000;
    textarea.rows = 4;
    textarea.setAttribute('aria-label', 'Mesaj\u0131n\u0131 yaz');
    composer.appendChild(textarea);

    var sendBtn = document.createElement('button');
    sendBtn.type = 'submit';
    sendBtn.className = 'ib-send';
    sendBtn.textContent = 'G\u00F6nder';
    composer.appendChild(sendBtn);
    composerWrap.appendChild(composer);

    var statusMsg = document.createElement('div');
    statusMsg.id = 'thread-status-msg';
    statusMsg.className = 'ib-status';
    composerWrap.appendChild(statusMsg);

    thread.appendChild(composerWrap);
    container.appendChild(thread);

    loadThread(msg.id, msgArea, msg);
    sendBtn.addEventListener('click', function() { sendReply(msg.id, textarea, sendBtn, statusMsg, msgArea, msg); });
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(msg.id, textarea, sendBtn, statusMsg, msgArea, msg); }
    });
  }

  /* ── Desktop: render thread inline in right pane ── */
  function openThreadInline(msg) {
    var existing = document.getElementById('inbox-expanded');
    if (existing) existing.remove();

    var rightPane = document.getElementById('inbox-right-pane');
    if (!rightPane) return;
    rightPane.textContent = '';
    rightPane.style.display = 'flex';
    buildThreadContent(msg, rightPane);
  }

  /* ── Mobile: sheet overlay ── */
  function openThreadSheet(msg) {
    var existing = document.getElementById('inbox-expanded');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'inbox-expanded';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:900;display:flex;align-items:flex-end;justify-content:center;padding:0;';

    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--bg-surface,white);width:100%;max-width:480px;max-height:90vh;max-height:90dvh;height:100%;border-radius:16px 16px 0 0;display:flex;flex-direction:column;box-shadow:0 -4px 40px rgba(0,0,0,0.12);';

    // Back button for mobile
    var backRow = document.createElement('div');
    backRow.style.cssText = 'padding:10px 14px 0;flex-shrink:0;';
    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.style.cssText = 'background:none;border:none;font-size:16px;cursor:pointer;color:var(--text-muted,#6B7280);padding:4px 8px;line-height:1;';
    backBtn.textContent = '\u2190 Geri';
    backBtn.onclick = function() { overlay.remove(); activeThreadMsgId = null; };
    backRow.appendChild(backBtn);
    sheet.appendChild(backRow);

    buildThreadContent(msg, sheet);

    overlay.appendChild(sheet);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); activeThreadMsgId = null; } });
    document.body.appendChild(overlay);
  }

  /* ═══════════════════════════════════════════════════════════════
     LOAD THREAD via get_message_thread RPC
     ═══════════════════════════════════════════════════════════════ */
  async function loadThread(messageId, container, msg) {
    var supa = getSupa();
    if (!supa) return;
    try {
      var res = await supa.rpc('get_message_thread', { p_message_id: messageId });
      // Mark employer follow-up replies as read (fire and forget)
      supa.rpc('mark_employer_replies_read', { p_message_id: messageId }).then(function(){}).catch(function(){});
      if (res.error) {
        console.error('Load thread error:', res.error.message);
        container.textContent = '';
        var errEl = document.createElement('div');
        errEl.style.cssText = 'text-align:center;padding:24px;color:#DC2626;font-size:13px;';
        errEl.textContent = 'Mesaj y\u00FCklenemedi.';
        container.appendChild(errEl);
        return;
      }

      container.textContent = '';
      var items = res.data || [];
      if (items.length === 0) return;

      var lastDate = null;
      // Find last candidate reply for read receipt
      var lastCandidateReply = null;
      for (var k = items.length - 1; k >= 0; k--) {
        if (items[k].sender === 'candidate') { lastCandidateReply = items[k]; break; }
      }

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        // Date separator
        if (!lastDate || !isSameDay(lastDate, item.created_at)) {
          var sep = document.createElement('div');
          sep.className = 'ib-daysep';
          sep.textContent = dateSeparatorLabel(item.created_at);
          container.appendChild(sep);
          lastDate = item.created_at;
        }

        var isEmp = item.sender === 'employer';
        var msgEl = document.createElement('article');
        msgEl.className = 'ib-msg ' + (isEmp ? 'ib-msg--in' : 'ib-msg--out');

        var cap = document.createElement('span');
        cap.className = 'ib-cap';
        var who = isEmp ? ((msg.company_name || '\u0130\u015EVEREN').toUpperCase()) : 'SEN';
        cap.textContent = who + ' \u00B7 ' + timeAgo(item.created_at).toUpperCase();
        msgEl.appendChild(cap);

        var bubble = document.createElement('div');
        bubble.className = 'ib-bubble';
        var pBody = document.createElement('p');
        pBody.textContent = item.body;
        bubble.appendChild(pBody);
        msgEl.appendChild(bubble);
        // Read receipt — only on last candidate reply
        if (!isEmp && lastCandidateReply && item.item_id === lastCandidateReply.item_id) {
          var stamp = document.createElement('span');
          stamp.className = 'ib-stamp';
          stamp.textContent = item.read_at ? 'G\u00D6R\u00DCLD\u00DC' : '\u0130LET\u0130LD\u0130';
          msgEl.appendChild(stamp);
        }
        container.appendChild(msgEl);
      }
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Load thread exception:', err);
    }
  }

  /* ═══ APPEND MESSAGE (for optimistic + realtime) ═══ */
  function appendBubble(container, text, sender, time) {
    var isEmp = sender === 'employer';
    var msgEl = document.createElement('article');
    msgEl.className = 'ib-msg ' + (isEmp ? 'ib-msg--in' : 'ib-msg--out');
    var cap = document.createElement('span');
    cap.className = 'ib-cap';
    cap.textContent = (isEmp ? '\u0130\u015EVEREN' : 'SEN') + ' \u00B7 ' + (time || 'AZ \u00D6NCE');
    msgEl.appendChild(cap);
    var bubble = document.createElement('div');
    bubble.className = 'ib-bubble';
    var pBody = document.createElement('p');
    pBody.textContent = text;
    bubble.appendChild(pBody);
    msgEl.appendChild(bubble);
    container.appendChild(msgEl);
  }

  function isNearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
  }

  /* ═══ SEND REPLY (optimistic) ═══ */
  async function sendReply(messageId, textarea, sendBtn, statusEl, msgArea, msg) {
    var supa = getSupa();
    if (!supa) return;
    var body = textarea.value.trim();
    if (!body) return;

    // Optimistic: append bubble immediately
    var wasNearBottom = isNearBottom(msgArea);
    appendBubble(msgArea, body, 'candidate');
    // Add optimistic receipt
    var optReceipt = document.createElement('div');
    optReceipt.className = 'ib-stamp';
    optReceipt.style.textAlign = 'right';
    optReceipt.textContent = 'G\u00D6NDER\u0130L\u0130YOR\u2026';
    optReceipt.id = 'opt-receipt';
    msgArea.appendChild(optReceipt);
    if (wasNearBottom) scrollToBottom(msgArea);

    textarea.value = '';
    textarea.style.height = 'auto';
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.6';

    try {
      var res = await supa.rpc('send_candidate_reply', { p_message_id: messageId, p_body: body });
      sendBtn.disabled = false; sendBtn.style.opacity = '1';
      var or = document.getElementById('opt-receipt');
      if (res.error) {
        console.error('Send reply error:', res.error.message);
        if (or) { or.textContent = 'Hata! Tekrar deneyin.'; or.style.color = '#DC2626'; }
        return;
      }
      if (or) or.textContent = '\u0130LET\u0130LD\u0130';
      // Update local preview
      for (var i = 0; i < allMessages.length; i++) {
        if (allMessages[i].id === messageId) {
          allMessages[i].latest_reply = { body: body, created_at: new Date().toISOString(), read_at: null };
          allMessages[i].latest_sender = 'candidate';
          allMessages[i].last_activity = new Date().toISOString();
          allMessages[i].is_unread = false;
          break;
        }
      }
      renderMessages();
    } catch (err) {
      console.error('Send reply exception:', err);
      sendBtn.disabled = false; sendBtn.style.opacity = '1';
      var or2 = document.getElementById('opt-receipt');
      if (or2) { or2.textContent = 'Hata! Tekrar deneyin.'; or2.style.color = '#DC2626'; }
    }
  }

  /* ═══ MARK AS READ ═══ */
  async function markAsRead(messageId) {
    var supa = getSupa();
    if (!supa) return;
    try {
      var res = await supa.rpc('mark_message_read', { p_message_id: messageId });
      if (res.error) console.error('Mark as read error:', res.error.message);
    } catch (err) { console.error('Mark as read exception:', err); }
  }

  /* ═══ SOFT DELETE / RESTORE ═══ */
  async function softDeleteMessage(messageId) {
    var supa = getSupa();
    if (!supa) return;
    try {
      var res = await supa.from('employer_messages').update({ status: 'deleted' }).eq('id', messageId);
      if (res.error) { console.error('Soft delete error:', res.error.message); return; }
      for (var i = 0; i < allMessages.length; i++) { if (allMessages[i].id === messageId) { allMessages[i].status = 'deleted'; break; } }
      renderMessages(); updateUnreadBadges(); preloadUnreadCount();
    } catch (err) { console.error('Soft delete exception:', err); }
  }

  async function restoreMessage(messageId) {
    var supa = getSupa();
    if (!supa) return;
    try {
      var res = await supa.from('employer_messages').update({ status: 'read' }).eq('id', messageId);
      if (res.error) { console.error('Restore error:', res.error.message); return; }
      for (var i = 0; i < allMessages.length; i++) { if (allMessages[i].id === messageId) { allMessages[i].status = 'read'; break; } }
      renderMessages(); updateUnreadBadges(); preloadUnreadCount();
    } catch (err) { console.error('Restore exception:', err); }
  }

  /* ═══ UNREAD BADGES ═══ */
  function updateUnreadBadges() {
    var c = 0;
    var total = 0;
    var lastTs = null;
    for (var i = 0; i < allMessages.length; i++) {
      var m = allMessages[i];
      if (m.status === 'deleted') continue;
      total++;
      if (m.is_unread) c++;
      if (m.last_activity && (!lastTs || new Date(m.last_activity) > new Date(lastTs))) lastTs = m.last_activity;
    }
    var sb = document.getElementById('badge-inbox-unread');
    if (sb) { sb.textContent = c > 99 ? '99+' : c; sb.style.display = c > 0 ? '' : 'none'; }
    var bb = document.getElementById('badge-inbox-bn');
    if (bb) { bb.textContent = c > 9 ? '9+' : c; bb.style.display = c > 0 ? 'flex' : 'none'; }
    var pb = document.getElementById('inbox-unread-badge');
    if (pb) { pb.textContent = String(c); }
    var tb = document.getElementById('inbox-total');
    if (tb) { tb.textContent = String(total); }
    var lb = document.getElementById('inbox-last-time');
    if (lb) {
      if (lastTs) {
        var d = new Date(lastTs);
        var day = d.getDate();
        var mon = TR_MONTHS[d.getMonth()].toUpperCase();
        var hh = d.getHours(); var mm = d.getMinutes();
        lb.textContent = day + ' ' + mon + ' \u00B7 ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
      } else {
        lb.textContent = '\u2014';
      }
    }
  }

  /* ═══ PRELOAD UNREAD COUNT (canonical — uses server RPC) ═══ */
  async function preloadUnreadCount() {
    var supa = getSupa();
    if (!supa) return;
    try {
      var res = await supa.rpc('get_candidate_unread_count');
      var c = (res.data !== null && res.data !== undefined) ? res.data : 0;
      if (res.error) {
        // Fallback to old method if RPC not deployed yet
        var fallback = await supa.from('employer_messages').select('id', { count: 'exact', head: true }).eq('status', 'sent');
        c = fallback.count || 0;
      }
      applyUnreadCountToUI(c);
    } catch (err) { console.error('Inbox preload error:', err); }
  }

  function applyUnreadCountToUI(c) {
    var sb = document.getElementById('badge-inbox-unread');
    if (sb) { sb.textContent = c > 99 ? '99+' : c; sb.style.display = c > 0 ? '' : 'none'; }
    var bb = document.getElementById('badge-inbox-bn');
    if (bb) { bb.textContent = c > 9 ? '9+' : c; bb.style.display = c > 0 ? 'flex' : 'none'; }
    var md = document.getElementById('header-msg-dot');
    if (md) md.style.display = c > 0 ? '' : 'none';
  }

  /* ═══ HEADER POPUP: Message preview (uses canonical allMessages) ═══ */
  window._htLoadMsgPreview = async function() {
    var listEl = document.getElementById('popup-msg-list');
    if (!listEl) return;

    // Always refresh canonical data when popup opens
    await window._htLoadInbox();

    listEl.textContent = '';
    var threads = allMessages.filter(function(m) { return m.status !== 'deleted'; }).slice(0, 5);
    if (threads.length === 0) { var e = document.createElement('div'); e.className = 'header-popup-empty'; e.textContent = 'Hen\u00FCz mesaj yok.'; listEl.appendChild(e); return; }

    threads.forEach(function(m) {
      var u = m.is_unread;
      var item = document.createElement('div');
      item.className = 'header-popup-item' + (u ? ' unread' : '');
      var icon = document.createElement('div'); icon.className = 'header-popup-icon'; icon.style.background = '#FEF7F5'; icon.textContent = '\uD83D\uDCBC';
      var info = document.createElement('div'); info.className = 'header-popup-info';
      var sender = document.createElement('div'); sender.className = 'header-popup-sender'; sender.textContent = m.company_name || '\u0130\u015Fveren';
      var preview = document.createElement('div'); preview.className = 'header-popup-preview';
      var prevText = m.body || m.title || '';
      if (m.latest_reply) {
        prevText = m.latest_sender === 'candidate' ? 'Sen: ' + m.latest_reply.body : (m.company_name || '\u0130\u015Fveren') + ': ' + m.latest_reply.body;
      }
      preview.textContent = prevText.substring(0, 60);
      info.appendChild(sender); info.appendChild(preview);
      var right = document.createElement('div'); right.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;';
      var time = document.createElement('div'); time.className = 'header-popup-time'; time.textContent = timeAgo(m.last_activity);
      right.appendChild(time);
      if (u) { var dot = document.createElement('div'); dot.className = 'header-popup-unread-dot'; right.appendChild(dot); }
      item.appendChild(icon); item.appendChild(info); item.appendChild(right);
      /* K071: capture thread id so switching to #inbox auto-opens it. */
      (function(threadId){
        item.addEventListener('click', function() {
          closeAllPopups();
          window._htPendingInboxThreadId = threadId;
          if (typeof switchPanel === 'function') switchPanel('inbox');
        });
      })(m.id);
      listEl.appendChild(item);
    });
  };

  /* K030 FAZ C: drawer duyuru mini-feed preview (last 5 announcements) */
  var CATEGORY_LABELS = { feature:'Yenilik', sirket:'Şirket', ipucu:'İpucu', genel:'Genel' };
  function trRelativeDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'az önce';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + ' dk';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + ' sa';
    if (diffSec < 604800) return Math.floor(diffSec / 86400) + ' gün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  window._htLoadDuyuruPreview = async function () {
    var listEl = document.getElementById('popup-duyuru-list');
    if (!listEl) return;
    var supa = getSupa();
    if (!supa) return;
    listEl.innerHTML = '';
    var loading = document.createElement('div');
    loading.className = 'header-popup-empty';
    loading.textContent = 'Yükleniyor...';
    listEl.appendChild(loading);
    try {
      var res = await supa.rpc('get_announcements_feed', { p_limit: 5, p_offset: 0 });
      if (res.error) { loading.textContent = 'Yüklenemedi.'; return; }
      var rows = res.data || [];
      listEl.innerHTML = '';
      if (rows.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'header-popup-empty';
        empty.textContent = 'Henüz duyuru yok.';
        listEl.appendChild(empty);
        return;
      }
      rows.forEach(function (post) {
        var item = document.createElement('div');
        item.className = 'header-popup-item header-popup-item--duyuru';
        var meta = document.createElement('div');
        meta.className = 'header-popup-duyuru-meta';
        var chip = document.createElement('span');
        chip.className = 'header-popup-duyuru-chip';
        chip.textContent = CATEGORY_LABELS[post.category] || 'Genel';
        meta.appendChild(chip);
        var time = document.createElement('div');
        time.className = 'header-popup-time';
        time.textContent = trRelativeDate(post.published_at);
        meta.appendChild(time);
        item.appendChild(meta);
        var title = document.createElement('div');
        title.className = 'header-popup-duyuru-title';
        title.textContent = post.title || '(başlıksız)';
        item.appendChild(title);
        if (post.body_md) {
          var body = document.createElement('div');
          body.className = 'header-popup-duyuru-body';
          body.textContent = String(post.body_md).replace(/[#*_`>]/g, '').substring(0, 160);
          item.appendChild(body);
        }
        item.addEventListener('click', function () {
          closeAllPopups();
          try { sessionStorage.setItem('ht_bildirim_tab', 'duyuru'); } catch (e) { /* ignore */ }
          if (typeof switchPanel === 'function') switchPanel('bildirimler');
        });
        listEl.appendChild(item);
      });
    } catch (e) {
      loading.textContent = 'Hata: ' + (e && e.message);
    }
  };

  /* ═══ HEADER POPUP: Notification preview (canonical source) ═══ */
  window._htLoadNotifPreview = async function() {
    var listEl = document.getElementById('popup-notif-list');
    if (!listEl) return;
    listEl.textContent = '';
    var items;
    try { items = await _fetchNotifData(); } catch(e) { console.error('[notif] preview fetch error:', e); items = []; }
    if (items.length === 0) {
      var emptyDiv = document.createElement('div');
      emptyDiv.className = 'header-popup-empty';
      emptyDiv.textContent = 'Hen\u00FCz bildirim yok.';
      listEl.appendChild(emptyDiv);
      return;
    }
    items.slice(0, 5).forEach(function(notif) {
      var item = document.createElement('div');
      item.className = 'header-popup-item' + (notif.is_unread ? ' unread' : '');
      var icon = document.createElement('div');
      icon.className = 'header-popup-icon';
      icon.style.background = notif.notif_type === 'koc' ? '#EEF2FF' : '#FEF7F5';
      icon.textContent = notif.notif_type === 'koc' ? '\uD83C\uDF93' : '\uD83C\uDF81';
      var info = document.createElement('div'); info.className = 'header-popup-info';
      var titleEl = document.createElement('div'); titleEl.className = 'header-popup-sender'; titleEl.textContent = notif.title;
      var preview = document.createElement('div'); preview.className = 'header-popup-preview'; preview.textContent = (notif.body || '').substring(0, 60);
      info.appendChild(titleEl); info.appendChild(preview);
      var right = document.createElement('div'); right.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;';
      var time = document.createElement('div'); time.className = 'header-popup-time'; time.textContent = timeAgo(notif.created_at);
      right.appendChild(time);
      if (notif.is_unread) { var dot = document.createElement('div'); dot.className = 'header-popup-unread-dot'; right.appendChild(dot); }
      item.appendChild(icon); item.appendChild(info); item.appendChild(right);
      /* K071: type-based routing table. 'studio' was a dead name.
         Default routes to #bildirimler (full notif list) unless the type
         has a specific destination. */
      var NOTIF_ROUTING = {
        koc: 'mulakat',
        is_teklifi: 'teklifler',
        teklif: 'teklifler',
        mesaj: 'inbox',
        message: 'inbox'
      };
      var targetPanel = NOTIF_ROUTING[notif.notif_type] || 'bildirimler';
      item.addEventListener('click', function() { closeAllPopups(); if (typeof switchPanel === 'function') switchPanel(targetPanel); });
      listEl.appendChild(item);
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     HEADER POPUP: Toggle + close logic
     ═══════════════════════════════════════════════════════════════ */
  function closeAllPopups() {
    var popups = document.querySelectorAll('.header-popup');
    for (var i = 0; i < popups.length; i++) popups[i].style.display = 'none';
  }
  window._htCloseAllPopups = closeAllPopups;

  function togglePopup(popupId, loadFn) {
    var popup = document.getElementById(popupId);
    if (!popup) return;
    var isOpen = popup.style.display !== 'none';
    // Use window._htCloseAllPopups (wraps avatar dropdown close from profil-events.js)
    if (window._htCloseAllPopups) window._htCloseAllPopups(); else closeAllPopups();
    if (!isOpen) { popup.style.display = ''; if (loadFn) loadFn(); }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var msgBtn = document.getElementById('header-msg');
    if (msgBtn) msgBtn.addEventListener('click', function(e) { e.stopPropagation(); togglePopup('popup-messages', window._htLoadMsgPreview); });

    var notifBtn = document.getElementById('header-notif');
    if (notifBtn) notifBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      togglePopup('popup-notifications', function () {
        /* Preload both panels in parallel; segment tab controls visibility */
        if (typeof window._htLoadNotifPreview === 'function') window._htLoadNotifPreview();
        if (typeof window._htLoadDuyuruPreview === 'function') window._htLoadDuyuruPreview();
      });
    });

    /* K030 FAZ C: drawer segment tab handler (Bildirimler ↔ Duyurular) */
    var drawerSeg = document.querySelector('.header-popup-seg[data-drawer-seg]');
    if (drawerSeg) {
      var drawerBtns = drawerSeg.querySelectorAll('button[data-drawer-tab]');
      for (var di = 0; di < drawerBtns.length; di++) {
        drawerBtns[di].addEventListener('click', function (ev) {
          ev.stopPropagation();
          var tab = ev.currentTarget.getAttribute('data-drawer-tab');
          for (var bi = 0; bi < drawerBtns.length; bi++) {
            var active = drawerBtns[bi].getAttribute('data-drawer-tab') === tab;
            drawerBtns[bi].classList.toggle('is-active', active);
            drawerBtns[bi].setAttribute('aria-selected', active ? 'true' : 'false');
          }
          var bildirimList = document.getElementById('popup-notif-list');
          var duyuruList = document.getElementById('popup-duyuru-list');
          if (bildirimList) bildirimList.hidden = (tab !== 'bildirim');
          if (duyuruList) duyuruList.hidden = (tab !== 'duyuru');
          /* Active tab badge cleared when user looks at it */
          if (tab === 'duyuru') {
            var badge = drawerSeg.querySelector('[data-drawer-badge="duyuru"]');
            if (badge) { badge.hidden = true; badge.textContent = ''; }
            /* Duyuru tab click = explicit seen intent */
            try { localStorage.setItem('ht_last_duyuru_seen', new Date().toISOString()); } catch (e) { /* ignore */ }
            window._htDuyuruUnreadCount = 0;
            if (typeof window._htApplyNotifBellDot === 'function') window._htApplyNotifBellDot();
          }
        });
      }
    }

    /* K030 FAZ C: drawer badge refresh hook — called whenever unread state changes */
    window._htApplyDrawerBadges = function () {
      var bBadge = document.querySelector('.header-popup-seg [data-drawer-badge="bildirim"]');
      var dBadge = document.querySelector('.header-popup-seg [data-drawer-badge="duyuru"]');
      if (bBadge) {
        var bCount = 0;
        for (var ni = 0; ni < allNotifs.length; ni++) if (allNotifs[ni].is_unread) bCount++;
        if (bCount > 0) { bBadge.textContent = bCount > 9 ? '9+' : String(bCount); bBadge.hidden = false; }
        else { bBadge.hidden = true; bBadge.textContent = ''; }
      }
      if (dBadge) {
        var dCount = (typeof window._htDuyuruUnreadCount === 'number') ? window._htDuyuruUnreadCount : 0;
        if (dCount > 0) { dBadge.textContent = dCount > 9 ? '9+' : String(dCount); dBadge.hidden = false; }
        else { dBadge.hidden = true; dBadge.textContent = ''; }
      }
    };

    /* K071: header-kimbakti click is bound once in profil-events.js.
       Duplicate binding here removed to avoid history.pushState doubling. */

    var seeAllMsg = document.getElementById('popup-msg-see-all');
    if (seeAllMsg) seeAllMsg.addEventListener('click', function(e) { e.preventDefault(); closeAllPopups(); if (typeof switchPanel === 'function') switchPanel('inbox'); });

    var seeAllNotif = document.getElementById('popup-notif-see-all');
    if (seeAllNotif) seeAllNotif.addEventListener('click', function(e) {
      e.preventDefault();
      /* Route to the panel with the tab that's currently active in the drawer */
      var activeBtn = document.querySelector('.header-popup-seg[data-drawer-seg] button.is-active');
      var targetTab = activeBtn && activeBtn.getAttribute('data-drawer-tab') === 'duyuru' ? 'duyuru' : 'bildirim';
      try { sessionStorage.setItem('ht_bildirim_tab', targetTab); } catch (err) { /* ignore */ }
      closeAllPopups();
      if (typeof switchPanel === 'function') switchPanel('bildirimler');
    });

    // Outside click closes popups
    document.addEventListener('click', function(e) {
      var isInside = e.target.closest('.header-popup') || e.target.closest('.header-msg') || e.target.closest('.header-notif');
      if (!isInside) closeAllPopups();
    });

    // Escape closes header popups (only when no modal is open)
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var hasModal = document.querySelector('.ht-modal__overlay.show') || document.getElementById('inbox-expanded');
        if (!hasModal) closeAllPopups();
      }
    });

    // Preload badges after page settles
    setTimeout(preloadUnreadCount, 2500);
    // Preload notification bell dot (non-blocking)
    setTimeout(function() {
      _fetchNotifData().then(function(items) { allNotifs = items; _applyNotifBellDot(); }).catch(function() {});
    }, 3000);
  });

  /* ═══════════════════════════════════════════════════════════════
     BILDIRIMLER PANEL (full notification center)
     Sources: coach_posts (published) + campaigns (active)
     Inbox messages and Kim Bakti stay in their own channels.
     ═══════════════════════════════════════════════════════════════ */
  var notifLoaded = false;
  var allNotifs = [];
  var notifFilter = 'all';

  /* Notification data cache — shared by popup preview and full panel */
  var _notifCache = null;
  var _notifCacheTsMs = 0;
  var _notifFetchPromise = null;
  var _NOTIF_TTL_MS = 5 * 60 * 1000; /* 5-minute TTL */

  /**
   * Fetch canonical notification data from real product sources.
   * Returns array of notif objects: { id, notif_type, title, body, created_at, is_unread, company_logo }
   * Caches for _NOTIF_TTL_MS. Safe to call from both preview and full panel.
   */
  async function _fetchNotifData() {
    if (_notifFetchPromise) return _notifFetchPromise;
    if (_notifCache !== null && (Date.now() - _notifCacheTsMs) < _NOTIF_TTL_MS) return _notifCache;
    _notifFetchPromise = (async function() {
      var supa = getSupa();
      if (!supa) { _notifFetchPromise = null; return []; }
      var lastSeen = null;
      try { lastSeen = localStorage.getItem('ht_notif_last_seen'); } catch(e) {}
      var results = [];
      /* Source 1: Published coach posts */
      try {
        var postsRes = await supa
          .from('coach_posts')
          .select('id, title, excerpt, category, published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(10);
        if (!postsRes.error && postsRes.data) {
          postsRes.data.forEach(function(p) {
            if (!p.published_at) return;
            results.push({
              id: 'koc_' + p.id,
              notif_type: 'koc',
              title: p.title || 'Ko\u00E7 i\u00E7eri\u011Fi',
              body: p.excerpt || (p.category ? p.category + ' kategorisinde yeni i\u00E7erik' : 'Yeni ko\u00E7 i\u00E7eri\u011Fi'),
              created_at: p.published_at,
              is_unread: lastSeen ? (new Date(p.published_at) > new Date(lastSeen)) : true,
              company_logo: null
            });
          });
        }
      } catch(e) { console.error('[notif] coach_posts fetch error:', e); }
      /* Source 2: Active campaigns */
      try {
        var campRes = await supa
          .from('campaigns')
          .select('id, title, short_desc, start_date, created_at')
          .eq('status', 'active')
          .order('start_date', { ascending: false })
          .limit(10);
        if (!campRes.error && campRes.data) {
          campRes.data.forEach(function(c) {
            var dt = c.start_date || c.created_at;
            if (!dt) return;
            results.push({
              id: 'kampanya_' + c.id,
              notif_type: 'kampanya',
              title: c.title || 'Yeni kampanya',
              body: c.short_desc || 'Yeni kampanya mevcut',
              created_at: dt,
              is_unread: lastSeen ? (new Date(dt) > new Date(lastSeen)) : true,
              company_logo: null
            });
          });
        }
      } catch(e) { console.error('[notif] campaigns fetch error:', e); }
      /* Sort by date descending */
      results.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      _notifCache = results;
      _notifCacheTsMs = Date.now();
      _notifFetchPromise = null;
      return results;
    })();
    return _notifFetchPromise;
  }

  function _applyNotifBellDot() {
    var unread = 0;
    for (var i = 0; i < allNotifs.length; i++) { if (allNotifs[i].is_unread) unread++; }
    /* K030 FAZ C hotfix: duyuru unread count also contributes to header bell dot */
    var duyuruUnread = (typeof window._htDuyuruUnreadCount === 'number') ? window._htDuyuruUnreadCount : 0;
    var total = unread + duyuruUnread;
    var dot = document.getElementById('header-notif-dot');
    if (dot) dot.style.display = total > 0 ? '' : 'none';
    var navBadge = document.getElementById('badge-bildirimler');
    if (navBadge) { navBadge.textContent = total > 9 ? '9+' : String(total); navBadge.style.display = total > 0 ? '' : 'none'; }
    /* K030 FAZ C: refresh drawer segment badges too */
    if (typeof window._htApplyDrawerBadges === 'function') window._htApplyDrawerBadges();
  }
  /* Expose for segment toggle IIFE (profil-inbox.js bottom) — allows duyuru count
   * updates to bubble into the header bell dot + sidebar badge. */
  window._htApplyNotifBellDot = _applyNotifBellDot;

  var NOTIF_FILTERS = [
    { key: 'all',      label: 'T\u00FCm\u00FC' },
    { key: 'unread',   label: 'Okunmam\u0131\u015F' },
    { key: 'koc',      label: 'Ko\u00E7 \u0130\u00E7eri\u011Fi' },
    { key: 'kampanya', label: 'Kampanyalar' }
  ];

  window._htLoadBildirimler = async function() {
    var listEl = document.getElementById('notif-list');
    var emptyEl = document.getElementById('notif-empty');
    var tabsEl = document.getElementById('notif-tabs');
    if (!listEl) return;
    var items;
    try { items = await _fetchNotifData(); } catch(e) { console.error('[notif] panel fetch error:', e); items = []; }
    allNotifs = items;
    notifLoaded = true;
    /* Mark as seen — invalidate cache so next fetch re-evaluates is_unread */
    try { localStorage.setItem('ht_notif_last_seen', new Date().toISOString()); } catch(e) {}
    _notifCache = null;
    /* Clear unread state on current items immediately — do not wait for cache refetch */
    for (var i = 0; i < allNotifs.length; i++) { allNotifs[i].is_unread = false; }
    /* Render filter tabs */
    if (tabsEl) {
      while (tabsEl.firstChild) tabsEl.removeChild(tabsEl.firstChild);
      renderNotifTabs(tabsEl);
    }
    renderNotifs();
    updateNotifPanelBadge();
    _applyNotifBellDot();
  };

  function renderNotifTabs(container) {
    NOTIF_FILTERS.forEach(function(f, idx) {
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.className = 'bd-mode__sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '\u00B7';
        container.appendChild(sep);
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bd-subfilter__btn' + (f.key === notifFilter ? ' is-active' : '');
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', f.key === notifFilter ? 'true' : 'false');
      btn.addEventListener('click', function() {
        notifFilter = f.key;
        var tabs = container.querySelectorAll('button.bd-subfilter__btn');
        for (var i = 0; i < tabs.length; i++) {
          var a = tabs[i].dataset.filter === notifFilter;
          tabs[i].classList.toggle('is-active', a);
          tabs[i].setAttribute('aria-selected', a ? 'true' : 'false');
        }
        renderNotifs();
      });
      container.appendChild(btn);
    });
  }

  function renderNotifs() {
    var listEl = document.getElementById('notif-list');
    var emptyEl = document.getElementById('notif-empty');
    if (!listEl) return;

    var filtered;
    if (notifFilter === 'unread') {
      filtered = allNotifs.filter(function(n) { return n.is_unread; });
    } else if (notifFilter === 'koc') {
      filtered = allNotifs.filter(function(n) { return n.notif_type === 'koc'; });
    } else if (notifFilter === 'kampanya') {
      filtered = allNotifs.filter(function(n) { return n.notif_type === 'kampanya'; });
    } else {
      filtered = allNotifs;
    }

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    if (filtered.length === 0) { if (emptyEl) emptyEl.removeAttribute('hidden'); return; }
    if (emptyEl) emptyEl.setAttribute('hidden', '');
    filtered.forEach(function(notif) { listEl.appendChild(buildNotifCard(notif)); });
  }

  function buildNotifCard(notif) {
    var isUnread = !!notif.is_unread;
    var card = document.createElement('div');
    card.className = 'bd-row' + (isUnread ? ' is-unread' : '');
    card.setAttribute('role', 'listitem');

    var iconEl = document.createElement('div');
    iconEl.className = 'bd-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    if (notif.company_logo) {
      var img = document.createElement('img');
      img.src = notif.company_logo;
      img.alt = '';
      iconEl.appendChild(img);
    } else if (notif.notif_type === 'mesaj') {
      iconEl.textContent = 'M';
    } else if (notif.notif_type === 'koc') {
      iconEl.textContent = 'K';
    } else if (notif.notif_type === 'kampanya') {
      iconEl.textContent = 'T';
    } else {
      iconEl.textContent = 'B';
    }
    card.appendChild(iconEl);

    var content = document.createElement('div');
    content.className = 'bd-content';
    var titleEl = document.createElement('div');
    titleEl.className = 'bd-title';
    titleEl.textContent = notif.title || '';
    content.appendChild(titleEl);
    var bodyEl = document.createElement('div');
    bodyEl.className = 'bd-desc';
    bodyEl.textContent = notif.body || '';
    content.appendChild(bodyEl);
    card.appendChild(content);

    var timeEl = document.createElement('time');
    timeEl.className = 'bd-time';
    timeEl.textContent = (timeAgo(notif.created_at) || '').toLocaleUpperCase('tr-TR');
    card.appendChild(timeEl);

    card.addEventListener('click', function() {
      if (typeof switchPanel === 'function') {
        if (notif.notif_type === 'koc') switchPanel('studio');
        else if (notif.notif_type === 'kampanya') switchPanel('teklifler');
      }
    });
    return card;
  }

  function updateNotifPanelBadge() {
    /* Reads is_unread from allNotifs. Populates notif-unread-badge + meta IDs. */
    var badge = document.getElementById('notif-unread-badge');
    var unread = 0;
    var weekCount = 0;
    var latestTs = null;
    var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (var i = 0; i < allNotifs.length; i++) {
      if (allNotifs[i].is_unread) unread++;
      var t = allNotifs[i].created_at ? new Date(allNotifs[i].created_at).getTime() : 0;
      if (t && t >= weekAgo) weekCount++;
      if (t && (latestTs === null || t > latestTs)) latestTs = t;
    }
    if (badge) { badge.textContent = String(unread); }
    var weekEl = document.getElementById('notif-week-count');
    if (weekEl) { weekEl.textContent = String(weekCount); }
    var lastEl = document.getElementById('notif-last-time');
    if (lastEl) {
      lastEl.textContent = latestTs
        ? (timeAgo(new Date(latestTs).toISOString()) || '').toLocaleUpperCase('tr-TR')
        : '\u2014';
    }
    var bildirimCountEl = document.querySelector('[data-bildirim-count]');
    if (bildirimCountEl) { bildirimCountEl.textContent = String(allNotifs.length); }
  }

  /* ═══════════════════════════════════════════════════════════════
     REALTIME: Live-chat subscriptions (auth-ready, no fixed delay)
     ═══════════════════════════════════════════════════════════════ */
  var _refreshTimer = null;
  var _realtimeChannel = null;
  function debouncedRefresh() {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(function() {
      _refreshTimer = null;
      preloadUnreadCount();
      var inboxPanel = document.getElementById('panel-inbox');
      if (inboxPanel && inboxPanel.classList.contains('active')) {
        loaded = false;
        window._htLoadInbox(currentFilter);
      }
    }, 500);
  }

  function setupRealtimeInbox() {
    var supa = getSupa();
    if (!supa || !supa.channel) return;

    // Singleton guard: do not create duplicate channels
    if (_realtimeChannel) return;

    _realtimeChannel = supa.channel('inbox-live');
    _realtimeChannel
      // Root employer messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employer_messages' }, function() {
        debouncedRefresh();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employer_messages' }, function() {
        preloadUnreadCount();
      })
      // Employer follow-up replies (inbound for candidate)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employer_message_replies' }, function(payload) {
        debouncedRefresh();
        // Live append + auto-mark read if this thread is open
        if (activeThreadMsgId && payload.new && payload.new.message_id === activeThreadMsgId) {
          var container = document.getElementById('thread-messages');
          if (container) {
            var wasNear = isNearBottom(container);
            appendBubble(container, payload.new.body, 'employer', bubbleTime(payload.new.created_at));
            if (wasNear) scrollToBottom(container);
          }
          // Mark as read since user is viewing the thread
          supa.rpc('mark_employer_replies_read', { p_message_id: activeThreadMsgId }).then(function(){}).catch(function(){});
          preloadUnreadCount();
        }
      })
      // Candidate reply read-state updates (employer marked read → update receipt)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'candidate_message_replies' }, function() {
        // Refresh thread to update receipt labels
        if (activeThreadMsgId) {
          var container = document.getElementById('thread-messages');
          if (container) loadThread(activeThreadMsgId, container, {});
        }
      })
      .subscribe();
  }

  // Start realtime as soon as auth is ready (no fixed 3s delay)
  function initRealtime() {
    var supa = getSupa();
    if (!supa) return;
    if (supa.auth && supa.auth.onAuthStateChange) {
      supa.auth.onAuthStateChange(function(event) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setupRealtimeInbox();
          preloadUnreadCount();
        }
      });
    } else {
      // Fallback: try after short delay
      setTimeout(function() { setupRealtimeInbox(); preloadUnreadCount(); }, 1500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRealtime);
  } else {
    initRealtime();
  }

})();

/* ═══════════════════════════════════════════════════════════════
   K030 FAZ C — Bildirim ↔ Duyuru segment toggle (inline in #panel-bildirimler)
   data-segment="bildirim-duyuru" drives the tab state.
   Reads/writes sessionStorage key `ht_bildirim_tab`.
   Mounts full duyuru feed into [data-mount="duyuru-full-feed"] on first activation.
   Calls get_unread_announcement_count RPC on load for badge.
   =============================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'ht_bildirim_tab';
  var SEEN_KEY = 'ht_last_duyuru_seen';

  function getSupa() {
    if (typeof supabase !== 'undefined') return supabase;
    if (window.HT && typeof window.HT.getSupa === 'function') return window.HT.getSupa();
    return null;
  }

  /* K030 FAZ C hotfix 7: activateTab now separates "user intent click" from
   * silent restore. Only explicit clicks flush SEEN_KEY and reset the bell. */
  function activateTab(root, key, isUserAction) {
    var buttons = root.querySelectorAll('.ht-segment[data-segment="bildirim-duyuru"] button');
    for (var i = 0; i < buttons.length; i++) {
      var isActive = buttons[i].getAttribute('data-tab') === key;
      buttons[i].classList.toggle('is-active', isActive);
      buttons[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    var contents = root.querySelectorAll('[data-tab-content]');
    for (var j = 0; j < contents.length; j++) {
      var matches = contents[j].getAttribute('data-tab-content') === key;
      if (matches) contents[j].removeAttribute('hidden');
      else contents[j].setAttribute('hidden', '');
    }
    try { sessionStorage.setItem(STORAGE_KEY, key); } catch (e) { /* ignore */ }

    if (key === 'duyuru') {
      var mount = root.querySelector('[data-mount="duyuru-full-feed"]');
      if (mount && !mount.dataset.loaded && typeof window._htLoadDuyuruFeed === 'function') {
        window._htLoadDuyuruFeed(mount, { limit: 50, offset: 0, infinite: true });
        mount.dataset.loaded = '1';
      }
      /* K030 FAZ C hotfix 7: mark as seen only on explicit user click.
       * Silent restore must NOT flush SEEN_KEY, otherwise every page load
       * resets unread and the header bell never accumulates. */
      if (isUserAction === true) {
        try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
        var badge = root.querySelector('[data-duyuru-badge]');
        if (badge) { badge.textContent = '0'; badge.setAttribute('hidden', ''); }
        window._htDuyuruUnreadCount = 0;
        if (typeof window._htApplyNotifBellDot === 'function') window._htApplyNotifBellDot();
      }
    }
  }

  function bindSegment() {
    var panel = document.getElementById('panel-bildirimler');
    if (!panel) return;
    var seg = panel.querySelector('.ht-segment[data-segment="bildirim-duyuru"]');
    if (!seg || seg.dataset.bound) return;
    seg.dataset.bound = '1';

    var buttons = seg.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (ev) {
        var key = ev.currentTarget.getAttribute('data-tab');
        activateTab(panel, key, true);
      });
    }

    // Restore saved tab — isUserAction=false so SEEN_KEY stays intact
    var saved = null;
    try { saved = sessionStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    activateTab(panel, saved === 'duyuru' ? 'duyuru' : 'bildirim', false);
  }

  /* K030 FAZ C hotfix 5: defensive parse for the unread count RPC.
   * Supabase PostgREST can return an int scalar as `res.data` number OR
   * wrap it in an array `[n]` OR in an object `{count:n}` depending on the
   * function return type + client version. Handle all cases safely. */
  function parseUnreadCount(data) {
    if (data === null || typeof data === 'undefined') return 0;
    if (typeof data === 'number') return data;
    if (typeof data === 'string') {
      var n = parseInt(data, 10);
      return isNaN(n) ? 0 : n;
    }
    if (Array.isArray(data)) {
      if (data.length === 0) return 0;
      return parseUnreadCount(data[0]);
    }
    if (typeof data === 'object') {
      if (typeof data.count !== 'undefined') return parseUnreadCount(data.count);
      if (typeof data.get_unread_announcement_count !== 'undefined') {
        return parseUnreadCount(data.get_unread_announcement_count);
      }
    }
    return 0;
  }

  /* K030 FAZ C hotfix 6: one-shot stale SEEN_KEY purge.
   * Earlier versions of profil-duyurular.js set SEEN_KEY=now on every
   * feed render, marking ALL existing posts as seen. That persistent
   * localStorage value still blocks the header bell for anyone who
   * loaded the page before the fix. Version flag triggers a one-time
   * removal so clients get a fresh baseline (all active posts count
   * as unread until the user opens the Duyurular tab). */
  var SEEN_VERSION_KEY = 'ht_duyuru_seen_v';
  var CURRENT_SEEN_VERSION = '3';
  (function purgeStaleSeen() {
    try {
      var v = localStorage.getItem(SEEN_VERSION_KEY);
      if (v !== CURRENT_SEEN_VERSION) {
        localStorage.removeItem(SEEN_KEY);
        localStorage.setItem(SEEN_VERSION_KEY, CURRENT_SEEN_VERSION);
        console.warn('[duyuru] SEEN_KEY purged (stale v' + (v || '0') + ' → v' + CURRENT_SEEN_VERSION + ')');
      }
    } catch (e) { /* ignore */ }
  })();

  async function loadUnreadCount() {
    /* K030 FAZ C hotfix 5: always fetch + publish unread count; defensive parse;
     * verbose debug log accessible via window._htDebugBell. */
    var supa = getSupa();
    if (!supa) { console.warn('[duyuru] loadUnreadCount: supa client unavailable'); return; }

    var since = null;
    try { since = localStorage.getItem(SEEN_KEY); } catch (e) { /* ignore */ }

    try {
      var res = await supa.rpc('get_unread_announcement_count', { p_since: since || null });
      if (res.error) {
        console.warn('[duyuru] unread count RPC failed:', res.error.message, res.error);
        return;
      }

      var count = parseUnreadCount(res.data);
      console.warn('[duyuru] unread count RPC → data:', res.data, 'parsed:', count, 'since:', since);

      /* Segment badge (in-panel) — update if present */
      var panel = document.getElementById('panel-bildirimler');
      var badge = panel && panel.querySelector('[data-duyuru-badge]');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : String(count);
          badge.removeAttribute('hidden');
        } else {
          badge.setAttribute('hidden', '');
        }
      }

      /* Global + header bell dot — always updated */
      window._htDuyuruUnreadCount = count;
      if (typeof window._htApplyNotifBellDot === 'function') {
        window._htApplyNotifBellDot();
      } else {
        console.warn('[duyuru] _htApplyNotifBellDot missing — header dot won\u0027t refresh');
      }
    } catch (e) {
      console.warn('[duyuru] unread count error:', e && e.message, e);
    }
  }

  /* K030 FAZ C hotfix 2: expose for manual refresh from other modules
   * and for a periodic poll every 60s so new admin posts surface without
   * a full page reload. */
  window._htRefreshDuyuruUnread = loadUnreadCount;

  /* K030 FAZ C hotfix 5: diagnostic helper — call from DevTools console
   * to dump live bell dot state + manually re-fetch the unread count. */
  window._htDebugBell = async function () {
    var supa = getSupa();
    var since = null;
    try { since = localStorage.getItem(SEEN_KEY); } catch (e) { /* ignore */ }
    var state = {
      supa: supa ? 'ok' : 'missing',
      SEEN_KEY: since || '(null)',
      _htDuyuruUnreadCount: window._htDuyuruUnreadCount,
      _htApplyNotifBellDot: typeof window._htApplyNotifBellDot,
      headerDotEl: document.getElementById('header-notif-dot'),
      headerDotDisplay: (function () {
        var el = document.getElementById('header-notif-dot');
        return el ? (el.style.display || 'default') : 'not-found';
      })(),
      navBadgeEl: document.getElementById('badge-bildirimler'),
      navBadgeText: (function () {
        var el = document.getElementById('badge-bildirimler');
        return el ? el.textContent : 'not-found';
      })()
    };
    console.warn('[duyuru:debug] Bell state:', state);
    if (supa) {
      try {
        var r = await supa.rpc('get_unread_announcement_count', { p_since: since || null });
        console.warn('[duyuru:debug] RPC raw response:', r);
        console.warn('[duyuru:debug] Parsed count:', parseUnreadCount(r && r.data));
      } catch (e) {
        console.error('[duyuru:debug] RPC throw:', e);
      }
    }
    return state;
  };

  /* K030 FAZ C cleanup: track pollId so it can be cleared on page unload
   * to keep memory tidy during dev (SPA-like panel switching keeps the
   * same page, but page close / back-forward cache should release it). */
  var _bellPollId = null;

  function init() {
    bindSegment();
    loadUnreadCount();
    if (_bellPollId !== null) { clearInterval(_bellPollId); }
    _bellPollId = setInterval(function () {
      try { loadUnreadCount(); } catch (e) { /* ignore */ }
    }, 60 * 1000);
  }

  window.addEventListener('pagehide', function () {
    if (_bellPollId !== null) { clearInterval(_bellPollId); _bellPollId = null; }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
