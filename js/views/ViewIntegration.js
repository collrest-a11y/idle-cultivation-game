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

            // Get references to main containers
            this.gameInterface = document.getElementById('game-interface');
            this.characterCreation = document.getElementById('character-creation');

            if (!this.gameInterface) {
                throw new Error('Game interface container not found');
            }

            // Initialize UI Manager if not already done
            if (!window.uiManager || !window.uiManager.isInitialized) {
                this.uiManager = window.uiManager || new UIManager();
                await this.uiManager.init({
                    eventManager: window.eventManager,
                    gameState: window.gameState,
                    enablePerformanceMonitoring: true
                });
                window.uiManager = this.uiManager;
            } else {
                this.uiManager = window.uiManager;
            }

            // Initialize View Manager
            this.viewManager = window.viewManager || new ViewManager();
            await this.viewManager.initialize({
                container: this.gameInterface,
                eventManager: window.eventManager,
                gameState: window.gameState,
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

            // Emit integration ready event
            window.eventManager?.emit('viewIntegration:ready', {
                viewManager: this.viewManager,
                uiManager: this.uiManager
            });

        } catch (error) {
            console.error('ViewIntegration: Initialization failed', error);
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
        if (!this.characterCreation) {
            return;
        }

        // Listen for character creation completion
        window.eventManager?.on('character:created', () => {
            this.showGameInterface();
        });

        // Check if character already exists
        const hasCharacter = window.gameState?.get('player.character.created');
        if (hasCharacter) {
            this.showGameInterface();
        } else {
            this.showCharacterCreation();
        }
    }

    /**
     * Show character creation
     */
    showCharacterCreation() {
        if (this.characterCreation) {
            this.characterCreation.classList.remove('hidden');
        }
        if (this.gameInterface) {
            this.gameInterface.classList.add('hidden');
        }
    }

    /**
     * Show game interface
     */
    showGameInterface() {
        if (this.characterCreation) {
            this.characterCreation.classList.add('hidden');
        }
        if (this.gameInterface) {
            this.gameInterface.classList.remove('hidden');
        }

        // Navigate to main menu if view manager is ready
        if (this.viewManager && this.viewManager.isInitialized) {
            this.viewManager.navigateTo('main-menu');
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
        if (!this.viewManager) return;

        const viewInstance = this.viewManager.views.get(viewId);
        if (viewInstance && typeof viewInstance[method] === 'function') {
            viewInstance[method](data);
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
        const notification = document.createElement('div');
        notification.className = 'offline-progress-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>Welcome Back!</h3>
                <p>You were away for ${this.formatTime(data.timeAway)}</p>
                <div class="offline-progress">
                    <h4>Offline Progress:</h4>
                    <ul>
                        ${data.progress ? Object.entries(data.progress).map(([key, value]) =>
                            `<li>${key}: +${value}</li>`
                        ).join('') : '<li>No progress made</li>'}
                    </ul>
                </div>
                <button class="btn btn-primary close-notification">Continue</button>
            </div>
        `;

        document.body.appendChild(notification);

        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
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
     * Cleanup and destroy
     */
    destroy() {
        if (this.viewManager) {
            this.viewManager.destroy();
        }

        this.isInitialized = false;
        console.log('ViewIntegration: Destroyed');
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