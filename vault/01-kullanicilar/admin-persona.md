# Admin Persona

## Kim?
HelloTalent operasyon ekibi — 3 kişi + kurucu (Tuna).

---

## Ekip Yapısı

| Rol | Sorumluluk Alanı |
|-----|------------------|
| **Tuna (CEO/Founder)** | Genel yönetim, strateji, ürün kararları |
| **Kişi 1 — İşveren Yöneticisi** | Lead takibi, işveren onboarding desteği, satış |
| **Kişi 2 — Aday Yöneticisi** | Aday kalitesi, profil tamamlama teşviki, destek |
| **Kişi 3 — Operasyon** | Kampanya destek, sistem sağlığı, satışlar, teknik destek |

---

## Admin Panel İhtiyaçları

### Tüm Ekip İçin (Dashboard Ana Sayfa)
- Toplam aday sayısı + son 7/30 gün trend
- Toplam işveren lead sayısı + onay bekleyenler
- Aktif/pasif aday oranı
- Profil tamamlama oranı (ortalama %)
- Segment dağılımı (kaç luxury, kaç mass market, vb.)
- Sistem sağlığı (email pipeline, hata sayısı)

### Kişi 1 — İşveren Yöneticisi
- **Mini CRM:** Gelen lead listesi (isim, şirket, email, tarih, durum)
- Lead durumu: yeni / iletişime geçildi / demo gösterildi / kayıt oldu / reddedildi
- İşveren onay kuyruğu (şirket bilgileri, domain kontrolü)
- Aktif işveren listesi (son giriş, pozisyon sayısı, mesaj sayısı)
- İşveren health score: giriş yapıyor mu, pozisyon açıyor mu, aday görüntülüyor mu

### Kişi 2 — Aday Yöneticisi
- Aday listesi (filtrelenebilir: segment, il, tamamlama %, aktiflik)
- Düşük tamamlama oranı uyarısı (profil < %45)
- CV'siz aday listesi
- Stale profil tespiti (30+ gün güncelleme yok)
- Destek ticket'ları (aday tarafı)
- Coach içerik moderasyonu

### Kişi 3 — Operasyon
- Kampanya yönetimi (onay/ret)
- Email pipeline durumu (pending/failed/sent)
- Sistem hata log'ları
- Newsletter gönderim durumu
- Ödeme durumu (gelecek: iyzico/Stripe)
- Satış raporları (MRR, yeni müşteri, churn)

---

## Admin Onay Akışı (İşveren)

```
Şirket kayıt olur → Admin kuyruğuna düşer → Admin inceler
  │
  ├─ ONAYLA → Şirket aktif, ödeme kesilir, erişim açılır
  │
  ├─ REDDET → Provizyon iptal, üyelik iptal, sebep mail gider
  │    └─ Outsourcing firması, sahte kayıt, uygunsuz
  │
  └─ BEKLEMede → Ek bilgi istenir (telefon/mail ile)
```

---

## Admin Araçları (Mevcut)

| Araç | Durum | Dosya |
|------|-------|-------|
| Aday listesi | Canlı | admin.html |
| İşveren listesi | Canlı | admin.html |
| Coach yönetimi | Canlı | admin.html |
| Destek ticket'ları | Canlı | admin.html |
| Ops health (email) | Canlı | admin-ops-health.js |
| Kampanya onay | Kısmen | admin-campaigns.js |
| **Mini CRM (lead)** | **YOK — İnşa edilecek** | — |
| **İşveren onay kuyruğu** | **YOK — İnşa edilecek** | — |
| **Newsletter yönetimi** | **YOK — İnşa edilecek** | — |
| **Satış raporları** | **YOK — Gelecek** | — |

---

*İlişkili: [[admin-journey]], [[mvp-roadmap]]*
