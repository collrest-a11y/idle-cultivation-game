/**
 * SaveManager - Robust save system with compression, versioning, and data integrity
 * Handles LocalStorage with fallback, chunked storage, and atomic operations
 */
class SaveManager {
    constructor() {
        this.isEnabled = true;
        this.storagePrefix = 'idleCultivationGame_';
        this.maxChunkSize = 1024 * 1024; // 1MB per chunk
        this.maxSaveSlots = 10;
        this.compressionEnabled = true;
        this.encryptionEnabled = false; // Will be implemented later

        // Storage statistics
        this.stats = {
            totalSaves: 0,
            totalLoads: 0,
            totalFailures: 0,
            compressionRatio: 0,
            lastSaveTime: 0,
            lastLoadTime: 0,
            checkpointsCreated: 0,
            rollbacksPerformed: 0,
            corruptedCheckpoints: 0
        };

        // Checkpoint system configuration
        this.checkpointConfig = {
            intervals: {
                auto: 300000,        // 5 minutes
                milestone: 'event',  // On significant events
                error: 'immediate'   // Before error recovery
            },
            retention: {
                count: 10,           // Keep 10 checkpoints
                maxAge: 86400000,    // 24 hours max age
                criticalKeep: 3      // Always keep 3 critical checkpoints
            },
            validation: {
                enabled: true,
                strictMode: false,   // Allow minor inconsistencies
                autoRepair: true     // Attempt automatic repairs
            },
            performance: {
                maxCreationTime: 100,  // 100ms max for checkpoint creation
                maxRollbackTime: 500,  // 500ms max for rollback
                minInterval: 30000     // 30s minimum between checkpoints
            }
        };

        // Checkpoint storage and state
        this.checkpoints = new Map();
        this.lastCheckpointTime = 0;
        this.checkpointInProgress = false;
        this.rollbackStack = [];
        this.criticalCheckpoints = new Set();

        // Storage backend with fallback
        this.storage = this._initializeStorage();

        // Save operation queue for atomic operations
        this.saveQueue = [];
        this.isSaving = false;

        // Initialize checkpoint system
        this._initializeCheckpointSystem();

        console.log('SaveManager initialized with checkpoint system');
    }

    /**
     * Save data to storage with compression and chunking
     * @param {string} key - Storage key
     * @param {Object} data - Data to save
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Success status
     */
    async save(key, data, options = {}) {
        const config = {
            compress: this.compressionEnabled,
            validate: true,
            backup: false,
            slot: 'auto',
            ...options
        };

        try {
            // Queue the save operation for atomic processing
            return await this._queueSaveOperation(key, data, config);
        } catch (error) {
            console.error('SaveManager: Save failed:', error);
            this.stats.totalFailures++;
            return false;
        }
    }

    /**
     * Load data from storage with decompression and validation
     * @param {string} key - Storage key
     * @param {Object} options - Load options
     * @returns {Promise<Object|null>} Loaded data or null if failed
     */
    async load(key, options = {}) {
        const config = {
            validate: true,
            migrate: true,
            repair: true,
            ...options
        };

        try {
            this.stats.lastLoadTime = Date.now();

            const saveData = await this._loadFromStorage(key);
            if (!saveData) {
                return null;
            }

            // Validate checksum if present
            if (config.validate && saveData.checksum) {
                const isValid = await this._validateChecksum(saveData);
                if (!isValid) {
                    console.warn('SaveManager: Checksum validation failed for', key);
                    return await this._attemptRecovery(key);
                }
            }

            // Validate data integrity using DataValidator
            if (config.validate && typeof window !== 'undefined' && window.dataValidator) {
                const validation = window.dataValidator.validateGameState(saveData.data, { sanitize: false });

                if (!validation.isValid) {
                    console.warn('SaveManager: Data validation failed:', validation.errors);

                    // Check corruption level
                    const corruptionCheck = window.dataValidator.checkCorruption(saveData.data);

                    if (corruptionCheck.isCorrupted) {
                        console.warn('SaveManager: Corruption detected:', corruptionCheck);

                        // Attempt repair if enabled and corruption is recoverable
                        if (config.repair && corruptionCheck.isRecoverable) {
                            const repair = window.dataValidator.repairData(saveData.data);
                            if (repair.success) {
                                console.log('SaveManager: Data repaired successfully:', repair.repairs);
                                saveData.data = repair.data;
                            } else {
                                console.error('SaveManager: Data repair failed, attempting recovery');
                                return await this._attemptRecovery(key);
                            }
                        } else {
                            // Corruption is severe, attempt recovery
                            return await this._attemptRecovery(key);
                        }
                    }
                }
            }

            // Migrate data if needed
            if (config.migrate && saveData.version) {
                saveData.data = await this._migrateData(saveData.data, saveData.version);
            }

            this.stats.totalLoads++;
            return saveData.data;

        } catch (error) {
            console.error('SaveManager: Load failed:', error);
            this.stats.totalFailures++;
            return await this._attemptRecovery(key);
        }
    }

    /**
     * Delete save data and backups
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    delete(key) {
        try {
            // Delete main save
            this.storage.removeItem(this._getStorageKey(key));

            // Delete chunks if they exist
            this._deleteChunks(key);

            // Delete backups
            this._deleteBackups(key);

            return true;
        } catch (error) {
            console.error('SaveManager: Delete failed:', error);
            return false;
        }
    }

    /**
     * Export save data for backup/sharing
     * @param {string} key - Storage key
     * @param {Object} options - Export options
     * @returns {Promise<string>} Exported data as JSON string
     */
    async export(key, options = {}) {
        const config = {
            compress: false, // Keep exports uncompressed for readability
            includeMetadata: true,
            ...options
        };

        try {
            const data = await this.load(key, { validate: true });
            if (!data) {
                throw new Error('No save data found to export');
            }

            const exportData = {
                version: this._getCurrentVersion(),
                timestamp: Date.now(),
                checksum: await this._generateChecksum(data),
                metadata: config.includeMetadata ? this._getExportMetadata() : null,
                data: data
            };

            const jsonString = JSON.stringify(exportData, null, 2);

            if (config.compress) {
                return await this._compress(jsonString);
            }

            return jsonString;

        } catch (error) {
            console.error('SaveManager: Export failed:', error);
            throw error;
        }
    }

    /**
     * Import save data from backup/export
     * @param {string} jsonData - Exported data as JSON string
     * @param {string} key - Storage key to save to
     * @param {Object} options - Import options
     * @returns {Promise<boolean>} Success status
     */
    async import(jsonData, key, options = {}) {
        const config = {
            validate: true,
            overwrite: false,
            backup: true,
            ...options
        };

        try {
            // Check if key already exists and backup if needed
            if (!config.overwrite && await this._keyExists(key)) {
                if (config.backup) {
                    await this._createBackup(key);
                } else {
                    throw new Error('Save slot already exists and overwrite is disabled');
                }
            }

            // Parse imported data
            let importData;
            try {
                // Try to decompress first if it looks compressed
                if (this._isCompressed(jsonData)) {
                    jsonData = await this._decompress(jsonData);
                }
                importData = JSON.parse(jsonData);
            } catch (parseError) {
                throw new Error('Invalid import data format');
            }

            // Validate import structure
            if (!importData.data || !importData.version) {
                throw new Error('Invalid import data structure');
            }

            // Validate checksum if present
            if (config.validate && importData.checksum) {
                const isValid = await this._validateChecksum(importData);
                if (!isValid) {
                    throw new Error('Import data integrity check failed');
                }
            }

            // Migrate data if needed
            const migratedData = await this._migrateData(importData.data, importData.version);

            // Save the imported data
            const success = await this.save(key, migratedData, {
                validate: config.validate,
                compress: this.compressionEnabled
            });

            if (success) {
                console.log('SaveManager: Import successful for', key);
            }

            return success;

        } catch (error) {
            console.error('SaveManager: Import failed:', error);
            throw error;
        }
    }

    /**
     * List all available save slots
     * @returns {Array} Array of save slot information
     */
    listSaveSlots() {
        const slots = [];

        try {
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    const saveKey = key.substring(this.storagePrefix.length);
                    if (!saveKey.includes('_chunk_') && !saveKey.includes('_backup_')) {
                        slots.push({
                            key: saveKey,
                            size: this._getStorageSize(key),
                            lastModified: this._getLastModified(key),
                            isChunked: this._isChunked(saveKey)
                        });
                    }
                }
            }
        } catch (error) {
            console.error('SaveManager: Failed to list save slots:', error);
        }

        return slots.sort((a, b) => b.lastModified - a.lastModified);
    }

    /**
     * Get storage statistics and quota information
     * @returns {Object} Storage statistics
     */
    getStorageInfo() {
        const info = {
            stats: { ...this.stats },
            isEnabled: this.isEnabled,
            storageType: this.storage === localStorage ? 'localStorage' : 'memory',
            compressionEnabled: this.compressionEnabled,
            maxChunkSize: this.maxChunkSize,
            maxSaveSlots: this.maxSaveSlots
        };

        try {
            // Calculate storage usage
            let totalUsed = 0;
            let totalKeys = 0;

            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    totalUsed += this._getStorageSize(key);
                    totalKeys++;
                }
            }

            info.usage = {
                totalUsed,
                totalKeys,
                quota: this._getStorageQuota(),
                usagePercent: this._getStorageQuota() > 0 ? (totalUsed / this._getStorageQuota() * 100) : 0
            };

        } catch (error) {
            console.error('SaveManager: Failed to get storage info:', error);
            info.usage = { error: error.message };
        }

        return info;
    }

    /**
     * Clear all save data (with confirmation)
     * @param {boolean} confirmed - Confirmation flag
     * @returns {boolean} Success status
     */
    clearAllData(confirmed = false) {
        if (!confirmed) {
            throw new Error('clearAllData requires explicit confirmation');
        }

        try {
            const keysToDelete = [];

            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    keysToDelete.push(key);
                }
            }

            for (const key of keysToDelete) {
                this.storage.removeItem(key);
            }

            console.log(`SaveManager: Cleared ${keysToDelete.length} save entries`);
            return true;

        } catch (error) {
            console.error('SaveManager: Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Enable or disable the save system
     * @param {boolean} enabled - Whether to enable saves
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`SaveManager: ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    // ===== CHECKPOINT SYSTEM METHODS =====

    /**
     * Initialize checkpoint system
     */
    _initializeCheckpointSystem() {
        // Load existing checkpoints from storage
        this._loadExistingCheckpoints();

        // Set up automatic checkpoint intervals
        this._setupAutomaticCheckpointing();

        // Clean up old checkpoints
        this._cleanupOldCheckpoints();

        console.log('Checkpoint system initialized');
    }

    /**
     * Create a checkpoint of current game state
     * @param {Object} gameState - Current game state to checkpoint
     * @param {Object} options - Checkpoint options
     * @returns {Promise<string|null>} Checkpoint ID or null if failed
     */
    async createCheckpoint(gameState, options = {}) {
        const config = {
            triggerType: 'MANUAL',
            priority: 'normal',
            validate: true,
            compress: true,
            metadata: {},
            ...options
        };

        // Performance check - avoid checkpoints during rapid changes
        if (!this._shouldCreateCheckpoint(config)) {
            return null;
        }

        const startTime = performance.now();
        this.checkpointInProgress = true;

        try {
            // Validate state before checkpoint
            if (config.validate && !await this._validateStateForCheckpoint(gameState)) {
                console.warn('SaveManager: Checkpoint validation failed, skipping');
                return null;
            }

            // Generate checkpoint ID
            const checkpointId = this._generateCheckpointId(config.triggerType);

            // Create checkpoint data structure
            const checkpoint = await this._createCheckpointData(gameState, checkpointId, config);

            // Store checkpoint
            await this._storeCheckpoint(checkpoint);

            // Update checkpoint tracking
            this._updateCheckpointTracking(checkpoint);

            // Cleanup old checkpoints if needed
            await this._maintainCheckpointStorage();

            const duration = performance.now() - startTime;
            console.log(`Checkpoint ${checkpointId} created in ${duration.toFixed(2)}ms`);

            this.stats.checkpointsCreated++;
            this.lastCheckpointTime = Date.now();

            return checkpointId;

        } catch (error) {
            console.error('SaveManager: Checkpoint creation failed:', error);
            this.stats.totalFailures++;
            return null;
        } finally {
            this.checkpointInProgress = false;
        }
    }

    /**
     * Create automatic checkpoint based on game events
     * @param {Object} gameState - Current game state
     * @param {string} eventType - Type of event triggering checkpoint
     * @param {Object} eventData - Additional event data
     * @returns {Promise<string|null>} Checkpoint ID or null
     */
    async createAutomaticCheckpoint(gameState, eventType, eventData = {}) {
        const triggerTypes = {
            'level_up': 'MILESTONE',
            'stage_advance': 'MILESTONE',
            'major_purchase': 'MILESTONE',
            'achievement_unlock': 'MILESTONE',
            'prestige': 'MILESTONE',
            'error_recovery': 'ERROR_RECOVERY',
            'before_risky_operation': 'ERROR_RECOVERY',
            'interval': 'AUTO'
        };

        const triggerType = triggerTypes[eventType] || 'AUTO';
        const priority = triggerType === 'MILESTONE' ? 'high' : 'normal';

        return await this.createCheckpoint(gameState, {
            triggerType,
            priority,
            metadata: {
                eventType,
                eventData,
                automated: true
            }
        });
    }

    /**
     * Rollback to a specific checkpoint
     * @param {string} checkpointId - ID of checkpoint to rollback to
     * @param {Object} options - Rollback options
     * @returns {Promise<Object|null>} Restored state or null if failed
     */
    async rollbackToCheckpoint(checkpointId, options = {}) {
        const config = {
            validate: true,
            createBackup: true,
            strategy: 'full', // 'full', 'partial', 'progressive'
            confirmationRequired: false,
            ...options
        };

        const startTime = performance.now();

        try {
            // Get checkpoint data
            const checkpoint = await this._getCheckpoint(checkpointId);
            if (!checkpoint) {
                throw new Error(`Checkpoint ${checkpointId} not found`);
            }

            // Validate checkpoint integrity
            if (config.validate && !await this._validateCheckpoint(checkpoint)) {
                throw new Error(`Checkpoint ${checkpointId} is corrupted`);
            }

            // Check if confirmation is required for major rollbacks
            if (config.confirmationRequired && this._requiresConfirmation(checkpoint)) {
                const confirmed = await this._requestRollbackConfirmation(checkpoint);
                if (!confirmed) {
                    console.log('Rollback cancelled by user');
                    return null;
                }
            }

            // Create rollback backup of current state
            let rollbackBackup = null;
            if (config.createBackup) {
                rollbackBackup = await this._createRollbackBackup();
            }

            try {
                // Perform the rollback
                const restoredState = await this._performRollback(checkpoint, config);

                // Validate restored state
                if (config.validate && !await this._validateRestoredState(restoredState)) {
                    throw new Error('Restored state validation failed');
                }

                // Log successful rollback
                this._logRollback(checkpoint, 'SUCCESS', rollbackBackup);

                const duration = performance.now() - startTime;
                console.log(`Rollback to ${checkpointId} completed in ${duration.toFixed(2)}ms`);

                this.stats.rollbacksPerformed++;
                return restoredState;

            } catch (rollbackError) {
                // Rollback failed, restore from backup if available
                if (rollbackBackup) {
                    console.warn('Rollback failed, restoring from backup:', rollbackError);
                    await this._restoreFromRollbackBackup(rollbackBackup);
                }
                throw rollbackError;
            }

        } catch (error) {
            console.error('SaveManager: Rollback failed:', error);
            this.stats.totalFailures++;
            return null;
        }
    }

    /**
     * Get list of available checkpoints
     * @param {Object} filters - Optional filters for checkpoints
     * @returns {Array} Array of checkpoint metadata
     */
    getAvailableCheckpoints(filters = {}) {
        const checkpoints = Array.from(this.checkpoints.values());

        return checkpoints
            .filter(checkpoint => this._matchesFilters(checkpoint, filters))
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(checkpoint => ({
                id: checkpoint.id,
                timestamp: checkpoint.timestamp,
                triggerType: checkpoint.triggerType,
                gameVersion: checkpoint.gameVersion,
                size: checkpoint.compressedSize || checkpoint.originalSize,
                metadata: checkpoint.metadata,
                isValid: checkpoint.validation?.isValid || false,
                isCritical: this.criticalCheckpoints.has(checkpoint.id)
            }));
    }

    /**
     * Delete a specific checkpoint
     * @param {string} checkpointId - ID of checkpoint to delete
     * @param {boolean} force - Force deletion even if critical
     * @returns {boolean} Success status
     */
    async deleteCheckpoint(checkpointId, force = false) {
        try {
            // Check if it's a critical checkpoint
            if (!force && this.criticalCheckpoints.has(checkpointId)) {
                console.warn('Cannot delete critical checkpoint without force flag');
                return false;
            }

            // Remove from storage
            const storageKey = this._getCheckpointStorageKey(checkpointId);
            this.storage.removeItem(storageKey);

            // Remove from memory
            this.checkpoints.delete(checkpointId);
            this.criticalCheckpoints.delete(checkpointId);

            console.log(`Checkpoint ${checkpointId} deleted`);
            return true;

        } catch (error) {
            console.error('SaveManager: Failed to delete checkpoint:', error);
            return false;
        }
    }

    /**
     * Progressive rollback - try newer checkpoints first
     * @param {Object} options - Rollback options
     * @returns {Promise<Object|null>} Restored state or null
     */
    async progressiveRollback(options = {}) {
        const checkpoints = this.getAvailableCheckpoints({
            triggerType: options.triggerType,
            maxAge: options.maxAge || this.checkpointConfig.retention.maxAge
        });

        for (const checkpointMeta of checkpoints) {
            try {
                console.log(`Attempting rollback to checkpoint ${checkpointMeta.id}`);
                const restoredState = await this.rollbackToCheckpoint(checkpointMeta.id, {
                    ...options,
                    validate: true,
                    createBackup: false // Don't create multiple backups
                });

                if (restoredState) {
                    console.log(`Progressive rollback successful with checkpoint ${checkpointMeta.id}`);
                    return restoredState;
                }
            } catch (error) {
                console.warn(`Checkpoint ${checkpointMeta.id} failed, trying next:`, error);
                continue;
            }
        }

        console.error('Progressive rollback failed - no valid checkpoints found');
        return null;
    }

    // ===== CHECKPOINT PRIVATE METHODS =====

    /**
     * Load existing checkpoints from storage
     */
    _loadExistingCheckpoints() {
        try {
            const checkpointPrefix = this.storagePrefix + 'checkpoint_';
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(checkpointPrefix)) {
                    const checkpointData = this.storage.getItem(key);
                    if (checkpointData) {
                        const checkpoint = JSON.parse(checkpointData);
                        this.checkpoints.set(checkpoint.id, checkpoint);

                        // Mark as critical if it's a milestone checkpoint
                        if (checkpoint.triggerType === 'MILESTONE' || checkpoint.priority === 'high') {
                            this.criticalCheckpoints.add(checkpoint.id);
                        }
                    }
                }
            }
            console.log(`Loaded ${this.checkpoints.size} existing checkpoints`);
        } catch (error) {
            console.error('Failed to load existing checkpoints:', error);
        }
    }

    /**
     * Set up automatic checkpoint intervals
     */
    _setupAutomaticCheckpointing() {
        // Set up interval-based checkpointing
        if (this.checkpointConfig.intervals.auto > 0) {
            setInterval(() => {
                if (window.game && window.game.gameState && this.isEnabled) {
                    this.createAutomaticCheckpoint(window.game.gameState.exportState(), 'interval');
                }
            }, this.checkpointConfig.intervals.auto);
        }
    }

    /**
     * Get checkpoint storage key
     */
    _getCheckpointStorageKey(checkpointId) {
        return this.storagePrefix + 'checkpoint_' + checkpointId;
    }

    /**
     * Check if a checkpoint should be created based on timing and performance
     */
    _shouldCreateCheckpoint(config) {
        const now = Date.now();

        // Check minimum interval between checkpoints
        if (now - this.lastCheckpointTime < this.checkpointConfig.performance.minInterval) {
            return false;
        }

        // Don't create checkpoint if one is already in progress
        if (this.checkpointInProgress) {
            return false;
        }

        // Allow high priority checkpoints to bypass some restrictions
        if (config.priority === 'high' || config.triggerType === 'ERROR_RECOVERY') {
            return true;
        }

        // Check if system is under heavy load
        if (this._isSystemUnderLoad()) {
            return false;
        }

        return true;
    }

    /**
     * Validate game state before creating checkpoint
     */
    async _validateStateForCheckpoint(gameState) {
        try {
            // Basic null/undefined check
            if (!gameState || typeof gameState !== 'object') {
                return false;
            }

            // Use data validator if available
            if (typeof window !== 'undefined' && window.dataValidator) {
                const validation = window.dataValidator.validateGameState(gameState, {
                    sanitize: false,
                    strict: this.checkpointConfig.validation.strictMode
                });

                if (!validation.isValid) {
                    console.warn('Checkpoint validation failed:', validation.errors);
                    return this.checkpointConfig.validation.autoRepair && validation.isRepairable;
                }
            }

            // Check for basic corruption indicators
            return this._checkBasicStateIntegrity(gameState);
        } catch (error) {
            console.error('State validation failed:', error);
            return false;
        }
    }

    /**
     * Check basic state integrity
     */
    _checkBasicStateIntegrity(gameState) {
        try {
            // Check for circular references
            JSON.stringify(gameState);

            // Check for NaN/Infinity values in numeric fields
            const checkForBadNumbers = (obj, path = '') => {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'number') {
                        if (isNaN(value) || !isFinite(value)) {
                            console.warn(`Bad number found at ${path}.${key}:`, value);
                            return false;
                        }
                    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                        if (!checkForBadNumbers(value, `${path}.${key}`)) {
                            return false;
                        }
                    }
                }
                return true;
            };

            return checkForBadNumbers(gameState);
        } catch (error) {
            console.error('Basic integrity check failed:', error);
            return false;
        }
    }

    /**
     * Generate unique checkpoint ID
     */
    _generateCheckpointId(triggerType) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `checkpoint_${timestamp}_${triggerType}_${random}`;
    }

    /**
     * Create checkpoint data structure
     */
    async _createCheckpointData(gameState, checkpointId, config) {
        const timestamp = Date.now();

        // Create checkpoint structure
        const checkpoint = {
            id: checkpointId,
            timestamp: timestamp,
            gameVersion: this._getCurrentVersion(),
            triggerType: config.triggerType,
            priority: config.priority,

            // Core game state (deep clone to avoid mutations)
            gameState: JSON.parse(JSON.stringify(gameState)),

            // Metadata
            metadata: {
                ...config.metadata,
                createdAt: timestamp,
                size: 0,
                compressed: false
            },

            // Validation info
            validation: {
                isValid: true,
                checksum: await this._generateChecksum(gameState),
                checks: ['integrity', 'consistency'],
                errors: []
            }
        };

        // Calculate sizes
        const serialized = JSON.stringify(checkpoint);
        checkpoint.originalSize = serialized.length;

        // Apply compression if enabled
        if (config.compress) {
            const compressed = await this._compress(serialized);
            if (compressed.length < serialized.length) {
                checkpoint.compressed = true;
                checkpoint.compressedSize = compressed.length;
                checkpoint.compressionRatio = compressed.length / serialized.length;
            }
        }

        return checkpoint;
    }

    /**
     * Store checkpoint to storage
     */
    async _storeCheckpoint(checkpoint) {
        const storageKey = this._getCheckpointStorageKey(checkpoint.id);
        let dataToStore = JSON.stringify(checkpoint);

        // Apply compression if marked as compressed
        if (checkpoint.compressed) {
            dataToStore = await this._compress(dataToStore);
        }

        // Handle chunking for large checkpoints
        if (dataToStore.length > this.maxChunkSize) {
            await this._storeCheckpointChunked(checkpoint.id, dataToStore);
        } else {
            this.storage.setItem(storageKey, dataToStore);
        }

        // Store in memory for quick access
        this.checkpoints.set(checkpoint.id, checkpoint);
    }

    /**
     * Store large checkpoint using chunking
     */
    async _storeCheckpointChunked(checkpointId, data) {
        const chunks = this._createChunks(data, this.maxChunkSize);
        const chunkPrefix = this._getCheckpointStorageKey(checkpointId) + '_chunk_';

        // Store chunks
        for (let i = 0; i < chunks.length; i++) {
            this.storage.setItem(chunkPrefix + i, chunks[i]);
        }

        // Store metadata
        const metadata = {
            chunked: true,
            chunkCount: chunks.length,
            totalSize: data.length
        };
        this.storage.setItem(this._getCheckpointStorageKey(checkpointId), JSON.stringify(metadata));
    }

    /**
     * Update checkpoint tracking
     */
    _updateCheckpointTracking(checkpoint) {
        // Mark as critical if it's a milestone
        if (checkpoint.triggerType === 'MILESTONE' || checkpoint.priority === 'high') {
            this.criticalCheckpoints.add(checkpoint.id);
        }

        // Update rollback stack (keep last 5 for quick access)
        this.rollbackStack.push({
            id: checkpoint.id,
            timestamp: checkpoint.timestamp,
            triggerType: checkpoint.triggerType
        });

        if (this.rollbackStack.length > 5) {
            this.rollbackStack.shift();
        }
    }

    /**
     * Maintain checkpoint storage by cleaning up if needed
     */
    async _maintainCheckpointStorage() {
        // Check if we exceed count limits
        if (this.checkpoints.size > this.checkpointConfig.retention.count) {
            await this._cleanupOldCheckpoints();
        }

        // Check storage quota if available
        const usage = this.getStorageInfo().usage;
        if (usage && usage.usagePercent > 80) {
            console.warn('Storage usage high, cleaning up old checkpoints');
            await this._cleanupOldCheckpoints();
        }
    }

    /**
     * Clean up old checkpoints based on retention policy
     */
    async _cleanupOldCheckpoints() {
        try {
            const now = Date.now();
            const maxAge = this.checkpointConfig.retention.maxAge;
            const maxCount = this.checkpointConfig.retention.count;
            const criticalKeep = this.checkpointConfig.retention.criticalKeep;

            const checkpoints = Array.from(this.checkpoints.values());

            // Sort by timestamp (newest first)
            checkpoints.sort((a, b) => b.timestamp - a.timestamp);

            let criticalCount = 0;
            const toDelete = [];

            for (let i = 0; i < checkpoints.length; i++) {
                const checkpoint = checkpoints[i];
                const age = now - checkpoint.timestamp;
                const isCritical = this.criticalCheckpoints.has(checkpoint.id);

                // Keep critical checkpoints up to limit
                if (isCritical && criticalCount < criticalKeep) {
                    criticalCount++;
                    continue;
                }

                // Delete if too old or beyond count limit
                if (age > maxAge || i >= maxCount) {
                    toDelete.push(checkpoint.id);
                }
            }

            // Delete marked checkpoints
            for (const checkpointId of toDelete) {
                await this.deleteCheckpoint(checkpointId, false);
            }

            if (toDelete.length > 0) {
                console.log(`Cleaned up ${toDelete.length} old checkpoints`);
            }
        } catch (error) {
            console.error('Failed to cleanup old checkpoints:', error);
        }
    }

    /**
     * Get checkpoint from storage or memory
     */
    async _getCheckpoint(checkpointId) {
        // Try memory first
        if (this.checkpoints.has(checkpointId)) {
            return this.checkpoints.get(checkpointId);
        }

        // Load from storage
        try {
            const storageKey = this._getCheckpointStorageKey(checkpointId);
            const data = this.storage.getItem(storageKey);

            if (!data) {
                return null;
            }

            // Parse checkpoint data
            let checkpoint;
            try {
                checkpoint = JSON.parse(data);
            } catch (parseError) {
                // Might be compressed data
                const decompressed = await this._decompress(data);
                checkpoint = JSON.parse(decompressed);
            }

            // Store in memory for future access
            if (checkpoint) {
                this.checkpoints.set(checkpointId, checkpoint);
            }

            return checkpoint;
        } catch (error) {
            console.error(`Failed to load checkpoint ${checkpointId}:`, error);
            return null;
        }
    }

    /**
     * Validate checkpoint integrity
     */
    async _validateCheckpoint(checkpoint) {
        try {
            // Basic structure validation
            if (!checkpoint.id || !checkpoint.gameState || !checkpoint.validation) {
                return false;
            }

            // Checksum validation
            if (checkpoint.validation.checksum) {
                const computedChecksum = await this._generateChecksum(checkpoint.gameState);
                if (computedChecksum !== checkpoint.validation.checksum) {
                    console.warn(`Checkpoint ${checkpoint.id} checksum mismatch`);
                    this.stats.corruptedCheckpoints++;
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Checkpoint validation failed:', error);
            return false;
        }
    }

    /**
     * Check if checkpoint matches filters
     */
    _matchesFilters(checkpoint, filters) {
        if (filters.triggerType && checkpoint.triggerType !== filters.triggerType) {
            return false;
        }

        if (filters.maxAge && (Date.now() - checkpoint.timestamp) > filters.maxAge) {
            return false;
        }

        if (filters.minTimestamp && checkpoint.timestamp < filters.minTimestamp) {
            return false;
        }

        if (filters.priority && checkpoint.priority !== filters.priority) {
            return false;
        }

        return true;
    }

    /**
     * Check if rollback requires user confirmation
     */
    _requiresConfirmation(checkpoint) {
        const now = Date.now();
        const timeLoss = now - checkpoint.timestamp;
        const oneHour = 60 * 60 * 1000;

        // Require confirmation for rollbacks losing more than 1 hour
        return timeLoss > oneHour;
    }

    /**
     * Request user confirmation for major rollback
     */
    async _requestRollbackConfirmation(checkpoint) {
        const timeLoss = Date.now() - checkpoint.timestamp;
        const hours = Math.floor(timeLoss / (60 * 60 * 1000));
        const minutes = Math.floor((timeLoss % (60 * 60 * 1000)) / (60 * 1000));

        const message = `This rollback will lose ${hours}h ${minutes}m of progress. Continue?`;

        return new Promise((resolve) => {
            if (confirm(message)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }

    /**
     * Create rollback backup of current state
     */
    async _createRollbackBackup() {
        try {
            if (window.game && window.game.gameState) {
                const currentState = window.game.gameState.exportState();
                const backupId = `rollback_backup_${Date.now()}`;

                const backup = {
                    id: backupId,
                    timestamp: Date.now(),
                    gameState: currentState,
                    type: 'rollback_backup'
                };

                // Store temporarily
                const storageKey = this.storagePrefix + backupId;
                this.storage.setItem(storageKey, JSON.stringify(backup));

                return backupId;
            }
            return null;
        } catch (error) {
            console.error('Failed to create rollback backup:', error);
            return null;
        }
    }

    /**
     * Perform the actual rollback operation
     */
    async _performRollback(checkpoint, config) {
        try {
            const restoredState = JSON.parse(JSON.stringify(checkpoint.gameState));
            return restoredState;
        } catch (error) {
            throw new Error(`Rollback operation failed: ${error.message}`);
        }
    }

    /**
     * Validate restored state after rollback
     */
    async _validateRestoredState(restoredState) {
        return await this._validateStateForCheckpoint(restoredState);
    }

    /**
     * Log rollback operation
     */
    _logRollback(checkpoint, status, backupId = null) {
        const rollbackLog = {
            timestamp: Date.now(),
            checkpointId: checkpoint.id,
            checkpointTimestamp: checkpoint.timestamp,
            status: status,
            backupId: backupId,
            timeLoss: Date.now() - checkpoint.timestamp
        };

        console.log('Rollback operation logged:', rollbackLog);

        // Store in session for debugging
        try {
            const existing = JSON.parse(sessionStorage.getItem('rollbackLog') || '[]');
            existing.push(rollbackLog);
            sessionStorage.setItem('rollbackLog', JSON.stringify(existing.slice(-20))); // Keep last 20
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Restore from rollback backup
     */
    async _restoreFromRollbackBackup(backupId) {
        try {
            const storageKey = this.storagePrefix + backupId;
            const backupData = this.storage.getItem(storageKey);

            if (backupData) {
                const backup = JSON.parse(backupData);

                // Clean up backup after use
                this.storage.removeItem(storageKey);

                return backup.gameState;
            }

            throw new Error('Rollback backup not found');
        } catch (error) {
            throw new Error(`Failed to restore from rollback backup: ${error.message}`);
        }
    }

    /**
     * Check if system is under heavy load
     */
    _isSystemUnderLoad() {
        try {
            // Check memory usage if available
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
                if (memoryUsage > 0.9) {
                    return true;
                }
            }

            // Check if there are many pending save operations
            if (this.saveQueue.length > 5) {
                return true;
            }

            return false;
        } catch (error) {
            // Assume not under load if we can't check
            return false;
        }
    }

    // Private methods

    /**
     * Initialize storage backend with fallback to memory
     * @returns {Storage} Storage interface
     */
    _initializeStorage() {
        try {
            // Test localStorage availability
            const testKey = this.storagePrefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);

            console.log('SaveManager: Using localStorage');
            return localStorage;

        } catch (error) {
            console.warn('SaveManager: localStorage unavailable, using memory storage');

            // Fallback to in-memory storage
            return this._createMemoryStorage();
        }
    }

    /**
     * Create in-memory storage fallback
     * @returns {Object} Memory storage interface
     */
    _createMemoryStorage() {
        const memoryStore = new Map();

        return {
            getItem: (key) => memoryStore.get(key) || null,
            setItem: (key, value) => memoryStore.set(key, value),
            removeItem: (key) => memoryStore.delete(key),
            clear: () => memoryStore.clear(),
            get length() { return memoryStore.size; },
            key: (index) => Array.from(memoryStore.keys())[index] || null
        };
    }

    /**
     * Queue save operation for atomic processing
     * @param {string} key - Storage key
     * @param {Object} data - Data to save
     * @param {Object} config - Save configuration
     * @returns {Promise<boolean>} Success status
     */
    async _queueSaveOperation(key, data, config) {
        return new Promise((resolve, reject) => {
            this.saveQueue.push({
                key,
                data,
                config,
                resolve,
                reject
            });

            this._processSaveQueue();
        });
    }

    /**
     * Process queued save operations atomically
     */
    async _processSaveQueue() {
        if (this.isSaving || this.saveQueue.length === 0) {
            return;
        }

        this.isSaving = true;

        while (this.saveQueue.length > 0) {
            const operation = this.saveQueue.shift();

            try {
                const success = await this._performSave(operation.key, operation.data, operation.config);
                operation.resolve(success);
            } catch (error) {
                operation.reject(error);
            }
        }

        this.isSaving = false;
    }

    /**
     * Perform the actual save operation
     * @param {string} key - Storage key
     * @param {Object} data - Data to save
     * @param {Object} config - Save configuration
     * @returns {Promise<boolean>} Success status
     */
    async _performSave(key, data, config) {
        if (!this.isEnabled) {
            console.warn('SaveManager: Save attempted while disabled');
            return false;
        }

        this.stats.lastSaveTime = Date.now();

        // Validate data before saving if validator is available
        if (config.validate && typeof window !== 'undefined' && window.dataValidator) {
            // Skip validation if no character exists yet (pre-game state)
            const hasCharacter = data && (data.player || data.character || data.characterCreated);
            if (!hasCharacter) {
                console.log('SaveManager: Skipping validation - no character created yet');
                return true; // Don't save pre-character state
            }

            const validation = window.dataValidator.validateGameState(data, { sanitize: false });
            if (!validation.isValid) {
                console.error('SaveManager: Cannot save invalid data:', validation.errors);
                throw new Error('Save validation failed: ' + validation.errors.join(', '));
            }
        }

        // Create backup if requested or if this is a risky operation
        if ((config.backup || config.risky) && await this._keyExists(key)) {
            const backupSuccess = await this._createBackup(key);
            if (!backupSuccess && config.risky) {
                console.error('SaveManager: Cannot perform risky operation without backup');
                throw new Error('Backup creation failed before risky operation');
            }
        }

        // Prepare save data
        const saveData = {
            version: this._getCurrentVersion(),
            timestamp: Date.now(),
            checksum: await this._generateChecksum(data),
            data: data
        };

        // Serialize data
        let serializedData = JSON.stringify(saveData);
        const originalSize = serializedData.length;

        // Compress if enabled
        if (config.compress) {
            const compressedData = await this._compress(serializedData);
            if (compressedData.length < serializedData.length) {
                serializedData = compressedData;
                saveData.compressed = true;
            }
        }

        // Calculate compression ratio
        this.stats.compressionRatio = originalSize > 0 ? serializedData.length / originalSize : 1;

        // Handle chunking for large saves
        if (serializedData.length > this.maxChunkSize) {
            return await this._saveChunked(key, serializedData, saveData);
        } else {
            return await this._saveDirect(key, serializedData);
        }
    }

    /**
     * Save data directly to storage
     * @param {string} key - Storage key
     * @param {string} data - Serialized data
     * @returns {boolean} Success status
     */
    async _saveDirect(key, data) {
        try {
            this.storage.setItem(this._getStorageKey(key), data);
            this.stats.totalSaves++;
            return true;
        } catch (error) {
            console.error('SaveManager: Direct save failed:', error);
            throw error;
        }
    }

    /**
     * Save large data using chunking
     * @param {string} key - Storage key
     * @param {string} data - Serialized data
     * @param {Object} metadata - Save metadata
     * @returns {boolean} Success status
     */
    async _saveChunked(key, data, metadata) {
        try {
            const chunks = this._createChunks(data, this.maxChunkSize);

            // Delete existing chunks first
            this._deleteChunks(key);

            // Save chunks
            for (let i = 0; i < chunks.length; i++) {
                const chunkKey = this._getChunkKey(key, i);
                this.storage.setItem(chunkKey, chunks[i]);
            }

            // Save metadata with chunk info
            const chunkMetadata = {
                ...metadata,
                chunked: true,
                chunkCount: chunks.length,
                totalSize: data.length
            };

            this.storage.setItem(this._getStorageKey(key), JSON.stringify(chunkMetadata));
            this.stats.totalSaves++;

            return true;

        } catch (error) {
            console.error('SaveManager: Chunked save failed:', error);
            // Clean up partial chunks on failure
            this._deleteChunks(key);
            throw error;
        }
    }

    /**
     * Load data from storage
     * @param {string} key - Storage key
     * @returns {Promise<Object|null>} Loaded save data
     */
    async _loadFromStorage(key) {
        try {
            const storageKey = this._getStorageKey(key);
            const rawData = this.storage.getItem(storageKey);

            if (!rawData) {
                return null;
            }

            // Try to parse as metadata first
            let metadata;
            try {
                metadata = JSON.parse(rawData);
            } catch (parseError) {
                // Might be direct compressed data
                return await this._loadDirect(rawData);
            }

            // Check if it's chunked data
            if (metadata.chunked) {
                return await this._loadChunked(key, metadata);
            } else {
                // It's metadata with embedded data
                return metadata;
            }

        } catch (error) {
            console.error('SaveManager: Load from storage failed:', error);
            throw error;
        }
    }

    /**
     * Load data directly (non-chunked)
     * @param {string} rawData - Raw storage data
     * @returns {Promise<Object>} Parsed save data
     */
    async _loadDirect(rawData) {
        let data = rawData;

        // Try decompression if it looks compressed
        if (this._isCompressed(data)) {
            data = await this._decompress(data);
        }

        return JSON.parse(data);
    }

    /**
     * Load chunked data
     * @param {string} key - Storage key
     * @param {Object} metadata - Chunk metadata
     * @returns {Promise<Object>} Assembled save data
     */
    async _loadChunked(key, metadata) {
        try {
            const chunks = [];

            for (let i = 0; i < metadata.chunkCount; i++) {
                const chunkKey = this._getChunkKey(key, i);
                const chunk = this.storage.getItem(chunkKey);

                if (!chunk) {
                    throw new Error(`Missing chunk ${i} for save ${key}`);
                }

                chunks.push(chunk);
            }

            const assembledData = chunks.join('');

            // Decompress if needed
            let finalData = assembledData;
            if (metadata.compressed || this._isCompressed(assembledData)) {
                finalData = await this._decompress(assembledData);
            }

            const saveData = JSON.parse(finalData);
            return saveData;

        } catch (error) {
            console.error('SaveManager: Chunked load failed:', error);
            throw error;
        }
    }

    /**
     * Generate storage key with prefix
     * @param {string} key - Base key
     * @returns {string} Full storage key
     */
    _getStorageKey(key) {
        return this.storagePrefix + key;
    }

    /**
     * Generate chunk storage key
     * @param {string} key - Base key
     * @param {number} index - Chunk index
     * @returns {string} Chunk storage key
     */
    _getChunkKey(key, index) {
        return `${this.storagePrefix}${key}_chunk_${index}`;
    }

    /**
     * Generate backup storage key
     * @param {string} key - Base key
     * @returns {string} Backup storage key
     */
    _getBackupKey(key) {
        return `${this.storagePrefix}${key}_backup_${Date.now()}`;
    }

    /**
     * Check if a key exists in storage
     * @param {string} key - Storage key
     * @returns {boolean} Whether key exists
     */
    async _keyExists(key) {
        return this.storage.getItem(this._getStorageKey(key)) !== null;
    }

    /**
     * Create chunks from data
     * @param {string} data - Data to chunk
     * @param {number} chunkSize - Size per chunk
     * @returns {Array} Array of chunks
     */
    _createChunks(data, chunkSize) {
        const chunks = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            chunks.push(data.substring(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Delete all chunks for a key
     * @param {string} key - Base key
     */
    _deleteChunks(key) {
        try {
            let chunkIndex = 0;
            while (true) {
                const chunkKey = this._getChunkKey(key, chunkIndex);
                const chunk = this.storage.getItem(chunkKey);

                if (!chunk) {
                    break; // No more chunks
                }

                this.storage.removeItem(chunkKey);
                chunkIndex++;
            }
        } catch (error) {
            console.error('SaveManager: Failed to delete chunks:', error);
        }
    }

    /**
     * Delete backups for a key
     * @param {string} key - Base key
     */
    _deleteBackups(key) {
        try {
            const backupPrefix = `${this.storagePrefix}${key}_backup_`;
            const keysToDelete = [];

            for (let i = 0; i < this.storage.length; i++) {
                const storageKey = this.storage.key(i);
                if (storageKey && storageKey.startsWith(backupPrefix)) {
                    keysToDelete.push(storageKey);
                }
            }

            for (const keyToDelete of keysToDelete) {
                this.storage.removeItem(keyToDelete);
            }
        } catch (error) {
            console.error('SaveManager: Failed to delete backups:', error);
        }
    }

    /**
     * Create a backup of existing save data
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Success status
     */
    async _createBackup(key) {
        try {
            const existingData = this.storage.getItem(this._getStorageKey(key));
            if (existingData) {
                const backupKey = this._getBackupKey(key);
                this.storage.setItem(backupKey, existingData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('SaveManager: Backup creation failed:', error);
            return false;
        }
    }

    /**
     * Attempt to recover from backup or return null
     * @param {string} key - Storage key
     * @returns {Promise<Object|null>} Recovered data or null
     */
    async _attemptRecovery(key) {
        console.log('SaveManager: Attempting recovery for', key);

        // Try to find the most recent backup
        const backupPrefix = `${this.storagePrefix}${key}_backup_`;
        let latestBackup = null;
        let latestTimestamp = 0;

        try {
            for (let i = 0; i < this.storage.length; i++) {
                const storageKey = this.storage.key(i);
                if (storageKey && storageKey.startsWith(backupPrefix)) {
                    const timestamp = parseInt(storageKey.split('_backup_')[1]);
                    if (timestamp > latestTimestamp) {
                        latestTimestamp = timestamp;
                        latestBackup = storageKey;
                    }
                }
            }

            if (latestBackup) {
                const backupData = this.storage.getItem(latestBackup);
                if (backupData) {
                    console.log('SaveManager: Recovered from backup:', latestBackup);
                    const recoveredData = await this._loadDirect(backupData);
                    return recoveredData.data;
                }
            }
        } catch (error) {
            console.error('SaveManager: Recovery failed:', error);
        }

        console.warn('SaveManager: No recovery possible for', key);
        return null;
    }

    /**
     * Check if data is chunked
     * @param {string} key - Storage key
     * @returns {boolean} Whether data is chunked
     */
    _isChunked(key) {
        try {
            const data = this.storage.getItem(this._getStorageKey(key));
            if (data) {
                const metadata = JSON.parse(data);
                return !!metadata.chunked;
            }
        } catch (error) {
            // Ignore parse errors
        }
        return false;
    }

    /**
     * Get storage size for a key
     * @param {string} key - Storage key
     * @returns {number} Size in bytes
     */
    _getStorageSize(key) {
        try {
            const data = this.storage.getItem(key);
            return data ? data.length : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get last modified timestamp for a key
     * @param {string} key - Storage key
     * @returns {number} Timestamp
     */
    _getLastModified(key) {
        try {
            const data = this.storage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.timestamp || 0;
            }
        } catch (error) {
            // Ignore parse errors
        }
        return 0;
    }

    /**
     * Get storage quota (if available)
     * @returns {number} Storage quota in bytes
     */
    _getStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                return navigator.storage.estimate().then(estimate => estimate.quota || 0);
            }
            // Fallback estimate for localStorage (usually 5-10MB)
            return 5 * 1024 * 1024;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get current save format version
     * @returns {string} Version string
     */
    _getCurrentVersion() {
        return '1.0.0';
    }

    /**
     * Generate checksum for data integrity
     * @param {Object} data - Data to checksum
     * @returns {Promise<string>} Checksum string
     */
    async _generateChecksum(data) {
        try {
            const jsonString = JSON.stringify(data, Object.keys(data).sort());

            // Use Web Crypto API if available
            if (window.crypto && window.crypto.subtle) {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(jsonString);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                // Fallback to simple hash
                return this._simpleHash(jsonString);
            }
        } catch (error) {
            console.warn('SaveManager: Checksum generation failed, using simple hash');
            return this._simpleHash(JSON.stringify(data));
        }
    }

    /**
     * Simple hash function fallback
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Validate checksum of save data
     * @param {Object} saveData - Save data with checksum
     * @returns {Promise<boolean>} Whether checksum is valid
     */
    async _validateChecksum(saveData) {
        try {
            const computedChecksum = await this._generateChecksum(saveData.data);
            return computedChecksum === saveData.checksum;
        } catch (error) {
            console.error('SaveManager: Checksum validation error:', error);
            return false;
        }
    }

    /**
     * Compress data using built-in compression or fallback
     * @param {string} data - Data to compress
     * @returns {Promise<string>} Compressed data
     */
    async _compress(data) {
        try {
            // Check if Compression utility is available
            if (typeof window !== 'undefined' && window.CompressionUtil) {
                return await window.CompressionUtil.compress(data);
            }

            // Fallback: no compression
            return data;
        } catch (error) {
            console.warn('SaveManager: Compression failed, using uncompressed data');
            return data;
        }
    }

    /**
     * Decompress data
     * @param {string} data - Compressed data
     * @returns {Promise<string>} Decompressed data
     */
    async _decompress(data) {
        try {
            // Check if Compression utility is available
            if (typeof window !== 'undefined' && window.CompressionUtil) {
                return await window.CompressionUtil.decompress(data);
            }

            // Fallback: assume uncompressed
            return data;
        } catch (error) {
            console.warn('SaveManager: Decompression failed, using data as-is');
            return data;
        }
    }

    /**
     * Check if data appears to be compressed
     * @param {string} data - Data to check
     * @returns {boolean} Whether data appears compressed
     */
    _isCompressed(data) {
        try {
            // Try to parse as JSON - if it fails, might be compressed
            JSON.parse(data);
            return false;
        } catch (error) {
            // If CompressionUtil is available, check with it
            if (typeof window !== 'undefined' && window.CompressionUtil) {
                return window.CompressionUtil.isCompressed(data);
            }
            return false;
        }
    }

    /**
     * Migrate save data to current version
     * @param {Object} data - Save data to migrate
     * @param {string} version - Current version of data
     * @returns {Promise<Object>} Migrated data
     */
    async _migrateData(data, version) {
        try {
            // Check if MigrationManager is available
            if (typeof window !== 'undefined' && window.MigrationManager) {
                return await window.MigrationManager.migrate(data, version, this._getCurrentVersion());
            }

            // Fallback: no migration
            return data;
        } catch (error) {
            console.warn('SaveManager: Migration failed, using data as-is:', error);
            return data;
        }
    }

    /**
     * Get export metadata
     * @returns {Object} Export metadata
     */
    _getExportMetadata() {
        return {
            exportedAt: Date.now(),
            exportedBy: 'SaveManager',
            gameVersion: this._getCurrentVersion(),
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100) // Truncated for privacy
        };
    }
}

// Create singleton instance
const saveManager = new SaveManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SaveManager, saveManager };
} else if (typeof window !== 'undefined') {
    window.SaveManager = SaveManager;
    window.saveManager = saveManager;
}