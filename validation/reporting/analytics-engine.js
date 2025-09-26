import fs from 'fs-extra';
import path from 'path';

/**
 * Analytics Engine - Advanced data analysis for validation and fix patterns
 *
 * Provides statistical analysis, trend detection, pattern recognition,
 * and predictive insights for the validation loop system.
 */
export class AnalyticsEngine {
  constructor(config = {}) {
    this.config = {
      historicalDataPath: config.historicalDataPath || './validation-reports/analytics-data',
      retentionPeriod: config.retentionPeriod || 90, // days
      minDataPoints: config.minDataPoints || 5,
      confidenceThreshold: config.confidenceThreshold || 0.8,
      ...config
    };

    this.historicalData = {
      sessions: [],
      aggregatedMetrics: {},
      trends: {},
      patterns: []
    };
  }

  /**
   * Initialize analytics engine and load historical data
   */
  async initialize() {
    console.log('🧮 Initializing Analytics Engine...');

    await fs.ensureDir(this.config.historicalDataPath);
    await this.loadHistoricalData();

    console.log(`✅ Analytics Engine initialized with ${this.historicalData.sessions.length} historical sessions`);
  }

  /**
   * Analyze session data and generate comprehensive insights
   */
  async analyzeSession(sessionData) {
    const analysis = {
      timestamp: Date.now(),
      sessionId: sessionData.session.id,
      basicStats: this.calculateBasicStatistics(sessionData),
      trends: await this.analyzeTrends(sessionData),
      patterns: this.detectAdvancedPatterns(sessionData),
      anomalies: this.detectAnomalies(sessionData),
      predictions: this.generatePredictions(sessionData),
      comparisons: this.compareWithHistorical(sessionData),
      insights: this.generateActionableInsights(sessionData)
    };

    // Store session for future analysis
    await this.storeSessionData(sessionData);

    return analysis;
  }

  /**
   * Calculate basic statistical measures
   */
  calculateBasicStatistics(sessionData) {
    const iterations = sessionData.session.iterations || [];
    const errors = sessionData.session.errors || [];
    const fixes = sessionData.session.fixes || [];

    const stats = {
      iterations: {
        count: iterations.length,
        avgDuration: this.calculateMean(iterations.map(i => i.duration)),
        medianDuration: this.calculateMedian(iterations.map(i => i.duration)),
        stdDevDuration: this.calculateStandardDeviation(iterations.map(i => i.duration))
      },
      errors: {
        total: errors.length,
        bySeverity: this.groupBy(errors, 'severity'),
        byType: this.groupBy(errors, 'type'),
        byComponent: this.groupBy(errors, 'component'),
        avgFrequency: this.calculateMean(errors.map(e => e.frequency || 1)),
        distribution: this.calculateErrorDistribution(errors)
      },
      fixes: {
        total: fixes.length,
        successRate: fixes.length > 0 ? (fixes.filter(f => f.result === 'success').length / fixes.length) : 0,
        avgConfidence: this.calculateMean(fixes.map(f => f.confidence || 0)),
        avgDuration: this.calculateMean(fixes.filter(f => f.duration > 0).map(f => f.duration)),
        retryAnalysis: this.analyzeRetries(fixes)
      },
      performance: {
        memoryTrend: this.calculateTrend(iterations.map(i => i.memoryUsage?.heapUsed || 0)),
        convergenceRate: this.calculateConvergenceRate(iterations),
        efficiency: this.calculateEfficiencyMetrics(sessionData)
      }
    };

    return stats;
  }

  /**
   * Analyze trends over time and compare with historical data
   */
  async analyzeTrends(sessionData) {
    const currentTrends = {
      errorReduction: this.analyzeErrorReductionTrend(sessionData),
      fixEffectiveness: this.analyzeFixEffectivenessTrend(sessionData),
      performanceRegression: this.analyzePerformanceTrend(sessionData),
      componentStability: this.analyzeComponentStabilityTrend(sessionData),
      temporalPatterns: this.analyzeTemporalPatterns(sessionData)
    };

    // Compare with historical trends
    const historicalComparison = await this.compareWithHistoricalTrends(currentTrends);

    return {
      current: currentTrends,
      historical: historicalComparison,
      projections: this.projectTrends(currentTrends)
    };
  }

  /**
   * Detect advanced patterns using statistical methods
   */
  detectAdvancedPatterns(sessionData) {
    const patterns = [];

    // Clustering analysis for error types
    const errorClusters = this.clusterErrors(sessionData.session.errors || []);
    if (errorClusters.length > 0) {
      patterns.push({
        type: 'error-clustering',
        description: `Detected ${errorClusters.length} distinct error clusters`,
        clusters: errorClusters,
        confidence: this.calculateClusteringConfidence(errorClusters)
      });
    }

    // Correlation analysis between components and error types
    const correlations = this.analyzeComponentErrorCorrelations(sessionData);
    const strongCorrelations = correlations.filter(c => Math.abs(c.correlation) > 0.7);

    if (strongCorrelations.length > 0) {
      patterns.push({
        type: 'component-error-correlation',
        description: `Strong correlations found between ${strongCorrelations.length} component-error pairs`,
        correlations: strongCorrelations
      });
    }

    // Seasonal/temporal patterns
    const temporalPatterns = this.detectTemporalPatterns(sessionData);
    if (temporalPatterns.significance > 0.8) {
      patterns.push({
        type: 'temporal-pattern',
        description: `Significant temporal pattern detected`,
        pattern: temporalPatterns,
        confidence: temporalPatterns.significance
      });
    }

    // Success/failure patterns in fixes
    const fixPatterns = this.analyzeFixSuccessPatterns(sessionData.session.fixes || []);
    if (fixPatterns.predictiveFeatures.length > 0) {
      patterns.push({
        type: 'fix-success-pattern',
        description: `Identified ${fixPatterns.predictiveFeatures.length} factors affecting fix success`,
        features: fixPatterns.predictiveFeatures
      });
    }

    return patterns;
  }

  /**
   * Detect statistical anomalies in the data
   */
  detectAnomalies(sessionData) {
    const anomalies = [];
    const iterations = sessionData.session.iterations || [];
    const errors = sessionData.session.errors || [];

    // Duration anomalies using Z-score
    const durations = iterations.map(i => i.duration);
    const durationAnomalies = this.detectOutliers(durations, 'duration');
    if (durationAnomalies.length > 0) {
      anomalies.push({
        type: 'duration-anomaly',
        description: `${durationAnomalies.length} iterations with unusual durations`,
        anomalies: durationAnomalies
      });
    }

    // Memory usage anomalies
    const memoryUsages = iterations.map(i => i.memoryUsage?.heapUsed || 0);
    const memoryAnomalies = this.detectOutliers(memoryUsages, 'memory');
    if (memoryAnomalies.length > 0) {
      anomalies.push({
        type: 'memory-anomaly',
        description: `${memoryAnomalies.length} iterations with unusual memory usage`,
        anomalies: memoryAnomalies
      });
    }

    // Error frequency anomalies
    const errorCounts = iterations.map(i => i.errorsFound || 0);
    const errorAnomalies = this.detectOutliers(errorCounts, 'errors');
    if (errorAnomalies.length > 0) {
      anomalies.push({
        type: 'error-spike-anomaly',
        description: `${errorAnomalies.length} iterations with unusual error counts`,
        anomalies: errorAnomalies
      });
    }

    return anomalies;
  }

  /**
   * Generate predictions based on current trends
   */
  generatePredictions(sessionData) {
    const predictions = {};

    // Predict completion time if current session is ongoing
    if (sessionData.session.iterations.length > 2) {
      predictions.estimatedCompletion = this.predictCompletion(sessionData);
    }

    // Predict likely bottlenecks
    predictions.likelyBottlenecks = this.predictBottlenecks(sessionData);

    // Predict fix success probability for common error types
    predictions.fixSuccessProbability = this.predictFixSuccess(sessionData);

    // Predict resource usage
    predictions.resourceUsage = this.predictResourceUsage(sessionData);

    return predictions;
  }

  /**
   * Compare current session with historical data
   */
  compareWithHistorical(sessionData) {
    if (this.historicalData.sessions.length < this.config.minDataPoints) {
      return { note: 'Insufficient historical data for comparison' };
    }

    const comparison = {
      performance: this.comparePerformanceWithHistorical(sessionData),
      errorPatterns: this.compareErrorPatternsWithHistorical(sessionData),
      fixEffectiveness: this.compareFixEffectivenessWithHistorical(sessionData),
      ranking: this.rankSessionPerformance(sessionData)
    };

    return comparison;
  }

  /**
   * Generate actionable insights from analysis
   */
  generateActionableInsights(sessionData) {
    const insights = [];
    const stats = this.calculateBasicStatistics(sessionData);

    // Performance insights
    if (stats.iterations.avgDuration > 30000) { // 30 seconds
      insights.push({
        category: 'performance',
        priority: 'high',
        insight: `Average iteration time of ${Math.round(stats.iterations.avgDuration / 1000)}s is above recommended threshold`,
        recommendation: 'Consider optimizing error detection or fix generation processes',
        impact: 'high'
      });
    }

    // Error pattern insights
    const dominantErrorType = Object.entries(stats.errors.byType)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantErrorType && dominantErrorType[1] > stats.errors.total * 0.4) {
      insights.push({
        category: 'error-patterns',
        priority: 'medium',
        insight: `Error type '${dominantErrorType[0]}' accounts for ${Math.round(dominantErrorType[1] / stats.errors.total * 100)}% of all errors`,
        recommendation: 'Focus optimization efforts on preventing this specific error type',
        impact: 'medium'
      });
    }

    // Fix effectiveness insights
    if (stats.fixes.successRate < 0.7) {
      insights.push({
        category: 'fix-quality',
        priority: 'high',
        insight: `Fix success rate of ${Math.round(stats.fixes.successRate * 100)}% is below target`,
        recommendation: 'Review and improve fix generation algorithms or validation processes',
        impact: 'high'
      });
    }

    // Resource usage insights
    const memoryTrend = stats.performance.memoryTrend;
    if (memoryTrend === 'worsening') {
      insights.push({
        category: 'resources',
        priority: 'medium',
        insight: 'Memory usage is increasing over iterations, suggesting possible memory leaks',
        recommendation: 'Investigate memory management in fix application processes',
        impact: 'medium'
      });
    }

    return insights;
  }

  /**
   * Store session data for future analysis
   */
  async storeSessionData(sessionData) {
    const dataPath = path.join(this.config.historicalDataPath, 'sessions.json');

    // Add to historical data
    this.historicalData.sessions.push({
      id: sessionData.session.id,
      timestamp: sessionData.timestamp,
      summary: sessionData.summary,
      metrics: sessionData.metrics
    });

    // Keep only recent sessions based on retention period
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    this.historicalData.sessions = this.historicalData.sessions
      .filter(session => session.timestamp > cutoffTime);

    await fs.writeJson(dataPath, this.historicalData, { spaces: 2 });
  }

  /**
   * Load historical data from storage
   */
  async loadHistoricalData() {
    const dataPath = path.join(this.config.historicalDataPath, 'sessions.json');

    try {
      if (await fs.pathExists(dataPath)) {
        this.historicalData = await fs.readJson(dataPath);
      }
    } catch (error) {
      console.warn('⚠️ Could not load historical data:', error.message);
      this.historicalData = { sessions: [], aggregatedMetrics: {}, trends: {}, patterns: [] };
    }
  }

  /**
   * Statistical helper methods
   */

  calculateMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateStandardDeviation(values) {
    if (values.length <= 1) return 0;
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data';

    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'worsening' : 'improving';
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  calculateErrorDistribution(errors) {
    const distribution = {};
    const totalErrors = errors.length;

    const severityGroups = this.groupBy(errors, 'severity');
    Object.entries(severityGroups).forEach(([severity, count]) => {
      distribution[severity] = {
        count,
        percentage: (count / totalErrors * 100).toFixed(1)
      };
    });

    return distribution;
  }

  analyzeRetries(fixes) {
    const retryData = fixes.filter(f => f.retryCount > 0);
    return {
      totalRetries: retryData.reduce((sum, f) => sum + f.retryCount, 0),
      fixesWithRetries: retryData.length,
      avgRetriesPerFix: retryData.length > 0
        ? (retryData.reduce((sum, f) => sum + f.retryCount, 0) / retryData.length).toFixed(1)
        : 0
    };
  }

  calculateConvergenceRate(iterations) {
    if (iterations.length < 2) return 0;

    const errorCounts = iterations.map(i => i.errorsFound || 0);
    const reductions = [];

    for (let i = 1; i < errorCounts.length; i++) {
      if (errorCounts[i - 1] > 0) {
        reductions.push((errorCounts[i - 1] - errorCounts[i]) / errorCounts[i - 1]);
      }
    }

    return reductions.length > 0
      ? (reductions.reduce((a, b) => a + b, 0) / reductions.length * 100).toFixed(1)
      : 0;
  }

  calculateEfficiencyMetrics(sessionData) {
    const iterations = sessionData.session.iterations || [];
    const totalTime = iterations.reduce((sum, i) => sum + i.duration, 0);
    const totalErrors = sessionData.session.errors.length;
    const totalFixes = sessionData.session.fixes.length;

    return {
      errorsPerMinute: totalTime > 0 ? (totalErrors / (totalTime / 60000)).toFixed(2) : 0,
      fixesPerMinute: totalTime > 0 ? (totalFixes / (totalTime / 60000)).toFixed(2) : 0,
      timePerError: totalErrors > 0 ? (totalTime / totalErrors).toFixed(0) : 0,
      timePerFix: totalFixes > 0 ? (totalTime / totalFixes).toFixed(0) : 0
    };
  }

  detectOutliers(values, label) {
    if (values.length < 3) return [];

    const mean = this.calculateMean(values);
    const stdDev = this.calculateStandardDeviation(values);
    const threshold = 2; // Z-score threshold

    const outliers = [];
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        outliers.push({
          index,
          value,
          zScore: zScore.toFixed(2),
          type: value > mean ? 'high' : 'low'
        });
      }
    });

    return outliers;
  }

  clusterErrors(errors) {
    // Simple clustering based on error type and component
    const clusters = {};

    errors.forEach(error => {
      const key = `${error.type}-${error.component}`;
      if (!clusters[key]) {
        clusters[key] = {
          type: error.type,
          component: error.component,
          errors: [],
          severity: error.severity
        };
      }
      clusters[key].errors.push(error);
    });

    // Return clusters with more than 1 error
    return Object.values(clusters).filter(cluster => cluster.errors.length > 1);
  }

  calculateClusteringConfidence(clusters) {
    // Simple confidence calculation based on cluster sizes
    const totalErrors = clusters.reduce((sum, cluster) => sum + cluster.errors.length, 0);
    const largestCluster = Math.max(...clusters.map(c => c.errors.length));

    return largestCluster / totalErrors;
  }

  analyzeComponentErrorCorrelations(sessionData) {
    const errors = sessionData.session.errors || [];
    const components = [...new Set(errors.map(e => e.component))];
    const errorTypes = [...new Set(errors.map(e => e.type))];

    const correlations = [];

    components.forEach(component => {
      errorTypes.forEach(errorType => {
        const componentErrors = errors.filter(e => e.component === component);
        const typeErrors = errors.filter(e => e.type === errorType);
        const bothErrors = errors.filter(e => e.component === component && e.type === errorType);

        if (componentErrors.length > 0 && typeErrors.length > 0) {
          const correlation = (bothErrors.length * errors.length) / (componentErrors.length * typeErrors.length);

          if (correlation > 1.5) { // Significant correlation threshold
            correlations.push({
              component,
              errorType,
              correlation: correlation.toFixed(2),
              strength: correlation > 2 ? 'strong' : 'moderate'
            });
          }
        }
      });
    });

    return correlations;
  }

  detectTemporalPatterns(sessionData) {
    const errors = sessionData.session.errors || [];

    if (errors.length < 10) {
      return { significance: 0, pattern: 'insufficient-data' };
    }

    // Group errors by hour of day
    const hourlyDistribution = {};
    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    // Calculate variance to detect patterns
    const hourCounts = Object.values(hourlyDistribution);
    const mean = this.calculateMean(hourCounts);
    const variance = this.calculateStandardDeviation(hourCounts);

    const significance = variance / Math.max(mean, 1);

    return {
      significance: Math.min(significance / 5, 1), // Normalize to 0-1
      hourlyDistribution,
      pattern: significance > 2 ? 'clustered' : 'distributed'
    };
  }

  analyzeFixSuccessPatterns(fixes) {
    if (fixes.length < 5) {
      return { predictiveFeatures: [] };
    }

    const features = [];

    // Confidence threshold analysis
    const highConfidenceFixes = fixes.filter(f => f.confidence >= 80);
    const lowConfidenceFixes = fixes.filter(f => f.confidence < 80);

    const highConfidenceSuccess = highConfidenceFixes.filter(f => f.result === 'success').length;
    const lowConfidenceSuccess = lowConfidenceFixes.filter(f => f.result === 'success').length;

    if (highConfidenceFixes.length > 0 && lowConfidenceFixes.length > 0) {
      const highRate = highConfidenceSuccess / highConfidenceFixes.length;
      const lowRate = lowConfidenceSuccess / lowConfidenceFixes.length;

      if (highRate - lowRate > 0.2) {
        features.push({
          feature: 'confidence-threshold',
          description: `Fixes with confidence ≥80% have ${Math.round((highRate - lowRate) * 100)}% higher success rate`,
          importance: 'high'
        });
      }
    }

    // Duration analysis
    const successDurations = fixes.filter(f => f.result === 'success' && f.duration > 0).map(f => f.duration);
    const failDurations = fixes.filter(f => f.result === 'failed' && f.duration > 0).map(f => f.duration);

    if (successDurations.length > 0 && failDurations.length > 0) {
      const successMean = this.calculateMean(successDurations);
      const failMean = this.calculateMean(failDurations);

      if (Math.abs(successMean - failMean) > successMean * 0.3) {
        features.push({
          feature: 'fix-duration',
          description: `${successMean < failMean ? 'Shorter' : 'Longer'} fix generation times correlate with success`,
          importance: 'medium'
        });
      }
    }

    return { predictiveFeatures: features };
  }

  // Additional analysis methods would be implemented here...

  analyzeErrorReductionTrend(sessionData) {
    const iterations = sessionData.session.iterations || [];
    const errorCounts = iterations.map(i => i.errorsFound || 0);

    return {
      trend: this.calculateTrend(errorCounts),
      totalReduction: errorCounts.length > 1 ? errorCounts[0] - errorCounts[errorCounts.length - 1] : 0,
      reductionRate: this.calculateConvergenceRate(iterations)
    };
  }

  analyzeFixEffectivenessTrend(sessionData) {
    const iterations = sessionData.session.iterations || [];
    const fixes = sessionData.session.fixes || [];

    const effectivenessPerIteration = iterations.map(iteration => {
      const iterationFixes = fixes.filter(f => f.iteration === iteration.number);
      const successful = iterationFixes.filter(f => f.result === 'success').length;
      return iterationFixes.length > 0 ? successful / iterationFixes.length : 0;
    });

    return {
      trend: this.calculateTrend(effectivenessPerIteration),
      averageEffectiveness: this.calculateMean(effectivenessPerIteration),
      data: effectivenessPerIteration
    };
  }

  analyzePerformanceTrend(sessionData) {
    const iterations = sessionData.session.iterations || [];
    const durations = iterations.map(i => i.duration);
    const memoryUsages = iterations.map(i => i.memoryUsage?.heapUsed || 0);

    return {
      durationTrend: this.calculateTrend(durations),
      memoryTrend: this.calculateTrend(memoryUsages),
      avgDuration: this.calculateMean(durations),
      avgMemory: this.calculateMean(memoryUsages)
    };
  }

  // More methods would be implemented here for complete functionality...
}