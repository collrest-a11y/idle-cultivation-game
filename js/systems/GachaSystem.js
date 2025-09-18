/**
 * GachaSystem - Fair gacha mechanics with multiple pools and pity systems
 * Handles scripture acquisition, rates, pity mechanics, and pull history
 */
class GachaSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Gacha state tracking
        this.gachaState = {
            currentPool: 'standard',
            pityCounts: {
                standard: { epic: 0, legendary: 0 },
                premium: { epic: 0, legendary: 0 },
                qi_focus: { epic: 0, legendary: 0 },
                body_focus: { epic: 0, legendary: 0 },
                event_limited: { epic: 0, legendary: 0 }
            },
            pullHistory: [],
            totalPulls: 0,
            guaranteedCounts: {},
            eventEndTimes: {}
        };

        // Rate calculation cache
        this.rateCache = new Map();
        this.lastRateUpdate = 0;

        // Pull animation queue
        this.pullQueue = [];
        this.isProcessingPulls = false;

        // Statistics tracking
        this.statistics = {
            totalPulls: 0,
            totalSpent: { jade: 0, crystals: 0 },
            scripturesObtained: {},
            averageRarity: 0,
            luckScore: 0
        };

        this.isInitialized = false;

        console.log('GachaSystem: Initialized');
    }

    /**
     * Initialize the gacha system
     */
    async initialize() {
        try {
            // Load gacha state from game state
            const savedState = this.gameState.get('gacha');
            if (savedState) {
                this.gachaState = {
                    ...this.gachaState,
                    ...savedState
                };
            }

            // Load statistics
            const savedStats = this.gameState.get('gachaStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Set up event listeners
            this._setupEventListeners();

            // Initialize guaranteed counts
            this._initializeGuaranteedCounts();

            // Update rate cache
            this._updateRateCache();

            this.isInitialized = true;

            this.eventManager.emit('gacha:initialized', {
                availablePools: Object.keys(GACHA_POOLS),
                currentPool: this.gachaState.currentPool
            });

            console.log('GachaSystem: Initialization complete');

        } catch (error) {
            console.error('GachaSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Perform a single gacha pull
     * @param {string} poolId - Pool to pull from
     * @param {Object} options - Pull options
     * @returns {Object} Pull result
     */
    async pullSingle(poolId = null, options = {}) {
        if (!this.isInitialized) {
            throw new Error('GachaSystem not initialized');
        }

        const pool = poolId || this.gachaState.currentPool;
        const poolData = GACHA_POOLS[pool];

        if (!poolData) {
            throw new Error(`Invalid pool: ${pool}`);
        }

        const config = {
            guaranteed: false,
            showAnimation: true,
            ...options
        };

        // Check if player can afford the pull
        const canAfford = this._checkAffordability(poolData.cost);
        if (!canAfford.canAfford) {
            return {
                success: false,
                reason: 'insufficient_resources',
                needed: canAfford.needed
            };
        }

        try {
            // Deduct costs
            this._deductCosts(poolData.cost);

            // Perform the pull
            const result = this._performPull(pool, config);

            // Update statistics
            this._updateStatistics(result, poolData.cost);

            // Update pity counters
            this._updatePityCounters(pool, result);

            // Add to pull history
            this._addToPullHistory(result, pool);

            // Save state
            this.saveState();

            // Emit events
            this.eventManager.emit('gacha:pull_complete', {
                result: result,
                pool: pool,
                cost: poolData.cost
            });

            if (result.rarity === 'Legendary' || result.rarity === 'Mythical') {
                this.eventManager.emit('gacha:rare_pull', {
                    scripture: result,
                    rarity: result.rarity
                });
            }

            return {
                success: true,
                result: result,
                cost: poolData.cost
            };

        } catch (error) {
            console.error('GachaSystem: Pull failed:', error);
            return {
                success: false,
                reason: 'pull_failed',
                error: error.message
            };
        }
    }

    /**
     * Perform multiple gacha pulls
     * @param {number} count - Number of pulls (1, 5, or 10)
     * @param {string} poolId - Pool to pull from
     * @param {Object} options - Pull options
     * @returns {Object} Multi-pull result
     */
    async pullMultiple(count, poolId = null, options = {}) {
        if (!this.isInitialized) {
            throw new Error('GachaSystem not initialized');
        }

        if (![1, 5, 10].includes(count)) {
            throw new Error('Invalid pull count. Must be 1, 5, or 10');
        }

        const pool = poolId || this.gachaState.currentPool;
        const poolData = GACHA_POOLS[pool];

        if (!poolData) {
            throw new Error(`Invalid pool: ${pool}`);
        }

        const config = {
            showAnimation: true,
            guaranteeRare: count >= 10, // 10-pull guarantees at least one rare
            ...options
        };

        // Calculate total cost
        const totalCost = {
            jade: (poolData.cost.jade || 0) * count,
            crystals: (poolData.cost.crystals || 0) * count
        };

        // Apply discounts for multi-pulls
        if (count === 5) {
            totalCost.jade = Math.floor(totalCost.jade * 0.95); // 5% discount
            totalCost.crystals = Math.floor(totalCost.crystals * 0.95);
        } else if (count === 10) {
            totalCost.jade = Math.floor(totalCost.jade * 0.9); // 10% discount
            totalCost.crystals = Math.floor(totalCost.crystals * 0.9);
        }

        // Check affordability
        const canAfford = this._checkAffordability(totalCost);
        if (!canAfford.canAfford) {
            return {
                success: false,
                reason: 'insufficient_resources',
                needed: canAfford.needed
            };
        }

        try {
            // Deduct costs
            this._deductCosts(totalCost);

            // Perform pulls
            const results = [];
            let guaranteedRareUsed = false;

            for (let i = 0; i < count; i++) {
                const isLastPull = (i === count - 1);
                const shouldGuaranteeRare = config.guaranteeRare && isLastPull && !this._hasRareOrBetter(results);

                const pullConfig = {
                    guaranteed: shouldGuaranteeRare,
                    showAnimation: false // We'll handle animation for the batch
                };

                const result = this._performPull(pool, pullConfig);
                results.push(result);

                if (shouldGuaranteeRare && result.rarity !== 'Common' && result.rarity !== 'Uncommon') {
                    guaranteedRareUsed = true;
                }

                // Update pity counters for each pull
                this._updatePityCounters(pool, result);
            }

            // Update statistics
            for (const result of results) {
                this._updateStatistics(result, poolData.cost);
                this._addToPullHistory(result, pool);
            }

            // Save state
            this.saveState();

            // Emit events
            this.eventManager.emit('gacha:multi_pull_complete', {
                results: results,
                count: count,
                pool: pool,
                totalCost: totalCost,
                guaranteedRareUsed: guaranteedRareUsed
            });

            // Check for rare pulls
            const rarePulls = results.filter(r => r.rarity === 'Legendary' || r.rarity === 'Mythical');
            if (rarePulls.length > 0) {
                this.eventManager.emit('gacha:rare_multi_pull', {
                    rarePulls: rarePulls,
                    totalResults: results
                });
            }

            return {
                success: true,
                results: results,
                count: count,
                totalCost: totalCost,
                rarePulls: rarePulls.length,
                guaranteedRareUsed: guaranteedRareUsed
            };

        } catch (error) {
            console.error('GachaSystem: Multi-pull failed:', error);
            return {
                success: false,
                reason: 'pull_failed',
                error: error.message
            };
        }
    }

    /**
     * Get current pool information and rates
     * @param {string} poolId - Pool to get info for
     * @returns {Object} Pool information
     */
    getPoolInfo(poolId = null) {
        const pool = poolId || this.gachaState.currentPool;
        const poolData = GACHA_POOLS[pool];

        if (!poolData) {
            return null;
        }

        const pityInfo = this.gachaState.pityCounts[pool] || { epic: 0, legendary: 0 };
        const rates = this._calculateCurrentRates(pool);

        return {
            id: pool,
            name: poolData.name,
            description: poolData.description,
            cost: poolData.cost,
            guaranteedRarity: poolData.guaranteedRarity,
            pitySystem: poolData.pitySystem,
            currentPity: pityInfo,
            rates: rates,
            availableScriptures: this._getAvailableScriptures(pool),
            nextGuaranteed: this._calculateNextGuaranteed(pool)
        };
    }

    /**
     * Switch to a different gacha pool
     * @param {string} poolId - Pool to switch to
     * @returns {boolean} Success status
     */
    switchPool(poolId) {
        if (!GACHA_POOLS[poolId]) {
            return false;
        }

        // Check if pool is available (for time-limited pools)
        if (!this._isPoolAvailable(poolId)) {
            return false;
        }

        this.gachaState.currentPool = poolId;
        this.saveState();

        this.eventManager.emit('gacha:pool_switched', {
            newPool: poolId,
            poolInfo: this.getPoolInfo(poolId)
        });

        return true;
    }

    /**
     * Get gacha statistics and history
     * @returns {Object} Statistics and history
     */
    getStatistics() {
        const recentPulls = this.gachaState.pullHistory.slice(-100); // Last 100 pulls
        const rarityBreakdown = this._calculateRarityBreakdown(recentPulls);

        return {
            totalPulls: this.statistics.totalPulls,
            totalSpent: this.statistics.totalSpent,
            scripturesObtained: this.statistics.scripturesObtained,
            averageRarity: this.statistics.averageRarity,
            luckScore: this.statistics.luckScore,
            recentPulls: recentPulls,
            rarityBreakdown: rarityBreakdown,
            currentPity: this.gachaState.pityCounts,
            pullHistory: this.gachaState.pullHistory.slice(-50) // Last 50 for display
        };
    }

    /**
     * Get all available pools
     * @returns {Array} Available pool information
     */
    getAvailablePools() {
        const pools = [];

        for (const [poolId, poolData] of Object.entries(GACHA_POOLS)) {
            if (this._isPoolAvailable(poolId)) {
                pools.push({
                    id: poolId,
                    name: poolData.name,
                    description: poolData.description,
                    cost: poolData.cost,
                    guaranteedRarity: poolData.guaranteedRarity,
                    isLimited: poolData.timeLimit || false,
                    endTime: this.gachaState.eventEndTimes[poolId] || null
                });
            }
        }

        return pools;
    }

    /**
     * Simulate gacha pulls for testing
     * @param {number} pullCount - Number of simulated pulls
     * @param {string} poolId - Pool to simulate
     * @returns {Object} Simulation results
     */
    simulatePulls(pullCount, poolId = null) {
        const pool = poolId || this.gachaState.currentPool;
        const results = { total: pullCount, rarities: {} };

        // Initialize rarity counters
        for (const rarity of Object.keys(SCRIPTURE_RARITIES)) {
            results.rarities[rarity] = 0;
        }

        // Simulate pulls
        for (let i = 0; i < pullCount; i++) {
            const rarity = this._simulateSinglePull(pool);
            results.rarities[rarity]++;
        }

        // Calculate percentages
        results.percentages = {};
        for (const [rarity, count] of Object.entries(results.rarities)) {
            results.percentages[rarity] = (count / pullCount * 100).toFixed(2);
        }

        return results;
    }

    /**
     * Save gacha state to game state
     */
    saveState() {
        this.gameState.update({
            gacha: this.gachaState,
            gachaStats: this.statistics
        }, { source: 'gacha:save' });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save state on significant events
        this.eventManager.on('gacha:pull_complete', () => {
            this.saveState();
        });

        this.eventManager.on('gameState:save', () => {
            this.saveState();
        });
    }

    /**
     * Initialize guaranteed counts for pools
     */
    _initializeGuaranteedCounts() {
        for (const poolId of Object.keys(GACHA_POOLS)) {
            if (!this.gachaState.guaranteedCounts[poolId]) {
                this.gachaState.guaranteedCounts[poolId] = {
                    epic: 0,
                    legendary: 0
                };
            }
        }
    }

    /**
     * Update rate calculation cache
     */
    _updateRateCache() {
        this.rateCache.clear();
        this.lastRateUpdate = Date.now();

        for (const poolId of Object.keys(GACHA_POOLS)) {
            this.rateCache.set(poolId, this._calculateCurrentRates(poolId));
        }
    }

    /**
     * Check if player can afford the cost
     * @param {Object} cost - Cost object
     * @returns {Object} Affordability check result
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
     * Perform a single pull calculation
     * @param {string} poolId - Pool to pull from
     * @param {Object} config - Pull configuration
     * @returns {Object} Pull result
     */
    _performPull(poolId, config) {
        const poolData = GACHA_POOLS[poolId];
        const pityInfo = this.gachaState.pityCounts[poolId];

        // Determine rarity based on rates and pity
        let rarity = this._determineRarity(poolId, config, pityInfo);

        // Handle guaranteed rarity from pool
        if (poolData.guaranteedRarity && !config.guaranteed) {
            const guaranteedRarityLevel = this._getRarityLevel(poolData.guaranteedRarity);
            const currentRarityLevel = this._getRarityLevel(rarity);

            if (currentRarityLevel < guaranteedRarityLevel) {
                rarity = poolData.guaranteedRarity;
            }
        }

        // Select specific scripture from the determined rarity
        const scripture = this._selectScripture(poolId, rarity);

        // Create scripture instance
        const scriptureInstance = {
            id: this._generateScriptureId(),
            name: scripture.name,
            scriptureId: scripture.id,
            rarity: rarity,
            category: scripture.category,
            level: 1,
            experience: 0,
            awakening: false,
            obtainedAt: Date.now(),
            obtainedFrom: poolId,
            power: ENHANCEMENT_FORMULAS.scripturepower({ rarity: rarity, level: 1 }),
            stats: ENHANCEMENT_FORMULAS.calculateStatBonus({
                rarity: rarity,
                category: scripture.category,
                name: scripture.name,
                level: 1
            })
        };

        return scriptureInstance;
    }

    /**
     * Determine rarity for a pull
     * @param {string} poolId - Pool ID
     * @param {Object} config - Pull configuration
     * @param {Object} pityInfo - Current pity information
     * @returns {string} Determined rarity
     */
    _determineRarity(poolId, config, pityInfo) {
        const poolData = GACHA_POOLS[poolId];

        // Check for hard pity (guaranteed legendary)
        if (pityInfo.legendary >= poolData.pitySystem.legendaryPity) {
            return 'Legendary';
        }

        // Check for epic pity (guaranteed epic or better)
        if (pityInfo.epic >= poolData.pitySystem.hardPity) {
            return Math.random() < 0.3 ? 'Legendary' : 'Epic'; // 30% legendary, 70% epic
        }

        // Calculate base rates with pity modifiers
        const baseRates = this._getBaseRates();
        const modifiedRates = this._applyPoolModifiers(baseRates, poolData);
        const finalRates = this._applyPityModifiers(modifiedRates, pityInfo, poolData.pitySystem);

        // Handle guaranteed rare for forced pulls
        if (config.guaranteed) {
            return this._selectRareOrBetter(finalRates);
        }

        // Standard rarity determination
        return this._selectRarityFromRates(finalRates);
    }

    /**
     * Get base rarity rates
     * @returns {Object} Base rates for each rarity
     */
    _getBaseRates() {
        const rates = {};
        for (const [rarity, data] of Object.entries(SCRIPTURE_RARITIES)) {
            rates[rarity] = data.dropRate;
        }
        return rates;
    }

    /**
     * Apply pool-specific rate modifiers
     * @param {Object} baseRates - Base rates
     * @param {Object} poolData - Pool data
     * @returns {Object} Modified rates
     */
    _applyPoolModifiers(baseRates, poolData) {
        const modifiedRates = { ...baseRates };

        if (poolData.rateModifiers) {
            for (const [rarity, modifier] of Object.entries(poolData.rateModifiers)) {
                if (modifiedRates[rarity]) {
                    modifiedRates[rarity] *= modifier;
                }
            }
        }

        // Normalize rates to ensure they sum to 1
        const totalRate = Object.values(modifiedRates).reduce((sum, rate) => sum + rate, 0);
        for (const rarity of Object.keys(modifiedRates)) {
            modifiedRates[rarity] /= totalRate;
        }

        return modifiedRates;
    }

    /**
     * Apply pity system modifiers to rates
     * @param {Object} baseRates - Base rates
     * @param {Object} pityInfo - Current pity information
     * @param {Object} pitySystem - Pity system configuration
     * @returns {Object} Pity-modified rates
     */
    _applyPityModifiers(baseRates, pityInfo, pitySystem) {
        const modifiedRates = { ...baseRates };

        // Soft pity for epic (gradually increases epic+ rates)
        if (pityInfo.epic >= pitySystem.softPity) {
            const softPityFactor = 1 + (pityInfo.epic - pitySystem.softPity) * 0.1;
            modifiedRates.Epic *= softPityFactor;
            modifiedRates.Legendary *= softPityFactor;
            modifiedRates.Mythical *= softPityFactor;
        }

        // Soft pity for legendary (after certain epic pity)
        if (pityInfo.legendary >= pitySystem.softPity * 1.5) {
            const legendaryPityFactor = 1 + (pityInfo.legendary - pitySystem.softPity * 1.5) * 0.05;
            modifiedRates.Legendary *= legendaryPityFactor;
            modifiedRates.Mythical *= legendaryPityFactor;
        }

        // Normalize rates
        const totalRate = Object.values(modifiedRates).reduce((sum, rate) => sum + rate, 0);
        for (const rarity of Object.keys(modifiedRates)) {
            modifiedRates[rarity] /= totalRate;
        }

        return modifiedRates;
    }

    /**
     * Select rarity from weighted rates
     * @param {Object} rates - Weighted rates
     * @returns {string} Selected rarity
     */
    _selectRarityFromRates(rates) {
        const random = Math.random();
        let cumulative = 0;

        // Sort by rarity level (common first, mythical last)
        const sortedRarities = Object.keys(rates).sort((a, b) =>
            this._getRarityLevel(a) - this._getRarityLevel(b)
        );

        for (const rarity of sortedRarities) {
            cumulative += rates[rarity];
            if (random <= cumulative) {
                return rarity;
            }
        }

        // Fallback to most common
        return 'Common';
    }

    /**
     * Select rare or better rarity for guaranteed pulls
     * @param {Object} rates - Weighted rates
     * @returns {string} Selected rarity (rare or better)
     */
    _selectRareOrBetter(rates) {
        const rareOrBetterRates = {};
        const excludeRarities = ['Common', 'Uncommon'];

        for (const [rarity, rate] of Object.entries(rates)) {
            if (!excludeRarities.includes(rarity)) {
                rareOrBetterRates[rarity] = rate;
            }
        }

        // Normalize the rare+ rates
        const totalRate = Object.values(rareOrBetterRates).reduce((sum, rate) => sum + rate, 0);
        for (const rarity of Object.keys(rareOrBetterRates)) {
            rareOrBetterRates[rarity] /= totalRate;
        }

        return this._selectRarityFromRates(rareOrBetterRates);
    }

    /**
     * Get numeric level for rarity (for comparison)
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
     * Select specific scripture from pool and rarity
     * @param {string} poolId - Pool ID
     * @param {string} rarity - Target rarity
     * @returns {Object} Selected scripture data
     */
    _selectScripture(poolId, rarity) {
        const availableScriptures = this._getAvailableScriptures(poolId);
        const scripturesOfRarity = availableScriptures.filter(s => s.rarity === rarity);

        if (scripturesOfRarity.length === 0) {
            // Fallback to any scripture of this rarity
            const allScriptures = Object.values(SCRIPTURE_DATABASE);
            const fallbackScriptures = allScriptures.filter(s => s.rarity === rarity);

            if (fallbackScriptures.length > 0) {
                return fallbackScriptures[Math.floor(Math.random() * fallbackScriptures.length)];
            }

            // Last resort fallback
            return Object.values(SCRIPTURE_DATABASE)[0];
        }

        // Apply category bonuses if pool has them
        const poolData = GACHA_POOLS[poolId];
        if (poolData.categoryBonus) {
            const weightedScriptures = [];

            for (const scripture of scripturesOfRarity) {
                const categoryWeight = poolData.categoryBonus[scripture.category] || 1.0;
                const weight = Math.max(1, Math.floor(categoryWeight * 100));

                for (let i = 0; i < weight; i++) {
                    weightedScriptures.push(scripture);
                }
            }

            return weightedScriptures[Math.floor(Math.random() * weightedScriptures.length)];
        }

        // Standard random selection
        return scripturesOfRarity[Math.floor(Math.random() * scripturesOfRarity.length)];
    }

    /**
     * Get available scriptures for a pool
     * @param {string} poolId - Pool ID
     * @returns {Array} Available scriptures
     */
    _getAvailableScriptures(poolId) {
        const poolData = GACHA_POOLS[poolId];
        const allScriptures = Object.values(SCRIPTURE_DATABASE);

        if (poolData.availableScriptures === 'all') {
            return allScriptures;
        }

        if (poolData.availableScriptures === 'filtered') {
            // Apply category filtering
            if (poolData.categoryBonus) {
                return allScriptures.filter(scripture => {
                    return poolData.categoryBonus[scripture.category] !== undefined;
                });
            }
        }

        if (poolData.availableScriptures === 'event') {
            // Return event-specific scriptures (could be customized per event)
            return allScriptures.filter(scripture =>
                scripture.rarity === 'Epic' ||
                scripture.rarity === 'Legendary' ||
                scripture.rarity === 'Mythical'
            );
        }

        return allScriptures;
    }

    /**
     * Update pity counters after a pull
     * @param {string} poolId - Pool ID
     * @param {Object} result - Pull result
     */
    _updatePityCounters(poolId, result) {
        const pityInfo = this.gachaState.pityCounts[poolId];

        if (result.rarity === 'Legendary' || result.rarity === 'Mythical') {
            // Reset both counters on legendary+
            pityInfo.epic = 0;
            pityInfo.legendary = 0;
        } else if (result.rarity === 'Epic') {
            // Reset epic counter, increment legendary counter
            pityInfo.epic = 0;
            pityInfo.legendary++;
        } else {
            // Increment both counters
            pityInfo.epic++;
            pityInfo.legendary++;
        }
    }

    /**
     * Update statistics after a pull
     * @param {Object} result - Pull result
     * @param {Object} cost - Pull cost
     */
    _updateStatistics(result, cost) {
        this.statistics.totalPulls++;

        if (cost.jade) this.statistics.totalSpent.jade += cost.jade;
        if (cost.crystals) this.statistics.totalSpent.crystals += cost.crystals;

        if (!this.statistics.scripturesObtained[result.rarity]) {
            this.statistics.scripturesObtained[result.rarity] = 0;
        }
        this.statistics.scripturesObtained[result.rarity]++;

        // Update average rarity
        this._recalculateAverageRarity();

        // Update luck score
        this._calculateLuckScore();
    }

    /**
     * Add pull to history
     * @param {Object} result - Pull result
     * @param {string} poolId - Pool ID
     */
    _addToPullHistory(result, poolId) {
        this.gachaState.pullHistory.push({
            id: result.id,
            name: result.name,
            rarity: result.rarity,
            category: result.category,
            pool: poolId,
            timestamp: result.obtainedAt
        });

        // Keep history manageable (last 1000 pulls)
        if (this.gachaState.pullHistory.length > 1000) {
            this.gachaState.pullHistory = this.gachaState.pullHistory.slice(-1000);
        }
    }

    /**
     * Check if results contain rare or better scripture
     * @param {Array} results - Pull results
     * @returns {boolean} Has rare or better
     */
    _hasRareOrBetter(results) {
        return results.some(result =>
            !['Common', 'Uncommon'].includes(result.rarity)
        );
    }

    /**
     * Calculate current rates for a pool
     * @param {string} poolId - Pool ID
     * @returns {Object} Current rates
     */
    _calculateCurrentRates(poolId) {
        const poolData = GACHA_POOLS[poolId];
        const pityInfo = this.gachaState.pityCounts[poolId] || { epic: 0, legendary: 0 };

        const baseRates = this._getBaseRates();
        const modifiedRates = this._applyPoolModifiers(baseRates, poolData);
        const finalRates = this._applyPityModifiers(modifiedRates, pityInfo, poolData.pitySystem);

        return finalRates;
    }

    /**
     * Calculate next guaranteed for a pool
     * @param {string} poolId - Pool ID
     * @returns {Object} Next guaranteed information
     */
    _calculateNextGuaranteed(poolId) {
        const poolData = GACHA_POOLS[poolId];
        const pityInfo = this.gachaState.pityCounts[poolId] || { epic: 0, legendary: 0 };

        return {
            nextEpic: poolData.pitySystem.hardPity - pityInfo.epic,
            nextLegendary: poolData.pitySystem.legendaryPity - pityInfo.legendary
        };
    }

    /**
     * Check if a pool is currently available
     * @param {string} poolId - Pool ID
     * @returns {boolean} Is available
     */
    _isPoolAvailable(poolId) {
        const poolData = GACHA_POOLS[poolId];

        if (!poolData.timeLimit) {
            return true;
        }

        const endTime = this.gachaState.eventEndTimes[poolId];
        return endTime ? Date.now() < endTime : false;
    }

    /**
     * Calculate rarity breakdown for statistics
     * @param {Array} pulls - Pull history
     * @returns {Object} Rarity breakdown
     */
    _calculateRarityBreakdown(pulls) {
        const breakdown = {};

        for (const rarity of Object.keys(SCRIPTURE_RARITIES)) {
            breakdown[rarity] = 0;
        }

        for (const pull of pulls) {
            if (breakdown[pull.rarity] !== undefined) {
                breakdown[pull.rarity]++;
            }
        }

        return breakdown;
    }

    /**
     * Recalculate average rarity
     */
    _recalculateAverageRarity() {
        let totalValue = 0;
        let totalPulls = 0;

        for (const [rarity, count] of Object.entries(this.statistics.scripturesObtained)) {
            const rarityValue = this._getRarityLevel(rarity);
            totalValue += rarityValue * count;
            totalPulls += count;
        }

        this.statistics.averageRarity = totalPulls > 0 ? totalValue / totalPulls : 0;
    }

    /**
     * Calculate luck score based on pulls vs expected rates
     */
    _calculateLuckScore() {
        // Simple luck calculation based on legendary+ rate vs expected
        const legendaryPulls = (this.statistics.scripturesObtained.Legendary || 0) +
                              (this.statistics.scripturesObtained.Mythical || 0);
        const expectedLegendary = this.statistics.totalPulls * 0.01; // Expected 1% rate

        if (expectedLegendary > 0) {
            this.statistics.luckScore = Math.round((legendaryPulls / expectedLegendary) * 100);
        } else {
            this.statistics.luckScore = 100;
        }
    }

    /**
     * Simulate a single pull for testing
     * @param {string} poolId - Pool ID
     * @returns {string} Simulated rarity
     */
    _simulateSinglePull(poolId) {
        const rates = this._calculateCurrentRates(poolId);
        return this._selectRarityFromRates(rates);
    }

    /**
     * Generate unique scripture ID
     * @returns {string} Unique ID
     */
    _generateScriptureId() {
        return `scripture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GachaSystem };
} else if (typeof window !== 'undefined') {
    window.GachaSystem = GachaSystem;
}