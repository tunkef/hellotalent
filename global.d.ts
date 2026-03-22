/**
 * global.d.ts — Type declarations for hellotalent.ai vanilla JS project
 *
 * Bu dosya VS Code / Cursor'un JS dosyalarinda tip kontrolu yapabilmesi
 * icin gerekli cross-file global tanimlari icerir.
 *
 * Kullanim: Herhangi bir .js dosyasinin basina `// @ts-check` ekleyerek
 * o dosya icin TypeScript tip kontrolunu aktif edebilirsiniz.
 *
 * Ornek:
 *   // @ts-check
 *   var user = currentUser;  // TS bunu artik taniyor
 */

/* ═══════════════════════════════════════════════
   CDN / External Library Globals
   ═══════════════════════════════════════════════ */

/** Supabase JS Client CDN — window.supabase nesnesinden createClient ile olusturulur */
declare var supabase: any;

/** jsPDF CDN */
declare var jspdf: any;
declare var jsPDF: any;

/** Sentry CDN */
declare var Sentry: any;

/* ═══════════════════════════════════════════════
   profil-core.js — Auth, Supabase client, utils
   ═══════════════════════════════════════════════ */

/** Authenticated Supabase user object (set after getSession) */
declare var currentUser: any;

/** Cached DB profile data (loaded once, re-applied after saves) */
declare var _loadedDBData: any;

/** Supabase Storage path constants */
declare var STORAGE: {
  BUCKET: string;
  AVATAR_PREFIX: string;
  avatarPath(uid: string, ext: string): string;
  cvPath(uid: string, filename: string): string;
  extractStoragePath(publicUrl: string): string | null;
};

/** Get the value of a form field by element ID */
declare function val(id: string): string;

/** Return null if value is empty string, otherwise the value */
declare function nullIfEmpty(v: string | null): string | null;

/** Turkish-safe lowercase: I → ı, İ → i */
declare function trLower(s: string): string;

/** Turkish-safe title case (preserves LVMH, H&M, etc.) */
declare function titleCaseTR(s: string): string;

/** Normalize text for display (trims, collapses whitespace) */
declare function normalizeForDisplay(s: string): string;

/** Canonicalize a role string using ROLE_SYNONYMS */
declare function canonicalizeRole(raw: string): string;

/** Set theme preference in localStorage and apply */
declare function setThemePreference(pref: string): void;

/** Sync account email to UI fields */
declare function syncAccountEmail(): void;

/** Career type options array */
declare var CAREER_TYPE_OPTIONS: Array<{ value: string; label: string }>;
declare var CAREER_TYPE_ORDER: string[];
declare var selectedCareerTypes: string[];

/* ═══════════════════════════════════════════════
   profil-data.js — Constants, lookup tables
   ═══════════════════════════════════════════════ */

declare var TUR_ILLER: Record<string, string[]>;
declare var ILCELER: Record<string, string[]>;
declare var SEGMENTLER: string[];
declare var DIL_LISTESI: string[];
declare var DIL_SEVIYELERI: string[];
declare var EGITIM_SEVIYELERI: string[];
declare var CALISMA_TIPLERI: string[];
declare var ISTIHDAM_TIPLERI: string[];
declare var MUSAITLIK_SECENEKLERI: string[];
declare var MAAS_ARALIKLARI: string[];
declare var AY_ISIMLERI: string[];
declare var AYRILMA_NEDENLERI: string[];
declare var TAKIM_BUYUKLUKLERI: string[];
declare var SEKTOR_ROL_MAP: Record<string, string[]>;
declare var ROL_AILELERI: Record<string, string[]>;
declare var BRAND_DB: any[];
declare var BOLUM_DB: string[];
declare var UNIVERSITE_DB: string[];

/* ═══════════════════════════════════════════════
   profil-ui.js — UI functions, wizard, dashboard
   ═══════════════════════════════════════════════ */

/** Switch active panel in profil.html sidebar navigation */
declare function switchPanel(name: string, navEl?: HTMLElement): void;

/** Internal panel switch reference (used by yetkinlik.js) */
declare var _doSwitchPanel: ((name: string) => void) | undefined;

/** Refresh visibility summary cards after settings change */
declare function refreshVisibilitySummary(): void;

/** Refresh profile after settings panel save */
declare function refreshAfterSettingsSave(): void;

/** Track whether the wizard has unsaved changes */
declare var wizardDirty: boolean;
declare function markWizardDirty(): void;
declare function clearDraft(): void;

/** Apply visibility mirrors from profile data */
declare function applyAllVisibilityMirrorsFromProfile(): void;

/** Get current employer display string from experiences array */
declare function getCurrentEmployerDisplayFromExperiences(exp: any[], dbData: any): string;

/** Update Merkez panel visibility state */
declare function updateMerkezVisState(): void;

/** Analytics tracking function */
declare function ht_track(event: string, props?: Record<string, any>): void;

/** Sync settings toggles */
declare function syncBeniOner(newValue: boolean, source?: string): void;
declare function syncHideFromEmployer(newValue: boolean, source?: string): void;
declare function syncActivelyLooking(newValue: boolean, source?: string): void;

/* ═══════════════════════════════════════════════
   ik.html — Employer-side globals
   ═══════════════════════════════════════════════ */

/** HR profile data object (loaded in ik.html) */
declare var hrProfile: any;

/* ═══════════════════════════════════════════════
   Window extensions — _ht* pattern
   ═══════════════════════════════════════════════ */

interface Window {
  _htAuthSessionPromise: Promise<any>;
  _htSupa: any;
  _htAdminSupa: any;
  _htAdminUser: any;
  _htAdminLoadCoachContent: (() => void) | undefined;
  _htLoadYetkinlik: (() => void) | undefined;
  _htLoadMulakat: (() => void) | undefined;
  _htYetkinlikData: any;
  HT: Record<string, any>;
  toggleLoginDropdown: (() => void) | undefined;
  toggleMobileMenu: (() => void) | undefined;
}
