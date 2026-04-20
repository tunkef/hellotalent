/* global normalizeCVData, monthIndexToName */
// ═══════════════════════════════════════════════════
// profil-cv-preview.js — Live HTML CV Preview (K-066)
// Tuna CV pattern: serif B&W, avatar sağ üst, section hairline
// divider, "by hellotalent" italic footer.
// DOM builder pattern (innerHTML yasak — security hook bloklar).
// Exports (window): renderCVPreview, updateCVPreview, _schedulePreviewUpdate
// Depends on: normalizeCVData (profil-cv.js), monthIndexToName (profil-ui.js)
// ═══════════════════════════════════════════════════

(function() {
  var _pendingTimer = null;
  var DEBOUNCE_MS = 150;

  /* ── DOM builder helpers ──────────────────────────── */
  function _el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null && text !== '') node.appendChild(document.createTextNode(String(text)));
    return node;
  }

  function _empty(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function _monthName(m) {
    return (typeof window.monthIndexToName === 'function')
      ? (window.monthIndexToName(m) || '')
      : '';
  }

  function _fmtDate(e) {
    if (!e || !e.baslangic_yil) return '';
    var start = (_monthName(e.baslangic_ay) + ' ' + e.baslangic_yil).trim();
    var end;
    if (e.devam_ediyor) {
      end = 'Devam';
    } else if (e.bitis_yil) {
      end = (_monthName(e.bitis_ay) + ' ' + e.bitis_yil).trim();
    } else {
      end = '';
    }
    return end ? (start + ' \u2013 ' + end) : start;
  }

  /* ── Section helpers ──────────────────────────────── */
  function _section(titleText) {
    var sec = _el('section', 'cv-section');
    sec.appendChild(_el('h2', 'cv-section-title', titleText));
    return sec;
  }

  /* ── Header (isim + iletişim + avatar) ────────────── */
  function _renderHeader(d, root) {
    var hdr = _el('div', 'cv-header');
    if (!d.avatarUrl) hdr.classList.add('no-avatar');

    var text = _el('div', 'cv-header-text');
    text.appendChild(_el('h1', 'cv-name', d.isim || 'Ad\u0131n\u0131z Soyad\u0131n\u0131z'));
    if (d.targetRole) text.appendChild(_el('div', 'cv-role', d.targetRole));

    var contactBox = _el('div', 'cv-contact');
    var line1Parts = [];
    if (d.city) line1Parts.push(d.city);
    if (d.tel) line1Parts.push(d.tel);
    if (line1Parts.length) {
      contactBox.appendChild(_el('span', 'cv-contact-line', line1Parts.join('  |  ')));
    }
    var line2Parts = [];
    if (d.email) line2Parts.push(d.email);
    if (d.linkedin) line2Parts.push(d.linkedin);
    if (line2Parts.length) {
      contactBox.appendChild(_el('span', 'cv-contact-line', line2Parts.join('  |  ')));
    }
    text.appendChild(contactBox);

    // Diller header'da (Tuna CV pattern)
    if (d.languages && d.languages.length > 0) {
      var langs = d.languages
        .filter(function(l) { return l && l.dil; })
        .map(function(l) { return l.dil + (l.seviye ? ': ' + l.seviye : ''); })
        .join('    ');
      if (langs) {
        var langLine = _el('div', 'cv-langs');
        langLine.appendChild(document.createTextNode(langs));
        text.appendChild(langLine);
      }
    }

    hdr.appendChild(text);

    if (d.avatarUrl) {
      var img = document.createElement('img');
      img.className = 'cv-avatar';
      img.alt = d.isim || '';
      img.src = d.avatarUrl;
      img.onerror = function() { img.style.display = 'none'; };
      hdr.appendChild(img);
    }

    root.appendChild(hdr);
  }

  /* ── Professional Summary ─────────────────────────── */
  function _renderSummary(d, root) {
    if (!d.summary) return;
    var sec = _section('Profesyonel \u00d6zet');
    sec.appendChild(_el('p', 'cv-summary', d.summary));
    root.appendChild(sec);
  }

  /* ── Core Skills — role-based taxonomy (K-066) ────────
     Rol ailelerinden ROLE_SKILLS_MAP'e giderek gerçek yetkinlik
     listesi oluştur. Pozisyon adı yetkinlik DEĞİLDİR. */
  function _renderSkills(d, root) {
    var roleSkillsMap = (typeof window.ROLE_SKILLS_MAP !== 'undefined') ? window.ROLE_SKILLS_MAP : {};
    var leadershipSkills = (typeof window.LEADERSHIP_SKILLS !== 'undefined') ? window.LEADERSHIP_SKILLS : [];

    // Rol aileleri unique topla
    var families = [];
    (d.experiences || []).forEach(function(e) {
      if (e && e.rol_ailesi && families.indexOf(e.rol_ailesi) === -1) {
        families.push(e.rol_ailesi);
      }
    });

    var categories = [];
    families.forEach(function(fam) {
      var skills = roleSkillsMap[fam];
      if (skills && skills.length > 0) {
        categories.push({ cat: fam, items: skills.slice(0, 6) });
      }
    });

    // Liderlik — 3+ yıl veya "müdür/sorumlu" unvanı varsa ekle
    var hasLeadership = (d.experiences || []).some(function(e) {
      if (!e) return false;
      var role = (e.pozisyon || e.rol_unvani || '').toLowerCase();
      return /m\u00fcd\u00fcr|sorumlu|lider|direkt\u00f6r|supervisor|manager/.test(role);
    });
    if (hasLeadership && leadershipSkills.length > 0) {
      categories.push({ cat: 'Liderlik', items: leadershipSkills.slice(0, 5) });
    }

    // Sektörel ilgi alanları (brand_interests) — ayrı satır
    if (d.brandInterests && d.brandInterests.length > 0) {
      categories.push({ cat: 'Sekt\u00f6r \u0130lgisi', items: d.brandInterests.slice(0, 6) });
    }

    if (!categories.length) return;

    var sec = _section('Yetkinlikler');
    var list = _el('ul', 'cv-skills-list');
    categories.forEach(function(c) {
      var li = _el('li', 'cv-skill-row');
      var catSpan = _el('span', 'cv-skill-cat', c.cat + ': ');
      li.appendChild(catSpan);
      li.appendChild(document.createTextNode(c.items.join(', ') + '.'));
      list.appendChild(li);
    });
    sec.appendChild(list);
    root.appendChild(sec);
  }

  /* ── Professional Experience ──────────────────────── */
  function _renderExperiences(d, root) {
    if (!d.experiences || !d.experiences.length) return;
    var sec = _section('Profesyonel Deneyim');

    d.experiences.forEach(function(e) {
      if (!e) return;
      var item = _el('div', 'cv-experience-item');

      // Headline: COMPANY (sol) + tarih (sağ)
      var headline = _el('div', 'cv-exp-headline');
      var companyLabel = (e.marka || e.sirket || '').toString();
      headline.appendChild(_el('span', 'cv-exp-company', companyLabel || '\u015eirket'));
      var dateStr = _fmtDate(e);
      if (dateStr) headline.appendChild(_el('span', 'cv-exp-date', dateStr));
      item.appendChild(headline);

      // Role line: "Pozisyon | Şehir"
      var roleLineParts = [];
      if (e.pozisyon) roleLineParts.push(e.pozisyon);
      if (e.sehir) roleLineParts.push(e.sehir);
      if (roleLineParts.length) {
        item.appendChild(_el('div', 'cv-exp-role', roleLineParts.join('  |  ')));
      }

      // Bullets (basari_ozeti / description sentence-split)
      var summaryText = e.basari_ozeti || e.description || '';
      if (summaryText) {
        var bulletsUl = _el('ul', 'cv-exp-bullets');
        var sentences = summaryText
          .split(/(?<=[.!?])\s+/)
          .filter(function(s) { return s.trim().length > 0; })
          .slice(0, 5);
        if (sentences.length > 0) {
          sentences.forEach(function(s) {
            bulletsUl.appendChild(_el('li', null, s.trim()));
          });
        } else {
          bulletsUl.appendChild(_el('li', null, summaryText));
        }
        item.appendChild(bulletsUl);
      }

      sec.appendChild(item);
    });

    root.appendChild(sec);
  }

  /* ── Education ────────────────────────────────────── */
  function _renderEducation(d, root) {
    if (!d.education || !d.education.length) return;
    var sec = _section('E\u011fitim');

    d.education.forEach(function(e) {
      if (!e) return;
      var item = _el('div', 'cv-education-item');
      var headline = _el('div', 'cv-edu-headline');
      headline.appendChild(_el('span', 'cv-edu-school', (e.okul || 'Okul').toString()));
      var rightParts = [];
      if (e.egitim_seviye) rightParts.push(e.egitim_seviye);
      if (e.mezun_yil) rightParts.push(String(e.mezun_yil));
      if (rightParts.length) headline.appendChild(_el('span', 'cv-edu-date', rightParts.join(', ')));
      item.appendChild(headline);
      if (e.bolum) item.appendChild(_el('div', 'cv-edu-degree', e.bolum));
      sec.appendChild(item);
    });

    root.appendChild(sec);
  }

  /* ── Certificates ─────────────────────────────────── */
  function _renderCertificates(d, root) {
    if (!d.certificates || !d.certificates.length) return;
    var sec = _section('Sertifikalar');

    d.certificates.forEach(function(c) {
      if (!c) return;
      var item = _el('div', 'cv-cert-item');
      var headline = _el('div', 'cv-cert-headline');
      headline.appendChild(_el('span', 'cv-cert-name', (c.egitim_adi || '').toString()));
      if (c.yil) headline.appendChild(_el('span', 'cv-cert-date', String(c.yil)));
      item.appendChild(headline);
      if (c.kurum) item.appendChild(_el('div', 'cv-cert-inst', c.kurum));
      sec.appendChild(item);
    });

    root.appendChild(sec);
  }

  /* ── References + Footer ──────────────────────────── */
  function _renderFooter(root) {
    root.appendChild(_el('div', 'cv-refs', 'Referanslar talep \u00fczerine sunulur.'));
    root.appendChild(_el('div', 'cv-footer', 'by hellotalent'));
  }

  /* ── Public: renderCVPreview(data) → DOM element ──── */
  function renderCVPreview(d) {
    d = d || {};
    var root = _el('article', 'cv-preview');
    _renderHeader(d, root);
    _renderSummary(d, root);
    _renderSkills(d, root);
    _renderExperiences(d, root);
    _renderEducation(d, root);
    _renderCertificates(d, root);
    _renderFooter(root);
    return root;
  }

  /* ── Public: updateCVPreview() ───────────────────── */
  function updateCVPreview() {
    var target = document.getElementById('cv-preview-root');
    if (!target) return;
    if (typeof window.normalizeCVData !== 'function') return;
    var data;
    try {
      data = window.normalizeCVData();
    } catch (err) {
      console.warn('[HT] CV preview normalize error:', err && err.message);
      return;
    }
    _empty(target);
    target.appendChild(renderCVPreview(data));
  }

  /* ── Public: _schedulePreviewUpdate() ─────────────── */
  function schedulePreviewUpdate() {
    if (_pendingTimer) clearTimeout(_pendingTimer);
    _pendingTimer = setTimeout(function() {
      _pendingTimer = null;
      updateCVPreview();
    }, DEBOUNCE_MS);
  }

  window.renderCVPreview = renderCVPreview;
  window.updateCVPreview = updateCVPreview;
  window._schedulePreviewUpdate = schedulePreviewUpdate;
})();
