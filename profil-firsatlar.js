/* global supabase, switchPanel, ht_track */
/* Firsatlar paneli editorial rewrite (formerly Teklifler). FAZ B + C.
 *
 * Scope:
 *   - Freemium-only (premium gate removed — K034 decision).
 *   - 4 campaign types rendered: offer, employer_branding, store_opening,
 *     brand_story. 'hiring_boost' filtered out (iş ilanı değil — Tuna
 *     karari). See migration 20260416120000_firsatlar_campaign_types.sql.
 *   - Dual data source (FAZ D): campaigns table (employer-authored,
 *     status=active, approval-gated) + ht_announcements with
 *     campaign_type not null (admin-authored, via duyuru composer).
 *     Migration 20260417100000 adds campaign_type column + RPC.
 *   - No demo/fake content. Empty DB or fetch error → empty state
 *     (Tuna karari 2026-04-17 UAT).
 *   - Editorial vocabulary: .frs-* (see css/panels/firsatlar.css).
 *   - Vanilla, IIFE + var, Safari-safe.
 *   - User data rendered via textContent only — no innerHTML with
 *     campaign title/desc/company strings (K029 XSS guard).
 */
(function () {
  'use strict';

  /* ── State ─────────────────────────────────────── */
  var _loaded = false;
  var _root = null;
  var _allCampaigns = [];

  /* FAZ C — extended types.
   * 'hiring_boost' still excluded (iş ilanı yasak — Tuna karari).
   * New types 'store_opening' + 'brand_story' added via migration
   * 20260416120000_firsatlar_campaign_types.sql.
   *
   * NOT: Filter client-side yapilir (.in() degil). Sebep: migration
   * kademeli deploy oluyor; DB'de henuz olmayan enum value icin .in()
   * PostgreSQL'de "invalid input value for enum" hatasi atar. Client-side
   * filter her iki durumda da guvenli. */
  var ALLOWED_TYPES = ['offer', 'employer_branding', 'store_opening', 'brand_story'];

  /* Type metadata — label + accent modifier. */
  var TYPE_META = {
    offer:              { label: '\u0130ND\u0130R\u0130M',           mod: 'frs-card--offer' },
    employer_branding:  { label: 'MARKA H\u0130K\u00C2YES\u0130', mod: 'frs-card--branding' },
    store_opening:      { label: 'YEN\u0130 MA\u011EAZA',          mod: 'frs-card--opening' },
    brand_story:        { label: 'MARKA HABER\u0130',              mod: 'frs-card--story' }
  };

  /* ── DOM helpers ───────────────────────────────── */
  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function txt(tag, cls, text) {
    var n = el(tag, cls);
    if (text != null) n.textContent = String(text);
    return n;
  }

  /* ── Render: shell ─────────────────────────────── */
  function clearRoot() {
    if (!_root) return;
    while (_root.firstChild) _root.removeChild(_root.firstChild);
  }

  function buildHero() {
    var hero = el('header', 'frs-hero');
    hero.appendChild(txt('p', 'frs-kicker', 'F\u0131rsatlar'));
    hero.appendChild(txt('h1', 'frs-headline', 'Markalardan sana \u00F6zel'));
    hero.appendChild(txt('p', 'frs-subline', 'Perakende d\u00FCnyas\u0131ndan indirimler, marka hikayeleri ve duyurular. Yeni f\u0131rsatlar burada yay\u0131nlan\u0131r.'));
    return hero;
  }

  function buildMeta(campaigns) {
    var meta = el('div', 'frs-meta');
    var item1 = el('div', 'frs-meta__item');
    var strong1 = el('strong');
    strong1.textContent = String(campaigns.length);
    item1.appendChild(strong1);
    item1.appendChild(document.createTextNode(' aktif f\u0131rsat'));
    meta.appendChild(item1);
    return meta;
  }

  function buildSkeleton() {
    var wrap = el('div', 'frs-skeleton');
    for (var i = 0; i < 4; i++) {
      wrap.appendChild(el('div', 'frs-skeleton__card'));
    }
    return wrap;
  }

  /* Fetch errors fall back to the same empty state as "no campaigns" —
   * Tuna karari: fake demo yok, error UI de yok; tek kullanici-facing
   * durum empty state. Log console'a dusulur debug icin. */
  function buildEmpty() {
    var wrap = el('div', 'frs-empty');
    wrap.appendChild(txt('h3', 'frs-empty__title', 'Hen\u00FCz f\u0131rsat yok'));
    wrap.appendChild(txt('p', 'frs-empty__desc', 'Takip etti\u011Fin markalar yeni f\u0131rsat yay\u0131nlad\u0131\u011F\u0131nda burada g\u00F6receksin.'));
    var cta = txt('button', 'frs-empty__cta', 'Markalar\u0131 Ke\u015Ffet');
    cta.type = 'button';
    cta.addEventListener('click', function () {
      if (typeof switchPanel === 'function') switchPanel('sirketler');
    });
    wrap.appendChild(cta);
    return wrap;
  }

  /* ── Render: card ──────────────────────────────── */
  function buildCard(c) {
    var type = TYPE_META[c.campaign_type] || TYPE_META.offer;
    var card = el('article', 'frs-card ' + type.mod);
    card.setAttribute('data-campaign-id', String(c.id));

    /* Cover */
    var cover = el('div', 'frs-card__cover');
    var compName = c.company_name || (c.companies && c.companies.company_name) || '';
    if (c.cover_image_url) {
      var img = document.createElement('img');
      img.src = c.cover_image_url;
      img.alt = '';
      img.loading = 'lazy';
      cover.appendChild(img);
    } else {
      var initial = el('div', 'frs-card__cover-initial');
      initial.textContent = (compName[0] || '?').toUpperCase();
      cover.appendChild(initial);
    }
    var typeBadge = txt('span', 'frs-card__type-badge', type.label);
    cover.appendChild(typeBadge);
    card.appendChild(cover);

    /* Body */
    var body = el('div', 'frs-card__body');

    /* Brand row */
    var brand = el('div', 'frs-card__brand');
    var logo = el('span', 'frs-card__brand-logo');
    var logoUrl = c.companies && c.companies.logo_url;
    if (logoUrl) {
      var limg = document.createElement('img');
      limg.src = logoUrl;
      limg.alt = '';
      limg.loading = 'lazy';
      logo.appendChild(limg);
    } else {
      logo.textContent = (compName[0] || '?').toUpperCase();
    }
    brand.appendChild(logo);
    var brandName = el('span');
    brandName.textContent = compName;
    brand.appendChild(brandName);
    body.appendChild(brand);

    /* Title + desc */
    body.appendChild(txt('h3', 'frs-card__title', c.title || ''));
    if (c.short_desc) {
      body.appendChild(txt('p', 'frs-card__desc', c.short_desc));
    }

    /* Promo code (offer type only, when code present) */
    if (c.campaign_type === 'offer' && c.promo_code) {
      var promo = el('div', 'frs-card__promo');
      promo.appendChild(txt('span', 'frs-card__promo-code', c.promo_code));
      var copy = txt('button', 'frs-card__promo-copy', 'Kopyala');
      copy.type = 'button';
      copy.addEventListener('click', function (ev) {
        ev.stopPropagation();
        copyPromo(c.promo_code, copy);
      });
      promo.appendChild(copy);
      body.appendChild(promo);
    }

    /* CTA */
    var ctaLabel = c.cta_label || (c.campaign_type === 'offer' ? 'Detaylar\u0131 G\u00F6r' : 'Markay\u0131 Takip Et');
    if (c.cta_url) {
      var a = document.createElement('a');
      a.className = 'frs-card__cta';
      a.href = c.cta_url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = ctaLabel;
      a.addEventListener('click', function () { trackClick(c); });
      body.appendChild(a);
    } else {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frs-card__cta';
      btn.textContent = ctaLabel;
      btn.addEventListener('click', function () {
        trackClick(c);
        /* Branding → navigate to Sirketler panel if this is an employer
         * campaign with a real company. Admin-authored announcements
         * (source='announcement') have no company so we skip. */
        if (c.campaign_type === 'employer_branding' && c.source !== 'announcement' && typeof switchPanel === 'function') {
          switchPanel('sirketler');
        }
      });
      body.appendChild(btn);
    }

    card.appendChild(body);
    return card;
  }

  function copyPromo(code, btnEl) {
    if (!code || !navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(function () {
      btnEl.textContent = 'Kopyaland\u0131';
      btnEl.classList.add('is-copied');
      setTimeout(function () {
        btnEl.textContent = 'Kopyala';
        btnEl.classList.remove('is-copied');
      }, 2000);
    }).catch(function () { /* ignore */ });
  }

  /* ── Telemetry ─────────────────────────────────── */
  function trackClick(c) {
    if (typeof ht_track !== 'function' || !c) return;
    try { ht_track('firsat_click', { campaign_id: c.id, type: c.campaign_type }); }
    catch (e) { /* ignore */ }
  }

  function trackImpressionBatch(campaigns) {
    if (typeof ht_track !== 'function' || !campaigns.length) return;
    try {
      ht_track('firsatlar_impression_batch', {
        count: campaigns.length,
        ids: campaigns.map(function (c) { return c.id; })
      });
    } catch (e) { /* ignore */ }
  }

  /* ── Render: grid ──────────────────────────────── */
  function renderGrid(campaigns) {
    var grid = el('section', 'frs-grid');
    for (var i = 0; i < campaigns.length; i++) {
      grid.appendChild(buildCard(campaigns[i]));
    }
    return grid;
  }

  /* ── Badge count hooks (legacy compat) ─────────── */
  function updateCountBadges(n) {
    ['badge-firsatlar', 'firsatlar-count-badge'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (n > 0) {
        el.textContent = String(n);
        el.style.display = 'inline-block';
      } else {
        el.style.display = 'none';
      }
    });
    var bento = document.getElementById('bento-firsatlar-count');
    if (bento) bento.textContent = n + ' aktif f\u0131rsat';
  }

  /* ── Data fetch ────────────────────────────────── */
  async function fetchCampaigns() {
    if (typeof supabase === 'undefined' || !supabase.from) return { data: [], error: new Error('supabase unavailable') };
    var sel = 'id, title, short_desc, full_desc, campaign_type, cover_image_url, cta_label, cta_url, promo_code, start_date, end_date, company_id, brand_id, companies(company_name, logo_url)';
    /* Client-side type filter (see ALLOWED_TYPES comment) — avoids
     * PostgreSQL enum cast error when migration partially deployed. */
    return supabase.from('campaigns')
      .select(sel)
      .eq('status', 'active')
      .order('start_date', { ascending: false });
  }

  /* FAZ D — Admin-authored fırsatlar published via duyuru composer.
   * RPC returns announcement rows with campaign_type not null; we
   * normalize them into the same card shape as campaigns. */
  async function fetchFirsatAnnouncements() {
    if (typeof supabase === 'undefined' || !supabase.rpc) return { data: [], error: new Error('supabase unavailable') };
    return supabase.rpc('get_firsat_announcements');
  }

  /* Batch-sign storage paths for announcement media (private cvs bucket). */
  async function signAnnMedia(rows) {
    var paths = [];
    for (var i = 0; i < rows.length; i++) {
      var media = rows[i].media || [];
      for (var j = 0; j < media.length; j++) {
        if (media[j] && media[j].storage_path) paths.push(media[j].storage_path);
      }
    }
    if (paths.length === 0) return {};
    if (!(window.HT && typeof window.HT.signStorageUrls === 'function')) return {};
    try { return await window.HT.signStorageUrls(paths, 3600); }
    catch (e) { console.warn('[firsatlar] ann media sign failed:', e && e.message); return {}; }
  }

  /* Normalize announcement row → campaign-card shape. First image media
   * becomes cover_image_url; admin has no brand/company concept so we
   * label as HelloTalent. */
  function normalizeAnnouncement(ann, signedMap) {
    var coverUrl = null;
    var media = ann.media || [];
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m && m.media_type === 'image' && m.storage_path && signedMap[m.storage_path]) {
        coverUrl = signedMap[m.storage_path];
        break;
      }
    }
    /* Strip markdown noise for card preview. */
    var raw = ann.body_md ? String(ann.body_md) : '';
    var desc = raw.replace(/[#*_>`\-]+/g, '').replace(/\s+/g, ' ').trim();
    if (desc.length > 200) desc = desc.substring(0, 198) + '\u2026';
    return {
      id: 'ann_' + ann.id,
      source: 'announcement',
      title: ann.title,
      short_desc: desc,
      campaign_type: ann.campaign_type,
      cover_image_url: coverUrl,
      cta_label: ann.cta_label || null,
      cta_url: ann.cta_url || null,
      promo_code: null,
      company_name: 'HelloTalent',
      companies: null,
      start_date: ann.published_at
    };
  }

  function filterAllowed(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(function (c) {
      return c && ALLOWED_TYPES.indexOf(c.campaign_type) !== -1;
    });
  }

  /* ── Main render pipeline ──────────────────────── */
  async function render() {
    _root = document.getElementById('firsatlar-root');
    if (!_root) return;

    clearRoot();
    var shell = el('div', 'frs-root');
    shell.appendChild(buildHero());

    /* Show skeleton while fetching */
    var skeletonHost = el('div');
    skeletonHost.appendChild(buildSkeleton());
    shell.appendChild(skeletonHost);
    _root.appendChild(shell);

    /* FAZ D: dual-source fetch in parallel —
     *   - campaigns (employer-authored, approved)
     *   - ht_announcements with campaign_type set (admin-authored) */
    var campaignRes, annRes;
    try {
      var pair = await Promise.all([fetchCampaigns(), fetchFirsatAnnouncements()]);
      campaignRes = pair[0];
      annRes = pair[1];
    } catch (e) {
      console.error('[firsatlar] dual fetch threw:', e && e.message);
      campaignRes = { data: [], error: e };
      annRes = { data: [], error: e };
    }

    /* Drop skeleton */
    if (skeletonHost.parentNode) skeletonHost.parentNode.removeChild(skeletonHost);

    /* K041 Faz 1E: partial fail still silent (mevcut data render), full fail
     * (both sources down) → error banner + retry. Empty-state artik "fırsat
     * yok" anlaminda; network hatasi ayrı sinyalde. */
    if (campaignRes.error) console.warn('[firsatlar] campaigns error:', campaignRes.error.message);
    if (annRes.error) console.warn('[firsatlar] announcements error:', annRes.error.message);
    if (campaignRes.error && annRes.error && typeof window._htBuildErrorBanner === 'function') {
      _loaded = false; // allow retry to re-enter render pipeline
      var banner = window._htBuildErrorBanner({
        message: 'Fırsatlar yüklenemedi. Bağlantını kontrol edip tekrar dene.',
        onRetry: function () { render(); }
      });
      shell.appendChild(banner);
      updateCountBadges(0);
      return;
    }

    var campaignRows = (campaignRes && !campaignRes.error && Array.isArray(campaignRes.data)) ? campaignRes.data : [];
    var campaigns = filterAllowed(campaignRows);

    var annRows = (annRes && !annRes.error && Array.isArray(annRes.data)) ? annRes.data : [];
    /* Announcements already filtered by RPC (campaign_type not null +
     * is_active) but apply ALLOWED_TYPES guard client-side too. */
    annRows = filterAllowed(annRows);

    var signedMap = annRows.length > 0 ? await signAnnMedia(annRows) : {};
    var normalizedAnns = annRows.map(function (a) { return normalizeAnnouncement(a, signedMap); });

    /* Merge + sort newest first. campaigns use start_date, announcements
     * use published_at normalized to same field. */
    var merged = campaigns.concat(normalizedAnns);
    merged.sort(function (a, b) {
      var da = a.start_date ? new Date(a.start_date).getTime() : 0;
      var db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return db - da;
    });

    _allCampaigns = merged;

    if (merged.length === 0) {
      shell.appendChild(buildEmpty());
      updateCountBadges(0);
      return;
    }

    shell.appendChild(buildMeta(merged));
    shell.appendChild(renderGrid(merged));
    updateCountBadges(merged.length);
    trackImpressionBatch(merged);
  }

  /* ── Public entry — panel-firsatlar lazy-loader ──
   * Invoked by profil-wizard switchPanel hook. Safe to call repeatedly
   * — the render pipeline itself resets DOM. */
  window._htLoadFirsatlar = async function () {
    if (_loaded) return;
    _loaded = true;
    try {
      await render();
    } catch (e) {
      console.error('[firsatlar] render failed:', e && e.message);
    }
  };

  /* Allow external refresh (e.g., after new campaign push). */
  window._htRefreshFirsatlar = function () {
    _loaded = false;
    window._htLoadFirsatlar();
  };

})();
