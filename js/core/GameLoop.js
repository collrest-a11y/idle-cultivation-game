/**
 * GameLoop - Main game loop with configurable tick rates for different systems
 * Handles UI updates (60fps) and game logic updates (1-10fps) separately
 * Integrated with performance monitoring and adaptive optimization
 */
class GameLoop {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.animationFrameId = null;

        // Tick rates (times per second)
        this.uiTickRate = 60; // UI updates at 60fps
        this.gameTickRate = 10; // Game logic at 10fps (configurable)
        this.saveTickRate = 0.033; // Auto-save every 30 seconds

        // Adaptive performance settings
        this.adaptivePerformance = {
            enabled: true,
            targetFPS: 60,
            minFPS: 30,
            adaptiveGameTickRate: true,
            lowPowerMode: false,
            lastAdaptation: 0,
            adaptationCooldown: 5000 // 5 seconds between adaptations
        };

        // Timing
        this.lastFrameTime = 0;
        this.lastGameTick = 0;
        this.lastSaveTick = 0;

        // Performance tracking (enhanced)
        this.frameCount = 0;
        this.gameTickCount = 0;
        this.totalFrameTime = 0;
        this.totalGameTime = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 0;
        this._lastFrameCountForFps = 0;

        // Performance monitoring integration
        this.performanceMonitor = null;
        this.enableProfiling = false;

        // System references (will be injected)
        this._eventManager = null;
        this._timeManager = null;
        this._gameState = null;

        // Registered systems with priorities
        this._uiSystems = new Map(); // Systems that update every frame
        this._gameSystems = new Map(); // Systems that update at game tick rate
        this._saveSystems = new Set(); // Systems that handle saving

        // System execution optimization
        this._systemExecutionOrder = [];
        this._batchedUpdates = new Map();
        this._updateQueue = [];

        // Error handling
        this._errorCount = 0;
        this._maxErrors = 10;
        this._errorResetTime = 60000; // Reset error count after 1 minute
        this._lastErrorReset = Date.now();

        // Performance optimization flags
        this._skipFrames = 0;
        this._frameSkipThreshold = 3;
        this._backgroundThrottling = false;
    }

    /**
     * Set the core systems for the game loop
     * @param {EventManager} eventManager - Event manager instance
     * @param {TimeManager} timeManager - Time manager instance
     * @param {GameState} gameState - Game state instance
     */
    setCoreystems(eventManager, timeManager, gameState) {
        this._eventManager = eventManager;
        this._timeManager = timeManager;
        this._gameState = gameState;

        // Initialize performance monitor if available
        if (typeof PerformanceMonitor !== 'undefined') {
            this.performanceMonitor = new PerformanceMonitor();
            this.performanceMonitor.initialize({
                enableDetailedProfiling: this.enableProfiling,
                warningThresholds: {
                    fps: this.adaptivePerformance.minFPS,
                    memoryMB: 150,
                    calculationTimeMs: 16,
                    renderTimeMs: 8
                }
            }, eventManager);

            console.log('GameLoop: Performance monitor initialized');
        }

        // Set up performance event listeners
        this._setupPerformanceListeners();
    }

    /**
     * Register a system for UI updates (60fps)
     * @param {Object} system - System object with update method
     * @param {Function} system.update - Update function that receives deltaTime
     * @param {string} system.name - System name for debugging
     * @param {number} priority - System priority (higher = earlier execution)
     */
    registerUISystem(system, priority = 0) {
        if (!system || typeof system.update !== 'function') {
            throw new Error('UI system must have an update method');
        }

        const systemData = { system, priority, type: 'ui' };
        this._uiSystems.set(system.name || `ui_system_${this._uiSystems.size}`, systemData);
        this._updateSystemExecutionOrder();

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:systemRegistered', {
                type: 'ui',
                system: system.name || 'unnamed',
                priority,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Register a system for game logic updates (configurable fps)
     * @param {Object} system - System object with update method
     * @param {Function} system.update - Update function that receives deltaTime
     * @param {string} system.name - System name for debugging
     * @param {number} priority - System priority (higher = earlier execution)
     */
    registerGameSystem(system, priority = 0) {
        if (!system || typeof system.update !== 'function') {
            throw new Error('Game system must have an update method');
        }

        const systemData = { system, priority, type: 'game' };
        this._gameSystems.set(system.name || `game_system_${this._gameSystems.size}`, systemData);
        this._updateSystemExecutionOrder();

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:systemRegistered', {
                type: 'game',
                system: system.name || 'unnamed',
                priority,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Register a system for save operations
     * @param {Object} system - System object with save method
     * @param {Function} system.save - Save function
     * @param {string} system.name - System name for debugging
     */
    registerSaveSystem(system) {
        if (!system || typeof system.save !== 'function') {
            throw new Error('Save system must have a save method');
        }
        this._saveSystems.add(system);

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:systemRegistered', {
                type: 'save',
                system: system.name || 'unnamed',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Unregister a system
     * @param {Object} system - System to unregister
     */
    unregisterSystem(system) {
        const wasUI = this._uiSystems.delete(system);
        const wasGame = this._gameSystems.delete(system);
        const wasSave = this._saveSystems.delete(system);

        if ((wasUI || wasGame || wasSave) && this._eventManager) {
            this._eventManager.emit('gameLoop:systemUnregistered', {
                system: system.name || 'unnamed',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('GameLoop: Already running');
            return;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
        this.lastGameTick = this.lastFrameTime;
        this.lastSaveTick = this.lastFrameTime;

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:started', { timestamp: Date.now() });
        }

        this._loop();
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (!this.isRunning) {
            console.warn('GameLoop: Not running');
            return;
        }

        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:stopped', { timestamp: Date.now() });
        }
    }

    /**
     * Pause or unpause the game loop
     * @param {boolean} paused - Whether to pause
     */
    setPaused(paused) {
        if (this.isPaused === paused) return;

        this.isPaused = paused;

        if (this._timeManager) {
            this._timeManager.setPaused(paused);
        }

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:pauseChanged', {
                isPaused: paused,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Set the game tick rate
     * @param {number} tickRate - Ticks per second for game logic
     */
    setGameTickRate(tickRate) {
        if (typeof tickRate !== 'number' || tickRate <= 0 || tickRate > 60) {
            throw new Error('Game tick rate must be a number between 0 and 60');
        }

        const oldRate = this.gameTickRate;
        this.gameTickRate = tickRate;

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:tickRateChanged', {
                oldRate,
                newRate: tickRate,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance data
     */
    getPerformanceMetrics() {
        return {
            fps: this.currentFps,
            frameCount: this.frameCount,
            gameTickCount: this.gameTickCount,
            averageFrameTime: this.frameCount > 0 ? this.totalFrameTime / this.frameCount : 0,
            averageGameTime: this.gameTickCount > 0 ? this.totalGameTime / this.gameTickCount : 0,
            uiSystemCount: this._uiSystems.size,
            gameSystemCount: this._gameSystems.size,
            saveSystemCount: this._saveSystems.size,
            errorCount: this._errorCount,
            isRunning: this.isRunning,
            isPaused: this.isPaused
        };
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
        this.frameCount = 0;
        this.gameTickCount = 0;
        this.totalFrameTime = 0;
        this.totalGameTime = 0;
        this.currentFps = 0;
        this.lastFpsUpdate = performance.now();
    }

    // Private methods

    _loop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const frameStartTime = currentTime;

        // Performance monitoring integration
        if (this.performanceMonitor) {
            this.performanceMonitor.startFrame();
        }

        try {
            // Check for adaptive performance adjustments
            if (this.adaptivePerformance.enabled) {
                this._checkAdaptivePerformance(currentTime);
            }

            // Update time manager
            let timeData = null;
            if (this._timeManager) {
                timeData = this.performanceMonitor ?
                    this.performanceMonitor.trackOperation('timeManager.update', () => this._timeManager.update()) :
                    this._timeManager.update();
            }

            // Calculate frame delta
            const frameDelta = currentTime - this.lastFrameTime;

            // Skip frame if performance is poor and background throttling is enabled
            if (this._shouldSkipFrame()) {
                this._skipFrames++;
                if (this._skipFrames <= this._frameSkipThreshold) {
                    this._scheduleNextFrame();
                    return;
                }
                this._skipFrames = 0;
            }

            // Always update UI systems (for smooth animations even when game is paused)
            this._updateUISystems(frameDelta, timeData);

            // Update game systems at specified tick rate (only if not paused)
            if (!this.isPaused) {
                const gameTickInterval = 1000 / this.gameTickRate;
                if (currentTime - this.lastGameTick >= gameTickInterval) {
                    const gameTickDelta = currentTime - this.lastGameTick;
                    this._updateGameSystems(gameTickDelta, timeData);
                    this.lastGameTick = currentTime;
                }

                // Handle save systems with reduced frequency under load
                const saveTickInterval = this._backgroundThrottling ?
                    (1000 / this.saveTickRate) * 2 :
                    (1000 / this.saveTickRate);

                if (currentTime - this.lastSaveTick >= saveTickInterval) {
                    this._updateSaveSystems();
                    this.lastSaveTick = currentTime;
                }
            }

            // Update performance metrics
            this._updatePerformanceMetrics(currentTime, frameStartTime);

            this.lastFrameTime = currentTime;

        } catch (error) {
            this._handleError(error);
        } finally {
            // Complete performance monitoring for this frame
            if (this.performanceMonitor) {
                this.performanceMonitor.endFrame();
            }
        }

        // Schedule next frame
        this._scheduleNextFrame();
    }

    _updateUISystems(deltaTime, timeData) {
        // Use execution order for optimized system updates
        const uiSystems = this._getOrderedSystems('ui');

        for (const systemData of uiSystems) {
            const { system } = systemData;
            try {
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackOperation(`ui.${system.name || 'unnamed'}`, () => {
                        system.update(deltaTime, timeData);
                    });
                } else {
                    system.update(deltaTime, timeData);
                }
            } catch (error) {
                console.error(`GameLoop: Error in UI system '${system.name || 'unnamed'}':`, error);
                this._handleError(error, system);
            }
        }
    }

    _updateGameSystems(deltaTime, timeData) {
        const gameStartTime = performance.now();

        // Use execution order for optimized system updates
        const gameSystems = this._getOrderedSystems('game');

        for (const systemData of gameSystems) {
            const { system } = systemData;
            try {
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackOperation(`game.${system.name || 'unnamed'}`, () => {
                        system.update(deltaTime, timeData);
                    });
                } else {
                    system.update(deltaTime, timeData);
                }
            } catch (error) {
                console.error(`GameLoop: Error in game system '${system.name || 'unnamed'}':`, error);
                this._handleError(error, system);
            }
        }

        this.gameTickCount++;
        this.totalGameTime += performance.now() - gameStartTime;
    }

    _updateSaveSystems() {
        for (const system of this._saveSystems) {
            try {
                system.save();
            } catch (error) {
                console.error(`GameLoop: Error in save system '${system.name || 'unnamed'}':`, error);
                this._handleError(error, system);
            }
        }
    }

    _updatePerformanceMetrics(currentTime, frameStartTime) {
        this.frameCount++;
        this.totalFrameTime += currentTime - frameStartTime;

        // Update FPS every second
        if (currentTime - this.lastFpsUpdate >= 1000) {
            const timeElapsed = currentTime - this.lastFpsUpdate;
            this.currentFps = Math.round((this.frameCount - this._lastFrameCountForFps) / timeElapsed * 1000);
            this._lastFrameCountForFps = this.frameCount;
            this.lastFpsUpdate = currentTime;

            // Emit FPS update event
            if (this._eventManager) {
                this._eventManager.emit('gameLoop:fpsUpdate', {
                    fps: this.currentFps,
                    timestamp: Date.now()
                });
            }
        }
    }

    _handleError(error, system = null) {
        this._errorCount++;

        // Reset error count periodically
        const now = Date.now();
        if (now - this._lastErrorReset > this._errorResetTime) {
            this._errorCount = 1;
            this._lastErrorReset = now;
        }

        // Emit error event
        if (this._eventManager) {
            this._eventManager.emit('gameLoop:error', {
                error: error.message,
                system: system ? system.name || 'unnamed' : null,
                errorCount: this._errorCount,
                timestamp: now
            });
        }

        // Stop the loop if too many errors occur
        if (this._errorCount >= this._maxErrors) {
            console.error(`GameLoop: Too many errors (${this._errorCount}), stopping loop`);
            this.stop();

            if (this._eventManager) {
                this._eventManager.emit('gameLoop:criticalError', {
                    errorCount: this._errorCount,
                    timestamp: now
                });
            }
        }
    }

    /**
     * Set up performance event listeners
     */
    _setupPerformanceListeners() {
        if (!this._eventManager) return;

        // Listen for performance alerts to trigger adaptive behavior
        this._eventManager.on('performance:alert', (data) => {
            if (data.severity === 'critical') {
                this._enableEmergencyMode();
            } else if (data.severity === 'warning') {
                this._backgroundThrottling = true;
            }
        });

        // Listen for page visibility changes for background throttling
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this._backgroundThrottling = document.hidden;
            });
        }
    }

    /**
     * Update system execution order based on priorities
     */
    _updateSystemExecutionOrder() {
        // Combine UI and game systems for unified ordering
        const allSystems = [];

        for (const [name, systemData] of this._uiSystems) {
            allSystems.push({ name, ...systemData });
        }

        for (const [name, systemData] of this._gameSystems) {
            allSystems.push({ name, ...systemData });
        }

        // Sort by priority (higher first)
        allSystems.sort((a, b) => b.priority - a.priority);

        this._systemExecutionOrder = allSystems;
    }

    /**
     * Get ordered systems by type
     * @param {string} type - System type ('ui' or 'game')
     * @returns {Array} Ordered systems
     */
    _getOrderedSystems(type) {
        return this._systemExecutionOrder.filter(system => system.type === type);
    }

    /**
     * Check if frame should be skipped for performance
     * @returns {boolean} Whether to skip this frame
     */
    _shouldSkipFrame() {
        if (!this._backgroundThrottling) return false;

        // Skip frames if FPS is too low
        return this.currentFps < this.adaptivePerformance.minFPS;
    }

    /**
     * Schedule next frame with appropriate timing
     */
    _scheduleNextFrame() {
        if (this._backgroundThrottling || this.adaptivePerformance.lowPowerMode) {
            // Use setTimeout for background throttling to reduce CPU usage
            setTimeout(() => {
                this.animationFrameId = requestAnimationFrame(() => this._loop());
            }, 16); // ~60fps max when throttled
        } else {
            this.animationFrameId = requestAnimationFrame(() => this._loop());
        }
    }

    /**
     * Check and apply adaptive performance adjustments
     * @param {number} currentTime - Current timestamp
     */
    _checkAdaptivePerformance(currentTime) {
        const { lastAdaptation, adaptationCooldown } = this.adaptivePerformance;

        // Don't adapt too frequently
        if (currentTime - lastAdaptation < adaptationCooldown) {
            return;
        }

        // Check if performance adaptation is needed
        if (this.currentFps < this.adaptivePerformance.minFPS) {
            this._degradePerformance();
            this.adaptivePerformance.lastAdaptation = currentTime;
        } else if (this.currentFps > this.adaptivePerformance.targetFPS * 0.9) {
            this._improvePerformance();
            this.adaptivePerformance.lastAdaptation = currentTime;
        }
    }

    /**
     * Degrade performance settings to improve FPS
     */
    _degradePerformance() {
        // Reduce game tick rate if adaptive
        if (this.adaptivePerformance.adaptiveGameTickRate && this.gameTickRate > 5) {
            this.gameTickRate = Math.max(5, this.gameTickRate - 1);
            console.log(`GameLoop: Reduced game tick rate to ${this.gameTickRate} for performance`);
        }

        // Enable background throttling
        this._backgroundThrottling = true;

        // Enable low power mode for extreme cases
        if (this.currentFps < this.adaptivePerformance.minFPS * 0.5) {
            this.adaptivePerformance.lowPowerMode = true;
            console.log('GameLoop: Enabled low power mode');
        }

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:performanceDegraded', {
                gameTickRate: this.gameTickRate,
                backgroundThrottling: this._backgroundThrottling,
                lowPowerMode: this.adaptivePerformance.lowPowerMode,
                currentFps: this.currentFps
            });
        }
    }

    /**
     * Improve performance settings when FPS is good
     */
    _improvePerformance() {
        // Disable low power mode
        if (this.adaptivePerformance.lowPowerMode) {
            this.adaptivePerformance.lowPowerMode = false;
            console.log('GameLoop: Disabled low power mode');
        }

        // Disable background throttling if FPS is consistently good
        if (this._backgroundThrottling && this.currentFps > this.adaptivePerformance.targetFPS * 0.8) {
            this._backgroundThrottling = false;
        }

        // Increase game tick rate if adaptive and performance allows
        if (this.adaptivePerformance.adaptiveGameTickRate &&
            this.gameTickRate < 10 &&
            this.currentFps > this.adaptivePerformance.targetFPS * 0.9) {
            this.gameTickRate = Math.min(10, this.gameTickRate + 1);
            console.log(`GameLoop: Increased game tick rate to ${this.gameTickRate}`);
        }

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:performanceImproved', {
                gameTickRate: this.gameTickRate,
                backgroundThrottling: this._backgroundThrottling,
                lowPowerMode: this.adaptivePerformance.lowPowerMode,
                currentFps: this.currentFps
            });
        }
    }

    /**
     * Enable emergency performance mode
     */
    _enableEmergencyMode() {
        console.warn('GameLoop: Emergency performance mode activated');

        this.gameTickRate = 5; // Minimum tick rate
        this._backgroundThrottling = true;
        this.adaptivePerformance.lowPowerMode = true;

        // Temporarily disable detailed profiling
        if (this.performanceMonitor) {
            this.performanceMonitor.setDetailedProfiling(false);
        }

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:emergencyMode', {
                timestamp: Date.now(),
                currentFps: this.currentFps
            });
        }
    }

    /**
     * Get comprehensive performance status
     * @returns {Object} Performance status
     */
    getPerformanceStatus() {
        const basicMetrics = this.getPerformanceMetrics();
        const performanceMonitorData = this.performanceMonitor ?
            this.performanceMonitor.getPerformanceSummary() : null;

        return {
            ...basicMetrics,
            adaptivePerformance: { ...this.adaptivePerformance },
            backgroundThrottling: this._backgroundThrottling,
            frameSkipping: this._skipFrames,
            systemCount: {
                ui: this._uiSystems.size,
                game: this._gameSystems.size,
                save: this._saveSystems.size
            },
            performanceMonitor: performanceMonitorData,
            recommendations: this._generatePerformanceRecommendations()
        };
    }

    /**
     * Generate performance recommendations
     * @returns {Array} Recommendations
     */
    _generatePerformanceRecommendations() {
        const recommendations = [];

        if (this.currentFps < this.adaptivePerformance.minFPS) {
            recommendations.push('Consider reducing visual effects');
            recommendations.push('Check for memory leaks');

            if (this.gameTickRate > 5) {
                recommendations.push('Game tick rate could be reduced further');
            }
        }

        if (this._errorCount > 5) {
            recommendations.push('High error count detected - check system stability');
        }

        if (this.performanceMonitor) {
            const summary = this.performanceMonitor.getPerformanceSummary();
            if (summary.current.memoryUsage > 100) {
                recommendations.push('Memory usage is high - consider optimization');
            }
        }

        return recommendations;
    }

    /**
     * Enable or disable performance profiling
     * @param {boolean} enabled - Whether to enable profiling
     */
    setPerformanceProfiling(enabled) {
        this.enableProfiling = enabled;

        if (this.performanceMonitor) {
            this.performanceMonitor.setDetailedProfiling(enabled);
        }

        console.log(`GameLoop: Performance profiling ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Configure adaptive performance settings
     * @param {Object} config - Adaptive performance configuration
     */
    configureAdaptivePerformance(config) {
        this.adaptivePerformance = { ...this.adaptivePerformance, ...config };
        console.log('GameLoop: Adaptive performance configured:', this.adaptivePerformance);
    }
}

// Create singleton instance
const gameLoop = new GameLoop();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameLoop, gameLoop };
} else if (typeof window !== 'undefined') {
    window.GameLoop = GameLoop;
    window.gameLoop = gameLoop;
}