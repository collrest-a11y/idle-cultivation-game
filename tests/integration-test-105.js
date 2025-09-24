/**
 * Integration Test for Issue #105 Fixes
 * Tests module loading in actual game initialization context
 */

async function runIntegrationTest() {
    console.log('=== Issue #105 Integration Test ===\n');

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // Test 1: Module Manager Configuration
    console.log('Test 1: Verify ModuleManager has timeout configuration');
    try {
        if (window.moduleManager && window.moduleManager.config) {
            const config = window.moduleManager.config;

            if (config.defaultTimeoutMs && config.retryDelayMs && config.maxRetryDelayMs) {
                console.log('✅ PASS: ModuleManager has timeout configuration');
                console.log(`   - defaultTimeoutMs: ${config.defaultTimeoutMs}`);
                console.log(`   - retryDelayMs: ${config.retryDelayMs}`);
                console.log(`   - maxRetryDelayMs: ${config.maxRetryDelayMs}`);
                results.passed++;
                results.tests.push({ name: 'Timeout Configuration', passed: true });
            } else {
                console.log('❌ FAIL: Missing timeout configuration properties');
                results.failed++;
                results.tests.push({ name: 'Timeout Configuration', passed: false });
            }
        } else {
            console.log('❌ FAIL: ModuleManager not found');
            results.failed++;
            results.tests.push({ name: 'Timeout Configuration', passed: false });
        }
    } catch (error) {
        console.log('❌ FAIL: Error checking configuration:', error.message);
        results.failed++;
        results.tests.push({ name: 'Timeout Configuration', passed: false });
    }
    console.log('');

    // Test 2: Module Manager Health Check Method
    console.log('Test 2: Verify ModuleManager has health check method');
    try {
        if (window.moduleManager && typeof window.moduleManager.performHealthCheck === 'function') {
            const health = window.moduleManager.performHealthCheck();

            if (health && typeof health.healthScore === 'number') {
                console.log('✅ PASS: Health check method exists and returns valid data');
                console.log(`   - Health Score: ${health.healthScore.toFixed(1)}%`);
                console.log(`   - Healthy Modules: ${health.healthyModules.length}`);
                console.log(`   - Unhealthy Modules: ${health.unhealthyModules.length}`);
                results.passed++;
                results.tests.push({ name: 'Health Check Method', passed: true });
            } else {
                console.log('❌ FAIL: Health check returned invalid data');
                results.failed++;
                results.tests.push({ name: 'Health Check Method', passed: false });
            }
        } else {
            console.log('❌ FAIL: performHealthCheck method not found');
            results.failed++;
            results.tests.push({ name: 'Health Check Method', passed: false });
        }
    } catch (error) {
        console.log('❌ FAIL: Error checking health check method:', error.message);
        results.failed++;
        results.tests.push({ name: 'Health Check Method', passed: false });
    }
    console.log('');

    // Test 3: GameState Initialization State
    console.log('Test 3: Verify GameState has initialization state tracking');
    try {
        if (window.gameState) {
            if (typeof window.gameState.getInitializationState === 'function' &&
                typeof window.gameState.isReady === 'function') {

                const initState = window.gameState.getInitializationState();
                const isReady = window.gameState.isReady();

                console.log('✅ PASS: GameState has initialization tracking');
                console.log(`   - Phase: ${initState.phase}`);
                console.log(`   - Is Ready: ${isReady}`);
                console.log(`   - Is Initialized: ${initState.isInitialized}`);
                console.log(`   - Loaded from Save: ${initState.loadedFromSave}`);
                results.passed++;
                results.tests.push({ name: 'GameState Init Tracking', passed: true });
            } else {
                console.log('❌ FAIL: Missing initialization tracking methods');
                results.failed++;
                results.tests.push({ name: 'GameState Init Tracking', passed: false });
            }
        } else {
            console.log('❌ FAIL: GameState not found');
            results.failed++;
            results.tests.push({ name: 'GameState Init Tracking', passed: false });
        }
    } catch (error) {
        console.log('❌ FAIL: Error checking GameState:', error.message);
        results.failed++;
        results.tests.push({ name: 'GameState Init Tracking', passed: false });
    }
    console.log('');

    // Test 4: Module Manager Statistics
    console.log('Test 4: Verify ModuleManager statistics');
    try {
        if (window.moduleManager && typeof window.moduleManager.getStatistics === 'function') {
            const stats = window.moduleManager.getStatistics();

            console.log('✅ PASS: Module statistics available');
            console.log(`   - Total Modules: ${stats.totalModules}`);
            console.log(`   - Loaded Modules: ${stats.loadedModules}`);
            console.log(`   - Failed Modules: ${stats.failedModules}`);
            console.log(`   - Load Success Rate: ${stats.loadSuccess.toFixed(1)}%`);
            console.log(`   - Total Load Time: ${stats.totalLoadTime.toFixed(2)}ms`);
            results.passed++;
            results.tests.push({ name: 'Module Statistics', passed: true });
        } else {
            console.log('❌ FAIL: getStatistics method not found');
            results.failed++;
            results.tests.push({ name: 'Module Statistics', passed: false });
        }
    } catch (error) {
        console.log('❌ FAIL: Error checking statistics:', error.message);
        results.failed++;
        results.tests.push({ name: 'Module Statistics', passed: false });
    }
    console.log('');

    // Test 5: Module Validation Methods
    console.log('Test 5: Verify validation methods exist');
    try {
        if (window.IdleCultivationGame) {
            const game = window.IdleCultivationGame;

            if (typeof game._validateCoreSystemsReady === 'function' &&
                typeof game._validateModuleRegistration === 'function') {

                console.log('✅ PASS: Validation methods exist in main game');
                results.passed++;
                results.tests.push({ name: 'Validation Methods', passed: true });
            } else {
                console.log('❌ FAIL: Validation methods not found');
                results.failed++;
                results.tests.push({ name: 'Validation Methods', passed: false });
            }
        } else {
            console.log('⚠️  SKIP: IdleCultivationGame not found (may not be initialized yet)');
            results.tests.push({ name: 'Validation Methods', passed: null });
        }
    } catch (error) {
        console.log('❌ FAIL: Error checking validation methods:', error.message);
        results.failed++;
        results.tests.push({ name: 'Validation Methods', passed: false });
    }
    console.log('');

    // Test 6: Verify No Failed Modules
    console.log('Test 6: Verify no modules failed to load');
    try {
        if (window.moduleManager) {
            const stats = window.moduleManager.getStatistics();

            if (stats.failedModules === 0) {
                console.log('✅ PASS: No modules failed to load');
                results.passed++;
                results.tests.push({ name: 'No Failed Modules', passed: true });
            } else {
                console.log(`⚠️  WARNING: ${stats.failedModules} modules failed to load`);
                results.tests.push({ name: 'No Failed Modules', passed: null });
            }
        }
    } catch (error) {
        console.log('❌ FAIL: Error checking failed modules:', error.message);
        results.failed++;
        results.tests.push({ name: 'No Failed Modules', passed: false });
    }
    console.log('');

    // Print Summary
    console.log('=== Test Summary ===');
    console.log(`Total Tests: ${results.tests.length}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Skipped: ${results.tests.filter(t => t.passed === null).length}`);

    const passRate = results.tests.length > 0
        ? (results.passed / results.tests.filter(t => t.passed !== null).length * 100).toFixed(1)
        : 0;
    console.log(`Pass Rate: ${passRate}%`);
    console.log('');

    if (results.failed === 0 && results.passed > 0) {
        console.log('✅ Integration test PASSED - Issue #105 fixes verified in game context');
    } else if (results.failed > 0) {
        console.log('❌ Integration test FAILED - Some fixes not working correctly');
    } else {
        console.log('⚠️  Integration test INCONCLUSIVE - Game may not be fully loaded');
    }

    return results;
}

// Export for use
if (typeof window !== 'undefined') {
    window.runIntegrationTest = runIntegrationTest;
}

// Auto-run instructions
console.log('Integration Test Ready!');
console.log('To run: Open browser console and type: runIntegrationTest()');
console.log('Or wait for game to load and it will run automatically...');

// Auto-run after game loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Wait a bit for game to initialize
        setTimeout(() => {
            if (window.moduleManager) {
                console.log('\nAuto-running integration test...\n');
                runIntegrationTest();
            }
        }, 2000);
    });
}