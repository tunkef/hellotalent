# HelloTalent — Mobil Uygulama Strateji Analizi

> Tarih: 6 Nisan 2026
> Hazırlayan: Claude (CTO) + Web Research
> Karar: K028

---

## Problem

HelloTalent ileride Android ve iOS uygulaması olarak da çalışacak. iOS PWA'ları ciddi şekilde kısıtlıyor. Mevcut vanilla HTML/CSS/JS stack'ten mobil'e geçiş stratejisi belirlenmeli.

---

## iOS PWA Kısıtlamaları (2025-2026)

| Kısıtlama | Detay | HelloTalent Etkisi |
|-----------|-------|-------------------|
| Push notification | Sadece home screen'e eklenmiş PWA'larda çalışır (iOS 16.4+) | Çoğu kullanıcı eklemez → bildirim gitmez |
| Background sync | Desteklenmiyor. Periodic Background Sync yok | Yeni aday/mesaj bildirimi yapılamaz |
| Storage | 50MB/origin limiti + 7 gün açılmazsa cache silinir | CV dosyaları + offline veri kaybolur |
| WebKit zorunluluğu | Tüm iOS tarayıcıları WebKit kullanmak zorunda | Apple hangi API'yi isterse onu verir |
| AB PWA krizi (2024) | Apple AB'de PWA standalone modu kaldırmaya çalıştı, geri aldı | Platform riski — Apple istediğinde kısıtlayabilir |

**Sonuç:** Talent marketplace için PWA tek başına yetersiz.

---

## Değerlendirilen Seçenekler

### 1. Capacitor (Web Wrapper)

Mevcut vanilla HTML/CSS/JS kodunu native shell'e sarar.

- **Rewrite:** Hayır — mevcut kod aynen kullanılır
- **Süre:** 2-4 hafta
- **Maliyet:** ~$2-5K (outsource) veya DIY
- **Native erişim:** Push (APNs/FCM), biometrics, kamera, dosya sistemi
- **App Store:** Geçer (native plugin kullandığın sürece "sadece wrapper" olmaz)
- **Performans:** WebView. Form/liste/arama için yeterli, ağır animasyonlarda sınırlı
- **Capacitor vs Cordova:** Cordova fiilen ölü. Yeni projelerin %70'i Capacitor kullanıyor
- **Risk:** Apple "minimal functionality" red riski (native feature ekleyerek azaltılır)

### 2. React Native + Expo (Mobil Rewrite)

Web: Next.js (React) + Mobil: React Native/Expo → Ortak Supabase backend.

- **Rewrite:** Evet — tüm frontend sıfırdan
- **Süre:** 3-6 ay (web + mobil birlikte)
- **Maliyet:** ~$10-30K (outsource) veya 3-6 ay full-time
- **Native feel:** Yüksek — gerçek native component'ler
- **SEO:** Next.js ISR ile iş ilanları statik sayfa → Google'da iyi sıralama
- **Supabase:** First-class SDK desteği, Expo quickstart mevcut
- **OTA updates:** EAS Update ile App Store review'sız JS güncellemesi
- **Ecosystem:** En büyük — binlerce library, kolay developer bulma
- **New Architecture (2025):** Bridge tamamen kaldırıldı, %43 hızlı cold start, %39 hızlı render

### 3. Flutter (Elenmiş)

- **Eleme sebebi 1:** Dart öğrenme eğrisi (2-8 hafta), Türkiye'de developer bulmak zor
- **Eleme sebebi 2:** Web output'u SEO'ya uygun değil (Canvas render, semantic DOM yok)
- **Eleme sebebi 3:** Mevcut JS ekosistemi ile hiç örtüşmüyor

### 4. Tauri v2 Mobile (Elenmiş)

- **Eleme sebebi:** Mobil desteği henüz olgun değil, ekosistem çok küçük, plugin kütüphanesi yetersiz
- **Not:** Desktop-first uygulamalar için iyi olabilir, marketplace için riskli

---

## Strateji Kararı: 2 Fazlı Yaklaşım

```
┌─────────────────────────────────────────────────────────┐
│  FAZ 1 — Hızlı App Store Varlığı                       │
│  Zaman: MVP 2 bitene kadar                              │
│  Yöntem: Capacitor ile mevcut kodu sar                  │
│                                                         │
│  • 2-4 hafta iş                                         │
│  • App Store'da HelloTalent var                         │
│  • Gerçek push notification                             │
│  • Biometrics login                                     │
│  • Mevcut vanilla JS'e dokunmadan                       │
│  • Product-market fit test edilir                        │
├─────────────────────────────────────────────────────────┤
│  FAZ 2 — Native Rewrite                                 │
│  Zaman: MVP 3 / Growth aşamasında                       │
│  Yöntem: React Native + Expo (mobil) + Next.js (web)    │
│  Tetikleyici: Gelir akışı + kullanıcı tabanı oluşmuş   │
│                                                         │
│  • Web: Next.js ISR ile SEO-first marketplace           │
│  • Mobil: Expo ile native performans                    │
│  • Ortak: Supabase backend DEĞİŞMEZ                    │
│  • Ortak: Design token'lar paylaşılır                   │
└─────────────────────────────────────────────────────────┘
```

### Faz 2'ye Geçiş Kriterleri

Aşağıdakilerin TÜMÜ sağlandığında:
1. Her segmentte 50+ aday var
2. İşveren dönüşüm oranı test edildi
3. iyzico/Stripe aktif, gelir akıyor
4. WebView performansı kullanıcı şikayeti yaratıyor

### Neden Hemen React'a Geçilmiyor

1. MVP 1 henüz bitmedi — framework değiştirmek 3-6 ay kayıp
2. Product-market fit kanıtlanmadı
3. Capacitor ile sıfır rewrite maliyetiyle App Store'a çıkılabilir
4. Gelir akışı yok — rewrite bütçesi mevcut değil

---

## Teknoloji Notları

### Capacitor (Faz 1)
- Modern Cordova halefi, Ionic tarafından geliştiriliyor
- Native iOS/Android projesine tam erişim (Swift/Kotlin yazabilirsin)
- Mevcut `dist` klasörünü sarma prensibi
- Supabase JS SDK aynen çalışır

### React Native + Expo (Faz 2)
- Expo artık React Native'in **resmi önerilen** yolu
- EAS Build: Bulut build servisi (Xcode/Android Studio gerektirmez)
- EAS Update: App Store review'sız OTA güncelleme (sadece JS)
- New Architecture (2025): TurboModules + Fabric = %43 hızlı start

### Next.js (Faz 2 Web)
- ISR ile iş ilanları statik sayfa → SEO
- API routes ile server-side logic
- Supabase SSR desteği (`@supabase/ssr` paketi)

---

*İlişkili: [[mvp-roadmap]], [[sistem-mimarisi]], [[karar-defteri]]*
