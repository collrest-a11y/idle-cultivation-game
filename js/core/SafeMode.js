/**
 * SafeMode - Minimal game mode that activates when normal initialization fails
 * Provides basic gameplay functionality with minimal dependencies
 */
class SafeMode {
    constructor() {
        this.isActive = false;
        this.failureCount = 0;
        this.maxFailures = 3; // Trigger after 3 failures
        this.failureHistory = [];
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 5;

        // Minimal game state for safe mode
        this.safeState = {
            resources: {
                qi: 0,
                spiritStones: 100
            },
            cultivation: {
                level: 1,
                experience: 0,
                experienceRequired: 100
            },
            lastUpdate: Date.now()
        };

        // Load failure count from localStorage
        this._loadFailureCount();
    }

    /**
     * Record an initialization failure
     * @param {Error} error - The error that caused the failure
     * @param {string} context - Where the failure occurred
     */
    recordFailure(error, context = 'unknown') {
        this.failureCount++;
        this.failureHistory.push({
            error: error.message,
            stack: error.stack,
            context: context,
            timestamp: Date.now()
        });

        this._saveFailureCount();

        console.error(`[SafeMode] Failure #${this.failureCount} recorded:`, error.message);

        // Check if we should activate safe mode
        if (this.failureCount >= this.maxFailures) {
            console.warn(`[SafeMode] ${this.maxFailures} consecutive failures detected - activating Safe Mode`);
            return true; // Should activate safe mode
        }

        return false;
    }

    /**
     * Reset failure count (called after successful initialization)
     */
    resetFailures() {
        this.failureCount = 0;
        this.failureHistory = [];
        this._saveFailureCount();
        console.log('[SafeMode] Failure count reset');
    }

    /**
     * Activate safe mode
     */
    async activate() {
        if (this.isActive) {
            console.warn('[SafeMode] Already active');
            return;
        }

        console.log('[SafeMode] Activating minimal game mode...');
        this.isActive = true;

        try {
            // Load safe mode state if it exists
            this._loadSafeState();

            // Initialize minimal systems
            await this._initializeMinimalSystems();

            // Start safe mode game loop
            this._startSafeLoop();

            console.log('[SafeMode] Safe mode activated successfully');

        } catch (error) {
            console.error('[SafeMode] Failed to activate safe mode:', error);
            // Even safe mode failed - show emergency fallback
            this._showEmergencyFallback(error);
        }
    }

    /**
     * Initialize minimal core systems
     */
    async _initializeMinimalSystems() {
        console.log('[SafeMode] Initializing minimal systems...');

        // Create minimal event system
        this.events = new Map();
        this.emit = (event, data) => {
            const handlers = this.events.get(event) || [];
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (err) {
                    console.error(`[SafeMode] Event handler error for ${event}:`, err);
                }
            });
        };
        this.on = (event, handler) => {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event).push(handler);
        };

        console.log('[SafeMode] Minimal systems initialized');
    }

    /**
     * Start safe mode game loop
     */
    _startSafeLoop() {
        console.log('[SafeMode] Starting safe mode game loop...');

        let lastUpdate = Date.now();

        this.loopInterval = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastUpdate) / 1000; // Convert to seconds

            // Update cultivation progress
            this.safeState.cultivation.experience += deltaTime;

            // Level up check
            while (this.safeState.cultivation.experience >= this.safeState.cultivation.experienceRequired) {
                this.safeState.cultivation.experience -= this.safeState.cultivation.experienceRequired;
                this.safeState.cultivation.level++;
                this.safeState.cultivation.experienceRequired = Math.floor(
                    this.safeState.cultivation.experienceRequired * 1.15
                );

                this.emit('safeMode:levelUp', {
                    level: this.safeState.cultivation.level
                });
            }

            // Generate resources
            this.safeState.resources.qi += deltaTime * 0.5;
            this.safeState.resources.spiritStones += deltaTime * 0.1;

            this.safeState.lastUpdate = now;
            lastUpdate = now;

            // Emit update event for UI
            this.emit('safeMode:update', {
                state: this.safeState,
                deltaTime: deltaTime
            });

            // Auto-save every 5 seconds
            if (now % 5000 < 1000) {
                this._saveSafeState();
            }
        }, 1000); // Update once per second
    }

    /**
     * Stop safe mode
     */
    deactivate() {
        if (!this.isActive) {
            return;
        }

        console.log('[SafeMode] Deactivating safe mode...');

        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }

        this._saveSafeState();
        this.isActive = false;

        console.log('[SafeMode] Safe mode deactivated');
    }

    /**
     * Attempt to restart in normal mode
     */
    async attemptNormalRestart() {
        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            console.warn('[SafeMode] Maximum recovery attempts reached');
            this.emit('safeMode:recoveryFailed', {
                reason: 'Max attempts reached'
            });
            return false;
        }

        this.recoveryAttempts++;
        console.log(`[SafeMode] Attempting normal restart (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})...`);

        // Save current state
        this._saveSafeState();

        // Clear failure count to allow retry
        this.resetFailures();

        // Deactivate safe mode
        this.deactivate();

        // Emit restart event
        this.emit('safeMode:restart', {
            attempt: this.recoveryAttempts
        });

        // Reload the page
        setTimeout(() => {
            window.location.reload();
        }, 500);

        return true;
    }

    /**
     * Get current safe mode state
     */
    getState() {
        return {
            isActive: this.isActive,
            failureCount: this.failureCount,
            failureHistory: this.failureHistory,
            recoveryAttempts: this.recoveryAttempts,
            safeState: this.safeState
        };
    }

    /**
     * Perform basic meditation action
     */
    meditate() {
        if (!this.isActive) {
            return;
        }

        const bonus = this.safeState.cultivation.level * 5;
        this.safeState.cultivation.experience += bonus;
        this.safeState.resources.qi += bonus;

        this.emit('safeMode:meditate', {
            bonus: bonus,
            newExperience: this.safeState.cultivation.experience
        });

        console.log(`[SafeMode] Meditated - gained ${bonus} experience and qi`);
    }

    /**
     * Save safe mode state
     */
    _saveSafeState() {
        try {
            localStorage.setItem('idleCultivation_safeState', JSON.stringify(this.safeState));
        } catch (error) {
            console.error('[SafeMode] Failed to save safe state:', error);
        }
    }

    /**
     * Load safe mode state
     */
    _loadSafeState() {
        try {
            const saved = localStorage.getItem('idleCultivation_safeState');
            if (saved) {
                const loaded = JSON.parse(saved);
                this.safeState = { ...this.safeState, ...loaded };
                console.log('[SafeMode] Loaded safe state:', this.safeState);
            }
        } catch (error) {
            console.error('[SafeMode] Failed to load safe state:', error);
        }
    }

    /**
     * Save failure count to localStorage
     */
    _saveFailureCount() {
        try {
            localStorage.setItem('idleCultivation_failureCount', this.failureCount.toString());
            localStorage.setItem('idleCultivation_failureHistory', JSON.stringify(this.failureHistory));
        } catch (error) {
            console.error('[SafeMode] Failed to save failure count:', error);
        }
    }

    /**
     * Load failure count from localStorage
     */
    _loadFailureCount() {
        try {
            const count = localStorage.getItem('idleCultivation_failureCount');
            const history = localStorage.getItem('idleCultivation_failureHistory');

            if (count) {
                this.failureCount = parseInt(count, 10) || 0;
            }

            if (history) {
                this.failureHistory = JSON.parse(history) || [];
            }

            console.log(`[SafeMode] Loaded failure count: ${this.failureCount}`);
        } catch (error) {
            console.error('[SafeMode] Failed to load failure count:', error);
        }
    }

    /**
     * Show emergency fallback UI when even safe mode fails
     */
    _showEmergencyFallback(error) {
        console.error('[SafeMode] Emergency fallback activated');

        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: #e8e8e8;
                font-family: Arial, sans-serif;
                padding: 20px;
                text-align: center;
            ">
                <h1 style="color: #ff6b6b; margin-bottom: 20px;">⚠️ Critical Error</h1>
                <p style="font-size: 18px; margin-bottom: 20px;">The game encountered a critical error and cannot start.</p>
                <p style="margin-bottom: 30px;">Even Safe Mode failed to initialize.</p>

                <div style="
                    background: rgba(0,0,0,0.3);
                    border: 1px solid #4a4a6a;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 30px;
                    max-width: 600px;
                ">
                    <h3 style="color: #d4af37; margin-bottom: 10px;">Recovery Options</h3>
                    <button onclick="location.reload()" style="
                        background: linear-gradient(135deg, #4a4a6a, #3a3a5a);
                        border: 1px solid #d4af37;
                        color: #e8e8e8;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 5px;
                    ">Reload Page</button>

                    <button onclick="localStorage.clear(); location.reload()" style="
                        background: linear-gradient(135deg, #6b4a4a, #5a3a3a);
                        border: 1px solid #ff6b6b;
                        color: #e8e8e8;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 5px;
                    ">Clear Save & Reload</button>
                </div>

                <details style="
                    background: rgba(0,0,0,0.3);
                    border: 1px solid #4a4a6a;
                    border-radius: 8px;
                    padding: 15px;
                    max-width: 800px;
                    text-align: left;
                ">
                    <summary style="cursor: pointer; color: #d4af37;">Error Details</summary>
                    <pre style="
                        background: #000;
                        padding: 10px;
                        border-radius: 4px;
                        overflow-x: auto;
                        margin-top: 10px;
                        font-size: 12px;
                    ">${error.message}\n\n${error.stack || ''}</pre>
                </details>
            </div>
        `;
    }
}

// Create singleton instance
const safeMode = new SafeMode();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SafeMode, safeMode };
} else if (typeof window !== 'undefined') {
    window.SafeMode = SafeMode;
    window.safeMode = safeMode;
}