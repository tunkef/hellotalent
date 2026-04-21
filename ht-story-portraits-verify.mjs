// Story portrait verify — 6 img src + natural dimensions + alt text
import { chromium } from 'playwright';
import path from 'node:path';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);

const segs = ['adaylar', 'kurumsal'];
const out = [];
for (const seg of segs) {
  await p.evaluate((s) => {
    document.getElementById('seg-adaylar').style.display = s === 'adaylar' ? 'block' : 'none';
    document.getElementById('seg-kurumsal').style.display = s === 'kurumsal' ? 'block' : 'none';
  }, seg);
  await p.waitForTimeout(600);
  const imgs = await p.evaluate((s) => {
    const root = document.getElementById('seg-' + s);
    const els = root.querySelectorAll('.story-portrait img');
    return Array.from(els).map(img => ({
      src: img.src.split('/').pop(),
      alt: img.alt,
      natW: img.naturalWidth,
      natH: img.naturalHeight,
      ok: img.naturalWidth > 0 && img.complete,
    }));
  }, seg);
  out.push({ seg, imgs });
}
await b.close();
console.log(JSON.stringify(out, null, 2));
const broken = out.flatMap(o => o.imgs.filter(i => !i.ok));
if (broken.length) {
  console.error('FAIL: broken images', broken);
  process.exit(1);
}
const expected = {
  adaylar:   ['story-selin.webp',  'story-kerem.webp',  'story-zeynep.webp'],
  kurumsal:  ['story-ece.webp',    'story-burak.webp',  'story-merve.webp'],
};
for (const o of out) {
  const got = o.imgs.map(i => i.src.split('?')[0]);
  const exp = expected[o.seg];
  if (JSON.stringify(got) !== JSON.stringify(exp)) {
    console.error(`FAIL: ${o.seg} src mismatch\n  got: ${got}\n  exp: ${exp}`);
    process.exit(1);
  }
}
console.log('OK: 6 portraits loaded, src matches expected mapping');
