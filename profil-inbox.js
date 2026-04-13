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
    } catch (err) {
      console.error('Inbox load exception:', err);
    }
  };

  /* ═══ RENDER FILTER TABS ═══ */
  function renderFilterTabs(container) {
    FILTERS.forEach(function(f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      var isDel = f.key === 'deleted';
      var isActive = f.key === currentFilter;
      btn.style.cssText = 'padding:6px 14px;border-radius:20px;border:1px solid var(--border-subtle,#E5E3DF);background:' +
        (isActive ? (isDel ? '#DC2626' : 'var(--navy,#1E2D5E)') : 'var(--bg-surface,white)') + ';color:' +
        (isActive ? 'white' : (isDel ? '#DC2626' : 'var(--text-primary,#111)')) +
        ';font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;' +
        (isDel ? 'margin-left:auto;' : '');
      btn.addEventListener('click', function() {
        currentFilter = f.key;
        var tabs = container.querySelectorAll('button');
        for (var i = 0; i < tabs.length; i++) {
          var a = tabs[i].dataset.filter === currentFilter;
          var d = tabs[i].dataset.filter === 'deleted';
          tabs[i].style.background = a ? (d ? '#DC2626' : 'var(--navy,#1E2D5E)') : 'var(--bg-surface,white)';
          tabs[i].style.color = a ? 'white' : (d ? '#DC2626' : 'var(--text-primary,#111)');
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
        emptyEl.style.display = '';
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

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
            ph.style.cssText = 'display:flex;align-items:center;justify-content:center;flex:1;color:var(--text-muted,#6B7280);font-size:14px;padding:40px;';
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
    var hasReply = msg.latest_reply !== null;

    var row = document.createElement('div');
    row.dataset.msgId = msg.id;
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;cursor:pointer;transition:all .15s;background:' +
      (isUnread ? 'rgba(201,78,40,0.04)' : 'var(--bg-surface,white)') + ';';

    // Avatar
    var avatar = document.createElement('div');
    avatar.style.cssText = 'width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;background:var(--bg,#F7F6F4);overflow:hidden;';
    if (msg.company_logo) {
      var img = document.createElement('img');
      img.src = msg.company_logo;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      avatar.appendChild(img);
    } else {
      avatar.textContent = '\uD83C\uDFE2';
    }
    row.appendChild(avatar);

    // Content
    var content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0;';
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;';
    var nameEl = document.createElement('span');
    nameEl.style.cssText = 'font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
      (isUnread ? 'font-weight:700;' : 'font-weight:500;') + 'color:var(--text-primary,#111);';
    nameEl.textContent = msg.company_name || '\u0130\u015Fveren';
    topRow.appendChild(nameEl);

    var timeEl = document.createElement('span');
    timeEl.style.cssText = 'font-size:11px;white-space:nowrap;flex-shrink:0;margin-left:8px;' +
      (isUnread ? 'color:var(--verm,#C94E28);font-weight:600;' : 'color:var(--text-muted,#6B7280);');
    timeEl.textContent = timeAgo(msg.last_activity);
    topRow.appendChild(timeEl);
    content.appendChild(topRow);

    var previewEl = document.createElement('div');
    previewEl.style.cssText = 'font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3;' +
      (isUnread ? 'color:var(--text-primary,#111);font-weight:500;' : 'color:var(--text-muted,#6B7280);');
    var previewText = msg.body || msg.title;
    if (hasReply) {
      previewText = msg.latest_sender === 'candidate' ? ('Sen: ' + msg.latest_reply.body) : (msg.company_name || '\u0130\u015Fveren') + ': ' + msg.latest_reply.body;
    }
    previewEl.textContent = previewText;
    content.appendChild(previewEl);
    row.appendChild(content);

    // Right side
    var rightCol = document.createElement('div');
    rightCol.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';
    if (isDeleted) {
      var restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.textContent = 'Geri Al';
      restoreBtn.style.cssText = 'padding:4px 10px;border-radius:8px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,white);color:var(--navy,#1E2D5E);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;';
      restoreBtn.addEventListener('click', function(e) { e.stopPropagation(); restoreMessage(msg.id); });
      rightCol.appendChild(restoreBtn);
    } else {
      if (isUnread) {
        var dot = document.createElement('div');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--verm,#C94E28);';
        rightCol.appendChild(dot);
      }
      var trashBtn = document.createElement('button');
      trashBtn.type = 'button';
      trashBtn.title = 'Sil';
      var _isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      trashBtn.style.cssText = 'padding:2px 4px;border:none;background:none;color:var(--text-muted,#6B7280);font-size:14px;cursor:pointer;transition:opacity .15s;line-height:1;' + (_isTouchDevice ? 'opacity:0.5;' : 'opacity:0;');
      trashBtn.textContent = '\uD83D\uDDD1\uFE0F';
      trashBtn.addEventListener('click', function(e) { e.stopPropagation(); softDeleteMessage(msg.id); });
      rightCol.appendChild(trashBtn);
      row.addEventListener('mouseenter', function() {
        row.style.background = isUnread ? 'rgba(201,78,40,0.07)' : 'var(--bg,#F7F6F4)';
        trashBtn.style.opacity = '1';
      });
      row.addEventListener('mouseleave', function() {
        row.style.background = isUnread ? 'rgba(201,78,40,0.04)' : 'var(--bg-surface,white)';
        if (!_isTouchDevice) trashBtn.style.opacity = '0';
        else trashBtn.style.opacity = '0.5';
      });
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
    var rows = document.querySelectorAll('#inbox-list > div');
    for (var r = 0; r < rows.length; r++) {
      rows[r].style.background = rows[r].dataset.msgId == msg.id
        ? 'rgba(201,78,40,0.08)' : '';
    }

    if (isDesktop()) {
      openThreadInline(msg);
    } else {
      openThreadSheet(msg);
    }
  }

  function buildThreadContent(msg, container) {
    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border-subtle,#E5E3DF);flex-shrink:0;';

    var avi = document.createElement('div');
    avi.style.cssText = 'width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg,#F7F6F4);display:flex;align-items:center;justify-content:center;font-size:14px;';
    if (msg.company_logo) {
      var aviImg = document.createElement('img');
      aviImg.src = msg.company_logo;
      aviImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      avi.appendChild(aviImg);
    } else { avi.textContent = '\uD83C\uDFE2'; }
    header.appendChild(avi);

    var hInfo = document.createElement('div');
    hInfo.style.cssText = 'flex:1;min-width:0;';
    var hName = document.createElement('div');
    hName.style.cssText = 'font-size:14px;font-weight:700;color:var(--text-primary,#111);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    hName.textContent = msg.company_name || '\u0130\u015Fveren';
    hInfo.appendChild(hName);
    var hSubject = document.createElement('div');
    hSubject.style.cssText = 'font-size:11px;color:var(--text-muted,#6B7280);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    hSubject.textContent = msg.title;
    hInfo.appendChild(hSubject);
    header.appendChild(hInfo);
    container.appendChild(header);

    // Messages area
    var msgArea = document.createElement('div');
    msgArea.id = 'thread-messages';
    msgArea.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:4px;';
    var threadLoading = document.createElement('div');
    threadLoading.style.cssText = 'text-align:center;padding:24px;color:var(--text-muted,#6B7280);font-size:13px;';
    threadLoading.textContent = 'Y\u00FCkleniyor...';
    msgArea.appendChild(threadLoading);
    container.appendChild(msgArea);

    // Composer
    var composer = document.createElement('div');
    composer.style.cssText = 'display:flex;align-items:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--border-subtle,#E5E3DF);flex-shrink:0;background:var(--bg-surface,white);position:sticky;bottom:0;z-index:1;';
    var textarea = document.createElement('textarea');
    textarea.placeholder = 'Yan\u0131t yaz...';
    textarea.maxLength = 5000;
    textarea.rows = 1;
    textarea.style.cssText = 'flex:1;border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:10px 14px;font-size:14px;font-family:\'Plus Jakarta Sans\',sans-serif;line-height:1.4;resize:none;box-sizing:border-box;color:var(--text-primary,#111);background:var(--bg,#F7F6F4);max-height:100px;overflow-y:auto;';
    textarea.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 100) + 'px'; });
    composer.appendChild(textarea);

    var sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.style.cssText = 'width:36px;height:36px;border-radius:50%;border:none;background:var(--verm,#C94E28);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;';
    sendBtn.textContent = '\u27A4';
    sendBtn.addEventListener('mouseenter', function() { this.style.background = '#b84420'; });
    sendBtn.addEventListener('mouseleave', function() { this.style.background = 'var(--verm,#C94E28)'; });
    composer.appendChild(sendBtn);
    container.appendChild(composer);

    var statusMsg = document.createElement('div');
    statusMsg.id = 'thread-status-msg';
    statusMsg.style.cssText = 'display:none;padding:6px 14px;font-size:12px;font-weight:600;text-align:center;';
    container.appendChild(statusMsg);

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
          sep.style.cssText = 'text-align:center;padding:8px 0;';
          var sepLabel = document.createElement('span');
          sepLabel.style.cssText = 'font-size:11px;color:var(--text-muted,#6B7280);background:var(--bg-surface,white);padding:2px 12px;border-radius:10px;font-weight:500;';
          sepLabel.textContent = dateSeparatorLabel(item.created_at);
          sep.appendChild(sepLabel);
          container.appendChild(sep);
          lastDate = item.created_at;
        }

        var isEmp = item.sender === 'employer';
        var bubble = document.createElement('div');
        bubble.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:16px;position:relative;' +
          (isEmp
            ? 'align-self:flex-start;background:var(--bg,#F7F6F4);border-bottom-left-radius:4px;'
            : 'align-self:flex-end;background:var(--verm,#C94E28);color:white;border-bottom-right-radius:4px;');

        var bodyEl = document.createElement('div');
        bodyEl.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word;';
        bodyEl.textContent = item.body;
        bubble.appendChild(bodyEl);

        var timeWrap = document.createElement('div');
        timeWrap.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:4px;';
        var timeSpan = document.createElement('span');
        timeSpan.style.cssText = 'font-size:10px;' + (isEmp ? 'color:var(--text-muted,#6B7280);' : 'color:rgba(255,255,255,0.7);');
        timeSpan.textContent = bubbleTime(item.created_at);
        timeWrap.appendChild(timeSpan);
        bubble.appendChild(timeWrap);
        container.appendChild(bubble);

        // Read receipt — only on last candidate reply
        if (!isEmp && lastCandidateReply && item.item_id === lastCandidateReply.item_id) {
          var receipt = document.createElement('div');
          receipt.style.cssText = 'align-self:flex-end;font-size:10px;color:var(--text-muted,#6B7280);margin-top:1px;padding-right:2px;';
          receipt.textContent = item.read_at ? 'G\u00F6r\u00FCld\u00FC' : '\u0130letildi';
          container.appendChild(receipt);
        }
      }
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Load thread exception:', err);
    }
  }

  /* ═══ APPEND BUBBLE (for optimistic + realtime) ═══ */
  function appendBubble(container, text, sender, time) {
    var isEmp = sender === 'employer';
    var bubble = document.createElement('div');
    bubble.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:16px;position:relative;' +
      (isEmp
        ? 'align-self:flex-start;background:var(--bg,#F7F6F4);border-bottom-left-radius:4px;'
        : 'align-self:flex-end;background:var(--verm,#C94E28);color:white;border-bottom-right-radius:4px;');
    var bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size:14px;line-height:1.5;white-space:pre-wrap;word-break:break-word;';
    bodyEl.textContent = text;
    bubble.appendChild(bodyEl);
    var timeWrap = document.createElement('div');
    timeWrap.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:4px;';
    var timeSpan = document.createElement('span');
    timeSpan.style.cssText = 'font-size:10px;' + (isEmp ? 'color:var(--text-muted,#6B7280);' : 'color:rgba(255,255,255,0.7);');
    timeSpan.textContent = time || bubbleTime(new Date().toISOString());
    timeWrap.appendChild(timeSpan);
    bubble.appendChild(timeWrap);
    container.appendChild(bubble);
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
    optReceipt.style.cssText = 'align-self:flex-end;font-size:10px;color:var(--text-muted,#6B7280);margin-top:1px;padding-right:2px;';
    optReceipt.textContent = 'G\u00F6nderiliyor...';
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
      if (or) or.textContent = '\u0130letildi';
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
    for (var i = 0; i < allMessages.length; i++) {
      if (allMessages[i].status !== 'deleted' && allMessages[i].is_unread) c++;
    }
    var sb = document.getElementById('badge-inbox-unread');
    if (sb) { sb.textContent = c > 99 ? '99+' : c; sb.style.display = c > 0 ? '' : 'none'; }
    var bb = document.getElementById('badge-inbox-bn');
    if (bb) { bb.textContent = c > 9 ? '9+' : c; bb.style.display = c > 0 ? 'flex' : 'none'; }
    var pb = document.getElementById('inbox-unread-badge');
    if (pb) { pb.textContent = c + ' okunmam\u0131\u015F'; pb.style.display = c > 0 ? '' : 'none'; }
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
      item.addEventListener('click', function() { closeAllPopups(); if (typeof switchPanel === 'function') switchPanel('inbox'); });
      listEl.appendChild(item);
    });
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
      var targetPanel = notif.notif_type === 'koc' ? 'studio' : 'teklifler';
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
    if (notifBtn) notifBtn.addEventListener('click', function(e) { e.stopPropagation(); togglePopup('popup-notifications', window._htLoadNotifPreview); });

    var kbBtn = document.getElementById('header-kimbakti');
    if (kbBtn) kbBtn.addEventListener('click', function() { if (typeof switchPanel === 'function') switchPanel('kimbakti'); });

    var seeAllMsg = document.getElementById('popup-msg-see-all');
    if (seeAllMsg) seeAllMsg.addEventListener('click', function(e) { e.preventDefault(); closeAllPopups(); if (typeof switchPanel === 'function') switchPanel('inbox'); });

    var seeAllNotif = document.getElementById('popup-notif-see-all');
    if (seeAllNotif) seeAllNotif.addEventListener('click', function(e) { e.preventDefault(); closeAllPopups(); if (typeof switchPanel === 'function') switchPanel('bildirimler'); });

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
    NOTIF_FILTERS.forEach(function(f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      var isActive = f.key === notifFilter;
      btn.style.cssText = 'padding:6px 14px;border-radius:20px;border:1px solid var(--border-subtle,#E5E3DF);background:' +
        (isActive ? 'var(--navy,#1E2D5E)' : 'var(--bg-surface,white)') + ';color:' +
        (isActive ? 'white' : 'var(--text-primary,#111)') +
        ';font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;';
      btn.addEventListener('click', function() {
        notifFilter = f.key;
        var tabs = container.querySelectorAll('button');
        for (var i = 0; i < tabs.length; i++) {
          var a = tabs[i].dataset.filter === notifFilter;
          tabs[i].style.background = a ? 'var(--navy,#1E2D5E)' : 'var(--bg-surface,white)';
          tabs[i].style.color = a ? 'white' : 'var(--text-primary,#111)';
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
    if (filtered.length === 0) { if (emptyEl) emptyEl.style.display = ''; return; }
    if (emptyEl) emptyEl.style.display = 'none';
    filtered.forEach(function(notif) { listEl.appendChild(buildNotifCard(notif)); });
  }

  function buildNotifCard(notif) {
    var isUnread = notif.is_unread;
    var card = document.createElement('div');
    card.style.cssText = 'padding:14px 16px;border-radius:10px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,white);cursor:pointer;transition:all .2s;position:relative;' +
      (isUnread ? 'border-left:3px solid var(--verm,#C94E28);background:rgba(201,78,40,0.03);' : '');

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;';

    var iconEl = document.createElement('div');
    iconEl.style.cssText = 'width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;';
    if (notif.company_logo) {
      iconEl.style.background = 'var(--bg,#F7F6F4)';
      var img = document.createElement('img');
      img.src = notif.company_logo; img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
      iconEl.appendChild(img);
    } else if (notif.notif_type === 'mesaj') {
      iconEl.style.background = '#FEF7F5'; iconEl.textContent = '\uD83D\uDCBC';
    } else {
      iconEl.style.background = '#EEF2FF'; iconEl.textContent = '\uD83D\uDD14';
    }
    row.appendChild(iconEl);

    var content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0;';
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:14px;margin-bottom:3px;line-height:1.3;' +
      (isUnread ? 'font-weight:700;color:var(--text-primary,#111);' : 'font-weight:500;color:var(--text-primary,#111);');
    titleEl.textContent = notif.title;
    content.appendChild(titleEl);
    var bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size:13px;color:var(--text-muted,#6B7280);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4;';
    bodyEl.textContent = notif.body;
    content.appendChild(bodyEl);
    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:11px;color:var(--text-muted,#6B7280);margin-top:4px;';
    timeEl.textContent = timeAgo(notif.created_at);
    content.appendChild(timeEl);
    row.appendChild(content);

    if (isUnread) {
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--verm,#C94E28);flex-shrink:0;margin-top:6px;';
      row.appendChild(dot);
    }
    card.appendChild(row);

    card.addEventListener('click', function() {
      if (typeof switchPanel === 'function') {
        if (notif.notif_type === 'koc') switchPanel('studio');
        else if (notif.notif_type === 'kampanya') switchPanel('teklifler');
      }
    });
    card.addEventListener('mouseenter', function() { this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; });
    card.addEventListener('mouseleave', function() { this.style.boxShadow = 'none'; });
    return card;
  }

  function updateNotifPanelBadge() {
    var unread = 0;
    for (var i = 0; i < allNotifs.length; i++) { if (allNotifs[i].is_unread) unread++; }
    var badge = document.getElementById('notif-unread-badge');
    if (badge) {
      badge.textContent = unread + ' okunmam\u0131\u015F';
      badge.style.display = unread > 0 ? '' : 'none';
    }
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

  function activateTab(root, key) {
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
      try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
      // Clear badge
      var badge = root.querySelector('[data-duyuru-badge]');
      if (badge) { badge.textContent = '0'; badge.setAttribute('hidden', ''); }
      /* K030 FAZ C hotfix: reset duyuru unread global + refresh header bell dot */
      window._htDuyuruUnreadCount = 0;
      if (typeof window._htApplyNotifBellDot === 'function') window._htApplyNotifBellDot();
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
        activateTab(panel, key);
      });
    }

    // Restore saved tab
    var saved = null;
    try { saved = sessionStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    activateTab(panel, saved === 'duyuru' ? 'duyuru' : 'bildirim');
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
  var CURRENT_SEEN_VERSION = '2';
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

  function init() {
    bindSegment();
    loadUnreadCount();
    /* Periodic poll every 60s so new admin posts surface without page reload */
    setInterval(function () {
      try { loadUnreadCount(); } catch (e) { /* ignore */ }
    }, 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
