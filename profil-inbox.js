/* ═══════════════════════════════════════════════════════════════
   HELLOTALENT — PROFİL INBOX JS
   Unified inbox: employer DM messages (+ future: kampanya, sistem)
   Depends on: profil-core.js (supabase), profil-ui.js (_ht_candidate_id)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var loaded = false;
  var allMessages = [];
  var currentFilter = 'all';

  /* ── MESSAGE TYPE CONFIG ── */
  var TYPE_MAP = {
    employer_dm: { label: 'İşveren Mesajı', icon: '💼', color: '#C94E28', bg: '#FEF7F5' },
    system:      { label: 'Bildirim',       icon: '🔔', color: '#1E2D5E', bg: '#EEF2FF' },
    campaign:    { label: 'Kampanya',       icon: '🎁', color: '#059669', bg: '#ECFDF5' }
  };

  /* ── FILTER OPTIONS ── */
  var FILTERS = [
    { key: 'all',         label: 'Tümü' },
    { key: 'employer_dm', label: 'İşveren Mesajları' },
    { key: 'unread',      label: 'Okunmamış' },
    { key: 'deleted',     label: 'Silinenler' }
  ];

  /* ═══════════════════════════════════════════════════════════════
     RELATIVE TIME (Turkish)
     ═══════════════════════════════════════════════════════════════ */
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'az önce';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    if (diff < 172800) return 'Dün';
    if (diff < 604800) return Math.floor(diff / 86400) + ' gün önce';

    var d = new Date(dateStr);
    var months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return d.getDate() + ' ' + months[d.getMonth()];
  }

  /* ═══════════════════════════════════════════════════════════════
     LOAD MESSAGES
     ═══════════════════════════════════════════════════════════════ */
  window._htLoadInbox = async function(filter) {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    var listEl = document.getElementById('inbox-list');
    var emptyEl = document.getElementById('inbox-empty');
    var tabsEl = document.getElementById('inbox-tabs');
    if (!listEl || !supa) return;

    // Render filter tabs (once)
    if (tabsEl && !tabsEl.hasChildNodes()) {
      renderFilterTabs(tabsEl);
    }

    // Show loading on first load
    if (!loaded) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-size:13px;';
      loadingDiv.textContent = 'Mesajlar yükleniyor...';
      listEl.appendChild(loadingDiv);
    }

    try {
      // Query employer_messages sent to this candidate
      var res = await supa.from('employer_messages')
        .select('id, subject, body, status, created_at, read_at, company_id, position_id, companies(company_name, logo_url), positions(title)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (res.error) {
        console.error('Inbox load error:', res.error.message);
        return;
      }

      // Map to unified format
      allMessages = (res.data || []).map(function(m) {
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
          position_title: m.positions ? m.positions.title : null
        };
      });
      loaded = true;

      if (filter) currentFilter = filter;
      renderMessages();
      updateUnreadBadges();
    } catch (err) {
      console.error('Inbox load exception:', err);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER FILTER TABS
     ═══════════════════════════════════════════════════════════════ */
  function renderFilterTabs(container) {
    FILTERS.forEach(function(f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      var isDeletedTab = f.key === 'deleted';
      var isActiveTab = f.key === currentFilter;
      var activeBg = isDeletedTab ? '#DC2626' : 'var(--navy)';
      btn.style.cssText = 'padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:' +
        (isActiveTab ? activeBg : 'white') + ';color:' +
        (isActiveTab ? 'white' : (isDeletedTab ? '#DC2626' : 'var(--text)')) +
        ';font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s;' +
        (isDeletedTab ? 'margin-left:auto;' : '');

      btn.addEventListener('click', function() {
        currentFilter = f.key;
        var tabs = container.querySelectorAll('button');
        for (var i = 0; i < tabs.length; i++) {
          var isActive = tabs[i].dataset.filter === currentFilter;
          var isDel = tabs[i].dataset.filter === 'deleted';
          tabs[i].style.background = isActive ? (isDel ? '#DC2626' : 'var(--navy)') : 'white';
          tabs[i].style.color = isActive ? 'white' : (isDel ? '#DC2626' : 'var(--text)');
        }
        renderMessages();
      });

      container.appendChild(btn);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER MESSAGES
     ═══════════════════════════════════════════════════════════════ */
  function renderMessages() {
    var listEl = document.getElementById('inbox-list');
    var emptyEl = document.getElementById('inbox-empty');
    if (!listEl) return;

    var filtered;
    if (currentFilter === 'deleted') {
      // Silinenler: sadece status=deleted olanlar
      filtered = allMessages.filter(function(m) { return m.status === 'deleted'; });
    } else if (currentFilter === 'unread') {
      filtered = allMessages.filter(function(m) { return m.status !== 'read' && m.status !== 'deleted'; });
    } else if (currentFilter === 'all') {
      // Tümü: deleted hariç
      filtered = allMessages.filter(function(m) { return m.status !== 'deleted'; });
    } else {
      // Tip filtresi (employer_dm vb.): deleted hariç
      filtered = allMessages.filter(function(m) { return m.message_type === currentFilter && m.status !== 'deleted'; });
    }

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (filtered.length === 0) {
      if (emptyEl) {
        // Dynamic empty state text based on active filter
        var emptyIcon = emptyEl.querySelector('div:first-child');
        var emptyTitle = emptyEl.querySelector('div:nth-child(2)');
        var emptyDesc = emptyEl.querySelector('div:nth-child(3)');
        if (currentFilter === 'deleted') {
          if (emptyIcon) emptyIcon.textContent = '\uD83D\uDDD1\uFE0F';
          if (emptyTitle) emptyTitle.textContent = 'Silinen mesaj yok';
          if (emptyDesc) emptyDesc.textContent = 'Sildi\u011Finiz mesajlar burada g\u00F6r\u00FCnecek';
        } else {
          if (emptyIcon) emptyIcon.textContent = '\u2709\uFE0F';
          if (emptyTitle) emptyTitle.textContent = 'Hen\u00FCz mesaj\u0131n yok';
          if (emptyDesc) emptyDesc.textContent = 'Kampanya bildirimleri ve i\u015Fveren mesajlar\u0131 burada g\u00F6r\u00FCnecek';
        }
        emptyEl.style.display = '';
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    filtered.forEach(function(msg) {
      listEl.appendChild(buildMessageCard(msg));
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     BUILD MESSAGE CARD
     ═══════════════════════════════════════════════════════════════ */
  function buildMessageCard(msg) {
    var isUnread = msg.status !== 'read';
    var typeInfo = TYPE_MAP[msg.message_type] || TYPE_MAP.employer_dm;

    var card = document.createElement('div');
    card.style.cssText = 'padding:14px 16px;border-radius:10px;border:1px solid var(--border);background:white;cursor:pointer;transition:all .2s;position:relative;' +
      (isUnread ? 'border-left:3px solid var(--verm);' : '');

    // Header row: logo/icon + sender + time
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

    // Company logo or type icon
    var logoEl = document.createElement('div');
    logoEl.style.cssText = 'width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:' + typeInfo.bg + ';';

    if (msg.company_logo) {
      var img = document.createElement('img');
      img.src = msg.company_logo;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;';
      logoEl.textContent = '';
      logoEl.appendChild(img);
    } else {
      logoEl.textContent = typeInfo.icon;
    }
    header.appendChild(logoEl);

    // Sender info
    var senderEl = document.createElement('div');
    senderEl.style.cssText = 'flex:1;min-width:0;';

    var senderName = document.createElement('div');
    senderName.style.cssText = 'font-size:12px;color:var(--text-muted);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    senderName.textContent = msg.company_name || 'İşveren';
    senderEl.appendChild(senderName);

    // Position badge (if linked to a position)
    if (msg.position_title) {
      var posBadge = document.createElement('span');
      posBadge.style.cssText = 'font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;background:#EEF2FF;color:#1E2D5E;';
      posBadge.textContent = msg.position_title;
      senderEl.appendChild(posBadge);
    } else {
      var typeBadge = document.createElement('span');
      typeBadge.style.cssText = 'font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;background:' + typeInfo.bg + ';color:' + typeInfo.color + ';';
      typeBadge.textContent = typeInfo.label;
      senderEl.appendChild(typeBadge);
    }

    header.appendChild(senderEl);

    // Time
    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:11px;color:var(--text-muted);white-space:nowrap;flex-shrink:0;';
    timeEl.textContent = timeAgo(msg.created_at);
    header.appendChild(timeEl);

    // Unread dot
    if (isUnread) {
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--verm);flex-shrink:0;';
      header.appendChild(dot);
    }

    card.appendChild(header);

    // Subject
    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:14px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
      (isUnread ? 'font-weight:700;color:var(--text);' : 'font-weight:500;color:var(--text);');
    titleEl.textContent = msg.title;
    card.appendChild(titleEl);

    // Body preview (1 line)
    var bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4;';
    bodyEl.textContent = msg.body;
    card.appendChild(bodyEl);

    // Action row: delete or restore button
    var isDeleted = msg.status === 'deleted';
    var actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex;justify-content:flex-end;margin-top:8px;gap:8px;';

    if (isDeleted) {
      // Restore button for deleted messages
      var restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.textContent = 'Geri Al';
      restoreBtn.style.cssText = 'padding:4px 12px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--navy);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;';
      restoreBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        restoreMessage(msg.id);
      });
      actionRow.appendChild(restoreBtn);
    } else {
      // Delete button for active messages
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.title = 'Sil';
      deleteBtn.style.cssText = 'padding:4px 8px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--text-muted);font-size:14px;cursor:pointer;transition:all .2s;line-height:1;';
      deleteBtn.textContent = '\uD83D\uDDD1\uFE0F';
      deleteBtn.addEventListener('mouseenter', function() { this.style.color = '#DC2626'; this.style.background = 'rgba(220,38,38,0.08)'; });
      deleteBtn.addEventListener('mouseleave', function() { this.style.color = 'var(--text-muted)'; this.style.background = 'transparent'; });
      deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        softDeleteMessage(msg.id);
      });
      actionRow.appendChild(deleteBtn);
    }
    card.appendChild(actionRow);

    // Click handler — expand message + mark as read
    card.addEventListener('click', function() {
      if (isDeleted) return; // Don't expand deleted messages
      expandMessage(msg, card);
      if (isUnread) {
        markAsRead(msg.id);
        msg.status = 'read';
        renderMessages();
        updateUnreadBadges();
      }
    });

    // Hover effect
    card.addEventListener('mouseenter', function() { this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; });
    card.addEventListener('mouseleave', function() { this.style.boxShadow = 'none'; });

    return card;
  }

  /* ═══════════════════════════════════════════════════════════════
     EXPAND MESSAGE (full body view)
     ═══════════════════════════════════════════════════════════════ */
  function expandMessage(msg, cardEl) {
    // Check if already expanded
    var existing = document.getElementById('inbox-expanded');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'inbox-expanded';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px;';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:14px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.15);';

    // Header
    var mHeader = document.createElement('div');
    mHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;';

    var mFrom = document.createElement('div');
    var mCompany = document.createElement('div');
    mCompany.style.cssText = 'font-size:14px;font-weight:700;color:var(--text);';
    mCompany.textContent = msg.company_name || 'İşveren';
    mFrom.appendChild(mCompany);
    if (msg.position_title) {
      var mPos = document.createElement('div');
      mPos.style.cssText = 'font-size:12px;color:var(--text-muted);margin-top:2px;';
      mPos.textContent = 'Pozisyon: ' + msg.position_title;
      mFrom.appendChild(mPos);
    }
    var mTime = document.createElement('div');
    mTime.style.cssText = 'font-size:11px;color:var(--text-muted);';
    mTime.textContent = timeAgo(msg.created_at);
    mFrom.appendChild(mTime);
    mHeader.appendChild(mFrom);

    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);padding:0;line-height:1;';
    closeBtn.textContent = '✕';
    closeBtn.onclick = function() { overlay.remove(); };
    mHeader.appendChild(closeBtn);
    modal.appendChild(mHeader);

    // Subject
    var mSubject = document.createElement('div');
    mSubject.style.cssText = 'font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px;line-height:1.3;';
    mSubject.textContent = msg.title;
    modal.appendChild(mSubject);

    // Body
    var mBody = document.createElement('div');
    mBody.style.cssText = 'font-size:14px;color:var(--text);line-height:1.7;white-space:pre-wrap;';
    mBody.textContent = msg.body;
    modal.appendChild(mBody);

    overlay.appendChild(modal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  /* ═══════════════════════════════════════════════════════════════
     MARK AS READ (via RPC)
     ═══════════════════════════════════════════════════════════════ */
  async function markAsRead(messageId) {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) return;

    try {
      var res = await supa.rpc('mark_message_read', { p_message_id: messageId });
      if (res.error) console.error('Mark as read error:', res.error.message);
    } catch (err) {
      console.error('Mark as read exception:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     SOFT DELETE / RESTORE MESSAGE
     ═══════════════════════════════════════════════════════════════ */
  async function softDeleteMessage(messageId) {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) return;

    try {
      var res = await supa
        .from('employer_messages')
        .update({ status: 'deleted' })
        .eq('id', messageId);

      if (res.error) {
        console.error('Soft delete error:', res.error.message);
        return;
      }

      // Update local state
      for (var i = 0; i < allMessages.length; i++) {
        if (allMessages[i].id === messageId) {
          allMessages[i].status = 'deleted';
          break;
        }
      }
      renderMessages();
      updateUnreadBadges();
      preloadUnreadCount();
    } catch (err) {
      console.error('Soft delete exception:', err);
    }
  }

  async function restoreMessage(messageId) {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) return;

    try {
      var res = await supa
        .from('employer_messages')
        .update({ status: 'read' })
        .eq('id', messageId);

      if (res.error) {
        console.error('Restore error:', res.error.message);
        return;
      }

      // Update local state
      for (var i = 0; i < allMessages.length; i++) {
        if (allMessages[i].id === messageId) {
          allMessages[i].status = 'read';
          break;
        }
      }
      renderMessages();
      updateUnreadBadges();
      preloadUnreadCount();
    } catch (err) {
      console.error('Restore exception:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     UNREAD BADGE MANAGEMENT
     ═══════════════════════════════════════════════════════════════ */
  function updateUnreadBadges() {
    var unreadCount = 0;
    for (var i = 0; i < allMessages.length; i++) {
      if (allMessages[i].status !== 'read' && allMessages[i].status !== 'deleted') unreadCount++;
    }

    // Sidebar badge
    var sidebarBadge = document.getElementById('badge-inbox-unread');
    if (sidebarBadge) {
      if (unreadCount > 0) {
        sidebarBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        sidebarBadge.style.display = '';
      } else {
        sidebarBadge.style.display = 'none';
      }
    }

    // Bottom nav badge
    var bnBadge = document.getElementById('badge-inbox-bn');
    if (bnBadge) {
      if (unreadCount > 0) {
        bnBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        bnBadge.style.display = 'flex';
      } else {
        bnBadge.style.display = 'none';
      }
    }

    // Panel header badge
    var panelBadge = document.getElementById('inbox-unread-badge');
    if (panelBadge) {
      if (unreadCount > 0) {
        panelBadge.textContent = unreadCount + ' okunmamış';
        panelBadge.style.display = '';
      } else {
        panelBadge.style.display = 'none';
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     PRELOAD UNREAD COUNT (on page load)
     ═══════════════════════════════════════════════════════════════ */
  async function preloadUnreadCount() {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) return;

    try {
      var res = await supa
        .from('employer_messages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent');

      var count = res.count || 0;

      var sidebarBadge = document.getElementById('badge-inbox-unread');
      if (sidebarBadge) {
        if (count > 0) {
          sidebarBadge.textContent = count > 99 ? '99+' : count;
          sidebarBadge.style.display = '';
        } else {
          sidebarBadge.style.display = 'none';
        }
      }

      var bnBadge = document.getElementById('badge-inbox-bn');
      if (bnBadge) {
        if (count > 0) {
          bnBadge.textContent = count > 9 ? '9+' : count;
          bnBadge.style.display = 'flex';
        } else {
          bnBadge.style.display = 'none';
        }
      }

      // Header icon dots — data-driven (show only when unread > 0)
      var msgDot = document.getElementById('header-msg-dot');
      if (msgDot) msgDot.style.display = count > 0 ? '' : 'none';

      var notifDot = document.getElementById('header-notif-dot');
      if (notifDot) notifDot.style.display = count > 0 ? '' : 'none';

      // Bildirimler sidebar badge
      var notifBadge = document.getElementById('badge-bildirimler');
      if (notifBadge) {
        if (count > 0) {
          notifBadge.textContent = count > 99 ? '99+' : count;
          notifBadge.style.display = '';
        } else {
          notifBadge.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('Inbox preload error:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     HEADER POPUP: Message preview (top 5)
     ═══════════════════════════════════════════════════════════════ */
  window._htLoadMsgPreview = async function() {
    var listEl = document.getElementById('popup-msg-list');
    if (!listEl) return;

    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) {
      listEl.textContent = '';
      var noSupa = document.createElement('div');
      noSupa.className = 'header-popup-empty';
      noSupa.textContent = 'Bağlantı hatası.';
      listEl.appendChild(noSupa);
      return;
    }

    try {
      var res = await supa.from('employer_messages')
        .select('id, subject, body, status, created_at, companies(company_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      listEl.textContent = '';

      if (res.error || !res.data || res.data.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'header-popup-empty';
        empty.textContent = 'Henüz mesaj yok.';
        listEl.appendChild(empty);
        return;
      }

      res.data.forEach(function(m) {
        var isUnread = m.status !== 'read';
        var item = document.createElement('div');
        item.className = 'header-popup-item' + (isUnread ? ' unread' : '');

        var icon = document.createElement('div');
        icon.className = 'header-popup-icon';
        icon.style.background = '#FEF7F5';
        icon.textContent = '\uD83D\uDCBC';

        var info = document.createElement('div');
        info.className = 'header-popup-info';

        var sender = document.createElement('div');
        sender.className = 'header-popup-sender';
        sender.textContent = (m.companies ? m.companies.company_name : m.subject) || 'İşveren';

        var preview = document.createElement('div');
        preview.className = 'header-popup-preview';
        preview.textContent = m.body ? m.body.substring(0, 60) : m.subject || '';

        info.appendChild(sender);
        info.appendChild(preview);

        var right = document.createElement('div');
        right.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;';

        var time = document.createElement('div');
        time.className = 'header-popup-time';
        time.textContent = timeAgo(m.created_at);
        right.appendChild(time);

        if (isUnread) {
          var dot = document.createElement('div');
          dot.className = 'header-popup-unread-dot';
          right.appendChild(dot);
        }

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(right);

        item.addEventListener('click', function() {
          closeAllPopups();
          if (typeof switchPanel === 'function') switchPanel('inbox');
        });

        listEl.appendChild(item);
      });
    } catch (err) {
      console.error('[HT] Msg preview error:', err);
      listEl.textContent = '';
      var errDiv = document.createElement('div');
      errDiv.className = 'header-popup-empty';
      errDiv.textContent = 'Mesajlar yüklenemedi.';
      listEl.appendChild(errDiv);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     HEADER POPUP: Notification preview
     ═══════════════════════════════════════════════════════════════ */
  window._htLoadNotifPreview = async function() {
    var listEl = document.getElementById('popup-notif-list');
    if (!listEl) return;

    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) return;

    try {
      var res = await supa.from('employer_messages')
        .select('id, subject, status, created_at, companies(company_name)')
        .order('created_at', { ascending: false })
        .limit(5);

      listEl.textContent = '';

      if (res.error || !res.data || res.data.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'header-popup-empty';
        empty.textContent = 'Henüz bildirim yok.';
        listEl.appendChild(empty);
        return;
      }

      res.data.forEach(function(m) {
        var isUnread = m.status !== 'read';
        var item = document.createElement('div');
        item.className = 'header-popup-item' + (isUnread ? ' unread' : '');

        var icon = document.createElement('div');
        icon.className = 'header-popup-icon';
        icon.style.background = '#EEF2FF';
        icon.textContent = m.companies ? '\uD83D\uDCBC' : '\uD83D\uDD14';

        var info = document.createElement('div');
        info.className = 'header-popup-info';

        var sender = document.createElement('div');
        sender.className = 'header-popup-sender';
        sender.textContent = 'Yeni mesaj';

        var preview = document.createElement('div');
        preview.className = 'header-popup-preview';
        preview.textContent = (m.companies ? m.companies.company_name + ' \u2014 ' : '') + (m.subject || '');

        info.appendChild(sender);
        info.appendChild(preview);

        var time = document.createElement('div');
        time.className = 'header-popup-time';
        time.textContent = timeAgo(m.created_at);

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(time);

        item.addEventListener('click', function() {
          closeAllPopups();
          if (typeof switchPanel === 'function') switchPanel('bildirimler');
        });

        listEl.appendChild(item);
      });
    } catch (err) {
      console.error('[HT] Notif preview error:', err);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     HEADER POPUP: Toggle + close logic
     ═══════════════════════════════════════════════════════════════ */
  function closeAllPopups() {
    var popups = document.querySelectorAll('.header-popup');
    for (var i = 0; i < popups.length; i++) {
      popups[i].style.display = 'none';
    }
  }
  window._htCloseAllPopups = closeAllPopups;

  function togglePopup(popupId, loadFn) {
    var popup = document.getElementById(popupId);
    if (!popup) return;

    var isOpen = popup.style.display !== 'none';
    closeAllPopups();

    if (!isOpen) {
      popup.style.display = '';
      if (loadFn) loadFn();
    }
  }

  // Wire up click handlers after DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    var msgBtn = document.getElementById('header-msg');
    if (msgBtn) {
      msgBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopup('popup-messages', window._htLoadMsgPreview);
      });
    }

    var notifBtn = document.getElementById('header-notif');
    if (notifBtn) {
      notifBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopup('popup-notifications', window._htLoadNotifPreview);
      });
    }

    var kbBtn = document.getElementById('header-kimbakti');
    if (kbBtn) {
      kbBtn.addEventListener('click', function() {
        if (typeof switchPanel === 'function') switchPanel('kimbakti');
      });
    }

    var seeAllMsg = document.getElementById('popup-msg-see-all');
    if (seeAllMsg) {
      seeAllMsg.addEventListener('click', function(e) {
        e.preventDefault();
        closeAllPopups();
        if (typeof switchPanel === 'function') switchPanel('inbox');
      });
    }

    var seeAllNotif = document.getElementById('popup-notif-see-all');
    if (seeAllNotif) {
      seeAllNotif.addEventListener('click', function(e) {
        e.preventDefault();
        closeAllPopups();
        if (typeof switchPanel === 'function') switchPanel('bildirimler');
      });
    }

    // Close on outside click
    document.addEventListener('click', function(e) {
      var isInsidePopup = e.target.closest('.header-popup') || e.target.closest('.header-msg') || e.target.closest('.header-notif');
      if (!isInsidePopup) closeAllPopups();
    });

  });

  /* ── INIT: Preload unread count after page settles ── */
  document.addEventListener('DOMContentLoaded', function() {
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
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    var listEl = document.getElementById('notif-list');
    var emptyEl = document.getElementById('notif-empty');
    var tabsEl = document.getElementById('notif-tabs');
    if (!listEl || !supa) return;

    // Render filter tabs once
    if (tabsEl && !tabsEl.hasChildNodes()) {
      renderNotifTabs(tabsEl);
    }

    // Loading state on first load
    if (!notifLoaded) {
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      var loadDiv = document.createElement('div');
      loadDiv.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-size:13px;';
      loadDiv.textContent = 'Bildirimler y\u00FCkleniyor...';
      listEl.appendChild(loadDiv);
    }

    try {
      // Fetch employer messages as notifications
      var res = await supa.from('employer_messages')
        .select('id, subject, body, status, created_at, read_at, company_id, companies(company_name, logo_url)')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .limit(100);

      if (res.error) {
        console.error('Bildirimler load error:', res.error.message);
        return;
      }

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
    } catch (err) {
      console.error('Bildirimler load exception:', err);
    }
  };

  function renderNotifTabs(container) {
    NOTIF_FILTERS.forEach(function(f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      var isActive = f.key === notifFilter;
      btn.style.cssText = 'padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:' +
        (isActive ? 'var(--navy)' : 'white') + ';color:' +
        (isActive ? 'white' : 'var(--text)') +
        ';font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s;';

      btn.addEventListener('click', function() {
        notifFilter = f.key;
        var tabs = container.querySelectorAll('button');
        for (var i = 0; i < tabs.length; i++) {
          var active = tabs[i].dataset.filter === notifFilter;
          tabs[i].style.background = active ? 'var(--navy)' : 'white';
          tabs[i].style.color = active ? 'white' : 'var(--text)';
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

    if (filtered.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    filtered.forEach(function(notif) {
      listEl.appendChild(buildNotifCard(notif));
    });
  }

  function buildNotifCard(notif) {
    var isUnread = notif.status !== 'read';

    var card = document.createElement('div');
    card.style.cssText = 'padding:14px 16px;border-radius:10px;border:1px solid var(--border);background:white;cursor:pointer;transition:all .2s;position:relative;' +
      (isUnread ? 'border-left:3px solid var(--verm);background:#FFFBFA;' : '');

    // Top row: icon + content + time
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;';

    // Icon
    var iconEl = document.createElement('div');
    iconEl.style.cssText = 'width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;';

    if (notif.company_logo) {
      iconEl.style.background = '#F7F6F4';
      var img = document.createElement('img');
      img.src = notif.company_logo;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:10px;';
      iconEl.appendChild(img);
    } else if (notif.notif_type === 'mesaj') {
      iconEl.style.background = '#FEF7F5';
      iconEl.textContent = '\uD83D\uDCBC';
    } else {
      iconEl.style.background = '#EEF2FF';
      iconEl.textContent = '\uD83D\uDD14';
    }
    row.appendChild(iconEl);

    // Content
    var content = document.createElement('div');
    content.style.cssText = 'flex:1;min-width:0;';

    var titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:14px;margin-bottom:3px;line-height:1.3;' +
      (isUnread ? 'font-weight:700;color:var(--text);' : 'font-weight:500;color:var(--text);');
    titleEl.textContent = notif.title;
    content.appendChild(titleEl);

    var bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4;';
    bodyEl.textContent = notif.body;
    content.appendChild(bodyEl);

    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px;';
    timeEl.textContent = timeAgo(notif.created_at);
    content.appendChild(timeEl);

    row.appendChild(content);

    // Unread dot
    if (isUnread) {
      var dot = document.createElement('div');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:var(--verm);flex-shrink:0;margin-top:6px;';
      row.appendChild(dot);
    }

    card.appendChild(row);

    // Click: navigate to inbox and mark read
    card.addEventListener('click', function() {
      if (notif.notif_type === 'mesaj' && isUnread) {
        markAsRead(notif.id);
        notif.status = 'read';
        renderNotifs();
        updateNotifPanelBadge();
        preloadUnreadCount();
      }
      // Navigate to inbox to see full message
      if (typeof switchPanel === 'function') switchPanel('inbox');
    });

    // Hover
    card.addEventListener('mouseenter', function() { this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; });
    card.addEventListener('mouseleave', function() { this.style.boxShadow = 'none'; });

    return card;
  }

  function updateNotifPanelBadge() {
    var unread = 0;
    for (var i = 0; i < allNotifs.length; i++) {
      if (allNotifs[i].status !== 'read') unread++;
    }
    var badge = document.getElementById('notif-unread-badge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread + ' okunmam\u0131\u015F';
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     REALTIME: Subscribe to new messages for live badge updates
     ═══════════════════════════════════════════════════════════════ */
  function setupRealtimeInbox() {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa || !supa.channel) return;

    supa.channel('inbox-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'employer_messages'
      }, function() {
        // New message arrived — refresh badges
        preloadUnreadCount();
        // If inbox panel is visible, reload messages
        var inboxPanel = document.getElementById('panel-inbox');
        if (inboxPanel && inboxPanel.classList.contains('active')) {
          window._htLoadInbox(currentFilter);
        }
        // If bildirimler panel is visible, reload
        var notifPanel = document.getElementById('panel-bildirimler');
        if (notifPanel && notifPanel.classList.contains('active') && window._htLoadBildirimler) {
          window._htLoadBildirimler();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'employer_messages'
      }, function() {
        // Message status changed (read, deleted) — refresh badges
        preloadUnreadCount();
      })
      .subscribe();
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupRealtimeInbox, 3000);
  });

})();
