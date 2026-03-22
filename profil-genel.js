/* global _loadedDBData, currentUser, supabase, switchPanel, calculateCompletion, val, canonicalizeRole, normalizeForDisplay, formatBrandDisplay */
// ═══════════════════════════════════════════════════
// profil-genel.js — Genel Bakis Home/Feed Surface
// Renders the authenticated candidate home: left rail (identity,
// viewers summary, premium CTA), center feed (coach articles),
// right rail (teklifler + markalar teasers).
// Depends on: profil-core.js, profil-summary.js, profil-ui.js globals,
//   window._htGenelTeklifTeaser (profil-teklifler.js),
//   window._htGenelMarkaTeaser (profil-markalar.js),
//   window._htBrandFollowReady + window.toggleBrandFollow (profil-markalar.js)
// SECURITY: All innerHTML assignments use only hardcoded SVG
// constants — no user data is rendered via innerHTML. All user
// data uses textContent for XSS safety.
// ═══════════════════════════════════════════════════
(function() {
  'use strict';

  var _genelLoaded = false;

  /* ── Utility ── */
  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function txt(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  /* Create element with safe SVG innerHTML (hardcoded constants only) */
  function elSVG(tag, cls, safeSVG) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    /* Safe: only called with hardcoded SVG string constants defined below */
    e.innerHTML = safeSVG;
    return e;
  }

  /* ── CSS Injection ── */
  function injectCSS() {
    if (document.getElementById('gh-style')) return;
    var css = '';

    /* Layout shell */
    css += '.gh-layout{display:grid;grid-template-columns:280px 1fr 280px;gap:24px;align-items:start}';
    css += '@media(max-width:1100px){.gh-layout{grid-template-columns:260px 1fr;}.gh-right{display:contents}}';
    css += '@media(max-width:768px){.gh-layout{grid-template-columns:1fr;gap:16px}}';

    /* Rails */
    css += '.gh-left{display:flex;flex-direction:column;gap:16px;position:sticky;top:24px}';
    css += '.gh-center{display:flex;flex-direction:column;gap:20px;min-width:0}';
    css += '.gh-right{display:flex;flex-direction:column;gap:16px;position:sticky;top:24px}';
    css += '@media(max-width:768px){.gh-left,.gh-right{position:static}}';

    /* ── Identity card ── */
    css += '.gh-id-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
    css += '.gh-id-top{display:flex;align-items:center;gap:14px;margin-bottom:14px}';
    css += '.gh-id-avatar{width:56px;height:56px;border-radius:50%;background:var(--navy,#1E2D5E);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;flex-shrink:0;overflow:hidden}';
    css += '.gh-id-avatar img{width:100%;height:100%;object-fit:cover}';
    /* Beni Oner active glow — matches repo-native .g-avatar.glow-active recipe */
    css += '.gh-id-avatar--glow{box-shadow:0 0 0 3px #22C55E,0 0 12px 4px rgba(34,197,94,0.6),0 0 24px 8px rgba(34,197,94,0.3);transition:box-shadow 0.4s ease}';
    css += '.gh-id-name{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:800;color:var(--text-primary,#111);line-height:1.2}';
    css += '.gh-id-role{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);margin-top:2px;line-height:1.3}';
    css += '.gh-id-city{display:flex;align-items:center;gap:4px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:4px}';
    css += '.gh-id-city svg{width:12px;height:12px;flex-shrink:0}';
    css += '.gh-id-completion{display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border-subtle,#E5E3DF)}';
    css += '.gh-id-bar-track{flex:1;height:6px;background:var(--border-subtle,#E5E3DF);border-radius:3px;overflow:hidden}';
    css += '.gh-id-bar-fill{height:100%;background:var(--verm,#C94E28);border-radius:3px;transition:width .4s ease}';
    css += '.gh-id-bar-pct{font-family:"DM Mono",monospace;font-size:11px;font-weight:600;color:var(--text-muted,#6B7280);min-width:28px;text-align:right}';
    css += '.gh-id-badges{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}';
    css += '.gh-id-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:600;letter-spacing:.2px}';
    css += '.gh-id-badge--on{background:#ECFDF5;color:#059669;border:1px solid #A7F3D0}';
    css += '.gh-id-badge--off{background:var(--bg,#F7F6F4);color:var(--text-muted,#6B7280);border:1px solid var(--border-subtle,#E5E3DF)}';
    css += '.gh-id-badge-dot{width:6px;height:6px;border-radius:50%}';
    css += '.gh-id-badge-dot--on{background:#10B981}';
    css += '.gh-id-badge-dot--off{background:var(--text-muted,#6B7280);opacity:.4}';
    css += '.gh-id-cta{display:block;width:100%;margin-top:14px;padding:10px 0;border:none;border-radius:10px;background:var(--verm,#C94E28);color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .2s;text-align:center}';
    css += '.gh-id-cta:hover{opacity:.85}';

    /* ── Viewers summary card ── */
    css += '.gh-viewers{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);cursor:pointer;transition:all .25s}';
    css += '.gh-viewers:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.1)}';
    css += '.gh-viewers-title{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:10px}';
    css += '.gh-viewers-row{display:flex;align-items:baseline;gap:6px}';
    css += '.gh-viewers-num{font-family:"DM Mono",monospace;font-size:28px;font-weight:800;color:var(--text-primary,#111);line-height:1}';
    css += '.gh-viewers-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)}';
    css += '.gh-viewers-sub{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:6px}';
    css += '.gh-viewers-cta{display:inline-flex;align-items:center;gap:4px;margin-top:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:700;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:0}';
    css += '.gh-viewers-cta svg{width:14px;height:14px}';

    /* ── Premium CTA card ── */
    css += '.gh-premium{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);cursor:pointer;transition:all .25s}';
    css += '.gh-premium:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(30,45,94,.3)}';
    css += '.gh-premium-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,.12);margin-bottom:10px}';
    css += '.gh-premium-badge svg{width:14px;height:14px;color:#F59E0B}';
    css += '.gh-premium-badge span{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.3px}';
    css += '.gh-premium-list{list-style:none;padding:0;margin:0 0 14px}';
    css += '.gh-premium-list li{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:rgba(255,255,255,.75);padding:3px 0;padding-left:14px;position:relative;line-height:1.4}';
    css += '.gh-premium-list li::before{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.3)}';
    css += '.gh-premium-cta{display:block;width:100%;padding:9px 0;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;text-align:center}';
    css += '.gh-premium-cta:hover{background:rgba(255,255,255,.1)}';

    /* ── Feed header text (reused inside coach header card) ── */
    css += '.gh-feed-title{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:800;color:var(--text-primary,#111)}';
    css += '.gh-feed-sub{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);margin-top:2px;line-height:1.4}';
    css += '.gh-feed-seeall{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:700;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:4px 0;white-space:nowrap;flex-shrink:0}';
    css += '.gh-feed-seeall:hover{text-decoration:underline}';

    /* ── Featured article card ── */
    css += '.gh-featured{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .25s;cursor:pointer}';
    css += '.gh-featured:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.1)}';
    css += '.gh-featured-body{padding:22px 24px}';
    css += '.gh-featured-cat{display:inline-block;padding:3px 10px;border-radius:20px;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:700;background:var(--verm-light,#F5EDE9);color:var(--verm,#C94E28);margin-bottom:10px;letter-spacing:.2px}';
    css += '.gh-featured-title{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;color:var(--text-primary,#111);line-height:1.3;margin-bottom:8px}';
    css += '.gh-featured-excerpt{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:12px}';
    css += '.gh-featured-meta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}';
    css += '.gh-featured-author{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)}';
    css += '.gh-featured-pills{display:flex;align-items:center;gap:8px;flex-wrap:wrap}';
    css += '.gh-role-pill{display:inline-block;padding:2px 8px;border-radius:20px;font-family:"Plus Jakarta Sans",sans-serif;font-size:9px;font-weight:600;background:var(--navy-light,#EEF0F7);color:var(--navy,#1E2D5E);letter-spacing:.2px}';
    css += '.gh-like-count{display:inline-flex;align-items:center;gap:3px;font-family:"DM Mono",monospace;font-size:11px;color:var(--text-muted,#6B7280)}';
    css += '.gh-like-count svg{width:13px;height:13px}';
    css += '.gh-featured-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}';
    css += '.gh-btn-primary{padding:9px 18px;border-radius:10px;border:none;background:var(--verm,#C94E28);color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .2s}';
    css += '.gh-btn-primary:hover{opacity:.85}';
    css += '.gh-btn-secondary{padding:9px 18px;border-radius:10px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);color:var(--text-primary,#111);font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}';
    css += '.gh-btn-secondary:hover{border-color:var(--navy,#1E2D5E);color:var(--navy,#1E2D5E)}';

    /* ── Teaser article cards ── */
    css += '.gh-teaser{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:18px 22px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .25s;cursor:pointer}';
    css += '.gh-teaser:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.1)}';
    css += '.gh-teaser-cat{display:inline-block;padding:2px 8px;border-radius:20px;font-family:"Plus Jakarta Sans",sans-serif;font-size:9px;font-weight:700;background:var(--verm-light,#F5EDE9);color:var(--verm,#C94E28);margin-bottom:8px;letter-spacing:.2px}';
    css += '.gh-teaser-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);line-height:1.3;margin-bottom:4px}';
    css += '.gh-teaser-excerpt{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:8px}';
    css += '.gh-teaser-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}';
    css += '.gh-teaser-author{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280)}';
    css += '.gh-teaser-right{display:flex;align-items:center;gap:8px}';
    css += '.gh-teaser-read{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:700;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:0}';
    css += '.gh-teaser-read:hover{text-decoration:underline}';

    /* ── Right rail cards ── */
    css += '.gh-rail-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
    css += '.gh-rail-title{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:12px}';
    css += '.gh-rail-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)}';
    css += '.gh-rail-item:last-child{border-bottom:none}';
    css += '.gh-rail-item-title{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111);line-height:1.3}';
    css += '.gh-rail-item-sub{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);margin-top:2px;line-height:1.3}';
    css += '.gh-rail-item-brand{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);margin-top:1px}';
    css += '.gh-rail-type-badge{display:inline-block;padding:1px 6px;border-radius:4px;font-family:"Plus Jakarta Sans",sans-serif;font-size:9px;font-weight:700;flex-shrink:0;margin-top:2px}';
    css += '.gh-rail-footer{margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle,#E5E3DF)}';
    css += '.gh-rail-footer-cta{display:flex;align-items:center;gap:4px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:700;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:0}';
    css += '.gh-rail-footer-cta:hover{text-decoration:underline}';
    css += '.gh-rail-footer-cta svg{width:14px;height:14px}';

    /* ── Brand teaser items ── */
    css += '.gh-brand-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)}';
    css += '.gh-brand-item:last-child{border-bottom:none}';
    css += '.gh-brand-logo{width:36px;height:36px;border-radius:10px;background:var(--bg,#F7F6F4);display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:800;color:var(--navy,#1E2D5E);border:1px solid var(--border-subtle,#E5E3DF);flex-shrink:0;overflow:hidden}';
    css += '.gh-brand-logo img{width:100%;height:100%;object-fit:contain}';
    css += '.gh-brand-info{flex:1;min-width:0}';
    css += '.gh-brand-name{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111)}';
    css += '.gh-brand-seg{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);margin-top:1px}';

    /* ── Brand follow button ── */
    css += '.gh-brand-follow{padding:4px 12px;border-radius:20px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:700;color:var(--verm,#C94E28);cursor:pointer;transition:all .15s;flex-shrink:0}';
    css += '.gh-brand-follow:hover{border-color:var(--verm,#C94E28);background:var(--verm-light,#F5EDE9)}';
    css += '.gh-brand-follow--active{background:var(--verm,#C94E28);color:#fff;border-color:var(--verm,#C94E28)}';
    css += '.gh-brand-follow--active:hover{opacity:.85;background:var(--verm,#C94E28)}';

    /* ── Coach header card (editorial bento block) ── */
    css += '.gh-coach-header{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);overflow:hidden}';
    css += '.gh-coach-header-stripe{height:4px;background:var(--verm,#C94E28)}';
    css += '.gh-coach-header-inner{display:grid;grid-template-columns:1fr auto;gap:16px;padding:18px 24px 20px;align-items:end}';
    css += '.gh-coach-header-left{min-width:0}';
    css += '.gh-coach-kicker{font-family:"DM Mono",monospace;font-size:10px;font-weight:600;color:var(--verm,#C94E28);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}';
    css += '.gh-feed-sub{max-width:300px;margin-top:4px}';
    css += '.gh-coach-header-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px}';
    css += '@media(max-width:480px){.gh-coach-header-inner{grid-template-columns:1fr;gap:12px}.gh-coach-header-right{flex-direction:row;align-items:center;gap:8px}}';

    /* ── Empty / onboarding adaptation ── */
    css += '.gh-empty-prompt{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:28px 24px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);text-align:center}';
    css += '.gh-empty-icon{font-size:48px;margin-bottom:12px;opacity:.6}';
    css += '.gh-empty-title{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;color:var(--text-primary,#111);margin-bottom:6px}';
    css += '.gh-empty-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);line-height:1.5;margin-bottom:16px;max-width:360px;margin-left:auto;margin-right:auto}';

    /* ── Slide-up animation ── */
    css += '@keyframes ghSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}';
    css += '.gh-animate{animation:ghSlideUp .35s ease both}';
    css += '.gh-animate:nth-child(1){animation-delay:0s}.gh-animate:nth-child(2){animation-delay:.05s}.gh-animate:nth-child(3){animation-delay:.1s}.gh-animate:nth-child(4){animation-delay:.15s}.gh-animate:nth-child(5){animation-delay:.2s}';

    /* ── Brand teaser empty state ── */
    css += '.gh-brand-empty{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);text-align:center;padding:16px 8px;line-height:1.5}';

    /* ── Feed body container ── */
    css += '.gh-feed-body{display:flex;flex-direction:column;gap:16px}';

    /* ── Feed empty state ── */
    css += '.gh-feed-empty{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);text-align:center;padding:32px 16px;line-height:1.5}';

    var styleEl = document.createElement('style');
    styleEl.id = 'gh-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  /* ── SVG constants (hardcoded, safe for innerHTML) ── */
  var arrowSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var heartSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
  var crownSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1H5v1z" opacity=".5"/></svg>';
  var pinSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  var COACH_CAT_LABELS = {
    mulakat_ipucu: 'M\u00FClakat \u0130pucu',
    yetkinlik_rehberi: 'Yetkinlik Rehberi',
    kariyer_gelisim_onerileri: 'Kariyer Geli\u015Fim',
    performans: 'Performans',
    kariyer_hikayesi: 'Kariyer Hikayesi',
    sektor_analizi: 'Sekt\u00F6r Analizi',
    kariyer_hikaye: 'Kariyer Hikayesi',
    sektor_analiz: 'Sekt\u00F6r Analizi'
  };

  var SEGMENT_TR = { luxury: 'L\u00FCKS', premium: 'Premium', mid: 'Moda', sportswear: 'Spor', beauty: 'G\u00FCzellik', tech: 'Teknoloji' };

  var TEKL_TYPE = {
    offer: { label: 'Teklif', bg: '#ECFDF5', color: '#059669' },
    employer_branding: { label: '\u0130\u015Fveren Markas\u0131', bg: '#EEF2FF', color: '#1E2D5E' },
    hiring_boost: { label: '\u0130\u015Fe Al\u0131m', bg: '#FEF7F5', color: '#C94E28' }
  };

  /* ═══════════════════════════════════════════════════
     BUILD SECTIONS
     ═══════════════════════════════════════════════════ */

  function buildIdentityCard(profile, experiences) {
    var card = el('div', 'gh-id-card gh-animate');

    /* Top: avatar + name/role */
    var top = el('div', 'gh-id-top');
    var isActive = profile.is_active === true;
    var avatar = el('div', 'gh-id-avatar' + (isActive ? ' gh-id-avatar--glow' : ''));
    var avatarUrl = profile.avatar_url || null;
    if (avatarUrl) {
      var img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = '';
      avatar.appendChild(img);
    } else {
      var fullName = profile.full_name || '';
      var initials = fullName.split(/\s+/).map(function(w) { return w.charAt(0).toUpperCase(); }).join('').substring(0, 2);
      avatar.textContent = initials || '?';
    }
    top.appendChild(avatar);

    var info = el('div', '');
    info.appendChild(txt('div', 'gh-id-name', profile.full_name || '\u2014'));

    /* Role + company from latest experience */
    var roleText = '';
    if (experiences && experiences.length > 0) {
      var latest = experiences[0];
      var rawRole = latest.pozisyon || '';
      var roleMatch = typeof canonicalizeRole === 'function' ? canonicalizeRole(rawRole) : null;
      roleText = roleMatch ? roleMatch.display : (typeof normalizeForDisplay === 'function' ? normalizeForDisplay(rawRole) : rawRole);
      var brandName = latest.marka || '';
      var companyName = latest.sirket_adi || latest.sirket || '';
      var compDisplay = '';
      if (typeof formatBrandDisplay === 'function') {
        compDisplay = formatBrandDisplay(brandName, companyName) || (typeof normalizeForDisplay === 'function' ? normalizeForDisplay(companyName) : companyName);
      } else {
        compDisplay = brandName || companyName;
      }
      if (compDisplay && roleText) roleText += ' \u00B7 ' + compDisplay;
      else if (compDisplay) roleText = compDisplay;
    }
    if (roleText) {
      info.appendChild(txt('div', 'gh-id-role', roleText));
    }

    /* City */
    var city = profile.adres_il || '';
    if (city) {
      /* Safe: pinSVG is a hardcoded constant */
      var cityEl = elSVG('div', 'gh-id-city', pinSVG);
      cityEl.appendChild(document.createTextNode(' ' + city));
      info.appendChild(cityEl);
    }
    top.appendChild(info);
    card.appendChild(top);

    /* Completion bar */
    var pct = typeof calculateCompletion === 'function' ? calculateCompletion() : 0;
    var compRow = el('div', 'gh-id-completion');
    var track = el('div', 'gh-id-bar-track');
    var fill = el('div', 'gh-id-bar-fill');
    fill.style.width = pct + '%';
    track.appendChild(fill);
    compRow.appendChild(track);
    compRow.appendChild(txt('span', 'gh-id-bar-pct', pct + '%'));
    card.appendChild(compRow);

    /* Status badge — only Aktif İş Arıyor, only when true (glow handles Beni Öner) */
    var isLooking = profile.is_actively_looking === true;
    if (isLooking) {
      var badges = el('div', 'gh-id-badges');
      badges.appendChild(buildBadge('Aktif \u0130\u015F Ar\u0131yor', true));
      card.appendChild(badges);
    }

    /* CTA */
    var cta = txt('button', 'gh-id-cta', 'Profili D\u00FCzenle');
    cta.type = 'button';
    cta.addEventListener('click', function() { switchPanel('merkez'); });
    card.appendChild(cta);

    return card;
  }

  function buildBadge(label, isOn) {
    var b = el('div', 'gh-id-badge ' + (isOn ? 'gh-id-badge--on' : 'gh-id-badge--off'));
    var dot = el('span', 'gh-id-badge-dot ' + (isOn ? 'gh-id-badge-dot--on' : 'gh-id-badge-dot--off'));
    b.appendChild(dot);
    b.appendChild(document.createTextNode(' ' + label));
    return b;
  }

  function buildViewersSummary() {
    var card = el('div', 'gh-viewers gh-animate');
    card.appendChild(txt('div', 'gh-viewers-title', 'Profiline Bakanlar'));

    var row = el('div', 'gh-viewers-row');
    row.appendChild(txt('span', 'gh-viewers-num', '0'));
    row.appendChild(txt('span', 'gh-viewers-label', 'g\u00F6r\u00FCnt\u00FClenme'));
    card.appendChild(row);

    card.appendChild(txt('div', 'gh-viewers-sub', 'Profilin g\u00F6r\u00FCnt\u00FClendi\u011Finde burada g\u00F6r\u00FCrs\u00FCn'));

    /* Safe: arrowSVG is hardcoded constant */
    var cta = elSVG('button', 'gh-viewers-cta', 'Detaylar\u0131 G\u00F6r ' + arrowSVG);
    cta.type = 'button';
    cta.addEventListener('click', function(ev) { ev.stopPropagation(); switchPanel('kimbakti'); });
    card.appendChild(cta);

    card.addEventListener('click', function() { switchPanel('kimbakti'); });

    /* Async hydrate from DB */
    hydrateViewersSummary(card);

    return card;
  }

  async function hydrateViewersSummary(card) {
    try {
      var candidateId = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile.id : null;
      if (!candidateId && currentUser) {
        var cr = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).maybeSingle();
        if (cr.data) candidateId = cr.data.id;
      }
      if (!candidateId) return;

      var res = await supabase.from('candidate_view_stats').select('total_views, last_viewed_at').eq('candidate_id', candidateId).maybeSingle();

      var numEl = card.querySelector('.gh-viewers-num');
      if (numEl) numEl.textContent = String(res.data ? (res.data.total_views || 0) : 0);

      if (res.data && res.data.last_viewed_at) {
        var subEl = card.querySelector('.gh-viewers-sub');
        if (subEl) subEl.textContent = 'Son: ' + relativeTimeTR(res.data.last_viewed_at);
      }
    } catch (e) {
      console.error('[HT] Genel viewers hydrate:', e.message);
    }
  }

  function relativeTimeTR(isoStr) {
    var d = new Date(isoStr);
    var now = new Date();
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'az \u00F6nce';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk \u00F6nce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat \u00F6nce';
    var days = Math.floor(diff / 86400);
    if (days === 1) return 'd\u00FCn';
    if (days < 7) return days + ' g\u00FCn \u00F6nce';
    if (days < 30) return Math.floor(days / 7) + ' hafta \u00F6nce';
    return Math.floor(days / 30) + ' ay \u00F6nce';
  }

  function buildPremiumCTA() {
    var card = el('div', 'gh-premium gh-animate');

    /* Safe: crownSVG is hardcoded constant */
    var badge = el('div', 'gh-premium-badge');
    var badgeIcon = elSVG('span', '', crownSVG);
    badgeIcon.style.display = 'inline-flex';
    badge.appendChild(badgeIcon);
    badge.appendChild(txt('span', '', 'PREMIUM'));
    card.appendChild(badge);

    var list = el('ul', 'gh-premium-list');
    ['\u00D6ne \u00E7\u0131k, markalar seni \u00F6nce g\u00F6rs\u00FCn',
     'AI CV ara\u00E7lar\u0131yla fark yarat',
     'Ko\u00E7 i\u00E7g\u00F6r\u00FCleriyle haz\u0131rlan'
    ].forEach(function(t) {
      list.appendChild(txt('li', '', t));
    });
    card.appendChild(list);

    var cta = txt('button', 'gh-premium-cta', 'Premium\'u \u0130ncele');
    cta.type = 'button';
    cta.addEventListener('click', function(e) { e.stopPropagation(); switchPanel('premium'); });
    card.appendChild(cta);

    card.addEventListener('click', function() { switchPanel('premium'); });

    return card;
  }

  /* ═══════════════════════════════════════════════════
     CENTER FEED
     ═══════════════════════════════════════════════════ */

  function buildFeedSection() {
    var section = el('div', 'gh-center');

    /* Coach header card — editorial bento block */
    var hdr = el('div', 'gh-coach-header gh-animate');
    hdr.appendChild(el('div', 'gh-coach-header-stripe'));
    var hdrInner = el('div', 'gh-coach-header-inner');
    var hdrLeft = el('div', 'gh-coach-header-left');
    hdrLeft.appendChild(txt('div', 'gh-coach-kicker', 'ED\u0130T\u00D6R SE\u00C7K\u0130S\u0130'));
    hdrLeft.appendChild(txt('div', 'gh-feed-title', 'Ko\u00E7lardan \u00D6\u011Fren'));
    hdrLeft.appendChild(txt('div', 'gh-feed-sub', 'Perakende kariyerinde \u00F6ne \u00E7\u0131kmak i\u00E7in uzman i\u00E7g\u00F6r\u00FCleri'));
    hdrInner.appendChild(hdrLeft);
    var hdrRight = el('div', 'gh-coach-header-right');
    var practiceBtn = txt('button', 'gh-btn-primary', 'Bug\u00FCn 5 dk \u00E7al\u0131\u015F');
    practiceBtn.type = 'button';
    practiceBtn.addEventListener('click', function() { switchPanel('mulakat'); });
    hdrRight.appendChild(practiceBtn);
    var seeAll = txt('button', 'gh-feed-seeall', 'T\u00FCm\u00FCn\u00FC G\u00F6r \u2192');
    seeAll.type = 'button';
    seeAll.addEventListener('click', function() { switchPanel('mulakat'); });
    hdrRight.appendChild(seeAll);
    hdrInner.appendChild(hdrRight);
    hdr.appendChild(hdrInner);
    section.appendChild(hdr);

    /* Feed body — will be hydrated with article cards */
    var feedContainer = el('div', 'gh-feed-body');
    feedContainer.id = 'gh-feed-container';
    section.appendChild(feedContainer);

    return section;
  }

  async function fetchCoachPosts() {
    /* Always fetch the full published stream directly — never cap by Mulakat cache */
    var posts = [];
    var likedSet = {};
    var postsRes = await supabase
      .from('coach_posts')
      .select('id, title, excerpt, category, like_count, related_role, body, coach_profiles(display_name, title)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    posts = (postsRes.data && postsRes.data.length) ? postsRes.data : [];

    if (posts.length > 0 && currentUser) {
      var postIds = posts.map(function(p) { return p.id; });
      var likesRes = await supabase
        .from('coach_post_likes')
        .select('post_id')
        .in('post_id', postIds);
      if (likesRes.data) {
        for (var i = 0; i < likesRes.data.length; i++) {
          likedSet[likesRes.data[i].post_id] = true;
        }
      }
    }
    return { posts: posts, likedSet: likedSet };
  }

  async function hydrateFeed() {
    var container = document.getElementById('gh-feed-container');
    if (!container) return;

    try {
      var data = await fetchCoachPosts();
      var posts = data.posts;

      if (posts.length === 0) {
        container.appendChild(txt('div', 'gh-feed-empty', 'Hen\u00FCz yay\u0131nlanm\u0131\u015F ko\u00E7 i\u00E7eri\u011Fi yok.\nYak\u0131nda perakende uzmanlar\u0131ndan i\u00E7erikler burada olacak.'));
        return;
      }

      /* Featured card (newest post) */
      container.appendChild(buildFeaturedCard(posts[0]));

      /* Remaining posts as teaser cards (continuous editorial stream) */
      for (var t = 1; t < posts.length; t++) {
        container.appendChild(buildTeaserCard(posts[t]));
      }

    } catch (e) {
      console.error('[HT] Genel feed hydrate:', e.message);
      container.appendChild(txt('div', 'gh-feed-empty', '\u0130\u00E7erikler y\u00FCklenemedi.'));
    }
  }

  function buildFeaturedCard(post) {
    var card = el('div', 'gh-featured gh-animate');
    var body = el('div', 'gh-featured-body');

    body.appendChild(txt('span', 'gh-featured-cat', COACH_CAT_LABELS[post.category] || post.category));
    body.appendChild(txt('div', 'gh-featured-title', post.title));
    if (post.excerpt) {
      body.appendChild(txt('div', 'gh-featured-excerpt', post.excerpt));
    }

    /* Meta row */
    var meta = el('div', 'gh-featured-meta');
    var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
    var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
    var authorText = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');
    if (authorText) meta.appendChild(txt('span', 'gh-featured-author', authorText));

    var pills = el('div', 'gh-featured-pills');
    if (post.related_role) {
      pills.appendChild(txt('span', 'gh-role-pill', post.related_role));
    }
    /* Safe: heartSVG is hardcoded constant, like_count is a number */
    var likeEl = elSVG('span', 'gh-like-count', heartSVG);
    likeEl.appendChild(txt('span', '', ' ' + (post.like_count || 0)));
    pills.appendChild(likeEl);
    meta.appendChild(pills);
    body.appendChild(meta);

    /* Actions */
    var actions = el('div', 'gh-featured-actions');
    var openBtn = txt('button', 'gh-btn-primary', 'Yaz\u0131y\u0131 A\u00E7');
    openBtn.type = 'button';
    openBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openArticleInCoach(post);
    });
    actions.appendChild(openBtn);

    if (post.related_role && typeof window._htLoadMulakat === 'function') {
      var practiceBtn = txt('button', 'gh-btn-secondary', 'Bu konuyu \u015Fimdi \u00E7al\u0131\u015F');
      practiceBtn.type = 'button';
      practiceBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        switchPanel('mulakat');
      });
      actions.appendChild(practiceBtn);
    }
    body.appendChild(actions);

    card.appendChild(body);
    card.addEventListener('click', function() { openArticleInCoach(post); });

    return card;
  }

  function buildTeaserCard(post) {
    var card = el('div', 'gh-teaser gh-animate');

    card.appendChild(txt('span', 'gh-teaser-cat', COACH_CAT_LABELS[post.category] || post.category));
    card.appendChild(txt('div', 'gh-teaser-title', post.title));
    if (post.excerpt) card.appendChild(txt('div', 'gh-teaser-excerpt', post.excerpt));

    var footer = el('div', 'gh-teaser-footer');
    var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
    var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
    if (coachName) footer.appendChild(txt('span', 'gh-teaser-author', coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '')));

    var right = el('div', 'gh-teaser-right');
    if (post.related_role) right.appendChild(txt('span', 'gh-role-pill', post.related_role));
    /* Safe: heartSVG is hardcoded constant */
    var likeEl = elSVG('span', 'gh-like-count', heartSVG);
    likeEl.appendChild(txt('span', '', ' ' + (post.like_count || 0)));
    right.appendChild(likeEl);
    var readBtn = txt('button', 'gh-teaser-read', 'Oku');
    readBtn.type = 'button';
    readBtn.addEventListener('click', function(e) { e.stopPropagation(); openArticleInCoach(post); });
    right.appendChild(readBtn);
    footer.appendChild(right);

    card.appendChild(footer);
    card.addEventListener('click', function() { openArticleInCoach(post); });

    return card;
  }

  function openArticleInCoach(post) {
    switchPanel('mulakat');
    setTimeout(function() {
      if (typeof window.openCoachDetail === 'function') {
        window.openCoachDetail(post, false);
      }
    }, 500);
  }

  /* ═══════════════════════════════════════════════════
     RIGHT RAIL
     ═══════════════════════════════════════════════════ */

  function buildRightRail() {
    var rail = el('div', 'gh-right');
    rail.appendChild(buildTekliflerTeaser());
    rail.appendChild(buildMarkaTeaser());
    return rail;
  }

  function buildTekliflerTeaser() {
    var card = el('div', 'gh-rail-card gh-animate');
    card.appendChild(txt('div', 'gh-rail-title', 'Teklifler'));

    var listEl = el('div', '');
    listEl.id = 'gh-teklifler-list';

    var items = [];
    if (typeof window._htGenelTeklifTeaser === 'function') {
      items = window._htGenelTeklifTeaser();
    }
    if (!items || items.length === 0) {
      items = [
        { title: 'Yaz Sezonu Ekip Arkada\u015F\u0131 Ar\u0131yoruz', company_name: 'Beymen', campaign_type: 'hiring_boost' },
        { title: '%20 \u0130ndirim Kuponu', company_name: 'Zara', campaign_type: 'offer' },
        { title: 'Bizimle Tan\u0131\u015F\u0131n', company_name: 'Vakko', campaign_type: 'employer_branding' }
      ];
    }
    items.slice(0, 3).forEach(function(item) {
      var row = el('div', 'gh-rail-item');
      var typeInfo = TEKL_TYPE[item.campaign_type] || TEKL_TYPE.offer;
      var badge = txt('span', 'gh-rail-type-badge', typeInfo.label);
      badge.style.background = typeInfo.bg;
      badge.style.color = typeInfo.color;

      var textCol = el('div', '');
      textCol.style.flex = '1';
      textCol.style.minWidth = '0';
      textCol.appendChild(txt('div', 'gh-rail-item-title', item.title));
      if (item.company_name) textCol.appendChild(txt('div', 'gh-rail-item-brand', item.company_name));
      row.appendChild(textCol);
      row.appendChild(badge);
      listEl.appendChild(row);
    });
    card.appendChild(listEl);

    var footer = el('div', 'gh-rail-footer');
    /* Safe: arrowSVG is hardcoded constant */
    var cta = elSVG('button', 'gh-rail-footer-cta', 'T\u00FCm teklifleri g\u00F6r ' + arrowSVG);
    cta.type = 'button';
    cta.addEventListener('click', function() { switchPanel('teklifler'); });
    footer.appendChild(cta);
    card.appendChild(footer);

    return card;
  }

  function buildMarkaTeaser() {
    var card = el('div', 'gh-rail-card gh-animate');
    card.appendChild(txt('div', 'gh-rail-title', 'Takip Edebilece\u011Fin Markalar'));

    var listEl = el('div', '');
    listEl.id = 'gh-marka-list';
    card.appendChild(listEl);

    var footer = el('div', 'gh-rail-footer');
    /* Safe: arrowSVG is hardcoded constant */
    var cta = elSVG('button', 'gh-rail-footer-cta', 'T\u00FCm markalar\u0131 g\u00F6r ' + arrowSVG);
    cta.type = 'button';
    cta.addEventListener('click', function() { switchPanel('sirketler'); });
    footer.appendChild(cta);
    card.appendChild(footer);

    /* Hydration deferred to render() after DOM attach */
    return card;
  }

  async function hydrateMarkaTeaserList() {
    var listEl = document.getElementById('gh-marka-list');
    if (!listEl) return;

    /* Single source of truth: _htGetGenelBrandTeaser owns all data */
    var payload = { items: [], followedIds: {}, canToggleInline: false, empty: true };
    if (typeof window._htGetGenelBrandTeaser === 'function') {
      try { payload = await window._htGetGenelBrandTeaser(); } catch (_e) { /* keep default */ }
    }

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

    if (payload.empty || payload.items.length === 0) {
      listEl.appendChild(txt('div', 'gh-brand-empty', 'Hen\u00FCz ke\u015Ffedilecek marka yok.\nMarkalar panelinden g\u00F6z at.'));
      return;
    }

    payload.items.forEach(function(b) {
      var row = el('div', 'gh-brand-item');

      var logo = el('div', 'gh-brand-logo');
      if (b.logo_url) {
        var img = document.createElement('img');
        img.src = b.logo_url;
        img.alt = b.brand_name || '';
        logo.appendChild(img);
      } else {
        logo.textContent = (b.brand_name || '?').charAt(0).toUpperCase();
      }
      row.appendChild(logo);

      var info = el('div', 'gh-brand-info');
      info.appendChild(txt('div', 'gh-brand-name', b.brand_name));
      var seg = SEGMENT_TR[b.segment] || b.segment || '';
      if (seg) info.appendChild(txt('div', 'gh-brand-seg', seg));
      row.appendChild(info);

      var isFollowed = !!(payload.followedIds[b.id]);
      var followBtn = txt('button', 'gh-brand-follow' + (isFollowed ? ' gh-brand-follow--active' : ''), isFollowed ? 'Takipte' : 'Takip Et');
      followBtn.type = 'button';
      followBtn.setAttribute('data-brand-id', b.id);
      followBtn.addEventListener('click', (function(brandId, btnEl, canToggle) {
        return function(ev) {
          ev.stopPropagation();
          var ready = canToggle && typeof window._htBrandFollowReady === 'function' && window._htBrandFollowReady();
          if (ready && typeof window.toggleBrandFollow === 'function') {
            window.toggleBrandFollow(brandId, ev);
            var wasActive = btnEl.classList.contains('gh-brand-follow--active');
            if (wasActive) { btnEl.classList.remove('gh-brand-follow--active'); btnEl.textContent = 'Takip Et'; }
            else { btnEl.classList.add('gh-brand-follow--active'); btnEl.textContent = 'Takipte'; }
          } else {
            switchPanel('sirketler');
          }
        };
      })(b.id, followBtn, payload.canToggleInline));
      row.appendChild(followBtn);

      listEl.appendChild(row);
    });
  }

  /* ═══════════════════════════════════════════════════
     EMPTY / ONBOARDING STATE
     ═══════════════════════════════════════════════════ */

  function buildEmptyPrompt() {
    var wrapper = el('div', 'gh-empty-prompt gh-animate');
    wrapper.id = 'gh-empty-prompt';
    wrapper.appendChild(txt('div', 'gh-empty-icon', '\uD83D\uDC64'));
    wrapper.appendChild(txt('div', 'gh-empty-title', 'Profilini Olu\u015Ftur'));
    wrapper.appendChild(txt('div', 'gh-empty-desc', 'Hen\u00FCz profil bilgilerin eklenmemi\u015F. Profilini tamamla, perakende markalar\u0131 seni bulsun!'));
    var cta = txt('button', 'gh-id-cta', 'Profili D\u00FCzenle');
    cta.type = 'button';
    cta.style.maxWidth = '220px';
    cta.style.margin = '0 auto';
    cta.addEventListener('click', function() { switchPanel('merkez'); });
    wrapper.appendChild(cta);
    return wrapper;
  }

  /* ═══════════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════════ */

  function render() {
    var panel = document.getElementById('panel-genel');
    if (!panel) return;

    injectCSS();

    var shell = document.getElementById('gh-shell');
    if (!shell) return;

    while (shell.firstChild) shell.removeChild(shell.firstChild);

    var profile = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile : null;
    var experiences = _loadedDBData && _loadedDBData.experiences ? _loadedDBData.experiences : null;
    var hasProfile = profile && profile.full_name;

    if (!hasProfile) {
      var layout = el('div', 'gh-layout');
      var left = el('div', 'gh-left');
      left.appendChild(buildEmptyPrompt());
      layout.appendChild(left);
      layout.appendChild(buildFeedSection());
      layout.appendChild(buildRightRail());
      shell.appendChild(layout);
      hydrateFeed();
      hydrateMarkaTeaserList();
      return;
    }

    var layout2 = el('div', 'gh-layout');
    var left2 = el('div', 'gh-left');
    left2.appendChild(buildIdentityCard(profile, experiences));
    left2.appendChild(buildViewersSummary());
    left2.appendChild(buildPremiumCTA());
    layout2.appendChild(left2);
    layout2.appendChild(buildFeedSection());
    layout2.appendChild(buildRightRail());
    shell.appendChild(layout2);

    hydrateFeed();
    hydrateMarkaTeaserList();
  }

  /* ═══════════════════════════════════════════════════
     EXPOSE LOADER
     ═══════════════════════════════════════════════════ */

  window._htLoadGenelHome = function() {
    if (_genelLoaded) return;
    _genelLoaded = true;
    render();
  };

  window._htRefreshGenelHome = function() {
    _genelLoaded = false;
    render();
    _genelLoaded = true;
  };

})();
