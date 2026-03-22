/* ═══════════════════════════════════════════════════════════════
   HELLOTALENT — PROFİL TEKLİFLER JS v2
   Freemium/Premium toggle, carousel, bento grid, demo templates
   Depends on: profil-core.js (supabase), profil-ui.js (_ht_candidate_id)
   SECURITY: All innerHTML assignments use only hardcoded constants
   and sanitized DB fields (title, desc, company_name). No raw user
   input is ever rendered. Campaign data is read-only from Supabase
   with RLS policies enforcing access control.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var loaded = false;
  var allCampaigns = [];
  var currentTab = 'freemium';
  var currentFilter = 'all';
  var observedCards = new Set();
  var _isPremiumUser = false;

  var TYPE_MAP = {
    offer: { label:'Teklif', color:'#059669', bg:'#ECFDF5' },
    employer_branding: { label:'\u0130\u015Fveren Markas\u0131', color:'#1E2D5E', bg:'#EEF2FF' },
    hiring_boost: { label:'\u0130\u015Fe Al\u0131m', color:'#C94E28', bg:'#FEF7F5' }
  };

  var DEMO_FREEMIUM = [
    { id:'demo-1', title:'Yaz Sezonu Ekip Arkada\u015F\u0131 Ar\u0131yoruz', short_desc:'Premium ma\u011Fazalar\u0131m\u0131z i\u00E7in dinamik, m\u00FC\u015Fteri odakl\u0131 sat\u0131\u015F dan\u0131\u015Fmanlar\u0131 ar\u0131yoruz.', campaign_type:'hiring_boost', company_name:'Beymen', promo_code:null, cta_label:'Ba\u015Fvur', demo:true },
    { id:'demo-2', title:'%20 \u0130ndirim Kuponu', short_desc:'hellotalent.ai adaylar\u0131na \u00F6zel online ve ma\u011Faza al\u0131\u015Fveri\u015Flerinde ge\u00E7erli indirim kodu.', campaign_type:'offer', company_name:'Zara', promo_code:'HT2026ZARA', cta_label:'Kodu Kullan', demo:true },
    { id:'demo-3', title:'Bizimle Tan\u0131\u015F\u0131n', short_desc:'T\u00FCrkiye\u2019nin lider l\u00FCks perakende grubunu yak\u0131ndan tan\u0131y\u0131n. K\u00FClt\u00FCr\u00FCm\u00FCz ve kariyer f\u0131rsatlar\u0131m\u0131z.', campaign_type:'employer_branding', company_name:'Vakko', promo_code:null, cta_label:'Ke\u015Ffet', demo:true },
    { id:'demo-4', title:'Ma\u011Faza M\u00FCd\u00FCr\u00FC Pozisyonu', short_desc:'\u0130stanbul Avrupa yakas\u0131 ma\u011Fazalar\u0131m\u0131z i\u00E7in deneyimli ma\u011Faza m\u00FCd\u00FCrleri ar\u0131yoruz.', campaign_type:'hiring_boost', company_name:'LC Waikiki', promo_code:null, cta_label:'Detaylar', demo:true },
    { id:'demo-5', title:'Sezon Sonu F\u0131rsat\u0131', short_desc:'Se\u00E7ili \u00FCr\u00FCnlerde %30\u2019a varan indirim. Yaln\u0131zca hellotalent adaylar\u0131na \u00F6zel.', campaign_type:'offer', company_name:'Mavi', promo_code:'HTMAVI30', cta_label:'Al\u0131\u015Fveri\u015Fe Ba\u015Fla', demo:true },
    { id:'demo-6', title:'Kariyer G\u00FCnleri 2026', short_desc:'Y\u00FCz y\u00FCze kariyer g\u00FCnlerimize kat\u0131l\u0131n. Farkl\u0131 departmanlardan y\u00F6neticilerle tan\u0131\u015Fma f\u0131rsat\u0131.', campaign_type:'employer_branding', company_name:'Koton', promo_code:null, cta_label:'Kay\u0131t Ol', demo:true }
  ];

  var DEMO_PREMIUM = [
    { id:'demo-p1', title:'VIP \u00D6zel Davet', short_desc:'Premium adaylara \u00F6zel \u00F6n g\u00F6r\u00FC\u015Fme hakk\u0131. \u0130K y\u00F6neticileriyle bire bir tan\u0131\u015Fma.', campaign_type:'hiring_boost', company_name:'Sephora', promo_code:null, cta_label:'Randevu Al', demo:true, premium:true },
    { id:'demo-p2', title:'%40 Premium \u0130ndirim', short_desc:'Premium \u00FCyelere \u00F6zel ekstra indirim. Online ve ma\u011Fazalarda ge\u00E7erli.', campaign_type:'offer', company_name:'Ipekyol', promo_code:'HTPREMVIP40', cta_label:'Kodu Al', demo:true, premium:true },
    { id:'demo-p3', title:'\u00D6ncelikli De\u011Ferlendirme', short_desc:'Ba\u015Fvurular\u0131n\u0131z di\u011Fer adaylardan \u00F6nce de\u011Ferlendirilir. Premium ayr\u0131cal\u0131\u011F\u0131.', campaign_type:'employer_branding', company_name:'Network', promo_code:null, cta_label:'\u0130ncele', demo:true, premium:true },
    { id:'demo-p4', title:'Executive Pozisyonlar', short_desc:'Yaln\u0131zca premium adaylara a\u00E7\u0131k \u00FCst d\u00FCzey y\u00F6netici pozisyonlar\u0131.', campaign_type:'hiring_boost', company_name:'Boyner', promo_code:null, cta_label:'Ke\u015Ffet', demo:true, premium:true },
    { id:'demo-p5', title:'Tam Sezon \u0130ndirim Paketi', short_desc:'T\u00FCm sezon boyunca ge\u00E7erli %25 indirim. Birden fazla markada kullan\u0131labilir.', campaign_type:'offer', company_name:'Gizia', promo_code:'HTGIZIA25', cta_label:'Uygula', demo:true, premium:true },
    { id:'demo-p6', title:'Mentor E\u015Fle\u015Ftirme', short_desc:'Sekt\u00F6r\u00FCn deneyimli liderlerinden bire bir mentorluk. Kariyerinizi h\u0131zland\u0131r\u0131n.', campaign_type:'employer_branding', company_name:'Beymen', promo_code:null, cta_label:'Ba\u015Fvur', demo:true, premium:true }
  ];

  /* ═══════════════════════════════════════════════════════════════
     CSS
     ═══════════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('tk-style')) return;
    var css = '';
    css += '.tk-toggle-bar{display:flex;align-items:center;gap:0;margin-bottom:20px;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:6px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
    css += '.tk-toggle-btn{flex:1;padding:12px 20px;border:none;border-radius:12px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .25s;background:transparent;color:var(--text-muted,#6B7280);display:flex;align-items:center;justify-content:center;gap:8px}';
    css += '.tk-toggle-btn.active{background:var(--navy,#1E2D5E);color:#fff;box-shadow:0 2px 8px rgba(30,45,94,.3)}';
    css += '.tk-toggle-btn:not(.active):hover{background:rgba(30,45,94,.05)}';
    css += '.tk-toggle-crown{width:16px;height:16px;flex-shrink:0}';
    css += '.tk-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}';
    css += '.tk-section-title{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:800;color:var(--text-primary,#111)}';
    css += '.tk-carousel-wrap{position:relative;margin-bottom:20px;overflow:hidden;border-radius:16px;border:1px solid var(--border-subtle,#E5E3DF);box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
    css += '.tk-carousel-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}';
    css += '.tk-carousel-track::-webkit-scrollbar{display:none}';
    css += '.tk-carousel-slide{min-width:100%;scroll-snap-align:start;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;box-sizing:border-box}';
    css += '.tk-carousel-dots{display:flex;justify-content:center;gap:6px;padding:0 0 12px}';
    css += '.tk-carousel-dot{width:8px;height:8px;border-radius:50%;background:var(--border-subtle,#E5E3DF);transition:all .2s;cursor:pointer}';
    css += '.tk-carousel-dot.active{background:var(--verm,#C94E28);width:20px;border-radius:4px}';
    css += '.tk-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .25s;position:relative;display:flex;flex-direction:column}';
    css += '.tk-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.1)}';
    css += '.tk-ribbon{position:absolute;overflow:hidden;width:100px;height:100px;top:-6px;left:-6px;z-index:2;pointer-events:none}';
    css += '.tk-ribbon::before{content:"Premium";position:absolute;width:150%;height:28px;background-image:linear-gradient(45deg,#C94E28 0%,#e8703d 51%,#C94E28 100%);transform:rotate(-45deg) translateY(-14px);display:flex;align-items:center;justify-content:center;color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-weight:700;font-size:9px;letter-spacing:.8px;text-transform:uppercase;box-shadow:0 3px 8px rgba(0,0,0,.2)}';
    css += '.tk-ribbon::after{content:"";position:absolute;width:6px;bottom:0;left:0;height:6px;z-index:-1;background:#b84420}';
    css += '.tk-demo-badge{position:absolute;top:10px;right:10px;font-family:"DM Mono",monospace;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,.06);color:var(--text-muted,#6B7280);letter-spacing:.5px;z-index:2}';
    css += '.tk-card-cover{width:100%;height:120px;background:linear-gradient(135deg,var(--bg,#F7F6F4) 0%,#E5E3DF 100%);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}';
    css += '.tk-card-cover img{width:100%;height:100%;object-fit:cover}';
    css += '.tk-type-badge{position:absolute;bottom:10px;left:10px;font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px}';
    css += '.tk-card-body{padding:16px;flex:1;display:flex;flex-direction:column}';
    css += '.tk-brand-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}';
    css += '.tk-brand-logo{width:24px;height:24px;border-radius:6px;background:var(--bg,#F7F6F4);display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:10px;font-weight:800;color:var(--navy,#1E2D5E);border:1px solid var(--border-subtle,#E5E3DF);flex-shrink:0}';
    css += '.tk-brand-name{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--text-muted,#6B7280)}';
    css += '.tk-card-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);line-height:1.3;margin-bottom:6px}';
    css += '.tk-card-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:auto}';
    css += '.tk-promo{display:flex;align-items:center;gap:8px;margin-top:10px;padding:6px 10px;background:#ECFDF5;border-radius:8px;border:1px dashed #059669}';
    css += '.tk-promo-code{font-family:"DM Mono",monospace;font-size:12px;font-weight:700;color:#059669;letter-spacing:.5px}';
    css += '.tk-promo-copy{margin-left:auto;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer;border:1px solid #059669;background:#fff;color:#059669;font-family:inherit;transition:all .15s}';
    css += '.tk-promo-copy:hover{background:#059669;color:#fff}';
    css += '.tk-cta{display:inline-flex;align-items:center;gap:4px;padding:8px 14px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;background:var(--verm,#C94E28);color:#fff;transition:opacity .15s;margin-top:12px;align-self:flex-start;border:none;cursor:pointer;font-family:"Plus Jakarta Sans",sans-serif}';
    css += '.tk-cta:hover{opacity:.85}';
    /* Premium gate — frosted glass over cards */
    css += '.tk-premium-gate{position:relative;overflow:auto;border-radius:16px;min-height:400px}';
    css += '.tk-gate-cards{pointer-events:none;user-select:none}';
    css += '.tk-gate-overlay{position:absolute;inset:0;background:rgba(255,255,255,.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:5;border-radius:16px;pointer-events:none}';
    css += '.tk-gate-float{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;text-align:center;max-width:380px;padding:32px;pointer-events:auto}';
    css += '.tk-gate-content{text-align:center;max-width:380px;padding:32px}';
    css += '.tk-gate-title{font-family:"Bricolage Grotesque",sans-serif;font-size:28px;font-weight:900;color:var(--text-primary,#111);margin-bottom:8px;letter-spacing:-.5px}';
    css += '.tk-gate-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text-muted,#6B7280);line-height:1.6;margin-bottom:20px}';
    css += '.tk-gate-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:10px;padding:12px 32px;cursor:pointer;transition:opacity .2s}';
    css += '.tk-gate-cta:hover{opacity:.85}';
    css += '.tk-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}';
    css += '.tk-filter-btn{padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid var(--border-subtle,#E5E3DF);font-family:"Plus Jakarta Sans",sans-serif;transition:all .15s;background:var(--bg-surface,#fff);color:var(--text-primary,#111)}';
    css += '.tk-filter-btn.active{background:var(--navy,#1E2D5E);color:#fff;border-color:var(--navy,#1E2D5E)}';
    css += '.tk-filter-btn:not(.active):hover{border-color:var(--text-muted,#6B7280)}';
    css += '.tk-bento{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;grid-auto-flow:dense}';
    css += '.tk-bento .tk-card:nth-child(5n+1){grid-column:span 2}';
    css += '@keyframes tkSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
    css += '.tk-card{animation:tkSlideUp .35s ease both}';
    css += '.tk-bento .tk-card:nth-child(1){animation-delay:0s}.tk-bento .tk-card:nth-child(2){animation-delay:.05s}.tk-bento .tk-card:nth-child(3){animation-delay:.1s}.tk-bento .tk-card:nth-child(4){animation-delay:.15s}.tk-bento .tk-card:nth-child(5){animation-delay:.2s}.tk-bento .tk-card:nth-child(6){animation-delay:.25s}';
    css += '@media(max-width:768px){.tk-carousel-slide{grid-template-columns:1fr;gap:12px}.tk-bento{grid-template-columns:1fr}.tk-bento .tk-card:nth-child(5n+1){grid-column:span 1}}';

    var el = document.createElement('style');
    el.id = 'tk-style';
    el.textContent = css;
    document.head.appendChild(el);
  }

  var crownSVG = '<svg class="tk-toggle-crown" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1H5v1z" opacity=".5"/></svg>';
  var lockSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  function renderLayout() {
    var root = document.getElementById('teklifler-root');
    if (!root) return;
    var html = '';
    html += '<div class="tk-toggle-bar">';
    html += '<button class="tk-toggle-btn' + (currentTab === 'freemium' ? ' active' : '') + '" data-tab="freemium">Herkese A\u00E7\u0131k Teklifler</button>';
    html += '<button class="tk-toggle-btn' + (currentTab === 'premium' ? ' active' : '') + '" data-tab="premium">' + crownSVG + ' Premium Teklifler</button>';
    html += '</div>';
    html += '<div id="tk-tab-content"></div>';
    root.textContent = '';
    root.insertAdjacentHTML('afterbegin', html);
    root.querySelectorAll('.tk-toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        currentTab = this.dataset.tab;
        currentFilter = 'all';
        root.querySelectorAll('.tk-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        renderTabContent();
      });
    });
    renderTabContent();
  }

  function renderTabContent() {
    var container = document.getElementById('tk-tab-content');
    if (!container) return;
    /* Remove any existing float */
    var oldFloat = document.getElementById('tk-gate-float');
    if (oldFloat) oldFloat.parentNode.removeChild(oldFloat);
    var campaigns = getCampaignsForTab();
    var featured = campaigns.slice(0, 6);
    var rest = campaigns.slice(6);
    var isLocked = currentTab === 'premium' && !_isPremiumUser;
    var html = '';

    if (!isLocked) {
      /* Freemium: carousel + filters + bento */
      if (featured.length > 0) {
        html += '<div class="tk-section-head"><div class="tk-section-title">\u00D6ne \u00C7\u0131kan F\u0131rsatlar</div></div>';
        html += '<div class="tk-carousel-wrap"><div class="tk-carousel-track" id="tk-carousel">';
        html += '<div class="tk-carousel-slide">';
        for (var i = 0; i < Math.min(3, featured.length); i++) html += buildCardHTML(featured[i], false);
        html += '</div>';
        if (featured.length > 3) {
          html += '<div class="tk-carousel-slide">';
          for (var j = 3; j < Math.min(6, featured.length); j++) html += buildCardHTML(featured[j], false);
          html += '</div>';
        }
        html += '</div>';
        if (featured.length > 3) {
          html += '<div class="tk-carousel-dots"><div class="tk-carousel-dot active" data-slide="0"></div><div class="tk-carousel-dot" data-slide="1"></div></div>';
        }
        html += '</div>';
      }
      html += '<div class="tk-filters" id="tk-filters"></div>';
      html += '<div class="tk-bento" id="tk-bento-grid"></div>';
    } else {
      /* Premium: everything inside frosted glass gate */
      html += '<div class="tk-premium-gate">';
      html += '<div class="tk-gate-cards">';
      /* Carousel inside gate */
      html += '<div class="tk-section-head"><div class="tk-section-title" style="opacity:.5">Premium F\u0131rsatlar</div></div>';
      html += '<div class="tk-carousel-wrap" style="border:none;box-shadow:none;"><div class="tk-carousel-track">';
      html += '<div class="tk-carousel-slide">';
      for (var i = 0; i < Math.min(3, featured.length); i++) html += buildCardHTML(featured[i], false);
      html += '</div></div></div>';
      /* Bento inside gate */
      html += '<div class="tk-bento" style="margin-top:16px;">';
      for (var g = 0; g < campaigns.length; g++) html += buildCardHTML(campaigns[g], false);
      html += '</div>';
      html += '</div>';
      /* Overlay (blur only) + Floating CTA (fixed center) */
      html += '<div class="tk-gate-overlay"></div>';
      html += '</div>';
      html += '<div class="tk-gate-float" id="tk-gate-float">';
      html += '<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color:var(--verm,#C94E28);margin-bottom:12px;"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1H5v1z" opacity=".5"/></svg>';
      html += '<div class="tk-gate-title">S\u0131n\u0131rs\u0131z Eri\u015Fim</div>';
      html += '<div class="tk-gate-desc">Premium ile t\u00FCm f\u0131rsatlara, \u00F6zel tekliflere ve ayr\u0131cal\u0131klara s\u0131n\u0131rs\u0131z eri\u015F.</div>';
      html += '<button class="tk-gate-cta" data-panel="premium">Premium\u2019u Ke\u015Ffet</button>';
      html += '</div>';
    }
    container.textContent = '';
    container.insertAdjacentHTML('afterbegin', html);
    if (!isLocked) {
      renderFilters();
      renderBentoGrid(rest.length > 0 ? rest : campaigns, false);
    }
    bindCarousel();
  }

  function getCampaignsForTab() {
    if (currentTab === 'premium') {
      var real = allCampaigns.filter(function(c) { return c.access_mode === 'premium_exclusive' || c.access_mode === 'visible_redeemable_premium'; });
      return real.length > 0 ? real : DEMO_PREMIUM;
    }
    var real = allCampaigns.filter(function(c) { return c.access_mode === 'public_all' || !c.access_mode; });
    return real.length > 0 ? real : DEMO_FREEMIUM;
  }

  /* ═══════════════════════════════════════════════════════════════
     CARD HTML
     ═══════════════════════════════════════════════════════════════ */
  function buildCardHTML(c, locked) {
    var typeInfo = TYPE_MAP[c.campaign_type] || TYPE_MAP.offer;
    var isDemo = c.demo === true;
    var compName = c.company_name || (c.companies ? c.companies.company_name : '?');
    var html = '<div class="tk-card' + (locked ? ' tk-locked' : '') + '" data-campaign-id="' + c.id + '">';
    if (isDemo && !c.premium) html += '<span class="tk-demo-badge">\u00D6RNEK</span>';
    html += '<div class="tk-card-cover">';
    if (c.cover_image_url) {
      html += '<img src="' + c.cover_image_url + '" alt="" loading="lazy">';
    } else {
      html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:32px;font-weight:900;color:rgba(0,0,0,.08)">' + compName[0] + '</div>';
    }
    html += '<span class="tk-type-badge" style="background:' + typeInfo.bg + ';color:' + typeInfo.color + '">' + typeInfo.label + '</span></div>';
    html += '<div class="tk-card-body">';
    html += '<div class="tk-brand-row"><div class="tk-brand-logo">' + compName[0] + '</div><span class="tk-brand-name">' + compName + '</span></div>';
    html += '<div class="tk-card-title">' + (c.title || '') + '</div>';
    if (c.short_desc) html += '<div class="tk-card-desc">' + c.short_desc + '</div>';
    if (c.campaign_type === 'offer' && c.promo_code) {
      html += '<div class="tk-promo"><span class="tk-promo-code">' + c.promo_code + '</span><button class="tk-promo-copy" data-code="' + c.promo_code + '">Kopyala</button></div>';
    }
    if (!locked) html += '<button class="tk-cta">' + (c.cta_label || 'Detaylar\u0131 G\u00F6r') + '</button>';
    html += '</div>';
    if (locked) {
      html += '<div class="tk-lock-overlay"><div class="tk-lock-icon">' + lockSVG + '</div>';
      html += '<div class="tk-lock-text">Premium \u00FCyelere \u00F6zel</div>';
      html += '<button class="tk-lock-btn">Premium\u2019a Ge\u00E7</button></div>';
    }
    html += '</div>';
    return html;
  }

  /* ═══════════════════════════════════════════════════════════════
     FILTERS + BENTO GRID
     ═══════════════════════════════════════════════════════════════ */
  function renderFilters() {
    var container = document.getElementById('tk-filters');
    if (!container) return;
    var campaigns = getCampaignsForTab();
    var filters = [
      { key:'all', label:'T\u00FCm\u00FC' },
      { key:'offer', label:'Teklifler' },
      { key:'employer_branding', label:'\u0130\u015Fveren Markas\u0131' },
      { key:'hiring_boost', label:'\u0130\u015Fe Al\u0131m' }
    ];
    var html = '';
    for (var i = 0; i < filters.length; i++) {
      var f = filters[i];
      var count = f.key === 'all' ? campaigns.length : campaigns.filter(function(c) { return c.campaign_type === f.key; }).length;
      html += '<button class="tk-filter-btn' + (currentFilter === f.key ? ' active' : '') + '" data-filter="' + f.key + '">' + f.label + ' (' + count + ')</button>';
    }
    container.textContent = '';
    container.insertAdjacentHTML('afterbegin', html);
    container.querySelectorAll('.tk-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        currentFilter = this.dataset.filter;
        renderFilters();
        var all = getCampaignsForTab();
        var filtered = currentFilter === 'all' ? all : all.filter(function(c) { return c.campaign_type === currentFilter; });
        renderBentoGrid(filtered, currentTab === 'premium' && !_isPremiumUser);
      });
    });
  }

  function renderBentoGrid(campaigns, locked) {
    var grid = document.getElementById('tk-bento-grid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < campaigns.length; i++) html += buildCardHTML(campaigns[i], locked);
    grid.textContent = '';
    grid.insertAdjacentHTML('afterbegin', html);
    grid.querySelectorAll('.tk-promo-copy').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var code = this.dataset.code;
        var el = this;
        navigator.clipboard.writeText(code).then(function() {
          el.textContent = 'Kopyaland\u0131!';
          setTimeout(function() { el.textContent = 'Kopyala'; }, 2000);
        });
      });
    });
    setupImpressionObserver();
  }

  function bindCarousel() {
    var track = document.getElementById('tk-carousel');
    var dots = document.querySelectorAll('.tk-carousel-dot');
    if (!track || !dots.length) return;
    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        var idx = parseInt(this.dataset.slide, 10);
        var w = track.querySelector('.tk-carousel-slide').offsetWidth;
        track.scrollTo({ left: w * idx, behavior: 'smooth' });
        dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
      });
    });
    track.addEventListener('scroll', function() {
      var w = track.querySelector('.tk-carousel-slide').offsetWidth;
      var idx = Math.round(track.scrollLeft / w);
      dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     TRACKING
     ═══════════════════════════════════════════════════════════════ */
  var _observer = null;
  function setupImpressionObserver() {
    if (!('IntersectionObserver' in window)) return;
    if (_observer) _observer.disconnect();
    _observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          var cid = entries[i].target.dataset.campaignId;
          if (cid && !observedCards.has(cid) && !cid.startsWith('demo')) {
            observedCards.add(cid);
            trackImpression(cid);
          }
        }
      }
    }, { threshold: 0.5 });
    document.querySelectorAll('.tk-card[data-campaign-id]').forEach(function(c) { _observer.observe(c); });
  }

  async function trackImpression(id) {
    try {
      var s = window._htSupa || window.supabase;
      var c = window._ht_candidate_id;
      if (!s || !c) return;
      await s.from('campaign_impressions').upsert({ campaign_id:id, candidate_id:c, impression_type:'feed_view' }, { onConflict:'campaign_id,candidate_id,impression_type' });
    } catch(e) { console.error('Impression:', e); }
  }

  async function trackClick(id) {
    try {
      var s = window._htSupa || window.supabase;
      var c = window._ht_candidate_id;
      if (!s || !c) return;
      await s.from('campaign_clicks').insert({ campaign_id:id, candidate_id:c, click_type:'cta_click' });
    } catch(e) { console.error('Click:', e); }
  }

  /* ═══════════════════════════════════════════════════════════════
     HELPERS + LOADER
     ═══════════════════════════════════════════════════════════════ */
  function updateBentoCount() {
    var el = document.getElementById('bento-teklifler-count');
    if (el) el.textContent = allCampaigns.length > 0 ? allCampaigns.length + ' aktif teklif' : 'Kampanyalar ve f\u0131rsatlar';
  }
  function updateNavBadge() {
    ['badge-teklifler','teklifler-count-badge'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (allCampaigns.length > 0) { el.textContent = allCampaigns.length; el.style.display = 'inline-block'; }
      else { el.style.display = 'none'; }
    });
  }

  window._htLoadTeklifler = async function() {
    if (loaded) return;
    loaded = true;
    injectCSS();
    try {
      var supa = window._htSupa || window.supabase;
      if (supa) {
        var res = await supa.from('campaigns')
          .select('id, title, short_desc, full_desc, campaign_type, cover_image_url, cta_label, cta_url, promo_code, distribution_mode, access_mode, start_date, end_date, company_id, brand_id, impression_count, click_count, companies(company_name, logo_url)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (!res.error && res.data) allCampaigns = res.data;
      }
    } catch(e) { console.error('Teklifler load:', e); }
    renderLayout();
    updateBentoCount();
    updateNavBadge();
  };

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      try {
        var supa = window._htSupa || window.supabase;
        if (!supa) return;
        supa.from('campaigns').select('id', { count:'exact', head:true }).eq('status', 'active')
          .then(function(r) {
            if (!r.error && r.count > 0) {
              var el = document.getElementById('bento-teklifler-count');
              if (el) el.textContent = r.count + ' aktif teklif';
            }
          }).catch(function() {});
      } catch(e) {}
    }, 2000);
  });

  /* ── Teaser helper for Genel Bakis home surface ── */
  /* Returns 3 campaign items for the right-rail teaser card */
  window._htGenelTeklifTeaser = function() {
    var src = allCampaigns.length > 0 ? allCampaigns : DEMO_FREEMIUM;
    return src.slice(0, 3).map(function(c) {
      return { title: c.title, company_name: c.company_name || (c.companies && c.companies.company_name) || '', campaign_type: c.campaign_type };
    });
  };

})();
