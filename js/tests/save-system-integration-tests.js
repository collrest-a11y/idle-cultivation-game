/**
 * Comprehensive Save System Integration Tests
 * Tests save/load functionality at all game progression points
 */

class SaveSystemTests {
    constructor() {
        this.testResults = [];
        this.testStates = [];
        this.originalState = null;
        this.isRunning = false;
    }

    /**
     * Run all save system tests
     * @returns {Promise<Object>} Test results summary
     */
    async runAllTests() {
        if (this.isRunning) {
            console.warn('SaveSystemTests: Tests already running');
            return null;
        }

        this.isRunning = true;
        this.testResults = [];
        this.testStates = [];

        console.log('╔══════════════════════════════════════════╗');
        console.log('║     Save System Integration Tests        ║');
        console.log('╚══════════════════════════════════════════╝');

        try {
            // Backup original state
            this.originalState = this.getCurrentGameState();

            // Run test suites
            await this.testBasicSaveLoad();
            await this.testCharacterCreationSave();
            await this.testCultivationProgressSave();
            await this.testCombatStateSave();
            await this.testInventoryFullSave();
            await this.testCorruptedDataHandling();
            await this.testAutoSaveScenarios();
            await this.testMultipleSaveSlots();
            await this.testImportExportFunctionality();
            await this.testMigrationScenarios();
            await this.testErrorRecovery();
            await this.testPerformanceMetrics();

            // Generate report
            const summary = this.generateTestReport();

            // Restore original state
            await this.restoreOriginalState();

            this.isRunning = false;
            return summary;

        } catch (error) {
            console.error('SaveSystemTests: Test suite failed:', error);
            await this.restoreOriginalState();
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Test basic save/load functionality
     */
    async testBasicSaveLoad() {
        const testName = 'Basic Save/Load';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const testData = this.createTestGameState('basic');

            // Test save
            const saveResult = await this.saveTestState('test_basic', testData);
            this.assert(saveResult, 'Should save basic game state');

            // Test load
            const loadedData = await this.loadTestState('test_basic');
            this.assert(loadedData !== null, 'Should load saved game state');
            this.assert(this.deepEqual(testData.player.jade, loadedData.player.jade), 'Player jade should match');
            this.assert(this.deepEqual(testData.cultivation.qi.level, loadedData.cultivation.qi.level), 'Cultivation level should match');

            // Cleanup
            await this.deleteTestSlot('test_basic');

            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test save/load during character creation
     */
    async testCharacterCreationSave() {
        const testName = 'Character Creation Save';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            // Create fresh character creation state
            const charCreationState = this.createTestGameState('character_creation');
            charCreationState.tutorial.completed = false;
            charCreationState.tutorial.currentStep = 1;
            charCreationState.character.origin = 'noble';
            charCreationState.character.vow = 'power';

            // Save during character creation
            const saveResult = await this.saveTestState('test_char_creation', charCreationState);
            this.assert(saveResult, 'Should save during character creation');

            // Load and verify
            const loadedData = await this.loadTestState('test_char_creation');
            this.assert(loadedData !== null, 'Should load character creation save');
            this.assert(loadedData.tutorial.currentStep === 1, 'Tutorial step should be preserved');
            this.assert(loadedData.character.origin === 'noble', 'Character origin should be preserved');
            this.assert(loadedData.character.vow === 'power', 'Character vow should be preserved');

            await this.deleteTestSlot('test_char_creation');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test save/load with advanced cultivation progress
     */
    async testCultivationProgressSave() {
        const testName = 'Cultivation Progress Save';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const advancedState = this.createTestGameState('advanced_cultivation');

            // Set advanced cultivation stats
            advancedState.cultivation.qi.level = 50;
            advancedState.cultivation.qi.experience = 5000;
            advancedState.cultivation.body.level = 35;
            advancedState.cultivation.dual.unlocked = true;
            advancedState.cultivation.dual.level = 10;
            advancedState.realm.current = 'Foundation Building';
            advancedState.realm.stage = 5;

            // Add some scriptures
            advancedState.scriptures.collection = [
                { id: 1, name: 'Test Scripture 1', rarity: 3, power: 100 },
                { id: 2, name: 'Test Scripture 2', rarity: 4, power: 250 }
            ];

            const saveResult = await this.saveTestState('test_cultivation', advancedState);
            this.assert(saveResult, 'Should save advanced cultivation state');

            const loadedData = await this.loadTestState('test_cultivation');
            this.assert(loadedData !== null, 'Should load cultivation save');
            this.assert(loadedData.cultivation.qi.level === 50, 'Qi level should be preserved');
            this.assert(loadedData.cultivation.dual.unlocked === true, 'Dual cultivation unlock should be preserved');
            this.assert(loadedData.realm.current === 'Foundation Building', 'Realm should be preserved');
            this.assert(loadedData.scriptures.collection.length === 2, 'Scripture collection should be preserved');

            await this.deleteTestSlot('test_cultivation');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test save/load during combat
     */
    async testCombatStateSave() {
        const testName = 'Combat State Save';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const combatState = this.createTestGameState('combat');

            // Set combat stats
            combatState.combat.wins = 25;
            combatState.combat.losses = 5;
            combatState.combat.streak = 8;
            combatState.combat.rank = 750;
            combatState.loadout.stats.flatDamage = 150;
            combatState.loadout.stats.damageMultiplier = 2.5;
            combatState.loadout.stats.critChance = 0.15;

            const saveResult = await this.saveTestState('test_combat', combatState);
            this.assert(saveResult, 'Should save combat state');

            const loadedData = await this.loadTestState('test_combat');
            this.assert(loadedData !== null, 'Should load combat save');
            this.assert(loadedData.combat.wins === 25, 'Combat wins should be preserved');
            this.assert(loadedData.combat.streak === 8, 'Win streak should be preserved');
            this.assert(loadedData.loadout.stats.critChance === 0.15, 'Loadout stats should be preserved');

            await this.deleteTestSlot('test_combat');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test save/load with full inventory
     */
    async testInventoryFullSave() {
        const testName = 'Full Inventory Save';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const fullInventoryState = this.createTestGameState('full_inventory');

            // Fill inventory with many items
            const largeCollection = [];
            for (let i = 1; i <= 100; i++) {
                largeCollection.push({
                    id: i,
                    name: `Test Scripture ${i}`,
                    rarity: Math.floor(Math.random() * 5) + 1,
                    power: Math.floor(Math.random() * 1000) + 100,
                    category: ['qi', 'body', 'dual'][i % 3],
                    enhancement: Math.floor(Math.random() * 10)
                });
            }
            fullInventoryState.scriptures.collection = largeCollection;

            // Add complex enhancement data
            fullInventoryState.enhancement = {
                activeEnhancements: { 1: 5, 2: 8, 3: 3 },
                failureProtection: { 1: true, 3: true },
                enhancementQueue: [
                    { scriptureId: 4, level: 2, materials: { stones: 10 } },
                    { scriptureId: 5, level: 4, materials: { stones: 25 } }
                ]
            };

            const saveResult = await this.saveTestState('test_full_inventory', fullInventoryState);
            this.assert(saveResult, 'Should save full inventory state');

            const loadedData = await this.loadTestState('test_full_inventory');
            this.assert(loadedData !== null, 'Should load full inventory save');
            this.assert(loadedData.scriptures.collection.length === 100, 'All scriptures should be preserved');
            this.assert(loadedData.enhancement.enhancementQueue.length === 2, 'Enhancement queue should be preserved');

            // Verify complex data integrity
            const originalItem = fullInventoryState.scriptures.collection[50];
            const loadedItem = loadedData.scriptures.collection[50];
            this.assert(originalItem.power === loadedItem.power, 'Complex item data should match');

            await this.deleteTestSlot('test_full_inventory');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test corrupted data handling
     */
    async testCorruptedDataHandling() {
        const testName = 'Corrupted Data Handling';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            // Create corrupted save data
            const corruptedData = {
                player: {
                    jade: -100, // Invalid negative value
                    spiritCrystals: 'invalid', // Wrong type
                    power: NaN // Invalid number
                },
                cultivation: {
                    qi: {
                        level: 999999, // Out of range
                        experience: -50 // Invalid negative
                    }
                    // Missing required fields
                }
                // Missing meta field
            };

            // Manually create corrupted save
            if (window.saveManager) {
                localStorage.setItem(
                    window.saveManager._getStorageKey('test_corrupted'),
                    JSON.stringify({
                        data: corruptedData,
                        timestamp: Date.now(),
                        checksum: 'invalid_checksum'
                    })
                );
            } else {
                localStorage.setItem('idleCultivationSave_test_corrupted', JSON.stringify(corruptedData));
            }

            // Try to load corrupted data with repair
            const loadedData = await this.loadTestState('test_corrupted', { repair: true });
            this.assert(loadedData !== null, 'Should recover from corrupted data');
            this.assert(loadedData.player.jade >= 0, 'Should repair negative jade value');
            this.assert(typeof loadedData.player.spiritCrystals === 'number', 'Should repair invalid type');
            this.assert(loadedData.cultivation.qi.level < 10000, 'Should repair out-of-range values');

            await this.deleteTestSlot('test_corrupted');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test auto-save scenarios
     */
    async testAutoSaveScenarios() {
        const testName = 'Auto-Save Scenarios';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            // Test auto-save trigger by changes
            if (window.gameSaveSystem) {
                const initialChanges = window.gameSaveSystem.unsavedChanges;

                // Simulate many changes
                for (let i = 0; i < 55; i++) {
                    if (window.eventManager) {
                        window.eventManager.emit('gameState:changed', { source: 'test' });
                    }
                }

                // Wait a bit for auto-save to trigger
                await this.sleep(2000);

                const finalChanges = window.gameSaveSystem.unsavedChanges;
                this.assert(finalChanges < 55, 'Auto-save should trigger on max changes');
            }

            // Test significant event auto-save
            if (window.eventManager && window.gameSaveSystem) {
                const lastSave = window.gameSaveSystem.lastSave;

                // Emit significant event
                window.eventManager.emit('realm:breakthrough', { newRealm: 'Test Realm' });

                // Wait for auto-save
                await this.sleep(1000);

                const newLastSave = window.gameSaveSystem.lastSave;
                this.assert(newLastSave > lastSave, 'Auto-save should trigger on significant events');
            }

            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test multiple save slots
     */
    async testMultipleSaveSlots() {
        const testName = 'Multiple Save Slots';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            // Create different states for different slots
            const slot1Data = this.createTestGameState('slot1');
            slot1Data.player.jade = 1000;
            slot1Data.cultivation.qi.level = 10;

            const slot2Data = this.createTestGameState('slot2');
            slot2Data.player.jade = 2000;
            slot2Data.cultivation.qi.level = 20;

            const slot3Data = this.createTestGameState('slot3');
            slot3Data.player.jade = 3000;
            slot3Data.cultivation.qi.level = 30;

            // Save to different slots
            const save1 = await this.saveTestState('slot1', slot1Data);
            const save2 = await this.saveTestState('slot2', slot2Data);
            const save3 = await this.saveTestState('slot3', slot3Data);

            this.assert(save1 && save2 && save3, 'Should save to multiple slots');

            // Load from different slots and verify independence
            const loaded1 = await this.loadTestState('slot1');
            const loaded2 = await this.loadTestState('slot2');
            const loaded3 = await this.loadTestState('slot3');

            this.assert(loaded1.player.jade === 1000, 'Slot 1 data should be independent');
            this.assert(loaded2.player.jade === 2000, 'Slot 2 data should be independent');
            this.assert(loaded3.player.jade === 3000, 'Slot 3 data should be independent');

            this.assert(loaded1.cultivation.qi.level === 10, 'Slot 1 cultivation should be independent');
            this.assert(loaded2.cultivation.qi.level === 20, 'Slot 2 cultivation should be independent');
            this.assert(loaded3.cultivation.qi.level === 30, 'Slot 3 cultivation should be independent');

            // Cleanup
            await this.deleteTestSlot('slot1');
            await this.deleteTestSlot('slot2');
            await this.deleteTestSlot('slot3');

            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test import/export functionality
     */
    async testImportExportFunctionality() {
        const testName = 'Import/Export Functionality';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const testData = this.createTestGameState('export_test');
            testData.player.jade = 5000;
            testData.cultivation.qi.level = 25;

            // Save test data
            await this.saveTestState('test_export', testData);

            // Export the save
            let exportData;
            if (window.gameSaveSystem) {
                exportData = await window.gameSaveSystem.exportSave('test_export');
            } else {
                // Fallback export
                const saved = localStorage.getItem('idleCultivationSave_test_export');
                exportData = JSON.stringify({ data: JSON.parse(saved), timestamp: Date.now() }, null, 2);
            }

            this.assert(exportData && exportData.length > 0, 'Should export save data');
            this.assert(exportData.includes('5000'), 'Export should contain game data');

            // Delete original and import back
            await this.deleteTestSlot('test_export');

            let importResult;
            if (window.gameSaveSystem) {
                importResult = await window.gameSaveSystem.importSave(exportData, 'test_import');
            } else {
                // Fallback import
                const parsed = JSON.parse(exportData);
                localStorage.setItem('idleCultivationSave_test_import', JSON.stringify(parsed.data));
                importResult = true;
            }

            this.assert(importResult, 'Should import save data');

            // Verify imported data
            const importedData = await this.loadTestState('test_import');
            this.assert(importedData !== null, 'Should load imported data');
            this.assert(importedData.player.jade === 5000, 'Imported jade should match');
            this.assert(importedData.cultivation.qi.level === 25, 'Imported cultivation should match');

            await this.deleteTestSlot('test_import');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test migration scenarios
     */
    async testMigrationScenarios() {
        const testName = 'Migration Scenarios';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            // Create old version save data
            const oldVersionData = {
                player: { jade: 1000, spiritCrystals: 500 },
                cultivation: {
                    qi: { level: 5, experience: 50 },
                    body: { level: 3, experience: 30 }
                    // Missing dual cultivation (new feature)
                },
                meta: { version: '0.9.0', lastPlayed: Date.now() }
                // Missing new fields like realm, loadout, etc.
            };

            // Save old version data directly
            localStorage.setItem('idleCultivationSave_test_migration', JSON.stringify(oldVersionData));

            // Load with migration enabled
            const migratedData = await this.loadTestState('test_migration', { migrate: true });
            this.assert(migratedData !== null, 'Should load and migrate old save');
            this.assert(migratedData.cultivation.dual !== undefined, 'Should add missing dual cultivation');
            this.assert(migratedData.realm !== undefined, 'Should add missing realm data');
            this.assert(migratedData.loadout !== undefined, 'Should add missing loadout data');
            this.assert(migratedData.player.jade === 1000, 'Should preserve existing data');

            await this.deleteTestSlot('test_migration');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test error recovery mechanisms
     */
    async testErrorRecovery() {
        const testName = 'Error Recovery';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const testData = this.createTestGameState('recovery_test');

            // Save valid data first
            await this.saveTestState('test_recovery', testData);

            // Create backup by saving again
            await this.saveTestState('test_recovery', testData);

            // Corrupt the main save
            localStorage.setItem('idleCultivationSave_test_recovery', 'corrupted_json_data{invalid}');

            // Try to load - should recover from backup
            const recoveredData = await this.loadTestState('test_recovery', { repair: true });
            this.assert(recoveredData !== null, 'Should recover from backup when main save is corrupted');

            await this.deleteTestSlot('test_recovery');
            this.logTestResult(testName, true);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    /**
     * Test save system performance
     */
    async testPerformanceMetrics() {
        const testName = 'Performance Metrics';
        console.log(`\n=== Testing ${testName} ===`);

        try {
            const largeState = this.createTestGameState('performance_test');

            // Create large dataset
            const largeCollection = [];
            for (let i = 0; i < 1000; i++) {
                largeCollection.push({
                    id: i,
                    name: `Scripture ${i}`,
                    description: 'A very long description '.repeat(10),
                    rarity: Math.floor(Math.random() * 5) + 1,
                    power: Math.random() * 1000,
                    category: ['qi', 'body', 'dual'][i % 3],
                    effects: Array(10).fill().map((_, j) => ({ type: `effect_${j}`, value: Math.random() }))
                });
            }
            largeState.scriptures.collection = largeCollection;

            // Measure save performance
            const saveStart = performance.now();
            const saveResult = await this.saveTestState('test_performance', largeState);
            const saveTime = performance.now() - saveStart;

            this.assert(saveResult, 'Should save large dataset');
            this.assert(saveTime < 5000, `Save should complete in under 5 seconds (took ${saveTime.toFixed(2)}ms)`);
            console.log(`Save performance: ${saveTime.toFixed(2)}ms for large dataset`);

            // Measure load performance
            const loadStart = performance.now();
            const loadedData = await this.loadTestState('test_performance');
            const loadTime = performance.now() - loadStart;

            this.assert(loadedData !== null, 'Should load large dataset');
            this.assert(loadTime < 3000, `Load should complete in under 3 seconds (took ${loadTime.toFixed(2)}ms)`);
            this.assert(loadedData.scriptures.collection.length === 1000, 'Should load all data items');
            console.log(`Load performance: ${loadTime.toFixed(2)}ms for large dataset`);

            await this.deleteTestSlot('test_performance');
            this.logTestResult(testName, true, `Save: ${saveTime.toFixed(2)}ms, Load: ${loadTime.toFixed(2)}ms`);

        } catch (error) {
            this.logTestResult(testName, false, error.message);
        }
    }

    // Utility methods

    /**
     * Create a test game state
     * @param {string} variant - State variant
     * @returns {Object} Test game state
     */
    createTestGameState(variant = 'basic') {
        const baseState = {
            player: {
                jade: 500,
                spiritCrystals: 100,
                shards: 0,
                power: 1.0,
                offlineTime: 0
            },
            cultivation: {
                qi: { level: 0, experience: 0, experienceRequired: 100, baseRate: 1.0, multiplier: 1.0 },
                body: { level: 0, experience: 0, experienceRequired: 100, baseRate: 1.0, multiplier: 1.0 },
                dual: { level: 0, experience: 0, experienceRequired: 200, baseRate: 0.5, multiplier: 1.0, unlocked: false }
            },
            realm: {
                current: 'Body Refinement',
                stage: 1,
                maxStage: 10,
                breakthroughProgress: 0,
                breakthroughRequired: 1000
            },
            character: { origin: null, vow: null, mark: null, modifiers: {} },
            loadout: {
                slots: { qi: null, body: null, dual: null, extra1: null, extra2: null },
                stats: { flatDamage: 0, damageMultiplier: 1.0, attackSpeed: 1.0, critChance: 0.05, critMultiplier: 2.0, lifesteal: 0, damageReduction: 0 }
            },
            scriptures: { collection: [], nextId: 1 },
            gacha: { pityCounter: 0, currentBanner: 'standard' },
            combat: { wins: 0, losses: 0, streak: 0, rank: 1000 },
            sect: { id: null, name: null, contribution: 0, buffs: [], lastDonation: 0 },
            tutorial: { completed: true, currentStep: 0, completedSteps: [] },
            settings: { autoSave: true, notifications: true, sound: true, theme: 'dark' },
            meta: { createdAt: Date.now(), lastPlayed: Date.now(), totalPlayTime: 0, version: '1.1.0' }
        };

        // Customize based on variant
        switch (variant) {
            case 'character_creation':
                baseState.tutorial.completed = false;
                break;
            case 'advanced_cultivation':
                baseState.cultivation.qi.level = 25;
                baseState.cultivation.body.level = 20;
                baseState.cultivation.dual.unlocked = true;
                break;
            case 'combat':
                baseState.combat.wins = 10;
                baseState.combat.rank = 800;
                break;
        }

        return baseState;
    }

    /**
     * Save test state to specified slot
     * @param {string} slot - Save slot
     * @param {Object} data - Game state data
     * @returns {Promise<boolean>} Success status
     */
    async saveTestState(slot, data) {
        try {
            if (window.gameSaveSystem) {
                return await window.gameSaveSystem.saveGame({ slot: slot, validate: true });
            } else if (window.saveManager) {
                return await window.saveManager.save(slot, data, { validate: true });
            } else {
                localStorage.setItem(`idleCultivationSave_${slot}`, JSON.stringify(data));
                return true;
            }
        } catch (error) {
            console.error(`Failed to save test state to ${slot}:`, error);
            return false;
        }
    }

    /**
     * Load test state from specified slot
     * @param {string} slot - Save slot
     * @param {Object} options - Load options
     * @returns {Promise<Object|null>} Loaded data
     */
    async loadTestState(slot, options = {}) {
        try {
            if (window.gameSaveSystem) {
                return await window.gameSaveSystem.loadGame({ slot: slot, ...options });
            } else if (window.saveManager) {
                return await window.saveManager.load(slot, options);
            } else {
                const data = localStorage.getItem(`idleCultivationSave_${slot}`);
                return data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.error(`Failed to load test state from ${slot}:`, error);
            return null;
        }
    }

    /**
     * Delete test save slot
     * @param {string} slot - Save slot to delete
     */
    async deleteTestSlot(slot) {
        try {
            if (window.gameSaveSystem) {
                await window.gameSaveSystem.deleteSaveSlot(slot);
            } else if (window.saveManager) {
                window.saveManager.delete(slot);
            } else {
                localStorage.removeItem(`idleCultivationSave_${slot}`);
            }
        } catch (error) {
            console.warn(`Failed to delete test slot ${slot}:`, error);
        }
    }

    /**
     * Get current game state
     * @returns {Object} Current game state
     */
    getCurrentGameState() {
        if (window.gameState && window.gameState.isReady()) {
            return window.gameState.getState();
        } else if (window.game && window.game.gameState) {
            return { ...window.game.gameState };
        }
        return null;
    }

    /**
     * Restore original game state
     */
    async restoreOriginalState() {
        if (this.originalState) {
            try {
                if (window.gameState && window.gameState.isReady()) {
                    window.gameState.update(() => this.originalState, { source: 'test_restore' });
                } else if (window.game) {
                    window.game.gameState = { ...this.originalState };
                }
                console.log('SaveSystemTests: Original state restored');
            } catch (error) {
                console.error('SaveSystemTests: Failed to restore original state:', error);
            }
        }
    }

    /**
     * Assert a condition
     * @param {boolean} condition - Condition to check
     * @param {string} message - Assertion message
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
        console.log(`✓ ${message}`);
    }

    /**
     * Deep equality check for objects
     * @param {*} a - First value
     * @param {*} b - Second value
     * @returns {boolean} Whether values are equal
     */
    deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
        if (typeof a !== 'object') return a === b;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!this.deepEqual(a[key], b[key])) return false;
        }

        return true;
    }

    /**
     * Sleep for specified time
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Sleep promise
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log test result
     * @param {string} testName - Test name
     * @param {boolean} passed - Whether test passed
     * @param {string} details - Additional details
     */
    logTestResult(testName, passed, details = '') {
        const result = {
            name: testName,
            passed: passed,
            details: details,
            timestamp: Date.now()
        };

        this.testResults.push(result);

        const icon = passed ? '✅' : '❌';
        const status = passed ? 'PASSED' : 'FAILED';
        console.log(`${icon} ${testName}: ${status}${details ? ` - ${details}` : ''}`);
    }

    /**
     * Generate test report
     * @returns {Object} Test summary
     */
    generateTestReport() {
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;

        const summary = {
            total,
            passed,
            failed,
            successRate: total > 0 ? (passed / total) * 100 : 0,
            results: this.testResults
        };

        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║              TEST SUMMARY                ║');
        console.log('╚══════════════════════════════════════════╝');
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.name}: ${result.details}`);
            });
        }

        console.log('\n✅ Save System Integration Tests Complete\n');

        return summary;
    }
}

// Create and expose test instance
const saveSystemTests = new SaveSystemTests();

// Export for modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SaveSystemTests, saveSystemTests };
} else if (typeof window !== 'undefined') {
    window.SaveSystemTests = SaveSystemTests;
    window.saveSystemTests = saveSystemTests;

    // Auto-run if all dependencies are available
    if (window.StorageUtils && (window.saveManager || window.gameSaveSystem)) {
        console.log('Save System Integration Tests loaded. Run saveSystemTests.runAllTests() to execute.');
    } else {
        console.warn('Save System Integration Tests: Dependencies not fully loaded');
    }
}