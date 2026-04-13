/* global _escHtml, _loadedDBData, currentUser, supabase, switchPanel, calculateCompletion, getProfileScoreHints, val, canonicalizeRole, normalizeForDisplay, formatBrandDisplay, wizGoTo */
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

    /* ── Hello Talent Info Card ── */
    css += '.gh-ht-info{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);margin-bottom:20px}';
    css += '.gh-ht-info-kicker{font-family:"DM Mono",monospace;font-size:10px;font-weight:700;letter-spacing:1px;color:var(--verm,#C94E28);margin-bottom:8px}';
    css += '.gh-ht-info-title{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:800;color:var(--text-primary,#111);margin-bottom:6px;line-height:1.3}';
    css += '.gh-ht-info-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.6;margin-bottom:12px}';
    css += '.gh-ht-info-features{list-style:none;padding:0;margin:0 0 14px}';
    css += '.gh-ht-info-features li{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-primary,#111);padding:6px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF);display:flex;align-items:center;gap:8px}';
    css += '.gh-ht-info-features li:last-child{border-bottom:none}';
    css += '.gh-ht-info-features li svg{color:var(--verm,#C94E28);flex-shrink:0;width:14px;height:14px}';

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
    css += '.gh-teaser{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .25s;cursor:pointer}';
    css += '.gh-teaser-body{padding:14px 22px 18px}';
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

    /* ── Coach cover images ── */
    css += '.gh-cover{width:100%;aspect-ratio:16/9;border-radius:16px 16px 0 0;overflow:hidden;position:relative}';
    css += '.gh-cover img{width:100%;height:100%;object-fit:cover}';
    css += '.gh-cover-compact{width:100%;aspect-ratio:3/1;border-radius:16px 16px 0 0;overflow:hidden;position:relative}';
    css += '.gh-cover-compact img{width:100%;height:100%;object-fit:cover}';

    /* ── Fallback editorial cover ── */
    css += '.gh-fallback-cover{display:flex;flex-direction:column;justify-content:flex-end;padding:20px 24px;position:relative;overflow:hidden}';
    css += '.gh-fallback-cover::before{content:"";position:absolute;top:-20%;right:-10%;width:120px;height:120px;border-radius:50%;opacity:.12;pointer-events:none}';
    css += '.gh-fallback-cover::after{content:"";position:absolute;bottom:-30%;left:-5%;width:180px;height:180px;border-radius:50%;opacity:.08;pointer-events:none}';
    css += '.gh-fallback-cat{display:inline-block;padding:2px 8px;border-radius:12px;font-family:"Plus Jakarta Sans",sans-serif;font-size:9px;font-weight:700;letter-spacing:.3px;margin-bottom:8px;align-self:flex-start}';
    css += '.gh-fallback-title{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;line-height:1.2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}';
    css += '.gh-fallback-cover.gh-cover{aspect-ratio:16/9;border-radius:16px 16px 0 0}';
    css += '.gh-fallback-cover.gh-cover .gh-fallback-title{font-size:18px;-webkit-line-clamp:2;color:rgba(0,0,0,.7)}';
    css += '.gh-fallback-cover.gh-cover-compact{aspect-ratio:3/1;border-radius:16px 16px 0 0}';
    css += '.gh-fallback-cover.gh-cover-compact .gh-fallback-title{font-size:13px;-webkit-line-clamp:1;color:rgba(0,0,0,.65)}';

    /* ── Coach avatar (inline) ── */
    css += '.gh-coach-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:11px;font-weight:800;color:#fff;background:var(--navy,#1E2D5E)}';
    css += '.gh-coach-avatar img{width:100%;height:100%;object-fit:cover}';
    css += '.gh-coach-avatar--sm{width:22px;height:22px;font-size:9px}';

    /* ── Author row with avatar ── */
    css += '.gh-author-row{display:flex;align-items:center;gap:8px}';

    /* ── Feed body container ── */
    css += '.gh-feed-body{display:flex;flex-direction:column;gap:16px}';

    /* ── Feed empty state ── */
    css += '.gh-feed-empty{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);text-align:center;padding:32px 16px;line-height:1.5}';

    /* ── Mini coach card (popover) ── */
    css += '.gh-coach-card-overlay{position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998;background:rgba(0,0,0,.25)}';
    css += '.gh-coach-card{position:fixed;z-index:9999;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.15),0 2px 8px rgba(0,0,0,.08);padding:24px;width:320px;max-width:calc(100vw - 32px);font-family:"Plus Jakarta Sans",sans-serif}';
    css += '.gh-coach-card-avatar{width:56px;height:56px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:800;color:#fff;background:var(--navy,#1E2D5E);margin-bottom:12px}';
    css += '.gh-coach-card-avatar img{width:100%;height:100%;object-fit:cover}';
    css += '.gh-coach-card-name{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:700;color:var(--text,#111);margin-bottom:2px}';
    css += '.gh-coach-card-title{font-size:12px;color:var(--muted,#6B7280);margin-bottom:10px}';
    css += '.gh-coach-card-bio{font-size:12px;color:var(--text,#111);line-height:1.5;margin-bottom:10px}';
    css += '.gh-coach-card-meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}';
    css += '.gh-coach-card-pill{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;letter-spacing:.2px;background:var(--navy-light,#EEF0F7);color:var(--navy,#1E2D5E)}';
    css += '.gh-coach-card-linkedin{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;background:#0A66C2;color:#fff;font-size:12px;font-weight:600;text-decoration:none;transition:opacity .15s}';
    css += '.gh-coach-card-linkedin:hover{opacity:.85}';
    css += '.gh-coach-card-linkedin svg{width:14px;height:14px;fill:currentColor}';
    css += '.gh-coach-card-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;background:none;cursor:pointer;color:var(--muted,#6B7280);font-size:18px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:background .15s}';
    css += '.gh-coach-card-close:hover{background:var(--bg,#F7F6F4)}';

    /* ── Mini Eğitim Dashboard card ── */
    css += '.gh-edu-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
    css += '.gh-edu-title{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:12px;display:flex;align-items:center;gap:6px}';
    css += '.gh-edu-title-icon{width:16px;height:16px;flex-shrink:0;color:var(--verm,#C94E28)}';
    css += '.gh-edu-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}';
    css += '.gh-edu-stat{background:var(--bg,#F7F6F4);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}';
    css += '.gh-edu-stat-header{display:flex;align-items:center;gap:5px}';
    css += '.gh-edu-stat-icon{width:13px;height:13px;flex-shrink:0;color:var(--text-muted,#6B7280)}';
    css += '.gh-edu-stat-val{font-family:"DM Mono",monospace;font-size:18px;font-weight:800;color:var(--text-primary,#111);line-height:1.1}';
    css += '.gh-edu-stat-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);line-height:1.2}';
    css += '.gh-edu-badges-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}';
    css += '.gh-edu-badges-title{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--text-secondary,#4B5563)}';
    css += '.gh-edu-badges-count{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280)}';
    css += '.gh-edu-badges-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:12px}';
    css += '.gh-edu-badge{width:100%;aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:default;transition:transform .15s;position:relative}';
    css += '.gh-edu-badge:hover{transform:scale(1.1);z-index:1}';
    css += '.gh-edu-badge--earned{background:var(--verm-light,#F5EDE9);border:1px solid rgba(201,78,40,.2)}';
    css += '.gh-edu-badge--earned.gh-edu-badge--milestone{background:rgba(30,45,94,.06);border:1px solid rgba(30,45,94,.15)}';
    css += '.gh-edu-badge--earned.gh-edu-badge--advanced{background:rgba(217,119,6,.06);border:1px solid rgba(217,119,6,.2)}';
    css += '.gh-edu-badge--locked{background:var(--bg,#F7F6F4);border:1px solid var(--border-subtle,#E5E3DF);opacity:.45}';
    css += '.gh-edu-badge svg{width:14px;height:14px}';
    css += '.gh-edu-badge--earned svg{color:var(--verm,#C94E28)}';
    css += '.gh-edu-badge--earned.gh-edu-badge--milestone svg{color:var(--navy,#1E2D5E)}';
    css += '.gh-edu-badge--earned.gh-edu-badge--advanced svg{color:#92400E}';
    css += '.gh-edu-badge--locked svg{color:var(--text-muted,#6B7280)}';
    /* Tooltip */
    css += '.gh-edu-badge[title]:hover::after{content:attr(title);position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);white-space:nowrap;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;background:rgba(17,17,17,.85);color:#fff;padding:3px 7px;border-radius:6px;pointer-events:none;z-index:10;max-width:140px;white-space:normal;text-align:center;line-height:1.3}';
    css += '.gh-edu-cta{display:block;width:100%;padding:9px 0;border:none;border-radius:10px;background:var(--navy,#1E2D5E);color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .2s;text-align:center}';
    css += '.gh-edu-cta:hover{opacity:.85}';
    css += '.gh-edu-skeleton{background:var(--bg,#F7F6F4);border-radius:8px;height:14px;width:60%;margin-bottom:8px}';
    /* K030 FAZ B — Stüdyo yakında teaser inside edu dash rail slot */
    css += '.gh-edu-soon-list{display:flex;flex-direction:column;gap:10px;margin-top:10px}';
    css += '.gh-edu-soon-row{padding:10px 12px;background:var(--bg,#F7F6F4);border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px}';
    css += '.gh-edu-soon-title{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:var(--text-primary,#111);margin-bottom:2px}';
    css += '.gh-edu-soon-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.4}';
    css += '.gh-edu-soon-hint{margin-top:12px;padding:10px;border-top:1px dashed var(--border-subtle,#E5E3DF);font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);text-align:center;line-height:1.45}';

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

  /* ── Fallback editorial cover: category color map ── */
  var COVER_COLORS = {
    mulakat_ipucu:            { bg: '#FEF7F5', accent: '#C94E28', circle: '#C94E28' },
    yetkinlik_rehberi:        { bg: '#EEF0F7', accent: '#1E2D5E', circle: '#1E2D5E' },
    kariyer_gelisim_onerileri: { bg: '#ECFDF5', accent: '#059669', circle: '#059669' },
    performans:               { bg: '#FEF3C7', accent: '#D97706', circle: '#D97706' },
    kariyer_hikayesi:         { bg: '#F5EDE9', accent: '#92400E', circle: '#92400E' },
    kariyer_hikaye:           { bg: '#F5EDE9', accent: '#92400E', circle: '#92400E' },
    sektor_analizi:           { bg: '#E0E7FF', accent: '#4338CA', circle: '#4338CA' },
    sektor_analiz:            { bg: '#E0E7FF', accent: '#4338CA', circle: '#4338CA' }
  };
  var COVER_DEFAULT = { bg: '#F7F6F4', accent: '#6B7280', circle: '#6B7280' };

  /* Build a fallback editorial cover element.
     sizeClass: 'gh-cover' (large) or 'gh-cover-compact' (teaser).
     Shared visual logic for Genel + Mulakat (same profil.html page). */
  function buildFallbackCover(post, sizeClass) {
    var colors = COVER_COLORS[post.category] || COVER_DEFAULT;
    var wrapper = el('div', 'gh-fallback-cover ' + sizeClass);
    wrapper.style.background = colors.bg;

    /* Abstract circles via CSS pseudo — set accent color */
    wrapper.style.setProperty('--fb-circle', colors.circle);
    wrapper.setAttribute('data-cat', post.category || '');

    var catLabel = COACH_CAT_LABELS[post.category] || post.category || '';
    if (catLabel) {
      var catEl = txt('span', 'gh-fallback-cat', catLabel);
      catEl.style.background = 'rgba(255,255,255,.7)';
      catEl.style.color = colors.accent;
      wrapper.appendChild(catEl);
    }

    var titleEl = txt('div', 'gh-fallback-title', post.title || '');
    wrapper.appendChild(titleEl);

    return wrapper;
  }

  /* Build a cover element: uploaded image or fallback.
     sizeClass: 'gh-cover' or 'gh-cover-compact'. */
  function buildCover(post, sizeClass) {
    if (post.cover_image_url) {
      var wrapper = el('div', sizeClass);
      var img = document.createElement('img');
      img.src = post.cover_image_url;
      img.alt = post.cover_image_alt || '';
      img.loading = 'lazy';
      wrapper.appendChild(img);
      return wrapper;
    }
    return buildFallbackCover(post, sizeClass);
  }

  /* Build a coach avatar element (uploaded or initials fallback).
     extraClass: '' or 'gh-coach-avatar--sm'. */
  function buildCoachAvatar(cp, extraClass) {
    var avatar = el('div', 'gh-coach-avatar' + (extraClass ? ' ' + extraClass : ''));
    if (cp && cp.avatar_url) {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      avatar.appendChild(img);
      window.HT.signStorageUrl(cp.avatar_url).then(function(url) {
        if (url) img.src = url;
      });
    } else {
      var name = (cp && cp.display_name) || '?';
      avatar.textContent = name.charAt(0).toUpperCase();
    }
    return avatar;
  }

  /* ── Mini coach identity card (popover) ── */
  /* Safe: linkedinSVG is a hardcoded constant, no user input */
  var linkedinSVG = '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';

  function showCoachCard(cp) {
    /* Remove any existing card */
    var existing = document.getElementById('gh-coach-card-overlay');
    if (existing) existing.remove();
    var existingCard = document.getElementById('gh-coach-card');
    if (existingCard) existingCard.remove();
    if (!cp) return;

    /* Overlay */
    var overlay = document.createElement('div');
    overlay.className = 'gh-coach-card-overlay';
    overlay.id = 'gh-coach-card-overlay';
    overlay.addEventListener('click', closeCoachCard);

    /* Card */
    var card = document.createElement('div');
    card.className = 'gh-coach-card';
    card.id = 'gh-coach-card';

    /* Close button — safe: hardcoded HTML entity */
    var closeBtn = document.createElement('button');
    closeBtn.className = 'gh-coach-card-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', closeCoachCard);
    card.appendChild(closeBtn);

    /* Avatar (large) */
    var avatarDiv = document.createElement('div');
    avatarDiv.className = 'gh-coach-card-avatar';
    if (cp.avatar_url) {
      var aImg = document.createElement('img');
      aImg.alt = '';
      avatarDiv.appendChild(aImg);
      window.HT.signStorageUrl(cp.avatar_url).then(function(url) {
        if (url) aImg.src = url;
      });
    } else {
      avatarDiv.textContent = (cp.display_name || '?').charAt(0).toUpperCase();
    }
    card.appendChild(avatarDiv);

    if (cp.display_name) card.appendChild(txt('div', 'gh-coach-card-name', cp.display_name));
    if (cp.title) card.appendChild(txt('div', 'gh-coach-card-title', cp.title));
    if (cp.bio_short) card.appendChild(txt('div', 'gh-coach-card-bio', cp.bio_short));

    /* Meta pills */
    var metaDiv = el('div', 'gh-coach-card-meta');
    if (cp.sector_background) metaDiv.appendChild(txt('span', 'gh-coach-card-pill', cp.sector_background));
    if (cp.experience_years) metaDiv.appendChild(txt('span', 'gh-coach-card-pill', cp.experience_years + ' y\u0131l deneyim'));
    if (metaDiv.childNodes.length > 0) card.appendChild(metaDiv);

    /* LinkedIn button — safe: linkedinSVG is hardcoded constant */
    if (cp.linkedin_url) {
      var liLink = document.createElement('a');
      liLink.className = 'gh-coach-card-linkedin';
      liLink.href = cp.linkedin_url;
      liLink.target = '_blank';
      liLink.rel = 'noopener noreferrer';
      var liIcon = document.createElement('span');
      liIcon.innerHTML = linkedinSVG; /* safe: hardcoded SVG constant, no user input */
      liLink.appendChild(liIcon);
      liLink.appendChild(document.createTextNode(' LinkedIn'));
      card.appendChild(liLink);
    }

    document.body.appendChild(overlay);
    document.body.appendChild(card);

    /* Center on viewport */
    var cw = card.offsetWidth;
    var ch = card.offsetHeight;
    card.style.left = Math.max(16, (window.innerWidth - cw) / 2) + 'px';
    card.style.top = Math.max(16, (window.innerHeight - ch) / 2) + 'px';
  }

  function closeCoachCard() {
    var o = document.getElementById('gh-coach-card-overlay');
    var c = document.getElementById('gh-coach-card');
    if (o) o.remove();
    if (c) c.remove();
  }

  /* Expose cover builders for profil-studio.js (same page, safe) */
  window._htBuildCoachCover = buildCover;
  window._htBuildFallbackCover = buildFallbackCover;
  window._htBuildCoachAvatar = buildCoachAvatar;
  window._htShowCoachCard = showCoachCard;

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
      img.alt = '';
      avatar.appendChild(img);
      window.HT.signStorageUrl(avatarUrl).then(function(url) {
        if (url) img.src = url;
      });
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
    if (pct >= 45) fill.style.background = 'var(--green, #059669)';
    track.appendChild(fill);
    compRow.appendChild(track);
    compRow.appendChild(txt('span', 'gh-id-bar-pct', pct + '%'));
    card.appendChild(compRow);

    /* Visibility readiness — %45 threshold indicator */
    var readinessDiv = el('div', 'gh-id-readiness');
    if (pct >= 100) {
      readinessDiv.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--green,#059669);margin-top:6px;display:flex;align-items:center;gap:4px';
      readinessDiv.textContent = '\u2713 Profilin tam — i\u015fverenlere haz\u0131rs\u0131n!';
    } else if (pct >= 45) {
      readinessDiv.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--green,#059669);margin-top:6px';
      readinessDiv.textContent = '\u2713 Profilin i\u015fverenlere g\u00f6r\u00fcn\u00fcr — daha da g\u00fc\u00e7lendir:';
      /* Show improvement hints even above 45% */
      var hints45 = typeof getProfileScoreHints === 'function' ? getProfileScoreHints() : [];
      if (hints45.length > 0) {
        var hintList45 = el('div', 'gh-id-hints');
        hintList45.style.cssText = 'margin-top:6px;display:flex;flex-direction:column;gap:2px';
        var max45 = Math.min(3, hints45.length);
        for (var h45i = 0; h45i < max45; h45i++) {
          var h45 = hints45[h45i];
          var hint45 = el('div', 'gh-id-hint');
          hint45.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0;';
          hint45.innerHTML = '<span style="color:var(--verm);font-weight:600;font-size:10px;min-width:22px;">+' + h45.points + '</span>' + _escHtml(h45.text);
          hint45.dataset.step = String(h45.step);
          hint45.addEventListener('click', function() {
            switchPanel('merkez');
            var s = parseInt(this.dataset.step);
            setTimeout(function() { if (typeof wizGoTo === 'function') wizGoTo(s); }, 300);
          });
          hintList45.appendChild(hint45);
        }
        readinessDiv.appendChild(hintList45);
      }
    } else {
      readinessDiv.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--verm,#C94E28);margin-top:6px';
      readinessDiv.textContent = '%' + (45 - pct) + ' daha tamamla \u2014 i\u015fverenler seni g\u00f6rebilsin';

      /* Next steps hints — object format: {step, text, points} */
      var hints = typeof getProfileScoreHints === 'function' ? getProfileScoreHints() : [];
      if (hints.length > 0) {
        var hintList = el('div', 'gh-id-hints');
        hintList.style.cssText = 'margin-top:8px;display:flex;flex-direction:column;gap:2px';
        var maxHints = Math.min(3, hints.length);
        for (var hi = 0; hi < maxHints; hi++) {
          var hObj = hints[hi];
          var hintItem = el('div', 'gh-id-hint');
          hintItem.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0;';
          hintItem.innerHTML = '<span style="color:var(--verm);font-weight:600;font-size:10px;min-width:22px;">+' + hObj.points + '</span>' + _escHtml(hObj.text);
          hintItem.dataset.step = String(hObj.step);
          hintItem.addEventListener('click', function() {
            switchPanel('merkez');
            var s = parseInt(this.dataset.step);
            setTimeout(function() { if (typeof wizGoTo === 'function') wizGoTo(s); }, 300);
          });
          hintList.appendChild(hintItem);
        }
        readinessDiv.appendChild(hintList);
      }
    }
    card.appendChild(readinessDiv);

    /* Status badge — only Aktif İş Arıyor, only when true (glow handles Beni Öner) */
    var isLooking = profile.is_actively_looking === true;
    if (isLooking) {
      var badges = el('div', 'gh-id-badges');
      badges.appendChild(buildBadge('Aktif \u0130\u015F Ar\u0131yor', true));
      card.appendChild(badges);
    }

    /* CTA — context-aware */
    var ctaLabel = pct >= 45 ? 'Profili D\u00FCzenle' : 'Profili Tamamla';
    var cta = txt('button', 'gh-id-cta', ctaLabel);
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

    /* ══ Hello Talent Info Card — platform bilgisi ══ */
    var htInfo = el('div', 'gh-ht-info gh-animate');
    htInfo.appendChild(txt('div', 'gh-ht-info-kicker', 'HELLOTALENT'));
    htInfo.appendChild(txt('div', 'gh-ht-info-title', 'Perakende kariyerinde bir ad\u0131m \u00f6nde ol'));
    htInfo.appendChild(txt('div', 'gh-ht-info-desc', 'T\u00fcrkiye\'nin perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformu. Profilini olu\u015ftur, yetkinliklerini geli\u015ftir, seni arayan i\u015fverenlerle ba\u011flant\u0131 kur.'));
    var htFeatures = document.createElement('ul');
    htFeatures.className = 'gh-ht-info-features';
    var htItems = [
      ['Yapay zeka destekli CV olu\u015fturucu \u2014 sekt\u00f6re \u00f6zel, ATS uyumlu', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'],
      ['29 yetkinlik, 289 m\u00fclakat sorusu \u2014 STAR+T metodu ile pratik', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'],
      ['96 marka, 61 holding \u2014 seni arayan i\u015fverenleri ke\u015ffet', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>'],
      ['Ki\u015fisel analitik \u2014 profilini kim inceledi, hangi sekt\u00f6rler ilgileniyor', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'],
      ['Do\u011frudan mesajla\u015fma \u2014 i\u015fverenle arac\u0131s\u0131z ileti\u015fim', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>']
    ];
    for (var hi = 0; hi < htItems.length; hi++) {
      var li = document.createElement('li');
      li.innerHTML = htItems[hi][1];
      li.appendChild(document.createTextNode(' ' + htItems[hi][0]));
      htFeatures.appendChild(li);
    }
    htInfo.appendChild(htFeatures);
    section.appendChild(htInfo);

    /* K030 FAZ B: hide the entire "Koçlardan Öğren" editor pick block while
     * Studio is frozen. Coach backend stays dormant; feed returns in FAZ C
     * as the HT Duyurular feed. */
    if (window._HT_STUDIO_FROZEN !== true) {
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
      var practiceBtn = txt('button', 'gh-btn-primary', 'St\u00fcdyo\u2019ya Git');
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
    }

    return section;
  }

  /* Select string with cover image fields (requires migration 20260322142905) */
  var COACH_SELECT_FULL = 'id, title, excerpt, category, like_count, related_role, body, cover_image_url, cover_image_alt, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years, linkedin_url)';
  /* Fallback select without cover image fields (pre-migration compat) */
  var COACH_SELECT_SAFE = 'id, title, excerpt, category, like_count, related_role, body, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years, linkedin_url)';

  async function fetchCoachPosts() {
    /* Always fetch the full published stream directly — never cap by Mulakat cache */
    var posts = [];
    var likedSet = {};
    var postsRes = await supabase
      .from('coach_posts')
      .select(COACH_SELECT_FULL)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    /* If query fails (e.g. cover_image columns missing), retry without media fields */
    if (postsRes.error) {
      console.warn('[genel] coach_posts query failed, retrying without cover fields:', postsRes.error.message);
      postsRes = await supabase
        .from('coach_posts')
        .select(COACH_SELECT_SAFE)
        .eq('status', 'published')
        .order('published_at', { ascending: false });
    }
    if (postsRes.error) {
      console.error('[genel] coach_posts query failed:', postsRes.error.message);
      return { posts: [], likedSet: {}, queryError: true };
    }
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
    return { posts: posts, likedSet: likedSet, queryError: false };
  }

  async function hydrateFeed() {
    var container = document.getElementById('gh-feed-container');
    if (!container) return;

    try {
      var data = await fetchCoachPosts();
      var posts = data.posts;

      if (data.queryError) {
        container.appendChild(txt('div', 'gh-feed-empty', '\u0130\u00E7erikler \u015Fu an y\u00FCklenemiyor. L\u00FCtfen sayfay\u0131 yenileyin.'));
        return;
      }

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

    /* Cover image (uploaded or fallback) */
    card.appendChild(buildCover(post, 'gh-cover'));

    var body = el('div', 'gh-featured-body');

    body.appendChild(txt('span', 'gh-featured-cat', COACH_CAT_LABELS[post.category] || post.category));
    body.appendChild(txt('div', 'gh-featured-title', post.title));
    if (post.excerpt) {
      body.appendChild(txt('div', 'gh-featured-excerpt', post.excerpt));
    }

    /* Meta row with avatar — clickable for coach card */
    var meta = el('div', 'gh-featured-meta');
    var authorRow = el('div', 'gh-author-row');
    var avatarEl = buildCoachAvatar(post.coach_profiles, '');
    avatarEl.style.cursor = 'pointer';
    avatarEl.addEventListener('click', (function(cp) {
      return function(e) { e.stopPropagation(); showCoachCard(cp); };
    })(post.coach_profiles));
    authorRow.appendChild(avatarEl);
    var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
    var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
    var authorText = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');
    if (authorText) {
      var authorSpan = txt('span', 'gh-featured-author', authorText);
      authorSpan.style.cursor = 'pointer';
      authorSpan.addEventListener('click', (function(cp) {
        return function(e) { e.stopPropagation(); showCoachCard(cp); };
      })(post.coach_profiles));
      authorRow.appendChild(authorSpan);
    }
    meta.appendChild(authorRow);

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

    /* K030 FAZ B: suppress "Bu konuyu şimdi çalış" CTA during Studio freeze. */
    if (!window._HT_STUDIO_FROZEN && post.related_role && typeof window._htLoadStudio === 'function') {
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

    /* Compact cover (uploaded or fallback) */
    card.appendChild(buildCover(post, 'gh-cover-compact'));

    var teaserBody = el('div', 'gh-teaser-body');
    teaserBody.appendChild(txt('span', 'gh-teaser-cat', COACH_CAT_LABELS[post.category] || post.category));
    teaserBody.appendChild(txt('div', 'gh-teaser-title', post.title));
    if (post.excerpt) teaserBody.appendChild(txt('div', 'gh-teaser-excerpt', post.excerpt));

    var footer = el('div', 'gh-teaser-footer');
    var authorRow = el('div', 'gh-author-row');
    var tAvatarEl = buildCoachAvatar(post.coach_profiles, 'gh-coach-avatar--sm');
    tAvatarEl.style.cursor = 'pointer';
    tAvatarEl.addEventListener('click', (function(cp) {
      return function(e) { e.stopPropagation(); showCoachCard(cp); };
    })(post.coach_profiles));
    authorRow.appendChild(tAvatarEl);
    var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
    var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
    if (coachName) {
      var tAuthorSpan = txt('span', 'gh-teaser-author', coachName + (coachTitle ? ' \u00B7 ' + coachTitle : ''));
      tAuthorSpan.style.cursor = 'pointer';
      tAuthorSpan.addEventListener('click', (function(cp) {
        return function(e) { e.stopPropagation(); showCoachCard(cp); };
      })(post.coach_profiles));
      authorRow.appendChild(tAuthorSpan);
    }
    footer.appendChild(authorRow);

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
    teaserBody.appendChild(footer);

    card.appendChild(teaserBody);
    card.addEventListener('click', function() { openArticleInCoach(post); });

    return card;
  }

  function openArticleInCoach(post) {
    /* K030 FAZ B: do NOT force-switch to Studio panel during freeze.
     * Detail overlay can still open in-place; practice CTAs inside the overlay
     * are gated separately in profil-studio.js. */
    if (typeof window.openCoachDetail === 'function') {
      window.openCoachDetail(post, false);
    }
  }

  /* ═══════════════════════════════════════════════════
     MINI EĞİTİM DASHBOARD CARD
     ═══════════════════════════════════════════════════ */

  /* Hardcoded SVG icon for the card title (graduation cap) — safe for innerHTML */
  var eduTitleSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>';
  /* Hardcoded stat icon SVGs — safe for innerHTML */
  var eduFlameSVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
  var eduPenSVG    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
  var eduMedalSVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>';
  var eduTrophySVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';

  function buildEduDashCard() {
    var card = el('div', 'gh-edu-card gh-animate');
    card.id = 'gh-edu-shell';

    /* Title — K030 FAZ B: swap to "Stüdyo" + Yakında chip during freeze */
    var titleRow = el('div', 'gh-edu-title');
    var titleIcon = elSVG('span', 'gh-edu-title-icon', eduTitleSVG);
    titleRow.appendChild(titleIcon);
    if (window._HT_STUDIO_FROZEN === true) {
      titleRow.appendChild(document.createTextNode('St\u00fcdyo'));
      var soonChip = el('span', 'ht-chip ht-chip--soon');
      soonChip.textContent = 'Yak\u0131nda';
      titleRow.appendChild(soonChip);
    } else {
      titleRow.appendChild(document.createTextNode('\u00d6\u011frenme \u0130lerlemen'));
    }
    card.appendChild(titleRow);

    /* Body container */
    var skBody = el('div', '');
    skBody.id = 'gh-edu-body';
    if (window._HT_STUDIO_FROZEN !== true) {
      /* Skeleton placeholder while hydration runs */
      var sk1 = el('div', 'gh-edu-skeleton'); sk1.style.width = '70%';
      var sk2 = el('div', 'gh-edu-skeleton'); sk2.style.width = '50%';
      skBody.appendChild(sk1);
      skBody.appendChild(sk2);
    }
    card.appendChild(skBody);

    return card;
  }

  async function hydrateEduDash() {
    var shell = document.getElementById('gh-edu-shell');
    if (!shell) return;
    var body = document.getElementById('gh-edu-body');
    if (!body) return;

    /* K030 FAZ B: when Studio is frozen, render a 4-item "Yakında" teaser
     * instead of hydrating stats + rozetler + CTA. No RPC call. */
    if (window._HT_STUDIO_FROZEN === true) {
      while (body.firstChild) body.removeChild(body.firstChild);
      var soonItems = [
        { t: 'M\u00fclakat demolar\u0131', d: 'Ger\u00e7ek senaryolar, ger\u00e7ek sorular.' },
        { t: 'Yetkinlik bazl\u0131 \u00e7al\u0131\u015fma', d: 'G\u00fc\u00e7l\u00fc ve geli\u015fime a\u00e7\u0131k y\u00f6nleri ay\u0131r\u0131n.' },
        { t: 'M\u00fclakat teknikleri', d: 'STAR yap\u0131s\u0131, soru tipleri, haz\u0131rl\u0131k.' },
        { t: 'Ma\u011faza bilgileri', d: 'Perakende sekt\u00f6r\u00fc i\u00e7g\u00f6r\u00fcleri.' }
      ];
      var soonList = el('div', 'gh-edu-soon-list');
      for (var ssi = 0; ssi < soonItems.length; ssi++) {
        var row = el('div', 'gh-edu-soon-row');
        var rt = el('div', 'gh-edu-soon-title');
        rt.textContent = soonItems[ssi].t;
        var rd = el('div', 'gh-edu-soon-desc');
        rd.textContent = soonItems[ssi].d;
        row.appendChild(rt);
        row.appendChild(rd);
        soonList.appendChild(row);
      }
      body.appendChild(soonList);
      var hint = el('div', 'gh-edu-soon-hint');
      hint.textContent = 'St\u00fcdyo kar\u0131yer geli\u015fimi i\u00e7in haz\u0131rlan\u0131yor. Yak\u0131nda burada olacak.';
      body.appendChild(hint);
      return;
    }

    try {
      var res = await supabase.rpc('get_mini_education_dashboard');
      if (res.error) {
        console.error('hydrateEduDash RPC error:', res.error);
        return;
      }
      var d = res.data;
      if (!d || d.error) return;

      /* Clear skeleton */
      while (body.firstChild) body.removeChild(body.firstChild);

      /* ── Stats 2×2 grid ── */
      var statsGrid = el('div', 'gh-edu-stats');

      var statDefs = [
        { svgConst: eduFlameSVG,  val: d.streak_current || 0, label: 'G\u00fcnl\u00fck Seri' },
        { svgConst: eduPenSVG,    val: d.journal_count  || 0, label: 'Not' },
        { svgConst: eduMedalSVG,  val: d.practice_total || 0, label: 'Pratik Seans' },
        { svgConst: eduTrophySVG, val: d.badge_count    || 0, label: 'Rozet' }
      ];

      for (var si = 0; si < statDefs.length; si++) {
        var sd = statDefs[si];
        var statEl = el('div', 'gh-edu-stat');
        var hdr = el('div', 'gh-edu-stat-header');
        /* Safe: svgConst is a hardcoded SVG string constant — no user data */
        var iconEl = elSVG('span', 'gh-edu-stat-icon', sd.svgConst);
        hdr.appendChild(iconEl);
        statEl.appendChild(hdr);
        statEl.appendChild(txt('div', 'gh-edu-stat-val', String(sd.val)));
        statEl.appendChild(txt('div', 'gh-edu-stat-label', sd.label));
        statsGrid.appendChild(statEl);
      }
      body.appendChild(statsGrid);

      /* ── Badge gallery ── */
      var gallery = d.badge_gallery || [];
      if (gallery.length > 0) {
        var badgesHdr = el('div', 'gh-edu-badges-header');
        badgesHdr.appendChild(txt('span', 'gh-edu-badges-title', 'Rozetler'));
        var earnedCount = gallery.filter(function(b) { return b.earned; }).length;
        badgesHdr.appendChild(txt('span', 'gh-edu-badges-count', earnedCount + '/' + gallery.length));
        body.appendChild(badgesHdr);

        /* Expose to profil-summary.js renderer if available, else render inline */
        if (typeof window._htRenderMiniRozetGalery === 'function') {
          var gridContainer = el('div', 'gh-edu-badges-grid');
          body.appendChild(gridContainer);
          window._htRenderMiniRozetGalery(gridContainer, gallery);
        } else {
          var fallbackGrid = renderBadgeGalleryFallback(gallery);
          body.appendChild(fallbackGrid);
        }
      }

      /* ── Devam Et CTA ── */
      var cta = el('button', 'gh-edu-cta');
      cta.type = 'button';
      cta.textContent = 'St\u00fcdy\u00f4\u2019ya Git \u2192';
      cta.addEventListener('click', function() {
        if (typeof switchPanel === 'function') switchPanel('studio');
      });
      body.appendChild(cta);

    } catch (err) {
      console.error('hydrateEduDash error:', err);
    }
  }

  /* Fallback inline badge grid (used if profil-summary.js not yet loaded) */
  function renderBadgeGalleryFallback(gallery) {
    var grid = el('div', 'gh-edu-badges-grid');
    /* BADGE_ICONS is a global defined in profil-studio.js (loaded after this file) */
    /* Called at runtime (after panel activation) so profil-studio.js is always loaded */
    var iconMap = (typeof window.BADGE_ICONS !== 'undefined' ? window.BADGE_ICONS : {});
    for (var bi = 0; bi < gallery.length; bi++) {
      var b = gallery[bi];
      var tierCls = b.badge_tier === 'advanced' ? ' gh-edu-badge--advanced'
                  : b.badge_tier === 'milestone' ? ' gh-edu-badge--milestone' : '';
      var stateCls = b.earned ? ' gh-edu-badge--earned' + tierCls : ' gh-edu-badge--locked';
      var chip = el('div', 'gh-edu-badge' + stateCls);
      var tooltipParts = [b.title];
      if (!b.earned) tooltipParts.push('(Kilitli)');
      chip.title = tooltipParts.join(' ');
      /* Safe: iconMap[b.icon_key] is from BADGE_ICONS — hardcoded SVG constants only, no user data */
      var iconSvg = iconMap[b.icon_key] || iconMap['star'] || '';
      if (iconSvg) chip.innerHTML = iconSvg;
      grid.appendChild(chip);
    }
    return grid;
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
      if (b.cover_image_url) {
        var img = document.createElement('img');
        img.src = b.cover_image_url;
        img.alt = b.brand_name || '';
        img.style.objectFit = 'cover';
        logo.appendChild(img);
      } else if (b.logo_url) {
        img = document.createElement('img');
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
    /* K030 FAZ B hotfix 2: hellotalent.ai compact pill card removed from rail (2026-04-13, Tuna UAT) */
    left2.appendChild(buildEduDashCard());
    layout2.appendChild(left2);
    layout2.appendChild(buildFeedSection());
    layout2.appendChild(buildRightRail());
    shell.appendChild(layout2);

    hydrateFeed();
    hydrateMarkaTeaserList();
    hydrateEduDash();
  }

  /* ── Compact HT Info for left rail ── */
  function buildHtInfoCompact() {
    var card = el('div', 'gh-rail-card gh-animate');
    card.style.cursor = 'default';
    card.appendChild(txt('div', 'gh-rail-title', 'hellotalent.ai'));
    var desc = txt('div', '', 'Perakende sekt\u00f6r\u00fcne \u00f6zel yetenek platformu');
    desc.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.5;margin-bottom:10px;';
    card.appendChild(desc);
    var pills = el('div', '');
    pills.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    var tags = ['AI CV', 'Yetkinlik', '96 Marka', 'Analitik', 'Mesajla\u015fma'];
    for (var ti = 0; ti < tags.length; ti++) {
      var pill = txt('span', '', tags[ti]);
      pill.style.cssText = 'font-family:"DM Mono",monospace;font-size:10px;padding:3px 8px;border-radius:20px;background:var(--bg,#F7F6F4);color:var(--text-muted,#6B7280);border:1px solid var(--border-subtle,#E5E3DF);';
      pills.appendChild(pill);
    }
    card.appendChild(pills);
    return card;
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
