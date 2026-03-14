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

## Supabase SQL Deploy
- Monaco editor injection: `window.monaco?.editor?.getEditors?.()?.[0]?.setValue(sql)`
- Run: Cmd+Return
- Destructive query confirmation: click at ~(778, 510)

## GitHub API Deploy (alternative)
- Fetch SHA → base64 encode → PUT
- Push URL: `https://ghp_TOKEN@github.com/tunkef/hellotalent.git main`
