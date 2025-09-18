/**
 * ScriptureManager - Manages scripture collection, effects, and equipped scriptures
 * Handles inventory management, scripture effects calculation, and loadout system
 */
class ScriptureManager {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Scripture collection state
        this.collectionState = {
            scriptures: new Map(), // scripture ID -> scripture instance
            equipped: {
                primary: null,    // Main cultivation scripture
                secondary: null,  // Support scripture
                passive1: null,   // First passive effect scripture
                passive2: null,   // Second passive effect scripture
                passive3: null    // Third passive effect scripture
            },
            favorites: new Set(),
            tags: new Map(), // Custom player tags for scriptures
            sortBy: 'power',
            filterBy: {
                rarity: 'all',
                category: 'all',
                level: 'all',
                equipped: 'all'
            }
        };

        // Active effects from equipped scriptures
        this.activeEffects = {
            cultivation: {
                qiBonus: 0,
                bodyBonus: 0,
                cultivationSpeed: 0,
                breakthroughChance: 0
            },
            combat: {
                power: 0,
                defense: 0,
                speed: 0,
                critChance: 0,
                critDamage: 0
            },
            resource: {
                jadeBonus: 0,
                crystalBonus: 0,
                expBonus: 0,
                dropRateBonus: 0
            },
            special: new Map() // Special effects from scriptures
        };

        // Set bonuses from equipped scripture combinations
        this.activeSets = new Map();

        // Collection statistics
        this.statistics = {
            totalScriptures: 0,
            scripturesByRarity: {},
            scripturesByCategory: {},
            totalPower: 0,
            collectionCompletion: 0,
            favoriteCount: 0,
            duplicatesConverted: 0
        };

        this.isInitialized = false;

        console.log('ScriptureManager: Initialized');
    }

    /**
     * Initialize the scripture manager
     */
    async initialize() {
        try {
            // Load scripture collection from game state
            const savedCollection = this.gameState.get('scriptures');
            if (savedCollection) {
                // Convert array to Map for better performance
                if (Array.isArray(savedCollection.collection)) {
                    for (const scripture of savedCollection.collection) {
                        this.collectionState.scriptures.set(scripture.id, scripture);
                    }
                }

                // Load other collection state
                if (savedCollection.equipped) {
                    this.collectionState.equipped = { ...this.collectionState.equipped, ...savedCollection.equipped };
                }
                if (savedCollection.favorites) {
                    this.collectionState.favorites = new Set(savedCollection.favorites);
                }
                if (savedCollection.tags) {
                    this.collectionState.tags = new Map(Object.entries(savedCollection.tags || {}));
                }
                if (savedCollection.sortBy) {
                    this.collectionState.sortBy = savedCollection.sortBy;
                }
                if (savedCollection.filterBy) {
                    this.collectionState.filterBy = { ...this.collectionState.filterBy, ...savedCollection.filterBy };
                }
            }

            // Load statistics
            const savedStats = this.gameState.get('scriptureStats');
            if (savedStats) {
                this.statistics = { ...this.statistics, ...savedStats };
            }

            // Set up event listeners
            this._setupEventListeners();

            // Recalculate all effects
            this._recalculateAllEffects();

            // Update statistics
            this._updateStatistics();

            this.isInitialized = true;

            this.eventManager.emit('scripture:initialized', {
                totalScriptures: this.collectionState.scriptures.size,
                totalPower: this.statistics.totalPower,
                equippedCount: this._getEquippedCount()
            });

            console.log('ScriptureManager: Initialization complete');

        } catch (error) {
            console.error('ScriptureManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Add a scripture to the collection
     * @param {Object} scripture - Scripture instance to add
     * @returns {Object} Addition result
     */
    addScripture(scripture) {
        if (!this.isInitialized) {
            throw new Error('ScriptureManager not initialized');
        }

        if (!scripture || !scripture.id) {
            throw new Error('Invalid scripture object');
        }

        // Check for duplicates
        const isDuplicate = this.collectionState.scriptures.has(scripture.id);
        if (isDuplicate) {
            return this._handleDuplicate(scripture);
        }

        // Add to collection
        this.collectionState.scriptures.set(scripture.id, scripture);

        // Update statistics
        this._updateStatistics();

        // Save state
        this.saveState();

        // Emit events
        this.eventManager.emit('scripture:added', {
            scripture: scripture,
            totalScriptures: this.collectionState.scriptures.size
        });

        return {
            success: true,
            added: true,
            scripture: scripture,
            duplicateReward: null
        };
    }

    /**
     * Remove a scripture from the collection
     * @param {string} scriptureId - Scripture ID to remove
     * @returns {boolean} Success status
     */
    removeScripture(scriptureId) {
        if (!this.collectionState.scriptures.has(scriptureId)) {
            return false;
        }

        const scripture = this.collectionState.scriptures.get(scriptureId);

        // Check if scripture is equipped
        const isEquipped = this._isScriptureEquipped(scriptureId);
        if (isEquipped) {
            this.unequipScripture(scriptureId);
        }

        // Remove from collection
        this.collectionState.scriptures.delete(scriptureId);

        // Remove from favorites and tags
        this.collectionState.favorites.delete(scriptureId);
        this.collectionState.tags.delete(scriptureId);

        // Update statistics
        this._updateStatistics();

        // Save state
        this.saveState();

        // Emit events
        this.eventManager.emit('scripture:removed', {
            scriptureId: scriptureId,
            scripture: scripture
        });

        return true;
    }

    /**
     * Equip a scripture to a specific slot
     * @param {string} scriptureId - Scripture ID to equip
     * @param {string} slot - Slot to equip to
     * @returns {Object} Equip result
     */
    equipScripture(scriptureId, slot = 'primary') {
        if (!this.collectionState.scriptures.has(scriptureId)) {
            return { success: false, reason: 'scripture_not_found' };
        }

        if (!this.collectionState.equipped.hasOwnProperty(slot)) {
            return { success: false, reason: 'invalid_slot' };
        }

        const scripture = this.collectionState.scriptures.get(scriptureId);

        // Check requirements
        const canEquip = this._canEquipScripture(scripture, slot);
        if (!canEquip.canEquip) {
            return { success: false, reason: canEquip.reason };
        }

        // Store previously equipped scripture
        const previousScripture = this.collectionState.equipped[slot];

        // Equip the scripture
        this.collectionState.equipped[slot] = scriptureId;

        // Recalculate effects
        this._recalculateAllEffects();

        // Save state
        this.saveState();

        // Emit events
        this.eventManager.emit('scripture:equipped', {
            scriptureId: scriptureId,
            slot: slot,
            previousScripture: previousScripture,
            newEffects: this.activeEffects
        });

        return {
            success: true,
            scriptureId: scriptureId,
            slot: slot,
            previousScripture: previousScripture
        };
    }

    /**
     * Unequip a scripture from a slot
     * @param {string} scriptureId - Scripture ID to unequip
     * @returns {boolean} Success status
     */
    unequipScripture(scriptureId) {
        let unequippedSlot = null;

        // Find and remove from equipped slots
        for (const [slot, equippedId] of Object.entries(this.collectionState.equipped)) {
            if (equippedId === scriptureId) {
                this.collectionState.equipped[slot] = null;
                unequippedSlot = slot;
                break;
            }
        }

        if (!unequippedSlot) {
            return false;
        }

        // Recalculate effects
        this._recalculateAllEffects();

        // Save state
        this.saveState();

        // Emit events
        this.eventManager.emit('scripture:unequipped', {
            scriptureId: scriptureId,
            slot: unequippedSlot,
            newEffects: this.activeEffects
        });

        return true;
    }

    /**
     * Get scripture by ID
     * @param {string} scriptureId - Scripture ID
     * @returns {Object|null} Scripture instance
     */
    getScripture(scriptureId) {
        return this.collectionState.scriptures.get(scriptureId) || null;
    }

    /**
     * Get all scriptures with filtering and sorting
     * @param {Object} options - Filter and sort options
     * @returns {Array} Filtered and sorted scriptures
     */
    getScriptures(options = {}) {
        const config = {
            sortBy: options.sortBy || this.collectionState.sortBy,
            filterBy: { ...this.collectionState.filterBy, ...options.filterBy },
            limit: options.limit || null,
            offset: options.offset || 0
        };

        // Convert Map to Array
        let scriptures = Array.from(this.collectionState.scriptures.values());

        // Apply filters
        scriptures = this._applyFilters(scriptures, config.filterBy);

        // Apply sorting
        scriptures = this._applySorting(scriptures, config.sortBy);

        // Apply pagination
        if (config.limit) {
            const start = config.offset;
            const end = start + config.limit;
            scriptures = scriptures.slice(start, end);
        }

        return scriptures;
    }

    /**
     * Get equipped scriptures
     * @returns {Object} Equipped scriptures by slot
     */
    getEquippedScriptures() {
        const equipped = {};

        for (const [slot, scriptureId] of Object.entries(this.collectionState.equipped)) {
            if (scriptureId) {
                equipped[slot] = this.collectionState.scriptures.get(scriptureId);
            } else {
                equipped[slot] = null;
            }
        }

        return equipped;
    }

    /**
     * Get current active effects from all equipped scriptures
     * @returns {Object} All active effects
     */
    getActiveEffects() {
        return {
            cultivation: { ...this.activeEffects.cultivation },
            combat: { ...this.activeEffects.combat },
            resource: { ...this.activeEffects.resource },
            special: new Map(this.activeEffects.special),
            sets: new Map(this.activeSets)
        };
    }

    /**
     * Add scripture to favorites
     * @param {string} scriptureId - Scripture ID
     * @returns {boolean} Success status
     */
    addToFavorites(scriptureId) {
        if (!this.collectionState.scriptures.has(scriptureId)) {
            return false;
        }

        this.collectionState.favorites.add(scriptureId);
        this.saveState();

        this.eventManager.emit('scripture:favorited', { scriptureId });

        return true;
    }

    /**
     * Remove scripture from favorites
     * @param {string} scriptureId - Scripture ID
     * @returns {boolean} Success status
     */
    removeFromFavorites(scriptureId) {
        const removed = this.collectionState.favorites.delete(scriptureId);
        if (removed) {
            this.saveState();
            this.eventManager.emit('scripture:unfavorited', { scriptureId });
        }
        return removed;
    }

    /**
     * Add custom tag to scripture
     * @param {string} scriptureId - Scripture ID
     * @param {string} tag - Custom tag
     * @returns {boolean} Success status
     */
    addTag(scriptureId, tag) {
        if (!this.collectionState.scriptures.has(scriptureId)) {
            return false;
        }

        if (!this.collectionState.tags.has(scriptureId)) {
            this.collectionState.tags.set(scriptureId, []);
        }

        const tags = this.collectionState.tags.get(scriptureId);
        if (!tags.includes(tag)) {
            tags.push(tag);
            this.saveState();

            this.eventManager.emit('scripture:tagged', {
                scriptureId: scriptureId,
                tag: tag
            });

            return true;
        }

        return false;
    }

    /**
     * Remove custom tag from scripture
     * @param {string} scriptureId - Scripture ID
     * @param {string} tag - Tag to remove
     * @returns {boolean} Success status
     */
    removeTag(scriptureId, tag) {
        if (!this.collectionState.tags.has(scriptureId)) {
            return false;
        }

        const tags = this.collectionState.tags.get(scriptureId);
        const index = tags.indexOf(tag);

        if (index !== -1) {
            tags.splice(index, 1);

            if (tags.length === 0) {
                this.collectionState.tags.delete(scriptureId);
            }

            this.saveState();

            this.eventManager.emit('scripture:untagged', {
                scriptureId: scriptureId,
                tag: tag
            });

            return true;
        }

        return false;
    }

    /**
     * Get scripture collection statistics
     * @returns {Object} Collection statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            equipped: this._getEquippedCount(),
            favorites: this.collectionState.favorites.size,
            activeSets: this.activeSets.size,
            collectionValue: this._calculateCollectionValue()
        };
    }

    /**
     * Get recommended scriptures for current cultivation level
     * @param {number} limit - Maximum recommendations
     * @returns {Array} Recommended scriptures
     */
    getRecommendations(limit = 5) {
        const cultivationState = this.gameState.get('cultivation');
        if (!cultivationState) {
            return [];
        }

        const scriptures = Array.from(this.collectionState.scriptures.values());
        const recommendations = [];

        // Score scriptures based on current cultivation needs
        for (const scripture of scriptures) {
            const score = this._calculateRecommendationScore(scripture, cultivationState);
            recommendations.push({ scripture, score });
        }

        // Sort by score and return top recommendations
        recommendations.sort((a, b) => b.score - a.score);

        return recommendations
            .slice(0, limit)
            .map(rec => ({
                scripture: rec.scripture,
                score: rec.score,
                reason: this._getRecommendationReason(rec.scripture, cultivationState)
            }));
    }

    /**
     * Auto-equip best scriptures based on current needs
     * @param {Object} options - Auto-equip options
     * @returns {Object} Auto-equip result
     */
    autoEquip(options = {}) {
        const config = {
            mode: options.mode || 'balanced', // 'cultivation', 'combat', 'balanced'
            respectFavorites: options.respectFavorites !== false,
            ...options
        };

        const scriptures = Array.from(this.collectionState.scriptures.values());
        const equipped = {};
        const changes = [];

        // Score all scriptures for each slot
        const slotPriorities = this._getSlotPriorities(config.mode);

        for (const slot of Object.keys(this.collectionState.equipped)) {
            const candidates = scriptures.filter(s => this._canEquipScripture(s, slot).canEquip);

            if (candidates.length === 0) continue;

            // Score candidates
            const scored = candidates.map(scripture => ({
                scripture,
                score: this._calculateAutoEquipScore(scripture, slot, config.mode, slotPriorities[slot])
            }));

            // Sort by score
            scored.sort((a, b) => b.score - a.score);

            const bestScripture = scored[0].scripture;
            const currentEquipped = this.collectionState.equipped[slot];

            // Check if we should make the change
            if (!currentEquipped || bestScripture.id !== currentEquipped) {
                const prevScripture = currentEquipped ? this.getScripture(currentEquipped) : null;

                equipped[slot] = bestScripture.id;
                changes.push({
                    slot: slot,
                    previous: prevScripture,
                    new: bestScripture,
                    reason: 'auto_optimization'
                });
            }
        }

        // Apply changes
        for (const change of changes) {
            this.collectionState.equipped[change.slot] = change.new.id;
        }

        if (changes.length > 0) {
            // Recalculate effects
            this._recalculateAllEffects();

            // Save state
            this.saveState();

            // Emit events
            this.eventManager.emit('scripture:auto_equipped', {
                changes: changes,
                newEffects: this.activeEffects
            });
        }

        return {
            success: true,
            changesCount: changes.length,
            changes: changes,
            newEffects: this.activeEffects
        };
    }

    /**
     * Save scripture state to game state
     */
    saveState() {
        // Convert Map to Array for serialization
        const scriptureArray = Array.from(this.collectionState.scriptures.values());
        const favoritesArray = Array.from(this.collectionState.favorites);
        const tagsObject = Object.fromEntries(this.collectionState.tags);

        this.gameState.update({
            scriptures: {
                collection: scriptureArray,
                equipped: this.collectionState.equipped,
                favorites: favoritesArray,
                tags: tagsObject,
                sortBy: this.collectionState.sortBy,
                filterBy: this.collectionState.filterBy,
                nextId: this.gameState.get('scriptures.nextId') || this.collectionState.scriptures.size + 1
            },
            scriptureStats: this.statistics
        }, { source: 'scripture:save' });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save state on significant events
        this.eventManager.on('scripture:equipped', () => {
            this.saveState();
        });

        this.eventManager.on('scripture:enhanced', () => {
            this._recalculateAllEffects();
            this._updateStatistics();
            this.saveState();
        });

        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });

        // Handle cultivation changes for recommendations
        this.eventManager.on('cultivation:level_up', () => {
            this.eventManager.emit('scripture:recommendations_changed', {
                recommendations: this.getRecommendations()
            });
        });
    }

    /**
     * Handle duplicate scripture
     * @param {Object} scripture - Duplicate scripture
     * @returns {Object} Duplicate handling result
     */
    _handleDuplicate(scripture) {
        // Convert duplicate to enhancement materials
        const rarityData = SCRIPTURE_RARITIES[scripture.rarity];
        const reward = {
            jade: Math.floor(rarityData.enhancementCost.baseJade * 0.5),
            crystals: 0,
            enhancementStones: 1
        };

        // Higher rarity duplicates give more rewards
        if (rarityData.id === 'epic' || rarityData.id === 'legendary' || rarityData.id === 'mythical') {
            reward.crystals = Math.floor(rarityData.enhancementCost.baseJade * 0.1);
            reward.enhancementStones = rarityData.id === 'mythical' ? 5 :
                                      rarityData.id === 'legendary' ? 3 : 2;
        }

        // Apply rewards
        this.gameState.increment('player.jade', reward.jade);
        if (reward.crystals > 0) {
            this.gameState.increment('player.spiritCrystals', reward.crystals);
        }

        // Track duplicate conversion
        this.statistics.duplicatesConverted++;

        // Emit event
        this.eventManager.emit('scripture:duplicate_converted', {
            scripture: scripture,
            reward: reward
        });

        return {
            success: true,
            added: false,
            isDuplicate: true,
            reward: reward
        };
    }

    /**
     * Check if a scripture is currently equipped
     * @param {string} scriptureId - Scripture ID
     * @returns {boolean} Is equipped
     */
    _isScriptureEquipped(scriptureId) {
        return Object.values(this.collectionState.equipped).includes(scriptureId);
    }

    /**
     * Check if a scripture can be equipped to a slot
     * @param {Object} scripture - Scripture to check
     * @param {string} slot - Target slot
     * @returns {Object} Can equip result
     */
    _canEquipScripture(scripture, slot) {
        const scriptureData = SCRIPTURE_DATABASE[scripture.name];
        if (!scriptureData) {
            return { canEquip: false, reason: 'scripture_data_not_found' };
        }

        // Check unlock requirements
        if (scriptureData.unlockRequirements) {
            const requirements = scriptureData.unlockRequirements;

            // Check realm requirements
            if (requirements.realm) {
                const currentRealm = this.gameState.get('realm.current');
                if (currentRealm !== requirements.realm) {
                    return { canEquip: false, reason: 'realm_requirement_not_met' };
                }
            }

            // Check cultivation level requirements
            if (requirements.cultivation) {
                const cultivationState = this.gameState.get('cultivation');
                if (requirements.cultivation.qi && cultivationState.qi.level < requirements.cultivation.qi.level) {
                    return { canEquip: false, reason: 'qi_level_too_low' };
                }
                if (requirements.cultivation.body && cultivationState.body.level < requirements.cultivation.body.level) {
                    return { canEquip: false, reason: 'body_level_too_low' };
                }
            }
        }

        // Check slot compatibility
        if (slot === 'primary') {
            // Primary slot can hold any scripture
            return { canEquip: true };
        } else if (slot === 'secondary') {
            // Secondary slot can hold support or dual cultivation scriptures
            if (scripture.category === 'Support' || scripture.category === 'Dual Cultivation') {
                return { canEquip: true };
            }
            return { canEquip: false, reason: 'incompatible_with_secondary_slot' };
        } else {
            // Passive slots can hold any scripture
            return { canEquip: true };
        }
    }

    /**
     * Recalculate all active effects from equipped scriptures
     */
    _recalculateAllEffects() {
        // Reset all effects
        this.activeEffects = {
            cultivation: {
                qiBonus: 0,
                bodyBonus: 0,
                cultivationSpeed: 0,
                breakthroughChance: 0
            },
            combat: {
                power: 0,
                defense: 0,
                speed: 0,
                critChance: 0,
                critDamage: 0
            },
            resource: {
                jadeBonus: 0,
                crystalBonus: 0,
                expBonus: 0,
                dropRateBonus: 0
            },
            special: new Map()
        };

        this.activeSets.clear();

        // Collect all equipped scriptures
        const equippedScriptures = [];
        for (const [slot, scriptureId] of Object.entries(this.collectionState.equipped)) {
            if (scriptureId) {
                const scripture = this.collectionState.scriptures.get(scriptureId);
                if (scripture) {
                    equippedScriptures.push({ scripture, slot });
                }
            }
        }

        // Calculate effects from each equipped scripture
        for (const { scripture, slot } of equippedScriptures) {
            this._addScriptureEffects(scripture, slot);
        }

        // Calculate set bonuses
        this._calculateSetBonuses(equippedScriptures);

        // Emit effects updated event
        this.eventManager.emit('scripture:effects_updated', {
            effects: this.activeEffects,
            sets: this.activeSets
        });
    }

    /**
     * Add effects from a single scripture
     * @param {Object} scripture - Scripture instance
     * @param {string} slot - Equipment slot
     */
    _addScriptureEffects(scripture, slot) {
        // Calculate base stat bonuses
        const statBonus = ENHANCEMENT_FORMULAS.calculateStatBonus(scripture);

        // Apply slot multipliers
        const slotMultiplier = this._getSlotMultiplier(slot);

        // Add cultivation effects
        this.activeEffects.cultivation.qiBonus += statBonus.qi * slotMultiplier;
        this.activeEffects.cultivation.bodyBonus += statBonus.body * slotMultiplier;
        this.activeEffects.cultivation.cultivationSpeed += statBonus.cultivation * slotMultiplier;

        // Add combat power based on scripture power
        const scripturepower = ENHANCEMENT_FORMULAS.scripturepower(scripture);
        this.activeEffects.combat.power += scripturepower * slotMultiplier;

        // Add special effects
        const scriptureData = SCRIPTURE_DATABASE[scripture.name];
        if (scriptureData && scriptureData.specialEffects) {
            for (const [effectName, effectDescription] of Object.entries(scriptureData.specialEffects)) {
                this.activeEffects.special.set(effectName, {
                    description: effectDescription,
                    source: scripture.name,
                    slot: slot
                });
            }
        }
    }

    /**
     * Get slot multiplier for effects
     * @param {string} slot - Equipment slot
     * @returns {number} Multiplier
     */
    _getSlotMultiplier(slot) {
        const multipliers = {
            primary: 1.0,
            secondary: 0.8,
            passive1: 0.5,
            passive2: 0.5,
            passive3: 0.5
        };

        return multipliers[slot] || 1.0;
    }

    /**
     * Calculate set bonuses from equipped scriptures
     * @param {Array} equippedScriptures - List of equipped scriptures
     */
    _calculateSetBonuses(equippedScriptures) {
        // Group scriptures by various criteria for set checking
        const schoolGroups = new Map();
        const elementGroups = new Map();
        const rarityGroups = new Map();

        for (const { scripture } of equippedScriptures) {
            const scriptureData = SCRIPTURE_DATABASE[scripture.name];
            if (!scriptureData) continue;

            // Group by school
            if (scriptureData.school) {
                if (!schoolGroups.has(scriptureData.school)) {
                    schoolGroups.set(scriptureData.school, []);
                }
                schoolGroups.get(scriptureData.school).push(scripture);
            }

            // Group by element
            if (scriptureData.element) {
                if (!elementGroups.has(scriptureData.element)) {
                    elementGroups.set(scriptureData.element, []);
                }
                elementGroups.get(scriptureData.element).push(scripture);
            }

            // Group by rarity
            if (!rarityGroups.has(scripture.rarity)) {
                rarityGroups.set(scripture.rarity, []);
            }
            rarityGroups.get(scripture.rarity).push(scripture);
        }

        // Check for set bonuses
        for (const [setId, setData] of Object.entries(SCRIPTURE_SETS)) {
            const setCount = this._calculateSetCount(setData, equippedScriptures, schoolGroups, elementGroups);

            if (setCount >= 2) {
                // Apply set bonuses
                const applicableBonuses = {};
                for (const [threshold, bonus] of Object.entries(setData.setBonus)) {
                    if (setCount >= parseInt(threshold)) {
                        Object.assign(applicableBonuses, bonus);
                    }
                }

                if (Object.keys(applicableBonuses).length > 0) {
                    this.activeSets.set(setId, {
                        name: setData.name,
                        count: setCount,
                        bonuses: applicableBonuses
                    });

                    // Apply bonuses to active effects
                    this._applySetBonuses(applicableBonuses);
                }
            }
        }
    }

    /**
     * Calculate how many scriptures match a set requirement
     * @param {Object} setData - Set data
     * @param {Array} equippedScriptures - Equipped scriptures
     * @param {Map} schoolGroups - Scriptures grouped by school
     * @param {Map} elementGroups - Scriptures grouped by element
     * @returns {number} Set count
     */
    _calculateSetCount(setData, equippedScriptures, schoolGroups, elementGroups) {
        if (setData.requiredScriptures.schools) {
            // Count by school matching
            let schoolMatches = 0;
            for (const requiredSchool of setData.requiredScriptures.schools) {
                if (schoolGroups.has(requiredSchool) && schoolGroups.get(requiredSchool).length > 0) {
                    schoolMatches++;
                }
            }
            return schoolMatches;
        }

        if (setData.requiredScriptures.elements) {
            // Count by element matching
            let elementMatches = 0;
            for (const requiredElement of setData.requiredScriptures.elements) {
                if (elementGroups.has(requiredElement) && elementGroups.get(requiredElement).length > 0) {
                    elementMatches++;
                }
            }
            return elementMatches;
        }

        if (setData.requiredScriptures.keywords) {
            // Count by keyword matching
            let keywordMatches = 0;
            for (const keyword of setData.requiredScriptures.keywords) {
                for (const { scripture } of equippedScriptures) {
                    const scriptureData = SCRIPTURE_DATABASE[scripture.name];
                    if (scriptureData && (
                        scriptureData.name.includes(keyword) ||
                        scriptureData.description.includes(keyword) ||
                        scriptureData.lore.includes(keyword)
                    )) {
                        keywordMatches++;
                        break; // Only count once per keyword
                    }
                }
            }
            return keywordMatches;
        }

        return 0;
    }

    /**
     * Apply set bonuses to active effects
     * @param {Object} bonuses - Set bonuses to apply
     */
    _applySetBonuses(bonuses) {
        for (const [bonusType, bonusValue] of Object.entries(bonuses)) {
            switch (bonusType) {
                case 'cultivationSpeed':
                    this.activeEffects.cultivation.cultivationSpeed += bonusValue;
                    break;
                case 'qiBonus':
                    this.activeEffects.cultivation.qiBonus += bonusValue;
                    break;
                case 'bodyBonus':
                    this.activeEffects.cultivation.bodyBonus += bonusValue;
                    break;
                case 'breakthroughChance':
                    this.activeEffects.cultivation.breakthroughChance += bonusValue;
                    break;
                case 'physicalPower':
                    this.activeEffects.combat.power += bonusValue * 1000; // Convert to power units
                    break;
                case 'elementalDamage':
                    this.activeEffects.combat.power += bonusValue * 500;
                    break;
                case 'elementalResistance':
                    this.activeEffects.combat.defense += bonusValue * 100;
                    break;
                default:
                    // Special bonuses stored as special effects
                    this.activeEffects.special.set(`set_${bonusType}`, {
                        description: `Set bonus: ${bonusType}`,
                        value: bonusValue,
                        source: 'set_bonus'
                    });
                    break;
            }
        }
    }

    /**
     * Apply filters to scripture list
     * @param {Array} scriptures - Scripture list
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered scriptures
     */
    _applyFilters(scriptures, filters) {
        return scriptures.filter(scripture => {
            // Rarity filter
            if (filters.rarity !== 'all' && scripture.rarity !== filters.rarity) {
                return false;
            }

            // Category filter
            if (filters.category !== 'all' && scripture.category !== filters.category) {
                return false;
            }

            // Level filter
            if (filters.level !== 'all') {
                const level = scripture.level || 1;
                if (filters.level === 'low' && level > 20) return false;
                if (filters.level === 'medium' && (level <= 20 || level > 60)) return false;
                if (filters.level === 'high' && level <= 60) return false;
            }

            // Equipped filter
            if (filters.equipped !== 'all') {
                const isEquipped = this._isScriptureEquipped(scripture.id);
                if (filters.equipped === 'equipped' && !isEquipped) return false;
                if (filters.equipped === 'unequipped' && isEquipped) return false;
            }

            return true;
        });
    }

    /**
     * Apply sorting to scripture list
     * @param {Array} scriptures - Scripture list
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted scriptures
     */
    _applySorting(scriptures, sortBy) {
        return scriptures.sort((a, b) => {
            switch (sortBy) {
                case 'power':
                    const powerA = ENHANCEMENT_FORMULAS.scripturepower(a);
                    const powerB = ENHANCEMENT_FORMULAS.scripturepower(b);
                    return powerB - powerA;

                case 'rarity':
                    const rarityA = this._getRarityLevel(a.rarity);
                    const rarityB = this._getRarityLevel(b.rarity);
                    return rarityB - rarityA;

                case 'level':
                    return (b.level || 1) - (a.level || 1);

                case 'name':
                    return a.name.localeCompare(b.name);

                case 'category':
                    return a.category.localeCompare(b.category);

                case 'obtained':
                    return (b.obtainedAt || 0) - (a.obtainedAt || 0);

                default:
                    return 0;
            }
        });
    }

    /**
     * Get numeric rarity level for sorting
     * @param {string} rarity - Rarity name
     * @returns {number} Rarity level
     */
    _getRarityLevel(rarity) {
        const levels = {
            'Common': 1,
            'Uncommon': 2,
            'Rare': 3,
            'Epic': 4,
            'Legendary': 5,
            'Mythical': 6
        };
        return levels[rarity] || 0;
    }

    /**
     * Update collection statistics
     */
    _updateStatistics() {
        this.statistics.totalScriptures = this.collectionState.scriptures.size;

        // Reset counters
        this.statistics.scripturesByRarity = {};
        this.statistics.scripturesByCategory = {};
        this.statistics.totalPower = 0;

        // Count by rarity and category
        for (const scripture of this.collectionState.scriptures.values()) {
            // Count by rarity
            if (!this.statistics.scripturesByRarity[scripture.rarity]) {
                this.statistics.scripturesByRarity[scripture.rarity] = 0;
            }
            this.statistics.scripturesByRarity[scripture.rarity]++;

            // Count by category
            if (!this.statistics.scripturesByCategory[scripture.category]) {
                this.statistics.scripturesByCategory[scripture.category] = 0;
            }
            this.statistics.scripturesByCategory[scripture.category]++;

            // Add to total power
            this.statistics.totalPower += ENHANCEMENT_FORMULAS.scripturepower(scripture);
        }

        // Calculate collection completion
        const totalUniqueScriptures = Object.keys(SCRIPTURE_DATABASE).length;
        const uniqueObtained = new Set();
        for (const scripture of this.collectionState.scriptures.values()) {
            uniqueObtained.add(scripture.name);
        }
        this.statistics.collectionCompletion = (uniqueObtained.size / totalUniqueScriptures) * 100;

        // Update favorites count
        this.statistics.favoriteCount = this.collectionState.favorites.size;
    }

    /**
     * Get count of equipped scriptures
     * @returns {number} Equipped count
     */
    _getEquippedCount() {
        return Object.values(this.collectionState.equipped).filter(id => id !== null).length;
    }

    /**
     * Calculate total collection value
     * @returns {number} Collection value
     */
    _calculateCollectionValue() {
        let totalValue = 0;

        for (const scripture of this.collectionState.scriptures.values()) {
            const rarityData = SCRIPTURE_RARITIES[scripture.rarity];
            const levelValue = (scripture.level || 1) * rarityData.enhancementCost.baseJade;
            const baseValue = rarityData.basePower;
            totalValue += baseValue + levelValue;
        }

        return totalValue;
    }

    /**
     * Calculate recommendation score for a scripture
     * @param {Object} scripture - Scripture to score
     * @param {Object} cultivationState - Current cultivation state
     * @returns {number} Recommendation score
     */
    _calculateRecommendationScore(scripture, cultivationState) {
        let score = 0;

        // Base score from scripture power
        score += ENHANCEMENT_FORMULAS.scripturepower(scripture) / 100;

        // Bonus for appropriate category based on cultivation balance
        const qiLevel = cultivationState.qi.level;
        const bodyLevel = cultivationState.body.level;

        if (qiLevel < bodyLevel && scripture.category === 'Qi Technique') {
            score += 50;
        } else if (bodyLevel < qiLevel && scripture.category === 'Body Technique') {
            score += 50;
        } else if (Math.abs(qiLevel - bodyLevel) < 10 && scripture.category === 'Dual Cultivation') {
            score += 30;
        }

        // Bonus for higher rarity
        score += this._getRarityLevel(scripture.rarity) * 10;

        // Penalty if already equipped
        if (this._isScriptureEquipped(scripture.id)) {
            score -= 100;
        }

        return score;
    }

    /**
     * Get recommendation reason
     * @param {Object} scripture - Recommended scripture
     * @param {Object} cultivationState - Current cultivation state
     * @returns {string} Recommendation reason
     */
    _getRecommendationReason(scripture, cultivationState) {
        const qiLevel = cultivationState.qi.level;
        const bodyLevel = cultivationState.body.level;

        if (qiLevel < bodyLevel && scripture.category === 'Qi Technique') {
            return 'Balances your qi cultivation which is lagging behind body cultivation';
        } else if (bodyLevel < qiLevel && scripture.category === 'Body Technique') {
            return 'Balances your body cultivation which is lagging behind qi cultivation';
        } else if (scripture.category === 'Dual Cultivation') {
            return 'Provides balanced growth for both cultivation paths';
        } else if (scripture.rarity === 'Legendary' || scripture.rarity === 'Mythical') {
            return `Exceptional ${scripture.rarity.toLowerCase()} scripture with powerful effects`;
        } else {
            return 'High power scripture suitable for your current level';
        }
    }

    /**
     * Get slot priorities for auto-equip based on mode
     * @param {string} mode - Auto-equip mode
     * @returns {Object} Slot priorities
     */
    _getSlotPriorities(mode) {
        const priorities = {
            cultivation: {
                primary: 1.0,
                secondary: 0.8,
                passive1: 0.6,
                passive2: 0.4,
                passive3: 0.2
            },
            combat: {
                primary: 1.0,
                passive1: 0.8,
                passive2: 0.6,
                secondary: 0.4,
                passive3: 0.2
            },
            balanced: {
                primary: 1.0,
                secondary: 0.7,
                passive1: 0.6,
                passive2: 0.5,
                passive3: 0.4
            }
        };

        return priorities[mode] || priorities.balanced;
    }

    /**
     * Calculate auto-equip score for a scripture
     * @param {Object} scripture - Scripture to score
     * @param {string} slot - Target slot
     * @param {string} mode - Auto-equip mode
     * @param {number} slotPriority - Priority multiplier for slot
     * @returns {number} Auto-equip score
     */
    _calculateAutoEquipScore(scripture, slot, mode, slotPriority) {
        let score = 0;

        // Base score from scripture power
        const power = ENHANCEMENT_FORMULAS.scripturepower(scripture);
        score += power * slotPriority;

        // Mode-specific bonuses
        if (mode === 'cultivation') {
            const statBonus = ENHANCEMENT_FORMULAS.calculateStatBonus(scripture);
            score += (statBonus.qi + statBonus.body + statBonus.cultivation) * 1000;
        } else if (mode === 'combat') {
            score += power * 2; // Double weight for combat mode
        }

        // Rarity bonus
        score += this._getRarityLevel(scripture.rarity) * 100;

        // Level bonus
        score += (scripture.level || 1) * 10;

        return score;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScriptureManager };
} else if (typeof window !== 'undefined') {
    window.ScriptureManager = ScriptureManager;
}