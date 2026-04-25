/* ═════════════════════════════════════════════════════════════════
   HelloTalent — HR Candidate detail page (FAZ B Sprint 4)

   URL: hr-candidate.html?id={candidate_id}&from=pool|pipeline

   Sorumluluklar:
   - URL ?id parametresinden adayı yükle (HRData.getCandidate)
   - 4 tab: Profil / Notlar / Mesajlar / Eşleşme
   - Notlar CRUD (demo: localStorage ht_hr_notes_demo_state)
   - Mesajlar tab: bu candidate_id'ye ait thread'leri özetle, link aç
   - Eşleşme tab: aktif pozisyon-bazlı match score + kırılım
   - "Pipeline'a ekle" + "Mesaj yaz" CTA'lar
   - Breadcrumb: ?from parametresine göre Havuz veya Pipeline'a dön
   - XSS guard: textContent + createElement only
   ═════════════════════════════════════════════════════════════════ */
'use strict';

(function () {
  /* ── Constants ───────────────────────────────────────────────── */
  var NOTES_KEY = 'ht_hr_notes_demo_state';

  /* ── State ───────────────────────────────────────────────────── */
  var _candidate = null;
  var _candidateId = null;
  var _activeTab = 'profile';
  var _activePosition = null;
  var _threads = [];
  var _from = null;

  /* ── DOM cache ───────────────────────────────────────────────── */
  var $loading, $empty, $emptyTitle, $emptyDesc;
  var $content;
  var $avatar, $name, $pos, $loc, $exp, $chips;
  var $matchWrap, $match;
  var $btnAdd, $btnMsg;
  var $tabs, $panes;
  var $fldPos, $fldExp, $fldEdu, $fldDob, $fldWork, $fldAvail;
  var $fldCity, $fldDistrict, $fldSegment, $fldBrands;
  var $fldUpdated, $fldActive, $fldId;
  var $noteForm, $noteInput, $noteSubmit, $notesList, $notesEmpty, $notesCount;
  var $msgSummary, $msgLink;
  var $matchIntro, $matchList;
  var $breadcrumbBack, $breadcrumbLabel;
  var $toast;

  /* ── Utility ─────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function getInitial(name) {
    if (!name) return 'A';
    var t = String(name).trim();
    return t ? t.charAt(0).toLocaleUpperCase('tr-TR') : 'A';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var dd = String(d.getDate()).padStart(2, '0');
    var months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return dd + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var dd = String(d.getDate()).padStart(2, '0');
    var MM = String(d.getMonth() + 1).padStart(2, '0');
    var yy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return dd + '.' + MM + '.' + yy + ' ' + hh + ':' + mm;
  }

  function ageFromDob(yob) {
    if (!yob) return null;
    var n = parseInt(yob, 10);
    if (!n || isNaN(n)) return null;
    var current = new Date().getFullYear();
    return current - n;
  }

  function showToast(msg, type) {
    if (!$toast) return;
    $toast.textContent = msg;
    $toast.setAttribute('data-type', type || 'info');
    $toast.setAttribute('data-show', 'true');
    setTimeout(function () { $toast.setAttribute('data-show', 'false'); }, 2400);
  }

  function readNotes() {
    try {
      var raw = localStorage.getItem(NOTES_KEY);
      if (!raw) return {};
      var p = JSON.parse(raw);
      return p && typeof p === 'object' ? p : {};
    } catch (e) { return {}; }
  }
  function writeNotes(state) {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ── URL params ──────────────────────────────────────────────── */
  function readUrlParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      _candidateId = params.get('id') || null;
      _from = params.get('from') || null;
    } catch (e) {
      _candidateId = null;
    }
  }

  function setBreadcrumb() {
    if (!$breadcrumbBack) return;
    if (_from === 'pipeline') {
      $breadcrumbBack.setAttribute('href', 'hr-pipeline.html');
      if ($breadcrumbLabel) $breadcrumbLabel.textContent = 'Pipeline\'a dön';
    } else {
      $breadcrumbBack.setAttribute('href', 'hr-pool.html');
      if ($breadcrumbLabel) $breadcrumbLabel.textContent = 'Havuza dön';
    }
  }

  /* ── Render: hero ────────────────────────────────────────────── */
  function renderHero() {
    if (!_candidate) return;
    var c = _candidate;

    if ($avatar) $avatar.textContent = getInitial(c.full_name);
    if ($name) $name.textContent = c.full_name || '—';
    if ($pos) $pos.textContent = c.pozisyon || '—';

    var locParts = [];
    if (c.sehir) locParts.push(c.sehir);
    if (c.ilce) locParts.push(c.ilce);
    if ($loc) $loc.textContent = locParts.length ? locParts.join(' / ') : '—';

    var expY = c.deneyim_yil != null ? c.deneyim_yil : null;
    if ($exp) $exp.textContent = expY != null ? (expY + ' yıl deneyim') : '—';

    if ($chips) {
      while ($chips.firstChild) $chips.removeChild($chips.firstChild);
      function addChip(label, kind) {
        if (!label) return;
        var chip = document.createElement('span');
        chip.className = 'hr-cd-chip';
        if (kind) chip.setAttribute('data-kind', kind);
        chip.textContent = label;
        $chips.appendChild(chip);
      }
      addChip(c.segment ? labelSegment(c.segment) : null, 'segment');
      addChip(c.calisma_tipi || null);
      addChip(c.musaitlik ? 'Müsaitlik: ' + labelMusaitlik(c.musaitlik) : null);
      addChip(c.is_active === false ? 'Pasif' : 'Aktif', c.is_active === false ? 'inactive' : 'active');
    }

    if ($btnAdd) {
      $btnAdd.disabled = false;
      var pos = window.HRShell && window.HRShell.getActivePosition && window.HRShell.getActivePosition();
      if (!pos) {
        $btnAdd.setAttribute('title', 'Önce başlıktan bir pozisyon seçin');
      } else {
        $btnAdd.setAttribute('title', 'Adayı "' + pos.title + '" pipeline\'ına ekle');
      }
    }

    if ($btnMsg) {
      var threadFromCandidate = _threads.find(function (t) { return String(t.candidate_id) === String(c.id); });
      if (threadFromCandidate) {
        $btnMsg.setAttribute('href', 'hr-messages.html?thread=' + encodeURIComponent(threadFromCandidate.id));
      } else {
        $btnMsg.setAttribute('href', 'hr-messages.html?candidate=' + encodeURIComponent(c.id));
      }
    }
  }

  function labelSegment(s) {
    var map = { luks: 'Lüks', premium: 'Premium', 'high-street': 'High street' };
    return map[s] || s;
  }
  function labelMusaitlik(m) {
    var map = { hemen: 'Hemen', '2 hafta': '2 hafta', '1 ay': '1 ay', '3 ay': '3 ay' };
    return map[m] || m;
  }

  /* ── Render: profile pane ───────────────────────────────────── */
  function renderProfile() {
    if (!_candidate) return;
    var c = _candidate;
    if ($fldPos) $fldPos.textContent = c.pozisyon || '—';
    if ($fldExp) $fldExp.textContent = c.deneyim_yil != null ? (c.deneyim_yil + ' yıl') : '—';
    if ($fldEdu) $fldEdu.textContent = c.egitim_seviye || '—';
    if ($fldDob) {
      var age = ageFromDob(c.dogum_yili);
      $fldDob.textContent = c.dogum_yili ? (c.dogum_yili + (age != null ? (' (' + age + ' yaş)') : '')) : '—';
    }
    if ($fldWork) $fldWork.textContent = c.calisma_tipi || '—';
    if ($fldAvail) $fldAvail.textContent = c.musaitlik ? labelMusaitlik(c.musaitlik) : '—';

    if ($fldCity) $fldCity.textContent = c.sehir || '—';
    if ($fldDistrict) $fldDistrict.textContent = c.ilce || '—';
    if ($fldSegment) $fldSegment.textContent = c.segment ? labelSegment(c.segment) : '—';

    if ($fldBrands) {
      while ($fldBrands.firstChild) $fldBrands.removeChild($fldBrands.firstChild);
      var brands = Array.isArray(c.markalar) ? c.markalar : [];
      if (brands.length === 0) {
        var em = document.createElement('span');
        em.className = 'hr-cd-tags__empty';
        em.textContent = 'Marka bilgisi yok';
        $fldBrands.appendChild(em);
      } else {
        brands.forEach(function (b) {
          var t = document.createElement('span');
          t.className = 'hr-cd-tag';
          t.textContent = b;
          $fldBrands.appendChild(t);
        });
      }
    }

    if ($fldUpdated) $fldUpdated.textContent = fmtDate(c.updated_at);
    if ($fldActive) {
      $fldActive.textContent = c.is_active === false ? 'Pasif' : 'Aktif';
      $fldActive.setAttribute('data-state', c.is_active === false ? 'inactive' : 'active');
    }
    if ($fldId) $fldId.textContent = c.id != null ? String(c.id) : '—';
  }

  /* ── Render: notes pane ─────────────────────────────────────── */
  function renderNotes() {
    if (!_candidate) return;
    if (!$notesList) return;

    var all = readNotes();
    var list = all[String(_candidate.id)] || [];
    list = list.slice().sort(function (a, b) {
      var ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      var tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    while ($notesList.firstChild) $notesList.removeChild($notesList.firstChild);

    if (list.length === 0) {
      var emp = document.createElement('div');
      emp.className = 'hr-cd-empty hr-cd-empty--inline';
      emp.setAttribute('data-hr-cd-notes-empty', 'true');
      var p = document.createElement('p');
      p.textContent = 'Henüz not eklenmedi.';
      emp.appendChild(p);
      $notesList.appendChild(emp);
    } else {
      list.forEach(function (n) {
        var item = document.createElement('article');
        item.className = 'hr-cd-note';
        item.setAttribute('role', 'listitem');
        item.setAttribute('data-note-id', n.id);

        var head = document.createElement('header');
        head.className = 'hr-cd-note__head';
        var time = document.createElement('time');
        time.className = 'hr-cd-note__time';
        time.dateTime = n.created_at || '';
        time.textContent = fmtDateTime(n.created_at);
        head.appendChild(time);

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'hr-cd-note__del';
        del.setAttribute('aria-label', 'Notu sil');
        del.textContent = 'Sil';
        del.addEventListener('click', function () { deleteNote(n.id); });
        head.appendChild(del);

        item.appendChild(head);

        var body = document.createElement('div');
        body.className = 'hr-cd-note__body';
        body.textContent = n.body;
        item.appendChild(body);

        $notesList.appendChild(item);
      });
    }

    if ($notesCount) $notesCount.textContent = String(list.length);
  }

  function addNote(body) {
    if (!_candidate || !body) return;
    var all = readNotes();
    var key = String(_candidate.id);
    if (!all[key]) all[key] = [];
    var note = {
      id: 'note-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      body: body,
      created_at: new Date().toISOString()
    };
    all[key].push(note);
    writeNotes(all);

    if (window.HRData && window.HRData.addNote) {
      window.HRData.addNote(_candidate.id, body).catch(function () {});
    }

    renderNotes();
    showToast('Not kaydedildi', 'success');
  }

  function deleteNote(id) {
    if (!_candidate) return;
    var all = readNotes();
    var key = String(_candidate.id);
    if (!all[key]) return;
    all[key] = all[key].filter(function (n) { return n.id !== id; });
    writeNotes(all);
    renderNotes();
    showToast('Not silindi', 'info');
  }

  /* ── Render: messages pane ──────────────────────────────────── */
  function renderMessages() {
    if (!_candidate || !$msgSummary) return;
    var thread = _threads.find(function (t) { return String(t.candidate_id) === String(_candidate.id); });

    while ($msgSummary.firstChild) $msgSummary.removeChild($msgSummary.firstChild);

    if (!thread) {
      var p = document.createElement('p');
      p.textContent = 'Bu adayla henüz konuşma başlatılmadı.';
      $msgSummary.appendChild(p);
      var link = document.createElement('a');
      link.className = 'hr-empty-state__cta';
      link.href = 'hr-messages.html?candidate=' + encodeURIComponent(_candidate.id);
      link.textContent = 'Mesaj başlat';
      $msgSummary.appendChild(link);
      return;
    }

    var summary = document.createElement('div');
    summary.className = 'hr-cd-msg-thread';

    var title = document.createElement('div');
    title.className = 'hr-cd-msg-thread__title';
    title.textContent = thread.position_title || 'Konuşma';
    summary.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'hr-cd-msg-thread__meta';
    meta.textContent = (thread.messages || []).length + ' mesaj · son ' + fmtDateTime(thread.last_message_at);
    summary.appendChild(meta);

    var preview = document.createElement('blockquote');
    preview.className = 'hr-cd-msg-thread__preview';
    preview.textContent = thread.last_message || '';
    summary.appendChild(preview);

    var link2 = document.createElement('a');
    link2.className = 'hr-empty-state__cta';
    link2.href = 'hr-messages.html?thread=' + encodeURIComponent(thread.id);
    link2.textContent = 'Konuşmayı aç';
    summary.appendChild(link2);

    $msgSummary.appendChild(summary);
  }

  /* ── Render: match pane ─────────────────────────────────────── */
  function renderMatch() {
    if (!_candidate || !$matchList) return;
    while ($matchList.firstChild) $matchList.removeChild($matchList.firstChild);

    if (!_activePosition) {
      if ($matchIntro) $matchIntro.textContent = 'Aktif bir pozisyon seçin; adayın o pozisyona uyum kırılımı burada görünür.';
      if ($matchWrap) $matchWrap.hidden = true;
      return;
    }

    if ($matchIntro) {
      $matchIntro.textContent = '"' + (_activePosition.title || 'Pozisyon') + '" pozisyonuna eşleşme kırılımı:';
    }

    var breakdown = computeMatchBreakdown(_candidate, _activePosition);
    if ($matchWrap) $matchWrap.hidden = false;
    if ($match) $match.textContent = '%' + breakdown.score;

    breakdown.factors.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'hr-cd-match-row';
      row.setAttribute('data-state', f.matched ? 'match' : 'miss');

      var label = document.createElement('span');
      label.className = 'hr-cd-match-row__label';
      label.textContent = f.label;
      row.appendChild(label);

      var bar = document.createElement('span');
      bar.className = 'hr-cd-match-row__bar';
      var fill = document.createElement('span');
      fill.className = 'hr-cd-match-row__fill';
      fill.style.width = f.weight + '%';
      bar.appendChild(fill);
      row.appendChild(bar);

      var note = document.createElement('span');
      note.className = 'hr-cd-match-row__note';
      note.textContent = f.note;
      row.appendChild(note);

      $matchList.appendChild(row);
    });
  }

  function computeMatchBreakdown(c, pos) {
    var factors = [];
    var posMatch = pos.title && c.pozisyon && pos.title.toLowerCase().indexOf(c.pozisyon.toLowerCase()) !== -1;
    factors.push({
      label: 'Pozisyon',
      matched: !!posMatch,
      weight: posMatch ? 100 : 30,
      note: posMatch ? 'Aday bu pozisyonda çalışıyor' : 'Pozisyon farklı'
    });

    var cityMatch = pos.city && c.sehir && pos.city === c.sehir;
    factors.push({
      label: 'Şehir',
      matched: !!cityMatch,
      weight: cityMatch ? 100 : 40,
      note: cityMatch ? c.sehir + ' eşleşti' : (pos.city ? pos.city + ' istenmiş, aday ' + (c.sehir || '—') : 'Şehir kriteri yok')
    });

    var segMatch = pos.segment && c.segment && pos.segment === c.segment;
    factors.push({
      label: 'Segment',
      matched: !!segMatch,
      weight: segMatch ? 100 : 50,
      note: segMatch ? labelSegment(c.segment) + ' segmenti' : (pos.segment ? labelSegment(pos.segment) + ' istenmiş' : 'Segment kriteri yok')
    });

    var minExp = pos.min_experience != null ? pos.min_experience : 0;
    var expOk = (c.deneyim_yil || 0) >= minExp;
    factors.push({
      label: 'Deneyim',
      matched: expOk,
      weight: expOk ? 100 : 50,
      note: expOk ? (c.deneyim_yil || 0) + ' yıl (eşik ' + minExp + ' yıl)' : 'Eşik altında — ' + (c.deneyim_yil || 0) + '/' + minExp + ' yıl'
    });

    var matched = factors.filter(function (f) { return f.matched; }).length;
    var score = Math.round((matched / factors.length) * 100);
    return { score: score, factors: factors };
  }

  /* ── Tabs ────────────────────────────────────────────────────── */
  function activateTab(key) {
    _activeTab = key;
    if ($tabs) {
      $tabs.forEach(function (t) {
        var k = t.getAttribute('data-hr-cd-tab');
        t.setAttribute('aria-selected', k === key ? 'true' : 'false');
      });
    }
    if ($panes) {
      $panes.forEach(function (p) {
        var k = p.getAttribute('data-hr-cd-pane');
        p.hidden = (k !== key);
      });
    }
    if (key === 'notes') renderNotes();
    else if (key === 'messages') renderMessages();
    else if (key === 'match') renderMatch();
  }

  /* ── Add to pipeline ─────────────────────────────────────────── */
  async function handleAddToPipeline() {
    var pos = window.HRShell && window.HRShell.getActivePosition && window.HRShell.getActivePosition();
    if (!pos || !pos.id) {
      showToast('Önce başlıktan bir pozisyon seçin', 'warn');
      return;
    }
    if (!_candidate) return;
    if ($btnAdd) $btnAdd.disabled = true;
    try {
      var res = await window.HRData.addToPipeline({
        position_id: pos.id,
        candidate_id: _candidate.id,
        stage: 'yeni'
      });
      if (res && res.error) {
        showToast(res.error.message || 'Eklenemedi', 'error');
      } else if (res && res.data && res.data.duplicate) {
        showToast('Aday zaten bu pipeline\'da', 'info');
      } else {
        showToast('Pipeline\'a eklendi', 'success');
      }
    } catch (e) {
      showToast(e.message || 'Eklenemedi', 'error');
    } finally {
      if ($btnAdd) $btnAdd.disabled = false;
    }
  }

  /* ── Bind events ─────────────────────────────────────────────── */
  function bindEvents() {
    if ($tabs) {
      $tabs.forEach(function (t) {
        t.addEventListener('click', function () {
          var k = t.getAttribute('data-hr-cd-tab');
          if (k) activateTab(k);
        });
      });
    }

    if ($noteInput && $noteSubmit) {
      $noteInput.addEventListener('input', function () {
        var v = $noteInput.value.trim();
        $noteSubmit.disabled = v.length === 0;
      });
    }
    if ($noteForm) {
      $noteForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = $noteInput && $noteInput.value.trim();
        if (!v) return;
        addNote(v);
        if ($noteInput) $noteInput.value = '';
        if ($noteSubmit) $noteSubmit.disabled = true;
      });
    }

    if ($btnAdd) {
      $btnAdd.addEventListener('click', handleAddToPipeline);
    }

    window.addEventListener('hr:position-changed', function (e) {
      _activePosition = (e && e.detail) || null;
      renderHero();
      if (_activeTab === 'match') renderMatch();
    });
  }

  /* ── Position switcher render ────────────────────────────────── */
  async function renderPositionSwitcher() {
    var btn = $('[data-hr-position-btn]');
    var menu = $('[data-hr-position-menu]');
    if (!btn || !menu) return;
    var loadingEl = $('[data-hr-position-loading]', menu);
    var posRes = await window.HRData.getPositions();
    if (loadingEl) loadingEl.remove();
    var positions = (posRes && posRes.data) || [];
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    function addOpt(label, value) {
      var opt = document.createElement('button');
      opt.type = 'button';
      opt.className = 'hr-position-menu__opt';
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-pos-id', value || '');
      opt.textContent = label;
      var active = window.HRShell.getActivePosition();
      var isActive = (!value && !active) || (active && String(active.id) === String(value));
      if (isActive) opt.setAttribute('aria-selected', 'true');
      opt.addEventListener('click', function () {
        if (!value) {
          window.HRShell.setActivePosition(null);
        } else {
          var pos = positions.find(function (p) { return String(p.id) === String(value); });
          if (pos) window.HRShell.setActivePosition({ id: pos.id, title: pos.title, city: pos.city, segment: pos.segment, min_experience: pos.min_experience });
        }
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        renderPositionSwitcher();
      });
      menu.appendChild(opt);
    }
    addOpt('Tüm pozisyonlar', null);
    positions.forEach(function (p) { addOpt(p.title || ('Pozisyon #' + p.id), p.id); });

    btn.onclick = function (e) {
      e.stopPropagation();
      var isOpen = menu.getAttribute('data-open') === 'true';
      menu.setAttribute('data-open', isOpen ? 'false' : 'true');
      btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    };
    document.addEventListener('click', function (e) {
      if (menu.getAttribute('data-open') !== 'true') return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  function cacheDom() {
    $loading = $('[data-hr-cd-loading]');
    $empty = $('[data-hr-cd-empty]');
    $emptyTitle = $('[data-hr-cd-empty-title]');
    $emptyDesc = $('[data-hr-cd-empty-desc]');
    $content = $('[data-hr-cd-content]');

    $avatar = $('[data-hr-cd-avatar]');
    $name = $('[data-hr-cd-name]');
    $pos = $('[data-hr-cd-pos]');
    $loc = $('[data-hr-cd-loc]');
    $exp = $('[data-hr-cd-exp]');
    $chips = $('[data-hr-cd-chips]');

    $matchWrap = $('[data-hr-cd-match-wrap]');
    $match = $('[data-hr-cd-match]');

    $btnAdd = $('[data-hr-cd-add]');
    $btnMsg = $('[data-hr-cd-msg]');

    $tabs = $$('[data-hr-cd-tab]');
    $panes = $$('[data-hr-cd-pane]');

    $fldPos = $('[data-hr-cd-fld-pos]');
    $fldExp = $('[data-hr-cd-fld-exp]');
    $fldEdu = $('[data-hr-cd-fld-edu]');
    $fldDob = $('[data-hr-cd-fld-dob]');
    $fldWork = $('[data-hr-cd-fld-work]');
    $fldAvail = $('[data-hr-cd-fld-avail]');
    $fldCity = $('[data-hr-cd-fld-city]');
    $fldDistrict = $('[data-hr-cd-fld-district]');
    $fldSegment = $('[data-hr-cd-fld-segment]');
    $fldBrands = $('[data-hr-cd-fld-brands]');
    $fldUpdated = $('[data-hr-cd-fld-updated]');
    $fldActive = $('[data-hr-cd-fld-active]');
    $fldId = $('[data-hr-cd-fld-id]');

    $noteForm = $('[data-hr-cd-note-form]');
    $noteInput = $('[data-hr-cd-note-input]');
    $noteSubmit = $('[data-hr-cd-note-submit]');
    $notesList = $('[data-hr-cd-notes-list]');
    $notesEmpty = $('[data-hr-cd-notes-empty]');
    $notesCount = $('[data-hr-cd-notes-count]');

    $msgSummary = $('[data-hr-cd-msg-summary]');
    $msgLink = $('[data-hr-cd-msg-link]');

    $matchIntro = $('[data-hr-cd-match-intro]');
    $matchList = $('[data-hr-cd-match-list]');

    $breadcrumbBack = $('[data-hr-cd-back]');
    $breadcrumbLabel = $('[data-hr-cd-back-label]');

    $toast = $('[data-hr-toast]');
  }

  function showState(state) {
    if ($loading) $loading.hidden = (state !== 'loading');
    if ($empty) $empty.hidden = (state !== 'empty');
    if ($content) $content.hidden = (state !== 'content');
  }

  async function init() {
    cacheDom();
    if (!window.HRShell) {
      console.warn('[hr-candidate] HRShell yok, durdu');
      return;
    }
    showState('loading');

    readUrlParams();
    setBreadcrumb();

    await window.HRShell.ready();

    var ap = window.HRShell.getActivePosition();
    _activePosition = ap || null;

    try { await renderPositionSwitcher(); } catch (e) {}

    if (!_candidateId) {
      if ($emptyTitle) $emptyTitle.textContent = 'Aday seçilmedi';
      if ($emptyDesc) $emptyDesc.textContent = 'Pipeline veya havuz panelinden bir aday açın. URL\'de ?id= parametresiyle doğrudan bağlantı da kullanabilirsiniz.';
      showState('empty');
      return;
    }

    var res = await window.HRData.getCandidate(_candidateId);
    if (!res || res.error || !res.data) {
      if ($emptyTitle) $emptyTitle.textContent = 'Aday bulunamadı';
      if ($emptyDesc) $emptyDesc.textContent = 'Bu ID\'ye sahip bir aday yok ya da yüklenemedi.';
      showState('empty');
      return;
    }
    _candidate = res.data;

    try {
      var thr = await window.HRData.getMessageThreads();
      if (thr && thr.data) _threads = thr.data;
    } catch (e) { /* ignore */ }

    showState('content');
    renderHero();
    renderProfile();
    activateTab('profile');
    bindEvents();

    try {
      var p = new URLSearchParams(window.location.search);
      var tab = p.get('tab');
      if (tab && ['profile', 'notes', 'messages', 'match'].indexOf(tab) !== -1) {
        activateTab(tab);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
