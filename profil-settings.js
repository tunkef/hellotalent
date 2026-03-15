/* ═══════════════════════════════════════════════════════════════
   PROFIL-SETTINGS — Ayarlar panel logic
   Notification, contact, visibility, blocked companies, account mgmt
   ═══════════════════════════════════════════════════════════════ */

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
      cancelBtn.addEventListener('click', async function(){
        if (!confirm('Hesap silme işlemini iptal etmek istiyor musunuz? Hesabınız tekrar aktif olacak.')) return;
        try {
          var res = await supabase
            .from('candidates')
            .update({ account_status: 'active' })
            .eq('user_id', currentUser.id);
          if (res.error) throw res.error;
          profile.account_status = 'active';
          banner.style.display = 'none';
          alert('Hesabınız tekrar aktif edildi!');
          if (window._htShowAccountBanner) window._htShowAccountBanner('active');
        } catch (e) {
          alert('Hata: ' + (e.message || ''));
        }
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
    if (!newPw || newPw.length < 6) {
      if (pwMsg) { pwMsg.textContent = 'Sifre en az 6 karakter olmali.'; pwMsg.style.color = 'var(--red)'; pwMsg.style.display = 'block'; }
      return;
    }
    if (newPw !== confirmPw) {
      if (pwMsg) { pwMsg.textContent = 'Sifreler eslesmedi.'; pwMsg.style.color = 'var(--red)'; pwMsg.style.display = 'block'; }
      return;
    }
    btnChangePw.disabled = true;
    var res = await supabase.auth.updateUser({ password: newPw });
    if (res.error) {
      if (pwMsg) { pwMsg.textContent = res.error.message; pwMsg.style.color = 'var(--red)'; pwMsg.style.display = 'block'; }
    } else {
      if (pwMsg) { pwMsg.textContent = 'Sifre basariyla guncellendi!'; pwMsg.style.color = 'var(--green)'; pwMsg.style.display = 'block'; }
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

  // Gizlilik: visibility toggle (Settings) — read/write candidates.is_active
  var settingsVisibilityToggle = document.getElementById('settings-visibility-active');
  if (settingsVisibilityToggle) settingsVisibilityToggle.addEventListener('change', async function() {
    var isActive = this.checked;
    if (!currentUser) return;
    var res = await supabase.from('candidates').update({ is_active: isActive }).eq('user_id', currentUser.id);
    if (res.error) {
      this.checked = !isActive;
      return;
    }
    refreshAfterVisibilitySave(isActive);
  });

  // Gizlilik: hide from current employer — read/write candidates.hide_from_current_employer
  var settingsHideFromEmployer = document.getElementById('settings-hide-from-current-employer');
  if (settingsHideFromEmployer) settingsHideFromEmployer.addEventListener('change', async function() {
    if (this.disabled || !currentUser) return;
    var val = this.checked;
    var res = await supabase.from('candidates').update({ hide_from_current_employer: val }).eq('user_id', currentUser.id);
    if (res.error) {
      this.checked = !val;
      return;
    }
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.hide_from_current_employer = val;
    var merkezHide = document.getElementById('merkez-hide-from-current-employer');
    if (merkezHide) merkezHide.checked = val;
    refreshVisibilitySummary();
  });
  var merkezHideFromEmployer = document.getElementById('merkez-hide-from-current-employer');
  if (merkezHideFromEmployer) merkezHideFromEmployer.addEventListener('change', async function() {
    if (this.disabled || !currentUser) return;
    var val = this.checked;
    var res = await supabase.from('candidates').update({ hide_from_current_employer: val }).eq('user_id', currentUser.id);
    if (res.error) {
      this.checked = !val;
      return;
    }
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.hide_from_current_employer = val;
    var settingsHide = document.getElementById('settings-hide-from-current-employer');
    if (settingsHide) settingsHide.checked = val;
    refreshVisibilitySummary();
  });

  // Hesap Bilgileri save (Settings)
  var btnSettingsAccountSave = document.getElementById('btn-settings-account-save');
  if (btnSettingsAccountSave) btnSettingsAccountSave.addEventListener('click', async function() {
    var fullName = (document.getElementById('settings-adsoyad') && document.getElementById('settings-adsoyad').value) || '';
    var phone = (document.getElementById('settings-telefon') && document.getElementById('settings-telefon').value) || '';
    fullName = fullName.trim();
    var msgEl = document.getElementById('settings-account-msg');
    if (!fullName) {
      if (msgEl) { msgEl.textContent = 'Ad Soyad zorunludur.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
      return;
    }
    if (!currentUser) { if (msgEl) { msgEl.textContent = 'Oturum bulunamadi.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; } return; }
    btnSettingsAccountSave.disabled = true;
    var res = await supabase.from('candidates').update({
      full_name: fullName,
      telefon: phone || null
    }).eq('user_id', currentUser.id);
    if (res.error) {
      if (msgEl) { msgEl.textContent = res.error.message || 'Kayit guncellenemedi.'; msgEl.style.color = 'var(--red)'; msgEl.style.display = 'block'; }
    } else {
      if (msgEl) { msgEl.textContent = 'Hesap bilgileri guncellendi.'; msgEl.style.color = 'var(--green)'; msgEl.style.display = 'block'; }
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
    btnChangeEmail.textContent = 'Doğrulama Gönder';
  });

  // ── NOTIFICATION PREFERENCES SAVE ──
  (function(){
    var btn = document.getElementById('btn-save-notifications');
    if (!btn) return;
    btn.addEventListener('click', async function(){
      var msg = document.getElementById('notifications-msg');
      msg.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Kaydediliyor...';
      try {
        var res = await supabase
          .from('candidates')
          .update({
            notify_email_messages: document.getElementById('settings-notify-email-messages').checked,
            notify_email_jobs: document.getElementById('settings-notify-email-jobs').checked
          })
          .eq('user_id', currentUser.id);
        if (res.error) throw res.error;
        msg.style.color = 'var(--green)';
        msg.textContent = 'Bildirim tercihleri kaydedildi.';
        msg.style.display = 'block';
      } catch (e) {
        msg.style.color = 'var(--red)';
        msg.textContent = 'Hata: ' + (e.message || 'Kaydedilemedi.');
        msg.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Bildirim Tercihlerini Kaydet';
      }
    });
  })();

  // ── CONTACT PREFERENCES SAVE ──
  (function(){
    var btn = document.getElementById('btn-save-contact-prefs');
    if(!btn) return;
    btn.addEventListener('click', async function(){
      var msg = document.getElementById('contact-prefs-msg');
      msg.style.display='none';
      btn.disabled = true;
      btn.textContent = 'Kaydediliyor...';
      try {
        var { error } = await supabase
          .from('candidates')
          .update({
            contact_pref_email: document.getElementById('settings-contact-email').checked,
            contact_pref_phone: document.getElementById('settings-contact-phone').checked,
            contact_pref_whatsapp: document.getElementById('settings-contact-whatsapp').checked
          })
          .eq('user_id', currentUser.id);
        if(error) throw error;
        msg.style.color='var(--green)'; msg.textContent='İletişim tercihleri kaydedildi.'; msg.style.display='block';
      } catch(e) {
        msg.style.color='var(--red)'; msg.textContent='Hata: ' + e.message; msg.style.display='block';
      } finally {
        btn.disabled = false; btn.textContent = 'İletişim Tercihlerini Kaydet';
      }
    });
  })();

  // ── ACTIVELY LOOKING TOGGLE ──
  (function(){
    var toggle = document.getElementById('settings-actively-looking');
    if(!toggle) return;
    toggle.addEventListener('change', async function(){
      var msg = document.getElementById('actively-looking-msg');
      msg.style.display='none';
      try {
        var { error } = await supabase
          .from('candidates')
          .update({ is_actively_looking: toggle.checked })
          .eq('user_id', currentUser.id);
        if(error) throw error;
        if(_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_actively_looking = toggle.checked;
        msg.style.color='var(--green)';
        msg.textContent = toggle.checked ? 'Aktif arama modu açıldı.' : 'Aktif arama modu kapatıldı.';
        msg.style.display='block';
        setTimeout(function(){ msg.style.display='none'; }, 3000);
      } catch(e) {
        msg.style.color='var(--red)'; msg.textContent='Hata: ' + e.message; msg.style.display='block';
        toggle.checked = !toggle.checked;
      }
    });
  })();

  // ── DOWNLOAD MY DATA (KVKK md.11) ──
  (function(){
    var btn = document.getElementById('btn-download-data');
    if(!btn) return;
    btn.addEventListener('click', async function(){
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
        btn.disabled = false; btn.textContent = 'Verilerimi İndir (KVKK md.11)';
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
                    .single();
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

    function showBanner(status){
      if (status === 'frozen') {
        banner.style.display = 'block';
        banner.style.background = '#FEF3C7';
        banner.style.color = '#92400E';
        banner.textContent = '';
        var strong1 = document.createElement('strong');
        strong1.textContent = 'Hesabınız dondurulmuş.';
        banner.appendChild(strong1);
        banner.appendChild(document.createTextNode(' Profiliniz işverenlere görünmüyor. '));
        var unfreezeBtn = document.createElement('button');
        unfreezeBtn.id = 'btn-unfreeze';
        unfreezeBtn.style.cssText = 'background:none;border:none;color:var(--verm);cursor:pointer;font-weight:600;text-decoration:underline;margin-left:4px;';
        unfreezeBtn.textContent = 'Tekrar Aktif Et';
        banner.appendChild(unfreezeBtn);
        freezeBtn.style.display = 'none';
        unfreezeBtn.addEventListener('click', function(){ changeStatus('active'); });
      } else if (status === 'pending_deletion') {
        banner.style.display = 'block';
        banner.style.background = '#FEE2E2';
        banner.style.color = '#991B1B';
        banner.textContent = '';
        var strong2 = document.createElement('strong');
        strong2.textContent = 'Hesabınız silinmek üzere.';
        banner.appendChild(strong2);
        banner.appendChild(document.createTextNode(' 30 gün içinde vazgeçebilirsiniz. '));
        var cancelDelBtn = document.createElement('button');
        cancelDelBtn.id = 'btn-cancel-deletion';
        cancelDelBtn.style.cssText = 'background:none;border:none;color:var(--verm);cursor:pointer;font-weight:600;text-decoration:underline;margin-left:4px;';
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
        alert('Hata: ' + (e.message || ''));
      }
    }

    freezeBtn.addEventListener('click', function(){
      if (!confirm('Hesabınızı dondurmak istediğinize emin misiniz? Profiliniz işverenlere görünmez olacak.')) return;
      changeStatus('frozen');
    });

    deleteBtn.addEventListener('click', function(){
      if (!confirm('DİKKAT: Hesabınız 30 gün sonra kalıcı olarak silinecektir. Bu süre içinde giriş yaparak vazgeçebilirsiniz.\n\nDevam etmek istiyor musunuz?')) return;
      changeStatus('pending_deletion');
    });

    window._htShowAccountBanner = showBanner;
    var statusCheck = setInterval(function(){
      if (_loadedDBData && _loadedDBData.profile) {
        clearInterval(statusCheck);
        showBanner(_loadedDBData.profile.account_status || 'active');
      }
    }, 500);
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
    if(btnSignoutAll) btnSignoutAll.addEventListener('click', async function(){
      var msg = document.getElementById('signout-all-msg');
      if(!confirm('Tüm cihazlardaki oturumlarınız kapatılacak. Emin misiniz?')) return;
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
  })();

});
