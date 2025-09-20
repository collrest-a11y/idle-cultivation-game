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
            progression: 0,
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

        // Calculate CP progression systems power
        const progressionPower = this._calculateProgressionPower(entity);

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
        let total = basePower + scripturePower + equipmentPower + progressionPower + modifierPower;

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
            progression: progressionPower,
            modifiers: modifierPower,
            multiplier: modifiers.powerMultiplier || 1.0,
            breakdown: {
                cultivation: { qi: qiLevel, body: bodyLevel, realm, stage },
                scriptures: scriptures,
                equipment: equipment,
                progression: this._getProgressionBreakdown(entity),
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
            temporaryEffects: this.gameState.get('temporaryEffects') || [],
            // CP Progression Systems
            mounts: this.gameState.get('mounts'),
            wings: this.gameState.get('wings'),
            accessories: this.gameState.get('accessories'),
            runes: this.gameState.get('runes'),
            meridians: this.gameState.get('meridians'),
            dantian: this.gameState.get('dantian'),
            soul: this.gameState.get('soul')
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

    /**
     * Calculate total power from all CP progression systems
     * @param {Object} entity - Entity data
     * @returns {number} Total progression power
     */
    _calculateProgressionPower(entity) {
        let totalPower = 0;

        // Mount System Power
        if (entity.mounts?.active && window.MountSystem) {
            const mountData = this._getMountData(entity.mounts.active);
            if (mountData) {
                const level = this._getMountLevel(entity.mounts.active, entity.mounts);
                const experience = entity.mounts.experience?.[entity.mounts.active] || 0;

                let power = mountData.basePower;
                power += level * mountData.powerPerLevel;
                power += Math.floor(experience / 100) * mountData.experienceBonus;
                totalPower += power;
            }
        }

        // Wings System Power
        if (entity.wings?.equipped && window.WingSystem) {
            const wingData = this._getWingData(entity.wings.equipped);
            if (wingData) {
                const level = entity.wings.levels?.[entity.wings.equipped] || 1;

                let power = wingData.basePower;
                power += (level - 1) * wingData.powerPerLevel;

                // Diminishing returns for higher levels
                if (level > 10) {
                    const diminishingBonus = Math.floor((level - 10) * wingData.powerPerLevel * 0.5);
                    power += diminishingBonus;
                }
                totalPower += power;
            }
        }

        // Accessories System Power
        if (entity.accessories?.equipped && window.AccessorySystem) {
            Object.values(entity.accessories.equipped).forEach(accessoryId => {
                if (accessoryId && entity.accessories.inventory?.[accessoryId]) {
                    const accessoryData = this._getAccessoryData(accessoryId);
                    if (accessoryData) {
                        const enhancement = entity.accessories.inventory[accessoryId].enhancement || 0;
                        const stars = entity.accessories.inventory[accessoryId].stars || 0;

                        let power = accessoryData.basePower;
                        power += enhancement * accessoryData.enhancementPower;
                        power += stars * accessoryData.starPower;
                        totalPower += power;
                    }
                }
            });
        }

        // Runes System Power
        if (entity.runes?.equipped && window.RuneSystem) {
            Object.values(entity.runes.equipped).forEach(runeId => {
                if (runeId && entity.runes.inventory?.[runeId]) {
                    const runeData = this._getRuneData(runeId);
                    if (runeData) {
                        const level = entity.runes.inventory[runeId].level || 1;

                        let power = runeData.basePower;
                        power += (level - 1) * runeData.powerPerLevel;

                        // Set bonus calculation
                        const setBonus = this._calculateRuneSetBonus(entity.runes, runeId);
                        power += setBonus;

                        totalPower += power;
                    }
                }
            });
        }

        // Meridians System Power
        if (entity.meridians?.channels && window.MeridianSystem) {
            Object.values(entity.meridians.channels).forEach(channel => {
                if (channel.opened) {
                    const channelData = this._getMeridianData(channel.id);
                    if (channelData) {
                        let power = channelData.basePower;
                        power += (channel.level - 1) * channelData.powerPerLevel;
                        power += Math.floor(channel.purity / 10) * channelData.purityBonus;
                        totalPower += power;
                    }
                }
            });

            // Pattern bonuses
            Object.entries(entity.meridians.patterns || {}).forEach(([patternId, pattern]) => {
                if (pattern.active) {
                    const patternData = this._getPatternData(patternId);
                    if (patternData) {
                        totalPower += patternData.powerBonus * pattern.level;
                    }
                }
            });
        }

        // Dantian System Power
        if (entity.dantian?.centers && window.DantianSystem) {
            Object.entries(entity.dantian.centers).forEach(([centerType, center]) => {
                if (center.opened) {
                    const centerData = this._getDantianData(centerType);
                    if (centerData) {
                        let power = centerData.basePower;
                        power += (center.level - 1) * centerData.powerPerLevel;
                        power += Math.floor(center.purity / 10) * centerData.purityBonus;
                        power *= center.density; // Density multiplier
                        totalPower += power;
                    }
                }
            });

            // Formation bonuses
            Object.entries(entity.dantian.formations || {}).forEach(([centerType, formations]) => {
                Object.entries(formations).forEach(([formationId, formation]) => {
                    const formationData = this._getFormationData(formationId);
                    if (formationData) {
                        let formationPower = formationData.powerBonus * formation.level;
                        formationPower *= formation.stability / 100;
                        totalPower += formationPower;
                    }
                });
            });
        }

        // Soul System Power
        if (entity.soul && window.SoulSystem) {
            // Base soul essence power
            const essencePower = (entity.soul.essence?.current || 0) *
                               (entity.soul.essence?.purity || 1.0) *
                               (entity.soul.essence?.density || 1.0) * 2;
            totalPower += essencePower;

            // Constellation power
            if (entity.soul.constellation?.active) {
                const constellationData = this._getConstellationData(entity.soul.constellation.active);
                if (constellationData) {
                    totalPower += constellationData.basePower;

                    // Star power
                    constellationData.stars.forEach(starId => {
                        const star = entity.soul.constellation.stars?.[starId];
                        if (star && star.active) {
                            totalPower += star.power || 0;
                        }
                    });

                    // Connection bonuses (simplified)
                    const activeStars = constellationData.stars.filter(starId => {
                        const star = entity.soul.constellation.stars?.[starId];
                        return star && star.active;
                    }).length;

                    let bonusPercent = 0;
                    if (activeStars >= 3) bonusPercent += 10;
                    if (activeStars >= 5) bonusPercent += 15;
                    if (activeStars >= 7) bonusPercent += 25;
                    if (activeStars === constellationData.stars.length) {
                        bonusPercent += constellationData.fullSetBonus || 50;
                    }

                    totalPower += Math.floor(totalPower * bonusPercent / 100);
                }
            }
        }

        return Math.floor(totalPower);
    }

    /**
     * Get detailed breakdown of progression system power contributions
     * @param {Object} entity - Entity data
     * @returns {Object} Progression power breakdown
     */
    _getProgressionBreakdown(entity) {
        const breakdown = {
            mounts: 0,
            wings: 0,
            accessories: 0,
            runes: 0,
            meridians: 0,
            dantian: 0,
            soul: 0
        };

        // Mount power
        if (entity.mounts?.active) {
            breakdown.mounts = this._calculateMountPower(entity.mounts);
        }

        // Wings power
        if (entity.wings?.equipped) {
            breakdown.wings = this._calculateWingsPower(entity.wings);
        }

        // Accessories power
        if (entity.accessories?.equipped) {
            breakdown.accessories = this._calculateAccessoriesPower(entity.accessories);
        }

        // Runes power
        if (entity.runes?.equipped) {
            breakdown.runes = this._calculateRunesPower(entity.runes);
        }

        // Meridians power
        if (entity.meridians?.channels) {
            breakdown.meridians = this._calculateMeridiansPower(entity.meridians);
        }

        // Dantian power
        if (entity.dantian?.centers) {
            breakdown.dantian = this._calculateDantianPower(entity.dantian);
        }

        // Soul power
        if (entity.soul) {
            breakdown.soul = this._calculateSoulPower(entity.soul);
        }

        return breakdown;
    }

    // Helper methods for calculating individual system powers
    _calculateMountPower(mounts) {
        if (!mounts.active) return 0;

        const mountData = this._getMountData(mounts.active);
        if (!mountData) return 0;

        const level = this._getMountLevel(mounts.active, mounts);
        const experience = mounts.experience?.[mounts.active] || 0;

        let power = mountData.basePower;
        power += level * mountData.powerPerLevel;
        power += Math.floor(experience / 100) * mountData.experienceBonus;

        return Math.floor(power);
    }

    _calculateWingsPower(wings) {
        if (!wings.equipped) return 0;

        const wingData = this._getWingData(wings.equipped);
        if (!wingData) return 0;

        const level = wings.levels?.[wings.equipped] || 1;

        let power = wingData.basePower;
        power += (level - 1) * wingData.powerPerLevel;

        if (level > 10) {
            const diminishingBonus = Math.floor((level - 10) * wingData.powerPerLevel * 0.5);
            power += diminishingBonus;
        }

        return Math.floor(power);
    }

    _calculateAccessoriesPower(accessories) {
        let totalPower = 0;

        Object.values(accessories.equipped || {}).forEach(accessoryId => {
            if (accessoryId && accessories.inventory?.[accessoryId]) {
                const accessoryData = this._getAccessoryData(accessoryId);
                if (accessoryData) {
                    const enhancement = accessories.inventory[accessoryId].enhancement || 0;
                    const stars = accessories.inventory[accessoryId].stars || 0;

                    let power = accessoryData.basePower;
                    power += enhancement * accessoryData.enhancementPower;
                    power += stars * accessoryData.starPower;
                    totalPower += power;
                }
            }
        });

        return Math.floor(totalPower);
    }

    _calculateRunesPower(runes) {
        let totalPower = 0;

        Object.values(runes.equipped || {}).forEach(runeId => {
            if (runeId && runes.inventory?.[runeId]) {
                const runeData = this._getRuneData(runeId);
                if (runeData) {
                    const level = runes.inventory[runeId].level || 1;

                    let power = runeData.basePower;
                    power += (level - 1) * runeData.powerPerLevel;

                    const setBonus = this._calculateRuneSetBonus(runes, runeId);
                    power += setBonus;

                    totalPower += power;
                }
            }
        });

        return Math.floor(totalPower);
    }

    _calculateMeridiansPower(meridians) {
        let totalPower = 0;

        Object.values(meridians.channels || {}).forEach(channel => {
            if (channel.opened) {
                const channelData = this._getMeridianData(channel.id);
                if (channelData) {
                    let power = channelData.basePower;
                    power += (channel.level - 1) * channelData.powerPerLevel;
                    power += Math.floor(channel.purity / 10) * channelData.purityBonus;
                    totalPower += power;
                }
            }
        });

        Object.entries(meridians.patterns || {}).forEach(([patternId, pattern]) => {
            if (pattern.active) {
                const patternData = this._getPatternData(patternId);
                if (patternData) {
                    totalPower += patternData.powerBonus * pattern.level;
                }
            }
        });

        return Math.floor(totalPower);
    }

    _calculateDantianPower(dantian) {
        let totalPower = 0;

        Object.entries(dantian.centers || {}).forEach(([centerType, center]) => {
            if (center.opened) {
                const centerData = this._getDantianData(centerType);
                if (centerData) {
                    let power = centerData.basePower;
                    power += (center.level - 1) * centerData.powerPerLevel;
                    power += Math.floor(center.purity / 10) * centerData.purityBonus;
                    power *= center.density;
                    totalPower += power;
                }
            }
        });

        Object.entries(dantian.formations || {}).forEach(([centerType, formations]) => {
            Object.entries(formations).forEach(([formationId, formation]) => {
                const formationData = this._getFormationData(formationId);
                if (formationData) {
                    let formationPower = formationData.powerBonus * formation.level;
                    formationPower *= formation.stability / 100;
                    totalPower += formationPower;
                }
            });
        });

        return Math.floor(totalPower);
    }

    _calculateSoulPower(soul) {
        let totalPower = 0;

        const essencePower = (soul.essence?.current || 0) *
                           (soul.essence?.purity || 1.0) *
                           (soul.essence?.density || 1.0) * 2;
        totalPower += essencePower;

        if (soul.constellation?.active) {
            const constellationData = this._getConstellationData(soul.constellation.active);
            if (constellationData) {
                totalPower += constellationData.basePower;

                constellationData.stars.forEach(starId => {
                    const star = soul.constellation.stars?.[starId];
                    if (star && star.active) {
                        totalPower += star.power || 0;
                    }
                });

                const activeStars = constellationData.stars.filter(starId => {
                    const star = soul.constellation.stars?.[starId];
                    return star && star.active;
                }).length;

                let bonusPercent = 0;
                if (activeStars >= 3) bonusPercent += 10;
                if (activeStars >= 5) bonusPercent += 15;
                if (activeStars >= 7) bonusPercent += 25;
                if (activeStars === constellationData.stars.length) {
                    bonusPercent += constellationData.fullSetBonus || 50;
                }

                totalPower += Math.floor(totalPower * bonusPercent / 100);
            }
        }

        return Math.floor(totalPower);
    }

    // Data accessor methods - these would normally access the respective system classes
    // For now, implementing simplified versions
    _getMountData(mountId) {
        const mountsData = {
            spirit_horse: { name: 'Spirit Horse', basePower: 150, powerPerLevel: 25, experienceBonus: 2 },
            cloud_leopard: { name: 'Cloud Leopard', basePower: 280, powerPerLevel: 45, experienceBonus: 3 },
            fire_phoenix: { name: 'Fire Phoenix', basePower: 450, powerPerLevel: 75, experienceBonus: 5 },
            void_dragon: { name: 'Void Dragon', basePower: 800, powerPerLevel: 120, experienceBonus: 8 }
        };
        return mountsData[mountId] || null;
    }

    _getMountLevel(mountId, mounts) {
        const experience = mounts.experience?.[mountId] || 0;
        const mountData = this._getMountData(mountId);
        if (!mountData) return 1;

        let level = 1;
        let expRequired = 100; // Base exp requirement
        let totalExp = 0;

        while (totalExp + expRequired <= experience) {
            totalExp += expRequired;
            level++;
            expRequired = Math.floor(expRequired * 1.5);
        }

        return level;
    }

    _getWingData(wingId) {
        const wingsData = {
            feather_wings: { name: 'Feather Wings', basePower: 120, powerPerLevel: 18 },
            crystal_wings: { name: 'Crystal Wings', basePower: 220, powerPerLevel: 32 },
            flame_wings: { name: 'Flame Wings', basePower: 380, powerPerLevel: 55 },
            void_wings: { name: 'Void Wings', basePower: 620, powerPerLevel: 85 },
            divine_wings: { name: 'Divine Wings', basePower: 950, powerPerLevel: 125 }
        };
        return wingsData[wingId] || null;
    }

    _getAccessoryData(accessoryId) {
        const accessoriesData = {
            basic_ring: { name: 'Basic Ring', basePower: 45, enhancementPower: 8, starPower: 15 },
            spirit_ring: { name: 'Spirit Ring', basePower: 85, enhancementPower: 15, starPower: 25 },
            basic_necklace: { name: 'Basic Necklace', basePower: 55, enhancementPower: 10, starPower: 18 },
            jade_necklace: { name: 'Jade Necklace', basePower: 105, enhancementPower: 18, starPower: 30 },
            spirit_bracelet: { name: 'Spirit Bracelet', basePower: 150, enhancementPower: 25, starPower: 40 },
            phoenix_pendant: { name: 'Phoenix Pendant', basePower: 280, enhancementPower: 45, starPower: 70 }
        };
        return accessoriesData[accessoryId] || null;
    }

    _getRuneData(runeId) {
        const runesData = {
            basic_power_rune: { name: 'Basic Power Rune', basePower: 60, powerPerLevel: 12, setType: 'warrior' },
            basic_defense_rune: { name: 'Basic Defense Rune', basePower: 55, powerPerLevel: 11, setType: 'guardian' },
            basic_speed_rune: { name: 'Basic Speed Rune', basePower: 50, powerPerLevel: 10, setType: 'swift' },
            enhanced_power_rune: { name: 'Enhanced Power Rune', basePower: 120, powerPerLevel: 24, setType: 'warrior' },
            spirit_rune: { name: 'Spirit Rune', basePower: 180, powerPerLevel: 36, setType: 'mystic' },
            fortune_rune: { name: 'Fortune Rune', basePower: 250, powerPerLevel: 50, setType: 'blessed' }
        };
        return runesData[runeId] || null;
    }

    _calculateRuneSetBonus(runes, runeId) {
        const runeData = this._getRuneData(runeId);
        if (!runeData?.setType) return 0;

        let setCount = 0;
        Object.values(runes.equipped || {}).forEach(equippedRuneId => {
            if (equippedRuneId) {
                const equippedData = this._getRuneData(equippedRuneId);
                if (equippedData?.setType === runeData.setType) {
                    setCount++;
                }
            }
        });

        let totalBonus = 0;
        if (setCount >= 2) totalBonus += 20;
        if (setCount >= 4) totalBonus += 50;
        if (setCount >= 6) totalBonus += 100;

        return totalBonus;
    }

    _getMeridianData(channelId) {
        // Simplified meridian data
        const meridiansData = {
            hand_taiyin: { basePower: 25, powerPerLevel: 8, purityBonus: 2 },
            hand_shaoyin: { basePower: 30, powerPerLevel: 10, purityBonus: 3 },
            hand_jueyin: { basePower: 35, powerPerLevel: 12, purityBonus: 4 },
            hand_yangming: { basePower: 28, powerPerLevel: 9, purityBonus: 2 },
            hand_taiyang: { basePower: 32, powerPerLevel: 11, purityBonus: 3 },
            hand_shaoyang: { basePower: 38, powerPerLevel: 13, purityBonus: 4 },
            foot_taiyin: { basePower: 40, powerPerLevel: 14, purityBonus: 5 },
            foot_shaoyin: { basePower: 45, powerPerLevel: 16, purityBonus: 6 },
            foot_jueyin: { basePower: 42, powerPerLevel: 15, purityBonus: 5 },
            foot_yangming: { basePower: 35, powerPerLevel: 12, purityBonus: 4 },
            foot_taiyang: { basePower: 50, powerPerLevel: 18, purityBonus: 7 },
            foot_shaoyang: { basePower: 48, powerPerLevel: 17, purityBonus: 6 }
        };
        return meridiansData[channelId] || null;
    }

    _getPatternData(patternId) {
        const patternsData = {
            five_element_cycle: { powerBonus: 100 },
            yin_yang_balance: { powerBonus: 150 },
            grand_circulation: { powerBonus: 300 }
        };
        return patternsData[patternId] || null;
    }

    _getDantianData(centerType) {
        const dantianData = {
            lower: { basePower: 80, powerPerLevel: 25, purityBonus: 5 },
            middle: { basePower: 120, powerPerLevel: 40, purityBonus: 8 },
            upper: { basePower: 180, powerPerLevel: 60, purityBonus: 12 }
        };
        return dantianData[centerType] || null;
    }

    _getFormationData(formationId) {
        const formationsData = {
            spiral_vortex: { powerBonus: 50 },
            eight_trigrams: { powerBonus: 120 },
            celestial_array: { powerBonus: 250 }
        };
        return formationsData[formationId] || null;
    }

    _getConstellationData(constellationId) {
        const constellationsData = {
            warrior_constellation: {
                basePower: 80,
                stars: ['ares_star', 'sword_star', 'shield_star', 'victory_star', 'battle_star'],
                fullSetBonus: 40
            },
            scholar_constellation: {
                basePower: 60,
                stars: ['wisdom_star', 'knowledge_star', 'insight_star', 'clarity_star', 'truth_star'],
                fullSetBonus: 50
            },
            beast_constellation: {
                basePower: 120,
                stars: ['tiger_star', 'dragon_star', 'phoenix_star', 'turtle_star', 'serpent_star', 'wolf_star', 'eagle_star'],
                fullSetBonus: 60
            },
            celestial_constellation: {
                basePower: 200,
                stars: ['sun_star', 'moon_star', 'venus_star', 'mars_star', 'jupiter_star', 'saturn_star', 'mercury_star', 'north_star'],
                fullSetBonus: 100
            }
        };
        return constellationsData[constellationId] || null;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PowerCalculator };
} else if (typeof window !== 'undefined') {
    window.PowerCalculator = PowerCalculator;
}