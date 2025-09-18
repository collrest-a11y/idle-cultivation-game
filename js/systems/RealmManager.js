/**
 * RealmManager - Manages cultivation realm progression and breakthrough mechanics
 * Handles realm transitions, requirements validation, and realm-specific benefits
 */
class RealmManager {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Current realm state
        this.realmState = {
            currentRealm: "Body Refinement",
            currentStage: 1,
            breakthroughProgress: 0,
            totalBreakthroughs: 0,
            failedBreakthroughs: 0,
            perfectBreakthroughs: 0
        };

        // Realm progression tracking
        this.realmHistory = [];
        this.unlockableRealms = new Set();

        // Breakthrough attempt tracking
        this.breakthroughAttempts = {
            today: 0,
            total: 0,
            lastAttemptTime: 0
        };

        // Achievement tracking
        this.achievements = new Set();

        this.isInitialized = false;

        console.log('RealmManager: Initialized');
    }

    /**
     * Initialize the realm manager with game state
     */
    async initialize() {
        try {
            // Load realm state from game state
            const savedRealmState = this.gameState.get('realm');
            if (savedRealmState) {
                this.realmState = {
                    ...this.realmState,
                    ...savedRealmState
                };
            }

            // Load realm history
            const savedHistory = this.gameState.get('realmHistory');
            if (savedHistory) {
                this.realmHistory = savedHistory;
            }

            // Load breakthrough attempts
            const savedAttempts = this.gameState.get('breakthroughAttempts');
            if (savedAttempts) {
                this.breakthroughAttempts = {
                    ...this.breakthroughAttempts,
                    ...savedAttempts
                };
            }

            // Load achievements
            const savedAchievements = this.gameState.get('realmAchievements');
            if (savedAchievements) {
                this.achievements = new Set(savedAchievements);
            }

            // Initialize unlockable realms based on current state
            this._updateUnlockableRealms();

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;

            this.eventManager.emit('realm:initialized', {
                currentRealm: this.realmState.currentRealm,
                currentStage: this.realmState.currentStage,
                unlockableRealms: Array.from(this.unlockableRealms)
            });

            console.log('RealmManager: Initialization complete');

        } catch (error) {
            console.error('RealmManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get current realm information
     * @returns {Object} Current realm data
     */
    getCurrentRealm() {
        return this.realmState.currentRealm;
    }

    /**
     * Get current stage within realm
     * @returns {number} Current stage
     */
    getCurrentStage() {
        return this.realmState.currentStage;
    }

    /**
     * Get detailed realm information
     * @param {string} realmName - Realm name (optional, defaults to current)
     * @returns {Object} Detailed realm information
     */
    getRealmInfo(realmName = null) {
        const targetRealm = realmName || this.realmState.currentRealm;
        const realmData = CULTIVATION_REALMS[targetRealm];

        if (!realmData) {
            throw new Error(`Unknown realm: ${targetRealm}`);
        }

        return {
            ...realmData,
            isCurrent: targetRealm === this.realmState.currentRealm,
            isUnlocked: this._isRealmUnlocked(targetRealm),
            canBreakthrough: this._canBreakthroughToRealm(targetRealm)
        };
    }

    /**
     * Get current realm progression progress
     * @returns {Object} Progression information
     */
    getRealmProgress() {
        const currentRealmData = CULTIVATION_REALMS[this.realmState.currentRealm];
        if (!currentRealmData) {
            return null;
        }

        const totalStages = currentRealmData.minorStages;
        const progress = (this.realmState.currentStage - 1) / totalStages;

        return {
            currentStage: this.realmState.currentStage,
            totalStages: totalStages,
            progress: progress,
            breakthroughProgress: this.realmState.breakthroughProgress,
            isMaxStage: this.realmState.currentStage >= totalStages,
            canAdvanceRealm: this._canAdvanceToNextRealm()
        };
    }

    /**
     * Check if realm advancement is possible
     * @returns {Object} Advancement check result
     */
    checkRealmAdvancement() {
        const cultivation = this.gameState.get('cultivation');
        if (!cultivation) {
            return { canAdvance: false, reason: 'no_cultivation_data' };
        }

        const currentRealmData = CULTIVATION_REALMS[this.realmState.currentRealm];
        if (!currentRealmData) {
            return { canAdvance: false, reason: 'invalid_realm' };
        }

        // Check if at max stage of current realm
        if (this.realmState.currentStage < currentRealmData.minorStages) {
            return { canAdvance: false, reason: 'not_max_stage' };
        }

        // Get next realm
        const nextRealm = this._getNextRealm();
        if (!nextRealm) {
            return { canAdvance: false, reason: 'no_next_realm' };
        }

        const nextRealmData = CULTIVATION_REALMS[nextRealm];

        // Check cultivation requirements
        const qiLevel = cultivation.qi?.level || 0;
        const bodyLevel = cultivation.body?.level || 0;

        const qiRequired = nextRealmData.requirements.qi?.level || 0;
        const bodyRequired = nextRealmData.requirements.body?.level || 0;

        const meetsRequirements = qiLevel >= qiRequired && bodyLevel >= bodyRequired;

        return {
            canAdvance: meetsRequirements,
            nextRealm: nextRealm,
            requirements: {
                qi: { current: qiLevel, required: qiRequired, met: qiLevel >= qiRequired },
                body: { current: bodyLevel, required: bodyRequired, met: bodyLevel >= bodyRequired }
            },
            currentStage: this.realmState.currentStage,
            maxStage: currentRealmData.minorStages
        };
    }

    /**
     * Attempt breakthrough to next stage or realm
     * @param {Object} options - Breakthrough options
     * @returns {Object} Breakthrough result
     */
    attemptBreakthrough(options = {}) {
        const config = {
            useResources: true,
            usePills: false,
            targetType: 'auto', // 'stage', 'realm', 'auto'
            ...options
        };

        if (!this.isInitialized) {
            throw new Error('RealmManager not initialized');
        }

        // Update attempt tracking
        this.breakthroughAttempts.total++;
        this.breakthroughAttempts.today++;
        this.breakthroughAttempts.lastAttemptTime = Date.now();

        // Determine breakthrough type
        const advancement = this.checkRealmAdvancement();
        const isRealmBreakthrough = advancement.canAdvance && config.targetType !== 'stage';
        const isStageBreakthrough = !isRealmBreakthrough || config.targetType === 'stage';

        let result;

        if (isRealmBreakthrough) {
            result = this._attemptRealmBreakthrough(config);
        } else if (isStageBreakthrough) {
            result = this._attemptStageBreakthrough(config);
        } else {
            return {
                success: false,
                reason: 'no_advancement_possible',
                requirements: advancement.requirements
            };
        }

        // Update statistics
        if (result.success) {
            this.realmState.totalBreakthroughs++;
            if (result.perfect) {
                this.realmState.perfectBreakthroughs++;
            }
        } else {
            this.realmState.failedBreakthroughs++;
        }

        // Save state
        this.saveState();

        return result;
    }

    /**
     * Get current realm benefits and bonuses
     * @returns {Object} Realm benefits
     */
    getCurrentRealmBonus() {
        const realmData = CULTIVATION_REALMS[this.realmState.currentRealm];
        if (!realmData) {
            return {
                cultivation: 1.0,
                qiCapacity: 1.0,
                bodyStrength: 1.0
            };
        }

        const benefits = realmData.benefits;
        const stageBonus = 1 + (this.realmState.currentStage - 1) * 0.02; // 2% per stage

        return {
            cultivation: (1 + benefits.cultivationSpeedBonus) * stageBonus,
            qiCapacity: benefits.qiCapacityMultiplier * stageBonus,
            bodyStrength: benefits.bodyStrengthMultiplier * stageBonus
        };
    }

    /**
     * Get list of all unlockable realms
     * @returns {Array} Array of unlockable realm names
     */
    getUnlockableRealms() {
        return Array.from(this.unlockableRealms);
    }

    /**
     * Get realm history
     * @returns {Array} Array of realm progression history
     */
    getRealmHistory() {
        return [...this.realmHistory];
    }

    /**
     * Get breakthrough statistics
     * @returns {Object} Breakthrough statistics
     */
    getBreakthroughStats() {
        return {
            ...this.breakthroughAttempts,
            totalBreakthroughs: this.realmState.totalBreakthroughs,
            failedBreakthroughs: this.realmState.failedBreakthroughs,
            perfectBreakthroughs: this.realmState.perfectBreakthroughs,
            successRate: this.breakthroughAttempts.total > 0 ?
                this.realmState.totalBreakthroughs / this.breakthroughAttempts.total : 0
        };
    }

    /**
     * Check achievements and unlock new ones
     */
    checkAchievements() {
        const cultivation = this.gameState.get('cultivation');
        if (!cultivation) return;

        Object.values(CULTIVATION_ACHIEVEMENTS).forEach(achievement => {
            if (this.achievements.has(achievement.id)) return;

            let unlocked = false;

            // Check realm-based achievements
            if (achievement.requirement.realm) {
                const realmOrder = Object.keys(CULTIVATION_REALMS);
                const currentIndex = realmOrder.indexOf(this.realmState.currentRealm);
                const requiredIndex = realmOrder.indexOf(achievement.requirement.realm);
                unlocked = currentIndex >= requiredIndex;
            }

            // Check level-based achievements
            if (achievement.requirement.qi?.level) {
                unlocked = unlocked && cultivation.qi.level >= achievement.requirement.qi.level;
            }
            if (achievement.requirement.body?.level) {
                unlocked = unlocked && cultivation.body.level >= achievement.requirement.body.level;
            }

            // Check breakthrough-based achievements
            if (achievement.requirement.breakthroughsInDay) {
                unlocked = unlocked && this.breakthroughAttempts.today >= achievement.requirement.breakthroughsInDay;
            }

            if (unlocked) {
                this._unlockAchievement(achievement);
            }
        });
    }

    /**
     * Save realm state to game state
     */
    saveState() {
        this.gameState.update({
            realm: this.realmState,
            realmHistory: this.realmHistory,
            breakthroughAttempts: this.breakthroughAttempts,
            realmAchievements: Array.from(this.achievements)
        }, { source: 'realm:save' });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Listen for cultivation level changes to update realm progression
        this.eventManager.on('cultivation:level_up', (data) => {
            this._updateUnlockableRealms();
            this.checkAchievements();
        });

        // Reset daily counters
        this.eventManager.on('game:newDay', () => {
            this.breakthroughAttempts.today = 0;
        });

        // Save state on significant events
        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });
    }

    /**
     * Attempt stage breakthrough within current realm
     * @param {Object} config - Breakthrough configuration
     * @returns {Object} Breakthrough result
     */
    _attemptStageBreakthrough(config) {
        const currentRealmData = CULTIVATION_REALMS[this.realmState.currentRealm];

        // Check if at max stage
        if (this.realmState.currentStage >= currentRealmData.minorStages) {
            return {
                success: false,
                reason: 'max_stage_reached'
            };
        }

        // Calculate breakthrough chance for stage
        const cultivation = this.gameState.get('cultivation');
        const resources = this._getAvailableResources();

        // Stage breakthroughs are generally easier than realm breakthroughs
        let chance = 0.7; // Base 70% chance

        // Cultivation level bonus
        const avgLevel = (cultivation.qi.level + cultivation.body.level) / 2;
        const stageRequirement = this.realmState.currentStage * 10; // Rough requirement
        const levelBonus = Math.min((avgLevel - stageRequirement) / stageRequirement, 0.2);
        chance += levelBonus;

        // Resource bonuses
        if (config.usePills && resources.breakthroughPills > 0) {
            chance += 0.15;
        }

        // Previous failure penalty
        if (this.realmState.failedBreakthroughs > 0) {
            chance -= Math.min(this.realmState.failedBreakthroughs * 0.02, 0.1);
        }

        chance = Math.max(0.1, Math.min(0.95, chance));

        // Attempt breakthrough
        const success = Math.random() < chance;

        if (success) {
            this.realmState.currentStage++;

            this.eventManager.emit('realm:stage_breakthrough', {
                realm: this.realmState.currentRealm,
                newStage: this.realmState.currentStage,
                chance: chance
            });

            return {
                success: true,
                type: 'stage',
                newStage: this.realmState.currentStage,
                chance: chance,
                perfect: chance >= 0.9
            };

        } else {
            this.eventManager.emit('realm:breakthrough_failed', {
                type: 'stage',
                chance: chance
            });

            return {
                success: false,
                reason: 'breakthrough_failed',
                type: 'stage',
                chance: chance
            };
        }
    }

    /**
     * Attempt realm breakthrough to next realm
     * @param {Object} config - Breakthrough configuration
     * @returns {Object} Breakthrough result
     */
    _attemptRealmBreakthrough(config) {
        const advancement = this.checkRealmAdvancement();
        if (!advancement.canAdvance) {
            return {
                success: false,
                reason: 'requirements_not_met',
                requirements: advancement.requirements
            };
        }

        const nextRealm = advancement.nextRealm;
        const nextRealmData = CULTIVATION_REALMS[nextRealm];

        // Calculate breakthrough chance
        const cultivation = this.gameState.get('cultivation');
        const resources = this._getAvailableResources();

        let chance = CULTIVATION_FORMULAS.breakthroughChance(
            cultivation.qi.level,
            cultivation.body.level,
            this.realmState.currentRealm,
            this.realmState.currentStage,
            null, // No technique bonus for realm breakthrough
            resources
        );

        // Realm breakthrough penalty (harder than stage breakthrough)
        chance *= 0.6;

        // Resource bonuses
        if (config.usePills && resources.breakthroughPills > 0) {
            chance += 0.2;
        }

        if (config.useResources && resources.spiritStones >= nextRealmData.breakthroughCost.base) {
            chance += 0.15;
        }

        chance = Math.max(0.05, Math.min(0.85, chance));

        // Attempt breakthrough
        const success = Math.random() < chance;

        if (success) {
            this._processRealmAdvancement(nextRealm);

            return {
                success: true,
                type: 'realm',
                newRealm: nextRealm,
                chance: chance,
                perfect: chance >= 0.8
            };

        } else {
            // Consume resources even on failure
            if (config.useResources) {
                this._consumeBreakthroughResources(nextRealmData, false);
            }

            this.eventManager.emit('realm:breakthrough_failed', {
                type: 'realm',
                targetRealm: nextRealm,
                chance: chance
            });

            return {
                success: false,
                reason: 'breakthrough_failed',
                type: 'realm',
                targetRealm: nextRealm,
                chance: chance
            };
        }
    }

    /**
     * Process successful realm advancement
     * @param {string} newRealm - New realm name
     */
    _processRealmAdvancement(newRealm) {
        const oldRealm = this.realmState.currentRealm;
        const newRealmData = CULTIVATION_REALMS[newRealm];

        // Add to history
        this.realmHistory.push({
            realm: oldRealm,
            reachedAt: Date.now(),
            stagesCompleted: this.realmState.currentStage,
            breakthroughsAttempted: this.breakthroughAttempts.total
        });

        // Update realm state
        this.realmState.currentRealm = newRealm;
        this.realmState.currentStage = 1;
        this.realmState.breakthroughProgress = 0;

        // Consume resources
        this._consumeBreakthroughResources(newRealmData, true);

        // Update unlockable realms
        this._updateUnlockableRealms();

        // Check achievements
        this.checkAchievements();

        this.eventManager.emit('realm:advancement', {
            oldRealm: oldRealm,
            newRealm: newRealm,
            newBenefits: newRealmData.benefits,
            newAbilities: newRealmData.abilities
        });

        console.log(`RealmManager: Advanced from ${oldRealm} to ${newRealm}`);
    }

    /**
     * Check if can advance to next realm
     * @returns {boolean} Can advance status
     */
    _canAdvanceToNextRealm() {
        const advancement = this.checkRealmAdvancement();
        return advancement.canAdvance;
    }

    /**
     * Get next realm in progression
     * @returns {string|null} Next realm name or null
     */
    _getNextRealm() {
        const realmOrder = Object.keys(CULTIVATION_REALMS);
        const currentIndex = realmOrder.indexOf(this.realmState.currentRealm);

        if (currentIndex >= 0 && currentIndex < realmOrder.length - 1) {
            return realmOrder[currentIndex + 1];
        }

        return null;
    }

    /**
     * Check if realm is unlocked
     * @param {string} realmName - Realm to check
     * @returns {boolean} Is unlocked status
     */
    _isRealmUnlocked(realmName) {
        return this.unlockableRealms.has(realmName);
    }

    /**
     * Check if can breakthrough to specific realm
     * @param {string} realmName - Target realm
     * @returns {boolean} Can breakthrough status
     */
    _canBreakthroughToRealm(realmName) {
        const realmData = CULTIVATION_REALMS[realmName];
        if (!realmData) return false;

        const cultivation = this.gameState.get('cultivation');
        if (!cultivation) return false;

        const qiLevel = cultivation.qi?.level || 0;
        const bodyLevel = cultivation.body?.level || 0;

        const qiRequired = realmData.requirements.qi?.level || 0;
        const bodyRequired = realmData.requirements.body?.level || 0;

        return qiLevel >= qiRequired && bodyLevel >= bodyRequired;
    }

    /**
     * Update list of unlockable realms based on current cultivation
     */
    _updateUnlockableRealms() {
        const cultivation = this.gameState.get('cultivation');
        if (!cultivation) return;

        this.unlockableRealms.clear();

        Object.keys(CULTIVATION_REALMS).forEach(realmName => {
            if (this._canBreakthroughToRealm(realmName)) {
                this.unlockableRealms.add(realmName);
            }
        });
    }

    /**
     * Get available resources for breakthrough
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
     * Consume resources for breakthrough attempt
     * @param {Object} realmData - Target realm data
     * @param {boolean} success - Whether breakthrough succeeded
     */
    _consumeBreakthroughResources(realmData, success) {
        const cost = realmData.breakthroughCost.base;
        const currentStones = this.gameState.get('player.spiritStones') || 0;

        // Consume spirit stones (partial cost on failure)
        const stonesToConsume = success ? cost : Math.floor(cost * 0.3);
        const newStones = Math.max(0, currentStones - stonesToConsume);

        this.gameState.set('player.spiritStones', newStones, { source: 'realm:breakthrough' });
    }

    /**
     * Unlock achievement and apply rewards
     * @param {Object} achievement - Achievement data
     */
    _unlockAchievement(achievement) {
        this.achievements.add(achievement.id);

        // Apply rewards
        if (achievement.reward) {
            if (achievement.reward.spiritStones) {
                this.gameState.increment('player.spiritStones', achievement.reward.spiritStones);
            }

            if (achievement.reward.technique) {
                // Unlock technique (would need TechniqueManager integration)
                this.eventManager.emit('technique:unlocked', {
                    technique: achievement.reward.technique,
                    source: 'achievement'
                });
            }
        }

        this.eventManager.emit('achievement:unlocked', {
            achievement: achievement,
            timestamp: Date.now()
        });

        console.log(`RealmManager: Achievement unlocked: ${achievement.id}`);
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealmManager };
} else if (typeof window !== 'undefined') {
    window.RealmManager = RealmManager;
}