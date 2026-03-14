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
}

// ═══════════════════════════════════════════════════
// TASK 12: DATA LOAD FROM NORMALIZED TABLES
// ═══════════════════════════════════════════════════

async function loadProfileFromDB() {
  if (!currentUser) { console.warn('[HT] loadProfileFromDB: no currentUser'); return null; }

  // Ensure we have a fresh token before querying
  var refreshRes = await supabase.auth.getSession();
  if (!refreshRes.data.session) {
    console.warn('[HT] loadProfileFromDB: session expired after refresh attempt');
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
      hide_from_current_employer: cand.hide_from_current_employer === true
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
      hintDiv.className = 'm-stat-hint-active';
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
  if (gPctText) gPctText.textContent = pct + '% tamamlandı';

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
// ŞIRKETLER PANEL — Phase A (companies + brands + follows)
// ═══════════════════════════════════════════════════════════════

var _ht_brands = null;          // Array of brand objects with nested company
var _ht_follows = new Set();    // Set of followed company_id values
var _ht_sirketler_loaded = false; // Prevents re-fetch on repeated panel switches
var _ht_candidate_id = null;    // Cached candidate ID for follow queries

// Letter-avatar color palette (deterministic by first char)
var _AVATAR_COLORS = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22','#34495E','#16A085','#C0392B'];

function _avatarColor(name) {
  var code = (name || '?').charCodeAt(0);
  return _AVATAR_COLORS[code % _AVATAR_COLORS.length];
}

async function loadSirketlerPanel() {
  if (_ht_sirketler_loaded) return;
  _ht_sirketler_loaded = true;

  // Get candidate ID (needed for follows query)
  if (!_ht_candidate_id && currentUser) {
    var cr = await supabase.from('candidates').select('id').eq('user_id', currentUser.id).single();
    if (cr.data) _ht_candidate_id = cr.data.id;
  }

  // Fetch brands (with nested company) and follows
  var brandsRes = await supabase.from('brands').select('id, brand_name, slug, logo_url, company_id, companies(id, company_name, slug, logo_url)');
  var followsRes = _ht_candidate_id
    ? await supabase.from('candidate_company_follows').select('company_id').eq('candidate_id', _ht_candidate_id)
    : { data: [] };

  if (brandsRes.error) {
    console.warn('[HT] loadSirketlerPanel: brands query failed', brandsRes.error);
    document.getElementById('sirket-list').innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:13px;">Veriler yuklenemedi.</div>';
    _ht_sirketler_loaded = false; // Allow retry
    return;
  }

  _ht_brands = (brandsRes.data || []).sort(function(a, b) {
    return trLower(a.brand_name).localeCompare(trLower(b.brand_name), 'tr');
  });
  _ht_follows = new Set((followsRes.data || []).map(function(f) { return f.company_id; }));

  renderSirketList('');
  renderSirketFollowChips();

  // Wire search input
  var searchInput = document.getElementById('sirket-search');
  searchInput.addEventListener('input', function() {
    renderSirketList(searchInput.value);
  });
}

function renderSirketList(query) {
  var container = document.getElementById('sirket-list');
  if (!_ht_brands) { container.innerHTML = ''; return; }

  var q = trLower(query.trim());
  var filtered = q ? _ht_brands.filter(function(b) {
    var brandName = trLower(b.brand_name);
    var companyName = b.companies ? trLower(b.companies.company_name) : '';
    return brandName.indexOf(q) !== -1 || companyName.indexOf(q) !== -1;
  }) : _ht_brands;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:13px;">' +
      (q ? 'Sonuç bulunamadı.' : 'Henüz şirket verisi yok.') + '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var b = filtered[i];
    var co = b.companies || {};
    var isFollowed = _ht_follows.has(b.company_id);
    var initial = (b.brand_name || '?').charAt(0).toUpperCase();
    var color = _avatarColor(b.brand_name);

    // Secondary text: parent company name if different from brand
    var sub = '';
    if (co.company_name && co.company_name !== b.brand_name) {
      sub = co.company_name;
    }

    var btnAttr = _ht_candidate_id ? 'onclick="toggleSirketFollow(' + b.company_id + ',this)" style="cursor:pointer;' : 'style="cursor:default;';

    html += '<div class="sirket-row" data-company-id="' + b.company_id + '" data-brand-id="' + b.id + '" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);color:var(--text-primary);">' +
      '<div style="width:36px;height:36px;border-radius:8px;background:' + color + ';color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;">' + initial + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _escHtml(b.brand_name) + '</div>' +
        (sub ? '<div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _escHtml(sub) + '</div>' : '') +
      '</div>' +
      '<div style="flex-shrink:0;">' +
        (isFollowed
          ? '<span class="sirket-follow-btn" ' + btnAttr + 'font-size:12px;color:var(--verm);font-weight:600;padding:4px 10px;background:var(--verm-light);border-radius:6px;">Takipte</span>'
          : '<span class="sirket-follow-btn" ' + btnAttr + 'font-size:12px;color:var(--muted);padding:4px 10px;border:1px solid var(--border);border-radius:6px;">Takip Et</span>') +
      '</div>' +
    '</div>';
  }
  container.innerHTML = html;
}

function renderSirketFollowChips() {
  var card = document.getElementById('sirket-follows-card');
  var chips = document.getElementById('sirket-follows-chips');
  var countEl = document.getElementById('sirket-follows-count');

  if (!_ht_brands || _ht_follows.size === 0) {
    card.style.display = 'none';
    return;
  }

  // Find brand names for followed companies (pick first brand per company for display)
  var followedBrands = [];
  var seenCompanies = new Set();
  for (var i = 0; i < _ht_brands.length; i++) {
    var b = _ht_brands[i];
    if (_ht_follows.has(b.company_id) && !seenCompanies.has(b.company_id)) {
      seenCompanies.add(b.company_id);
      followedBrands.push(b);
    }
  }

  countEl.textContent = '(' + followedBrands.length + ')';
  var html = '';
  for (var j = 0; j < followedBrands.length; j++) {
    var fb = followedBrands[j];
    var chipLabel = (fb.companies && fb.companies.company_name) ? fb.companies.company_name : fb.brand_name;
    var initial = (chipLabel || '?').charAt(0).toUpperCase();
    var color = _avatarColor(chipLabel);
    html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:var(--gray);border-radius:8px;font-size:13px;font-weight:500;">' +
      '<span style="width:20px;height:20px;border-radius:5px;background:' + color + ';color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">' + initial + '</span>' +
      _escHtml(chipLabel) +
    '</div>';
  }
  chips.innerHTML = html;
  card.style.display = '';

  // Update dash card follow count badge
  var badge = document.getElementById('sirket-follow-count');
  if (badge) {
    var span = badge.querySelector('.badge-count');
    if (followedBrands.length > 0) {
      span.textContent = followedBrands.length + ' takip';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
}

var _ht_follow_busy = false; // Prevents double-click during async toggle

async function toggleSirketFollow(companyId, btnEl) {
  if (_ht_follow_busy || !_ht_candidate_id) return;
  _ht_follow_busy = true;

  var wasFollowed = _ht_follows.has(companyId);

  // Optimistic update
  if (wasFollowed) {
    _ht_follows.delete(companyId);
  } else {
    _ht_follows.add(companyId);
  }
  var searchVal = document.getElementById('sirket-search').value;
  renderSirketList(searchVal);
  renderSirketFollowChips();

  // Persist to DB
  var res;
  if (wasFollowed) {
    res = await supabase.from('candidate_company_follows')
      .delete().eq('candidate_id', _ht_candidate_id).eq('company_id', companyId);
  } else {
    res = await supabase.from('candidate_company_follows')
      .insert({ candidate_id: _ht_candidate_id, company_id: companyId });
  }

  if (res.error) {
    console.warn('[HT] toggleSirketFollow: failed', res.error);
    // Revert optimistic update
    if (wasFollowed) {
      _ht_follows.add(companyId);
    } else {
      _ht_follows.delete(companyId);
    }
    renderSirketList(searchVal);
    renderSirketFollowChips();
    // Show brief error toast
    _showSirketToast('Bir hata olustu. Tekrar deneyin.');
  }

  _ht_follow_busy = false;
}

function _showSirketToast(msg) {
  var existing = document.getElementById('sirket-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'sirket-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:white;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.style.opacity = '1'; });
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

function _escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

