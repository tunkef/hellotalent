/**
 * Pass 10 #11b — Live browser smoke
 * Target: https://hellotalent.ai/index.html#kurumsal
 * Checks: 3 story cards (Defne/Burak/Orkun), photo crop, light+dark
 * Viewports: mobile 390×844, desktop 1440×900
 */
const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../.claude/agent-memory/visual-diff/pass10-11b-live'
);
const TARGET_URL = 'https://hellotalent.ai/index.html#kurumsal';

// Names expected in story cards
const STORY_NAMES = ['Defne', 'Burak', 'Orkun'];

async function runSmoke(page, viewport, theme, screenshotName) {
  await page.setViewportSize(viewport);

  // Navigate — CF Access headers injected globally via playwright.config
  const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const status = response ? response.status() : 'no-response';

  // Confirm no CF Access challenge (200 expected)
  if (status !== 200) {
    throw new Error(`AUTH_BLOCKED: HTTP ${status} on ${TARGET_URL}`);
  }

  // Apply theme
  if (theme === 'dark') {
    // Toggle dark: site uses data-theme="dark" on <html>
    await page.evaluate(() => {
      const html = document.documentElement;
      html.setAttribute('data-theme', 'dark');
      // also try class-based if attribute alone isn't enough
      html.classList.add('dark');
      // trigger storage event some sites listen to
      try { localStorage.setItem('theme', 'dark'); } catch(_) {}
    });
    // Brief settle
    await page.waitForTimeout(400);
  } else {
    await page.evaluate(() => {
      const html = document.documentElement;
      html.setAttribute('data-theme', 'light');
      html.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch(_) {}
    });
    await page.waitForTimeout(400);
  }

  // Scroll to story section — look for common anchors
  await page.evaluate(() => {
    const el =
      document.querySelector('#kurumsal') ||
      document.querySelector('[data-section="kurumsal"]') ||
      document.querySelector('.story-section') ||
      document.querySelector('.stories') ||
      document.querySelector('.team-section');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(600);

  // Wait for at least one story card image to load
  await page.waitForFunction(
    (names) => {
      const texts = document.body.innerText;
      return names.every(n => texts.includes(n));
    },
    STORY_NAMES,
    { timeout: 10000 }
  ).catch(() => null); // don't throw yet — let assertion handle it

  // Screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `${screenshotName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Verify each name present
  const bodyText = await page.evaluate(() => document.body.innerText);
  const cardResults = {};
  for (const name of STORY_NAMES) {
    cardResults[name] = bodyText.includes(name);
  }

  return { status, screenshotPath, cardResults };
}

test.describe('Pass10 #11b — Live kurumsal story smoke', () => {
  test.setTimeout(60000);

  test('mobile light — 3 story cards + crop check', async ({ page }) => {
    const result = await runSmoke(
      page,
      { width: 390, height: 844 },
      'light',
      'mobile-light'
    );
    console.log('mobile-light status:', result.status);
    console.log('mobile-light cards:', JSON.stringify(result.cardResults));
    console.log('mobile-light screenshot:', result.screenshotPath);

    expect(result.status, 'CF Auth should pass — expected HTTP 200').toBe(200);
    for (const name of STORY_NAMES) {
      expect(result.cardResults[name], `${name} kart görünmüyor (mobile-light)`).toBe(true);
    }
  });

  test('mobile dark — 3 story cards', async ({ page }) => {
    const result = await runSmoke(
      page,
      { width: 390, height: 844 },
      'dark',
      'mobile-dark'
    );
    console.log('mobile-dark status:', result.status);
    console.log('mobile-dark cards:', JSON.stringify(result.cardResults));
    console.log('mobile-dark screenshot:', result.screenshotPath);

    expect(result.status, 'CF Auth should pass — expected HTTP 200').toBe(200);
    for (const name of STORY_NAMES) {
      expect(result.cardResults[name], `${name} kart görünmüyor (mobile-dark)`).toBe(true);
    }
  });

  test('desktop light — 3 story cards + crop check', async ({ page }) => {
    const result = await runSmoke(
      page,
      { width: 1440, height: 900 },
      'light',
      'desktop-light'
    );
    console.log('desktop-light status:', result.status);
    console.log('desktop-light cards:', JSON.stringify(result.cardResults));
    console.log('desktop-light screenshot:', result.screenshotPath);

    expect(result.status, 'CF Auth should pass — expected HTTP 200').toBe(200);
    for (const name of STORY_NAMES) {
      expect(result.cardResults[name], `${name} kart görünmüyor (desktop-light)`).toBe(true);
    }
  });

  test('desktop dark — 3 story cards', async ({ page }) => {
    const result = await runSmoke(
      page,
      { width: 1440, height: 900 },
      'dark',
      'desktop-dark'
    );
    console.log('desktop-dark status:', result.status);
    console.log('desktop-dark cards:', JSON.stringify(result.cardResults));
    console.log('desktop-dark screenshot:', result.screenshotPath);

    expect(result.status, 'CF Auth should pass — expected HTTP 200').toBe(200);
    for (const name of STORY_NAMES) {
      expect(result.cardResults[name], `${name} kart görünmüyor (desktop-dark)`).toBe(true);
    }
  });
});
