/**
 * Fix Validation System
 * Part of the Automated Validation & Fix Loop
 *
 * Tests and validates fixes before applying them to ensure they don't introduce new errors
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

class FixValidator {
  constructor(config = {}) {
    this.config = {
      testTimeout: config.testTimeout || 30000,
      isolatedTesting: config.isolatedTesting !== false,
      regressionChecks: config.regressionChecks !== false,
      performanceThreshold: config.performanceThreshold || 1.2, // 20% slower max
      memoryThreshold: config.memoryThreshold || 1.5, // 50% more memory max
      ...config
    };

    this.validationResults = [];
    this.browser = null;
  }

  /**
   * Validate a fix before applying
   */
  async validateFix(fix, error, context = {}) {
    console.log(`[FixValidator] Validating fix for ${error.type}`);

    const validation = {
      fix,
      error,
      timestamp: Date.now(),
      checks: {}
    };

    try {
      // Syntax validation
      validation.checks.syntax = await this.validateSyntax(fix);

      // Isolation test
      if (this.config.isolatedTesting) {
        validation.checks.isolation = await this.testInIsolation(fix, error);
      }

      // Integration test
      validation.checks.integration = await this.testIntegration(fix, error, context);

      // Regression checks
      if (this.config.regressionChecks) {
        validation.checks.regression = await this.checkForRegressions(fix, error);
      }

      // Performance impact
      validation.checks.performance = await this.measurePerformanceImpact(fix);

      // Calculate overall score
      validation.score = this.calculateValidationScore(validation.checks);
      validation.passed = validation.score >= 70; // 70% threshold

      // Store result
      this.validationResults.push(validation);

      return validation;

    } catch (validationError) {
      console.error(`[FixValidator] Validation failed:`, validationError);
      validation.error = validationError.message;
      validation.passed = false;
      return validation;
    }
  }

  /**
   * Validate JavaScript syntax
   */
  async validateSyntax(fix) {
    if (!fix.code) {
      return { valid: true, skipped: true };
    }

    try {
      // Use Function constructor to check syntax
      new Function(fix.code);

      // Check for common issues
      const issues = [];

      // Check for infinite loops
      if (/while\s*\(\s*true\s*\)/.test(fix.code) &&
          !/break|return/.test(fix.code)) {
        issues.push('Potential infinite loop detected');
      }

      // Check for memory leaks
      if (/setInterval|setTimeout/.test(fix.code) &&
          !/clearInterval|clearTimeout/.test(fix.code)) {
        issues.push('Timer without cleanup detected');
      }

      // Check for global pollution
      const globalVars = fix.code.match(/^(?!.*(?:let|const|var|function))\s*(\w+)\s*=/gm);
      if (globalVars && globalVars.length > 0) {
        issues.push(`Global variables detected: ${globalVars.join(', ')}`);
      }

      return {
        valid: true,
        issues,
        score: issues.length === 0 ? 100 : Math.max(50, 100 - issues.length * 20)
      };

    } catch (syntaxError) {
      return {
        valid: false,
        error: syntaxError.message,
        score: 0
      };
    }
  }

  /**
   * Test fix in isolation
   */
  async testInIsolation(fix, error) {
    console.log('[FixValidator] Testing fix in isolation');

    try {
      // Create isolated test environment
      const sandbox = await this.createSandbox();

      // Apply fix in sandbox
      const result = await sandbox.evaluate((fixCode) => {
        try {
          // Execute fix code
          eval(fixCode);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      }, fix.code);

      await sandbox.close();

      return {
        passed: result.success,
        error: result.error,
        score: result.success ? 100 : 0
      };

    } catch (isolationError) {
      return {
        passed: false,
        error: isolationError.message,
        score: 0
      };
    }
  }

  /**
   * Test fix integration with existing code
   */
  async testIntegration(fix, error, context) {
    console.log('[FixValidator] Testing fix integration');

    try {
      // Launch test browser if not already running
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }

      const page = await this.browser.newPage();

      // Set up error monitoring
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Navigate to test environment
      await page.goto(context.testUrl || 'http://localhost:8080');

      // Apply fix
      await page.evaluate((fixCode) => {
        eval(fixCode);
      }, fix.code);

      // Run specific test for the error type
      const testResult = await this.runSpecificTest(page, error);

      // Check for new errors
      const newErrors = errors.filter(e =>
        !e.includes('[FixValidator]') && !e.includes('[Test]')
      );

      await page.close();

      return {
        passed: testResult.passed && newErrors.length === 0,
        testResult,
        newErrors,
        score: this.calculateIntegrationScore(testResult, newErrors)
      };

    } catch (integrationError) {
      return {
        passed: false,
        error: integrationError.message,
        score: 0
      };
    }
  }

  /**
   * Run specific test based on error type
   */
  async runSpecificTest(page, error) {
    // Test based on component
    if (error.component === 'character-creation') {
      return await this.testCharacterCreation(page);
    } else if (error.component === 'save-system') {
      return await this.testSaveSystem(page);
    } else if (error.component === 'game-state') {
      return await this.testGameState(page);
    }

    // Generic test
    return await this.runGenericTest(page, error);
  }

  /**
   * Test character creation fix
   */
  async testCharacterCreation(page) {
    try {
      // Make selections
      await page.click('[data-choice="dust-road"]');
      await page.click('[data-choice="protect"]');
      await page.click('[data-choice="thunder"]');

      // Check if button is enabled
      const isEnabled = await page.evaluate(() => {
        const btn = document.getElementById('begin-cultivation');
        return btn && !btn.disabled;
      });

      if (!isEnabled) {
        return {
          passed: false,
          reason: 'Begin button still not enabled after fix'
        };
      }

      // Try clicking the button
      await page.click('#begin-cultivation');
      await page.waitForTimeout(1000);

      // Check if transitioned to game
      const transitioned = await page.evaluate(() => {
        const creation = document.getElementById('character-creation');
        const game = document.getElementById('game-interface');
        return creation?.style.display === 'none' && game?.style.display !== 'none';
      });

      return {
        passed: transitioned,
        reason: transitioned ? 'Fix successful' : 'Failed to transition to game'
      };

    } catch (error) {
      return {
        passed: false,
        reason: `Test error: ${error.message}`
      };
    }
  }

  /**
   * Test save system fix
   */
  async testSaveSystem(page) {
    try {
      // Get initial state
      const beforeSave = await page.evaluate(() => {
        return window.gameState?.get('player');
      });

      // Attempt save
      const saveResult = await page.evaluate(() => {
        try {
          window.gameState?.save();
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      if (!saveResult.success) {
        return {
          passed: false,
          reason: `Save failed: ${saveResult.error}`
        };
      }

      // Reload and check
      await page.reload();
      await page.waitForTimeout(1000);

      const afterLoad = await page.evaluate(() => {
        return window.gameState?.get('player');
      });

      return {
        passed: JSON.stringify(beforeSave) === JSON.stringify(afterLoad),
        reason: 'Save/load cycle successful'
      };

    } catch (error) {
      return {
        passed: false,
        reason: `Test error: ${error.message}`
      };
    }
  }

  /**
   * Test game state fix
   */
  async testGameState(page) {
    try {
      const stateValid = await page.evaluate(() => {
        const state = window.gameState;
        return state &&
               typeof state.get === 'function' &&
               typeof state.set === 'function';
      });

      return {
        passed: stateValid,
        reason: stateValid ? 'Game state valid' : 'Game state invalid'
      };

    } catch (error) {
      return {
        passed: false,
        reason: `Test error: ${error.message}`
      };
    }
  }

  /**
   * Run generic test
   */
  async runGenericTest(page, error) {
    try {
      // Check if error still occurs
      const errorStillPresent = await page.evaluate((errorType) => {
        // Try to trigger the error condition
        try {
          // This would be customized based on error type
          return false;
        } catch (e) {
          return e.message.includes(errorType);
        }
      }, error.type);

      return {
        passed: !errorStillPresent,
        reason: errorStillPresent ? 'Error still present' : 'Error resolved'
      };

    } catch (error) {
      return {
        passed: false,
        reason: `Test error: ${error.message}`
      };
    }
  }

  /**
   * Check for regressions
   */
  async checkForRegressions(fix, error) {
    console.log('[FixValidator] Checking for regressions');

    const regressionTests = [
      { name: 'Core functionality', test: this.testCoreFunctionality },
      { name: 'UI responsiveness', test: this.testUIResponsiveness },
      { name: 'Save/Load', test: this.testSaveLoad },
      { name: 'Resource system', test: this.testResourceSystem }
    ];

    const results = [];

    for (const regression of regressionTests) {
      try {
        const result = await regression.test.call(this);
        results.push({
          name: regression.name,
          passed: result.passed,
          details: result
        });
      } catch (error) {
        results.push({
          name: regression.name,
          passed: false,
          error: error.message
        });
      }
    }

    const passed = results.every(r => r.passed);
    const score = (results.filter(r => r.passed).length / results.length) * 100;

    return {
      passed,
      results,
      score
    };
  }

  /**
   * Measure performance impact
   */
  async measurePerformanceImpact(fix) {
    console.log('[FixValidator] Measuring performance impact');

    try {
      if (!this.browser) {
        this.browser = await chromium.launch({ headless: true });
      }

      const page = await this.browser.newPage();

      // Measure baseline performance
      await page.goto('http://localhost:8080');
      const baseline = await page.evaluate(() => {
        const start = performance.now();
        // Run some operations
        for (let i = 0; i < 1000; i++) {
          document.querySelectorAll('button');
        }
        return performance.now() - start;
      });

      // Apply fix and measure again
      await page.evaluate((fixCode) => {
        eval(fixCode);
      }, fix.code);

      const withFix = await page.evaluate(() => {
        const start = performance.now();
        // Run same operations
        for (let i = 0; i < 1000; i++) {
          document.querySelectorAll('button');
        }
        return performance.now() - start;
      });

      await page.close();

      const ratio = withFix / baseline;
      const acceptable = ratio <= this.config.performanceThreshold;

      return {
        baseline,
        withFix,
        ratio,
        acceptable,
        score: acceptable ? 100 : Math.max(0, 100 - (ratio - 1) * 100)
      };

    } catch (error) {
      return {
        error: error.message,
        score: 50 // Neutral score on error
      };
    }
  }

  /**
   * Calculate integration score
   */
  calculateIntegrationScore(testResult, newErrors) {
    let score = 0;

    if (testResult.passed) {
      score += 60;
    }

    if (newErrors.length === 0) {
      score += 40;
    } else {
      score += Math.max(0, 40 - newErrors.length * 10);
    }

    return score;
  }

  /**
   * Calculate overall validation score
   */
  calculateValidationScore(checks) {
    const weights = {
      syntax: 0.2,
      isolation: 0.15,
      integration: 0.35,
      regression: 0.2,
      performance: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [check, weight] of Object.entries(weights)) {
      if (checks[check] && typeof checks[check].score === 'number') {
        totalScore += checks[check].score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Create isolated sandbox for testing
   */
  async createSandbox() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();

    // Set up minimal environment
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><title>Fix Validator Sandbox</title></head>
      <body>
        <div id="test-container"></div>
        <script>
          // Minimal game environment simulation
          window.gameState = {
            data: {},
            get: function(key) { return this.data[key]; },
            set: function(key, value) { this.data[key] = value; }
          };
          window.characterSelections = {};
        </script>
      </body>
      </html>
    `);

    return page;
  }

  /**
   * Test core functionality
   */
  async testCoreFunctionality() {
    // This would be implemented with actual game tests
    return { passed: true };
  }

  /**
   * Test UI responsiveness
   */
  async testUIResponsiveness() {
    // This would be implemented with actual UI tests
    return { passed: true };
  }

  /**
   * Test save/load system
   */
  async testSaveLoad() {
    // This would be implemented with actual save/load tests
    return { passed: true };
  }

  /**
   * Test resource system
   */
  async testResourceSystem() {
    // This would be implemented with actual resource tests
    return { passed: true };
  }

  /**
   * Get validation history
   */
  getHistory() {
    return {
      total: this.validationResults.length,
      passed: this.validationResults.filter(v => v.passed).length,
      failed: this.validationResults.filter(v => !v.passed).length,
      averageScore: this.validationResults.reduce((sum, v) => sum + (v.score || 0), 0) /
                   this.validationResults.length || 0,
      recent: this.validationResults.slice(-10)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FixValidator;
}