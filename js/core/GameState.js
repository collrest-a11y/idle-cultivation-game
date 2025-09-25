/**
 * GameState - Centralized state management with immutable updates and event system
 * Singleton pattern with change detection, validation, and persistence
 */
class GameState {
    constructor() {
        if (GameState.instance) {
            return GameState.instance;
        }

        this._state = null;
        this._previousState = null;
        this._changeListeners = new Set();
        this._validationRules = new Map();
        this._isDirty = false;
        this._lastSaveTime = 0;
        this._autoSaveInterval = 30000; // 30 seconds
        this._autoSaveEnabled = true;
        this._saveKey = 'main'; // Key for SaveManager
        this._eventManager = null; // Will be injected
        this._saveManager = null; // Will be injected

        // State snapshot system for rollback
        this._snapshots = [];
        this._maxSnapshots = 10; // Keep last 10 snapshots
        this._snapshotEnabled = true;

        // Initialization state tracking
        this._initializationState = {
            isInitializing: false,
            isInitialized: false,
            initStartTime: 0,
            initEndTime: 0,
            phase: 'none', // none, loading, ready, error
            loadedFromSave: false,
            errors: []
        };

        // Auto-save configuration
        this._autoSaveConfig = {
            enabled: true,
            interval: 30000, // 30 seconds
            onSignificantEvents: true,
            maxUnsavedChanges: 100, // Save after this many changes
            saveOnVisibilityChange: true,
            saveOnBeforeUnload: true
        };

        // Auto-save state tracking
        this._unsavedChanges = 0;
        this._lastAutoSaveTime = 0;
        this._autoSaveTimer = null;
        this._significantEvents = new Set([
            'realm:breakthrough',
            'cultivation:levelUp',
            'gacha:pull',
            'scripture:acquired',
            'combat:victory'
        ]);

        // Initialize with default state
        this._state = this._getDefaultState();
        this._previousState = this._deepClone(this._state);

        // Set up validation rules for skills data
        this._setupSkillsValidation();

        GameState.instance = this;

        // Initialize comprehensive validation rules for security
        this._initializeValidationRules();
    }

    /**
     * Set the event manager for this game state
     * @param {EventManager} eventManager - The event manager instance
     */
    setEventManager(eventManager) {
        this._eventManager = eventManager;
    }

    /**
     * Get initialization state
     * @returns {Object} Current initialization state
     */
    getInitializationState() {
        return { ...this._initializationState };
    }

    /**
     * Check if GameState is ready for use
     * @returns {boolean} True if initialized and ready
     */
    isReady() {
        return this._initializationState.isInitialized && this._initializationState.phase === 'ready';
    }

    /**
     * Mark initialization as started
     * @private
     */
    _markInitializationStart() {
        this._initializationState.isInitializing = true;
        this._initializationState.initStartTime = Date.now();
        this._initializationState.phase = 'loading';
    }

    /**
     * Mark initialization as complete
     * @private
     */
    _markInitializationComplete(loadedFromSave = false) {
        this._initializationState.isInitializing = false;
        this._initializationState.isInitialized = true;
        this._initializationState.initEndTime = Date.now();
        this._initializationState.phase = 'ready';
        this._initializationState.loadedFromSave = loadedFromSave;

        if (this._eventManager) {
            this._eventManager.emit('gameState:initialized', {
                loadedFromSave,
                initTime: this._initializationState.initEndTime - this._initializationState.initStartTime
            });
        }
    }

    /**
     * Mark initialization as failed
     * @private
     */
    _markInitializationError(error) {
        this._initializationState.isInitializing = false;
        this._initializationState.phase = 'error';
        this._initializationState.errors.push({
            message: error.message,
            timestamp: Date.now()
        });

        if (this._eventManager) {
            this._eventManager.emit('gameState:initError', { error: error.message });
        }
    }

    /**
     * Set the save manager for this game state
     * @param {SaveManager} saveManager - The save manager instance
     */
    setSaveManager(saveManager) {
        this._saveManager = saveManager;
        this._initializeAutoSave();
    }

    /**
     * Configure auto-save settings
     * @param {Object} config - Auto-save configuration
     */
    configureAutoSave(config) {
        this._autoSaveConfig = { ...this._autoSaveConfig, ...config };

        // Update interval if changed
        if (config.interval && this._autoSaveTimer) {
            this._stopAutoSave();
            this._startAutoSave();
        }

        // Update enabled state
        if (config.hasOwnProperty('enabled')) {
            if (config.enabled && !this._autoSaveTimer) {
                this._startAutoSave();
            } else if (!config.enabled && this._autoSaveTimer) {
                this._stopAutoSave();
            }
        }

        console.log('GameState: Auto-save configuration updated');
    }

    /**
     * Get current auto-save configuration
     * @returns {Object} Auto-save configuration
     */
    getAutoSaveConfig() {
        return { ...this._autoSaveConfig };
    }

    /**
     * Force an immediate save
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Success status
     */
    async forceSave(options = {}) {
        return await this.save({ ...options, force: true });
    }

    /**
     * Get the current game state (read-only)
     * @returns {Object} The current state
     */
    getState() {
        return this._deepClone(this._state);
    }

    /**
     * Get a specific value from the state using a path
     * @param {string} path - Dot notation path (e.g., 'player.jade', 'cultivation.qi.level')
     * @returns {*} The value at the path
     */
    get(path) {
        return this._getNestedValue(this._state, path);
    }

    /**
     * Update the game state immutably
     * @param {Object|Function} updates - Object with updates or function that returns updates
     * @param {Object} options - Optional configuration
     * @param {boolean} options.validate - Whether to validate the update (default: true)
     * @param {boolean} options.emit - Whether to emit change events (default: true)
     * @param {string} options.source - Source of the update for debugging
     */
    update(updates, options = {}) {
        const config = {
            validate: true,
            emit: true,
            source: 'unknown',
            ...options
        };

        try {
            // Store previous state for rollback
            this._previousState = this._deepClone(this._state);

            // Apply updates
            let newState;
            if (typeof updates === 'function') {
                newState = updates(this._deepClone(this._state));
            } else {
                newState = this._mergeDeep(this._state, updates);
            }

            // Validate if requested
            if (config.validate) {
                this._validateState(newState);
            }

            // Update state
            this._state = newState;
            this._isDirty = true;
            this._unsavedChanges++;

            // Emit events if requested
            if (config.emit && this._eventManager) {
                this._eventManager.emit('gameState:changed', {
                    updates,
                    previousState: this._previousState,
                    currentState: this._deepClone(this._state),
                    source: config.source
                });

                // Emit specific property change events
                this._emitPropertyChangeEvents(this._previousState, this._state);
            }

            // Check auto-save triggers
            this._checkAutoSaveTriggers(config.source);

        } catch (error) {
            // Rollback on error
            this._state = this._previousState;
            console.error('GameState: Update failed, rolling back:', error);
            throw error;
        }
    }

    /**
     * Set a specific value in the state using a path
     * @param {string} path - Dot notation path
     * @param {*} value - The value to set
     * @param {Object} options - Optional configuration
     */
    set(path, value, options = {}) {
        const updates = this._setNestedValue({}, path, value);
        this.update(updates, options);
    }

    /**
     * Increment a numeric value in the state
     * @param {string} path - Dot notation path
     * @param {number} amount - Amount to increment (can be negative)
     * @param {Object} options - Optional configuration
     */
    increment(path, amount = 1, options = {}) {
        const currentValue = this.get(path) || 0;
        this.set(path, currentValue + amount, options);
    }

    /**
     * Add validation rules for state properties
     * @param {string} path - Dot notation path
     * @param {Function} validator - Validation function that returns true if valid
     * @param {string} message - Error message for validation failure
     */
    addValidation(path, validator, message) {
        if (!this._validationRules.has(path)) {
            this._validationRules.set(path, []);
        }
        this._validationRules.get(path).push({ validator, message });
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @param {Object} options - Optional configuration
     * @param {string} options.path - Only listen to changes at this path
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener, options = {}) {
        const listenerData = {
            callback: listener,
            path: options.path || null,
            id: this._generateListenerId()
        };

        this._changeListeners.add(listenerData);

        return () => {
            this._changeListeners.delete(listenerData);
        };
    }

    /**
     * Reset the game state to default values
     * @param {Object} options - Optional configuration
     */
    reset(options = {}) {
        const defaultState = this._getDefaultState();
        this.update(() => defaultState, {
            ...options,
            source: 'reset'
        });
    }

    /**
     * Save the game state using SaveManager
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Whether the save was successful
     */
    async save(options = {}) {
        try {
            const config = {
                validate: true,
                compress: true,
                backup: false,
                force: false,
                ...options
            };

            // Check if save is needed (unless forced)
            if (!config.force && !this._isDirty) {
                return true; // Nothing to save
            }

            const saveData = {
                state: this._state,
                timestamp: Date.now(),
                version: this._getSaveVersion()
            };

            let success = false;

            if (this._saveManager) {
                // Use new SaveManager
                success = await this._saveManager.save(this._saveKey, saveData, config);
            } else {
                // Fallback to old localStorage method
                localStorage.setItem(`idleCultivationGameSave_${this._saveKey}`, JSON.stringify(saveData));
                success = true;
            }

            if (success) {
                this._isDirty = false;
                this._unsavedChanges = 0;
                this._lastSaveTime = Date.now();
                this._lastAutoSaveTime = Date.now();

                if (this._eventManager) {
                    this._eventManager.emit('gameState:saved', {
                        timestamp: this._lastSaveTime,
                        method: this._saveManager ? 'SaveManager' : 'localStorage',
                        forced: config.force,
                        auto: config.auto || false
                    });
                }
            }

            return success;
        } catch (error) {
            console.error('GameState: Failed to save:', error);
            return false;
        }
    }

    /**
     * Load the game state using SaveManager
     * @param {Object} options - Load options
     * @returns {Promise<boolean>} Whether the load was successful
     */
    async load(options = {}) {
        this._markInitializationStart();

        try {
            const config = {
                validate: true,
                migrate: true,
                ...options
            };

            let saveData = null;

            if (this._saveManager) {
                // Use new SaveManager
                saveData = await this._saveManager.load(this._saveKey, config);
            } else {
                // Fallback to old localStorage method
                const savedData = localStorage.getItem(`idleCultivationGameSave_${this._saveKey}`);
                if (savedData) {
                    saveData = JSON.parse(savedData);
                }
            }

            if (!saveData) {
                this._markInitializationComplete(false);
                return false;
            }

            // Extract state data (handle both old and new formats)
            let gameStateData = saveData.state || saveData;
            let version = saveData.version || this._getSaveVersion();
            let timestamp = saveData.timestamp || Date.now();

            // Migrate state if needed
            if (config.migrate) {
                gameStateData = await this._migrateState(gameStateData, version);
            }

            // Validate state if requested
            if (config.validate && window.dataValidator) {
                const validation = window.dataValidator.validateGameState(gameStateData, { sanitize: true });
                if (validation.isValid) {
                    gameStateData = validation.sanitizedData;
                } else if (validation.hasCorruption) {
                    console.warn('GameState: Loaded data has corruption, attempting repair');
                    const repair = window.dataValidator.repairData(gameStateData);
                    if (repair.success) {
                        gameStateData = repair.data;
                    } else {
                        console.error('GameState: Failed to repair corrupted data');
                        this._markInitializationError(new Error('Failed to repair corrupted save data'));
                        return false;
                    }
                }
            }

            this._state = gameStateData;
            this._previousState = this._deepClone(this._state);
            this._isDirty = false;

            if (this._eventManager) {
                this._eventManager.emit('gameState:loaded', {
                    timestamp: timestamp,
                    version: version,
                    method: this._saveManager ? 'SaveManager' : 'localStorage',
                    validated: config.validate,
                    migrated: config.migrate
                });
            }

            this._markInitializationComplete(true);
            return true;
        } catch (error) {
            console.error('GameState: Failed to load:', error);
            this._markInitializationError(error);
            return false;
        }
    }

    /**
     * Export the game state for backup or transfer
     * @param {Object} options - Export options
     * @returns {Promise<string>} JSON string of the state
     */
    async export(options = {}) {
        try {
            if (this._saveManager) {
                // Use SaveManager's export functionality
                return await this._saveManager.export(this._saveKey, options);
            } else {
                // Fallback to simple export
                return JSON.stringify({
                    state: this._state,
                    timestamp: Date.now(),
                    version: this._getSaveVersion()
                }, null, 2);
            }
        } catch (error) {
            console.error('GameState: Failed to export:', error);
            throw error;
        }
    }

    /**
     * Import a game state from a JSON string
     * @param {string} jsonData - JSON string of the state
     * @param {Object} options - Import options
     * @returns {Promise<boolean>} Whether the import was successful
     */
    async import(jsonData, options = {}) {
        try {
            const config = {
                validate: true,
                overwrite: true,
                backup: true,
                ...options
            };

            if (this._saveManager) {
                // Use SaveManager's import functionality
                const success = await this._saveManager.import(jsonData, this._saveKey, config);
                if (success) {
                    // Reload the state from the imported data
                    await this.load({ validate: config.validate });
                }
                return success;
            } else {
                // Fallback to simple import
                const parsedData = JSON.parse(jsonData);
                const migratedState = await this._migrateState(parsedData.state, parsedData.version);

                this.update(() => migratedState, { source: 'import' });
                return true;
            }
        } catch (error) {
            console.error('GameState: Failed to import:', error);
            return false;
        }
    }

    /**
     * Check if the state has unsaved changes
     * @returns {boolean} Whether the state is dirty
     */
    isDirty() {
        return this._isDirty;
    }

    /**
     * Get debug information about the state
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isDirty: this._isDirty,
            lastSaveTime: this._lastSaveTime,
            changeListenerCount: this._changeListeners.size,
            validationRuleCount: this._validationRules.size,
            stateSize: JSON.stringify(this._state).length,
            hasEventManager: !!this._eventManager
        };
    }

    // Private methods

    /**
     * Set up validation rules for skills data
     */
    _setupSkillsValidation() {
        // Validate skills object structure
        this.addValidation('skills', (skills) => {
            return skills && typeof skills === 'object' &&
                   skills.hasOwnProperty('unlocked') &&
                   skills.hasOwnProperty('levels') &&
                   skills.hasOwnProperty('loadout') &&
                   skills.hasOwnProperty('skillPoints') &&
                   skills.hasOwnProperty('fragments') &&
                   skills.hasOwnProperty('mastery');
        }, 'Skills object must have required properties');

        // Validate unlocked skills
        this.addValidation('skills.unlocked', (unlocked) => {
            return typeof unlocked === 'object' && unlocked !== null;
        }, 'Unlocked skills must be an object');

        // Validate skill levels
        this.addValidation('skills.levels', (levels) => {
            if (typeof levels !== 'object' || levels === null) return false;
            // All levels must be positive numbers
            return Object.values(levels).every(level =>
                typeof level === 'number' && level >= 0 && Number.isInteger(level)
            );
        }, 'Skill levels must be non-negative integers');

        // Validate loadout
        this.addValidation('skills.loadout', (loadout) => {
            return Array.isArray(loadout) &&
                   loadout.every(skillId => typeof skillId === 'string') &&
                   loadout.length <= 10; // Max reasonable loadout size
        }, 'Loadout must be an array of skill ID strings with reasonable size');

        // Validate skill points and fragments
        this.addValidation('skills.skillPoints', (points) => {
            return typeof points === 'number' && points >= 0 && Number.isInteger(points);
        }, 'Skill points must be a non-negative integer');

        this.addValidation('skills.fragments', (fragments) => {
            return typeof fragments === 'number' && fragments >= 0 && Number.isInteger(fragments);
        }, 'Fragments must be a non-negative integer');

        // Validate mastery object
        this.addValidation('skills.mastery', (mastery) => {
            return typeof mastery === 'object' && mastery !== null;
        }, 'Mastery must be an object');

        // Validate max loadout size
        this.addValidation('skills.maxLoadoutSize', (size) => {
            return typeof size === 'number' && size > 0 && size <= 10 && Number.isInteger(size);
        }, 'Max loadout size must be a positive integer between 1 and 10');

        console.log('GameState: Skills validation rules setup complete');
    }

    _getDefaultState() {
        return {
            player: {
                jade: 500,
                spiritCrystals: 100,
                shards: 0,
                power: 1.0,
                offlineTime: 0,
                availableTitles: [],
                currentTitle: null
            },
            cultivation: {
                qi: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                body: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                dual: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 200,
                    baseRate: 0.5,
                    multiplier: 1.0,
                    unlocked: false
                }
            },
            realm: {
                current: "Body Refinement",
                stage: 1,
                maxStage: 10,
                breakthroughProgress: 0,
                breakthroughRequired: 1000
            },
            character: {
                origin: null,
                vow: null,
                mark: null,
                modifiers: {}
            },
            loadout: {
                slots: {
                    qi: null,
                    body: null,
                    dual: null,
                    extra1: null,
                    extra2: null
                },
                stats: {
                    flatDamage: 0,
                    damageMultiplier: 1.0,
                    attackSpeed: 1.0,
                    critChance: 0.05,
                    critMultiplier: 2.0,
                    lifesteal: 0,
                    damageReduction: 0
                }
            },
            scriptures: {
                collection: [],
                equipped: {
                    primary: null,
                    secondary: null,
                    passive1: null,
                    passive2: null,
                    passive3: null
                },
                favorites: [],
                tags: {},
                sortBy: 'power',
                filterBy: {
                    rarity: 'all',
                    category: 'all',
                    level: 'all',
                    equipped: 'all'
                },
                nextId: 1
            },
            gacha: {
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
            },
            gachaStats: {
                totalPulls: 0,
                totalSpent: { jade: 0, crystals: 0 },
                scripturesObtained: {},
                averageRarity: 0,
                luckScore: 100
            },
            scriptureStats: {
                totalScriptures: 0,
                scripturesByRarity: {},
                scripturesByCategory: {},
                totalPower: 0,
                collectionCompletion: 0,
                favoriteCount: 0,
                duplicatesConverted: 0
            },
            enhancement: {
                activeEnhancements: {},
                failureProtection: {},
                enhancementQueue: [],
                isProcessing: false
            },
            enhancementMaterials: {
                enhancementStones: 0,
                awakeningStones: 0,
                essenceOfCultivation: 0,
                stardustFragment: 0,
                voidCrystal: 0,
                dragonScale: 0,
                phoenixFeather: 0
            },
            enhancementStats: {
                totalEnhancements: 0,
                successfulEnhancements: 0,
                failedEnhancements: 0,
                awakeningsPerformed: 0,
                breakthroughsAchieved: 0,
                materialsUsed: {},
                averageSuccessRate: 0,
                totalSpent: { jade: 0, crystals: 0 }
            },
            scriptureIntegration: {
                isActive: false,
                effectsApplied: false,
                lastUpdateTime: 0,
                cultivationModifiers: {},
                combatModifiers: {},
                resourceModifiers: {}
            },
            scriptureAchievements: {
                scriptureRelated: {},
                milestones: {}
            },
            // Combat System Data
            combat: {
                wins: 0,
                losses: 0,
                streak: 0,
                rank: 1000
            },
            combatStats: {
                combatsStarted: 0,
                combatsWon: 0,
                combatsLost: 0,
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                averageCombatDuration: 0,
                criticalHits: 0,
                perfectVictories: 0
            },
            // Ranking System Data
            playerRanking: {
                currentRating: 1000,
                peakRating: 1000,
                currentTier: { name: 'Bronze', min: 0, max: 1199, color: '#CD7F32', key: 'BRONZE' },
                peakTier: { name: 'Bronze', min: 0, max: 1199, color: '#CD7F32', key: 'BRONZE' },
                wins: 0,
                losses: 0,
                winStreak: 0,
                longestWinStreak: 0,
                gamesPlayed: 0,
                rankingHistory: []
            },
            seasonData: {
                currentSeason: 1,
                seasonStartTime: Date.now(),
                seasonEndTime: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
                previousSeasonRating: 1000,
                seasonWins: 0,
                seasonLosses: 0,
                seasonPeakRating: 1000,
                claimedSeasonRewards: false
            },
            rankingStats: {
                totalRatingGained: 0,
                totalRatingLost: 0,
                averageOpponentRating: 1000,
                biggestUpset: { ratingDifference: 0, gained: 0 },
                longestWinStreak: 0,
                highestRating: 1000,
                seasonsCompleted: 0
            },
            // Duel System Data
            duelStats: {
                totalDuels: 0,
                playerVsPlayer: 0,
                playerVsAI: 0,
                successfulMatches: 0,
                averageMatchmakingTime: 0,
                queueTimeouts: 0
            },
            // Tournament System Data
            playerTournamentData: {
                tournamentsEntered: 0,
                tournamentsWon: 0,
                tournamentWins: 0,
                tournamentLosses: 0,
                bestFinish: null,
                titles: [],
                totalRewardsEarned: { jade: 0, spiritCrystals: 0 }
            },
            tournamentStats: {
                totalTournaments: 0,
                averageParticipants: 0,
                mostPopularType: null,
                completionRate: 0
            },
            tournamentHistory: [],
            // Combat Integration Data
            combatIntegrationStats: {
                totalCombats: 0,
                totalDuels: 0,
                totalTournaments: 0,
                systemUptime: 0,
                lastMaintenanceTime: 0
            },
            sect: {
                id: null,
                name: null,
                contribution: 0,
                buffs: [],
                lastDonation: 0
            },
            tutorial: {
                completed: false,
                currentStep: 0,
                completedSteps: []
            },
            // Quest System Data
            questState: {
                activeQuests: {
                    daily: [],
                    weekly: [],
                    milestone: [],
                    chain: [],
                    special: []
                },
                completedQuests: [],
                failedQuests: [],
                abandonedQuests: [],
                lastDailyRefresh: 0,
                lastWeeklyRefresh: 0,
                questIdCounter: 1
            },
            questStats: {
                totalGenerated: 0,
                totalCompleted: 0,
                totalFailed: 0,
                totalAbandoned: 0,
                completionRate: 0,
                averageCompletionTime: 0,
                favoriteCategory: null,
                perfectQuests: 0
            },
            // Achievement System Data
            achievementState: {
                unlockedAchievements: [],
                progressTracking: [],
                achievementPoints: 0,
                totalAchievements: 0,
                hiddenAchievementsFound: 0,
                lastUnlockTime: 0
            },
            achievementStats: {
                totalChecks: 0,
                totalUnlocks: 0,
                averageUnlockTime: 0,
                rareUnlocks: 0,
                perfectUnlocks: 0,
                categoryProgress: [],
                pointsEarned: 0
            },
            // Reward System Data
            rewardState: {
                activeBonuses: [],
                rewardMultipliers: [],
                temporaryEffects: [],
                rewardHistory: [],
                totalRewardsAwarded: 0
            },
            rewardStats: {
                totalJadeAwarded: 0,
                totalCrystalsAwarded: 0,
                totalShardsAwarded: 0,
                totalExperienceAwarded: 0,
                questRewards: 0,
                achievementRewards: 0,
                bonusRewards: 0,
                averageRewardValue: 0,
                biggestReward: 0
            },
            // Quest Integration Data
            questIntegrationStats: {
                questsCompleted: 0,
                achievementsUnlocked: 0,
                totalRewardValue: 0,
                crossSystemEvents: 0
            },
            settings: {
                autoSave: true,
                notifications: true,
                sound: true,
                theme: 'dark'
            },
            // Skills System Data
            skills: {
                unlocked: {},
                levels: {},
                loadout: [],
                skillPoints: 0,
                fragments: 0,
                mastery: {},
                maxLoadoutSize: 6,
                totalExperience: 0,
                unlockedCategories: [],
                lastUnlockTime: 0,
                prestigeLevel: 0,
                prestigePoints: 0
            },
            skillsStats: {
                totalSkillsUnlocked: 0,
                totalSkillLevels: 0,
                totalFragmentsSpent: 0,
                totalSkillPointsSpent: 0,
                masteryPointsEarned: 0,
                loadoutChanges: 0,
                skillsUsed: {},
                averageSkillLevel: 0,
                favoriteSkillCategory: null,
                perfectSkillUps: 0
            },
            meta: {
                createdAt: Date.now(),
                lastPlayed: Date.now(),
                totalPlayTime: 0,
                version: '1.0.0'
            }
        };
    }

    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this._deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this._deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }

    _mergeDeep(target, source) {
        const result = this._deepClone(target);

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this._mergeDeep(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const result = this._deepClone(obj);
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return result;
    }

    /**
     * Initialize comprehensive validation rules for input security
     * @private
     */
    _initializeValidationRules() {
        // Player validation rules
        this.addValidation('player.jade',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 1e12 && !isNaN(value)),
            'Jade must be null or a valid non-negative number under 1 trillion');

        this.addValidation('player.spiritCrystals',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 1e9 && Number.isInteger(value)),
            'Spirit crystals must be null or a valid non-negative integer under 1 billion');

        this.addValidation('player.name',
            value => value == null || (typeof value === 'string' && value.length >= 1 && value.length <= 50 && /^[a-zA-Z0-9_\-\s]+$/.test(value)),
            'Player name must be null or 1-50 alphanumeric characters, underscores, hyphens, or spaces');

        // Cultivation validation rules
        this.addValidation('cultivation.qi.level',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 10000 && Number.isInteger(value)),
            'Qi level must be null or a valid integer between 0 and 10000');

        this.addValidation('cultivation.body.level',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 10000 && Number.isInteger(value)),
            'Body level must be null or a valid integer between 0 and 10000');

        this.addValidation('cultivation.realm',
            value => value == null || (typeof value === 'string' && value.length >= 1 && value.length <= 100 && /^[a-zA-Z\s]+$/.test(value)),
            'Cultivation realm must be null or a valid string with only letters and spaces');

        this.addValidation('cultivation.stage',
            value => value == null || (typeof value === 'number' && value >= 1 && value <= 100 && Number.isInteger(value)),
            'Cultivation stage must be null or a valid integer between 1 and 100');

        // Equipment validation rules
        this.addValidation('loadout.weapon.level',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 1000 && Number.isInteger(value)),
            'Weapon level must be null or a valid integer between 0 and 1000');

        this.addValidation('loadout.armor.level',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 1000 && Number.isInteger(value)),
            'Armor level must be null or a valid integer between 0 and 1000');

        // Scripture validation rules
        this.addValidation('scriptures.collection',
            value => value == null || (Array.isArray(value) && value.length <= 1000),
            'Scripture collection must be null or an array with maximum 1000 entries');

        // Combat validation rules
        this.addValidation('combat.wins',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 1e9 && Number.isInteger(value)),
            'Combat wins must be null or a valid non-negative integer under 1 billion');

        this.addValidation('combat.losses',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= 1e9 && Number.isInteger(value)),
            'Combat losses must be null or a valid non-negative integer under 1 billion');

        // Quest validation rules
        this.addValidation('quests.completed',
            value => value == null || (Array.isArray(value) && value.length <= 10000),
            'Completed quests must be null or an array with maximum 10000 entries');

        // Achievement validation rules
        this.addValidation('achievements.unlocked',
            value => value == null || (Array.isArray(value) && value.length <= 1000),
            'Unlocked achievements must be null or an array with maximum 1000 entries');

        // Time-based validation rules
        this.addValidation('lastSaveTime',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= Date.now() + 86400000),
            'Last save time must be null or a valid timestamp not more than 24 hours in the future');

        this.addValidation('lastOnlineTime',
            value => value == null || (typeof value === 'number' && value >= 0 && value <= Date.now() + 86400000),
            'Last online time must be null or a valid timestamp not more than 24 hours in the future');

        // CP Progression System validation rules
        this.addValidation('mounts.active',
            value => value == null || (typeof value === 'string' && value.length >= 1 && value.length <= 50 && /^[a-zA-Z0-9_]+$/.test(value)),
            'Active mount must be null or a valid identifier string');

        this.addValidation('wings.equipped',
            value => value == null || (typeof value === 'string' && value.length >= 1 && value.length <= 50 && /^[a-zA-Z0-9_]+$/.test(value)),
            'Equipped wings must be null or a valid identifier string');

        console.log('GameState: Initialized comprehensive validation rules for enhanced security');
    }

    /**
     * Sanitize input value to prevent malicious data
     * @param {*} value - The value to sanitize
     * @param {string} type - Expected type ('string', 'number', 'integer', 'array', 'object')
     * @returns {*} Sanitized value
     * @private
     */
    _sanitizeInput(value, type) {
        if (value == null) {
            return null;
        }

        switch (type) {
            case 'string':
                if (typeof value !== 'string') {
                    return String(value).substring(0, 1000); // Limit length
                }
                // Remove potentially dangerous characters
                return value.replace(/[<>\"'&]/g, '').substring(0, 1000);

            case 'number':
                const num = Number(value);
                if (isNaN(num) || !isFinite(num)) {
                    return 0;
                }
                // Clamp to reasonable bounds
                return Math.max(-1e12, Math.min(1e12, num));

            case 'integer':
                const int = parseInt(value);
                if (isNaN(int) || !isFinite(int)) {
                    return 0;
                }
                return Math.max(-1e9, Math.min(1e9, int));

            case 'array':
                if (!Array.isArray(value)) {
                    return [];
                }
                // Limit array size
                return value.slice(0, 10000);

            case 'object':
                if (typeof value !== 'object' || Array.isArray(value)) {
                    return {};
                }
                return value;

            default:
                return value;
        }
    }

    /**
     * Enhanced update method with input sanitization
     * @param {Object|Function} updates - Object with updates or function that returns updates
     * @param {Object} options - Optional configuration
     */
    updateSecure(updates, options = {}) {
        const config = {
            validate: true,
            emit: true,
            source: 'secure_update',
            sanitize: true,
            ...options
        };

        // Sanitize updates if requested
        if (config.sanitize && typeof updates === 'object' && updates !== null) {
            updates = this._sanitizeUpdates(updates);
        }

        // Use regular update method with enhanced validation
        this.update(updates, config);
    }

    /**
     * Sanitize an updates object recursively
     * @param {Object} updates - Updates object to sanitize
     * @returns {Object} Sanitized updates
     * @private
     */
    _sanitizeUpdates(updates) {
        const sanitized = {};

        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                sanitized[key] = this._sanitizeUpdates(value);
            } else if (Array.isArray(value)) {
                sanitized[key] = value.slice(0, 10000).map(item =>
                    typeof item === 'string' ? this._sanitizeInput(item, 'string') : item
                );
            } else if (typeof value === 'string') {
                sanitized[key] = this._sanitizeInput(value, 'string');
            } else if (typeof value === 'number') {
                sanitized[key] = this._sanitizeInput(value, 'number');
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    _validateState(state) {
        for (const [path, rules] of this._validationRules) {
            const value = this._getNestedValue(state, path);
            for (const rule of rules) {
                if (!rule.validator(value)) {
                    throw new Error(`Validation failed for ${path}: ${rule.message}`);
                }
            }
        }
    }

    _emitPropertyChangeEvents(oldState, newState) {
        if (!this._eventManager) return;

        const changes = this._findChanges(oldState, newState);
        for (const change of changes) {
            this._eventManager.emit('gameState:propertyChanged', change);
        }
    }

    _findChanges(oldObj, newObj, path = '') {
        const changes = [];

        // Check for changed or new properties
        for (const key in newObj) {
            if (newObj.hasOwnProperty(key)) {
                const currentPath = path ? `${path}.${key}` : key;
                const oldValue = oldObj ? oldObj[key] : undefined;
                const newValue = newObj[key];

                if (oldValue !== newValue) {
                    if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                        // Recursively check nested objects
                        changes.push(...this._findChanges(oldValue, newValue, currentPath));
                    } else {
                        // Value changed
                        changes.push({
                            path: currentPath,
                            oldValue,
                            newValue,
                            type: 'changed'
                        });
                    }
                }
            }
        }

        return changes;
    }

    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _getSaveVersion() {
        return '1.0.0';
    }

    async _migrateState(state, version) {
        try {
            // Apply skills system migration first
            state = this._migrateSkillsData(state, version);

            // Use MigrationManager if available
            if (window.migrationManager) {
                const currentVersion = this._getSaveVersion();
                if (version !== currentVersion) {
                    console.log(`GameState: Migrating from ${version} to ${currentVersion}`);
                    const migrationResult = await window.migrationManager.migrate(state, version, currentVersion);
                    if (migrationResult.success) {
                        return migrationResult.data;
                    } else {
                        console.warn('GameState: Migration failed, using original state');
                    }
                }
            }

            // Return state as-is if no migration needed or available
            return state;
        } catch (error) {
            console.error('GameState: Migration error:', error);
            return state;
        }
    }

    /**
     * Migrate skills data from older versions
     * @param {Object} state - Game state to migrate
     * @param {string} version - Version being migrated from
     * @returns {Object} Migrated state
     */
    _migrateSkillsData(state, version) {
        // Ensure skills structure exists
        if (!state.skills) {
            console.log('GameState: Adding missing skills structure');
            state.skills = this._getDefaultState().skills;
        }

        // Migrate from placeholder structure to full structure
        if (state.skills && !state.skills.hasOwnProperty('maxLoadoutSize')) {
            console.log('GameState: Migrating skills to extended structure');

            const defaultSkills = this._getDefaultState().skills;
            const defaultStats = this._getDefaultState().skillsStats;

            // Preserve existing data, add missing properties
            state.skills = {
                ...defaultSkills,
                ...state.skills
            };

            // Add skills stats if missing
            if (!state.skillsStats) {
                state.skillsStats = defaultStats;
            }
        }

        // Ensure unlocked skills are properly formatted
        if (state.skills.unlocked && typeof state.skills.unlocked === 'object') {
            for (const [skillId, unlockData] of Object.entries(state.skills.unlocked)) {
                // Convert simple boolean unlocks to proper unlock data
                if (typeof unlockData === 'boolean' && unlockData === true) {
                    state.skills.unlocked[skillId] = {
                        unlockedAt: Date.now(),
                        unlockedBy: 'migration'
                    };
                }
            }
        }

        // Ensure levels are integers
        if (state.skills.levels && typeof state.skills.levels === 'object') {
            for (const [skillId, level] of Object.entries(state.skills.levels)) {
                if (typeof level === 'number' && !Number.isInteger(level)) {
                    state.skills.levels[skillId] = Math.floor(level);
                }
            }
        }

        // Ensure loadout is a valid array
        if (!Array.isArray(state.skills.loadout)) {
            state.skills.loadout = [];
        }

        // Ensure mastery is an object
        if (!state.skills.mastery || typeof state.skills.mastery !== 'object') {
            state.skills.mastery = {};
        }

        return state;
    }

    /**
     * Initialize auto-save system
     */
    _initializeAutoSave() {
        if (this._autoSaveConfig.enabled) {
            this._startAutoSave();
        }

        // Set up event listeners for auto-save triggers
        if (this._eventManager && this._autoSaveConfig.onSignificantEvents) {
            this._setupAutoSaveEventListeners();
        }

        // Set up page lifecycle listeners
        this._setupPageLifecycleListeners();
    }

    /**
     * Start the auto-save timer
     */
    _startAutoSave() {
        if (this._autoSaveTimer) {
            this._stopAutoSave();
        }

        this._autoSaveTimer = setInterval(() => {
            this._performAutoSave();
        }, this._autoSaveConfig.interval);

        console.log(`GameState: Auto-save started with ${this._autoSaveConfig.interval}ms interval`);
    }

    /**
     * Stop the auto-save timer
     */
    _stopAutoSave() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
            console.log('GameState: Auto-save stopped');
        }
    }

    /**
     * Check if auto-save should be triggered
     * @param {string} source - Source of the change
     */
    _checkAutoSaveTriggers(source) {
        if (!this._autoSaveConfig.enabled) {
            return;
        }

        // Check for significant events
        if (this._autoSaveConfig.onSignificantEvents && this._significantEvents.has(source)) {
            this._triggerAutoSave('significant_event');
            return;
        }

        // Check for maximum unsaved changes
        if (this._unsavedChanges >= this._autoSaveConfig.maxUnsavedChanges) {
            this._triggerAutoSave('max_changes');
            return;
        }

        // Check for time-based trigger
        const timeSinceLastSave = Date.now() - this._lastAutoSaveTime;
        if (timeSinceLastSave >= this._autoSaveConfig.interval) {
            this._triggerAutoSave('interval');
        }
    }

    /**
     * Trigger an auto-save
     * @param {string} reason - Reason for the auto-save
     */
    _triggerAutoSave(reason) {
        setTimeout(() => {
            this.save({ auto: true, reason }).catch(error => {
                console.error('GameState: Auto-save failed:', error);
            });
        }, 0);
    }

    /**
     * Perform scheduled auto-save
     */
    async _performAutoSave() {
        if (this._isDirty) {
            try {
                await this.save({ auto: true, reason: 'scheduled' });
            } catch (error) {
                console.error('GameState: Scheduled auto-save failed:', error);
            }
        }
    }

    /**
     * Set up event listeners for significant events
     */
    _setupAutoSaveEventListeners() {
        // Listen for significant game events that should trigger saves
        for (const eventType of this._significantEvents) {
            this._eventManager.on(eventType, () => {
                this._triggerAutoSave(eventType);
            });
        }
    }

    /**
     * Set up page lifecycle listeners for auto-save
     */
    _setupPageLifecycleListeners() {
        if (typeof window === 'undefined') {
            return; // Not in browser environment
        }

        // Save on page visibility change
        if (this._autoSaveConfig.saveOnVisibilityChange) {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this._isDirty) {
                    this._triggerAutoSave('visibility_change');
                }
            });
        }

        // Save on before unload
        if (this._autoSaveConfig.saveOnBeforeUnload) {
            window.addEventListener('beforeunload', () => {
                if (this._isDirty) {
                    // Synchronous save for page unload
                    try {
                        const saveData = {
                            state: this._state,
                            timestamp: Date.now(),
                            version: this._getSaveVersion()
                        };

                        if (this._saveManager) {
                            // Try to save synchronously if possible
                            localStorage.setItem(`idleCultivationGameSave_${this._saveKey}_emergency`, JSON.stringify(saveData));
                        } else {
                            localStorage.setItem(`idleCultivationGameSave_${this._saveKey}`, JSON.stringify(saveData));
                        }
                    } catch (error) {
                        console.error('GameState: Emergency save failed:', error);
                    }
                }
            });
        }

        // Save on focus loss
        window.addEventListener('blur', () => {
            if (this._isDirty) {
                this._triggerAutoSave('focus_loss');
            }
        });
    }

    /**
     * Get auto-save statistics
     * @returns {Object} Auto-save statistics
     */
    getAutoSaveStats() {
        return {
            enabled: this._autoSaveConfig.enabled,
            interval: this._autoSaveConfig.interval,
            unsavedChanges: this._unsavedChanges,
            lastSaveTime: this._lastSaveTime,
            lastAutoSaveTime: this._lastAutoSaveTime,
            isDirty: this._isDirty,
            timeSinceLastSave: Date.now() - this._lastSaveTime,
            nextAutoSaveIn: Math.max(0, this._autoSaveConfig.interval - (Date.now() - this._lastAutoSaveTime))
        };
    }

    /**
     * Create a snapshot of the current state for rollback
     * @param {string} label - Optional label for the snapshot
     * @returns {string} Snapshot ID
     */
    createSnapshot(label = null) {
        if (!this._snapshotEnabled) {
            console.warn('GameState: Snapshots are disabled');
            return null;
        }

        const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const snapshot = {
            id: snapshotId,
            label: label || `Auto-snapshot ${this._snapshots.length + 1}`,
            state: this._deepClone(this._state),
            timestamp: Date.now(),
            source: 'manual'
        };

        this._snapshots.push(snapshot);

        // Maintain max snapshots limit
        if (this._snapshots.length > this._maxSnapshots) {
            this._snapshots.shift(); // Remove oldest
        }

        console.log(`GameState: Snapshot created: ${snapshotId} - ${snapshot.label}`);

        if (this._eventManager) {
            this._eventManager.emit('gameState:snapshotCreated', {
                snapshotId,
                label: snapshot.label,
                count: this._snapshots.length
            });
        }

        return snapshotId;
    }

    /**
     * Rollback to a previous snapshot
     * @param {string} snapshotId - Snapshot ID to rollback to (or null for latest)
     * @param {Object} options - Rollback options
     * @returns {boolean} Success status
     */
    rollback(snapshotId = null, options = {}) {
        const config = {
            validate: true,
            emit: true,
            createBackup: true,
            ...options
        };

        try {
            let snapshot;

            if (snapshotId) {
                snapshot = this._snapshots.find(s => s.id === snapshotId);
                if (!snapshot) {
                    throw new Error(`Snapshot not found: ${snapshotId}`);
                }
            } else {
                // Use latest snapshot
                snapshot = this._snapshots[this._snapshots.length - 1];
                if (!snapshot) {
                    throw new Error('No snapshots available for rollback');
                }
            }

            // Create backup of current state before rollback
            if (config.createBackup) {
                this.createSnapshot('Pre-rollback backup');
            }

            // Store current state for rollback if validation fails
            const currentState = this._deepClone(this._state);

            // Apply snapshot state
            this._state = this._deepClone(snapshot.state);

            // Validate if requested
            if (config.validate) {
                this._validateState(this._state);
            }

            this._isDirty = true;

            console.log(`GameState: Rolled back to snapshot: ${snapshot.id} - ${snapshot.label}`);

            if (config.emit && this._eventManager) {
                this._eventManager.emit('gameState:rolledBack', {
                    snapshotId: snapshot.id,
                    label: snapshot.label,
                    timestamp: snapshot.timestamp
                });
            }

            return true;

        } catch (error) {
            console.error('GameState: Rollback failed:', error);

            if (this._eventManager) {
                this._eventManager.emit('gameState:rollbackFailed', {
                    error: error.message,
                    snapshotId
                });
            }

            return false;
        }
    }

    /**
     * Get list of available snapshots
     * @returns {Array} List of snapshot info
     */
    getSnapshots() {
        return this._snapshots.map(snapshot => ({
            id: snapshot.id,
            label: snapshot.label,
            timestamp: snapshot.timestamp,
            source: snapshot.source,
            age: Date.now() - snapshot.timestamp
        }));
    }

    /**
     * Clear all snapshots
     * @param {boolean} confirmed - Confirmation flag
     */
    clearSnapshots(confirmed = false) {
        if (!confirmed) {
            throw new Error('clearSnapshots requires explicit confirmation');
        }

        const count = this._snapshots.length;
        this._snapshots = [];

        console.log(`GameState: Cleared ${count} snapshots`);

        if (this._eventManager) {
            this._eventManager.emit('gameState:snapshotsCleared', { count });
        }
    }

    /**
     * Configure snapshot settings
     * @param {Object} config - Snapshot configuration
     */
    configureSnapshots(config) {
        if (config.hasOwnProperty('enabled')) {
            this._snapshotEnabled = config.enabled;
        }

        if (config.maxSnapshots && config.maxSnapshots > 0) {
            this._maxSnapshots = config.maxSnapshots;

            // Trim snapshots if new max is lower
            while (this._snapshots.length > this._maxSnapshots) {
                this._snapshots.shift();
            }
        }

        console.log('GameState: Snapshot configuration updated');
    }

    /**
     * Get snapshot configuration
     * @returns {Object} Snapshot configuration
     */
    getSnapshotConfig() {
        return {
            enabled: this._snapshotEnabled,
            maxSnapshots: this._maxSnapshots,
            currentCount: this._snapshots.length
        };
    }

    /**
     * Create automatic snapshot before risky operation
     * @param {string} operation - Operation name
     * @returns {string} Snapshot ID
     */
    _createAutoSnapshot(operation) {
        if (!this._snapshotEnabled) {
            return null;
        }

        const snapshot = {
            id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            label: `Before ${operation}`,
            state: this._deepClone(this._state),
            timestamp: Date.now(),
            source: 'automatic'
        };

        this._snapshots.push(snapshot);

        // Maintain max snapshots limit
        if (this._snapshots.length > this._maxSnapshots) {
            this._snapshots.shift();
        }

        console.log(`GameState: Auto-snapshot created before ${operation}`);

        return snapshot.id;
    }
}

// Create singleton instance
const gameState = new GameState();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState, gameState };
} else if (typeof window !== 'undefined') {
    window.GameState = GameState;
    window.gameState = gameState;
}