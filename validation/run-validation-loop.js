#!/usr/bin/env node

/**
 * Main entry point for the Validation & Fix Loop System
 *
 * This script provides a complete orchestration system that:
 * 1. Runs continuous validation loops until no errors remain
 * 2. Prioritizes errors based on severity and business impact
 * 3. Generates and validates fixes using MCP integration
 * 4. Provides safety mechanisms to prevent infinite loops
 * 5. Supports resumption after interruption
 * 6. Generates comprehensive reports
 */

import { LoopController } from './loop-controller.js';
import { program } from 'commander';
import path from 'path';
import fs from 'fs-extra';

// Define CLI interface
program
  .name('run-validation-loop')
  .description('Automated validation and fix loop for 100% error-free code')
  .version('1.0.0');

program
  .option('-m, --max-iterations <n>', 'Maximum iterations to run', '10')
  .option('-c, --confidence <n>', 'Minimum fix confidence threshold (0-100)', '70')
  .option('-p, --parallel <n>', 'Number of parallel fixes to process', '3')
  .option('--server-url <url>', 'URL of the application server', 'http://localhost:8080')
  .option('--working-dir <path>', 'Working directory for the project', process.cwd())
  .option('--api-key <key>', 'MCP API key for fix generation')
  .option('--no-auto-apply', 'Disable automatic fix application')
  .option('--no-reports', 'Disable report generation')
  .option('--resume', 'Resume from previous state if available')
  .option('--clear-state', 'Clear previous state and start fresh')
  .option('--convergence-threshold <n>', 'Error count threshold for convergence', '0')
  .option('--max-memory <n>', 'Maximum memory usage in MB', '1024')
  .option('--max-time <n>', 'Maximum execution time in minutes', '120')
  .option('--emergency-stop-file <path>', 'Path to emergency stop file', '.emergency-stop')
  .option('--state-dir <path>', 'Directory for state persistence', '.validation-loop-state')
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Run without applying fixes (validation only)')

program.action(async (options) => {
  console.log('🚀 Starting Automated Validation & Fix Loop System');
  console.log('=' .repeat(60));

  try {
    // Validate prerequisites
    await validatePrerequisites(options);

    // Create loop controller with configuration
    const config = createConfiguration(options);
    const controller = new LoopController(config);

    // Handle state management
    await handleStateManagement(controller, options);

    // Handle dry-run mode
    if (options.dryRun) {
      console.log('🔍 Running in DRY-RUN mode (no fixes will be applied)');
      config.autoApply = false;
    }

    // Display configuration
    displayConfiguration(config);

    // Setup graceful shutdown
    setupGracefulShutdown(controller);

    // Run the validation loop
    const startTime = Date.now();
    const results = await controller.run();
    const duration = Date.now() - startTime;

    // Display final results
    displayResults(results, duration);

    // Exit with appropriate code
    const exitCode = results.success ? 0 : 1;
    console.log(`\n${results.success ? '✅' : '❌'} Process completed with exit code: ${exitCode}`);
    process.exit(exitCode);

  } catch (error) {
    console.error('\n💥 Fatal error occurred:');
    console.error(error.message);

    if (options.verbose) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\n🔧 Troubleshooting tips:');
    console.error('1. Check that the application server is running');
    console.error('2. Verify file permissions and disk space');
    console.error('3. Ensure all required dependencies are installed');
    console.error('4. Try clearing state with --clear-state flag');

    process.exit(1);
  }
});

/**
 * Validate system prerequisites before starting
 */
async function validatePrerequisites(options) {
  console.log('🔍 Validating prerequisites...');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 16) {
    throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
  }

  // Check working directory exists and is accessible
  const workingDir = path.resolve(options.workingDir || process.cwd());
  if (!(await fs.pathExists(workingDir))) {
    throw new Error(`Working directory does not exist: ${workingDir}`);
  }

  // Check if this looks like the correct project
  const packageJsonPath = path.join(workingDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    if (!packageJson.name?.includes('idle-cultivation-game')) {
      console.warn('⚠️  Warning: Working directory may not be the idle cultivation game project');
    }
  }

  // Check server accessibility if not in offline mode
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(options.serverUrl || 'http://localhost:8080', {
      timeout: 5000,
      method: 'HEAD'
    });

    if (!response.ok) {
      console.warn(`⚠️  Warning: Server returned ${response.status} ${response.statusText}`);
    } else {
      console.log('✅ Server is accessible');
    }
  } catch (error) {
    console.warn('⚠️  Warning: Could not reach server - validation will be limited');
  }

  // Check available memory
  const totalMemory = require('os').totalmem() / (1024 * 1024);
  const maxMemory = parseInt(options.maxMemory || '1024');
  if (maxMemory > totalMemory * 0.8) {
    console.warn(`⚠️  Warning: Memory limit (${maxMemory}MB) is high for system with ${totalMemory.toFixed(0)}MB`);
  }

  console.log('✅ Prerequisites validated');
}

/**
 * Create configuration object from command line options
 */
function createConfiguration(options) {
  return {
    // Core loop settings
    maxIterations: parseInt(options.maxIterations),
    convergenceThreshold: parseInt(options.convergenceThreshold),
    confidenceThreshold: parseInt(options.confidence),
    parallelFixes: parseInt(options.parallel),
    autoApply: options.autoApply !== false && !options.dryRun,
    createReports: options.reports !== false,

    // Server and paths
    serverUrl: options.serverUrl,
    workingDir: path.resolve(options.workingDir || process.cwd()),

    // MCP configuration
    apiKey: options.apiKey || process.env.MCP_API_KEY,

    // Safety configuration
    safety: {
      maxIterations: parseInt(options.maxIterations),
      maxMemoryUsageMB: parseInt(options.maxMemory),
      maxExecutionTimeMinutes: parseInt(options.maxTime),
      emergencyStopFile: options.emergencyStopFile,
      enableEmergencyStop: true
    },

    // State management
    stateManager: {
      stateDir: options.stateDir,
      enableIntegrityCheck: true,
      backupCount: 3
    },

    // Convergence detection
    convergence: {
      zeroErrorThreshold: parseInt(options.convergenceThreshold),
      stallDetectionWindow: 3,
      minIterationsForConvergence: 2
    },

    // Error prioritization
    prioritizer: {
      componentWeights: {
        'character-creation': 100,
        'save-system': 90,
        'game-init': 85,
        'ui': 70,
        'performance': 60,
        'network': 50,
        'unknown': 30
      }
    },

    // Validation pipeline
    validationPipeline: {
      confidenceThreshold: parseInt(options.confidence),
      autoApply: options.autoApply !== false && !options.dryRun,
      createReports: options.reports !== false
    },

    // Reporter configuration
    reporter: {
      outputDir: './validation-reports',
      includeDetailedLogs: options.verbose,
      generateCharts: true
    },

    // Logging
    verbose: options.verbose,
    dryRun: options.dryRun
  };
}

/**
 * Handle state management operations
 */
async function handleStateManagement(controller, options) {
  if (options.clearState) {
    console.log('🗑️  Clearing previous state...');
    await controller.stateManager.clearState();
    console.log('✅ State cleared');
    return;
  }

  if (options.resume) {
    console.log('🔄 Attempting to resume from previous state...');
    const resumed = await controller.resume();
    if (resumed) {
      console.log('✅ Resumed from previous state');
    } else {
      console.log('📭 No previous state found, starting fresh');
    }
  } else {
    // Check if state exists and warn user
    const hasState = await controller.stateManager.hasValidState();
    if (hasState) {
      console.log('💡 Previous state detected. Use --resume to continue or --clear-state to start fresh');
    }
  }
}

/**
 * Display the current configuration
 */
function displayConfiguration(config) {
  console.log('\n⚙️  Configuration:');
  console.log('─'.repeat(40));
  console.log(`Max Iterations: ${config.maxIterations}`);
  console.log(`Confidence Threshold: ${config.confidenceThreshold}%`);
  console.log(`Parallel Fixes: ${config.parallelFixes}`);
  console.log(`Server URL: ${config.serverUrl}`);
  console.log(`Working Directory: ${config.workingDir}`);
  console.log(`Auto-Apply Fixes: ${config.autoApply ? 'YES' : 'NO'}`);
  console.log(`Generate Reports: ${config.createReports ? 'YES' : 'NO'}`);
  console.log(`Memory Limit: ${config.safety.maxMemoryUsageMB}MB`);
  console.log(`Time Limit: ${config.safety.maxExecutionTimeMinutes} minutes`);

  if (config.dryRun) {
    console.log(`\n🔍 DRY-RUN MODE: No fixes will be applied`);
  }

  console.log('─'.repeat(40));
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(controller) {
  const signals = ['SIGINT', 'SIGTERM'];

  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

      try {
        // The controller's safety mechanisms will handle the shutdown
        // Just give it a moment to save state
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('✅ Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error.message);
        process.exit(1);
      }
    });
  }
}

/**
 * Display final results
 */
function displayResults(results, duration) {
  const durationMinutes = (duration / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log('🎯 FINAL RESULTS');
  console.log('='.repeat(80));

  console.log(`Status: ${results.status.toUpperCase()}`);
  console.log(`Duration: ${durationMinutes} minutes`);
  console.log(`Iterations: ${results.iterations}`);

  if (results.totalErrors > 0) {
    const successRate = (results.fixedErrors / results.totalErrors * 100).toFixed(1);
    console.log(`Total Errors: ${results.totalErrors}`);
    console.log(`Fixed Errors: ${results.fixedErrors}`);
    console.log(`Failed Fixes: ${results.failedFixes}`);
    console.log(`Skipped Fixes: ${results.skippedFixes}`);
    console.log(`Success Rate: ${successRate}%`);
  } else {
    console.log(`No errors detected - system is clean! ✨`);
  }

  // Display convergence analysis
  if (results.convergenceAnalysis) {
    const analysis = results.convergenceAnalysis;
    console.log('\nConvergence Analysis:');
    console.log(`- Recommendation: ${analysis.recommendedAction?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`- Confidence: ${analysis.confidence || 0}%`);
    if (analysis.reason) {
      console.log(`- Reason: ${analysis.reason}`);
    }
  }

  // Display recommendations if any
  if (results.errorHistory?.length > 0) {
    console.log('\nError History:');
    results.errorHistory.slice(-3).forEach((iteration, index) => {
      const iterNum = results.errorHistory.length - 2 + index;
      console.log(`- Iteration ${iterNum}: ${iteration.totalErrors} errors, ${iteration.fixedErrors} fixed`);
    });
  }

  console.log('='.repeat(80));

  // Additional information based on status
  if (results.status === 'success') {
    console.log('🎉 All errors have been successfully resolved!');
    console.log('📋 Recommended next steps:');
    console.log('   1. Run full test suite to verify system integrity');
    console.log('   2. Review validation reports for insights');
    console.log('   3. Consider implementing preventive measures');
  } else if (results.status === 'failed') {
    console.log('⚠️  Validation loop completed but some errors remain');
    console.log('📋 Recommended next steps:');
    console.log('   1. Review failed fixes in validation reports');
    console.log('   2. Consider manual intervention for remaining errors');
    console.log('   3. Adjust configuration and retry');
  } else if (results.status === 'interrupted') {
    console.log('⏸️  Validation loop was interrupted');
    console.log('📋 To resume: run with --resume flag');
  }
}

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:');
  console.error(error.message);
  console.error('\nThe validation loop has been terminated to prevent system instability.');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 Unhandled Promise Rejection:');
  console.error(reason);
  console.error('\nThe validation loop has been terminated to prevent system instability.');
  process.exit(1);
});

// Parse command line arguments and execute
program.parse(process.argv);