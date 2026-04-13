/* global supabase */
/* K030 FAZ C — profil-duyurular.js
 * HT Duyurular feed client. Consumed by profil-genel.js (mount) + profil-inbox.js (full view).
 * Depends on: supabase (global client, profil-core.js), window.HT.signStorageUrls (shared.js),
 *             marked (CDN), DOMPurify (CDN).
 *
 * Exposes:
 *   window._htLoadDuyuruFeed(containerEl, opts)
 *   window._htRenderDuyuruPreviewCard(fakePost, objectUrlMap, container)
 *
 * Rules:
 * - vanilla JS only, IIFE, var-only, Safari-safe
 * - no innerHTML for user content — markdown goes through marked + DOMPurify
 * - Turkish UI, no emoji
 * - .maybeSingle() (no .single()) — N/A here, RPC + select
 * - semantic tokens via css/duyurular.css
 * - no console.log in production — console.error / console.warn only
 */

(function () {
  'use strict';

  var CATEGORY_LABELS = {
    genel: 'Genel',
    feature: 'Yeni \u00D6zellik',
    sirket: '\u015Eirket',
    ipucu: '\u0130pucu'
  };

  var LIKE_DEBOUNCE_MS = 300;
  var likeTimers = {};

  /* ── Turkish relative date ───────────────────────────────────── */
  function trRelativeDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var diffMs = Date.now() - d.getTime();
    var diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'az \u00F6nce';
    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + ' dakika \u00F6nce';
    var diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return diffH + ' saat \u00F6nce';
    var diffD = Math.floor(diffH / 24);
    if (diffD === 1) return 'd\u00FCn';
    if (diffD < 7) return diffD + ' g\u00FCn \u00F6nce';
    try { return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }

  /* ── DOM helpers ─────────────────────────────────────────────── */
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function txt(tag, cls, text) {
    var node = el(tag, cls);
    if (text != null) node.textContent = String(text);
    return node;
  }

  /* ── Markdown sanitize ───────────────────────────────────────── */
  function renderMarkdown(bodyMd) {
    if (!bodyMd) return '';
    if (typeof window.marked === 'undefined' || typeof window.DOMPurify === 'undefined') {
      console.warn('[duyuru] marked or DOMPurify missing; body rendered as plain text');
      return null;
    }
    try {
      var html = window.marked.parse(String(bodyMd), { breaks: true, gfm: true });
      var clean = window.DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p','br','strong','em','u','a','ul','ol','li','blockquote','code','pre','h2','h3','h4','hr'],
        ALLOWED_ATTR: ['href','target','rel']
      });
      return clean;
    } catch (e) {
      console.error('[duyuru] markdown render failed:', e.message);
      return null;
    }
  }

  function fillBodyHtml(containerEl, sanitized, rawBody) {
    if (sanitized === null || sanitized === '') {
      // Fallback — plain text
      containerEl.textContent = rawBody || '';
      return;
    }
    /* DOMPurify output is trusted markup; we still harden links afterwards. */
    containerEl.innerHTML = sanitized;
    var links = containerEl.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute('target', '_blank');
      links[i].setAttribute('rel', 'noopener noreferrer');
    }
  }

  /* ── Carousel builder ────────────────────────────────────────── */
  function buildCarousel(mediaItems, signedMap) {
    if (!mediaItems || mediaItems.length === 0) return null;
    var wrap = el('div', 'ht-duyuru__carousel');
    var track = el('div', 'ht-duyuru__carousel-track');
    var slides = [];

    for (var i = 0; i < mediaItems.length; i++) {
      var m = mediaItems[i];
      var slide = el('div', 'ht-duyuru__carousel-slide');
      var signed = m && m.storage_path ? (signedMap[m.storage_path] || '') : '';
      if (m && m.media_type === 'video') {
        var v = document.createElement('video');
        v.src = signed;
        v.controls = true;
        v.preload = 'metadata';
        slide.appendChild(v);
      } else {
        var img = document.createElement('img');
        img.src = signed;
        img.alt = (m && m.alt_text) || '';
        img.loading = 'lazy';
        slide.appendChild(img);
      }
      track.appendChild(slide);
      slides.push(slide);
    }

    wrap.appendChild(track);

    var index = 0;
    function goTo(n) {
      if (n < 0) n = slides.length - 1;
      if (n >= slides.length) n = 0;
      index = n;
      track.style.transform = 'translateX(' + (-100 * index) + '%)';
      var dotNodes = wrap.querySelectorAll('.ht-duyuru__carousel-dot');
      for (var d = 0; d < dotNodes.length; d++) {
        dotNodes[d].classList.toggle('is-active', d === index);
      }
    }

    if (slides.length > 1) {
      var prev = txt('button', 'ht-duyuru__carousel-prev', '\u2039');
      prev.type = 'button';
      prev.setAttribute('aria-label', '\u00D6nceki g\u00F6rsel');
      prev.addEventListener('click', function (e) { e.stopPropagation(); goTo(index - 1); });
      wrap.appendChild(prev);

      var next = txt('button', 'ht-duyuru__carousel-next', '\u203A');
      next.type = 'button';
      next.setAttribute('aria-label', 'Sonraki g\u00F6rsel');
      next.addEventListener('click', function (e) { e.stopPropagation(); goTo(index + 1); });
      wrap.appendChild(next);

      var dots = el('div', 'ht-duyuru__carousel-dots');
      for (var k = 0; k < slides.length; k++) {
        var dot = el('button', 'ht-duyuru__carousel-dot' + (k === 0 ? ' is-active' : ''));
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Slayt ' + (k + 1));
        (function (idx) {
          dot.addEventListener('click', function (e) { e.stopPropagation(); goTo(idx); });
        })(k);
        dots.appendChild(dot);
      }
      wrap.appendChild(dots);

      wrap.setAttribute('tabindex', '0');
      wrap.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); goTo(index - 1); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); goTo(index + 1); }
      });
    }

    return wrap;
  }

  /* ── Like button ─────────────────────────────────────────────── */
  var HEART_SVG = '<svg class="ht-duyuru__like-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

  function buildLikeBtn(post) {
    var btn = el('button', 'ht-duyuru__like-btn' + (post.liked_by_me ? ' is-liked' : ''));
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Be\u011Fen');
    btn.innerHTML = HEART_SVG;
    var count = txt('span', '', String(post.like_count || 0));
    btn.appendChild(count);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasLiked = btn.classList.contains('is-liked');
      var prevCount = parseInt(count.textContent, 10) || 0;
      // Optimistic toggle
      btn.classList.toggle('is-liked');
      count.textContent = String(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

      if (likeTimers[post.id]) clearTimeout(likeTimers[post.id]);
      likeTimers[post.id] = setTimeout(function () {
        var supa = (typeof supabase !== 'undefined') ? supabase : (window.HT && window.HT.getSupa && window.HT.getSupa());
        if (!supa) return;
        supa.rpc('toggle_announcement_like', { p_announcement_id: post.id })
          .then(function (res) {
            if (res.error) {
              // rollback
              btn.classList.toggle('is-liked');
              count.textContent = String(prevCount);
              console.warn('[duyuru] like toggle failed:', res.error.message);
            }
          })
          .catch(function (err) {
            btn.classList.toggle('is-liked');
            count.textContent = String(prevCount);
            console.warn('[duyuru] like toggle error:', err && err.message);
          });
      }, LIKE_DEBOUNCE_MS);
    });

    return btn;
  }

  /* ── Card renderer ───────────────────────────────────────────── */
  function buildCard(post, signedMap) {
    /* K030 FAZ C schema: pinned_until timestamptz (NOT is_pinned bool). */
    var isPinned = post.pinned_until && new Date(post.pinned_until) > new Date();
    var card = el('article', 'ht-duyuru__card' + (isPinned ? ' ht-duyuru__card--pinned' : ''));
    card.setAttribute('data-announcement-id', post.id || '');

    /* Head — chip + pin + date */
    var head = el('div', 'ht-duyuru__card-head');
    var chipCls = 'ht-duyuru__chip ht-duyuru__chip--' + (post.category || 'genel');
    head.appendChild(txt('span', chipCls, CATEGORY_LABELS[post.category] || 'Genel'));
    if (isPinned) head.appendChild(txt('span', 'ht-duyuru__pin', 'Sabitlendi'));
    head.appendChild(txt('span', 'ht-duyuru__date', trRelativeDate(post.published_at || post.created_at)));
    card.appendChild(head);

    /* Title */
    if (post.title) card.appendChild(txt('h2', 'ht-duyuru__title', post.title));

    /* Body — markdown safe */
    if (post.body_md) {
      var body = el('div', 'ht-duyuru__body');
      var sanitized = renderMarkdown(post.body_md);
      fillBodyHtml(body, sanitized, post.body_md);
      card.appendChild(body);
    }

    /* K030 FAZ C schema: filter media into visual (image/video) for carousel,
     * links for link preview cards (media_type='link' with external_url). */
    var allMedia = post.media || [];
    var visualMedia = [];
    var linkMedia = [];
    for (var mi = 0; mi < allMedia.length; mi++) {
      var mm = allMedia[mi];
      if (mm && mm.media_type === 'link') linkMedia.push(mm);
      else if (mm) visualMedia.push(mm);
    }

    /* Carousel — images + videos only */
    var carousel = buildCarousel(visualMedia, signedMap || {});
    if (carousel) card.appendChild(carousel);

    /* Link preview cards — one per link media row */
    for (var li = 0; li < linkMedia.length; li++) {
      var lm = linkMedia[li];
      var url = lm.external_url;
      if (!url) continue;
      var linkCard = document.createElement('a');
      linkCard.className = 'ht-duyuru__link-preview';
      linkCard.href = url;
      linkCard.target = '_blank';
      linkCard.rel = 'noopener noreferrer';
      var linkBody = el('div', '');
      linkBody.appendChild(txt('div', 'ht-duyuru__link-preview-title', lm.alt_text || url));
      linkBody.appendChild(txt('div', 'ht-duyuru__link-preview-url', url));
      linkCard.appendChild(linkBody);
      card.appendChild(linkCard);
    }

    /* Footer — like + cta */
    var footer = el('div', 'ht-duyuru__footer');
    footer.appendChild(buildLikeBtn(post));

    if (post.cta_url && post.cta_label) {
      var cta = document.createElement('a');
      cta.className = 'ht-duyuru__cta';
      cta.href = post.cta_url;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
      cta.textContent = post.cta_label;
      footer.appendChild(cta);
    }
    card.appendChild(footer);

    return card;
  }

  /* ── Signed URL batch helper ─────────────────────────────────── */
  async function collectSignedMap(posts) {
    var paths = [];
    for (var i = 0; i < posts.length; i++) {
      var media = posts[i].media || [];
      for (var j = 0; j < media.length; j++) {
        if (media[j] && media[j].storage_path) paths.push(media[j].storage_path);
      }
    }
    if (paths.length === 0) return {};
    if (!(window.HT && typeof window.HT.signStorageUrls === 'function')) {
      console.warn('[duyuru] HT.signStorageUrls missing');
      return {};
    }
    try {
      return await window.HT.signStorageUrls(paths, 3600);
    } catch (e) {
      console.error('[duyuru] signStorageUrls failed:', e.message);
      return {};
    }
  }

  /* ── Loader ──────────────────────────────────────────────────── */
  async function loadDuyuruFeed(containerEl, opts) {
    if (!containerEl) return;
    opts = opts || {};
    var limit = opts.limit || 10;
    var offset = opts.offset || 0;

    // Clear + loading state
    while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);
    containerEl.appendChild(txt('div', 'ht-duyuru__loading', 'Duyurular y\u00FCkleniyor...'));

    var supa = (typeof supabase !== 'undefined') ? supabase : (window.HT && window.HT.getSupa && window.HT.getSupa());
    if (!supa) {
      containerEl.removeChild(containerEl.firstChild);
      containerEl.appendChild(txt('div', 'ht-duyuru__error', 'Supabase istemcisi y\u00FCklenemedi.'));
      return;
    }

    try {
      var res = await supa.rpc('get_announcements_feed', { p_limit: limit, p_offset: offset });
      if (res.error) {
        renderError(containerEl, opts);
        console.error('[duyuru] feed RPC error:', res.error.message);
        return;
      }

      var posts = (res.data && res.data.length) ? res.data : [];

      // Clear loading
      while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);

      if (posts.length === 0) {
        containerEl.appendChild(txt('div', 'ht-duyuru__empty', 'Hen\u00FCz duyuru yok. Yeni \u015Feyler geldi\u011Finde burada g\u00F6r\u00FCrs\u00FCn.'));
      } else {
        var feed = el('div', 'ht-duyuru__feed');
        var signedMap = await collectSignedMap(posts);
        for (var i = 0; i < posts.length; i++) {
          feed.appendChild(buildCard(posts[i], signedMap));
        }
        containerEl.appendChild(feed);
      }

      // Mark as seen
      try { localStorage.setItem('ht_last_duyuru_seen', new Date().toISOString()); } catch (e) { /* ignore */ }

    } catch (e) {
      console.error('[duyuru] feed load failed:', e && e.message);
      renderError(containerEl, opts);
    }
  }

  function renderError(containerEl, opts) {
    while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);
    var box = el('div', 'ht-duyuru__error');
    box.appendChild(document.createTextNode('Duyurular \u015Fu an y\u00FCklenemedi. '));
    var retry = txt('button', '', 'Tekrar dene');
    retry.type = 'button';
    retry.addEventListener('click', function () { loadDuyuruFeed(containerEl, opts); });
    box.appendChild(retry);
    containerEl.appendChild(box);
  }

  /* ── Preview renderer for admin composer ─────────────────────── */
  function renderPreview(fakePost, objectUrlMap, container) {
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    var card = buildCard(fakePost || {}, objectUrlMap || {});
    container.appendChild(card);
  }

  /* ── Exports ─────────────────────────────────────────────────── */
  window._htLoadDuyuruFeed = loadDuyuruFeed;
  window._htRenderDuyuruPreviewCard = renderPreview;

})();
