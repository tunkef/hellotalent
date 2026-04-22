/**
 * Ultrareview #1 Finding R1 — admin-announcements.js silent unpin guard.
 *
 * Bug: composer edit pinInput.checked was initialized from existingRow.is_pinned,
 * but ht_announcements schema only has pinned_until timestamptz. Column read
 * always returned undefined → checkbox unchecked → save() wrote pinned_until:null
 * every edit, silently demoting pinned posts out of the feed sticky slot.
 *
 * Fix: derive pinInput.checked from existingRow.pinned_until + Date comparison,
 * matching the list renderer pattern at line 133.
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readFromRepo(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('Ultrareview R1 — admin-announcements silent unpin', function () {
  var src;
  test.beforeAll(function () {
    src = readFromRepo('admin-announcements.js');
  });

  test('composer does not read non-existent existingRow.is_pinned column', function () {
    // Schema only defines pinned_until timestamptz (supabase/migrations).
    // Reading is_pinned is a schema contract violation.
    expect(src).not.toMatch(/existingRow\s*&&\s*existingRow\.is_pinned/);
    expect(src).not.toMatch(/existingRow\.is_pinned/);
  });

  test('pin checkbox initialized from pinned_until + future-date comparison', function () {
    // Composer edit path at the "Sabitle (24 saat)" label must mirror the
    // list renderer pattern (line 133: pinned_until && new Date(...) > new Date()).
    var pinBlockIdx = src.indexOf('Sabitle (24 saat)');
    expect(pinBlockIdx, 'pin label block not found').toBeGreaterThan(-1);
    var pinBlock = src.substring(pinBlockIdx, pinBlockIdx + 600);
    // Must consult existingRow.pinned_until
    expect(pinBlock).toMatch(/existingRow[^;]*pinned_until/);
    // Must compare against current time so expired pins load unchecked
    expect(pinBlock).toMatch(/new Date\([^)]*pinned_until[^)]*\)\s*>\s*new Date\(\)/);
  });

  test('list renderer pin-status derivation unchanged (reference pattern)', function () {
    // Sanity: the reference pattern (line ~133) still exists and reads the
    // correct column. If this shifts, the fix above may have silently broken.
    expect(src).toMatch(/r\.pinned_until\s*&&\s*new Date\(r\.pinned_until\)\s*>\s*new Date\(\)/);
  });
});
