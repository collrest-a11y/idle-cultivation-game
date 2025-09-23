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
        this._isReady = false;
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
            this._isReady = true;

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
        if (!this._isReady) {
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
        if (!this._isReady) {
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
        if (!this._isReady) {
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
        if (!this._isReady) {
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
        if (!this._isReady || !this._isSkillUnlocked(skillId)) {
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
     * Evolve a skill to its next form
     * @param {string} skillId - ID of the skill to evolve
     * @param {string} targetSkillId - ID of the target evolution skill
     * @param {Object} context - Evolution context
     * @returns {Object} Result of evolution operation
     */
    async evolveSkill(skillId, targetSkillId, context = {}) {
        if (!this._isReady) {
            throw new Error('SkillManager not ready');
        }

        try {
            // Check if skill exists and is unlocked
            if (!this._isSkillUnlocked(skillId)) {
                return {
                    success: false,
                    error: `Skill '${skillId}' not unlocked`
                };
            }

            // Get evolution data
            const evolutionPath = this._getEvolutionPath(skillId, targetSkillId);
            if (!evolutionPath) {
                return {
                    success: false,
                    error: `Evolution path from '${skillId}' to '${targetSkillId}' not found`
                };
            }

            // Validate evolution requirements
            const requirementCheck = this._validateEvolutionRequirements(skillId, evolutionPath);
            if (!requirementCheck.valid) {
                return {
                    success: false,
                    error: requirementCheck.reason
                };
            }

            // Perform evolution
            const result = await this._performSkillEvolution(skillId, targetSkillId, evolutionPath, context);

            if (result.success) {
                this._markStateChanged();

                // Emit evolution event
                this.eventManager.emit('skillSystem:skillEvolved', {
                    originalSkillId: skillId,
                    newSkillId: targetSkillId,
                    evolution: result.evolution,
                    context
                });
            }

            return result;

        } catch (error) {
            console.error('SkillManager: Evolution failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available evolution paths for a skill
     * @param {string} skillId - ID of the skill
     * @returns {Array} Available evolution paths
     */
    getAvailableEvolutions(skillId) {
        if (!this._isSkillUnlocked(skillId) || !window.SkillData?.SKILL_EVOLUTIONS) {
            return [];
        }

        const evolutions = window.SkillData.SKILL_EVOLUTIONS[skillId] || [];
        const availableEvolutions = [];

        for (const evolution of evolutions) {
            const isAvailable = this._checkEvolutionAvailability(skillId, evolution);
            availableEvolutions.push({
                ...evolution,
                isAvailable,
                requirementsMet: this._validateEvolutionRequirements(skillId, evolution).valid
            });
        }

        return availableEvolutions;
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
        return this._isReady;
    }

    /**
     * Shutdown the skill manager
     */
    async shutdown() {
        try {
            this._isReady = false;

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
     * Load skill definitions from skill data file
     */
    async _loadSkillDefinitions() {
        try {
            // Check if SkillData is available
            if (typeof window.SkillData === 'undefined') {
                throw new Error('SkillData not loaded - make sure skill-data.js is included');
            }

            // Load skill definitions from SkillData
            const { SKILL_DEFINITIONS, SKILL_CATEGORIES, SKILL_RARITIES, SKILL_SYNERGIES } = window.SkillData;

            // Clear existing data
            this.skillDefinitions.clear();
            this.skillCategories.clear();

            // Load skill definitions
            for (const [skillId, skillDef] of Object.entries(SKILL_DEFINITIONS)) {
                this.skillDefinitions.set(skillId, skillDef);
            }

            // Load categories
            for (const [categoryId, category] of Object.entries(SKILL_CATEGORIES)) {
                this.skillCategories.set(categoryId, category);
            }

            // Store additional data references
            this.skillRarities = SKILL_RARITIES;
            this.skillSynergies = SKILL_SYNERGIES;

            console.log(`SkillManager: Loaded ${this.skillDefinitions.size} skill definitions`);

        } catch (error) {
            console.error('SkillManager: Failed to load skill definitions:', error);

            // Fallback to basic definitions for development
            this._loadFallbackDefinitions();
        }
    }

    /**
     * Load fallback skill definitions for development
     */
    _loadFallbackDefinitions() {
        console.warn('SkillManager: Using fallback skill definitions');

        this.skillDefinitions.set('qi_flow_enhancement', {
            id: 'qi_flow_enhancement',
            name: 'Qi Flow Enhancement',
            category: 'cultivation',
            rarity: 'common',
            maxLevel: 5,
            icon: '💨',
            description: 'Improves the natural flow of qi through your meridians',
            effects: {
                cultivation: {
                    qiSpeedMultiplier: { base: 0.08, perLevel: 0.04 }
                }
            },
            costs: {
                fragments: { base: 10, perLevel: 2 },
                skillPoints: { base: 1, perLevel: 1 }
            },
            tags: ['passive', 'qi', 'speed']
        });

        this.skillDefinitions.set('basic_strike', {
            id: 'basic_strike',
            name: 'Basic Strike',
            category: 'combat',
            rarity: 'common',
            maxLevel: 5,
            icon: '👊',
            description: 'Fundamental combat technique that improves attack power',
            effects: {
                combat: {
                    flatDamage: { base: 5, perLevel: 3 },
                    attackSpeed: { base: 0.02, perLevel: 0.01 }
                }
            },
            costs: {
                fragments: { base: 10, perLevel: 2 },
                skillPoints: { base: 1, perLevel: 1 }
            },
            tags: ['active', 'damage', 'basic']
        });

        // Set basic categories
        this.skillCategories.set('cultivation', {
            id: 'cultivation',
            name: 'Cultivation Arts',
            icon: '⚡',
            description: 'Skills that enhance cultivation speed and efficiency'
        });

        this.skillCategories.set('combat', {
            id: 'combat',
            name: 'Combat Techniques',
            icon: '⚔️',
            description: 'Skills that improve combat power and abilities'
        });
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

    // Evolution system methods

    /**
     * Get evolution path between two skills
     * @param {string} sourceSkillId - Source skill ID
     * @param {string} targetSkillId - Target skill ID
     * @returns {Object|null} Evolution path data
     */
    _getEvolutionPath(sourceSkillId, targetSkillId) {
        if (!window.SkillData?.SKILL_EVOLUTIONS) {
            return null;
        }

        const evolutions = window.SkillData.SKILL_EVOLUTIONS[sourceSkillId] || [];
        return evolutions.find(evolution => evolution.target === targetSkillId) || null;
    }

    /**
     * Validate evolution requirements
     * @param {string} skillId - Source skill ID
     * @param {Object} evolutionPath - Evolution path data
     * @returns {Object} Validation result
     */
    _validateEvolutionRequirements(skillId, evolutionPath) {
        const requirements = evolutionPath.requirements || {};

        // Check skill level requirement
        if (requirements.level) {
            const currentLevel = this._getSkillLevel(skillId);
            if (currentLevel < requirements.level) {
                return {
                    valid: false,
                    reason: `Skill must be level ${requirements.level} (currently ${currentLevel})`
                };
            }
        }

        // Check cultivation realm requirement
        if (requirements.realm) {
            const cultivationSystem = this._getCultivationSystem();
            if (cultivationSystem) {
                const currentRealm = cultivationSystem.getCurrentRealm();
                if (!this._checkRealmRequirement(currentRealm, requirements.realm)) {
                    return {
                        valid: false,
                        reason: `Requires ${requirements.realm} cultivation realm`
                    };
                }
            }
        }

        // Check prerequisite skills
        if (requirements.skills) {
            for (const requiredSkillId of requirements.skills) {
                if (!this._isSkillUnlocked(requiredSkillId)) {
                    const skillDef = this.skillDefinitions.get(requiredSkillId);
                    const skillName = skillDef ? skillDef.name : requiredSkillId;
                    return {
                        valid: false,
                        reason: `Requires skill: ${skillName}`
                    };
                }
            }
        }

        // Check attribute requirements
        if (requirements.attributes) {
            const cultivationSystem = this._getCultivationSystem();
            if (cultivationSystem) {
                for (const [attribute, requiredValue] of Object.entries(requirements.attributes)) {
                    const currentValue = cultivationSystem.getAttributeValue(attribute);
                    if (currentValue < requiredValue) {
                        return {
                            valid: false,
                            reason: `Requires ${attribute}: ${requiredValue} (currently ${currentValue})`
                        };
                    }
                }
            }
        }

        // Check condition requirements (e.g., achievements, combat victories)
        if (requirements.conditions) {
            for (const condition of requirements.conditions) {
                if (!this._checkConditionRequirement(condition)) {
                    return {
                        valid: false,
                        reason: `Requires: ${this._formatConditionRequirement(condition)}`
                    };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Check if evolution is available (target skill not already unlocked)
     * @param {string} skillId - Source skill ID
     * @param {Object} evolution - Evolution data
     * @returns {boolean} Whether evolution is available
     */
    _checkEvolutionAvailability(skillId, evolution) {
        // Can't evolve if target skill is already unlocked
        return !this._isSkillUnlocked(evolution.target);
    }

    /**
     * Perform skill evolution
     * @param {string} sourceSkillId - Source skill ID
     * @param {string} targetSkillId - Target skill ID
     * @param {Object} evolutionPath - Evolution path data
     * @param {Object} context - Evolution context
     * @returns {Object} Evolution result
     */
    async _performSkillEvolution(sourceSkillId, targetSkillId, evolutionPath, context) {
        try {
            const skillsState = this.gameState.get('skills');
            const sourceLevel = skillsState.levels[sourceSkillId] || 0;

            // Transfer level (may be reduced or preserved based on evolution)
            const targetLevel = this._calculateEvolutionLevel(sourceLevel, evolutionPath);

            // Remove source skill (evolution consumes it)
            skillsState.unlocked[sourceSkillId] = false;
            delete skillsState.levels[sourceSkillId];

            // Remove from loadout if present
            const loadoutIndex = this.currentLoadout.indexOf(sourceSkillId);
            if (loadoutIndex !== -1) {
                this.currentLoadout.splice(loadoutIndex, 1);
                this._saveCurrentLoadout();
            }

            // Add target skill
            skillsState.unlocked[targetSkillId] = true;
            skillsState.levels[targetSkillId] = targetLevel;

            // Record evolution in game state
            if (!skillsState.evolutions) {
                skillsState.evolutions = {};
            }
            skillsState.evolutions[targetSkillId] = {
                from: sourceSkillId,
                timestamp: Date.now(),
                transferredLevel: targetLevel
            };

            // Save state
            this.gameState.set('skills', skillsState);

            return {
                success: true,
                evolution: {
                    sourceSkillId,
                    targetSkillId,
                    sourceLevel,
                    targetLevel,
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            console.error('SkillManager: Evolution performance failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate target skill level after evolution
     * @param {number} sourceLevel - Source skill level
     * @param {Object} evolutionPath - Evolution path data
     * @returns {number} Target skill level
     */
    _calculateEvolutionLevel(sourceLevel, evolutionPath) {
        // Default: preserve level
        let targetLevel = sourceLevel;

        // Apply level transfer rules if specified
        if (evolutionPath.levelTransfer) {
            const transfer = evolutionPath.levelTransfer;

            if (typeof transfer === 'number') {
                // Fixed level
                targetLevel = transfer;
            } else if (typeof transfer === 'object') {
                if (transfer.multiplier) {
                    // Level multiplier
                    targetLevel = Math.floor(sourceLevel * transfer.multiplier);
                } else if (transfer.preserve) {
                    // Preserve level
                    targetLevel = sourceLevel;
                } else if (transfer.reset) {
                    // Reset to level 1
                    targetLevel = 1;
                }
            }
        }

        return Math.max(1, targetLevel);
    }

    /**
     * Get cultivation system reference
     * @returns {Object|null} Cultivation system instance
     */
    _getCultivationSystem() {
        // Try to get cultivation system from global scope
        if (typeof window.game !== 'undefined' && window.game.moduleManager) {
            const cultivationModule = window.game.moduleManager.getModule('cultivation');
            return cultivationModule?.cultivationIntegration;
        }
        return null;
    }

    /**
     * Check realm requirement
     * @param {string} currentRealm - Current cultivation realm
     * @param {string} requiredRealm - Required cultivation realm
     * @returns {boolean} Whether requirement is met
     */
    _checkRealmRequirement(currentRealm, requiredRealm) {
        // Simplified realm comparison - would be more sophisticated in practice
        const realmOrder = [
            'body_refinement',
            'foundation',
            'core_formation',
            'nascent_soul',
            'soul_transformation',
            'void_refinement'
        ];

        const currentIndex = realmOrder.indexOf(currentRealm);
        const requiredIndex = realmOrder.indexOf(requiredRealm);

        return currentIndex >= requiredIndex;
    }

    /**
     * Check condition requirement (achievements, etc.)
     * @param {string} condition - Condition string
     * @returns {boolean} Whether condition is met
     */
    _checkConditionRequirement(condition) {
        // Placeholder implementation - would check various game conditions
        // Examples: 'win_10_combats', 'complete_100_meditations', etc.

        if (condition.startsWith('win_') && condition.endsWith('_combats')) {
            const requiredWins = parseInt(condition.match(/\d+/)[0]);
            // Check combat system for wins
            return false; // Placeholder
        }

        if (condition.startsWith('complete_') && condition.endsWith('_meditations')) {
            const requiredMeditations = parseInt(condition.match(/\d+/)[0]);
            // Check meditation count
            return false; // Placeholder
        }

        return false;
    }

    /**
     * Format condition requirement for display
     * @param {string} condition - Condition string
     * @returns {string} Formatted condition text
     */
    _formatConditionRequirement(condition) {
        if (condition.startsWith('win_') && condition.endsWith('_combats')) {
            const requiredWins = parseInt(condition.match(/\d+/)[0]);
            return `Win ${requiredWins} combat matches`;
        }

        if (condition.startsWith('complete_') && condition.endsWith('_meditations')) {
            const requiredMeditations = parseInt(condition.match(/\d+/)[0]);
            return `Complete ${requiredMeditations} meditation sessions`;
        }

        return condition.replace(/_/g, ' ');
    }
}

// Export for module system
if (typeof window !== 'undefined') {
    window.SkillManager = SkillManager;
}