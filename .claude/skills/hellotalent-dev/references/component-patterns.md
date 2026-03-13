# Hellotalent — Component Patterns Reference

## Standard Section

```html
<!-- SECTION: Feature Name -->
<section class="section" id="feature-name">
  <span class="section-tag"><svg>...</svg> ETİKET</span>
  <h2 class="section-title">Başlık Metni</h2>
  <p class="section-sub">Alt açıklama metni burada yer alır.</p>
  <!-- Content -->
</section>
```

## Card Component

```html
<div class="card" style="
  background: white;
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 24px;
  transition: all 0.2s;
">
  <div style="
    width: 44px; height: 44px;
    background: var(--verm-light);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  ">
    <!-- SVG icon -->
  </div>
  <h3 style="
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 700; font-size: 17px;
    color: var(--navy); margin-bottom: 8px;
  ">Kart Başlığı</h3>
  <p style="font-size: 13px; color: var(--muted); line-height: 1.6;">
    Açıklama metni
  </p>
</div>
```

Hover state:
```css
.card:hover {
  border-color: var(--navy);
  box-shadow: 0 8px 24px rgba(30,45,94,0.08);
  transform: translateY(-2px);
}
```

## Button Styles

### Primary (Vermillion)
```css
.btn-primary {
  background: var(--verm);
  color: white;
  border: none;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 14px 26px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.btn-primary:hover {
  background: #b84420;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(201,78,40,0.3);
}
```

### Secondary (Navy outline)
```css
.btn-secondary {
  background: white;
  color: var(--navy);
  border: 2px solid var(--navy);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 12px 22px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: var(--navy-light);
}
```

## Hero Section Pattern

```css
.hero-outer {
  background: linear-gradient(135deg, var(--verm) 0%, #a83b1e 100%);
  padding: 88px 48px 80px;
  overflow: hidden;
  position: relative;
}
/* Decorative circles */
.hero-outer::before {
  content: '';
  position: absolute;
  top: -80px; right: -80px;
  width: 400px; height: 400px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
}
```

## Tag/Badge Pattern

```css
.section-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--gray);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 20px;
}
```

## Scroll Animation Pattern

```javascript
// Intersection Observer for reveal animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
```

```css
.animate-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.animate-in.visible {
  opacity: 1;
  transform: translateY(0);
}
```

## Grid Layouts

### 3-column feature grid
```css
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
@media (max-width: 900px) {
  .features-grid { grid-template-columns: 1fr !important; }
}
```

### 2-column hero split
```css
.hero-inner {
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
}
@media (max-width: 900px) {
  .hero-inner { grid-template-columns: 1fr !important; gap: 32px !important; }
}
```

## Dark Mode Tokens (profil.html only — for now)

```css
html[data-theme="dark"] {
  --app-bg: #0F0F14;
  --surface: #1A1A24;
  --surface-elevated: #22222E;
  --text-primary: #F0F0F5;
  --text-secondary: #9494A8;
  --text-muted: #6B6B80;
  --border-default: rgba(255,255,255,0.08);
  --border-subtle: rgba(255,255,255,0.05);
  --accent: #C94E28;
  --accent-hover: #E05A30;
}
```
