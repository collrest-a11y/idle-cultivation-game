/**
 * Error Performance Benchmark Test Suite
 * Tests performance benchmarks, resource usage, and throughput under error conditions
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

test.describe('Error Performance Benchmark Tests', () => {
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

        // Start comprehensive monitoring
        await errorMonitor.startListening();

        // Navigate and initialize for performance testing
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

    test.describe('Error Detection Performance Benchmarks', () => {
        test('should meet error detection latency requirements', async ({ page }) => {
            const benchmarkThreshold = 50; // 50ms maximum detection latency
            const testIterations = 10;
            const detectionTimes = [];

            for (let i = 0; i < testIterations; i++) {
                // Start precision timing
                await performanceMonitor.startMeasurement(`detection-latency-${i}`);

                // Inject error
                await errorInjector.injectJavaScriptError(`Latency benchmark error ${i}`);

                // Wait for error detection
                await errorMonitor.waitForError(`Latency benchmark error ${i}`, 2000);

                // Measure detection time
                const detectionTime = await performanceMonitor.endMeasurement(`detection-latency-${i}`);
                detectionTimes.push(detectionTime);

                // Clear errors for next iteration
                await errorMonitor.clearCapturedErrors();
                await page.waitForTimeout(100);
            }

            // Analyze performance metrics
            const averageDetectionTime = detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length;
            const maxDetectionTime = Math.max(...detectionTimes);
            const minDetectionTime = Math.min(...detectionTimes);

            // Performance assertions
            expect(averageDetectionTime).toBeLessThan(benchmarkThreshold);
            expect(maxDetectionTime).toBeLessThan(benchmarkThreshold * 2); // Allow 2x threshold for max
            expect(minDetectionTime).toBeGreaterThan(0);

            // Consistency check
            const standardDeviation = Math.sqrt(
                detectionTimes.reduce((acc, time) => acc + Math.pow(time - averageDetectionTime, 2), 0) / detectionTimes.length
            );
            expect(standardDeviation).toBeLessThan(benchmarkThreshold * 0.5); // Consistent performance

            console.log(`Detection Performance: Avg=${averageDetectionTime.toFixed(2)}ms, Max=${maxDetectionTime.toFixed(2)}ms, Min=${minDetectionTime.toFixed(2)}ms, StdDev=${standardDeviation.toFixed(2)}ms`);
        });

        test('should handle high-frequency error detection', async ({ page }) => {
            const errorCount = 50;
            const injectionInterval = 100; // 100ms between errors
            const startTime = Date.now();

            await performanceMonitor.startMeasurement('high-frequency-detection');

            // Inject errors at high frequency
            for (let i = 0; i < errorCount; i++) {
                await errorInjector.injectJavaScriptError(`High frequency error ${i}`);
                await page.waitForTimeout(injectionInterval);
            }

            const totalInjectionTime = await performanceMonitor.endMeasurement('high-frequency-detection');

            // Wait for all errors to be processed
            await page.waitForTimeout(2000);

            // Verify detection rate
            const capturedErrors = await errorMonitor.getCapturedErrors();
            const detectionRate = capturedErrors.totalCount / errorCount;

            // Performance requirements
            expect(detectionRate).toBeGreaterThan(0.8); // 80% detection rate minimum
            expect(totalInjectionTime).toBeLessThan(errorCount * injectionInterval * 1.5); // Injection shouldn't be blocked

            // Calculate throughput
            const errorsPerSecond = errorCount / (totalInjectionTime / 1000);
            expect(errorsPerSecond).toBeGreaterThan(5); // Minimum 5 errors/second processing

            console.log(`High-frequency Detection: ${detectionRate * 100}% rate, ${errorsPerSecond.toFixed(2)} errors/sec`);
        });

        test('should maintain detection accuracy under load', async ({ page }) => {
            const loadFactor = 3; // Multiple error types simultaneously
            const errorTypes = [
                'JavaScript runtime error',
                'Reference error test',
                'DOM manipulation error'
            ];

            await performanceMonitor.startMeasurement('detection-under-load');

            // Generate load with multiple error types
            for (let iteration = 0; iteration < 5; iteration++) {
                const promises = [];
                for (let typeIndex = 0; typeIndex < loadFactor; typeIndex++) {
                    const errorMessage = `${errorTypes[typeIndex]} iteration ${iteration}`;

                    switch (typeIndex) {
                        case 0:
                            promises.push(errorInjector.injectJavaScriptError(errorMessage));
                            break;
                        case 1:
                            promises.push(errorInjector.injectReferenceError(`loadVar${iteration}_${typeIndex}`));
                            break;
                        case 2:
                            promises.push(errorInjector.injectDOMError(`#load-test-${iteration}-${typeIndex}`));
                            break;
                    }
                }

                await Promise.all(promises);
                await page.waitForTimeout(200);
            }

            const loadTestTime = await performanceMonitor.endMeasurement('detection-under-load');

            // Wait for processing completion
            await page.waitForTimeout(3000);

            // Verify accuracy under load
            const capturedErrors = await errorMonitor.getCapturedErrors();
            const expectedErrors = 5 * loadFactor; // 5 iterations * 3 error types

            const accuracyRate = capturedErrors.totalCount / expectedErrors;
            expect(accuracyRate).toBeGreaterThan(0.7); // 70% accuracy under load

            // Performance should remain reasonable
            expect(loadTestTime).toBeLessThan(10000); // Complete within 10 seconds

            console.log(`Detection Under Load: ${accuracyRate * 100}% accuracy, ${loadTestTime}ms total time`);
        });
    });

    test.describe('Recovery Performance Benchmarks', () => {
        test('should meet recovery initiation time requirements', async ({ page }) => {
            const recoveryThreshold = 200; // 200ms maximum recovery initiation
            const testScenarios = [
                { type: 'javascript', inject: () => errorInjector.injectJavaScriptError('Recovery benchmark JS') },
                { type: 'storage', inject: () => errorInjector.injectStorageCorruption() },
                { type: 'dom', inject: () => errorInjector.injectDOMError('#recovery-benchmark') },
                { type: 'memory', inject: () => errorInjector.injectMemoryPressure(50) }
            ];

            const recoveryTimes = {};

            for (const scenario of testScenarios) {
                // Setup stable state
                await TestHelpers.createTestSaveData(page, 5, { gold: 2500 });

                await performanceMonitor.startMeasurement(`recovery-${scenario.type}`);

                // Inject error
                await scenario.inject();

                // Wait for recovery initiation
                await page.waitForTimeout(1000);

                const recoveryTime = await performanceMonitor.endMeasurement(`recovery-${scenario.type}`);
                recoveryTimes[scenario.type] = recoveryTime;

                // Verify recovery was successful
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Performance assertion
                expect(recoveryTime).toBeLessThan(recoveryThreshold * 2); // Allow 2x for different error types

                await page.waitForTimeout(500); // Cool down between scenarios
            }

            // Overall recovery performance
            const averageRecoveryTime = Object.values(recoveryTimes).reduce((a, b) => a + b, 0) / Object.values(recoveryTimes).length;
            expect(averageRecoveryTime).toBeLessThan(recoveryThreshold * 1.5);

            console.log('Recovery Times:', recoveryTimes);
            console.log(`Average Recovery Time: ${averageRecoveryTime.toFixed(2)}ms`);
        });

        test('should handle concurrent recovery operations', async ({ page }) => {
            const concurrentRecoveries = 3;
            await performanceMonitor.startMeasurement('concurrent-recovery');

            // Setup rich state for recovery testing
            await TestHelpers.createTestSaveData(page, 8, {
                gold: 8000,
                spirit: 4000,
                items: ['sword', 'shield', 'potion']
            });

            // Inject multiple errors simultaneously
            const errorPromises = [
                errorInjector.injectJavaScriptError('Concurrent recovery test 1'),
                errorInjector.injectStorageCorruption(),
                errorInjector.injectMemoryPressure(75)
            ];

            await Promise.all(errorPromises);

            // Wait for concurrent recovery
            await page.waitForTimeout(4000);

            const concurrentRecoveryTime = await performanceMonitor.endMeasurement('concurrent-recovery');

            // Verify all recoveries completed successfully
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Performance should scale reasonably with concurrent operations
            expect(concurrentRecoveryTime).toBeLessThan(8000); // Should not take excessively long

            // Verify data integrity after concurrent recovery
            const currentState = await page.evaluate(() => window.gameState);
            expect(currentState.player.level).toBeGreaterThanOrEqual(6); // Minimal data loss
            expect(currentState.resources.gold).toBeGreaterThan(6000);

            console.log(`Concurrent Recovery Time: ${concurrentRecoveryTime}ms for ${concurrentRecoveries} operations`);
        });

        test('should optimize recovery performance over time', async ({ page }) => {
            const recoveryIterations = 5;
            const recoveryTimes = [];

            // Perform multiple recovery cycles to test optimization
            for (let i = 0; i < recoveryIterations; i++) {
                // Setup consistent state
                await TestHelpers.createTestSaveData(page, 4, { gold: 2000 });

                await performanceMonitor.startMeasurement(`recovery-optimization-${i}`);

                // Inject similar error pattern
                await errorInjector.injectJavaScriptError(`Optimization test iteration ${i}`);

                // Wait for recovery
                await page.waitForTimeout(2000);

                const iterationTime = await performanceMonitor.endMeasurement(`recovery-optimization-${i}`);
                recoveryTimes.push(iterationTime);

                // Verify recovery success
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                await page.waitForTimeout(500); // Interval between iterations
            }

            // Analyze optimization trend
            const firstHalf = recoveryTimes.slice(0, Math.ceil(recoveryIterations / 2));
            const secondHalf = recoveryTimes.slice(Math.ceil(recoveryIterations / 2));

            const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

            // Recovery should improve or remain stable over time
            const performanceImprovement = (firstHalfAvg - secondHalfAvg) / firstHalfAvg;
            expect(performanceImprovement).toBeGreaterThanOrEqual(-0.2); // Allow 20% performance degradation max

            console.log(`Recovery Optimization: First half avg: ${firstHalfAvg.toFixed(2)}ms, Second half avg: ${secondHalfAvg.toFixed(2)}ms, Improvement: ${(performanceImprovement * 100).toFixed(2)}%`);
        });
    });

    test.describe('Memory Usage Benchmarks', () => {
        test('should maintain memory efficiency during error handling', async ({ page }) => {
            const memoryThreshold = 100 * 1024 * 1024; // 100MB memory growth limit

            // Measure baseline memory
            const baselineMemory = await performanceMonitor.measureMemory();

            // Generate memory-intensive error scenarios
            for (let i = 0; i < 20; i++) {
                await errorInjector.injectJavaScriptError(`Memory efficiency test ${i}`);
                await errorInjector.injectMemoryPressure(25);

                if (i % 5 === 0) {
                    await page.waitForTimeout(500); // Periodic cleanup opportunity
                }
            }

            // Wait for error processing
            await page.waitForTimeout(5000);

            // Measure final memory
            const finalMemory = await performanceMonitor.measureMemory();

            if (baselineMemory && finalMemory) {
                const memoryGrowth = finalMemory.used - baselineMemory.used;

                // Memory growth should be within threshold
                expect(memoryGrowth).toBeLessThan(memoryThreshold);

                // Memory utilization should be reasonable
                const memoryUtilization = finalMemory.used / finalMemory.total;
                expect(memoryUtilization).toBeLessThan(0.9); // Less than 90% utilization

                console.log(`Memory Efficiency: Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB, Utilization: ${(memoryUtilization * 100).toFixed(2)}%`);
            }

            // Verify system remains functional
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });

        test('should handle memory pressure gracefully', async ({ page }) => {
            // Create high memory pressure scenario
            await errorInjector.injectMemoryPressure(200); // 200MB pressure

            const pressureStartTime = Date.now();

            // Continue normal operations under pressure
            await TestHelpers.createTestSaveData(page, 6, { gold: 3000 });
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            await TestHelpers.triggerGameEvent(page, 'save-game');

            // Inject additional errors under memory pressure
            await errorInjector.injectJavaScriptError('Memory pressure error 1');
            await errorInjector.injectJavaScriptError('Memory pressure error 2');

            // Wait for pressure handling
            await page.waitForTimeout(4000);

            const pressureHandlingTime = Date.now() - pressureStartTime;

            // Verify system survived memory pressure
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Performance should degrade gracefully, not crash
            expect(pressureHandlingTime).toBeLessThan(15000); // Should complete within 15 seconds

            // Verify memory pressure was handled
            const finalMemory = await performanceMonitor.measureMemory();
            if (finalMemory) {
                expect(finalMemory.used).toBeLessThan(finalMemory.limit * 0.95); // Not at memory limit
            }

            console.log(`Memory Pressure Handling: ${pressureHandlingTime}ms to stabilize`);
        });

        test('should cleanup memory after error bursts', async ({ page }) => {
            // Measure memory before burst
            const preBurstMemory = await performanceMonitor.measureMemory();

            // Create error burst
            const burstSize = 30;
            for (let i = 0; i < burstSize; i++) {
                await errorInjector.injectJavaScriptError(`Burst error ${i}`);
                await errorInjector.injectMemoryPressure(10); // Small memory allocations
            }

            // Wait for burst processing
            await page.waitForTimeout(3000);

            // Measure memory after burst
            const postBurstMemory = await performanceMonitor.measureMemory();

            // Wait for cleanup period
            await page.waitForTimeout(5000);

            // Measure memory after cleanup
            const postCleanupMemory = await performanceMonitor.measureMemory();

            if (preBurstMemory && postBurstMemory && postCleanupMemory) {
                const burstMemoryGrowth = postBurstMemory.used - preBurstMemory.used;
                const cleanupMemoryChange = postCleanupMemory.used - postBurstMemory.used;

                // Memory should grow during burst
                expect(burstMemoryGrowth).toBeGreaterThan(0);

                // Memory should be cleaned up (or at least not grow further)
                expect(cleanupMemoryChange).toBeLessThanOrEqual(burstMemoryGrowth * 0.5); // Cleanup at least 50%

                console.log(`Memory Cleanup: Burst growth: ${(burstMemoryGrowth / 1024 / 1024).toFixed(2)}MB, Cleanup: ${(cleanupMemoryChange / 1024 / 1024).toFixed(2)}MB`);
            }

            // Verify system functionality after cleanup
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });
    });

    test.describe('Throughput Performance Benchmarks', () => {
        test('should maintain game performance during error processing', async ({ page }) => {
            // Measure baseline game performance
            await performanceMonitor.startMeasurement('baseline-game-performance');

            for (let i = 0; i < 10; i++) {
                await TestHelpers.triggerGameEvent(page, 'cultivate');
                await page.waitForTimeout(100);
            }

            const baselineTime = await performanceMonitor.endMeasurement('baseline-game-performance');

            // Measure game performance with concurrent error processing
            await performanceMonitor.startMeasurement('error-concurrent-performance');

            // Start error injection in background
            const errorPromise = (async () => {
                for (let i = 0; i < 15; i++) {
                    await errorInjector.injectJavaScriptError(`Throughput test error ${i}`);
                    await page.waitForTimeout(150);
                }
            })();

            // Continue normal game operations
            for (let i = 0; i < 10; i++) {
                await TestHelpers.triggerGameEvent(page, 'cultivate');
                await page.waitForTimeout(100);
            }

            await errorPromise; // Wait for error injection to complete
            const errorConcurrentTime = await performanceMonitor.endMeasurement('error-concurrent-performance');

            // Performance degradation should be minimal
            const performanceDegradation = (errorConcurrentTime - baselineTime) / baselineTime;
            expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% performance impact

            // Verify game state integrity
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            console.log(`Throughput Performance: Baseline: ${baselineTime}ms, With errors: ${errorConcurrentTime}ms, Degradation: ${(performanceDegradation * 100).toFixed(2)}%`);
        });

        test('should process error queue efficiently', async ({ page }) => {
            const queueSize = 25;
            const startTime = Date.now();

            await performanceMonitor.startMeasurement('error-queue-processing');

            // Rapidly inject errors to test queue processing
            const injectionPromises = [];
            for (let i = 0; i < queueSize; i++) {
                injectionPromises.push(errorInjector.injectJavaScriptError(`Queue test error ${i}`));
            }

            await Promise.all(injectionPromises);
            const injectionTime = Date.now() - startTime;

            // Wait for queue processing
            await page.waitForTimeout(5000);

            const totalProcessingTime = await performanceMonitor.endMeasurement('error-queue-processing');

            // Calculate processing efficiency
            const errorsPerSecond = queueSize / (totalProcessingTime / 1000);
            const processingOverhead = totalProcessingTime - injectionTime;

            // Performance requirements
            expect(errorsPerSecond).toBeGreaterThan(2); // Minimum 2 errors/second processing
            expect(processingOverhead).toBeLessThan(10000); // Processing overhead under 10 seconds

            // Verify all errors were processed
            const capturedErrors = await errorMonitor.getCapturedErrors();
            const processingRate = capturedErrors.totalCount / queueSize;
            expect(processingRate).toBeGreaterThan(0.8); // 80% processing rate

            console.log(`Queue Processing: ${errorsPerSecond.toFixed(2)} errors/sec, ${processingRate * 100}% processing rate, ${processingOverhead}ms overhead`);
        });

        test('should handle burst traffic efficiently', async ({ page }) => {
            const burstIntervals = 5;
            const errorsPerBurst = 8;
            const burstTimes = [];

            for (let burst = 0; burst < burstIntervals; burst++) {
                await performanceMonitor.startMeasurement(`burst-${burst}`);

                // Create error burst
                const burstPromises = [];
                for (let i = 0; i < errorsPerBurst; i++) {
                    burstPromises.push(errorInjector.injectJavaScriptError(`Burst ${burst} error ${i}`));
                }

                await Promise.all(burstPromises);

                // Wait for burst processing
                await page.waitForTimeout(1500);

                const burstTime = await performanceMonitor.endMeasurement(`burst-${burst}`);
                burstTimes.push(burstTime);

                // Verify system stability between bursts
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Cool down between bursts
                await page.waitForTimeout(500);
            }

            // Analyze burst performance
            const averageBurstTime = burstTimes.reduce((a, b) => a + b, 0) / burstTimes.length;
            const maxBurstTime = Math.max(...burstTimes);
            const minBurstTime = Math.min(...burstTimes);

            // Performance should be consistent across bursts
            const burstVariation = (maxBurstTime - minBurstTime) / averageBurstTime;
            expect(burstVariation).toBeLessThan(1.0); // Less than 100% variation

            // Burst processing should be efficient
            expect(averageBurstTime).toBeLessThan(3000); // Average burst under 3 seconds

            console.log(`Burst Performance: Avg: ${averageBurstTime.toFixed(2)}ms, Max: ${maxBurstTime}ms, Min: ${minBurstTime}ms, Variation: ${(burstVariation * 100).toFixed(2)}%`);
        });
    });

    test.describe('Resource Usage Optimization', () => {
        test('should optimize CPU usage during error handling', async ({ page }) => {
            // Setup performance monitoring
            await page.evaluate(() => {
                window.cpuUsageStart = performance.now();
                window.cpuIntensiveOperations = 0;
            });

            // Create CPU-intensive error scenario
            for (let i = 0; i < 15; i++) {
                await errorInjector.injectJavaScriptError(`CPU optimization test ${i}`);

                // Simulate some CPU work
                await page.evaluate(() => {
                    const start = performance.now();
                    while (performance.now() - start < 50) {
                        window.cpuIntensiveOperations++;
                    }
                });

                await page.waitForTimeout(200);
            }

            // Wait for processing completion
            await page.waitForTimeout(3000);

            // Measure CPU efficiency
            const cpuMetrics = await page.evaluate(() => {
                return {
                    totalTime: performance.now() - window.cpuUsageStart,
                    operations: window.cpuIntensiveOperations
                };
            });

            // Verify error handling didn't block CPU significantly
            const operationsPerMs = cpuMetrics.operations / cpuMetrics.totalTime;
            expect(operationsPerMs).toBeGreaterThan(100); // Maintain CPU efficiency

            // Verify system responsiveness
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            console.log(`CPU Efficiency: ${operationsPerMs.toFixed(2)} operations/ms over ${cpuMetrics.totalTime.toFixed(2)}ms`);
        });

        test('should balance resource allocation under stress', async ({ page }) => {
            // Create multi-resource stress scenario
            await performanceMonitor.startMeasurement('resource-stress-test');

            // Generate complex stress
            const stressPromises = [
                errorInjector.injectMemoryPressure(100), // Memory stress
                errorInjector.injectJavaScriptError('CPU stress error'), // CPU stress
                errorInjector.injectDOMError('#stress-test'), // DOM stress
                // Network stress
                page.route('**/*', route => {
                    setTimeout(() => route.continue(), 200); // Slow down requests
                })
            ];

            await Promise.all(stressPromises);

            // Continue operations under stress
            await TestHelpers.createTestSaveData(page, 7, { gold: 5000 });
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            await TestHelpers.triggerGameEvent(page, 'save-game');

            // Wait for stress handling
            await page.waitForTimeout(6000);

            const stressTestTime = await performanceMonitor.endMeasurement('resource-stress-test');

            // Verify resource balancing
            const resourceMetrics = await page.evaluate(() => {
                return {
                    memory: performance.memory ? {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize
                    } : null,
                    timing: performance.timing ? {
                        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
                    } : null
                };
            });

            // System should remain functional under stress
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Resource usage should be balanced
            if (resourceMetrics.memory) {
                const memoryUtilization = resourceMetrics.memory.used / resourceMetrics.memory.total;
                expect(memoryUtilization).toBeLessThan(0.95); // Not at memory limit
            }

            // Stress test should complete in reasonable time
            expect(stressTestTime).toBeLessThan(20000); // Under 20 seconds

            console.log(`Resource Stress Test: ${stressTestTime}ms total time`);
        });

        test('should demonstrate performance scaling characteristics', async ({ page }) => {
            const scalingTests = [
                { errorCount: 5, expectedTime: 2000 },
                { errorCount: 15, expectedTime: 4000 },
                { errorCount: 30, expectedTime: 8000 }
            ];

            const scalingResults = [];

            for (const test of scalingTests) {
                await performanceMonitor.startMeasurement(`scaling-${test.errorCount}`);

                // Inject specified number of errors
                for (let i = 0; i < test.errorCount; i++) {
                    await errorInjector.injectJavaScriptError(`Scaling test ${test.errorCount} error ${i}`);
                    await page.waitForTimeout(50); // Small interval
                }

                // Wait for processing
                await page.waitForTimeout(3000);

                const actualTime = await performanceMonitor.endMeasurement(`scaling-${test.errorCount}`);
                scalingResults.push({
                    errorCount: test.errorCount,
                    expectedTime: test.expectedTime,
                    actualTime: actualTime
                });

                // Verify system stability at each scale
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Performance should scale reasonably
                expect(actualTime).toBeLessThan(test.expectedTime);

                // Clear errors for next test
                await errorMonitor.clearCapturedErrors();
                await page.waitForTimeout(1000);
            }

            // Analyze scaling characteristics
            const scalingEfficiency = scalingResults.map((result, index) => {
                if (index === 0) return 1; // Baseline
                const prevResult = scalingResults[index - 1];
                const timeRatio = result.actualTime / prevResult.actualTime;
                const errorRatio = result.errorCount / prevResult.errorCount;
                return errorRatio / timeRatio; // Efficiency = error increase / time increase
            });

            // Scaling should be sub-linear (efficiency > 1 means better than linear scaling)
            scalingEfficiency.forEach(efficiency => {
                expect(efficiency).toBeGreaterThan(0.5); // At least 50% efficiency
            });

            console.log('Scaling Results:', scalingResults);
            console.log('Scaling Efficiency:', scalingEfficiency);
        });
    });

    test.describe('Performance Regression Detection', () => {
        test('should detect performance regressions in error handling', async ({ page }) => {
            // Establish baseline performance
            const baselineRuns = 3;
            const baselineTimes = [];

            for (let run = 0; run < baselineRuns; run++) {
                await performanceMonitor.startMeasurement(`baseline-${run}`);

                // Standard error handling test
                await errorInjector.injectJavaScriptError(`Baseline error ${run}`);
                await errorInjector.injectStorageCorruption();
                await page.waitForTimeout(2000);

                const baselineTime = await performanceMonitor.endMeasurement(`baseline-${run}`);
                baselineTimes.push(baselineTime);

                // Clear state
                await errorMonitor.clearCapturedErrors();
                await page.waitForTimeout(500);
            }

            const baselineAverage = baselineTimes.reduce((a, b) => a + b, 0) / baselineTimes.length;

            // Perform current test runs
            const currentRuns = 3;
            const currentTimes = [];

            for (let run = 0; run < currentRuns; run++) {
                await performanceMonitor.startMeasurement(`current-${run}`);

                // Same standard test
                await errorInjector.injectJavaScriptError(`Current error ${run}`);
                await errorInjector.injectStorageCorruption();
                await page.waitForTimeout(2000);

                const currentTime = await performanceMonitor.endMeasurement(`current-${run}`);
                currentTimes.push(currentTime);

                await errorMonitor.clearCapturedErrors();
                await page.waitForTimeout(500);
            }

            const currentAverage = currentTimes.reduce((a, b) => a + b, 0) / currentTimes.length;

            // Regression analysis
            const performanceChange = (currentAverage - baselineAverage) / baselineAverage;
            const regressionThreshold = 0.2; // 20% performance degradation threshold

            // Performance should not regress significantly
            expect(performanceChange).toBeLessThan(regressionThreshold);

            // Statistical significance check
            const baselineStdDev = Math.sqrt(baselineTimes.reduce((acc, time) => acc + Math.pow(time - baselineAverage, 2), 0) / baselineTimes.length);
            const currentStdDev = Math.sqrt(currentTimes.reduce((acc, time) => acc + Math.pow(time - currentAverage, 2), 0) / currentTimes.length);

            console.log(`Performance Regression Analysis:`);
            console.log(`Baseline: ${baselineAverage.toFixed(2)}ms ± ${baselineStdDev.toFixed(2)}ms`);
            console.log(`Current: ${currentAverage.toFixed(2)}ms ± ${currentStdDev.toFixed(2)}ms`);
            console.log(`Change: ${(performanceChange * 100).toFixed(2)}%`);
        });

        test('should validate performance consistency across browsers', async ({ page, browserName }) => {
            // Browser-specific performance test
            const browserResults = {};

            await performanceMonitor.startMeasurement(`browser-${browserName}`);

            // Standard performance test
            for (let i = 0; i < 8; i++) {
                await errorInjector.injectJavaScriptError(`Browser test ${browserName} error ${i}`);
                await page.waitForTimeout(250);
            }

            await page.waitForTimeout(3000);

            const browserTime = await performanceMonitor.endMeasurement(`browser-${browserName}`);
            browserResults[browserName] = browserTime;

            // Verify functionality across browsers
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Browser performance should be within reasonable range
            // (This would be more meaningful with actual cross-browser data)
            expect(browserTime).toBeLessThan(15000); // Universal threshold

            console.log(`Browser Performance (${browserName}): ${browserTime}ms`);
        });
    });
});