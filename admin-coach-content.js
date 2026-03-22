/* ═══ admin-coach-content.js — Coach Content Management Module ═══ */
(function(){
  'use strict';

  var loaded = false;
  var _currentTab = 'invites'; /* invites | posts */
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
    var tabInvites = el('button', 'acc-tab' + (_currentTab === 'invites' ? ' active' : ''), 'Davetler');
    tabInvites.addEventListener('click', function() { _currentTab = 'invites'; renderTabs(container); });
    var tabPosts = el('button', 'acc-tab' + (_currentTab === 'posts' ? ' active' : ''), 'Icerikler');
    tabPosts.addEventListener('click', function() { _currentTab = 'posts'; renderTabs(container); });
    tabBar.appendChild(tabInvites);
    tabBar.appendChild(tabPosts);
    container.appendChild(tabBar);

    var contentArea = el('div', 'acc-content');
    container.appendChild(contentArea);

    if (_currentTab === 'invites') {
      loadInvites(contentArea);
    } else {
      loadPosts(contentArea);
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
        .order('created_at', { ascending: false });

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
      var query = supa.from('coach_posts')
        .select('*, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years)')
        .order('updated_at', { ascending: false });

      if (_postsFilter === 'submitted') {
        query = query.in('status', ['submitted', 'changes_requested']);
      } else if (_postsFilter === 'published') {
        query = query.eq('status', 'published');
      }

      var res = await query;
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
      avatarImg.src = cp.avatar_url;
      avatarImg.alt = '';
      avatarImg.style.cssText = 'width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:4px;';
      meta.appendChild(avatarImg);
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
      var archiveBtn = el('button', 'acc-btn-sm acc-btn-ghost', 'Arsivle');
      archiveBtn.addEventListener('click', function() { updatePostStatus(post.id, 'archived', null, parentContainer); });
      actionRow.appendChild(archiveBtn);
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

    try {
      var res = await supa.from('coach_posts').update(updates).eq('id', postId);
      if (res.error) { console.error('Update post error:', res.error); return; }
      loadPosts(container);
      updatePendingBadge();
    } catch (e) {
      console.error('Update post exception:', e);
    }
  }

  function promptAdminNote(postId, targetStatus, container) {
    var note = prompt(targetStatus === 'rejected' ? 'Reddetme nedeni:' : 'Duzeltme notu:');
    if (note === null) return;
    updatePostStatus(postId, targetStatus, note.trim(), container);
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
