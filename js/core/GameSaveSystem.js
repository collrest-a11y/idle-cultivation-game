/**
 * GameSaveSystem - Enhanced save system that integrates SaveManager with the main game
 * Provides proper save/load functionality with validation, auto-save, and error recovery
 */
class GameSaveSystem {
    constructor() {
        this.game = null; // Will be set by the game
        this.isInitialized = false;
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.autoSaveTimer = null;
        this.lastAutoSave = 0;
        this.saveSlots = new Map();
        this.currentSlot = 'main';

        // Save system configuration
        this.config = {
            compression: true,
            validation: true,
            backup: true,
            migration: true,
            maxBackups: 5,
            autoSaveOnChanges: true,
            autoSaveOnEvents: [
                'realm:breakthrough',
                'cultivation:levelUp',
                'gacha:pull',
                'scripture:acquired',
                'combat:victory'
            ]
        };

        // Event tracking for auto-save
        this.unsavedChanges = 0;
        this.significantEvents = new Set();
        this.lastSave = 0;

        console.log('GameSaveSystem initialized');
    }

    /**
     * Initialize the save system with game reference
     * @param {IdleCultivationGame} game - The main game instance
     */
    async initialize(game) {
        this.game = game;

        try {
            // Check system health
            const healthCheck = await StorageUtils.checkHealth();
            if (!healthCheck.isHealthy) {
                console.warn('GameSaveSystem: Storage health issues detected:', healthCheck.issues);
                if (healthCheck.issues.some(issue => issue.includes('exceeded'))) {
                    throw new Error('Storage quota exceeded');
                }
            }

            // Initialize GameState with SaveManager
            if (window.gameState && window.saveManager) {
                window.gameState.setSaveManager(window.saveManager);

                // Configure auto-save
                window.gameState.configureAutoSave({
                    enabled: this.autoSaveEnabled,
                    interval: this.autoSaveInterval,
                    onSignificantEvents: true,
                    maxUnsavedChanges: 50
                });
            }

            // Set up event listeners for save triggers
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('GameSaveSystem: Initialized successfully');

        } catch (error) {
            console.error('GameSaveSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Save the current game state
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Success status
     */
    async saveGame(options = {}) {
        if (!this.isInitialized) {
            console.error('GameSaveSystem: Not initialized');
            return false;
        }

        const config = {
            slot: this.currentSlot,
            validate: this.config.validation,
            compress: this.config.compression,
            backup: this.config.backup,
            force: false,
            auto: false,
            ...options
        };

        try {
            // Get current state from GameState or fallback to game state
            let gameStateData;
            if (window.gameState && window.gameState.isReady()) {
                gameStateData = window.gameState.getState();
            } else if (this.game && this.game.gameState) {
                gameStateData = this.game.gameState;
            } else {
                throw new Error('No game state available to save');
            }

            // Add metadata
            const saveData = {
                ...gameStateData,
                meta: {
                    ...gameStateData.meta,
                    lastSave: Date.now(),
                    saveVersion: '1.1.0',
                    gameVersion: this.getGameVersion(),
                    slot: config.slot
                }
            };

            let success = false;

            // Use new SaveManager if available
            if (window.saveManager) {
                success = await window.saveManager.save(config.slot, saveData, {
                    validate: config.validate,
                    compress: config.compress,
                    backup: config.backup,
                    force: config.force
                });

                // Also update GameState if using SaveManager directly
                if (success && window.gameState) {
                    window.gameState.update(() => saveData, {
                        source: 'save_system',
                        validate: false // Already validated by SaveManager
                    });
                }
            } else {
                // Fallback to enhanced localStorage
                success = await this.saveToLocalStorage(config.slot, saveData, config);
            }

            if (success) {
                this.lastSave = Date.now();
                this.lastAutoSave = this.lastSave;
                this.unsavedChanges = 0;

                console.log(`GameSaveSystem: Successfully saved to slot '${config.slot}'`);

                // Emit save event
                if (window.eventManager) {
                    window.eventManager.emit('game:saved', {
                        slot: config.slot,
                        timestamp: this.lastSave,
                        auto: config.auto,
                        method: window.saveManager ? 'SaveManager' : 'localStorage'
                    });
                }
            } else {
                console.error('GameSaveSystem: Save operation failed');
            }

            return success;

        } catch (error) {
            console.error('GameSaveSystem: Save failed:', error);

            // Attempt recovery if possible
            if (error.message.includes('quota') || error.message.includes('storage')) {
                return await this.handleStorageError(error, config);
            }

            return false;
        }
    }

    /**
     * Load game state from storage
     * @param {Object} options - Load options
     * @returns {Promise<Object|null>} Loaded game state or null
     */
    async loadGame(options = {}) {
        const config = {
            slot: this.currentSlot,
            validate: this.config.validation,
            migrate: this.config.migration,
            repair: true,
            ...options
        };

        try {
            let gameStateData = null;

            // Use SaveManager if available
            if (window.saveManager) {
                gameStateData = await window.saveManager.load(config.slot, {
                    validate: config.validate,
                    migrate: config.migrate,
                    repair: config.repair
                });

                if (gameStateData && window.gameState) {
                    // Load into GameState system
                    const loadSuccess = await window.gameState.load({
                        validate: config.validate,
                        migrate: config.migrate
                    });

                    if (loadSuccess) {
                        gameStateData = window.gameState.getState();
                    }
                }
            } else {
                // Fallback to enhanced localStorage
                gameStateData = await this.loadFromLocalStorage(config.slot, config);
            }

            if (gameStateData) {
                console.log(`GameSaveSystem: Successfully loaded from slot '${config.slot}'`);

                // Update tracking
                this.lastSave = gameStateData.meta?.lastSave || Date.now();
                this.unsavedChanges = 0;

                // Emit load event
                if (window.eventManager) {
                    window.eventManager.emit('game:loaded', {
                        slot: config.slot,
                        timestamp: this.lastSave,
                        method: window.saveManager ? 'SaveManager' : 'localStorage'
                    });
                }
            } else {
                console.log('GameSaveSystem: No save data found');
            }

            return gameStateData;

        } catch (error) {
            console.error('GameSaveSystem: Load failed:', error);

            // Attempt recovery
            return await this.attemptRecovery(config.slot, error);
        }
    }

    /**
     * Set up event listeners for auto-save triggers
     */
    setupEventListeners() {
        if (!window.eventManager) {
            console.warn('GameSaveSystem: EventManager not available for auto-save setup');
            return;
        }

        // Listen for significant events
        this.config.autoSaveOnEvents.forEach(eventType => {
            window.eventManager.on(eventType, () => {
                this.significantEvents.add(eventType);
                this.triggerAutoSave('significant_event');
            });
        });

        // Listen for game state changes
        window.eventManager.on('gameState:changed', (data) => {
            this.unsavedChanges++;

            if (this.config.autoSaveOnChanges && this.unsavedChanges >= 50) {
                this.triggerAutoSave('max_changes');
            }
        });

        // Page lifecycle events
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.emergencySave();
            });

            window.addEventListener('visibilitychange', () => {
                if (document.hidden && this.unsavedChanges > 0) {
                    this.triggerAutoSave('visibility_change');
                }
            });

            window.addEventListener('blur', () => {
                if (this.unsavedChanges > 0) {
                    this.triggerAutoSave('focus_loss');
                }
            });
        }

        console.log('GameSaveSystem: Event listeners set up');
    }

    /**
     * Trigger an auto-save with debouncing
     * @param {string} reason - Reason for the auto-save
     */
    triggerAutoSave(reason) {
        if (!this.autoSaveEnabled) return;

        // Debounce auto-saves
        const now = Date.now();
        if (now - this.lastAutoSave < 5000) { // Min 5 seconds between auto-saves
            return;
        }

        setTimeout(() => {
            this.saveGame({ auto: true, reason }).catch(error => {
                console.error(`GameSaveSystem: Auto-save failed (${reason}):`, error);
            });
        }, 100); // Small delay to allow current operation to complete
    }

    /**
     * Emergency save for page unload
     */
    emergencySave() {
        if (this.unsavedChanges === 0) return;

        try {
            // Quick synchronous save to localStorage
            const gameStateData = this.getGameStateForSave();
            if (gameStateData) {
                localStorage.setItem(`idleCultivationSave_${this.currentSlot}_emergency`, JSON.stringify({
                    data: gameStateData,
                    timestamp: Date.now(),
                    emergency: true
                }));
                console.log('GameSaveSystem: Emergency save completed');
            }
        } catch (error) {
            console.error('GameSaveSystem: Emergency save failed:', error);
        }
    }

    /**
     * Get available save slots
     * @returns {Array} Array of save slot information
     */
    async getSaveSlots() {
        try {
            const slots = [];

            if (window.saveManager) {
                const saveManagerSlots = window.saveManager.listSaveSlots();
                slots.push(...saveManagerSlots);
            } else {
                // Fallback: scan localStorage
                const keys = StorageUtils.getKeys('idleCultivationSave_');
                for (const key of keys) {
                    const slotName = key.replace('idleCultivationSave_', '');
                    if (!slotName.includes('_emergency') && !slotName.includes('_backup')) {
                        const data = StorageUtils.getItem(key);
                        if (data) {
                            try {
                                const parsed = JSON.parse(data);
                                slots.push({
                                    key: slotName,
                                    size: data.length,
                                    lastModified: parsed.meta?.lastSave || 0,
                                    isChunked: false
                                });
                            } catch (error) {
                                console.warn(`GameSaveSystem: Could not parse slot ${slotName}`);
                            }
                        }
                    }
                }
            }

            return slots.sort((a, b) => b.lastModified - a.lastModified);

        } catch (error) {
            console.error('GameSaveSystem: Failed to get save slots:', error);
            return [];
        }
    }

    /**
     * Delete a save slot
     * @param {string} slot - Slot to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteSaveSlot(slot) {
        try {
            if (window.saveManager) {
                return window.saveManager.delete(slot);
            } else {
                StorageUtils.removeItem(`idleCultivationSave_${slot}`);
                return true;
            }
        } catch (error) {
            console.error(`GameSaveSystem: Failed to delete slot ${slot}:`, error);
            return false;
        }
    }

    /**
     * Export save data for backup
     * @param {string} slot - Slot to export
     * @returns {Promise<string>} Exported data as JSON string
     */
    async exportSave(slot) {
        try {
            if (window.saveManager) {
                return await window.saveManager.export(slot, {
                    compress: false,
                    includeMetadata: true
                });
            } else {
                const data = await this.loadFromLocalStorage(slot, { validate: false });
                if (data) {
                    return JSON.stringify({
                        version: '1.1.0',
                        timestamp: Date.now(),
                        slot: slot,
                        data: data
                    }, null, 2);
                }
                throw new Error('No save data found to export');
            }
        } catch (error) {
            console.error(`GameSaveSystem: Export failed for slot ${slot}:`, error);
            throw error;
        }
    }

    /**
     * Import save data from backup
     * @param {string} jsonData - JSON save data
     * @param {string} slot - Slot to import to
     * @returns {Promise<boolean>} Success status
     */
    async importSave(jsonData, slot) {
        try {
            if (window.saveManager) {
                return await window.saveManager.import(jsonData, slot, {
                    validate: true,
                    overwrite: true,
                    backup: true
                });
            } else {
                const imported = JSON.parse(jsonData);
                const saveData = imported.data || imported;

                // Basic validation
                if (!saveData.player || !saveData.cultivation || !saveData.meta) {
                    throw new Error('Invalid save data structure');
                }

                // Store with migration
                return await this.saveToLocalStorage(slot, saveData, {
                    validate: true,
                    migrate: true,
                    backup: true
                });
            }
        } catch (error) {
            console.error(`GameSaveSystem: Import failed for slot ${slot}:`, error);
            return false;
        }
    }

    // Private helper methods

    /**
     * Get current game state for saving
     * @returns {Object|null} Game state data
     * @private
     */
    getGameStateForSave() {
        if (window.gameState && window.gameState.isReady()) {
            return window.gameState.getState();
        } else if (this.game && this.game.gameState) {
            return this.game.gameState;
        }
        return null;
    }

    /**
     * Get current game version
     * @returns {string} Game version
     * @private
     */
    getGameVersion() {
        return '1.1.0'; // Should be updated when game version changes
    }

    /**
     * Enhanced localStorage save with validation
     * @param {string} slot - Save slot
     * @param {Object} data - Game state data
     * @param {Object} config - Save configuration
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async saveToLocalStorage(slot, data, config) {
        try {
            // Validate if requested
            if (config.validate && window.dataValidator) {
                const validation = window.dataValidator.validateGameState(data);
                if (!validation.isValid) {
                    throw new Error('Save data validation failed: ' + validation.errors.join(', '));
                }
            }

            // Create backup if requested
            if (config.backup) {
                const existingData = StorageUtils.getItem(`idleCultivationSave_${slot}`);
                if (existingData) {
                    const backupKey = `idleCultivationSave_${slot}_backup_${Date.now()}`;
                    await StorageUtils.setItem(backupKey, existingData);
                }
            }

            // Save the data
            const saveData = {
                data: data,
                timestamp: Date.now(),
                version: this.getGameVersion()
            };

            return await StorageUtils.setItem(
                `idleCultivationSave_${slot}`,
                JSON.stringify(saveData),
                { checkQuota: true }
            );

        } catch (error) {
            console.error('GameSaveSystem: localStorage save failed:', error);
            throw error;
        }
    }

    /**
     * Enhanced localStorage load with validation and migration
     * @param {string} slot - Save slot
     * @param {Object} config - Load configuration
     * @returns {Promise<Object|null>} Loaded game state
     * @private
     */
    async loadFromLocalStorage(slot, config) {
        try {
            const savedData = StorageUtils.getItem(`idleCultivationSave_${slot}`);
            if (!savedData) {
                // Try emergency save
                const emergencyData = StorageUtils.getItem(`idleCultivationSave_${slot}_emergency`);
                if (emergencyData) {
                    console.log('GameSaveSystem: Loading from emergency save');
                    const parsed = JSON.parse(emergencyData);
                    return parsed.data;
                }
                return null;
            }

            const parsed = JSON.parse(savedData);
            let gameStateData = parsed.data || parsed;

            // Migrate if requested
            if (config.migrate && this.game && this.game.migrateSaveData) {
                gameStateData = this.game.migrateSaveData(gameStateData);
            }

            // Validate if requested
            if (config.validate && window.dataValidator) {
                const validation = window.dataValidator.validateGameState(gameStateData, { sanitize: config.repair });
                if (!validation.isValid) {
                    if (config.repair) {
                        console.warn('GameSaveSystem: Save data has issues, attempting repair');
                        const repair = window.dataValidator.repairData(gameStateData);
                        if (repair.success) {
                            gameStateData = repair.data;
                            console.log('GameSaveSystem: Data repaired successfully');
                        } else {
                            throw new Error('Save data is corrupted and cannot be repaired');
                        }
                    } else {
                        throw new Error('Save data validation failed: ' + validation.errors.join(', '));
                    }
                }
            }

            return gameStateData;

        } catch (error) {
            console.error('GameSaveSystem: localStorage load failed:', error);
            throw error;
        }
    }

    /**
     * Handle storage errors with recovery attempts
     * @param {Error} error - Storage error
     * @param {Object} config - Save configuration
     * @returns {Promise<boolean>} Recovery success
     * @private
     */
    async handleStorageError(error, config) {
        console.warn('GameSaveSystem: Handling storage error:', error.message);

        try {
            if (error.message.includes('quota')) {
                // Try to free up space
                console.log('GameSaveSystem: Attempting to free storage space');

                // Clean up old backups
                const keys = StorageUtils.getKeys('idleCultivationSave_');
                const backupKeys = keys.filter(key => key.includes('_backup_'));

                // Sort by timestamp and keep only recent backups
                backupKeys.sort((a, b) => {
                    const timeA = parseInt(a.match(/_backup_(\d+)$/)?.[1] || '0');
                    const timeB = parseInt(b.match(/_backup_(\d+)$/)?.[1] || '0');
                    return timeB - timeA;
                });

                // Remove older backups
                const toDelete = backupKeys.slice(this.config.maxBackups);
                for (const key of toDelete) {
                    StorageUtils.removeItem(key);
                }

                if (toDelete.length > 0) {
                    console.log(`GameSaveSystem: Cleaned up ${toDelete.length} old backups`);

                    // Retry save without backup
                    return await this.saveGame({ ...config, backup: false, force: true });
                }
            }

            return false;

        } catch (recoveryError) {
            console.error('GameSaveSystem: Recovery failed:', recoveryError);
            return false;
        }
    }

    /**
     * Attempt to recover corrupted save data
     * @param {string} slot - Save slot
     * @param {Error} error - Load error
     * @returns {Promise<Object|null>} Recovered data or null
     * @private
     */
    async attemptRecovery(slot, error) {
        console.log(`GameSaveSystem: Attempting recovery for slot ${slot}`);

        try {
            // Try backup saves
            const keys = StorageUtils.getKeys(`idleCultivationSave_${slot}_backup_`);
            if (keys.length > 0) {
                // Sort by timestamp, newest first
                keys.sort((a, b) => {
                    const timeA = parseInt(a.match(/_backup_(\d+)$/)?.[1] || '0');
                    const timeB = parseInt(b.match(/_backup_(\d+)$/)?.[1] || '0');
                    return timeB - timeA;
                });

                for (const backupKey of keys) {
                    try {
                        const backupData = StorageUtils.getItem(backupKey);
                        if (backupData) {
                            const parsed = JSON.parse(backupData);
                            console.log(`GameSaveSystem: Recovered from backup: ${backupKey}`);
                            return parsed.data || parsed;
                        }
                    } catch (backupError) {
                        console.warn(`GameSaveSystem: Backup ${backupKey} is also corrupted`);
                    }
                }
            }

            // Try emergency save
            const emergencyKey = `idleCultivationSave_${slot}_emergency`;
            const emergencyData = StorageUtils.getItem(emergencyKey);
            if (emergencyData) {
                const parsed = JSON.parse(emergencyData);
                console.log('GameSaveSystem: Recovered from emergency save');
                return parsed.data;
            }

            console.warn('GameSaveSystem: No recovery options available');
            return null;

        } catch (recoveryError) {
            console.error('GameSaveSystem: Recovery failed:', recoveryError);
            return null;
        }
    }
}

// Create singleton instance
const gameSaveSystem = new GameSaveSystem();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameSaveSystem, gameSaveSystem };
} else if (typeof window !== 'undefined') {
    window.GameSaveSystem = GameSaveSystem;
    window.gameSaveSystem = gameSaveSystem;
}