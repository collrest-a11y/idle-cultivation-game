import { chromium } from 'playwright';
import { ErrorDetector } from './error-detector.js';
import { ValidationPipeline } from './validation-pipeline.js';
import { ValidationReporter } from './validation-reporter.js';
import { MCPFixGenerator } from '../fix-generation/mcp-client.js';
import { ConvergenceDetector } from './convergence-detector.js';
import { ErrorPrioritizer } from './error-prioritizer.js';
import { LoopStateManager } from './loop-state-manager.js';
import { SafetyMechanisms } from './safety-mechanisms.js';
import { LoopIntegration } from './reporting/loop-integration.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * LoopController - Main orchestration system for the validation & fix loop
 *
 * This class coordinates all components to achieve 100% error-free code through
 * iterative validation, error detection, fix generation, and application.
 */
export class LoopController {
  constructor(config = {}) {
    this.config = {
      maxIterations: config.maxIterations || 10,
      convergenceThreshold: config.convergenceThreshold || 0,
      parallelFixes: config.parallelFixes || 3,
      confidenceThreshold: config.confidenceThreshold || 70,
      autoApply: config.autoApply !== false,
      createReports: config.createReports !== false,
      serverUrl: config.serverUrl || 'http://localhost:8080',
      workingDir: config.workingDir || process.cwd(),
      ...config
    };

    // Initialize state
    this.state = {
      iteration: 0,
      totalErrors: 0,
      fixedErrors: 0,
      failedFixes: 0,
      skippedFixes: 0,
      startTime: null,
      endTime: null,
      status: 'idle', // idle, running, success, failed, interrupted
      currentStage: null
    };

    // Initialize components
    this.errorDetector = new ErrorDetector();
    this.fixGenerator = new MCPFixGenerator(config);
    this.validationPipeline = new ValidationPipeline(config.validationPipeline);
    this.reporter = new ValidationReporter(config.reporter);
    this.convergenceDetector = new ConvergenceDetector(config.convergence);
    this.errorPrioritizer = new ErrorPrioritizer(config.prioritizer);
    this.stateManager = new LoopStateManager(config.stateManager);
    this.safetyMechanisms = new SafetyMechanisms(config.safety);

    // Initialize reporting integration
    this.reportingIntegration = new LoopIntegration({
      enableReporter: config.enableEnhancedReporting !== false,
      enableAnalytics: config.enableAnalytics !== false,
      enableMetrics: config.enableMetrics !== false,
      enableTrends: config.enableTrends !== false,
      enableReportGeneration: config.enableReportGeneration !== false,
      realTimeUpdates: config.realTimeUpdates !== false,
      ...config.reporting
    });

    // Tracking data
    this.errorHistory = [];
    this.fixHistory = [];
    this.iterationResults = [];
    this.browser = null;
  }

  /**
   * Main execution method - runs the complete validation & fix loop
   */
  async run() {
    const sessionId = this.generateSessionId();
    console.log(`🚀 Starting Validation & Fix Loop (Session: ${sessionId})`);

    this.state.startTime = Date.now();
    this.state.status = 'running';

    try {
      // Initialize all systems
      await this.initialize();

      // Main validation loop
      while (await this.shouldContinueLoop()) {
        await this.runIteration();
      }

      // Determine final status
      this.state.status = this.convergenceDetector.hasConverged(this.errorHistory) ? 'success' : 'failed';

      console.log(`\n${this.state.status === 'success' ? '✅' : '❌'} Loop completed with status: ${this.state.status.toUpperCase()}`);

    } catch (error) {
      console.error('💥 Fatal error in validation loop:', error.message);
      this.state.status = 'failed';
      this.state.error = error.message;
      throw error;

    } finally {
      this.state.endTime = Date.now();
      await this.cleanup();
      await this.generateFinalReport();
    }

    return this.getResults();
  }

  /**
   * Initialize all systems and prepare for loop execution
   */
  async initialize() {
    console.log('🔧 Initializing validation loop systems...');
    this.state.currentStage = 'initialization';

    // Setup safety mechanisms first
    this.safetyMechanisms.setupSignalHandlers(() => this.handleInterruption());
    this.safetyMechanisms.startMonitoring();

    // Load previous state if resuming
    const previousState = await this.stateManager.loadState();
    if (previousState) {
      console.log(`📂 Resuming from iteration ${previousState.iteration}`);
      this.state = { ...this.state, ...previousState };
      this.errorHistory = previousState.errorHistory || [];
      this.fixHistory = previousState.fixHistory || [];
    }

    // Initialize browser for error detection
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });

    // Initialize components
    await this.validationPipeline.initialize?.();
    await this.reporter.initialize();

    // Initialize enhanced reporting integration
    await this.reportingIntegration.initialize(this);

    console.log('✅ All systems initialized successfully');
  }

  /**
   * Run a single iteration of the validation & fix loop
   */
  async runIteration() {
    this.state.iteration++;
    this.state.currentStage = `iteration-${this.state.iteration}`;

    console.log(`\n📍 Starting Iteration ${this.state.iteration}/${this.config.maxIterations}`);

    const iterationStartTime = Date.now();
    const iterationResult = {
      iteration: this.state.iteration,
      startTime: iterationStartTime,
      endTime: null,
      errors: [],
      fixes: [],
      results: null
    };

    try {
      // Stage 1: Detect all errors
      console.log('🔍 Stage 1: Error Detection');
      this.state.currentStage = 'error-detection';
      const errors = await this.detectErrors();
      iterationResult.errors = errors;

      console.log(`   Found ${errors.length} total errors`);

      if (errors.length === 0) {
        console.log('🎉 No errors detected! System is clean.');
        this.convergenceDetector.recordErrorCount(0);
        return;
      }

      // Stage 2: Prioritize errors for fixing
      console.log('📊 Stage 2: Error Prioritization');
      this.state.currentStage = 'error-prioritization';
      const prioritizedErrors = this.errorPrioritizer.prioritizeErrors(errors, {
        iterationNumber: this.state.iteration,
        previousResults: this.fixHistory,
        systemContext: {
          totalErrors: this.state.totalErrors,
          fixedErrors: this.state.fixedErrors,
          failedFixes: this.state.failedFixes
        }
      });

      console.log(`   Prioritized ${prioritizedErrors.length} errors for processing`);

      // Stage 3: Generate and apply fixes
      console.log('🔧 Stage 3: Fix Generation & Application');
      this.state.currentStage = 'fix-processing';
      const fixResults = await this.processPrioritizedErrors(prioritizedErrors);
      iterationResult.fixes = fixResults.fixes;
      iterationResult.results = fixResults;

      // Stage 4: Update state and check convergence
      console.log('📈 Stage 4: State Update & Convergence Check');
      this.state.currentStage = 'state-update';
      this.updateIterationState(fixResults);

      // Record error count for convergence detection
      const remainingErrors = errors.length - fixResults.successful.length;
      this.convergenceDetector.recordErrorCount(remainingErrors);
      this.errorHistory.push({
        iteration: this.state.iteration,
        totalErrors: errors.length,
        fixedErrors: fixResults.successful.length,
        failedErrors: fixResults.failed.length,
        skippedErrors: fixResults.skipped.length,
        timestamp: Date.now()
      });

      // Stage 5: Progress reporting
      console.log('📋 Stage 5: Progress Reporting');
      this.state.currentStage = 'progress-reporting';
      await this.reportIterationProgress(iterationResult);

      // Save state for resumption capability
      await this.stateManager.saveState(this.state, {
        errorHistory: this.errorHistory,
        fixHistory: this.fixHistory,
        iterationResults: this.iterationResults
      });

    } catch (iterationError) {
      console.error(`❌ Iteration ${this.state.iteration} failed:`, iterationError.message);
      iterationResult.error = iterationError.message;
      throw iterationError;

    } finally {
      iterationResult.endTime = Date.now();
      iterationResult.duration = iterationResult.endTime - iterationResult.startTime;
      this.iterationResults.push(iterationResult);

      console.log(`⏱️ Iteration ${this.state.iteration} completed in ${(iterationResult.duration / 1000).toFixed(1)}s`);
    }
  }

  /**
   * Detect all errors in the system
   */
  async detectErrors() {
    const page = await this.browser.newPage();

    // Setup error collection
    const detectedErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        detectedErrors.push({
          type: 'console-error',
          severity: 'MEDIUM',
          message: msg.text(),
          location: { url: page.url() },
          timestamp: Date.now(),
          component: this.inferComponentFromMessage(msg.text())
        });
      }
    });

    page.on('pageerror', error => {
      detectedErrors.push({
        type: 'runtime-error',
        severity: 'HIGH',
        message: error.message,
        stack: error.stack,
        location: { url: page.url() },
        timestamp: Date.now(),
        component: this.inferComponentFromStack(error.stack)
      });
    });

    try {
      // Navigate to the application
      await page.goto(this.config.serverUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Initialize error detector
      await this.errorDetector.initialize(page);

      // Run comprehensive error detection
      await this.runComprehensiveErrorDetection(page);

      // Wait for error collection
      await page.waitForTimeout(5000);

      // Get errors from error detector
      const systemErrors = this.errorDetector.getErrors();
      detectedErrors.push(...systemErrors);

      // Add functional error detection
      const functionalErrors = await this.detectFunctionalErrors(page);
      detectedErrors.push(...functionalErrors);

      // Deduplicate and validate errors
      return this.deduplicateAndValidateErrors(detectedErrors);

    } finally {
      await page.close();
    }
  }

  /**
   * Run comprehensive error detection tests
   */
  async runComprehensiveErrorDetection(page) {
    const testScenarios = [
      {
        name: 'character-creation',
        test: async () => {
          try {
            await page.click('#character-creation-tab', { timeout: 5000 });
            await page.waitForTimeout(2000);

            // Check if Begin Cultivation button is properly enabled
            const beginButton = await page.$('#begin-cultivation');
            if (beginButton) {
              const isEnabled = await page.evaluate(btn => !btn.disabled, beginButton);
              if (!isEnabled) {
                return {
                  type: 'functional-error',
                  severity: 'CRITICAL',
                  message: 'Begin Cultivation button not enabled after character creation',
                  component: 'character-creation',
                  issue: 'Begin button not enabled'
                };
              }
            }
          } catch (e) {
            return {
              type: 'interaction-error',
              severity: 'HIGH',
              message: `Character creation interaction failed: ${e.message}`,
              component: 'character-creation'
            };
          }
          return null;
        }
      },
      {
        name: 'game-initialization',
        test: async () => {
          try {
            const gameInitialized = await page.evaluate(() => {
              return typeof window.gameState !== 'undefined' && window.gameState !== null;
            });

            if (!gameInitialized) {
              return {
                type: 'initialization-error',
                severity: 'CRITICAL',
                message: 'Game state not properly initialized',
                component: 'game-init'
              };
            }
          } catch (e) {
            return {
              type: 'evaluation-error',
              severity: 'HIGH',
              message: `Game state evaluation failed: ${e.message}`,
              component: 'game-init'
            };
          }
          return null;
        }
      },
      {
        name: 'save-system',
        test: async () => {
          try {
            const saveSystemWorking = await page.evaluate(() => {
              if (typeof window.saveGame === 'function') {
                try {
                  window.saveGame();
                  return true;
                } catch (e) {
                  return false;
                }
              }
              return false;
            });

            if (!saveSystemWorking) {
              return {
                type: 'save-error',
                severity: 'HIGH',
                message: 'Save system not functioning correctly',
                component: 'save-system'
              };
            }
          } catch (e) {
            return {
              type: 'save-test-error',
              severity: 'MEDIUM',
              message: `Save system test failed: ${e.message}`,
              component: 'save-system'
            };
          }
          return null;
        }
      }
    ];

    const functionalErrors = [];
    for (const scenario of testScenarios) {
      try {
        const error = await scenario.test();
        if (error) {
          functionalErrors.push(error);
        }
      } catch (e) {
        functionalErrors.push({
          type: 'test-execution-error',
          severity: 'MEDIUM',
          message: `Test scenario ${scenario.name} failed to execute: ${e.message}`,
          component: scenario.name
        });
      }
    }

    return functionalErrors;
  }

  /**
   * Detect functional errors through interaction testing
   */
  async detectFunctionalErrors(page) {
    const errors = [];

    try {
      // Test critical user flows
      const userFlowTests = await this.runComprehensiveErrorDetection(page);
      errors.push(...userFlowTests);

      // Test for memory leaks
      const memoryInfo = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });

      if (memoryInfo && memoryInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
        errors.push({
          type: 'memory-warning',
          severity: 'MEDIUM',
          message: `High memory usage detected: ${Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB`,
          component: 'performance'
        });
      }

    } catch (e) {
      errors.push({
        type: 'functional-detection-error',
        severity: 'LOW',
        message: `Functional error detection failed: ${e.message}`,
        component: 'error-detection'
      });
    }

    return errors;
  }

  /**
   * Process prioritized errors in parallel batches
   */
  async processPrioritizedErrors(prioritizedErrors) {
    const results = {
      successful: [],
      failed: [],
      skipped: [],
      fixes: []
    };

    // Process in batches for parallel execution
    const batches = this.createBatches(prioritizedErrors, this.config.parallelFixes);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Processing batch ${i + 1}/${batches.length} (${batch.length} errors)`);

      const batchPromises = batch.map(error => this.processError(error));
      const batchResults = await Promise.allSettled(batchPromises);

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const error = batch[j];

        if (result.status === 'fulfilled' && result.value.success) {
          results.successful.push({ error, ...result.value });
          results.fixes.push(result.value.fix);
        } else if (result.status === 'fulfilled' && result.value.skipped) {
          results.skipped.push({ error, reason: result.value.reason });
        } else {
          const errorMessage = result.status === 'rejected' ? result.reason.message : result.value?.reason || 'Unknown error';
          results.failed.push({ error, reason: errorMessage });
        }
      }

      // Brief pause between batches to prevent overwhelming the system
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`   ✅ Successful: ${results.successful.length}, ❌ Failed: ${results.failed.length}, ⏭️ Skipped: ${results.skipped.length}`);

    return results;
  }

  /**
   * Process a single error through the fix generation and validation pipeline
   */
  async processError(error) {
    const errorId = `${error.type}-${error.component || 'unknown'}-${Date.now()}`;

    try {
      // Check if we should skip this error
      const skipReason = this.safetyMechanisms.shouldSkipError(error, this.fixHistory);
      if (skipReason) {
        console.log(`   ⏭️ Skipping ${error.type}: ${skipReason}`);
        return { skipped: true, reason: skipReason };
      }

      // Generate context for fix generation
      const context = await this.gatherErrorContext(error);

      // Generate fix using MCP
      console.log(`   🔧 Generating fix for ${error.type} (${error.severity})`);
      const fix = await this.fixGenerator.generateFix(error, context);

      // Check fix confidence threshold
      if (fix.confidence < this.config.confidenceThreshold) {
        console.log(`   ⏭️ Skipping low confidence fix: ${fix.confidence}% < ${this.config.confidenceThreshold}%`);
        this.recordFixAttempt(error, fix, false, 'low-confidence');
        return { skipped: true, reason: 'low-confidence', confidence: fix.confidence };
      }

      // Run through validation pipeline
      console.log(`   ✅ Running validation pipeline (confidence: ${fix.confidence}%)`);
      const pipelineResult = await this.validationPipeline.runPipeline(fix, error, context);

      if (pipelineResult.success) {
        console.log(`   ✅ Fix successfully applied and validated`);
        this.recordFixAttempt(error, fix, true, 'success');
        return {
          success: true,
          fix,
          pipelineResult,
          confidence: fix.confidence
        };
      } else {
        console.log(`   ❌ Fix validation failed: ${pipelineResult.error}`);
        this.recordFixAttempt(error, fix, false, pipelineResult.error);
        return {
          success: false,
          reason: pipelineResult.error,
          confidence: fix.confidence
        };
      }

    } catch (error) {
      console.error(`   💥 Error processing ${errorId}:`, error.message);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Determine if the loop should continue running
   */
  async shouldContinueLoop() {
    // Check if we've hit the iteration limit
    if (this.state.iteration >= this.config.maxIterations) {
      console.log(`⏹️ Reached maximum iterations (${this.config.maxIterations})`);
      return false;
    }

    // Check for convergence
    if (this.convergenceDetector.hasConverged(this.errorHistory)) {
      console.log(`🎯 System has converged - no more errors or progress stalled`);
      return false;
    }

    // Check safety mechanisms
    const shouldStop = this.safetyMechanisms.shouldStopLoop(this.state, this.iterationResults);
    if (shouldStop.stop) {
      console.log(`🛑 Safety mechanism triggered: ${shouldStop.reason}`);
      return false;
    }

    // Check for interrupt signal
    if (this.state.status === 'interrupted') {
      console.log(`⏸️ Loop interrupted by user signal`);
      return false;
    }

    return true;
  }

  /**
   * Helper methods
   */

  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async gatherErrorContext(error) {
    const context = {
      file: error.location?.file || 'unknown',
      line: error.location?.line,
      function: error.location?.function,
      url: error.location?.url,
      userAction: error.context?.userAction,
      expectedBehavior: error.context?.expectedBehavior,
      component: error.component || 'unknown',
      relevantCode: '',
      projectStructure: {
        hasCharacterCreation: await fs.pathExists(path.join(this.config.workingDir, 'js', 'character-creation.js')),
        hasSaveSystem: await fs.pathExists(path.join(this.config.workingDir, 'js', 'save-game.js')),
        hasValidation: await fs.pathExists(path.join(this.config.workingDir, 'validation'))
      }
    };

    // Try to get relevant code snippet if we have file information
    if (context.file && context.file !== 'unknown') {
      try {
        const filePath = path.resolve(this.config.workingDir, context.file);
        if (await fs.pathExists(filePath)) {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const lines = fileContent.split('\n');

          if (context.line && context.line > 0) {
            const start = Math.max(0, context.line - 10);
            const end = Math.min(lines.length, context.line + 10);
            context.relevantCode = lines.slice(start, end).join('\n');
          } else {
            // Get first 50 lines if no specific line
            context.relevantCode = lines.slice(0, 50).join('\n');
          }
        }
      } catch (e) {
        // Ignore file read errors
        context.relevantCodeError = e.message;
      }
    }

    return context;
  }

  deduplicateAndValidateErrors(errors) {
    const seen = new Map();
    const unique = [];

    for (const error of errors) {
      const key = `${error.type}-${error.message}-${error.component}`;

      if (!seen.has(key)) {
        // Add error ID and normalize structure
        error.id = this.generateErrorId();
        error.firstSeen = Date.now();
        error.frequency = 1;

        // Ensure required fields
        if (!error.severity) error.severity = 'MEDIUM';
        if (!error.component) error.component = 'unknown';

        seen.set(key, error);
        unique.push(error);
      } else {
        // Increment frequency for duplicate
        seen.get(key).frequency++;
      }
    }

    return unique.sort((a, b) => {
      // Sort by severity first, then frequency
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      return (b.frequency || 1) - (a.frequency || 1);
    });
  }

  inferComponentFromMessage(message) {
    const patterns = [
      { pattern: /character|creation|begin|cultivation/i, component: 'character-creation' },
      { pattern: /save|load|storage/i, component: 'save-system' },
      { pattern: /game.*state|initialization/i, component: 'game-init' },
      { pattern: /ui|interface|button|click/i, component: 'ui' },
      { pattern: /network|fetch|request/i, component: 'network' },
      { pattern: /performance|memory|leak/i, component: 'performance' }
    ];

    for (const { pattern, component } of patterns) {
      if (pattern.test(message)) {
        return component;
      }
    }

    return 'unknown';
  }

  inferComponentFromStack(stack) {
    if (!stack) return 'unknown';

    if (stack.includes('character-creation')) return 'character-creation';
    if (stack.includes('save-game')) return 'save-system';
    if (stack.includes('game-state')) return 'game-init';

    return 'unknown';
  }

  recordFixAttempt(error, fix, success, reason) {
    this.fixHistory.push({
      error: {
        id: error.id,
        type: error.type,
        message: error.message,
        component: error.component,
        severity: error.severity
      },
      fix: {
        confidence: fix.confidence,
        type: fix.fixType || fix.type,
        explanation: fix.explanation
      },
      success,
      reason,
      iteration: this.state.iteration,
      timestamp: Date.now()
    });
  }

  updateIterationState(fixResults) {
    this.state.totalErrors += fixResults.successful.length + fixResults.failed.length + fixResults.skipped.length;
    this.state.fixedErrors += fixResults.successful.length;
    this.state.failedFixes += fixResults.failed.length;
    this.state.skippedFixes += fixResults.skipped.length;
  }

  async reportIterationProgress(iterationResult) {
    const elapsed = Date.now() - this.state.startTime;
    const avgIterationTime = elapsed / this.state.iteration;
    const estimatedRemaining = (this.config.maxIterations - this.state.iteration) * avgIterationTime;

    console.log(`\n📊 Iteration ${this.state.iteration} Summary:`);
    console.log(`   📋 Errors Found: ${iterationResult.errors.length}`);
    console.log(`   ✅ Fixes Applied: ${iterationResult.results?.successful.length || 0}`);
    console.log(`   ❌ Fixes Failed: ${iterationResult.results?.failed.length || 0}`);
    console.log(`   ⏭️ Fixes Skipped: ${iterationResult.results?.skipped.length || 0}`);
    console.log(`   ⏱️ Duration: ${(iterationResult.duration / 1000).toFixed(1)}s`);
    console.log(`   ⌛ Est. Remaining: ${(estimatedRemaining / 1000 / 60).toFixed(1)} minutes`);
  }

  async handleInterruption() {
    console.log('\n⏸️ Validation loop interrupted by user signal');
    this.state.status = 'interrupted';

    // Save current state for resume
    await this.stateManager.saveState(this.state, {
      errorHistory: this.errorHistory,
      fixHistory: this.fixHistory,
      iterationResults: this.iterationResults
    });

    console.log('💾 Current progress saved for resumption');
  }

  async cleanup() {
    console.log('🧹 Cleaning up validation loop resources...');

    try {
      // Close browser if open
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      // Stop safety mechanisms
      this.safetyMechanisms.stopMonitoring();

      // Clean up error detector
      if (this.errorDetector.destroy) {
        this.errorDetector.destroy();
      }

      // Final state save
      await this.stateManager.saveState(this.state, {
        errorHistory: this.errorHistory,
        fixHistory: this.fixHistory,
        iterationResults: this.iterationResults
      });

      // Clean up reporting integration
      if (this.reportingIntegration) {
        await this.reportingIntegration.cleanup();
      }

    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  async generateFinalReport() {
    console.log('📄 Generating final validation report...');

    const duration = this.state.endTime - this.state.startTime;
    const report = {
      session: {
        id: this.generateSessionId(),
        status: this.state.status,
        startTime: this.state.startTime,
        endTime: this.state.endTime,
        duration,
        iterations: this.state.iteration
      },
      summary: {
        totalErrors: this.state.totalErrors,
        fixedErrors: this.state.fixedErrors,
        failedFixes: this.state.failedFixes,
        skippedFixes: this.state.skippedFixes,
        successRate: this.state.totalErrors > 0 ? (this.state.fixedErrors / this.state.totalErrors * 100).toFixed(1) : 100,
        avgIterationTime: this.state.iteration > 0 ? (duration / this.state.iteration / 1000).toFixed(1) : 0
      },
      convergence: this.convergenceDetector.getAnalysis(this.errorHistory),
      errorHistory: this.errorHistory,
      fixHistory: this.fixHistory.slice(-50), // Last 50 fixes
      iterationResults: this.iterationResults,
      recommendations: this.generateRecommendations()
    };

    if (this.config.createReports) {
      await this.reporter.generateReport(report);
    }

    // Console summary
    console.log('\n' + '='.repeat(80));
    console.log('🎯 VALIDATION LOOP FINAL REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Status: ${report.session.status.toUpperCase()}`);
    console.log(`⏱️ Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`🔄 Iterations: ${report.session.iterations}/${this.config.maxIterations}`);
    console.log(`✅ Success Rate: ${report.summary.successRate}% (${report.summary.fixedErrors}/${report.summary.totalErrors})`);
    console.log(`❌ Failed Fixes: ${report.summary.failedFixes}`);
    console.log(`⏭️ Skipped Fixes: ${report.summary.skippedFixes}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   ${rec.priority}: ${rec.message}`);
      });
    }

    console.log('='.repeat(80));

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.state.status === 'success') {
      recommendations.push({
        priority: 'INFO',
        message: 'All errors successfully resolved! Run full test suite before deployment.'
      });
    } else if (this.state.status === 'failed') {
      if (this.state.failedFixes > this.state.fixedErrors) {
        recommendations.push({
          priority: 'HIGH',
          message: 'Many fixes failed validation. Consider reviewing error patterns and fix generation logic.'
        });
      }

      if (this.state.iteration >= this.config.maxIterations) {
        recommendations.push({
          priority: 'WARNING',
          message: 'Maximum iterations reached. Some errors may remain unresolved.'
        });
      }
    }

    if (this.state.skippedFixes > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        message: 'Many fixes skipped due to low confidence. Consider adjusting confidence threshold.'
      });
    }

    // Analyze error patterns
    const errorTypes = this.errorHistory.reduce((acc, iteration) => {
      acc.total += iteration.totalErrors;
      return acc;
    }, { total: 0 });

    if (errorTypes.total > 50) {
      recommendations.push({
        priority: 'HIGH',
        message: 'High error count detected. Consider improving error prevention in development process.'
      });
    }

    return recommendations;
  }

  getResults() {
    return {
      success: this.state.status === 'success',
      status: this.state.status,
      iterations: this.state.iteration,
      totalErrors: this.state.totalErrors,
      fixedErrors: this.state.fixedErrors,
      failedFixes: this.state.failedFixes,
      skippedFixes: this.state.skippedFixes,
      duration: this.state.endTime - this.state.startTime,
      errorHistory: this.errorHistory,
      fixHistory: this.fixHistory,
      convergenceAnalysis: this.convergenceDetector.getAnalysis(this.errorHistory)
    };
  }

  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `loop_${timestamp}_${random}`;
  }

  generateErrorId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `error_${timestamp}_${random}`;
  }

  /**
   * Resume from a previous state
   */
  async resume() {
    console.log('🔄 Resuming validation loop from previous state...');

    const previousState = await this.stateManager.loadState();
    if (!previousState) {
      console.log('📭 No previous state found, starting fresh');
      return false;
    }

    // Restore state
    this.state = { ...this.state, ...previousState };
    this.errorHistory = previousState.errorHistory || [];
    this.fixHistory = previousState.fixHistory || [];
    this.iterationResults = previousState.iterationResults || [];

    console.log(`📂 Resumed from iteration ${this.state.iteration}`);
    console.log(`   Previous errors: ${this.state.totalErrors}`);
    console.log(`   Fixed: ${this.state.fixedErrors}, Failed: ${this.state.failedFixes}`);

    return true;
  }
}