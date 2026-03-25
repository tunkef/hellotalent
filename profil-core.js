/* global HT */
// v20260322d
// ── SUPABASE CLIENT ──
// Use var to avoid Safari SyntaxError: "Can't create duplicate variable that shadows a global property"
// window.supabase is set by the CDN script; const/let would shadow it and crash in Safari.
// Supabase config from shared.js (loaded before this file in profil.html).
// HT.SUPA_URL / HT.SUPA_KEY are the single source of truth.
var SUPABASE_URL = HT.SUPA_URL;
var SUPABASE_KEY = HT.SUPA_KEY;
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// Unify with HT.getSupa() singleton so any code calling HT.getSupa() gets the same client
window._htSupa = supabase;
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
  var isDark = effectiveTheme === 'dark';
  var htmlEl = document.documentElement;
  htmlEl.setAttribute('data-theme', isDark ? 'dark' : 'light');
  var metaTC = document.getElementById('meta-theme-color');
  if (metaTC) metaTC.setAttribute('content', isDark ? '#050712' : '#ffffff');
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

const CALISMA_TIPLERI = ['Tam Zamanl\u0131','Yar\u0131 Zamanl\u0131','Sezonluk','S\u00f6zle\u015fmeli'];

// KIDEM_SEVIYELERI removed (Decision 1 — derived later, not candidate-facing)
// LOKASYON_TIPLERI removed (Decision 3 — implied by department)

const TAKIM_BUYUKLUKLERI = ['Yok','1-5','6-15','16-30','30+'];

const AYRILMA_NEDENLERI = ['Terfi','\u0130stifa','Kariyer Ge\u00e7i\u015fi','\u0130\u015ften \u00c7\u0131kar\u0131lma','Kar\u015f\u0131l\u0131kl\u0131 Fesih','S\u00f6zle\u015fme Bitimi','Belirtmek \u0130stemiyorum'];

const SEKTOR_ROL_MAP = {
  'Ma\u011fazac\u0131l\u0131k / Perakende': {
    'Ma\u011faza Y\u00f6netimi': [
      'Ma\u011faza M\u00fcd\u00fcr\u00fc',
      'Ma\u011faza M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131',
      'Kat M\u00fcd\u00fcr\u00fc',
      'Store Leader (flagship ma\u011fazalar i\u00e7in)'
    ],
    'Sat\u0131\u015f & M\u00fc\u015fteri Deneyimi': [
      'Sat\u0131\u015f Dan\u0131\u015fman\u0131',
      'K\u0131demli Sat\u0131\u015f Dan\u0131\u015fman\u0131',
      'Sat\u0131\u015f Uzman\u0131',
      '\u00dcr\u00fcn Uzman\u0131',
      'Omni-Channel Sat\u0131\u015f Uzman\u0131'
    ],
    'B\u00f6lge & \u00c7ok Ma\u011faza Y\u00f6netimi': [
      'B\u00f6lge M\u00fcd\u00fcr\u00fc',
      'B\u00f6lge Operasyon M\u00fcd\u00fcr\u00fc',
      'B\u00f6lge G\u00f6rsel M\u00fcd\u00fcr\u00fc',
      'B\u00f6lge Sat\u0131\u015f M\u00fcd\u00fcr\u00fc',
      'B\u00f6lge Direkt\u00f6r\u00fc',
      '\u00dclke M\u00fcd\u00fcr\u00fc'
    ],
    'Visual Merchandising': [
      'G\u00f6rsel Sat\u0131\u015f Uzman\u0131 / Visual Merchandiser',
      'VM Koordinat\u00f6r\u00fc',
      'VM M\u00fcd\u00fcr\u00fc',
      'Display Uzman\u0131'
    ],
    'Ma\u011faza Operasyonu': [
      'Kasiyer',
      'Kasa Sorumlusu',
      'Stok Sorumlusu',
      'Envanter Uzman\u0131',
      'Operasyon M\u00fcd\u00fcr\u00fc'
    ],
    'E\u011fitim & Geli\u015fim': [
      'E\u011fitim M\u00fcd\u00fcr\u00fc',
      '\u00dclke E\u011fitim M\u00fcd\u00fcr\u00fc',
      'E\u011fitim Uzman\u0131',
      'Ma\u011faza Ko\u00e7u',
      'Onboarding Uzman\u0131'
    ],
    '\u0130nsan Kaynaklar\u0131': [
      '\u0130K M\u00fcd\u00fcr\u00fc',
      '\u0130K \u0130\u015f Orta\u011f\u0131',
      '\u0130\u015fe Al\u0131m Uzman\u0131',
      '\u0130K Asistan\u0131'
    ],
    'Pazarlama & E-Ticaret': [
      'Pazarlama M\u00fcd\u00fcr\u00fc',
      'E-Ticaret M\u00fcd\u00fcr\u00fc',
      'Sosyal Medya Uzman\u0131',
      'Dijital Pazarlama Uzman\u0131'
    ],
    'M\u00fc\u015fteri Hizmetleri': [
      'M\u00fc\u015fteri Hizmetleri Uzman\u0131',
      'M\u00fc\u015fteri Deneyimi M\u00fcd\u00fcr\u00fc',
      'CRM Uzman\u0131'
    ],
    'Tedarik Zinciri & Lojistik': [
      'Al\u0131c\u0131 / Merchant',
      'Planlama Analisti',
      'Sat\u0131n Alma Uzman\u0131',
      'Lojistik Koordinat\u00f6r\u00fc'
    ]
  },
  'Konaklama & Turizm': {
    '\u00d6n B\u00fcro': [
      'Resepsiyonist',
      '\u00d6n B\u00fcro \u015eefi',
      'Concierge',
      'Rezervasyon Uzman\u0131',
      'Guest Relations Uzman\u0131'
    ],
    'Yiyecek & \u0130\u00e7ecek': [
      'Garson',
      'Kafe/Bar Sorumlusu',
      'F&B M\u00fcd\u00fcr\u00fc',
      'Banket Koordinat\u00f6r\u00fc'
    ],
    'Kat Hizmetleri': [
      'Kat Hizmetleri G\u00f6revlisi',
      'Kat Hizmetleri Amiri',
      'Housekeeping M\u00fcd\u00fcr\u00fc'
    ],
    'Sat\u0131\u015f & Pazarlama': [
      'Sat\u0131\u015f M\u00fcd\u00fcr\u00fc',
      'Revenue Manager',
      'Pazarlama Uzman\u0131'
    ],
    'Otel Y\u00f6netimi': [
      'Otel M\u00fcd\u00fcr\u00fc',
      'Genel M\u00fcd\u00fcr Yard\u0131mc\u0131s\u0131',
      'Operations Manager'
    ]
  },
  'Sa\u011fl\u0131k': {
    'Hasta Hizmetleri': [
      'Hasta Kabul G\u00f6revlisi',
      'Hasta Deneyimi Uzman\u0131',
      '\u00c7a\u011fr\u0131 Merkezi Sa\u011fl\u0131k Dan\u0131\u015fman\u0131'
    ],
    'Medikal Sat\u0131\u015f & Pazarlama': [
      'Medikal Sat\u0131\u015f Temsilcisi',
      '\u00dcr\u00fcn M\u00fcd\u00fcr\u00fc (Medikal)',
      'Marka M\u00fcd\u00fcr\u00fc (Medikal)'
    ],
    'Eczane': [
      'Eczac\u0131',
      'Eczane Teknisyeni',
      'Eczane Sat\u0131\u015f Dan\u0131\u015fman\u0131'
    ],
    'Klinik & Hastane Y\u00f6netimi': [
      'Klinik M\u00fcd\u00fcr\u00fc',
      'Poliklinik Sorumlusu',
      'Sa\u011fl\u0131k Operasyon M\u00fcd\u00fcr\u00fc'
    ]
  },
  'Finans & Bankac\u0131l\u0131k': {
    'M\u00fc\u015fteri \u0130li\u015fkileri': [
      'M\u00fc\u015fteri Temsilcisi',
      '\u015eube Y\u00f6neticisi',
      'Bireysel Bankac\u0131l\u0131k Uzman\u0131',
      'Kurumsal Bankac\u0131l\u0131k Uzman\u0131'
    ],
    'Sat\u0131\u015f': [
      'Sat\u0131\u015f Uzman\u0131 (Bankac\u0131l\u0131k)',
      'Finansal Dan\u0131\u015fman',
      'Sigorta Sat\u0131\u015f Uzman\u0131'
    ],
    'Operasyon': [
      'Veznedar / Teller',
      'Back Office Uzman\u0131',
      'Operasyon M\u00fcd\u00fcr\u00fc'
    ]
  },
  'Havac\u0131l\u0131k': {
    'Kabin Hizmetleri': [
      'Kabin Memuru',
      'K\u0131demli Kabin Memuru',
      'Kabin Amiri / Purser'
    ],
    'Yer Hizmetleri': [
      'Check-in G\u00f6revlisi',
      'Kargo G\u00f6revlisi',
      'Yolcu Hizmetleri Uzman\u0131',
      'Lounge Sorumlusu'
    ],
    'Operasyon': [
      'U\u00e7u\u015f Operasyon Uzman\u0131',
      'U\u00e7u\u015f Planlama Uzman\u0131'
    ]
  },
  'G\u0131da & \u0130\u00e7ecek': {
    'Servis': [
      'Garson',
      'Barista',
      'Kafe Sorumlusu',
      'Restoran M\u00fcd\u00fcr\u00fc'
    ],
    'Mutfak': [
      'A\u015f\u00e7\u0131',
      'Pastane Uzman\u0131',
      'Mutfak \u015eefi'
    ],
    'Zincir & Franchise Y\u00f6netimi': [
      'B\u00f6lge M\u00fcd\u00fcr\u00fc (F&B)',
      'Franchise Koordinat\u00f6r\u00fc',
      'Operasyon M\u00fcd\u00fcr\u00fc (F&B)'
    ]
  },
  'Di\u011fer': {
    'Di\u011fer': []
  }
};

const ROL_AILELERI = Object.keys(SEKTOR_ROL_MAP['Ma\u011fazac\u0131l\u0131k / Perakende']);

const MUSAITLIK_SECENEKLERI = ['Hemen','2 Hafta \u0130\u00e7inde','1 Ay \u0130\u00e7inde','2+ Ay \u0130\u00e7inde'];

// Career type options — single-select, 2 options (lider removed; collapses into yukari)
var CAREER_TYPE_OPTIONS = [
  {value: 'yukari', label: 'Yukar\u0131 Terfi'},
  {value: 'yatay', label: 'Yatay Ge\u00e7i\u015f'}
];
var CAREER_TYPE_ORDER = ['yukari','yatay'];
var selectedCareerTypes = [];

// Career type DB key → Turkish display label (for preview/surfaces)
var CAREER_TYPE_LABELS = { yukari: 'Yukar\u0131 Terfi', yatay: 'Yatay Ge\u00e7i\u015f' };

// Flat retail position catalog from SEKTOR_ROL_MAP (Mağazacılık / Perakende only).
// Used by Step 4 target-role dropdown. Built once at parse time.
var RETAIL_POSITIONS = [];
var POSITION_TO_FAMILY = {}; // rol_unvani → rol_ailesi reverse lookup
(function() {
  var retail = SEKTOR_ROL_MAP['Ma\u011fazac\u0131l\u0131k / Perakende'];
  if (!retail) return;
  Object.keys(retail).forEach(function(family) {
    (retail[family] || []).forEach(function(title) {
      RETAIL_POSITIONS.push(title);
      POSITION_TO_FAMILY[title] = family;
    });
  });
  RETAIL_POSITIONS.sort(function(a, b) { return trLower(a).localeCompare(trLower(b), 'tr'); });
})();

const MAAS_ARALIKLARI = ['','25000-30000','30000-35000','35000-45000','45000-60000','60000-80000','80000-100000','100000-150000','150000+'];

const DIL_LISTESI = ['T\u00fcrk\u00e7e','\u0130ngilizce','Almanca','Frans\u0131zca','\u0130spanyolca','\u0130talyanca','Rus\u00e7a','Arap\u00e7a','\u00c7ince (Mandarin)','Japonca','Korece','Portekizce','Hollandaca','Leh\u00e7e','Ukraynaca','Fars\u00e7a','K\u00fcrt\u00e7e','Bulgar\u0131ca','Rumence','Macarca','\u00c7ek\u00e7e','\u0130sve\u00e7\u00e7e','Danca','Fince','Norve\u00e7\u00e7e','Yunanca','S\u0131rp\u00e7a','H\u0131rvat\u00e7a','Bo\u015fnak\u00e7a','G\u00fcrce','Arnavut\u00e7a','Di\u011fer'];

const DIL_SEVIYELERI = ['A1 - Ba\u015flang\u0131\u00e7','A2 - Temel','B1 - Orta Alt\u0131','B2 - Orta','C1 - \u0130leri','C2 - \u00dcst \u0130leri','Anadil'];

