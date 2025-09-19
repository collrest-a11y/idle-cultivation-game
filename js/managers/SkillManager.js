/**
 * SkillManager - Core skill logic and state management
 * Handles skill unlocking, leveling, loadouts, and effect calculations
 *
 * NOTE: This implementation uses placeholder structures for GameState.skills
 * It will be completed once Stream B defines the actual data structure
 */
class SkillManager {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Manager state
        this.isInitialized = false;
        this.isReady = false;
        this.lastStateHash = null;

        // Skill data cache (will be populated from skill-data.js)
        this.skillDefinitions = new Map();
        this.skillCategories = new Map();

        // Loadout management
        this.maxLoadoutSize = 6; // Default, may be configurable
        this.currentLoadout = [];

        // Change tracking
        this.hasStateChanged = false;
        this.lastChangeTime = 0;

        // Validation cache
        this.validationCache = new Map();
        this.cacheExpirationTime = 30000; // 30 seconds

        console.log('SkillManager: Initialized');
    }

    /**
     * Initialize the skill manager
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                console.warn('SkillManager: Already initialized');
                return;
            }

            // Load skill definitions (placeholder for now)
            await this._loadSkillDefinitions();

            // Initialize skill state structure if needed
            this._initializeSkillState();

            // Load current loadout
            this._loadCurrentLoadout();

            // Calculate initial state hash
            this._updateStateHash();

            this.isInitialized = true;
            this.isReady = true;

            console.log('SkillManager: Initialization complete');

        } catch (error) {
            console.error('SkillManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Update skill manager - called from SkillSystem
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isReady) {
            return;
        }

        // Check for state changes
        this._checkForStateChanges();

        // Clear expired validation cache
        this._cleanupValidationCache();
    }

    /**
     * Unlock a skill
     * @param {string} skillId - ID of the skill to unlock
     * @param {Object} context - Context for unlocking (fragment cost, requirements, etc.)
     * @returns {Object} Result of unlock operation
     */
    async unlockSkill(skillId, context = {}) {
        if (!this.isReady) {
            throw new Error('SkillManager not ready');
        }

        try {
            // Validate skill exists
            const skillDef = this.skillDefinitions.get(skillId);
            if (!skillDef) {
                return {
                    success: false,
                    error: `Skill '${skillId}' not found`
                };
            }

            // Check if already unlocked
            if (this._isSkillUnlocked(skillId)) {
                return {
                    success: false,
                    error: `Skill '${skillId}' already unlocked`
                };
            }

            // Validate requirements
            const requirementCheck = this._validateSkillRequirements(skillId, context);
            if (!requirementCheck.valid) {
                return {
                    success: false,
                    error: requirementCheck.reason
                };
            }

            // Validate cost (fragments, prerequisites, etc.)
            const costCheck = this._validateSkillCost(skillId, context);
            if (!costCheck.valid) {
                return {
                    success: false,
                    error: costCheck.reason
                };
            }

            // Perform unlock
            await this._performSkillUnlock(skillId, context);

            // Mark state as changed
            this._markStateChanged();

            // Get updated skill data
            const unlockedSkill = this._getSkillData(skillId);

            return {
                success: true,
                skill: unlockedSkill,
                skillId,
                context
            };

        } catch (error) {
            console.error('SkillManager: Unlock failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Level up a skill
     * @param {string} skillId - ID of the skill to level up
     * @param {Object} context - Context for leveling (skill points cost, etc.)
     * @returns {Object} Result of level up operation
     */
    async levelUpSkill(skillId, context = {}) {
        if (!this.isReady) {
            throw new Error('SkillManager not ready');
        }

        try {
            // Validate skill is unlocked
            if (!this._isSkillUnlocked(skillId)) {
                return {
                    success: false,
                    error: `Skill '${skillId}' not unlocked`
                };
            }

            // Get current level
            const currentLevel = this._getSkillLevel(skillId);
            const maxLevel = this._getSkillMaxLevel(skillId);

            // Check if already at max level
            if (currentLevel >= maxLevel) {
                return {
                    success: false,
                    error: `Skill '${skillId}' already at max level`
                };
            }

            // Validate cost (skill points, etc.)
            const costCheck = this._validateLevelUpCost(skillId, currentLevel + 1, context);
            if (!costCheck.valid) {
                return {
                    success: false,
                    error: costCheck.reason
                };
            }

            // Perform level up
            const newLevel = await this._performSkillLevelUp(skillId, context);

            // Mark state as changed
            this._markStateChanged();

            // Get updated skill data
            const updatedSkill = this._getSkillData(skillId);

            return {
                success: true,
                skill: updatedSkill,
                skillId,
                newLevel,
                previousLevel: currentLevel,
                context
            };

        } catch (error) {
            console.error('SkillManager: Level up failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update skill loadout
     * @param {string[]} skillIds - Array of skill IDs for the new loadout
     * @returns {Object} Result of loadout update
     */
    updateLoadout(skillIds) {
        if (!this.isReady) {
            throw new Error('SkillManager not ready');
        }

        try {
            // Validate loadout size
            if (skillIds.length > this.maxLoadoutSize) {
                return {
                    success: false,
                    error: `Loadout cannot exceed ${this.maxLoadoutSize} skills`
                };
            }

            // Validate all skills are unlocked
            for (const skillId of skillIds) {
                if (!this._isSkillUnlocked(skillId)) {
                    return {
                        success: false,
                        error: `Skill '${skillId}' not unlocked`
                    };
                }
            }

            // Store old loadout
            const oldLoadout = [...this.currentLoadout];

            // Update loadout
            this.currentLoadout = [...skillIds];

            // Save to game state
            this._saveCurrentLoadout();

            // Mark state as changed
            this._markStateChanged();

            return {
                success: true,
                oldLoadout,
                newLoadout: [...this.currentLoadout]
            };

        } catch (error) {
            console.error('SkillManager: Loadout update failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get skill effects for a specific skill
     * @param {string} skillId - ID of the skill
     * @returns {Object|null} Skill effects or null if not found
     */
    getSkillEffects(skillId) {
        if (!this.isReady || !this._isSkillUnlocked(skillId)) {
            return null;
        }

        try {
            const skillDef = this.skillDefinitions.get(skillId);
            const skillLevel = this._getSkillLevel(skillId);

            if (!skillDef || !skillDef.effects) {
                return null;
            }

            // Calculate effects based on skill level
            return this._calculateSkillEffects(skillDef, skillLevel);

        } catch (error) {
            console.error('SkillManager: Failed to get skill effects:', error);
            return null;
        }
    }

    /**
     * Check if a skill is in the current loadout
     * @param {string} skillId - ID of the skill
     * @returns {boolean} Whether the skill is in loadout
     */
    isSkillInLoadout(skillId) {
        return this.currentLoadout.includes(skillId);
    }

    /**
     * Get current loadout
     * @returns {string[]} Array of skill IDs in current loadout
     */
    getCurrentLoadout() {
        return [...this.currentLoadout];
    }

    /**
     * Check if state has changed since last check
     * @returns {boolean} Whether state has changed
     */
    hasChanged() {
        return this.hasStateChanged;
    }

    /**
     * Check if manager is ready
     * @returns {boolean} Whether manager is initialized and ready
     */
    isReady() {
        return this.isReady;
    }

    /**
     * Shutdown the skill manager
     */
    async shutdown() {
        try {
            this.isReady = false;

            // Clear caches
            this.skillDefinitions.clear();
            this.skillCategories.clear();
            this.validationCache.clear();

            // Clear loadout
            this.currentLoadout = [];

            console.log('SkillManager: Shutdown complete');

        } catch (error) {
            console.error('SkillManager: Shutdown failed:', error);
            throw error;
        }
    }

    // Private methods

    /**
     * Load skill definitions from data file
     * NOTE: This is a placeholder implementation
     */
    async _loadSkillDefinitions() {
        // Placeholder skill definitions until skill-data.js is created by Stream B
        this.skillDefinitions.set('cultivation_speed', {
            id: 'cultivation_speed',
            name: 'Cultivation Speed',
            category: 'cultivation',
            maxLevel: 5,
            effects: {
                cultivation: {
                    speedMultiplier: { base: 0.1, perLevel: 0.05 }
                }
            },
            requirements: {
                fragments: { base: 10, perLevel: 5 }
            }
        });

        this.skillDefinitions.set('combat_power', {
            id: 'combat_power',
            name: 'Combat Power',
            category: 'combat',
            maxLevel: 5,
            effects: {
                combat: {
                    powerMultiplier: { base: 0.15, perLevel: 0.1 }
                }
            },
            requirements: {
                fragments: { base: 15, perLevel: 7 }
            }
        });

        console.log('SkillManager: Loaded placeholder skill definitions');
    }

    /**
     * Initialize skill state structure in GameState
     * NOTE: This is a placeholder until Stream B defines the actual structure
     */
    _initializeSkillState() {
        // Check if skills state exists
        let skillsState = this.gameState.get('skills');

        if (!skillsState) {
            // Create placeholder structure
            skillsState = {
                unlocked: {},
                levels: {},
                loadout: [],
                skillPoints: 0,
                fragments: 0,
                mastery: {}
            };

            this.gameState.set('skills', skillsState);
            console.log('SkillManager: Initialized placeholder skills state');
        }
    }

    /**
     * Load current loadout from game state
     */
    _loadCurrentLoadout() {
        const skillsState = this.gameState.get('skills');
        if (skillsState && skillsState.loadout) {
            this.currentLoadout = [...skillsState.loadout];
        }
    }

    /**
     * Save current loadout to game state
     */
    _saveCurrentLoadout() {
        const skillsState = this.gameState.get('skills') || {};
        skillsState.loadout = [...this.currentLoadout];
        this.gameState.set('skills', skillsState);
    }

    /**
     * Check if a skill is unlocked
     * @param {string} skillId - ID of the skill
     * @returns {boolean} Whether the skill is unlocked
     */
    _isSkillUnlocked(skillId) {
        const skillsState = this.gameState.get('skills');
        return skillsState && skillsState.unlocked && skillsState.unlocked[skillId] === true;
    }

    /**
     * Get skill level
     * @param {string} skillId - ID of the skill
     * @returns {number} Current skill level
     */
    _getSkillLevel(skillId) {
        const skillsState = this.gameState.get('skills');
        return (skillsState && skillsState.levels && skillsState.levels[skillId]) || 0;
    }

    /**
     * Get skill max level
     * @param {string} skillId - ID of the skill
     * @returns {number} Maximum skill level
     */
    _getSkillMaxLevel(skillId) {
        const skillDef = this.skillDefinitions.get(skillId);
        return skillDef ? skillDef.maxLevel : 1;
    }

    /**
     * Get skill data including current state
     * @param {string} skillId - ID of the skill
     * @returns {Object|null} Complete skill data
     */
    _getSkillData(skillId) {
        const skillDef = this.skillDefinitions.get(skillId);
        if (!skillDef) {
            return null;
        }

        return {
            ...skillDef,
            isUnlocked: this._isSkillUnlocked(skillId),
            currentLevel: this._getSkillLevel(skillId),
            isInLoadout: this.isSkillInLoadout(skillId)
        };
    }

    /**
     * Validate skill requirements
     * @param {string} skillId - ID of the skill
     * @param {Object} context - Unlock context
     * @returns {Object} Validation result
     */
    _validateSkillRequirements(skillId, context) {
        // Placeholder validation logic
        return { valid: true };
    }

    /**
     * Validate skill unlock cost
     * @param {string} skillId - ID of the skill
     * @param {Object} context - Unlock context
     * @returns {Object} Validation result
     */
    _validateSkillCost(skillId, context) {
        const skillDef = this.skillDefinitions.get(skillId);
        const skillsState = this.gameState.get('skills');

        if (!skillDef || !skillsState) {
            return { valid: false, reason: 'Invalid skill or state' };
        }

        // Check fragments cost
        const fragmentCost = skillDef.requirements?.fragments?.base || 0;
        if (skillsState.fragments < fragmentCost) {
            return {
                valid: false,
                reason: `Not enough fragments (need ${fragmentCost}, have ${skillsState.fragments})`
            };
        }

        return { valid: true };
    }

    /**
     * Validate level up cost
     * @param {string} skillId - ID of the skill
     * @param {number} targetLevel - Target level
     * @param {Object} context - Level up context
     * @returns {Object} Validation result
     */
    _validateLevelUpCost(skillId, targetLevel, context) {
        const skillDef = this.skillDefinitions.get(skillId);
        const skillsState = this.gameState.get('skills');

        if (!skillDef || !skillsState) {
            return { valid: false, reason: 'Invalid skill or state' };
        }

        // Calculate skill points cost (placeholder logic)
        const skillPointCost = targetLevel * 2;
        if (skillsState.skillPoints < skillPointCost) {
            return {
                valid: false,
                reason: `Not enough skill points (need ${skillPointCost}, have ${skillsState.skillPoints})`
            };
        }

        return { valid: true };
    }

    /**
     * Perform skill unlock
     * @param {string} skillId - ID of the skill
     * @param {Object} context - Unlock context
     */
    async _performSkillUnlock(skillId, context) {
        const skillsState = this.gameState.get('skills');
        const skillDef = this.skillDefinitions.get(skillId);

        // Deduct fragments
        const fragmentCost = skillDef.requirements?.fragments?.base || 0;
        skillsState.fragments -= fragmentCost;

        // Mark as unlocked
        skillsState.unlocked[skillId] = true;
        skillsState.levels[skillId] = 1;

        // Save state
        this.gameState.set('skills', skillsState);
    }

    /**
     * Perform skill level up
     * @param {string} skillId - ID of the skill
     * @param {Object} context - Level up context
     * @returns {number} New skill level
     */
    async _performSkillLevelUp(skillId, context) {
        const skillsState = this.gameState.get('skills');
        const currentLevel = skillsState.levels[skillId] || 0;
        const newLevel = currentLevel + 1;

        // Deduct skill points
        const skillPointCost = newLevel * 2;
        skillsState.skillPoints -= skillPointCost;

        // Update level
        skillsState.levels[skillId] = newLevel;

        // Save state
        this.gameState.set('skills', skillsState);

        return newLevel;
    }

    /**
     * Calculate skill effects based on definition and level
     * @param {Object} skillDef - Skill definition
     * @param {number} level - Current skill level
     * @returns {Object} Calculated effects
     */
    _calculateSkillEffects(skillDef, level) {
        const effects = {};

        for (const [category, categoryEffects] of Object.entries(skillDef.effects)) {
            effects[category] = {};

            for (const [effectType, effectData] of Object.entries(categoryEffects)) {
                if (typeof effectData === 'object' && effectData.base !== undefined) {
                    // Calculate level-based effect
                    const baseValue = effectData.base;
                    const perLevelValue = effectData.perLevel || 0;
                    effects[category][effectType] = baseValue + (perLevelValue * (level - 1));
                } else {
                    effects[category][effectType] = effectData;
                }
            }
        }

        return effects;
    }

    /**
     * Update state hash for change detection
     */
    _updateStateHash() {
        const skillsState = this.gameState.get('skills');
        this.lastStateHash = this._calculateStateHash(skillsState);
        this.hasStateChanged = false;
    }

    /**
     * Check for state changes
     */
    _checkForStateChanges() {
        const skillsState = this.gameState.get('skills');
        const currentHash = this._calculateStateHash(skillsState);

        if (currentHash !== this.lastStateHash) {
            this.hasStateChanged = true;
            this.lastChangeTime = Date.now();
            this.lastStateHash = currentHash;
        }
    }

    /**
     * Calculate state hash for change detection
     * @param {Object} state - Skills state
     * @returns {string} State hash
     */
    _calculateStateHash(state) {
        return JSON.stringify(state);
    }

    /**
     * Mark state as changed
     */
    _markStateChanged() {
        this.hasStateChanged = true;
        this.lastChangeTime = Date.now();
    }

    /**
     * Clean up expired validation cache
     */
    _cleanupValidationCache() {
        const now = Date.now();
        for (const [key, data] of this.validationCache.entries()) {
            if (now - data.timestamp > this.cacheExpirationTime) {
                this.validationCache.delete(key);
            }
        }
    }
}

// Export for module system
if (typeof window !== 'undefined') {
    window.SkillManager = SkillManager;
}