# K-067 Sprint 2 — Hazırlık Notları

**Tarih:** 2026-04-20 (Sprint 1 sonrası, Tuna UAT bekleniyor)
**Pillar D:** Tuna CV pixel-parity
**Pillar E:** Skill taxonomy v2 (pozisyon-bazlı, Zety pattern)

---

## 1. Tuna CV vs Mevcut Template — Diff List

Referans: `/Users/peopleintk/Desktop/kariyer/cv/Tuna_Kefeli_Resume_2026.pdf`
Mevcut: `cv-preview.css` + `profil-cv-preview.js` + `profil-cv.js generateCV()`

### Header
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 1 | Avatar ~120px sağ üst | 84px (preview) / 26mm (PDF) | preview 120px, PDF 32mm |
| 2 | İsim 20pt UPPERCASE letter-spacing 0.15em | 22px / 0.08em | spacing artır 0.12em |
| 3 | Subtitle YOK (direkt iletişim) | "Üst Düzey Mağaza Müdürü" italic | Conditional: pozisyon eklemek opsiyonel mi mecburi mi? Tuna kararı |
| 4 | Diller key bold value regular: "Turkish: Native    English: Professional" | "Türkçe: Anadil İngilizce: İleri" plain | `<b>` ile key bold |
| 5 | Header altı siyah hairline tam width | Var ama ince | OK |

### Section Başlıkları
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 6 | "PROFESSIONAL SUMMARY" / "CORE SKILLS" / "PROFESSIONAL EXPERIENCE" | "PROFESYONEL ÖZET" / "YETKİNLİKLER" / "PROFESYONEL DENEYİM" | Türkçe — OK |
| 7 | Bold uppercase letter-spaced ~0.15em | 0.12em | 0.15em yap |
| 8 | Section altında hairline divider | Var | OK |

### Core Skills (Yetkinlikler)
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 9 | 5 kategori: Retail Operations, Commercial Strategy, Leadership, Customer Experience, Digital & Expansion | rol_ailesi'nden Mağaza Operasyon, Liderlik, Sektör İlgisi | **Pillar E refactor** |
| 10 | "**Bold Kategori:** liste." | Aynı format | OK |

### Deneyim
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 11 | "PEOPLEIN HUMAN RESOURCES & CONSULTANCY" UPPERCASE bold ~11pt | "L'ORÉAL" 12px bold | Punto biraz büyüt 12px → 13px (preview) |
| 12 | Tarih sağ italic ~10pt | 10.5px italic | OK |
| 13 | Pozisyon REGULAR italic değil: "Founder / Principal Consultant \| Istanbul" | "Üst Düzey Mağaza Müdürü" italic | **italic kaldır → regular** |
| 14 | Bullet character "•" indent ~16px | "•" indent 16px | OK |

### Education
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 15 | "UNIVERSITY OF THE PEOPLE" UPPERCASE bold | "BOĞAZİÇİ ÜNİVERSİTESİ" UPPERCASE bold | OK (K-067 fix sonrası) |
| 16 | Tarih sağ italic | Sağ italic | OK |
| 17 | Derece "BSc Business Administration \| Online \| 3rd Year" italic | "İşletme" italic | OK ama daha verbose pattern (seviye + program + format/yıl) — Pillar D opt |

### References & Footer
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 18 | "References are available upon request." italic en alt sağ | "Referanslar talep üzerine sunulur." italic sağ | OK |
| 19 | Footer YOK (Tuna kendi CV'si) | "by hellotalent" italic ortalı | KALSIN (HelloTalent branding) |

### Margins & Spacing
| # | Tuna CV | Mevcut | Aksiyon |
|---|---|---|---|
| 20 | ~1 inch margin tüm kenarlar (~25mm) | 16mm | 20mm yap (orta nokta, sayfa daha rahat) |
| 21 | Section arası ~10mm boşluk | ~6mm | 8mm yap |

---

## 2. Pillar E — POSITION_SKILLS_MAP v2 Draft

**Mevcut sorun:** ROLE_SKILLS_MAP rol_ailesi bazlı (10 family × 5-6 skill). "Mağaza Müdürü" pozisyonu otomatik tüm Mağaza Operasyon skill'lerini gösterir — generic.

**Tuna CV pattern:** Pozisyon-bazlı kategorize 5 domain × 4-6 skill. Daha hassas.

**Çözüm:** **Hibrit** — POSITION_SKILLS_MAP (pozisyon spesifik) > ROLE_SKILLS_MAP (rol_ailesi fallback).

### Domain kategorileri (Tuna CV pattern, Türkçeleştirilmiş)
- **Operasyon** (Retail Operations) — P&L, stok, shrinkage, tesis
- **Ticari Strateji** (Commercial Strategy) — KPI, VM, trend, fiyat
- **Liderlik** (Leadership) — ekip, performans, succession, bütçe
- **Müşteri Deneyimi** (Customer Experience) — clienteling, CRM, NPS, service recovery
- **Dijital & Büyüme** (Digital & Expansion) — omnichannel, NSO, kriz, açılış

### Draft (15 ana pozisyon — sonra genişler)

```js
var POSITION_SKILLS_MAP = {
  // Mağazacılık / Perakende → Mağaza Operasyon family
  'Mağaza Müdürü': {
    'Operasyon': ['P&L Sahipliği', 'Stok Kontrolü', 'Shrinkage Yönetimi', 'Tesis Yönetimi'],
    'Ticari Strateji': ['KPI Analizi (Conversion, UPT, ATV)', 'Görsel Mağazacılık', 'Trend Forecasting'],
    'Liderlik': ['Büyük Ekip Yönetimi (30+)', 'Performans Koçluğu', 'Bütçe Planlama'],
    'Müşteri Deneyimi': ['Clienteling', 'CRM Optimizasyonu', 'NPS/CSAT Yönetimi'],
    'Dijital & Büyüme': ['Omnichannel (O2O)', 'Yeni Mağaza Açılışı', 'Kriz Yönetimi']
  },
  'Üst Düzey Mağaza Müdürü': {
    'Operasyon': ['P&L Sahipliği', 'Stok Kontrolü ($2M+/hafta)', 'Shrinkage Yönetimi', 'Multi-mağaza Operasyon'],
    'Ticari Strateji': ['KPI Analizi (Conversion, UPT, ATV)', 'Görsel Mağazacılık', 'Buying & Merchandising'],
    'Liderlik': ['Büyük Ekip Yönetimi (50+ FTE)', 'Performans Koçluğu', 'Succession Planning', 'İşgücü Bütçesi'],
    'Müşteri Deneyimi': ['Clienteling', 'CRM Optimizasyonu', 'NPS/CSAT Büyütme', 'Service Recovery', 'Mystery Shopper'],
    'Dijital & Büyüme': ['Omnichannel (O2O) Entegrasyon', 'Yeni Mağaza Açılışı (NSO)', 'Kriz Yönetimi']
  },
  'Asistan Müdür': {
    'Operasyon': ['Vardiya Planlama', 'Günlük Stok Sayımı', 'Mağaza Açılış/Kapanış'],
    'Liderlik': ['Ekip Koordinasyonu', 'Yeni Çalışan On-boarding'],
    'Müşteri Deneyimi': ['Şikayet Yönetimi', 'Mystery Shopper Performansı'],
    'Ticari Strateji': ['Günlük KPI Takibi', 'Hedef Raporlama']
  },
  'Vardiya Sorumlusu': {
    'Operasyon': ['Vardiya Devir Teslimi', 'Personel Yönlendirme', 'Acil Durum Yönetimi'],
    'Liderlik': ['Frontline Ekip Liderliği', 'Çatışma Çözümü'],
    'Müşteri Deneyimi': ['İlk Kademe Şikayet Çözümü']
  },
  'Bölge Müdürü': {
    'Operasyon': ['Multi-mağaza P&L', 'Bölgesel Stok Optimizasyonu', 'Alan Denetimi'],
    'Ticari Strateji': ['Bölgesel KPI', 'Pazar Analizi', 'Rekabet İstihbaratı'],
    'Liderlik': ['Mağaza Müdürleri Mentorlüğü', 'Bölgesel İK Stratejisi', 'Eğitim Programları'],
    'Dijital & Büyüme': ['Yeni Mağaza Lokasyon Analizi', 'Bölgesel Açılış Koordinasyonu']
  },

  // Satış family
  'Satış Danışmanı': {
    'Müşteri Deneyimi': ['Clienteling', 'Kişiselleştirilmiş Danışmanlık', 'After-sales Takibi'],
    'Ticari Strateji': ['Hedef Takibi', 'Upselling', 'UPT/ATV Optimizasyonu'],
    'Operasyon': ['Ürün Bilgisi', 'Stok Yenileme'],
    'Dijital & Büyüme': ['CRM Veri Girişi', 'Müşteri Profil Yönetimi']
  },
  'Üst Segment Satış Danışmanı': {
    'Müşteri Deneyimi': ['VIP Clienteling', 'Özel Etkinlik Yönetimi', 'Kişiye Özel Sunum'],
    'Ticari Strateji': ['Yüksek Sepet Hedef Yönetimi', 'Cross-selling Stratejisi'],
    'Liderlik': ['Junior Mentorluğu']
  },

  // Kasa / Operasyon
  'Kasiyer': {
    'Operasyon': ['Nakit Yönetimi', 'POS Sistemleri', 'Günlük Raporlama', 'Fraud Prevention'],
    'Müşteri Deneyimi': ['Hızlı Hizmet', 'Çoklu Ödeme Yönetimi']
  },

  // Görsel Mağazacılık (VM)
  'VM Sorumlusu': {
    'Ticari Strateji': ['Vitrin Tasarımı', 'Planogram Uygulama', 'Trend Forecasting'],
    'Operasyon': ['Sezon Geçişi Hazırlığı', 'Stok Sergileme'],
    'Dijital & Büyüme': ['Kampanya Görsel Yerleşimi', 'Marka Standart Uygulaması']
  },

  // Depo & Lojistik
  'Depo Sorumlusu': {
    'Operasyon': ['Stok Kabul', 'Envanter Yönetimi', 'Sevkiyat Planlama'],
    'Liderlik': ['Depo Ekip Yönetimi'],
    'Dijital & Büyüme': ['Warehouse Management Sistem (WMS)', 'Barkod / RFID']
  },

  // F&B
  'Restoran Müdürü': {
    'Operasyon': ['F&B Operasyonu', 'Menü Maliyet Analizi', 'Hijyen & HACCP'],
    'Ticari Strateji': ['Günlük Ciro Hedefi', 'Menü Mühendisliği'],
    'Liderlik': ['Mutfak + Servis Ekibi Yönetimi'],
    'Müşteri Deneyimi': ['Servis Standardı', 'Şikayet Yönetimi']
  },
  'Barista': {
    'Müşteri Deneyimi': ['Hızlı Servis', 'Ürün Önerisi', 'Rutin Müşteri İlişkisi'],
    'Operasyon': ['Espresso Makinesi Bakımı', 'Hijyen Uygulamaları']
  }
};
```

### Skill aggregation logic (renderCVPreview + generateCV)

```js
function _buildSkillCategories(experiences, brandInterests) {
  var positionMap = window.POSITION_SKILLS_MAP || {};
  var roleFallback = window.ROLE_SKILLS_MAP || {};
  var leadership = window.LEADERSHIP_SKILLS || [];

  var aggregate = {}; // {kategori: Set(skill)}

  experiences.forEach(function(e) {
    var pos = e.pozisyon || e.rol_unvani;
    var posSkills = pos && positionMap[pos];
    if (posSkills) {
      // Pozisyon bazlı multi-kategori
      Object.keys(posSkills).forEach(function(cat) {
        aggregate[cat] = aggregate[cat] || [];
        posSkills[cat].forEach(function(s) {
          if (aggregate[cat].indexOf(s) === -1) aggregate[cat].push(s);
        });
      });
    } else if (e.rol_ailesi && roleFallback[e.rol_ailesi]) {
      // Rol_ailesi fallback (legacy)
      aggregate[e.rol_ailesi] = aggregate[e.rol_ailesi] || [];
      roleFallback[e.rol_ailesi].forEach(function(s) {
        if (aggregate[e.rol_ailesi].indexOf(s) === -1) aggregate[e.rol_ailesi].push(s);
      });
    }
  });

  // Liderlik auto-detect
  var hasLeadership = experiences.some(function(e) {
    var role = (e.pozisyon || '').toLocaleLowerCase('tr-TR');
    return /müdür|sorumlu|lider|direktör/.test(role);
  });
  if (hasLeadership && leadership.length > 0) {
    aggregate['Liderlik'] = aggregate['Liderlik'] || [];
    leadership.forEach(function(s) {
      if (aggregate['Liderlik'].indexOf(s) === -1) aggregate['Liderlik'].push(s);
    });
  }

  // Brand interests → Sektör ilgisi
  if (brandInterests && brandInterests.length > 0) {
    aggregate['Sektör İlgisi'] = brandInterests.slice(0, 6);
  }

  return Object.keys(aggregate).map(function(cat) {
    return { cat: cat, items: aggregate[cat].slice(0, 6) };
  });
}
```

---

## 3. Sprint 2 Implementation Plan

### Adım 1 — Pillar D Pixel Parity (3 saat)
- [ ] cv-preview.css: avatar 120px, isim letter-spacing 0.12em, section başlık 0.15em, pozisyon italic kaldır, margins +4px
- [ ] profil-cv.js: avatar 32mm, M=20, section başlıkları letter-spacing tweak, pozisyon italic→normal
- [ ] profil-cv-preview.js: diller `<b>key</b>: value` format
- [ ] Tuna görsel review + screenshot karşılaştırma

### Adım 2 — Pillar E Skill Taxonomy v2 (2 saat)
- [ ] profil-core.js: POSITION_SKILLS_MAP + 5 kategori domain
- [ ] profil-cv-preview.js: _buildSkillCategories helper, _renderSkills refactor
- [ ] profil-cv.js generateCV: aynı helper, jsPDF render
- [ ] Test: ht-k067-pdf-turkish.mjs mock data güncelle (Tuna pozisyonu seçilince Tuna CV pattern beceriler çıkmalı)

### Adım 3 — Commit + Tuna review (30 dk)
- [ ] AI-COLLAB.md K-067 Sprint 2 entry
- [ ] Commit + push → live UAT

---

## 4. Açık Sorular (Tuna geldiğinde)

1. **Subtitle:** Header'da pozisyon (italic Üst Düzey Mağaza Müdürü) kalsın mı silinsin mi? Tuna CV'sinde yok ama bizim form'da hedef pozisyon var.
2. **Section başlık dili:** "YETKİNLİKLER" mi "TEMEL BECERİLER" mi? "PROFESYONEL ÖZET" / "PROFESYONEL DENEYİM" Tuna CV'sindeki kısaltma "SUMMARY" / "EXPERIENCE" — Türkçe "ÖZET" / "DENEYİM" yeter mi?
3. **POSITION_SKILLS_MAP genişletme:** İlk 15 pozisyon yeter mi yoksa Tuna 30+ pozisyon ister mi? (RETAIL_POSITIONS toplam 30+ pozisyon var, hepsine ekleyebiliriz)
4. **Tuna görsel review:** Tuna CV PDF'i ile yeni HelloTalent CV PDF'i yan yana koyup kararlaştıralım mı?
