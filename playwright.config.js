/**
 * Playwright E2E Testing Configuration for Idle Cultivation Game
 * Tests end-to-end user workflows across all integrated systems
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './testing/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'testing/e2e/reports/html' }],
    ['json', { outputFile: 'testing/e2e/reports/results.json' }],
    ['junit', { outputFile: 'testing/e2e/reports/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: !!process.env.CI
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npx http-server . -p 8080 -s',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },

  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  globalSetup: './testing/e2e/global-setup.js',
  globalTeardown: './testing/e2e/global-teardown.js',
});