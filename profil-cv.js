/* global collectCertificates, collectEducation, collectExperiences, collectLanguages, currentUser, EB_GARAMOND_BOLD_B64, EB_GARAMOND_ITALIC_B64, EB_GARAMOND_REGULAR_B64, ht_track, LEADERSHIP_SKILLS, monthIndexToName, ROLE_SKILLS_MAP, selectedBrandInterests, showToast, STORAGE, supabase, val, _loadedDBData */
// ═══════════════════════════════════════════════════
// profil-cv.js — Legacy CV Upload + Template-Driven PDF Generation
// K-066: AI CV optimize kaldırıldı. CV artık 100% template-driven
// (deterministic özet, kuralsal). Legacy upload (PDF/DOC/DOCX) opsiyonel kalır.
// Exports: initCVUpload, showCVUploaded, showCVEmpty, generateCV, normalizeCVData
// Depends on: STORAGE + val + currentUser (profil-core.js),
//   showToast + collect* + monthIndexToName + selectedBrandInterests (profil-ui.js),
//   supabase (CDN global), jsPDF (CDN global)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// CV UPLOAD (Supabase Storage)
// ═══════════════════════════════════════════════════

function initCVUpload() {
  var fileInput = document.getElementById('cv-file-input');
  var selectBtn = document.getElementById('btn-cv-select');
  var dropZone = document.getElementById('cv-drop-zone');
  var reuploadBtn = document.getElementById('btn-cv-reupload');
  var deleteBtn = document.getElementById('btn-cv-delete');
  if (!fileInput || !selectBtn) return;

  selectBtn.addEventListener('click', function(e) { e.preventDefault(); fileInput.click(); });
  fileInput.addEventListener('change', function() { if (fileInput.files[0]) uploadCV(fileInput.files[0]); });

  // Drag & drop
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.style.borderColor = 'var(--navy)'; });
    dropZone.addEventListener('dragleave', function() { dropZone.style.borderColor = ''; });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault(); dropZone.style.borderColor = '';
      if (e.dataTransfer.files[0]) uploadCV(e.dataTransfer.files[0]);
    });
  }

  if (reuploadBtn) reuploadBtn.addEventListener('click', function(e) { e.preventDefault(); fileInput.click(); });
  if (deleteBtn) deleteBtn.addEventListener('click', function(e) { e.preventDefault(); deleteCV(); });
}

// Track current CV storage path for cleanup on replace/delete
var currentCVStoragePath = null;

async function uploadCV(file) {
  if (file.size > 5 * 1024 * 1024) { showToast('Dosya 5MB\'dan b\u00fcy\u00fck olamaz', 'error'); return; }
  var allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  var ext = file.name.split('.').pop().toLowerCase();
  if (allowedTypes.indexOf(file.type) === -1 && ['pdf','doc','docx'].indexOf(ext) === -1) {
    showToast('Sadece PDF, DOC veya DOCX dosyas\u0131', 'error');
    return;
  }

  if (!currentUser) { showToast('Oturum hatas\u0131', 'error'); return; }
  var userId = currentUser.id;

  // Show uploading state
  var selectBtn = document.getElementById('btn-cv-select');
  if (selectBtn) { selectBtn.textContent = 'Y\u00fckleniyor...'; selectBtn.disabled = true; }

  try {
    // Delete old storage file if replacing
    if (currentCVStoragePath) {
      await supabase.storage.from(STORAGE.BUCKET).remove([currentCVStoragePath]).catch(function() {});
    }

    // Upload new file (path relative to bucket, no redundant prefix)
    var filePath = STORAGE.cvPath(userId, file.name);
    var uploadRes = await supabase.storage.from(STORAGE.BUCKET).upload(filePath, file, { upsert: true });
    if (uploadRes.error) throw uploadRes.error;

    // Store path (not public URL) — signed URL generated on demand
    var cvStoragePath = filePath;

    // Update DB with storage path instead of public URL
    var dbRes = await supabase.from('candidates').update({
      cv_url: cvStoragePath, cv_filename: file.name, cv_uploaded_at: new Date().toISOString()
    }).eq('user_id', userId);
    if (dbRes.error) {
      // Rollback: remove uploaded file since DB failed
      await supabase.storage.from(STORAGE.BUCKET).remove([filePath]).catch(function() {});
      throw dbRes.error;
    }

    currentCVStoragePath = cvStoragePath;
    /* In-memory truth sync */
    if (typeof _loadedDBData !== 'undefined' && _loadedDBData && _loadedDBData.profile) {
      _loadedDBData.profile.cv_url = cvStoragePath;
      _loadedDBData.profile.cv_filename = file.name;
      _loadedDBData.profile.cv_uploaded_at = new Date().toISOString();
    }
    // Generate signed URL for display (1 hour expiry)
    var signedRes = await supabase.storage.from(STORAGE.BUCKET).createSignedUrl(cvStoragePath, 3600);
    var displayUrl = (signedRes.data && signedRes.data.signedUrl) || '';
    showCVUploaded(displayUrl, new Date());
    ht_track('cv_upload_success', { file_type: ext });
    showToast('CV y\u00fcklendi \u2713', 'success');
  } catch (err) {
    if (window.Sentry) Sentry.captureException(err, { tags: { flow: 'cv-upload' } });
    console.error('[HT] CV upload error:', err);
    showToast('Y\u00fckleme hatas\u0131: ' + (err.message || 'Bilinmeyen hata'), 'error');
  }

  // Reset file input so re-selecting same file triggers change event
  var fileInput = document.getElementById('cv-file-input');
  if (fileInput) fileInput.value = '';
  if (selectBtn) { selectBtn.textContent = 'Dosya Se\u00e7'; selectBtn.disabled = false; }
}

async function deleteCV() {
  if (!currentUser) return;
  try {
    // Remove storage file first (best-effort)
    if (currentCVStoragePath) {
      await supabase.storage.from(STORAGE.BUCKET).remove([currentCVStoragePath]).catch(function() {});
      currentCVStoragePath = null;
    }
    // Clear DB columns
    var dbRes = await supabase.from('candidates').update({ cv_url: null, cv_filename: null, cv_uploaded_at: null }).eq('user_id', currentUser.id);
    if (dbRes.error) throw dbRes.error;
    /* In-memory truth sync — ayni oturumda normalizeCVData() bos source gorecek */
    if (typeof _loadedDBData !== 'undefined' && _loadedDBData && _loadedDBData.profile) {
      _loadedDBData.profile.cv_url = null;
      _loadedDBData.profile.cv_filename = null;
      _loadedDBData.profile.cv_uploaded_at = null;
    }
    showCVEmpty();
    ht_track('cv_deleted');
    showToast('CV silindi', 'success');
  } catch (err) {
    if (window.Sentry) Sentry.captureException(err, { tags: { flow: 'cv-delete' } });
    console.error('[HT] CV delete error:', err);
    showToast('Silme hatas\u0131', 'error');
  }
}

function showCVUploaded(cvUrl, date) {
  var dropZone = document.getElementById('cv-drop-zone');
  var uploaded = document.getElementById('cv-uploaded-state');
  var dropActions = document.getElementById('cv-drop-actions');
  var uploadedActions = document.getElementById('cv-uploaded-actions');
  if (dropZone) dropZone.style.display = 'none';
  if (dropActions) dropActions.style.display = 'none';
  if (uploadedActions) uploadedActions.style.display = 'flex';
  if (uploaded) {
    uploaded.style.display = 'block';
    var nameEl = document.getElementById('cv-uploaded-name');
    var dateEl = document.getElementById('cv-uploaded-date');
    if (nameEl) {
      nameEl.textContent = 'CV G\u00f6r\u00fcnt\u00fcle';
      nameEl.style.cursor = '';
      nameEl.style.color = '';
      nameEl.style.textDecoration = '';
      nameEl.onclick = null;
      if (cvUrl) {
        nameEl.style.cursor = 'pointer';
        nameEl.style.color = 'var(--verm)';
        nameEl.style.textDecoration = 'underline';
        nameEl.onclick = function() { window.open(cvUrl, '_blank', 'noopener,noreferrer'); };
      }
    }
    if (dateEl) dateEl.textContent = date ? date.toLocaleDateString('tr-TR') : '';
  }
}

function showCVEmpty() {
  var dropZone = document.getElementById('cv-drop-zone');
  var uploaded = document.getElementById('cv-uploaded-state');
  var dropActions = document.getElementById('cv-drop-actions');
  var uploadedActions = document.getElementById('cv-uploaded-actions');
  if (dropZone) dropZone.style.display = '';
  if (dropActions) dropActions.style.display = 'flex';
  if (uploaded) uploaded.style.display = 'none';
  if (uploadedActions) uploadedActions.style.display = 'none';
}

// ═══════════════════════════════════════════════════
// CV GENERATION — Tek Canonical ATS-Friendly Template
// ═══════════════════════════════════════════════════
// Section order: Header > Ozet > Deneyim > Egitim > Diller > Sertifikalar > Ilgi Alanlari
// Foto policy: avatar varsa header'da kucuk, yoksa text-only (layout ayni)
// Branding: yalnizca footer'da minimal "hellotalent.ai" notu
// K-066: Template-driven deterministic özet (AI yok). normalizeCVData().summary kuralsal üretilir.

/* ── Normalize helper: profil verisini CV data kontratina cevir ── */
function normalizeCVData() {
  var profile = (typeof _loadedDBData !== 'undefined' && _loadedDBData && _loadedDBData.profile) ? _loadedDBData.profile : {};
  var isim = val('f-adsoyad') || (profile.full_name || 'Ad Soyad');
  var tel = val('f-telefon') || profile.telefon || '';
  var email = currentUser ? currentUser.email : '';
  var linkedin = val('f-linkedin') || profile.linkedin || '';
  var city = val('f-adresil') || profile.adres_il || '';
  var avatarUrl = profile.avatar_url || '';

  /* Hedef rol */
  var targetRoleSel = document.querySelector('#target-roles-container select[id$="-unvan"]');
  var targetRole = targetRoleSel ? targetRoleSel.value : '';

  /* Deterministic ozet (AI yok — kuralsal template) */
  var exps = collectExperiences();
  var totalYears = 0;
  exps.forEach(function(e) {
    if (e.baslangic_yil) {
      var endY = e.devam_ediyor ? new Date().getFullYear() : (e.bitis_yil || new Date().getFullYear());
      totalYears += Math.max(0, endY - e.baslangic_yil);
    }
  });
  var latestRole = exps.length > 0 ? (exps[0].pozisyon || '') : '';
  var latestCompany = exps.length > 0 ? (exps[0].marka || exps[0].sirket || '') : '';
  var summary = '';
  if (totalYears > 0 && latestRole) {
    summary = totalYears + ' y\u0131ll\u0131k perakende deneyimine sahip';
    if (latestCompany) summary += ', en son ' + latestCompany + ' b\u00fcnyesinde ' + latestRole + ' olarak g\u00f6rev yapan';
    else summary += ' ' + latestRole;
    summary += ' bir profesyonel.';
    if (targetRole && targetRole !== latestRole) summary += ' ' + targetRole + ' pozisyonuna y\u00f6nelik kariyer hedefi.';
  } else if (targetRole) {
    summary = targetRole + ' pozisyonuna y\u00f6nelik, perakende sekt\u00f6r\u00fcne ilgi duyan bir aday.';
  }

  return {
    isim: isim,
    tel: tel,
    email: email,
    linkedin: linkedin,
    city: city,
    avatarUrl: avatarUrl,
    targetRole: targetRole,
    summary: summary,
    experiences: exps,
    education: collectEducation(),
    languages: collectLanguages(),
    certificates: collectCertificates(),
    brandInterests: (typeof selectedBrandInterests !== 'undefined' && selectedBrandInterests.length > 0) ? selectedBrandInterests : [],
    cvUrl: profile.cv_url || '',
    cvFilename: profile.cv_filename || ''
  };
}

/* ── Section heading helper — Tuna CV pattern (K-066) ── */
/* Bold uppercase black title, hairline divider, no color.   */
function _cvSection(doc, title, M, cW, Y) {
  if (Y > 268) { doc.addPage(); Y = 20; }
  Y += 2;
  doc.setFontSize(10);
  doc.setFont('EBGaramond', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title.toLocaleUpperCase('tr-TR'), M, Y);
  Y += 1.2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  doc.line(M, Y, M + cW, Y);
  Y += 4.5;
  doc.setFontSize(9.5);
  doc.setTextColor(40, 40, 40);
  doc.setFont('EBGaramond', 'normal');
  return Y;
}

/* ── K-067 Pillar A: EB Garamond Turkish subset TTF embed (jsPDF VFS) ──
   Türkçe karakterler (İ, ı, ğ, ş, ç, ö, ü) default WinAnsi encoding'de bozuk.
   EB Garamond 3 weight × Turkish subset → addFileToVFS + addFont ile embed.
   Bir kez çağrılır (idempotent), ikinci çağrıda no-op. */
function _ensureCVFont(doc) {
  if (_ensureCVFont._done) return;
  if (typeof window.EB_GARAMOND_REGULAR_B64 !== 'string') {
    console.warn('[HT] eb-garamond-vfs.js yüklenmedi — PDF türkçe karakterleri bozulabilir.');
    return;
  }
  doc.addFileToVFS('EBGaramond-Regular.ttf', window.EB_GARAMOND_REGULAR_B64);
  doc.addFileToVFS('EBGaramond-Bold.ttf',    window.EB_GARAMOND_BOLD_B64);
  doc.addFileToVFS('EBGaramond-Italic.ttf',  window.EB_GARAMOND_ITALIC_B64);
  doc.addFont('EBGaramond-Regular.ttf', 'EBGaramond', 'normal');
  doc.addFont('EBGaramond-Bold.ttf',    'EBGaramond', 'bold');
  doc.addFont('EBGaramond-Italic.ttf',  'EBGaramond', 'italic');
  _ensureCVFont._done = true;
}

/* ── Avatar fetch → dataURL helper (guvenli embed) ── */
function fetchAvatarAsDataURL(url) {
  return new Promise(function(resolve) {
    if (!url) { resolve(null); return; }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) { resolve(null); }
    };
    img.onerror = function() { resolve(null); };
    img.src = url;
  });
}

async function generateCV() {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  _ensureCVFont(doc); // K-067: Türkçe karakter fix
  var W = 210, H = 297, M = 16, cW = W - 2 * M, Y = 0;
  var d = normalizeCVData();

  /* Avatar (opsiyonel) — sağ üst kare, foto yoksa text-only layout */
  var AVATAR_SIZE = 26; // mm
  var avatarData = null;
  if (d.avatarUrl) {
    try { avatarData = await fetchAvatarAsDataURL(d.avatarUrl); } catch (e) { avatarData = null; }
  }

  // ── HEADER: isim (uppercase) sol | avatar sağ ──
  doc.setFont('EBGaramond', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  // Letter-spaced uppercase isim — times yok letter-spacing, genişlik manipüle
  var isimUpper = (d.isim || 'Ad Soyad').toLocaleUpperCase('tr-TR');
  doc.setCharSpace(0.8);
  doc.text(isimUpper, M, 16);
  doc.setCharSpace(0);

  var headerYStart = 20;
  if (d.targetRole) {
    doc.setFont('EBGaramond', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(d.targetRole, M, headerYStart + 3);
  }

  // İletişim: "Şehir | Telefon" + "Email | LinkedIn"
  var line1 = [];
  if (d.city) line1.push(d.city);
  if (d.tel) line1.push(d.tel);
  var line2 = [];
  if (d.email) line2.push(d.email);
  if (d.linkedin) line2.push(d.linkedin);
  doc.setFont('EBGaramond', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  var cy = headerYStart + (d.targetRole ? 8 : 3);
  if (line1.length) { doc.text(line1.join('  |  '), M, cy); cy += 4; }
  if (line2.length) { doc.text(line2.join('  |  '), M, cy); cy += 4; }

  // Diller header altına
  if (d.languages && d.languages.length > 0) {
    var langText = d.languages
      .filter(function(l) { return l && l.dil; })
      .map(function(l) { return l.dil + (l.seviye ? ': ' + l.seviye : ''); })
      .join('    ');
    if (langText) {
      doc.setFont('EBGaramond', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(langText, M, cy);
      cy += 4;
    }
  }

  // Avatar embed (ATS uyarısı: Tuna CV örnek pattern'ini takip ediyor, foto istendi)
  if (avatarData) {
    try {
      doc.addImage(avatarData, 'JPEG', M + cW - AVATAR_SIZE, 12, AVATAR_SIZE, AVATAR_SIZE);
    } catch (err) { /* silent */ }
  }

  // Header divider
  Y = Math.max(cy + 1, (avatarData ? 12 + AVATAR_SIZE + 2 : cy + 1));
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(M, Y, M + cW, Y);
  Y += 6;

  // ── SECTION 1: PROFESYONEL ÖZET ──
  if (d.summary) {
    Y = _cvSection(doc, 'Profesyonel \u00d6zet', M, cW, Y);
    doc.setFont('EBGaramond', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    var splitSummary = doc.splitTextToSize(d.summary, cW);
    doc.text(splitSummary, M, Y);
    Y += splitSummary.length * 4.3 + 3;
  }

  // ── SECTION 2: YETKİNLİKLER — role-based taxonomy (K-066) ──
  var roleSkillsMap = (typeof ROLE_SKILLS_MAP !== 'undefined') ? ROLE_SKILLS_MAP : {};
  var leadershipSkills = (typeof LEADERSHIP_SKILLS !== 'undefined') ? LEADERSHIP_SKILLS : [];
  var families = [];
  d.experiences.forEach(function(e) {
    if (e && e.rol_ailesi && families.indexOf(e.rol_ailesi) === -1) {
      families.push(e.rol_ailesi);
    }
  });
  var skillCats = [];
  families.forEach(function(fam) {
    var skills = roleSkillsMap[fam];
    if (skills && skills.length > 0) {
      skillCats.push({ cat: fam, items: skills.slice(0, 6) });
    }
  });
  var hasLeadership = d.experiences.some(function(e) {
    if (!e) return false;
    var role = (e.pozisyon || e.rol_unvani || '').toLowerCase();
    return /m\u00fcd\u00fcr|sorumlu|lider|direkt\u00f6r|supervisor|manager/.test(role);
  });
  if (hasLeadership && leadershipSkills.length > 0) {
    skillCats.push({ cat: 'Liderlik', items: leadershipSkills.slice(0, 5) });
  }
  if (d.brandInterests && d.brandInterests.length > 0) {
    skillCats.push({ cat: 'Sekt\u00f6r \u0130lgisi', items: d.brandInterests.slice(0, 6) });
  }

  if (skillCats.length > 0) {
    Y = _cvSection(doc, 'Yetkinlikler', M, cW, Y);
    doc.setFontSize(9.5);
    skillCats.forEach(function(c) {
      if (Y > 268) { doc.addPage(); Y = 20; }
      var catLabel = c.cat + ': ';
      doc.setFont('EBGaramond', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(catLabel, M, Y);
      var catWidth = doc.getTextWidth(catLabel);
      doc.setFont('EBGaramond', 'normal');
      doc.setTextColor(40, 40, 40);
      var itemsText = c.items.join(', ') + '.';
      var splitItems = doc.splitTextToSize(itemsText, cW - catWidth);
      doc.text(splitItems[0] || '', M + catWidth, Y);
      Y += 4;
      for (var si2 = 1; si2 < splitItems.length; si2++) {
        if (Y > 268) { doc.addPage(); Y = 20; }
        doc.text(splitItems[si2], M, Y);
        Y += 4;
      }
    });
    Y += 2;
  }

  // ── SECTION 3: PROFESYONEL DENEYİM ──
  if (d.experiences.length > 0) {
    Y = _cvSection(doc, 'Profesyonel Deneyim', M, cW, Y);
    for (var ei = 0; ei < d.experiences.length; ei++) {
      var e = d.experiences[ei];
      if (Y > 260) { doc.addPage(); Y = 20; }

      // Company (uppercase bold) + tarih sağ italic
      var companyLabel = (e.marka || e.sirket || '').toString().toLocaleUpperCase('tr-TR');
      doc.setFont('EBGaramond', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setCharSpace(0.4);
      doc.text(companyLabel || '\u015eirket', M, Y);
      doc.setCharSpace(0);

      var tarih = '';
      if (e.baslangic_yil) {
        tarih = (monthIndexToName(e.baslangic_ay) || '') + ' ' + e.baslangic_yil + ' \u2013 ';
        tarih += e.devam_ediyor ? 'Devam' : ((monthIndexToName(e.bitis_ay) || '') + ' ' + (e.bitis_yil || ''));
      }
      if (tarih) {
        doc.setFont('EBGaramond', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(tarih.trim(), M + cW, Y, { align: 'right' });
      }
      Y += 4.5;

      // Pozisyon | şehir (italic)
      var roleLine = [];
      if (e.pozisyon) roleLine.push(e.pozisyon);
      if (e.sehir) roleLine.push(e.sehir);
      if (roleLine.length) {
        doc.setFont('EBGaramond', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        doc.text(roleLine.join('  |  '), M, Y);
        Y += 4;
      }

      // Bullet points (basari_ozeti / description sentence-split)
      var summaryText = e.basari_ozeti || e.description || '';
      if (summaryText) {
        var sentences = summaryText.split(/(?<=[.!?])\s+/).filter(function(s) { return s.trim().length > 0; });
        if (!sentences.length) sentences = [summaryText];
        var maxBullets = Math.min(5, sentences.length);
        doc.setFont('EBGaramond', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 30);
        for (var si3 = 0; si3 < maxBullets; si3++) {
          if (Y > 268) { doc.addPage(); Y = 20; }
          var bulletText = '\u2022  ' + sentences[si3].trim();
          var bLines = doc.splitTextToSize(bulletText, cW - 3);
          doc.text(bLines, M + 2, Y);
          Y += bLines.length * 4;
        }
      }

      Y += 2.5;
    }
    Y += 1;
  }

  // ── SECTION 4: EĞİTİM ──
  if (d.education.length > 0) {
    Y = _cvSection(doc, 'E\u011fitim', M, cW, Y);
    d.education.forEach(function(e) {
      if (Y > 268) { doc.addPage(); Y = 20; }
      doc.setFont('EBGaramond', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setCharSpace(0.3);
      doc.text((e.okul || '').toLocaleUpperCase('tr-TR'), M, Y);
      doc.setCharSpace(0);
      var rightText = [e.egitim_seviye, e.mezun_yil ? String(e.mezun_yil) : ''].filter(Boolean).join(', ');
      if (rightText) {
        doc.setFont('EBGaramond', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(rightText, M + cW, Y, { align: 'right' });
      }
      Y += 4.5;
      if (e.bolum) {
        doc.setFont('EBGaramond', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        doc.text(e.bolum, M, Y);
        Y += 4;
      }
      Y += 1;
    });
    Y += 1;
  }

  // ── SECTION 5: SERTİFİKALAR ──
  if (d.certificates.length > 0) {
    Y = _cvSection(doc, 'Sertifikalar', M, cW, Y);
    d.certificates.forEach(function(c) {
      if (Y > 268) { doc.addPage(); Y = 20; }
      doc.setFont('EBGaramond', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text((c.egitim_adi || '').toLocaleUpperCase('tr-TR'), M, Y);
      if (c.yil) {
        doc.setFont('EBGaramond', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(String(c.yil), M + cW, Y, { align: 'right' });
      }
      Y += 4.5;
      if (c.kurum) {
        doc.setFont('EBGaramond', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        doc.text(c.kurum, M, Y);
        Y += 4;
      }
      Y += 1;
    });
    Y += 1;
  }

  // ── References line (italic right) ──
  if (Y > 270) { doc.addPage(); Y = 20; }
  doc.setFont('EBGaramond', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text('Referanslar talep \u00fczerine sunulur.', M + cW, Y + 4, { align: 'right' });

  // ── Footer: "by hellotalent" sayfa altında ortalanmış ──
  doc.setFont('EBGaramond', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('by hellotalent', W / 2, H - 10, { align: 'center' });

  // ── PDF METADATA ──
  doc.setProperties({
    title: (d.isim || 'CV') + ' \u2014 CV',
    author: d.isim || '',
    subject: d.targetRole || 'Perakende Profesyoneli',
    keywords: [d.targetRole, 'perakende', 'retail', d.city].filter(Boolean).join(', '),
    creator: 'hellotalent.ai'
  });

  doc.save((d.isim || 'CV').replace(/\s+/g, '_') + '_HelloTalent.pdf');
}
