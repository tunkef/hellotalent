# HelloTalent Security Runbook

> Operator-facing reference for routine security maintenance, incident response, and auditing.
> Scope: Supabase (auth + Postgres), GitHub Pages deployment, test fixtures, PII handling.
> Intended audience: Tuna + trusted ops; not end-user facing.

**Son guncelleme:** 18 Nisan 2026 (K032 Faz 4C).
**Baglantili:** `CLAUDE.md`, `.claude/rules/supabase-patterns.md`, `.claude/rules/architecture-decisions.md`, `docs/CURRENT-STATE.md`.

---

## 1. Service Role Key Rotation

**Why:** The Supabase `service_role` key bypasses RLS and can read/write every table. If it leaks (shared in Slack, checked into git, left in a lost laptop), treat it as an emergency — anyone with the key owns the database.

**Where it lives in this repo:**
- `.env.local` — git-ignored, used by local seed scripts (`scripts/seed-test-*.mjs` via `scripts/_supa-admin.mjs`).
- Playwright CI does NOT need the service role key — smoke suite uses only the anon key + logged-in fixtures.
- Production site (GitHub Pages, static HTML) does NOT ship with the service role key. Only the anon key + public URL are embedded.
- Edge Functions (Supabase side) use the service role key via Supabase's own secret store — not this repo.

**Rotation procedure:**

1. **Supabase dashboard** → Project Settings → API → scroll to `service_role` secret → click **"Reveal"** → copy current key to safe place (temporary — in case rollback needed).
2. Same page → click **"Generate new secret"** → confirm. The old key is invalidated immediately.
3. **Update `.env.local`** on every machine that runs seed scripts:
   ```
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_<NEW>
   ```
4. **Re-run seed scripts** to verify the new key:
   ```
   source .env.local
   node scripts/seed-test-user.mjs
   node scripts/seed-test-employer.mjs
   node scripts/seed-test-admin.mjs
   ```
   If any fail with 401, env var didn't pick up; re-source or restart shell.
5. **Supabase Edge Functions** (if any) → Dashboard → Edge Functions → Secrets → update `SUPABASE_SERVICE_ROLE_KEY`. Redeploy any function that uses it.
6. **Delete** the old key from wherever you temporarily copied it (step 1).

**Does NOT require GitHub Pages redeploy** — public site never sees this key.

**Blast-radius note:** During the rotation window (seconds between generate-new-secret and updating `.env.local`), local seed scripts will fail. Production is unaffected — no user-facing flow depends on the service role key.

---

## 2. Test Account Audit

**Why:** K032 test fixtures seed three accounts (candidate, employer, admin) with predictable emails and `test_account: true` metadata. These must not leak into production visibility, and any rogue test row must be detectable.

**Expected test accounts:**
| Role      | Email env var              | Metadata flag        | Child table row                  |
|-----------|----------------------------|----------------------|----------------------------------|
| candidate | `HT_TEST_EMAIL`            | `test_account: true` | `candidates` (user_id=auth.uid)  |
| employer  | `HT_TEST_EMPLOYER_EMAIL`   | `test_account: true` | `hr_profiles` (id=auth.uid)      |
| admin     | `HT_TEST_ADMIN_EMAIL`      | `test_account: true` | `admin_users` (id=auth.uid)      |

All three must be NON-production emails. The admin seed script refuses to run against `kefelituna@gmail.com` (see `scripts/_supa-admin.mjs` `refuseEmail` + `scripts/seed-test-admin.mjs`).

**Monthly audit queries** (Supabase SQL editor):

```sql
-- 2.1 — All accounts carrying the test_account breadcrumb.
SELECT id, email, created_at, raw_user_meta_data->>'test_account' AS flag
FROM auth.users
WHERE raw_user_meta_data->>'test_account' = 'true'
ORDER BY created_at DESC;

-- 2.2 — Admin rows without a matching test_account breadcrumb
-- (anything returned here is a real admin; scrutinize).
SELECT a.id, a.role, a.display_name, u.email, u.raw_user_meta_data->>'test_account' AS flag
FROM admin_users a
LEFT JOIN auth.users u ON u.id = a.id
WHERE u.raw_user_meta_data->>'test_account' IS DISTINCT FROM 'true'
ORDER BY a.id;

-- 2.3 — Candidates marked test_account must not have is_active=true in prod
-- (this would surface them to real employers).
SELECT c.id, c.user_id, c.email, c.is_active, u.raw_user_meta_data->>'test_account' AS flag
FROM candidates c
JOIN auth.users u ON u.id = c.user_id
WHERE u.raw_user_meta_data->>'test_account' = 'true'
  AND c.is_active = true;

-- 2.4 — hr_profiles attached to test accounts — should not own any real
-- followers / favorites / messages in employer surfaces.
SELECT h.id, h.email, h.sirket, u.raw_user_meta_data->>'test_account' AS flag
FROM hr_profiles h
JOIN auth.users u ON u.id = h.id
WHERE u.raw_user_meta_data->>'test_account' = 'true';
```

**Action on findings:**
- Unexpected `test_account: true` row → investigate source. Either a rogue manual test or unauthorized seed. Delete if not yours.
- Known test account surfacing in a production query (2.3, 2.4) → flip `is_active=false` or delete the child row.
- Known prod admin missing `test_account` flag is expected (e.g. `kefelituna@gmail.com`). Keep a whitelist of expected prod admin IDs.

---

## 3. Incident Response Checklist

Use when you suspect a breach, leaked key, unauthorized admin action, or anomalous traffic.

### 3.1 Containment (first 15 minutes)

- [ ] **Rotate the service role key** — follow §1 even if you're not sure yet. Cheap to do; prevents compound loss.
- [ ] **Force sign-out all users** — Supabase dashboard → Auth → Users → select-all → "Sign out". Everyone re-auths; compromised sessions die.
- [ ] **Snapshot the database** — Supabase → Database → Backups → "Create backup". Names it with timestamp so you can diff later.
- [ ] **Disable write paths you don't need right now** — Supabase → SQL editor:
  ```sql
  -- Example: freeze new signups for 1 hour while investigating.
  UPDATE auth.config SET enable_signup = false;  -- if managed via SQL; else dashboard toggle
  ```

### 3.2 Scope (next 30 minutes)

- [ ] Pull the last 24h of `security_audit_log` (if table exists per LB6): who, what, when.
- [ ] Check `auth.users` for recently created or modified users:
  ```sql
  SELECT id, email, created_at, last_sign_in_at, raw_app_meta_data
  FROM auth.users
  WHERE created_at > NOW() - INTERVAL '24 hours'
     OR last_sign_in_at > NOW() - INTERVAL '24 hours'
  ORDER BY GREATEST(COALESCE(created_at, last_sign_in_at), COALESCE(last_sign_in_at, created_at)) DESC;
  ```
- [ ] Check `admin_users` for unexpected rows — compare against your prod admin whitelist.
- [ ] Review Cloudflare logs (if Cloudflare Access gate active) for unfamiliar IPs/geo.
- [ ] Review GitHub repo commits / PRs in the window — anything merged that pulls in a suspicious dependency or exposes a secret.

### 3.3 Notification (within 1 hour of confirmed breach)

- [ ] **GDPR/KVKK:** breaches affecting EU/TR personal data → 72h authority notification window (KVKK md.12, GDPR art.33). Consult legal counsel if real PII is exposed.
- [ ] Affected users must be notified in plain language if they're at risk (KVKK md.12/5, GDPR art.34). Template: short email explaining what happened, what you're doing, what they should do.
- [ ] Document the incident in `docs/incidents/YYYY-MM-DD-<slug>.md` with timeline + root cause + mitigations.

### 3.4 Recovery

- [ ] Revert any malicious DB changes from the snapshot (§3.1) — use `pg_dump`/diff, not blind restore.
- [ ] If any passwords may be compromised, force password reset for affected users (Supabase → Auth → Users → bulk action).
- [ ] Rotate any other secrets (Anthropic/DeepSeek API keys, GitHub Pages OAuth if relevant).
- [ ] Post-mortem: what log/alert would have caught this faster? Open a backlog item.

---

## 4. Local Dev Hygiene

- `.env.local` is in `.gitignore`. Before each commit run `git status` and verify no `.env*` appears (pre-push checklist per `.claude/rules/deploy-workflow.md`).
- Never paste the `service_role` key into chat/docs/PR description. If it happens, assume compromise and rotate per §1.
- When sharing CURRENT-STATE/handoff artifacts with outside collaborators, strip seed emails + passwords.
- Playwright storageState (`playwright/.auth/*.json`) is also `.gitignore`d — treat the same as credentials.

---

## 5. Quick Reference

| Task | Path |
|------|------|
| Rotate service role key | §1 |
| Check expected test accounts | §2 (query 2.1) |
| Unknown admin row | §2 (query 2.2) |
| Suspected breach | §3 |
| New seed script | import from `scripts/_supa-admin.mjs`, add `refuseEmail` if it touches a prod-adjacent role |
| Add new admin | NOT covered here — see admin onboarding runbook (TODO) |

---

**Changelog:**
- 2026-04-18 (K032 Faz 4C) — Initial runbook. Covers service role rotate, test account audit, incident response.
