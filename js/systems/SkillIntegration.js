/**
 * SkillIntegration - Integrates the skills system with the core game
 * Handles initialization, coordination, and lifecycle management of skill systems
 */
class SkillIntegration {
    constructor() {
        // Core system references
        this.gameState = null;
        this.eventManager = null;

        // Skill system components
        this.skillSystem = null;
        this.skillManager = null;

        // Integration state
        this.isInitialized = false;
        this.isRunning = false;
        this.lastUpdateTime = 0;

        // Update timing
        this.updateInterval = 1000; // Update every second
        this.updateTimer = null;

        // Integration tracking
        this.integrationVersion = '1.0.0';
        this.statistics = {
            updatesExecuted: 0,
            lastUpdateDuration: 0,
            totalUpdateTime: 0
        };

        console.log('SkillIntegration: Initialized');
    }

    /**
     * Initialize the skill integration system
     * @param {GameState} gameState - Game state instance
     * @param {EventManager} eventManager - Event manager instance
     */
    async initialize(gameState, eventManager) {
        try {
            if (this.isInitialized) {
                console.warn('SkillIntegration: Already initialized');
                return;
            }

            console.log('SkillIntegration: Starting initialization...');

            // Store core system references
            this.gameState = gameState;
            this.eventManager = eventManager;

            // Initialize skill systems in order
            await this._initializeSkillSystems();

            // Set up integration event handlers
            this._setupIntegrationEventHandlers();

            // Set up periodic updates
            this._startUpdateLoop();

            // Update game state with skill integration metadata
            this._updateGameStateSchema();

            this.isInitialized = true;
            this.isRunning = true;

            // Emit initialization complete event
            this.eventManager.emit('skills:integration_complete', {
                timestamp: Date.now(),
                version: this.integrationVersion,
                systems: {
                    skillSystem: !!this.skillSystem,
                    skillManager: !!this.skillManager
                }
            });

            console.log('SkillIntegration: Initialization complete');

        } catch (error) {
            console.error('SkillIntegration: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Update the skill integration - called from main update loop
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isRunning) {
            return;
        }

        const updateStart = performance.now();

        try {
            // Update skill system
            if (this.skillSystem) {
                this.skillSystem.update(deltaTime);
            }

            // Update statistics
            this.statistics.updatesExecuted++;
            this.statistics.lastUpdateDuration = performance.now() - updateStart;
            this.statistics.totalUpdateTime += this.statistics.lastUpdateDuration;

        } catch (error) {
            console.error('SkillIntegration: Update failed:', error);

            // Emit error event
            this.eventManager.emit('skills:integration_error', {
                error: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });

            // Continue execution - don't let skill system errors break the game
        }
    }

    /**
     * Get skill system instance
     * @returns {SkillSystem|null} Skill system instance
     */
    getSkillSystem() {
        return this.skillSystem;
    }

    /**
     * Get skill manager instance
     * @returns {SkillManager|null} Skill manager instance
     */
    getSkillManager() {
        return this.skillManager;
    }

    /**
     * Get skill effects for other systems
     * @returns {Object} Active skill effects
     */
    getActiveSkillEffects() {
        if (!this.skillSystem || !this.skillSystem.isReady()) {
            return {};
        }

        return this.skillSystem.getActiveEffects();
    }

    /**
     * Check if skills system is ready for use
     * @returns {boolean} Whether skills system is ready
     */
    isReady() {
        return this.isInitialized && this.isRunning &&
               this.skillSystem && this.skillSystem.isReady();
    }

    /**
     * Get integration statistics
     * @returns {Object} Integration performance statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            skillSystemReady: this.skillSystem ? this.skillSystem.isReady() : false,
            skillManagerReady: this.skillManager ? this.skillManager.isReady() : false
        };
    }

    /**
     * Shutdown the skill integration
     */
    async shutdown() {
        try {
            console.log('SkillIntegration: Starting shutdown...');

            this.isRunning = false;

            // Stop update loop
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
                this.updateTimer = null;
            }

            // Clean up event handlers
            this._cleanupIntegrationEventHandlers();

            // Shutdown skill systems
            if (this.skillSystem) {
                await this.skillSystem.shutdown();
                this.skillSystem = null;
            }

            if (this.skillManager) {
                await this.skillManager.shutdown();
                this.skillManager = null;
            }

            // Clear references
            this.gameState = null;
            this.eventManager = null;

            this.isInitialized = false;

            console.log('SkillIntegration: Shutdown complete');

        } catch (error) {
            console.error('SkillIntegration: Shutdown failed:', error);
            throw error;
        }
    }

    // Private methods

    /**
     * Initialize skill system components
     */
    async _initializeSkillSystems() {
        console.log('SkillIntegration: Initializing skill systems...');

        // Initialize SkillManager first
        this.skillManager = new SkillManager(this.gameState, this.eventManager);
        await this.skillManager.initialize();

        // Initialize SkillSystem with manager
        this.skillSystem = new SkillSystem(this.gameState, this.eventManager, this.skillManager);
        await this.skillSystem.initialize();

        console.log('SkillIntegration: Skill systems initialized');
    }

    /**
     * Set up integration-level event handlers
     */
    _setupIntegrationEventHandlers() {
        // Listen for game state events
        this.eventManager.on('gameState:loaded', this._onGameStateLoaded.bind(this));
        this.eventManager.on('gameState:reset', this._onGameStateReset.bind(this));

        // Listen for system events that affect skills
        this.eventManager.on('cultivation:levelUp', this._onCultivationLevelUp.bind(this));
        this.eventManager.on('combat:victory', this._onCombatVictory.bind(this));

        // Listen for error events
        this.eventManager.on('error:critical', this._onCriticalError.bind(this));

        console.log('SkillIntegration: Event handlers setup complete');
    }

    /**
     * Clean up integration event handlers
     */
    _cleanupIntegrationEventHandlers() {
        this.eventManager.off('gameState:loaded', this._onGameStateLoaded.bind(this));
        this.eventManager.off('gameState:reset', this._onGameStateReset.bind(this));
        this.eventManager.off('cultivation:levelUp', this._onCultivationLevelUp.bind(this));
        this.eventManager.off('combat:victory', this._onCombatVictory.bind(this));
        this.eventManager.off('error:critical', this._onCriticalError.bind(this));
    }

    /**
     * Start the update loop
     */
    _startUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.update(this.updateInterval);
        }, this.updateInterval);

        console.log('SkillIntegration: Update loop started');
    }

    /**
     * Update game state schema for skill integration
     */
    _updateGameStateSchema() {
        // Set integration metadata
        this.gameState.set('skillIntegration', {
            version: this.integrationVersion,
            initialized: true,
            timestamp: Date.now()
        });
    }

    // Event handlers

    /**
     * Handle game state loaded event
     */
    _onGameStateLoaded() {
        console.log('SkillIntegration: Game state loaded, reinitializing skill systems...');

        // Trigger skill system reinitialization if needed
        if (this.skillSystem) {
            this.skillSystem._calculateSkillEffects();
        }
    }

    /**
     * Handle game state reset event
     */
    _onGameStateReset() {
        console.log('SkillIntegration: Game state reset, clearing skill data...');

        // Trigger skill system reset
        if (this.skillSystem) {
            this.skillSystem._onGameStateReset();
        }
    }

    /**
     * Handle cultivation level up event
     */
    _onCultivationLevelUp(data) {
        // Skills might provide bonuses based on cultivation level
        if (this.skillSystem && this.skillSystem.isReady()) {
            // Trigger effect recalculation
            this.eventManager.emit('skills:cultivation_affected', {
                cultivationData: data,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle combat victory event
     */
    _onCombatVictory(data) {
        // Skills might provide rewards or bonuses on combat victory
        if (this.skillSystem && this.skillSystem.isReady()) {
            this.eventManager.emit('skills:combat_affected', {
                combatData: data,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Handle critical error event
     */
    _onCriticalError(data) {
        console.error('SkillIntegration: Critical error detected, gracefully degrading skill system');

        // Disable skill system to prevent further errors
        this.isRunning = false;

        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}

// Singleton instance
let skillIntegration = null;

/**
 * Get or create the skill integration singleton
 * @returns {SkillIntegration} Skill integration instance
 */
function getSkillIntegration() {
    if (!skillIntegration) {
        skillIntegration = new SkillIntegration();
    }
    return skillIntegration;
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SkillIntegration, getSkillIntegration };
} else if (typeof window !== 'undefined') {
    window.SkillIntegration = SkillIntegration;
    window.getSkillIntegration = getSkillIntegration;
}