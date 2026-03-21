# Hellotalent.ai — AI & Ajan Sağlık Denetimi Raporu
**Tarih:** 14 Mart 2026  
**Kapsam:** Dosya bütünlüğü, ajan verimliliği, token/bağlam, bağımlılıklar, ölü kod.

---

## 1. Genel Sağlık Skoru: **7,5 / 10**

| Kriter | Puan | Not |
|--------|------|-----|
| Dosya bütünlüğü | 8/10 | TODO/FIXME yok; production'da console.log yok. Supabase key tek kaynak değil. |
| Ajan verimliliği | 6/10 | profil.html tek dosyada aşırı yük; bölünmediği için edit riski yüksek. |
| Token / bağlam | 6/10 | profil.html 6.352, index 2.640, ik 1.952 satır — bağlam penceresini zorluyor. |
| Bağımlılık / erişim | 8/10 | Supabase/Sentry aktif; key 5+ yerde tekrarlı; .env yok (statik site). |
| Ölü kod / referans | 8/10 | index_new.html yok; tüm href'ler mevcut sayfalara gidiyor. |

---

## 2. Dosya Bütünlüğü

### ✅ İyi Durumda
- **TODO/FIXME:** Proje kaynak kodunda (node_modules hariç) anlamlı TODO/FIXME/HACK yok. Sadece placeholder metinler (örn. "05XX XXX XXXX", "_ga_XXXXXXX") var.
- **console.log:** Production HTML/JS içinde `console.log` kullanılmıyor. Clean code audit ile 24 adet kaldırılmış (handoff).
- **Sentry:** DSN tanımlı, key redaction var; TODO comment kaldırılmış.

### ⚠️ Dikkat Edilmesi Gerekenler
- **Supabase config tekrarı:** URL ve anon key **7+ dosyada** tekrarlanıyor:
  - `shared.js` (tek kaynak kabul ediliyor)
  - `profil.html`, `ik.html`, `giris.html` (auth öncesi shared.js yüklenmediği için kendi client’ları var)
  - `kariyer.html`, `yetkinlik.html`, `blog.html`, `pozisyonlar.html` (fallback olarak hardcoded `createClient(URL, KEY)`)
- Key değeri tüm dosyalarda aynı (`sb_publishable_POUtNwJyjAAheukwYP5hmA_TKKjphwa`) — kopukluk yok, ancak key değişirse 7+ dosya güncellenmeli.
- **profil.html:** 6.352 satır; tek dosyada wizard, paneller, Storage, RPC, Sentry, dark mode. Mantık hatası riski yüksek; “section-by-section edit” kuralına sıkı uyulmalı.

---

## 3. Ajan Verimliliği

### Hangi Modüller Daha Fazla Hata/Debug Döngüsüne Giriyor?
- **profil.html** belgelenen en riskli modül:
  - handoff: “24 debug console.log kaldırıldı (profil.html)”, “.single() → .maybeSingle() Sentry fix”, “fallback save pattern kaldırıldı”
  - Architecture: “profil.html size (5,900+ lines, intertwined logic)” drift-prone alan olarak işaretli
- **ik.html** (~1.952 satır): Mock’tan canlı veriye geçiş (P2 #7) yapıldı; büyük dosya, daha az karmaşık than profil.
- **index.html** (~2.640 satır): Gate, signup, login, HR demo; daha az sık değişen.

### Verim Düşük Alanlar
1. **profil.html** — Tek dev dosyası; AI tek seferde bütün dosyayı göremez, bölüm bölüm atıfta edilmesi gerekiyor; yanlış bölümde edit kolay.
2. **Supabase config dağınıklığı** — Key/URL değişince birçok dosyada manuel güncelleme; ajan da hangi dosyada ne olduğunu takip etmek zorunda.
3. **Ortak CSS (shared.css)** — 320 satır duplicate CSS audit’te shared’e taşındı; yine de sayfa bazlı inline `<style>` blokları büyük (özellikle profil, index, ik).

---

## 4. Token ve Bağlam Durumu

### Proje Boyutu (kök dizin, node_modules hariç)
- **Toplam:** ~19.196 satır (HTML + JS + CSS).
- **En büyük dosyalar:**

| Dosya | Satır | Risk |
|-------|-------|------|
| profil.html | 6.352 | Çok yüksek — tek dosyada bağlamı doldurur |
| index.html | 2.640 | Yüksek |
| ik.html | 1.952 | Orta-yüksek |
| isalim-rotasi.html | 919 | Orta |
| aday.html | 992 | Orta |
| shared.css | 827 | Orta |
| kariyer.html | 807 | Orta |

- **Modularite:** Proje “no build step”, inline style/script ile ilerliyor. profil.html’de bölüm yorumları var (örn. `<!-- ═══ PANEL: GENEL BAKIS ═══ -->`) ancak dosya fiziksel olarak bölünmüş değil; AI bağlam penceresinde tam dosyayı açınca token tüketimi çok artıyor.

---

## 5. Bağımlılık ve Erişim Kontrolü

### API / Servisler
- **Supabase:** URL ve anon key tüm ilgili sayfalarda aynı; kopukluk yok. Key repo’da plain text (GitHub Pages statik site; .env kullanılmıyor). Bu bilinçli tercih; key public anon key.
- **Sentry:** profil.html’de DSN sabit; `beforeSend` ile `sb_publishable_` redaction yapılıyor.
- **PostHog:** Devre dışı; `ht_track()` stub.
- **Deprecated:** Proje kodunda deprecated API kullanımı veya uyarı taranmadı (Supabase JS v2, Sentry 8.48 kullanılıyor).

### .env / Gizli Dosyalar
- Proje kökünde `.env` yok; credentials handoff’ta “see .env or memory” olarak geçiyor (muhtemelen lokal/CI için). GitHub Pages deploy’da env kullanılmıyor.

---

## 6. Devre Dışı Kalanlar / Ölü Kod

### Kontrol Edilenler
- **index_new.html:** Yok; kurala uygun.
- **HTML linkleri:** Tüm `href="*.html"` referansları mevcut dosyalara gidiyor (index, giris, profil, aday, ik, kariyer, blog, yetkinlik, pozisyonlar, isveren, isalim-rotasi, iletisim, hakkimizda, gate, gizlilik, kvkk, kullanim-sartlari, cerez-politikasi).
- **Bilerek gizli UI:** “Engelli şirketler” kartı `display:none` (30+ şirket sonrası açılacak); “blocking UI” handoff’ta belgeli — ölü kod değil, planlı gizleme.

### Ölü Sayılabilecek Yapı
- **ref_components, ref_guidelines, ref_styles:** `.gitignore`’da; Cursor/ajan bunlara erişemiyor (bilinçli ignore). Ölü değil, referans materyali.

---

## 7. Kritik Sorunlar (Acil Müdahale)

1. **profil.html tek dev dosyası (6.352 satır)**  
   - Tek bir büyük edit veya “tüm dosyayı oku” isteği bağlamı doldurur ve hata/yanlış bölüm edit riskini artırır.  
   - **Öneri:** Bölüm bazlı çalışma zorunlu; “profil.html’in X–Y satırları” veya “PANEL: AYARLAR” gibi hedefli atıf.

2. **Supabase key/URL tekrarı**  
   - Key değişirse 7+ dosyada güncelleme gerekir; birini unutma riski var.  
   - **Öneri:** Key’i değiştirmeyi düşünmüyorsanız dokümante edin; değiştirecekseniz build-time placeholder (örn. tek bir config.js + script ile inject) veya en azından “config değişince güncellenecek dosyalar” listesi tutulmalı.

3. **.cursorignore yok**  
   - `node_modules` .gitignore’da; Cursor’un index’ine ne dahil olduğu net değil. Büyük test raporları, geçici dosyalar index’e girerse token tüketir.  
   - **Öneri:** Aşağıdaki “Token Tasarrufu” bölümüne göre .cursorignore ekleyin.

---

## 8. Verimlilik Tavsiyeleri (AI’ın Daha İyi Çalışması İçin)

1. **profil.html’i bölüm bazlı dokümante edin**  
   - `docs/profil-sections.md` oluşturun: satır aralıkları ve bölüm adları (örn. “Auth & Supabase init: 2320–2400”, “Wizard Step 1: 1830–1900”). AI’a “profil.html satır 3200–3300” gibi hedefli referans verilebilsin.

2. **Shared config contract**  
   - `shared.js` “single source of truth” ise, profil/ik/giris’teki inline SUPABASE_URL/KEY yanına tek satırlık uyarı ekleyin: “Değişiklik yaparken shared.js ile senkron tutun.”  
   - İsteğe bağlı: Kök dizinde `CONFIG.md` — “Supabase URL/Key değişince güncellenecek dosyalar: shared.js, profil.html, ik.html, giris.html, kariyer.html, yetkinlik.html, blog.html, pozisyonlar.html.”

3. **profil.html’i fiziksel bölmek**  
   - Uzun vadede: CSS’i `profil.css`, JS’i `profil.js` yapıp profil.html’den link/script ile çekmek (mevcut “inline only” kuralıyla çelişir; karar gerekir).  
   - Kısa vadede: Dosyayı bölmeden “section-by-section edit” kuralını CLAUDE.md ve skill’de vurgulayın; büyük refactor’lardan kaçının.

4. **Ortak bölüm şablonu**  
   - Skill’deki “Use unique HTML comment markers for section targeting” ile uyum için profil’de `<!-- SECTION: PanelName -->` formatına geçilebilir (şu an `═══ PANEL: ... ═══` var; arama kolaylığı için STANDARDIZE edilebilir).

---

## 9. Token Tasarrufu — .cursorignore Önerisi

Projede **.cursorignore** dosyası yok. Aşağıdaki kurallar bağlamı azaltır ve token tasarrufu sağlar.

### Önerilen .cursorignore İçeriği

```gitignore
# Bağımlılıklar ve üretilen çıktılar
node_modules/
test-results/
playwright-report/
*.log
firebase-debug.log

# Büyük / geçici dosyalar
docs/plans/
ref_components/
ref_guidelines/
ref_styles/

# İsteğe bağlı: test spec (sadece test yazarken açılır)
# tests/
```

- **node_modules:** Zaten .gitignore’da; .cursorignore’da da olursa Cursor index’i kesin dışarıda kalır.
- **test-results, playwright-report, *.log:** CI/geçici çıktı; index’e girmemeli.
- **docs/plans/, ref_*:** Büyük plan/referans; günlük editlerde nadiren gerekir; gerektiğinde açıkça @ ile verilir.
- **tests/:** İsteğe bağlı; test yazarken dahil, günlük feature editinde hariç tutulabilir.

Bu sayede Cursor index’i özellikle kök HTML/JS/CSS ve `docs/handoff.md`, `CLAUDE.md`, `shared.js`, `shared.css` üzerinde yoğunlaşır; profil.html gibi büyük dosyalar “hedefli bölüm” ile kullanılır.

---

## 10. Özet

| Alan | Durum | Aksiyon |
|------|--------|--------|
| TODO / yarım kod | ✅ Temiz | — |
| console.log production | ✅ Temiz | — |
| Supabase key tutarlılığı | ⚠️ Tekrarlı | Key değişince 7+ dosya güncelle; CONFIG.md veya uyarı ekle |
| profil.html boyutu | 🔴 Risk | Bölüm bazlı edit; docs/profil-sections.md ekle |
| Bağlam / token | ⚠️ Büyük dosyalar | .cursorignore ekle; profil’e hedefli referans |
| Ölü link / index_new | ✅ Yok | — |
| Sentry / PostHog | ✅ Sentry aktif, PostHog stub | — |

**Genel skor 7,5/10:** Proje production için temiz ve tutarlı; asıl risk tek ve çok büyük dosya (profil.html) ile config tekrarı. .cursorignore ve bölüm dokümantasyonu ile AI/ajan verimi ve token kullanımı iyileştirilebilir.
