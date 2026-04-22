/**
 * Ultrareview #1 Finding R2 — admin-announcements.js INSERT branch closure sync.
 *
 * Bug: save() INSERT branch (line 631-637) assigned postId but never reassigned
 * the closure-scoped existingRow. If a media upload failed after the initial
 * INSERT, the composer surfaced "Tekrar Yayinla'ya basabilirsin" and re-enabled
 * the submit button, but existingRow was still null, so retry re-entered the
 * INSERT branch and wrote a second ht_announcements row. Result: orphan media
 * attached to POST_1, retry media attached to POST_2, duplicate feed entries.
 *
 * Schema: ht_announcements has id PK + admin_id FK only — no DB-level dedupe.
 *
 * Fix: after postId assignment, sync existingRow so the next save() iteration
 * (retry) takes the UPDATE path, mirroring the discipline the UPDATE branch
 * already applies to published_at (line 625-628).
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readFromRepo(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('Ultrareview R2 — INSERT branch closure sync', function () {
  var src;
  test.beforeAll(function () {
    src = readFromRepo('admin-announcements.js');
  });

  test('INSERT branch reassigns existingRow after postId is captured', function () {
    // Locate the INSERT branch (the else clause that calls .insert on ht_announcements).
    var insertStart = src.indexOf("supa.from('ht_announcements').insert(payload)");
    expect(insertStart, 'INSERT call not found').toBeGreaterThan(-1);
    // The sync must live in the 400 chars after the INSERT call, before the
    // media-upload loop starts (mediaErrors declaration).
    var mediaErrorsIdx = src.indexOf('var mediaErrors', insertStart);
    expect(mediaErrorsIdx, 'mediaErrors block not found').toBeGreaterThan(insertStart);
    var window = src.substring(insertStart, mediaErrorsIdx);
    // Must assign existingRow in this window so retry enters UPDATE branch.
    expect(window).toMatch(/existingRow\s*=/);
    // Must carry postId into the assignment (not a literal null reassignment).
    expect(window).toMatch(/existingRow\s*=[^;]*postId/);
  });

  test('closure sync comment explains retry-after-media-error intent', function () {
    // Matches the discipline of the UPDATE branch comment ("media-error retry
    // scenario") so future readers see both branches guard the same invariant.
    var insertStart = src.indexOf("supa.from('ht_announcements').insert(payload)");
    var mediaErrorsIdx = src.indexOf('var mediaErrors', insertStart);
    var window = src.substring(insertStart, mediaErrorsIdx);
    expect(window.toLowerCase()).toMatch(/retry|tekrar|re-?try|duplicate/);
  });

  test('UPDATE branch existing closure discipline intact (reference)', function () {
    // Sanity: the UPDATE branch still syncs published_at. If this shifts the
    // invariant has drifted and both branches need reconsideration.
    expect(src).toMatch(/existingRow\.published_at\s*=/);
  });
});
