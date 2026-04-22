const { defineConfig } = require('@playwright/test');

// Cloudflare Access Service Token — required for prod (hellotalent.ai) headless tests
// Set CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET in .env.local (gitignored)
// Rotation: every 60 days (see .claude/agent-memory/pending-approvals.md A2)
try { require('dotenv').config({ path: '.env.local' }); } catch (_) {}

const cfAccessHeaders = process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : {};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  webServer: {
    command: 'python3 -m http.server 3000 --directory .',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: process.env.PW_TARGET_URL || 'http://localhost:3000',
    extraHTTPHeaders: cfAccessHeaders,
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 },
  },
  projects: [
    // Existing smoke / unit-like tests (no auth needed)
    { name: 'mobile', testIgnore: /\.(e2e\.spec|setup)\.js$/, use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', testIgnore: /\.(e2e\.spec|setup)\.js$/, use: { viewport: { width: 1440, height: 900 } } },

    // Auth setups — each runs once, saves storageState for its matching e2e project
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    { name: 'setup-employer', testMatch: /auth\.setup\.employer\.js/ },
    { name: 'setup-admin', testMatch: /auth\.setup\.admin\.js/ },

    // Candidate-session e2e — .e2e.spec.js but NOT .ik.e2e / .admin.e2e
    {
      name: 'e2e-mobile',
      testMatch: /\.e2e\.spec\.js$/,
      testIgnore: /\.(ik|admin)\.e2e\.spec\.js$/,
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/candidate.json',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'e2e-desktop',
      testMatch: /\.e2e\.spec\.js$/,
      testIgnore: /\.(ik|admin)\.e2e\.spec\.js$/,
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/candidate.json',
        viewport: { width: 1440, height: 900 },
      },
    },

    // Employer-session e2e — .ik.e2e.spec.js
    {
      name: 'e2e-ik-mobile',
      testMatch: /\.ik\.e2e\.spec\.js$/,
      dependencies: ['setup-employer'],
      use: {
        storageState: 'playwright/.auth/employer.json',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'e2e-ik-desktop',
      testMatch: /\.ik\.e2e\.spec\.js$/,
      dependencies: ['setup-employer'],
      use: {
        storageState: 'playwright/.auth/employer.json',
        viewport: { width: 1440, height: 900 },
      },
    },

    // Admin-session e2e — .admin.e2e.spec.js
    {
      name: 'e2e-admin-mobile',
      testMatch: /\.admin\.e2e\.spec\.js$/,
      dependencies: ['setup-admin'],
      use: {
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'e2e-admin-desktop',
      testMatch: /\.admin\.e2e\.spec\.js$/,
      dependencies: ['setup-admin'],
      use: {
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
