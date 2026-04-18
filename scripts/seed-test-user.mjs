#!/usr/bin/env node
/**
 * K032 Faz 2 — Idempotent test user seed for Playwright auth setup.
 *
 * Kullanim:
 *   source .env.local && node scripts/seed-test-user.mjs
 *
 * Env gereksinimleri:
 *   SUPABASE_URL               (optional — defaults to hardcoded project URL)
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
 *
 * Faz 4B (O-1) refaktor: user lookup / create-update / die() / req() ortak
 * mantigi scripts/_supa-admin.mjs'e tasindi. Davranis degismedi.
 */

import { loadAdminEnv, makeReq, ensureUser, validateCreds, die } from './_supa-admin.mjs';

const { SUPA_URL, SERVICE_KEY } = loadAdminEnv();
const EMAIL = process.env.HT_TEST_EMAIL;
const PASSWORD = process.env.HT_TEST_PASSWORD;

if (!EMAIL) die('HT_TEST_EMAIL yok. .env.local kontrol edin.');
if (!PASSWORD) die('HT_TEST_PASSWORD yok. .env.local kontrol edin.');
validateCreds(EMAIL, PASSWORD);

const req = makeReq(SUPA_URL, SERVICE_KEY);

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

  const { user, created } = await ensureUser({
    req,
    email: EMAIL,
    password: PASSWORD,
    userMetadata: {
      full_name: 'K032 Test User',
      role: 'candidate',
      k032_seed: true,
      test_account: true,
    },
  });
  console.log('  auth.users: ' + (created ? 'CREATED' : 'UPDATED') + ' (id=' + user.id + ')');

  const cand = await upsertCandidate(user.id, EMAIL);
  console.log('  candidates: ' + cand.action + ' (id=' + (cand.row && cand.row.id) + ')');

  console.log('✓ Seed OK. auth.setup.js calistirabilirsin:');
  console.log('  npx playwright test --project=setup');
})();
