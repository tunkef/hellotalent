/* global normalizeCVData, monthIndexToName */
// ═══════════════════════════════════════════════════
// profil-cv-preview.js — Live HTML CV Preview (K-066)
// Form doldukca sag kolonda deterministic CV template render olur.
// DOM builder pattern (innerHTML yasak — security hook bloklar).
// Kullanim: updateCVPreview() veya _schedulePreviewUpdate() (debounced 150ms)
// Exports (window): renderCVPreview, updateCVPreview, _schedulePreviewUpdate
// Depends on: normalizeCVData (profil-cv.js), monthIndexToName (profil-ui.js)
// ═══════════════════════════════════════════════════

(function() {
  var _pendingTimer = null;
  var DEBOUNCE_MS = 150;

  /* ── DOM builder helpers (innerHTML YASAK) ────────────── */
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
      end = 'Devam ediyor';
    } else if (e.bitis_yil) {
      end = (_monthName(e.bitis_ay) + ' ' + e.bitis_yil).trim();
    } else {
      end = '';
    }
    return end ? (start + ' \u2013 ' + end) : start;
  }

  /* ── Section helpers ─────────────────────────────────── */
  function _sectionWithTitle(titleText) {
    var sec = _el('section', 'cv-section');
    sec.appendChild(_el('h2', 'cv-section-title', titleText));
    return sec;
  }

  function _renderHeader(d, root) {
    var hdr = _el('div', 'cv-header');
    hdr.appendChild(_el('h1', 'cv-name', d.isim || 'Ad\u0131n\u0131z Soyad\u0131n\u0131z'));
    if (d.targetRole) hdr.appendChild(_el('div', 'cv-role', d.targetRole));

    var contactParts = [];
    if (d.tel) contactParts.push(d.tel);
    if (d.email) contactParts.push(d.email);
    if (d.city) contactParts.push(d.city);
    if (d.linkedin) contactParts.push(d.linkedin);
    if (contactParts.length) {
      hdr.appendChild(_el('div', 'cv-contact', contactParts.join(' \u00b7 ')));
    }
    root.appendChild(hdr);
  }

  function _renderSummary(d, root) {
    if (!d.summary) return;
    var sec = _sectionWithTitle('\u00d6zet');
    sec.appendChild(_el('p', 'cv-summary', d.summary));
    root.appendChild(sec);
  }

  function _renderExperiences(d, root) {
    if (!d.experiences || !d.experiences.length) return;
    var sec = _sectionWithTitle('Deneyim');
    d.experiences.forEach(function(e) {
      if (!e) return;
      var item = _el('div', 'cv-experience-item');
      var headline = _el('div', 'cv-exp-headline');
      var roleLabel = (e.pozisyon || '') + (e.marka || e.sirket ? ' \u2014 ' + (e.marka || e.sirket) : '');
      headline.appendChild(_el('span', 'cv-exp-role', roleLabel || 'Pozisyon'));
      var dateStr = _fmtDate(e);
      if (dateStr) headline.appendChild(_el('span', 'cv-exp-date', dateStr));
      item.appendChild(headline);

      if (e.rol_ailesi || e.segment) {
        item.appendChild(_el('div', 'cv-exp-meta',
          [e.rol_ailesi, e.segment].filter(Boolean).join(' \u00b7 ')));
      }

      var summaryText = e.basari_ozeti || e.description || '';
      if (summaryText) {
        item.appendChild(_el('p', 'cv-exp-summary', summaryText));
      }
      sec.appendChild(item);
    });
    root.appendChild(sec);
  }

  function _renderSkills(d, root) {
    var skills = [];
    if (d.targetRole) skills.push(d.targetRole);
    (d.experiences || []).forEach(function(e) {
      if (!e) return;
      if (e.rol_ailesi && skills.indexOf(e.rol_ailesi) === -1) skills.push(e.rol_ailesi);
      if (e.segment && skills.indexOf(e.segment) === -1) skills.push(e.segment);
    });
    if (!skills.length && (d.brandInterests || []).length > 0) skills.push('Perakende');
    if (!skills.length) return;

    var sec = _sectionWithTitle('Yetkinlikler');
    sec.appendChild(_el('div', 'cv-skills', skills.join(' \u00b7 ')));
    root.appendChild(sec);
  }

  function _renderEducation(d, root) {
    if (!d.education || !d.education.length) return;
    var sec = _sectionWithTitle('E\u011fitim');
    d.education.forEach(function(e) {
      if (!e) return;
      var item = _el('div', 'cv-education-item');
      var line = _el('div', 'cv-edu-headline');
      var label = (e.okul || '') + (e.bolum ? ' \u2014 ' + e.bolum : '');
      line.appendChild(_el('span', 'cv-edu-school', label || 'Okul'));
      var rightParts = [];
      if (e.egitim_seviye) rightParts.push(e.egitim_seviye);
      if (e.mezun_yil) rightParts.push(String(e.mezun_yil));
      if (rightParts.length) line.appendChild(_el('span', 'cv-edu-date', rightParts.join(', ')));
      item.appendChild(line);
      sec.appendChild(item);
    });
    root.appendChild(sec);
  }

  function _renderLanguages(d, root) {
    if (!d.languages || !d.languages.length) return;
    var sec = _sectionWithTitle('Diller');
    var text = d.languages
      .filter(function(l) { return l && l.dil; })
      .map(function(l) { return l.dil + (l.seviye ? ' (' + l.seviye + ')' : ''); })
      .join(' \u00b7 ');
    if (!text) return;
    sec.appendChild(_el('div', 'cv-list-line', text));
    root.appendChild(sec);
  }

  function _renderCertificates(d, root) {
    if (!d.certificates || !d.certificates.length) return;
    var sec = _sectionWithTitle('Sertifikalar');
    d.certificates.forEach(function(c) {
      if (!c) return;
      var item = _el('div', 'cv-cert-item');
      var line = _el('div', 'cv-cert-headline');
      var label = (c.egitim_adi || '') + (c.kurum ? ' \u2014 ' + c.kurum : '');
      line.appendChild(_el('span', 'cv-cert-name', label));
      if (c.yil) line.appendChild(_el('span', 'cv-cert-date', String(c.yil)));
      item.appendChild(line);
      sec.appendChild(item);
    });
    root.appendChild(sec);
  }

  function _renderBrandInterests(d, root) {
    if (!d.brandInterests || !d.brandInterests.length) return;
    var sec = _sectionWithTitle('\u0130lgi Alanlar\u0131');
    sec.appendChild(_el('div', 'cv-list-line', d.brandInterests.join(', ')));
    root.appendChild(sec);
  }

  /* ── Public: renderCVPreview(data) → DOM element ──────── */
  function renderCVPreview(d) {
    d = d || {};
    var root = _el('article', 'cv-preview');
    _renderHeader(d, root);
    _renderSummary(d, root);
    _renderExperiences(d, root);
    _renderSkills(d, root);
    _renderEducation(d, root);
    _renderLanguages(d, root);
    _renderCertificates(d, root);
    _renderBrandInterests(d, root);
    return root;
  }

  /* ── Public: updateCVPreview() — fetch data + rebuild ── */
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

  /* ── Public: _schedulePreviewUpdate() — debounced ──────── */
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
