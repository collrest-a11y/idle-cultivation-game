/**
 * TechniqueManager - Manages cultivation techniques and their effects
 * Handles technique unlocking, activation, resource consumption, and effect calculation
 */
class TechniqueManager {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Technique state
        this.techniqueState = {
            unlocked: new Set(),
            active: null,
            mastery: new Map(), // technique_id -> mastery_level
            effects: new Map(), // technique_id -> current_effects
            resources: {
                qi: 0,
                spiritStones: 0
            }
        };

        // Active technique tracking
        this.activeTechnique = {
            id: null,
            startTime: 0,
            duration: 0,
            resourceConsumption: 0,
            effects: {},
            mastery: 0
        };

        // Technique discovery and learning
        this.discoveryProgress = new Map();
        this.learningProgress = new Map();

        this.isInitialized = false;

        console.log('TechniqueManager: Initialized');
    }

    /**
     * Initialize the technique manager with game state
     */
    async initialize() {
        try {
            // Load technique state from game state
            const savedState = this.gameState.get('techniques');
            if (savedState) {
                this.techniqueState.unlocked = new Set(savedState.unlocked || []);
                this.techniqueState.active = savedState.active || null;
                this.techniqueState.mastery = new Map(savedState.mastery || []);
                this.techniqueState.effects = new Map(savedState.effects || []);
                this.techniqueState.resources = savedState.resources || {
                    qi: 0,
                    spiritStones: 0
                };
            }

            // Load discovery and learning progress
            const savedDiscovery = this.gameState.get('techniqueDiscovery');
            if (savedDiscovery) {
                this.discoveryProgress = new Map(savedDiscovery);
            }

            const savedLearning = this.gameState.get('techniqueLearning');
            if (savedLearning) {
                this.learningProgress = new Map(savedLearning);
            }

            // Unlock basic techniques for new players
            this._initializeBasicTechniques();

            // Set up event listeners
            this._setupEventListeners();

            // Restore active technique if any
            if (this.techniqueState.active) {
                this._restoreActiveTechnique();
            }

            this.isInitialized = true;

            this.eventManager.emit('techniques:initialized', {
                unlocked: Array.from(this.techniqueState.unlocked),
                active: this.techniqueState.active
            });

            console.log('TechniqueManager: Initialization complete');

        } catch (error) {
            console.error('TechniqueManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Check if a technique can be used
     * @param {string} techniqueId - Technique ID
     * @param {Object} cultivationState - Current cultivation state
     * @returns {Object} Validation result
     */
    canUseTechnique(techniqueId, cultivationState) {
        const technique = CULTIVATION_TECHNIQUES[techniqueId];
        if (!technique) {
            return { valid: false, reason: 'technique_not_found' };
        }

        // Check if technique is unlocked
        if (!this.techniqueState.unlocked.has(techniqueId)) {
            return { valid: false, reason: 'technique_not_unlocked' };
        }

        // Check if another technique is already active
        if (this.techniqueState.active && this.techniqueState.active !== techniqueId) {
            return { valid: false, reason: 'another_technique_active' };
        }

        // Check realm requirements
        if (technique.unlockRequirements.realm) {
            const currentRealm = this.gameState.get('realm.currentRealm');
            const realmOrder = Object.keys(CULTIVATION_REALMS);
            const currentIndex = realmOrder.indexOf(currentRealm);
            const requiredIndex = realmOrder.indexOf(technique.unlockRequirements.realm);

            if (currentIndex < requiredIndex) {
                return { valid: false, reason: 'realm_requirement_not_met' };
            }
        }

        // Check cultivation level requirements
        if (technique.unlockRequirements.qi?.level) {
            if (cultivationState.qi.level < technique.unlockRequirements.qi.level) {
                return { valid: false, reason: 'qi_level_requirement_not_met' };
            }
        }

        if (technique.unlockRequirements.body?.level) {
            if (cultivationState.body.level < technique.unlockRequirements.body.level) {
                return { valid: false, reason: 'body_level_requirement_not_met' };
            }
        }

        // Check resource requirements
        const currentQi = this.gameState.get('player.qi') || 0;
        const currentStones = this.gameState.get('player.spiritStones') || 0;

        const qiCost = this._calculateQiCost(technique);
        const stoneCost = technique.resourceCost.spiritStones || 0;

        if (currentQi < qiCost) {
            return { valid: false, reason: 'insufficient_qi' };
        }

        if (currentStones < stoneCost) {
            return { valid: false, reason: 'insufficient_spirit_stones' };
        }

        return { valid: true };
    }

    /**
     * Activate a cultivation technique
     * @param {string} techniqueId - Technique ID
     * @returns {boolean} Success status
     */
    activateTechnique(techniqueId) {
        const technique = CULTIVATION_TECHNIQUES[techniqueId];
        if (!technique) {
            throw new Error(`Technique not found: ${techniqueId}`);
        }

        const cultivationState = this.gameState.get('cultivation');
        const canUse = this.canUseTechnique(techniqueId, cultivationState);

        if (!canUse.valid) {
            throw new Error(`Cannot activate technique: ${canUse.reason}`);
        }

        // Deactivate current technique if any
        if (this.techniqueState.active) {
            this.deactivateTechnique(this.techniqueState.active);
        }

        // Set up active technique
        this.activeTechnique = {
            id: techniqueId,
            startTime: Date.now(),
            duration: 0,
            resourceConsumption: 0,
            effects: this._calculateTechniqueEffects(technique),
            mastery: this.techniqueState.mastery.get(techniqueId) || 0
        };

        this.techniqueState.active = techniqueId;

        // Consume initial resources
        this._consumeTechniqueResources(technique);

        this.eventManager.emit('technique:activated', {
            technique: techniqueId,
            effects: this.activeTechnique.effects,
            mastery: this.activeTechnique.mastery
        });

        console.log(`TechniqueManager: Activated technique: ${techniqueId}`);
        return true;
    }

    /**
     * Deactivate current technique
     * @param {string} techniqueId - Technique ID (optional, for validation)
     */
    deactivateTechnique(techniqueId = null) {
        if (!this.techniqueState.active) {
            return;
        }

        if (techniqueId && this.techniqueState.active !== techniqueId) {
            console.warn(`TechniqueManager: Attempted to deactivate ${techniqueId} but ${this.techniqueState.active} is active`);
            return;
        }

        const deactivatedTechnique = this.techniqueState.active;

        // Update mastery based on usage duration
        this._updateTechniqueMastery(deactivatedTechnique, this.activeTechnique.duration);

        // Clear active technique
        this.techniqueState.active = null;
        this.activeTechnique = {
            id: null,
            startTime: 0,
            duration: 0,
            resourceConsumption: 0,
            effects: {},
            mastery: 0
        };

        this.eventManager.emit('technique:deactivated', {
            technique: deactivatedTechnique
        });

        console.log(`TechniqueManager: Deactivated technique: ${deactivatedTechnique}`);
    }

    /**
     * Get current active technique multipliers
     * @returns {Object} Multipliers for qi, body, and dual cultivation
     */
    getActiveMultipliers() {
        if (!this.techniqueState.active) {
            return { qi: 1.0, body: 1.0, dual: 1.0 };
        }

        const technique = CULTIVATION_TECHNIQUES[this.techniqueState.active];
        if (!technique) {
            return { qi: 1.0, body: 1.0, dual: 1.0 };
        }

        const effects = this.activeTechnique.effects;
        const masteryBonus = this._getMasteryBonus(this.activeTechnique.mastery);

        return {
            qi: (effects.qiMultiplier || 1.0) * masteryBonus,
            body: (effects.bodyMultiplier || 1.0) * masteryBonus,
            dual: (effects.dualCultivationBonus || 0.0) + 1.0
        };
    }

    /**
     * Update technique system (called by game loop)
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.techniqueState.active) {
            return;
        }

        const deltaSeconds = deltaTime / 1000;
        this.activeTechnique.duration += deltaSeconds;

        // Consume resources over time
        const technique = CULTIVATION_TECHNIQUES[this.techniqueState.active];
        if (technique) {
            const resourceCost = this._calculateContinuousResourceCost(technique, deltaSeconds);

            if (!this._canAffordContinuousResources(resourceCost)) {
                // Auto-deactivate technique if resources run out
                this.deactivateTechnique();

                this.eventManager.emit('technique:auto_deactivated', {
                    technique: this.techniqueState.active,
                    reason: 'insufficient_resources'
                });

                return;
            }

            this._consumeContinuousResources(resourceCost);
            this.activeTechnique.resourceConsumption += resourceCost.total;
        }

        // Update mastery progress
        this._updateMasteryProgress(deltaSeconds);

        // Check for technique discoveries
        this._checkTechniqueDiscoveries();
    }

    /**
     * Get list of unlocked techniques
     * @returns {Array} Array of unlocked technique IDs
     */
    getUnlockedTechniques() {
        return Array.from(this.techniqueState.unlocked);
    }

    /**
     * Get technique information including unlock status
     * @param {string} techniqueId - Technique ID
     * @returns {Object} Technique information
     */
    getTechniqueInfo(techniqueId) {
        const technique = CULTIVATION_TECHNIQUES[techniqueId];
        if (!technique) {
            return null;
        }

        const mastery = this.techniqueState.mastery.get(techniqueId) || 0;
        const isUnlocked = this.techniqueState.unlocked.has(techniqueId);
        const isActive = this.techniqueState.active === techniqueId;

        return {
            ...technique,
            isUnlocked: isUnlocked,
            isActive: isActive,
            mastery: mastery,
            masteryLevel: this._getMasteryLevel(mastery),
            masteryBonus: this._getMasteryBonus(mastery),
            canActivate: isUnlocked && this.canUseTechnique(techniqueId, this.gameState.get('cultivation')).valid
        };
    }

    /**
     * Get all technique mastery levels
     * @returns {Object} Map of technique ID to mastery info
     */
    getTechniqueMastery() {
        const mastery = {};

        for (const [techniqueId, masteryValue] of this.techniqueState.mastery) {
            mastery[techniqueId] = {
                mastery: masteryValue,
                level: this._getMasteryLevel(masteryValue),
                bonus: this._getMasteryBonus(masteryValue),
                progress: this._getMasteryProgress(masteryValue)
            };
        }

        return mastery;
    }

    /**
     * Unlock a technique
     * @param {string} techniqueId - Technique ID
     * @param {string} source - How the technique was unlocked
     * @returns {boolean} Success status
     */
    unlockTechnique(techniqueId, source = 'manual') {
        const technique = CULTIVATION_TECHNIQUES[techniqueId];
        if (!technique) {
            console.warn(`TechniqueManager: Attempted to unlock unknown technique: ${techniqueId}`);
            return false;
        }

        if (this.techniqueState.unlocked.has(techniqueId)) {
            return true; // Already unlocked
        }

        // Check unlock requirements
        const cultivationState = this.gameState.get('cultivation');
        const canUnlock = this._checkUnlockRequirements(technique, cultivationState);

        if (!canUnlock.valid && source !== 'cheat') {
            console.warn(`TechniqueManager: Cannot unlock ${techniqueId}: ${canUnlock.reason}`);
            return false;
        }

        this.techniqueState.unlocked.add(techniqueId);
        this.techniqueState.mastery.set(techniqueId, 0);

        this.eventManager.emit('technique:unlocked', {
            technique: techniqueId,
            source: source,
            timestamp: Date.now()
        });

        console.log(`TechniqueManager: Unlocked technique: ${techniqueId} (${source})`);
        return true;
    }

    /**
     * Save technique state to game state
     */
    saveState() {
        this.gameState.update({
            techniques: {
                unlocked: Array.from(this.techniqueState.unlocked),
                active: this.techniqueState.active,
                mastery: Array.from(this.techniqueState.mastery),
                effects: Array.from(this.techniqueState.effects),
                resources: this.techniqueState.resources
            },
            techniqueDiscovery: Array.from(this.discoveryProgress),
            techniqueLearning: Array.from(this.learningProgress)
        }, { source: 'techniques:save' });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save state on significant events
        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });

        // Unlock techniques based on achievements
        this.eventManager.on('achievement:unlocked', (data) => {
            if (data.achievement.reward?.technique) {
                this.unlockTechnique(data.achievement.reward.technique, 'achievement');
            }
        });

        // Check for technique unlocks on cultivation progress
        this.eventManager.on('cultivation:level_up', () => {
            this._checkTechniqueUnlocks();
        });

        this.eventManager.on('realm:advancement', () => {
            this._checkTechniqueUnlocks();
        });
    }

    /**
     * Initialize basic techniques for new players
     */
    _initializeBasicTechniques() {
        // Unlock basic technique if no techniques are unlocked
        if (this.techniqueState.unlocked.size === 0) {
            this.unlockTechnique('heaven_earth_mantra', 'initial');
        }
    }

    /**
     * Restore active technique state after loading
     */
    _restoreActiveTechnique() {
        const techniqueId = this.techniqueState.active;
        if (!techniqueId) return;

        const technique = CULTIVATION_TECHNIQUES[techniqueId];
        if (!technique) {
            this.techniqueState.active = null;
            return;
        }

        this.activeTechnique = {
            id: techniqueId,
            startTime: Date.now(),
            duration: 0,
            resourceConsumption: 0,
            effects: this._calculateTechniqueEffects(technique),
            mastery: this.techniqueState.mastery.get(techniqueId) || 0
        };
    }

    /**
     * Calculate technique effects based on mastery
     * @param {Object} technique - Technique data
     * @returns {Object} Calculated effects
     */
    _calculateTechniqueEffects(technique) {
        const baseEffects = technique.effects;
        const mastery = this.techniqueState.mastery.get(technique.id) || 0;
        const masteryBonus = this._getMasteryBonus(mastery);

        const effects = {};
        Object.keys(baseEffects).forEach(key => {
            if (key.includes('Multiplier') || key.includes('Bonus')) {
                effects[key] = baseEffects[key] * masteryBonus;
            } else {
                effects[key] = baseEffects[key];
            }
        });

        return effects;
    }

    /**
     * Calculate qi cost for technique activation
     * @param {Object} technique - Technique data
     * @returns {number} Qi cost
     */
    _calculateQiCost(technique) {
        const baseCost = technique.resourceCost.qi || 1.0;
        const currentRealm = this.gameState.get('realm.currentRealm');
        const realmData = CULTIVATION_REALMS[currentRealm];

        // Higher realms reduce technique qi cost
        const realmReduction = realmData ? 1 / Math.log(2 + realmData.benefits.qiCapacityMultiplier) : 1.0;

        return Math.max(1, Math.floor(baseCost * realmReduction));
    }

    /**
     * Calculate continuous resource cost
     * @param {Object} technique - Technique data
     * @param {number} deltaSeconds - Time elapsed
     * @returns {Object} Resource cost
     */
    _calculateContinuousResourceCost(technique, deltaSeconds) {
        const qiPerSecond = this._calculateQiCost(technique) * 0.1; // 10% of activation cost per second
        const stonesPerSecond = (technique.resourceCost.spiritStones || 0) * 0.01; // 1% per second

        return {
            qi: qiPerSecond * deltaSeconds,
            spiritStones: stonesPerSecond * deltaSeconds,
            total: (qiPerSecond + stonesPerSecond) * deltaSeconds
        };
    }

    /**
     * Check if can afford continuous resource cost
     * @param {Object} cost - Resource cost
     * @returns {boolean} Can afford status
     */
    _canAffordContinuousResources(cost) {
        const currentQi = this.gameState.get('player.qi') || 0;
        const currentStones = this.gameState.get('player.spiritStones') || 0;

        return currentQi >= cost.qi && currentStones >= cost.spiritStones;
    }

    /**
     * Consume technique activation resources
     * @param {Object} technique - Technique data
     */
    _consumeTechniqueResources(technique) {
        const qiCost = this._calculateQiCost(technique);
        const stoneCost = technique.resourceCost.spiritStones || 0;

        this.gameState.increment('player.qi', -qiCost, { source: 'technique:activation' });
        this.gameState.increment('player.spiritStones', -stoneCost, { source: 'technique:activation' });
    }

    /**
     * Consume continuous resources
     * @param {Object} cost - Resource cost
     */
    _consumeContinuousResources(cost) {
        if (cost.qi > 0) {
            this.gameState.increment('player.qi', -cost.qi, { source: 'technique:continuous' });
        }
        if (cost.spiritStones > 0) {
            this.gameState.increment('player.spiritStones', -cost.spiritStones, { source: 'technique:continuous' });
        }
    }

    /**
     * Update technique mastery
     * @param {string} techniqueId - Technique ID
     * @param {number} duration - Usage duration
     */
    _updateTechniqueMastery(techniqueId, duration) {
        const currentMastery = this.techniqueState.mastery.get(techniqueId) || 0;
        const masteryGain = duration * 0.1; // 0.1 mastery per second of use

        this.techniqueState.mastery.set(techniqueId, currentMastery + masteryGain);
    }

    /**
     * Update mastery progress during active technique use
     * @param {number} deltaSeconds - Time elapsed
     */
    _updateMasteryProgress(deltaSeconds) {
        if (!this.techniqueState.active) return;

        const currentMastery = this.techniqueState.mastery.get(this.techniqueState.active) || 0;
        const masteryGain = deltaSeconds * 0.1;

        this.techniqueState.mastery.set(this.techniqueState.active, currentMastery + masteryGain);
        this.activeTechnique.mastery = currentMastery + masteryGain;
    }

    /**
     * Get mastery level from mastery value
     * @param {number} mastery - Mastery value
     * @returns {number} Mastery level (1-10)
     */
    _getMasteryLevel(mastery) {
        return Math.min(10, Math.floor(mastery / 100) + 1);
    }

    /**
     * Get mastery bonus multiplier
     * @param {number} mastery - Mastery value
     * @returns {number} Bonus multiplier
     */
    _getMasteryBonus(mastery) {
        const level = this._getMasteryLevel(mastery);
        return 1.0 + (level - 1) * 0.1; // 10% bonus per mastery level
    }

    /**
     * Get mastery progress within current level
     * @param {number} mastery - Mastery value
     * @returns {number} Progress (0-1)
     */
    _getMasteryProgress(mastery) {
        const level = this._getMasteryLevel(mastery);
        const levelBase = (level - 1) * 100;
        const nextLevelBase = level * 100;

        return (mastery - levelBase) / (nextLevelBase - levelBase);
    }

    /**
     * Check unlock requirements for a technique
     * @param {Object} technique - Technique data
     * @param {Object} cultivationState - Current cultivation state
     * @returns {Object} Check result
     */
    _checkUnlockRequirements(technique, cultivationState) {
        const requirements = technique.unlockRequirements;

        // Check realm requirement
        if (requirements.realm) {
            const currentRealm = this.gameState.get('realm.currentRealm');
            const realmOrder = Object.keys(CULTIVATION_REALMS);
            const currentIndex = realmOrder.indexOf(currentRealm);
            const requiredIndex = realmOrder.indexOf(requirements.realm);

            if (currentIndex < requiredIndex) {
                return { valid: false, reason: 'realm_requirement' };
            }
        }

        // Check cultivation level requirements
        if (requirements.qi?.level && cultivationState.qi.level < requirements.qi.level) {
            return { valid: false, reason: 'qi_level_requirement' };
        }

        if (requirements.body?.level && cultivationState.body.level < requirements.body.level) {
            return { valid: false, reason: 'body_level_requirement' };
        }

        return { valid: true };
    }

    /**
     * Check for new technique unlocks
     */
    _checkTechniqueUnlocks() {
        const cultivationState = this.gameState.get('cultivation');
        if (!cultivationState) return;

        Object.values(CULTIVATION_TECHNIQUES).forEach(technique => {
            if (this.techniqueState.unlocked.has(technique.id)) return;

            const canUnlock = this._checkUnlockRequirements(technique, cultivationState);
            if (canUnlock.valid) {
                this.unlockTechnique(technique.id, 'progression');
            }
        });
    }

    /**
     * Check for technique discoveries (finding new techniques)
     */
    _checkTechniqueDiscoveries() {
        // Implement technique discovery mechanics
        // Could be based on cultivation level, exploration, or random events
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TechniqueManager };
} else if (typeof window !== 'undefined') {
    window.TechniqueManager = TechniqueManager;
}