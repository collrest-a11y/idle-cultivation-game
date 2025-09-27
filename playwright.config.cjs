/**
 * Playwright E2E Testing Configuration for Idle Cultivation Game
 * Tests end-to-end user workflows across all integrated systems
 *
 * Part of the Automated Validation & Fix Loop System (Epic #122-129)
 * Configured for comprehensive browser testing to catch real bugs
 * Enhanced with comprehensive error handling test suite (Issue #149)
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'testing/e2e/reports/html' }],
    ['json', { outputFile: 'testing/e2e/reports/results.json' }],
    ['junit', { outputFile: 'testing/e2e/reports/junit.xml' }],
    ['line']
  ],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: !!process.env.CI,
    // Enhanced settings for error handling tests
    actionTimeout: 10000,
    navigationTimeout: 15000,
    // Allow error injection in tests
    extraHTTPHeaders: {
      'X-Test-Mode': 'error-handling'
    }
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
    // Error handling test projects with specialized configurations
    {
      name: 'error-handling-chrome',
      testDir: './tests/e2e/error-handling',
      use: {
        ...devices['Desktop Chrome'],
        // Higher timeouts for error injection scenarios
        actionTimeout: 15000,
        navigationTimeout: 20000
      },
    },
    {
      name: 'error-handling-firefox',
      testDir: './tests/e2e/error-handling',
      use: {
        ...devices['Desktop Firefox'],
        actionTimeout: 15000,
        navigationTimeout: 20000
      },
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

  globalSetup: './testing/e2e/global-setup.cjs',
  globalTeardown: './testing/e2e/global-teardown.cjs',

  // Error handling test suite specific configuration
  metadata: {
    'test-suite-version': '1.0.0',
    'error-handling-suite': true,
    'issue': '149',
    'epic': 'real-error-handler'
  }
});