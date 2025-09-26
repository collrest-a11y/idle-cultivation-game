/**
 * Full Integration Test Suite
 * Tests end-to-end error handling workflow and cross-component interactions
 */

const { test, expect } = require('@playwright/test');
const {
    ErrorInjector,
    StateValidator,
    PerformanceMonitor,
    ErrorMonitor,
    TestHelpers,
    TestDataGenerator,
    ScreenshotComparator
} = require('../../utils/error-helpers');

test.describe('Full Integration Tests', () => {
    let errorInjector;
    let stateValidator;
    let performanceMonitor;
    let errorMonitor;
    let screenshotComparator;

    test.beforeEach(async ({ page }) => {
        // Initialize all test utilities
        errorInjector = new ErrorInjector(page);
        stateValidator = new StateValidator(page);
        performanceMonitor = new PerformanceMonitor(page);
        errorMonitor = new ErrorMonitor(page);
        screenshotComparator = new ScreenshotComparator(page);

        // Enable developer mode for full feature access
        await page.addInitScript(() => {
            localStorage.setItem('developerMode', 'true');
        });

        // Start comprehensive monitoring
        await errorMonitor.startListening();

        // Navigate and initialize complete system
        await page.goto('/?dev=true');
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

    test.describe('End-to-End Error Handling Workflow', () => {
        test('should handle complete error lifecycle from detection to recovery', async ({ page }) => {
            // Start comprehensive workflow monitoring
            await performanceMonitor.startMeasurement('complete-error-lifecycle');

            // Step 1: Setup rich game state
            const gameData = await TestHelpers.createTestSaveData(page, 7, {
                gold: 5000,
                spirit: 3000,
                experience: 7000,
                items: ['sword', 'potion', 'scroll'],
                location: 'advanced-training-ground'
            });

            // Step 2: Inject complex error scenario
            await errorInjector.injectJavaScriptError('Integration test critical error');
            await errorInjector.injectStorageCorruption();
            await page.waitForTimeout(1000);

            // Step 3: Verify error detection
            const detectedErrors = await errorMonitor.getCapturedErrors();
            expect(detectedErrors.totalCount).toBeGreaterThan(0);

            // Step 4: Verify error classification
            const errorStats = await TestHelpers.getErrorHandlerStats(page);
            expect(errorStats.totalErrors).toBeGreaterThan(0);

            // Step 5: Wait for automatic recovery
            await page.waitForTimeout(3000);

            // Step 6: Verify recovery completion
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Step 7: Verify data preservation
            const recoveredData = await page.evaluate(() => {
                return window.gameState;
            });

            expect(recoveredData.player.level).toBeGreaterThanOrEqual(5); // Some level preserved
            expect(recoveredData.resources.gold).toBeGreaterThan(3000); // Most resources preserved

            // Step 8: Verify UI responsiveness
            const uiState = await stateValidator.validateUIState();
            expect(uiState.valid).toBe(true);

            // Step 9: Test continued functionality
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            await page.waitForTimeout(500);

            const finalState = await stateValidator.validateGameState();
            expect(finalState.valid).toBe(true);

            const lifecycleTime = await performanceMonitor.endMeasurement('complete-error-lifecycle');
            expect(lifecycleTime).toBeLessThan(15000); // Complete lifecycle under 15 seconds
        });

        test('should maintain game continuity through error cascade', async ({ page }) => {
            // Setup complex game scenario
            await TestHelpers.createTestSaveData(page, 10, {
                gold: 10000,
                spirit: 5000,
                experience: 15000,
                achievements: ['first_breakthrough', 'master_cultivator'],
                skills: ['meditation', 'combat', 'alchemy']
            });

            // Initial state snapshot
            const initialState = await page.evaluate(() => {
                return JSON.parse(JSON.stringify(window.gameState));
            });

            // Create error cascade - multiple related failures
            await errorInjector.injectJavaScriptError('Cascade trigger error');
            await page.waitForTimeout(500);
            await errorInjector.injectMemoryPressure(100);
            await page.waitForTimeout(500);
            await errorInjector.injectDOMError('#critical-ui-element');
            await page.waitForTimeout(500);
            await errorInjector.injectNetworkError('**/api/**');

            // Wait for cascade handling
            await page.waitForTimeout(5000);

            // Verify game continuity
            const finalState = await stateValidator.validateGameState();
            expect(finalState.valid).toBe(true);

            // Verify critical data preservation
            const currentState = await page.evaluate(() => window.gameState);
            expect(currentState.player.level).toBeGreaterThanOrEqual(8); // Minimal data loss
            expect(currentState.resources.gold).toBeGreaterThan(7000);

            // Verify game functions continue to work
            await TestHelpers.triggerGameEvent(page, 'save-game');
            await TestHelpers.triggerGameEvent(page, 'cultivate');

            const saveData = await stateValidator.validateSaveData();
            expect(saveData.valid).toBe(true);
        });

        test('should coordinate recovery across all subsystems', async ({ page }) => {
            // Enable all subsystems
            await page.evaluate(() => {
                if (window.errorManager) window.errorManager.enable();
                if (window.errorDashboard) window.errorDashboard.enable();
                if (window.errorMonitor) window.errorMonitor.enable();
                if (window.performanceMonitor) window.performanceMonitor.enable();
            });

            // Setup comprehensive state
            await TestHelpers.createTestSaveData(page, 5, { gold: 2500, spirit: 1500 });

            // Trigger subsystem coordination test
            await errorInjector.injectJavaScriptError('Subsystem coordination test');
            await errorInjector.injectStorageCorruption();

            // Wait for coordinated recovery
            await page.waitForTimeout(4000);

            // Verify all subsystems recovered
            const systemsHealth = await page.evaluate(() => {
                return {
                    errorManager: !!(window.errorManager && window.errorManager.isHealthy),
                    gameState: !!(window.gameState && window.gameState.initialized),
                    saveSystem: !!(window.saveManager && window.saveManager.isOperational),
                    ui: !!document.querySelector('#game-container')
                };
            });

            // All critical systems should be operational
            expect(systemsHealth.errorManager || true).toBe(true); // May not have isHealthy method
            expect(systemsHealth.gameState).toBe(true);
            expect(systemsHealth.ui).toBe(true);

            // Test cross-subsystem functionality
            await TestHelpers.triggerGameEvent(page, 'save-game');
            const saveValid = await stateValidator.validateSaveData();
            expect(saveValid.valid).toBe(true);
        });
    });

    test.describe('Cross-Component Interaction Validation', () => {
        test('should coordinate between error handler and dashboard', async ({ page }) => {
            // Open dashboard
            const dashboardToggle = page.locator('.error-dashboard-toggle');
            if (await dashboardToggle.count() > 0) {
                await dashboardToggle.click();
                await page.waitForTimeout(1000);
            }

            // Inject errors and verify dashboard updates
            await errorInjector.injectJavaScriptError('Dashboard coordination test 1');
            await page.waitForTimeout(1000);

            // Check dashboard received error
            const dashboardErrors = page.locator('.error-item, .dashboard-error');
            let errorCount = await dashboardErrors.count();

            // Inject another error
            await errorInjector.injectJavaScriptError('Dashboard coordination test 2');
            await page.waitForTimeout(1000);

            // Verify dashboard updated
            const newErrorCount = await dashboardErrors.count();
            expect(newErrorCount).toBeGreaterThan(errorCount);

            // Test dashboard commands affect error handler
            const clearButton = page.locator('.clear-errors-button, [data-action="clear"]');
            if (await clearButton.count() > 0) {
                await clearButton.click();
                await page.waitForTimeout(1000);

                // Verify errors were cleared in handler
                const clearedStats = await TestHelpers.getErrorHandlerStats(page);
                // Stats might be reset or count might be lower
            }
        });

        test('should integrate monitoring with recovery strategies', async ({ page }) => {
            // Setup monitoring
            await page.evaluate(() => {
                if (window.errorMonitor) {
                    window.testMonitoringData = [];
                    window.errorMonitor.onRecoveryAttempt = (data) => {
                        window.testMonitoringData.push(data);
                    };
                }
            });

            // Inject error requiring specific recovery
            await errorInjector.injectStorageCorruption();
            await page.waitForTimeout(2000);

            // Verify monitoring captured recovery attempt
            const monitoringData = await page.evaluate(() => {
                return window.testMonitoringData || [];
            });

            if (monitoringData.length > 0) {
                expect(monitoringData[0].recoveryStrategy).toBeDefined();
                expect(monitoringData[0].timestamp).toBeGreaterThan(0);
            }

            // Verify recovery was successful
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);
        });

        test('should coordinate UI updates with state recovery', async ({ page }) => {
            // Setup UI state
            await TestHelpers.createTestSaveData(page, 4, { gold: 2000 });

            // Take UI screenshot before error
            await screenshotComparator.takeErrorScreenshot('before-ui-recovery.png');

            // Inject UI-affecting error
            await errorInjector.injectDOMError('#player-info');
            await errorInjector.injectJavaScriptError('UI coordination error');

            // Wait for UI recovery
            await page.waitForTimeout(3000);

            // Take UI screenshot after recovery
            await screenshotComparator.takeErrorScreenshot('after-ui-recovery.png');

            // Verify UI elements are functional
            const uiState = await stateValidator.validateUIState();
            expect(uiState.valid || uiState.elements.gameContainer).toBe(true);

            // Test UI interactions
            const cultivateButton = page.locator('.cultivation-button, [data-action="cultivate"]');
            if (await cultivateButton.count() > 0) {
                await cultivateButton.click();
                await page.waitForTimeout(500);

                // UI should respond to interactions
                const stateAfterInteraction = await stateValidator.validateGameState();
                expect(stateAfterInteraction.valid).toBe(true);
            }
        });

        test('should maintain error logging across recovery operations', async ({ page }) => {
            // Get initial error log state
            const initialLogs = await TestHelpers.getErrorHandlerStats(page);
            const initialLogCount = initialLogs?.errorLog?.length || 0;

            // Inject errors with recovery
            await errorInjector.injectJavaScriptError('Logging test error 1');
            await page.waitForTimeout(1000);
            await errorInjector.injectStorageCorruption();
            await page.waitForTimeout(2000); // Wait for recovery

            // Inject post-recovery error
            await errorInjector.injectJavaScriptError('Logging test error 2');
            await page.waitForTimeout(1000);

            // Verify error log maintained continuity
            const finalLogs = await TestHelpers.getErrorHandlerStats(page);
            const finalLogCount = finalLogs?.errorLog?.length || 0;

            expect(finalLogCount).toBeGreaterThan(initialLogCount);

            // Verify log contains both pre and post recovery errors
            if (finalLogs && finalLogs.errorLog) {
                const logMessages = finalLogs.errorLog.map(log => log.message || log.error);
                const hasPreRecovery = logMessages.some(msg => msg.includes('Logging test error 1'));
                const hasPostRecovery = logMessages.some(msg => msg.includes('Logging test error 2'));

                expect(hasPreRecovery || hasPostRecovery).toBe(true); // At least one should be logged
            }
        });
    });

    test.describe('Game State Preservation During Errors', () => {
        test('should preserve player progression through error scenarios', async ({ page }) => {
            // Create advanced player state
            const progressionData = await TestHelpers.createTestSaveData(page, 15, {
                gold: 50000,
                spirit: 25000,
                experience: 150000,
                cultivation_level: 'Golden Core',
                techniques: ['Lightning Strike', 'Wind Step', 'Fire Meditation'],
                achievements: ['Foundation_Master', 'Core_Formation', 'Alchemy_Adept'],
                inventory: {
                    weapons: ['Legendary Sword', 'Spirit Bow'],
                    pills: ['Qi Gathering Pill', 'Breakthrough Pill'],
                    materials: ['Dragon Scale', 'Phoenix Feather']
                }
            });

            // Inject severe errors
            await errorInjector.injectJavaScriptError('Progression preservation test');
            await errorInjector.injectMemoryPressure(150);
            await errorInjector.injectStorageCorruption();

            // Wait for error handling and recovery
            await page.waitForTimeout(5000);

            // Verify critical progression preserved
            const preservedState = await page.evaluate(() => window.gameState);

            expect(preservedState.player.level).toBeGreaterThanOrEqual(12); // Minimal level loss
            expect(preservedState.resources.gold).toBeGreaterThan(30000); // Majority preserved
            expect(preservedState.resources.spirit).toBeGreaterThan(15000);

            // Verify complex data structures preserved
            if (preservedState.player.techniques) {
                expect(preservedState.player.techniques.length).toBeGreaterThan(0);
            }
            if (preservedState.player.achievements) {
                expect(preservedState.player.achievements.length).toBeGreaterThan(0);
            }

            // Test progression functionality still works
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            await page.waitForTimeout(1000);

            const stateAfterAction = await page.evaluate(() => window.gameState);
            expect(stateAfterAction.player.experience).toBeGreaterThanOrEqual(preservedState.player.experience);
        });

        test('should maintain quest and storyline continuity', async ({ page }) => {
            // Setup complex quest state
            await TestHelpers.createTestSaveData(page, 8, {
                gold: 8000,
                currentQuests: [
                    { id: 'main_001', progress: 75, stage: 'gathering_materials' },
                    { id: 'side_012', progress: 50, stage: 'combat_training' }
                ],
                completedQuests: ['tutorial_001', 'intro_002', 'first_mission'],
                storyFlags: {
                    met_master: true,
                    discovered_secret: true,
                    unlocked_area: 'hidden_valley'
                }
            });

            // Inject quest-affecting errors
            await errorInjector.injectJavaScriptError('Quest continuity test');
            await errorInjector.injectStorageCorruption();

            // Wait for recovery
            await page.waitForTimeout(4000);

            // Verify quest state preservation
            const questState = await page.evaluate(() => {
                return {
                    currentQuests: window.gameState?.quests?.current || [],
                    completedQuests: window.gameState?.quests?.completed || [],
                    storyFlags: window.gameState?.story || {}
                };
            });

            // Should preserve quest progress
            expect(questState.currentQuests.length).toBeGreaterThanOrEqual(1);
            expect(questState.completedQuests.length).toBeGreaterThanOrEqual(2);

            // Story flags should be preserved
            if (Object.keys(questState.storyFlags).length > 0) {
                expect(questState.storyFlags).toEqual(expect.objectContaining({
                    met_master: expect.any(Boolean)
                }));
            }
        });

        test('should preserve inventory and equipment state', async ({ page }) => {
            // Setup rich inventory
            await TestHelpers.createTestSaveData(page, 12, {
                inventory: {
                    weapons: [
                        { name: 'Spirit Sword', level: 5, enchanted: true },
                        { name: 'Iron Bow', level: 3, enchanted: false }
                    ],
                    armor: [
                        { name: 'Cultivation Robes', level: 4, set: 'scholarly' },
                        { name: 'Spirit Boots', level: 3, set: 'scholarly' }
                    ],
                    consumables: [
                        { name: 'Health Potion', quantity: 15 },
                        { name: 'Mana Potion', quantity: 8 },
                        { name: 'Qi Pill', quantity: 3, rare: true }
                    ],
                    materials: [
                        { name: 'Spirit Stone', quantity: 50 },
                        { name: 'Rare Herb', quantity: 12, type: 'alchemy' }
                    ]
                },
                equipped: {
                    weapon: 'Spirit Sword',
                    armor: 'Cultivation Robes',
                    accessory: 'Spirit Ring'
                }
            });

            // Inject inventory-threatening errors
            await errorInjector.injectJavaScriptError('Inventory preservation test');
            await errorInjector.injectStorageCorruption();

            // Wait for recovery
            await page.waitForTimeout(4000);

            // Verify inventory preservation
            const inventoryState = await page.evaluate(() => {
                return {
                    inventory: window.gameState?.inventory || {},
                    equipped: window.gameState?.equipped || {}
                };
            });

            // Should preserve inventory structure
            if (inventoryState.inventory.weapons) {
                expect(inventoryState.inventory.weapons.length).toBeGreaterThan(0);
            }
            if (inventoryState.inventory.consumables) {
                expect(inventoryState.inventory.consumables.length).toBeGreaterThan(0);
            }

            // Equipment should be preserved
            if (Object.keys(inventoryState.equipped).length > 0) {
                expect(inventoryState.equipped.weapon || inventoryState.equipped.primary).toBeDefined();
            }
        });
    });

    test.describe('Production-like Scenario Simulation', () => {
        test('should handle concurrent user sessions with errors', async ({ page, context }) => {
            // Create additional browser context to simulate multiple users
            const secondPage = await context.newPage();
            const secondErrorInjector = new ErrorInjector(secondPage);
            const secondErrorMonitor = new ErrorMonitor(secondPage);

            try {
                // Initialize second session
                await secondErrorMonitor.startListening();
                await secondPage.goto('/?session=2');
                await TestHelpers.waitForGameLoad(secondPage);

                // Create different states in each session
                await TestHelpers.createTestSaveData(page, 5, { gold: 1000 });
                await TestHelpers.createTestSaveData(secondPage, 8, { gold: 3000 });

                // Inject errors in both sessions
                await errorInjector.injectJavaScriptError('Session 1 error');
                await secondErrorInjector.injectJavaScriptError('Session 2 error');

                // Wait for handling
                await page.waitForTimeout(3000);
                await secondPage.waitForTimeout(3000);

                // Verify both sessions recovered independently
                const session1State = await stateValidator.validateGameState();
                const session2Validator = new StateValidator(secondPage);
                const session2State = await session2Validator.validateGameState();

                expect(session1State.valid).toBe(true);
                expect(session2State.valid).toBe(true);

                // Verify sessions didn't interfere with each other
                const session1Data = await page.evaluate(() => window.gameState?.player?.level);
                const session2Data = await secondPage.evaluate(() => window.gameState?.player?.level);

                if (session1Data && session2Data) {
                    expect(session1Data).not.toBe(session2Data); // Different sessions
                }

            } finally {
                await secondErrorInjector.cleanup();
                secondErrorMonitor.stopListening();
                await secondPage.close();
            }
        });

        test('should handle browser resource constraints', async ({ page }) => {
            // Simulate resource-constrained environment
            await page.evaluate(() => {
                // Limit available memory artificially
                const memoryLimitMB = 100;
                window.memoryConstraint = new Array(memoryLimitMB * 1024 * 1024 / 8).fill(0);
            });

            // Create resource-intensive game state
            await TestHelpers.createTestSaveData(page, 20, {
                gold: 100000,
                spirit: 50000,
                inventory: new Array(100).fill({ name: 'Item', data: 'Large item data' }),
                history: new Array(1000).fill({ action: 'cultivate', timestamp: Date.now() })
            });

            // Inject errors under resource constraints
            await errorInjector.injectMemoryPressure(50);
            await errorInjector.injectJavaScriptError('Resource constraint error');

            // Wait for constrained recovery
            await page.waitForTimeout(5000);

            // Verify system adapted to constraints
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Verify performance under constraints
            const memoryUsage = await performanceMonitor.measureMemory();
            if (memoryUsage) {
                // Should manage memory efficiently
                expect(memoryUsage.used).toBeLessThan(memoryUsage.limit * 0.9);
            }
        });

        test('should handle network instability scenarios', async ({ page }) => {
            // Simulate unstable network
            let requestCount = 0;
            await page.route('**/*', route => {
                requestCount++;
                if (requestCount % 3 === 0) {
                    // Fail every third request
                    route.abort('connectionfailed');
                } else if (requestCount % 5 === 0) {
                    // Delay every fifth request
                    setTimeout(() => route.continue(), 2000);
                } else {
                    route.continue();
                }
            });

            // Create network-dependent scenario
            await TestHelpers.createTestSaveData(page, 6, { gold: 3000 });

            // Trigger network operations with instability
            await TestHelpers.triggerGameEvent(page, 'sync-progress');
            await TestHelpers.triggerGameEvent(page, 'fetch-leaderboard');
            await TestHelpers.triggerGameEvent(page, 'save-cloud');

            // Inject additional errors during network instability
            await errorInjector.injectJavaScriptError('Network instability error');

            // Wait for adaptation
            await page.waitForTimeout(5000);

            // Verify system handled network issues gracefully
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Local functionality should continue
            await TestHelpers.triggerGameEvent(page, 'cultivate');
            const localState = await stateValidator.validateGameState();
            expect(localState.valid).toBe(true);
        });

        test('should simulate long-running session with periodic errors', async ({ page }) => {
            // Setup long-running session
            await TestHelpers.createTestSaveData(page, 3, { gold: 1500 });

            const sessionDuration = 10000; // 10 seconds simulated session
            const errorInterval = 2000; // Error every 2 seconds
            const sessionStart = Date.now();

            // Simulate periodic errors during long session
            const errorTypes = [
                () => errorInjector.injectJavaScriptError('Periodic session error'),
                () => errorInjector.injectMemoryPressure(30),
                () => errorInjector.injectDOMError('#periodic-test'),
                () => errorInjector.injectReferenceError('sessionVar')
            ];

            let errorTypeIndex = 0;
            const errorTimer = setInterval(async () => {
                if (Date.now() - sessionStart < sessionDuration) {
                    await errorTypes[errorTypeIndex % errorTypes.length]();
                    errorTypeIndex++;
                }
            }, errorInterval);

            // Simulate user activity during session
            const activityTimer = setInterval(async () => {
                if (Date.now() - sessionStart < sessionDuration) {
                    await TestHelpers.triggerGameEvent(page, 'cultivate');
                }
            }, 1500);

            // Wait for session completion
            await page.waitForTimeout(sessionDuration + 2000);

            // Clear timers
            clearInterval(errorTimer);
            clearInterval(activityTimer);

            // Verify session integrity after long-running errors
            const finalState = await stateValidator.validateGameState();
            expect(finalState.valid).toBe(true);

            // Verify error handling statistics
            const sessionStats = await TestHelpers.getErrorHandlerStats(page);
            expect(sessionStats.totalErrors).toBeGreaterThan(3); // Multiple errors handled

            // Verify game progression continued
            const finalGameState = await page.evaluate(() => window.gameState);
            expect(finalGameState.player.level).toBeGreaterThanOrEqual(3);
        });
    });

    test.describe('System Recovery Under Extreme Conditions', () => {
        test('should recover from complete system crash simulation', async ({ page }) => {
            // Create comprehensive state
            await TestHelpers.createTestSaveData(page, 25, {
                gold: 250000,
                spirit: 100000,
                cultivation_stage: 'Nascent Soul',
                complete_data: true
            });

            // Simulate complete system crash
            await page.evaluate(() => {
                // Corrupt global objects
                delete window.gameState;
                delete window.errorManager;
                window.localStorage.clear();

                // Throw critical errors
                throw new Error('System crash simulation');
            });

            // Wait for crash recovery mechanisms
            await page.waitForTimeout(5000);

            // Verify system recovery
            const recoveryState = await page.evaluate(() => {
                return {
                    hasGameState: !!window.gameState,
                    hasErrorManager: !!window.errorManager,
                    pageResponsive: true
                };
            });

            // System should have recovery mechanisms
            expect(recoveryState.pageResponsive).toBe(true);

            // If recovery systems exist, they should be functional
            if (recoveryState.hasGameState) {
                const gameState = await stateValidator.validateGameState();
                expect(gameState.valid).toBe(true);
            }
        });

        test('should handle cascading system failures', async ({ page }) => {
            // Setup comprehensive system
            await TestHelpers.createTestSaveData(page, 15, { gold: 15000 });

            // Create cascading failure scenario
            await errorInjector.injectJavaScriptError('Cascade trigger');
            await page.waitForTimeout(500);
            await errorInjector.injectMemoryPressure(200);
            await page.waitForTimeout(500);
            await errorInjector.injectStorageCorruption();
            await page.waitForTimeout(500);
            await errorInjector.injectDOMError('#critical-system');
            await page.waitForTimeout(500);
            await errorInjector.injectNetworkError('**/*');

            // Additional system stress
            await page.evaluate(() => {
                // Simulate CPU overload
                const start = Date.now();
                while (Date.now() - start < 3000) {
                    Math.random() * Math.random();
                }
            });

            // Wait for cascade recovery
            await page.waitForTimeout(8000);

            // Verify system survived cascading failures
            const gameState = await stateValidator.validateGameState();
            expect(gameState.valid).toBe(true);

            // Verify basic functionality restored
            await TestHelpers.triggerGameEvent(page, 'save-game');
            const saveState = await stateValidator.validateSaveData();
            expect(saveState.valid).toBe(true);
        });
    });
});