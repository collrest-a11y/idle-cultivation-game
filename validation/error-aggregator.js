/**
 * ErrorAggregator - Collects and prioritizes errors from multiple detectors
 * Responsible for coordinating multiple error detection sources and
 * providing unified error analysis and reporting
 */
export class ErrorAggregator {
  constructor() {
    this.detectors = [];
    this.allErrors = [];
    this.errorPatterns = new Map();
    this.startTime = Date.now();
  }

  addDetector(detector) {
    this.detectors.push(detector);
    console.log(`[ErrorAggregator] Added detector: ${detector.constructor.name}`);
  }

  async collectAllErrors() {
    this.allErrors = [];

    for (const detector of this.detectors) {
      try {
        const errors = detector.getErrors ? detector.getErrors() : [];
        if (Array.isArray(errors)) {
          this.allErrors.push(...errors);
        }
      } catch (e) {
        console.error('Error collecting from detector:', e);
      }
    }

    // Analyze error patterns
    this.analyzeErrorPatterns();

    return this.prioritizeErrors(this.allErrors);
  }

  analyzeErrorPatterns() {
    this.errorPatterns.clear();

    this.allErrors.forEach(error => {
      const patternKey = `${error.type}-${error.severity}`;
      const pattern = this.errorPatterns.get(patternKey) || {
        type: error.type,
        severity: error.severity,
        count: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        examples: []
      };

      pattern.count++;
      pattern.lastSeen = Math.max(pattern.lastSeen, error.timestamp);
      pattern.firstSeen = Math.min(pattern.firstSeen, error.timestamp);

      if (pattern.examples.length < 3) {
        pattern.examples.push({
          message: error.message,
          timestamp: error.timestamp,
          context: error.context
        });
      }

      this.errorPatterns.set(patternKey, pattern);
    });
  }

  prioritizeErrors(errors) {
    const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    return errors.sort((a, b) => {
      // Primary sort by severity
      const aPriority = priorityOrder.indexOf(a.severity);
      const bPriority = priorityOrder.indexOf(b.severity);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Secondary sort by timestamp (more recent first)
      return b.timestamp - a.timestamp;
    });
  }

  generateReport() {
    const prioritizedErrors = this.prioritizeErrors(this.allErrors);
    const summary = this.generateSummary();
    const recommendations = this.generateRecommendations();
    const patterns = this.getErrorPatterns();

    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: Date.now() - this.startTime,
      summary,
      patterns,
      errors: prioritizedErrors,
      recommendations,
      metadata: {
        detectorCount: this.detectors.length,
        totalErrors: this.allErrors.length,
        uniqueErrorTypes: new Set(this.allErrors.map(e => e.type)).size,
        affectedComponents: this.getAffectedComponents()
      }
    };

    return report;
  }

  generateSummary() {
    const summary = {
      total: this.allErrors.length,
      bySeverity: {},
      byType: {},
      timeRange: this.getTimeRange()
    };

    // Count by severity
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      summary.bySeverity[severity] = this.allErrors.filter(e => e.severity === severity).length;
    });

    // Count by type
    this.allErrors.forEach(error => {
      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
    });

    return summary;
  }

  generateRecommendations() {
    const recommendations = [];

    const criticalCount = this.allErrors.filter(e => e.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      recommendations.push({
        priority: 'URGENT',
        action: 'Fix all CRITICAL errors before deployment',
        count: criticalCount,
        impact: 'Game-breaking issues that prevent normal operation',
        examples: this.allErrors
          .filter(e => e.severity === 'CRITICAL')
          .slice(0, 3)
          .map(e => e.message || e.type)
      });
    }

    const functionalErrors = this.allErrors.filter(e =>
      e.type === 'functional-error' ||
      e.type === 'functional-button-error' ||
      e.component === 'character-creation'
    );

    if (functionalErrors.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address functional failures in core features',
        components: [...new Set(functionalErrors.map(e => e.component).filter(c => c))],
        count: functionalErrors.length,
        impact: 'Core game features not working as expected'
      });
    }

    const performanceErrors = this.allErrors.filter(e =>
      e.type === 'low-fps' ||
      e.type === 'memory-pressure' ||
      e.type === 'performance-lag'
    );

    if (performanceErrors.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Optimize performance issues',
        count: performanceErrors.length,
        impact: 'Degraded user experience and potential crashes'
      });
    }

    const networkErrors = this.allErrors.filter(e =>
      e.type === 'network-failure' ||
      e.type === 'http-error'
    );

    if (networkErrors.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Fix network connectivity issues',
        count: networkErrors.length,
        impact: 'Features dependent on network requests may fail'
      });
    }

    // Pattern-based recommendations
    const patterns = Array.from(this.errorPatterns.values());
    const frequentPatterns = patterns.filter(p => p.count > 5);

    if (frequentPatterns.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Investigate frequently occurring error patterns',
        patterns: frequentPatterns.map(p => ({
          type: p.type,
          count: p.count,
          severity: p.severity
        })),
        impact: 'Systematic issues that may indicate underlying problems'
      });
    }

    return recommendations;
  }

  getErrorPatterns() {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .map(pattern => ({
        ...pattern,
        duration: pattern.lastSeen - pattern.firstSeen,
        frequency: pattern.count / Math.max(1, (pattern.lastSeen - pattern.firstSeen) / 1000)
      }));
  }

  getAffectedComponents() {
    const components = new Set();

    this.allErrors.forEach(error => {
      if (error.component) {
        components.add(error.component);
      }

      // Infer components from error types and context
      if (error.type === 'functional-button-error' ||
          error.selector?.includes('begin-cultivation')) {
        components.add('character-creation');
      }

      if (error.selector?.includes('game-interface') ||
          error.type === 'missing-critical-element') {
        components.add('game-interface');
      }

      if (error.type === 'network-failure' || error.type === 'http-error') {
        components.add('network');
      }

      if (error.type === 'memory-pressure' || error.type === 'low-fps') {
        components.add('performance');
      }
    });

    return Array.from(components);
  }

  getTimeRange() {
    if (this.allErrors.length === 0) {
      return { start: null, end: null, duration: 0 };
    }

    const timestamps = this.allErrors.map(e => e.timestamp).filter(t => t);
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);

    return {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      duration: end - start
    };
  }

  // Quality assessment methods
  assessErrorQuality() {
    const assessment = {
      completeness: this.assessCompleteness(),
      accuracy: this.assessAccuracy(),
      coverage: this.assessCoverage(),
      actionability: this.assessActionability()
    };

    assessment.overall = Object.values(assessment).reduce((sum, score) => sum + score, 0) / 4;

    return assessment;
  }

  assessCompleteness() {
    // Check if we have comprehensive error information
    let score = 0;

    this.allErrors.forEach(error => {
      if (error.message) score += 0.25;
      if (error.timestamp) score += 0.25;
      if (error.context) score += 0.25;
      if (error.severity) score += 0.25;
    });

    return this.allErrors.length > 0 ? score / this.allErrors.length : 0;
  }

  assessAccuracy() {
    // Estimate accuracy based on error categorization consistency
    const severityConsistency = this.checkSeverityConsistency();
    const typeClassification = this.checkTypeClassification();

    return (severityConsistency + typeClassification) / 2;
  }

  assessCoverage() {
    // Check coverage of different error types
    const expectedErrorTypes = [
      'console-error', 'page-error', 'network-failure',
      'functional-error', 'performance-lag'
    ];

    const detectedTypes = new Set(this.allErrors.map(e => e.type));
    const coverage = Array.from(detectedTypes).length / expectedErrorTypes.length;

    return Math.min(coverage, 1);
  }

  assessActionability() {
    // Check if errors provide enough information for action
    let actionableCount = 0;

    this.allErrors.forEach(error => {
      const hasLocation = error.stack || error.location || error.selector;
      const hasDescription = error.message && error.message.length > 10;
      const hasSeverity = error.severity && error.severity !== 'LOW';

      if (hasLocation && hasDescription && hasSeverity) {
        actionableCount++;
      }
    });

    return this.allErrors.length > 0 ? actionableCount / this.allErrors.length : 0;
  }

  checkSeverityConsistency() {
    // Simple heuristic for severity consistency
    const criticalErrors = this.allErrors.filter(e => e.severity === 'CRITICAL');
    const gameBreaking = criticalErrors.filter(e =>
      e.type === 'page-error' ||
      e.type === 'functional-error' ||
      e.message?.includes('Cannot read')
    );

    return criticalErrors.length > 0 ? gameBreaking.length / criticalErrors.length : 1;
  }

  checkTypeClassification() {
    // Check if error types are correctly classified
    const functionalErrors = this.allErrors.filter(e => e.type === 'functional-error');
    const hasComponents = functionalErrors.filter(e => e.component);

    return functionalErrors.length > 0 ? hasComponents.length / functionalErrors.length : 1;
  }

  // Utility methods
  getErrorsByComponent(component) {
    return this.allErrors.filter(error =>
      error.component === component ||
      error.context?.component === component
    );
  }

  getErrorsByTimeRange(startTime, endTime) {
    return this.allErrors.filter(error =>
      error.timestamp >= startTime && error.timestamp <= endTime
    );
  }

  getCriticalErrorsOnly() {
    return this.allErrors.filter(error => error.severity === 'CRITICAL');
  }

  clear() {
    this.allErrors = [];
    this.errorPatterns.clear();
    this.startTime = Date.now();
  }

  getStats() {
    return {
      totalDetectors: this.detectors.length,
      totalErrors: this.allErrors.length,
      errorPatterns: this.errorPatterns.size,
      sessionDuration: Date.now() - this.startTime,
      qualityAssessment: this.assessErrorQuality()
    };
  }
}