---
name: Playwright Test Infrastructure Setup
status: completed
created: 2025-09-25T19:35:00Z
updated: 2025-09-25T20:15:00Z
priority: P0
effort: 2d
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/122
---

# Task 001: Playwright Test Infrastructure Setup

## Objective
Set up a robust Playwright-based testing infrastructure that can perform real browser automation across multiple browsers, capturing evidence of failures and supporting both headless and headed modes.

## Background
Current validation misses critical user-facing bugs. We need real browser testing that simulates actual user interactions, not just console error checking.

## Acceptance Criteria

### Required
- [ ] Playwright installed and configured for the project
- [ ] Support for Chrome, Firefox, Safari, and Edge browsers
- [ ] Headless and headed mode configuration
- [ ] Screenshot capture on test failure
- [ ] Video recording capability for debugging
- [ ] Test runner framework with retry logic
- [ ] Parallel test execution support
- [ ] Test result reporting in multiple formats (HTML, JSON)
- [ ] Network request interception and mocking capability
- [ ] Custom test helpers for game-specific actions

### Nice to Have
- [ ] Docker container for consistent test environment
- [ ] Visual regression testing setup
- [ ] Performance metrics collection
- [ ] Test execution dashboard

## Technical Implementation

### 1. Installation & Setup
```bash
npm install --save-dev @playwright/test
npm install --save-dev @playwright/test-reporter
npx playwright install  # Install browsers
```

### 2. Configuration File
```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: process.env.CI ? 2 : 4,
  
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
      name: 'edge',
      use: { channel: 'msedge' },
    },
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
  ],
  
  webServer: {
    command: 'python -m http.server 8080',
    port: 8080,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
};
```

### 3. Test Helpers
```javascript
// tests/helpers/game-helpers.js
export class GameHelpers {
  constructor(page) {
    this.page = page;
  }

  async waitForGameLoad() {
    await this.page.waitForSelector('#game-interface', { timeout: 10000 });
    await this.page.waitForFunction(
      () => window.gameState && window.gameState.initialized,
      { timeout: 10000 }
    );
  }

  async createCharacter(origin, vow, mark) {
    await this.page.click(`[data-choice="${origin}"]`);
    await this.page.click(`[data-choice="${vow}"]`);
    await this.page.click(`[data-choice="${mark}"]`);
    await this.page.click('#begin-cultivation');
  }

  async captureGameState() {
    return await this.page.evaluate(() => {
      return {
        player: window.gameState?.get('player'),
        resources: window.gameState?.get('resources'),
        errors: window.errorManager?.getErrors(),
      };
    });
  }
}
```

### 4. Base Test Class
```javascript
// tests/base/base-test.js
import { test as base } from '@playwright/test';
import { GameHelpers } from '../helpers/game-helpers';

export const test = base.extend({
  gameHelpers: async ({ page }, use) => {
    const helpers = new GameHelpers(page);
    await use(helpers);
  },

  // Auto-navigate to game
  page: async ({ page, baseURL }, use) => {
    await page.goto(baseURL);
    await use(page);
  },
});
```

## Dependencies
- Node.js 18+
- npm/yarn
- Supported browsers installed
- Python (for local server)

## Testing the Infrastructure

### Smoke Test
```javascript
// tests/smoke/infrastructure.spec.js
import { test, expect } from '../base/base-test';

test.describe('Infrastructure Validation', () => {
  test('can load game page', async ({ page }) => {
    await expect(page).toHaveTitle(/Idle Cultivation/);
  });

  test('can capture screenshots', async ({ page }, testInfo) => {
    await page.screenshot({ 
      path: `test-results/screenshots/${testInfo.title}.png` 
    });
  });

  test('can record video', async ({ page }, testInfo) => {
    // Video automatically recorded based on config
    await page.waitForTimeout(1000);
  });

  test('parallel execution works', async ({ page }) => {
    // This will run in parallel with other tests
    await page.evaluate(() => console.log('Parallel test'));
  });
});
```

## Deliverables
1. `playwright.config.js` - Main configuration
2. `tests/helpers/` - Reusable test helpers
3. `tests/base/` - Base test classes
4. `tests/smoke/` - Infrastructure validation tests
5. `package.json` - Updated with test scripts
6. `README.md` - Testing documentation

## Success Metrics
- All 4 browsers can run tests successfully
- Tests can run in parallel (4+ workers)
- Screenshots captured on failure
- Video recording works
- HTML and JSON reports generated
- Test execution time < 30s for smoke tests

## Notes
- Consider using GitHub Actions for CI integration
- May need to adjust timeouts for slower machines
- Safari on Windows requires WSL or remote execution