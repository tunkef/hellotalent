/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Team yönetimi (FAZ B Sprint 6)
   - Ekip listesi (mevcut kullanıcı + demo)
   - Davet modal (admin / recruiter / viewer)
   - Davet butonu disabled (MVP 2)
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  var $list, $loading;
  var $btnInvite, $modal, $modalClose, $modalBackdrop;
  var $form, $emailInput, $nameInput;
  var $btnCancel, $btnSend;
  var $toast;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.textContent = msg;
    $toast.setAttribute('data-type', type || 'info');
    $toast.setAttribute('data-show', 'true');
    setTimeout(function () { $toast.setAttribute('data-show', 'false'); }, 2400);
  }

  function roleLabel(r) {
    var map = { admin: 'Yönetici', recruiter: 'İşe alım uzmanı', viewer: 'Gözlemci' };
    return map[r] || r;
  }

  function renderList() {
    if (!$list) return;
    if ($loading) $loading.hidden = true;
    while ($list.firstChild) $list.removeChild($list.firstChild);

    var profile = window.HRShell && window.HRShell.getProfile && window.HRShell.getProfile();
    var user = window.HRShell && window.HRShell.getUser && window.HRShell.getUser();

    var members = [];
    if (profile || user) {
      members.push({
        id: (profile && profile.id) || (user && user.id) || 'self',
        name: profile && (profile.ad + ' ' + (profile.soyad || '')).trim() || (user && user.email && user.email.split('@')[0]) || 'Kullanıcı',
        email: (profile && profile.email) || (user && user.email) || '—',
        role: (profile && profile.employer_role) || 'admin',
        is_self: true,
        joined_at: null
      });
    }

    if (members.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'hr-empty-state';
      var p = document.createElement('p');
      p.textContent = 'Ekip üyesi yüklenemedi.';
      empty.appendChild(p);
      $list.appendChild(empty);
      return;
    }

    members.forEach(function (m) {
      var row = document.createElement('article');
      row.className = 'hr-team-row';

      var avatar = document.createElement('div');
      avatar.className = 'hr-team-row__avatar';
      avatar.textContent = (m.name || 'K').charAt(0).toLocaleUpperCase('tr-TR');
      row.appendChild(avatar);

      var body = document.createElement('div');
      body.className = 'hr-team-row__body';
      var nm = document.createElement('div');
      nm.className = 'hr-team-row__name';
      nm.textContent = m.name;
      body.appendChild(nm);
      var em = document.createElement('div');
      em.className = 'hr-team-row__email';
      em.textContent = m.email;
      body.appendChild(em);
      row.appendChild(body);

      var role = document.createElement('span');
      role.className = 'hr-team-row__role';
      role.setAttribute('data-role', m.role);
      role.textContent = roleLabel(m.role);
      row.appendChild(role);

      if (m.is_self) {
        var self = document.createElement('span');
        self.className = 'hr-team-row__self';
        self.textContent = 'Siz';
        row.appendChild(self);
      }

      $list.appendChild(row);
    });
  }

  function openModal() {
    if (!$modal) return;
    $modal.setAttribute('aria-hidden', 'false');
    $modal.setAttribute('data-open', 'true');
    setTimeout(function () { if ($emailInput) $emailInput.focus(); }, 50);
  }

  function closeModal() {
    if (!$modal) return;
    $modal.setAttribute('aria-hidden', 'true');
    $modal.setAttribute('data-open', 'false');
  }

  function bindEvents() {
    if ($btnInvite) $btnInvite.addEventListener('click', openModal);
    if ($modalClose) $modalClose.addEventListener('click', closeModal);
    if ($modalBackdrop) $modalBackdrop.addEventListener('click', closeModal);
    if ($btnCancel) $btnCancel.addEventListener('click', closeModal);
    if ($btnSend) {
      $btnSend.addEventListener('click', function () {
        showToast('Davet MVP 2 ile aktif olur', 'info');
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $modal && $modal.getAttribute('data-open') === 'true') {
        closeModal();
      }
    });
  }

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
      opt.textContent = label;
      var active = window.HRShell.getActivePosition();
      var isActive = (!value && !active) || (active && String(active.id) === String(value));
      if (isActive) opt.setAttribute('aria-selected', 'true');
      opt.addEventListener('click', function () {
        if (!value) window.HRShell.setActivePosition(null);
        else {
          var p = positions.find(function (x) { return String(x.id) === String(value); });
          if (p) window.HRShell.setActivePosition({ id: p.id, title: p.title });
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

  function cacheDom() {
    $list = $('[data-hr-team-list]');
    $loading = $('[data-hr-team-loading]');
    $btnInvite = $('[data-hr-team-invite]');
    $modal = $('[data-hr-team-modal]');
    $modalClose = $('[data-hr-team-modal-close]');
    $modalBackdrop = $('[data-hr-team-modal-backdrop]');
    $form = $('[data-hr-team-form]');
    $emailInput = $('[data-hr-team-input-email]');
    $nameInput = $('[data-hr-team-input-name]');
    $btnCancel = $('[data-hr-team-cancel]');
    $btnSend = $('[data-hr-team-send]');
    $toast = $('[data-hr-toast]');
  }

  async function init() {
    cacheDom();
    if (!window.HRShell) return;
    await window.HRShell.ready();
    try { await renderPositionSwitcher(); } catch (e) {}
    renderList();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
