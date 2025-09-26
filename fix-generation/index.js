/**
 * Fix Generation System Integration
 * Part of the Automated Validation & Fix Loop
 *
 * Integrates MCP client, pattern mapper, validator, and applier
 */

const MCPFixGenerator = require('./mcp-client');
const ErrorPatternMapper = require('./error-pattern-mapper');
const FixValidator = require('./fix-validator');
const FixApplier = require('./fix-applier');

class FixGenerationSystem {
  constructor(config = {}) {
    this.config = {
      autoApply: config.autoApply !== false,
      validateBeforeApply: config.validateBeforeApply !== false,
      maxFixAttempts: config.maxFixAttempts || 3,
      confidenceThreshold: config.confidenceThreshold || 70,
      ...config
    };

    // Initialize components
    this.mcpGenerator = new MCPFixGenerator(config.mcp);
    this.patternMapper = new ErrorPatternMapper();
    this.validator = new FixValidator(config.validation);
    this.applier = new FixApplier(config.application);

    this.fixHistory = [];
    this.activeFixing = new Map();
  }

  /**
   * Process an error and generate fixes
   */
  async processError(error, context = {}) {
    console.log(`[FixGeneration] Processing ${error.type} error`);

    // Check if already being fixed
    const errorKey = this.getErrorKey(error);
    if (this.activeFixing.has(errorKey)) {
      console.log(`[FixGeneration] Already fixing ${errorKey}`);
      return this.activeFixing.get(errorKey);
    }

    // Start fix process
    const fixPromise = this.generateAndApplyFix(error, context);
    this.activeFixing.set(errorKey, fixPromise);

    try {
      const result = await fixPromise;
      return result;
    } finally {
      this.activeFixing.delete(errorKey);
    }
  }

  /**
   * Generate and apply fix for an error
   */
  async generateAndApplyFix(error, context) {
    const result = {
      error,
      attempts: [],
      success: false,
      appliedFix: null,
      timestamp: Date.now()
    };

    try {
      // Step 1: Map error to fix strategies
      const strategy = this.patternMapper.mapErrorToStrategy(error, context);
      console.log(`[FixGeneration] Mapped to strategies: ${strategy.strategies.join(', ')}`);

      // Step 2: Generate fixes using MCP
      const fixes = await this.mcpGenerator.generateMultipleFixes(error, {
        ...context,
        strategy
      });

      // Step 3: Try fixes in order of confidence
      for (const fix of fixes) {
        if (fix.confidence < this.config.confidenceThreshold) {
          console.log(`[FixGeneration] Skipping fix with low confidence: ${fix.confidence}`);
          continue;
        }

        const attempt = {
          fix,
          validation: null,
          application: null,
          success: false
        };

        // Step 4: Validate fix
        if (this.config.validateBeforeApply) {
          console.log(`[FixGeneration] Validating fix (confidence: ${fix.confidence})`);
          attempt.validation = await this.validator.validateFix(fix, error, context);

          if (!attempt.validation.passed) {
            console.log(`[FixGeneration] Validation failed: score ${attempt.validation.score}`);
            result.attempts.push(attempt);
            continue;
          }
        }

        // Step 5: Apply fix
        if (this.config.autoApply) {
          console.log(`[FixGeneration] Applying fix`);
          try {
            attempt.application = await this.applier.applyFix(fix, error);
            attempt.success = attempt.application.success;

            if (attempt.success) {
              console.log(`[FixGeneration] Fix successfully applied`);
              result.success = true;
              result.appliedFix = fix;

              // Record success
              this.mcpGenerator.recordFixResult(error, fix, true);
            }
          } catch (applyError) {
            console.error(`[FixGeneration] Failed to apply fix:`, applyError);
            attempt.application = { success: false, error: applyError.message };
          }
        } else {
          // Just validate and return recommendation
          attempt.success = attempt.validation?.passed || false;
          if (attempt.success) {
            result.success = true;
            result.appliedFix = fix;
            result.recommendation = 'Fix validated and ready to apply';
          }
        }

        result.attempts.push(attempt);

        // Stop if successful
        if (result.success) {
          break;
        }
      }

      // Step 6: Handle failure
      if (!result.success && result.attempts.length === 0) {
        console.log(`[FixGeneration] No suitable fixes generated`);
        result.fallback = await this.getFallbackFix(error);
      }

    } catch (error) {
      console.error(`[FixGeneration] Error during fix process:`, error);
      result.error = error.message;
    }

    // Record result
    this.fixHistory.push(result);

    return result;
  }

  /**
   * Process multiple errors in priority order
   */
  async processErrors(errors) {
    console.log(`[FixGeneration] Processing ${errors.length} errors`);

    // Sort by severity
    const prioritized = this.prioritizeErrors(errors);
    const results = [];

    for (const error of prioritized) {
      // Stop if critical error fails
      if (error.severity === 'CRITICAL' && results.some(r => !r.success)) {
        console.log(`[FixGeneration] Stopping due to critical error failure`);
        break;
      }

      const result = await this.processError(error);
      results.push(result);

      // Add delay between fixes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      total: errors.length,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Prioritize errors for fixing
   */
  prioritizeErrors(errors) {
    const severityOrder = {
      'CRITICAL': 0,
      'HIGH': 1,
      'MEDIUM': 2,
      'LOW': 3
    };

    return errors.sort((a, b) => {
      const aSeverity = severityOrder[a.severity] ?? 4;
      const bSeverity = severityOrder[b.severity] ?? 4;
      return aSeverity - bSeverity;
    });
  }

  /**
   * Get fallback fix for unfixable errors
   */
  async getFallbackFix(error) {
    return {
      type: 'monitoring',
      code: `
// Fallback: Monitor and log error for manual review
(function monitorError() {
  console.warn('[Manual Review Required] ${error.type}:', ${JSON.stringify(error)});

  // Send to monitoring service
  if (window.errorMonitor) {
    window.errorMonitor.log({
      type: '${error.type}',
      severity: '${error.severity}',
      component: '${error.component}',
      requiresManualFix: true,
      timestamp: Date.now()
    });
  }
})();`,
      explanation: 'No automated fix available. Error logged for manual review.',
      confidence: 10
    };
  }

  /**
   * Get unique key for error
   */
  getErrorKey(error) {
    return `${error.type}-${error.component || 'unknown'}-${error.message || ''}`.substring(0, 100);
  }

  /**
   * Get fix generation statistics
   */
  getStatistics() {
    const stats = {
      totalErrors: this.fixHistory.length,
      successfulFixes: this.fixHistory.filter(h => h.success).length,
      failedFixes: this.fixHistory.filter(h => !h.success).length,
      averageAttempts: 0,
      bySeverity: {},
      byComponent: {},
      recentActivity: this.fixHistory.slice(-10)
    };

    // Calculate average attempts
    if (stats.totalErrors > 0) {
      const totalAttempts = this.fixHistory.reduce((sum, h) => sum + h.attempts.length, 0);
      stats.averageAttempts = (totalAttempts / stats.totalErrors).toFixed(2);
    }

    // Group by severity
    this.fixHistory.forEach(h => {
      const severity = h.error.severity || 'UNKNOWN';
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    });

    // Group by component
    this.fixHistory.forEach(h => {
      const component = h.error.component || 'unknown';
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;
    });

    // Add pattern analysis
    stats.patterns = this.patternMapper.analyzePatterns();

    // Add validator history
    stats.validation = this.validator.getHistory();

    // Add applier history
    stats.application = this.applier.getHistory();

    return stats;
  }

  /**
   * Generate report
   */
  generateReport() {
    const stats = this.getStatistics();

    return {
      summary: {
        totalProcessed: stats.totalErrors,
        successRate: ((stats.successfulFixes / stats.totalErrors) * 100).toFixed(2) + '%',
        criticalFixed: this.fixHistory.filter(h =>
          h.error.severity === 'CRITICAL' && h.success
        ).length,
        timestamp: new Date().toISOString()
      },
      statistics: stats,
      recommendations: this.generateRecommendations(stats),
      topIssues: this.getTopIssues(),
      fixEffectiveness: this.analyzeFix Effectiveness()
    };
  }

  /**
   * Generate recommendations based on statistics
   */
  generateRecommendations(stats) {
    const recommendations = [];

    // Check success rate
    const successRate = (stats.successfulFixes / stats.totalErrors) * 100;
    if (successRate < 50) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Low fix success rate. Consider manual intervention.',
        action: 'Review failed fixes and update patterns'
      });
    }

    // Check critical errors
    const criticalErrors = stats.bySeverity['CRITICAL'] || 0;
    if (criticalErrors > 0) {
      const criticalFixed = this.fixHistory.filter(h =>
        h.error.severity === 'CRITICAL' && h.success
      ).length;

      if (criticalFixed < criticalErrors) {
        recommendations.push({
          priority: 'URGENT',
          message: `${criticalErrors - criticalFixed} critical errors remain unfixed`,
          action: 'Immediate manual review required'
        });
      }
    }

    // Check recurring issues
    const recurringComponents = Object.entries(stats.byComponent)
      .filter(([_, count]) => count > 3)
      .map(([component]) => component);

    if (recurringComponents.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        message: `Recurring issues in: ${recurringComponents.join(', ')}`,
        action: 'Consider refactoring these components'
      });
    }

    return recommendations;
  }

  /**
   * Get top issues
   */
  getTopIssues() {
    const issueCounts = {};

    this.fixHistory.forEach(h => {
      const key = `${h.error.type}-${h.error.component}`;
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    });

    return Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({
        issue: key,
        occurrences: count,
        lastSeen: this.fixHistory
          .filter(h => `${h.error.type}-${h.error.component}` === key)
          .pop()?.timestamp
      }));
  }

  /**
   * Analyze fix effectiveness
   */
  analyzeFixEffectiveness() {
    const effectiveness = {
      byStrategy: {},
      byConfidence: {
        high: { total: 0, successful: 0 },
        medium: { total: 0, successful: 0 },
        low: { total: 0, successful: 0 }
      }
    };

    this.fixHistory.forEach(h => {
      h.attempts.forEach(attempt => {
        if (attempt.fix) {
          // By confidence level
          let level = 'low';
          if (attempt.fix.confidence >= 80) level = 'high';
          else if (attempt.fix.confidence >= 60) level = 'medium';

          effectiveness.byConfidence[level].total++;
          if (attempt.success) {
            effectiveness.byConfidence[level].successful++;
          }

          // By fix type
          const type = attempt.fix.fixType || 'unknown';
          if (!effectiveness.byStrategy[type]) {
            effectiveness.byStrategy[type] = { total: 0, successful: 0 };
          }
          effectiveness.byStrategy[type].total++;
          if (attempt.success) {
            effectiveness.byStrategy[type].successful++;
          }
        }
      });
    });

    // Calculate success rates
    Object.keys(effectiveness.byConfidence).forEach(level => {
      const data = effectiveness.byConfidence[level];
      data.successRate = data.total > 0 ?
        ((data.successful / data.total) * 100).toFixed(2) + '%' : 'N/A';
    });

    Object.keys(effectiveness.byStrategy).forEach(type => {
      const data = effectiveness.byStrategy[type];
      data.successRate = data.total > 0 ?
        ((data.successful / data.total) * 100).toFixed(2) + '%' : 'N/A';
    });

    return effectiveness;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.validator.cleanup();
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FixGenerationSystem;
}