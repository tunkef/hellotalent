/* global IK_SHELL, IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Candidate — Asama 86 Sprint B
   Aday detay sayfasi: header + 4 tab + CTA bar.
   URL: ?id=:candidate_id
   Tab'lar: Profil · Notlar · Mesajlar · Match Breakdown
   XSS-safe (textContent only).
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var TABS = [
    { key: 'profile',   label: 'Profil' },
    { key: 'notes',     label: 'Notlar' },
    { key: 'messages',  label: 'Mesajlar' },
    { key: 'breakdown', label: 'Match Breakdown' }
  ];

  var state = {
    candidate: null,
    activePosition: null,
    activeTab: 'profile',
    notes: []
  };

  var dom = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function cacheDom() {
    dom.shell = $('#ik-candidate-shell');
    dom.toast = $('[data-ik-candidate-toast]');
  }

  /* ═══════ Helpers ═══════ */
  function getQueryId() {
    try {
      var p = new URLSearchParams(location.search);
      return p.get('id');
    } catch (e) {
      var m = location.search.match(/[?&]id=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
  }

  function initialOf(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function clearChildren(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function showToast(msg, kind) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.remove('ik-candidate-toast--success', 'ik-candidate-toast--error');
    if (kind === 'success') dom.toast.classList.add('ik-candidate-toast--success');
    else if (kind === 'error') dom.toast.classList.add('ik-candidate-toast--error');
    dom.toast.classList.add('is-visible');
    setTimeout(function () {
      dom.toast.classList.remove('is-visible');
    }, 2200);
  }

  function matchClass(score) {
    if (score >= 70) return '';
    if (score >= 40) return 'ik-candidate__match--mid';
    return 'ik-candidate__match--low';
  }

  /* ═══════ Match breakdown calc ═══════ */
  function computeBreakdown(c, pos) {
    if (!c || !pos) return null;
    var rows = [];
    /* Segment */
    var sm = c.segment === pos.segment ? 30 : 0;
    rows.push({
      label: 'Segment uyumu',
      max: 30,
      value: sm,
      hint: c.segment === pos.segment
        ? 'Aday ' + segmentLabel(c.segment) + ' segmentinde, pozisyonla bire bir uyumlu.'
        : 'Pozisyon ' + segmentLabel(pos.segment) + ', aday ' + segmentLabel(c.segment) + '.'
    });
    /* Şehir */
    var cm = c.adres_il === pos.city ? 25 : 0;
    rows.push({
      label: 'Şehir',
      max: 25,
      value: cm,
      hint: c.adres_il === pos.city
        ? 'Pozisyon ile aynı şehirde (' + c.adres_il + ').'
        : 'Pozisyon ' + (pos.city || '—') + ', aday ' + (c.adres_il || '—') + '. Lokasyon farkı puanı düşürdü.'
    });
    /* Deneyim — Phase D2.3: toplam_deneyim_ay → getDeneyimYil helper */
    var rng = parseRange(pos.experience_years);
    var cy = IK_DATA.getDeneyimYil(c);
    var em = 0;
    if (rng) {
      if ((rng.min == null || cy >= rng.min) && (rng.max == null || cy <= rng.max)) em = 20;
      else if (rng.max != null && cy <= rng.max + 2) em = 10;
      else em = 0;
    }
    rows.push({
      label: 'Deneyim aralığı',
      max: 20,
      value: em,
      hint: 'Pozisyon ' + (pos.experience_years || '—') + ' yıl ister, aday ' + cy + ' yıl deneyimli.'
    });
    /* Müsaitlik */
    var amap = { 'hemen': 15, '2 hafta': 12, '1 ay': 8, '3 ay': 4 };
    var avail = (c.musaitlik || '').toLowerCase();
    var aval = 0;
    Object.keys(amap).forEach(function (k) {
      if (avail.indexOf(k) >= 0 && amap[k] > aval) aval = amap[k];
    });
    rows.push({
      label: 'Müsaitlik',
      max: 15,
      value: aval,
      hint: c.musaitlik ? 'Başlama: ' + c.musaitlik : 'Bilgi yok.'
    });

    var total = rows.reduce(function (a, r) { return a + r.value; }, 0);
    return { rows: rows, total: Math.min(100, total) }; /* max 90 actual (district kaldırıldı D2.3) */
  }

  function parseRange(s) {
    if (!s) return null;
    var t = String(s);
    var plus = t.match(/^(\d+)\s*\+/);
    if (plus) return { min: parseInt(plus[1], 10), max: null };
    var range = t.match(/^(\d+)\s*-\s*(\d+)/);
    if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
    var single = t.match(/^(\d+)$/);
    if (single) return { min: parseInt(single[1], 10), max: parseInt(single[1], 10) };
    return null;
  }

  function segmentLabel(s) {
    var map = { luks: 'Lüks', premium: 'Premium', 'high-street': 'High-street' };
    return map[s] || (s || '—');
  }

  /* ═══════ Render ═══════ */
  function render404(id) {
    if (!dom.shell) return;
    clearChildren(dom.shell);
    var wrap = document.createElement('div');
    wrap.className = 'ik-candidate-404';
    var t = document.createElement('h1');
    t.className = 'ik-candidate-404__title';
    t.textContent = 'Aday bulunamadı';
    wrap.appendChild(t);
    var d = document.createElement('p');
    d.className = 'ik-candidate-404__desc';
    d.textContent = (id ? id + ' kimliğine sahip aday bulunamadı.' : 'Geçerli bir aday seç.');
    wrap.appendChild(d);
    var cta = document.createElement('a');
    cta.className = 'ik-candidate-404__cta';
    cta.href = 'hr-pool.html';
    cta.textContent = 'Havuza dön';
    wrap.appendChild(cta);
    dom.shell.appendChild(wrap);
  }

  function renderShell() {
    if (!dom.shell || !state.candidate) return;
    clearChildren(dom.shell);

    var root = document.createElement('div');
    root.className = 'ik-candidate';

    /* Breadcrumb */
    var crumb = document.createElement('a');
    crumb.className = 'ik-candidate__breadcrumb';
    crumb.href = 'hr-pool.html';
    var cArrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    cArrow.setAttribute('viewBox', '0 0 24 24');
    cArrow.setAttribute('fill', 'none');
    cArrow.setAttribute('stroke', 'currentColor');
    cArrow.setAttribute('stroke-width', '2.2');
    cArrow.setAttribute('stroke-linecap', 'round');
    cArrow.setAttribute('stroke-linejoin', 'round');
    var ap = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    ap.setAttribute('points', '15 18 9 12 15 6');
    cArrow.appendChild(ap);
    crumb.appendChild(cArrow);
    var ct = document.createElement('span');
    ct.textContent = 'Aday havuzuna dön';
    crumb.appendChild(ct);
    root.appendChild(crumb);

    /* Header */
    root.appendChild(renderHeader());

    /* Tab nav */
    root.appendChild(renderTabNav());

    /* Panel */
    var panel = document.createElement('section');
    panel.className = 'ik-candidate__panel';
    panel.setAttribute('data-tab-panel', '1');
    panel.appendChild(renderTabContent());
    root.appendChild(panel);

    /* CTA */
    root.appendChild(renderCTA());

    dom.shell.appendChild(root);

    bindShellEvents();
  }

  function renderHeader() {
    var c = state.candidate;
    var pos = state.activePosition;

    var header = document.createElement('header');
    header.className = 'ik-candidate__header';
    var row = document.createElement('div');
    row.className = 'ik-candidate__header-row';

    var av = document.createElement('div');
    av.className = 'ik-candidate__avatar';
    av.textContent = initialOf(c.full_name);
    av.setAttribute('aria-hidden', 'true');
    row.appendChild(av);

    var main = document.createElement('div');
    main.className = 'ik-candidate__main';

    var name = document.createElement('h1');
    name.className = 'ik-candidate__name';
    name.textContent = c.full_name;
    main.appendChild(name);

    var poz = document.createElement('p');
    poz.className = 'ik-candidate__poz';
    var deneyimYil = IK_DATA.getDeneyimYil(c);
    poz.textContent = (c.son_pozisyon || '—') + (deneyimYil > 0 ? ' · ' + deneyimYil + ' yıl deneyim' : '');
    main.appendChild(poz);

    var chips = document.createElement('div');
    chips.className = 'ik-candidate__chips';
    var chipDefs = [
      { label: 'Şehir', value: c.adres_il || '—' },
      { label: 'Segment', value: segmentLabel(c.segment) },
      { label: 'Müsaitlik', value: c.musaitlik || '—' },
      { label: 'Çalışma', value: c.calisma_tipi || '—' }
    ];
    chipDefs.forEach(function (cd) {
      var chip = document.createElement('span');
      chip.className = 'ik-candidate__chip';
      var l = document.createElement('span');
      l.className = 'ik-candidate__chip-label';
      l.textContent = cd.label;
      chip.appendChild(l);
      var v = document.createElement('span');
      v.textContent = cd.value;
      chip.appendChild(v);
      chips.appendChild(chip);
    });
    main.appendChild(chips);

    row.appendChild(main);

    /* Match block */
    if (pos) {
      var mscore = IK_DATA.calcMatch(c, pos);
      var mb = document.createElement('div');
      mb.className = 'ik-candidate__match ' + matchClass(mscore);
      mb.setAttribute('data-ik-match-block', '1');
      var mn = document.createElement('span');
      mn.className = 'ik-candidate__match-num';
      mn.textContent = mscore + '%';
      mb.appendChild(mn);
      var ml = document.createElement('span');
      ml.className = 'ik-candidate__match-label';
      ml.textContent = 'eşleşme';
      mb.appendChild(ml);
      row.appendChild(mb);
    }

    header.appendChild(row);
    return header;
  }

  function renderTabNav() {
    var nav = document.createElement('nav');
    nav.className = 'ik-candidate__tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Aday detay sekmeleri');

    TABS.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ik-candidate__tab' + (state.activeTab === t.key ? ' is-active' : '');
      btn.setAttribute('data-tab', t.key);
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', state.activeTab === t.key ? 'true' : 'false');
      btn.textContent = t.label;
      nav.appendChild(btn);
    });
    return nav;
  }

  function renderTabContent() {
    var wrap = document.createElement('div');
    wrap.className = 'ik-tab-content is-active';
    wrap.setAttribute('data-tab-content', state.activeTab);

    if (state.activeTab === 'profile')   wrap.appendChild(renderProfileTab());
    else if (state.activeTab === 'notes')     wrap.appendChild(renderNotesTab());
    else if (state.activeTab === 'messages')  wrap.appendChild(renderMessagesTab());
    else if (state.activeTab === 'breakdown') wrap.appendChild(renderBreakdownTab());

    return wrap;
  }

  function renderProfileTab() {
    var frag = document.createDocumentFragment();
    var c = state.candidate;

    /* Section: Temel bilgiler */
    var sec1 = document.createElement('div');
    sec1.className = 'ik-candidate-section';
    var t1 = document.createElement('h2');
    t1.className = 'ik-candidate-section__title';
    t1.textContent = 'Temel bilgiler';
    sec1.appendChild(t1);
    var grid1 = document.createElement('div');
    grid1.className = 'ik-candidate-section__grid';

    var deneyimYilProfil = IK_DATA.getDeneyimYil(c);
    var basicFields = [
      ['Pozisyon', c.son_pozisyon],
      ['Deneyim', deneyimYilProfil > 0 ? deneyimYilProfil + ' yıl' : '—'],
      ['Eğitim', c.egitim_seviye || '—'],
      ['Doğum yılı', c.dogum_yili || '—'],
      ['Müsaitlik', c.musaitlik || '—'],
      ['Çalışma tipi', c.calisma_tipi || '—']
    ];
    basicFields.forEach(function (f) {
      grid1.appendChild(renderField(f[0], f[1]));
    });
    sec1.appendChild(grid1);
    frag.appendChild(sec1);

    /* Section: Lokasyon */
    var sec2 = document.createElement('div');
    sec2.className = 'ik-candidate-section';
    var t2 = document.createElement('h2');
    t2.className = 'ik-candidate-section__title';
    t2.textContent = 'Lokasyon';
    sec2.appendChild(t2);
    var grid2 = document.createElement('div');
    grid2.className = 'ik-candidate-section__grid';
    grid2.appendChild(renderField('Şehir', c.adres_il));
    sec2.appendChild(grid2);
    frag.appendChild(sec2);

    /* Section: Marka deneyimi */
    var sec3 = document.createElement('div');
    sec3.className = 'ik-candidate-section';
    var t3 = document.createElement('h2');
    t3.className = 'ik-candidate-section__title';
    t3.textContent = 'Marka deneyimi';
    sec3.appendChild(t3);
    if (c.markalar && c.markalar.length) {
      var tags = document.createElement('div');
      tags.className = 'ik-candidate-tags';
      c.markalar.forEach(function (m) {
        var tag = document.createElement('span');
        tag.className = 'ik-candidate-tag';
        tag.textContent = m;
        tags.appendChild(tag);
      });
      sec3.appendChild(tags);
    } else {
      var empty = document.createElement('p');
      empty.className = 'ik-candidate-field__value ik-candidate-field__value--muted';
      empty.textContent = 'Marka bilgisi paylaşılmamış.';
      sec3.appendChild(empty);
    }
    frag.appendChild(sec3);

    /* Section: Segment */
    var sec4 = document.createElement('div');
    sec4.className = 'ik-candidate-section';
    var t4 = document.createElement('h2');
    t4.className = 'ik-candidate-section__title';
    t4.textContent = 'Segment ve odak';
    sec4.appendChild(t4);
    var grid4 = document.createElement('div');
    grid4.className = 'ik-candidate-section__grid';
    grid4.appendChild(renderField('Segment', segmentLabel(c.segment)));
    grid4.appendChild(renderField('Aktif', c.is_active === false ? 'Hayır' : 'Evet'));
    sec4.appendChild(grid4);
    frag.appendChild(sec4);

    return frag;
  }

  function renderField(label, value) {
    var f = document.createElement('div');
    f.className = 'ik-candidate-field';
    var l = document.createElement('span');
    l.className = 'ik-candidate-field__label';
    l.textContent = label;
    f.appendChild(l);
    var v = document.createElement('span');
    var hasVal = value != null && value !== '';
    v.className = 'ik-candidate-field__value' + (hasVal ? '' : ' ik-candidate-field__value--muted');
    v.textContent = hasVal ? String(value) : '—';
    f.appendChild(v);
    return f;
  }

  function renderNotesTab() {
    var frag = document.createDocumentFragment();

    /* Form */
    var form = document.createElement('div');
    form.className = 'ik-notes-form';
    var ta = document.createElement('textarea');
    ta.className = 'ik-notes-form__input';
    ta.setAttribute('data-ik-notes-input', '');
    ta.setAttribute('placeholder', 'Aday hakkında not ekle (mülakat izlenimi, takip notu...)');
    ta.setAttribute('aria-label', 'Yeni not');
    form.appendChild(ta);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ik-notes-form__btn';
    btn.setAttribute('data-ik-notes-add', '');
    btn.textContent = 'Not ekle';
    btn.disabled = true;
    form.appendChild(btn);
    frag.appendChild(form);

    /* List */
    if (!state.notes || state.notes.length === 0) {
      var em = document.createElement('div');
      em.className = 'ik-notes-empty';
      em.textContent = 'Henüz not yok. İlk notunu ekleyerek başla.';
      frag.appendChild(em);
    } else {
      var ul = document.createElement('ul');
      ul.className = 'ik-notes-list';
      state.notes.forEach(function (n) {
        var li = document.createElement('li');
        li.className = 'ik-note';
        li.setAttribute('data-ik-note-id', n.id);

        var head = document.createElement('div');
        head.className = 'ik-note__head';
        var date = document.createElement('span');
        date.className = 'ik-note__date';
        date.textContent = fmtDate(n.created_at);
        head.appendChild(date);
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'ik-note__delete';
        del.setAttribute('data-ik-note-delete', n.id);
        del.setAttribute('aria-label', 'Notu sil');
        del.textContent = 'Sil';
        head.appendChild(del);
        li.appendChild(head);

        var body = document.createElement('p');
        body.className = 'ik-note__body';
        body.textContent = n.body;
        li.appendChild(body);

        ul.appendChild(li);
      });
      frag.appendChild(ul);
    }

    return frag;
  }

  function renderMessagesTab() {
    var w = document.createElement('div');
    w.className = 'ik-messages-placeholder';

    var ic = document.createElement('div');
    ic.className = 'ik-messages-placeholder__icon';
    var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('viewBox', '0 0 24 24');
    sv.setAttribute('fill', 'none');
    sv.setAttribute('stroke', 'currentColor');
    sv.setAttribute('stroke-width', '1.6');
    sv.setAttribute('stroke-linecap', 'round');
    sv.setAttribute('stroke-linejoin', 'round');
    var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p1.setAttribute('d', 'M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z');
    sv.appendChild(p1);
    var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    p2.setAttribute('points', '22,6 12,13 2,6');
    sv.appendChild(p2);
    ic.appendChild(sv);
    w.appendChild(ic);

    var t = document.createElement('h3');
    t.className = 'ik-messages-placeholder__title';
    t.textContent = 'Mesajlaşmayı buradan başlat';
    w.appendChild(t);
    var d = document.createElement('p');
    d.className = 'ik-messages-placeholder__desc';
    d.textContent = 'Mesajlar segmentinde aday ile yazışmaya başlayabilir, geçmiş konuşmaları aynı yerde takip edebilirsin.';
    w.appendChild(d);

    var cta = document.createElement('a');
    cta.className = 'ik-messages-placeholder__cta';
    cta.href = 'hr-messages.html?aday=' + encodeURIComponent(state.candidate.id);
    cta.textContent = 'Mesaj yaz';
    w.appendChild(cta);

    return w;
  }

  function renderBreakdownTab() {
    var frag = document.createDocumentFragment();

    if (!state.activePosition) {
      var p = document.createElement('p');
      p.className = 'ik-candidate-field__value ik-candidate-field__value--muted';
      p.textContent = 'Aktif pozisyon seçili değil. Pipeline ekranından bir pozisyon seç.';
      frag.appendChild(p);
      return frag;
    }

    var brk = computeBreakdown(state.candidate, state.activePosition);
    if (!brk) {
      var p2 = document.createElement('p');
      p2.className = 'ik-candidate-field__value ik-candidate-field__value--muted';
      p2.textContent = 'Hesaplanamadı.';
      frag.appendChild(p2);
      return frag;
    }

    /* Section title */
    var st = document.createElement('h2');
    st.className = 'ik-candidate-section__title';
    st.textContent = 'Pozisyon: ' + state.activePosition.title;
    frag.appendChild(st);

    var wrap = document.createElement('div');
    wrap.className = 'ik-match-breakdown';
    brk.rows.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'ik-match-row';

      var lbl = document.createElement('div');
      lbl.className = 'ik-match-row__label';
      lbl.textContent = r.label;
      row.appendChild(lbl);

      var bar = document.createElement('div');
      bar.className = 'ik-match-row__bar';
      var fill = document.createElement('div');
      var pct = r.max ? Math.round((r.value / r.max) * 100) : 0;
      var fillClass = pct >= 70 ? 'ik-match-row__bar-fill--strong'
                    : pct >= 40 ? 'ik-match-row__bar-fill--mid'
                    : 'ik-match-row__bar-fill--low';
      fill.className = 'ik-match-row__bar-fill ' + fillClass;
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      row.appendChild(bar);

      var val = document.createElement('div');
      val.className = 'ik-match-row__value';
      val.textContent = r.value + '/' + r.max;
      row.appendChild(val);

      wrap.appendChild(row);
    });
    frag.appendChild(wrap);

    /* match_reasons — raw shape'te yok; Pool/Pipeline RPC panellerinde render edilir (A16) */

    /* Summary */
    var sum = document.createElement('div');
    sum.className = 'ik-match-summary';
    var lbl = document.createElement('span');
    lbl.className = 'ik-match-summary__label';
    lbl.textContent = 'Toplam eşleşme';
    sum.appendChild(lbl);
    var val = document.createElement('span');
    val.className = 'ik-match-summary__value';
    val.textContent = brk.total + '%';
    sum.appendChild(val);
    var hint = document.createElement('p');
    hint.className = 'ik-match-summary__hint';
    if (brk.total >= 70) hint.textContent = 'Güçlü eşleşme. Mülakat aşamasına yönlendirebilirsin.';
    else if (brk.total >= 40) hint.textContent = 'Orta düzey eşleşme. Detayları gözden geçir.';
    else hint.textContent = 'Düşük eşleşme. Daha uygun adaylara öncelik ver.';
    sum.appendChild(hint);
    frag.appendChild(sum);

    return frag;
  }

  function renderCTA() {
    var bar = document.createElement('div');
    bar.className = 'ik-candidate__cta';

    var ghost = document.createElement('a');
    ghost.className = 'ik-candidate__cta-btn ik-candidate__cta-btn--ghost';
    ghost.setAttribute('data-cta-msg', '');
    ghost.href = 'hr-messages.html?aday=' + encodeURIComponent(state.candidate.id);
    var gs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    gs.setAttribute('viewBox', '0 0 24 24');
    gs.setAttribute('fill', 'none');
    gs.setAttribute('stroke', 'currentColor');
    gs.setAttribute('stroke-width', '2');
    gs.setAttribute('stroke-linecap', 'round');
    gs.setAttribute('stroke-linejoin', 'round');
    var gp1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    gp1.setAttribute('d', 'M4 6h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z');
    gs.appendChild(gp1);
    var gp2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    gp2.setAttribute('points', '22,6 12,13 2,6');
    gs.appendChild(gp2);
    ghost.appendChild(gs);
    var gt = document.createElement('span');
    gt.textContent = 'Mesaj yaz';
    ghost.appendChild(gt);
    bar.appendChild(ghost);

    var primary = document.createElement('button');
    primary.type = 'button';
    primary.className = 'ik-candidate__cta-btn ik-candidate__cta-btn--primary';
    primary.setAttribute('data-cta-add', '');
    var ps = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ps.setAttribute('viewBox', '0 0 24 24');
    ps.setAttribute('fill', 'none');
    ps.setAttribute('stroke', 'currentColor');
    ps.setAttribute('stroke-width', '2.4');
    ps.setAttribute('stroke-linecap', 'round');
    ps.setAttribute('stroke-linejoin', 'round');
    var pl1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    pl1.setAttribute('x1', '12'); pl1.setAttribute('y1', '5');
    pl1.setAttribute('x2', '12'); pl1.setAttribute('y2', '19');
    var pl2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    pl2.setAttribute('x1', '5');  pl2.setAttribute('y1', '12');
    pl2.setAttribute('x2', '19'); pl2.setAttribute('y2', '12');
    ps.appendChild(pl1);
    ps.appendChild(pl2);
    primary.appendChild(ps);
    var pt = document.createElement('span');
    pt.textContent = 'Pipeline\'a ekle';
    primary.appendChild(pt);
    bar.appendChild(primary);

    return bar;
  }

  /* ═══════ Tab switch ═══════ */
  function switchTab(key) {
    state.activeTab = key;
    /* tab nav active state */
    $$('.ik-candidate__tab', dom.shell).forEach(function (b) {
      var k = b.getAttribute('data-tab');
      b.classList.toggle('is-active', k === key);
      b.setAttribute('aria-selected', k === key ? 'true' : 'false');
    });
    /* panel re-render */
    var panel = $('[data-tab-panel]', dom.shell);
    if (panel) {
      clearChildren(panel);
      panel.appendChild(renderTabContent());
    }
  }

  /* ═══════ Events ═══════ */
  function bindShellEvents() {
    if (!dom.shell) return;

    /* Tab clicks */
    dom.shell.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (tab) {
        e.preventDefault();
        var k = tab.getAttribute('data-tab');
        if (k && k !== state.activeTab) switchTab(k);
        return;
      }

      /* Notes add */
      if (e.target.closest('[data-ik-notes-add]')) {
        var ta = $('[data-ik-notes-input]', dom.shell);
        if (!ta) return;
        var body = (ta.value || '').trim();
        if (!body) return;
        IK_DATA.addNote(state.candidate.id, body).then(function () {
          ta.value = '';
          var btn = $('[data-ik-notes-add]', dom.shell);
          if (btn) btn.disabled = true;
          return IK_DATA.getNotes(state.candidate.id);
        }).then(function (notes) {
          state.notes = notes || [];
          if (state.activeTab === 'notes') switchTab('notes');
          showToast('Not eklendi', 'success');
        });
        return;
      }

      /* Notes delete */
      var del = e.target.closest('[data-ik-note-delete]');
      if (del) {
        var nid = del.getAttribute('data-ik-note-delete');
        IK_DATA.deleteNote(state.candidate.id, nid).then(function () {
          return IK_DATA.getNotes(state.candidate.id);
        }).then(function (notes) {
          state.notes = notes || [];
          if (state.activeTab === 'notes') switchTab('notes');
          showToast('Not silindi', 'success');
        });
        return;
      }

      /* CTA primary — pipeline'a ekle */
      if (e.target.closest('[data-cta-add]')) {
        var posId = (window.IK_SHELL && IK_SHELL.getActivePositionId)
          ? IK_SHELL.getActivePositionId() : null;
        if (!posId) {
          showToast('Önce pipeline\'da bir pozisyon seç', 'error');
          return;
        }
        IK_DATA.addToPipeline(state.candidate.id, posId).then(function (res) {
          if (res.duplicate) showToast('Aday zaten pipeline\'da', 'error');
          else showToast('Pipeline\'a eklendi', 'success');
        });
        return;
      }
    });

    /* Notes input live state */
    dom.shell.addEventListener('input', function (e) {
      var ta = e.target.closest('[data-ik-notes-input]');
      if (!ta) return;
      var btn = $('[data-ik-notes-add]', dom.shell);
      if (btn) btn.disabled = !(ta.value || '').trim();
    });

    /* Keyboard tab nav */
    dom.shell.addEventListener('keydown', function (e) {
      var tab = e.target.closest('[data-tab]');
      if (!tab) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var idx = TABS.findIndex(function (t) { return t.key === state.activeTab; });
      if (idx < 0) return;
      var next = e.key === 'ArrowRight' ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
      switchTab(TABS[next].key);
      var nb = dom.shell.querySelector('[data-tab="' + TABS[next].key + '"]');
      if (nb) nb.focus();
    });
  }

  /* ═══════ Init ═══════ */
  function init() {
    cacheDom();
    var id = getQueryId();
    if (!id) {
      console.error('ik-candidate: id parametresi eksik, panel yüklenemiyor.');
      return;
    }

    Promise.all([
      IK_DATA.getCandidate(id),
      IK_DATA.getPositions(),
      IK_DATA.getNotes(id)
    ]).then(function (results) {
      var c = results[0];
      var positions = results[1] || [];
      state.notes = results[2] || [];

      if (!c) {
        render404(id);
        return;
      }
      state.candidate = c;

      var posId = (window.IK_SHELL && IK_SHELL.getActivePositionId)
        ? IK_SHELL.getActivePositionId() : null;
      if (!posId && positions.length) {
        posId = positions[0].id;
      }
      state.activePosition = positions.find(function (p) { return p.id === posId; }) || null;

      renderShell();
    }).catch(function (e) {
      console.warn('[ik-candidate] load fail:', e && e.message);
      render404(id);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
