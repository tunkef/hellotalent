/* global _escHtml, _loadedDBData, currentUser, supabase, switchPanel, calculateCompletion, normalizeForDisplay, canonicalizeRole, formatBrandDisplay */
// ═══════════════════════════════════════════════════
// profil-genel.js — Genel Bakış Editorial Home (K033)
// Renders the candidate dashboard home: hero block (date + ring +
// greeting + edit + bakanlar row), manşet strip (3 cards), gündem
// rail (announcements feed + premium in-flow CTA), signature.
// All styles live in css/panels/genel-bakis.css (.gb-* namespace).
// Coach builder helpers (buildCover, buildCoachAvatar, showCoachCard)
// are kept and exposed on window for profil-studio.js (same page).
// SECURITY: All innerHTML assignments use only hardcoded SVG/HTML
// constants — no user data is rendered via innerHTML. All user data
// uses textContent for XSS safety.
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

  /* ── CSS Injection ──
     K033: all genel-bakış styles live in css/panels/genel-bakis.css.
     Stub kept so render() can call it harmlessly. */
  function injectCSS() { /* no-op — see css/panels/genel-bakis.css */ }

  /* ── SVG constants (hardcoded, safe for innerHTML) ── */
  var arrowSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  var crownSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1H5v1z" opacity=".5"/></svg>';
  var pinSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

  /* ── Fallback editorial cover: category color map (kept for studio bridge) ── */
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

  /* Build a fallback editorial cover element. (Used by profil-studio.js
     via window._htBuildFallbackCover — kept intact.) */
  function buildFallbackCover(post, sizeClass) {
    var colors = COVER_COLORS[post.category] || COVER_DEFAULT;
    var wrapper = el('div', 'gh-fallback-cover ' + sizeClass);
    wrapper.style.background = colors.bg;
    wrapper.style.setProperty('--fb-circle', colors.circle);
    wrapper.setAttribute('data-cat', post.category || '');

    var catLabel = COACH_CAT_LABELS[post.category] || post.category || '';
    if (catLabel) {
      var catEl = txt('span', 'gh-fallback-cat', catLabel);
      catEl.style.background = 'rgba(255,255,255,.7)';
      catEl.style.color = colors.accent;
      wrapper.appendChild(catEl);
    }
    wrapper.appendChild(txt('div', 'gh-fallback-title', post.title || ''));
    return wrapper;
  }

  /* Build a cover element: uploaded image or fallback. (Studio bridge.) */
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

  /* Build a coach avatar element (uploaded or initials fallback). */
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

  /* ── Mini coach identity card (popover) — kept for studio bridge ── */
  /* Safe: linkedinSVG is a hardcoded constant, no user input */
  var linkedinSVG = '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';

  function showCoachCard(cp) {
    var existing = document.getElementById('gh-coach-card-overlay');
    if (existing) existing.remove();
    var existingCard = document.getElementById('gh-coach-card');
    if (existingCard) existingCard.remove();
    if (!cp) return;

    var overlay = document.createElement('div');
    overlay.className = 'gh-coach-card-overlay';
    overlay.id = 'gh-coach-card-overlay';
    overlay.addEventListener('click', closeCoachCard);

    var card = document.createElement('div');
    card.className = 'gh-coach-card';
    card.id = 'gh-coach-card';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'gh-coach-card-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', closeCoachCard);
    card.appendChild(closeBtn);

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

    var metaDiv = el('div', 'gh-coach-card-meta');
    if (cp.sector_background) metaDiv.appendChild(txt('span', 'gh-coach-card-pill', cp.sector_background));
    if (cp.experience_years) metaDiv.appendChild(txt('span', 'gh-coach-card-pill', cp.experience_years + ' y\u0131l deneyim'));
    if (metaDiv.childNodes.length > 0) card.appendChild(metaDiv);

    if (cp.linkedin_url) {
      var liLink = document.createElement('a');
      liLink.className = 'gh-coach-card-linkedin';
      liLink.href = cp.linkedin_url;
      liLink.target = '_blank';
      liLink.rel = 'noopener noreferrer';
      var liIcon = document.createElement('span');
      liIcon.innerHTML = linkedinSVG; /* safe: hardcoded SVG constant */
      liLink.appendChild(liIcon);
      liLink.appendChild(document.createTextNode(' LinkedIn'));
      card.appendChild(liLink);
    }

    document.body.appendChild(overlay);
    document.body.appendChild(card);

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

  /* ═══════════════════════════════════════════════════
     K033 EDITORIAL HOME — helpers
     ═══════════════════════════════════════════════════ */

  var TR_MONTHS = ['Ocak', '\u015Eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran',
                   'Temmuz', 'A\u011Fustos', 'Eyl\u00FCl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];
  var TR_DAYS = ['Pazar', 'Pazartesi', 'Sal\u0131', '\u00C7ar\u015Famba', 'Per\u015Fembe', 'Cuma', 'Cumartesi'];

  function formatTodayCaption() {
    var d = new Date();
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + TR_DAYS[d.getDay()];
  }

  function formatItemDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()];
  }

  function readMinutes(text) {
    if (!text) return 1;
    var words = String(text).trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }

  function firstName(full) {
    if (!full) return '';
    return String(full).trim().split(/\s+/)[0];
  }

  function buildSubline(profile, experiences) {
    var parts = [];
    if (experiences && experiences.length > 0) {
      var latest = experiences[0];
      var rawRole = latest.pozisyon || '';
      var roleMatch = typeof canonicalizeRole === 'function' ? canonicalizeRole(rawRole) : null;
      var roleText = roleMatch ? roleMatch.display : (typeof normalizeForDisplay === 'function' ? normalizeForDisplay(rawRole) : rawRole);
      if (roleText) parts.push(roleText);

      var brandName = latest.marka || '';
      var companyName = latest.sirket_adi || latest.sirket || '';
      var compDisplay = '';
      if (typeof formatBrandDisplay === 'function') {
        compDisplay = formatBrandDisplay(brandName, companyName) || (typeof normalizeForDisplay === 'function' ? normalizeForDisplay(companyName) : companyName);
      } else {
        compDisplay = brandName || companyName;
      }
      if (compDisplay) parts.push(compDisplay);
    }
    if (profile && profile.adres_il) parts.push(profile.adres_il);
    return parts.join(' \u00B7 ');
  }

  /* ═══════════════════════════════════════════════════
     HERO
     ═══════════════════════════════════════════════════ */

  function buildHero(profile, experiences) {
    var hero = el('section', 'gb-hero');

    /* Top row: date + ring */
    var top = el('div', 'gb-hero-top');
    top.appendChild(txt('div', 'gb-mono gb-mono--muted', formatTodayCaption()));

    var pct = typeof calculateCompletion === 'function' ? calculateCompletion() : 0;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    var ringWrap = el('div', 'gb-ring-wrap');
    ringWrap.setAttribute('aria-label', 'Profil tamamlanma y\u00FCzde ' + pct);
    /* Safe: hardcoded SVG with numeric pct interpolation only */
    var circumference = 201.06;
    var targetOffset = (circumference - (circumference * pct / 100)).toFixed(2);
    ringWrap.style.setProperty('--gb-ring-target', targetOffset);
    var ringSVG = '<svg width="72" height="72" viewBox="0 0 72 72">' +
      '<circle class="gb-ring-track" cx="36" cy="36" r="32" fill="none" stroke-width="3"/>' +
      '<circle class="gb-ring-progress" cx="36" cy="36" r="32" fill="none" stroke-width="3" stroke-linecap="round"/>' +
      '</svg>';
    ringWrap.innerHTML = ringSVG; /* safe: hardcoded SVG, no user data */
    var ringLabel = txt('div', 'gb-ring-label', '%' + pct);
    ringWrap.appendChild(ringLabel);
    /* Arm the ring sweep on next frame so the transition fires. */
    requestAnimationFrame(function() { ringWrap.classList.add('is-armed'); });
    top.appendChild(ringWrap);
    hero.appendChild(top);

    /* Headline: greeting + first name */
    var name = firstName(profile && profile.full_name);
    var greetingText = name ? ('G\u00FCnayd\u0131n, ' + name) : 'Ho\u015F geldin';
    hero.appendChild(txt('h1', 'gb-hero-headline', greetingText));

    /* Row: subline + ghost edit button */
    var row = el('div', 'gb-hero-row');
    row.appendChild(txt('div', 'gb-hero-subline', buildSubline(profile, experiences)));
    var editBtn = txt('button', 'gb-ghost-btn', 'Profili D\u00FCzenle');
    editBtn.type = 'button';
    editBtn.addEventListener('click', function() { switchPanel('merkez'); });
    row.appendChild(editBtn);
    hero.appendChild(row);

    /* Bakanlar bottom row */
    var bakanlar = el('div', 'gb-hero-bakanlar');
    var bakanlarBtn = document.createElement('button');
    bakanlarBtn.type = 'button';
    var countSpan = txt('span', 'gb-bakanlar-count', '0 K\u0130\u015E\u0130');
    bakanlarBtn.appendChild(countSpan);
    bakanlarBtn.appendChild(document.createTextNode(' '));
    bakanlarBtn.appendChild(txt('span', '', 'profilini izledi \u2192'));
    bakanlarBtn.addEventListener('click', function() { switchPanel('kimbakti'); });
    bakanlar.appendChild(bakanlarBtn);
    hero.appendChild(bakanlar);

    /* Async hydrate viewer count */
    hydrateBakanlarCount(bakanlar, countSpan);

    return hero;
  }

  async function hydrateBakanlarCount(bakanlarEl, countSpan) {
    try {
      var candidateId = _loadedDBData && _loadedDBData.profile ? _loadedDBData.profile.id : null;
      if (!candidateId && currentUser) {
        var cr = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).maybeSingle();
        if (cr.data) candidateId = cr.data.id;
      }
      if (!candidateId) return;

      var res = await supabase.from('candidate_view_stats')
        .select('total_views')
        .eq('candidate_id', candidateId)
        .maybeSingle();

      var n = res && res.data && res.data.total_views ? res.data.total_views : 0;
      var label = n === 1 ? '1 K\u0130\u015E\u0130' : (n + ' K\u0130\u015E\u0130');
      countSpan.textContent = label;
      if (n > 0) bakanlarEl.classList.add('has-views');
    } catch (e) {
      console.warn('[HT] gb bakanlar count:', e && e.message);
    }
  }

  /* ═══════════════════════════════════════════════════
     MANŞET STRIP (Fırsatlar / Markalar / Stüdyo)
     ═══════════════════════════════════════════════════ */

  function buildStrip() {
    var strip = el('section', 'gb-strip');

    /* Fırsatlar — brand campaigns (NOT teklifler/messages).
       TODO(K034+): wire to candidate-facing campaigns RPC once panel ships.
       For now: static 0, click logs a warning and stays put. */
    strip.appendChild(buildStripCell({
      label: 'F\u0131rsatlar',
      value: '0 yeni',
      link: 'Kampanyalar\u0131 g\u00F6r \u2192',
      onClick: function() {
        console.warn('[gb] F\u0131rsatlar campaigns panel not yet wired (K034 backlog).');
      },
      cellClass: 'gb-strip-cell--firsatlar'
    }));

    /* Markalar — wires to sirketler panel */
    var markaCell = buildStripCell({
      label: 'Markalar',
      value: '0 takip',
      link: 'Ke\u015Ffet \u2192',
      onClick: function() { switchPanel('sirketler'); },
      cellClass: 'gb-strip-cell--markalar'
    });
    strip.appendChild(markaCell);

    /* Stüdyo — frozen, click navigates to mulakat panel where panel-soon
       renders the "Yakında" surface (K030 contract). */
    strip.appendChild(buildStripCell({
      label: 'St\u00FCdyo',
      value: 'Yak\u0131nda',
      link: 'Haberdar ol \u2192',
      onClick: function() { switchPanel('mulakat'); },
      cellClass: 'gb-strip-cell--studio'
    }));

    /* Async hydrate marka follow count */
    hydrateMarkaCount(markaCell);

    return strip;
  }

  function buildStripCell(opts) {
    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'gb-strip-cell ' + (opts.cellClass || '');
    cell.appendChild(txt('div', 'gb-mono gb-strip-label', opts.label));
    cell.appendChild(txt('div', 'gb-strip-value', opts.value));
    cell.appendChild(txt('div', 'gb-strip-link', opts.link));
    if (opts.onClick) cell.addEventListener('click', opts.onClick);
    return cell;
  }

  async function hydrateMarkaCount(cell) {
    if (typeof window._htGetGenelBrandTeaser !== 'function') return;
    try {
      var payload = await window._htGetGenelBrandTeaser();
      var n = 0;
      if (payload && payload.followedIds) n = Object.keys(payload.followedIds).length;
      var valueEl = cell.querySelector('.gb-strip-value');
      if (valueEl) valueEl.textContent = n + ' takip';
    } catch (e) {
      console.warn('[HT] gb marka count:', e && e.message);
    }
  }

  /* ═══════════════════════════════════════════════════
     GÜNDEM (announcements rail + premium CTA)
     ═══════════════════════════════════════════════════ */

  function buildGundem() {
    var section = el('section', 'gb-gundem');

    var header = el('div', 'gb-gundem-header');
    header.appendChild(txt('span', 'gb-mono', 'G\u00FCndem'));
    section.appendChild(header);

    var spine = el('div', 'gb-spine');
    spine.id = 'gb-gundem-spine';
    spine.appendChild(txt('div', 'gb-state', 'Y\u00FCkleniyor\u2026'));
    section.appendChild(spine);

    return section;
  }

  function buildPremiumCTA() {
    var cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'gb-premium-cta';
    cta.appendChild(txt('span', 'gb-premium-label', '\u2014 Premium \u2014'));

    var body = el('span', 'gb-premium-body');
    body.appendChild(document.createTextNode('Beni \u00D6ner aktif \u00B7 g\u00F6r\u00FCn\u00FCrl\u00FC\u011F\u00FCn\u00FC art\u0131r '));
    body.appendChild(txt('span', 'gb-premium-arrow', '\u2192'));
    cta.appendChild(body);

    cta.addEventListener('click', function() { switchPanel('premium'); });
    return cta;
  }

  function buildSpineItem(post, animClass) {
    var article = el('article', 'gb-spine-item ' + (animClass || ''));

    var sourceLabel = COACH_CAT_LABELS[post.category] || (post.category ? String(post.category) : 'HelloTalent');
    var dateLabel = formatItemDate(post.published_at);
    var minutes = readMinutes(post.body_md || post.title || '');
    var metaParts = [sourceLabel];
    if (dateLabel) metaParts.push(dateLabel);
    metaParts.push(minutes + ' dk okuma');
    article.appendChild(txt('div', 'gb-mono gb-item-meta', metaParts.join(' \u00B7 ')));

    article.appendChild(txt('h3', 'gb-item-headline', post.title || ''));

    var excerpt = '';
    if (post.body_md) {
      excerpt = String(post.body_md).replace(/[#*_>`\-]+/g, '').replace(/\s+/g, ' ').trim();
      if (excerpt.length > 220) excerpt = excerpt.substring(0, 218) + '\u2026';
    }
    if (excerpt) article.appendChild(txt('p', 'gb-item-excerpt', excerpt));

    var link = document.createElement('button');
    link.type = 'button';
    link.className = 'gb-item-link';
    link.textContent = 'Devam\u0131n\u0131 oku \u2192';
    link.addEventListener('click', function() {
      /* Open the duyurular surface so the user can read the full post.
         The duyurular tab lives inside the inbox panel hub. */
      switchPanel('bildirimler');
    });
    article.appendChild(link);

    return article;
  }

  async function hydrateGundem() {
    var spine = document.getElementById('gb-gundem-spine');
    if (!spine) return;
    var supa = (typeof supabase !== 'undefined') ? supabase : (window.HT && window.HT.getSupa && window.HT.getSupa());
    if (!supa) {
      while (spine.firstChild) spine.removeChild(spine.firstChild);
      spine.appendChild(txt('div', 'gb-state', 'Duyurular y\u00FCklenemedi.'));
      spine.appendChild(buildPremiumCTA());
      return;
    }

    try {
      var res = await supa.rpc('get_announcements_feed', { p_limit: 5, p_offset: 0 });
      while (spine.firstChild) spine.removeChild(spine.firstChild);

      if (res.error) {
        console.warn('[gb] gündem RPC error:', res.error.message);
        spine.appendChild(txt('div', 'gb-state', 'Duyurular \u015Fu an y\u00FCklenemedi.'));
        spine.appendChild(buildPremiumCTA());
        return;
      }

      var posts = (res.data && res.data.length) ? res.data : [];
      if (posts.length === 0) {
        spine.appendChild(txt('div', 'gb-state', 'Hen\u00FCz duyuru yok. Yeni \u015Feyler geldi\u011Finde burada g\u00F6r\u00FCrs\u00FCn.'));
        spine.appendChild(buildPremiumCTA());
        return;
      }

      var animClasses = ['gb-anim-1', 'gb-anim-2', 'gb-anim-3'];
      for (var i = 0; i < posts.length && i < 5; i++) {
        var animCls = i < 3 ? animClasses[i] : '';
        spine.appendChild(buildSpineItem(posts[i], animCls));
        /* Insert premium CTA between item 2 and item 3 (after index 1) */
        if (i === 1) spine.appendChild(buildPremiumCTA());
      }

      /* If we never reached index 1 (only 1 post), still surface premium CTA */
      if (posts.length < 2) spine.appendChild(buildPremiumCTA());
    } catch (e) {
      console.warn('[gb] gündem load failed:', e && e.message);
      while (spine.firstChild) spine.removeChild(spine.firstChild);
      spine.appendChild(txt('div', 'gb-state', 'Duyurular y\u00FCklenemedi.'));
      spine.appendChild(buildPremiumCTA());
    }
  }

  /* ═══════════════════════════════════════════════════
     SIGNATURE
     ═══════════════════════════════════════════════════ */

  function buildSignature() {
    var sig = el('footer', 'gb-signature');
    sig.appendChild(el('div', 'gb-sig-line'));
    var mark = txt('div', 'gb-sig-mark', '');
    var em = document.createElement('em');
    em.textContent = '\u2014 hellotalent \u2014';
    mark.appendChild(em);
    sig.appendChild(mark);
    sig.appendChild(el('div', 'gb-sig-line'));
    return sig;
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

    var root = el('div', 'gb-root');
    root.appendChild(buildHero(profile || {}, experiences));
    root.appendChild(buildStrip());
    root.appendChild(buildGundem());
    root.appendChild(buildSignature());
    shell.appendChild(root);

    hydrateGundem();
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
