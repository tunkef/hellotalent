#!/usr/bin/env node
/**
 * K032 Faz 2 — Idempotent test user seed for Playwright auth setup.
 *
 * Kullanim:
 *   source .env.local && node scripts/seed-test-user.mjs
 *
 * Env gereksinimleri:
 *   SUPABASE_URL               (or uses hardcoded project URL)
 *   SUPABASE_SERVICE_ROLE_KEY  (sb_secret_... — ADMIN API)
 *   HT_TEST_EMAIL              (gmail alias onerilir)
 *   HT_TEST_PASSWORD           (strong)
 *
 * Davranis:
 *   1. Admin API'de kullanici var mi kontrol et. Yoksa create (email_confirm=true).
 *   2. candidates tablosunda user_id match'li row var mi. Yoksa insert.
 *   3. profile_completed=true, is_active=true, account_status='active' set.
 *   4. Idempotent: rerun'da fail etmez, mevcut kayitlari gunceller.
 *
 * Guvenlik:
 *   - Service role key sadece local script icin. .env.local git-ignored.
 *   - Production'da koşturulmaz (DNS/URL degiş guard yok — local intent).
 */

const SUPA_URL = process.env.SUPABASE_URL || 'https://cpwibefquojehjehtrog.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.HT_TEST_EMAIL;
const PASSWORD = process.env.HT_TEST_PASSWORD;

function die(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY yok. .env.local kontrol edin.');
if (!EMAIL) die('HT_TEST_EMAIL yok. .env.local kontrol edin.');
if (!PASSWORD) die('HT_TEST_PASSWORD yok. .env.local kontrol edin.');
if (!EMAIL.includes('@') || PASSWORD.length < 10) die('Email/password validation fail.');

const adminHeaders = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': 'Bearer ' + SERVICE_KEY,
};

async function req(path, opts) {
  const res = await fetch(SUPA_URL + path, { ...opts, headers: { ...adminHeaders, ...(opts.headers || {}) } });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* ignore */ }
  return { ok: res.ok, status: res.status, body: json, text };
}

async function findUserByEmail(email) {
  const per = 200;
  for (let page = 1; page <= 10; page++) {
    const r = await req('/auth/v1/admin/users?page=' + page + '&per_page=' + per, { method: 'GET' });
    if (!r.ok) die('listUsers HTTP ' + r.status + ' ' + r.text);
    const users = (r.body && r.body.users) || [];
    const hit = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < per) return null;
  }
  return null;
}

async function createUser(email, password) {
  const r = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'K032 Test User',
        role: 'candidate',
        k032_seed: true,
      },
    }),
  });
  if (!r.ok) die('createUser HTTP ' + r.status + ' ' + r.text);
  return r.body;
}

async function updateUserPassword(userId, password) {
  const r = await req('/auth/v1/admin/users/' + userId, {
    method: 'PUT',
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!r.ok) die('updateUserPassword HTTP ' + r.status + ' ' + r.text);
  return r.body;
}

async function findCandidate(userId) {
  const r = await req('/rest/v1/candidates?user_id=eq.' + userId + '&select=id,user_id,profile_completed,is_active', { method: 'GET' });
  if (!r.ok) die('findCandidate HTTP ' + r.status + ' ' + r.text);
  return (r.body && r.body[0]) || null;
}

async function upsertCandidate(userId, email) {
  const existing = await findCandidate(userId);
  const payload = {
    user_id: userId,
    full_name: 'K032 Test User',
    email,
    telefon: '05550000032',
    profile_completed: true,
    is_active: true,
    account_status: 'active',
    pozisyon: 'Test Kullanicisi',
    adres_il: 'Istanbul',
    adres_ilce: 'Kadikoy',
    hide_from_current_employer: false,
    notify_email_messages: false,
    notify_email_jobs: false,
  };
  if (existing) {
    const r = await req('/rest/v1/candidates?user_id=eq.' + userId, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) die('patchCandidate HTTP ' + r.status + ' ' + r.text);
    return { action: 'updated', row: (r.body || [])[0] };
  }
  const r = await req('/rest/v1/candidates', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) die('insertCandidate HTTP ' + r.status + ' ' + r.text);
  return { action: 'inserted', row: (r.body || [])[0] };
}

(async function main() {
  console.log('K032 seed: ' + EMAIL);
  console.log('  URL: ' + SUPA_URL);

  let user = await findUserByEmail(EMAIL);
  if (user) {
    console.log('  auth.users: EXISTS (id=' + user.id + ') — password reset');
    await updateUserPassword(user.id, PASSWORD);
  } else {
    console.log('  auth.users: creating...');
    user = await createUser(EMAIL, PASSWORD);
    console.log('  auth.users: CREATED (id=' + user.id + ')');
  }

  const cand = await upsertCandidate(user.id, EMAIL);
  console.log('  candidates: ' + cand.action + ' (id=' + (cand.row && cand.row.id) + ')');

  console.log('✓ Seed OK. auth.setup.js calistirabilirsin:');
  console.log('  npx playwright test --project=setup');
})();
