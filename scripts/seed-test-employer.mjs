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
 *   2. companies tablosunda "Peoplein Test" var mi. Yoksa insert (slug `peoplein-test`).
 *   3. hr_profiles tablosunda user_id match var mi. Yoksa insert. company_id uret company row ile.
 *   4. employer_role='admin', company_type='tek_marka' default.
 *   5. Idempotent — rerun'da password reset + companies + hr_profiles upsert.
 *
 * K-037 fix (18 Nisan 2026): seed artik company_id de set ediyor. ik.html onboarding gate
 * `!hrProfile.company_id` kontrolune gecti (eski `!hrProfile.sirket` broken idi). company_id
 * olmadan test employer her fresh load'da #sirket'e kilitlenirdi. Faz 3A e2e testleri bu
 * commit ile strict `panel-<hash>` assertion'a dondugu icin company_id sart.
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

const TEST_COMPANY_NAME = 'Peoplein Test';
const TEST_COMPANY_SLUG = 'peoplein-test';

async function findCompanyByName(name) {
  // Case-insensitive exact match — matches link_employer_to_company semantics.
  const r = await req('/rest/v1/companies?company_name=ilike.' + encodeURIComponent(name) + '&select=id,company_name,slug', { method: 'GET' });
  if (!r.ok) die('findCompanyByName HTTP ' + r.status + ' ' + r.text);
  return (r.body || []).find((c) => (c.company_name || '').toLowerCase() === name.toLowerCase()) || null;
}

async function ensureCompany() {
  const existing = await findCompanyByName(TEST_COMPANY_NAME);
  if (existing) return { id: existing.id, created: false };
  // Minimal payload: only NOT NULL columns required by the schema.
  // Industry / segment / description are left null — the test employer
  // does not exercise those surfaces.
  const r = await req('/rest/v1/companies', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      company_name: TEST_COMPANY_NAME,
      slug: TEST_COMPANY_SLUG,
    }),
  });
  if (!r.ok) die('insertCompany HTTP ' + r.status + ' ' + r.text);
  const row = (r.body || [])[0];
  if (!row || !row.id) die('insertCompany returned no id.');
  return { id: row.id, created: true };
}

async function findHrProfile(userId) {
  const r = await req('/rest/v1/hr_profiles?id=eq.' + userId + '&select=id,email,employer_role,company_id', { method: 'GET' });
  if (!r.ok) die('findHrProfile HTTP ' + r.status + ' ' + r.text);
  return (r.body && r.body[0]) || null;
}

async function upsertHrProfile(userId, email, companyId) {
  const existing = await findHrProfile(userId);
  const payload = {
    id: userId,
    ad: 'K032',
    soyad: 'Test Employer',
    email,
    telefon: '05550000033',
    sirket: TEST_COMPANY_NAME,
    sektor: 'Test',
    buyukluk: '1-10',
    employer_role: 'admin',
    company_type: 'tek_marka',
    company_id: companyId,
    domain_verified: false,
    onboarding_completed: true,
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

  const company = await ensureCompany();
  console.log('  companies: ' + (company.created ? 'CREATED' : 'EXISTS') + ' (id=' + company.id + ' name=' + TEST_COMPANY_NAME + ')');

  const hr = await upsertHrProfile(user.id, EMAIL, company.id);
  console.log('  hr_profiles: ' + hr.action + ' (employer_role=' + (hr.row && hr.row.employer_role) + ', company_id=' + (hr.row && hr.row.company_id) + ')');

  console.log('✓ Employer seed OK.');
})();
