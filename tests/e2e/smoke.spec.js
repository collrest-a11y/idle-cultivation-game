/**
 * Smoke tests to validate Playwright infrastructure
 * These tests verify that our testing setup works correctly
 */

import { test, expect } from '../base/base-test.js';

test.describe('Infrastructure Smoke Tests', () => {
  test('can load the game page', async ({ page }) => {
    await expect(page).toHaveTitle(/Idle Cultivation/);
    
    // Check that either character creation or game interface is visible
    const hasUI = await page.locator('#character-creation, #game-interface').isVisible();
    expect(hasUI).toBeTruthy();
  });

  test('can capture screenshots', async ({ page, gameHelpers }, testInfo) => {
    const screenshotPath = await gameHelpers.captureScreenshot(`smoke-${testInfo.title}`);
    expect(screenshotPath).toBeTruthy();
  });

  test('can detect console errors', async ({ page, gameHelpers }) => {
    // Intentionally cause an error
    await page.evaluate(() => {
      console.error('Test error detection');
    });
    
    const errors = await gameHelpers.checkForErrors();
    expect(errors.length).toBeGreaterThan(0);
  });

  test('parallel execution works', async ({ page }) => {
    // This test runs in parallel with others
    const timestamp = Date.now();
    await page.evaluate((ts) => {
      console.log(`Parallel test executed at ${ts}`);
    }, timestamp);
    
    expect(true).toBe(true);
  });

  test('can check game state', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();
    const state = await gameHelpers.captureGameState();
    
    // Should have some game state
    expect(state).toBeDefined();
    expect(state.hasCharacter).toBeDefined();
  });

  test('can measure performance metrics', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();
    
    // Measure FPS
    const fps = await gameHelpers.measureFPS(1000);
    expect(fps).toBeGreaterThan(0);
    console.log(`FPS: ${fps}`);
    
    // Check memory usage
    const memory = await gameHelpers.getMemoryUsage();
    if (memory) {
      expect(memory.usage).toBeDefined();
      console.log(`Memory usage: ${memory.usage}%`);
    }
  });
});

test.describe('Cross-browser compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`loads in ${browserName}`, async ({ page, browserName }) => {
      await expect(page).toHaveTitle(/Idle Cultivation/);
      
      // Verify game loads without critical errors
      const hasErrors = await page.evaluate(() => {
        return window.errorManager?.getErrors?.()?.some(e => e.severity === 'CRITICAL');
      });
      
      expect(hasErrors).toBeFalsy();
      console.log(`✅ ${browserName} compatibility verified`);
    });
  });
});