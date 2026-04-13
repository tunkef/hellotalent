/* K030 FAZ B — panel-soon.js
 * Renders the "Yakında" (Coming Soon) Stüdyo placeholder grid.
 * Called from profil-wizard.js when window._HT_STUDIO_FROZEN === true.
 * Exposes: window._htRenderPanelSoon(rootEl)
 *
 * Design rules:
 * - vanilla JS only (var, IIFE), Safari-safe
 * - semantic design tokens only (no hardcoded hex)
 * - BEM-lite double-underscore classes
 * - Turkish UI, no emoji
 * - DOM API only (createElement + textContent), no innerHTML for content
 * - inline SVG icons via createElementNS
 * - cards are tabindex=-1, cursor default (not interactive)
 * - reduced-motion gated (CSS media query)
 */

(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var CARDS = [
    {
      key: 'mulakat-demolari',
      title: 'Mülakat demoları',
      desc: 'Gerçek mağaza senaryolarıyla çalışacağın mülakat pratiği alanı.',
      icon: 'mic'
    },
    {
      key: 'yetkinlik',
      title: 'Yetkinlik bazlı çalışma',
      desc: 'Perakende için seçilmiş yetkinlikler üzerinde odaklı gelişim.',
      icon: 'target'
    },
    {
      key: 'teknikler',
      title: 'Mülakat teknikleri',
      desc: 'STAR, davranışsal sorular ve hazırlık rehberleri.',
      icon: 'book'
    },
    {
      key: 'magaza',
      title: 'Mağaza bilgileri',
      desc: 'Operasyon, müşteri deneyimi ve mağaza içi bilgi kaynakları.',
      icon: 'store'
    }
  ];

  function makeSvgIcon(kind) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.75');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    var paths = [];
    if (kind === 'mic') {
      paths = [
        { tag: 'rect', attrs: { x: '9', y: '3', width: '6', height: '12', rx: '3' } },
        { tag: 'path', attrs: { d: 'M5 11a7 7 0 0 0 14 0' } },
        { tag: 'path', attrs: { d: 'M12 18v3' } }
      ];
    } else if (kind === 'target') {
      paths = [
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '5' } },
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '1.5' } }
      ];
    } else if (kind === 'book') {
      paths = [
        { tag: 'path', attrs: { d: 'M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z' } },
        { tag: 'path', attrs: { d: 'M8 4v12' } }
      ];
    } else if (kind === 'store') {
      paths = [
        { tag: 'path', attrs: { d: 'M3 9l1.5-5h15L21 9' } },
        { tag: 'path', attrs: { d: 'M4 9v11h16V9' } },
        { tag: 'path', attrs: { d: 'M9 20v-6h6v6' } }
      ];
    }

    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      var el = document.createElementNS(SVG_NS, p.tag);
      for (var k in p.attrs) {
        if (Object.prototype.hasOwnProperty.call(p.attrs, k)) {
          el.setAttribute(k, p.attrs[k]);
        }
      }
      svg.appendChild(el);
    }
    return svg;
  }

  function makeCard(data) {
    var card = document.createElement('article');
    card.className = 'ht-soon__card';
    card.setAttribute('tabindex', '-1');
    card.setAttribute('data-card', data.key);

    var iconWrap = document.createElement('div');
    iconWrap.className = 'ht-soon__icon';
    iconWrap.appendChild(makeSvgIcon(data.icon));
    card.appendChild(iconWrap);

    var title = document.createElement('h3');
    title.className = 'ht-soon__title';
    title.textContent = data.title;
    card.appendChild(title);

    var desc = document.createElement('p');
    desc.className = 'ht-soon__desc';
    desc.textContent = data.desc;
    card.appendChild(desc);

    return card;
  }

  function renderPanelSoon(rootEl) {
    if (!rootEl) return;

    // Clear existing content (freeze render is idempotent)
    while (rootEl.firstChild) {
      rootEl.removeChild(rootEl.firstChild);
    }

    var wrap = document.createElement('section');
    wrap.className = 'ht-soon';

    var header = document.createElement('header');
    header.className = 'ht-soon__header';

    var chip = document.createElement('span');
    chip.className = 'ht-soon__chip';
    chip.textContent = 'Yakında';
    header.appendChild(chip);

    var heading = document.createElement('h2');
    heading.className = 'ht-soon__heading';
    heading.textContent = 'Stüdyo';
    header.appendChild(heading);

    var lead = document.createElement('p');
    lead.className = 'ht-soon__lead';
    lead.textContent = 'Kariyer gelişimi için kapsamlı bir alan hazırlıyoruz. Yakında burada olacak.';
    header.appendChild(lead);

    wrap.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'ht-soon__grid';
    grid.setAttribute('role', 'region');
    grid.setAttribute('aria-label', 'Stüdyo yakında gelecek özellikler');

    for (var i = 0; i < CARDS.length; i++) {
      grid.appendChild(makeCard(CARDS[i]));
    }

    wrap.appendChild(grid);
    rootEl.appendChild(wrap);
  }

  window._htRenderPanelSoon = renderPanelSoon;
})();
