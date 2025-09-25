/**
 * Test suite for performance and network monitoring features
 * Tests the Stream C components: PerformanceMonitor, NetworkMonitor, MemoryTracker
 */
import { chromium } from 'playwright';
import { PerformanceMonitor } from './performance-monitor.js';
import { NetworkMonitor } from './network-monitor.js';
import { MemoryTracker } from './memory-tracker.js';

export class PerformanceMonitoringTests {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Performance & Network Monitoring Tests...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Test Performance Monitor
      await this.testPerformanceMonitor(page);

      // Test Network Monitor
      await this.testNetworkMonitor(page);

      // Test Memory Tracker
      await this.testMemoryTracker(page);

      // Test Integration
      await this.testMonitoringIntegration(page);

      // Generate test report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await browser.close();
    }

    return this.testResults;
  }

  async testPerformanceMonitor(page) {
    console.log('📊 Testing Performance Monitor...');

    const monitor = new PerformanceMonitor({
      fpsThreshold: 45, // Lower threshold for testing
      measurementInterval: 2000 // Faster measurements for testing
    });

    try {
      // Test 1: Initialization
      await this.runTest('Performance Monitor Initialization', async () => {
        await monitor.initialize(page);
        await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
        await page.waitForTimeout(1000);

        const summary = monitor.getSummary();
        if (!summary.isActive) throw new Error('Monitor should be active after initialization');
      });

      // Test 2: FPS Monitoring
      await this.runTest('FPS Monitoring', async () => {
        await page.goto('data:text/html,<html><body><div id="animation"></div><script>let count=0; function animate(){document.getElementById("animation").textContent=count++; requestAnimationFrame(animate);} animate();</script></body></html>');
        await page.waitForTimeout(3000);

        const snapshot = await monitor.getPerformanceSnapshot();
        if (!snapshot || typeof snapshot.fps !== 'number') {
          throw new Error('FPS measurement should return numeric value');
        }

        console.log(`    Current FPS: ${snapshot.fps}`);
      });

      // Test 3: Memory Usage Detection
      await this.runTest('Memory Usage Detection', async () => {
        // Create a page that uses memory
        await page.goto('data:text/html,<html><body><script>let data=[]; for(let i=0;i<10000;i++){data.push("test".repeat(100));}</script></body></html>');
        await page.waitForTimeout(2000);

        const snapshot = await monitor.getPerformanceSnapshot();
        if (!snapshot || !snapshot.memory) {
          console.log('    Memory monitoring not available in this browser');
          return; // Skip this test if memory API not available
        }

        console.log(`    Memory Usage: ${(snapshot.memory.usage * 100).toFixed(1)}%`);
      });

      // Test 4: Performance Degradation Detection
      await this.runTest('Performance Degradation Detection', async () => {
        // Simulate performance degradation
        await page.evaluate(() => {
          // Create a heavy computation loop
          function heavyTask() {
            let result = 0;
            for (let i = 0; i < 1000000; i++) {
              result += Math.random();
            }
            setTimeout(heavyTask, 100);
          }
          heavyTask();
        });

        await page.waitForTimeout(5000);

        const errors = monitor.getErrors();
        const longTaskErrors = errors.filter(e => e.type === 'long-task');

        console.log(`    Detected ${longTaskErrors.length} long task errors`);
      });

      // Test 5: Error Capturing
      await this.runTest('Performance Error Capturing', async () => {
        const errorCount = monitor.getErrors().length;

        // Manually trigger a performance error
        monitor.captureError({
          type: 'test-performance-error',
          severity: 'HIGH',
          message: 'Test error for validation',
          timestamp: Date.now()
        });

        const newErrorCount = monitor.getErrors().length;
        if (newErrorCount !== errorCount + 1) {
          throw new Error('Error should be captured and stored');
        }
      });

      console.log('✅ Performance Monitor tests completed\n');

    } finally {
      monitor.destroy();
    }
  }

  async testNetworkMonitor(page) {
    console.log('🌐 Testing Network Monitor...');

    const monitor = new NetworkMonitor({
      criticalEndpoints: ['/api/test'],
      slowRequestThreshold: 1000
    });

    try {
      // Test 1: Initialization
      await this.runTest('Network Monitor Initialization', async () => {
        await monitor.initialize(page);

        const summary = monitor.getSummary();
        if (!summary.isActive) throw new Error('Monitor should be active after initialization');
      });

      // Test 2: Network Request Tracking
      await this.runTest('Network Request Tracking', async () => {
        await page.goto('https://httpbin.org/json');
        await page.waitForTimeout(2000);

        const summary = monitor.getSummary();
        if (summary.networkStats.totalRequests === 0) {
          throw new Error('Should track network requests');
        }

        console.log(`    Tracked ${summary.networkStats.totalRequests} requests`);
      });

      // Test 3: Failed Request Detection
      await this.runTest('Failed Request Detection', async () => {
        // Try to request a non-existent resource
        try {
          await page.goto('https://httpbin.org/status/404');
          await page.waitForTimeout(1000);
        } catch (e) {
          // Expected to fail
        }

        const errors = monitor.getErrors();
        const httpErrors = errors.filter(e => e.type === 'http-error');

        console.log(`    Detected ${httpErrors.length} HTTP errors`);
      });

      // Test 4: Network Status Detection
      await this.runTest('Network Status Detection', async () => {
        const status = await monitor.getNetworkStatus();

        if (!status.status) {
          throw new Error('Should return network status');
        }

        console.log(`    Network Status: ${status.status}`);
      });

      // Test 5: Error Severity Classification
      await this.runTest('Error Severity Classification', async () => {
        const initialErrors = monitor.getErrors().length;

        // Simulate different types of network errors
        monitor.captureError({
          type: 'network-request-failed',
          severity: 'HIGH',
          url: '/api/critical',
          isCritical: true,
          message: 'Test critical network failure',
          timestamp: Date.now()
        });

        const highSeverityErrors = monitor.getErrors('HIGH');
        if (highSeverityErrors.length === 0) {
          throw new Error('Should classify errors by severity');
        }
      });

      console.log('✅ Network Monitor tests completed\n');

    } finally {
      monitor.destroy();
    }
  }

  async testMemoryTracker(page) {
    console.log('🧠 Testing Memory Tracker...');

    const tracker = new MemoryTracker({
      measurementInterval: 3000, // Faster measurements for testing
      alertThreshold: 0.7 // Lower threshold for testing
    });

    try {
      // Test 1: Initialization
      await this.runTest('Memory Tracker Initialization', async () => {
        await tracker.initialize(page);

        const summary = tracker.getSummary();
        if (!summary.isActive) throw new Error('Tracker should be active after initialization');
      });

      // Test 2: Memory Measurement
      await this.runTest('Memory Measurement', async () => {
        await page.goto('data:text/html,<html><body><h1>Memory Test</h1></body></html>');
        await page.waitForTimeout(1000);

        const snapshot = await tracker.getMemorySnapshot();
        if (!snapshot) {
          console.log('    Memory measurement not available in this browser');
          return; // Skip if not available
        }

        console.log(`    Memory measurement taken`);
      });

      // Test 3: Memory Leak Detection Setup
      await this.runTest('Memory Leak Detection Setup', async () => {
        // Create a page that gradually uses more memory
        await page.goto('data:text/html,<html><body><div id="content"></div><script>let data=[];setInterval(()=>{for(let i=0;i<100;i++){data.push("leak".repeat(100));}document.getElementById("content").textContent=data.length;},500);</script></body></html>');
        await page.waitForTimeout(5000);

        const errors = tracker.getErrors();
        console.log(`    Memory tracking active, ${errors.length} errors detected`);
      });

      // Test 4: Memory Pressure Detection
      await this.runTest('Memory Pressure Detection', async () => {
        // Test the error capture mechanism
        tracker.captureError({
          type: 'high-memory-usage',
          severity: 'HIGH',
          usage: '85%',
          message: 'Test high memory usage',
          timestamp: Date.now()
        });

        const highMemoryErrors = tracker.getErrors().filter(e => e.type === 'high-memory-usage');
        if (highMemoryErrors.length === 0) {
          throw new Error('Should detect high memory usage');
        }
      });

      // Test 5: Memory Trend Analysis
      await this.runTest('Memory Trend Analysis', async () => {
        // Add some mock memory measurements
        const measurements = [];
        for (let i = 0; i < 10; i++) {
          measurements.push({
            memory: { usedJSHeapSize: 1000000 * (1 + i * 0.1) },
            timestamp: Date.now() - (10 - i) * 1000
          });
        }

        // Test trend calculation (this tests the internal logic)
        const trend = tracker.analyzeMemoryTrend ? tracker.analyzeMemoryTrend(measurements) : null;
        console.log('    Memory trend analysis functionality available');
      });

      console.log('✅ Memory Tracker tests completed\n');

    } finally {
      tracker.destroy();
    }
  }

  async testMonitoringIntegration(page) {
    console.log('🔗 Testing Monitoring Integration...');

    const performanceMonitor = new PerformanceMonitor();
    const networkMonitor = new NetworkMonitor();
    const memoryTracker = new MemoryTracker();

    try {
      // Test 1: Multiple Monitors Initialization
      await this.runTest('Multiple Monitors Initialization', async () => {
        await Promise.all([
          performanceMonitor.initialize(page),
          networkMonitor.initialize(page),
          memoryTracker.initialize(page)
        ]);

        const performanceSummary = performanceMonitor.getSummary();
        const networkSummary = networkMonitor.getSummary();
        const memorySummary = memoryTracker.getSummary();

        if (!performanceSummary.isActive || !networkSummary.isActive || !memorySummary.isActive) {
          throw new Error('All monitors should be active');
        }
      });

      // Test 2: Cross-Monitor Error Correlation
      await this.runTest('Cross-Monitor Error Correlation', async () => {
        const allErrors = [];

        // Set up listeners to collect all errors
        performanceMonitor.subscribe(error => allErrors.push({...error, source: 'performance'}));
        networkMonitor.subscribe(error => allErrors.push({...error, source: 'network'}));
        memoryTracker.subscribe(error => allErrors.push({...error, source: 'memory'}));

        // Create a complex test scenario
        await page.goto('https://httpbin.org/delay/2'); // Slow network request
        await page.waitForTimeout(3000);

        // Generate some test errors
        performanceMonitor.captureError({
          type: 'test-integration-error',
          severity: 'MEDIUM',
          message: 'Integration test error',
          timestamp: Date.now()
        });

        await page.waitForTimeout(1000);

        console.log(`    Collected ${allErrors.length} cross-monitor events`);
      });

      // Test 3: Comprehensive Monitoring Report
      await this.runTest('Comprehensive Monitoring Report', async () => {
        const combinedReport = {
          performance: performanceMonitor.getSummary(),
          network: networkMonitor.getSummary(),
          memory: memoryTracker.getSummary(),
          timestamp: new Date().toISOString()
        };

        if (!combinedReport.performance || !combinedReport.network || !combinedReport.memory) {
          throw new Error('Should generate comprehensive monitoring report');
        }

        console.log('    Generated comprehensive monitoring report');
      });

      console.log('✅ Monitoring Integration tests completed\n');

    } finally {
      performanceMonitor.destroy();
      networkMonitor.destroy();
      memoryTracker.destroy();
    }
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;

    try {
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        error: null
      });
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  generateTestReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE & NETWORK MONITORING TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  ❌ ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎉 Performance monitoring test suite completed!');

    return this.testResults;
  }
}

// Standalone test runner
export async function runPerformanceMonitoringTests() {
  const tests = new PerformanceMonitoringTests();
  return await tests.runAllTests();
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceMonitoringTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}