/**
 * ModuleValidator.js - Runtime module validation system
 * Validates modules before loading to prevent initialization errors
 */

class ModuleValidator {
    constructor() {
        this.validationCache = new Map();
        this.validationRules = {
            structure: true,
            dependencies: true,
            exports: true,
            performance: true,
            security: true
        };
        this.stats = {
            validated: 0,
            failed: 0,
            cached: 0,
            errors: []
        };
    }

    /**
     * Validate a module before loading
     * @param {Object} moduleConfig - Module configuration
     * @returns {Object} Validation result
     */
    async validate(moduleConfig) {
        const startTime = performance.now();

        // Check cache first
        const cacheKey = this.getCacheKey(moduleConfig);
        if (this.validationCache.has(cacheKey)) {
            this.stats.cached++;
            return this.validationCache.get(cacheKey);
        }

        const result = {
            valid: true,
            errors: [],
            warnings: [],
            performance: {},
            timestamp: Date.now()
        };

        try {
            // Run validation checks
            if (this.validationRules.structure) {
                this.validateStructure(moduleConfig, result);
            }

            if (this.validationRules.dependencies) {
                await this.validateDependencies(moduleConfig, result);
            }

            if (this.validationRules.exports) {
                this.validateExports(moduleConfig, result);
            }

            if (this.validationRules.performance) {
                this.validatePerformance(moduleConfig, result);
            }

            if (this.validationRules.security) {
                this.validateSecurity(moduleConfig, result);
            }

            // Set final validity
            result.valid = result.errors.length === 0;
            result.performance.validationTime = performance.now() - startTime;

            // Update stats
            if (result.valid) {
                this.stats.validated++;
            } else {
                this.stats.failed++;
                this.stats.errors.push(...result.errors);
            }

            // Cache result
            this.validationCache.set(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Module validation error:', error);
            result.valid = false;
            result.errors.push({
                type: 'VALIDATION_ERROR',
                message: error.message,
                critical: true
            });
            return result;
        }
    }

    /**
     * Validate module structure
     */
    validateStructure(config, result) {
        // Check required properties
        if (!config.name) {
            result.errors.push({
                type: 'STRUCTURE_ERROR',
                message: 'Module name is required',
                critical: true
            });
        }

        if (!config.path && !config.factory) {
            result.errors.push({
                type: 'STRUCTURE_ERROR',
                message: 'Module must have either path or factory',
                critical: true
            });
        }

        // Validate module type
        const validTypes = ['core', 'ui', 'system', 'utility', 'feature'];
        if (config.type && !validTypes.includes(config.type)) {
            result.warnings.push({
                type: 'STRUCTURE_WARNING',
                message: `Unknown module type: ${config.type}`
            });
        }

        // Check for circular self-reference
        if (config.dependencies?.includes(config.name)) {
            result.errors.push({
                type: 'STRUCTURE_ERROR',
                message: 'Module cannot depend on itself',
                critical: true
            });
        }
    }

    /**
     * Validate module dependencies
     */
    async validateDependencies(config, result) {
        if (!config.dependencies || config.dependencies.length === 0) {
            return;
        }

        const missingDeps = [];
        const circularDeps = [];

        for (const dep of config.dependencies) {
            // Check if dependency exists
            if (!this.moduleExists(dep)) {
                missingDeps.push(dep);
            }

            // Check for circular dependencies
            if (this.hasCircularDependency(config.name, dep)) {
                circularDeps.push(dep);
            }
        }

        if (missingDeps.length > 0) {
            result.errors.push({
                type: 'DEPENDENCY_ERROR',
                message: `Missing dependencies: ${missingDeps.join(', ')}`,
                dependencies: missingDeps,
                critical: true
            });
        }

        if (circularDeps.length > 0) {
            result.errors.push({
                type: 'CIRCULAR_DEPENDENCY',
                message: `Circular dependencies detected: ${circularDeps.join(', ')}`,
                dependencies: circularDeps,
                critical: true
            });
        }
    }

    /**
     * Validate module exports
     */
    validateExports(config, result) {
        if (config.exports) {
            const requiredExports = config.requiredExports || [];

            for (const exportName of requiredExports) {
                if (!config.exports.includes(exportName)) {
                    result.errors.push({
                        type: 'EXPORT_ERROR',
                        message: `Missing required export: ${exportName}`,
                        critical: false
                    });
                }
            }
        }

        // Check for factory function
        if (config.factory && typeof config.factory !== 'function') {
            result.errors.push({
                type: 'EXPORT_ERROR',
                message: 'Factory must be a function',
                critical: true
            });
        }
    }

    /**
     * Validate performance constraints
     */
    validatePerformance(config, result) {
        const limits = {
            maxInitTime: 100, // ms
            maxMemory: 5 * 1024 * 1024, // 5MB
            maxDependencies: 10
        };

        if (config.dependencies?.length > limits.maxDependencies) {
            result.warnings.push({
                type: 'PERFORMANCE_WARNING',
                message: `Module has ${config.dependencies.length} dependencies (max recommended: ${limits.maxDependencies})`
            });
        }

        if (config.estimatedSize > limits.maxMemory) {
            result.warnings.push({
                type: 'PERFORMANCE_WARNING',
                message: `Module size exceeds recommended limit: ${(config.estimatedSize / 1024 / 1024).toFixed(2)}MB`
            });
        }

        result.performance.dependencyCount = config.dependencies?.length || 0;
        result.performance.estimatedSize = config.estimatedSize || 0;
    }

    /**
     * Validate security concerns
     */
    validateSecurity(config, result) {
        // Check for dangerous patterns
        const dangerousPatterns = [
            /eval\s*\(/,
            /new\s+Function\s*\(/,
            /innerHTML\s*=/,
            /document\.write/,
            /\.constructor\s*\(/
        ];

        if (config.sourceCode) {
            for (const pattern of dangerousPatterns) {
                if (pattern.test(config.sourceCode)) {
                    result.warnings.push({
                        type: 'SECURITY_WARNING',
                        message: `Potentially dangerous pattern detected: ${pattern.source}`,
                        pattern: pattern.source
                    });
                }
            }
        }

        // Check for external script loading
        if (config.loadsExternalScripts) {
            result.warnings.push({
                type: 'SECURITY_WARNING',
                message: 'Module loads external scripts'
            });
        }
    }

    /**
     * Check if a module exists
     */
    moduleExists(moduleName) {
        // Check with ModuleManager or file system
        if (window.game?.moduleManager) {
            return window.game.moduleManager.hasModule(moduleName);
        }
        return true; // Assume exists if we can't check
    }

    /**
     * Check for circular dependencies
     */
    hasCircularDependency(moduleA, moduleB, visited = new Set()) {
        if (visited.has(moduleA)) {
            return true;
        }

        visited.add(moduleA);

        // Get dependencies of moduleB
        const deps = this.getModuleDependencies(moduleB);
        if (deps.includes(moduleA)) {
            return true;
        }

        // Recursively check dependencies
        for (const dep of deps) {
            if (this.hasCircularDependency(moduleA, dep, visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get module dependencies
     */
    getModuleDependencies(moduleName) {
        if (window.game?.moduleManager) {
            const module = window.game.moduleManager.getModule(moduleName);
            return module?.dependencies || [];
        }
        return [];
    }

    /**
     * Generate cache key for module config
     */
    getCacheKey(config) {
        return `${config.name}_${config.version || '1.0.0'}_${config.dependencies?.join(',') || 'nodeps'}`;
    }

    /**
     * Clear validation cache
     */
    clearCache() {
        this.validationCache.clear();
        console.log('Module validation cache cleared');
    }

    /**
     * Get validation statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.validationCache.size,
            cacheHitRate: this.stats.cached / (this.stats.validated + this.stats.failed + this.stats.cached)
        };
    }

    /**
     * Create fallback module for failed validation
     */
    createFallbackModule(config) {
        console.warn(`Creating fallback module for ${config.name}`);

        return {
            name: config.name,
            factory: () => {
                console.warn(`Fallback module loaded: ${config.name}`);
                return {
                    initialize: () => {
                        console.log(`Fallback ${config.name} initialized`);
                    },
                    isEnabled: () => false,
                    isFallback: true
                };
            },
            dependencies: [],
            isFallback: true
        };
    }

    /**
     * Validate and repair module config
     */
    async validateAndRepair(config) {
        const result = await this.validate(config);

        if (!result.valid) {
            console.warn(`Module ${config.name} validation failed, attempting repair`);

            // Try to repair common issues
            if (!config.dependencies) {
                config.dependencies = [];
            }

            // Remove circular dependencies
            const circularErrors = result.errors.filter(e => e.type === 'CIRCULAR_DEPENDENCY');
            if (circularErrors.length > 0) {
                const badDeps = circularErrors.flatMap(e => e.dependencies);
                config.dependencies = config.dependencies.filter(d => !badDeps.includes(d));
            }

            // Re-validate after repair
            const revalidated = await this.validate(config);
            if (revalidated.valid) {
                console.log(`Module ${config.name} successfully repaired`);
                return config;
            }

            // If still invalid, return fallback
            return this.createFallbackModule(config);
        }

        return config;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModuleValidator;
} else {
    window.ModuleValidator = ModuleValidator;
}