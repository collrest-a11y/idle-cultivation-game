/**
 * ProgressiveLoader - Manages phased loading of game modules
 * Ensures critical systems load first, followed by UI, then enhancements
 */
class ProgressiveLoader {
    constructor() {
        // Loading phases
        this.PHASES = {
            CRITICAL: 'critical',    // Core game systems (GameState, SaveManager)
            UI: 'ui',                // UI systems for user feedback
            ENHANCEMENT: 'enhancement' // Optional enhancement modules
        };

        // Current loading state
        this.currentPhase = null;
        this.totalPhases = Object.keys(this.PHASES).length;
        this.completedPhases = 0;
        this.isLoading = false;
        this.loadStartTime = 0;
        this.phaseStartTime = 0;

        // Phase configuration
        this.phaseConfig = {
            [this.PHASES.CRITICAL]: {
                name: 'Critical Systems',
                description: 'Loading core game systems...',
                modules: [],
                required: true,
                timeout: 10000 // 10 seconds
            },
            [this.PHASES.UI]: {
                name: 'User Interface',
                description: 'Loading UI systems...',
                modules: [],
                required: true,
                timeout: 8000 // 8 seconds
            },
            [this.PHASES.ENHANCEMENT]: {
                name: 'Enhancements',
                description: 'Loading enhancement modules...',
                modules: [],
                required: false, // Optional - game can run without these
                timeout: 15000 // 15 seconds
            }
        };

        // Loading statistics
        this.stats = {
            totalModules: 0,
            loadedModules: 0,
            failedModules: 0,
            phaseResults: {}
        };

        // Event callbacks
        this.callbacks = {
            onPhaseStart: null,
            onPhaseComplete: null,
            onModuleLoaded: null,
            onModuleFailed: null,
            onComplete: null,
            onError: null
        };

        // References to core systems
        this.moduleManager = null;
        this.eventManager = null;
    }

    /**
     * Initialize the progressive loader
     * @param {Object} systems - Core system references
     */
    initialize(systems) {
        this.moduleManager = systems.moduleManager;
        this.eventManager = systems.eventManager;

        if (!this.moduleManager) {
            throw new Error('ModuleManager is required for ProgressiveLoader');
        }
    }

    /**
     * Set event callbacks
     * @param {Object} callbacks - Event callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Classify a module into a loading phase based on priority
     * @param {string} moduleName - Module name
     * @param {number} priority - Module priority
     * @returns {string} Phase name
     */
    classifyModule(moduleName, priority) {
        // Priority ranges:
        // 90-100: Critical systems
        // 70-89: UI systems
        // 0-69: Enhancement modules

        if (priority >= 90) {
            return this.PHASES.CRITICAL;
        } else if (priority >= 70) {
            return this.PHASES.UI;
        } else {
            return this.PHASES.ENHANCEMENT;
        }
    }

    /**
     * Organize modules into phases
     * @param {Map} modules - Map of module definitions from ModuleManager
     */
    organizeModules(modules) {
        // Reset phase modules
        Object.keys(this.phaseConfig).forEach(phase => {
            this.phaseConfig[phase].modules = [];
        });

        // Classify each module into a phase
        for (const [moduleName, moduleData] of modules.entries()) {
            // Handle both direct priority and config.priority
            const priority = moduleData.priority || (moduleData.config && moduleData.config.priority) || 50;
            const phase = this.classifyModule(moduleName, priority);
            this.phaseConfig[phase].modules.push(moduleName);
        }

        // Count total modules
        this.stats.totalModules = modules.size;

        // Emit organization complete event
        if (this.eventManager) {
            this.eventManager.emit('progressiveLoader:organized', {
                phases: this.phaseConfig,
                totalModules: this.stats.totalModules
            });
        }
    }

    /**
     * Load all modules in phases
     * @returns {Promise<Object>} Loading results
     */
    async loadAllPhases() {
        if (this.isLoading) {
            throw new Error('Loading is already in progress');
        }

        this.isLoading = true;
        this.loadStartTime = performance.now();
        this.completedPhases = 0;
        this.stats.loadedModules = 0;
        this.stats.failedModules = 0;
        this.stats.phaseResults = {};

        try {
            // Get modules from ModuleManager and organize them
            this.organizeModules(this.moduleManager.modules);

            // Load each phase in sequence
            for (const phaseName of Object.keys(this.PHASES)) {
                await this._loadPhase(phaseName);
            }

            // All phases complete
            const totalTime = performance.now() - this.loadStartTime;
            const results = {
                success: true,
                totalTime,
                totalModules: this.stats.totalModules,
                loadedModules: this.stats.loadedModules,
                failedModules: this.stats.failedModules,
                phaseResults: this.stats.phaseResults
            };

            if (this.callbacks.onComplete) {
                this.callbacks.onComplete(results);
            }

            if (this.eventManager) {
                this.eventManager.emit('progressiveLoader:complete', results);
            }

            this.isLoading = false;
            return results;

        } catch (error) {
            this.isLoading = false;

            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }

            if (this.eventManager) {
                this.eventManager.emit('progressiveLoader:error', {
                    error: error.message,
                    phase: this.currentPhase
                });
            }

            throw error;
        }
    }

    /**
     * Load a specific phase
     * @param {string} phaseName - Phase name
     * @returns {Promise<Object>} Phase results
     */
    async _loadPhase(phaseName) {
        const phaseConfig = this.phaseConfig[phaseName];

        // Check if phase config exists
        if (!phaseConfig) {
            console.warn(`ProgressiveLoader: Phase "${phaseName}" not found in configuration`);
            return {
                phase: phaseName,
                success: false,
                error: `Phase configuration not found for: ${phaseName}`,
                modules: []
            };
        }

        this.currentPhase = phaseName;
        this.phaseStartTime = performance.now();

        // Emit phase start event
        if (this.callbacks.onPhaseStart) {
            this.callbacks.onPhaseStart({
                phase: phaseName,
                name: phaseConfig.name || phaseName,
                description: phaseConfig.description || '',
                moduleCount: phaseConfig.modules ? phaseConfig.modules.length : 0,
                progress: this.completedPhases / this.totalPhases
            });
        }

        if (this.eventManager) {
            this.eventManager.emit('progressiveLoader:phaseStart', {
                phase: phaseName,
                config: phaseConfig,
                progress: this.completedPhases / this.totalPhases
            });
        }

        const phaseResults = {
            phase: phaseName,
            loaded: [],
            failed: [],
            startTime: this.phaseStartTime,
            endTime: 0,
            duration: 0,
            modules: phaseConfig.modules || []
        };

        try {
            // Load modules in this phase with timeout
            if (phaseConfig.modules && phaseConfig.modules.length > 0) {
                await this._loadPhaseModules(phaseConfig, phaseResults);
            } else {
                console.warn(`ProgressiveLoader: Phase "${phaseName}" has no modules to load`);
            }

            phaseResults.endTime = performance.now();
            phaseResults.duration = phaseResults.endTime - phaseResults.startTime;

            // Check if required phase has failures
            if (phaseConfig.required && phaseResults.failed.length > 0) {
                throw new Error(`Required phase '${phaseName}' had ${phaseResults.failed.length} failed modules: ${phaseResults.failed.join(', ')}`);
            }

            // Phase complete
            this.completedPhases++;
            this.stats.phaseResults[phaseName] = phaseResults;

            if (this.callbacks.onPhaseComplete) {
                this.callbacks.onPhaseComplete({
                    phase: phaseName,
                    results: phaseResults,
                    progress: this.completedPhases / this.totalPhases
                });
            }

            if (this.eventManager) {
                this.eventManager.emit('progressiveLoader:phaseComplete', {
                    phase: phaseName,
                    results: phaseResults,
                    progress: this.completedPhases / this.totalPhases
                });
            }

            return phaseResults;

        } catch (error) {
            phaseResults.endTime = performance.now();
            phaseResults.duration = phaseResults.endTime - phaseResults.startTime;
            phaseResults.error = error.message;

            this.stats.phaseResults[phaseName] = phaseResults;

            // If this is a required phase, throw error
            if (phaseConfig.required) {
                throw new Error(`Required phase '${phaseName}' failed: ${error.message}`);
            }

            // Optional phase - log warning but continue
            console.warn(`Optional phase '${phaseName}' failed:`, error);
            this.completedPhases++;

            return phaseResults;
        }
    }

    /**
     * Load modules for a specific phase
     * @param {Object} phaseConfig - Phase configuration
     * @param {Object} phaseResults - Phase results object to update
     * @returns {Promise<void>}
     */
    async _loadPhaseModules(phaseConfig, phaseResults) {
        const loadPromises = phaseConfig.modules.map(async (moduleName) => {
            try {
                // Load the module
                await this.moduleManager.loadModule(moduleName);

                // Module loaded successfully
                phaseResults.loaded.push(moduleName);
                this.stats.loadedModules++;

                if (this.callbacks.onModuleLoaded) {
                    this.callbacks.onModuleLoaded({
                        moduleName,
                        phase: this.currentPhase,
                        progress: this.stats.loadedModules / this.stats.totalModules
                    });
                }

                if (this.eventManager) {
                    this.eventManager.emit('progressiveLoader:moduleLoaded', {
                        moduleName,
                        phase: this.currentPhase,
                        progress: this.stats.loadedModules / this.stats.totalModules
                    });
                }

            } catch (error) {
                // Module failed to load
                phaseResults.failed.push(moduleName);
                this.stats.failedModules++;

                console.error(`Module '${moduleName}' failed to load in phase '${this.currentPhase}':`, error);

                if (this.callbacks.onModuleFailed) {
                    this.callbacks.onModuleFailed({
                        moduleName,
                        phase: this.currentPhase,
                        error: error.message,
                        required: phaseConfig.required
                    });
                }

                if (this.eventManager) {
                    this.eventManager.emit('progressiveLoader:moduleFailed', {
                        moduleName,
                        phase: this.currentPhase,
                        error: error.message,
                        required: phaseConfig.required
                    });
                }

                // If phase is required, re-throw the error
                if (phaseConfig.required) {
                    throw error;
                }
            }
        });

        // Wait for all modules in phase to complete (or fail) with timeout
        await Promise.race([
            Promise.all(loadPromises),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Phase '${this.currentPhase}' timed out after ${phaseConfig.timeout}ms`));
                }, phaseConfig.timeout);
            })
        ]);
    }

    /**
     * Get current loading progress
     * @returns {Object} Progress information
     */
    getProgress() {
        return {
            isLoading: this.isLoading,
            currentPhase: this.currentPhase,
            completedPhases: this.completedPhases,
            totalPhases: this.totalPhases,
            phaseProgress: this.completedPhases / this.totalPhases,
            moduleProgress: this.stats.totalModules > 0
                ? this.stats.loadedModules / this.stats.totalModules
                : 0,
            loadedModules: this.stats.loadedModules,
            failedModules: this.stats.failedModules,
            totalModules: this.stats.totalModules,
            elapsedTime: this.isLoading ? performance.now() - this.loadStartTime : 0
        };
    }

    /**
     * Get loading statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            phaseConfig: this.phaseConfig,
            progress: this.getProgress()
        };
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressiveLoader };
} else if (typeof window !== 'undefined') {
    window.ProgressiveLoader = ProgressiveLoader;
}