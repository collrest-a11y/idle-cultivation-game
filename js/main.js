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
        this.progressiveLoader = null;
        this.loadingProgress = null;
this.errorAnalytics = null;        this.errorDashboard = null;

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
            await this._initializeCoreSystems();

            // Set up error handling
            this._setupErrorHandling();

            // Set up lifecycle handlers
            this._setupLifecycleHandlers();

            // Initialize progressive loader and UI
            this._initializeProgressiveLoading();

            // Show loading UI
            if (this.loadingProgress) {
                this.loadingProgress.show();
            }

            // Register and load game modules with progressive loading
            await this._loadGameModules();

            // Start the game
            this._startGame();

            this.isInitialized = true;
            this.isRunning = true;

            // Initialization successful - reset failure count
            if (window.safeMode) {
                window.safeMode.resetFailures();
            }

            console.log('✅ Game initialized successfully');

            // Hide loading screen
            if (window.LoadingManager) {
                window.LoadingManager.hide();
            }

            // Emit initialization complete event
            this.eventManager.emit('game:initialized', {
                timestamp: Date.now(),
                config: this.config
            });

        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.handleError(error);

            // Record failure and check if we should activate safe mode
            if (window.safeMode) {
                const shouldActivateSafeMode = window.safeMode.recordFailure(error, 'game_initialization');

                if (shouldActivateSafeMode) {
                    // Activate safe mode instead of throwing
                    console.warn('🛡️ Activating Safe Mode due to repeated failures...');
                    await this._activateSafeMode();
                    return; // Don't throw - safe mode is now active
                }
            }

            // Show error in loading screen
            if (window.LoadingManager) {
                const userMessage = 'Failed to initialize the game. Please refresh the page to try again.';
                const technicalDetails = `${error.message}\n${error.stack || ''}`;
                window.LoadingManager.showError(userMessage, technicalDetails);
            }

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

    async _initializeCoreSystems() {
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
// Initialize ErrorAnalytics and ErrorDashboard            if (typeof ErrorAnalytics !== 'undefined' && typeof ErrorDashboard !== 'undefined') {                this.errorAnalytics = new ErrorAnalytics();                this.errorDashboard = new ErrorDashboard();                // Initialize dashboard with error manager and analytics                this.errorDashboard.initialize(this.errorManager, this.errorAnalytics).then(() => {                    console.log('🎯 ErrorDashboard initialized');                }).catch(error => {                    console.error('ErrorDashboard initialization failed:', error);                });                // Connect analytics to error manager                if (this.errorManager.onError) {                    const originalOnError = this.errorManager.onError.bind(this.errorManager);                    this.errorManager.onError = (error) => {                        originalOnError(error);                        if (this.errorAnalytics) {                            this.errorAnalytics.recordError(error);                        }                    };                }                // Make globally accessible for debugging                window.errorAnalytics = this.errorAnalytics;                window.errorDashboard = this.errorDashboard;            }
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

    _initializeProgressiveLoading() {
        console.log('🔄 Initializing progressive loading...');

        // Initialize ProgressiveLoader
        if (typeof ProgressiveLoader !== 'undefined') {
            this.progressiveLoader = new ProgressiveLoader();
            this.progressiveLoader.initialize({
                moduleManager: this.moduleManager,
                eventManager: this.eventManager
            });
            console.log('✅ ProgressiveLoader initialized');
        } else {
            console.warn('ProgressiveLoader not available, using standard loading');
            // Fallback: create a wrapper that uses standard loading
            this.progressiveLoader = {
                loadAllPhases: async () => await this.moduleManager.loadAllModules()
            };
        }

        // Initialize LoadingProgress UI
        if (typeof LoadingProgress !== 'undefined') {
            const loadingContainer = document.getElementById('loading-container') || document.body;
            this.loadingProgress = new LoadingProgress(loadingContainer);
            this.loadingProgress.initialize({
                progressiveLoader: this.progressiveLoader,
                eventManager: this.eventManager
            });
            console.log('✅ LoadingProgress UI initialized');
        } else {
            console.warn('LoadingProgress not available, loading UI disabled');
        }
    }

    async _loadGameModules() {
        console.log('📦 Loading game modules...');

        try {
            // Validate core systems before module registration
            this._validateCoreSystemsReady();

            // Register core game modules
            this._registerGameModules();

            // Validate module registration
            this._validateModuleRegistration();

            // Load all modules with progressive loading
            const loadResults = await this.progressiveLoader.loadAllPhases();

            if (loadResults.success) {
                console.log(`✅ Loaded ${loadResults.loadedCount} modules successfully in ${loadResults.totalTime.toFixed(2)}ms`);
            } else {
                console.warn(`⚠️ Module loading completed with ${loadResults.failedCount} failures`);
            }

            if (loadResults.failedModules.length > 0) {
                console.error('Failed modules:', loadResults.failedModules);

                // Report critical module failures
                const criticalModules = ['ui', 'cultivation'];
                const failedCritical = loadResults.failedModules.filter(m => criticalModules.includes(m));

                if (failedCritical.length > 0) {
                    const errorMsg = `Critical modules failed to load: ${failedCritical.join(', ')}`;
                    console.error(errorMsg);

                    if (this.errorManager) {
                        this.errorManager.reportCriticalError(new Error(errorMsg), {
                            context: 'Module Loading',
                            failedModules: failedCritical,
                            loadResults
                        });
                    }

                    throw new Error(errorMsg);
                }
            }

            return loadResults;

        } catch (error) {
            console.error('Module loading failed:', error);

            if (this.errorManager) {
                this.errorManager.reportError(error, {
                    context: 'Module Loading',
                    phase: 'module_load'
                }, 'critical');
            }

            throw error;
        }
    }

    /**
     * Validate that core systems are ready for module loading
     * @private
     */
    _validateCoreSystemsReady() {
        const required = [
            { name: 'EventManager', instance: this.eventManager },
            { name: 'GameState', instance: this.gameState },
            { name: 'TimeManager', instance: this.timeManager },
            { name: 'GameLoop', instance: this.gameLoop },
            { name: 'ModuleManager', instance: this.moduleManager }
        ];

        const missing = required.filter(sys => !sys.instance);

        if (missing.length > 0) {
            const missingNames = missing.map(s => s ? s.name : 'undefined').join(', ');
            throw new Error(`Core systems not ready for module loading: ${missingNames}`);
        }

        // Check if GameState has been loaded
        if (!this.gameState.get('meta')) {
            console.warn('GameState may not be fully initialized - meta information missing');
        }

        console.log('✅ Core systems validated and ready');
    }

    /**
     * Validate module registration
     * @private
     */
    _validateModuleRegistration() {
        const stats = this.moduleManager.getStatistics();

        if (stats.totalModules === 0) {
            throw new Error('No modules registered');
        }

        // Validate dependency graph
        const depInfo = this.moduleManager.getDependencyInfo();
        console.log(`📊 Module dependency validation: ${stats.totalModules} modules registered`);

        // Check for potential issues
        for (const [moduleName, deps] of Object.entries(depInfo.dependencies)) {
            if (deps.length > 5) {
                console.warn(`Module '${moduleName}' has many dependencies (${deps.length}): ${deps.join(', ')}`);
            }
        }
    }

    _registerGameModules() {
        // For now, we'll register placeholder modules that will be implemented later
        // These modules will contain the actual game logic

        // UI Module - handles all UI updates and interactions
        this.moduleManager.registerModule('ui', {
            priority: 100,  // Critical module
            factory: async (context) => {
                const module = {
                    name: 'UI Module',
                    init: async () => {
                        console.log('UI Module initialized');
                        // Initialize UI systems here

                        // Initialize ViewIntegration if available
                        if (typeof ViewIntegration !== 'undefined') {
                            try {
                                const viewIntegration = new ViewIntegration();
                                await viewIntegration.initialize();
                                module.viewIntegration = viewIntegration;
                                console.log('ViewIntegration initialized successfully');
                            } catch (error) {
                                console.warn('ViewIntegration initialization failed:', error);
                                // Don't fail the entire module for view integration issues
                            }
                        }
                    },
                    update: (deltaTime) => {
                        // Update UI elements
                        if (module.viewIntegration) {
                            try {
                                module.viewIntegration.update(deltaTime);
                            } catch (error) {
                                console.warn('ViewIntegration update error:', error);
                            }
                        }
                    },
                    shutdown: () => {
                        if (module.viewIntegration) {
                            module.viewIntegration.shutdown();
                        }
                    }
                };
                return module;
            },
            dependencies: [],
            priority: 100
        });

        // Cultivation Module - handles cultivation mechanics
        this.moduleManager.registerModule('cultivation', {
            priority: 90,  // Critical module
            factory: async (context) => {
                const module = {
                    name: 'Cultivation Module',
                    cultivationIntegration: null,
                    init: async function() {
                        console.log('Cultivation Module initializing...');

                        // Get the cultivation integration instance
                        this.cultivationIntegration = getCultivationIntegration();

                        // Initialize the cultivation system
                        await this.cultivationIntegration.initialize(context.gameState, context.eventManager);

                        console.log('Cultivation Module initialized');
                    },
                    update: function(deltaTime) {
                        // Cultivation system updates itself via integration
                        // This space could be used for additional cultivation-related updates
                    },
                    shutdown: function() {
                        if (this.cultivationIntegration) {
                            this.cultivationIntegration.shutdown();
                        }
                    }
                };
                return module;
            },
            dependencies: [],
            priority: 90
        });

        // Skills Module - handles skill system mechanics
        this.moduleManager.registerModule('skills', {
            priority: 85,  // UI module
            factory: async (context) => {
                const module = {
                    name: 'Skills Module',
                    skillIntegration: null,
                    skillTreeComponent: null,
                    skillDetailModal: null,
                    init: async () => {
                        console.log('Skills Module initializing...');

                        // Get the skill integration instance
                        module.skillIntegration = getSkillIntegration();

                        // Initialize the skill system
                        await module.skillIntegration.initialize(context.gameState, context.eventManager);

                        // Initialize UI components
                        await module._initializeSkillsUI(context);

                        console.log('Skills Module initialized');
                    },
                    update: (deltaTime) => {
                        // Skills system updates itself via integration
                        if (module.skillIntegration) {
                            module.skillIntegration.update(deltaTime);
                        }

                        // Update UI components
                        if (module.skillTreeComponent) {
                            module.skillTreeComponent.update(deltaTime);
                        }
                    },
                    shutdown: () => {
                        if (module.skillTreeComponent) {
                            module.skillTreeComponent.shutdown();
                        }
                        if (module.skillDetailModal) {
                            module.skillDetailModal.shutdown();
                        }
                        if (module.skillIntegration) {
                            module.skillIntegration.shutdown();
                        }
                    },
                    async _initializeSkillsUI(context) {
                        let uiInitialized = false;

                        try {
                            // Validate prerequisites
                            if (!context.eventManager) {
                                console.warn('Skills UI: EventManager not available, skipping UI initialization');
                                return;
                            }

                            if (!module.skillIntegration?.getSkillSystem) {
                                console.warn('Skills UI: SkillSystem not available, skipping UI initialization');
                                return;
                            }

                            // Initialize skill tree component with error handling
                            const skillsInterface = document.getElementById('skills-interface');
                            if (skillsInterface && typeof SkillTreeComponent !== 'undefined') {
                                try {
                                    module.skillTreeComponent = new SkillTreeComponent(
                                        skillsInterface,
                                        context.eventManager,
                                        module.skillIntegration.getSkillSystem()
                                    );
                                    await module.skillTreeComponent.initialize();
                                    uiInitialized = true;
                                } catch (treeError) {
                                    console.warn('Skills UI: SkillTreeComponent initialization failed, continuing without it:', treeError.message);
                                    module.skillTreeComponent = null;
                                }
                            } else {
                                console.log('Skills UI: Skills interface element not found or SkillTreeComponent not loaded');
                            }

                            // Initialize skill detail modal with error handling
                            if (typeof SkillDetailModal !== 'undefined') {
                                try {
                                    const modalContainer = document.createElement('div');
                                    modalContainer.id = 'skill-detail-modal-container';
                                    modalContainer.style.display = 'none';
                                    document.body.appendChild(modalContainer);

                                    module.skillDetailModal = new SkillDetailModal(
                                        modalContainer,
                                        context.eventManager,
                                        module.skillIntegration.getSkillSystem()
                                    );
                                    await module.skillDetailModal.initialize();
                                    uiInitialized = true;

                                    // Set up cross-component communication
                                    context.eventManager.on('skillTree:skillSelected', (data) => {
                                        if (module.skillDetailModal && module.skillDetailModal.show) {
                                            module.skillDetailModal.show(data.skillId);
                                        }
                                    });
                                } catch (modalError) {
                                    console.warn('Skills UI: SkillDetailModal initialization failed, continuing without it:', modalError.message);
                                    module.skillDetailModal = null;
                                }
                            } else {
                                console.log('Skills UI: SkillDetailModal class not loaded');
                            }

                            if (uiInitialized) {
                                console.log('Skills UI: Components initialized successfully');
                            } else {
                                console.log('Skills UI: No UI components were initialized (non-critical)');
                            }

                        } catch (error) {
                            // Non-critical error - skills backend still works
                            console.warn('Skills UI: Initialization completed with warnings:', error.message);
                        }
                    }
                };
                return module;
            },
            dependencies: ['cultivation'],
            priority: 85
        });

        // Combat Module - handles combat mechanics
        this.moduleManager.registerModule('combat', { priority: 80,
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
            priority: 70,
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
            priority: 65,
            factory: async (context) => {
                const module = {
                    name: 'Sect Module',
                    sectSystem: null,
                    sectManager: null,
                    sectActivities: null,
                    sectCompetition: null,
                    sectIntegration: null,
                    init: async function() {
                        console.log('Sect Module initializing...');

                        try {
                            // Check if Sect classes are available
                            if (typeof SectSystem === 'undefined' ||
                                typeof SectManager === 'undefined' ||
                                typeof SectActivities === 'undefined' ||
                                typeof SectCompetition === 'undefined' ||
                                typeof SectIntegration === 'undefined') {
                                console.warn('Sect Module: Required classes not loaded, skipping initialization');
                                return;
                            }

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
                        } catch (error) {
                            console.error('Sect Module initialization failed:', error);
                            // Don't throw - allow game to continue without sect system
                        }
                    },
                    update: function(deltaTime) {
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
                return module; // CRITICAL FIX: Module must be returned
            },
            dependencies: ['cultivation'],
            priority: 65
        });

        // Save Module - handles auto-saving
        this.moduleManager.registerModule('save', {
            priority: 60,
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

    /**
     * Activate Safe Mode
     * @private
     */
    async _activateSafeMode() {
        console.log('[Main] Activating Safe Mode...');

        try {
            // Ensure safe mode is available
            if (!window.safeMode) {
                throw new Error('Safe Mode not available');
            }

            // Hide any loading UI
            if (this.loadingProgress) {
                this.loadingProgress.hide();
            }

            // Clear the main game UI
            const gameInterface = document.getElementById('game-interface');
            if (gameInterface) {
                gameInterface.style.display = 'none';
            }

            const characterCreation = document.getElementById('character-creation');
            if (characterCreation) {
                characterCreation.style.display = 'none';
            }

            // Activate safe mode
            await window.safeMode.activate();

            // Initialize safe mode UI
            if (typeof SafeModeUI !== 'undefined') {
                this.safeModeUI = new SafeModeUI(window.safeMode);
                await this.safeModeUI.initialize();
            } else {
                console.error('SafeModeUI not available');
            }

            console.log('[Main] Safe Mode activated successfully');

        } catch (error) {
            console.error('[Main] Failed to activate Safe Mode:', error);
            // If even safe mode fails, the SafeMode class will show emergency fallback
            if (window.safeMode) {
                window.safeMode._showEmergencyFallback(error);
            }
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

        // Use LoadingManager to show error if available
        if (window.LoadingManager) {
            const userMessage = 'The game failed to start. Please refresh the page to try again.';
            const technicalDetails = `${error.message}\n${error.stack || ''}`;
            window.LoadingManager.showError(userMessage, technicalDetails);
        } else {
            // Fallback error display if LoadingManager isn't available
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
    }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IdleCultivationGame;
} else if (typeof window !== 'undefined') {
    window.IdleCultivationGame = IdleCultivationGame;
}