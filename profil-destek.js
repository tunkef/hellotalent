/* global supabase, currentUser, _loadedDBData */
// ═══════════════════════════════════════════════════
// PROFIL DESTEK — Candidate Support Center (Destek Merkezi)
// Tabs: Yardim Makaleleri, Talep Olustur, Taleplerim
// Lazy-loaded via window._htLoadDestek() on first panel visit.
//
// innerHTML SAFETY NOTE:
//   innerHTML is used ONLY for hardcoded SVG icon strings from CATEGORY_ICONS
//   constant and for admin-authored article body_md from support_articles DB table
//   (not user input). The renderSimpleMarkdown() function HTML-escapes all input
//   before applying transforms. No user-supplied data flows through innerHTML.
// ═══════════════════════════════════════════════════
(function() {
'use strict';

var _loaded = false;
var _articles = null;
var _tickets = null;

// ── CONSTANTS ────────────────────────────────────

var CATEGORIES = {
  hesap_giris:        'Hesap ve Giri\u015F',
  profil_cv:          'Profil ve CV',
  mesajlar_teklifler: 'Mesajlar ve Teklifler',
  premium_odeme:      'Premium ve \u00D6deme',
  teknik:             'Teknik Sorunlar'
};

var CATEGORY_ICONS = {
  hesap_giris:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  profil_cv:          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  mesajlar_teklifler: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  premium_odeme:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  teknik:             '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
};

var STATUS_LABELS = {
  open:                  'A\u00E7\u0131k',
  in_review:             '\u0130nceleniyor',
  waiting_on_candidate:  'Senden Yan\u0131t Bekleniyor',
  resolved:              '\u00C7\u00F6z\u00FCld\u00FC',
  closed:                'Kapat\u0131ld\u0131'
};

var STATUS_COLORS = {
  open:                  '#C94E28',
  in_review:             '#D97706',
  waiting_on_candidate:  '#2563EB',
  resolved:              '#059669',
  closed:                '#6B7280'
};

// ── CSS INJECTION ────────────────────────────────

function injectCSS() {
  if (document.getElementById('destek-css')) return;
  var style = document.createElement('style');
  style.id = 'destek-css';
  style.textContent = [
    '.destek-wrap { max-width:800px; margin:0 auto; padding:24px 16px; }',
    '.destek-hero { background:var(--verm, #C94E28); border-radius:16px; padding:28px 24px; margin-bottom:24px; color:#fff; }',
    '.destek-hero-title { font-family:"Bricolage Grotesque",sans-serif; font-size:22px; font-weight:700; margin-bottom:6px; }',
    '.destek-hero-sub { font-size:14px; opacity:0.9; }',

    '.destek-tabs { display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border-subtle, #E5E3DF); padding-bottom:0; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }',
    '.destek-tabs::-webkit-scrollbar { display:none; }',
    '.destek-tab { font-family:"Plus Jakarta Sans",sans-serif; font-size:13px; font-weight:600; padding:10px 16px; cursor:pointer; border:none; background:none; color:var(--text-muted, #6B7280); border-bottom:2px solid transparent; transition:all .2s; white-space:nowrap; flex-shrink:0; }',
    '.destek-tab:hover { color:var(--text, #111); }',
    '.destek-tab.active { color:var(--verm, #C94E28); border-bottom-color:var(--verm, #C94E28); }',

    '.destek-section { display:none; }',
    '.destek-section.active { display:block; }',

    /* Articles */
    '.da-cats { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:12px; margin-bottom:20px; }',
    '.da-cat-card { background:var(--bg-surface, #fff); border:1px solid var(--border-subtle, #E5E3DF); border-radius:12px; padding:16px 14px; cursor:pointer; transition:all .2s; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; }',
    '.da-cat-card:hover { border-color:var(--verm, #C94E28); box-shadow:0 2px 8px rgba(0,0,0,0.06); transform:translateY(-1px); }',
    '.da-cat-card.active { border-color:var(--verm, #C94E28); background:var(--verm-light, #F5EDE9); }',
    '.da-cat-icon { color:var(--verm, #C94E28); }',
    '.da-cat-label { font-family:"Plus Jakarta Sans",sans-serif; font-size:12px; font-weight:600; color:var(--text, #111); }',
    '.da-list { display:flex; flex-direction:column; gap:8px; }',
    '.da-item { background:var(--bg-surface, #fff); border:1px solid var(--border-subtle, #E5E3DF); border-radius:10px; padding:14px 16px; cursor:pointer; transition:all .2s; }',
    '.da-item:hover { border-color:var(--verm, #C94E28); box-shadow:0 2px 8px rgba(0,0,0,0.05); }',
    '.da-item-title { font-family:"Plus Jakarta Sans",sans-serif; font-size:14px; font-weight:600; color:var(--text, #111); margin-bottom:4px; }',
    '.da-item-summary { font-size:12px; color:var(--text-muted, #6B7280); }',
    '.da-detail { background:var(--bg-surface, #fff); border:1px solid var(--border-subtle, #E5E3DF); border-radius:12px; padding:24px; }',
    '.da-detail-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--text-muted, #6B7280); cursor:pointer; margin-bottom:16px; border:none; background:none; padding:0; font-family:"Plus Jakarta Sans",sans-serif; }',
    '.da-detail-back:hover { color:var(--verm, #C94E28); }',
    '.da-detail-title { font-family:"Bricolage Grotesque",sans-serif; font-size:18px; font-weight:700; margin-bottom:4px; }',
    '.da-detail-cat { font-size:11px; color:var(--text-muted, #6B7280); margin-bottom:16px; display:inline-block; background:var(--bg-elevated, #F3F4F6); padding:3px 10px; border-radius:20px; }',
    '.da-detail-body { font-size:14px; line-height:1.7; color:var(--text, #111); }',
    '.da-detail-body h2 { font-family:"Bricolage Grotesque",sans-serif; font-size:16px; font-weight:700; margin:16px 0 8px; }',
    '.da-detail-body ul { padding-left:20px; margin:8px 0; }',
    '.da-detail-body li { margin-bottom:4px; }',
    '.da-detail-cta { margin-top:24px; padding-top:20px; border-top:1px solid var(--border-subtle, #E5E3DF); display:flex; align-items:center; gap:12px; }',
    '.da-detail-cta-text { font-size:13px; color:var(--text-muted, #6B7280); }',

    /* Ticket form */
    '.dt-form { display:flex; flex-direction:column; gap:16px; }',
    '.dt-field { display:flex; flex-direction:column; gap:5px; }',
    '.dt-label { font-family:"Plus Jakarta Sans",sans-serif; font-size:13px; font-weight:600; color:var(--text, #111); }',
    '.dt-label .dt-req { color:var(--verm, #C94E28); }',
    '.dt-input, .dt-select, .dt-textarea { font-family:"Plus Jakarta Sans",sans-serif; font-size:14px; padding:10px 12px; border:1px solid var(--border-subtle, #E5E3DF); border-radius:8px; background:var(--bg-surface, #fff); color:var(--text, #111); transition:border-color .2s; }',
    '.dt-input:focus, .dt-select:focus, .dt-textarea:focus { outline:none; border-color:var(--verm, #C94E28); }',
    '.dt-textarea { min-height:120px; resize:vertical; }',
    '.dt-submit { font-family:"Plus Jakarta Sans",sans-serif; font-size:14px; font-weight:600; padding:12px 24px; border:none; border-radius:10px; background:var(--verm, #C94E28); color:#fff; cursor:pointer; transition:all .2s; align-self:flex-start; }',
    '.dt-submit:hover { background:var(--verm-dark, #b84420); }',
    '.dt-submit:disabled { opacity:0.6; cursor:not-allowed; }',
    '.dt-helper { font-size:12px; color:var(--text-muted, #6B7280); margin-top:4px; line-height:1.4; }',
    '.dt-success { background:var(--bg-surface, #fff); border:1px solid #059669; border-radius:12px; padding:24px; text-align:center; }',
    '.dt-success-title { font-family:"Bricolage Grotesque",sans-serif; font-size:18px; font-weight:700; margin-bottom:6px; margin-top:12px; }',
    '.dt-success-no { font-family:"DM Mono",monospace; font-size:15px; color:var(--verm, #C94E28); margin-bottom:8px; }',
    '.dt-success-sub { font-size:13px; color:var(--text-muted, #6B7280); margin-bottom:16px; }',

    /* Ticket list */
    '.dtl-empty { text-align:center; padding:40px 20px; color:var(--text-muted, #6B7280); font-size:14px; }',
    '.dtl-item { background:var(--bg-surface, #fff); border:1px solid var(--border-subtle, #E5E3DF); border-radius:10px; padding:14px 16px; margin-bottom:8px; }',
    '.dtl-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }',
    '.dtl-left { flex:1; min-width:0; }',
    '.dtl-no { font-family:"DM Mono",monospace; font-size:11px; color:var(--text-muted, #6B7280); }',
    '.dtl-subject { font-family:"Plus Jakarta Sans",sans-serif; font-size:14px; font-weight:600; color:var(--text, #111); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
    '.dtl-meta { font-size:11px; color:var(--text-muted, #6B7280); margin-top:4px; }',
    '.dtl-status { font-family:"Plus Jakarta Sans",sans-serif; font-size:11px; font-weight:600; padding:4px 10px; border-radius:20px; white-space:nowrap; }',

    /* Shared button */
    '.destek-btn { font-family:"Plus Jakarta Sans",sans-serif; font-size:13px; font-weight:600; padding:8px 16px; border:none; border-radius:8px; cursor:pointer; transition:all .2s; }',
    '.destek-btn-verm { background:var(--verm, #C94E28); color:#fff; }',
    '.destek-btn-verm:hover { background:var(--verm-dark, #b84420); }',
    '.destek-btn-ghost { background:transparent; color:var(--verm, #C94E28); border:1px solid var(--verm, #C94E28); }',
    '.destek-btn-ghost:hover { background:var(--verm-light, #F5EDE9); }',

    /* Ticket detail */
    '.dtd-wrap { background:var(--bg-surface, #fff); border:1px solid var(--border-subtle, #E5E3DF); border-radius:12px; padding:24px; }',
    '.dtd-header { display:flex; align-items:center; gap:12px; margin-bottom:8px; flex-wrap:wrap; }',
    '.dtd-no { font-family:"DM Mono",monospace; font-size:14px; font-weight:700; color:var(--verm, #C94E28); }',
    '.dtd-subject { font-family:"Bricolage Grotesque",sans-serif; font-size:18px; font-weight:700; color:var(--text, #111); margin-bottom:6px; }',
    '.dtd-meta { font-size:12px; color:var(--text-muted, #6B7280); margin-bottom:20px; }',
    '.dtd-desc-card { background:var(--bg-elevated, #F3F4F6); border-radius:10px; padding:16px; margin-bottom:4px; }',
    '.dtd-desc-label { font-size:11px; font-weight:700; color:var(--text-muted, #6B7280); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }',
    '.dtd-desc-body { font-size:14px; line-height:1.6; color:var(--text, #111); white-space:pre-wrap; }',
    '.dtd-messages { }',
    '.dtd-msg { border-radius:10px; padding:12px 14px; margin-top:8px; }',
    '.dtd-msg-own { background:var(--bg-elevated, #F3F4F6); }',
    '.dtd-msg-support { background:var(--verm-light, #F5EDE9); border:1px solid rgba(201,78,40,0.12); }',
    '.dtd-msg-author { font-size:11px; font-weight:600; color:var(--text-muted, #6B7280); margin-bottom:4px; }',
    '.dtd-msg-body { font-size:13px; line-height:1.6; color:var(--text, #111); white-space:pre-wrap; }',
    '.dtl-item:hover { border-color:var(--verm, #C94E28); box-shadow:0 2px 8px rgba(0,0,0,0.05); }',

    /* Responsive */
    '@media (max-width:600px) {',
    '  .destek-wrap { padding:16px 12px; }',
    '  .da-cats { grid-template-columns:repeat(2, 1fr); gap:8px; }',
    '  .da-cat-card { padding:12px 10px; border-radius:10px; }',
    '  .da-cat-label { font-size:11px; }',
    '  .destek-tab { font-size:12px; padding:8px 12px; }',
    '  .destek-hero { padding:20px 16px; }',
    '  .destek-hero-title { font-size:18px; }',
    '  .da-detail { padding:16px; }',
    '  .da-detail-title { font-size:16px; }',
    '  .da-detail-cta { flex-direction:column; align-items:flex-start; gap:10px; }',
    '  .dtl-item { padding:12px 14px; }',
    '  .dtl-subject { font-size:13px; }',
    '  .dtd-wrap { padding:16px; }',
    '  .dtd-subject { font-size:16px; }',
    '  .dtd-meta { font-size:11px; word-break:break-word; }',
    '  .dt-input, .dt-select, .dt-textarea { font-size:16px; }',
    '  .dt-submit { width:100%; text-align:center; }',
    '  .dt-success { padding:20px 16px; }',
    '  .dt-success-title { font-size:16px; }',
    '  .dt-success-no { font-size:14px; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

// ── RENDER SHELL ─────────────────────────────────

function renderShell(container) {
  while (container.firstChild) container.removeChild(container.firstChild);

  var wrap = document.createElement('div');
  wrap.className = 'destek-wrap';

  // Hero
  var hero = document.createElement('div');
  hero.className = 'destek-hero';
  var heroTitle = document.createElement('div');
  heroTitle.className = 'destek-hero-title';
  heroTitle.textContent = 'Destek Merkezi';
  hero.appendChild(heroTitle);
  var heroSub = document.createElement('div');
  heroSub.className = 'destek-hero-sub';
  heroSub.textContent = 'Yard\u0131m makaleleri, destek talepleri ve daha fazlas\u0131.';
  hero.appendChild(heroSub);
  wrap.appendChild(hero);

  // Tabs
  var tabs = document.createElement('div');
  tabs.className = 'destek-tabs';
  var tabData = [
    { key: 'makaleler', label: 'Yard\u0131m Makaleleri' },
    { key: 'olustur',   label: 'Talep Olu\u015Ftur' },
    { key: 'taleplerim', label: 'Taleplerim' }
  ];
  tabData.forEach(function(t) {
    var btn = document.createElement('button');
    btn.className = 'destek-tab' + (t.key === 'makaleler' ? ' active' : '');
    btn.setAttribute('data-destek-tab', t.key);
    btn.textContent = t.label;
    btn.addEventListener('click', function() { switchDeskTab(t.key); });
    tabs.appendChild(btn);
  });
  wrap.appendChild(tabs);

  // Sections
  var secs = ['makaleler', 'olustur', 'taleplerim'];
  secs.forEach(function(key) {
    var sec = document.createElement('div');
    sec.className = 'destek-section' + (key === 'makaleler' ? ' active' : '');
    sec.id = 'destek-sec-' + key;
    wrap.appendChild(sec);
  });

  container.appendChild(wrap);

  // Populate sections
  renderArticlesSection();
  renderCreateSection();
  renderTicketsSection();
}

function switchDeskTab(key) {
  document.querySelectorAll('.destek-tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-destek-tab') === key);
  });
  document.querySelectorAll('.destek-section').forEach(function(s) {
    s.classList.toggle('active', s.id === 'destek-sec-' + key);
  });
  if (key === 'taleplerim') loadTickets();
  // Reset create form to clean state when switching to it (clears stale success screen)
  if (key === 'olustur') {
    var sec = document.getElementById('destek-sec-olustur');
    if (sec && !sec.querySelector('.dt-form')) renderCreateForm(sec);
  }
}

// ── ARTICLES TAB ─────────────────────────────────

var _selectedCategory = null;

function renderArticlesSection() {
  var sec = document.getElementById('destek-sec-makaleler');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  // Category chips
  var cats = document.createElement('div');
  cats.className = 'da-cats';
  var keys = Object.keys(CATEGORIES);
  keys.forEach(function(k) {
    var card = document.createElement('div');
    card.className = 'da-cat-card' + (k === _selectedCategory ? ' active' : '');

    // Icon — hardcoded SVG constant, safe for innerHTML
    var iconSpan = document.createElement('span');
    iconSpan.className = 'da-cat-icon';
    iconSpan.innerHTML = CATEGORY_ICONS[k] || '';

    var labelSpan = document.createElement('span');
    labelSpan.className = 'da-cat-label';
    labelSpan.textContent = CATEGORIES[k];

    card.appendChild(iconSpan);
    card.appendChild(labelSpan);

    card.addEventListener('click', function() {
      _selectedCategory = (_selectedCategory === k) ? null : k;
      renderArticlesSection();
    });
    cats.appendChild(card);
  });
  sec.appendChild(cats);

  // Article list container
  var listWrap = document.createElement('div');
  listWrap.className = 'da-list';
  listWrap.id = 'da-article-list';
  sec.appendChild(listWrap);

  loadArticles();
}

function loadArticles() {
  if (_articles) {
    renderArticleList(_articles);
    return;
  }
  var listEl = document.getElementById('da-article-list');
  if (listEl) {
    var loadMsg = document.createElement('div');
    loadMsg.style.cssText = 'text-align:center;padding:20px;color:var(--text-muted);font-size:13px;';
    loadMsg.textContent = 'Y\u00FCkleniyor...';
    listEl.appendChild(loadMsg);
  }

  supabase
    .from('support_articles')
    .select('id, slug, category, title, summary, body_md, sort_order')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .then(function(res) {
      if (res.error) {
        console.error('support_articles load error:', res.error);
        var listEl2 = document.getElementById('da-article-list');
        if (listEl2) {
          while (listEl2.firstChild) listEl2.removeChild(listEl2.firstChild);
          var errMsg = document.createElement('div');
          errMsg.style.cssText = 'text-align:center;padding:20px;color:#ef4444;font-size:13px;';
          errMsg.textContent = 'Makaleler y\u00FCklenemedi.';
          listEl2.appendChild(errMsg);
        }
        return;
      }
      _articles = res.data || [];
      renderArticleList(_articles);
    });
}

function renderArticleList(articles) {
  var listEl = document.getElementById('da-article-list');
  if (!listEl) return;
  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  var filtered = _selectedCategory
    ? articles.filter(function(a) { return a.category === _selectedCategory; })
    : articles;

  if (filtered.length === 0) {
    var emptyMsg = document.createElement('div');
    emptyMsg.style.cssText = 'text-align:center;padding:24px 16px;color:var(--text-muted);font-size:13px;';
    emptyMsg.textContent = 'Bu kategoride hen\u00FCz makale bulunmuyor. Arad\u0131\u011F\u0131n\u0131 bulamad\u0131ysan destek talebi olu\u015Fturabilirsin.';
    listEl.appendChild(emptyMsg);
    return;
  }

  filtered.forEach(function(a) {
    var item = document.createElement('div');
    item.className = 'da-item';
    var titleDiv = document.createElement('div');
    titleDiv.className = 'da-item-title';
    titleDiv.textContent = a.title;
    item.appendChild(titleDiv);
    if (a.summary) {
      var sumDiv = document.createElement('div');
      sumDiv.className = 'da-item-summary';
      sumDiv.textContent = a.summary;
      item.appendChild(sumDiv);
    }
    item.addEventListener('click', function() { showArticleDetail(a); });
    listEl.appendChild(item);
  });
}

function showArticleDetail(article) {
  var sec = document.getElementById('destek-sec-makaleler');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  var detail = document.createElement('div');
  detail.className = 'da-detail';

  // Back button
  var back = document.createElement('button');
  back.className = 'da-detail-back';
  var backSvg = document.createElement('span');
  backSvg.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
  back.appendChild(backSvg);
  var backText = document.createTextNode(' Geri D\u00F6n');
  back.appendChild(backText);
  back.addEventListener('click', function() {
    renderArticlesSection();
  });
  detail.appendChild(back);

  var title = document.createElement('div');
  title.className = 'da-detail-title';
  title.textContent = article.title;
  detail.appendChild(title);

  var cat = document.createElement('span');
  cat.className = 'da-detail-cat';
  cat.textContent = CATEGORIES[article.category] || article.category;
  detail.appendChild(cat);

  // Article body — admin-authored content from DB, not user input
  var body = document.createElement('div');
  body.className = 'da-detail-body';
  body.innerHTML = renderSimpleMarkdown(article.body_md || '');
  detail.appendChild(body);

  // CTA: still have issues?
  var cta = document.createElement('div');
  cta.className = 'da-detail-cta';
  var ctaText = document.createElement('span');
  ctaText.className = 'da-detail-cta-text';
  ctaText.textContent = 'Sorun devam ediyor mu?';
  cta.appendChild(ctaText);
  var ctaBtn = document.createElement('button');
  ctaBtn.className = 'destek-btn destek-btn-verm';
  ctaBtn.textContent = 'Destek Talebi Olu\u015Ftur';
  ctaBtn.addEventListener('click', function() {
    switchDeskTab('olustur');
    // Pre-fill category
    var catSel = document.getElementById('dt-category');
    if (catSel) catSel.value = article.category;
  });
  cta.appendChild(ctaBtn);
  detail.appendChild(cta);

  sec.appendChild(detail);
}

// Minimal markdown renderer for admin-authored article content.
// Escapes HTML entities first to prevent injection, then applies
// simple transforms for headings, bold, and lists.
function renderSimpleMarkdown(md) {
  var html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
  // Paragraphs
  html = html.replace(/\n{2,}/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// ── CREATE TICKET TAB ────────────────────────────

function renderCreateSection() {
  var sec = document.getElementById('destek-sec-olustur');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);
  renderCreateForm(sec);
}

var SUBJECT_HINTS = {
  hesap_giris:        '\u00D6r: Google ile giri\u015F yapam\u0131yorum',
  profil_cv:          '\u00D6r: CV y\u00FCklerken hata al\u0131yorum',
  mesajlar_teklifler: '\u00D6r: Mesajlar\u0131m y\u00FCklenmiyor',
  premium_odeme:      '\u00D6r: Premium \u00F6deme tamamlanmad\u0131',
  teknik:             '\u00D6r: Sayfa bo\u015F a\u00E7\u0131l\u0131yor'
};

function renderCreateForm(sec) {
  while (sec.firstChild) sec.removeChild(sec.firstChild);
  var form = document.createElement('div');
  form.className = 'dt-form';

  // Category
  var catField = makeField('Kategori', true);
  var catSel = document.createElement('select');
  catSel.className = 'dt-select';
  catSel.id = 'dt-category';
  var defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = 'Sorununla ilgili bir kategori se\u00E7';
  catSel.appendChild(defOpt);
  Object.keys(CATEGORIES).forEach(function(k) {
    var opt = document.createElement('option');
    opt.value = k;
    opt.textContent = CATEGORIES[k];
    catSel.appendChild(opt);
  });
  catField.appendChild(catSel);
  form.appendChild(catField);

  // Subject
  var subField = makeField('Konu', true);
  var subInp = document.createElement('input');
  subInp.type = 'text';
  subInp.className = 'dt-input';
  subInp.id = 'dt-subject';
  subInp.placeholder = 'K\u0131saca ne ya\u015Fad\u0131\u011F\u0131n\u0131 yaz...';
  subInp.maxLength = 200;
  subField.appendChild(subInp);
  form.appendChild(subField);

  // Update subject placeholder when category changes
  catSel.addEventListener('change', function() {
    var hint = SUBJECT_HINTS[catSel.value];
    subInp.placeholder = hint || 'K\u0131saca ne ya\u015Fad\u0131\u011F\u0131n\u0131 yaz...';
  });

  // Description
  var descField = makeField('Detaylar', true);
  var descTa = document.createElement('textarea');
  descTa.className = 'dt-textarea';
  descTa.id = 'dt-description';
  descTa.placeholder = 'Ne yapmaya \u00E7al\u0131\u015F\u0131yordun, ne oldu ve ne bekliyordun?';
  descField.appendChild(descTa);

  var descHelper = document.createElement('div');
  descHelper.className = 'dt-helper';
  descHelper.textContent = 'Hangi sayfada oldu\u011Funu ve ad\u0131mlar\u0131 k\u0131saca yazarsan daha h\u0131zl\u0131 yard\u0131mc\u0131 olabiliriz.';
  descField.appendChild(descHelper);

  form.appendChild(descField);

  // Error area
  var errDiv = document.createElement('div');
  errDiv.id = 'dt-error';
  errDiv.style.cssText = 'color:#ef4444;font-size:13px;display:none;';
  form.appendChild(errDiv);

  // Submit row
  var submitRow = document.createElement('div');
  submitRow.style.cssText = 'display:flex;align-items:center;gap:16px;flex-wrap:wrap;';

  var btn = document.createElement('button');
  btn.className = 'dt-submit';
  btn.id = 'dt-submit-btn';
  btn.textContent = 'Talebi G\u00F6nder';
  btn.addEventListener('click', submitTicket);
  submitRow.appendChild(btn);

  var trustNote = document.createElement('span');
  trustNote.style.cssText = 'font-size:12px;color:var(--text-muted, #6B7280);';
  trustNote.textContent = 'G\u00FCncellemeler kay\u0131tl\u0131 e-posta adresine g\u00F6nderilir.';
  submitRow.appendChild(trustNote);

  form.appendChild(submitRow);

  sec.appendChild(form);
}

function makeField(label, required) {
  var wrap = document.createElement('div');
  wrap.className = 'dt-field';
  var lbl = document.createElement('label');
  lbl.className = 'dt-label';
  lbl.textContent = label;
  if (required) {
    var star = document.createElement('span');
    star.className = 'dt-req';
    star.textContent = ' *';
    lbl.appendChild(star);
  }
  wrap.appendChild(lbl);
  return wrap;
}

function submitTicket() {
  var catVal = (document.getElementById('dt-category') || {}).value || '';
  var subVal = (document.getElementById('dt-subject') || {}).value || '';
  var descVal = (document.getElementById('dt-description') || {}).value || '';
  var errDiv = document.getElementById('dt-error');
  var btn = document.getElementById('dt-submit-btn');

  // Validate
  var errors = [];
  if (!catVal) errors.push('L\u00FCtfen bir kategori se\u00E7.');
  if (!subVal.trim()) errors.push('Konuyu k\u0131saca belirt.');
  if (!descVal.trim()) errors.push('Sorunu biraz a\u00E7\u0131kla, yard\u0131mc\u0131 olabilelim.');
  else if (descVal.trim().length < 10) errors.push('A\u00E7\u0131klama biraz k\u0131sa kald\u0131 \u2014 birka\u00E7 c\u00FCmle daha ekle.');

  if (errors.length > 0) {
    if (errDiv) { errDiv.textContent = errors.join(' '); errDiv.style.display = 'block'; }
    return;
  }
  if (errDiv) errDiv.style.display = 'none';

  // Collect context
  var currentPanel = window.location.hash.replace('#', '') || 'destek';
  var pagePath = window.location.pathname;
  var ua = navigator.userAgent || '';

  if (btn) { btn.disabled = true; btn.textContent = 'G\u00F6nderiliyor...'; }

  supabase
    .rpc('create_support_ticket', {
      p_category: catVal,
      p_subject: subVal.trim(),
      p_description: descVal.trim(),
      p_current_panel: currentPanel,
      p_page_path: pagePath,
      p_user_agent: ua.substring(0, 500)
    })
    .then(function(res) {
      if (res.error) {
        console.error('create_support_ticket error:', res.error);
        if (errDiv) { errDiv.textContent = 'Talep olu\u015Fturulamad\u0131. L\u00FCtfen tekrar deneyin.'; errDiv.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Talebi G\u00F6nder'; }
        return;
      }

      var result = res.data || {};
      _tickets = null; // invalidate cache
      showTicketSuccess(result.ticket_no || '');
    });
}

function showTicketSuccess(ticketNo) {
  var sec = document.getElementById('destek-sec-olustur');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  var box = document.createElement('div');
  box.className = 'dt-success';

  // Checkmark icon — hardcoded SVG, safe
  var iconWrap = document.createElement('div');
  iconWrap.style.cssText = 'margin-bottom:4px;';
  iconWrap.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  box.appendChild(iconWrap);

  var title = document.createElement('div');
  title.className = 'dt-success-title';
  title.textContent = 'Talebini ald\u0131k, te\u015Fekk\u00FCrler';
  box.appendChild(title);

  var no = document.createElement('div');
  no.className = 'dt-success-no';
  no.textContent = ticketNo;
  box.appendChild(no);

  var sub = document.createElement('div');
  sub.className = 'dt-success-sub';
  sub.textContent = 'Talebini en k\u0131sa s\u00FCrede inceleyece\u011Fiz. G\u00FCncellemeler kay\u0131tl\u0131 e-posta adresine g\u00F6nderilecek.';
  box.appendChild(sub);

  var hint = document.createElement('div');
  hint.style.cssText = 'font-size:12px;color:var(--text-muted, #6B7280);margin-bottom:16px;';
  hint.textContent = 'Talebinin durumunu istedi\u011Fin zaman Taleplerim sekmesinden takip edebilirsin.';
  box.appendChild(hint);

  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';

  var viewBtn = document.createElement('button');
  viewBtn.className = 'destek-btn destek-btn-verm';
  viewBtn.textContent = 'Taleplerime Git';
  viewBtn.addEventListener('click', function() { switchDeskTab('taleplerim'); });
  actions.appendChild(viewBtn);

  var newBtn = document.createElement('button');
  newBtn.className = 'destek-btn destek-btn-ghost';
  newBtn.textContent = 'Yeni Talep Olu\u015Ftur';
  newBtn.addEventListener('click', function() { renderCreateForm(sec); });
  actions.appendChild(newBtn);

  box.appendChild(actions);
  sec.appendChild(box);
}

// ── TICKETS TAB ──────────────────────────────────

function renderTicketsSection() {
  var sec = document.getElementById('destek-sec-taleplerim');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);
  var loadMsg = document.createElement('div');
  loadMsg.style.cssText = 'text-align:center;padding:20px;color:var(--text-muted);font-size:13px;';
  loadMsg.textContent = 'Y\u00FCkleniyor...';
  sec.appendChild(loadMsg);
  loadTickets();
}

function loadTickets() {
  var sec = document.getElementById('destek-sec-taleplerim');
  if (!sec) return;

  supabase
    .from('support_tickets')
    .select('id, ticket_no, category, subject, description, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .then(function(res) {
      if (res.error) {
        console.error('support_tickets load error:', res.error);
        while (sec.firstChild) sec.removeChild(sec.firstChild);
        var errMsg = document.createElement('div');
        errMsg.style.cssText = 'text-align:center;padding:20px;color:#ef4444;font-size:13px;';
        errMsg.textContent = 'Talepler y\u00FCklenemedi.';
        sec.appendChild(errMsg);
        return;
      }
      _tickets = res.data || [];
      renderTicketList(sec, _tickets);
    });
}

function renderTicketList(sec, tickets) {
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  if (tickets.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'dtl-empty';

    var emptyIcon = document.createElement('span');
    emptyIcon.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35;"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>';
    empty.appendChild(emptyIcon);

    var emptyTitle = document.createElement('div');
    emptyTitle.style.cssText = 'font-weight:600;margin:12px 0 4px;font-size:14px;color:var(--text, #111);';
    emptyTitle.textContent = 'Hen\u00FCz destek talebiniz yok';
    empty.appendChild(emptyTitle);

    var emptyDesc = document.createElement('div');
    emptyDesc.style.cssText = 'font-size:13px;color:var(--text-muted, #6B7280);margin-bottom:16px;max-width:320px;margin-left:auto;margin-right:auto;';
    emptyDesc.textContent = 'Bir sorunla kar\u015F\u0131la\u015F\u0131rsan talep olu\u015Fturabilir ya da yard\u0131m makalelerinden \u00E7\u00F6z\u00FCm arayabilirsin.';
    empty.appendChild(emptyDesc);

    var emptyActions = document.createElement('div');
    emptyActions.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;';

    var emptyCreateBtn = document.createElement('button');
    emptyCreateBtn.className = 'destek-btn destek-btn-verm';
    emptyCreateBtn.textContent = 'Talep Olu\u015Ftur';
    emptyCreateBtn.addEventListener('click', function() { switchDeskTab('olustur'); });
    emptyActions.appendChild(emptyCreateBtn);

    var emptyArticlesBtn = document.createElement('button');
    emptyArticlesBtn.className = 'destek-btn destek-btn-ghost';
    emptyArticlesBtn.textContent = 'Makalelere G\u00F6z At';
    emptyArticlesBtn.addEventListener('click', function() { switchDeskTab('makaleler'); });
    emptyActions.appendChild(emptyArticlesBtn);

    empty.appendChild(emptyActions);
    sec.appendChild(empty);
    return;
  }

  tickets.forEach(function(t) {
    var item = document.createElement('div');
    item.className = 'dtl-item';

    var row = document.createElement('div');
    row.className = 'dtl-row';

    var left = document.createElement('div');
    left.className = 'dtl-left';

    var noEl = document.createElement('div');
    noEl.className = 'dtl-no';
    noEl.textContent = t.ticket_no;
    left.appendChild(noEl);

    var subEl = document.createElement('div');
    subEl.className = 'dtl-subject';
    subEl.textContent = t.subject;
    left.appendChild(subEl);

    var metaEl = document.createElement('div');
    metaEl.className = 'dtl-meta';
    metaEl.textContent = (CATEGORIES[t.category] || t.category) + ' \u00B7 ' + formatDate(t.created_at);
    left.appendChild(metaEl);

    row.appendChild(left);

    // Status pill
    var pill = document.createElement('span');
    pill.className = 'dtl-status';
    pill.textContent = STATUS_LABELS[t.status] || t.status;
    var sc = STATUS_COLORS[t.status] || '#6B7280';
    pill.style.cssText = 'background:' + sc + '14;color:' + sc + ';';
    row.appendChild(pill);

    item.appendChild(row);
    item.style.cursor = 'pointer';
    item.addEventListener('click', function() { showTicketDetail(t); });
    sec.appendChild(item);
  });
}

// ── TICKET DETAIL VIEW ──────────────────────────

function showTicketDetail(ticket) {
  var sec = document.getElementById('destek-sec-taleplerim');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  var wrap = document.createElement('div');
  wrap.className = 'dtd-wrap';

  // Back button
  var back = document.createElement('button');
  back.className = 'da-detail-back';
  var backSvg = document.createElement('span');
  backSvg.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
  back.appendChild(backSvg);
  back.appendChild(document.createTextNode(' Taleplere D\u00F6n'));
  back.addEventListener('click', function() { loadTickets(); });
  wrap.appendChild(back);

  // Header: ticket number + status pill
  var header = document.createElement('div');
  header.className = 'dtd-header';

  var noEl = document.createElement('span');
  noEl.className = 'dtd-no';
  noEl.textContent = ticket.ticket_no;
  header.appendChild(noEl);

  var pill = document.createElement('span');
  pill.className = 'dtl-status';
  pill.textContent = STATUS_LABELS[ticket.status] || ticket.status;
  var sc = STATUS_COLORS[ticket.status] || '#6B7280';
  pill.style.cssText = 'background:' + sc + '14;color:' + sc + ';';
  header.appendChild(pill);
  wrap.appendChild(header);

  // Subject
  var subEl = document.createElement('div');
  subEl.className = 'dtd-subject';
  subEl.textContent = ticket.subject;
  wrap.appendChild(subEl);

  // Meta row
  var meta = document.createElement('div');
  meta.className = 'dtd-meta';
  meta.textContent = (CATEGORIES[ticket.category] || ticket.category) + ' \u00B7 Olu\u015Fturulma: ' + formatDate(ticket.created_at);
  if (ticket.updated_at && ticket.updated_at !== ticket.created_at) {
    meta.textContent += ' \u00B7 G\u00FCncelleme: ' + formatDate(ticket.updated_at);
  }
  wrap.appendChild(meta);

  // Description card
  var descCard = document.createElement('div');
  descCard.className = 'dtd-desc-card';

  var descLabel = document.createElement('div');
  descLabel.className = 'dtd-desc-label';
  descLabel.textContent = 'A\u00E7\u0131klama';
  descCard.appendChild(descLabel);

  var descBody = document.createElement('div');
  descBody.className = 'dtd-desc-body';
  descBody.textContent = ticket.description || '';
  descCard.appendChild(descBody);

  wrap.appendChild(descCard);

  // Messages area — load async
  var msgsWrap = document.createElement('div');
  msgsWrap.id = 'dtd-messages';
  msgsWrap.className = 'dtd-messages';
  wrap.appendChild(msgsWrap);

  sec.appendChild(wrap);

  // Fetch public messages for this ticket
  loadTicketMessages(ticket.id, msgsWrap);
}

function loadTicketMessages(ticketId, container) {
  supabase
    .from('support_ticket_messages')
    .select('id, author_type, body, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .then(function(res) {
      if (res.error) {
        console.error('support_ticket_messages load error:', res.error);
        return; // silent — detail still shows description
      }
      var msgs = res.data || [];
      // Skip if only the initial candidate message (same as description)
      if (msgs.length <= 1) return;

      var label = document.createElement('div');
      label.className = 'dtd-desc-label';
      label.style.marginTop = '20px';
      label.textContent = 'Mesajlar';
      container.appendChild(label);

      msgs.forEach(function(m) {
        var bubble = document.createElement('div');
        bubble.className = 'dtd-msg' + (m.author_type === 'candidate' ? ' dtd-msg-own' : ' dtd-msg-support');

        var authorLabel = m.author_type === 'candidate' ? 'Sen'
          : m.author_type === 'support' ? 'Destek Ekibi'
          : 'Sistem';

        var who = document.createElement('div');
        who.className = 'dtd-msg-author';
        who.textContent = authorLabel + ' \u00B7 ' + formatDate(m.created_at);
        bubble.appendChild(who);

        var body = document.createElement('div');
        body.className = 'dtd-msg-body';
        body.textContent = m.body;
        bubble.appendChild(body);

        container.appendChild(bubble);
      });
    });
}

// ── HELPERS ──────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    var day = d.getDate();
    var months = ['Oca', '\u015Eub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'A\u011Fu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    var month = months[d.getMonth()];
    var year = d.getFullYear();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return day + ' ' + month + ' ' + year + ' ' + h + ':' + m;
  } catch(e) {
    return iso.substring(0, 10);
  }
}

// ── PUBLIC LOADER ────────────────────────────────

window._htLoadDestek = function() {
  if (_loaded) return;
  _loaded = true;

  injectCSS();

  var container = document.getElementById('panel-destek');
  if (!container) return;

  renderShell(container);
};

})();
