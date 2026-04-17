#!/usr/bin/env node
/**
 * K032 Faz 3A — Idempotent employer test user seed.
 *
 * Kullanim:
 *   source .env.local && node scripts/seed-test-employer.mjs
 *
 * Env gereksinimleri:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   HT_TEST_EMPLOYER_EMAIL, HT_TEST_PASSWORD
 *
 * Davranis:
 *   1. Admin API'de user var mi. Yoksa create (email_confirm=true, app_metadata.role='employer').
 *   2. hr_profiles tablosunda user_id match var mi. Yoksa insert minimum alanlarla.
 *   3. employer_role='admin', company_type='tek_marka' default.
 *   4. Idempotent — rerun'da password reset + hr_profiles upsert.
 *
 * Kapsam disi (pragmatik minimum):
 *   - companies row seed yok. hr_profile.company_id null — ik.html dashboard bos gorebilir ama auth gate acilir.
 *   - brand linking yok. Ayri sprint'te Faz 3 daha zengin fixture gerekirse eklenir.
 */

const SUPA_URL = process.env.SUPABASE_URL || 'https://cpwibefquojehjehtrog.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.HT_TEST_EMPLOYER_EMAIL;
const PASSWORD = process.env.HT_TEST_PASSWORD;

function die(msg) { console.error('✗ ' + msg); process.exit(1); }

if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY yok.');
if (!EMAIL) die('HT_TEST_EMPLOYER_EMAIL yok.');
if (!PASSWORD) die('HT_TEST_PASSWORD yok.');
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
  try { json = text ? JSON.parse(text) : null; } catch (e) {}
  return { ok: res.ok, status: res.status, body: json, text };
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const r = await req('/auth/v1/admin/users?page=' + page + '&per_page=200', { method: 'GET' });
    if (!r.ok) die('listUsers HTTP ' + r.status + ' ' + r.text);
    const users = (r.body && r.body.users) || [];
    const hit = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < 200) return null;
  }
  return null;
}

async function createUser(email, password) {
  const r = await req('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: {
        full_name: 'K032 Test Employer',
        role: 'employer',
        k032_seed: true,
        test_account: true,
      },
      app_metadata: { role: 'employer' },
    }),
  });
  if (!r.ok) die('createUser HTTP ' + r.status + ' ' + r.text);
  return r.body;
}

async function updateUser(userId, password) {
  const r = await req('/auth/v1/admin/users/' + userId, {
    method: 'PUT',
    body: JSON.stringify({
      password, email_confirm: true,
      app_metadata: { role: 'employer' },
    }),
  });
  if (!r.ok) die('updateUser HTTP ' + r.status + ' ' + r.text);
  return r.body;
}

async function findHrProfile(userId) {
  const r = await req('/rest/v1/hr_profiles?id=eq.' + userId + '&select=id,email,employer_role', { method: 'GET' });
  if (!r.ok) die('findHrProfile HTTP ' + r.status + ' ' + r.text);
  return (r.body && r.body[0]) || null;
}

async function upsertHrProfile(userId, email) {
  const existing = await findHrProfile(userId);
  const payload = {
    id: userId,
    ad: 'K032',
    soyad: 'Test Employer',
    email,
    telefon: '05550000033',
    sirket: 'Peoplein Test',
    sektor: 'Test',
    buyukluk: '1-10',
    employer_role: 'admin',
    company_type: 'tek_marka',
    domain_verified: false,
  };
  if (existing) {
    const r = await req('/rest/v1/hr_profiles?id=eq.' + userId, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) die('patchHrProfile HTTP ' + r.status + ' ' + r.text);
    return { action: 'updated', row: (r.body || [])[0] };
  }
  const r = await req('/rest/v1/hr_profiles', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) die('insertHrProfile HTTP ' + r.status + ' ' + r.text);
  return { action: 'inserted', row: (r.body || [])[0] };
}

(async function main() {
  console.log('K032 employer seed: ' + EMAIL);
  console.log('  URL: ' + SUPA_URL);

  let user = await findUserByEmail(EMAIL);
  if (user) {
    console.log('  auth.users: EXISTS (id=' + user.id + ') — password+app_metadata reset');
    await updateUser(user.id, PASSWORD);
  } else {
    console.log('  auth.users: creating...');
    user = await createUser(EMAIL, PASSWORD);
    console.log('  auth.users: CREATED (id=' + user.id + ')');
  }

  const hr = await upsertHrProfile(user.id, EMAIL);
  console.log('  hr_profiles: ' + hr.action + ' (employer_role=' + (hr.row && hr.row.employer_role) + ')');

  console.log('✓ Employer seed OK.');
})();
