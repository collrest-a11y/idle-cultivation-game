import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { ErrorDetector } from './error-detector.js';
import { ErrorAggregator } from './error-aggregator.js';

/**
 * FixValidator - Validates proposed fixes in isolated environments
 *
 * This class creates sandboxed environments to test fixes without affecting
 * the production codebase, ensuring comprehensive validation before application.
 */
export class FixValidator {
  constructor(options = {}) {
    this.sandboxDir = options.sandboxDir || './test-sandbox';
    this.validationResults = [];
    this.sourceDir = options.sourceDir || './src';
    this.gameDir = options.gameDir || './';
    this.serverPort = options.serverPort || 8081;
  }

  /**
   * Creates an isolated sandbox environment for fix testing
   * @returns {Object} Sandbox configuration with path and cleanup function
   */
  async createSandbox() {
    const sandboxId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sandboxPath = path.join(this.sandboxDir, sandboxId);

    try {
      // Ensure sandbox directory exists
      await fs.ensureDir(this.sandboxDir);

      // Copy entire game directory to sandbox
      await fs.copy(this.gameDir, sandboxPath, {
        filter: (src) => {
          // Skip node_modules, .git, and test directories
          const relativePath = path.relative(this.gameDir, src);
          return !relativePath.includes('node_modules') &&
                 !relativePath.includes('.git') &&
                 !relativePath.includes('test-sandbox') &&
                 !relativePath.includes('coverage');
        }
      });

      return {
        id: sandboxId,
        path: sandboxPath,
        cleanup: async () => {
          try {
            await fs.remove(sandboxPath);
          } catch (error) {
            console.warn(`Failed to cleanup sandbox ${sandboxId}:`, error.message);
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to create sandbox: ${error.message}`);
    }
  }

  /**
   * Main validation method - tests a fix comprehensively
   * @param {Object} fix - The fix to validate
   * @param {Object} error - The original error being fixed
   * @param {Object} context - Context about where to apply the fix
   * @returns {Object} Comprehensive validation results
   */
  async validateFix(fix, error, context) {
    const sandbox = await this.createSandbox();

    try {
      console.log(`Starting validation for fix in sandbox ${sandbox.id}`);

      // Apply fix to sandbox
      await this.applyFixToSandbox(fix, sandbox, context);

      // Run comprehensive validation stages
      const results = {
        sandboxId: sandbox.id,
        fix,
        error,
        context,
        timestamp: new Date().toISOString(),
        stages: {
          syntax: await this.validateSyntax(sandbox),
          functional: await this.validateFunctionality(sandbox, error),
          regression: await this.validateNoRegressions(sandbox),
          performance: await this.validatePerformance(sandbox),
          sideEffects: await this.detectSideEffects(sandbox, context)
        }
      };

      // Calculate overall validation score
      results.score = this.calculateValidationScore(results.stages);
      results.recommendation = this.getRecommendation(results);
      results.summary = this.generateValidationSummary(results);

      // Store results
      this.validationResults.push(results);

      return results;
    } catch (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    } finally {
      await sandbox.cleanup();
    }
  }

  /**
   * Applies the proposed fix to the sandbox environment
   * @param {Object} fix - The fix to apply
   * @param {Object} sandbox - Sandbox environment
   * @param {Object} context - Application context
   */
  async applyFixToSandbox(fix, sandbox, context) {
    try {
      if (fix.type === 'file-replacement') {
        const targetFile = path.join(sandbox.path, context.file);
        await fs.writeFile(targetFile, fix.content);
      } else if (fix.type === 'line-insertion') {
        const targetFile = path.join(sandbox.path, context.file);
        let content = await fs.readFile(targetFile, 'utf-8');
        const lines = content.split('\n');

        if (context.line && context.line > 0) {
          lines.splice(context.line - 1, 0, fix.code);
        } else {
          lines.push(fix.code);
        }

        content = lines.join('\n');
        await fs.writeFile(targetFile, content);
      } else if (fix.type === 'content-replacement') {
        const targetFile = path.join(sandbox.path, context.file);
        let content = await fs.readFile(targetFile, 'utf-8');

        if (fix.search && fix.replace) {
          content = content.replace(new RegExp(fix.search, 'g'), fix.replace);
        }

        await fs.writeFile(targetFile, content);
      } else {
        throw new Error(`Unsupported fix type: ${fix.type}`);
      }

      console.log(`Applied ${fix.type} fix to ${context.file}`);
    } catch (error) {
      throw new Error(`Failed to apply fix to sandbox: ${error.message}`);
    }
  }

  /**
   * Validates syntax correctness of modified files
   * @param {Object} sandbox - Sandbox environment
   * @returns {Object} Syntax validation results
   */
  async validateSyntax(sandbox) {
    try {
      const jsFiles = await this.getJavaScriptFiles(sandbox.path);
      const errors = [];

      for (const file of jsFiles) {
        try {
          const content = await fs.readFile(file, 'utf-8');

          // Basic syntax check using Function constructor
          new Function(content);

          // Additional checks for common patterns
          this.validateCommonPatterns(content, file, errors);
        } catch (syntaxError) {
          errors.push({
            file: path.relative(sandbox.path, file),
            message: syntaxError.message,
            type: 'syntax-error'
          });
        }
      }

      return {
        passed: errors.length === 0,
        errors,
        filesChecked: jsFiles.length
      };
    } catch (error) {
      return {
        passed: false,
        errors: [{ message: `Syntax validation failed: ${error.message}`, type: 'validation-error' }],
        filesChecked: 0
      };
    }
  }

  /**
   * Validates that the fix resolves the original error and doesn't break functionality
   * @param {Object} sandbox - Sandbox environment
   * @param {Object} originalError - The error being fixed
   * @returns {Object} Functional validation results
   */
  async validateFunctionality(sandbox, originalError) {
    let browser = null;
    let server = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-web-security', '--allow-running-insecure-content']
      });
      const page = await browser.newPage();

      // Set up error monitoring
      const errorDetector = new ErrorDetector();
      await errorDetector.initialize(page);

      // Start sandbox server
      server = await this.startSandboxServer(sandbox);

      // Navigate to sandbox application
      await page.goto(`http://localhost:${server.port}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      // Wait for initial load
      await page.waitForTimeout(2000);

      // Check if original error is fixed
      const originalErrorFixed = await this.checkOriginalErrorFixed(page, originalError);

      // Check basic functionality
      const basicFunctionalityWorks = await this.checkBasicFunctionality(page);

      // Collect any new errors
      const detectedErrors = await errorDetector.getErrors();

      await server.close();

      return {
        passed: originalErrorFixed && basicFunctionalityWorks && detectedErrors.length === 0,
        originalErrorFixed,
        basicFunctionalityWorks,
        newErrors: detectedErrors,
        errorCount: detectedErrors.length
      };
    } catch (error) {
      if (server) await server.close();

      return {
        passed: false,
        originalErrorFixed: false,
        basicFunctionalityWorks: false,
        newErrors: [{ message: `Functional validation failed: ${error.message}`, type: 'validation-error' }],
        errorCount: 1
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Checks if the original error has been resolved
   * @param {Object} page - Playwright page
   * @param {Object} error - Original error context
   * @returns {boolean} Whether error is fixed
   */
  async checkOriginalErrorFixed(page, error) {
    try {
      if (error.type === 'character-creation-bug') {
        // Test character creation workflow
        const dustRoad = page.locator('[data-choice="dust-road"]');
        const protect = page.locator('[data-choice="protect"]');
        const thunder = page.locator('[data-choice="thunder"]');
        const beginBtn = page.locator('#begin-cultivation');

        // Make selections
        if (await dustRoad.isVisible()) await dustRoad.click();
        if (await protect.isVisible()) await protect.click();
        if (await thunder.isVisible()) await thunder.click();

        // Check if button is now enabled
        await page.waitForTimeout(500);
        return await beginBtn.isEnabled();
      }

      if (error.type === 'console-error') {
        // Monitor console for specific error
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await page.waitForTimeout(3000);

        return !consoleErrors.some(e =>
          e.includes(error.message) || e.includes(error.pattern)
        );
      }

      // Generic error check - assume fixed if no critical errors
      const hasErrors = await page.evaluate(() => {
        return window.console.error.calls?.length > 0 ||
               window.errorManager?.getCriticalErrors()?.length > 0;
      });

      return !hasErrors;
    } catch (checkError) {
      console.warn(`Error check failed: ${checkError.message}`);
      return false;
    }
  }

  /**
   * Validates basic game functionality still works
   * @param {Object} page - Playwright page
   * @returns {boolean} Whether basic functionality works
   */
  async checkBasicFunctionality(page) {
    const checks = [
      // Game title loads
      async () => {
        const title = await page.title();
        return title.includes('Idle Cultivation') || title.includes('Cultivation');
      },

      // Game state initializes
      async () => {
        return await page.evaluate(() =>
          typeof window.gameState !== 'undefined' && window.gameState !== null
        );
      },

      // No critical JavaScript errors
      async () => {
        const criticalErrors = await page.evaluate(() => {
          const errors = window.errorManager?.getErrors() || [];
          return errors.filter(e => e.severity === 'CRITICAL');
        });
        return criticalErrors.length === 0;
      },

      // Main game interface is visible
      async () => {
        const gameContainer = page.locator('.game-container, #game-container, main, .app');
        return await gameContainer.first().isVisible();
      }
    ];

    for (const check of checks) {
      try {
        if (!(await check())) {
          return false;
        }
      } catch (error) {
        console.warn(`Basic functionality check failed: ${error.message}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validates no regressions were introduced
   * @param {Object} sandbox - Sandbox environment
   * @returns {Object} Regression test results
   */
  async validateNoRegressions(sandbox) {
    try {
      const regressionSuite = await this.loadRegressionSuite();
      const results = await regressionSuite.runTests(sandbox);

      return {
        passed: results.failed === 0,
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        failures: results.failures
      };
    } catch (error) {
      return {
        passed: false,
        total: 0,
        passed: 0,
        failed: 1,
        failures: [{ message: `Regression testing failed: ${error.message}` }]
      };
    }
  }

  /**
   * Validates performance impact of the fix
   * @param {Object} sandbox - Sandbox environment
   * @returns {Object} Performance validation results
   */
  async validatePerformance(sandbox) {
    let browser = null;
    let server = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      server = await this.startSandboxServer(sandbox);

      // Record performance metrics
      const startTime = Date.now();
      await page.goto(`http://localhost:${server.port}`);
      const loadTime = Date.now() - startTime;

      // Enable performance monitoring
      await page.evaluate(() => {
        window.performanceMetrics = {
          loadTime: 0,
          memoryUsage: [],
          fps: []
        };

        // Monitor memory usage
        setInterval(() => {
          if (window.performance && window.performance.memory) {
            window.performanceMetrics.memoryUsage.push(window.performance.memory.usedJSHeapSize);
          }
        }, 1000);

        // Monitor FPS (simplified)
        let lastTime = performance.now();
        let frames = 0;
        function countFrame() {
          frames++;
          const now = performance.now();
          if (now >= lastTime + 1000) {
            window.performanceMetrics.fps.push(frames);
            frames = 0;
            lastTime = now;
          }
          requestAnimationFrame(countFrame);
        }
        countFrame();
      });

      // Let the game run for performance measurement
      await page.waitForTimeout(5000);

      // Collect metrics
      const metrics = await page.evaluate(() => {
        const memory = window.performanceMetrics.memoryUsage;
        const fps = window.performanceMetrics.fps;

        return {
          loadTime: Date.now() - window.performance.timing.navigationStart,
          avgMemory: memory.length > 0 ? memory.reduce((a,b) => a+b, 0) / memory.length : 0,
          avgFps: fps.length > 0 ? fps.reduce((a,b) => a+b, 0) / fps.length : 0,
          maxMemory: Math.max(...memory),
          minFps: Math.min(...fps)
        };
      });

      await server.close();

      // Define performance thresholds
      const thresholds = {
        maxLoadTime: 5000, // 5 seconds
        minAvgFps: 30,
        maxMemoryMB: 100
      };

      const memoryMB = metrics.avgMemory / (1024 * 1024);

      return {
        passed: loadTime < thresholds.maxLoadTime &&
                metrics.avgFps > thresholds.minAvgFps &&
                memoryMB < thresholds.maxMemoryMB,
        loadTime,
        avgMemory: metrics.avgMemory,
        avgMemoryMB: memoryMB,
        avgFps: metrics.avgFps,
        thresholds
      };
    } catch (error) {
      if (server) await server.close();

      return {
        passed: false,
        error: error.message,
        loadTime: Infinity,
        avgMemory: 0,
        avgFps: 0
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Detects unintended side effects of the fix
   * @param {Object} sandbox - Sandbox environment
   * @param {Object} context - Fix application context
   * @returns {Object} Side effect detection results
   */
  async detectSideEffects(sandbox, context) {
    const sideEffects = [];

    try {
      // Check for unexpected file modifications
      const modifiedFiles = await this.getModifiedFiles(sandbox, context.file);
      if (modifiedFiles.length > 0) {
        sideEffects.push({
          type: 'unexpected-file-changes',
          files: modifiedFiles,
          severity: 'MEDIUM'
        });
      }

      // Check for potential global variable pollution
      const globalChanges = await this.detectGlobalChanges(sandbox);
      if (globalChanges.length > 0) {
        sideEffects.push({
          type: 'global-pollution',
          variables: globalChanges,
          severity: 'HIGH'
        });
      }

      // Check for new dependencies
      const newDependencies = await this.detectNewDependencies(sandbox);
      if (newDependencies.length > 0) {
        sideEffects.push({
          type: 'new-dependencies',
          dependencies: newDependencies,
          severity: 'LOW'
        });
      }

      return {
        detected: sideEffects.length > 0,
        count: sideEffects.length,
        sideEffects
      };
    } catch (error) {
      return {
        detected: true,
        count: 1,
        sideEffects: [{
          type: 'side-effect-detection-error',
          message: error.message,
          severity: 'HIGH'
        }]
      };
    }
  }

  /**
   * Helper methods
   */

  async getJavaScriptFiles(directory) {
    const files = [];

    async function scanDirectory(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !['node_modules', '.git', 'test-sandbox'].includes(entry.name)) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && fullPath.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    }

    await scanDirectory(directory);
    return files;
  }

  validateCommonPatterns(content, file, errors) {
    // Check for unmatched brackets
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack = [];

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (brackets[char]) {
        stack.push({ char, pos: i });
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last.char] !== char) {
          errors.push({
            file: path.basename(file),
            message: `Unmatched bracket at position ${i}`,
            type: 'bracket-mismatch'
          });
        }
      }
    }
  }

  async startSandboxServer(sandbox) {
    const express = require('express');
    const app = express();

    // Serve static files from sandbox
    app.use(express.static(sandbox.path));

    const server = app.listen(this.serverPort);

    return {
      port: this.serverPort,
      close: () => new Promise((resolve) => server.close(resolve))
    };
  }

  async loadRegressionSuite() {
    const { RegressionSuite } = await import('./regression-suite.js');
    return new RegressionSuite();
  }

  async getModifiedFiles(sandbox, targetFile) {
    // This would compare sandbox with original to find unintended changes
    // For now, simplified version
    return [];
  }

  async detectGlobalChanges(sandbox) {
    // This would check for global variable pollution
    // For now, simplified version
    return [];
  }

  async detectNewDependencies(sandbox) {
    // This would check for new dependencies introduced
    // For now, simplified version
    return [];
  }

  /**
   * Calculates overall validation score from stage results
   * @param {Object} stages - Results from all validation stages
   * @returns {number} Score from 0-100
   */
  calculateValidationScore(stages) {
    const weights = {
      syntax: 0.2,
      functional: 0.3,
      regression: 0.25,
      performance: 0.15,
      sideEffects: 0.1
    };

    let score = 0;

    if (stages.syntax.passed) score += weights.syntax * 100;
    if (stages.functional.passed) score += weights.functional * 100;
    if (stages.regression.passed) score += weights.regression * 100;
    if (stages.performance.passed) score += weights.performance * 100;
    if (!stages.sideEffects.detected) score += weights.sideEffects * 100;

    return Math.round(score);
  }

  /**
   * Generates recommendation based on validation results
   * @param {Object} results - Complete validation results
   * @returns {Object} Recommendation with action and confidence
   */
  getRecommendation(results) {
    const score = results.score;

    if (score >= 90) {
      return {
        action: 'APPLY',
        confidence: 'HIGH',
        reasoning: 'All validation stages passed with high confidence'
      };
    } else if (score >= 75) {
      return {
        action: 'APPLY_WITH_MONITORING',
        confidence: 'MEDIUM',
        reasoning: 'Most validation stages passed, monitor after application'
      };
    } else if (score >= 50) {
      return {
        action: 'MANUAL_REVIEW',
        confidence: 'LOW',
        reasoning: 'Some validation stages failed, requires manual review'
      };
    } else {
      return {
        action: 'REJECT',
        confidence: 'NONE',
        reasoning: 'Multiple validation stages failed, fix is not safe'
      };
    }
  }

  /**
   * Generates human-readable summary of validation results
   * @param {Object} results - Complete validation results
   * @returns {Object} Summary information
   */
  generateValidationSummary(results) {
    const stages = results.stages;
    const passed = Object.values(stages).filter(s => s.passed || !s.detected).length;
    const total = Object.keys(stages).length;

    return {
      overallResult: results.recommendation.action,
      confidence: results.recommendation.confidence,
      score: results.score,
      stagesPassed: passed,
      stagesTotal: total,
      criticalIssues: this.extractCriticalIssues(stages),
      recommendations: this.generateRecommendations(stages)
    };
  }

  extractCriticalIssues(stages) {
    const issues = [];

    if (!stages.syntax.passed) {
      issues.push(`Syntax errors detected: ${stages.syntax.errors.length} files affected`);
    }

    if (!stages.functional.passed) {
      issues.push(`Functional validation failed: ${stages.functional.errorCount} new errors`);
    }

    if (!stages.regression.passed) {
      issues.push(`Regression tests failed: ${stages.regression.failed}/${stages.regression.total} tests`);
    }

    return issues;
  }

  generateRecommendations(stages) {
    const recommendations = [];

    if (!stages.syntax.passed) {
      recommendations.push('Fix syntax errors before applying');
    }

    if (!stages.functional.passed && !stages.functional.originalErrorFixed) {
      recommendations.push('Fix does not resolve the original error');
    }

    if (stages.sideEffects.detected) {
      recommendations.push(`Address ${stages.sideEffects.count} detected side effects`);
    }

    return recommendations;
  }
}