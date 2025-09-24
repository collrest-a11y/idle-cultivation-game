/**
 * SystemHealthDashboard - Debug panel for monitoring system health and module status
 * Displays real-time module status, errors, recovery attempts, and performance metrics
 */
class SystemHealthDashboard {
    constructor() {
        this.isVisible = false;
        this.container = null;
        this.updateInterval = null;
        this.errorHistory = [];
        this.moduleStatusCache = new Map();
        this.performanceHistory = [];

        // Configuration
        this.config = {
            updateIntervalMs: 500,
            maxErrorHistory: 50,
            maxPerformanceHistory: 20,
            hideInProduction: true
        };

        // Check if we should hide in production
        if (this.config.hideInProduction && !this._isDebugEnvironment()) {
            console.log('SystemHealthDashboard: Disabled in production');
            return;
        }

        this._initialize();
    }

    /**
     * Initialize the dashboard
     */
    _initialize() {
        // Create dashboard container
        this._createDashboardDOM();

        // Set up keyboard shortcut (Ctrl+Shift+D)
        this._setupKeyboardShortcut();

        // Listen for system events
        this._setupEventListeners();

        console.log('SystemHealthDashboard: Initialized (Press Ctrl+Shift+D to toggle)');
    }

    /**
     * Create the dashboard DOM structure
     */
    _createDashboardDOM() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'system-health-dashboard';
        this.container.className = 'health-dashboard hidden';

        this.container.innerHTML = `
            <div class="dashboard-header">
                <h2>System Health Dashboard</h2>
                <div class="dashboard-controls">
                    <button class="btn-refresh" title="Refresh">🔄</button>
                    <button class="btn-clear-errors" title="Clear Error History">🗑️</button>
                    <button class="btn-close" title="Close (Ctrl+Shift+D)">✖</button>
                </div>
            </div>

            <div class="dashboard-content">
                <!-- System Overview Section -->
                <section class="dashboard-section system-overview">
                    <h3>System Overview</h3>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Game Status:</span>
                            <span class="status-value" id="game-status">Initializing...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Uptime:</span>
                            <span class="status-value" id="system-uptime">0s</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Memory:</span>
                            <span class="status-value" id="memory-usage">N/A</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">FPS:</span>
                            <span class="status-value" id="fps-value">0</span>
                        </div>
                    </div>
                </section>

                <!-- Module Status Section -->
                <section class="dashboard-section module-status">
                    <h3>Module Status</h3>
                    <div id="module-status-grid" class="module-grid">
                        <!-- Module status cards will be inserted here -->
                    </div>
                </section>

                <!-- Error History Section -->
                <section class="dashboard-section error-history">
                    <h3>Error History <span class="error-count" id="error-count">0</span></h3>
                    <div id="error-history-list" class="error-list">
                        <div class="no-errors">No errors logged</div>
                    </div>
                </section>

                <!-- Performance Metrics Section -->
                <section class="dashboard-section performance-metrics">
                    <h3>Performance Metrics</h3>
                    <div id="performance-metrics-grid" class="metrics-grid">
                        <!-- Performance metrics will be inserted here -->
                    </div>
                </section>
            </div>
        `;

        // Add to document
        document.body.appendChild(this.container);

        // Set up button handlers
        this._setupButtonHandlers();
    }

    /**
     * Set up button event handlers
     */
    _setupButtonHandlers() {
        const btnRefresh = this.container.querySelector('.btn-refresh');
        const btnClearErrors = this.container.querySelector('.btn-clear-errors');
        const btnClose = this.container.querySelector('.btn-close');

        btnRefresh?.addEventListener('click', () => this._updateDashboard());
        btnClearErrors?.addEventListener('click', () => this._clearErrorHistory());
        btnClose?.addEventListener('click', () => this.hide());
    }

    /**
     * Set up keyboard shortcut
     */
    _setupKeyboardShortcut() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+D to toggle dashboard
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * Set up event listeners for system events
     */
    _setupEventListeners() {
        // Wait for game to initialize
        const setupListeners = () => {
            if (!window.game?.eventManager) {
                setTimeout(setupListeners, 100);
                return;
            }

            const eventManager = window.game.eventManager;

            // Listen for errors
            eventManager.on('error:reported', (data) => {
                this._logError(data);
            });

            // Listen for module events
            eventManager.on('moduleManager:moduleLoaded', (data) => {
                this._updateModuleStatus(data.moduleName, 'loaded');
            });

            eventManager.on('moduleManager:moduleLoadFailed', (data) => {
                this._updateModuleStatus(data.moduleName, 'failed', data.error);
            });

            // Listen for game events
            eventManager.on('game:error', (data) => {
                this._logError({
                    message: data.error,
                    category: 'critical',
                    stack: data.stack,
                    timestamp: data.timestamp
                });
            });
        };

        setupListeners();
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the dashboard
     */
    show() {
        if (!this.container) return;

        this.container.classList.remove('hidden');
        this.isVisible = true;

        // Start update interval
        this._startUpdateInterval();

        // Initial update
        this._updateDashboard();
    }

    /**
     * Hide the dashboard
     */
    hide() {
        if (!this.container) return;

        this.container.classList.add('hidden');
        this.isVisible = false;

        // Stop update interval
        this._stopUpdateInterval();
    }

    /**
     * Start periodic updates
     */
    _startUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this._updateDashboard();
        }, this.config.updateIntervalMs);
    }

    /**
     * Stop periodic updates
     */
    _stopUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Update all dashboard sections
     */
    _updateDashboard() {
        this._updateSystemOverview();
        this._updateModuleStatus();
        this._updateErrorHistory();
        this._updatePerformanceMetrics();
    }

    /**
     * Update system overview section
     */
    _updateSystemOverview() {
        const game = window.game;

        // Game status
        const statusEl = document.getElementById('game-status');
        if (statusEl && game) {
            const status = game.getStatus();
            const statusText = status.isRunning ? 'Running' :
                              status.isInitialized ? 'Initialized' : 'Not Initialized';
            const statusClass = status.isRunning ? 'status-success' :
                               status.isInitialized ? 'status-warning' : 'status-error';
            statusEl.textContent = statusText;
            statusEl.className = `status-value ${statusClass}`;
        }

        // Uptime
        const uptimeEl = document.getElementById('system-uptime');
        if (uptimeEl && game?.timeManager) {
            const sessionTime = game.timeManager.getTimeInfo().sessionTime;
            uptimeEl.textContent = this._formatTime(sessionTime);
        }

        // Memory usage
        const memoryEl = document.getElementById('memory-usage');
        if (memoryEl && performance.memory) {
            const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            const totalMB = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
            memoryEl.textContent = `${usedMB} / ${totalMB} MB`;
        }

        // FPS
        const fpsEl = document.getElementById('fps-value');
        if (fpsEl && game?.gameLoop) {
            const perf = game.gameLoop.getPerformanceMetrics();
            fpsEl.textContent = perf?.currentFPS?.toFixed(0) || '0';
        }
    }

    /**
     * Update module status section
     */
    _updateModuleStatus() {
        const grid = document.getElementById('module-status-grid');
        if (!grid || !window.game?.moduleManager) return;

        const moduleManager = window.game.moduleManager;
        const modules = moduleManager.modules;

        grid.innerHTML = '';

        modules.forEach((moduleData, moduleName) => {
            const card = this._createModuleCard(moduleName, moduleData);
            grid.appendChild(card);
        });
    }

    /**
     * Create a module status card
     */
    _createModuleCard(moduleName, moduleData) {
        const card = document.createElement('div');
        card.className = 'module-card';

        const statusClass = moduleData.isLoaded ? 'status-success' :
                           moduleData.error ? 'status-error' :
                           moduleData.isLoading ? 'status-warning' : 'status-pending';

        const statusIcon = moduleData.isLoaded ? '✓' :
                          moduleData.error ? '✗' :
                          moduleData.isLoading ? '⟳' : '○';

        const loadTime = moduleData.loadEndTime && moduleData.loadStartTime ?
                        (moduleData.loadEndTime - moduleData.loadStartTime).toFixed(2) + 'ms' :
                        'N/A';

        card.innerHTML = `
            <div class="module-header">
                <span class="module-icon ${statusClass}">${statusIcon}</span>
                <span class="module-name">${moduleName}</span>
            </div>
            <div class="module-details">
                <div class="module-stat">
                    <span class="stat-label">Load Time:</span>
                    <span class="stat-value">${loadTime}</span>
                </div>
                <div class="module-stat">
                    <span class="stat-label">Retry Count:</span>
                    <span class="stat-value">${moduleData.retryCount}</span>
                </div>
                ${moduleData.error ? `
                    <div class="module-error">
                        <span class="error-label">Error:</span>
                        <span class="error-message">${moduleData.error}</span>
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    /**
     * Update error history section
     */
    _updateErrorHistory() {
        const errorList = document.getElementById('error-history-list');
        const errorCount = document.getElementById('error-count');

        if (!errorList) return;

        errorCount.textContent = this.errorHistory.length;

        if (this.errorHistory.length === 0) {
            errorList.innerHTML = '<div class="no-errors">No errors logged</div>';
            return;
        }

        errorList.innerHTML = '';

        // Show most recent errors first
        const recentErrors = this.errorHistory.slice(-20).reverse();

        recentErrors.forEach(error => {
            const errorItem = this._createErrorItem(error);
            errorList.appendChild(errorItem);
        });
    }

    /**
     * Create an error list item
     */
    _createErrorItem(error) {
        const item = document.createElement('div');
        item.className = 'error-item';

        const severityClass = this._getSeverityClass(error.category || error.severity);
        const timestamp = new Date(error.timestamp).toLocaleTimeString();

        item.innerHTML = `
            <div class="error-header">
                <span class="error-severity ${severityClass}">${error.category || 'unknown'}</span>
                <span class="error-timestamp">${timestamp}</span>
            </div>
            <div class="error-message">${error.message || error.error || 'Unknown error'}</div>
            ${error.context?.source ? `
                <div class="error-source">Source: ${error.context.source}</div>
            ` : ''}
            ${error.recoveryAttempted ? `
                <div class="error-recovery">Recovery Attempted: ${error.recoverySuccess ? 'Success' : 'Failed'}</div>
            ` : ''}
        `;

        return item;
    }

    /**
     * Update performance metrics section
     */
    _updatePerformanceMetrics() {
        const grid = document.getElementById('performance-metrics-grid');
        if (!grid || !window.game?.gameLoop) return;

        const perf = window.game.gameLoop.getPerformanceMetrics();
        if (!perf) return;

        grid.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">Current FPS:</span>
                <span class="metric-value">${perf.currentFPS?.toFixed(1) || '0'}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Average FPS:</span>
                <span class="metric-value">${perf.averageFPS?.toFixed(1) || '0'}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Frame Time:</span>
                <span class="metric-value">${perf.averageFrameTime?.toFixed(2) || '0'}ms</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">UI Updates/s:</span>
                <span class="metric-value">${perf.uiUpdatesPerSecond || '0'}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Game Updates/s:</span>
                <span class="metric-value">${perf.gameUpdatesPerSecond || '0'}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Missed Frames:</span>
                <span class="metric-value">${perf.totalMissedFrames || '0'}</span>
            </div>
        `;
    }

    /**
     * Log an error to the history
     */
    _logError(errorData) {
        this.errorHistory.push({
            timestamp: Date.now(),
            ...errorData
        });

        // Limit history size
        if (this.errorHistory.length > this.config.maxErrorHistory) {
            this.errorHistory.shift();
        }

        // Update display if visible
        if (this.isVisible) {
            this._updateErrorHistory();
        }
    }

    /**
     * Update module status cache
     */
    _updateModuleStatus(moduleName, status, error = null) {
        this.moduleStatusCache.set(moduleName, {
            status,
            error,
            timestamp: Date.now()
        });

        // Update display if visible
        if (this.isVisible) {
            this._updateModuleStatus();
        }
    }

    /**
     * Clear error history
     */
    _clearErrorHistory() {
        this.errorHistory = [];
        this._updateErrorHistory();
    }

    /**
     * Get severity CSS class
     */
    _getSeverityClass(severity) {
        const severityMap = {
            'critical': 'severity-critical',
            'error': 'severity-error',
            'warning': 'severity-warning',
            'info': 'severity-info',
            'system': 'severity-error',
            'gameplay': 'severity-warning',
            'ui': 'severity-info'
        };

        return severityMap[severity?.toLowerCase()] || 'severity-info';
    }

    /**
     * Format time in a human-readable format
     */
    _formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Check if running in debug environment
     */
    _isDebugEnvironment() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    }

    /**
     * Cleanup and destroy the dashboard
     */
    destroy() {
        this._stopUpdateInterval();

        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.systemHealthDashboard = new SystemHealthDashboard();
    });
} else {
    window.systemHealthDashboard = new SystemHealthDashboard();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemHealthDashboard;
} else if (typeof window !== 'undefined') {
    window.SystemHealthDashboard = SystemHealthDashboard;
}