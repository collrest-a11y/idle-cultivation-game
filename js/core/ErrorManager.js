/**
 * ErrorManager - Comprehensive error handling and recovery system
 * Provides graceful error handling, logging, recovery, and user notifications
 */
class ErrorManager {
    constructor() {
        this.eventManager = null;
        this.gameState = null;
        this.performanceMonitor = null;

        // Error tracking
        this.errorLog = [];
        this.errorCounts = new Map();
        this.recoveryAttempts = new Map();
        this.suppressedErrors = new Set();

        // Configuration
        this.config = {
            maxLogEntries: 1000,
            maxRecoveryAttempts: 3,
            reportingEnabled: false,
            userNotificationsEnabled: true,
            autoRecoveryEnabled: true,
            suppressDuplicates: true,
            logLevel: 'warn' // 'debug', 'info', 'warn', 'error', 'critical'
        };

        // Error categories
        this.categories = {
            CRITICAL: 'critical',
            SYSTEM: 'system',
            GAMEPLAY: 'gameplay',
            UI: 'ui',
            NETWORK: 'network',
            STORAGE: 'storage',
            PERFORMANCE: 'performance',
            VALIDATION: 'validation'
        };

        // Recovery strategies
        this.recoveryStrategies = new Map();

        // Error statistics
        this.statistics = {
            totalErrors: 0,
            criticalErrors: 0,
            recoveredErrors: 0,
            userNotifications: 0,
            sessionErrors: 0,
            lastErrorTime: 0
        };

        // User-friendly error messages
        this.userMessages = {
            [this.categories.CRITICAL]: 'A critical error occurred. The game will attempt to recover.',
            [this.categories.SYSTEM]: 'A system error occurred. Your progress has been saved.',
            [this.categories.GAMEPLAY]: 'A gameplay error occurred. Please try again.',
            [this.categories.UI]: 'A display error occurred. Refreshing the interface.',
            [this.categories.NETWORK]: 'Connection error. Please check your internet connection.',
            [this.categories.STORAGE]: 'Save error. Please ensure you have enough storage space.',
            [this.categories.PERFORMANCE]: 'Performance issue detected. Optimizing game settings.',
            [this.categories.VALIDATION]: 'Data validation error. Attempting to repair.'
        };

        // Initialize error handlers
        this._setupGlobalErrorHandlers();
        this._setupRecoveryStrategies();
    }

    /**
     * Initialize the error manager
     * @param {Object} context - Game context
     */
    initialize(context) {
        this.eventManager = context.eventManager;
        this.gameState = context.gameState;
        this.performanceMonitor = context.performanceMonitor;

        // Load error configuration from game state
        this._loadConfiguration();

        // Set up event listeners
        this._setupEventListeners();

        console.log('ErrorManager: Initialized');
    }

    /**
     * Report an error
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Error context
     * @param {string} category - Error category
     * @returns {string} Error ID
     */
    reportError(error, context = {}, category = this.categories.SYSTEM) {
        const errorData = this._normalizeError(error, context, category);
        const errorId = this._generateErrorId();

        // Check if this error should be suppressed
        if (this._shouldSuppressError(errorData)) {
            return errorId;
        }

        // Add to error log
        const logEntry = {
            id: errorId,
            timestamp: Date.now(),
            ...errorData,
            context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                gameState: this._getGameStateSnapshot(),
                performance: this._getPerformanceSnapshot(),
                ...context
            }
        };

        this._addToErrorLog(logEntry);

        // Update statistics
        this._updateStatistics(logEntry);

        // Attempt recovery if enabled
        if (this.config.autoRecoveryEnabled) {
            this._attemptRecovery(logEntry);
        }

        // Notify user if appropriate
        if (this.config.userNotificationsEnabled && this._shouldNotifyUser(logEntry)) {
            this._notifyUser(logEntry);
        }

        // Emit error event
        if (this.eventManager) {
            this.eventManager.emit('error:reported', logEntry);
        }

        // Log to console based on severity
        this._logToConsole(logEntry);

        return errorId;
    }

    /**
     * Report a critical error that requires immediate attention
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Error context
     * @returns {string} Error ID
     */
    reportCriticalError(error, context = {}) {
        const errorId = this.reportError(error, context, this.categories.CRITICAL);

        // Force save game state
        this._emergencySave();

        // Trigger emergency mode if available
        if (this.performanceMonitor && this.performanceMonitor.enableEmergencyMode) {
            this.performanceMonitor.enableEmergencyMode();
        }

        return errorId;
    }

    /**
     * Handle promise rejections
     * @param {PromiseRejectionEvent} event - Unhandled rejection event
     */
    handleUnhandledRejection(event) {
        try {
            const reason = event.reason;
            let error, context;

            if (reason instanceof Error) {
                error = reason;
                context = {
                    type: 'unhandled_promise_rejection',
                    stack: reason ? reason.stack : undefined,
                    name: reason ? reason.name : 'Unknown'
                };
            } else {
                error = new Error(String(reason || 'Unknown promise rejection'));
                context = {
                    type: 'unhandled_promise_rejection',
                    originalReason: reason,
                    reasonType: typeof reason
                };
            }

            // Add additional context
            context.url = window.location.href;
            context.timestamp = Date.now();
            context.userAgent = navigator.userAgent;

            // Check if this is a critical promise rejection
            const isCritical = this._isCriticalPromiseRejection(reason, context);
            const category = isCritical ? this.categories.CRITICAL : this.categories.SYSTEM;

            this.reportError(error, context, category);
        } catch (handlerError) {
            console.error('ErrorManager: Failed to handle promise rejection:', handlerError);
            // Fallback error reporting
            console.error('Original rejection reason:', event.reason);
        }
    }

    /**
     * Handle JavaScript errors
     * @param {ErrorEvent} event - Error event
     */
    handleJavaScriptError(event) {
        try {
            const error = event.error || new Error(event.message || 'Unknown JavaScript error');

            // Enhanced context collection
            const context = {
                type: 'javascript_error',
                filename: event.filename || 'unknown',
                lineno: event.lineno || 0,
                colno: event.colno || 0,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: Date.now(),
                stackTrace: error.stack || 'No stack trace available'
            };

            // Check if this is a critical system error
            const isCritical = this._isCriticalError(error, context);
            const category = isCritical ? this.categories.CRITICAL : this.categories.SYSTEM;

            this.reportError(error, context, category);
        } catch (handlerError) {
            console.error('ErrorManager: Failed to handle JavaScript error:', handlerError);
            // Fallback error reporting
            console.error('Original error:', event.error || event.message);
        }
    }

    /**
     * Add a custom recovery strategy
     * @param {string} errorType - Error type to handle
     * @param {Function} strategy - Recovery function
     */
    addRecoveryStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
        console.log(`ErrorManager: Added recovery strategy for ${errorType}`);
    }

    /**
     * Suppress specific error types
     * @param {string} errorPattern - Error pattern to suppress
     */
    suppressError(errorPattern) {
        this.suppressedErrors.add(errorPattern);
        console.log(`ErrorManager: Suppressing errors matching: ${errorPattern}`);
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getStatistics() {
        return {
            ...this.statistics,
            errorCategories: this._getErrorCategoryStats(),
            recentErrors: this._getRecentErrors(10),
            topErrors: this._getTopErrors(5),
            recoverySuccess: this._getRecoverySuccessRate()
        };
    }

    /**
     * Get error log
     * @param {Object} filters - Optional filters
     * @returns {Array} Filtered error log
     */
    getErrorLog(filters = {}) {
        let filteredLog = [...this.errorLog];

        if (filters.category) {
            filteredLog = filteredLog.filter(entry => entry.category === filters.category);
        }

        if (filters.since) {
            filteredLog = filteredLog.filter(entry => entry.timestamp >= filters.since);
        }

        if (filters.limit) {
            filteredLog = filteredLog.slice(-filters.limit);
        }

        return filteredLog;
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        const clearedCount = this.errorLog.length;
        this.errorLog = [];
        this.errorCounts.clear();
        this.recoveryAttempts.clear();

        console.log(`ErrorManager: Cleared ${clearedCount} error entries`);
    }

    /**
     * Export error data for analysis
     * @returns {Object} Error data export
     */
    exportErrorData() {
        return {
            timestamp: Date.now(),
            config: this.config,
            statistics: this.getStatistics(),
            errorLog: this.errorLog,
            gameInfo: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                gameVersion: this.gameState?.get('meta.version') || 'unknown'
            }
        };
    }

    // Private methods

    /**
     * Set up global error handlers
     */
    _setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            try {
                this.handleJavaScriptError(event);
            } catch (handlerError) {
                console.error('ErrorManager: Error in JavaScript error handler:', handlerError);
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            try {
                this.handleUnhandledRejection(event);
                event.preventDefault(); // Prevent console spam
            } catch (handlerError) {
                console.error('ErrorManager: Error in promise rejection handler:', handlerError);
            }
        });

        // Handle resource loading errors
        window.addEventListener('error', (event) => {
            try {
                if (event.target !== window && event.target) {
                    const resourceUrl = event.target.src || event.target.href || 'unknown';
                    const resourceType = event.target.tagName || 'unknown';

                    this.reportError(`Failed to load resource: ${resourceUrl}`, {
                        type: 'resource_error',
                        target: resourceType,
                        src: resourceUrl,
                        currentUrl: window.location.href
                    }, this.categories.SYSTEM);
                }
            } catch (handlerError) {
                console.error('ErrorManager: Error in resource error handler:', handlerError);
            }
        }, true);

        // Handle CSS parsing errors (if supported)
        if ('oncsserror' in window) {
            window.addEventListener('csserror', (event) => {
                try {
                    this.reportError(`CSS Error: ${event.message}`, {
                        type: 'css_error',
                        filename: event.filename,
                        line: event.lineno,
                        column: event.colno
                    }, this.categories.UI);
                } catch (handlerError) {
                    console.error('ErrorManager: Error in CSS error handler:', handlerError);
                }
            });
        }

        // Add critical DOM error detection
        this._setupDOMErrorDetection();

        // Add memory pressure detection
        this._setupMemoryPressureDetection();
    }

    /**
     * Set up recovery strategies
     */
    _setupRecoveryStrategies() {
        // Storage errors
        this.addRecoveryStrategy('storage', (errorData) => {
            console.log('Attempting storage recovery...');
            try {
                // Clear some localStorage space
                this._clearOldStorageData();
                return { success: true, message: 'Storage space cleared' };
            } catch (e) {
                return { success: false, message: 'Storage recovery failed' };
            }
        });

        // UI errors
        this.addRecoveryStrategy('ui', (errorData) => {
            console.log('Attempting UI recovery...');
            try {
                // Refresh UI components
                if (window.uiManager && window.uiManager.refresh) {
                    window.uiManager.refresh();
                }
                return { success: true, message: 'UI refreshed' };
            } catch (e) {
                return { success: false, message: 'UI recovery failed' };
            }
        });

        // Performance errors
        this.addRecoveryStrategy('performance', (errorData) => {
            console.log('Attempting performance recovery...');
            try {
                // Enable performance mode
                if (window.gameLoop && window.gameLoop.enablePerformanceMode) {
                    window.gameLoop.enablePerformanceMode();
                }
                return { success: true, message: 'Performance mode enabled' };
            } catch (e) {
                return { success: false, message: 'Performance recovery failed' };
            }
        });

        // Game state errors
        this.addRecoveryStrategy('gamestate', (errorData) => {
            console.log('Attempting game state recovery...');
            try {
                // Validate and repair game state
                if (window.dataValidator && this.gameState) {
                    const validation = window.dataValidator.validateGameState(this.gameState.getState());
                    if (!validation.isValid) {
                        const repair = window.dataValidator.repairData(this.gameState.getState());
                        if (repair.success) {
                            this.gameState.update(() => repair.data, { source: 'error_recovery' });
                            return { success: true, message: 'Game state repaired' };
                        }
                    }
                }
                return { success: false, message: 'No repair needed or failed' };
            } catch (e) {
                return { success: false, message: 'Game state recovery failed' };
            }
        });
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        if (!this.eventManager) return;

        // Listen for performance issues
        this.eventManager.on('performance:alert', (data) => {
            if (data.severity === 'critical') {
                this.reportError('Critical performance issue detected', {
                    performanceData: data
                }, this.categories.PERFORMANCE);
            }
        });

        // Listen for save failures
        this.eventManager.on('save:failed', (data) => {
            this.reportError('Save operation failed', {
                saveData: data
            }, this.categories.STORAGE);
        });

        // Listen for validation errors
        this.eventManager.on('validation:failed', (data) => {
            this.reportError('Data validation failed', {
                validationData: data
            }, this.categories.VALIDATION);
        });
    }

    /**
     * Normalize error data
     * @param {Error|string} error - Raw error
     * @param {Object} context - Error context
     * @param {string} category - Error category
     * @returns {Object} Normalized error data
     */
    _normalizeError(error, context, category) {
        if (error instanceof Error) {
            return {
                message: error ? error.message : 'Unknown error',
                stack: error ? error.stack : undefined,
                name: error ? error.name : 'UnknownError',
                category,
                type: context.type || 'error',
                severity: this._determineSeverity(category, error)
            };
        } else if (typeof error === 'string') {
            return {
                message: error,
                stack: null,
                name: 'CustomError',
                category,
                type: context.type || 'message',
                severity: this._determineSeverity(category, error)
            };
        } else {
            return {
                message: 'Unknown error',
                stack: null,
                name: 'UnknownError',
                category,
                type: 'unknown',
                severity: 'medium'
            };
        }
    }

    /**
     * Determine error severity
     * @param {string} category - Error category
     * @param {*} error - Error data
     * @returns {string} Severity level
     */
    _determineSeverity(category, error) {
        if (category === this.categories.CRITICAL) {
            return 'critical';
        }

        if (category === this.categories.SYSTEM) {
            return 'high';
        }

        if (typeof error === 'object' && error.message) {
            const message = error.message.toLowerCase();
            if (message.includes('critical') || message.includes('fatal')) {
                return 'critical';
            }
            if (message.includes('network') || message.includes('connection')) {
                return 'medium';
            }
        }

        return 'low';
    }

    /**
     * Check if error should be suppressed
     * @param {Object} errorData - Error data
     * @returns {boolean} Whether to suppress
     */
    _shouldSuppressError(errorData) {
        if (!this.config.suppressDuplicates) {
            return false;
        }

        // Check suppressed patterns
        for (const pattern of this.suppressedErrors) {
            if (errorData.message.includes(pattern)) {
                return true;
            }
        }

        // Check duplicate errors
        const errorKey = `${errorData.message}:${errorData.category}`;
        const count = this.errorCounts.get(errorKey) || 0;

        if (count > 5) { // Suppress after 5 occurrences
            return true;
        }

        return false;
    }

    /**
     * Add error to log
     * @param {Object} logEntry - Log entry
     */
    _addToErrorLog(logEntry) {
        this.errorLog.push(logEntry);

        // Maintain log size limit
        if (this.errorLog.length > this.config.maxLogEntries) {
            this.errorLog = this.errorLog.slice(-this.config.maxLogEntries);
        }

        // Update error counts
        const errorKey = `${logEntry.message}:${logEntry.category}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }

    /**
     * Update error statistics
     * @param {Object} logEntry - Log entry
     */
    _updateStatistics(logEntry) {
        this.statistics.totalErrors++;
        this.statistics.sessionErrors++;
        this.statistics.lastErrorTime = logEntry.timestamp;

        if (logEntry.severity === 'critical') {
            this.statistics.criticalErrors++;
        }
    }

    /**
     * Attempt error recovery
     * @param {Object} logEntry - Log entry
     */
    _attemptRecovery(logEntry) {
        const errorKey = `${logEntry.message}:${logEntry.category}`;
        const attempts = this.recoveryAttempts.get(errorKey) || 0;

        if (attempts >= this.config.maxRecoveryAttempts) {
            return; // Max attempts reached
        }

        // Try category-specific recovery
        const strategy = this.recoveryStrategies.get(logEntry.category);
        if (strategy) {
            try {
                const result = strategy(logEntry);
                this.recoveryAttempts.set(errorKey, attempts + 1);

                if (result.success) {
                    this.statistics.recoveredErrors++;
                    console.log(`ErrorManager: Recovery successful - ${result.message}`);

                    if (this.eventManager) {
                        this.eventManager.emit('error:recovered', {
                            errorId: logEntry.id,
                            recovery: result
                        });
                    }
                } else {
                    console.warn(`ErrorManager: Recovery failed - ${result.message}`);
                }
            } catch (recoveryError) {
                console.error('ErrorManager: Recovery strategy failed:', recoveryError);
            }
        }
    }

    /**
     * Check if user should be notified
     * @param {Object} logEntry - Log entry
     * @returns {boolean} Whether to notify
     */
    _shouldNotifyUser(logEntry) {
        return logEntry.severity === 'critical' ||
               (logEntry.severity === 'high' && logEntry.category !== this.categories.PERFORMANCE);
    }

    /**
     * Notify user of error
     * @param {Object} logEntry - Log entry
     */
    _notifyUser(logEntry) {
        const message = this.userMessages[logEntry.category] || 'An error occurred.';

        // Use toast notification if available
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            // Fallback to console for development
            console.warn(`User Notification: ${message}`);
        }

        this.statistics.userNotifications++;
    }

    /**
     * Log error to console based on severity
     * @param {Object} logEntry - Log entry
     */
    _logToConsole(logEntry) {
        const prefix = `[${logEntry.category.toUpperCase()}]`;
        const message = `${prefix} ${logEntry.message}`;

        switch (logEntry.severity) {
            case 'critical':
                console.error(message, logEntry);
                break;
            case 'high':
                console.error(message);
                break;
            case 'medium':
                console.warn(message);
                break;
            case 'low':
                if (this.config.logLevel === 'debug') {
                    console.log(message);
                }
                break;
        }
    }

    /**
     * Emergency save
     */
    _emergencySave() {
        try {
            if (this.gameState) {
                this.gameState.forceSave({ emergency: true });
                console.log('ErrorManager: Emergency save completed');
            }
        } catch (saveError) {
            console.error('ErrorManager: Emergency save failed:', saveError);
        }
    }

    /**
     * Get game state snapshot for context
     * @returns {Object} Game state snapshot
     */
    _getGameStateSnapshot() {
        try {
            if (this.gameState) {
                return {
                    realm: this.gameState.get('realm.current'),
                    level: this.gameState.get('cultivation.qi.level'),
                    playTime: this.gameState.get('meta.totalPlayTime')
                };
            }
        } catch (e) {
            return { error: 'Failed to get game state snapshot' };
        }
        return {};
    }

    /**
     * Get performance snapshot for context
     * @returns {Object} Performance snapshot
     */
    _getPerformanceSnapshot() {
        try {
            if (this.performanceMonitor) {
                return this.performanceMonitor.getPerformanceSummary();
            }
        } catch (e) {
            return { error: 'Failed to get performance snapshot' };
        }
        return {};
    }

    /**
     * Generate unique error ID
     * @returns {string} Error ID
     */
    _generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Load configuration from game state
     */
    _loadConfiguration() {
        try {
            if (this.gameState) {
                const savedConfig = this.gameState.get('settings.errorHandling');
                if (savedConfig) {
                    this.config = { ...this.config, ...savedConfig };
                }
            }
        } catch (e) {
            console.warn('ErrorManager: Failed to load configuration');
        }
    }

    /**
     * Clear old storage data to free up space
     */
    _clearOldStorageData() {
        // Clear old cache entries, temporary data, etc.
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('temp_') || key.startsWith('cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * Get error category statistics
     * @returns {Object} Category stats
     */
    _getErrorCategoryStats() {
        const stats = {};
        this.errorLog.forEach(entry => {
            stats[entry.category] = (stats[entry.category] || 0) + 1;
        });
        return stats;
    }

    /**
     * Get recent errors
     * @param {number} limit - Number of recent errors
     * @returns {Array} Recent errors
     */
    _getRecentErrors(limit) {
        return this.errorLog.slice(-limit);
    }

    /**
     * Get top errors by frequency
     * @param {number} limit - Number of top errors
     * @returns {Array} Top errors
     */
    _getTopErrors(limit) {
        const errorCounts = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

        return errorCounts.map(([key, count]) => ({
            error: key,
            count
        }));
    }

    /**
     * Get recovery success rate
     * @returns {number} Success rate (0-1)
     */
    _getRecoverySuccessRate() {
        if (this.statistics.totalErrors === 0) return 0;
        return this.statistics.recoveredErrors / this.statistics.totalErrors;
    }

    /**
     * Setup DOM error detection
     */
    _setupDOMErrorDetection() {
        try {
            // Monitor for missing critical DOM elements
            const checkCriticalElements = () => {
                const criticalElements = ['game-interface', 'character-creation'];
                const missingElements = [];

                criticalElements.forEach(id => {
                    if (!document.getElementById(id)) {
                        missingElements.push(id);
                    }
                });

                if (missingElements.length > 0) {
                    this.reportError(`Critical DOM elements missing: ${missingElements.join(', ')}`, {
                        type: 'dom_critical_missing',
                        missingElements,
                        domReady: document.readyState,
                        bodyExists: !!document.body
                    }, this.categories.CRITICAL);
                }
            };

            // Check after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkCriticalElements);
            } else {
                setTimeout(checkCriticalElements, 1000); // Give time for dynamic creation
            }

            // Monitor for DOM mutation errors
            if (window.MutationObserver) {
                const observer = new MutationObserver((mutations) => {
                    try {
                        mutations.forEach(mutation => {
                            // Check for problematic mutations
                            if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                                mutation.removedNodes.forEach(node => {
                                    if (node.id && (node.id === 'game-interface' || node.id === 'character-creation')) {
                                        this.reportError(`Critical DOM element removed: ${node.id}`, {
                                            type: 'dom_critical_removed',
                                            elementId: node.id,
                                            mutationType: mutation.type
                                        }, this.categories.CRITICAL);
                                    }
                                });
                            }
                        });
                    } catch (observerError) {
                        console.warn('ErrorManager: Error in DOM mutation observer:', observerError);
                    }
                });

                observer.observe(document.body || document.documentElement, {
                    childList: true,
                    subtree: true
                });
            }
        } catch (error) {
            console.warn('ErrorManager: Failed to setup DOM error detection:', error);
        }
    }

    /**
     * Setup memory pressure detection
     */
    _setupMemoryPressureDetection() {
        try {
            // Monitor memory usage if performance API is available
            if (window.performance && window.performance.memory) {
                const checkMemoryPressure = () => {
                    try {
                        const memory = window.performance.memory;
                        const usedMB = memory.usedJSHeapSize / 1048576; // Convert to MB
                        const limitMB = memory.jsHeapSizeLimit / 1048576;
                        const usagePercent = (usedMB / limitMB) * 100;

                        if (usagePercent > 80) {
                            this.reportError(`High memory usage detected: ${usagePercent.toFixed(1)}%`, {
                                type: 'memory_pressure',
                                usedMB: Math.round(usedMB),
                                limitMB: Math.round(limitMB),
                                usagePercent: Math.round(usagePercent)
                            }, this.categories.PERFORMANCE);
                        }
                    } catch (memoryError) {
                        console.warn('ErrorManager: Error checking memory pressure:', memoryError);
                    }
                };

                // Check memory every 30 seconds
                setInterval(checkMemoryPressure, 30000);
            }

            // Monitor for memory-related errors
            const originalConsoleError = console.error;
            console.error = (...args) => {
                try {
                    const message = args.join(' ');
                    if (message.toLowerCase().includes('out of memory')) {
                        this.reportCriticalError('Out of memory error detected', {
                            type: 'memory_exhaustion',
                            originalMessage: message
                        });
                    }
                } catch (interceptError) {
                    // Ignore errors in error interception
                }
                originalConsoleError.apply(console, args);
            };
        } catch (error) {
            console.warn('ErrorManager: Failed to setup memory pressure detection:', error);
        }
    }

    /**
     * Check if an error is critical
     */
    _isCriticalError(error, context) {
        if (!error) return false;

        const message = (error.message || error.toString() || '').toLowerCase();
        const criticalPatterns = [
            'out of memory',
            'maximum call stack',
            'script error',
            'network error',
            'security error',
            'gamestate',
            'savemanager',
            'viewmanager',
            'uimanager'
        ];

        return criticalPatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Check if a promise rejection is critical
     */
    _isCriticalPromiseRejection(reason, context) {
        if (!reason) return false;

        const message = String(reason).toLowerCase();
        const criticalPatterns = [
            'failed to load',
            'network',
            'fetch',
            'initialization',
            'critical'
        ];

        return criticalPatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Enhanced error boundary for wrapping functions
     */
    wrapWithErrorBoundary(fn, context = {}) {
        return (...args) => {
            try {
                const result = fn.apply(this, args);

                // Handle promises
                if (result && typeof result.catch === 'function') {
                    return result.catch(error => {
                        this.reportError(error, {
                            ...context,
                            type: 'async_function_error',
                            functionName: fn.name || 'anonymous',
                            args: args.length
                        }, this.categories.SYSTEM);
                        throw error; // Re-throw to maintain promise chain
                    });
                }

                return result;
            } catch (error) {
                this.reportError(error, {
                    ...context,
                    type: 'sync_function_error',
                    functionName: fn.name || 'anonymous',
                    args: args.length
                }, this.categories.SYSTEM);
                throw error; // Re-throw to maintain error handling
            }
        };
    }

    /**
     * Create error boundary for components
     */
    createComponentErrorBoundary(componentName) {
        return {
            wrapMethod: (methodName, originalMethod) => {
                return this.wrapWithErrorBoundary(originalMethod, {
                    component: componentName,
                    method: methodName
                });
            },

            wrapClass: (ClassConstructor) => {
                // Wrap all methods of a class with error boundaries
                const methods = Object.getOwnPropertyNames(ClassConstructor.prototype);
                methods.forEach(methodName => {
                    if (methodName !== 'constructor' && typeof ClassConstructor.prototype[methodName] === 'function') {
                        const originalMethod = ClassConstructor.prototype[methodName];
                        ClassConstructor.prototype[methodName] = this.wrapWithErrorBoundary(originalMethod, {
                            component: componentName,
                            method: methodName
                        });
                    }
                });
                return ClassConstructor;
            }
        };
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorManager };
} else if (typeof window !== 'undefined') {
    window.ErrorManager = ErrorManager;
}