/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Team — Asama 86 Sprint D
   Ekip uyeleri listesi + Bekleyen davetler + Davet modal.
   Demo: IK_DATA.getTeamMembers() + inviteTeamMember + cancelInvite.
   SOLID:
     - SRP: tek sorumluluk = team list render + invite modal.
     - DIP: IK_DATA public API'sine bagli.
   XSS-safe: textContent + DOM.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var els = null;
  var state = { members: [], invites: [] };

  function cacheEls() {
    els = {
      inviteBtn: $('#ik-tm-invite-btn'),
      membersList: $('#ik-tm-members-list'),
      membersCount: $('#ik-tm-members-count'),
      invitesList: $('#ik-tm-invites-list'),
      invitesCount: $('#ik-tm-invites-count'),
      invitesEmpty: $('#ik-tm-invites-empty'),
      loading: $('#ik-tm-loading'),
      modal: $('#ik-tm-modal'),
      modalBackdrop: $('#ik-tm-modal-backdrop'),
      modalClose: $('#ik-tm-modal-close'),
      form: $('#ik-tm-form'),
      inputEmail: $('#ik-tm-input-email'),
      inputName: $('#ik-tm-input-name'),
      cancelBtn: $('#ik-tm-cancel'),
      sendBtn: $('#ik-tm-send'),
      formMsg: $('#ik-tm-form-msg'),
      toast: $('#ik-toast')
    };
  }

  function showToast(text, kind) {
    if (!els.toast) return;
    els.toast.textContent = text || '';
    els.toast.className = 'ik-toast is-visible' + (kind ? ' ik-toast--' + kind : '');
    setTimeout(function () { els.toast.classList.remove('is-visible'); }, 3200);
  }

  function setMsg(text, kind) {
    if (!els.formMsg) return;
    els.formMsg.textContent = text || '';
    els.formMsg.className = 'ik-tm-msg' + (kind ? ' ik-tm-msg--' + kind : '');
  }

  function fmtRoleBadge(role) {
    if (role === 'admin') return { label: 'Yönetici', kind: 'admin' };
    if (role === 'recruiter') return { label: 'İşe alım uzmanı', kind: 'recruiter' };
    if (role === 'viewer') return { label: 'Gözlemci', kind: 'viewer' };
    return { label: role || '—', kind: 'default' };
  }

  function fmtRelativeTime(iso) {
    if (!iso) return '—';
    try {
      var t = new Date(iso).getTime();
      if (isNaN(t)) return '—';
      var diff = Date.now() - t;
      var min = Math.round(diff / 60000);
      if (min < 1) return 'şimdi';
      if (min < 60) return min + ' dk önce';
      var h = Math.round(min / 60);
      if (h < 24) return h + ' saat önce';
      var d = Math.round(h / 24);
      if (d < 30) return d + ' gün önce';
      return new Date(iso).toLocaleDateString('tr-TR');
    } catch (e) { return '—'; }
  }

  function initialOf(s) {
    if (!s) return '?';
    var t = String(s).trim();
    if (!t) return '?';
    return t.charAt(0).toUpperCase();
  }

  function renderMember(m) {
    var row = document.createElement('div');
    row.className = 'ik-tm-row';
    row.setAttribute('role', 'listitem');
    row.dataset.id = m.id;

    /* Avatar */
    var avatar = document.createElement('span');
    avatar.className = 'ik-tm-row__avatar';
    avatar.textContent = initialOf(m.name || m.email);
    avatar.setAttribute('aria-hidden', 'true');

    /* Info */
    var info = document.createElement('div');
    info.className = 'ik-tm-row__info';

    var nameEl = document.createElement('div');
    nameEl.className = 'ik-tm-row__name';
    nameEl.textContent = m.name || m.email || '—';
    if (m.is_self) {
      var youTag = document.createElement('span');
      youTag.className = 'ik-tm-row__you';
      youTag.textContent = 'Sen';
      nameEl.appendChild(document.createTextNode(' '));
      nameEl.appendChild(youTag);
    }

    var emailEl = document.createElement('div');
    emailEl.className = 'ik-tm-row__email';
    emailEl.textContent = m.email || '—';

    var metaEl = document.createElement('div');
    metaEl.className = 'ik-tm-row__meta';
    metaEl.textContent = 'Son aktivite: ' + fmtRelativeTime(m.last_active);

    info.appendChild(nameEl);
    info.appendChild(emailEl);
    info.appendChild(metaEl);

    /* Role badge */
    var role = fmtRoleBadge(m.role);
    var badge = document.createElement('span');
    badge.className = 'ik-tm-role-badge ik-tm-role-badge--' + role.kind;
    badge.textContent = role.label;

    /* Actions */
    var actions = document.createElement('div');
    actions.className = 'ik-tm-row__actions';

    if (!m.is_self) {
      var rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'ik-tm-row__rm';
      rmBtn.textContent = 'Çıkar';
      rmBtn.dataset.action = 'remove';
      rmBtn.dataset.id = m.id;
      actions.appendChild(rmBtn);
    } else {
      var selfTag = document.createElement('span');
      selfTag.className = 'ik-tm-row__self';
      selfTag.textContent = 'Sahip';
      actions.appendChild(selfTag);
    }

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(actions);
    return row;
  }

  function renderInvite(inv) {
    var row = document.createElement('div');
    row.className = 'ik-tm-row ik-tm-row--invite';
    row.setAttribute('role', 'listitem');
    row.dataset.id = inv.id;

    var avatar = document.createElement('span');
    avatar.className = 'ik-tm-row__avatar ik-tm-row__avatar--pending';
    avatar.textContent = initialOf(inv.name || inv.email);
    avatar.setAttribute('aria-hidden', 'true');

    var info = document.createElement('div');
    info.className = 'ik-tm-row__info';

    var nameEl = document.createElement('div');
    nameEl.className = 'ik-tm-row__name';
    nameEl.textContent = inv.name || inv.email || '—';

    var emailEl = document.createElement('div');
    emailEl.className = 'ik-tm-row__email';
    emailEl.textContent = inv.email || '—';

    var metaEl = document.createElement('div');
    metaEl.className = 'ik-tm-row__meta';
    metaEl.textContent = 'Davet: ' + fmtRelativeTime(inv.invited_at);

    info.appendChild(nameEl);
    info.appendChild(emailEl);
    info.appendChild(metaEl);

    var role = fmtRoleBadge(inv.role);
    var badge = document.createElement('span');
    badge.className = 'ik-tm-role-badge ik-tm-role-badge--' + role.kind;
    badge.textContent = role.label;

    var actions = document.createElement('div');
    actions.className = 'ik-tm-row__actions';

    var pendingTag = document.createElement('span');
    pendingTag.className = 'ik-tm-pending';
    pendingTag.textContent = 'Bekliyor';
    actions.appendChild(pendingTag);

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'ik-tm-row__rm';
    cancelBtn.textContent = 'İptal';
    cancelBtn.dataset.action = 'cancel-invite';
    cancelBtn.dataset.id = inv.id;
    actions.appendChild(cancelBtn);

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(actions);
    return row;
  }

  function renderAll() {
    /* Members */
    if (els.membersList) {
      els.membersList.textContent = '';
      if (!state.members.length) {
        var empty = document.createElement('div');
        empty.className = 'ik-tm-empty';
        empty.textContent = 'Henüz aktif üye yok.';
        els.membersList.appendChild(empty);
      } else {
        state.members.forEach(function (m) {
          els.membersList.appendChild(renderMember(m));
        });
      }
    }
    if (els.membersCount) {
      els.membersCount.textContent = String(state.members.length);
    }

    /* Invites */
    if (els.invitesList) {
      els.invitesList.textContent = '';
      if (!state.invites.length) {
        var emptyI = document.createElement('div');
        emptyI.className = 'ik-tm-empty';
        emptyI.textContent = 'Henüz bekleyen davet yok.';
        els.invitesList.appendChild(emptyI);
      } else {
        state.invites.forEach(function (i) {
          els.invitesList.appendChild(renderInvite(i));
        });
      }
    }
    if (els.invitesCount) {
      els.invitesCount.textContent = String(state.invites.length);
    }
  }

  function load() {
    return IK_DATA.getTeamMembers().then(function (data) {
      state.members = (data && data.members) || [];
      state.invites = (data && data.invites) || [];
      renderAll();
    }).catch(function (e) {
      console.warn('[ik-team] load fail:', e && e.message);
      if (els.loading) els.loading.textContent = 'Yüklenemedi.';
    });
  }

  /* ── Modal ── */
  function openModal() {
    if (!els.modal) return;
    els.modal.setAttribute('aria-hidden', 'false');
    els.modal.classList.add('is-open');
    document.body.classList.add('ht-scroll-lock');
    setMsg('', '');
    if (els.inputEmail) {
      els.inputEmail.value = '';
      setTimeout(function () { els.inputEmail.focus(); }, 80);
    }
    if (els.inputName) els.inputName.value = '';
    /* Reset to recruiter default */
    var rec = document.querySelector('input[name="ik-tm-role"][value="recruiter"]');
    if (rec) rec.checked = true;
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.setAttribute('aria-hidden', 'true');
    els.modal.classList.remove('is-open');
    document.body.classList.remove('ht-scroll-lock');
  }

  function getSelectedRole() {
    var checked = document.querySelector('input[name="ik-tm-role"]:checked');
    return checked ? checked.value : 'recruiter';
  }

  function send() {
    var email = (els.inputEmail.value || '').trim();
    var name = (els.inputName.value || '').trim();
    var role = getSelectedRole();

    if (!email) {
      setMsg('E-posta zorunlu.', 'err');
      els.inputEmail.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMsg('Geçerli bir e-posta gir.', 'err');
      els.inputEmail.focus();
      return;
    }

    els.sendBtn.disabled = true;
    var orig = els.sendBtn.textContent;
    els.sendBtn.textContent = 'Gönderiliyor…';

    IK_DATA.inviteTeamMember(email, role, name).then(function () {
      showToast('Davet kaydedildi (demo)', 'ok');
      closeModal();
      return load();
    }).catch(function (e) {
      var m = (e && e.message) || 'Davet gönderilemedi.';
      if (m === 'duplicate') m = 'Bu e-posta zaten davet listesinde.';
      if (m === 'email invalid') m = 'Geçerli bir e-posta gir.';
      if (m === 'role invalid') m = 'Rol seçimi geçersiz.';
      setMsg(m, 'err');
    }).then(function () {
      els.sendBtn.disabled = false;
      els.sendBtn.textContent = orig;
    });
  }

  function cancelInvite(id) {
    IK_DATA.cancelInvite(id).then(function () {
      showToast('Davet iptal edildi', 'ok');
      return load();
    }).catch(function (e) {
      showToast('İptal edilemedi: ' + ((e && e.message) || ''), 'err');
    });
  }

  function removeMember(id) {
    IK_DATA.removeMember(id).then(function () {
      showToast('Üye çıkarıldı (demo)', 'ok');
      return load();
    });
  }

  function bindEvents() {
    if (els.inviteBtn) els.inviteBtn.addEventListener('click', openModal);
    if (els.modalClose) els.modalClose.addEventListener('click', closeModal);
    if (els.modalBackdrop) els.modalBackdrop.addEventListener('click', closeModal);
    if (els.cancelBtn) els.cancelBtn.addEventListener('click', closeModal);
    if (els.sendBtn) els.sendBtn.addEventListener('click', send);
    if (els.form) {
      els.form.addEventListener('submit', function (e) {
        e.preventDefault();
        send();
      });
    }

    /* Member/Invite list delegation */
    if (els.membersList) {
      els.membersList.addEventListener('click', function (e) {
        var btn = e.target;
        if (!btn || btn.dataset == null) return;
        if (btn.dataset.action === 'remove' && btn.dataset.id) {
          removeMember(btn.dataset.id);
        }
      });
    }
    if (els.invitesList) {
      els.invitesList.addEventListener('click', function (e) {
        var btn = e.target;
        if (!btn || btn.dataset == null) return;
        if (btn.dataset.action === 'cancel-invite' && btn.dataset.id) {
          cancelInvite(btn.dataset.id);
        }
      });
    }

    /* ESC kapat */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.modal && els.modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  function init() {
    cacheEls();
    if (!els.membersList) return;
    bindEvents();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
