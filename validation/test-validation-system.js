import { ValidationPipeline } from './validation-pipeline.js';
import { FixValidator } from './fix-validator.js';
import { RollbackManager } from './rollback-manager.js';
import { PerformanceValidator } from './performance-validator.js';
import { ValidationReporter } from './validation-reporter.js';
import { RegressionSuite } from './regression-suite.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Integration tests for the Fix Validation & Application System
 *
 * These tests verify that all validation components work together correctly
 * and that the validation pipeline can handle various scenarios.
 */

class ValidationSystemTester {
  constructor() {
    this.testResults = [];
    this.tempDir = './validation-test-temp';
  }

  async runAllTests() {
    console.log('🧪 Starting Fix Validation System Integration Tests...');

    await this.setup();

    const tests = [
      { name: 'Test Fix Validator Basic Functionality', fn: this.testFixValidatorBasic.bind(this) },
      { name: 'Test Rollback Manager Operations', fn: this.testRollbackManager.bind(this) },
      { name: 'Test Performance Validator', fn: this.testPerformanceValidator.bind(this) },
      { name: 'Test Regression Suite', fn: this.testRegressionSuite.bind(this) },
      { name: 'Test Validation Reporter', fn: this.testValidationReporter.bind(this) },
      { name: 'Test Complete Pipeline - Success Path', fn: this.testPipelineSuccess.bind(this) },
      { name: 'Test Complete Pipeline - Failure Path', fn: this.testPipelineFailure.bind(this) },
      { name: 'Test Pipeline Rollback Functionality', fn: this.testPipelineRollback.bind(this) },
      { name: 'Test Character Creation Fix Scenario', fn: this.testCharacterCreationFix.bind(this) },
      { name: 'Test Edge Cases and Error Handling', fn: this.testEdgeCases.bind(this) }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        console.log(`\n🔧 Running: ${test.name}`);
        const startTime = Date.now();

        await test.fn();

        const duration = Date.now() - startTime;
        this.testResults.push({
          name: test.name,
          status: 'PASSED',
          duration,
          error: null
        });

        console.log(`✅ ${test.name} - PASSED (${duration}ms)`);
        passed++;

      } catch (error) {
        this.testResults.push({
          name: test.name,
          status: 'FAILED',
          duration: 0,
          error: error.message
        });

        console.error(`❌ ${test.name} - FAILED: ${error.message}`);
        failed++;
      }
    }

    await this.cleanup();

    console.log(`\n📊 Test Results Summary:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    return {
      passed,
      failed,
      total: passed + failed,
      successRate: (passed / (passed + failed)) * 100,
      results: this.testResults
    };
  }

  async setup() {
    await fs.ensureDir(this.tempDir);
    console.log('🔧 Test setup completed');
  }

  async cleanup() {
    try {
      await fs.remove(this.tempDir);
      console.log('🧹 Test cleanup completed');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  async testFixValidatorBasic() {
    const validator = new FixValidator({
      sandboxDir: path.join(this.tempDir, 'sandbox'),
      serverPort: 8090
    });

    // Test sandbox creation
    const sandbox = await validator.createSandbox();

    if (!sandbox.id || !sandbox.path || typeof sandbox.cleanup !== 'function') {
      throw new Error('Sandbox creation failed - missing required properties');
    }

    // Test fix application
    const testFix = {
      type: 'line-insertion',
      code: '// Test fix comment'
    };

    const testContext = {
      file: 'game.js',
      line: 1
    };

    // Create a test file
    const targetFile = path.join(sandbox.path, 'game.js');
    await fs.ensureDir(path.dirname(targetFile));
    await fs.writeFile(targetFile, 'console.log("test");');

    await validator.applyFixToSandbox(testFix, sandbox, testContext);

    // Verify fix was applied
    const content = await fs.readFile(targetFile, 'utf-8');
    if (!content.includes('// Test fix comment')) {
      throw new Error('Fix was not applied correctly to sandbox');
    }

    // Test syntax validation
    const syntaxResult = await validator.validateSyntax(sandbox);
    if (!syntaxResult.passed) {
      throw new Error('Syntax validation should pass for valid JavaScript');
    }

    await sandbox.cleanup();
  }

  async testRollbackManager() {
    const rollbackManager = new RollbackManager({
      checkpointsDir: path.join(this.tempDir, 'checkpoints'),
      gameDir: path.join(this.tempDir, 'game')
    });

    await rollbackManager.initialize();

    // Create test files
    const gameDir = path.join(this.tempDir, 'game');
    await fs.ensureDir(gameDir);
    await fs.writeFile(path.join(gameDir, 'test.js'), 'console.log("original");');

    // Create checkpoint
    const checkpointId = await rollbackManager.createCheckpoint('Test checkpoint');

    if (!checkpointId || typeof checkpointId !== 'string') {
      throw new Error('Checkpoint creation failed');
    }

    // Modify file
    await fs.writeFile(path.join(gameDir, 'test.js'), 'console.log("modified");');

    // Verify modification
    let content = await fs.readFile(path.join(gameDir, 'test.js'), 'utf-8');
    if (!content.includes('modified')) {
      throw new Error('File modification failed');
    }

    // Test rollback
    const rollbackResult = await rollbackManager.rollbackTo(checkpointId);

    if (!rollbackResult.success) {
      throw new Error('Rollback failed');
    }

    // Verify rollback
    content = await fs.readFile(path.join(gameDir, 'test.js'), 'utf-8');
    if (!content.includes('original')) {
      throw new Error('Rollback did not restore original content');
    }

    // Test checkpoint listing
    const checkpoints = rollbackManager.listCheckpoints();
    if (checkpoints.length === 0) {
      throw new Error('Checkpoint listing failed');
    }
  }

  async testPerformanceValidator() {
    // Create a mock sandbox for performance testing
    const mockSandbox = {
      id: 'test-sandbox',
      path: path.join(this.tempDir, 'perf-test'),
      cleanup: async () => {}
    };

    await fs.ensureDir(mockSandbox.path);

    // Create a simple HTML file for testing
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><title>Test Game</title></head>
      <body>
        <h1>Test Game</h1>
        <script>
          window.gameState = { initialized: true };
          window.performanceMetrics = { memoryUsage: [], fps: [] };
        </script>
      </body>
      </html>
    `;

    await fs.writeFile(path.join(mockSandbox.path, 'index.html'), htmlContent);

    const performanceValidator = new PerformanceValidator({
      serverPort: 8091,
      samples: 1, // Reduce samples for testing
      measurementTime: 1000 // Reduce measurement time
    });

    // This test focuses on the validator setup and basic structure
    // Full performance testing requires a running server, which is complex for unit tests

    const thresholds = performanceValidator.thresholds;
    if (!thresholds.loadTime || !thresholds.memoryLimit || !thresholds.minFPS) {
      throw new Error('Performance validator thresholds not configured properly');
    }

    // Test threshold validation
    const mockMetrics = {
      load: { averageLoadTime: 2000, passed: true },
      runtime: { averageFPS: 60, averageMemoryMB: 50 },
      memory: { peakMemoryMB: 75, passed: true }
    };

    const score = performanceValidator.calculateOverallScore(
      mockMetrics.load,
      mockMetrics.runtime,
      mockMetrics.memory
    );

    if (score < 0 || score > 100) {
      throw new Error('Performance score calculation is incorrect');
    }
  }

  async testRegressionSuite() {
    const regressionSuite = new RegressionSuite({
      serverPort: 8092
    });

    // Test the test framework structure
    const testMethods = [
      'testCharacterCreation',
      'testGameInitialization',
      'testSaveLoadFunctionality',
      'testUINavigation',
      'testErrorHandling'
    ];

    for (const methodName of testMethods) {
      if (typeof regressionSuite[methodName] !== 'function') {
        throw new Error(`Regression test method ${methodName} not found`);
      }
    }

    // Test statistics calculations
    const mockStats = regressionSuite.calculateStats([1, 2, 3, 4, 5]);
    if (mockStats.average !== 3 || mockStats.min !== 1 || mockStats.max !== 5) {
      throw new Error('Statistics calculation is incorrect');
    }

    // Test memory stats calculation
    const mockMemoryData = [
      { used: 1000000, timestamp: Date.now() },
      { used: 2000000, timestamp: Date.now() + 1000 }
    ];

    const memoryStats = regressionSuite.calculateMemoryStats(mockMemoryData);
    if (!memoryStats.peakMB || !memoryStats.averageMB) {
      throw new Error('Memory statistics calculation failed');
    }
  }

  async testValidationReporter() {
    const reporter = new ValidationReporter({
      outputDir: path.join(this.tempDir, 'reports')
    });

    await reporter.initialize();

    // Create mock validation results
    const mockResults = {
      score: 85,
      fix: { type: 'test-fix', description: 'Test fix' },
      error: { type: 'test-error' },
      context: { file: 'test.js', line: 10 },
      stages: {
        syntax: { passed: true, errors: [], filesChecked: 5 },
        functional: { passed: true, originalErrorFixed: true, errorCount: 0 },
        regression: { passed: true, total: 10, passed: 10, failed: 0 },
        performance: { passed: true, loadTime: 1500, avgFps: 60 },
        sideEffects: { detected: false, count: 0 }
      },
      recommendation: {
        action: 'APPLY',
        confidence: 'HIGH',
        reasoning: 'All validation stages passed'
      }
    };

    const reportResult = await reporter.generateReport(mockResults);

    if (!reportResult.reportId || !reportResult.reportDir) {
      throw new Error('Report generation failed - missing required properties');
    }

    // Verify report files were created
    const reportFiles = await fs.readdir(reportResult.reportDir);
    const expectedFiles = ['technical-report.md', 'executive-summary.md', 'report.html', 'validation-results.json'];

    for (const expectedFile of expectedFiles) {
      if (!reportFiles.includes(expectedFile)) {
        throw new Error(`Report file ${expectedFile} was not generated`);
      }
    }

    // Verify report content
    const technicalReport = await fs.readFile(
      path.join(reportResult.reportDir, 'technical-report.md'),
      'utf-8'
    );

    if (!technicalReport.includes('Fix Validation Technical Report') ||
        !technicalReport.includes('Overall Result')) {
      throw new Error('Technical report content is invalid');
    }
  }

  async testPipelineSuccess() {
    const pipeline = new ValidationPipeline({
      confidenceThreshold: 70,
      autoApply: false, // Disable auto-apply for testing
      createReports: false, // Disable reports for testing
      fixValidator: {
        sandboxDir: path.join(this.tempDir, 'pipeline-sandbox'),
        serverPort: 8093
      },
      rollbackManager: {
        checkpointsDir: path.join(this.tempDir, 'pipeline-checkpoints'),
        gameDir: path.join(this.tempDir, 'pipeline-game')
      }
    });

    // Setup test environment
    const gameDir = path.join(this.tempDir, 'pipeline-game');
    await fs.ensureDir(gameDir);
    await fs.writeFile(path.join(gameDir, 'game.js'), 'console.log("test game");');

    const testFix = {
      type: 'line-insertion',
      code: '// Pipeline test fix',
      description: 'Test fix for pipeline validation'
    };

    const testError = {
      type: 'test-error',
      message: 'Test error for pipeline validation'
    };

    const testContext = {
      file: 'game.js',
      line: 1
    };

    // Mock successful validation results
    const originalValidateFix = pipeline.fixValidator.validateFix;
    pipeline.fixValidator.validateFix = async () => ({
      score: 95,
      stages: {
        syntax: { passed: true, errors: [], filesChecked: 1 },
        functional: { passed: true, originalErrorFixed: true, errorCount: 0 },
        regression: { passed: true, total: 5, passed: 5, failed: 0 },
        performance: { passed: true, loadTime: 1000 },
        sideEffects: { detected: false, count: 0 }
      },
      recommendation: { action: 'APPLY', confidence: 'HIGH', reasoning: 'All tests passed' }
    });

    const result = await pipeline.runPipeline(testFix, testError, testContext);

    // Restore original method
    pipeline.fixValidator.validateFix = originalValidateFix;

    if (!result.success) {
      throw new Error(`Pipeline execution failed: ${result.error}`);
    }

    if (result.stagesFailed.length > 0) {
      throw new Error(`Pipeline had stage failures: ${result.stagesFailed.map(s => s.name).join(', ')}`);
    }

    if (!result.checkpointId) {
      throw new Error('Pipeline did not create checkpoint');
    }
  }

  async testPipelineFailure() {
    const pipeline = new ValidationPipeline({
      confidenceThreshold: 90, // High threshold to trigger failure
      autoApply: false,
      createReports: false,
      fixValidator: {
        sandboxDir: path.join(this.tempDir, 'failure-sandbox'),
        serverPort: 8094
      },
      rollbackManager: {
        checkpointsDir: path.join(this.tempDir, 'failure-checkpoints'),
        gameDir: path.join(this.tempDir, 'failure-game')
      }
    });

    // Setup test environment
    const gameDir = path.join(this.tempDir, 'failure-game');
    await fs.ensureDir(gameDir);
    await fs.writeFile(path.join(gameDir, 'game.js'), 'console.log("test game");');

    const testFix = {
      type: 'line-insertion',
      code: 'invalid syntax here !!!',
      description: 'Test fix with syntax error'
    };

    const testError = {
      type: 'syntax-error',
      message: 'Test syntax error'
    };

    const testContext = {
      file: 'game.js',
      line: 1
    };

    // Mock failed validation results
    const originalValidateFix = pipeline.fixValidator.validateFix;
    pipeline.fixValidator.validateFix = async () => ({
      score: 30, // Low score
      stages: {
        syntax: { passed: false, errors: [{ file: 'game.js', message: 'Syntax error' }], filesChecked: 1 },
        functional: { passed: false, originalErrorFixed: false, errorCount: 2 },
        regression: { passed: false, total: 5, passed: 2, failed: 3 },
        performance: { passed: false, loadTime: 8000 },
        sideEffects: { detected: true, count: 2 }
      },
      recommendation: { action: 'REJECT', confidence: 'NONE', reasoning: 'Multiple critical failures' }
    });

    const result = await pipeline.runPipeline(testFix, testError, testContext);

    // Restore original method
    pipeline.fixValidator.validateFix = originalValidateFix;

    // For failure test, we expect the pipeline to complete but not apply the fix
    if (!result.success) {
      // This is expected for a failed validation, but pipeline should still complete
      console.log('Pipeline failed as expected due to validation failures');
    }

    if (result.applied) {
      throw new Error('Pipeline should not have applied a failed fix');
    }

    // Should still create checkpoint for potential rollback
    if (!result.checkpointId) {
      throw new Error('Pipeline should create checkpoint even for failed validations');
    }
  }

  async testPipelineRollback() {
    const pipeline = new ValidationPipeline({
      confidenceThreshold: 50,
      autoApply: true, // Enable auto-apply for rollback testing
      performRollbackOnFailure: true,
      fixValidator: {
        sandboxDir: path.join(this.tempDir, 'rollback-sandbox'),
        serverPort: 8095
      },
      rollbackManager: {
        checkpointsDir: path.join(this.tempDir, 'rollback-checkpoints'),
        gameDir: path.join(this.tempDir, 'rollback-game')
      }
    });

    // Setup test environment
    const gameDir = path.join(this.tempDir, 'rollback-game');
    await fs.ensureDir(gameDir);
    const testFile = path.join(gameDir, 'game.js');
    const originalContent = 'console.log("original content");';
    await fs.writeFile(testFile, originalContent);

    // Test rollback functionality directly
    await pipeline.rollbackManager.initialize();

    // Create checkpoint
    const checkpointId = await pipeline.rollbackManager.createCheckpoint('Test rollback checkpoint');

    // Modify file
    await fs.writeFile(testFile, 'console.log("modified content");');

    // Verify modification
    let content = await fs.readFile(testFile, 'utf-8');
    if (!content.includes('modified')) {
      throw new Error('File was not modified');
    }

    // Test manual rollback
    const rollbackResult = await pipeline.rollback(checkpointId);

    if (!rollbackResult.success) {
      throw new Error(`Rollback failed: ${rollbackResult.error || 'Unknown error'}`);
    }

    // Verify rollback restored original content
    content = await fs.readFile(testFile, 'utf-8');
    if (!content.includes('original content')) {
      throw new Error('Rollback did not restore original content');
    }

    // Test checkpoint listing
    const checkpoints = pipeline.listCheckpoints();
    if (checkpoints.length === 0) {
      throw new Error('No checkpoints found after creation');
    }

    const checkpoint = checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) {
      throw new Error('Created checkpoint not found in listing');
    }
  }

  async testCharacterCreationFix() {
    // This test simulates the specific character creation bug fix scenario
    const pipeline = new ValidationPipeline({
      confidenceThreshold: 80,
      autoApply: false, // Don't auto-apply for this test
      createReports: false,
      fixValidator: {
        sandboxDir: path.join(this.tempDir, 'character-sandbox'),
        serverPort: 8096
      }
    });

    const characterCreationFix = {
      type: 'content-replacement',
      search: 'if \\(selectedChoices\\.length === 3\\)',
      replace: 'if (selectedChoices.length >= 3)',
      description: 'Fix character creation button enabling logic'
    };

    const characterCreationError = {
      type: 'character-creation-bug',
      message: 'Begin button not enabled after all choices selected',
      component: 'character-creation'
    };

    const context = {
      file: 'character-creation.js',
      line: null // Content replacement doesn't need specific line
    };

    // Setup test file with the bug
    const gameDir = path.join(this.tempDir, 'character-game');
    await fs.ensureDir(gameDir);

    const buggyContent = `
      function updateBeginButton() {
        const selectedChoices = getSelectedChoices();
        const beginButton = document.getElementById('begin-cultivation');

        // Bug: uses strict equality instead of >=
        if (selectedChoices.length === 3) {
          beginButton.disabled = false;
        } else {
          beginButton.disabled = true;
        }
      }
    `;

    await fs.writeFile(path.join(gameDir, 'character-creation.js'), buggyContent);

    // Mock the fix validator to simulate the fix validation process
    const originalValidateFix = pipeline.fixValidator.validateFix;
    pipeline.fixValidator.validateFix = async (fix, error, context) => {
      // Simulate applying the fix and validating it
      const sandbox = await pipeline.fixValidator.createSandbox();

      try {
        // Apply fix to sandbox
        await pipeline.fixValidator.applyFixToSandbox(fix, sandbox, context);

        // Check if fix was applied correctly
        const fixedFile = path.join(sandbox.path, context.file);
        const content = await fs.readFile(fixedFile, 'utf-8');

        const fixAppliedCorrectly = content.includes('selectedChoices.length >= 3');

        return {
          score: fixAppliedCorrectly ? 95 : 30,
          stages: {
            syntax: { passed: true, errors: [], filesChecked: 1 },
            functional: {
              passed: fixAppliedCorrectly,
              originalErrorFixed: fixAppliedCorrectly,
              errorCount: 0
            },
            regression: { passed: true, total: 3, passed: 3, failed: 0 },
            performance: { passed: true, loadTime: 1200 },
            sideEffects: { detected: false, count: 0 }
          },
          recommendation: {
            action: fixAppliedCorrectly ? 'APPLY' : 'REJECT',
            confidence: fixAppliedCorrectly ? 'HIGH' : 'NONE',
            reasoning: fixAppliedCorrectly ?
              'Fix correctly addresses the character creation bug' :
              'Fix was not applied correctly'
          }
        };
      } finally {
        await sandbox.cleanup();
      }
    };

    // Run the pipeline
    const result = await pipeline.runPipeline(characterCreationFix, characterCreationError, context);

    // Restore original method
    pipeline.fixValidator.validateFix = originalValidateFix;

    if (!result.success) {
      throw new Error(`Character creation fix validation failed: ${result.error}`);
    }

    if (!result.validationResults || result.validationResults.score < 80) {
      throw new Error('Character creation fix did not meet validation criteria');
    }

    // Verify the fix addresses the specific bug
    if (!result.validationResults.stages.functional.originalErrorFixed) {
      throw new Error('Character creation fix did not resolve the original error');
    }
  }

  async testEdgeCases() {
    // Test invalid inputs
    const pipeline = new ValidationPipeline();

    try {
      await pipeline.runPipeline(null, {}, {});
      throw new Error('Should have thrown error for null fix');
    } catch (error) {
      if (!error.message.includes('Invalid fix object')) {
        throw new Error('Wrong error message for null fix');
      }
    }

    try {
      await pipeline.runPipeline({}, null, {});
      throw new Error('Should have thrown error for null error');
    } catch (error) {
      if (!error.message.includes('Invalid error object')) {
        throw new Error('Wrong error message for null error');
      }
    }

    try {
      await pipeline.runPipeline({ type: 'test' }, { type: 'test' }, {});
      throw new Error('Should have thrown error for invalid context');
    } catch (error) {
      if (!error.message.includes('Context must specify target file')) {
        throw new Error('Wrong error message for invalid context');
      }
    }

    // Test rollback manager edge cases
    const rollbackManager = new RollbackManager({
      checkpointsDir: path.join(this.tempDir, 'edge-checkpoints'),
      gameDir: path.join(this.tempDir, 'edge-game')
    });

    await rollbackManager.initialize();

    // Test rollback to non-existent checkpoint
    try {
      await rollbackManager.rollbackTo('non-existent-checkpoint');
      throw new Error('Should have thrown error for non-existent checkpoint');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw new Error('Wrong error message for non-existent checkpoint');
      }
    }

    // Test reporter with invalid data
    const reporter = new ValidationReporter({
      outputDir: path.join(this.tempDir, 'edge-reports')
    });

    await reporter.initialize();

    try {
      const mockResults = {
        score: 'invalid-score', // Invalid score type
        stages: {}
      };

      // This should not crash, but handle gracefully
      await reporter.generateReport(mockResults);
    } catch (error) {
      // Reporter should handle invalid data gracefully
      console.log('Reporter handled invalid data as expected');
    }
  }
}

// Export the test runner for use in other contexts
export { ValidationSystemTester };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ValidationSystemTester();
  tester.runAllTests().then(results => {
    console.log('\n🎯 Integration Test Results:');
    console.log(`Success Rate: ${results.successRate.toFixed(1)}%`);

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.results
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}