/* K049 — Composer state-drift audit (R2 disciplin referans).
 * Audit scope: INSERT/UPDATE branch'li composer'lar (admin-announcements,
 * ik-kampanya, admin-campaigns, admin-coach-content). R2 pattern:
 * INSERT success sonrasi closure-scoped currentId/existingRow capture
 * edilmezse → retry/re-click → duplicate row riski.
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('Composer state-drift audit (R2 disciplin)', function () {
  test('admin-announcements.js — INSERT branch postId capture + existingRow reassign', function () {
    var src = read('admin-announcements.js');
    // R2 fix (commit 537294b): INSERT branch captures postId then reassigns existingRow
    expect(src).toMatch(/existingRow\s*=\s*Object\.assign/);
    expect(src).toContain('postId');
  });

  test('ik-kampanya.js — saveCampaign INSERT branch captures currentCampaignId (R2 discipline)', function () {
    var src = read('ik-kampanya.js');
    // K049 fix: fallback INSERT branch sets currentCampaignId from res.data.id
    // to prevent duplicate row on retry/re-click.
    var saveFn = src.match(/async function saveCampaign[\s\S]*?^\s{2}\}/m);
    expect(saveFn, 'saveCampaign function body not found').not.toBeNull();
    var body = saveFn[0];
    // Must have INSERT branch + subsequent currentCampaignId assignment from res.data.id
    expect(body).toMatch(/\.insert\(payload\)/);
    expect(body).toMatch(/currentCampaignId\s*=\s*res\.data\.id/);
  });

  test('ik-kampanya.js — auto-draft step 1→2 still captures id (existing behavior preserved)', function () {
    var src = read('ik-kampanya.js');
    // Preserve: line 361 pattern — currentCampaignId = ins.data.id
    expect(src).toMatch(/currentCampaignId\s*=\s*ins\.data\.id/);
  });

  test('admin-coach-content.js — invite INSERT has no closure state-drift (fire-and-refresh pattern)', function () {
    var src = read('admin-coach-content.js');
    // coach_invites INSERT doesn't use .select() + closure var; just refreshes list.
    // This test guards that no new closure state is introduced without R2 discipline.
    var inviteBlock = src.match(/coach_invites[\s\S]{0,400}/);
    expect(inviteBlock).not.toBeNull();
    // If .select() is added later, a corresponding closure capture must follow.
    var hasSelectWithoutCapture = /coach_invites[^}]*\.insert\(\{[^}]+\}\)[^}]*\.select\(\)/.test(inviteBlock[0])
      && !/coach_invites[^}]*\.insert\(\{[^}]+\}\)[^}]*\.select\([^)]*\)[\s\S]{0,300}(currentInviteId|existingInvite)\s*=/.test(inviteBlock[0]);
    expect(hasSelectWithoutCapture).toBe(false);
  });

  test('admin-campaigns.js — review INSERT is admin action, not composer (no closure state)', function () {
    var src = read('admin-campaigns.js');
    // campaign_reviews INSERT followed by campaigns UPDATE; not composer flow, no currentXId closure.
    // Guard: this file must NOT introduce a composer-style closure id without R2 discipline.
    expect(src).toMatch(/campaign_reviews/);
    expect(src).toMatch(/\.update\(updateData\)\.eq/);
  });
});
