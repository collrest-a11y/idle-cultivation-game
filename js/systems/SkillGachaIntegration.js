/**
 * SkillGachaIntegration - Integrates skill fragments with existing gacha system
 * Provides skill fragment drops and skill-specific gacha mechanics
 */
class SkillGachaIntegration {
    constructor(gameState, eventManager, skillSystem) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.skillSystem = skillSystem;

        // Fragment drop rates and mechanics
        this.fragmentDropRates = {
            // Base fragment drops from various activities
            cultivation: {
                baseRate: 0.02,  // 2% chance per hour
                bonusPerRealm: 0.005
            },
            combat: {
                baseRate: 0.05,  // 5% chance per victory
                streakBonus: 0.001,
                maxStreakBonus: 0.02
            },
            meditation: {
                baseRate: 0.03,  // 3% chance per session
                durationBonus: 0.001  // +0.1% per minute
            }
        };

        // Skill fragment gacha pools
        this.skillGachaPools = {
            skill_basic: {
                name: 'Basic Skill Fragments',
                cost: { type: 'jade', amount: 100 },
                rates: {
                    common: 0.70,
                    uncommon: 0.25,
                    rare: 0.05,
                    epic: 0.00,
                    legendary: 0.00,
                    transcendent: 0.00
                },
                fragmentCount: { min: 1, max: 3 }
            },
            skill_premium: {
                name: 'Premium Skill Fragments',
                cost: { type: 'crystals', amount: 10 },
                rates: {
                    common: 0.40,
                    uncommon: 0.35,
                    rare: 0.20,
                    epic: 0.045,
                    legendary: 0.004,
                    transcendent: 0.001
                },
                fragmentCount: { min: 2, max: 5 }
            },
            skill_focused: {
                name: 'Focused Skill Fragments',
                cost: { type: 'crystals', amount: 15 },
                rates: {
                    // Focused on specific categories based on player selection
                    multiplier: 1.5  // 50% higher rates for selected category
                },
                fragmentCount: { min: 3, max: 6 }
            }
        };

        this.isInitialized = false;

        console.log('SkillGachaIntegration: Initialized');
    }

    /**
     * Initialize the skill gacha integration
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                return;
            }

            // Set up event listeners for fragment drops
            this._setupFragmentDropListeners();

            // Load fragment generation state
            this._loadFragmentState();

            this.isInitialized = true;

            console.log('SkillGachaIntegration: Initialization complete');

        } catch (error) {
            console.error('SkillGachaIntegration: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Perform skill fragment gacha pull
     * @param {string} poolId - Gacha pool to pull from
     * @param {number} pullCount - Number of pulls (1 or 10)
     * @returns {Object} Pull results
     */
    async performSkillFragmentPull(poolId, pullCount = 1) {
        if (!this.isInitialized) {
            throw new Error('SkillGachaIntegration not initialized');
        }

        try {
            const pool = this.skillGachaPools[poolId];
            if (!pool) {
                throw new Error(`Unknown skill fragment pool: ${poolId}`);
            }

            // Check if player can afford the pull
            const totalCost = pool.cost.amount * pullCount;
            if (!this._canAffordPull(pool.cost.type, totalCost)) {
                return {
                    success: false,
                    error: `Not enough ${pool.cost.type} (need ${totalCost})`
                };
            }

            // Perform pulls
            const results = [];
            let totalFragments = 0;

            for (let i = 0; i < pullCount; i++) {
                const pullResult = this._performSingleSkillPull(pool);
                results.push(pullResult);
                totalFragments += pullResult.fragmentCount;
            }

            // Deduct cost
            this._deductCost(pool.cost.type, totalCost);

            // Apply fragments to skill system
            this._applyFragmentRewards(results);

            // Update statistics
            this._updateGachaStatistics(poolId, pullCount, results);

            // Emit pull event
            this.eventManager.emit('skillGacha:pullComplete', {
                poolId,
                pullCount,
                results,
                totalFragments,
                cost: totalCost,
                costType: pool.cost.type
            });

            return {
                success: true,
                results,
                totalFragments,
                summary: this._generatePullSummary(results)
            };

        } catch (error) {
            console.error('SkillGachaIntegration: Pull failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate skill fragments from game activities
     * @param {string} activityType - Type of activity (cultivation, combat, meditation)
     * @param {Object} context - Activity context
     * @returns {Object} Fragment generation result
     */
    generateFragmentsFromActivity(activityType, context = {}) {
        if (!this.isInitialized) {
            return { fragments: 0, skillFragments: [] };
        }

        try {
            const dropConfig = this.fragmentDropRates[activityType];
            if (!dropConfig) {
                return { fragments: 0, skillFragments: [] };
            }

            // Calculate drop chance
            let dropChance = dropConfig.baseRate;

            // Apply bonuses based on context
            if (activityType === 'combat' && context.winStreak) {
                const streakBonus = Math.min(
                    context.winStreak * dropConfig.streakBonus,
                    dropConfig.maxStreakBonus
                );
                dropChance += streakBonus;
            }

            if (activityType === 'meditation' && context.duration) {
                const durationBonus = (context.duration / 60) * dropConfig.durationBonus;
                dropChance += durationBonus;
            }

            if (activityType === 'cultivation' && context.realm) {
                const realmBonus = this._getRealmLevel(context.realm) * dropConfig.bonusPerRealm;
                dropChance += realmBonus;
            }

            // Check if fragments drop
            if (Math.random() > dropChance) {
                return { fragments: 0, skillFragments: [] };
            }

            // Generate fragment rewards
            const fragmentCount = this._rollFragmentCount(activityType);
            const skillFragments = this._generateRandomSkillFragments(fragmentCount);

            // Apply fragments
            this._addSkillFragments(fragmentCount);

            // Emit fragment drop event
            this.eventManager.emit('skillGacha:fragmentsDropped', {
                activityType,
                context,
                fragmentCount,
                skillFragments,
                dropChance
            });

            return {
                fragments: fragmentCount,
                skillFragments,
                dropChance
            };

        } catch (error) {
            console.error('SkillGachaIntegration: Fragment generation failed:', error);
            return { fragments: 0, skillFragments: [] };
        }
    }

    /**
     * Get current skill fragment counts
     * @returns {Object} Fragment counts by rarity
     */
    getFragmentCounts() {
        const skillsState = this.gameState.get('skills') || {};
        return {
            total: skillsState.fragments || 0,
            byRarity: skillsState.fragmentsByRarity || {
                common: 0,
                uncommon: 0,
                rare: 0,
                epic: 0,
                legendary: 0,
                transcendent: 0
            }
        };
    }

    // Private methods

    /**
     * Set up event listeners for fragment drops
     */
    _setupFragmentDropListeners() {
        // Listen for cultivation progress
        this.eventManager.on('cultivation:progressMade', (data) => {
            const result = this.generateFragmentsFromActivity('cultivation', {
                realm: data.realm,
                progress: data.progress
            });

            if (result.fragments > 0) {
                console.log(`Cultivation fragment drop: ${result.fragments} fragments`);
            }
        });

        // Listen for combat victories
        this.eventManager.on('combat:victory', (data) => {
            const result = this.generateFragmentsFromActivity('combat', {
                winStreak: data.winStreak,
                difficulty: data.difficulty
            });

            if (result.fragments > 0) {
                console.log(`Combat fragment drop: ${result.fragments} fragments`);
            }
        });

        // Listen for meditation completion
        this.eventManager.on('cultivation:meditationComplete', (data) => {
            const result = this.generateFragmentsFromActivity('meditation', {
                duration: data.duration,
                efficiency: data.efficiency
            });

            if (result.fragments > 0) {
                console.log(`Meditation fragment drop: ${result.fragments} fragments`);
            }
        });
    }

    /**
     * Load fragment generation state
     */
    _loadFragmentState() {
        // Initialize fragment counts if not present
        const skillsState = this.gameState.get('skills') || {};
        if (!skillsState.fragments) {
            skillsState.fragments = 0;
        }
        if (!skillsState.fragmentsByRarity) {
            skillsState.fragmentsByRarity = {
                common: 0,
                uncommon: 0,
                rare: 0,
                epic: 0,
                legendary: 0,
                transcendent: 0
            };
        }
        this.gameState.set('skills', skillsState);
    }

    /**
     * Perform a single skill fragment pull
     * @param {Object} pool - Gacha pool configuration
     * @returns {Object} Pull result
     */
    _performSingleSkillPull(pool) {
        // Roll for rarity
        const rarity = this._rollRarity(pool.rates);

        // Roll for fragment count
        const fragmentCount = Math.floor(
            Math.random() * (pool.fragmentCount.max - pool.fragmentCount.min + 1)
        ) + pool.fragmentCount.min;

        // Generate specific skill fragments of that rarity
        const skillFragments = this._generateSkillFragmentsOfRarity(rarity, fragmentCount);

        return {
            rarity,
            fragmentCount,
            skillFragments,
            timestamp: Date.now()
        };
    }

    /**
     * Roll for rarity based on rates
     * @param {Object} rates - Rarity rates
     * @returns {string} Selected rarity
     */
    _rollRarity(rates) {
        const roll = Math.random();
        let cumulative = 0;

        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'transcendent'];

        for (const rarity of rarities) {
            cumulative += rates[rarity] || 0;
            if (roll <= cumulative) {
                return rarity;
            }
        }

        return 'common'; // Fallback
    }

    /**
     * Generate skill fragments of specific rarity
     * @param {string} rarity - Target rarity
     * @param {number} count - Number of fragments
     * @returns {Array} Generated skill fragments
     */
    _generateSkillFragmentsOfRarity(rarity, count) {
        const skillFragments = [];

        // Get skills of this rarity
        const availableSkills = this._getSkillsByRarity(rarity);

        if (availableSkills.length === 0) {
            return skillFragments;
        }

        for (let i = 0; i < count; i++) {
            const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            skillFragments.push({
                skillId: randomSkill.id,
                skillName: randomSkill.name,
                rarity: rarity,
                fragmentsAdded: 1
            });
        }

        return skillFragments;
    }

    /**
     * Get skills by rarity
     * @param {string} rarity - Target rarity
     * @returns {Array} Skills of that rarity
     */
    _getSkillsByRarity(rarity) {
        if (!window.SkillData?.SKILL_DEFINITIONS) {
            return [];
        }

        return Object.values(window.SkillData.SKILL_DEFINITIONS)
            .filter(skill => skill.rarity === rarity);
    }

    /**
     * Check if player can afford a pull
     * @param {string} costType - Cost type (jade/crystals)
     * @param {number} amount - Cost amount
     * @returns {boolean} Whether player can afford
     */
    _canAffordPull(costType, amount) {
        const resources = this.gameState.get('resources') || {};
        const currentAmount = resources[costType] || 0;
        return currentAmount >= amount;
    }

    /**
     * Deduct cost from player resources
     * @param {string} costType - Cost type
     * @param {number} amount - Amount to deduct
     */
    _deductCost(costType, amount) {
        const resources = this.gameState.get('resources') || {};
        resources[costType] = (resources[costType] || 0) - amount;
        this.gameState.set('resources', resources);
    }

    /**
     * Add skill fragments to player inventory
     * @param {number} amount - Amount to add
     */
    _addSkillFragments(amount) {
        const skillsState = this.gameState.get('skills') || {};
        skillsState.fragments = (skillsState.fragments || 0) + amount;
        this.gameState.set('skills', skillsState);
    }

    /**
     * Apply fragment rewards from gacha results
     * @param {Array} results - Gacha pull results
     */
    _applyFragmentRewards(results) {
        const skillsState = this.gameState.get('skills') || {};

        for (const result of results) {
            skillsState.fragments = (skillsState.fragments || 0) + result.fragmentCount;

            // Track by rarity
            if (!skillsState.fragmentsByRarity) {
                skillsState.fragmentsByRarity = {};
            }

            skillsState.fragmentsByRarity[result.rarity] =
                (skillsState.fragmentsByRarity[result.rarity] || 0) + result.fragmentCount;
        }

        this.gameState.set('skills', skillsState);
    }

    /**
     * Additional helper methods...
     */
    _generateRandomSkillFragments(count) { return []; }
    _rollFragmentCount(activityType) { return 1; }
    _getRealmLevel(realm) { return 1; }
    _updateGachaStatistics(poolId, pullCount, results) { }
    _generatePullSummary(results) { return {}; }
}

// Export
if (typeof window !== 'undefined') {
    window.SkillGachaIntegration = SkillGachaIntegration;
}