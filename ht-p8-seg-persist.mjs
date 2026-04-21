// Pass 8 #5 — segment persistence test
import { chromium } from 'playwright';
import path from 'node:path';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const results = [];

// 1. Set sessionStorage to 'kurumsal' via index (switchSeg)
await p.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(500);
await p.evaluate(() => window.switchSeg('kurumsal', true));
await p.waitForTimeout(300);
const idxSet = await p.evaluate(() => ({ stored: sessionStorage.getItem('ht_seg') }));
results.push({ step: 'index-set-kurumsal', ...idxSet });

// 2. Navigate to hakkimizda — expect kurumsal active + ?tab=ik
await p.goto('file://' + path.resolve('hakkimizda.html'), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(400);
const h1 = await p.evaluate(() => ({
  stored: sessionStorage.getItem('ht_seg'),
  activeSeg: document.querySelector('.seg-btn.active')?.dataset.seg,
  loginHref: document.querySelector('.lp-cta a[href^="giris.html"]')?.href,
}));
results.push({ step: 'hakkimizda-kurumsal-state', ...h1 });

// 3. Navigate to iletisim — same check
await p.goto('file://' + path.resolve('iletisim.html'), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(400);
const i1 = await p.evaluate(() => ({
  stored: sessionStorage.getItem('ht_seg'),
  activeSeg: document.querySelector('.seg-btn.active')?.dataset.seg,
  loginHref: document.querySelector('.lp-cta a[href^="giris.html"]')?.href,
}));
results.push({ step: 'iletisim-kurumsal-state', ...i1 });

// 4. Reset — switch to adaylar via index, navigate back to hakkimizda
await p.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(400);
await p.evaluate(() => window.switchSeg('adaylar', true));
await p.waitForTimeout(300);
await p.goto('file://' + path.resolve('hakkimizda.html'), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(400);
const h2 = await p.evaluate(() => ({
  stored: sessionStorage.getItem('ht_seg'),
  activeSeg: document.querySelector('.seg-btn.active')?.dataset.seg,
  loginHref: document.querySelector('.lp-cta a[href^="giris.html"]')?.href,
}));
results.push({ step: 'hakkimizda-back-to-adaylar', ...h2 });

// 5. Fresh session — no sessionStorage, hakkimizda direct open
const ctx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto('file://' + path.resolve('hakkimizda.html'), { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(400);
const fresh = await p2.evaluate(() => ({
  stored: sessionStorage.getItem('ht_seg'),
  activeSeg: document.querySelector('.seg-btn.active')?.dataset.seg,
  loginHref: document.querySelector('.lp-cta a[href^="giris.html"]')?.href,
}));
results.push({ step: 'hakkimizda-fresh-session', ...fresh });
await ctx2.close();

console.log(JSON.stringify(results, null, 2));

// Assertions
const failures = [];
if (results[1].activeSeg !== 'kurumsal' || !results[1].loginHref.includes('tab=ik')) failures.push('hakkimizda did not hydrate kurumsal');
if (results[2].activeSeg !== 'kurumsal' || !results[2].loginHref.includes('tab=ik')) failures.push('iletisim did not hydrate kurumsal');
if (results[3].activeSeg !== 'adaylar' || !results[3].loginHref.includes('tab=aday')) failures.push('hakkimizda did not update to adaylar');
if (results[4].activeSeg !== 'adaylar' || !results[4].loginHref.includes('tab=aday')) failures.push('fresh session did not default to adaylar');

await b.close();
if (failures.length) {
  console.error('\nFAIL:', failures);
  process.exit(1);
}
console.log('\nOK: 5 persistence scenarios all pass');
