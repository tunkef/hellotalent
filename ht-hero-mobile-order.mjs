// Mobile hero order check — 3 sayfa x light/dark, copy once video sonra mi?
import { chromium } from 'playwright';
import path from 'node:path';

const pages = [
  { name: 'index-aday',    file: 'index.html',      copySel: '#seg-adaylar .hero-copy',     visSel: '#seg-adaylar .hero-portrait' },
  { name: 'index-kurumsal',file: 'index.html',      copySel: '#seg-kurumsal .hero-copy',    visSel: '#seg-kurumsal .hero-portrait', switchKurumsal: true },
  { name: 'hakkimizda',    file: 'hakkimizda.html', heroSel: '.about-hero-inner',           copySel: '.about-hero-inner > div:first-child', visSel: '.about-hero-vis' },
  { name: 'iletisim',      file: 'iletisim.html',   heroSel: '.contact-hero-inner',         copySel: '.contact-hero-inner > div:first-child', visSel: '.contact-hero-vis' },
];

const themes = ['light', 'dark'];
const b = await chromium.launch();
const results = [];

for (const pg of pages) {
  for (const theme of themes) {
    const ctx = await b.newContext({
      colorScheme: theme,
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(pg.file), { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    if (pg.switchKurumsal) {
      await p.evaluate(() => {
        const a = document.getElementById('seg-adaylar');
        const k = document.getElementById('seg-kurumsal');
        if (a) a.style.display = 'none';
        if (k) k.style.display = 'block';
      });
      await p.waitForTimeout(400);
    }
    const r = await p.evaluate((sel) => {
      const copy = document.querySelector(sel.copySel);
      const vis  = document.querySelector(sel.visSel);
      if (!copy || !vis) return { found: false, copy: !!copy, vis: !!vis };
      const c = copy.getBoundingClientRect();
      const v = vis.getBoundingClientRect();
      return {
        found: true,
        copyTop: Math.round(c.top),
        visTop: Math.round(v.top),
        copyFirst: c.top < v.top,
      };
    }, { copySel: pg.copySel, visSel: pg.visSel });

    const shot = `ht-hero-order-${pg.name}-${theme}.png`;
    await p.screenshot({ path: shot, fullPage: false });
    results.push({ page: pg.name, theme, ...r, shot });
    await ctx.close();
  }
}
await b.close();
console.log(JSON.stringify(results, null, 2));
const fail = results.filter(r => !r.copyFirst);
if (fail.length) {
  console.error('FAIL: video before copy on', fail.map(f => `${f.page}/${f.theme}`).join(', '));
  process.exit(1);
}
console.log('OK: copy first on all', results.length, 'views');
