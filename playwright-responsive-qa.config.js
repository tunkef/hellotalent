const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  testMatch: 'responsive-qa.spec.js',
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'qa-screenshots/responsive-qa-results.json' }]],
  use: {
    baseURL: 'http://localhost:8888',
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    headless: true,
  },
});
