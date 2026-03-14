# Code Quality Standards

## JavaScript
- Use `var` (not const/let) in profil.html and ik.html — Safari SyntaxError prevention
- Wrap new features in IIFE: `(function(){ ... })();`
- Use `window._htFunctionName` to expose functions between IIFEs
- No console.log in production — only console.error and console.warn
- Error handling: always try/catch async operations, show user-friendly Turkish error messages

## CSS
- Use CSS variables from design system: var(--verm), var(--navy), var(--bg), var(--border), var(--muted)
- Shared styles go in shared.css, not duplicated across pages
- Page-specific styles stay in page's <style> tag
- Prefer class-based styles over inline styles for reusable patterns
- Brand fonts only: 'Bricolage Grotesque', 'Plus Jakarta Sans', 'DM Mono'

## HTML Structure
- Use semantic IDs: settings-*, btn-*, panel-*, nav-*
- Toggle pattern: label.toggle > input[type=checkbox] + span.toggle-slider
- Card pattern: div.card > div.card-title + content
- Message display: div#[feature]-msg with display:none, toggled by JS

## Large File Editing (profil.html)
- profil.html is 6300+ lines — NEVER rewrite entire file
- Edit section-by-section using unique markers
- Use HTML comments as anchors for string replacement
- After Cursor edit: always `git diff --stat` to verify only target file changed

## Testing
- Playwright: 68 smoke tests, 64 passing (4 known false negatives)
- Config: mobile 390×844, desktop 1440×900
- Run: `npx playwright test --reporter=list`

## Patterns to Avoid
- No salary/maaş comparison features (deliberately removed — Turkey inflation)
- No GENERATED ALWAYS identity columns for tables needing upsert
- No .single() for queries that might return empty (use .maybeSingle())
- No Inter or Roboto fonts
- No purple gradients
