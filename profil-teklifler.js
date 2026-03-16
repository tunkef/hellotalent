/* ═══════════════════════════════════════════════════════════════
   HELLOTALENT — PROFİL TEKLİFLER JS
   Aday kampanya feed'i: liste, filtre, impression/click tracking
   Depends on: profil-core.js (supabase), profil-ui.js (_ht_candidate_id)
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var loaded = false;
  var allCampaigns = [];
  var currentFilter = 'all';
  var observedCards = new Set();

  /* ── TYPE LABELS & COLORS ── */
  var TYPE_MAP = {
    offer: { label:'Teklif', color:'#059669', bg:'#ECFDF5' },
    employer_branding: { label:'İşveren Markası', color:'#1E2D5E', bg:'#EEF2FF' },
    hiring_boost: { label:'İşe Alım', color:'#C94E28', bg:'#FEF7F5' }
  };

  /* ── FILTER OPTIONS ── */
  var FILTERS = [
    { key:'all', label:'Tümü' },
    { key:'offer', label:'Teklifler' },
    { key:'employer_branding', label:'İşveren Markası' },
    { key:'hiring_boost', label:'İşe Alım' }
  ];

  /* ═══════════════════════════════════════════════════════════════
     LOAD CAMPAIGNS
     ═══════════════════════════════════════════════════════════════ */
  window._htLoadTeklifler = async function() {
    var gridEl = document.getElementById('teklifler-grid');
    var emptyEl = document.getElementById('teklifler-empty');
    var filtersEl = document.getElementById('teklifler-filters');
    if (!gridEl) return;

    // Render filter bar (always)
    if (filtersEl && !filtersEl.hasChildNodes()) {
      renderFilters(filtersEl);
    }

    // Show loading state on first load
    if (!loaded) {
      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
      var loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-size:13px;';
      loadingDiv.textContent = 'Kampanyalar yükleniyor...';
      gridEl.appendChild(loadingDiv);
    }

    try {
      var supa = window._htSupa || window.supabase;
      if (!supa) { console.error('Supabase client not available'); return; }

      var query = supa.from('campaigns')
        .select('id, title, short_desc, full_desc, campaign_type, cover_image_url, cta_label, cta_url, promo_code, distribution_mode, access_mode, start_date, end_date, company_id, brand_id, impression_count, click_count, companies(company_name, logo_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      var res = await query;

      if (res.error) {
        console.error('Teklifler load error:', res.error);
        return;
      }

      allCampaigns = res.data || [];
      loaded = true;

      renderCampaigns();
      updateBentoCount();
      updateNavBadge();

    } catch(e) {
      console.error('Teklifler exception:', e);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER CAMPAIGNS
     ═══════════════════════════════════════════════════════════════ */
  function renderCampaigns() {
    var gridEl = document.getElementById('teklifler-grid');
    var emptyEl = document.getElementById('teklifler-empty');
    if (!gridEl) return;

    while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
    observedCards.clear();

    // Apply filter
    var filtered = currentFilter === 'all'
      ? allCampaigns
      : allCampaigns.filter(function(c){ return c.campaign_type === currentFilter; });

    if (filtered.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    for (var i = 0; i < filtered.length; i++) {
      gridEl.appendChild(buildCampaignCard(filtered[i]));
    }

    // Set up intersection observer for impression tracking
    setupImpressionObserver();
  }

  /* ═══════════════════════════════════════════════════════════════
     BUILD CAMPAIGN CARD
     ═══════════════════════════════════════════════════════════════ */
  function buildCampaignCard(c) {
    var card = document.createElement('div');
    card.className = 'campaign-feed-card';
    card.dataset.campaignId = c.id;
    card.style.cssText = 'background:var(--white,#fff);border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid var(--border-subtle,#E8E6E3);transition:transform 0.15s,box-shadow 0.15s;cursor:pointer;';
    card.addEventListener('mouseover', function(){ card.style.transform='translateY(-2px)'; card.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; });
    card.addEventListener('mouseout', function(){ card.style.transform=''; card.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; });

    /* Cover image */
    if (c.cover_image_url) {
      var imgWrap = document.createElement('div');
      imgWrap.style.cssText = 'position:relative;width:100%;padding-top:52.3%;overflow:hidden;background:var(--bg,#F7F6F4);';
      var img = document.createElement('img');
      img.src = c.cover_image_url;
      img.alt = c.title || '';
      img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
      img.loading = 'lazy';
      imgWrap.appendChild(img);

      /* Type badge overlay */
      var typeInfo = TYPE_MAP[c.campaign_type] || TYPE_MAP.offer;
      var badge = document.createElement('span');
      badge.style.cssText = 'position:absolute;top:10px;left:10px;font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:' + typeInfo.bg + ';color:' + typeInfo.color + ';';
      badge.textContent = typeInfo.label;
      imgWrap.appendChild(badge);

      card.appendChild(imgWrap);
    } else {
      /* No cover — show colored header bar */
      var typeInfo = TYPE_MAP[c.campaign_type] || TYPE_MAP.offer;
      var colorBar = document.createElement('div');
      colorBar.style.cssText = 'height:8px;background:' + typeInfo.color + ';';
      card.appendChild(colorBar);
    }

    /* Content section */
    var content = document.createElement('div');
    content.style.cssText = 'padding:16px;';

    /* Brand info row */
    var brandRow = document.createElement('div');
    brandRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';

    if (c.companies && c.companies.logo_url) {
      var logo = document.createElement('img');
      logo.src = c.companies.logo_url;
      logo.alt = '';
      logo.style.cssText = 'width:28px;height:28px;border-radius:6px;object-fit:contain;border:1px solid var(--border-subtle,#E8E6E3);';
      brandRow.appendChild(logo);
    } else {
      var logoPlaceholder = document.createElement('div');
      logoPlaceholder.style.cssText = 'width:28px;height:28px;border-radius:6px;background:var(--bg,#F7F6F4);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text-muted);';
      logoPlaceholder.textContent = c.companies ? c.companies.company_name[0] : '?';
      brandRow.appendChild(logoPlaceholder);
    }

    var brandName = document.createElement('span');
    brandName.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-muted);';
    brandName.textContent = c.companies ? c.companies.company_name : 'Bilinmeyen Şirket';
    brandRow.appendChild(brandName);

    /* No-cover type badge (if no image) */
    if (!c.cover_image_url) {
      var typeInfo2 = TYPE_MAP[c.campaign_type] || TYPE_MAP.offer;
      var inlineBadge = document.createElement('span');
      inlineBadge.style.cssText = 'margin-left:auto;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:' + typeInfo2.bg + ';color:' + typeInfo2.color + ';';
      inlineBadge.textContent = typeInfo2.label;
      brandRow.appendChild(inlineBadge);
    }

    content.appendChild(brandRow);

    /* Title */
    var title = document.createElement('div');
    title.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:700;margin-bottom:6px;line-height:1.3;';
    title.textContent = c.title || '(Başlıksız)';
    content.appendChild(title);

    /* Short description */
    if (c.short_desc) {
      var desc = document.createElement('div');
      desc.style.cssText = 'font-size:13px;color:var(--text-muted);line-height:1.45;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';
      desc.textContent = c.short_desc;
      content.appendChild(desc);
    }

    /* Promo code section (for offers) */
    if (c.campaign_type === 'offer' && c.promo_code) {
      var promoWrap = document.createElement('div');
      promoWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 12px;background:#ECFDF5;border-radius:8px;border:1px dashed #059669;';

      var promoIcon = document.createElement('span');
      promoIcon.style.cssText = 'font-size:14px;';
      promoIcon.textContent = '🏷️';
      promoWrap.appendChild(promoIcon);

      var promoCode = document.createElement('span');
      promoCode.style.cssText = 'font-family:"DM Mono",monospace;font-size:13px;font-weight:700;color:#059669;letter-spacing:1px;';
      promoCode.textContent = c.promo_code;
      promoWrap.appendChild(promoCode);

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.style.cssText = 'margin-left:auto;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;border:1px solid #059669;background:white;color:#059669;font-family:inherit;';
      copyBtn.textContent = 'Kopyala';
      (function(code, btn, campId){
        copyBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          navigator.clipboard.writeText(code).then(function(){
            btn.textContent = 'Kopyalandı!';
            setTimeout(function(){ btn.textContent = 'Kopyala'; }, 2000);
          });
          trackRedemption(campId);
        });
      })(c.promo_code, copyBtn, c.id);
      promoWrap.appendChild(copyBtn);

      content.appendChild(promoWrap);
    }

    /* CTA button + date row */
    var footerRow = document.createElement('div');
    footerRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:4px;';

    var ctaBtn = document.createElement('a');
    ctaBtn.href = c.cta_url || '#';
    ctaBtn.target = '_blank';
    ctaBtn.rel = 'noopener noreferrer';
    ctaBtn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;background:var(--verm,#C94E28);color:white;transition:opacity 0.15s;';
    ctaBtn.textContent = c.cta_label || 'Detayları Gör';
    (function(campId){
      ctaBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        trackClick(campId);
      });
    })(c.id);
    ctaBtn.addEventListener('mouseover', function(){ ctaBtn.style.opacity='0.85'; });
    ctaBtn.addEventListener('mouseout', function(){ ctaBtn.style.opacity='1'; });
    footerRow.appendChild(ctaBtn);

    /* Date info */
    if (c.end_date) {
      var dateInfo = document.createElement('span');
      dateInfo.style.cssText = 'font-size:11px;color:var(--text-muted);';
      var endDate = new Date(c.end_date);
      var now = new Date();
      var daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft <= 7) {
        dateInfo.style.color = '#DC2626';
        dateInfo.style.fontWeight = '600';
        dateInfo.textContent = 'Son ' + daysLeft + ' gün!';
      } else if (daysLeft > 7) {
        dateInfo.textContent = endDate.toLocaleDateString('tr-TR', { day:'numeric', month:'short' }) + ' tarihine kadar';
      }
      footerRow.appendChild(dateInfo);
    }

    content.appendChild(footerRow);
    card.appendChild(content);

    /* Card click → detail drawer (future) or CTA */
    card.addEventListener('click', function() {
      if (c.cta_url) {
        trackClick(c.id);
        window.open(c.cta_url, '_blank', 'noopener');
      }
    });

    return card;
  }

  /* ═══════════════════════════════════════════════════════════════
     FILTER BAR
     ═══════════════════════════════════════════════════════════════ */
  function renderFilters(container) {
    while (container.firstChild) container.removeChild(container.firstChild);

    for (var i = 0; i < FILTERS.length; i++) {
      (function(f) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = 'padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid;font-family:inherit;transition:all 0.15s;';
        btn.style.cssText += currentFilter === f.key
          ? 'background:var(--navy,#1E2D5E);color:white;border-color:var(--navy,#1E2D5E);'
          : 'background:var(--white,#fff);color:var(--text);border-color:var(--border-subtle,#E8E6E3);';
        btn.textContent = f.label;

        /* Show count next to filter */
        if (f.key !== 'all') {
          var count = allCampaigns.filter(function(c){ return c.campaign_type === f.key; }).length;
          if (count > 0) btn.textContent = f.label + ' (' + count + ')';
        } else {
          btn.textContent = f.label + ' (' + allCampaigns.length + ')';
        }

        btn.addEventListener('click', function() {
          currentFilter = f.key;
          renderFilters(container);
          renderCampaigns();
        });
        container.appendChild(btn);
      })(FILTERS[i]);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     IMPRESSION TRACKING (IntersectionObserver)
     ═══════════════════════════════════════════════════════════════ */
  var _observer = null;

  function setupImpressionObserver() {
    if (!('IntersectionObserver' in window)) return;

    if (_observer) _observer.disconnect();

    _observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (entry.isIntersecting) {
          var campId = entry.target.dataset.campaignId;
          if (campId && !observedCards.has(campId)) {
            observedCards.add(campId);
            trackImpression(campId);
          }
        }
      }
    }, { threshold: 0.5 });

    var cards = document.querySelectorAll('.campaign-feed-card');
    for (var j = 0; j < cards.length; j++) {
      _observer.observe(cards[j]);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     TRACKING FUNCTIONS
     ═══════════════════════════════════════════════════════════════ */
  async function trackImpression(campaignId) {
    try {
      var supa = window._htSupa || window.supabase;
      var candId = window._ht_candidate_id;
      if (!supa || !candId) return;

      await supa.from('campaign_impressions').upsert({
        campaign_id: campaignId,
        candidate_id: candId,
        impression_type: 'feed_view'
      }, { onConflict: 'campaign_id,candidate_id,impression_type' });
    } catch(e) {
      console.error('Impression track error:', e);
    }
  }

  async function trackClick(campaignId) {
    try {
      var supa = window._htSupa || window.supabase;
      var candId = window._ht_candidate_id;
      if (!supa || !candId) return;

      await supa.from('campaign_clicks').insert({
        campaign_id: campaignId,
        candidate_id: candId,
        click_type: 'cta_click'
      });
    } catch(e) {
      console.error('Click track error:', e);
    }
  }

  async function trackRedemption(campaignId) {
    try {
      var supa = window._htSupa || window.supabase;
      var candId = window._ht_candidate_id;
      if (!supa || !candId) return;

      await supa.from('campaign_redemptions').upsert({
        campaign_id: campaignId,
        candidate_id: candId
      }, { onConflict: 'campaign_id,candidate_id' });
    } catch(e) {
      console.error('Redemption track error:', e);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════════════ */
  function updateBentoCount() {
    var el = document.getElementById('bento-teklifler-count');
    if (el) {
      el.textContent = allCampaigns.length > 0
        ? allCampaigns.length + ' aktif teklif'
        : 'Kampanyalar ve fırsatlar';
    }
  }

  function updateNavBadge() {
    var badge = document.getElementById('badge-teklifler');
    if (badge) {
      if (allCampaigns.length > 0) {
        badge.textContent = allCampaigns.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
    var countBadge = document.getElementById('teklifler-count-badge');
    if (countBadge) {
      if (allCampaigns.length > 0) {
        countBadge.textContent = allCampaigns.length;
        countBadge.style.display = 'inline-block';
      } else {
        countBadge.style.display = 'none';
      }
    }
  }

  /* ── Auto-load on page load if panel is active or to update bento count ── */
  document.addEventListener('DOMContentLoaded', function() {
    /* Preload campaign count for bento card (lightweight) */
    setTimeout(function() {
      var supa = window._htSupa || window.supabase;
      if (!supa) return;
      supa.from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .then(function(res) {
          if (!res.error && res.count > 0) {
            var el = document.getElementById('bento-teklifler-count');
            if (el) el.textContent = res.count + ' aktif teklif';
            var badge = document.getElementById('badge-teklifler');
            if (badge) { badge.textContent = res.count; badge.style.display = 'inline-block'; }
          }
        });
    }, 2000); // Delay to not block initial page load
  });

})();
