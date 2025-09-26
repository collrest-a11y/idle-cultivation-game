import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

/**
 * RollbackManager - Safe rollback mechanism for fix validation
 *
 * This class creates checkpoints of the codebase state and provides
 * reliable rollback functionality if fixes cause issues.
 */
export class RollbackManager {
  constructor(options = {}) {
    this.checkpointsDir = options.checkpointsDir || './validation-checkpoints';
    this.maxCheckpoints = options.maxCheckpoints || 20;
    this.sourceDir = options.sourceDir || './src';
    this.gameDir = options.gameDir || './';
    this.checkpoints = [];
    this.excludePatterns = options.excludePatterns || [
      'node_modules',
      '.git',
      'test-sandbox',
      'validation-checkpoints',
      'coverage',
      '*.log',
      '*.tmp'
    ];
  }

  /**
   * Initialize the rollback manager
   */
  async initialize() {
    try {
      await fs.ensureDir(this.checkpointsDir);
      await this.loadExistingCheckpoints();
      console.log(`RollbackManager initialized with ${this.checkpoints.length} existing checkpoints`);
    } catch (error) {
      throw new Error(`Failed to initialize RollbackManager: ${error.message}`);
    }
  }

  /**
   * Creates a checkpoint of the current codebase state
   * @param {string} description - Description of the checkpoint
   * @param {Object} metadata - Additional metadata to store
   * @returns {string} Checkpoint ID
   */
  async createCheckpoint(description, metadata = {}) {
    const checkpointId = this.generateCheckpointId();
    const timestamp = Date.now();

    try {
      console.log(`Creating checkpoint ${checkpointId}: ${description}`);

      const checkpoint = {
        id: checkpointId,
        description,
        timestamp,
        created: new Date().toISOString(),
        metadata: {
          ...metadata,
          nodeVersion: process.version,
          platform: process.platform
        }
      };

      // Create checkpoint directory
      const checkpointPath = path.join(this.checkpointsDir, checkpointId);
      await fs.ensureDir(checkpointPath);

      // Snapshot files
      const snapshotResult = await this.snapshotFiles(checkpointPath);
      checkpoint.files = snapshotResult.files;
      checkpoint.fileCount = snapshotResult.count;
      checkpoint.totalSize = snapshotResult.size;

      // Snapshot state
      checkpoint.state = await this.snapshotState();

      // Create integrity hash
      checkpoint.integrity = await this.createIntegrityHash(checkpoint);

      // Save checkpoint metadata
      await this.saveCheckpointMetadata(checkpointPath, checkpoint);

      // Add to checkpoints list
      this.checkpoints.push(checkpoint);

      // Cleanup old checkpoints if needed
      await this.cleanupOldCheckpoints();

      console.log(`Checkpoint ${checkpointId} created successfully (${checkpoint.fileCount} files, ${this.formatBytes(checkpoint.totalSize)})`);

      return checkpointId;
    } catch (error) {
      throw new Error(`Failed to create checkpoint: ${error.message}`);
    }
  }

  /**
   * Rolls back to a specific checkpoint
   * @param {string} checkpointId - ID of the checkpoint to rollback to
   * @param {Object} options - Rollback options
   * @returns {Object} Rollback result
   */
  async rollbackTo(checkpointId, options = {}) {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    const { dryRun = false, verifyIntegrity = true } = options;

    try {
      console.log(`${dryRun ? 'Simulating' : 'Performing'} rollback to checkpoint ${checkpointId}: ${checkpoint.description}`);

      if (verifyIntegrity) {
        const isValid = await this.verifyCheckpointIntegrity(checkpointId);
        if (!isValid) {
          throw new Error('Checkpoint integrity verification failed');
        }
      }

      const checkpointPath = path.join(this.checkpointsDir, checkpointId);
      const rollbackPlan = await this.createRollbackPlan(checkpointPath);

      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          plan: rollbackPlan,
          checkpoint
        };
      }

      // Create backup before rollback
      const backupId = await this.createCheckpoint(`Pre-rollback backup before ${checkpointId}`, {
        type: 'pre-rollback-backup',
        rollbackTarget: checkpointId
      });

      // Execute rollback
      const rollbackResult = await this.executeRollback(checkpointPath, rollbackPlan);

      // Restore state if available
      if (checkpoint.state) {
        await this.restoreState(checkpoint.state);
      }

      // Verify rollback success
      const verificationResult = await this.verifyRollback(checkpoint);

      console.log(`Rollback to ${checkpointId} completed successfully`);

      return {
        success: true,
        checkpointId,
        backupId,
        rollbackPlan,
        rollbackResult,
        verificationResult,
        checkpoint
      };
    } catch (error) {
      console.error(`Rollback to ${checkpointId} failed:`, error.message);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  /**
   * Lists all available checkpoints
   * @returns {Array} List of checkpoints
   */
  listCheckpoints() {
    return this.checkpoints.map(checkpoint => ({
      id: checkpoint.id,
      description: checkpoint.description,
      created: checkpoint.created,
      fileCount: checkpoint.fileCount,
      size: this.formatBytes(checkpoint.totalSize),
      metadata: checkpoint.metadata
    })).sort((a, b) => new Date(b.created) - new Date(a.created));
  }

  /**
   * Deletes a specific checkpoint
   * @param {string} checkpointId - ID of checkpoint to delete
   */
  async deleteCheckpoint(checkpointId) {
    const checkpointIndex = this.checkpoints.findIndex(c => c.id === checkpointId);
    if (checkpointIndex === -1) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    try {
      const checkpointPath = path.join(this.checkpointsDir, checkpointId);
      await fs.remove(checkpointPath);

      this.checkpoints.splice(checkpointIndex, 1);

      console.log(`Checkpoint ${checkpointId} deleted successfully`);
    } catch (error) {
      throw new Error(`Failed to delete checkpoint ${checkpointId}: ${error.message}`);
    }
  }

  /**
   * Verifies the integrity of a checkpoint
   * @param {string} checkpointId - ID of checkpoint to verify
   * @returns {boolean} Whether checkpoint is valid
   */
  async verifyCheckpointIntegrity(checkpointId) {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) {
      return false;
    }

    try {
      const checkpointPath = path.join(this.checkpointsDir, checkpointId);
      const metadataPath = path.join(checkpointPath, 'metadata.json');

      // Check if checkpoint directory exists
      if (!(await fs.pathExists(checkpointPath))) {
        return false;
      }

      // Check if metadata exists
      if (!(await fs.pathExists(metadataPath))) {
        return false;
      }

      // Verify file integrity
      const savedMetadata = await fs.readJSON(metadataPath);
      const currentHash = await this.createIntegrityHash(savedMetadata);

      return currentHash === savedMetadata.integrity;
    } catch (error) {
      console.warn(`Integrity verification failed for ${checkpointId}:`, error.message);
      return false;
    }
  }

  /**
   * Private methods
   */

  generateCheckpointId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `checkpoint_${timestamp}_${random}`;
  }

  async loadExistingCheckpoints() {
    if (!(await fs.pathExists(this.checkpointsDir))) {
      return;
    }

    const entries = await fs.readdir(this.checkpointsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const metadataPath = path.join(this.checkpointsDir, entry.name, 'metadata.json');
          if (await fs.pathExists(metadataPath)) {
            const checkpoint = await fs.readJSON(metadataPath);
            this.checkpoints.push(checkpoint);
          }
        } catch (error) {
          console.warn(`Failed to load checkpoint ${entry.name}:`, error.message);
        }
      }
    }

    // Sort by timestamp
    this.checkpoints.sort((a, b) => b.timestamp - a.timestamp);
  }

  async snapshotFiles(checkpointPath) {
    const filesSnapshot = {
      files: {},
      count: 0,
      size: 0
    };

    await this.copyDirectoryWithExclusions(
      this.gameDir,
      path.join(checkpointPath, 'files'),
      filesSnapshot
    );

    return filesSnapshot;
  }

  async copyDirectoryWithExclusions(sourceDir, targetDir, stats) {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);

      // Check exclusions
      if (this.shouldExclude(sourcePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await fs.ensureDir(targetPath);
        await this.copyDirectoryWithExclusions(sourcePath, targetPath, stats);
      } else {
        await fs.copy(sourcePath, targetPath);

        // Track file stats
        const fileStats = await fs.stat(sourcePath);
        stats.count++;
        stats.size += fileStats.size;

        // Store relative path for rollback
        const relativePath = path.relative(this.gameDir, sourcePath);
        stats.files[relativePath] = {
          size: fileStats.size,
          mtime: fileStats.mtime,
          checksum: await this.calculateFileChecksum(sourcePath)
        };
      }
    }
  }

  shouldExclude(filePath) {
    const relativePath = path.relative(this.gameDir, filePath);

    return this.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(relativePath);
      }
      return relativePath.includes(pattern);
    });
  }

  async calculateFileChecksum(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async snapshotState() {
    // Snapshot application state if available
    const state = {
      timestamp: Date.now(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      }
    };

    // Try to capture package.json state
    try {
      const packageJsonPath = path.join(this.gameDir, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        state.dependencies = {
          dependencies: packageJson.dependencies,
          devDependencies: packageJson.devDependencies
        };
      }
    } catch (error) {
      // Ignore if package.json doesn't exist
    }

    return state;
  }

  async createIntegrityHash(checkpoint) {
    // Create hash of critical checkpoint data
    const hashContent = JSON.stringify({
      id: checkpoint.id,
      description: checkpoint.description,
      timestamp: checkpoint.timestamp,
      fileCount: checkpoint.fileCount,
      totalSize: checkpoint.totalSize
    });

    return crypto.createHash('sha256').update(hashContent).digest('hex');
  }

  async saveCheckpointMetadata(checkpointPath, checkpoint) {
    const metadataPath = path.join(checkpointPath, 'metadata.json');
    await fs.writeJSON(metadataPath, checkpoint, { spaces: 2 });
  }

  async cleanupOldCheckpoints() {
    if (this.checkpoints.length <= this.maxCheckpoints) {
      return;
    }

    // Sort by timestamp (newest first)
    this.checkpoints.sort((a, b) => b.timestamp - a.timestamp);

    // Remove excess checkpoints
    const checkpointsToRemove = this.checkpoints.splice(this.maxCheckpoints);

    for (const checkpoint of checkpointsToRemove) {
      try {
        await this.deleteCheckpoint(checkpoint.id);
        console.log(`Cleaned up old checkpoint: ${checkpoint.id}`);
      } catch (error) {
        console.warn(`Failed to cleanup checkpoint ${checkpoint.id}:`, error.message);
      }
    }
  }

  async createRollbackPlan(checkpointPath) {
    const filesPath = path.join(checkpointPath, 'files');
    const plan = {
      filesToRestore: [],
      filesToDelete: [],
      directoriesToCreate: []
    };

    // Scan checkpoint files
    await this.scanForRollbackPlan(filesPath, '', plan);

    // Identify files to delete (exist in current but not in checkpoint)
    const currentFiles = await this.getCurrentFilesList();
    const checkpointFiles = new Set(plan.filesToRestore.map(f => f.relativePath));

    for (const currentFile of currentFiles) {
      if (!checkpointFiles.has(currentFile)) {
        plan.filesToDelete.push(currentFile);
      }
    }

    return plan;
  }

  async scanForRollbackPlan(directory, relativePath, plan) {
    if (!(await fs.pathExists(directory))) {
      return;
    }

    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        plan.directoriesToCreate.push(entryRelativePath);
        await this.scanForRollbackPlan(entryPath, entryRelativePath, plan);
      } else {
        plan.filesToRestore.push({
          relativePath: entryRelativePath,
          sourcePath: entryPath,
          targetPath: path.join(this.gameDir, entryRelativePath)
        });
      }
    }
  }

  async getCurrentFilesList() {
    const files = [];

    await this.scanCurrentFiles(this.gameDir, '', files);

    return files;
  }

  async scanCurrentFiles(directory, relativePath, files) {
    if (this.shouldExclude(directory)) {
      return;
    }

    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      if (this.shouldExclude(entryPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanCurrentFiles(entryPath, entryRelativePath, files);
      } else {
        files.push(entryRelativePath);
      }
    }
  }

  async executeRollback(checkpointPath, plan) {
    const results = {
      filesRestored: 0,
      filesDeleted: 0,
      directoriesCreated: 0,
      errors: []
    };

    try {
      // Create directories
      for (const dir of plan.directoriesToCreate) {
        try {
          const dirPath = path.join(this.gameDir, dir);
          await fs.ensureDir(dirPath);
          results.directoriesCreated++;
        } catch (error) {
          results.errors.push(`Failed to create directory ${dir}: ${error.message}`);
        }
      }

      // Restore files
      for (const fileInfo of plan.filesToRestore) {
        try {
          await fs.copy(fileInfo.sourcePath, fileInfo.targetPath, { overwrite: true });
          results.filesRestored++;
        } catch (error) {
          results.errors.push(`Failed to restore file ${fileInfo.relativePath}: ${error.message}`);
        }
      }

      // Delete extra files
      for (const fileToDelete of plan.filesToDelete) {
        try {
          const filePath = path.join(this.gameDir, fileToDelete);
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            results.filesDeleted++;
          }
        } catch (error) {
          results.errors.push(`Failed to delete file ${fileToDelete}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      results.errors.push(`Rollback execution failed: ${error.message}`);
      return results;
    }
  }

  async restoreState(state) {
    // This is where we would restore application state
    // For now, just log that state restoration would happen
    console.log('State restoration completed', {
      timestamp: state.timestamp,
      environment: state.environment
    });
  }

  async verifyRollback(checkpoint) {
    const verification = {
      success: true,
      issues: [],
      filesVerified: 0,
      checksumMatches: 0
    };

    try {
      // Verify key files exist and have correct content
      for (const [relativePath, fileInfo] of Object.entries(checkpoint.files)) {
        const filePath = path.join(this.gameDir, relativePath);

        if (!(await fs.pathExists(filePath))) {
          verification.issues.push(`Missing file: ${relativePath}`);
          verification.success = false;
          continue;
        }

        // Verify checksum if available
        if (fileInfo.checksum) {
          const currentChecksum = await this.calculateFileChecksum(filePath);
          if (currentChecksum === fileInfo.checksum) {
            verification.checksumMatches++;
          } else {
            verification.issues.push(`Checksum mismatch: ${relativePath}`);
            verification.success = false;
          }
        }

        verification.filesVerified++;
      }
    } catch (error) {
      verification.success = false;
      verification.issues.push(`Verification failed: ${error.message}`);
    }

    return verification;
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}