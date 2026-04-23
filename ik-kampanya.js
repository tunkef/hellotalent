/* global hrProfile */
/* ═══════════════════════════════════════════════════════════════
   HELLOTALENT — IK KAMPANYA JS
   Kampanya listesi + 6 adımlı wizard
   Depends on: ik.html (getSupa, hrProfile, switchPanel)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var supa = null;
  var currentCampaignId = null;
  var wizardData = {};
  var currentStep = 1;
  var TOTAL_STEPS = 6;

  /* ── SEGMENT MAPPING ── */
  var SEGMENT_MAP = {
    luxury:'LUXURY', premium:'PREMIUM', mid:'MODA',
    sportswear:'SPORT', beauty:'BEAUTY', tech:'TECH'
  };
  var SEGMENT_KEYS = Object.keys(SEGMENT_MAP);

  /* ── TYPE LABELS ──
   * FAZ C: 'hiring_boost' wizard'dan kaldirildi (is ilani yasak) ama
   * label map'te kalir — mevcut hiring_boost kampanyalari admin'de
   * gosterilirken kirilmadan label verir. */
  var TYPE_MAP = {
    offer: 'Teklif',
    employer_branding: 'İşveren Markası',
    hiring_boost: 'İşe Alım Boost',
    store_opening: 'Yeni Mağaza',
    brand_story: 'Marka Haberi'
  };

  /* ── STATUS LABELS ── */
  var STATUS_MAP = {
    draft:['Taslak','draft'], pending_review:['Beklemede','pending'],
    approved:['Onaylı','approved'], active:['Aktif','active'],
    rejected:['Reddedildi','rejected'], revision_needed:['Düzenleme','revision'],
    ended:['Sona Erdi','ended'], archived:['Arşiv','archived'],
    paused:['Duraklatıldı','paused']
  };

  /* ── SENIORITY LABELS ── */
  var SENIORITY_MAP = {
    junior:'Giriş Seviye (0-2 yıl)',
    mid:'Orta (3-5 yıl)',
    senior:'Kıdemli (6-10 yıl)',
    manager:'Yönetici (10+ yıl)'
  };

  /* ── DISTRIBUTION LABELS ── */
  var DIST_MAP = {
    followers_only: { label:'Sadece Takipçiler', desc:'Markanızı takip eden adaylara gösterilir' },
    followers_plus_similar: { label:'Takipçiler + Benzer', desc:'Takipçiler ve aynı segmentteki adaylara gösterilir' },
    broad_discovery: { label:'Geniş Keşif', desc:'Tüm uygun adaylara gösterilir' }
  };

  /* ── ACCESS LABELS ── */
  var ACCESS_MAP = {
    public_all: { label:'Herkese Açık', desc:'Tüm adaylar görebilir ve kullanabilir' },
    visible_redeemable_premium: { label:'Görünür, Premium Kullanım', desc:'Herkes görür ama sadece premium adaylar kullanabilir' },
    premium_exclusive: { label:'Sadece Premium', desc:'Sadece premium adaylar görebilir' }
  };

  /* ── PACKAGE LABELS ── */
  var PKG_MAP = {
    basic: { label:'Basic', desc:'Sadece Feed', channels:['feed'], price:'—' },
    boost: { label:'Boost', desc:'Feed + Inbox mesajı', channels:['feed','inbox'], price:'—' },
    premium: { label:'Premium', desc:'Feed + Inbox + E-posta', channels:['feed','inbox','email'], price:'—' }
  };

  function getSupa() {
    if (!supa) supa = window.getSupa ? window.getSupa() : null;
    return supa;
  }

  /* ═══════════════════════════════════════════════════════════════
     CAMPAIGN LIST
     ═══════════════════════════════════════════════════════════════ */
  window._htLoadCampaigns = async function() {
    var listEl = document.getElementById('campaign-list');
    var wizardEl = document.getElementById('campaign-wizard');
    var noCompanyEl = document.getElementById('kampanya-no-company');
    var newBtn = document.getElementById('btn-new-campaign');

    if (!listEl) return;

    // Check company_id
    if (!hrProfile || !hrProfile.company_id) {
      if (noCompanyEl) noCompanyEl.style.display = 'block';
      if (newBtn) newBtn.style.display = 'none';
      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      return;
    }

    if (noCompanyEl) noCompanyEl.style.display = 'none';
    if (newBtn) newBtn.style.display = '';

    try {
      var s = getSupa();
      if (!s) return;

      var res = await s.from('campaigns')
        .select('id, title, campaign_type, status, start_date, end_date, created_at, submitted_at, impression_count, click_count, redeem_count, payment_status')
        .eq('company_id', hrProfile.company_id)
        .order('created_at', { ascending: false });

      if (res.error) { console.error('Campaign list error:', res.error); return; }

      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

      if (!res.data || res.data.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:60px 20px;color:var(--muted);';
        var icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;margin-bottom:12px;opacity:0.3;';
        icon.textContent = '📢';
        empty.appendChild(icon);
        var txt = document.createElement('div');
        txt.style.fontSize = '14px';
        txt.textContent = 'Henüz kampanya oluşturmadınız';
        empty.appendChild(txt);
        listEl.appendChild(empty);
        return;
      }

      // Group by status
      var groups = { active:[], pending_review:[], draft:[], revision_needed:[], other:[] };
      for (var i = 0; i < res.data.length; i++) {
        var c = res.data[i];
        if (groups[c.status]) groups[c.status].push(c);
        else groups.other.push(c);
      }

      var order = ['active','pending_review','draft','revision_needed','other'];
      var groupLabels = { active:'Aktif', pending_review:'Beklemede', draft:'Taslak', revision_needed:'Düzenleme İstendi', other:'Diğer' };

      for (var g = 0; g < order.length; g++) {
        var key = order[g];
        var items = groups[key];
        if (!items || items.length === 0) continue;

        var section = document.createElement('div');
        section.style.marginBottom = '24px';

        var label = document.createElement('div');
        label.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:8px;';
        label.textContent = groupLabels[key] + ' (' + items.length + ')';
        section.appendChild(label);

        for (var j = 0; j < items.length; j++) {
          section.appendChild(buildCampaignCard(items[j]));
        }
        listEl.appendChild(section);
      }
    } catch(e) {
      console.error('Campaign list exception:', e);
    }
  };

  function buildCampaignCard(c) {
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--white);border-radius:12px;padding:16px 20px;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,0.06);display:flex;align-items:center;gap:16px;';

    // Left: info
    var info = document.createElement('div');
    info.style.flex = '1';

    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;';

    var title = document.createElement('strong');
    title.style.fontSize = '14px';
    title.textContent = c.title || '(Başlıksız taslak)';
    titleRow.appendChild(title);

    var typeBadge = document.createElement('span');
    typeBadge.style.cssText = 'font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg);color:var(--muted);font-weight:600;';
    typeBadge.textContent = TYPE_MAP[c.campaign_type] || c.campaign_type;
    titleRow.appendChild(typeBadge);

    var statusInfo = STATUS_MAP[c.status] || [c.status, 'draft'];
    var pill = document.createElement('span');
    pill.style.cssText = 'font-size:10px;padding:2px 8px;border-radius:12px;font-weight:700;margin-left:auto;';
    var pillColors = {
      draft:'background:#F3F4F6;color:#6B7280;', pending:'background:#FEF3C7;color:#92400E;',
      approved:'background:#D1FAE5;color:#065F46;', active:'background:#DBEAFE;color:#1E40AF;',
      rejected:'background:#FEE2E2;color:#991B1B;', revision:'background:#FED7AA;color:#9A3412;',
      ended:'background:#E5E7EB;color:#4B5563;', archived:'background:#F3F4F6;color:#9CA3AF;',
      paused:'background:#FCE7F3;color:#9D174D;'
    };
    pill.style.cssText += (pillColors[statusInfo[1]] || '');
    pill.textContent = statusInfo[0];
    titleRow.appendChild(pill);

    info.appendChild(titleRow);

    // Meta row
    var meta = document.createElement('div');
    meta.style.cssText = 'font-size:12px;color:var(--muted);display:flex;gap:16px;';

    if (c.start_date || c.end_date) {
      var dateSpan = document.createElement('span');
      var startStr = c.start_date ? new Date(c.start_date).toLocaleDateString('tr-TR') : '?';
      var endStr = c.end_date ? new Date(c.end_date).toLocaleDateString('tr-TR') : '?';
      dateSpan.textContent = startStr + ' — ' + endStr;
      meta.appendChild(dateSpan);
    }

    if (c.status === 'active' && (c.impression_count > 0 || c.click_count > 0)) {
      var statsSpan = document.createElement('span');
      statsSpan.textContent = c.impression_count + ' görüntülenme · ' + c.click_count + ' tıklama';
      meta.appendChild(statsSpan);
    }

    info.appendChild(meta);
    card.appendChild(info);

    // Right: actions
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

    if (c.status === 'draft' || c.status === 'revision_needed') {
      var editBtn = document.createElement('button');
      editBtn.style.cssText = 'padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;';
      editBtn.textContent = 'Düzenle';
      editBtn.addEventListener('click', (function(id){ return function(){ window._htEditCampaign(id); }; })(c.id));
      actions.appendChild(editBtn);
    }

    if (c.status === 'draft') {
      var delBtn = document.createElement('button');
      delBtn.style.cssText = 'padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--red);background:var(--white);color:var(--red);font-family:inherit;';
      delBtn.textContent = 'Sil';
      delBtn.addEventListener('click', (function(id){ return function(){ window._htDeleteCampaign(id); }; })(c.id));
      actions.appendChild(delBtn);
    }

    card.appendChild(actions);
    return card;
  }

  /* ── DELETE CAMPAIGN ── */
  window._htDeleteCampaign = async function(id) {
    if (!confirm('Bu taslak kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      var s = getSupa();
      var res = await s.from('campaigns').delete().eq('id', id).eq('status', 'draft');
      if (res.error) { alert('Hata: ' + res.error.message); return; }
      window._htLoadCampaigns();
    } catch(e) { alert('Hata: ' + e.message); }
  };

  /* ═══════════════════════════════════════════════════════════════
     CAMPAIGN WIZARD
     ═══════════════════════════════════════════════════════════════ */
  function showWizard() {
    var listEl = document.getElementById('campaign-list');
    var wizardEl = document.getElementById('campaign-wizard');
    var newBtn = document.getElementById('btn-new-campaign');
    if (listEl) listEl.style.display = 'none';
    if (newBtn) newBtn.style.display = 'none';
    if (wizardEl) wizardEl.style.display = 'block';
    currentStep = 1;
    renderWizard();
  }

  function hideWizard() {
    var listEl = document.getElementById('campaign-list');
    var wizardEl = document.getElementById('campaign-wizard');
    var newBtn = document.getElementById('btn-new-campaign');
    if (listEl) listEl.style.display = '';
    if (newBtn) newBtn.style.display = '';
    if (wizardEl) wizardEl.style.display = 'none';
    currentCampaignId = null;
    wizardData = {};
    window._htLoadCampaigns();
  }

  /* ── RENDER WIZARD ── */
  function renderWizard() {
    var wizardEl = document.getElementById('campaign-wizard');
    if (!wizardEl) return;

    while (wizardEl.firstChild) wizardEl.removeChild(wizardEl.firstChild);

    // Progress bar
    var progress = document.createElement('div');
    progress.style.cssText = 'display:flex;gap:4px;margin-bottom:28px;';
    var stepLabels = ['Tür', 'İçerik', 'Hedef Kitle', 'Zamanlama', 'Paket', 'Önizleme'];
    for (var i = 0; i < TOTAL_STEPS; i++) {
      var step = document.createElement('div');
      step.style.cssText = 'flex:1;text-align:center;';

      var bar = document.createElement('div');
      bar.style.cssText = 'height:4px;border-radius:2px;margin-bottom:6px;';
      bar.style.background = (i + 1 <= currentStep) ? 'var(--verm)' : 'var(--border)';
      step.appendChild(bar);

      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:10px;font-weight:600;color:' + ((i + 1 === currentStep) ? 'var(--verm)' : 'var(--muted)') + ';';
      lbl.textContent = stepLabels[i];
      step.appendChild(lbl);

      progress.appendChild(step);
    }
    wizardEl.appendChild(progress);

    // Content container
    var content = document.createElement('div');
    content.style.cssText = 'background:var(--white);border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);';

    switch(currentStep) {
      case 1: renderStep1(content); break;
      case 2: renderStep2(content); break;
      case 3: renderStep3(content); break;
      case 4: renderStep4(content); break;
      case 5: renderStep5(content); break;
      case 6: renderStep6(content); break;
    }

    wizardEl.appendChild(content);

    // Bottom nav
    var nav = document.createElement('div');
    nav.style.cssText = 'display:flex;justify-content:space-between;margin-top:20px;';

    var leftBtns = document.createElement('div');
    if (currentStep > 1) {
      var backBtn = createBtn('Geri', 'secondary');
      backBtn.addEventListener('click', function(){ currentStep--; renderWizard(); });
      leftBtns.appendChild(backBtn);
    }
    var cancelBtn = createBtn('Vazgeç', 'secondary');
    cancelBtn.style.marginLeft = '8px';
    cancelBtn.addEventListener('click', function(){ if(confirm('Wizard\'dan çıkmak istediğinize emin misiniz?')) hideWizard(); });
    leftBtns.appendChild(cancelBtn);
    nav.appendChild(leftBtns);

    var rightBtns = document.createElement('div');
    rightBtns.style.cssText = 'display:flex;gap:8px;';

    if (currentStep < TOTAL_STEPS) {
      var nextBtn = createBtn('Devam', 'primary');
      nextBtn.addEventListener('click', async function(){
        if (!validateStep(currentStep)) return;
        /* Auto-create draft on Step 1→2 transition for image upload path */
        if (currentStep === 1 && !currentCampaignId) {
          try {
            var s = getSupa();
            if (!s) { alert('Supabase bağlantısı yok'); return; }
            var sessRes = await s.auth.getSession();
            var uid = sessRes.data && sessRes.data.session ? sessRes.data.session.user.id : null;
            if (!uid) { alert('Oturum bulunamadı'); return; }
            var ins = await s.from('campaigns')
              .insert({ company_id: hrProfile.company_id, created_by: uid, campaign_type: wizardData.campaign_type, status: 'draft' })
              .select('id')
              .maybeSingle();
            if (ins.error) { console.error('Auto-draft error:', ins.error); alert('Taslak oluşturulamadı: ' + ins.error.message); return; }
            currentCampaignId = ins.data.id;
          } catch(e) { console.error('Auto-draft exception:', e); alert('Hata: ' + e.message); return; }
        }
        currentStep++;
        renderWizard();
      });
      rightBtns.appendChild(nextBtn);
    }
    if (currentStep === TOTAL_STEPS) {
      var draftBtn = createBtn('Taslak Kaydet', 'secondary');
      draftBtn.addEventListener('click', function(){ saveCampaign('draft'); });
      rightBtns.appendChild(draftBtn);

      var submitBtn = createBtn('Gönder', 'primary');
      submitBtn.addEventListener('click', function(){ saveCampaign('pending_review'); });
      rightBtns.appendChild(submitBtn);
    }
    nav.appendChild(rightBtns);
    wizardEl.appendChild(nav);
  }

  function createBtn(text, type) {
    var btn = document.createElement('button');
    btn.style.cssText = 'padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:1.5px solid;';
    if (type === 'primary') {
      btn.style.cssText += 'background:var(--verm);color:white;border-color:var(--verm);';
    } else {
      btn.style.cssText += 'background:var(--white);color:var(--text);border-color:var(--border);';
    }
    btn.textContent = text;
    return btn;
  }

  /* ── STEP 1: KAMPANYA TÜRÜ ── */
  function renderStep1(container) {
    var h = document.createElement('h3');
    h.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin-bottom:16px;';
    h.textContent = 'Kampanya Türü Seçin';
    container.appendChild(h);

    /* FAZ C: hiring_boost kaldirildi (is ilani yasak). store_opening +
     * brand_story eklendi. İkon/emoji kullanilmaz — Tuna design kurali. */
    var types = [
      { key:'offer', label:'Özel Teklif', desc:'İndirim, promosyon kodu veya özel fırsat sunun' },
      { key:'employer_branding', label:'İşveren Markası', desc:'Şirket kültürünüzü ve değerlerinizi tanıtın' },
      { key:'store_opening', label:'Yeni Mağaza', desc:'Yeni mağaza açılışı veya lokasyon duyurusu' },
      { key:'brand_story', label:'Marka Haberi', desc:'Adaylara markayı hatırlatın, takipçi kazanın' }
    ];

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;';

    for (var i = 0; i < types.length; i++) {
      (function(t) {
        var card = document.createElement('div');
        card.style.cssText = 'border:2px solid var(--border);border-radius:12px;padding:24px 16px;text-align:center;cursor:pointer;transition:all 0.15s;';
        if (wizardData.campaign_type === t.key) card.style.borderColor = 'var(--verm)';
        card.addEventListener('click', function() {
          wizardData.campaign_type = t.key;
          renderWizard();
        });
        card.addEventListener('mouseover', function(){ if(wizardData.campaign_type !== t.key) card.style.borderColor='var(--navy)'; });
        card.addEventListener('mouseout', function(){ if(wizardData.campaign_type !== t.key) card.style.borderColor='var(--border)'; });

        /* FAZ C: icon div kaldirildi (emoji yasak). Card simdi sadece
         * typography-led — label + desc. */
        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-weight:700;font-size:15px;margin-bottom:6px;';
        lbl.textContent = t.label;
        card.appendChild(lbl);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:12px;color:var(--muted);';
        desc.textContent = t.desc;
        card.appendChild(desc);

        grid.appendChild(card);
      })(types[i]);
    }
    container.appendChild(grid);
  }

  /* ── STEP 2: İÇERİK ── */
  function renderStep2(container) {
    var h = document.createElement('h3');
    h.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin-bottom:16px;';
    h.textContent = 'Kampanya İçeriği';
    container.appendChild(h);

    container.appendChild(makeField('text', 'title', 'Başlık *', 80, 'Kampanya başlığı', wizardData.title || ''));
    container.appendChild(makeField('textarea', 'short_desc', 'Kısa Açıklama *', 160, 'Feed\'de görünecek kısa açıklama', wizardData.short_desc || ''));
    container.appendChild(makeField('textarea', 'full_desc', 'Detaylı Açıklama', 2000, 'Opsiyonel — kampanya detayları', wizardData.full_desc || ''));
    container.appendChild(makeField('text', 'cta_label', 'Buton Metni', 30, 'Detayları Gör', wizardData.cta_label || 'Detayları Gör'));
    container.appendChild(makeField('url', 'cta_url', 'Buton Linki *', 500, 'https://...', wizardData.cta_url || ''));

    if (wizardData.campaign_type === 'offer') {
      container.appendChild(makeField('text', 'promo_code', 'Promosyon Kodu', 50, 'Opsiyonel — HELLOTALENT20', wizardData.promo_code || ''));
    }

    /* ── COVER IMAGE UPLOAD ZONE ── */
    container.appendChild(buildImageUploadZone());
  }

  /* ── STEP 3: HEDEF KİTLE ── */
  function renderStep3(container) {
    var h = document.createElement('h3');
    h.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin-bottom:16px;';
    h.textContent = 'Hedef Kitle';
    container.appendChild(h);

    // Distribution mode
    container.appendChild(makeRadioGroup('distribution_mode', 'Dağıtım Modu', DIST_MAP, wizardData.distribution_mode || 'followers_only'));

    // Access mode
    container.appendChild(makeRadioGroup('access_mode', 'Erişim Modu', ACCESS_MAP, wizardData.access_mode || 'public_all'));

    // Segment filter
    var segGroup = document.createElement('div');
    segGroup.style.marginTop = '20px';
    var segLabel = document.createElement('div');
    segLabel.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:8px;';
    segLabel.textContent = 'Segment Filtresi (opsiyonel)';
    segGroup.appendChild(segLabel);
    var segGrid = document.createElement('div');
    segGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    for (var i = 0; i < SEGMENT_KEYS.length; i++) {
      (function(key) {
        var selected = wizardData.target_segments && wizardData.target_segments.indexOf(key) > -1;
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid;font-family:inherit;';
        chip.style.cssText += selected ? 'background:var(--navy);color:white;border-color:var(--navy);' : 'background:var(--white);color:var(--text);border-color:var(--border);';
        chip.textContent = SEGMENT_MAP[key];
        chip.addEventListener('click', function() {
          if (!wizardData.target_segments) wizardData.target_segments = [];
          var idx = wizardData.target_segments.indexOf(key);
          if (idx > -1) wizardData.target_segments.splice(idx, 1);
          else wizardData.target_segments.push(key);
          renderWizard();
        });
        segGrid.appendChild(chip);
      })(SEGMENT_KEYS[i]);
    }
    segGroup.appendChild(segGrid);
    container.appendChild(segGroup);

    // Seniority filter
    var senGroup = document.createElement('div');
    senGroup.style.marginTop = '20px';
    var senLabel = document.createElement('div');
    senLabel.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:8px;';
    senLabel.textContent = 'Kıdem Filtresi (opsiyonel)';
    senGroup.appendChild(senLabel);
    var senGrid = document.createElement('div');
    senGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    var senKeys = Object.keys(SENIORITY_MAP);
    for (var s = 0; s < senKeys.length; s++) {
      (function(key) {
        var selected = wizardData.target_seniority && wizardData.target_seniority.indexOf(key) > -1;
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid;font-family:inherit;';
        chip.style.cssText += selected ? 'background:var(--navy);color:white;border-color:var(--navy);' : 'background:var(--white);color:var(--text);border-color:var(--border);';
        chip.textContent = SENIORITY_MAP[key];
        chip.addEventListener('click', function() {
          if (!wizardData.target_seniority) wizardData.target_seniority = [];
          var idx = wizardData.target_seniority.indexOf(key);
          if (idx > -1) wizardData.target_seniority.splice(idx, 1);
          else wizardData.target_seniority.push(key);
          renderWizard();
        });
        senGrid.appendChild(chip);
      })(senKeys[s]);
    }
    senGroup.appendChild(senGrid);
    container.appendChild(senGroup);
  }

  /* ── STEP 4: ZAMANLAMA ── */
  function renderStep4(container) {
    var h = document.createElement('h3');
    h.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin-bottom:16px;';
    h.textContent = 'Zamanlama';
    container.appendChild(h);

    var today = new Date().toISOString().split('T')[0];

    container.appendChild(makeDateField('start_date', 'Başlangıç Tarihi *', today, wizardData.start_date || ''));
    container.appendChild(makeDateField('end_date', 'Bitiş Tarihi *', today, wizardData.end_date || ''));

    // Duration preview
    if (wizardData.start_date && wizardData.end_date) {
      var start = new Date(wizardData.start_date);
      var end = new Date(wizardData.end_date);
      var days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        var preview = document.createElement('div');
        preview.style.cssText = 'margin-top:16px;padding:12px 16px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--navy);font-weight:600;';
        preview.textContent = 'Bu kampanya ' + days + ' gün sürecek';
        container.appendChild(preview);
      }
    }
  }

  /* ── STEP 5: PAKET SEÇİMİ ── */
  function renderStep5(container) {
    var h = document.createElement('h3');
    h.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin-bottom:16px;';
    h.textContent = 'Paket Seçimi';
    container.appendChild(h);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;';

    var pkgKeys = ['basic', 'boost', 'premium'];
    for (var i = 0; i < pkgKeys.length; i++) {
      (function(key) {
        var pkg = PKG_MAP[key];
        var card = document.createElement('div');
        card.style.cssText = 'border:2px solid var(--border);border-radius:12px;padding:24px 16px;text-align:center;cursor:pointer;transition:all 0.15s;';
        if (wizardData.package === key) card.style.borderColor = 'var(--verm)';

        card.addEventListener('click', function() {
          wizardData.package = key;
          wizardData.delivery_channels = pkg.channels;
          renderWizard();
        });

        var lbl = document.createElement('div');
        lbl.style.cssText = 'font-weight:800;font-size:16px;margin-bottom:4px;';
        lbl.textContent = pkg.label;
        card.appendChild(lbl);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:12px;color:var(--muted);margin-bottom:12px;';
        desc.textContent = pkg.desc;
        card.appendChild(desc);

        // Channel chips
        for (var ch = 0; ch < pkg.channels.length; ch++) {
          var chip = document.createElement('span');
          chip.style.cssText = 'display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:var(--bg);color:var(--navy);margin:2px;';
          chip.textContent = pkg.channels[ch];
          card.appendChild(chip);
        }

        grid.appendChild(card);
      })(pkgKeys[i]);
    }
    container.appendChild(grid);
  }

  /* ── STEP 6: ÖNİZLEME ── */
  function renderStep6(container) {
    var h = document.createElement('h3');
    h.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:18px;margin-bottom:16px;';
    h.textContent = 'Önizleme ve Gönder';
    container.appendChild(h);

    /* Cover image preview at top */
    if (wizardData.cover_image_url) {
      var imgPreview = document.createElement('div');
      imgPreview.style.cssText = 'margin-bottom:20px;border-radius:10px;overflow:hidden;border:1.5px solid var(--border);';
      var prevImg = document.createElement('img');
      prevImg.src = wizardData.cover_image_url;
      prevImg.alt = 'Kapak görseli';
      prevImg.style.cssText = 'display:block;width:100%;max-height:280px;object-fit:cover;';
      imgPreview.appendChild(prevImg);
      container.appendChild(imgPreview);
    }

    var rows = [
      ['Tür', TYPE_MAP[wizardData.campaign_type] || '-'],
      ['Başlık', wizardData.title || '-'],
      ['Kısa Açıklama', wizardData.short_desc || '-'],
      ['Kapak Görseli', wizardData.cover_image_url ? '✓ Yüklendi' : '✗ Yüklenmedi'],
      ['Buton', (wizardData.cta_label || 'Detayları Gör') + ' → ' + (wizardData.cta_url || '-')],
      ['Dağıtım', DIST_MAP[wizardData.distribution_mode] ? DIST_MAP[wizardData.distribution_mode].label : '-'],
      ['Erişim', ACCESS_MAP[wizardData.access_mode] ? ACCESS_MAP[wizardData.access_mode].label : '-'],
      ['Tarih', (wizardData.start_date || '?') + ' — ' + (wizardData.end_date || '?')],
      ['Paket', PKG_MAP[wizardData.package] ? PKG_MAP[wizardData.package].label : '-']
    ];

    if (wizardData.promo_code) rows.splice(3, 0, ['Promosyon Kodu', wizardData.promo_code]);

    if (wizardData.target_segments && wizardData.target_segments.length > 0) {
      rows.push(['Segmentler', wizardData.target_segments.map(function(k){ return SEGMENT_MAP[k]; }).join(', ')]);
    }
    if (wizardData.target_seniority && wizardData.target_seniority.length > 0) {
      rows.push(['Kıdem', wizardData.target_seniority.map(function(k){ return SENIORITY_MAP[k]; }).join(', ')]);
    }

    var table = document.createElement('div');
    table.style.cssText = 'display:grid;grid-template-columns:140px 1fr;gap:1px;background:var(--border);border-radius:8px;overflow:hidden;';

    for (var i = 0; i < rows.length; i++) {
      var lbl = document.createElement('div');
      lbl.style.cssText = 'padding:10px 14px;background:#FAFAF8;font-size:12px;font-weight:600;color:var(--muted);';
      lbl.textContent = rows[i][0];
      table.appendChild(lbl);

      var val = document.createElement('div');
      val.style.cssText = 'padding:10px 14px;background:var(--white);font-size:13px;';
      val.textContent = rows[i][1];
      table.appendChild(val);
    }
    container.appendChild(table);
  }

  /* ═══════════════════════════════════════════════════════════════
     IMAGE UPLOAD
     ═══════════════════════════════════════════════════════════════ */
  var ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var MAX_IMG_SIZE = 2 * 1024 * 1024; // 2MB
  var uploadingImage = false;

  function buildImageUploadZone() {
    var wrap = document.createElement('div');
    wrap.style.marginTop = '20px';

    var lbl = document.createElement('label');
    lbl.style.cssText = 'display:block;font-size:12px;font-weight:600;margin-bottom:5px;';
    lbl.textContent = 'Kapak Görseli *';
    wrap.appendChild(lbl);

    var hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:8px;';
    hint.textContent = 'JPG, PNG veya WebP · Maks 2MB · Önerilen boyut: 1200×628px';
    wrap.appendChild(hint);

    /* If already uploaded, show preview */
    if (wizardData.cover_image_url) {
      var previewWrap = document.createElement('div');
      previewWrap.style.cssText = 'position:relative;display:inline-block;border-radius:10px;overflow:hidden;border:1.5px solid var(--border);';

      var img = document.createElement('img');
      img.src = wizardData.cover_image_url;
      img.style.cssText = 'display:block;max-width:100%;max-height:240px;border-radius:10px;object-fit:cover;';
      img.alt = 'Kapak görseli';
      previewWrap.appendChild(img);

      /* Dimension info if available */
      if (wizardData._coverImgW && wizardData._coverImgH) {
        var dimBadge = document.createElement('div');
        dimBadge.style.cssText = 'position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:2px 8px;border-radius:4px;font-family:"DM Mono",monospace;';
        dimBadge.textContent = wizardData._coverImgW + '×' + wizardData._coverImgH;
        previewWrap.appendChild(dimBadge);
      }

      wrap.appendChild(previewWrap);

      /* Change / remove buttons */
      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

      var changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.style.cssText = 'padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid var(--border);background:var(--white);color:var(--text);font-family:inherit;';
      changeBtn.textContent = 'Değiştir';
      changeBtn.addEventListener('click', function() { triggerFileInput(); });
      btnRow.appendChild(changeBtn);

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.style.cssText = 'padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid var(--red,#DC2626);background:var(--white);color:var(--red,#DC2626);font-family:inherit;';
      removeBtn.textContent = 'Kaldır';
      removeBtn.addEventListener('click', function() {
        wizardData.cover_image_url = null;
        wizardData._coverImgW = null;
        wizardData._coverImgH = null;
        renderWizard();
      });
      btnRow.appendChild(removeBtn);

      wrap.appendChild(btnRow);
      return wrap;
    }

    /* Drop zone */
    var zone = document.createElement('div');
    zone.id = 'cover-drop-zone';
    zone.style.cssText = 'border:2px dashed var(--border);border-radius:12px;padding:40px 20px;text-align:center;cursor:pointer;transition:all 0.15s;background:var(--bg);';

    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:36px;margin-bottom:8px;opacity:0.4;';
    icon.textContent = '🖼️';
    zone.appendChild(icon);

    var mainText = document.createElement('div');
    mainText.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:4px;';
    mainText.textContent = 'Görseli buraya sürükleyin';
    zone.appendChild(mainText);

    var subText = document.createElement('div');
    subText.style.cssText = 'font-size:12px;color:var(--muted);';
    subText.textContent = 'veya tıklayarak seçin';
    zone.appendChild(subText);

    /* Upload progress (hidden by default) */
    var progressBar = document.createElement('div');
    progressBar.id = 'cover-upload-progress';
    progressBar.style.cssText = 'display:none;margin-top:12px;height:4px;border-radius:2px;background:var(--border);overflow:hidden;';
    var progressFill = document.createElement('div');
    progressFill.style.cssText = 'height:100%;background:var(--verm);width:0%;transition:width 0.3s;border-radius:2px;';
    progressBar.appendChild(progressFill);
    zone.appendChild(progressBar);

    /* Upload status text */
    var statusText = document.createElement('div');
    statusText.id = 'cover-upload-status';
    statusText.style.cssText = 'display:none;font-size:12px;margin-top:8px;color:var(--muted);';
    zone.appendChild(statusText);

    /* Drag events */
    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = 'var(--verm)';
      zone.style.background = '#FEF7F5';
    });
    zone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = 'var(--border)';
      zone.style.background = 'var(--bg)';
    });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      zone.style.borderColor = 'var(--border)';
      zone.style.background = 'var(--bg)';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });
    zone.addEventListener('click', function() { triggerFileInput(); });

    wrap.appendChild(zone);
    return wrap;
  }

  /* Hidden file input — shared */
  var _fileInput = null;
  function triggerFileInput() {
    if (!_fileInput) {
      _fileInput = document.createElement('input');
      _fileInput.type = 'file';
      _fileInput.accept = 'image/jpeg,image/png,image/webp';
      _fileInput.style.display = 'none';
      document.body.appendChild(_fileInput);
      _fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) handleImageFile(this.files[0]);
        this.value = ''; // allow re-select same file
      });
    }
    _fileInput.click();
  }

  /* Validate + upload image file */
  async function handleImageFile(file) {
    if (uploadingImage) return;

    /* Type check */
    if (ALLOWED_IMG_TYPES.indexOf(file.type) === -1) {
      alert('Geçersiz dosya türü. Sadece JPG, PNG veya WebP yükleyebilirsiniz.');
      return;
    }

    /* Size check */
    if (file.size > MAX_IMG_SIZE) {
      alert('Dosya çok büyük. Maksimum 2MB yükleyebilirsiniz. (' + (file.size / (1024*1024)).toFixed(1) + 'MB)');
      return;
    }

    /* Dimension check via Image object */
    try {
      var dims = await getImageDimensions(file);
      if (dims.w < 600 || dims.h < 314) {
        alert('Görsel çok küçük. Minimum boyut: 600×314px. Yüklediğiniz: ' + dims.w + '×' + dims.h + 'px');
        return;
      }
      if (dims.w !== 1200 || dims.h !== 628) {
        /* Not blocking, just warn if ratio is very off */
        var ratio = dims.w / dims.h;
        if (ratio < 1.5 || ratio > 2.3) {
          if (!confirm('Önerilen oran 1200×628 (≈1.91). Yüklediğiniz: ' + dims.w + '×' + dims.h + ' (oran: ' + ratio.toFixed(2) + '). Devam etmek istiyor musunuz?')) return;
        }
      }
      wizardData._coverImgW = dims.w;
      wizardData._coverImgH = dims.h;
    } catch(e) {
      console.error('Dimension check failed:', e);
      /* Continue anyway — dimension check is advisory */
    }

    /* Need campaign_id for storage path */
    if (!currentCampaignId) {
      alert('Kampanya taslağı henüz oluşturulmadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    uploadingImage = true;
    showUploadProgress(true, 'Yükleniyor...');

    try {
      var s = getSupa();
      if (!s) { alert('Supabase bağlantısı yok'); uploadingImage = false; showUploadProgress(false); return; }

      var ext = file.name.split('.').pop().toLowerCase();
      if (['jpg','jpeg'].indexOf(ext) > -1) ext = 'jpg';
      var storagePath = hrProfile.company_id + '/' + currentCampaignId + '/' + Date.now() + '_cover.' + ext;

      showUploadProgress(true, 'Yükleniyor...', 30);

      /* Upload to Supabase Storage */
      var upRes = await s.storage.from('campaign-assets').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

      if (upRes.error) {
        alert('Yükleme hatası: ' + upRes.error.message);
        uploadingImage = false;
        showUploadProgress(false);
        return;
      }

      showUploadProgress(true, 'İşleniyor...', 70);

      /* Get public URL */
      var urlRes = s.storage.from('campaign-assets').getPublicUrl(storagePath);
      var publicUrl = urlRes.data ? urlRes.data.publicUrl : null;

      if (!publicUrl) {
        alert('Görsel URL\'si alınamadı');
        uploadingImage = false;
        showUploadProgress(false);
        return;
      }

      showUploadProgress(true, 'Kaydediliyor...', 90);

      /* Update campaign row with cover_image_url */
      var updRes = await s.from('campaigns')
        .update({ cover_image_url: publicUrl })
        .eq('id', currentCampaignId);

      if (updRes.error) {
        console.error('Cover image DB update error:', updRes.error);
        /* Non-blocking — URL is still valid, save in wizardData */
      }

      wizardData.cover_image_url = publicUrl;
      showUploadProgress(true, 'Tamamlandı!', 100);

      /* Re-render after brief delay to show completion */
      setTimeout(function() {
        uploadingImage = false;
        renderWizard();
      }, 500);

    } catch(e) {
      console.error('Image upload exception:', e);
      alert('Yükleme hatası: ' + e.message);
      uploadingImage = false;
      showUploadProgress(false);
    }
  }

  function getImageDimensions(file) {
    return new Promise(function(resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });
  }

  function showUploadProgress(show, text, pct) {
    var bar = document.getElementById('cover-upload-progress');
    var status = document.getElementById('cover-upload-status');
    if (bar) {
      bar.style.display = show ? 'block' : 'none';
      if (bar.firstChild && typeof pct === 'number') bar.firstChild.style.width = pct + '%';
    }
    if (status) {
      status.style.display = show && text ? 'block' : 'none';
      if (text) status.textContent = text;
    }
  }

  /* ── FIELD HELPERS ── */
  function makeField(type, name, label, maxLen, placeholder, value) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '16px';

    var lbl = document.createElement('label');
    lbl.style.cssText = 'display:block;font-size:12px;font-weight:600;margin-bottom:5px;';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    var input;
    if (type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = type;
    }
    input.style.cssText = 'width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;';
    input.maxLength = maxLen;
    input.placeholder = placeholder;
    input.value = value;
    input.addEventListener('input', function() { wizardData[name] = this.value; });
    wrap.appendChild(input);

    return wrap;
  }

  function makeDateField(name, label, min, value) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:inline-block;width:48%;margin-right:2%;margin-bottom:16px;';

    var lbl = document.createElement('label');
    lbl.style.cssText = 'display:block;font-size:12px;font-weight:600;margin-bottom:5px;';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    var input = document.createElement('input');
    input.type = 'date';
    input.min = min;
    input.value = value;
    input.style.cssText = 'width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;';
    input.addEventListener('change', function() { wizardData[name] = this.value; });
    wrap.appendChild(input);

    return wrap;
  }

  function makeRadioGroup(name, label, optMap, currentVal) {
    var wrap = document.createElement('div');
    wrap.style.marginBottom = '20px';

    var lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:12px;font-weight:600;margin-bottom:8px;';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';

    var keys = Object.keys(optMap);
    for (var i = 0; i < keys.length; i++) {
      (function(key) {
        var opt = optMap[key];
        var card = document.createElement('div');
        card.style.cssText = 'border:2px solid var(--border);border-radius:10px;padding:14px 12px;cursor:pointer;transition:all 0.15s;';
        if (currentVal === key) card.style.borderColor = 'var(--verm)';

        card.addEventListener('click', function() {
          wizardData[name] = key;
          renderWizard();
        });

        var optLbl = document.createElement('div');
        optLbl.style.cssText = 'font-weight:600;font-size:13px;margin-bottom:4px;';
        optLbl.textContent = opt.label;
        card.appendChild(optLbl);

        var optDesc = document.createElement('div');
        optDesc.style.cssText = 'font-size:11px;color:var(--muted);';
        optDesc.textContent = opt.desc;
        card.appendChild(optDesc);

        grid.appendChild(card);
      })(keys[i]);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /* ── VALIDATION ── */
  function validateStep(step) {
    switch(step) {
      case 1:
        if (!wizardData.campaign_type) { alert('Lütfen bir kampanya türü seçin'); return false; }
        return true;
      case 2:
        if (!wizardData.title || wizardData.title.trim().length === 0) { alert('Başlık zorunludur'); return false; }
        if (!wizardData.short_desc || wizardData.short_desc.trim().length === 0) { alert('Kısa açıklama zorunludur'); return false; }
        if (!wizardData.cta_url || wizardData.cta_url.trim().length === 0) { alert('Buton linki zorunludur'); return false; }
        return true;
      case 3:
        return true; // targeting is optional
      case 4:
        if (!wizardData.start_date) { alert('Başlangıç tarihi zorunludur'); return false; }
        if (!wizardData.end_date) { alert('Bitiş tarihi zorunludur'); return false; }
        if (wizardData.end_date <= wizardData.start_date) { alert('Bitiş tarihi başlangıçtan sonra olmalıdır'); return false; }
        return true;
      case 5:
        if (!wizardData.package) { alert('Lütfen bir paket seçin'); return false; }
        return true;
      default:
        return true;
    }
  }

  /* ── SAVE CAMPAIGN ── */
  async function saveCampaign(targetStatus) {
    if (!validateStep(1) || !validateStep(2) || !validateStep(4) || !validateStep(5)) return;

    var s = getSupa();
    if (!s) { alert('Supabase bağlantısı yok'); return; }

    var sessionRes = await s.auth.getSession();
    var userId = sessionRes.data?.session?.user?.id;
    if (!userId) { alert('Oturum bulunamadı'); return; }

    var payload = {
      company_id: hrProfile.company_id,
      brand_id: hrProfile.brand_id || null,
      created_by: userId,
      campaign_type: wizardData.campaign_type,
      title: wizardData.title.trim(),
      short_desc: wizardData.short_desc.trim(),
      full_desc: wizardData.full_desc ? wizardData.full_desc.trim() : null,
      cta_label: wizardData.cta_label || 'Detayları Gör',
      cta_url: wizardData.cta_url.trim(),
      promo_code: wizardData.promo_code || null,
      distribution_mode: wizardData.distribution_mode || 'followers_only',
      access_mode: wizardData.access_mode || 'public_all',
      target_segments: (wizardData.target_segments && wizardData.target_segments.length > 0) ? wizardData.target_segments : null,
      target_seniority: (wizardData.target_seniority && wizardData.target_seniority.length > 0) ? wizardData.target_seniority : null,
      start_date: wizardData.start_date ? new Date(wizardData.start_date).toISOString() : null,
      end_date: wizardData.end_date ? new Date(wizardData.end_date).toISOString() : null,
      cover_image_url: wizardData.cover_image_url || null,
      package: wizardData.package,
      delivery_channels: wizardData.delivery_channels || ['feed'],
      status: targetStatus
    };

    if (targetStatus === 'pending_review') {
      payload.submitted_at = new Date().toISOString();
    }

    try {
      var res;
      if (currentCampaignId) {
        res = await s.from('campaigns').update(payload).eq('id', currentCampaignId).select('id').maybeSingle();
      } else {
        res = await s.from('campaigns').insert(payload).select('id').maybeSingle();
      }

      if (res.error) { alert('Hata: ' + res.error.message); return; }

      /* K049 R2 discipline — fallback INSERT branch'te ID'yi closure'a yakala.
       * Auto-draft step1→2 normalde currentCampaignId'yi set eder, ama save button
       * re-click + error-then-retry senaryosunda currentCampaignId null kalirsa
       * tekrar INSERT → duplicate row. Yakalama hideWizard reset'inden once yapilir. */
      if (!currentCampaignId && res.data && res.data.id) {
        currentCampaignId = res.data.id;
      }

      var msg = targetStatus === 'pending_review' ? 'Kampanya gönderildi! Admin onayı bekleniyor.' : 'Taslak kaydedildi.';
      alert(msg);
      hideWizard();
    } catch(e) {
      alert('Hata: ' + e.message);
    }
  }

  /* ── EDIT CAMPAIGN ── */
  window._htEditCampaign = async function(id) {
    var s = getSupa();
    if (!s) return;

    try {
      var res = await s.from('campaigns').select('*').eq('id', id).maybeSingle();
      if (res.error || !res.data) { alert('Kampanya bulunamadı'); return; }

      currentCampaignId = id;
      var c = res.data;
      wizardData = {
        campaign_type: c.campaign_type,
        title: c.title,
        short_desc: c.short_desc,
        full_desc: c.full_desc,
        cta_label: c.cta_label,
        cta_url: c.cta_url,
        promo_code: c.promo_code,
        cover_image_url: c.cover_image_url || null,
        distribution_mode: c.distribution_mode,
        access_mode: c.access_mode,
        target_segments: c.target_segments,
        target_seniority: c.target_seniority,
        start_date: c.start_date ? c.start_date.split('T')[0] : '',
        end_date: c.end_date ? c.end_date.split('T')[0] : '',
        package: c.package,
        delivery_channels: c.delivery_channels
      };
      showWizard();
    } catch(e) {
      alert('Hata: ' + e.message);
    }
  };

  /* ── INIT: Wire up button + panel switch ── */
  document.addEventListener('DOMContentLoaded', function() {
    var newBtn = document.getElementById('btn-new-campaign');
    if (newBtn) {
      newBtn.addEventListener('click', function() {
        currentCampaignId = null;
        wizardData = {};
        showWizard();
      });
    }
  });

  // Hook into panel switching to load campaigns
  var origSwitch = window.switchPanel;
  if (origSwitch) {
    window.switchPanel = function(name, el) {
      origSwitch(name, el);
      if (name === 'kampanyalar') window._htLoadCampaigns();
    };
  }

})();
