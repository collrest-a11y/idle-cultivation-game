/**
 * ConvergenceDetector - Detects when the validation loop has converged
 *
 * This class analyzes error history to determine when:
 * 1. No errors remain (perfect convergence)
 * 2. Progress has stalled (no improvement)
 * 3. System is oscillating (fixes creating new errors)
 * 4. Diminishing returns (effort vs improvement)
 */
export class ConvergenceDetector {
  constructor(config = {}) {
    this.config = {
      // Perfect convergence: zero errors
      zeroErrorThreshold: config.zeroErrorThreshold || 0,

      // Progress stalled: no improvement for N iterations
      stallDetectionWindow: config.stallDetectionWindow || 3,
      stallThreshold: config.stallThreshold || 0.05, // 5% improvement minimum

      // Oscillation detection: error count variance
      oscillationWindow: config.oscillationWindow || 5,
      oscillationVarianceThreshold: config.oscillationVarianceThreshold || 0.3,

      // Diminishing returns: improvement rate declining
      diminishingReturnsWindow: config.diminishingReturnsWindow || 4,
      diminishingReturnsThreshold: config.diminishingReturnsThreshold || 0.1,

      // Minimum iterations before convergence can be declared
      minIterationsForConvergence: config.minIterationsForConvergence || 2,

      // Maximum acceptable error count for "good enough" convergence
      acceptableErrorThreshold: config.acceptableErrorThreshold || 0,

      ...config
    };

    this.convergenceHistory = [];
    this.analysisCache = new Map();
  }

  /**
   * Record error count for an iteration
   * @param {number} errorCount - Number of errors in this iteration
   * @param {Object} metadata - Additional metadata about the iteration
   */
  recordErrorCount(errorCount, metadata = {}) {
    const record = {
      iteration: this.convergenceHistory.length + 1,
      errorCount,
      timestamp: Date.now(),
      metadata,
      // Calculate improvement from previous iteration
      improvement: null,
      improvementRate: null
    };

    // Calculate improvement metrics
    if (this.convergenceHistory.length > 0) {
      const previous = this.convergenceHistory[this.convergenceHistory.length - 1];
      record.improvement = previous.errorCount - errorCount;
      record.improvementRate = previous.errorCount > 0 ?
        record.improvement / previous.errorCount : 0;
    }

    this.convergenceHistory.push(record);

    // Clear analysis cache when new data arrives
    this.analysisCache.clear();

    return record;
  }

  /**
   * Determine if the system has converged
   * @param {Array} errorHistory - Complete error history from loop controller
   * @returns {boolean} True if convergence detected
   */
  hasConverged(errorHistory = null) {
    // Use provided history or internal history
    const history = errorHistory || this.convergenceHistory;

    if (history.length < this.config.minIterationsForConvergence) {
      return false;
    }

    const analysis = this.analyzeConvergence(history);

    // Check all convergence conditions
    return (
      analysis.perfectConvergence ||
      analysis.acceptableConvergence ||
      analysis.progressStalled ||
      analysis.oscillationDetected ||
      analysis.diminishingReturns
    );
  }

  /**
   * Get detailed convergence analysis
   * @param {Array} errorHistory - Error history to analyze
   * @returns {Object} Detailed analysis results
   */
  analyzeConvergence(errorHistory = null) {
    const history = errorHistory || this.convergenceHistory;

    // Check cache first
    const cacheKey = this.generateCacheKey(history);
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const analysis = {
      // Basic metrics
      totalIterations: history.length,
      currentErrors: history.length > 0 ? history[history.length - 1].errorCount || 0 : 0,
      startingErrors: history.length > 0 ? history[0].errorCount || 0 : 0,
      totalErrorsFixed: 0,

      // Convergence states
      perfectConvergence: false,
      acceptableConvergence: false,
      progressStalled: false,
      oscillationDetected: false,
      diminishingReturns: false,

      // Detailed analysis
      improvementTrend: null,
      oscillationMetrics: null,
      stallMetrics: null,
      recommendedAction: null,
      confidence: 0
    };

    if (history.length === 0) {
      analysis.recommendedAction = 'continue';
      analysis.confidence = 0;
      this.analysisCache.set(cacheKey, analysis);
      return analysis;
    }

    // Calculate basic metrics
    analysis.totalErrorsFixed = Math.max(0, analysis.startingErrors - analysis.currentErrors);

    // Perfect convergence: zero errors
    analysis.perfectConvergence = analysis.currentErrors <= this.config.zeroErrorThreshold;

    // Acceptable convergence: low enough error count
    analysis.acceptableConvergence = analysis.currentErrors <= this.config.acceptableErrorThreshold;

    // Analyze improvement trend
    analysis.improvementTrend = this.analyzeImprovementTrend(history);

    // Check for stalled progress
    analysis.progressStalled = this.detectStalledProgress(history);
    analysis.stallMetrics = this.getStallMetrics(history);

    // Check for oscillation
    analysis.oscillationDetected = this.detectOscillation(history);
    analysis.oscillationMetrics = this.getOscillationMetrics(history);

    // Check for diminishing returns
    analysis.diminishingReturns = this.detectDiminishingReturns(history);

    // Determine recommended action and confidence
    this.determineRecommendation(analysis);

    // Cache the result
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Analyze the improvement trend over iterations
   */
  analyzeImprovementTrend(history) {
    if (history.length < 2) {
      return { trend: 'insufficient-data', slope: 0, consistency: 0 };
    }

    // Calculate linear regression on error counts
    const points = history.map((record, index) => ({
      x: index,
      y: record.errorCount || 0
    }));

    const regression = this.calculateLinearRegression(points);
    const improvementRates = history
      .slice(1)
      .map(record => record.improvementRate || 0);

    return {
      trend: regression.slope < -0.1 ? 'improving' :
             regression.slope > 0.1 ? 'worsening' : 'stable',
      slope: regression.slope,
      rSquared: regression.rSquared,
      consistency: this.calculateConsistency(improvementRates),
      averageImprovement: improvementRates.reduce((a, b) => a + b, 0) / improvementRates.length
    };
  }

  /**
   * Detect if progress has stalled
   */
  detectStalledProgress(history) {
    if (history.length < this.config.stallDetectionWindow) {
      return false;
    }

    const recentHistory = history.slice(-this.config.stallDetectionWindow);
    const errorCounts = recentHistory.map(record => record.errorCount || 0);

    // Check if error count has remained static or improved minimally
    const maxErrors = Math.max(...errorCounts);
    const minErrors = Math.min(...errorCounts);
    const range = maxErrors - minErrors;
    const averageErrors = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length;

    // Stalled if improvement is less than threshold
    const improvementRatio = averageErrors > 0 ? range / averageErrors : 0;

    return improvementRatio < this.config.stallThreshold;
  }

  /**
   * Get detailed stall metrics
   */
  getStallMetrics(history) {
    if (history.length < this.config.stallDetectionWindow) {
      return { insufficient: true };
    }

    const window = Math.min(this.config.stallDetectionWindow, history.length);
    const recentHistory = history.slice(-window);
    const errorCounts = recentHistory.map(record => record.errorCount || 0);

    const variance = this.calculateVariance(errorCounts);
    const mean = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;

    return {
      windowSize: window,
      mean: mean,
      variance: variance,
      coefficientOfVariation: coefficientOfVariation,
      isStalled: coefficientOfVariation < this.config.stallThreshold
    };
  }

  /**
   * Detect oscillating behavior (fixes creating new errors)
   */
  detectOscillation(history) {
    if (history.length < this.config.oscillationWindow) {
      return false;
    }

    const recentHistory = history.slice(-this.config.oscillationWindow);
    const errorCounts = recentHistory.map(record => record.errorCount || 0);

    // Calculate variance to coefficient of variation ratio
    const variance = this.calculateVariance(errorCounts);
    const mean = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;

    // High variance relative to mean indicates oscillation
    return coefficientOfVariation > this.config.oscillationVarianceThreshold;
  }

  /**
   * Get detailed oscillation metrics
   */
  getOscillationMetrics(history) {
    if (history.length < this.config.oscillationWindow) {
      return { insufficient: true };
    }

    const window = Math.min(this.config.oscillationWindow, history.length);
    const recentHistory = history.slice(-window);
    const errorCounts = recentHistory.map(record => record.errorCount || 0);

    const variance = this.calculateVariance(errorCounts);
    const mean = errorCounts.reduce((a, b) => a + b, 0) / errorCounts.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;

    // Count direction changes (sign flips in improvement)
    const improvements = recentHistory.map(record => record.improvement || 0);
    let directionChanges = 0;
    for (let i = 1; i < improvements.length; i++) {
      if ((improvements[i] > 0 && improvements[i-1] < 0) ||
          (improvements[i] < 0 && improvements[i-1] > 0)) {
        directionChanges++;
      }
    }

    return {
      windowSize: window,
      variance: variance,
      standardDeviation: standardDeviation,
      coefficientOfVariation: coefficientOfVariation,
      directionChanges: directionChanges,
      oscillationScore: coefficientOfVariation + (directionChanges / window),
      isOscillating: coefficientOfVariation > this.config.oscillationVarianceThreshold
    };
  }

  /**
   * Detect diminishing returns
   */
  detectDiminishingReturns(history) {
    if (history.length < this.config.diminishingReturnsWindow) {
      return false;
    }

    const window = this.config.diminishingReturnsWindow;
    const recentHistory = history.slice(-window);
    const improvementRates = recentHistory.map(record => record.improvementRate || 0);

    // Check if improvement rates are declining
    const trend = this.calculateLinearRegression(
      improvementRates.map((rate, index) => ({ x: index, y: rate }))
    );

    // Diminishing returns if improvement rate trend is declining significantly
    return trend.slope < -this.config.diminishingReturnsThreshold;
  }

  /**
   * Determine recommended action based on analysis
   */
  determineRecommendation(analysis) {
    let recommendation = 'continue';
    let confidence = 50;
    let reason = '';

    if (analysis.perfectConvergence) {
      recommendation = 'stop-success';
      confidence = 100;
      reason = 'Perfect convergence achieved - zero errors remaining';
    } else if (analysis.acceptableConvergence) {
      recommendation = 'stop-acceptable';
      confidence = 90;
      reason = 'Acceptable error level reached';
    } else if (analysis.progressStalled && analysis.currentErrors > this.config.acceptableErrorThreshold) {
      recommendation = 'stop-stalled';
      confidence = 80;
      reason = 'Progress has stalled - no significant improvement';
    } else if (analysis.oscillationDetected) {
      recommendation = 'stop-oscillation';
      confidence = 75;
      reason = 'System is oscillating - fixes may be creating new errors';
    } else if (analysis.diminishingReturns) {
      recommendation = 'consider-stopping';
      confidence = 60;
      reason = 'Diminishing returns detected - effort vs improvement ratio is poor';
    } else if (analysis.improvementTrend?.trend === 'improving') {
      recommendation = 'continue';
      confidence = 70;
      reason = 'System is still improving';
    } else {
      recommendation = 'continue-cautiously';
      confidence = 40;
      reason = 'Unclear progress pattern';
    }

    analysis.recommendedAction = recommendation;
    analysis.confidence = confidence;
    analysis.reason = reason;
  }

  /**
   * Get convergence status summary
   */
  getConvergenceStatus(errorHistory = null) {
    const history = errorHistory || this.convergenceHistory;
    const analysis = this.analyzeConvergence(history);

    return {
      hasConverged: this.hasConverged(history),
      recommendation: analysis.recommendedAction,
      confidence: analysis.confidence,
      reason: analysis.reason,
      metrics: {
        currentErrors: analysis.currentErrors,
        totalFixed: analysis.totalErrorsFixed,
        iterations: analysis.totalIterations,
        improvementTrend: analysis.improvementTrend?.trend,
        isStalled: analysis.progressStalled,
        isOscillating: analysis.oscillationDetected
      }
    };
  }

  /**
   * Utility methods
   */

  calculateLinearRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + (p.x * p.y), 0);
    const sumXX = points.reduce((sum, p) => sum + (p.x * p.x), 0);
    const sumYY = points.reduce((sum, p) => sum + (p.y * p.y), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const residualSumSquares = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);

    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;

    return { slope, intercept, rSquared };
  }

  calculateVariance(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));

    return squaredDifferences.reduce((a, b) => a + b, 0) / (values.length - 1);
  }

  calculateConsistency(values) {
    if (values.length < 2) return 0;

    const variance = this.calculateVariance(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Lower coefficient of variation means higher consistency
    const coefficientOfVariation = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 0;

    return Math.max(0, 1 - coefficientOfVariation);
  }

  generateCacheKey(history) {
    // Create a hash-like key based on history length and last few error counts
    const lastFew = history.slice(-5).map(record => record.errorCount || 0);
    return `${history.length}_${lastFew.join('_')}`;
  }

  /**
   * Reset the detector state
   */
  reset() {
    this.convergenceHistory = [];
    this.analysisCache.clear();
  }

  /**
   * Export convergence data for analysis
   */
  exportData() {
    return {
      config: this.config,
      history: this.convergenceHistory,
      currentAnalysis: this.analyzeConvergence()
    };
  }

  /**
   * Get human-readable convergence report
   */
  getReport(errorHistory = null) {
    const analysis = this.analyzeConvergence(errorHistory);

    let report = `Convergence Analysis Report\n`;
    report += `============================\n\n`;

    report += `Overall Status: ${analysis.recommendedAction.toUpperCase()}\n`;
    report += `Confidence: ${analysis.confidence}%\n`;
    report += `Reason: ${analysis.reason}\n\n`;

    report += `Metrics:\n`;
    report += `- Total Iterations: ${analysis.totalIterations}\n`;
    report += `- Starting Errors: ${analysis.startingErrors}\n`;
    report += `- Current Errors: ${analysis.currentErrors}\n`;
    report += `- Total Fixed: ${analysis.totalErrorsFixed}\n`;
    report += `- Fix Rate: ${analysis.startingErrors > 0 ? (analysis.totalErrorsFixed / analysis.startingErrors * 100).toFixed(1) : 0}%\n\n`;

    if (analysis.improvementTrend) {
      report += `Improvement Trend:\n`;
      report += `- Direction: ${analysis.improvementTrend.trend}\n`;
      report += `- Slope: ${analysis.improvementTrend.slope.toFixed(4)}\n`;
      report += `- Consistency: ${(analysis.improvementTrend.consistency * 100).toFixed(1)}%\n\n`;
    }

    report += `Convergence States:\n`;
    report += `- Perfect Convergence: ${analysis.perfectConvergence ? 'YES' : 'NO'}\n`;
    report += `- Acceptable Level: ${analysis.acceptableConvergence ? 'YES' : 'NO'}\n`;
    report += `- Progress Stalled: ${analysis.progressStalled ? 'YES' : 'NO'}\n`;
    report += `- Oscillation Detected: ${analysis.oscillationDetected ? 'YES' : 'NO'}\n`;
    report += `- Diminishing Returns: ${analysis.diminishingReturns ? 'YES' : 'NO'}\n`;

    return report;
  }
}