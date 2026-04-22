/* ============================================================
 * profil-studio-coach.js
 *
 * Extracted from profil-studio.js (K044 Faz 1F — god-file split).
 * Coach feed "Koçlardan Öğren" surface: published posts listing, filters,
 * card grid, detail overlay, like toggling.
 *
 * Load order: BEFORE profil-studio.js — shared SVG constants (closeSVG,
 * heartOutlineSVG, heartFilledSVG, arrowRightSVG) declared here because
 * studio.js's practice drawer also uses closeSVG.
 *
 * Consumes (window/global expected at call time, not load time):
 *   - supabase (client)
 *   - COACH_CAT_TO_COMP, buildPracticeBridgeCTA (cross-link maps in studio.js)
 *   - getBridge, navigate, startSession (studio.js core)
 *   - window._htBuildCoachCover, window._htBuildCoachAvatar (profil-genel.js)
 *   - window._htShowCoachCard (profil-genel.js)
 *   - window._HT_STUDIO_FROZEN (feature flag)
 *
 * Exposes top-level globals (var in non-module context):
 *   - closeSVG, heartOutlineSVG, heartFilledSVG, arrowRightSVG
 *   - hydrateCoachFeed, applyCoachFilters, renderCoachGrid, buildCoachCard,
 *     openCoachDetail, toggleCoachLike, trLowerCoach
 *   - COACH_CATEGORY_LABELS, COACH_CATEGORY_KEYS
 *   - _coachFeedLoaded, _coachFeedPosts, _coachLikedSet
 *
 * Plus window.openCoachDetail for legacy bento home surface (Genel Bakış).
 *
 * NOT IIFE-wrapped intentionally — studio.js itself is flat globals, coach
 * split mirrors that style so cross-file var references work cleanly.
 * ============================================================ */

/* global supabase,
   COACH_CAT_TO_COMP, buildPracticeBridgeCTA,
   getBridge, navigate, startSession */

/* ── State ── */
var _coachFeedLoaded = false;
var _coachFeedPosts = [];
var _coachLikedSet = {};

/* ── Category labels & keys ── */
var COACH_CATEGORY_LABELS = {
  mulakat_ipucu: 'Mülakat İpucu',
  yetkinlik_rehberi: 'Yetkinlik Rehberi',
  kariyer_gelisim_onerileri: 'Kariyer Gelişim',
  performans: 'Performans',
  kariyer_hikayesi: 'Kariyer Hikayesi',
  sektor_analizi: 'Sektör Analizi',
  /* backward compat for old rows that might not be migrated yet */
  kariyer_hikaye: 'Kariyer Hikayesi',
  sektor_analiz: 'Sektör Analizi'
};

/* Canonical category keys for filter dropdown (excludes backward-compat aliases) */
var COACH_CATEGORY_KEYS = [
  'mulakat_ipucu', 'yetkinlik_rehberi', 'kariyer_gelisim_onerileri',
  'performans', 'kariyer_hikayesi', 'sektor_analizi'
];

/* Turkish-safe lowercase for search */
function trLowerCoach(s) {
  if (!s) return '';
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

/* Hardcoded SVG constants — safe for innerHTML */
var heartOutlineSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
var heartFilledSVG = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
var closeSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
var arrowRightSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

async function hydrateCoachFeed() {
  if (_coachFeedLoaded) return;
  _coachFeedLoaded = true;

  var feedEl = document.getElementById('ig-coach-feed');
  if (!feedEl) return;

  try {
    /* Fetch bounded set of published posts (latest 24) for client-side filtering */
    var MK_SELECT_FULL = 'id, title, excerpt, category, like_count, related_role, body, cover_image_url, cover_image_alt, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years, linkedin_url)';
    var MK_SELECT_SAFE = 'id, title, excerpt, category, like_count, related_role, body, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years, linkedin_url)';

    var postsRes = await supabase
      .from('coach_posts')
      .select(MK_SELECT_FULL)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(24);

    /* If query fails (e.g. cover_image columns missing), retry without media fields */
    if (postsRes.error) {
      console.warn('[mulakatkocu] coach_posts query failed, retrying without cover fields:', postsRes.error.message);
      postsRes = await supabase
        .from('coach_posts')
        .select(MK_SELECT_SAFE)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(24);
    }
    if (postsRes.error) {
      console.error('[mulakatkocu] coach_posts query failed:', postsRes.error.message);
      /* Show error state instead of silently hiding feed */
      if (feedEl) {
        var errMsg = document.createElement('div');
        errMsg.style.cssText = 'text-align:center;padding:24px;color:var(--muted,#6B7280);font-size:13px;';
        errMsg.textContent = '\u0130\u00E7erikler \u015Fu an y\u00FCklenemiyor. L\u00FCtfen sayfay\u0131 yenileyin.';
        feedEl.appendChild(errMsg);
      }
      return;
    }

    var posts = (postsRes.data && postsRes.data.length) ? postsRes.data : [];
    if (posts.length === 0) return; /* No published posts — keep feed hidden */

    _coachFeedPosts = posts;

    /* Fetch candidate's own likes — RLS returns only own rows */
    var postIds = posts.map(function(p) { return p.id; });
    var likesRes = await supabase
      .from('coach_post_likes')
      .select('post_id')
      .in('post_id', postIds);

    _coachLikedSet = {};
    if (likesRes.data) {
      for (var li = 0; li < likesRes.data.length; li++) {
        _coachLikedSet[likesRes.data[li].post_id] = true;
      }
    }

    /* Build feed DOM */
    while (feedEl.firstChild) feedEl.removeChild(feedEl.firstChild);

    /* Header */
    var header = document.createElement('div');
    header.className = 'ig-coach-feed-header';
    var titleEl = document.createElement('div');
    titleEl.className = 'ig-coach-feed-title';
    titleEl.textContent = 'Ko\u00E7 \u2014 Uzmanlardan \u00D6\u011Fren';
    header.appendChild(titleEl);
    var subEl = document.createElement('div');
    subEl.className = 'ig-coach-feed-sub';
    subEl.textContent = 'Sekt\u00F6r uzmanlar\u0131ndan m\u00FClakat ipuclar\u0131, yetkinlik rehberleri ve kariyer \u00F6nerileri';
    header.appendChild(subEl);
    feedEl.appendChild(header);

    /* ── Filter controls ── */
    var filterBar = document.createElement('div');
    filterBar.className = 'ig-coach-filters';

    /* Category dropdown */
    var catSelect = document.createElement('select');
    catSelect.className = 'ig-coach-filter-select';
    catSelect.id = 'ig-coach-f-cat';
    var catAll = document.createElement('option');
    catAll.value = '';
    catAll.textContent = 'T\u00FCm kategoriler';
    catSelect.appendChild(catAll);
    for (var ci = 0; ci < COACH_CATEGORY_KEYS.length; ci++) {
      var cKey = COACH_CATEGORY_KEYS[ci];
      var cOpt = document.createElement('option');
      cOpt.value = cKey;
      cOpt.textContent = COACH_CATEGORY_LABELS[cKey] || cKey;
      catSelect.appendChild(cOpt);
    }
    catSelect.addEventListener('change', applyCoachFilters);
    filterBar.appendChild(catSelect);

    /* Role dropdown — only include roles that actually appear in published posts */
    var roleSet = {};
    for (var ri = 0; ri < posts.length; ri++) {
      if (posts[ri].related_role) roleSet[posts[ri].related_role] = true;
    }
    var roleKeys = Object.keys(roleSet).sort(function(a, b) { return a.localeCompare(b, 'tr'); });

    if (roleKeys.length > 0) {
      var roleSelect = document.createElement('select');
      roleSelect.className = 'ig-coach-filter-select';
      roleSelect.id = 'ig-coach-f-role';
      var roleAll = document.createElement('option');
      roleAll.value = '';
      roleAll.textContent = 'T\u00FCm roller';
      roleSelect.appendChild(roleAll);
      for (var rk = 0; rk < roleKeys.length; rk++) {
        var rOpt = document.createElement('option');
        rOpt.value = roleKeys[rk];
        rOpt.textContent = roleKeys[rk];
        roleSelect.appendChild(rOpt);
      }
      roleSelect.addEventListener('change', applyCoachFilters);
      filterBar.appendChild(roleSelect);
    }

    /* Search input */
    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'ig-coach-filter-search';
    searchInput.id = 'ig-coach-f-search';
    searchInput.placeholder = 'Yaz\u0131larda ara...';
    searchInput.addEventListener('input', applyCoachFilters);
    filterBar.appendChild(searchInput);

    /* Reset button */
    var resetBtn = document.createElement('button');
    resetBtn.className = 'ig-coach-filter-reset';
    resetBtn.id = 'ig-coach-f-reset';
    resetBtn.textContent = 'Temizle';
    resetBtn.addEventListener('click', function() {
      var cs = document.getElementById('ig-coach-f-cat');
      var rs = document.getElementById('ig-coach-f-role');
      var si = document.getElementById('ig-coach-f-search');
      if (cs) cs.value = '';
      if (rs) rs.value = '';
      if (si) si.value = '';
      applyCoachFilters();
    });
    filterBar.appendChild(resetBtn);

    feedEl.appendChild(filterBar);

    /* Grid container */
    var grid = document.createElement('div');
    grid.className = 'ig-coach-feed-grid';
    grid.id = 'ig-coach-grid';
    feedEl.appendChild(grid);

    /* Initial render */
    renderCoachGrid(posts);

    feedEl.style.display = '';

  } catch (e) {
    console.error('Coach feed load error:', e);
  }
}

function applyCoachFilters() {
  var catVal = (document.getElementById('ig-coach-f-cat') || {}).value || '';
  var roleVal = (document.getElementById('ig-coach-f-role') || {}).value || '';
  var searchVal = trLowerCoach((document.getElementById('ig-coach-f-search') || {}).value || '').trim();

  /* Toggle reset button visibility */
  var resetBtn = document.getElementById('ig-coach-f-reset');
  if (resetBtn) {
    resetBtn.className = 'ig-coach-filter-reset' + ((catVal || roleVal || searchVal) ? ' visible' : '');
  }

  var filtered = [];
  for (var i = 0; i < _coachFeedPosts.length; i++) {
    var p = _coachFeedPosts[i];

    /* Category filter */
    if (catVal && p.category !== catVal) continue;

    /* Role filter */
    if (roleVal && p.related_role !== roleVal) continue;

    /* Text search — Turkish-safe lowercase match over title, excerpt, body */
    if (searchVal) {
      var haystack = trLowerCoach((p.title || '') + ' ' + (p.excerpt || '') + ' ' + (p.body || ''));
      if (haystack.indexOf(searchVal) === -1) continue;
    }

    filtered.push(p);
  }

  renderCoachGrid(filtered);
}

function renderCoachGrid(posts) {
  var grid = document.getElementById('ig-coach-grid');
  if (!grid) return;
  while (grid.firstChild) grid.removeChild(grid.firstChild);

  if (posts.length === 0) {
    /* Empty state */
    var emptyEl = document.createElement('div');
    emptyEl.className = 'ig-coach-empty';
    emptyEl.textContent = 'Bu filtrelerle e\u015Fle\u015Fen bir i\u00E7erik bulunamad\u0131.';
    var resetLink = document.createElement('button');
    resetLink.className = 'ig-coach-empty-reset';
    resetLink.textContent = 'Filtreleri temizle';
    resetLink.addEventListener('click', function() {
      var cs = document.getElementById('ig-coach-f-cat');
      var rs = document.getElementById('ig-coach-f-role');
      var si = document.getElementById('ig-coach-f-search');
      if (cs) cs.value = '';
      if (rs) rs.value = '';
      if (si) si.value = '';
      applyCoachFilters();
    });
    emptyEl.appendChild(document.createElement('br'));
    emptyEl.appendChild(resetLink);
    grid.appendChild(emptyEl);
    return;
  }

  for (var i = 0; i < posts.length; i++) {
    grid.appendChild(buildCoachCard(posts[i], !!_coachLikedSet[posts[i].id]));
  }
}

function buildCoachCard(post, isLiked) {
  var card = document.createElement('div');
  card.className = 'ig-coach-card';
  card.setAttribute('data-post-id', post.id);

  /* Compact cover (uses shared builder from profil-genel.js, same page) */
  if (typeof window._htBuildCoachCover === 'function') {
    card.appendChild(window._htBuildCoachCover(post, 'gh-cover-compact'));
  }

  var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
  var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
  var coachLabel = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');

  /* Author line with avatar */
  var coachEl = document.createElement('div');
  coachEl.className = 'ig-coach-card-coach';
  if (typeof window._htBuildCoachAvatar === 'function') {
    coachEl.appendChild(window._htBuildCoachAvatar(post.coach_profiles, 'gh-coach-avatar--sm'));
    coachEl.appendChild(document.createTextNode(' '));
  }
  var coachText = document.createElement('span');
  coachText.textContent = coachLabel;
  coachEl.appendChild(coachText);
  card.appendChild(coachEl);

  var titleEl = document.createElement('div');
  titleEl.className = 'ig-coach-card-title';
  titleEl.textContent = post.title;
  card.appendChild(titleEl);

  var excerptEl = document.createElement('div');
  excerptEl.className = 'ig-coach-card-excerpt';
  excerptEl.textContent = post.excerpt || '';
  card.appendChild(excerptEl);

  var footer = document.createElement('div');
  footer.className = 'ig-coach-card-footer';

  var catPill = document.createElement('span');
  catPill.className = 'ig-coach-card-cat';
  catPill.textContent = COACH_CATEGORY_LABELS[post.category] || post.category;
  footer.appendChild(catPill);

  var likeBtn = document.createElement('button');
  likeBtn.className = 'ig-coach-card-like' + (isLiked ? ' liked' : '');
  likeBtn.setAttribute('data-post-id', post.id);
  /* Safe: SVG is hardcoded constant, not user data */
  likeBtn.innerHTML = (isLiked ? heartFilledSVG : heartOutlineSVG) + '<span>' + (post.like_count || 0) + '</span>';
  likeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleCoachLike(post.id, likeBtn);
  });
  footer.appendChild(likeBtn);

  card.appendChild(footer);

  card.addEventListener('click', function() {
    openCoachDetail(post, isLiked);
  });

  return card;
}

async function toggleCoachLike(postId, btnEl) {
  try {
    var res = await supabase.rpc('toggle_coach_post_like', { p_post_id: postId });
    if (res.error) { console.error('Like toggle error:', res.error); return; }

    var newCount = res.data;
    var wasLiked = btnEl.classList.contains('liked');

    if (wasLiked) {
      btnEl.classList.remove('liked');
      /* Safe: SVG constant + number */
      btnEl.innerHTML = heartOutlineSVG + '<span>' + newCount + '</span>';
    } else {
      btnEl.classList.add('liked');
      btnEl.innerHTML = heartFilledSVG + '<span>' + newCount + '</span>';
    }
  } catch (e) {
    console.error('Like toggle exception:', e);
  }
}

function openCoachDetail(post, isLiked) {
  var existing = document.getElementById('ig-coach-overlay');
  if (existing) existing.parentNode.removeChild(existing);

  var overlay = document.createElement('div');
  overlay.className = 'ig-coach-overlay';
  overlay.id = 'ig-coach-overlay';

  var detail = document.createElement('div');
  detail.className = 'ig-coach-detail';

  /* Close button — safe: closeSVG is hardcoded constant */
  var closeBtn = document.createElement('button');
  closeBtn.className = 'ig-coach-detail-close';
  closeBtn.innerHTML = closeSVG;
  closeBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
  detail.appendChild(closeBtn);

  /* Hero cover (uses shared builder from profil-genel.js, same page) */
  if (typeof window._htBuildCoachCover === 'function') {
    var heroCover = window._htBuildCoachCover(post, 'gh-cover');
    heroCover.style.borderRadius = '0';
    detail.appendChild(heroCover);
  }

  var catEl = document.createElement('div');
  catEl.className = 'ig-coach-detail-cat';
  catEl.textContent = COACH_CATEGORY_LABELS[post.category] || post.category;
  detail.appendChild(catEl);

  var titleEl = document.createElement('div');
  titleEl.className = 'ig-coach-detail-title';
  titleEl.textContent = post.title;
  detail.appendChild(titleEl);

  var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
  var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
  var coachEl = document.createElement('div');
  coachEl.className = 'ig-coach-detail-coach';
  coachEl.textContent = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');
  detail.appendChild(coachEl);

  var bodyEl = document.createElement('div');
  bodyEl.className = 'ig-coach-detail-body';
  bodyEl.textContent = post.body || '';
  detail.appendChild(bodyEl);

  /* ── Yazar Hakkinda block ── */
  var cp = post.coach_profiles;
  if (cp && (cp.bio_short || cp.sector_background || cp.experience_years)) {
    var authorBlock = document.createElement('div');
    authorBlock.className = 'ig-coach-author-block';

    var authorTitle = document.createElement('div');
    authorTitle.className = 'ig-coach-author-title';
    authorTitle.textContent = 'Yazar Hakk\u0131nda';
    authorBlock.appendChild(authorTitle);

    /* Author name with avatar — clickable for coach card */
    var authorNameRow = document.createElement('div');
    authorNameRow.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer';
    if (typeof window._htBuildCoachAvatar === 'function') {
      authorNameRow.appendChild(window._htBuildCoachAvatar(cp, ''));
    }
    var authorName = document.createElement('div');
    authorName.className = 'ig-coach-author-name';
    authorName.textContent = (cp.display_name || '') + (cp.title ? ' \u00B7 ' + cp.title : '');
    authorNameRow.appendChild(authorName);
    authorNameRow.addEventListener('click', (function(cpRef) {
      return function() { if (typeof window._htShowCoachCard === 'function') window._htShowCoachCard(cpRef); };
    })(cp));
    authorBlock.appendChild(authorNameRow);

    var authorMeta = [];
    if (cp.sector_background) authorMeta.push(cp.sector_background);
    if (cp.experience_years) authorMeta.push(cp.experience_years + ' y\u0131l deneyim');
    if (authorMeta.length) {
      var metaEl = document.createElement('div');
      metaEl.className = 'ig-coach-author-meta';
      metaEl.textContent = authorMeta.join(' \u00B7 ');
      authorBlock.appendChild(metaEl);
    }

    if (cp.bio_short) {
      var bioEl2 = document.createElement('div');
      bioEl2.className = 'ig-coach-author-bio';
      bioEl2.textContent = cp.bio_short;
      authorBlock.appendChild(bioEl2);
    }

    /* LinkedIn link in author block */
    if (cp.linkedin_url) {
      var liLink = document.createElement('a');
      liLink.href = cp.linkedin_url;
      liLink.target = '_blank';
      liLink.rel = 'noopener noreferrer';
      liLink.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:11px;font-weight:600;color:#0A66C2;text-decoration:none;';
      liLink.textContent = 'LinkedIn';
      authorBlock.appendChild(liLink);
    }
    detail.appendChild(authorBlock);
  }

  /* FAZ 4C — practice bridge: coach category → competency
   * K030 FAZ B: practice bridge CTAs gated while window._HT_STUDIO_FROZEN === true.
   * Three appendChild sites below (FAZ 4C bridge, related_role bridge, general
   * "Koçluğa Başlayın" bridge) are wrapped in the freeze flag. Like button
   * (line ~2248) stays untouched so users can still react to posts. Flip
   * window._HT_STUDIO_FROZEN = false in shared.js to unfreeze. */
  var coachCompCode = post.category ? COACH_CAT_TO_COMP[post.category] : null;
  if (coachCompCode && !window._HT_STUDIO_FROZEN) {
    var coachBridgeEl = buildPracticeBridgeCTA(coachCompCode, 'Bu konuda pratik yap');
    if (coachBridgeEl) detail.appendChild(coachBridgeEl);
  }

  var actionsEl = document.createElement('div');
  actionsEl.className = 'ig-coach-detail-actions';

  /* Like button — safe: SVG constants */
  var likeBtn = document.createElement('button');
  likeBtn.className = 'ig-coach-detail-like' + (isLiked ? ' liked' : '');
  likeBtn.innerHTML = (isLiked ? heartFilledSVG : heartOutlineSVG) + '<span>' + (post.like_count || 0) + '</span>';
  likeBtn.addEventListener('click', function() {
    toggleCoachLike(post.id, likeBtn);
  });
  actionsEl.appendChild(likeBtn);

  /* Practice bridge CTA — role-based or general fallback
   * K030 FAZ B: both bridge appendChild sites gated by freeze flag. */
  if (!window._HT_STUDIO_FROZEN) {
    var bridge = getBridge();
    if (post.related_role && bridge && bridge.ROLE_COMP_MAP && bridge.ROLE_COMP_MAP[post.related_role]) {
      /* related_role is valid ROLE_COMP_MAP key → direct session start */
      var bridgeBtn = document.createElement('button');
      bridgeBtn.className = 'ig-coach-detail-bridge';
      bridgeBtn.textContent = 'Bu konuyu \u015Fimdi \u00E7al\u0131\u015F';
      var arrowSpan = document.createElement('span');
      arrowSpan.innerHTML = arrowRightSVG;
      bridgeBtn.appendChild(arrowSpan);
      bridgeBtn.addEventListener('click', function() {
        overlay.parentNode.removeChild(overlay);
        startSession(post.related_role);
      });
      actionsEl.appendChild(bridgeBtn);
    } else {
      /* No specific role → general coaching entry */
      var bridgeBtn2 = document.createElement('button');
      bridgeBtn2.className = 'ig-coach-detail-bridge';
      bridgeBtn2.textContent = 'Ko\u00E7lu\u011Fa Ba\u015Flay\u0131n';
      var arrowSpan2 = document.createElement('span');
      arrowSpan2.innerHTML = arrowRightSVG;
      bridgeBtn2.appendChild(arrowSpan2);
      bridgeBtn2.addEventListener('click', function() {
        overlay.parentNode.removeChild(overlay);
        navigate('role_select');
      });
      actionsEl.appendChild(bridgeBtn2);
    }
  }

  detail.appendChild(actionsEl);
  overlay.appendChild(detail);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.parentNode.removeChild(overlay);
  });

  document.body.appendChild(overlay);
}

/* Public surface — legacy Genel Bakış bento card uses this */
window.openCoachDetail = openCoachDetail;
