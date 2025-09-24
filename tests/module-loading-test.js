/**
 * Module Loading Test Suite
 * Tests for Issue #105 - Fix Module Loading Order
 *
 * This test validates:
 * - Timeout protection for module loading
 * - Enhanced error handling with validation
 * - Module health check mechanism
 * - Initialization state tracking
 */

class ModuleLoadingTest {
    constructor() {
        this.testResults = [];
        this.passed = 0;
        this.failed = 0;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('=== Module Loading Test Suite ===');
        console.log('Testing Issue #105 fixes...\n');

        await this.testTimeoutProtection();
        await this.testModuleValidation();
        await this.testHealthCheck();
        await this.testInitializationState();
        await this.testRetryWithBackoff();
        await this.testCoreSystemValidation();

        this.printResults();
    }

    /**
     * Test 1: Timeout Protection
     */
    async testTimeoutProtection() {
        const testName = 'Timeout Protection';
        console.log(`Running: ${testName}`);

        try {
            // Create a mock ModuleManager
            const moduleManager = new ModuleManager();

            // Register a module that takes too long
            let timeoutOccurred = false;

            moduleManager.registerModule('timeout-test', {
                factory: async (context) => {
                    // Simulate hanging operation
                    await new Promise(resolve => setTimeout(resolve, 35000)); // Exceeds 30s timeout
                    return { init: async () => {} };
                },
                dependencies: [],
                priority: 100,
                timeoutMs: 1000 // 1 second timeout for testing
            });

            // Mock core systems
            moduleManager.setCoreystems({
                eventManager: { emit: () => {} },
                gameState: { get: () => ({}) },
                timeManager: {},
                gameLoop: {}
            });

            try {
                await moduleManager.loadAllModules();
                this.recordTest(testName, false, 'Should have timed out but did not');
            } catch (error) {
                if (error.message.includes('timed out')) {
                    this.recordTest(testName, true, 'Timeout protection working correctly');
                } else {
                    this.recordTest(testName, false, `Wrong error: ${error.message}`);
                }
            }
        } catch (error) {
            this.recordTest(testName, false, `Test setup failed: ${error.message}`);
        }
    }

    /**
     * Test 2: Module Validation
     */
    async testModuleValidation() {
        const testName = 'Module Validation';
        console.log(`Running: ${testName}`);

        try {
            const moduleManager = new ModuleManager();

            // Register a module that returns invalid instance
            moduleManager.registerModule('invalid-module', {
                factory: async () => null, // Returns null - should fail validation
                dependencies: [],
                priority: 100
            });

            moduleManager.setCoreystems({
                eventManager: { emit: () => {} },
                gameState: { get: () => ({}) },
                timeManager: {},
                gameLoop: {}
            });

            try {
                await moduleManager.loadAllModules();
                this.recordTest(testName, false, 'Should have failed validation');
            } catch (error) {
                if (error.message.includes('validation failed') || error.message.includes('null/undefined')) {
                    this.recordTest(testName, true, 'Module validation working correctly');
                } else {
                    this.recordTest(testName, false, `Wrong error: ${error.message}`);
                }
            }
        } catch (error) {
            this.recordTest(testName, false, `Test setup failed: ${error.message}`);
        }
    }

    /**
     * Test 3: Health Check Mechanism
     */
    async testHealthCheck() {
        const testName = 'Health Check Mechanism';
        console.log(`Running: ${testName}`);

        try {
            const moduleManager = new ModuleManager();

            // Register a healthy module
            moduleManager.registerModule('healthy-module', {
                factory: async () => ({
                    init: async () => {},
                    update: (dt) => {}
                }),
                dependencies: [],
                priority: 100
            });

            moduleManager.setCoreystems({
                eventManager: { emit: () => {} },
                gameState: { get: () => ({}) },
                timeManager: {},
                gameLoop: {}
            });

            await moduleManager.loadAllModules();

            // Perform health check
            const healthReport = moduleManager.performHealthCheck();

            if (healthReport.healthScore === 100 && healthReport.healthyModules.length === 1) {
                this.recordTest(testName, true, `Health check passed: ${healthReport.healthScore}% healthy`);
            } else {
                this.recordTest(testName, false, `Unexpected health score: ${healthReport.healthScore}%`);
            }
        } catch (error) {
            this.recordTest(testName, false, `Test failed: ${error.message}`);
        }
    }

    /**
     * Test 4: Initialization State Tracking
     */
    async testInitializationState() {
        const testName = 'Initialization State Tracking';
        console.log(`Running: ${testName}`);

        try {
            const gameState = new GameState();

            // Check initial state
            let initState = gameState.getInitializationState();

            if (initState.phase !== 'none') {
                this.recordTest(testName, false, 'Initial phase should be "none"');
                return;
            }

            // Mock SaveManager
            const mockSaveManager = {
                load: async () => null
            };

            gameState.setSaveManager(mockSaveManager);

            // Try to load (will fail but should track state)
            await gameState.load();

            initState = gameState.getInitializationState();

            if (initState.isInitialized && initState.phase === 'ready') {
                this.recordTest(testName, true, 'Initialization state tracking working');
            } else {
                this.recordTest(testName, false, `Wrong state: phase=${initState.phase}, initialized=${initState.isInitialized}`);
            }
        } catch (error) {
            this.recordTest(testName, false, `Test failed: ${error.message}`);
        }
    }

    /**
     * Test 5: Retry with Exponential Backoff
     */
    async testRetryWithBackoff() {
        const testName = 'Retry with Exponential Backoff';
        console.log(`Running: ${testName}`);

        try {
            const moduleManager = new ModuleManager();
            let attemptCount = 0;

            moduleManager.registerModule('retry-module', {
                factory: async () => {
                    attemptCount++;
                    if (attemptCount < 3) {
                        throw new Error('Simulated failure');
                    }
                    return {
                        init: async () => {}
                    };
                },
                dependencies: [],
                priority: 100
            });

            moduleManager.setCoreystems({
                eventManager: { emit: () => {} },
                gameState: { get: () => ({}) },
                timeManager: {},
                gameLoop: {}
            });

            await moduleManager.loadAllModules();

            if (attemptCount === 3) {
                this.recordTest(testName, true, `Retry logic worked: ${attemptCount} attempts`);
            } else {
                this.recordTest(testName, false, `Wrong attempt count: ${attemptCount}`);
            }
        } catch (error) {
            this.recordTest(testName, false, `Test failed: ${error.message}`);
        }
    }

    /**
     * Test 6: Core System Validation
     */
    async testCoreSystemValidation() {
        const testName = 'Core System Validation';
        console.log(`Running: ${testName}`);

        try {
            const moduleManager = new ModuleManager();

            moduleManager.registerModule('test-module', {
                factory: async () => ({ init: async () => {} }),
                dependencies: [],
                priority: 100
            });

            // Don't set core systems - should fail validation
            try {
                await moduleManager.loadAllModules();
                this.recordTest(testName, false, 'Should have failed core system validation');
            } catch (error) {
                if (error.message.includes('missing core systems')) {
                    this.recordTest(testName, true, 'Core system validation working');
                } else {
                    this.recordTest(testName, false, `Wrong error: ${error.message}`);
                }
            }
        } catch (error) {
            this.recordTest(testName, false, `Test setup failed: ${error.message}`);
        }
    }

    /**
     * Record test result
     */
    recordTest(name, passed, message) {
        this.testResults.push({ name, passed, message });

        if (passed) {
            this.passed++;
            console.log(`✅ PASS: ${name} - ${message}`);
        } else {
            this.failed++;
            console.log(`❌ FAIL: ${name} - ${message}`);
        }
        console.log('');
    }

    /**
     * Print final results
     */
    printResults() {
        console.log('=== Test Results ===');
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        console.log(`Success Rate: ${((this.passed / this.testResults.length) * 100).toFixed(1)}%`);

        if (this.failed > 0) {
            console.log('\n❌ Some tests failed. Review the issues above.');
        } else {
            console.log('\n✅ All tests passed! Issue #105 fixes validated.');
        }
    }
}

// Export for use in browser or node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModuleLoadingTest };
} else if (typeof window !== 'undefined') {
    window.ModuleLoadingTest = ModuleLoadingTest;
}

// Auto-run if executed directly
if (typeof window !== 'undefined' && window.location) {
    // Browser environment - wait for DOM
    document.addEventListener('DOMContentLoaded', async () => {
        const tester = new ModuleLoadingTest();
        await tester.runAllTests();
    });
}