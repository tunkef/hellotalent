/* global supabase, currentUser, _loadedDBData */
'use strict';
// K049 Faz 3 — strict mode (5 reassign hepsi var-declared, html string transform local).
// ═══════════════════════════════════════════════════
// PROFIL DESTEK — Candidate Support Center (Destek Merkezi)
// Tabs: Yardım Makaleleri, Talep Oluştur, Taleplerim
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

// UI_CATEGORIES defines the user-visible category cards.
// The DB category 'mesajlar_teklifler' is split into two separate UI categories.
// getUiCategory() maps each article to its UI category key.
// NOTE: UI key 'teklifler' preserved to keep DB mapping (mesajlar_teklifler
// enum) intact. Only the user-facing label changed to 'Fırsatlar' as part
// of the K030+ teklifler→firsatlar rename. DB enum rename is a separate
// migration tracked as backlog.
var UI_CATEGORIES = {
  hesap_giris: 'Hesap ve Giri\u015F',
  profil_cv:   'Profil ve CV',
  mesajlar:    'Mesajlar',
  teklifler:   'F\u0131rsatlar',
  premium_odeme: 'Premium ve \u00D6deme',
  teknik:      'Teknik Sorunlar'
};

var UI_CATEGORY_DESCRIPTIONS = {
  hesap_giris: 'Giri\u015F, \u015Fifre ve hesap sorunlar\u0131',
  profil_cv:   'Profil g\u00F6r\u00FCn\u00FCrl\u00FC\u011F\u00FC ve CV i\u015Flemleri',
  mesajlar:    '\u0130\u015Fveren mesajlar\u0131 ve yan\u0131tlar',
  teklifler:   'Kampanyalar, markalardan f\u0131rsatlar ve duyurular',
  premium_odeme: '\u00DCyelik planlar\u0131 ve \u00F6deme',
  teknik:      'Taray\u0131c\u0131 ve cihaz sorunlar\u0131'
};

// Maps DB category → UI category key. DB 'mesajlar_teklifler' is split
// by article slug. Articles not in the slug map default to 'teklifler'.
var SLUG_TO_UI_CAT = {
  'mesajlarim-nasil-calisir': 'mesajlar'
};

function getUiCategory(article) {
  if (article.category !== 'mesajlar_teklifler') return article.category;
  return SLUG_TO_UI_CAT[article.slug] || 'teklifler';
}

// Reverse: UI category key → DB category key for ticket submission
function uiCatToDbCat(uiKey) {
  if (uiKey === 'mesajlar' || uiKey === 'teklifler') return 'mesajlar_teklifler';
  return uiKey;
}

// For ticket list/detail display: resolve a ticket's display label.
// Prefers ui_topic (persisted split) over raw DB category.
function ticketCategoryLabel(ticket) {
  if (ticket.ui_topic && UI_CATEGORIES[ticket.ui_topic]) {
    return UI_CATEGORIES[ticket.ui_topic];
  }
  if (UI_CATEGORIES[ticket.category]) return UI_CATEGORIES[ticket.category];
  if (ticket.category === 'mesajlar_teklifler') return 'Mesajlar / F\u0131rsatlar';
  return ticket.category;
}

// For article breadcrumb: resolve any UI key to label
function _categoryLabel(key) {
  if (UI_CATEGORIES[key]) return UI_CATEGORIES[key];
  if (key === 'mesajlar_teklifler') return 'Mesajlar / F\u0131rsatlar';
  return key;
}

// Hardcoded SVG icon constants — safe for innerHTML
var UI_CATEGORY_ICONS = {
  hesap_giris: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  profil_cv:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
  mesajlar:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  teklifler:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
  premium_odeme: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  teknik:      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
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

var SUBJECT_HINTS = {
  hesap_giris: '\u00D6r: Google ile giri\u015F yapam\u0131yorum',
  profil_cv:   '\u00D6r: CV y\u00FCklerken hata al\u0131yorum',
  mesajlar:    '\u00D6r: \u0130\u015Fveren mesaj\u0131na yan\u0131t veremiyorum',
  teklifler:   '\u00D6r: F\u0131rsat detay\u0131 a\u00E7\u0131lm\u0131yor',
  premium_odeme: '\u00D6r: Premium \u00F6deme tamamlanmad\u0131',
  teknik:      '\u00D6r: Sayfa bo\u015F a\u00E7\u0131l\u0131yor'
};

// Hardcoded SVG fragments — safe for innerHTML
var SVG_BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
var SVG_CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
var SVG_CHECK_CIRCLE = '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
var SVG_EMPTY_CLIPBOARD = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.35;"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>';
var SVG_ARTICLE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
var SVG_UP_ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';

// ── STATE ────────────────────────────────────────

var _selectedCategory = null;
var _articleDetailMode = false;
var _scrollAfterRender = false; // set true when category click should auto-scroll

// ── SCROLL HELPERS ───────────────────────────────

function scrollToArticleList() {
  var el = document.getElementById('da-list-header');
  if (!el) return;
  var offset = 16;
  var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: top, behavior: 'smooth' });
}

function scrollToCategoryGrid() {
  var el = document.querySelector('.da-cat-grid');
  if (!el) return;
  var offset = 16;
  var top = el.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: top, behavior: 'smooth' });
}

// ── CSS INJECTION ────────────────────────────────

function injectCSS() {
  // K066 Faz A: external css/panels/destek.css owns styling now.
  return;
}

// ── RENDER SHELL ─────────────────────────────────

function renderShell(container) {
  while (container.firstChild) container.removeChild(container.firstChild);

  var wrap = document.createElement('div');
  wrap.className = 'destek-wrap';

  // Hero — follows g-hero bento spec
  var hero = document.createElement('div');
  hero.className = 'destek-hero';
  var heroTitle = document.createElement('div');
  heroTitle.className = 'destek-hero-title';
  heroTitle.textContent = 'Destek Merkezi';
  hero.appendChild(heroTitle);
  var heroSub = document.createElement('div');
  heroSub.className = 'destek-hero-sub';
  heroSub.textContent = 'Yard\u0131m makalelerini incele, destek talebi olu\u015Ftur veya mevcut taleplerini takip et.';
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
  if (key === 'olustur') {
    var sec = document.getElementById('destek-sec-olustur');
    if (sec && !sec.querySelector('.dt-form')) renderCreateForm(sec);
  }
  if (key === 'makaleler' && _articleDetailMode) {
    _articleDetailMode = false;
    renderArticlesSection();
  }
}

// ── ARTICLES TAB ─────────────────────────────────

function renderArticlesSection() {
  var sec = document.getElementById('destek-sec-makaleler');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);
  _articleDetailMode = false;

  // Category bento grid — uses UI_CATEGORIES (6 cards, not merged)
  var catGrid = document.createElement('div');
  catGrid.className = 'da-cat-grid';
  var uiKeys = Object.keys(UI_CATEGORIES);
  uiKeys.forEach(function(k, i) {
    var card = document.createElement('div');
    card.className = 'da-cat-card' + (k === _selectedCategory ? ' active' : '');
    // First card spans 2 for asymmetric bento rhythm
    if (i === 0) card.style.gridColumn = 'span 2';

    // Hardcoded SVG icon — safe for innerHTML
    var iconSpan = document.createElement('span');
    iconSpan.className = 'da-cat-icon';
    iconSpan.innerHTML = UI_CATEGORY_ICONS[k] || '';
    card.appendChild(iconSpan);

    var labelSpan = document.createElement('div');
    labelSpan.className = 'da-cat-label';
    labelSpan.textContent = UI_CATEGORIES[k];
    card.appendChild(labelSpan);

    var descSpan = document.createElement('div');
    descSpan.className = 'da-cat-desc';
    descSpan.textContent = UI_CATEGORY_DESCRIPTIONS[k] || '';
    card.appendChild(descSpan);

    var countSpan = document.createElement('span');
    countSpan.className = 'da-cat-count';
    countSpan.setAttribute('data-cat-count', k);
    card.appendChild(countSpan);

    card.addEventListener('click', function() {
      var wasSelected = _selectedCategory === k;
      _selectedCategory = wasSelected ? null : k;
      _scrollAfterRender = !wasSelected; // scroll down when selecting, not when deselecting
      renderArticlesSection();
    });
    catGrid.appendChild(card);
  });
  sec.appendChild(catGrid);

  var listHeader = document.createElement('div');
  listHeader.className = 'da-list-header';
  listHeader.id = 'da-list-header';
  sec.appendChild(listHeader);

  var listWrap = document.createElement('div');
  listWrap.className = 'da-list';
  listWrap.id = 'da-article-list';
  sec.appendChild(listWrap);

  loadArticles();
}

function loadArticles() {
  if (_articles) {
    renderArticleList(_articles);
    updateCategoryCounts(_articles);
    return;
  }
  var listEl = document.getElementById('da-article-list');
  if (listEl) {
    var loadMsg = document.createElement('div');
    loadMsg.style.cssText = 'text-align:center;padding:24px;color:var(--text-muted);font-size:13px;';
    loadMsg.textContent = 'Y\u00FCkleniyor\u2026';
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
        var el = document.getElementById('da-article-list');
        if (el) {
          while (el.firstChild) el.removeChild(el.firstChild);
          var errMsg = document.createElement('div');
          errMsg.style.cssText = 'text-align:center;padding:20px;color:#ef4444;font-size:13px;';
          errMsg.textContent = 'Makaleler y\u00FCklenemedi.';
          el.appendChild(errMsg);
        }
        return;
      }
      _articles = res.data || [];
      renderArticleList(_articles);
      updateCategoryCounts(_articles);
    });
}

function updateCategoryCounts(articles) {
  var counts = {};
  articles.forEach(function(a) {
    var uiCat = getUiCategory(a);
    counts[uiCat] = (counts[uiCat] || 0) + 1;
  });
  Object.keys(UI_CATEGORIES).forEach(function(k) {
    var el = document.querySelector('[data-cat-count="' + k + '"]');
    if (el) el.textContent = (counts[k] || 0) + ' makale';
  });
}

function renderArticleList(articles) {
  var listEl = document.getElementById('da-article-list');
  var headerEl = document.getElementById('da-list-header');
  if (!listEl) return;
  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

  var filtered = _selectedCategory
    ? articles.filter(function(a) { return getUiCategory(a) === _selectedCategory; })
    : articles;

  if (headerEl) {
    while (headerEl.firstChild) headerEl.removeChild(headerEl.firstChild);

    var titleSpan = document.createElement('span');
    titleSpan.className = 'da-list-header-title';
    titleSpan.textContent = _selectedCategory
      ? UI_CATEGORIES[_selectedCategory] || _selectedCategory
      : 'T\u00FCm Makaleler';
    headerEl.appendChild(titleSpan);

    // Show "Kategorilere Dön" button when a filter is active
    if (_selectedCategory) {
      var upBtn = document.createElement('button');
      upBtn.className = 'da-list-header-up';
      // Hardcoded SVG — safe for innerHTML
      upBtn.innerHTML = SVG_UP_ARROW;
      var upText = document.createTextNode(' Kategoriler');
      upBtn.appendChild(upText);
      upBtn.addEventListener('click', function() { scrollToCategoryGrid(); });
      headerEl.appendChild(upBtn);
    }

    // Auto-scroll to article list after category selection
    if (_scrollAfterRender) {
      _scrollAfterRender = false;
      setTimeout(scrollToArticleList, 80);
    }
  }

  if (filtered.length === 0) {
    var emptyWrap = document.createElement('div');
    emptyWrap.className = 'da-empty';
    var emptyText = document.createElement('div');
    emptyText.className = 'da-empty-text';
    emptyText.textContent = _selectedCategory
      ? 'Bu kategoride hen\u00FCz makale yok. Arad\u0131\u011F\u0131n\u0131 bulamad\u0131ysan destek talebi olu\u015Fturabilirsin.'
      : 'Hen\u00FCz makale yay\u0131nlanmam\u0131\u015F.';
    emptyWrap.appendChild(emptyText);

    if (_selectedCategory) {
      var resetBtn = document.createElement('button');
      resetBtn.className = 'da-empty-reset';
      resetBtn.textContent = 'T\u00FCm makaleleri g\u00F6ster';
      resetBtn.addEventListener('click', function() {
        _selectedCategory = null;
        renderArticlesSection();
      });
      emptyWrap.appendChild(resetBtn);
    }
    listEl.appendChild(emptyWrap);
    return;
  }

  filtered.forEach(function(a) {
    var item = document.createElement('div');
    item.className = 'da-item';

    // Hardcoded SVG — safe for innerHTML
    var iconWrap = document.createElement('span');
    iconWrap.className = 'da-item-icon';
    iconWrap.innerHTML = SVG_ARTICLE;
    item.appendChild(iconWrap);

    var content = document.createElement('div');
    content.className = 'da-item-content';
    var titleDiv = document.createElement('div');
    titleDiv.className = 'da-item-title';
    titleDiv.textContent = a.title;
    content.appendChild(titleDiv);
    if (a.summary) {
      var sumDiv = document.createElement('div');
      sumDiv.className = 'da-item-summary';
      sumDiv.textContent = a.summary;
      content.appendChild(sumDiv);
    }
    item.appendChild(content);

    // Hardcoded SVG — safe for innerHTML
    var arrow = document.createElement('span');
    arrow.className = 'da-item-arrow';
    arrow.innerHTML = SVG_CHEVRON;
    item.appendChild(arrow);

    item.addEventListener('click', function() { showArticleDetail(a); });
    listEl.appendChild(item);
  });
}

function showArticleDetail(article) {
  var sec = document.getElementById('destek-sec-makaleler');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);
  _articleDetailMode = true;

  // Sticky breadcrumb bar
  var breadcrumb = document.createElement('div');
  breadcrumb.className = 'da-breadcrumb-bar';

  // Hardcoded SVG — safe for innerHTML
  var backBtn = document.createElement('button');
  backBtn.className = 'da-breadcrumb-back';
  backBtn.innerHTML = SVG_BACK;
  var backText = document.createTextNode(' Makalelere D\u00F6n');
  backBtn.appendChild(backText);
  backBtn.addEventListener('click', function() {
    _articleDetailMode = false;
    renderArticlesSection();
  });
  breadcrumb.appendChild(backBtn);

  var sep = document.createElement('span');
  sep.className = 'da-breadcrumb-sep';
  sep.textContent = '/';
  breadcrumb.appendChild(sep);

  var articleUiCat = getUiCategory(article);

  var catBtn = document.createElement('button');
  catBtn.className = 'da-breadcrumb-cat';
  catBtn.textContent = UI_CATEGORIES[articleUiCat] || articleUiCat;
  catBtn.addEventListener('click', function() {
    _selectedCategory = articleUiCat;
    _articleDetailMode = false;
    renderArticlesSection();
  });
  breadcrumb.appendChild(catBtn);

  sec.appendChild(breadcrumb);

  // Article detail card
  var detail = document.createElement('div');
  detail.className = 'da-detail';

  var cat = document.createElement('span');
  cat.className = 'da-detail-cat';
  cat.textContent = UI_CATEGORIES[articleUiCat] || articleUiCat;
  detail.appendChild(cat);

  var title = document.createElement('div');
  title.className = 'da-detail-title';
  title.textContent = article.title;
  detail.appendChild(title);

  // Admin-authored body_md from DB — HTML-escaped by renderSimpleMarkdown
  var body = document.createElement('div');
  body.className = 'da-detail-body';
  body.innerHTML = renderSimpleMarkdown(article.body_md || '');
  detail.appendChild(body);

  // CTA
  var cta = document.createElement('div');
  cta.className = 'da-detail-cta';
  var ctaRow = document.createElement('div');
  ctaRow.className = 'da-detail-cta-row';
  var ctaText = document.createElement('span');
  ctaText.className = 'da-detail-cta-text';
  ctaText.textContent = 'Sorun devam m\u0131 ediyor?';
  ctaRow.appendChild(ctaText);
  var ctaBtn = document.createElement('button');
  ctaBtn.className = 'destek-btn destek-btn-verm';
  ctaBtn.textContent = 'Destek Talebi Olu\u015Ftur';
  ctaBtn.addEventListener('click', function() {
    var artUiCat = getUiCategory(article);
    _articleDetailMode = false;
    switchDeskTab('olustur');
    var catSel = document.getElementById('dt-category');
    if (catSel) {
      catSel.value = artUiCat;
      var subInp = document.getElementById('dt-subject');
      if (subInp) {
        var hint = SUBJECT_HINTS[artUiCat];
        subInp.placeholder = hint || 'K\u0131saca ne ya\u015Fad\u0131\u011F\u0131n\u0131 yaz\u2026';
      }
    }
  });
  ctaRow.appendChild(ctaBtn);
  cta.appendChild(ctaRow);
  detail.appendChild(cta);

  // Related articles — grouped by UI category, not raw DB category
  if (_articles && _articles.length > 1) {
    var related = _articles.filter(function(a) {
      return getUiCategory(a) === articleUiCat && a.id !== article.id;
    });
    if (related.length > 0) {
      var relWrap = document.createElement('div');
      relWrap.className = 'da-related';
      var relTitle = document.createElement('div');
      relTitle.className = 'da-related-title';
      relTitle.textContent = 'Ayn\u0131 Kategorideki Di\u011Fer Makaleler';
      relWrap.appendChild(relTitle);

      var relList = document.createElement('div');
      relList.className = 'da-related-list';
      related.slice(0, 3).forEach(function(r) {
        var relItem = document.createElement('button');
        relItem.className = 'da-related-item';
        // Hardcoded SVG — safe for innerHTML
        relItem.innerHTML = SVG_ARTICLE + ' ';
        var relItemText = document.createTextNode(r.title);
        relItem.appendChild(relItemText);
        relItem.addEventListener('click', function() { showArticleDetail(r); });
        relList.appendChild(relItem);
      });
      relWrap.appendChild(relList);
      detail.appendChild(relWrap);
    }
  }

  sec.appendChild(detail);
}

// Markdown renderer for admin-authored article content.
// HTML-escapes input first, then applies simple transforms.
function renderSimpleMarkdown(md) {
  var html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^(\d+)\. (.+)$/gm, '<li data-ol="$1">$2</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>(?:(?!data-ol).)*?<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/((?:<li data-ol="[^"]*">.*?<\/li>\s*)+)/g, function(match) {
    return '<ol>' + match.replace(/ data-ol="[^"]*"/g, '') + '</ol>';
  });
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');
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

function renderCreateForm(sec) {
  while (sec.firstChild) sec.removeChild(sec.firstChild);
  var form = document.createElement('div');
  form.className = 'dt-form';

  var catField = makeField('Kategori', true);
  var catSel = document.createElement('select');
  catSel.className = 'dt-select';
  catSel.id = 'dt-category';
  var defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = 'Sorununla ilgili bir kategori se\u00E7';
  catSel.appendChild(defOpt);
  Object.keys(UI_CATEGORIES).forEach(function(k) {
    var opt = document.createElement('option');
    opt.value = k;
    opt.textContent = UI_CATEGORIES[k];
    catSel.appendChild(opt);
  });
  catField.appendChild(catSel);
  form.appendChild(catField);

  var subField = makeField('Konu', true);
  var subInp = document.createElement('input');
  subInp.type = 'text';
  subInp.className = 'dt-input';
  subInp.id = 'dt-subject';
  subInp.placeholder = 'K\u0131saca ne ya\u015Fad\u0131\u011F\u0131n\u0131 yaz\u2026';
  subInp.maxLength = 200;
  subField.appendChild(subInp);
  form.appendChild(subField);

  catSel.addEventListener('change', function() {
    var hint = SUBJECT_HINTS[catSel.value];
    subInp.placeholder = hint || 'K\u0131saca ne ya\u015Fad\u0131\u011F\u0131n\u0131 yaz\u2026';
  });

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

  var errDiv = document.createElement('div');
  errDiv.id = 'dt-error';
  errDiv.style.cssText = 'color:#ef4444;font-size:13px;display:none;line-height:1.4;';
  form.appendChild(errDiv);

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
  var catUiVal = (document.getElementById('dt-category') || {}).value || '';
  var subVal = (document.getElementById('dt-subject') || {}).value || '';
  var descVal = (document.getElementById('dt-description') || {}).value || '';
  var errDiv = document.getElementById('dt-error');
  var btn = document.getElementById('dt-submit-btn');

  var errors = [];
  if (!catUiVal) errors.push('L\u00FCtfen bir kategori se\u00E7.');
  if (!subVal.trim()) errors.push('Konuyu k\u0131saca belirt.');
  if (!descVal.trim()) errors.push('Sorunu biraz a\u00E7\u0131kla, yard\u0131mc\u0131 olabilelim.');
  else if (descVal.trim().length < 10) errors.push('A\u00E7\u0131klama biraz k\u0131sa kald\u0131 \u2014 birka\u00E7 c\u00FCmle daha ekle.');

  if (errors.length > 0) {
    if (errDiv) { errDiv.textContent = errors.join(' '); errDiv.style.display = 'block'; }
    return;
  }
  if (errDiv) errDiv.style.display = 'none';

  // Map UI category key back to DB category key for backend
  var dbCat = uiCatToDbCat(catUiVal);

  var currentPanel = window.location.hash.replace('#', '') || 'destek';
  var pagePath = window.location.pathname;
  var ua = navigator.userAgent || '';

  if (btn) { btn.disabled = true; btn.textContent = 'G\u00F6nderiliyor\u2026'; }

  // Compute ui_topic: only meaningful when DB category is mesajlar_teklifler
  var uiTopic = (dbCat === 'mesajlar_teklifler') ? catUiVal : null;

  supabase
    .rpc('create_support_ticket', {
      p_category: dbCat,
      p_subject: subVal.trim(),
      p_description: descVal.trim(),
      p_current_panel: currentPanel,
      p_page_path: pagePath,
      p_user_agent: ua.substring(0, 500),
      p_ui_topic: uiTopic
    })
    .then(function(res) {
      if (res.error) {
        console.error('create_support_ticket error:', res.error);
        if (errDiv) { errDiv.textContent = 'Talep olu\u015Fturulamad\u0131. L\u00FCtfen tekrar dene.'; errDiv.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Talebi G\u00F6nder'; }
        return;
      }
      var result = res.data || {};
      _tickets = null;
      showTicketSuccess(result.ticket_no || '');
    });
}

function showTicketSuccess(ticketNo) {
  var sec = document.getElementById('destek-sec-olustur');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  var box = document.createElement('div');
  box.className = 'dt-success';

  // Hardcoded SVG — safe for innerHTML
  var iconWrap = document.createElement('div');
  iconWrap.innerHTML = SVG_CHECK_CIRCLE;
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
  hint.className = 'dt-success-hint';
  hint.textContent = '\u0130stedi\u011Fin zaman Taleplerim sekmesinden durumu takip edebilirsin.';
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
  loadMsg.style.cssText = 'text-align:center;padding:24px;color:var(--text-muted);font-size:13px;';
  loadMsg.textContent = 'Y\u00FCkleniyor\u2026';
  sec.appendChild(loadMsg);
  loadTickets();
}

function loadTickets() {
  var sec = document.getElementById('destek-sec-taleplerim');
  if (!sec) return;

  supabase
    .from('support_tickets')
    .select('id, ticket_no, category, ui_topic, subject, description, status, created_at, updated_at')
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

    // Hardcoded SVG — safe for innerHTML
    var emptyIcon = document.createElement('span');
    emptyIcon.innerHTML = SVG_EMPTY_CLIPBOARD;
    empty.appendChild(emptyIcon);

    var emptyTitle = document.createElement('div');
    emptyTitle.className = 'dtl-empty-title';
    emptyTitle.textContent = 'Hen\u00FCz destek talebiniz yok';
    empty.appendChild(emptyTitle);

    var emptyDesc = document.createElement('div');
    emptyDesc.className = 'dtl-empty-desc';
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

  var list = document.createElement('div');
  list.className = 'dtl-list';

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
    metaEl.textContent = ticketCategoryLabel(t) + ' \u00B7 ' + formatDate(t.created_at);
    left.appendChild(metaEl);

    row.appendChild(left);

    var pill = document.createElement('span');
    pill.className = 'dtl-status';
    pill.textContent = STATUS_LABELS[t.status] || t.status;
    var sc = STATUS_COLORS[t.status] || '#6B7280';
    pill.style.cssText = 'background:' + sc + '14;color:' + sc + ';';
    row.appendChild(pill);

    item.appendChild(row);
    item.style.cursor = 'pointer';
    item.addEventListener('click', function() { showTicketDetail(t); });
    list.appendChild(item);
  });

  sec.appendChild(list);
}

// ── TICKET DETAIL VIEW ──────────────────────────

function showTicketDetail(ticket) {
  var sec = document.getElementById('destek-sec-taleplerim');
  if (!sec) return;
  while (sec.firstChild) sec.removeChild(sec.firstChild);

  var wrap = document.createElement('div');
  wrap.className = 'dtd-wrap';

  // Hardcoded SVG — safe for innerHTML
  var back = document.createElement('button');
  back.className = 'dtd-back';
  back.innerHTML = SVG_BACK;
  var backText = document.createTextNode(' Taleplere D\u00F6n');
  back.appendChild(backText);
  back.addEventListener('click', function() { loadTickets(); });
  wrap.appendChild(back);

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

  var subEl = document.createElement('div');
  subEl.className = 'dtd-subject';
  subEl.textContent = ticket.subject;
  wrap.appendChild(subEl);

  var meta = document.createElement('div');
  meta.className = 'dtd-meta';
  meta.textContent = ticketCategoryLabel(ticket) + ' \u00B7 Olu\u015Fturulma: ' + formatDate(ticket.created_at);
  if (ticket.updated_at && ticket.updated_at !== ticket.created_at) {
    meta.textContent += ' \u00B7 G\u00FCncelleme: ' + formatDate(ticket.updated_at);
  }
  wrap.appendChild(meta);

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

  var msgsWrap = document.createElement('div');
  msgsWrap.id = 'dtd-messages';
  msgsWrap.className = 'dtd-messages';
  wrap.appendChild(msgsWrap);

  // ── Reply composer for active tickets ──
  if (ticket.status === 'open' || ticket.status === 'in_review' || ticket.status === 'waiting_on_candidate') {
    var replyArea = document.createElement('div');
    replyArea.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle, #E5E3DF);';

    var replyLabel = document.createElement('div');
    replyLabel.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text, #111);margin-bottom:6px;';
    replyLabel.textContent = 'Yan\u0131t\u0131n\u0131z';
    replyArea.appendChild(replyLabel);

    if (ticket.status === 'waiting_on_candidate') {
      var waitHint = document.createElement('div');
      waitHint.style.cssText = 'font-size:12px;color:#2563EB;margin-bottom:8px;line-height:1.4;';
      waitHint.textContent = 'Destek ekibi yan\u0131t\u0131n\u0131z\u0131 bekliyor.';
      replyArea.appendChild(waitHint);
    }

    var replyTa = document.createElement('textarea');
    replyTa.className = 'dt-textarea';
    replyTa.style.minHeight = '80px';
    replyTa.placeholder = 'Mesaj\u0131n\u0131z\u0131 yaz\u0131n\u2026';
    replyArea.appendChild(replyTa);

    var replyErr = document.createElement('div');
    replyErr.style.cssText = 'color:#ef4444;font-size:12px;display:none;margin-bottom:6px;';
    replyArea.appendChild(replyErr);

    var replyBtn = document.createElement('button');
    replyBtn.className = 'destek-btn destek-btn-verm';
    replyBtn.textContent = 'Yan\u0131t G\u00F6nder';
    replyBtn.addEventListener('click', function() {
      var body = replyTa.value.trim();
      if (!body) {
        replyErr.textContent = 'L\u00FCtfen bir mesaj yaz.';
        replyErr.style.display = 'block';
        return;
      }
      if (body.length < 5) {
        replyErr.textContent = 'Mesaj \u00E7ok k\u0131sa.';
        replyErr.style.display = 'block';
        return;
      }
      replyErr.style.display = 'none';
      replyBtn.disabled = true;
      replyBtn.textContent = 'G\u00F6nderiliyor\u2026';

      supabase.rpc('candidate_reply_to_ticket', {
        p_ticket_id: ticket.id,
        p_body: body
      }).then(function(res) {
        if (res.error) {
          console.error('candidate_reply_to_ticket error:', res.error);
          replyErr.textContent = 'G\u00F6nderilemedi. L\u00FCtfen tekrar dene.';
          replyErr.style.display = 'block';
          replyBtn.disabled = false;
          replyBtn.textContent = 'Yan\u0131t G\u00F6nder';
          return;
        }
        // Refresh ticket detail to show new message and updated status
        _tickets = null;
        supabase
          .from('support_tickets')
          .select('id, ticket_no, category, ui_topic, subject, description, status, created_at, updated_at')
          .eq('id', ticket.id)
          .maybeSingle()
          .then(function(tRes) {
            if (tRes.data) {
              showTicketDetail(tRes.data);
            } else {
              loadTickets();
            }
          });
      });
    });
    replyArea.appendChild(replyBtn);
    wrap.appendChild(replyArea);
  }

  // ── Resolved-ticket action buttons ──
  if (ticket.status === 'resolved') {
    var resolvedArea = document.createElement('div');
    resolvedArea.style.cssText = 'margin-top:20px;padding:18px;background:var(--bg-elevated, #F3F4F6);border-radius:12px;';

    var resolvedHint = document.createElement('div');
    resolvedHint.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text, #111);margin-bottom:14px;line-height:1.5;';
    resolvedHint.textContent = 'Destek ekibi talebini \u00E7\u00F6z\u00FCld\u00FC olarak i\u015Faretledi. Sorun devam ediyorsa bize bildir.';
    resolvedArea.appendChild(resolvedHint);

    var resolvedActions = document.createElement('div');
    resolvedActions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;';

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'destek-btn';
    confirmBtn.style.cssText = 'background:#059669;color:#fff;box-shadow:0 2px 8px rgba(5,150,105,0.2);';
    confirmBtn.textContent = 'Sorun \u00C7\u00F6z\u00FCld\u00FC';
    confirmBtn.addEventListener('click', function() {
      confirmBtn.disabled = true;
      supabase.rpc('candidate_confirm_resolved', { p_ticket_id: ticket.id })
        .then(function(res) {
          if (res.error) {
            console.error('candidate_confirm_resolved error:', res.error);
            confirmBtn.disabled = false;
            return;
          }
          _tickets = null;
          loadTickets();
        });
    });
    resolvedActions.appendChild(confirmBtn);

    var reopenBtn = document.createElement('button');
    reopenBtn.className = 'destek-btn destek-btn-ghost';
    reopenBtn.textContent = 'Devam Ediyor';
    reopenBtn.addEventListener('click', function() {
      reopenBtn.disabled = true;
      supabase.rpc('candidate_reopen_ticket', { p_ticket_id: ticket.id })
        .then(function(res) {
          if (res.error) {
            console.error('candidate_reopen_ticket error:', res.error);
            reopenBtn.disabled = false;
            return;
          }
          _tickets = null;
          loadTickets();
        });
    });
    resolvedActions.appendChild(reopenBtn);

    resolvedArea.appendChild(resolvedActions);
    wrap.appendChild(resolvedArea);
  }

  sec.appendChild(wrap);
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
        return;
      }
      var msgs = res.data || [];
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
