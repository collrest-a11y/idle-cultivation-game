/**
 * EnhancementSystem - Handles scripture enhancement, awakening, and breakthrough mechanics
 * Provides progression systems for scriptures including leveling, awakening, and special upgrades
 */
class EnhancementSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Enhancement state
        this.enhancementState = {
            activeEnhancements: new Map(), // scriptureId -> enhancement progress
            failureProtection: new Map(),   // scriptureId -> failure protection level
            enhancementQueue: [],           // Queue for batch enhancements
            isProcessing: false
        };

        // Enhancement materials inventory
        this.materials = {
            enhancementStones: 0,
            awakeningStones: 0,
            essenceOfCultivation: 0,
            stardustFragment: 0,
            voidCrystal: 0,
            dragonScale: 0,
            phoenixFeather: 0
        };

        // Enhancement statistics
        this.statistics = {
            totalEnhancements: 0,
            successfulEnhancements: 0,
            failedEnhancements: 0,
            awakeningsPerformed: 0,
            breakthroughsAchieved: 0,
            materialsUsed: { ...this.materials },
            averageSuccessRate: 0,
            totalSpent: { jade: 0, crystals: 0 }
        };

        // Enhancement rates and formulas
        this.enhancementRates = {
            baseSuccessRate: 0.8,
            rateDecayPerLevel: 0.01,
            rarityModifiers: {
                'Common': 1.0,
                'Uncommon': 0.95,
                'Rare': 0.9,
                'Epic': 0.85,
                'Legendary': 0.8,
                'Mythical': 0.75
            },
            materialBonuses: {
                enhancementStones: 0.1,
                qualityMaterials: 0.15,
                rareMaterials: 0.25
            }
        };

        this.isInitialized = false;

        console.log('EnhancementSystem: Initialized');
    }

    /**
     * Initialize the enhancement system
     */
    async initialize() {
        try {
            // Load enhancement state from game state
            const savedState = this.gameState.get('enhancement');
            if (savedState) {
                // Convert arrays back to Maps where needed
                if (savedState.activeEnhancements) {
                    this.enhancementState.activeEnhancements = new Map(Object.entries(savedState.activeEnhancements));
                }
                if (savedState.failureProtection) {
                    this.enhancementState.failureProtection = new Map(Object.entries(savedState.failureProtection));
                }
                if (savedState.enhancementQueue) {
                    this.enhancementState.enhancementQueue = savedState.enhancementQueue;
                }
            }

            // Load materials
            const savedMaterials = this.gameState.get('enhancementMaterials');
            if (savedMaterials) {
                this.materials = { ...this.materials, ...savedMaterials };
            }

            // Load statistics
            const savedStats = this.gameState.get('enhancementStats');
            if (savedStats) {
                this.statistics = { ...this.statistics, ...savedStats };
            }

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;

            this.eventManager.emit('enhancement:initialized', {
                materials: this.materials,
                statistics: this.statistics
            });

            console.log('EnhancementSystem: Initialization complete');

        } catch (error) {
            console.error('EnhancementSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Enhance a scripture by one level
     * @param {string} scriptureId - Scripture ID to enhance
     * @param {Object} options - Enhancement options
     * @returns {Object} Enhancement result
     */
    async enhanceScripture(scriptureId, options = {}) {
        if (!this.isInitialized) {
            throw new Error('EnhancementSystem not initialized');
        }

        const scripture = this._getScripture(scriptureId);
        if (!scripture) {
            return { success: false, reason: 'scripture_not_found' };
        }

        const config = {
            useProtection: options.useProtection !== false,
            useMaterials: options.useMaterials !== false,
            forceAttempt: options.forceAttempt || false,
            targetLevel: options.targetLevel || (scripture.level || 1) + 1,
            ...options
        };

        // Check if scripture can be enhanced
        const canEnhance = this._canEnhanceScripture(scripture, config.targetLevel);
        if (!canEnhance.canEnhance) {
            return { success: false, reason: canEnhance.reason };
        }

        // Calculate enhancement cost
        const cost = this._calculateEnhancementCost(scripture, config.targetLevel);

        // Check if player can afford the enhancement
        const canAfford = this._checkAffordability(cost);
        if (!canAfford.canAfford) {
            return {
                success: false,
                reason: 'insufficient_resources',
                needed: canAfford.needed,
                cost: cost
            };
        }

        try {
            // Deduct costs
            this._deductCosts(cost);

            // Calculate success rate
            const successRate = this._calculateSuccessRate(scripture, config);

            // Perform enhancement attempt
            const isSuccess = config.forceAttempt || Math.random() < successRate;

            if (isSuccess) {
                return await this._processSuccessfulEnhancement(scripture, config, cost, successRate);
            } else {
                return await this._processFailedEnhancement(scripture, config, cost, successRate);
            }

        } catch (error) {
            console.error('EnhancementSystem: Enhancement failed:', error);
            return {
                success: false,
                reason: 'enhancement_error',
                error: error.message
            };
        }
    }

    /**
     * Awaken a scripture to unlock additional potential
     * @param {string} scriptureId - Scripture ID to awaken
     * @param {Object} options - Awakening options
     * @returns {Object} Awakening result
     */
    async awakenScripture(scriptureId, options = {}) {
        if (!this.isInitialized) {
            throw new Error('EnhancementSystem not initialized');
        }

        const scripture = this._getScripture(scriptureId);
        if (!scripture) {
            return { success: false, reason: 'scripture_not_found' };
        }

        // Check if scripture can be awakened
        const canAwaken = this._canAwakenScripture(scripture);
        if (!canAwaken.canAwaken) {
            return { success: false, reason: canAwaken.reason };
        }

        // Calculate awakening requirements
        const requirements = ENHANCEMENT_FORMULAS.awakeningRequirements(scripture);

        // Check if player meets all requirements
        const meetsRequirements = this._checkAwakeningRequirements(requirements);
        if (!meetsRequirements.meets) {
            return {
                success: false,
                reason: 'requirements_not_met',
                requirements: requirements,
                missing: meetsRequirements.missing
            };
        }

        try {
            // Deduct awakening costs
            this._deductAwakeningCosts(requirements);

            // Perform awakening
            const result = this._performAwakening(scripture, requirements);

            // Update statistics
            this.statistics.awakeningsPerformed++;

            // Save state
            this.saveState();

            // Emit events
            this.eventManager.emit('scripture:awakened', {
                scriptureId: scriptureId,
                scripture: result.scripture,
                newEffects: result.newEffects
            });

            return {
                success: true,
                scripture: result.scripture,
                newEffects: result.newEffects,
                cost: requirements.cost
            };

        } catch (error) {
            console.error('EnhancementSystem: Awakening failed:', error);
            return {
                success: false,
                reason: 'awakening_error',
                error: error.message
            };
        }
    }

    /**
     * Perform scripture breakthrough to transcend rarity limits
     * @param {string} scriptureId - Scripture ID for breakthrough
     * @param {Object} options - Breakthrough options
     * @returns {Object} Breakthrough result
     */
    async breakthroughScripture(scriptureId, options = {}) {
        if (!this.isInitialized) {
            throw new Error('EnhancementSystem not initialized');
        }

        const scripture = this._getScripture(scriptureId);
        if (!scripture) {
            return { success: false, reason: 'scripture_not_found' };
        }

        // Check if scripture can perform breakthrough
        const canBreakthrough = this._canPerformBreakthrough(scripture);
        if (!canBreakthrough.canBreakthrough) {
            return { success: false, reason: canBreakthrough.reason };
        }

        const config = {
            useSupport: options.useSupport !== false,
            targetRarity: options.targetRarity || this._getNextRarity(scripture.rarity),
            ...options
        };

        // Calculate breakthrough requirements
        const requirements = this._calculateBreakthroughRequirements(scripture, config);

        // Check if player meets requirements
        const meetsRequirements = this._checkBreakthroughRequirements(requirements);
        if (!meetsRequirements.meets) {
            return {
                success: false,
                reason: 'requirements_not_met',
                requirements: requirements,
                missing: meetsRequirements.missing
            };
        }

        try {
            // Deduct breakthrough costs
            this._deductBreakthroughCosts(requirements);

            // Calculate success rate
            const successRate = this._calculateBreakthroughSuccessRate(scripture, config);

            // Perform breakthrough attempt
            const isSuccess = Math.random() < successRate;

            if (isSuccess) {
                const result = this._performSuccessfulBreakthrough(scripture, config);

                // Update statistics
                this.statistics.breakthroughsAchieved++;

                // Save state
                this.saveState();

                // Emit events
                this.eventManager.emit('scripture:breakthrough', {
                    scriptureId: scriptureId,
                    oldRarity: scripture.rarity,
                    newRarity: result.scripture.rarity,
                    scripture: result.scripture
                });

                return {
                    success: true,
                    scripture: result.scripture,
                    oldRarity: scripture.rarity,
                    newRarity: result.scripture.rarity,
                    successRate: successRate
                };

            } else {
                // Breakthrough failed - apply penalties
                const penalty = this._applyBreakthroughFailurePenalty(scripture);

                // Update statistics
                this.statistics.failedEnhancements++;

                // Save state
                this.saveState();

                // Emit events
                this.eventManager.emit('scripture:breakthrough_failed', {
                    scriptureId: scriptureId,
                    scripture: scripture,
                    penalty: penalty,
                    successRate: successRate
                });

                return {
                    success: false,
                    reason: 'breakthrough_failed',
                    successRate: successRate,
                    penalty: penalty
                };
            }

        } catch (error) {
            console.error('EnhancementSystem: Breakthrough failed:', error);
            return {
                success: false,
                reason: 'breakthrough_error',
                error: error.message
            };
        }
    }

    /**
     * Add enhancement materials to inventory
     * @param {Object} materials - Materials to add
     */
    addMaterials(materials) {
        for (const [material, amount] of Object.entries(materials)) {
            if (this.materials.hasOwnProperty(material)) {
                this.materials[material] += amount;
            }
        }

        this.saveState();

        this.eventManager.emit('enhancement:materials_added', {
            materials: materials,
            totalMaterials: this.materials
        });
    }

    /**
     * Get enhancement preview for a scripture
     * @param {string} scriptureId - Scripture ID
     * @param {number} targetLevel - Target enhancement level
     * @returns {Object} Enhancement preview
     */
    getEnhancementPreview(scriptureId, targetLevel = null) {
        const scripture = this._getScripture(scriptureId);
        if (!scripture) {
            return null;
        }

        const currentLevel = scripture.level || 1;
        const target = targetLevel || currentLevel + 1;

        // Calculate stats at current and target levels
        const currentStats = ENHANCEMENT_FORMULAS.calculateStatBonus(scripture, currentLevel);
        const targetStats = ENHANCEMENT_FORMULAS.calculateStatBonus(scripture, target);

        // Calculate power difference
        const currentPower = ENHANCEMENT_FORMULAS.scripturepower(scripture, currentLevel);
        const targetPower = ENHANCEMENT_FORMULAS.scripturepower(scripture, target);

        // Calculate cost
        const cost = this._calculateEnhancementCost(scripture, target);

        // Calculate success rate
        const successRate = this._calculateSuccessRate(scripture, { targetLevel: target });

        return {
            scriptureId: scriptureId,
            currentLevel: currentLevel,
            targetLevel: target,
            currentStats: currentStats,
            targetStats: targetStats,
            statIncrease: {
                qi: targetStats.qi - currentStats.qi,
                body: targetStats.body - currentStats.body,
                cultivation: targetStats.cultivation - currentStats.cultivation
            },
            currentPower: currentPower,
            targetPower: targetPower,
            powerIncrease: targetPower - currentPower,
            cost: cost,
            successRate: successRate,
            canAfford: this._checkAffordability(cost).canAfford
        };
    }

    /**
     * Get awakening preview for a scripture
     * @param {string} scriptureId - Scripture ID
     * @returns {Object} Awakening preview
     */
    getAwakeningPreview(scriptureId) {
        const scripture = this._getScripture(scriptureId);
        if (!scripture) {
            return null;
        }

        if (scripture.awakening) {
            return { alreadyAwakened: true };
        }

        const requirements = ENHANCEMENT_FORMULAS.awakeningRequirements(scripture);
        const meetsRequirements = this._checkAwakeningRequirements(requirements);

        // Calculate awakening benefits
        const currentStats = ENHANCEMENT_FORMULAS.calculateStatBonus(scripture);
        const awakenedStats = {
            qi: currentStats.qi * 1.5,
            body: currentStats.body * 1.5,
            cultivation: currentStats.cultivation * 1.3
        };

        const currentPower = ENHANCEMENT_FORMULAS.scripturepower(scripture);
        const awakenedPower = currentPower * 1.5;

        return {
            scriptureId: scriptureId,
            requirements: requirements,
            meetsRequirements: meetsRequirements.meets,
            missing: meetsRequirements.missing,
            currentStats: currentStats,
            awakenedStats: awakenedStats,
            currentPower: currentPower,
            awakenedPower: awakenedPower,
            statIncrease: {
                qi: awakenedStats.qi - currentStats.qi,
                body: awakenedStats.body - currentStats.body,
                cultivation: awakenedStats.cultivation - currentStats.cultivation
            },
            powerIncrease: awakenedPower - currentPower
        };
    }

    /**
     * Get enhancement materials inventory
     * @returns {Object} Materials inventory
     */
    getMaterials() {
        return { ...this.materials };
    }

    /**
     * Get enhancement statistics
     * @returns {Object} Enhancement statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            successRate: this.statistics.totalEnhancements > 0 ?
                (this.statistics.successfulEnhancements / this.statistics.totalEnhancements) : 0
        };
    }

    /**
     * Save enhancement state to game state
     */
    saveState() {
        // Convert Maps to Objects for serialization
        const activeEnhancements = Object.fromEntries(this.enhancementState.activeEnhancements);
        const failureProtection = Object.fromEntries(this.enhancementState.failureProtection);

        this.gameState.update({
            enhancement: {
                activeEnhancements: activeEnhancements,
                failureProtection: failureProtection,
                enhancementQueue: this.enhancementState.enhancementQueue,
                isProcessing: this.enhancementState.isProcessing
            },
            enhancementMaterials: this.materials,
            enhancementStats: this.statistics
        }, { source: 'enhancement:save' });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save state on enhancement events
        this.eventManager.on('scripture:enhanced', () => {
            this.saveState();
        });

        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });

        // Handle material rewards from other systems
        this.eventManager.on('scripture:duplicate_converted', (data) => {
            if (data.reward.enhancementStones) {
                this.addMaterials({ enhancementStones: data.reward.enhancementStones });
            }
        });

        // Handle combat rewards
        this.eventManager.on('combat:victory', (data) => {
            // Award materials based on combat difficulty
            const materials = this._calculateCombatMaterialReward(data);
            if (Object.keys(materials).length > 0) {
                this.addMaterials(materials);
            }
        });
    }

    /**
     * Get scripture from scripture manager
     * @param {string} scriptureId - Scripture ID
     * @returns {Object|null} Scripture instance
     */
    _getScripture(scriptureId) {
        const scriptures = this.gameState.get('scriptures.collection') || [];
        return scriptures.find(s => s.id === scriptureId) || null;
    }

    /**
     * Check if scripture can be enhanced
     * @param {Object} scripture - Scripture to check
     * @param {number} targetLevel - Target level
     * @returns {Object} Enhancement capability check
     */
    _canEnhanceScripture(scripture, targetLevel) {
        const currentLevel = scripture.level || 1;
        const rarity = SCRIPTURE_RARITIES[scripture.rarity];

        if (!rarity) {
            return { canEnhance: false, reason: 'invalid_rarity' };
        }

        if (targetLevel <= currentLevel) {
            return { canEnhance: false, reason: 'target_level_too_low' };
        }

        if (targetLevel > rarity.maxLevel) {
            return { canEnhance: false, reason: 'max_level_reached' };
        }

        return { canEnhance: true };
    }

    /**
     * Calculate enhancement cost
     * @param {Object} scripture - Scripture to enhance
     * @param {number} targetLevel - Target level
     * @returns {Object} Enhancement cost
     */
    _calculateEnhancementCost(scripture, targetLevel) {
        return ENHANCEMENT_FORMULAS.enhancementCost(scripture, targetLevel);
    }

    /**
     * Check if player can afford costs
     * @param {Object} cost - Cost to check
     * @returns {Object} Affordability check
     */
    _checkAffordability(cost) {
        const playerJade = this.gameState.get('player.jade') || 0;
        const playerCrystals = this.gameState.get('player.spiritCrystals') || 0;

        const neededJade = Math.max(0, (cost.jade || 0) - playerJade);
        const neededCrystals = Math.max(0, (cost.crystals || 0) - playerCrystals);

        const canAfford = neededJade === 0 && neededCrystals === 0;

        return {
            canAfford: canAfford,
            needed: canAfford ? null : {
                jade: neededJade,
                crystals: neededCrystals
            }
        };
    }

    /**
     * Deduct costs from player resources
     * @param {Object} cost - Cost to deduct
     */
    _deductCosts(cost) {
        if (cost.jade > 0) {
            this.gameState.increment('player.jade', -cost.jade);
        }
        if (cost.crystals > 0) {
            this.gameState.increment('player.spiritCrystals', -cost.crystals);
        }
    }

    /**
     * Calculate enhancement success rate
     * @param {Object} scripture - Scripture to enhance
     * @param {Object} config - Enhancement configuration
     * @returns {number} Success rate (0-1)
     */
    _calculateSuccessRate(scripture, config) {
        const currentLevel = scripture.level || 1;
        const rarity = scripture.rarity;

        // Base success rate
        let successRate = this.enhancementRates.baseSuccessRate;

        // Apply rarity modifier
        if (this.enhancementRates.rarityModifiers[rarity]) {
            successRate *= this.enhancementRates.rarityModifiers[rarity];
        }

        // Apply level penalty (gets harder at higher levels)
        const levelPenalty = currentLevel * this.enhancementRates.rateDecayPerLevel;
        successRate = Math.max(0.1, successRate - levelPenalty);

        // Apply material bonuses
        if (config.useMaterials && this.materials.enhancementStones > 0) {
            successRate += this.enhancementRates.materialBonuses.enhancementStones;
        }

        // Apply failure protection
        const protectionLevel = this.enhancementState.failureProtection.get(scripture.id) || 0;
        if (protectionLevel > 0) {
            successRate += protectionLevel * 0.05; // 5% per protection level
        }

        return Math.min(0.95, Math.max(0.05, successRate)); // Clamp between 5% and 95%
    }

    /**
     * Process successful enhancement
     * @param {Object} scripture - Scripture being enhanced
     * @param {Object} config - Enhancement configuration
     * @param {Object} cost - Enhancement cost
     * @param {number} successRate - Success rate used
     * @returns {Object} Enhancement result
     */
    async _processSuccessfulEnhancement(scripture, config, cost, successRate) {
        const oldLevel = scripture.level || 1;
        const newLevel = config.targetLevel;

        // Update scripture level
        scripture.level = newLevel;

        // Reset failure protection
        this.enhancementState.failureProtection.delete(scripture.id);

        // Consume enhancement materials if used
        if (config.useMaterials && this.materials.enhancementStones > 0) {
            this.materials.enhancementStones--;
        }

        // Update statistics
        this.statistics.totalEnhancements++;
        this.statistics.successfulEnhancements++;
        this.statistics.totalSpent.jade += cost.jade || 0;
        this.statistics.totalSpent.crystals += cost.crystals || 0;

        // Recalculate average success rate
        this._updateAverageSuccessRate();

        // Update scripture in game state
        this._updateScriptureInGameState(scripture);

        // Save state
        this.saveState();

        // Emit events
        this.eventManager.emit('scripture:enhanced', {
            scriptureId: scripture.id,
            oldLevel: oldLevel,
            newLevel: newLevel,
            scripture: scripture,
            cost: cost,
            successRate: successRate
        });

        return {
            success: true,
            oldLevel: oldLevel,
            newLevel: newLevel,
            scripture: scripture,
            successRate: successRate,
            cost: cost
        };
    }

    /**
     * Process failed enhancement
     * @param {Object} scripture - Scripture being enhanced
     * @param {Object} config - Enhancement configuration
     * @param {Object} cost - Enhancement cost
     * @param {number} successRate - Success rate used
     * @returns {Object} Enhancement result
     */
    async _processFailedEnhancement(scripture, config, cost, successRate) {
        // Apply failure protection or penalties
        if (config.useProtection) {
            // Increase failure protection for next attempt
            const currentProtection = this.enhancementState.failureProtection.get(scripture.id) || 0;
            this.enhancementState.failureProtection.set(scripture.id, currentProtection + 1);
        } else {
            // Apply failure penalty (small chance to lose levels)
            const failurePenalty = Math.random() < 0.1; // 10% chance
            if (failurePenalty && (scripture.level || 1) > 1) {
                scripture.level = Math.max(1, (scripture.level || 1) - 1);
            }
        }

        // Update statistics
        this.statistics.totalEnhancements++;
        this.statistics.failedEnhancements++;
        this.statistics.totalSpent.jade += cost.jade || 0;
        this.statistics.totalSpent.crystals += cost.crystals || 0;

        // Recalculate average success rate
        this._updateAverageSuccessRate();

        // Update scripture in game state
        this._updateScriptureInGameState(scripture);

        // Save state
        this.saveState();

        // Emit events
        this.eventManager.emit('scripture:enhancement_failed', {
            scriptureId: scripture.id,
            scripture: scripture,
            cost: cost,
            successRate: successRate,
            protectionIncreased: config.useProtection
        });

        const protectionLevel = this.enhancementState.failureProtection.get(scripture.id) || 0;

        return {
            success: false,
            reason: 'enhancement_failed',
            scripture: scripture,
            successRate: successRate,
            cost: cost,
            protectionLevel: protectionLevel
        };
    }

    /**
     * Check if scripture can be awakened
     * @param {Object} scripture - Scripture to check
     * @returns {Object} Awakening capability check
     */
    _canAwakenScripture(scripture) {
        if (scripture.awakening) {
            return { canAwaken: false, reason: 'already_awakened' };
        }

        const requirements = ENHANCEMENT_FORMULAS.awakeningRequirements(scripture);
        const currentLevel = scripture.level || 1;

        if (currentLevel < requirements.level) {
            return { canAwaken: false, reason: 'level_too_low' };
        }

        return { canAwaken: true };
    }

    /**
     * Check awakening requirements
     * @param {Object} requirements - Awakening requirements
     * @returns {Object} Requirements check
     */
    _checkAwakeningRequirements(requirements) {
        const missing = {};

        // Check resources
        const playerJade = this.gameState.get('player.jade') || 0;
        const playerCrystals = this.gameState.get('player.spiritCrystals') || 0;

        if (requirements.cost.jade > playerJade) {
            missing.jade = requirements.cost.jade - playerJade;
        }
        if (requirements.cost.crystals > playerCrystals) {
            missing.crystals = requirements.cost.crystals - playerCrystals;
        }

        // Check materials
        for (const [material, amount] of Object.entries(requirements.materials)) {
            if ((this.materials[material] || 0) < amount) {
                missing[material] = amount - (this.materials[material] || 0);
            }
        }

        return {
            meets: Object.keys(missing).length === 0,
            missing: missing
        };
    }

    /**
     * Deduct awakening costs
     * @param {Object} requirements - Awakening requirements
     */
    _deductAwakeningCosts(requirements) {
        // Deduct resources
        if (requirements.cost.jade > 0) {
            this.gameState.increment('player.jade', -requirements.cost.jade);
        }
        if (requirements.cost.crystals > 0) {
            this.gameState.increment('player.spiritCrystals', -requirements.cost.crystals);
        }

        // Deduct materials
        for (const [material, amount] of Object.entries(requirements.materials)) {
            if (this.materials[material]) {
                this.materials[material] = Math.max(0, this.materials[material] - amount);
            }
        }
    }

    /**
     * Perform awakening
     * @param {Object} scripture - Scripture to awaken
     * @param {Object} requirements - Awakening requirements
     * @returns {Object} Awakening result
     */
    _performAwakening(scripture, requirements) {
        // Set awakening flag
        scripture.awakening = true;

        // Add awakening effects
        const scriptureData = SCRIPTURE_DATABASE[scripture.name];
        if (scriptureData) {
            // Enhance existing special effects or add new ones
            if (!scripture.awakeningEffects) {
                scripture.awakeningEffects = {};
            }

            // Add generic awakening bonuses
            scripture.awakeningEffects.powerBonus = 0.5; // 50% power increase
            scripture.awakeningEffects.statBonus = 0.3;  // 30% stat bonus increase

            // Add rarity-specific awakening effects
            switch (scripture.rarity) {
                case 'Epic':
                case 'Legendary':
                case 'Mythical':
                    scripture.awakeningEffects.specialUnlock = 'Advanced cultivation techniques available';
                    break;
            }
        }

        // Update scripture in game state
        this._updateScriptureInGameState(scripture);

        return {
            scripture: scripture,
            newEffects: scripture.awakeningEffects
        };
    }

    /**
     * Check if scripture can perform breakthrough
     * @param {Object} scripture - Scripture to check
     * @returns {Object} Breakthrough capability check
     */
    _canPerformBreakthrough(scripture) {
        if (!scripture.awakening) {
            return { canBreakthrough: false, reason: 'not_awakened' };
        }

        const rarity = SCRIPTURE_RARITIES[scripture.rarity];
        const currentLevel = scripture.level || 1;

        if (currentLevel < rarity.maxLevel) {
            return { canBreakthrough: false, reason: 'not_max_level' };
        }

        if (scripture.rarity === 'Mythical') {
            return { canBreakthrough: false, reason: 'already_highest_rarity' };
        }

        return { canBreakthrough: true };
    }

    /**
     * Get next rarity tier
     * @param {string} currentRarity - Current rarity
     * @returns {string} Next rarity
     */
    _getNextRarity(currentRarity) {
        const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
        const currentIndex = rarityOrder.indexOf(currentRarity);
        return currentIndex < rarityOrder.length - 1 ? rarityOrder[currentIndex + 1] : currentRarity;
    }

    /**
     * Calculate breakthrough requirements
     * @param {Object} scripture - Scripture for breakthrough
     * @param {Object} config - Breakthrough configuration
     * @returns {Object} Breakthrough requirements
     */
    _calculateBreakthroughRequirements(scripture, config) {
        const currentRarity = SCRIPTURE_RARITIES[scripture.rarity];
        const targetRarity = SCRIPTURE_RARITIES[config.targetRarity];

        const baseCost = currentRarity.awakeningCost;

        return {
            resources: {
                jade: baseCost.jade * 5,
                crystals: baseCost.crystals * 3
            },
            materials: {
                awakeningStones: 3,
                essenceOfCultivation: 50,
                stardustFragment: 1
            },
            successRate: 0.3 // Base 30% success rate
        };
    }

    /**
     * Check breakthrough requirements
     * @param {Object} requirements - Breakthrough requirements
     * @returns {Object} Requirements check
     */
    _checkBreakthroughRequirements(requirements) {
        const missing = {};

        // Check resources
        const playerJade = this.gameState.get('player.jade') || 0;
        const playerCrystals = this.gameState.get('player.spiritCrystals') || 0;

        if (requirements.resources.jade > playerJade) {
            missing.jade = requirements.resources.jade - playerJade;
        }
        if (requirements.resources.crystals > playerCrystals) {
            missing.crystals = requirements.resources.crystals - playerCrystals;
        }

        // Check materials
        for (const [material, amount] of Object.entries(requirements.materials)) {
            if ((this.materials[material] || 0) < amount) {
                missing[material] = amount - (this.materials[material] || 0);
            }
        }

        return {
            meets: Object.keys(missing).length === 0,
            missing: missing
        };
    }

    /**
     * Deduct breakthrough costs
     * @param {Object} requirements - Breakthrough requirements
     */
    _deductBreakthroughCosts(requirements) {
        // Deduct resources
        this.gameState.increment('player.jade', -requirements.resources.jade);
        this.gameState.increment('player.spiritCrystals', -requirements.resources.crystals);

        // Deduct materials
        for (const [material, amount] of Object.entries(requirements.materials)) {
            if (this.materials[material]) {
                this.materials[material] = Math.max(0, this.materials[material] - amount);
            }
        }
    }

    /**
     * Calculate breakthrough success rate
     * @param {Object} scripture - Scripture for breakthrough
     * @param {Object} config - Breakthrough configuration
     * @returns {number} Success rate
     */
    _calculateBreakthroughSuccessRate(scripture, config) {
        let successRate = 0.3; // Base 30%

        // Support materials bonus
        if (config.useSupport) {
            if (this.materials.voidCrystal > 0) {
                successRate += 0.15; // +15% with void crystal
            }
            if (this.materials.dragonScale > 0) {
                successRate += 0.1; // +10% with dragon scale
            }
        }

        // Level bonus (higher level = slight bonus)
        const level = scripture.level || 1;
        const levelBonus = Math.min(0.1, level * 0.001); // Up to 10% bonus
        successRate += levelBonus;

        return Math.min(0.8, Math.max(0.1, successRate)); // Clamp between 10% and 80%
    }

    /**
     * Perform successful breakthrough
     * @param {Object} scripture - Scripture for breakthrough
     * @param {Object} config - Breakthrough configuration
     * @returns {Object} Breakthrough result
     */
    _performSuccessfulBreakthrough(scripture, config) {
        const oldRarity = scripture.rarity;
        const newRarity = config.targetRarity;

        // Upgrade rarity
        scripture.rarity = newRarity;

        // Reset level but keep some progress
        const oldLevel = scripture.level || 1;
        scripture.level = Math.max(1, Math.floor(oldLevel * 0.3)); // Keep 30% of levels

        // Add breakthrough bonus
        if (!scripture.breakthroughEffects) {
            scripture.breakthroughEffects = {};
        }
        scripture.breakthroughEffects.rarityBonus = true;
        scripture.breakthroughEffects.transcendentPower = 0.25; // 25% transcendent power bonus

        // Update scripture in game state
        this._updateScriptureInGameState(scripture);

        return {
            scripture: scripture,
            oldRarity: oldRarity,
            newRarity: newRarity
        };
    }

    /**
     * Apply breakthrough failure penalty
     * @param {Object} scripture - Scripture that failed breakthrough
     * @returns {Object} Penalty applied
     */
    _applyBreakthroughFailurePenalty(scripture) {
        // Small chance to lose levels on breakthrough failure
        const levelLoss = Math.random() < 0.2; // 20% chance
        let penalty = {};

        if (levelLoss && (scripture.level || 1) > 1) {
            const oldLevel = scripture.level || 1;
            scripture.level = Math.max(1, oldLevel - Math.floor(oldLevel * 0.1)); // Lose 10% of levels
            penalty.levelLoss = oldLevel - scripture.level;

            // Update scripture in game state
            this._updateScriptureInGameState(scripture);
        }

        return penalty;
    }

    /**
     * Update scripture in game state
     * @param {Object} scripture - Updated scripture
     */
    _updateScriptureInGameState(scripture) {
        const scriptures = this.gameState.get('scriptures.collection') || [];
        const index = scriptures.findIndex(s => s.id === scripture.id);

        if (index !== -1) {
            scriptures[index] = scripture;
            this.gameState.set('scriptures.collection', scriptures);
        }
    }

    /**
     * Update average success rate statistic
     */
    _updateAverageSuccessRate() {
        if (this.statistics.totalEnhancements > 0) {
            this.statistics.averageSuccessRate =
                this.statistics.successfulEnhancements / this.statistics.totalEnhancements;
        }
    }

    /**
     * Calculate material rewards from combat
     * @param {Object} combatData - Combat result data
     * @returns {Object} Material rewards
     */
    _calculateCombatMaterialReward(combatData) {
        const materials = {};

        // Base materials from victory
        if (Math.random() < 0.3) { // 30% chance
            materials.enhancementStones = 1;
        }

        // Rare materials from strong opponents
        if (combatData.difficulty && combatData.difficulty >= 3) {
            if (Math.random() < 0.1) { // 10% chance
                materials.essenceOfCultivation = 5;
            }
        }

        return materials;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancementSystem };
} else if (typeof window !== 'undefined') {
    window.EnhancementSystem = EnhancementSystem;
}