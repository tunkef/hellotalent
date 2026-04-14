/* global _loadedDBData, calculateCompletion, CAREER_TYPE_LABELS, currentUser, val */
// ═══════════════════════════════════════════════════
// profil-preview.js — K032 Profil Önizleme drawer
// Editorial redesign: cream body, navy spine, mono labels,
// show-more clamp pattern (Tuna approved 2026-04-14).
// Exports: window.openProfilePreview, window.closeProfilePreview
// Markup source of truth:
//   docs/superpowers/specs/2026-04-14-profil-preview-mockup.html
// Depends on: _loadedDBData + currentUser (profil-core.js),
//             window.HT.signStorageUrl (profil-core.js),
//             calculateCompletion (profil-ui.js),
//             CAREER_TYPE_LABELS (profil-ui.js),
//             val helper (profil-ui.js)
// Rule: user data NEVER via innerHTML. Only static SVG strings
//       touch innerHTML, always on elements this file owns.
// ═══════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Static SVG snippets (owned elements only) ──
  var SVG_MAIL  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>';
  var SVG_PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>';
  var SVG_DOC   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>';
  var SVG_CHEV  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  var SVG_RING  = '<svg viewBox="0 0 56 56"><circle class="track" cx="28" cy="28" r="24" fill="none" stroke-width="2.5"/><circle class="fill" cx="28" cy="28" r="24" fill="none" stroke-width="2.5"/></svg>';

  // ── DOM helpers ──
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function label(text) { return el('div', 'pp-label', text); }
  function hr(cls) {
    var h = document.createElement('hr');
    h.className = 'pp-rule ' + cls;
    return h;
  }

  // Maskeleme helpers (showPersonalInfo=false)
  function maskName() { return '\u25CF\u25CF\u25CF\u25CF\u25CF \u25CF\u25CF\u25CF\u25CF\u25CF\u25CF'; }
  function maskDot() { return '\u25CF\u25CF\u25CF\u25CF\u25CF'; }
  function maskEmail(e) {
    if (!e) return '';
    var p = e.split('@');
    if (p.length !== 2) return '';
    return p[0].charAt(0) + '****@' + p[1];
  }
  function maskPhone(phone) {
    if (!phone || phone.length < 6) return '';
    return phone.substring(0, 3) + ' *** ** ' + phone.substring(phone.length - 2);
  }

  function initialsOf(name) {
    if (!name) return '?';
    return name.split(/\s+/).map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase() || '?';
  }

  function trMonth(n) {
    var m = parseInt(n, 10);
    if (!m || m < 1 || m > 12) return '';
    var names = ['Oca','\u015Eub','Mar','Nis','May','Haz','Tem','A\u011Fu','Eyl','Eki','Kas','Ara'];
    return names[m - 1];
  }

  function expPeriod(e) {
    if (!e.baslangic_yil) return '';
    var s = (e.baslangic_ay ? trMonth(e.baslangic_ay) + ' ' : '') + e.baslangic_yil;
    if (e.devam_ediyor) return s + ' \u2014 Devam';
    if (e.bitis_yil) return s + ' \u2014 ' + (e.bitis_ay ? trMonth(e.bitis_ay) + ' ' : '') + e.bitis_yil;
    return s;
  }

  // ── Show-more toggle wiring ──
  function wireToggles(root) {
    var toggles = root.querySelectorAll('.pp-toggle');
    for (var i = 0; i < toggles.length; i++) {
      (function(btn) {
        // find the clamp target: previous element sibling with .pp-clamp
        var target = btn.previousElementSibling;
        while (target && !(target.classList && target.classList.contains('pp-clamp'))) {
          target = target.previousElementSibling;
        }
        if (!target) { btn.classList.add('is-hidden'); return; }

        // Auto-hide when content does not overflow (mockup rule: scrollHeight <= clientHeight + 2)
        if (target.scrollHeight <= target.clientHeight + 2) {
          btn.classList.add('is-hidden');
          return;
        }

        btn.addEventListener('click', function() {
          var expanded = target.classList.toggle('is-expanded');
          btn.classList.toggle('is-expanded', expanded);
          btn.textContent = expanded ? 'Daha az g\u00F6ster' : 'Devam\u0131n\u0131 oku';
        });
      })(toggles[i]);
    }
  }

  // ── Section builders ──
  async function buildIdentity(p, exps, showPersonalInfo, showAktifBadge) {
    var wrap = el('section', 'pp-identity');

    var avatar = el('div', 'pp-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    var signed = (showPersonalInfo && p.avatar_url) ? await window.HT.signStorageUrl(p.avatar_url) : '';
    if (signed) {
      var img = document.createElement('img');
      img.src = signed;
      img.alt = '';
      avatar.appendChild(img);
    } else {
      avatar.textContent = showPersonalInfo ? initialsOf(p.full_name) : '?';
    }
    wrap.appendChild(avatar);

    var block = el('div', 'pp-ident__block');

    var top = el('div', 'pp-ident__top');
    var textCol = el('div', 'pp-ident__text');

    var nameEl = el('h1', 'pp-ident__name', showPersonalInfo ? (p.full_name || '\u2014') : maskName());
    textCol.appendChild(nameEl);

    // Role line: current role em + brand/company + city + years
    var role = el('p', 'pp-ident__role');
    var currentRole = '';
    var currentCompany = '';
    if (exps.length > 0) {
      var latest = exps[0];
      currentRole = latest.pozisyon || '';
      var b = latest.marka || '';
      var c = latest.sirket_adi || '';
      currentCompany = (b && c && b !== c) ? (b + ' (' + c + ')') : (b || c);
    }
    if (currentRole) {
      var em = el('em', null, currentRole);
      role.appendChild(em);
    }
    function addDotChunk(text) {
      if (!text) return;
      var dot = el('span', 'dot', '\u00B7');
      role.appendChild(document.createTextNode(' '));
      role.appendChild(dot);
      role.appendChild(document.createTextNode(' ' + text));
    }
    if (currentCompany) addDotChunk(showPersonalInfo ? currentCompany : maskDot());
    if (showPersonalInfo && p.adres_il) addDotChunk(p.adres_il);

    var totalYears = 0;
    if (showPersonalInfo) {
      exps.forEach(function(e) {
        var sy = parseInt(e.baslangic_yil, 10) || 0;
        var ey = e.devam_ediyor ? new Date().getFullYear() : (parseInt(e.bitis_yil, 10) || sy);
        totalYears += Math.max(0, ey - sy);
      });
    }
    if (totalYears > 0) addDotChunk(totalYears + ' y\u0131l deneyim');
    textCol.appendChild(role);

    if (showAktifBadge) {
      var status = el('div', 'pp-ident__status', 'Aktif i\u015F ar\u0131yor');
      textCol.appendChild(status);
    }

    top.appendChild(textCol);

    // Pulse ring
    var pct = typeof calculateCompletion === 'function' ? calculateCompletion() : 0;
    var pulse = el('div', 'pp-pulse');
    pulse.setAttribute('aria-label', 'Profil tamamlanma ' + pct + ' / 100');
    var ring = el('div', 'pp-pulse__ring');
    ring.innerHTML = SVG_RING; // static, owned
    var fill = ring.querySelector('circle.fill');
    if (fill) {
      var dashoff = 150.8 * (1 - (pct / 100));
      fill.style.strokeDashoffset = String(dashoff);
    }
    var pctEl = el('div', 'pp-pulse__pct', pct);
    ring.appendChild(pctEl);
    pulse.appendChild(ring);
    var cap = el('div', 'pp-pulse__cap', '/ 100');
    pulse.appendChild(cap);
    top.appendChild(pulse);

    block.appendChild(top);

    // Contact row
    var email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '';
    var phone = p.telefon || '';
    if (email || phone) {
      var contact = el('div', 'pp-contact');
      if (email) {
        var s1 = document.createElement('span');
        var i1 = document.createElement('span');
        i1.innerHTML = SVG_MAIL; // static, owned
        s1.appendChild(i1.firstChild);
        s1.appendChild(document.createTextNode(showPersonalInfo ? email : maskEmail(email)));
        contact.appendChild(s1);
      }
      if (phone) {
        var s2 = document.createElement('span');
        var i2 = document.createElement('span');
        i2.innerHTML = SVG_PHONE;
        s2.appendChild(i2.firstChild);
        s2.appendChild(document.createTextNode(showPersonalInfo ? phone : maskPhone(phone)));
        contact.appendChild(s2);
      }
      block.appendChild(contact);
    }

    // Completion caption
    var compRow = el('div', 'pp-ident__completion');
    var capCopy = pct >= 80
      ? 'G\u00FC\u00E7l\u00FC profil \u2014 i\u015Fverenler taraf\u0131ndan g\u00F6r\u00FClme \u015Fans\u0131n y\u00FCksek.'
      : pct >= 45
        ? '\u0130yi \u2014 birka\u00E7 alan daha tamamla, \u00F6ne \u00E7\u0131k.'
        : 'Profilini tamamla \u2014 i\u015Fverenler seni g\u00F6rs\u00FCn.';
    var capEl = el('div', 'cap', capCopy);
    compRow.appendChild(capEl);
    block.appendChild(compRow);

    wrap.appendChild(block);
    return wrap;
  }

  function buildBio(bioText) {
    var sec = el('section', 'pp-bio');
    sec.appendChild(label('\u00D6zet'));
    if (!bioText) {
      sec.appendChild(el('p', 'pp-empty', 'Hen\u00FCz eklenmedi'));
      return sec;
    }
    var quote = el('p', 'pp-bio__quote pp-clamp pp-clamp--3', bioText);
    sec.appendChild(quote);
    var toggle = el('button', 'pp-toggle', 'Devam\u0131n\u0131 oku');
    toggle.type = 'button';
    toggle.setAttribute('data-pp-toggle', 'bio');
    sec.appendChild(toggle);
    return sec;
  }

  function buildExperience(exps, showPersonalInfo) {
    var sec = el('section', 'pp-experience');
    sec.appendChild(label('Deneyim'));
    var wrap = el('div', 'pp-exp');

    if (exps.length === 0) {
      wrap.appendChild(el('div', 'pp-empty', 'Hen\u00FCz eklenmedi'));
      sec.appendChild(wrap);
      return sec;
    }

    // Top 3 = fully described; remaining = muted
    exps.forEach(function(e, idx) {
      var muted = idx >= 3;
      var item = el('article', 'pp-exp__item' + (muted ? ' pp-exp__item--muted' : '') + (idx === 0 ? ' is-top-gap' : ''));

      var roleEl = el('h3', 'pp-exp__role');
      roleEl.appendChild(document.createTextNode(e.pozisyon || ''));
      var brand = e.marka || '';
      var company = e.sirket_adi || '';
      var display = (brand && company && brand !== company) ? (brand + ' (' + company + ')') : (brand || company);
      var displaySafe = showPersonalInfo ? display : maskDot();
      if (displaySafe) {
        var emCo = el('em', null, ' \u00B7 ' + displaySafe);
        roleEl.appendChild(emCo);
      }
      item.appendChild(roleEl);

      // Meta row
      var metaBits = [];
      if (e.rol_ailesi) metaBits.push(e.rol_ailesi);
      if (!muted && e.istihdam_tipi) metaBits.push(e.istihdam_tipi);
      var period = expPeriod(e);
      if (period) metaBits.push(period);
      if (metaBits.length > 0) {
        var meta = el('div', 'pp-exp__meta');
        metaBits.forEach(function(bit, i) {
          var span = el('span', null, bit);
          meta.appendChild(span);
          if (i < metaBits.length - 1) {
            meta.appendChild(el('span', 'sep', '\u00B7'));
          }
        });
        item.appendChild(meta);
      }

      if (!muted && e.description) {
        var desc = el('p', 'pp-exp__desc pp-clamp pp-clamp--2', e.description);
        item.appendChild(desc);
        var t = el('button', 'pp-toggle', 'Devam\u0131n\u0131 oku');
        t.type = 'button';
        t.setAttribute('data-pp-toggle', 'exp');
        item.appendChild(t);
      }

      wrap.appendChild(item);
    });

    sec.appendChild(wrap);
    return sec;
  }

  function buildEduLang(edus, certs, langs, showPersonalInfo) {
    var sec = el('section', 'pp-edu');
    sec.appendChild(label('E\u011Fitim & Dil'));
    var split = el('div', 'pp-split');

    // Eğitim
    var eduCol = document.createElement('div');
    eduCol.appendChild(el('div', 'pp-split__h', 'E\u011Fitim'));
    var eduList = el('ul', 'pp-split__list');
    var hasEdu = false;
    edus.forEach(function(e) {
      hasEdu = true;
      var li = document.createElement('li');
      var name = showPersonalInfo ? (e.okul_adi || '') : maskDot();
      var subBits = [];
      if (e.seviye) subBits.push(e.seviye);
      if (e.bolum) subBits.push(e.bolum);
      var prefix = name;
      if (subBits.length > 0) prefix += ' \u2014 ' + subBits.join(', ');
      li.appendChild(document.createTextNode(prefix));
      if (e.mezuniyet_yili) {
        var sub = el('span', 'sub', String(e.mezuniyet_yili));
        li.appendChild(sub);
      }
      eduList.appendChild(li);
    });
    certs.forEach(function(c) {
      hasEdu = true;
      var li = document.createElement('li');
      var name = showPersonalInfo ? (c.egitim_adi || '') : maskDot();
      var txt = name + (c.kurum ? ' \u2014 ' + c.kurum : '');
      li.appendChild(document.createTextNode(txt));
      if (c.yil) li.appendChild(el('span', 'sub', String(c.yil)));
      eduList.appendChild(li);
    });
    if (!hasEdu) {
      var empty1 = document.createElement('li');
      empty1.appendChild(document.createTextNode('Hen\u00FCz eklenmedi'));
      eduList.appendChild(empty1);
    }
    eduCol.appendChild(eduList);
    split.appendChild(eduCol);

    // Diller
    var langCol = document.createElement('div');
    langCol.appendChild(el('div', 'pp-split__h', 'Diller'));
    var langList = el('ul', 'pp-split__list');
    if (langs.length === 0) {
      var li0 = document.createElement('li');
      li0.appendChild(document.createTextNode('Hen\u00FCz eklenmedi'));
      langList.appendChild(li0);
    } else {
      langs.forEach(function(l) {
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(l.dil || ''));
        if (l.seviye) li.appendChild(el('span', 'sub', l.seviye));
        langList.appendChild(li);
      });
    }
    langCol.appendChild(langList);
    split.appendChild(langCol);

    sec.appendChild(split);
    return sec;
  }

  function buildPrefs(wp, locs, bi) {
    var sec = el('section', 'pp-prefs');
    sec.appendChild(label('Tercihler & Lokasyon'));
    var kv = el('div', 'pp-kv');

    function row(k, v, emStyle) {
      if (!v) return;
      var r = el('div', 'pp-kv__row');
      r.appendChild(el('div', 'pp-kv__k', k));
      var val = el('div', 'pp-kv__v');
      if (emStyle) {
        val.appendChild(el('em', null, v));
      } else {
        val.textContent = v;
      }
      r.appendChild(val);
      kv.appendChild(r);
    }

    if (wp) {
      if (wp.calisma_tipleri && wp.calisma_tipleri.length > 0) {
        row('\u00C7al\u0131\u015Fma \u015Eekli', wp.calisma_tipleri.join(', '));
      }
      if (wp.musaitlik) row('Ba\u015Flang\u0131\u00E7', wp.musaitlik, true);
      if (wp.career_type) {
        var ctLabel = (typeof CAREER_TYPE_LABELS !== 'undefined' && CAREER_TYPE_LABELS[wp.career_type])
          ? CAREER_TYPE_LABELS[wp.career_type] : wp.career_type;
        row('Pozisyon \u0130htiyac\u0131', ctLabel);
      }
      if (wp.travel_willingness) row('Seyahat', wp.travel_willingness);
      if (wp.shift_flexibility) row('Vardiya', wp.shift_flexibility);
      if (wp.notice_period) row('\u0130hbar S\u00FCresi', wp.notice_period);
      if (wp.tercih_segmentler && wp.tercih_segmentler.length > 0) {
        row('Sevdi\u011Fi Segmentler', wp.tercih_segmentler.join(' \u00B7 '));
      }
    }
    if (locs.length > 0) {
      var cityStr = locs.map(function(l) { return l.sehir; }).filter(Boolean).join(' \u00B7 ');
      row('Lokasyon', cityStr, true);
    }
    if (bi.length > 0) {
      row('Marka Tercihleri', bi.slice(0, 10).join(' \u00B7 '), true);
    }

    if (kv.children.length === 0) {
      sec.appendChild(el('div', 'pp-empty', 'Hen\u00FCz eklenmedi'));
      return sec;
    }
    sec.appendChild(kv);
    return sec;
  }

  function buildCV(p, showPersonalInfo) {
    var sec = el('section', 'pp-cv');
    sec.appendChild(label('\u00D6zge\u00E7mi\u015F'));
    if (!showPersonalInfo) {
      sec.appendChild(el('div', 'pp-empty', 'CV gizli'));
      return sec;
    }
    if (!p.cv_url || !p.cv_filename) {
      sec.appendChild(el('div', 'pp-empty', 'CV y\u00FCklenmemi\u015F'));
      return sec;
    }
    var a = document.createElement('a');
    a.className = 'pp-cv__row';
    a.href = p.cv_url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.addEventListener('click', function(e) { e.stopPropagation(); });

    var icon = el('div', 'pp-cv__icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = SVG_DOC; // static, owned
    a.appendChild(icon);

    var main = el('div', 'pp-cv__main');
    main.appendChild(el('div', 'pp-cv__name', p.cv_filename));
    var dateStr = p.cv_uploaded_at
      ? new Date(p.cv_uploaded_at).toLocaleDateString('tr-TR')
      : new Date().toLocaleDateString('tr-TR');
    main.appendChild(el('div', 'pp-cv__sub', dateStr));
    a.appendChild(main);

    var chev = el('div', 'pp-cv__chev');
    chev.setAttribute('aria-hidden', 'true');
    chev.innerHTML = SVG_CHEV;
    a.appendChild(chev);

    sec.appendChild(a);
    return sec;
  }

  // ── Main ──
  async function openProfilePreview() {
    var db = _loadedDBData;
    if (!db || !db.profile) return;
    var p = db.profile;
    var exps = db.experiences || [];
    var edus = db.education || [];
    var langs = db.languages || [];
    var certs = db.certificates || [];
    var wp = db.work_prefs;
    var locs = db.locations || [];
    var bi = db.brand_interests || [];

    var beniOnerOn = document.getElementById('merkez-toggle-visibility');
    var showPersonalInfo = beniOnerOn ? beniOnerOn.checked : true;
    var aktifToggle = document.getElementById('merkez-toggle-active');
    var showAktifBadge = aktifToggle ? aktifToggle.checked : false;

    var mount = document.getElementById('pp-content');
    if (!mount) return;
    // Clear previous
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    var identity = await buildIdentity(p, exps, showPersonalInfo, showAktifBadge);
    mount.appendChild(identity);
    mount.appendChild(hr('pp-rule--1'));

    var bioText = typeof val === 'function' ? val('f-bio') : '';
    mount.appendChild(buildBio(bioText));
    mount.appendChild(hr('pp-rule--2'));

    mount.appendChild(buildExperience(exps, showPersonalInfo));
    mount.appendChild(hr('pp-rule--3'));

    mount.appendChild(buildEduLang(edus, certs, langs, showPersonalInfo));
    mount.appendChild(hr('pp-rule--4'));

    mount.appendChild(buildPrefs(wp, locs, bi));
    mount.appendChild(hr('pp-rule--5'));

    mount.appendChild(buildCV(p, showPersonalInfo));

    var sign = el('div', 'pp-sign', 'HelloTalent \u00B7 Beta');
    mount.appendChild(sign);

    // Wire show-more toggles AFTER mount (needs layout for scrollHeight check)
    // Use rAF so -webkit-line-clamp has applied before measuring.
    window.requestAnimationFrame(function() { wireToggles(mount); });

    document.getElementById('pp-overlay').classList.add('open');
    document.getElementById('pp-drawer').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeProfilePreview() {
    var ov = document.getElementById('pp-overlay');
    var dr = document.getElementById('pp-drawer');
    if (ov) ov.classList.remove('open');
    if (dr) dr.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ESC closes drawer
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var drawer = document.getElementById('pp-drawer');
      if (drawer && drawer.classList.contains('open')) {
        closeProfilePreview();
      }
    }
  });

  window.openProfilePreview = openProfilePreview;
  window.closeProfilePreview = closeProfilePreview;
})();
