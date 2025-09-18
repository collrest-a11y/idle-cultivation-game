/**
 * GameState - Centralized state management with immutable updates and event system
 * Singleton pattern with change detection, validation, and persistence
 */
class GameState {
    constructor() {
        if (GameState.instance) {
            return GameState.instance;
        }

        this._state = null;
        this._previousState = null;
        this._changeListeners = new Set();
        this._validationRules = new Map();
        this._isDirty = false;
        this._lastSaveTime = 0;
        this._autoSaveInterval = 30000; // 30 seconds
        this._saveKey = 'idleCultivationGameSave';
        this._eventManager = null; // Will be injected

        // Initialize with default state
        this._state = this._getDefaultState();
        this._previousState = this._deepClone(this._state);

        GameState.instance = this;
    }

    /**
     * Set the event manager for this game state
     * @param {EventManager} eventManager - The event manager instance
     */
    setEventManager(eventManager) {
        this._eventManager = eventManager;
    }

    /**
     * Get the current game state (read-only)
     * @returns {Object} The current state
     */
    getState() {
        return this._deepClone(this._state);
    }

    /**
     * Get a specific value from the state using a path
     * @param {string} path - Dot notation path (e.g., 'player.jade', 'cultivation.qi.level')
     * @returns {*} The value at the path
     */
    get(path) {
        return this._getNestedValue(this._state, path);
    }

    /**
     * Update the game state immutably
     * @param {Object|Function} updates - Object with updates or function that returns updates
     * @param {Object} options - Optional configuration
     * @param {boolean} options.validate - Whether to validate the update (default: true)
     * @param {boolean} options.emit - Whether to emit change events (default: true)
     * @param {string} options.source - Source of the update for debugging
     */
    update(updates, options = {}) {
        const config = {
            validate: true,
            emit: true,
            source: 'unknown',
            ...options
        };

        try {
            // Store previous state for rollback
            this._previousState = this._deepClone(this._state);

            // Apply updates
            let newState;
            if (typeof updates === 'function') {
                newState = updates(this._deepClone(this._state));
            } else {
                newState = this._mergeDeep(this._state, updates);
            }

            // Validate if requested
            if (config.validate) {
                this._validateState(newState);
            }

            // Update state
            this._state = newState;
            this._isDirty = true;

            // Emit events if requested
            if (config.emit && this._eventManager) {
                this._eventManager.emit('gameState:changed', {
                    updates,
                    previousState: this._previousState,
                    currentState: this._deepClone(this._state),
                    source: config.source
                });

                // Emit specific property change events
                this._emitPropertyChangeEvents(this._previousState, this._state);
            }

            // Trigger auto-save if enough time has passed
            const now = Date.now();
            if (now - this._lastSaveTime > this._autoSaveInterval) {
                this.save();
            }

        } catch (error) {
            // Rollback on error
            this._state = this._previousState;
            console.error('GameState: Update failed, rolling back:', error);
            throw error;
        }
    }

    /**
     * Set a specific value in the state using a path
     * @param {string} path - Dot notation path
     * @param {*} value - The value to set
     * @param {Object} options - Optional configuration
     */
    set(path, value, options = {}) {
        const updates = this._setNestedValue({}, path, value);
        this.update(updates, options);
    }

    /**
     * Increment a numeric value in the state
     * @param {string} path - Dot notation path
     * @param {number} amount - Amount to increment (can be negative)
     * @param {Object} options - Optional configuration
     */
    increment(path, amount = 1, options = {}) {
        const currentValue = this.get(path) || 0;
        this.set(path, currentValue + amount, options);
    }

    /**
     * Add validation rules for state properties
     * @param {string} path - Dot notation path
     * @param {Function} validator - Validation function that returns true if valid
     * @param {string} message - Error message for validation failure
     */
    addValidation(path, validator, message) {
        if (!this._validationRules.has(path)) {
            this._validationRules.set(path, []);
        }
        this._validationRules.get(path).push({ validator, message });
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function
     * @param {Object} options - Optional configuration
     * @param {string} options.path - Only listen to changes at this path
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener, options = {}) {
        const listenerData = {
            callback: listener,
            path: options.path || null,
            id: this._generateListenerId()
        };

        this._changeListeners.add(listenerData);

        return () => {
            this._changeListeners.delete(listenerData);
        };
    }

    /**
     * Reset the game state to default values
     * @param {Object} options - Optional configuration
     */
    reset(options = {}) {
        const defaultState = this._getDefaultState();
        this.update(() => defaultState, {
            ...options,
            source: 'reset'
        });
    }

    /**
     * Save the game state to localStorage
     * @returns {boolean} Whether the save was successful
     */
    save() {
        try {
            const saveData = {
                state: this._state,
                timestamp: Date.now(),
                version: this._getSaveVersion()
            };

            localStorage.setItem(this._saveKey, JSON.stringify(saveData));
            this._isDirty = false;
            this._lastSaveTime = Date.now();

            if (this._eventManager) {
                this._eventManager.emit('gameState:saved', { timestamp: this._lastSaveTime });
            }

            return true;
        } catch (error) {
            console.error('GameState: Failed to save:', error);
            return false;
        }
    }

    /**
     * Load the game state from localStorage
     * @returns {boolean} Whether the load was successful
     */
    load() {
        try {
            const savedData = localStorage.getItem(this._saveKey);
            if (!savedData) {
                return false;
            }

            const parsedData = JSON.parse(savedData);
            const migratedState = this._migrateState(parsedData.state, parsedData.version);

            this._state = migratedState;
            this._previousState = this._deepClone(this._state);
            this._isDirty = false;

            if (this._eventManager) {
                this._eventManager.emit('gameState:loaded', {
                    timestamp: parsedData.timestamp,
                    version: parsedData.version
                });
            }

            return true;
        } catch (error) {
            console.error('GameState: Failed to load:', error);
            return false;
        }
    }

    /**
     * Export the game state for backup or transfer
     * @returns {string} JSON string of the state
     */
    export() {
        return JSON.stringify({
            state: this._state,
            timestamp: Date.now(),
            version: this._getSaveVersion()
        }, null, 2);
    }

    /**
     * Import a game state from a JSON string
     * @param {string} jsonData - JSON string of the state
     * @returns {boolean} Whether the import was successful
     */
    import(jsonData) {
        try {
            const parsedData = JSON.parse(jsonData);
            const migratedState = this._migrateState(parsedData.state, parsedData.version);

            this.update(() => migratedState, { source: 'import' });
            return true;
        } catch (error) {
            console.error('GameState: Failed to import:', error);
            return false;
        }
    }

    /**
     * Check if the state has unsaved changes
     * @returns {boolean} Whether the state is dirty
     */
    isDirty() {
        return this._isDirty;
    }

    /**
     * Get debug information about the state
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isDirty: this._isDirty,
            lastSaveTime: this._lastSaveTime,
            changeListenerCount: this._changeListeners.size,
            validationRuleCount: this._validationRules.size,
            stateSize: JSON.stringify(this._state).length,
            hasEventManager: !!this._eventManager
        };
    }

    // Private methods

    _getDefaultState() {
        return {
            player: {
                jade: 500,
                spiritCrystals: 100,
                shards: 0,
                power: 1.0,
                offlineTime: 0
            },
            cultivation: {
                qi: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                body: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                dual: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 200,
                    baseRate: 0.5,
                    multiplier: 1.0,
                    unlocked: false
                }
            },
            realm: {
                current: "Body Refinement",
                stage: 1,
                maxStage: 10,
                breakthroughProgress: 0,
                breakthroughRequired: 1000
            },
            character: {
                origin: null,
                vow: null,
                mark: null,
                modifiers: {}
            },
            loadout: {
                slots: {
                    qi: null,
                    body: null,
                    dual: null,
                    extra1: null,
                    extra2: null
                },
                stats: {
                    flatDamage: 0,
                    damageMultiplier: 1.0,
                    attackSpeed: 1.0,
                    critChance: 0.05,
                    critMultiplier: 2.0,
                    lifesteal: 0,
                    damageReduction: 0
                }
            },
            scriptures: {
                collection: [],
                nextId: 1
            },
            gacha: {
                pityCounter: 0,
                currentBanner: 'standard'
            },
            combat: {
                wins: 0,
                losses: 0,
                streak: 0,
                rank: 1000
            },
            sect: {
                id: null,
                name: null,
                contribution: 0,
                buffs: [],
                lastDonation: 0
            },
            tutorial: {
                completed: false,
                currentStep: 0,
                completedSteps: []
            },
            settings: {
                autoSave: true,
                notifications: true,
                sound: true,
                theme: 'dark'
            },
            meta: {
                createdAt: Date.now(),
                lastPlayed: Date.now(),
                totalPlayTime: 0,
                version: '1.0.0'
            }
        };
    }

    _deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this._deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this._deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }

    _mergeDeep(target, source) {
        const result = this._deepClone(target);

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this._mergeDeep(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const result = this._deepClone(obj);
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return result;
    }

    _validateState(state) {
        for (const [path, rules] of this._validationRules) {
            const value = this._getNestedValue(state, path);
            for (const rule of rules) {
                if (!rule.validator(value)) {
                    throw new Error(`Validation failed for ${path}: ${rule.message}`);
                }
            }
        }
    }

    _emitPropertyChangeEvents(oldState, newState) {
        if (!this._eventManager) return;

        const changes = this._findChanges(oldState, newState);
        for (const change of changes) {
            this._eventManager.emit('gameState:propertyChanged', change);
        }
    }

    _findChanges(oldObj, newObj, path = '') {
        const changes = [];

        // Check for changed or new properties
        for (const key in newObj) {
            if (newObj.hasOwnProperty(key)) {
                const currentPath = path ? `${path}.${key}` : key;
                const oldValue = oldObj ? oldObj[key] : undefined;
                const newValue = newObj[key];

                if (oldValue !== newValue) {
                    if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                        // Recursively check nested objects
                        changes.push(...this._findChanges(oldValue, newValue, currentPath));
                    } else {
                        // Value changed
                        changes.push({
                            path: currentPath,
                            oldValue,
                            newValue,
                            type: 'changed'
                        });
                    }
                }
            }
        }

        return changes;
    }

    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _getSaveVersion() {
        return '1.0.0';
    }

    _migrateState(state, version) {
        // Future state migration logic will go here
        // For now, just return the state as-is
        return state;
    }
}

// Create singleton instance
const gameState = new GameState();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState, gameState };
} else if (typeof window !== 'undefined') {
    window.GameState = GameState;
    window.gameState = gameState;
}