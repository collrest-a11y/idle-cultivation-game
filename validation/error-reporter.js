/**
 * ErrorReporter - Generates comprehensive error reports for analysis and debugging
 * Provides multiple output formats and detailed analysis of detected errors
 */
export class ErrorReporter {
  constructor() {
    this.reportId = this.generateReportId();
  }

  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Generate a comprehensive error report from aggregated data
   */
  generateReport(aggregatedData, options = {}) {
    const {
      format = 'detailed',
      includeStackTraces = true,
      includePatternsAnalysis = true,
      includeRecommendations = true,
      maxErrorsPerCategory = 50
    } = options;

    const report = {
      id: this.reportId,
      timestamp: new Date().toISOString(),
      format,
      ...aggregatedData
    };

    // Limit errors per category if requested
    if (maxErrorsPerCategory < Infinity) {
      report.errors = this.limitErrorsPerCategory(report.errors, maxErrorsPerCategory);
    }

    // Remove stack traces if not requested
    if (!includeStackTraces) {
      report.errors = report.errors.map(error => {
        const { stack, ...errorWithoutStack } = error;
        return errorWithoutStack;
      });
    }

    // Remove pattern analysis if not requested
    if (!includePatternsAnalysis) {
      delete report.patterns;
    }

    // Remove recommendations if not requested
    if (!includeRecommendations) {
      delete report.recommendations;
    }

    return report;
  }

  /**
   * Generate a summary report for quick overview
   */
  generateSummaryReport(aggregatedData) {
    return {
      id: this.reportId,
      timestamp: new Date().toISOString(),
      format: 'summary',
      summary: aggregatedData.summary,
      criticalIssues: aggregatedData.errors
        .filter(e => e.severity === 'CRITICAL')
        .slice(0, 5)
        .map(e => ({
          type: e.type,
          message: e.message,
          timestamp: e.timestamp,
          component: e.component
        })),
      recommendations: aggregatedData.recommendations?.slice(0, 3) || [],
      qualityScore: this.calculateQualityScore(aggregatedData)
    };
  }

  /**
   * Generate a detailed technical report for developers
   */
  generateTechnicalReport(aggregatedData) {
    const report = this.generateReport(aggregatedData, {
      format: 'technical',
      includeStackTraces: true,
      includePatternsAnalysis: true,
      includeRecommendations: true
    });

    // Add technical details
    report.technical = {
      errorDistribution: this.analyzeErrorDistribution(aggregatedData.errors),
      timelineAnalysis: this.analyzeErrorTimeline(aggregatedData.errors),
      componentAnalysis: this.analyzeComponentErrors(aggregatedData.errors),
      severityTrends: this.analyzeSeverityTrends(aggregatedData.errors),
      rootCauseAnalysis: this.performRootCauseAnalysis(aggregatedData.errors)
    };

    return report;
  }

  /**
   * Generate a report focused on functional errors
   */
  generateFunctionalErrorReport(aggregatedData) {
    const functionalErrors = aggregatedData.errors.filter(e =>
      e.type === 'functional-error' ||
      e.type === 'functional-button-error' ||
      e.component
    );

    return {
      id: this.reportId,
      timestamp: new Date().toISOString(),
      format: 'functional',
      totalFunctionalErrors: functionalErrors.length,
      affectedComponents: [...new Set(functionalErrors.map(e => e.component).filter(c => c))],
      criticalFunctionalIssues: functionalErrors
        .filter(e => e.severity === 'CRITICAL')
        .map(e => ({
          component: e.component,
          issue: e.issue || e.message,
          expectedState: e.expectedState,
          actualState: e.actualState,
          timestamp: e.timestamp,
          context: e.context
        })),
      functionalErrorsByComponent: this.groupErrorsByComponent(functionalErrors),
      testRecommendations: this.generateTestRecommendations(functionalErrors)
    };
  }

  /**
   * Format report as HTML for viewing in browser
   */
  formatAsHTML(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Detection Report - ${report.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { border-bottom: 2px solid #ddd; padding-bottom: 15px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #666; margin-top: 5px; }
        .severity-critical { background: #ffebee; border-left: 4px solid #f44336; }
        .severity-high { background: #fff3e0; border-left: 4px solid #ff9800; }
        .severity-medium { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .severity-low { background: #f3f3f3; border-left: 4px solid #9e9e9e; }
        .error-item { margin-bottom: 15px; padding: 15px; border-radius: 6px; }
        .error-header { font-weight: bold; margin-bottom: 8px; }
        .error-details { font-size: 0.9em; color: #666; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .recommendation { margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; }
        .timestamp { color: #888; font-size: 0.8em; }
        .expandable { cursor: pointer; user-select: none; }
        .expandable:hover { background: #f0f0f0; }
        .expanded-content { display: none; margin-top: 10px; }
        .show { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Error Detection Report</h1>
            <p><strong>Report ID:</strong> ${report.id}</p>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Session Duration:</strong> ${report.sessionDuration ? Math.round(report.sessionDuration / 1000) + 's' : 'N/A'}</p>
        </div>

        ${this.generateHTMLSummary(report)}
        ${this.generateHTMLRecommendations(report)}
        ${this.generateHTMLErrorList(report)}
        ${this.generateHTMLPatterns(report)}
    </div>

    <script>
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('expandable')) {
                const content = e.target.nextElementSibling;
                if (content && content.classList.contains('expanded-content')) {
                    content.classList.toggle('show');
                    e.target.textContent = content.classList.contains('show') ?
                        e.target.textContent.replace('▶', '▼') :
                        e.target.textContent.replace('▼', '▶');
                }
            }
        });
    </script>
</body>
</html>`;

    return html;
  }

  generateHTMLSummary(report) {
    if (!report.summary) return '';

    return `
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.total}</div>
                <div class="metric-label">Total Errors</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.bySeverity?.CRITICAL || 0}</div>
                <div class="metric-label">Critical</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.bySeverity?.HIGH || 0}</div>
                <div class="metric-label">High</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.bySeverity?.MEDIUM || 0}</div>
                <div class="metric-label">Medium</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.bySeverity?.LOW || 0}</div>
                <div class="metric-label">Low</div>
            </div>
        </div>`;
  }

  generateHTMLRecommendations(report) {
    if (!report.recommendations || report.recommendations.length === 0) return '';

    const recommendationsHTML = report.recommendations.map(rec => `
        <div class="recommendation">
            <strong>[${rec.priority}]</strong> ${rec.action}
            ${rec.count ? `<span class="timestamp">(${rec.count} issues)</span>` : ''}
            ${rec.impact ? `<div class="error-details">${rec.impact}</div>` : ''}
        </div>
    `).join('');

    return `
        <div class="recommendations">
            <h2>Recommendations</h2>
            ${recommendationsHTML}
        </div>`;
  }

  generateHTMLErrorList(report) {
    if (!report.errors || report.errors.length === 0) return '';

    const errorsHTML = report.errors.slice(0, 50).map(error => {
      const severityClass = `severity-${error.severity.toLowerCase()}`;
      return `
        <div class="error-item ${severityClass}">
            <div class="error-header">
                [${error.severity}] ${error.type}
                <span class="timestamp">${new Date(error.timestamp).toLocaleString()}</span>
            </div>
            <div class="error-details">
                ${error.message || 'No message'}
                ${error.component ? `<br><strong>Component:</strong> ${error.component}` : ''}
                ${error.url ? `<br><strong>URL:</strong> ${error.url}` : ''}
            </div>
            ${error.context || error.stack ? `
                <div class="expandable">▶ Show Details</div>
                <div class="expanded-content">
                    <pre>${JSON.stringify(error.context || error.stack || {}, null, 2)}</pre>
                </div>
            ` : ''}
        </div>
      `;
    }).join('');

    return `
        <h2>Error Details</h2>
        <div class="error-list">
            ${errorsHTML}
        </div>`;
  }

  generateHTMLPatterns(report) {
    if (!report.patterns || report.patterns.length === 0) return '';

    const patternsHTML = report.patterns.slice(0, 10).map(pattern => `
        <div class="error-item">
            <div class="error-header">
                ${pattern.type} (${pattern.severity})
                <span class="timestamp">${pattern.count} occurrences</span>
            </div>
            <div class="error-details">
                <strong>Frequency:</strong> ${pattern.frequency?.toFixed(2) || 0} per second<br>
                <strong>Duration:</strong> ${pattern.duration ? Math.round(pattern.duration / 1000) + 's' : 'N/A'}
            </div>
        </div>
    `).join('');

    return `
        <h2>Error Patterns</h2>
        <div class="patterns-list">
            ${patternsHTML}
        </div>`;
  }

  // Analysis methods
  analyzeErrorDistribution(errors) {
    const distribution = {};
    errors.forEach(error => {
      const key = `${error.type}-${error.severity}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });
    return distribution;
  }

  analyzeErrorTimeline(errors) {
    const timeline = errors
      .map(e => ({ timestamp: e.timestamp, type: e.type, severity: e.severity }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      firstError: timeline[0],
      lastError: timeline[timeline.length - 1],
      errorRate: timeline.length / Math.max(1, (timeline[timeline.length - 1]?.timestamp - timeline[0]?.timestamp) / 1000),
      timeline: timeline.slice(0, 100) // Limit to avoid huge reports
    };
  }

  analyzeComponentErrors(errors) {
    const componentErrors = {};
    errors.forEach(error => {
      const component = error.component || 'unknown';
      if (!componentErrors[component]) {
        componentErrors[component] = { total: 0, bySeverity: {} };
      }
      componentErrors[component].total++;
      componentErrors[component].bySeverity[error.severity] =
        (componentErrors[component].bySeverity[error.severity] || 0) + 1;
    });
    return componentErrors;
  }

  analyzeSeverityTrends(errors) {
    const trends = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
    errors.forEach(error => {
      if (trends[error.severity]) {
        trends[error.severity].push(error.timestamp);
      }
    });
    return trends;
  }

  performRootCauseAnalysis(errors) {
    const causes = [];

    // Character creation issues
    const charCreationErrors = errors.filter(e =>
      e.component === 'character-creation' || e.type === 'functional-button-error'
    );
    if (charCreationErrors.length > 0) {
      causes.push({
        category: 'Character Creation',
        likelihood: 'HIGH',
        evidence: charCreationErrors.length,
        description: 'Button state management or event handling issues in character creation flow'
      });
    }

    // Memory issues
    const memoryErrors = errors.filter(e => e.type === 'memory-pressure');
    if (memoryErrors.length > 0) {
      causes.push({
        category: 'Memory Management',
        likelihood: 'MEDIUM',
        evidence: memoryErrors.length,
        description: 'Potential memory leaks or inefficient resource management'
      });
    }

    // Network issues
    const networkErrors = errors.filter(e =>
      e.type === 'network-failure' || e.type === 'http-error'
    );
    if (networkErrors.length > 0) {
      causes.push({
        category: 'Network Connectivity',
        likelihood: 'MEDIUM',
        evidence: networkErrors.length,
        description: 'Network connectivity issues or server problems'
      });
    }

    return causes;
  }

  // Utility methods
  limitErrorsPerCategory(errors, maxPerCategory) {
    const categories = {};
    const limitedErrors = [];

    errors.forEach(error => {
      const category = error.severity;
      categories[category] = (categories[category] || 0) + 1;

      if (categories[category] <= maxPerCategory) {
        limitedErrors.push(error);
      }
    });

    return limitedErrors;
  }

  groupErrorsByComponent(errors) {
    const groups = {};
    errors.forEach(error => {
      const component = error.component || 'unknown';
      if (!groups[component]) {
        groups[component] = [];
      }
      groups[component].push(error);
    });
    return groups;
  }

  generateTestRecommendations(functionalErrors) {
    const recommendations = [];

    const charCreationErrors = functionalErrors.filter(e =>
      e.component === 'character-creation'
    );
    if (charCreationErrors.length > 0) {
      recommendations.push({
        test: 'Character Creation Flow Test',
        priority: 'HIGH',
        description: 'Test complete character creation workflow with all choice combinations',
        steps: [
          'Select each choice option',
          'Verify button state updates',
          'Confirm successful transition to game'
        ]
      });
    }

    return recommendations;
  }

  calculateQualityScore(aggregatedData) {
    if (!aggregatedData.errors || aggregatedData.errors.length === 0) return 1.0;

    const criticalCount = aggregatedData.errors.filter(e => e.severity === 'CRITICAL').length;
    const highCount = aggregatedData.errors.filter(e => e.severity === 'HIGH').length;

    // Quality decreases with critical and high severity errors
    const totalErrors = aggregatedData.errors.length;
    const severityScore = 1 - ((criticalCount * 0.5 + highCount * 0.3) / totalErrors);

    return Math.max(0, severityScore);
  }

  // Export methods
  saveReportToFile(report, filename) {
    const fs = require('fs').promises;
    const path = require('path');

    return fs.writeFile(
      path.resolve(filename),
      JSON.stringify(report, null, 2)
    );
  }

  saveHTMLReport(report, filename) {
    const fs = require('fs').promises;
    const path = require('path');
    const html = this.formatAsHTML(report);

    return fs.writeFile(
      path.resolve(filename),
      html
    );
  }
}