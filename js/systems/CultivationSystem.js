/**
 * CultivationSystem - Core cultivation mechanics with dual path progression
 * Manages Qi and Body cultivation paths, experience tracking, and progression
 */
class CultivationSystem {
    constructor(gameState, eventManager, realmManager, techniqueManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.realmManager = realmManager;
        this.techniqueManager = techniqueManager;

        // Cultivation state
        this.cultivationState = {
            qi: {
                level: 0,
                experience: 0,
                baseRate: 1.0,
                currentMultiplier: 1.0
            },
            body: {
                level: 0,
                experience: 0,
                baseRate: 1.0,
                currentMultiplier: 1.0
            },
            dual: {
                level: 0,
                experience: 0,
                unlocked: false,
                synergyBonus: 0.0
            }
        };

        // Active effects and modifiers
        this.activeEffects = {
            techniques: new Map(),
            pills: new Map(),
            environmental: new Map(),
            temporary: new Map()
        };

        // Cultivation statistics
        this.statistics = {
            totalCultivationTime: 0,
            qiBreakthroughs: 0,
            bodyBreakthroughs: 0,
            dualBreakthroughs: 0,
            perfectBreakthroughs: 0,
            failedBreakthroughs: 0,
            pillsConsumed: 0,
            spiritStonesUsed: 0
        };

        // Performance tracking
        this.lastUpdateTime = Date.now();
        this.progressBuffer = {
            qi: 0,
            body: 0,
            dual: 0
        };

        this.isInitialized = false;
        this.isActive = false;

        console.log('CultivationSystem: Initialized');
    }

    /**
     * Initialize the cultivation system with game state
     */
    async initialize() {
        try {
            // Load cultivation state from game state
            const savedState = this.gameState.get('cultivation');
            if (savedState) {
                this.cultivationState = {
                    ...this.cultivationState,
                    ...savedState
                };
            }

            // Load statistics
            const savedStats = this.gameState.get('cultivationStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Set up event listeners
            this._setupEventListeners();

            // Initialize cultivation paths
            this._initializeCultivationPaths();

            // Calculate initial synergy
            this._updateDualCultivationSynergy();

            this.isInitialized = true;
            this.isActive = true;

            this.eventManager.emit('cultivation:initialized', {
                state: this.cultivationState,
                statistics: this.statistics
            });

            console.log('CultivationSystem: Initialization complete');

        } catch (error) {
            console.error('CultivationSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start cultivation process
     * @param {string} path - 'qi', 'body', or 'dual'
     * @param {string} technique - Active technique name
     */
    startCultivation(path, technique = null) {
        if (!this.isInitialized) {
            throw new Error('CultivationSystem not initialized');
        }

        // Validate path
        if (!['qi', 'body', 'dual'].includes(path)) {
            throw new Error(`Invalid cultivation path: ${path}`);
        }

        // Check if dual cultivation is unlocked
        if (path === 'dual' && !this.cultivationState.dual.unlocked) {
            throw new Error('Dual cultivation not unlocked');
        }

        // Validate and apply technique
        if (technique) {
            const canUse = this.techniqueManager.canUseTechnique(technique, this.cultivationState);
            if (!canUse.valid) {
                throw new Error(`Cannot use technique: ${canUse.reason}`);
            }
            this.techniqueManager.activateTechnique(technique);
        }

        // Start cultivation process
        this.isActive = true;
        this.activePath = path;
        this.activeTechnique = technique;
        this.lastUpdateTime = Date.now();

        // Calculate current cultivation rates
        this._updateCultivationRates();

        this.eventManager.emit('cultivation:started', {
            path: path,
            technique: technique,
            rates: this._getCurrentRates()
        });

        console.log(`CultivationSystem: Started ${path} cultivation with technique: ${technique || 'none'}`);
    }

    /**
     * Stop cultivation process
     */
    stopCultivation() {
        if (!this.isActive) {
            return;
        }

        // Process any remaining progress
        this._processProgress();

        // Deactivate technique
        if (this.activeTechnique) {
            this.techniqueManager.deactivateTechnique(this.activeTechnique);
        }

        this.isActive = false;
        this.activePath = null;
        this.activeTechnique = null;

        this.eventManager.emit('cultivation:stopped', {
            finalState: this.cultivationState
        });

        console.log('CultivationSystem: Cultivation stopped');
    }

    /**
     * Update cultivation progress (called by game loop)
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isActive || !this.isInitialized) {
            return;
        }

        const deltaSeconds = deltaTime / 1000;
        this.statistics.totalCultivationTime += deltaSeconds;

        // Calculate progress for active path
        const progress = this._calculateProgress(deltaSeconds);

        // Add to buffer for smooth progression
        this.progressBuffer.qi += progress.qi;
        this.progressBuffer.body += progress.body;
        this.progressBuffer.dual += progress.dual;

        // Apply buffered progress when it reaches threshold
        this._applyBufferedProgress();

        // Update cultivation rates based on current state
        this._updateCultivationRates();

        // Check for automatic breakthroughs
        this._checkAutoBreakthroughs();
    }

    /**
     * Attempt breakthrough to next level
     * @param {string} path - 'qi', 'body', or 'dual'
     * @param {Object} options - Breakthrough options
     * @returns {Object} Breakthrough result
     */
    attemptBreakthrough(path, options = {}) {
        const config = {
            useResources: true,
            usePills: false,
            forceAttempt: false,
            ...options
        };

        if (!this.cultivationState[path]) {
            throw new Error(`Invalid cultivation path: ${path}`);
        }

        const currentState = this.cultivationState[path];

        // Check if breakthrough is needed
        const experienceRequired = CULTIVATION_FORMULAS.experienceRequired(currentState.level);
        if (currentState.experience < experienceRequired && !config.forceAttempt) {
            return {
                success: false,
                reason: 'insufficient_experience',
                experienceNeeded: experienceRequired - currentState.experience
            };
        }

        // Calculate breakthrough chance
        const realm = this.realmManager.getCurrentRealm();
        const stage = this.realmManager.getCurrentStage();

        const resources = this._getAvailableResources();
        const chance = CULTIVATION_FORMULAS.breakthroughChance(
            this.cultivationState.qi.level,
            this.cultivationState.body.level,
            realm,
            stage,
            this.activeTechnique,
            resources
        );

        // Attempt breakthrough
        const success = Math.random() < chance;

        if (success) {
            this._processSuccessfulBreakthrough(path, currentState);

            // Update statistics
            this.statistics[`${path}Breakthroughs`]++;
            if (chance >= 0.95) {
                this.statistics.perfectBreakthroughs++;
            }

            this.eventManager.emit('cultivation:breakthrough', {
                path: path,
                newLevel: currentState.level,
                chance: chance,
                perfect: chance >= 0.95
            });

            return {
                success: true,
                newLevel: currentState.level,
                chance: chance,
                perfect: chance >= 0.95
            };

        } else {
            this._processFailedBreakthrough(path, currentState);

            this.statistics.failedBreakthroughs++;

            this.eventManager.emit('cultivation:breakthrough_failed', {
                path: path,
                chance: chance,
                level: currentState.level
            });

            return {
                success: false,
                reason: 'breakthrough_failed',
                chance: chance,
                penalty: 0.1 // 10% experience loss on failure
            };
        }
    }

    /**
     * Get current cultivation rates for all paths
     * @returns {Object} Current cultivation rates
     */
    getCurrentRates() {
        return this._getCurrentRates();
    }

    /**
     * Get cultivation state for specific path
     * @param {string} path - Cultivation path
     * @returns {Object} Path state
     */
    getPathState(path) {
        return this.cultivationState[path] ? { ...this.cultivationState[path] } : null;
    }

    /**
     * Get all cultivation statistics
     * @returns {Object} Cultivation statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Apply temporary cultivation boost
     * @param {Object} effect - Effect definition
     * @param {number} duration - Duration in seconds
     */
    applyTemporaryEffect(effect, duration) {
        const effectId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.activeEffects.temporary.set(effectId, {
            ...effect,
            startTime: Date.now(),
            duration: duration * 1000 // Convert to milliseconds
        });

        // Update cultivation rates
        this._updateCultivationRates();

        this.eventManager.emit('cultivation:effect_applied', {
            effectId: effectId,
            effect: effect,
            duration: duration
        });

        // Set up automatic removal
        setTimeout(() => {
            this.removeTemporaryEffect(effectId);
        }, duration * 1000);

        return effectId;
    }

    /**
     * Remove temporary effect
     * @param {string} effectId - Effect ID to remove
     */
    removeTemporaryEffect(effectId) {
        if (this.activeEffects.temporary.has(effectId)) {
            this.activeEffects.temporary.delete(effectId);
            this._updateCultivationRates();

            this.eventManager.emit('cultivation:effect_removed', {
                effectId: effectId
            });
        }
    }

    /**
     * Check if dual cultivation can be unlocked
     * @returns {Object} Unlock status and requirements
     */
    checkDualCultivationUnlock() {
        const qiLevel = this.cultivationState.qi.level;
        const bodyLevel = this.cultivationState.body.level;
        const minLevel = 25; // Minimum level required for both paths

        const canUnlock = qiLevel >= minLevel && bodyLevel >= minLevel;

        return {
            canUnlock: canUnlock,
            requirements: {
                qiLevel: { current: qiLevel, required: minLevel },
                bodyLevel: { current: bodyLevel, required: minLevel }
            },
            unlocked: this.cultivationState.dual.unlocked
        };
    }

    /**
     * Unlock dual cultivation
     * @returns {boolean} Success status
     */
    unlockDualCultivation() {
        const unlockCheck = this.checkDualCultivationUnlock();

        if (!unlockCheck.canUnlock || unlockCheck.unlocked) {
            return false;
        }

        this.cultivationState.dual.unlocked = true;
        this._updateDualCultivationSynergy();

        this.eventManager.emit('cultivation:dual_unlocked', {
            qiLevel: this.cultivationState.qi.level,
            bodyLevel: this.cultivationState.body.level
        });

        console.log('CultivationSystem: Dual cultivation unlocked');
        return true;
    }

    /**
     * Save current state to game state
     */
    saveState() {
        this.gameState.update({
            cultivation: this.cultivationState,
            cultivationStats: this.statistics
        }, { source: 'cultivation:save' });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save state on significant events
        this.eventManager.on('cultivation:breakthrough', () => {
            this.saveState();
        });

        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });

        // Technique events
        this.eventManager.on('technique:activated', (data) => {
            this._updateCultivationRates();
        });

        this.eventManager.on('technique:deactivated', (data) => {
            this._updateCultivationRates();
        });

        // Realm change events
        this.eventManager.on('realm:changed', (data) => {
            this._updateCultivationRates();
        });
    }

    /**
     * Initialize cultivation paths with default values
     */
    _initializeCultivationPaths() {
        // Ensure minimum structure exists
        Object.keys(this.cultivationState).forEach(path => {
            if (!this.cultivationState[path]) {
                this.cultivationState[path] = {
                    level: 0,
                    experience: 0,
                    baseRate: 1.0,
                    currentMultiplier: 1.0
                };
            }
        });

        // Check for dual cultivation unlock
        const unlockCheck = this.checkDualCultivationUnlock();
        if (unlockCheck.canUnlock && !unlockCheck.unlocked) {
            // Auto-unlock if requirements are met (for save compatibility)
            this.unlockDualCultivation();
        }
    }

    /**
     * Calculate progress for current update cycle
     * @param {number} deltaSeconds - Time elapsed in seconds
     * @returns {Object} Progress amounts for each path
     */
    _calculateProgress(deltaSeconds) {
        const progress = { qi: 0, body: 0, dual: 0 };

        if (!this.activePath) {
            return progress;
        }

        // Get current rates
        const rates = this._getCurrentRates();

        // Calculate base progress
        if (this.activePath === 'qi') {
            progress.qi = rates.qi * deltaSeconds;
        } else if (this.activePath === 'body') {
            progress.body = rates.body * deltaSeconds;
        } else if (this.activePath === 'dual') {
            progress.qi = rates.dual * 0.5 * deltaSeconds;
            progress.body = rates.dual * 0.5 * deltaSeconds;
            progress.dual = rates.dual * deltaSeconds;
        }

        // Apply bottleneck effects
        progress.qi *= CULTIVATION_BOTTLENECKS.getBottleneckMultiplier(this.cultivationState.qi.level);
        progress.body *= CULTIVATION_BOTTLENECKS.getBottleneckMultiplier(this.cultivationState.body.level);

        return progress;
    }

    /**
     * Apply buffered progress to cultivation state
     */
    _applyBufferedProgress() {
        const threshold = 1.0; // Apply progress when buffer reaches 1 point

        Object.keys(this.progressBuffer).forEach(path => {
            if (this.progressBuffer[path] >= threshold) {
                const progressToApply = Math.floor(this.progressBuffer[path]);
                this.progressBuffer[path] -= progressToApply;

                // Apply to cultivation state
                if (this.cultivationState[path]) {
                    this.cultivationState[path].experience += progressToApply;

                    // Check for level up
                    this._checkLevelUp(path);
                }
            }
        });
    }

    /**
     * Check and process level ups
     * @param {string} path - Cultivation path
     */
    _checkLevelUp(path) {
        const pathState = this.cultivationState[path];
        if (!pathState) return;

        const experienceRequired = CULTIVATION_FORMULAS.experienceRequired(pathState.level);

        if (pathState.experience >= experienceRequired) {
            pathState.level++;
            pathState.experience -= experienceRequired;

            // Update synergy if qi or body leveled up
            if (path === 'qi' || path === 'body') {
                this._updateDualCultivationSynergy();
            }

            this.eventManager.emit('cultivation:level_up', {
                path: path,
                newLevel: pathState.level,
                remainingExperience: pathState.experience
            });

            // Check for realm advancement
            this.realmManager.checkRealmAdvancement();

            // Recursive check in case of multiple level ups
            this._checkLevelUp(path);
        }
    }

    /**
     * Update current cultivation rates
     */
    _updateCultivationRates() {
        const baseRates = {
            qi: this.cultivationState.qi.baseRate,
            body: this.cultivationState.body.baseRate,
            dual: Math.min(this.cultivationState.qi.baseRate, this.cultivationState.body.baseRate)
        };

        // Apply technique effects
        const techniqueMultipliers = this.techniqueManager.getActiveMultipliers();

        // Apply temporary effects
        const tempMultipliers = this._calculateTemporaryMultipliers();

        // Apply realm bonuses
        const realmBonus = this.realmManager.getCurrentRealmBonus();

        // Apply synergy bonus for dual cultivation
        const synergyBonus = this.cultivationState.dual.synergyBonus;

        // Calculate final rates
        this.cultivationState.qi.currentMultiplier =
            techniqueMultipliers.qi * tempMultipliers.qi * realmBonus.cultivation;

        this.cultivationState.body.currentMultiplier =
            techniqueMultipliers.body * tempMultipliers.body * realmBonus.cultivation;

        this.cultivationState.dual.currentMultiplier =
            techniqueMultipliers.dual * tempMultipliers.dual * realmBonus.cultivation * (1 + synergyBonus);
    }

    /**
     * Get current cultivation rates
     * @returns {Object} Current rates for all paths
     */
    _getCurrentRates() {
        return {
            qi: this.cultivationState.qi.baseRate * this.cultivationState.qi.currentMultiplier,
            body: this.cultivationState.body.baseRate * this.cultivationState.body.currentMultiplier,
            dual: this.cultivationState.dual.baseRate * this.cultivationState.dual.currentMultiplier
        };
    }

    /**
     * Calculate temporary effect multipliers
     * @returns {Object} Multipliers from temporary effects
     */
    _calculateTemporaryMultipliers() {
        const multipliers = { qi: 1.0, body: 1.0, dual: 1.0 };
        const currentTime = Date.now();

        // Process temporary effects
        for (const [effectId, effect] of this.activeEffects.temporary) {
            if (currentTime > effect.startTime + effect.duration) {
                // Effect expired, remove it
                this.activeEffects.temporary.delete(effectId);
                continue;
            }

            // Apply effect multipliers
            if (effect.qiMultiplier) multipliers.qi *= effect.qiMultiplier;
            if (effect.bodyMultiplier) multipliers.body *= effect.bodyMultiplier;
            if (effect.dualMultiplier) multipliers.dual *= effect.dualMultiplier;
        }

        return multipliers;
    }

    /**
     * Update dual cultivation synergy bonus
     */
    _updateDualCultivationSynergy() {
        const qiLevel = this.cultivationState.qi.level;
        const bodyLevel = this.cultivationState.body.level;

        this.cultivationState.dual.synergyBonus =
            CULTIVATION_FORMULAS.dualCultivationSynergy(qiLevel, bodyLevel);
    }

    /**
     * Process successful breakthrough
     * @param {string} path - Cultivation path
     * @param {Object} pathState - Current path state
     */
    _processSuccessfulBreakthrough(path, pathState) {
        pathState.level++;
        pathState.experience = 0;

        // Increase base rate slightly
        pathState.baseRate *= 1.05;

        // Update synergy if needed
        if (path === 'qi' || path === 'body') {
            this._updateDualCultivationSynergy();
        }
    }

    /**
     * Process failed breakthrough
     * @param {string} path - Cultivation path
     * @param {Object} pathState - Current path state
     */
    _processFailedBreakthrough(path, pathState) {
        // Lose some experience on failure
        pathState.experience *= 0.9;
    }

    /**
     * Check for automatic breakthroughs
     */
    _checkAutoBreakthroughs() {
        // Implement automatic breakthrough logic for idle progression
        // Could be based on player settings or certain conditions
    }

    /**
     * Get available resources for cultivation
     * @returns {Object} Available resources
     */
    _getAvailableResources() {
        return {
            spiritStones: this.gameState.get('player.spiritStones') || 0,
            breakthroughPills: this.gameState.get('player.breakthroughPills') || 0,
            qi: this.gameState.get('player.qi') || 0
        };
    }

    /**
     * Process any remaining progress before stopping
     */
    _processProgress() {
        // Apply any remaining buffered progress
        Object.keys(this.progressBuffer).forEach(path => {
            if (this.progressBuffer[path] > 0 && this.cultivationState[path]) {
                this.cultivationState[path].experience += this.progressBuffer[path];
                this.progressBuffer[path] = 0;
                this._checkLevelUp(path);
            }
        });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CultivationSystem };
} else if (typeof window !== 'undefined') {
    window.CultivationSystem = CultivationSystem;
}