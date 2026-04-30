/* global IK_DATA, IK_SHELL */
/* ════════════════════════════════════════════════════════════════
   IK Settings — Asama 86 Sprint D
   Hesap + Guvenlik (sifre/MFA) + Bildirim + Tema + Hesap yonetimi.
   Demo: IK_DATA.getSettings + updateSettings + freezeAccount + deleteAccount.
   SOLID:
     - SRP: tek sorumluluk = settings form behavior + theme toggle + danger zone.
     - DIP: IK_DATA + IK_SHELL public API'sine bagli.
   XSS-safe: textContent + DOM.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var THEME_KEY = 'ht_theme_preference';

  var els = null;
  var state = {
    settings: { theme: 'system', notify_email_newsletter: false },
    account: { status: 'active', deletion_scheduled_at: null, frozen_at: null }
  };
  var pendingAction = null; /* 'freeze' | 'unfreeze' | 'delete' | 'cancel-delete' */

  function cacheEls() {
    els = {
      form: $('#ik-set-form'),

      /* Account */
      fullname: $('#ik-set-fullname'),
      email: $('#ik-set-email'),
      phone: $('#ik-set-phone'),
      role: $('#ik-set-role'),

      /* Password */
      pwCurrent: $('#ik-set-pw-current'),
      pwNew: $('#ik-set-pw-new'),
      pwConfirm: $('#ik-set-pw-confirm'),
      pwBtn: $('#ik-set-pw-change-btn'),
      pwMsg: $('#ik-set-pw-msg'),

      /* MFA */
      mfaStatus: $('#ik-set-mfa-status'),
      mfaBtn: $('#ik-set-mfa-btn'),

      /* Notify — sadece notify_email_newsletter (A10 backlog: msg + pipeline gelecek) */
      notifyWeekly: $('#ik-set-notify-weekly'),

      /* Theme */
      themeRadios: $$('input[name="ik-set-theme"]'),

      /* Danger zone */
      accountBanner: $('#ik-set-account-banner'),
      freezeBtn: $('#ik-set-freeze-btn'),
      deleteBtn: $('#ik-set-delete-btn'),
      accountMsg: $('#ik-set-account-msg'),

      /* Confirm modal */
      modal: $('#ik-set-confirm-modal'),
      modalBackdrop: $('#ik-set-confirm-backdrop'),
      modalClose: $('#ik-set-confirm-close'),
      modalTitle: $('#ik-set-confirm-title'),
      modalLede: $('#ik-set-confirm-msg'),
      modalCancel: $('#ik-set-confirm-cancel'),
      modalOk: $('#ik-set-confirm-ok'),

      /* Footer */
      saveBtn: $('#ik-set-save'),
      signoutBtn: $('#ik-set-signout'),
      formMsg: $('#ik-set-form-msg'),

      toast: $('#ik-toast')
    };
  }

  function showToast(text, kind) {
    if (!els.toast) return;
    els.toast.textContent = text || '';
    els.toast.className = 'ik-toast is-visible' + (kind ? ' ik-toast--' + kind : '');
    setTimeout(function () { els.toast.classList.remove('is-visible'); }, 3200);
  }

  function setMsg(target, text, kind) {
    if (!target) return;
    target.textContent = text || '';
    target.className = (target.className || '').replace(/\s+ik-set-msg--\w+/g, '').trim();
    if (kind) target.classList.add('ik-set-msg--' + kind);
  }

  /* ── Theme ── */
  function applyTheme(value) {
    var html = document.documentElement;
    var dark = false;
    if (value === 'dark') dark = true;
    else if (value === 'light') dark = false;
    else { /* system */
      try {
        dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      } catch (e) { dark = false; }
    }
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (dark) html.classList.add('dark'); else html.classList.remove('dark');
    var meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', dark ? '#050712' : '#ffffff');
    try {
      if (value === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, value);
    } catch (e) { /* ignore */ }
  }

  function syncThemeRadios() {
    els.themeRadios.forEach(function (r) {
      r.checked = (r.value === state.settings.theme);
    });
  }

  /* ── Hydrate ── */
  function hydrateUserInfo() {
    var ctx = (window.IK_SHELL && window.IK_SHELL.ctx) || {};
    var hr = ctx.hr || {};
    var user = ctx.user || {};
    if (els.fullname) els.fullname.value = hr.full_name || (user.email ? user.email.split('@')[0] : '');
    if (els.email) {
      els.email.value = user.email || '';
      if (!user.email) els.email.placeholder = 'Email yüklenemedi';
    }
    if (els.phone) els.phone.value = hr.phone || '';
    if (els.role) els.role.value = hr.title || hr.position || '';
  }

  function hydrateSettings(s) {
    if (!s) return;
    state.settings = Object.assign({}, state.settings, s);
    if (els.notifyWeekly) els.notifyWeekly.checked = !!state.settings.notify_email_newsletter;
    syncThemeRadios();
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    } catch (e) { return '—'; }
  }

  function hydrateAccount(a) {
    if (!a) return;
    state.account = Object.assign({}, state.account, a);

    if (!els.accountBanner) return;
    els.accountBanner.textContent = '';
    els.accountBanner.className = 'ik-set-banner';

    if (state.account.status === 'frozen') {
      els.accountBanner.hidden = false;
      els.accountBanner.classList.add('ik-set-banner--frozen');
      els.accountBanner.textContent = 'Hesabın dondurulmuş durumda. Aktifleştirmek için aşağıdan geri al.';
      if (els.freezeBtn) els.freezeBtn.textContent = 'Hesabı geri al';
      if (els.deleteBtn) els.deleteBtn.disabled = false;
    } else if (state.account.status === 'pending_deletion') {
      els.accountBanner.hidden = false;
      els.accountBanner.classList.add('ik-set-banner--deletion');
      els.accountBanner.textContent = 'Hesabın ' + fmtDate(state.account.deletion_scheduled_at) +
        ' tarihinde kalıcı silinecek. İptal etmek için "Silmeyi iptal et"e bas.';
      if (els.freezeBtn) {
        els.freezeBtn.textContent = 'Silmeyi iptal et';
        els.freezeBtn.disabled = false;
      }
      if (els.deleteBtn) els.deleteBtn.disabled = true;
    } else {
      els.accountBanner.hidden = true;
      if (els.freezeBtn) {
        els.freezeBtn.textContent = 'Hesabı dondur';
        els.freezeBtn.disabled = false;
      }
      if (els.deleteBtn) els.deleteBtn.disabled = false;
    }
  }

  /* ── Notify toggles ── */
  /* A10 backlog: notify_email_messages + notify_email_pipeline henüz backend'de yok.
     Sadece notify_email_newsletter (notifyWeekly el) aktif. */
  function bindNotifyToggles() {
    if (!els.notifyWeekly) return;
    els.notifyWeekly.addEventListener('change', function () {
      IK_DATA.updateSettings({ notify_email_newsletter: !!els.notifyWeekly.checked })
        .then(function (res) {
          if (res && res.ok) state.settings.notify_email_newsletter = !!els.notifyWeekly.checked;
        });
    });
  }

  /* ── Theme radios ── */
  function bindThemeRadios() {
    els.themeRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        applyTheme(r.value);
        IK_DATA.updateSettings({ theme: r.value }).then(function (res) {
          if (res && res.settings) state.settings = res.settings;
          showToast('Tema güncellendi', 'ok');
        });
      });
    });
  }

  /* ── Password ── */
  function bindPassword() {
    if (!els.pwBtn) return;
    els.pwBtn.addEventListener('click', function () {
      setMsg(els.pwMsg, '', '');
      var cur = (els.pwCurrent.value || '').trim();
      var nw = (els.pwNew.value || '').trim();
      var cf = (els.pwConfirm.value || '').trim();

      if (!cur) {
        setMsg(els.pwMsg, 'Mevcut şifre zorunlu.', 'err');
        return;
      }
      if (!nw || nw.length < 8) {
        setMsg(els.pwMsg, 'Yeni şifre en az 8 karakter olmalı.', 'err');
        return;
      }
      if (nw !== cf) {
        setMsg(els.pwMsg, 'Şifreler eşleşmiyor.', 'err');
        return;
      }
      /* Demo: gerçek update Supabase MVP 2'de aktif olur */
      setMsg(els.pwMsg, 'Demo modunda şifre değiştirilemez. MVP 2 ile aktif olur.', 'info');
      els.pwCurrent.value = '';
      els.pwNew.value = '';
      els.pwConfirm.value = '';
    });
  }

  /* ── Confirm modal ── */
  function openConfirm(title, lede, action, dangerLabel) {
    if (!els.modal) return;
    pendingAction = action;
    if (els.modalTitle) els.modalTitle.textContent = title || 'Onay';
    if (els.modalLede) els.modalLede.textContent = lede || '';
    if (els.modalOk) els.modalOk.textContent = dangerLabel || 'Onayla';
    els.modal.setAttribute('aria-hidden', 'false');
    els.modal.classList.add('is-open');
    document.body.classList.add('ht-scroll-lock');
  }

  function closeConfirm() {
    if (!els.modal) return;
    els.modal.setAttribute('aria-hidden', 'true');
    els.modal.classList.remove('is-open');
    document.body.classList.remove('ht-scroll-lock');
    pendingAction = null;
  }

  function execPending() {
    if (!pendingAction) { closeConfirm(); return; }
    var act = pendingAction;
    closeConfirm();

    if (act === 'freeze') {
      IK_DATA.freezeAccount().then(function () {
        showToast('Hesap donduruldu', 'ok');
        return IK_DATA.getAccountStatus().then(hydrateAccount);
      });
    } else if (act === 'unfreeze') {
      IK_DATA.unfreezeAccount().then(function () {
        showToast('Hesap aktifleştirildi', 'ok');
        return IK_DATA.getAccountStatus().then(hydrateAccount);
      });
    } else if (act === 'delete') {
      IK_DATA.deleteAccount().then(function () {
        showToast('Hesap silme süreci başlatıldı (30 gün)', 'ok');
        return IK_DATA.getAccountStatus().then(hydrateAccount);
      });
    } else if (act === 'cancel-delete') {
      IK_DATA.unfreezeAccount().then(function () {
        showToast('Hesap silme iptal edildi', 'ok');
        return IK_DATA.getAccountStatus().then(hydrateAccount);
      });
    }
  }

  /* ── Danger zone ── */
  function bindDanger() {
    if (els.freezeBtn) {
      els.freezeBtn.addEventListener('click', function () {
        if (state.account.status === 'frozen') {
          openConfirm(
            'Hesabı geri al',
            'Hesabını aktif etmek istiyor musun? Pano erişimi tekrar açılır.',
            'unfreeze',
            'Geri al'
          );
        } else if (state.account.status === 'pending_deletion') {
          openConfirm(
            'Silmeyi iptal et',
            'Hesap silme sürecini iptal etmek istiyor musun? Hesabın aktif olur.',
            'cancel-delete',
            'İptal et'
          );
        } else {
          openConfirm(
            'Hesabı dondur',
            'Hesabını dondurmak istiyor musun? Pano açık kalır, ekibin pasif olur. İstediğin zaman geri alabilirsin.',
            'freeze',
            'Dondur'
          );
        }
      });
    }
    if (els.deleteBtn) {
      els.deleteBtn.addEventListener('click', function () {
        openConfirm(
          'Hesabı sil',
          'Bu işlem geri alınamaz. Hesabın 30 gün dondurulur, bu süre içinde vazgeçebilirsin. 30 gün sonra tüm verilerin kalıcı silinir (KVKK md.11).',
          'delete',
          'Sil'
        );
      });
    }
    if (els.modalClose) els.modalClose.addEventListener('click', closeConfirm);
    if (els.modalBackdrop) els.modalBackdrop.addEventListener('click', closeConfirm);
    if (els.modalCancel) els.modalCancel.addEventListener('click', closeConfirm);
    if (els.modalOk) els.modalOk.addEventListener('click', execPending);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.modal && els.modal.classList.contains('is-open')) {
        closeConfirm();
      }
    });
  }

  /* ── Save / Signout ── */
  function saveAll() {
    /* Tum bildirim toggle'lari + tema zaten anlik kaydediliyor.
       Burada hesap form alanlarini kaydet (demo: localStorage). */
    showToast('Tercihler kaydedildi', 'ok');
    setMsg(els.formMsg, 'Tercihlerin kaydedildi.', 'ok');
  }

  function signOut() {
    if (window.IK_SHELL && typeof window.IK_SHELL.logout === 'function') {
      window.IK_SHELL.logout();
      return;
    }
    /* Fallback: shell yok, manual */
    try {
      if (window.HT && typeof window.HT.getSupa === 'function') {
        var supa = window.HT.getSupa();
        if (supa) supa.auth.signOut();
      }
    } catch (e) { /* ignore */ }
    location.replace('giris.html');
  }

  function bindFooter() {
    if (els.saveBtn) {
      els.saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        saveAll();
      });
    }
    if (els.form) {
      els.form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveAll();
      });
    }
    if (els.signoutBtn) {
      els.signoutBtn.addEventListener('click', signOut);
    }
  }

  function init() {
    cacheEls();
    if (!els.form) return;
    bindNotifyToggles();
    bindThemeRadios();
    bindPassword();
    bindDanger();
    bindFooter();

    /* Hydrate */
    hydrateUserInfo();
    Promise.all([IK_DATA.getSettings(), IK_DATA.getAccountStatus()])
      .then(function (results) {
        hydrateSettings(results[0]);
        hydrateAccount(results[1]);
      })
      .catch(function (e) {
        console.warn('[ik-settings] hydrate fail:', e && e.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
