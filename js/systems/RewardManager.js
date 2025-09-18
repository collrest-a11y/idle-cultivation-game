/**
 * RewardManager - Centralized reward distribution and bonus management system
 * Handles reward calculation, distribution, and special effects for quests and achievements
 */
class RewardManager {
    constructor(gameState, eventManager, saveManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.saveManager = saveManager;

        // Reward state and configuration
        this.rewardState = {
            activeBonuses: new Map(),
            rewardMultipliers: new Map(),
            temporaryEffects: new Map(),
            rewardHistory: [],
            totalRewardsAwarded: 0
        };

        // Reward distribution settings
        this.distributionSettings = {
            batchProcessing: true,
            maxBatchSize: 20,
            delayBetweenRewards: 100, // milliseconds
            animationDuration: 1000,
            showIndividualRewards: true
        };

        // Reward calculation modifiers
        this.globalModifiers = {
            jadeMod: 1.0,
            spiritCrystalMod: 1.0,
            shardMod: 1.0,
            experienceMod: 1.0,
            luckMod: 1.0
        };

        // Special reward effects
        this.specialEffects = new Map();

        // Statistics tracking
        this.statistics = {
            totalJadeAwarded: 0,
            totalCrystalsAwarded: 0,
            totalShardsAwarded: 0,
            totalExperienceAwarded: 0,
            questRewards: 0,
            achievementRewards: 0,
            bonusRewards: 0,
            averageRewardValue: 0,
            biggestReward: 0
        };

        // Reward queue for batch processing
        this.rewardQueue = [];
        this.isProcessing = false;

        this.isInitialized = false;
        this.isActive = false;

        console.log('RewardManager: Initialized');
    }

    /**
     * Initialize the reward manager
     */
    async initialize() {
        try {
            // Load saved reward state
            const savedState = this.gameState.get('rewardState');
            if (savedState) {
                this.rewardState = { ...this.rewardState, ...savedState };
                // Convert arrays back to Maps if necessary
                if (Array.isArray(savedState.activeBonuses)) {
                    this.rewardState.activeBonuses = new Map(savedState.activeBonuses);
                }
                if (Array.isArray(savedState.rewardMultipliers)) {
                    this.rewardState.rewardMultipliers = new Map(savedState.rewardMultipliers);
                }
                if (Array.isArray(savedState.temporaryEffects)) {
                    this.rewardState.temporaryEffects = new Map(savedState.temporaryEffects);
                }
            }

            // Load statistics
            const savedStats = this.gameState.get('rewardStats');
            if (savedStats) {
                this.statistics = { ...this.statistics, ...savedStats };
            }

            // Set up special effect handlers
            this._setupSpecialEffects();

            // Set up event listeners
            this._setupEventListeners();

            // Initialize global modifiers based on player progress
            this._updateGlobalModifiers();

            // Start reward processing loop
            this._startRewardProcessing();

            // Clean up expired bonuses
            this._cleanupExpiredBonuses();

            this.isInitialized = true;
            this.isActive = true;

            // Emit initialization event
            this.eventManager.emit('rewardManager:initialized', {
                activeBonuses: this.rewardState.activeBonuses.size,
                totalRewardsAwarded: this.rewardState.totalRewardsAwarded
            });

            console.log('RewardManager: Initialization complete');
            return true;

        } catch (error) {
            console.error('RewardManager: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Award rewards to the player
     * @param {Object} rewards - Rewards to award
     * @param {Object} options - Award options and metadata
     * @returns {Object} Award result with calculated values
     */
    awardRewards(rewards, options = {}) {
        if (!this.isActive) {
            console.warn('RewardManager: Cannot award rewards - system not active');
            return null;
        }

        try {
            const awardData = {
                id: this._generateRewardId(),
                rewards: rewards,
                options: options,
                timestamp: Date.now(),
                processed: false
            };

            // Calculate final reward values
            const calculatedRewards = this._calculateFinalRewards(rewards, options);
            awardData.calculatedRewards = calculatedRewards;

            if (this.distributionSettings.batchProcessing) {
                // Add to queue for batch processing
                this.rewardQueue.push(awardData);
            } else {
                // Process immediately
                this._processRewardAward(awardData);
            }

            return {
                success: true,
                rewardId: awardData.id,
                calculatedRewards: calculatedRewards,
                immediate: !this.distributionSettings.batchProcessing
            };

        } catch (error) {
            console.error('RewardManager: Failed to award rewards:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add a temporary reward bonus
     * @param {string} bonusId - Unique bonus identifier
     * @param {Object} bonusData - Bonus configuration
     * @returns {boolean} Success status
     */
    addRewardBonus(bonusId, bonusData) {
        try {
            const bonus = {
                id: bonusId,
                name: bonusData.name || 'Temporary Bonus',
                description: bonusData.description || '',
                multipliers: bonusData.multipliers || {},
                flatBonuses: bonusData.flatBonuses || {},
                duration: bonusData.duration || 3600000, // 1 hour default
                startTime: Date.now(),
                source: bonusData.source || 'unknown',
                stackable: bonusData.stackable || false
            };

            // Check if bonus already exists and handle stacking
            if (this.rewardState.activeBonuses.has(bonusId)) {
                if (!bonus.stackable) {
                    // Replace existing bonus
                    this.rewardState.activeBonuses.set(bonusId, bonus);
                } else {
                    // Stack the bonus (combine effects)
                    this._stackBonus(bonusId, bonus);
                }
            } else {
                this.rewardState.activeBonuses.set(bonusId, bonus);
            }

            // Update global modifiers
            this._updateGlobalModifiers();

            // Save state
            this._saveRewardState();

            // Emit bonus added event
            this.eventManager.emit('rewardManager:bonusAdded', {
                bonus: bonus,
                activeBonuses: this.rewardState.activeBonuses.size
            });

            console.log(`RewardManager: Added reward bonus: ${bonus.name}`);
            return true;

        } catch (error) {
            console.error('RewardManager: Failed to add reward bonus:', error);
            return false;
        }
    }

    /**
     * Remove a reward bonus
     * @param {string} bonusId - Bonus identifier to remove
     * @returns {boolean} Success status
     */
    removeRewardBonus(bonusId) {
        try {
            const bonus = this.rewardState.activeBonuses.get(bonusId);
            if (!bonus) {
                return false;
            }

            this.rewardState.activeBonuses.delete(bonusId);

            // Update global modifiers
            this._updateGlobalModifiers();

            // Save state
            this._saveRewardState();

            // Emit bonus removed event
            this.eventManager.emit('rewardManager:bonusRemoved', {
                bonusId: bonusId,
                bonus: bonus
            });

            console.log(`RewardManager: Removed reward bonus: ${bonus.name}`);
            return true;

        } catch (error) {
            console.error('RewardManager: Failed to remove reward bonus:', error);
            return false;
        }
    }

    /**
     * Get active reward bonuses
     * @returns {Array} Array of active bonuses
     */
    getActiveBonuses() {
        const bonuses = [];
        for (const [bonusId, bonus] of this.rewardState.activeBonuses) {
            const timeRemaining = this._getBonusTimeRemaining(bonus);
            bonuses.push({
                ...bonus,
                timeRemaining: timeRemaining,
                isExpired: timeRemaining <= 0
            });
        }
        return bonuses;
    }

    /**
     * Get reward statistics
     * @returns {Object} Reward statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            activeBonuses: this.rewardState.activeBonuses.size,
            globalModifiers: { ...this.globalModifiers },
            rewardHistory: this.rewardState.rewardHistory.slice(-10) // Last 10 rewards
        };
    }

    /**
     * Calculate what rewards would be with current bonuses
     * @param {Object} baseRewards - Base reward amounts
     * @param {Object} options - Calculation options
     * @returns {Object} Calculated reward preview
     */
    previewRewards(baseRewards, options = {}) {
        return this._calculateFinalRewards(baseRewards, options);
    }

    /**
     * Apply special reward effect
     * @param {string} effectId - Effect identifier
     * @param {Object} effectData - Effect configuration
     * @param {number} duration - Effect duration in milliseconds
     */
    applySpecialEffect(effectId, effectData, duration = 3600000) {
        try {
            const effect = {
                id: effectId,
                data: effectData,
                startTime: Date.now(),
                duration: duration,
                endTime: Date.now() + duration
            };

            this.rewardState.temporaryEffects.set(effectId, effect);

            // Apply effect immediately
            const handler = this.specialEffects.get(effectId);
            if (handler) {
                handler.apply(effectData);
            }

            // Save state
            this._saveRewardState();

            // Emit effect applied event
            this.eventManager.emit('rewardManager:specialEffectApplied', {
                effect: effect
            });

            console.log(`RewardManager: Applied special effect: ${effectId}`);

        } catch (error) {
            console.error('RewardManager: Failed to apply special effect:', error);
        }
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isActive: this.isActive,
            isInitialized: this.isInitialized,
            isProcessing: this.isProcessing,
            queueSize: this.rewardQueue.length,
            activeBonuses: this.rewardState.activeBonuses.size,
            temporaryEffects: this.rewardState.temporaryEffects.size,
            globalModifiers: this.globalModifiers,
            statistics: this.statistics
        };
    }

    // Private methods

    /**
     * Calculate final reward values with all bonuses applied
     * @param {Object} baseRewards - Base reward amounts
     * @param {Object} options - Calculation options
     * @returns {Object} Final calculated rewards
     */
    _calculateFinalRewards(baseRewards, options = {}) {
        const finalRewards = {};

        for (const [rewardType, baseAmount] of Object.entries(baseRewards)) {
            if (typeof baseAmount !== 'number') {
                // Non-numeric rewards (titles, etc.) pass through unchanged
                finalRewards[rewardType] = baseAmount;
                continue;
            }

            let finalAmount = baseAmount;

            // Apply global modifiers
            const globalMod = this.globalModifiers[`${rewardType}Mod`] || 1.0;
            finalAmount *= globalMod;

            // Apply active bonus multipliers
            for (const bonus of this.rewardState.activeBonuses.values()) {
                if (bonus.multipliers[rewardType]) {
                    finalAmount *= bonus.multipliers[rewardType];
                }
            }

            // Apply flat bonuses
            for (const bonus of this.rewardState.activeBonuses.values()) {
                if (bonus.flatBonuses[rewardType]) {
                    finalAmount += bonus.flatBonuses[rewardType];
                }
            }

            // Apply source-specific modifiers
            if (options.source) {
                const sourceMod = this._getSourceModifier(options.source, rewardType);
                finalAmount *= sourceMod;
            }

            // Apply rarity modifiers for achievements
            if (options.rarity) {
                const rarityMod = this._getRarityModifier(options.rarity);
                finalAmount *= rarityMod;
            }

            // Apply luck factor for random rewards
            if (options.applyLuck !== false) {
                finalAmount *= this.globalModifiers.luckMod;
            }

            // Round final amount
            finalRewards[rewardType] = Math.floor(finalAmount);
        }

        return finalRewards;
    }

    /**
     * Process a reward award
     * @param {Object} awardData - Award data to process
     */
    _processRewardAward(awardData) {
        try {
            const { calculatedRewards, options } = awardData;

            // Apply rewards to game state
            for (const [rewardType, amount] of Object.entries(calculatedRewards)) {
                this._applyReward(rewardType, amount, options);
            }

            // Update statistics
            this._updateStatistics(calculatedRewards, options);

            // Add to history
            this._addToHistory(awardData);

            // Mark as processed
            awardData.processed = true;

            // Emit reward awarded event
            this.eventManager.emit('rewardManager:rewardsAwarded', {
                rewardId: awardData.id,
                rewards: calculatedRewards,
                source: options.source || 'unknown',
                timestamp: awardData.timestamp
            });

            console.log('RewardManager: Rewards awarded:', calculatedRewards);

        } catch (error) {
            console.error('RewardManager: Failed to process reward award:', error);
        }
    }

    /**
     * Apply a single reward to the game state
     * @param {string} rewardType - Type of reward
     * @param {*} amount - Reward amount or value
     * @param {Object} options - Award options
     */
    _applyReward(rewardType, amount, options) {
        switch (rewardType) {
            case 'jade':
                this.gameState.increment('player.jade', amount);
                this.statistics.totalJadeAwarded += amount;
                break;

            case 'spiritCrystals':
                this.gameState.increment('player.spiritCrystals', amount);
                this.statistics.totalCrystalsAwarded += amount;
                break;

            case 'shards':
                this.gameState.increment('player.shards', amount);
                this.statistics.totalShardsAwarded += amount;
                break;

            case 'experience':
                this._applyExperienceReward(amount, options);
                this.statistics.totalExperienceAwarded += amount;
                break;

            case 'title':
                this._applyTitleReward(amount, options);
                break;

            case 'cultivationBonus':
                this._applyCultivationBonusReward(amount, options);
                break;

            case 'jadeBonus':
                this._applyJadeBonusReward(amount, options);
                break;

            case 'sectReputation':
                this._applySectReputationReward(amount, options);
                break;

            default:
                console.log(`RewardManager: Unhandled reward type: ${rewardType}`);
        }
    }

    /**
     * Apply experience reward to appropriate cultivation path
     * @param {number} amount - Experience amount
     * @param {Object} options - Award options
     */
    _applyExperienceReward(amount, options) {
        // Default to qi cultivation if not specified
        const path = options.cultivationPath || 'qi';

        switch (path) {
            case 'qi':
                this.gameState.increment('cultivation.qi.experience', amount);
                break;
            case 'body':
                this.gameState.increment('cultivation.body.experience', amount);
                break;
            case 'dual':
                if (this.gameState.get('cultivation.dual.unlocked')) {
                    this.gameState.increment('cultivation.dual.experience', amount);
                }
                break;
            default:
                // Split between qi and body
                const halfAmount = Math.floor(amount / 2);
                this.gameState.increment('cultivation.qi.experience', halfAmount);
                this.gameState.increment('cultivation.body.experience', amount - halfAmount);
        }
    }

    /**
     * Apply title reward
     * @param {string} title - Title to award
     * @param {Object} options - Award options
     */
    _applyTitleReward(title, options) {
        // Add to player's available titles
        const currentTitles = this.gameState.get('player.availableTitles') || [];
        if (!currentTitles.includes(title)) {
            currentTitles.push(title);
            this.gameState.set('player.availableTitles', currentTitles);

            // If player has no current title, set this as current
            if (!this.gameState.get('player.currentTitle')) {
                this.gameState.set('player.currentTitle', title);
            }
        }
    }

    /**
     * Apply cultivation bonus reward
     * @param {number} bonusAmount - Bonus multiplier
     * @param {Object} options - Award options
     */
    _applyCultivationBonusReward(bonusAmount, options) {
        const duration = options.bonusDuration || 3600000; // 1 hour default

        this.addRewardBonus(`cultivation_bonus_${Date.now()}`, {
            name: 'Cultivation Bonus',
            description: `+${Math.round(bonusAmount * 100)}% cultivation experience`,
            multipliers: {
                experience: 1 + bonusAmount
            },
            duration: duration,
            source: 'reward'
        });
    }

    /**
     * Apply jade bonus reward
     * @param {number} bonusAmount - Bonus multiplier
     * @param {Object} options - Award options
     */
    _applyJadeBonusReward(bonusAmount, options) {
        const duration = options.bonusDuration || 3600000; // 1 hour default

        this.addRewardBonus(`jade_bonus_${Date.now()}`, {
            name: 'Jade Bonus',
            description: `+${Math.round(bonusAmount * 100)}% jade income`,
            multipliers: {
                jade: 1 + bonusAmount
            },
            duration: duration,
            source: 'reward'
        });
    }

    /**
     * Apply sect reputation reward
     * @param {number} amount - Reputation amount
     * @param {Object} options - Award options
     */
    _applySectReputationReward(amount, options) {
        if (this.gameState.get('sect.id')) {
            this.gameState.increment('sect.contribution', amount);

            // Emit sect contribution event
            this.eventManager.emit('sect:contribution', {
                amount: amount,
                source: 'reward'
            });
        }
    }

    /**
     * Get source-specific reward modifier
     * @param {string} source - Reward source
     * @param {string} rewardType - Type of reward
     * @returns {number} Modifier value
     */
    _getSourceModifier(source, rewardType) {
        const sourceModifiers = {
            quest: {
                jade: 1.0,
                spiritCrystals: 1.0,
                shards: 1.0
            },
            achievement: {
                jade: 1.2,
                spiritCrystals: 1.2,
                shards: 1.5
            },
            daily: {
                jade: 0.8,
                spiritCrystals: 0.8,
                shards: 0.8
            },
            weekly: {
                jade: 1.5,
                spiritCrystals: 1.5,
                shards: 1.3
            }
        };

        return sourceModifiers[source]?.[rewardType] || 1.0;
    }

    /**
     * Get rarity-specific reward modifier
     * @param {string} rarity - Reward rarity
     * @returns {number} Modifier value
     */
    _getRarityModifier(rarity) {
        const rarityModifiers = {
            'Common': 1.0,
            'Uncommon': 1.1,
            'Rare': 1.25,
            'Epic': 1.5,
            'Legendary': 2.0,
            'Mythic': 3.0
        };

        return rarityModifiers[rarity] || 1.0;
    }

    /**
     * Set up special effect handlers
     */
    _setupSpecialEffects() {
        const effects = new Map();

        // Cultivation efficiency bonus
        effects.set('cultivation_efficiency_bonus', {
            apply: (data) => {
                this.addRewardBonus('special_cultivation_efficiency', {
                    name: 'Perfect Harmony Bonus',
                    description: 'Cultivation efficiency increased from perfect breakthrough',
                    multipliers: {
                        experience: 1.5
                    },
                    duration: 24 * 60 * 60 * 1000, // 24 hours
                    source: 'special_achievement'
                });
            }
        });

        // Experience multiplier
        effects.set('experience_multiplier', {
            apply: (data) => {
                this.addRewardBonus('special_experience_multiplier', {
                    name: 'Lightning Ascension Bonus',
                    description: 'Experience gain increased from speed achievement',
                    multipliers: {
                        experience: 2.0
                    },
                    duration: 12 * 60 * 60 * 1000, // 12 hours
                    source: 'special_achievement'
                });
            }
        });

        this.specialEffects = effects;
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Update global modifiers when player progresses
        this.eventManager.on('cultivation:breakthrough', () => {
            this._updateGlobalModifiers();
        });

        this.eventManager.on('realm:advancement', () => {
            this._updateGlobalModifiers();
        });

        // Clean up expired bonuses periodically
        this.eventManager.on('gameLoop:update', () => {
            this._cleanupExpiredBonuses();
        });
    }

    /**
     * Update global modifiers based on player progress
     */
    _updateGlobalModifiers() {
        // Base modifiers
        this.globalModifiers = {
            jadeMod: 1.0,
            spiritCrystalMod: 1.0,
            shardMod: 1.0,
            experienceMod: 1.0,
            luckMod: 1.0
        };

        // Apply level-based bonuses
        const playerLevel = Math.max(
            this.gameState.get('cultivation.qi.level') || 0,
            this.gameState.get('cultivation.body.level') || 0
        );

        const levelBonus = 1 + (playerLevel * 0.01); // 1% per level
        this.globalModifiers.jadeMod *= levelBonus;
        this.globalModifiers.spiritCrystalMod *= levelBonus;

        // Apply realm-based bonuses
        const currentRealm = this.gameState.get('realm.current');
        if (currentRealm && window.CULTIVATION_REALMS) {
            const realmData = window.CULTIVATION_REALMS[currentRealm];
            if (realmData && realmData.rewardBonus) {
                const realmBonus = 1 + realmData.rewardBonus;
                for (const mod in this.globalModifiers) {
                    this.globalModifiers[mod] *= realmBonus;
                }
            }
        }

        // Apply active bonus effects
        for (const bonus of this.rewardState.activeBonuses.values()) {
            for (const [rewardType, multiplier] of Object.entries(bonus.multipliers)) {
                const modKey = `${rewardType}Mod`;
                if (this.globalModifiers[modKey]) {
                    this.globalModifiers[modKey] *= multiplier;
                }
            }
        }
    }

    /**
     * Stack bonus effects
     * @param {string} bonusId - Bonus ID
     * @param {Object} newBonus - New bonus to stack
     */
    _stackBonus(bonusId, newBonus) {
        const existingBonus = this.rewardState.activeBonuses.get(bonusId);

        // Combine multipliers (multiplicative stacking)
        for (const [rewardType, multiplier] of Object.entries(newBonus.multipliers)) {
            if (existingBonus.multipliers[rewardType]) {
                existingBonus.multipliers[rewardType] *= multiplier;
            } else {
                existingBonus.multipliers[rewardType] = multiplier;
            }
        }

        // Add flat bonuses (additive stacking)
        for (const [rewardType, amount] of Object.entries(newBonus.flatBonuses)) {
            existingBonus.flatBonuses[rewardType] = (existingBonus.flatBonuses[rewardType] || 0) + amount;
        }

        // Extend duration to the longer of the two
        if (newBonus.duration > existingBonus.duration) {
            existingBonus.duration = newBonus.duration;
            existingBonus.startTime = Date.now();
        }
    }

    /**
     * Get remaining time for a bonus
     * @param {Object} bonus - Bonus object
     * @returns {number} Time remaining in milliseconds
     */
    _getBonusTimeRemaining(bonus) {
        const elapsed = Date.now() - bonus.startTime;
        return Math.max(0, bonus.duration - elapsed);
    }

    /**
     * Clean up expired bonuses
     */
    _cleanupExpiredBonuses() {
        const expiredBonuses = [];

        for (const [bonusId, bonus] of this.rewardState.activeBonuses) {
            if (this._getBonusTimeRemaining(bonus) <= 0) {
                expiredBonuses.push(bonusId);
            }
        }

        for (const bonusId of expiredBonuses) {
            this.removeRewardBonus(bonusId);
        }

        // Clean up expired temporary effects
        const expiredEffects = [];
        for (const [effectId, effect] of this.rewardState.temporaryEffects) {
            if (Date.now() >= effect.endTime) {
                expiredEffects.push(effectId);
            }
        }

        for (const effectId of expiredEffects) {
            this.rewardState.temporaryEffects.delete(effectId);
        }
    }

    /**
     * Start reward processing loop
     */
    _startRewardProcessing() {
        setInterval(() => {
            if (this.rewardQueue.length > 0 && !this.isProcessing) {
                this._processBatchRewards();
            }
        }, this.distributionSettings.delayBetweenRewards);
    }

    /**
     * Process rewards in batches
     */
    _processBatchRewards() {
        if (this.isProcessing || this.rewardQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            const batchSize = Math.min(this.distributionSettings.maxBatchSize, this.rewardQueue.length);
            const batch = this.rewardQueue.splice(0, batchSize);

            for (const awardData of batch) {
                this._processRewardAward(awardData);
            }

            // Emit batch processed event
            this.eventManager.emit('rewardManager:batchProcessed', {
                batchSize: batch.length,
                remainingQueue: this.rewardQueue.length
            });

        } catch (error) {
            console.error('RewardManager: Batch processing failed:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Update reward statistics
     * @param {Object} rewards - Awarded rewards
     * @param {Object} options - Award options
     */
    _updateStatistics(rewards, options) {
        this.rewardState.totalRewardsAwarded++;

        // Calculate total value for this reward
        let totalValue = 0;
        for (const [rewardType, amount] of Object.entries(rewards)) {
            if (typeof amount === 'number') {
                // Simple value calculation (could be more sophisticated)
                const typeWeight = {
                    jade: 1,
                    spiritCrystals: 3,
                    shards: 10,
                    experience: 0.1
                };
                totalValue += amount * (typeWeight[rewardType] || 1);
            }
        }

        // Update biggest reward
        if (totalValue > this.statistics.biggestReward) {
            this.statistics.biggestReward = totalValue;
        }

        // Update source-specific statistics
        if (options.source === 'quest') {
            this.statistics.questRewards++;
        } else if (options.source === 'achievement') {
            this.statistics.achievementRewards++;
        }

        // Update average reward value
        const totalRewards = this.statistics.questRewards + this.statistics.achievementRewards + this.statistics.bonusRewards;
        if (totalRewards > 0) {
            const totalAwarded = this.statistics.totalJadeAwarded + (this.statistics.totalCrystalsAwarded * 3) + (this.statistics.totalShardsAwarded * 10);
            this.statistics.averageRewardValue = totalAwarded / totalRewards;
        }
    }

    /**
     * Add reward to history
     * @param {Object} awardData - Award data
     */
    _addToHistory(awardData) {
        const historyEntry = {
            id: awardData.id,
            rewards: awardData.calculatedRewards,
            source: awardData.options.source || 'unknown',
            timestamp: awardData.timestamp
        };

        this.rewardState.rewardHistory.push(historyEntry);

        // Keep only recent history (last 50 entries)
        if (this.rewardState.rewardHistory.length > 50) {
            this.rewardState.rewardHistory.shift();
        }
    }

    /**
     * Generate unique reward ID
     * @returns {string} Unique reward ID
     */
    _generateRewardId() {
        return `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save reward state to game state
     */
    _saveRewardState() {
        // Convert Maps to arrays for serialization
        const stateToSave = {
            ...this.rewardState,
            activeBonuses: Array.from(this.rewardState.activeBonuses),
            rewardMultipliers: Array.from(this.rewardState.rewardMultipliers),
            temporaryEffects: Array.from(this.rewardState.temporaryEffects)
        };

        this.gameState.update({
            rewardState: stateToSave,
            rewardStats: this.statistics
        }, { source: 'rewardManager' });
    }
}

// Create singleton instance
const rewardManager = new RewardManager(
    window.gameState,
    window.eventManager,
    window.saveManager
);

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RewardManager, rewardManager };
} else if (typeof window !== 'undefined') {
    window.RewardManager = RewardManager;
    window.rewardManager = rewardManager;
}