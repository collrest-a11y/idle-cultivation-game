/**
 * MigrationManager - Handles version upgrades and schema migrations for save data
 * Provides rollback capabilities, progress tracking, and migration validation
 */
class MigrationManager {
    constructor() {
        this.migrations = new Map();
        this.migrationChains = new Map();
        this.migrationHistory = [];

        // Migration statistics
        this.stats = {
            totalMigrations: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            rollbacks: 0,
            lastMigrationTime: 0
        };

        // Migration options
        this.options = {
            enableRollback: true,
            validateBeforeMigration: true,
            validateAfterMigration: true,
            createBackupBeforeMigration: true,
            logMigrations: true,
            maxRollbackDepth: 5
        };

        // Initialize built-in migrations
        this._initializeBuiltInMigrations();

        console.log('MigrationManager initialized');
    }

    /**
     * Register a migration function for a specific version transition
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @param {Function} migrationFn - Migration function
     * @param {Function} rollbackFn - Optional rollback function
     */
    registerMigration(fromVersion, toVersion, migrationFn, rollbackFn = null) {
        if (typeof migrationFn !== 'function') {
            throw new Error('Migration function must be a function');
        }

        const migrationKey = `${fromVersion}_to_${toVersion}`;

        this.migrations.set(migrationKey, {
            fromVersion,
            toVersion,
            migrate: migrationFn,
            rollback: rollbackFn,
            registeredAt: Date.now()
        });

        // Update migration chains for path finding
        this._updateMigrationChains(fromVersion, toVersion);

        if (this.options.logMigrations) {
            console.log(`MigrationManager: Registered migration ${fromVersion} -> ${toVersion}`);
        }
    }

    /**
     * Migrate data from one version to another
     * @param {Object} data - Data to migrate
     * @param {string} fromVersion - Current version of data
     * @param {string} toVersion - Target version
     * @param {Object} options - Migration options
     * @returns {Promise<Object>} Migration result
     */
    async migrate(data, fromVersion, toVersion, options = {}) {
        const config = { ...this.options, ...options };

        this.stats.totalMigrations++;
        const migrationId = `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            if (fromVersion === toVersion) {
                return {
                    success: true,
                    data: data,
                    fromVersion,
                    toVersion,
                    migrationsApplied: [],
                    migrationId
                };
            }

            // Find migration path
            const migrationPath = this._findMigrationPath(fromVersion, toVersion);
            if (!migrationPath) {
                throw new Error(`No migration path found from ${fromVersion} to ${toVersion}`);
            }

            // Create backup if requested
            let backup = null;
            if (config.createBackupBeforeMigration) {
                backup = this._deepClone(data);
            }

            // Validate data before migration if requested
            if (config.validateBeforeMigration && window.dataValidator) {
                const validation = window.dataValidator.checkCorruption(data);
                if (validation.isCorrupted && validation.severity === 'severe') {
                    throw new Error('Data is severely corrupted and cannot be migrated safely');
                }
            }

            // Apply migrations step by step
            let currentData = this._deepClone(data);
            const appliedMigrations = [];

            for (const migrationStep of migrationPath) {
                const migrationKey = `${migrationStep.from}_to_${migrationStep.to}`;
                const migration = this.migrations.get(migrationKey);

                if (!migration) {
                    throw new Error(`Migration ${migrationKey} not found`);
                }

                if (config.logMigrations) {
                    console.log(`MigrationManager: Applying migration ${migrationStep.from} -> ${migrationStep.to}`);
                }

                // Apply the migration
                const migrationResult = await migration.migrate(currentData, {
                    fromVersion: migrationStep.from,
                    toVersion: migrationStep.to,
                    migrationId,
                    isChainedMigration: migrationPath.length > 1
                });

                if (migrationResult && typeof migrationResult === 'object') {
                    currentData = migrationResult;
                } else {
                    throw new Error(`Migration ${migrationKey} returned invalid result`);
                }

                appliedMigrations.push({
                    from: migrationStep.from,
                    to: migrationStep.to,
                    timestamp: Date.now()
                });
            }

            // Validate data after migration if requested
            if (config.validateAfterMigration && window.dataValidator) {
                const validation = window.dataValidator.checkCorruption(currentData);
                if (validation.isCorrupted && validation.severity === 'severe') {
                    if (backup && config.enableRollback) {
                        console.warn('MigrationManager: Post-migration validation failed, rolling back');
                        return await this._performRollback(backup, fromVersion, migrationId);
                    } else {
                        throw new Error('Migration resulted in corrupted data');
                    }
                }
            }

            // Record successful migration
            this._recordMigration(migrationId, {
                fromVersion,
                toVersion,
                appliedMigrations,
                backup: config.enableRollback ? backup : null,
                timestamp: Date.now(),
                success: true
            });

            this.stats.successfulMigrations++;
            this.stats.lastMigrationTime = Date.now();

            return {
                success: true,
                data: currentData,
                fromVersion,
                toVersion,
                migrationsApplied: appliedMigrations,
                migrationId
            };

        } catch (error) {
            console.error('MigrationManager: Migration failed:', error);
            this.stats.failedMigrations++;

            // Record failed migration
            this._recordMigration(migrationId, {
                fromVersion,
                toVersion,
                error: error.message,
                timestamp: Date.now(),
                success: false
            });

            // Return original data on failure
            return {
                success: false,
                data: data,
                fromVersion,
                toVersion,
                error: error.message,
                migrationId
            };
        }
    }

    /**
     * Check if a migration path exists between two versions
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @returns {boolean} Whether migration path exists
     */
    canMigrate(fromVersion, toVersion) {
        if (fromVersion === toVersion) {
            return true;
        }
        return this._findMigrationPath(fromVersion, toVersion) !== null;
    }

    /**
     * Get all available versions that can be migrated to from a given version
     * @param {string} version - Source version
     * @returns {Array} Array of target versions
     */
    getAvailableTargetVersions(version) {
        const targets = new Set();

        for (const [migrationKey, migration] of this.migrations) {
            if (migration.fromVersion === version) {
                targets.add(migration.toVersion);

                // Recursively add versions reachable through chaining
                const chainTargets = this.getAvailableTargetVersions(migration.toVersion);
                chainTargets.forEach(target => targets.add(target));
            }
        }

        return Array.from(targets).sort(this._compareVersions.bind(this));
    }

    /**
     * Get migration history
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Migration history entries
     */
    getMigrationHistory(limit = 10) {
        return this.migrationHistory
            .slice(-limit)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Rollback a migration by ID
     * @param {string} migrationId - Migration ID to rollback
     * @returns {Promise<Object>} Rollback result
     */
    async rollbackMigration(migrationId) {
        const migrationRecord = this.migrationHistory.find(m => m.id === migrationId);
        if (!migrationRecord) {
            throw new Error(`Migration ${migrationId} not found in history`);
        }

        if (!migrationRecord.backup) {
            throw new Error(`No backup available for migration ${migrationId}`);
        }

        this.stats.rollbacks++;

        return await this._performRollback(
            migrationRecord.backup,
            migrationRecord.fromVersion,
            migrationId
        );
    }

    /**
     * Get migration statistics
     * @returns {Object} Migration statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset migration statistics
     */
    resetStats() {
        this.stats = {
            totalMigrations: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            rollbacks: 0,
            lastMigrationTime: 0
        };
    }

    /**
     * Get current migration options
     * @returns {Object} Migration options
     */
    getOptions() {
        return { ...this.options };
    }

    /**
     * Update migration options
     * @param {Object} newOptions - New options to merge
     */
    setOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        console.log('MigrationManager: Options updated');
    }

    /**
     * Clear migration history
     * @param {boolean} confirmed - Confirmation flag
     */
    clearHistory(confirmed = false) {
        if (!confirmed) {
            throw new Error('clearHistory requires explicit confirmation');
        }

        this.migrationHistory = [];
        console.log('MigrationManager: Migration history cleared');
    }

    // Private methods

    /**
     * Initialize built-in migrations for common version transitions
     */
    _initializeBuiltInMigrations() {
        // Migration from 1.0.0 to 1.0.1 (example - add new fields)
        this.registerMigration('1.0.0', '1.0.1', (data) => {
            console.log('Migrating from 1.0.0 to 1.0.1: Adding new fields');

            // Add new fields with default values
            if (!data.settings) {
                data.settings = {
                    autoSave: true,
                    notifications: true,
                    sound: true,
                    theme: 'dark'
                };
            }

            // Add missing settings fields
            if (!data.settings.hasOwnProperty('notifications')) {
                data.settings.notifications = true;
            }
            if (!data.settings.hasOwnProperty('sound')) {
                data.settings.sound = true;
            }

            // Update version
            if (data.meta) {
                data.meta.version = '1.0.1';
            }

            return data;
        });

        // Migration from 1.0.1 to 1.0.2 (example - restructure data)
        this.registerMigration('1.0.1', '1.0.2', (data) => {
            console.log('Migrating from 1.0.1 to 1.0.2: Restructuring cultivation data');

            // Restructure cultivation data if needed
            if (data.cultivation) {
                // Add unlocked flag to dual cultivation if missing
                if (data.cultivation.dual && !data.cultivation.dual.hasOwnProperty('unlocked')) {
                    data.cultivation.dual.unlocked = data.cultivation.dual.level > 0;
                }

                // Ensure all cultivation paths have multiplier
                ['qi', 'body', 'dual'].forEach(path => {
                    if (data.cultivation[path] && !data.cultivation[path].hasOwnProperty('multiplier')) {
                        data.cultivation[path].multiplier = 1.0;
                    }
                });
            }

            // Update version
            if (data.meta) {
                data.meta.version = '1.0.2';
            }

            return data;
        });

        // Migration from 1.0.2 to 1.1.0 (example - major feature addition)
        this.registerMigration('1.0.2', '1.1.0', (data) => {
            console.log('Migrating from 1.0.2 to 1.1.0: Adding sect system');

            // Add sect system if missing
            if (!data.sect) {
                data.sect = {
                    id: null,
                    name: null,
                    contribution: 0,
                    buffs: [],
                    lastDonation: 0
                };
            }

            // Add tutorial system if missing
            if (!data.tutorial) {
                data.tutorial = {
                    completed: false,
                    currentStep: 0,
                    completedSteps: []
                };
            }

            // Update version
            if (data.meta) {
                data.meta.version = '1.1.0';
            }

            return data;
        });

        console.log('MigrationManager: Built-in migrations initialized');
    }

    /**
     * Update migration chains for path finding
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     */
    _updateMigrationChains(fromVersion, toVersion) {
        if (!this.migrationChains.has(fromVersion)) {
            this.migrationChains.set(fromVersion, new Set());
        }
        this.migrationChains.get(fromVersion).add(toVersion);
    }

    /**
     * Find migration path between two versions using BFS
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @returns {Array|null} Migration path or null if not found
     */
    _findMigrationPath(fromVersion, toVersion) {
        if (fromVersion === toVersion) {
            return [];
        }

        const queue = [{ version: fromVersion, path: [] }];
        const visited = new Set([fromVersion]);

        while (queue.length > 0) {
            const { version, path } = queue.shift();

            if (this.migrationChains.has(version)) {
                for (const nextVersion of this.migrationChains.get(version)) {
                    if (nextVersion === toVersion) {
                        return [...path, { from: version, to: nextVersion }];
                    }

                    if (!visited.has(nextVersion)) {
                        visited.add(nextVersion);
                        queue.push({
                            version: nextVersion,
                            path: [...path, { from: version, to: nextVersion }]
                        });
                    }
                }
            }
        }

        return null; // No path found
    }

    /**
     * Compare two version strings
     * @param {string} a - Version A
     * @param {string} b - Version B
     * @returns {number} Comparison result (-1, 0, 1)
     */
    _compareVersions(a, b) {
        const parseVersion = (version) => {
            return version.split('.').map(part => parseInt(part, 10));
        };

        const versionA = parseVersion(a);
        const versionB = parseVersion(b);

        for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
            const partA = versionA[i] || 0;
            const partB = versionB[i] || 0;

            if (partA < partB) return -1;
            if (partA > partB) return 1;
        }

        return 0;
    }

    /**
     * Record migration in history
     * @param {string} migrationId - Migration ID
     * @param {Object} migrationData - Migration data
     */
    _recordMigration(migrationId, migrationData) {
        const record = {
            id: migrationId,
            ...migrationData
        };

        this.migrationHistory.push(record);

        // Limit history size
        if (this.migrationHistory.length > 100) {
            this.migrationHistory = this.migrationHistory.slice(-100);
        }
    }

    /**
     * Perform rollback operation
     * @param {Object} backupData - Backup data to restore
     * @param {string} originalVersion - Original version
     * @param {string} migrationId - Migration ID being rolled back
     * @returns {Promise<Object>} Rollback result
     */
    async _performRollback(backupData, originalVersion, migrationId) {
        try {
            console.log(`MigrationManager: Rolling back migration ${migrationId}`);

            // Validate backup data
            if (window.dataValidator) {
                const validation = window.dataValidator.checkCorruption(backupData);
                if (validation.isCorrupted && validation.severity === 'severe') {
                    throw new Error('Backup data is corrupted and cannot be restored');
                }
            }

            // Record rollback
            this._recordMigration(`rollback_${migrationId}`, {
                originalMigrationId: migrationId,
                restoredVersion: originalVersion,
                timestamp: Date.now(),
                success: true,
                type: 'rollback'
            });

            return {
                success: true,
                data: this._deepClone(backupData),
                version: originalVersion,
                rolledBackMigration: migrationId
            };

        } catch (error) {
            console.error('MigrationManager: Rollback failed:', error);

            // Record failed rollback
            this._recordMigration(`rollback_${migrationId}`, {
                originalMigrationId: migrationId,
                error: error.message,
                timestamp: Date.now(),
                success: false,
                type: 'rollback'
            });

            throw error;
        }
    }

    /**
     * Deep clone an object
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
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

    /**
     * Get information about all registered migrations
     * @returns {Array} Migration information
     */
    getRegisteredMigrations() {
        const migrations = [];

        for (const [key, migration] of this.migrations) {
            migrations.push({
                key,
                fromVersion: migration.fromVersion,
                toVersion: migration.toVersion,
                hasRollback: typeof migration.rollback === 'function',
                registeredAt: migration.registeredAt
            });
        }

        return migrations.sort((a, b) => {
            const versionCompare = this._compareVersions(a.fromVersion, b.fromVersion);
            if (versionCompare !== 0) return versionCompare;
            return this._compareVersions(a.toVersion, b.toVersion);
        });
    }

    /**
     * Validate a migration path before executing
     * @param {string} fromVersion - Source version
     * @param {string} toVersion - Target version
     * @returns {Object} Validation result
     */
    validateMigrationPath(fromVersion, toVersion) {
        const path = this._findMigrationPath(fromVersion, toVersion);

        if (!path) {
            return {
                isValid: false,
                error: `No migration path found from ${fromVersion} to ${toVersion}`,
                path: null
            };
        }

        // Check if all migrations in path exist
        const missingMigrations = [];
        for (const step of path) {
            const migrationKey = `${step.from}_to_${step.to}`;
            if (!this.migrations.has(migrationKey)) {
                missingMigrations.push(migrationKey);
            }
        }

        if (missingMigrations.length > 0) {
            return {
                isValid: false,
                error: `Missing migrations: ${missingMigrations.join(', ')}`,
                path: path,
                missingMigrations
            };
        }

        return {
            isValid: true,
            path: path,
            stepCount: path.length
        };
    }

    /**
     * Get the latest version that can be migrated to
     * @returns {string} Latest available version
     */
    getLatestVersion() {
        const allVersions = new Set();

        for (const migration of this.migrations.values()) {
            allVersions.add(migration.fromVersion);
            allVersions.add(migration.toVersion);
        }

        if (allVersions.size === 0) {
            return '1.0.0'; // Default version
        }

        return Array.from(allVersions)
            .sort(this._compareVersions.bind(this))
            .pop();
    }
}

// Create singleton instance
const migrationManager = new MigrationManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MigrationManager, migrationManager };
} else if (typeof window !== 'undefined') {
    window.MigrationManager = MigrationManager;
    window.migrationManager = migrationManager;
}