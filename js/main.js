/**
 * Main entry point for the Idle Cultivation Game
 * Initializes core systems and loads game modules
 */

class IdleCultivationGame {
    constructor() {
        this.isInitialized = false;
        this.isRunning = false;

        // Core system instances
        this.eventManager = null;
        this.gameState = null;
        this.timeManager = null;
        this.gameLoop = null;
        this.moduleManager = null;

        // Game configuration
        this.config = {
            debugMode: false,
            enableHotReload: false,
            autoSave: true,
            gameTickRate: 10,
            maxOfflineHours: 24
        };

        // Bind methods
        this.handleError = this.handleError.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    }

    /**
     * Initialize the game
     * @param {Object} userConfig - User configuration overrides
     * @returns {Promise<void>}
     */
    async init(userConfig = {}) {
        if (this.isInitialized) {
            console.warn('Game is already initialized');
            return;
        }

        try {
            console.log('🎮 Initializing Idle Cultivation Game...');

            // Merge user config
            this.config = { ...this.config, ...userConfig };

            // Initialize core systems
            await this._initializeCoreystems();

            // Set up error handling
            this._setupErrorHandling();

            // Set up lifecycle handlers
            this._setupLifecycleHandlers();

            // Register and load game modules
            await this._loadGameModules();

            // Start the game
            this._startGame();

            this.isInitialized = true;
            this.isRunning = true;

            console.log('✅ Game initialized successfully');

            // Emit initialization complete event
            this.eventManager.emit('game:initialized', {
                timestamp: Date.now(),
                config: this.config
            });

        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Start the game loop and systems
     */
    start() {
        if (!this.isInitialized) {
            throw new Error('Game must be initialized before starting');
        }

        if (this.isRunning) {
            console.warn('Game is already running');
            return;
        }

        this.gameLoop.start();
        this.isRunning = true;

        this.eventManager.emit('game:started', { timestamp: Date.now() });
        console.log('▶️ Game started');
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.isRunning) {
            console.warn('Game is not running');
            return;
        }

        this.gameLoop.setPaused(true);
        this.eventManager.emit('game:paused', { timestamp: Date.now() });
        console.log('⏸️ Game paused');
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.isRunning) {
            console.warn('Game is not running');
            return;
        }

        this.gameLoop.setPaused(false);
        this.eventManager.emit('game:resumed', { timestamp: Date.now() });
        console.log('▶️ Game resumed');
    }

    /**
     * Stop the game
     */
    stop() {
        if (!this.isRunning) {
            console.warn('Game is not running');
            return;
        }

        this.gameLoop.stop();
        this.isRunning = false;

        // Save the game state
        this.gameState.save();

        this.eventManager.emit('game:stopped', { timestamp: Date.now() });
        console.log('⏹️ Game stopped');
    }

    /**
     * Reset the game to initial state
     */
    reset() {
        this.gameState.reset();
        this.eventManager.emit('game:reset', { timestamp: Date.now() });
        console.log('🔄 Game reset');
    }

    /**
     * Get game status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isRunning: this.isRunning,
            isPaused: this.gameLoop ? this.gameLoop.isPaused : false,
            gameTime: this.timeManager ? this.timeManager.getTimeInfo() : null,
            performance: this.gameLoop ? this.gameLoop.getPerformanceMetrics() : null,
            modules: this.moduleManager ? this.moduleManager.getStatistics() : null
        };
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.config.debugMode = enabled;

        if (this.eventManager) {
            this.eventManager.setDebugMode(enabled);
        }

        console.log(`🐛 Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Handle application errors
     * @param {Error} error - The error that occurred
     */
    handleError(error) {
        console.error('Game Error:', error);

        // Use ErrorManager if available
        if (this.errorManager) {
            this.errorManager.reportError(error, {
                source: 'main_game',
                gameState: this.isInitialized ? 'initialized' : 'initializing'
            }, 'critical');
        } else {
            // Fallback error handling
            if (this.eventManager) {
                this.eventManager.emit('game:error', {
                    error: error.message,
                    stack: error.stack,
                    timestamp: Date.now()
                });
            }
        }

        // In production, might want to send error reports
        if (!this.config.debugMode) {
            // Send error to analytics/monitoring service
        }
    }

    // Private methods

    async _initializeCoreystems() {
        console.log('🔧 Initializing core systems...');

        // Initialize EventManager
        this.eventManager = new EventManager();
        if (this.config.debugMode) {
            this.eventManager.setDebugMode(true);
        }

        // Initialize ErrorManager early for comprehensive error handling
        if (typeof ErrorManager !== 'undefined') {
            this.errorManager = new ErrorManager();
            this.errorManager.initialize({
                eventManager: this.eventManager,
                gameState: null, // Will be set later
                performanceMonitor: null // Will be set later
            });
            window.errorManager = this.errorManager; // Make globally accessible
            console.log('🛡️ ErrorManager initialized');
        }

        // Initialize GameState
        this.gameState = new GameState();
        this.gameState.setEventManager(this.eventManager);

        // Update ErrorManager with GameState
        if (this.errorManager) {
            this.errorManager.gameState = this.gameState;
        }

        // Initialize SaveManager and inject into GameState
        if (typeof window.saveManager !== 'undefined') {
            this.gameState.setSaveManager(window.saveManager);
            console.log('🔧 SaveManager integrated with GameState');
        }

        // Try to load existing save data
        const loadSuccess = await this.gameState.load();
        if (loadSuccess) {
            console.log('💾 Loaded existing save data');
        } else {
            console.log('🆕 Starting with new game state');
        }

        // Initialize TimeManager
        this.timeManager = new TimeManager();
        this.timeManager.setEventManager(this.eventManager);

        // Initialize BalanceManager
        if (typeof BalanceManager !== 'undefined') {
            this.balanceManager = new BalanceManager();
            this.balanceManager.initialize({
                eventManager: this.eventManager,
                gameState: this.gameState,
                performanceMonitor: null // Will be set later when GameLoop initializes it
            });
            window.balanceManager = this.balanceManager; // Make globally accessible
            console.log('🔧 BalanceManager initialized');
        }

        // Initialize AnimationManager
        if (typeof AnimationManager !== 'undefined') {
            this.animationManager = new AnimationManager();
            this.animationManager.initialize({
                eventManager: this.eventManager,
                gameState: this.gameState,
                performanceMonitor: null // Will be set later when GameLoop initializes it
            });
            window.animationManager = this.animationManager; // Make globally accessible
            console.log('🎨 AnimationManager initialized');
        }

        // Initialize MobileManager
        if (typeof MobileManager !== 'undefined') {
            this.mobileManager = new MobileManager();
            this.mobileManager.initialize({
                eventManager: this.eventManager,
                performanceMonitor: null // Will be set later when GameLoop initializes it
            });
            window.mobileManager = this.mobileManager; // Make globally accessible
            console.log('📱 MobileManager initialized');
        }

        // Handle offline time if returning player
        const lastPlayed = this.gameState.get('meta.lastPlayed');
        if (lastPlayed) {
            const offlineData = this.timeManager.handleOfflineReturn(lastPlayed);
            if (offlineData.wasOffline) {
                console.log(`⏰ Welcome back! You were away for ${this.timeManager.formatTime(offlineData.timeAway)}`);
                this.eventManager.emit('game:offlineReturn', offlineData);
            }
        }

        // Initialize GameLoop
        this.gameLoop = new GameLoop();
        this.gameLoop.setCoreystems(this.eventManager, this.timeManager, this.gameState);
        this.gameLoop.setGameTickRate(this.config.gameTickRate);

        // Initialize ModuleManager
        this.moduleManager = new ModuleManager();
        this.moduleManager.setCoreystems({
            eventManager: this.eventManager,
            gameState: this.gameState,
            timeManager: this.timeManager,
            gameLoop: this.gameLoop
        });

        if (this.config.enableHotReload) {
            this.moduleManager.setConfig({ enableHotReload: true });
        }

        console.log('✅ Core systems initialized');
    }

    async _loadGameModules() {
        console.log('📦 Loading game modules...');

        // Register core game modules
        this._registerGameModules();

        // Load all modules
        const loadResults = await this.moduleManager.loadAllModules();

        if (loadResults.success) {
            console.log(`✅ Loaded ${loadResults.loadedCount} modules successfully`);
        } else {
            console.warn(`⚠️ Module loading completed with ${loadResults.failedCount} failures`);
        }

        if (loadResults.failedModules.length > 0) {
            console.error('Failed modules:', loadResults.failedModules);
        }
    }

    _registerGameModules() {
        // For now, we'll register placeholder modules that will be implemented later
        // These modules will contain the actual game logic

        // UI Module - handles all UI updates and interactions
        this.moduleManager.registerModule('ui', {
            factory: async (context) => {
                return {
                    name: 'UI Module',
                    init: async () => {
                        console.log('UI Module initialized');
                        // Initialize UI systems here
                    },
                    update: (deltaTime) => {
                        // Update UI elements
                    }
                };
            },
            dependencies: [],
            priority: 100
        });

        // Cultivation Module - handles cultivation mechanics
        this.moduleManager.registerModule('cultivation', {
            factory: async (context) => {
                return {
                    name: 'Cultivation Module',
                    cultivationIntegration: null,
                    init: async () => {
                        console.log('Cultivation Module initializing...');

                        // Get the cultivation integration instance
                        this.cultivationIntegration = getCultivationIntegration();

                        // Initialize the cultivation system
                        await this.cultivationIntegration.initialize(context.gameState, context.eventManager);

                        console.log('Cultivation Module initialized');
                    },
                    update: (deltaTime) => {
                        // Cultivation system updates itself via integration
                        // This space could be used for additional cultivation-related updates
                    },
                    shutdown: () => {
                        if (this.cultivationIntegration) {
                            this.cultivationIntegration.shutdown();
                        }
                    }
                };
            },
            dependencies: [],
            priority: 90
        });

        // Skills Module - handles skill system mechanics
        this.moduleManager.registerModule('skills', {
            factory: async (context) => {
                return {
                    name: 'Skills Module',
                    skillIntegration: null,
                    init: async () => {
                        console.log('Skills Module initializing...');

                        // Get the skill integration instance
                        this.skillIntegration = getSkillIntegration();

                        // Initialize the skill system
                        await this.skillIntegration.initialize(context.gameState, context.eventManager);

                        console.log('Skills Module initialized');
                    },
                    update: (deltaTime) => {
                        // Skills system updates itself via integration
                        if (this.skillIntegration) {
                            this.skillIntegration.update(deltaTime);
                        }
                    },
                    shutdown: () => {
                        if (this.skillIntegration) {
                            this.skillIntegration.shutdown();
                        }
                    }
                };
            },
            dependencies: ['cultivation'],
            priority: 85
        });

        // Combat Module - handles combat mechanics
        this.moduleManager.registerModule('combat', {
            factory: async (context) => {
                return {
                    name: 'Combat Module',
                    init: async () => {
                        console.log('Combat Module initialized');
                        // Initialize combat systems
                    },
                    update: (deltaTime) => {
                        // Update combat calculations
                    }
                };
            },
            dependencies: ['cultivation'],
            priority: 80
        });

        // Gacha Module - handles scripture gacha system
        this.moduleManager.registerModule('gacha', {
            factory: async (context) => {
                return {
                    name: 'Gacha Module',
                    init: async () => {
                        console.log('Gacha Module initialized');
                        // Initialize gacha systems
                    },
                    update: (deltaTime) => {
                        // Update gacha-related mechanics
                    }
                };
            },
            dependencies: [],
            priority: 70
        });

        // Sect Module - handles sect system mechanics
        this.moduleManager.registerModule('sect', {
            factory: async (context) => {
                return {
                    name: 'Sect Module',
                    sectSystem: null,
                    sectManager: null,
                    sectActivities: null,
                    sectCompetition: null,
                    sectIntegration: null,
                    init: async () => {
                        console.log('Sect Module initializing...');

                        // Initialize sect system components
                        this.sectSystem = new SectSystem(context.gameState, context.eventManager, window.saveManager);
                        this.sectManager = new SectManager(context.gameState, context.eventManager, this.sectSystem);
                        this.sectActivities = new SectActivities(context.gameState, context.eventManager, this.sectSystem, this.sectManager);
                        this.sectCompetition = new SectCompetition(context.gameState, context.eventManager, this.sectSystem, this.sectManager);

                        // Initialize integration last
                        this.sectIntegration = new SectIntegration();

                        // Get other system references for integration
                        const cultivationModule = context.moduleManager?.getModule('cultivation');
                        const cultivationSystem = cultivationModule?.cultivationIntegration;

                        await this.sectIntegration.initialize({
                            gameState: context.gameState,
                            eventManager: context.eventManager,
                            saveManager: window.saveManager,
                            sectSystem: this.sectSystem,
                            sectManager: this.sectManager,
                            sectActivities: this.sectActivities,
                            sectCompetition: this.sectCompetition,
                            cultivationSystem: cultivationSystem,
                            enhancementSystem: null, // Will be added when enhancement system exists
                            scriptureSystem: null // Will be added when scripture system exists
                        });

                        // Initialize individual components
                        await this.sectSystem.initialize();
                        await this.sectManager.initialize();
                        await this.sectActivities.initialize();
                        await this.sectCompetition.initialize();

                        console.log('Sect Module initialized');
                    },
                    update: (deltaTime) => {
                        // Update sect systems
                        if (this.sectSystem) this.sectSystem.update(deltaTime);
                        if (this.sectActivities) this.sectActivities.update(deltaTime);
                        if (this.sectCompetition) this.sectCompetition.update(deltaTime);
                        if (this.sectIntegration) this.sectIntegration.update(deltaTime);
                    },
                    shutdown: () => {
                        // Cleanup sect systems if needed
                        console.log('Sect Module shutting down');
                    }
                };
            },
            dependencies: ['cultivation'],
            priority: 65
        });

        // Save Module - handles auto-saving
        this.moduleManager.registerModule('save', {
            factory: async (context) => {
                return {
                    name: 'Save Module',
                    init: async () => {
                        console.log('Save Module initialized');
                    },
                    save: () => {
                        if (context.gameState && this.config.autoSave) {
                            context.gameState.save();
                        }
                    }
                };
            },
            dependencies: [],
            priority: 60
        });
    }

    _startGame() {
        // Register modules with game loop
        const uiModule = this.moduleManager.getModule('ui');
        const cultivationModule = this.moduleManager.getModule('cultivation');
        const skillsModule = this.moduleManager.getModule('skills');
        const combatModule = this.moduleManager.getModule('combat');
        const gachaModule = this.moduleManager.getModule('gacha');
        const sectModule = this.moduleManager.getModule('sect');
        const saveModule = this.moduleManager.getModule('save');

        // Register UI systems (run at 60fps)
        if (uiModule) {
            this.gameLoop.registerUISystem(uiModule);
        }

        // Register game systems (run at configurable fps)
        if (cultivationModule) {
            this.gameLoop.registerGameSystem(cultivationModule);
        }
        if (skillsModule) {
            this.gameLoop.registerGameSystem(skillsModule);
        }
        if (combatModule) {
            this.gameLoop.registerGameSystem(combatModule);
        }
        if (gachaModule) {
            this.gameLoop.registerGameSystem(gachaModule);
        }
        if (sectModule) {
            this.gameLoop.registerGameSystem(sectModule);
        }

        // Register save systems
        if (saveModule) {
            this.gameLoop.registerSaveSystem(saveModule);
        }

        // Update last played time
        this.gameState.set('meta.lastPlayed', Date.now());
    }

    _setupErrorHandling() {
        // Global error handling
        window.addEventListener('error', (event) => {
            this.handleError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new Error(event.reason));
        });
    }

    _setupLifecycleHandlers() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Handle page unload
        window.addEventListener('beforeunload', this.handleBeforeUnload);

        // Handle page focus/blur for additional offline detection
        window.addEventListener('focus', () => {
            if (this.timeManager) {
                this.resume();
            }
        });

        window.addEventListener('blur', () => {
            if (this.timeManager) {
                // Don't auto-pause, just update the last activity time
                this.gameState.set('meta.lastPlayed', Date.now());
            }
        });
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, update last played time
            if (this.gameState) {
                this.gameState.set('meta.lastPlayed', Date.now());
            }
        } else {
            // Page is visible again, handle potential offline time
            const lastPlayed = this.gameState ? this.gameState.get('meta.lastPlayed') : Date.now();
            if (this.timeManager && lastPlayed) {
                this.timeManager.handleOfflineReturn(lastPlayed);
            }
        }
    }

    handleBeforeUnload(event) {
        // Save game state before page unload
        if (this.gameState) {
            this.gameState.save();
        }

        // Update total play time
        if (this.timeManager && this.gameState) {
            const sessionTime = this.timeManager.getTimeInfo().sessionTime;
            const totalPlayTime = this.gameState.get('meta.totalPlayTime') || 0;
            this.gameState.set('meta.totalPlayTime', totalPlayTime + sessionTime);
            this.gameState.save();
        }
    }
}

// Initialize and start the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create global game instance
        window.game = new IdleCultivationGame();

        // Initialize with debug mode if in development
        const isDebug = window.location.hostname === 'localhost' || window.location.search.includes('debug=true');

        await window.game.init({
            debugMode: isDebug,
            enableHotReload: isDebug
        });

        console.log('🚀 Idle Cultivation Game is ready!');

    } catch (error) {
        console.error('Failed to start game:', error);

        // Show error message to user
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; font-family: Arial;">
                <h1>⚠️ Game Failed to Load</h1>
                <p>Sorry, there was an error starting the game.</p>
                <p>Please refresh the page to try again.</p>
                <details>
                    <summary>Error Details</summary>
                    <pre>${error.message}</pre>
                </details>
            </div>
        `;
    }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdleCultivationGame;
} else if (typeof window !== 'undefined') {
    window.IdleCultivationGame = IdleCultivationGame;
}