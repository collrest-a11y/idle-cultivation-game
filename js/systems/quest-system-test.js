/**
 * Quest System Integration Test
 * Tests the basic functionality of the quest and achievement systems
 */

// Test configuration
const TEST_CONFIG = {
    runBasicTests: true,
    runIntegrationTests: true,
    runPerformanceTests: false,
    verbose: true
};

/**
 * Basic quest system test suite
 */
async function runBasicTests() {
    console.log('=== Running Basic Quest System Tests ===');

    try {
        // Test 1: Check if all systems are available
        console.log('Test 1: System Availability');
        const systems = {
            questSystem: window.questSystem,
            achievementManager: window.achievementManager,
            rewardManager: window.rewardManager,
            questIntegration: window.questIntegration
        };

        for (const [name, system] of Object.entries(systems)) {
            if (system) {
                console.log(`✓ ${name} is available`);
            } else {
                console.error(`✗ ${name} is not available`);
                return false;
            }
        }

        // Test 2: Check data availability
        console.log('\nTest 2: Data Availability');
        const dataObjects = {
            QUEST_TEMPLATES: window.QUEST_TEMPLATES,
            ACHIEVEMENTS: window.ACHIEVEMENTS,
            QUEST_CATEGORIES: window.QUEST_CATEGORIES,
            OBJECTIVE_TYPES: window.OBJECTIVE_TYPES
        };

        for (const [name, data] of Object.entries(dataObjects)) {
            if (data) {
                console.log(`✓ ${name} is loaded`);
            } else {
                console.error(`✗ ${name} is not loaded`);
                return false;
            }
        }

        // Test 3: System initialization
        console.log('\nTest 3: System Initialization');
        const initResults = {
            questIntegration: await window.questIntegration.initialize()
        };

        for (const [name, result] of Object.entries(initResults)) {
            if (result) {
                console.log(`✓ ${name} initialized successfully`);
            } else {
                console.error(`✗ ${name} failed to initialize`);
                return false;
            }
        }

        console.log('✓ All basic tests passed');
        return true;

    } catch (error) {
        console.error('Basic tests failed:', error);
        return false;
    }
}

/**
 * Integration test suite
 */
async function runIntegrationTests() {
    console.log('\n=== Running Integration Tests ===');

    try {
        // Test 1: Quest generation
        console.log('Test 1: Quest Generation');
        window.questSystem.generateDailyQuests();
        const activeQuests = window.questSystem.getActiveQuests();

        if (activeQuests.daily.length > 0) {
            console.log(`✓ Generated ${activeQuests.daily.length} daily quests`);
            if (TEST_CONFIG.verbose) {
                activeQuests.daily.forEach((quest, index) => {
                    console.log(`  Quest ${index + 1}: ${quest.name} (${quest.category})`);
                });
            }
        } else {
            console.error('✗ No daily quests generated');
            return false;
        }

        // Test 2: Achievement checking
        console.log('\nTest 2: Achievement Checking');
        const newAchievements = window.achievementManager.checkAllAchievements();
        console.log(`✓ Checked achievements, found ${newAchievements.length} new unlocks`);

        // Test 3: Reward system
        console.log('\nTest 3: Reward System');
        const testRewards = {
            jade: 100,
            spiritCrystals: 50
        };

        const rewardResult = window.rewardManager.awardRewards(testRewards, {
            source: 'test',
            immediate: true
        });

        if (rewardResult && rewardResult.success) {
            console.log('✓ Reward system working correctly');
            if (TEST_CONFIG.verbose) {
                console.log(`  Awarded:`, rewardResult.calculatedRewards);
            }
        } else {
            console.error('✗ Reward system failed');
            return false;
        }

        // Test 4: Cross-system event processing
        console.log('\nTest 4: Cross-system Event Processing');
        const testEvent = {
            type: 'test:event',
            data: { amount: 100, type: 'qi' }
        };

        window.questIntegration.processGameEvent('cultivation:experienceGained', testEvent);
        console.log('✓ Cross-system event processing completed');

        // Test 5: Progress summary
        console.log('\nTest 5: Progress Summary');
        const progressSummary = window.questIntegration.getProgressSummary();

        if (progressSummary && progressSummary.quests && progressSummary.achievements) {
            console.log('✓ Progress summary generated successfully');
            if (TEST_CONFIG.verbose) {
                console.log(`  Active daily quests: ${progressSummary.quests.active.daily.length}`);
                console.log(`  Achievement points: ${progressSummary.achievements.summary.overview.achievementPoints}`);
                console.log(`  Total rewards awarded: ${progressSummary.rewards.statistics.totalJadeAwarded} jade`);
            }
        } else {
            console.error('✗ Progress summary generation failed');
            return false;
        }

        console.log('✓ All integration tests passed');
        return true;

    } catch (error) {
        console.error('Integration tests failed:', error);
        return false;
    }
}

/**
 * Performance test suite
 */
async function runPerformanceTests() {
    console.log('\n=== Running Performance Tests ===');

    try {
        // Test 1: Quest generation performance
        console.log('Test 1: Quest Generation Performance');
        const questGenStart = performance.now();

        for (let i = 0; i < 10; i++) {
            window.questSystem.generateDailyQuests();
        }

        const questGenTime = performance.now() - questGenStart;
        console.log(`✓ Quest generation: ${questGenTime.toFixed(2)}ms for 10 generations`);

        // Test 2: Achievement checking performance
        console.log('\nTest 2: Achievement Checking Performance');
        const achievementStart = performance.now();

        for (let i = 0; i < 5; i++) {
            window.achievementManager.checkAllAchievements();
        }

        const achievementTime = performance.now() - achievementStart;
        console.log(`✓ Achievement checking: ${achievementTime.toFixed(2)}ms for 5 full checks`);

        // Test 3: Event processing performance
        console.log('\nTest 3: Event Processing Performance');
        const eventStart = performance.now();

        for (let i = 0; i < 100; i++) {
            window.questIntegration.processGameEvent('test:event', { data: i });
        }

        const eventTime = performance.now() - eventStart;
        console.log(`✓ Event processing: ${eventTime.toFixed(2)}ms for 100 events`);

        console.log('✓ All performance tests completed');
        return true;

    } catch (error) {
        console.error('Performance tests failed:', error);
        return false;
    }
}

/**
 * System health check
 */
function checkSystemHealth() {
    console.log('\n=== System Health Check ===');

    try {
        const health = window.questIntegration.getSystemHealth();

        console.log('Integration Health:', health.integration.isActive ? '✓ Active' : '✗ Inactive');
        console.log('Quest System Health:', health.questSystem?.isActive ? '✓ Active' : '✗ Inactive');
        console.log('Achievement Manager Health:', health.achievementManager?.isActive ? '✓ Active' : '✗ Inactive');
        console.log('Reward Manager Health:', health.rewardManager?.isActive ? '✓ Active' : '✗ Inactive');

        if (health.integration.errorCount > 0) {
            console.warn(`⚠ Integration errors: ${health.integration.errorCount}`);
        }

        console.log('✓ System health check completed');
        return true;

    } catch (error) {
        console.error('System health check failed:', error);
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('Starting Quest System Integration Tests...\n');

    const results = {
        basic: false,
        integration: false,
        performance: false,
        health: false
    };

    // Run basic tests
    if (TEST_CONFIG.runBasicTests) {
        results.basic = await runBasicTests();
    }

    // Run integration tests if basic tests passed
    if (results.basic && TEST_CONFIG.runIntegrationTests) {
        results.integration = await runIntegrationTests();
    }

    // Run performance tests if enabled
    if (TEST_CONFIG.runPerformanceTests) {
        results.performance = await runPerformanceTests();
    }

    // Always run health check
    results.health = checkSystemHealth();

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Basic Tests: ${results.basic ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`Integration Tests: ${results.integration ? '✓ PASSED' : '✗ FAILED'}`);
    if (TEST_CONFIG.runPerformanceTests) {
        console.log(`Performance Tests: ${results.performance ? '✓ PASSED' : '✗ FAILED'}`);
    }
    console.log(`Health Check: ${results.health ? '✓ PASSED' : '✗ FAILED'}`);

    const allPassed = results.basic && results.integration && results.health &&
        (!TEST_CONFIG.runPerformanceTests || results.performance);

    console.log(`\nOverall Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);

    return allPassed;
}

/**
 * Manual test functions for debugging
 */
const manualTests = {
    // Test quest completion
    testQuestCompletion: function() {
        const activeQuests = window.questSystem.getActiveQuests();
        if (activeQuests.daily.length > 0) {
            const quest = activeQuests.daily[0];
            console.log('Testing quest completion for:', quest.name);

            // Simulate quest completion
            quest.objective.current = quest.objective.target;
            const result = window.questSystem.completeQuest(quest.id);

            if (result) {
                console.log('✓ Quest completed successfully');
                console.log('Rewards:', result.rewards);
            } else {
                console.log('✗ Quest completion failed');
            }
        } else {
            console.log('No active daily quests to test');
        }
    },

    // Test achievement unlock
    testAchievementUnlock: function() {
        // Simulate conditions for first cultivation achievement
        window.gameState.update({
            'cultivation.qi.level': 1
        });

        const newAchievements = window.achievementManager.checkAllAchievements();
        console.log(`Unlocked ${newAchievements.length} new achievements`);

        newAchievements.forEach(id => {
            const achievement = window.ACHIEVEMENTS[id];
            if (achievement) {
                console.log(`✓ Unlocked: ${achievement.name}`);
            }
        });
    },

    // Test reward bonuses
    testRewardBonuses: function() {
        console.log('Testing reward bonuses...');

        window.rewardManager.addRewardBonus('test_bonus', {
            name: 'Test Bonus',
            description: 'A test bonus for debugging',
            multipliers: {
                jade: 2.0,
                spiritCrystals: 1.5
            },
            duration: 60000, // 1 minute
            source: 'test'
        });

        const bonuses = window.rewardManager.getActiveBonuses();
        console.log(`Active bonuses: ${bonuses.length}`);
        bonuses.forEach(bonus => {
            console.log(`- ${bonus.name}: ${bonus.description}`);
        });
    }
};

// Export test functions for console access
if (typeof window !== 'undefined') {
    window.questSystemTests = {
        runAllTests,
        runBasicTests,
        runIntegrationTests,
        runPerformanceTests,
        checkSystemHealth,
        manualTests,
        TEST_CONFIG
    };
}

// Auto-run tests if this script is loaded after all systems
if (typeof window !== 'undefined' && window.questIntegration) {
    // Wait a bit for everything to load, then run tests
    setTimeout(() => {
        console.log('Quest System Integration Tests loaded. Run window.questSystemTests.runAllTests() to start testing.');
    }, 1000);
}

console.log('Quest System Test Suite loaded successfully.');