/* global IK_DATA */
/* ════════════════════════════════════════════════════════════════
   IK Candidate Drawer — 7 May refactor
   Sağdan slide aday önizleme. Pipeline kartına tıklayınca açılır;
   hr-candidate.html ayrı sayfasının yerini alır.

   Public API:
     window._htOpenCandidateDrawer(candidateId)
     window._htCloseCandidateDrawer()
   XSS-safe: textContent + createElementNS only, innerHTML yasak.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _dom = {};
  var _state = { isOpen: false, candidateId: null };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = String(text);
    return n;
  }

  function makeCloseSvg() {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    [['6','6','18','18'], ['6','18','18','6']].forEach(function (xy) {
      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', xy[0]);
      line.setAttribute('y1', xy[1]);
      line.setAttribute('x2', xy[2]);
      line.setAttribute('y2', xy[3]);
      svg.appendChild(line);
    });
    return svg;
  }

  function initialOf(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    var first = parts[0] || '';
    var last  = parts.length > 1 ? parts[parts.length - 1] : '';
    return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
  }

  function fmtAyToYil(ay) {
    if (!ay || ay < 1) return '—';
    var yil = Math.round(ay / 12 * 10) / 10;
    return yil < 1 ? ay + ' ay' : (yil + ' yıl');
  }

  function track(name, props) {
    if (!window.posthog) return;
    try { window.posthog.capture(name, props || {}); } catch (e) {}
  }

  /* ═══════ Markup builder (overlay + drawer container) ═══════ */
  function ensureMarkup() {
    if (_dom.drawer) return;

    var overlay = el('div', 'ik-cand-drawer-overlay');
    overlay.id = 'ik-cand-drawer-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', closeDrawer);
    document.body.appendChild(overlay);

    var drawer = el('aside', 'ik-cand-drawer');
    drawer.id = 'ik-cand-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'ik-cand-drawer-name');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(drawer);

    _dom.overlay = overlay;
    _dom.drawer  = drawer;
  }

  /* ═══════ Render parçaları ═══════ */
  function renderHeader(c) {
    var head = el('header', 'ik-cand-drawer__head');

    var av = el('div', 'ik-cand-drawer__avatar', initialOf(c.full_name));
    av.setAttribute('aria-hidden', 'true');
    head.appendChild(av);

    var titleBlock = el('div', 'ik-cand-drawer__title-block');
    var name = el('h2', 'ik-cand-drawer__name', c.full_name || '—');
    name.id = 'ik-cand-drawer-name';
    titleBlock.appendChild(name);

    var metaParts = [];
    if (c.son_pozisyon) metaParts.push(c.son_pozisyon);
    if (c.adres_il)     metaParts.push(c.adres_il);
    if (metaParts.length) {
      titleBlock.appendChild(el('p', 'ik-cand-drawer__meta', metaParts.join(' · ')));
    }
    head.appendChild(titleBlock);

    var closeBtn = el('button', 'ik-cand-drawer__close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Aday önizlemeyi kapat');
    closeBtn.appendChild(makeCloseSvg());
    closeBtn.addEventListener('click', closeDrawer);
    head.appendChild(closeBtn);

    return head;
  }

  function buildStat(label, value) {
    var item = el('div', 'ik-cand-drawer__stat');
    item.appendChild(el('span', 'ik-cand-drawer__stat-label', label));
    item.appendChild(el('span', 'ik-cand-drawer__stat-value', value));
    return item;
  }

  function renderStats(c) {
    var row = el('div', 'ik-cand-drawer__stats');
    if (c.match_score != null) row.appendChild(buildStat('Eşleşme', '%' + c.match_score));
    if (c.toplam_deneyim_ay)   row.appendChild(buildStat('Deneyim', fmtAyToYil(c.toplam_deneyim_ay)));
    if (c.musaitlik)           row.appendChild(buildStat('Müsaitlik', c.musaitlik));
    return row.children.length ? row : null;
  }

  function renderReasonsRow(c) {
    var reasons = Array.isArray(c.match_reasons) ? c.match_reasons : [];
    /* "Detaylı profil" tag UI gürültüsü — kart click drawer açar zaten */
    reasons = reasons.filter(function (r) {
      return r && r.toLowerCase().indexOf('detaylı profil') === -1;
    });
    if (!reasons.length) return null;

    var row = el('div', 'ik-cand-drawer__chips');
    reasons.forEach(function (r) {
      row.appendChild(el('span', 'ik-cand-drawer__chip', r));
    });
    return row;
  }

  function renderSection(title, contentEl) {
    var sec = el('section', 'ik-cand-drawer__section');
    sec.appendChild(el('h3', 'ik-cand-drawer__section-title', title));
    sec.appendChild(contentEl);
    return sec;
  }

  function renderExperiences(c) {
    var exps = Array.isArray(c.experiences) ? c.experiences : [];
    if (!exps.length) return null;

    var list = el('ul', 'ik-cand-drawer__list');
    exps.forEach(function (e) {
      var li = el('li', 'ik-cand-drawer__list-item');
      var role = e.pozisyon || e.title || e.role || '—';
      var company = e.sirket || e.company || '';
      var dates = '';
      if (e.baslangic_tarih || e.start_date) {
        dates = (e.baslangic_tarih || e.start_date) + ' – ' + (e.bitis_tarih || e.end_date || 'Halen');
      }
      li.appendChild(el('div', 'ik-cand-drawer__list-primary', role + (company ? ' · ' + company : '')));
      if (dates) li.appendChild(el('div', 'ik-cand-drawer__list-secondary', dates));
      list.appendChild(li);
    });
    return renderSection('Deneyim', list);
  }

  function renderEducation(c) {
    var edu = Array.isArray(c.education) ? c.education : [];
    if (!edu.length) return null;

    var list = el('ul', 'ik-cand-drawer__list');
    edu.forEach(function (e) {
      var li = el('li', 'ik-cand-drawer__list-item');
      var school = e.okul || e.school || '—';
      var degree = e.bolum || e.degree || '';
      li.appendChild(el('div', 'ik-cand-drawer__list-primary', school + (degree ? ' · ' + degree : '')));
      if (e.mezun_yil || e.year) {
        li.appendChild(el('div', 'ik-cand-drawer__list-secondary', e.mezun_yil || e.year));
      }
      list.appendChild(li);
    });
    return renderSection('Eğitim', list);
  }

  function renderLanguages(c) {
    var dil = Array.isArray(c.diller) ? c.diller : [];
    if (!dil.length) return null;

    var row = el('div', 'ik-cand-drawer__chips');
    dil.forEach(function (d) {
      var label = (typeof d === 'string') ? d : (d.dil || d.name || '');
      var level = (typeof d === 'object' && d) ? (d.seviye || d.level || '') : '';
      var text  = label + (level ? ' · ' + level : '');
      if (text) row.appendChild(el('span', 'ik-cand-drawer__chip', text));
    });
    return row.children.length ? renderSection('Diller', row) : null;
  }

  /* ═══════ Footer (CV indir + Mesaj) ═══════ */
  function renderFooter(c) {
    var footer = el('footer', 'ik-cand-drawer__footer');

    var cvPath = c.cv_url || c.cv_path || (c.cv && c.cv.path);
    if (cvPath) {
      var cvBtn = el('button', 'ik-cand-drawer__action ik-cand-drawer__action--primary', 'CV indir');
      cvBtn.type = 'button';
      cvBtn.addEventListener('click', function () {
        if (window.HT && window.HT.signStorageUrl) {
          window.HT.signStorageUrl(cvPath, 3600).then(function (signed) {
            if (signed) {
              window.open(signed, '_blank', 'noopener');
              track('candidate_cv_download', { candidate_id: c.id });
            }
          });
        } else {
          window.open(cvPath, '_blank', 'noopener');
        }
      });
      footer.appendChild(cvBtn);
    }

    var msgBtn = el('a', 'ik-cand-drawer__action', 'Mesaj yaz');
    msgBtn.href = 'hr-messages.html?aday=' + encodeURIComponent(c.id);
    footer.appendChild(msgBtn);

    return footer;
  }

  /* ═══════ Render orchestrator ═══════ */
  function renderContent(c) {
    while (_dom.drawer.firstChild) _dom.drawer.removeChild(_dom.drawer.firstChild);

    _dom.drawer.appendChild(renderHeader(c));

    var body = el('div', 'ik-cand-drawer__body');

    var stats = renderStats(c);
    if (stats) body.appendChild(stats);

    var reasons = renderReasonsRow(c);
    if (reasons) body.appendChild(reasons);

    [renderExperiences(c), renderEducation(c), renderLanguages(c)].forEach(function (sec) {
      if (sec) body.appendChild(sec);
    });

    _dom.drawer.appendChild(body);
    _dom.drawer.appendChild(renderFooter(c));
  }

  function renderLoading() {
    while (_dom.drawer.firstChild) _dom.drawer.removeChild(_dom.drawer.firstChild);
    _dom.drawer.appendChild(el('div', 'ik-cand-drawer__loading', 'Yükleniyor…'));
  }

  function renderError(msg) {
    while (_dom.drawer.firstChild) _dom.drawer.removeChild(_dom.drawer.firstChild);
    _dom.drawer.appendChild(el('div', 'ik-cand-drawer__loading', msg || 'Aday bilgisi alınamadı.'));
  }

  /* ═══════ Open / Close ═══════ */
  function openDrawer(candidateId) {
    if (!candidateId) return;
    ensureMarkup();
    _state.isOpen = true;
    _state.candidateId = candidateId;

    _dom.overlay.classList.add('is-open');
    _dom.overlay.setAttribute('aria-hidden', 'false');
    _dom.drawer.classList.add('is-open');
    _dom.drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ht-scroll-lock');

    renderLoading();
    track('candidate_drawer_open', { candidate_id: candidateId });

    if (!window.IK_DATA || !IK_DATA.getCandidate) {
      renderError('Veri kaynağı hazır değil.');
      return;
    }
    IK_DATA.getCandidate(candidateId).then(function (c) {
      if (!_state.isOpen || _state.candidateId !== candidateId) return;
      if (!c) {
        renderError('Aday bulunamadı.');
        return;
      }
      renderContent(c);
    }).catch(function (e) {
      console.warn('[ik-cand-drawer] getCandidate error:', e && e.message);
      renderError('Aday bilgisi alınamadı.');
    });
  }

  function closeDrawer() {
    if (!_dom.drawer) return;
    _state.isOpen = false;
    _state.candidateId = null;
    _dom.drawer.classList.remove('is-open');
    _dom.drawer.setAttribute('aria-hidden', 'true');
    if (_dom.overlay) {
      _dom.overlay.classList.remove('is-open');
      _dom.overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('ht-scroll-lock');
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _state.isOpen) closeDrawer();
  });

  window._htOpenCandidateDrawer  = openDrawer;
  window._htCloseCandidateDrawer = closeDrawer;
})();
