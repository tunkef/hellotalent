# Phase 3: Clean Rewrite — Wizard Profile (Design)

**Date**: 2026-03-10
**Status**: Approved
**Approach**: Clean rewrite as `profil-v2.html`, old `profil.html` untouched

## Architecture

Single HTML file (`profil-v2.html`), no build system. Three sections:
1. `<style>` — all CSS
2. `<body>` — dashboard shell + wizard HTML
3. `<script>` — all JS

Old `profil.html` stays in production until new version is verified.

## File Strategy

| File | Action |
|---|---|
| `profil-v2.html` | NEW — full clean rewrite |
| `profil.html` | UNTOUCHED — backward compatible |
| `shared.css` | REUSED — site-wide styles |
| `shared.js` | REUSED — header/footer injection |

Switchover: when profil-v2.html is verified, rename old to `profil-legacy.html`, new to `profil.html`.

## Wizard Flow (5 Steps)

### Step 1: Kisisel Bilgiler
- Avatar upload
- Ad Soyad (text), Telefon (tel), E-posta (disabled, from auth)
- LinkedIn (url)
- Cinsiyet (select), Dogum Yili (select, year range)
- Adres Il (select, 81 provinces), Adres Ilce (dependent select)
- Engel Durumu (select), Askerlik (select, shown only for Erkek)

### Step 2: Kariyer / Deneyimler
- "Ilk deneyimim yok" checkbox toggle
- Dynamic experience cards (add/remove), each containing:
  - Sirket (text, required), Marka (autocomplete from BRAND_DB)
  - Pozisyon (text, required)
  - Departman (select: Magaza, Bolge Yonetimi, Genel Merkez, VM, Operasyon, IK, Egitim, Pazarlama, E-Ticaret, Diger)
  - Segment (select: Luks, Premium, Orta Segment, Fast Fashion, Spor, Teknoloji, Kozmetik, Otomotiv, Gida/Market, Ev/Yasam, Diger)
  - Istihdam Tipi (select: Tam Zamanli, Yari Zamanli, Sezonluk, Stajyer, Sozlesmeli)
  - Kidem Seviyesi (select: Stajyer, Giris Seviye, Orta Seviye, Kidemli, Yonetici, Ust Yonetici)
  - Lokasyon Tipi (select: Magaza, Saha, Genel Merkez)
  - Sehir (select)
  - Takim Buyuklugu (select: Yok, 1-5, 6-15, 16-30, 30+)
  - Baslangic Ay/Yil, Bitis Ay/Yil
  - "Halen burada calisiyorum" checkbox (hides bitis fields)
  - Ayrilma Nedeni (select, shown when devam_ediyor=false)
  - Basari Ozeti (textarea, optional)

### Step 3: Egitim
- Education rows (add/remove, max 3):
  - Egitim Seviyesi (select), Okul (autocomplete from UNIVERSITE_DB), Bolum (autocomplete from BOLUM_DB), Mezun Yil (select)
- Language rows (add/remove, max 5):
  - Dil (select from DIL_LISTESI), Seviye (select: A1-C2, Anadil)
- Certificate rows (add/remove):
  - Egitim Adi (text), Kurum (text), Yil (select)

### Step 4: Tercihlerim
- Target Roles (add/remove):
  - Rol Ailesi (select: Satis, Magaza Yonetimi, Bolge Yonetimi, VM, Operasyon, IK, Pazarlama/E-Ticaret)
  - Rol Unvani (text or contextual select based on family)
- Musaitlik (single-select chips: Hemen, 2 Hafta Icinde, 1 Ay Icinde, 2+ Ay Icinde)
- Calisma Tipleri (multi-select checkboxes: Tam Zamanli, Yari Zamanli, Sezonluk, Stajyer, Sozlesmeli)
- Maas Beklenti (select with ranges)
- Segmentler (multi-select chips — same list as experience segment)
- Brand Interests (tag input with BRAND_DB autocomplete)
- Career Goal (textarea), Career Type (select: yukari, yatay, lider)

### Step 5: Lokasyon Tercihleri
- City selection (chips for popular + full 81 provinces modal)
- Per-city district selection (dependent on selected city)
- Visual display of selected cities + districts

## Save Strategy: Local Draft + Final Save

1. **On each step forward**: serialize all wizard data to `localStorage` key `ht_wizard_draft`
2. **On page load**: check for existing draft, if found, populate wizard fields and resume from last step
3. **On final "Tamamla" click**: call `supabase.rpc('save_candidate_profile', { p_profile, p_experiences, ... })`
4. **On successful save**: clear `localStorage` draft, show success modal, redirect to dashboard
5. **On save failure**: keep draft in localStorage, show retry button with error message
6. **Draft structure**: `{ step: 2, timestamp: '...', profile: {...}, experiences: [...], education: [...], ... }`

## Data Load (Returning Users)

For returning users who already have data in the normalized tables:
1. Fetch `candidates` row by `user_id`
2. Parallel fetch all child tables: `candidate_experiences`, `candidate_education`, `candidate_certificates`, `candidate_languages`, `candidate_target_roles`, `candidate_work_preferences`, `candidate_brand_interests`, `candidate_location_preferences` (with districts)
3. Populate wizard fields
4. Show wizard in "edit" mode (all steps accessible, start at step 1)

## Dashboard (Post-Wizard)

- **Genel Bakis panel**: profile summary card showing name, avatar, son_sirket, son_pozisyon, toplam_deneyim_ay, adres_il, profile completion %
- **"Profili Duzenle" button**: re-enters wizard at step 1 with all fields pre-populated
- **CV generation**: jsPDF-based PDF with Hellotalent branding, reads from loaded profile data
- **Other panels**: Kariyer Rotasi, Rehber, Eslesme (placeholder), Ayarlar (name/password/delete)

## Reference Data (Carried Forward)

- `BRAND_DB` — 100+ retail brands
- `TUR_ILLER` — 81 provinces
- `ILCELER` — districts per province
- `UNIVERSITE_DB` — 60+ universities
- `BOLUM_DB` — 60+ departments
- `DIL_LISTESI` — language list
- `DIL_SEVIYELERI` — A1-C2 + Anadil

## CSS Design Tokens (Carried Forward)

```css
--verm: #C94E28;  --verm-light: #F5EDE9;
--navy: #1E2D5E;  --navy-light: #EEF0F7;
--gray: #F7F6F4;  --text: #111111;
--muted: #6B7280; --border: #E5E3DF;
--green: #16a34a;  --green-light: #F0FDF4;
```

Fonts: Bricolage Grotesque (headings), Plus Jakarta Sans (body), DM Mono (monospace).

## Isolation from Old Version

- New file has zero dependencies on old profil.html
- Same Supabase client, same auth flow, same gate check
- Old profil.html continues writing to flat `candidates` columns (no conflict)
- New profil-v2.html writes to normalized child tables via RPC
- Both can coexist — they write to different columns/tables
