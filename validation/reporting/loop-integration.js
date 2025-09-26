import { Reporter } from './reporter.js';
import { AnalyticsEngine } from './analytics-engine.js';
import { MetricsCollector } from './metrics-collector.js';
import { TrendAnalyzer } from './trend-analyzer.js';
import { ReportGenerator } from './report-generator.js';

/**
 * Loop Integration - Connects reporting system with the validation loop controller
 *
 * Provides seamless integration between the loop controller and all reporting
 * components, handling real-time data flow and event management.
 */
export class LoopIntegration {
  constructor(config = {}) {
    this.config = {
      enableReporter: config.enableReporter !== false,
      enableAnalytics: config.enableAnalytics !== false,
      enableMetrics: config.enableMetrics !== false,
      enableTrends: config.enableTrends !== false,
      enableReportGeneration: config.enableReportGeneration !== false,
      realTimeUpdates: config.realTimeUpdates !== false,
      ...config
    };

    this.loopController = null;
    this.components = {};
    this.eventHandlers = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize integration with loop controller
   */
  async initialize(loopController) {
    console.log('🔗 Initializing Loop Integration for Reporting & Analytics...');

    this.loopController = loopController;

    // Initialize reporting components
    await this.initializeComponents();

    // Set up event handlers
    this.setupEventHandlers();

    // Integrate with loop controller
    this.integrateWithLoopController();

    this.isInitialized = true;
    console.log('✅ Loop Integration initialized successfully');
  }

  /**
   * Initialize all reporting components
   */
  async initializeComponents() {
    const components = {};

    if (this.config.enableReporter) {
      components.reporter = new Reporter(this.config.reporter);
      await components.reporter.initialize();
    }

    if (this.config.enableAnalytics) {
      components.analytics = new AnalyticsEngine(this.config.analytics);
      await components.analytics.initialize();
    }

    if (this.config.enableMetrics) {
      components.metrics = new MetricsCollector(this.config.metrics);
      await components.metrics.initialize();
    }

    if (this.config.enableTrends) {
      components.trends = new TrendAnalyzer(this.config.trends);
      await components.trends.initialize();
    }

    if (this.config.enableReportGeneration) {
      components.reportGenerator = new ReportGenerator(this.config.reportGenerator);
      await components.reportGenerator.initialize();
    }

    this.components = components;
  }

  /**
   * Set up event handlers for component communication
   */
  setupEventHandlers() {
    // Reporter event handling
    if (this.components.reporter) {
      this.components.reporter.onUpdate((event) => {
        this.handleReporterEvent(event);
      });
    }

    // Cross-component event routing
    this.eventHandlers.set('iteration', this.handleIterationEvent.bind(this));
    this.eventHandlers.set('error', this.handleErrorEvent.bind(this));
    this.eventHandlers.set('fix', this.handleFixEvent.bind(this));
    this.eventHandlers.set('metrics', this.handleMetricsEvent.bind(this));
    this.eventHandlers.set('session-complete', this.handleSessionCompleteEvent.bind(this));
  }

  /**
   * Integrate with the loop controller by extending its functionality
   */
  integrateWithLoopController() {
    if (!this.loopController) return;

    // Store original methods
    const originalRunIteration = this.loopController.runIteration.bind(this.loopController);
    const originalRecordError = this.loopController.recordError || (() => {});
    const originalRecordFix = this.loopController.recordFixAttempt.bind(this.loopController);
    const originalGenerateFinalReport = this.loopController.generateFinalReport.bind(this.loopController);

    // Override runIteration to add reporting
    this.loopController.runIteration = async (...args) => {
      const iterationStartTime = Date.now();

      try {
        // Run original iteration
        const result = await originalRunIteration(...args);

        // Calculate iteration metrics
        const iterationData = {
          iteration: this.loopController.state.iteration,
          duration: Date.now() - iterationStartTime,
          errorsFound: this.loopController.state.totalErrors,
          fixesApplied: this.loopController.state.fixedErrors,
          fixesFailed: this.loopController.state.failedFixes,
          memoryUsage: process.memoryUsage(),
          stage: this.loopController.state.currentStage
        };

        // Report to all components
        this.reportIteration(iterationData);

        return result;
      } catch (error) {
        // Report iteration failure
        this.reportIterationFailure({
          iteration: this.loopController.state.iteration,
          duration: Date.now() - iterationStartTime,
          error: error.message,
          stack: error.stack
        });

        throw error;
      }
    };

    // Override error recording
    this.loopController.recordError = (error) => {
      const errorId = originalRecordError(error);
      this.reportError(error);
      return errorId;
    };

    // Override fix recording
    this.loopController.recordFixAttempt = (error, fix, success, reason) => {
      originalRecordFix(error, fix, success, reason);
      this.reportFix(error, fix, { success, reason });
    };

    // Override final report generation
    this.loopController.generateFinalReport = async (...args) => {
      const originalReport = await originalGenerateFinalReport(...args);

      // Generate enhanced reporting
      const enhancedReport = await this.generateEnhancedFinalReport(originalReport);

      return enhancedReport;
    };

    // Add metrics collection to the loop
    if (this.components.metrics) {
      this.components.metrics.startCollection();
    }

    console.log('🔄 Loop Controller integration completed');
  }

  /**
   * Report iteration completion to all components
   */
  reportIteration(iterationData) {
    if (this.components.reporter) {
      this.components.reporter.recordIteration(iterationData);
    }

    if (this.components.metrics) {
      this.components.metrics.recordIteration(iterationData);
    }

    this.emitEvent('iteration', iterationData);
  }

  /**
   * Report iteration failure
   */
  reportIterationFailure(failureData) {
    console.error('❌ Iteration failure reported:', failureData);

    if (this.components.reporter) {
      // Record as a special error event
      this.components.reporter.recordError({
        type: 'iteration-failure',
        severity: 'CRITICAL',
        message: failureData.error,
        component: 'loop-controller',
        timestamp: Date.now(),
        iteration: failureData.iteration
      });
    }

    this.emitEvent('iteration-failure', failureData);
  }

  /**
   * Report error to all components
   */
  reportError(error) {
    if (this.components.reporter) {
      this.components.reporter.recordError(error);
    }

    if (this.components.metrics) {
      this.components.metrics.recordError(error);
    }

    this.emitEvent('error', error);
  }

  /**
   * Report fix attempt to all components
   */
  reportFix(error, fix, result) {
    const fixData = {
      errorId: error.id,
      errorType: error.type,
      fix,
      result: result.success ? 'success' : 'failed',
      confidence: fix.confidence,
      duration: result.duration || 0,
      timestamp: Date.now()
    };

    if (this.components.reporter) {
      this.components.reporter.recordFix(error.id, fix, result);
    }

    if (this.components.metrics) {
      this.components.metrics.recordFix(fixData);
    }

    this.emitEvent('fix', fixData);
  }

  /**
   * Generate enhanced final report with all analytics
   */
  async generateEnhancedFinalReport(originalReport) {
    console.log('📊 Generating enhanced final report with analytics...');

    const enhancedReport = {
      ...originalReport,
      enhancedAnalytics: {},
      generatedReports: {}
    };

    try {
      // Get comprehensive session data
      const sessionData = await this.getSessionData();

      // Generate analytics if available
      if (this.components.analytics) {
        console.log('🧮 Running analytics analysis...');
        enhancedReport.enhancedAnalytics.detailed = await this.components.analytics.analyzeSession(sessionData);
      }

      // Generate trend analysis if available
      if (this.components.trends) {
        console.log('📈 Running trend analysis...');
        enhancedReport.enhancedAnalytics.trends = await this.components.trends.analyzeSessionTrends(sessionData);
      }

      // Generate final comprehensive report
      if (this.components.reporter) {
        console.log('📄 Generating comprehensive report...');
        const finalReport = await this.components.reporter.generateReport({
          ...enhancedReport,
          recommendations: this.generateFinalRecommendations(enhancedReport)
        });
        enhancedReport.comprehensiveReport = finalReport;
      }

      // Generate reports in multiple formats
      if (this.components.reportGenerator) {
        console.log('📋 Generating multi-format reports...');
        const reportData = {
          session: sessionData.session,
          summary: sessionData.summary,
          metrics: sessionData.metrics,
          analysis: enhancedReport.enhancedAnalytics.detailed?.analysis || {},
          trends: enhancedReport.enhancedAnalytics.trends || {},
          timestamp: Date.now()
        };

        enhancedReport.generatedReports = await this.components.reportGenerator.generateReports(
          reportData,
          { formats: ['html', 'json', 'markdown'] }
        );
      }

      // Stop metrics collection
      if (this.components.metrics) {
        await this.components.metrics.stopCollection();
      }

      console.log('✅ Enhanced final report generation completed');

    } catch (error) {
      console.error('❌ Error generating enhanced report:', error.message);
      enhancedReport.enhancementError = error.message;
    }

    return enhancedReport;
  }

  /**
   * Get comprehensive session data from all components
   */
  async getSessionData() {
    const sessionData = {
      session: {
        id: this.loopController.generateSessionId(),
        startTime: this.loopController.state.startTime,
        endTime: this.loopController.state.endTime || Date.now(),
        status: this.loopController.state.status,
        iterations: this.loopController.iterationResults || [],
        errors: this.loopController.errorHistory || [],
        fixes: this.loopController.fixHistory || []
      },
      summary: this.generateSessionSummary(),
      metrics: this.generateSessionMetrics()
    };

    return sessionData;
  }

  /**
   * Generate session summary
   */
  generateSessionSummary() {
    const state = this.loopController.state;
    const duration = (state.endTime || Date.now()) - state.startTime;

    return {
      sessionId: this.loopController.generateSessionId(),
      duration: this.formatDuration(duration),
      iterations: state.iteration,
      totalErrors: state.totalErrors,
      fixedErrors: state.fixedErrors,
      remainingErrors: state.totalErrors - state.fixedErrors,
      fixAttempts: state.fixedErrors + state.failedFixes,
      successfulFixes: state.fixedErrors,
      failedFixes: state.failedFixes,
      fixSuccessRate: state.fixedErrors + state.failedFixes > 0
        ? ((state.fixedErrors / (state.fixedErrors + state.failedFixes)) * 100).toFixed(1)
        : '0',
      startTime: new Date(state.startTime).toISOString(),
      endTime: new Date(state.endTime || Date.now()).toISOString()
    };
  }

  /**
   * Generate session metrics
   */
  generateSessionMetrics() {
    const iterations = this.loopController.iterationResults || [];

    const metrics = {
      totalIterations: iterations.length,
      avgIterationTime: iterations.length > 0
        ? iterations.reduce((sum, i) => sum + (i.duration || 0), 0) / iterations.length
        : 0,
      totalDuration: (this.loopController.state.endTime || Date.now()) - this.loopController.state.startTime,
      errorTrend: this.calculateErrorTrend(),
      convergenceRate: this.calculateConvergenceRate()
    };

    // Add metrics from metrics collector if available
    if (this.components.metrics) {
      const currentMetrics = this.components.metrics.getCurrentMetrics();
      Object.assign(metrics, currentMetrics);
    }

    return metrics;
  }

  /**
   * Generate final recommendations based on all analysis
   */
  generateFinalRecommendations(enhancedReport) {
    const recommendations = [];

    // Add recommendations from analytics
    if (enhancedReport.enhancedAnalytics?.detailed?.insights) {
      enhancedReport.enhancedAnalytics.detailed.insights.forEach(insight => {
        recommendations.push({
          priority: insight.priority,
          category: insight.category,
          message: insight.recommendation,
          source: 'analytics-engine'
        });
      });
    }

    // Add recommendations from trend analysis
    if (enhancedReport.enhancedAnalytics?.trends?.recommendations) {
      enhancedReport.enhancedAnalytics.trends.recommendations.forEach(rec => {
        recommendations.push({
          priority: 'medium',
          category: 'trends',
          message: rec,
          source: 'trend-analyzer'
        });
      });
    }

    // Add general recommendations based on session performance
    const sessionSummary = this.generateSessionSummary();
    const fixSuccessRate = parseFloat(sessionSummary.fixSuccessRate);

    if (fixSuccessRate < 70) {
      recommendations.push({
        priority: 'high',
        category: 'fix-quality',
        message: 'Fix success rate is below 70%. Consider reviewing fix generation algorithms.',
        source: 'loop-integration'
      });
    }

    if (sessionSummary.iterations < 3 && sessionSummary.remainingErrors > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'convergence',
        message: 'Session ended with remaining errors. Consider increasing max iterations.',
        source: 'loop-integration'
      });
    }

    return recommendations;
  }

  /**
   * Event handling methods
   */

  handleReporterEvent(event) {
    // Forward reporter events to other components if needed
    if (event.type === 'metrics' && this.components.metrics) {
      // Sync metrics between reporter and metrics collector
    }
  }

  handleIterationEvent(data) {
    console.log(`📍 Iteration ${data.iteration} completed: ${data.errorsFound} errors, ${data.fixesApplied} fixes`);
  }

  handleErrorEvent(data) {
    console.log(`⚠️ Error detected: ${data.type} (${data.severity})`);
  }

  handleFixEvent(data) {
    console.log(`🔧 Fix ${data.result}: ${data.errorType} (confidence: ${data.confidence}%)`);
  }

  handleMetricsEvent(data) {
    // Handle metrics updates
    if (this.config.realTimeUpdates) {
      // In a real implementation, this would push to WebSocket clients
      console.log('📊 Metrics updated:', data);
    }
  }

  handleSessionCompleteEvent(data) {
    console.log('🎯 Session completed:', data);
  }

  /**
   * Utility methods
   */

  emitEvent(eventType, data) {
    const handler = this.eventHandlers.get(eventType);
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        console.warn(`⚠️ Error in event handler for ${eventType}:`, error.message);
      }
    }
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

  calculateErrorTrend() {
    const iterations = this.loopController.iterationResults || [];
    if (iterations.length < 2) return 'insufficient-data';

    const errorCounts = iterations.map(i => i.errors?.length || 0);
    const firstHalf = errorCounts.slice(0, Math.floor(errorCounts.length / 2));
    const secondHalf = errorCounts.slice(Math.floor(errorCounts.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg < firstAvg * 0.8) return 'improving';
    if (secondAvg > firstAvg * 1.2) return 'worsening';
    return 'stable';
  }

  calculateConvergenceRate() {
    const errorHistory = this.loopController.errorHistory || [];
    if (errorHistory.length < 2) return '0';

    const errorCounts = errorHistory.map(h => h.totalErrors);
    const reductions = [];

    for (let i = 1; i < errorCounts.length; i++) {
      if (errorCounts[i - 1] > 0) {
        const reduction = (errorCounts[i - 1] - errorCounts[i]) / errorCounts[i - 1];
        reductions.push(reduction);
      }
    }

    return reductions.length > 0
      ? (reductions.reduce((a, b) => a + b, 0) / reductions.length * 100).toFixed(1)
      : '0';
  }

  /**
   * Public methods for external integration
   */

  async exportSessionData(format = 'json') {
    const sessionData = await this.getSessionData();

    if (this.components.reportGenerator) {
      return await this.components.reportGenerator.generateReport(sessionData, format);
    }

    // Fallback JSON export
    return JSON.stringify(sessionData, null, 2);
  }

  getCurrentMetrics() {
    if (this.components.metrics) {
      return this.components.metrics.getCurrentMetrics();
    }

    return this.generateSessionMetrics();
  }

  getRealtimeStatus() {
    return {
      connected: this.isInitialized,
      sessionId: this.loopController?.generateSessionId(),
      currentIteration: this.loopController?.state?.iteration || 0,
      totalErrors: this.loopController?.state?.totalErrors || 0,
      fixedErrors: this.loopController?.state?.fixedErrors || 0,
      status: this.loopController?.state?.status || 'idle'
    };
  }

  /**
   * Cleanup method
   */
  async cleanup() {
    console.log('🧹 Cleaning up Loop Integration...');

    // Stop metrics collection
    if (this.components.metrics) {
      await this.components.metrics.stopCollection();
    }

    // Clear event handlers
    this.eventHandlers.clear();

    console.log('✅ Loop Integration cleanup completed');
  }
}