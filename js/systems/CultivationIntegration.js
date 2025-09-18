/**
 * CultivationIntegration - Integrates all cultivation systems with the core game
 * Handles initialization, coordination, and lifecycle management of cultivation systems
 */
class CultivationIntegration {
    constructor() {
        // Core system references
        this.gameState = null;
        this.eventManager = null;

        // Cultivation system components
        this.cultivationSystem = null;
        this.realmManager = null;
        this.techniqueManager = null;
        this.offlineCalculator = null;

        // Integration state
        this.isInitialized = false;
        this.isRunning = false;
        this.lastUpdateTime = 0;

        // Update timing
        this.updateInterval = 1000; // Update every second
        this.updateTimer = null;

        console.log('CultivationIntegration: Initialized');
    }

    /**
     * Initialize the cultivation integration system
     * @param {GameState} gameState - Game state instance
     * @param {EventManager} eventManager - Event manager instance
     */
    async initialize(gameState, eventManager) {
        try {
            if (this.isInitialized) {
                console.warn('CultivationIntegration: Already initialized');
                return;
            }

            console.log('CultivationIntegration: Starting initialization...');

            // Store core system references
            this.gameState = gameState;
            this.eventManager = eventManager;

            // Initialize cultivation systems in order
            await this._initializeCultivationSystems();

            // Set up integration event handlers
            this._setupIntegrationEventHandlers();

            // Set up periodic updates
            this._startUpdateLoop();

            // Update game state with cultivation data
            this._updateGameStateSchema();

            this.isInitialized = true;
            this.isRunning = true;

            // Emit initialization complete event
            this.eventManager.emit('cultivation:integration_complete', {
                timestamp: Date.now(),
                systems: {
                    cultivation: !!this.cultivationSystem,
                    realm: !!this.realmManager,
                    technique: !!this.techniqueManager,
                    offline: !!this.offlineCalculator
                }
            });

            console.log('CultivationIntegration: Initialization complete');

        } catch (error) {
            console.error('CultivationIntegration: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start cultivation for the player
     * @param {string} path - Cultivation path ('qi', 'body', 'dual')
     * @param {string} technique - Technique to use (optional)
     * @returns {Object} Start result
     */
    startCultivation(path, technique = null) {
        if (!this.isInitialized) {
            throw new Error('Cultivation system not initialized');
        }

        try {
            // Validate inputs
            if (!['qi', 'body', 'dual'].includes(path)) {
                throw new Error(`Invalid cultivation path: ${path}`);
            }

            // Check if dual cultivation is unlocked
            if (path === 'dual') {
                const dualCheck = this.cultivationSystem.checkDualCultivationUnlock();
                if (!dualCheck.canUnlock && !dualCheck.unlocked) {
                    return {
                        success: false,
                        reason: 'dual_cultivation_locked',
                        requirements: dualCheck.requirements
                    };
                }

                // Auto-unlock if requirements are met
                if (dualCheck.canUnlock && !dualCheck.unlocked) {
                    this.cultivationSystem.unlockDualCultivation();
                }
            }

            // Start cultivation
            this.cultivationSystem.startCultivation(path, technique);

            return {
                success: true,
                path: path,
                technique: technique,
                rates: this.cultivationSystem.getCurrentRates()
            };

        } catch (error) {
            console.error('CultivationIntegration: Failed to start cultivation:', error);
            return {
                success: false,
                reason: 'error',
                error: error.message
            };
        }
    }

    /**
     * Stop cultivation
     * @returns {Object} Stop result
     */
    stopCultivation() {
        if (!this.isInitialized) {
            throw new Error('Cultivation system not initialized');
        }

        try {
            this.cultivationSystem.stopCultivation();

            return {
                success: true,
                finalState: this.cultivationSystem.cultivationState
            };

        } catch (error) {
            console.error('CultivationIntegration: Failed to stop cultivation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Attempt breakthrough
     * @param {string} type - Breakthrough type ('stage', 'realm', 'cultivation')
     * @param {string} path - Cultivation path (for cultivation breakthroughs)
     * @param {Object} options - Breakthrough options
     * @returns {Object} Breakthrough result
     */
    attemptBreakthrough(type, path = null, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Cultivation system not initialized');
        }

        try {
            let result;

            switch (type) {
                case 'cultivation':
                    if (!path) {
                        throw new Error('Cultivation path required for cultivation breakthrough');
                    }
                    result = this.cultivationSystem.attemptBreakthrough(path, options);
                    break;

                case 'stage':
                case 'realm':
                    result = this.realmManager.attemptBreakthrough({
                        ...options,
                        targetType: type
                    });
                    break;

                default:
                    throw new Error(`Invalid breakthrough type: ${type}`);
            }

            // Check for achievements after breakthrough
            if (result.success) {
                this.realmManager.checkAchievements();
            }

            return result;

        } catch (error) {
            console.error('CultivationIntegration: Breakthrough failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get comprehensive cultivation status
     * @returns {Object} Complete cultivation status
     */
    getCultivationStatus() {
        if (!this.isInitialized) {
            return null;
        }

        return {
            cultivation: {
                state: this.cultivationSystem.cultivationState,
                rates: this.cultivationSystem.getCurrentRates(),
                isActive: this.cultivationSystem.isActive,
                activePath: this.cultivationSystem.activePath,
                statistics: this.cultivationSystem.getStatistics()
            },
            realm: {
                current: this.realmManager.getCurrentRealm(),
                stage: this.realmManager.getCurrentStage(),
                progress: this.realmManager.getRealmProgress(),
                advancement: this.realmManager.checkRealmAdvancement(),
                bonus: this.realmManager.getCurrentRealmBonus(),
                statistics: this.realmManager.getBreakthroughStats()
            },
            techniques: {
                unlocked: this.techniqueManager.getUnlockedTechniques(),
                active: this.techniqueManager.techniqueState.active,
                mastery: this.techniqueManager.getTechniqueMastery(),
                multipliers: this.techniqueManager.getActiveMultipliers()
            },
            offline: {
                config: this.offlineCalculator.getConfig(),
                lastCalculation: this.offlineCalculator.getCalculationState(),
                performance: this.offlineCalculator.getPerformanceMetrics()
            }
        };
    }

    /**
     * Get cultivation data for UI display
     * @returns {Object} UI-friendly cultivation data
     */
    getCultivationDataForUI() {
        const status = this.getCultivationStatus();
        if (!status) return null;

        return {
            // Current state
            qi: {
                level: status.cultivation.state.qi.level,
                experience: status.cultivation.state.qi.experience,
                experienceRequired: CULTIVATION_FORMULAS.experienceRequired(status.cultivation.state.qi.level),
                rate: status.cultivation.rates.qi,
                progress: status.cultivation.state.qi.experience /
                    CULTIVATION_FORMULAS.experienceRequired(status.cultivation.state.qi.level)
            },
            body: {
                level: status.cultivation.state.body.level,
                experience: status.cultivation.state.body.experience,
                experienceRequired: CULTIVATION_FORMULAS.experienceRequired(status.cultivation.state.body.level),
                rate: status.cultivation.rates.body,
                progress: status.cultivation.state.body.experience /
                    CULTIVATION_FORMULAS.experienceRequired(status.cultivation.state.body.level)
            },
            dual: {
                level: status.cultivation.state.dual.level,
                experience: status.cultivation.state.dual.experience,
                unlocked: status.cultivation.state.dual.unlocked,
                rate: status.cultivation.rates.dual,
                synergyBonus: status.cultivation.state.dual.synergyBonus
            },

            // Realm information
            realm: {
                name: status.realm.current,
                stage: status.realm.stage,
                progress: status.realm.progress.progress,
                canAdvance: status.realm.advancement.canAdvance,
                nextRealm: status.realm.advancement.nextRealm,
                benefits: status.realm.bonus
            },

            // Active technique
            technique: status.techniques.active ? {
                id: status.techniques.active,
                info: this.techniqueManager.getTechniqueInfo(status.techniques.active),
                multipliers: status.techniques.multipliers
            } : null,

            // Available techniques
            availableTechniques: status.techniques.unlocked.map(id =>
                this.techniqueManager.getTechniqueInfo(id)
            ).filter(tech => tech.canActivate),

            // Cultivation status
            isActive: status.cultivation.isActive,
            activePath: status.cultivation.activePath
        };
    }

    /**
     * Shutdown the cultivation integration
     */
    shutdown() {
        try {
            console.log('CultivationIntegration: Shutting down...');

            // Stop update loop
            this._stopUpdateLoop();

            // Stop cultivation if active
            if (this.cultivationSystem && this.cultivationSystem.isActive) {
                this.cultivationSystem.stopCultivation();
            }

            // Save state
            this._saveAllSystems();

            this.isRunning = false;

            console.log('CultivationIntegration: Shutdown complete');

        } catch (error) {
            console.error('CultivationIntegration: Shutdown error:', error);
        }
    }

    // Private methods

    /**
     * Initialize all cultivation systems
     */
    async _initializeCultivationSystems() {
        // Initialize RealmManager first (no dependencies)
        console.log('CultivationIntegration: Initializing RealmManager...');
        this.realmManager = new RealmManager(this.gameState, this.eventManager);
        await this.realmManager.initialize();

        // Initialize TechniqueManager
        console.log('CultivationIntegration: Initializing TechniqueManager...');
        this.techniqueManager = new TechniqueManager(this.gameState, this.eventManager);
        await this.techniqueManager.initialize();

        // Initialize CultivationSystem (depends on RealmManager and TechniqueManager)
        console.log('CultivationIntegration: Initializing CultivationSystem...');
        this.cultivationSystem = new CultivationSystem(
            this.gameState,
            this.eventManager,
            this.realmManager,
            this.techniqueManager
        );
        await this.cultivationSystem.initialize();

        // Initialize OfflineCalculator last (depends on all other systems)
        console.log('CultivationIntegration: Initializing OfflineCalculator...');
        this.offlineCalculator = new OfflineCalculator(
            this.gameState,
            this.eventManager,
            this.cultivationSystem,
            this.realmManager,
            this.techniqueManager
        );
        await this.offlineCalculator.initialize();
    }

    /**
     * Set up integration event handlers
     */
    _setupIntegrationEventHandlers() {
        // Auto-save when significant events occur
        const saveEvents = [
            'cultivation:breakthrough',
            'realm:advancement',
            'technique:unlocked',
            'offline:calculation_complete'
        ];

        saveEvents.forEach(eventType => {
            this.eventManager.on(eventType, () => {
                this._saveAllSystems();
            });
        });

        // Handle offline time calculation
        this.eventManager.on('gameState:loaded', () => {
            // OfflineCalculator will handle this automatically
        });

        // Handle game shutdown
        this.eventManager.on('game:beforeUnload', () => {
            this.shutdown();
        });
    }

    /**
     * Start the update loop
     */
    _startUpdateLoop() {
        if (this.updateTimer) {
            this._stopUpdateLoop();
        }

        this.lastUpdateTime = Date.now();

        this.updateTimer = setInterval(() => {
            this._updateSystems();
        }, this.updateInterval);

        console.log('CultivationIntegration: Update loop started');
    }

    /**
     * Stop the update loop
     */
    _stopUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            console.log('CultivationIntegration: Update loop stopped');
        }
    }

    /**
     * Update all cultivation systems
     */
    _updateSystems() {
        if (!this.isRunning || !this.isInitialized) {
            return;
        }

        try {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastUpdateTime;
            this.lastUpdateTime = currentTime;

            // Update cultivation system
            if (this.cultivationSystem) {
                this.cultivationSystem.update(deltaTime);
            }

            // Update technique system
            if (this.techniqueManager) {
                this.techniqueManager.update(deltaTime);
            }

            // Offline calculator doesn't need regular updates

            // Emit update event for UI
            this.eventManager.emit('cultivation:updated', {
                timestamp: currentTime,
                deltaTime: deltaTime
            });

        } catch (error) {
            console.error('CultivationIntegration: Update error:', error);
        }
    }

    /**
     * Save state for all cultivation systems
     */
    _saveAllSystems() {
        try {
            if (this.cultivationSystem) {
                this.cultivationSystem.saveState();
            }
            if (this.realmManager) {
                this.realmManager.saveState();
            }
            if (this.techniqueManager) {
                this.techniqueManager.saveState();
            }
            // OfflineCalculator saves its config automatically

        } catch (error) {
            console.error('CultivationIntegration: Save error:', error);
        }
    }

    /**
     * Update game state schema with cultivation data
     */
    _updateGameStateSchema() {
        // Ensure game state has proper cultivation structure
        const currentState = this.gameState.getState();

        // Initialize cultivation state if it doesn't exist
        if (!currentState.cultivation) {
            this.gameState.update({
                cultivation: {
                    qi: { level: 0, experience: 0, baseRate: 1.0, currentMultiplier: 1.0 },
                    body: { level: 0, experience: 0, baseRate: 1.0, currentMultiplier: 1.0 },
                    dual: { level: 0, experience: 0, unlocked: false, synergyBonus: 0.0 }
                }
            }, { source: 'cultivation:schema_update' });
        }

        // Initialize cultivation stats if they don't exist
        if (!currentState.cultivationStats) {
            this.gameState.update({
                cultivationStats: {
                    totalCultivationTime: 0,
                    qiBreakthroughs: 0,
                    bodyBreakthroughs: 0,
                    dualBreakthroughs: 0,
                    perfectBreakthroughs: 0,
                    failedBreakthroughs: 0,
                    pillsConsumed: 0,
                    spiritStonesUsed: 0
                }
            }, { source: 'cultivation:schema_update' });
        }

        // Initialize techniques state if it doesn't exist
        if (!currentState.techniques) {
            this.gameState.update({
                techniques: {
                    unlocked: [],
                    active: null,
                    mastery: [],
                    effects: [],
                    resources: { qi: 0, spiritStones: 0 }
                }
            }, { source: 'cultivation:schema_update' });
        }
    }
}

// Create singleton instance
let cultivationIntegration = null;

/**
 * Get or create the cultivation integration instance
 * @returns {CultivationIntegration} The cultivation integration instance
 */
function getCultivationIntegration() {
    if (!cultivationIntegration) {
        cultivationIntegration = new CultivationIntegration();
    }
    return cultivationIntegration;
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CultivationIntegration, getCultivationIntegration };
} else if (typeof window !== 'undefined') {
    window.CultivationIntegration = CultivationIntegration;
    window.getCultivationIntegration = getCultivationIntegration;
}