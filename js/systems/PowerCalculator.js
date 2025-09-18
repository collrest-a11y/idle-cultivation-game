/**
 * PowerCalculator - Combat power evaluation system
 * Calculates total combat strength based on cultivation, scriptures, equipment, and modifiers
 */
class PowerCalculator {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Power calculation cache to improve performance
        this.powerCache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_DURATION = 5000; // 5 seconds cache

        // Power breakdown tracking for debugging and display
        this.lastCalculation = {
            total: 0,
            base: 0,
            scripture: 0,
            equipment: 0,
            modifiers: 0,
            timestamp: 0
        };

        console.log('PowerCalculator: Initialized');
    }

    /**
     * Calculate the total combat power for a player or entity
     * @param {Object} entity - Entity data (player state or opponent)
     * @param {Object} options - Calculation options
     * @returns {number} Total combat power
     */
    calculateTotalPower(entity, options = {}) {
        const config = {
            useCache: true,
            includeTemporaryEffects: true,
            breakdown: false,
            ...options
        };

        // Generate cache key
        const cacheKey = this._generateCacheKey(entity, config);

        // Check cache if enabled
        if (config.useCache && this._isCacheValid(cacheKey)) {
            const cached = this.powerCache.get(cacheKey);
            if (config.breakdown) {
                return cached;
            }
            return cached.total;
        }

        // Calculate power components
        const calculation = this._performPowerCalculation(entity, config);

        // Cache the result
        if (config.useCache) {
            this.powerCache.set(cacheKey, calculation);
            this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
        }

        // Store last calculation for debugging
        this.lastCalculation = {
            ...calculation,
            timestamp: Date.now()
        };

        // Return appropriate result
        if (config.breakdown) {
            return calculation;
        }
        return calculation.total;
    }

    /**
     * Calculate power for the current player
     * @param {Object} options - Calculation options
     * @returns {number|Object} Total power or breakdown if requested
     */
    calculatePlayerPower(options = {}) {
        const playerData = this._getPlayerData();
        return this.calculateTotalPower(playerData, options);
    }

    /**
     * Compare two entities' power levels
     * @param {Object} entity1 - First entity
     * @param {Object} entity2 - Second entity
     * @returns {Object} Comparison result
     */
    comparePower(entity1, entity2) {
        const power1 = this.calculateTotalPower(entity1);
        const power2 = this.calculateTotalPower(entity2);

        const difference = power1 - power2;
        const ratio = power2 > 0 ? power1 / power2 : Infinity;

        return {
            entity1Power: power1,
            entity2Power: power2,
            difference: difference,
            ratio: ratio,
            advantage: difference > 0 ? 'entity1' : difference < 0 ? 'entity2' : 'equal',
            significantDifference: Math.abs(difference) > Math.max(power1, power2) * 0.2 // 20% difference
        };
    }

    /**
     * Calculate combat stats (health, qi, initiative) for an entity
     * @param {Object} entity - Entity data
     * @param {Object} options - Calculation options
     * @returns {Object} Combat stats
     */
    calculateCombatStats(entity, options = {}) {
        const config = {
            includeModifiers: true,
            ...options
        };

        const cultivation = entity.cultivation || {};
        const qiLevel = cultivation.qi?.level || 0;
        const bodyLevel = cultivation.body?.level || 0;
        const realm = cultivation.realm || 'Body Refinement';
        const stage = cultivation.stage || 1;

        let modifiers = {};
        if (config.includeModifiers) {
            modifiers = this._calculateModifiers(entity);
        }

        // Use combat formulas
        const maxHealth = window.COMBAT_FORMULAS.maxHealth(bodyLevel, realm, stage, modifiers);
        const maxQi = window.COMBAT_FORMULAS.maxQi(qiLevel, realm, stage, modifiers);
        const initiative = window.COMBAT_FORMULAS.initiative(qiLevel, bodyLevel, realm, stage, modifiers);

        return {
            maxHealth: maxHealth,
            currentHealth: entity.currentHealth || maxHealth,
            maxQi: maxQi,
            currentQi: entity.currentQi || maxQi,
            initiative: initiative,
            modifiers: modifiers
        };
    }

    /**
     * Get power tier classification
     * @param {number} power - Power value
     * @returns {Object} Power tier information
     */
    getPowerTier(power) {
        const tiers = [
            { name: 'Mortal', min: 0, max: 499, color: '#8B4513' },
            { name: 'Cultivator', min: 500, max: 1999, color: '#4682B4' },
            { name: 'Expert', min: 2000, max: 4999, color: '#32CD32' },
            { name: 'Master', min: 5000, max: 9999, color: '#FFD700' },
            { name: 'Grandmaster', min: 10000, max: 24999, color: '#FF6347' },
            { name: 'Legend', min: 25000, max: 49999, color: '#8A2BE2' },
            { name: 'Mythic', min: 50000, max: 99999, color: '#FF1493' },
            { name: 'Transcendent', min: 100000, max: Infinity, color: '#FF0000' }
        ];

        for (const tier of tiers) {
            if (power >= tier.min && power <= tier.max) {
                return {
                    ...tier,
                    progress: tier.max === Infinity ? 1.0 : (power - tier.min) / (tier.max - tier.min)
                };
            }
        }

        // Fallback to first tier
        return { ...tiers[0], progress: 0 };
    }

    /**
     * Calculate power scaling for matchmaking
     * @param {number} basePower - Base power level
     * @param {number} variance - Allowed variance (0.0 to 1.0)
     * @returns {Object} Power range for matchmaking
     */
    calculateMatchmakingRange(basePower, variance = 0.2) {
        const minPower = Math.floor(basePower * (1 - variance));
        const maxPower = Math.floor(basePower * (1 + variance));

        return {
            min: minPower,
            max: maxPower,
            optimal: basePower,
            variance: variance
        };
    }

    /**
     * Clear the power calculation cache
     */
    clearCache() {
        this.powerCache.clear();
        this.cacheExpiry.clear();
        console.log('PowerCalculator: Cache cleared');
    }

    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;

        for (const [key, expiry] of this.cacheExpiry) {
            if (expiry > now) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this.powerCache.size,
            validEntries: validEntries,
            expiredEntries: expiredEntries,
            cacheDuration: this.CACHE_DURATION
        };
    }

    /**
     * Get the last power calculation breakdown
     * @returns {Object} Last calculation details
     */
    getLastCalculation() {
        return { ...this.lastCalculation };
    }

    // Private methods

    /**
     * Perform the actual power calculation
     * @param {Object} entity - Entity data
     * @param {Object} config - Calculation configuration
     * @returns {Object} Power calculation breakdown
     */
    _performPowerCalculation(entity, config) {
        const cultivation = entity.cultivation || {};
        const qiLevel = cultivation.qi?.level || 0;
        const bodyLevel = cultivation.body?.level || 0;
        const realm = cultivation.realm || 'Body Refinement';
        const stage = cultivation.stage || 1;

        // Calculate base power
        const basePower = window.COMBAT_FORMULAS.basePower(qiLevel, bodyLevel, realm, stage);

        // Calculate scripture power
        const scriptures = this._getEntityScriptures(entity);
        const scripturePower = window.COMBAT_FORMULAS.scripturePower(scriptures);

        // Calculate equipment power
        const equipment = entity.equipment || entity.loadout || {};
        const equipmentPower = window.COMBAT_FORMULAS.equipmentPower(equipment);

        // Calculate modifiers
        let modifierPower = 0;
        let modifiers = {};
        if (config.includeTemporaryEffects) {
            modifiers = this._calculateModifiers(entity);
            if (modifiers.flatBonus) {
                modifierPower += modifiers.flatBonus;
            }
        }

        // Calculate total
        let total = basePower + scripturePower + equipmentPower + modifierPower;

        // Apply percentage modifiers
        if (modifiers.powerMultiplier) {
            total *= modifiers.powerMultiplier;
        }

        total = Math.floor(total);

        return {
            total: total,
            base: basePower,
            scripture: scripturePower,
            equipment: equipmentPower,
            modifiers: modifierPower,
            multiplier: modifiers.powerMultiplier || 1.0,
            breakdown: {
                cultivation: { qi: qiLevel, body: bodyLevel, realm, stage },
                scriptures: scriptures,
                equipment: equipment,
                modifiers: modifiers
            }
        };
    }

    /**
     * Get current player data
     * @returns {Object} Player data for power calculation
     */
    _getPlayerData() {
        return {
            cultivation: this.gameState.get('cultivation'),
            realm: this.gameState.get('realm'),
            scriptures: this.gameState.get('scriptures'),
            equipment: this.gameState.get('loadout'),
            character: this.gameState.get('character'),
            temporaryEffects: this.gameState.get('temporaryEffects') || []
        };
    }

    /**
     * Get scriptures for an entity
     * @param {Object} entity - Entity data
     * @returns {Array} Equipped scriptures
     */
    _getEntityScriptures(entity) {
        const scriptures = [];

        if (entity.scriptures) {
            // Player format
            const equipped = entity.scriptures.equipped || {};
            const collection = entity.scriptures.collection || [];

            Object.values(equipped).forEach(scriptureId => {
                if (scriptureId) {
                    const scripture = collection.find(s => s.id === scriptureId);
                    if (scripture) {
                        scriptures.push(scripture);
                    }
                }
            });
        } else if (entity.equippedScriptures) {
            // Opponent format
            scriptures.push(...entity.equippedScriptures);
        }

        return scriptures;
    }

    /**
     * Calculate modifiers from various sources
     * @param {Object} entity - Entity data
     * @returns {Object} Combined modifiers
     */
    _calculateModifiers(entity) {
        const modifiers = {
            powerMultiplier: 1.0,
            flatBonus: 0,
            healthMultiplier: 1.0,
            qiMultiplier: 1.0,
            initiativeBonus: 0
        };

        // Character origin/vow/mark modifiers
        const character = entity.character || {};
        if (character.modifiers) {
            Object.keys(modifiers).forEach(key => {
                if (character.modifiers[key]) {
                    if (key.includes('Multiplier')) {
                        modifiers[key] *= character.modifiers[key];
                    } else {
                        modifiers[key] += character.modifiers[key];
                    }
                }
            });
        }

        // Temporary effects
        const temporaryEffects = entity.temporaryEffects || [];
        temporaryEffects.forEach(effect => {
            if (effect.active && effect.expiresAt > Date.now()) {
                Object.keys(modifiers).forEach(key => {
                    if (effect[key]) {
                        if (key.includes('Multiplier')) {
                            modifiers[key] *= effect[key];
                        } else {
                            modifiers[key] += effect[key];
                        }
                    }
                });
            }
        });

        // Scripture effects (if not already included in scripture power)
        const scriptures = this._getEntityScriptures(entity);
        scriptures.forEach(scripture => {
            if (scripture.combatEffects) {
                Object.keys(modifiers).forEach(key => {
                    if (scripture.combatEffects[key]) {
                        if (key.includes('Multiplier')) {
                            modifiers[key] *= scripture.combatEffects[key];
                        } else {
                            modifiers[key] += scripture.combatEffects[key];
                        }
                    }
                });
            }
        });

        return modifiers;
    }

    /**
     * Generate cache key for power calculation
     * @param {Object} entity - Entity data
     * @param {Object} config - Calculation config
     * @returns {string} Cache key
     */
    _generateCacheKey(entity, config) {
        const keyData = {
            cultivation: entity.cultivation,
            realm: entity.realm,
            scriptures: entity.scriptures?.equipped || entity.equippedScriptures,
            equipment: entity.equipment || entity.loadout,
            character: entity.character,
            temporaryEffects: config.includeTemporaryEffects ? entity.temporaryEffects : null,
            breakdown: config.breakdown
        };

        return JSON.stringify(keyData);
    }

    /**
     * Check if cache entry is still valid
     * @param {string} cacheKey - Cache key
     * @returns {boolean} Whether cache is valid
     */
    _isCacheValid(cacheKey) {
        const expiry = this.cacheExpiry.get(cacheKey);
        if (!expiry) {
            return false;
        }

        const isValid = Date.now() < expiry;
        if (!isValid) {
            // Clean up expired entry
            this.powerCache.delete(cacheKey);
            this.cacheExpiry.delete(cacheKey);
        }

        return isValid;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PowerCalculator };
} else if (typeof window !== 'undefined') {
    window.PowerCalculator = PowerCalculator;
}