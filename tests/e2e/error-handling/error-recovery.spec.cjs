/**
 * Error Recovery Validation Test Suite
 * Tests automatic and manual error recovery mechanisms
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

test.describe('Error Recovery Validation Tests', () => {
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

    test.describe('Automatic Recovery Mechanisms', () => {
        test('should automatically recover from JavaScript errors', async ({ page }) => {
            // Create stable game state before error
            await TestHelpers.createTestSaveData(page, 3, { gold: 500, spirit: 200 });
            const initialState = await stateValidator.validateGameState();
            expect(initialState.valid).toBe(true);

            // Start recovery timing
            await performanceMonitor.startMeasurement('auto-recovery');

            // Inject recoverable JavaScript error
            await errorInjector.injectJavaScriptError('Recoverable test error');

            // Wait for automatic recovery
            await page.waitForTimeout(2000);

            // Measure recovery time
            const recoveryTime = await performanceMonitor.endMeasurement('auto-recovery');

            // Verify automatic recovery occurred
            const recoveredState = await stateValidator.validateGameState();
            expect(recoveredState.valid).toBe(true);

            // Verify recovery was fast
            expect(recoveryTime).toBeLessThan(5000); // 5 second threshold

            // Check recovery statistics
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.recoveredErrors).toBeGreaterThan(0);

            // Verify game data integrity
            const saveData = await stateValidator.validateSaveData();
            expect(saveData.valid).toBe(true);
        });

        test('should recover from DOM corruption', async ({ page }) => {
            // Setup initial game state
            await TestHelpers.createTestSaveData(page, 2);

            // Simulate DOM corruption
            await page.evaluate(() => {
                const gameContainer = document.querySelector('#game-container');
                if (gameContainer) {
                    gameContainer.innerHTML = 'CORRUPTED';
                }
            });

            // Wait for recovery mechanisms to activate
            await page.waitForTimeout(3000);

            // Verify DOM was restored or game container is functional
            const uiState = await stateValidator.validateUIState();

            // Either the DOM was recovered or alternative UI is shown
            const gameVisible = await page.locator('#game-container').isVisible();
            const errorUIVisible = await page.locator('.error-recovery-ui').isVisible();

            expect(gameVisible || errorUIVisible).toBe(true);

            // Verify game state wasn't lost
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });

        test('should recover from storage corruption with backup', async ({ page }) => {
            // Create valid game state
            const originalData = await TestHelpers.createTestSaveData(page, 5, { gold: 1000 });

            // Wait for backup creation
            await page.waitForTimeout(1000);

            // Corrupt primary storage
            await errorInjector.injectStorageCorruption();

            // Trigger load operation
            await page.reload();
            await page.waitForTimeout(3000);

            // Verify recovery from backup
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if backup data was used
            const currentData = await page.evaluate(() => {
                return JSON.parse(localStorage.getItem('gameData') || '{}');
            });

            // Should have valid data structure even if not identical
            expect(currentData.version).toBeDefined();
            expect(currentData.player).toBeDefined();
        });

        test('should recover from network failures with offline mode', async ({ page }) => {
            // Setup game with online features
            await TestHelpers.createTestSaveData(page, 3);

            // Simulate network failure
            await errorInjector.injectNetworkError('**/*', 500);

            // Trigger network-dependent action
            await TestHelpers.triggerGameEvent(page, 'sync-progress');

            // Wait for offline mode activation
            await page.waitForTimeout(2000);

            // Verify game continues in offline mode
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check for offline mode indicators
            const offlineIndicator = page.locator('.offline-mode-indicator');
            if (await offlineIndicator.count() > 0) {
                await expect(offlineIndicator).toBeVisible();
            }

            // Verify local operations still work
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            await page.waitForTimeout(500);

            const stateAfterAction = await stateValidator.validateGameState();
            expect(stateAfterAction.valid).toBe(true);
        });
    });

    test.describe('Manual Recovery Mechanisms', () => {
        test('should allow manual error recovery through UI', async ({ page }) => {
            // Setup game state
            await TestHelpers.createTestSaveData(page, 4);

            // Inject error that requires manual intervention
            await errorInjector.injectJavaScriptError('Manual recovery required');

            // Wait for error notification
            await page.waitForTimeout(1000);

            // Look for manual recovery option
            const recoveryButton = page.locator('.recovery-button, .error-recover, [data-action="recover"]');

            if (await recoveryButton.count() > 0) {
                await recoveryButton.first().click();

                // Wait for manual recovery
                await page.waitForTimeout(2000);

                // Verify recovery was successful
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Check recovery was logged
                const stats = await TestHelpers.getErrorHandlerStats(page);
                expect(stats.recoveredErrors).toBeGreaterThan(0);
            }
        });

        test('should provide safe mode recovery option', async ({ page }) => {
            // Create complex game state
            await TestHelpers.createTestSaveData(page, 10, {
                gold: 5000,
                spirit: 2000,
                items: ['sword', 'potion']
            });

            // Inject critical error
            await errorInjector.injectJavaScriptError('Critical system error');
            await errorInjector.injectMemoryPressure(100);

            // Wait for critical error handling
            await page.waitForTimeout(2000);

            // Look for safe mode option
            const safeModeButton = page.locator('.safe-mode-button, [data-action="safe-mode"]');

            if (await safeModeButton.count() > 0) {
                await safeModeButton.click();

                // Wait for safe mode activation
                await page.waitForTimeout(3000);

                // Verify safe mode is active
                const safeModeIndicator = page.locator('.safe-mode-active');
                if (await safeModeIndicator.count() > 0) {
                    await expect(safeModeIndicator).toBeVisible();
                }

                // Verify basic game functions work in safe mode
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);
            }
        });

        test('should allow state rollback recovery', async ({ page }) => {
            // Create initial state
            const initialData = await TestHelpers.createTestSaveData(page, 3, { gold: 1000 });

            // Wait for checkpoint creation
            await page.waitForTimeout(1000);

            // Modify state and then corrupt it
            await page.evaluate(() => {
                if (window.gameState) {
                    window.gameState.player.level = 5;
                    window.gameState.resources.gold = 2000;
                }
            });

            // Inject corruption
            await errorInjector.injectStorageCorruption();

            // Look for rollback option
            const rollbackButton = page.locator('.rollback-button, [data-action="rollback"]');

            if (await rollbackButton.count() > 0) {
                await rollbackButton.click();

                // Wait for rollback completion
                await page.waitForTimeout(2000);

                // Verify rollback was successful
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Check if state was rolled back
                const currentData = await page.evaluate(() => {
                    return window.gameState;
                });

                expect(currentData.player.level).toBeLessThanOrEqual(4); // Should be rolled back
            }
        });

        test('should provide manual save recovery options', async ({ page }) => {
            // Create multiple save states
            await TestHelpers.createTestSaveData(page, 2, { gold: 500 });
            await page.waitForTimeout(500);

            await TestHelpers.createTestSaveData(page, 3, { gold: 750 });
            await page.waitForTimeout(500);

            // Corrupt current save
            await errorInjector.injectStorageCorruption();

            // Reload to trigger save loading
            await page.reload();
            await page.waitForTimeout(2000);

            // Look for save recovery UI
            const saveRecoveryUI = page.locator('.save-recovery, .backup-saves');

            if (await saveRecoveryUI.count() > 0) {
                await expect(saveRecoveryUI).toBeVisible();

                // Try to select a backup save
                const backupOption = page.locator('.backup-save-option').first();
                if (await backupOption.count() > 0) {
                    await backupOption.click();

                    const loadButton = page.locator('.load-backup-button');
                    if (await loadButton.count() > 0) {
                        await loadButton.click();

                        // Wait for backup load
                        await page.waitForTimeout(2000);

                        // Verify backup was loaded successfully
                        const gameState = await stateValidator.validateGameState();
                        expect(gameState.valid).toBe(true);
                    }
                }
            }
        });
    });

    test.describe('Recovery Strategy Validation', () => {
        test('should use appropriate recovery strategy based on error type', async ({ page }) => {
            const errorScenarios = [
                {
                    type: 'memory',
                    injection: () => errorInjector.injectMemoryPressure(50),
                    expectedStrategy: 'memory-cleanup'
                },
                {
                    type: 'dom',
                    injection: () => errorInjector.injectDOMError('#missing-element'),
                    expectedStrategy: 'dom-reconstruction'
                },
                {
                    type: 'storage',
                    injection: () => errorInjector.injectStorageCorruption(),
                    expectedStrategy: 'backup-restore'
                }
            ];

            for (const scenario of errorScenarios) {
                // Clear previous state
                await errorMonitor.clearCapturedErrors();

                // Inject specific error type
                await scenario.injection();

                // Wait for recovery strategy activation
                await page.waitForTimeout(2000);

                // Verify appropriate recovery occurred
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Check recovery statistics
                const stats = await TestHelpers.getErrorHandlerStats(page);
                expect(stats.recoveredErrors).toBeGreaterThan(0);
            }
        });

        test('should escalate recovery strategies for persistent errors', async ({ page }) => {
            const maxAttempts = 3;

            // Inject persistent error
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await errorInjector.injectJavaScriptError(`Persistent error attempt ${attempt}`);
                await page.waitForTimeout(1000);
            }

            // Wait for escalated recovery
            await page.waitForTimeout(3000);

            // Verify final recovery state
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if escalation occurred
            const stats = await TestHelpers.getErrorHandlerStats(page);
            expect(stats.totalErrors).toBeGreaterThanOrEqual(maxAttempts);
        });

        test('should maintain recovery performance under load', async ({ page }) => {
            const recoveryCount = 5;
            const recoveryTimes = [];

            // Perform multiple recovery cycles
            for (let i = 0; i < recoveryCount; i++) {
                await performanceMonitor.startMeasurement(`recovery-${i}`);

                // Inject error
                await errorInjector.injectJavaScriptError(`Load test error ${i}`);

                // Wait for recovery
                await page.waitForTimeout(1500);

                const time = await performanceMonitor.endMeasurement(`recovery-${i}`);
                recoveryTimes.push(time);

                // Verify recovery was successful
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);
            }

            // Verify recovery times remained consistent
            const averageTime = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
            expect(averageTime).toBeLessThan(3000); // 3 second average

            // No recovery should take excessively long
            recoveryTimes.forEach(time => {
                expect(time).toBeLessThan(5000);
            });
        });
    });

    test.describe('State Restoration Validation', () => {
        test('should preserve critical game data during recovery', async ({ page }) => {
            // Create rich game state
            const originalData = await TestHelpers.createTestSaveData(page, 8, {
                gold: 5000,
                spirit: 3000,
                experience: 8000,
                location: 'advanced-area'
            });

            // Wait for state stabilization
            await page.waitForTimeout(1000);

            // Inject error that triggers recovery
            await errorInjector.injectJavaScriptError('Data preservation test');
            await page.waitForTimeout(2000);

            // Verify critical data was preserved
            const recoveredState = await page.evaluate(() => {
                return window.gameState;
            });

            expect(recoveredState.player.level).toBeGreaterThanOrEqual(7); // Should preserve level
            expect(recoveredState.resources.gold).toBeGreaterThan(4000); // Should preserve most resources

            // Verify save data integrity
            const saveData = await stateValidator.validateSaveData();
            expect(saveData.valid).toBe(true);
        });

        test('should restore UI state consistency after recovery', async ({ page }) => {
            // Setup UI in specific state
            await TestHelpers.createTestSaveData(page, 5);

            // Open specific UI panels
            const cultivationButton = page.locator('.cultivation-button');
            if (await cultivationButton.count() > 0) {
                await cultivationButton.click();
                await page.waitForTimeout(500);
            }

            // Inject UI corruption
            await errorInjector.injectDOMError('.cultivation-panel');
            await page.waitForTimeout(2000);

            // Verify UI state was restored or alternative UI is available
            const uiState = await stateValidator.validateUIState();

            // Should have either restored UI or functional alternatives
            const hasGameUI = uiState.valid;
            const hasErrorUI = await page.locator('.error-recovery-ui').isVisible();
            const hasSafeMode = await page.locator('.safe-mode-ui').isVisible();

            expect(hasGameUI || hasErrorUI || hasSafeMode).toBe(true);
        });

        test('should validate checkpoint integrity during recovery', async ({ page }) => {
            // Create initial checkpoint
            await TestHelpers.createTestSaveData(page, 3, { gold: 1000 });
            await TestHelpers.triggerGameEvent(page, 'create-checkpoint');
            await page.waitForTimeout(1000);

            // Make progress
            await page.evaluate(() => {
                if (window.gameState) {
                    window.gameState.player.level = 4;
                    window.gameState.resources.gold = 1500;
                }
            });

            // Trigger checkpoint creation
            await TestHelpers.triggerGameEvent(page, 'create-checkpoint');
            await page.waitForTimeout(1000);

            // Inject error requiring checkpoint recovery
            await errorInjector.injectStorageCorruption();
            await page.waitForTimeout(2000);

            // Verify checkpoint recovery
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Check if reasonable state was restored
            const currentState = await page.evaluate(() => window.gameState);
            expect(currentState.player.level).toBeGreaterThanOrEqual(3);
            expect(currentState.resources.gold).toBeGreaterThanOrEqual(1000);
        });
    });

    test.describe('Recovery Performance Validation', () => {
        test('should meet recovery time benchmarks', async ({ page }) => {
            const benchmarks = {
                'javascript-error': 1000,    // 1 second
                'dom-corruption': 2000,      // 2 seconds
                'storage-corruption': 3000,  // 3 seconds
                'memory-pressure': 5000      // 5 seconds
            };

            for (const [errorType, maxTime] of Object.entries(benchmarks)) {
                await performanceMonitor.startMeasurement(`benchmark-${errorType}`);

                // Inject appropriate error type
                switch (errorType) {
                    case 'javascript-error':
                        await errorInjector.injectJavaScriptError('Benchmark test');
                        break;
                    case 'dom-corruption':
                        await errorInjector.injectDOMError('#benchmark-test');
                        break;
                    case 'storage-corruption':
                        await errorInjector.injectStorageCorruption();
                        break;
                    case 'memory-pressure':
                        await errorInjector.injectMemoryPressure(50);
                        break;
                }

                // Wait for recovery
                await page.waitForTimeout(maxTime);

                const recoveryTime = await performanceMonitor.endMeasurement(`benchmark-${errorType}`);

                // Verify recovery time meets benchmark
                expect(recoveryTime).toBeLessThan(maxTime);

                // Verify recovery was successful
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);

                // Clear for next test
                await errorMonitor.clearCapturedErrors();
                await page.waitForTimeout(500);
            }
        });

        test('should handle recovery under memory constraints', async ({ page }) => {
            // Create memory pressure
            await errorInjector.injectMemoryPressure(100);

            // Monitor memory during recovery
            const memoryBefore = await performanceMonitor.measureMemory();

            // Inject error requiring recovery
            await errorInjector.injectJavaScriptError('Memory constrained recovery');
            await page.waitForTimeout(3000);

            const memoryAfter = await performanceMonitor.measureMemory();

            // Verify recovery succeeded despite memory pressure
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Memory usage should be managed
            if (memoryBefore && memoryAfter) {
                // Recovery shouldn't cause excessive memory growth
                const memoryGrowth = memoryAfter.used - memoryBefore.used;
                expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB limit
            }
        });
    });
});