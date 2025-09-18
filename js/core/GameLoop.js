/**
 * GameLoop - Main game loop with configurable tick rates for different systems
 * Handles UI updates (60fps) and game logic updates (1-10fps) separately
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

        // Timing
        this.lastFrameTime = 0;
        this.lastGameTick = 0;
        this.lastSaveTick = 0;

        // Performance tracking
        this.frameCount = 0;
        this.gameTickCount = 0;
        this.totalFrameTime = 0;
        this.totalGameTime = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 0;

        // System references (will be injected)
        this._eventManager = null;
        this._timeManager = null;
        this._gameState = null;

        // Registered systems
        this._uiSystems = new Set(); // Systems that update every frame
        this._gameSystems = new Set(); // Systems that update at game tick rate
        this._saveSystems = new Set(); // Systems that handle saving

        // Error handling
        this._errorCount = 0;
        this._maxErrors = 10;
        this._errorResetTime = 60000; // Reset error count after 1 minute
        this._lastErrorReset = Date.now();
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
    }

    /**
     * Register a system for UI updates (60fps)
     * @param {Object} system - System object with update method
     * @param {Function} system.update - Update function that receives deltaTime
     * @param {string} system.name - System name for debugging
     */
    registerUISystem(system) {
        if (!system || typeof system.update !== 'function') {
            throw new Error('UI system must have an update method');
        }
        this._uiSystems.add(system);

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:systemRegistered', {
                type: 'ui',
                system: system.name || 'unnamed',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Register a system for game logic updates (configurable fps)
     * @param {Object} system - System object with update method
     * @param {Function} system.update - Update function that receives deltaTime
     * @param {string} system.name - System name for debugging
     */
    registerGameSystem(system) {
        if (!system || typeof system.update !== 'function') {
            throw new Error('Game system must have an update method');
        }
        this._gameSystems.add(system);

        if (this._eventManager) {
            this._eventManager.emit('gameLoop:systemRegistered', {
                type: 'game',
                system: system.name || 'unnamed',
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

        try {
            // Update time manager
            let timeData = null;
            if (this._timeManager) {
                timeData = this._timeManager.update();
            }

            // Calculate frame delta
            const frameDelta = currentTime - this.lastFrameTime;

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

                // Handle save systems
                const saveTickInterval = 1000 / this.saveTickRate;
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
        }

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this._loop());
    }

    _updateUISystems(deltaTime, timeData) {
        for (const system of this._uiSystems) {
            try {
                system.update(deltaTime, timeData);
            } catch (error) {
                console.error(`GameLoop: Error in UI system '${system.name || 'unnamed'}':`, error);
                this._handleError(error, system);
            }
        }
    }

    _updateGameSystems(deltaTime, timeData) {
        const gameStartTime = performance.now();

        for (const system of this._gameSystems) {
            try {
                system.update(deltaTime, timeData);
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