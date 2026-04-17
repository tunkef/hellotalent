#!/usr/bin/env node
/**
 * K032 Faz 3B — Idempotent platform admin test user seed.
 *
 * Kullanim:
 *   source .env.local && node scripts/seed-test-admin.mjs
 *
 * Env gereksinimleri:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   HT_TEST_ADMIN_EMAIL, HT_TEST_PASSWORD
 *
 * Davranis:
 *   1. Admin API'de user var mi. Yoksa create.
 *   2. admin_users tablosuna INSERT (id=user.id, role='superadmin').
 *      is_admin() RPC bu tabloda EXISTS check yapiyor (migration 014).
 *   3. Idempotent — rerun'da password reset + admin_users upsert.
 *
 * Guvenlik notu:
 *   Bu script prod admin hesabi (kefelituna@gmail.com) DOKUNMAZ.
 *   Ayri test admin (admin+k032@peoplein.com.tr) seed eder.
 *   user_metadata.test_account=true flag ile prod'dan ayirt edilebilir.
 */

const SUPA_URL = process.env.SUPABASE_URL || 'https://cpwibefquojehjehtrog.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.HT_TEST_ADMIN_EMAIL;
const PASSWORD = process.env.HT_TEST_PASSWORD;

function die(msg) { console.error('✗ ' + msg); process.exit(1); }

if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY yok.');
if (!EMAIL) die('HT_TEST_ADMIN_EMAIL yok.');
if (!PASSWORD) die('HT_TEST_PASSWORD yok.');
if (!EMAIL.includes('@') || PASSWORD.length < 10) die('Email/password validation fail.');

// Prod admin guard — kefelituna@gmail.com'a hicbir sekilde dokunma
if (EMAIL.toLowerCase() === 'kefelituna@gmail.com') {
  die('REFUSED — HT_TEST_ADMIN_EMAIL kefelituna@gmail.com olamaz. Ayri test hesabi kullan.');
}

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
        full_name: 'K032 Test Admin',
        role: 'admin',
        k032_seed: true,
        test_account: true,
      },
      app_metadata: { role: 'admin' },
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
      app_metadata: { role: 'admin' },
    }),
  });
  if (!r.ok) die('updateUser HTTP ' + r.status + ' ' + r.text);
  return r.body;
}

async function findAdminUser(userId) {
  const r = await req('/rest/v1/admin_users?id=eq.' + userId + '&select=id,role,display_name', { method: 'GET' });
  if (!r.ok) die('findAdminUser HTTP ' + r.status + ' ' + r.text);
  return (r.body && r.body[0]) || null;
}

async function upsertAdminUser(userId) {
  const existing = await findAdminUser(userId);
  const payload = {
    id: userId,
    role: 'superadmin',
    display_name: 'K032 Test Admin',
  };
  if (existing) {
    const r = await req('/rest/v1/admin_users?id=eq.' + userId, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) die('patchAdminUser HTTP ' + r.status + ' ' + r.text);
    return { action: 'updated', row: (r.body || [])[0] };
  }
  const r = await req('/rest/v1/admin_users', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) die('insertAdminUser HTTP ' + r.status + ' ' + r.text);
  return { action: 'inserted', row: (r.body || [])[0] };
}

(async function main() {
  console.log('K032 admin seed: ' + EMAIL);
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

  const adm = await upsertAdminUser(user.id);
  console.log('  admin_users: ' + adm.action + ' (role=' + (adm.row && adm.row.role) + ')');

  console.log('✓ Admin seed OK.');
})();
