/**
 * K030 FAZ A — Coach/Studio decouple regression guard
 *
 * Source-content checks: dormant banners + stub definition present.
 * Runtime tests skipped here (profil.html is auth-gated); integration
 * is covered by full playwright suite with storageState.
 */
var { test, expect } = require('@playwright/test');

test.describe('K030 FAZ A — Coach/Studio decouple (source checks)', () => {
  async function getStudioJs(request, baseURL) {
    var url = (baseURL || 'http://localhost:8080') + '/profil-studio.js';
    var res = await request.get(url);
    expect(res.ok()).toBeTruthy();
    return await res.text();
  }

  test('profil-studio.js has file-top FROZEN banner with unfreeze steps', async ({ request, baseURL }) => {
    var body = await getStudioJs(request, baseURL);
    expect(body).toContain('FROZEN — 2026-04-13 (K030)');
    expect(body).toContain('Unfreeze steps');
    expect(body).toContain('DO NOT DELETE');
  });

  test('profil-studio.js cross-link maps dormant banner present', async ({ request, baseURL }) => {
    var body = await getStudioJs(request, baseURL);
    expect(body).toContain('FROZEN 2026-04-13 (K030) — Cross-link maps dormant');
  });

  test('_htGenelCoachTeaser stub returns empty posts + likedSet', async ({ request, baseURL }) => {
    var body = await getStudioJs(request, baseURL);
    // noop stub literal must be present
    expect(body).toMatch(/window\._htGenelCoachTeaser\s*=\s*function\s*\(\)\s*\{\s*return\s*\{\s*posts:\s*\[\]\s*,\s*likedSet:\s*\{\}\s*\}/);
  });

  test('openCoachDetail export still present (FAZ A keeps Genel feed working)', async ({ request, baseURL }) => {
    var body = await getStudioJs(request, baseURL);
    expect(body).toContain('window.openCoachDetail = openCoachDetail');
  });

  test('original cross-link map definitions preserved (not deleted)', async ({ request, baseURL }) => {
    var body = await getStudioJs(request, baseURL);
    expect(body).toContain('var COMP_TO_COACH_CATEGORY = {');
    expect(body).toContain('var COMP_TO_MODULE_SLUG = {');
    expect(body).toContain('var MODULE_SLUG_TO_COMP');
    expect(body).toContain('var COACH_CAT_TO_COMP');
  });
});
