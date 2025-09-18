/**
 * TimeManager - Handles time tracking, offline progression, and time scaling
 * Manages game time, real time, and provides utilities for idle calculations
 */
class TimeManager {
    constructor() {
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.gameTime = 0; // Total game time in milliseconds
        this.sessionTime = 0; // Current session time in milliseconds
        this.offlineTime = 0; // Time spent offline in milliseconds
        this.timeScale = 1.0; // Time scaling factor for testing/balance
        this.isPaused = false;
        this.isVisible = true; // Tab visibility
        this.maxOfflineTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        // Performance tracking
        this.updateCount = 0;
        this.totalUpdateTime = 0;

        // Event manager reference (will be injected)
        this._eventManager = null;

        // Visibility change handling
        this._setupVisibilityHandling();

        // Offline time detection
        this._lastActivityTime = Date.now();
        this._offlineThreshold = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Set the event manager for this time manager
     * @param {EventManager} eventManager - The event manager instance
     */
    setEventManager(eventManager) {
        this._eventManager = eventManager;
    }

    /**
     * Update the time manager - should be called every frame
     * @param {number} currentTime - Current timestamp (optional, defaults to Date.now())
     * @returns {Object} Time delta information
     */
    update(currentTime = Date.now()) {
        if (this.isPaused) {
            this.lastUpdateTime = currentTime;
            return { deltaTime: 0, scaledDeltaTime: 0, gameTime: this.gameTime };
        }

        const startUpdateTime = performance.now();

        const deltaTime = currentTime - this.lastUpdateTime;
        const scaledDeltaTime = deltaTime * this.timeScale;

        // Update times
        this.gameTime += scaledDeltaTime;
        this.sessionTime += deltaTime;
        this.lastUpdateTime = currentTime;
        this._lastActivityTime = currentTime;

        // Performance tracking
        this.updateCount++;
        this.totalUpdateTime += performance.now() - startUpdateTime;

        const timeData = {
            deltaTime,
            scaledDeltaTime,
            gameTime: this.gameTime,
            sessionTime: this.sessionTime,
            timeScale: this.timeScale
        };

        // Emit time update event
        if (this._eventManager) {
            this._eventManager.emit('time:update', timeData);
        }

        return timeData;
    }

    /**
     * Pause or unpause the time manager
     * @param {boolean} paused - Whether to pause
     */
    setPaused(paused) {
        if (this.isPaused === paused) return;

        this.isPaused = paused;

        if (this._eventManager) {
            this._eventManager.emit('time:pauseChanged', {
                isPaused: paused,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Set the time scaling factor
     * @param {number} scale - Time scale multiplier (1.0 = normal, 2.0 = double speed, etc.)
     */
    setTimeScale(scale) {
        if (typeof scale !== 'number' || scale < 0) {
            throw new Error('Time scale must be a non-negative number');
        }

        const oldScale = this.timeScale;
        this.timeScale = scale;

        if (this._eventManager) {
            this._eventManager.emit('time:scaleChanged', {
                oldScale,
                newScale: scale,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Calculate offline progression based on time away
     * @param {number} offlineTime - Time spent offline in milliseconds
     * @param {Object} options - Configuration options
     * @param {number} options.maxTime - Maximum offline time to calculate (default: maxOfflineTime)
     * @param {number} options.efficiency - Offline efficiency multiplier (default: 1.0)
     * @returns {Object} Offline progression data
     */
    calculateOfflineProgression(offlineTime, options = {}) {
        const config = {
            maxTime: this.maxOfflineTime,
            efficiency: 1.0,
            ...options
        };

        // Cap offline time
        const cappedOfflineTime = Math.min(offlineTime, config.maxTime);
        const effectiveTime = cappedOfflineTime * config.efficiency;

        const progression = {
            timeAway: offlineTime,
            timeProcessed: cappedOfflineTime,
            effectiveTime: effectiveTime,
            efficiency: config.efficiency,
            wasCapped: offlineTime > config.maxTime,
            maxOfflineTime: config.maxTime
        };

        if (this._eventManager) {
            this._eventManager.emit('time:offlineCalculated', progression);
        }

        return progression;
    }

    /**
     * Handle returning from offline play
     * @param {number} lastPlayTime - Timestamp of when the player last played
     * @returns {Object} Offline time information
     */
    handleOfflineReturn(lastPlayTime) {
        const currentTime = Date.now();
        const timeAway = currentTime - lastPlayTime;

        // Only consider it "offline" if away for more than the threshold
        if (timeAway < this._offlineThreshold) {
            return { wasOffline: false, timeAway: 0 };
        }

        this.offlineTime = timeAway;
        const progression = this.calculateOfflineProgression(timeAway);

        if (this._eventManager) {
            this._eventManager.emit('time:offlineReturn', {
                lastPlayTime,
                currentTime,
                timeAway,
                progression
            });
        }

        return {
            wasOffline: true,
            timeAway,
            progression
        };
    }

    /**
     * Get current time information
     * @returns {Object} Current time data
     */
    getTimeInfo() {
        return {
            gameTime: this.gameTime,
            sessionTime: this.sessionTime,
            offlineTime: this.offlineTime,
            timeScale: this.timeScale,
            isPaused: this.isPaused,
            isVisible: this.isVisible,
            startTime: this.startTime,
            lastUpdateTime: this.lastUpdateTime,
            realTime: Date.now()
        };
    }

    /**
     * Format time duration into human readable string
     * @param {number} milliseconds - Time in milliseconds
     * @param {Object} options - Formatting options
     * @param {boolean} options.showMs - Whether to show milliseconds (default: false)
     * @param {boolean} options.compact - Whether to use compact format (default: false)
     * @returns {string} Formatted time string
     */
    formatTime(milliseconds, options = {}) {
        const config = {
            showMs: false,
            compact: false,
            ...options
        };

        if (milliseconds < 0) return 'Invalid time';

        const ms = milliseconds % 1000;
        const seconds = Math.floor(milliseconds / 1000) % 60;
        const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
        const hours = Math.floor(milliseconds / (1000 * 60 * 60)) % 24;
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));

        const parts = [];

        if (days > 0) {
            parts.push(config.compact ? `${days}d` : `${days} day${days !== 1 ? 's' : ''}`);
        }
        if (hours > 0) {
            parts.push(config.compact ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`);
        }
        if (minutes > 0) {
            parts.push(config.compact ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`);
        }
        if (seconds > 0 || parts.length === 0) {
            parts.push(config.compact ? `${seconds}s` : `${seconds} second${seconds !== 1 ? 's' : ''}`);
        }
        if (config.showMs && ms > 0) {
            parts.push(config.compact ? `${ms}ms` : `${ms} millisecond${ms !== 1 ? 's' : ''}`);
        }

        return parts.join(config.compact ? ' ' : ', ');
    }

    /**
     * Convert time to ticks for game calculations
     * @param {number} milliseconds - Time in milliseconds
     * @param {number} tickRate - Ticks per second (default: 1)
     * @returns {number} Number of ticks
     */
    timeToTicks(milliseconds, tickRate = 1) {
        return (milliseconds / 1000) * tickRate;
    }

    /**
     * Convert ticks to time
     * @param {number} ticks - Number of ticks
     * @param {number} tickRate - Ticks per second (default: 1)
     * @returns {number} Time in milliseconds
     */
    ticksToTime(ticks, tickRate = 1) {
        return (ticks / tickRate) * 1000;
    }

    /**
     * Create a timer that executes a callback after a delay
     * @param {Function} callback - Function to call
     * @param {number} delay - Delay in milliseconds
     * @param {Object} options - Timer options
     * @param {boolean} options.useGameTime - Whether to use scaled game time (default: false)
     * @returns {Object} Timer object with cancel method
     */
    createTimer(callback, delay, options = {}) {
        const config = {
            useGameTime: false,
            ...options
        };

        const startTime = config.useGameTime ? this.gameTime : Date.now();
        let cancelled = false;

        const checkTimer = () => {
            if (cancelled) return;

            const currentTime = config.useGameTime ? this.gameTime : Date.now();
            const elapsed = currentTime - startTime;

            if (elapsed >= delay) {
                callback();
            } else {
                requestAnimationFrame(checkTimer);
            }
        };

        requestAnimationFrame(checkTimer);

        return {
            cancel: () => { cancelled = true; }
        };
    }

    /**
     * Get performance metrics for the time manager
     * @returns {Object} Performance data
     */
    getPerformanceMetrics() {
        return {
            updateCount: this.updateCount,
            totalUpdateTime: this.totalUpdateTime,
            averageUpdateTime: this.updateCount > 0 ? this.totalUpdateTime / this.updateCount : 0,
            updatesPerSecond: this.sessionTime > 0 ? (this.updateCount / this.sessionTime) * 1000 : 0
        };
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
        this.updateCount = 0;
        this.totalUpdateTime = 0;
    }

    /**
     * Reset session time
     */
    resetSessionTime() {
        this.sessionTime = 0;
        this.startTime = Date.now();
    }

    // Private methods

    _setupVisibilityHandling() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            const wasVisible = this.isVisible;
            this.isVisible = !document.hidden;

            if (this._eventManager) {
                this._eventManager.emit('time:visibilityChanged', {
                    isVisible: this.isVisible,
                    wasVisible,
                    timestamp: Date.now()
                });
            }

            // Handle potential offline time when tab becomes visible again
            if (this.isVisible && !wasVisible) {
                const potentialOfflineTime = Date.now() - this._lastActivityTime;
                if (potentialOfflineTime > this._offlineThreshold) {
                    this.handleOfflineReturn(this._lastActivityTime);
                }
            }
        });

        // Handle window focus/blur
        window.addEventListener('focus', () => {
            if (this._eventManager) {
                this._eventManager.emit('time:windowFocused', { timestamp: Date.now() });
            }
        });

        window.addEventListener('blur', () => {
            if (this._eventManager) {
                this._eventManager.emit('time:windowBlurred', { timestamp: Date.now() });
            }
        });
    }
}

// Create singleton instance
const timeManager = new TimeManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TimeManager, timeManager };
} else if (typeof window !== 'undefined') {
    window.TimeManager = TimeManager;
    window.timeManager = timeManager;
}