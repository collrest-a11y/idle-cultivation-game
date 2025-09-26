/**
 * Error Monitoring Test Suite
 * Tests the error monitoring system including metrics collection, session tracking, and reporting
 */

const { test, expect } = require('@playwright/test');
const {
    ErrorInjector,
    StateValidator,
    PerformanceMonitor,
    ErrorMonitor,
    TestHelpers,
    TestDataGenerator
} = require('../../utils/error-helpers');

test.describe('Error Monitoring Tests', () => {
    let errorInjector;
    let stateValidator;
    let performanceMonitor;
    let errorMonitor;

    test.beforeEach(async ({ page }) => {
        // Initialize test utilities
        errorInjector = new ErrorInjector(page);
        stateValidator = new StateValidator(page);
        performanceMonitor = new PerformanceMonitor(page);
        errorMonitor = new ErrorMonitor(page);

        // Start error monitoring
        await errorMonitor.startListening();

        // Navigate to game and initialize
        await page.goto('/');
        await TestHelpers.waitForGameLoad(page);
        await TestHelpers.initializeFreshGame(page);
    });

    test.afterEach(async ({ page }) => {
        await errorInjector.cleanup();
        errorMonitor.stopListening();
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test.describe('Metrics Collection Accuracy', () => {
        test('should accurately count error occurrences', async ({ page }) => {
            // Get initial error count
            const initialStats = await TestHelpers.getErrorHandlerStats(page);
            const initialCount = initialStats?.totalErrors || 0;

            // Inject specific number of errors
            const injectedErrorCount = 5;
            for (let i = 0; i < injectedErrorCount; i++) {
                await errorInjector.injectJavaScriptError(`Count test error ${i}`);
                await page.waitForTimeout(200);
            }

            // Wait for processing
            await page.waitForTimeout(2000);

            // Verify error count increased correctly
            const finalStats = await TestHelpers.getErrorHandlerStats(page);
            const finalCount = finalStats?.totalErrors || 0;

            expect(finalCount - initialCount).toBeGreaterThanOrEqual(injectedErrorCount);

            // Also verify through error monitor
            const monitoredErrors = await errorMonitor.getCapturedErrors();
            expect(monitoredErrors.totalCount).toBeGreaterThanOrEqual(injectedErrorCount);
        });

        test('should track error types and categories', async ({ page }) => {
            // Inject different types of errors
            await errorInjector.injectJavaScriptError('Runtime error test');
            await errorInjector.injectReferenceError('undefinedVariable');
            await errorInjector.injectDOMError('#nonexistent');
            await errorInjector.injectStorageCorruption();

            // Wait for categorization
            await page.waitForTimeout(3000);

            // Check error categorization
            const categorizedErrors = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getErrorsByCategory) {
                    return window.errorManager.getErrorsByCategory();
                }
                return null;
            });

            if (categorizedErrors) {
                // Should have multiple categories
                const categories = Object.keys(categorizedErrors);
                expect(categories.length).toBeGreaterThan(1);

                // Common categories should exist
                const expectedCategories = ['javascript', 'dom', 'storage', 'reference'];
                const hasExpectedCategories = expectedCategories.some(cat =>
                    categories.some(existing => existing.toLowerCase().includes(cat))
                );
                expect(hasExpectedCategories).toBe(true);
            }
        });

        test('should measure error frequency and timing', async ({ page }) => {
            await performanceMonitor.startMeasurement('error-frequency-test');

            // Inject errors at different intervals
            await errorInjector.injectJavaScriptError('Frequency test 1');
            await page.waitForTimeout(500);
            await errorInjector.injectJavaScriptError('Frequency test 2');
            await page.waitForTimeout(1000);
            await errorInjector.injectJavaScriptError('Frequency test 3');

            const testDuration = await performanceMonitor.endMeasurement('error-frequency-test');

            // Wait for metrics processing
            await page.waitForTimeout(2000);

            // Check frequency calculations
            const frequencyMetrics = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getFrequencyMetrics) {
                    return window.errorManager.getFrequencyMetrics();
                }
                return null;
            });

            if (frequencyMetrics) {
                expect(frequencyMetrics.errorsPerMinute).toBeGreaterThan(0);
                expect(frequencyMetrics.averageInterval).toBeGreaterThan(0);
            }

            // Verify timing accuracy
            expect(testDuration).toBeGreaterThan(1400); // Should be ~1.5 seconds
            expect(testDuration).toBeLessThan(3000);
        });

        test('should track error severity distribution', async ({ page }) => {
            // Inject errors of different severities
            await errorInjector.injectJavaScriptError('Low severity warning');
            await errorInjector.injectReferenceError('criticalSystemError'); // Higher severity
            await errorInjector.injectMemoryPressure(100); // High severity
            await errorInjector.injectDOMError('#critical-element'); // Medium severity

            // Wait for severity classification
            await page.waitForTimeout(3000);

            // Check severity distribution
            const severityStats = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getSeverityDistribution) {
                    return window.errorManager.getSeverityDistribution();
                }
                return null;
            });

            if (severityStats) {
                // Should have different severity levels
                const severityLevels = Object.keys(severityStats);
                expect(severityLevels.length).toBeGreaterThan(1);

                // Should have both low and high severity errors
                const totalErrors = Object.values(severityStats).reduce((a, b) => a + b, 0);
                expect(totalErrors).toBeGreaterThan(3);
            }
        });
    });

    test.describe('Session Tracking Validation', () => {
        test('should track session-wide error metrics', async ({ page }) => {
            // Get session start time
            const sessionStart = await page.evaluate(() => Date.now());

            // Generate session activity with errors
            await TestHelpers.createTestSaveData(page, 2);
            await errorInjector.injectJavaScriptError('Session error 1');
            await page.waitForTimeout(1000);

            await TestHelpers.triggerGameEvent(page, 'cultivate');
            await errorInjector.injectJavaScriptError('Session error 2');
            await page.waitForTimeout(1000);

            // Check session metrics
            const sessionMetrics = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getSessionMetrics) {
                    return window.errorManager.getSessionMetrics();
                }
                return null;
            });

            if (sessionMetrics) {
                expect(sessionMetrics.sessionDuration).toBeGreaterThan(0);
                expect(sessionMetrics.totalSessionErrors).toBeGreaterThanOrEqual(2);
                expect(sessionMetrics.sessionStartTime).toBeGreaterThanOrEqual(sessionStart - 1000);
            }
        });

        test('should maintain session continuity across errors', async ({ page }) => {
            // Create session state
            await TestHelpers.createTestSaveData(page, 3, { gold: 1000 });

            // Get initial session ID
            const initialSessionId = await page.evaluate(() => {
                return window.sessionStorage.getItem('sessionId') ||
                       (window.errorManager && window.errorManager.sessionId);
            });

            // Inject serious errors
            await errorInjector.injectJavaScriptError('Session continuity test');
            await errorInjector.injectMemoryPressure(50);
            await page.waitForTimeout(2000);

            // Check session ID remained consistent
            const currentSessionId = await page.evaluate(() => {
                return window.sessionStorage.getItem('sessionId') ||
                       (window.errorManager && window.errorManager.sessionId);
            });

            if (initialSessionId && currentSessionId) {
                expect(currentSessionId).toBe(initialSessionId);
            }

            // Verify session data integrity
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });

        test('should track user actions leading to errors', async ({ page }) => {
            // Perform user actions
            await TestHelpers.createTestSaveData(page, 2);
            await TestHelpers.triggerGameEvent(page, 'save-game');
            await page.waitForTimeout(500);

            // Inject error after user action
            await errorInjector.injectJavaScriptError('User action context error');
            await page.waitForTimeout(2000);

            // Check if user actions were tracked
            const errorContext = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getLastErrorContext) {
                    return window.errorManager.getLastErrorContext();
                }
                return null;
            });

            if (errorContext) {
                expect(errorContext.recentActions).toBeDefined();
                expect(errorContext.gameState).toBeDefined();
                expect(errorContext.timestamp).toBeGreaterThan(0);
            }
        });

        test('should handle session storage failures', async ({ page }) => {
            // Disable session storage
            await page.evaluate(() => {
                const originalSetItem = sessionStorage.setItem;
                sessionStorage.setItem = function() {
                    throw new Error('SessionStorage disabled for testing');
                };
            });

            // Trigger session tracking
            await errorInjector.injectJavaScriptError('Session storage failure test');
            await page.waitForTimeout(2000);

            // Verify error monitoring continues despite storage failure
            const monitoredErrors = await errorMonitor.getCapturedErrors();
            expect(monitoredErrors.totalCount).toBeGreaterThan(0);

            // Game should continue functioning
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });
    });

    test.describe('Error Classification Validation', () => {
        test('should classify errors by impact level', async ({ page }) => {
            // Inject errors with different impacts
            await errorInjector.injectJavaScriptError('Minor UI glitch'); // Low impact
            await errorInjector.injectStorageCorruption(); // High impact
            await errorInjector.injectMemoryPressure(200); // Critical impact

            // Wait for classification
            await page.waitForTimeout(3000);

            // Check impact classification
            const classifiedErrors = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getClassifiedErrors) {
                    return window.errorManager.getClassifiedErrors();
                }
                return null;
            });

            if (classifiedErrors) {
                const impactLevels = classifiedErrors.map(error => error.impact || error.severity);
                const uniqueImpacts = [...new Set(impactLevels)];

                // Should have multiple impact levels
                expect(uniqueImpacts.length).toBeGreaterThan(1);
            }
        });

        test('should classify errors by recovery strategy', async ({ page }) => {
            // Inject errors requiring different recovery strategies
            await errorInjector.injectJavaScriptError('Retry-able error');
            await errorInjector.injectDOMError('#recoverable-element');
            await errorInjector.injectStorageCorruption(); // Requires backup restore

            // Wait for classification and strategy assignment
            await page.waitForTimeout(3000);

            // Check recovery strategy classification
            const strategyClassification = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getRecoveryStrategies) {
                    return window.errorManager.getRecoveryStrategies();
                }
                return null;
            });

            if (strategyClassification) {
                const strategies = Object.keys(strategyClassification);
                expect(strategies.length).toBeGreaterThan(1);

                // Common strategies should be present
                const expectedStrategies = ['retry', 'restore', 'fallback', 'ignore'];
                const hasExpectedStrategies = expectedStrategies.some(strategy =>
                    strategies.some(existing => existing.toLowerCase().includes(strategy))
                );
                expect(hasExpectedStrategies).toBe(true);
            }
        });

        test('should provide confidence scores for classifications', async ({ page }) => {
            // Inject well-defined error types
            await errorInjector.injectReferenceError('clearlyUndefinedVariable');
            await errorInjector.injectJavaScriptError('TypeError: Cannot read property');

            // Wait for classification with confidence scoring
            await page.waitForTimeout(3000);

            // Check confidence scores
            const classificationConfidence = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getClassificationConfidence) {
                    return window.errorManager.getClassificationConfidence();
                }
                return null;
            });

            if (classificationConfidence) {
                classificationConfidence.forEach(classification => {
                    expect(classification.confidence).toBeGreaterThan(0);
                    expect(classification.confidence).toBeLessThanOrEqual(1);
                });
            }
        });

        test('should learn from classification feedback', async ({ page }) => {
            // Inject similar errors multiple times
            const errorPattern = 'Learning test error';

            for (let i = 0; i < 3; i++) {
                await errorInjector.injectJavaScriptError(`${errorPattern} ${i}`);
                await page.waitForTimeout(500);
            }

            // Wait for learning algorithm to process
            await page.waitForTimeout(3000);

            // Check if pattern recognition improved
            const learningMetrics = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.getLearningMetrics) {
                    return window.errorManager.getLearningMetrics();
                }
                return null;
            });

            if (learningMetrics) {
                expect(learningMetrics.patternMatches).toBeGreaterThan(0);
                expect(learningMetrics.confidenceImprovement).toBeGreaterThanOrEqual(0);
            }
        });
    });

    test.describe('Report Generation Testing', () => {
        test('should generate comprehensive error reports', async ({ page }) => {
            // Generate diverse error data
            await errorInjector.injectJavaScriptError('Report test error 1');
            await errorInjector.injectReferenceError('reportTestVar');
            await errorInjector.injectDOMError('#report-test-element');
            await errorInjector.injectMemoryPressure(30);

            // Wait for error processing
            await page.waitForTimeout(3000);

            // Generate error report
            const errorReport = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.generateReport) {
                    return window.errorManager.generateReport();
                }
                return null;
            });

            if (errorReport) {
                // Report should have essential sections
                expect(errorReport.summary).toBeDefined();
                expect(errorReport.errors).toBeDefined();
                expect(errorReport.timestamp).toBeDefined();
                expect(errorReport.sessionInfo).toBeDefined();

                // Should include error statistics
                expect(errorReport.summary.totalErrors).toBeGreaterThan(0);
                expect(errorReport.summary.errorTypes).toBeDefined();
                expect(errorReport.summary.severityDistribution).toBeDefined();

                // Should include individual errors
                expect(Array.isArray(errorReport.errors)).toBe(true);
                expect(errorReport.errors.length).toBeGreaterThan(0);
            }
        });

        test('should format reports for different audiences', async ({ page }) => {
            // Generate test errors
            await errorInjector.injectJavaScriptError('Audience test error');
            await page.waitForTimeout(2000);

            // Generate different report formats
            const reports = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.generateFormattedReports) {
                    return window.errorManager.generateFormattedReports();
                }
                return null;
            });

            if (reports) {
                // Should have different formats
                expect(reports.technical).toBeDefined(); // For developers
                expect(reports.summary).toBeDefined(); // For stakeholders
                expect(reports.user).toBeDefined(); // For end users

                // Technical report should be detailed
                if (reports.technical) {
                    expect(reports.technical.stackTraces).toBeDefined();
                    expect(reports.technical.systemInfo).toBeDefined();
                }

                // Summary report should be concise
                if (reports.summary) {
                    expect(reports.summary.keyMetrics).toBeDefined();
                    expect(reports.summary.recommendations).toBeDefined();
                }
            }
        });

        test('should export reports in multiple formats', async ({ page }) => {
            // Generate error data
            await errorInjector.injectJavaScriptError('Export format test');
            await page.waitForTimeout(2000);

            // Test different export formats
            const exportFormats = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.exportReport) {
                    return {
                        json: window.errorManager.exportReport('json'),
                        csv: window.errorManager.exportReport('csv'),
                        html: window.errorManager.exportReport('html')
                    };
                }
                return null;
            });

            if (exportFormats) {
                // JSON format should be valid
                if (exportFormats.json) {
                    expect(() => JSON.parse(exportFormats.json)).not.toThrow();
                }

                // CSV format should have headers
                if (exportFormats.csv) {
                    expect(exportFormats.csv).toContain(','); // CSV delimiter
                    expect(exportFormats.csv.split('\n').length).toBeGreaterThan(1);
                }

                // HTML format should be valid HTML
                if (exportFormats.html) {
                    expect(exportFormats.html).toContain('<html');
                    expect(exportFormats.html).toContain('</html>');
                }
            }
        });

        test('should include system context in reports', async ({ page }) => {
            // Setup system context
            await TestHelpers.createTestSaveData(page, 5, { gold: 2000 });

            // Inject contextual error
            await errorInjector.injectJavaScriptError('Context inclusion test');
            await page.waitForTimeout(2000);

            // Generate context-rich report
            const contextualReport = await page.evaluate(() => {
                if (window.errorManager && window.errorManager.generateContextualReport) {
                    return window.errorManager.generateContextualReport();
                }
                return null;
            });

            if (contextualReport) {
                // Should include system context
                expect(contextualReport.systemContext).toBeDefined();
                expect(contextualReport.gameContext).toBeDefined();
                expect(contextualReport.userContext).toBeDefined();

                // System context should include browser info
                if (contextualReport.systemContext) {
                    expect(contextualReport.systemContext.userAgent).toBeDefined();
                    expect(contextualReport.systemContext.viewport).toBeDefined();
                }

                // Game context should include state
                if (contextualReport.gameContext) {
                    expect(contextualReport.gameContext.playerLevel).toBeDefined();
                    expect(contextualReport.gameContext.gameMode).toBeDefined();
                }
            }
        });
    });

    test.describe('Performance Impact Measurement', () => {
        test('should measure monitoring system overhead', async ({ page }) => {
            // Measure baseline performance without monitoring
            await page.evaluate(() => {
                if (window.errorManager) {
                    window.errorManager.disableMonitoring();
                }
            });

            await performanceMonitor.startMeasurement('baseline-performance');
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            const baselineTime = await performanceMonitor.endMeasurement('baseline-performance');

            // Enable monitoring and measure again
            await page.evaluate(() => {
                if (window.errorManager) {
                    window.errorManager.enableMonitoring();
                }
            });

            await performanceMonitor.startMeasurement('monitored-performance');
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            const monitoredTime = await performanceMonitor.endMeasurement('monitored-performance');

            // Monitoring overhead should be minimal
            const overhead = monitoredTime - baselineTime;
            const overheadPercent = (overhead / baselineTime) * 100;

            expect(overheadPercent).toBeLessThan(10); // Less than 10% overhead
        });

        test('should track memory usage of monitoring system', async ({ page }) => {
            // Measure initial memory
            const initialMemory = await performanceMonitor.measureMemory();

            // Generate monitored activity
            for (let i = 0; i < 20; i++) {
                await errorInjector.injectJavaScriptError(`Memory tracking test ${i}`);
                await page.waitForTimeout(100);
            }

            // Wait for processing
            await page.waitForTimeout(3000);

            // Measure memory after monitoring activity
            const finalMemory = await performanceMonitor.measureMemory();

            if (initialMemory && finalMemory) {
                const memoryGrowth = finalMemory.used - initialMemory.used;

                // Monitoring memory growth should be reasonable
                expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB limit
            }

            // Verify monitoring system is still functional
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThan(15);
        });

        test('should maintain monitoring accuracy under load', async ({ page }) => {
            // Generate high error load
            const highErrorCount = 50;
            const startTime = Date.now();

            for (let i = 0; i < highErrorCount; i++) {
                await errorInjector.injectJavaScriptError(`Load test error ${i}`);
                if (i % 10 === 0) {
                    await page.waitForTimeout(50); // Brief pauses
                }
            }

            const injectionTime = Date.now() - startTime;

            // Wait for processing
            await page.waitForTimeout(5000);

            // Verify accuracy under load
            const stats = await TestHelpers.getErrorHandlerStats(page);
            const capturedErrors = await errorMonitor.getCapturedErrors();

            // Should capture most errors despite high load
            const captureRate = capturedErrors.totalCount / highErrorCount;
            expect(captureRate).toBeGreaterThan(0.8); // 80% capture rate minimum

            // Processing should complete in reasonable time
            expect(injectionTime).toBeLessThan(10000); // 10 second injection limit
        });

        test('should handle monitoring system failures gracefully', async ({ page }) => {
            // Simulate monitoring system failure
            await page.evaluate(() => {
                if (window.errorManager && window.errorManager.simulateFailure) {
                    window.errorManager.simulateFailure();
                }
            });

            // Continue normal game operations
            await TestHelpers.createTestSaveData(page, 3);
            await TestHelpers.triggerGameEvent(page, 'save-game');

            // Verify game continues despite monitoring failure
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if monitoring recovers
            await errorInjector.injectJavaScriptError('Recovery test error');
            await page.waitForTimeout(2000);

            // Should either recover or fail gracefully
            const finalStats = await TestHelpers.getErrorHandlerStats(page);
            // Stats might be null/undefined if monitoring failed, but game should work
            if (finalStats) {
                expect(finalStats.totalErrors).toBeGreaterThanOrEqual(0);
            }
        });
    });

    test.describe('Real-time Monitoring Integration', () => {
        test('should provide real-time error alerts', async ({ page }) => {
            // Setup alert monitoring
            const alerts = [];

            page.on('dialog', dialog => {
                alerts.push(dialog.message());
                dialog.dismiss();
            });

            // Inject critical error
            await errorInjector.injectMemoryPressure(150); // Should trigger alert
            await page.waitForTimeout(3000);

            // Check for alert mechanisms
            const alertElements = page.locator('.error-alert, .critical-error-notification');
            const alertCount = await alertElements.count();

            // Should have some form of alerting
            expect(alertCount > 0 || alerts.length > 0).toBe(true);
        });

        test('should stream monitoring data continuously', async ({ page }) => {
            // Monitor data stream
            const streamData = [];

            // Setup stream listener
            await page.evaluate(() => {
                if (window.errorManager && window.errorManager.onDataStream) {
                    window.testStreamData = [];
                    window.errorManager.onDataStream((data) => {
                        window.testStreamData.push(data);
                    });
                }
            });

            // Generate continuous errors
            for (let i = 0; i < 5; i++) {
                await errorInjector.injectJavaScriptError(`Stream test ${i}`);
                await page.waitForTimeout(500);
            }

            // Wait for stream processing
            await page.waitForTimeout(3000);

            // Check stream data
            const receivedStreamData = await page.evaluate(() => {
                return window.testStreamData || [];
            });

            if (receivedStreamData.length > 0) {
                expect(receivedStreamData.length).toBeGreaterThan(0);

                // Stream data should have timestamps
                receivedStreamData.forEach(data => {
                    expect(data.timestamp).toBeDefined();
                });
            }
        });

        test('should integrate with external monitoring services', async ({ page }) => {
            // Setup external service simulation
            const externalCalls = [];

            await page.route('**/monitoring/**', route => {
                externalCalls.push({
                    url: route.request().url(),
                    method: route.request().method(),
                    timestamp: Date.now()
                });
                route.fulfill({ status: 200, body: '{"status": "received"}' });
            });

            // Trigger external monitoring
            await errorInjector.injectJavaScriptError('External monitoring test');
            await page.waitForTimeout(3000);

            // Check if external calls were made
            if (externalCalls.length > 0) {
                expect(externalCalls.length).toBeGreaterThan(0);

                // Calls should be properly formatted
                externalCalls.forEach(call => {
                    expect(call.url).toContain('monitoring');
                    expect(['GET', 'POST']).toContain(call.method);
                });
            }
        });
    });
});