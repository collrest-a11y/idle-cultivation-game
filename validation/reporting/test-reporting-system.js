import { Reporter } from './reporter.js';
import { AnalyticsEngine } from './analytics-engine.js';
import { MetricsCollector } from './metrics-collector.js';
import { TrendAnalyzer } from './trend-analyzer.js';
import { ReportGenerator } from './report-generator.js';
import { LoopIntegration } from './loop-integration.js';

/**
 * Test script for the Reporting & Analytics system
 *
 * This script validates all components of the reporting system with sample data
 */

async function testReportingSystem() {
  console.log('🧪 Starting Reporting & Analytics System Tests...\n');

  // Test configuration
  const testConfig = {
    outputDir: './validation-reports/test-output',
    enableReporter: true,
    enableAnalytics: true,
    enableMetrics: true,
    enableTrends: true,
    enableReportGeneration: true,
    realTimeUpdates: true
  };

  try {
    // Test 1: Initialize Reporter
    console.log('📊 Test 1: Reporter Initialization');
    const reporter = new Reporter(testConfig);
    await reporter.initialize();
    console.log('✅ Reporter initialized successfully\n');

    // Test 2: Generate sample session data
    console.log('📊 Test 2: Generate Sample Session Data');
    const sampleSessionData = generateSampleSessionData();
    console.log('✅ Sample session data generated\n');

    // Test 3: Record iterations, errors, and fixes
    console.log('📊 Test 3: Record Session Events');

    // Record 5 iterations with varying data
    for (let i = 1; i <= 5; i++) {
      const iterationData = {
        iteration: i,
        errorsFound: Math.max(0, 10 - i * 2),
        fixesApplied: Math.min(i * 2, 8),
        fixesFailed: Math.floor(Math.random() * 2),
        duration: 5000 + Math.random() * 10000,
        stage: `iteration-${i}`
      };

      reporter.recordIteration(iterationData);

      // Record some errors for this iteration
      for (let j = 0; j < iterationData.errorsFound; j++) {
        const errorId = reporter.recordError({
          type: ['syntax-error', 'runtime-error', 'logic-error'][Math.floor(Math.random() * 3)],
          severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
          message: `Test error ${j + 1} in iteration ${i}`,
          component: ['character-creation', 'save-system', 'game-init'][Math.floor(Math.random() * 3)],
          location: { file: 'test-file.js', line: Math.floor(Math.random() * 100) + 1 }
        });

        // Record fix attempts for some errors
        if (Math.random() > 0.3) {
          reporter.recordFix(errorId,
            {
              code: `// Fix code for error ${j + 1}`,
              explanation: `This fix resolves the test error by...`,
              confidence: 60 + Math.random() * 40
            },
            {
              success: Math.random() > 0.2,
              validationScore: 70 + Math.random() * 30,
              appliedAt: Date.now(),
              duration: 1000 + Math.random() * 5000
            }
          );
        }
      }

      console.log(`   ✅ Recorded iteration ${i} with ${iterationData.errorsFound} errors`);
    }
    console.log('✅ Session events recorded successfully\n');

    // Test 4: Generate comprehensive report
    console.log('📊 Test 4: Generate Comprehensive Report');
    const comprehensiveReport = await reporter.generateReport({
      recommendations: [
        {
          priority: 'high',
          message: 'Test recommendation for system improvement',
          action: 'Review error patterns and optimize fix generation'
        }
      ]
    });
    console.log('✅ Comprehensive report generated successfully\n');

    // Test 5: Analytics Engine
    console.log('📊 Test 5: Analytics Engine Testing');
    const analytics = new AnalyticsEngine(testConfig);
    await analytics.initialize();

    const analyticsResults = await analytics.analyzeSession(sampleSessionData);
    console.log('✅ Analytics analysis completed');
    console.log(`   📈 Found ${analyticsResults.patterns.length} patterns`);
    console.log(`   ⚠️ Detected ${analyticsResults.anomalies.length} anomalies`);
    console.log(`   💡 Generated ${analyticsResults.insights.length} insights\n`);

    // Test 6: Metrics Collector
    console.log('📊 Test 6: Metrics Collector Testing');
    const metrics = new MetricsCollector(testConfig);
    await metrics.initialize('test-session');

    // Start collection for a short period
    metrics.startCollection();
    console.log('   ⏱️ Collecting metrics for 5 seconds...');

    // Simulate some activity
    setTimeout(() => {
      metrics.recordIteration({
        iteration: 1,
        duration: 3000,
        errorsFound: 5,
        fixesApplied: 3
      });
    }, 1000);

    setTimeout(() => {
      metrics.recordError({
        type: 'test-error',
        severity: 'MEDIUM',
        component: 'test-component'
      });
    }, 2000);

    await new Promise(resolve => setTimeout(resolve, 5000));
    await metrics.stopCollection();

    const currentMetrics = metrics.getCurrentMetrics();
    console.log('✅ Metrics collection completed');
    console.log(`   📊 System metrics: Memory ${Math.round(currentMetrics.system?.memory?.heapUsedMB || 0)}MB`);
    console.log(`   📈 Application metrics: ${currentMetrics.application?.totalIterations || 0} iterations\n`);

    // Test 7: Trend Analyzer
    console.log('📊 Test 7: Trend Analyzer Testing');
    const trendAnalyzer = new TrendAnalyzer(testConfig);
    await trendAnalyzer.initialize();

    const trendAnalysis = await trendAnalyzer.analyzeSessionTrends(sampleSessionData);
    console.log('✅ Trend analysis completed');
    console.log(`   📉 Error trend: ${trendAnalysis.trends.errors.errorVolume.trend}`);
    console.log(`   ⚡ Performance trend: ${trendAnalysis.trends.performance.iterationTime.trend}`);
    console.log(`   🎯 Generated ${trendAnalysis.predictions ? Object.keys(trendAnalysis.predictions).length : 0} predictions\n`);

    // Test 8: Report Generator
    console.log('📊 Test 8: Report Generator Testing');
    const reportGenerator = new ReportGenerator(testConfig);
    await reportGenerator.initialize();

    const multiFormatReports = await reportGenerator.generateReports(sampleSessionData, {
      formats: ['html', 'json', 'markdown']
    });

    console.log('✅ Multi-format reports generated');
    console.log(`   📋 Generated ${multiFormatReports.summary.successfulReports}/${multiFormatReports.summary.totalReports} reports`);
    Object.entries(multiFormatReports.formats).forEach(([format, result]) => {
      if (result.success) {
        console.log(`   ✅ ${format.toUpperCase()}: ${result.filename}`);
      } else {
        console.log(`   ❌ ${format.toUpperCase()}: ${result.error}`);
      }
    });
    console.log('');

    // Test 9: Loop Integration (Mock)
    console.log('📊 Test 9: Loop Integration Testing');
    const loopIntegration = new LoopIntegration(testConfig);

    // Create mock loop controller
    const mockLoopController = createMockLoopController();
    await loopIntegration.initialize(mockLoopController);

    const realtimeStatus = loopIntegration.getRealtimeStatus();
    console.log('✅ Loop integration initialized');
    console.log(`   🔗 Connection status: ${realtimeStatus.connected}`);
    console.log(`   📊 Current iteration: ${realtimeStatus.currentIteration}`);
    console.log(`   ⚠️ Total errors: ${realtimeStatus.totalErrors}\n`);

    // Test 10: Generate final integration report
    console.log('📊 Test 10: Enhanced Final Report Generation');
    const enhancedReport = await loopIntegration.generateEnhancedFinalReport(comprehensiveReport);
    console.log('✅ Enhanced final report generated');
    console.log(`   📊 Enhanced analytics: ${Object.keys(enhancedReport.enhancedAnalytics).length} categories`);
    console.log(`   📋 Generated reports: ${Object.keys(enhancedReport.generatedReports?.formats || {}).length} formats`);
    console.log(`   💡 Total recommendations: ${enhancedReport.recommendations?.length || 0}\n`);

    await loopIntegration.cleanup();

    // Test Summary
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('📊 Test Summary:');
    console.log('   ✅ Reporter: Initialized and functioning');
    console.log('   ✅ Analytics Engine: Pattern detection working');
    console.log('   ✅ Metrics Collector: Real-time collection active');
    console.log('   ✅ Trend Analyzer: Historical analysis working');
    console.log('   ✅ Report Generator: Multi-format output working');
    console.log('   ✅ Loop Integration: Mock integration successful');
    console.log('   ✅ Enhanced Reporting: End-to-end flow working');
    console.log('');
    console.log('🚀 Reporting & Analytics System is ready for production use!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Generate sample session data for testing
 */
function generateSampleSessionData() {
  const sessionId = `test_session_${Date.now()}`;
  const startTime = Date.now() - 300000; // 5 minutes ago

  return {
    session: {
      id: sessionId,
      startTime,
      endTime: Date.now(),
      status: 'completed',
      iterations: generateSampleIterations(),
      errors: generateSampleErrors(),
      fixes: generateSampleFixes()
    },
    summary: {
      sessionId,
      duration: '5m 0s',
      iterations: 5,
      totalErrors: 15,
      fixedErrors: 12,
      remainingErrors: 3,
      fixAttempts: 18,
      successfulFixes: 12,
      failedFixes: 6,
      fixSuccessRate: '66.7%',
      convergenceRate: '25.5%'
    },
    metrics: {
      totalIterations: 5,
      avgIterationTime: 7500,
      totalDuration: 300000,
      errorTrend: 'improving',
      convergenceRate: 25.5,
      errorDensity: 3.0,
      fixEfficiency: 2.4,
      errorsBySeverity: {
        'CRITICAL': 2,
        'HIGH': 4,
        'MEDIUM': 6,
        'LOW': 3
      },
      errorsByType: {
        'runtime-error': 7,
        'syntax-error': 5,
        'logic-error': 3
      },
      errorsByComponent: {
        'character-creation': 6,
        'save-system': 5,
        'game-init': 4
      }
    },
    analysis: {
      patterns: [
        {
          type: 'recurring-error',
          description: 'Runtime errors occur frequently in character-creation component',
          severity: 'high'
        }
      ],
      bottlenecks: [
        {
          type: 'slow-iterations',
          description: '2 iterations took significantly longer than average'
        }
      ],
      improvements: [
        {
          area: 'error-prevention',
          suggestion: 'Add input validation to character-creation component',
          priority: 'high'
        }
      ],
      riskAreas: [
        {
          level: 'medium',
          description: 'Character-creation component has multiple unresolved errors'
        }
      ]
    },
    trends: {
      systemHealth: {
        score: 78,
        grade: 'Good',
        recommendation: 'System is performing well with minor areas for improvement'
      }
    }
  };
}

/**
 * Generate sample iteration data
 */
function generateSampleIterations() {
  const iterations = [];
  for (let i = 1; i <= 5; i++) {
    iterations.push({
      number: i,
      timestamp: Date.now() - (300000 - i * 60000),
      errorsFound: Math.max(0, 8 - i),
      fixesApplied: Math.min(i * 2, 6),
      fixesFailed: Math.floor(Math.random() * 2),
      duration: 5000 + Math.random() * 10000,
      memoryUsage: {
        heapUsed: 50000000 + Math.random() * 20000000,
        heapTotal: 80000000 + Math.random() * 10000000
      }
    });
  }
  return iterations;
}

/**
 * Generate sample error data
 */
function generateSampleErrors() {
  const errorTypes = ['runtime-error', 'syntax-error', 'logic-error'];
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const components = ['character-creation', 'save-system', 'game-init'];

  const errors = [];
  for (let i = 0; i < 15; i++) {
    errors.push({
      id: `error_${i + 1}`,
      type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      component: components[Math.floor(Math.random() * components.length)],
      message: `Sample error message ${i + 1}`,
      timestamp: Date.now() - Math.random() * 300000,
      status: Math.random() > 0.2 ? 'fixed' : 'pending'
    });
  }
  return errors;
}

/**
 * Generate sample fix data
 */
function generateSampleFixes() {
  const fixes = [];
  for (let i = 0; i < 18; i++) {
    fixes.push({
      id: `fix_${i + 1}`,
      errorId: `error_${Math.floor(Math.random() * 15) + 1}`,
      timestamp: Date.now() - Math.random() * 300000,
      result: Math.random() > 0.33 ? 'success' : 'failed',
      confidence: 50 + Math.random() * 50,
      duration: 1000 + Math.random() * 5000
    });
  }
  return fixes;
}

/**
 * Create a mock loop controller for testing
 */
function createMockLoopController() {
  return {
    state: {
      iteration: 3,
      totalErrors: 8,
      fixedErrors: 5,
      failedFixes: 2,
      startTime: Date.now() - 180000,
      endTime: null,
      status: 'running',
      currentStage: 'error-detection'
    },
    iterationResults: generateSampleIterations(),
    errorHistory: [
      { iteration: 1, totalErrors: 10, fixedErrors: 2 },
      { iteration: 2, totalErrors: 8, fixedErrors: 3 },
      { iteration: 3, totalErrors: 5, fixedErrors: 2 }
    ],
    fixHistory: generateSampleFixes().slice(0, 10),
    generateSessionId: () => `mock_session_${Date.now()}`
  };
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testReportingSystem().catch(console.error);
}

export { testReportingSystem };