# HelloTalent — Feature Map

## Genel Bakış

```
                    ┌─────────────────────────────────┐
                    │         hellotalent.ai           │
                    │      Gate: Aday mı? İşveren mi?  │
                    └──────────┬───────────┬───────────┘
                               │           │
                    ┌──────────▼──┐   ┌────▼──────────┐
                    │  ADAY TARAFI │   │ İŞVEREN TARAFI │
                    └──────────┬──┘   └────┬──────────┘
                               │           │
              ┌────────────────┼─────┐     │
              │                │     │     │
         ┌────▼────┐  ┌───────▼┐ ┌──▼──┐  │
         │  Profil  │  │ Studio │ │Inbox│  │
         │Dashboard│  │  Koç   │ │Mesaj│  │
         └────┬────┘  └───────┬┘ └──┬──┘  │
              │               │     │     │
    ┌─────────┼───────┐       │     │     │
    │         │       │       │     │     │
┌───▼──┐ ┌───▼──┐ ┌──▼──┐    │     │  ┌──▼──────────┐
│Marka │ │Yetkin│ │Tekli│    │     │  │  İK Panel   │
│Keşif │ │lik   │ │fler │    │     │  │  (ik.html)  │
└──────┘ └──────┘ └─────┘    │     │  └──┬──────────┘
                              │     │     │
                    ┌─────────┘     │  ┌──▼──────────┐
                    │               │  │ Pozisyon Aç  │
                    │               │  │ Aday Öner    │
                    │               │  │ Kampanya     │
                    │               │  │ Team Yönet   │
                    │               │  └──────────────┘
                    │               │
              ┌─────▼───────────────▼──┐
              │      ADMIN PANEL       │
              │  Aday / İşveren / CRM  │
              │  Coach / Ops / Sales   │
              └────────────────────────┘
```

---

## Aday Tarafı Feature'ları

### Core (Canlı)
| Feature | Dosya | Durum |
|---------|-------|-------|
| 4 adımlı onboarding wizard | profil-wizard.js | Canlı |
| Profil dashboard (Genel Bakış) | profil-genel.js | Canlı |
| Profil tamamlama kartı | profil-summary.js | Canlı |
| Deneyim/eğitim/dil/sertifika CRUD | profil-data.js, profil-ui.js | Canlı |
| Avatar yükleme | profil-ui.js | Canlı |
| CV yükleme/indirme | profil-cv.js | Canlı |
| Lokasyon tercihleri (il/ilçe) | profil-locations.js | Canlı |
| Ayarlar paneli | profil-settings.js | Canlı |
| Dark mode | profil.css | Canlı |
| Cmd+K komut paleti | profil-events.js | Canlı |

### Marka & Yetkinlik (Canlı)
| Feature | Dosya | Durum |
|---------|-------|-------|
| 96 marka keşif grid | profil-markalar.js | Canlı |
| Marka takip (follow) | profil-markalar.js | Canlı |
| 29 yetkinlik framework | profil-yetkinlik.js | Canlı |
| 34 rol haritası | profil-yetkinlik.js | Canlı |

### Studio & Gelişim (Canlı)
| Feature | Dosya | Durum |
|---------|-------|-------|
| STAR+T pratik sistemi | profil-studio.js | Canlı |
| Streak sistemi | profil-studio.js | Canlı |
| AI değerlendirme (1 hak/beta) | journal-feedback Edge Fn | Canlı |
| AI CV optimize (1 hak/beta) | cv-optimize Edge Fn | Canlı |
| Badge sistemi (9 rozet) | profil-studio.js | Canlı |
| Mini eğitim dashboard | profil-studio.js | Canlı |
| Coach içerikleri | coach-studio.html | Canlı |

### Sosyal & İletişim (Canlı)
| Feature | Dosya | Durum |
|---------|-------|-------|
| Mesaj kutusu (bi-directional) | profil-inbox.js | Canlı |
| Kim Baktı | profil-kimbakti.js | Canlı |
| Beni Öner toggle | profil-visibility.js | Canlı |
| Destek merkezi + ticket | profil-destek.js | Canlı |
| Teklifler bölümü | profil-teklifler.js | Canlı |

### Premium Gating (Kısmen Canlı)
| Feature | Dosya | Durum |
|---------|-------|-------|
| Premium gate UI | profil-premium.js | Canlı (beta free) |
| Beni Öne Çıkar | profil-visibility.js | Canlı (beta free) |
| AI CV (3x/ay limit) | profil-cv.js | Beta: 1 hak |
| AI Yetkinlik (sınırsız premium) | profil-studio.js | Beta: 1 hak |
| Premium teklifler | profil-teklifler.js | Kısmen |

---

## İşveren Tarafı Feature'ları

### Mevcut (ik.html — kısmen inşa edilmiş)
| Feature | Durum | Not |
|---------|-------|-----|
| Aday arama (search RPC) | Canlı | 12 sinyalli skorlama var |
| Aday filtreleri | Canlı | Segment, rol, deneyim, lokasyon |
| Mesajlaşma | Canlı | DM + reply |
| Kampanya wizard | DB hazır | Frontend var, end-to-end test gerekli |
| Team system | DB hazır | company_teams + invitations tabloları var |
| Şirket profili | Kısmen | Onboarding flow eksik |

### İnşa Edilecek (MVP 1 & 2)
| Feature | MVP | Öncelik |
|---------|-----|---------|
| Lead form → mail + admin CRM | MVP 1 | Yüksek |
| Demo ekranı (14 gün, fake data) | MVP 1 | Yüksek |
| Newsletter sistemi | MVP 1 | Yüksek |
| Pozisyon açma → aday önerisi akışı | MVP 2 | Kritik |
| Aday görüntüleme limiti | MVP 2 | Kritik |
| Admin onay akışı | MVP 2 | Kritik |
| Provizyon + ödeme | MVP 2 | Yüksek |
| Employer branding kampanya | MVP 2 | Orta |
| Takipçi sayısı (total) | MVP 2 | Düşük |

---

## Admin Tarafı Feature'ları

### Mevcut (admin.html)
| Feature | Durum |
|---------|-------|
| Aday listesi | Canlı |
| İşveren listesi | Canlı |
| Coach yönetimi | Canlı |
| Destek ticket'ları | Canlı |
| Ops health (email) | Canlı |
| Kampanya onay | Kısmen |

### İnşa Edilecek
| Feature | MVP | Öncelik |
|---------|-----|---------|
| Mini CRM (lead tracking) | MVP 1 | Yüksek |
| Segment dağılım dashboard | MVP 1 | Orta |
| İşveren onay kuyruğu | MVP 2 | Kritik |
| Aday kalite dashboard | MVP 2 | Orta |
| Newsletter yönetimi | MVP 1 | Yüksek |
| Satış raporları | Gelecek | Düşük |

---

## Platform Altyapı (Launch Blocker)

| Feature | MVP | Öncelik | Not |
|---------|-----|---------|-----|
| Analytics event tracking (Supabase) | MVP 1 | **BLOCKER** | Funnel ölçümü, feature kullanımı |
| Sayfa analytics (Plausible/Umami/GA) | MVP 1 | **BLOCKER** | Trafik, bounce rate, session |
| KVKK uyum (aydınlatma + rıza) | MVP 1 | **BLOCKER** | Avukat görüşmesi sonrası |
| Güvenlik monitoring (Supabase alert) | MVP 1 | **BLOCKER** | RLS audit, error tracking |
| İşveren demo ekranı (ik-demo.js) | MVP 1 | **Kritik** | Fake data, 14 gün |

---

*İlişkili: [[mvp-roadmap]], [[kullanici-yolculugu-aday]], [[kullanici-yolculugu-isveren]]*
