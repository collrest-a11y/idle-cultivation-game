/**
 * Test suite for Progressive Loading system
 */

// Mock DOM environment
global.document = {
    createElement: () => ({
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
        classList: { add: () => {}, remove: () => {} },
        querySelector: () => null
    }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    getElementById: () => null
};

global.window = {};
global.performance = { now: () => Date.now() };

// Load the ProgressiveLoader
eval(require('fs').readFileSync('./js/core/ProgressiveLoader.js', 'utf8'));

// Mock ModuleManager
class MockModuleManager {
    constructor() {
        this.modules = new Map();
    }

    loadModule(name) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`  - Loaded module: ${name}`);
                resolve({ name });
            }, Math.random() * 100);
        });
    }
}

// Mock EventManager
class MockEventManager {
    constructor() {
        this.events = {};
    }

    emit(event, data) {
        console.log(`Event: ${event}`, data);
    }

    on(event, callback) {
        this.events[event] = callback;
    }
}

// Test Progressive Loading
async function testProgressiveLoading() {
    console.log('Testing Progressive Loading System\n');
    console.log('='.repeat(50));

    const moduleManager = new MockModuleManager();
    const eventManager = new MockEventManager();

    // Register test modules with different priorities
    moduleManager.modules.set('gameState', { name: 'gameState', priority: 95, dependencies: [] });
    moduleManager.modules.set('saveManager', { name: 'saveManager', priority: 92, dependencies: [] });
    moduleManager.modules.set('ui', { name: 'ui', priority: 85, dependencies: [] });
    moduleManager.modules.set('viewManager', { name: 'viewManager', priority: 80, dependencies: [] });
    moduleManager.modules.set('skills', { name: 'skills', priority: 65, dependencies: [] });
    moduleManager.modules.set('combat', { name: 'combat', priority: 60, dependencies: [] });

    const progressiveLoader = new ProgressiveLoader();
    progressiveLoader.initialize({
        moduleManager,
        eventManager
    });

    // Set up callbacks
    progressiveLoader.setCallbacks({
        onPhaseStart: (data) => {
            console.log(`\n[Phase Start] ${data.name}`);
            console.log(`  Description: ${data.description}`);
            console.log(`  Modules: ${data.moduleCount}`);
        },
        onPhaseComplete: (data) => {
            console.log(`\n[Phase Complete] ${data.phase}`);
            console.log(`  Loaded: ${data.results.loaded.length}`);
            console.log(`  Failed: ${data.results.failed.length}`);
            console.log(`  Duration: ${data.results.duration.toFixed(2)}ms`);
        },
        onModuleLoaded: (data) => {
            console.log(`  ✓ ${data.moduleName} (${(data.progress * 100).toFixed(1)}%)`);
        },
        onComplete: (data) => {
            console.log('\n' + '='.repeat(50));
            console.log('[Loading Complete]');
            console.log(`  Total Time: ${data.totalTime.toFixed(2)}ms`);
            console.log(`  Loaded: ${data.loadedModules}/${data.totalModules}`);
            console.log(`  Failed: ${data.failedModules}`);
            console.log('='.repeat(50));
        }
    });

    // Test module classification
    console.log('\nModule Classification Test:');
    console.log('-'.repeat(50));
    for (const [name, module] of moduleManager.modules.entries()) {
        const phase = progressiveLoader.classifyModule(name, module.priority);
        console.log(`  ${name} (priority ${module.priority}) -> ${phase} phase`);
    }

    // Load all phases
    console.log('\n\nLoading Phases Test:');
    console.log('-'.repeat(50));

    try {
        const results = await progressiveLoader.loadAllPhases();

        console.log('\n\nPhase Results Summary:');
        console.log('-'.repeat(50));
        for (const [phase, result] of Object.entries(results.phaseResults)) {
            console.log(`\n${phase}:`);
            console.log(`  Loaded: ${result.loaded.join(', ')}`);
            console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
        }

        // Get progress
        const progress = progressiveLoader.getProgress();
        console.log('\n\nFinal Progress:');
        console.log('-'.repeat(50));
        console.log(`  Phase Progress: ${(progress.phaseProgress * 100).toFixed(1)}%`);
        console.log(`  Module Progress: ${(progress.moduleProgress * 100).toFixed(1)}%`);
        console.log(`  Loaded Modules: ${progress.loadedModules}/${progress.totalModules}`);

        console.log('\n✅ All tests passed!');
        return true;

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        return false;
    }
}

// Run tests
testProgressiveLoading().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});