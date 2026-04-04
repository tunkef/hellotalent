/* global _escHtml, _loadedDBData, canonicalizeRole, currentUser, formatBrandDisplay, getCurrentEmployerDisplayFromExperiences, normalizeForDisplay, refreshVisibilitySummary, selectedCalismaTipleri, selectedCareerTypes, selectedLocations, selectedMusaitlik, updateMerkezVisState, val */
// ═══════════════════════════════════════════════════
// profil-summary.js — Dashboard Summary, Merkez Cards, Completion & Score
// Extracted from profil-ui.js to reduce change-risk.
// Handles: profile summary card, merkez bento cards, identity card,
// bento rings, completion calculation, profile score, and their UI updates.
// Depends on: val + currentUser (profil-core.js),
//   _escHtml + formatBrandDisplay + canonicalizeRole + normalizeForDisplay
//   + selectedCalismaTipleri/Musaitlik/Locations/CareerTypes (profil-ui.js),
//   getCurrentEmployerDisplayFromExperiences + refreshVisibilitySummary (profil.html),
//   updateMerkezVisState (profil-visibility.js)
// ═══════════════════════════════════════════════════

function updateDashboardSummary(profile, experiences) {
  var psName = document.getElementById('ps-name');
  if (psName) psName.textContent = profile.full_name || '';
  var psCityText = document.getElementById('ps-city-text');
  if (psCityText) psCityText.textContent = profile.adres_il || '';
  var ps = document.getElementById('profile-summary');
  if (ps) ps.style.display = '';
  var dep = document.getElementById('dash-empty-prompt');
  if (dep) dep.style.display = 'none';
  var dc = document.getElementById('dash-content');
  if (dc) dc.style.display = '';
  // Role + Company stacked display (Decision: remove @ pattern)
  var psRole = document.getElementById('ps-role');
  var psCompany = document.getElementById('ps-company');
  if (experiences && experiences.length > 0) {
    var latest = experiences[0];
    var rawRole = latest.pozisyon || '';
    var roleMatch = canonicalizeRole(rawRole);
    if (psRole) psRole.textContent = roleMatch ? roleMatch.display : normalizeForDisplay(rawRole);
    // Company display: prefer marka, show group in parens if both exist
    var brandName = latest.marka || '';
    var companyName = latest.sirket_adi || latest.sirket || '';
    var companyDisplay = '';
    if (brandName && companyName && brandName !== companyName) {
      companyDisplay = normalizeForDisplay(brandName) + ' (' + normalizeForDisplay(companyName) + ')';
    } else if (brandName) {
      companyDisplay = normalizeForDisplay(brandName);
    } else if (companyName) {
      companyDisplay = normalizeForDisplay(companyName);
    }
    if (psCompany) psCompany.textContent = companyDisplay;
  } else {
    if (psRole) psRole.textContent = '';
    if (psCompany) psCompany.textContent = '';
  }
  // Update completion
  updateCompletionUI();
  refreshVisibilitySummary();
}

// ═══════════════════════════════════════════════════
// PROFIL MERKEZI CARD POPULATORS
// ═══════════════════════════════════════════════════

function updateMerkezCards() {
  // ── Card 1: Kişisel Bilgiler ──
  var name = val('f-adsoyad');
  var city = val('f-adresil');
  var phone = val('f-telefon');
  var linkedin = val('f-linkedin');
  var gender = val('f-cinsiyet');
  var birthYear = val('f-dogumyili');

  var p1 = document.getElementById('mk-preview-1');
  var e1 = document.getElementById('mk-empty-1');
  var filledCount1 = [name, phone, gender, birthYear, city, linkedin].filter(Boolean).length;

  if (filledCount1 > 0 && p1) {
    var html1 = '';
    if (name) html1 += '<div class="data-line">' + _escHtml(name) + '</div>';
    var meta1 = [];
    if (city) meta1.push(city);
    if (birthYear) meta1.push(birthYear + ' do\u011Fumlu');
    if (gender) meta1.push(gender);
    if (meta1.length > 0) html1 += '<div class="data-sub">' + _escHtml(meta1.join(' \u00B7 ')) + '</div>';
    var badges1 = [];
    if (phone) badges1.push('Telefon');
    if (linkedin) badges1.push('LinkedIn');
    if (badges1.length > 0) html1 += '<div>' + badges1.map(function(b) { return '<span class="data-ok">' + _escHtml(b) + '</span>'; }).join('') + '</div>';
    p1.innerHTML = html1;
    p1.style.display = '';
    if (e1) e1.style.display = 'none';
  } else {
    if (p1) p1.style.display = 'none';
    if (e1) e1.style.display = 'block';
  }
  var pct1 = Math.round((filledCount1 / 6) * 100);
  pct1 = Math.round(pct1 / 10) * 10;
  updateBentoRing(1, pct1);

  // ── Card 2: Deneyim ──
  var cbNoExp = document.getElementById('cb-no-experience');
  var expCards = document.querySelectorAll('.exp-card');
  var p2 = document.getElementById('mk-preview-2');
  var e2 = document.getElementById('mk-empty-2');

  if (cbNoExp && cbNoExp.checked) {
    if (p2) { p2.innerHTML = '<span style="font-style:italic;color:#c4c4c4;">\u0130lk i\u015F deneyimini ar\u0131yor</span>'; p2.style.display = ''; }
    if (e2) e2.style.display = 'none';
    updateBentoRing(2, 100);
  } else if (expCards.length > 0) {
    var firstId = expCards[0].id + '-';
    var role = val(firstId + 'pozisyon');
    var company = document.getElementById(firstId + 'sirket');
    var compVal = company ? (company.dataset.resolvedMarka || company.value || '') : '';
    var startY = val(firstId + 'basyil');
    var html2 = '';
    if (role) html2 += '<div class="data-line">' + _escHtml(role) + '</div>';
    if (compVal) html2 += '<div class="data-sub">' + _escHtml(compVal) + '</div>';
    if (startY) html2 += '<div class="data-sub" style="font-family:\'DM Mono\',monospace;font-size:10px;">' + _escHtml(startY) + ' \u2014 Devam</div>';
    if (expCards.length > 1) html2 += '<div class="data-sub" style="opacity:0.6">+' + (expCards.length - 1) + ' deneyim daha</div>';
    if (p2) { p2.innerHTML = html2; p2.style.display = ''; }
    if (e2) e2.style.display = 'none';
    updateBentoRing(2, 100);
  } else {
    if (p2) p2.style.display = 'none';
    if (e2) e2.style.display = 'block';
    updateBentoRing(2, 0);
  }

  // ── Card 3: Eğitim & Dil ──
  var eduCount = _countFilledRows('#edu-rows-container', ['seviye', 'okul']);
  var langCount = _countFilledRows('#lang-rows-container', ['dil']);
  var certCount = _countFilledRows('#cert-rows-container', ['adi']);
  var p3 = document.getElementById('mk-preview-3');
  var e3 = document.getElementById('mk-empty-3');

  if ((eduCount > 0 || langCount > 0 || certCount > 0) && p3) {
    var html3 = '';
    var eduRows = document.querySelectorAll('#edu-rows-container .dynamic-row');
    var firstEduFilled = null;
    for (var i = 0; i < eduRows.length; i++) {
      var r = eduRows[i];
      var ok = r.querySelector('[id$="-okul"]');
      var sev = r.querySelector('[id$="-seviye"]');
      if ((ok && ok.value && ok.value.trim()) || (sev && sev.value && sev.value.trim())) {
        firstEduFilled = r;
        break;
      }
    }
    if (firstEduFilled && eduCount > 0) {
      var eduSchool = firstEduFilled.querySelector('[id$="-okul"]');
      var eduBolum = firstEduFilled.querySelector('[id$="-bolum"]');
      var eduSeviye = firstEduFilled.querySelector('[id$="-seviye"]');
      var schoolName = eduSchool ? eduSchool.value.trim() : '';
      var bolumName = eduBolum ? eduBolum.value.trim() : '';
      var seviyeName = eduSeviye ? eduSeviye.value : '';
      if (schoolName) {
        html3 += '<div class="data-line">' + _escHtml(schoolName);
        if (bolumName) html3 += ' \u00B7 ' + _escHtml(bolumName);
        html3 += '</div>';
      }
      if (eduCount > 1) html3 += '<div class="data-sub">+' + (eduCount - 1) + ' e\u011Fitim daha</div>';
    }
    var langRows = document.querySelectorAll('#lang-rows-container .dynamic-row');
    var langPills = [];
    langRows.forEach(function(row) {
      var dilInput = row.querySelector('[id$="-dil"]');
      var sevInput = row.querySelector('[id$="-seviye"]');
      if (dilInput && dilInput.value && dilInput.value.trim()) {
        var langText = dilInput.value.trim();
        if (sevInput && sevInput.value) langText += ' (' + sevInput.value + ')';
        langPills.push(langText);
      }
    });
    if (langPills.length > 0) {
      html3 += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">' + langPills.map(function(l) { return '<span class="data-pill">' + _escHtml(l) + '</span>'; }).join('') + '</div>';
    }
    if (certCount > 0) html3 += '<div class="data-sub">' + certCount + ' sertifika</div>';
    p3.innerHTML = html3;
    p3.style.display = '';
    if (e3) e3.style.display = 'none';
  } else {
    if (p3) p3.style.display = 'none';
    if (e3) e3.style.display = 'block';
  }
  var filled3 = [eduCount > 0, langCount > 0].filter(Boolean).length;
  updateBentoRing(3, Math.round((filled3 / 2) * 100));

  // ── Card 4: Tercihler & Lokasyon ──
  var hasCalisma = typeof selectedCalismaTipleri !== 'undefined' && selectedCalismaTipleri.length > 0;
  var hasMusaitlik = typeof selectedMusaitlik !== 'undefined' && !!selectedMusaitlik;
  var hasTarget = (function() {
    var rows = document.querySelectorAll('#target-roles-container .dynamic-row');
    for (var _i = 0; _i < rows.length; _i++) {
      var sel = rows[_i].querySelector('select[id$="-unvan"]');
      if (sel && sel.value) return true;
    }
    return false;
  })();
  var hasCareer = typeof selectedCareerTypes !== 'undefined' && selectedCareerTypes.length > 0;
  var cityKeys = typeof selectedLocations !== 'undefined' ? Object.keys(selectedLocations) : [];

  var p4 = document.getElementById('mk-preview-4');
  var e4 = document.getElementById('mk-empty-4');
  var pills4 = [];
  if (hasCalisma) selectedCalismaTipleri.forEach(function(t) { pills4.push(t); });
  if (hasMusaitlik) pills4.push(selectedMusaitlik);
  if (hasTarget) pills4.push('Hedef pozisyon');
  if (hasCareer) pills4.push('Kariyer y\u00F6nelimi');
  if (cityKeys.length > 0) {
    var showCities = cityKeys.slice(0, 4);
    showCities.forEach(function(c) { pills4.push(c); });
    if (cityKeys.length > 4) pills4.push('+' + (cityKeys.length - 4) + ' \u015Fehir daha');
  }

  if (pills4.length > 0 && p4) {
    p4.innerHTML = pills4.map(function(t) { return '<span class="data-pill">' + _escHtml(String(t)) + '</span>'; }).join('');
    p4.style.display = '';
    if (e4) e4.style.display = 'none';
  } else {
    if (p4) p4.style.display = 'none';
    if (e4) e4.style.display = 'block';
  }
  var hasLocations = cityKeys.length > 0;
  var filled4 = [hasCalisma, hasMusaitlik, hasTarget, hasCareer, hasLocations].filter(Boolean).length;
  updateBentoRing(4, Math.round((filled4 / 5) * 100));

  // Update identity card
  updateMerkezIdentity();
}

function updateBentoRing(step, pct) {
  var container = document.getElementById('mk-ring-' + step);
  if (!container) return;

  if (pct >= 100) {
    while (container.firstChild) container.removeChild(container.firstChild);
    container.classList.add('complete');
    var done = document.createElement('div');
    done.className = 'ring-done';
    var track = document.createElement('div');
    track.className = 'mk-bar-track';
    var barFill = document.createElement('div');
    barFill.className = 'mk-bar-fill';
    barFill.style.width = '100%';
    track.appendChild(barFill);
    var label = document.createElement('span');
    label.className = 'mk-bar-pct';
    label.textContent = '\u2713';
    done.appendChild(track);
    done.appendChild(label);
    container.appendChild(done);
    return;
  }

  var fill = container.querySelector('.mk-bar-fill');
  var label = container.querySelector('.mk-bar-pct');
  if (fill) fill.style.width = Math.min(pct, 100) + '%';
  if (label) label.textContent = pct + '%';
}


function _countFilledRows(containerSelector, fieldSuffixes) {
  var rows = document.querySelectorAll(containerSelector + ' .dynamic-row');
  var count = 0;
  rows.forEach(function(row) {
    var filled = fieldSuffixes.some(function(suffix) {
      var input = row.querySelector('[id$="-' + suffix + '"]');
      return input && input.value && input.value.trim() !== '';
    });
    if (filled) count++;
  });
  return count;
}

function updateMerkezIdentity() {
  // Name
  var nameEl = document.getElementById('merkez-name');
  if (nameEl) nameEl.textContent = val('f-adsoyad') || '\u2014';

  // Avatar initials (fallback only when no image is present)
  var avatarEl = document.getElementById('merkez-avatar');
  if (avatarEl && !avatarEl.querySelector('img')) {
    var fullName = val('f-adsoyad') || '';
    var initials = fullName.split(/\s+/).map(function(w) { return w.charAt(0).toUpperCase(); }).join('').substring(0, 2);
    avatarEl.textContent = initials || '?';
  }

  // Role + Company from latest experience
  var roleEl = document.getElementById('merkez-role');
  var companyEl = document.getElementById('merkez-company');
  var expCards = document.querySelectorAll('.exp-card');
  var cbNoExp = document.getElementById('cb-no-experience');
  var hasCurrentEmployer = getCurrentEmployerDisplayFromExperiences(_loadedDBData ? _loadedDBData.experiences : null);

  if (hasCurrentEmployer && expCards.length > 0) {
    var firstId = expCards[0].id + '-';
    var rawRole = val(firstId + 'pozisyon');
    var roleMatch = canonicalizeRole(rawRole);
    if (roleEl) roleEl.textContent = roleMatch ? roleMatch.display : normalizeForDisplay(rawRole);

    var comp = document.getElementById(firstId + 'sirket');
    var brandName = comp ? (comp.dataset.resolvedMarka || '') : '';
    var companyName = comp ? (comp.dataset.resolvedSirket || comp.value || '') : '';
    var compDisplay = formatBrandDisplay(brandName, companyName) || normalizeForDisplay(companyName);
    if (companyEl) companyEl.textContent = compDisplay;
  } else if (cbNoExp && cbNoExp.checked) {
    if (roleEl) roleEl.textContent = 'İş tecrübesi yok';
    if (companyEl) companyEl.textContent = '';
  } else if (!hasCurrentEmployer) {
    if (roleEl) roleEl.textContent = 'Şu an çalışmıyor';
    if (companyEl) companyEl.textContent = '';
  } else if (cbNoExp && cbNoExp.checked) {
    if (roleEl) roleEl.textContent = '';
    if (companyEl) companyEl.textContent = '';
  }

  // Show/hide Merkez current employer visibility toggle based on experience state
  var merkezHideRow = document.getElementById('merkez-hide-row');
  if (merkezHideRow) {
    if (cbNoExp && cbNoExp.checked) {
      merkezHideRow.style.display = 'none';
    } else {
      merkezHideRow.style.display = '';
    }
  }

  // Show/hide role line based on whether role text exists
  var roleLine = document.getElementById('merkez-role-line');
  if (roleLine) {
    var hasRole = roleEl && roleEl.textContent && roleEl.textContent !== '';
    roleLine.style.display = hasRole ? '' : 'none';
    // Hide separator if no company
    var sep = roleLine.querySelector('.m-role-sep');
    if (sep) sep.style.display = (companyEl && companyEl.textContent) ? '' : 'none';
  }

  // City badge
  var cityBadge = document.getElementById('merkez-city-badge');
  var cityText = document.getElementById('merkez-city-text');
  var cityVal = val('f-adresil');
  if (cityBadge) cityBadge.style.display = cityVal ? '' : 'none';
  if (cityText) cityText.textContent = cityVal || '';

  // Experience badge (years)
  var expBadge = document.getElementById('merkez-exp-badge');
  var expText = document.getElementById('merkez-exp-text');
  if (expCards.length > 0) {
    if (expBadge) expBadge.style.display = '';
    if (expText) expText.textContent = expCards.length + ' deneyim';
  } else {
    if (expBadge) expBadge.style.display = 'none';
  }

  // Show identity card
  var idCard = document.getElementById('merkez-identity');
  if (idCard && val('f-adsoyad')) idCard.style.display = '';
  if (typeof updateMerkezVisState === 'function') updateMerkezVisState();
}

// ═══════════════════════════════════════════════════
// TASK 13: DASHBOARD + PROFILE COMPLETION
// ═══════════════════════════════════════════════════

function calculateCompletion() {
  // Mirrors backend compute_candidate_profile_completion() exactly.
  // Weights must stay in sync with migration 039.
  var score = 0;

  // Identity (20 points)
  if (val('f-adsoyad')) score += 10;       // full_name
  if (val('f-telefon')) score += 5;        // telefon
  if (val('f-adresil')) score += 5;        // adres_il

  // Contact (5 points)
  if (val('f-linkedin')) score += 5;       // linkedin

  // Experiences (25 points)
  var cbNoExp = document.getElementById('cb-no-experience');
  if (cbNoExp && cbNoExp.checked) { score += 25; }
  else if (document.querySelectorAll('.exp-card').length > 0 && val(document.querySelector('.exp-card').id + '-sirket')) { score += 25; }

  // Education (15 points)
  if (document.querySelectorAll('#edu-rows-container .dynamic-row').length > 0) score += 15;

  // Languages (10 points)
  if (document.querySelectorAll('#lang-rows-container .dynamic-row').length > 0) score += 10;

  // Work preferences (15 points)
  if (selectedMusaitlik || selectedCalismaTipleri.length > 0) score += 15;

  // Locations (10 points)
  if (Object.keys(selectedLocations).length > 0) score += 10;

  // Cap at 100
  return Math.min(score, 100);
}

// ── PROFILE SCORE (0-100) — recruiter-side quality signal ──
// Separate from completion %. Rewards structured, recruiter-useful data.
function calculateProfileScore() {
  var score = 0;

  // ── A) Basic Profile — 15 points ──
  if (val('f-adsoyad'))   score += 3;
  if (val('f-telefon'))   score += 3;
  if (val('f-adresil'))   score += 4;
  if (val('f-dogumyili')) score += 2;
  if (val('f-linkedin'))  score += 3;

  // ── B) Experience — 35 points ──
  var cbNoExp = document.getElementById('cb-no-experience');
  var expCards = document.querySelectorAll('.exp-card');
  if (cbNoExp && cbNoExp.checked) {
    // No-experience path: fair flat award (max achievable ~85/100)
    score += 20;
  } else if (expCards.length > 0) {
    var firstId = expCards[0].id + '-';
    score += 10;                                    // at least one card
    if (val(firstId + 'pozisyon')) score += 8;       // latest position
    if (val(firstId + 'sirket'))   score += 8;       // latest company
    if (val(firstId + 'basyil'))   score += 5;       // start date present
    // Team size: score if visible and filled; if field hidden for this department, no penalty
    var takimWrap = document.getElementById(expCards[0].id + '-takim-wrap');
    var takimVisible = takimWrap && takimWrap.style.display !== 'none';
    if (takimVisible) {
      if (val(firstId + 'takim')) score += 2;
    } else {
      score += 2; // Field not relevant for this department — no penalty
    }
    // Description (iş tanımı) — high-value field for profile quality
    if (val(firstId + 'desc')) score += 2;
  }

  // ── C) Education & Language — 15 points ──
  if (document.querySelectorAll('#edu-rows-container .dynamic-row').length > 0) score += 8;
  if (document.querySelectorAll('#lang-rows-container .dynamic-row').length > 0) score += 7;

  // ── D) Preferences — 20 points ──
  if (selectedCalismaTipleri.length > 0)           score += 4;
  if (selectedMusaitlik)                           score += 4;
  if (Object.keys(selectedLocations).length > 0)   score += 4;
  if (val('f-seyahat'))                            score += 3;
  if (val('f-vardiya'))                            score += 3;
  if (val('f-ihbar'))                              score += 2;

  // ── E) Targeting / Intent — 15 points ──
  var _trRows = document.querySelectorAll('#target-roles-container .dynamic-row');
  var _hasFilledTarget = false;
  for (var _ti = 0; _ti < _trRows.length; _ti++) {
    var _tSel = _trRows[_ti].querySelector('select[id$="-unvan"]');
    if (_tSel && _tSel.value) { _hasFilledTarget = true; break; }
  }
  if (_hasFilledTarget) score += 8;
  if (selectedCareerTypes.length > 0)              score += 7;

  return Math.min(score, 100);
}

function getProfileScoreHints() {
  var hints = [];
  var cbNoExp = document.getElementById('cb-no-experience');
  var expCards = document.querySelectorAll('.exp-card');
  var hasExp = (cbNoExp && cbNoExp.checked) || expCards.length > 0;

  if (!hasExp)
    hints.push('Deneyim bilgisi ekle veya deneyimsiz kutusunu isaretle');
  var _hintRows = document.querySelectorAll('#target-roles-container .dynamic-row');
  var _hintHasTarget = false;
  for (var _hi = 0; _hi < _hintRows.length; _hi++) {
    var _hSel = _hintRows[_hi].querySelector('select[id$="-unvan"]');
    if (_hSel && _hSel.value) { _hintHasTarget = true; break; }
  }
  if (!_hintHasTarget)
    hints.push('Hedef pozisyon ekle \u2014 markalar seni daha kolay bulur');
  if (selectedCareerTypes.length === 0)
    hints.push('Kariyer y\u00f6nelimi se\u00e7 (Yukar\u0131 Terfi veya Yatay Ge\u00e7i\u015f)');
  if (Object.keys(selectedLocations).length === 0)
    hints.push('Tercih ettigin sehirleri sec');
  if (!val('f-linkedin'))
    hints.push('LinkedIn profilini ekle');
  if (selectedCalismaTipleri.length === 0)
    hints.push('Calisma tipini sec');

  // No-exp specific: nudge toward education/language depth
  if (cbNoExp && cbNoExp.checked) {
    if (document.querySelectorAll('#edu-rows-container .dynamic-row').length === 0)
      hints.push('Egitim bilgisi ekle — deneyim olmadan egitim cok onemli');
    if (document.querySelectorAll('#lang-rows-container .dynamic-row').length === 0)
      hints.push('Dil bilgisi ekle — rakiplerinden one gec');
  }

  return hints;
}

function updateScoreUI() {
  var sc = calculateProfileScore();
  var hints = getProfileScoreHints();
  // Merkez stat cards removed; score/completion now shown per-section in bento rings.
  // calculateProfileScore/getProfileScoreHints kept for potential future use (e.g. genel panel).
  void sc;
  void hints;
}

function updateCompletionUI() {
  var pct = calculateCompletion();

  // Genel panel: progress bar + text
  var gFill = document.getElementById('g-completion-fill');
  if (gFill) gFill.style.width = pct + '%';
  var gPctText = document.getElementById('completion-pct');
  if (gPctText) gPctText.textContent = pct + '%';

  // Merkez completion/score now shown per-section in bento rings (no separate stat row).
  updateScoreUI();
}

// ═══════════════════════════════════════════════════
// MINI ROZET GALERİSİ — Reusable badge grid renderer
// Called by profil-genel.js Mini Eğitim Dashboard card.
// gallery: array of {id, slug, title, description, icon_key, badge_tier, earned}
// container: DOM element to render into (already in DOM)
// Safe: BADGE_ICONS is a hardcoded SVG constant map — no user data via innerHTML
// ═══════════════════════════════════════════════════

window._htRenderMiniRozetGalery = function(container, gallery) {
  if (!container || !gallery || !gallery.length) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  /* BADGE_ICONS is global from profil-studio.js (loaded later, called at runtime) */
  var iconMap = (typeof BADGE_ICONS !== 'undefined' ? BADGE_ICONS : {}); // eslint-disable-line no-undef

  for (var i = 0; i < gallery.length; i++) {
    var b = gallery[i];
    var tierCls = b.badge_tier === 'advanced' ? ' gh-edu-badge--advanced'
                : b.badge_tier === 'milestone' ? ' gh-edu-badge--milestone' : '';
    var stateCls = b.earned ? (' gh-edu-badge--earned' + tierCls) : ' gh-edu-badge--locked';

    var chip = document.createElement('div');
    chip.className = 'gh-edu-badge' + stateCls;
    chip.title = b.earned ? b.title : (b.title + ' (Kilitli)');

    /* Safe: iconMap values are hardcoded SVG constants from BADGE_ICONS — no user data */
    var svgStr = iconMap[b.icon_key] || iconMap['star'] || '';
    if (svgStr) chip.innerHTML = svgStr;

    container.appendChild(chip);
  }
};
