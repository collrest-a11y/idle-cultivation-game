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
            lastLoadTime: 0
        };

        // Storage backend with fallback
        this.storage = this._initializeStorage();

        // Save operation queue for atomic operations
        this.saveQueue = [];
        this.isSaving = false;

        console.log('SaveManager initialized');
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

        // Create backup if requested
        if (config.backup && await this._keyExists(key)) {
            await this._createBackup(key);
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