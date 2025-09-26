import { chromium } from 'playwright';
import { FixValidator } from './fix-validator.js';
import { RegressionSuite } from './regression-suite.js';
import { RollbackManager } from './rollback-manager.js';
import { PerformanceValidator } from './performance-validator.js';
import { ValidationReporter } from './validation-reporter.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * ValidationPipeline - Orchestrates the complete fix validation process
 *
 * This class coordinates all validation components to provide a comprehensive,
 * multi-stage validation pipeline with automatic rollback capabilities.
 */
export class ValidationPipeline {
  constructor(options = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold || 75,
      autoApply: options.autoApply !== false, // Default true
      createReports: options.createReports !== false, // Default true
      performRollbackOnFailure: options.performRollbackOnFailure !== false, // Default true
      maxRetries: options.maxRetries || 2,
      ...options
    };

    // Initialize components
    this.fixValidator = new FixValidator(options.fixValidator);
    this.rollbackManager = new RollbackManager(options.rollbackManager);
    this.performanceValidator = new PerformanceValidator(options.performanceValidator);
    this.reporter = new ValidationReporter(options.reporter);

    // Pipeline state
    this.pipelineState = {
      currentStage: null,
      startTime: null,
      checkpointId: null,
      validationResults: null,
      applied: false,
      rolledBack: false
    };

    // Validation stages configuration
    this.stages = [
      {
        name: 'initialize',
        required: true,
        timeout: 30000,
        fn: this.initializePipeline.bind(this)
      },
      {
        name: 'create-checkpoint',
        required: true,
        timeout: 60000,
        fn: this.createCheckpoint.bind(this)
      },
      {
        name: 'validate-fix',
        required: true,
        timeout: 300000, // 5 minutes
        fn: this.runFixValidation.bind(this)
      },
      {
        name: 'evaluate-results',
        required: true,
        timeout: 10000,
        fn: this.evaluateValidationResults.bind(this)
      },
      {
        name: 'apply-fix',
        required: false, // Conditional based on results
        timeout: 60000,
        fn: this.applyFixToProduction.bind(this)
      },
      {
        name: 'post-application-validation',
        required: false, // Only if fix was applied
        timeout: 120000,
        fn: this.runPostApplicationValidation.bind(this)
      },
      {
        name: 'generate-report',
        required: true,
        timeout: 30000,
        fn: this.generateValidationReport.bind(this)
      },
      {
        name: 'cleanup',
        required: true,
        timeout: 30000,
        fn: this.cleanupPipeline.bind(this)
      }
    ];
  }

  /**
   * Main pipeline execution method
   * @param {Object} fix - The fix to validate and potentially apply
   * @param {Object} error - The original error being fixed
   * @param {Object} context - Context about the fix application
   * @returns {Object} Complete pipeline execution results
   */
  async runPipeline(fix, error, context) {
    const pipelineId = this.generatePipelineId();
    this.pipelineState.startTime = Date.now();

    console.log(`Starting validation pipeline ${pipelineId}`);
    console.log(`Fix: ${fix.type} for error: ${error.type}`);

    const result = {
      pipelineId,
      success: false,
      fix,
      error,
      context,
      startTime: this.pipelineState.startTime,
      endTime: null,
      duration: null,
      stagesCompleted: [],
      stagesFailed: [],
      validationResults: null,
      applied: false,
      rolledBack: false,
      checkpointId: null,
      reportGenerated: false,
      error: null
    };

    try {
      // Execute pipeline stages
      for (const stage of this.stages) {
        await this.executeStage(stage, fix, error, context, result);
      }

      result.success = true;
      console.log(`✅ Pipeline ${pipelineId} completed successfully`);

    } catch (pipelineError) {
      result.success = false;
      result.error = pipelineError.message;

      console.error(`❌ Pipeline ${pipelineId} failed:`, pipelineError.message);

      // Attempt emergency rollback if needed
      if (this.pipelineState.applied && !this.pipelineState.rolledBack) {
        try {
          console.log('Attempting emergency rollback...');
          await this.performEmergencyRollback();
          result.rolledBack = true;
          this.pipelineState.rolledBack = true;
        } catch (rollbackError) {
          console.error('Emergency rollback failed:', rollbackError.message);
          result.rollbackError = rollbackError.message;
        }
      }

    } finally {
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      result.applied = this.pipelineState.applied;
      result.rolledBack = this.pipelineState.rolledBack;
      result.checkpointId = this.pipelineState.checkpointId;
      result.validationResults = this.pipelineState.validationResults;

      // Final cleanup
      try {
        await this.finalCleanup();
      } catch (cleanupError) {
        console.warn('Final cleanup warning:', cleanupError.message);
      }
    }

    return result;
  }

  /**
   * Execute a single pipeline stage
   */
  async executeStage(stage, fix, error, context, result) {
    console.log(`Executing stage: ${stage.name}`);
    this.pipelineState.currentStage = stage.name;

    const stageStartTime = Date.now();
    let stageResult = null;

    try {
      // Execute stage with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Stage ${stage.name} timed out after ${stage.timeout}ms`)), stage.timeout)
      );

      const stagePromise = stage.fn(fix, error, context);
      stageResult = await Promise.race([stagePromise, timeoutPromise]);

      const stageDuration = Date.now() - stageStartTime;
      result.stagesCompleted.push({
        name: stage.name,
        duration: stageDuration,
        result: stageResult
      });

      console.log(`✅ Stage ${stage.name} completed in ${stageDuration}ms`);

    } catch (stageError) {
      const stageDuration = Date.now() - stageStartTime;
      const stageFailure = {
        name: stage.name,
        duration: stageDuration,
        error: stageError.message,
        required: stage.required
      };

      result.stagesFailed.push(stageFailure);

      console.error(`❌ Stage ${stage.name} failed after ${stageDuration}ms:`, stageError.message);

      // Stop pipeline on required stage failure
      if (stage.required) {
        throw new Error(`Required stage ${stage.name} failed: ${stageError.message}`);
      } else {
        console.warn(`Optional stage ${stage.name} failed, continuing pipeline`);
      }
    }
  }

  /**
   * Pipeline stage implementations
   */

  async initializePipeline(fix, error, context) {
    console.log('Initializing validation pipeline...');

    // Initialize all components
    await this.rollbackManager.initialize();
    await this.reporter.initialize();

    // Validate inputs
    this.validateInputs(fix, error, context);

    // Setup monitoring and logging
    this.setupPipelineMonitoring();

    return { initialized: true };
  }

  async createCheckpoint(fix, error, context) {
    console.log('Creating pre-validation checkpoint...');

    const checkpointId = await this.rollbackManager.createCheckpoint(
      `Pre-validation checkpoint for ${error.type} fix`,
      {
        fix,
        error,
        context,
        pipelineId: this.generatePipelineId(),
        timestamp: Date.now()
      }
    );

    this.pipelineState.checkpointId = checkpointId;

    return { checkpointId };
  }

  async runFixValidation(fix, error, context) {
    console.log('Running comprehensive fix validation...');

    // Run the main fix validation
    const validationResults = await this.fixValidator.validateFix(fix, error, context);

    // Store results in pipeline state
    this.pipelineState.validationResults = validationResults;

    return validationResults;
  }

  async evaluateValidationResults(fix, error, context) {
    const results = this.pipelineState.validationResults;
    const recommendation = results.recommendation;

    console.log(`Validation completed with score: ${results.score}/100`);
    console.log(`Recommendation: ${recommendation.action} (${recommendation.confidence} confidence)`);

    // Apply confidence threshold
    const meetsThreshold = results.score >= this.options.confidenceThreshold;
    const shouldApply = meetsThreshold &&
      (recommendation.action === 'APPLY' || recommendation.action === 'APPLY_WITH_MONITORING');

    // Check for critical blockers
    const hasCriticalBlockers = this.checkForCriticalBlockers(results);

    const evaluation = {
      meetsThreshold,
      shouldApply: shouldApply && !hasCriticalBlockers,
      hasCriticalBlockers,
      recommendation,
      thresholdUsed: this.options.confidenceThreshold
    };

    return evaluation;
  }

  async applyFixToProduction(fix, error, context) {
    const evaluation = this.pipelineState.validationResults.evaluation ||
      await this.evaluateValidationResults(fix, error, context);

    if (!evaluation.shouldApply) {
      console.log('Skipping fix application based on evaluation results');
      return { applied: false, reason: 'Did not meet application criteria' };
    }

    if (!this.options.autoApply) {
      console.log('Auto-apply disabled, skipping fix application');
      return { applied: false, reason: 'Auto-apply disabled' };
    }

    console.log('Applying fix to production...');

    try {
      // Apply the fix to the actual codebase
      await this.performFixApplication(fix, context);

      this.pipelineState.applied = true;

      console.log('✅ Fix successfully applied to production');

      return { applied: true };

    } catch (applicationError) {
      console.error('Fix application failed:', applicationError.message);
      throw new Error(`Fix application failed: ${applicationError.message}`);
    }
  }

  async runPostApplicationValidation(fix, error, context) {
    if (!this.pipelineState.applied) {
      return { skipped: true, reason: 'Fix was not applied' };
    }

    console.log('Running post-application validation...');

    let browser = null;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      // Quick smoke test
      await page.goto('http://localhost:8080', { timeout: 10000 });

      const postValidation = {
        timestamp: Date.now(),
        tests: []
      };

      // Test 1: Check for critical errors
      const criticalErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          criticalErrors.push(msg.text());
        }
      });

      await page.waitForTimeout(5000);

      postValidation.tests.push({
        name: 'critical-errors',
        passed: criticalErrors.length === 0,
        details: { errorCount: criticalErrors.length, errors: criticalErrors.slice(0, 3) }
      });

      // Test 2: Verify game loads
      const gameLoaded = await page.evaluate(() =>
        typeof window.gameState !== 'undefined' && window.gameState !== null
      );

      postValidation.tests.push({
        name: 'game-initialization',
        passed: gameLoaded,
        details: { gameLoaded }
      });

      // Test 3: Verify original error is fixed
      let originalErrorFixed = true;
      try {
        originalErrorFixed = await this.fixValidator.checkOriginalErrorFixed(page, error);
      } catch (e) {
        originalErrorFixed = false;
      }

      postValidation.tests.push({
        name: 'original-error-resolution',
        passed: originalErrorFixed,
        details: { fixed: originalErrorFixed }
      });

      // Overall post-validation result
      const allTestsPassed = postValidation.tests.every(test => test.passed);
      postValidation.passed = allTestsPassed;

      if (!allTestsPassed) {
        const failedTests = postValidation.tests.filter(test => !test.passed);
        throw new Error(`Post-application validation failed: ${failedTests.map(t => t.name).join(', ')}`);
      }

      console.log('✅ Post-application validation passed');

      return postValidation;

    } finally {
      if (browser) await browser.close();
    }
  }

  async generateValidationReport(fix, error, context) {
    if (!this.options.createReports) {
      return { skipped: true, reason: 'Report generation disabled' };
    }

    console.log('Generating validation report...');

    try {
      const reportResult = await this.reporter.generateReport(
        this.pipelineState.validationResults,
        {
          fix,
          error,
          context,
          pipelineState: this.pipelineState
        }
      );

      console.log(`✅ Validation report generated: ${reportResult.reportDir}`);

      return reportResult;

    } catch (reportError) {
      console.warn('Report generation failed:', reportError.message);
      return { failed: true, error: reportError.message };
    }
  }

  async cleanupPipeline(fix, error, context) {
    console.log('Performing pipeline cleanup...');

    const cleanup = {
      checkpointsCleanedUp: 0,
      tempFilesRemoved: 0,
      warnings: []
    };

    try {
      // Cleanup old checkpoints (keep recent ones)
      const checkpoints = this.rollbackManager.listCheckpoints();
      const oldCheckpoints = checkpoints.slice(10); // Keep 10 most recent

      for (const checkpoint of oldCheckpoints) {
        try {
          await this.rollbackManager.deleteCheckpoint(checkpoint.id);
          cleanup.checkpointsCleanedUp++;
        } catch (e) {
          cleanup.warnings.push(`Failed to cleanup checkpoint ${checkpoint.id}`);
        }
      }

      // Remove temporary files
      const tempDirs = ['./test-sandbox', './temp-validation'];
      for (const tempDir of tempDirs) {
        if (await fs.pathExists(tempDir)) {
          try {
            const entries = await fs.readdir(tempDir);
            const oldEntries = entries.slice(0, -3); // Keep 3 most recent

            for (const entry of oldEntries) {
              await fs.remove(path.join(tempDir, entry));
              cleanup.tempFilesRemoved++;
            }
          } catch (e) {
            cleanup.warnings.push(`Failed to cleanup temp directory ${tempDir}`);
          }
        }
      }

      return cleanup;

    } catch (cleanupError) {
      console.warn('Cleanup warnings:', cleanupError.message);
      cleanup.warnings.push(cleanupError.message);
      return cleanup;
    }
  }

  /**
   * Helper methods
   */

  validateInputs(fix, error, context) {
    if (!fix || typeof fix !== 'object') {
      throw new Error('Invalid fix object provided');
    }

    if (!fix.type) {
      throw new Error('Fix type is required');
    }

    if (!error || typeof error !== 'object') {
      throw new Error('Invalid error object provided');
    }

    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context object provided');
    }

    if (!context.file) {
      throw new Error('Context must specify target file');
    }
  }

  setupPipelineMonitoring() {
    // Setup monitoring hooks
    process.on('SIGINT', async () => {
      console.log('Pipeline interrupted, performing cleanup...');
      await this.handlePipelineInterruption();
      process.exit(1);
    });

    // Monitor memory usage
    if (this.options.monitorMemory) {
      this.memoryMonitor = setInterval(() => {
        const usage = process.memoryUsage();
        if (usage.heapUsed > 512 * 1024 * 1024) { // 512MB
          console.warn('High memory usage detected:', usage);
        }
      }, 30000);
    }
  }

  checkForCriticalBlockers(validationResults) {
    const stages = validationResults.stages;

    // Syntax errors are always blockers
    if (!stages.syntax.passed) {
      return true;
    }

    // If original error isn't fixed, that's a blocker
    if (!stages.functional.originalErrorFixed) {
      return true;
    }

    // Multiple regression failures are blockers
    if (stages.regression.failed > 2) {
      return true;
    }

    return false;
  }

  async performFixApplication(fix, context) {
    const targetFile = path.resolve(context.file);

    if (!(await fs.pathExists(targetFile))) {
      throw new Error(`Target file does not exist: ${targetFile}`);
    }

    // Backup the original file
    const backupFile = `${targetFile}.backup-${Date.now()}`;
    await fs.copy(targetFile, backupFile);

    try {
      if (fix.type === 'file-replacement') {
        await fs.writeFile(targetFile, fix.content);
      } else if (fix.type === 'line-insertion') {
        let content = await fs.readFile(targetFile, 'utf-8');
        const lines = content.split('\n');

        if (context.line && context.line > 0) {
          lines.splice(context.line - 1, 0, fix.code);
        } else {
          lines.push(fix.code);
        }

        await fs.writeFile(targetFile, lines.join('\n'));
      } else if (fix.type === 'content-replacement') {
        let content = await fs.readFile(targetFile, 'utf-8');

        if (fix.search && fix.replace) {
          content = content.replace(new RegExp(fix.search, 'g'), fix.replace);
          await fs.writeFile(targetFile, content);
        } else {
          throw new Error('Content replacement requires search and replace patterns');
        }
      } else {
        throw new Error(`Unsupported fix type: ${fix.type}`);
      }

      console.log(`Fix applied successfully to ${targetFile}`);

    } catch (applicationError) {
      // Restore from backup on failure
      await fs.copy(backupFile, targetFile);
      await fs.remove(backupFile);
      throw applicationError;
    }

    // Keep backup file for potential rollback
    console.log(`Backup created: ${backupFile}`);
  }

  async performEmergencyRollback() {
    if (!this.pipelineState.checkpointId) {
      throw new Error('No checkpoint available for rollback');
    }

    console.log(`Performing emergency rollback to checkpoint ${this.pipelineState.checkpointId}`);

    const rollbackResult = await this.rollbackManager.rollbackTo(
      this.pipelineState.checkpointId,
      { verifyIntegrity: false } // Skip verification in emergency
    );

    if (!rollbackResult.success) {
      throw new Error('Emergency rollback failed');
    }

    console.log('Emergency rollback completed successfully');
    return rollbackResult;
  }

  async handlePipelineInterruption() {
    console.log('Handling pipeline interruption...');

    // Attempt rollback if fix was applied
    if (this.pipelineState.applied && !this.pipelineState.rolledBack) {
      try {
        await this.performEmergencyRollback();
      } catch (e) {
        console.error('Failed to rollback on interruption:', e.message);
      }
    }

    // Clear monitoring
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
  }

  async finalCleanup() {
    // Clear monitoring
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }

    // Reset pipeline state
    this.pipelineState = {
      currentStage: null,
      startTime: null,
      checkpointId: null,
      validationResults: null,
      applied: false,
      rolledBack: false
    };
  }

  generatePipelineId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `pipeline_${timestamp}_${random}`;
  }

  /**
   * Public utility methods
   */

  /**
   * Get pipeline status
   */
  getStatus() {
    return {
      currentStage: this.pipelineState.currentStage,
      startTime: this.pipelineState.startTime,
      duration: this.pipelineState.startTime ? Date.now() - this.pipelineState.startTime : 0,
      checkpointId: this.pipelineState.checkpointId,
      applied: this.pipelineState.applied,
      rolledBack: this.pipelineState.rolledBack
    };
  }

  /**
   * Manual rollback trigger
   */
  async rollback(checkpointId) {
    const targetCheckpoint = checkpointId || this.pipelineState.checkpointId;

    if (!targetCheckpoint) {
      throw new Error('No checkpoint available for rollback');
    }

    const rollbackResult = await this.rollbackManager.rollbackTo(targetCheckpoint);

    if (rollbackResult.success) {
      this.pipelineState.rolledBack = true;
      this.pipelineState.applied = false;
    }

    return rollbackResult;
  }

  /**
   * List available checkpoints
   */
  listCheckpoints() {
    return this.rollbackManager.listCheckpoints();
  }

  /**
   * Get validation history
   */
  getValidationHistory() {
    return this.fixValidator.validationResults.slice(-10); // Last 10 validations
  }
}