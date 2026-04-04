# HelloTalent — Aday Veri Modeli Analizi (Perakende İK Perspektifi)

> Bu doküman bir perakende İK müdürü gözüyle mevcut aday veri modelini analiz eder.
> Eksik veri noktalarını, KVKK risklerini ve implementasyon önceliklerini belirler.

---

## Mevcut Durum: Ne Topluyoruz?

| Kategori | Mevcut Veri | Yeterli mi? |
|----------|-------------|-------------|
| **Kimlik** | Ad, email, telefon, cinsiyet, doğum yılı | Var ama KVKK riski |
| **Deneyim** | Şirket, marka, pozisyon, tarih, devam ediyor, rol ailesi, sektör | Temel var, **derinlik yok** |
| **Eğitim** | Seviye, okul, bölüm, mezuniyet yılı | Yeterli |
| **Dil** | Dil + seviye | Yeterli |
| **Sertifika** | Ad, kurum, yıl | Yeterli |
| **Tercihler** | Hedef rol, çalışma tipi, müsaitlik, segment, kariyer yönü, lokasyon | İyi ama eksikler var |
| **Marka ilgisi** | Takip + ilgi | İyi |
| **Gizlilik** | Mevcut işverenden gizlenme, şirket engelleme | İyi |

## Temel Sorun: Deneyim Derinliği Sığ

Mevcut deneyim kaydı:
```
Şirket: Zara | Pozisyon: Mağaza Müdürü | 2020-devam
```

İK müdürünün bilmesi gerekenler:
- Kaç kişilik ekip? (5 outlet mu, 40 flagship mu?)
- Mağaza açılışı yaptı mı?
- Birden fazla mağaza yönetti mi?
- VM, omni-channel, CRM deneyimi var mı?
- Ne zaman gerçekten başlayabilir?

---

## Aday Profiline Eklenecekler — Öncelik Sırası

### Tier 1 — MVP 1 (Aday profilini güçlendirir, işveren için kritik)

| # | Alan | Tablo/Kolon | UI | Not |
|---|------|-------------|-----|-----|
| T1.1 | **Ekip büyüklüğü** | `candidate_experiences.team_size` (text) | Dropdown: yönetmedim / 1-5 / 6-10 / 11-20 / 21-50 / 50+ | Yönetici pozisyonu seçildiğinde aktif olur |
| T1.2 | **Tercih edilen segment** | `candidate_work_preferences.preferred_segments` (text[]) | Multi-select chip: luxury / premium / mass / sportswear / cosmetics / electronics / f&b | Mevcut `segmentler` alanını yapısal hale getirir |
| T1.3 | **Vardiya esnekliği** | `candidate_work_preferences.shift_flexibility` (text) | Dropdown: standart mesai / vardiyalı / hafta sonu dahil / esnek | Mağaza çalışma saatleri uyumu |
| T1.4 | **İhbar süresi** | `candidate_work_preferences.notice_period` (text) | Dropdown: yok (işsiz) / 2 hafta / 1 ay / 2 ay / 3+ ay | Müsaitlik bilgisini tamamlar |

**Form friction:** Toplam 4 ek alan, hepsi dropdown/chip. Wizard'a ~30 saniye ekler.

### Tier 2 — MVP 2 (İşveren filtrelemeyi zenginleştirir)

| # | Alan | Tablo/Kolon | UI | Not |
|---|------|-------------|-----|-----|
| T2.1 | **Mağaza açılışı** | `candidate_experiences.store_opening` (boolean) | Toggle (her deneyimde) | Premium sinyal |
| T2.2 | **Çok mağaza yönetimi** | `candidate_experiences.multi_store` (boolean) | Toggle (her deneyimde) | Bölge müdürü filtresi |
| T2.3 | **Retail skill etiketleri** | `candidate_experiences.retail_skills` (text[]) | Multi-select chip (12 opsiyon, opsiyonel) | Niş arama |
| T2.4 | **Ehliyet** | `candidates.has_driving_license` (boolean) | Toggle (tercihler adımında) | Bölge/saha pozisyonları |
| T2.5 | **İş arama sebebi** | `candidate_work_preferences.job_search_reason` (text) | Dropdown (6 opsiyon) | İşveren approach stratejisi |

**Retail skills listesi:**
- Visual Merchandising (VM)
- Omni-channel / O2O
- Stok & Depo Yönetimi
- CRM / Sadakat Programı
- E-Ticaret Operasyonu
- Eğitim & Gelişim (Trainer)
- Bütçe & P&L Yönetimi
- Mağaza Tasarım / Renovasyon
- Franchise Yönetimi
- Loss Prevention / Kayıp Önleme
- Toptan / B2B Satış
- Müşteri Deneyimi (CX)

### Tier 3 — Growth Fazı

| # | Alan | Not |
|---|------|-----|
| T3.1 | Bütçe/ciro sorumluluğu | Hassas, opsiyonel |
| T3.2 | Terfi geçmişi | Deneyimden türetilebilir (aynı şirkette pozisyon artışı) |
| T3.3 | Eğitim verme deneyimi | Retail skill olarak zaten eklenebilir |

---

## KVKK REVİZYONLARI

### Opsiyonel Yapılması Gerekenler (Şu an zorunlu)

| Alan | Mevcut | Olması gereken | Neden |
|------|--------|----------------|-------|
| `cinsiyet` | Zorunlu | **Opsiyonel** | İşveren filtresi olarak kullanılmayacak, zorunlu olması KVKK riski + kayıt friction |
| `dogum_yili` | Zorunlu | **Opsiyonel** | Deneyim yılı zaten dolaylı yaş göstergesi. Zorunlu olması ayrımcılık aracı riski |
| `askerlik_durumu` | Var | **Opsiyonel + "isterseniz belirtin" notu** | İşveren filtresinde KULLANILMAYACAK |

### Kesinlikle Toplanmayacaklar

| Veri | Neden |
|------|-------|
| Medeni durum / çocuk sayısı | İş Kanunu md.5 eşit davranma ihlali |
| Din / etnik köken | KVKK md.6 özel nitelikli veri |
| Sağlık bilgisi (engellilik hariç) | KVKK md.6 özel nitelikli veri |
| Boy / kilo / fotoğraf filtresi | Fiziksel görünüm ayrımcılığı |
| Sigara kullanımı | Özel yaşam gizliliği |
| Maaş geçmişi | Etik sorun — sadece beklenti toplanır |

### Engellilik — Ayrı Akış

- KVKK md.6 özel nitelikli kişisel veri → **ayrı açık rıza** zorunlu
- İş Kanunu md.30: 50+ çalışanlı işverenler %3 engelli istihdam **zorunlu**
- İşveren tarafında "engelli kontenjan pozisyonu" olarak **ayrı akış**
- Genel aday aramasında engellilik filtreleme **YASAK**

---

## İŞVEREN FİLTRE MİMARİSİ — REVİZE

### Ana Filtreler (Güvenli — KVKK uyumlu)
```
Pozisyon tipi ─── Segment deneyimi ─── Tercih segmenti
Lokasyon (il/ilçe) ─── Min. deneyim ─── Çalışma tipi
Ne zaman başlar
```

### Detaylı Filtreler (Güvenli — KVKK uyumlu)
```
Ekip büyüklüğü (yönetici seçildiğinde aktif)
Çok mağaza yönetimi ─── Mağaza açılışı
Retail skill etiketleri (multi-select)
Dil + min. seviye
Ehliyet ─── Vardiya esnekliği
CV var/yok ─── Aktif iş arıyor ─── Markamızı takip ediyor
Profil skoru (min %)
```

### OLMAYACAK FİLTRELER
```
❌ Yaş aralığı — deneyim yılı yeterli
❌ Cinsiyet — hiçbir koşulda filtre olamaz
❌ Askerlik — filtre değil, sadece profil bilgisi
❌ Fotoğraf bazlı — ayrımcılık
❌ Medeni durum — toplanmıyor
❌ Maaş geçmişi — sadece beklenti
```

---

## KVKK Uyum Tablosu

| Veri | Toplanabilir? | Filtrede? | Rıza tipi |
|------|---------------|-----------|-----------|
| Ad, email, telefon | Evet | Hayır | Meşru menfaat |
| Deneyim, eğitim, dil, sertifika | Evet | Evet | Meşru menfaat |
| Lokasyon, çalışma tipi, müsaitlik | Evet | Evet | Meşru menfaat |
| Ekip büyüklüğü, retail skills | Evet | Evet | Meşru menfaat |
| Mağaza açılışı, çok mağaza | Evet | Evet | Meşru menfaat |
| Ehliyet, vardiya, ihbar süresi | Evet | Evet | Meşru menfaat |
| Segment tercihi | Evet | Evet | Meşru menfaat |
| **Doğum yılı** | Opsiyonel | **HAYIR** | **Açık rıza** |
| **Cinsiyet** | Opsiyonel | **HAYIR** | **Açık rıza** |
| **Askerlik** | Opsiyonel | **HAYIR** | **Açık rıza** |
| **Engellilik** | Opsiyonel (ayrı akış) | **AYRI AKIŞ** | **Açık rıza (md.6)** |

---

*Son güncelleme: 3 Nisan 2026*
*İlişkili: [[feature-map]], [[kullanici-yolculugu-isveren]], [[karar-defteri]], [[yapilacaklar]]*
