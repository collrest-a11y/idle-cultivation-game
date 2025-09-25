import fs from 'fs-extra';
import path from 'path';

/**
 * Metrics Collector - Real-time performance and system metrics collection
 *
 * Collects, aggregates, and stores various system and application metrics
 * during the validation and fix loop process.
 */
export class MetricsCollector {
  constructor(config = {}) {
    this.config = {
      collectionInterval: config.collectionInterval || 5000, // 5 seconds
      metricsPath: config.metricsPath || './validation-reports/metrics',
      enableSystemMetrics: config.enableSystemMetrics !== false,
      enableApplicationMetrics: config.enableApplicationMetrics !== false,
      enableNetworkMetrics: config.enableNetworkMetrics || false,
      retentionHours: config.retentionHours || 24,
      ...config
    };

    this.isCollecting = false;
    this.collectionTimer = null;
    this.metricsBuffer = [];
    this.currentSession = null;

    // Metric categories
    this.metrics = {
      system: {
        memory: [],
        cpu: [],
        timestamp: []
      },
      application: {
        iterations: [],
        errors: [],
        fixes: [],
        performance: []
      },
      network: {
        requests: [],
        latency: [],
        errors: []
      },
      custom: {}
    };
  }

  /**
   * Initialize metrics collector
   */
  async initialize(sessionId) {
    console.log('📊 Initializing Metrics Collector...');

    this.currentSession = sessionId;
    await fs.ensureDir(this.config.metricsPath);

    // Clean up old metric files
    await this.cleanupOldMetrics();

    console.log(`✅ Metrics Collector initialized for session: ${sessionId}`);
  }

  /**
   * Start real-time metrics collection
   */
  startCollection() {
    if (this.isCollecting) {
      console.warn('⚠️ Metrics collection already running');
      return;
    }

    this.isCollecting = true;
    console.log('🎯 Starting real-time metrics collection...');

    // Start periodic collection
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);

    // Initial collection
    this.collectMetrics();
  }

  /**
   * Stop metrics collection
   */
  async stopCollection() {
    if (!this.isCollecting) return;

    this.isCollecting = false;

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }

    // Flush remaining metrics
    await this.flushMetrics();

    console.log('⏹️ Metrics collection stopped');
  }

  /**
   * Collect all enabled metrics
   */
  async collectMetrics() {
    const timestamp = Date.now();
    const metricSnapshot = {
      timestamp,
      sessionId: this.currentSession
    };

    // Collect system metrics
    if (this.config.enableSystemMetrics) {
      metricSnapshot.system = await this.collectSystemMetrics();
    }

    // Collect application metrics
    if (this.config.enableApplicationMetrics) {
      metricSnapshot.application = await this.collectApplicationMetrics();
    }

    // Collect network metrics
    if (this.config.enableNetworkMetrics) {
      metricSnapshot.network = await this.collectNetworkMetrics();
    }

    // Add to buffer
    this.metricsBuffer.push(metricSnapshot);

    // Flush buffer if it gets too large
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetrics();
    }

    this.updateMetricsStore(metricSnapshot);
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    const metrics = {};

    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      metrics.memory = {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024)
      };

      // CPU metrics
      const cpuUsage = process.cpuUsage();
      metrics.cpu = {
        user: cpuUsage.user,
        system: cpuUsage.system,
        userPercent: (cpuUsage.user / 1000000).toFixed(2), // Convert to seconds
        systemPercent: (cpuUsage.system / 1000000).toFixed(2)
      };

      // Process metrics
      metrics.process = {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform
      };

      // Resource usage
      metrics.resourceUsage = await this.getResourceUsage();

    } catch (error) {
      console.warn('⚠️ Error collecting system metrics:', error.message);
      metrics.error = error.message;
    }

    return metrics;
  }

  /**
   * Collect application-specific metrics
   */
  async collectApplicationMetrics() {
    const metrics = {};

    try {
      // Validation loop metrics
      metrics.validation = {
        activeIterations: this.getActiveIterations(),
        totalErrors: this.getTotalErrors(),
        fixQueue: this.getFixQueueSize(),
        convergenceRate: this.getCurrentConvergenceRate()
      };

      // Performance metrics
      metrics.performance = {
        avgIterationTime: this.getAverageIterationTime(),
        avgFixTime: this.getAverageFixTime(),
        errorDetectionRate: this.getErrorDetectionRate(),
        fixSuccessRate: this.getFixSuccessRate()
      };

      // Error metrics
      metrics.errors = {
        byType: this.getErrorsByType(),
        bySeverity: this.getErrorsBySeverity(),
        byComponent: this.getErrorsByComponent(),
        recentTrend: this.getRecentErrorTrend()
      };

      // Fix metrics
      metrics.fixes = {
        successful: this.getSuccessfulFixes(),
        failed: this.getFailedFixes(),
        pending: this.getPendingFixes(),
        avgConfidence: this.getAverageFixConfidence()
      };

    } catch (error) {
      console.warn('⚠️ Error collecting application metrics:', error.message);
      metrics.error = error.message;
    }

    return metrics;
  }

  /**
   * Collect network-related metrics
   */
  async collectNetworkMetrics() {
    const metrics = {};

    try {
      // HTTP request metrics (if applicable)
      metrics.http = {
        activeConnections: this.getActiveConnections(),
        totalRequests: this.getTotalRequests(),
        errorRate: this.getRequestErrorRate(),
        avgResponseTime: this.getAverageResponseTime()
      };

      // MCP/AI service metrics
      metrics.ai = {
        requestCount: this.getAIRequestCount(),
        avgLatency: this.getAIAverageLatency(),
        errorCount: this.getAIErrorCount(),
        tokenUsage: this.getTokenUsage()
      };

    } catch (error) {
      console.warn('⚠️ Error collecting network metrics:', error.message);
      metrics.error = error.message;
    }

    return metrics;
  }

  /**
   * Record a custom metric
   */
  recordCustomMetric(category, name, value, metadata = {}) {
    const timestamp = Date.now();

    if (!this.metrics.custom[category]) {
      this.metrics.custom[category] = {};
    }

    if (!this.metrics.custom[category][name]) {
      this.metrics.custom[category][name] = [];
    }

    this.metrics.custom[category][name].push({
      timestamp,
      value,
      metadata
    });

    // Keep only recent data
    this.metrics.custom[category][name] = this.metrics.custom[category][name]
      .filter(entry => timestamp - entry.timestamp < 3600000); // 1 hour
  }

  /**
   * Record an iteration event
   */
  recordIteration(iterationData) {
    const timestamp = Date.now();

    this.metrics.application.iterations.push({
      timestamp,
      number: iterationData.iteration,
      duration: iterationData.duration,
      errorsFound: iterationData.errorsFound,
      fixesApplied: iterationData.fixesApplied,
      fixesFailed: iterationData.fixesFailed,
      memoryUsage: iterationData.memoryUsage,
      stage: iterationData.stage
    });

    // Emit metric event for real-time updates
    this.emitMetricUpdate('iteration', iterationData);
  }

  /**
   * Record an error event
   */
  recordError(errorData) {
    const timestamp = Date.now();

    this.metrics.application.errors.push({
      timestamp,
      type: errorData.type,
      severity: errorData.severity,
      component: errorData.component,
      message: errorData.message,
      resolved: false
    });

    this.emitMetricUpdate('error', errorData);
  }

  /**
   * Record a fix event
   */
  recordFix(fixData) {
    const timestamp = Date.now();

    this.metrics.application.fixes.push({
      timestamp,
      errorType: fixData.errorType,
      result: fixData.result,
      confidence: fixData.confidence,
      duration: fixData.duration,
      retries: fixData.retries || 0
    });

    this.emitMetricUpdate('fix', fixData);
  }

  /**
   * Get current metrics summary
   */
  getCurrentMetrics() {
    const timestamp = Date.now();

    return {
      timestamp,
      sessionId: this.currentSession,
      system: this.getLatestSystemMetrics(),
      application: this.getApplicationSummary(),
      network: this.getNetworkSummary(),
      custom: this.getCustomMetricsSummary()
    };
  }

  /**
   * Get aggregated metrics for a time window
   */
  getAggregatedMetrics(windowMinutes = 60) {
    const cutoffTime = Date.now() - (windowMinutes * 60 * 1000);

    const aggregated = {
      timeWindow: `${windowMinutes} minutes`,
      system: this.aggregateSystemMetrics(cutoffTime),
      application: this.aggregateApplicationMetrics(cutoffTime),
      network: this.aggregateNetworkMetrics(cutoffTime)
    };

    return aggregated;
  }

  /**
   * Export metrics data
   */
  async exportMetrics(format = 'json') {
    const exportData = {
      sessionId: this.currentSession,
      exportTime: Date.now(),
      metrics: this.metrics,
      summary: this.getCurrentMetrics()
    };

    const filename = `metrics-${this.currentSession}-${Date.now()}.${format}`;
    const exportPath = path.join(this.config.metricsPath, 'exports', filename);

    await fs.ensureDir(path.dirname(exportPath));

    switch (format) {
      case 'json':
        await fs.writeJson(exportPath, exportData, { spaces: 2 });
        break;
      case 'csv':
        await this.exportToCSV(exportData, exportPath);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    console.log(`📈 Metrics exported to: ${exportPath}`);
    return exportPath;
  }

  /**
   * Update metrics store with new snapshot
   */
  updateMetricsStore(snapshot) {
    const timestamp = snapshot.timestamp;

    // Update system metrics
    if (snapshot.system) {
      this.metrics.system.memory.push({
        timestamp,
        ...snapshot.system.memory
      });
      this.metrics.system.cpu.push({
        timestamp,
        ...snapshot.system.cpu
      });
    }

    // Keep only recent data (last hour)
    const cutoffTime = timestamp - 3600000; // 1 hour
    this.cleanupOldMetricsData(cutoffTime);
  }

  /**
   * Flush metrics buffer to storage
   */
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const filename = `metrics-${this.currentSession}-${Date.now()}.json`;
    const metricsPath = path.join(this.config.metricsPath, 'raw', filename);

    await fs.ensureDir(path.dirname(metricsPath));
    await fs.writeJson(metricsPath, this.metricsBuffer, { spaces: 2 });

    console.log(`💾 Flushed ${this.metricsBuffer.length} metric snapshots to storage`);
    this.metricsBuffer = [];
  }

  /**
   * Clean up old metric files
   */
  async cleanupOldMetrics() {
    const cutoffTime = Date.now() - (this.config.retentionHours * 60 * 60 * 1000);
    const rawMetricsDir = path.join(this.config.metricsPath, 'raw');

    try {
      if (await fs.pathExists(rawMetricsDir)) {
        const files = await fs.readdir(rawMetricsDir);

        for (const file of files) {
          const filePath = path.join(rawMetricsDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.remove(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error during metrics cleanup:', error.message);
    }
  }

  /**
   * Helper methods for collecting specific metrics
   */

  async getResourceUsage() {
    try {
      // Platform-specific resource usage
      const usage = {
        timestamp: Date.now(),
        available: true
      };

      // Basic resource info (cross-platform)
      if (typeof process.resourceUsage === 'function') {
        const rusage = process.resourceUsage();
        usage.userCPUTime = rusage.userCPUTime;
        usage.systemCPUTime = rusage.systemCPUTime;
        usage.maxRSS = rusage.maxRSS;
      }

      return usage;
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  getLatestSystemMetrics() {
    const latest = {
      memory: this.metrics.system.memory.slice(-1)[0] || null,
      cpu: this.metrics.system.cpu.slice(-1)[0] || null
    };

    return latest;
  }

  getApplicationSummary() {
    const iterations = this.metrics.application.iterations;
    const errors = this.metrics.application.errors;
    const fixes = this.metrics.application.fixes;

    return {
      totalIterations: iterations.length,
      totalErrors: errors.length,
      totalFixes: fixes.length,
      successfulFixes: fixes.filter(f => f.result === 'success').length,
      avgIterationTime: iterations.length > 0
        ? iterations.reduce((sum, i) => sum + i.duration, 0) / iterations.length
        : 0
    };
  }

  getNetworkSummary() {
    // Placeholder for network metrics summary
    return {
      totalRequests: 0,
      avgLatency: 0,
      errorRate: 0
    };
  }

  getCustomMetricsSummary() {
    const summary = {};

    Object.entries(this.metrics.custom).forEach(([category, metrics]) => {
      summary[category] = {};
      Object.entries(metrics).forEach(([name, values]) => {
        summary[category][name] = {
          count: values.length,
          latest: values.slice(-1)[0] || null
        };
      });
    });

    return summary;
  }

  // Placeholder methods for application metrics (would be implemented based on actual loop controller integration)
  getActiveIterations() { return 0; }
  getTotalErrors() { return this.metrics.application.errors.length; }
  getFixQueueSize() { return 0; }
  getCurrentConvergenceRate() { return 0; }
  getAverageIterationTime() { return 0; }
  getAverageFixTime() { return 0; }
  getErrorDetectionRate() { return 0; }
  getFixSuccessRate() { return 0; }
  getErrorsByType() { return {}; }
  getErrorsBySeverity() { return {}; }
  getErrorsByComponent() { return {}; }
  getRecentErrorTrend() { return 'stable'; }
  getSuccessfulFixes() { return 0; }
  getFailedFixes() { return 0; }
  getPendingFixes() { return 0; }
  getAverageFixConfidence() { return 0; }
  getActiveConnections() { return 0; }
  getTotalRequests() { return 0; }
  getRequestErrorRate() { return 0; }
  getAverageResponseTime() { return 0; }
  getAIRequestCount() { return 0; }
  getAIAverageLatency() { return 0; }
  getAIErrorCount() { return 0; }
  getTokenUsage() { return { input: 0, output: 0 }; }

  cleanupOldMetricsData(cutoffTime) {
    // Clean up old data points from in-memory metrics
    this.metrics.system.memory = this.metrics.system.memory.filter(m => m.timestamp > cutoffTime);
    this.metrics.system.cpu = this.metrics.system.cpu.filter(c => c.timestamp > cutoffTime);
    this.metrics.application.iterations = this.metrics.application.iterations.filter(i => i.timestamp > cutoffTime);
    this.metrics.application.errors = this.metrics.application.errors.filter(e => e.timestamp > cutoffTime);
    this.metrics.application.fixes = this.metrics.application.fixes.filter(f => f.timestamp > cutoffTime);
  }

  emitMetricUpdate(type, data) {
    // Emit event for real-time dashboard updates
    // This would integrate with the Reporter's event system
    console.log(`📊 Metric update [${type}]:`, data);
  }

  async exportToCSV(data, filePath) {
    // Simple CSV export implementation
    const csv = [];
    csv.push('timestamp,metric_type,metric_name,value');

    // Export system metrics
    if (data.metrics.system.memory) {
      data.metrics.system.memory.forEach(entry => {
        csv.push(`${entry.timestamp},system,memory_heap_used,${entry.heapUsed}`);
        csv.push(`${entry.timestamp},system,memory_heap_total,${entry.heapTotal}`);
      });
    }

    // Export application metrics
    if (data.metrics.application.iterations) {
      data.metrics.application.iterations.forEach(entry => {
        csv.push(`${entry.timestamp},application,iteration_duration,${entry.duration}`);
        csv.push(`${entry.timestamp},application,errors_found,${entry.errorsFound}`);
      });
    }

    await fs.writeFile(filePath, csv.join('\n'));
  }

  aggregateSystemMetrics(cutoffTime) {
    const recentMemory = this.metrics.system.memory.filter(m => m.timestamp > cutoffTime);
    const recentCPU = this.metrics.system.cpu.filter(c => c.timestamp > cutoffTime);

    return {
      memory: {
        avg: recentMemory.length > 0
          ? recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) / recentMemory.length
          : 0,
        max: recentMemory.length > 0 ? Math.max(...recentMemory.map(m => m.heapUsed)) : 0,
        samples: recentMemory.length
      },
      cpu: {
        avgUser: recentCPU.length > 0
          ? recentCPU.reduce((sum, c) => sum + c.user, 0) / recentCPU.length
          : 0,
        avgSystem: recentCPU.length > 0
          ? recentCPU.reduce((sum, c) => sum + c.system, 0) / recentCPU.length
          : 0,
        samples: recentCPU.length
      }
    };
  }

  aggregateApplicationMetrics(cutoffTime) {
    const recentIterations = this.metrics.application.iterations.filter(i => i.timestamp > cutoffTime);
    const recentErrors = this.metrics.application.errors.filter(e => e.timestamp > cutoffTime);
    const recentFixes = this.metrics.application.fixes.filter(f => f.timestamp > cutoffTime);

    return {
      iterations: {
        count: recentIterations.length,
        avgDuration: recentIterations.length > 0
          ? recentIterations.reduce((sum, i) => sum + i.duration, 0) / recentIterations.length
          : 0
      },
      errors: {
        count: recentErrors.length,
        byType: this.groupByField(recentErrors, 'type'),
        bySeverity: this.groupByField(recentErrors, 'severity')
      },
      fixes: {
        count: recentFixes.length,
        successRate: recentFixes.length > 0
          ? recentFixes.filter(f => f.result === 'success').length / recentFixes.length
          : 0
      }
    };
  }

  aggregateNetworkMetrics(cutoffTime) {
    // Placeholder for network metrics aggregation
    return {
      requests: 0,
      avgLatency: 0,
      errorRate: 0
    };
  }

  groupByField(array, field) {
    return array.reduce((groups, item) => {
      const value = item[field] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }
}