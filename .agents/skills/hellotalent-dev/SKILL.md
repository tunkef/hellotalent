---
name: hellotalent-dev
description: Hellotalent.ai retail talent marketplace development skill. Use when editing, fixing, building, or reviewing any hellotalent HTML page, CSS, JavaScript, Supabase integration, or UI component. Covers brand design system, Turkish UI rules, auth flows, candidate/employer dashboards, responsive patterns, and project architecture. Activates for any task involving hellotalent files (index.html, aday.html, profil.html, ik.html, giris.html, shared.css, shared.js, etc).
---

# Hellotalent.ai — Development Skill

You are working on **hellotalent.ai**, a Turkish retail talent marketplace connecting retail sector candidates (adaylar) with HR professionals and recruiters.

## Architecture Overview

**Stack:** Static HTML/CSS/JS → GitHub Pages → Supabase backend
**No build step** — files are served as-is. No React, no bundler, no framework.

### File Map

| File | Role | Lines | Complexity |
|------|------|-------|------------|
| `shared.css` | Global design tokens, header, footer, nav, responsive rules | ~440 | Source of truth for all shared styles |
| `shared.js` | Injects header/footer via `window.HT`, page detection, event binding | ~400 | Source of truth for shared chrome |
| `index.html` | Homepage + candidate signup/login + HR demo form | ~2,640 | Gate check + Supabase auth |
| `profil.html` | Candidate dashboard (Genel/Merkez/Ayarlar/Wizard) | ~5,915 | Most complex file — edit with extreme care |
| `ik.html` | Employer dashboard | ~1,800 | Has hardcoded ADAYLAR mock array |
| `giris.html` | Login page (candidate + employer tabs) | ~480 | Auth routing by role |
| `aday.html` | Candidate marketing/feature page | ~980 | 10 premium feature cards |
| `isveren.html` | Employer marketing page | ~620 | |
| `kariyer.html` | Career routes content | ~1,190 | |
| `gate.html` | Session gate (sets ht_gate) | ~185 | Entry point |

**Shared chrome:** Pages with `id="ht-header"` and `id="ht-footer"` get header/footer injected by shared.js.
**Exceptions:** profil.html, ik.html, gate.html use their OWN layout — no shared chrome.

Read `references/architecture.md` for the full module map, Supabase flows, and stability notes.

---

## Brand Design System

### MANDATORY Colors

```css
:root {
  --verm: #C94E28;          /* Primary — CTAs, highlights, active states */
  --verm-light: #F5EDE9;    /* Vermillion tint — hover backgrounds */
  --navy: #1E2D5E;          /* Secondary — headings, nav, footers, authority */
  --navy-light: #EEF0F7;    /* Navy tint */
  --gray: #F7F6F4;          /* Surface — cards, sections */
  --text: #111111;          /* Primary text */
  --muted: #6B7280;         /* Secondary text */
  --border: #E5E3DF;        /* Borders, dividers */
}
```

**Vermillion is DOMINANT.** Navy is AUTHORITY. Never invert this hierarchy.

### MANDATORY Typography

```css
/* Headings — always */
font-family: 'Bricolage Grotesque', sans-serif;

/* Body text — always */
font-family: 'Plus Jakarta Sans', sans-serif;

/* Data/code displays — when needed */
font-family: 'DM Mono', monospace;
```

### Design Tone

**Editorial luxury meets accessible warmth.** Think: premium magazine layout adapted for a job platform. NOT corporate/generic. NOT startup/playful.

- Vermillion as bold accent, navy as grounding authority
- Generous whitespace, editorial-quality composition
- Hover states: subtle transforms + opacity shifts + box-shadow reveals
- Transitions: `transition: all 0.3s ease` baseline, faster for micro-interactions
- Border-radius: 12-14px for cards, 20px for pills/tags, 8px for inputs
- Shadows: layered, not flat — `0 4px 16px rgba(0,0,0,0.08)` baseline

### NEVER Use

- Inter, Roboto, Arial, or system fonts
- Purple gradients or generic blue schemes
- Flat, uniform layouts without visual hierarchy
- Cookie-cutter card grids without personality

---

## Turkish UI Language Rules

**ALL user-facing text must be in Turkish.**

### Terminology

| Correct ✅ | Wrong ❌ | Context |
|-----------|---------|---------|
| mülakat, iş görüşmesi | röportaj | Interview |
| aday | candidate | Candidate |
| işveren | employer | Employer |
| profil | profile | Profile |
| başvur | apply | Apply action |
| giriş yap | login/sign in | Auth |
| kayıt ol | register | Signup |

### Tone

- Formal but warm — **"siz"** form, professional yet approachable
- Button labels: actionable Turkish verbs — "Başvur", "Keşfet", "Giriş Yap", "Kaydet"
- Avoid direct English translations that sound unnatural in Turkish
- Section titles: bold, concise, benefit-driven

---

## Code Conventions

### HTML

- Semantic HTML5: `<header>`, `<main>`, `<section>`, `<nav>`, `<article>`
- Use unique HTML comment markers for section targeting: `<!-- SECTION: Feature Name -->`
- Keep `<style>` blocks inline within each HTML file
- Keep `<script>` blocks at bottom of `<body>`, inline
- No external CSS or JS files per page — everything inline (shared.css/js are the only externals)

### CSS

- CSS custom properties (variables) from shared.css `:root`
- Mobile-first media queries using `min-width` breakpoints
- Flexbox and Grid for layouts — never float
- Use `gap` instead of margin hacks
- Group styles by section within `<style>` blocks

### JavaScript

- Vanilla JS only — no jQuery, no React, no libraries except Supabase CDN
- ES6+ syntax: `const`/`let`, arrow functions, template literals, async/await
- Supabase client via CDN: `@supabase/supabase-js@2`
- Event delegation where possible
- Intersection Observer for scroll animations

### Responsive Breakpoints

```css
@media (max-width: 900px)  { /* Tablet — nav collapses, grids → 1col */ }
@media (max-width: 768px)  { /* Mobile — header shrinks to 56px */ }
@media (max-width: 480px)  { /* Small mobile — tighter spacing */ }
```

- Primary test viewport: **390×844** (iPhone)
- Touch targets: minimum 44×44px
- **No horizontal scroll — ever**
- iOS zoom prevention: all inputs `font-size: 16px !important`

---

## Supabase Integration

### Config Pattern

```javascript
const SUPA_URL = 'https://cpwibefquojehjehtrog.supabase.co';
const SUPA_ANON = '...anon key...';
const _supa = supabase.createClient(SUPA_URL, SUPA_ANON);
```

**Warning:** URL and anon key are repeated across multiple HTML files. Always use the SAME values. Do not paste old or different keys.

### Auth Flow

1. `gate.html` sets `sessionStorage.setItem('ht_gate', 'ok')`
2. Every page checks: `if(sessionStorage.getItem("ht_gate")!=="ok") → redirect to gate.html`
3. Login: `supabase.auth.signInWithPassword({email, password})`
4. Role routing: `user_metadata.role === 'employer'` → ik.html, else → profil.html

### Database Rules

- `hr_profiles.id` has FK to `auth.users(id)` — cannot write without valid auth UUID
- `candidates.id` is `GENERATED BY DEFAULT` (allows upserts)
- Upserts require UNIQUE INDEX on target column before `onConflict`
- Service role key bypasses RLS for admin operations
- RPC: `save_candidate_profile` for candidate data persistence

Read `references/supabase-schema.md` for migration details and table relationships.

---

## Editing Rules

### Before ANY Edit

1. **Read the full target section** before changing code
2. **Identify using HTML comment markers** — don't guess line numbers
3. **Preserve existing functionality** — never remove working features
4. **Check responsive behavior** after every significant change

### profil.html Special Rules (5,915 lines!)

This file is the most complex and fragile. Extra caution required:
- Contains wizard (5 steps), Genel/Merkez/Ayarlar panels, sidebar, dark mode
- Supabase RPC calls, Storage operations, child-table queries
- Visibility/privacy controls with sync across multiple panels
- **Edit section-by-section, test after each change**
- **Never refactor the entire file in one pass**

### File Naming

- Homepage is ALWAYS `index.html` — **NEVER** create `index_new.html` or variants
- All filenames: Turkish lowercase — `aday.html`, `giris.html`, `profil.html`

---

## What NEVER To Do

1. **Never reintroduce salary comparison/benchmark features** — deliberately cut (Turkey inflation)
2. **Never use "röportaj"** — always "mülakat" or "iş görüşmesi"
3. **Never create index_new.html** or any homepage variant
4. **Never use `GENERATED ALWAYS`** for ID columns that need upserts
5. **Never use generic fonts** — stick to Bricolage Grotesque / Plus Jakarta Sans / DM Mono
6. **Never add external per-page CSS/JS files** — keep inline
7. **Never break mobile responsiveness** — always verify at 390×844
8. **Never remove the gate check** from any auth-dependent page
9. **Never change Supabase URL/key** without updating ALL files that reference it
10. **Never modify shared.css/shared.js** without considering impact on ALL pages

---

## Deployment

- GitHub Pages from `main` branch
- Push via git to `main` → propagation ~40 seconds
- Hard refresh (`Cmd+Shift+R`) required after deploy
- Always verify: fonts loading, no console errors, mobile responsive, Turkish copy correct

---

## Active Feature State

### Candidate Dashboard (profil.html)
- ✅ Profile wizard (5 steps) — largely modernized
- ✅ Restore pipeline (save → DB → load → applyDraft → DOM)
- ✅ CV upload/replace/delete
- ✅ Avatar upload/persistence
- ✅ Settings MVP v1 (name + phone edit, is_active toggle)
- ✅ Dark mode foundation (localStorage + semantic tokens)
- ✅ Companies MVP (Şirketler — search, follow/unfollow, chips)
- 🔄 Visibility/Premium UI reorg — planned, not implemented
- ⬜ Premium features — all placeholder

### Employer Dashboard (ik.html)
- ✅ Auth guard (session + role check)
- ✅ HR profile load/display
- ❌ Candidate list — HARDCODED mock array (84 lines), not live data

### Candidate Marketing (aday.html)
- ✅ Hero section, feature cards, responsive layout
- 🔄 UX audit started but not completed
- ⬜ 10 premium feature cards — all UI-only placeholders

### Homepage (index.html)
- ✅ Landing page, candidate signup/login, HR demo modal
- ✅ Gate enforcement, session redirect
