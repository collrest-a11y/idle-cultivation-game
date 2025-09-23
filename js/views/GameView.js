/**
 * GameView - Base class for all game views
 * Extends BaseComponent with view-specific functionality
 */
class GameView extends BaseComponent {
    constructor(container, options = {}) {
        super(container, options);

        // View-specific properties
        this.viewId = options.viewId || 'unknown';
        this.config = options.config || {};
        this.viewManager = options.viewManager;

        // View state
        this.isActive = false;
        this.isLoading = false;
        this.lastActivated = null;
        this.lastDeactivated = null;
        this.hasErrors = false;
        this.errorCount = 0;

        // Data refresh settings
        this.autoRefresh = true;
        this.refreshInterval = null;
        this.refreshRate = 5000; // 5 seconds default

        // UI elements
        this.header = null;
        this.content = null;
        this.footer = null;
        this.loadingOverlay = null;
        this.errorOverlay = null;

        // Performance tracking
        this.renderStats = {
            totalRenders: 0,
            averageRenderTime: 0,
            dataUpdates: 0,
            errors: 0
        };

        // Error boundary setup
        this._setupErrorBoundary();
    }

    /**
     * Get default options for GameView
     */
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'game-view',
            responsive: true,
            accessible: true,
            showHeader: true,
            showFooter: false,
            enableKeyboardNavigation: true
        };
    }

    /**
     * Get initial state
     */
    getInitialState() {
        return {
            ...super.getInitialState(),
            isLoading: false,
            hasErrors: false,
            errorCount: 0,
            data: {},
            filters: {},
            selectedItem: null,
            viewMode: 'default'
        };
    }

    /**
     * Create the view's DOM structure
     */
    createElement() {
        try {
            this.element = document.createElement('div');
            this.element.className = `game-view view-${this.viewId}`;
            this.element.setAttribute('data-view-id', this.viewId);
            this.element.setAttribute('role', 'main');
            this.element.setAttribute('aria-label', this.config.title || 'Game View');

            // Apply responsive and accessibility classes
            if (this.options.responsive) {
                this.element.classList.add('responsive');
            }

            if (this.options.accessible) {
                this.element.classList.add('accessible');
            }

            // Create view structure
            this.createViewStructure();

            // Initially hidden
            this.element.style.display = 'none';

            console.log(`GameView: Created element for view ${this.viewId}`);
        } catch (error) {
            this._handleViewError(error, 'createElement');
            // Create fallback element
            this._createFallbackElement();
        }
    }

    /**
     * Setup error boundary for this view
     */
    _setupErrorBoundary() {
        if (window.errorManager) {
            this.errorBoundary = window.errorManager.createComponentErrorBoundary(this.viewId);

            // Wrap critical methods
            const criticalMethods = ['render', 'loadData', 'activate', 'deactivate', 'update'];
            criticalMethods.forEach(methodName => {
                if (typeof this[methodName] === 'function') {
                    const originalMethod = this[methodName];
                    this[methodName] = this.errorBoundary.wrapMethod(methodName, originalMethod.bind(this));
                }
            });
        }
    }

    /**
     * Handle view-specific errors
     */
    _handleViewError(error, context = '') {
        this.hasErrors = true;
        this.errorCount++;

        // Ensure renderStats exists before incrementing
        if (this.renderStats) {
            this.renderStats.errors++;
        }

        console.error(`GameView[${this.viewId}]: Error in ${context}:`, error);

        if (window.errorManager) {
            window.errorManager.reportError(error, {
                component: `GameView[${this.viewId}]`,
                context,
                viewActive: this.isActive,
                errorCount: this.errorCount
            }, 'ui');
        }

        // Show error overlay if view is active
        if (this.isActive) {
            this._showErrorOverlay(error, context);
        }
    }

    /**
     * Create fallback element when main creation fails
     */
    _createFallbackElement() {
        try {
            this.element = document.createElement('div');
            this.element.className = `game-view view-${this.viewId} fallback-view`;
            this.element.innerHTML = `
                <div class="fallback-content">
                    <h2>View Error</h2>
                    <p>There was an error loading the ${this.viewId} view.</p>
                    <button class="btn btn-primary retry-btn">Retry</button>
                </div>
            `;

            const retryBtn = this.element.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    try {
                        this.hasErrors = false;
                        this.createElement();
                        this.render();
                    } catch (retryError) {
                        console.error(`GameView[${this.viewId}]: Retry failed:`, retryError);
                    }
                });
            }

            console.log(`GameView: Created fallback element for view ${this.viewId}`);
        } catch (fallbackError) {
            console.error(`GameView[${this.viewId}]: Failed to create fallback element:`, fallbackError);
            // Ultimate fallback
            this.element = document.createElement('div');
            this.element.className = 'game-view error-view';
            this.element.textContent = 'Critical view error - please refresh the page';
        }
    }

    /**
     * Show error overlay
     */
    _showErrorOverlay(error, context) {
        try {
            if (this.errorOverlay) {
                this.errorOverlay.remove();
            }

            this.errorOverlay = document.createElement('div');
            this.errorOverlay.className = 'error-overlay';
            this.errorOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 0, 0, 0.1);
                border: 2px solid #ff4444;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ff4444;
                text-align: center;
                padding: 20px;
            `;

            this.errorOverlay.innerHTML = `
                <div class="error-content">
                    <h3>View Error</h3>
                    <p>Error in ${context}: ${error.message}</p>
                    <button class="btn btn-secondary dismiss-error-btn">Dismiss</button>
                </div>
            `;

            const dismissBtn = this.errorOverlay.querySelector('.dismiss-error-btn');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    if (this.errorOverlay) {
                        this.errorOverlay.remove();
                        this.errorOverlay = null;
                    }
                });
            }

            if (this.element) {
                this.element.appendChild(this.errorOverlay);
            }

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                if (this.errorOverlay) {
                    this.errorOverlay.remove();
                    this.errorOverlay = null;
                }
            }, 10000);
        } catch (overlayError) {
            console.error(`GameView[${this.viewId}]: Failed to show error overlay:`, overlayError);
        }
    }

    /**
     * Create the basic view structure
     */
    createViewStructure() {
        try {
            // Create header
            if (this.options.showHeader) {
                this.header = this.createHeader();
                if (this.header) {
                    this.element.appendChild(this.header);
                }
            }

            // Create main content
            this.content = this.createContent();
            if (this.content) {
                this.element.appendChild(this.content);
            }

            // Create footer
            if (this.options.showFooter) {
                this.footer = this.createFooter();
                if (this.footer) {
                    this.element.appendChild(this.footer);
                }
            }

            // Create loading overlay
            this.loadingOverlay = this.createLoadingOverlay();
            if (this.loadingOverlay) {
                this.element.appendChild(this.loadingOverlay);
            }

            console.log(`GameView: View structure created for ${this.viewId}`);
        } catch (error) {
            this._handleViewError(error, 'createViewStructure');
        }
    }

    /**
     * Create view header
     */
    createHeader() {
        const header = document.createElement('header');
        header.className = 'view-header';

        const title = document.createElement('h1');
        title.className = 'view-title';
        title.textContent = this.config.title || 'Game View';
        header.appendChild(title);

        if (this.config.description) {
            const description = document.createElement('p');
            description.className = 'view-description';
            description.textContent = this.config.description;
            header.appendChild(description);
        }

        // Add navigation buttons
        const nav = this.createHeaderNavigation();
        if (nav) {
            header.appendChild(nav);
        }

        return header;
    }

    /**
     * Create header navigation
     */
    createHeaderNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'view-nav';

        // Back button
        if (this.viewManager && this.viewManager.getNavigationState().canGoBack) {
            const backButton = document.createElement('button');
            backButton.className = 'btn btn-secondary back-button';
            backButton.innerHTML = '<span class="icon-arrow-left"></span> Back';
            backButton.addEventListener('click', () => this.viewManager.goBack());
            nav.appendChild(backButton);
        }

        // Additional navigation items can be added by subclasses
        return nav.children.length > 0 ? nav : null;
    }

    /**
     * Create main content area - to be implemented by subclasses
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content';
        content.setAttribute('role', 'main');

        // Default content - subclasses should override
        const placeholder = document.createElement('div');
        placeholder.className = 'content-placeholder';
        placeholder.innerHTML = `
            <h2>No Content</h2>
            <p>This view has not been implemented yet.</p>
        `;
        content.appendChild(placeholder);

        return content;
    }

    /**
     * Create view footer
     */
    createFooter() {
        const footer = document.createElement('footer');
        footer.className = 'view-footer';

        // Default footer content
        const timestamp = document.createElement('div');
        timestamp.className = 'last-updated';
        timestamp.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        footer.appendChild(timestamp);

        return footer;
    }

    /**
     * Create loading overlay
     */
    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.display = 'none';

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';

        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = 'Loading...';

        overlay.appendChild(spinner);
        overlay.appendChild(text);

        return overlay;
    }

    /**
     * Render the view - must be implemented by subclasses
     */
    render() {
        const startTime = performance.now();

        try {
            // Update render stats
            this.renderStats.totalRenders++;

            // Call subclass render method
            this.renderContent();

            // Update footer timestamp
            if (this.footer) {
                const timestamp = this.footer.querySelector('.last-updated');
                if (timestamp) {
                    timestamp.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
                }
            }

        } catch (error) {
            console.error(`GameView[${this.viewId}]: Render failed`, error);
        } finally {
            // Update performance stats
            const renderTime = performance.now() - startTime;
            this.renderStats.averageRenderTime =
                (this.renderStats.averageRenderTime * (this.renderStats.totalRenders - 1) + renderTime)
                / this.renderStats.totalRenders;
        }
    }

    /**
     * Render view content - to be implemented by subclasses
     */
    renderContent() {
        // Override in subclasses
        console.warn(`GameView[${this.viewId}]: renderContent() not implemented`);
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        this.isLoading = true;
        this.setState({ isLoading: true });

        if (this.loadingOverlay) {
            const loadingText = this.loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            this.loadingOverlay.style.display = 'flex';
        }

        this.element.classList.add('loading');
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        this.setState({ isLoading: false });

        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }

        this.element.classList.remove('loading');
    }

    /**
     * Initialize the view - called once when view is created
     */
    async initialize() {
        try {
            console.log(`GameView[${this.viewId}]: Initializing...`);

            // Load initial data
            await this.loadData();

            // Setup view-specific event listeners
            this.setupViewEventListeners();

            // Setup keyboard navigation
            if (this.options.enableKeyboardNavigation) {
                this.setupKeyboardNavigation();
            }

            console.log(`GameView[${this.viewId}]: Initialized successfully`);

        } catch (error) {
            console.error(`GameView[${this.viewId}]: Initialization failed`, error);
            throw error;
        }
    }

    /**
     * Load view data - to be implemented by subclasses
     */
    async loadData() {
        // Override in subclasses
        return {};
    }

    /**
     * Setup view-specific event listeners
     */
    setupViewEventListeners() {
        // Override in subclasses
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        this.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Escape':
                    if (this.viewManager) {
                        this.viewManager.goBack();
                    }
                    break;
                case 'F5':
                    event.preventDefault();
                    this.refresh();
                    break;
            }
        });

        // Make view focusable
        this.element.setAttribute('tabindex', '-1');
    }

    /**
     * Activate the view - called when view becomes active
     */
    async onActivate(options = {}) {
        this.isActive = true;
        this.lastActivated = Date.now();

        console.log(`GameView[${this.viewId}]: Activated`);

        // Start auto-refresh if enabled
        if (this.autoRefresh && !this.refreshInterval) {
            this.startAutoRefresh();
        }

        // Focus the view for keyboard navigation
        if (this.options.enableKeyboardNavigation) {
            this.element.focus();
        }

        // Emit activation event
        this.emit('view:activated', { viewId: this.viewId, options });

        // Call subclass hook
        await this.onViewActivated(options);
    }

    /**
     * Deactivate the view - called when view becomes inactive
     */
    async onDeactivate() {
        this.isActive = false;
        this.lastDeactivated = Date.now();

        console.log(`GameView[${this.viewId}]: Deactivated`);

        // Stop auto-refresh
        this.stopAutoRefresh();

        // Emit deactivation event
        this.emit('view:deactivated', { viewId: this.viewId });

        // Call subclass hook
        await this.onViewDeactivated();
    }

    /**
     * Hook called when view is activated - override in subclasses
     */
    async onViewActivated(options = {}) {
        // Override in subclasses
    }

    /**
     * Hook called when view is deactivated - override in subclasses
     */
    async onViewDeactivated() {
        // Override in subclasses
    }

    /**
     * Handle game state changes
     */
    onGameStateChange(data) {
        // Override in subclasses
        this.renderStats.dataUpdates++;
    }

    /**
     * Handle data updates
     */
    onDataUpdate(data) {
        // Override in subclasses
        this.renderStats.dataUpdates++;
        this.forceUpdate();
    }

    /**
     * Refresh view data
     */
    async refresh() {
        try {
            this.showLoading('Refreshing...');
            await this.loadData();
            this.forceUpdate();
            console.log(`GameView[${this.viewId}]: Refreshed`);
        } catch (error) {
            console.error(`GameView[${this.viewId}]: Refresh failed`, error);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (this.isActive && !this.isLoading) {
                this.refresh();
            }
        }, this.refreshRate);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Get view performance statistics
     */
    getViewStats() {
        return {
            ...this.renderStats,
            isActive: this.isActive,
            lastActivated: this.lastActivated,
            lastDeactivated: this.lastDeactivated,
            uptime: this.lastActivated ? Date.now() - this.lastActivated : 0
        };
    }

    /**
     * Destroy the view
     */
    destroy() {
        // Stop auto-refresh
        this.stopAutoRefresh();

        // Deactivate if active
        if (this.isActive) {
            this.onDeactivate();
        }

        // Call parent destroy
        super.destroy();

        console.log(`GameView[${this.viewId}]: Destroyed`);
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameView };
} else if (typeof window !== 'undefined') {
    window.GameView = GameView;
}