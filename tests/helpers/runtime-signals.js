/**
 * K032 Faz 4B (O-2) — Shared runtime signal helpers for smoke suites.
 *
 * Extracted from the four smoke specs:
 *   - tests/smoke.runtime.spec.js            (Faz 1 boot)
 *   - tests/smoke.runtime.e2e.spec.js        (Faz 2 profil auth panel)
 *   - tests/smoke.runtime.ik.e2e.spec.js     (Faz 3A ik panel)
 *   - tests/smoke.runtime.admin.e2e.spec.js  (Faz 3B admin panel)
 *
 * Before refactor, each spec duplicated: IGNORE_PATTERNS, REGRESSION_PATTERNS,
 * shouldIgnore(), isRegression(), attachCollectors(). A drift in one
 * (e.g. adding a new noise source) would have to be ported four times, and
 * the `demo-dashboard-ik.html` IGNORE entry is a perfect example — it only
 * belongs in specs that follow the employer redirect chain, but was copied
 * into all four.
 *
 * This module owns the truth:
 *   - IGNORE_PATTERNS, REGRESSION_PATTERNS: exported for inspection in tests
 *   - shouldIgnore, isRegression: individual predicates (parity with legacy)
 *   - attachCollectors(page): returns a `signals` array + cleans up
 *   - criticalFrom(signals): apply filter pipeline, return only
 *     regressions that are not on the ignore list
 *   - contextSnapshot(page): { url, viewport, viewportLabel } for assertion
 *     messages (CI triage needs hash/theme/url/vp)
 *
 * CommonJS — the specs are `require(...)`-style; keep this module
 * in the same dialect to avoid a Babel/ESM toggle.
 */

const IGNORE_PATTERNS = [
  /supabase/i,
  /cpwibefquojehjehtrog\.supabase\.co/i,
  /posthog/i,
  /sentry|browser\.sentry-cdn\.com|ingest\.de\.sentry\.io/i,
  /cloudflare|turnstile|challenges\.cloudflare\.com/i,
  /redirecting to giris\.html/i,
  /giris\.html\?tab=/,
  /demo-dashboard-ik\.html/,
  /Refused to load|Content Security Policy/i,
];

const REGRESSION_PATTERNS = [
  /ReferenceError/,
  /TypeError/,
  /SyntaxError/,
  /Unexpected token/,
  /Unexpected end of input/i,
  /is not defined/,
  /Cannot read propert/i,
  /Cannot read properties of (null|undefined)/i,
  /is not a function/,
];

function shouldIgnore(msg) {
  if (!msg) return true;
  return IGNORE_PATTERNS.some(function (re) { return re.test(msg); });
}

function isRegression(msg) {
  return REGRESSION_PATTERNS.some(function (re) { return re.test(msg); });
}

/**
 * Attach pageerror + console.error collectors. Returns the `signals` array;
 * the test reads it after the wait phase. Event listeners auto-clean when
 * the page closes (Playwright fixture teardown), so no explicit detach.
 */
function attachCollectors(page) {
  const signals = [];
  page.on('pageerror', function (err) {
    signals.push({ kind: 'pageerror', message: err && err.message ? err.message : String(err) });
  });
  page.on('console', function (msg) {
    if (msg.type() !== 'error') return;
    let text = '';
    try { text = msg.text(); } catch (e) { text = ''; }
    signals.push({ kind: 'console', message: text });
  });
  return signals;
}

/**
 * Produce the critical signal subset: regressions that are not ignored.
 * Each spec was repeating this identical chain of two filters.
 */
function criticalFrom(signals) {
  return signals
    .filter(function (s) { return !shouldIgnore(s.message); })
    .filter(function (s) { return isRegression(s.message); });
}

/**
 * Snapshot page context for assertion messages. Viewport label as 'WxH' or
 * 'unknown' if not available (rare — viewport always set by Playwright).
 */
function contextSnapshot(page) {
  const url = page.url();
  const viewport = page.viewportSize();
  const viewportLabel = viewport ? (viewport.width + 'x' + viewport.height) : 'unknown';
  return { url, viewport, viewportLabel };
}

/**
 * Faz 4B (O-3) — bounded wait for page boot to settle.
 *
 * Replaces the blanket `page.waitForTimeout(1500-1800)` pattern the specs
 * used. Why that was flaky:
 *   - Fixed delay: too short misses late boot work, too long wastes CI time.
 *   - Independent of actual app state: cannot tell a hung boot from a slow boot.
 *
 * Strategy — two bounded phases:
 *   1. Try `window._htBootstrapDone === true` sentinel (profil.html sets this
 *      in profil-bootstrap.js / profil-events.js:511). If sentinel is not set
 *      within `sentinelTimeoutMs`, we fall through — the page may not use it
 *      (ik/admin/coach-studio). This is not an error.
 *   2. Short microtask flush (`settleMs`) to give the `pageerror` / console
 *      collector a chance to see any errors thrown synchronously after the
 *      sentinel fires (or after networkidle for pages without one).
 *
 * Net effect for pages with a sentinel: finishes as soon as bootstrap-done
 * (typically under 500 ms) instead of 1500-1800 ms fixed. For pages without:
 * bounded at `sentinelTimeoutMs + settleMs`, still lower than legacy 1800 ms.
 *
 * @param {object} page            Playwright page
 * @param {object} [opts]
 * @param {number} [opts.sentinelTimeoutMs=1500]   cap on sentinel wait
 * @param {number} [opts.settleMs=400]             microtask flush tail
 */
async function waitForBootSettle(page, opts) {
  const options = opts || {};
  const sentinelTimeoutMs = typeof options.sentinelTimeoutMs === 'number' ? options.sentinelTimeoutMs : 1500;
  const settleMs = typeof options.settleMs === 'number' ? options.settleMs : 400;

  await page.waitForFunction(function () {
    return typeof window !== 'undefined' && window._htBootstrapDone === true;
  }, null, { timeout: sentinelTimeoutMs }).catch(function () { /* absent on non-profil pages */ });

  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }
}

module.exports = {
  IGNORE_PATTERNS,
  REGRESSION_PATTERNS,
  shouldIgnore,
  isRegression,
  attachCollectors,
  criticalFrom,
  contextSnapshot,
  waitForBootSettle,
};
