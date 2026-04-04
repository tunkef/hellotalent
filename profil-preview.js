/* global _escHtml, _loadedDBData, calculateCompletion, CAREER_TYPE_LABELS, currentUser, val */
// ═══════════════════════════════════════════════════
// profil-preview.js — Profile Preview Drawer
// Extracted from profil-ui.js to reduce change-risk.
// Renders the right-slide drawer showing how the
// candidate's profile appears to employers.
// Exports: window.openProfilePreview, window.closeProfilePreview
// Depends on: _escHtml (profil-ui.js), _loadedDBData + currentUser (profil-core.js)
// Note: innerHTML usage is intentional — all user data is escaped via _escHtml()
// ═══════════════════════════════════════════════════

function openProfilePreview() {
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

  var html = '';

  // ── HERO CARD ──
  var initials = (p.full_name || '').split(/\s+/).map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase() || '?';
  var avatarInner = showPersonalInfo && p.avatar_url
    ? '<img src="' + _escHtml(p.avatar_url) + '" alt="">'
    : (showPersonalInfo ? initials : '?');

  var currentRole = '', currentCompany = '';
  if (exps.length > 0) {
    var latest = exps[0];
    currentRole = latest.pozisyon || '';
    var brand = latest.marka || '';
    var company = latest.sirket_adi || '';
    currentCompany = brand && company && brand !== company
      ? brand + ' (' + company + ')'
      : brand || company;
  }

  var totalYears = 0;
  if (showPersonalInfo) {
    exps.forEach(function(e) {
      var startY = parseInt(e.baslangic_yil, 10) || 0;
      var endY = e.devam_ediyor ? new Date().getFullYear() : (parseInt(e.bitis_yil, 10) || startY);
      totalYears += Math.max(0, endY - startY);
    });
  }

  html += '<div class="pp-hero-card">';
  var ppGlow = (p && p.is_active !== false) ? ' glow-active' : '';
  html += '<div class="pp-avatar' + ppGlow + '">' + avatarInner + '</div>';
  html += '<div style="flex:1;min-width:0;">';
  html += '<div class="pp-name">' + _escHtml(showPersonalInfo ? (p.full_name || '\u2014') : '\u25CF\u25CF\u25CF\u25CF\u25CF \u25CF\u25CF\u25CF\u25CF\u25CF\u25CF') + '</div>';
  if (currentRole) {
    html += '<div class="pp-role"><strong>' + _escHtml(currentRole) + '</strong>';
    if (currentCompany) html += ' \u00B7 ' + _escHtml(showPersonalInfo ? currentCompany : '\u25CF\u25CF\u25CF\u25CF\u25CF');
    html += '</div>';
  }
  html += '<div class="pp-meta">';
  if (showPersonalInfo && p.adres_il) {
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    html += _escHtml(p.adres_il);
  }
  if (showPersonalInfo && totalYears > 0) {
    html += (p.adres_il ? '<span style="opacity:0.3;margin:0 3px;">\u00B7</span>' : '');
    html += totalYears + ' y\u0131l deneyim';
  }
  if (showAktifBadge) {
    html += '<span class="pp-status-badge active"><span class="dot"></span>Aktif i\u015F ar\u0131yor</span>';
  }
  html += '</div></div></div>';

  // ── İLETİŞİM BAR (horizontal, right after hero) ──
  var _email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '';
  var _phone = p.telefon || '';
  if (_email || _phone) {
    html += '<div style="display:flex;align-items:center;gap:16px;padding:10px 16px;background:var(--bg-elevated,#F7F6F4);border-radius:10px;margin:4px 0 8px;">';
    if (showPersonalInfo) {
      if (_email) {
        html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text);">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
        html += _escHtml(_email);
        html += '</div>';
      }
      if (_phone) {
        html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text);">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.69 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.76.33 1.55.56 2.36.69A2 2 0 0 1 22 16.92z"/></svg>';
        html += _escHtml(_phone);
        html += '</div>';
      }
    } else {
      var _maskedEmail = '';
      if (_email) { var _parts = _email.split('@'); if (_parts.length === 2) _maskedEmail = _parts[0].charAt(0) + '****@' + _parts[1]; }
      var _maskedPhone = '';
      if (_phone && _phone.length >= 6) _maskedPhone = _phone.substring(0, 3) + ' *** ** ' + _phone.substring(_phone.length - 2);
      if (_maskedEmail) {
        html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
        html += _escHtml(_maskedEmail);
        html += '</div>';
      }
      if (_maskedPhone) {
        html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.69 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.76.33 1.55.56 2.36.69A2 2 0 0 1 22 16.92z"/></svg>';
        html += _escHtml(_maskedPhone);
        html += '</div>';
      }
    }
    html += '</div>';
  }

  // ── BIO ──
  var bioText = val ? val('f-bio') : '';
  if (bioText) {
    html += '<div style="padding:12px 16px;margin:4px 0;background:var(--bg-elevated,#F7F6F4);border-radius:10px;font-family:Plus Jakarta Sans,sans-serif;font-size:13px;color:var(--text);line-height:1.7;font-style:italic;">"' + _escHtml(bioText) + '"</div>';
  }

  // ── COMPLETION BADGE (işveren görür) ──
  var ppPct = typeof calculateCompletion === 'function' ? calculateCompletion() : 0;
  var ppColor = ppPct >= 80 ? 'var(--green,#059669)' : ppPct >= 45 ? 'var(--navy)' : 'var(--verm)';
  html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;margin:-4px 0 8px;background:var(--bg-elevated,#F7F6F4);border-radius:10px;">';
  html += '<div style="position:relative;width:36px;height:36px;">';
  html += '<svg viewBox="0 0 36 36" style="transform:rotate(-90deg);"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--border,#E5E3DF)" stroke-width="3"/>';
  html += '<circle cx="18" cy="18" r="15" fill="none" stroke="' + ppColor + '" stroke-width="3" stroke-dasharray="' + (ppPct * 0.9425) + ' 94.25" stroke-linecap="round"/></svg>';
  html += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:9px;font-weight:600;color:' + ppColor + ';">' + ppPct + '</div></div>';
  html += '<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;font-weight:600;color:var(--text);">Profil Doluluk</div>';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;color:var(--muted);">';
  html += ppPct >= 80 ? 'Güçlü profil — işverenler tarafından görülme şansın yüksek' : ppPct >= 45 ? 'İyi — birkaç alan daha tamamla, öne çık' : 'Profilini tamamla — işverenler seni görsün';
  html += '</div></div></div>';

  // ── Deneyim (FULL WIDTH) ──
  html += '<div class="pp-bento">';
  html += '<div class="pp-card span-2 accent-verm">';
  html += '<div class="pp-card-title">Deneyim</div>';
  if (exps.length > 0) {
    exps.forEach(function(e) {
      var role = e.pozisyon || '';
      var eBrand = e.marka || '';
      var eCompany = e.sirket_adi || '';
      var displayRaw = eBrand && eCompany && eBrand !== eCompany ? eBrand + ' (' + eCompany + ')' : eBrand || eCompany;
      var display = showPersonalInfo ? displayRaw : '\u25CF\u25CF\u25CF\u25CF\u25CF';
      var period = '';
      if (e.baslangic_yil) {
        period = (e.baslangic_ay ? e.baslangic_ay + ' ' : '') + e.baslangic_yil;
        if (e.devam_ediyor) { period += ' \u2014 Devam'; }
        else if (e.bitis_yil) { period += ' \u2014 ' + (e.bitis_ay ? e.bitis_ay + ' ' : '') + e.bitis_yil; }
      }
      html += '<div class="pp-exp">';
      html += '<div class="pp-exp-header">';
      html += '<div class="pp-exp-dot ' + (e.devam_ediyor ? 'active' : 'past') + '"></div>';
      html += '<div class="pp-exp-info">';
      html += '<div class="pp-exp-role">' + _escHtml(role) + '</div>';
      html += '<div class="pp-exp-company"><strong>' + _escHtml(display) + '</strong></div>';
      var details = [];
      if (e.rol_ailesi) details.push(e.rol_ailesi);
      if (e.istihdam_tipi) details.push(e.istihdam_tipi);
      if (e.kidem_seviyesi) details.push(e.kidem_seviyesi);
      if (details.length > 0) {
        html += '<div class="pp-exp-detail">' + _escHtml(details.join(' \u00B7 ')) + '</div>';
      }
      html += '</div>';
      if (period) html += '<div class="pp-exp-period">' + _escHtml(period) + '</div>';
      html += '</div>';
      if (e.description) {
        html += '<div class="pp-exp-desc">' + _escHtml(e.description) + '</div>';
      }
      html += '</div>';
    });
  } else if (db.no_experience) {
    html += '<div class="pp-empty">\u0130lk i\u015F deneyimini ar\u0131yor</div>';
  } else {
    html += '<div class="pp-empty">Hen\u00FCz eklenmedi</div>';
  }
  html += '</div>';
  html += '</div>';

  // ── E\u011Fitim & Dil (separate full-width row) ──
  html += '<div class="pp-bento">';
  html += '<div class="pp-card span-2 accent-green">';
  html += '<div class="pp-card-title">E\u011Fitim & Dil</div>';
  if (edus.length > 0) {
    edus.forEach(function(e) {
      html += '<div class="pp-edu">';
      html += '<div class="pp-edu-row"><div>';
      html += '<div class="pp-edu-name">' + _escHtml(showPersonalInfo ? (e.okul_adi || '') : '\u25CF\u25CF\u25CF\u25CF\u25CF') + '</div>';
      var sub = [];
      if (e.seviye) sub.push(e.seviye);
      if (e.bolum) sub.push(e.bolum);
      if (sub.length > 0) html += '<div class="pp-edu-sub">' + _escHtml(sub.join(' \u00B7 ')) + '</div>';
      html += '</div>';
      if (e.mezuniyet_yili) html += '<div class="pp-edu-year">' + _escHtml(e.mezuniyet_yili) + '</div>';
      html += '</div></div>';
    });
  }
  if (certs.length > 0) {
    certs.forEach(function(c) {
      html += '<div class="pp-edu" style="margin-top:6px;">';
      html += '<div class="pp-edu-row"><div>';
      html += '<div class="pp-edu-name" style="font-size:12px;">' + _escHtml(showPersonalInfo ? (c.egitim_adi || '') : '\u25CF\u25CF\u25CF\u25CF\u25CF') + '</div>';
      if (c.kurum) html += '<div class="pp-edu-sub">' + _escHtml(c.kurum) + '</div>';
      html += '</div>';
      if (c.yil) html += '<div class="pp-edu-year">' + _escHtml(c.yil) + '</div>';
      html += '</div></div>';
    });
  }
  if (langs.length > 0) {
    html += '<div class="pp-tags" style="margin-top:8px;">';
    langs.forEach(function(l) {
      html += '<span class="pp-tag">' + _escHtml(l.dil || '') + (l.seviye ? ' \u00B7 ' + _escHtml(l.seviye) : '') + '</span>';
    });
    html += '</div>';
  }
  if (edus.length === 0 && langs.length === 0 && certs.length === 0) {
    html += '<div class="pp-empty">Hen\u00FCz eklenmedi</div>';
  }
  html += '</div>';
  html += '</div>';

  // ── ROW 2: Tercihler & Lokasyon (full width) ──
  if (wp || locs.length > 0 || bi.length > 0) {
    html += '<div class="pp-bento">';
    html += '<div class="pp-card span-2 accent-navy">';
    html += '<div class="pp-card-title">Tercihler & Lokasyon</div>';
    var tags = [];
    if (wp) {
      if (wp.calisma_tipleri && wp.calisma_tipleri.length > 0) {
        wp.calisma_tipleri.forEach(function(t) { tags.push(t); });
      }
      if (wp.musaitlik) tags.push(wp.musaitlik);
      if (wp.tercih_segmentler && wp.tercih_segmentler.length > 0) {
        wp.tercih_segmentler.forEach(function(s) { tags.push(s); });
      }
      if (wp.career_type) {
        var _ctLabel = (typeof CAREER_TYPE_LABELS !== 'undefined' && CAREER_TYPE_LABELS[wp.career_type])
          ? CAREER_TYPE_LABELS[wp.career_type] : wp.career_type;
        tags.push(_ctLabel);
      }
      if (wp.travel_willingness) tags.push('\u2708 ' + wp.travel_willingness);
      if (wp.shift_flexibility) tags.push('\u23F0 ' + wp.shift_flexibility);
      if (wp.notice_period) tags.push('\u23F3 ' + wp.notice_period);
    }
    locs.forEach(function(loc) {
      if (loc.sehir) tags.push('\uD83D\uDCCD ' + loc.sehir);
    });
    if (bi.length > 0) {
      bi.slice(0, 5).forEach(function(b) { tags.push('\u2661 ' + b); });
    }
    if (tags.length > 0) {
      html += '<div class="pp-tags">';
      tags.forEach(function(t) {
        html += '<span class="pp-tag">' + _escHtml(t) + '</span>';
      });
      html += '</div>';
    }
    html += '</div></div>';
  }

  // ── ROW 3: CV + \u0130leti\u015Fim ──
  html += '<div class="pp-bento">';

  html += '<div class="pp-card accent-muted">';
  html += '<div class="pp-card-title">CV</div>';
  if (!showPersonalInfo) {
    html += '<div class="pp-empty">CV gizli</div>';
  } else if (p.cv_url && p.cv_filename) {
    html += '<div class="pp-cv-row">';
    html += '<div class="pp-cv-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
    html += '<a class="pp-cv-link" href="' + _escHtml(p.cv_url) + '" target="_blank" onclick="event.stopPropagation()">' + _escHtml(p.cv_filename) + '</a>';
    if (p.cv_uploaded_at) {
      html += '<div class="pp-cv-date">' + new Date(p.cv_uploaded_at).toLocaleDateString('tr-TR') + '</div>';
    }
    html += '</div>';
  } else {
    html += '<div class="pp-empty">CV y\u00FCklenmemi\u015F</div>';
  }
  html += '</div>';

  html += '</div>';

  // ── FOOTER ──
  var lastUpdated = p.updated_at ? new Date(p.updated_at).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
  html += '<div class="pp-footer">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  html += 'Son g\u00FCncelleme: ' + lastUpdated;
  html += '</div>';

  document.getElementById('pp-content').innerHTML = html; // all user data escaped via _escHtml()
  document.getElementById('pp-overlay').classList.add('open');
  document.getElementById('pp-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProfilePreview() {
  document.getElementById('pp-overlay').classList.remove('open');
  document.getElementById('pp-drawer').classList.remove('open');
  document.body.style.overflow = '';
}

// ── ESC key closes preview drawer ──
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var drawer = document.getElementById('pp-drawer');
    if (drawer && drawer.classList.contains('open')) {
      closeProfilePreview();
    }
  }
});
