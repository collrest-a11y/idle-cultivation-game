/**
 * Integration script to run comprehensive error detection
 * This demonstrates how the error detection system would catch bugs like the character creation issue
 */
import { ErrorDetector } from './error-detector.js';
import { ErrorAggregator } from './error-aggregator.js';
import { ErrorReporter } from './error-reporter.js';
import { FunctionalErrorDetector } from './functional-error-detector.js';
import { UIErrorDetector } from './ui-error-detector.js';
import { StateValidator } from './state-validator.js';

export class ErrorDetectionRunner {
  constructor() {
    this.errorDetector = new ErrorDetector();
    this.functionalDetector = new FunctionalErrorDetector();
    this.uiDetector = new UIErrorDetector();
    this.stateValidator = new StateValidator();
    this.errorAggregator = new ErrorAggregator();
    this.errorReporter = new ErrorReporter();
  }

  async runErrorDetection(page) {
    console.log('[ErrorDetectionRunner] Starting comprehensive error detection...');

    try {
      // Initialize error detector
      await this.errorDetector.initialize(page);
      this.errorAggregator.addDetector(this.errorDetector);

      console.log('[ErrorDetectionRunner] Error detection systems initialized');

      // Navigate to the page first
      await page.goto('file://' + process.cwd().replace(/\\/g, '/') + '/index.html');
      await page.waitForTimeout(2000);

      // Run functional error detection (this will catch the Begin button bug)
      console.log('[ErrorDetectionRunner] Running functional error detection...');
      const functionalErrors = await this.functionalDetector.detectAllErrors(page);
      console.log(`[ErrorDetectionRunner] Functional detection found ${functionalErrors.length} errors`);

      // Run UI error detection
      console.log('[ErrorDetectionRunner] Running UI error detection...');
      const uiErrors = await this.uiDetector.detectUIErrors(page);
      console.log(`[ErrorDetectionRunner] UI detection found ${uiErrors.length} errors`);

      // Run state validation
      console.log('[ErrorDetectionRunner] Running state validation...');
      const stateErrors = await this.stateValidator.validateGameState(page);
      console.log(`[ErrorDetectionRunner] State validation found ${stateErrors.length} errors`);

      // Run legacy tests for backward compatibility
      const characterCreationErrors = await this.testCharacterCreation(page);
      console.log(`[ErrorDetectionRunner] Character creation test found ${characterCreationErrors.length} errors`);

      const saveLoadErrors = await this.testSaveLoad(page);
      console.log(`[ErrorDetectionRunner] Save/load test found ${saveLoadErrors.length} errors`);

      // Wait for async error detection to complete
      await this.waitForErrorDetection(5000);

      // Collect all detected errors
      const allErrors = await this.errorAggregator.collectAllErrors();
      console.log(`[ErrorDetectionRunner] Total errors collected: ${allErrors.length}`);

      // Generate comprehensive report
      const aggregatedData = this.errorAggregator.generateReport();
      const report = this.errorReporter.generateReport(aggregatedData);
      const summaryReport = this.errorReporter.generateSummaryReport(aggregatedData);
      const technicalReport = this.errorReporter.generateTechnicalReport(aggregatedData);

      return {
        summary: summaryReport,
        detailed: report,
        technical: technicalReport,
        functionalErrors,
        uiErrors,
        stateErrors,
        characterCreationErrors,
        saveLoadErrors
      };

    } finally {
      // Clean up
      this.errorDetector.destroy();
    }
  }

  async testCharacterCreation(page) {
    console.log('[ErrorDetectionRunner] Testing character creation flow (legacy test)...');
    const errors = [];

    try {
      // Page already navigated in main function

      // Start character creation
      const startButton = page.locator('#start-character-creation');
      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(1000);
      }

      // Test choice selection
      console.log('[ErrorDetectionRunner] Testing choice selections...');

      // Select first choice
      const dustRoadChoice = page.locator('[data-choice="dust-road"]');
      if (await dustRoadChoice.isVisible()) {
        await dustRoadChoice.click();
        await page.waitForTimeout(500);
      }

      // Select second choice
      const protectChoice = page.locator('[data-choice="protect"]');
      if (await protectChoice.isVisible()) {
        await protectChoice.click();
        await page.waitForTimeout(500);
      }

      // Select third choice
      const thunderChoice = page.locator('[data-choice="thunder"]');
      if (await thunderChoice.isVisible()) {
        await thunderChoice.click();
        await page.waitForTimeout(500);
      }

      // Check if begin button should be enabled
      const beginButton = page.locator('#begin-cultivation');
      const isButtonVisible = await beginButton.isVisible();
      const isButtonEnabled = await beginButton.isEnabled().catch(() => false);

      console.log(`[ErrorDetectionRunner] Begin button - Visible: ${isButtonVisible}, Enabled: ${isButtonEnabled}`);

      if (isButtonVisible && !isButtonEnabled) {
        // This is the character creation bug!
        const error = {
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'character-creation',
          issue: 'Begin button not enabled after all selections made',
          expectedState: 'enabled',
          actualState: 'disabled',
          timestamp: Date.now(),
          context: {
            selectedChoices: 3,
            buttonVisible: isButtonVisible,
            buttonEnabled: isButtonEnabled
          }
        };

        errors.push(error);
        this.errorDetector.captureFunctionalError(error);
        console.log('[ErrorDetectionRunner] ❌ CRITICAL BUG DETECTED: Character creation button not working!');
      }

      // If button is enabled, test the transition
      if (isButtonEnabled) {
        console.log('[ErrorDetectionRunner] Testing character creation completion...');
        await beginButton.click();
        await page.waitForTimeout(3000);

        const creationHidden = await page.locator('#character-creation').isHidden();
        const gameVisible = await page.locator('#game-interface').isVisible();

        if (!creationHidden || !gameVisible) {
          const error = {
            type: 'functional-error',
            severity: 'CRITICAL',
            component: 'character-creation',
            issue: 'Failed to transition to game after character creation',
            characterCreationHidden: creationHidden,
            gameInterfaceVisible: gameVisible,
            timestamp: Date.now()
          };

          errors.push(error);
          this.errorDetector.captureFunctionalError(error);
          console.log('[ErrorDetectionRunner] ❌ CRITICAL BUG DETECTED: Character creation transition failed!');
        } else {
          console.log('[ErrorDetectionRunner] ✅ Character creation completed successfully');
        }
      }

    } catch (error) {
      console.error('[ErrorDetectionRunner] Error during character creation test:', error);
      const testError = {
        type: 'test-error',
        severity: 'HIGH',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      };
      errors.push(testError);
      this.errorDetector.captureFunctionalError(testError);
    }

    return errors;
  }

  async testSaveLoad(page) {
    console.log('[ErrorDetectionRunner] Testing save/load functionality...');
    const errors = [];

    try {
      // Test save functionality
      const saveResult = await page.evaluate(() => {
        try {
          if (window.gameState && typeof window.gameState.save === 'function') {
            window.gameState.save();
            return { success: true };
          } else {
            return { success: false, error: 'gameState.save not available' };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      if (!saveResult.success) {
        const error = {
          type: 'functional-error',
          severity: 'HIGH',
          component: 'save-system',
          issue: 'Save functionality failed',
          error: saveResult.error,
          timestamp: Date.now()
        };

        errors.push(error);
        this.errorDetector.captureFunctionalError(error);
        console.log('[ErrorDetectionRunner] ❌ Save system error detected');
      } else {
        console.log('[ErrorDetectionRunner] ✅ Save functionality working');
      }

      // Test load functionality after reload
      await page.reload();
      await page.waitForTimeout(2000);

      const loadResult = await page.evaluate(() => {
        if (window.gameState && typeof window.gameState.get === 'function') {
          const player = window.gameState.get('player');
          const resources = window.gameState.get('resources');
          return {
            hasPlayer: !!player,
            hasResources: !!resources,
            playerData: player,
            resourcesData: resources
          };
        }
        return { hasPlayer: false, hasResources: false };
      });

      if (!loadResult.hasPlayer || !loadResult.hasResources) {
        const error = {
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'save-system',
          issue: 'Game state not restored after reload',
          loadResult,
          timestamp: Date.now()
        };

        errors.push(error);
        this.errorDetector.captureFunctionalError(error);
        console.log('[ErrorDetectionRunner] ❌ Load system error detected');
      } else {
        console.log('[ErrorDetectionRunner] ✅ Load functionality working');
      }

    } catch (error) {
      console.error('[ErrorDetectionRunner] Error during save/load test:', error);
      const testError = {
        type: 'test-error',
        severity: 'HIGH',
        message: error.message,
        timestamp: Date.now()
      };
      errors.push(testError);
      this.errorDetector.captureFunctionalError(testError);
    }

    return errors;
  }

  async testUIValidation(page) {
    console.log('[ErrorDetectionRunner] Testing UI validation...');
    const errors = [];

    try {
      // Test for missing critical elements
      const criticalElements = [
        '#game-interface',
        '#character-creation'
      ];

      for (const selector of criticalElements) {
        const element = page.locator(selector);
        const isVisible = await element.isVisible().catch(() => false);

        if (!isVisible) {
          const error = {
            type: 'ui-validation-error',
            severity: 'HIGH',
            issue: `Critical element not visible: ${selector}`,
            selector,
            timestamp: Date.now()
          };

          errors.push(error);
          this.errorDetector.captureFunctionalError(error);
          console.log(`[ErrorDetectionRunner] ❌ UI Error: ${selector} not visible`);
        }
      }

      // Test for JavaScript errors in console
      const consoleErrors = await page.evaluate(() => {
        return window.__capturedErrors || [];
      });

      if (consoleErrors.length > 0) {
        console.log(`[ErrorDetectionRunner] Found ${consoleErrors.length} console errors`);
        consoleErrors.forEach(error => {
          this.errorDetector.captureFunctionalError(error);
        });
      }

    } catch (error) {
      console.error('[ErrorDetectionRunner] Error during UI validation:', error);
      const testError = {
        type: 'test-error',
        severity: 'MEDIUM',
        message: error.message,
        timestamp: Date.now()
      };
      errors.push(testError);
    }

    return errors;
  }

  async waitForErrorDetection(timeout = 5000) {
    console.log(`[ErrorDetectionRunner] Waiting ${timeout}ms for async error detection...`);
    await new Promise(resolve => setTimeout(resolve, timeout));
  }

  async generateAndSaveReports(results, outputDir = './test-results') {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      await fs.mkdir(outputDir, { recursive: true });

      // Save JSON reports
      await fs.writeFile(
        path.join(outputDir, 'error-detection-summary.json'),
        JSON.stringify(results.summary, null, 2)
      );

      await fs.writeFile(
        path.join(outputDir, 'error-detection-detailed.json'),
        JSON.stringify(results.detailed, null, 2)
      );

      await fs.writeFile(
        path.join(outputDir, 'error-detection-technical.json'),
        JSON.stringify(results.technical, null, 2)
      );

      // Save HTML report
      const htmlReport = this.errorReporter.formatAsHTML(results.detailed);
      await fs.writeFile(
        path.join(outputDir, 'error-detection-report.html'),
        htmlReport
      );

      console.log(`[ErrorDetectionRunner] Reports saved to ${outputDir}`);

    } catch (error) {
      console.error('[ErrorDetectionRunner] Error saving reports:', error);
    }
  }
}

// Export convenience function for use in tests
export async function runErrorDetection(page) {
  const runner = new ErrorDetectionRunner();
  return await runner.runErrorDetection(page);
}

// Example usage and main function
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = require('playwright');

  async function main() {
    console.log('Starting error detection demo...');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const runner = new ErrorDetectionRunner();
      const results = await runner.runErrorDetection(page);

      console.log('\n=== ERROR DETECTION RESULTS ===');
      console.log(`Total errors found: ${results.detailed.summary.total}`);
      console.log(`Critical errors: ${results.detailed.summary.bySeverity.CRITICAL}`);
      console.log(`High severity errors: ${results.detailed.summary.bySeverity.HIGH}`);
      console.log(`Functional errors: ${results.functionalErrors.length}`);
      console.log(`UI errors: ${results.uiErrors.length}`);
      console.log(`State validation errors: ${results.stateErrors.length}`);
      console.log(`Character creation errors (legacy): ${results.characterCreationErrors.length}`);

      if (results.detailed.recommendations.length > 0) {
        console.log('\nRecommendations:');
        results.detailed.recommendations.forEach(rec => {
          console.log(`- [${rec.priority}] ${rec.action}`);
        });
      }

      // Save reports
      await runner.generateAndSaveReports(results);

      console.log('\n✅ Error detection completed successfully');
      console.log('📊 Check test-results/ directory for detailed reports');

    } catch (error) {
      console.error('Error running detection:', error);
    } finally {
      await browser.close();
    }
  }

  main().catch(console.error);
}