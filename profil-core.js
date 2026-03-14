// ── SUPABASE CLIENT ──
// Use var to avoid Safari SyntaxError: "Can't create duplicate variable that shadows a global property"
// window.supabase is set by the CDN script; const/let would shadow it and crash in Safari.
// Supabase config — single source: shared.js HT_SUPA_URL / HT_SUPA_KEY
// These pages create their own client because they need auth before shared.js header injection.
// If URL/KEY change, update shared.js AND these 3 files: profil.html, ik.html, giris.html
var SUPABASE_URL = 'https://cpwibefquojehjehtrog.supabase.co';
var SUPABASE_KEY = 'sb_publishable_POUtNwJyjAAheukwYP5hmA_TKKjphwa';
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
var currentUser = null;

// Single auth boot: one getSession() for the whole page to avoid Sentry AbortError (racing getSession calls).
window._htAuthSessionPromise = supabase.auth.getSession();
function getProfilAuthSession() { return window._htAuthSessionPromise; }
function syncAccountEmail() {
  if (!currentUser) return;
  var email = currentUser.email || '';
  var f = document.getElementById('f-email');
  if (f) f.value = email;
  var s = document.getElementById('settings-email');
  if (s) s.value = email;
}
var _loadedDBData = null; // Stores loaded DB data for post-init re-apply

// ── STORAGE CONSTANTS ──
// Single source of truth for Supabase Storage bucket / path conventions.
var STORAGE = {
  BUCKET: 'cvs',
  AVATAR_PREFIX: 'avatars/',
  avatarPath: function(uid, ext) { return 'avatars/' + uid + '.' + ext; },
  cvPath: function(uid, filename) { return uid + '/' + Date.now() + '_' + filename; },
  extractStoragePath: function(publicUrl) {
    var marker = '/' + STORAGE.BUCKET + '/';
    var idx = publicUrl.lastIndexOf(marker);
    return idx !== -1 ? publicUrl.substring(idx + marker.length) : null;
  }
};

// ── THEME PREFERENCES (profil.html only) ──
var THEME_STORAGE_KEY = 'ht_theme_preference';

function resolveSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyResolvedTheme(effectiveTheme) {
  var htmlEl = document.documentElement;
  htmlEl.setAttribute('data-theme', effectiveTheme === 'dark' ? 'dark' : 'light');
}

function applyThemeFromPreference(pref) {
  var mode = pref || 'system';
  if (mode === 'light' || mode === 'dark') {
    applyResolvedTheme(mode);
  } else {
    applyResolvedTheme(resolveSystemTheme());
  }
}

function initThemeFromStorage() {
  try {
    var stored = localStorage.getItem(THEME_STORAGE_KEY);
    applyThemeFromPreference(stored || 'system');

    // Keep in sync with system only when using system default
    if (!stored || stored === 'system') {
      if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq && typeof mq.addEventListener === 'function') {
          mq.addEventListener('change', function() {
            applyThemeFromPreference('system');
          });
        }
      }
    }
  } catch (e) {
    applyThemeFromPreference('system');
  }
}

function setThemePreference(pref) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch (e) {}
  applyThemeFromPreference(pref);
}

// ── HELPER: Turkish lowercase ──
function trLower(s) {
  return s.replace(/\u0130/g,'i').replace(/I/g,'\u0131')
    .replace(/\u015e/g,'\u015f').replace(/\u00c7/g,'\u00e7')
    .replace(/\u00d6/g,'\u00f6').replace(/\u00dc/g,'\u00fc')
    .replace(/\u011e/g,'\u011f').toLowerCase();
}

// ── NORMALIZATION UTILITIES ──
// Display-only helpers. Never mutate DB payloads directly.

// Trim + collapse repeated whitespace
function normalizeText(s) {
  if (!s) return '';
  return s.trim().replace(/\s+/g, ' ');
}

// Turkish-aware title case for short structured inputs
// Preserves known acronyms (LVMH, H&M, etc.)
var PRESERVE_CASE = ['LVMH','H&M','COS','YSL','MNG','LC','VM','CEO','CFO','COO','HR','IT','AVM','TL'];
function titleCaseTR(s) {
  if (!s) return '';
  var cleaned = normalizeText(s);
  return cleaned.split(' ').map(function(word) {
    var upper = word.toUpperCase();
    // Preserve known acronyms
    if (PRESERVE_CASE.indexOf(upper) !== -1) return upper;
    // Preserve words with mixed internal structure like & or -
    if (word.length <= 1) return word.toUpperCase();
    // Turkish-aware first letter uppercase
    var first = word.charAt(0);
    // Turkish special: i -> İ, ı -> I
    if (first === 'i') first = '\u0130';
    else if (first === '\u0131') first = 'I';
    else if (first === '\u00f6') first = '\u00d6';
    else if (first === '\u00fc') first = '\u00dc';
    else if (first === '\u015f') first = '\u015e';
    else if (first === '\u00e7') first = '\u00c7';
    else if (first === '\u011f') first = '\u011e';
    else first = first.toUpperCase();
    return first + trLower(word.substring(1));
  }).join(' ');
}

// Clean display text: normalize + title case
function normalizeForDisplay(s) {
  return titleCaseTR(s);
}

// ── ROLE CANONICALIZATION ──
// Maps lowercase/ascii variants to {display, canonical}
// canonical = the recruiter-facing standard Turkish role name
var ROLE_SYNONYMS = {
  // Mağaza Müdürü
  'store manager': {display: 'Store Manager', canonical: 'Ma\u011faza M\u00fcd\u00fcr\u00fc'},
  'magaza muduru': {display: 'Ma\u011faza M\u00fcd\u00fcr\u00fc', canonical: 'Ma\u011faza M\u00fcd\u00fcr\u00fc'},
  'ma\u011faza m\u00fcd\u00fcr\u00fc': {display: 'Ma\u011faza M\u00fcd\u00fcr\u00fc', canonical: 'Ma\u011faza M\u00fcd\u00fcr\u00fc'},
  // Mağaza Müdür Yardımcısı
  'assistant store manager': {display: 'Assistant Store Manager', canonical: 'Ma\u011faza M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131'},
  'magaza mudur yardimcisi': {display: 'Ma\u011faza M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131', canonical: 'Ma\u011faza M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131'},
  'ma\u011faza m\u00fcd\u00fcr yard\u0131mc\u0131s\u0131': {display: 'Ma\u011faza M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131', canonical: 'Ma\u011faza M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131'},
  // Satış Danışmanı
  'sales associate': {display: 'Sales Associate', canonical: 'Sat\u0131\u015f Dan\u0131\u015fman\u0131'},
  'sales advisor': {display: 'Sales Advisor', canonical: 'Sat\u0131\u015f Dan\u0131\u015fman\u0131'},
  'satis danismani': {display: 'Sat\u0131\u015f Dan\u0131\u015fman\u0131', canonical: 'Sat\u0131\u015f Dan\u0131\u015fman\u0131'},
  'sat\u0131\u015f dan\u0131\u015fman\u0131': {display: 'Sat\u0131\u015f Dan\u0131\u015fman\u0131', canonical: 'Sat\u0131\u015f Dan\u0131\u015fman\u0131'},
  // Bölge Müdürü
  'area manager': {display: 'Area Manager', canonical: 'B\u00f6lge M\u00fcd\u00fcr\u00fc'},
  'regional manager': {display: 'Regional Manager', canonical: 'B\u00f6lge M\u00fcd\u00fcr\u00fc'},
  'bolge muduru': {display: 'B\u00f6lge M\u00fcd\u00fcr\u00fc', canonical: 'B\u00f6lge M\u00fcd\u00fcr\u00fc'},
  'b\u00f6lge m\u00fcd\u00fcr\u00fc': {display: 'B\u00f6lge M\u00fcd\u00fcr\u00fc', canonical: 'B\u00f6lge M\u00fcd\u00fcr\u00fc'},
  // Kasiyer
  'cashier': {display: 'Cashier', canonical: 'Kasiyer'},
  'kasiyer': {display: 'Kasiyer', canonical: 'Kasiyer'},
  // Visual Merchandiser
  'visual merchandiser': {display: 'Visual Merchandiser', canonical: 'Visual Merchandiser'},
  'vm': {display: 'Visual Merchandiser', canonical: 'Visual Merchandiser'},
  // Depocu / Stok
  'stock associate': {display: 'Stock Associate', canonical: 'Depo Sorumlusu'},
  'depo sorumlusu': {display: 'Depo Sorumlusu', canonical: 'Depo Sorumlusu'},
  'depocu': {display: 'Depocu', canonical: 'Depo Sorumlusu'},
  // Genel Müdür
  'general manager': {display: 'General Manager', canonical: 'Genel M\u00fcd\u00fcr'},
  'genel mudur': {display: 'Genel M\u00fcd\u00fcr', canonical: 'Genel M\u00fcd\u00fcr'},
  'genel m\u00fcd\u00fcr': {display: 'Genel M\u00fcd\u00fcr', canonical: 'Genel M\u00fcd\u00fcr'}
};

// Lookup: returns {display, canonical} or null if no match
function canonicalizeRole(raw) {
  if (!raw) return null;
  var key = trLower(normalizeText(raw));
  return ROLE_SYNONYMS[key] || null;
}

// ── HELPER: get value ──
function val(id) {
  var el = document.getElementById(id);
  if (!el) return '';
  return (el.tagName === 'SELECT') ? el.value : el.value.trim();
}
function nullIfEmpty(v) {
  return (v === '' || v === undefined) ? null : v;
}

// ═══════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════

const AY_ISIMLERI = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];

const EGITIM_SEVIYELERI = ['\u0130lkokul','Ortaokul','Lise','\u00d6n Lisans','Lisans','Y\u00fcksek Lisans','Doktora'];

const DEPARTMANLAR = ['Ma\u011faza','B\u00f6lge Y\u00f6netimi','Genel Merkez','Visual Merchandising','Operasyon','\u0130nsan Kaynaklar\u0131','E\u011fitim','Pazarlama','E-Ticaret','Di\u011fer'];

const SEGMENTLER = ['L\u00fcks','Premium','Orta Segment','Fast Fashion','Spor','Teknoloji','Kozmetik','Otomotiv','G\u0131da / Market','Ev / Ya\u015fam','Di\u011fer'];

const ISTIHDAM_TIPLERI = ['Tam Zamanl\u0131','Yar\u0131 Zamanl\u0131','Sezonluk','Stajyer','S\u00f6zle\u015fmeli'];

// KIDEM_SEVIYELERI removed (Decision 1 — derived later, not candidate-facing)
// LOKASYON_TIPLERI removed (Decision 3 — implied by department)

const TAKIM_BUYUKLUKLERI = ['Yok','1-5','6-15','16-30','30+'];

const AYRILMA_NEDENLERI = ['Terfi','\u0130stifa','Kariyer Ge\u00e7i\u015fi','\u0130\u015ften \u00c7\u0131kar\u0131lma','Kar\u015f\u0131l\u0131kl\u0131 Fesih','S\u00f6zle\u015fme Bitimi','Belirtmek \u0130stemiyorum'];

const ROL_AILELERI = ['Sat\u0131\u015f','Ma\u011faza Y\u00f6netimi','B\u00f6lge Y\u00f6netimi','Visual Merchandising','Operasyon','\u0130nsan Kaynaklar\u0131','Pazarlama / E-Ticaret'];

const MUSAITLIK_SECENEKLERI = ['Hemen','2 Hafta \u0130\u00e7inde','1 Ay \u0130\u00e7inde','2+ Ay \u0130\u00e7inde'];

// Career type options in canonical order (for consistent DB storage)
var CAREER_TYPE_OPTIONS = [
  {value: 'yukari', label: 'Yukari (Terfi)'},
  {value: 'yatay', label: 'Yatay (Farkli Alan)'},
  {value: 'lider', label: 'Liderlik'}
];
var CAREER_TYPE_ORDER = ['yukari','yatay','lider'];
var selectedCareerTypes = [];

const MAAS_ARALIKLARI = ['','25000-30000','30000-35000','35000-45000','45000-60000','60000-80000','80000-100000','100000-150000','150000+'];

const DIL_LISTESI = ['T\u00fcrk\u00e7e','\u0130ngilizce','Almanca','Frans\u0131zca','\u0130spanyolca','\u0130talyanca','Rus\u00e7a','Arap\u00e7a','\u00c7ince (Mandarin)','Japonca','Korece','Portekizce','Hollandaca','Leh\u00e7e','Ukraynaca','Fars\u00e7a','K\u00fcrt\u00e7e','Bulgar\u0131ca','Rumence','Macarca','\u00c7ek\u00e7e','\u0130sve\u00e7\u00e7e','Danca','Fince','Norve\u00e7\u00e7e','Yunanca','S\u0131rp\u00e7a','H\u0131rvat\u00e7a','Bo\u015fnak\u00e7a','G\u00fcrce','Arnavut\u00e7a','Di\u011fer'];

const DIL_SEVIYELERI = ['A1 - Ba\u015flang\u0131\u00e7','A2 - Temel','B1 - Orta Alt\u0131','B2 - Orta','C1 - \u0130leri','C2 - \u00dcst \u0130leri','Anadil'];
