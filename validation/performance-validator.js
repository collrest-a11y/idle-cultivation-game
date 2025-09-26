import { chromium } from 'playwright';
import { PerformanceObserver, performance } from 'perf_hooks';

/**
 * PerformanceValidator - Measures performance impact of fixes
 *
 * This class provides comprehensive performance validation to ensure
 * fixes don't negatively impact application performance.
 */
export class PerformanceValidator {
  constructor(options = {}) {
    this.thresholds = {
      loadTime: options.maxLoadTime || 5000,        // 5 seconds
      memoryLimit: options.maxMemoryMB || 150,     // 150 MB
      minFPS: options.minFPS || 30,                // 30 FPS
      maxCPUTime: options.maxCPUTime || 1000,      // 1 second
      maxNetworkTime: options.maxNetworkTime || 2000, // 2 seconds
      ...options.thresholds
    };

    this.samples = options.samples || 3;
    this.warmupTime = options.warmupTime || 2000;
    this.measurementTime = options.measurementTime || 5000;
    this.serverPort = options.serverPort || 8083;
  }

  /**
   * Validates performance impact of fixes
   * @param {Object} sandbox - Sandbox environment to test
   * @param {Object} baseline - Optional baseline metrics to compare against
   * @returns {Object} Performance validation results
   */
  async validatePerformance(sandbox, baseline = null) {
    console.log('Starting performance validation...');

    const results = {
      timestamp: new Date().toISOString(),
      samples: [],
      aggregate: null,
      baseline,
      comparison: null,
      passed: false,
      issues: [],
      recommendations: []
    };

    try {
      // Run multiple samples for accuracy
      for (let i = 0; i < this.samples; i++) {
        console.log(`Running performance sample ${i + 1}/${this.samples}`);
        const sample = await this.runPerformanceSample(sandbox, i);
        results.samples.push(sample);
      }

      // Calculate aggregate metrics
      results.aggregate = this.calculateAggregateMetrics(results.samples);

      // Compare with baseline if provided
      if (baseline) {
        results.comparison = this.compareWithBaseline(results.aggregate, baseline);
      }

      // Determine if performance is acceptable
      results.passed = this.evaluatePerformance(results.aggregate, results.issues);

      // Generate recommendations
      results.recommendations = this.generateRecommendations(results.aggregate, results.issues);

      console.log(`Performance validation completed. Overall: ${results.passed ? 'PASSED' : 'FAILED'}`);

      return results;
    } catch (error) {
      results.passed = false;
      results.issues.push({
        type: 'validation-error',
        severity: 'CRITICAL',
        message: `Performance validation failed: ${error.message}`,
        impact: 'high'
      });

      return results;
    }
  }

  /**
   * Runs a single performance measurement sample
   * @param {Object} sandbox - Sandbox environment
   * @param {number} sampleIndex - Index of the current sample
   * @returns {Object} Performance metrics for this sample
   */
  async runPerformanceSample(sandbox, sampleIndex) {
    let browser = null;
    let server = null;

    try {
      // Launch browser with performance monitoring
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection'
        ]
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });

      const page = await context.newPage();

      // Start server
      server = await this.startSandboxServer(sandbox);

      // Setup performance monitoring
      const metrics = await this.setupPerformanceMonitoring(page);

      // Measure load performance
      const loadMetrics = await this.measureLoadPerformance(page, server.port);

      // Warmup period
      await page.waitForTimeout(this.warmupTime);

      // Measure runtime performance
      const runtimeMetrics = await this.measureRuntimePerformance(page, this.measurementTime);

      // Measure memory usage
      const memoryMetrics = await this.measureMemoryUsage(page);

      // Measure network performance
      const networkMetrics = await this.measureNetworkPerformance(page);

      // Measure CPU usage (simplified)
      const cpuMetrics = await this.measureCPUUsage(page);

      return {
        sampleIndex,
        timestamp: new Date().toISOString(),
        load: loadMetrics,
        runtime: runtimeMetrics,
        memory: memoryMetrics,
        network: networkMetrics,
        cpu: cpuMetrics,
        overall: this.calculateOverallScore(loadMetrics, runtimeMetrics, memoryMetrics)
      };
    } finally {
      if (server) await server.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Sets up performance monitoring hooks in the browser
   */
  async setupPerformanceMonitoring(page) {
    await page.addInitScript(() => {
      window.performanceMetrics = {
        loadTime: 0,
        memoryUsage: [],
        fps: [],
        cpuTimes: [],
        networkTimes: [],
        errors: []
      };

      // Monitor memory usage
      if (window.performance && window.performance.memory) {
        setInterval(() => {
          window.performanceMetrics.memoryUsage.push({
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            timestamp: Date.now()
          });
        }, 500);
      }

      // Monitor FPS
      let frameCount = 0;
      let lastTime = performance.now();

      function measureFPS() {
        frameCount++;
        const currentTime = performance.now();

        if (currentTime >= lastTime + 1000) {
          const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
          window.performanceMetrics.fps.push({
            fps,
            timestamp: Date.now()
          });
          frameCount = 0;
          lastTime = currentTime;
        }

        requestAnimationFrame(measureFPS);
      }
      measureFPS();

      // Monitor long tasks
      if (window.PerformanceObserver) {
        try {
          const longTaskObserver = new PerformanceObserver(list => {
            list.getEntries().forEach(entry => {
              window.performanceMetrics.cpuTimes.push({
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            });
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          console.warn('Long task observer not supported');
        }
      }

      // Monitor network requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = performance.now();
        try {
          const response = await originalFetch(...args);
          const endTime = performance.now();
          window.performanceMetrics.networkTimes.push({
            url: args[0],
            duration: endTime - startTime,
            status: response.status,
            timestamp: Date.now()
          });
          return response;
        } catch (error) {
          const endTime = performance.now();
          window.performanceMetrics.networkTimes.push({
            url: args[0],
            duration: endTime - startTime,
            error: error.message,
            timestamp: Date.now()
          });
          throw error;
        }
      };
    });
  }

  /**
   * Measures load performance metrics
   */
  async measureLoadPerformance(page, port) {
    const startTime = Date.now();

    try {
      await page.goto(`http://localhost:${port}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });

      const loadTime = Date.now() - startTime;

      // Get detailed timing metrics
      const timingMetrics = await page.evaluate(() => {
        const timing = performance.timing;
        const navigation = performance.getEntriesByType('navigation')[0];

        return {
          // Legacy timing API
          navigationStart: timing.navigationStart,
          domainLookupEnd: timing.domainLookupEnd - timing.domainLookupStart,
          connectTime: timing.connectEnd - timing.connectStart,
          requestTime: timing.responseStart - timing.requestStart,
          responseTime: timing.responseEnd - timing.responseStart,
          domProcessingTime: timing.domComplete - timing.domLoading,
          domContentLoadedTime: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
          loadEventTime: timing.loadEventEnd - timing.loadEventStart,

          // Navigation timing API
          navigation: navigation ? {
            domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadEventTime: navigation.loadEventEnd - navigation.loadEventStart,
            transferSize: navigation.transferSize,
            encodedBodySize: navigation.encodedBodySize,
            decodedBodySize: navigation.decodedBodySize
          } : null
        };
      });

      // Get paint metrics
      const paintMetrics = await page.evaluate(() => {
        const paints = performance.getEntriesByType('paint');
        return paints.reduce((acc, paint) => {
          acc[paint.name] = paint.startTime;
          return acc;
        }, {});
      });

      return {
        totalLoadTime: loadTime,
        timing: timingMetrics,
        paint: paintMetrics,
        passed: loadTime < this.thresholds.loadTime
      };
    } catch (error) {
      return {
        totalLoadTime: Infinity,
        error: error.message,
        passed: false
      };
    }
  }

  /**
   * Measures runtime performance during gameplay
   */
  async measureRuntimePerformance(page, duration) {
    const startTime = Date.now();

    try {
      // Simulate user interactions during measurement
      await this.simulateUserInteractions(page);

      // Wait for measurement duration
      await page.waitForTimeout(duration);

      // Collect runtime metrics
      const runtimeMetrics = await page.evaluate(() => {
        return {
          fps: window.performanceMetrics.fps,
          memoryUsage: window.performanceMetrics.memoryUsage,
          cpuTimes: window.performanceMetrics.cpuTimes,
          errorCount: window.performanceMetrics.errors.length
        };
      });

      // Calculate runtime statistics
      const fpsStats = this.calculateStats(runtimeMetrics.fps.map(f => f.fps));
      const memoryStats = this.calculateMemoryStats(runtimeMetrics.memoryUsage);
      const cpuStats = this.calculateCPUStats(runtimeMetrics.cpuTimes);

      return {
        duration: Date.now() - startTime,
        fps: {
          ...fpsStats,
          samples: runtimeMetrics.fps.length,
          passed: fpsStats.average >= this.thresholds.minFPS
        },
        memory: {
          ...memoryStats,
          passed: memoryStats.peakMB <= this.thresholds.memoryLimit
        },
        cpu: {
          ...cpuStats,
          passed: cpuStats.totalTime <= this.thresholds.maxCPUTime
        },
        errors: runtimeMetrics.errorCount
      };
    } catch (error) {
      return {
        duration: Date.now() - startTime,
        error: error.message,
        passed: false
      };
    }
  }

  /**
   * Simulates user interactions for realistic performance testing
   */
  async simulateUserInteractions(page) {
    try {
      // Click on interactive elements
      const buttons = await page.locator('button, [onclick], [data-choice]').all();

      for (let i = 0; i < Math.min(3, buttons.length); i++) {
        const button = buttons[i];
        if (await button.isVisible() && await button.isEnabled()) {
          await button.click();
          await page.waitForTimeout(500);
        }
      }

      // Scroll if scrollable content exists
      try {
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(200);
        await page.mouse.wheel(0, -300);
      } catch (e) {
        // Scrolling might not be available
      }

      // Hover over elements
      try {
        const hoverElements = await page.locator('[onmouseover], .hover-effect').all();
        if (hoverElements.length > 0) {
          await hoverElements[0].hover();
          await page.waitForTimeout(200);
        }
      } catch (e) {
        // Hovering might not be available
      }
    } catch (error) {
      // Ignore interaction errors during performance testing
      console.warn('User interaction simulation warning:', error.message);
    }
  }

  /**
   * Measures memory usage patterns
   */
  async measureMemoryUsage(page) {
    try {
      const memoryData = await page.evaluate(() => {
        return window.performanceMetrics.memoryUsage;
      });

      if (memoryData.length === 0) {
        return {
          available: false,
          reason: 'Memory API not available'
        };
      }

      const stats = this.calculateMemoryStats(memoryData);

      return {
        ...stats,
        samples: memoryData.length,
        trend: this.calculateMemoryTrend(memoryData),
        passed: stats.peakMB <= this.thresholds.memoryLimit
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        passed: false
      };
    }
  }

  /**
   * Measures network performance
   */
  async measureNetworkPerformance(page) {
    try {
      const networkData = await page.evaluate(() => {
        return window.performanceMetrics.networkTimes;
      });

      if (networkData.length === 0) {
        return {
          requests: 0,
          totalTime: 0,
          passed: true
        };
      }

      const totalTime = networkData.reduce((sum, req) => sum + req.duration, 0);
      const averageTime = totalTime / networkData.length;
      const failures = networkData.filter(req => req.error).length;

      return {
        requests: networkData.length,
        totalTime,
        averageTime,
        failures,
        failureRate: failures / networkData.length,
        passed: totalTime <= this.thresholds.maxNetworkTime
      };
    } catch (error) {
      return {
        error: error.message,
        passed: false
      };
    }
  }

  /**
   * Measures CPU usage (simplified browser-based measurement)
   */
  async measureCPUUsage(page) {
    try {
      const cpuData = await page.evaluate(() => {
        return window.performanceMetrics.cpuTimes;
      });

      const stats = this.calculateCPUStats(cpuData);

      return {
        ...stats,
        longTaskCount: cpuData.length,
        passed: stats.totalTime <= this.thresholds.maxCPUTime
      };
    } catch (error) {
      return {
        error: error.message,
        passed: false
      };
    }
  }

  /**
   * Helper methods for calculations
   */

  calculateStats(values) {
    if (!values.length) return { average: 0, min: 0, max: 0 };

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  calculateMemoryStats(memoryData) {
    if (!memoryData.length) {
      return { peakMB: 0, averageMB: 0, growthRate: 0 };
    }

    const usedValues = memoryData.map(m => m.used);
    const peakBytes = Math.max(...usedValues);
    const averageBytes = usedValues.reduce((a, b) => a + b, 0) / usedValues.length;

    // Calculate growth rate (bytes per second)
    let growthRate = 0;
    if (memoryData.length > 1) {
      const first = memoryData[0];
      const last = memoryData[memoryData.length - 1];
      const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
      const memoryDiff = last.used - first.used;
      growthRate = memoryDiff / timeDiff;
    }

    return {
      peakMB: peakBytes / (1024 * 1024),
      averageMB: averageBytes / (1024 * 1024),
      growthRate,
      samples: memoryData.length
    };
  }

  calculateMemoryTrend(memoryData) {
    if (memoryData.length < 2) return 'stable';

    const first = memoryData[0].used;
    const last = memoryData[memoryData.length - 1].used;
    const change = ((last - first) / first) * 100;

    if (change > 20) return 'increasing';
    if (change < -20) return 'decreasing';
    return 'stable';
  }

  calculateCPUStats(cpuData) {
    if (!cpuData.length) {
      return { totalTime: 0, averageTime: 0, maxTime: 0 };
    }

    const durations = cpuData.map(task => task.duration);
    const totalTime = durations.reduce((a, b) => a + b, 0);

    return {
      totalTime,
      averageTime: totalTime / durations.length,
      maxTime: Math.max(...durations),
      taskCount: cpuData.length
    };
  }

  calculateOverallScore(loadMetrics, runtimeMetrics, memoryMetrics) {
    let score = 0;
    let maxScore = 0;

    // Load performance (30% weight)
    if (loadMetrics.passed) score += 30;
    maxScore += 30;

    // FPS performance (25% weight)
    if (runtimeMetrics.fps && runtimeMetrics.fps.passed) score += 25;
    maxScore += 25;

    // Memory performance (25% weight)
    if (memoryMetrics.passed) score += 25;
    maxScore += 25;

    // CPU performance (20% weight)
    if (runtimeMetrics.cpu && runtimeMetrics.cpu.passed) score += 20;
    maxScore += 20;

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Calculate aggregate metrics from multiple samples
   */
  calculateAggregateMetrics(samples) {
    if (!samples.length) return null;

    const aggregate = {
      samples: samples.length,
      load: this.aggregateLoadMetrics(samples),
      runtime: this.aggregateRuntimeMetrics(samples),
      memory: this.aggregateMemoryMetrics(samples),
      overall: this.aggregateOverallScores(samples)
    };

    return aggregate;
  }

  aggregateLoadMetrics(samples) {
    const loadTimes = samples.map(s => s.load.totalLoadTime).filter(t => t !== Infinity);

    return {
      averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
      minLoadTime: Math.min(...loadTimes),
      maxLoadTime: Math.max(...loadTimes),
      passed: loadTimes.every(t => t < this.thresholds.loadTime)
    };
  }

  aggregateRuntimeMetrics(samples) {
    const fpsAverages = samples.map(s => s.runtime.fps?.average || 0);
    const memoryPeaks = samples.map(s => s.runtime.memory?.peakMB || 0);

    return {
      averageFPS: fpsAverages.reduce((a, b) => a + b, 0) / fpsAverages.length,
      minFPS: Math.min(...fpsAverages),
      peakMemoryMB: Math.max(...memoryPeaks),
      averageMemoryMB: memoryPeaks.reduce((a, b) => a + b, 0) / memoryPeaks.length
    };
  }

  aggregateMemoryMetrics(samples) {
    const peakMemories = samples.map(s => s.memory.peakMB).filter(m => !isNaN(m));

    return {
      peakMemoryMB: Math.max(...peakMemories),
      averageMemoryMB: peakMemories.reduce((a, b) => a + b, 0) / peakMemories.length,
      passed: peakMemories.every(m => m <= this.thresholds.memoryLimit)
    };
  }

  aggregateOverallScores(samples) {
    const scores = samples.map(s => s.overall).filter(s => !isNaN(s));

    return {
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores)
    };
  }

  /**
   * Compare current metrics with baseline
   */
  compareWithBaseline(current, baseline) {
    return {
      loadTimeChange: this.calculatePercentChange(
        baseline.load?.averageLoadTime,
        current.load?.averageLoadTime
      ),
      fpsChange: this.calculatePercentChange(
        baseline.runtime?.averageFPS,
        current.runtime?.averageFPS
      ),
      memoryChange: this.calculatePercentChange(
        baseline.memory?.peakMemoryMB,
        current.memory?.peakMemoryMB
      ),
      overallScoreChange: this.calculatePercentChange(
        baseline.overall?.average,
        current.overall?.average
      )
    };
  }

  calculatePercentChange(baseline, current) {
    if (!baseline || !current || baseline === 0) return null;
    return ((current - baseline) / baseline) * 100;
  }

  /**
   * Evaluate if performance is acceptable
   */
  evaluatePerformance(metrics, issues) {
    let passed = true;

    // Check load performance
    if (metrics.load && !metrics.load.passed) {
      passed = false;
      issues.push({
        type: 'slow-load-time',
        severity: 'HIGH',
        message: `Load time ${Math.round(metrics.load.averageLoadTime)}ms exceeds threshold ${this.thresholds.loadTime}ms`,
        impact: 'high'
      });
    }

    // Check memory usage
    if (metrics.memory && !metrics.memory.passed) {
      passed = false;
      issues.push({
        type: 'high-memory-usage',
        severity: 'MEDIUM',
        message: `Peak memory usage ${Math.round(metrics.memory.peakMemoryMB)}MB exceeds threshold ${this.thresholds.memoryLimit}MB`,
        impact: 'medium'
      });
    }

    // Check FPS
    if (metrics.runtime && metrics.runtime.averageFPS < this.thresholds.minFPS) {
      passed = false;
      issues.push({
        type: 'low-fps',
        severity: 'MEDIUM',
        message: `Average FPS ${Math.round(metrics.runtime.averageFPS)} below threshold ${this.thresholds.minFPS}`,
        impact: 'medium'
      });
    }

    return passed;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(metrics, issues) {
    const recommendations = [];

    if (issues.some(i => i.type === 'slow-load-time')) {
      recommendations.push('Consider optimizing assets and reducing bundle size');
      recommendations.push('Implement lazy loading for non-critical resources');
    }

    if (issues.some(i => i.type === 'high-memory-usage')) {
      recommendations.push('Check for memory leaks and optimize data structures');
      recommendations.push('Implement object pooling for frequently created objects');
    }

    if (issues.some(i => i.type === 'low-fps')) {
      recommendations.push('Optimize rendering performance and reduce DOM manipulations');
      recommendations.push('Consider using requestAnimationFrame for animations');
    }

    if (recommendations.length === 0 && metrics.overall?.average < 80) {
      recommendations.push('Overall performance is acceptable but could be improved');
    }

    return recommendations;
  }

  /**
   * Helper to start sandbox server
   */
  async startSandboxServer(sandbox) {
    const express = require('express');
    const app = express();

    app.use(express.static(sandbox.path));

    const server = app.listen(this.serverPort);

    return {
      port: this.serverPort,
      close: () => new Promise((resolve) => server.close(resolve))
    };
  }
}