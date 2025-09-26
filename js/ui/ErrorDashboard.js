/**
 * ErrorDashboard - Developer dashboard for real-time error monitoring and debugging
 * Provides comprehensive error visualization, analytics, and recovery tools
 */
class ErrorDashboard {
    constructor() {
        this.isActive = false;
        this.isDeveloperMode = false;
        this.errorManager = null;
        this.errorAnalytics = null;
        this.updateInterval = null;

        // UI Elements
        this.container = null;
        this.errorList = null;
        this.metricsPanel = null;
        this.detailPanel = null;
        this.searchInput = null;
        this.filterControls = null;

        // State management
        this.displayedErrors = [];
        this.filteredErrors = [];
        this.selectedError = null;
        this.currentFilters = {
            severity: 'all',
            category: 'all',
            timeRange: '1h',
            searchTerm: ''
        };

        // Configuration
        this.config = {
            updateInterval: 5000, // 5 seconds
            maxDisplayedErrors: 500,
            errorRetentionHours: 24,
            refreshRateMs: 1000,
            virtualScrollThreshold: 100
        };

        // Event handling
        this.eventHandlers = new Map();
        this.isListening = false;

        // Performance tracking
        this.performanceMetrics = {
            renderTime: 0,
            updateTime: 0,
            memoryUsage: 0,
            errorProcessingRate: 0
        };

        this.setupKeyboardShortcuts();
        this.bindMethods();
    }

    /**
     * Initialize the dashboard
     */
    async initialize(errorManager, errorAnalytics) {
        try {
            this.errorManager = errorManager;
            this.errorAnalytics = errorAnalytics;

            // Check if we're in developer mode
            this.isDeveloperMode = this.checkDeveloperMode();

            if (!this.isDeveloperMode) {
                console.log('ErrorDashboard: Not in developer mode, dashboard disabled');
                return;
            }

            await this.createDashboardUI();
            this.setupErrorListening();
            this.startPeriodicUpdates();

            console.log('ErrorDashboard: Initialized successfully');

        } catch (error) {
            console.error('ErrorDashboard: Failed to initialize', error);
        }
    }

    /**
     * Check if developer mode is enabled
     */
    checkDeveloperMode() {
        return (
            localStorage.getItem('developerMode') === 'true' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1' ||
            location.search.includes('dev=true') ||
            window.location.hash.includes('debug')
        );
    }

    /**
     * Create the dashboard UI structure
     */
    async createDashboardUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'error-dashboard';
        this.container.className = 'error-dashboard hidden';
        this.container.innerHTML = this.getDashboardHTML();

        // Append to body
        document.body.appendChild(this.container);

        // Get UI element references
        this.errorList = this.container.querySelector('.error-list');
        this.metricsPanel = this.container.querySelector('.metrics-panel');
        this.detailPanel = this.container.querySelector('.detail-panel');
        this.searchInput = this.container.querySelector('.search-input');
        this.filterControls = this.container.querySelector('.filter-controls');

        // Setup event listeners
        this.setupEventListeners();

        // Load initial data
        await this.refreshData();
    }

    /**
     * Get the main dashboard HTML structure
     */
    getDashboardHTML() {
        return `
            <div class="dashboard-header">
                <div class="header-left">
                    <h2 class="dashboard-title">Error Dashboard</h2>
                    <div class="status-indicator">
                        <span class="status-dot active"></span>
                        <span class="status-text">Monitoring Active</span>
                    </div>
                </div>
                <div class="header-right">
                    <button class="btn-icon export-btn" title="Export Errors">
                        <span class="icon">📥</span>
                    </button>
                    <button class="btn-icon settings-btn" title="Dashboard Settings">
                        <span class="icon">⚙️</span>
                    </button>
                    <button class="btn-icon close-btn" title="Close Dashboard">
                        <span class="icon">✕</span>
                    </button>
                </div>
            </div>

            <div class="dashboard-controls">
                <div class="search-section">
                    <input type="text" class="search-input" placeholder="Search errors..." />
                    <button class="btn-icon clear-search" title="Clear Search">
                        <span class="icon">✕</span>
                    </button>
                </div>

                <div class="filter-controls">
                    <select class="filter-select severity-filter">
                        <option value="all">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>

                    <select class="filter-select category-filter">
                        <option value="all">All Categories</option>
                        <option value="system">System</option>
                        <option value="gameplay">Gameplay</option>
                        <option value="ui">UI</option>
                        <option value="network">Network</option>
                        <option value="storage">Storage</option>
                        <option value="performance">Performance</option>
                    </select>

                    <select class="filter-select time-filter">
                        <option value="5m">Last 5 minutes</option>
                        <option value="15m">Last 15 minutes</option>
                        <option value="1h" selected>Last hour</option>
                        <option value="6h">Last 6 hours</option>
                        <option value="24h">Last 24 hours</option>
                        <option value="all">All time</option>
                    </select>

                    <button class="btn refresh-btn">Refresh</button>
                    <button class="btn clear-btn">Clear All</button>
                </div>
            </div>

            <div class="dashboard-content">
                <div class="left-panel">
                    <div class="metrics-panel">
                        <div class="metric-card">
                            <div class="metric-value" id="total-errors">0</div>
                            <div class="metric-label">Total Errors</div>
                        </div>
                        <div class="metric-card critical">
                            <div class="metric-value" id="critical-errors">0</div>
                            <div class="metric-label">Critical</div>
                        </div>
                        <div class="metric-card warning">
                            <div class="metric-value" id="warning-errors">0</div>
                            <div class="metric-label">Warnings</div>
                        </div>
                        <div class="metric-card success">
                            <div class="metric-value" id="recovery-rate">0%</div>
                            <div class="metric-label">Recovery Rate</div>
                        </div>
                    </div>

                    <div class="chart-panel">
                        <h3>Error Rate Trend</h3>
                        <div class="chart-container">
                            <canvas id="error-chart" width="300" height="150"></canvas>
                        </div>
                    </div>
                </div>

                <div class="center-panel">
                    <div class="error-list-container">
                        <div class="list-header">
                            <span class="error-count">0 errors</span>
                            <button class="btn-icon auto-scroll-btn active" title="Auto-scroll to new errors">
                                <span class="icon">⬇️</span>
                            </button>
                        </div>
                        <div class="error-list" id="error-list">
                            <div class="empty-state">
                                <div class="empty-icon">✅</div>
                                <div class="empty-text">No errors to display</div>
                                <div class="empty-subtext">All systems running smoothly</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="right-panel">
                    <div class="detail-panel">
                        <div class="detail-header">
                            <h3>Error Details</h3>
                            <button class="btn-icon detail-close" title="Close Details">
                                <span class="icon">✕</span>
                            </button>
                        </div>
                        <div class="detail-content">
                            <div class="detail-empty">
                                <div class="empty-icon">📋</div>
                                <div class="empty-text">Select an error to view details</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="dashboard-footer">
                <div class="footer-stats">
                    <span class="stat-item">
                        <span class="stat-label">Last Update:</span>
                        <span class="stat-value" id="last-update">Never</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-label">Memory:</span>
                        <span class="stat-value" id="memory-usage">0 MB</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-label">Performance:</span>
                        <span class="stat-value" id="render-time">0ms</span>
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for dashboard controls
     */
    setupEventListeners() {
        // Header controls
        this.container.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.container.querySelector('.export-btn').addEventListener('click', () => this.exportErrors());
        this.container.querySelector('.settings-btn').addEventListener('click', () => this.showSettings());

        // Search and filters
        this.searchInput.addEventListener('input', this.debounce(() => this.updateFilters(), 300));
        this.container.querySelector('.clear-search').addEventListener('click', () => this.clearSearch());

        this.container.querySelector('.severity-filter').addEventListener('change', () => this.updateFilters());
        this.container.querySelector('.category-filter').addEventListener('change', () => this.updateFilters());
        this.container.querySelector('.time-filter').addEventListener('change', () => this.updateFilters());

        // Control buttons
        this.container.querySelector('.refresh-btn').addEventListener('click', () => this.refreshData());
        this.container.querySelector('.clear-btn').addEventListener('click', () => this.clearErrors());
        this.container.querySelector('.auto-scroll-btn').addEventListener('click', (e) => this.toggleAutoScroll(e.target));

        // Detail panel
        this.container.querySelector('.detail-close').addEventListener('click', () => this.clearErrorDetails());

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.shortcuts = {
            'Ctrl+Shift+E': () => this.toggle(),
            'Escape': () => this.hide(),
            'Ctrl+R': () => this.refreshData(),
            'Ctrl+K': () => this.focusSearch(),
            'Ctrl+D': () => this.clearErrors()
        };
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        const key = `${event.ctrlKey ? 'Ctrl+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.altKey ? 'Alt+' : ''}${event.key}`;

        if (this.shortcuts[key]) {
            event.preventDefault();
            this.shortcuts[key]();
        }
    }

    /**
     * Setup error listening from ErrorManager
     */
    setupErrorListening() {
        if (!this.errorManager) return;

        // Create a custom event listener for error updates
        this.errorUpdateHandler = (errors) => {
            this.handleNewErrors(errors);
        };

        // Setup periodic polling since we don't have EventEmitter
        this.errorPollingInterval = setInterval(() => {
            this.pollForNewErrors();
        }, this.config.refreshRateMs);

        this.isListening = true;
    }

    /**
     * Poll for new errors from ErrorManager
     */
    pollForNewErrors() {
        if (!this.errorManager || !this.isActive) return;

        try {
            const allErrors = this.errorManager.getErrorLog ? this.errorManager.getErrorLog() : [];
            const newErrors = this.getNewErrors(allErrors);

            if (newErrors.length > 0) {
                this.handleNewErrors(newErrors);
            }

            this.updateMetrics();
        } catch (error) {
            console.error('ErrorDashboard: Error polling for updates', error);
        }
    }

    /**
     * Get new errors since last update
     */
    getNewErrors(allErrors) {
        const lastTimestamp = this.displayedErrors.length > 0
            ? this.displayedErrors[this.displayedErrors.length - 1].timestamp
            : 0;

        return allErrors.filter(error => error.timestamp > lastTimestamp);
    }

    /**
     * Handle new errors received
     */
    handleNewErrors(newErrors) {
        if (!Array.isArray(newErrors) || newErrors.length === 0) return;

        // Add to displayed errors
        this.displayedErrors.push(...newErrors);

        // Maintain max display limit
        if (this.displayedErrors.length > this.config.maxDisplayedErrors) {
            this.displayedErrors = this.displayedErrors.slice(-this.config.maxDisplayedErrors);
        }

        // Update the filtered view
        this.updateFilteredErrors();
        this.renderErrorList();
        this.updateMetrics();

        // Auto-scroll to new errors if enabled
        if (this.container.querySelector('.auto-scroll-btn').classList.contains('active')) {
            this.scrollToLatestError();
        }
    }

    /**
     * Update metrics display
     */
    updateMetrics() {
        const stats = this.errorAnalytics ? this.errorAnalytics.getStatistics() : this.calculateBasicStats();

        // Update metric cards
        document.getElementById('total-errors').textContent = stats.totalErrors || 0;
        document.getElementById('critical-errors').textContent = stats.criticalErrors || 0;
        document.getElementById('warning-errors').textContent = stats.warningErrors || 0;
        document.getElementById('recovery-rate').textContent = `${Math.round(stats.recoveryRate || 0)}%`;

        // Update footer stats
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
        document.getElementById('memory-usage').textContent = `${this.getMemoryUsage()}MB`;
        document.getElementById('render-time').textContent = `${this.performanceMetrics.renderTime}ms`;

        // Update error count
        const errorCount = this.filteredErrors.length;
        this.container.querySelector('.error-count').textContent = `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
    }

    /**
     * Calculate basic statistics if ErrorAnalytics is not available
     */
    calculateBasicStats() {
        const errors = this.displayedErrors;

        return {
            totalErrors: errors.length,
            criticalErrors: errors.filter(e => e.severity === 'critical' || e.severity === 'error').length,
            warningErrors: errors.filter(e => e.severity === 'warning').length,
            recoveryRate: this.calculateRecoveryRate(errors)
        };
    }

    /**
     * Calculate recovery rate
     */
    calculateRecoveryRate(errors) {
        const recoveredErrors = errors.filter(e => e.recovered || e.resolved);
        return errors.length > 0 ? (recoveredErrors.length / errors.length) * 100 : 0;
    }

    /**
     * Update filtered errors based on current filters
     */
    updateFilteredErrors() {
        let filtered = [...this.displayedErrors];

        // Apply severity filter
        if (this.currentFilters.severity !== 'all') {
            filtered = filtered.filter(error => error.severity === this.currentFilters.severity);
        }

        // Apply category filter
        if (this.currentFilters.category !== 'all') {
            filtered = filtered.filter(error => error.category === this.currentFilters.category);
        }

        // Apply time range filter
        if (this.currentFilters.timeRange !== 'all') {
            const cutoffTime = this.getTimeRangeCutoff(this.currentFilters.timeRange);
            filtered = filtered.filter(error => error.timestamp >= cutoffTime);
        }

        // Apply search filter
        if (this.currentFilters.searchTerm) {
            const searchTerm = this.currentFilters.searchTerm.toLowerCase();
            filtered = filtered.filter(error =>
                error.message.toLowerCase().includes(searchTerm) ||
                error.stack?.toLowerCase().includes(searchTerm) ||
                error.source?.toLowerCase().includes(searchTerm)
            );
        }

        this.filteredErrors = filtered;
    }

    /**
     * Get time range cutoff timestamp
     */
    getTimeRangeCutoff(timeRange) {
        const now = Date.now();
        const ranges = {
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };

        return now - (ranges[timeRange] || 0);
    }

    /**
     * Render the error list
     */
    renderErrorList() {
        const startTime = performance.now();

        if (this.filteredErrors.length === 0) {
            this.renderEmptyState();
        } else {
            this.renderErrors();
        }

        this.performanceMetrics.renderTime = Math.round(performance.now() - startTime);
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        this.errorList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-text">No errors to display</div>
                <div class="empty-subtext">
                    ${this.currentFilters.searchTerm || this.currentFilters.severity !== 'all' || this.currentFilters.category !== 'all'
                        ? 'Try adjusting your filters'
                        : 'All systems running smoothly'}
                </div>
            </div>
        `;
    }

    /**
     * Render error items
     */
    renderErrors() {
        // Use virtual scrolling for performance with large lists
        const maxVisible = 50;
        const startIndex = Math.max(0, this.filteredErrors.length - maxVisible);
        const visibleErrors = this.filteredErrors.slice(startIndex);

        const errorHTML = visibleErrors.map(error => this.renderErrorItem(error)).join('');

        this.errorList.innerHTML = errorHTML;

        // Add click listeners to error items
        this.errorList.querySelectorAll('.error-item').forEach(item => {
            item.addEventListener('click', () => {
                const errorId = item.dataset.errorId;
                const error = this.filteredErrors.find(e => e.id === errorId);
                if (error) {
                    this.showErrorDetails(error);
                }
            });
        });
    }

    /**
     * Render individual error item
     */
    renderErrorItem(error) {
        const timeStr = new Date(error.timestamp).toLocaleTimeString();
        const severityClass = `severity-${error.severity || 'info'}`;
        const recoveredClass = error.recovered ? 'recovered' : '';

        return `
            <div class="error-item ${severityClass} ${recoveredClass}" data-error-id="${error.id || Date.now()}">
                <div class="error-header">
                    <div class="error-severity">
                        <span class="severity-indicator"></span>
                        <span class="severity-text">${(error.severity || 'info').toUpperCase()}</span>
                    </div>
                    <div class="error-time">${timeStr}</div>
                    <div class="error-category">${error.category || 'general'}</div>
                </div>
                <div class="error-message">${this.escapeHtml(error.message || 'Unknown error')}</div>
                <div class="error-source">${this.escapeHtml(error.source || 'Unknown source')}</div>
                ${error.recovered ? '<div class="recovery-badge">Recovered</div>' : ''}
            </div>
        `;
    }

    /**
     * Show detailed view of an error
     */
    showErrorDetails(error) {
        this.selectedError = error;

        const detailContent = this.container.querySelector('.detail-content');
        detailContent.innerHTML = `
            <div class="detail-section">
                <h4>Error Information</h4>
                <div class="detail-field">
                    <label>Severity:</label>
                    <span class="severity-badge severity-${error.severity}">${(error.severity || 'info').toUpperCase()}</span>
                </div>
                <div class="detail-field">
                    <label>Category:</label>
                    <span>${error.category || 'general'}</span>
                </div>
                <div class="detail-field">
                    <label>Timestamp:</label>
                    <span>${new Date(error.timestamp).toLocaleString()}</span>
                </div>
                <div class="detail-field">
                    <label>Source:</label>
                    <span>${this.escapeHtml(error.source || 'Unknown')}</span>
                </div>
            </div>

            <div class="detail-section">
                <h4>Message</h4>
                <div class="code-block">${this.escapeHtml(error.message || 'No message')}</div>
            </div>

            ${error.stack ? `
                <div class="detail-section">
                    <h4>Stack Trace</h4>
                    <div class="code-block stack-trace">${this.escapeHtml(error.stack)}</div>
                </div>
            ` : ''}

            ${error.context ? `
                <div class="detail-section">
                    <h4>Context</h4>
                    <div class="code-block">${this.escapeHtml(JSON.stringify(error.context, null, 2))}</div>
                </div>
            ` : ''}

            <div class="detail-actions">
                <button class="btn btn-primary ignore-error">Ignore</button>
                <button class="btn btn-secondary copy-error">Copy Details</button>
                ${error.recovered ? '' : '<button class="btn btn-warning retry-recovery">Retry Recovery</button>'}
            </div>
        `;

        // Add action button listeners
        detailContent.querySelector('.ignore-error').addEventListener('click', () => this.ignoreError(error));
        detailContent.querySelector('.copy-error').addEventListener('click', () => this.copyErrorDetails(error));

        const retryBtn = detailContent.querySelector('.retry-recovery');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.retryRecovery(error));
        }
    }

    /**
     * Update filters and refresh display
     */
    updateFilters() {
        this.currentFilters.severity = this.container.querySelector('.severity-filter').value;
        this.currentFilters.category = this.container.querySelector('.category-filter').value;
        this.currentFilters.timeRange = this.container.querySelector('.time-filter').value;
        this.currentFilters.searchTerm = this.searchInput.value.trim();

        this.updateFilteredErrors();
        this.renderErrorList();
        this.updateMetrics();
    }

    /**
     * Clear search input
     */
    clearSearch() {
        this.searchInput.value = '';
        this.updateFilters();
    }

    /**
     * Toggle auto-scroll behavior
     */
    toggleAutoScroll(button) {
        button.classList.toggle('active');
    }

    /**
     * Scroll to latest error
     */
    scrollToLatestError() {
        this.errorList.scrollTop = this.errorList.scrollHeight;
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        if (confirm('Are you sure you want to clear all errors?')) {
            this.displayedErrors = [];
            this.filteredErrors = [];
            this.clearErrorDetails();
            this.renderErrorList();
            this.updateMetrics();

            // Clear from ErrorManager if possible
            if (this.errorManager && this.errorManager.clearErrorLog) {
                this.errorManager.clearErrorLog();
            }
        }
    }

    /**
     * Clear error details panel
     */
    clearErrorDetails() {
        this.selectedError = null;
        const detailContent = this.container.querySelector('.detail-content');
        detailContent.innerHTML = `
            <div class="detail-empty">
                <div class="empty-icon">📋</div>
                <div class="empty-text">Select an error to view details</div>
            </div>
        `;
    }

    /**
     * Export errors to file
     */
    exportErrors() {
        const exportData = {
            timestamp: new Date().toISOString(),
            errorCount: this.filteredErrors.length,
            filters: this.currentFilters,
            errors: this.filteredErrors
        };

        const filename = `error-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        this.downloadJSON(exportData, filename);
    }

    /**
     * Download data as JSON file
     */
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Focus search input
     */
    focusSearch() {
        if (this.isActive) {
            this.searchInput.focus();
        }
    }

    /**
     * Refresh dashboard data
     */
    async refreshData() {
        try {
            // Refresh error data from ErrorManager
            if (this.errorManager && this.errorManager.getErrorLog) {
                this.displayedErrors = this.errorManager.getErrorLog().slice();
            }

            this.updateFilteredErrors();
            this.renderErrorList();
            this.updateMetrics();

        } catch (error) {
            console.error('ErrorDashboard: Failed to refresh data', error);
        }
    }

    /**
     * Start periodic updates
     */
    startPeriodicUpdates() {
        this.updateInterval = setInterval(() => {
            if (this.isActive) {
                this.updateMetrics();
            }
        }, this.config.updateInterval);
    }

    /**
     * Stop periodic updates
     */
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.errorPollingInterval) {
            clearInterval(this.errorPollingInterval);
            this.errorPollingInterval = null;
        }
    }

    /**
     * Show the dashboard
     */
    show() {
        if (!this.isDeveloperMode) return;

        this.isActive = true;
        this.container.classList.remove('hidden');
        this.container.classList.add('visible');

        // Refresh data when showing
        this.refreshData();

        console.log('ErrorDashboard: Dashboard shown');
    }

    /**
     * Hide the dashboard
     */
    hide() {
        this.isActive = false;
        this.container.classList.remove('visible');
        this.container.classList.add('hidden');

        console.log('ErrorDashboard: Dashboard hidden');
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isActive) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Ignore specific error
     */
    ignoreError(error) {
        if (this.errorManager && this.errorManager.suppressError) {
            this.errorManager.suppressError(error.message);
        }

        // Remove from display
        this.displayedErrors = this.displayedErrors.filter(e => e.id !== error.id);
        this.updateFilteredErrors();
        this.renderErrorList();
        this.clearErrorDetails();
    }

    /**
     * Copy error details to clipboard
     */
    async copyErrorDetails(error) {
        const details = {
            timestamp: new Date(error.timestamp).toISOString(),
            severity: error.severity,
            category: error.category,
            message: error.message,
            source: error.source,
            stack: error.stack,
            context: error.context
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
            this.showToast('Error details copied to clipboard');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    /**
     * Retry error recovery
     */
    retryRecovery(error) {
        if (this.errorManager && this.errorManager.attemptRecovery) {
            this.errorManager.attemptRecovery(error);
            this.showToast('Recovery attempt initiated');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `dashboard-toast toast-${type}`;
        toast.textContent = message;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Show settings dialog
     */
    showSettings() {
        // Implementation for settings dialog
        this.showToast('Settings dialog not yet implemented');
    }

    /**
     * Get memory usage estimate
     */
    getMemoryUsage() {
        if (performance.memory) {
            return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        return 0;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Bind methods to preserve this context
     */
    bindMethods() {
        this.handleKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);
        this.pollForNewErrors = this.pollForNewErrors.bind(this);
        this.updateMetrics = this.updateMetrics.bind(this);
    }

    /**
     * Cleanup when dashboard is destroyed
     */
    destroy() {
        this.stopPeriodicUpdates();
        this.isListening = false;

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Remove keyboard event listener
        document.removeEventListener('keydown', this.handleKeyboardShortcuts);

        console.log('ErrorDashboard: Destroyed');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorDashboard;
}

// Global registration
window.ErrorDashboard = ErrorDashboard;