import fs from 'fs-extra';
import path from 'path';

/**
 * SafetyMechanisms - Comprehensive safety systems for the validation loop
 *
 * This class provides multiple safety mechanisms to prevent:
 * 1. Infinite loops and runaway iterations
 * 2. Resource exhaustion (memory, disk, CPU)
 * 3. Destructive fixes that break more than they fix
 * 4. System instability from rapid changes
 * 5. Data loss from corruption or errors
 */
export class SafetyMechanisms {
  constructor(config = {}) {
    this.config = {
      // Loop safety limits
      maxIterations: config.maxIterations || 10,
      maxConsecutiveFailures: config.maxConsecutiveFailures || 5,
      maxErrorsPerIteration: config.maxErrorsPerIteration || 50,

      // Resource monitoring
      maxMemoryUsageMB: config.maxMemoryUsageMB || 1024,
      maxDiskUsageGB: config.maxDiskUsageGB || 5,
      maxExecutionTimeMinutes: config.maxExecutionTimeMinutes || 120,

      // Error retry limits
      maxErrorRetries: config.maxErrorRetries || 3,
      retryBackoffMs: config.retryBackoffMs || 1000,

      // Fix safety thresholds
      minFixConfidence: config.minFixConfidence || 30,
      maxFixesPerIteration: config.maxFixesPerIteration || 10,
      maxConcurrentFixes: config.maxConcurrentFixes || 3,

      // Stability monitoring
      maxRegressionRate: config.maxRegressionRate || 0.3, // 30%
      stabilityCheckWindow: config.stabilityCheckWindow || 3,

      // File system safety
      backupBeforeFix: config.backupBeforeFix !== false, // Default true
      maxFileChangesPerIteration: config.maxFileChangesPerIteration || 20,

      // Emergency stops
      enableEmergencyStop: config.enableEmergencyStop !== false, // Default true
      emergencyStopFile: config.emergencyStopFile || '.emergency-stop',

      ...config
    };

    // Safety state tracking
    this.safetyState = {
      consecutiveFailures: 0,
      errorRetryCount: new Map(), // errorId -> retry count
      recentFixResults: [], // Ring buffer of recent fix results
      resourceUsageHistory: [],
      fileChanges: new Map(), // iteration -> file change count
      emergencyStopRequested: false
    };

    // Monitoring intervals
    this.resourceMonitorInterval = null;
    this.signalHandlers = new Map();

    // Statistics
    this.stats = {
      safetyTriggered: 0,
      emergencyStops: 0,
      resourceLimitHits: 0,
      fixesBlocked: 0,
      errorsSkipped: 0
    };
  }

  /**
   * Setup signal handlers for graceful shutdown
   * @param {Function} interruptHandler - Function to call when interrupt received
   */
  setupSignalHandlers(interruptHandler) {
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'];

    for (const signal of signals) {
      const handler = async () => {
        console.log(`\n🛑 Received ${signal}, triggering safety shutdown...`);
        this.safetyState.emergencyStopRequested = true;
        this.stats.emergencyStops++;

        if (interruptHandler) {
          await interruptHandler();
        }
      };

      process.on(signal, handler);
      this.signalHandlers.set(signal, handler);
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught exception, triggering emergency stop:', error);
      this.safetyState.emergencyStopRequested = true;
      this.stats.emergencyStops++;

      if (interruptHandler) {
        await interruptHandler();
      }

      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      console.error('💥 Unhandled promise rejection, triggering emergency stop:', reason);
      this.safetyState.emergencyStopRequested = true;
      this.stats.emergencyStops++;

      if (interruptHandler) {
        await interruptHandler();
      }
    });
  }

  /**
   * Start resource monitoring
   */
  startMonitoring() {
    console.log('🛡️ Starting safety monitoring systems...');

    // Monitor resource usage every 30 seconds
    this.resourceMonitorInterval = setInterval(() => {
      this.checkResourceUsage();
    }, 30000);

    // Check for emergency stop file
    this.emergencyStopCheckInterval = setInterval(() => {
      this.checkEmergencyStopFile();
    }, 5000);

    console.log('✅ Safety monitoring active');
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring() {
    console.log('🛡️ Stopping safety monitoring...');

    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }

    if (this.emergencyStopCheckInterval) {
      clearInterval(this.emergencyStopCheckInterval);
      this.emergencyStopCheckInterval = null;
    }

    // Remove signal handlers
    for (const [signal, handler] of this.signalHandlers) {
      process.removeListener(signal, handler);
    }
    this.signalHandlers.clear();
  }

  /**
   * Check if the loop should stop based on safety criteria
   * @param {Object} loopState - Current loop state
   * @param {Array} iterationResults - Array of iteration results
   * @returns {Object} { stop: boolean, reason: string }
   */
  shouldStopLoop(loopState, iterationResults) {
    // Check for emergency stop request
    if (this.safetyState.emergencyStopRequested) {
      return {
        stop: true,
        reason: 'Emergency stop requested',
        severity: 'CRITICAL'
      };
    }

    // Check iteration limit
    if (loopState.iteration >= this.config.maxIterations) {
      return {
        stop: true,
        reason: `Maximum iterations reached (${this.config.maxIterations})`,
        severity: 'WARNING'
      };
    }

    // Check execution time limit
    const elapsed = Date.now() - loopState.startTime;
    const elapsedMinutes = elapsed / (1000 * 60);
    if (elapsedMinutes > this.config.maxExecutionTimeMinutes) {
      return {
        stop: true,
        reason: `Maximum execution time exceeded (${this.config.maxExecutionTimeMinutes} minutes)`,
        severity: 'WARNING'
      };
    }

    // Check consecutive failures
    if (this.safetyState.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return {
        stop: true,
        reason: `Too many consecutive failures (${this.safetyState.consecutiveFailures})`,
        severity: 'HIGH'
      };
    }

    // Check resource usage
    const resourceCheck = this.checkResourceLimits();
    if (resourceCheck.exceeded) {
      return {
        stop: true,
        reason: `Resource limit exceeded: ${resourceCheck.reason}`,
        severity: 'HIGH'
      };
    }

    // Check system stability
    const stabilityCheck = this.checkSystemStability(iterationResults);
    if (!stabilityCheck.stable) {
      return {
        stop: true,
        reason: `System instability detected: ${stabilityCheck.reason}`,
        severity: 'HIGH'
      };
    }

    return { stop: false };
  }

  /**
   * Check if an error should be skipped based on safety criteria
   * @param {Object} error - Error to check
   * @param {Array} fixHistory - History of fix attempts
   * @returns {string|null} Skip reason or null if should not skip
   */
  shouldSkipError(error, fixHistory) {
    const errorKey = this.getErrorKey(error);

    // Check retry limit
    const retryCount = this.safetyState.errorRetryCount.get(errorKey) || 0;
    if (retryCount >= this.config.maxErrorRetries) {
      this.stats.errorsSkipped++;
      return `Maximum retries exceeded (${retryCount}/${this.config.maxErrorRetries})`;
    }

    // Check if error has been causing regressions
    const regressionRate = this.calculateErrorRegressionRate(error, fixHistory);
    if (regressionRate > this.config.maxRegressionRate) {
      this.stats.errorsSkipped++;
      return `High regression rate (${(regressionRate * 100).toFixed(1)}%)`;
    }

    // Skip errors from unstable components
    if (this.isComponentUnstable(error.component, fixHistory)) {
      this.stats.errorsSkipped++;
      return `Component ${error.component} is unstable`;
    }

    return null;
  }

  /**
   * Check if a fix should be blocked based on safety criteria
   * @param {Object} fix - Fix to check
   * @param {Object} error - Associated error
   * @param {Object} context - Fix context
   * @returns {Object} { block: boolean, reason: string }
   */
  shouldBlockFix(fix, error, context) {
    // Check fix confidence
    if (fix.confidence < this.config.minFixConfidence) {
      this.stats.fixesBlocked++;
      return {
        block: true,
        reason: `Fix confidence too low (${fix.confidence}% < ${this.config.minFixConfidence}%)`,
        severity: 'MEDIUM'
      };
    }

    // Check if fix affects critical files
    if (this.isCriticalFile(context.file)) {
      if (fix.confidence < 80) { // Higher threshold for critical files
        this.stats.fixesBlocked++;
        return {
          block: true,
          reason: `Insufficient confidence for critical file (${fix.confidence}% < 80%)`,
          severity: 'HIGH'
        };
      }
    }

    // Check for destructive operations
    if (this.isDestructiveFix(fix)) {
      this.stats.fixesBlocked++;
      return {
        block: true,
        reason: 'Fix contains potentially destructive operations',
        severity: 'HIGH'
      };
    }

    // Check file change limits
    const currentIteration = context.iteration || 0;
    const currentChanges = this.safetyState.fileChanges.get(currentIteration) || 0;
    if (currentChanges >= this.config.maxFileChangesPerIteration) {
      this.stats.fixesBlocked++;
      return {
        block: true,
        reason: `File change limit reached (${currentChanges}/${this.config.maxFileChangesPerIteration})`,
        severity: 'MEDIUM'
      };
    }

    return { block: false };
  }

  /**
   * Record a fix attempt result for safety tracking
   * @param {Object} error - The error that was fixed
   * @param {Object} fix - The fix that was applied
   * @param {boolean} success - Whether the fix was successful
   * @param {string} reason - Reason for success/failure
   */
  recordFixAttempt(error, fix, success, reason) {
    const errorKey = this.getErrorKey(error);

    // Update retry count
    const currentRetries = this.safetyState.errorRetryCount.get(errorKey) || 0;
    this.safetyState.errorRetryCount.set(errorKey, currentRetries + 1);

    // Add to recent fix results (ring buffer)
    const result = {
      error: { type: error.type, component: error.component, severity: error.severity },
      fix: { confidence: fix.confidence, type: fix.type },
      success,
      reason,
      timestamp: Date.now()
    };

    this.safetyState.recentFixResults.push(result);

    // Keep only last 50 results
    if (this.safetyState.recentFixResults.length > 50) {
      this.safetyState.recentFixResults.shift();
    }

    // Update consecutive failure count
    if (success) {
      this.safetyState.consecutiveFailures = 0;
    } else {
      this.safetyState.consecutiveFailures++;
    }
  }

  /**
   * Record file change for tracking
   * @param {string} filePath - Path of file that was changed
   * @param {number} iteration - Current iteration number
   */
  recordFileChange(filePath, iteration) {
    const currentChanges = this.safetyState.fileChanges.get(iteration) || 0;
    this.safetyState.fileChanges.set(iteration, currentChanges + 1);

    console.log(`📝 File changed: ${path.basename(filePath)} (${currentChanges + 1}/${this.config.maxFileChangesPerIteration})`);
  }

  /**
   * Create emergency stop file
   */
  async createEmergencyStop(reason = 'Manual emergency stop') {
    const stopFilePath = this.config.emergencyStopFile;

    try {
      await fs.writeFile(stopFilePath, JSON.stringify({
        reason,
        timestamp: Date.now(),
        pid: process.pid
      }));

      console.log(`🚨 Emergency stop file created: ${stopFilePath}`);
      this.safetyState.emergencyStopRequested = true;

    } catch (error) {
      console.error('Failed to create emergency stop file:', error.message);
    }
  }

  /**
   * Remove emergency stop file
   */
  async clearEmergencyStop() {
    const stopFilePath = this.config.emergencyStopFile;

    try {
      if (await fs.pathExists(stopFilePath)) {
        await fs.remove(stopFilePath);
        console.log(`✅ Emergency stop file cleared`);
      }

      this.safetyState.emergencyStopRequested = false;

    } catch (error) {
      console.error('Failed to clear emergency stop file:', error.message);
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Check current resource usage
   */
  checkResourceUsage() {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / (1024 * 1024);

    const resourceInfo = {
      timestamp: Date.now(),
      memoryUsageMB: memUsageMB,
      heapTotal: memUsage.heapTotal / (1024 * 1024),
      external: memUsage.external / (1024 * 1024)
    };

    this.safetyState.resourceUsageHistory.push(resourceInfo);

    // Keep only last 100 measurements
    if (this.safetyState.resourceUsageHistory.length > 100) {
      this.safetyState.resourceUsageHistory.shift();
    }

    // Log warnings for high usage
    if (memUsageMB > this.config.maxMemoryUsageMB * 0.8) {
      console.warn(`⚠️ High memory usage: ${memUsageMB.toFixed(1)}MB (${(memUsageMB / this.config.maxMemoryUsageMB * 100).toFixed(1)}% of limit)`);
    }
  }

  /**
   * Check if resource limits are exceeded
   */
  checkResourceLimits() {
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / (1024 * 1024);

    if (memUsageMB > this.config.maxMemoryUsageMB) {
      this.stats.resourceLimitHits++;
      return {
        exceeded: true,
        reason: `Memory usage ${memUsageMB.toFixed(1)}MB exceeds limit ${this.config.maxMemoryUsageMB}MB`
      };
    }

    // Check disk usage (simplified check of current working directory)
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified check - in production, you'd check actual disk space
    } catch (error) {
      // Disk check failed, but don't stop the loop for this
    }

    return { exceeded: false };
  }

  /**
   * Check system stability based on recent iterations
   */
  checkSystemStability(iterationResults) {
    if (iterationResults.length < this.config.stabilityCheckWindow) {
      return { stable: true }; // Not enough data yet
    }

    const recentIterations = iterationResults.slice(-this.config.stabilityCheckWindow);

    // Check for increasing error counts (system degrading)
    const errorCounts = recentIterations.map(iter => iter.errors?.length || 0);
    const isIncreasing = errorCounts.every((count, i) => i === 0 || count >= errorCounts[i - 1]);

    if (isIncreasing && errorCounts[errorCounts.length - 1] > errorCounts[0]) {
      return {
        stable: false,
        reason: `Error count increasing over ${this.config.stabilityCheckWindow} iterations`
      };
    }

    // Check for oscillating behavior
    let directionChanges = 0;
    for (let i = 1; i < errorCounts.length - 1; i++) {
      const prevChange = errorCounts[i] - errorCounts[i - 1];
      const nextChange = errorCounts[i + 1] - errorCounts[i];

      if ((prevChange > 0 && nextChange < 0) || (prevChange < 0 && nextChange > 0)) {
        directionChanges++;
      }
    }

    if (directionChanges >= Math.floor(this.config.stabilityCheckWindow / 2)) {
      return {
        stable: false,
        reason: `High oscillation detected (${directionChanges} direction changes)`
      };
    }

    return { stable: true };
  }

  /**
   * Check for emergency stop file
   */
  async checkEmergencyStopFile() {
    const stopFilePath = this.config.emergencyStopFile;

    try {
      if (await fs.pathExists(stopFilePath)) {
        const stopData = JSON.parse(await fs.readFile(stopFilePath, 'utf-8'));

        console.log(`🚨 Emergency stop file detected: ${stopData.reason}`);
        this.safetyState.emergencyStopRequested = true;
        this.stats.emergencyStops++;
      }
    } catch (error) {
      // Ignore errors reading emergency stop file
    }
  }

  /**
   * Calculate regression rate for an error
   */
  calculateErrorRegressionRate(error, fixHistory) {
    const errorKey = this.getErrorKey(error);
    const relatedFixes = fixHistory.filter(fix =>
      this.getErrorKey(fix.error) === errorKey
    );

    if (relatedFixes.length === 0) return 0;

    const regressions = relatedFixes.filter(fix =>
      fix.success === false && fix.reason?.includes('regression')
    );

    return regressions.length / relatedFixes.length;
  }

  /**
   * Check if a component is unstable
   */
  isComponentUnstable(component, fixHistory) {
    const componentFixes = fixHistory.filter(fix =>
      fix.error.component === component
    );

    if (componentFixes.length < 3) return false; // Need some history

    const recentFixes = componentFixes.slice(-5);
    const failureRate = recentFixes.filter(fix => !fix.success).length / recentFixes.length;

    return failureRate > 0.6; // 60% failure rate indicates instability
  }

  /**
   * Check if a file is critical
   */
  isCriticalFile(filePath) {
    if (!filePath) return false;

    const criticalPatterns = [
      /package\.json$/,
      /index\.html$/,
      /main\.js$/,
      /game-state\.js$/,
      /character-creation\.js$/,
      /save-game\.js$/
    ];

    return criticalPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if a fix is potentially destructive
   */
  isDestructiveFix(fix) {
    const destructivePatterns = [
      /rm\s+-rf/,
      /delete\s+.*\*/,
      /DROP\s+TABLE/i,
      /TRUNCATE/i,
      /format\s+/i,
      />\s*\/dev\/null/,
      /unlink\s*\(/
    ];

    const code = fix.code || '';
    return destructivePatterns.some(pattern => pattern.test(code));
  }

  /**
   * Generate unique key for an error
   */
  getErrorKey(error) {
    return `${error.type}-${error.component || 'unknown'}-${error.message?.substring(0, 50) || ''}`;
  }

  /**
   * Get safety statistics and current state
   */
  getSafetyReport() {
    const memUsage = process.memoryUsage();
    const currentMemUsageMB = memUsage.heapUsed / (1024 * 1024);

    return {
      statistics: { ...this.stats },
      state: {
        consecutiveFailures: this.safetyState.consecutiveFailures,
        emergencyStopRequested: this.safetyState.emergencyStopRequested,
        recentFixResults: this.safetyState.recentFixResults.slice(-10), // Last 10
        errorRetryCount: Object.fromEntries(this.safetyState.errorRetryCount)
      },
      resourceUsage: {
        currentMemoryMB: currentMemUsageMB,
        memoryLimitMB: this.config.maxMemoryUsageMB,
        memoryUsagePercent: (currentMemUsageMB / this.config.maxMemoryUsageMB * 100).toFixed(1)
      },
      limits: {
        maxIterations: this.config.maxIterations,
        maxConsecutiveFailures: this.config.maxConsecutiveFailures,
        maxErrorRetries: this.config.maxErrorRetries,
        maxFileChangesPerIteration: this.config.maxFileChangesPerIteration
      }
    };
  }

  /**
   * Reset safety state (for testing or fresh start)
   */
  reset() {
    this.safetyState = {
      consecutiveFailures: 0,
      errorRetryCount: new Map(),
      recentFixResults: [],
      resourceUsageHistory: [],
      fileChanges: new Map(),
      emergencyStopRequested: false
    };

    this.stats = {
      safetyTriggered: 0,
      emergencyStops: 0,
      resourceLimitHits: 0,
      fixesBlocked: 0,
      errorsSkipped: 0
    };
  }

  /**
   * Export safety data for analysis
   */
  exportData() {
    return {
      config: this.config,
      state: {
        consecutiveFailures: this.safetyState.consecutiveFailures,
        emergencyStopRequested: this.safetyState.emergencyStopRequested,
        recentFixResults: this.safetyState.recentFixResults,
        resourceUsageHistory: this.safetyState.resourceUsageHistory,
        errorRetryCount: Object.fromEntries(this.safetyState.errorRetryCount),
        fileChanges: Object.fromEntries(this.safetyState.fileChanges)
      },
      statistics: this.stats
    };
  }
}