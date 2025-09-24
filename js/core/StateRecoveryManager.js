/**
 * StateRecoveryManager - Orchestrates state validation and recovery workflow
 * Integrates SaveManager, GameState, DataValidator, and RecoveryModal
 */
class StateRecoveryManager {
    constructor() {
        this.gameState = null;
        this.saveManager = null;
        this.dataValidator = null;
        this.recoveryModal = null;
        this.eventManager = null;

        this.recoveryInProgress = false;
        this.recoveryHistory = [];

        console.log('StateRecoveryManager initialized');
    }

    /**
     * Initialize with required dependencies
     * @param {Object} dependencies - Required managers
     */
    initialize(dependencies = {}) {
        this.gameState = dependencies.gameState || window.gameState;
        this.saveManager = dependencies.saveManager || window.saveManager;
        this.dataValidator = dependencies.dataValidator || window.dataValidator;
        this.recoveryModal = dependencies.recoveryModal || window.recoveryModal;
        this.eventManager = dependencies.eventManager || window.eventManager;

        if (!this.gameState || !this.saveManager || !this.dataValidator) {
            throw new Error('StateRecoveryManager: Missing required dependencies');
        }

        console.log('StateRecoveryManager: Initialized with all dependencies');
    }

    /**
     * Attempt to load game state with automatic recovery on failure
     * @param {string} saveKey - Save key to load
     * @param {Object} options - Load options
     * @returns {Promise<boolean>} Success status
     */
    async loadWithRecovery(saveKey = 'main', options = {}) {
        const config = {
            validate: true,
            repair: true,
            showModal: true,
            ...options
        };

        try {
            console.log('StateRecoveryManager: Attempting to load save:', saveKey);

            // Attempt to load
            const loadedData = await this.saveManager.load(saveKey, {
                validate: config.validate,
                repair: config.repair
            });

            if (loadedData) {
                // Successfully loaded
                console.log('StateRecoveryManager: Save loaded successfully');
                return true;
            }

            // Load failed, attempt recovery
            console.warn('StateRecoveryManager: Save load failed, initiating recovery');
            return await this.initiateRecovery(saveKey, config);

        } catch (error) {
            console.error('StateRecoveryManager: Load error:', error);
            return await this.initiateRecovery(saveKey, config);
        }
    }

    /**
     * Initiate recovery process
     * @param {string} saveKey - Save key
     * @param {Object} config - Recovery configuration
     * @returns {Promise<boolean>} Success status
     */
    async initiateRecovery(saveKey, config = {}) {
        if (this.recoveryInProgress) {
            console.warn('StateRecoveryManager: Recovery already in progress');
            return false;
        }

        this.recoveryInProgress = true;

        try {
            // Gather recovery context
            const context = await this._gatherRecoveryContext(saveKey);

            // Determine recovery options
            const recoveryOptions = this._determineRecoveryOptions(context);

            if (recoveryOptions.length === 0) {
                console.error('StateRecoveryManager: No recovery options available');
                return await this._fallbackToDefault();
            }

            // Show recovery modal if enabled
            if (config.showModal && this.recoveryModal) {
                return await this._showRecoveryModal(context, recoveryOptions);
            } else {
                // Automatic recovery
                return await this._autoRecover(recoveryOptions);
            }

        } catch (error) {
            console.error('StateRecoveryManager: Recovery failed:', error);
            return await this._fallbackToDefault();
        } finally {
            this.recoveryInProgress = false;
        }
    }

    /**
     * Gather context for recovery
     * @param {string} saveKey - Save key
     * @returns {Promise<Object>} Recovery context
     */
    async _gatherRecoveryContext(saveKey) {
        const context = {
            saveKey,
            hasBackup: false,
            hasSnapshots: false,
            isRecoverable: false,
            corruptionInfo: null,
            backupKeys: [],
            snapshots: []
        };

        try {
            // Check for backups
            const backupPrefix = `${this.saveManager.storagePrefix}${saveKey}_backup_`;
            const allKeys = [];

            for (let i = 0; i < this.saveManager.storage.length; i++) {
                const key = this.saveManager.storage.key(i);
                if (key && key.startsWith(backupPrefix)) {
                    allKeys.push(key);
                }
            }

            context.hasBackup = allKeys.length > 0;
            context.backupKeys = allKeys;

            // Check for snapshots
            if (this.gameState.getSnapshots) {
                const snapshots = this.gameState.getSnapshots();
                context.hasSnapshots = snapshots.length > 0;
                context.snapshots = snapshots;
            }

            // Try to load corrupted data for analysis
            const rawData = this.saveManager.storage.getItem(
                this.saveManager._getStorageKey(saveKey)
            );

            if (rawData) {
                try {
                    const saveData = JSON.parse(rawData);
                    if (saveData.data) {
                        // Check corruption
                        const corruptionCheck = this.dataValidator.checkCorruption(saveData.data);
                        context.corruptionInfo = corruptionCheck;
                        context.isRecoverable = corruptionCheck.isRecoverable;
                    }
                } catch (error) {
                    context.corruptionInfo = {
                        isCorrupted: true,
                        severity: 'severe',
                        issues: ['Unable to parse save data'],
                        isRecoverable: false
                    };
                }
            }

        } catch (error) {
            console.error('StateRecoveryManager: Error gathering recovery context:', error);
        }

        return context;
    }

    /**
     * Determine available recovery options
     * @param {Object} context - Recovery context
     * @returns {Array} Recovery options
     */
    _determineRecoveryOptions(context) {
        const options = [];

        // Option 1: Repair corrupted data
        if (context.isRecoverable && context.corruptionInfo) {
            options.push({
                type: 'repair',
                action: 'repair',
                title: 'Automatic Repair',
                description: 'Attempt to automatically fix corrupted data. Some data may be lost.',
                priority: 1,
                handler: async () => await this._handleRepair(context)
            });
        }

        // Option 2: Restore from backup
        if (context.hasBackup && context.backupKeys.length > 0) {
            options.push({
                type: 'backup',
                action: 'loadBackup',
                title: 'Restore from Backup',
                description: 'Load the most recent backup save. Recent progress may be lost.',
                priority: 2,
                handler: async () => await this._handleBackupRestore(context)
            });
        }

        // Option 3: Rollback to snapshot
        if (context.hasSnapshots && context.snapshots.length > 0) {
            options.push({
                type: 'rollback',
                action: 'rollback',
                title: 'Rollback to Snapshot',
                description: 'Restore from an automatic snapshot. Recent changes will be lost.',
                priority: 3,
                handler: async () => await this._handleSnapshotRollback(context)
            });
        }

        // Option 4: Load default state
        options.push({
            type: 'default',
            action: 'loadDefault',
            title: 'Load Default State',
            description: 'Start with a fresh default state. All progress will be lost.',
            priority: 4,
            handler: async () => await this._handleDefaultLoad(context)
        });

        // Option 5: New game
        options.push({
            type: 'newGame',
            action: 'newGame',
            title: 'Start New Game',
            description: 'Begin a completely new game. All data will be reset.',
            priority: 5,
            handler: async () => await this._handleNewGame(context)
        });

        // Sort by priority
        return options.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Show recovery modal to user
     * @param {Object} context - Recovery context
     * @param {Array} options - Recovery options
     * @returns {Promise<boolean>} Success status
     */
    async _showRecoveryModal(context, options) {
        return new Promise((resolve) => {
            const modalOptions = options.map(opt => ({
                type: opt.type,
                action: opt.action,
                title: opt.title,
                description: opt.description
            }));

            this.recoveryModal.show(
                context.corruptionInfo || {},
                modalOptions,
                async (selectedOption) => {
                    const option = options.find(o => o.action === selectedOption.action);
                    if (option && option.handler) {
                        const success = await option.handler();
                        resolve(success);
                        return success;
                    }
                    resolve(false);
                    return false;
                }
            );
        });
    }

    /**
     * Automatic recovery without user interaction
     * @param {Array} options - Recovery options
     * @returns {Promise<boolean>} Success status
     */
    async _autoRecover(options) {
        // Try options in priority order
        for (const option of options) {
            if (option.handler) {
                console.log(`StateRecoveryManager: Attempting ${option.type} recovery`);
                const success = await option.handler();
                if (success) {
                    console.log(`StateRecoveryManager: ${option.type} recovery successful`);
                    return true;
                }
            }
        }

        console.error('StateRecoveryManager: All recovery options failed');
        return false;
    }

    /**
     * Handle repair recovery
     * @param {Object} context - Recovery context
     * @returns {Promise<boolean>} Success status
     */
    async _handleRepair(context) {
        try {
            const rawData = this.saveManager.storage.getItem(
                this.saveManager._getStorageKey(context.saveKey)
            );

            if (!rawData) return false;

            const saveData = JSON.parse(rawData);
            if (!saveData.data) return false;

            const repair = this.dataValidator.repairData(saveData.data);

            if (repair.success) {
                // Update game state with repaired data
                this.gameState.update(() => repair.data, { source: 'recovery_repair' });

                // Save repaired state
                await this.gameState.save({ backup: true });

                this._recordRecovery('repair', true, repair.repairs);
                return true;
            }

            return false;
        } catch (error) {
            console.error('StateRecoveryManager: Repair failed:', error);
            return false;
        }
    }

    /**
     * Handle backup restore
     * @param {Object} context - Recovery context
     * @returns {Promise<boolean>} Success status
     */
    async _handleBackupRestore(context) {
        try {
            if (context.backupKeys.length === 0) return false;

            // Use most recent backup (highest timestamp)
            const latestBackup = context.backupKeys.sort().reverse()[0];
            const backupData = this.saveManager.storage.getItem(latestBackup);

            if (!backupData) return false;

            const saveData = JSON.parse(backupData);
            this.gameState.update(() => saveData.data || saveData, { source: 'recovery_backup' });

            await this.gameState.save({ backup: false });

            this._recordRecovery('backup', true, [latestBackup]);
            return true;
        } catch (error) {
            console.error('StateRecoveryManager: Backup restore failed:', error);
            return false;
        }
    }

    /**
     * Handle snapshot rollback
     * @param {Object} context - Recovery context
     * @returns {Promise<boolean>} Success status
     */
    async _handleSnapshotRollback(context) {
        try {
            if (context.snapshots.length === 0) return false;

            // Use most recent snapshot
            const latestSnapshot = context.snapshots[context.snapshots.length - 1];
            const success = this.gameState.rollback(latestSnapshot.id);

            if (success) {
                await this.gameState.save({ backup: true });
                this._recordRecovery('rollback', true, [latestSnapshot.id]);
                return true;
            }

            return false;
        } catch (error) {
            console.error('StateRecoveryManager: Snapshot rollback failed:', error);
            return false;
        }
    }

    /**
     * Handle default state load
     * @param {Object} context - Recovery context
     * @returns {Promise<boolean>} Success status
     */
    async _handleDefaultLoad(context) {
        try {
            this.gameState.reset({ source: 'recovery_default' });
            await this.gameState.save({ backup: false });

            this._recordRecovery('default', true, []);
            return true;
        } catch (error) {
            console.error('StateRecoveryManager: Default load failed:', error);
            return false;
        }
    }

    /**
     * Handle new game
     * @param {Object} context - Recovery context
     * @returns {Promise<boolean>} Success status
     */
    async _handleNewGame(context) {
        try {
            // Clear all save data
            this.saveManager.delete(context.saveKey);

            // Reset to default state
            this.gameState.reset({ source: 'recovery_newgame' });

            // Clear snapshots
            if (this.gameState.clearSnapshots) {
                this.gameState.clearSnapshots(true);
            }

            await this.gameState.save({ backup: false });

            this._recordRecovery('newGame', true, []);
            return true;
        } catch (error) {
            console.error('StateRecoveryManager: New game failed:', error);
            return false;
        }
    }

    /**
     * Fallback to default state when all else fails
     * @returns {Promise<boolean>} Success status
     */
    async _fallbackToDefault() {
        console.warn('StateRecoveryManager: Falling back to default state');

        try {
            this.gameState.reset({ source: 'recovery_fallback' });
            await this.gameState.save({ backup: false });

            this._recordRecovery('fallback', true, []);
            return true;
        } catch (error) {
            console.error('StateRecoveryManager: Fallback failed:', error);
            return false;
        }
    }

    /**
     * Record recovery action in history
     * @param {string} type - Recovery type
     * @param {boolean} success - Success status
     * @param {Array} details - Recovery details
     */
    _recordRecovery(type, success, details) {
        const record = {
            type,
            success,
            details,
            timestamp: Date.now()
        };

        this.recoveryHistory.push(record);

        // Keep only last 10 recoveries
        if (this.recoveryHistory.length > 10) {
            this.recoveryHistory.shift();
        }

        if (this.eventManager) {
            this.eventManager.emit('stateRecovery:completed', record);
        }

        console.log('StateRecoveryManager: Recovery recorded:', record);
    }

    /**
     * Get recovery history
     * @returns {Array} Recovery history
     */
    getRecoveryHistory() {
        return [...this.recoveryHistory];
    }
}

// Create singleton instance
const stateRecoveryManager = new StateRecoveryManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateRecoveryManager, stateRecoveryManager };
} else if (typeof window !== 'undefined') {
    window.StateRecoveryManager = StateRecoveryManager;
    window.stateRecoveryManager = stateRecoveryManager;
}