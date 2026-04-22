/* ═══ admin-coach-content.js — Coach Content Management Module ═══ */
(function(){
  'use strict';

  var loaded = false;
  var mounted = false;
  var _currentTab = 'coaches'; /* coaches | invites | posts */

  var PANEL_HTML = ''
    + '<div class="panel-header"><h2>&#304;&ccedil;erik Y&ouml;netimi</h2></div>'
    + '<div id="coach-content-area"></div>';

  window._htAdminMountCoachContent = function() {
    if (mounted) return;
    var panel = document.getElementById('panel-coach-content');
    var core = window._htAdminCore;
    if (panel && core) { core.mount(panel, PANEL_HTML); mounted = true; }
  };
  var _postsFilter = 'submitted'; /* submitted | published | all */

  var STATUS_LABELS = {
    draft: 'Taslak', submitted: 'Incelemede', changes_requested: 'Duzeltme Gerekli',
    published: 'Yayinda', archived: 'Arsivlendi', rejected: 'Reddedildi'
  };

  var CATEGORY_LABELS = {
    mulakat_ipucu: 'Mulakat Ipucu', yetkinlik_rehberi: 'Yetkinlik Rehberi',
    kariyer_gelisim_onerileri: 'Kariyer Gelisim', performans: 'Performans',
    kariyer_hikayesi: 'Kariyer Hikayesi', sektor_analizi: 'Sektor Analizi',
    /* backward compat */
    kariyer_hikaye: 'Kariyer Hikayesi', sektor_analiz: 'Sektor Analizi'
  };

  var INVITE_STATUS_LABELS = {
    pending: 'Bekliyor', accepted: 'Kabul Edildi', expired: 'Suresi Doldu', revoked: 'Iptal Edildi'
  };

  /* ── Coach notification email type map ── */
  var NOTIF_EMAIL_TYPES = {
    published: 'coach_post_published',
    changes_requested: 'coach_post_changes_requested',
    rejected: 'coach_post_rejected',
    archived: 'coach_post_archived',
    deletion_dismissed: 'coach_post_deletion_dismissed'
  };

  /* ── HELPERS ── */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function formatDate(d) {
    if (!d) return '-';
    var dt = new Date(d);
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function buildStatusBadge(status, labels) {
    var badge = el('span', 'acc-badge acc-badge-' + status, (labels || STATUS_LABELS)[status] || status);
    return badge;
  }

  /* ── MAIN LOADER ── */
  window._htAdminLoadCoachContent = async function() {
    if (window._htAdminMountCoachContent) window._htAdminMountCoachContent();
    var container = document.getElementById('coach-content-area');
    if (!container) return;
    if (loaded) { renderTabs(container); return; }
    loaded = true;
    renderTabs(container);
  };

  /* ── TABS ── */
  function renderTabs(container) {
    while (container.firstChild) container.removeChild(container.firstChild);

    var tabBar = el('div', 'acc-tabs');
    var tabCoaches = el('button', 'acc-tab' + (_currentTab === 'coaches' ? ' active' : ''), 'Koclar');
    tabCoaches.addEventListener('click', function() { _currentTab = 'coaches'; renderTabs(container); });
    var tabInvites = el('button', 'acc-tab' + (_currentTab === 'invites' ? ' active' : ''), 'Davetler');
    tabInvites.addEventListener('click', function() { _currentTab = 'invites'; renderTabs(container); });
    var tabPosts = el('button', 'acc-tab' + (_currentTab === 'posts' ? ' active' : ''), 'Icerikler');
    tabPosts.addEventListener('click', function() { _currentTab = 'posts'; renderTabs(container); });
    tabBar.appendChild(tabCoaches);
    tabBar.appendChild(tabInvites);
    tabBar.appendChild(tabPosts);
    container.appendChild(tabBar);

    var contentArea = el('div', 'acc-content');
    container.appendChild(contentArea);

    if (_currentTab === 'coaches') {
      loadCoaches(contentArea);
    } else if (_currentTab === 'invites') {
      loadInvites(contentArea);
    } else {
      loadPosts(contentArea);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     COACHES TAB
     ═══════════════════════════════════════════════════════════════ */

  var COACH_ACTIVE_LABELS = { true: 'Aktif', false: 'Pasif' };

  var _coachSearchTerm = '';

  async function loadCoaches(container) {
    container.textContent = 'Yukleniyor...';
    var supa = window._htAdminSupa;

    try {
      /* Fetch coach profiles with invite email via invite_id FK */
      var res = await supa.from('coach_profiles')
        .select('*, coach_invites(email)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (res.error) {
        console.error('Load coaches error:', res.error.message);
        container.textContent = 'Yukleme hatasi';
        return;
      }

      var coaches = res.data || [];

      /* Fetch post counts + latest post per coach */
      var postCounts = {};
      var latestPost = {}; /* coach_id → { status, updated_at } */
      if (coaches.length > 0) {
        var coachIds = coaches.map(function(c) { return c.id; });
        var postsRes = await supa.from('coach_posts')
          .select('coach_id, status, updated_at')
          .in('coach_id', coachIds)
          .order('updated_at', { ascending: false })
          .limit(200);
        if (postsRes.data) {
          for (var ci = 0; ci < postsRes.data.length; ci++) {
            var row = postsRes.data[ci];
            postCounts[row.coach_id] = (postCounts[row.coach_id] || 0) + 1;
            if (!latestPost[row.coach_id]) latestPost[row.coach_id] = row;
          }
        }
      }

      while (container.firstChild) container.removeChild(container.firstChild);

      /* Search bar */
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Koc adi veya e-posta ile ara...';
      searchInput.value = _coachSearchTerm;
      searchInput.style.cssText = 'width:100%;padding:8px 12px;border:1.5px solid var(--border,#E5E3DF);border-radius:8px;font-size:13px;font-family:inherit;margin-bottom:12px;background:var(--white,#fff);color:var(--text,#111);';
      searchInput.addEventListener('input', function() {
        _coachSearchTerm = searchInput.value.trim().toLowerCase();
        renderCoachTable(tbody, coaches, postCounts, latestPost, container);
      });
      container.appendChild(searchInput);

      if (coaches.length === 0) {
        container.appendChild(el('div', 'acc-empty', 'Henuz koc profili yok'));
        return;
      }

      var table = document.createElement('table');
      table.className = 'admin-table';
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      var headers = ['', 'Ad', 'E-posta', 'Durum', 'Yazi', 'Son Icerik', 'Islem'];
      for (var h = 0; h < headers.length; h++) {
        var th = document.createElement('th');
        th.textContent = headers[h];
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      renderCoachTable(tbody, coaches, postCounts, latestPost, container);
      table.appendChild(tbody);
      container.appendChild(table);
    } catch (e) {
      console.error('Load coaches error:', e);
      container.textContent = 'Yukleme hatasi';
    }
  }

  function renderCoachTable(tbody, coaches, postCounts, latestPost, container) {
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);

    var filtered = coaches;
    if (_coachSearchTerm) {
      filtered = coaches.filter(function(c) {
        var name = (c.display_name || '').toLowerCase();
        var email = ((c.coach_invites && c.coach_invites.email) || '').toLowerCase();
        return name.indexOf(_coachSearchTerm) !== -1 || email.indexOf(_coachSearchTerm) !== -1;
      });
    }

    if (filtered.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyTd = document.createElement('td');
      emptyTd.colSpan = 7;
      emptyTd.style.cssText = 'text-align:center;color:var(--muted);padding:16px;';
      emptyTd.textContent = _coachSearchTerm ? 'Sonuc bulunamadi' : 'Henuz koc profili yok';
      emptyRow.appendChild(emptyTd);
      tbody.appendChild(emptyRow);
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var coach = filtered[i];
        var tr = document.createElement('tr');

        /* Avatar */
        var tdAvatar = document.createElement('td');
        tdAvatar.style.cssText = 'width:36px;';
        var avatarEl = document.createElement('div');
        avatarEl.style.cssText = 'width:32px;height:32px;border-radius:50%;overflow:hidden;background:var(--navy-light,#EEF0F7);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--navy,#1E2D5E);';
        if (coach.avatar_url) {
          var avatarImg = document.createElement('img');
          avatarImg.alt = '';
          avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          avatarEl.appendChild(avatarImg);
          window.HT.signStorageUrl(coach.avatar_url).then(function(url) {
            if (url) avatarImg.src = url;
          });
        } else {
          avatarEl.textContent = (coach.display_name || '?').charAt(0).toUpperCase();
        }
        tdAvatar.appendChild(avatarEl);
        tr.appendChild(tdAvatar);

        /* Display name */
        var tdName = document.createElement('td');
        tdName.style.cssText = 'font-weight:600;';
        tdName.textContent = coach.display_name || '-';
        tr.appendChild(tdName);

        /* Email from invite */
        var tdEmail = document.createElement('td');
        tdEmail.style.cssText = 'font-size:12px;color:var(--muted);';
        var inviteEmail = (coach.coach_invites && coach.coach_invites.email) || '-';
        tdEmail.textContent = inviteEmail !== '-' ? inviteEmail + ' (davet)' : '-';
        tr.appendChild(tdEmail);

        /* Active status badge */
        var tdStatus = document.createElement('td');
        var statusBadge = el('span', 'acc-badge acc-badge-' + (coach.is_active ? 'published' : 'rejected'),
          coach.is_active ? 'Aktif' : 'Pasif');
        tdStatus.appendChild(statusBadge);
        tr.appendChild(tdStatus);

        /* Post count */
        var tdPosts = document.createElement('td');
        tdPosts.style.cssText = 'font-family:"DM Mono",monospace;font-size:13px;';
        tdPosts.textContent = postCounts[coach.id] || 0;
        tr.appendChild(tdPosts);

        /* Latest post activity signal */
        var tdActivity = document.createElement('td');
        tdActivity.style.cssText = 'font-size:11px;';
        var lp = latestPost[coach.id];
        if (lp) {
          var lpBadge = buildStatusBadge(lp.status);
          lpBadge.style.cssText += 'font-size:9px;padding:1px 6px;margin-right:4px;';
          tdActivity.appendChild(lpBadge);
          var lpDate = el('span', '', formatDate(lp.updated_at));
          lpDate.style.cssText = 'color:var(--muted);';
          tdActivity.appendChild(lpDate);
        } else {
          tdActivity.style.color = 'var(--muted)';
          tdActivity.textContent = '-';
        }
        tr.appendChild(tdActivity);

        /* Toggle action */
        var tdAction = document.createElement('td');
        var toggleBtn = el('button',
          'acc-btn-sm ' + (coach.is_active ? 'acc-btn-warning' : 'acc-btn-primary'),
          coach.is_active ? 'Pasife Al' : 'Aktif Et');
        toggleBtn.addEventListener('click', (function(coachId, currentActive) {
          return function() { toggleCoachActive(coachId, currentActive, container); };
        })(coach.id, coach.is_active));
        tdAction.appendChild(toggleBtn);

        /* Studio link copy — recovery operasyonu */
        var copyBtn = el('button', 'acc-btn-sm acc-btn-ghost', 'Studio Linkini Kopyala');
        copyBtn.style.cssText = 'margin-left:6px;font-size:11px;';
        copyBtn.addEventListener('click', function() {
          var url = 'https://hellotalent.ai/coach-studio.html';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
              copyBtn.textContent = 'Kopyalandi';
              setTimeout(function() { copyBtn.textContent = 'Studio Linkini Kopyala'; }, 2000);
            }).catch(function() {
              copyBtn.textContent = 'Kopyalanamadi';
              setTimeout(function() { copyBtn.textContent = 'Studio Linkini Kopyala'; }, 2000);
            });
          } else {
            copyBtn.textContent = 'Kopyalanamadi';
            setTimeout(function() { copyBtn.textContent = 'Studio Linkini Kopyala'; }, 2000);
          }
        });
        tdAction.appendChild(copyBtn);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      }
  }

  async function toggleCoachActive(coachId, currentActive, container) {
    /* Only confirm when deactivating */
    if (currentActive) {
      var confirmed = window.confirm('Bu kocun yayindaki tum icerikleri feed\'den kaldirilacak. Devam etmek istediginize emin misiniz?');
      if (!confirmed) return;
    }

    var supa = window._htAdminSupa;
    try {
      var res = await supa.from('coach_profiles')
        .update({ is_active: !currentActive })
        .eq('id', coachId);
      if (res.error) {
        console.error('Toggle coach error:', res.error.message);
        return;
      }
      loadCoaches(container);
    } catch (e) {
      console.error('Toggle coach error:', e);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     INVITES TAB
     ═══════════════════════════════════════════════════════════════ */

  async function loadInvites(container) {
    container.textContent = 'Yukleniyor...';
    var supa = window._htAdminSupa;

    try {
      var res = await supa.from('coach_invites')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      while (container.firstChild) container.removeChild(container.firstChild);

      // New invite form
      container.appendChild(buildInviteForm(container));

      var invites = res.data || [];
      if (invites.length === 0) {
        container.appendChild(el('div', 'acc-empty', 'Henuz davet yok'));
        return;
      }

      var table = document.createElement('table');
      table.className = 'admin-table';
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      var headers = ['E-posta', 'Isim', 'Durum', 'Olusturma', 'Son Tarih', 'Islem'];
      for (var h = 0; h < headers.length; h++) {
        var th = document.createElement('th');
        th.textContent = headers[h];
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      for (var i = 0; i < invites.length; i++) {
        var inv = invites[i];
        var tr = document.createElement('tr');

        var tdEmail = document.createElement('td');
        tdEmail.textContent = inv.email;
        tr.appendChild(tdEmail);

        var tdName = document.createElement('td');
        tdName.textContent = inv.display_name || '-';
        tr.appendChild(tdName);

        var tdStatus = document.createElement('td');
        tdStatus.appendChild(buildStatusBadge(inv.status, INVITE_STATUS_LABELS));
        tr.appendChild(tdStatus);

        var tdCreated = document.createElement('td');
        tdCreated.style.cssText = 'font-size:12px;color:var(--muted);';
        tdCreated.textContent = formatDate(inv.created_at);
        tr.appendChild(tdCreated);

        var tdExpires = document.createElement('td');
        tdExpires.style.cssText = 'font-size:12px;color:var(--muted);';
        tdExpires.textContent = formatDate(inv.expires_at);
        tr.appendChild(tdExpires);

        var tdAction = document.createElement('td');
        if (inv.status === 'pending') {
          var revokeBtn = el('button', 'acc-btn-sm acc-btn-danger', 'Iptal Et');
          revokeBtn.addEventListener('click', (function(invId) {
            return function() { revokeInvite(invId, container); };
          })(inv.id));
          tdAction.appendChild(revokeBtn);
        } else {
          tdAction.textContent = '-';
        }
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      container.appendChild(table);
    } catch (e) {
      console.error('Load invites error:', e);
      container.textContent = 'Yukleme hatasi';
    }
  }

  function buildInviteForm(parentContainer) {
    var form = el('div', 'acc-invite-form');

    var title = el('div', 'acc-form-title', 'Yeni Koc Daveti');
    form.appendChild(title);

    var row = el('div', 'acc-form-row');

    var emailWrap = el('div', 'acc-form-field');
    var emailLabel = el('label', '', 'E-posta');
    var emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.id = 'acc-invite-email';
    emailInput.placeholder = 'koc@example.com';
    emailWrap.appendChild(emailLabel);
    emailWrap.appendChild(emailInput);
    row.appendChild(emailWrap);

    var nameWrap = el('div', 'acc-form-field');
    var nameLabel = el('label', '', 'Isim');
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'acc-invite-name';
    nameInput.placeholder = 'Kocun adi';
    nameWrap.appendChild(nameLabel);
    nameWrap.appendChild(nameInput);
    row.appendChild(nameWrap);

    var btnWrap = el('div', 'acc-form-field acc-form-btn-wrap');
    var sendBtn = el('button', 'acc-btn-sm acc-btn-primary', 'Davet Gonder');
    sendBtn.addEventListener('click', function() { sendInvite(parentContainer); });
    btnWrap.appendChild(sendBtn);
    row.appendChild(btnWrap);

    form.appendChild(row);

    var msgEl = el('div', 'acc-form-msg');
    msgEl.id = 'acc-invite-msg';
    form.appendChild(msgEl);

    return form;
  }

  async function sendInvite(container) {
    var emailEl = document.getElementById('acc-invite-email');
    var nameEl = document.getElementById('acc-invite-name');
    var msgEl = document.getElementById('acc-invite-msg');

    var email = emailEl ? emailEl.value.trim() : '';
    var name = nameEl ? nameEl.value.trim() : '';

    if (!email) { showFormMsg(msgEl, 'E-posta gerekli.', 'error'); return; }

    var supa = window._htAdminSupa;
    var admin = window._htAdminUser;

    try {
      var res = await supa.from('coach_invites').insert({
        email: email,
        display_name: name || null,
        invited_by: admin.id
      });

      if (res.error) {
        showFormMsg(msgEl, 'Hata: ' + res.error.message, 'error');
        return;
      }

      showFormMsg(msgEl, 'Davet gonderildi.', 'success');
      if (emailEl) emailEl.value = '';
      if (nameEl) nameEl.value = '';

      // Refresh list
      loadInvites(container);
    } catch (e) {
      console.error('Send invite error:', e);
      showFormMsg(msgEl, 'Gonderme hatasi.', 'error');
    }
  }

  async function revokeInvite(inviteId, container) {
    var supa = window._htAdminSupa;
    try {
      await supa.from('coach_invites')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', inviteId);
      loadInvites(container);
    } catch (e) {
      console.error('Revoke invite error:', e);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     POSTS TAB
     ═══════════════════════════════════════════════════════════════ */

  async function loadPosts(container) {
    container.textContent = 'Yukleniyor...';
    var supa = window._htAdminSupa;

    try {
      /* Defensive two-tier query: deletion_requested_at may not exist pre-migration */
      var selectCols = '*, deletion_requested_at, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years)';
      var query = supa.from('coach_posts').select(selectCols).order('updated_at', { ascending: false }).limit(100);

      if (_postsFilter === 'submitted') {
        query = query.in('status', ['submitted', 'changes_requested']);
      } else if (_postsFilter === 'published') {
        query = query.eq('status', 'published');
      }

      var res = await query;
      /* Fallback: if query fails because deletion_requested_at column doesn't exist yet */
      if (res.error && res.error.message && res.error.message.indexOf('deletion_requested_at') !== -1) {
        var fallbackCols = '*, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years)';
        query = supa.from('coach_posts').select(fallbackCols).order('updated_at', { ascending: false });
        if (_postsFilter === 'submitted') query = query.in('status', ['submitted', 'changes_requested']);
        else if (_postsFilter === 'published') query = query.eq('status', 'published');
        res = await query;
      }
      while (container.firstChild) container.removeChild(container.firstChild);

      // Filter tabs
      var filterBar = el('div', 'acc-filter-bar');
      var filters = [
        { key: 'submitted', label: 'Bekleyen' },
        { key: 'published', label: 'Yayinda' },
        { key: 'all', label: 'Tumu' }
      ];
      for (var f = 0; f < filters.length; f++) {
        var filterBtn = el('button', 'acc-filter-btn' + (_postsFilter === filters[f].key ? ' active' : ''), filters[f].label);
        filterBtn.addEventListener('click', (function(key) {
          return function() { _postsFilter = key; loadPosts(container); };
        })(filters[f].key));
        filterBar.appendChild(filterBtn);
      }
      container.appendChild(filterBar);

      var posts = res.data || [];
      if (posts.length === 0) {
        container.appendChild(el('div', 'acc-empty', 'Icerik bulunamadi'));
        return;
      }

      for (var i = 0; i < posts.length; i++) {
        container.appendChild(buildPostCard(posts[i], container));
      }
    } catch (e) {
      console.error('Load posts error:', e);
      container.textContent = 'Yukleme hatasi';
    }
  }

  function buildPostCard(post, parentContainer) {
    var card = el('div', 'acc-post-card');

    var header = el('div', 'acc-post-header');
    var titleEl = el('div', 'acc-post-title', post.title);
    header.appendChild(titleEl);
    header.appendChild(buildStatusBadge(post.status));
    card.appendChild(header);

    /* Cover thumbnail if available */
    if (post.cover_image_url) {
      var coverThumb = document.createElement('img');
      coverThumb.src = post.cover_image_url;
      coverThumb.alt = post.cover_image_alt || '';
      coverThumb.style.cssText = 'width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;';
      card.appendChild(coverThumb);
    }

    var meta = el('div', 'acc-post-meta');
    /* Coach avatar */
    var cp = post.coach_profiles;
    if (cp && cp.avatar_url) {
      var avatarImg = document.createElement('img');
      avatarImg.alt = '';
      avatarImg.style.cssText = 'width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;';
      meta.appendChild(avatarImg);
      window.HT.signStorageUrl(cp.avatar_url).then(function(url) {
        if (url) avatarImg.src = url;
      });
    }
    var coachName = (cp && cp.display_name) || 'Bilinmeyen Koc';
    meta.appendChild(el('span', '', coachName));
    meta.appendChild(el('span', 'acc-post-sep', '·'));
    meta.appendChild(el('span', '', CATEGORY_LABELS[post.category] || post.category));
    meta.appendChild(el('span', 'acc-post-sep', '·'));
    meta.appendChild(el('span', '', formatDate(post.updated_at)));
    card.appendChild(meta);

    if (post.excerpt) {
      var excerptDiv = el('div', 'acc-post-excerpt', post.excerpt);
      card.appendChild(excerptDiv);
    }

    /* Author signature — for editorial review */
    if (cp && (cp.bio_short || cp.sector_background || cp.experience_years || cp.title)) {
      var authorInfo = el('div', 'acc-post-author');
      authorInfo.style.cssText = 'font-size:11px;color:var(--muted);margin:4px 0 8px;padding:8px 12px;background:#F9FAFB;border-radius:8px;border:1px solid #F3F4F6;line-height:1.6;';
      var authorParts = [];
      if (cp.title) authorParts.push(cp.title);
      if (cp.sector_background) authorParts.push(cp.sector_background);
      if (cp.experience_years) authorParts.push(cp.experience_years + ' yil deneyim');
      if (cp.bio_short) authorParts.push(cp.bio_short);
      authorInfo.textContent = 'Yazar: ' + authorParts.join(' · ');
      card.appendChild(authorInfo);
    }

    // Expandable body
    var bodyToggle = el('button', 'acc-btn-sm acc-btn-ghost', 'Onizleme');
    var bodyDiv = el('div', 'acc-post-body');
    bodyDiv.textContent = post.body;
    bodyDiv.style.display = 'none';
    bodyToggle.addEventListener('click', function() {
      bodyDiv.style.display = bodyDiv.style.display === 'none' ? 'block' : 'none';
      bodyToggle.textContent = bodyDiv.style.display === 'none' ? 'Onizleme' : 'Gizle';
    });

    var actionRow = el('div', 'acc-post-actions');
    actionRow.appendChild(bodyToggle);

    // Status-specific actions
    if (post.status === 'submitted' || post.status === 'changes_requested') {
      var publishBtn = el('button', 'acc-btn-sm acc-btn-primary', 'Yayinla');
      publishBtn.addEventListener('click', function() { updatePostStatus(post.id, 'published', null, parentContainer); });
      actionRow.appendChild(publishBtn);

      var changesBtn = el('button', 'acc-btn-sm acc-btn-warning', 'Duzeltme Iste');
      changesBtn.addEventListener('click', function() { promptAdminNote(post.id, 'changes_requested', parentContainer); });
      actionRow.appendChild(changesBtn);

      var rejectBtn = el('button', 'acc-btn-sm acc-btn-danger', 'Reddet');
      rejectBtn.addEventListener('click', function() { promptAdminNote(post.id, 'rejected', parentContainer); });
      actionRow.appendChild(rejectBtn);
    }

    if (post.status === 'published') {
      /* Show deletion request indicator if coach requested deletion */
      if (post.deletion_requested_at) {
        var delReqBadge = el('span', 'acc-badge acc-badge-changes_requested', 'Silme Talebi');
        delReqBadge.style.cssText = 'margin-right:6px;background:#FEF3C7;color:#92400E;';
        actionRow.appendChild(delReqBadge);
      }
      var archiveBtn = el('button', 'acc-btn-sm acc-btn-ghost', 'Arsivle');
      var _postHadDeletionReq = !!post.deletion_requested_at;
      archiveBtn.addEventListener('click', function() {
        var confirmed = window.confirm('Bu yaziyi arsivlemek istediginize emin misiniz? Feed\'den kaldirilacak.');
        if (!confirmed) return;
        /* Signal to email template whether this archive is a deletion approval or a normal archive */
        var archiveNote = _postHadDeletionReq ? '__deletion_approved__' : null;
        updatePostStatus(post.id, 'archived', archiveNote, parentContainer);
      });
      actionRow.appendChild(archiveBtn);
      if (post.deletion_requested_at) {
        var dismissBtn = el('button', 'acc-btn-sm acc-btn-ghost', 'Talebi Reddet');
        dismissBtn.addEventListener('click', function() { dismissDeletionRequest(post.id, parentContainer); });
        actionRow.appendChild(dismissBtn);
      }
    }

    card.appendChild(actionRow);
    card.appendChild(bodyDiv);

    return card;
  }

  async function updatePostStatus(postId, newStatus, adminNote, container) {
    var supa = window._htAdminSupa;
    var updates = { status: newStatus };
    if (adminNote !== null && adminNote !== undefined) updates.admin_note = adminNote;
    if (newStatus === 'published') updates.published_at = new Date().toISOString();
    /* Clear deletion request when archiving (deletion approved) — best effort, column may not exist pre-migration */
    var _clearDeletionOnArchive = (newStatus === 'archived');

    try {
      var res = await supa.from('coach_posts').update(updates).eq('id', postId);
      if (res.error) { console.error('Update post error:', res.error.message); return; }

      /* Clear deletion_requested_at on archive — separate update, best effort (column may not exist pre-migration) */
      if (_clearDeletionOnArchive) {
        supa.from('coach_posts').update({ deletion_requested_at: null }).eq('id', postId).then(function() {}).catch(function() {});
      }

      /* Enqueue coach notification email (best effort) */
      enqueueCoachNotification(postId, newStatus, adminNote);

      loadPosts(container);
      updatePendingBadge();
    } catch (e) {
      console.error('Update post exception:', e);
    }
  }

  /* ── COACH NOTIFICATION EMAIL (via SECURITY DEFINER RPC) ── */
  async function enqueueCoachNotification(postId, newStatus, adminNote) {
    if (!NOTIF_EMAIL_TYPES[newStatus]) return;

    var supa = window._htAdminSupa;
    try {
      var res = await supa.rpc('enqueue_coach_post_notification', {
        p_post_id: postId,
        p_new_status: newStatus,
        p_admin_note: adminNote || null
      });
      if (res.error) console.error('Coach notification enqueue error:', res.error.message);
    } catch (e) {
      console.error('Coach notification enqueue error:', e);
      /* Best effort — don't block the moderation flow */
    }
  }

  function promptAdminNote(postId, targetStatus, container) {
    var note = prompt(targetStatus === 'rejected' ? 'Reddetme nedeni:' : 'Duzeltme notu:');
    if (note === null) return;
    updatePostStatus(postId, targetStatus, note.trim(), container);
  }

  /* ── DISMISS DELETION REQUEST ── */
  async function dismissDeletionRequest(postId, container) {
    var confirmed = window.confirm('Silme talebini reddetmek istediginize emin misiniz? Koc bilgilendirilecek.');
    if (!confirmed) return;
    var supa = window._htAdminSupa;
    try {
      var res = await supa.from('coach_posts')
        .update({ deletion_requested_at: null })
        .eq('id', postId);
      if (res.error) { console.error('Dismiss deletion error:', res.error); return; }
      /* Notify coach that deletion request was dismissed */
      enqueueCoachNotification(postId, 'deletion_dismissed', null);
      loadPosts(container);
    } catch (e) {
      console.error('Dismiss deletion error:', e);
    }
  }

  async function updatePendingBadge() {
    var supa = window._htAdminSupa;
    try {
      var res = await supa.from('coach_posts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['submitted', 'changes_requested']);
      var badge = document.getElementById('badge-coach-pending');
      if (badge) {
        var count = res.count || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
    } catch (e) { /* silent */ }
  }

  /* ── MSG HELPER ── */
  function showFormMsg(msgEl, text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'acc-form-msg ' + type;
    setTimeout(function() { msgEl.className = 'acc-form-msg'; msgEl.textContent = ''; }, 4000);
  }

})();
