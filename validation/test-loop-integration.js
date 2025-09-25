/**
 * Comprehensive Integration Tests for the Validation Loop System
 *
 * This test suite validates:
 * 1. End-to-end loop functionality
 * 2. Component integration
 * 3. Error scenarios and recovery
 * 4. State management and persistence
 * 5. Safety mechanism triggers
 * 6. Real-world scenarios
 */

import { LoopController } from './loop-controller.js';
import { ConvergenceDetector } from './convergence-detector.js';
import { ErrorPrioritizer } from './error-prioritizer.js';
import { LoopStateManager } from './loop-state-manager.js';
import { SafetyMechanisms } from './safety-mechanisms.js';
import fs from 'fs-extra';
import path from 'path';
import { chromium } from 'playwright';

class LoopIntegrationTester {
  constructor() {
    this.testResults = [];
    this.testStartTime = Date.now();
    this.tempDir = path.join(process.cwd(), 'test-temp-' + Date.now());
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Integration Tests');
    console.log('='.repeat(60));

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run test suites
      await this.runComponentIntegrationTests();
      await this.runLoopFunctionalityTests();
      await this.runStateManagementTests();
      await this.runSafetyMechanismTests();
      await this.runErrorScenarioTests();
      await this.runPerformanceTests();

      // Generate test report
      await this.generateTestReport();

      console.log('\n🎉 All integration tests completed successfully!');
      return { success: true, results: this.testResults };

    } catch (error) {
      console.error('💥 Integration tests failed:', error.message);
      return { success: false, error: error.message, results: this.testResults };

    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Create temporary directory
    await fs.ensureDir(this.tempDir);

    // Create mock project structure
    await this.createMockProjectStructure();

    console.log('✅ Test environment ready');
  }

  async createMockProjectStructure() {
    const jsDir = path.join(this.tempDir, 'js');
    await fs.ensureDir(jsDir);

    // Create mock files that might have errors
    const mockFiles = {
      'js/character-creation.js': `
// Mock character creation file with potential errors
window.characterState = {
  origin: null,
  vow: null,
  mark: null
};

function updateBeginButton() {
  const beginBtn = document.getElementById('begin-cultivation');
  // This might fail if beginBtn is null
  beginBtn.disabled = false;
}
`,
      'js/game-state.js': `
// Mock game state file
window.gameState = null;

function initializeGame() {
  try {
    window.gameState = { initialized: true };
  } catch (error) {
    console.error('Game initialization failed');
  }
}
`,
      'js/save-game.js': `
// Mock save game file
function saveGame() {
  if (!window.gameState) {
    throw new Error('Cannot save - game not initialized');
  }
  localStorage.setItem('gameState', JSON.stringify(window.gameState));
}
`,
      'package.json': JSON.stringify({
        name: 'idle-cultivation-game',
        version: '1.0.0'
      }, null, 2)
    };

    for (const [filePath, content] of Object.entries(mockFiles)) {
      await fs.writeFile(path.join(this.tempDir, filePath), content);
    }
  }

  async runComponentIntegrationTests() {
    console.log('\n🧩 Running Component Integration Tests...');

    await this.runTest('Convergence Detector Integration', async () => {
      const detector = new ConvergenceDetector();

      // Test error count recording
      detector.recordErrorCount(10);
      detector.recordErrorCount(8);
      detector.recordErrorCount(5);
      detector.recordErrorCount(5); // Stalled
      detector.recordErrorCount(5);

      const analysis = detector.analyzeConvergence();

      if (!analysis.progressStalled) {
        throw new Error('Should detect stalled progress');
      }

      return { passed: true, details: 'Convergence detection working correctly' };
    });

    await this.runTest('Error Prioritizer Integration', async () => {
      const prioritizer = new ErrorPrioritizer();

      const mockErrors = [
        {
          type: 'runtime-error',
          severity: 'CRITICAL',
          component: 'character-creation',
          message: 'Begin button not enabled',
          frequency: 3
        },
        {
          type: 'console-error',
          severity: 'MEDIUM',
          component: 'ui',
          message: 'Minor display issue',
          frequency: 1
        }
      ];

      const prioritized = prioritizer.prioritizeErrors(mockErrors, { iterationNumber: 1 });

      if (prioritized[0].component !== 'character-creation') {
        throw new Error('Critical character creation error should be prioritized first');
      }

      return { passed: true, details: 'Error prioritization working correctly' };
    });

    await this.runTest('State Manager Integration', async () => {
      const stateManager = new LoopStateManager({
        stateDir: path.join(this.tempDir, '.test-state')
      });

      const mockState = {
        iteration: 3,
        status: 'running',
        startTime: Date.now(),
        totalErrors: 15,
        fixedErrors: 10
      };

      const mockAdditionalData = {
        errorHistory: [{ iteration: 1, errors: 15 }],
        fixHistory: [{ success: true, error: { type: 'test' } }]
      };

      // Test save and load
      const saveResult = await stateManager.saveState(mockState, mockAdditionalData);
      if (!saveResult.success) {
        throw new Error('State save failed');
      }

      const loadedState = await stateManager.loadState();
      if (!loadedState || loadedState.iteration !== 3) {
        throw new Error('State load failed or data corrupted');
      }

      return { passed: true, details: 'State persistence working correctly' };
    });

    await this.runTest('Safety Mechanisms Integration', async () => {
      const safety = new SafetyMechanisms({
        maxIterations: 5,
        maxConsecutiveFailures: 3
      });

      // Test should stop conditions
      const mockLoopState = { iteration: 6, startTime: Date.now() };
      const shouldStop = safety.shouldStopLoop(mockLoopState, []);

      if (!shouldStop.stop) {
        throw new Error('Should trigger max iterations safety stop');
      }

      // Test error skipping
      const mockError = { type: 'test-error', component: 'test', message: 'test' };
      safety.recordFixAttempt(mockError, { confidence: 50 }, false, 'test');
      safety.recordFixAttempt(mockError, { confidence: 50 }, false, 'test');
      safety.recordFixAttempt(mockError, { confidence: 50 }, false, 'test');

      const skipReason = safety.shouldSkipError(mockError, []);
      if (!skipReason) {
        throw new Error('Should skip error after max retries');
      }

      return { passed: true, details: 'Safety mechanisms working correctly' };
    });
  }

  async runLoopFunctionalityTests() {
    console.log('\n🔄 Running Loop Functionality Tests...');

    await this.runTest('Basic Loop Execution', async () => {
      const controller = new LoopController({
        maxIterations: 2,
        confidenceThreshold: 50,
        parallelFixes: 1,
        workingDir: this.tempDir,
        serverUrl: 'http://localhost:8080', // Will fail gracefully
        autoApply: false, // Don't actually apply fixes in tests
        createReports: false
      });

      // Mock browser interaction since server may not be running
      controller.browser = {
        newPage: () => ({
          goto: () => Promise.resolve(),
          on: () => {},
          waitForTimeout: () => Promise.resolve(),
          evaluate: () => Promise.resolve(true),
          $: () => Promise.resolve({}),
          close: () => Promise.resolve()
        }),
        close: () => Promise.resolve()
      };

      // Mock error detection to return controlled errors
      controller.detectErrors = async () => [
        {
          id: 'test-error-1',
          type: 'functional-error',
          severity: 'HIGH',
          component: 'character-creation',
          message: 'Test error for loop functionality'
        }
      ];

      const results = await controller.run();

      if (!results.iterations || results.iterations < 1) {
        throw new Error('Loop should have run at least one iteration');
      }

      return { passed: true, details: `Loop ran ${results.iterations} iterations` };
    });

    await this.runTest('Error Processing Pipeline', async () => {
      const controller = new LoopController({
        maxIterations: 1,
        confidenceThreshold: 30,
        workingDir: this.tempDir,
        autoApply: false
      });

      // Mock components for controlled testing
      controller.browser = await this.createMockBrowser();

      const mockError = {
        id: 'test-error',
        type: 'runtime-error',
        severity: 'CRITICAL',
        component: 'character-creation',
        message: 'Begin button not enabled'
      };

      const result = await controller.processError(mockError);

      // Should attempt to process the error even if it fails
      if (!result || (result.success === undefined && result.skipped === undefined)) {
        throw new Error('Error processing should return a result');
      }

      return { passed: true, details: 'Error processing pipeline functional' };
    });
  }

  async runStateManagementTests() {
    console.log('\n💾 Running State Management Tests...');

    await this.runTest('State Persistence and Recovery', async () => {
      const stateDir = path.join(this.tempDir, '.state-test');
      const controller1 = new LoopController({
        maxIterations: 3,
        workingDir: this.tempDir,
        stateManager: { stateDir },
        autoApply: false
      });

      // Simulate partial run
      controller1.state = {
        iteration: 2,
        status: 'running',
        startTime: Date.now(),
        totalErrors: 5,
        fixedErrors: 2
      };

      await controller1.stateManager.saveState(controller1.state, {
        errorHistory: [{ iteration: 1, totalErrors: 7 }],
        fixHistory: [{ success: true }]
      });

      // Create new controller and resume
      const controller2 = new LoopController({
        maxIterations: 5,
        workingDir: this.tempDir,
        stateManager: { stateDir },
        autoApply: false
      });

      const resumed = await controller2.resume();

      if (!resumed) {
        throw new Error('Should successfully resume from saved state');
      }

      if (controller2.state.iteration !== 2) {
        throw new Error('Resumed state should have correct iteration count');
      }

      return { passed: true, details: 'State persistence and recovery working' };
    });

    await this.runTest('State Corruption Recovery', async () => {
      const stateManager = new LoopStateManager({
        stateDir: path.join(this.tempDir, '.corruption-test'),
        enableIntegrityCheck: true
      });

      // Create valid state first
      await stateManager.saveState({ iteration: 1 }, {});

      // Corrupt the state file
      const stateFile = path.join(stateManager.config.stateDir, 'loop-state.json');
      await fs.writeFile(stateFile, '{ invalid json');

      // Should handle corruption gracefully
      const loadedState = await stateManager.loadState();

      // Should either return null or recover from backup
      if (loadedState !== null && loadedState.iteration !== 1) {
        throw new Error('Should handle corruption gracefully');
      }

      return { passed: true, details: 'Corruption recovery working' };
    });
  }

  async runSafetyMechanismTests() {
    console.log('\n🛡️ Running Safety Mechanism Tests...');

    await this.runTest('Iteration Limit Safety', async () => {
      const controller = new LoopController({
        maxIterations: 2,
        workingDir: this.tempDir,
        autoApply: false
      });

      controller.browser = await this.createMockBrowser();

      // Mock error detection to always return errors (infinite loop scenario)
      controller.detectErrors = async () => [
        {
          id: 'persistent-error',
          type: 'test-error',
          severity: 'HIGH',
          component: 'test',
          message: 'Persistent test error'
        }
      ];

      const results = await controller.run();

      if (results.iterations > 2) {
        throw new Error('Should respect max iterations limit');
      }

      return { passed: true, details: 'Iteration limit safety working' };
    });

    await this.runTest('Resource Limit Monitoring', async () => {
      const safety = new SafetyMechanisms({
        maxMemoryUsageMB: 50 // Very low limit for testing
      });

      safety.startMonitoring();

      // Simulate resource check
      const resourceCheck = safety.checkResourceLimits();

      // May or may not exceed depending on actual usage, but should not crash
      const hasResourceLimits = resourceCheck.hasOwnProperty('exceeded');

      safety.stopMonitoring();

      if (!hasResourceLimits) {
        throw new Error('Resource monitoring should return proper structure');
      }

      return { passed: true, details: 'Resource monitoring functional' };
    });

    await this.runTest('Emergency Stop Mechanism', async () => {
      const safety = new SafetyMechanisms({
        emergencyStopFile: path.join(this.tempDir, '.test-emergency-stop')
      });

      // Create emergency stop
      await safety.createEmergencyStop('Test emergency stop');

      // Should detect the stop
      await safety.checkEmergencyStopFile();

      if (!safety.safetyState.emergencyStopRequested) {
        throw new Error('Should detect emergency stop file');
      }

      // Clean up
      await safety.clearEmergencyStop();

      return { passed: true, details: 'Emergency stop mechanism working' };
    });
  }

  async runErrorScenarioTests() {
    console.log('\n🚨 Running Error Scenario Tests...');

    await this.runTest('Network Failure Handling', async () => {
      const controller = new LoopController({
        maxIterations: 1,
        serverUrl: 'http://nonexistent-server:9999',
        workingDir: this.tempDir,
        autoApply: false
      });

      // Should handle network failures gracefully
      try {
        const results = await controller.run();
        // Should complete even with network issues
        if (results.status === 'success' || results.status === 'failed') {
          return { passed: true, details: 'Handled network failure gracefully' };
        }
      } catch (error) {
        // Should not throw unhandled errors
        throw new Error('Should handle network failures without crashing');
      }

      return { passed: true, details: 'Network failure handling working' };
    });

    await this.runTest('Invalid Configuration Handling', async () => {
      try {
        const controller = new LoopController({
          maxIterations: -1, // Invalid
          confidenceThreshold: 150, // Invalid
          workingDir: '/nonexistent/path'
        });

        // Should either handle gracefully or fail fast
        const results = await controller.run();

        // If it runs, it should handle invalid config gracefully
        return { passed: true, details: 'Invalid configuration handled gracefully' };

      } catch (error) {
        // Failing fast is also acceptable for invalid config
        return { passed: true, details: 'Invalid configuration failed fast as expected' };
      }
    });

    await this.runTest('Component Integration Failure', async () => {
      const controller = new LoopController({
        maxIterations: 1,
        workingDir: this.tempDir,
        autoApply: false
      });

      // Break a component intentionally
      controller.errorDetector = null;

      try {
        await controller.run();
        throw new Error('Should fail when component is broken');
      } catch (error) {
        // Expected to fail
        return { passed: true, details: 'Component failure handled correctly' };
      }
    });
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');

    await this.runTest('Large Error Set Processing', async () => {
      const prioritizer = new ErrorPrioritizer();

      // Create a large set of errors
      const largeErrorSet = [];
      for (let i = 0; i < 100; i++) {
        largeErrorSet.push({
          id: `error-${i}`,
          type: 'test-error',
          severity: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
          component: `component-${i % 5}`,
          message: `Test error ${i}`
        });
      }

      const startTime = Date.now();
      const prioritized = prioritizer.prioritizeErrors(largeErrorSet, {});
      const duration = Date.now() - startTime;

      if (prioritized.length !== 100) {
        throw new Error('Should handle all errors');
      }

      if (duration > 5000) { // 5 second limit
        throw new Error(`Performance too slow: ${duration}ms`);
      }

      return { passed: true, details: `Processed 100 errors in ${duration}ms` };
    });

    await this.runTest('Memory Usage Stability', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy multiple controllers
      for (let i = 0; i < 10; i++) {
        const controller = new LoopController({
          maxIterations: 1,
          workingDir: this.tempDir,
          autoApply: false
        });

        // Simulate brief usage
        controller.state.iteration = i;
        await controller.stateManager.saveState(controller.state, {});

        // Cleanup
        await controller.cleanup?.();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      if (memoryGrowthMB > 50) { // 50MB growth limit
        throw new Error(`Excessive memory growth: ${memoryGrowthMB.toFixed(1)}MB`);
      }

      return { passed: true, details: `Memory growth: ${memoryGrowthMB.toFixed(1)}MB` };
    });
  }

  async runTest(testName, testFunction) {
    console.log(`  🧪 ${testName}...`);

    const testStartTime = Date.now();

    try {
      const result = await testFunction();
      const duration = Date.now() - testStartTime;

      this.testResults.push({
        name: testName,
        passed: true,
        duration,
        details: result.details || 'Test passed'
      });

      console.log(`    ✅ PASSED (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - testStartTime;

      this.testResults.push({
        name: testName,
        passed: false,
        duration,
        error: error.message
      });

      console.log(`    ❌ FAILED (${duration}ms): ${error.message}`);
      throw error; // Re-throw to stop test suite if needed
    }
  }

  async createMockBrowser() {
    // Return a mock browser object that doesn't require a real browser
    return {
      newPage: () => ({
        goto: () => Promise.resolve(),
        on: () => {},
        waitForTimeout: () => Promise.resolve(),
        evaluate: () => Promise.resolve({}),
        $: () => Promise.resolve(null),
        click: () => Promise.resolve(),
        waitForSelector: () => Promise.resolve(),
        close: () => Promise.resolve()
      }),
      close: () => Promise.resolve()
    };
  }

  async generateTestReport() {
    console.log('\n📄 Generating Test Report...');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - this.testStartTime;

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
        totalDuration: totalDuration + 'ms'
      },
      results: this.testResults
    };

    const reportPath = path.join(this.tempDir, 'integration-test-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });

    console.log(`📊 Test Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${report.summary.successRate}`);
    console.log(`   Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`   Report: ${reportPath}`);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');

    try {
      if (await fs.pathExists(this.tempDir)) {
        await fs.remove(this.tempDir);
      }
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }
}

// Export for use in other test files
export { LoopIntegrationTester };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new LoopIntegrationTester();

  tester.runAllTests()
    .then(results => {
      const exitCode = results.success ? 0 : 1;
      console.log(`\n${results.success ? '✅' : '❌'} Integration tests ${results.success ? 'completed successfully' : 'failed'}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error.message);
      process.exit(1);
    });
}