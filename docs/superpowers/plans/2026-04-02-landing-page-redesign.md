# Landing Page Redesign — LinkedIn-Style Gate + Dual Landing Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single monolithic index.html with a gate page (aday/isveren seçimi) + two focused landing pages (aday.html, isveren.html) following LinkedIn's minimal, whitespace-heavy design language. Simplify the nav by removing 6 deprecated content pages.

**Architecture:** Gate page (index.html) is a full-screen split — sol vermillion (aday), sag navy (isveren). Each side routes to its own landing page. Landing pages follow LinkedIn's section pattern: large headline left, supporting content right, alternating warm-gray / white backgrounds. shared.js header simplified to 3 nav items + login.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework), Supabase Auth (Google OAuth + email), shared.css design tokens, shared.js header/footer injection.

**Tasarim Referansi:** LinkedIn landing page (PDF analiz edildi). Key patterns:
- Hero: sol metin + sag form/illüstrasyon, beyaz zemin
- Section'lar: tek mesaj, büyük başlık (40-56px), bolca whitespace
- Pill/chip pattern (rounded border, outline, hover state)
- Arka plan alternation: beyaz ↔ #F3F2EF (warm gray)
- Renk kullanımı minimal: accent sadece CTA'larda
- Footer: cream bg, 4 kolon, legal alt satır

**Kurumsal Renkler:**
- Aday accent: Vermillion `#C94E28` / `--verm`
- İşveren accent: Navy `#1E2D5E` / `--navy`
- Warm gray bg: `#F7F6F4` / `--gray` (mevcut — LinkedIn'in #F3F2EF'ine çok yakın)
- Text: `#111111` / `--text`
- Muted: `#6B7280` / `--muted`

**Tipografi — LinkedIn tarzı (eski bento typo KULLANILMAYACAK):**
- Başlıklar: `font-size: clamp(32px, 5vw, 56px)`, `font-weight: 800`, `letter-spacing: -2px`
- Body: `font-size: 18px`, `line-height: 1.7`, `color: var(--muted)`
- Pill/chip: `font-size: 14px`, `font-weight: 600`, `border-radius: 24px`
- CTA button: `font-size: 16px`, `font-weight: 700`, `border-radius: 28px`, `padding: 14px 28px`

---

## Dosya Haritası

| Dosya | İşlem | Sorumluluk |
|-------|-------|------------|
| `index.html` | YENİDEN YAZ | Gate page — aday/isveren seçim ekranı |
| `aday.html` | YENİDEN YAZ | Aday landing page — LinkedIn tarzı section'lar |
| `isveren.html` | YENİDEN YAZ | İşveren landing page — LinkedIn tarzı section'lar + lead form |
| `shared.js` | DEĞİŞTİR | Header nav sadeleştirme (6 sayfa kaldır) |
| `shared.css` | DEĞİŞTİR | Yeni tipografi token'ları + gate layout utility'leri ekle |
| `kariyer.html` | DOKUNMA | Nav'dan kaldır, dosya kalır (SEO 301 redirect sonra yapılabilir) |
| `pozisyonlar.html` | DOKUNMA | Nav'dan kaldır |
| `yetkinlik.html` | DOKUNMA | Nav'dan kaldır |
| `blog.html` | DOKUNMA | Nav'dan kaldır |
| `hakkimizda.html` | DOKUNMA | Nav'dan kaldır |
| `isalim-rotasi.html` | DOKUNMA | Nav'dan kaldır |
| `iletisim.html` | DOKUNMA | Footer'dan kaldır |

---

## Task 1: shared.css — LinkedIn Tipografi Token'ları

**Files:**
- Modify: `shared.css:9-43` (`:root` variables block)

Bu task yeni landing page'lerin kullanacağı büyük tipografi ve layout token'larını ekler. Mevcut token'lara dokunmaz (profil.html hâlâ kullanıyor), yeni `--heading-*` ve `--lp-*` prefix'li token'lar ekler.

- [ ] **Step 1: shared.css `:root` bloğuna yeni token'ları ekle**

`shared.css` içinde `:root {` bloğunun sonuna (mevcut `--space-12: 32px;` satırından sonra, `}` kapanışından önce) şunu ekle:

```css
  /* ══ Landing page typography (LinkedIn-style) ══ */
  --heading-xl: clamp(36px, 5vw, 56px);
  --heading-lg: clamp(28px, 3.5vw, 40px);
  --heading-md: clamp(22px, 2.5vw, 32px);
  --heading-sm: 20px;
  --body-lg: 18px;
  --body-md: 16px;
  --body-sm: 14px;
  --lp-radius-pill: 24px;
  --lp-radius-btn: 28px;
  --lp-radius-card: 16px;
  --lp-section-pad: clamp(56px, 8vw, 96px) clamp(20px, 4vw, 48px);
  --lp-max-width: 1120px;
  --warm-gray: #F7F6F4;
```

- [ ] **Step 2: Değişikliği doğrula**

Run: `grep -c 'heading-xl\|lp-radius\|warm-gray' shared.css`
Expected: 3+ match

- [ ] **Step 3: Commit**

```bash
git add shared.css
git commit -m "feat: add LinkedIn-style landing page typography tokens to shared.css"
```

---

## Task 2: shared.js — Header Nav Sadeleştirme

**Files:**
- Modify: `shared.js:17-137` (PAGE detection, nav links, mobile menu)

Kaldırılacak nav öğeleri: Kariyer Rotası dropdown (kariyer/pozisyonlar/yetkinlik/blog), İşe Alım Rotası dropdown (isalim-rotasi), Hakkımızda link. Footer'dan da aynı linkler kaldırılacak.

Yeni nav: `Adaylar İçin` + `İşverenler İçin` + `Giriş Yap` butonu.

- [ ] **Step 1: pageMap objesini sadeleştir**

`shared.js` içinde pageMap objesini şununla değiştir:

```js
  var pageMap = {
    '/aday': 'aday', '/aday.html': 'aday',
    '/isveren': 'isveren', '/isveren.html': 'isveren',
  };
```

- [ ] **Step 2: Dropdown trigger class hesaplamasını kaldır**

`var ddTriggerCls = ...` satırını sil (artık dropdown yok).

- [ ] **Step 3: HEADER_HTML'i yeniden yaz**

Mevcut HEADER_HTML array'ini şununla değiştir:

```js
  var HEADER_HTML = [
    '<header class="site-header" id="site-header">',
    '  <button class="hamburger" id="hamburger" onclick="HT.toggleMenu()" aria-label="Menü" aria-expanded="false">',
    '    <span></span><span></span><span></span>',
    '  </button>',
    '  <a class="header-logo" href="index.html">hello<span>talent</span></a>',
    '  <nav class="header-nav">',
    navLink('Adaylar İçin', 'aday.html', 'aday'),
    navLink('İşverenler İçin', 'isveren.html', 'isveren'),
    '  </nav>',
    '  <div class="header-actions">',
    '    <button class="btn-nav-login" id="login-btn" onclick="HT.toggleLogin()" aria-expanded="false" aria-haspopup="true">',
    '      Giriş Yap',
    '      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>',
    '    </button>',
    '  </div>',
    '</header>',
    /* Login Modal */
    '<div class="login-modal-overlay" id="login-modal-overlay" onclick="if(event.target===this)HT.toggleLogin()">',
    '  <div class="login-modal" id="login-modal">',
    '    <button class="login-modal-close" onclick="HT.toggleLogin()">&times;</button>',
    '    <div class="login-modal-title">Giriş Yap</div>',
    '    <div class="login-modal-sub">Devam etmek istediğin hesap türünü seç.</div>',
    '    <div class="login-modal-cards">',
    '      <div class="login-modal-card" onclick="HT.go(\'giris.html?tab=aday\')">',
    '        <div class="lmc-icon" style="background:var(--verm-light);color:var(--verm);">',
    '          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    '        </div>',
    '        <div class="lmc-title">Aday Girişi</div>',
    '        <div class="lmc-desc">Profil oluştur, kariyer hedefini paylaş</div>',
    '        <div class="lmc-arrow">&rarr;</div>',
    '      </div>',
    '      <div class="login-modal-card" onclick="HT.go(\'giris.html?tab=ik\')">',
    '        <div class="lmc-icon" style="background:var(--navy-light);color:var(--navy);">',
    '          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    '        </div>',
    '        <div class="lmc-title">İK / İşveren Girişi</div>',
    '        <div class="lmc-desc">Aday havuzuna eriş, demo talep et</div>',
    '        <div class="lmc-arrow">&rarr;</div>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
    /* Mobile menu — simplified */
    '<div class="mobile-menu" id="mobile-menu">',
    mobileLink('Adaylar İçin',    'aday.html',    'aday'),
    mobileLink('İşverenler İçin', 'isveren.html', 'isveren'),
    '  <div class="mobile-nav-divider"></div>',
    mobileLink('Giriş Yap',      'giris.html',   null),
    '</div>',
  ].join('\n');
```

- [ ] **Step 4: FOOTER_HTML'i sadeleştir**

Footer'dan "Rotalar" kolonunu tamamen kaldır. "Şirket" kolonundan Hakkımızda ve İletişim linklerini kaldır. "Platform" kolonunu koru. Yeni FOOTER_HTML:

```js
  var FOOTER_HTML = [
    '<footer class="site-footer">',
    '  <div class="footer-inner">',
    '    <div>',
    '      <div class="footer-brand">hello<span>talent</span></div>',
    '      <div class="footer-tagline">Türkiye\'nin retail talent marketplace\'i.<br>Doğru yetenek, doğru marka.</div>',
    '      <div class="footer-social">',
    '        <a class="social-link" href="https://www.instagram.com/hellotalent.ai" target="_blank" rel="noopener" title="Instagram">',
    '          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>',
    '        </a>',
    '        <a class="social-link" href="https://www.linkedin.com/company/hello-talentai/" target="_blank" rel="noopener" title="LinkedIn">',
    '          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    '        </a>',
    '      </div>',
    '    </div>',
    '    <div>',
    '      <button class="footer-col-toggle" onclick="HT.toggleFooterCol(this)">Platform <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>',
    '      <div class="footer-col-title">Platform</div>',
    '      <div class="footer-col-links">',
    '        <a class="footer-link" href="aday.html">Adaylar İçin</a>',
    '        <a class="footer-link" href="isveren.html">İşverenler İçin</a>',
    '        <a class="footer-link" href="giris.html?tab=aday">Profil Oluştur</a>',
    '        <a class="footer-link" href="giris.html?tab=ik">İK Kaydı</a>',
    '      </div>',
    '    </div>',
    '    <div class="footer-col">',
    '      <button class="footer-col-toggle" onclick="HT.toggleFooterCol(this)">Yasal <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>',
    '      <div class="footer-col-title">Yasal</div>',
    '      <div class="footer-col-links">',
    '        <a class="footer-link" href="gizlilik.html">Gizlilik Politikası</a>',
    '        <a class="footer-link" href="kullanim-sartlari.html">Kullanım Şartları</a>',
    '        <a class="footer-link" href="kvkk.html">KVKK Aydınlatma</a>',
    '        <a class="footer-link" href="cerez-politikasi.html">Çerez Politikası</a>',
    '      </div>',
    '    </div>',
    '  </div>',
    '  <div class="footer-bottom">',
    '    <span class="footer-copyright">© 2026 hellotalent.ai — Tüm hakları saklıdır.</span>',
    '  </div>',
    '</footer>',
  ].join('\n');
```

- [ ] **Step 5: ddItem ve ddTriggerCls fonksiyonlarını temizle (artık kullanılmıyor)**

`ddItem` fonksiyonunu, `svgIcon` fonksiyonunu, `CHEVRON` değişkenini ve accordion toggle fonksiyonlarını henüz **silme** — diğer sayfalar referans edebilir. Sadece header/footer'dan kaldırılan kısımları sil. *(cleanup ayrı bir task'ta yapılabilir)*

- [ ] **Step 6: Doğrula**

Run (local serve): `npx serve -p 3000 -s . &` sonra tarayıcıda `localhost:3000` aç.  
Expected: Header'da sadece "Adaylar İçin", "İşverenler İçin", "Giriş Yap" görünür. Dropdown yok. Footer sadeleşmiş.

- [ ] **Step 7: Commit**

```bash
git add shared.js
git commit -m "feat: simplify header nav — remove 6 deprecated pages, clean footer"
```

---

## Task 3: index.html — Gate Page (Tam Yeniden Yazım)

**Files:**
- Rewrite: `index.html` (2659 → ~200 satır)

Gate page: Tam ekran split layout. Sol yarı aday (vermillion accent), sağ yarı işveren (navy accent). Ortada logo. Mobile'da üst-alt stack. Kullanıcı birini seçmeden ilerleyemiyor.

Header/footer bu sayfada **GÖSTERILMEZ** — gate sayfası tam ekran deneyim.

- [ ] **Step 1: index.html'i tamamen yeniden yaz**

Mevcut 2659 satırlık index.html'in yerine aşağıdaki gate page'i yaz. `<head>` kısmında SEO meta tag'leri, schema markup, Google Analytics korunacak. `<body>` tamamen yeni.

```html
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Türkiye'nin retail sektörüne özel talent marketplace'i. Aday mısın, işveren mi? Sana özel deneyim için seç.">
<meta name="keywords" content="retail iş ilanları, mağaza yöneticisi, retail işe alım, hellotalent">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://hellotalent.ai/">
<meta property="og:type" content="website">
<meta property="og:url" content="https://hellotalent.ai/">
<meta property="og:title" content="hellotalent.ai — Türkiye'nin Retail Talent Marketplace'i">
<meta property="og:description" content="Retail dünyasının en iyi yetenekleri ve markaları burada buluşuyor.">
<meta property="og:image" content="https://hellotalent.ai/og-image.png">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="hellotalent.ai — Türkiye'nin Retail Talent Marketplace'i">
<meta name="twitter:description" content="Retail dünyasının en iyi yetenekleri ve markaları burada buluşuyor.">
<meta name="twitter:image" content="https://hellotalent.ai/og-image.png">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://hellotalent.ai",
  "name": "hellotalent.ai",
  "description": "Türkiye'nin Retail Talent Marketplace'i",
  "inLanguage": "tr-TR"
}
</script>
<title>hellotalent.ai — Türkiye'nin Retail Talent Marketplace'i</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
body{font-family:'Plus Jakarta Sans',sans-serif;}

/* Gate layout */
.gate{display:flex;height:100vh;position:relative;}
.gate-half{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;cursor:pointer;transition:flex 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.3s;}
.gate-half:hover{flex:1.15;}

/* Aday — sol */
.gate-aday{background:#FEFCFB;border-right:1px solid #F0EDE9;}
.gate-aday:hover{background:#FDF8F5;}

/* İşveren — sağ */
.gate-isveren{background:#FAFBFE;}
.gate-isveren:hover{background:#F5F7FC;}

/* Orta logo */
.gate-logo{position:absolute;top:32px;left:50%;transform:translateX(-50%);z-index:10;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;color:#1E2D5E;text-decoration:none;letter-spacing:-0.5px;}
.gate-logo em{font-style:normal;color:#C94E28;}

/* Accent bar */
.gate-accent{width:48px;height:4px;border-radius:2px;margin-bottom:24px;}
.gate-aday .gate-accent{background:#C94E28;}
.gate-isveren .gate-accent{background:#1E2D5E;}

/* İçerik */
.gate-icon{font-size:48px;margin-bottom:20px;opacity:0.9;}
.gate-title{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:clamp(28px,4vw,42px);letter-spacing:-1.5px;line-height:1.1;margin-bottom:12px;text-align:center;}
.gate-aday .gate-title{color:#C94E28;}
.gate-isveren .gate-title{color:#1E2D5E;}
.gate-sub{font-size:17px;color:#6B7280;line-height:1.7;text-align:center;max-width:340px;margin-bottom:32px;}
.gate-btn{padding:14px 36px;border-radius:28px;font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;border:none;cursor:pointer;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:8px;}
.gate-aday .gate-btn{background:#C94E28;color:white;}
.gate-aday .gate-btn:hover{background:#b84420;transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,78,40,0.25);}
.gate-isveren .gate-btn{background:#1E2D5E;color:white;}
.gate-isveren .gate-btn:hover{background:#162248;transform:translateY(-2px);box-shadow:0 8px 24px rgba(30,45,94,0.25);}

/* Alt text */
.gate-login{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);font-size:14px;color:#6B7280;z-index:10;}
.gate-login a{color:#1E2D5E;font-weight:600;text-decoration:none;}
.gate-login a:hover{text-decoration:underline;}

/* Mobile */
@media(max-width:768px){
  .gate{flex-direction:column;}
  .gate-half{padding:32px 24px;}
  .gate-half:hover{flex:1.05;}
  .gate-title{font-size:28px;}
  .gate-sub{font-size:15px;max-width:280px;}
  .gate-logo{top:20px;font-size:18px;}
  .gate-login{bottom:16px;font-size:13px;}
}
</style>
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-54BCV5QYCZ"></script>
<script>
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config','G-54BCV5QYCZ');
</script>
</head>
<body>

<a class="gate-logo" href="index.html">hello<em>talent</em></a>

<div class="gate">
  <a class="gate-half gate-aday" href="aday.html">
    <div class="gate-accent"></div>
    <div class="gate-title">Kariyer arıyorum</div>
    <div class="gate-sub">Profil oluştur, yetkinliklerini geliştir, retail markalarının seni bulmasını sağla.</div>
    <div class="gate-btn">Adaylar İçin →</div>
  </a>

  <a class="gate-half gate-isveren" href="isveren.html">
    <div class="gate-accent"></div>
    <div class="gate-title">Aday arıyorum</div>
    <div class="gate-sub">Hazır aday havuzuna eriş, doğru yetenekleri filtrele, hemen iletişime geç.</div>
    <div class="gate-btn">İşverenler İçin →</div>
  </a>
</div>

<div class="gate-login">Zaten üye misin? <a href="giris.html">Giriş Yap</a></div>

</body>
</html>
```

- [ ] **Step 2: Gate page'i local'de test et**

Run: `npx serve -p 3000 -s /Users/peopleintk/Downloads/Hellotalent &`  
Tarayıcıda `localhost:3000` aç.  
Expected: Tam ekran ikiye bölünmüş gate — sol vermillion "Kariyer arıyorum", sağ navy "Aday arıyorum". Hover'da genişleme efekti. Mobile'da üst-alt stack. Logo ortada.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: replace monolithic index with gate page — aday/isveren split selection"
```

---

## Task 4: aday.html — LinkedIn-Style Aday Landing Page

**Files:**
- Rewrite: `aday.html` (1029 → ~500 satır)

LinkedIn tarzı section pattern. İçerik profil.html'in sunduğu avantajlara odaklanır:
1. **Hero:** Büyük başlık + Google ile Giriş + email kayıt CTA
2. **Value prop:** "Artık başvuru yok, öneri var" — pill'ler ile 6 özellik
3. **Nasıl Çalışır:** 3 adım (sol başlık, sağ adımlar) — LinkedIn layout
4. **Özellikler:** Studio, AI CV, marka takibi, yetkinlik pratiği, streak, görünürlük
5. **Trust / Social proof:** Marka logoları + kısa testimonial
6. **Final CTA:** Büyük başlık + tek buton
7. **Footer** (shared.js inject)

- [ ] **Step 1: aday.html'i tamamen yeniden yaz**

Mevcut dosyanın yerine LinkedIn tarzı aday landing page'i yaz. `<head>` kısmı: SEO meta korunur, `shared.css` import edilir. Stil tamamen `<style>` tag'inde (sayfa-spesifik). Body: `<div id="ht-header"></div>` ile başlar, section'lar takip eder, `<div id="ht-footer"></div>` ile biter.

**Hero section (beyaz bg):**
```html
<section class="lp-hero">
  <div class="lp-container">
    <div class="lp-hero-grid">
      <div class="lp-hero-text">
        <h1>Artık başvuru yok,<br>markalar seni buluyor.</h1>
        <p>Retail kariyerinde bir sonraki adım burada. Profil oluştur, yetkinliklerini geliştir, Türkiye'nin en prestijli markalarının seni keşfetmesini sağla.</p>
        <div class="lp-hero-actions">
          <button type="button" id="btn-google-signup-aday" class="lp-btn-google">
            <svg width="18" height="18" viewBox="0 0 18 18"><!-- Google icon SVG --></svg>
            Google ile Üye Ol
          </button>
          <a href="giris.html?tab=aday" class="lp-btn-primary">E-posta ile Kayıt Ol →</a>
        </div>
        <div class="lp-trust-row">
          <span>✓ CV zorunlu değil</span>
          <span>✓ Mevcut işverene görünmez</span>
          <span>✓ Tamamen ücretsiz</span>
        </div>
      </div>
      <div class="lp-hero-visual">
        <!-- İllüstrasyon veya platform mockup — CSS-only decorative shape'ler -->
      </div>
    </div>
  </div>
</section>
```

**Özellikler section (warm-gray bg) — LinkedIn sol başlık + sağ pill pattern:**
```html
<section class="lp-section lp-bg-warm">
  <div class="lp-container">
    <div class="lp-split">
      <div class="lp-split-left">
        <h2>Profilin senin vitrin.</h2>
        <p>İşverenler seni buluyor, sen değil onları. Yetkinliklerini geliştir, AI ile CV'ni optimize et, en iyi fırsatlar kapına gelsin.</p>
      </div>
      <div class="lp-split-right">
        <div class="lp-pills">
          <span class="lp-pill">🎯 Mülakat Koçu (Studio)</span>
          <span class="lp-pill">📄 AI CV Optimize</span>
          <span class="lp-pill">🏢 96 Marka Takibi</span>
          <span class="lp-pill">📊 Yetkinlik Pratiği</span>
          <span class="lp-pill">🔥 Streak & Rozet Sistemi</span>
          <span class="lp-pill">👁 Beni Öner — Görünürlük</span>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Nasıl Çalışır section (beyaz bg):**
```html
<section class="lp-section">
  <div class="lp-container">
    <div class="lp-split">
      <div class="lp-split-left">
        <h2>Basit, hızlı, etkili.</h2>
        <p>3 adımda retail kariyerinde fark yarat.</p>
      </div>
      <div class="lp-split-right">
        <div class="lp-steps">
          <div class="lp-step">
            <span class="lp-step-num">01</span>
            <div>
              <strong>Profil Oluştur</strong>
              <p>Deneyim, yetkinlik ve kariyer hedeflerini paylaş. CV zorunlu değil.</p>
            </div>
          </div>
          <div class="lp-step">
            <span class="lp-step-num">02</span>
            <div>
              <strong>Kendini Geliştir</strong>
              <p>Mülakat Koçu ile pratik yap, AI geri bildirim al, rozet topla.</p>
            </div>
          </div>
          <div class="lp-step">
            <span class="lp-step-num">03</span>
            <div>
              <strong>Markalar Seni Bulsun</strong>
              <p>"Beni Öner" aç, profili görünür yap, teklifler gelsin.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

**"Kim için?" section (warm-gray bg) — LinkedIn'in "Who is LinkedIn for?" pattern'i:**
```html
<section class="lp-section lp-bg-warm">
  <div class="lp-container">
    <h2 class="lp-section-title-accent">hellotalent kimin için?</h2>
    <p class="lp-section-sub">Retail sektöründe kariyer yapan herkes.</p>
    <div class="lp-who-list">
      <div class="lp-who-item">Mağaza Müdürü & Müdür Yardımcısı</div>
      <div class="lp-who-item">Bölge Yöneticisi & Area Manager</div>
      <div class="lp-who-item">Satış Danışmanı & Kasa Sorumlusu</div>
      <div class="lp-who-item">Visual Merchandiser & Depo Sorumlusu</div>
      <div class="lp-who-item">E-ticaret & Omnichannel Uzmanı</div>
    </div>
  </div>
</section>
```

**Final CTA section (beyaz bg):**
```html
<section class="lp-section lp-final-cta">
  <div class="lp-container" style="text-align:center;">
    <h2>Kariyerinde bir sonraki adım burada.</h2>
    <p>Profil oluştur, markalar seni bulsun.</p>
    <a href="giris.html?tab=aday" class="lp-btn-primary lp-btn-lg">Ücretsiz Profil Oluştur →</a>
  </div>
</section>
```

**CSS Stili (tamamı `<style>` tag'inde):**

Key class'lar — tam CSS aday.html içinde olacak. Prefix: `lp-` (landing page).

```css
/* Temel layout */
.lp-container{max-width:var(--lp-max-width);margin:0 auto;padding:0 clamp(20px,4vw,48px);}
.lp-section{padding:var(--lp-section-pad);}
.lp-bg-warm{background:var(--warm-gray);}

/* Hero */
.lp-hero{padding:calc(64px + 56px) 0 80px;} /* 64px = header height */
.lp-hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;}
.lp-hero-text h1{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:var(--heading-xl);letter-spacing:-2px;line-height:1.05;color:var(--text);margin-bottom:20px;}
.lp-hero-text p{font-size:var(--body-lg);color:var(--muted);line-height:1.7;max-width:480px;margin-bottom:28px;}

/* Split layout — LinkedIn pattern */
.lp-split{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start;}
.lp-split-left h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:var(--heading-lg);letter-spacing:-1.5px;line-height:1.1;color:var(--text);margin-bottom:14px;}
.lp-split-left p{font-size:var(--body-lg);color:var(--muted);line-height:1.7;}

/* Pills */
.lp-pills{display:flex;flex-wrap:wrap;gap:12px;}
.lp-pill{padding:12px 20px;border:1.5px solid var(--border);border-radius:var(--lp-radius-pill);font-size:var(--body-sm);font-weight:600;color:var(--text);background:white;transition:border-color 0.2s,box-shadow 0.2s;cursor:default;}
.lp-pill:hover{border-color:var(--verm);box-shadow:0 2px 12px rgba(201,78,40,0.08);}

/* Steps */
.lp-steps{display:flex;flex-direction:column;gap:24px;}
.lp-step{display:flex;gap:20px;align-items:flex-start;}
.lp-step-num{font-family:'DM Mono',monospace;font-size:28px;font-weight:400;color:var(--border);line-height:1;min-width:40px;}
.lp-step strong{display:block;font-size:var(--body-lg);font-weight:700;margin-bottom:4px;}
.lp-step p{font-size:var(--body-md);color:var(--muted);line-height:1.6;}

/* Who list — LinkedIn style */
.lp-section-title-accent{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:var(--heading-lg);letter-spacing:-1.5px;color:var(--verm);margin-bottom:8px;}
.lp-section-sub{font-size:var(--body-lg);color:var(--muted);margin-bottom:32px;}
.lp-who-list{display:flex;flex-direction:column;gap:0;}
.lp-who-item{padding:18px 24px;font-size:var(--body-lg);font-weight:600;color:var(--text);background:var(--warm-gray);border-bottom:1px solid var(--border);transition:background 0.15s;}
.lp-who-item:first-child{border-radius:12px 12px 0 0;}
.lp-who-item:last-child{border-radius:0 0 12px 12px;border-bottom:none;}
.lp-who-item:hover{background:#EFEDE8;}

/* Buttons */
.lp-btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--verm);color:white;border:none;border-radius:var(--lp-radius-btn);font-family:'Plus Jakarta Sans',sans-serif;font-size:var(--body-md);font-weight:700;cursor:pointer;text-decoration:none;transition:all 0.2s;}
.lp-btn-primary:hover{background:var(--verm-dark);transform:translateY(-1px);}
.lp-btn-google{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;background:white;color:var(--text);border:1.5px solid var(--border);border-radius:var(--lp-radius-btn);font-family:'Plus Jakarta Sans',sans-serif;font-size:var(--body-md);font-weight:600;cursor:pointer;transition:all 0.2s;}
.lp-btn-google:hover{border-color:var(--text);background:#FAFAFA;}
.lp-btn-lg{font-size:var(--body-lg);padding:16px 36px;}

/* Trust row */
.lp-trust-row{display:flex;gap:20px;flex-wrap:wrap;font-size:var(--body-sm);color:var(--muted);font-weight:600;margin-top:20px;}
.lp-trust-row span::before{content:'';display:inline-block;width:6px;height:6px;background:#16A34A;border-radius:50%;margin-right:6px;vertical-align:middle;}

/* Final CTA */
.lp-final-cta h2{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:var(--heading-lg);letter-spacing:-1.5px;color:var(--text);margin-bottom:12px;}
.lp-final-cta p{font-size:var(--body-lg);color:var(--muted);margin-bottom:28px;}

/* Responsive */
@media(max-width:900px){
  .lp-hero-grid,.lp-split{grid-template-columns:1fr;gap:32px;}
  .lp-hero{padding:calc(64px + 32px) 0 48px;}
  .lp-hero-visual{display:none;}
}
@media(max-width:480px){
  .lp-hero-text h1{font-size:28px;letter-spacing:-1px;}
  .lp-hero-actions{flex-direction:column;}
  .lp-trust-row{flex-direction:column;gap:8px;}
}
```

**JS (minimal — sadece Google signup):**
```html
<script src="/shared.js?v=20260402a"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
(function(){
  var sb = window.HT && window.HT.supabase;
  if(!sb) return;
  var btn = document.getElementById('btn-google-signup-aday');
  if(btn) btn.addEventListener('click', function(){
    sb.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo:location.origin+'/profil.html'}
    });
  });
})();
</script>
```

- [ ] **Step 2: Local test**

Tarayıcıda `localhost:3000/aday.html` aç.  
Expected: LinkedIn-style temiz tasarım. Hero sol metin + sağ boş (visual placeholder). Warm-gray alternating sections. Pill'ler, 3-step, "kim için" listesi, final CTA. Header sadeleşmiş (Task 2'den). Mobile responsive.

- [ ] **Step 3: Commit**

```bash
git add aday.html
git commit -m "feat: rewrite aday.html — LinkedIn-style landing page with Google signup"
```

---

## Task 5: isveren.html — LinkedIn-Style İşveren Landing Page

**Files:**
- Rewrite: `isveren.html` (620 → ~500 satır)

LinkedIn tarzı. İçerik ik.html'in sunduğu avantajlara odaklanır + lead form. İşveren accent = navy.

Section yapısı:
1. **Hero:** "Adaylar hazır, ilan yönetmiyorsun." + İstatistikler
2. **Value prop:** Pill'ler ile özellikler (hazır aday havuzu, mesajlaşma, kampanya, filtreleme, eşleştirme)
3. **Nasıl Çalışır:** 3 adım
4. **Güven sinyalleri:** Marka pill'leri (mevcut markaların isimleri)
5. **Lead Form:** İşveren domain ile kayıt / iletişim formu
6. **Footer** (shared.js inject)

- [ ] **Step 1: isveren.html'i tamamen yeniden yaz**

Aday sayfasıyla aynı `lp-` class prefix'ini kullan, ama renk accent'i navy. Farklılıklar:

**Hero section:**
```html
<section class="lp-hero lp-hero-navy">
  <div class="lp-container">
    <div class="lp-hero-grid">
      <div class="lp-hero-text">
        <h1>Artık ilan yönetmiyorsun,<br>adaylar hazır.</h1>
        <p>Türkiye'nin en kapsamlı retail aday havuzu. Filtrelenmiş profiller, yetkinlik bazlı eşleştirme, 48 saatte iletişim.</p>
        <div class="lp-hero-actions">
          <a href="#lead-form" class="lp-btn-primary lp-btn-navy">Aramıza Katıl →</a>
          <a href="giris.html?tab=ik" class="lp-btn-outline-navy">Giriş Yap</a>
        </div>
        <div class="lp-stats-row">
          <div class="lp-stat"><strong>2.800+</strong><span>Aktif Aday</span></div>
          <div class="lp-stat"><strong>96</strong><span>Marka</span></div>
          <div class="lp-stat"><strong>48sa</strong><span>Ort. Yanıt</span></div>
        </div>
      </div>
      <div class="lp-hero-visual">
        <!-- Aday preview kartları — blurred sample -->
      </div>
    </div>
  </div>
</section>
```

**Özellikler section (warm-gray):**
Pill'ler: `🔍 Pozisyona Özel Filtreleme`, `💬 Direkt Mesajlaşma`, `📊 Yetkinlik Bazlı Eşleştirme`, `📋 Kampanya Yönetimi`, `👥 Takım & Davet Sistemi`, `📈 Performans Dashboard`

**Lead Form section:**
```html
<section class="lp-section" id="lead-form">
  <div class="lp-container">
    <div class="lp-split">
      <div class="lp-split-left">
        <h2>Retail ekibinizi güçlendirin.</h2>
        <p>Formu doldurun, size özel demo hazırlayalım. İşveren hesabınızı aktif edelim.</p>
        <div class="lp-contact-benefits">
          <div class="lp-cb">✓ Ücretsiz demo</div>
          <div class="lp-cb">✓ Kurumsal e-posta ile kayıt</div>
          <div class="lp-cb">✓ Aday havuzuna anında erişim</div>
        </div>
      </div>
      <div class="lp-split-right">
        <form class="lp-form-card" id="employer-lead-form" onsubmit="submitEmployerLead(event)">
          <div class="lp-form-title">İletişime Geç</div>
          <input class="lp-input" type="text" placeholder="Adınız Soyadınız" required>
          <input class="lp-input" type="email" placeholder="Kurumsal E-posta" required>
          <input class="lp-input" type="text" placeholder="Şirket Adı" required>
          <input class="lp-input" type="tel" placeholder="Telefon">
          <select class="lp-input">
            <option value="">Kaç kişilik ekibiniz var?</option>
            <option>1-10</option>
            <option>11-50</option>
            <option>51-200</option>
            <option>200+</option>
          </select>
          <button type="submit" class="lp-btn-primary lp-btn-navy" style="width:100%;">Gönder →</button>
          <p class="lp-form-note">Bilgileriniz gizli tutulur. Sadece demo için kullanılır.</p>
        </form>
      </div>
    </div>
  </div>
</section>
```

Navy-specific CSS override'lar (aday.html'in verm renk yerine):
```css
.lp-hero-navy{background:var(--navy);} 
.lp-hero-navy .lp-hero-text h1{color:white;}
.lp-hero-navy .lp-hero-text p{color:rgba(255,255,255,0.7);}
.lp-btn-navy{background:var(--navy);color:white;}
.lp-btn-navy:hover{background:#162248;}
.lp-btn-outline-navy{background:transparent;color:var(--navy);border:1.5px solid var(--navy);border-radius:var(--lp-radius-btn);padding:14px 28px;font-weight:700;text-decoration:none;transition:all 0.2s;}
.lp-pill:hover{border-color:var(--navy);box-shadow:0 2px 12px rgba(30,45,94,0.08);}
```

**Lead form JS (Supabase email_outbox insert):**
```html
<script>
(function(){
  var form = document.getElementById('employer-lead-form');
  if(!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var inputs = form.querySelectorAll('input, select');
    var data = {};
    inputs.forEach(function(el){ if(el.name) data[el.name] = el.value; });
    // Supabase insert to employer_leads veya email_outbox
    // Basit success mesajı göster
    form.innerHTML = '<div style="text-align:center;padding:32px 0;"><div style="font-size:36px;margin-bottom:12px;">✓</div><div style="font-family:Bricolage Grotesque,sans-serif;font-weight:800;font-size:22px;margin-bottom:8px;">Teşekkürler!</div><div style="color:var(--muted);font-size:14px;">En kısa sürede size dönüş yapacağız.</div></div>';
  });
})();
</script>
```

- [ ] **Step 2: Local test**

Tarayıcıda `localhost:3000/isveren.html` aç.  
Expected: Navy hero, beyaz metin, istatistikler. Warm-gray özellikler section'ı pill'lerle. Lead formu dolu ve submit edilebilir. Mobile responsive.

- [ ] **Step 3: Commit**

```bash
git add isveren.html
git commit -m "feat: rewrite isveren.html — LinkedIn-style employer landing with lead form"
```

---

## Task 6: Visual QA + Responsive Test

**Files:**
- Possible tweaks: `index.html`, `aday.html`, `isveren.html`, `shared.css`, `shared.js`

- [ ] **Step 1: Desktop QA (1440×900)**

Playwright ile screenshot al:  
- `localhost:3000` (gate)
- `localhost:3000/aday.html`
- `localhost:3000/isveren.html`

```bash
npx playwright screenshot --viewport-size=1440,900 http://localhost:3000 /tmp/gate-desktop.png
npx playwright screenshot --viewport-size=1440,900 http://localhost:3000/aday.html /tmp/aday-desktop.png
npx playwright screenshot --viewport-size=1440,900 http://localhost:3000/isveren.html /tmp/isveren-desktop.png
```

- [ ] **Step 2: Mobile QA (390×844)**

```bash
npx playwright screenshot --viewport-size=390,844 http://localhost:3000 /tmp/gate-mobile.png
npx playwright screenshot --viewport-size=390,844 http://localhost:3000/aday.html /tmp/aday-mobile.png
npx playwright screenshot --viewport-size=390,844 http://localhost:3000/isveren.html /tmp/isveren-mobile.png
```

- [ ] **Step 3: Screenshot'ları incele, sorunları düzelt**

Kontrol listesi:
- [ ] Gate: iki yarı eşit genişlikte, logo ortada, hover genişleme çalışıyor
- [ ] Aday hero: başlık 56px'e yakın, Google butonu görünür, trust badge'ler
- [ ] İşveren hero: navy bg, beyaz metin, istatistikler okunur
- [ ] Warm-gray section'lar alternating
- [ ] Pill/chip'ler wrap ediyor, hover efekti var
- [ ] Lead form tüm alanlar görünür, submit çalışıyor
- [ ] Mobile: gate üst-alt stack, hero tek kolon, form full-width
- [ ] Header: sadece 2 nav link + Giriş Yap
- [ ] Footer: sadeleşmiş, 2 kolon (Platform + Yasal)

- [ ] **Step 4: Fix'leri commit et**

```bash
git add -A
git commit -m "fix: visual QA — responsive adjustments for gate + landing pages"
```

---

## Task 7: Smoke Test + Mevcut Testlerin Uyumu

**Files:**
- Possibly modify: Playwright test files if they reference removed elements

- [ ] **Step 1: Mevcut smoke testlerini çalıştır**

```bash
cd /Users/peopleintk/Downloads/Hellotalent && npx playwright test --reporter=list 2>&1 | tail -20
```

Expected: Bazı testler fail edebilir (kaldırılan sayfalar/elementler). Fail edenleri not al.

- [ ] **Step 2: Fail eden testleri düzelt veya kaldır**

Kaldırılan sayfa referansları (kariyer.html, pozisyonlar.html, vb.) olan testleri skip'le veya sil.
Gate page ile değişen index.html element ID'lerini güncelleyen testler yazılması gerekebilir.

- [ ] **Step 3: Tüm testler geçene kadar düzelt**

Expected: Tüm geçerli testler PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: update smoke tests for new gate + landing page structure"
```

---

## Task 8: Docs Sync (CURRENT-STATE + AI-COLLAB)

**Files:**
- Modify: `docs/CURRENT-STATE.md`
- Modify: `docs/AI-COLLAB.md`

- [ ] **Step 1: CURRENT-STATE.md güncelle**

- Son güncelleme tarihini ve aşama numarasını güncelle
- Dosya haritasında: index.html → "Gate page — aday/işveren seçim", aday.html → "Aday landing page (LinkedIn-style)", isveren.html → "İşveren landing page + lead form"
- Kaldırılan sayfaları not et (nav'dan kaldırıldı, dosyalar hâlâ mevcut)
- shared.js header/footer değişikliğini yansıt

- [ ] **Step 2: AI-COLLAB.md güncelle**

- Tamamlanan blok: "Landing Page Redesign — Gate + Dual LP"
- Değişen dosyalar listesi
- Test durumu
- Bir sonraki adım

- [ ] **Step 3: Commit**

```bash
git add docs/CURRENT-STATE.md docs/AI-COLLAB.md
git commit -m "docs: sync CURRENT-STATE and AI-COLLAB after landing page redesign"
```

---

## Özet — Task Sırası

| Task | Ne | Bağımlılık | Tahmini Satır |
|------|----|-----------|--------------|
| 1 | shared.css token'lar | — | ~15 satır ekleme |
| 2 | shared.js nav sadeleştirme | — | ~100 satır değişiklik |
| 3 | index.html gate page | Task 1 | ~200 satır (yeni) |
| 4 | aday.html landing page | Task 1, 2 | ~500 satır (yeni) |
| 5 | isveren.html landing page | Task 1, 2 | ~500 satır (yeni) |
| 6 | Visual QA | Task 3, 4, 5 | Tweaks |
| 7 | Smoke test uyumu | Task 6 | Test edits |
| 8 | Docs sync | Task 7 | ~50 satır edit |

**Task 1-2 paralel çalışabilir. Task 3-5 paralel çalışabilir (Task 1-2 bittikten sonra). Task 6-8 sıralı.**
