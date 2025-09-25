---
name: Reporting & Analytics System
status: open
created: 2025-09-25T19:41:00Z
updated: 2025-09-25T20:15:00Z
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/128
priority: P2
effort: 1d
dependencies: [006]
---

# Task 007: Reporting & Analytics System

## Objective
Create comprehensive reporting and analytics to track validation progress, fix success rates, and provide actionable insights for continuous improvement.

## Background
Visibility into the validation and fix process is crucial for understanding system health, tracking improvements, and identifying patterns.

## Acceptance Criteria

### Required
- [ ] Real-time progress dashboard
- [ ] Error trend analysis
- [ ] Fix success rate tracking
- [ ] Performance metrics collection
- [ ] Before/after comparison reports
- [ ] HTML report generation
- [ ] JSON data export
- [ ] Email notifications for critical events
- [ ] Historical data storage
- [ ] Pattern recognition for recurring errors

### Nice to Have
- [ ] Web-based dashboard UI
- [ ] Slack/Discord integration
- [ ] Predictive analytics
- [ ] Cost analysis (API usage)

## Technical Implementation

### 1. Reporter Core
```javascript
// reporting/reporter.js
import fs from 'fs-extra';
import path from 'path';
import { createReport } from './html-generator';

export class Reporter {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || './validation-reports',
      enableEmail: config.enableEmail || false,
      enableWebDashboard: config.enableWebDashboard || false,
      dataRetentionDays: config.dataRetentionDays || 30,
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
  }

  async ensureOutputDir() {
    await fs.ensureDir(this.config.outputDir);
    await fs.ensureDir(path.join(this.config.outputDir, 'sessions'));
    await fs.ensureDir(path.join(this.config.outputDir, 'archives'));
  }

  recordIteration(data) {
    const iteration = {
      number: data.iteration,
      timestamp: Date.now(),
      errorsFound: data.errorsFound,
      fixesApplied: data.fixesApplied,
      fixesFailed: data.fixesFailed,
      duration: data.duration,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
    
    this.currentSession.iterations.push(iteration);
    this.updateMetrics(iteration);
  }

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
      iteration: this.currentSession.iterations.length
    };
    
    this.currentSession.errors.push(errorRecord);
    return errorRecord.id;
  }

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
      iteration: this.currentSession.iterations.length
    };
    
    this.currentSession.fixes.push(fixRecord);
    
    // Update error status
    const error = this.currentSession.errors.find(e => e.id === errorId);
    if (error) {
      error.status = result.success ? 'fixed' : 'attempted';
      error.fixId = fixRecord.id;
    }
    
    return fixRecord.id;
  }

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
    }
    
    // Trend analysis
    metrics.errorTrend = this.calculateTrend(iterations.map(i => i.errorsFound));
    metrics.convergenceRate = this.calculateConvergenceRate();
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

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

  async generateReport(finalData = {}) {
    const report = {
      session: this.currentSession,
      summary: this.generateSummary(),
      metrics: this.currentSession.metrics,
      analysis: this.generateAnalysis(),
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
    
    // Send notifications if configured
    if (this.config.enableEmail) {
      await this.sendEmailReport(report);
    }
    
    console.log(`📄 Reports generated:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}`);
    
    return report;
  }

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
      convergenceRate: this.currentSession.metrics.convergenceRate + '%'
    };
  }

  generateAnalysis() {
    const analysis = {
      patterns: this.detectPatterns(),
      bottlenecks: this.identifyBottlenecks(),
      improvements: this.suggestImprovements(),
      riskAreas: this.identifyRiskAreas()
    };
    
    return analysis;
  }

  detectPatterns() {
    const patterns = [];
    
    // Find recurring error types
    const errorTypes = this.groupBy(this.currentSession.errors, 'type');
    for (const [type, count] of Object.entries(errorTypes)) {
      if (count >= 3) {
        patterns.push({
          type: 'recurring-error',
          description: `Error type '${type}' occurred ${count} times`,
          severity: count >= 10 ? 'high' : 'medium'
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
        severity: 'high'
      });
    }
    
    // Find fix patterns
    const failedFixes = this.currentSession.fixes.filter(f => f.result === 'failed');
    const lowConfidenceFails = failedFixes.filter(f => f.confidence < 60);
    
    if (lowConfidenceFails.length > failedFixes.length * 0.7) {
      patterns.push({
        type: 'low-confidence-failures',
        description: 'Most failed fixes had low confidence scores',
        severity: 'medium'
      });
    }
    
    return patterns;
  }

  identifyBottlenecks() {
    const bottlenecks = [];
    
    // Slow iterations
    const iterations = this.currentSession.iterations;
    const avgDuration = iterations.reduce((sum, i) => sum + i.duration, 0) / iterations.length;
    const slowIterations = iterations.filter(i => i.duration > avgDuration * 2);
    
    if (slowIterations.length > 0) {
      bottlenecks.push({
        type: 'slow-iterations',
        description: `${slowIterations.length} iterations took 2x longer than average`,
        iterations: slowIterations.map(i => i.number)
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
        iterations: highMemoryIterations.map(i => i.number)
      });
    }
    
    return bottlenecks;
  }

  suggestImprovements() {
    const improvements = [];
    const metrics = this.currentSession.metrics;
    
    if (metrics.fixSuccessRate < 70) {
      improvements.push({
        area: 'fix-generation',
        suggestion: 'Improve fix generation prompts or increase confidence threshold',
        impact: 'high'
      });
    }
    
    if (metrics.convergenceRate < 20) {
      improvements.push({
        area: 'convergence',
        suggestion: 'Adjust error prioritization or increase parallel processing',
        impact: 'medium'
      });
    }
    
    if (metrics.errorTrend === 'worsening') {
      improvements.push({
        area: 'fix-validation',
        suggestion: 'Strengthen validation pipeline to prevent regression',
        impact: 'high'
      });
    }
    
    return improvements;
  }

  identifyRiskAreas() {
    const risks = [];
    
    // Critical errors not fixed
    const criticalUnfixed = this.currentSession.errors.filter(
      e => e.severity === 'CRITICAL' && e.status !== 'fixed'
    );
    
    if (criticalUnfixed.length > 0) {
      risks.push({
        level: 'high',
        description: `${criticalUnfixed.length} critical errors remain unfixed`,
        errors: criticalUnfixed.map(e => ({ type: e.type, message: e.message }))
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
          description: `Component '${component}' has ${failures} fix failures`,
          component
        });
      }
    }
    
    return risks;
  }

  async generateHTMLReport(report, outputPath) {
    const html = createReport(report);
    await fs.writeFile(outputPath, html);
  }

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

  async sendEmailReport(report) {
    // Email implementation would go here
    console.log('📧 Email report sent');
  }
}
```

### 2. HTML Report Generator
```javascript
// reporting/html-generator.js
export function createReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Validation Report - ${data.session.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat { background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #4CAF50; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; color: #333; margin: 5px 0; }
    .chart { margin: 20px 0; }
    .progress { background: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; }
    .progress-bar { height: 100%; background: linear-gradient(90deg, #4CAF50, #8BC34A); transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    .error-list { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 10px 0; }
    .success { color: #28a745; }
    .warning { color: #ffc107; }
    .danger { color: #dc3545; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .badge-critical { background: #dc3545; color: white; }
    .badge-high { background: #ff6b6b; color: white; }
    .badge-medium { background: #ffc107; color: black; }
    .badge-low { background: #6c757d; color: white; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📄 Validation & Fix Report</h1>
    <p>Session: ${data.session.id} | Generated: ${new Date(data.timestamp).toLocaleString()}</p>
    
    <h2>📊 Summary</h2>
    <div class="summary">
      <div class="stat">
        <div class="stat-label">Duration</div>
        <div class="stat-value">${data.summary.duration}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Iterations</div>
        <div class="stat-value">${data.summary.iterations}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Errors Found</div>
        <div class="stat-value">${data.summary.totalErrors}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Errors Fixed</div>
        <div class="stat-value class="success">${data.summary.fixedErrors}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Fix Success Rate</div>
        <div class="stat-value">${data.summary.fixSuccessRate}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Convergence Rate</div>
        <div class="stat-value">${data.summary.convergenceRate}</div>
      </div>
    </div>
    
    <h2>🎯 Progress</h2>
    <div class="progress">
      <div class="progress-bar" style="width: ${(data.summary.fixedErrors / data.summary.totalErrors * 100).toFixed(0)}%">
        ${data.summary.fixedErrors} / ${data.summary.totalErrors} Fixed
      </div>
    </div>
    
    <h2>⚠️ Error Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Count</th>
          <th>Fixed</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(data.metrics.errorsBySeverity || {}).map(([severity, count]) => `
        <tr>
          <td><span class="badge badge-${severity.toLowerCase()}">${severity}</span></td>
          <td>${count}</td>
          <td>${data.session.errors.filter(e => e.severity === severity && e.status === 'fixed').length}</td>
          <td>${count > 0 ? Math.round(data.session.errors.filter(e => e.severity === severity && e.status === 'fixed').length / count * 100) : 0}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    
    <h2>🔍 Analysis</h2>
    ${data.analysis.patterns.length > 0 ? `
    <h3>Patterns Detected</h3>
    <ul>
      ${data.analysis.patterns.map(p => `<li><strong>${p.type}:</strong> ${p.description}</li>`).join('')}
    </ul>
    ` : ''}
    
    ${data.analysis.improvements.length > 0 ? `
    <h3>Suggested Improvements</h3>
    <ul>
      ${data.analysis.improvements.map(i => `<li><strong>${i.area}:</strong> ${i.suggestion} (Impact: ${i.impact})</li>`).join('')}
    </ul>
    ` : ''}
    
    ${data.analysis.riskAreas.length > 0 ? `
    <h3>Risk Areas</h3>
    <div class="error-list">
      ${data.analysis.riskAreas.map(r => `
        <div><span class="badge badge-${r.level}">${r.level}</span> ${r.description}</div>
      `).join('')}
    </div>
    ` : ''}
    
    <h2>📝 Recommendations</h2>
    ${data.recommendations.length > 0 ? `
    <ul>
      ${data.recommendations.map(r => `<li class="${r.priority.toLowerCase()}">${r.message || r.action}</li>`).join('')}
    </ul>
    ` : '<p>No specific recommendations.</p>'}
  </div>
</body>
</html>
  `;
}
```

## Success Metrics
- Real-time progress updates every iteration
- HTML reports generated in < 2 seconds
- Pattern detection accuracy > 90%
- All critical events trigger notifications
- Historical data queryable for trend analysis

## Notes
- Consider implementing Grafana integration for real-time dashboards
- Store metrics in time-series database for long-term analysis
- Add export functionality for CI/CD integration