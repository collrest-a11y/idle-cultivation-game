import fs from 'fs-extra';
import path from 'path';
import { createReport } from './html-generator.js';

/**
 * Reporter - Core reporting system for validation & fix loop analytics
 *
 * Provides comprehensive tracking, analysis, and reporting of validation progress,
 * error trends, fix success rates, and system performance metrics.
 */
export class Reporter {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || './validation-reports',
      enableEmail: config.enableEmail || false,
      enableWebDashboard: config.enableWebDashboard || false,
      dataRetentionDays: config.dataRetentionDays || 30,
      realTimeUpdates: config.realTimeUpdates !== false,
      ...config
    };

    this.currentSession = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      iterations: [],
      errors: [],
      fixes: [],
      metrics: {}
    };

    this.ensureOutputDir();
    this.eventListeners = [];
  }

  async ensureOutputDir() {
    await fs.ensureDir(this.config.outputDir);
    await fs.ensureDir(path.join(this.config.outputDir, 'sessions'));
    await fs.ensureDir(path.join(this.config.outputDir, 'archives'));
    await fs.ensureDir(path.join(this.config.outputDir, 'dashboards'));
  }

  /**
   * Initialize reporter and set up real-time monitoring
   */
  async initialize() {
    console.log('📊 Initializing Reporting & Analytics System...');

    await this.ensureOutputDir();

    // Clean up old data based on retention policy
    await this.cleanupOldData();

    // Load historical data for trend analysis
    await this.loadHistoricalData();

    console.log(`✅ Reporter initialized with session: ${this.currentSession.id}`);
  }

  /**
   * Record a single iteration result
   */
  recordIteration(data) {
    const iteration = {
      number: data.iteration,
      timestamp: Date.now(),
      errorsFound: data.errorsFound,
      fixesApplied: data.fixesApplied,
      fixesFailed: data.fixesFailed,
      duration: data.duration,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      stage: data.stage || 'unknown'
    };

    this.currentSession.iterations.push(iteration);
    this.updateMetrics(iteration);

    // Emit real-time update event
    this.emitUpdate('iteration', iteration);

    console.log(`📝 Recorded iteration ${iteration.number}: ${iteration.errorsFound} errors, ${iteration.fixesApplied} fixes applied`);

    return iteration;
  }

  /**
   * Record an error detection event
   */
  recordError(error) {
    const errorRecord = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: error.type,
      severity: error.severity,
      message: error.message,
      location: error.location,
      component: error.component,
      stack: error.stack,
      context: error.context,
      iteration: this.currentSession.iterations.length,
      frequency: error.frequency || 1
    };

    this.currentSession.errors.push(errorRecord);
    this.emitUpdate('error', errorRecord);

    return errorRecord.id;
  }

  /**
   * Record a fix attempt and its result
   */
  recordFix(errorId, fix, result) {
    const fixRecord = {
      id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      errorId,
      timestamp: Date.now(),
      code: fix.code,
      explanation: fix.explanation,
      confidence: fix.confidence,
      result: result.success ? 'success' : 'failed',
      validationScore: result.validationScore,
      appliedAt: result.appliedAt,
      iteration: this.currentSession.iterations.length,
      duration: result.duration || 0,
      retryCount: result.retryCount || 0
    };

    this.currentSession.fixes.push(fixRecord);

    // Update error status
    const error = this.currentSession.errors.find(e => e.id === errorId);
    if (error) {
      error.status = result.success ? 'fixed' : 'attempted';
      error.fixId = fixRecord.id;
      error.lastAttempt = Date.now();
    }

    this.emitUpdate('fix', fixRecord);

    return fixRecord.id;
  }

  /**
   * Update session metrics based on current data
   */
  updateMetrics(iteration) {
    const metrics = this.currentSession.metrics;

    // Calculate running metrics
    metrics.totalIterations = this.currentSession.iterations.length;
    metrics.totalErrors = this.currentSession.errors.length;
    metrics.totalFixes = this.currentSession.fixes.length;
    metrics.successfulFixes = this.currentSession.fixes.filter(f => f.result === 'success').length;
    metrics.failedFixes = this.currentSession.fixes.filter(f => f.result === 'failed').length;
    metrics.fixSuccessRate = metrics.totalFixes > 0
      ? (metrics.successfulFixes / metrics.totalFixes * 100).toFixed(1)
      : 0;

    // Error distribution
    metrics.errorsBySeverity = this.groupBy(this.currentSession.errors, 'severity');
    metrics.errorsByType = this.groupBy(this.currentSession.errors, 'type');
    metrics.errorsByComponent = this.groupBy(this.currentSession.errors, 'component');

    // Performance metrics
    const iterations = this.currentSession.iterations;
    if (iterations.length > 0) {
      metrics.avgIterationTime = iterations.reduce((sum, i) => sum + i.duration, 0) / iterations.length;
      metrics.avgMemoryUsage = iterations.reduce((sum, i) => sum + i.memoryUsage.heapUsed, 0) / iterations.length;
      metrics.totalDuration = Date.now() - this.currentSession.startTime;
    }

    // Trend analysis
    metrics.errorTrend = this.calculateTrend(iterations.map(i => i.errorsFound));
    metrics.convergenceRate = this.calculateConvergenceRate();

    // Quality metrics
    metrics.errorDensity = metrics.totalErrors / Math.max(1, metrics.totalIterations);
    metrics.fixEfficiency = metrics.successfulFixes / Math.max(1, metrics.totalIterations);

    this.emitUpdate('metrics', metrics);
  }

  /**
   * Group array items by a key
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  /**
   * Calculate trend direction from values
   */
  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg < firstAvg * 0.8) return 'improving';
    if (secondAvg > firstAvg * 1.2) return 'worsening';
    return 'stable';
  }

  /**
   * Calculate convergence rate (error reduction percentage)
   */
  calculateConvergenceRate() {
    const iterations = this.currentSession.iterations;
    if (iterations.length < 2) return null;

    const errorCounts = iterations.map(i => i.errorsFound);
    const reductions = [];

    for (let i = 1; i < errorCounts.length; i++) {
      if (errorCounts[i - 1] > 0) {
        const reduction = (errorCounts[i - 1] - errorCounts[i]) / errorCounts[i - 1];
        reductions.push(reduction);
      }
    }

    return reductions.length > 0
      ? (reductions.reduce((a, b) => a + b, 0) / reductions.length * 100).toFixed(1)
      : 0;
  }

  /**
   * Generate comprehensive final report
   */
  async generateReport(finalData = {}) {
    const report = {
      session: this.currentSession,
      summary: this.generateSummary(),
      metrics: this.currentSession.metrics,
      analysis: this.generateAnalysis(),
      trends: this.generateTrendAnalysis(),
      recommendations: finalData.recommendations || [],
      timestamp: Date.now()
    };

    // Save JSON report
    const jsonPath = path.join(
      this.config.outputDir,
      'sessions',
      `${this.currentSession.id}.json`
    );
    await fs.writeJson(jsonPath, report, { spaces: 2 });

    // Generate HTML report
    const htmlPath = path.join(
      this.config.outputDir,
      `report_${this.currentSession.id}.html`
    );
    await this.generateHTMLReport(report, htmlPath);

    // Generate Markdown report
    const mdPath = path.join(
      this.config.outputDir,
      `report_${this.currentSession.id}.md`
    );
    await this.generateMarkdownReport(report, mdPath);

    // Send notifications if configured
    if (this.config.enableEmail) {
      await this.sendEmailReport(report);
    }

    console.log(`📄 Reports generated:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   Markdown: ${mdPath}`);

    return report;
  }

  /**
   * Generate session summary
   */
  generateSummary() {
    const session = this.currentSession;
    const duration = Date.now() - session.startTime;

    return {
      sessionId: session.id,
      duration: this.formatDuration(duration),
      iterations: session.iterations.length,
      totalErrors: session.errors.length,
      fixedErrors: session.errors.filter(e => e.status === 'fixed').length,
      remainingErrors: session.errors.filter(e => e.status !== 'fixed').length,
      fixAttempts: session.fixes.length,
      successfulFixes: session.fixes.filter(f => f.result === 'success').length,
      failedFixes: session.fixes.filter(f => f.result === 'failed').length,
      fixSuccessRate: this.currentSession.metrics.fixSuccessRate + '%',
      convergenceRate: this.currentSession.metrics.convergenceRate + '%',
      startTime: new Date(session.startTime).toISOString(),
      endTime: new Date().toISOString()
    };
  }

  /**
   * Generate detailed analysis
   */
  generateAnalysis() {
    const analysis = {
      patterns: this.detectPatterns(),
      bottlenecks: this.identifyBottlenecks(),
      improvements: this.suggestImprovements(),
      riskAreas: this.identifyRiskAreas(),
      performanceInsights: this.generatePerformanceInsights()
    };

    return analysis;
  }

  /**
   * Generate trend analysis from historical and current data
   */
  generateTrendAnalysis() {
    const trends = {
      errorTrends: this.analyzeErrorTrends(),
      performanceTrends: this.analyzePerformanceTrends(),
      fixEffectiveness: this.analyzeFixEffectiveness(),
      systemHealth: this.analyzeSystemHealth()
    };

    return trends;
  }

  /**
   * Detect patterns in errors and fixes
   */
  detectPatterns() {
    const patterns = [];

    // Find recurring error types
    const errorTypes = this.groupBy(this.currentSession.errors, 'type');
    for (const [type, count] of Object.entries(errorTypes)) {
      if (count >= 3) {
        patterns.push({
          type: 'recurring-error',
          description: `Error type '${type}' occurred ${count} times`,
          severity: count >= 10 ? 'high' : 'medium',
          impact: 'system-stability'
        });
      }
    }

    // Find components with most errors
    const componentErrors = this.groupBy(this.currentSession.errors, 'component');
    const topComponent = Object.entries(componentErrors)
      .sort((a, b) => b[1] - a[1])[0];

    if (topComponent && topComponent[1] >= 5) {
      patterns.push({
        type: 'problematic-component',
        description: `Component '${topComponent[0]}' has ${topComponent[1]} errors`,
        severity: 'high',
        impact: 'component-reliability'
      });
    }

    // Find fix patterns
    const failedFixes = this.currentSession.fixes.filter(f => f.result === 'failed');
    const lowConfidenceFails = failedFixes.filter(f => f.confidence < 60);

    if (lowConfidenceFails.length > failedFixes.length * 0.7) {
      patterns.push({
        type: 'low-confidence-failures',
        description: 'Most failed fixes had low confidence scores',
        severity: 'medium',
        impact: 'fix-quality'
      });
    }

    // Time-based patterns
    const errorsByHour = this.groupErrorsByTimeWindow();
    if (errorsByHour.peak && errorsByHour.peak.count > errorsByHour.average * 2) {
      patterns.push({
        type: 'temporal-clustering',
        description: `Error spike detected at ${errorsByHour.peak.hour}:00 with ${errorsByHour.peak.count} errors`,
        severity: 'medium',
        impact: 'system-load'
      });
    }

    return patterns;
  }

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks() {
    const bottlenecks = [];

    // Slow iterations
    const iterations = this.currentSession.iterations;
    const avgDuration = iterations.reduce((sum, i) => sum + i.duration, 0) / iterations.length;
    const slowIterations = iterations.filter(i => i.duration > avgDuration * 2);

    if (slowIterations.length > 0) {
      bottlenecks.push({
        type: 'slow-iterations',
        description: `${slowIterations.length} iterations took 2x longer than average (${avgDuration.toFixed(0)}ms)`,
        iterations: slowIterations.map(i => i.number),
        impact: 'processing-time'
      });
    }

    // High memory usage
    const highMemoryIterations = iterations.filter(i =>
      i.memoryUsage.heapUsed > 500 * 1024 * 1024  // 500MB
    );

    if (highMemoryIterations.length > 0) {
      bottlenecks.push({
        type: 'high-memory',
        description: `${highMemoryIterations.length} iterations used >500MB memory`,
        iterations: highMemoryIterations.map(i => i.number),
        impact: 'resource-usage'
      });
    }

    // Fix generation bottlenecks
    const fixDurations = this.currentSession.fixes.map(f => f.duration).filter(d => d > 0);
    if (fixDurations.length > 0) {
      const avgFixDuration = fixDurations.reduce((a, b) => a + b, 0) / fixDurations.length;
      const slowFixes = this.currentSession.fixes.filter(f => f.duration > avgFixDuration * 3);

      if (slowFixes.length > 0) {
        bottlenecks.push({
          type: 'slow-fix-generation',
          description: `${slowFixes.length} fixes took 3x longer than average to generate`,
          impact: 'fix-throughput'
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Suggest improvements based on analysis
   */
  suggestImprovements() {
    const improvements = [];
    const metrics = this.currentSession.metrics;

    if (metrics.fixSuccessRate < 70) {
      improvements.push({
        area: 'fix-generation',
        suggestion: 'Improve fix generation prompts or increase confidence threshold',
        impact: 'high',
        priority: 'immediate'
      });
    }

    if (metrics.convergenceRate < 20) {
      improvements.push({
        area: 'convergence',
        suggestion: 'Adjust error prioritization or increase parallel processing',
        impact: 'medium',
        priority: 'short-term'
      });
    }

    if (metrics.errorTrend === 'worsening') {
      improvements.push({
        area: 'fix-validation',
        suggestion: 'Strengthen validation pipeline to prevent regression',
        impact: 'high',
        priority: 'immediate'
      });
    }

    if (metrics.avgIterationTime > 30000) { // 30 seconds
      improvements.push({
        area: 'performance',
        suggestion: 'Optimize error detection and fix application processes',
        impact: 'medium',
        priority: 'short-term'
      });
    }

    if (metrics.errorDensity > 5) {
      improvements.push({
        area: 'error-prevention',
        suggestion: 'Implement pre-validation checks to reduce initial error count',
        impact: 'high',
        priority: 'long-term'
      });
    }

    return improvements;
  }

  /**
   * Identify risk areas requiring attention
   */
  identifyRiskAreas() {
    const risks = [];

    // Critical errors not fixed
    const criticalUnfixed = this.currentSession.errors.filter(
      e => e.severity === 'CRITICAL' && e.status !== 'fixed'
    );

    if (criticalUnfixed.length > 0) {
      risks.push({
        level: 'high',
        category: 'critical-errors',
        description: `${criticalUnfixed.length} critical errors remain unfixed`,
        errors: criticalUnfixed.map(e => ({ type: e.type, message: e.message })),
        impact: 'system-failure'
      });
    }

    // Components with repeated failures
    const componentFailures = {};
    this.currentSession.fixes
      .filter(f => f.result === 'failed')
      .forEach(f => {
        const error = this.currentSession.errors.find(e => e.id === f.errorId);
        if (error) {
          componentFailures[error.component] = (componentFailures[error.component] || 0) + 1;
        }
      });

    for (const [component, failures] of Object.entries(componentFailures)) {
      if (failures >= 3) {
        risks.push({
          level: 'medium',
          category: 'component-instability',
          description: `Component '${component}' has ${failures} fix failures`,
          component,
          impact: 'component-reliability'
        });
      }
    }

    // Performance degradation risks
    const recentIterations = this.currentSession.iterations.slice(-5);
    const memoryTrend = this.calculateTrend(recentIterations.map(i => i.memoryUsage.heapUsed));

    if (memoryTrend === 'worsening') {
      risks.push({
        level: 'medium',
        category: 'memory-leak',
        description: 'Memory usage trending upward in recent iterations',
        impact: 'system-performance'
      });
    }

    return risks;
  }

  /**
   * Generate performance insights
   */
  generatePerformanceInsights() {
    const insights = [];
    const iterations = this.currentSession.iterations;

    if (iterations.length < 2) return insights;

    // Iteration time analysis
    const durations = iterations.map(i => i.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    insights.push({
      metric: 'iteration-time',
      average: Math.round(avgDuration),
      min: Math.round(minDuration),
      max: Math.round(maxDuration),
      variance: Math.round((maxDuration - minDuration) / avgDuration * 100),
      trend: this.calculateTrend(durations)
    });

    // Memory usage analysis
    const memoryUsages = iterations.map(i => i.memoryUsage.heapUsed);
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;

    insights.push({
      metric: 'memory-usage',
      averageMB: Math.round(avgMemory / 1024 / 1024),
      peakMB: Math.round(Math.max(...memoryUsages) / 1024 / 1024),
      trend: this.calculateTrend(memoryUsages)
    });

    // Error resolution efficiency
    const errorResolutionRate = iterations.map(i =>
      i.errorsFound > 0 ? (i.fixesApplied / i.errorsFound) : 0
    );

    insights.push({
      metric: 'error-resolution-efficiency',
      average: (errorResolutionRate.reduce((a, b) => a + b, 0) / errorResolutionRate.length * 100).toFixed(1),
      trend: this.calculateTrend(errorResolutionRate)
    });

    return insights;
  }

  /**
   * Analyze error trends over time
   */
  analyzeErrorTrends() {
    const errorsByIteration = this.currentSession.iterations.map(i => ({
      iteration: i.number,
      errors: i.errorsFound,
      timestamp: i.timestamp
    }));

    return {
      data: errorsByIteration,
      trend: this.calculateTrend(errorsByIteration.map(e => e.errors)),
      reduction: errorsByIteration.length > 1 ?
        ((errorsByIteration[0].errors - errorsByIteration[errorsByIteration.length - 1].errors) /
         Math.max(1, errorsByIteration[0].errors) * 100).toFixed(1) : 0
    };
  }

  /**
   * Analyze performance trends
   */
  analyzePerformanceTrends() {
    const iterations = this.currentSession.iterations;

    return {
      iterationTime: {
        data: iterations.map(i => ({ iteration: i.number, duration: i.duration })),
        trend: this.calculateTrend(iterations.map(i => i.duration))
      },
      memoryUsage: {
        data: iterations.map(i => ({
          iteration: i.number,
          memoryMB: Math.round(i.memoryUsage.heapUsed / 1024 / 1024)
        })),
        trend: this.calculateTrend(iterations.map(i => i.memoryUsage.heapUsed))
      }
    };
  }

  /**
   * Analyze fix effectiveness over time
   */
  analyzeFixEffectiveness() {
    const fixSuccessRates = this.currentSession.iterations.map(i => {
      const iterationFixes = this.currentSession.fixes.filter(f => f.iteration === i.number);
      const successfulFixes = iterationFixes.filter(f => f.result === 'success').length;
      return iterationFixes.length > 0 ? (successfulFixes / iterationFixes.length) : 0;
    });

    return {
      data: fixSuccessRates.map((rate, index) => ({
        iteration: index + 1,
        successRate: (rate * 100).toFixed(1)
      })),
      trend: this.calculateTrend(fixSuccessRates),
      averageSuccessRate: fixSuccessRates.length > 0 ?
        (fixSuccessRates.reduce((a, b) => a + b, 0) / fixSuccessRates.length * 100).toFixed(1) : 0
    };
  }

  /**
   * Analyze overall system health
   */
  analyzeSystemHealth() {
    const metrics = this.currentSession.metrics;

    let healthScore = 100;
    const factors = [];

    // Factor in fix success rate
    if (metrics.fixSuccessRate < 50) {
      healthScore -= 30;
      factors.push('Low fix success rate');
    } else if (metrics.fixSuccessRate < 75) {
      healthScore -= 15;
      factors.push('Moderate fix success rate');
    }

    // Factor in error trend
    if (metrics.errorTrend === 'worsening') {
      healthScore -= 25;
      factors.push('Worsening error trend');
    } else if (metrics.errorTrend === 'stable' && metrics.totalErrors > 10) {
      healthScore -= 10;
      factors.push('Stable but high error count');
    }

    // Factor in critical errors
    const criticalErrors = this.currentSession.errors.filter(e => e.severity === 'CRITICAL').length;
    if (criticalErrors > 0) {
      healthScore -= criticalErrors * 10;
      factors.push(`${criticalErrors} critical errors`);
    }

    return {
      score: Math.max(0, healthScore),
      grade: this.getHealthGrade(Math.max(0, healthScore)),
      factors: factors,
      recommendation: this.getHealthRecommendation(Math.max(0, healthScore))
    };
  }

  /**
   * Group errors by time windows for pattern analysis
   */
  groupErrorsByTimeWindow() {
    const hourlyGroups = {};
    let totalErrors = 0;

    this.currentSession.errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourlyGroups[hour] = (hourlyGroups[hour] || 0) + 1;
      totalErrors++;
    });

    const averagePerHour = totalErrors / 24;
    const peak = Object.entries(hourlyGroups)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      hourlyDistribution: hourlyGroups,
      average: averagePerHour,
      peak: peak ? { hour: peak[0], count: peak[1] } : null
    };
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report, outputPath) {
    const html = createReport(report);
    await fs.writeFile(outputPath, html);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(report, outputPath) {
    const md = this.createMarkdownReport(report);
    await fs.writeFile(outputPath, md);
  }

  /**
   * Create Markdown report content
   */
  createMarkdownReport(report) {
    const summary = report.summary;
    const metrics = report.metrics;
    const analysis = report.analysis;

    return `# Validation & Fix Loop Report

**Session ID:** ${summary.sessionId}
**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Duration:** ${summary.duration}

## Executive Summary

- **Iterations Completed:** ${summary.iterations}
- **Total Errors Found:** ${summary.totalErrors}
- **Errors Fixed:** ${summary.fixedErrors}
- **Fix Success Rate:** ${summary.fixSuccessRate}
- **Convergence Rate:** ${summary.convergenceRate}

## Performance Metrics

| Metric | Value |
|--------|-------|
| Average Iteration Time | ${Math.round(metrics.avgIterationTime || 0)}ms |
| Average Memory Usage | ${Math.round((metrics.avgMemoryUsage || 0) / 1024 / 1024)}MB |
| Error Density | ${metrics.errorDensity?.toFixed(2) || 0} errors/iteration |
| Fix Efficiency | ${metrics.fixEfficiency?.toFixed(2) || 0} fixes/iteration |

## Error Analysis

### By Severity
${Object.entries(metrics.errorsBySeverity || {}).map(([severity, count]) =>
  `- **${severity}:** ${count}`).join('\n')}

### By Type
${Object.entries(metrics.errorsByType || {}).map(([type, count]) =>
  `- **${type}:** ${count}`).join('\n')}

### By Component
${Object.entries(metrics.errorsByComponent || {}).map(([component, count]) =>
  `- **${component}:** ${count}`).join('\n')}

## Patterns Detected

${analysis.patterns.map(pattern =>
  `- **${pattern.type}:** ${pattern.description} (${pattern.severity} severity)`).join('\n')}

## Performance Insights

${analysis.performanceInsights.map(insight =>
  `- **${insight.metric}:** ${JSON.stringify(insight, null, 2)}`).join('\n')}

## Recommendations

${analysis.improvements.map(improvement =>
  `- **${improvement.area}:** ${improvement.suggestion} (${improvement.priority})`).join('\n')}

## Risk Areas

${analysis.riskAreas.map(risk =>
  `- **${risk.level.toUpperCase()} RISK:** ${risk.description}`).join('\n')}

## System Health

- **Score:** ${report.trends.systemHealth.score}/100 (${report.trends.systemHealth.grade})
- **Recommendation:** ${report.trends.systemHealth.recommendation}

---
*Generated by Validation & Fix Loop Reporting System*
`;
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData() {
    const cutoffDate = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    const sessionsDir = path.join(this.config.outputDir, 'sessions');

    try {
      const files = await fs.readdir(sessionsDir);
      const oldFiles = [];

      for (const file of files) {
        const filePath = path.join(sessionsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffDate) {
          oldFiles.push(filePath);
        }
      }

      if (oldFiles.length > 0) {
        // Move to archive before deletion
        const archiveDir = path.join(this.config.outputDir, 'archives');
        for (const oldFile of oldFiles) {
          const fileName = path.basename(oldFile);
          await fs.move(oldFile, path.join(archiveDir, fileName));
        }

        console.log(`🗑️ Archived ${oldFiles.length} old session files`);
      }
    } catch (error) {
      console.warn('⚠️ Error during data cleanup:', error.message);
    }
  }

  /**
   * Load historical data for trend analysis
   */
  async loadHistoricalData() {
    // This would load and aggregate historical session data
    // For now, initialize empty historical context
    this.historicalData = {
      sessions: [],
      averageMetrics: {},
      trends: {}
    };
  }

  /**
   * Emit real-time update event
   */
  emitUpdate(eventType, data) {
    if (!this.config.realTimeUpdates) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      data
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('⚠️ Event listener error:', error.message);
      }
    });
  }

  /**
   * Add event listener for real-time updates
   */
  onUpdate(callback) {
    this.eventListeners.push(callback);
  }

  /**
   * Remove event listener
   */
  offUpdate(callback) {
    const index = this.eventListeners.indexOf(callback);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Send email report (placeholder)
   */
  async sendEmailReport(report) {
    // Email implementation would go here
    console.log('📧 Email report sent (placeholder)');
  }

  /**
   * Helper methods
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getHealthGrade(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  getHealthRecommendation(score) {
    if (score >= 90) return 'System is healthy and performing well';
    if (score >= 80) return 'System is stable with minor issues to address';
    if (score >= 70) return 'System needs attention to prevent degradation';
    if (score >= 60) return 'System has significant issues requiring immediate action';
    return 'System is in critical state and needs urgent intervention';
  }
}