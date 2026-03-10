# Phase 3: Clean Rewrite — Wizard Profile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `profil-v2.html` — a clean, 5-step wizard profile page that writes to the normalized schema via `save_candidate_profile` RPC.

**Architecture:** Single HTML file (`profil-v2.html`) with inline `<style>`, body HTML, and `<script>`. Reuses `shared.css` + `shared.js`. Zero dependencies on old `profil.html`. localStorage draft on each step forward; single RPC call on final completion.

**Tech Stack:** HTML/CSS/JS (no build system), Supabase JS Client v2, jsPDF for CV generation.

---

## File Structure

| File | Action |
|---|---|
| `profil-v2.html` | **CREATE** — full clean rewrite (~3000-4000 lines) |
| `profil.html` | UNTOUCHED — backward compatible |
| `shared.css` | REUSED — site-wide header/nav styles |
| `shared.js` | REUSED — header/footer injection |

## Main Components / Sections Inside `profil-v2.html`

```
<head>
  Gate check, fonts, Supabase client, jsPDF CDN
</head>
<style>
  All CSS: design tokens, wizard progress bar, form fields,
  cards, chips, autocomplete, modals, dashboard, responsive
</style>
<body>
  +-- Dashboard shell (header, sidebar, bottom nav)
  +-- Loading screen
  +-- Dashboard panels:
  |   +-- Genel Bakis (summary card, completion %, quick actions)
  |   +-- Profil (wizard container -- 5 steps)
  |   +-- CV panel (generated PDF)
  |   +-- Ayarlar panel
  +-- Wizard container:
  |   +-- Progress bar (5 steps visual)
  |   +-- Step 1: Kisisel Bilgiler
  |   +-- Step 2: Kariyer / Deneyimler
  |   +-- Step 3: Egitim + Diller + Sertifikalar
  |   +-- Step 4: Tercihlerim
  |   +-- Step 5: Lokasyon Tercihleri
  |   +-- Wizard nav (Geri / Ileri / Tamamla)
  +-- Modals (location selection, success, error)
</body>
<script>
  +-- Supabase client init
  +-- Reference data (BRAND_DB, TUR_ILLER, ILCELER, UNIVERSITE_DB, BOLUM_DB, DIL_LISTESI)
  +-- Wizard state machine (step nav, validation per step)
  +-- Dynamic row managers (experiences, education, languages, certificates)
  +-- Autocomplete (brand, university, department)
  +-- localStorage draft system (save/load/clear)
  +-- Data load from normalized tables (returning users)
  +-- Final save via RPC
  +-- Dashboard sync + profile summary
  +-- CV generation (jsPDF)
  +-- Auth + bootstrap
</script>
```

## Local Draft Data Shape

```json
{
  "step": 2,
  "timestamp": "2026-03-10T14:30:00.000Z",
  "profile": {
    "full_name": "Ayse Yilmaz",
    "telefon": "05551234567",
    "cinsiyet": "Kadin",
    "dogum_yili": "1995",
    "adres_il": "Istanbul",
    "adres_ilce": "Kadikoy",
    "linkedin": "https://linkedin.com/in/ayse",
    "engel_durumu": "Yok",
    "askerlik_durumu": ""
  },
  "experiences": [
    {
      "sirket": "Zara",
      "marka": "Zara",
      "pozisyon": "Magaza Muduru",
      "departman": "Magaza",
      "segment": "Fast Fashion",
      "istihdam_tipi": "Tam Zamanli",
      "kidem_seviyesi": "Yonetici",
      "lokasyon_tipi": "Magaza",
      "sehir": "Istanbul",
      "takim_buyuklugu": "6-15",
      "baslangic_ay": 3,
      "baslangic_yil": 2020,
      "bitis_ay": 0,
      "bitis_yil": 0,
      "devam_ediyor": true,
      "ayrilma_nedeni": "",
      "basari_ozeti": ""
    }
  ],
  "education": [
    {
      "egitim_seviye": "Lisans",
      "okul": "Istanbul Universitesi",
      "bolum": "Isletme",
      "mezun_yil": 2017
    }
  ],
  "certificates": [
    {
      "egitim_adi": "Perakende Yonetimi",
      "kurum": "IGD",
      "yil": 2022
    }
  ],
  "languages": [
    { "dil": "Turkce", "seviye": "Anadil" },
    { "dil": "Ingilizce", "seviye": "B2 - Orta" }
  ],
  "target_roles": [
    { "rol_ailesi": "Magaza Yonetimi", "rol_unvani": "Bolge Muduru" }
  ],
  "work_prefs": {
    "musaitlik": "Hemen",
    "maas_beklenti": "35000-45000",
    "calisma_tipleri": ["Tam Zamanli"],
    "segmentler": ["Fast Fashion", "Premium"],
    "career_goal": "Bolge Muduru",
    "career_type": "yukari"
  },
  "brand_interests": ["Zara", "H&M", "Mango"],
  "locations": [
    {
      "sehir": "Istanbul",
      "ilceler": ["Kadikoy", "Besiktas", "Sisli"]
    },
    {
      "sehir": "Ankara",
      "ilceler": []
    }
  ]
}
```

## Final RPC Payload Shape

The `save_candidate_profile` RPC accepts 9 JSONB parameters. The wizard assembles them from the draft:

```javascript
const result = await supabase.rpc('save_candidate_profile', {
  p_profile: {
    full_name, email, telefon, cinsiyet, dogum_yili,
    adres_il, adres_ilce, linkedin, engel_durumu,
    askerlik_durumu, is_active: true, ilk_deneyim: false,
    profile_completed: true
  },
  p_experiences: [
    { sirket, marka, pozisyon, departman, segment,
      istihdam_tipi, kidem_seviyesi, lokasyon_tipi,
      sehir, takim_buyuklugu, basari_ozeti,
      baslangic_ay, baslangic_yil, bitis_ay, bitis_yil,
      devam_ediyor, ayrilma_nedeni }
  ],
  p_education: [
    { egitim_seviye, okul, bolum, mezun_yil }
  ],
  p_certificates: [
    { egitim_adi, kurum, yil }
  ],
  p_languages: [
    { dil, seviye }
  ],
  p_target_roles: [
    { rol_ailesi, rol_unvani }
  ],
  p_work_prefs: {
    musaitlik, maas_beklenti,
    calisma_tipleri: ['Tam Zamanli'],
    segmentler: ['Fast Fashion'],
    career_goal, career_type
  },
  p_brand_interests: [
    { marka: 'Zara' }
  ],
  p_locations: [
    { sehir: 'Istanbul', ilceler: ['Kadikoy','Besiktas'] }
  ]
});
```

Returns: `{ candidate_id: 123, status: 'ok' }` on success.

---

## Implementation Tasks

### Task 1: HTML Shell + Head + Auth Gate

**Files:**
- Create: `profil-v2.html`

**Step 1: Create the file with head section**

Write the `<!DOCTYPE html>` through `</head>` section containing:
- Meta charset, viewport
- Page title: "Profilim | hellotalent"
- Auth gate script (check session, redirect to giris.html if not logged in)
- Google Fonts: Bricolage Grotesque, Plus Jakarta Sans, DM Mono
- `shared.css` link
- Supabase JS client CDN (`@supabase/supabase-js@2`)
- jsPDF CDN
- Placeholder `<style>` tag (filled in Task 2)

**Step 2: Add body shell**

Dashboard layout HTML:
- Loading screen overlay
- Site header (via shared.js injection)
- Sidebar with user info, nav links (Genel Bakis, Profil, CV, Ayarlar)
- Main content area with panel containers
- Bottom mobile nav
- Empty `<script>` tag (filled in later tasks)

**Step 3: Add Supabase client init in script**

```javascript
const SUPABASE_URL = 'https://cpwibefquojehjehtrog.supabase.co';
const SUPABASE_KEY = 'sb_publishable_POUtNwJyjAAheukwYP5hmA_TKKjphwa';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;
```

**Step 4: Verify**

Open `profil-v2.html` in browser, check:
- Page loads without JS errors
- Auth gate redirects if not logged in
- If logged in, shows empty dashboard shell

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): HTML shell, auth gate, supabase init"
```

---

### Task 2: CSS Design System

**Files:**
- Modify: `profil-v2.html` (fill the `<style>` tag)

**Step 1: Write all CSS**

Complete inline `<style>` block covering:
- Design tokens (CSS variables matching shared.css)
- Dashboard layout (sidebar, main, panels)
- Wizard container + progress bar (5-step visual with circles + connecting lines)
- Wizard step cards (`.wiz-step`)
- Form fields (`.field`, `.field label`, `input`, `select`, `textarea`)
- Dynamic row cards (experience cards, education rows, language rows, certificate rows)
- Chip components (single-select, multi-select)
- Tag input (brand interests)
- Autocomplete dropdown (`.ac-list`, `.ac-item`)
- Modal (location selector, success, error)
- Profile summary card
- Buttons (primary, secondary, ghost, danger)
- Responsive breakpoints (mobile sidebar overlay, bottom nav)
- Animations (fade-in, slide-in for wizard transitions)

Use the exact design tokens from shared.css:
```css
--verm: #C94E28; --verm-light: #F5EDE9;
--navy: #1E2D5E; --navy-light: #EEF0F7;
--gray: #F7F6F4; --text: #111111;
--muted: #6B7280; --border: #E5E3DF;
--green: #16a34a; --green-light: #F0FDF4;
```

**Step 2: Verify**

Reload page -- dashboard shell should look styled with proper fonts and colors.

**Step 3: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): complete CSS design system"
```

---

### Task 3: Reference Data

**Files:**
- Modify: `profil-v2.html` (add to `<script>`)

**Step 1: Copy and add reference data constants**

Add these JS constants to the script section (copy exact values from profil.html):
- `BRAND_DB` -- 100+ retail brands with parent companies (array of `{name, parent}`)
- `TUR_ILLER` -- 81 provinces grouped by region (object with region keys)
- `ILCELER` -- districts per province (object with province keys)
- `UNIVERSITE_DB` -- 60+ universities with city (array of `{name, sub}`)
- `BOLUM_DB` -- 60+ departments (array of strings)
- `DIL_LISTESI` -- 32 languages (array of strings)
- `DIL_SEVIYELERI` -- 7 levels: A1-C2 + Anadil (array of strings)

Also add SELECT option lists as constants:
```javascript
const EGITIM_SEVIYELERI = ['Ilkokul','Ortaokul','Lise','On Lisans','Lisans','Yuksek Lisans','Doktora'];
const DEPARTMANLAR = ['Magaza','Bolge Yonetimi','Genel Merkez','Visual Merchandising','Operasyon','Insan Kaynaklari','Egitim','Pazarlama','E-Ticaret','Diger'];
const SEGMENTLER = ['Luks','Premium','Orta Segment','Fast Fashion','Spor','Teknoloji','Kozmetik','Otomotiv','Gida / Market','Ev / Yasam','Diger'];
const ISTIHDAM_TIPLERI = ['Tam Zamanli','Yari Zamanli','Sezonluk','Stajyer','Sozlesmeli'];
const KIDEM_SEVIYELERI = ['Stajyer','Giris Seviye','Orta Seviye','Kidemli','Yonetici','Ust Yonetici'];
const LOKASYON_TIPLERI = ['Magaza','Saha','Genel Merkez'];
const TAKIM_BUYUKLUKLERI = ['Yok','1-5','6-15','16-30','30+'];
const AYRILMA_NEDENLERI = ['Istifa','Isten Cikarma','Karsilikli Anlasma','Sozlesme Sonu','Tasinma','Kariyer Degisikligi','Diger'];
const ROL_AILELERI = ['Satis','Magaza Yonetimi','Bolge Yonetimi','Visual Merchandising','Operasyon','Insan Kaynaklari','Pazarlama / E-Ticaret'];
const MUSAITLIK_SECENEKLERI = ['Hemen','2 Hafta Icinde','1 Ay Icinde','2+ Ay Icinde'];
const MAAS_ARALIKLARI = ['','15000-20000','20000-25000','25000-30000','30000-35000','35000-45000','45000-60000','60000-80000','80000+'];
const AY_ISIMLERI = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
```

**Step 2: Add Turkish lowercase helper**

```javascript
function trLower(s) {
  return s.replace(/I/g,'i').replace(/I/g,'i')
    .replace(/S/g,'s').replace(/C/g,'c')
    .replace(/O/g,'o').replace(/U/g,'u')
    .replace(/G/g,'g').toLowerCase();
}
```

**Step 3: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): reference data constants"
```

---

### Task 4: Wizard State Machine + Progress Bar

**Files:**
- Modify: `profil-v2.html` (HTML for progress bar + JS for wizard logic)

**Step 1: Add wizard HTML to the profil panel**

Inside the profil panel container, add:
- Progress bar with 5 labeled circles connected by lines
- 5 wizard step containers (`div.wiz-step[data-step="1"]` through `data-step="5"`)
- Wizard navigation bar (Geri button, Ileri button, Tamamla button on step 5)

**Step 2: Add wizard state machine JS**

```javascript
const WIZARD_STEPS = [
  { id: 1, title: 'Kisisel Bilgiler', icon: '1' },
  { id: 2, title: 'Kariyer', icon: '2' },
  { id: 3, title: 'Egitim', icon: '3' },
  { id: 4, title: 'Tercihlerim', icon: '4' },
  { id: 5, title: 'Lokasyon', icon: '5' }
];
let wizStep = 1;

function wizGoTo(step) {
  if (step > wizStep && !validateStep(wizStep)) return;
  if (step > wizStep) saveDraft();
  wizStep = step;
  renderWizard();
}
function wizNext() { if (wizStep < 5) wizGoTo(wizStep + 1); }
function wizBack() { if (wizStep > 1) wizGoTo(wizStep - 1); }
function renderWizard() {
  // Update progress bar circles + active step
  // Show/hide wiz-step containers
  // Update nav buttons (hide Geri on step 1, show Tamamla on step 5)
}
```

**Step 3: Add per-step validation skeleton**

```javascript
function validateStep(step) {
  switch(step) {
    case 1: return validateKisisel();
    case 2: return validateKariyer();
    case 3: return validateEgitim();
    case 4: return validateTercihler();
    case 5: return validateLokasyon();
    default: return true;
  }
}
function validateKisisel() { return true; }
function validateKariyer() { return true; }
function validateEgitim() { return true; }
function validateTercihler() { return true; }
function validateLokasyon() { return true; }
```

**Step 4: Verify**

Reload -- progress bar should render, clicking Ileri/Geri should switch steps.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): wizard state machine + progress bar"
```

---

### Task 5: Step 1 -- Kisisel Bilgiler

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Step 1 HTML form fields**

Inside `div.wiz-step[data-step="1"]`:
- Avatar upload area (circle + file input)
- Ad Soyad (text, required)
- Telefon (tel, required)
- E-posta (disabled, populated from auth)
- LinkedIn (url, optional)
- Cinsiyet (select: Kadin, Erkek, Belirtmek Istemiyorum)
- Dogum Yili (select, dynamically populated 2008-1960)
- Adres Il (select, 81 provinces sorted alphabetically)
- Adres Ilce (dependent select, populated when il changes)
- Engel Durumu (select: Yok, Var)
- Askerlik Durumu (select, visible only when Cinsiyet=Erkek: Yapildi, Muaf, Tecilli, Yapilmadi)

**Step 2: Add JS for dependent dropdowns**

```javascript
function populateIlSelect(selectEl) {
  const allIller = [];
  Object.values(TUR_ILLER).forEach(arr => arr.forEach(il => allIller.push(il)));
  allIller.sort((a,b) => a.localeCompare(b,'tr'));
  allIller.forEach(il => {
    const opt = document.createElement('option');
    opt.value = il; opt.textContent = il;
    selectEl.appendChild(opt);
  });
}
function populateIlceSelect(il, selectEl) {
  while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
  const def = document.createElement('option');
  def.value = ''; def.textContent = 'Ilce sec...';
  selectEl.appendChild(def);
  (ILCELER[il] || []).forEach(ilce => {
    const opt = document.createElement('option');
    opt.value = ilce; opt.textContent = ilce;
    selectEl.appendChild(opt);
  });
}
function toggleAskerlik() {
  const cinsiyet = document.getElementById('v2-cinsiyet').value;
  const wrap = document.getElementById('v2-askerlik-wrap');
  if (wrap) wrap.style.display = cinsiyet === 'Erkek' ? '' : 'none';
}
```

**Step 3: Add avatar upload handler**

Reuse exact pattern from profil.html (upload to Supabase storage `cvs` bucket under `avatars/` path). Use safe DOM methods only (createElement, textContent).

**Step 4: Add Step 1 validation**

```javascript
function validateKisisel() {
  const errors = [];
  if (!val('v2-isim')) errors.push('Ad Soyad');
  if (!val('v2-telefon')) errors.push('Telefon');
  if (!val('v2-cinsiyet')) errors.push('Cinsiyet');
  if (!val('v2-dogum-yili')) errors.push('Dogum Yili');
  if (!val('v2-adres-il')) errors.push('Il');
  if (errors.length) { showStepErrors(errors); return false; }
  return true;
}
```

**Step 5: Verify**

Fill out Step 1 form, click Ileri -- should validate required fields and advance to Step 2.

**Step 6: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): Step 1 -- Kisisel Bilgiler"
```

---

### Task 6: Step 2 -- Kariyer / Deneyimler

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Step 2 HTML**

Inside `div.wiz-step[data-step="2"]`:
- "Ilk deneyimim yok" checkbox toggle at top
- Experience cards container
- "Deneyim Ekle" button
- Each experience card contains all fields from the design doc

**Step 2: Add experience card manager JS**

```javascript
let experiences = [];
function addExperience() {
  experiences.push({
    id: Date.now(), sirket:'', marka:'', pozisyon:'', departman:'',
    segment:'', istihdam_tipi:'', kidem_seviyesi:'', lokasyon_tipi:'',
    sehir:'', takim_buyuklugu:'', baslangic_ay:0, baslangic_yil:0,
    bitis_ay:0, bitis_yil:0, devam_ediyor:false, ayrilma_nedeni:'',
    basari_ozeti:''
  });
  renderExperiences();
}
function removeExperience(id) {
  experiences = experiences.filter(e => e.id !== id);
  renderExperiences();
}
function renderExperiences() {
  // Clear container via removeChild loop
  // Rebuild each card using createElement + textContent only
  // Each card has all fields as DOM elements
}
function syncExpFromDOM(id) {
  // Read values from DOM inputs into experiences array item
}
```

**Step 3: Add brand autocomplete**

```javascript
function showBrandSuggestions(inp) {
  const val = trLower((inp.value || '').trim());
  // Remove existing dropdown via removeChild
  // Filter BRAND_DB, show up to 8 matches using createElement
  // On mousedown: fill input, remove dropdown
}
```

**Step 4: Add "Ilk deneyimim yok" toggle logic**

When checked: hide experience cards container, set flag. When unchecked: show container.

**Step 5: Add Step 2 validation**

If not "ilk deneyim": at least 1 experience required. Each experience must have sirket, pozisyon, baslangic_ay, baslangic_yil. If not devam_ediyor: bitis_ay, bitis_yil required.

**Step 6: Verify**

Add/remove experience cards, test autocomplete, test "devam ediyor" toggle.

**Step 7: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): Step 2 -- Kariyer / Deneyimler"
```

---

### Task 7: Step 3 -- Egitim + Diller + Sertifikalar

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Step 3 HTML**

Three sections inside `div.wiz-step[data-step="3"]`:

**Education rows** (add/remove, max 3):
- Egitim Seviyesi (select from EGITIM_SEVIYELERI)
- Okul (text input + autocomplete from UNIVERSITE_DB)
- Bolum (text input + autocomplete from BOLUM_DB)
- Mezuniyet Yili (select)
- Delete button

**Language rows** (add/remove, max 5):
- Dil (select from DIL_LISTESI)
- Seviye (select from DIL_SEVIYELERI)
- Delete button

**Certificate rows** (add/remove, unlimited):
- Egitim/Sertifika Adi (text)
- Kurum (text)
- Yil (select)
- Delete button

**Step 2: Add dynamic row managers**

```javascript
let eduRows = [];
let langRows = [];
let certRows = [];
const MAX_EDU = 3;
const MAX_LANG = 5;

function addEduRow() { /* push + render */ }
function removeEduRow(id) { /* filter + render */ }
function renderEduRows() { /* DOM build with createElement + autocomplete */ }

function addLangRow() { /* push + render */ }
function removeLangRow(id) { /* filter + render */ }
function renderLangRows() { /* DOM build with createElement */ }

function addCertRow() { /* push + render */ }
function removeCertRow(id) { /* filter + render */ }
function renderCertRows() { /* DOM build with createElement */ }
```

**Step 3: Add university/department autocomplete**

Reuse generic autocomplete pattern from brand suggestions, adapted for UNIVERSITE_DB and BOLUM_DB.

**Step 4: Add Step 3 validation**

At least 1 education row with seviye, okul, bolum required. Languages optional but if added, dil and seviye required.

**Step 5: Verify**

Add/remove education, language, certificate rows. Test autocomplete for okul/bolum.

**Step 6: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): Step 3 -- Egitim + Diller + Sertifikalar"
```

---

### Task 8: Step 4 -- Tercihlerim

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Step 4 HTML**

Inside `div.wiz-step[data-step="4"]`:

- **Target Roles** (add/remove):
  - Rol Ailesi (select from ROL_AILELERI)
  - Rol Unvani (text input)
  - Delete button

- **Musaitlik** (single-select chips from MUSAITLIK_SECENEKLERI)

- **Calisma Tipleri** (multi-select checkboxes from ISTIHDAM_TIPLERI)

- **Maas Beklentisi** (select from MAAS_ARALIKLARI)

- **Segmentler** (multi-select chips from SEGMENTLER)

- **Brand Interests** (tag input with BRAND_DB autocomplete)

- **Career Goal** (textarea)
- **Career Type** (select: Yukari Gecis, Yatay Gecis, Liderlik Rotasi)

**Step 2: Add chip/toggle selection JS**

```javascript
let selectedMusaitlik = '';
let selectedCalismaTipleri = [];
let selectedSegmentler = [];
let targetRoles = [];
let brandInterests = [];

function selectMusaitlik(val) { /* single-select chip toggle */ }
function toggleCalismaTipi(val) { /* multi-select checkbox toggle */ }
function toggleSegment(val) { /* multi-select chip toggle */ }
function addTargetRole() { /* push + render */ }
function removeTargetRole(id) { /* filter + render */ }
function addBrandInterest(name) { /* push + render tags */ }
function removeBrandInterest(idx) { /* splice + render tags */ }
```

**Step 3: Add Step 4 validation**

At least 1 target role, musaitlik selected, at least 1 calisma_tipi, maas selected, at least 1 segment.

**Step 4: Verify**

Test chip selection, tag input for brands, target role add/remove.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): Step 4 -- Tercihlerim"
```

---

### Task 9: Step 5 -- Lokasyon Tercihleri

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Step 5 HTML**

Inside `div.wiz-step[data-step="5"]`:
- Quick-pick chips for popular cities (Istanbul, Ankara, Izmir, Bursa, Antalya, Kocaeli)
- "Tum Iller" button -- opens location modal
- Selected cities display with district chips per city
- Location modal: region tabs, all 81 provinces, district checkboxes

**Step 2: Add location selection JS**

```javascript
let selectedCities = [];
let selectedDistricts = {};

function toggleCity(city) {
  if (selectedCities.includes(city)) {
    selectedCities = selectedCities.filter(c => c !== city);
    delete selectedDistricts[city];
  } else {
    selectedCities.push(city);
    selectedDistricts[city] = [];
  }
  renderSelectedCities();
}
function toggleDistrict(city, ilce) {
  if (!selectedDistricts[city]) selectedDistricts[city] = [];
  const idx = selectedDistricts[city].indexOf(ilce);
  if (idx >= 0) selectedDistricts[city].splice(idx, 1);
  else selectedDistricts[city].push(ilce);
  renderSelectedCities();
}
function renderSelectedCities() {
  // Show selected city chips with expandable district chips underneath
  // All DOM built with createElement + textContent
}
function openLokasyonModal() { /* show modal */ }
function closeLokasyonModal() { /* hide modal */ }
```

**Step 3: Add Step 5 validation**

At least 1 city selected.

**Step 4: Verify**

Select cities via quick-picks and modal. Toggle districts. Remove cities.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): Step 5 -- Lokasyon Tercihleri"
```

---

### Task 10: localStorage Draft System

**Files:**
- Modify: `profil-v2.html`

**Step 1: Implement draft save/load/clear**

```javascript
const DRAFT_KEY = 'ht_wizard_draft';

function saveDraft() {
  const draft = {
    step: wizStep,
    timestamp: new Date().toISOString(),
    profile: collectProfileData(),
    experiences: experiences.map(e => ({...e})),
    education: eduRows.map(e => ({...e})),
    certificates: certRows.map(e => ({...e})),
    languages: langRows.map(e => ({...e})),
    target_roles: targetRoles.map(r => ({...r})),
    work_prefs: collectWorkPrefs(),
    brand_interests: [...brandInterests],
    locations: selectedCities.map(city => ({
      sehir: city,
      ilceler: selectedDistricts[city] || []
    }))
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function applyDraft(draft) {
  // Populate all wizard fields from draft data
  // Set wizStep to draft.step
  // Render all dynamic rows
}
```

**Step 2: Wire saveDraft into wizard navigation**

- Call `saveDraft()` in `wizGoTo()` when moving forward
- Call `saveDraft()` when input values change (debounced, every 5 seconds)

**Step 3: Wire loadDraft into page load**

On page load, after auth check:
1. Check for existing draft
2. If found, show "Taslak bulundu -- devam et?" prompt
3. If user accepts, `applyDraft(draft)` and resume from `draft.step`
4. If user declines, `clearDraft()` and start fresh

**Step 4: Verify**

Fill out Step 1+2, close browser, reopen -- draft should be restored.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): localStorage draft save/load/clear"
```

---

### Task 11: Final Save via RPC

**Files:**
- Modify: `profil-v2.html`

**Step 1: Implement the save function**

```javascript
async function saveProfileViaRPC() {
  // Sync all dynamic rows from DOM
  experiences.forEach(exp => syncExpFromDOM(exp.id));

  const payload = {
    p_profile: collectProfileData(),
    p_experiences: experiences.map(e => ({
      sirket: e.sirket, marka: e.marka, pozisyon: e.pozisyon,
      departman: e.departman, segment: e.segment,
      istihdam_tipi: e.istihdam_tipi, kidem_seviyesi: e.kidem_seviyesi,
      lokasyon_tipi: e.lokasyon_tipi, sehir: e.sehir,
      takim_buyuklugu: e.takim_buyuklugu, basari_ozeti: e.basari_ozeti,
      baslangic_ay: e.baslangic_ay, baslangic_yil: e.baslangic_yil,
      bitis_ay: e.bitis_ay, bitis_yil: e.bitis_yil,
      devam_ediyor: e.devam_ediyor, ayrilma_nedeni: e.ayrilma_nedeni
    })),
    p_education: eduRows.filter(e => e.egitim_seviye).map(e => ({
      egitim_seviye: e.egitim_seviye, okul: e.okul,
      bolum: e.bolum, mezun_yil: e.mezun_yil ? parseInt(e.mezun_yil) : null
    })),
    p_certificates: certRows.filter(c => c.egitim_adi).map(c => ({
      egitim_adi: c.egitim_adi, kurum: c.kurum,
      yil: c.yil ? parseInt(c.yil) : null
    })),
    p_languages: langRows.filter(l => l.dil).map(l => ({
      dil: l.dil, seviye: l.seviye
    })),
    p_target_roles: targetRoles.map(r => ({
      rol_ailesi: r.rol_ailesi, rol_unvani: r.rol_unvani
    })),
    p_work_prefs: {
      musaitlik: selectedMusaitlik,
      maas_beklenti: document.getElementById('v2-maas').value,
      calisma_tipleri: selectedCalismaTipleri,
      segmentler: selectedSegmentler,
      career_goal: document.getElementById('v2-career-goal')?.value || '',
      career_type: document.getElementById('v2-career-type')?.value || ''
    },
    p_brand_interests: brandInterests.map(b => ({ marka: b })),
    p_locations: selectedCities.map(city => ({
      sehir: city,
      ilceler: (selectedDistricts[city] || [])
    }))
  };

  try {
    const { data, error } = await supabase.rpc('save_candidate_profile', payload);
    if (error) throw error;
    clearDraft();
    showSuccessModal();
    switchPanel('genel');
    await loadProfileFromDB();
  } catch (err) {
    console.error('RPC save error:', err);
    showRetryModal(err.message);
  }
}
```

**Step 2: Wire to Tamamla button**

On Step 5, "Tamamla" button calls `saveProfileViaRPC()`.

**Step 3: Add success and error modals**

- Success: "Profilin kaydedildi!" with checkmark, auto-redirect to dashboard
- Error: "Kaydetme basarisiz" with error message + "Tekrar Dene" button
- All DOM built with createElement + textContent (no innerHTML)

**Step 4: Verify**

Complete all 5 steps, click Tamamla -- verify RPC call succeeds and data appears in Supabase child tables.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): final save via save_candidate_profile RPC"
```

---

### Task 12: Data Load for Returning Users

**Files:**
- Modify: `profil-v2.html`

**Step 1: Implement multi-table data fetch**

```javascript
async function loadProfileFromDB() {
  const { data: profile } = await supabase
    .from('candidates').select('*')
    .eq('user_id', currentUser.id).single();

  if (!profile) return null;

  const candidateId = profile.id;
  const [expRes, eduRes, certRes, langRes, rolesRes, wpRes, brandRes, locRes] =
    await Promise.all([
      supabase.from('candidate_experiences')
        .select('*').eq('candidate_id', candidateId).order('sira'),
      supabase.from('candidate_education')
        .select('*').eq('candidate_id', candidateId).order('sira'),
      supabase.from('candidate_certificates')
        .select('*').eq('candidate_id', candidateId).order('sira'),
      supabase.from('candidate_languages')
        .select('*').eq('candidate_id', candidateId).order('sira'),
      supabase.from('candidate_target_roles')
        .select('*').eq('candidate_id', candidateId).order('sira'),
      supabase.from('candidate_work_preferences')
        .select('*').eq('candidate_id', candidateId).single(),
      supabase.from('candidate_brand_interests')
        .select('*').eq('candidate_id', candidateId).order('sira'),
      supabase.from('candidate_location_preferences')
        .select('*, candidate_location_pref_districts(*)')
        .eq('candidate_id', candidateId).order('sira')
    ]);

  return {
    profile,
    experiences: expRes.data || [],
    education: eduRes.data || [],
    certificates: certRes.data || [],
    languages: langRes.data || [],
    target_roles: rolesRes.data || [],
    work_prefs: wpRes.data || null,
    brand_interests: brandRes.data || [],
    locations: locRes.data || []
  };
}
```

**Step 2: Populate wizard from loaded data**

```javascript
function populateFromDB(data) {
  // Profile fields -> Step 1
  // Experiences -> Step 2 dynamic cards
  // Education, Languages, Certificates -> Step 3 rows
  // Target roles, work prefs, brand interests -> Step 4
  // Locations with districts -> Step 5
  // Set wizard to edit mode (all steps accessible, start at step 1)
}
```

**Step 3: Update auth bootstrap flow**

```javascript
(async function() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) { window.location.href = 'giris.html'; return; }
  currentUser = data.session.user;

  // Check for localStorage draft first
  const draft = loadDraft();
  if (draft) {
    applyDraft(draft);
    hideLoading();
    return;
  }

  // Then try loading from DB
  const dbData = await loadProfileFromDB();
  if (dbData && dbData.profile) {
    populateFromDB(dbData);
    syncDashboard(dbData.profile);
    switchPanel('genel');
  } else {
    switchPanel('profil');
  }
  hideLoading();
})();
```

**Step 4: Verify**

After a successful RPC save, reload page -- data should load from normalized tables and pre-populate all wizard fields.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): data load from normalized tables"
```

---

### Task 13: Dashboard + Profile Summary

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Genel Bakis panel HTML**

- Profile summary card (ID-card style): avatar, name, son_sirket, son_pozisyon, toplam_deneyim_ay, adres_il
- Profile completion percentage (circular progress)
- Quick action buttons: "Profili Duzenle" -> opens wizard, "CV Indir" -> generates PDF
- Active/passive status toggle

**Step 2: Add dashboard sync JS**

```javascript
function syncDashboard(profile) {
  // Update summary card fields using textContent
  // Calculate and display completion %
  // Update status badge (aktif/pasif)
}
function updateCompletion(profile) {
  const fields = ['full_name','telefon','cinsiyet','dogum_yili','adres_il'];
  // Calculate % from filled fields + child table existence
}
```

**Step 3: Add "Profili Duzenle" button handler**

Clicking enters wizard at Step 1 with all fields pre-populated (edit mode).

**Step 4: Verify**

After save, dashboard should show summary card with correct data.

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): dashboard + profile summary card"
```

---

### Task 14: CV Generation (jsPDF)

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add CV panel HTML**

- CV preview info (what will be included)
- "CV Olustur" button
- Download link after generation

**Step 2: Port and adapt CV generation from profil.html**

```javascript
function generateCV() {
  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // Header bar (navy), name, pozisyon, contact
  // Experiences section from normalized experiences array
  // Education section from eduRows
  // Languages from langRows
  // Brands from brand_interests
  // Footer: hellotalent.ai
  doc.save(name + '_HelloTalent.pdf');
}
```

Key difference from old version: reads from in-memory arrays (experiences, eduRows, langRows, brandInterests) instead of DOM elements.

**Step 3: Verify**

Click "CV Olustur" -- should download branded PDF with profile data.

**Step 4: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): CV generation with jsPDF"
```

---

### Task 15: Settings Panel + Final Polish

**Files:**
- Modify: `profil-v2.html`

**Step 1: Add Ayarlar panel**

- Name display
- Password change link (redirect to Supabase auth)
- Account delete option
- Sign out button

**Step 2: Add sign out handler**

```javascript
async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'giris.html';
}
```

**Step 3: Final responsive polish**

- Test at mobile (375px), tablet (768px), desktop (1280px)
- Ensure sidebar overlay works on mobile
- Bottom nav touches work
- Wizard cards stack properly on narrow screens

**Step 4: Verify full flow**

1. New user: redirected to wizard, complete all 5 steps, Tamamla -> RPC save -> dashboard
2. Returning user: loads from DB, shows dashboard, click "Duzenle" -> wizard pre-populated
3. Draft resume: fill 3 steps, close, reopen -> draft restored
4. Mobile: entire flow works on narrow viewport

**Step 5: Commit**

```bash
git add profil-v2.html
git commit -m "feat(profil-v2): settings panel + responsive polish"
```

---

## Build Sequence

| Order | Task | What It Adds |
|-------|------|-------------|
| 1 | HTML Shell | File created, auth gate, supabase init |
| 2 | CSS Design System | All visual styles |
| 3 | Reference Data | BRAND_DB, TUR_ILLER, etc. |
| 4 | Wizard State Machine | Step navigation, progress bar |
| 5 | Step 1: Kisisel | Personal info form + validation |
| 6 | Step 2: Kariyer | Dynamic experience cards + brand autocomplete |
| 7 | Step 3: Egitim | Education/language/certificate rows |
| 8 | Step 4: Tercihler | Chips, tags, target roles |
| 9 | Step 5: Lokasyon | City/district selection + modal |
| 10 | Draft System | localStorage save/load/clear |
| 11 | Final Save | RPC call + success/error modals |
| 12 | Data Load | Multi-table fetch + wizard populate |
| 13 | Dashboard | Summary card + completion % |
| 14 | CV Generation | jsPDF branded PDF |
| 15 | Settings + Polish | Ayarlar panel + responsive fixes |

## What To Build First

**Tasks 1-4** form the foundation -- the file, styles, data, and wizard navigation. After these 4 tasks, you have a working skeleton you can navigate through.

**Tasks 5-9** fill in each wizard step with forms and validation. Each step is independent once the wizard machine is in place.

**Tasks 10-12** connect the data layer -- local drafts, final DB save, and data reload.

**Tasks 13-15** add the post-wizard experience -- dashboard, CV, settings.
