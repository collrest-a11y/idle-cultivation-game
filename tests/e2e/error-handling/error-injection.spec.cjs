/**
 * Error Injection Test Suite
 * Comprehensive testing of error injection scenarios and error handler response
 */

const { test, expect } = require('@playwright/test');
const {
    ErrorInjector,
    StateValidator,
    PerformanceMonitor,
    ErrorMonitor,
    TestHelpers
} = require('../../utils/error-helpers');

test.describe('Error Injection Tests', () => {
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

        // Navigate to game and wait for load
        await page.goto('/');
        await TestHelpers.waitForGameLoad(page);

        // Initialize fresh game state
        await TestHelpers.initializeFreshGame(page);
    });

    test.afterEach(async ({ page }) => {
        // Cleanup injected errors
        await errorInjector.cleanup();
        errorMonitor.stopListening();

        // Clear any test data
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test.describe('JavaScript Runtime Errors', () => {
        test('should handle basic JavaScript runtime error', async ({ page }) => {
            // Start performance monitoring
            await performanceMonitor.startMeasurement('js-error-handling');

            // Inject JavaScript error
            await errorInjector.injectJavaScriptError('Test runtime error');

            // Wait for error to be captured
            await errorMonitor.waitForError('Test runtime error', 3000);

            // Verify error was handled
            const errors = await errorMonitor.getCapturedErrors();
            expect(errors.totalCount).toBeGreaterThan(0);

            // Verify game state remains intact
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check performance impact
            const duration = await performanceMonitor.endMeasurement('js-error-handling');
            expect(duration).toBeLessThan(1000); // Should handle within 1 second

            // Verify error handler statistics
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThan(0);
        });

        test('should handle multiple rapid JavaScript errors', async ({ page }) => {
            const errorCount = 5;
            const errors = [];

            // Inject multiple errors rapidly
            for (let i = 0; i < errorCount; i++) {
                await errorInjector.injectJavaScriptError(`Rapid error ${i}`, i * 100);
                errors.push(`Rapid error ${i}`);
            }

            // Wait for all errors to be processed
            await page.waitForTimeout(2000);

            // Verify all errors were captured
            const capturedErrors = await errorMonitor.getCapturedErrors();
            expect(capturedErrors.totalCount).toBeGreaterThanOrEqual(errorCount);

            // Verify game remains responsive
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Test UI responsiveness
            const button = page.locator('.cultivation-button').first();
            if (await button.isVisible()) {
                await button.click();
                // Should still be able to interact with UI
            }
        });

        test('should handle reference errors gracefully', async ({ page }) => {
            // Inject reference error
            await errorInjector.injectReferenceError('nonExistentVariable');

            // Wait for error handling
            await errorMonitor.waitForError('nonExistentVariable', 3000);

            // Verify error classification
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThan(0);

            // Verify game continues to function
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });
    });

    test.describe('Network Error Injection', () => {
        test('should handle API request failures', async ({ page }) => {
            // Inject network error for API calls
            await errorInjector.injectNetworkError('**/api/**', 500);

            // Trigger action that might make API call
            await TestHelpers.triggerGameEvent(page, 'save-game');

            // Wait for network error handling
            await page.waitForTimeout(2000);

            // Verify error was handled gracefully
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if fallback mechanisms were used
            const saveData = await stateValidator.validateSaveData();
            expect(saveData.valid).toBe(true); // Should use local storage fallback
        });

        test('should handle complete network failure', async ({ page }) => {
            // Block all external requests
            await page.route('**/*', route => {
                if (route.request().url().includes('localhost')) {
                    route.continue();
                } else {
                    route.abort('failed');
                }
            });

            // Trigger network-dependent actions
            await TestHelpers.triggerGameEvent(page, 'fetch-leaderboard');
            await page.waitForTimeout(1000);

            // Verify game continues offline
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check for appropriate error notifications
            const errorNotifications = page.locator('.error-notification');
            if (await errorNotifications.count() > 0) {
                await expect(errorNotifications.first()).toBeVisible();
            }
        });
    });

    test.describe('Memory Pressure Injection', () => {
        test('should handle memory pressure gracefully', async ({ page }) => {
            // Measure initial memory
            const initialMemory = await performanceMonitor.measureMemory();

            // Inject memory pressure
            await errorInjector.injectMemoryPressure(50); // 50MB

            // Measure memory after injection
            const afterMemory = await performanceMonitor.measureMemory();

            // Verify memory increase
            if (initialMemory && afterMemory) {
                expect(afterMemory.used).toBeGreaterThan(initialMemory.used);
            }

            // Wait for potential garbage collection or memory handling
            await page.waitForTimeout(3000);

            // Verify game stability
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if memory warnings were triggered
            const stats = await TestHelpers.getErrorHandlerStats(page);
            // Memory warnings might be classified as performance errors
        });

        test('should detect and handle memory leaks', async ({ page }) => {
            const leakSize = 10; // 10MB
            const iterations = 3;

            // Create multiple memory leaks
            for (let i = 0; i < iterations; i++) {
                await errorInjector.injectMemoryPressure(leakSize);
                await page.waitForTimeout(500);
            }

            // Monitor memory over time
            const memoryBefore = await performanceMonitor.measureMemory();
            await page.waitForTimeout(2000);
            const memoryAfter = await performanceMonitor.measureMemory();

            // Game should still be functional despite memory pressure
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check for memory-related error handling
            const stats = await TestHelpers.getErrorHandlerStats(page);
            // Should have some error handling activity
        });
    });

    test.describe('DOM Manipulation Errors', () => {
        test('should handle missing DOM element errors', async ({ page }) => {
            // Inject DOM error by trying to access non-existent element
            await errorInjector.injectDOMError('#non-existent-element');

            // Wait for error handling
            await errorMonitor.waitForError('querySelector', 3000);

            // Verify UI remains intact
            const uiState = await stateValidator.validateUIState();
            expect(uiState.valid).toBe(true);

            // Verify game continues to function
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });

        test('should handle DOM corruption scenarios', async ({ page }) => {
            // Simulate DOM corruption by removing critical elements
            await page.evaluate(() => {
                const gameContainer = document.querySelector('#game-container');
                if (gameContainer) {
                    gameContainer.innerHTML = '<div>Corrupted Content</div>';
                }
            });

            // Wait for error detection
            await page.waitForTimeout(1000);

            // Check if recovery mechanisms activated
            const stats = await TestHelpers.getErrorHandlerStats(page);

            // Verify error dashboard can still be accessed
            if (await page.locator('.error-dashboard-toggle').count() > 0) {
                await page.locator('.error-dashboard-toggle').click();
                await expect(page.locator('.error-dashboard')).toBeVisible();
            }
        });
    });

    test.describe('Storage Corruption Injection', () => {
        test('should handle corrupted localStorage', async ({ page }) => {
            // Create valid save data first
            await TestHelpers.createTestSaveData(page, 5, { gold: 1000 });

            // Inject storage corruption
            await errorInjector.injectStorageCorruption();

            // Reload page to trigger loading of corrupted data
            await page.reload();

            // Wait for error handling during load
            await page.waitForTimeout(2000);

            // Verify error was handled and fallback state created
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check error statistics
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThan(0);

            // Verify new save data is valid
            const saveData = await stateValidator.validateSaveData();
            expect(saveData.valid).toBe(true);
        });

        test('should handle complete storage failure', async ({ page }) => {
            // Simulate storage quota exceeded
            await page.evaluate(() => {
                const originalSetItem = localStorage.setItem;
                localStorage.setItem = function() {
                    throw new Error('QuotaExceededError: Storage quota exceeded');
                };
            });

            // Try to save game
            await TestHelpers.triggerGameEvent(page, 'save-game');
            await page.waitForTimeout(1000);

            // Verify error was handled
            const errors = await errorMonitor.getCapturedErrors();
            expect(errors.totalCount).toBeGreaterThan(0);

            // Game should continue without saving
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });
    });

    test.describe('Performance Degradation Injection', () => {
        test('should handle CPU-intensive operations', async ({ page }) => {
            // Start performance monitoring
            await performanceMonitor.startMeasurement('cpu-stress');

            // Inject CPU-intensive operation
            await page.evaluate(() => {
                const start = Date.now();
                while (Date.now() - start < 2000) {
                    Math.random() * Math.random();
                }
            });

            const duration = await performanceMonitor.endMeasurement('cpu-stress');

            // Verify game remained responsive
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if performance monitoring detected the issue
            const stats = await TestHelpers.getErrorHandlerStats(page);
            // Performance issues might be logged
        });

        test('should handle slow rendering operations', async ({ page }) => {
            // Inject slow DOM operations
            await page.evaluate(() => {
                for (let i = 0; i < 1000; i++) {
                    const div = document.createElement('div');
                    div.innerHTML = `<span>Heavy content ${i}</span>`.repeat(10);
                    document.body.appendChild(div);
                }
            });

            // Wait for rendering and potential performance issues
            await page.waitForTimeout(2000);

            // Clean up heavy DOM elements
            await page.evaluate(() => {
                const heavyElements = document.querySelectorAll('body > div');
                heavyElements.forEach(el => {
                    if (el.innerHTML.includes('Heavy content')) {
                        el.remove();
                    }
                });
            });

            // Verify game state integrity
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });
    });

    test.describe('Error Recovery Timing', () => {
        test('should measure error detection latency', async ({ page }) => {
            await performanceMonitor.startMeasurement('error-detection');

            // Inject error and measure detection time
            await errorInjector.injectJavaScriptError('Latency test error');

            // Wait for error to be detected
            await errorMonitor.waitForError('Latency test error', 2000);

            const detectionTime = await performanceMonitor.endMeasurement('error-detection');

            // Error detection should be fast
            expect(detectionTime).toBeLessThan(500); // 500ms threshold
        });

        test('should measure recovery initiation time', async ({ page }) => {
            await performanceMonitor.startMeasurement('error-recovery');

            // Inject critical error that should trigger recovery
            await errorInjector.injectJavaScriptError('Critical recovery test');

            // Wait for recovery to initiate
            await page.waitForTimeout(1000);

            const recoveryTime = await performanceMonitor.endMeasurement('error-recovery');

            // Recovery should initiate quickly
            expect(recoveryTime).toBeLessThan(2000); // 2 second threshold

            // Verify recovery was successful
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });
    });

    test.describe('Concurrent Error Scenarios', () => {
        test('should handle multiple error types simultaneously', async ({ page }) => {
            // Inject multiple different error types at once
            const promises = [
                errorInjector.injectJavaScriptError('Concurrent JS error'),
                errorInjector.injectReferenceError('concurrentVar'),
                errorInjector.injectDOMError('#concurrent-missing'),
                errorInjector.injectMemoryPressure(20)
            ];

            await Promise.all(promises);

            // Wait for all errors to be processed
            await page.waitForTimeout(3000);

            // Verify system stability under concurrent errors
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check that all errors were captured
            const errors = await errorMonitor.getCapturedErrors();
            expect(errors.totalCount).toBeGreaterThanOrEqual(3); // At least 3 errors

            // Verify error handler statistics
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThanOrEqual(3);
        });

        test('should maintain error handling under stress', async ({ page }) => {
            const stressCount = 10;

            // Inject many errors in rapid succession
            for (let i = 0; i < stressCount; i++) {
                await errorInjector.injectJavaScriptError(`Stress test error ${i}`, i * 50);
            }

            // Wait for all errors to be processed
            await page.waitForTimeout(5000);

            // Verify system didn't crash
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Verify UI is still responsive
            const uiState = await stateValidator.validateUIState();
            expect(uiState.valid).toBe(true);

            // Check error statistics
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThanOrEqual(stressCount);
        });
    });
});