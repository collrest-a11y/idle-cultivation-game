/**
 * OfflineCalculator - Handles idle progression and offline calculations
 * Calculates progress made while player is away from the game
 */
class OfflineCalculator {
    constructor(gameState, eventManager, cultivationSystem, realmManager, techniqueManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.cultivationSystem = cultivationSystem;
        this.realmManager = realmManager;
        this.techniqueManager = techniqueManager;

        // Offline calculation settings
        this.config = {
            maxOfflineHours: 24, // Maximum hours of offline progression
            simulationTickSize: 300, // Simulate in 5-minute chunks
            efficiencyDecayRate: 0.7, // How much efficiency decreases over time
            minEfficiency: 0.1, // Minimum efficiency (10%)
            autoBreakthroughEnabled: true,
            autoBreakthroughChance: 0.6, // Reduced chance for offline breakthroughs
            resourceManagement: true // Automatically manage resources
        };

        // Offline calculation state
        this.calculationState = {
            isCalculating: false,
            totalOfflineTime: 0,
            timeSimulated: 0,
            progressMade: {
                qi: 0,
                body: 0,
                dual: 0
            },
            breakthroughsAttempted: 0,
            breakthroughsSucceeded: 0,
            resourcesConsumed: {
                qi: 0,
                spiritStones: 0
            },
            eventsGenerated: []
        };

        // Performance tracking
        this.performanceMetrics = {
            calculationTime: 0,
            simulationTicks: 0,
            averageTickTime: 0
        };

        this.isInitialized = false;

        console.log('OfflineCalculator: Initialized');
    }

    /**
     * Initialize the offline calculator
     */
    async initialize() {
        try {
            // Load offline configuration from game state
            const savedConfig = this.gameState.get('offlineConfig');
            if (savedConfig) {
                this.config = { ...this.config, ...savedConfig };
            }

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;

            console.log('OfflineCalculator: Initialization complete');

        } catch (error) {
            console.error('OfflineCalculator: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Calculate offline progression
     * @param {number} offlineTimeMs - Time offline in milliseconds
     * @param {Object} options - Calculation options
     * @returns {Object} Offline progression results
     */
    async calculateOfflineProgress(offlineTimeMs, options = {}) {
        const config = {
            showDetailedLog: false,
            skipBreakthroughs: false,
            skipResourceManagement: false,
            ...options
        };

        if (!this.isInitialized) {
            throw new Error('OfflineCalculator not initialized');
        }

        this.calculationState.isCalculating = true;
        const startTime = performance.now();

        try {
            // Prepare calculation
            const offlineHours = offlineTimeMs / (1000 * 60 * 60);
            const effectiveHours = Math.min(offlineHours, this.config.maxOfflineHours);
            const effectiveTimeMs = effectiveHours * 60 * 60 * 1000;

            this.calculationState.totalOfflineTime = effectiveTimeMs;
            this.calculationState.timeSimulated = 0;

            // Reset progress tracking
            this._resetCalculationState();

            // Get initial state snapshot
            const initialState = this._captureStateSnapshot();

            // Simulate offline progression
            const simulationResult = await this._simulateOfflineProgression(effectiveTimeMs, config);

            // Generate final results
            const results = this._generateOfflineResults(initialState, simulationResult, effectiveHours);

            // Apply results to game state
            this._applyOfflineResults(results);

            // Performance tracking
            const calculationTime = performance.now() - startTime;
            this._updatePerformanceMetrics(calculationTime);

            this.calculationState.isCalculating = false;

            // Emit events
            this.eventManager.emit('offline:calculation_complete', results);

            if (config.showDetailedLog) {
                console.log('OfflineCalculator: Detailed results:', results);
            }

            return results;

        } catch (error) {
            this.calculationState.isCalculating = false;
            console.error('OfflineCalculator: Calculation failed:', error);
            throw error;
        }
    }

    /**
     * Get offline calculation configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update offline calculation configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Save to game state
        this.gameState.set('offlineConfig', this.config, { source: 'offline:config_update' });

        this.eventManager.emit('offline:config_updated', this.config);
    }

    /**
     * Get current calculation state
     * @returns {Object} Calculation state
     */
    getCalculationState() {
        return { ...this.calculationState };
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Estimate offline progression without applying changes
     * @param {number} offlineTimeMs - Time offline in milliseconds
     * @returns {Object} Estimated progression
     */
    estimateOfflineProgress(offlineTimeMs) {
        const offlineHours = offlineTimeMs / (1000 * 60 * 60);
        const effectiveHours = Math.min(offlineHours, this.config.maxOfflineHours);

        // Get current cultivation rates
        const currentRates = this.cultivationSystem.getCurrentRates();
        const activePath = this.cultivationSystem.activePath;

        if (!activePath || !currentRates) {
            return {
                estimatedGains: { qi: 0, body: 0, dual: 0 },
                efficiency: 0,
                breakthroughsEstimated: 0,
                resourcesRequired: { qi: 0, spiritStones: 0 }
            };
        }

        // Calculate base progression
        const baseProgression = CULTIVATION_FORMULAS.offlineProgression(
            effectiveHours * 3600, // Convert to seconds
            currentRates[activePath],
            this.gameState.get('cultivation.qi.level') || 0,
            this.gameState.get('cultivation.body.level') || 0,
            this.techniqueManager.techniqueState.active
        );

        // Estimate breakthroughs
        const avgBreakthroughTime = 3600; // Assume 1 hour per breakthrough attempt
        const breakthroughsEstimated = Math.floor(effectiveHours / (avgBreakthroughTime / 3600));

        // Estimate resource consumption
        const activeTechnique = this.techniqueManager.techniqueState.active;
        const resourcesRequired = this._estimateResourceConsumption(effectiveHours, activeTechnique);

        return {
            estimatedGains: {
                qi: baseProgression.qiGain,
                body: baseProgression.bodyGain,
                dual: 0 // Will be calculated based on active path
            },
            efficiency: baseProgression.efficiencyUsed,
            breakthroughsEstimated: breakthroughsEstimated,
            resourcesRequired: resourcesRequired,
            maxOfflineHours: this.config.maxOfflineHours,
            actualHours: effectiveHours
        };
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save config changes
        this.eventManager.on('gameState:save', () => {
            this.gameState.set('offlineConfig', this.config, { source: 'offline:auto_save' });
        });

        // Listen for game load to check for offline time
        this.eventManager.on('gameState:loaded', () => {
            this._checkOfflineTime();
        });
    }

    /**
     * Check if player was offline and calculate progression
     */
    async _checkOfflineTime() {
        const currentTime = Date.now();
        const lastPlayed = this.gameState.get('meta.lastPlayed') || currentTime;
        const offlineTime = currentTime - lastPlayed;

        // Only calculate if offline for more than 5 minutes
        const minOfflineTime = 5 * 60 * 1000; // 5 minutes

        if (offlineTime > minOfflineTime) {
            try {
                const results = await this.calculateOfflineProgress(offlineTime);

                // Show offline progress to player
                this.eventManager.emit('offline:progress_calculated', {
                    offlineTime: offlineTime,
                    results: results
                });

            } catch (error) {
                console.error('OfflineCalculator: Auto-calculation failed:', error);
            }
        }

        // Update last played time
        this.gameState.set('meta.lastPlayed', currentTime, { source: 'offline:time_check' });
    }

    /**
     * Reset calculation state
     */
    _resetCalculationState() {
        this.calculationState.timeSimulated = 0;
        this.calculationState.progressMade = { qi: 0, body: 0, dual: 0 };
        this.calculationState.breakthroughsAttempted = 0;
        this.calculationState.breakthroughsSucceeded = 0;
        this.calculationState.resourcesConsumed = { qi: 0, spiritStones: 0 };
        this.calculationState.eventsGenerated = [];
    }

    /**
     * Capture current state snapshot
     * @returns {Object} State snapshot
     */
    _captureStateSnapshot() {
        return {
            cultivation: this.gameState.get('cultivation'),
            realm: this.gameState.get('realm'),
            resources: {
                qi: this.gameState.get('player.qi') || 0,
                spiritStones: this.gameState.get('player.spiritStones') || 0
            },
            techniques: {
                active: this.techniqueManager.techniqueState.active,
                mastery: new Map(this.techniqueManager.techniqueState.mastery)
            },
            timestamp: Date.now()
        };
    }

    /**
     * Simulate offline progression in chunks
     * @param {number} totalTimeMs - Total time to simulate
     * @param {Object} config - Simulation configuration
     * @returns {Object} Simulation results
     */
    async _simulateOfflineProgression(totalTimeMs, config) {
        const results = {
            totalProgress: { qi: 0, body: 0, dual: 0 },
            breakthroughs: [],
            resourcesConsumed: { qi: 0, spiritStones: 0 },
            events: [],
            efficiency: 1.0
        };

        const tickSizeMs = this.config.simulationTickSize * 1000; // Convert to milliseconds
        const totalTicks = Math.ceil(totalTimeMs / tickSizeMs);

        for (let tick = 0; tick < totalTicks; tick++) {
            const tickTime = Math.min(tickSizeMs, totalTimeMs - (tick * tickSizeMs));
            const timeRatio = tick / totalTicks;

            // Calculate efficiency decay
            const efficiency = this._calculateEfficiency(timeRatio);

            // Simulate cultivation progress for this tick
            const tickProgress = this._simulateCultivationTick(tickTime, efficiency);

            // Add to total progress
            results.totalProgress.qi += tickProgress.qi;
            results.totalProgress.body += tickProgress.body;
            results.totalProgress.dual += tickProgress.dual;

            // Simulate breakthrough attempts
            if (this.config.autoBreakthroughEnabled && tick % 12 === 0) { // Every hour
                const breakthrough = this._simulateBreakthroughAttempt(efficiency);
                if (breakthrough) {
                    results.breakthroughs.push(breakthrough);
                }
            }

            // Simulate resource consumption
            const resourceCost = this._simulateResourceConsumption(tickTime, efficiency);
            results.resourcesConsumed.qi += resourceCost.qi;
            results.resourcesConsumed.spiritStones += resourceCost.spiritStones;

            // Check if we can afford to continue
            if (this.config.resourceManagement && !this._canAffordContinuation(results.resourcesConsumed)) {
                results.events.push({
                    type: 'resource_exhaustion',
                    time: tick * tickSizeMs,
                    message: 'Cultivation stopped due to insufficient resources'
                });
                break;
            }

            this.calculationState.timeSimulated += tickTime;
            this.performanceMetrics.simulationTicks++;

            // Yield control occasionally for long calculations
            if (tick % 100 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        results.efficiency = this._calculateAverageEfficiency(totalTicks);
        return results;
    }

    /**
     * Simulate cultivation progress for one tick
     * @param {number} tickTimeMs - Tick duration in milliseconds
     * @param {number} efficiency - Current efficiency
     * @returns {Object} Progress made
     */
    _simulateCultivationTick(tickTimeMs, efficiency) {
        const activePath = this.cultivationSystem.activePath;
        if (!activePath) {
            return { qi: 0, body: 0, dual: 0 };
        }

        const currentRates = this.cultivationSystem.getCurrentRates();
        const tickSeconds = tickTimeMs / 1000;

        let progress = { qi: 0, body: 0, dual: 0 };

        if (activePath === 'qi') {
            progress.qi = currentRates.qi * tickSeconds * efficiency;
        } else if (activePath === 'body') {
            progress.body = currentRates.body * tickSeconds * efficiency;
        } else if (activePath === 'dual') {
            progress.qi = currentRates.dual * 0.5 * tickSeconds * efficiency;
            progress.body = currentRates.dual * 0.5 * tickSeconds * efficiency;
            progress.dual = currentRates.dual * tickSeconds * efficiency;
        }

        // Apply bottleneck effects
        const qiLevel = this.gameState.get('cultivation.qi.level') || 0;
        const bodyLevel = this.gameState.get('cultivation.body.level') || 0;

        progress.qi *= CULTIVATION_BOTTLENECKS.getBottleneckMultiplier(qiLevel);
        progress.body *= CULTIVATION_BOTTLENECKS.getBottleneckMultiplier(bodyLevel);

        return progress;
    }

    /**
     * Simulate breakthrough attempt
     * @param {number} efficiency - Current efficiency
     * @returns {Object|null} Breakthrough result or null
     */
    _simulateBreakthroughAttempt(efficiency) {
        const cultivation = this.gameState.get('cultivation');
        if (!cultivation) return null;

        // Determine if qi or body breakthrough
        const qiExp = cultivation.qi.experience || 0;
        const bodyExp = cultivation.body.experience || 0;
        const qiRequired = CULTIVATION_FORMULAS.experienceRequired(cultivation.qi.level);
        const bodyRequired = CULTIVATION_FORMULAS.experienceRequired(cultivation.body.level);

        let path = null;
        if (qiExp >= qiRequired * 0.8) path = 'qi'; // 80% of required experience
        if (bodyExp >= bodyRequired * 0.8) path = 'body';

        if (!path) return null;

        // Calculate breakthrough chance
        const realm = this.realmManager.getCurrentRealm();
        const stage = this.realmManager.getCurrentStage();
        const resources = { spiritStones: 0, breakthroughPills: 0 };

        let chance = CULTIVATION_FORMULAS.breakthroughChance(
            cultivation.qi.level,
            cultivation.body.level,
            realm,
            stage,
            this.techniqueManager.techniqueState.active,
            resources
        );

        // Reduce chance for offline breakthroughs
        chance *= this.config.autoBreakthroughChance * efficiency;

        const success = Math.random() < chance;

        this.calculationState.breakthroughsAttempted++;

        if (success) {
            this.calculationState.breakthroughsSucceeded++;

            // Apply breakthrough (simplified)
            const newLevel = cultivation[path].level + 1;

            return {
                path: path,
                oldLevel: cultivation[path].level,
                newLevel: newLevel,
                chance: chance,
                timestamp: this.calculationState.timeSimulated
            };
        }

        return null;
    }

    /**
     * Simulate resource consumption
     * @param {number} tickTimeMs - Tick duration
     * @param {number} efficiency - Current efficiency
     * @returns {Object} Resource consumption
     */
    _simulateResourceConsumption(tickTimeMs, efficiency) {
        const activeTechnique = this.techniqueManager.techniqueState.active;
        if (!activeTechnique) {
            return { qi: 0, spiritStones: 0 };
        }

        const technique = CULTIVATION_TECHNIQUES[activeTechnique];
        if (!technique) {
            return { qi: 0, spiritStones: 0 };
        }

        const tickSeconds = tickTimeMs / 1000;
        const qiPerSecond = (technique.resourceCost.qi || 1.0) * 0.1 * efficiency;
        const stonesPerSecond = (technique.resourceCost.spiritStones || 0) * 0.01 * efficiency;

        return {
            qi: qiPerSecond * tickSeconds,
            spiritStones: stonesPerSecond * tickSeconds
        };
    }

    /**
     * Calculate efficiency based on time ratio
     * @param {number} timeRatio - Ratio of time elapsed (0-1)
     * @returns {number} Efficiency value
     */
    _calculateEfficiency(timeRatio) {
        const decayRate = this.config.efficiencyDecayRate;
        const minEfficiency = this.config.minEfficiency;

        // Exponential decay
        const efficiency = Math.exp(-timeRatio * decayRate);

        return Math.max(minEfficiency, efficiency);
    }

    /**
     * Calculate average efficiency over simulation
     * @param {number} totalTicks - Total simulation ticks
     * @returns {number} Average efficiency
     */
    _calculateAverageEfficiency(totalTicks) {
        let totalEfficiency = 0;

        for (let tick = 0; tick < totalTicks; tick++) {
            const timeRatio = tick / totalTicks;
            totalEfficiency += this._calculateEfficiency(timeRatio);
        }

        return totalEfficiency / totalTicks;
    }

    /**
     * Check if player can afford to continue cultivation
     * @param {Object} consumedResources - Resources consumed so far
     * @returns {boolean} Can afford status
     */
    _canAffordContinuation(consumedResources) {
        const currentQi = this.gameState.get('player.qi') || 0;
        const currentStones = this.gameState.get('player.spiritStones') || 0;

        return currentQi >= consumedResources.qi && currentStones >= consumedResources.spiritStones;
    }

    /**
     * Generate final offline results
     * @param {Object} initialState - Initial state snapshot
     * @param {Object} simulationResult - Simulation results
     * @param {number} effectiveHours - Effective offline hours
     * @returns {Object} Final results
     */
    _generateOfflineResults(initialState, simulationResult, effectiveHours) {
        return {
            offlineTime: {
                total: this.calculationState.totalOfflineTime,
                effective: effectiveHours * 60 * 60 * 1000,
                simulated: this.calculationState.timeSimulated
            },
            progress: simulationResult.totalProgress,
            breakthroughs: simulationResult.breakthroughs,
            resourcesConsumed: simulationResult.resourcesConsumed,
            efficiency: simulationResult.efficiency,
            events: simulationResult.events,
            statistics: {
                breakthroughsAttempted: this.calculationState.breakthroughsAttempted,
                breakthroughsSucceeded: this.calculationState.breakthroughsSucceeded,
                successRate: this.calculationState.breakthroughsAttempted > 0 ?
                    this.calculationState.breakthroughsSucceeded / this.calculationState.breakthroughsAttempted : 0
            }
        };
    }

    /**
     * Apply offline results to game state
     * @param {Object} results - Offline calculation results
     */
    _applyOfflineResults(results) {
        // Apply cultivation progress
        if (results.progress.qi > 0) {
            this.gameState.increment('cultivation.qi.experience', results.progress.qi);
        }
        if (results.progress.body > 0) {
            this.gameState.increment('cultivation.body.experience', results.progress.body);
        }
        if (results.progress.dual > 0) {
            this.gameState.increment('cultivation.dual.experience', results.progress.dual);
        }

        // Apply breakthroughs
        results.breakthroughs.forEach(breakthrough => {
            this.gameState.set(`cultivation.${breakthrough.path}.level`, breakthrough.newLevel);
            this.gameState.set(`cultivation.${breakthrough.path}.experience`, 0);
        });

        // Consume resources
        this.gameState.increment('player.qi', -results.resourcesConsumed.qi);
        this.gameState.increment('player.spiritStones', -results.resourcesConsumed.spiritStones);

        // Update statistics
        this.gameState.increment('cultivationStats.totalCultivationTime', results.offlineTime.simulated / 1000);
        this.gameState.increment('cultivationStats.qiBreakthroughs',
            results.breakthroughs.filter(b => b.path === 'qi').length);
        this.gameState.increment('cultivationStats.bodyBreakthroughs',
            results.breakthroughs.filter(b => b.path === 'body').length);
    }

    /**
     * Estimate resource consumption
     * @param {number} hours - Duration in hours
     * @param {string} technique - Active technique
     * @returns {Object} Estimated resource consumption
     */
    _estimateResourceConsumption(hours, technique) {
        if (!technique) {
            return { qi: 0, spiritStones: 0 };
        }

        const techniqueData = CULTIVATION_TECHNIQUES[technique];
        if (!techniqueData) {
            return { qi: 0, spiritStones: 0 };
        }

        const qiPerHour = (techniqueData.resourceCost.qi || 1.0) * 360; // 0.1 per second * 3600
        const stonesPerHour = (techniqueData.resourceCost.spiritStones || 0) * 36; // 0.01 per second * 3600

        return {
            qi: qiPerHour * hours,
            spiritStones: stonesPerHour * hours
        };
    }

    /**
     * Update performance metrics
     * @param {number} calculationTime - Time taken for calculation
     */
    _updatePerformanceMetrics(calculationTime) {
        this.performanceMetrics.calculationTime = calculationTime;

        if (this.performanceMetrics.simulationTicks > 0) {
            this.performanceMetrics.averageTickTime =
                calculationTime / this.performanceMetrics.simulationTicks;
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OfflineCalculator };
} else if (typeof window !== 'undefined') {
    window.OfflineCalculator = OfflineCalculator;
}