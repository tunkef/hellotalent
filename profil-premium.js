/**
 * profil-premium.js — Premium Features Panel for profil.html
 * Bento grid layout, feature showcase, subscription CTA.
 * All content from hardcoded constants — no user input, no XSS risk.
 */
(function(){
'use strict';

var _loaded = false;

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
   ════════════════════════════════════════════════ */

function injectCSS() {
  if (document.getElementById('pm-style')) return;
  var css = '';

  css += '#pm-container{max-width:100%;padding:0 0 40px}';

  /* Feature cards */
  css += '.pm-feature{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:22px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .25s;animation:pmSlideUp .35s ease both}';
  css += '.pm-feature:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.1)}';
  css += '.pm-feature-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}';
  css += '.pm-feature-icon.verm{background:rgba(201,78,40,.08);color:var(--verm,#C94E28)}';
  css += '.pm-feature-icon.navy{background:rgba(30,45,94,.08);color:var(--navy,#1E2D5E)}';
  css += '.pm-feature-icon svg{width:22px;height:22px}';
  css += '.pm-feature-title{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.pm-feature-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5}';

  /* Bento grid */
  css += '.pm-bento{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px}';
  css += '.pm-bento .pm-feature:nth-child(1){grid-column:span 2}';
  css += '.pm-bento .pm-feature:nth-child(4){grid-column:span 2}';

  /* Plans section */
  css += '.pm-plans{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px}';
  css += '.pm-plan{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);text-align:center;transition:all .25s;animation:pmSlideUp .35s ease both}';
  css += '.pm-plan:hover{transform:translateY(-2px)}';
  css += '.pm-plan.highlight{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:1px solid rgba(255,255,255,.1);color:#fff}';
  css += '.pm-plan-badge{display:inline-block;font-family:"DM Mono",monospace;font-size:9px;font-weight:700;padding:2px 10px;border-radius:4px;background:var(--verm,#C94E28);color:#fff;letter-spacing:.5px;margin-bottom:12px}';
  css += '.pm-plan-name{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;margin-bottom:8px}';
  css += '.pm-plan-price{font-family:"DM Mono",monospace;font-size:32px;font-weight:800;line-height:1}';
  css += '.pm-plan-price span{font-size:14px;font-weight:400;opacity:.6}';
  css += '.pm-plan-period{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:4px}';
  css += '.pm-plan.highlight .pm-plan-period{color:rgba(255,255,255,.6)}';
  css += '.pm-plan-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.4;margin-top:12px}';
  css += '.pm-plan.highlight .pm-plan-desc{color:rgba(255,255,255,.7)}';
  css += '.pm-plan-cta{display:block;width:100%;margin-top:16px;padding:10px;border-radius:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:opacity .15s}';
  css += '.pm-plan-cta.verm{background:var(--verm,#C94E28);color:#fff}';
  css += '.pm-plan-cta.outline{background:transparent;color:var(--text-primary,#111);border:1.5px solid var(--border-subtle,#E5E3DF)}';
  css += '.pm-plan.highlight .pm-plan-cta.outline{color:#fff;border-color:rgba(255,255,255,.3)}';
  css += '.pm-plan-cta:hover{opacity:.85}';

  /* Section titles */
  css += '.pm-section-title{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:800;color:var(--text-primary,#111);margin-bottom:12px}';

  /* Animation */
  css += '@keyframes pmSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  css += '.pm-bento .pm-feature:nth-child(1){animation-delay:0s}.pm-bento .pm-feature:nth-child(2){animation-delay:.05s}.pm-bento .pm-feature:nth-child(3){animation-delay:.1s}.pm-bento .pm-feature:nth-child(4){animation-delay:.15s}.pm-bento .pm-feature:nth-child(5){animation-delay:.2s}.pm-bento .pm-feature:nth-child(6){animation-delay:.25s}';
  css += '.pm-plans .pm-plan:nth-child(1){animation-delay:.1s}.pm-plans .pm-plan:nth-child(2){animation-delay:.15s}.pm-plans .pm-plan:nth-child(3){animation-delay:.2s}';

  /* Responsive */
  css += '@media(max-width:768px){.pm-bento{grid-template-columns:1fr}.pm-bento .pm-feature:nth-child(1),.pm-bento .pm-feature:nth-child(4){grid-column:span 1}.pm-plans{grid-template-columns:1fr}}';

  var el = document.createElement('style');
  el.id = 'pm-style';
  el.textContent = css;
  document.head.appendChild(el);
}

/* ════════════════════════════════════════════════
   RENDER
   ════════════════════════════════════════════════ */

function render() {
  var panel = document.getElementById('panel-premium');
  if (!panel) return;

  var html = '';

  /* Hero */
  html += '<div class="g-hero"><div class="g-hero-inner" style="justify-content:space-between;">';
  html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:20px;font-weight:800;color:#fff;display:flex;align-items:center;gap:10px;">';
  html += '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style="color:#fff;"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1H5v1z" opacity=".5"/></svg>';
  html += 'Premium';
  html += '</div></div></div>';

  html += '<div id="pm-container">';

  /* Features section */
  html += '<div class="pm-section-title">Premium Avantajlar\u0131</div>';
  html += '<div class="pm-bento">';
  for (var i = 0; i < FEATURES.length; i++) {
    var f = FEATURES[i];
    html += '<div class="pm-feature">';
    html += '<div class="pm-feature-icon ' + f.color + '">' + f.icon + '</div>';
    html += '<div class="pm-feature-title">' + f.title + '</div>';
    html += '<div class="pm-feature-desc">' + f.desc + '</div>';
    html += '</div>';
  }
  html += '</div>';

  /* Plans section */
  html += '<div class="pm-section-title">Plan Se\u00E7</div>';
  html += '<div class="pm-plans">';
  for (var j = 0; j < PLANS.length; j++) {
    var p = PLANS[j];
    html += '<div class="pm-plan' + (p.highlight ? ' highlight' : '') + '">';
    if (p.highlight) html += '<div class="pm-plan-badge">EN POP\u00DCLER</div>';
    html += '<div class="pm-plan-name">' + p.name + '</div>';
    html += '<div class="pm-plan-price">' + p.price + '<span> TL</span></div>';
    html += '<div class="pm-plan-period">' + p.period + '</div>';
    if (p.annual) html += '<div class="pm-plan-annual" style="font-size:11px;color:var(--muted);margin-top:2px;">' + p.annual + '</div>';
    html += '<div class="pm-plan-desc">' + p.desc + '</div>';
    html += '<button class="pm-plan-cta ' + (p.highlight ? 'verm' : 'outline') + '">' + (p.highlight ? 'Hemen Ba\u015Fla' : 'Se\u00E7') + '</button>';
    html += '</div>';
  }
  html += '</div>';

  html += '</div>';

  /* Safe: all content from hardcoded FEATURES/PLANS constants */
  panel.textContent = '';
  panel.insertAdjacentHTML('afterbegin', html);
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
