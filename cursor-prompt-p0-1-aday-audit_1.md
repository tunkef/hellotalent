# GÖREV: aday.html UX Audit & Fix

Bu dosyayı (aday.html) baştan sona audit et ve aşağıdaki sorunları tespit edip düzelt. Her fix'i ayrı ayrı yap, her birini açıkla.

## 1. CONSOLE ERROR TARASI
- Supabase CDN yüklenme sırası: script tag'lar sayfanın en altında ama `getSupa()` çağrıldığında CDN hazır mı? `typeof supabase === 'undefined'` guard'ı var ama console.warn ile sessizce fail ediyor — kullanıcıya bir feedback vermeli.
- `switchTab`, `submitKayit`, `submitGiris` fonksiyonları global scope'ta — strict mode veya name collision riski kontrol et.
- `getSupa().auth.getSession()` çağrısı (satır 966) — eğer Supabase CDN yavaş yüklenirse null döner. Error handling ekle.

## 2. FORM FONKSİYONALİTE
- Kayıt formu: `submitKayit` şifre minimum 6 karakter HTML'de `minlength="6"` ile var ama JS tarafında validation yok. Server error geldiğinde kullanıcıya anlamlı Türkçe mesaj göster.
- Giriş formu: `submitGiris` error mesajı hardcoded "E-posta veya şifre hatalı" — Supabase'in döndüğü hataya göre daha spesifik ol (örn: "Bu e-posta ile kayıt bulunamadı" vs "Şifre hatalı").
- KVKK checkbox: `required` var ama custom validation mesajı yok. Browser default mesajı İngilizce çıkabilir — Türkçe `setCustomValidity` ekle.
- Telefon input: Herhangi bir format validation yok. Türk telefon formatı (05XX XXX XXXX) için mask veya pattern ekle.
- `?mode=register` URL param kontrol ediliyor (satır 976) ama `?tab=giris` kontrol edilmiyor — giris.html'den yönlendirme geldiğinde giriş tabı açılmalı.

## 3. CTA BUTTON YÖNLENDIRME
- `href="#kayit"` anchor link'leri (satır 395, 603, 807, 904): Scroll davranışını test et. `#kayit` div'i form-card'ın parent'ı ama scroll offset header yüksekliğini (64px desktop, 56px mobile) hesaba katmıyor olabilir — `scroll-margin-top` veya `scroll-padding-top` ekle.
- Premium CTA button (satır 651): `onclick` ile `scrollIntoView` kullanıyor — bu `href="#kayit"` ile tutarsız. Birini standart yap.
- "Kariyer Rotasını Keşfet" linkleri `kariyer.html`'e gidiyor — doğru.
- Final CTA'daki "Profil Oluştur" linki `href="#kayit"` — doğru ama inline style ile font-size override var, bunu class'a taşı.

## 4. RESPONSIVE (390×844 iPhone)
- Hero section: `grid-template-columns: 1fr 1fr` desktop'ta güzel ama 900px altında 1fr'ye düşüyor. Form card'ın mobile'da padding'i `28px 20px` — yeterli mi kontrol et.
- Steps grid: 1024px altında tek kolon — ok.
- Features grid: 1024px altında tek kolon — ok ama feature-card'lar `flex-direction: column` oluyor, icon ve text arasındaki gap yeterli mi?
- Compare section: 768px altında tek kolon — ok.
- Dashboard teaser: Mobile'da `dt-sidebar` gizleniyor, `dt-stats` 3 kolon kalıyor — çok dar olabilir 390px'te. `grid-template-columns: 1fr 1fr 1fr` yerine `1fr` yapılmalı mı kontrol et.
- Brand marquee: Animation smooth mu? `will-change: transform` eksik olabilir.
- Tüm butonların min-height 48px ve touch target 44×44px olduğunu doğrula.
- Input'larda `font-size: 16px` var mı? (iOS zoom prevention)

## 5. VİZUAL TUTARLILIK
- Renk kullanımı: Tüm `var(--verm)`, `var(--navy)`, `var(--border)` referansları shared.css `:root` ile uyumlu mu?
- Emoji icon'lar (👤, ⭐, 📄, 🔒, 📚, 🔔): Platform'lar arası tutarsız render olur. SVG icon'lara geçiş düşün ama şu an sadece flagle, değiştirme.
- Font loading: `font-display: swap` Google Fonts URL'de belirtilmemiş — `&display=swap` parametre var mı kontrol et.
- `hero-outer::before` ve `::after` decorative circles: Mobile'da overflow hidden çalışıyor mu?

## 6. SEO & ACCESSIBILITY
- `og:image` → `https://hellotalent.ai/og-image.png` — bu dosya gerçekten var mı? 404 dönüyorsa düzelt.
- Form input'larda `label` tag eksik — screen reader uyumu için `aria-label` veya explicit label ekle.
- Hero trust items (`✓ CV zorunlu değil` vb.): Semantic markup yok — `role="list"` ve `role="listitem"` eklenebilir.
- `alt` attribute eksik image'lar var mı kontrol et (bu sayfada image yok gibi görünüyor ama double-check).
- Page heading hierarchy: Tek `h1` var (hero-title) — doğru. `h2`'ler section-title'larda — doğru. `h4`'ler feature-card'larda — `h3` atlıyor, hierarchy bozuk.

## 7. PERFORMANCE
- Supabase CDN (`@supabase/supabase-js@2`): UMD bundle yükleniyor — sadece auth kullanılıyor. Bundle size gereksiz büyük olabilir ama şu an alternatif yok (vanilla JS projesi).
- Brand marquee animation: `@keyframes scroll` transform kullanıyor — GPU-accelerated, ok. `will-change: transform` ekle.
- Google Fonts: 3 font family tek request'te — ok ama `&display=swap` var mı?

## KURALLAR
- Sadece aday.html dosyasını düzenle
- shared.css ve shared.js'ye DOKUNMA
- Turkish UI dilini koru — kesinlikle "röportaj" kullanma
- Brand fontlarını değiştirme (Bricolage Grotesque, Plus Jakarta Sans, DM Mono)
- Her fix'i HTML comment ile işaretle: `<!-- FIX: açıklama -->`
- Emoji icon'ları şu an DEĞİŞTİRME, sadece raporda flagle
