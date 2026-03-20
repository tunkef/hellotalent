const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'https://hellotalent.ai',
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 },
  },
  projects: [
    // Existing smoke / unit-like tests (no auth needed)
    { name: 'mobile', testIgnore: /\.(e2e\.spec|setup)\.js$/, use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', testIgnore: /\.(e2e\.spec|setup)\.js$/, use: { viewport: { width: 1440, height: 900 } } },

    // Auth setup — runs once, saves storageState for E2E projects
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },

    // Authenticated E2E — depends on setup, runs candidate-session tests
    {
      name: 'e2e-mobile',
      testMatch: /\.e2e\.spec\.js$/,
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/candidate.json',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'e2e-desktop',
      testMatch: /\.e2e\.spec\.js$/,
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/candidate.json',
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
