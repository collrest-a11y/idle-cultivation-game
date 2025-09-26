/**
 * Fix Application System
 * Part of the Automated Validation & Fix Loop
 *
 * Safely applies generated fixes to the codebase with validation and rollback capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class FixApplier {
  constructor(config = {}) {
    this.config = {
      backupDir: config.backupDir || path.join(process.cwd(), '.fix-backups'),
      validateBeforeApply: config.validateBeforeApply !== false,
      autoRollback: config.autoRollback !== false,
      maxRollbackAttempts: config.maxRollbackAttempts || 3,
      dryRun: config.dryRun || false,
      ...config
    };

    this.appliedFixes = [];
    this.rollbackStack = [];
  }

  /**
   * Apply a fix to the codebase
   */
  async applyFix(fix, error) {
    console.log(`[FixApplier] Applying fix for ${error.type}`);

    // Validate fix structure
    if (!this.validateFixStructure(fix)) {
      throw new Error('Invalid fix structure');
    }

    // Create backup before applying
    const backup = await this.createBackup(fix.targetFile || this.determineTargetFile(error));

    try {
      // Apply based on fix type
      let result;
      switch (fix.fixType) {
        case 'patch':
          result = await this.applyPatch(fix, backup.file);
          break;
        case 'injection':
          result = await this.applyInjection(fix, backup.file);
          break;
        case 'replacement':
          result = await this.applyReplacement(fix, backup.file);
          break;
        case 'wrapper':
          result = await this.applyWrapper(fix, backup.file);
          break;
        default:
          result = await this.applyGenericFix(fix, backup.file);
      }

      // Validate the applied fix
      if (this.config.validateBeforeApply) {
        const validation = await this.validateAppliedFix(fix, error, backup.file);
        if (!validation.success) {
          throw new Error(`Fix validation failed: ${validation.reason}`);
        }
      }

      // Record successful application
      this.recordFixApplication(fix, error, result, backup);

      return {
        success: true,
        result,
        backup,
        timestamp: Date.now()
      };

    } catch (applyError) {
      console.error(`[FixApplier] Failed to apply fix: ${applyError.message}`);

      // Attempt rollback
      if (this.config.autoRollback) {
        await this.rollback(backup);
      }

      throw applyError;
    }
  }

  /**
   * Apply a patch-type fix
   */
  async applyPatch(fix, targetFile) {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would apply patch:', fix.code);
      return { dryRun: true };
    }

    const filePath = path.resolve(targetFile);

    // Check if we're creating a new file or patching existing
    try {
      await fs.access(filePath);
      // File exists, append or inject the fix
      const content = await fs.readFile(filePath, 'utf8');
      const patchedContent = this.injectCode(content, fix.code, fix.position || 'end');
      await fs.writeFile(filePath, patchedContent, 'utf8');
    } catch (error) {
      // File doesn't exist, create it
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, fix.code, 'utf8');
    }

    return {
      type: 'patch',
      file: filePath,
      applied: true
    };
  }

  /**
   * Apply an injection-type fix (insert code at specific location)
   */
  async applyInjection(fix, targetFile) {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would inject code:', fix.code);
      return { dryRun: true };
    }

    const filePath = path.resolve(targetFile);
    const content = await fs.readFile(filePath, 'utf8');

    // Find injection point
    const injectionPoint = fix.injectionPoint || this.findInjectionPoint(content, fix);
    if (injectionPoint === -1) {
      throw new Error('Could not find suitable injection point');
    }

    // Inject the code
    const before = content.substring(0, injectionPoint);
    const after = content.substring(injectionPoint);
    const injectedContent = `${before}\n${fix.code}\n${after}`;

    await fs.writeFile(filePath, injectedContent, 'utf8');

    return {
      type: 'injection',
      file: filePath,
      injectionPoint,
      applied: true
    };
  }

  /**
   * Apply a replacement-type fix
   */
  async applyReplacement(fix, targetFile) {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would replace:', fix.search, 'with:', fix.replace);
      return { dryRun: true };
    }

    const filePath = path.resolve(targetFile);
    let content = await fs.readFile(filePath, 'utf8');

    if (fix.search && fix.replace) {
      // Direct replacement
      const regex = new RegExp(fix.search, fix.flags || 'g');
      content = content.replace(regex, fix.replace);
    } else if (fix.code) {
      // Full file replacement
      content = fix.code;
    }

    await fs.writeFile(filePath, content, 'utf8');

    return {
      type: 'replacement',
      file: filePath,
      applied: true
    };
  }

  /**
   * Apply a wrapper-type fix
   */
  async applyWrapper(fix, targetFile) {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would wrap with:', fix.code);
      return { dryRun: true };
    }

    const filePath = path.resolve(targetFile);
    const content = await fs.readFile(filePath, 'utf8');

    // Find the function or code block to wrap
    const target = fix.wrapTarget || this.findWrapTarget(content, fix);
    if (!target) {
      throw new Error('Could not find target to wrap');
    }

    // Apply the wrapper
    const wrapped = fix.code.replace('// Original code here', target.code);
    const newContent = content.substring(0, target.start) +
                      wrapped +
                      content.substring(target.end);

    await fs.writeFile(filePath, newContent, 'utf8');

    return {
      type: 'wrapper',
      file: filePath,
      wrapped: target,
      applied: true
    };
  }

  /**
   * Apply a generic fix
   */
  async applyGenericFix(fix, targetFile) {
    if (this.config.dryRun) {
      console.log('[DRY RUN] Would apply generic fix');
      return { dryRun: true };
    }

    const filePath = path.resolve(targetFile);

    // If fix has code, write it
    if (fix.code) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, fix.code, 'utf8');
    }

    return {
      type: 'generic',
      file: filePath,
      applied: true
    };
  }

  /**
   * Create backup before applying fix
   */
  async createBackup(targetFile) {
    const filePath = path.resolve(targetFile);
    const backupPath = path.join(
      this.config.backupDir,
      `${Date.now()}-${path.basename(filePath)}`
    );

    try {
      // Create backup directory
      await fs.mkdir(this.config.backupDir, { recursive: true });

      // Check if original file exists
      try {
        await fs.access(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        await fs.writeFile(backupPath, content, 'utf8');

        return {
          file: filePath,
          backup: backupPath,
          existed: true,
          content
        };
      } catch (error) {
        // File doesn't exist yet
        return {
          file: filePath,
          backup: null,
          existed: false,
          content: null
        };
      }
    } catch (error) {
      console.error('[FixApplier] Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Validate that the fix was applied successfully
   */
  async validateAppliedFix(fix, error, targetFile) {
    try {
      // Check file exists and is readable
      await fs.access(targetFile);

      // Run syntax check if JavaScript
      if (targetFile.endsWith('.js')) {
        try {
          await execAsync(`node --check "${targetFile}"`);
        } catch (syntaxError) {
          return {
            success: false,
            reason: `Syntax error: ${syntaxError.message}`
          };
        }
      }

      // Check if fix code is present in file
      if (fix.code) {
        const content = await fs.readFile(targetFile, 'utf8');
        const codeSnippet = fix.code.substring(0, 50);

        if (!content.includes(codeSnippet)) {
          return {
            success: false,
            reason: 'Fix code not found in target file'
          };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        reason: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Rollback a fix using backup
   */
  async rollback(backup) {
    console.log('[FixApplier] Rolling back fix');

    if (!backup) {
      console.warn('[FixApplier] No backup available for rollback');
      return false;
    }

    try {
      if (backup.existed && backup.backup) {
        // Restore from backup
        const content = await fs.readFile(backup.backup, 'utf8');
        await fs.writeFile(backup.file, content, 'utf8');
        console.log('[FixApplier] Rollback successful');
        return true;
      } else if (!backup.existed) {
        // File didn't exist before, remove it
        await fs.unlink(backup.file);
        console.log('[FixApplier] Rollback successful (file removed)');
        return true;
      }
    } catch (error) {
      console.error('[FixApplier] Rollback failed:', error);
      return false;
    }
  }

  /**
   * Rollback multiple fixes in reverse order
   */
  async rollbackMultiple(count = 1) {
    const fixesToRollback = this.rollbackStack.slice(-count);
    let successCount = 0;

    for (const backup of fixesToRollback.reverse()) {
      if (await this.rollback(backup)) {
        successCount++;
        this.rollbackStack.pop();
      } else {
        break;
      }
    }

    return {
      requested: count,
      successful: successCount,
      remaining: this.rollbackStack.length
    };
  }

  /**
   * Find suitable injection point in code
   */
  findInjectionPoint(content, fix) {
    // Look for specific markers or patterns
    if (fix.after) {
      const index = content.indexOf(fix.after);
      if (index !== -1) {
        return index + fix.after.length;
      }
    }

    if (fix.before) {
      const index = content.indexOf(fix.before);
      if (index !== -1) {
        return index;
      }
    }

    // Default to end of file
    return content.length;
  }

  /**
   * Find code block to wrap
   */
  findWrapTarget(content, fix) {
    if (fix.targetFunction) {
      const regex = new RegExp(
        `function\\s+${fix.targetFunction}\\s*\\([^)]*\\)\\s*{([^}]|\\n)*}`,
        'g'
      );
      const match = regex.exec(content);

      if (match) {
        return {
          code: match[0],
          start: match.index,
          end: match.index + match[0].length
        };
      }
    }

    return null;
  }

  /**
   * Inject code at specific position
   */
  injectCode(content, code, position) {
    switch (position) {
      case 'start':
        return `${code}\n${content}`;
      case 'end':
        return `${content}\n${code}`;
      case 'before-closing':
        // Find last closing brace
        const lastBrace = content.lastIndexOf('}');
        if (lastBrace !== -1) {
          return content.substring(0, lastBrace) + '\n' + code + '\n' + content.substring(lastBrace);
        }
        return `${content}\n${code}`;
      default:
        return `${content}\n${code}`;
    }
  }

  /**
   * Determine target file from error
   */
  determineTargetFile(error) {
    // Try to extract from error
    if (error.file) {
      return error.file;
    }

    // Component-based determination
    if (error.component) {
      const componentFiles = {
        'character-creation': 'js/character-creation-fallback.js',
        'save-system': 'js/save-manager.js',
        'game-state': 'js/game-state.js',
        'ui': 'js/ui-manager.js'
      };

      return componentFiles[error.component] || 'js/main.js';
    }

    // Default fallback
    return 'js/error-fixes.js';
  }

  /**
   * Validate fix structure
   */
  validateFixStructure(fix) {
    if (!fix) return false;

    // Must have either code or replacement instructions
    if (!fix.code && !fix.replace && !fix.search) {
      return false;
    }

    // Must have a fix type
    if (!fix.fixType) {
      fix.fixType = 'generic'; // Default type
    }

    return true;
  }

  /**
   * Record fix application for history
   */
  recordFixApplication(fix, error, result, backup) {
    const record = {
      fix: {
        type: fix.fixType,
        confidence: fix.confidence,
        explanation: fix.explanation
      },
      error: {
        type: error.type,
        severity: error.severity,
        component: error.component
      },
      result,
      backup,
      timestamp: Date.now(),
      success: true
    };

    this.appliedFixes.push(record);
    this.rollbackStack.push(backup);

    // Keep history limited
    if (this.appliedFixes.length > 100) {
      this.appliedFixes.shift();
    }

    if (this.rollbackStack.length > 50) {
      this.rollbackStack.shift();
    }
  }

  /**
   * Get fix history
   */
  getHistory() {
    return {
      total: this.appliedFixes.length,
      successful: this.appliedFixes.filter(f => f.success).length,
      failed: this.appliedFixes.filter(f => !f.success).length,
      recent: this.appliedFixes.slice(-10),
      rollbackAvailable: this.rollbackStack.length
    };
  }

  /**
   * Clear old backups
   */
  async cleanupBackups(olderThanMs = 86400000) { // 24 hours default
    const now = Date.now();
    const backupDir = this.config.backupDir;

    try {
      const files = await fs.readdir(backupDir);

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > olderThanMs) {
          await fs.unlink(filePath);
          console.log(`[FixApplier] Cleaned up old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('[FixApplier] Backup cleanup failed:', error);
    }
  }
}

// Export for use in the validation system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FixApplier;
}