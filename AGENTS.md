# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
hellotalent.ai is a static HTML/CSS/JS (vanilla, no framework) Turkish retail talent marketplace. Backend is entirely Supabase (hosted cloud). There is no build step — files are served as-is.

### Running the dev server
Serve the repo root with any static HTTP server. `npx serve . -l 8080 -s` or `python3 -m http.server 8080` both work. The `-s` flag on `serve` enables SPA-style fallback, but note it may redirect `.html` URLs — use `python3 -m http.server` if you need exact path serving.

Open `http://localhost:8080/gate.html` first to set the `sessionStorage` beta gate token (`ht_gate=ok`), then navigate to other pages. Without the gate token, content pages redirect to `gate.html`. Gate credentials: `hellotalent` / `ht2026dev`.

### Running tests
- `npx playwright test --reporter=list` — runs smoke + regression tests
- Tests are configured against `https://hellotalent.ai` (production). The production site is behind **Cloudflare Access**, so many tests will fail with "sign in · cloudflare access" unless you have a valid Cloudflare session.
- To run tests against localhost, override `baseURL`: `npx playwright test --reporter=list --config playwright.config.js` and temporarily change `baseURL` in `playwright.config.js` to `http://localhost:8080`.
- Playwright browsers must be installed: `npx playwright install --with-deps chromium`

### Linting
There is no dedicated linter configured in `package.json`. The codebase is vanilla JS/CSS/HTML with no ESLint or Prettier setup.

### Key files
- `shared.js` / `shared.css` — global header/footer injection + Supabase config
- `index.html` — homepage (NEVER use `index_new.html`)
- `giris.html` — login page (candidate + HR tabs)
- `profil.html` + `profil-*.js` + `profil.css` — candidate profile dashboard (split into 6 files)
- `ik.html` — employer/HR panel
- `playwright.config.js` + `tests/` — Playwright test suite

### Supabase
All Supabase credentials (URL + anon key) are hardcoded in `shared.js` and inline in auth pages. The cloud Supabase project at `cpwibefquojehjehtrog.supabase.co` is always used — there is no local Supabase setup.

### Gotchas
- UI language is Turkish throughout — use "mülakat" or "iş görüşmesi" (never "röportaj")
- No `console.log` in production — only `console.error`/`console.warn`
- `candidates.id` and `companies.id` are `bigint` (not uuid); `hr_profiles.id` is uuid
- Always use `.maybeSingle()` not `.single()` for queries that might return no rows
- See `CLAUDE.md` and `docs/handoff.md` for full project context and rules
