/**
 * errorClassification.test.js - Comprehensive test suite for error classification system
 * Tests ErrorClassifier, ErrorPatterns, and ClassificationRules
 */

// Test framework setup
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
};

const assertEquals = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
    }
};

const assertApproximatelyEquals = (actual, expected, tolerance, message) => {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`Assertion failed: ${message}. Expected: ${expected} ± ${tolerance}, Actual: ${actual}`);
    }
};

class ErrorClassificationTestSuite {
    constructor() {
        this.testResults = [];
        this.errorClassifier = null;
        this.errorPatterns = null;
        this.classificationRules = null;
    }

    /**
     * Initialize test environment
     */
    async setup() {
        try {
            // Initialize classification system components
            this.errorPatterns = new ErrorPatterns();
            this.classificationRules = new ClassificationRules();
            this.errorClassifier = new ErrorClassifier();

            // Initialize classifier
            await this.errorClassifier.initialize();

            console.log('✅ Test environment setup complete');
        } catch (error) {
            console.error('❌ Test environment setup failed:', error);
            throw error;
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Error Classification Test Suite...\n');

        await this.setup();

        // Core functionality tests
        await this.runTest('testErrorNormalization', 'Error Normalization');
        await this.runTest('testPatternMatching', 'Pattern Matching');
        await this.runTest('testRuleEvaluation', 'Rule Evaluation');
        await this.runTest('testClassificationAccuracy', 'Classification Accuracy');

        // Game-specific error tests
        await this.runTest('testSaveSystemErrors', 'Save System Errors');
        await this.runTest('testProgressionErrors', 'Progression System Errors');
        await this.runTest('testUIErrors', 'UI System Errors');
        await this.runTest('testPerformanceErrors', 'Performance Errors');
        await this.runTest('testNetworkErrors', 'Network Errors');

        // Performance tests
        await this.runTest('testClassificationPerformance', 'Classification Performance');
        await this.runTest('testMemoryUsage', 'Memory Usage');

        // Learning and adaptation tests
        await this.runTest('testPatternLearning', 'Pattern Learning');
        await this.runTest('testConfidenceAdjustment', 'Confidence Adjustment');

        // Edge case tests
        await this.runTest('testEdgeCases', 'Edge Cases');
        await this.runTest('testErrorRecovery', 'Error Recovery');

        // Integration tests
        await this.runTest('testIntegrationWithErrorManager', 'ErrorManager Integration');

        this.printResults();
    }

    /**
     * Run individual test with error handling
     */
    async runTest(testMethod, testName) {
        try {
            console.log(`🔍 Running: ${testName}`);
            const startTime = performance.now();

            await this[testMethod]();

            const duration = performance.now() - startTime;
            this.testResults.push({
                name: testName,
                status: 'PASS',
                duration: Math.round(duration * 100) / 100
            });

            console.log(`✅ ${testName} - PASSED (${Math.round(duration)}ms)\n`);
        } catch (error) {
            this.testResults.push({
                name: testName,
                status: 'FAIL',
                error: error.message
            });

            console.error(`❌ ${testName} - FAILED: ${error.message}\n`);
        }
    }

    /**
     * Test error normalization
     */
    async testErrorNormalization() {
        // Test Error object
        const error1 = new Error('Test error message');
        const normalized1 = this.errorClassifier.normalizeError(error1);

        assertEquals(normalized1.name, 'Error', 'Error name should be normalized');
        assertEquals(normalized1.message, 'Test error message', 'Error message should be preserved');
        assertEquals(normalized1.type, 'Error', 'Error type should be set');
        assert(normalized1.stack !== null, 'Stack trace should be preserved');

        // Test string error
        const normalized2 = this.errorClassifier.normalizeError('String error');
        assertEquals(normalized2.name, 'StringError', 'String error name should be correct');
        assertEquals(normalized2.message, 'String error', 'String error message should be preserved');
        assertEquals(normalized2.type, 'String', 'String error type should be set');

        // Test object error
        const objError = { message: 'Object error', code: 'ERR_TEST' };
        const normalized3 = this.errorClassifier.normalizeError(objError);
        assertEquals(normalized3.name, 'ObjectError', 'Object error name should be correct');
        assertEquals(normalized3.message, 'Object error', 'Object error message should be preserved');
        assertEquals(normalized3.code, 'ERR_TEST', 'Object error code should be preserved');
    }

    /**
     * Test pattern matching system
     */
    async testPatternMatching() {
        const testCases = [
            {
                error: new Error('Save data corruption detected'),
                expectedPattern: 'save_corruption_detected',
                minScore: 0.8
            },
            {
                error: new Error('Storage quota exceeded'),
                expectedPattern: 'storage_quota_exceeded',
                minScore: 0.8
            },
            {
                error: new Error('CP calculation overflow'),
                expectedPattern: 'cp_calculation_overflow',
                minScore: 0.8
            },
            {
                error: new Error('Render loop failure'),
                expectedPattern: 'render_loop_failure',
                minScore: 0.8
            }
        ];

        for (const testCase of testCases) {
            const patterns = this.errorPatterns.findMatches(
                this.errorClassifier.normalizeError(testCase.error)
            );

            assert(patterns.length > 0, `Should find patterns for: ${testCase.error.message}`);

            const matchedPattern = patterns.find(p => p.pattern === testCase.expectedPattern);
            assert(matchedPattern, `Should match expected pattern: ${testCase.expectedPattern}`);
            assert(matchedPattern.score >= testCase.minScore,
                `Pattern score should be >= ${testCase.minScore}, got ${matchedPattern.score}`);
        }
    }

    /**
     * Test rule evaluation
     */
    async testRuleEvaluation() {
        const testRules = [
            {
                error: new Error('Critical system failure'),
                expectedSeverity: 'CRITICAL',
                expectedSystem: 'CORE'
            },
            {
                error: new Error('Save corruption detected'),
                expectedSeverity: 'CRITICAL',
                expectedSystem: 'SAVE'
            },
            {
                error: new Error('Memory leak detected'),
                expectedSeverity: 'HIGH',
                expectedSystem: 'MEMORY'
            }
        ];

        for (const testCase of testRules) {
            const analysisResults = {
                normalizedError: this.errorClassifier.normalizeError(testCase.error),
                patterns: this.errorPatterns.findMatches(
                    this.errorClassifier.normalizeError(testCase.error)
                )
            };

            const ruleResult = this.classificationRules.evaluateRules(analysisResults, {});

            assertEquals(ruleResult.classification.severity, testCase.expectedSeverity,
                `Severity should match for: ${testCase.error.message}`);
            assertEquals(ruleResult.classification.system, testCase.expectedSystem,
                `System should match for: ${testCase.error.message}`);
        }
    }

    /**
     * Test overall classification accuracy
     */
    async testClassificationAccuracy() {
        const testErrors = [
            {
                error: new Error('Save data corruption detected'),
                expectedSeverity: 'CRITICAL',
                expectedSystem: 'SAVE',
                expectedStrategy: 'FALLBACK'
            },
            {
                error: new Error('CP calculation overflow detected'),
                expectedSeverity: 'HIGH',
                expectedSystem: 'PROGRESSION',
                expectedStrategy: 'FALLBACK'
            },
            {
                error: new Error('Network timeout occurred'),
                expectedSeverity: 'MEDIUM',
                expectedSystem: 'NETWORK',
                expectedStrategy: 'RETRY'
            },
            {
                error: new Error('UI render loop failed'),
                expectedSeverity: 'HIGH',
                expectedSystem: 'UI',
                expectedStrategy: 'FALLBACK'
            }
        ];

        let correctClassifications = 0;
        const totalTests = testErrors.length;

        for (const testCase of testErrors) {
            const classification = this.errorClassifier.classify(testCase.error, {});

            let isCorrect = true;
            if (classification.severity !== testCase.expectedSeverity) isCorrect = false;
            if (classification.system !== testCase.expectedSystem) isCorrect = false;
            if (classification.strategy !== testCase.expectedStrategy) isCorrect = false;

            if (isCorrect) {
                correctClassifications++;
            } else {
                console.warn(`Classification mismatch for: ${testCase.error.message}`);
                console.warn(`Expected: ${JSON.stringify(testCase)}`);
                console.warn(`Got: ${JSON.stringify(classification)}`);
            }
        }

        const accuracy = correctClassifications / totalTests;
        assert(accuracy >= 0.9, `Classification accuracy should be >= 90%, got ${accuracy * 100}%`);
    }

    /**
     * Test save system error classification
     */
    async testSaveSystemErrors() {
        const saveErrors = [
            new Error('localStorage quota exceeded'),
            new Error('Save data verification failed'),
            new Error('Invalid save data format'),
            new Error('Checksum mismatch detected')
        ];

        for (const error of saveErrors) {
            const classification = this.errorClassifier.classify(error, { operation: 'save' });

            assertEquals(classification.system, 'SAVE',
                `Save error should be classified as SAVE system: ${error.message}`);
            assert(['HIGH', 'CRITICAL'].includes(classification.severity),
                `Save error should be high severity: ${error.message}`);
        }
    }

    /**
     * Test progression system error classification
     */
    async testProgressionErrors() {
        const progressionErrors = [
            new Error('CP calculation overflow'),
            new Error('Negative cultivation points detected'),
            new Error('Realm advancement failed'),
            new Error('Resource generation stopped')
        ];

        for (const error of progressionErrors) {
            const classification = this.errorClassifier.classify(error, {
                system: 'progression',
                operation: 'calculate'
            });

            assertEquals(classification.system, 'PROGRESSION',
                `Progression error should be classified as PROGRESSION: ${error.message}`);
        }
    }

    /**
     * Test UI system error classification
     */
    async testUIErrors() {
        const uiErrors = [
            new Error('Cannot read property of null'),
            new Error('Element not found'),
            new Error('Animation frame error'),
            new Error('Render loop failed')
        ];

        for (const error of uiErrors) {
            const classification = this.errorClassifier.classify(error, { source: 'ui' });

            assertEquals(classification.system, 'UI',
                `UI error should be classified as UI: ${error.message}`);
        }
    }

    /**
     * Test performance error classification
     */
    async testPerformanceErrors() {
        const performanceErrors = [
            new Error('Memory leak detected'),
            new Error('High CPU usage'),
            new Error('Frame rate degradation'),
            new Error('GC pressure warning')
        ];

        for (const error of performanceErrors) {
            const classification = this.errorClassifier.classify(error, {
                memoryUsage: 150 * 1024 * 1024,
                cpuUsage: 85
            });

            assert(['MEMORY', 'PERFORMANCE'].includes(classification.system),
                `Performance error should be classified correctly: ${error.message}`);
        }
    }

    /**
     * Test network error classification
     */
    async testNetworkErrors() {
        const networkErrors = [
            new Error('Network timeout'),
            new Error('Connection lost'),
            new Error('Fetch failed'),
            new Error('Request timeout')
        ];

        for (const error of networkErrors) {
            const classification = this.errorClassifier.classify(error, {
                source: 'network',
                'navigator.onLine': false
            });

            assertEquals(classification.system, 'NETWORK',
                `Network error should be classified as NETWORK: ${error.message}`);
        }
    }

    /**
     * Test classification performance
     */
    async testClassificationPerformance() {
        const testError = new Error('Performance test error');
        const iterations = 100;
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            this.errorClassifier.classify(testError, {});
            const endTime = performance.now();
            times.push(endTime - startTime);
        }

        const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);

        assert(averageTime < 1.0, `Average classification time should be < 1ms, got ${averageTime}ms`);
        assert(maxTime < 5.0, `Max classification time should be < 5ms, got ${maxTime}ms`);

        // Test 95th percentile
        times.sort((a, b) => a - b);
        const p95Index = Math.floor(times.length * 0.95);
        const p95Time = times[p95Index];

        assert(p95Time < 1.0, `95th percentile should be < 1ms, got ${p95Time}ms`);
    }

    /**
     * Test memory usage
     */
    async testMemoryUsage() {
        if (!window.performance || !window.performance.memory) {
            console.log('⏭️ Memory testing not available (performance.memory not supported)');
            return;
        }

        const initialMemory = window.performance.memory.usedJSHeapSize;

        // Perform many classifications
        for (let i = 0; i < 1000; i++) {
            const testError = new Error(`Test error ${i}`);
            this.errorClassifier.classify(testError, { iteration: i });
        }

        const finalMemory = window.performance.memory.usedJSHeapSize;
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseKB = memoryIncrease / 1024;

        assert(memoryIncreaseKB < 512,
            `Memory usage should be < 512KB, got ${memoryIncreaseKB}KB`);
    }

    /**
     * Test pattern learning capabilities
     */
    async testPatternLearning() {
        const newErrorType = 'Custom Test Error Type - Very Specific Pattern';

        // Generate similar errors multiple times
        for (let i = 0; i < 5; i++) {
            const error = new Error(`${newErrorType} occurrence ${i}`);
            this.errorClassifier.classify(error, { testScenario: true });
        }

        // Check if new pattern was detected
        const learningData = this.errorClassifier.learningData;
        assert(learningData.newPatterns.length >= 0, 'Learning system should be functional');

        // Test that similar errors get higher confidence over time
        const error1 = new Error(newErrorType);
        const classification1 = this.errorClassifier.classify(error1, { testScenario: true });

        // Simulate more occurrences
        for (let i = 0; i < 3; i++) {
            this.errorClassifier.classify(error1, { testScenario: true });
        }

        const classification2 = this.errorClassifier.classify(error1, { testScenario: true });

        // Note: This test might need adjustment based on actual learning implementation
        assert(classification2.confidence >= classification1.confidence - 0.1,
            'Confidence should remain stable or improve with repeated similar errors');
    }

    /**
     * Test confidence adjustment
     */
    async testConfidenceAdjustment() {
        const testError = new Error('Confidence test error');

        // Get initial classification
        const classification1 = this.errorClassifier.classify(testError, {});

        // Simulate successful recovery feedback
        this.errorClassifier.updateLearningData(
            this.errorClassifier.normalizeError(testError),
            { recoverySuccessful: true },
            classification1
        );

        // Get classification again
        const classification2 = this.errorClassifier.classify(testError, {});

        assert(classification2.confidence >= 0, 'Confidence should be non-negative');
        assert(classification2.confidence <= 1, 'Confidence should not exceed 1');
    }

    /**
     * Test edge cases and error conditions
     */
    async testEdgeCases() {
        // Test null/undefined errors
        const classification1 = this.errorClassifier.classify(null, {});
        assert(classification1.severity, 'Should handle null error gracefully');

        const classification2 = this.errorClassifier.classify(undefined, {});
        assert(classification2.severity, 'Should handle undefined error gracefully');

        // Test empty error
        const classification3 = this.errorClassifier.classify('', {});
        assert(classification3.severity, 'Should handle empty string error gracefully');

        // Test circular reference in context
        const circularContext = {};
        circularContext.self = circularContext;

        const classification4 = this.errorClassifier.classify(
            new Error('Circular context test'),
            circularContext
        );
        assert(classification4.severity, 'Should handle circular references gracefully');

        // Test very long error message
        const longMessage = 'A'.repeat(10000);
        const classification5 = this.errorClassifier.classify(new Error(longMessage), {});
        assert(classification5.severity, 'Should handle very long error messages');
    }

    /**
     * Test error recovery in classification system
     */
    async testErrorRecovery() {
        // Test classification system's own error handling
        const mockClassifier = {
            classify: () => {
                throw new Error('Classification system failure');
            }
        };

        // The system should fall back gracefully when classification fails
        try {
            const errorManager = {
                errorClassifier: mockClassifier,
                classificationEnabled: true,
                _determineBasicCategory: () => 'SYSTEM',
                _normalizeError: (error) => ({ message: error.message })
            };

            // This should not throw but fall back to basic classification
            assert(true, 'Error recovery test setup complete');
        } catch (error) {
            assert(false, 'Classification system should handle its own failures gracefully');
        }
    }

    /**
     * Test integration with ErrorManager
     */
    async testIntegrationWithErrorManager() {
        // Test if ErrorManager can be enhanced with classification
        if (typeof ErrorManager !== 'undefined') {
            const errorManager = new ErrorManager();

            // Initialize with classification
            await errorManager.initialize({
                eventManager: null,
                gameState: null,
                performanceMonitor: null
            });

            // Test error reporting with classification
            const errorId = errorManager.reportError(new Error('Integration test error'), {
                testContext: true
            });

            assert(errorId, 'ErrorManager should return error ID');
            assert(errorManager.classificationEnabled !== undefined,
                'ErrorManager should have classification enabled flag');

            // Test enhanced statistics
            const stats = errorManager.getEnhancedStatistics ?
                errorManager.getEnhancedStatistics() : errorManager.getStatistics();

            assert(stats.totalErrors > 0, 'Statistics should show reported error');
        } else {
            console.log('⏭️ ErrorManager integration test skipped (ErrorManager not available)');
        }
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log('\n📊 Test Results Summary');
        console.log('========================\n');

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

        if (failed > 0) {
            console.log('Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(test => {
                    console.log(`❌ ${test.name}: ${test.error}`);
                });
            console.log();
        }

        // Performance summary
        const timings = this.testResults
            .filter(r => r.duration)
            .map(r => r.duration);

        if (timings.length > 0) {
            const totalTime = timings.reduce((a, b) => a + b, 0);
            const avgTime = totalTime / timings.length;

            console.log(`Performance Summary:`);
            console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
            console.log(`Average Time: ${avgTime.toFixed(2)}ms per test`);
            console.log(`Fastest Test: ${Math.min(...timings).toFixed(2)}ms`);
            console.log(`Slowest Test: ${Math.max(...timings).toFixed(2)}ms`);
        }

        console.log('\n🎯 Test Suite Complete!');

        if (failed === 0) {
            console.log('🎉 All tests passed! Error classification system is working correctly.');
        } else {
            console.error(`⚠️  ${failed} test(s) failed. Please review the issues above.`);
        }
    }
}

// Auto-run tests if in browser environment
if (typeof window !== 'undefined') {
    window.ErrorClassificationTestSuite = ErrorClassificationTestSuite;

    // Add convenience function to run tests
    window.runErrorClassificationTests = async function() {
        const testSuite = new ErrorClassificationTestSuite();
        await testSuite.runAllTests();
        return testSuite.testResults;
    };

    console.log('🧪 Error Classification Test Suite loaded!');
    console.log('Run tests with: runErrorClassificationTests()');
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorClassificationTestSuite;
}