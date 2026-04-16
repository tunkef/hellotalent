/* global supabase, switchPanel, ht_track */
/* Firsatlar paneli editorial rewrite (formerly Teklifler). FAZ B + C.
 *
 * Scope:
 *   - Freemium-only (premium gate removed — K034 decision).
 *   - 4 campaign types rendered: offer, employer_branding, store_opening,
 *     brand_story. 'hiring_boost' filtered out (iş ilanı değil — Tuna
 *     karari). See migration 20260416120000_firsatlar_campaign_types.sql.
 *   - Demo fallback when DB empty; real campaigns override.
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
        /* Branding → navigate to Sirketler panel if company known. */
        if (c.campaign_type === 'employer_branding' && typeof switchPanel === 'function') {
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

    var res;
    try {
      res = await fetchCampaigns();
    } catch (e) {
      console.error('[firsatlar] fetch threw:', e && e.message);
      res = { data: [], error: e };
    }

    /* Drop skeleton */
    if (skeletonHost.parentNode) skeletonHost.parentNode.removeChild(skeletonHost);

    /* Fetch error → silent empty state (Tuna karari: error UI yok,
     * fake veri yok). Log console'a debug icin. */
    if (res.error) {
      console.warn('[firsatlar] fetch error (render empty):', res.error.message);
    }

    var rows = (res && !res.error && Array.isArray(res.data)) ? res.data : [];
    var campaigns = filterAllowed(rows);
    _allCampaigns = campaigns;

    if (campaigns.length === 0) {
      shell.appendChild(buildEmpty());
      updateCountBadges(0);
      return;
    }

    shell.appendChild(buildMeta(campaigns));
    shell.appendChild(renderGrid(campaigns));
    updateCountBadges(campaigns.length);
    trackImpressionBatch(campaigns);
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
