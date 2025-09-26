/**
 * ErrorRecovery.js - Production-ready error recovery and circuit breaker system
 * Handles failures gracefully with automatic retry and fallback mechanisms
 */

class ErrorRecovery {
    constructor() {
        this.circuitBreakers = new Map();
        this.retryQueues = new Map();
        this.failureThresholds = {
            maxFailures: 5,
            resetTimeout: 30000,
            halfOpenRequests: 2
        };
        this.recoveryStrategies = new Map();
        this.errorLog = [];
        this.stats = {
            totalErrors: 0,
            recovered: 0,
            circuitBreaksTriggered: 0,
            fallbacksUsed: 0
        };
        
        this.initializeDefaultStrategies();
        this.setupGlobalErrorHandlers();
    }

    /**
     * Initialize default recovery strategies
     */
    initializeDefaultStrategies() {
        // Module loading failures
        this.registerStrategy('MODULE_LOAD_ERROR', {
            maxRetries: 3,
            retryDelay: 1000,
            backoffMultiplier: 2,
            fallback: (error, context) => {
                console.warn(`Module ${context.moduleName} failed to load, using stub`);
                return this.createStubModule(context.moduleName);
            },
            recovery: async (error, context) => {
                // Try alternative loading methods
                const alternatives = [
                    () => this.loadModuleViaScript(context),
                    () => this.loadModuleViaFetch(context),
                    () => this.loadModuleFromCache(context)
                ];
                
                for (const method of alternatives) {
                    try {
                        return await method();
                    } catch (e) {
                        continue;
                    }
                }
                throw error;
            }
        });

        // Network failures
        this.registerStrategy('NETWORK_ERROR', {
            maxRetries: 5,
            retryDelay: 2000,
            backoffMultiplier: 1.5,
            fallback: (error, context) => {
                return this.getOfflineData(context.resource);
            },
            recovery: async (error, context) => {
                // Wait for network
                if (!navigator.onLine) {
                    await this.waitForNetwork();
                }
                return this.retryWithBackoff(context.request);
            }
        });

        // State corruption
        this.registerStrategy('STATE_CORRUPTION', {
            maxRetries: 1,
            retryDelay: 0,
            fallback: (error, context) => {
                return this.getLastValidState();
            },
            recovery: async (error, context) => {
                // Attempt state repair
                const repaired = await this.repairState(context.state);
                if (this.validateState(repaired)) {
                    return repaired;
                }
                // Rollback to checkpoint
                return this.rollbackToCheckpoint();
            }
        });

        // Memory issues
        this.registerStrategy('MEMORY_ERROR', {
            maxRetries: 2,
            retryDelay: 5000,
            fallback: () => {
                this.performEmergencyCleanup();
                return { reduced: true };
            },
            recovery: async (error, context) => {
                // Free memory and retry
                await this.freeMemory();
                if (context.operation) {
                    return await context.operation();
                }
            }
        });
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Window error handler
        const originalHandler = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleGlobalError({
                type: 'WINDOW_ERROR',
                message,
                source,
                lineno,
                colno,
                error
            });
            
            if (originalHandler) {
                return originalHandler(message, source, lineno, colno, error);
            }
            return true; // Prevent default
        };

        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                type: 'UNHANDLED_REJECTION',
                promise: event.promise,
                reason: event.reason
            });
            event.preventDefault();
        });

        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError(event);
            }
        }, true);
    }

    /**
     * Circuit breaker implementation
     */
    getCircuitBreaker(service) {
        if (!this.circuitBreakers.has(service)) {
            this.circuitBreakers.set(service, {
                state: 'CLOSED',
                failures: 0,
                lastFailTime: null,
                successCount: 0,
                nextAttempt: null
            });
        }
        return this.circuitBreakers.get(service);
    }

    async callWithCircuitBreaker(service, operation, fallback) {
        const breaker = this.getCircuitBreaker(service);
        
        // Check circuit state
        if (breaker.state === 'OPEN') {
            if (Date.now() < breaker.nextAttempt) {
                console.warn(`Circuit breaker OPEN for ${service}`);
                this.stats.fallbacksUsed++;
                return fallback ? fallback() : Promise.reject(new Error('Circuit breaker is OPEN'));
            }
            // Try half-open
            breaker.state = 'HALF_OPEN';
            breaker.successCount = 0;
        }

        try {
            const result = await operation();
            
            // Success - update breaker
            if (breaker.state === 'HALF_OPEN') {
                breaker.successCount++;
                if (breaker.successCount >= this.failureThresholds.halfOpenRequests) {
                    breaker.state = 'CLOSED';
                    breaker.failures = 0;
                    console.log(`Circuit breaker CLOSED for ${service}`);
                }
            } else if (breaker.state === 'CLOSED') {
                breaker.failures = 0;
            }
            
            return result;
            
        } catch (error) {
            breaker.failures++;
            breaker.lastFailTime = Date.now();
            
            if (breaker.failures >= this.failureThresholds.maxFailures) {
                breaker.state = 'OPEN';
                breaker.nextAttempt = Date.now() + this.failureThresholds.resetTimeout;
                this.stats.circuitBreaksTriggered++;
                console.error(`Circuit breaker OPEN for ${service} after ${breaker.failures} failures`);
            }
            
            if (fallback) {
                this.stats.fallbacksUsed++;
                return fallback();
            }
            throw error;
        }
    }

    /**
     * Retry with exponential backoff
     */
    async retryWithBackoff(operation, options = {}) {
        const {
            maxRetries = 3,
            initialDelay = 1000,
            multiplier = 2,
            maxDelay = 30000
        } = options;
        
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (i < maxRetries - 1) {
                    const delay = Math.min(
                        initialDelay * Math.pow(multiplier, i),
                        maxDelay
                    );
                    console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Register recovery strategy
     */
    registerStrategy(errorType, strategy) {
        this.recoveryStrategies.set(errorType, strategy);
    }

    /**
     * Execute recovery for an error
     */
    async recover(error, context = {}) {
        this.stats.totalErrors++;
        
        const errorType = this.classifyError(error);
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (!strategy) {
            console.error('No recovery strategy for:', errorType);
            throw error;
        }
        
        // Log error
        this.logError(error, errorType, context);
        
        try {
            // Try recovery
            if (strategy.recovery) {
                const result = await this.retryWithBackoff(
                    () => strategy.recovery(error, context),
                    {
                        maxRetries: strategy.maxRetries,
                        initialDelay: strategy.retryDelay,
                        multiplier: strategy.backoffMultiplier || 2
                    }
                );
                this.stats.recovered++;
                return result;
            }
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            
            // Use fallback
            if (strategy.fallback) {
                this.stats.fallbacksUsed++;
                return strategy.fallback(error, context);
            }
            
            throw recoveryError;
        }
    }

    /**
     * Classify error type
     */
    classifyError(error) {
        if (!error) return 'UNKNOWN_ERROR';
        
        const message = error.message || error.toString();
        
        // Module errors
        if (message.includes('module') || message.includes('import') || message.includes('require')) {
            return 'MODULE_LOAD_ERROR';
        }
        
        // Network errors
        if (message.includes('fetch') || message.includes('network') || error.code === 'ECONNREFUSED') {
            return 'NETWORK_ERROR';
        }
        
        // Memory errors
        if (message.includes('memory') || message.includes('heap') || error.name === 'RangeError') {
            return 'MEMORY_ERROR';
        }
        
        // State errors
        if (message.includes('state') || message.includes('undefined') || message.includes('null')) {
            return 'STATE_CORRUPTION';
        }
        
        return 'GENERIC_ERROR';
    }

    /**
     * Handle global errors
     */
    handleGlobalError(errorInfo) {
        console.error('Global error caught:', errorInfo);
        
        // Attempt recovery
        this.recover(errorInfo.error || new Error(errorInfo.message), {
            global: true,
            ...errorInfo
        }).catch(error => {
            console.error('Failed to recover from global error:', error);
            this.showErrorUI(error);
        });
    }

    /**
     * Handle resource loading errors
     */
    handleResourceError(event) {
        const resource = event.target;
        const src = resource.src || resource.href;
        
        console.error('Resource failed to load:', src);
        
        // Try alternate sources
        if (resource.dataset.fallback) {
            resource.src = resource.dataset.fallback;
        } else {
            this.recover(new Error(`Resource load failed: ${src}`), {
                type: 'RESOURCE_ERROR',
                resource: src,
                element: resource
            });
        }
    }

    /**
     * Create stub module for failed loads
     */
    createStubModule(moduleName) {
        console.warn(`Creating stub for ${moduleName}`);
        
        return {
            name: moduleName,
            isStub: true,
            initialize: () => {
                console.log(`Stub module ${moduleName} initialized`);
            },
            exports: new Proxy({}, {
                get: (target, prop) => {
                    console.warn(`Accessing stub property: ${moduleName}.${prop}`);
                    return () => {}; // Return no-op function
                }
            })
        };
    }

    /**
     * Emergency memory cleanup
     */
    performEmergencyCleanup() {
        console.warn('Performing emergency memory cleanup');
        
        // Clear caches
        if (window.caches) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        // Clear large data structures
        this.errorLog = this.errorLog.slice(-100); // Keep only recent errors
        
        // Clear unused images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!this.isInViewport(img)) {
                img.src = '';
            }
        });
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Free memory gracefully
     */
    async freeMemory() {
        // Clear non-essential caches
        if (window.game?.cache) {
            window.game.cache.clear();
        }
        
        // Reduce quality settings
        if (window.game?.settings) {
            window.game.settings.quality = 'low';
        }
        
        // Wait for cleanup
        await this.sleep(100);
        
        return true;
    }

    /**
     * Wait for network connectivity
     */
    async waitForNetwork(timeout = 30000) {
        const startTime = Date.now();
        
        while (!navigator.onLine) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Network timeout');
            }
            await this.sleep(1000);
        }
        
        // Additional connectivity check
        try {
            await fetch('/ping', { method: 'HEAD' });
        } catch (e) {
            await this.sleep(2000);
        }
    }

    /**
     * State repair utilities
     */
    async repairState(state) {
        const repaired = { ...state };
        
        // Remove circular references
        const seen = new WeakSet();
        const cleanup = (obj) => {
            if (obj && typeof obj === 'object') {
                if (seen.has(obj)) return '[Circular]';
                seen.add(obj);
                
                for (const key in obj) {
                    obj[key] = cleanup(obj[key]);
                }
            }
            return obj;
        };
        
        cleanup(repaired);
        
        // Restore missing required fields
        const requiredFields = ['version', 'timestamp', 'player'];
        for (const field of requiredFields) {
            if (!repaired[field]) {
                repaired[field] = this.getDefaultValue(field);
            }
        }
        
        return repaired;
    }

    /**
     * Validate state integrity
     */
    validateState(state) {
        if (!state || typeof state !== 'object') return false;
        if (!state.version || !state.timestamp) return false;
        if (!state.player || typeof state.player !== 'object') return false;
        
        // Check for data corruption
        try {
            JSON.stringify(state);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get last valid state
     */
    getLastValidState() {
        // Try localStorage
        try {
            const saved = localStorage.getItem('game_state_backup');
            if (saved) {
                const state = JSON.parse(saved);
                if (this.validateState(state)) {
                    return state;
                }
            }
        } catch (e) {
            console.error('Failed to load backup state:', e);
        }
        
        // Return minimal valid state
        return this.getMinimalValidState();
    }

    /**
     * Get minimal valid game state
     */
    getMinimalValidState() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            player: {
                level: 1,
                experience: 0,
                resources: {},
                settings: {}
            },
            systems: {},
            flags: {}
        };
    }

    /**
     * Rollback to checkpoint
     */
    async rollbackToCheckpoint() {
        const checkpoints = this.getCheckpoints();
        
        for (const checkpoint of checkpoints) {
            try {
                const state = await this.loadCheckpoint(checkpoint);
                if (this.validateState(state)) {
                    console.log(`Rolled back to checkpoint: ${checkpoint.id}`);
                    return state;
                }
            } catch (e) {
                continue;
            }
        }
        
        // No valid checkpoint
        return this.getMinimalValidState();
    }

    /**
     * Get available checkpoints
     */
    getCheckpoints() {
        const checkpoints = [];
        
        // Check localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('checkpoint_')) {
                checkpoints.push({
                    id: key,
                    timestamp: parseInt(key.split('_')[1])
                });
            }
        }
        
        // Sort by timestamp (newest first)
        return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Load checkpoint
     */
    async loadCheckpoint(checkpoint) {
        const data = localStorage.getItem(checkpoint.id);
        return JSON.parse(data);
    }

    /**
     * Alternative module loading methods
     */
    async loadModuleViaScript(context) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = context.modulePath;
            script.onload = () => resolve(window[context.moduleName]);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async loadModuleViaFetch(context) {
        const response = await fetch(context.modulePath);
        const code = await response.text();
        const module = new Function('exports', 'module', code);
        const exports = {};
        const moduleObj = { exports };
        module(exports, moduleObj);
        return moduleObj.exports;
    }

    async loadModuleFromCache(context) {
        const cached = sessionStorage.getItem(`module_${context.moduleName}`);
        if (cached) {
            return JSON.parse(cached);
        }
        throw new Error('Module not in cache');
    }

    /**
     * Get offline data fallback
     */
    getOfflineData(resource) {
        const offlineData = {
            '/api/user': { id: 'offline', name: 'Offline User' },
            '/api/stats': { plays: 0, highScore: 0 },
            '/api/leaderboard': []
        };
        
        return offlineData[resource] || null;
    }

    /**
     * Show error UI to user
     */
    showErrorUI(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-recovery-ui';
        errorDiv.innerHTML = `
            <div class="error-header">⚠️ An error occurred</div>
            <div class="error-message">${error.message || 'Unknown error'}</div>
            <div class="error-actions">
                <button onclick="location.reload()">Reload Page</button>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        // Add styles
        if (!document.querySelector('#error-recovery-styles')) {
            const style = document.createElement('style');
            style.id = 'error-recovery-styles';
            style.textContent = `
                .error-recovery-ui {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #ff5252;
                    color: white;
                    padding: 15px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 10000;
                    max-width: 300px;
                }
                .error-header {
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .error-actions {
                    margin-top: 10px;
                    display: flex;
                    gap: 10px;
                }
                .error-actions button {
                    flex: 1;
                    padding: 5px 10px;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    background: white;
                    color: #ff5252;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    }

    /**
     * Log error for analysis
     */
    logError(error, type, context) {
        const entry = {
            timestamp: Date.now(),
            type,
            message: error.message,
            stack: error.stack,
            context,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        this.errorLog.push(entry);
        
        // Keep log size manageable
        if (this.errorLog.length > 1000) {
            this.errorLog = this.errorLog.slice(-500);
        }
        
        // Send to analytics if available
        if (window.analytics?.track) {
            window.analytics.track('error', entry);
        }
    }

    /**
     * Get error statistics
     */
    getStatistics() {
        const errorsByType = {};
        
        this.errorLog.forEach(entry => {
            errorsByType[entry.type] = (errorsByType[entry.type] || 0) + 1;
        });
        
        return {
            ...this.stats,
            errorsByType,
            recentErrors: this.errorLog.slice(-10),
            recoveryRate: this.stats.recovered / this.stats.totalErrors || 0,
            circuitBreakerStates: Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => ({
                service,
                ...breaker
            }))
        };
    }

    /**
     * Utility functions
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }

    getDefaultValue(field) {
        const defaults = {
            version: '1.0.0',
            timestamp: Date.now(),
            player: { level: 1, experience: 0 }
        };
        return defaults[field] || null;
    }

    /**
     * Reset error recovery system
     */
    reset() {
        this.circuitBreakers.clear();
        this.retryQueues.clear();
        this.errorLog = [];
        this.stats = {
            totalErrors: 0,
            recovered: 0,
            circuitBreaksTriggered: 0,
            fallbacksUsed: 0
        };
        console.log('Error recovery system reset');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecovery;
} else {
    window.ErrorRecovery = ErrorRecovery;
}