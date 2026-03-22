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
    .select('id,brand_name,slug,logo_url,website_url,instagram_url,short_description,segment,store_count_tr,store_cities,hq_city,employee_count_tr,is_featured,company_id')
    .not('website_url','is',null).eq('is_active',true).order('brand_name');

  var followsRes = _ht_candidate_id
    ? await supabase.from('candidate_brand_follows').select('brand_id').eq('candidate_id', _ht_candidate_id)
    : { data: [] };

  if (brandsRes.error) {
    console.error('[HT] loadBrandsPanel failed', brandsRes.error);
    document.getElementById('brand-grid').innerHTML = '<div class="brand-loading">Veriler yüklenemedi.</div>';
    _ht_sirketler_loaded = false;
    return;
  }

  _ht_brands = brandsRes.data || [];
  _ht_follows = new Set((followsRes.data || []).map(function(f) { return f.brand_id; }));

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
  updateBrandFollowCounter();

  var si = document.getElementById('brand-search');
  si.addEventListener('input', function() {
    var val = si.value.trim();
    if (!val) _ht_visible_count = 12;
    renderBrandGrid(si.value);
  });

  var counterBtn = document.getElementById('brand-follow-counter-btn');
  if (counterBtn) counterBtn.addEventListener('click', openBrandFollowsPopup);
  var popupClose = document.getElementById('brand-follows-popup-close');
  if (popupClose) popupClose.addEventListener('click', closeBrandFollowsPopup);
  var popupOverlay = document.getElementById('brand-follows-popup-overlay');
  if (popupOverlay) popupOverlay.addEventListener('click', function(e) { if (e.target === popupOverlay) closeBrandFollowsPopup(); });
}

var _ht_page_size = 12;
var _ht_visible_count = 12;

// ── Segment pills ──
function renderSegmentPills() {
  var container = document.getElementById('segment-pills');
  if (!container) return;
  var html = '';
  for (var i = 0; i < _SEGMENTS.length; i++) {
    var s = _SEGMENTS[i];
    var isActive = _ht_active_segment === s.key;
    html += '<div class="seg-pill' + (isActive ? ' active' : '') + '" data-segment="' + (s.key === null ? '' : _escHtml(s.key)) + '">' + _escHtml(s.label) + '</div>';
  }
  container.innerHTML = html;
  container.querySelectorAll('.seg-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var seg = pill.getAttribute('data-segment') || null;
      _ht_active_segment = seg;
      if (!seg) _ht_visible_count = 12;
      renderSegmentPills();
      renderBrandGrid(document.getElementById('brand-search').value);
    });
  });
}

// ── Flip card grid ──
function renderBrandGrid(query) {
  var container = document.getElementById('brand-grid');
  if (!_ht_brands) { container.innerHTML = ''; return; }

  var q = trLower((query || '').trim());
  var list = q
    ? _ht_brands.filter(function(b) { return trLower(b.brand_name).indexOf(q) !== -1; })
    : _ht_brands;
  if (_ht_active_segment) {
    list = list.filter(function(b) { return b.segment === _ht_active_segment; });
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="brand-loading">' + (q || _ht_active_segment ? 'Sonuç bulunamadı.' : 'Henüz marka verisi yok.') + '</div>';
    return;
  }

  var usePagination = !q && !_ht_active_segment;
  var visible = usePagination ? Math.min(_ht_visible_count, list.length) : list.length;
  var showLoadMore = usePagination && list.length > _ht_visible_count && visible < list.length;
  var remaining = list.length - visible;

  var html = '';
  for (var i = 0; i < visible; i++) {
    var b = list[i];
    var isF = _ht_follows.has(b.id);
    var colors = _brandColors(b.brand_name);
    var segLabel = (_SEGMENT_TR[b.segment] || (b.segment || '')).toUpperCase();
    var segColor = _segmentAccentColor(b.segment);
    var storeText = b.store_count_tr != null && b.store_count_tr !== '' ? b.store_count_tr + ' mağaza' : '';
    var cityText = '';
    if (b.store_cities && b.store_cities.length > 0) {
      cityText = b.store_cities.slice(0, 3).join(', ');
      if (b.store_cities.length > 3) cityText += '...';
    }
    var logoFront = _brandLogoHtml(b, 76);
    var logoBack = _brandLogoHtml(b, 40);

    html += '<div class="flip-card" onclick="this.classList.toggle(\'active\')" style="animation-delay:' + (i * 0.03) + 's;background:' + colors.backBg + ';">' +
      '<div class="flip-card-inner">' +
        '<div class="flip-front" style="background:' + _hexToRgba(colors.accent, 0.15) + ';">' +
          '<div class="front-logo">' + logoFront + '</div>' +
          '<div class="front-name">' + _escHtml(b.brand_name) + '</div>' +
          (segLabel ? '<div class="front-segment" style="background:' + segColor + '">' + _escHtml(segLabel) + '</div>' : '') +
          (storeText ? '<div class="front-stores">' + _escHtml(storeText) + '</div>' : '') +
          '<span class="flip-hint">detaylar →</span>' +
        '</div>' +
        '<div class="flip-back" style="background:' + colors.backBg + '">' +
          '<div class="back-brand-name">' + _escHtml(b.brand_name) + '</div>' +
          '<button type="button" class="back-follow-mini' + (isF ? ' following' : '') + '" data-brand-id="' + b.id + '" onclick="event.stopPropagation(); toggleBrandFollow(' + b.id + ',event)"><div class="tooltip-container"><span class="text"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 95 114" class="svgIcon"><rect fill="currentColor" rx="28.5" height="57" width="57" x="19"></rect><path fill="currentColor" d="M0 109.5C0 83.2665 21.2665 62 47.5 62V62C73.7335 62 95 83.2665 95 109.5V114H0V109.5Z"></path></svg>' + (isF ? 'Takipte' : 'Takip Et') + '</span></div></button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  if (showLoadMore) {
    html += '<button type="button" class="brand-load-more" id="brand-load-more">' +
      '<span class="plus-icon">+</span>' +
      '<span class="load-more-text">Daha fazla göster (' + remaining + ')</span>' +
    '</button>';
  }

  container.innerHTML = html;

  var loadMoreBtn = document.getElementById('brand-load-more');
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', function() {
    _ht_visible_count += _ht_page_size;
    renderBrandGrid(document.getElementById('brand-search').value);
  });
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
    refreshBrandFollowsPopupList();
    _showBrandToast('Bir hata oluştu. Tekrar deneyin.');
  }
  _ht_follow_busy = false;
}

function _updateAllFollowBtns(brandId) {
  var isF = _ht_follows.has(brandId);
  // Card buttons
  // Flip card back follow button
  var backBtns = document.querySelectorAll('.back-follow-mini[data-brand-id="' + brandId + '"]');
  for (var j = 0; j < backBtns.length; j++) {
    var _svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 95 114" class="svgIcon"><rect fill="currentColor" rx="28.5" height="57" width="57" x="19"></rect><path fill="currentColor" d="M0 109.5C0 83.2665 21.2665 62 47.5 62V62C73.7335 62 95 83.2665 95 109.5V114H0V109.5Z"></path></svg>';
    backBtns[j].innerHTML = '<div class="tooltip-container"><span class="text">' + _svgIcon + (isF ? 'Takipte' : 'Takip Et') + '</span></div>';
    if (isF) backBtns[j].classList.add('following'); else backBtns[j].classList.remove('following');
  }
}

// ── Follow counter button ──
function updateBrandFollowCounter() {
  var btn = document.getElementById('brand-follow-counter-btn');
  var numEl = document.getElementById('brand-follow-count-num');
  var n = _ht_follows ? _ht_follows.size : 0;
  if (numEl) numEl.textContent = n;
  if (btn) {
    btn.style.display = n > 0 ? 'inline-flex' : 'none';
    btn.style.opacity = '1';
  }
  var badge = document.getElementById('sirket-follow-count');
  if (badge) {
    var countText = badge.querySelector('.badge-count-text');
    if (countText) countText.textContent = n > 0 ? n + ' takip' : '';
    badge.style.display = n > 0 ? '' : 'none';
  }
  updateMarkalaBgDots();
}

function updateMarkalaBgDots() {
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

})();
