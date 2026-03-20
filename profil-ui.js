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

  // Sektör (required)
  var sektorOptions = Object.keys(typeof SEKTOR_ROL_MAP === 'object' ? SEKTOR_ROL_MAP : {});
  var sektorWrap = makeSelectField('Sektör <span class="field-req">*</span>', cardId + '-sektor', sektorOptions, d.sektor, 'Sektör seçin...');
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

  // Maas select
  var maasSelect = document.getElementById('f-maas');
  if (maasSelect) {
    MAAS_ARALIKLARI.forEach(function(m) {
      if (!m) return;
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m + ' TL';
      maasSelect.appendChild(opt);
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

  // Career type — check-item buttons (multi-select, Decision 8)
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
        btn.classList.toggle('checked');
        if (btn.classList.contains('checked')) {
          selectedCareerTypes.push(opt.value);
        } else {
          selectedCareerTypes = selectedCareerTypes.filter(function(t) { return t !== opt.value; });
        }
      });
      ctypeContainer.appendChild(btn);
    });
  }
}

function addTargetRoleRow(data) {
  var container = document.getElementById('target-roles-container');
  if (!container) return;
  roleCounter++;
  var d = data || {};
  var rowId = 'role-' + roleCounter;

  var row = document.createElement('div');
  row.className = 'dynamic-row';
  row.id = rowId;
  row.style.position = 'relative';

  var fields = document.createElement('div');
  fields.className = 'field-row';
  fields.appendChild(makeSelectField('Rol Ailesi', rowId + '-ailesi', ROL_AILELERI, d.rol_ailesi));
  fields.appendChild(makeField('text', 'Rol Unvani', rowId + '-unvan', 'Ornek: Magaza Muduru', d.rol_unvani));
  row.appendChild(fields);

  var delBtn = document.createElement('button');
  delBtn.className = 'btn-del-row';
  delBtn.type = 'button';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
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
  rows.forEach(function(row) {
    var p = row.id + '-';
    var rawUnvan = nullIfEmpty(val(p + 'unvan'));
    // Normalize rol_unvani: canonical synonym mapping (fallback to titleCaseTR if no match)
    if (rawUnvan) {
      var canonical = typeof canonicalizeRole === 'function' ? canonicalizeRole(rawUnvan) : null;
      if (canonical && canonical.canonical) {
        rawUnvan = canonical.canonical;
      } else {
        rawUnvan = typeof titleCaseTR === 'function' ? titleCaseTR(rawUnvan) : rawUnvan;
      }
    }
    var item = { rol_ailesi: nullIfEmpty(val(p + 'ailesi')), rol_unvani: rawUnvan };
    // DB requires both NOT NULL; only send complete rows to avoid constraint violation
    if (item.rol_ailesi && item.rol_unvani) result.push(item);
  });
  return result;
}

function collectWorkPrefs() {
  // Career type: canonical order sort (yukari < yatay < lider)
  var sortedCareerTypes = selectedCareerTypes.slice().sort(function(a, b) {
    return CAREER_TYPE_ORDER.indexOf(a) - CAREER_TYPE_ORDER.indexOf(b);
  });
  return {
    musaitlik: nullIfEmpty(selectedMusaitlik),
    calisma_tipleri: selectedCalismaTipleri,
    maas_beklenti: nullIfEmpty(val('f-maas')),
    tercih_segmentler: selectedSegmentler,
    career_goal: nullIfEmpty(val('f-career-goal')),
    career_type: sortedCareerTypes.length > 0 ? sortedCareerTypes.join(',') : null
  };
}

// ═══════════════════════════════════════════════════
// STEP 5: LOKASYON TERCIHLERI
// ═══════════════════════════════════════════════════

var POPULAR_CITIES = ['\u0130stanbul', 'Ankara', '\u0130zmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri'];
var selectedLocations = {}; // { cityName: [district1, district2, ...] }

function initStep5() {
  // Render popular city chips
  var popContainer = document.getElementById('popular-city-chips');
  if (popContainer) {
    POPULAR_CITIES.forEach(function(city) {
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = city;
      chip.addEventListener('click', function() {
        toggleCitySelection(city);
        updateCityChipStates();
      });
      popContainer.appendChild(chip);
    });
  }

  // All cities button → open location modal
  var btnAllCities = document.getElementById('btn-all-cities');
  if (btnAllCities) btnAllCities.addEventListener('click', function() { openLocationModal(); });
}

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

function toggleCitySelection(city) {
  if (selectedLocations[city]) {
    delete selectedLocations[city];
  } else {
    selectedLocations[city] = [];
  }
  renderSelectedCities();
}

function updateCityChipStates() {
  // Update popular chips
  var popChips = document.querySelectorAll('#popular-city-chips .chip');
  popChips.forEach(function(chip) {
    if (selectedLocations[chip.textContent]) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });
  // Update modal chips
  var lokChips = document.querySelectorAll('#lok-body .lok-city');
  lokChips.forEach(function(chip) {
    if (selectedLocations[chip.textContent]) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });
  var countEl = document.getElementById('lok-selected-count');
  if (countEl) countEl.textContent = Object.keys(selectedLocations).length;
}

function renderSelectedCities() {
  var container = document.getElementById('selected-cities-container');
  if (!container) return;
  container.textContent = '';

  var cities = Object.keys(selectedLocations);
  if (cities.length === 0) {
    var msg = document.createElement('p');
    msg.id = 'no-city-msg';
    msg.style.cssText = 'font-size:13px;color:var(--muted);';
    msg.textContent = 'Henüz şehir seçilmedi. Yukarıdaki şehirlerden seçim yapın.';
    container.appendChild(msg);
    return;
  }

  cities.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });

  cities.forEach(function(city) {
    var card = document.createElement('div');
    card.className = 'city-card';

    var header = document.createElement('div');
    header.className = 'city-card-header';
    var name = document.createElement('div');
    name.className = 'city-card-name';
    name.textContent = city;
    var del = document.createElement('button');
    del.className = 'city-card-del';
    del.type = 'button';
    del.textContent = '\u00D7';
    del.addEventListener('click', function() {
      delete selectedLocations[city];
      renderSelectedCities();
      updateCityChipStates();
    });
    header.appendChild(name);
    header.appendChild(del);
    card.appendChild(header);

    // Districts
    var districts = ILCELER[city];
    if (districts && districts.length > 0) {
      var distContainer = document.createElement('div');
      distContainer.className = 'city-card-districts';
      districts.forEach(function(d) {
        var dChip = document.createElement('button');
        dChip.className = 'district-chip';
        dChip.type = 'button';
        dChip.textContent = d;
        if (selectedLocations[city] && selectedLocations[city].indexOf(d) !== -1) {
          dChip.classList.add('selected');
        }
        dChip.addEventListener('click', function() {
          dChip.classList.toggle('selected');
          if (!selectedLocations[city]) selectedLocations[city] = [];
          if (dChip.classList.contains('selected')) {
            selectedLocations[city].push(d);
          } else {
            selectedLocations[city] = selectedLocations[city].filter(function(x) { return x !== d; });
          }
        });
        distContainer.appendChild(dChip);
      });
      card.appendChild(distContainer);
    } else {
      var noDistrict = document.createElement('p');
      noDistrict.style.cssText = 'font-size:12px;color:var(--muted);';
      noDistrict.textContent = 'Bu il için ilçe seçimi mevcut değil.';
      card.appendChild(noDistrict);
    }

    container.appendChild(card);
  });

  updateCityChipStates();
}

function openLocationModal() {
  var lokBody = document.getElementById('lok-body');
  if (!lokBody) return;
  lokBody.textContent = '';

  Object.keys(TUR_ILLER).forEach(function(region) {
    var regionDiv = document.createElement('div');
    regionDiv.className = 'lok-region';
    var title = document.createElement('div');
    title.className = 'lok-region-title';
    title.textContent = region;
    regionDiv.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'lok-city-grid';
    TUR_ILLER[region].forEach(function(city) {
      var chip = document.createElement('button');
      chip.className = 'lok-city';
      chip.type = 'button';
      chip.textContent = city;
      if (selectedLocations[city]) chip.classList.add('selected');
      chip.addEventListener('click', function() {
        toggleCitySelection(city);
        chip.classList.toggle('selected');
        updateCityChipStates();
      });
      grid.appendChild(chip);
    });
    regionDiv.appendChild(grid);
    lokBody.appendChild(regionDiv);
  });

  // Search filter
  var searchInput = document.getElementById('lok-search-input');
  if (searchInput) {
    searchInput.value = '';
    searchInput.addEventListener('input', function() {
      var q = trLower(searchInput.value);
      lokBody.querySelectorAll('.lok-city').forEach(function(chip) {
        chip.style.display = trLower(chip.textContent).indexOf(q) !== -1 ? '' : 'none';
      });
    });
  }

  updateCityChipStates();
  document.getElementById('lok-modal-overlay').classList.add('show');
}

// Location modal done button — just close and render
// (already wired in event listeners section)

function collectLocations() {
  var result = [];
  Object.keys(selectedLocations).forEach(function(city) {
    result.push({
      sehir: city,
      ilceler: selectedLocations[city] || []
    });
  });
  return result;
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
    maas_beklenti: wp.maas_beklenti || null,
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
    document.getElementById('modal-success').classList.add('show');
    if (_loadedDBData) {
      _loadedDBData.experiences = p_experiences;
      if (_loadedDBData.profile) {
        _loadedDBData.profile.is_active = p_profile.is_active;
        var mA = document.getElementById('merkez-toggle-active');
        var mH = document.getElementById('merkez-hide-from-current-employer');
        if (mA) _loadedDBData.profile.is_actively_looking = mA.checked;
        if (mH && !mH.disabled) _loadedDBData.profile.hide_from_current_employer = mH.checked;
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
  var hasMaas = !!val('f-maas');
  var hasTarget = document.querySelectorAll('#target-roles-container .dynamic-row').length > 0;
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
  var filled4 = [hasCalisma, hasMusaitlik, hasMaas, hasTarget, hasCareer, hasLocations].filter(Boolean).length;
  updateBentoRing(4, Math.round((filled4 / 6) * 100));

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
      updated_at: cand.updated_at || null
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
      maas_beklenti: wpRes.data.maas_beklenti,
      tercih_segmentler: wpRes.data.segmentler || [],
      career_goal: wpRes.data.career_goal,
      career_type: wpRes.data.career_type
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
      if (val(firstId + 'takim')) score += 4;
    } else {
      score += 4; // Field not relevant for this department — no penalty
    }
  }

  // ── C) Education & Language — 15 points ──
  if (document.querySelectorAll('#edu-rows-container .dynamic-row').length > 0) score += 8;
  if (document.querySelectorAll('#lang-rows-container .dynamic-row').length > 0) score += 7;

  // ── D) Preferences — 20 points ──
  if (selectedCalismaTipleri.length > 0)           score += 6;
  if (selectedMusaitlik)                           score += 4;
  if (Object.keys(selectedLocations).length > 0)   score += 5;
  if (val('f-maas'))                               score += 5;

  // ── E) Targeting / Intent — 15 points ──
  if (document.querySelectorAll('#target-roles-container .dynamic-row').length > 0) score += 8;
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
  if (document.querySelectorAll('#target-roles-container .dynamic-row').length === 0)
    hints.push('Hedef pozisyon ekle — markalar seni daha kolay bulur');
  if (selectedCareerTypes.length === 0)
    hints.push('Kariyer yonelimi sec (yukari, yatay veya lider)');
  if (!val('f-maas'))
    hints.push('Maas beklentini belirt');
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
// PROFILE PREVIEW — Right Drawer
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
  html += '<div class="pp-name">' + _escHtml(showPersonalInfo ? (p.full_name || '—') : '●●●●● ●●●●●●') + '</div>';
  if (currentRole) {
    html += '<div class="pp-role"><strong>' + _escHtml(currentRole) + '</strong>';
    if (currentCompany) html += ' · ' + _escHtml(showPersonalInfo ? currentCompany : '●●●●●');
    html += '</div>';
  }
  html += '<div class="pp-meta">';
  if (showPersonalInfo && p.adres_il) {
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    html += _escHtml(p.adres_il);
  }
  if (showPersonalInfo && totalYears > 0) {
    html += (p.adres_il ? '<span style="opacity:0.3;margin:0 3px;">·</span>' : '');
    html += totalYears + ' yıl deneyim';
  }
  if (showAktifBadge) {
    html += '<span class="pp-status-badge active"><span class="dot"></span>Aktif iş arıyor</span>';
  }
  html += '</div></div></div>';

  // ── ROW 1: Deneyim + Eğitim & Dil ──
  html += '<div class="pp-bento">';

  // Left: Deneyim
  html += '<div class="pp-card accent-verm">';
  html += '<div class="pp-card-title">Deneyim</div>';
  if (exps.length > 0) {
    exps.forEach(function(e) {
      var role = e.pozisyon || '';
      var brand = e.marka || '';
      var company = e.sirket_adi || '';
      var displayRaw = brand && company && brand !== company ? brand + ' (' + company + ')' : brand || company;
      var display = showPersonalInfo ? displayRaw : '●●●●●';
      var period = '';
      if (e.baslangic_yil) {
        period = (e.baslangic_ay ? e.baslangic_ay + ' ' : '') + e.baslangic_yil;
        if (e.devam_ediyor) { period += ' — Devam'; }
        else if (e.bitis_yil) { period += ' — ' + (e.bitis_ay ? e.bitis_ay + ' ' : '') + e.bitis_yil; }
      }
      html += '<div class="pp-exp">';
      html += '<div class="pp-exp-dot ' + (e.devam_ediyor ? 'active' : 'past') + '"></div>';
      html += '<div class="pp-exp-info">';
      html += '<div class="pp-exp-role">' + _escHtml(role) + '</div>';
      html += '<div class="pp-exp-company"><strong>' + _escHtml(display) + '</strong></div>';
      var details = [];
      if (e.rol_ailesi) details.push(e.rol_ailesi);
      if (e.istihdam_tipi) details.push(e.istihdam_tipi);
      if (e.kidem_seviyesi) details.push(e.kidem_seviyesi);
      if (details.length > 0) {
        html += '<div class="pp-exp-detail">' + _escHtml(details.join(' · ')) + '</div>';
      }
      html += '</div>';
      if (period) html += '<div class="pp-exp-period">' + _escHtml(period) + '</div>';
      html += '</div>';
    });
  } else if (db.no_experience) {
    html += '<div class="pp-empty">İlk iş deneyimini arıyor</div>';
  } else {
    html += '<div class="pp-empty">Henüz eklenmedi</div>';
  }
  html += '</div>';

  // Right: Eğitim & Dil
  html += '<div class="pp-card accent-green">';
  html += '<div class="pp-card-title">Eğitim & Dil</div>';
  if (edus.length > 0) {
    edus.forEach(function(e) {
      html += '<div class="pp-edu">';
      html += '<div class="pp-edu-row"><div>';
      html += '<div class="pp-edu-name">' + _escHtml(showPersonalInfo ? (e.okul_adi || '') : '●●●●●') + '</div>';
      var sub = [];
      if (e.seviye) sub.push(e.seviye);
      if (e.bolum) sub.push(e.bolum);
      if (sub.length > 0) html += '<div class="pp-edu-sub">' + _escHtml(sub.join(' · ')) + '</div>';
      html += '</div>';
      if (e.mezuniyet_yili) html += '<div class="pp-edu-year">' + _escHtml(e.mezuniyet_yili) + '</div>';
      html += '</div></div>';
    });
  }
  if (certs.length > 0) {
    certs.forEach(function(c) {
      html += '<div class="pp-edu" style="margin-top:6px;">';
      html += '<div class="pp-edu-row"><div>';
      html += '<div class="pp-edu-name" style="font-size:12px;">' + _escHtml(showPersonalInfo ? (c.egitim_adi || '') : '●●●●●') + '</div>';
      if (c.kurum) html += '<div class="pp-edu-sub">' + _escHtml(c.kurum) + '</div>';
      html += '</div>';
      if (c.yil) html += '<div class="pp-edu-year">' + _escHtml(c.yil) + '</div>';
      html += '</div></div>';
    });
  }
  if (langs.length > 0) {
    html += '<div class="pp-tags" style="margin-top:8px;">';
    langs.forEach(function(l) {
      html += '<span class="pp-tag">' + _escHtml(l.dil || '') + (l.seviye ? ' · ' + _escHtml(l.seviye) : '') + '</span>';
    });
    html += '</div>';
  }
  if (edus.length === 0 && langs.length === 0 && certs.length === 0) {
    html += '<div class="pp-empty">Henüz eklenmedi</div>';
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
      if (wp.career_type) tags.push(wp.career_type);
    }
    locs.forEach(function(loc) {
      if (loc.sehir) tags.push('📍 ' + loc.sehir);
    });
    if (bi.length > 0) {
      bi.slice(0, 5).forEach(function(b) { tags.push('♡ ' + b); });
    }
    if (tags.length > 0) {
      html += '<div class="pp-tags">';
      tags.forEach(function(t) {
        html += '<span class="pp-tag">' + _escHtml(t) + '</span>';
      });
      html += '</div>';
    }
    if (wp && wp.career_goal) {
      html += '<div style="font-size:11px;color:var(--text-muted);margin-top:8px;font-style:italic;">"' + _escHtml(wp.career_goal) + '"</div>';
    }
    html += '</div></div>';
  }

  // ── ROW 3: CV + İletişim ──
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
    html += '<div class="pp-empty">CV yüklenmemiş</div>';
  }
  html += '</div>';

  html += '<div class="pp-card pp-contact-card">';
  html += '<div class="pp-card-title">İLETİŞİM</div>';
  var email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '';
  var phone = p.telefon || '';

  if (showPersonalInfo) {
    // Beni Öner ON — show real contact info (as employer would see)
    html += '<div class="pp-contact-row">';
    html += '<div class="pp-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>';
    html += '<div class="pp-contact-text">' + _escHtml(email || '—') + '</div>';
    html += '</div>';
    html += '<div class="pp-contact-row">';
    html += '<div class="pp-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.69 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.76.33 1.55.56 2.36.69A2 2 0 0 1 22 16.92z"/></svg></div>';
    html += '<div class="pp-contact-text">' + _escHtml(phone || '—') + '</div>';
    html += '</div>';
    html += '<div class="pp-contact-hint" style="color:var(--verm);">İşverenler iletişim bilgilerini görebilir</div>';
  } else {
    // Beni Öner OFF — masked contact
    var maskedEmail = '';
    if (email) {
      var parts = email.split('@');
      if (parts.length === 2) maskedEmail = parts[0].charAt(0) + '****@' + parts[1];
    }
    html += '<div class="pp-contact-row">';
    html += '<div class="pp-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>';
    html += '<div class="pp-contact-text">' + _escHtml(maskedEmail || '—') + '</div>';
    html += '<span class="pp-contact-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Gizli</span>';
    html += '</div>';
    var maskedPhone = '';
    if (phone && phone.length >= 6) {
      maskedPhone = phone.substring(0, 3) + ' *** ** ' + phone.substring(phone.length - 2);
    }
    html += '<div class="pp-contact-row">';
    html += '<div class="pp-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.69 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.76.33 1.55.56 2.36.69A2 2 0 0 1 22 16.92z"/></svg></div>';
    html += '<div class="pp-contact-text">' + _escHtml(maskedPhone || '—') + '</div>';
    html += '<span class="pp-contact-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Gizli</span>';
    html += '</div>';
    html += '<div class="pp-contact-hint">Beni Öner açıkken işverenler bilgilerini görebilir</div>';
  }
  html += '</div>';

  html += '</div>';

  // ── FOOTER ──
  var lastUpdated = p.updated_at ? new Date(p.updated_at).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
  html += '<div class="pp-footer">';
  html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  html += 'Son güncelleme: ' + lastUpdated;
  html += '</div>';

  document.getElementById('pp-content').innerHTML = html;
  document.getElementById('pp-overlay').classList.add('open');
  document.getElementById('pp-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProfilePreview() {
  document.getElementById('pp-overlay').classList.remove('open');
  document.getElementById('pp-drawer').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var drawer = document.getElementById('pp-drawer');
    if (drawer && drawer.classList.contains('open')) {
      closeProfilePreview();
    }
  }
});

// ── Toggle Toast ──
var _tgToastTimer = null;

function showTgToast(message, anchorEl) {
  var toast = document.getElementById('tg-toast');
  var text = document.getElementById('tg-toast-text');
  if (!toast || !text) return;

  text.textContent = message;

  if (anchorEl) {
    var rect = anchorEl.getBoundingClientRect();
    toast.style.top = (rect.bottom + 8) + 'px';
    toast.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 340)) + 'px';
    toast.style.right = 'auto';
    toast.style.bottom = 'auto';
    toast.style.transform = '';
  } else {
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.right = 'auto';
    toast.style.top = 'auto';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }

  toast.classList.add('visible');

  if (_tgToastTimer) clearTimeout(_tgToastTimer);
  _tgToastTimer = setTimeout(function() {
    closeTgToast();
  }, 5000);
}

function closeTgToast() {
  var toast = document.getElementById('tg-toast');
  if (toast) toast.classList.remove('visible');
  if (_tgToastTimer) { clearTimeout(_tgToastTimer); _tgToastTimer = null; }
}

// ═══════════════════════════════════════════════════
// SHARED TOGGLE SYNC — Single source of truth for all visibility toggles
// Each toggle (Beni Öner, Aktif Arıyorum, Hide From Employer) has ONE
// shared sync function that: syncs all UI instances, updates _loadedDBData,
// writes to DB ONCE, rolls back ALL toggles on failure.
// ═══════════════════════════════════════════════════
(function() {

  // ── Helper: update Merkez visual state from current toggle values ──
  function updateVisState() {
    var visToggle = document.getElementById('merkez-toggle-visibility');
    if (!visToggle) return;
    var isOn = visToggle.checked;

    var dot = document.getElementById('mk-status-dot');
    var text = document.getElementById('mk-status-text');
    if (dot) dot.classList.toggle('off', !isOn);
    if (text) {
      text.textContent = isOn ? 'Profilin aktif' : 'Profilin gizli';
      text.classList.toggle('off', !isOn);
    }
    var hideCell = document.getElementById('merkez-hide-row');
    if (hideCell) hideCell.classList.toggle('disabled', !isOn);

    var sidebarDesc = document.getElementById('sidebar-benioner-desc');
    if (sidebarDesc) {
      sidebarDesc.textContent = isOn ? 'Profilin ve CV\'n işverenlerle paylaşılır' : 'Profilin ve CV\'n işverenlerle paylaşılmaz';
      sidebarDesc.style.color = isOn ? 'var(--text-muted)' : '#ef4444';
    }

    var settingsHint = document.getElementById('settings-benioner-hint');
    if (settingsHint) {
      settingsHint.textContent = isOn ? 'Profilin ve CV\'n işverenlerle paylaşılır' : 'Profilin ve CV\'n işverenlerle paylaşılmaz';
      settingsHint.style.color = isOn ? '#059669' : '#ef4444';
    }
  }

  // ════════════════════════════════════════════════
  // 1. syncBeniOner — is_active toggle
  //    source: 'merkez' | 'sidebar' | 'ayarlar'
  // ════════════════════════════════════════════════
  function syncBeniOner(newValue, source) {
    var merkez = document.getElementById('merkez-toggle-visibility');
    var sidebar = document.getElementById('sidebar-toggle-benioner');
    var ayarlar = document.getElementById('settings-visibility-active');
    var wiz = document.getElementById('wiz-toggle-visibility');

    // Optimistic UI: sync all toggles immediately
    if (merkez) merkez.checked = newValue;
    if (sidebar) sidebar.checked = newValue;
    if (ayarlar) ayarlar.checked = newValue;
    if (wiz) wiz.checked = newValue;
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_active = newValue;
    updateVisState();
    if (typeof updateStatusUI === 'function') updateStatusUI(newValue);
    if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();

    // DB write — single path regardless of source
    if (typeof supabase === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    supabase.from('candidates')
      .update({ is_active: newValue })
      .eq('user_id', currentUser.id)
      .then(function(res) {
        if (res.error) {
          console.error('[HT] beni-oner save failed', res.error);
          // Rollback all toggles
          var rollback = !newValue;
          if (merkez) merkez.checked = rollback;
          if (sidebar) sidebar.checked = rollback;
          if (ayarlar) ayarlar.checked = rollback;
          if (wiz) wiz.checked = rollback;
          if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_active = rollback;
          updateVisState();
          if (typeof updateStatusUI === 'function') updateStatusUI(rollback);
          if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
          showTgToast('Hata: Görünürlük kaydedilemedi. Lütfen tekrar deneyin.', null);
        }
      });
  }

  // ════════════════════════════════════════════════
  // 2. syncActivelyLooking — is_actively_looking toggle
  //    source: 'merkez' | 'ayarlar'
  // ════════════════════════════════════════════════
  function syncActivelyLooking(newValue, source) {
    var merkez = document.getElementById('merkez-toggle-active');
    var ayarlar = document.getElementById('settings-actively-looking');
    var wiz = document.getElementById('wiz-toggle-active');
    var msg = document.getElementById('actively-looking-msg');

    // Optimistic UI: sync all toggles
    if (merkez) merkez.checked = newValue;
    if (ayarlar) ayarlar.checked = newValue;
    if (wiz) wiz.checked = newValue;
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_actively_looking = newValue;

    // DB write — single path
    if (typeof supabase === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    supabase.from('candidates')
      .update({ is_actively_looking: newValue })
      .eq('user_id', currentUser.id)
      .then(function(res) {
        if (res.error) {
          console.error('[HT] actively-looking save failed', res.error);
          // Rollback all toggles
          var rollback = !newValue;
          if (merkez) merkez.checked = rollback;
          if (ayarlar) ayarlar.checked = rollback;
          if (wiz) wiz.checked = rollback;
          if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.is_actively_looking = rollback;
          if (msg) { msg.style.color = 'var(--red)'; msg.textContent = 'Hata: Kaydedilemedi. Lütfen tekrar deneyin.'; msg.style.display = 'block'; }
          showTgToast('Hata: Kaydedilemedi. Lütfen tekrar deneyin.', null);
        } else {
          if (msg) {
            msg.style.color = 'var(--green)';
            msg.textContent = newValue ? 'Aktif arama modu açıldı.' : 'Aktif arama modu kapatıldı.';
            msg.style.display = 'block';
            setTimeout(function() { msg.style.display = 'none'; }, 3000);
          }
        }
      });
  }

  // ════════════════════════════════════════════════
  // 3. syncHideFromEmployer — hide_from_current_employer toggle
  //    source: 'merkez' | 'ayarlar'
  // ════════════════════════════════════════════════
  function syncHideFromEmployer(newValue, source) {
    var merkez = document.getElementById('merkez-hide-from-current-employer');
    var ayarlar = document.getElementById('settings-hide-from-current-employer');
    var wiz = document.getElementById('wiz-toggle-hide');

    // Eligibility guard: don't save if disabled
    if (merkez && merkez.disabled) return;
    if (ayarlar && ayarlar.disabled) return;
    if (wiz && wiz.disabled) return;

    // Optimistic UI: sync all toggles
    if (merkez) merkez.checked = newValue;
    if (ayarlar) ayarlar.checked = newValue;
    if (wiz) wiz.checked = newValue;
    if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.hide_from_current_employer = newValue;
    if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();

    // DB write — single path
    if (typeof supabase === 'undefined' || typeof currentUser === 'undefined' || !currentUser) return;
    supabase.from('candidates')
      .update({ hide_from_current_employer: newValue })
      .eq('user_id', currentUser.id)
      .then(function(res) {
        if (res.error) {
          console.error('[HT] hide-from-employer save failed', res.error);
          // Rollback all toggles
          var rollback = !newValue;
          if (merkez) merkez.checked = rollback;
          if (ayarlar) ayarlar.checked = rollback;
          if (wiz) wiz.checked = rollback;
          if (_loadedDBData && _loadedDBData.profile) _loadedDBData.profile.hide_from_current_employer = rollback;
          if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
          showTgToast('Hata: Kaydedilemedi. Lütfen tekrar deneyin.', null);
        }
      });
  }

  // Tek kaynak: _loadedDBData.profile → tüm Beni öner / aktif arıyorum / mevcut işveren aynaları
  function applyAllVisibilityMirrorsFromProfile() {
    var p = _loadedDBData && _loadedDBData.profile;
    if (!p) return;
    var isActive = p.is_active !== false;
    var actively = p.is_actively_looking === true;
    var hide = p.hide_from_current_employer === true;

    var merkezV = document.getElementById('merkez-toggle-visibility');
    var merkezA = document.getElementById('merkez-toggle-active');
    var merkezH = document.getElementById('merkez-hide-from-current-employer');
    var side = document.getElementById('sidebar-toggle-benioner');
    var setV = document.getElementById('settings-visibility-active');
    var setA = document.getElementById('settings-actively-looking');
    var setH = document.getElementById('settings-hide-from-current-employer');
    var wizV = document.getElementById('wiz-toggle-visibility');
    var wizA = document.getElementById('wiz-toggle-active');
    var wizH = document.getElementById('wiz-toggle-hide');

    if (merkezV) merkezV.checked = isActive;
    if (side) side.checked = isActive;
    if (setV) setV.checked = isActive;
    if (wizV) wizV.checked = isActive;

    if (merkezA) merkezA.checked = actively;
    if (setA) setA.checked = actively;
    if (wizA) wizA.checked = actively;

    var currentEmp = typeof getCurrentEmployerDisplayFromExperiences === 'function'
      ? getCurrentEmployerDisplayFromExperiences(_loadedDBData ? _loadedDBData.experiences : null)
      : null;
    var cbNoExp = document.getElementById('cb-no-experience');
    var noExperience = !!(cbNoExp && cbNoExp.checked);
    var hideEligible = !!currentEmp && !noExperience;

    if (merkezH) {
      merkezH.disabled = !hideEligible;
      merkezH.checked = hideEligible ? hide : false;
    }
    if (setH) {
      setH.disabled = !hideEligible;
      setH.checked = hideEligible ? hide : false;
    }
    if (wizH) {
      wizH.disabled = !hideEligible;
      wizH.checked = hideEligible ? hide : false;
    }

    updateVisState();
    if (typeof updateStatusUI === 'function') updateStatusUI(isActive);
    if (typeof refreshVisibilitySummary === 'function') refreshVisibilitySummary();
    if (typeof updateStep6HideState === 'function') updateStep6HideState();
  }

  // ── Wire Merkez toggles ──
  var visToggle = document.getElementById('merkez-toggle-visibility');
  if (visToggle) {
    visToggle.addEventListener('change', function() {
      var cell = visToggle.closest('.mk-controls-item');
      if (visToggle.checked) {
        showTgToast('Profilin ve kişisel bilgilerin işverenlerle paylaşılacak.', cell);
      } else {
        showTgToast('Profilin gizlendi. İşverenler kişisel bilgilerini ve CV\'ni göremez.', cell);
      }
      syncBeniOner(visToggle.checked, 'merkez');
    });
    updateVisState();
  }

  var sidebarToggle = document.getElementById('sidebar-toggle-benioner');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('change', function() {
      syncBeniOner(sidebarToggle.checked, 'sidebar');
    });
  }

  var aktifToggle = document.getElementById('merkez-toggle-active');
  if (aktifToggle) {
    aktifToggle.addEventListener('change', function() {
      var newVal = this.checked;
      var cell = this.closest('.mk-controls-item');
      if (newVal) {
        showTgToast('İşverenler profilinde "Aktif iş arıyor" rozeti görecek.', cell);
      } else {
        showTgToast('Rozet kaldırıldı. Profilin hâlâ görünür, sadece aktif arama rozeti gizli.', cell);
      }
      syncActivelyLooking(newVal, 'merkez');
    });
  }

  var hideToggle = document.getElementById('merkez-hide-from-current-employer');
  if (hideToggle) {
    hideToggle.addEventListener('change', function() {
      var cell = this.closest('.mk-controls-item');
      if (this.checked) {
        showTgToast('Mevcut işverenin profilini göremeyecek.', cell);
      } else {
        showTgToast('Mevcut işverenin de dahil tüm işverenler profilini görebilir.', cell);
      }
      syncHideFromEmployer(this.checked, 'merkez');
    });
  }

  // ── Expose to other modules (profil-settings.js, profil.html) ──
  window.updateMerkezVisState = updateVisState;
  window.syncBeniOner = syncBeniOner;
  window.syncActivelyLooking = syncActivelyLooking;
  window.syncHideFromEmployer = syncHideFromEmployer;
  window.applyAllVisibilityMirrorsFromProfile = applyAllVisibilityMirrorsFromProfile;
})();

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


