/* global supabase, _loadedDBData, currentUser, refreshAfterSettingsSave, refreshVisibilitySummary, setThemePreference, syncActivelyLooking, syncBeniOner, syncHideFromEmployer, val, _htAlert, _htConfirm */
'use strict';
// K049 Faz 3 — strict mode (10 reassign hepsi var-declared, MFA flow state vars dahil).
/* ═══════════════════════════════════════════════════════════════
   PROFIL-SETTINGS — Ayarlar panel logic
   Notification, contact, visibility, blocked companies, account mgmt
   ═══════════════════════════════════════════════════════════════ */

// ── DARK-MODE AWARE MODAL HELPERS ──
// Replaces native alert()/confirm() with CSS-token-aware modals
(function(){
  function _ensureModal(id, inner) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'ht-modal__overlay';
      el.innerHTML = inner;
      document.body.appendChild(el);
    }
    return el;
  }

  window._htAlert = function(msg, cb) {
    var el = _ensureModal('ht-modal-alert',
      '<div class="ht-modal" style="max-width:360px;">' +
      '<div class="ht-modal__title" id="ht-modal-alert-msg" style="font-size:var(--text-lg);margin-bottom:20px;line-height:1.5;white-space:pre-line;"></div>' +
      '<button class="ht-btn ht-btn--primary" id="ht-modal-alert-ok" style="width:100%;padding:11px 0;">Tamam</button>' +
      '</div>');
    document.getElementById('ht-modal-alert-msg').textContent = msg;
    el.classList.add('show');
    document.getElementById('ht-modal-alert-ok').onclick = function() {
      el.classList.remove('show');
      if (typeof cb === 'function') cb();
    };
  };

  window._htConfirm = function(msg, cbYes, cbNo) {
    var el = _ensureModal('ht-modal-confirm',
      '<div class="ht-modal" style="max-width:400px;">' +
      '<div class="modal-confirm-body">' +
      '<div class="modal-confirm-title" id="ht-modal-confirm-msg" style="white-space:pre-line;"></div>' +
      '<div class="modal-confirm-actions">' +
      '<button class="ht-btn ht-btn--secondary" id="ht-modal-confirm-no">Vazgeç</button>' +
      '<button class="ht-btn ht-btn--primary" id="ht-modal-confirm-yes">Evet, Devam Et</button>' +
      '</div></div></div>');
    document.getElementById('ht-modal-confirm-msg').textContent = msg;
    el.classList.add('show');
    document.getElementById('ht-modal-confirm-yes').onclick = function() {
      el.classList.remove('show');
      if (typeof cbYes === 'function') cbYes();
    };
    document.getElementById('ht-modal-confirm-no').onclick = function() {
      el.classList.remove('show');
      if (typeof cbNo === 'function') cbNo();
    };
  };
})();

// ── DELETION WARNING BANNER ──
(function(){
  var checkInterval = setInterval(function(){
    if (!_loadedDBData || !_loadedDBData.profile) return;
    clearInterval(checkInterval);

    var profile = _loadedDBData.profile;
    if (profile.account_status !== 'pending_deletion') return;

    var banner = document.getElementById('deletion-warning-banner');
    if (!banner) return;

    var requestedAt = profile.deletion_requested_at ? new Date(profile.deletion_requested_at) : new Date();
    var deadlineMs = requestedAt.getTime() + (30 * 24 * 60 * 60 * 1000);
    var daysLeft = Math.max(0, Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000)));

    var daysEl = document.getElementById('deletion-days-left');
    if (daysEl) daysEl.textContent = daysLeft;
    banner.style.display = 'block';

    var cancelBtn = document.getElementById('btn-cancel-deletion-banner');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function(){
        _htConfirm('Hesap silme işlemini iptal etmek istiyor musunuz? Hesabınız tekrar aktif olacak.', async function(){
          try {
            var res = await supabase
              .from('candidates')
              .update({ account_status: 'active' })
              .eq('user_id', currentUser.id);
            if (res.error) throw res.error;
            profile.account_status = 'active';
            banner.style.display = 'none';
            _htAlert('Hesabınız tekrar aktif edildi!');
            if (window._htShowAccountBanner) window._htShowAccountBanner('active');
          } catch (e) {
            _htAlert('Hata: ' + (e.message || ''));
          }
        });
      });
    }
  }, 500);
})();

document.addEventListener('DOMContentLoaded', function() {

  // Password change
  var btnChangePw = document.getElementById('btn-change-pw');
  if (btnChangePw) btnChangePw.addEventListener('click', async function() {
    var newPw = val('settings-new-pw');
    var confirmPw = val('settings-confirm-pw');
    var pwMsg = document.getElementById('pw-msg');
    if (!newPw || newPw.length < 8) {
      if (pwMsg) { pwMsg.textContent = 'Şifre en az 8 karakter olmalı.'; pwMsg.style.color = 'var(--red)'; pwMsg.style.display = 'block'; }
      return;
    }
    if (newPw !== confirmPw) {
      if (pwMsg) { pwMsg.textContent = 'Şifreler eşleşmedi.'; pwMsg.style.color = 'var(--red)'; pwMsg.style.display = 'block'; }
      return;
    }
    btnChangePw.disabled = true;
    var res = await supabase.auth.updateUser({ password: newPw });
    if (res.error) {
      if (pwMsg) { pwMsg.textContent = res.error.message; pwMsg.style.color = 'var(--red)'; pwMsg.style.display = 'block'; }
    } else {
      if (pwMsg) { pwMsg.textContent = 'Şifre başarıyla güncellendi!'; pwMsg.style.color = 'var(--green)'; pwMsg.style.display = 'block'; }
      document.getElementById('settings-new-pw').value = '';
      document.getElementById('settings-confirm-pw').value = '';
    }
    btnChangePw.disabled = false;
  });

  // Theme toggle (sidebar + Ayarlar Görünüm) — sun/moon buttons
  window.syncThemeToggleButtons = function() {
    var theme = document.documentElement.getAttribute('data-theme') || 'light';
    document.querySelectorAll('.theme-toggle-btn').forEach(function(btn) {
      if (theme === 'dark') btn.classList.add('dark');
      else btn.classList.remove('dark');
    });
  };
  document.querySelectorAll('.theme-toggle-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      setThemePreference(next);
      window.syncThemeToggleButtons();
    });
  });

  // Gizlilik: visibility toggle (Settings) — delegates to shared syncBeniOner
  var settingsVisibilityToggle = document.getElementById('settings-visibility-active');
  if (settingsVisibilityToggle) settingsVisibilityToggle.addEventListener('change', function() {
    if (typeof syncBeniOner === 'function') syncBeniOner(this.checked, 'ayarlar');
  });

  // Gizlilik: hide from current employer (Settings) — delegates to shared syncHideFromEmployer
  var settingsHideFromEmployer = document.getElementById('settings-hide-from-current-employer');
  if (settingsHideFromEmployer) settingsHideFromEmployer.addEventListener('change', function() {
    if (typeof syncHideFromEmployer === 'function') syncHideFromEmployer(this.checked, 'ayarlar');
  });
  // NOTE: merkez-hide-from-current-employer listener is in profil-ui.js shared sync IIFE

  // Hesap Bilgileri save (Settings)
  var btnSettingsAccountSave = document.getElementById('btn-settings-account-save');
  if (btnSettingsAccountSave) btnSettingsAccountSave.addEventListener('click', async function() {
    var fullName = (document.getElementById('settings-adsoyad') && document.getElementById('settings-adsoyad').value) || '';
    var phone = (document.getElementById('settings-telefon') && document.getElementById('settings-telefon').value) || '';
    fullName = fullName.trim();
    phone = phone.replace(/\s/g, '');
    var msgEl = document.getElementById('settings-account-msg');
    if (phone && !/^(\+90|0)?5[0-9]{9}$/.test(phone)) {
      if (msgEl) { msgEl.textContent = 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
      return;
    }
    if (!fullName) {
      if (msgEl) { msgEl.textContent = 'Ad Soyad zorunludur.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
      return;
    }
    if (!currentUser) { if (msgEl) { msgEl.textContent = 'Oturum bulunamadı.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; } return; }
    btnSettingsAccountSave.disabled = true;
    var res = await supabase.from('candidates').update({
      full_name: fullName,
      telefon: phone || null
    }).eq('user_id', currentUser.id);
    if (res.error) {
      if (msgEl) { msgEl.textContent = res.error.message || 'Kayıt güncellenemedi.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
    } else {
      if (msgEl) { msgEl.textContent = 'Hesap bilgileri güncellendi.'; msgEl.style.color = 'var(--green)'; msgEl.style.display = 'block'; }
      refreshAfterSettingsSave(fullName, phone);
    }
    btnSettingsAccountSave.disabled = false;
  });

  // Email change: show/hide section
  var btnShowEmailChange = document.getElementById('btn-show-email-change');
  if (btnShowEmailChange) btnShowEmailChange.addEventListener('click', function() {
    var section = document.getElementById('email-change-section');
    if (section) section.style.display = section.style.display === 'none' ? '' : 'none';
  });

  // Email change: submit
  var btnChangeEmail = document.getElementById('btn-change-email');
  if (btnChangeEmail) btnChangeEmail.addEventListener('click', async function() {
    var origText = btnChangeEmail.textContent; // K049 audit fix #2: capture+restore
    var newEmail = (document.getElementById('settings-new-email').value || '').trim();
    var msgEl = document.getElementById('email-change-msg');

    if (!newEmail || !newEmail.includes('@')) {
      if (msgEl) { msgEl.textContent = 'Geçerli bir e-posta adresi girin.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
      return;
    }

    if (newEmail === currentUser.email) {
      if (msgEl) { msgEl.textContent = 'Bu zaten mevcut e-posta adresiniz.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
      return;
    }

    btnChangeEmail.disabled = true;
    btnChangeEmail.textContent = 'Gönderiliyor...';

    var res = await supabase.auth.updateUser({ email: newEmail });

    if (res.error) {
      if (msgEl) {
        msgEl.textContent = res.error.message || 'E-posta güncellenemedi.';
        msgEl.style.color = 'var(--red)';
        msgEl.style.display = 'block';
      }
    } else {
      if (msgEl) {
        msgEl.textContent = 'Doğrulama e-postası gönderildi! Lütfen yeni adresinizin gelen kutusunu kontrol edin. Doğrulama sonrası e-posta otomatik güncellenecek.';
        msgEl.style.color = 'var(--green)';
        msgEl.style.display = 'block';
      }
      document.getElementById('settings-new-email').value = '';
      document.getElementById('email-change-section').style.display = 'none';
    }

    btnChangeEmail.disabled = false;
    btnChangeEmail.textContent = origText;
  });

  // ── NOTIFICATION PREFERENCES SAVE ──
  (function(){
    var btn = document.getElementById('btn-save-notifications');
    if (!btn) return;
    btn.addEventListener('click', async function(){
      var origText = btn.textContent; // K049 audit fix #2: capture+restore
      var msg = document.getElementById('notifications-msg');
      if (msg) msg.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Kaydediliyor...';
      try {
        var nemVal = document.getElementById('settings-notify-email-messages').checked;
        var nejVal = document.getElementById('settings-notify-email-jobs').checked;
        var nnlEl = document.getElementById('settings-notify-email-newsletter');
        var nnlVal = nnlEl ? nnlEl.checked : false;
        var updatePayload = {
          notify_email_messages: nemVal,
          notify_email_jobs: nejVal,
        };
        if (nnlEl) updatePayload.notify_email_newsletter = nnlVal;
        var res = await supabase
          .from('candidates')
          .update(updatePayload)
          .eq('user_id', currentUser.id);
        if (res.error) throw res.error;
        // Sync in-memory cache
        if (window._loadedDBData && _loadedDBData.profile) {
          _loadedDBData.profile.notify_email_messages = nemVal;
          _loadedDBData.profile.notify_email_jobs = nejVal;
          if (nnlEl) _loadedDBData.profile.notify_email_newsletter = nnlVal;
        }
        if (msg) { msg.style.color = 'var(--green)'; msg.textContent = 'Bildirim tercihleri kaydedildi.'; msg.style.display = 'block'; }
      } catch (e) {
        if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Hata: ' + (e.message || 'Kaydedilemedi.'); msg.style.display = 'block'; }
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  })();

  // ── CONTACT PREFERENCES SAVE ──
  (function(){
    var btn = document.getElementById('btn-save-contact-prefs');
    if(!btn) return;
    btn.addEventListener('click', async function(){
      var origText = btn.textContent; // K049 audit fix #2: capture+restore
      var msg = document.getElementById('contact-prefs-msg');
      if (msg) msg.style.display='none';
      btn.disabled = true;
      btn.textContent = 'Kaydediliyor...';
      try {
        var ceVal = document.getElementById('settings-contact-email').checked;
        var cpVal = document.getElementById('settings-contact-phone').checked;
        var cwVal = document.getElementById('settings-contact-whatsapp').checked;
        var _contactPrefResult = await supabase
          .from('candidates')
          .update({
            contact_pref_email: ceVal,
            contact_pref_phone: cpVal,
            contact_pref_whatsapp: cwVal
          })
          .eq('user_id', currentUser.id);
        var error = _contactPrefResult.error;
        if(error) throw error;
        // Sync in-memory cache
        if (window._loadedDBData && _loadedDBData.profile) {
          _loadedDBData.profile.contact_pref_email = ceVal;
          _loadedDBData.profile.contact_pref_phone = cpVal;
          _loadedDBData.profile.contact_pref_whatsapp = cwVal;
        }
        if (msg) { msg.style.color='var(--green)'; msg.textContent='İletişim tercihleri kaydedildi.'; msg.style.display='block'; }
      } catch(e) {
        if (msg) { msg.style.color='var(--red)'; msg.textContent='Hata: ' + e.message; msg.style.display='block'; }
      } finally {
        btn.disabled = false; btn.textContent = origText;
      }
    });
  })();

  // ── ACTIVELY LOOKING TOGGLE (Settings) — delegates to shared syncActivelyLooking ──
  (function(){
    var toggle = document.getElementById('settings-actively-looking');
    if(!toggle) return;
    toggle.addEventListener('change', function(){
      if (typeof syncActivelyLooking === 'function') syncActivelyLooking(toggle.checked, 'ayarlar');
    });
  })();

  // ── DOWNLOAD MY DATA (KVKK md.11) ──
  (function(){
    var btn = document.getElementById('btn-download-data');
    if(!btn) return;
    btn.addEventListener('click', async function(){
      var origText = btn.textContent; // K049 audit fix #2: capture+restore
      var msg = document.getElementById('download-data-msg');
      msg.style.display='none';
      btn.disabled = true;
      btn.textContent = 'Veriler hazırlanıyor...';
      try {
        if(!currentUser) throw new Error('Oturum bulunamadı');
        var cid = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile.id : null;
        if(!cid) throw new Error('Profil bulunamadı');

        var [profile, experiences, education, languages, certificates, targetRoles, workPrefs, locationPrefs, brandInterests, blockedCompanies] = await Promise.all([
          supabase.from('candidates').select('*').eq('id', cid).maybeSingle(),
          supabase.from('candidate_experiences').select('*').eq('candidate_id', cid),
          supabase.from('candidate_education').select('*').eq('candidate_id', cid),
          supabase.from('candidate_languages').select('*').eq('candidate_id', cid),
          supabase.from('candidate_certificates').select('*').eq('candidate_id', cid),
          supabase.from('candidate_target_roles').select('*').eq('candidate_id', cid),
          supabase.from('candidate_work_preferences').select('*').eq('candidate_id', cid),
          supabase.from('candidate_location_preferences').select('*').eq('candidate_id', cid),
          supabase.from('candidate_brand_interests').select('*').eq('candidate_id', cid),
          supabase.from('candidate_blocked_companies').select('*, companies(company_name)').eq('candidate_id', cid)
        ]);

        var exportData = {
          export_date: new Date().toISOString(),
          export_version: '1.0',
          user_email: currentUser.email,
          profile: profile.data,
          experiences: experiences.data || [],
          education: education.data || [],
          languages: languages.data || [],
          certificates: certificates.data || [],
          target_roles: targetRoles.data || [],
          work_preferences: workPrefs.data || [],
          location_preferences: locationPrefs.data || [],
          brand_interests: brandInterests.data || [],
          blocked_companies: blockedCompanies.data || []
        };

        var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'hellotalent-verilerim-' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        msg.style.color='var(--green)'; msg.textContent='Verileriniz indirildi.'; msg.style.display='block';
      } catch(e) {
        msg.style.color='var(--red)'; msg.textContent='Hata: ' + e.message; msg.style.display='block';
      } finally {
        btn.disabled = false; btn.textContent = origText;
      }
    });
  })();

  // ── BLOCKED COMPANIES MANAGEMENT ──
  (function(){
    var searchInput = document.getElementById('blocked-company-search');
    var dropdown = document.getElementById('blocked-company-dropdown');
    var listDiv = document.getElementById('blocked-companies-list');
    var emptyDiv = document.getElementById('blocked-companies-empty');
    var msgDiv = document.getElementById('blocked-msg');
    if (!searchInput) return;

    var blockedIds = new Set();
    var debounceTimer = null;

    async function loadBlocked(){
      if (!currentUser) return;
      try {
        var cid = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile.id : null;
        if (!cid) return;
        var res = await supabase
          .from('candidate_blocked_companies')
          .select('id, company_id, companies(company_name)')
          .eq('candidate_id', cid);
        if (res.error) throw res.error;
        var data = res.data;
        blockedIds.clear();
        listDiv.innerHTML = '';
        if (data && data.length > 0) {
          emptyDiv.style.display = 'none';
          data.forEach(function(row){
            blockedIds.add(row.company_id);
            addBlockedChip(row.id, row.company_id, row.companies ? row.companies.company_name : 'Bilinmeyen');
          });
        } else {
          emptyDiv.style.display = 'block';
        }
      } catch (e) { console.error('loadBlocked error:', e); }
    }

    function addBlockedChip(rowId, companyId, companyName){
      var chip = document.createElement('div');
      chip.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--gray);border:1px solid var(--border);border-radius:8px;font-size:13px;';
      var nameSpan = document.createElement('span');
      nameSpan.textContent = companyName;
      chip.appendChild(nameSpan);
      var removeBtn = document.createElement('button');
      removeBtn.textContent = 'Kaldır';
      removeBtn.style.cssText = 'background:none;border:none;color:var(--verm);cursor:pointer;font-size:12px;font-weight:600;';
      removeBtn.addEventListener('click', async function(){
        removeBtn.disabled = true;
        removeBtn.textContent = '...';
        try {
          var delRes = await supabase
            .from('candidate_blocked_companies')
            .delete()
            .eq('id', rowId);
          if (delRes.error) throw delRes.error;
          blockedIds.delete(companyId);
          chip.remove();
          if (listDiv.children.length === 0) emptyDiv.style.display = 'block';
        } catch (e) {
          removeBtn.disabled = false;
          removeBtn.textContent = 'Kaldır';
          msgDiv.style.color = 'var(--red)';
          msgDiv.textContent = 'Hata: ' + (e.message || '');
          msgDiv.style.display = 'block';
        }
      });
      chip.appendChild(removeBtn);
      listDiv.appendChild(chip);
    }

    searchInput.addEventListener('input', function(){
      clearTimeout(debounceTimer);
      var q = searchInput.value.trim();
      if (q.length < 2) { dropdown.style.display = 'none'; return; }
      debounceTimer = setTimeout(async function(){
        try {
          var res = await supabase
            .from('companies')
            .select('id, company_name')
            .ilike('company_name', '%' + q + '%')
            .eq('is_active', true)
            .limit(10);
          if (res.error) throw res.error;
          var data = res.data;
          dropdown.innerHTML = '';
          if (!data || data.length === 0) {
            var noResult = document.createElement('div');
            noResult.style.cssText = 'padding:10px;font-size:12px;color:var(--muted);';
            noResult.textContent = 'Sonuç bulunamadı';
            dropdown.appendChild(noResult);
            dropdown.style.display = 'block';
            return;
          }
          data.forEach(function(c){
            var item = document.createElement('div');
            item.style.cssText = 'padding:10px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);';
            item.textContent = c.company_name;
            if (blockedIds.has(c.id)) {
              item.style.opacity = '0.4';
              item.style.cursor = 'default';
              item.textContent += ' (engellendi)';
            } else {
              item.addEventListener('click', async function(){
                dropdown.style.display = 'none';
                searchInput.value = '';
                try {
                  var cid = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile.id : null;
                  if (!cid) return;
                  var insRes = await supabase
                    .from('candidate_blocked_companies')
                    .insert({ candidate_id: cid, company_id: c.id })
                    .select('id')
                    .maybeSingle();
                  if (insRes.error) throw insRes.error;
                  var inserted = insRes.data;
                  blockedIds.add(c.id);
                  addBlockedChip(inserted.id, c.id, c.company_name);
                  emptyDiv.style.display = 'none';
                } catch (e) {
                  msgDiv.style.color = 'var(--red)';
                  msgDiv.textContent = 'Hata: ' + (e.message || '');
                  msgDiv.style.display = 'block';
                }
              });
              item.addEventListener('mouseenter', function(){ item.style.background = 'var(--gray)'; });
              item.addEventListener('mouseleave', function(){ item.style.background = 'transparent'; });
            }
            dropdown.appendChild(item);
          });
          dropdown.style.display = 'block';
        } catch (e) { console.error('blocked company search error:', e); }
      }, 300);
    });

    document.addEventListener('click', function(e){
      if (dropdown && searchInput && !dropdown.contains(e.target) && e.target !== searchInput) dropdown.style.display = 'none';
    });

    window._htLoadBlockedCompanies = loadBlocked;
  })();

  // ── ACCOUNT MANAGEMENT (Freeze / Delete) ──
  (function(){
    var freezeBtn = document.getElementById('btn-freeze-account');
    var deleteBtn = document.getElementById('btn-delete-account');
    var banner = document.getElementById('account-status-banner');
    if (!freezeBtn || !deleteBtn) return;

    // Open/close wizard
    var wizOverlay = document.getElementById('account-wizard-overlay');
    var btnOpen = document.getElementById('btn-open-account-wizard');
    var btnClose = document.getElementById('btn-close-account-wizard');
    if (btnOpen) btnOpen.addEventListener('click', function(){
      if (wizOverlay) wizOverlay.style.display = 'flex';
    });
    if (btnClose) btnClose.addEventListener('click', function(){
      if (wizOverlay) wizOverlay.style.display = 'none';
    });

    // K049 audit fix #1: banner state via class (token-driven), not inline hex
    function showBanner(status){
      banner.classList.remove('ayr-banner--frozen', 'ayr-banner--pending-deletion');
      if (status === 'frozen') {
        banner.style.display = 'block';
        banner.classList.add('ayr-banner--frozen');
        banner.textContent = '';
        var strong1 = document.createElement('strong');
        strong1.textContent = 'Hesabınız dondurulmuş.';
        banner.appendChild(strong1);
        banner.appendChild(document.createTextNode(' Profiliniz işverenlere görünmüyor. '));
        var unfreezeBtn = document.createElement('button');
        unfreezeBtn.id = 'btn-unfreeze';
        unfreezeBtn.className = 'ayr-banner__action';
        unfreezeBtn.textContent = 'Tekrar Aktif Et';
        banner.appendChild(unfreezeBtn);
        freezeBtn.style.display = 'none';
        unfreezeBtn.addEventListener('click', function(){ changeStatus('active'); });
      } else if (status === 'pending_deletion') {
        banner.style.display = 'block';
        banner.classList.add('ayr-banner--pending-deletion');
        banner.textContent = '';
        var strong2 = document.createElement('strong');
        strong2.textContent = 'Hesabınız silinmek üzere.';
        banner.appendChild(strong2);
        banner.appendChild(document.createTextNode(' 30 gün içinde vazgeçebilirsiniz. '));
        var cancelDelBtn = document.createElement('button');
        cancelDelBtn.id = 'btn-cancel-deletion';
        cancelDelBtn.className = 'ayr-banner__action';
        cancelDelBtn.textContent = 'Vazgeç';
        banner.appendChild(cancelDelBtn);
        freezeBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        cancelDelBtn.addEventListener('click', function(){ changeStatus('active'); });
      } else {
        banner.style.display = 'none';
        freezeBtn.style.display = 'block';
        freezeBtn.textContent = 'Hesabımı Dondur';
        deleteBtn.style.display = 'block';
      }
    }

    async function changeStatus(newStatus){
      if (!currentUser) return;
      try {
        var res = await supabase
          .from('candidates')
          .update({ account_status: newStatus })
          .eq('user_id', currentUser.id);
        if (res.error) throw res.error;
        if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.account_status = newStatus;
        showBanner(newStatus);
        if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
      } catch (e) {
        _htAlert('Hata: ' + (e.message || ''));
      }
    }

    freezeBtn.addEventListener('click', function(){
      _htConfirm('Hesabınızı dondurmak istediğinize emin misiniz? Profiliniz işverenlere görünmez olacak.', function(){
        changeStatus('frozen');
      });
    });

    deleteBtn.addEventListener('click', function(){
      _htConfirm('DİKKAT: Hesabınız 30 gün sonra kalıcı olarak silinecektir. Bu süre içinde giriş yaparak vazgeçebilirsiniz. Devam etmek istiyor musunuz?', function(){
        changeStatus('pending_deletion');
      });
    });

    window._htShowAccountBanner = showBanner;
    var statusCheck = setInterval(function(){
      if (_loadedDBData && _loadedDBData.profile) {
        clearInterval(statusCheck);
        showBanner(_loadedDBData.profile.account_status || 'active');
      }
    }, 500);
  })();

  // ── İKİ ADIMLI DOĞRULAMA (MFA / TOTP) ──
  (function(){
    var loading     = document.getElementById('mfa-loading');
    var disabledSt  = document.getElementById('mfa-disabled-state');
    var enrollSt    = document.getElementById('mfa-enroll-state');
    var enabledSt   = document.getElementById('mfa-enabled-state');
    var btnEnable   = document.getElementById('btn-mfa-enable');
    var btnVerify   = document.getElementById('btn-mfa-verify');
    var btnCancel   = document.getElementById('btn-mfa-cancel-enroll');
    var btnDisable  = document.getElementById('btn-mfa-disable');
    if (!loading) return;

    var pendingFactorId = null;

    function showState(state) {
      loading.style.display    = state === 'loading'  ? '' : 'none';
      disabledSt.style.display = state === 'disabled' ? '' : 'none';
      enrollSt.style.display   = state === 'enroll'   ? '' : 'none';
      enabledSt.style.display  = state === 'enabled'  ? '' : 'none';
    }

    async function checkMfaStatus() {
      try {
        var res = await supabase.auth.mfa.listFactors();
        if (res.error) throw res.error;
        var factors = res.data || {};
        var activeTOTP = (factors.totp || []).filter(function(f){ return f.status === 'verified'; });
        if (activeTOTP.length > 0) {
          showState('enabled');
        } else {
          showState('disabled');
        }
      } catch (e) {
        console.error('MFA status check error:', e);
        showState('disabled');
      }
    }

    checkMfaStatus();

    // Enable: start enrollment
    if (btnEnable) btnEnable.addEventListener('click', async function(){
      var origText = btnEnable.textContent; // K049 audit fix #2: capture+restore
      btnEnable.disabled = true;
      btnEnable.textContent = 'Hazırlanıyor...';
      try {
        var res = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'HelloTalent' });
        if (res.error) throw res.error;
        pendingFactorId = res.data.id;

        // Show QR code
        var qrContainer = document.getElementById('mfa-qr-container');
        var qrImg = document.createElement('img');
        qrImg.src = res.data.totp.qr_code;
        qrImg.alt = 'QR Kod';
        qrImg.style.cssText = 'width:200px;height:200px;';
        qrContainer.textContent = '';
        qrContainer.appendChild(qrImg);

        // Show secret for manual entry
        var secretEl = document.getElementById('mfa-secret-code');
        secretEl.textContent = res.data.totp.secret;

        showState('enroll');
      } catch (e) {
        _htAlert('Hata: ' + (e.message || 'İki adımlı doğrulama başlatılamadı.'));
      } finally {
        btnEnable.disabled = false;
        btnEnable.textContent = origText;
      }
    });

    // Verify enrollment code
    if (btnVerify) btnVerify.addEventListener('click', async function(){
      var code = (document.getElementById('mfa-verify-code').value || '').trim();
      var msg = document.getElementById('mfa-enroll-msg');
      if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        if (msg) { msg.textContent = '6 haneli sayısal kod girin.'; msg.style.color = 'var(--red)'; msg.style.display = 'block'; }
        return;
      }
      if (!pendingFactorId) {
        if (msg) { msg.textContent = 'Hata: Kayıt işlemi bulunamadı. Tekrar deneyin.'; msg.style.color = 'var(--red)'; msg.style.display = 'block'; }
        return;
      }
      btnVerify.disabled = true;
      btnVerify.textContent = 'Doğrulanıyor...';
      if (msg) msg.style.display = 'none';
      try {
        var res = await supabase.auth.mfa.challengeAndVerify({
          factorId: pendingFactorId,
          code: code
        });
        if (res.error) throw res.error;
        pendingFactorId = null;
        showState('enabled');
        _htAlert('İki adımlı doğrulama başarıyla etkinleştirildi!');
      } catch (e) {
        if (msg) {
          msg.textContent = e.message && e.message.indexOf('invalid') > -1
            ? 'Kod geçersiz. Uygulamadaki güncel kodu kontrol edin.'
            : 'Hata: ' + (e.message || 'Doğrulama başarısız.');
          msg.style.color = 'var(--red)';
          msg.style.display = 'block';
        }
      } finally {
        btnVerify.disabled = false;
        btnVerify.textContent = 'Doğrula';
      }
    });

    // Cancel enrollment — unenroll pending factor
    if (btnCancel) btnCancel.addEventListener('click', async function(){
      if (pendingFactorId) {
        try { await supabase.auth.mfa.unenroll({ factorId: pendingFactorId }); } catch(e) { /* ignore */ }
        pendingFactorId = null;
      }
      document.getElementById('mfa-verify-code').value = '';
      var msg = document.getElementById('mfa-enroll-msg');
      if (msg) msg.style.display = 'none';
      showState('disabled');
    });

    // Disable MFA — state machine: 'confirm' → 'verify' → done
    var mfaDisablePhase = 'confirm';
    var btnDisableOrigText = btnDisable ? btnDisable.textContent : 'Kapat';

    // K049 audit fix #3: verify phase'inde "Vazgec" yardimcisi — state corrupt riskini engeller
    function resetMfaDisableFlow() {
      var msg = document.getElementById('mfa-disable-msg');
      if (msg) { msg.textContent = ''; msg.style.display = 'none'; }
      mfaDisablePhase = 'confirm';
      if (btnDisable) {
        btnDisable.disabled = false;
        btnDisable.textContent = btnDisableOrigText;
      }
    }

    if (btnDisable) btnDisable.addEventListener('click', async function(){
      var msg = document.getElementById('mfa-disable-msg');

      if (mfaDisablePhase === 'confirm') {
        _htConfirm('İki adımlı doğrulamayı kapatmak için mevcut doğrulama kodunuzu girmeniz gerekecek. Devam etmek istiyor musunuz?', function(){
          // K049 audit fix #3: prompt + Vazgec butonu (state reset)
          if (msg) {
            msg.textContent = '';
            var promptDiv = document.createElement('div');
            promptDiv.style.cssText = 'margin-bottom:12px;font-size:13px;';
            promptDiv.textContent = 'Güvenlik için uygulamadaki 6 haneli kodu girin:';
            var inp = document.createElement('input');
            inp.type = 'text'; inp.id = 'mfa-disable-code'; inp.maxLength = 6;
            inp.placeholder = '000000';
            inp.style.cssText = 'width:120px;text-align:center;font-size:18px;letter-spacing:6px;font-family:DM Mono,monospace;margin-bottom:12px;padding:8px;border:2px solid var(--border);border-radius:8px;';
            var cancelLink = document.createElement('button');
            cancelLink.type = 'button';
            cancelLink.className = 'ayr-banner__action';
            cancelLink.style.marginLeft = '8px';
            cancelLink.textContent = 'Vazgeç';
            cancelLink.addEventListener('click', resetMfaDisableFlow);
            var codeMsgDiv = document.createElement('div');
            codeMsgDiv.id = 'mfa-disable-code-msg';
            codeMsgDiv.style.cssText = 'display:none;font-size:12px;margin-top:4px;';
            msg.appendChild(promptDiv);
            msg.appendChild(inp);
            msg.appendChild(cancelLink);
            msg.appendChild(codeMsgDiv);
            msg.style.color = '';
            msg.style.display = 'block';
          }
          btnDisable.textContent = 'Kodu Doğrula ve Kapat';
          mfaDisablePhase = 'verify';
        });
        return;
      }

      if (mfaDisablePhase === 'verify') {
        var code = (document.getElementById('mfa-disable-code').value || '').trim();
        var codeMsg = document.getElementById('mfa-disable-code-msg');
        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
          if (codeMsg) { codeMsg.textContent = '6 haneli sayısal kod girin.'; codeMsg.style.color = 'var(--red)'; codeMsg.style.display = 'block'; }
          return;
        }
        btnDisable.disabled = true;
        btnDisable.textContent = 'Doğrulanıyor...';
        try {
          var res = await supabase.auth.mfa.listFactors();
          if (res.error) throw res.error;
          var activeTOTP = (res.data || {}).totp || [];
          activeTOTP = activeTOTP.filter(function(f){ return f.status === 'verified'; });
          if (activeTOTP.length === 0) throw new Error('Aktif faktör bulunamadı.');

          var verifyRes = await supabase.auth.mfa.challengeAndVerify({
            factorId: activeTOTP[0].id,
            code: code
          });
          if (verifyRes.error) throw verifyRes.error;

          for (var i = 0; i < activeTOTP.length; i++) {
            var uRes = await supabase.auth.mfa.unenroll({ factorId: activeTOTP[i].id });
            if (uRes.error) throw uRes.error;
          }
          showState('disabled');
          if (msg) { msg.textContent = ''; msg.style.display = 'none'; }
          mfaDisablePhase = 'confirm';
          btnDisable.textContent = btnDisableOrigText;
          _htAlert('İki adımlı doğrulama kapatıldı.');
        } catch (e) {
          var errText = (e.message || '').toLowerCase();
          if (codeMsg) {
            codeMsg.textContent = errText.indexOf('invalid') > -1 ? 'Kod geçersiz. Tekrar deneyin.' : 'Hata: ' + (e.message || '');
            codeMsg.style.color = 'var(--red)';
            codeMsg.style.display = 'block';
          }
        } finally {
          btnDisable.disabled = false;
          btnDisable.textContent = 'Kodu Doğrula ve Kapat';
        }
      }
    });
  })();

  // Sign out (settings)
  var btnSignoutSettings = document.getElementById('btn-signout-settings');
  if (btnSignoutSettings) btnSignoutSettings.addEventListener('click', async function() {
    await supabase.auth.signOut();
    window.location.href = 'giris.html';
  });

  // ── SESSION MANAGEMENT ──
  (function(){
    var deviceInfo = document.getElementById('session-device-info');
    var loginTime = document.getElementById('session-login-time');

    if(deviceInfo) {
      var ua = navigator.userAgent;
      var browser = 'Bilinmeyen Tarayıcı';
      if(ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
      else if(ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
      else if(ua.indexOf('Firefox') > -1) browser = 'Firefox';
      else if(ua.indexOf('Edg') > -1) browser = 'Edge';

      var os = 'Bilinmeyen İşletim Sistemi';
      if(ua.indexOf('Mac') > -1) os = 'macOS';
      else if(ua.indexOf('Windows') > -1) os = 'Windows';
      else if(ua.indexOf('Linux') > -1) os = 'Linux';
      else if(ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';
      else if(ua.indexOf('Android') > -1) os = 'Android';

      deviceInfo.textContent = browser + ' — ' + os;
    }

    if(loginTime && typeof supabase !== 'undefined') {
      var authPromise = window._htAuthSessionPromise || supabase.auth.getSession();
      authPromise.then(function(res) {
        if(res.data && res.data.session) {
          var created = new Date(res.data.session.created_at || res.data.session.expires_at);
          if(!isNaN(created.getTime())) {
            var options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            loginTime.textContent = 'Giriş: ' + created.toLocaleDateString('tr-TR', options);
          }
        }
      });
    }

    var btnSignoutAll = document.getElementById('btn-signout-all');
    if(btnSignoutAll) btnSignoutAll.addEventListener('click', function(){
      var msg = document.getElementById('signout-all-msg');
      _htConfirm('Tüm cihazlardaki oturumlarınız kapatılacak. Emin misiniz?', async function(){
        btnSignoutAll.disabled = true;
        btnSignoutAll.textContent = 'Çıkış yapılıyor...';
        try {
          var _res = await supabase.auth.signOut({ scope: 'global' });
          if(_res.error) throw _res.error;
          window.location.href = 'giris.html';
        } catch(err) {
          if(msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Hata: ' + err.message; msg.style.display = 'block'; }
          btnSignoutAll.disabled = false;
          btnSignoutAll.textContent = 'Tüm Cihazlardan Çıkış Yap';
        }
      });
    });
  })();

});
