/**
 * ViewIntegration - Integrates the view system with the main game
 * Handles initialization, view registration, and coordination with game systems
 */
class ViewIntegration {
    constructor() {
        this.viewManager = null;
        this.uiManager = null;
        this.isInitialized = false;
        this.gameInterface = null;
        this.characterCreation = null;
    }

    /**
     * Initialize the view integration system
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('ViewIntegration: Already initialized, skipping...');
            return;
        }

        try {
            console.log('ViewIntegration: Starting initialization...');

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Get references to main containers with error handling
            this.gameInterface = document.getElementById('game-interface');
            this.characterCreation = document.getElementById('character-creation');

            if (!this.gameInterface) {
                const errorMsg = 'Game interface container not found - DOM may not be ready';
                console.error('ViewIntegration:', errorMsg);

                // Report error but attempt recovery
                if (window.errorManager) {
                    window.errorManager.reportError(errorMsg, {
                        component: 'ViewIntegration',
                        phase: 'initialization',
                        domState: document.readyState,
                        bodyExists: !!document.body
                    }, 'ui');
                }

                // Create fallback container
                this.gameInterface = this._createFallbackGameInterface();
                if (!this.gameInterface) {
                    throw new Error('Failed to create fallback game interface');
                }
            }

            // Initialize UI Manager if not already done with error handling
            try {
                if (!window.uiManager || !window.uiManager.isInitialized) {
                    if (typeof UIManager === 'undefined') {
                        console.warn('ViewIntegration: UIManager class not available, skipping UI manager initialization');
                        this.uiManager = null;
                    } else {
                        this.uiManager = window.uiManager || new UIManager();
                        await this.uiManager.init({
                            eventManager: window.eventManager || null,
                            gameState: window.gameState || null,
                            enablePerformanceMonitoring: true
                        });
                        window.uiManager = this.uiManager;
                        console.log('ViewIntegration: UIManager initialized successfully');
                    }
                } else {
                    this.uiManager = window.uiManager;
                    console.log('ViewIntegration: Using existing UIManager');
                }
            } catch (uiError) {
                console.error('ViewIntegration: Failed to initialize UIManager:', uiError);
                if (window.errorManager) {
                    window.errorManager.reportError(uiError, {
                        component: 'ViewIntegration',
                        phase: 'ui_manager_init'
                    }, 'ui');
                }
                this.uiManager = null; // Continue without UI manager
            }

            // Initialize View Manager with comprehensive error handling
            try {
                if (typeof ViewManager === 'undefined') {
                    throw new Error('ViewManager class not available');
                }

                this.viewManager = window.viewManager || new ViewManager();
                await this.viewManager.initialize({
                    container: this.gameInterface,
                    eventManager: window.eventManager || null,
                    gameState: window.gameState || null,
                    uiManager: this.uiManager,
                    startView: 'main-menu',
                    settings: {
                        enableTransitions: true,
                        transitionDuration: 300,
                        enableHistory: true,
                        maxHistoryLength: 10,
                        enableViewCaching: true,
                        cacheLimit: 5
                    }
                });
                window.viewManager = this.viewManager;
                console.log('ViewIntegration: ViewManager initialized successfully');
            } catch (viewError) {
                console.error('ViewIntegration: Failed to initialize ViewManager:', viewError);
                if (window.errorManager) {
                    window.errorManager.reportError(viewError, {
                        component: 'ViewIntegration',
                        phase: 'view_manager_init',
                        containerExists: !!this.gameInterface
                    }, 'ui');
                }
                throw viewError; // This is critical, cannot continue without ViewManager
            }

            // Register all view classes
            this.registerViewClasses();

            // Setup character creation integration
            this.setupCharacterCreation();

            // Setup game state integration
            this.setupGameStateIntegration();

            // Setup event listeners
            this.setupEventListeners();

            // Add CSS if not already added
            this.addViewCSS();

            this.isInitialized = true;
            console.log('ViewIntegration: Initialization complete');

            // Emit integration ready event with error handling
            try {
                if (window.eventManager && typeof window.eventManager.emit === 'function') {
                    window.eventManager.emit('viewIntegration:ready', {
                        viewManager: this.viewManager,
                        uiManager: this.uiManager,
                        hasCharacterCreation: !!this.characterCreation,
                        hasGameInterface: !!this.gameInterface
                    });
                } else {
                    console.warn('ViewIntegration: EventManager not available for ready event');
                }
            } catch (eventError) {
                console.error('ViewIntegration: Failed to emit ready event:', eventError);
                // Non-critical error, continue
            }

        } catch (error) {
            console.error('ViewIntegration: Initialization failed', error);

            // Report critical error
            if (window.errorManager) {
                window.errorManager.reportCriticalError(error, {
                    component: 'ViewIntegration',
                    phase: 'initialization',
                    gameInterfaceExists: !!this.gameInterface,
                    characterCreationExists: !!this.characterCreation,
                    domReady: document.readyState === 'complete'
                });
            }

            // Reset initialization state
            this.isInitialized = false;
            this.viewManager = null;
            this.uiManager = null;

            throw error;
        }
    }

    /**
     * Register all view classes globally
     */
    registerViewClasses() {
        // All view classes should already be loaded via script tags
        // This ensures they're available to the ViewManager
        const viewClasses = [
            'GameView',
            'MainMenuView',
            'CultivationView',
            'ScriptureView',
            'CombatView',
            'SectView',
            'QuestView'
        ];

        viewClasses.forEach(className => {
            if (!window[className]) {
                console.warn(`ViewIntegration: View class ${className} not found`);
            } else {
                console.log(`ViewIntegration: Registered view class ${className}`);
            }
        });
    }

    /**
     * Setup character creation integration
     */
    setupCharacterCreation() {
        try {
            if (!this.characterCreation) {
                console.warn('ViewIntegration: Character creation container not found, skipping character creation setup');
                // Assume character exists and show game interface
                this.showGameInterface();
                return;
            }

            // Listen for character creation completion with error handling
            if (window.eventManager && typeof window.eventManager.on === 'function') {
                window.eventManager.on('character:created', () => {
                    try {
                        this.showGameInterface();
                    } catch (error) {
                        console.error('ViewIntegration: Error showing game interface after character creation:', error);
                        if (window.errorManager) {
                            window.errorManager.reportError(error, {
                                component: 'ViewIntegration',
                                context: 'character_created_handler'
                            }, 'ui');
                        }
                    }
                });
            } else {
                console.warn('ViewIntegration: EventManager not available for character creation events');
            }

            // Check if character already exists with error handling
            let hasCharacter = false;
            try {
                // Check multiple sources for character existence
                hasCharacter = window.gameState?.get('player.character.created') ||
                              localStorage.getItem('idleCultivation_hasCharacter') === 'true' ||
                              false;
            } catch (error) {
                console.warn('ViewIntegration: Error checking character existence, assuming no character:', error);
                hasCharacter = false;
            }

            console.log('ViewIntegration: Character exists:', hasCharacter);

            if (hasCharacter) {
                this.showGameInterface();
            } else {
                this.showCharacterCreation();
            }
        } catch (error) {
            console.error('ViewIntegration: Error in setupCharacterCreation:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: 'setupCharacterCreation'
                }, 'ui');
            }
            // Fallback: show game interface
            this.showGameInterface();
        }
    }

    /**
     * Show character creation
     */
    showCharacterCreation() {
        try {
            if (this.characterCreation) {
                this.characterCreation.classList.remove('hidden');
                this.characterCreation.style.display = 'block';
                console.log('ViewIntegration: Character creation shown');
            } else {
                console.warn('ViewIntegration: Cannot show character creation - container not found');
            }

            if (this.gameInterface) {
                this.gameInterface.classList.add('hidden');
                this.gameInterface.style.display = 'none';
            }
        } catch (error) {
            console.error('ViewIntegration: Error showing character creation:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: 'showCharacterCreation'
                }, 'ui');
            }
        }
    }

    /**
     * Show game interface
     */
    showGameInterface() {
        try {
            if (this.characterCreation) {
                this.characterCreation.classList.add('hidden');
                this.characterCreation.style.display = 'none';
            }

            if (this.gameInterface) {
                this.gameInterface.classList.remove('hidden');
                this.gameInterface.style.display = 'block';
                console.log('ViewIntegration: Game interface shown');
            } else {
                console.error('ViewIntegration: Cannot show game interface - container not found');
                return;
            }

            // Navigate to main menu if view manager is ready
            try {
                if (this.viewManager && this.viewManager.isInitialized && typeof this.viewManager.navigateTo === 'function') {
                    this.viewManager.navigateTo('main-menu');
                    console.log('ViewIntegration: Navigated to main menu');
                } else {
                    console.warn('ViewIntegration: ViewManager not ready for navigation');
                    // Retry navigation after a short delay
                    setTimeout(() => {
                        if (this.viewManager && this.viewManager.isInitialized && typeof this.viewManager.navigateTo === 'function') {
                            this.viewManager.navigateTo('main-menu');
                        }
                    }, 1000);
                }
            } catch (navError) {
                console.error('ViewIntegration: Error navigating to main menu:', navError);
                if (window.errorManager) {
                    window.errorManager.reportError(navError, {
                        component: 'ViewIntegration',
                        method: 'showGameInterface',
                        context: 'navigation'
                    }, 'ui');
                }
            }
        } catch (error) {
            console.error('ViewIntegration: Error showing game interface:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: 'showGameInterface'
                }, 'ui');
            }
        }
    }

    /**
     * Setup game state integration
     */
    setupGameStateIntegration() {
        // Listen for game state changes and notify current view
        window.eventManager?.on('gameState:changed', (data) => {
            const currentView = this.viewManager?.getCurrentView();
            if (currentView) {
                // Find the actual view instance and call onGameStateChange
                const viewInstance = this.viewManager.views.get(currentView.viewId);
                if (viewInstance && viewInstance.onGameStateChange) {
                    viewInstance.onGameStateChange(data);
                }
            }
        });

        // Listen for system-specific updates
        this.setupSystemEventListeners();
    }

    /**
     * Setup system-specific event listeners
     */
    setupSystemEventListeners() {
        // Cultivation system events
        window.eventManager?.on('cultivation:progress', (data) => {
            this.notifyView('cultivation', 'onDataUpdate', data);
        });

        window.eventManager?.on('cultivation:breakthrough', (data) => {
            this.notifyView('cultivation', 'onBreakthrough', data);
        });

        window.eventManager?.on('realm:changed', (data) => {
            this.notifyView('cultivation', 'onRealmChanged', data);
        });

        // Scripture system events
        window.eventManager?.on('scripture:acquired', (data) => {
            this.notifyView('scripture', 'onDataUpdate', data);
        });

        window.eventManager?.on('scripture:enhanced', (data) => {
            this.notifyView('scripture', 'onDataUpdate', data);
        });

        window.eventManager?.on('gacha:result', (data) => {
            this.notifyView('scripture', 'onGachaResult', data);
        });

        // Combat system events
        window.eventManager?.on('combat:start', (data) => {
            this.notifyView('combat', 'onCombatStart', data);
        });

        window.eventManager?.on('combat:end', (data) => {
            this.notifyView('combat', 'onCombatEnd', data);
        });

        window.eventManager?.on('ranking:updated', (data) => {
            this.notifyView('combat', 'onRankingUpdate', data);
        });

        // Sect system events
        window.eventManager?.on('sect:joined', (data) => {
            this.notifyView('sect', 'onDataUpdate', data);
        });

        window.eventManager?.on('sect:contribution', (data) => {
            this.notifyView('sect', 'onContributionUpdate', data);
        });

        window.eventManager?.on('sect:mission', (data) => {
            this.notifyView('sect', 'onMissionUpdate', data);
        });

        // Quest system events
        window.eventManager?.on('quest:started', (data) => {
            this.notifyView('quest', 'onQuestUpdate', data);
        });

        window.eventManager?.on('quest:completed', (data) => {
            this.notifyView('quest', 'onQuestUpdate', data);
        });

        window.eventManager?.on('achievement:unlocked', (data) => {
            this.notifyView('quest', 'onAchievementUpdate', data);
        });
    }

    /**
     * Notify a specific view of an event
     */
    notifyView(viewId, method, data) {
        try {
            if (!this.viewManager) {
                console.warn(`ViewIntegration: Cannot notify view ${viewId} - ViewManager not available`);
                return;
            }

            if (!this.viewManager.views) {
                console.warn(`ViewIntegration: Cannot notify view ${viewId} - Views map not available`);
                return;
            }

            const viewInstance = this.viewManager.views.get(viewId);
            if (viewInstance && typeof viewInstance[method] === 'function') {
                try {
                    viewInstance[method](data);
                } catch (methodError) {
                    console.error(`ViewIntegration: Error calling ${method} on view ${viewId}:`, methodError);
                    if (window.errorManager) {
                        window.errorManager.reportError(methodError, {
                            component: 'ViewIntegration',
                            method: 'notifyView',
                            viewId,
                            targetMethod: method
                        }, 'ui');
                    }
                }
            } else {
                console.warn(`ViewIntegration: View ${viewId} not found or method ${method} not available`);
            }
        } catch (error) {
            console.error('ViewIntegration: Error in notifyView:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: 'notifyView',
                    viewId,
                    targetMethod: method
                }, 'ui');
            }
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardShortcuts(event);
        });

        // Listen for game events that affect navigation
        window.eventManager?.on('game:paused', () => {
            this.handleGamePaused();
        });

        window.eventManager?.on('game:resumed', () => {
            this.handleGameResumed();
        });

        // Listen for offline return
        window.eventManager?.on('game:offlineReturn', (data) => {
            this.handleOfflineReturn(data);
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Only handle shortcuts if no input element is focused
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key) {
            case '1':
                event.preventDefault();
                this.viewManager?.navigateTo('main-menu');
                break;
            case '2':
                event.preventDefault();
                this.viewManager?.navigateTo('cultivation');
                break;
            case '3':
                event.preventDefault();
                this.viewManager?.navigateTo('scripture');
                break;
            case '4':
                event.preventDefault();
                this.viewManager?.navigateTo('combat');
                break;
            case '5':
                event.preventDefault();
                this.viewManager?.navigateTo('sect');
                break;
            case '6':
                event.preventDefault();
                this.viewManager?.navigateTo('quest');
                break;
            case 'Escape':
                event.preventDefault();
                this.viewManager?.goBack();
                break;
        }
    }

    /**
     * Handle game paused
     */
    handleGamePaused() {
        // Add visual indicator or disable interactions
        document.body.classList.add('game-paused');
    }

    /**
     * Handle game resumed
     */
    handleGameResumed() {
        // Remove visual indicator
        document.body.classList.remove('game-paused');
    }

    /**
     * Handle offline return
     */
    handleOfflineReturn(data) {
        if (data.wasOffline) {
            // Show offline progress modal or notification
            this.showOfflineProgressNotification(data);
        }
    }

    /**
     * Show offline progress notification
     */
    showOfflineProgressNotification(data) {
        try {
            if (!data || typeof data !== 'object') {
                console.warn('ViewIntegration: Invalid data for offline progress notification');
                return;
            }

            const notification = document.createElement('div');
            notification.className = 'offline-progress-notification';

            // Safely format time and progress
            const timeAway = this.formatTime(data.timeAway || 0);
            let progressHTML = '<li>No progress made</li>';

            if (data.progress && typeof data.progress === 'object') {
                try {
                    const progressEntries = Object.entries(data.progress);
                    if (progressEntries.length > 0) {
                        progressHTML = progressEntries.map(([key, value]) => {
                            const safeKey = String(key || 'Unknown');
                            const safeValue = String(value || '0');
                            return `<li>${safeKey}: +${safeValue}</li>`;
                        }).join('');
                    }
                } catch (progressError) {
                    console.warn('ViewIntegration: Error processing progress data:', progressError);
                }
            }

            notification.innerHTML = `
                <div class="notification-content">
                    <h3>Welcome Back!</h3>
                    <p>You were away for ${timeAway}</p>
                    <div class="offline-progress">
                        <h4>Offline Progress:</h4>
                        <ul>
                            ${progressHTML}
                        </ul>
                    </div>
                    <button class="btn btn-primary close-notification">Continue</button>
                </div>
            `;

            if (document.body) {
                document.body.appendChild(notification);

                const closeBtn = notification.querySelector('.close-notification');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        try {
                            if (notification.parentNode) {
                                notification.remove();
                            }
                        } catch (removeError) {
                            console.warn('ViewIntegration: Error removing notification:', removeError);
                        }
                    });
                }

                // Auto-close after 10 seconds
                setTimeout(() => {
                    try {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    } catch (removeError) {
                        console.warn('ViewIntegration: Error auto-removing notification:', removeError);
                    }
                }, 10000);
            } else {
                console.warn('ViewIntegration: Document body not available for notification');
            }
        } catch (error) {
            console.error('ViewIntegration: Error showing offline progress notification:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: 'showOfflineProgressNotification'
                }, 'ui');
            }
        }
    }

    /**
     * Add view CSS to document
     */
    addViewCSS() {
        // Check if views.css is already loaded
        const existingLink = document.querySelector('link[href*="views.css"]');
        if (existingLink) {
            return;
        }

        // Add views.css link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/views.css';
        document.head.appendChild(link);

        console.log('ViewIntegration: Added views.css');
    }

    /**
     * Get view integration statistics
     */
    getStatistics() {
        return {
            isInitialized: this.isInitialized,
            viewManager: this.viewManager?.getMetrics(),
            uiManager: this.uiManager?.getDebugInfo(),
            activeView: this.viewManager?.getCurrentView(),
            registeredViews: this.viewManager?.getAvailableViews()?.length || 0
        };
    }

    /**
     * Utility method to format time
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Create fallback game interface container
     */
    _createFallbackGameInterface() {
        try {
            console.log('ViewIntegration: Creating fallback game interface container');

            // Check if document body exists
            if (!document.body) {
                console.error('ViewIntegration: Document body not available for fallback container');
                return null;
            }

            // Create game interface container
            const gameInterface = document.createElement('div');
            gameInterface.id = 'game-interface';
            gameInterface.className = 'game-interface fallback-container';
            gameInterface.style.cssText = `
                width: 100%;
                height: 100vh;
                position: relative;
                overflow: hidden;
                background: #1a1a1a;
                color: #ffffff;
            `;

            // Create a basic header for the fallback
            const header = document.createElement('div');
            header.className = 'fallback-header';
            header.style.cssText = `
                padding: 20px;
                text-align: center;
                background: #2a2a2a;
                border-bottom: 1px solid #444;
            `;
            header.innerHTML = '<h1>Idle Cultivation Game</h1><p>Loading game interface...</p>';

            gameInterface.appendChild(header);
            document.body.appendChild(gameInterface);

            console.log('ViewIntegration: Fallback game interface created successfully');
            return gameInterface;
        } catch (error) {
            console.error('ViewIntegration: Error creating fallback game interface:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: '_createFallbackGameInterface'
                }, 'ui');
            }
            return null;
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        try {
            if (this.viewManager && typeof this.viewManager.destroy === 'function') {
                this.viewManager.destroy();
            }

            // Clear references
            this.viewManager = null;
            this.uiManager = null;
            this.gameInterface = null;
            this.characterCreation = null;

            this.isInitialized = false;
            console.log('ViewIntegration: Destroyed successfully');
        } catch (error) {
            console.error('ViewIntegration: Error during destruction:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'ViewIntegration',
                    method: 'destroy'
                }, 'ui');
            }
            // Force reset state even if destruction failed
            this.isInitialized = false;
        }
    }
}

// Create and initialize view integration
const viewIntegration = new ViewIntegration();

// Auto-initialize when game is ready
if (typeof window !== 'undefined') {
    window.viewIntegration = viewIntegration;

    // Initialize when the game is ready
    window.addEventListener('load', async () => {
        // Wait a bit for other systems to initialize
        setTimeout(async () => {
            try {
                await viewIntegration.initialize();
                console.log('ViewIntegration: Auto-initialization complete');
            } catch (error) {
                console.error('ViewIntegration: Auto-initialization failed', error);
            }
        }, 500);
    });
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ViewIntegration, viewIntegration };
}