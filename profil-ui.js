/* global supabase, AYRILMA_NEDENLERI, AY_ISIMLERI, BOLUM_DB, BRAND_DB, CALISMA_TIPLERI, CAREER_TYPE_OPTIONS, CAREER_TYPE_ORDER, DIL_LISTESI, DIL_SEVIYELERI, EGITIM_SEVIYELERI, ILCELER, ISTIHDAM_TIPLERI, MUSAITLIK_SECENEKLERI, POSITION_TO_FAMILY, RETAIL_POSITIONS, ROL_AILELERI, SEGMENTLER, SEKTOR_ROL_MAP, STORAGE, TAKIM_BUYUKLUKLERI, TUR_ILLER, UNIVERSITE_DB */
/* global _ht_follows, _loadedDBData, applyAllVisibilityMirrorsFromProfile, calculateCompletion, canonicalizeRole, clearDraft, collectLocations, currentUser, getCurrentEmployerDisplayFromExperiences, ht_track, markWizardDirty, normalizeForDisplay, nullIfEmpty, refreshVisibilitySummary, selectedCareerTypes, syncAccountEmail, titleCaseTR, trLower, updateBrandFollowCounter, updateCompletionUI, updateDashboardSummary, updateMerkezCards, updateMerkezVisState, val, wizardDirty */
// v20260320 ── BRAND/COMPANY ID LOOKUP ──
// Populated at page load from Supabase; used by makeSmartBrandField + collectExperiences
var _brandIdLookup = {};   // trLower(brand_name) → { brand_id, company_id }
var _companyIdLookup = {};  // trLower(company_name) → company_id

function _initBrandCompanyLookup() {
  if (typeof supabase === 'undefined') return Promise.resolve();
  var bP = supabase.from('brands').select('id, brand_name, company_id');
  var cP = supabase.from('companies').select('id, company_name');
  return Promise.all([bP, cP]).then(function(results) {
    var bRes = results[0];
    var cRes = results[1];
    if (bRes.data) {
      bRes.data.forEach(function(b) {
        if (b.brand_name) _brandIdLookup[trLower(b.brand_name.trim())] = { brand_id: b.id, company_id: b.company_id };
      });
    }
    if (cRes.data) {
      cRes.data.forEach(function(c) {
        if (c.company_name) _companyIdLookup[trLower(c.company_name.trim())] = c.id;
      });
    }
    // Enrich BRAND_DB entries with ids for autocomplete picks
    if (typeof BRAND_DB !== 'undefined') {
      BRAND_DB.forEach(function(b) {
        var hit = _brandIdLookup[trLower(b.name)];
        if (hit) { b.brand_id = hit.brand_id; b.company_id = hit.company_id; }
      });
    }
  }).catch(function(e) { console.warn('[HT] Brand/company ID lookup failed:', e.message); });
}

// Resolve brand/company ids from text. Returns { brand_id, company_id } or nulls.
function _resolveBrandCompanyIds(marka, sirket) {
  var result = { brand_id: null, company_id: null };
  if (marka) {
    var bHit = _brandIdLookup[trLower(marka.trim())];
    if (bHit) { result.brand_id = bHit.brand_id; result.company_id = bHit.company_id; }
  }
  if (!result.company_id && sirket) {
    var cHit = _companyIdLookup[trLower(sirket.trim())];
    if (cHit) result.company_id = cHit;
  }
  return result;
}

// v20260317 ── STATUS UI ──
function updateStatusUI(isActive) {
  var badges = ['card-status-badge'];
  var texts = ['card-status-text'];
  badges.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.className = 'status-badge ' + (isActive ? 'aktif' : 'pasif'); }
  });
  texts.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = isActive ? 'Beni öner' : 'Beni önerme';
  });

  var genelIndicator = document.getElementById('genel-active-indicator');
  var genelText = document.getElementById('genel-active-text');
  var genelDot = document.getElementById('genel-active-dot');
  if (genelIndicator && genelText && genelDot) {
    if (isActive) {
      genelIndicator.style.background = 'var(--green-light)';
      genelIndicator.style.borderColor = 'var(--green-border)';
      genelIndicator.style.color = 'var(--green)';
      genelDot.style.backgroundColor = 'var(--green)';
      genelText.textContent = 'Beni öner';
    } else {
      genelIndicator.style.background = '#F3F4F6';
      genelIndicator.style.borderColor = 'var(--border)';
      genelIndicator.style.color = 'var(--muted)';
      genelDot.style.backgroundColor = 'var(--muted)';
      genelText.textContent = 'Beni önerme';
    }
  }

  // Avatar glow (eclipse effect) for "Beni Öner" state
  ['merkez-avatar', 'ps-avatar'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      if (isActive) { el.classList.add('glow-active'); }
      else { el.classList.remove('glow-active'); }
    }
  });
  // Header avatar glow
  var headerAvBtn = document.querySelector('.header-avatar-btn');
  if (headerAvBtn) {
    if (isActive) { headerAvBtn.classList.add('glow-active'); }
    else { headerAvBtn.classList.remove('glow-active'); }
  }
}

// ═══════════════════════════════════════════════════
// STEP 1: KISISEL BILGILER — INIT + HANDLERS
// ═══════════════════════════════════════════════════

// Flatten TUR_ILLER regions into sorted city array
function flatAllCities() {
  var cities = [];
  Object.keys(TUR_ILLER).forEach(function(region) {
    TUR_ILLER[region].forEach(function(city) { cities.push(city); });
  });
  return cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });
}

function initStep1() {
  // Populate Dogum Yili (1960 — current year - 14)
  var dySelect = document.getElementById('f-dogumyili');
  if (dySelect) {
    var currentYear = new Date().getFullYear();
    for (var y = currentYear - 14; y >= 1960; y--) {
      var opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      dySelect.appendChild(opt);
    }
  }

  // Populate Adres Il
  var ilSelect = document.getElementById('f-adresil');
  if (ilSelect) {
    flatAllCities().forEach(function(city) {
      var opt = document.createElement('option');
      opt.value = city;
      opt.textContent = city;
      ilSelect.appendChild(opt);
    });
    // Il change → populate Ilce
    ilSelect.addEventListener('change', function() {
      populateIlceSelect('f-adresilce', this.value);
    });
  }

  // Cinsiyet change → show/hide Askerlik
  var cinsiyetSelect = document.getElementById('f-cinsiyet');
  if (cinsiyetSelect) {
    cinsiyetSelect.addEventListener('change', function() {
      var fieldAskerlik = document.getElementById('field-askerlik');
      if (fieldAskerlik) {
        fieldAskerlik.style.display = this.value === 'Erkek' ? '' : 'none';
      }
    });
  }

  syncAccountEmail();

  // Avatar upload
  var avatarInput = document.getElementById('avatar-file-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', function() { handleAvatarUpload(this); });
  }
  var avatarCircle = document.getElementById('avatar-upload-circle');
  if (avatarCircle) {
    avatarCircle.addEventListener('click', function() {
      var input = document.getElementById('avatar-file-input');
      if (input) input.click();
    });
  }
}

function populateIlceSelect(selectId, cityName) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  // Clear existing options
  while (sel.options.length > 1) sel.remove(1);
  var districts = ILCELER[cityName];
  if (!districts || districts.length === 0) {
    sel.options[0].textContent = 'Ilce yok';
    return;
  }
  sel.options[0].textContent = 'İlçe seç...';
  districts.forEach(function(d) {
    var opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    sel.appendChild(opt);
  });
}

async function handleAvatarUpload(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    var errDesc = document.getElementById('error-desc');
    if (errDesc) errDesc.textContent = 'Dosya 2MB\u2019dan b\u00FCy\u00FCk olamaz.';
    var errModal = document.getElementById('modal-error');
    if (errModal) errModal.classList.add('show');
    return;
  }
  var btnText = document.getElementById('avatar-btn-text');
  if (btnText) btnText.textContent = 'Y\u00FCkleniyor...';
  var ext = file.name.split('.').pop();
  var path = STORAGE.avatarPath(currentUser.id, ext);

  try {
    // Remove any existing avatar files for this user (handles extension change: .jpg→.png)
    var listRes = await supabase.storage.from(STORAGE.BUCKET).list(STORAGE.AVATAR_PREFIX.replace(/\/$/, ''), { search: currentUser.id });
    if (listRes.data && listRes.data.length > 0) {
      var oldPaths = listRes.data.map(function(f) { return STORAGE.AVATAR_PREFIX + f.name; });
      await supabase.storage.from(STORAGE.BUCKET).remove(oldPaths).catch(function() {});
    }

    // Upload to stable path (one avatar per user)
    var res = await supabase.storage.from(STORAGE.BUCKET).upload(path, file, { upsert: true });
    if (res.error) throw res.error;

    var urlRes = supabase.storage.from(STORAGE.BUCKET).getPublicUrl(path);
    var cleanUrl = urlRes.data.publicUrl;
    await supabase.from('candidates').upsert({ user_id: currentUser.id, avatar_url: cleanUrl }, { onConflict: 'user_id' });
    setAvatarImage(cleanUrl + '?t=' + Date.now());
    ht_track('avatar_upload_success');
    if (btnText) btnText.textContent = 'Güncellendi!';
    setTimeout(function() { if (btnText) btnText.textContent = 'Fotoğraf Yükle'; }, 2000);
  } catch (err) {
    if (window.Sentry) Sentry.captureException(err, { tags: { flow: 'avatar-upload' } });
    console.error('[HT] Avatar upload error:', err);
    if (btnText) btnText.textContent = 'Hata!';
    return;
  }
}

// ═══════════════════════════════════════════════════
// STEP 2: KARIYER / DENEYIMLER
// ═══════════════════════════════════════════════════

var expCounter = 0;
var experiences = []; // in-memory array of experience data

function initStep2() {
  var btnAdd = document.getElementById('btn-add-exp');
  if (btnAdd) btnAdd.addEventListener('click', function() { addExperienceCard(); });

  var cbNoExp = document.getElementById('cb-no-experience');
  if (cbNoExp) {
    cbNoExp.addEventListener('change', function() {
      var section = document.getElementById('experience-section');
      if (section) section.style.display = this.checked ? 'none' : '';
    });
  }

  // Add first card by default — skip if applyDraft already restored data
  var expContainer = document.getElementById('exp-cards-container');
  if (!expContainer || expContainer.children.length === 0) addExperienceCard();
}

function addExperienceCard(data) {
  expCounter++;
  var cardId = 'exp-card-' + expCounter;
  var card = document.createElement('div');
  card.className = 'exp-card';
  card.id = cardId;
  card.dataset.expId = expCounter;

  var d = data || {};
  // Normalize: accept both DB dialect (sirket) and UI dialect (sirket_adi)
  if (!d.sirket_adi && d.sirket) d.sirket_adi = d.sirket;
  // Normalize: rol_unvani fallback from pozisyon for backward compat
  if (!d.rol_unvani && d.pozisyon) d.rol_unvani = d.pozisyon;

  // Header
  var header = document.createElement('div');
  header.className = 'exp-card-header';
  var headerTitle = document.createElement('div');
  headerTitle.className = 'exp-card-title';
  headerTitle.textContent = 'Deneyim #' + expCounter;
  header.appendChild(headerTitle);
  var delBtn = document.createElement('button');
  delBtn.className = 'exp-card-del';
  delBtn.type = 'button';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  attachDeleteConfirm(delBtn, function() {
    card.remove();
    if (typeof markWizardDirty === 'function') markWizardDirty();
    var remaining = document.querySelectorAll('.exp-card');
    remaining.forEach(function(c, idx) {
      var btn = c.querySelector('.exp-card-del');
      if (btn) btn.style.display = (remaining.length <= 1) ? 'none' : '';
    });
  });
  header.appendChild(delBtn);
  card.appendChild(header);

  // Row 1: Şirket (left) + Sektör (right). Row 2 will be Rol Ailesi + Pozisyon (filled below).
  var row1 = document.createElement('div');
  row1.className = 'field-row';

  var brandField = makeSmartBrandField(cardId + '-sirket', d, 'Şirket adı', true);
  row1.appendChild(brandField);

  // Pozisyon column (cascade select + custom input; one visible at a time) — appended to row2 below
  var pozCol = document.createElement('div');
  pozCol.className = 'exp-poz-col';

  // Pozisyon select (depends on rol ailesi)
  var unvanWrap = makeSelectField('Pozisyon <span class="field-req">*</span>', cardId + '-unvan-sec', [], null, 'Önce rol ailesi seçin');
  var unvanSelect = unvanWrap.querySelector('select');
  unvanSelect.disabled = true;

  // Custom pozisyon input (hidden by default, shown when "+ Kendi pozisyonunu yaz" selected)
  var unvanCustomWrap = makeField('text', 'Pozisyon yazın <span class="field-req">*</span>', cardId + '-unvan-custom', 'Örnek: Mağaza Müdürü', d.rol_unvani);
  unvanCustomWrap.style.display = 'none';

  pozCol.appendChild(unvanWrap);
  pozCol.appendChild(unvanCustomWrap);
  // row1 and rowRole filled after sektor/rol ailesi built so order is: Row1 = Şirket | Sektör, Row2 = Rol Ailesi | Pozisyon

  // Row 2: Rol Ailesi → Sektör (cascading; rol ailesi still depends on sektör selection)
  var rowRole = document.createElement('div');
  rowRole.className = 'field-row';

  // Rol Ailesi (depends on sektor)
  var rolAilesiWrap = makeSelectField('Rol Ailesi', cardId + '-ailesi', [], d.rol_ailesi, 'Önce sektör seçin');
  var rolAilesiSelect = rolAilesiWrap.querySelector('select');
  rolAilesiSelect.disabled = true;

  // Sektör (optional — controls rol ailesi and pozisyon cascades)
  var sektorOptions = Object.keys(typeof SEKTOR_ROL_MAP === 'object' ? SEKTOR_ROL_MAP : {});
  var sektorWrap = makeSelectField('Sektör', cardId + '-sektor', sektorOptions, d.sektor, 'Sektör seçin...');
  var sektorSelect = sektorWrap.querySelector('select');

  function clearSelectOptions(sel, placeholderText) {
    while (sel.options.length > 0) sel.remove(0);
    var defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = placeholderText || 'Seç...';
    sel.appendChild(defOpt);
  }

  function populateRolAilesiForSector(sektor, selectedAile) {
    clearSelectOptions(rolAilesiSelect, sektor ? 'Rol ailesi seçiniz...' : 'Önce sektör seçin');
    rolAilesiSelect.disabled = true;
    if (!sektor || !SEKTOR_ROL_MAP[sektor]) return;
    var aileKeys = Object.keys(SEKTOR_ROL_MAP[sektor] || {});
    aileKeys.forEach(function(a) {
      var o = document.createElement('option');
      o.value = a;
      o.textContent = a;
      if (selectedAile && a === selectedAile) o.selected = true;
      rolAilesiSelect.appendChild(o);
    });
    rolAilesiSelect.disabled = aileKeys.length === 0;
  }

  function populateUnvanForAilesi(sektor, aile, selectedUnvan) {
    clearSelectOptions(unvanSelect, aile ? 'Unvan seçiniz...' : 'Önce rol ailesi seçin');
    unvanSelect.disabled = true;
    unvanSelect.style.display = '';
    unvanCustomWrap.style.display = 'none';

    if (!sektor || !aile || !SEKTOR_ROL_MAP[sektor] || !SEKTOR_ROL_MAP[sektor][aile]) return;
    var titles = SEKTOR_ROL_MAP[sektor][aile] || [];
    var hasMatchInList = false;
    titles.forEach(function(t) {
      var o = document.createElement('option');
      o.value = t;
      o.textContent = t;
      if (selectedUnvan && t === selectedUnvan) {
        o.selected = true;
        hasMatchInList = true;
      }
      unvanSelect.appendChild(o);
    });
    // "+ Kendi unvanını yaz" option
    var customOpt = document.createElement('option');
    customOpt.value = '__custom__';
    customOpt.textContent = '+ Kendi pozisyonunu yaz';
    if (selectedUnvan && !hasMatchInList) {
      customOpt.selected = true;
      // Show custom field with restored value
      unvanSelect.style.display = 'none';
      unvanCustomWrap.style.display = '';
    }
    unvanSelect.appendChild(customOpt);

    unvanSelect.disabled = false;
  }

  if (sektorSelect) {
    sektorSelect.addEventListener('change', function() {
      var sektor = sektorSelect.value;
      populateRolAilesiForSector(sektor, null);
      clearSelectOptions(unvanSelect, 'Önce rol ailesi seçin');
      unvanSelect.disabled = true;
      unvanSelect.style.display = '';
      unvanCustomWrap.style.display = 'none';
    });
  }

  if (rolAilesiSelect) {
    rolAilesiSelect.addEventListener('change', function() {
      var sektor = sektorSelect ? sektorSelect.value : '';
      var aile = rolAilesiSelect.value;
      populateUnvanForAilesi(sektor, aile, null);
    });
  }

  if (unvanSelect) {
    unvanSelect.addEventListener('change', function() {
      if (unvanSelect.value === '__custom__') {
        unvanSelect.style.display = 'none';
        unvanCustomWrap.style.display = '';
      } else {
        unvanSelect.style.display = '';
        unvanCustomWrap.style.display = 'none';
      }
    });
  }

  // Suggestions (best-effort): infer sektor/rol ailesi from typed pozisyon
  var suppressSuggest = true;
  function _norm(s) { return trLower((s || '').trim()); }
  function suggestFromPozisyonText(pozisyonText) {
    var q = _norm(pozisyonText);
    if (!q || q.length < 3) return null;
    var matches = [];
    try {
      Object.keys(SEKTOR_ROL_MAP || {}).forEach(function(sek) {
        var fams = SEKTOR_ROL_MAP[sek] || {};
        Object.keys(fams).forEach(function(fam) {
          (fams[fam] || []).forEach(function(t) {
            if (_norm(t) === q) matches.push({ sektor: sek, aile: fam, unvan: t });
          });
        });
      });
    } catch (e) { return null; }
    if (matches.length === 1) return matches[0];
    return null;
  }

  var customInput = unvanCustomWrap.querySelector('input');
  if (customInput) {
    customInput.addEventListener('blur', function() {
      if (suppressSuggest) return;
      var text = customInput.value || '';
      var sug = suggestFromPozisyonText(text);
      if (!sug) return;
      // If sector not chosen, set it (this will populate role families)
      if (sektorSelect && !sektorSelect.value) {
        sektorSelect.value = sug.sektor;
        sektorSelect.dispatchEvent(new Event('change'));
      }
      // If role family empty (and sector matches), set it (this will populate pozisyon options)
      if (rolAilesiSelect && (!rolAilesiSelect.value) && sektorSelect && sektorSelect.value === sug.sektor) {
        populateRolAilesiForSector(sug.sektor, sug.aile);
        rolAilesiSelect.value = sug.aile;
        rolAilesiSelect.dispatchEvent(new Event('change'));
      }
      // If dropdown has the matching title, select it and hide custom
      if (unvanSelect && !unvanSelect.disabled) {
        var found = false;
        for (var i = 0; i < unvanSelect.options.length; i++) {
          if (unvanSelect.options[i].value === sug.unvan) { found = true; break; }
        }
        if (found) {
          unvanSelect.value = sug.unvan;
          unvanSelect.style.display = '';
          unvanCustomWrap.style.display = 'none';
        }
      }
    });
  }

  // Initial restore wiring if data provided
  if (d.sektor) {
    if (sektorSelect) {
      sektorSelect.value = d.sektor;
      sektorSelect.dispatchEvent(new Event('change'));
    }
  }
  if (d.sektor && d.rol_ailesi) {
    populateRolAilesiForSector(d.sektor, d.rol_ailesi);
    if (rolAilesiSelect) {
      rolAilesiSelect.value = d.rol_ailesi;
      rolAilesiSelect.dispatchEvent(new Event('change'));
    }
  }
  if (d.sektor && d.rol_ailesi && d.rol_unvani) {
    populateUnvanForAilesi(d.sektor, d.rol_ailesi, d.rol_unvani);
  }

  suppressSuggest = false;

  row1.appendChild(sektorWrap);
  card.appendChild(row1);
  rowRole.appendChild(rolAilesiWrap);
  rowRole.appendChild(pozCol);
  card.appendChild(rowRole);

  // Dates block: Start → (devam) → End
  var dateBlock = document.createElement('div');
  dateBlock.className = 'exp-date-block';

  var startRow = document.createElement('div');
  startRow.className = 'field-row exp-date-row exp-date-row-start';
  startRow.appendChild(makeSelectField('Başlangıç Ay', cardId + '-basay', AY_ISIMLERI, d.baslangic_ay, 'Ay'));
  startRow.appendChild(makeYearField('Başlangıç Yıl <span class=\"field-req\">*</span>', cardId + '-basyil', d.baslangic_yil));
  dateBlock.appendChild(startRow);

  // Checkbox: Halen burada çalışıyorum — only the control toggles, not the row
  var cbWrap = document.createElement('div');
  cbWrap.className = 'cb-wrap';
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = cardId + '-devam';
  if (d.devam_ediyor) cb.checked = true;
  var cbLabel = document.createElement('span');
  cbLabel.className = 'cb-label';
  cbLabel.textContent = 'Halen burada çalışıyorum';
  var checkmark = document.createElement('span');
  checkmark.className = 'cb-check';
  var controlLabel = document.createElement('label');
  controlLabel.className = 'cb-control-label';
  controlLabel.htmlFor = cb.id;
  controlLabel.appendChild(cb);
  controlLabel.appendChild(checkmark);
  controlLabel.appendChild(cbLabel);
  cbWrap.appendChild(controlLabel);

  var devamBadge = document.createElement('span');
  devamBadge.className = 'exp-devam-badge';
  devamBadge.textContent = 'Devam ediyor';
  devamBadge.style.display = d.devam_ediyor ? 'inline-block' : 'none';
  devamBadge.style.fontSize = '11px';
  devamBadge.style.fontWeight = '600';
  devamBadge.style.color = 'var(--green)';
  cbWrap.appendChild(devamBadge);
  dateBlock.appendChild(cbWrap);

  var endRow = document.createElement('div');
  endRow.className = 'field-row exp-date-row exp-date-row-end';
  var bitAyField = makeSelectField('Bitiş Ay', cardId + '-bitay', AY_ISIMLERI, d.bitis_ay, 'Ay');
  bitAyField.classList.add('bitis-field');
  endRow.appendChild(bitAyField);
  var bitYilField = makeYearField('Bitiş Yıl', cardId + '-bityil', d.bitis_yil);
  bitYilField.classList.add('bitis-field');
  endRow.appendChild(bitYilField);
  dateBlock.appendChild(endRow);

  card.appendChild(dateBlock);

  // Ayrılma Nedeni (hidden when devam_ediyor)
  var ayrilmaField = makeSelectField('Ayrılma Nedeni', cardId + '-ayrilma', AYRILMA_NEDENLERI, d.ayrilma_nedeni);
  ayrilmaField.classList.add('ayrilma-field');
  if (d.devam_ediyor) ayrilmaField.style.display = 'none';
  card.appendChild(ayrilmaField);

  // Row: İstihdam Tipi + Şehir (work details)
  var rowWork = document.createElement('div');
  rowWork.className = 'field-row';
  rowWork.appendChild(makeSelectField('İstihdam Tipi', cardId + '-istihdam', ISTIHDAM_TIPLERI, d.istihdam_tipi, 'İstihdam tipi seçiniz...'));
  rowWork.appendChild(makeSelectField('Şehir', cardId + '-sehir', flatAllCities(), d.sehir, 'Şehir seçiniz...'));
  card.appendChild(rowWork);

  // Row: Segment + Takım Büyüklüğü (additional details)
  var rowDetail = document.createElement('div');
  rowDetail.className = 'field-row';
  rowDetail.appendChild(makeSelectField('Segment', cardId + '-segment', SEGMENTLER, d.segment, 'Segment seçiniz...'));
  var takimWrap = makeSelectField('Takım Büyüklüğü', cardId + '-takim', TAKIM_BUYUKLUKLERI, d.takim_buyuklugu, 'Takım büyüklüğü seçiniz...');
  takimWrap.id = cardId + '-takim-wrap';
  rowDetail.appendChild(takimWrap);
  card.appendChild(rowDetail);

  // İş Tanımı textarea (Apple benchmark AKS-1)
  var descWrap = document.createElement('div');
  descWrap.className = 'field';
  descWrap.style.marginTop = '4px';
  var descLabel = document.createElement('label');
  descLabel.htmlFor = cardId + '-desc';
  descLabel.innerHTML = 'İş Tanımı <span class="field-hint">(opsiyonel)</span>';
  var descTa = document.createElement('textarea');
  descTa.id = cardId + '-desc';
  descTa.className = 'form-input';
  descTa.placeholder = 'Görev ve sorumluluklarınızı kısaca anlatın: ekip büyüklüğü, KPI hedefleri, özel projeler...';
  descTa.rows = 3;
  descTa.style.resize = 'vertical';
  descTa.style.minHeight = '60px';
  if (d.description) descTa.value = d.description;
  descWrap.appendChild(descLabel);
  descWrap.appendChild(descTa);
  card.appendChild(descWrap);

  // Toggle bitis fields and ayrilma based on checkbox
  cb.addEventListener('change', function() {
    var bitisFields = card.querySelectorAll('.bitis-field');
    var ayrilma = card.querySelector('.ayrilma-field');
    bitisFields.forEach(function(f) {
      var sel = f.querySelector('select');
      if (cb.checked) {
        f.style.display = 'none';
        if (sel) { sel.value = ''; sel.disabled = true; }
      } else {
        f.style.display = '';
        if (sel) sel.disabled = false;
      }
    });
    if (ayrilma) ayrilma.style.display = cb.checked ? 'none' : '';
    // Badge + card border
    devamBadge.style.display = cb.checked ? 'inline-block' : 'none';
    // Border removed — devam badge is sufficient indicator
  });
  // Trigger initial state
  if (d.devam_ediyor) {
    card.querySelectorAll('.bitis-field').forEach(function(f) {
      f.style.display = 'none';
      var sel = f.querySelector('select');
      if (sel) { sel.value = ''; sel.disabled = true; }
    });
    // Border removed
  }

  // Basari Ozeti removed from wizard (Decision 5 — future dashboard feature)

  // Separator
  var sep = document.createElement('hr');
  sep.className = 'section-divider';
  sep.style.margin = '12px 0 0';
  card.appendChild(sep);

  var container = document.getElementById('exp-cards-container');
  if (container) container.appendChild(card);
}

// ── DELETE CONFIRMATION HELPER ──
// First click → button becomes "Sil?" confirmation; second click → executes delete.
// Resets after 2.5s if user doesn't confirm.
// NOTE: DEL_ICON is a static SVG constant (no user input), safe for innerHTML.
var DEL_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

function attachDeleteConfirm(btn, onConfirm) {
  var timer = null;
  btn.addEventListener('click', function() {
    if (btn.dataset.confirming === '1') {
      clearTimeout(timer);
      btn.dataset.confirming = '';
      onConfirm();
      return;
    }
    btn.dataset.confirming = '1';
    btn.textContent = 'Sil?';
    btn.style.width = 'auto';
    btn.style.padding = '0 10px';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '700';
    btn.style.fontFamily = "'Plus Jakarta Sans',sans-serif";
    timer = setTimeout(function() {
      btn.dataset.confirming = '';
      btn.innerHTML = DEL_ICON_SVG; // static constant, safe
      btn.style.width = '';
      btn.style.padding = '';
      btn.style.fontSize = '';
      btn.style.fontWeight = '';
      btn.style.fontFamily = '';
    }, 2500);
  });
}

// ── FIELD FACTORY HELPERS ──

function makeField(type, labelText, id, placeholder, value) {
  var wrap = document.createElement('div');
  wrap.className = 'field';
  var lbl = document.createElement('label');
  lbl.innerHTML = labelText;
  var input = document.createElement('input');
  input.type = type;
  input.id = id;
  if (placeholder) input.placeholder = placeholder;
  if (value != null) input.value = value;
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}

function makeSelectField(labelText, id, options, selectedVal, placeholderText) {
  var wrap = document.createElement('div');
  wrap.className = 'field';
  var lbl = document.createElement('label');
  lbl.innerHTML = labelText;
  var sel = document.createElement('select');
  sel.id = id;
  var defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = placeholderText || 'Seç...';
  sel.appendChild(defOpt);
  options.forEach(function(opt) {
    var o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (selectedVal && opt === selectedVal) o.selected = true;
    sel.appendChild(o);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(sel);
  return wrap;
}

function makeYearField(labelText, id, selectedVal) {
  var wrap = document.createElement('div');
  wrap.className = 'field';
  var lbl = document.createElement('label');
  lbl.innerHTML = labelText;
  var sel = document.createElement('select');
  sel.id = id;
  var defOpt = document.createElement('option');
  defOpt.value = '';
  defOpt.textContent = 'Yıl';
  sel.appendChild(defOpt);
  var cy = new Date().getFullYear();
  for (var y = cy; y >= 1990; y--) {
    var o = document.createElement('option');
    o.value = String(y);
    o.textContent = String(y);
    if (selectedVal && String(y) === String(selectedVal)) o.selected = true;
    sel.appendChild(o);
  }
  wrap.appendChild(lbl);
  wrap.appendChild(sel);
  return wrap;
}

// Smart merged Sirket/Marka field (Decision 2)
// Canonical brand display formatter — single source of truth for how brand + company appears.
// Used by: autocomplete item label, autocomplete pick, restore from DB.
function formatBrandDisplay(brandName, companyName) {
  if (!brandName) return companyName || '';
  if (companyName && companyName !== brandName) return brandName + ' (' + companyName + ')';
  return brandName;
}

// Single visible input with brand autocomplete.
// Stores selected brand data in hidden data attributes for split at save time.
function makeSmartBrandField(id, data, required) {
  var wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.style.position = 'relative';
  var lbl = document.createElement('label');
  lbl.innerHTML = required ? 'Şirket / Marka <span class="field-req">*</span>' : 'Şirket / Marka';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.placeholder = 'Örnek: Zara, Sephora, Fendi...';
  input.autocomplete = 'off';

  // Restore display value using shared formatter
  var restoreMarka = data.marka || '';
  var restoreSirket = data.sirket_adi || data.sirket || '';
  var displayVal = formatBrandDisplay(restoreMarka, restoreSirket) || restoreSirket;
  if (displayVal) input.value = displayVal;

  // Hidden data: the resolved sirket + marka values for DB
  input.dataset.resolvedSirket = data.sirket_adi || data.sirket || '';
  input.dataset.resolvedMarka = data.marka || '';
  // FK ids: populated from autocomplete pick, blur resolve, or DB restore
  input.dataset.brandId = data.brand_id || '';
  input.dataset.companyId = data.company_id || '';
  // Snapshot of the display string set by autocomplete pick (used for race-condition guard)
  input.dataset.pickedDisplay = input.value || '';

  var sugBox = document.createElement('div');
  sugBox.className = 'autocomplete-list';
  sugBox.id = id + '-sug';

  input.addEventListener('input', function() {
    // Only clear brand mapping if the text no longer matches the autocomplete pick
    if (input.dataset.resolvedMarka && input.value === input.dataset.pickedDisplay) return;
    input.dataset.resolvedSirket = input.value;
    input.dataset.resolvedMarka = '';
    input.dataset.brandId = '';
    input.dataset.companyId = '';
    input.dataset.pickedDisplay = '';
    showSmartBrandSuggestions(input, sugBox);
  });
  input.addEventListener('focus', function() {
    if (input.value.length >= 1) showSmartBrandSuggestions(input, sugBox);
  });
  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) sugBox.style.display = 'none';
  });

  // Display normalization on blur (freeform only — brand picks are already clean)
  input.addEventListener('blur', function() {
    if (!input.dataset.resolvedMarka && input.value) {
      // Try exact match against BRAND_DB before falling back to freeform
      var q = trLower(input.value.trim());
      if (typeof BRAND_DB === 'undefined') { input.value = normalizeForDisplay(input.value); input.dataset.resolvedSirket = input.value; return; }

      // 1) Exact brand name match
      var brandMatch = BRAND_DB.find(function(b) { return trLower(b.name) === q; });
      if (brandMatch) {
        var pickText = formatBrandDisplay(brandMatch.name, brandMatch.parent || '');
        input.value = pickText;
        input.dataset.resolvedMarka = brandMatch.name;
        input.dataset.resolvedSirket = brandMatch.parent || brandMatch.name;
        input.dataset.brandId = brandMatch.brand_id || '';
        input.dataset.companyId = brandMatch.company_id || '';
        input.dataset.pickedDisplay = pickText;
        return;
      }

      // 2) Exact parent/company name match
      var childBrands = BRAND_DB.filter(function(b) { return b.parent && trLower(b.parent) === q; });
      if (childBrands.length === 1) {
        // Single brand under this company — safe to resolve fully
        var only = childBrands[0];
        var pickText2 = formatBrandDisplay(only.name, only.parent);
        input.value = pickText2;
        input.dataset.resolvedMarka = only.name;
        input.dataset.resolvedSirket = only.parent;
        input.dataset.brandId = only.brand_id || '';
        input.dataset.companyId = only.company_id || '';
        input.dataset.pickedDisplay = pickText2;
      } else if (childBrands.length > 1) {
        // Multiple brands — resolve company only, don't guess brand
        var companyName = childBrands[0].parent;
        input.value = companyName;
        input.dataset.resolvedSirket = companyName;
        input.dataset.resolvedMarka = '';
        input.dataset.brandId = '';
        // Company id from lookup (safe — all children share same parent company_id)
        input.dataset.companyId = _companyIdLookup[trLower(companyName)] || '';
        input.dataset.pickedDisplay = '';
      } else {
        // No match at all — freeform, try company name lookup for id
        input.value = normalizeForDisplay(input.value);
        input.dataset.resolvedSirket = input.value;
        input.dataset.brandId = '';
        input.dataset.companyId = _companyIdLookup[trLower(input.value.trim())] || '';
      }
    }
  });

  var helper = document.createElement('p');
  helper.className = 'helper-text';
  helper.style.cssText = 'font-size:12px;color:var(--muted);margin:4px 0 0 0;';
  helper.textContent = 'Listeden seç veya serbest yaz. Marka adı otomatik eşleştirilir.';

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  wrap.appendChild(sugBox);
  wrap.appendChild(helper);
  return wrap;
}

function showSmartBrandSuggestions(input, sugBox) {
  var q = trLower(input.value);
  if (q.length < 1) { sugBox.style.display = 'none'; return; }
  var matches = BRAND_DB.filter(function(b) {
    return trLower(b.name).indexOf(q) !== -1 || (b.parent && trLower(b.parent).indexOf(q) !== -1);
  }).slice(0, 8);
  if (matches.length === 0) { sugBox.style.display = 'none'; return; }
  sugBox.textContent = '';
  matches.forEach(function(b) {
    var item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = formatBrandDisplay(b.name, b.parent || '');
    item.addEventListener('mousedown', function(e) {
      e.preventDefault();
      // Smart split: brand name is marka, parent (or brand itself) is sirket
      var pickText = formatBrandDisplay(b.name, b.parent || '');
      input.value = pickText;
      input.dataset.resolvedMarka = b.name;
      input.dataset.resolvedSirket = b.parent || b.name;
      input.dataset.brandId = b.brand_id || '';
      input.dataset.companyId = b.company_id || '';
      input.dataset.pickedDisplay = pickText;
      sugBox.style.display = 'none';
    });
    sugBox.appendChild(item);
  });
  sugBox.style.display = 'block';
}

// Collect experience data from all cards
function monthNameToIndex(name) {
  var idx = AY_ISIMLERI.indexOf(name);
  return idx >= 0 ? idx + 1 : null;
}

function monthIndexToName(idx) {
  if (!idx || idx < 1 || idx > 12) return '';
  return AY_ISIMLERI[idx - 1];
}

function collectExperiences() {
  var cards = document.querySelectorAll('.exp-card');
  var result = [];
  cards.forEach(function(card) {
    var prefix = card.id + '-';
    // Smart brand field: read resolved split from dataset
    var sirketInput = document.getElementById(prefix + 'sirket');
    var resolvedSirket = sirketInput ? (sirketInput.dataset.resolvedSirket || sirketInput.value) : '';
    var resolvedMarka = sirketInput ? (sirketInput.dataset.resolvedMarka || '') : '';
    // Safety: normalize freeform company at collect-time (covers save-before-blur edge case)
    if (!resolvedMarka && resolvedSirket) resolvedSirket = normalizeForDisplay(resolvedSirket);
    // Pozisyon resolution: cascade dropdown wins unless custom sentinel selected
    var unvanSelectVal = nullIfEmpty(val(prefix + 'unvan-sec'));
    var unvanCustomVal = nullIfEmpty(val(prefix + 'unvan-custom'));
    var resolvedPozisyon = null;
    if (unvanSelectVal === '__custom__') {
      resolvedPozisyon = unvanCustomVal;
    } else {
      resolvedPozisyon = unvanSelectVal || unvanCustomVal || null;
    }
    if (resolvedPozisyon) resolvedPozisyon = normalizeForDisplay(resolvedPozisyon);

    // Skip incomplete cards: DB requires baslangic_yil NOT NULL
    var basyil = val(prefix + 'basyil') ? parseInt(val(prefix + 'basyil')) : null;
    if (!basyil) return;

    // Resolve FK ids from dataset (set by autocomplete pick or blur match)
    var resolvedBrandId = sirketInput ? (sirketInput.dataset.brandId || null) : null;
    var resolvedCompanyId = sirketInput ? (sirketInput.dataset.companyId || null) : null;
    // Safety fallback: if ids missing but text resolved, try lookup now
    if ((!resolvedBrandId || !resolvedCompanyId) && (resolvedMarka || resolvedSirket)) {
      var ids = _resolveBrandCompanyIds(resolvedMarka, resolvedSirket);
      if (!resolvedBrandId && ids.brand_id) resolvedBrandId = ids.brand_id;
      if (!resolvedCompanyId && ids.company_id) resolvedCompanyId = ids.company_id;
    }

    result.push({
      sirket: resolvedSirket,
      marka: nullIfEmpty(resolvedMarka),
      pozisyon: resolvedPozisyon,
      sektor: nullIfEmpty(val(prefix + 'sektor')),
      rol_ailesi: nullIfEmpty(val(prefix + 'ailesi')),
      rol_unvani: resolvedPozisyon,
      segment: nullIfEmpty(val(prefix + 'segment')),
      istihdam_tipi: nullIfEmpty(val(prefix + 'istihdam')),
      kidem_seviyesi: null,   // Decision 1: removed from UI, always null
      lokasyon_tipi: null,    // Decision 3: removed from UI, always null
      sehir: nullIfEmpty(val(prefix + 'sehir')),
      takim_buyuklugu: nullIfEmpty(val(prefix + 'takim')),
      baslangic_ay: monthNameToIndex(val(prefix + 'basay')),
      baslangic_yil: basyil,
      bitis_ay: monthNameToIndex(val(prefix + 'bitay')),
      bitis_yil: val(prefix + 'bityil') ? parseInt(val(prefix + 'bityil')) : null,
      devam_ediyor: document.getElementById(prefix + 'devam') ? document.getElementById(prefix + 'devam').checked : false,
      ayrilma_nedeni: nullIfEmpty(val(prefix + 'ayrilma')),
      basari_ozeti: null,     // Decision 5: removed from wizard, always null
      description: nullIfEmpty(val(prefix + 'desc')),
      company_id: resolvedCompanyId ? parseInt(resolvedCompanyId) : null,
      brand_id: resolvedBrandId ? parseInt(resolvedBrandId) : null
    });
  });
  return result;
}

// ═══════════════════════════════════════════════════
// STEP 3: EGITIM + DILLER + SERTIFIKALAR
// ═══════════════════════════════════════════════════

var eduCounter = 0;
var langCounter = 0;
var certCounter = 0;

function initStep3() {
  var btnAddEdu = document.getElementById('btn-add-edu');
  if (btnAddEdu) btnAddEdu.addEventListener('click', function() { addEducationRow(); });

  var btnAddLang = document.getElementById('btn-add-lang');
  if (btnAddLang) btnAddLang.addEventListener('click', function() { addLanguageRow(); });

  var btnAddCert = document.getElementById('btn-add-cert');
  if (btnAddCert) btnAddCert.addEventListener('click', function() { addCertificateRow(); });

  // Add one default row for each — skip if applyDraft already restored data
  var eduC = document.getElementById('edu-rows-container');
  if (!eduC || eduC.children.length === 0) addEducationRow();
  var langC = document.getElementById('lang-rows-container');
  if (!langC || langC.children.length === 0) addLanguageRow();
}

function addEducationRow(data) {
  var container = document.getElementById('edu-rows-container');
  if (!container) return;
  if (container.children.length >= 3) {
    document.getElementById('edu-limit-msg').style.display = 'block';
    return;
  }
  eduCounter++;
  var d = data || {};
  // Normalize: accept both DB dialect and UI dialect
  if (!d.seviye && d.egitim_seviye) d.seviye = d.egitim_seviye;
  if (!d.okul_adi && d.okul) d.okul_adi = d.okul;
  if (!d.mezuniyet_yili && d.mezun_yil) d.mezuniyet_yili = String(d.mezun_yil);
  var rowId = 'edu-' + eduCounter;

  var row = document.createElement('div');
  row.className = 'dynamic-row';
  row.id = rowId;

  var fields = document.createElement('div');
  fields.className = 'field-row';
  fields.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';

  fields.appendChild(makeSelectField('Seviye', rowId + '-seviye', EGITIM_SEVIYELERI, d.seviye));
  fields.appendChild(makeAutoField('Okul', rowId + '-okul', UNIVERSITE_DB.map(function(u) { return u.name; }), d.okul_adi));
  fields.appendChild(makeAutoField('Bolum', rowId + '-bolum', BOLUM_DB, d.bolum));
  fields.appendChild(makeYearField('Mezun Yil', rowId + '-mezyil', d.mezuniyet_yili));

  row.appendChild(fields);

  // Delete button
  var delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.type = 'button';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  attachDeleteConfirm(delBtn, function() {
    row.remove();
    if (typeof markWizardDirty === 'function') markWizardDirty();
    document.getElementById('edu-limit-msg').style.display = container.children.length >= 3 ? 'block' : 'none';
  });
  row.style.position = 'relative';
  row.appendChild(delBtn);

  container.appendChild(row);
  document.getElementById('edu-limit-msg').style.display = container.children.length >= 3 ? 'block' : 'none';
}

function addLanguageRow(data) {
  var container = document.getElementById('lang-rows-container');
  if (!container) return;
  if (container.children.length >= 5) {
    document.getElementById('lang-limit-msg').style.display = 'block';
    return;
  }
  langCounter++;
  var d = data || {};
  var rowId = 'lang-' + langCounter;

  var row = document.createElement('div');
  row.className = 'dynamic-row';
  row.id = rowId;

  var fields = document.createElement('div');
  fields.className = 'field-row';
  fields.appendChild(makeSelectField('Dil', rowId + '-dil', DIL_LISTESI, d.dil));
  fields.appendChild(makeSelectField('Seviye', rowId + '-seviye', DIL_SEVIYELERI, d.seviye));
  row.appendChild(fields);

  // Delete button
  var delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.type = 'button';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  attachDeleteConfirm(delBtn, function() {
    row.remove();
    if (typeof markWizardDirty === 'function') markWizardDirty();
    document.getElementById('lang-limit-msg').style.display = container.children.length >= 5 ? 'block' : 'none';
  });
  row.style.position = 'relative';
  row.appendChild(delBtn);

  container.appendChild(row);
  document.getElementById('lang-limit-msg').style.display = container.children.length >= 5 ? 'block' : 'none';
}

function addCertificateRow(data) {
  var container = document.getElementById('cert-rows-container');
  if (!container) return;
  certCounter++;
  var d = data || {};
  var rowId = 'cert-' + certCounter;

  var row = document.createElement('div');
  row.className = 'dynamic-row';
  row.id = rowId;

  var fields = document.createElement('div');
  fields.className = 'field-row';
  fields.style.gridTemplateColumns = '1fr 1fr 1fr';
  fields.appendChild(makeField('text', 'Eğitim / Sertifika Adı', rowId + '-adi', 'Örnek: Excel İleri Seviye', d.egitim_adi));
  fields.appendChild(makeField('text', 'Kurum', rowId + '-kurum', 'Veren kurum', d.kurum));
  fields.appendChild(makeYearField('Yil', rowId + '-yil', d.yil));
  row.appendChild(fields);

  var delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.type = 'button';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  attachDeleteConfirm(delBtn, function() { row.remove(); if (typeof markWizardDirty === 'function') markWizardDirty(); });
  row.style.position = 'relative';
  row.appendChild(delBtn);

  container.appendChild(row);
}

// Autocomplete field for okul/bolum
function makeAutoField(labelText, id, dataList, value) {
  var wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.style.position = 'relative';
  var lbl = document.createElement('label');
  lbl.textContent = labelText;
  var input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.placeholder = labelText + ' ara...';
  input.autocomplete = 'off';
  if (value != null) input.value = value;
  var sugBox = document.createElement('div');
  sugBox.className = 'autocomplete-list';
  sugBox.id = id + '-sug';

  input.addEventListener('input', function() {
    showAutoSuggestions(input, sugBox, dataList);
  });
  input.addEventListener('focus', function() {
    if (input.value.length >= 1) showAutoSuggestions(input, sugBox, dataList);
  });
  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) sugBox.style.display = 'none';
  });

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  wrap.appendChild(sugBox);
  return wrap;
}

function showAutoSuggestions(input, sugBox, dataList) {
  var q = trLower(input.value);
  if (q.length < 1) { sugBox.style.display = 'none'; return; }
  var matches = dataList.filter(function(item) {
    return trLower(item).indexOf(q) !== -1;
  }).slice(0, 8);
  if (matches.length === 0) { sugBox.style.display = 'none'; return; }
  sugBox.textContent = '';
  matches.forEach(function(m) {
    var item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = m;
    item.addEventListener('mousedown', function(e) {
      e.preventDefault();
      input.value = m;
      sugBox.style.display = 'none';
    });
    sugBox.appendChild(item);
  });
  sugBox.style.display = 'block';
}

// Collect education data
function collectEducation() {
  var rows = document.querySelectorAll('#edu-rows-container .dynamic-row');
  var result = [];
  rows.forEach(function(row) {
    var p = row.id + '-';
    var item = { egitim_seviye: nullIfEmpty(val(p + 'seviye')), okul: nullIfEmpty(val(p + 'okul')), bolum: nullIfEmpty(val(p + 'bolum')), mezun_yil: val(p + 'mezyil') ? parseInt(val(p + 'mezyil')) : null };
    if (item.egitim_seviye || item.okul) result.push(item);
  });
  return result;
}

function collectLanguages() {
  var rows = document.querySelectorAll('#lang-rows-container .dynamic-row');
  var result = [];
  rows.forEach(function(row) {
    var p = row.id + '-';
    var item = { dil: nullIfEmpty(val(p + 'dil')), seviye: nullIfEmpty(val(p + 'seviye')) };
    if (item.dil) result.push(item);
  });
  return result;
}

function collectCertificates() {
  var rows = document.querySelectorAll('#cert-rows-container .dynamic-row');
  var result = [];
  rows.forEach(function(row) {
    var p = row.id + '-';
    var item = { egitim_adi: nullIfEmpty(val(p + 'adi')), kurum: nullIfEmpty(val(p + 'kurum')), yil: val(p + 'yil') ? parseInt(val(p + 'yil')) : null };
    if (item.egitim_adi) result.push(item);
  });
  return result;
}

// ═══════════════════════════════════════════════════
// STEP 4: TERCIHLERIM
// ═══════════════════════════════════════════════════

var roleCounter = 0;
var selectedMusaitlik = '';
var selectedCalismaTipleri = [];
var selectedSegmentler = [];
var selectedBrandInterests = [];

function initStep4() {
  var btnAddRole = document.getElementById('btn-add-role');
  if (btnAddRole) btnAddRole.addEventListener('click', function() { addTargetRoleRow(); });
  // Default first row — skip if applyDraft already restored data
  var roleC = document.getElementById('target-roles-container');
  if (!roleC || roleC.children.length === 0) addTargetRoleRow();

  // Musaitlik chips
  var musaitlikContainer = document.getElementById('musaitlik-chips');
  if (musaitlikContainer) {
    MUSAITLIK_SECENEKLERI.forEach(function(m) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = m;
      chip.addEventListener('click', function() {
        musaitlikContainer.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        selectedMusaitlik = m;
      });
      musaitlikContainer.appendChild(chip);
    });
  }

  // Calisma Tipleri — check-item buttons (multi-select, no Stajyer)
  var ctContainer = document.getElementById('calisma-tipleri-checks');
  if (ctContainer) {
    CALISMA_TIPLERI.forEach(function(tip) {
      var btn = document.createElement('button');
      btn.className = 'check-item';
      btn.type = 'button';
      btn.textContent = tip;
      if (selectedCalismaTipleri.indexOf(tip) !== -1) btn.classList.add('checked');
      btn.addEventListener('click', function() {
        btn.classList.toggle('checked');
        if (btn.classList.contains('checked')) {
          selectedCalismaTipleri.push(tip);
        } else {
          selectedCalismaTipleri = selectedCalismaTipleri.filter(function(t) { return t !== tip; });
        }
      });
      ctContainer.appendChild(btn);
    });
  }

  // Segment chips
  var segContainer = document.getElementById('segment-chips');
  if (segContainer) {
    SEGMENTLER.forEach(function(s) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = s;
      chip.addEventListener('click', function() {
        chip.classList.toggle('selected');
        if (chip.classList.contains('selected')) {
          selectedSegmentler.push(s);
        } else {
          selectedSegmentler = selectedSegmentler.filter(function(x) { return x !== s; });
        }
      });
      segContainer.appendChild(chip);
    });
  }

  // Brand interest autocomplete
  var brandInput = document.getElementById('f-brand-interest');
  var brandSug = document.getElementById('brand-interest-sug');
  if (brandInput && brandSug) {
    brandInput.addEventListener('input', function() {
      showBrandInterestSuggestions(brandInput, brandSug);
    });
    brandInput.addEventListener('focus', function() {
      if (brandInput.value.length >= 1) showBrandInterestSuggestions(brandInput, brandSug);
    });
    document.addEventListener('click', function(e) {
      if (e.target !== brandInput && e.target !== brandSug) brandSug.style.display = 'none';
    });
  }

  // Career type — single-select check-item buttons
  var ctypeContainer = document.getElementById('career-type-checks');
  if (ctypeContainer) {
    CAREER_TYPE_OPTIONS.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'check-item';
      btn.type = 'button';
      btn.textContent = opt.label;
      btn.dataset.value = opt.value;
      if (selectedCareerTypes.indexOf(opt.value) !== -1) btn.classList.add('checked');
      btn.addEventListener('click', function() {
        var wasChecked = btn.classList.contains('checked');
        // Single-select: deselect all first
        ctypeContainer.querySelectorAll('.check-item').forEach(function(b) { b.classList.remove('checked'); });
        if (wasChecked) {
          selectedCareerTypes = [];
        } else {
          btn.classList.add('checked');
          selectedCareerTypes = [opt.value];
        }
      });
      ctypeContainer.appendChild(btn);
    });
  }
}

function addTargetRoleRow(data) {
  var container = document.getElementById('target-roles-container');
  if (!container) return;
  // Limit to 5 target positions
  if (container.children.length >= 5) return;
  roleCounter++;
  var d = data || {};
  var rowId = 'role-' + roleCounter;
  var restoreUnvan = d.rol_unvani || '';

  var row = document.createElement('div');
  row.className = 'dynamic-row';
  row.id = rowId;
  row.style.position = 'relative';

  // Single dropdown for position title (rol_ailesi derived at save time)
  var options = (typeof RETAIL_POSITIONS !== 'undefined') ? RETAIL_POSITIONS.slice() : [];
  // If restoring a saved value not in the current catalog, inject it so it's not lost
  if (restoreUnvan && options.indexOf(restoreUnvan) === -1) {
    options.unshift(restoreUnvan);
  }

  var fields = document.createElement('div');
  fields.className = 'field-row';
  fields.appendChild(makeSelectField('Hedef Pozisyon', rowId + '-unvan', options, restoreUnvan, 'Pozisyon se\u00e7...'));
  row.appendChild(fields);

  var delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.type = 'button';
  delBtn.textContent = '';
  // Static SVG icon (no user data)
  delBtn.innerHTML = DEL_ICON_SVG;
  attachDeleteConfirm(delBtn, function() { row.remove(); if (typeof markWizardDirty === 'function') markWizardDirty(); });
  row.appendChild(delBtn);

  container.appendChild(row);
}

function showBrandInterestSuggestions(input, sugBox) {
  var q = trLower(input.value);
  if (q.length < 1) { sugBox.style.display = 'none'; return; }
  var matches = BRAND_DB.filter(function(b) {
    return (trLower(b.name).indexOf(q) !== -1 || (b.parent && trLower(b.parent).indexOf(q) !== -1))
      && selectedBrandInterests.indexOf(b.name) === -1;
  }).slice(0, 8);
  if (matches.length === 0) { sugBox.style.display = 'none'; return; }
  sugBox.textContent = '';
  matches.forEach(function(b) {
    var item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = b.name + (b.parent ? ' (' + b.parent + ')' : '');
    item.addEventListener('mousedown', function(e) {
      e.preventDefault();
      addBrandInterestChip(b.name);
      input.value = '';
      sugBox.style.display = 'none';
    });
    sugBox.appendChild(item);
  });
  sugBox.style.display = 'block';
}

function addBrandInterestChip(name) {
  if (selectedBrandInterests.indexOf(name) !== -1) return;
  selectedBrandInterests.push(name);
  renderBrandInterestChips();
}

function renderBrandInterestChips() {
  var container = document.getElementById('brand-interest-chips');
  if (!container) return;
  container.textContent = '';
  selectedBrandInterests.forEach(function(name) {
    var tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = name;
    var del = document.createElement('button');
    del.type = 'button';
    del.textContent = '\u00D7';
    del.style.cssText = 'border:none;background:none;cursor:pointer;margin-left:6px;font-size:14px;color:inherit;';
    del.addEventListener('click', function() {
      selectedBrandInterests = selectedBrandInterests.filter(function(n) { return n !== name; });
      renderBrandInterestChips();
    });
    tag.appendChild(del);
    container.appendChild(tag);
  });
}

function collectTargetRoles() {
  var rows = document.querySelectorAll('#target-roles-container .dynamic-row');
  var result = [];
  var seen = {}; // duplicate prevention
  rows.forEach(function(row) {
    var p = row.id + '-';
    var rawUnvan = nullIfEmpty(val(p + 'unvan'));
    if (!rawUnvan) return;
    // Derive rol_ailesi from retail position catalog
    var family = (typeof POSITION_TO_FAMILY !== 'undefined') ? POSITION_TO_FAMILY[rawUnvan] : null;
    if (!family) family = 'Di\u011fer'; // fallback for legacy/custom values
    // Deduplicate
    if (seen[rawUnvan]) return;
    seen[rawUnvan] = true;
    result.push({ rol_ailesi: family, rol_unvani: rawUnvan });
  });
  return result;
}

function collectWorkPrefs() {
  // Career type: single-select (max 1 value)
  var ct = selectedCareerTypes.length > 0 ? selectedCareerTypes[0] : null;
  return {
    musaitlik: nullIfEmpty(selectedMusaitlik),
    calisma_tipleri: selectedCalismaTipleri,
    tercih_segmentler: selectedSegmentler,
    career_goal: null,
    career_type: ct,
    travel_willingness: nullIfEmpty(val('f-seyahat')),
    shift_flexibility: nullIfEmpty(val('f-vardiya')),
    notice_period: nullIfEmpty(val('f-ihbar'))
  };
}

// ═══════════════════════════════════════════════════
// STEP 5: LOKASYON TERCIHLERI
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// Location state, initStep5, and location modal moved to profil-locations.js
// Provides: selectedLocations, POPULAR_CITIES, initStep5,
//   toggleCitySelection, updateCityChipStates, renderSelectedCities,
//   openLocationModal, collectLocations
// ═══════════════════════════════════════════════════


function updateStep6HideState() {
  var wizHide = document.getElementById('wiz-toggle-hide');
  var hideCard = document.getElementById('wiz-setting-hide');
  var hideHint = document.getElementById('wiz-hide-disabled-hint');
  var hideDesc = document.getElementById('wiz-hide-desc');

  var hasCurrent = false;
  var cbNoExp = document.getElementById('cb-no-experience');
  if (!cbNoExp || !cbNoExp.checked) {
    var expCards = document.querySelectorAll('.exp-card');
    for (var i = 0; i < expCards.length; i++) {
      var devamCb = expCards[i].querySelector('[id$="-devam"]');
      if (devamCb && devamCb.checked) { hasCurrent = true; break; }
    }
  }

  if (hideCard) hideCard.classList.toggle('disabled-card', !hasCurrent);
  if (wizHide) wizHide.disabled = !hasCurrent;
  if (hideHint) hideHint.style.display = hasCurrent ? 'none' : '';
  if (hideDesc) hideDesc.textContent = hasCurrent
    ? 'Mevcut işvereninin profilini görmesini engeller.'
    : 'Şu an aktif bir işveren kaydın bulunmuyor.';
}

function initStep6() {
  var wizVis = document.getElementById('wiz-toggle-visibility');
  var wizActive = document.getElementById('wiz-toggle-active');
  var wizHide = document.getElementById('wiz-toggle-hide');

  var merkezVis = document.getElementById('merkez-toggle-visibility');
  var merkezActive = document.getElementById('merkez-toggle-active');
  var merkezHide = document.getElementById('merkez-hide-from-current-employer');

  if (wizVis && merkezVis) wizVis.checked = merkezVis.checked;
  if (wizActive && merkezActive) wizActive.checked = merkezActive.checked;
  if (wizHide && merkezHide) wizHide.checked = merkezHide.checked;

  if (wizVis) wizVis.addEventListener('change', function() {
    if (merkezVis) { merkezVis.checked = wizVis.checked; merkezVis.dispatchEvent(new Event('change')); }
  });
  if (wizActive) wizActive.addEventListener('change', function() {
    if (merkezActive) { merkezActive.checked = wizActive.checked; merkezActive.dispatchEvent(new Event('change')); }
  });
  if (wizHide) wizHide.addEventListener('change', function() {
    if (merkezHide) { merkezHide.checked = wizHide.checked; merkezHide.dispatchEvent(new Event('change')); }
  });
}


// ═══════════════════════════════════════════════════
// TASK 11: FINAL SAVE VIA RPC
// ═══════════════════════════════════════════════════

async function saveProfileRPC(onComplete) {
  var btnComplete = document.getElementById('btn-wiz-complete');
  if (btnComplete) { btnComplete.disabled = true; btnComplete.textContent = 'Kaydediliyor...'; }

  // Assemble p_profile (nullIfEmpty on optional selects to avoid CHECK failures)
  var p_profile = {
    full_name: val('f-adsoyad'),
    email: currentUser ? currentUser.email : '',
    telefon: nullIfEmpty(val('f-telefon')),
    cinsiyet: nullIfEmpty(val('f-cinsiyet')),
    dogum_yili: nullIfEmpty(val('f-dogumyili')),
    adres_il: nullIfEmpty(val('f-adresil')),
    adres_ilce: nullIfEmpty(val('f-adresilce')),
    linkedin: nullIfEmpty(val('f-linkedin')),
    engel_durumu: nullIfEmpty(val('f-engel')),
    askerlik_durumu: nullIfEmpty(val('f-askerlik')),
    is_active: document.getElementById('merkez-toggle-visibility')
      ? document.getElementById('merkez-toggle-visibility').checked
      : (_loadedDBData && _loadedDBData.profile && typeof _loadedDBData.profile.is_active === 'boolean'
          ? _loadedDBData.profile.is_active
          : true),
    ilk_deneyim: document.getElementById('cb-no-experience') ? document.getElementById('cb-no-experience').checked : false
  };

  // Assemble experiences
  var cbNoExp = document.getElementById('cb-no-experience');
  var p_experiences = (cbNoExp && cbNoExp.checked) ? [] : collectExperiences();

  // Assemble education, languages, certificates
  var p_education = collectEducation();
  var p_certificates = collectCertificates();
  var p_languages = collectLanguages();

  // Assemble target roles
  var p_target_roles = collectTargetRoles();

  // Assemble work preferences
  var wp = collectWorkPrefs();
  var p_work_prefs = {
    musaitlik: wp.musaitlik || null,
    calisma_tipleri: wp.calisma_tipleri || [],
    segmentler: wp.tercih_segmentler || [],
    career_goal: wp.career_goal || null,
    career_type: wp.career_type || null
  };

  // Assemble brand interests
  var p_brand_interests = selectedBrandInterests.map(function(name) {
    var bHit = _brandIdLookup[trLower(name)];
    return { marka: name, brand_id: bHit ? bHit.brand_id : null };
  });

  // Assemble locations
  var p_locations = collectLocations();

  try {
    var result = await supabase.rpc('save_candidate_profile', {
      p_profile: p_profile,
      p_experiences: p_experiences,
      p_education: p_education,
      p_certificates: p_certificates,
      p_languages: p_languages,
      p_target_roles: p_target_roles,
      p_work_prefs: p_work_prefs,
      p_brand_interests: p_brand_interests,
      p_locations: p_locations
    });

    if (result.error) {
      var e = result.error;
      var err = new Error(e.message || 'Profil kaydedilemedi.');
      err.code = e.code;
      err.details = e.details;
      err.hint = e.hint;
      throw err;
    }

    // Success
    clearDraft();
    wizardDirty = false; // Reset dirty state so success modal → switchPanel won't trigger guard
    ht_track('profile_save_success');
    // Update success modal with completion percentage
    var _successDesc = document.getElementById('modal-success-desc');
    if (_successDesc && typeof calculateCompletion === 'function') {
      var _pct = calculateCompletion();
      _successDesc.textContent = _pct >= 100
        ? 'Tebrikler! Profilin %100 tamamlandı.'
        : 'Profilin %' + _pct + ' tamamlandı. Eksikleri tamamlayarak daha fazla işveren tarafından görülebilirsin.';
    }
    document.getElementById('modal-success').classList.add('show');
    if (_loadedDBData) {
      // Transform collected shape to match loadProfileFromDB output shape
      // so preview/summary consumers see consistent field names.
      _loadedDBData.experiences = p_experiences.map(function(e) {
        return {
          sirket_adi: e.sirket || '',
          marka: e.marka || '',
          pozisyon: e.pozisyon || '',
          sektor: e.sektor || null,
          rol_ailesi: e.rol_ailesi || null,
          rol_unvani: e.rol_unvani || null,
          segment: e.segment, istihdam_tipi: e.istihdam_tipi,
          kidem_seviyesi: e.kidem_seviyesi, lokasyon_tipi: e.lokasyon_tipi,
          sehir: e.sehir, takim_buyuklugu: e.takim_buyuklugu,
          baslangic_ay: monthIndexToName(e.baslangic_ay),
          baslangic_yil: e.baslangic_yil != null ? String(e.baslangic_yil) : '',
          bitis_ay: monthIndexToName(e.bitis_ay),
          bitis_yil: e.bitis_yil != null ? String(e.bitis_yil) : '',
          devam_ediyor: e.devam_ediyor, ayrilma_nedeni: e.ayrilma_nedeni,
          basari_ozeti: e.basari_ozeti,
          brand_id: e.brand_id || null,
          company_id: e.company_id || null
        };
      });
      if (_loadedDBData.profile) {
        // Merge saved profile fields into cache
        var _pp = _loadedDBData.profile;
        _pp.full_name = p_profile.full_name;
        _pp.email = p_profile.email;
        _pp.telefon = p_profile.telefon;
        _pp.cinsiyet = p_profile.cinsiyet;
        _pp.dogum_yili = p_profile.dogum_yili;
        _pp.adres_il = p_profile.adres_il;
        _pp.adres_ilce = p_profile.adres_ilce;
        _pp.linkedin = p_profile.linkedin;
        _pp.engel_durumu = p_profile.engel_durumu;
        _pp.askerlik_durumu = p_profile.askerlik_durumu;
        _pp.is_active = p_profile.is_active;
        var mA = document.getElementById('merkez-toggle-active');
        var mH = document.getElementById('merkez-hide-from-current-employer');
        if (mA) _pp.is_actively_looking = mA.checked;
        if (mH && !mH.disabled) _pp.hide_from_current_employer = mH.checked;
      }
      // Sync remaining cache slices so preview reflects save without reload
      _loadedDBData.no_experience = p_profile.ilk_deneyim || false;
      _loadedDBData.education = p_education.map(function(e) {
        return { seviye: e.egitim_seviye, okul_adi: e.okul, bolum: e.bolum, mezuniyet_yili: e.mezun_yil != null ? String(e.mezun_yil) : '' };
      });
      _loadedDBData.languages = p_languages.slice();
      _loadedDBData.certificates = p_certificates.slice();
      _loadedDBData.work_prefs = p_work_prefs ? {
        musaitlik: p_work_prefs.musaitlik,
        calisma_tipleri: p_work_prefs.calisma_tipleri || [],
        tercih_segmentler: p_work_prefs.segmentler || [],
        career_goal: p_work_prefs.career_goal,
        career_type: p_work_prefs.career_type,
        travel_willingness: p_work_prefs.travel_willingness || null,
        shift_flexibility: p_work_prefs.shift_flexibility || null,
        notice_period: p_work_prefs.notice_period || null
      } : null;
      _loadedDBData.brand_interests = p_brand_interests.map(function(b) { return b.marka; });
      _loadedDBData.locations = p_locations.slice();
      // Sync brand follows if markalar panel was loaded (additive only)
      if (typeof _ht_follows !== 'undefined' && _ht_follows instanceof Set) {
        var _followsDirty = false;
        p_brand_interests.forEach(function(b) {
          if (b.brand_id && !_ht_follows.has(b.brand_id)) {
            _ht_follows.add(parseInt(b.brand_id));
            _followsDirty = true;
          }
        });
        if (_followsDirty && typeof updateBrandFollowCounter === 'function') {
          updateBrandFollowCounter();
        }
      }
    }
    if (typeof applyAllVisibilityMirrorsFromProfile === 'function') applyAllVisibilityMirrorsFromProfile();
    else {
      updateStatusUI(p_profile.is_active);
      if (typeof updateMerkezVisState === 'function') updateMerkezVisState();
    }
    // Update sidebar name
    var nameEl = document.getElementById('sidebar-user-name');
    if (nameEl && p_profile.full_name) nameEl.textContent = p_profile.full_name;
    // Update dashboard
    updateDashboardSummary(p_profile, p_experiences);
    // Update Profil Merkezi cards (separate from completion — no side-effect coupling)
    updateMerkezCards();

    if (typeof onComplete === 'function') onComplete();
  } catch (err) {
    if (window.Sentry) Sentry.captureException(err, { tags: { flow: 'wizard-save' } });
    var errorDesc = document.getElementById('error-desc');
    if (errorDesc) errorDesc.textContent = err.message || 'Bilinmeyen bir hata olustu.';
    document.getElementById('modal-error').classList.add('show');
  } finally {
    if (btnComplete) { btnComplete.disabled = false; btnComplete.textContent = 'Tamamla'; }
  }
}

// ═══════════════════════════════════════════════════
// Dashboard summary, merkez cards, identity, bento rings moved to profil-summary.js
// Provides: updateDashboardSummary, updateMerkezCards, updateMerkezIdentity,
//   updateBentoRing, _countFilledRows
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// TASK 12: DATA LOAD FROM NORMALIZED TABLES
// ═══════════════════════════════════════════════════

async function loadProfileFromDB() {
  if (!currentUser) { console.warn('[HT] loadProfileFromDB: no currentUser'); return null; }

  var sessionRes = await (window._htAuthSessionPromise || supabase.auth.getSession());
  if (!sessionRes.data.session) {
    console.warn('[HT] loadProfileFromDB: no session');
    return null;
  }

  // Fetch candidate record
  var candRes = await supabase.from('candidates').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (candRes.error || !candRes.data) {
    if (window.Sentry && candRes.error) Sentry.captureMessage('Profile restore: candidates query failed', {
      level: 'error', tags: { flow: 'profile-restore' },
      extra: { code: candRes.error.code, message: candRes.error.message }
    });
    console.warn('[HT] loadProfileFromDB: candidates query failed', candRes.error);
    return null;
  }
  var cand = candRes.data;
  var cid = cand.id;

  // Parallel fetch all child tables
  var _queryDefs = [
    { key: 'experiences',     fn: function() { return supabase.from('candidate_experiences').select('*').eq('candidate_id', cid).order('sira'); } },
    { key: 'education',       fn: function() { return supabase.from('candidate_education').select('*').eq('candidate_id', cid).order('sira'); } },
    { key: 'certificates',    fn: function() { return supabase.from('candidate_certificates').select('*').eq('candidate_id', cid).order('sira'); } },
    { key: 'languages',       fn: function() { return supabase.from('candidate_languages').select('*').eq('candidate_id', cid).order('sira'); } },
    { key: 'target_roles',    fn: function() { return supabase.from('candidate_target_roles').select('*').eq('candidate_id', cid); } },
    { key: 'work_prefs',      fn: function() { return supabase.from('candidate_work_preferences').select('*').eq('candidate_id', cid).maybeSingle(); } },
    { key: 'brand_interests', fn: function() { return supabase.from('candidate_brand_interests').select('*').eq('candidate_id', cid); } },
    { key: 'locations',       fn: function() { return supabase.from('candidate_location_preferences').select('*, candidate_location_pref_districts(*)').eq('candidate_id', cid); } }
  ];

  // First attempt — all queries in parallel
  var _results = {};
  var _firstPass = await Promise.all(_queryDefs.map(function(q) { return q.fn(); }));
  _queryDefs.forEach(function(q, i) { _results[q.key] = _firstPass[i]; });

  // Check for failures
  var _failedKeys = Object.keys(_results).filter(function(k) { return _results[k].error; });

  // Retry once with fresh session if any failed
  if (_failedKeys.length > 0) {
    console.warn('[HT] Child query failures detected (' + _failedKeys.join(', ') + '), refreshing session and retrying...');
    try {
      var refreshRes = await supabase.auth.refreshSession();
      if (refreshRes.data.session) {
        // Retry only failed queries
        var _retryDefs = _queryDefs.filter(function(q) { return _failedKeys.indexOf(q.key) !== -1; });
        var _retryPass = await Promise.all(_retryDefs.map(function(q) { return q.fn(); }));
        _retryDefs.forEach(function(q, i) { _results[q.key] = _retryPass[i]; });
      }
    } catch (e) {
      console.error('[HT] Session refresh failed during retry:', e.message);
    }
  }

  // Final diagnostic — report any remaining failures as a single Sentry event
  var _stillFailed = Object.keys(_results).filter(function(k) { return _results[k].error; });
  if (_stillFailed.length > 0) {
    if (window.Sentry) Sentry.captureMessage('Profile restore: child queries failed after retry', {
      level: 'error',
      tags: { flow: 'profile-restore', retry: 'true' },
      extra: {
        failed_tables: _stillFailed,
        errors: _stillFailed.reduce(function(acc, k) {
          acc[k] = { code: _results[k].error.code, hint: _results[k].error.hint, status: _results[k].status };
          return acc;
        }, {})
      }
    });
    console.error('[HT] Profile restore — still failing after retry:', _stillFailed.join(', '));
  }

  // Unpack results (using the same variable names the rest of the function expects)
  var expRes = _results.experiences;
  var eduRes = _results.education;
  var certRes = _results.certificates;
  var langRes = _results.languages;
  var roleRes = _results.target_roles;
  var wpRes = _results.work_prefs;
  var biRes = _results.brand_interests;
  var locRes = _results.locations;

  return {
    profile: {
      id: cand.id,
      full_name: cand.full_name,
      telefon: cand.telefon,
      linkedin: cand.linkedin,
      cinsiyet: cand.cinsiyet,
      dogum_yili: cand.dogum_yili,
      adres_il: cand.adres_il,
      adres_ilce: cand.adres_ilce,
      engel_durumu: cand.engel_durumu,
      askerlik_durumu: cand.askerlik_durumu,
      avatar_url: cand.avatar_url,
      is_active: cand.is_active,
      is_actively_looking: cand.is_actively_looking === true,
      cv_url: cand.cv_url || null,
      cv_filename: cand.cv_filename || null,
      cv_uploaded_at: cand.cv_uploaded_at || null,
      son_sirket: cand.son_sirket || null,
      hide_from_current_employer: cand.hide_from_current_employer === true,
      user_id: cand.user_id || null,
      updated_at: cand.updated_at || null,
      email: cand.email || null,
      notify_email_messages: cand.notify_email_messages,
      notify_email_jobs: cand.notify_email_jobs,
      contact_pref_email: cand.contact_pref_email,
      contact_pref_phone: cand.contact_pref_phone,
      contact_pref_whatsapp: cand.contact_pref_whatsapp,
      account_status: cand.account_status || 'active',
      deletion_requested_at: cand.deletion_requested_at || null,
      is_premium: cand.is_premium === true,
      premium_until: cand.premium_until || null
    },
    no_experience: cand.ilk_deneyim || false,
    experiences: (expRes.data || []).map(function(e) {
      return {
        sirket_adi: e.sirket, marka: e.marka, pozisyon: e.pozisyon,
        sektor: e.sektor || null,
        rol_ailesi: e.rol_ailesi || null,
        rol_unvani: e.rol_unvani || null,
        segment: e.segment, istihdam_tipi: e.istihdam_tipi,
        kidem_seviyesi: e.kidem_seviyesi, lokasyon_tipi: e.lokasyon_tipi,
        sehir: e.sehir, takim_buyuklugu: e.takim_buyuklugu,
        baslangic_ay: monthIndexToName(e.baslangic_ay),
        baslangic_yil: e.baslangic_yil ? String(e.baslangic_yil) : '',
        bitis_ay: monthIndexToName(e.bitis_ay),
        bitis_yil: e.bitis_yil ? String(e.bitis_yil) : '',
        devam_ediyor: e.devam_ediyor, ayrilma_nedeni: e.ayrilma_nedeni,
        basari_ozeti: e.basari_ozeti,
        description: e.description || null,
        brand_id: e.brand_id || null,
        company_id: e.company_id || null
      };
    }),
    education: (eduRes.data || []).map(function(e) {
      return { seviye: e.egitim_seviye, okul_adi: e.okul, bolum: e.bolum, mezuniyet_yili: e.mezun_yil ? String(e.mezun_yil) : '' };
    }),
    languages: (langRes.data || []).map(function(l) {
      return { dil: l.dil, seviye: l.seviye };
    }),
    certificates: (certRes.data || []).map(function(c) {
      return { egitim_adi: c.egitim_adi, kurum: c.kurum, yil: c.yil };
    }),
    target_roles: (roleRes.data || []).map(function(r) {
      return { rol_ailesi: r.rol_ailesi, rol_unvani: r.rol_unvani };
    }),
    work_prefs: wpRes.data ? {
      musaitlik: wpRes.data.musaitlik,
      calisma_tipleri: wpRes.data.calisma_tipleri || [],
      tercih_segmentler: wpRes.data.segmentler || [],
      career_goal: wpRes.data.career_goal,
      career_type: wpRes.data.career_type,
      travel_willingness: wpRes.data.travel_willingness || null,
      shift_flexibility: wpRes.data.shift_flexibility || null,
      notice_period: wpRes.data.notice_period || null
    } : null,
    brand_interests: (biRes.data || []).map(function(b) { return b.marka; }),
    locations: (locRes.data || []).map(function(loc) {
      return {
        sehir: loc.sehir,
        ilceler: (loc.candidate_location_pref_districts || []).map(function(d) { return d.ilce; })
      };
    })
  };
}

// ═══════════════════════════════════════════════════
// Completion & score moved to profil-summary.js
// Provides: calculateCompletion, calculateProfileScore,
//   getProfileScoreHints, updateScoreUI, updateCompletionUI
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════

function showToast(msg, type) {
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:12px;font-weight:600;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
  toast.style.background = type === 'error' ? 'var(--red)' : type === 'success' ? 'var(--green)' : 'var(--navy)';
  toast.style.color = 'white';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 300); }, 2500);
}

// ═══════════════════════════════════════════════════
// CV upload/delete/generate moved to profil-cv.js
// Provides: initCVUpload, showCVUploaded, showCVEmpty, generateCV
// ═══════════════════════════════════════════════════

function setAvatarImage(url) {
  // Strip any existing cache-bust, then add a fresh one for display
  var cleanUrl = url.replace(/[?&]t=\d+/, '');
  var displayUrl = cleanUrl + (cleanUrl.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
  var targets = ['user-avatar-header', 'sidebar-avatar', 'ps-avatar', 'merkez-avatar', 'avatar-upload-circle', 'avd-avatar-img'];
  targets.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    // Check if img already exists
    var img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      el.textContent = '';
      el.appendChild(img);
    }
    img.src = displayUrl;
    img.alt = 'Avatar';
  });
}

// ═══════════════════════════════════════════════════════════════
// MARKALAR PANEL — Moved to profil-markalar.js
// ═══════════════════════════════════════════════════════════════


/* Markalar code moved to profil-markalar.js */


function _escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════
// Profile preview drawer moved to profil-preview.js
// Provides: openProfilePreview, closeProfilePreview
// ═══════════════════════════════════════════════════

// ── Toggle Toast ──
// ═══════════════════════════════════════════════════
// Visibility/toggle sync domain moved to profil-visibility.js
// Provides: showTgToast, closeTgToast, updateMerkezVisState,
//   syncBeniOner, syncActivelyLooking, syncHideFromEmployer,
//   applyAllVisibilityMirrorsFromProfile
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// LinkedIn URL normalization on blur
// ═══════════════════════════════════════════════════
(function() {
  var linkedinField = document.getElementById('f-linkedin');
  if (!linkedinField) return;
  linkedinField.addEventListener('blur', function() {
    var v = linkedinField.value.trim();
    if (!v) return;
    // Auto-prepend https:// if missing
    if (/^linkedin\.com/i.test(v)) {
      v = 'https://' + v;
    } else if (/^www\.linkedin\.com/i.test(v)) {
      v = 'https://' + v;
    } else if (/^http:\/\//i.test(v)) {
      v = v.replace(/^http:\/\//i, 'https://');
    }
    linkedinField.value = v;
  });
})();


