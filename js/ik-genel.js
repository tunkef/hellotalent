/* global IK_SHELL */
/* ════════════════════════════════════════════════════════════════
   IK Genel — Asama 86 Sprint A
   Anasayfa dashboard renderer. Demo data fetch + bento render.
   profil-genel.js pattern parite. textContent + DOM API only — innerHTML YOK.
   Sprint B'de gerçek HR_DATA adapter ile değiştirilir.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════ DOM helpers ═══════ */
  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function txt(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* SVG via DOM API (innerHTML yok, hook XSS guard geçer) */
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    }
    return e;
  }

  function buildIconPlus() {
    var s = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    s.appendChild(svgEl('path', { d: 'M12 5v14M5 12h14' }));
    return s;
  }
  function buildIconSearch() {
    var s = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    s.appendChild(svgEl('circle', { cx: '11', cy: '11', r: '7' }));
    s.appendChild(svgEl('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }));
    return s;
  }
  function buildIconUserPlus() {
    var s = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    s.appendChild(svgEl('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }));
    s.appendChild(svgEl('circle', { cx: '9', cy: '7', r: '4' }));
    s.appendChild(svgEl('line', { x1: '19', y1: '8', x2: '19', y2: '14' }));
    s.appendChild(svgEl('line', { x1: '22', y1: '11', x2: '16', y2: '11' }));
    return s;
  }
  function buildIconArrow(size) {
    var sz = size || 16;
    var s = svgEl('svg', { width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', 'stroke-width': '2',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    s.appendChild(svgEl('path', { d: 'M5 12h14M12 5l7 7-7 7' }));
    return s;
  }

  /* ═══════ Date helpers ═══════ */
  var TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function formatTodayCaption() {
    var d = new Date();
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()] + ' ' + d.getFullYear() +
           ', ' + TR_DAYS[d.getDay()];
  }

  function formatTimeAgo(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'şimdi';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat';
    if (diff < 604800) return Math.floor(diff / 86400) + ' gün';
    return d.getDate() + ' ' + TR_MONTHS[d.getMonth()];
  }

  function firstName(full) {
    if (!full) return '';
    return String(full).trim().split(/\s+/)[0];
  }

  function initialOf(full) {
    if (!full) return '?';
    var n = String(full).trim();
    return n ? n.charAt(0).toUpperCase() : '?';
  }

  /* ═══════ Data fetch (demo JSON) ═══════ */
  function fetchDemoData() {
    var sources = [
      'data/demo/positions.json',
      'data/demo/candidates.json',
      'data/demo/pipeline.json',
      'data/demo/messages.json',
      'data/demo/campaigns.json'
    ];
    var promises = sources.map(function (src) {
      return fetch(src, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('demo fetch ' + src + ' status ' + r.status);
        return r.json();
      });
    });
    return Promise.all(promises).then(function (rows) {
      return {
        positions: rows[0],
        candidates: rows[1],
        pipeline: rows[2],
        messages: rows[3],
        campaigns: rows[4]
      };
    });
  }

  /* ═══════ KPI compute ═══════ */
  function computeKPIs(data) {
    var openPositions = (data.positions || []).filter(function (p) {
      return p.status === 'open';
    }).length;

    var pipelineActive = (data.pipeline || []).length;

    var pendingMessages = (data.messages || []).filter(function (m) {
      return (m.unread_count || 0) > 0;
    }).length;

    var activeCampaigns = (data.campaigns || []).filter(function (c) {
      return c.status === 'sent' || c.status === 'scheduled';
    }).length;

    return {
      openPositions: openPositions,
      pipelineActive: pipelineActive,
      pendingMessages: pendingMessages,
      activeCampaigns: activeCampaigns
    };
  }

  /* ═══════ HERO ═══════ */
  function buildHero(data, kpis, ctx) {
    var hero = el('section', 'ik-genel__hero');

    /* Date row */
    hero.appendChild(txt('div', 'ik-mono ik-mono--muted ik-genel__hero-date', formatTodayCaption()));

    var grid = el('div', 'ik-genel__hero-grid');
    var textBlock = el('div', 'ik-genel__hero-text');

    /* Greeting */
    var name = '';
    if (ctx && ctx.hr && ctx.hr.full_name) name = firstName(ctx.hr.full_name);
    else if (ctx && ctx.user && ctx.user.email) name = firstName(ctx.user.email.split('@')[0]);
    var greetingText = name ? ('Merhaba ' + name) : 'Merhaba';
    textBlock.appendChild(txt('h1', 'ik-genel__title', greetingText));

    /* Subline — bugünkü öncelik */
    var subParts = [];
    if (kpis.pendingMessages > 0) {
      subParts.push(kpis.pendingMessages + ' aday yanıtınızı bekliyor');
    }
    if (kpis.openPositions > 0) {
      subParts.push(kpis.openPositions + ' açık pozisyon');
    }
    if (kpis.pipelineActive > 0) {
      subParts.push(kpis.pipelineActive + ' aday süreçte');
    }
    var subText = subParts.length
      ? subParts.join(' · ')
      : 'Bugün için bekleyen iş yok. İyi çalışmalar.';
    textBlock.appendChild(txt('p', 'ik-genel__subline', subText));

    grid.appendChild(textBlock);
    hero.appendChild(grid);

    /* KPI row */
    var kpiRow = el('div', 'ik-genel__kpi-row');

    function kpiCard(label, value, deltaText, isAccent, onClick) {
      var btn = el('button', 'ik-kpi' + (isAccent ? ' ik-kpi--accent' : ''));
      btn.type = 'button';
      btn.appendChild(txt('span', 'ik-kpi__label', label));
      btn.appendChild(txt('strong', 'ik-kpi__value', value));
      if (deltaText) btn.appendChild(txt('span', 'ik-kpi__delta', deltaText));
      if (onClick) btn.addEventListener('click', onClick);
      return btn;
    }

    kpiRow.appendChild(kpiCard(
      'Açık pozisyon',
      kpis.openPositions,
      'Devam eden ilanlar',
      false,
      function () { location.href = 'hr-campaigns.html'; }
    ));
    kpiRow.appendChild(kpiCard(
      'Süreçteki aday',
      kpis.pipelineActive,
      'Pipeline toplam',
      true,
      function () { location.href = 'hr-pipeline.html'; }
    ));
    kpiRow.appendChild(kpiCard(
      'Yanıt bekleyen',
      kpis.pendingMessages,
      'Mesaj kutusu',
      kpis.pendingMessages > 0,
      function () { location.href = 'hr-messages.html'; }
    ));
    kpiRow.appendChild(kpiCard(
      'Aktif kampanya',
      kpis.activeCampaigns,
      'Yayında veya planlı',
      false,
      function () { location.href = 'hr-campaigns.html'; }
    ));

    hero.appendChild(kpiRow);

    return hero;
  }

  /* ═══════ Bento card builders ═══════ */
  function buildCardShell(title, chipText, ctaText, onClick) {
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'ik-card';
    if (onClick) card.addEventListener('click', onClick);

    var head = el('div', 'ik-card__head');
    head.appendChild(txt('h3', 'ik-card__title', title));
    if (chipText) {
      head.appendChild(txt('span', 'ik-card__chip', chipText));
    }
    card.appendChild(head);

    var body = el('div', 'ik-card__body');
    card.appendChild(body);

    if (ctaText) {
      var cta = el('span', 'ik-card__cta');
      cta.appendChild(document.createTextNode(ctaText + ' '));
      cta.appendChild(txt('span', 'ik-card__cta-arrow', '→'));
      card.appendChild(cta);
    }

    return { card: card, body: body };
  }

  /* Pipeline summary card */
  function buildPipelineCard(data) {
    var stages = [
      { key: 'basvuru', label: 'Başvuru' },
      { key: 'on_eleme', label: 'Ön eleme' },
      { key: 'mulakat', label: 'Mülakat' },
      { key: 'teklif', label: 'Teklif' }
    ];
    var counts = {};
    (data.pipeline || []).forEach(function (p) {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
    });

    var total = data.pipeline ? data.pipeline.length : 0;
    var shell = buildCardShell(
      'Pipeline özeti',
      total + ' aday',
      'Pipeline detayı',
      function () { location.href = 'hr-pipeline.html'; }
    );

    var stageRow = el('div', 'ik-stage-row');
    stages.forEach(function (s) {
      var row = el('div', 'ik-stage');
      row.appendChild(txt('span', 'ik-stage__label', s.label));
      row.appendChild(txt('span', 'ik-stage__count', counts[s.key] || 0));
      stageRow.appendChild(row);
    });

    if (total === 0) {
      shell.body.appendChild(txt('div', 'ik-empty', 'Henüz pipeline kaydı yok.'));
    } else {
      shell.body.appendChild(stageRow);
    }
    return shell.card;
  }

  /* Yeni adaylar — son 24h kayit (updated_at) */
  function buildNewCandidatesCard(data) {
    var candidates = (data.candidates || []).slice();
    candidates.sort(function (a, b) {
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    });
    var top = candidates.slice(0, 3);

    var shell = buildCardShell(
      'Yeni adaylar',
      'Son 24 saat',
      'Aday havuzu',
      function () { location.href = 'hr-pool.html'; }
    );

    if (top.length === 0) {
      shell.body.appendChild(txt('div', 'ik-empty', 'Henüz yeni başvuru yok.'));
    } else {
      var list = el('div', 'ik-list');
      top.forEach(function (c) {
        var item = el('div', 'ik-list__item');
        item.appendChild(txt('div', 'ik-list__avatar', initialOf(c.full_name)));
        var body = el('div', 'ik-list__body');
        body.appendChild(txt('span', 'ik-list__name', c.full_name || '—'));
        var metaParts = [];
        if (c.pozisyon) metaParts.push(c.pozisyon);
        if (c.sehir) metaParts.push(c.sehir);
        body.appendChild(txt('span', 'ik-list__meta', metaParts.join(' · ')));
        item.appendChild(body);
        item.appendChild(txt('span', 'ik-list__time', formatTimeAgo(c.updated_at)));
        list.appendChild(item);
      });
      shell.body.appendChild(list);
    }
    return shell.card;
  }

  /* Bekleyen mesajlar */
  function buildMessagesCard(data) {
    var threads = (data.messages || []).slice();
    threads.sort(function (a, b) {
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });
    var top = threads.slice(0, 3);
    var pending = threads.filter(function (t) { return (t.unread_count || 0) > 0; }).length;

    var shell = buildCardShell(
      'Bekleyen mesajlar',
      pending > 0 ? pending + ' yeni' : 'Tümü okundu',
      'Mesaj kutusu',
      function () { location.href = 'hr-messages.html'; }
    );

    /* Chip accent */
    if (pending > 0) {
      var chip = shell.card.querySelector('.ik-card__chip');
      if (chip) chip.classList.add('ik-card__chip--accent');
    }

    if (top.length === 0) {
      shell.body.appendChild(txt('div', 'ik-empty', 'Mesaj kutunuz boş.'));
    } else {
      var list = el('div', 'ik-list');
      top.forEach(function (t) {
        var item = el('div', 'ik-list__item');
        item.appendChild(txt('div', 'ik-list__avatar', initialOf(t.candidate_name)));
        var body = el('div', 'ik-list__body');
        body.appendChild(txt('span', 'ik-list__name', t.candidate_name || '—'));
        body.appendChild(txt('span', 'ik-list__meta', t.last_message || ''));
        item.appendChild(body);
        item.appendChild(txt('span', 'ik-list__time', formatTimeAgo(t.last_message_at)));
        list.appendChild(item);
      });
      shell.body.appendChild(list);
    }
    return shell.card;
  }

  /* Aktif kampanyalar */
  function buildCampaignsCard(data) {
    var campaigns = (data.campaigns || []).slice();
    var active = campaigns.filter(function (c) {
      return c.status === 'sent' || c.status === 'scheduled';
    });
    active.sort(function (a, b) {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    var top = active.slice(0, 3);

    var shell = buildCardShell(
      'Aktif kampanyalar',
      active.length + ' kampanya',
      'Kampanya yönetimi',
      function () { location.href = 'hr-campaigns.html'; }
    );

    if (top.length === 0) {
      shell.body.appendChild(txt('div', 'ik-empty', 'Yayında kampanya yok.'));
    } else {
      var list = el('div', 'ik-campaign-row');
      top.forEach(function (c) {
        var row = el('div', 'ik-campaign');
        row.appendChild(txt('div', 'ik-campaign__title', c.title || '—'));
        var stats = el('div', 'ik-campaign__stats');

        var stat1 = el('span', 'ik-campaign__stat');
        var s1strong = txt('strong', '', (c.sent_count || 0));
        stat1.appendChild(s1strong);
        stat1.appendChild(document.createTextNode('Gönderim'));
        stats.appendChild(stat1);

        var stat2 = el('span', 'ik-campaign__stat');
        var openPct = c.sent_count > 0
          ? Math.round((c.opened_count || 0) / c.sent_count * 100) + '%'
          : '0%';
        var s2strong = txt('strong', '', openPct);
        stat2.appendChild(s2strong);
        stat2.appendChild(document.createTextNode('Açılma'));
        stats.appendChild(stat2);

        var stat3 = el('span', 'ik-campaign__stat');
        var s3strong = txt('strong', '', (c.replied_count || 0));
        stat3.appendChild(s3strong);
        stat3.appendChild(document.createTextNode('Yanıt'));
        stats.appendChild(stat3);

        row.appendChild(stats);
        list.appendChild(row);
      });
      shell.body.appendChild(list);
    }
    return shell.card;
  }

  /* Ekip aktivite (placeholder — Sprint D'de hr_team feed) */
  function buildTeamCard() {
    var shell = buildCardShell(
      'Ekip akışı',
      'Yakında',
      'Ekip yönetimi',
      function () { location.href = 'hr-team.html'; }
    );

    shell.body.appendChild(txt(
      'div',
      'ik-empty',
      'Ekip aktivite akışı Sprint D ile geliyor.'
    ));
    var hint = txt('div', 'ik-empty__hint', 'Şimdilik tek hesap modunda çalışıyorsunuz.');
    shell.body.appendChild(hint);
    return shell.card;
  }

  /* Hizli eylemler */
  function buildActionsCard() {
    var card = el('article', 'ik-card ik-card--actions');

    var head = el('div', 'ik-card__head');
    head.appendChild(txt('h3', 'ik-card__title', 'Hızlı eylem'));
    head.appendChild(txt('span', 'ik-card__chip', '3 işlem'));
    card.appendChild(head);

    var body = el('div', 'ik-card__body');

    var actions = [
      {
        label: 'Yeni kampanya başlat',
        href: 'hr-campaigns.html?new=1',
        iconBuilder: buildIconPlus
      },
      {
        label: 'Aday havuzunda ara',
        href: 'hr-pool.html',
        iconBuilder: buildIconSearch
      },
      {
        label: 'Ekip üyesi davet et',
        href: 'hr-team.html?invite=1',
        iconBuilder: buildIconUserPlus
      }
    ];

    actions.forEach(function (a) {
      var link = document.createElement('a');
      link.className = 'ik-quick-action';
      link.href = a.href;

      var iconSpan = el('span', 'ik-quick-action__icon');
      iconSpan.appendChild(a.iconBuilder());
      link.appendChild(iconSpan);

      link.appendChild(txt('span', 'ik-quick-action__label', a.label));

      var arrow = el('span', 'ik-quick-action__arrow');
      arrow.appendChild(buildIconArrow(16));
      link.appendChild(arrow);

      body.appendChild(link);
    });

    card.appendChild(body);
    return card;
  }

  /* ═══════ Recent activity feed ═══════ */
  function buildFeed(data) {
    var section = el('section', 'ik-genel__feed');

    var header = el('div', 'ik-feed-header');
    header.appendChild(txt('h2', 'ik-feed-header__title', 'Son hareketler'));
    header.appendChild(txt('div', 'ik-feed-header__sub', 'Bugün ekibinizde olanlar'));
    section.appendChild(header);

    var spine = el('div', 'ik-feed-spine');

    /* Build activity items from pipeline + messages + campaigns */
    var items = [];

    /* Recent pipeline transitions */
    (data.pipeline || []).slice().sort(function (a, b) {
      return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    }).slice(0, 3).forEach(function (p) {
      var cand = (data.candidates || []).find(function (c) { return c.id === p.candidate_id; });
      var pos = (data.positions || []).find(function (po) { return po.id === p.position_id; });
      if (!cand || !pos) return;
      var stageLabel = ({
        basvuru: 'başvuruda',
        on_eleme: 'ön elemede',
        mulakat: 'mülakatta',
        teklif: 'teklif aşamasında'
      })[p.stage] || p.stage;
      items.push({
        ts: p.updated_at,
        text: cand.full_name + ' ',
        accent: pos.title,
        suffix: ' pozisyonunda ' + stageLabel,
        action: 'Adayı aç',
        accentDot: p.stage === 'teklif' || p.stage === 'mulakat',
        href: 'hr-candidate.html?id=' + cand.id
      });
    });

    /* Recent messages */
    (data.messages || []).slice().sort(function (a, b) {
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    }).slice(0, 2).forEach(function (m) {
      items.push({
        ts: m.last_message_at,
        text: m.candidate_name + ' ',
        accent: 'mesaj gönderdi',
        suffix: ' — ' + (m.position_title || ''),
        action: 'Mesajı oku',
        accentDot: (m.unread_count || 0) > 0,
        href: 'hr-messages.html?thread=' + m.id
      });
    });

    /* Sort all by ts desc */
    items.sort(function (a, b) {
      return new Date(b.ts || 0) - new Date(a.ts || 0);
    });
    var top = items.slice(0, 5);

    if (top.length === 0) {
      spine.appendChild(txt('div', 'ik-state', 'Henüz hareket yok.'));
    } else {
      top.forEach(function (it) {
        var article = el('article', 'ik-feed-item' + (it.accentDot ? ' ik-feed-item--accent' : ''));
        article.appendChild(txt('div', 'ik-feed-item__meta', formatTimeAgo(it.ts)));

        var p = el('p', 'ik-feed-item__text');
        p.appendChild(document.createTextNode(it.text));
        if (it.accent) p.appendChild(txt('strong', '', it.accent));
        if (it.suffix) p.appendChild(document.createTextNode(it.suffix));
        article.appendChild(p);

        if (it.action && it.href) {
          var link = document.createElement('a');
          link.className = 'ik-feed-item__action';
          link.href = it.href;
          link.appendChild(document.createTextNode(it.action + ' '));
          link.appendChild(txt('span', 'ik-feed-item__action-arrow', '→'));
          article.appendChild(link);
        }
        spine.appendChild(article);
      });
    }

    section.appendChild(spine);
    return section;
  }

  /* ═══════ Signature ═══════ */
  function buildSignature() {
    var sig = el('footer', 'ik-genel__signature');
    sig.appendChild(el('div', 'ik-genel__signature-line'));
    var mark = el('div', 'ik-genel__signature-mark');
    mark.appendChild(document.createTextNode('— hellotalent kurumsal —'));
    sig.appendChild(mark);
    sig.appendChild(el('div', 'ik-genel__signature-line'));
    return sig;
  }

  /* ═══════ Render ═══════ */
  function renderEmpty(host, msg) {
    while (host.firstChild) host.removeChild(host.firstChild);
    var st = txt('div', 'ik-state', msg);
    host.appendChild(st);
  }

  async function render() {
    var host = $('#ik-genel-shell');
    if (!host) return;

    while (host.firstChild) host.removeChild(host.firstChild);

    var ctx = (window.IK_SHELL && window.IK_SHELL.ctx) || null;
    if (!ctx) {
      /* Wait briefly for IK_SHELL.init */
      await new Promise(function (resolve) {
        var tries = 0;
        var iv = setInterval(function () {
          tries += 1;
          if (window.IK_SHELL && window.IK_SHELL.ctx) {
            clearInterval(iv);
            ctx = window.IK_SHELL.ctx;
            resolve();
          } else if (tries > 30) {
            clearInterval(iv);
            resolve();
          }
        }, 100);
      });
    }

    var data;
    try {
      data = await fetchDemoData();
    } catch (e) {
      console.warn('[ik-genel] demo fetch fail:', e && e.message);
      renderEmpty(host, 'Demo veriler yüklenemedi. Sayfayı yenileyin.');
      return;
    }

    var kpis = computeKPIs(data);

    var root = el('div', 'ik-genel');
    root.appendChild(buildHero(data, kpis, ctx));

    var bento = el('section', 'ik-genel__bento');
    bento.appendChild(buildPipelineCard(data));
    bento.appendChild(buildNewCandidatesCard(data));
    bento.appendChild(buildMessagesCard(data));
    bento.appendChild(buildCampaignsCard(data));
    bento.appendChild(buildTeamCard());
    bento.appendChild(buildActionsCard());
    root.appendChild(bento);

    root.appendChild(buildFeed(data));
    root.appendChild(buildSignature());

    host.appendChild(root);
    document.documentElement.setAttribute('data-ik-genel-ready', '1');
  }

  /* ═══════ Boot ═══════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
