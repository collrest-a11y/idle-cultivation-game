import dotenv from 'dotenv';
import { ClaudeFixService } from './claude-service.js';
import { ErrorMonitor } from './error-monitor.js';
import { ValidationPipeline } from './validation-pipeline.js';
import { DashboardServer } from './dashboard-server.js';
import { Logger } from './logger.js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';

// Load environment variables
dotenv.config();

class AutomatedFixSystem {
  constructor() {
    this.logger = new Logger('AutoFixSystem');
    this.stats = {
      startTime: Date.now(),
      errorsFixed: 0,
      errorsFailed: 0,
      totalErrors: 0,
      uptime: 0
    };
  }

  async initialize() {
    console.clear();
    console.log(chalk.cyan.bold(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🤖 AUTOMATED FIX SYSTEM - Production Ready                ║
║     Powered by Claude AI                                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `));

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sk-ant-api03-YOUR-KEY-HERE') {
      console.log(chalk.red.bold('\n❌ ERROR: Claude API key not configured!'));
      console.log(chalk.yellow('\nTo set up:'));
      console.log(chalk.white('1. Get your API key from https://console.anthropic.com/'));
      console.log(chalk.white('2. Copy .env.example to .env'));
      console.log(chalk.white('3. Add your API key to the .env file'));
      console.log(chalk.white('4. Restart the system\n'));
      process.exit(1);
    }

    const spinner = ora('Initializing systems...').start();

    try {
      // Initialize Claude service
      spinner.text = 'Initializing Claude AI service...';
      this.claudeService = new ClaudeFixService();
      await this.delay(500);

      // Initialize error monitor
      spinner.text = 'Starting error monitoring...';
      this.errorMonitor = new ErrorMonitor();
      await this.errorMonitor.start();
      await this.delay(500);

      // Initialize validation pipeline
      spinner.text = 'Setting up validation pipeline...';
      this.validationPipeline = new ValidationPipeline();
      await this.delay(500);

      // Initialize dashboard
      if (process.env.NODE_ENV !== 'test') {
        spinner.text = 'Starting dashboard server...';
        this.dashboard = new DashboardServer(this);
        await this.dashboard.start();
        await this.delay(500);
      }

      // Set up error processing
      this.setupErrorProcessing();

      // Set up periodic stats reporting
      this.startStatsReporting();

      spinner.succeed('All systems initialized successfully!');

      // Print system status
      this.printStatus();

      // Save injection script
      await this.saveInjectionScript();

    } catch (error) {
      spinner.fail('Initialization failed');
      this.logger.error('Failed to initialize system:', error);
      process.exit(1);
    }
  }

  setupErrorProcessing() {
    this.errorMonitor.on('process', async (error) => {
      this.stats.totalErrors++;

      try {
        this.logger.info(`Processing error: ${error.message}`);

        // Get fix from Claude
        const fix = await this.claudeService.analyzeAndFix(error);

        if (fix.confidence < parseInt(process.env.CONFIDENCE_THRESHOLD || '75')) {
          this.logger.warn(`Fix confidence too low: ${fix.confidence}%`);
          this.stats.errorsFailed++;
          return;
        }

        // Validate fix
        const validation = await this.validationPipeline.validateFix(fix, error, '');

        if (!validation.passed) {
          this.logger.warn(`Fix validation failed: Score ${validation.score}%`);
          this.stats.errorsFailed++;
          return;
        }

        // Apply fix if configured
        if (process.env.AUTO_APPLY_FIXES === 'true') {
          const result = await this.claudeService.applyFix(fix, error);

          if (result.success) {
            this.logger.info(chalk.green(`✅ Fix applied successfully to ${result.filePath}`));
            this.stats.errorsFixed++;

            // Notify connected clients
            this.errorMonitor.broadcast({
              type: 'fixApplied',
              fix: {
                description: fix.description,
                confidence: fix.confidence,
                file: result.filePath
              }
            });
          } else {
            this.logger.error('Failed to apply fix:', result.error);
            this.stats.errorsFailed++;
          }
        } else {
          this.logger.info(chalk.yellow(`Fix ready but auto-apply disabled (confidence: ${fix.confidence}%)`));
          this.logger.info(`Fix: ${fix.description}`);
        }

      } catch (error) {
        this.logger.error('Error processing failed:', error);
        this.stats.errorsFailed++;
      }
    });
  }

  startStatsReporting() {
    // Update stats every minute
    setInterval(() => {
      this.stats.uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);

      // Log metrics
      this.logger.metric('errors.total', this.stats.totalErrors);
      this.logger.metric('errors.fixed', this.stats.errorsFixed);
      this.logger.metric('errors.failed', this.stats.errorsFailed);
      this.logger.metric('uptime.seconds', this.stats.uptime);

    }, 60000);
  }

  printStatus() {
    const config = {
      'API Key': '✅ Configured',
      'Auto Apply': process.env.AUTO_APPLY_FIXES === 'true' ? '✅ Enabled' : '⚠️  Disabled',
      'Confidence Threshold': `${process.env.CONFIDENCE_THRESHOLD || 75}%`,
      'Max Fixes/Hour': process.env.MAX_FIXES_PER_HOUR || 100,
      'WebSocket Port': process.env.WS_PORT || 3002,
      'Dashboard Port': process.env.DASHBOARD_PORT || 3003,
      'Environment': process.env.NODE_ENV || 'development'
    };

    console.log(chalk.cyan.bold('\n📊 System Configuration:'));
    Object.entries(config).forEach(([key, value]) => {
      console.log(chalk.white(`   ${key.padEnd(20)} : ${value}`));
    });

    console.log(chalk.green.bold('\n🚀 System Status:'));
    console.log(chalk.white(`   Error Monitor       : ${chalk.green('Running on ws://localhost:' + (process.env.WS_PORT || 3002))}`));
    console.log(chalk.white(`   Dashboard           : ${chalk.green('http://localhost:' + (process.env.DASHBOARD_PORT || 3003))}`));
    console.log(chalk.white(`   Claude Service      : ${chalk.green('Connected')}`));
    console.log(chalk.white(`   Validation Pipeline : ${chalk.green('Ready')}`));

    console.log(chalk.yellow.bold('\n📝 Instructions:'));
    console.log(chalk.white('   1. Add this script to your game\'s HTML:'));
    console.log(chalk.gray(`      <script src="http://localhost:${process.env.DASHBOARD_PORT || 3003}/inject.js"></script>`));
    console.log(chalk.white('   2. Or manually copy the script from automated-fix-system/inject.js'));
    console.log(chalk.white('   3. Open your game in a browser'));
    console.log(chalk.white('   4. Errors will be automatically detected and fixed!'));

    console.log(chalk.cyan('\n📊 Dashboard: ') + chalk.white.underline(`http://localhost:${process.env.DASHBOARD_PORT || 3003}`));
    console.log(chalk.gray('\n[Press Ctrl+C to stop]\n'));
  }

  async saveInjectionScript() {
    const { browserScript } = await import('./error-monitor.js');
    await fs.writeFile('inject.js', browserScript);
    this.logger.info('Browser injection script saved to inject.js');
  }

  getStats() {
    return {
      ...this.stats,
      claude: this.claudeService.getStats(),
      monitor: this.errorMonitor.getStats(),
      successRate: this.stats.totalErrors > 0
        ? Math.round((this.stats.errorsFixed / this.stats.totalErrors) * 100)
        : 0
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    this.logger.info('Shutting down system...');

    if (this.errorMonitor) {
      this.errorMonitor.stop();
    }

    if (this.validationPipeline) {
      await this.validationPipeline.cleanup();
    }

    if (this.dashboard) {
      await this.dashboard.stop();
    }

    this.logger.info('System shut down complete');
    process.exit(0);
  }
}

// Start the system
const system = new AutomatedFixSystem();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nShutting down gracefully...'));
  system.shutdown();
});

process.on('SIGTERM', () => {
  system.shutdown();
});

// Initialize
system.initialize().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});