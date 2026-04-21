// Pass 8 verify harness — her madde icin before/after check
// Usage: node ht-pass8-verify.mjs <phase> <issue>
//   phase: before | after
//   issue: closing-hover | header-uniform | uyeol-pad | giris-height | steps-hover | footer
import { chromium } from 'playwright';
import path from 'node:path';

const phase = process.argv[2] || 'before';
const issue = process.argv[3] || 'closing-hover';
const b = await chromium.launch();

async function newPage(opts = {}) {
  const ctx = await b.newContext({ colorScheme: opts.theme || 'dark', viewport: opts.viewport || { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  return { ctx, p };
}

async function closingHover() {
  const out = [];
  for (const theme of ['light', 'dark']) {
    const { ctx, p } = await newPage({ theme });
    await p.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    // aday segment closing = .closing.verm
    await p.evaluate(() => {
      const el = document.querySelector('.closing.verm');
      el && el.scrollIntoView({ block: 'center' });
    });
    await p.waitForTimeout(400);
    // capture default + hover states for both buttons
    const btns = await p.evaluate(async () => {
      const res = [];
      const btnA = document.querySelector('.closing.verm .btn.btn-ink');
      const btnB = document.querySelector('.closing.verm .btn.btn-outline.light');
      for (const [name, el] of [['btn-ink', btnA], ['btn-outline.light', btnB]]) {
        if (!el) { res.push({ name, missing: true }); continue; }
        const cs = getComputedStyle(el);
        const def = { bg: cs.backgroundColor, color: cs.color };
        res.push({ name, state: 'default', ...def });
      }
      return res;
    });
    // now hover each via mouse
    for (const sel of ['.closing.verm .btn.btn-ink', '.closing.verm .btn.btn-outline.light']) {
      await p.hover(sel);
      await p.waitForTimeout(300);
      const h = await p.evaluate((s) => {
        const el = document.querySelector(s);
        const cs = getComputedStyle(el);
        return { name: s.split('.').slice(-2).join('.'), state: 'hover', bg: cs.backgroundColor, color: cs.color };
      }, sel);
      btns.push(h);
    }
    await p.screenshot({ path: `ht-p8-closing-hover-${theme}-${phase}.png`, fullPage: false, clip: { x: 0, y: 200, width: 1440, height: 700 } });
    out.push({ theme, btns });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 2));
  // flag: verm bg = rgb(201, 78, 40) — hover bg'nin buna esit olmasi sorun
  const verm = 'rgb(201, 78, 40)';
  const bad = out.flatMap(o => o.btns.filter(b => b.state === 'hover' && b.bg === verm));
  if (bad.length) console.log('\nFLAG: hover bg == verm arka plan:', bad.map(b => b.name).join(', '));
  else console.log('\nOK: no hover bg collides with verm background');
}

async function headerUniform() {
  const out = [];
  for (const page of ['index.html', 'hakkimizda.html', 'iletisim.html']) {
    for (const vp of [{ w: 1440, h: 900, label: 'desktop' }, { w: 390, h: 844, label: 'mobile' }]) {
      const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: 'dark' });
      const p = await ctx.newPage();
      await p.goto('file://' + path.resolve(page), { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(600);
      const r = await p.evaluate(() => {
        const hdr = document.querySelector('header');
        const hdrClass = hdr && hdr.className;
        const segToggle = document.querySelector('header .seg-toggle');
        const mobileMenu = document.querySelector('header .mobile-menu, #mobile-menu');
        const links = mobileMenu ? Array.from(mobileMenu.querySelectorAll('a')).map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim(), active: a.classList.contains('active') })) : null;
        return { hdrClass, hasSegToggle: !!segToggle, mobileMenuLinks: links };
      });
      await p.screenshot({ path: `ht-p8-header-${page.replace('.html','')}-${vp.label}-${phase}.png`, fullPage: false, clip: { x: 0, y: 0, width: vp.w, height: 200 } });
      if (vp.label === 'mobile') {
        // open menu
        const btn = await p.$('#btn-mobile-menu, .mobile-menu-btn');
        if (btn) {
          await btn.click();
          await p.waitForTimeout(400);
          await p.screenshot({ path: `ht-p8-header-${page.replace('.html','')}-mobile-open-${phase}.png`, fullPage: false, clip: { x: 0, y: 0, width: vp.w, height: 600 } });
        }
      }
      out.push({ page, vp: vp.label, ...r });
      await ctx.close();
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

async function uyeolPad() {
  const out = [];
  for (const tab of ['aday', 'kurumsal']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(`uye-ol.html?tab=${tab}`), { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const hdr = document.querySelector('header');
      const main = document.querySelector('main, .auth-wrap, .uy-wrap, form, .auth-page, section:first-of-type') || document.body.children[1];
      if (!hdr || !main) return { err: 'selectors missing', hdr: !!hdr, main: !!main };
      const h = hdr.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      return {
        headerBottom: Math.round(h.bottom),
        mainTop: Math.round(m.top),
        gap: Math.round(m.top - h.bottom),
        mainTag: main.tagName + '.' + main.className,
      };
    });
    await p.screenshot({ path: `ht-p8-uyeol-${tab}-${phase}.png`, fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 500 } });
    out.push({ tab, ...r });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 2));
}

async function girisHeight() {
  const out = [];
  for (const tab of ['aday', 'kurumsal']) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve(`giris.html?tab=${tab}`), { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const card = document.querySelector('.auth-card, .giris-card, form, main > section') || document.body;
      const left = document.querySelector('.auth-visual, .auth-image, .auth-left, .side-visual') || null;
      const right = document.querySelector('.auth-form, .auth-right, .side-form') || null;
      const fr = (x) => x ? { h: Math.round(x.getBoundingClientRect().height), tag: x.tagName + '.' + x.className } : null;
      return { left: fr(left), right: fr(right), card: fr(card) };
    });
    await p.screenshot({ path: `ht-p8-giris-${tab}-${phase}.png`, fullPage: true });
    out.push({ tab, ...r });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 2));
}

async function stepsHover() {
  const out = [];
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ colorScheme: theme, viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelector('.steps-row').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(400);
    const def = await p.evaluate(() => {
      const s = document.querySelector('.steps-row .step-card');
      const cs = getComputedStyle(s);
      return { bg: cs.backgroundColor, shadow: cs.boxShadow, transform: cs.transform, border: cs.borderColor, cursor: cs.cursor };
    });
    await p.hover('.steps-row .step-card:first-child');
    await p.waitForTimeout(400);
    const hov = await p.evaluate(() => {
      const s = document.querySelector('.steps-row .step-card');
      const cs = getComputedStyle(s);
      return { bg: cs.backgroundColor, shadow: cs.boxShadow, transform: cs.transform, border: cs.borderColor, cursor: cs.cursor };
    });
    await p.screenshot({ path: `ht-p8-steps-hover-${theme}-${phase}.png`, fullPage: false });
    out.push({ theme, default: def, hover: hov });
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 2));
}

async function footer() {
  const out = [];
  for (const theme of ['light', 'dark']) {
    for (const vp of [{ w: 1440, h: 900, label: 'desktop' }, { w: 390, h: 844, label: 'mobile' }]) {
      const ctx = await b.newContext({ colorScheme: theme, viewport: { width: vp.w, height: vp.h } });
      const p = await ctx.newPage();
      await p.goto('file://' + path.resolve('index.html'), { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1200);
      await p.evaluate(() => document.querySelector('footer').scrollIntoView({ block: 'end' }));
      await p.waitForTimeout(500);
      const r = await p.evaluate(() => {
        const f = document.querySelector('footer');
        if (!f) return { err: 'no footer' };
        const links = Array.from(f.querySelectorAll('a')).map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim(), cls: a.className }));
        const cols = f.querySelectorAll('.ft-col, .footer-col, .col').length;
        const logo = f.querySelector('.lp-logo, .ft-logo, .logo');
        const tagline = f.querySelector('.ft-tagline, .tagline, p');
        const rect = (e) => e ? { w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } : null;
        return { links, cols, logoRect: rect(logo), taglineRect: rect(tagline), footerH: Math.round(f.getBoundingClientRect().height) };
      });
      const el = await p.$('footer');
      if (el) await el.screenshot({ path: `ht-p8-footer-${theme}-${vp.label}-${phase}.png` });
      out.push({ theme, vp: vp.label, ...r });
      await ctx.close();
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

const map = { 'closing-hover': closingHover, 'header-uniform': headerUniform, 'uyeol-pad': uyeolPad, 'giris-height': girisHeight, 'steps-hover': stepsHover, 'footer': footer };
const fn = map[issue];
if (!fn) { console.error('Unknown issue:', issue); process.exit(2); }
await fn();
await b.close();
