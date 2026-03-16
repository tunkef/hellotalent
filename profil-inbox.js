/* ═══════════════════════════════════════════════════════════════
   HELLOTALENT — PROFİL INBOX JS
   Unified inbox: kampanya bildirimleri, sistem mesajları, işveren DM
   Depends on: profil-core.js (supabase), profil-ui.js (_ht_candidate_id)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var loaded = false;
  var allMessages = [];
  var currentFilter = 'all';

  /* ── MESSAGE TYPE CONFIG ── */
  var TYPE_MAP = {
    campaign:    { label: 'Kampanya',          icon: '🎁', color: '#059669', bg: '#ECFDF5' },
    system:      { label: 'Bildirim',          icon: '🔔', color: '#1E2D5E', bg: '#EEF2FF' },
    employer_dm: { label: 'İşveren Mesajı',    icon: '💼', color: '#C94E28', bg: '#FEF7F5' }
  };

  /* ── FILTER OPTIONS ── */
  var FILTERS = [
    { key: 'all',         label: 'Tümü' },
    { key: 'campaign',    label: 'Kampanyalar' },
    { key: 'system',      label: 'Bildirimler' },
    { key: 'employer_dm', label: 'İşveren Mesajları' }
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
      var query = supa.from('inbox_messages')
        .select('*, companies(company_name, logo_url), brands(name, logo_url)')
        .order('created_at', { ascending: false })
        .limit(50);

      var res = await query;
      if (res.error) {
        console.error('Inbox load error:', res.error.message);
        return;
      }

      allMessages = res.data || [];
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
      btn.style.cssText = 'padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:' +
        (f.key === currentFilter ? 'var(--navy)' : 'white') + ';color:' +
        (f.key === currentFilter ? 'white' : 'var(--text)') +
        ';font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .2s;';

      btn.addEventListener('click', function() {
        currentFilter = f.key;
        // Update tab styles
        var tabs = container.querySelectorAll('button');
        for (var i = 0; i < tabs.length; i++) {
          var isActive = tabs[i].dataset.filter === currentFilter;
          tabs[i].style.background = isActive ? 'var(--navy)' : 'white';
          tabs[i].style.color = isActive ? 'white' : 'var(--text)';
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

    var filtered = allMessages;
    if (currentFilter !== 'all') {
      filtered = allMessages.filter(function(m) { return m.message_type === currentFilter; });
    }

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (filtered.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
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
    var typeInfo = TYPE_MAP[msg.message_type] || TYPE_MAP.system;

    var card = document.createElement('div');
    card.style.cssText = 'padding:14px 16px;border-radius:10px;border:1px solid var(--border);background:white;cursor:pointer;transition:all .2s;position:relative;' +
      (isUnread ? 'border-left:3px solid var(--verm);' : '');

    // Header row: logo/icon + sender + time
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

    // Brand/company logo or type icon
    var logoEl = document.createElement('div');
    logoEl.style.cssText = 'width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:' + typeInfo.bg + ';';

    var logoUrl = null;
    if (msg.brands && msg.brands.logo_url) logoUrl = msg.brands.logo_url;
    else if (msg.companies && msg.companies.logo_url) logoUrl = msg.companies.logo_url;

    if (logoUrl) {
      var img = document.createElement('img');
      img.src = logoUrl;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;';
      logoEl.textContent = '';
      logoEl.appendChild(img);
    } else {
      logoEl.textContent = typeInfo.icon;
    }
    header.appendChild(logoEl);

    // Sender name
    var senderEl = document.createElement('div');
    senderEl.style.cssText = 'flex:1;min-width:0;';

    var senderName = document.createElement('div');
    senderName.style.cssText = 'font-size:12px;color:var(--text-muted);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    var sName = '';
    if (msg.companies && msg.companies.company_name) sName = msg.companies.company_name;
    else if (msg.brands && msg.brands.name) sName = msg.brands.name;
    else if (msg.message_type === 'system') sName = 'HelloTalent';
    else sName = 'Bilinmeyen';
    senderName.textContent = sName;
    senderEl.appendChild(senderName);

    // Type badge
    var typeBadge = document.createElement('span');
    typeBadge.style.cssText = 'font-size:10px;padding:1px 6px;border-radius:8px;font-weight:600;background:' + typeInfo.bg + ';color:' + typeInfo.color + ';';
    typeBadge.textContent = typeInfo.label;
    senderEl.appendChild(typeBadge);

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

    // Title
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

    // CTA button (if exists)
    if (msg.cta_label && msg.cta_url) {
      var ctaRow = document.createElement('div');
      ctaRow.style.cssText = 'margin-top:10px;';

      var ctaBtn = document.createElement('a');
      ctaBtn.href = msg.cta_url;
      ctaBtn.target = '_blank';
      ctaBtn.rel = 'noopener';
      ctaBtn.style.cssText = 'display:inline-block;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;background:' + typeInfo.color + ';color:white;transition:opacity .2s;';
      ctaBtn.textContent = msg.cta_label;
      ctaBtn.addEventListener('mouseenter', function() { this.style.opacity = '0.85'; });
      ctaBtn.addEventListener('mouseleave', function() { this.style.opacity = '1'; });
      ctaBtn.addEventListener('click', function(e) { e.stopPropagation(); });

      ctaRow.appendChild(ctaBtn);
      card.appendChild(ctaRow);
    }

    // Cover image (if exists)
    if (msg.cover_image_url) {
      var imgWrap = document.createElement('div');
      imgWrap.style.cssText = 'margin-top:10px;border-radius:8px;overflow:hidden;aspect-ratio:16/9;background:#f0f0f0;';

      var coverImg = document.createElement('img');
      coverImg.src = msg.cover_image_url;
      coverImg.alt = '';
      coverImg.loading = 'lazy';
      coverImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      imgWrap.appendChild(coverImg);
      card.appendChild(imgWrap);
    }

    // Click handler — mark as read + expand
    card.addEventListener('click', function() {
      if (isUnread) {
        markAsRead(msg.id);
        msg.status = 'read';
        // Re-render to update visual state
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
     MARK AS READ
     ═══════════════════════════════════════════════════════════════ */
  async function markAsRead(messageId) {
    var supa = window._htSupa || (typeof supabase !== 'undefined' ? supabase : null);
    if (!supa) return;

    try {
      await supa.from('inbox_messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     UNREAD BADGE MANAGEMENT
     ═══════════════════════════════════════════════════════════════ */
  function updateUnreadBadges() {
    var unreadCount = 0;
    for (var i = 0; i < allMessages.length; i++) {
      if (allMessages[i].status !== 'read') unreadCount++;
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
        .from('inbox_messages')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'read');

      var count = res.count || 0;

      var sidebarBadge = document.getElementById('badge-inbox-unread');
      if (sidebarBadge && count > 0) {
        sidebarBadge.textContent = count > 99 ? '99+' : count;
        sidebarBadge.style.display = '';
      }

      var bnBadge = document.getElementById('badge-inbox-bn');
      if (bnBadge && count > 0) {
        bnBadge.textContent = count > 9 ? '9+' : count;
        bnBadge.style.display = 'flex';
      }
    } catch (err) {
      console.error('Inbox preload error:', err);
    }
  }

  /* ── INIT: Preload unread count after page settles ── */
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(preloadUnreadCount, 2500);
  });

})();
