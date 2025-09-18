/**
 * Combat System Integration Test
 * Tests the combat system components to ensure they work together correctly
 */

// Simple test framework
class CombatSystemTest {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Add a test case
     * @param {string} name - Test name
     * @param {Function} testFn - Test function
     */
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('Combat System Integration Test: Starting...');

        for (const test of this.tests) {
            try {
                console.log(`Running test: ${test.name}`);
                await test.testFn();
                this.results.passed++;
                console.log(`✓ ${test.name} - PASSED`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({ test: test.name, error: error.message });
                console.error(`✗ ${test.name} - FAILED:`, error.message);
            }
        }

        this._printResults();
    }

    /**
     * Print test results
     */
    _printResults() {
        console.log('\n=== Combat System Test Results ===');
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);

        if (this.results.errors.length > 0) {
            console.log('\nErrors:');
            this.results.errors.forEach(error => {
                console.log(`- ${error.test}: ${error.error}`);
            });
        }

        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed! Combat system is ready.');
        } else {
            console.log('\n⚠️ Some tests failed. Please check the implementation.');
        }
    }

    /**
     * Assert function for tests
     * @param {boolean} condition - Condition to check
     * @param {string} message - Error message if assertion fails
     */
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Assert equality
     * @param {*} actual - Actual value
     * @param {*} expected - Expected value
     * @param {string} message - Error message
     */
    assertEqual(actual, expected, message = `Expected ${expected}, got ${actual}`) {
        this.assert(actual === expected, message);
    }

    /**
     * Assert that value is defined
     * @param {*} value - Value to check
     * @param {string} message - Error message
     */
    assertDefined(value, message = 'Value should be defined') {
        this.assert(value !== undefined && value !== null, message);
    }

    /**
     * Assert that value is a number
     * @param {*} value - Value to check
     * @param {string} message - Error message
     */
    assertNumber(value, message = 'Value should be a number') {
        this.assert(typeof value === 'number' && !isNaN(value), message);
    }
}

// Create test instance
const combatTest = new CombatSystemTest();

// Test data validation
combatTest.addTest('Combat Data Structures', async () => {
    combatTest.assertDefined(window.COMBAT_ACTIONS, 'COMBAT_ACTIONS should be defined');
    combatTest.assertDefined(window.COMBAT_FORMULAS, 'COMBAT_FORMULAS should be defined');
    combatTest.assertDefined(window.COMBAT_OPPONENTS, 'COMBAT_OPPONENTS should be defined');
    combatTest.assertDefined(window.RANKING_CONFIG, 'RANKING_CONFIG should be defined');
    combatTest.assertDefined(window.TOURNAMENT_CONFIG, 'TOURNAMENT_CONFIG should be defined');

    // Test formula functions exist
    combatTest.assertDefined(window.COMBAT_FORMULAS.basePower, 'basePower formula should exist');
    combatTest.assertDefined(window.COMBAT_FORMULAS.totalCombatPower, 'totalCombatPower formula should exist');
    combatTest.assertDefined(window.COMBAT_FORMULAS.calculateDamage, 'calculateDamage formula should exist');
});

// Test PowerCalculator
combatTest.addTest('PowerCalculator Functionality', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;

    combatTest.assertDefined(gameState, 'GameState should be available');
    combatTest.assertDefined(eventManager, 'EventManager should be available');

    const powerCalculator = new window.PowerCalculator(gameState, eventManager);
    combatTest.assertDefined(powerCalculator, 'PowerCalculator should be created');

    // Test power calculation
    const playerPower = powerCalculator.calculatePlayerPower();
    combatTest.assertNumber(playerPower, 'Player power should be a number');
    combatTest.assert(playerPower > 0, 'Player power should be positive');

    // Test power breakdown
    const breakdown = powerCalculator.calculatePlayerPower({ breakdown: true });
    combatTest.assertDefined(breakdown.total, 'Power breakdown should include total');
    combatTest.assertDefined(breakdown.base, 'Power breakdown should include base');
    combatTest.assertNumber(breakdown.total, 'Total power should be a number');

    // Test power tier
    const tier = powerCalculator.getPowerTier(playerPower);
    combatTest.assertDefined(tier.name, 'Power tier should have a name');
    combatTest.assertDefined(tier.color, 'Power tier should have a color');
});

// Test RankingSystem
combatTest.addTest('RankingSystem Functionality', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;

    const rankingSystem = new window.RankingSystem(gameState, eventManager);
    await rankingSystem.initialize();

    // Test initial rating
    const initialRating = rankingSystem.getPlayerRating();
    combatTest.assertNumber(initialRating, 'Initial rating should be a number');
    combatTest.assertEqual(initialRating, 1000, 'Initial rating should be 1000');

    // Test tier info
    const tierInfo = rankingSystem.getTierInfo();
    combatTest.assertDefined(tierInfo.name, 'Tier should have a name');
    combatTest.assertEqual(tierInfo.name, 'Bronze', 'Initial tier should be Bronze');

    // Test rating update
    const updateResult = rankingSystem.updateRatings('player', 'ai_opponent', 'victory', {
        opponentRating: 1000
    });
    combatTest.assertDefined(updateResult, 'Rating update should return result');
    combatTest.assert(updateResult.newRating > initialRating, 'Rating should increase after victory');
});

// Test CombatSystem basic functionality
combatTest.addTest('CombatSystem Basic Functionality', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;
    const powerCalculator = new window.PowerCalculator(gameState, eventManager);

    const combatSystem = new window.CombatSystem(gameState, eventManager, powerCalculator);
    await combatSystem.initialize();

    // Test statistics
    const stats = combatSystem.getStatistics();
    combatTest.assertDefined(stats, 'Combat statistics should be available');
    combatTest.assertNumber(stats.combatsStarted, 'Combat starts should be a number');

    // Test combat data validation (without starting actual combat)
    combatTest.assert(combatSystem.isInitialized, 'Combat system should be initialized');
});

// Test DuelManager AI generation
combatTest.addTest('DuelManager AI Generation', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;
    const powerCalculator = new window.PowerCalculator(gameState, eventManager);
    const combatSystem = new window.CombatSystem(gameState, eventManager, powerCalculator);
    const rankingSystem = new window.RankingSystem(gameState, eventManager);

    await combatSystem.initialize();
    await rankingSystem.initialize();

    const duelManager = new window.DuelManager(
        gameState, eventManager, combatSystem, powerCalculator, rankingSystem
    );
    await duelManager.initialize();

    // Test AI opponent generation
    const opponents = duelManager.getAvailableOpponents();
    combatTest.assert(Array.isArray(opponents), 'Available opponents should be an array');
    combatTest.assert(opponents.length > 0, 'Should have available opponents');

    const opponent = opponents[0];
    combatTest.assertDefined(opponent.name, 'Opponent should have a name');
    combatTest.assertNumber(opponent.power, 'Opponent should have power');
    combatTest.assertDefined(opponent.difficulty, 'Opponent should have difficulty rating');
});

// Test TournamentSystem basic functionality
combatTest.addTest('TournamentSystem Basic Functionality', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;
    const powerCalculator = new window.PowerCalculator(gameState, eventManager);
    const combatSystem = new window.CombatSystem(gameState, eventManager, powerCalculator);
    const rankingSystem = new window.RankingSystem(gameState, eventManager);

    await combatSystem.initialize();
    await rankingSystem.initialize();

    const tournamentSystem = new window.TournamentSystem(
        gameState, eventManager, combatSystem, powerCalculator, rankingSystem
    );
    await tournamentSystem.initialize();

    // Test tournament creation
    const createResult = tournamentSystem.createTournament('daily', { autoStart: false });
    combatTest.assert(createResult.success, 'Tournament creation should succeed');
    combatTest.assertDefined(createResult.tournamentId, 'Should return tournament ID');

    // Test available tournaments
    const tournaments = tournamentSystem.getAvailableTournaments();
    combatTest.assert(Array.isArray(tournaments), 'Available tournaments should be an array');
    combatTest.assert(tournaments.length > 0, 'Should have available tournaments');
});

// Test CombatIntegration
combatTest.addTest('CombatIntegration Full System', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;

    const combatIntegration = new window.CombatIntegration(gameState, eventManager);
    await combatIntegration.initialize();

    // Test system status
    const status = combatIntegration.getSystemStatus();
    combatTest.assert(status.isInitialized, 'Combat integration should be initialized');
    combatTest.assertEqual(status.healthStatus.overall, 'healthy', 'Overall health should be healthy');

    // Test all systems are available
    combatTest.assertDefined(combatIntegration.powerCalculator, 'PowerCalculator should be available');
    combatTest.assertDefined(combatIntegration.combatSystem, 'CombatSystem should be available');
    combatTest.assertDefined(combatIntegration.duelManager, 'DuelManager should be available');
    combatTest.assertDefined(combatIntegration.rankingSystem, 'RankingSystem should be available');
    combatTest.assertDefined(combatIntegration.tournamentSystem, 'TournamentSystem should be available');

    // Test combat summary
    const summary = combatIntegration.getCombatSummary();
    combatTest.assertDefined(summary, 'Combat summary should be available');
    combatTest.assertDefined(summary.power, 'Summary should include power info');
    combatTest.assertDefined(summary.ranking, 'Summary should include ranking info');
    combatTest.assertNumber(summary.power.current, 'Current power should be a number');
});

// Test balance validation
combatTest.addTest('Combat Balance Validation', async () => {
    const gameState = window.gameState;
    const eventManager = window.eventManager;
    const powerCalculator = new window.PowerCalculator(gameState, eventManager);

    // Test that power scales reasonably with cultivation
    const baseEntity = {
        cultivation: { qi: { level: 10 }, body: { level: 10 }, realm: 'Body Refinement', stage: 1 },
        scriptures: [],
        equipment: {}
    };

    const strongerEntity = {
        cultivation: { qi: { level: 50 }, body: { level: 50 }, realm: 'Qi Gathering', stage: 3 },
        scriptures: [],
        equipment: {}
    };

    const basePower = powerCalculator.calculateTotalPower(baseEntity);
    const strongerPower = powerCalculator.calculateTotalPower(strongerEntity);

    combatTest.assertNumber(basePower, 'Base power should be a number');
    combatTest.assertNumber(strongerPower, 'Stronger power should be a number');
    combatTest.assert(strongerPower > basePower, 'Higher cultivation should result in higher power');

    // Test that the power difference is reasonable (not too extreme)
    const powerRatio = strongerPower / basePower;
    combatTest.assert(powerRatio > 2, 'Power should scale significantly with cultivation');
    combatTest.assert(powerRatio < 50, 'Power scaling should not be too extreme');

    console.log(`Balance Check: Level 10 power: ${basePower}, Level 50 power: ${strongerPower}, Ratio: ${powerRatio.toFixed(2)}`);
});

// Export for manual testing
if (typeof window !== 'undefined') {
    window.CombatSystemTest = combatTest;
}

// Auto-run tests if in testing environment
if (typeof window !== 'undefined' && window.location && window.location.search.includes('test=combat')) {
    // Wait for page load then run tests
    window.addEventListener('load', () => {
        setTimeout(() => {
            combatTest.runAllTests();
        }, 1000);
    });
}

console.log('Combat System Test: Loaded. Run window.CombatSystemTest.runAllTests() to execute tests.');