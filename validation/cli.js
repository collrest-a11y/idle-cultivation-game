#!/usr/bin/env node

/**
 * Comprehensive CLI for the Validation & Fix Loop System
 *
 * This CLI provides multiple commands for managing the validation loop:
 * - run: Execute the validation loop
 * - status: Check current status
 * - resume: Resume interrupted validation
 * - clear: Clear state and start fresh
 * - report: Generate reports
 * - test: Run integration tests
 * - config: Manage configuration
 * - emergency-stop: Emergency stop controls
 */

import { program } from 'commander';
import { LoopController } from './loop-controller.js';
import { LoopIntegrationTester } from './test-loop-integration.js';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// Configure the main program
program
  .name('validation-loop')
  .description('Automated Validation & Fix Loop System for 100% Error-Free Code')
  .version('1.0.0')
  .configureOutput({
    writeErr: (str) => process.stderr.write(chalk.red(str)),
    writeOut: (str) => process.stdout.write(str),
  });

/**
 * Main RUN command - Execute the validation loop
 */
program
  .command('run')
  .description('Run the validation and fix loop')
  .option('-m, --max-iterations <n>', 'Maximum iterations', '10')
  .option('-c, --confidence <n>', 'Minimum fix confidence (0-100)', '70')
  .option('-p, --parallel <n>', 'Parallel fixes per iteration', '3')
  .option('--server-url <url>', 'Application server URL', 'http://localhost:8080')
  .option('--working-dir <path>', 'Project working directory', process.cwd())
  .option('--api-key <key>', 'MCP API key')
  .option('--no-auto-apply', 'Disable automatic fix application')
  .option('--no-reports', 'Disable report generation')
  .option('--convergence-threshold <n>', 'Error threshold for convergence', '0')
  .option('--max-memory <n>', 'Maximum memory usage (MB)', '1024')
  .option('--max-time <n>', 'Maximum execution time (minutes)', '120')
  .option('--state-dir <path>', 'State persistence directory', '.validation-loop-state')
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Validation only, no fixes applied')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Starting Validation & Fix Loop'));
      console.log(chalk.gray('='.repeat(50)));

      const config = createConfig(options);
      const controller = new LoopController(config);

      // Setup progress reporting
      setupProgressReporting(controller, options.verbose);

      const results = await controller.run();
      displayResults(results);

      process.exit(results.success ? 0 : 1);

    } catch (error) {
      console.error(chalk.red.bold('💥 Fatal Error:'), error.message);
      if (options.verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * RESUME command - Resume interrupted validation
 */
program
  .command('resume')
  .description('Resume interrupted validation from saved state')
  .option('--state-dir <path>', 'State directory', '.validation-loop-state')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🔄 Resuming Validation Loop'));

      const config = createConfig(options);
      const controller = new LoopController(config);

      const resumed = await controller.resume();
      if (!resumed) {
        console.log(chalk.yellow('📭 No previous state found to resume'));
        process.exit(1);
      }

      setupProgressReporting(controller, options.verbose);
      const results = await controller.run();
      displayResults(results);

      process.exit(results.success ? 0 : 1);

    } catch (error) {
      console.error(chalk.red.bold('💥 Resume failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * STATUS command - Check current status
 */
program
  .command('status')
  .description('Check current validation loop status')
  .option('--state-dir <path>', 'State directory', '.validation-loop-state')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const { LoopStateManager } = await import('./loop-state-manager.js');
      const stateManager = new LoopStateManager({ stateDir: options.stateDir });

      const stateInfo = await stateManager.getStateInfo();
      const stateFiles = await stateManager.listStateFiles();

      if (options.json) {
        console.log(JSON.stringify({ stateInfo, stateFiles }, null, 2));
      } else {
        displayStatus(stateInfo, stateFiles);
      }

    } catch (error) {
      console.error(chalk.red('Failed to get status:'), error.message);
      process.exit(1);
    }
  });

/**
 * CLEAR command - Clear state and start fresh
 */
program
  .command('clear')
  .description('Clear validation loop state')
  .option('--state-dir <path>', 'State directory', '.validation-loop-state')
  .option('-f, --force', 'Force clear without confirmation')
  .action(async (options) => {
    try {
      if (!options.force) {
        const { default: inquirer } = await import('inquirer');
        const answers = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to clear all validation state?',
          default: false
        }]);

        if (!answers.confirm) {
          console.log(chalk.yellow('Operation cancelled'));
          process.exit(0);
        }
      }

      console.log(chalk.blue('🗑️ Clearing validation state...'));

      const { LoopStateManager } = await import('./loop-state-manager.js');
      const stateManager = new LoopStateManager({ stateDir: options.stateDir });

      const cleared = await stateManager.clearState();
      if (cleared) {
        console.log(chalk.green('✅ State cleared successfully'));
      } else {
        console.log(chalk.yellow('⚠️ No state found to clear'));
      }

    } catch (error) {
      console.error(chalk.red('Failed to clear state:'), error.message);
      process.exit(1);
    }
  });

/**
 * REPORT command - Generate reports
 */
program
  .command('report')
  .description('Generate validation reports')
  .option('--state-dir <path>', 'State directory', '.validation-loop-state')
  .option('--output-dir <path>', 'Report output directory', './validation-reports')
  .option('--format <type>', 'Report format (html, json, text)', 'html')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📄 Generating validation reports...'));

      const { ValidationReporter } = await import('./validation-reporter.js');
      const { LoopStateManager } = await import('./loop-state-manager.js');

      const stateManager = new LoopStateManager({ stateDir: options.stateDir });
      const stateInfo = await stateManager.getStateInfo();

      if (!stateInfo.exists) {
        console.log(chalk.yellow('📭 No validation data found'));
        process.exit(1);
      }

      const reporter = new ValidationReporter({
        outputDir: options.outputDir,
        format: options.format
      });

      // Generate report from state data
      const reportResult = await reporter.generateReport(stateInfo);

      console.log(chalk.green('✅ Reports generated:'));
      console.log(chalk.gray(`   Directory: ${reportResult.reportDir}`));

    } catch (error) {
      console.error(chalk.red('Failed to generate reports:'), error.message);
      process.exit(1);
    }
  });

/**
 * TEST command - Run integration tests
 */
program
  .command('test')
  .description('Run integration tests')
  .option('--verbose', 'Enable verbose test output')
  .option('--timeout <ms>', 'Test timeout in milliseconds', '300000')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🧪 Running Integration Tests'));

      const tester = new LoopIntegrationTester();
      const results = await tester.runAllTests();

      if (results.success) {
        console.log(chalk.green.bold('\n✅ All tests passed!'));
        process.exit(0);
      } else {
        console.log(chalk.red.bold('\n❌ Some tests failed'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red.bold('💥 Test execution failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * CONFIG command - Configuration management
 */
const configCmd = program
  .command('config')
  .description('Manage configuration');

configCmd
  .command('show')
  .description('Show current configuration')
  .action(() => {
    const defaultConfig = createConfig({});
    console.log(chalk.blue('Current Configuration:'));
    console.log(JSON.stringify(defaultConfig, null, 2));
  });

configCmd
  .command('validate')
  .description('Validate configuration')
  .option('--config <path>', 'Configuration file path')
  .action(async (options) => {
    try {
      let config = createConfig({});

      if (options.config) {
        const configFile = await fs.readJson(options.config);
        config = { ...config, ...configFile };
      }

      const validation = validateConfig(config);

      if (validation.valid) {
        console.log(chalk.green('✅ Configuration is valid'));
      } else {
        console.log(chalk.red('❌ Configuration validation failed:'));
        validation.errors.forEach(error => {
          console.log(chalk.red(`   ${error}`));
        });
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('Failed to validate configuration:'), error.message);
      process.exit(1);
    }
  });

/**
 * EMERGENCY-STOP command - Emergency stop controls
 */
const emergencyCmd = program
  .command('emergency')
  .description('Emergency stop controls');

emergencyCmd
  .command('stop')
  .description('Create emergency stop signal')
  .option('--reason <text>', 'Reason for emergency stop', 'Manual emergency stop')
  .option('--file <path>', 'Emergency stop file path', '.emergency-stop')
  .action(async (options) => {
    try {
      const { SafetyMechanisms } = await import('./safety-mechanisms.js');
      const safety = new SafetyMechanisms({
        emergencyStopFile: options.file
      });

      await safety.createEmergencyStop(options.reason);
      console.log(chalk.red.bold('🚨 Emergency stop signal created'));
      console.log(chalk.gray(`Reason: ${options.reason}`));

    } catch (error) {
      console.error(chalk.red('Failed to create emergency stop:'), error.message);
      process.exit(1);
    }
  });

emergencyCmd
  .command('clear')
  .description('Clear emergency stop signal')
  .option('--file <path>', 'Emergency stop file path', '.emergency-stop')
  .action(async (options) => {
    try {
      const { SafetyMechanisms } = await import('./safety-mechanisms.js');
      const safety = new SafetyMechanisms({
        emergencyStopFile: options.file
      });

      await safety.clearEmergencyStop();
      console.log(chalk.green('✅ Emergency stop signal cleared'));

    } catch (error) {
      console.error(chalk.red('Failed to clear emergency stop:'), error.message);
      process.exit(1);
    }
  });

/**
 * Helper Functions
 */

function createConfig(options) {
  return {
    maxIterations: parseInt(options.maxIterations || '10'),
    convergenceThreshold: parseInt(options.convergenceThreshold || '0'),
    confidenceThreshold: parseInt(options.confidence || '70'),
    parallelFixes: parseInt(options.parallel || '3'),
    autoApply: options.autoApply !== false && !options.dryRun,
    createReports: options.reports !== false,
    serverUrl: options.serverUrl || 'http://localhost:8080',
    workingDir: path.resolve(options.workingDir || process.cwd()),
    apiKey: options.apiKey || process.env.MCP_API_KEY,
    verbose: options.verbose || false,
    dryRun: options.dryRun || false,

    safety: {
      maxIterations: parseInt(options.maxIterations || '10'),
      maxMemoryUsageMB: parseInt(options.maxMemory || '1024'),
      maxExecutionTimeMinutes: parseInt(options.maxTime || '120'),
      emergencyStopFile: options.emergencyStopFile || '.emergency-stop'
    },

    stateManager: {
      stateDir: options.stateDir || '.validation-loop-state',
      enableIntegrityCheck: true
    },

    convergence: {
      zeroErrorThreshold: parseInt(options.convergenceThreshold || '0'),
      stallDetectionWindow: 3
    },

    validationPipeline: {
      confidenceThreshold: parseInt(options.confidence || '70'),
      autoApply: options.autoApply !== false && !options.dryRun
    }
  };
}

function validateConfig(config) {
  const errors = [];

  if (config.maxIterations < 1 || config.maxIterations > 100) {
    errors.push('maxIterations must be between 1 and 100');
  }

  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 100) {
    errors.push('confidenceThreshold must be between 0 and 100');
  }

  if (config.parallelFixes < 1 || config.parallelFixes > 10) {
    errors.push('parallelFixes must be between 1 and 10');
  }

  if (!config.workingDir || !path.isAbsolute(config.workingDir)) {
    errors.push('workingDir must be an absolute path');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function setupProgressReporting(controller, verbose) {
  // Enhanced progress reporting could be added here
  // For now, the controller handles its own progress reporting
  if (verbose) {
    console.log(chalk.gray('Verbose logging enabled'));
  }
}

function displayResults(results) {
  console.log(chalk.blue.bold('\n🎯 VALIDATION RESULTS'));
  console.log(chalk.gray('='.repeat(50)));

  const statusColor = results.success ? chalk.green : chalk.red;
  const statusIcon = results.success ? '✅' : '❌';

  console.log(`${statusIcon} Status: ${statusColor.bold(results.status.toUpperCase())}`);
  console.log(`⏱️ Duration: ${((results.duration || 0) / 1000 / 60).toFixed(1)} minutes`);
  console.log(`🔄 Iterations: ${results.iterations}`);

  if (results.totalErrors > 0) {
    console.log(`📊 Total Errors: ${results.totalErrors}`);
    console.log(`✅ Fixed: ${results.fixedErrors}`);
    console.log(`❌ Failed: ${results.failedFixes}`);
    console.log(`⏭️ Skipped: ${results.skippedFixes}`);

    const successRate = (results.fixedErrors / results.totalErrors * 100).toFixed(1);
    const rateColor = successRate >= 80 ? chalk.green : successRate >= 50 ? chalk.yellow : chalk.red;
    console.log(`📈 Success Rate: ${rateColor(successRate + '%')}`);
  } else {
    console.log(chalk.green('🎉 No errors detected - system is clean!'));
  }

  if (results.convergenceAnalysis) {
    console.log(`\n🎯 Convergence: ${results.convergenceAnalysis.recommendedAction}`);
    console.log(`🔍 Confidence: ${results.convergenceAnalysis.confidence}%`);
  }
}

function displayStatus(stateInfo, stateFiles) {
  console.log(chalk.blue.bold('📊 Validation Loop Status'));
  console.log(chalk.gray('='.repeat(40)));

  if (!stateInfo.exists) {
    console.log(chalk.yellow('📭 No active validation state'));
    return;
  }

  console.log(`📁 State File: ${path.basename(stateInfo.filePath)}`);
  console.log(`📊 Size: ${(stateInfo.size / 1024).toFixed(1)}KB`);
  console.log(`🔄 Iteration: ${stateInfo.iteration}`);
  console.log(`📈 Status: ${chalk.cyan(stateInfo.status)}`);
  console.log(`📅 Modified: ${new Date(stateInfo.modified).toLocaleString()}`);
  console.log(`🐛 Error Count: ${stateInfo.errorCount}`);
  console.log(`🔧 Fix Count: ${stateInfo.fixCount}`);

  if (stateFiles.length > 1) {
    console.log(`\n📋 Available State Files: ${stateFiles.length}`);
    stateFiles.slice(0, 5).forEach(file => {
      const icon = file.isBackup ? '💾' : '📄';
      console.log(`   ${icon} ${file.fileName} (${file.iteration} iterations)`);
    });
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error(chalk.red.bold('\n💥 Uncaught Exception:'));
  console.error(chalk.red(error.message));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red.bold('\n💥 Unhandled Promise Rejection:'));
  console.error(chalk.red(reason));
  process.exit(1);
});

// Parse and execute commands
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}