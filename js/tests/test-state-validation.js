/**
 * Test suite for state validation and recovery system
 * Tests SaveManager validation, GameState snapshots/rollback, and RecoveryModal
 */

// Test utilities
const testUtils = {
    log: (message, type = 'info') => {
        const prefix = {
            'info': '✓',
            'error': '✗',
            'warn': '⚠'
        }[type] || 'ℹ';
        console.log(`${prefix} ${message}`);
    },

    assert: (condition, message) => {
        if (condition) {
            testUtils.log(message, 'info');
            return true;
        } else {
            testUtils.log(`FAILED: ${message}`, 'error');
            return false;
        }
    },

    createCorruptedState: () => {
        return {
            player: {
                jade: -100, // Invalid: negative value
                spiritCrystals: 'not a number', // Invalid: wrong type
                shards: null,
                power: NaN // Invalid: NaN
            },
            cultivation: {
                qi: {
                    level: 9999999, // Invalid: out of range
                    experience: -50, // Invalid: negative
                    experienceRequired: 0, // Invalid: should be > 0
                    baseRate: 'invalid', // Invalid: wrong type
                    multiplier: 1.0
                },
                // Missing 'body' and 'dual' required fields
            },
            // Missing 'meta' required field
            realm: {
                current: "Invalid<script>alert('xss')</script>", // Potentially dangerous
                stage: -1 // Invalid: negative
            }
        };
    },

    createValidState: () => {
        return {
            player: {
                jade: 500,
                spiritCrystals: 100,
                shards: 0,
                power: 1.0,
                offlineTime: 0
            },
            cultivation: {
                qi: {
                    level: 5,
                    experience: 50,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                body: {
                    level: 3,
                    experience: 30,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                dual: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 200,
                    baseRate: 0.5,
                    multiplier: 1.0,
                    unlocked: false
                }
            },
            meta: {
                createdAt: Date.now(),
                lastPlayed: Date.now(),
                totalPlayTime: 1000,
                version: '1.0.0'
            }
        };
    }
};

// Test Suite 1: DataValidator Tests
async function testDataValidator() {
    console.log('\n=== Testing DataValidator ===\n');

    // Test 1: Validate corrupted state
    const corruptedState = testUtils.createCorruptedState();
    const validation1 = window.dataValidator.validateGameState(corruptedState, { sanitize: false });
    testUtils.assert(!validation1.isValid, 'Corrupted state should fail validation');
    testUtils.assert(validation1.errors.length > 0, 'Validation should report errors');
    testUtils.log(`Found ${validation1.errors.length} validation errors`, 'info');

    // Test 2: Check corruption detection
    const corruptionCheck = window.dataValidator.checkCorruption(corruptedState);
    testUtils.assert(corruptionCheck.isCorrupted, 'Corruption should be detected');
    testUtils.log(`Corruption severity: ${corruptionCheck.severity}`, 'info');
    testUtils.assert(corruptionCheck.issues.length > 0, 'Should report corruption issues');

    // Test 3: Attempt repair
    const repair = window.dataValidator.repairData(corruptedState);
    testUtils.assert(repair.success, 'Data repair should succeed');
    testUtils.assert(repair.repairs.length > 0, 'Should perform repairs');
    testUtils.log(`Performed ${repair.repairs.length} repairs`, 'info');

    // Test 4: Validate repaired state
    const validation2 = window.dataValidator.validateGameState(repair.data, { sanitize: false });
    testUtils.assert(validation2.isValid, 'Repaired state should be valid');

    // Test 5: Validate clean state
    const validState = testUtils.createValidState();
    const validation3 = window.dataValidator.validateGameState(validState, { sanitize: false });
    testUtils.assert(validation3.isValid, 'Clean state should pass validation');
}

// Test Suite 2: SaveManager Validation Tests
async function testSaveManagerValidation() {
    console.log('\n=== Testing SaveManager Validation ===\n');

    const testKey = 'test_validation_save';

    // Test 1: Save valid data
    const validData = testUtils.createValidState();
    const saveResult1 = await window.saveManager.save(testKey, validData, { validate: true });
    testUtils.assert(saveResult1, 'Valid data should save successfully');

    // Test 2: Load and validate
    const loadResult1 = await window.saveManager.load(testKey, { validate: true, repair: true });
    testUtils.assert(loadResult1 !== null, 'Valid save should load successfully');

    // Test 3: Attempt to save invalid data
    const invalidData = testUtils.createCorruptedState();
    try {
        const saveResult2 = await window.saveManager.save(testKey + '_invalid', invalidData, { validate: true });
        testUtils.assert(!saveResult2, 'Invalid data save should fail');
    } catch (error) {
        testUtils.assert(error.message.includes('validation'), 'Should throw validation error');
    }

    // Test 4: Create corrupted save and test repair on load
    // Manually create a corrupted save
    const corruptedSave = {
        version: '1.0.0',
        timestamp: Date.now(),
        checksum: 'invalid_checksum',
        data: testUtils.createCorruptedState()
    };

    localStorage.setItem(
        window.saveManager._getStorageKey(testKey + '_corrupted'),
        JSON.stringify(corruptedSave)
    );

    const loadResult2 = await window.saveManager.load(testKey + '_corrupted', {
        validate: true,
        repair: true
    });
    testUtils.assert(loadResult2 !== null, 'Corrupted save should be repaired and loaded');

    // Cleanup
    window.saveManager.delete(testKey);
    window.saveManager.delete(testKey + '_corrupted');
}

// Test Suite 3: GameState Snapshot and Rollback Tests
async function testGameStateSnapshots() {
    console.log('\n=== Testing GameState Snapshots ===\n');

    // Test 1: Create snapshot
    const initialState = window.gameState.get('player.jade');
    const snapshotId = window.gameState.createSnapshot('Test snapshot');
    testUtils.assert(snapshotId !== null, 'Snapshot should be created');

    // Test 2: Modify state
    window.gameState.set('player.jade', 999);
    const modifiedState = window.gameState.get('player.jade');
    testUtils.assert(modifiedState === 999, 'State should be modified');

    // Test 3: Rollback to snapshot
    const rollbackResult = window.gameState.rollback(snapshotId);
    testUtils.assert(rollbackResult, 'Rollback should succeed');

    const rolledBackState = window.gameState.get('player.jade');
    testUtils.assert(rolledBackState === initialState, 'State should be restored to snapshot');

    // Test 4: List snapshots
    const snapshots = window.gameState.getSnapshots();
    testUtils.assert(snapshots.length > 0, 'Should have snapshots');
    testUtils.log(`Found ${snapshots.length} snapshots`, 'info');

    // Test 5: Auto-snapshot
    window.gameState.set('player.jade', 1000);
    const autoSnapshotId = window.gameState._createAutoSnapshot('test operation');
    testUtils.assert(autoSnapshotId !== null, 'Auto-snapshot should be created');

    // Test 6: Clear snapshots
    const beforeCount = window.gameState.getSnapshots().length;
    window.gameState.clearSnapshots(true);
    const afterCount = window.gameState.getSnapshots().length;
    testUtils.assert(afterCount === 0, 'All snapshots should be cleared');
    testUtils.log(`Cleared ${beforeCount} snapshots`, 'info');
}

// Test Suite 4: RecoveryModal Tests
async function testRecoveryModal() {
    console.log('\n=== Testing RecoveryModal ===\n');

    // Test 1: Create recovery options
    const context = {
        isRecoverable: true,
        hasBackup: true,
        hasSnapshots: true
    };
    const options = window.RecoveryModal.createDefaultOptions(context);
    testUtils.assert(options.length > 0, 'Should create recovery options');
    testUtils.log(`Created ${options.length} recovery options`, 'info');

    // Test 2: Verify option types
    const hasRepair = options.some(opt => opt.type === 'repair');
    const hasBackup = options.some(opt => opt.type === 'backup');
    const hasRollback = options.some(opt => opt.type === 'rollback');
    testUtils.assert(hasRepair, 'Should include repair option');
    testUtils.assert(hasBackup, 'Should include backup option');
    testUtils.assert(hasRollback, 'Should include rollback option');

    // Test 3: Modal show/hide (visual test, manual verification needed)
    const corruptionInfo = {
        severity: 'moderate',
        issues: ['Test issue 1', 'Test issue 2'],
        isRecoverable: true
    };

    console.log('Opening recovery modal for visual inspection...');
    window.recoveryModal.show(corruptionInfo, options, async (option) => {
        console.log('Recovery option selected:', option);
        return true;
    });

    // Auto-close after 3 seconds for automated testing
    setTimeout(() => {
        if (window.recoveryModal.isOpen) {
            window.recoveryModal.hide();
            testUtils.log('Modal auto-closed', 'info');
        }
    }, 3000);
}

// Test Suite 5: Integration Tests
async function testIntegration() {
    console.log('\n=== Testing Integration ===\n');

    const testKey = 'test_integration';

    // Test 1: Create snapshot, modify, save with validation, rollback
    const snapshot1 = window.gameState.createSnapshot('Before changes');
    window.gameState.set('player.jade', 5000);

    const saveResult = await window.saveManager.save(testKey, window.gameState.getState(), {
        validate: true,
        backup: true
    });
    testUtils.assert(saveResult, 'Should save with validation and backup');

    window.gameState.rollback(snapshot1);
    const jade = window.gameState.get('player.jade');
    testUtils.assert(jade !== 5000, 'Rollback should restore previous state');

    // Test 2: Simulate corruption recovery flow
    const corruptedState = testUtils.createCorruptedState();

    // Try to load corrupted state
    localStorage.setItem(
        window.saveManager._getStorageKey(testKey + '_corrupt'),
        JSON.stringify({
            version: '1.0.0',
            timestamp: Date.now(),
            checksum: 'fake',
            data: corruptedState
        })
    );

    const recovered = await window.saveManager.load(testKey + '_corrupt', {
        validate: true,
        repair: true
    });
    testUtils.assert(recovered !== null, 'Should recover from corrupted save');

    // Cleanup
    window.saveManager.delete(testKey);
    window.saveManager.delete(testKey + '_corrupt');
    window.gameState.clearSnapshots(true);
}

// Main test runner
async function runAllTests() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  State Validation & Recovery Test Suite ║');
    console.log('╚══════════════════════════════════════════╝');

    try {
        await testDataValidator();
        await testSaveManagerValidation();
        await testGameStateSnapshots();
        await testRecoveryModal();
        await testIntegration();

        console.log('\n╔══════════════════════════════════════════╗');
        console.log('║         All Tests Completed              ║');
        console.log('╚══════════════════════════════════════════╝\n');

        return true;
    } catch (error) {
        console.error('\n✗ Test suite failed with error:', error);
        return false;
    }
}

// Auto-run tests if in browser environment
if (typeof window !== 'undefined' && window.dataValidator && window.saveManager && window.gameState) {
    console.log('State validation test suite loaded. Run runAllTests() to execute tests.');
} else {
    console.warn('Required modules not loaded. Ensure DataValidator, SaveManager, and GameState are available.');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testDataValidator,
        testSaveManagerValidation,
        testGameStateSnapshots,
        testRecoveryModal,
        testIntegration,
        testUtils
    };
} else if (typeof window !== 'undefined') {
    window.stateValidationTests = {
        runAllTests,
        testDataValidator,
        testSaveManagerValidation,
        testGameStateSnapshots,
        testRecoveryModal,
        testIntegration
    };
}