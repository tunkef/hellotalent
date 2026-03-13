# Hellotalent — Architecture Reference

## Source-of-Truth Files

- **shared.js** — Defines `window.HT` API: go(), toggleLogin(), toggleMenu(), toggleAccordion(), toggleShowMore(), toggleFooterCol(). Injects header/footer HTML into elements by id. Contains page map and active-page detection.
- **shared.css** — Defines `:root` variables, reset, header, nav, dropdowns, footer, login modal, mobile menu, responsive rules.
- **gate.html** — Sets `sessionStorage.setItem('ht_gate', 'ok')` and can redirect when gate is already ok.

## Module Map

### Gate + Landing
- gate.html sets ht_gate → index.html enforces it
- index.html hosts landing, candidate signup/login, HR demo (Formspree)

### Candidate Auth
- index.html and giris.html handle candidate auth via Supabase Auth
- Candidate signup inserts into `candidates` table

### Candidate Profile (Profil Merkezi)
- profil.html is the single source of truth
- Uses Supabase RPC `save_candidate_profile`
- Storage bucket: `cvs` (avatars + CV files)
- Does NOT use shared header/footer (own layout)

### Employer Auth & Dashboard
- giris.html (IK tab) + ik.html
- On login: role check → employer → ik.html
- ik.html has session + role guard
- Candidate list is HARDCODED `ADAYLAR` array (not live data)
- Does NOT use shared header/footer (own layout)

### Content/Career Pages
- kariyer.html, yetkinlik.html, pozisyonlar.html, blog.html
- Each has own Supabase client when needed
- Uses shared header/footer

### Marketing Pages
- aday.html, isveren.html
- Uses shared header/footer

### Static/Legal
- hakkimizda, iletisim, gizlilik, kullanim-sartlari, kvkk, cerez-politikasi, isalim-rotasi
- Uses shared header/footer

## Supabase-Dependent Flows

| Flow | Entry | Tables/RPC | Notes |
|------|-------|------------|-------|
| Candidate signup | index.html | auth.signUp → insert candidates | user_id, full_name, email, telefon, is_approved |
| Candidate login | index/giris | signInWithPassword | Redirect to profil.html |
| Profile load | profil.html | candidates + 8 child tables | Parallel fetch |
| Profile save | profil.html | RPC save_candidate_profile | Single RPC call |
| Avatar/CV | profil.html | Storage bucket 'cvs' | avatars/{user_id}.{ext}, cv/{user_id}/cv.{ext} |
| Employer login | giris.html | signInWithPassword | Redirect to ik.html |
| Employer init | ik.html | getSession → hr_profiles | No session → giris.html?tab=ik |
| Companies | profil.html | companies, brands, candidate_company_follows | Phase A MVP complete |

## Stable Areas (Safe to Build On)
- Gate contract (ht_gate key/value)
- shared.js / shared.css API
- Candidate data model (migration 001 + RPC)
- Supabase project (single URL/key)
- Storage bucket name ('cvs')
- Employer routing from giris

## Drift-Prone Areas (Extra Caution)
- Supabase client init (URL/key repeated in multiple files)
- profil.html size (5,900+ lines, intertwined logic)
- Candidate list on ik.html (mock → live transition pending)
- Company/brand data (partially migrated from hardcoded to DB)
- Role metadata enforcement (varies by page)
