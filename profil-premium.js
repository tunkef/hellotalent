/* global supabase, _loadedDBData */
/**
 * profil-premium.js — Premium Features Panel for profil.html
 * Bento grid layout, feature showcase, subscription CTA + purchase flow.
 * All content from hardcoded constants — no user input, no XSS risk.
 *
 * MVP_FREE_TIER: true → tüm premium özellikler beta boyunca ücretsiz açık.
 * Ödeme sistemi hazır olunca MVP_FREE_TIER = false yapılır.
 */
(function(){
'use strict';

/* ════════════════════════════════════════════════
   MVP FREE-TIER TRUTH SOURCE
   Tek kontrol noktası: burası false yapılınca ödeme sistemi devreye girer.
   ════════════════════════════════════════════════ */
var MVP_FREE_TIER = true;
window._htMvpFreeTier = MVP_FREE_TIER;

var _loaded = false;
/* Plan constants — referenced by render when !MVP_FREE_TIER (iyzico ready) */
var PLAN_KEYS = ['aylik', 'yillik', 'kariyer'];
var PLAN_AMOUNTS = { aylik: 14900, yillik: 11880, kariyer: 24900 }; /* kuruş cinsinden */

/* ════════════════════════════════════════════════
   PREMIUM FEATURES DATA
   ════════════════════════════════════════════════ */

var FEATURES = [
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    title: 'Kim Bakt\u0131 Detaylar\u0131',
    desc: 'Profilini inceleyen \u015Firketleri, pozisyon detaylar\u0131n\u0131 ve g\u00F6r\u00FCnt\u00FClenme trendlerini g\u00F6r.',
    color: 'verm'
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    title: '\u00D6ne \u00C7\u0131kan Profil',
    desc: '\u0130\u015Fveren aramalar\u0131nda listenin ba\u015F\u0131na \u00E7\u0131k. Daha fazla g\u00F6r\u00FCn, daha \u00E7ok f\u0131rsat yakala.',
    color: 'navy'
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    title: 'AI CV Olu\u015Fturucu',
    desc: 'Yapay zeka ile profesyonel CV\u2019ini otomatik olu\u015Ftur. Pozisyona \u00F6zel \u00F6zelle\u015Ftirme.',
    color: 'verm'
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    title: 'M\u00FClakat Haz\u0131rl\u0131k',
    desc: 'T\u00FCm yetkinlik bazl\u0131 m\u00FClakat sorular\u0131na s\u0131n\u0131rs\u0131z eri\u015Fim. 289 soru, 29 yetkinlik.',
    color: 'navy'
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/><circle cx="12" cy="14" r="2"/></svg>',
    title: 'Premium Teklifler',
    desc: '\u0130\u015Fveren markalar\u0131ndan \u00F6zel indirimler, VIP davetler ve \u00F6ncelikli ba\u015Fvuru hakk\u0131.',
    color: 'verm'
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>',
    title: 'Detayl\u0131 Analitik',
    desc: 'Profil performans\u0131n\u0131, sekt\u00F6r kar\u015F\u0131la\u015Ft\u0131rmalar\u0131n\u0131 ve geli\u015Fim \u00F6nerilerini g\u00F6r.',
    color: 'navy'
  }
];

var PLANS = [
  { name: 'Ayl\u0131k', price: '149', period: '/ay', annual: '1.788 TL/y\u0131l', desc: 'Esnek kullan\u0131m, istedi\u011Fin zaman iptal et.', highlight: false },
  { name: 'Y\u0131ll\u0131k', price: '99', period: '/ay', annual: '1.188 TL/y\u0131l', desc: 'Y\u0131ll\u0131k \u00F6deme ile %33 tasarruf (600 TL). En pop\u00FCler plan.', highlight: true },
  { name: 'Kariyer', price: '249', period: 'tek seferlik', annual: null, desc: '3 ay s\u00FCreli tam eri\u015Fim. \u0130\u015F arama d\u00F6nemine \u00F6zel.', highlight: false }
];

/* ════════════════════════════════════════════════
   CSS
   K069: external css/panels/premium.css owns styling.
   injectCSS() is a no-op marker — kept for shape compat.
   ════════════════════════════════════════════════ */

function injectCSS() {
  // K069: external css/panels/premium.css owns styling now.
  return;
}

/* ════════════════════════════════════════════════
   RENDER
   ════════════════════════════════════════════════ */

function render() {
  var panel = document.getElementById('panel-premium');
  if (!panel) return;

  var html = '';

  html += '<div class="prem-root">';

  /* ── HERO ── */
  html += '<header class="prem-hero">';
  html += '<p class="prem-kicker">' + (MVP_FREE_TIER ? 'BETA \u00B7 PREMIUM \u00B7 3 AY' : 'PREMIUM') + '</p>';
  html += '<h1 class="prem-headline">' + (MVP_FREE_TIER ? 'Beta avantajlar\u0131' : 'Premium avantajlar') + '</h1>';
  html += '<p class="prem-subline">' + (MVP_FREE_TIER
    ? 'Hellotalent beta s\u00FCrecinde. A\u015Fa\u011F\u0131daki t\u00FCm avantajlar 3 ay boyunca \u00FCcretsiz a\u00E7\u0131k. AI \u00F6zellikleri (CV + De\u011Ferlendirme) 1 deneme hakk\u0131 i\u00E7erir.'
    : '\u0130\u015Fveren aramalar\u0131nda \u00F6ne \u00E7\u0131k, detayl\u0131 analitik g\u00F6r, AI CV olu\u015Ftur, s\u0131n\u0131rs\u0131z m\u00FClakat sorusuna eri\u015F.') + '</p>';
  html += '</header>';

  /* ── BETA STRIP (free tier only) ── */
  if (MVP_FREE_TIER) {
    html += '<div class="prem-beta-strip" role="note">';
    html += '<span class="prem-beta-strip__label">BETA \u00B7 \u00DCCRETSIZ</span>';
    html += '<p class="prem-beta-strip__text">Beta d\u00F6nemi boyunca \u00F6deme al\u0131nm\u0131yor. Premium a\u00E7\u0131l\u0131nca haber verece\u011Fiz; o zamana kadar her \u015Fey senin.</p>';
    html += '</div>';
  }

  /* ── FEATURES SECTION ── */
  html += '<section class="prem-section" id="prem-s-features">';
  html += '<div class="prem-section__head">';
  html += '<span class="prem-section__num">01</span>';
  html += '<h2 class="prem-section__title">' + (MVP_FREE_TIER ? 'Beta\u2019da a\u00E7\u0131k \u00F6zellikler' : 'Premium avantajlar\u0131') + '</h2>';
  html += '<span class="prem-section__desc">Profilini \u00F6ne \u00E7\u0131karan, m\u00FClakatlara haz\u0131rlayan ve kariyerini h\u0131zland\u0131ran alt\u0131 avantaj.</span>';
  html += '</div>';

  html += '<div class="prem-features">';
  for (var i = 0; i < FEATURES.length; i++) {
    var f = FEATURES[i];
    var iconCls = f.color === 'verm' ? ' is-verm' : '';
    html += '<article class="prem-feature">';
    html += '<div class="prem-feature__row">';
    html += '<div class="prem-feature__icon' + iconCls + '">' + f.icon + '</div>';
    if (MVP_FREE_TIER) {
      html += '<span class="prem-feature__kicker is-free">\u00DCCRETSIZ \u00B7 3 AY</span>';
    } else {
      html += '<span class="prem-feature__kicker">PREMIUM</span>';
    }
    html += '</div>';
    html += '<h3 class="prem-feature__title">' + f.title + '</h3>';
    html += '<p class="prem-feature__desc">' + f.desc + '</p>';
    html += '</article>';
  }
  html += '</div>';
  html += '</section>';

  if (!MVP_FREE_TIER) {
    /* ── PLANS SECTION — only in paid mode ── */
    html += '<section class="prem-section" id="prem-s-plans">';
    html += '<div class="prem-section__head">';
    html += '<span class="prem-section__num">02</span>';
    html += '<h2 class="prem-section__title">Plan se\u00E7</h2>';
    html += '<span class="prem-section__desc">Esnek ayl\u0131k, tasarruflu y\u0131ll\u0131k ya da i\u015F arama d\u00F6nemine \u00F6zel 3 ayl\u0131k kariyer plan\u0131.</span>';
    html += '</div>';

    html += '<div class="prem-plans">';
    for (var j = 0; j < PLANS.length; j++) {
      var p = PLANS[j];
      html += '<article class="prem-plan' + (p.highlight ? ' prem-plan--highlight' : '') + '">';
      if (p.highlight) html += '<span class="prem-plan__badge">EN POP\u00DCLER</span>';
      html += '<p class="prem-plan__name">' + p.name + '</p>';
      html += '<p class="prem-plan__price">' + p.price + '<span class="prem-plan__price-unit">TL</span></p>';
      html += '<p class="prem-plan__period">' + p.period + '</p>';
      if (p.annual) html += '<p class="prem-plan__annual">' + p.annual + '</p>';
      html += '<p class="prem-plan__desc">' + p.desc + '</p>';
      html += '<button class="prem-plan__cta" data-plan="' + PLAN_KEYS[j] + '" type="button">' + (p.highlight ? 'Hemen ba\u015Fla' : 'Plan\u0131 se\u00E7') + '</button>';
      html += '</article>';
    }
    html += '</div>';

    /* Purchase status + active banner placeholders */
    html += '<div id="pm-purchase-status" class="prem-status" hidden></div>';
    html += '</section>';
  }

  /* Active premium banner — hidden until RPC confirms */
  html += '<div id="pm-active-banner" class="prem-active" hidden></div>';

  html += '</div>';

  /* Safe: all content from hardcoded FEATURES/PLANS constants */
  panel.textContent = '';
  panel.insertAdjacentHTML('afterbegin', html);

  if (!MVP_FREE_TIER) {
    bindPlanEvents();
    checkCurrentPremium();
  }
}

function bindPlanEvents() {
  var btns = document.querySelectorAll('.pm-plan-cta[data-plan]');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var planKey = this.getAttribute('data-plan');
      if (planKey) initiatePurchase(planKey, this);
    });
  });
}

async function checkCurrentPremium() {
  if (typeof supabase === 'undefined') return;
  try {
    var res = await supabase.rpc('get_my_premium_status');
    if (res.data && res.data.length > 0 && res.data[0].is_premium) {
      var d = res.data[0];
      var banner = document.getElementById('pm-active-banner');
      if (banner) {
        banner.hidden = false;
        var h = '<span class="prem-active__dot" aria-hidden="true"></span>';
        h += '<div class="prem-active__body">';
        h += '<p class="prem-active__title">Premium aktif</p>';
        var meta = '';
        if (d.days_remaining > 0) meta += d.days_remaining + ' G\u00DCN KALDI';
        if (d.plan_key) meta += (meta ? ' \u00B7 ' : '') + ({ aylik: 'AYLIK', yillik: 'YILLIK', kariyer: 'KARIYER' }[d.plan_key] || d.plan_key.toUpperCase()) + ' PLAN';
        h += '<p class="prem-active__meta">' + (meta || 'AKT\u0130F') + '</p>';
        h += '</div>';
        /* Safe: all content from hardcoded constants + RPC data that is not user-authored */
        banner.textContent = '';
        banner.insertAdjacentHTML('afterbegin', h);
      }
      /* Disable plan buttons */
      var btns = document.querySelectorAll('.prem-plan__cta[data-plan]');
      btns.forEach(function(b) { b.textContent = 'Aktif'; b.disabled = true; });
    }
  } catch (e) { /* silent */ }
}

function initiatePurchase(planKey, btn) {
  /* \u00d6deme sistemi hen\u00fcz aktif de\u011fil \u2014 iyzico entegrasyonu tamamlan\u0131nca a\u00e7\u0131lacak */
  showPurchaseStatus('\u00c7ok Yak\u0131nda \u2014 \u00f6deme sistemi \u00e7ok yak\u0131nda aktif olacak.', 'info');
}

function showPurchaseStatus(msg, _type) {
  var el = document.getElementById('pm-purchase-status');
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
}

async function refreshPremiumState() {
  if (typeof supabase === 'undefined') return;
  try {
    var sessionRes = await supabase.auth.getSession();
    var userId = sessionRes.data && sessionRes.data.session && sessionRes.data.session.user && sessionRes.data.session.user.id;
    if (!userId) return;
    /* Re-fetch is_premium from candidates table — explicit user_id filter as defense-in-depth */
    var res = await supabase.from('candidates').select('is_premium, premium_until').eq('user_id', userId).maybeSingle();
    if (res.data && typeof _loadedDBData !== 'undefined' && _loadedDBData && _loadedDBData.profile) {
      _loadedDBData.profile.is_premium = res.data.is_premium === true;
      _loadedDBData.profile.premium_until = res.data.premium_until;
    }
  } catch (e) { /* silent */ }
}

/* ════════════════════════════════════════════════
   LAZY LOADER
   ════════════════════════════════════════════════ */

window._htLoadPremium = function() {
  if (_loaded) return;
  _loaded = true;
  injectCSS();
  render();
};

})();
