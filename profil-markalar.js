/* global supabase, currentUser, trLower */
/**
 * profil-markalar.js — Markalar Panel for profil.html
 * Brand card grid, flip cards, follow system, search, segment pills.
 * Extracted from profil-ui.js for maintainability.
 * All innerHTML from hardcoded constants or escaped DB fields — no XSS risk.
 */
(function(){
'use strict';

/* Utility: HTML escape (duplicated from profil-ui.js for module independence) */
function _escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
// MARKALAR PANEL — Card grid + Modal v3
// ═══════════════════════════════════════════════════════════════

var _ht_brands = null;
var _ht_follows = new Set();
var _ht_sirketler_loaded = false;
var _ht_candidate_id = null;

var _AVATAR_COLORS = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22','#34495E','#16A085','#C0392B'];
function _avatarColor(n) { return _AVATAR_COLORS[(n||'?').charCodeAt(0) % _AVATAR_COLORS.length]; }

var _SEGMENT_TR = { luxury: 'LUXURY', premium: 'PREMIUM', mid: 'MODA', sportswear: 'SPORT', beauty: 'BEAUTY', tech: 'TECH' };
var _SEGMENTS = [
  { key: null, label: 'TÜMÜ' },
  { key: 'luxury', label: 'LUXURY' },
  { key: 'premium', label: 'PREMIUM' },
  { key: 'mid', label: 'MODA' },
  { key: 'sportswear', label: 'SPORT' },
  { key: 'beauty', label: 'BEAUTY' },
  { key: 'tech', label: 'TECH' }
];
var _ht_active_segment = null;
var _ht_company_map = {};
var _ht_companies_warned = false;

var _BRAND_COLORS = {
  'Louis Vuitton': { frontBg: '', backBg: '#4D3022', accent: '#4D3022' },
  'Gucci': { frontBg: '', backBg: '#006633', accent: '#006633' },
  'Prada': { frontBg: '', backBg: '#1A1A2E', accent: '#1A1A2E' },
  'Hermès': { frontBg: '', backBg: '#F37021', accent: '#F37021' },
  'Dior': { frontBg: '', backBg: '#2C2C3A', accent: '#2C2C3A' },
  'Chanel': { frontBg: '', backBg: '#1B1B1B', accent: '#1B1B1B' },
  'Cartier': { frontBg: '', backBg: '#B11F24', accent: '#B11F24' },
  'Beymen': { frontBg: '', backBg: '#4A3728', accent: '#4A3728' },
  'Vakko': { frontBg: '', backBg: '#3D0C02', accent: '#3D0C02' },
  'Massimo Dutti': { frontBg: '', backBg: '#2D2926', accent: '#2D2926' },
  'Hugo Boss': { frontBg: '', backBg: '#1C1C28', accent: '#1C1C28' },
  'Ralph Lauren': { frontBg: '', backBg: '#041E42', accent: '#041E42' },
  'Lacoste': { frontBg: '', backBg: '#004526', accent: '#004526' },
  'Alo Yoga': { frontBg: '', backBg: '#5C4033', accent: '#5C4033' },
  'lululemon': { frontBg: '', backBg: '#D31334', accent: '#D31334' },
  'Nike': { frontBg: '', backBg: '#2D2D2D', accent: '#2D2D2D' },
  'Adidas': { frontBg: '', backBg: '#1A3C34', accent: '#1A3C34' },
  'Zara': { frontBg: '', backBg: '#232328', accent: '#232328' },
  'H&M': { frontBg: '', backBg: '#E50010', accent: '#E50010' },
  'Mango': { frontBg: '', backBg: '#8B4513', accent: '#8B4513' },
  'Boyner': { frontBg: '', backBg: '#00AEEF', accent: '#00AEEF' },
  'Pull & Bear': { frontBg: '', backBg: '#2F4F3A', accent: '#2F4F3A' },
  'Bershka': { frontBg: '', backBg: '#3B1F5E', accent: '#3B1F5E' },
  'Stradivarius': { frontBg: '', backBg: '#6B4226', accent: '#6B4226' },
  'Zara Home': { frontBg: '', backBg: '#4A5548', accent: '#4A5548' },
  'LC Waikiki': { frontBg: '', backBg: '#1F4294', accent: '#1F4294' },
  'Sephora': { frontBg: '', backBg: '#2D1F3D', accent: '#2D1F3D' },
  'MAC': { frontBg: '', backBg: '#5C1A2A', accent: '#5C1A2A' },
  'Apple': { frontBg: '', backBg: '#3C3C3C', accent: '#3C3C3C' },
  'Samsung': { frontBg: '', backBg: '#1428A0', accent: '#1428A0' },
  'Teknosa': { frontBg: '', backBg: '#FF6700', accent: '#FF6700' },
  'Koton': { frontBg: '', backBg: '#3A2F4A', accent: '#3A2F4A' }
};

// ── K037: Variant E — Color Flood brand accent map ──
// Seed of ~30 Turkish retail brands → single dominant flat accent color.
// Unknown brands fall through to a deterministic HSL hash (muted dark).
var BRAND_ACCENT_COLORS = {
  'Chanel':           '#0a0a0a',
  'Hermes':           '#b8571a',
  'Hermès':           '#b8571a',
  'Zara':             '#2c3e66',
  'Bershka':          '#3b1f5e',
  'Pull & Bear':      '#2f4f3a',
  'Pull&Bear':        '#2f4f3a',
  'Nike':             '#ff6b35',
  'Adidas':           '#1a3c34',
  'Sephora':          '#1a1a1a',
  'MAC':              '#5c1a2a',
  'LC Waikiki':       '#1f4294',
  'Beymen':           '#4a3728',
  'Boyner':           '#00aeef',
  'Koton':            '#3a2f4a',
  'Defacto':          '#c8102e',
  'DeFacto':          '#c8102e',
  'Mavi':             '#002b5c',
  "Colin's":          '#1d3f72',
  'Colins':           '#1d3f72',
  'Apple Store':      '#1d1d1f',
  'Apple':            '#1d1d1f',
  'Dior':             '#2c2c3a',
  'Gucci':            '#006633',
  'Louis Vuitton':    '#4d3022',
  'Prada':            '#1a1a2e',
  'Cartier':          '#b11f24',
  'Tiffany':          '#0abab5',
  'Tiffany & Co.':    '#0abab5',
  'Tom Ford':         '#1b1b1b',
  'Estee Lauder':     '#2b2420',
  'Estée Lauder':     '#2b2420',
  'Yves Saint Laurent':'#1b1b1b',
  'YSL':              '#1b1b1b',
  'Burberry':         '#61452a',
  'Michael Kors':     '#1c1c1c',
  'Tommy Hilfiger':   '#041e42',
  'Calvin Klein':     '#0e0e0e'
};

function _hashHueFromName(name) {
  var h = 0;
  var s = name || '';
  for (var i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
function _hslToHex(hDeg, sPct, lPct) {
  var h = hDeg / 360;
  var s = sPct / 100;
  var l = lPct / 100;
  var r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    var hue2rgb = function(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  var toHex = function(x) {
    var hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
function getBrandAccentColor(name) {
  if (!name) return '#1E2D5E';
  if (BRAND_ACCENT_COLORS[name]) return BRAND_ACCENT_COLORS[name];
  var lower = name.toLocaleLowerCase('tr');
  var keys = Object.keys(BRAND_ACCENT_COLORS);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLocaleLowerCase('tr') === lower) return BRAND_ACCENT_COLORS[keys[i]];
  }
  var hue = _hashHueFromName(name);
  return _hslToHex(hue, 35, 25);
}
window._htGetBrandAccentColor = getBrandAccentColor;

function _hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r = parseInt(hex.substring(0,2), 16);
  var g = parseInt(hex.substring(2,4), 16);
  var b = parseInt(hex.substring(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function _brandColors(brandName) {
  return _BRAND_COLORS[brandName] || {
    frontBg: '',
    backBg: '#2A2A3A',
    accent: '#2A2A3A'
  };
}

function _segmentAccentColor(seg) {
  var map = { luxury: '#1E2D5E', premium: '#C94E28', mid: '#3B82F6', sportswear: '#F59E0B', beauty: '#EC4899', tech: '#6366F1' };
  return map[seg] || '#6B7280';
}

function _brandLogoUrl(b) {
  if (b.logo_url) return b.logo_url;
  if (b.website_url) {
    try {
      var domain = new URL(b.website_url).hostname.replace('www.', '');
      return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
    } catch(e) {}
  }
  return null;
}

// Single logo fallback: replace img with initial (avoids img + initial both visible).
window._htBrandLogoError = function(imgEl) {
  var initial = (imgEl.getAttribute('data-initial') || '?').replace(/</g,'').replace(/>/g,'');
  var color = imgEl.getAttribute('data-color') || '#6B7280';
  imgEl.outerHTML = '<span class="brand-initial" style="background:'+color+';width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#fff;">'+initial+'</span>';
};

function _brandLogoHtml(b, sz) {
  sz = sz || 48;
  var url = _brandLogoUrl(b);
  var initial = _escHtml((b.brand_name||'?').charAt(0).toUpperCase());
  var color = _avatarColor(b.brand_name);
  if (url) {
    return '<div class="brand-logo-wrap" style="width:'+sz+'px;height:'+sz+'px;">' +
      '<img src="'+_escHtml(url)+'" alt="'+_escHtml(b.brand_name)+'" data-initial="'+initial+'" data-color="'+_escHtml(color)+'" onerror="window._htBrandLogoError(this)"></div>';
  }
  return '<div class="brand-logo-wrap" style="width:'+sz+'px;height:'+sz+'px;"><span class="brand-initial" style="background:'+color+'">'+initial+'</span></div>';
}

function _segmentTag(seg) {
  if (!seg) return '';
  return '<span class="brand-segment '+_escHtml(seg)+'">'+_escHtml(_SEGMENT_TR[seg]||seg)+'</span>';
}

function _shortDomain(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.',''); } catch(e) { return url; }
}

function _igHandle(url) {
  if (!url) return '';
  try { var p = new URL(url).pathname.replace(/\//g,''); return '@' + p; } catch(e) { return url; }
}

// ── Load panel ──
async function loadSirketlerPanel() {
  if (_ht_sirketler_loaded) return;
  _ht_sirketler_loaded = true;

  if (!_ht_candidate_id && currentUser) {
    var cr = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).maybeSingle();
    if (cr.data) _ht_candidate_id = cr.data.id;
  }

  var brandsRes = await supabase.from('brands')
    .select('id,brand_name,slug,logo_url,website_url,instagram_url,short_description,segment,store_count_tr,store_cities,hq_city,employee_count_tr,is_featured,company_id,cover_image_url')
    .not('website_url','is',null).eq('is_active',true).order('brand_name');

  var followsRes = _ht_candidate_id
    ? await supabase.from('candidate_brand_follows').select('brand_id').eq('candidate_id', _ht_candidate_id)
    : { data: [] };

  if (brandsRes.error) {
    console.error('[HT] loadBrandsPanel failed', brandsRes.error);
    document.getElementById('brand-grid').innerHTML = '<div class="sk-grid__empty">Veriler yüklenemedi.</div>';
    _ht_sirketler_loaded = false;
    return;
  }

  _ht_brands = brandsRes.data || [];
  _ht_follows = new Set((followsRes.data || []).map(function(f) { return f.brand_id; }));

  // Fetch parent company names (two-stage: brands.company_id -> companies.company_name)
  var _companyIds = [];
  var _seenCompany = {};
  for (var _ci = 0; _ci < _ht_brands.length; _ci++) {
    var _cid = _ht_brands[_ci].company_id;
    if (_cid != null && !_seenCompany[_cid]) {
      _seenCompany[_cid] = true;
      _companyIds.push(_cid);
    }
  }
  if (_companyIds.length > 0) {
    try {
      var _coRes = await supabase.from('companies').select('id,company_name').in('id', _companyIds);
      if (_coRes.error) {
        if (!_ht_companies_warned) { console.warn('[HT] companies join failed, parent labels disabled', _coRes.error); _ht_companies_warned = true; }
      } else if (_coRes.data) {
        for (var _coi = 0; _coi < _coRes.data.length; _coi++) {
          _ht_company_map[_coRes.data[_coi].id] = _coRes.data[_coi].company_name || '';
        }
      }
    } catch (_coErr) {
      if (!_ht_companies_warned) { console.warn('[HT] companies fetch threw, parent labels disabled', _coErr); _ht_companies_warned = true; }
    }
  }

  // Sign brand logos from private cvs bucket (strip full URL to path first)
  var _logoPathMap = {};
  var _logoPaths = [];
  _ht_brands.forEach(function(b) {
    if (b.logo_url && b.logo_url.indexOf('/cvs/') !== -1) {
      var idx = b.logo_url.lastIndexOf('/cvs/');
      var path = b.logo_url.substring(idx + 5);
      _logoPathMap[b.id] = path;
      _logoPaths.push(path);
    }
  });
  if (_logoPaths.length > 0) {
    var _signedMap = await window.HT.signStorageUrls(_logoPaths);
    _ht_brands.forEach(function(b) {
      if (_logoPathMap[b.id] && _signedMap[_logoPathMap[b.id]]) {
        b.logo_url = _signedMap[_logoPathMap[b.id]];
      }
    });
  }

  // Bento sort: vibrant brands at hero positions (1,4,5,8,9,11,14,15,18,19...)
  _ht_brands.sort(function(a, b) {
    return (a.brand_name || '').localeCompare(b.brand_name || '', 'tr');
  });
  var _vibrant = ['Boyner','Cartier','Gucci','H&M','Hermès','Lacoste','LC Waikiki','lululemon','Louis Vuitton','Mango','Ralph Lauren','Samsung','Teknosa'];
  var hero = _ht_brands.filter(function(b) { return _vibrant.indexOf(b.brand_name) !== -1; });
  var rest = _ht_brands.filter(function(b) { return _vibrant.indexOf(b.brand_name) === -1; });
  // Interleave: 1 hero then 2 rest, repeat — heroes land on nth-child(10n+1,4,5,8,9)
  var mixed = [], hi = 0, ri = 0;
  while (hi < hero.length || ri < rest.length) {
    if (hi < hero.length) mixed.push(hero[hi++]);
    if (ri < rest.length) mixed.push(rest[ri++]);
    if (ri < rest.length) mixed.push(rest[ri++]);
    if (hi < hero.length) mixed.push(hero[hi++]);
    if (ri < rest.length) mixed.push(rest[ri++]);
  }
  _ht_brands = mixed;

  _ht_visible_count = 12;
  renderSegmentPills();
  renderBrandGrid('');
  renderFollowedStrip();
  updateBrandFollowCounter();

  var si = document.getElementById('brand-search');
  if (si) si.addEventListener('input', function() {
    var val = si.value.trim();
    if (!val) _ht_visible_count = 12;
    renderBrandGrid(si.value);
  });

  var seeAllBtn = document.getElementById('sk-followed-all');
  if (seeAllBtn) seeAllBtn.addEventListener('click', openBrandFollowsPopup);
  var popupClose = document.getElementById('brand-follows-popup-close');
  if (popupClose) popupClose.addEventListener('click', closeBrandFollowsPopup);
  var popupOverlay = document.getElementById('brand-follows-popup-overlay');
  if (popupOverlay) popupOverlay.addEventListener('click', function(e) { if (e.target === popupOverlay) closeBrandFollowsPopup(); });
}

var _ht_page_size = 12;
var _ht_visible_count = 12;

// ── Segment pills (K036 editorial text-links with vermillion underline) ──
function renderSegmentPills() {
  var container = document.getElementById('segment-pills');
  if (!container) return;
  var html = '';
  for (var i = 0; i < _SEGMENTS.length; i++) {
    var s = _SEGMENTS[i];
    var isActive = _ht_active_segment === s.key;
    if (i > 0) html += '<span class="sk-filter__seg-sep" aria-hidden="true">·</span>';
    html += '<button type="button" class="sk-filter__seg-item' + (isActive ? ' is-active' : '') + '" data-segment="' + (s.key === null ? '' : _escHtml(s.key)) + '">' + _escHtml(s.label) + '</button>';
  }
  container.innerHTML = html;
  container.querySelectorAll('.sk-filter__seg-item').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var seg = pill.getAttribute('data-segment') || null;
      _ht_active_segment = seg;
      if (!seg) _ht_visible_count = 12;
      renderSegmentPills();
      var si = document.getElementById('brand-search');
      renderBrandGrid(si ? si.value : '');
    });
  });
}

// ── Brand grid (K036 editorial sk-brand cards) ──
function renderBrandGrid(query) {
  var container = document.getElementById('brand-grid');
  if (!container) return;
  if (!_ht_brands) { container.innerHTML = ''; return; }

  var q = trLower((query || '').trim());
  var list = q
    ? _ht_brands.filter(function(b) { return trLower(b.brand_name).indexOf(q) !== -1; })
    : _ht_brands;
  if (_ht_active_segment) {
    list = list.filter(function(b) { return b.segment === _ht_active_segment; });
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="sk-grid__empty">' + (q || _ht_active_segment ? 'Sonuç bulunamadı.' : 'Henüz marka verisi yok.') + '</div>';
    return;
  }

  // Render all filtered results (grid paginates visually via auto-fill)
  container.innerHTML = '';
  var frag = document.createDocumentFragment();

  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    frag.appendChild(_buildBrandCard(b, i));
  }

  container.appendChild(frag);
}

function _buildBrandCard(b, idx) {
  var isF = _ht_follows.has(b.id);
  var card = document.createElement('article');
  card.className = 'sk-card sk-brand' + (b.is_featured ? ' sk-brand--featured' : '');
  card.style.animationDelay = (Math.min(idx, 8) * 60) + 'ms';
  card.setAttribute('tabindex', '0');
  card.style.setProperty('--sk-brand-accent', getBrandAccentColor(b.brand_name));

  // Top row: logo + name/meta
  var top = document.createElement('div');
  top.className = 'sk-brand__top';

  var logoWrap = document.createElement('div');
  logoWrap.className = 'sk-brand__logo';
  var logoUrl = _brandLogoUrl(b);
  if (logoUrl) {
    var img = document.createElement('img');
    img.alt = b.brand_name || '';
    img.src = logoUrl;
    img.setAttribute('data-initial', (b.brand_name || '?').charAt(0).toUpperCase());
    img.setAttribute('data-color', _avatarColor(b.brand_name));
    img.setAttribute('onerror', 'window._htBrandLogoError(this)');
    logoWrap.appendChild(img);
  } else {
    logoWrap.classList.add('sk-brand__logo--initial');
    logoWrap.style.background = _avatarColor(b.brand_name);
    logoWrap.textContent = (b.brand_name || '?').charAt(0).toUpperCase();
  }
  top.appendChild(logoWrap);

  var nameCol = document.createElement('div');
  var h3 = document.createElement('h3');
  h3.className = 'sk-brand__name';
  h3.textContent = b.brand_name || '';
  nameCol.appendChild(h3);

  var meta = document.createElement('div');
  meta.className = 'sk-brand__meta';
  var segLabel = _SEGMENT_TR[b.segment] || (b.segment ? b.segment.toUpperCase() : '');
  var locLabel = '';
  if (b.hq_city) {
    locLabel = b.hq_city;
  } else if (b.store_cities && b.store_cities.length > 0) {
    locLabel = b.store_cities.length + ' şehir';
  }
  meta.textContent = [segLabel, locLabel].filter(Boolean).join(' · ');
  nameCol.appendChild(meta);
  top.appendChild(nameCol);
  card.appendChild(top);

  // Description
  if (b.short_description) {
    var desc = document.createElement('p');
    desc.className = 'sk-brand__desc';
    desc.textContent = b.short_description;
    card.appendChild(desc);
  }

  // Stats row
  var stats = document.createElement('div');
  stats.className = 'sk-brand__stats';
  var statParts = [];
  if (b.store_count_tr != null && b.store_count_tr !== '') statParts.push(b.store_count_tr + ' Mağaza');
  if (b.store_cities && b.store_cities.length > 0) statParts.push(b.store_cities.length + ' Şehir');
  if (b.employee_count_tr) {
    var emp = b.employee_count_tr >= 1000
      ? (Math.round(b.employee_count_tr / 100) / 10) + 'K'
      : b.employee_count_tr.toLocaleString('tr-TR');
    statParts.push(emp + ' Kişi');
  }
  if (statParts.length === 0) {
    stats.textContent = '\u00a0';
  } else {
    for (var si2 = 0; si2 < statParts.length; si2++) {
      if (si2 > 0) {
        var sep = document.createElement('span');
        sep.className = 'sk-brand__stats-sep';
        sep.textContent = '·';
        stats.appendChild(sep);
      }
      var sp = document.createElement('span');
      sp.textContent = statParts[si2];
      stats.appendChild(sp);
    }
  }
  card.appendChild(stats);

  // Parent group label (mono italic)
  var group = document.createElement('div');
  group.className = 'sk-brand__group';
  var groupName = (b.company_id != null && _ht_company_map[b.company_id]) ? _ht_company_map[b.company_id] : '';
  group.textContent = groupName ? (groupName + ' grubu') : '';
  card.appendChild(group);

  // Follow button
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sk-brand__follow' + (isF ? ' is-following' : '');
  btn.setAttribute('data-brand-id', b.id);
  btn.setAttribute('onclick', 'toggleBrandFollow(' + b.id + ',event)');
  btn.textContent = isF ? 'TAKİP EDİYORSUN ✓' : 'TAKİP ET';
  card.appendChild(btn);

  return card;
}

// ── Followed horizontal strip ──
function renderFollowedStrip() {
  var card = document.getElementById('sk-followed-card');
  var row = document.getElementById('sk-followed-row');
  if (!card || !row) return;

  var followed = _ht_brands ? _ht_brands.filter(function(b) { return _ht_follows.has(b.id); }) : [];

  if (followed.length === 0) {
    card.setAttribute('hidden', '');
    row.innerHTML = '';
    return;
  }
  card.removeAttribute('hidden');

  var frag = document.createDocumentFragment();
  var limit = Math.min(followed.length, 12);
  for (var i = 0; i < limit; i++) {
    var b = followed[i];
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'sk-followed__chip';
    chip.setAttribute('data-brand-id', b.id);
    chip.setAttribute('onclick', 'openBrandFollowsPopup()');

    var logo = document.createElement('div');
    logo.className = 'sk-followed__chip-logo';
    var url = _brandLogoUrl(b);
    if (url) {
      var img2 = document.createElement('img');
      img2.src = url;
      img2.alt = b.brand_name || '';
      img2.setAttribute('data-initial', (b.brand_name || '?').charAt(0).toUpperCase());
      img2.setAttribute('data-color', _avatarColor(b.brand_name));
      img2.setAttribute('onerror', 'window._htBrandLogoError(this)');
      logo.appendChild(img2);
    } else {
      logo.textContent = (b.brand_name || '?').charAt(0).toUpperCase();
    }
    chip.appendChild(logo);

    var nm = document.createElement('span');
    nm.className = 'sk-followed__chip-name';
    nm.textContent = b.brand_name || '';
    chip.appendChild(nm);
    frag.appendChild(chip);
  }
  row.innerHTML = '';
  row.appendChild(frag);
}

// ── Follow / Unfollow ──
var _ht_follow_busy = false;

async function toggleBrandFollow(brandId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  if (_ht_follow_busy || !_ht_candidate_id) return;
  _ht_follow_busy = true;

  var wasFollowed = _ht_follows.has(brandId);
  if (wasFollowed) { _ht_follows.delete(brandId); } else { _ht_follows.add(brandId); }

  _updateAllFollowBtns(brandId);
  updateBrandFollowCounter();
  renderFollowedStrip();
  refreshBrandFollowsPopupList();

  var res;
  if (wasFollowed) {
    res = await supabase.from('candidate_brand_follows')
      .delete().eq('candidate_id', _ht_candidate_id).eq('brand_id', brandId);
  } else {
    res = await supabase.from('candidate_brand_follows')
      .insert({ candidate_id: _ht_candidate_id, brand_id: brandId });
  }

  if (res.error) {
    console.error('[HT] toggleBrandFollow failed', res.error);
    if (wasFollowed) { _ht_follows.add(brandId); } else { _ht_follows.delete(brandId); }
    _updateAllFollowBtns(brandId);
    updateBrandFollowCounter();
    renderFollowedStrip();
    refreshBrandFollowsPopupList();
    _showBrandToast('Bir hata oluştu. Tekrar deneyin.');
  }
  _ht_follow_busy = false;
}

function _updateAllFollowBtns(brandId) {
  var isF = _ht_follows.has(brandId);
  var btns = document.querySelectorAll('.sk-brand__follow[data-brand-id="' + brandId + '"]');
  for (var j = 0; j < btns.length; j++) {
    if (isF) btns[j].classList.add('is-following'); else btns[j].classList.remove('is-following');
    btns[j].textContent = isF ? 'TAKİP EDİYORSUN ✓' : 'TAKİP ET';
  }
}

// ── Hero counters + legacy badge sync ──
function updateBrandFollowCounter() {
  var n = _ht_follows ? _ht_follows.size : 0;
  var total = _ht_brands ? _ht_brands.length : 0;

  var followedCount = document.getElementById('sk-followed-count');
  if (followedCount) followedCount.textContent = n;
  var followedCount2 = document.getElementById('sk-followed-count2');
  if (followedCount2) followedCount2.textContent = n;
  var totalCount = document.getElementById('sk-total-count');
  if (totalCount) totalCount.textContent = total;

  var badge = document.getElementById('sirket-follow-count');
  if (badge) {
    var countText = badge.querySelector('.badge-count-text');
    if (countText) countText.textContent = n > 0 ? n + ' takip' : '';
    badge.style.display = n > 0 ? '' : 'none';
  }
  updateMarkalaBgDots();
}

function updateMarkalaBgDots() {
  // K036: legacy .bg-markalar surface removed; no-op but kept for export stability.
  var container = document.querySelector('.bg-markalar');
  if (!container) return;
  var ids = Array.from(_ht_follows || []).slice(0, 4);
  var brands = _ht_brands ? ids.map(function(id) { return _ht_brands.find(function(b) { return b.id === id; }); }).filter(Boolean) : [];
  if (brands.length === 0) {
    brands = _ht_brands ? _ht_brands.filter(function(b) { return b.is_featured; }).slice(0, 4) : [];
  }
  container.innerHTML = brands.map(function(b) {
    var url = _brandLogoUrl(b);
    return '<div class="brand-dot"><img src="' + _escHtml(url || '') + '" alt=""></div>';
  }).join('');
}

// ── Follow list popup ──
function openBrandFollowsPopup() {
  if (_ht_follows.size === 0) return;
  var overlay = document.getElementById('brand-follows-popup-overlay');
  if (overlay) overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  refreshBrandFollowsPopupList();
  document.addEventListener('keydown', _htBrandFollowsPopupEsc);
}

function closeBrandFollowsPopup() {
  var overlay = document.getElementById('brand-follows-popup-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', _htBrandFollowsPopupEsc);
}

function _htBrandFollowsPopupEsc(e) {
  if (e.key === 'Escape') closeBrandFollowsPopup();
}

function refreshBrandFollowsPopupList() {
  var listEl = document.getElementById('brand-follows-popup-list');
  if (!listEl) return;
  var followed = _ht_brands ? _ht_brands.filter(function(b) { return _ht_follows.has(b.id); }) : [];
  var html = '';
  for (var i = 0; i < followed.length; i++) {
    var b = followed[i];
    html += '<div class="brand-follows-popup-item">' +
      '<div class="brand-follows-popup-item-logo">' + _brandLogoHtml(b, 32) + '</div>' +
      '<span class="brand-follows-popup-item-name">' + _escHtml(b.brand_name) + '</span>' +
      '<button type="button" class="brand-follows-popup-unfollow" onclick="toggleBrandFollow(' + b.id + ',event)">Takibi Bırak</button>' +
    '</div>';
  }
  listEl.innerHTML = html || '<p class="brand-follows-popup-empty">Henüz takip ettiğin marka yok.</p>';
}

// ── Toast ──
function _showBrandToast(msg) {
  var ex = document.getElementById('brand-toast');
  if (ex) ex.remove();
  var t = document.createElement('div');
  t.id = 'brand-toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .3s;';
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.style.opacity = '1'; });
  setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, 2500);
}

/* ═══════════════════════════════════════════════════════════════
   EXPOSE TO WINDOW (for profil.html panel switching + bento card)
   ═══════════════════════════════════════════════════════════════ */
window.loadSirketlerPanel = loadSirketlerPanel;
window.toggleBrandFollow = toggleBrandFollow;
window.openBrandFollowsPopup = openBrandFollowsPopup;
window.closeBrandFollowsPopup = closeBrandFollowsPopup;
window.updateMarkalaBgDots = updateMarkalaBgDots;

/* ── Readiness helper for Genel teaser follow interactions ── */
/* Returns true only when candidate_id + follow state are initialized */
window._htBrandFollowReady = function() {
  return !!_ht_candidate_id && _ht_sirketler_loaded;
};

/* ── Single async teaser contract for Genel right-rail brand card ── */
/* Owns all data fetching, sorting, and state — Genel only renders the result. */
/* Returns: { items: [{id,brand_name,logo_url,segment}], followedIds: {id:true}, canToggleInline: bool, empty: bool } */
window._htGetGenelBrandTeaser = async function() {
  /* If markalar panel already loaded, use its cached truth */
  if (_ht_brands && _ht_brands.length > 0) {
    var followedIds = {};
    if (_ht_follows) _ht_follows.forEach(function(id) { followedIds[id] = true; });
    var nf = [];
    var af = [];
    for (var i = 0; i < _ht_brands.length; i++) {
      if (_ht_follows && _ht_follows.has(_ht_brands[i].id)) af.push(_ht_brands[i]);
      else nf.push(_ht_brands[i]);
    }
    var picked = nf.concat(af).slice(0, 3).map(function(b) {
      return { id: b.id, brand_name: b.brand_name, logo_url: b.logo_url, segment: b.segment, cover_image_url: b.cover_image_url || '' };
    });
    return { items: picked, followedIds: followedIds, canToggleInline: !!_ht_candidate_id, empty: false };
  }

  /* Fresh session — fetch brands + follows directly */
  try {
    var bRes = await supabase.from('brands')
      .select('id, brand_name, logo_url, segment, cover_image_url')
      .eq('is_active', true)
      .not('website_url', 'is', null)
      .order('is_featured', { ascending: false })
      .limit(20);
    var allBrands = (bRes.data && bRes.data.length) ? bRes.data : [];
    if (allBrands.length === 0) return { items: [], followedIds: {}, canToggleInline: false, empty: true };

    var fIds = {};
    if (currentUser) {
      var cRes = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).maybeSingle();
      if (cRes.data) {
        var fRes = await supabase.from('candidate_brand_follows').select('brand_id').eq('candidate_id', cRes.data.id);
        if (fRes.data) {
          for (var fi = 0; fi < fRes.data.length; fi++) fIds[fRes.data[fi].brand_id] = true;
        }
      }
    }
    var nf2 = [];
    var af2 = [];
    for (var bi = 0; bi < allBrands.length; bi++) {
      if (fIds[allBrands[bi].id]) af2.push(allBrands[bi]);
      else nf2.push(allBrands[bi]);
    }
    var items = nf2.concat(af2).slice(0, 3).map(function(b) {
      return { id: b.id, brand_name: b.brand_name, logo_url: b.logo_url, segment: b.segment };
    });
    return { items: items, followedIds: fIds, canToggleInline: false, empty: false };
  } catch (e) {
    console.error('[HT] brand teaser fetch:', e.message);
    return { items: [], followedIds: {}, canToggleInline: false, empty: true };
  }
};

})();
