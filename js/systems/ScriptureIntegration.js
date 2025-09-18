/**
 * ScriptureIntegration - Coordinates scripture systems with cultivation and other game systems
 * Handles cross-system interactions, effect applications, and lifecycle management
 */
class ScriptureIntegration {
    constructor(gameState, eventManager, cultivationSystem) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.cultivationSystem = cultivationSystem;

        // System references (will be injected)
        this.gachaSystem = null;
        this.scriptureManager = null;
        this.enhancementSystem = null;

        // Integration state
        this.integrationState = {
            isActive: false,
            effectsApplied: false,
            lastUpdateTime: 0,
            cultivationModifiers: new Map(),
            combatModifiers: new Map(),
            resourceModifiers: new Map()
        };

        // Cross-system effect cache
        this.effectCache = {
            cultivation: {
                qiMultiplier: 1.0,
                bodyMultiplier: 1.0,
                dualMultiplier: 1.0,
                experienceBonus: 0.0,
                breakthroughBonus: 0.0
            },
            combat: {
                powerBonus: 0.0,
                defenseBonus: 0.0,
                speedBonus: 0.0,
                criticalChance: 0.0,
                criticalDamage: 0.0
            },
            resource: {
                jadeMultiplier: 1.0,
                crystalMultiplier: 1.0,
                dropRateBonus: 0.0,
                gachaBonus: 0.0
            },
            special: new Map()
        };

        // Achievement tracking
        this.achievements = {
            scriptureRelated: new Map(),
            milestones: new Map()
        };

        this.isInitialized = false;

        console.log('ScriptureIntegration: Initialized');
    }

    /**
     * Initialize the scripture integration system
     */
    async initialize() {
        try {
            // Load integration state
            const savedState = this.gameState.get('scriptureIntegration');
            if (savedState) {
                this.integrationState = { ...this.integrationState, ...savedState };

                // Restore Maps
                if (savedState.cultivationModifiers) {
                    this.integrationState.cultivationModifiers = new Map(Object.entries(savedState.cultivationModifiers));
                }
                if (savedState.combatModifiers) {
                    this.integrationState.combatModifiers = new Map(Object.entries(savedState.combatModifiers));
                }
                if (savedState.resourceModifiers) {
                    this.integrationState.resourceModifiers = new Map(Object.entries(savedState.resourceModifiers));
                }
            }

            // Load achievements
            const savedAchievements = this.gameState.get('scriptureAchievements');
            if (savedAchievements) {
                if (savedAchievements.scriptureRelated) {
                    this.achievements.scriptureRelated = new Map(Object.entries(savedAchievements.scriptureRelated));
                }
                if (savedAchievements.milestones) {
                    this.achievements.milestones = new Map(Object.entries(savedAchievements.milestones));
                }
            }

            // Set up event listeners
            this._setupEventListeners();

            // Initialize achievement tracking
            this._initializeAchievements();

            this.isInitialized = true;

            this.eventManager.emit('scripture:integration_initialized', {
                state: this.integrationState
            });

            console.log('ScriptureIntegration: Initialization complete');

        } catch (error) {
            console.error('ScriptureIntegration: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Inject system dependencies
     * @param {Object} systems - System instances
     */
    injectSystems(systems) {
        this.gachaSystem = systems.gachaSystem;
        this.scriptureManager = systems.scriptureManager;
        this.enhancementSystem = systems.enhancementSystem;

        // Start integration if all systems are available
        if (this.gachaSystem && this.scriptureManager && this.enhancementSystem) {
            this._startIntegration();
        }
    }

    /**
     * Start the integration between all scripture systems
     */
    _startIntegration() {
        if (!this.isInitialized || this.integrationState.isActive) {
            return;
        }

        this.integrationState.isActive = true;
        this.integrationState.lastUpdateTime = Date.now();

        // Apply initial effects
        this._updateAllEffects();

        // Set up periodic updates
        this._setupPeriodicUpdates();

        this.eventManager.emit('scripture:integration_started', {
            systems: ['gacha', 'scripture', 'enhancement'],
            effects: this.effectCache
        });

        console.log('ScriptureIntegration: Integration started');
    }

    /**
     * Update all scripture effects on cultivation and other systems
     */
    _updateAllEffects() {
        if (!this.scriptureManager) {
            return;
        }

        // Get current active effects from scripture manager
        const activeEffects = this.scriptureManager.getActiveEffects();

        // Reset effect cache
        this._resetEffectCache();

        // Apply cultivation effects
        this._applyCultivationEffects(activeEffects);

        // Apply combat effects
        this._applyCombatEffects(activeEffects);

        // Apply resource effects
        this._applyResourceEffects(activeEffects);

        // Apply special effects
        this._applySpecialEffects(activeEffects);

        // Apply set bonuses
        this._applySetBonuses(activeEffects);

        // Notify cultivation system of changes
        this._notifyCultivationSystem();

        // Update cache timestamp
        this.integrationState.lastUpdateTime = Date.now();
        this.integrationState.effectsApplied = true;

        // Save state
        this.saveState();

        // Emit update event
        this.eventManager.emit('scripture:effects_integrated', {
            effects: this.effectCache,
            timestamp: this.integrationState.lastUpdateTime
        });
    }

    /**
     * Handle gacha pulls and new scripture acquisitions
     * @param {Object} pullResult - Gacha pull result
     */
    handleGachaPull(pullResult) {
        if (!pullResult.success) {
            return;
        }

        const scripture = pullResult.result;

        // Add to scripture manager
        if (this.scriptureManager) {
            const addResult = this.scriptureManager.addScripture(scripture);

            if (addResult.success) {
                // Check for achievements
                this._checkGachaAchievements(scripture, addResult);

                // Auto-equip if beneficial
                this._considerAutoEquip(scripture);

                // Update effects if new scripture affects them
                this._updateAllEffects();
            }
        }

        // Emit integration event
        this.eventManager.emit('scripture:gacha_integrated', {
            scripture: scripture,
            wasAdded: this.scriptureManager ? true : false
        });
    }

    /**
     * Handle scripture enhancement completion
     * @param {Object} enhancementResult - Enhancement result
     */
    handleEnhancementComplete(enhancementResult) {
        if (!enhancementResult.success) {
            return;
        }

        // Update effects since scripture power changed
        this._updateAllEffects();

        // Check for enhancement achievements
        this._checkEnhancementAchievements(enhancementResult);

        // Check if auto-reequip is needed
        this._considerReequip(enhancementResult.scripture);

        // Emit integration event
        this.eventManager.emit('scripture:enhancement_integrated', {
            scripture: enhancementResult.scripture,
            enhancement: enhancementResult
        });
    }

    /**
     * Handle cultivation level ups and provide scripture recommendations
     * @param {Object} levelUpData - Level up event data
     */
    handleCultivationLevelUp(levelUpData) {
        // Update recommendations based on new cultivation level
        if (this.scriptureManager) {
            const recommendations = this.scriptureManager.getRecommendations(3);

            this.eventManager.emit('scripture:recommendations_updated', {
                levelUpPath: levelUpData.path,
                newLevel: levelUpData.newLevel,
                recommendations: recommendations
            });
        }

        // Check for cultivation-based achievements
        this._checkCultivationAchievements(levelUpData);

        // Update scripture effects (some may scale with cultivation level)
        this._updateAllEffects();
    }

    /**
     * Handle realm breakthrough events
     * @param {Object} breakthroughData - Breakthrough event data
     */
    handleRealmBreakthrough(breakthroughData) {
        // Some scriptures may have realm-specific unlocks or bonuses
        this._updateAllEffects();

        // Check for realm achievements
        this._checkRealmAchievements(breakthroughData);

        // Provide relevant scripture suggestions for new realm
        if (this.scriptureManager) {
            const recommendations = this.scriptureManager.getRecommendations(5);

            this.eventManager.emit('scripture:realm_recommendations', {
                newRealm: breakthroughData.newRealm,
                recommendations: recommendations
            });
        }
    }

    /**
     * Get current integrated effects for all systems
     * @returns {Object} All integrated effects
     */
    getIntegratedEffects() {
        return {
            cultivation: { ...this.effectCache.cultivation },
            combat: { ...this.effectCache.combat },
            resource: { ...this.effectCache.resource },
            special: new Map(this.effectCache.special),
            timestamp: this.integrationState.lastUpdateTime,
            isActive: this.integrationState.isActive
        };
    }

    /**
     * Get scripture-related achievements
     * @returns {Object} Achievement data
     */
    getAchievements() {
        return {
            scriptureRelated: new Map(this.achievements.scriptureRelated),
            milestones: new Map(this.achievements.milestones),
            totalUnlocked: this.achievements.scriptureRelated.size + this.achievements.milestones.size
        };
    }

    /**
     * Get integration statistics
     * @returns {Object} Integration statistics
     */
    getStatistics() {
        const stats = {
            isActive: this.integrationState.isActive,
            effectsApplied: this.integrationState.effectsApplied,
            lastUpdateTime: this.integrationState.lastUpdateTime,
            totalModifiers: this.integrationState.cultivationModifiers.size +
                           this.integrationState.combatModifiers.size +
                           this.integrationState.resourceModifiers.size,
            achievementsUnlocked: this.achievements.scriptureRelated.size + this.achievements.milestones.size
        };

        // Add system-specific statistics if available
        if (this.gachaSystem) {
            stats.gachaStats = this.gachaSystem.getStatistics();
        }
        if (this.scriptureManager) {
            stats.collectionStats = this.scriptureManager.getStatistics();
        }
        if (this.enhancementSystem) {
            stats.enhancementStats = this.enhancementSystem.getStatistics();
        }

        return stats;
    }

    /**
     * Save integration state to game state
     */
    saveState() {
        // Convert Maps to Objects for serialization
        const cultivationModifiers = Object.fromEntries(this.integrationState.cultivationModifiers);
        const combatModifiers = Object.fromEntries(this.integrationState.combatModifiers);
        const resourceModifiers = Object.fromEntries(this.integrationState.resourceModifiers);

        const scriptureRelated = Object.fromEntries(this.achievements.scriptureRelated);
        const milestones = Object.fromEntries(this.achievements.milestones);

        this.gameState.update({
            scriptureIntegration: {
                isActive: this.integrationState.isActive,
                effectsApplied: this.integrationState.effectsApplied,
                lastUpdateTime: this.integrationState.lastUpdateTime,
                cultivationModifiers: cultivationModifiers,
                combatModifiers: combatModifiers,
                resourceModifiers: resourceModifiers
            },
            scriptureAchievements: {
                scriptureRelated: scriptureRelated,
                milestones: milestones
            }
        }, { source: 'scripture:integration_save' });
    }

    // Private methods

    /**
     * Set up event listeners for all scripture-related events
     */
    _setupEventListeners() {
        // Gacha system events
        this.eventManager.on('gacha:pull_complete', (data) => {
            this.handleGachaPull(data);
        });

        this.eventManager.on('gacha:multi_pull_complete', (data) => {
            for (const result of data.results) {
                this.handleGachaPull({ success: true, result: result });
            }
        });

        // Scripture management events
        this.eventManager.on('scripture:equipped', () => {
            this._updateAllEffects();
        });

        this.eventManager.on('scripture:unequipped', () => {
            this._updateAllEffects();
        });

        // Enhancement events
        this.eventManager.on('scripture:enhanced', (data) => {
            this.handleEnhancementComplete(data);
        });

        this.eventManager.on('scripture:awakened', (data) => {
            this.handleEnhancementComplete(data);
        });

        this.eventManager.on('scripture:breakthrough', (data) => {
            this.handleEnhancementComplete(data);
        });

        // Cultivation system events
        this.eventManager.on('cultivation:level_up', (data) => {
            this.handleCultivationLevelUp(data);
        });

        this.eventManager.on('cultivation:breakthrough', (data) => {
            this.handleRealmBreakthrough(data);
        });

        this.eventManager.on('realm:changed', (data) => {
            this.handleRealmBreakthrough(data);
        });

        // Save events
        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });
    }

    /**
     * Set up periodic updates for time-based effects
     */
    _setupPeriodicUpdates() {
        // Update effects every 30 seconds
        setInterval(() => {
            if (this.integrationState.isActive) {
                this._updateAllEffects();
            }
        }, 30000);
    }

    /**
     * Reset effect cache to default values
     */
    _resetEffectCache() {
        this.effectCache = {
            cultivation: {
                qiMultiplier: 1.0,
                bodyMultiplier: 1.0,
                dualMultiplier: 1.0,
                experienceBonus: 0.0,
                breakthroughBonus: 0.0
            },
            combat: {
                powerBonus: 0.0,
                defenseBonus: 0.0,
                speedBonus: 0.0,
                criticalChance: 0.0,
                criticalDamage: 0.0
            },
            resource: {
                jadeMultiplier: 1.0,
                crystalMultiplier: 1.0,
                dropRateBonus: 0.0,
                gachaBonus: 0.0
            },
            special: new Map()
        };
    }

    /**
     * Apply cultivation effects from scriptures
     * @param {Object} activeEffects - Active scripture effects
     */
    _applyCultivationEffects(activeEffects) {
        const cultivation = activeEffects.cultivation;

        // Apply direct stat bonuses
        this.effectCache.cultivation.qiMultiplier += cultivation.qiBonus;
        this.effectCache.cultivation.bodyMultiplier += cultivation.bodyBonus;
        this.effectCache.cultivation.experienceBonus += cultivation.cultivationSpeed;
        this.effectCache.cultivation.breakthroughBonus += cultivation.breakthroughChance;

        // Calculate dual cultivation multiplier
        const avgMultiplier = (cultivation.qiBonus + cultivation.bodyBonus) / 2;
        this.effectCache.cultivation.dualMultiplier += avgMultiplier * 0.8; // 80% efficiency for dual

        // Store modifiers for cultivation system
        this.integrationState.cultivationModifiers.set('scripture_qi', cultivation.qiBonus);
        this.integrationState.cultivationModifiers.set('scripture_body', cultivation.bodyBonus);
        this.integrationState.cultivationModifiers.set('scripture_speed', cultivation.cultivationSpeed);
    }

    /**
     * Apply combat effects from scriptures
     * @param {Object} activeEffects - Active scripture effects
     */
    _applyCombatEffects(activeEffects) {
        const combat = activeEffects.combat;

        // Apply combat bonuses
        this.effectCache.combat.powerBonus += combat.power;
        this.effectCache.combat.defenseBonus += combat.defense;
        this.effectCache.combat.speedBonus += combat.speed;
        this.effectCache.combat.criticalChance += combat.critChance;
        this.effectCache.combat.criticalDamage += combat.critDamage;

        // Store modifiers for combat system
        this.integrationState.combatModifiers.set('scripture_power', combat.power);
        this.integrationState.combatModifiers.set('scripture_defense', combat.defense);
    }

    /**
     * Apply resource effects from scriptures
     * @param {Object} activeEffects - Active scripture effects
     */
    _applyResourceEffects(activeEffects) {
        const resource = activeEffects.resource;

        // Apply resource bonuses
        this.effectCache.resource.jadeMultiplier += resource.jadeBonus;
        this.effectCache.resource.crystalMultiplier += resource.crystalBonus;
        this.effectCache.resource.dropRateBonus += resource.dropRateBonus;
        this.effectCache.resource.gachaBonus += resource.expBonus; // Experience bonus affects gacha

        // Store modifiers for resource systems
        this.integrationState.resourceModifiers.set('scripture_jade', resource.jadeBonus);
        this.integrationState.resourceModifiers.set('scripture_crystal', resource.crystalBonus);
    }

    /**
     * Apply special effects from scriptures
     * @param {Object} activeEffects - Active scripture effects
     */
    _applySpecialEffects(activeEffects) {
        const special = activeEffects.special;

        // Copy all special effects to cache
        for (const [effectName, effectData] of special) {
            this.effectCache.special.set(effectName, effectData);
        }
    }

    /**
     * Apply set bonuses from equipped scripture combinations
     * @param {Object} activeEffects - Active scripture effects
     */
    _applySetBonuses(activeEffects) {
        const sets = activeEffects.sets;

        for (const [setId, setData] of sets) {
            const bonuses = setData.bonuses;

            // Apply set bonuses to appropriate categories
            for (const [bonusType, bonusValue] of Object.entries(bonuses)) {
                switch (bonusType) {
                    case 'cultivationSpeed':
                        this.effectCache.cultivation.experienceBonus += bonusValue;
                        break;
                    case 'qiBonus':
                        this.effectCache.cultivation.qiMultiplier += bonusValue;
                        break;
                    case 'bodyBonus':
                        this.effectCache.cultivation.bodyMultiplier += bonusValue;
                        break;
                    case 'physicalPower':
                        this.effectCache.combat.powerBonus += bonusValue;
                        break;
                    case 'elementalDamage':
                        this.effectCache.combat.powerBonus += bonusValue * 0.5; // Convert to general power
                        break;
                    default:
                        // Store special set bonuses
                        this.effectCache.special.set(`set_${bonusType}`, {
                            description: `${setData.name}: ${bonusType}`,
                            value: bonusValue,
                            source: setId
                        });
                        break;
                }
            }
        }
    }

    /**
     * Notify cultivation system of effect changes
     */
    _notifyCultivationSystem() {
        if (!this.cultivationSystem) {
            return;
        }

        // Create temporary effect for cultivation system
        const scriptureEffect = {
            qiMultiplier: this.effectCache.cultivation.qiMultiplier,
            bodyMultiplier: this.effectCache.cultivation.bodyMultiplier,
            dualMultiplier: this.effectCache.cultivation.dualMultiplier,
            experienceBonus: this.effectCache.cultivation.experienceBonus,
            breakthroughBonus: this.effectCache.cultivation.breakthroughBonus
        };

        // Apply as temporary effect (duration doesn't matter as it's refreshed periodically)
        this.cultivationSystem.applyTemporaryEffect(scriptureEffect, 60);
    }

    /**
     * Initialize achievement tracking
     */
    _initializeAchievements() {
        // Define scripture-related achievements
        const scriptureAchievements = {
            'first_scripture': {
                name: 'First Scripture',
                description: 'Obtain your first cultivation scripture',
                check: () => this.scriptureManager && this.scriptureManager.getStatistics().totalScriptures >= 1,
                reward: { jade: 500 }
            },
            'rare_collector': {
                name: 'Rare Collector',
                description: 'Collect 10 rare or higher scriptures',
                check: () => {
                    if (!this.scriptureManager) return false;
                    const stats = this.scriptureManager.getStatistics();
                    const rareCount = (stats.scripturesByRarity.Rare || 0) +
                                    (stats.scripturesByRarity.Epic || 0) +
                                    (stats.scripturesByRarity.Legendary || 0) +
                                    (stats.scripturesByRarity.Mythical || 0);
                    return rareCount >= 10;
                },
                reward: { jade: 2000, crystals: 100 }
            },
            'enhancement_master': {
                name: 'Enhancement Master',
                description: 'Successfully enhance scriptures 50 times',
                check: () => this.enhancementSystem && this.enhancementSystem.getStatistics().successfulEnhancements >= 50,
                reward: { jade: 5000, enhancementStones: 10 }
            },
            'awakening_pioneer': {
                name: 'Awakening Pioneer',
                description: 'Awaken your first scripture',
                check: () => this.enhancementSystem && this.enhancementSystem.getStatistics().awakeningsPerformed >= 1,
                reward: { crystals: 500, awakeningStones: 5 }
            },
            'legendary_fortune': {
                name: 'Legendary Fortune',
                description: 'Obtain a legendary scripture from gacha',
                check: () => {
                    if (!this.gachaSystem) return false;
                    const history = this.gachaSystem.getStatistics().pullHistory;
                    return history.some(pull => pull.rarity === 'Legendary' || pull.rarity === 'Mythical');
                },
                reward: { jade: 10000, crystals: 1000 }
            }
        };

        // Check initial achievements
        for (const [achievementId, achievement] of Object.entries(scriptureAchievements)) {
            if (!this.achievements.scriptureRelated.has(achievementId) && achievement.check()) {
                this._unlockAchievement(achievementId, achievement);
            }
        }
    }

    /**
     * Check for gacha-related achievements
     * @param {Object} scripture - New scripture obtained
     * @param {Object} addResult - Add result from scripture manager
     */
    _checkGachaAchievements(scripture, addResult) {
        // Check for first scripture
        if (!this.achievements.scriptureRelated.has('first_scripture')) {
            if (this.scriptureManager.getStatistics().totalScriptures >= 1) {
                this._unlockAchievement('first_scripture', {
                    name: 'First Scripture',
                    description: 'Obtain your first cultivation scripture',
                    reward: { jade: 500 }
                });
            }
        }

        // Check for legendary fortune
        if (!this.achievements.scriptureRelated.has('legendary_fortune')) {
            if (scripture.rarity === 'Legendary' || scripture.rarity === 'Mythical') {
                this._unlockAchievement('legendary_fortune', {
                    name: 'Legendary Fortune',
                    description: 'Obtain a legendary scripture from gacha',
                    reward: { jade: 10000, crystals: 1000 }
                });
            }
        }

        // Check for rare collector
        if (!this.achievements.scriptureRelated.has('rare_collector')) {
            const stats = this.scriptureManager.getStatistics();
            const rareCount = (stats.scripturesByRarity.Rare || 0) +
                            (stats.scripturesByRarity.Epic || 0) +
                            (stats.scripturesByRarity.Legendary || 0) +
                            (stats.scripturesByRarity.Mythical || 0);
            if (rareCount >= 10) {
                this._unlockAchievement('rare_collector', {
                    name: 'Rare Collector',
                    description: 'Collect 10 rare or higher scriptures',
                    reward: { jade: 2000, crystals: 100 }
                });
            }
        }
    }

    /**
     * Check for enhancement-related achievements
     * @param {Object} enhancementResult - Enhancement result
     */
    _checkEnhancementAchievements(enhancementResult) {
        // Check for enhancement master
        if (!this.achievements.scriptureRelated.has('enhancement_master')) {
            const stats = this.enhancementSystem.getStatistics();
            if (stats.successfulEnhancements >= 50) {
                this._unlockAchievement('enhancement_master', {
                    name: 'Enhancement Master',
                    description: 'Successfully enhance scriptures 50 times',
                    reward: { jade: 5000, enhancementStones: 10 }
                });
            }
        }

        // Check for awakening pioneer
        if (!this.achievements.scriptureRelated.has('awakening_pioneer')) {
            const stats = this.enhancementSystem.getStatistics();
            if (stats.awakeningsPerformed >= 1) {
                this._unlockAchievement('awakening_pioneer', {
                    name: 'Awakening Pioneer',
                    description: 'Awaken your first scripture',
                    reward: { crystals: 500, awakeningStones: 5 }
                });
            }
        }
    }

    /**
     * Check for cultivation-related achievements
     * @param {Object} levelUpData - Level up data
     */
    _checkCultivationAchievements(levelUpData) {
        // Placeholder for cultivation-based scripture achievements
        // Could include things like "Reach level 100 with scripture effects"
    }

    /**
     * Check for realm-related achievements
     * @param {Object} breakthroughData - Breakthrough data
     */
    _checkRealmAchievements(breakthroughData) {
        // Placeholder for realm-based scripture achievements
        // Could include things like "Breakthrough to Core Formation with full scripture loadout"
    }

    /**
     * Unlock an achievement
     * @param {string} achievementId - Achievement ID
     * @param {Object} achievement - Achievement data
     */
    _unlockAchievement(achievementId, achievement) {
        this.achievements.scriptureRelated.set(achievementId, {
            ...achievement,
            unlockedAt: Date.now()
        });

        // Apply rewards
        if (achievement.reward) {
            if (achievement.reward.jade) {
                this.gameState.increment('player.jade', achievement.reward.jade);
            }
            if (achievement.reward.crystals) {
                this.gameState.increment('player.spiritCrystals', achievement.reward.crystals);
            }
            if (achievement.reward.enhancementStones && this.enhancementSystem) {
                this.enhancementSystem.addMaterials({ enhancementStones: achievement.reward.enhancementStones });
            }
            if (achievement.reward.awakeningStones && this.enhancementSystem) {
                this.enhancementSystem.addMaterials({ awakeningStones: achievement.reward.awakeningStones });
            }
        }

        // Emit achievement event
        this.eventManager.emit('scripture:achievement_unlocked', {
            achievementId: achievementId,
            achievement: achievement,
            reward: achievement.reward
        });

        console.log(`ScriptureIntegration: Achievement unlocked: ${achievement.name}`);
    }

    /**
     * Consider auto-equipping a new scripture
     * @param {Object} scripture - New scripture
     */
    _considerAutoEquip(scripture) {
        if (!this.scriptureManager) {
            return;
        }

        // Check if this scripture would be an improvement
        const currentPower = this.scriptureManager.getActiveEffects().combat.power;
        const scripturePower = ENHANCEMENT_FORMULAS.scripturepower(scripture);

        // Auto-equip if significantly better and no scripture equipped in primary slot
        const equipped = this.scriptureManager.getEquippedScriptures();
        if (!equipped.primary && scripturePower > 100) {
            this.scriptureManager.equipScripture(scripture.id, 'primary');
        }
    }

    /**
     * Consider re-equipping after enhancement
     * @param {Object} scripture - Enhanced scripture
     */
    _considerReequip(scripture) {
        // Enhancement might have made this scripture better for a different slot
        // This is handled by the scripture manager's recommendation system
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScriptureIntegration };
} else if (typeof window !== 'undefined') {
    window.ScriptureIntegration = ScriptureIntegration;
}