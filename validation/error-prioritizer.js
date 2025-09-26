/**
 * ErrorPrioritizer - Smart prioritization system for error fixing
 *
 * This class implements sophisticated error prioritization based on:
 * 1. Error severity and impact
 * 2. Component criticality
 * 3. Fix success probability
 * 4. Dependencies between errors
 * 5. Historical fix success rates
 * 6. Business logic priorities
 */
export class ErrorPrioritizer {
  constructor(config = {}) {
    this.config = {
      // Component criticality weights (higher = more critical)
      componentWeights: {
        'character-creation': 100, // Critical game flow
        'save-system': 90,         // Data persistence critical
        'game-init': 85,          // Must work for game to start
        'ui': 70,                 // User experience important
        'performance': 60,        // Important but not blocking
        'network': 50,            // Can often be retried
        'unknown': 30,            // Lower priority for unclear errors
        ...config.componentWeights
      },

      // Severity multipliers
      severityMultipliers: {
        'CRITICAL': 4.0,
        'HIGH': 3.0,
        'MEDIUM': 2.0,
        'LOW': 1.0,
        ...config.severityMultipliers
      },

      // Error type specific weights
      errorTypeWeights: {
        'runtime-error': 90,
        'functional-error': 85,
        'initialization-error': 80,
        'interaction-error': 75,
        'console-error': 60,
        'performance-warning': 40,
        'memory-warning': 35,
        ...config.errorTypeWeights
      },

      // Fix confidence thresholds for priority adjustment
      confidenceThresholds: {
        high: 80,    // Boost priority for high-confidence fixes
        medium: 60,  // Normal priority
        low: 40,     // Reduce priority for low-confidence fixes
        ...config.confidenceThresholds
      },

      // Historical success factor weight
      historicalSuccessWeight: config.historicalSuccessWeight || 0.2,

      // Frequency boost factor
      frequencyBoostFactor: config.frequencyBoostFactor || 0.1,

      // Dependency boost factor
      dependencyBoostFactor: config.dependencyBoostFactor || 0.15,

      ...config
    };

    this.prioritizationHistory = [];
    this.errorDependencyGraph = new Map();
    this.componentSuccessRates = new Map();
  }

  /**
   * Prioritize errors for fixing based on multiple factors
   * @param {Array} errors - Array of error objects to prioritize
   * @param {Object} context - Context including iteration number and history
   * @returns {Array} Prioritized array of errors
   */
  prioritizeErrors(errors, context = {}) {
    console.log(`📊 Prioritizing ${errors.length} errors for processing`);

    // Update component success rates from context
    this.updateComponentSuccessRates(context.previousResults || []);

    // Calculate priority scores for all errors
    const errorScores = errors.map(error => ({
      error,
      score: this.calculatePriorityScore(error, context),
      breakdown: this.calculateScoreBreakdown(error, context)
    }));

    // Sort by priority score (highest first)
    errorScores.sort((a, b) => b.score - a.score);

    // Apply dependency-based adjustments
    const dependencyAdjusted = this.applyDependencyAdjustments(errorScores, context);

    // Apply diversity filtering to avoid fixing too many similar errors
    const diversified = this.applyDiversityFiltering(dependencyAdjusted, context);

    // Record prioritization for analysis
    this.recordPrioritization(diversified, context);

    // Log prioritization results
    this.logPrioritizationResults(diversified.slice(0, 10)); // Top 10

    return diversified.map(item => item.error);
  }

  /**
   * Calculate comprehensive priority score for an error
   */
  calculatePriorityScore(error, context) {
    const breakdown = this.calculateScoreBreakdown(error, context);

    // Combine all factors
    let totalScore = 0;

    // Base score from severity, component, and error type
    totalScore += breakdown.severityScore;
    totalScore += breakdown.componentScore;
    totalScore += breakdown.errorTypeScore;

    // Apply multipliers
    totalScore *= breakdown.confidenceMultiplier;
    totalScore *= breakdown.historicalMultiplier;
    totalScore += breakdown.frequencyBonus;

    // Apply context-specific adjustments
    totalScore += breakdown.iterationAdjustment;
    totalScore += breakdown.businessLogicBonus;

    return Math.max(0, totalScore);
  }

  /**
   * Calculate detailed score breakdown for transparency
   */
  calculateScoreBreakdown(error, context) {
    const breakdown = {
      // Base scores
      severityScore: 0,
      componentScore: 0,
      errorTypeScore: 0,

      // Multipliers
      confidenceMultiplier: 1.0,
      historicalMultiplier: 1.0,

      // Bonuses
      frequencyBonus: 0,
      iterationAdjustment: 0,
      businessLogicBonus: 0,

      // Meta
      totalScore: 0,
      reasoning: []
    };

    // 1. Severity score (0-100 base points)
    const severity = error.severity || 'MEDIUM';
    const severityMultiplier = this.config.severityMultipliers[severity] || 1.0;
    breakdown.severityScore = 25 * severityMultiplier;
    breakdown.reasoning.push(`Severity ${severity}: +${breakdown.severityScore.toFixed(1)}`);

    // 2. Component score (0-100 base points)
    const component = error.component || 'unknown';
    const componentWeight = this.config.componentWeights[component] || 30;
    breakdown.componentScore = componentWeight;
    breakdown.reasoning.push(`Component ${component}: +${breakdown.componentScore}`);

    // 3. Error type score (0-100 base points)
    const errorType = error.type || 'unknown';
    const typeWeight = this.config.errorTypeWeights[errorType] || 50;
    breakdown.errorTypeScore = typeWeight;
    breakdown.reasoning.push(`Type ${errorType}: +${breakdown.errorTypeScore}`);

    // 4. Fix confidence multiplier (0.5x to 1.5x)
    const confidence = error.estimatedFixConfidence || 60;
    if (confidence >= this.config.confidenceThresholds.high) {
      breakdown.confidenceMultiplier = 1.3;
      breakdown.reasoning.push(`High confidence: ×${breakdown.confidenceMultiplier}`);
    } else if (confidence <= this.config.confidenceThresholds.low) {
      breakdown.confidenceMultiplier = 0.7;
      breakdown.reasoning.push(`Low confidence: ×${breakdown.confidenceMultiplier}`);
    }

    // 5. Historical success multiplier
    const componentSuccessRate = this.componentSuccessRates.get(component) || 0.5;
    breakdown.historicalMultiplier = 0.8 + (componentSuccessRate * 0.4); // 0.8x to 1.2x
    breakdown.reasoning.push(`Success rate ${(componentSuccessRate * 100).toFixed(0)}%: ×${breakdown.historicalMultiplier.toFixed(2)}`);

    // 6. Frequency bonus
    const frequency = error.frequency || 1;
    if (frequency > 1) {
      breakdown.frequencyBonus = Math.log(frequency) * this.config.frequencyBoostFactor * 100;
      breakdown.reasoning.push(`Frequency ${frequency}: +${breakdown.frequencyBonus.toFixed(1)}`);
    }

    // 7. Iteration-based adjustments
    const iteration = context.iterationNumber || 1;
    if (iteration > 5) {
      // Boost critical errors in later iterations
      if (severity === 'CRITICAL') {
        breakdown.iterationAdjustment = 20;
        breakdown.reasoning.push(`Late iteration critical boost: +${breakdown.iterationAdjustment}`);
      }
    }

    // 8. Business logic specific bonuses
    breakdown.businessLogicBonus = this.calculateBusinessLogicBonus(error);
    if (breakdown.businessLogicBonus > 0) {
      breakdown.reasoning.push(`Business logic bonus: +${breakdown.businessLogicBonus}`);
    }

    return breakdown;
  }

  /**
   * Calculate business logic specific priority bonuses
   */
  calculateBusinessLogicBonus(error) {
    let bonus = 0;

    // Character creation is critical for user onboarding
    if (error.component === 'character-creation') {
      if (error.message?.includes('Begin') || error.message?.includes('button')) {
        bonus += 50; // Critical UI flow
      }
      if (error.message?.includes('enabled') || error.message?.includes('disabled')) {
        bonus += 30; // User interaction blocking
      }
    }

    // Save system errors can cause data loss
    if (error.component === 'save-system') {
      if (error.type === 'runtime-error' || error.severity === 'CRITICAL') {
        bonus += 40; // Data integrity critical
      }
    }

    // Game initialization errors prevent game from starting
    if (error.component === 'game-init') {
      if (error.message?.includes('state') || error.message?.includes('initialization')) {
        bonus += 45; // Game must start to be playable
      }
    }

    // Performance errors in idle games are critical for long-term play
    if (error.component === 'performance') {
      if (error.message?.includes('memory') || error.message?.includes('leak')) {
        bonus += 25; // Important for idle games that run long periods
      }
    }

    return bonus;
  }

  /**
   * Apply dependency-based priority adjustments
   */
  applyDependencyAdjustments(errorScores, context) {
    // Build dependency relationships
    this.buildDependencyGraph(errorScores);

    // Adjust scores based on dependencies
    for (const item of errorScores) {
      const dependencies = this.getDependenciesForError(item.error);

      if (dependencies.length > 0) {
        // Boost errors that other errors depend on
        const dependencyBoost = dependencies.length * this.config.dependencyBoostFactor * 50;
        item.score += dependencyBoost;
        item.breakdown.reasoning.push(`Dependency boost (${dependencies.length} dependents): +${dependencyBoost.toFixed(1)}`);
      }

      // Check if this error might be caused by another error
      const causes = this.getPotentialCausesForError(item.error, errorScores);
      if (causes.length > 0) {
        // Slightly lower priority for errors that might be side effects
        const causeReduction = causes.length * 10;
        item.score = Math.max(0, item.score - causeReduction);
        item.breakdown.reasoning.push(`Potential side effect: -${causeReduction}`);
      }
    }

    return errorScores;
  }

  /**
   * Apply diversity filtering to avoid fixing too many similar errors
   */
  applyDiversityFiltering(errorScores, context) {
    const maxSimilarErrors = context.parallelFixes || 3;
    const diversified = [];
    const componentCounts = new Map();
    const typeCounts = new Map();

    for (const item of errorScores) {
      const component = item.error.component || 'unknown';
      const type = item.error.type || 'unknown';

      const componentCount = componentCounts.get(component) || 0;
      const typeCount = typeCounts.get(type) || 0;

      // Allow more critical errors to bypass diversity limits
      const isCritical = item.error.severity === 'CRITICAL';
      const componentLimit = isCritical ? maxSimilarErrors + 1 : Math.ceil(maxSimilarErrors / 2);
      const typeLimit = isCritical ? maxSimilarErrors + 1 : maxSimilarErrors;

      if (componentCount < componentLimit && typeCount < typeLimit) {
        diversified.push(item);
        componentCounts.set(component, componentCount + 1);
        typeCounts.set(type, typeCount + 1);
      } else {
        // Add to filtered list with lower priority for potential later processing
        item.score *= 0.3; // Significant priority reduction
        item.filtered = true;
        item.filterReason = `Diversity limit: ${component} (${componentCount}), ${type} (${typeCount})`;
      }
    }

    // Add some filtered errors back if we have space
    const filtered = errorScores.filter(item => item.filtered);
    const remainingSlots = Math.min(5, Math.max(0, (context.maxErrors || 20) - diversified.length));

    filtered.sort((a, b) => b.score - a.score);
    diversified.push(...filtered.slice(0, remainingSlots));

    return diversified;
  }

  /**
   * Build dependency graph between errors
   */
  buildDependencyGraph(errorScores) {
    this.errorDependencyGraph.clear();

    for (let i = 0; i < errorScores.length; i++) {
      const error1 = errorScores[i].error;
      const dependencies = [];

      for (let j = 0; j < errorScores.length; j++) {
        if (i === j) continue;

        const error2 = errorScores[j].error;

        // Check if error1 depends on error2 being fixed first
        if (this.hasDependencyRelationship(error1, error2)) {
          dependencies.push(error2.id || j);
        }
      }

      if (dependencies.length > 0) {
        this.errorDependencyGraph.set(error1.id || i, dependencies);
      }
    }
  }

  /**
   * Check if error1 has a dependency relationship with error2
   */
  hasDependencyRelationship(error1, error2) {
    // Same component dependencies
    if (error1.component === error2.component) {
      // Initialization errors should be fixed before functional errors
      if (error2.type === 'initialization-error' && error1.type === 'functional-error') {
        return true;
      }

      // Runtime errors often cause subsequent console errors
      if (error2.type === 'runtime-error' && error1.type === 'console-error') {
        return true;
      }
    }

    // Global initialization dependencies
    if (error2.component === 'game-init' && error1.component !== 'game-init') {
      return true; // Game must initialize before anything else works
    }

    // Character creation dependencies
    if (error2.component === 'character-creation' && error1.component === 'save-system') {
      // Save system errors might be caused by character creation issues
      if (error1.message?.includes('character') || error1.message?.includes('state')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get dependencies for a specific error
   */
  getDependenciesForError(error) {
    const errorId = error.id || error.type + error.component;
    return this.errorDependencyGraph.get(errorId) || [];
  }

  /**
   * Get potential causes for an error (errors that might be causing this one)
   */
  getPotentialCausesForError(error, allErrorScores) {
    const causes = [];

    for (const item of allErrorScores) {
      if (item.error === error) continue;

      if (this.hasDependencyRelationship(error, item.error)) {
        causes.push(item.error);
      }
    }

    return causes;
  }

  /**
   * Update component success rates based on historical data
   */
  updateComponentSuccessRates(previousResults) {
    for (const result of previousResults) {
      if (!result.error || !result.error.component) continue;

      const component = result.error.component;
      const currentRate = this.componentSuccessRates.get(component);

      if (currentRate === undefined) {
        // First result for this component
        this.componentSuccessRates.set(component, result.success ? 1.0 : 0.0);
      } else {
        // Exponential moving average with alpha = 0.3
        const alpha = 0.3;
        const newValue = result.success ? 1.0 : 0.0;
        const updatedRate = (alpha * newValue) + ((1 - alpha) * currentRate);
        this.componentSuccessRates.set(component, updatedRate);
      }
    }
  }

  /**
   * Record prioritization for analysis
   */
  recordPrioritization(prioritizedErrors, context) {
    const record = {
      timestamp: Date.now(),
      iteration: context.iterationNumber || 0,
      totalErrors: prioritizedErrors.length,
      topErrors: prioritizedErrors.slice(0, 5).map(item => ({
        type: item.error.type,
        component: item.error.component,
        severity: item.error.severity,
        score: item.score,
        reasoning: item.breakdown.reasoning.slice(0, 3) // Top 3 reasons
      })),
      componentDistribution: this.getComponentDistribution(prioritizedErrors),
      severityDistribution: this.getSeverityDistribution(prioritizedErrors)
    };

    this.prioritizationHistory.push(record);

    // Keep only last 20 prioritizations
    if (this.prioritizationHistory.length > 20) {
      this.prioritizationHistory.shift();
    }
  }

  /**
   * Get component distribution for analysis
   */
  getComponentDistribution(errors) {
    const distribution = {};
    for (const item of errors) {
      const component = item.error.component || 'unknown';
      distribution[component] = (distribution[component] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Get severity distribution for analysis
   */
  getSeverityDistribution(errors) {
    const distribution = {};
    for (const item of errors) {
      const severity = item.error.severity || 'MEDIUM';
      distribution[severity] = (distribution[severity] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Log prioritization results for debugging
   */
  logPrioritizationResults(topErrors) {
    console.log(`\n📊 Top ${Math.min(10, topErrors.length)} Prioritized Errors:`);
    console.log('─'.repeat(80));

    for (let i = 0; i < Math.min(10, topErrors.length); i++) {
      const item = topErrors[i];
      const error = item.error;

      console.log(`${i + 1}. [${error.severity}] ${error.type} (Score: ${item.score.toFixed(1)})`);
      console.log(`   Component: ${error.component || 'unknown'}`);
      console.log(`   Message: ${(error.message || '').substring(0, 60)}${error.message?.length > 60 ? '...' : ''}`);
      console.log(`   Top reasons: ${item.breakdown.reasoning.slice(0, 2).join(', ')}`);

      if (item.filtered) {
        console.log(`   ⚠️ Filtered: ${item.filterReason}`);
      }

      console.log('');
    }

    console.log('─'.repeat(80));
  }

  /**
   * Get prioritization statistics
   */
  getStatistics() {
    const recent = this.prioritizationHistory.slice(-5); // Last 5 prioritizations

    return {
      totalPrioritizations: this.prioritizationHistory.length,
      averageErrorsPerIteration: recent.length > 0 ?
        recent.reduce((sum, p) => sum + p.totalErrors, 0) / recent.length : 0,
      componentSuccessRates: Object.fromEntries(this.componentSuccessRates),
      mostCommonComponents: this.getMostCommonComponents(recent),
      severityTrends: this.getSeverityTrends(recent)
    };
  }

  /**
   * Get most common error components
   */
  getMostCommonComponents(prioritizations) {
    const componentCounts = {};

    for (const p of prioritizations) {
      for (const [component, count] of Object.entries(p.componentDistribution)) {
        componentCounts[component] = (componentCounts[component] || 0) + count;
      }
    }

    return Object.entries(componentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  /**
   * Get severity trends
   */
  getSeverityTrends(prioritizations) {
    return prioritizations.map(p => ({
      iteration: p.iteration,
      severities: p.severityDistribution
    }));
  }

  /**
   * Reset prioritizer state
   */
  reset() {
    this.prioritizationHistory = [];
    this.errorDependencyGraph.clear();
    this.componentSuccessRates.clear();
  }

  /**
   * Export prioritizer data for analysis
   */
  exportData() {
    return {
      config: this.config,
      history: this.prioritizationHistory,
      componentSuccessRates: Object.fromEntries(this.componentSuccessRates),
      dependencyGraph: Object.fromEntries(this.errorDependencyGraph)
    };
  }
}