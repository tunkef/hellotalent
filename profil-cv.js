/* global collectCertificates, collectEducation, collectExperiences, collectLanguages, currentUser, ht_track, monthIndexToName, selectedBrandInterests, showToast, STORAGE, supabase, val, _loadedDBData */
'use strict';
// K049 Faz 2 — strict mode (Y/summary/targetRole/totalYears/tarih hepsi local var-declared, currentCVStoragePath top-level shared).
// ═══════════════════════════════════════════════════
// profil-cv.js — CV Upload, Delete & Generation
// Extracted from profil-ui.js to reduce change-risk.
// Handles Supabase Storage upload/delete, CV state UI,
// and jsPDF-based CV generation (tek canonical ATS-friendly template).
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

/* ── Live sync: AI kart alt copy'sini CV durumuna gore guncelle ── */
function syncAiCardCopy(hasCv) {
  var aiSub = document.querySelector('#btn-ai-cv-optimize')
    ? document.querySelector('#btn-ai-cv-optimize').parentElement.querySelector('.mk-ai-sub')
    : null;
  if (aiSub) {
    aiSub.textContent = hasCv
      ? 'CV\'ni + profilini AI ile g\u00fc\u00e7lendir'
      : 'Profilini AI ile g\u00fc\u00e7lendir';
  }
  /* Reset AI button state — honour MVP free-tier truth */
  var aiBtn = document.getElementById('btn-ai-cv-optimize');
  if (aiBtn) {
    var isMvpFree = window._htMvpFreeTier === true || window.HT_MVP_FREE === true;
    var defaultCopy = isMvpFree ? 'Beta \u00dccretsiz' : 'Premium';
    if (aiBtn.textContent !== defaultCopy) {
      aiBtn.textContent = defaultCopy;
      aiBtn.style.background = isMvpFree ? 'var(--navy,#1E2D5E)' : '';
      aiBtn.disabled = false;
    }
  }
}

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
    syncAiCardCopy(true);
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
    syncAiCardCopy(false);
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
// AI entegrasyonu gelince: normalizeCVData().summary AI ile zenginlestirilecek

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

/* ── Section heading helper ── */
function _cvSection(doc, title, M, cW, Y) {
  if (Y > 258) { doc.addPage(); Y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 45, 94);
  doc.text(title.toUpperCase(), M, Y);
  Y += 1.5;
  doc.setDrawColor(30, 45, 94);
  doc.setLineWidth(0.4);
  doc.line(M, Y, M + cW, Y);
  Y += 5;
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  return Y;
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

/* ── AI CV optimize — server-side Anthropic call ── */
async function requestCVOptimize(cvData) {
  var supa = (typeof window.HT !== 'undefined' && window.HT.getSupa) ? window.HT.getSupa() : supabase;
  var session = await supa.auth.getSession();
  var token = session.data.session ? session.data.session.access_token : '';

  var res = await fetch(window.HT.SUPA_URL + '/functions/v1/cv-optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'apikey': window.HT.SUPA_KEY
    },
    body: JSON.stringify(cvData)
  });

  if (!res.ok) {
    var errBody = {};
    try { errBody = await res.json(); } catch(e) { /* silent */ }
    throw new Error(errBody.error || 'AI servisi yan\u0131t vermedi (' + res.status + ')');
  }
  return res.json();
}

async function generateCV(aiOptimized) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var W = 210, M = 16, cW = W - 2 * M, Y = 0;
  var d = normalizeCVData();

  /* Apply AI optimizations if provided */
  var expRewrites = {};
  if (aiOptimized) {
    if (aiOptimized.summary) d.summary = aiOptimized.summary;
    /* Map experienceRewrites by index for lookup during experience rendering */
    if (aiOptimized.experienceRewrites && aiOptimized.experienceRewrites.length > 0) {
      for (var ri = 0; ri < aiOptimized.experienceRewrites.length; ri++) {
        var rw = aiOptimized.experienceRewrites[ri];
        expRewrites[rw.index] = rw;
      }
    }
  }

  // ── HEADER: isim + hedef rol + iletisim ──
  // NOT: Avatar PDF'e eklenmez — ATS (Workday, Taleo) text layer'ı bozar.
  // Foto profil sayfasında görünür, CV'de yer almaz (global best practice).

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 45, 94);
  doc.text(d.isim, M, 14);

  if (d.targetRole) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(d.targetRole, M, 20);
  }

  var contactParts = [];
  if (d.tel) contactParts.push(d.tel);
  if (d.email) contactParts.push(d.email);
  if (d.city) contactParts.push(d.city);
  if (d.linkedin) contactParts.push(d.linkedin);
  if (contactParts.length) {
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text(contactParts.join('  \u2022  '), M, 26);
  }

  Y = 32;
  doc.setDrawColor(30, 45, 94);
  doc.setLineWidth(0.3);
  doc.line(M, Y, M + cW, Y);
  Y += 6;

  // ── SECTION 1: PROFESYONEL OZET ──
  // Normal font (not italic) — ATS OCR-fallback Türkçe ğ/ş/ı'yı italic'te %15-20 bozar
  if (d.summary) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    var splitSummary = doc.splitTextToSize(d.summary, cW);
    doc.text(splitSummary, M, Y);
    Y += splitSummary.length * 4.5 + 4;
  }

  // ── SECTION 2: DENEYIM ──
  if (d.experiences.length > 0) {
    Y = _cvSection(doc, 'Deneyim', M, cW, Y);
    for (var ei = 0; ei < d.experiences.length; ei++) {
      var e = d.experiences[ei];
      if (Y > 258) { doc.addPage(); Y = 20; }

      /* Headline: use AI rewrite if available, else original */
      var rewrite = expRewrites[ei];
      var headline = rewrite ? rewrite.headline : ((e.pozisyon || '') + (e.marka || e.sirket ? ' \u2014 ' + (e.marka || e.sirket) : ''));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text(headline || 'Pozisyon', M, Y);

      /* Date — always from profile truth */
      var tarih = '';
      if (e.baslangic_yil) {
        tarih = (monthIndexToName(e.baslangic_ay) || '') + ' ' + e.baslangic_yil + ' \u2013 ';
        tarih += e.devam_ediyor ? 'Devam Ediyor' : ((monthIndexToName(e.bitis_ay) || '') + ' ' + (e.bitis_yil || ''));
      }
      if (tarih) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(tarih.trim(), M + cW, Y, { align: 'right' });
      }
      Y += 4.5;

      if (e.rol_ailesi || e.segment) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text([e.rol_ailesi, e.segment].filter(Boolean).join(' | '), M, Y);
        Y += 4;
      }

      /* AI bullets — only if rewrite exists */
      if (rewrite && rewrite.bullets && rewrite.bullets.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        for (var bi = 0; bi < Math.min(3, rewrite.bullets.length); bi++) {
          if (Y > 258) { doc.addPage(); Y = 20; }
          var bulletText = doc.splitTextToSize('\u2022  ' + rewrite.bullets[bi], cW - 4);
          doc.text(bulletText, M + 2, Y);
          Y += bulletText.length * 3.8;
        }
      }

      Y += 2.5;
    }
    Y += 3;
  }

  // ── SECTION 3: YETKINLIKLER (Skills — ATS keyword matching icin kritik) ──
  var skills = [];
  if (d.targetRole) skills.push(d.targetRole);
  // Deneyimlerden rol ailelerini ve segmentleri topla
  d.experiences.forEach(function(e) {
    if (e.rol_ailesi && skills.indexOf(e.rol_ailesi) === -1) skills.push(e.rol_ailesi);
    if (e.segment && skills.indexOf(e.segment) === -1) skills.push(e.segment);
  });
  // Takip edilen markalardan sektör bilgisi
  if (d.brandInterests.length > 0 && skills.length < 8) {
    skills.push('Perakende');
  }
  if (skills.length > 0) {
    Y = _cvSection(doc, 'Yetkinlikler', M, cW, Y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    var skillLine = skills.join('  \u2022  ');
    var splitSkills = doc.splitTextToSize(skillLine, cW);
    doc.text(splitSkills, M, Y);
    Y += splitSkills.length * 4.5 + 4;
  }

  // ── SECTION 4: EGITIM ──
  if (d.education.length > 0) {
    Y = _cvSection(doc, 'E\u011Fitim', M, cW, Y);
    d.education.forEach(function(e) {
      if (Y > 258) { doc.addPage(); Y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      doc.text((e.okul || '') + (e.bolum ? ' \u2014 ' + e.bolum : ''), M, Y);
      var rightText = [e.egitim_seviye, e.mezun_yil ? String(e.mezun_yil) : ''].filter(Boolean).join(', ');
      if (rightText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(rightText, M + cW, Y, { align: 'right' });
      }
      Y += 5;
    });
    Y += 3;
  }

  // ── SECTION 4: DILLER ──
  if (d.languages.length > 0) {
    Y = _cvSection(doc, 'Diller', M, cW, Y);
    var langLine = d.languages.filter(function(l) { return l.dil; }).map(function(l) {
      return l.dil + (l.seviye ? ' (' + l.seviye + ')' : '');
    }).join('  \u2022  ');
    doc.text(langLine, M, Y, { maxWidth: cW });
    Y += 6;
  }

  // ── SECTION 5: SERTIFIKALAR ──
  if (d.certificates.length > 0) {
    Y = _cvSection(doc, 'Sertifikalar', M, cW, Y);
    d.certificates.forEach(function(c) {
      if (Y > 258) { doc.addPage(); Y = 20; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);
      doc.text((c.egitim_adi || '') + (c.kurum ? ' \u2014 ' + c.kurum : ''), M, Y);
      if (c.yil) {
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(c.yil, M + cW, Y, { align: 'right' });
      }
      Y += 5;
    });
    Y += 3;
  }

  // ── SECTION 6: ILGI ALANLARI (yalnizca anlamliysa) ──
  if (d.brandInterests.length > 0) {
    Y = _cvSection(doc, '\u0130lgi Alanlar\u0131', M, cW, Y);
    doc.text(d.brandInterests.join(', '), M, Y, { maxWidth: cW });
    Y += 6;
  }

  // ── PDF METADATA (ATS indexing + retrieval optimization) ──
  // Branding hellotalent.ai → metadata creator field (not body text — body text pollutes ATS keyword fields)
  doc.setProperties({
    title: (d.isim || 'CV') + ' - CV',
    author: d.isim || '',
    subject: d.targetRole || 'Perakende Profesyoneli',
    keywords: [d.targetRole, 'perakende', 'retail', d.city].filter(Boolean).join(', '),
    creator: 'hellotalent.ai'
  });

  doc.save((d.isim || 'CV').replace(/\s+/g, '_') + '_HelloTalent.pdf');
}
