# Deploy Workflow

## Git → GitHub Pages
```bash
git add [files]
git commit -m "type: description"
git push origin main
```
Propagation: ~40 seconds → hard refresh (Cmd+Shift+R)

## Commit Message Convention
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — cleanup, refactor, config
- `docs:` — documentation only

## Pre-Push Checklist
1. `git diff --stat` — verify only intended files changed
2. No console.log in production code
3. Turkish text: no "röportaj", use "mülakat"
4. Test on mobile viewport (390×844) if UI changed

## Supabase DB Migration (preferred)
```bash
# Create a new migration:
npm run db:new -- migration_name
# This creates supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql

# Edit the migration file, then deploy:
npm run db:push
# Runs: supabase db push --linked (applies pending migrations in order)

# Check migration status:
npm run db:status
```
Note: Requires SUPABASE_ACCESS_TOKEN env var (or `supabase login`).
Baseline: 20260322000000. All prior migrations (001-064) in docs/migrations/ are archived.

## Supabase SQL Deploy (legacy / ad-hoc queries)
- For one-off queries that are NOT migrations: `supabase db query "SQL" --linked`
- Monaco editor injection: `window.monaco?.editor?.getEditors?.()?.[0]?.setValue(sql)`
- Run: Cmd+Return
- Destructive query confirmation: click at ~(778, 510)

## GitHub API Deploy (alternative)
- Fetch SHA → base64 encode → PUT
- Push URL: `https://ghp_TOKEN@github.com/tunkef/hellotalent.git main`
