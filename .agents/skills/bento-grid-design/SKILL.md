---
name: bento-grid-design
description: Universal bento grid design system for hellotalent.ai dashboard layouts
---

# Bento Grid Design System — hellotalent.ai

> Universal design skill for all dashboard layouts. Every new panel, card group, or content section MUST follow these rules.

## Grid Foundation

```css
/* Standard 3-column bento grid */
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 16px;

/* Responsive breakpoints */
@media (max-width: 900px)  { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 600px)  { grid-template-columns: 1fr; }
```

## Asymmetric Spans

Cards use `grid-column: span N` for visual rhythm. Never uniform grids.

| Pattern | Usage |
|---------|-------|
| `span 2 + span 1` | Primary content + secondary (most common) |
| `span 1 + span 2` | Inverted — secondary left, primary right |
| `span 1 + span 1 + span 1` | Equal row — data cards, stats |
| `span 3` (full width) | Hero cards, banners, carousels |

**Rule:** At least one card per 2 rows should span 2 columns. Never 3+ rows of equal cards.

## Card Anatomy

Every card MUST have:

```css
background: var(--bg-surface, #fff);
border: 1px solid var(--border-subtle, #E5E3DF);
border-radius: 16px;                    /* 24px for hero cards */
box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.06);
padding: 24px;                          /* 22px 24px for hero cards */
```

## Card Types

### Hero Card (one per panel, top position, OUTSIDE grid)
```css
.g-hero {
  background: #C94E28;                  /* Vermillion — always */
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  padding: 22px 24px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.06);
}
```
- Title: Bricolage Grotesque, 20px, weight 800, white
- Always OUTSIDE the bento grid, directly in panel
- Same sizing across ALL panels — never custom hero CSS

### Content Card (white background)
- Border: `1px solid var(--border-subtle)`
- For forms, stats, lists, descriptions

### Colored Card (vermillion or navy background)
- Border: `1px solid rgba(255,255,255, 0.1)`
- For tips, CTAs, premium features
- Text: white, `rgba(255,255,255, 0.7-0.9)` for secondary

### Navy Gradient Card (premium/dark)
```css
background: linear-gradient(135deg, #2A3F7A 0%, #1E2D5E 50%, #162247 100%);
border: 1px solid rgba(255,255,255, 0.1);
```

## Typography in Cards

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Card title | Bricolage Grotesque | 14-18px | 700-800 |
| Card body | Plus Jakarta Sans | 13px | 400 |
| Card data | DM Mono | 12-13px | 600 |
| Card label | Plus Jakarta Sans | 11-12px | 600 |

## Colors

| Token | Light | Usage |
|-------|-------|-------|
| `--verm` | `#C94E28` | Primary action, hero cards, active states |
| `--verm-dark` | `#b84420` | Hover states |
| `--navy` | `#1E2D5E` | Authority, premium, headings |
| `--bg-surface` | `#fff` | Card backgrounds |
| `--border-subtle` | `#E5E3DF` | All card borders |
| `--text-primary` | `#111` | Headings |
| `--text-secondary` | `#4B5563` | Body text |
| `--text-muted` | `#6B7280` | Labels, hints |

## Interaction

```css
/* Hover lift */
.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}

/* Slide-up entrance animation */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Staggered children */
.card:nth-child(1) { animation-delay: 0s; }
.card:nth-child(2) { animation-delay: 0.05s; }
.card:nth-child(3) { animation-delay: 0.10s; }
/* ... +0.05s per child */
```

## Panel Structure Template

```html
<main class="panel" id="panel-{name}">
  <!-- 1. Hero card (OUTSIDE grid) -->
  <div class="g-hero">
    <div class="g-hero-inner">
      <div style="font-family:'Bricolage Grotesque';font-size:20px;font-weight:800;color:#fff;">
        Panel Title
      </div>
    </div>
  </div>

  <!-- 2. Bento grid -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
    <div class="card" style="grid-column:span 2;">Primary content</div>
    <div class="card">Secondary</div>
    <div class="card">Tertiary</div>
    <div class="card" style="grid-column:span 2;">Another wide card</div>
  </div>
</main>
```

## Anti-Patterns (NEVER do)

- Uniform grids with all cards same size (monotone)
- Cards without border (shadow alone insufficient)
- Custom hero CSS per panel (use g-hero everywhere)
- Different gap values across panels (always 16px)
- Cards with margin-bottom inside grid (use gap only)
- Nested grids more than 1 level deep
- Purple gradients or non-system colors
- Inter, Roboto, or system fonts
