/**
 * ModuleManager - Manages loading and lifecycle of game modules
 * Handles dependency injection, loading order, and hot module replacement
 */
class ModuleManager {
    constructor() {
        this.modules = new Map(); // moduleName -> moduleData
        this.loadOrder = []; // Order in which modules were loaded
        this.dependencyGraph = new Map(); // moduleName -> Set of dependencies
        this.reverseDependencyGraph = new Map(); // moduleName -> Set of dependents
        this.isInitialized = false;
        this.loadedCount = 0;
        this.failedModules = new Set();

        // Core system references (injected)
        this._eventManager = null;
        this._gameState = null;
        this._timeManager = null;
        this._gameLoop = null;

        // Module loading configuration
        this.config = {
            enableHotReload: false,
            validateDependencies: true,
            defaultTimeoutMs: 30000, // 30 seconds default timeout
            retryAttempts: 3,
            retryDelayMs: 100, // Initial retry delay
            maxRetryDelayMs: 2000 // Max exponential backoff delay
        };

        // Performance tracking
        this.loadStartTime = 0;
        this.loadEndTime = 0;
        this.moduleLoadTimes = new Map();
    }

    /**
     * Set core systems for dependency injection
     * @param {Object} systems - Core system references
     * @param {EventManager} systems.eventManager - Event manager instance
     * @param {GameState} systems.gameState - Game state instance
     * @param {TimeManager} systems.timeManager - Time manager instance
     * @param {GameLoop} systems.gameLoop - Game loop instance
     */
    setCoreystems(systems) {
        this._eventManager = systems.eventManager;
        this._gameState = systems.gameState;
        this._timeManager = systems.timeManager;
        this._gameLoop = systems.gameLoop;
    }

    /**
     * Set configuration options
     * @param {Object} config - Configuration options
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Register a module for loading
     * @param {string} name - Module name
     * @param {Object} moduleDefinition - Module definition
     * @param {Function} moduleDefinition.factory - Factory function that creates the module
     * @param {string[]} moduleDefinition.dependencies - Array of dependency module names
     * @param {number} moduleDefinition.priority - Loading priority (higher = earlier)
     * @param {Object} moduleDefinition.config - Module-specific configuration
     */
    registerModule(name, moduleDefinition) {
        if (this.modules.has(name)) {
            throw new Error(`Module '${name}' is already registered`);
        }

        const moduleData = {
            name,
            factory: moduleDefinition.factory,
            dependencies: moduleDefinition.dependencies || [],
            priority: moduleDefinition.priority || 0,
            config: moduleDefinition.config || {},
            timeoutMs: moduleDefinition.timeoutMs || this.config.defaultTimeoutMs,
            instance: null,
            isLoaded: false,
            isLoading: false,
            loadStartTime: 0,
            loadEndTime: 0,
            error: null,
            retryCount: 0,
            lastError: null
        };

        this.modules.set(name, moduleData);
        this._buildDependencyGraph(name, moduleData.dependencies);

        if (this._eventManager) {
            this._eventManager.emit('moduleManager:moduleRegistered', {
                moduleName: name,
                dependencies: moduleData.dependencies,
                priority: moduleData.priority
            });
        }
    }

    /**
     * Load all registered modules in dependency order
     * @returns {Promise<Object>} Loading results
     */
    async loadAllModules() {
        if (this.isInitialized) {
            throw new Error('ModuleManager is already initialized');
        }

        this.loadStartTime = performance.now();
        this.loadedCount = 0;
        this.failedModules.clear();

        if (this._eventManager) {
            this._eventManager.emit('moduleManager:loadStarted', {
                moduleCount: this.modules.size,
                timestamp: Date.now()
            });
        }

        try {
            // Validate dependencies before loading
            if (this.config.validateDependencies) {
                this._validateDependencies();
            }

            // Get loading order
            const loadOrder = this._getLoadOrder();

            // Load modules in order
            for (const moduleName of loadOrder) {
                await this._loadModule(moduleName);
            }

            this.loadEndTime = performance.now();
            this.isInitialized = true;

            const results = {
                success: true,
                loadedCount: this.loadedCount,
                failedCount: this.failedModules.size,
                totalTime: this.loadEndTime - this.loadStartTime,
                failedModules: Array.from(this.failedModules)
            };

            if (this._eventManager) {
                this._eventManager.emit('moduleManager:loadCompleted', results);
            }

            return results;

        } catch (error) {
            this.loadEndTime = performance.now();

            const results = {
                success: false,
                error: error.message,
                loadedCount: this.loadedCount,
                failedCount: this.failedModules.size,
                totalTime: this.loadEndTime - this.loadStartTime,
                failedModules: Array.from(this.failedModules)
            };

            if (this._eventManager) {
                this._eventManager.emit('moduleManager:loadFailed', results);
            }

            throw error;
        }
    }

    /**
     * Load a specific module
     * @param {string} moduleName - Name of the module to load
     * @returns {Promise<Object>} Module instance
     */
    async loadModule(moduleName) {
        if (!this.modules.has(moduleName)) {
            throw new Error(`Module '${moduleName}' is not registered`);
        }

        return await this._loadModule(moduleName);
    }

    /**
     * Get a loaded module instance
     * @param {string} moduleName - Module name
     * @returns {Object|null} Module instance or null if not loaded
     */
    getModule(moduleName) {
        const moduleData = this.modules.get(moduleName);
        return moduleData && moduleData.isLoaded ? moduleData.instance : null;
    }

    /**
     * Check if a module is loaded
     * @param {string} moduleName - Module name
     * @returns {boolean} Whether the module is loaded
     */
    isModuleLoaded(moduleName) {
        const moduleData = this.modules.get(moduleName);
        return moduleData ? moduleData.isLoaded : false;
    }

    /**
     * Unload a module and its dependents
     * @param {string} moduleName - Module name
     * @returns {Promise<void>}
     */
    async unloadModule(moduleName) {
        if (!this.modules.has(moduleName)) {
            throw new Error(`Module '${moduleName}' is not registered`);
        }

        // Find all dependents that need to be unloaded first
        const dependents = this._getDependents(moduleName);

        // Unload dependents first
        for (const dependent of dependents) {
            if (this.isModuleLoaded(dependent)) {
                await this.unloadModule(dependent);
            }
        }

        // Unload the module itself
        const moduleData = this.modules.get(moduleName);
        if (moduleData.isLoaded && moduleData.instance) {
            try {
                if (typeof moduleData.instance.destroy === 'function') {
                    await moduleData.instance.destroy();
                }
            } catch (error) {
                console.error(`Error destroying module '${moduleName}':`, error);
            }

            moduleData.instance = null;
            moduleData.isLoaded = false;
        }

        if (this._eventManager) {
            this._eventManager.emit('moduleManager:moduleUnloaded', {
                moduleName,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Reload a module (hot module replacement)
     * @param {string} moduleName - Module name
     * @param {Object} newModuleDefinition - New module definition
     * @returns {Promise<Object>} New module instance
     */
    async reloadModule(moduleName, newModuleDefinition) {
        if (!this.config.enableHotReload) {
            throw new Error('Hot module replacement is disabled');
        }

        // Unload the existing module
        await this.unloadModule(moduleName);

        // Update the module definition
        if (newModuleDefinition) {
            this.modules.delete(moduleName);
            this.registerModule(moduleName, newModuleDefinition);
        }

        // Reload the module
        return await this.loadModule(moduleName);
    }

    /**
     * Get module loading statistics
     * @returns {Object} Loading statistics
     */
    getStatistics() {
        const totalModules = this.modules.size;
        const loadedModules = Array.from(this.modules.values()).filter(m => m.isLoaded).length;
        const failedModules = this.failedModules.size;

        return {
            totalModules,
            loadedModules,
            failedModules,
            loadSuccess: totalModules > 0 ? (loadedModules / totalModules) * 100 : 0,
            totalLoadTime: this.loadEndTime - this.loadStartTime,
            moduleLoadTimes: Object.fromEntries(this.moduleLoadTimes),
            isInitialized: this.isInitialized
        };
    }

    /**
     * Get dependency information
     * @returns {Object} Dependency information
     */
    getDependencyInfo() {
        const dependencies = {};
        const dependents = {};

        for (const [moduleName, deps] of this.dependencyGraph) {
            dependencies[moduleName] = Array.from(deps);
        }

        for (const [moduleName, deps] of this.reverseDependencyGraph) {
            dependents[moduleName] = Array.from(deps);
        }

        return { dependencies, dependents };
    }

    /**
     * Perform health check on all loaded modules
     * @returns {Object} Health check results
     */
    performHealthCheck() {
        const results = {
            timestamp: Date.now(),
            totalModules: this.modules.size,
            healthyModules: [],
            unhealthyModules: [],
            warnings: []
        };

        for (const [moduleName, moduleData] of this.modules) {
            const health = this._checkModuleHealth(moduleName, moduleData);

            if (health.healthy) {
                results.healthyModules.push({
                    name: moduleName,
                    status: 'healthy',
                    loadTime: moduleData.loadEndTime - moduleData.loadStartTime
                });
            } else {
                results.unhealthyModules.push({
                    name: moduleName,
                    status: health.status,
                    issues: health.issues,
                    error: moduleData.error
                });
            }

            if (health.warnings.length > 0) {
                results.warnings.push({
                    module: moduleName,
                    warnings: health.warnings
                });
            }
        }

        results.healthScore = this.modules.size > 0
            ? (results.healthyModules.length / this.modules.size) * 100
            : 0;

        return results;
    }

    /**
     * Check health of a specific module
     * @private
     */
    _checkModuleHealth(moduleName, moduleData) {
        const health = {
            healthy: true,
            status: 'unknown',
            issues: [],
            warnings: []
        };

        // Check if module is loaded
        if (!moduleData.isLoaded) {
            health.healthy = false;
            health.status = 'not_loaded';

            if (moduleData.isLoading) {
                health.issues.push('Module is still loading');
            } else if (moduleData.error) {
                health.issues.push(`Module failed to load: ${moduleData.error}`);
            } else {
                health.issues.push('Module not loaded');
            }

            return health;
        }

        // Check instance validity
        if (!moduleData.instance) {
            health.healthy = false;
            health.status = 'invalid_instance';
            health.issues.push('Module instance is null/undefined');
            return health;
        }

        // Check for critical methods
        if (typeof moduleData.instance.update === 'function') {
            // Module has update method - good sign
            health.warnings.push('Has update method');
        }

        // Check dependencies
        for (const depName of moduleData.dependencies) {
            const depModule = this.modules.get(depName);
            if (!depModule || !depModule.isLoaded) {
                health.healthy = false;
                health.status = 'dependency_failure';
                health.issues.push(`Dependency '${depName}' is not loaded`);
            }
        }

        // Check load time
        const loadTime = moduleData.loadEndTime - moduleData.loadStartTime;
        if (loadTime > 5000) {
            health.warnings.push(`Slow load time: ${loadTime.toFixed(2)}ms`);
        }

        // Check retry count
        if (moduleData.retryCount > 0) {
            health.warnings.push(`Required ${moduleData.retryCount} retries to load`);
        }

        if (health.healthy) {
            health.status = 'healthy';
        }

        return health;
    }

    // Private methods

    async _loadModule(moduleName) {
        const moduleData = this.modules.get(moduleName);

        if (moduleData.isLoaded) {
            return moduleData.instance;
        }

        if (moduleData.isLoading) {
            // Wait for ongoing load to complete with timeout
            return this._waitForModuleLoad(moduleName, moduleData);
        }

        moduleData.isLoading = true;
        moduleData.loadStartTime = performance.now();
        moduleData.error = null;

        try {
            // Load module with timeout protection
            const instance = await this._loadModuleWithTimeout(moduleName, moduleData);

            // Validate instance before marking as loaded
            if (!this._validateModuleInstance(instance, moduleName)) {
                throw new Error(`Module '${moduleName}' validation failed: invalid instance`);
            }

            moduleData.instance = instance;
            moduleData.isLoaded = true;
            moduleData.isLoading = false;
            moduleData.loadEndTime = performance.now();

            const loadTime = moduleData.loadEndTime - moduleData.loadStartTime;
            this.moduleLoadTimes.set(moduleName, loadTime);
            this.loadedCount++;

            if (this._eventManager) {
                this._eventManager.emit('moduleManager:moduleLoaded', {
                    moduleName,
                    loadTime,
                    timestamp: Date.now()
                });
            }

            return instance;

        } catch (error) {
            moduleData.isLoading = false;
            moduleData.error = error.message;
            moduleData.lastError = error;
            moduleData.retryCount++;

            this.failedModules.add(moduleName);

            if (this._eventManager) {
                this._eventManager.emit('moduleManager:moduleLoadFailed', {
                    moduleName,
                    error: error.message,
                    retryCount: moduleData.retryCount,
                    timestamp: Date.now()
                });
            }

            // Retry if configured with exponential backoff
            if (moduleData.retryCount < this.config.retryAttempts) {
                const retryDelay = this._calculateRetryDelay(moduleData.retryCount);
                console.warn(`Retrying module '${moduleName}' in ${retryDelay}ms (attempt ${moduleData.retryCount + 1})`);

                await this._delay(retryDelay);
                return await this._loadModule(moduleName);
            }

            throw new Error(`Failed to load module '${moduleName}' after ${moduleData.retryCount} attempts: ${error.message}`);
        }
    }

    /**
     * Load module with timeout protection
     * @private
     */
    async _loadModuleWithTimeout(moduleName, moduleData) {
        const timeoutMs = moduleData.timeoutMs;

        return Promise.race([
            this._executeModuleLoad(moduleName, moduleData),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Module '${moduleName}' initialization timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]);
    }

    /**
     * Execute the actual module loading logic
     * @private
     */
    async _executeModuleLoad(moduleName, moduleData) {
        // Load dependencies first
        const dependencyInstances = {};
        for (const depName of moduleData.dependencies) {
            const depInstance = await this._loadModule(depName);
            if (!depInstance) {
                throw new Error(`Failed to load dependency '${depName}' for module '${moduleName}'`);
            }
            dependencyInstances[depName] = depInstance;
        }

        // Validate core systems before module creation
        this._validateCoreystems(moduleName);

        // Create module context for dependency injection
        const context = {
            eventManager: this._eventManager,
            gameState: this._gameState,
            timeManager: this._timeManager,
            gameLoop: this._gameLoop,
            dependencies: dependencyInstances,
            config: moduleData.config
        };

        // Create module instance with timeout
        let instance;
        try {
            instance = await moduleData.factory(context);
        } catch (error) {
            throw new Error(`Module '${moduleName}' factory failed: ${error.message}`);
        }

        if (!instance) {
            throw new Error(`Module '${moduleName}' factory returned null/undefined`);
        }

        // Initialize module if it has an init method
        if (typeof instance.init === 'function') {
            try {
                await instance.init();
            } catch (error) {
                throw new Error(`Module '${moduleName}' init() failed: ${error.message}`);
            }
        }

        return instance;
    }

    /**
     * Wait for ongoing module load with timeout
     * @private
     */
    async _waitForModuleLoad(moduleName, moduleData) {
        const startWait = performance.now();
        const maxWaitTime = moduleData.timeoutMs;

        return new Promise((resolve, reject) => {
            const checkLoaded = () => {
                const waitTime = performance.now() - startWait;

                if (moduleData.isLoaded) {
                    resolve(moduleData.instance);
                } else if (moduleData.error) {
                    reject(new Error(moduleData.error));
                } else if (waitTime >= maxWaitTime) {
                    reject(new Error(`Timeout waiting for module '${moduleName}' to load`));
                } else {
                    setTimeout(checkLoaded, 100);
                }
            };
            setTimeout(checkLoaded, 100);
        });
    }

    /**
     * Validate module instance
     * @private
     */
    _validateModuleInstance(instance, moduleName) {
        if (!instance) {
            console.error(`Module '${moduleName}' instance is null/undefined`);
            return false;
        }

        // Check for required interface methods (optional but recommended)
        if (instance.init && typeof instance.init !== 'function') {
            console.error(`Module '${moduleName}' has invalid init property`);
            return false;
        }

        if (instance.update && typeof instance.update !== 'function') {
            console.error(`Module '${moduleName}' has invalid update property`);
            return false;
        }

        return true;
    }

    /**
     * Validate core systems are available
     * @private
     */
    _validateCoreystems(moduleName) {
        const missing = [];

        if (!this._eventManager) missing.push('EventManager');
        if (!this._gameState) missing.push('GameState');
        if (!this._timeManager) missing.push('TimeManager');
        if (!this._gameLoop) missing.push('GameLoop');

        if (missing.length > 0) {
            throw new Error(`Module '${moduleName}' cannot load: missing core systems: ${missing.join(', ')}`);
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     * @private
     */
    _calculateRetryDelay(retryCount) {
        const delay = this.config.retryDelayMs * Math.pow(2, retryCount - 1);
        return Math.min(delay, this.config.maxRetryDelayMs);
    }

    /**
     * Delay helper for retry logic
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _buildDependencyGraph(moduleName, dependencies) {
        this.dependencyGraph.set(moduleName, new Set(dependencies));

        // Build reverse dependency graph
        for (const depName of dependencies) {
            if (!this.reverseDependencyGraph.has(depName)) {
                this.reverseDependencyGraph.set(depName, new Set());
            }
            this.reverseDependencyGraph.get(depName).add(moduleName);
        }
    }

    _validateDependencies() {
        // Check for circular dependencies
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycle = (moduleName) => {
            if (recursionStack.has(moduleName)) {
                return true;
            }
            if (visited.has(moduleName)) {
                return false;
            }

            visited.add(moduleName);
            recursionStack.add(moduleName);

            const dependencies = this.dependencyGraph.get(moduleName);
            if (dependencies) {
                for (const dep of dependencies) {
                    if (hasCycle(dep)) {
                        return true;
                    }
                }
            }

            recursionStack.delete(moduleName);
            return false;
        };

        for (const moduleName of this.modules.keys()) {
            if (hasCycle(moduleName)) {
                throw new Error(`Circular dependency detected involving module '${moduleName}'`);
            }
        }

        // Check for missing dependencies
        for (const [moduleName, dependencies] of this.dependencyGraph) {
            for (const depName of dependencies) {
                if (!this.modules.has(depName)) {
                    throw new Error(`Module '${moduleName}' depends on missing module '${depName}'`);
                }
            }
        }
    }

    _getLoadOrder() {
        const order = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (moduleName) => {
            if (visiting.has(moduleName)) {
                throw new Error(`Circular dependency detected at module '${moduleName}'`);
            }
            if (visited.has(moduleName)) {
                return;
            }

            visiting.add(moduleName);

            const dependencies = this.dependencyGraph.get(moduleName);
            if (dependencies) {
                for (const dep of dependencies) {
                    visit(dep);
                }
            }

            visiting.delete(moduleName);
            visited.add(moduleName);
            order.push(moduleName);
        };

        // Sort modules by priority first
        const moduleNames = Array.from(this.modules.keys()).sort((a, b) => {
            const priorityA = this.modules.get(a).priority;
            const priorityB = this.modules.get(b).priority;
            return priorityB - priorityA; // Higher priority first
        });

        for (const moduleName of moduleNames) {
            visit(moduleName);
        }

        return order;
    }

    _getDependents(moduleName) {
        const dependents = new Set();
        const toVisit = [moduleName];

        while (toVisit.length > 0) {
            const current = toVisit.pop();
            const currentDependents = this.reverseDependencyGraph.get(current);

            if (currentDependents) {
                for (const dependent of currentDependents) {
                    if (!dependents.has(dependent)) {
                        dependents.add(dependent);
                        toVisit.push(dependent);
                    }
                }
            }
        }

        return Array.from(dependents);
    }
}

// Create singleton instance
const moduleManager = new ModuleManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModuleManager, moduleManager };
} else if (typeof window !== 'undefined') {
    window.ModuleManager = ModuleManager;
    window.moduleManager = moduleManager;
}