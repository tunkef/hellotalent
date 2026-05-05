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
    settings: {
      theme: 'system',
      notify_email_messages: true,
      notify_email_pipeline: true,
      notify_email_newsletter: false
    },
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

      /* Notify — A10 LIVE: 3 granular toggle */
      notifyMsg: $('#ik-set-notify-msg'),
      notifyPipeline: $('#ik-set-notify-pipeline'),
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
    var hrFullName = [hr.ad, hr.soyad].filter(Boolean).join(' ').trim();
    if (els.fullname) els.fullname.value = hrFullName || (user.email ? user.email.split('@')[0] : '');
    if (els.email) {
      els.email.value = user.email || '';
      if (!user.email) els.email.placeholder = 'Email yüklenemedi';
    }
    if (els.phone) els.phone.value = hr.telefon || '';
    if (els.role) els.role.value = ''; /* hr_profiles'ta unvan/title kolonu yok — placeholder göster */
  }

  function hydrateSettings(s) {
    if (!s) return;
    state.settings = Object.assign({}, state.settings, s);
    if (els.notifyMsg)      els.notifyMsg.checked      = !!state.settings.notify_email_messages;
    if (els.notifyPipeline) els.notifyPipeline.checked = !!state.settings.notify_email_pipeline;
    if (els.notifyWeekly)   els.notifyWeekly.checked   = !!state.settings.notify_email_newsletter;
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

  function daysUntil(isoDate) {
    if (!isoDate) return 0;
    try {
      var diff = new Date(isoDate).getTime() - Date.now();
      return Math.max(0, Math.ceil(diff / 86400000));
    } catch (e) { return 0; }
  }

  function hydrateAccount(a) {
    if (!a) return;
    state.account = Object.assign({}, state.account, a);

    if (!els.accountBanner) return;
    els.accountBanner.textContent = '';
    els.accountBanner.className = 'ik-set-banner';
    els.accountBanner.removeAttribute('role');
    els.accountBanner.removeAttribute('aria-live');

    var status = state.account.status;
    var isSoftDeleted = !!(state.account.soft_deleted_at);

    /* soft_deleted (pii_redacted veya henüz değil) */
    if (isSoftDeleted) {
      els.accountBanner.hidden = false;
      els.accountBanner.classList.add('ik-set-banner--deletion');
      els.accountBanner.setAttribute('role', 'alert');
      if (state.account.pii_redacted) {
        els.accountBanner.textContent = 'Hesabın kalıcı olarak silindi. Yeni hesap açmak için üye ol sayfasını ziyaret et.';
        if (els.freezeBtn) { els.freezeBtn.textContent = 'Hesabı geri al'; els.freezeBtn.disabled = true; }
        if (els.deleteBtn) els.deleteBtn.disabled = true;
      } else {
        els.accountBanner.textContent = 'Hesabın silindi — veriler henüz temizlenmedi. Geri almak için aşağıya tıkla.';
        if (els.freezeBtn) { els.freezeBtn.textContent = 'Hesabı geri al'; els.freezeBtn.disabled = false; }
        if (els.deleteBtn) els.deleteBtn.disabled = true;
      }
      return;
    }

    if (status === 'frozen') {
      els.accountBanner.hidden = false;
      els.accountBanner.classList.add('ik-set-banner--frozen');
      els.accountBanner.setAttribute('aria-live', 'polite');
      els.accountBanner.textContent = 'Hesabın dondurulmuş — havuzda görünmüyorsun, mesajlar duraklatıldı.';
      if (els.freezeBtn) { els.freezeBtn.textContent = 'Hesabı geri al'; els.freezeBtn.disabled = false; }
      if (els.deleteBtn) els.deleteBtn.disabled = false;

    } else if (status === 'pending_deletion') {
      els.accountBanner.hidden = false;
      els.accountBanner.classList.add('ik-set-banner--deletion');
      els.accountBanner.setAttribute('role', 'alert');
      var days = daysUntil(state.account.deletion_scheduled_at);
      var dateStr = fmtDate(state.account.deletion_scheduled_at);
      els.accountBanner.textContent = 'Hesabın ' + days + ' gün sonra silinecek (' + dateStr + ').';
      if (els.freezeBtn) { els.freezeBtn.textContent = 'Vazgeç'; els.freezeBtn.disabled = false; }
      if (els.deleteBtn) els.deleteBtn.disabled = true;

    } else {
      /* active */
      els.accountBanner.hidden = true;
      if (els.freezeBtn) { els.freezeBtn.textContent = 'Hesabı dondur'; els.freezeBtn.disabled = false; }
      if (els.deleteBtn) els.deleteBtn.disabled = false;
    }
  }

  /* ── Notify toggles ── */
  /* A10 LIVE (5 May 2026): 3 granular toggle, RPC update_hr_notify_settings.
     R1 fix: inflight lock — hızlı ardışık toggle race'ini disabled ile engelle.
     R2 fix: .catch + .finally — reject path silent değil, kullanıcıya toast. */
  function bindNotifyToggle(el, key) {
    if (!el) return;
    el.addEventListener('change', function () {
      var newVal = !!el.checked;
      var prevVal = state.settings[key];
      state.settings[key] = newVal; /* optimistic */
      el.disabled = true;            /* inflight lock */
      var patch = {};
      patch[key] = newVal;
      IK_DATA.updateSettings(patch)
        .then(function (res) {
          if (!res || res.ok === false) {
            state.settings[key] = prevVal;
            el.checked = prevVal;
            showToast('Bildirim tercihi kaydedilemedi', 'err');
          }
        })
        .catch(function () {
          state.settings[key] = prevVal;
          el.checked = prevVal;
          showToast('Bildirim tercihi kaydedilemedi', 'err');
        })
        .finally(function () { el.disabled = false; });
    });
  }

  function bindNotifyToggles() {
    bindNotifyToggle(els.notifyMsg,      'notify_email_messages');
    bindNotifyToggle(els.notifyPipeline, 'notify_email_pipeline');
    bindNotifyToggle(els.notifyWeekly,   'notify_email_newsletter');
  }

  /* ── Theme radios ── */
  function bindThemeRadios() {
    els.themeRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        /* Tema localStorage tabanlı — backend persist gerek yok (theme column yok) */
        applyTheme(r.value);
        state.settings.theme = r.value;
        showToast('Tema güncellendi', 'ok');
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

  function refreshAccount() {
    return IK_DATA.getAccountStatus().then(function (a) { hydrateAccount(a); });
  }

  function execPending() {
    if (!pendingAction) { closeConfirm(); return; }
    var act = pendingAction;
    closeConfirm();

    if (act === 'freeze') {
      IK_DATA.freezeAccount()
        .then(function () {
          showToast('Hesap donduruldu', 'ok');
          return refreshAccount();
        })
        .catch(function (e) {
          setMsg(els.accountMsg, 'Hata: ' + (e && e.message), 'err');
        });

    } else if (act === 'unfreeze') {
      IK_DATA.unfreezeAccount()
        .then(function () {
          showToast('Hesap aktifleştirildi', 'ok');
          return refreshAccount();
        })
        .catch(function (e) {
          setMsg(els.accountMsg, 'Hata: ' + (e && e.message), 'err');
        });

    } else if (act === 'delete') {
      IK_DATA.deleteAccount()
        .then(function (res) {
          showToast('Silme süreci başlatıldı — 30 gün içinde vazgeçebilirsin', 'ok');
          /* RPC data içindeki güncel state'i doğrudan besle */
          hydrateAccount(res || {});
          return refreshAccount();
        })
        .catch(function (e) {
          var msg = e && e.message;
          if (msg && msg.indexOf('lone_admin') !== -1) {
            setMsg(els.accountMsg, 'Şirketinde başka admin yok. Önce bir admin daha ata.', 'err');
          } else {
            setMsg(els.accountMsg, 'Hata: ' + msg, 'err');
          }
        });

    } else if (act === 'cancel-delete') {
      IK_DATA.cancelDeletion()
        .then(function () {
          showToast('Hesap silme iptal edildi', 'ok');
          return refreshAccount();
        })
        .catch(function (e) {
          var msg = e && e.message;
          if (msg && (msg.indexOf('expired') !== -1 || msg.indexOf('gecti') !== -1)) {
            setMsg(els.accountMsg, 'Silinme süresi doldu. Geri almak için support@hellotalent.ai', 'err');
          } else {
            setMsg(els.accountMsg, 'Hata: ' + msg, 'err');
          }
        });

    } else if (act === 'reactivate') {
      IK_DATA.reactivateAfterPurge()
        .then(function () {
          showToast('Hesap geri alındı', 'ok');
          return refreshAccount();
        })
        .catch(function (e) {
          setMsg(els.accountMsg, 'Hata: ' + (e && e.message), 'err');
        });
    }
  }

  /* ── Danger zone ── */
  function bindDanger() {
    if (els.freezeBtn) {
      els.freezeBtn.addEventListener('click', function () {
        var status = state.account.status;
        var isSoftDeleted = !!(state.account.soft_deleted_at);

        if (isSoftDeleted && !state.account.pii_redacted) {
          openConfirm(
            'Hesabı geri al',
            'Hesabın arşive alınmış. Geri almak istiyor musun? Tüm veriler korunacak.',
            'reactivate',
            'Geri al'
          );
        } else if (status === 'frozen') {
          openConfirm(
            'Hesabı geri al',
            'Hesabını aktif etmek istiyor musun? Pano erişimi tekrar açılır.',
            'unfreeze',
            'Geri al'
          );
        } else if (status === 'pending_deletion') {
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
          '30 gün içinde vazgeçebilirsin. Bu süre sonunda hesap arşive alınır ve tüm verilerin kalıcı olarak silinir (KVKK md.11).',
          'delete',
          'Hesabımı sil'
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
    /* R4 fix (code-reviewer 5 May): toggle'lar zaten anlık kaydediliyor.
       Hesap form alanları (fullname, phone, role) MVP 2'de bağlanacak —
       şu an persist yok, kullanıcıya net bilgi ver. */
    showToast('Bildirim ve tema tercihlerin anlık kaydediliyor', 'ok');
    setMsg(els.formMsg, 'Bildirim ve tema tercihlerin anlık kaydediliyor. Hesap alanları MVP 2\'de bağlanacak.', 'ok');
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

    /* Hydrate hemen — sonra IK_SHELL ctx hazır olunca tekrar */
    hydrateUserInfo();
    if (!(window.IK_SHELL && window.IK_SHELL.ctx)) {
      document.addEventListener('ik-shell:ready', hydrateUserInfo, { once: true });
    }

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
