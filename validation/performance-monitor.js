/**
 * Performance Monitor
 *
 * Monitors FPS, performance metrics, and detects degradation over time
 * that could affect user experience in the idle cultivation game.
 */
export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      fpsThreshold: 30,           // Minimum acceptable FPS
      criticalFpsThreshold: 15,   // Critical FPS threshold
      measurementInterval: 1000,  // FPS measurement interval (ms)
      performanceCheckInterval: 5000, // Performance check interval (ms)
      memoryUsageThreshold: 0.8,  // Memory usage threshold (80%)
      ...options
    };

    this.errors = [];
    this.listeners = new Set();
    this.isActive = false;

    // Performance tracking
    this.fpsHistory = [];
    this.performanceHistory = [];
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.currentFps = 60;

    // Intervals
    this.fpsInterval = null;
    this.performanceInterval = null;
    this.frameRequestId = null;
  }

  /**
   * Initialize performance monitoring on a page
   */
  async initialize(page) {
    this.page = page;
    this.isActive = true;

    // Inject FPS monitoring script into the page
    await this.setupFPSMonitoring();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Monitor for performance degradation patterns
    this.startDegradationDetection();
  }

  /**
   * Set up FPS monitoring in the browser context
   */
  async setupFPSMonitoring() {
    await this.page.evaluateOnNewDocument(() => {
      // Create performance monitoring namespace
      window.__performanceMonitor = {
        frameCount: 0,
        lastTime: performance.now(),
        currentFPS: 60,
        fpsHistory: [],
        performanceEntries: []
      };

      // FPS measurement function
      function measureFPS() {
        const monitor = window.__performanceMonitor;
        monitor.frameCount++;
        const currentTime = performance.now();

        // Calculate FPS every second
        if (currentTime >= monitor.lastTime + 1000) {
          const fps = Math.round((monitor.frameCount * 1000) / (currentTime - monitor.lastTime));
          monitor.currentFPS = fps;
          monitor.fpsHistory.push({
            fps,
            timestamp: currentTime,
            frameCount: monitor.frameCount
          });

          // Keep only last 60 seconds of history
          if (monitor.fpsHistory.length > 60) {
            monitor.fpsHistory.shift();
          }

          monitor.frameCount = 0;
          monitor.lastTime = currentTime;
        }

        requestAnimationFrame(measureFPS);
      }

      // Start FPS monitoring
      requestAnimationFrame(measureFPS);

      // Monitor long tasks using Performance Observer
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              monitor.performanceEntries.push({
                type: 'longtask',
                duration: entry.duration,
                startTime: entry.startTime,
                timestamp: performance.now()
              });

              // Keep only recent entries
              if (monitor.performanceEntries.length > 100) {
                monitor.performanceEntries.shift();
              }
            }
          });
        });

        try {
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          // Long task observer not supported
          console.log('Long task observer not supported');
        }
      }

      // Monitor navigation timing
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = performance.getEntriesByType('navigation')[0];
          if (timing) {
            monitor.navigationTiming = {
              domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
              loadComplete: timing.loadEventEnd - timing.loadEventStart,
              totalLoadTime: timing.loadEventEnd - timing.fetchStart
            };
          }
        }, 100);
      });
    });
  }

  /**
   * Start monitoring performance metrics
   */
  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        const metrics = await this.collectPerformanceMetrics();
        await this.analyzePerformance(metrics);
      } catch (error) {
        this.captureError({
          type: 'performance-monitoring-error',
          severity: 'MEDIUM',
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      }
    }, this.options.performanceCheckInterval);
  }

  /**
   * Collect performance metrics from the page
   */
  async collectPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const monitor = window.__performanceMonitor;

      // Get current performance metrics
      const metrics = {
        fps: monitor.currentFPS,
        fpsHistory: monitor.fpsHistory.slice(-10), // Last 10 seconds
        longTasks: monitor.performanceEntries.slice(-10), // Recent long tasks
        timestamp: performance.now()
      };

      // Memory information if available
      if (performance.memory) {
        metrics.memory = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          usage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
        };
      }

      // Navigation timing
      if (monitor.navigationTiming) {
        metrics.navigationTiming = monitor.navigationTiming;
      }

      // Resource timing for recent resources
      const resourceEntries = performance.getEntriesByType('resource').slice(-20);
      metrics.resourceTiming = resourceEntries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: entry.transferSize || 0,
        type: entry.initiatorType
      }));

      return metrics;
    });
  }

  /**
   * Analyze performance metrics and detect issues
   */
  async analyzePerformance(metrics) {
    // Store performance history
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    // Check FPS issues
    await this.checkFPSPerformance(metrics);

    // Check memory usage
    await this.checkMemoryUsage(metrics);

    // Check for long tasks
    await this.checkLongTasks(metrics);

    // Check resource loading performance
    await this.checkResourcePerformance(metrics);
  }

  /**
   * Check FPS performance and detect issues
   */
  async checkFPSPerformance(metrics) {
    const { fps, fpsHistory } = metrics;

    // Low FPS detection
    if (fps < this.options.criticalFpsThreshold) {
      this.captureError({
        type: 'critical-low-fps',
        severity: 'CRITICAL',
        fps,
        threshold: this.options.criticalFpsThreshold,
        message: `Critical FPS drop detected: ${fps} FPS (threshold: ${this.options.criticalFpsThreshold})`,
        timestamp: Date.now(),
        context: { fpsHistory: fpsHistory.slice(-5) }
      });
    } else if (fps < this.options.fpsThreshold) {
      this.captureError({
        type: 'low-fps',
        severity: 'HIGH',
        fps,
        threshold: this.options.fpsThreshold,
        message: `Low FPS detected: ${fps} FPS (threshold: ${this.options.fpsThreshold})`,
        timestamp: Date.now(),
        context: { fpsHistory: fpsHistory.slice(-5) }
      });
    }

    // FPS degradation over time
    if (fpsHistory.length >= 5) {
      const recentFps = fpsHistory.slice(-5).map(h => h.fps);
      const avgRecentFps = recentFps.reduce((a, b) => a + b, 0) / recentFps.length;

      if (this.performanceHistory.length >= 10) {
        const olderMetrics = this.performanceHistory.slice(-20, -10);
        const olderFpsValues = olderMetrics
          .flatMap(m => m.fpsHistory || [])
          .map(h => h.fps)
          .slice(-10);

        if (olderFpsValues.length > 0) {
          const avgOlderFps = olderFpsValues.reduce((a, b) => a + b, 0) / olderFpsValues.length;
          const fpsDrop = avgOlderFps - avgRecentFps;

          if (fpsDrop > 10) {
            this.captureError({
              type: 'fps-degradation',
              severity: 'HIGH',
              fpsDrop,
              oldFps: Math.round(avgOlderFps),
              newFps: Math.round(avgRecentFps),
              message: `FPS degradation detected: dropped ${Math.round(fpsDrop)} FPS over time`,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }

  /**
   * Check memory usage and detect potential leaks
   */
  async checkMemoryUsage(metrics) {
    if (!metrics.memory) return;

    const { memory } = metrics;

    // High memory usage
    if (memory.usage > this.options.memoryUsageThreshold) {
      this.captureError({
        type: 'high-memory-usage',
        severity: memory.usage > 0.9 ? 'CRITICAL' : 'HIGH',
        usage: `${(memory.usage * 100).toFixed(1)}%`,
        usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        message: `High memory usage: ${(memory.usage * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        context: memory
      });
    }

    // Memory leak detection (growing memory over time)
    if (this.performanceHistory.length >= 10) {
      const recentMemory = this.performanceHistory.slice(-5)
        .filter(m => m.memory)
        .map(m => m.memory.usedJSHeapSize);

      const olderMemory = this.performanceHistory.slice(-15, -10)
        .filter(m => m.memory)
        .map(m => m.memory.usedJSHeapSize);

      if (recentMemory.length >= 3 && olderMemory.length >= 3) {
        const avgRecent = recentMemory.reduce((a, b) => a + b, 0) / recentMemory.length;
        const avgOlder = olderMemory.reduce((a, b) => a + b, 0) / olderMemory.length;
        const growth = (avgRecent - avgOlder) / avgOlder;

        if (growth > 0.2) { // 20% memory growth
          this.captureError({
            type: 'potential-memory-leak',
            severity: 'HIGH',
            growth: `${(growth * 100).toFixed(1)}%`,
            oldMB: Math.round(avgOlder / 1024 / 1024),
            newMB: Math.round(avgRecent / 1024 / 1024),
            message: `Potential memory leak: ${(growth * 100).toFixed(1)}% memory growth detected`,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Check for long-running tasks that block the main thread
   */
  async checkLongTasks(metrics) {
    const { longTasks } = metrics;

    if (!longTasks || longTasks.length === 0) return;

    // Check for very long tasks
    const criticalTasks = longTasks.filter(task => task.duration > 100);
    if (criticalTasks.length > 0) {
      criticalTasks.forEach(task => {
        this.captureError({
          type: 'long-task',
          severity: task.duration > 250 ? 'CRITICAL' : 'HIGH',
          duration: `${Math.round(task.duration)}ms`,
          message: `Long task detected: ${Math.round(task.duration)}ms (blocks rendering)`,
          timestamp: Date.now(),
          context: task
        });
      });
    }

    // Check for frequency of long tasks
    const recentLongTasks = this.performanceHistory.slice(-5)
      .flatMap(m => m.longTasks || [])
      .length;

    if (recentLongTasks > 10) {
      this.captureError({
        type: 'frequent-long-tasks',
        severity: 'HIGH',
        count: recentLongTasks,
        message: `Frequent long tasks detected: ${recentLongTasks} in recent measurements`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Check resource loading performance
   */
  async checkResourcePerformance(metrics) {
    const { resourceTiming } = metrics;

    if (!resourceTiming || resourceTiming.length === 0) return;

    // Check for slow loading resources
    const slowResources = resourceTiming.filter(resource => resource.duration > 2000);
    if (slowResources.length > 0) {
      slowResources.forEach(resource => {
        this.captureError({
          type: 'slow-resource-loading',
          severity: 'MEDIUM',
          resource: resource.name,
          duration: `${Math.round(resource.duration)}ms`,
          type: resource.type,
          message: `Slow resource loading: ${resource.name} took ${Math.round(resource.duration)}ms`,
          timestamp: Date.now(),
          context: resource
        });
      });
    }

    // Check for large resources
    const largeResources = resourceTiming.filter(resource =>
      resource.transferSize > 1024 * 1024 // > 1MB
    );

    if (largeResources.length > 0) {
      largeResources.forEach(resource => {
        this.captureError({
          type: 'large-resource',
          severity: 'MEDIUM',
          resource: resource.name,
          size: `${Math.round(resource.transferSize / 1024)}KB`,
          type: resource.type,
          message: `Large resource detected: ${resource.name} (${Math.round(resource.transferSize / 1024)}KB)`,
          timestamp: Date.now(),
          context: resource
        });
      });
    }
  }

  /**
   * Start degradation pattern detection
   */
  startDegradationDetection() {
    // Check for performance degradation every 30 seconds
    setInterval(() => {
      if (!this.isActive || this.performanceHistory.length < 20) return;

      this.detectPerformanceTrends();
    }, 30000);
  }

  /**
   * Detect performance degradation trends
   */
  detectPerformanceTrends() {
    const recent = this.performanceHistory.slice(-10);
    const older = this.performanceHistory.slice(-30, -20);

    if (recent.length < 5 || older.length < 5) return;

    // Analyze FPS trends
    const recentFps = recent.map(m => m.fps).filter(fps => fps > 0);
    const olderFps = older.map(m => m.fps).filter(fps => fps > 0);

    if (recentFps.length > 0 && olderFps.length > 0) {
      const recentAvg = recentFps.reduce((a, b) => a + b, 0) / recentFps.length;
      const olderAvg = olderFps.reduce((a, b) => a + b, 0) / olderFps.length;
      const degradation = olderAvg - recentAvg;

      if (degradation > 5) {
        this.captureError({
          type: 'performance-degradation-trend',
          severity: 'HIGH',
          metric: 'fps',
          degradation: Math.round(degradation),
          oldValue: Math.round(olderAvg),
          newValue: Math.round(recentAvg),
          message: `Performance degradation trend: FPS dropped by ${Math.round(degradation)} over time`,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Get current performance snapshot
   */
  async getPerformanceSnapshot() {
    if (!this.page) return null;

    return await this.collectPerformanceMetrics();
  }

  /**
   * Capture a performance error
   */
  captureError(error) {
    // Add context
    error.context = {
      ...error.context,
      url: this.page?.url() || 'unknown',
      timestamp: error.timestamp || Date.now(),
      monitorActive: this.isActive
    };

    this.errors.push(error);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in performance monitor listener:', e);
      }
    });

    // Log for debugging
    console.log(`[PERF-${error.severity}] ${error.type}: ${error.message || error.type}`);
  }

  /**
   * Subscribe to performance errors
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get all captured errors
   */
  getErrors(severity = null) {
    if (severity) {
      return this.errors.filter(error => error.severity === severity);
    }
    return this.errors;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const errorsBySeverity = {
      CRITICAL: this.getErrors('CRITICAL').length,
      HIGH: this.getErrors('HIGH').length,
      MEDIUM: this.getErrors('MEDIUM').length,
      LOW: this.getErrors('LOW').length
    };

    const currentMetrics = this.performanceHistory.length > 0 ?
      this.performanceHistory[this.performanceHistory.length - 1] : null;

    return {
      totalErrors: this.errors.length,
      errorsBySeverity,
      currentMetrics: currentMetrics ? {
        fps: currentMetrics.fps,
        memoryUsage: currentMetrics.memory ?
          `${(currentMetrics.memory.usage * 100).toFixed(1)}%` : 'N/A',
        longTasksCount: currentMetrics.longTasks ? currentMetrics.longTasks.length : 0
      } : null,
      isActive: this.isActive,
      measurementCount: this.performanceHistory.length
    };
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
    this.performanceHistory = [];
    this.fpsHistory = [];
  }

  /**
   * Stop monitoring and clean up
   */
  destroy() {
    this.isActive = false;

    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }

    if (this.fpsInterval) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }

    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }

    this.listeners.clear();
    this.performanceHistory = [];
    this.fpsHistory = [];
  }
}