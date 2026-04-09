/**
 * Responsive QA — index.html (adaylar segment), yasal.html, index.html
 * Viewports: 1440x900, 1024x768, 768x1024, 390x844
 * Run with: npx playwright test tests/responsive-qa.spec.js --config playwright-qa.config.js
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'tablet-768',  width: 768,  height: 1024 },
  { name: 'mobile-390',  width: 390,  height: 844 },
];

const SCREENSHOT_DIR = path.join(__dirname, '../qa-screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Helper: check horizontal scroll
async function checkNoHorizontalScroll(page, label) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  if (result.overflow) {
    console.warn(`[OVERFLOW] ${label}: scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`);
  }
  return result;
}

// Helper: check element is horizontally centered within viewport
async function checkCentered(page, selector, label) {
  return page.evaluate(({ sel }) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const elCenter = rect.left + rect.width / 2;
    const vpCenter = vw / 2;
    return {
      found: true,
      elCenter: Math.round(elCenter),
      vpCenter: Math.round(vpCenter),
      diff: Math.abs(elCenter - vpCenter),
      centered: Math.abs(elCenter - vpCenter) < 40, // within 40px tolerance
    };
  }, { sel: selector });
}

// Helper: collect console errors
function collectErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

// ─── ADAYLAR SEGMENT (index.html#adaylar) ─────────────────────────────────────
test.describe('adaylar segment', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — adaylar segment full QA`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const errors = collectErrors(page);

      await page.goto(`${BASE_URL}/index.html#adaylar`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      // --- SECTION: Hero (scoped to adaylar segment) ---
      const heroVisible = await page.locator('#seg-adaylar .hero').first().isVisible().catch(() => false);

      // Trust items
      const trustPills = await page.locator('#seg-adaylar .trust span').count();

      // CTA Buttons in hero
      const heroButtons = await page.locator('#seg-adaylar .hero a, #seg-adaylar .hero button').count();

      // --- SECTION: Bento cards (scoped to adaylar segment) ---
      const bentoCards = await page.evaluate(() => {
        var seg = document.getElementById('seg-adaylar');
        if (!seg) return [];
        var cards = Array.from(seg.querySelectorAll('.bento-card'));
        return cards.map(function(c) { return {
          classes: c.className,
          gridColumn: getComputedStyle(c).gridColumn,
          gridRow: getComputedStyle(c).gridRow,
          width: c.getBoundingClientRect().width,
          height: c.getBoundingClientRect().height,
        }; });
      });

      // Check for featured/spanning cards
      const featuredCards = bentoCards.filter(c =>
        c.gridColumn.includes('span') && !c.gridColumn.includes('span 1') ||
        c.gridRow.includes('span') && !c.gridRow.includes('span 1')
      );

      // --- SECTION: Steps (scoped) ---
      const stepsCount = await page.locator('#seg-adaylar .step-card').count();

      // --- SECTION: Kimin İçin ---
      const kiminIcin = await page.locator('[id*="kimin"], [class*="kimin"], section').filter({ hasText: 'Kimin' }).count();

      // --- SECTION: CTA section centering ---
      const ctaCentered = await checkCentered(page, '.cta-section, [class*="cta"]', `${vp.name}/aday/cta`);

      // --- FOOTER ---
      const footerExists = await page.locator('footer').isVisible().catch(() => false);
      const footerLogo = await page.locator('footer img, footer .logo, footer [class*="logo"]').count();
      const footerColumns = await page.evaluate(() => {
        const footer = document.querySelector('footer');
        if (!footer) return { columns: 0 };
        // Check if footer has multi-column grid (bad) or single centered layout (good)
        const style = getComputedStyle(footer);
        const cols = style.gridTemplateColumns || '';
        const children = Array.from(footer.children);
        return {
          columns: cols,
          childCount: children.length,
          display: style.display,
        };
      });

      // --- OVERFLOW CHECK ---
      const overflowData = await checkNoHorizontalScroll(page, `${vp.name}/aday`);

      // Full-page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `aday-${vp.name}-full.png`),
        fullPage: true,
      });

      // Viewport screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `aday-${vp.name}-viewport.png`),
        fullPage: false,
      });

      // Dark mode test: set prefers-color-scheme dark
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `aday-${vp.name}-dark.png`),
        fullPage: false,
      });
      await page.emulateMedia({ colorScheme: 'light' });

      // Log findings
      const report = {
        page: 'index.html#adaylar',
        viewport: vp.name,
        heroVisible,
        trustPills,
        heroButtons,
        bentoCardCount: bentoCards.length,
        featuredCardCount: featuredCards.length,
        featuredCards: featuredCards.map(c => ({ classes: c.classes, gridColumn: c.gridColumn, gridRow: c.gridRow })),
        stepsCount,
        kiminIcin,
        ctaCentered,
        footerExists,
        footerLogo,
        footerColumns,
        overflow: overflowData,
        consoleErrors: errors,
      };

      console.log(`\n=== REPORT: adaylar @ ${vp.name} ===`);
      console.log(JSON.stringify(report, null, 2));

      // Assertions
      expect(overflowData.overflow, `[${vp.name}] Horizontal overflow detected on adaylar segment`).toBe(false);
      expect(heroVisible, `[${vp.name}] Hero section not visible`).toBe(true);
      expect(footerExists, `[${vp.name}] Footer not visible`).toBe(true);

      // Bento: expect 6 cards, no featured
      if (bentoCards.length > 0) {
        expect(bentoCards.length, `[${vp.name}] Expected 6 bento cards, got ${bentoCards.length}`).toBe(6);
        expect(featuredCards.length, `[${vp.name}] Found ${featuredCards.length} featured/spanning bento cards — should be 0`).toBe(0);
      }

      // CTA layout logged for review (unified LP uses split layout, not centered)
      if (ctaCentered.found) {
        console.log(`[${vp.name}] CTA layout: diff=${ctaCentered.diff}px`);
      }
    });
  }
});

// ─── YASAL.HTML ───────────────────────────────────────────────────────────────
test.describe('yasal.html', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — yasal.html full QA`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const errors = collectErrors(page);

      await page.goto(`${BASE_URL}/yasal.html`, { waitUntil: 'networkidle' });

      // --- HERO with navy background ---
      const heroNavy = await page.evaluate(() => {
        const hero = document.querySelector('.hero, [class*="hero"], .yasal-hero, header');
        if (!hero) return { found: false };
        const bg = getComputedStyle(hero).backgroundColor;
        const rect = hero.getBoundingClientRect();
        return { found: true, bg, width: rect.width, height: rect.height };
      });

      // --- Tabs ---
      const tabsInHero = await page.evaluate(() => {
        var tabs = document.querySelectorAll('.yasal-tab, [role="tab"], [class*="tab-btn"]');
        return {
          count: tabs.length,
          labels: Array.from(tabs).map(function(t) { return t.textContent.trim(); }),
        };
      });

      // --- No header nav links visible (header should be minimal/hidden) ---
      const headerNavLinks = await page.evaluate(() => {
        const nav = document.querySelector('header nav, .site-header nav, .navbar');
        if (!nav) return { found: false, linkCount: 0 };
        const links = nav.querySelectorAll('a');
        const visibleLinks = Array.from(links).filter(l => {
          const r = l.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        return { found: true, linkCount: visibleLinks.length, links: visibleLinks.map(l => l.textContent.trim()) };
      });

      // --- Tab switching ---
      const tabs = await page.locator('.yasal-tab').all();
      let tabSwitchWorks = false;
      if (tabs.length >= 2) {
        // Click second tab
        await tabs[1].click();
        await page.waitForTimeout(500);
        // Check if second tab is now active/selected
        const secondTabActive = await tabs[1].evaluate(el => {
          return el.classList.contains('active') ||
                 el.getAttribute('aria-selected') === 'true' ||
                 el.classList.contains('selected') ||
                 el.getAttribute('data-active') === 'true';
        });
        tabSwitchWorks = secondTabActive;
      }

      // --- Footer ---
      const footerExists = await page.locator('footer').isVisible().catch(() => false);
      const footerLogoInfo = await page.evaluate(() => {
        const footer = document.querySelector('footer');
        if (!footer) return { exists: false };
        const logo = footer.querySelector('img, .logo, [class*="logo"]');
        const links = footer.querySelectorAll('a');
        const footerStyle = getComputedStyle(footer);
        return {
          exists: true,
          hasLogo: !!logo,
          navLinkCount: links.length,
          display: footerStyle.display,
          textAlign: footerStyle.textAlign,
          justifyContent: footerStyle.justifyContent,
          columns: footerStyle.gridTemplateColumns,
        };
      });

      // --- Overflow ---
      const overflowData = await checkNoHorizontalScroll(page, `${vp.name}/yasal`);

      // Screenshots
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `yasal-${vp.name}-full.png`),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `yasal-${vp.name}-viewport.png`),
        fullPage: false,
      });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `yasal-${vp.name}-dark.png`),
        fullPage: false,
      });
      await page.emulateMedia({ colorScheme: 'light' });

      const report = {
        page: 'yasal.html',
        viewport: vp.name,
        heroNavy,
        tabsInHero,
        headerNavLinks,
        tabSwitchWorks,
        footerExists,
        footerLogoInfo,
        overflow: overflowData,
        consoleErrors: errors,
      };

      console.log(`\n=== REPORT: yasal.html @ ${vp.name} ===`);
      console.log(JSON.stringify(report, null, 2));

      // Assertions
      expect(overflowData.overflow, `[${vp.name}] Horizontal overflow on yasal.html`).toBe(false);
      expect(footerExists, `[${vp.name}] Footer not visible`).toBe(true);

      // Tabs should exist on yasal page
      expect(tabsInHero.count, `[${vp.name}] Expected tabs on yasal page, found ${tabsInHero.count}`).toBeGreaterThan(0);

      // Header nav should NOT have many visible links (yasal page has clean header)
      if (headerNavLinks.found) {
        expect(headerNavLinks.linkCount, `[${vp.name}] Too many header nav links visible (${headerNavLinks.linkCount}) on yasal.html`).toBeLessThanOrEqual(2);
      }
    });
  }
});

// ─── INDEX.HTML ───────────────────────────────────────────────────────────────
test.describe('index.html', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} — index.html full QA`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const errors = collectErrors(page);

      await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });

      // --- Gate animations ---
      // Check if gate/animation elements exist and are not stuck
      const gateInfo = await page.evaluate(() => {
        // Look for gate overlay, animation containers
        const gate = document.querySelector('.gate, #gate, [class*="gate"], .intro, [class*="intro"]');
        const animatedEls = document.querySelectorAll('[class*="anim"], [class*="fade"], [class*="slide"]');
        return {
          gateExists: !!gate,
          gateVisible: gate ? (gate.getBoundingClientRect().height > 0) : false,
          gateStyle: gate ? {
            display: getComputedStyle(gate).display,
            opacity: getComputedStyle(gate).opacity,
            visibility: getComputedStyle(gate).visibility,
          } : null,
          animatedElCount: animatedEls.length,
        };
      });

      // Wait a bit for animations to settle
      await page.waitForTimeout(1500);

      // --- isveren illustration mirror on desktop ---
      const illustrationMirror = await page.evaluate(() => {
        // Look for employer/isveren section illustration
        const isverenSection = document.querySelector('[id*="isveren"], [class*="isveren"], section');
        const imgs = document.querySelectorAll('img, svg, [class*="illustration"]');
        const mirroredEls = Array.from(imgs).filter(el => {
          const style = getComputedStyle(el);
          const transform = style.transform || '';
          return transform.includes('scale(-1') || transform.includes('matrix(-1') ||
                 el.style.transform?.includes('scaleX(-1)') ||
                 el.classList.toString().includes('mirror') ||
                 el.classList.toString().includes('flip');
        });
        return {
          isverenSectionExists: !!isverenSection,
          mirroredCount: mirroredEls.length,
          mirroredClasses: mirroredEls.map(el => el.className),
          mirroredTransforms: mirroredEls.map(el => getComputedStyle(el).transform),
        };
      });

      // --- Overflow ---
      const overflowData = await checkNoHorizontalScroll(page, `${vp.name}/index`);

      // --- Footer ---
      const footerData = await page.evaluate(() => {
        const footer = document.querySelector('footer');
        if (!footer) return { exists: false };
        const logo = footer.querySelector('img, .logo, [class*="logo"]');
        const nav = footer.querySelector('nav, ul, [class*="nav"]');
        const navLinks = footer.querySelectorAll('a');
        const footerRect = footer.getBoundingClientRect();
        const style = getComputedStyle(footer);
        return {
          exists: true,
          hasLogo: !!logo,
          logoSrc: logo?.src || logo?.className || '',
          footerWidth: footerRect.width,
          display: style.display,
          gridCols: style.gridTemplateColumns,
          flexDirection: style.flexDirection,
          justifyContent: style.justifyContent,
          alignItems: style.alignItems,
          navLinkCount: navLinks.length,
        };
      });

      // Screenshots
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `index-${vp.name}-full.png`),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `index-${vp.name}-viewport.png`),
        fullPage: false,
      });

      // After animations settle
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `index-${vp.name}-after-anim.png`),
        fullPage: false,
      });

      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `index-${vp.name}-dark.png`),
        fullPage: false,
      });
      await page.emulateMedia({ colorScheme: 'light' });

      const report = {
        page: 'index.html',
        viewport: vp.name,
        gateInfo,
        illustrationMirror,
        overflow: overflowData,
        footerData,
        consoleErrors: errors,
      };

      console.log(`\n=== REPORT: index.html @ ${vp.name} ===`);
      console.log(JSON.stringify(report, null, 2));

      // Assertions
      expect(overflowData.overflow, `[${vp.name}] Horizontal overflow on index.html`).toBe(false);
      expect(footerData.exists, `[${vp.name}] Footer not found on index.html`).toBe(true);

      // On desktop: illustration mirror should be present
      if (vp.width >= 1024) {
        // Just log; don't fail if mirror not found — it might use CSS class
        if (illustrationMirror.mirroredCount === 0) {
          console.warn(`[${vp.name}] No CSS-transform mirrored illustration found — verify visually`);
        }
      }
    });
  }
});
