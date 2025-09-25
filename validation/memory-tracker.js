/**
 * Memory Tracker
 *
 * Tracks memory usage, detects memory leaks, and monitors resource consumption
 * for the idle cultivation game. Focuses on long-term memory patterns that
 * could affect gameplay during extended idle sessions.
 */
export class MemoryTracker {
  constructor(options = {}) {
    this.options = {
      measurementInterval: 10000,    // Memory measurement interval (10s)
      alertThreshold: 0.8,           // Memory usage alert threshold (80%)
      criticalThreshold: 0.9,        // Critical memory usage threshold (90%)
      leakDetectionWindow: 300000,   // Memory leak detection window (5 minutes)
      minLeakGrowth: 0.2,           // Minimum growth for leak detection (20%)
      maxHistorySize: 500,          // Maximum number of memory measurements to keep
      gcMonitoringEnabled: true,     // Monitor garbage collection
      ...options
    };

    this.errors = [];
    this.listeners = new Set();
    this.isActive = false;

    // Memory tracking
    this.memoryHistory = [];
    this.gcHistory = [];
    this.memoryPressureEvents = [];
    this.leakSuspects = new Map(); // Track potential memory leaks by type

    // Intervals
    this.measurementInterval = null;
    this.analysisInterval = null;
  }

  /**
   * Initialize memory tracking on a page
   */
  async initialize(page) {
    this.page = page;
    this.isActive = true;

    // Set up memory monitoring in browser context
    await this.setupMemoryMonitoring();

    // Start memory measurements
    this.startMemoryTracking();

    // Start leak detection analysis
    this.startLeakDetection();

    // Set up garbage collection monitoring if supported
    if (this.options.gcMonitoringEnabled) {
      await this.setupGCMonitoring();
    }
  }

  /**
   * Set up memory monitoring in the browser context
   */
  async setupMemoryMonitoring() {
    await this.page.evaluateOnNewDocument(() => {
      // Create memory monitoring namespace
      window.__memoryTracker = {
        measurements: [],
        gcEvents: [],
        objectCounts: {},
        customMetrics: {}
      };

      // Enhanced memory measurement function
      window.__memoryTracker.measure = function() {
        const measurement = {
          timestamp: performance.now(),
          date: new Date().toISOString()
        };

        // Performance memory API (Chrome/Edge)
        if (performance.memory) {
          measurement.memory = {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
            usage: performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
          };
        }

        // Try to get additional memory information
        try {
          // Estimate DOM node count
          measurement.domNodes = document.querySelectorAll('*').length;

          // Count event listeners (approximation)
          const eventListenerCount = window.getEventListeners ?
            Object.keys(window.getEventListeners(document)).length : 0;
          measurement.eventListeners = eventListenerCount;

          // Count timers and intervals (if we can access them)
          measurement.timers = {
            active: this.getActiveTimerCount(),
            intervals: this.getActiveIntervalCount()
          };

        } catch (e) {
          // Some measurements might not be available
        }

        // Game-specific memory tracking
        if (window.gameState) {
          try {
            measurement.gameMemory = {
              playerData: JSON.stringify(window.gameState.get('player') || {}).length,
              resourceData: JSON.stringify(window.gameState.get('resources') || {}).length,
              achievementData: JSON.stringify(window.gameState.get('achievements') || {}).length,
              totalGameData: this.estimateGameStateSize()
            };
          } catch (e) {
            measurement.gameMemory = { error: e.message };
          }
        }

        this.measurements.push(measurement);

        // Keep only recent measurements to prevent memory leak in tracker itself
        if (this.measurements.length > 1000) {
          this.measurements.shift();
        }

        return measurement;
      };

      // Estimate game state size
      window.__memoryTracker.estimateGameStateSize = function() {
        if (!window.gameState) return 0;

        try {
          const stateStr = JSON.stringify(window.gameState.state || {});
          return stateStr.length;
        } catch (e) {
          return 0;
        }
      };

      // Get active timer count (approximation)
      window.__memoryTracker.getActiveTimerCount = function() {
        // This is a rough approximation since there's no direct way
        // to count active timers in standard JavaScript
        return window.__activeTimers ? window.__activeTimers.size : 0;
      };

      // Get active interval count (approximation)
      window.__memoryTracker.getActiveIntervalCount = function() {
        return window.__activeIntervals ? window.__activeIntervals.size : 0;
      };

      // Monitor garbage collection if available
      if ('PerformanceObserver' in window) {
        try {
          const gcObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
              if (entry.name === 'gc' || entry.entryType === 'gc') {
                window.__memoryTracker.gcEvents.push({
                  timestamp: performance.now(),
                  duration: entry.duration,
                  startTime: entry.startTime,
                  type: entry.detail ? entry.detail.type : 'unknown'
                });

                // Keep only recent GC events
                if (window.__memoryTracker.gcEvents.length > 100) {
                  window.__memoryTracker.gcEvents.shift();
                }
              }
            });
          });

          gcObserver.observe({ entryTypes: ['gc'] });
        } catch (e) {
          console.log('GC monitoring not available:', e.message);
        }
      }

      // Track potential memory leaks by monitoring object creation
      if (window.WeakMap && window.WeakSet) {
        window.__memoryTracker.leakDetection = {
          objectCreationCounts: new Map(),
          suspiciousGrowth: new Set()
        };
      }
    });
  }

  /**
   * Start memory tracking measurements
   */
  startMemoryTracking() {
    this.measurementInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        const measurement = await this.collectMemoryMeasurement();
        await this.analyzeMemoryMeasurement(measurement);
      } catch (error) {
        this.captureError({
          type: 'memory-measurement-error',
          severity: 'MEDIUM',
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      }
    }, this.options.measurementInterval);
  }

  /**
   * Start leak detection analysis
   */
  startLeakDetection() {
    this.analysisInterval = setInterval(async () => {
      if (!this.isActive || this.memoryHistory.length < 10) return;

      try {
        await this.detectMemoryLeaks();
        await this.analyzeMemoryPressure();
        await this.detectMemoryPatterns();
      } catch (error) {
        this.captureError({
          type: 'memory-analysis-error',
          severity: 'MEDIUM',
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      }
    }, 30000); // Analyze every 30 seconds
  }

  /**
   * Set up garbage collection monitoring
   */
  async setupGCMonitoring() {
    // The GC monitoring is set up in the browser context
    // Here we just start collecting GC data periodically
    setInterval(async () => {
      if (!this.isActive) return;

      try {
        const gcData = await this.page.evaluate(() => {
          return {
            events: window.__memoryTracker?.gcEvents || [],
            timestamp: Date.now()
          };
        });

        if (gcData.events.length > 0) {
          this.analyzeGCActivity(gcData);
        }
      } catch (error) {
        // GC data might not be available, that's OK
      }
    }, 60000); // Check GC data every minute
  }

  /**
   * Collect memory measurement from the page
   */
  async collectMemoryMeasurement() {
    const measurement = await this.page.evaluate(() => {
      return window.__memoryTracker?.measure() || null;
    });

    if (measurement) {
      // Add server-side timestamp
      measurement.serverTimestamp = Date.now();
      this.memoryHistory.push(measurement);

      // Maintain history size limit
      if (this.memoryHistory.length > this.options.maxHistorySize) {
        this.memoryHistory.shift();
      }
    }

    return measurement;
  }

  /**
   * Analyze a memory measurement for immediate issues
   */
  async analyzeMemoryMeasurement(measurement) {
    if (!measurement || !measurement.memory) return;

    const { memory } = measurement;

    // Check for high memory usage
    if (memory.usage > this.options.criticalThreshold) {
      this.captureError({
        type: 'critical-memory-usage',
        severity: 'CRITICAL',
        usage: `${(memory.usage * 100).toFixed(1)}%`,
        usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        message: `Critical memory usage: ${(memory.usage * 100).toFixed(1)}% of heap limit`,
        timestamp: measurement.serverTimestamp,
        context: measurement
      });
    } else if (memory.usage > this.options.alertThreshold) {
      this.captureError({
        type: 'high-memory-usage',
        severity: 'HIGH',
        usage: `${(memory.usage * 100).toFixed(1)}%`,
        usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
        message: `High memory usage: ${(memory.usage * 100).toFixed(1)}% of heap limit`,
        timestamp: measurement.serverTimestamp,
        context: measurement
      });
    }

    // Check for rapid memory growth
    if (this.memoryHistory.length >= 5) {
      const recent = this.memoryHistory.slice(-5);
      const growth = this.calculateMemoryGrowth(recent);

      if (growth.rate > 0.1) { // 10% growth in recent measurements
        this.captureError({
          type: 'rapid-memory-growth',
          severity: 'HIGH',
          growthRate: `${(growth.rate * 100).toFixed(1)}%`,
          fromMB: Math.round(growth.from / 1024 / 1024),
          toMB: Math.round(growth.to / 1024 / 1024),
          timespan: `${growth.timespan}ms`,
          message: `Rapid memory growth: ${(growth.rate * 100).toFixed(1)}% in ${growth.timespan}ms`,
          timestamp: measurement.serverTimestamp,
          context: { growth, recentMeasurements: recent.slice(-3) }
        });
      }
    }
  }

  /**
   * Detect memory leaks by analyzing long-term patterns
   */
  async detectMemoryLeaks() {
    if (this.memoryHistory.length < 20) return;

    const now = Date.now();
    const windowStart = now - this.options.leakDetectionWindow;

    // Get measurements within the detection window
    const windowMeasurements = this.memoryHistory.filter(m =>
      m.serverTimestamp >= windowStart
    );

    if (windowMeasurements.length < 10) return;

    // Analyze overall memory trend
    const memoryTrend = this.analyzeMemoryTrend(windowMeasurements);

    if (memoryTrend.isGrowing && memoryTrend.growthRate > this.options.minLeakGrowth) {
      this.captureError({
        type: 'memory-leak-detected',
        severity: 'CRITICAL',
        growthRate: `${(memoryTrend.growthRate * 100).toFixed(1)}%`,
        initialMB: Math.round(memoryTrend.initialMemory / 1024 / 1024),
        currentMB: Math.round(memoryTrend.currentMemory / 1024 / 1024),
        timespan: `${Math.round(this.options.leakDetectionWindow / 1000 / 60)}min`,
        confidence: memoryTrend.confidence,
        message: `Memory leak detected: ${(memoryTrend.growthRate * 100).toFixed(1)}% growth over ${Math.round(this.options.leakDetectionWindow / 1000 / 60)} minutes`,
        timestamp: now,
        context: {
          trend: memoryTrend,
          suspects: this.identifyLeakSuspects(windowMeasurements)
        }
      });
    }

    // Analyze game-specific memory leaks
    await this.detectGameMemoryLeaks(windowMeasurements);
  }

  /**
   * Analyze memory trend over a set of measurements
   */
  analyzeMemoryTrend(measurements) {
    if (measurements.length < 2) return null;

    const validMeasurements = measurements.filter(m => m.memory);
    if (validMeasurements.length < 2) return null;

    const first = validMeasurements[0].memory;
    const last = validMeasurements[validMeasurements.length - 1].memory;

    const growthRate = (last.usedJSHeapSize - first.usedJSHeapSize) / first.usedJSHeapSize;
    const isGrowing = growthRate > 0;

    // Calculate confidence based on consistency of growth
    let confidence = 0;
    if (validMeasurements.length >= 5) {
      const midpoint = Math.floor(validMeasurements.length / 2);
      const midMemory = validMeasurements[midpoint].memory;
      const midGrowth = (midMemory.usedJSHeapSize - first.usedJSHeapSize) / first.usedJSHeapSize;
      const expectedMidGrowth = growthRate * 0.5;

      // Higher confidence if growth is consistent
      confidence = Math.max(0, 1 - Math.abs(midGrowth - expectedMidGrowth));
    }

    return {
      isGrowing,
      growthRate,
      initialMemory: first.usedJSHeapSize,
      currentMemory: last.usedJSHeapSize,
      confidence,
      measurementCount: validMeasurements.length
    };
  }

  /**
   * Identify potential leak suspects
   */
  identifyLeakSuspects(measurements) {
    const suspects = [];

    // Check DOM node growth
    const domGrowth = this.analyzeDOMGrowth(measurements);
    if (domGrowth && domGrowth.growthRate > 0.2) {
      suspects.push({
        type: 'DOM nodes',
        growth: domGrowth,
        description: 'DOM nodes increasing over time'
      });
    }

    // Check game state growth
    const gameStateGrowth = this.analyzeGameStateGrowth(measurements);
    if (gameStateGrowth && gameStateGrowth.growthRate > 0.3) {
      suspects.push({
        type: 'Game state',
        growth: gameStateGrowth,
        description: 'Game state data size increasing'
      });
    }

    return suspects;
  }

  /**
   * Analyze DOM node growth
   */
  analyzeDOMGrowth(measurements) {
    const withDomNodes = measurements.filter(m => typeof m.domNodes === 'number');
    if (withDomNodes.length < 2) return null;

    const first = withDomNodes[0].domNodes;
    const last = withDomNodes[withDomNodes.length - 1].domNodes;
    const growthRate = (last - first) / first;

    return {
      growthRate,
      initialCount: first,
      currentCount: last,
      description: `DOM nodes grew from ${first} to ${last}`
    };
  }

  /**
   * Analyze game state growth
   */
  analyzeGameStateGrowth(measurements) {
    const withGameMemory = measurements.filter(m => m.gameMemory && typeof m.gameMemory.totalGameData === 'number');
    if (withGameMemory.length < 2) return null;

    const first = withGameMemory[0].gameMemory.totalGameData;
    const last = withGameMemory[withGameMemory.length - 1].gameMemory.totalGameData;

    if (first === 0) return null;

    const growthRate = (last - first) / first;

    return {
      growthRate,
      initialSize: first,
      currentSize: last,
      description: `Game state grew from ${first} to ${last} characters`
    };
  }

  /**
   * Detect game-specific memory leaks
   */
  async detectGameMemoryLeaks(measurements) {
    // Check for accumulating game data that should be cleaned up
    const gameMemoryMeasurements = measurements.filter(m => m.gameMemory);

    if (gameMemoryMeasurements.length < 5) return;

    // Check for growing arrays/objects in game state
    const gameDataSizes = gameMemoryMeasurements.map(m => m.gameMemory.totalGameData || 0);
    const averageGrowth = this.calculateAverageGrowth(gameDataSizes);

    if (averageGrowth > 0.1) { // 10% average growth
      this.captureError({
        type: 'game-data-memory-leak',
        severity: 'HIGH',
        averageGrowth: `${(averageGrowth * 100).toFixed(1)}%`,
        initialSize: gameDataSizes[0],
        currentSize: gameDataSizes[gameDataSizes.length - 1],
        message: `Game data memory leak: average ${(averageGrowth * 100).toFixed(1)}% growth per measurement`,
        timestamp: Date.now(),
        context: {
          gameDataSizes: gameDataSizes.slice(-10),
          measurements: gameMemoryMeasurements.slice(-3)
        }
      });
    }
  }

  /**
   * Analyze memory pressure events
   */
  async analyzeMemoryPressure() {
    if (this.memoryHistory.length < 10) return;

    const recent = this.memoryHistory.slice(-10);
    const highMemoryCount = recent.filter(m =>
      m.memory && m.memory.usage > this.options.alertThreshold
    ).length;

    // Sustained memory pressure
    if (highMemoryCount >= 7) { // 7 out of 10 recent measurements
      this.captureError({
        type: 'sustained-memory-pressure',
        severity: 'HIGH',
        pressureRatio: `${highMemoryCount}/10`,
        averageUsage: this.calculateAverageMemoryUsage(recent),
        message: `Sustained memory pressure: ${highMemoryCount}/10 recent measurements above ${this.options.alertThreshold * 100}%`,
        timestamp: Date.now(),
        context: {
          recentUsages: recent.map(m => m.memory?.usage).filter(Boolean)
        }
      });
    }
  }

  /**
   * Detect memory usage patterns
   */
  async detectMemoryPatterns() {
    if (this.memoryHistory.length < 30) return;

    // Check for sawtooth pattern (rapid growth followed by drops - could indicate inefficient GC)
    const pattern = this.detectSawtoothPattern();
    if (pattern.detected) {
      this.captureError({
        type: 'memory-sawtooth-pattern',
        severity: 'MEDIUM',
        cycleCount: pattern.cycleCount,
        averagePeakUsage: pattern.averagePeakUsage,
        message: `Memory sawtooth pattern detected: ${pattern.cycleCount} cycles with peaks at ${pattern.averagePeakUsage}%`,
        timestamp: Date.now(),
        context: pattern
      });
    }
  }

  /**
   * Detect sawtooth memory pattern
   */
  detectSawtoothPattern() {
    const recent = this.memoryHistory.slice(-30);
    const memoryValues = recent.filter(m => m.memory).map(m => m.memory.usage);

    if (memoryValues.length < 20) return { detected: false };

    let cycles = 0;
    let peaks = [];
    let valleys = [];

    // Simple peak/valley detection
    for (let i = 1; i < memoryValues.length - 1; i++) {
      const prev = memoryValues[i - 1];
      const curr = memoryValues[i];
      const next = memoryValues[i + 1];

      // Peak detection
      if (curr > prev && curr > next && curr > 0.7) {
        peaks.push(curr);
      }

      // Valley detection (after peak)
      if (curr < prev && curr < next && peaks.length > valleys.length) {
        valleys.push(curr);
      }
    }

    // Check if we have a sawtooth pattern
    cycles = Math.min(peaks.length, valleys.length);
    const detected = cycles >= 3 && peaks.length >= 3;

    return {
      detected,
      cycleCount: cycles,
      averagePeakUsage: detected ? `${(peaks.reduce((a, b) => a + b, 0) / peaks.length * 100).toFixed(1)}%` : '0%',
      peaks: peaks.length,
      valleys: valleys.length
    };
  }

  /**
   * Analyze GC activity
   */
  analyzeGCActivity(gcData) {
    const events = gcData.events;
    if (events.length === 0) return;

    // Check for frequent GC events
    const recentEvents = events.filter(event =>
      gcData.timestamp - event.timestamp < 60000 // Last minute
    );

    if (recentEvents.length > 20) {
      this.captureError({
        type: 'frequent-garbage-collection',
        severity: 'MEDIUM',
        eventCount: recentEvents.length,
        timeWindow: '1 minute',
        averageDuration: `${(recentEvents.reduce((sum, e) => sum + e.duration, 0) / recentEvents.length).toFixed(1)}ms`,
        message: `Frequent garbage collection: ${recentEvents.length} GC events in the last minute`,
        timestamp: Date.now(),
        context: {
          recentEvents: recentEvents.slice(-5),
          totalEvents: events.length
        }
      });
    }

    // Check for long GC pauses
    const longPauses = events.filter(event => event.duration > 100);
    if (longPauses.length > 0) {
      longPauses.forEach(pause => {
        this.captureError({
          type: 'long-garbage-collection-pause',
          severity: pause.duration > 250 ? 'HIGH' : 'MEDIUM',
          duration: `${pause.duration.toFixed(1)}ms`,
          type: pause.type || 'unknown',
          message: `Long GC pause: ${pause.duration.toFixed(1)}ms (can cause frame drops)`,
          timestamp: Date.now(),
          context: pause
        });
      });
    }
  }

  /**
   * Calculate memory growth rate
   */
  calculateMemoryGrowth(measurements) {
    if (measurements.length < 2) return null;

    const validMeasurements = measurements.filter(m => m.memory);
    if (validMeasurements.length < 2) return null;

    const first = validMeasurements[0];
    const last = validMeasurements[validMeasurements.length - 1];

    const rate = (last.memory.usedJSHeapSize - first.memory.usedJSHeapSize) / first.memory.usedJSHeapSize;
    const timespan = last.serverTimestamp - first.serverTimestamp;

    return {
      rate,
      from: first.memory.usedJSHeapSize,
      to: last.memory.usedJSHeapSize,
      timespan
    };
  }

  /**
   * Calculate average growth rate
   */
  calculateAverageGrowth(values) {
    if (values.length < 2) return 0;

    let totalGrowth = 0;
    let growthCount = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        const growth = (values[i] - values[i - 1]) / values[i - 1];
        totalGrowth += growth;
        growthCount++;
      }
    }

    return growthCount > 0 ? totalGrowth / growthCount : 0;
  }

  /**
   * Calculate average memory usage
   */
  calculateAverageMemoryUsage(measurements) {
    const usages = measurements.filter(m => m.memory).map(m => m.memory.usage);
    if (usages.length === 0) return '0%';

    const average = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
    return `${(average * 100).toFixed(1)}%`;
  }

  /**
   * Get current memory snapshot
   */
  async getMemorySnapshot() {
    if (!this.page) return null;

    return await this.collectMemoryMeasurement();
  }

  /**
   * Capture a memory error
   */
  captureError(error) {
    // Add context
    error.context = {
      ...error.context,
      url: this.page?.url() || 'unknown',
      timestamp: error.timestamp || Date.now(),
      trackerActive: this.isActive,
      historySize: this.memoryHistory.length
    };

    this.errors.push(error);

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in memory tracker listener:', e);
      }
    });

    // Log for debugging
    console.log(`[MEM-${error.severity}] ${error.type}: ${error.message || error.type}`);
  }

  /**
   * Subscribe to memory errors
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
   * Get memory tracking summary
   */
  getSummary() {
    const errorsBySeverity = {
      CRITICAL: this.getErrors('CRITICAL').length,
      HIGH: this.getErrors('HIGH').length,
      MEDIUM: this.getErrors('MEDIUM').length,
      LOW: this.getErrors('LOW').length
    };

    const currentMemory = this.memoryHistory.length > 0 ?
      this.memoryHistory[this.memoryHistory.length - 1] : null;

    return {
      totalErrors: this.errors.length,
      errorsBySeverity,
      currentMemory: currentMemory ? {
        usage: currentMemory.memory ? `${(currentMemory.memory.usage * 100).toFixed(1)}%` : 'N/A',
        usedMB: currentMemory.memory ? Math.round(currentMemory.memory.usedJSHeapSize / 1024 / 1024) : 'N/A',
        totalMB: currentMemory.memory ? Math.round(currentMemory.memory.totalJSHeapSize / 1024 / 1024) : 'N/A',
        domNodes: currentMemory.domNodes || 'N/A'
      } : null,
      isActive: this.isActive,
      measurementCount: this.memoryHistory.length,
      gcEventCount: this.gcHistory.length
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.errors = [];
    this.memoryHistory = [];
    this.gcHistory = [];
    this.memoryPressureEvents = [];
    this.leakSuspects.clear();
  }

  /**
   * Stop tracking and clean up
   */
  destroy() {
    this.isActive = false;

    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.listeners.clear();
    this.clear();
  }
}