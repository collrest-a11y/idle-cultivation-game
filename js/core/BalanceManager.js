/**
 * BalanceManager - Centralized balance configuration and tuning system
 * Provides A/B testing, progression curve analysis, and dynamic balance adjustments
 */
class BalanceManager {
    constructor() {
        this.eventManager = null;
        this.gameState = null;
        this.performanceMonitor = null;

        // Current balance configuration
        this.config = {
            version: '1.0.0',
            lastUpdated: Date.now(),

            // Core progression tuning
            progression: {
                experienceMultiplier: 1.0,
                cultivationSpeedMultiplier: 1.0,
                breakthroughDifficultyMultiplier: 1.0,
                resourceCostMultiplier: 1.0,
                offlineEfficiencyMultiplier: 1.0
            },

            // Realm-specific adjustments
            realmAdjustments: {
                "Body Refinement": { experienceMultiplier: 1.0, difficultyMultiplier: 1.0 },
                "Qi Gathering": { experienceMultiplier: 1.0, difficultyMultiplier: 1.0 },
                "Foundation Building": { experienceMultiplier: 1.0, difficultyMultiplier: 1.0 },
                "Core Formation": { experienceMultiplier: 1.0, difficultyMultiplier: 1.0 },
                "Nascent Soul": { experienceMultiplier: 1.0, difficultyMultiplier: 1.0 }
            },

            // Combat balance
            combat: {
                playerPowerMultiplier: 1.0,
                enemyPowerMultiplier: 1.0,
                rewardMultiplier: 1.0,
                xpMultiplier: 1.0
            },

            // Economic balance
            economy: {
                jadeGainMultiplier: 1.0,
                spiritCrystalGainMultiplier: 1.0,
                gachaCostMultiplier: 1.0,
                upgradeMultiplier: 1.0
            },

            // Engagement tuning
            engagement: {
                achievementRewardMultiplier: 1.0,
                questRewardMultiplier: 1.0,
                eventFrequencyMultiplier: 1.0,
                socialFeatureMultiplier: 1.0
            }
        };

        // A/B testing configuration
        this.abTesting = {
            enabled: false,
            currentTests: new Map(),
            playerSegments: new Map(),
            testResults: new Map()
        };

        // Balance analytics
        this.analytics = {
            playerProgressions: [],
            sessionLengths: [],
            retentionMetrics: [],
            economicMetrics: [],
            engagementMetrics: []
        };

        // Recommended balance changes
        this.recommendations = {
            progression: [],
            combat: [],
            economy: [],
            engagement: []
        };

        // Balance presets for different player types
        this.presets = {
            casual: {
                progression: {
                    experienceMultiplier: 1.3,
                    cultivationSpeedMultiplier: 1.2,
                    breakthroughDifficultyMultiplier: 0.8
                },
                engagement: {
                    achievementRewardMultiplier: 1.2,
                    questRewardMultiplier: 1.1
                }
            },
            hardcore: {
                progression: {
                    experienceMultiplier: 0.8,
                    cultivationSpeedMultiplier: 0.9,
                    breakthroughDifficultyMultiplier: 1.3
                },
                combat: {
                    enemyPowerMultiplier: 1.2
                }
            },
            balanced: {
                progression: {
                    experienceMultiplier: 1.0,
                    cultivationSpeedMultiplier: 1.0,
                    breakthroughDifficultyMultiplier: 1.0
                }
            }
        };
    }

    /**
     * Initialize the balance manager
     * @param {Object} context - Game context with core systems
     */
    initialize(context) {
        this.eventManager = context.eventManager;
        this.gameState = context.gameState;
        this.performanceMonitor = context.performanceMonitor;

        // Load existing balance configuration
        this._loadBalanceConfig();

        // Set up analytics tracking
        this._setupAnalytics();

        // Initialize A/B testing if enabled
        if (this.abTesting.enabled) {
            this._initializeABTesting();
        }

        console.log('BalanceManager: Initialized with config version', this.config.version);
    }

    /**
     * Apply balance modifications to a value
     * @param {string} category - Balance category (progression, combat, economy, engagement)
     * @param {string} metric - Specific metric name
     * @param {number} baseValue - Base value to modify
     * @param {Object} context - Additional context for calculations
     * @returns {number} Modified value
     */
    applyBalance(category, metric, baseValue, context = {}) {
        let modifiedValue = baseValue;

        // Apply general category multiplier
        const categoryConfig = this.config[category];
        if (categoryConfig && categoryConfig[metric + 'Multiplier']) {
            modifiedValue *= categoryConfig[metric + 'Multiplier'];
        }

        // Apply realm-specific adjustments for progression
        if (category === 'progression' && context.realm) {
            const realmAdjustment = this.config.realmAdjustments[context.realm];
            if (realmAdjustment) {
                if (metric === 'experience' && realmAdjustment.experienceMultiplier) {
                    modifiedValue *= realmAdjustment.experienceMultiplier;
                }
                if (metric === 'difficulty' && realmAdjustment.difficultyMultiplier) {
                    modifiedValue *= realmAdjustment.difficultyMultiplier;
                }
            }
        }

        // Apply A/B testing modifications
        if (this.abTesting.enabled) {
            modifiedValue = this._applyABTestModifications(category, metric, modifiedValue, context);
        }

        // Track the balance application for analytics
        this._trackBalanceApplication(category, metric, baseValue, modifiedValue, context);

        return modifiedValue;
    }

    /**
     * Analyze player progression and suggest balance changes
     * @returns {Object} Analysis results and recommendations
     */
    analyzeBalance() {
        const analysis = {
            progressionHealth: this._analyzeProgressionHealth(),
            combatBalance: this._analyzeCombatBalance(),
            economicHealth: this._analyzeEconomicHealth(),
            engagementMetrics: this._analyzeEngagementMetrics(),
            recommendations: this._generateRecommendations()
        };

        // Store analysis results
        this.lastAnalysis = {
            timestamp: Date.now(),
            results: analysis
        };

        if (this.eventManager) {
            this.eventManager.emit('balance:analysisComplete', analysis);
        }

        return analysis;
    }

    /**
     * Start an A/B test
     * @param {Object} testConfig - A/B test configuration
     * @returns {string} Test ID
     */
    startABTest(testConfig) {
        if (!this.abTesting.enabled) {
            throw new Error('A/B testing is not enabled');
        }

        const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const test = {
            id: testId,
            name: testConfig.name,
            description: testConfig.description,
            startTime: Date.now(),
            endTime: testConfig.duration ? Date.now() + testConfig.duration : null,
            variants: testConfig.variants,
            allocation: testConfig.allocation || { control: 0.5, variant: 0.5 },
            metrics: testConfig.metrics || ['progression_speed', 'session_length', 'retention'],
            status: 'active',
            participants: new Map(),
            results: {
                control: { participants: 0, metrics: {} },
                variant: { participants: 0, metrics: {} }
            }
        };

        this.abTesting.currentTests.set(testId, test);

        console.log(`BalanceManager: Started A/B test "${test.name}" (ID: ${testId})`);

        if (this.eventManager) {
            this.eventManager.emit('balance:abTestStarted', { testId, test });
        }

        return testId;
    }

    /**
     * Get A/B test assignment for a player
     * @param {string} playerId - Player identifier
     * @param {string} testId - Test identifier
     * @returns {string} Variant assignment ('control' or 'variant')
     */
    getABTestAssignment(playerId, testId) {
        const test = this.abTesting.currentTests.get(testId);
        if (!test || test.status !== 'active') {
            return 'control';
        }

        // Check if player already has assignment
        if (test.participants.has(playerId)) {
            return test.participants.get(playerId);
        }

        // Assign based on allocation
        const hash = this._hashString(playerId + testId);
        const assignment = hash < test.allocation.control ? 'control' : 'variant';

        test.participants.set(playerId, assignment);
        test.results[assignment].participants++;

        return assignment;
    }

    /**
     * Apply balance preset
     * @param {string} presetName - Name of the preset to apply
     */
    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            throw new Error(`Unknown balance preset: ${presetName}`);
        }

        // Deep merge preset into current config
        this.config = this._deepMerge(this.config, preset);
        this.config.lastUpdated = Date.now();

        // Save the updated configuration
        this._saveBalanceConfig();

        console.log(`BalanceManager: Applied preset "${presetName}"`);

        if (this.eventManager) {
            this.eventManager.emit('balance:presetApplied', { presetName, config: this.config });
        }
    }

    /**
     * Create a custom balance configuration
     * @param {Object} customConfig - Custom balance configuration
     */
    applyCustomConfig(customConfig) {
        // Validate configuration
        if (!this._validateConfig(customConfig)) {
            throw new Error('Invalid balance configuration');
        }

        // Apply custom configuration
        this.config = this._deepMerge(this.config, customConfig);
        this.config.lastUpdated = Date.now();

        // Save the updated configuration
        this._saveBalanceConfig();

        console.log('BalanceManager: Applied custom configuration');

        if (this.eventManager) {
            this.eventManager.emit('balance:customConfigApplied', { config: this.config });
        }
    }

    /**
     * Get current balance configuration
     * @returns {Object} Current balance configuration
     */
    getConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Get balance analytics summary
     * @returns {Object} Analytics summary
     */
    getAnalytics() {
        return {
            progressionHealth: this._calculateProgressionHealth(),
            economicHealth: this._calculateEconomicHealth(),
            engagementHealth: this._calculateEngagementHealth(),
            playerSegmentation: this._analyzePlayerSegmentation(),
            recommendations: this.recommendations
        };
    }

    // Private methods

    /**
     * Load balance configuration from storage
     */
    _loadBalanceConfig() {
        try {
            const savedConfig = localStorage.getItem('balanceConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = this._deepMerge(this.config, parsedConfig);
            }
        } catch (error) {
            console.warn('BalanceManager: Failed to load saved config, using defaults');
        }
    }

    /**
     * Save balance configuration to storage
     */
    _saveBalanceConfig() {
        try {
            localStorage.setItem('balanceConfig', JSON.stringify(this.config));
        } catch (error) {
            console.error('BalanceManager: Failed to save config');
        }
    }

    /**
     * Set up analytics tracking
     */
    _setupAnalytics() {
        if (!this.eventManager) return;

        // Track progression events
        this.eventManager.on('cultivation:levelUp', (data) => {
            this.analytics.playerProgressions.push({
                timestamp: Date.now(),
                type: 'levelUp',
                realm: data.realm,
                level: data.newLevel,
                timeTaken: data.timeTaken
            });
        });

        // Track session length
        this.eventManager.on('game:started', () => {
            this.sessionStartTime = Date.now();
        });

        this.eventManager.on('game:stopped', () => {
            if (this.sessionStartTime) {
                const sessionLength = Date.now() - this.sessionStartTime;
                this.analytics.sessionLengths.push({
                    timestamp: Date.now(),
                    duration: sessionLength
                });
            }
        });

        // Track economic events
        this.eventManager.on('economy:transaction', (data) => {
            this.analytics.economicMetrics.push({
                timestamp: Date.now(),
                type: data.type,
                amount: data.amount,
                currency: data.currency
            });
        });
    }

    /**
     * Initialize A/B testing
     */
    _initializeABTesting() {
        // Set up player segmentation
        this._setupPlayerSegmentation();

        // Load existing tests
        this._loadABTests();

        console.log('BalanceManager: A/B testing initialized');
    }

    /**
     * Apply A/B test modifications to a value
     * @param {string} category - Balance category
     * @param {string} metric - Metric name
     * @param {number} value - Base value
     * @param {Object} context - Context for the modification
     * @returns {number} Modified value
     */
    _applyABTestModifications(category, metric, value, context) {
        const playerId = this.gameState?.get('meta.playerId') || 'default';
        let modifiedValue = value;

        for (const [testId, test] of this.abTesting.currentTests) {
            if (test.status === 'active') {
                const assignment = this.getABTestAssignment(playerId, testId);
                const variant = test.variants[assignment];

                if (variant && variant[category] && variant[category][metric]) {
                    const modifier = variant[category][metric];
                    if (typeof modifier === 'number') {
                        modifiedValue *= modifier;
                    }
                }
            }
        }

        return modifiedValue;
    }

    /**
     * Track balance application for analytics
     * @param {string} category - Balance category
     * @param {string} metric - Metric name
     * @param {number} baseValue - Original value
     * @param {number} modifiedValue - Modified value
     * @param {Object} context - Context
     */
    _trackBalanceApplication(category, metric, baseValue, modifiedValue, context) {
        // Track balance applications for analysis
        if (!this.balanceApplications) {
            this.balanceApplications = [];
        }

        this.balanceApplications.push({
            timestamp: Date.now(),
            category,
            metric,
            baseValue,
            modifiedValue,
            modifier: modifiedValue / baseValue,
            context
        });

        // Keep only recent applications to prevent memory bloat
        if (this.balanceApplications.length > 10000) {
            this.balanceApplications = this.balanceApplications.slice(-5000);
        }
    }

    /**
     * Analyze progression health
     * @returns {Object} Progression health analysis
     */
    _analyzeProgressionHealth() {
        const recentProgressions = this.analytics.playerProgressions.slice(-100);

        if (recentProgressions.length === 0) {
            return { status: 'insufficient_data', score: 50 };
        }

        // Analyze progression speed
        const avgTimeBetweenLevels = recentProgressions.reduce((sum, p) => sum + (p.timeTaken || 0), 0) / recentProgressions.length;
        const targetTime = 300000; // 5 minutes target per level
        const speedScore = Math.max(0, Math.min(100, 100 - Math.abs(avgTimeBetweenLevels - targetTime) / targetTime * 100));

        // Analyze progression distribution across realms
        const realmDistribution = {};
        recentProgressions.forEach(p => {
            realmDistribution[p.realm] = (realmDistribution[p.realm] || 0) + 1;
        });

        const distributionScore = Object.keys(realmDistribution).length > 1 ? 80 : 60;

        return {
            status: speedScore > 70 ? 'healthy' : speedScore > 40 ? 'concerning' : 'unhealthy',
            score: Math.round((speedScore + distributionScore) / 2),
            metrics: {
                avgTimeBetweenLevels,
                speedScore,
                distributionScore,
                realmDistribution
            }
        };
    }

    /**
     * Analyze combat balance
     * @returns {Object} Combat balance analysis
     */
    _analyzeCombatBalance() {
        // Placeholder for combat balance analysis
        return {
            status: 'healthy',
            score: 75,
            metrics: {
                winRate: 0.6,
                avgCombatDuration: 30000,
                playerPowerGrowth: 1.1
            }
        };
    }

    /**
     * Analyze economic health
     * @returns {Object} Economic health analysis
     */
    _analyzeEconomicHealth() {
        const recentTransactions = this.analytics.economicMetrics.slice(-100);

        if (recentTransactions.length === 0) {
            return { status: 'insufficient_data', score: 50 };
        }

        // Analyze spending patterns
        const spendingRate = recentTransactions.filter(t => t.amount < 0).length / recentTransactions.length;
        const earningRate = recentTransactions.filter(t => t.amount > 0).length / recentTransactions.length;

        const economicBalance = Math.min(spendingRate, earningRate) / Math.max(spendingRate, earningRate);
        const balanceScore = economicBalance * 100;

        return {
            status: balanceScore > 70 ? 'healthy' : balanceScore > 40 ? 'concerning' : 'unhealthy',
            score: Math.round(balanceScore),
            metrics: {
                spendingRate,
                earningRate,
                economicBalance
            }
        };
    }

    /**
     * Analyze engagement metrics
     * @returns {Object} Engagement analysis
     */
    _analyzeEngagementMetrics() {
        const recentSessions = this.analytics.sessionLengths.slice(-50);

        if (recentSessions.length === 0) {
            return { status: 'insufficient_data', score: 50 };
        }

        const avgSessionLength = recentSessions.reduce((sum, s) => sum + s.duration, 0) / recentSessions.length;
        const targetSessionLength = 1800000; // 30 minutes target
        const engagementScore = Math.max(0, Math.min(100, avgSessionLength / targetSessionLength * 100));

        return {
            status: engagementScore > 70 ? 'healthy' : engagementScore > 40 ? 'concerning' : 'unhealthy',
            score: Math.round(engagementScore),
            metrics: {
                avgSessionLength,
                sessionCount: recentSessions.length,
                engagementScore
            }
        };
    }

    /**
     * Generate balance recommendations
     * @returns {Object} Generated recommendations
     */
    _generateRecommendations() {
        const recommendations = {
            progression: [],
            combat: [],
            economy: [],
            engagement: []
        };

        // Analyze progression and generate recommendations
        const progressionHealth = this._analyzeProgressionHealth();
        if (progressionHealth.score < 60) {
            if (progressionHealth.metrics.avgTimeBetweenLevels > 600000) {
                recommendations.progression.push({
                    type: 'increase_speed',
                    description: 'Increase cultivation speed multiplier by 10-20%',
                    severity: 'medium',
                    suggestedChange: { 'progression.cultivationSpeedMultiplier': this.config.progression.cultivationSpeedMultiplier * 1.15 }
                });
            }
        }

        // Analyze economic health and generate recommendations
        const economicHealth = this._analyzeEconomicHealth();
        if (economicHealth.score < 60) {
            recommendations.economy.push({
                type: 'adjust_rewards',
                description: 'Adjust resource gain rates to improve economic balance',
                severity: 'medium',
                suggestedChange: { 'economy.jadeGainMultiplier': this.config.economy.jadeGainMultiplier * 1.1 }
            });
        }

        return recommendations;
    }

    /**
     * Validate balance configuration
     * @param {Object} config - Configuration to validate
     * @returns {boolean} Whether the configuration is valid
     */
    _validateConfig(config) {
        // Basic validation - ensure multipliers are positive numbers
        const checkMultipliers = (obj, path = '') => {
            for (const [key, value] of Object.entries(obj)) {
                if (key.endsWith('Multiplier')) {
                    if (typeof value !== 'number' || value <= 0) {
                        console.error(`Invalid multiplier at ${path}.${key}:`, value);
                        return false;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    if (!checkMultipliers(value, path ? `${path}.${key}` : key)) {
                        return false;
                    }
                }
            }
            return true;
        };

        return checkMultipliers(config);
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    _deepMerge(target, source) {
        const result = { ...target };

        for (const [key, value] of Object.entries(source)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this._deepMerge(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Hash a string to a number between 0 and 1
     * @param {string} str - String to hash
     * @returns {number} Hash value between 0 and 1
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) / 2147483648; // Normalize to 0-1
    }

    /**
     * Set up player segmentation for A/B testing
     */
    _setupPlayerSegmentation() {
        // Implement player segmentation logic
        // This would segment players based on behavior, progression, spending, etc.
    }

    /**
     * Load existing A/B tests from storage
     */
    _loadABTests() {
        try {
            const savedTests = localStorage.getItem('abTests');
            if (savedTests) {
                const tests = JSON.parse(savedTests);
                for (const [testId, test] of Object.entries(tests)) {
                    if (test.status === 'active' && (!test.endTime || test.endTime > Date.now())) {
                        this.abTesting.currentTests.set(testId, test);
                    }
                }
            }
        } catch (error) {
            console.warn('BalanceManager: Failed to load A/B tests');
        }
    }

    /**
     * Calculate overall progression health score
     * @returns {number} Health score (0-100)
     */
    _calculateProgressionHealth() {
        // Implementation for progression health calculation
        return 75; // Placeholder
    }

    /**
     * Calculate overall economic health score
     * @returns {number} Health score (0-100)
     */
    _calculateEconomicHealth() {
        // Implementation for economic health calculation
        return 80; // Placeholder
    }

    /**
     * Calculate overall engagement health score
     * @returns {number} Health score (0-100)
     */
    _calculateEngagementHealth() {
        // Implementation for engagement health calculation
        return 70; // Placeholder
    }

    /**
     * Analyze player segmentation
     * @returns {Object} Player segmentation analysis
     */
    _analyzePlayerSegmentation() {
        // Implementation for player segmentation analysis
        return {
            casual: 40,
            hardcore: 35,
            balanced: 25
        };
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BalanceManager };
} else if (typeof window !== 'undefined') {
    window.BalanceManager = BalanceManager;
}