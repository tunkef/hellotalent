const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  testMatch: 'qa-visual-audit.spec.js',
  workers: 1,
  use: {
    screenshot: 'only-on-failure',
  },
});
