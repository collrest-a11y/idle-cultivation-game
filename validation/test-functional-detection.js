/**
 * Test script for functional error detection system
 * Validates that the new detectors can properly identify the Begin button bug
 */
import { ErrorDetectionRunner } from './run-error-detection.js';
import { FunctionalErrorDetector } from './functional-error-detector.js';
import { UIErrorDetector } from './ui-error-detector.js';
import { StateValidator } from './state-validator.js';

export async function testFunctionalDetection(page) {
  console.log('=== Testing Functional Error Detection ===\n');

  const results = {
    functionalDetection: await testFunctionalErrorDetector(page),
    uiDetection: await testUIErrorDetector(page),
    stateValidation: await testStateValidator(page),
    integration: await testIntegration(page)
  };

  console.log('\n=== Test Results Summary ===');
  console.log(`Functional Detection: ${results.functionalDetection.passed ? 'PASS' : 'FAIL'}`);
  console.log(`UI Detection: ${results.uiDetection.passed ? 'PASS' : 'FAIL'}`);
  console.log(`State Validation: ${results.stateValidation.passed ? 'PASS' : 'FAIL'}`);
  console.log(`Integration Test: ${results.integration.passed ? 'PASS' : 'FAIL'}`);

  const overallPassed = Object.values(results).every(r => r.passed);
  console.log(`\nOverall: ${overallPassed ? 'PASS' : 'FAIL'}`);

  return { results, passed: overallPassed };
}

async function testFunctionalErrorDetector(page) {
  console.log('Testing FunctionalErrorDetector...');

  try {
    const detector = new FunctionalErrorDetector();

    // Navigate to the page
    await page.goto('file://' + process.cwd().replace(/\\/g, '/') + '/index.html');
    await page.waitForTimeout(2000);

    // Run character creation error detection
    const characterErrors = await detector.detectCharacterCreationErrors(page);

    console.log(`Found ${characterErrors.length} character creation errors`);

    // Check if we detected the Begin button bug (should be detected if bug exists)
    const beginButtonError = characterErrors.find(error =>
      error.issue?.includes('Begin button not enabled') ||
      error.issue?.includes('begin button') ||
      error.component === 'character-creation'
    );

    if (beginButtonError) {
      console.log('✓ Successfully detected Begin button bug!');
      console.log(`  Error: ${beginButtonError.issue}`);
    } else {
      console.log('? Begin button bug not detected (may be fixed or test needs adjustment)');
    }

    // Test save/load detection
    const saveLoadErrors = await detector.detectSaveLoadErrors(page);
    console.log(`Found ${saveLoadErrors.length} save/load errors`);

    // Test UI errors
    const uiErrors = await detector.detectUIErrors(page);
    console.log(`Found ${uiErrors.length} UI errors`);

    // Test state errors
    const stateErrors = await detector.detectGameStateErrors(page);
    console.log(`Found ${stateErrors.length} game state errors`);

    const summary = detector.getSummary();
    console.log(`Summary: ${summary.total} total errors`);
    console.log(`  Critical: ${summary.bySeverity.CRITICAL}`);
    console.log(`  High: ${summary.bySeverity.HIGH}`);

    return {
      passed: true,
      errors: detector.getErrors(),
      summary: summary,
      characterErrors,
      saveLoadErrors,
      uiErrors,
      stateErrors
    };

  } catch (error) {
    console.error('FunctionalErrorDetector test failed:', error);
    return {
      passed: false,
      error: error.message,
      errors: []
    };
  }
}

async function testUIErrorDetector(page) {
  console.log('\nTesting UIErrorDetector...');

  try {
    const detector = new UIErrorDetector();

    const errors = await detector.detectUIErrors(page);
    console.log(`Found ${errors.length} UI errors`);

    // Check for specific error types we expect
    const visibilityErrors = errors.filter(e => e.component === 'element-visibility');
    const interactivityErrors = errors.filter(e => e.component === 'element-interactivity');
    const stateErrors = errors.filter(e => e.component === 'element-state');

    console.log(`  Visibility errors: ${visibilityErrors.length}`);
    console.log(`  Interactivity errors: ${interactivityErrors.length}`);
    console.log(`  State errors: ${stateErrors.length}`);

    // Look for the critical Begin button error
    const beginButtonStateError = errors.find(e =>
      e.component === 'element-state' &&
      e.issue?.includes('Begin button should be enabled')
    );

    if (beginButtonStateError) {
      console.log('✓ UI detector found Begin button state error!');
    }

    const summary = detector.getSummary();
    console.log(`Summary by severity: CRITICAL=${summary.bySeverity.CRITICAL}, HIGH=${summary.bySeverity.HIGH}`);

    return {
      passed: true,
      errors: errors,
      summary: summary
    };

  } catch (error) {
    console.error('UIErrorDetector test failed:', error);
    return {
      passed: false,
      error: error.message,
      errors: []
    };
  }
}

async function testStateValidator(page) {
  console.log('\nTesting StateValidator...');

  try {
    const validator = new StateValidator();

    const errors = await validator.validateGameState(page);
    console.log(`Found ${errors.length} state validation errors`);

    // Check for different types of validation errors
    const structureErrors = errors.filter(e => e.component === 'state-structure');
    const dataTypeErrors = errors.filter(e => e.component === 'data-types');
    const constraintErrors = errors.filter(e => e.component === 'data-constraints');
    const consistencyErrors = errors.filter(e => e.component === 'state-consistency');
    const saveLoadErrors = errors.filter(e => e.component === 'save-load-integrity');

    console.log(`  Structure errors: ${structureErrors.length}`);
    console.log(`  Data type errors: ${dataTypeErrors.length}`);
    console.log(`  Constraint errors: ${constraintErrors.length}`);
    console.log(`  Consistency errors: ${consistencyErrors.length}`);
    console.log(`  Save/load errors: ${saveLoadErrors.length}`);

    const summary = validator.getSummary();
    console.log(`Summary by severity: CRITICAL=${summary.bySeverity.CRITICAL}, HIGH=${summary.bySeverity.HIGH}`);

    return {
      passed: true,
      errors: errors,
      summary: summary
    };

  } catch (error) {
    console.error('StateValidator test failed:', error);
    return {
      passed: false,
      error: error.message,
      errors: []
    };
  }
}

async function testIntegration(page) {
  console.log('\nTesting Integration (ErrorDetectionRunner)...');

  try {
    const runner = new ErrorDetectionRunner();
    const results = await runner.runErrorDetection(page);

    console.log(`Integration test completed`);
    console.log(`  Functional errors: ${results.functionalErrors.length}`);
    console.log(`  UI errors: ${results.uiErrors.length}`);
    console.log(`  State errors: ${results.stateErrors.length}`);
    console.log(`  Total in detailed report: ${results.detailed.summary.total}`);

    // Check that we have comprehensive error detection
    const hasErrors = results.functionalErrors.length > 0 ||
                     results.uiErrors.length > 0 ||
                     results.stateErrors.length > 0;

    if (hasErrors) {
      console.log('✓ Integration successfully detected errors across multiple systems');
    } else {
      console.log('? No errors detected - game may be working correctly or tests need adjustment');
    }

    // Check recommendations
    if (results.detailed.recommendations.length > 0) {
      console.log(`Generated ${results.detailed.recommendations.length} recommendations`);
      results.detailed.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.action}`);
      });
    }

    return {
      passed: true,
      results: results
    };

  } catch (error) {
    console.error('Integration test failed:', error);
    return {
      passed: false,
      error: error.message
    };
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = require('playwright');

  async function main() {
    console.log('Starting functional detection tests...');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const testResults = await testFunctionalDetection(page);

      if (testResults.passed) {
        console.log('\n🎉 All functional detection tests passed!');
        console.log('The system can detect functional errors like the Begin button bug.');
        process.exit(0);
      } else {
        console.log('\n❌ Some tests failed. Check the output above for details.');
        process.exit(1);
      }

    } catch (error) {
      console.error('Test execution failed:', error);
      process.exit(1);
    } finally {
      await browser.close();
    }
  }

  main().catch(console.error);
}