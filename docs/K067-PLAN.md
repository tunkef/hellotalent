# K-067 — HelloTalent CV Builder v2: Kökten Yeniden Yapılandırma

**Tarih:** 2026-04-20
**Durum:** Plan — Tuna onayı bekliyor
**Önceki iterasyon:** K-066 (iter 1+2) — 2 kritik feedback sonrası revize

## 1. Neden K-067?

K-066 ile split wizard + live CV preview getirdik. Tuna UAT feedback:

1. **"Bu CV olayını beceremedik sanırım ya. Zety'deki UI UX çok başarılı, bizde istediğimiz randımanda eş zamanlı gitmiyor. Template görünümü de kötü şu an."**
2. **"Eski hatalar sürekli tekrar ediyor. Mesela 'Burada çalışıyorum' checkmark'ı sürekli kayboluyor, yine kaybolmuş. Bu kaçıncı tekrar edişi. Kökten çözüm yerine geçiştirmeli çalışıldığını görüyorum."**
3. **"Oluşturulan PDF'te aynı şekilde Türkçe karakter uyumu yok, yazılar alıp başını gidiyor."** (İstanbul→0stanbul, Mağazalar→Ma azalar, İçin→0çin)
4. **"Profili kaydettikten sonra da oluşturulan CV'ye bir daha ulaşamıyorum. Yani tekrar profil düzenlemeye girmem gerekiyor."**
5. **"Bana sağlam bir planla gel, bir ekip çalışması da organize edelim bunun için."**

## 2. Araştırma Özeti (3 Paralel Ajan)

### 2a. Zety Deep UX (Ajan a22080038a451d959 + a52519439b7a454f1)

- **Section-başına step** (Contact → Experience → Education → Skills → Summary → Extras) + **onboarding mikro-quiz** (foto var mı, tek/çift kolon, stil)
- Autosave default, on-blur flush + 800ms debounce. Save butonu yok
- Sol form ~45%, sağ preview ~55%
- Preview HTML-rendered (iframe değil), CSS `@media print` ile preview=PDF aynı kaynak
- PDF: server-side Puppeteer (bizim stack değil — alternatif gerek)
- `is_current` + nullable `end_date` pattern. `is_current=true` → end_date input disable+hide
- Experience: inline kart + accordion expand (modal değil)
- Drag-drop **section seviyesinde** (item-level skip — Enhancv review'u "awkward misplacement" diyor)
- Free tier: "My Resumes" dashboard, sınırsız oluştur — download paywall
- Skill: **tag-input** (yaz → autocomplete → Enter chip) + retail-specific taxonomy dropdown
- Bullet: **pre-written clickable suggestions** (40+), tıkla → insert + inline edit
- Foto: **onboarding quiz'de toggle** → photo/no-photo dual template
- Mobile: **bottom tab** Edit ↔ Preview ↔ Download (drawer değil — daha keşfedilebilir)

### 2b. jsPDF Türkçe Fix (Ajan a59133cd92aa015a5)

**Karar: Seçenek 1 — EB Garamond Turkish subset TTF embed**

| Seçenek | ATS-friendly | Bundle | Effort | Karar |
|---------|---|---|---|---|
| jsPDF + TTF subset embed | ✓ text | ~100KB | 2h | **SEÇİLDİ** |
| html2canvas + jsPDF | ✗ image | ~400KB | 30dk | ATS kırar |
| html2pdf.js | ✗ image | ~400KB | 20dk | Aynı sorun |
| pdfmake | ✓ text | ~1.9MB | 4h | Bütçe aşar |
| Puppeteer (server) | ✓ text | — | 8h+paid | Stack dışı |

Build step:
```bash
pyftsubset EBGaramond-Regular.ttf \
  --unicodes="U+0000-007F,U+00C7,U+00E7,U+011E,U+011F,U+0130,U+0131,U+015E,U+015F,U+00D6,U+00F6,U+00DC,U+00FC" \
  --output-file=ebg-reg-tr.ttf
# → jsPDF fontconverter (https://simonbengtsson.github.io/jsPDF-AutoTable/#fonts) → base64
```

Kod:
```js
function _ensureCVFont(doc) {
  if (_ensureCVFont._done) return;
  doc.addFileToVFS('EBGaramond-Regular.ttf', window.EB_GARAMOND_REGULAR_B64);
  doc.addFileToVFS('EBGaramond-Bold.ttf',    window.EB_GARAMOND_BOLD_B64);
  doc.addFileToVFS('EBGaramond-Italic.ttf',  window.EB_GARAMOND_ITALIC_B64);
  doc.addFont('EBGaramond-Regular.ttf', 'EBGaramond', 'normal');
  doc.addFont('EBGaramond-Bold.ttf',    'EBGaramond', 'bold');
  doc.addFont('EBGaramond-Italic.ttf',  'EBGaramond', 'italic');
  _ensureCVFont._done = true;
}
// generateCV() başında _ensureCVFont(doc) çağır
// setFont('times', ...) → setFont('EBGaramond', ...)
```

Test: `pdftotext generated.pdf - | grep "İstanbul"` matchlemeli.

### 2c. "Burada çalışıyorum" Checkbox Bug Root Cause (Ajan a8384c29320c3b2ad)

**Dual root cause:**

- **(d)** `addExperienceCard()` içinde `.checked = true` SET'ten change listener TETİKLENMİYOR. Programmatic property atama DOM event dispatch etmez.
- **(f)** Dynamic ID `exp-card-{N}-devam` — orphan listener riski (K-066 refactor'da delegation değişti, arttı)

**Geçmiş fix'ler (3 kez dokunulmuş):**
- `12aa73d` (4 Nis): "fix: 8 UX issues — ... checkbox, encoding"
- `af8559a` (31 Mar): "fix: 9 profil wizard issues — ... checkbox ..."
- `1741633` (24 Mar): "fix: auto-uncheck 'no experience' on card add"

Hiçbiri `dispatchEvent('change')` eklememiş. Tuna'nın "bu kaçıncı tekrar edişi" şikayeti haklı — yüzeysel patch.

**Kök çözüm:**
```js
// profil-ui.js addExperienceCard() sonuna:
if (d.devam_ediyor) {
  cb.checked = true;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
}
// VEYA daha sağlam: satır 669-676 manual toggle kodu helper'a extract:
function _toggleExperienceFields(cardId, isDevam) { ... }
// Hem initial hem listener'dan çağır
```

**Post-save CV erişim:** Aslında VAR — merkez panelinde `btn-preview-profile` (drawer) + `btn-generate-cv-merkez` (PDF indir). Tuna göremedi/bulamadı → **discoverability problemi, çözüm UX'de**.

## 3. Pillar'lar (Öncelik Sırasıyla)

### Pillar A [P0] — PDF Türkçe Karakter Kök Fix
**Hedef:** PDF'teki tüm Türkçe karakterler (İ, ı, ğ, ş, ç, ö, ü) doğru render olsun.
**Yaklaşım:** EB Garamond Regular+Bold+Italic Turkish subset TTF embed (~100KB toplam base64).
**Dosyalar:**
- Yeni: `eb-garamond-vfs.js` (base64 font data)
- `profil-cv.js`: `_ensureCVFont()` helper + tüm `setFont('times', ...)` → `setFont('EBGaramond', ...)`
- `profil.html`: `<script src="eb-garamond-vfs.js">`
**Test:** Playwright → PDF indir → `pdftotext` → grep "İstanbul", "Mağaza", "üç", "şirket" → regex matchlemeli.
**Estimate:** 2-3 saat (font subset + base64 + kod değişikliği + test)
**Kim:** Claude implement + Gemini live UAT (PDF indir)

### Pillar B [P0] — "Burada çalışıyorum" Checkbox Kök Çözüm
**Hedef:** Checkbox state'i profil yüklendiğinde ve kaydedildikten sonra %100 korunsun. 4. kez fix yok.
**Yaklaşım:** İki katmanlı:
1. `addExperienceCard()` içinde `.checked = true` sonrası `dispatchEvent(new Event('change', {bubbles: true}))`
2. Manual toggle kodu (profil-ui.js:669-676) `_toggleExperienceFields(cardId, isDevam)` helper'a extract. Hem initial render hem listener'dan çağrılsın.
3. Regression test zorunlu — K-067 guard, tekrar kırılmasın.
**Dosyalar:**
- `profil-ui.js`: `addExperienceCard`, `_toggleExperienceFields` yeni helper
- `profil-draft.js`: `applyDraft` sonrası dispatch flush
- `tests/p3.regression.spec.js`: "devam_ediyor checkbox state persistence" guard
**Estimate:** 2 saat
**Kim:** Claude implement + DeepSeek code review (tekrar regression riski yüksek) + Gemini UAT

### Pillar C [P0] — Post-Save CV Erişim Discoverability
**Hedef:** Kullanıcı kaydedince CV'sine tek tıkla ulaşsın. Wizard'a tekrar girme zorunluluğu olmasın.
**Yaklaşım:** 3 adım:
1. Header nav'a **"CV'im"** link (mevcut `GENEL · PROFİL · KEŞFET` yanına)
2. Success modal'ini düzenle: "Tamam" + "CV'mi Gör" iki buton. "CV'mi Gör" → merkez panel CV preview bölümüne scroll
3. Panel-merkez içindeki CV card'ı görünürlüğü artır — **"CV Önizleme" başlık + büyük PDF İndir butonu + "Düzenle" link**
**Dosyalar:**
- `profil.html`: Header nav "CV'im" link + panel-merkez CV section redesign + modal-success 2-button
- `profil-events.js`: "CV'im" nav click → switchPanel('merkez') + scroll to CV section
- `profil-preview.js`: openProfilePreview drawer'dan bağımsız bir panel-cv de olabilir (P1'e kayabilir)
**Estimate:** 2 saat
**Kim:** Claude implement + Gemini UAT

### Pillar D [P1] — CV Template v2 Pixel-Perfect (Tuna CV Parity)
**Hedef:** Tuna'nın CV'si (`/Users/peopleintk/Desktop/kariyer/cv/Tuna_Kefeli_Resume_2026.pdf`) referans. 1:1 layout eşleşmesi.
**Yaklaşım:**
- Preview + PDF aynı CSS `@media print` kaynağı (Zety pattern)
- Header: İsim uppercase letter-spaced (font-stretch CSS), iletişim 2 satır, diller ayrı satır, avatar sağ üst (opsiyonel)
- **Core Skills kategorize**: "Retail Operations: P&L Ownership, ...", "Commercial Strategy: ...", "Leadership: ..." — Tuna CV kalıbı birebir. ROLE_SKILLS_MAP yeniden yapılandır.
- Deneyim: COMPANY bold uppercase | sağda tarih. Alt satır "Pozisyon | Şehir". 3-5 bullet başarı odaklı.
- Section order: Header → Summary → Core Skills → Experience → Education → References
- "References are available upon request." italic alt
- Footer: "by hellotalent" italic gri ortalı (alt margin)
**Dosyalar:**
- `cv-preview.css`: Tuna CV'den taklit tipografi + spacing
- `profil-cv-preview.js`: section order + kategorize skill render
- `profil-cv.js`: jsPDF equivalent (Pillar A'daki font fix ile birlikte)
**Estimate:** 3 saat
**Kim:** Claude implement + Tuna görsel review (pixel parity)

### Pillar E [P1] — Role-Based Skill Taxonomy Genişlet
**Hedef:** 10 rol × 5-6 skill → 15-20 rol × 8-12 skill. Retail-specific, Tuna CV'sindeki kategorilere ek ("Digital & Expansion: Omnichannel O2O, NSO, Crisis Management").
**Yaklaşım:**
- `profil-core.js` ROLE_SKILLS_MAP genişlet
- Kategori başlıkları Tuna CV ile uyumlu: "Retail Operations", "Commercial Strategy", "Leadership", "Customer Experience", "Digital & Expansion"
- Her rol için 5-10 skill
**Dosyalar:**
- `profil-core.js`: ROLE_SKILLS_MAP v2
- `profil-cv-preview.js` + `profil-cv.js`: kategori aggregation logic
**Estimate:** 2 saat
**Kim:** Tuna input (taxonomy domain expert) + Claude implement

### Pillar F [P2] — Zety Parity UX (Autosave + Accordion + Tag Input)
**Hedef:** Wizard UX Zety seviyesine çıksın.
**Yaklaşım:**
- **Autosave**: On-blur flush + 800ms debounce. "Save" butonu kaldır (veya "Taslak kaydedildi ✓" badge). `saveProfileRPC` call throttle.
- **Accordion experience edit**: Liste inline kart, "Düzenle" → kart içinden accordion expand. Modal kaldır.
- **Tag-input skill**: Yaz → autocomplete → Enter chip. Mevcut `selectedBrandInterests` pattern'ini skill'e de uygula.
- **Bullet pre-written suggestions**: 5-10 bullet/rol — tıkla → experience'a insert + inline edit.
**Dosyalar:**
- `profil-ui.js`: autosave hook, accordion refactor, tag-input component
- `profil.html`: UI değişiklikleri (accordion, tag input, bullet suggest panel)
- `cv-preview.css`: accordion animasyon + tag chip style
**Estimate:** 6-8 saat
**Kim:** Codex plan review → Claude implement → DeepSeek code review → Gemini UAT

### Pillar G [P2] — Mobile UX (Bottom Tab)
**Hedef:** Mobilde drawer yerine Edit ↔ Preview ↔ Download tab switch (Zety pattern).
**Yaklaşım:**
- `@media (max-width: 900px)` — bottom tab bar (fixed)
- 3 tab: Edit / Preview / Download
- Preview tabında tam ekran CV, PDF İndir floating button
**Dosyalar:**
- `cv-preview.css`: bottom tab bar + sayfa toggle
- `profil.html`: `<nav class="wz-mobile-tabs">` yeni element
- `profil-bootstrap.js`: tab switch logic
**Estimate:** 3 saat
**Kim:** Claude implement + Gemini mobile UAT

### Pillar H [P3] — Foto Toggle + Dual Template Variant
**Hedef:** "Foto istiyor musun?" onboarding sorusu → photo/no-photo iki template.
**Yaklaşım:**
- `candidates.cv_show_photo` boolean kolonu (yeni migration)
- Onboarding quiz adımı (Step 1 sonrası)
- `renderCVPreview(data)` içinde `data.showPhoto` branch
**Dosyalar:**
- Migration: `candidates.cv_show_photo`
- `profil-cv-preview.js`: branch
- `profil.html`: onboarding quiz UI
**Estimate:** 3 saat
**Kim:** Codex plan review → Claude implement

## 4. Ekip Düzeni

Tuna'nın isteği doğrultusunda (memory: Codex x Claude x Gemini x DeepSeek çalışma modeli):

| Rol | Sorumlu | İş |
|---|---|---|
| **CEO / PO** | Tuna | Vision, UAT, sign-off, pixel review (Pillar D), taxonomy input (Pillar E) |
| **PO / Architect** | Codex | Plan review (Pillar F/H), scope enforcement, sprint cut. Destekleyici. |
| **CTO / Implementation** | Claude | Tüm pillar kodu, migration, refactor, test yazma |
| **Code Reviewer** | DeepSeek | Pillar B (state bug — tekrar regression riski yüksek) + Pillar F (refactor riski) — `scripts/deepseek-review.sh ~$0.01/review` |
| **UAT / QA** | Gemini | Live site manuel test (Pillar A PDF, Pillar B checkbox, Pillar C CV erişim, Pillar F autosave, Pillar G mobile) |
| **Explore Agents** | Claude spawnlı | Derin research delegation (mevcut pattern) |

**Akış:**
1. Tuna plan onay → Codex review (opsiyonel — zaten plan geldi) → Sprint başla
2. Pillar A, B, C paralel implement (Claude) — 1 iş günü
3. DeepSeek review Pillar B (çünkü 4. kez fix, kritik)
4. Gemini UAT P0 pillar'lar
5. Tuna sign-off P0 → Commit + push
6. P1 pillar'lar (D, E) — Tuna taxonomy input gelince
7. P2 (F, G) — Codex plan review sonrası, büyük refactor
8. P3 (H) — opsiyonel, stretch goal

## 5. Sıralama ve Sprint Bölümü

### Sprint 1 — P0 Critical (1 iş günü, ~6 saat)
- [A] PDF Türkçe fix (2h) — pdftotext assertion ile doğrula
- [B] Checkbox state kök çözüm (2h) — dispatchEvent + helper extract + regression test
- [C] Post-save CV erişim (2h) — "CV'im" nav + success modal 2-button + panel-merkez CV card redesign
- DeepSeek Pillar B review
- Gemini UAT → Tuna sign-off → commit + push
- AI-COLLAB.md K-067 sprint 1 entry

### Sprint 2 — P1 High (1 iş günü, ~5 saat)
- [D] Tuna CV pixel parity (3h) — Tuna görsel review
- [E] Skill taxonomy v2 (2h) — Tuna input

### Sprint 3 — P2 Medium (1.5 iş günü, ~10 saat)
- [F] Autosave + accordion + tag-input (6-8h) — Codex plan review + DeepSeek
- [G] Mobile bottom tab (3h)

### Sprint 4 — P3 Low (opsiyonel, ~3 saat)
- [H] Foto toggle + dual template

**Toplam: 16-22 saat, 2-3 iş günü (P3 dahil).**

## 6. Risk Analizi

| Risk | Etki | Azaltma |
|---|---|---|
| EB Garamond TTF font subset yanlış karakterleri içerirse | PDF yine kırık | pdftotext regression test — tüm Türkçe karakterleri (İ, ı, ğ, ş, ç, ö, ü, Ğ, Ş, Ç, Ö, Ü) test cümlesinde bulundur |
| Checkbox fix yine yüzeysel kalırsa | Tuna 5. kez bakarsa güven kaybı | DeepSeek mandatory review + tests/p3.regression.spec.js'e "K-067 checkbox state after applyDraft" guard |
| Post-save CV erişim modal bug'ı olursa | Kullanıcı CV'ye ulaşamaz | Gemini UAT zorunlu |
| Autosave çok sık tetiklenirse | Supabase RPC quota yer, yavaşlar | Debounce 800ms + on-blur flush (Zety pattern) |
| Accordion refactor regression | Wizard başka yerleri kırılır | Codex plan review + DeepSeek + full p3.regression.spec.js pass |
| Mobile bottom tab mevcut drawer ile çakışır | UI double navigation | CSS @media ile ayrıştır, JS flag ile tek seferlik migration |

## 7. Başarı Kriterleri (Tuna Sign-Off)

**Sprint 1 sonu:**
- [ ] PDF indir → "İstanbul", "Mağaza", "İçin", "üç" Türkçe karakterleri %100 doğru
- [ ] Checkbox "Burada çalışıyorum" işaretle → kaydet → logout → login → wizard'a dön: checkbox hâlâ işaretli
- [ ] Kaydet sonrası success modal'de "CV'mi Gör" butonu → merkez CV kartına götürüyor, CV görünüyor, PDF İndir tek tık
- [ ] Header'da "CV'im" link
- [ ] Playwright ht-k067-sprint1.mjs geçiyor
- [ ] p3.regression 922+ pass

**Sprint 2 sonu:**
- [ ] Tuna "CV template Tuna CV'si ile 1:1" diyor
- [ ] 15+ rol × 8+ skill, retail taxonomy genişletildi

**Sprint 3 sonu:**
- [ ] Form input blur → 800ms sonra autosave "Taslak kaydedildi ✓"
- [ ] Experience kart accordion expand/collapse
- [ ] Skill tag-input: yaz → autocomplete → Enter chip

**Sprint 4 sonu (opsiyonel):**
- [ ] Onboarding foto toggle → photo/no-photo template farkı

## 8. Sonraki Adım

**Tuna onayını bekliyorum.** Onaylayınca:
1. `docs/K067-PLAN.md` commit (history için)
2. Sprint 1 task list (TaskCreate)
3. Pillar A implementation başlar (font subset build + VFS)
