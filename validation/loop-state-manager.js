import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/**
 * LoopStateManager - Manages persistence and resumption of validation loop state
 *
 * This class handles:
 * 1. Saving loop state for resumption after interruption
 * 2. Loading previous state on resume
 * 3. State versioning and migration
 * 4. Integrity verification
 * 5. Cleanup of old state files
 * 6. Atomic writes to prevent corruption
 */
export class LoopStateManager {
  constructor(config = {}) {
    this.config = {
      // State file configuration
      stateDir: config.stateDir || '.validation-loop-state',
      stateFileName: config.stateFileName || 'loop-state.json',
      backupCount: config.backupCount || 5,
      compressionEnabled: config.compressionEnabled || false,

      // Integrity verification
      enableIntegrityCheck: config.enableIntegrityCheck !== false, // Default true
      checksumAlgorithm: config.checksumAlgorithm || 'sha256',

      // Auto-cleanup configuration
      maxStateFiles: config.maxStateFiles || 10,
      maxAgeHours: config.maxAgeHours || 168, // 1 week

      // State versioning
      currentVersion: config.currentVersion || '1.0.0',

      ...config
    };

    this.stateFilePath = path.join(this.config.stateDir, this.config.stateFileName);
    this.lastSaveTime = null;
    this.saveInProgress = false;
  }

  /**
   * Save the current loop state
   * @param {Object} loopState - The main loop state to save
   * @param {Object} additionalData - Additional data like error history, fix history
   * @returns {Promise<Object>} Save result with success status and file path
   */
  async saveState(loopState, additionalData = {}) {
    if (this.saveInProgress) {
      console.log('⏳ State save already in progress, skipping...');
      return { success: false, reason: 'save-in-progress' };
    }

    this.saveInProgress = true;

    try {
      console.log('💾 Saving validation loop state...');

      // Ensure state directory exists
      await fs.ensureDir(this.config.stateDir);

      // Prepare state data
      const stateData = this.prepareStateData(loopState, additionalData);

      // Create backup of current state if it exists
      await this.createBackup();

      // Write state atomically
      const saveResult = await this.writeStateAtomic(stateData);

      // Cleanup old states
      await this.cleanupOldStates();

      this.lastSaveTime = Date.now();

      console.log(`✅ State saved successfully: ${saveResult.filePath}`);
      console.log(`   Size: ${(saveResult.size / 1024).toFixed(1)}KB`);

      return {
        success: true,
        filePath: saveResult.filePath,
        size: saveResult.size,
        timestamp: this.lastSaveTime,
        version: this.config.currentVersion
      };

    } catch (error) {
      console.error('❌ Failed to save state:', error.message);
      return {
        success: false,
        reason: error.message,
        timestamp: Date.now()
      };

    } finally {
      this.saveInProgress = false;
    }
  }

  /**
   * Load previously saved loop state
   * @returns {Promise<Object|null>} Loaded state or null if none exists
   */
  async loadState() {
    try {
      if (!(await fs.pathExists(this.stateFilePath))) {
        console.log('📭 No previous state file found');
        return null;
      }

      console.log('📂 Loading previous validation loop state...');

      // Read state file
      const rawData = await fs.readFile(this.stateFilePath, 'utf-8');
      const stateData = JSON.parse(rawData);

      // Verify integrity if enabled
      if (this.config.enableIntegrityCheck) {
        const integrityValid = await this.verifyIntegrity(stateData);
        if (!integrityValid) {
          console.warn('⚠️ State integrity check failed, attempting backup restore...');
          const backupState = await this.loadFromBackup();
          if (backupState) {
            return backupState;
          }
          throw new Error('State integrity compromised and no valid backup found');
        }
      }

      // Version migration if needed
      const migratedState = await this.migrateStateVersion(stateData);

      // Validate state structure
      this.validateStateStructure(migratedState);

      console.log(`✅ State loaded successfully from ${path.basename(this.stateFilePath)}`);
      console.log(`   Version: ${migratedState.metadata.version}`);
      console.log(`   Saved: ${new Date(migratedState.metadata.timestamp).toLocaleString()}`);
      console.log(`   Iteration: ${migratedState.loopState.iteration}`);

      return migratedState.loopState;

    } catch (error) {
      console.error('❌ Failed to load state:', error.message);

      // Try loading from backup
      console.log('🔄 Attempting to load from backup...');
      const backupState = await this.loadFromBackup();
      if (backupState) {
        console.log('✅ Successfully loaded from backup');
        return backupState;
      }

      console.error('💥 No valid state or backup found');
      return null;
    }
  }

  /**
   * Check if a valid state file exists
   * @returns {Promise<boolean>} True if state exists and is valid
   */
  async hasValidState() {
    try {
      if (!(await fs.pathExists(this.stateFilePath))) {
        return false;
      }

      const stats = await fs.stat(this.stateFilePath);
      if (stats.size === 0) {
        return false;
      }

      // Try to parse the file
      const rawData = await fs.readFile(this.stateFilePath, 'utf-8');
      const stateData = JSON.parse(rawData);

      // Basic structure validation
      return !!(stateData.metadata && stateData.loopState);

    } catch (error) {
      return false;
    }
  }

  /**
   * Delete current state (clean start)
   * @returns {Promise<boolean>} True if successfully deleted
   */
  async clearState() {
    try {
      console.log('🗑️ Clearing validation loop state...');

      if (await fs.pathExists(this.stateFilePath)) {
        await fs.remove(this.stateFilePath);
        console.log('✅ State cleared successfully');
      }

      // Also clear backups
      await this.clearBackups();

      return true;

    } catch (error) {
      console.error('❌ Failed to clear state:', error.message);
      return false;
    }
  }

  /**
   * Get state file information
   * @returns {Promise<Object>} State file metadata
   */
  async getStateInfo() {
    try {
      if (!(await fs.pathExists(this.stateFilePath))) {
        return { exists: false };
      }

      const stats = await fs.stat(this.stateFilePath);
      const rawData = await fs.readFile(this.stateFilePath, 'utf-8');
      const stateData = JSON.parse(rawData);

      return {
        exists: true,
        filePath: this.stateFilePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        version: stateData.metadata?.version || 'unknown',
        iteration: stateData.loopState?.iteration || 0,
        status: stateData.loopState?.status || 'unknown',
        errorCount: stateData.additionalData?.errorHistory?.length || 0,
        fixCount: stateData.additionalData?.fixHistory?.length || 0
      };

    } catch (error) {
      return {
        exists: true,
        error: error.message
      };
    }
  }

  /**
   * List all available state files (including backups)
   * @returns {Promise<Array>} List of state files with metadata
   */
  async listStateFiles() {
    try {
      if (!(await fs.pathExists(this.config.stateDir))) {
        return [];
      }

      const files = await fs.readdir(this.config.stateDir);
      const stateFiles = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.stateDir, file);
          const stats = await fs.stat(filePath);

          try {
            const rawData = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            stateFiles.push({
              fileName: file,
              filePath: filePath,
              size: stats.size,
              modified: stats.mtime,
              version: data.metadata?.version || 'unknown',
              iteration: data.loopState?.iteration || 0,
              status: data.loopState?.status || 'unknown',
              isBackup: file !== this.config.stateFileName
            });

          } catch (parseError) {
            // Include corrupted files in the list
            stateFiles.push({
              fileName: file,
              filePath: filePath,
              size: stats.size,
              modified: stats.mtime,
              corrupted: true,
              error: parseError.message
            });
          }
        }
      }

      // Sort by modification time, newest first
      stateFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));

      return stateFiles;

    } catch (error) {
      console.error('Failed to list state files:', error.message);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Prepare state data for saving
   */
  prepareStateData(loopState, additionalData) {
    const stateData = {
      metadata: {
        version: this.config.currentVersion,
        timestamp: Date.now(),
        saveReason: additionalData.saveReason || 'manual',
        nodeVersion: process.version,
        platform: process.platform
      },
      loopState: {
        ...loopState,
        // Ensure sensitive data is not saved
        browser: undefined,
        activePromises: undefined
      },
      additionalData: {
        errorHistory: additionalData.errorHistory || [],
        fixHistory: (additionalData.fixHistory || []).slice(-100), // Keep last 100
        iterationResults: (additionalData.iterationResults || []).slice(-20), // Keep last 20
        componentSuccessRates: additionalData.componentSuccessRates || {},
        convergenceMetrics: additionalData.convergenceMetrics || {}
      }
    };

    // Add integrity hash if enabled
    if (this.config.enableIntegrityCheck) {
      const dataString = JSON.stringify(stateData, null, 0);
      stateData.metadata.integrity = crypto
        .createHash(this.config.checksumAlgorithm)
        .update(dataString)
        .digest('hex');
    }

    return stateData;
  }

  /**
   * Write state data atomically to prevent corruption
   */
  async writeStateAtomic(stateData) {
    const tempFilePath = `${this.stateFilePath}.tmp`;

    try {
      // Write to temporary file first
      const dataString = JSON.stringify(stateData, null, 2);
      await fs.writeFile(tempFilePath, dataString, 'utf-8');

      // Verify the temporary file
      await fs.readFile(tempFilePath, 'utf-8');
      JSON.parse(await fs.readFile(tempFilePath, 'utf-8'));

      // Atomic move to final location
      await fs.move(tempFilePath, this.stateFilePath);

      const stats = await fs.stat(this.stateFilePath);

      return {
        filePath: this.stateFilePath,
        size: stats.size
      };

    } catch (error) {
      // Clean up temp file if it exists
      if (await fs.pathExists(tempFilePath)) {
        await fs.remove(tempFilePath);
      }
      throw error;
    }
  }

  /**
   * Create backup of current state
   */
  async createBackup() {
    if (!(await fs.pathExists(this.stateFilePath))) {
      return; // No current state to backup
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `loop-state-backup-${timestamp}.json`;
    const backupFilePath = path.join(this.config.stateDir, backupFileName);

    try {
      await fs.copy(this.stateFilePath, backupFilePath);
      console.log(`📋 Created backup: ${backupFileName}`);

      // Limit number of backups
      await this.cleanupOldBackups();

    } catch (error) {
      console.warn('⚠️ Failed to create backup:', error.message);
    }
  }

  /**
   * Load state from most recent backup
   */
  async loadFromBackup() {
    try {
      const stateFiles = await this.listStateFiles();
      const backups = stateFiles.filter(f => f.isBackup && !f.corrupted);

      if (backups.length === 0) {
        return null;
      }

      // Try backups in order of recency
      for (const backup of backups) {
        try {
          const rawData = await fs.readFile(backup.filePath, 'utf-8');
          const stateData = JSON.parse(rawData);

          if (this.config.enableIntegrityCheck) {
            const integrityValid = await this.verifyIntegrity(stateData);
            if (!integrityValid) {
              console.warn(`⚠️ Backup ${backup.fileName} failed integrity check`);
              continue;
            }
          }

          const migratedState = await this.migrateStateVersion(stateData);
          this.validateStateStructure(migratedState);

          console.log(`✅ Loaded from backup: ${backup.fileName}`);
          return migratedState.loopState;

        } catch (error) {
          console.warn(`⚠️ Failed to load backup ${backup.fileName}:`, error.message);
          continue;
        }
      }

      return null;

    } catch (error) {
      console.error('Failed to load from backup:', error.message);
      return null;
    }
  }

  /**
   * Verify state data integrity
   */
  async verifyIntegrity(stateData) {
    if (!stateData.metadata?.integrity) {
      return true; // No integrity hash to verify
    }

    try {
      // Create a copy without the integrity hash
      const dataToVerify = { ...stateData };
      delete dataToVerify.metadata.integrity;

      const dataString = JSON.stringify(dataToVerify, null, 0);
      const calculatedHash = crypto
        .createHash(this.config.checksumAlgorithm)
        .update(dataString)
        .digest('hex');

      return calculatedHash === stateData.metadata.integrity;

    } catch (error) {
      console.error('Integrity verification failed:', error.message);
      return false;
    }
  }

  /**
   * Migrate state between versions
   */
  async migrateStateVersion(stateData) {
    const currentVersion = stateData.metadata?.version || '0.0.0';

    if (currentVersion === this.config.currentVersion) {
      return stateData; // No migration needed
    }

    console.log(`🔄 Migrating state from ${currentVersion} to ${this.config.currentVersion}`);

    // Add migration logic here as versions evolve
    // For now, just update the version
    const migrated = {
      ...stateData,
      metadata: {
        ...stateData.metadata,
        version: this.config.currentVersion,
        migratedFrom: currentVersion,
        migrationTimestamp: Date.now()
      }
    };

    return migrated;
  }

  /**
   * Validate state structure
   */
  validateStateStructure(stateData) {
    if (!stateData.metadata) {
      throw new Error('State missing metadata');
    }

    if (!stateData.loopState) {
      throw new Error('State missing loop state');
    }

    // Validate required loop state fields
    const requiredFields = ['iteration', 'status', 'startTime'];
    for (const field of requiredFields) {
      if (stateData.loopState[field] === undefined) {
        throw new Error(`State missing required field: ${field}`);
      }
    }

    // Validate data types
    if (typeof stateData.loopState.iteration !== 'number') {
      throw new Error('Invalid iteration field type');
    }

    if (!['idle', 'running', 'success', 'failed', 'interrupted'].includes(stateData.loopState.status)) {
      throw new Error('Invalid status field value');
    }
  }

  /**
   * Cleanup old state files
   */
  async cleanupOldStates() {
    try {
      const stateFiles = await this.listStateFiles();
      const oldFiles = stateFiles.filter(f => {
        const ageHours = (Date.now() - new Date(f.modified)) / (1000 * 60 * 60);
        return ageHours > this.config.maxAgeHours;
      });

      // Keep at least maxStateFiles newest files
      const filesToDelete = oldFiles.slice(this.config.maxStateFiles);

      for (const file of filesToDelete) {
        try {
          await fs.remove(file.filePath);
          console.log(`🗑️ Cleaned up old state: ${file.fileName}`);
        } catch (error) {
          console.warn(`Failed to delete ${file.fileName}:`, error.message);
        }
      }

    } catch (error) {
      console.warn('Cleanup failed:', error.message);
    }
  }

  /**
   * Cleanup old backup files
   */
  async cleanupOldBackups() {
    try {
      const stateFiles = await this.listStateFiles();
      const backups = stateFiles.filter(f => f.isBackup && !f.corrupted);

      // Keep only the configured number of backups
      const backupsToDelete = backups.slice(this.config.backupCount);

      for (const backup of backupsToDelete) {
        try {
          await fs.remove(backup.filePath);
          console.log(`🗑️ Cleaned up old backup: ${backup.fileName}`);
        } catch (error) {
          console.warn(`Failed to delete backup ${backup.fileName}:`, error.message);
        }
      }

    } catch (error) {
      console.warn('Backup cleanup failed:', error.message);
    }
  }

  /**
   * Clear all backup files
   */
  async clearBackups() {
    try {
      const stateFiles = await this.listStateFiles();
      const backups = stateFiles.filter(f => f.isBackup);

      for (const backup of backups) {
        try {
          await fs.remove(backup.filePath);
          console.log(`🗑️ Cleared backup: ${backup.fileName}`);
        } catch (error) {
          console.warn(`Failed to delete backup ${backup.fileName}:`, error.message);
        }
      }

    } catch (error) {
      console.warn('Failed to clear backups:', error.message);
    }
  }

  /**
   * Export state manager configuration and statistics
   */
  getManagerInfo() {
    return {
      config: this.config,
      stateFilePath: this.stateFilePath,
      lastSaveTime: this.lastSaveTime,
      saveInProgress: this.saveInProgress
    };
  }
}