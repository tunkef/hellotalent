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
     LOAD MESSAGES + latest reply per thread
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
      var res = await supa.from('employer_messages')
        .select('id, subject, body, status, created_at, read_at, company_id, companies(company_name, logo_url)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (res.error) {
        console.error('Inbox load error:', res.error.message);
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        loaded = true;
        renderMessages();
        return;
      }

      var msgIds = (res.data || []).map(function(m) { return m.id; });
      var candidateRepliesMap = {};
      var employerFollowupsMap = {};
      var unreadFollowupsMap = {};
      if (msgIds.length > 0) {
        // Candidate replies (for "Sen:" preview)
        var rRes = await supa.from('candidate_message_replies')
          .select('message_id, body, created_at, read_at')
          .in('message_id', msgIds)
          .order('created_at', { ascending: false });
        if (rRes.data) {
          rRes.data.forEach(function(r) {
            if (!candidateRepliesMap[r.message_id]) candidateRepliesMap[r.message_id] = r;
          });
        }
        // Employer follow-up replies (for thread activity + unread count)
        var efRes = await supa.from('employer_message_replies')
          .select('message_id, body, created_at, read_at')
          .in('message_id', msgIds)
          .order('created_at', { ascending: false });
        if (efRes.data) {
          efRes.data.forEach(function(r) {
            if (!employerFollowupsMap[r.message_id]) employerFollowupsMap[r.message_id] = r;
            if (!r.read_at) {
              unreadFollowupsMap[r.message_id] = (unreadFollowupsMap[r.message_id] || 0) + 1;
            }
          });
        }
      }

      allMessages = (res.data || []).map(function(m) {
        var cr = candidateRepliesMap[m.id] || null;
        var ef = employerFollowupsMap[m.id] || null;
        // Determine the true latest thread item
        var latestItem = null;
        var latestSender = null;
        if (cr && ef) {
          if (new Date(cr.created_at) > new Date(ef.created_at)) {
            latestItem = cr; latestSender = 'candidate';
          } else {
            latestItem = ef; latestSender = 'employer';
          }
        } else if (cr) {
          latestItem = cr; latestSender = 'candidate';
        } else if (ef) {
          latestItem = ef; latestSender = 'employer';
        }
        return {
          id: m.id,
          message_type: 'employer_dm',
          title: m.subject,
          body: m.body,
          status: m.status,
          created_at: m.created_at,
          read_at: m.read_at,
          company_name: m.companies ? m.companies.company_name : null,
          company_logo: m.companies ? m.companies.logo_url : null,
          latest_reply: latestItem,
          latest_sender: latestSender,
          unread_followups: unreadFollowupsMap[m.id] || 0,
          last_activity: latestItem ? latestItem.created_at : m.created_at
        };
      });
      allMessages.sort(function(a, b) { return new Date(b.last_activity) - new Date(a.last_activity); });

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
        if (m.status === 'deleted') return false;
        return m.status !== 'read' || (m.unread_followups || 0) > 0;
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
  }

  /* ═══════════════════════════════════════════════════════════════
     BUILD CONVERSATION ROW — slim DM-style
     ═══════════════════════════════════════════════════════════════ */
  function buildConversationRow(msg) {
    var hasUnreadFollowups = (msg.unread_followups || 0) > 0;
    var isUnread = (msg.status !== 'read' && msg.status !== 'deleted') || hasUnreadFollowups;
    var isDeleted = msg.status === 'deleted';
    var hasReply = msg.latest_reply !== null;

    var row = document.createElement('div');
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
      trashBtn.style.cssText = 'padding:2px 4px;border:none;background:none;color:var(--text-muted,#6B7280);font-size:14px;cursor:pointer;opacity:0;transition:opacity .15s;line-height:1;';
      trashBtn.textContent = '\uD83D\uDDD1\uFE0F';
      trashBtn.addEventListener('click', function(e) { e.stopPropagation(); softDeleteMessage(msg.id); });
      rightCol.appendChild(trashBtn);
      row.addEventListener('mouseenter', function() {
        row.style.background = isUnread ? 'rgba(201,78,40,0.07)' : 'var(--bg,#F7F6F4)';
        trashBtn.style.opacity = '1';
      });
      row.addEventListener('mouseleave', function() {
        row.style.background = isUnread ? 'rgba(201,78,40,0.04)' : 'var(--bg-surface,white)';
        trashBtn.style.opacity = '0';
      });
    }
    row.appendChild(rightCol);

    row.addEventListener('click', function() {
      if (isDeleted) return;
      openThread(msg);
      if (isUnread) {
        if (msg.status !== 'read') markAsRead(msg.id);
        msg.status = 'read';
        msg.unread_followups = 0;
        renderMessages();
        updateUnreadBadges();
        preloadUnreadCount();
      }
    });
    return row;
  }

  /* ═══════════════════════════════════════════════════════════════
     OPEN THREAD — sheet-style conversation view
     ═══════════════════════════════════════════════════════════════ */
  function openThread(msg) {
    var existing = document.getElementById('inbox-expanded');
    if (existing) existing.remove();
    activeThreadMsgId = msg.id;

    var overlay = document.createElement('div');
    overlay.id = 'inbox-expanded';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:900;display:flex;align-items:flex-end;justify-content:center;padding:0;';

    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--bg-surface,white);width:100%;max-width:480px;height:85vh;border-radius:16px 16px 0 0;display:flex;flex-direction:column;box-shadow:0 -4px 40px rgba(0,0,0,0.12);';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border-subtle,#E5E3DF);flex-shrink:0;';
    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.style.cssText = 'background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted,#6B7280);padding:0;line-height:1;';
    backBtn.textContent = '\u2190';
    backBtn.onclick = function() { overlay.remove(); activeThreadMsgId = null; };
    header.appendChild(backBtn);

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
    sheet.appendChild(header);

    // Messages area
    var msgArea = document.createElement('div');
    msgArea.id = 'thread-messages';
    msgArea.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:4px;';
    var threadLoading = document.createElement('div');
    threadLoading.style.cssText = 'text-align:center;padding:24px;color:var(--text-muted,#6B7280);font-size:13px;';
    threadLoading.textContent = 'Y\u00FCkleniyor...';
    msgArea.appendChild(threadLoading);
    sheet.appendChild(msgArea);

    // Composer
    var composer = document.createElement('div');
    composer.style.cssText = 'display:flex;align-items:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--border-subtle,#E5E3DF);flex-shrink:0;background:var(--bg-surface,white);';
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
    sendBtn.textContent = '\u27A4'; // ➤
    sendBtn.addEventListener('mouseenter', function() { this.style.background = '#b84420'; });
    sendBtn.addEventListener('mouseleave', function() { this.style.background = 'var(--verm,#C94E28)'; });
    composer.appendChild(sendBtn);
    sheet.appendChild(composer);

    var statusMsg = document.createElement('div');
    statusMsg.id = 'thread-status-msg';
    statusMsg.style.cssText = 'display:none;padding:6px 14px;font-size:12px;font-weight:600;text-align:center;';
    sheet.appendChild(statusMsg);

    overlay.appendChild(sheet);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); activeThreadMsgId = null; } });
    document.body.appendChild(overlay);

    loadThread(msg.id, msgArea, msg);
    sendBtn.addEventListener('click', function() { sendReply(msg.id, textarea, sendBtn, statusMsg, msgArea, msg); });
    textarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(msg.id, textarea, sendBtn, statusMsg, msgArea, msg); }
    });
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

  /* ═══ SEND REPLY ═══ */
  async function sendReply(messageId, textarea, sendBtn, statusEl, msgArea, msg) {
    var supa = getSupa();
    if (!supa) return;
    var body = textarea.value.trim();
    if (!body) return;
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.6';
    try {
      var res = await supa.rpc('send_candidate_reply', { p_message_id: messageId, p_body: body });
      if (res.error) {
        console.error('Send reply error:', res.error.message);
        statusEl.textContent = 'Hata: ' + res.error.message;
        statusEl.style.cssText = 'display:block;padding:6px 14px;font-size:12px;font-weight:600;text-align:center;background:#FEF2F2;color:#DC2626;';
        setTimeout(function() { statusEl.style.display = 'none'; }, 4000);
        sendBtn.disabled = false; sendBtn.style.opacity = '1';
        return;
      }
      textarea.value = '';
      textarea.style.height = 'auto';
      sendBtn.disabled = false; sendBtn.style.opacity = '1';
      loadThread(messageId, msgArea, msg);
      // Update local preview
      for (var i = 0; i < allMessages.length; i++) {
        if (allMessages[i].id === messageId) {
          allMessages[i].latest_reply = { body: body, created_at: new Date().toISOString(), read_at: null };
          allMessages[i].latest_sender = 'candidate';
          allMessages[i].last_activity = new Date().toISOString();
          break;
        }
      }
    } catch (err) {
      console.error('Send reply exception:', err);
      statusEl.textContent = 'Hata: Yan\u0131t g\u00F6nderilemedi.';
      statusEl.style.cssText = 'display:block;padding:6px 14px;font-size:12px;font-weight:600;text-align:center;background:#FEF2F2;color:#DC2626;';
      setTimeout(function() { statusEl.style.display = 'none'; }, 4000);
      sendBtn.disabled = false; sendBtn.style.opacity = '1';
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
      var m = allMessages[i];
      if (m.status === 'deleted') continue;
      if (m.status !== 'read' || (m.unread_followups || 0) > 0) c++;
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
    var nd = document.getElementById('header-notif-dot');
    if (nd) nd.style.display = c > 0 ? '' : 'none';
    var nb = document.getElementById('badge-bildirimler');
    if (nb) { nb.textContent = c > 99 ? '99+' : c; nb.style.display = c > 0 ? '' : 'none'; }
  }

  /* ═══ HEADER POPUP: Message preview ═══ */
  window._htLoadMsgPreview = async function() {
    var listEl = document.getElementById('popup-msg-list');
    if (!listEl) return;
    var supa = getSupa();
    if (!supa) { listEl.textContent = ''; var n = document.createElement('div'); n.className = 'header-popup-empty'; n.textContent = 'Ba\u011Flant\u0131 hatas\u0131.'; listEl.appendChild(n); return; }
    try {
      var res = await supa.from('employer_messages').select('id, subject, body, status, created_at, companies(company_name)').order('created_at', { ascending: false }).limit(5);
      listEl.textContent = '';
      if (res.error || !res.data || res.data.length === 0) { var e = document.createElement('div'); e.className = 'header-popup-empty'; e.textContent = 'Hen\u00FCz mesaj yok.'; listEl.appendChild(e); return; }
      res.data.forEach(function(m) {
        var u = m.status !== 'read';
        var item = document.createElement('div');
        item.className = 'header-popup-item' + (u ? ' unread' : '');
        var icon = document.createElement('div'); icon.className = 'header-popup-icon'; icon.style.background = '#FEF7F5'; icon.textContent = '\uD83D\uDCBC';
        var info = document.createElement('div'); info.className = 'header-popup-info';
        var sender = document.createElement('div'); sender.className = 'header-popup-sender'; sender.textContent = (m.companies ? m.companies.company_name : m.subject) || '\u0130\u015Fveren';
        var preview = document.createElement('div'); preview.className = 'header-popup-preview'; preview.textContent = m.body ? m.body.substring(0, 60) : m.subject || '';
        info.appendChild(sender); info.appendChild(preview);
        var right = document.createElement('div'); right.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;';
        var time = document.createElement('div'); time.className = 'header-popup-time'; time.textContent = timeAgo(m.created_at);
        right.appendChild(time);
        if (u) { var dot = document.createElement('div'); dot.className = 'header-popup-unread-dot'; right.appendChild(dot); }
        item.appendChild(icon); item.appendChild(info); item.appendChild(right);
        item.addEventListener('click', function() { closeAllPopups(); if (typeof switchPanel === 'function') switchPanel('inbox'); });
        listEl.appendChild(item);
      });
    } catch (err) { console.error('[HT] Msg preview error:', err); listEl.textContent = ''; var ed = document.createElement('div'); ed.className = 'header-popup-empty'; ed.textContent = 'Mesajlar y\u00FCklenemedi.'; listEl.appendChild(ed); }
  };

  /* ═══ HEADER POPUP: Notification preview ═══ */
  window._htLoadNotifPreview = async function() {
    var listEl = document.getElementById('popup-notif-list');
    if (!listEl) return;
    var supa = getSupa();
    if (!supa) return;
    try {
      var res = await supa.from('employer_messages').select('id, subject, status, created_at, companies(company_name)').order('created_at', { ascending: false }).limit(5);
      listEl.textContent = '';
      if (res.error || !res.data || res.data.length === 0) { var e = document.createElement('div'); e.className = 'header-popup-empty'; e.textContent = 'Bildirim yok.'; listEl.appendChild(e); return; }
      res.data.forEach(function(m) {
        var u = m.status !== 'read';
        var item = document.createElement('div'); item.className = 'header-popup-item' + (u ? ' unread' : '');
        var icon = document.createElement('div'); icon.className = 'header-popup-icon'; icon.style.background = '#EEF2FF'; icon.textContent = '\uD83D\uDD14';
        var info = document.createElement('div'); info.className = 'header-popup-info';
        var sender = document.createElement('div'); sender.className = 'header-popup-sender'; sender.textContent = (m.companies ? m.companies.company_name : 'Bildirim') || 'Bildirim';
        var preview = document.createElement('div'); preview.className = 'header-popup-preview'; preview.textContent = m.subject || '';
        info.appendChild(sender); info.appendChild(preview);
        var right = document.createElement('div'); right.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;';
        var time = document.createElement('div'); time.className = 'header-popup-time'; time.textContent = timeAgo(m.created_at);
        right.appendChild(time);
        if (u) { var dot = document.createElement('div'); dot.className = 'header-popup-unread-dot'; right.appendChild(dot); }
        item.appendChild(icon); item.appendChild(info); item.appendChild(right);
        item.addEventListener('click', function() { closeAllPopups(); if (typeof switchPanel === 'function') switchPanel('bildirimler'); });
        listEl.appendChild(item);
      });
    } catch (err) { console.error('[HT] Notif preview error:', err); }
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
    closeAllPopups();
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
        var hasModal = document.querySelector('.modal-overlay.show') || document.getElementById('inbox-expanded');
        if (!hasModal) closeAllPopups();
      }
    });

    // Preload badges after page settles
    setTimeout(preloadUnreadCount, 2500);
  });

  /* ═══════════════════════════════════════════════════════════════
     BILDIRIMLER PANEL (full notification center)
     ═══════════════════════════════════════════════════════════════ */
  var notifLoaded = false;
  var allNotifs = [];
  var notifFilter = 'all';

  var NOTIF_FILTERS = [
    { key: 'all',    label: 'T\u00FCm\u00FC' },
    { key: 'unread', label: 'Okunmam\u0131\u015F' },
    { key: 'mesaj',  label: 'Mesajlar' },
    { key: 'sistem', label: 'Sistem' }
  ];

  window._htLoadBildirimler = async function(filter) {
    var supa = getSupa();
    var listEl = document.getElementById('notif-list');
    var emptyEl = document.getElementById('notif-empty');
    var tabsEl = document.getElementById('notif-tabs');
    if (!listEl || !supa) return;

    if (tabsEl && !tabsEl.hasChildNodes()) renderNotifTabs(tabsEl);

    if (!notifLoaded) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var ld = document.createElement('div');
      ld.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted,#6B7280);font-size:13px;';
      ld.textContent = 'Bildirimler y\u00FCkleniyor...';
      listEl.appendChild(ld);
    }

    try {
      var res = await supa.from('employer_messages')
        .select('id, subject, body, status, created_at, read_at, company_id, companies(company_name, logo_url)')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .limit(100);

      if (res.error) { console.error('Bildirimler load error:', res.error.message); return; }

      allNotifs = (res.data || []).map(function(m) {
        return {
          id: m.id,
          notif_type: 'mesaj',
          title: m.companies ? m.companies.company_name + ' mesaj g\u00F6nderdi' : 'Yeni mesaj',
          body: m.subject || m.body || '',
          status: m.status,
          created_at: m.created_at,
          read_at: m.read_at,
          company_name: m.companies ? m.companies.company_name : null,
          company_logo: m.companies ? m.companies.logo_url : null
        };
      });
      notifLoaded = true;
      if (filter) notifFilter = filter;
      renderNotifs();
      updateNotifPanelBadge();
    } catch (err) { console.error('Bildirimler load exception:', err); }
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
      filtered = allNotifs.filter(function(n) { return n.status !== 'read'; });
    } else if (notifFilter === 'mesaj') {
      filtered = allNotifs.filter(function(n) { return n.notif_type === 'mesaj'; });
    } else if (notifFilter === 'sistem') {
      filtered = allNotifs.filter(function(n) { return n.notif_type === 'sistem'; });
    } else {
      filtered = allNotifs;
    }

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    if (filtered.length === 0) { if (emptyEl) emptyEl.style.display = ''; return; }
    if (emptyEl) emptyEl.style.display = 'none';
    filtered.forEach(function(notif) { listEl.appendChild(buildNotifCard(notif)); });
  }

  function buildNotifCard(notif) {
    var isUnread = notif.status !== 'read';
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
      if (notif.notif_type === 'mesaj' && isUnread) {
        markAsRead(notif.id);
        notif.status = 'read';
        renderNotifs();
        updateNotifPanelBadge();
        preloadUnreadCount();
      }
      if (typeof switchPanel === 'function') switchPanel('inbox');
    });
    card.addEventListener('mouseenter', function() { this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; });
    card.addEventListener('mouseleave', function() { this.style.boxShadow = 'none'; });
    return card;
  }

  function updateNotifPanelBadge() {
    var unread = 0;
    for (var i = 0; i < allNotifs.length; i++) { if (allNotifs[i].status !== 'read') unread++; }
    var badge = document.getElementById('notif-unread-badge');
    if (badge) {
      badge.textContent = unread + ' okunmam\u0131\u015F';
      badge.style.display = unread > 0 ? '' : 'none';
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     REALTIME: Subscribe to new messages for live badge updates
     ═══════════════════════════════════════════════════════════════ */
  function setupRealtimeInbox() {
    var supa = getSupa();
    if (!supa || !supa.channel) return;

    function refreshInboxIfActive() {
      preloadUnreadCount();
      var inboxPanel = document.getElementById('panel-inbox');
      if (inboxPanel && inboxPanel.classList.contains('active')) window._htLoadInbox(currentFilter);
      var notifPanel = document.getElementById('panel-bildirimler');
      if (notifPanel && notifPanel.classList.contains('active') && window._htLoadBildirimler) window._htLoadBildirimler();
    }

    function refreshActiveThread() {
      if (activeThreadMsgId) {
        var container = document.getElementById('thread-messages');
        if (container) loadThread(activeThreadMsgId, container, {});
      }
    }

    supa.channel('inbox-live')
      // Root employer messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employer_messages' }, refreshInboxIfActive)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employer_messages' }, function() { preloadUnreadCount(); })
      // Employer follow-up replies (new inbound for candidate)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employer_message_replies' }, function() {
        refreshInboxIfActive();
        refreshActiveThread();
      })
      // Candidate reply read-state updates (employer marked read)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'candidate_message_replies' }, function() {
        refreshActiveThread();
      })
      .subscribe();
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupRealtimeInbox, 3000);
  });

})();
