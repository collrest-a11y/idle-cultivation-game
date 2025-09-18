/**
 * ViewManager - Centralized system for managing game views and navigation
 * Handles view transitions, state management, and lifecycle for all game screens
 */
class ViewManager {
    constructor() {
        if (ViewManager.instance) {
            return ViewManager.instance;
        }

        // Core dependencies
        this.eventManager = null;
        this.gameState = null;
        this.uiManager = null;

        // View management
        this.views = new Map(); // viewId -> view instance
        this.viewConfigs = new Map(); // viewId -> configuration
        this.currentView = null;
        this.previousView = null;
        this.viewHistory = [];

        // Navigation state
        this.isTransitioning = false;
        this.transitionQueue = [];
        this.defaultView = 'main-menu';

        // View container
        this.container = null;
        this.viewContainer = null;

        // Navigation UI
        this.navigationBar = null;
        this.breadcrumb = null;

        // Performance tracking
        this.viewMetrics = new Map();
        this.transitionMetrics = {
            totalTransitions: 0,
            averageTransitionTime: 0,
            fastestTransition: Infinity,
            slowestTransition: 0
        };

        // Settings
        this.settings = {
            enableTransitions: true,
            transitionDuration: 300,
            enableHistory: true,
            maxHistoryLength: 10,
            enableBackButton: true,
            preloadViews: false,
            enableViewCaching: true,
            cacheLimit: 5
        };

        ViewManager.instance = this;
    }

    /**
     * Initialize the ViewManager
     */
    async initialize(options = {}) {
        try {
            console.log('ViewManager: Initializing...');

            // Set dependencies
            this.eventManager = options.eventManager || window.eventManager;
            this.gameState = options.gameState || window.gameState;
            this.uiManager = options.uiManager || window.uiManager;

            // Apply settings
            this.settings = { ...this.settings, ...options.settings };

            // Initialize container
            this.initializeContainer(options.container);

            // Register view configurations
            this.registerViewConfigurations();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize navigation
            if (this.settings.enableBackButton) {
                this.initializeNavigation();
            }

            // Navigate to default view
            if (options.startView || this.defaultView) {
                await this.navigateTo(options.startView || this.defaultView);
            }

            console.log('ViewManager: Initialized successfully');

            this.eventManager?.emit('viewManager:initialized', {
                viewCount: this.viewConfigs.size,
                currentView: this.currentView?.viewId,
                settings: this.settings
            });

        } catch (error) {
            console.error('ViewManager: Initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize the container structure
     */
    initializeContainer(containerElement) {
        this.container = containerElement || document.getElementById('app') || document.body;

        // Create view container if it doesn't exist
        this.viewContainer = this.container.querySelector('.view-container');
        if (!this.viewContainer) {
            this.viewContainer = document.createElement('div');
            this.viewContainer.className = 'view-container';
            this.container.appendChild(this.viewContainer);
        }

        // Add ViewManager classes
        this.container.classList.add('view-manager-container');
        this.viewContainer.classList.add('view-content');
    }

    /**
     * Register all view configurations
     */
    registerViewConfigurations() {
        // Main Menu View
        this.registerView('main-menu', {
            title: 'Main Menu',
            component: 'MainMenuView',
            preload: true,
            cache: true,
            showInNavigation: false,
            icon: 'home',
            route: '/'
        });

        // Cultivation View
        this.registerView('cultivation', {
            title: 'Cultivation',
            component: 'CultivationView',
            preload: false,
            cache: true,
            showInNavigation: true,
            icon: 'meditation',
            route: '/cultivation',
            description: 'Manage your cultivation progress and techniques'
        });

        // Scripture View
        this.registerView('scripture', {
            title: 'Scripture Study',
            component: 'ScriptureView',
            preload: false,
            cache: true,
            showInNavigation: true,
            icon: 'scroll',
            route: '/scripture',
            description: 'Study scriptures and manage your collection'
        });

        // Combat View
        this.registerView('combat', {
            title: 'Combat',
            component: 'CombatView',
            preload: false,
            cache: true,
            showInNavigation: true,
            icon: 'sword',
            route: '/combat',
            description: 'Engage in duels and tournaments'
        });

        // Sect View
        this.registerView('sect', {
            title: 'Sect',
            component: 'SectView',
            preload: false,
            cache: true,
            showInNavigation: true,
            icon: 'temple',
            route: '/sect',
            description: 'Manage sect affairs and activities'
        });

        // Quest View
        this.registerView('quest', {
            title: 'Quests',
            component: 'QuestView',
            preload: false,
            cache: true,
            showInNavigation: true,
            icon: 'quest',
            route: '/quest',
            description: 'Track quests and achievements'
        });
    }

    /**
     * Register a view configuration
     */
    registerView(viewId, config) {
        const fullConfig = {
            viewId,
            title: 'Untitled View',
            component: null,
            preload: false,
            cache: false,
            showInNavigation: true,
            icon: 'default',
            route: `/${viewId}`,
            description: '',
            dependencies: [],
            ...config
        };

        this.viewConfigs.set(viewId, fullConfig);
        console.log(`ViewManager: Registered view configuration: ${viewId}`);

        this.eventManager?.emit('viewManager:viewRegistered', { viewId, config: fullConfig });
    }

    /**
     * Navigate to a specific view
     */
    async navigateTo(viewId, options = {}) {
        if (this.isTransitioning && !options.force) {
            this.transitionQueue.push({ viewId, options });
            return;
        }

        const startTime = performance.now();

        try {
            console.log(`ViewManager: Navigating to ${viewId}`);

            this.isTransitioning = true;

            // Validate view exists
            const viewConfig = this.viewConfigs.get(viewId);
            if (!viewConfig) {
                throw new Error(`View not found: ${viewId}`);
            }

            // Store previous view
            if (this.currentView) {
                this.previousView = this.currentView;

                // Add to history
                if (this.settings.enableHistory && !options.replaceHistory) {
                    this.addToHistory(this.currentView.viewId);
                }

                // Deactivate current view
                await this.deactivateView(this.currentView);
            }

            // Get or create view instance
            const view = await this.getOrCreateView(viewId);

            // Activate new view
            await this.activateView(view, options);

            // Update current view
            this.currentView = view;

            // Update navigation state
            this.updateNavigationState();

            // Track metrics
            this.trackTransition(viewId, startTime);

            console.log(`ViewManager: Successfully navigated to ${viewId}`);

            this.eventManager?.emit('viewManager:navigationComplete', {
                viewId,
                previousViewId: this.previousView?.viewId,
                transitionTime: performance.now() - startTime,
                options
            });

        } catch (error) {
            console.error(`ViewManager: Navigation to ${viewId} failed`, error);
            this.eventManager?.emit('viewManager:navigationError', { viewId, error: error.message });
            throw error;
        } finally {
            this.isTransitioning = false;
            this.processTransitionQueue();
        }
    }

    /**
     * Get or create a view instance
     */
    async getOrCreateView(viewId) {
        // Check if view is cached
        if (this.views.has(viewId)) {
            return this.views.get(viewId);
        }

        const config = this.viewConfigs.get(viewId);
        if (!config) {
            throw new Error(`View configuration not found: ${viewId}`);
        }

        // Create view instance
        const ViewClass = this.getViewClass(config.component);
        if (!ViewClass) {
            throw new Error(`View class not found: ${config.component}`);
        }

        const view = new ViewClass(this.viewContainer, {
            viewId,
            config,
            eventManager: this.eventManager,
            gameState: this.gameState,
            uiManager: this.uiManager,
            viewManager: this
        });

        // Initialize view
        await view.initialize?.();

        // Cache view if enabled
        if (config.cache) {
            this.cacheView(viewId, view);
        }

        console.log(`ViewManager: Created view instance: ${viewId}`);
        return view;
    }

    /**
     * Get view class by name
     */
    getViewClass(componentName) {
        if (typeof window[componentName] === 'function') {
            return window[componentName];
        }

        // Try to find in global scope
        return window[componentName] || null;
    }

    /**
     * Activate a view
     */
    async activateView(view, options = {}) {
        try {
            // Show loading if transition takes time
            if (this.settings.enableTransitions) {
                this.showTransition();
            }

            // Mount view if not mounted
            if (!view.isMounted) {
                view.mount();
            }

            // Show view
            view.show();

            // Call activation lifecycle
            if (view.onActivate) {
                await view.onActivate(options);
            }

            // Hide transition
            if (this.settings.enableTransitions) {
                setTimeout(() => this.hideTransition(), this.settings.transitionDuration);
            }

            console.log(`ViewManager: Activated view: ${view.viewId}`);

        } catch (error) {
            console.error(`ViewManager: Failed to activate view: ${view.viewId}`, error);
            throw error;
        }
    }

    /**
     * Deactivate a view
     */
    async deactivateView(view) {
        try {
            // Call deactivation lifecycle
            if (view.onDeactivate) {
                await view.onDeactivate();
            }

            // Hide view
            view.hide();

            // Unmount if not cached
            const config = this.viewConfigs.get(view.viewId);
            if (!config?.cache) {
                view.unmount();
                this.views.delete(view.viewId);
            }

            console.log(`ViewManager: Deactivated view: ${view.viewId}`);

        } catch (error) {
            console.error(`ViewManager: Failed to deactivate view: ${view.viewId}`, error);
        }
    }

    /**
     * Cache a view instance
     */
    cacheView(viewId, view) {
        this.views.set(viewId, view);

        // Enforce cache limit
        if (this.views.size > this.settings.cacheLimit) {
            const oldestViewId = this.views.keys().next().value;
            const oldestView = this.views.get(oldestViewId);

            if (oldestView && oldestView !== this.currentView) {
                oldestView.destroy?.();
                this.views.delete(oldestViewId);
            }
        }
    }

    /**
     * Go back to previous view
     */
    async goBack() {
        if (this.viewHistory.length > 0) {
            const previousViewId = this.viewHistory.pop();
            await this.navigateTo(previousViewId, { replaceHistory: true });
        } else if (this.previousView) {
            await this.navigateTo(this.previousView.viewId, { replaceHistory: true });
        }
    }

    /**
     * Add view to history
     */
    addToHistory(viewId) {
        this.viewHistory.push(viewId);

        // Enforce history limit
        if (this.viewHistory.length > this.settings.maxHistoryLength) {
            this.viewHistory.shift();
        }
    }

    /**
     * Process transition queue
     */
    processTransitionQueue() {
        if (this.transitionQueue.length > 0 && !this.isTransitioning) {
            const { viewId, options } = this.transitionQueue.shift();
            this.navigateTo(viewId, options);
        }
    }

    /**
     * Show transition overlay
     */
    showTransition() {
        this.viewContainer.classList.add('transitioning');
    }

    /**
     * Hide transition overlay
     */
    hideTransition() {
        this.viewContainer.classList.remove('transitioning');
    }

    /**
     * Update navigation state
     */
    updateNavigationState() {
        // Update document title
        if (this.currentView) {
            const config = this.viewConfigs.get(this.currentView.viewId);
            document.title = `${config.title} - Idle Cultivation`;
        }

        // Update URL if using routing
        if (this.currentView && history.pushState) {
            const config = this.viewConfigs.get(this.currentView.viewId);
            history.pushState({ viewId: this.currentView.viewId }, config.title, config.route);
        }

        // Update navigation UI
        this.updateNavigationUI();
    }

    /**
     * Update navigation UI elements
     */
    updateNavigationUI() {
        // Update navigation bar if exists
        if (this.navigationBar) {
            this.navigationBar.setActiveView(this.currentView?.viewId);
        }

        // Update breadcrumb if exists
        if (this.breadcrumb) {
            this.breadcrumb.update(this.currentView?.viewId, this.viewHistory);
        }
    }

    /**
     * Initialize navigation components
     */
    initializeNavigation() {
        // Create navigation bar
        this.createNavigationBar();

        // Setup browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.viewId) {
                this.navigateTo(event.state.viewId, { replaceHistory: true });
            }
        });
    }

    /**
     * Create navigation bar
     */
    createNavigationBar() {
        const navBar = document.createElement('nav');
        navBar.className = 'view-navigation-bar';

        const navList = document.createElement('ul');
        navList.className = 'nav-list';

        // Add navigation items for each view
        for (const [viewId, config] of this.viewConfigs) {
            if (config.showInNavigation) {
                const navItem = this.createNavigationItem(viewId, config);
                navList.appendChild(navItem);
            }
        }

        navBar.appendChild(navList);

        // Insert at top of container
        this.container.insertBefore(navBar, this.viewContainer);
        this.navigationBar = {
            element: navBar,
            setActiveView: (activeViewId) => {
                navBar.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.toggle('active', item.dataset.viewId === activeViewId);
                });
            }
        };
    }

    /**
     * Create navigation item
     */
    createNavigationItem(viewId, config) {
        const item = document.createElement('li');
        item.className = 'nav-item';
        item.dataset.viewId = viewId;

        const link = document.createElement('button');
        link.className = 'nav-link';
        link.innerHTML = `
            <span class="nav-icon icon-${config.icon}"></span>
            <span class="nav-text">${config.title}</span>
        `;

        link.addEventListener('click', () => {
            this.navigateTo(viewId);
        });

        item.appendChild(link);
        return item;
    }

    /**
     * Track transition metrics
     */
    trackTransition(viewId, startTime) {
        const duration = performance.now() - startTime;

        this.transitionMetrics.totalTransitions++;
        this.transitionMetrics.averageTransitionTime =
            (this.transitionMetrics.averageTransitionTime * (this.transitionMetrics.totalTransitions - 1) + duration)
            / this.transitionMetrics.totalTransitions;

        this.transitionMetrics.fastestTransition = Math.min(this.transitionMetrics.fastestTransition, duration);
        this.transitionMetrics.slowestTransition = Math.max(this.transitionMetrics.slowestTransition, duration);

        // Track per-view metrics
        if (!this.viewMetrics.has(viewId)) {
            this.viewMetrics.set(viewId, { visits: 0, totalTime: 0, averageTime: 0 });
        }

        const viewMetric = this.viewMetrics.get(viewId);
        viewMetric.visits++;
        viewMetric.totalTime += duration;
        viewMetric.averageTime = viewMetric.totalTime / viewMetric.visits;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game state changes that might affect views
        this.eventManager?.on('gameState:changed', (data) => {
            this.currentView?.onGameStateChange?.(data);
        });

        // Listen for system updates
        this.eventManager?.on('cultivation:updated', (data) => {
            if (this.currentView?.viewId === 'cultivation') {
                this.currentView?.onDataUpdate?.(data);
            }
        });

        this.eventManager?.on('scripture:updated', (data) => {
            if (this.currentView?.viewId === 'scripture') {
                this.currentView?.onDataUpdate?.(data);
            }
        });

        this.eventManager?.on('combat:updated', (data) => {
            if (this.currentView?.viewId === 'combat') {
                this.currentView?.onDataUpdate?.(data);
            }
        });

        this.eventManager?.on('sect:updated', (data) => {
            if (this.currentView?.viewId === 'sect') {
                this.currentView?.onDataUpdate?.(data);
            }
        });

        this.eventManager?.on('quest:updated', (data) => {
            if (this.currentView?.viewId === 'quest') {
                this.currentView?.onDataUpdate?.(data);
            }
        });
    }

    /**
     * Get current view information
     */
    getCurrentView() {
        return this.currentView ? {
            viewId: this.currentView.viewId,
            config: this.viewConfigs.get(this.currentView.viewId),
            isActive: true
        } : null;
    }

    /**
     * Get all available views
     */
    getAvailableViews() {
        return Array.from(this.viewConfigs.values());
    }

    /**
     * Get navigation state
     */
    getNavigationState() {
        return {
            currentView: this.currentView?.viewId,
            previousView: this.previousView?.viewId,
            history: [...this.viewHistory],
            canGoBack: this.viewHistory.length > 0 || this.previousView !== null,
            isTransitioning: this.isTransitioning
        };
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            transitions: this.transitionMetrics,
            views: Object.fromEntries(this.viewMetrics),
            currentView: this.currentView?.viewId,
            cachedViews: Array.from(this.views.keys())
        };
    }

    /**
     * Destroy the ViewManager
     */
    destroy() {
        // Destroy all cached views
        for (const view of this.views.values()) {
            view.destroy?.();
        }

        this.views.clear();
        this.viewConfigs.clear();
        this.currentView = null;
        this.previousView = null;
        this.viewHistory = [];

        console.log('ViewManager: Destroyed');
    }
}

// Create singleton instance
const viewManager = new ViewManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ViewManager, viewManager };
} else if (typeof window !== 'undefined') {
    window.ViewManager = ViewManager;
    window.viewManager = viewManager;
}