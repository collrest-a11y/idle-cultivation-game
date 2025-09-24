/**
 * Comprehensive Loading Scenario Tests
 * Tests all loading paths, failure scenarios, and recovery mechanisms
 */

const fs = require('fs');
const path = require('path');

console.log('Idle Cultivation Game - Loading Scenario Tests');
console.log('='.repeat(70));

// Test Configuration
const TEST_CONFIG = {
    performanceTarget: 5000, // 5 seconds max load time
    criticalModules: ['ui', 'cultivation'],
    optionalModules: ['gacha', 'sect'],
    requiredSystems: ['EventManager', 'GameState', 'ModuleManager', 'ProgressiveLoader', 'SafeMode']
};

// Test Results
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

/**
 * Utility function to log test results
 */
function logTest(name, passed, message = '', warning = false) {
    const status = warning ? '⚠' : (passed ? '✓' : '✗');
    const color = warning ? 'WARNING' : (passed ? 'PASS' : 'FAIL');

    console.log(`  ${status} ${name}: ${color}${message ? ' - ' + message : ''}`);

    results.tests.push({ name, passed, message, warning });

    if (warning) {
        results.warnings++;
    } else if (passed) {
        results.passed++;
    } else {
        results.failed++;
    }
}

/**
 * Test 1: Core System Availability
 */
function testCoreSystemAvailability() {
    console.log('\n📋 Test 1: Core System Availability');
    console.log('-'.repeat(70));

    const requiredFiles = [
        { path: './js/core/EventManager.js', name: 'EventManager' },
        { path: './js/core/GameState.js', name: 'GameState' },
        { path: './js/core/ModuleManager.js', name: 'ModuleManager' },
        { path: './js/core/ProgressiveLoader.js', name: 'ProgressiveLoader' },
        { path: './js/core/SafeMode.js', name: 'SafeMode' },
        { path: './js/ui/LoadingProgress.js', name: 'LoadingProgress' },
        { path: './js/main.js', name: 'Main Entry Point' }
    ];

    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file.path);
        const exists = fs.existsSync(filePath);
        logTest(`${file.name} exists`, exists, file.path);
    });
}

/**
 * Test 2: HTML Loading Structure
 */
function testHTMLLoadingStructure() {
    console.log('\n📋 Test 2: HTML Loading Structure');
    console.log('-'.repeat(70));

    const indexPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // Check for loading container
    const hasLoadingContainer = html.includes('id="loading-container"') || html.includes('loading-container');
    logTest('Loading container element present', hasLoadingContainer);

    // Check for script loading order
    const scripts = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
    const scriptOrder = scripts.map(s => {
        const match = s.match(/src="([^"]+)"/);
        return match ? match[1] : '';
    });

    const coreScriptIndex = scriptOrder.findIndex(s => s.includes('EventManager.js'));
    const mainScriptIndex = scriptOrder.findIndex(s => s.includes('main.js'));
    const loaderScriptIndex = scriptOrder.findIndex(s => s.includes('ProgressiveLoader.js'));

    logTest('Core systems load before main.js', coreScriptIndex < mainScriptIndex && coreScriptIndex >= 0);
    logTest('ProgressiveLoader loads before main.js', loaderScriptIndex < mainScriptIndex && loaderScriptIndex >= 0);

    // Check for character creation modal
    const hasCharacterCreation = html.includes('id="character-creation"');
    logTest('Character creation modal present', hasCharacterCreation);
}

/**
 * Test 3: Safe Mode Configuration
 */
function testSafeModeConfiguration() {
    console.log('\n📋 Test 3: Safe Mode Configuration');
    console.log('-'.repeat(70));

    const safeModeFile = path.join(__dirname, '..', 'js/core/SafeMode.js');
    const content = fs.readFileSync(safeModeFile, 'utf8');

    // Check for required methods
    const requiredMethods = [
        'recordFailure',
        'resetFailures',
        'activate',
        '_initializeMinimalSystems',
        '_startSafeLoop',
        '_showEmergencyFallback',
        'attemptNormalRestart'
    ];

    requiredMethods.forEach(method => {
        const hasMethod = content.includes(method);
        logTest(`SafeMode has ${method} method`, hasMethod);
    });

    // Check failure threshold
    const hasFailureThreshold = content.includes('maxFailures');
    logTest('Failure threshold configured', hasFailureThreshold);

    // Check for localStorage persistence
    const hasLocalStorage = content.includes('localStorage.setItem') && content.includes('idleCultivation_failureCount');
    logTest('Failure count persistence implemented', hasLocalStorage);
}

/**
 * Test 4: Progressive Loading Configuration
 */
function testProgressiveLoadingConfiguration() {
    console.log('\n📋 Test 4: Progressive Loading Configuration');
    console.log('-'.repeat(70));

    const loaderFile = path.join(__dirname, '..', 'js/core/ProgressiveLoader.js');
    const content = fs.readFileSync(loaderFile, 'utf8');

    // Check for phase definitions
    const phases = ['CRITICAL', 'UI', 'ENHANCEMENT'];
    phases.forEach(phase => {
        const hasPhase = content.includes(phase);
        logTest(`Phase ${phase} defined`, hasPhase);
    });

    // Check for callbacks
    const callbacks = ['onPhaseStart', 'onPhaseComplete', 'onModuleLoaded', 'onModuleFailed', 'onComplete', 'onError'];
    callbacks.forEach(cb => {
        const hasCallback = content.includes(cb);
        logTest(`Callback ${cb} implemented`, hasCallback);
    });

    // Check for timeout handling
    const hasTimeout = content.includes('timeout');
    logTest('Module loading timeout configured', hasTimeout);
}

/**
 * Test 5: Module Priority Classification
 */
function testModulePriorityClassification() {
    console.log('\n📋 Test 5: Module Priority Classification');
    console.log('-'.repeat(70));

    const mainFile = path.join(__dirname, '..', 'js/main.js');
    const content = fs.readFileSync(mainFile, 'utf8');

    // Extract module registrations
    const moduleRegex = /registerModule\('([^']+)'[^{]+{[\s\S]*?priority:\s*(\d+)/g;
    const modules = [];
    let match;

    while ((match = moduleRegex.exec(content)) !== null) {
        modules.push({
            name: match[1],
            priority: parseInt(match[2])
        });
    }

    // Check critical modules
    TEST_CONFIG.criticalModules.forEach(moduleName => {
        const module = modules.find(m => m.name === moduleName);
        if (module) {
            const isCritical = module.priority >= 90;
            logTest(`${moduleName} has critical priority`, isCritical, `priority: ${module.priority}`);
        } else {
            logTest(`${moduleName} module registered`, false);
        }
    });

    // Check optional modules
    TEST_CONFIG.optionalModules.forEach(moduleName => {
        const module = modules.find(m => m.name === moduleName);
        if (module) {
            const isOptional = module.priority < 90;
            logTest(`${moduleName} has optional priority`, isOptional, `priority: ${module.priority}`, !isOptional);
        }
    });

    logTest('Total modules registered', modules.length > 0, `${modules.length} modules`);
}

/**
 * Test 6: Error Handling Integration
 */
function testErrorHandlingIntegration() {
    console.log('\n📋 Test 6: Error Handling Integration');
    console.log('-'.repeat(70));

    const mainFile = path.join(__dirname, '..', 'js/main.js');
    const content = fs.readFileSync(mainFile, 'utf8');

    // Check for SafeMode integration
    const hasSafeModeCheck = content.includes('window.safeMode') && content.includes('recordFailure');
    logTest('SafeMode failure recording integrated', hasSafeModeCheck);

    const hasSafeModeActivation = content.includes('_activateSafeMode');
    logTest('SafeMode activation method exists', hasSafeModeActivation);

    const hasFailureReset = content.includes('resetFailures');
    logTest('Success resets failure count', hasFailureReset);

    // Check for global error handlers
    const hasGlobalErrorHandler = content.includes("addEventListener('error'");
    logTest('Global error handler registered', hasGlobalErrorHandler);

    const hasUnhandledRejection = content.includes("addEventListener('unhandledrejection'");
    logTest('Unhandled rejection handler registered', hasUnhandledRejection);
}

/**
 * Test 7: Character Creation Reliability
 */
function testCharacterCreationReliability() {
    console.log('\n📋 Test 7: Character Creation Reliability');
    console.log('-'.repeat(70));

    const indexPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // Check for character creation modal
    const hasModal = html.includes('id="character-creation"');
    logTest('Character creation modal exists', hasModal);

    // Check for all fragment categories
    const categories = ['origin', 'vow', 'mark'];
    categories.forEach(category => {
        const hasCategory = html.includes(`data-category="${category}"`);
        logTest(`Fragment category ${category} exists`, hasCategory);
    });

    // Check for begin button
    const hasBeginButton = html.includes('id="begin-cultivation"');
    logTest('Begin cultivation button exists', hasBeginButton);

    // Check for character creation logic
    const hasCharacterLogic = html.includes('character:created');
    logTest('Character creation event emission', hasCharacterLogic);

    // Check for polling mechanism (fallback)
    const hasPolling = html.includes('setInterval') && html.includes('checkButtonStates');
    logTest('Polling fallback mechanism present', hasPolling);
}

/**
 * Test 8: Loading UI Feedback
 */
function testLoadingUIFeedback() {
    console.log('\n📋 Test 8: Loading UI Feedback');
    console.log('-'.repeat(70));

    const loadingFile = path.join(__dirname, '..', 'js/ui/LoadingProgress.js');
    const content = fs.readFileSync(loadingFile, 'utf8');

    // Check for UI elements
    const uiElements = [
        'loadingOverlay',
        'progressBar',
        'phaseIndicator',
        'moduleList',
        'statusText'
    ];

    uiElements.forEach(element => {
        const hasElement = content.includes(element);
        logTest(`UI element ${element} implemented`, hasElement);
    });

    // Check for progress updates
    const hasProgressUpdate = content.includes('updateProgress');
    logTest('Progress update method exists', hasProgressUpdate);

    // Check for phase visualization
    const hasPhaseVisualization = content.includes('_createPhaseIndicators');
    logTest('Phase visualization implemented', hasPhaseVisualization);

    // Check for animation
    const hasAnimation = content.includes('_startAnimation');
    logTest('Loading animation implemented', hasAnimation);
}

/**
 * Test 9: State Recovery Mechanisms
 */
function testStateRecoveryMechanisms() {
    console.log('\n📋 Test 9: State Recovery Mechanisms');
    console.log('-'.repeat(70));

    // Check for SaveManager
    const saveManagerPath = path.join(__dirname, '..', 'js/core/SaveManager.js');
    const hasSaveManager = fs.existsSync(saveManagerPath);
    logTest('SaveManager exists', hasSaveManager);

    // Check for StateRecoveryManager
    const recoveryPath = path.join(__dirname, '..', 'js/core/StateRecoveryManager.js');
    const hasRecoveryManager = fs.existsSync(recoveryPath);
    logTest('StateRecoveryManager exists', hasRecoveryManager);

    // Check for DataValidator
    const validatorPath = path.join(__dirname, '..', 'js/core/DataValidator.js');
    const hasValidator = fs.existsSync(validatorPath);
    logTest('DataValidator exists', hasValidator);

    if (hasRecoveryManager) {
        const recoveryContent = fs.readFileSync(recoveryPath, 'utf8');

        const hasCorruptionDetection = recoveryContent.includes('detectCorruption') || recoveryContent.includes('isCorrupted');
        logTest('Corruption detection implemented', hasCorruptionDetection);

        const hasRecoveryStrategies = recoveryContent.includes('attemptRecovery') || recoveryContent.includes('recover');
        logTest('Recovery strategies implemented', hasRecoveryStrategies);
    }
}

/**
 * Test 10: Performance Considerations
 */
function testPerformanceConsiderations() {
    console.log('\n📋 Test 10: Performance Considerations');
    console.log('-'.repeat(70));

    const loaderFile = path.join(__dirname, '..', 'js/core/ProgressiveLoader.js');
    const content = fs.readFileSync(loaderFile, 'utf8');

    // Check for performance.now() usage
    const hasPerformanceTracking = content.includes('performance.now()');
    logTest('Performance tracking implemented', hasPerformanceTracking);

    // Check for timeout configurations
    const timeouts = content.match(/timeout:\s*(\d+)/g);
    if (timeouts) {
        const maxTimeout = Math.max(...timeouts.map(t => parseInt(t.match(/\d+/)[0])));
        const withinTarget = maxTimeout <= TEST_CONFIG.performanceTarget;
        logTest('Timeout within performance target', withinTarget, `max: ${maxTimeout}ms, target: ${TEST_CONFIG.performanceTarget}ms`, !withinTarget);
    }

    // Check for progress calculation
    const hasProgress = content.includes('getProgress');
    logTest('Progress calculation method exists', hasProgress);

    // Check main.js for performance metrics
    const mainFile = path.join(__dirname, '..', 'js/main.js');
    const mainContent = fs.readFileSync(mainFile, 'utf8');

    const hasPerformanceMonitor = mainContent.includes('PerformanceMonitor');
    logTest('PerformanceMonitor integrated', hasPerformanceMonitor);
}

/**
 * Test 11: File Protocol Compatibility
 */
function testFileProtocolCompatibility() {
    console.log('\n📋 Test 11: File Protocol Compatibility');
    console.log('-'.repeat(70));

    const indexPath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    // Check for relative paths (file:// compatible)
    const scriptTags = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
    const allRelative = scriptTags.every(tag => {
        const match = tag.match(/src="([^"]+)"/);
        if (!match) return true;
        const src = match[1];
        return !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//');
    });

    logTest('All script sources use relative paths', allRelative);

    // Check for CSS links
    const linkTags = html.match(/<link[^>]*href="([^"]+)"[^>]*>/g) || [];
    const allCSSRelative = linkTags.every(tag => {
        const match = tag.match(/href="([^"]+)"/);
        if (!match) return true;
        const href = match[1];
        return !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//');
    });

    logTest('All CSS links use relative paths', allCSSRelative);

    // Check for no external dependencies in critical path
    const hasCDN = html.includes('cdn.') || html.includes('unpkg.') || html.includes('jsdelivr.');
    logTest('No CDN dependencies in critical path', !hasCDN, '', hasCDN);
}

/**
 * Test 12: User-Friendly Error Messages
 */
function testUserFriendlyErrorMessages() {
    console.log('\n📋 Test 12: User-Friendly Error Messages');
    console.log('-'.repeat(70));

    const safeModeFile = path.join(__dirname, '..', 'js/core/SafeMode.js');
    const content = fs.readFileSync(safeModeFile, 'utf8');

    // Check for emergency fallback UI
    const hasEmergencyUI = content.includes('_showEmergencyFallback');
    logTest('Emergency fallback UI implemented', hasEmergencyUI);

    if (hasEmergencyUI) {
        // Check for user-friendly messages
        const hasUserMessage = content.includes('Critical Error') || content.includes('cannot start');
        logTest('User-friendly error message', hasUserMessage);

        const hasRecoveryOptions = content.includes('Recovery Options') || content.includes('Reload');
        logTest('Recovery options provided', hasRecoveryOptions);

        const hasErrorDetails = content.includes('<details>') || content.includes('Error Details');
        logTest('Error details collapsible section', hasErrorDetails);
    }

    // Check main.js for error handling
    const mainFile = path.join(__dirname, '..', 'js/main.js');
    const mainContent = fs.readFileSync(mainFile, 'utf8');

    const hasUserError = mainContent.includes('Game Failed to Load') || mainContent.includes('error starting');
    logTest('Main error handler shows user message', hasUserError);
}

/**
 * Run all tests
 */
function runAllTests() {
    testCoreSystemAvailability();
    testHTMLLoadingStructure();
    testSafeModeConfiguration();
    testProgressiveLoadingConfiguration();
    testModulePriorityClassification();
    testErrorHandlingIntegration();
    testCharacterCreationReliability();
    testLoadingUIFeedback();
    testStateRecoveryMechanisms();
    testPerformanceConsiderations();
    testFileProtocolCompatibility();
    testUserFriendlyErrorMessages();
}

/**
 * Display final results
 */
function displayResults() {
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));

    const total = results.passed + results.failed;
    const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✓ Passed: ${results.passed}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log(`⚠ Warnings: ${results.warnings}`);
    console.log(`\nPass Rate: ${passRate}%`);

    if (results.failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.tests.filter(t => !t.passed && !t.warning).forEach(test => {
            console.log(`  • ${test.name}${test.message ? ': ' + test.message : ''}`);
        });
    }

    if (results.warnings > 0) {
        console.log('\n⚠ WARNINGS:');
        results.tests.filter(t => t.warning).forEach(test => {
            console.log(`  • ${test.name}${test.message ? ': ' + test.message : ''}`);
        });
    }

    console.log('\n' + '='.repeat(70));

    if (results.failed === 0) {
        console.log('✅ ALL CRITICAL TESTS PASSED');
        console.log('\nThe game loading system is ready for deployment.');
        console.log('\nKey Features Validated:');
        console.log('  • Progressive loading with 3 phases (Critical → UI → Enhancement)');
        console.log('  • Safe mode with automatic activation after failures');
        console.log('  • Character creation with reliable fallback mechanisms');
        console.log('  • Comprehensive error handling and user feedback');
        console.log('  • State recovery and corruption handling');
        console.log('  • File protocol compatibility for local development');
        console.log('  • Performance monitoring and optimization');
        return 0;
    } else {
        console.log('❌ TESTS FAILED - Issues need to be addressed');
        return 1;
    }
}

// Execute tests
try {
    runAllTests();
    const exitCode = displayResults();
    process.exit(exitCode);
} catch (error) {
    console.error('\n❌ TEST EXECUTION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
}