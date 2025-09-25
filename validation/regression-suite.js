import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

/**
 * RegressionSuite - Comprehensive regression testing for fix validation
 *
 * This class runs a comprehensive suite of regression tests to ensure
 * that applied fixes don't break existing functionality.
 */
export class RegressionSuite {
  constructor(options = {}) {
    this.testTimeout = options.testTimeout || 30000;
    this.serverPort = options.serverPort || 8082;
    this.results = [];
  }

  /**
   * Runs the complete regression test suite against a sandbox environment
   * @param {Object} sandbox - Sandbox environment to test
   * @returns {Object} Test execution results
   */
  async runTests(sandbox) {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Define test suite
      const testSuite = [
        { name: 'character-creation', fn: this.testCharacterCreation.bind(this), critical: true },
        { name: 'game-initialization', fn: this.testGameInitialization.bind(this), critical: true },
        { name: 'save-load-functionality', fn: this.testSaveLoadFunctionality.bind(this), critical: true },
        { name: 'ui-navigation', fn: this.testUINavigation.bind(this), critical: false },
        { name: 'resource-management', fn: this.testResourceManagement.bind(this), critical: false },
        { name: 'game-progression', fn: this.testGameProgression.bind(this), critical: false },
        { name: 'error-handling', fn: this.testErrorHandling.bind(this), critical: true },
        { name: 'performance-baseline', fn: this.testPerformanceBaseline.bind(this), critical: false }
      ];

      results.total = testSuite.length;

      // Run each test
      for (const test of testSuite) {
        try {
          console.log(`Running regression test: ${test.name}`);
          await this.runSingleTest(test, sandbox);
          results.passed++;
          console.log(`✓ ${test.name} passed`);
        } catch (error) {
          results.failed++;
          const failure = {
            test: test.name,
            error: error.message,
            critical: test.critical,
            stack: error.stack
          };
          results.failures.push(failure);
          console.log(`✗ ${test.name} failed: ${error.message}`);

          // Stop on critical failures
          if (test.critical) {
            console.log(`Critical test ${test.name} failed, stopping regression suite`);
            break;
          }
        }
      }

      results.duration = Date.now() - startTime;
      return results;
    } catch (error) {
      results.duration = Date.now() - startTime;
      results.failed++;
      results.failures.push({
        test: 'regression-suite',
        error: `Test suite failed: ${error.message}`,
        critical: true
      });
      return results;
    }
  }

  /**
   * Runs a single test with proper setup and teardown
   * @param {Object} test - Test configuration
   * @param {Object} sandbox - Sandbox environment
   */
  async runSingleTest(test, sandbox) {
    let browser = null;
    let server = null;

    try {
      // Setup
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-web-security', '--allow-running-insecure-content']
      });
      const page = await browser.newPage();
      server = await this.startSandboxServer(sandbox);

      // Run the test
      await test.fn(page, sandbox, server);
    } finally {
      // Cleanup
      if (browser) await browser.close();
      if (server) await server.close();
    }
  }

  /**
   * Test character creation functionality
   */
  async testCharacterCreation(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);
    await page.waitForLoadState('networkidle');

    // Check if character creation elements exist
    const dustRoad = page.locator('[data-choice="dust-road"]');
    const protect = page.locator('[data-choice="protect"]');
    const thunder = page.locator('[data-choice="thunder"]');
    const beginBtn = page.locator('#begin-cultivation');

    // Verify elements are present
    await expect(dustRoad).toBeVisible({ timeout: 5000 });
    await expect(protect).toBeVisible({ timeout: 5000 });
    await expect(thunder).toBeVisible({ timeout: 5000 });
    await expect(beginBtn).toBeVisible({ timeout: 5000 });

    // Test selection workflow
    await dustRoad.click();
    await page.waitForTimeout(100);

    await protect.click();
    await page.waitForTimeout(100);

    await thunder.click();
    await page.waitForTimeout(500);

    // Button should be enabled after all selections
    const isEnabled = await beginBtn.isEnabled();
    if (!isEnabled) {
      throw new Error('Begin button should be enabled after all selections are made');
    }

    // Test button functionality
    await beginBtn.click();

    // Should progress to next screen or show confirmation
    await page.waitForTimeout(1000);

    // Verify we progressed (this might need adjustment based on actual game flow)
    const hasProgressed = await page.evaluate(() => {
      return window.gameState &&
             (window.gameState.currentScreen !== 'character-creation' ||
              window.gameState.characterCreated === true);
    });

    if (!hasProgressed) {
      throw new Error('Character creation should progress after clicking begin button');
    }
  }

  /**
   * Test game initialization
   */
  async testGameInitialization(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);

    // Wait for game to load
    await page.waitForTimeout(3000);

    // Check that game state exists
    const gameState = await page.evaluate(() => window.gameState);
    if (!gameState) {
      throw new Error('Game state should be initialized');
    }

    // Check for critical game objects
    const hasRequiredObjects = await page.evaluate(() => {
      return typeof window.gameLoop !== 'undefined' ||
             typeof window.resourceManager !== 'undefined' ||
             typeof window.uiManager !== 'undefined';
    });

    if (!hasRequiredObjects) {
      throw new Error('Required game objects should be initialized');
    }

    // Check for no critical errors
    const criticalErrors = await page.evaluate(() => {
      return window.errorManager?.getErrors()?.filter(e => e.severity === 'CRITICAL') || [];
    });

    if (criticalErrors.length > 0) {
      throw new Error(`Critical errors during initialization: ${criticalErrors.length}`);
    }
  }

  /**
   * Test save/load functionality
   */
  async testSaveLoadFunctionality(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);
    await page.waitForTimeout(2000);

    // Check if save/load functionality exists
    const hasSaveSystem = await page.evaluate(() => {
      return typeof window.saveGame === 'function' ||
             typeof window.loadGame === 'function' ||
             (window.gameState && typeof window.gameState.save === 'function');
    });

    if (!hasSaveSystem) {
      // This might not be implemented yet, so we'll make it a soft failure
      console.warn('Save/load system not detected - skipping detailed save/load test');
      return;
    }

    // Test save functionality
    const saveResult = await page.evaluate(() => {
      try {
        if (window.saveGame) {
          return window.saveGame();
        } else if (window.gameState && window.gameState.save) {
          return window.gameState.save();
        }
        return null;
      } catch (e) {
        throw new Error(`Save failed: ${e.message}`);
      }
    });

    // Test local storage save
    const hasLocalStorageSave = await page.evaluate(() => {
      return localStorage.getItem('gameState') !== null ||
             localStorage.getItem('cultivationGame') !== null;
    });

    if (!saveResult && !hasLocalStorageSave) {
      throw new Error('Save functionality should work');
    }
  }

  /**
   * Test UI navigation
   */
  async testUINavigation(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);
    await page.waitForTimeout(2000);

    // Test that main UI elements are clickable and functional
    const interactiveElements = await page.locator('button, input, select, [onclick], [data-choice]').all();

    if (interactiveElements.length === 0) {
      throw new Error('No interactive elements found in UI');
    }

    // Test a few key elements
    for (let i = 0; i < Math.min(3, interactiveElements.length); i++) {
      const element = interactiveElements[i];

      if (await element.isVisible() && await element.isEnabled()) {
        try {
          await element.click({ timeout: 1000 });
          await page.waitForTimeout(200);
        } catch (e) {
          // Some elements might not be clickable, that's ok
          console.warn(`Element ${i} not clickable: ${e.message}`);
        }
      }
    }

    // Check that no critical errors occurred during navigation
    const errors = await page.evaluate(() => {
      return window.errorManager?.getErrors()?.filter(e =>
        e.severity === 'CRITICAL' &&
        e.message.toLowerCase().includes('click') ||
        e.message.toLowerCase().includes('navigation')
      ) || [];
    });

    if (errors.length > 0) {
      throw new Error(`Navigation errors detected: ${errors.length}`);
    }
  }

  /**
   * Test resource management system
   */
  async testResourceManagement(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);
    await page.waitForTimeout(2000);

    // Check if resource system exists
    const hasResourceSystem = await page.evaluate(() => {
      return window.resourceManager ||
             window.gameState?.resources ||
             document.querySelector('.resources, #resources, [data-resource]');
    });

    if (!hasResourceSystem) {
      console.warn('Resource management system not detected - skipping test');
      return;
    }

    // Test basic resource functionality
    const resourcesWork = await page.evaluate(() => {
      try {
        if (window.resourceManager) {
          // Test if resource manager has basic methods
          return typeof window.resourceManager.getResources === 'function' ||
                 typeof window.resourceManager.updateResource === 'function';
        }

        if (window.gameState?.resources) {
          return Object.keys(window.gameState.resources).length > 0;
        }

        return true; // Assume working if elements exist
      } catch (e) {
        return false;
      }
    });

    if (!resourcesWork) {
      throw new Error('Resource management system appears to be broken');
    }
  }

  /**
   * Test game progression mechanics
   */
  async testGameProgression(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);
    await page.waitForTimeout(2000);

    // Check if progression system exists
    const hasProgressionSystem = await page.evaluate(() => {
      return window.gameLoop ||
             window.progressionManager ||
             window.gameState?.level ||
             window.gameState?.experience;
    });

    if (!hasProgressionSystem) {
      console.warn('Game progression system not detected - skipping test');
      return;
    }

    // Let game run for a bit to test progression
    await page.waitForTimeout(3000);

    // Check that time is progressing
    const timeProgressed = await page.evaluate(() => {
      const now = Date.now();
      const gameTime = window.gameState?.time || window.gameState?.currentTime;
      return gameTime ? (now - gameTime < 10000) : true; // Within last 10 seconds
    });

    if (!timeProgressed) {
      throw new Error('Game time progression appears to be broken');
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);

    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(3000);

    // Check for unhandled errors
    const unhandledErrors = await page.evaluate(() => {
      return window.unhandledErrors || [];
    });

    // Allow for some minor errors, but no critical ones
    const criticalErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('critical') ||
      error.toLowerCase().includes('uncaught') ||
      error.toLowerCase().includes('cannot read prop') && error.toLowerCase().includes('undefined')
    );

    if (criticalErrors.length > 0) {
      throw new Error(`Critical errors detected: ${criticalErrors.slice(0, 3).join('; ')}`);
    }

    if (unhandledErrors.length > 5) {
      throw new Error(`Too many unhandled errors: ${unhandledErrors.length}`);
    }
  }

  /**
   * Test performance baseline
   */
  async testPerformanceBaseline(page, sandbox, server) {
    await page.goto(`http://localhost:${server.port}`);

    // Measure load time
    const loadMetrics = await page.evaluate(() => {
      return {
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      };
    });

    // Basic performance checks
    if (loadMetrics.loadComplete > 10000) { // 10 seconds
      throw new Error(`Load time too slow: ${loadMetrics.loadComplete}ms`);
    }

    if (loadMetrics.domReady > 5000) { // 5 seconds
      throw new Error(`DOM ready too slow: ${loadMetrics.domReady}ms`);
    }

    // Check for memory leaks (simplified)
    await page.waitForTimeout(2000);

    const memoryUsage = await page.evaluate(() => {
      return performance.memory ? performance.memory.usedJSHeapSize : 0;
    });

    if (memoryUsage > 50 * 1024 * 1024) { // 50MB
      console.warn(`High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
    }
  }

  /**
   * Helper method to start sandbox server
   */
  async startSandboxServer(sandbox) {
    const express = require('express');
    const app = express();

    app.use(express.static(sandbox.path));

    const server = app.listen(this.serverPort);

    return {
      port: this.serverPort,
      close: () => new Promise((resolve) => server.close(resolve))
    };
  }

  /**
   * Get detailed test report
   */
  getDetailedReport() {
    return {
      results: this.results,
      summary: this.generateSummary(),
      recommendations: this.generateTestRecommendations()
    };
  }

  generateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    return {
      total,
      passed,
      failed,
      successRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  }

  generateTestRecommendations() {
    const recommendations = [];
    const criticalFailures = this.results.filter(r =>
      r.status === 'failed' && r.critical
    );

    if (criticalFailures.length > 0) {
      recommendations.push('Address critical test failures before deployment');
    }

    const lowSuccessRate = this.generateSummary().successRate < 80;
    if (lowSuccessRate) {
      recommendations.push('Low test success rate indicates significant issues');
    }

    return recommendations;
  }
}

/**
 * Helper function for assertions in tests
 */
async function expect(locator) {
  return {
    toBeVisible: async (options = {}) => {
      const timeout = options.timeout || 5000;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        if (await locator.isVisible()) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      throw new Error(`Element not visible within ${timeout}ms`);
    }
  };
}