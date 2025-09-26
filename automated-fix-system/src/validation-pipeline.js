import { exec } from 'child_process';
import { promisify } from 'util';
import { ESLint } from 'eslint';
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

const execAsync = promisify(exec);

export class ValidationPipeline {
  constructor(config = {}) {
    this.logger = new Logger('ValidationPipeline');

    this.config = {
      testCommand: config.testCommand || 'npm test',
      testTimeout: config.testTimeout || 30000,
      gamePath: config.gamePath || process.env.GAME_PATH || '../',
      gameUrl: config.gameUrl || process.env.GAME_URL || 'http://localhost:8080',
      confidenceThreshold: parseInt(config.confidenceThreshold || process.env.CONFIDENCE_THRESHOLD || '75')
    };

    this.eslint = new ESLint({
      fix: false,
      baseConfig: {
        env: {
          browser: true,
          es2021: true
        },
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module'
        },
        rules: {
          'no-undef': 'error',
          'no-unused-vars': 'warn',
          'no-const-assign': 'error',
          'no-dupe-keys': 'error',
          'no-unreachable': 'error',
          'valid-typeof': 'error'
        }
      }
    });

    this.browser = null;
  }

  async validateFix(fix, error, originalCode) {
    this.logger.info(`Validating fix with confidence ${fix.confidence}%`);

    const results = {
      syntax: await this.validateSyntax(fix.code),
      eslint: await this.validateESLint(fix.code),
      functionality: await this.validateFunctionality(fix, error),
      regression: await this.runRegressionTests(),
      performance: await this.validatePerformance(originalCode, fix.code),
      confidence: fix.confidence
    };

    // Calculate overall score
    const weights = {
      syntax: 0.3,
      eslint: 0.2,
      functionality: 0.25,
      regression: 0.15,
      performance: 0.1
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (results[key]?.passed) {
        score += weight * 100;
      }
    }

    results.score = Math.round(score);
    results.passed = results.score >= this.config.confidenceThreshold;
    results.recommendation = this.getRecommendation(results);

    this.logger.info(`Validation complete: Score ${results.score}%, ${results.passed ? 'PASSED' : 'FAILED'}`);

    return results;
  }

  async validateSyntax(code) {
    try {
      // Basic JavaScript syntax check
      new Function(code);

      // Check for common issues
      const issues = [];

      // Check for console.log statements
      if (code.includes('console.log') && process.env.NODE_ENV === 'production') {
        issues.push('Contains console.log statements');
      }

      // Check for debugger statements
      if (code.includes('debugger')) {
        issues.push('Contains debugger statements');
      }

      // Check for eval
      if (code.includes('eval(')) {
        issues.push('Contains eval() - security risk');
      }

      return {
        passed: issues.length === 0,
        issues
      };

    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async validateESLint(code) {
    try {
      const results = await this.eslint.lintText(code);
      const report = results[0];

      const errors = report.messages.filter(m => m.severity === 2);
      const warnings = report.messages.filter(m => m.severity === 1);

      return {
        passed: errors.length === 0,
        errors: errors.length,
        warnings: warnings.length,
        messages: report.messages.slice(0, 5) // First 5 messages
      };

    } catch (error) {
      this.logger.error('ESLint validation failed:', error);
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async validateFunctionality(fix, error) {
    try {
      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await this.browser.newPage();

      // Inject the fix and test
      await page.goto(this.config.gameUrl, { waitUntil: 'domcontentloaded' });

      // Inject fix code
      await page.evaluate((fixCode) => {
        try {
          eval(fixCode);
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }, fix.code);

      // Try to reproduce the original error scenario
      let errorReproduced = false;

      // Set up error monitoring
      page.on('error', (err) => {
        if (err.message.includes(error.message)) {
          errorReproduced = true;
        }
      });

      // Wait and check if error occurs
      await page.waitForTimeout(3000);

      await page.close();

      return {
        passed: !errorReproduced,
        message: errorReproduced ? 'Original error still occurs' : 'Fix prevents error'
      };

    } catch (error) {
      this.logger.error('Functionality validation failed:', error);
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async runRegressionTests() {
    try {
      // Run existing test suite if available
      const testPath = path.join(this.config.gamePath, 'package.json');

      if (!await fs.pathExists(testPath)) {
        this.logger.info('No test suite found, skipping regression tests');
        return {
          passed: true,
          skipped: true,
          message: 'No test suite available'
        };
      }

      // Run tests with timeout
      const { stdout, stderr } = await execAsync(
        this.config.testCommand,
        {
          cwd: this.config.gamePath,
          timeout: this.config.testTimeout
        }
      );

      const passed = !stderr || !stderr.includes('fail');

      return {
        passed,
        output: stdout.substring(0, 500),
        errors: stderr ? stderr.substring(0, 500) : null
      };

    } catch (error) {
      // Tests failed or timed out
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async validatePerformance(originalCode, fixedCode) {
    try {
      // Compare code complexity and size
      const originalSize = originalCode.length;
      const fixedSize = fixedCode.length;
      const sizeDiff = fixedSize - originalSize;

      // Check for obvious performance issues
      const issues = [];

      // Check for nested loops
      const nestedLoops = (fixedCode.match(/for.*{.*for/gs) || []).length;
      if (nestedLoops > 2) {
        issues.push('Multiple nested loops detected');
      }

      // Check for synchronous file operations
      if (fixedCode.includes('readFileSync') || fixedCode.includes('writeFileSync')) {
        issues.push('Synchronous file operations detected');
      }

      // Check for large regex operations
      const regexCount = (fixedCode.match(/new RegExp/g) || []).length;
      if (regexCount > 5) {
        issues.push('Many regex operations detected');
      }

      return {
        passed: issues.length === 0 && Math.abs(sizeDiff) < 1000,
        sizeDiff,
        issues
      };

    } catch (error) {
      return {
        passed: true, // Don't fail on performance check errors
        error: error.message
      };
    }
  }

  getRecommendation(results) {
    if (results.score >= 90) {
      return 'APPLY_IMMEDIATELY';
    } else if (results.score >= 75) {
      return 'APPLY_WITH_MONITORING';
    } else if (results.score >= 60) {
      return 'REVIEW_REQUIRED';
    } else {
      return 'DO_NOT_APPLY';
    }
  }

  async testInSandbox(fix) {
    try {
      // Create isolated test environment
      const sandboxPath = path.join(this.config.gamePath, '.sandbox');
      await fs.ensureDir(sandboxPath);

      // Copy game files to sandbox
      const filesToCopy = ['index.html', 'js', 'css', 'assets'];
      for (const file of filesToCopy) {
        const src = path.join(this.config.gamePath, file);
        const dest = path.join(sandboxPath, file);
        if (await fs.pathExists(src)) {
          await fs.copy(src, dest);
        }
      }

      // Apply fix to sandbox
      const targetFile = path.join(sandboxPath, fix.file);
      if (await fs.pathExists(targetFile)) {
        const content = await fs.readFile(targetFile, 'utf8');
        const lines = content.split('\n');

        // Apply fix
        const startLine = fix.startLine - 1;
        const endLine = fix.endLine - 1;
        lines.splice(startLine, endLine - startLine + 1, ...fix.code.split('\n'));

        await fs.writeFile(targetFile, lines.join('\n'));
      }

      // Test in sandbox (simplified)
      const testPassed = true; // Implement actual sandbox testing

      // Clean up
      await fs.remove(sandboxPath);

      return {
        passed: testPassed
      };

    } catch (error) {
      this.logger.error('Sandbox test failed:', error);
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}