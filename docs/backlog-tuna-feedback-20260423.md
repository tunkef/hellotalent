# Tuna Feedback Backlog — 23 Nisan 2026 (UAT esnasi)

**Kaynak:** Tuna screenshot + sozlu geri bildirim (23 Nisan 2026, session devami).

**Durum:** Listelendi, yapilacaklara alindi. Onceki dusuk/orta risk backlog bitince bu listeye donulecek.

---

## TF1 — 2FA UI fix (buton mesafeleri ve layout)

**Kaynak:** Screenshot 1 (2FA enroll ekrani, QR kod + 6 haneli kod input + "Dogrula" buton + "Vazgec" buton).

**Sorun:**
- Dogrula butonu kodu input'unun HEMEN yaninda — gorsel nefes alani yok
- Vazgec butonu ALT satirda duruyor, "Dogrula" ile dikey hizalanmamis — buton sirasi karisik
- Input ve Dogrula arasinda space yok
- QR kod + manuel secret kutusu + input arasinda hierarchy net degil

**Onerilen fix:**
- css/panels/ayarlar.css'te MFA enroll bolumu icin dedicated class'lar (.mfa-enroll-actions + .mfa-enroll-cancel)
- Flex container + gap:12px + align-items:center
- Vazgec butonu Dogrula'nin sagina (flex-end) veya altina (gridstack) — dikey/yatay consistency
- Input width fix, buton min-width

**Kapsam:** profil.html line 1417-1428 + ayarlar.css yeni class'lar.

**Oncelik:** YUKSEK (UAT blocker).

---

## TF2 — 2FA sistem dogrulama (end-to-end test + bug fix)

**Istek:** "bir de buranin duzgun calisip calismadigini sistemsel olarak dogrulamani bir hata varsa gidermeni istiyorum. sonra canli teste gececegim."

**Kapsam:**
1. 2FA enroll flow (btn-mfa-enable → Supabase mfa.enroll → QR kod + secret gosterimi → kod gir → verify → enabled state)
2. 2FA disable flow (btn-mfa-disable → confirm modal → kod iste → verify → unenroll → disabled state)
3. Pending factor state — kullanici enroll baslatip yarim birakirsa listFactors() ne dondurur? unverified factor temizlik var mi?
4. Multi-factor edge case: birden cok TOTP factor varsa disable loop (line 789-792) hepsini unenroll ediyor mu?
5. Login sirasinda MFA challenge step (giris.html tarafinda)
6. Kod retry: yanlis kod girilirse error message — Turkce + UX dogru mu?

**Test plani:**
- tests/ayarlar-mfa-e2e.spec.js (yeni, HT_TEST_EMAIL env ile)
- Manuel: Google Authenticator veya benzeri uygulama ile gercek QR scan + login regresyon

**Oncelik:** YUKSEK (UAT blocker).

---

## TF3 — Hesap silme workflow revizyonu (KVKK + UX)

**Istek:** 
> "insanlarin hesabimi sil diye bastiginda 30 gun boyunca dondurulacak ve sonra silinecek gibi ayarlaman daha dogru olur. KVKK da ne diyosa aslinda o. ama silmeye karar vren kisi icin 30 gun dondurulacak kimseye gozukmeyecek 30 gun sorna silinecek demesi daha iyi. tekrar ayni hesapla giris yaptiginda ayni email ile hesabinizi dondurmustunuz aktiflestirmek istiyormusunuz diye sormasi lazim. onaylarsa kullanici eski kaldigi yerden devam etsin."

**Mevcut durum (profil-settings.js:612-616):**
- "Hesabimi Sil" → confirm modal "30 gun sonra silinecek"
- DB: account_status = 'pending_deletion'
- Banner gorunur: "30 gun icinde vazgecebilirsiniz"

**Istenen degisiklikler:**
1. **Confirm modal metni:** "Hesabiniz 30 gun boyunca dondurulacak (kimse goremez), sonra kalici silinecek. Bu sure icinde giris yaparsaniz hesabiniz tekrar aktive edilir."
2. **Login flow:** pending_deletion account_status ile giris yapilirsa, giris.html'de modal: "Ayni email ile hesabinizi silmek uzereydiniz — aktiflestirmek ister misiniz? Tum veriler korundu."
3. **Onaylarsa:** account_status = 'active' + redirect profile, eski kaldigi yerden devam
4. **Reddederse:** signOut + deletion countdown devam

**Backend (Supabase):**
- Sistem muhtemelen bu durumu zaten destekliyor (account_lifecycle trigger: frozen→active preserves is_active). Mevcut migration'lara bak.
- 30 gun sonra cron purge (docs/CURRENT-STATE'te mention edilmisti).

**Frontend:**
- giris.html: pending_deletion detection + restore modal
- profil.html: mevcut banner metni guncellenmeli (dondurmayi vurgula)

**Oncelik:** ORTA (KVKK compliance — legal hassasiyet + UX iyilestirme).

---

## TF4 — Avatar upload image editor (zoom/pan/crop)

**Istek:** "insanlar avatar yuklerken editleyecegi bir sistemde koymak lazim zoom in zoom out kirpma gibi. direkt yuklemesi dogru degil gibi geliyor."

**Mevcut durum:** `<input type="file" id="avatar-file-hidden" hidden>` + profil-ui veya profil-bootstrap'ta file reader → direkt Supabase Storage upload.

**Istenen:** Cropper modal (react-free, vanilla JS library):
- Secilen foto modal'da
- Zoom in/out slider
- Pan (drag)
- Circular crop (avatar icin)
- "Kaydet" → cropped blob → Supabase upload
- "Vazgec" → modal close

**Library onerisi:** [Cropper.js](https://github.com/fengyuanchen/cropperjs) (vanilla, CDN). Veya custom canvas.

**Kapsam:**
- profil.html: avatar crop modal HTML
- yeni js: profil-avatar-editor.js
- Supabase Storage avatar path aynen kalir

**Oncelik:** DUSUK (UX iyilestirme, functional akis mevcut).

---

## TF5 — Admin image editor UI cleanup (markalar + duyurular)

**Istek:** "admin tarafinda marka eklerken veya duyuru girerken oyle bir image editor geliyor ama UI i cok kotu orayada bir bakmak lazim."

**Mevcut durum:** css/admin/image-editor.css (1047 satir) — brand/announcement composer icin image crop/position editor. K049 Faz 3'te hex purge yapildi ama UI design kotu.

**Kapsam:**
- Manuel test: admin.html → marka ekle → foto yukle → editor gorsel inceleme
- admin-announcements.js hydrate → composer → media upload → editor
- UI audit: impeccable-design skill ile referans
- Kullanilacak yeni pattern: TF4 ile ortak library (Cropper.js) olabilir — unified image editor

**Oncelik:** DUSUK (admin-side, dis kullanici gormez).

---

## SIRA GUNCEL (23 Nisan 2026 ikinci UAT sonrasi)

**Tamamlanan:**
- ✓ TF1 — 2FA UI layout fix (commit 6654077)
- ✓ TF2 — 2FA sistem dogrulama (commit 6654077)
- ✓ Onceki dusuk/orta risk backlog (4 commit zinciri)

**Aktif sira (yukardan asagi):**
1. **TF3** — Hesap silme workflow revizyonu (ORTA, KVKK)
2. **TF4** — Avatar cropper modal (DUSUK)
3. **TF5** — Admin image editor UI cleanup (DUSUK)
4. **TF6** — Ayarlar UI/UX revizyonu (ORTA, frontend-design skill ile)

**Bonus (TF2 UAT sonrasi iyilestirme):**
- Progresif lockout matematigi: 3=30sn → 4=2dk → 5=10dk → 6=1h → 7+=24h (cap). Tuna onerisine yakin + 10dk ara basamak UX dostu. giris.html + profil-settings.js iki phase'de uygulanacak.

---

## TF6 — Ayarlar UI/UX revizyonu (YENI — 23 Nisan UAT screenshot)

**Tuna geri bildirimi (screenshot + sozlu):**
> "ayarlar sayfasinda butun butonlar solda ya bir garip geliyor normalde sagda olur sanirim. buranin UI ve UX kismina iyice bir bakalim olur mu frontend ajani ile birlikte en iyi deneyimi yasatacak tasarim ve UX le bulusturalim. hizalamalar siralamalar, bolum ayirilmarlari, Hesap aralari hero bolumunu bir kart icine tasiyalim diger sayfalarda oldugu gibi, Insanlar hesap ayarlari altindaki menuye bastikca icerikler gelsin. butun icerikler tek yerde toplanmis gibi degil, acikta oornegin guvenlige tiklati sadece guvenlik bolumu acildi gibi."

**Bulgular:**
1. **Buton hizalama:** "Kaydet", "Tercihleri kaydet", "Sifreyi guncelle" vb. butonlar kart icinde SOLDA hizali — standart dashboard pattern SAG hizali (form footer right-aligned).
2. **Hero kart yok:** "Hesap ayarlari" baslik + alt metin direkt sayfa icinde — diger panellerde (profil, markalar, inbox) kart-icinde hero pattern var. Tutarsiz.
3. **Butun sections acik** — Tum Hesap + Guvenlik + Gizlilik + Bildirim + Gorunum + Hesap Yonetimi tek sayfada acik. TOC var ama sadece anchor scroll — section collapse/filter yok.
4. **Istenen:** Tab/collapse pattern — TOC'a "Guvenlik" tiklaninca sadece o section goster, digerlerini gizle (ya da active section vurgu + scroll).

**Yaklasim onerisi:**
- A) Tab-only (sadece aktif section render, digerleri hidden)
- B) Accordion (her section collapse, ilk acik)  
- C) Hybrid: TOC tiklama → section'a scroll + vurgu animasyonu, ancak hepsi acik kalir (mevcut ama gorsel gelismis)
- D) Sidebar nav (sol tarafta section listesi, sag icerik) — en dashboard-like

Frontend-design skill + Tuna review gerekli. Scope: 1 gun.

**Kapsam dosyalar:**
- profil.html line 1313-1730 (ayarlar bolumu)
- css/panels/ayarlar.css (1047 satir)
- profil-ayarlar.js (153 satir) — TOC scroll-spy mevcut, state yonetimi eklenecek

**Oncelik:** ORTA — functional sorun yok, UX/tasarim iyilestirmesi.
