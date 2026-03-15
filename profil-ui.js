// ── STATUS UI ──
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
  sel.options[0].textContent = 'Ilce sec...';
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
  if (file.size > 2 * 1024 * 1024) { alert('Dosya 2MB\'dan buyuk olamaz.'); return; }
  var btnText = document.getElementById('avatar-btn-text');
  if (btnText) btnText.textContent = 'Yukleniyor...';
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
    if (btnText) btnText.textContent = 'Guncellendi!';
    setTimeout(function() { if (btnText) btnText.textContent = 'Fotograf Yukle'; }, 2000);
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
  delBtn.textContent = '\u00D7';
  delBtn.addEventListener('click', function() {
    card.remove();
    var remaining = document.querySelectorAll('.exp-card');
    remaining.forEach(function(c, idx) {
      var btn = c.querySelector('.exp-card-del');
      if (btn) btn.style.display = (remaining.length <= 1) ? 'none' : '';
    });
  });
  header.appendChild(delBtn);
  card.appendChild(header);

  // Row 1: Sirket/Marka (merged smart field) + Pozisyon
  var row1 = document.createElement('div');
  row1.className = 'field-row';
  row1.appendChild(makeSmartBrandField(cardId + '-sirket', d, 'Şirket adı', true));
  row1.appendChild(makeField('text', 'Pozisyon <span class="field-req">*</span>', cardId + '-pozisyon', 'Pozisyon / Ünvan', d.pozisyon));
  card.appendChild(row1);

  // Pozisyon display normalization on blur
  var pozInput = document.getElementById(cardId + '-pozisyon');
  if (pozInput) {
    pozInput.addEventListener('blur', function() {
      if (pozInput.value) pozInput.value = normalizeForDisplay(pozInput.value);
    });
  }

  // Row 2: Departman + İstihdam Tipi
  var row2 = document.createElement('div');
  row2.className = 'field-row';
  row2.appendChild(makeSelectField('Departman', cardId + '-departman', DEPARTMANLAR, d.departman, 'Departman seçiniz...'));
  row2.appendChild(makeSelectField('İstihdam Tipi', cardId + '-istihdam', ISTIHDAM_TIPLERI, d.istihdam_tipi, 'İstihdam tipi seçiniz...'));
  card.appendChild(row2);

  // Row 3: Segment + Şehir
  var row3 = document.createElement('div');
  row3.className = 'field-row';
  row3.appendChild(makeSelectField('Segment', cardId + '-segment', SEGMENTLER, d.segment, 'Segment seçiniz...'));
  row3.appendChild(makeSelectField('Şehir', cardId + '-sehir', flatAllCities(), d.sehir, 'Şehir seçiniz...'));
  card.appendChild(row3);

  // Row 4: Takım Büyüklüğü (conditional — shown only for managerial departments)
  var takimWrap = makeSelectField('Takım Büyüklüğü', cardId + '-takim', TAKIM_BUYUKLUKLERI, d.takim_buyuklugu, 'Takım büyüklüğü seçiniz...');
  takimWrap.id = cardId + '-takim-wrap';
  var deptShouldShowTakim = d.departman && ['Bölge Yönetimi','Genel Merkez'].indexOf(d.departman) !== -1;
  takimWrap.style.display = deptShouldShowTakim ? '' : 'none';
  card.appendChild(takimWrap);

  // Wire departman → takim visibility toggle
  var deptSelect = card.querySelector('#' + cardId + '-departman');
  if (deptSelect) {
    deptSelect.addEventListener('change', function() {
      var show = ['Bölge Yönetimi','Genel Merkez'].indexOf(deptSelect.value) !== -1;
      takimWrap.style.display = show ? '' : 'none';
      if (!show) { var ts = document.getElementById(cardId + '-takim'); if (ts) ts.value = ''; }
    });
  }

  // Row 6: Başlangıç Ay/Yıl + Bitiş Ay/Yıl
  var row6 = document.createElement('div');
  row6.className = 'field-row';
  row6.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
  row6.appendChild(makeSelectField('Başlangıç Ay', cardId + '-basay', AY_ISIMLERI, d.baslangic_ay, 'Ay'));
  row6.appendChild(makeYearField('Başlangıç Yılı <span class=\"field-req\">*</span>', cardId + '-basyil', d.baslangic_yil));
  var bitAyField = makeSelectField('Bitiş Ay', cardId + '-bitay', AY_ISIMLERI, d.bitis_ay, 'Ay');
  bitAyField.classList.add('bitis-field');
  row6.appendChild(bitAyField);
  var bitYilField = makeYearField('Bitiş Yıl', cardId + '-bityil', d.bitis_yil);
  bitYilField.classList.add('bitis-field');
  row6.appendChild(bitYilField);
  card.appendChild(row6);

  // Checkbox: Halen burada çalışıyorum
  var cbWrap = document.createElement('label');
  cbWrap.className = 'cb-wrap';
  var cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.id = cardId + '-devam';
  if (d.devam_ediyor) cb.checked = true;
  var cbLabel = document.createElement('span');
  cbLabel.textContent = 'Halen burada çalışıyorum';
  cbWrap.appendChild(cb);
  cbWrap.appendChild(cbLabel);
  card.appendChild(cbWrap);

  // Devam ediyor badge
  var devamBadge = document.createElement('span');
  devamBadge.className = 'exp-devam-badge';
  devamBadge.textContent = 'Devam ediyor';
  devamBadge.style.display = d.devam_ediyor ? 'inline-block' : 'none';
  devamBadge.style.fontSize = '11px';
  devamBadge.style.fontWeight = '600';
  devamBadge.style.color = 'var(--green)';
  row6.appendChild(devamBadge);

  // Ayrılma Nedeni (hidden when devam_ediyor)
  var ayrilmaField = makeSelectField('Ayrılma Nedeni', cardId + '-ayrilma', AYRILMA_NEDENLERI, d.ayrilma_nedeni);
  ayrilmaField.classList.add('ayrilma-field');
  if (d.devam_ediyor) ayrilmaField.style.display = 'none';
  card.appendChild(ayrilmaField);

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
    card.style.borderLeft = cb.checked ? '3px solid var(--accent)' : '1.5px solid var(--border-subtle)';
  });
  // Trigger initial state
  if (d.devam_ediyor) {
    card.querySelectorAll('.bitis-field').forEach(function(f) {
      f.style.display = 'none';
      var sel = f.querySelector('select');
      if (sel) { sel.value = ''; sel.disabled = true; }
    });
    card.style.borderLeft = '3px solid var(--accent)';
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
      // Freeform: normalize display, keep resolvedSirket in sync
      input.value = normalizeForDisplay(input.value);
      input.dataset.resolvedSirket = input.value;
    }
  });

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  wrap.appendChild(sugBox);
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
    // Safety: normalize pozisyon at collect-time
    var rawPoz = val(prefix + 'pozisyon');
    var normalizedPoz = rawPoz ? normalizeForDisplay(rawPoz) : '';
    result.push({
      sirket: resolvedSirket,
      marka: nullIfEmpty(resolvedMarka),
      pozisyon: normalizedPoz,
      departman: nullIfEmpty(val(prefix + 'departman')),
      segment: nullIfEmpty(val(prefix + 'segment')),
      istihdam_tipi: nullIfEmpty(val(prefix + 'istihdam')),
      kidem_seviyesi: null,   // Decision 1: removed from UI, always null
      lokasyon_tipi: null,    // Decision 3: removed from UI, always null
      sehir: nullIfEmpty(val(prefix + 'sehir')),
      takim_buyuklugu: nullIfEmpty(val(prefix + 'takim')),
      baslangic_ay: monthNameToIndex(val(prefix + 'basay')),
      baslangic_yil: val(prefix + 'basyil') ? parseInt(val(prefix + 'basyil')) : null,
      bitis_ay: monthNameToIndex(val(prefix + 'bitay')),
      bitis_yil: val(prefix + 'bityil') ? parseInt(val(prefix + 'bityil')) : null,
      devam_ediyor: document.getElementById(prefix + 'devam') ? document.getElementById(prefix + 'devam').checked : false,
      ayrilma_nedeni: nullIfEmpty(val(prefix + 'ayrilma')),
      basari_ozeti: null      // Decision 5: removed from wizard, always null
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
  delBtn.textContent = '\u00D7';
  delBtn.title = 'Kaldir';
  delBtn.style.cssText = 'position:absolute;top:4px;right:4px;border:none;background:none;cursor:pointer;color:var(--muted);font-size:18px;';
  delBtn.addEventListener('click', function() {
    row.remove();
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
  delBtn.textContent = '\u00D7';
  delBtn.title = 'Kaldir';
  delBtn.style.cssText = 'position:absolute;top:4px;right:4px;border:none;background:none;cursor:pointer;color:var(--muted);font-size:18px;';
  delBtn.addEventListener('click', function() {
    row.remove();
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
  delBtn.textContent = '\u00D7';
  delBtn.title = 'Kaldir';
  delBtn.style.cssText = 'position:absolute;top:4px;right:4px;border:none;background:none;cursor:pointer;color:var(--muted);font-size:18px;';
  delBtn.addEventListener('click', function() { row.remove(); });
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

  // Calisma Tipleri checkboxes
  var ctContainer = document.getElementById('calisma-tipleri-checks');
  if (ctContainer) {
    ISTIHDAM_TIPLERI.forEach(function(tip) {
      var lbl = document.createElement('label');
      lbl.className = 'cb-wrap';
      lbl.style.padding = '6px 0';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = tip;
      cb.addEventListener('change', function() {
        if (cb.checked) { selectedCalismaTipleri.push(tip); }
        else { selectedCalismaTipleri = selectedCalismaTipleri.filter(function(t) { return t !== tip; }); }
      });
      var span = document.createElement('span');
      span.textContent = tip;
      lbl.appendChild(cb);
      lbl.appendChild(span);
      ctContainer.appendChild(lbl);
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

  // Career type multi-select checkboxes (Decision 8)
  var ctypeContainer = document.getElementById('career-type-checks');
  if (ctypeContainer) {
    CAREER_TYPE_OPTIONS.forEach(function(opt) {
      var lbl = document.createElement('label');
      lbl.className = 'cb-wrap';
      lbl.style.padding = '6px 0';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = opt.value;
      cb.addEventListener('change', function() {
        if (cb.checked) { selectedCareerTypes.push(opt.value); }
        else { selectedCareerTypes = selectedCareerTypes.filter(function(t) { return t !== opt.value; }); }
      });
      var span = document.createElement('span');
      span.textContent = opt.label;
      lbl.appendChild(cb);
      lbl.appendChild(span);
      ctypeContainer.appendChild(lbl);
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
  delBtn.type = 'button';
  delBtn.textContent = '\u00D7';
  delBtn.style.cssText = 'position:absolute;top:4px;right:4px;border:none;background:none;cursor:pointer;color:var(--muted);font-size:18px;';
  delBtn.addEventListener('click', function() { row.remove(); });
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
    var item = { rol_ailesi: nullIfEmpty(val(p + 'ailesi')), rol_unvani: nullIfEmpty(val(p + 'unvan')) };
    if (item.rol_ailesi || item.rol_unvani) result.push(item);
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
      noDistrict.textContent = 'Bu il icin ilce secimi mevcut degil.';
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

async function saveProfileRPC() {
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
    is_active: document.getElementById('merkez-toggle-active')
      ? document.getElementById('merkez-toggle-active').checked
      : (_loadedDBData && _loadedDBData.profile && typeof _loadedDBData.profile.is_active === 'boolean'
          ? _loadedDBData.profile.is_active
          : true),
    ilk_deneyim: document.getElementById('cb-no-experience') ? document.getElementById('cb-no-experience').checked : false,
    profile_completed: true
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
  var p_brand_interests = selectedBrandInterests.map(function(name) { return { marka: name }; });

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

    if (result.error) throw result.error;

    // Success
    clearDraft();
    wizardDirty = false; // Reset dirty state so success modal → switchPanel won't trigger guard
    ht_track('profile_save_success');
    document.getElementById('modal-success').classList.add('show');
    if (_loadedDBData) {
      _loadedDBData.experiences = p_experiences;
      if (_loadedDBData.profile) _loadedDBData.profile.is_active = p_profile.is_active;
    }
    updateStatusUI(p_profile.is_active);
    var mta = document.getElementById('merkez-toggle-active');
    if (mta) mta.checked = p_profile.is_active;
    var vis = document.getElementById('merkez-toggle-visibility');
    if (vis) vis.checked = p_profile.is_active;
    if (typeof updateHideRowVisibility === 'function') updateHideRowVisibility();
    // Update sidebar name
    var nameEl = document.getElementById('sidebar-user-name');
    if (nameEl && p_profile.full_name) nameEl.textContent = p_profile.full_name;
    // Update dashboard
    updateDashboardSummary(p_profile, p_experiences);
    // Update Profil Merkezi cards (separate from completion — no side-effect coupling)
    updateMerkezCards();

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

function merkezSetText(id, text) {
  var sumEl = document.getElementById(id);
  var emptyEl = document.getElementById(id + '-empty');
  if (sumEl) { sumEl.textContent = text || ''; sumEl.style.display = text ? '' : 'none'; }
  if (emptyEl) emptyEl.style.display = text ? 'none' : '';
}

function updateMerkezCards() {
  // Card 1: Kişisel Bilgiler
  var name = val('f-adsoyad');
  var city = val('f-adresil');
  var phone = val('f-telefon');
  var parts1 = [name, city, phone].filter(Boolean);
  merkezSetText('merkez-sum-1', parts1.length ? parts1.join(' \u00B7 ') : null);

  // Card 2: Deneyim
  var cbNoExp = document.getElementById('cb-no-experience');
  var expCards = document.querySelectorAll('.exp-card');
  if (cbNoExp && cbNoExp.checked) {
    merkezSetText('merkez-sum-2', 'Deneyimsiz olarak i\u015Faretlendi');
  } else if (expCards.length > 0) {
    var firstId = expCards[0].id + '-';
    var role = val(firstId + 'pozisyon');
    var company = document.getElementById(firstId + 'sirket');
    var compVal = company ? (company.dataset.resolvedMarka || company.value || '') : '';
    var expLine = [role, compVal].filter(Boolean).join(' \u00B7 ');
    if (expCards.length > 1) expLine += ' \u00B7 +' + (expCards.length - 1) + ' deneyim';
    merkezSetText('merkez-sum-2', expLine || null);
  } else {
    merkezSetText('merkez-sum-2', null);
  }

  // Card 3: Eğitim & Dil
  var eduCount = document.querySelectorAll('#edu-rows-container .dynamic-row').length;
  var langCount = document.querySelectorAll('#lang-rows-container .dynamic-row').length;
  var eduParts = [];
  if (eduCount > 0) eduParts.push(eduCount + ' e\u011Fitim');
  if (langCount > 0) eduParts.push(langCount + ' dil');
  merkezSetText('merkez-sum-3', eduParts.length ? eduParts.join(' \u00B7 ') : null);

  // Card 4: Tercihler
  var prefParts = [];
  if (selectedCalismaTipleri.length > 0) prefParts.push(selectedCalismaTipleri.join(', '));
  if (selectedMusaitlik) prefParts.push(selectedMusaitlik);
  if (val('f-maas')) prefParts.push('\u20BA' + val('f-maas'));
  merkezSetText('merkez-sum-4', prefParts.length ? prefParts.join(' \u00B7 ') : null);

  // Card 5: Lokasyon
  var cityKeys = Object.keys(selectedLocations);
  merkezSetText('merkez-sum-5', cityKeys.length ? cityKeys.join(', ') : null);

  // Update identity card in merkez
  updateMerkezIdentity();
  updateSectionStatuses();
}

function updateSectionStatuses() {
  for (var i = 1; i <= 5; i++) {
    var statusEl = document.getElementById('mk-status-' + i);
    var summaryEl = document.getElementById('merkez-sum-' + i);
    if (statusEl) {
      if (summaryEl && summaryEl.style.display !== 'none' && summaryEl.textContent.trim()) {
        statusEl.classList.add('done');
      } else {
        statusEl.classList.remove('done');
      }
    }
  }
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
  if (typeof updateHideRowVisibility === 'function') updateHideRowVisibility();
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
  var candRes = await supabase.from('candidates').select('*').eq('user_id', currentUser.id).single();
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
  var [expRes, eduRes, certRes, langRes, roleRes, wpRes, biRes, locRes] = await Promise.all([
    supabase.from('candidate_experiences').select('*').eq('candidate_id', cid).order('sira'),
    supabase.from('candidate_education').select('*').eq('candidate_id', cid).order('sira'),
    supabase.from('candidate_certificates').select('*').eq('candidate_id', cid).order('sira'),
    supabase.from('candidate_languages').select('*').eq('candidate_id', cid).order('sira'),
    supabase.from('candidate_target_roles').select('*').eq('candidate_id', cid),
    supabase.from('candidate_work_preferences').select('*').eq('candidate_id', cid).maybeSingle(),
    supabase.from('candidate_brand_interests').select('*').eq('candidate_id', cid),
    supabase.from('candidate_location_preferences').select('*, candidate_location_pref_districts(*)').eq('candidate_id', cid)
  ]);

  // ── Diagnostic: log every child-table result so silent failures become visible ──
  var _childResults = [
    ['experiences',     expRes],
    ['education',       eduRes],
    ['certificates',    certRes],
    ['languages',       langRes],
    ['target_roles',    roleRes],
    ['work_prefs',      wpRes],
    ['brand_interests', biRes],
    ['locations',       locRes]
  ];
  _childResults.forEach(function(pair) {
    var key = pair[0], r = pair[1];
    if (r.error) {
      if (window.Sentry) Sentry.captureMessage('Profile restore: ' + key + ' query failed', {
        level: 'error', tags: { flow: 'profile-restore', table: key },
        extra: { code: r.error.code, hint: r.error.hint, status: r.status }
      });
      console.error('[HT] ' + key + ' query FAILED →', r.error.message,
        '| code:', r.error.code, '| hint:', r.error.hint || '-',
        '| status:', r.status, '| details:', r.error.details || '-');
    } else if (Array.isArray(r.data)) {
    } else if (r.data) {
    } else {
      // .single() returns data:null + no error when 0 rows (PGRST116)
      console.warn('[HT] ' + key + ' → null (no rows or unexpected shape)');
    }
  });

  return {
    profile: {
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
      cv_url: cand.cv_url || null,
      cv_filename: cand.cv_filename || null,
      cv_uploaded_at: cand.cv_uploaded_at || null,
      son_sirket: cand.son_sirket || null,
      hide_from_current_employer: cand.hide_from_current_employer === true,
      updated_at: cand.updated_at || null
    },
    no_experience: cand.ilk_deneyim || false,
    experiences: (expRes.data || []).map(function(e) {
      return {
        sirket_adi: e.sirket, marka: e.marka, pozisyon: e.pozisyon,
        departman: e.departman, segment: e.segment, istihdam_tipi: e.istihdam_tipi,
        kidem_seviyesi: e.kidem_seviyesi, lokasyon_tipi: e.lokasyon_tipi,
        sehir: e.sehir, takim_buyuklugu: e.takim_buyuklugu,
        baslangic_ay: monthIndexToName(e.baslangic_ay),
        baslangic_yil: e.baslangic_yil ? String(e.baslangic_yil) : '',
        bitis_ay: monthIndexToName(e.bitis_ay),
        bitis_yil: e.bitis_yil ? String(e.bitis_yil) : '',
        devam_ediyor: e.devam_ediyor, ayrilma_nedeni: e.ayrilma_nedeni,
        basari_ozeti: e.basari_ozeti
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
  var score = 0, total = 0;
  // Profile fields (40 points)
  total += 10; if (val('f-adsoyad')) score += 10;
  total += 5; if (val('f-telefon')) score += 5;
  total += 5; if (val('f-cinsiyet')) score += 5;
  total += 5; if (val('f-dogumyili')) score += 5;
  total += 10; if (val('f-adresil')) score += 10;
  total += 5; if (val('f-linkedin')) score += 5;
  // Experiences (20 points)
  total += 20;
  var cbNoExp = document.getElementById('cb-no-experience');
  if (cbNoExp && cbNoExp.checked) { score += 20; }
  else if (document.querySelectorAll('.exp-card').length > 0 && val(document.querySelector('.exp-card').id + '-sirket')) { score += 20; }
  // Education (10 points)
  total += 10;
  if (document.querySelectorAll('#edu-rows-container .dynamic-row').length > 0) score += 10;
  // Languages (10 points)
  total += 10;
  if (document.querySelectorAll('#lang-rows-container .dynamic-row').length > 0) score += 10;
  // Preferences (10 points)
  total += 10;
  if (selectedMusaitlik || selectedCalismaTipleri.length > 0) score += 10;
  // Locations (10 points)
  total += 10;
  if (Object.keys(selectedLocations).length > 0) score += 10;

  return Math.round((score / total) * 100);
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
    // Team size: only score if the field is visible (follows UI conditional logic)
    var takimWrap = document.getElementById(expCards[0].id + '-takim-wrap');
    var takimVisible = takimWrap && takimWrap.style.display !== 'none';
    if (takimVisible && val(firstId + 'takim')) score += 4;
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

  // Update score value display
  var valEl = document.getElementById('merkez-score-value');
  if (valEl) {
    valEl.textContent = '';
    valEl.appendChild(document.createTextNode(sc));
    var suffix = document.createElement('span');
    suffix.textContent = sc >= 100 ? ' Mükemmel!' : '/100';
    valEl.appendChild(suffix);
  }

  // Update legacy hint (small text)
  var hintWrap = document.getElementById('merkez-score-hint');
  var hintText = document.getElementById('merkez-hint-text');
  if (hintWrap && hintText) {
    if (hints.length > 0) {
      hintWrap.style.display = '';
      hintText.textContent = hints[0];
    } else {
      hintWrap.style.display = 'none';
    }
  }

  // Update prominent hints (up to 2, with active style)
  var hintsContainer = document.getElementById('merkez-score-hints-active');
  if (hintsContainer) {
    while (hintsContainer.firstChild) hintsContainer.removeChild(hintsContainer.firstChild);
    var maxHints = Math.min(hints.length, 2);
    for (var i = 0; i < maxHints; i++) {
      var hintDiv = document.createElement('div');
      hintDiv.className = 'mk-stat-hint-active';
      var arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrowSvg.setAttribute('viewBox', '0 0 24 24');
      arrowSvg.setAttribute('fill', 'none');
      arrowSvg.setAttribute('stroke', 'currentColor');
      arrowSvg.setAttribute('stroke-width', '2');
      var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', '9 18 15 12 9 6');
      arrowSvg.appendChild(polyline);
      hintDiv.appendChild(arrowSvg);
      hintDiv.appendChild(document.createTextNode(hints[i]));
      hintsContainer.appendChild(hintDiv);
    }
  }

  // Update merkez score progress bar
  var scoreBar = document.getElementById('merkez-score-bar');
  if (scoreBar) scoreBar.style.width = sc + '%';
}

function updateCompletionUI() {
  var pct = calculateCompletion();

  // Genel panel: progress bar + text
  var gFill = document.getElementById('g-completion-fill');
  if (gFill) gFill.style.width = pct + '%';
  var gPctText = document.getElementById('completion-pct');
  if (gPctText) gPctText.textContent = pct + '%';

  // Merkez panel: stat card with monospace number + progress bar
  var mPct = document.getElementById('merkez-completion-pct');
  if (mPct) {
    mPct.textContent = '';
    mPct.appendChild(document.createTextNode(pct));
    var suffix = document.createElement('span');
    suffix.textContent = '%';
    mPct.appendChild(suffix);
  }
  var mBar = document.getElementById('merkez-completion-bar');
  if (mBar) mBar.style.width = pct + '%';
  var mSub = document.getElementById('merkez-completion-sub');
  if (mSub) mSub.textContent = pct >= 100 ? 'tüm alanlar dolduruldu ✓' : 'tamamlanması gereken alanlar var';

  // Update profile score alongside completion
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
    showCVUploaded(file.name, new Date());
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

function showCVUploaded(name, date) {
  var dropZone = document.getElementById('cv-drop-zone');
  var uploaded = document.getElementById('cv-uploaded-state');
  if (dropZone) dropZone.style.display = 'none';
  if (uploaded) {
    uploaded.style.display = 'flex';
    var nameEl = document.getElementById('cv-uploaded-name');
    var dateEl = document.getElementById('cv-uploaded-date');
    if (nameEl) nameEl.textContent = name;
    if (dateEl) dateEl.textContent = date.toLocaleDateString('tr-TR');
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
      if (e.departman || e.segment) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text([e.departman, e.segment].filter(Boolean).join(' | '), M, Y);
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
  var targets = ['user-avatar-header', 'sidebar-avatar', 'ps-avatar', 'merkez-avatar', 'avatar-upload-circle'];
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
// MARKALAR PANEL — Card grid + Modal v3
// ═══════════════════════════════════════════════════════════════

var _ht_brands = null;
var _ht_follows = new Set();
var _ht_sirketler_loaded = false;
var _ht_candidate_id = null;

var _AVATAR_COLORS = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22','#34495E','#16A085','#C0392B'];
function _avatarColor(n) { return _AVATAR_COLORS[(n||'?').charCodeAt(0) % _AVATAR_COLORS.length]; }

var _SEGMENT_TR = { luxury: 'LUXURY', premium: 'PREMIUM', mid: 'MODA', sportswear: 'SPORT', beauty: 'BEAUTY', tech: 'TECH' };
var _SEGMENTS = [
  { key: null, label: 'TÜMÜ' },
  { key: 'luxury', label: 'LUXURY' },
  { key: 'premium', label: 'PREMIUM' },
  { key: 'mid', label: 'MODA' },
  { key: 'sportswear', label: 'SPORT' },
  { key: 'beauty', label: 'BEAUTY' },
  { key: 'tech', label: 'TECH' }
];
var _ht_active_segment = null;

var _BRAND_COLORS = {
  'Louis Vuitton': { frontBg: 'radial-gradient(ellipse at 50% -20%, #ead5b8 0%, #f2e6d5 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #7d5c35 0%, #614626 40%, #44301a 100%)', accent: '#6B4C2A' },
  'Gucci': { frontBg: 'radial-gradient(ellipse at 50% -20%, #c8e6ca 0%, #e0f0e2 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #00714a 0%, #005c3a 40%, #003d26 100%)', accent: '#00613C' },
  'Prada': { frontBg: 'radial-gradient(ellipse at 50% -20%, #d8d8d8 0%, #eaeaea 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Hermès': { frontBg: 'radial-gradient(ellipse at 50% -20%, #f8c8a0 0%, #fce0c8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #e86218 0%, #c44e0e 40%, #9a3d0a 100%)', accent: '#E35205' },
  'Dior': { frontBg: 'radial-gradient(ellipse at 50% -20%, #d8d8d8 0%, #eaeaea 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Chanel': { frontBg: 'radial-gradient(ellipse at 50% -20%, #dadada 0%, #ececec 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Cartier': { frontBg: 'radial-gradient(ellipse at 50% -20%, #f0c0b4 0%, #f8ddd4 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #b82030 0%, #961a28 40%, #70131e 100%)', accent: '#A8182D' },
  'Beymen': { frontBg: 'radial-gradient(ellipse at 50% -20%, #ddd0be 0%, #ebe2d4 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #9e8465 0%, #7d6748 40%, #5c4a33 100%)', accent: '#8B7355' },
  'Vakko': { frontBg: 'radial-gradient(ellipse at 50% -20%, #d5d5d5 0%, #e6e6e6 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #3a3a3a 0%, #2a2a2a 40%, #1a1a1a 100%)', accent: '#2C2C2C' },
  'Massimo Dutti': { frontBg: 'radial-gradient(ellipse at 50% -20%, #e0d4c4 0%, #ede5d8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #5e4430 0%, #4a3524 40%, #36271a 100%)', accent: '#4A3728' },
  'Hugo Boss': { frontBg: 'radial-gradient(ellipse at 50% -20%, #d8d8d8 0%, #eaeaea 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Ralph Lauren': { frontBg: 'radial-gradient(ellipse at 50% -20%, #c4d0e8 0%, #d8e0f0 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #264d82 0%, #1d3d68 40%, #142c4d 100%)', accent: '#1B3D6D' },
  'Lacoste': { frontBg: 'radial-gradient(ellipse at 50% -20%, #b8e0c4 0%, #d4edda 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #006838 0%, #005228 40%, #003d1e 100%)', accent: '#004D2C' },
  'Alo Yoga': { frontBg: 'radial-gradient(ellipse at 50% -20%, #e4d4b8 0%, #f0e6d0 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #d4b070 0%, #b89555 40%, #96793e 100%)', accent: '#C4A265' },
  'lululemon': { frontBg: 'radial-gradient(ellipse at 50% -20%, #f0b8b8 0%, #fcd8d8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #e01a3e 0%, #be1534 40%, #961028 100%)', accent: '#D31334' },
  'Nike': { frontBg: 'radial-gradient(ellipse at 50% -20%, #d8d8d8 0%, #eaeaea 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#111111' },
  'Adidas': { frontBg: 'radial-gradient(ellipse at 50% -20%, #d8d8d8 0%, #eaeaea 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Zara': { frontBg: 'radial-gradient(ellipse at 50% -20%, #dadada 0%, #ececec 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'H&M': { frontBg: 'radial-gradient(ellipse at 50% -20%, #ffb8b8 0%, #ffd6d6 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #e52020 0%, #c41515 40%, #9a0e0e 100%)', accent: '#E50010' },
  'Mango': { frontBg: 'radial-gradient(ellipse at 50% -20%, #e4d4b8 0%, #f0e6d0 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #d4b078 0%, #b8955d 40%, #967944 100%)', accent: '#C8A96E' },
  'Boyner': { frontBg: 'radial-gradient(ellipse at 50% -20%, #b8d4ea 0%, #d4e4f0 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #0070b0 0%, #005a8e 40%, #00446b 100%)', accent: '#005B96' },
  'Pull & Bear': { frontBg: 'radial-gradient(ellipse at 50% -20%, #c8dcc4 0%, #dde8d8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #587e4e 0%, #46643d 40%, #354c2e 100%)', accent: '#4A6741' },
  'Bershka': { frontBg: 'radial-gradient(ellipse at 50% -20%, #dadada 0%, #ececec 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Stradivarius': { frontBg: 'radial-gradient(ellipse at 50% -20%, #e0d4c4 0%, #ede5d8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #9e7d55 0%, #7d6342 40%, #5e4a30 100%)', accent: '#8B6F47' },
  'Zara Home': { frontBg: 'radial-gradient(ellipse at 50% -20%, #ddd6cc 0%, #eae5de 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #7e6e5e 0%, #645648 40%, #4c4035 100%)', accent: '#6B5B4E' },
  'LC Waikiki': { frontBg: 'radial-gradient(ellipse at 50% -20%, #f0b8b8 0%, #fcd8d8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #f05545 0%, #d44535 40%, #aa3628 100%)', accent: '#E74C3C' },
  'Sephora': { frontBg: 'radial-gradient(ellipse at 50% -20%, #dadada 0%, #ececec 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'MAC': { frontBg: 'radial-gradient(ellipse at 50% -20%, #dadada 0%, #ececec 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #0d0d0d 100%)', accent: '#1A1A1A' },
  'Apple': { frontBg: 'radial-gradient(ellipse at 50% -20%, #dcdce0 0%, #ebebed 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #444 0%, #333 40%, #1a1a1a 100%)', accent: '#333333' },
  'Samsung': { frontBg: 'radial-gradient(ellipse at 50% -20%, #c0c8ee 0%, #d8e0f8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #1e38b8 0%, #162c96 40%, #0f2070 100%)', accent: '#1428A0' },
  'Teknosa': { frontBg: 'radial-gradient(ellipse at 50% -20%, #f0b8b8 0%, #fcd8d8 50%, #fff 90%)', backBg: 'linear-gradient(160deg, #f01820 0%, #cc1018 40%, #a00c12 100%)', accent: '#E30613' }
};

function _brandColors(brandName) {
  return _BRAND_COLORS[brandName] || {
    frontBg: 'radial-gradient(ellipse at 50% -20%, #eee 0%, #f5f5f5 50%, #fff 90%)',
    backBg: 'linear-gradient(160deg, #555 0%, #444 40%, #333 100%)',
    accent: '#6B7280'
  };
}

function _segmentAccentColor(seg) {
  var map = { luxury: '#1E2D5E', premium: '#C94E28', mid: '#3B82F6', sportswear: '#F59E0B', beauty: '#EC4899', tech: '#6366F1' };
  return map[seg] || '#6B7280';
}

function _brandLogoUrl(b) {
  if (b.logo_url) return b.logo_url;
  if (b.website_url) {
    try {
      var domain = new URL(b.website_url).hostname.replace('www.', '');
      return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128';
    } catch(e) {}
  }
  return null;
}

// Single logo fallback: replace img with initial (avoids img + initial both visible).
window._htBrandLogoError = function(imgEl) {
  var initial = (imgEl.getAttribute('data-initial') || '?').replace(/</g,'').replace(/>/g,'');
  var color = imgEl.getAttribute('data-color') || '#6B7280';
  imgEl.outerHTML = '<span class="brand-initial" style="background:'+color+';width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#fff;">'+initial+'</span>';
};

function _brandLogoHtml(b, sz) {
  sz = sz || 48;
  var url = _brandLogoUrl(b);
  var initial = _escHtml((b.brand_name||'?').charAt(0).toUpperCase());
  var color = _avatarColor(b.brand_name);
  if (url) {
    return '<div class="brand-logo-wrap" style="width:'+sz+'px;height:'+sz+'px;">' +
      '<img src="'+_escHtml(url)+'" alt="'+_escHtml(b.brand_name)+'" data-initial="'+initial+'" data-color="'+_escHtml(color)+'" onerror="window._htBrandLogoError(this)"></div>';
  }
  return '<div class="brand-logo-wrap" style="width:'+sz+'px;height:'+sz+'px;"><span class="brand-initial" style="background:'+color+'">'+initial+'</span></div>';
}

function _segmentTag(seg) {
  if (!seg) return '';
  return '<span class="brand-segment '+_escHtml(seg)+'">'+_escHtml(_SEGMENT_TR[seg]||seg)+'</span>';
}

function _shortDomain(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.',''); } catch(e) { return url; }
}

function _igHandle(url) {
  if (!url) return '';
  try { var p = new URL(url).pathname.replace(/\//g,''); return '@' + p; } catch(e) { return url; }
}

// ── Load panel ──
async function loadSirketlerPanel() {
  if (_ht_sirketler_loaded) return;
  _ht_sirketler_loaded = true;

  if (!_ht_candidate_id && currentUser) {
    var cr = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).maybeSingle();
    if (cr.data) _ht_candidate_id = cr.data.id;
  }

  var brandsRes = await supabase.from('brands')
    .select('id,brand_name,slug,logo_url,website_url,instagram_url,short_description,segment,store_count_tr,store_cities,hq_city,employee_count_tr,is_featured,company_id')
    .not('website_url','is',null).eq('is_active',true).order('brand_name');

  var followsRes = _ht_candidate_id
    ? await supabase.from('candidate_brand_follows').select('brand_id').eq('candidate_id', _ht_candidate_id)
    : { data: [] };

  if (brandsRes.error) {
    console.error('[HT] loadBrandsPanel failed', brandsRes.error);
    document.getElementById('brand-grid').innerHTML = '<div class="brand-loading">Veriler yüklenemedi.</div>';
    _ht_sirketler_loaded = false;
    return;
  }

  _ht_brands = brandsRes.data || [];
  _ht_follows = new Set((followsRes.data || []).map(function(f) { return f.brand_id; }));

  // Featured first, then alphabetical (no UI label for featured)
  _ht_brands.sort(function(a, b) {
    var af = !!a.is_featured; var bf = !!b.is_featured;
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    return (a.brand_name || '').localeCompare(b.brand_name || '', 'tr');
  });

  _ht_visible_count = 12;
  renderSegmentPills();
  renderBrandGrid('');
  updateBrandFollowCounter();

  var si = document.getElementById('brand-search');
  si.addEventListener('input', function() {
    var val = si.value.trim();
    if (!val) _ht_visible_count = 12;
    renderBrandGrid(si.value);
  });

  var counterBtn = document.getElementById('brand-follow-counter-btn');
  if (counterBtn) counterBtn.addEventListener('click', openBrandFollowsPopup);
  var popupClose = document.getElementById('brand-follows-popup-close');
  if (popupClose) popupClose.addEventListener('click', closeBrandFollowsPopup);
  var popupOverlay = document.getElementById('brand-follows-popup-overlay');
  if (popupOverlay) popupOverlay.addEventListener('click', function(e) { if (e.target === popupOverlay) closeBrandFollowsPopup(); });
}

var _ht_page_size = 12;
var _ht_visible_count = 12;

// ── Segment pills ──
function renderSegmentPills() {
  var container = document.getElementById('segment-pills');
  if (!container) return;
  var html = '';
  for (var i = 0; i < _SEGMENTS.length; i++) {
    var s = _SEGMENTS[i];
    var isActive = _ht_active_segment === s.key;
    html += '<div class="seg-pill' + (isActive ? ' active' : '') + '" data-segment="' + (s.key === null ? '' : _escHtml(s.key)) + '">' + _escHtml(s.label) + '</div>';
  }
  container.innerHTML = html;
  container.querySelectorAll('.seg-pill').forEach(function(pill) {
    pill.addEventListener('click', function() {
      var seg = pill.getAttribute('data-segment') || null;
      _ht_active_segment = seg;
      if (!seg) _ht_visible_count = 12;
      renderSegmentPills();
      renderBrandGrid(document.getElementById('brand-search').value);
    });
  });
}

// ── Flip card grid ──
function renderBrandGrid(query) {
  var container = document.getElementById('brand-grid');
  if (!_ht_brands) { container.innerHTML = ''; return; }

  var q = trLower((query || '').trim());
  var list = q
    ? _ht_brands.filter(function(b) { return trLower(b.brand_name).indexOf(q) !== -1; })
    : _ht_brands;
  if (_ht_active_segment) {
    list = list.filter(function(b) { return b.segment === _ht_active_segment; });
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="brand-loading">' + (q || _ht_active_segment ? 'Sonuç bulunamadı.' : 'Henüz marka verisi yok.') + '</div>';
    return;
  }

  var usePagination = !q && !_ht_active_segment;
  var visible = usePagination ? Math.min(_ht_visible_count, list.length) : list.length;
  var showLoadMore = usePagination && list.length > _ht_visible_count && visible < list.length;
  var remaining = list.length - visible;

  var html = '';
  for (var i = 0; i < visible; i++) {
    var b = list[i];
    var isF = _ht_follows.has(b.id);
    var colors = _brandColors(b.brand_name);
    var segLabel = (_SEGMENT_TR[b.segment] || (b.segment || '')).toUpperCase();
    var segColor = _segmentAccentColor(b.segment);
    var storeText = b.store_count_tr != null && b.store_count_tr !== '' ? b.store_count_tr + ' mağaza' : '';
    var cityText = '';
    if (b.store_cities && b.store_cities.length > 0) {
      cityText = b.store_cities.slice(0, 3).join(', ');
      if (b.store_cities.length > 3) cityText += '...';
    }
    var logoFront = _brandLogoHtml(b, 76);
    var logoBack = _brandLogoHtml(b, 40);

    html += '<div class="flip-card" onclick="this.classList.toggle(\'flipped\')" style="animation-delay:' + (i * 0.03) + 's">' +
      '<div class="flip-card-inner">' +
        '<div class="flip-front" style="background:' + colors.frontBg + '">' +
          '<div class="front-logo">' + logoFront + '</div>' +
          '<div class="front-name">' + _escHtml(b.brand_name) + '</div>' +
          (segLabel ? '<div class="front-segment" style="background:' + segColor + '">' + _escHtml(segLabel) + '</div>' : '') +
          (storeText ? '<div class="front-stores">' + _escHtml(storeText) + '</div>' : '') +
          '<span class="flip-hint">detaylar →</span>' +
        '</div>' +
        '<div class="flip-back" style="background:' + colors.backBg + '">' +
          '<div class="back-header">' +
            '<div class="back-logo">' + logoBack + '</div>' +
            '<div class="back-title-area">' +
              '<div class="back-brand-name">' + _escHtml(b.brand_name) + '</div>' +
              (segLabel ? '<div class="back-segment-pill">' + _escHtml(segLabel) + '</div>' : '') +
            '</div>' +
            '<button type="button" class="back-follow-mini' + (isF ? ' following' : '') + '" data-brand-id="' + b.id + '" onclick="event.stopPropagation(); toggleBrandFollow(' + b.id + ',event)">' + (isF ? 'Takipte ✓' : 'Takip Et') + '</button>' +
          '</div>' +
          '<div class="back-info">' +
            (storeText ? '<div class="back-info-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + _escHtml(storeText) + (cityText ? ' · ' + _escHtml(cityText) : '') + '</div>' : '') +
            (b.employee_count_tr ? '<div class="back-info-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>~' + b.employee_count_tr.toLocaleString('tr-TR') + ' çalışan</div>' : '') +
            (b.hq_city ? '<div class="back-info-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>Merkez: ' + _escHtml(b.hq_city) + '</div>' : '') +
          '</div>' +
          (b.short_description ? '<div class="back-desc">' + _escHtml(b.short_description) + '</div>' : '') +
          '<div class="back-links">' +
            (b.website_url ? '<a class="back-link" href="' + _escHtml(b.website_url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>Website</a>' : '') +
            (b.instagram_url ? '<a class="back-link" href="' + _escHtml(b.instagram_url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/></svg>Instagram</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  if (showLoadMore) {
    html += '<button type="button" class="brand-load-more" id="brand-load-more">' +
      '<span class="plus-icon">+</span>' +
      '<span class="load-more-text">Daha fazla göster (' + remaining + ')</span>' +
    '</button>';
  }

  container.innerHTML = html;

  var loadMoreBtn = document.getElementById('brand-load-more');
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', function() {
    _ht_visible_count += _ht_page_size;
    renderBrandGrid(document.getElementById('brand-search').value);
  });
}

// ── Follow / Unfollow ──
var _ht_follow_busy = false;

async function toggleBrandFollow(brandId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  if (_ht_follow_busy || !_ht_candidate_id) return;
  _ht_follow_busy = true;

  var wasFollowed = _ht_follows.has(brandId);
  if (wasFollowed) { _ht_follows.delete(brandId); } else { _ht_follows.add(brandId); }

  _updateAllFollowBtns(brandId);
  updateBrandFollowCounter();
  refreshBrandFollowsPopupList();

  var res;
  if (wasFollowed) {
    res = await supabase.from('candidate_brand_follows')
      .delete().eq('candidate_id', _ht_candidate_id).eq('brand_id', brandId);
  } else {
    res = await supabase.from('candidate_brand_follows')
      .insert({ candidate_id: _ht_candidate_id, brand_id: brandId });
  }

  if (res.error) {
    console.error('[HT] toggleBrandFollow failed', res.error);
    if (wasFollowed) { _ht_follows.add(brandId); } else { _ht_follows.delete(brandId); }
    _updateAllFollowBtns(brandId);
    updateBrandFollowCounter();
    refreshBrandFollowsPopupList();
    _showBrandToast('Bir hata oluştu. Tekrar deneyin.');
  }
  _ht_follow_busy = false;
}

function _updateAllFollowBtns(brandId) {
  var isF = _ht_follows.has(brandId);
  // Card buttons
  // Flip card back follow button
  var backBtns = document.querySelectorAll('.back-follow-mini[data-brand-id="' + brandId + '"]');
  for (var j = 0; j < backBtns.length; j++) {
    backBtns[j].textContent = isF ? 'Takipte ✓' : 'Takip Et';
    if (isF) backBtns[j].classList.add('following'); else backBtns[j].classList.remove('following');
  }
}

// ── Follow counter button ──
function updateBrandFollowCounter() {
  var btn = document.getElementById('brand-follow-counter-btn');
  var numEl = document.getElementById('brand-follow-count-num');
  var n = _ht_follows ? _ht_follows.size : 0;
  if (numEl) numEl.textContent = n;
  if (btn) {
    btn.style.display = n > 0 ? 'inline-flex' : 'none';
    btn.style.opacity = '1';
  }
  var badge = document.getElementById('sirket-follow-count');
  if (badge) {
    var countText = badge.querySelector('.badge-count-text');
    if (countText) countText.textContent = n > 0 ? n + ' takip' : '';
    badge.style.display = n > 0 ? '' : 'none';
  }
  updateMarkalaBgDots();
}

function updateMarkalaBgDots() {
  var container = document.querySelector('.bg-markalar');
  if (!container) return;
  var ids = Array.from(_ht_follows || []).slice(0, 4);
  var brands = _ht_brands ? ids.map(function(id) { return _ht_brands.find(function(b) { return b.id === id; }); }).filter(Boolean) : [];
  if (brands.length === 0) {
    brands = _ht_brands ? _ht_brands.filter(function(b) { return b.is_featured; }).slice(0, 4) : [];
  }
  container.innerHTML = brands.map(function(b) {
    var url = _brandLogoUrl(b);
    return '<div class="brand-dot"><img src="' + _escHtml(url || '') + '" alt=""></div>';
  }).join('');
}

// ── Follow list popup ──
function openBrandFollowsPopup() {
  if (_ht_follows.size === 0) return;
  var overlay = document.getElementById('brand-follows-popup-overlay');
  if (overlay) overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  refreshBrandFollowsPopupList();
  document.addEventListener('keydown', _htBrandFollowsPopupEsc);
}

function closeBrandFollowsPopup() {
  var overlay = document.getElementById('brand-follows-popup-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  document.removeEventListener('keydown', _htBrandFollowsPopupEsc);
}

function _htBrandFollowsPopupEsc(e) {
  if (e.key === 'Escape') closeBrandFollowsPopup();
}

function refreshBrandFollowsPopupList() {
  var listEl = document.getElementById('brand-follows-popup-list');
  if (!listEl) return;
  var followed = _ht_brands ? _ht_brands.filter(function(b) { return _ht_follows.has(b.id); }) : [];
  var html = '';
  for (var i = 0; i < followed.length; i++) {
    var b = followed[i];
    html += '<div class="brand-follows-popup-item">' +
      '<div class="brand-follows-popup-item-logo">' + _brandLogoHtml(b, 32) + '</div>' +
      '<span class="brand-follows-popup-item-name">' + _escHtml(b.brand_name) + '</span>' +
      '<button type="button" class="brand-follows-popup-unfollow" onclick="toggleBrandFollow(' + b.id + ',event)">Takibi Bırak</button>' +
    '</div>';
  }
  listEl.innerHTML = html || '<p class="brand-follows-popup-empty">Henüz takip ettiğin marka yok.</p>';
}

// ── Toast ──
function _showBrandToast(msg) {
  var ex = document.getElementById('brand-toast');
  if (ex) ex.remove();
  var t = document.createElement('div');
  t.id = 'brand-toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .3s;';
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.style.opacity = '1'; });
  setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, 2500);
}

function _escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════
// PROFILE PREVIEW
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

  var html = '';
  var initials = (p.full_name || '').split(/\s+/).map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase() || '?';
  var avatarHtml = p.avatar_url
    ? '<img src="' + _escHtml(p.avatar_url) + '" alt="">'
    : initials;

  var currentRole = '';
  var currentCompany = '';
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
  exps.forEach(function(e) {
    var startY = parseInt(e.baslangic_yil, 10) || 0;
    var endY = e.devam_ediyor ? new Date().getFullYear() : (parseInt(e.bitis_yil, 10) || startY);
    totalYears += Math.max(0, endY - startY);
  });

  var isActive = p.is_active;

  html += '<div class="pp-hero">';
  html += '<div class="pp-avatar">' + avatarHtml + '</div>';
  html += '<div>';
  html += '<div class="pp-name">' + _escHtml(p.full_name || '') + '</div>';
  if (currentRole) {
    html += '<div class="pp-role"><strong>' + _escHtml(currentRole) + '</strong>';
    if (currentCompany) html += ' · ' + _escHtml(currentCompany);
    html += '</div>';
  }
  html += '<div class="pp-meta">';
  if (p.adres_il) {
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    html += _escHtml(p.adres_il);
  }
  if (totalYears > 0) {
    html += (p.adres_il ? '<span style="opacity:0.3;margin:0 4px;">·</span>' : '');
    html += totalYears + ' yıl deneyim';
  }
  html += '<span class="pp-status-badge ' + (isActive ? 'active' : 'passive') + '">';
  html += '<span class="dot"></span>' + (isActive ? 'Aktif aday' : 'Pasif') + '</span>';
  html += '</div>';
  html += '</div></div>';

  if (exps.length > 0) {
    html += '<div class="pp-section">';
    html += '<div class="pp-section-title">Deneyim</div>';
    exps.forEach(function(e) {
      var role = e.pozisyon || '';
      var brand = e.marka || '';
      var company = e.sirket_adi || '';
      var display = brand && company && brand !== company ? brand + ' (' + company + ')' : brand || company;
      var period = '';
      if (e.baslangic_yil) {
        period = (e.baslangic_ay ? e.baslangic_ay + ' ' : '') + e.baslangic_yil;
        if (e.devam_ediyor) {
          period += ' — Devam ediyor';
        } else if (e.bitis_yil) {
          period += ' — ' + (e.bitis_ay ? e.bitis_ay + ' ' : '') + e.bitis_yil;
        }
      }
      var dotClass = e.devam_ediyor ? 'active' : 'past';
      html += '<div class="pp-item">';
      html += '<div class="pp-item-dot ' + dotClass + '"></div>';
      html += '<div class="pp-item-info">';
      html += '<div class="pp-item-main">' + _escHtml(role) + '</div>';
      html += '<div class="pp-item-sub"><strong style="color:var(--text-secondary);font-weight:600;">' + _escHtml(display) + '</strong>';
      if (e.departman) html += ' · ' + _escHtml(e.departman);
      if (e.istihdam_tipi) html += ' · ' + _escHtml(e.istihdam_tipi);
      html += '</div>';
      html += '</div>';
      if (period) html += '<div class="pp-item-period">' + _escHtml(period) + '</div>';
      html += '</div>';
    });
    html += '</div>';
  } else if (db.no_experience) {
    html += '<div class="pp-section">';
    html += '<div class="pp-section-title">Deneyim</div>';
    html += '<div class="pp-empty">İlk iş deneyimini arıyor</div>';
    html += '</div>';
  }

  if (edus.length > 0 || langs.length > 0 || certs.length > 0) {
    html += '<div class="pp-section">';
    html += '<div class="pp-section-title">Eğitim & Dil</div>';
    edus.forEach(function(e) {
      html += '<div class="pp-item">';
      html += '<div class="pp-item-dot past"></div>';
      html += '<div class="pp-item-info">';
      html += '<div class="pp-item-main">' + _escHtml(e.okul_adi || '') + '</div>';
      html += '<div class="pp-item-sub">';
      if (e.seviye) html += _escHtml(e.seviye);
      if (e.bolum) html += ' · ' + _escHtml(e.bolum);
      html += '</div>';
      html += '</div>';
      if (e.mezuniyet_yili) html += '<div class="pp-item-period">' + _escHtml(e.mezuniyet_yili) + '</div>';
      html += '</div>';
    });
    if (langs.length > 0) {
      html += '<div style="margin-top:8px;">';
      html += '<div class="pp-tags">';
      langs.forEach(function(l) {
        html += '<span class="pp-tag">' + _escHtml(l.dil || '') + (l.seviye ? ' · ' + _escHtml(l.seviye) : '') + '</span>';
      });
      html += '</div></div>';
    }
    if (certs.length > 0) {
      certs.forEach(function(c) {
        html += '<div class="pp-item">';
        html += '<div class="pp-item-dot past"></div>';
        html += '<div class="pp-item-info">';
        html += '<div class="pp-item-main">' + _escHtml(c.egitim_adi || '') + '</div>';
        if (c.kurum) html += '<div class="pp-item-sub">' + _escHtml(c.kurum) + '</div>';
        html += '</div>';
        if (c.yil) html += '<div class="pp-item-period">' + _escHtml(String(c.yil)) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
  }

  if (wp || locs.length > 0) {
    html += '<div class="pp-section">';
    html += '<div class="pp-section-title">Tercihler & Lokasyon</div>';
    var prefTags = [];
    if (wp) {
      if (wp.calisma_tipleri && wp.calisma_tipleri.length > 0) {
        wp.calisma_tipleri.forEach(function(t) { prefTags.push(t); });
      }
      if (wp.musaitlik) prefTags.push(wp.musaitlik);
      if (wp.tercih_segmentler && wp.tercih_segmentler.length > 0) {
        wp.tercih_segmentler.forEach(function(s) { prefTags.push(s); });
      }
    }
    locs.forEach(function(loc) {
      if (loc.sehir) prefTags.push('📍 ' + loc.sehir);
    });
    if (prefTags.length > 0) {
      html += '<div class="pp-tags">';
      prefTags.forEach(function(t) {
        html += '<span class="pp-tag">' + _escHtml(t) + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  if (p.cv_url && p.cv_filename) {
    html += '<div class="pp-section">';
    html += '<div class="pp-section-title">CV</div>';
    html += '<div class="pp-cv-row">';
    html += '<div class="pp-cv-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
    html += '<a class="pp-cv-name pp-cv-link" href="' + _escHtml(p.cv_url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + _escHtml(p.cv_filename) + '</a>';
    if (p.cv_uploaded_at) {
      var d = new Date(p.cv_uploaded_at);
      html += '<div class="pp-cv-date">' + d.toLocaleDateString('tr-TR') + '</div>';
    }
    html += '</div>';
    html += '</div>';
  }

  html += '<div class="pp-section">';
  html += '<div class="pp-section-title">İletişim</div>';
  var email = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : '';
  var maskedEmail = '';
  if (email) {
    var parts = email.split('@');
    if (parts.length === 2) {
      maskedEmail = parts[0].charAt(0) + '****@' + parts[1];
    }
  }
  html += '<div class="pp-contact-row">';
  html += '<div class="pp-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>';
  html += '<div class="pp-contact-text">' + _escHtml(maskedEmail || '\u2014') + '</div>';
  html += '<span class="pp-contact-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Gizli</span>';
  html += '</div>';
  var phone = p.telefon || '';
  var maskedPhone = '';
  if (phone && phone.length >= 6) {
    maskedPhone = phone.substring(0, 3) + ' *** ** ' + phone.substring(phone.length - 2);
  }
  html += '<div class="pp-contact-row">';
  html += '<div class="pp-contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.69 2.36a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.76.33 1.55.56 2.36.69A2 2 0 0 1 22 16.92z"/></svg></div>';
  html += '<div class="pp-contact-text">' + _escHtml(maskedPhone || '\u2014') + '</div>';
  html += '<span class="pp-contact-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Gizli</span>';
  html += '</div>';
  html += '<div style="font-size:10px;color:var(--text-muted);text-align:center;margin-top:10px;padding-top:8px;border-top:1px solid var(--border, #e8e6e3);">İletişim bilgileri işveren tarafından görüntülenebilir</div>';
  html += '</div>';

  var lastUpdated = (p.updated_at) ? new Date(p.updated_at).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR');
  html += '<div class="pp-last-updated">';
  html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  html += 'Son güncelleme: ' + _escHtml(lastUpdated);
  html += '</div>';

  var contentEl = document.getElementById('pp-content');
  var overlayEl = document.getElementById('pp-overlay');
  if (contentEl) contentEl.innerHTML = html;
  if (overlayEl) {
    overlayEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeProfilePreview() {
  var overlayEl = document.getElementById('pp-overlay');
  if (overlayEl) overlayEl.style.display = 'none';
  document.body.style.overflow = '';
}

(function() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var overlay = document.getElementById('pp-overlay');
      if (overlay && overlay.style.display === 'flex') {
        closeProfilePreview();
      }
    }
  });
})();

// ── Toggle Grid: visibility sync + hide row dim ──
function updateHideRowVisibility() {
  var hideRow = document.getElementById('merkez-hide-row');
  var visToggle = document.getElementById('merkez-toggle-visibility');
  if (hideRow && visToggle) {
    hideRow.style.opacity = visToggle.checked ? '1' : '0.35';
    hideRow.style.pointerEvents = visToggle.checked ? 'auto' : 'none';
  }
}

(function initToggleGrid() {
  var visToggle = document.getElementById('merkez-toggle-visibility');
  var visHint = document.getElementById('mk-tg-visibility-hint');
  var activeToggle = document.getElementById('merkez-toggle-active');

  function updateVisHint() {
    if (!visHint) return;
    if (visToggle && !visToggle.checked) {
      visHint.textContent = 'İşverenler profilini ve CV\'ni göremez';
      visHint.style.color = '#ef4444';
    } else {
      visHint.textContent = '';
    }
  }

  if (visToggle && visHint) {
    visToggle.addEventListener('change', function() {
      if (activeToggle) {
        activeToggle.checked = visToggle.checked;
        activeToggle.dispatchEvent(new Event('change'));
      }
      updateVisHint();
      updateHideRowVisibility();
    });
  }

  if (activeToggle && visToggle) {
    activeToggle.addEventListener('change', function() {
      visToggle.checked = activeToggle.checked;
      updateVisHint();
      updateHideRowVisibility();
    });
  }

  updateVisHint();
  updateHideRowVisibility();
})();

