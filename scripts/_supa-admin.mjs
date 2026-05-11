/**
 * K032 Faz 4B (O-1) — Shared Supabase Admin API helper for test seed scripts.
 *
 * Extracted from the three near-identical seed scripts:
 *   - scripts/seed-test-user.mjs       (candidate test user)
 *   - scripts/seed-test-employer.mjs   (employer test user)
 *   - scripts/seed-test-admin.mjs      (platform admin test user)
 *
 * Each of those had its own copy of: SUPA_URL/SERVICE_KEY env plumbing,
 * `die()`, `req()`, `findUserByEmail()`, and a create/update user pair.
 * This module owns that surface so behavior drifts in one place only.
 *
 * Kullanim (seed script icinde):
 *
 *   import { loadAdminEnv, ensureUser, req, die, refuseEmail } from './_supa-admin.mjs';
 *
 *   const { SUPA_URL, SERVICE_KEY } = loadAdminEnv();
 *   refuseEmail(EMAIL, ['kefelituna@gmail.com']); // optional prod guard
 *
 *   const { user, created } = await ensureUser({
 *     email: EMAIL,
 *     password: PASSWORD,
 *     userMetadata: { role: 'candidate', test_account: true },
 *     appMetadata:  { role: 'candidate' },
 *   });
 *
 * Tasarim kararlari:
 *   - Sessiz drift yok: `ensureUser` password'u her rerun'da resetliyor
 *     (onceki 3 script'in davranisi aynen — test hesabi kilitli kalmasin).
 *   - Pagination 20 sayfa x 200 / sayfa = 4000 user tavani (en buyuk dosyaya hizaland).
 *   - `die()` process.exit(1) — seed script'leri idempotent, fail fast.
 *   - `refuseEmail` opsiyonel: admin seed'i kefelituna@gmail.com'a dokunmasin diye.
 *   - Service role key sadece local intent; URL override env ile (SUPABASE_URL).
 */

export const DEFAULT_SUPA_URL = 'https://cpwibefquojehjehtrog.supabase.co';

export function die(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

/**
 * Load required admin env (SUPABASE_URL optional, SERVICE_ROLE_KEY required).
 * Callers pass their own EMAIL/PASSWORD vars — those are script-specific.
 */
export function loadAdminEnv() {
  const SUPA_URL = process.env.SUPABASE_URL || DEFAULT_SUPA_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY yok. .env.local kontrol edin.');

  // Production guard (Reform v3.4 P4.38) — seed/test scripts production'da yanlışlıkla çalışmasın
  // Bypass: ALLOW_SEED_PRODUCTION=1 (auditable, sadece bilinçli)
  const PROD_PROJECT_REF = 'cpwibefquojehjehtrog';
  if (SUPA_URL.includes(PROD_PROJECT_REF) && process.env.ALLOW_SEED_PRODUCTION !== '1') {
    die(
      'SEED PRODUCTION GUARD — REJECTED\n' +
      `SUPABASE_URL production project (${PROD_PROJECT_REF}) içeriyor.\n` +
      'Seed/test scripts production\'da çalıştırma RİSKLİ (veri korruption).\n\n' +
      'Dev/staging için:\n' +
      '  SUPABASE_URL=https://<dev-ref>.supabase.co node scripts/seed-test-*\n\n' +
      'Bilinçli production override:\n' +
      '  ALLOW_SEED_PRODUCTION=1 node scripts/seed-test-*'
    );
  }

  return { SUPA_URL, SERVICE_KEY };
}

/**
 * Build authorized fetch + return JSON-parsed body.
 * Returns `{ ok, status, body, text }` shape matched to existing callers.
 */
export function makeReq(SUPA_URL, SERVICE_KEY) {
  const adminHeaders = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': 'Bearer ' + SERVICE_KEY,
  };

  return async function req(path, opts = {}) {
    const res = await fetch(SUPA_URL + path, {
      ...opts,
      headers: { ...adminHeaders, ...(opts.headers || {}) },
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (e) { /* ignore */ }
    return { ok: res.ok, status: res.status, body: json, text };
  };
}

/**
 * Refuse to continue if EMAIL matches one of the protected addresses.
 * Defensive layer for prod admin accounts — opt-in per caller.
 */
export function refuseEmail(email, blocklist) {
  if (!email || !blocklist || !blocklist.length) return;
  const lower = email.toLowerCase();
  for (const blocked of blocklist) {
    if (lower === blocked.toLowerCase()) {
      die('REFUSED — email ' + email + ' is on the refuse list. Use a separate test account.');
    }
  }
}

/**
 * Validate email + password shape — same rule the 3 seed scripts used inline.
 */
export function validateCreds(email, password) {
  if (!email || !email.includes('@')) die('Email validation fail — HT_TEST_*_EMAIL missing or malformed.');
  if (!password || password.length < 10) die('Password validation fail — HT_TEST_PASSWORD missing or < 10 chars.');
}

/**
 * Paginated Admin API user lookup. Up to 20 * 200 = 4000 users — matches the
 * widest ceiling used across the three legacy scripts.
 */
export async function findUserByEmail(req, email) {
  for (let page = 1; page <= 20; page++) {
    const r = await req('/auth/v1/admin/users?page=' + page + '&per_page=200', { method: 'GET' });
    if (!r.ok) die('listUsers HTTP ' + r.status + ' ' + r.text);
    const users = (r.body && r.body.users) || [];
    const hit = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < 200) return null;
  }
  return null;
}

/**
 * Create-or-update a Supabase auth user with consistent metadata.
 *
 * Idempotent: rerun resets password + re-applies both metadata blocks
 * (prevents drift if role was revoked or test_account flag was edited).
 * Callers keep full control over what goes into each block.
 *
 * @param {object} opts
 * @param {function} opts.req           from makeReq()
 * @param {string}   opts.email
 * @param {string}   opts.password
 * @param {object}   [opts.userMetadata]  applied on BOTH create and update
 * @param {object}   [opts.appMetadata]   applied on BOTH create and update
 * @returns {{ user: object, created: boolean }}
 */
export async function ensureUser(opts) {
  const { req, email, password, userMetadata, appMetadata } = opts;
  if (!req) die('ensureUser: req helper missing.');

  const payload = {
    password,
    email_confirm: true,
  };
  if (userMetadata) payload.user_metadata = userMetadata;
  if (appMetadata)  payload.app_metadata  = appMetadata;

  const existing = await findUserByEmail(req, email);
  if (existing) {
    const r = await req('/auth/v1/admin/users/' + existing.id, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!r.ok) die('updateUser HTTP ' + r.status + ' ' + r.text);
    return { user: r.body || existing, created: false };
  }

  const r = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, ...payload }),
  });
  if (!r.ok) die('createUser HTTP ' + r.status + ' ' + r.text);
  return { user: r.body, created: true };
}
