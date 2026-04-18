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
 *
 * Faz 4B (O-1) refaktor: ortak admin API plumbing scripts/_supa-admin.mjs'te.
 */

import { loadAdminEnv, makeReq, ensureUser, validateCreds, die } from './_supa-admin.mjs';

const { SUPA_URL, SERVICE_KEY } = loadAdminEnv();
const EMAIL = process.env.HT_TEST_EMPLOYER_EMAIL;
const PASSWORD = process.env.HT_TEST_PASSWORD;

if (!EMAIL) die('HT_TEST_EMPLOYER_EMAIL yok.');
if (!PASSWORD) die('HT_TEST_PASSWORD yok.');
validateCreds(EMAIL, PASSWORD);

const req = makeReq(SUPA_URL, SERVICE_KEY);

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

  const { user, created } = await ensureUser({
    req,
    email: EMAIL,
    password: PASSWORD,
    userMetadata: {
      full_name: 'K032 Test Employer',
      role: 'employer',
      k032_seed: true,
      test_account: true,
    },
    appMetadata: { role: 'employer' },
  });
  console.log('  auth.users: ' + (created ? 'CREATED' : 'UPDATED') + ' (id=' + user.id + ')');

  const hr = await upsertHrProfile(user.id, EMAIL);
  console.log('  hr_profiles: ' + hr.action + ' (employer_role=' + (hr.row && hr.row.employer_role) + ')');

  console.log('✓ Employer seed OK.');
})();
