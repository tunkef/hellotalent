// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

const viewports = [
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'SmallDesktop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
];

const pages = [
  { slug: 'hakkimizda.html', label: 'Hakkimizda' },
  { slug: 'iletisim.html', label: 'Iletisim' },
];

for (const pg of pages) {
  for (const vp of viewports) {
    test.describe(`${pg.label} @ ${vp.name} (${vp.width}x${vp.height})`, () => {

      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      // 1. Navigate + screenshot (light mode)
      test(`navigate and screenshot`, async ({ page }) => {
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({
          path: `test-results/${pg.label}-${vp.name}-light.png`,
          fullPage: true,
        });
      });

      // 2. Horizontal overflow check
      test(`no horizontal overflow`, async ({ page }) => {
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        const result = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          // Find which elements overflow
          const overflowing = [];
          document.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.right > clientW + 2) {
              overflowing.push({
                tag: el.tagName,
                className: el.className?.toString().substring(0, 60),
                right: Math.round(r.right),
                width: Math.round(r.width),
              });
            }
          });
          return { scrollW, clientW, overflow: scrollW > clientW, overflowing: overflowing.slice(0, 10) };
        });
        if (result.overflow) {
          console.log(`OVERFLOW: scrollWidth=${result.scrollW} clientWidth=${result.clientW} diff=${result.scrollW - result.clientW}px`);
          console.log('Overflowing elements:', JSON.stringify(result.overflowing, null, 2));
        }
        expect(result.overflow, `Horizontal overflow: ${result.scrollW - result.clientW}px | ${JSON.stringify(result.overflowing)}`).toBe(false);
      });

      // 3. Broken images check
      test(`no broken images`, async ({ page }) => {
        // Collect failed network requests for images
        const failedRequests = [];
        page.on('requestfailed', req => {
          if (req.resourceType() === 'image') {
            failedRequests.push(req.url());
          }
        });
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        // Also check DOM
        const brokenInDOM = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('img'))
            .filter(img => img.src && (!img.complete || img.naturalWidth === 0))
            .map(img => ({ src: img.src, alt: img.alt, classes: img.className }));
        });
        const allBroken = [...brokenInDOM.map(b => b.src), ...failedRequests];
        if (allBroken.length > 0) {
          console.log('BROKEN IMAGES:', JSON.stringify(allBroken));
        }
        // Filter out known external (maps, etc)
        const realBroken = brokenInDOM.filter(b => !b.src.includes('google'));
        expect(realBroken.length, `Broken images: ${JSON.stringify(realBroken)}`).toBe(0);
      });

      // 4. Hero section: text + image grid alignment
      test(`hero section layout`, async ({ page }) => {
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        const heroInfo = await page.evaluate(() => {
          const hero = document.querySelector('.hero');
          if (!hero) return { found: false };
          const inner = hero.querySelector('.s-inner');
          if (!inner) return { found: true, hasInner: false };
          const children = Array.from(inner.children);
          const rects = children.map(c => {
            const r = c.getBoundingClientRect();
            return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right) };
          });
          const heroRect = hero.getBoundingClientRect();
          const isSingleCol = rects.length >= 2 && Math.abs(rects[0].left - rects[1].left) < 20;
          const heroVis = hero.querySelector('.hero-vis img');
          const imgLoaded = heroVis ? heroVis.complete && heroVis.naturalWidth > 0 : false;
          return {
            found: true, hasInner: true,
            heroWidth: Math.round(heroRect.width),
            overflowsViewport: heroRect.right > window.innerWidth + 2,
            childRects: rects,
            isSingleCol,
            heroImgLoaded: imgLoaded,
          };
        });
        console.log('Hero:', JSON.stringify(heroInfo));
        expect(heroInfo.found, 'Hero section not found').toBe(true);
        expect(heroInfo.overflowsViewport, 'Hero overflows viewport').toBeFalsy();
        // On mobile, should be single column
        if (vp.width <= 768) {
          expect(heroInfo.isSingleCol, 'Hero should be single-col on mobile/tablet').toBe(true);
        }
      });

      // 5. Card grids: stack on mobile
      test(`card grids layout`, async ({ page }) => {
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        const gridInfo = await page.evaluate(() => {
          const selectors = ['.values-grid', '.contact-grid', '.grid', '[class*="grid"]'];
          const grids = [];
          selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(grid => {
              if (grids.includes(grid)) return;
              grids.push(grid);
            });
          });
          return grids.map(grid => {
            const children = Array.from(grid.children);
            const rects = children.map(c => {
              const r = c.getBoundingClientRect();
              return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), bottom: Math.round(r.bottom) };
            });
            // Check if stacked (all same left) or side-by-side
            const allSameLeft = rects.every(r => Math.abs(r.left - rects[0].left) < 5);
            // Check overlap
            const hasOverlap = rects.some((r, i) => {
              if (i === 0) return false;
              return r.top < rects[i - 1].bottom - 5;
            });
            // Check if any child overflows viewport
            const anyOverflow = rects.some(r => r.left + r.width > window.innerWidth + 2);
            return {
              className: grid.className,
              childCount: children.length,
              stacked: allSameLeft,
              hasOverlap,
              anyOverflow,
            };
          });
        });
        console.log('Grids:', JSON.stringify(gridInfo));
        if (vp.width <= 390) {
          for (const g of gridInfo) {
            expect(g.stacked, `Grid "${g.className}" should stack on mobile`).toBe(true);
            expect(g.hasOverlap, `Grid "${g.className}" has overlapping children`).toBe(false);
          }
        }
        for (const g of gridInfo) {
          expect(g.anyOverflow, `Grid "${g.className}" overflows viewport`).toBe(false);
        }
      });

      // 6. Footer visibility
      test(`footer visible and not overlapped`, async ({ page }) => {
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        const footerInfo = await page.evaluate(() => {
          const footer = document.querySelector('footer') ||
                         document.querySelector('#ht-footer') ||
                         document.querySelector('[class*="footer"]');
          if (!footer) return { found: false };
          const rect = footer.getBoundingClientRect();
          const style = getComputedStyle(footer);
          // Check if the scene image overlaps footer
          const sceneImg = document.querySelector('.cta-img');
          let sceneOverlapsFooter = false;
          if (sceneImg) {
            const sr = sceneImg.getBoundingClientRect();
            sceneOverlapsFooter = sr.bottom > rect.top + 5 && sr.top < rect.top;
          }
          return {
            found: true,
            height: Math.round(rect.height),
            visible: style.display !== 'none' && style.visibility !== 'hidden',
            hasContent: footer.innerHTML.trim().length > 10,
            sceneOverlapsFooter,
          };
        });
        console.log('Footer:', JSON.stringify(footerInfo));
        expect(footerInfo.found, 'Footer element not found').toBe(true);
        // Footer is injected by shared.js - check if it has content
        if (!footerInfo.hasContent) {
          console.log('NOTE: Footer (#ht-footer) exists but has no content - may be JS-injected');
        }
        expect(footerInfo.sceneOverlapsFooter, 'Scene image overlaps footer').toBe(false);
      });

      // 7. Dark mode
      test(`dark mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({
          path: `test-results/${pg.label}-${vp.name}-dark.png`,
          fullPage: true,
        });
        const colors = await page.evaluate(() => {
          const body = document.body;
          const bodyBg = getComputedStyle(body).backgroundColor;
          // Check a few key elements
          const hero = document.querySelector('.hero');
          const heroBg = hero ? getComputedStyle(hero).backgroundColor : null;
          const h1 = document.querySelector('h1');
          const h1Color = h1 ? getComputedStyle(h1).color : null;
          return { bodyBg, heroBg, h1Color };
        });
        console.log('Dark mode colors:', JSON.stringify(colors));
        // Body bg should not be white in dark mode
        const isLightBg = colors.bodyBg === 'rgb(255, 255, 255)' ||
                          colors.bodyBg === 'rgb(247, 246, 244)' ||
                          colors.bodyBg === 'rgba(0, 0, 0, 0)';
        expect(isLightBg, `Dark mode not applied: body bg = ${colors.bodyBg}`).toBe(false);
      });

      // ═══ PAGE-SPECIFIC ═══

      if (pg.slug === 'hakkimizda.html') {
        test(`value cards with SVG illustrations`, async ({ page }) => {
          await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
          const info = await page.evaluate(() => {
            const cards = document.querySelectorAll('.value-card');
            return Array.from(cards).map(card => {
              const vis = card.querySelector('.value-vis img');
              const title = card.querySelector('.value-t');
              return {
                title: title?.textContent?.trim().substring(0, 50),
                imgSrc: vis?.getAttribute('src'),
                isSVG: vis?.getAttribute('src')?.endsWith('.svg'),
                imgLoaded: vis ? vis.complete && vis.naturalWidth > 0 : false,
                visHeight: card.querySelector('.value-vis')?.getBoundingClientRect().height,
              };
            });
          });
          console.log('Value cards:', JSON.stringify(info));
          expect(info.length, 'No value cards found').toBeGreaterThan(0);
          for (const card of info) {
            expect(card.isSVG, `Card "${card.title}" image is not SVG`).toBe(true);
            expect(card.imgLoaded, `Card "${card.title}" SVG failed to load`).toBe(true);
          }
        });

        test(`CTA buttons (Profil Olustur / Demo Talep Et)`, async ({ page }) => {
          await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
          const btns = await page.evaluate(() => {
            const profilBtn = document.querySelector('.btn-verm');
            const demoBtn = document.querySelector('.btn-navy-o');
            const allCtas = document.querySelectorAll('.section-cta-btns a');
            return {
              profilBtn: profilBtn ? { text: profilBtn.textContent.trim(), href: profilBtn.getAttribute('href'), visible: profilBtn.offsetParent !== null } : null,
              demoBtn: demoBtn ? { text: demoBtn.textContent.trim(), href: demoBtn.getAttribute('href'), visible: demoBtn.offsetParent !== null } : null,
              ctaCount: allCtas.length,
            };
          });
          console.log('CTA buttons:', JSON.stringify(btns));
          expect(btns.profilBtn, 'Profil Olustur button not found').toBeTruthy();
          expect(btns.demoBtn, 'Demo Talep Et button not found').toBeTruthy();
          expect(btns.profilBtn?.text).toContain('Profil');
          expect(btns.demoBtn?.text).toContain('Demo');
        });

        test(`mission split section with tags`, async ({ page }) => {
          await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
          const info = await page.evaluate(() => {
            const splits = document.querySelectorAll('.split');
            return Array.from(splits).map(split => {
              const children = Array.from(split.children);
              const rects = children.map(c => {
                const r = c.getBoundingClientRect();
                return { left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top) };
              });
              const tags = split.querySelectorAll('.tag');
              const isSideBySide = rects.length >= 2 && Math.abs(rects[0].top - rects[1].top) < 50;
              return {
                childCount: children.length,
                tagCount: tags.length,
                tagTexts: Array.from(tags).map(t => t.textContent.trim()),
                isSideBySide,
                rects,
              };
            });
          });
          console.log('Mission splits:', JSON.stringify(info));
          expect(info.length, 'No split sections found').toBeGreaterThan(0);
          // On desktop, split should be side-by-side
          if (vp.width >= 1024 && info[0]) {
            expect(info[0].isSideBySide, 'Split section should be side-by-side on desktop').toBe(true);
          }
          // Tags should exist
          if (info[0]) {
            expect(info[0].tagCount, 'No tags in mission section').toBeGreaterThan(0);
          }
        });
      }

      if (pg.slug === 'iletisim.html') {
        test(`Google Maps iframe loads`, async ({ page }) => {
          await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
          const info = await page.evaluate(() => {
            const iframe = document.querySelector('.hq-map iframe');
            if (!iframe) return { found: false };
            const rect = iframe.getBoundingClientRect();
            return {
              found: true,
              src: iframe.src?.substring(0, 60),
              isGoogleMaps: iframe.src?.includes('google.com/maps'),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              visible: rect.height > 0 && rect.width > 0,
            };
          });
          console.log('Maps:', JSON.stringify(info));
          expect(info.found, 'Google Maps iframe not found').toBe(true);
          expect(info.isGoogleMaps, 'Iframe src is not Google Maps').toBe(true);
          expect(info.visible, 'Maps iframe has zero dimensions').toBe(true);
        });

        test(`HQ section split layout`, async ({ page }) => {
          await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
          const info = await page.evaluate(() => {
            const hq = document.querySelector('.hq');
            if (!hq) return { found: false };
            const inner = hq.querySelector('.s-inner');
            const children = inner ? Array.from(inner.children) : [];
            const rects = children.map(c => {
              const r = c.getBoundingClientRect();
              return { left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top) };
            });
            const isSplit = rects.length >= 2 && Math.abs(rects[0].top - rects[1].top) < 80;
            return {
              found: true,
              childCount: children.length,
              isSplit,
              rects,
            };
          });
          console.log('HQ layout:', JSON.stringify(info));
          expect(info.found, 'HQ section not found').toBe(true);
          if (vp.width >= 1024) {
            expect(info.isSplit, 'HQ should be 2-column on desktop').toBe(true);
          }
        });

        test(`social icon buttons visible`, async ({ page }) => {
          await page.goto(`${BASE}/${pg.slug}`, { waitUntil: 'networkidle', timeout: 30000 });
          const info = await page.evaluate(() => {
            const socials = document.querySelectorAll('.hq-social');
            return Array.from(socials).map(s => {
              const r = s.getBoundingClientRect();
              return {
                label: s.getAttribute('aria-label'),
                href: s.href,
                hasSvg: s.querySelector('svg') !== null,
                width: Math.round(r.width),
                height: Math.round(r.height),
                visible: r.width > 0 && r.height > 0,
              };
            });
          });
          console.log('Social icons:', JSON.stringify(info));
          expect(info.length, 'No social icons found').toBeGreaterThan(0);
          for (const icon of info) {
            expect(icon.hasSvg, `Social "${icon.label}" missing SVG icon`).toBe(true);
            expect(icon.visible, `Social "${icon.label}" not visible`).toBe(true);
          }
        });
      }
    });
  }
}
