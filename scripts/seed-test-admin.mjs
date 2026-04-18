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
 *      admin.html:757 checkAdminAccess bu tabloda maybeSingle lookup yapiyor.
 *   3. Idempotent — rerun'da password reset + admin_users upsert.
 *
 * Guvenlik notu:
 *   Bu script prod admin hesabi (kefelituna@gmail.com) DOKUNMAZ.
 *   Ayri test admin (admin+k032@peoplein.com.tr) seed eder.
 *   user_metadata.test_account=true flag ile prod'dan ayirt edilebilir.
 *
 * Faz 4B (O-1) refaktor: ortak admin API plumbing scripts/_supa-admin.mjs'te.
 */

import { loadAdminEnv, makeReq, ensureUser, validateCreds, refuseEmail, die } from './_supa-admin.mjs';

const { SUPA_URL, SERVICE_KEY } = loadAdminEnv();
const EMAIL = process.env.HT_TEST_ADMIN_EMAIL;
const PASSWORD = process.env.HT_TEST_PASSWORD;

if (!EMAIL) die('HT_TEST_ADMIN_EMAIL yok.');
if (!PASSWORD) die('HT_TEST_PASSWORD yok.');
validateCreds(EMAIL, PASSWORD);
refuseEmail(EMAIL, ['kefelituna@gmail.com']);

const req = makeReq(SUPA_URL, SERVICE_KEY);

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

  const { user, created } = await ensureUser({
    req,
    email: EMAIL,
    password: PASSWORD,
    userMetadata: {
      full_name: 'K032 Test Admin',
      role: 'admin',
      k032_seed: true,
      test_account: true,
    },
    appMetadata: { role: 'admin' },
  });
  console.log('  auth.users: ' + (created ? 'CREATED' : 'UPDATED') + ' (id=' + user.id + ')');

  const adm = await upsertAdminUser(user.id);
  console.log('  admin_users: ' + adm.action + ' (role=' + (adm.row && adm.row.role) + ')');

  console.log('✓ Admin seed OK.');
})();
