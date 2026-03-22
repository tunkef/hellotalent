/* global collectCertificates, collectEducation, collectExperiences, collectLanguages, currentUser, ht_track, monthIndexToName, selectedBrandInterests, showToast, STORAGE, supabase, val */
// ═══════════════════════════════════════════════════
// profil-cv.js — CV Upload, Delete & Generation
// Extracted from profil-ui.js to reduce change-risk.
// Handles Supabase Storage upload/delete, CV state UI,
// and jsPDF-based CV generation.
// Exports: initCVUpload, showCVUploaded, showCVEmpty, generateCV
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
  if (file.size > 5 * 1024 * 1024) { showToast('Dosya 5MB\'dan büyük olamaz', 'error'); return; }
  var allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  var ext = file.name.split('.').pop().toLowerCase();
  if (allowedTypes.indexOf(file.type) === -1 && ['pdf','doc','docx'].indexOf(ext) === -1) {
    showToast('Sadece PDF, DOC veya DOCX dosyası', 'error');
    return;
  }

  if (!currentUser) { showToast('Oturum hatası', 'error'); return; }
  var userId = currentUser.id;

  // Show uploading state
  var selectBtn = document.getElementById('btn-cv-select');
  if (selectBtn) { selectBtn.textContent = 'Yükleniyor...'; selectBtn.disabled = true; }

  try {
    // Delete old storage file if replacing
    if (currentCVStoragePath) {
      await supabase.storage.from(STORAGE.BUCKET).remove([currentCVStoragePath]).catch(function() {});
    }

    // Upload new file (path relative to bucket, no redundant prefix)
    var filePath = STORAGE.cvPath(userId, file.name);
    var uploadRes = await supabase.storage.from(STORAGE.BUCKET).upload(filePath, file, { upsert: true });
    if (uploadRes.error) throw uploadRes.error;

    var urlData = supabase.storage.from(STORAGE.BUCKET).getPublicUrl(filePath);
    var cvUrl = urlData.data.publicUrl;

    // Update DB and check for errors
    var dbRes = await supabase.from('candidates').update({
      cv_url: cvUrl, cv_filename: file.name, cv_uploaded_at: new Date().toISOString()
    }).eq('user_id', userId);
    if (dbRes.error) {
      // Rollback: remove uploaded file since DB failed
      await supabase.storage.from(STORAGE.BUCKET).remove([filePath]).catch(function() {});
      throw dbRes.error;
    }

    currentCVStoragePath = filePath;
    showCVUploaded(cvUrl, new Date());
    ht_track('cv_upload_success', { file_type: ext });
    showToast('CV yüklendi ✓', 'success');
  } catch (err) {
    if (window.Sentry) Sentry.captureException(err, { tags: { flow: 'cv-upload' } });
    console.error('[HT] CV upload error:', err);
    showToast('Yükleme hatası: ' + (err.message || 'Bilinmeyen hata'), 'error');
  }

  // Reset file input so re-selecting same file triggers change event
  var fileInput = document.getElementById('cv-file-input');
  if (fileInput) fileInput.value = '';
  if (selectBtn) { selectBtn.textContent = 'Dosya Seç'; selectBtn.disabled = false; }
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
    showCVEmpty();
    ht_track('cv_deleted');
    showToast('CV silindi', 'success');
  } catch (err) {
    if (window.Sentry) Sentry.captureException(err, { tags: { flow: 'cv-delete' } });
    console.error('[HT] CV delete error:', err);
    showToast('Silme hatası', 'error');
  }
}

function showCVUploaded(cvUrl, date) {
  var dropZone = document.getElementById('cv-drop-zone');
  var uploaded = document.getElementById('cv-uploaded-state');
  if (dropZone) dropZone.style.display = 'none';
  if (uploaded) {
    uploaded.style.display = 'flex';
    var nameEl = document.getElementById('cv-uploaded-name');
    var dateEl = document.getElementById('cv-uploaded-date');
    if (nameEl) {
      nameEl.textContent = 'CV Görüntüle';
      nameEl.style.cursor = '';
      nameEl.style.color = '';
      nameEl.style.textDecoration = '';
      nameEl.onclick = null;
      if (cvUrl) {
        nameEl.style.cursor = 'pointer';
        nameEl.style.color = 'var(--verm)';
        nameEl.style.textDecoration = 'underline';
        nameEl.onclick = function() { window.open(cvUrl, '_blank'); };
      }
    }
    if (dateEl) dateEl.textContent = date ? date.toLocaleDateString('tr-TR') : '';
  }
}

function showCVEmpty() {
  var dropZone = document.getElementById('cv-drop-zone');
  var uploaded = document.getElementById('cv-uploaded-state');
  if (dropZone) dropZone.style.display = '';
  if (uploaded) uploaded.style.display = 'none';
}

// ═══════════════════════════════════════════════════
// TASK 14: CV GENERATION (jsPDF)
// ═══════════════════════════════════════════════════

function generateCV() {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var W = 210, M = 18, cW = W - 2 * M, Y = 0;

  // Header — navy bar
  doc.setFillColor(30, 45, 94);
  doc.rect(0, 0, W, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  var isim = val('f-adsoyad') || 'Ad Soyad';
  doc.text(isim, M, 20);

  // Contact info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  var tel = val('f-telefon');
  var email = currentUser ? currentUser.email : '';
  var linkedin = val('f-linkedin');
  var contact = [];
  if (tel) contact.push(tel);
  if (email) contact.push(email);
  if (contact.length) doc.text(contact.join(' | '), M, 28);

  var city = val('f-adresil');
  if (city) doc.text(city, M, 35);

  Y = 50;
  doc.setTextColor(0, 0, 0);

  // Experiences
  var exps = collectExperiences();
  if (exps.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 45, 94);
    doc.text('Deneyimler', M, Y);
    Y += 2;
    doc.setDrawColor(30, 45, 94);
    doc.setLineWidth(0.5);
    doc.line(M, Y, M + cW, Y);
    Y += 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    exps.forEach(function(e) {
      if (Y > 265) { doc.addPage(); Y = 20; }
      doc.setFont('helvetica', 'bold');
      var cvCompany = e.marka || e.sirket || '';
      doc.text(cvCompany + (e.pozisyon ? ' - ' + e.pozisyon : ''), M, Y);
      var tarih = '';
      if (e.baslangic_yil) {
        tarih = (monthIndexToName(e.baslangic_ay) || '') + ' ' + e.baslangic_yil + ' - ';
        tarih += e.devam_ediyor ? 'Devam Ediyor' : ((monthIndexToName(e.bitis_ay) || '') + ' ' + (e.bitis_yil || ''));
      }
      if (tarih) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(tarih, M + cW, Y, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }
      Y += 5;
      if (e.rol_ailesi || e.segment) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text([e.rol_ailesi, e.segment].filter(Boolean).join(' | '), M, Y);
        Y += 4;
        doc.setFontSize(10);
      }
      Y += 3;
    });
    Y += 4;
  }

  // Education
  var edus = collectEducation();
  if (edus.length > 0) {
    if (Y > 265) { doc.addPage(); Y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 45, 94);
    doc.text('Egitim', M, Y);
    Y += 2;
    doc.setDrawColor(30, 45, 94);
    doc.setLineWidth(0.5);
    doc.line(M, Y, M + cW, Y);
    Y += 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    edus.forEach(function(e) {
      doc.setFont('helvetica', 'bold');
      doc.text((e.okul || '') + (e.bolum ? ' - ' + e.bolum : ''), M, Y);
      if (e.mezun_yil) {
        doc.setFont('helvetica', 'normal');
        doc.text(String(e.mezun_yil), M + cW, Y, { align: 'right' });
      }
      Y += 5;
      if (e.egitim_seviye) { doc.setFont('helvetica', 'normal'); doc.text(e.egitim_seviye, M, Y); Y += 4; }
      Y += 2;
    });
    Y += 4;
  }

  // Languages
  var langs = collectLanguages();
  if (langs.length > 0) {
    if (Y > 265) { doc.addPage(); Y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 45, 94);
    doc.text('Diller', M, Y);
    Y += 2;
    doc.setDrawColor(30, 45, 94);
    doc.setLineWidth(0.5);
    doc.line(M, Y, M + cW, Y);
    Y += 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    langs.forEach(function(l) {
      if (l.dil) { doc.text(l.dil + (l.seviye ? ' (' + l.seviye + ')' : ''), M, Y); Y += 5; }
    });
    Y += 4;
  }

  // Certificates
  var certs = collectCertificates();
  if (certs.length > 0) {
    if (Y > 265) { doc.addPage(); Y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 45, 94);
    doc.text('Sertifikalar', M, Y);
    Y += 2;
    doc.setDrawColor(30, 45, 94);
    doc.setLineWidth(0.5);
    doc.line(M, Y, M + cW, Y);
    Y += 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    certs.forEach(function(c) {
      doc.text((c.egitim_adi || '') + (c.kurum ? ' - ' + c.kurum : ''), M, Y);
      if (c.yil) doc.text(c.yil, M + cW, Y, { align: 'right' });
      Y += 5;
    });
    Y += 4;
  }

  // Brand interests
  if (selectedBrandInterests.length > 0) {
    if (Y > 265) { doc.addPage(); Y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 45, 94);
    doc.text('Ilgili Markalar', M, Y);
    Y += 2;
    doc.setDrawColor(30, 45, 94);
    doc.setLineWidth(0.5);
    doc.line(M, Y, M + cW, Y);
    Y += 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedBrandInterests.join(', '), M, Y, { maxWidth: cW });
    Y += 10;
  }

  // Footer — hellotalent branding
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('hellotalent.ai', W / 2, 290, { align: 'center' });

  doc.save((isim || 'CV').replace(/\s+/g, '_') + '_HelloTalent.pdf');
}
