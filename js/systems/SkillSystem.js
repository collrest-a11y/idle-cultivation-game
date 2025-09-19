/**
 * SkillSystem - Core skills system coordinator with roguelite progression
 * Manages skill unlocking, leveling, loadouts, and integration with game systems
 */
class SkillSystem {
    constructor(gameState, eventManager, skillManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.skillManager = skillManager;

        // System state
        this.systemState = {
            isInitialized: false,
            isActive: false,
            loadoutDirty: false,
            effectsVersion: 0
        };

        // Active effects tracking
        this.activeEffects = {
            loadoutEffects: new Map(),
            masteryBonuses: new Map(),
            temporaryEffects: new Map(),
            synergies: new Map()
        };

        // Performance tracking
        this.lastUpdateTime = Date.now();
        this.lastEffectCalculation = 0;
        this.effectCalculationInterval = 1000; // Recalculate effects every second

        // Statistics tracking
        this.statistics = {
            skillsUnlocked: 0,
            totalSkillLevels: 0,
            masteryPointsEarned: 0,
            fragmentsCollected: 0,
            loadoutChanges: 0,
            totalEffectCalculations: 0
        };

        console.log('SkillSystem: Initialized');
    }

    /**
     * Initialize the skill system with game state
     */
    async initialize() {
        try {
            if (this.systemState.isInitialized) {
                console.warn('SkillSystem: Already initialized');
                return;
            }

            // Initialize skill manager first
            await this.skillManager.initialize();

            // Load skill system state from game state
            const savedState = this.gameState.get('skillSystem');
            if (savedState) {
                this.systemState = {
                    ...this.systemState,
                    ...savedState
                };
            }

            // Load statistics
            const savedStats = this.gameState.get('skillStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Set up event listeners
            this._setupEventListeners();

            // Calculate initial skill effects
            this._calculateSkillEffects();

            // Mark as initialized and active
            this.systemState.isInitialized = true;
            this.systemState.isActive = true;
            this.lastUpdateTime = Date.now();

            // Emit initialization event
            this.eventManager.emit('skillSystem:initialized', {
                systemState: this.systemState,
                statistics: this.statistics,
                activeEffects: this._getActiveEffectsSummary()
            });

            console.log('SkillSystem: Initialization complete');

        } catch (error) {
            console.error('SkillSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Update skill system - called from game loop
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.systemState.isInitialized || !this.systemState.isActive) {
            return;
        }

        this.lastUpdateTime = Date.now();

        // Recalculate effects if needed
        if (this.lastUpdateTime - this.lastEffectCalculation >= this.effectCalculationInterval) {
            this._recalculateEffectsIfNeeded();
            this.lastEffectCalculation = this.lastUpdateTime;
        }

        // Update skill manager
        this.skillManager.update(deltaTime);

        // Handle any pending loadout changes
        this._processLoadoutChanges();
    }

    /**
     * Unlock a new skill
     * @param {string} skillId - ID of the skill to unlock
     * @param {Object} context - Context for unlocking (e.g., fragment cost)
     * @returns {Object} Result of unlock operation
     */
    async unlockSkill(skillId, context = {}) {
        if (!this.systemState.isInitialized) {
            throw new Error('SkillSystem not initialized');
        }

        try {
            const result = await this.skillManager.unlockSkill(skillId, context);

            if (result.success) {
                this.statistics.skillsUnlocked++;
                this.statistics.fragmentsCollected += context.fragmentsCost || 0;
                this.systemState.effectsVersion++;

                // Save updated statistics
                this._saveStatistics();

                // Emit unlock event
                this.eventManager.emit('skillSystem:skillUnlocked', {
                    skillId,
                    skill: result.skill,
                    context,
                    statistics: this.statistics
                });

                // Recalculate effects if skill is in loadout
                if (this.skillManager.isSkillInLoadout(skillId)) {
                    this._calculateSkillEffects();
                }
            }

            return result;

        } catch (error) {
            console.error('SkillSystem: Failed to unlock skill:', error);
            throw error;
        }
    }

    /**
     * Level up a skill
     * @param {string} skillId - ID of the skill to level up
     * @param {Object} context - Context for leveling (e.g., skill points cost)
     * @returns {Object} Result of level up operation
     */
    async levelUpSkill(skillId, context = {}) {
        if (!this.systemState.isInitialized) {
            throw new Error('SkillSystem not initialized');
        }

        try {
            const result = await this.skillManager.levelUpSkill(skillId, context);

            if (result.success) {
                this.statistics.totalSkillLevels++;
                this.systemState.effectsVersion++;

                // Save updated statistics
                this._saveStatistics();

                // Emit level up event
                this.eventManager.emit('skillSystem:skillLevelUp', {
                    skillId,
                    skill: result.skill,
                    newLevel: result.newLevel,
                    context,
                    statistics: this.statistics
                });

                // Recalculate effects if skill is in loadout
                if (this.skillManager.isSkillInLoadout(skillId)) {
                    this._calculateSkillEffects();
                }
            }

            return result;

        } catch (error) {
            console.error('SkillSystem: Failed to level up skill:', error);
            throw error;
        }
    }

    /**
     * Update skill loadout
     * @param {string[]} skillIds - Array of skill IDs for the new loadout
     * @returns {Object} Result of loadout update
     */
    updateLoadout(skillIds) {
        if (!this.systemState.isInitialized) {
            throw new Error('SkillSystem not initialized');
        }

        try {
            const result = this.skillManager.updateLoadout(skillIds);

            if (result.success) {
                this.statistics.loadoutChanges++;
                this.systemState.loadoutDirty = true;
                this.systemState.effectsVersion++;

                // Save updated statistics
                this._saveStatistics();

                // Emit loadout change event
                this.eventManager.emit('skillSystem:loadoutChanged', {
                    oldLoadout: result.oldLoadout,
                    newLoadout: result.newLoadout,
                    statistics: this.statistics
                });

                // Mark for effect recalculation
                this._calculateSkillEffects();
            }

            return result;

        } catch (error) {
            console.error('SkillSystem: Failed to update loadout:', error);
            throw error;
        }
    }

    /**
     * Get current skill effects for game systems
     * @returns {Object} Active skill effects
     */
    getActiveEffects() {
        return {
            cultivation: this.activeEffects.loadoutEffects.get('cultivation') || {},
            combat: this.activeEffects.loadoutEffects.get('combat') || {},
            progression: this.activeEffects.loadoutEffects.get('progression') || {},
            resource: this.activeEffects.loadoutEffects.get('resource') || {},
            synergies: Object.fromEntries(this.activeEffects.synergies),
            version: this.systemState.effectsVersion
        };
    }

    /**
     * Check if skill system is ready
     * @returns {boolean} Whether the system is initialized and active
     */
    isReady() {
        return this.systemState.isInitialized && this.systemState.isActive;
    }

    /**
     * Get skill system statistics
     * @returns {Object} Current statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Shutdown the skill system
     */
    async shutdown() {
        try {
            this.systemState.isActive = false;

            // Clean up event listeners
            this._cleanupEventListeners();

            // Shutdown skill manager
            if (this.skillManager) {
                await this.skillManager.shutdown();
            }

            // Clear effects
            this.activeEffects.loadoutEffects.clear();
            this.activeEffects.masteryBonuses.clear();
            this.activeEffects.temporaryEffects.clear();
            this.activeEffects.synergies.clear();

            console.log('SkillSystem: Shutdown complete');

        } catch (error) {
            console.error('SkillSystem: Shutdown failed:', error);
            throw error;
        }
    }

    // Private methods

    /**
     * Set up event listeners for skill system
     */
    _setupEventListeners() {
        // Listen for game state changes that affect skills
        this.eventManager.on('gameState:loaded', this._onGameStateLoaded.bind(this));
        this.eventManager.on('gameState:reset', this._onGameStateReset.bind(this));

        // Listen for system events that might affect skill effects
        this.eventManager.on('cultivation:levelUp', this._onCultivationLevelUp.bind(this));
        this.eventManager.on('combat:victory', this._onCombatVictory.bind(this));

        console.log('SkillSystem: Event listeners setup complete');
    }

    /**
     * Clean up event listeners
     */
    _cleanupEventListeners() {
        this.eventManager.off('gameState:loaded', this._onGameStateLoaded.bind(this));
        this.eventManager.off('gameState:reset', this._onGameStateReset.bind(this));
        this.eventManager.off('cultivation:levelUp', this._onCultivationLevelUp.bind(this));
        this.eventManager.off('combat:victory', this._onCombatVictory.bind(this));
    }

    /**
     * Calculate skill effects from current loadout
     */
    _calculateSkillEffects() {
        if (!this.skillManager.isReady()) {
            return;
        }

        try {
            // Clear existing effects
            this.activeEffects.loadoutEffects.clear();
            this.activeEffects.synergies.clear();

            // Get current loadout
            const loadout = this.skillManager.getCurrentLoadout();

            // Calculate effects for each skill in loadout
            for (const skillId of loadout) {
                const skillEffects = this.skillManager.getSkillEffects(skillId);
                if (skillEffects) {
                    this._mergeSkillEffects(skillEffects);
                }
            }

            // Calculate synergies
            this._calculateSynergies(loadout);

            // Update statistics
            this.statistics.totalEffectCalculations++;

            // Mark loadout as clean
            this.systemState.loadoutDirty = false;

            console.log('SkillSystem: Effects calculated', this._getActiveEffectsSummary());

        } catch (error) {
            console.error('SkillSystem: Effect calculation failed:', error);
        }
    }

    /**
     * Recalculate effects if needed
     */
    _recalculateEffectsIfNeeded() {
        if (this.systemState.loadoutDirty || this.skillManager.hasChanged()) {
            this._calculateSkillEffects();
        }
    }

    /**
     * Merge skill effects into active effects
     * @param {Object} skillEffects - Effects from a single skill
     */
    _mergeSkillEffects(skillEffects) {
        for (const [category, effects] of Object.entries(skillEffects)) {
            if (!this.activeEffects.loadoutEffects.has(category)) {
                this.activeEffects.loadoutEffects.set(category, {});
            }

            const categoryEffects = this.activeEffects.loadoutEffects.get(category);

            for (const [effectType, value] of Object.entries(effects)) {
                if (typeof value === 'number') {
                    categoryEffects[effectType] = (categoryEffects[effectType] || 0) + value;
                } else if (typeof value === 'object') {
                    categoryEffects[effectType] = {
                        ...categoryEffects[effectType],
                        ...value
                    };
                } else {
                    categoryEffects[effectType] = value;
                }
            }
        }
    }

    /**
     * Calculate synergies between skills in loadout
     * @param {string[]} loadout - Current skill loadout
     */
    _calculateSynergies(loadout) {
        // This will be implemented when synergy data is available
        // For now, just placeholder for the framework
        this.activeEffects.synergies.clear();
    }

    /**
     * Process any pending loadout changes
     */
    _processLoadoutChanges() {
        if (this.systemState.loadoutDirty) {
            this._calculateSkillEffects();
        }
    }

    /**
     * Save statistics to game state
     */
    _saveStatistics() {
        this.gameState.set('skillStats', this.statistics);
        this.gameState.set('skillSystem', {
            effectsVersion: this.systemState.effectsVersion,
            loadoutDirty: this.systemState.loadoutDirty
        });
    }

    /**
     * Get summary of active effects for logging
     * @returns {Object} Summary of active effects
     */
    _getActiveEffectsSummary() {
        const summary = {};
        for (const [category, effects] of this.activeEffects.loadoutEffects) {
            summary[category] = Object.keys(effects).length;
        }
        return summary;
    }

    // Event handlers

    /**
     * Handle game state loaded event
     */
    _onGameStateLoaded() {
        console.log('SkillSystem: Game state loaded, reinitializing...');
        this._calculateSkillEffects();
    }

    /**
     * Handle game state reset event
     */
    _onGameStateReset() {
        console.log('SkillSystem: Game state reset, clearing effects...');
        this.activeEffects.loadoutEffects.clear();
        this.activeEffects.synergies.clear();
        this.statistics = {
            skillsUnlocked: 0,
            totalSkillLevels: 0,
            masteryPointsEarned: 0,
            fragmentsCollected: 0,
            loadoutChanges: 0,
            totalEffectCalculations: 0
        };
    }

    /**
     * Handle cultivation level up event
     */
    _onCultivationLevelUp(data) {
        // Skills might have effects that change based on cultivation level
        this.systemState.effectsVersion++;
        this._calculateSkillEffects();
    }

    /**
     * Handle combat victory event
     */
    _onCombatVictory(data) {
        // Skills might provide rewards or effects on combat victory
        // This will be expanded when skill data is available
    }
}

// Export for module system
if (typeof window !== 'undefined') {
    window.SkillSystem = SkillSystem;
}