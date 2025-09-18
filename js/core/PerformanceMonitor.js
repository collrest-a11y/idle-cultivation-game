/**
 * PerformanceMonitor - Advanced performance tracking and optimization system
 * Monitors frame rates, memory usage, calculation times, and provides optimization recommendations
 */
class PerformanceMonitor {
    constructor() {
        this.isActive = false;
        this.startTime = performance.now();

        // Performance metrics storage
        this.metrics = {
            frameRate: [],
            memoryUsage: [],
            calculationTime: new Map(),
            renderTime: [],
            gcEvents: [],
            userInteractions: [],
            systemLoad: []
        };

        // Configuration
        this.config = {
            maxSamples: 1000,
            warningThresholds: {
                fps: 30,
                memoryMB: 100,
                calculationTimeMs: 16,
                renderTimeMs: 8
            },
            alertThresholds: {
                fps: 15,
                memoryMB: 200,
                calculationTimeMs: 33,
                renderTimeMs: 16
            },
            samplingInterval: 1000,
            enableMemoryTracking: true,
            enableDetailedProfiling: false
        };

        // Performance state
        this.currentMetrics = {
            fps: 60,
            memoryUsage: 0,
            averageFrameTime: 16.67,
            lastGCTime: 0,
            isThrottled: false
        };

        // Optimization recommendations
        this.recommendations = new Set();

        // Event tracking
        this.eventManager = null;
        this.lastSampleTime = 0;
        this.frameStartTime = 0;
        this.operationStack = [];

        // Performance history for trend analysis
        this.history = {
            hourly: [],
            session: {
                startTime: Date.now(),
                maxMemory: 0,
                minFPS: 60,
                avgFPS: 60,
                totalOperations: 0
            }
        };

        // Initialize performance observer if available
        this._initializePerformanceObserver();

        // Bind methods
        this.trackOperation = this.trackOperation.bind(this);
        this.startFrame = this.startFrame.bind(this);
        this.endFrame = this.endFrame.bind(this);
    }

    /**
     * Initialize the performance monitor
     * @param {Object} config - Configuration options
     * @param {EventManager} eventManager - Event manager for notifications
     */
    initialize(config = {}, eventManager = null) {
        this.config = { ...this.config, ...config };
        this.eventManager = eventManager;
        this.isActive = true;
        this.startTime = performance.now();

        // Start monitoring loop
        this._startMonitoringLoop();

        console.log('PerformanceMonitor: Initialized with config:', this.config);

        if (this.eventManager) {
            this.eventManager.emit('performance:monitorStarted', {
                config: this.config,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Track a specific operation's performance
     * @param {string} name - Operation name
     * @param {Function} operation - Operation to track
     * @returns {*} Operation result
     */
    trackOperation(name, operation) {
        if (!this.isActive) {
            return operation();
        }

        const startTime = performance.now();
        this.operationStack.push({ name, startTime });

        try {
            const result = operation();

            // Handle async operations
            if (result && typeof result.then === 'function') {
                return result.finally(() => {
                    this._recordOperation(name, startTime);
                });
            }

            this._recordOperation(name, startTime);
            return result;
        } catch (error) {
            this._recordOperation(name, startTime, error);
            throw error;
        }
    }

    /**
     * Start frame timing
     */
    startFrame() {
        if (!this.isActive) return;
        this.frameStartTime = performance.now();
    }

    /**
     * End frame timing and record metrics
     */
    endFrame() {
        if (!this.isActive || !this.frameStartTime) return;

        const frameTime = performance.now() - this.frameStartTime;
        const fps = 1000 / frameTime;

        this._addMetric('frameRate', fps);
        this._addMetric('renderTime', frameTime);

        // Update current metrics
        this.currentMetrics.fps = this._getAverageMetric('frameRate', 60);
        this.currentMetrics.averageFrameTime = frameTime;

        // Check for performance issues
        this._checkPerformanceThresholds();

        this.frameStartTime = 0;
    }

    /**
     * Record memory usage
     */
    recordMemoryUsage() {
        if (!this.isActive || !this.config.enableMemoryTracking) return;

        let memoryInfo = {};

        // Try to get memory info from different sources
        if (performance.memory) {
            memoryInfo = {
                used: performance.memory.usedJSHeapSize / 1024 / 1024,
                total: performance.memory.totalJSHeapSize / 1024 / 1024,
                limit: performance.memory.jsHeapSizeLimit / 1024 / 1024
            };
        } else if (navigator.deviceMemory) {
            memoryInfo = {
                deviceMemory: navigator.deviceMemory * 1024,
                estimatedUsage: this._estimateMemoryUsage()
            };
        }

        this._addMetric('memoryUsage', memoryInfo.used || memoryInfo.estimatedUsage || 0);
        this.currentMetrics.memoryUsage = memoryInfo.used || 0;

        // Update session history
        if (memoryInfo.used > this.history.session.maxMemory) {
            this.history.session.maxMemory = memoryInfo.used;
        }
    }

    /**
     * Get current performance summary
     * @returns {Object} Performance summary
     */
    getPerformanceSummary() {
        return {
            current: { ...this.currentMetrics },
            averages: {
                fps: this._getAverageMetric('frameRate', 300),
                frameTime: this._getAverageMetric('renderTime', 300),
                memoryUsage: this._getAverageMetric('memoryUsage', 300)
            },
            session: { ...this.history.session },
            recommendations: Array.from(this.recommendations),
            systemHealth: this._calculateSystemHealth(),
            uptime: Date.now() - this.startTime
        };
    }

    /**
     * Get detailed operation profiling data
     * @returns {Object} Profiling data
     */
    getProfilingData() {
        const operationStats = new Map();

        for (const [name, times] of this.metrics.calculationTime.entries()) {
            const sorted = [...times].sort((a, b) => a - b);
            operationStats.set(name, {
                count: times.length,
                total: times.reduce((sum, time) => sum + time, 0),
                average: times.reduce((sum, time) => sum + time, 0) / times.length,
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                min: Math.min(...times),
                max: Math.max(...times)
            });
        }

        return {
            operations: Object.fromEntries(operationStats),
            totalOperations: this.history.session.totalOperations,
            criticalPaths: this._identifyCriticalPaths(),
            bottlenecks: this._identifyBottlenecks()
        };
    }

    /**
     * Enable or disable detailed profiling
     * @param {boolean} enabled - Whether to enable profiling
     */
    setDetailedProfiling(enabled) {
        this.config.enableDetailedProfiling = enabled;

        if (enabled) {
            console.log('PerformanceMonitor: Detailed profiling enabled');
        } else {
            console.log('PerformanceMonitor: Detailed profiling disabled');
            // Clear detailed data to save memory
            this.metrics.calculationTime.clear();
        }
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            frameRate: [],
            memoryUsage: [],
            calculationTime: new Map(),
            renderTime: [],
            gcEvents: [],
            userInteractions: [],
            systemLoad: []
        };

        this.recommendations.clear();
        this.startTime = performance.now();
        this.history.session = {
            startTime: Date.now(),
            maxMemory: 0,
            minFPS: 60,
            avgFPS: 60,
            totalOperations: 0
        };

        console.log('PerformanceMonitor: Metrics reset');
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isActive = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('PerformanceMonitor: Stopped');

        if (this.eventManager) {
            this.eventManager.emit('performance:monitorStopped', {
                summary: this.getPerformanceSummary(),
                timestamp: Date.now()
            });
        }
    }

    // Private methods

    /**
     * Initialize performance observer for detailed metrics
     */
    _initializePerformanceObserver() {
        if (typeof PerformanceObserver === 'undefined') return;

        try {
            // Observe navigation and resource timing
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'measure') {
                        this._addCalculationTime(entry.name, entry.duration);
                    } else if (entry.entryType === 'navigation') {
                        this.history.session.loadTime = entry.loadEventEnd - entry.loadEventStart;
                    }
                }
            });

            observer.observe({ entryTypes: ['measure', 'navigation'] });
        } catch (error) {
            console.warn('PerformanceMonitor: Could not initialize PerformanceObserver:', error);
        }
    }

    /**
     * Start the monitoring loop
     */
    _startMonitoringLoop() {
        this.monitoringInterval = setInterval(() => {
            this.recordMemoryUsage();
            this._updateSystemLoad();
            this._analyzePerformanceTrends();
            this._generateRecommendations();
        }, this.config.samplingInterval);
    }

    /**
     * Record operation timing
     * @param {string} name - Operation name
     * @param {number} startTime - Start time
     * @param {Error} error - Error if operation failed
     */
    _recordOperation(name, startTime, error = null) {
        const duration = performance.now() - startTime;
        this._addCalculationTime(name, duration);

        this.history.session.totalOperations++;

        // Remove from operation stack
        const stackIndex = this.operationStack.findIndex(op => op.name === name && op.startTime === startTime);
        if (stackIndex !== -1) {
            this.operationStack.splice(stackIndex, 1);
        }

        if (error) {
            console.warn(`PerformanceMonitor: Operation '${name}' failed after ${duration.toFixed(2)}ms:`, error);
        }
    }

    /**
     * Add a metric value
     * @param {string} type - Metric type
     * @param {number} value - Metric value
     */
    _addMetric(type, value) {
        if (!this.metrics[type]) {
            this.metrics[type] = [];
        }

        this.metrics[type].push({
            value,
            timestamp: performance.now()
        });

        // Limit samples to prevent memory issues
        if (this.metrics[type].length > this.config.maxSamples) {
            this.metrics[type].shift();
        }
    }

    /**
     * Add calculation time for an operation
     * @param {string} name - Operation name
     * @param {number} duration - Duration in milliseconds
     */
    _addCalculationTime(name, duration) {
        if (!this.metrics.calculationTime.has(name)) {
            this.metrics.calculationTime.set(name, []);
        }

        const times = this.metrics.calculationTime.get(name);
        times.push(duration);

        // Limit samples per operation
        if (times.length > this.config.maxSamples / 10) {
            times.shift();
        }
    }

    /**
     * Get average of recent metric values
     * @param {string} type - Metric type
     * @param {number} sampleCount - Number of recent samples
     * @returns {number} Average value
     */
    _getAverageMetric(type, sampleCount = 60) {
        const metrics = this.metrics[type];
        if (!metrics || metrics.length === 0) return 0;

        const samples = metrics.slice(-sampleCount);
        const sum = samples.reduce((total, metric) => total + metric.value, 0);
        return sum / samples.length;
    }

    /**
     * Check performance thresholds and emit warnings
     */
    _checkPerformanceThresholds() {
        const { fps, memoryUsage, averageFrameTime } = this.currentMetrics;
        const { warningThresholds, alertThresholds } = this.config;

        // FPS checks
        if (fps < alertThresholds.fps) {
            this._emitPerformanceAlert('fps', 'critical', fps);
        } else if (fps < warningThresholds.fps) {
            this._emitPerformanceAlert('fps', 'warning', fps);
        }

        // Memory checks
        if (memoryUsage > alertThresholds.memoryMB) {
            this._emitPerformanceAlert('memory', 'critical', memoryUsage);
        } else if (memoryUsage > warningThresholds.memoryMB) {
            this._emitPerformanceAlert('memory', 'warning', memoryUsage);
        }

        // Frame time checks
        if (averageFrameTime > alertThresholds.renderTimeMs) {
            this._emitPerformanceAlert('frameTime', 'critical', averageFrameTime);
        } else if (averageFrameTime > warningThresholds.renderTimeMs) {
            this._emitPerformanceAlert('frameTime', 'warning', averageFrameTime);
        }

        // Update session minimums
        if (fps < this.history.session.minFPS) {
            this.history.session.minFPS = fps;
        }
    }

    /**
     * Emit performance alert
     * @param {string} type - Alert type
     * @param {string} severity - Alert severity
     * @param {number} value - Current value
     */
    _emitPerformanceAlert(type, severity, value) {
        if (this.eventManager) {
            this.eventManager.emit('performance:alert', {
                type,
                severity,
                value,
                threshold: this.config[`${severity}Thresholds`][type],
                timestamp: Date.now(),
                recommendations: this._getRecommendationsForAlert(type)
            });
        }
    }

    /**
     * Update system load metrics
     */
    _updateSystemLoad() {
        // Estimate system load based on performance metrics
        const load = {
            cpu: Math.max(0, Math.min(100, (this.currentMetrics.averageFrameTime - 16.67) / 16.67 * 100)),
            memory: (this.currentMetrics.memoryUsage / this.config.alertThresholds.memoryMB) * 100,
            timestamp: Date.now()
        };

        this._addMetric('systemLoad', load.cpu + load.memory);
    }

    /**
     * Analyze performance trends
     */
    _analyzePerformanceTrends() {
        // Add hourly snapshot if needed
        const now = Date.now();
        const hoursSinceLastSnapshot = this.history.hourly.length === 0 ? 1 :
            (now - this.history.hourly[this.history.hourly.length - 1].timestamp) / (1000 * 60 * 60);

        if (hoursSinceLastSnapshot >= 1) {
            this.history.hourly.push({
                timestamp: now,
                fps: this._getAverageMetric('frameRate', 3600),
                memory: this._getAverageMetric('memoryUsage', 3600),
                operations: this.history.session.totalOperations
            });

            // Keep only last 24 hours
            if (this.history.hourly.length > 24) {
                this.history.hourly.shift();
            }
        }
    }

    /**
     * Generate optimization recommendations
     */
    _generateRecommendations() {
        this.recommendations.clear();

        // FPS recommendations
        if (this.currentMetrics.fps < this.config.warningThresholds.fps) {
            this.recommendations.add('Consider reducing game tick rate or visual effects');
            this.recommendations.add('Check for long-running calculations in game loop');
        }

        // Memory recommendations
        if (this.currentMetrics.memoryUsage > this.config.warningThresholds.memoryMB) {
            this.recommendations.add('Memory usage is high - consider optimizing data structures');
            this.recommendations.add('Check for memory leaks in event listeners or intervals');
        }

        // Operation-specific recommendations
        for (const [name, times] of this.metrics.calculationTime.entries()) {
            if (times.length > 10) {
                const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
                if (avgTime > this.config.warningThresholds.calculationTimeMs) {
                    this.recommendations.add(`Operation '${name}' is slow (${avgTime.toFixed(2)}ms avg)`);
                }
            }
        }
    }

    /**
     * Calculate overall system health score
     * @returns {Object} Health information
     */
    _calculateSystemHealth() {
        let score = 100;
        const issues = [];

        // FPS health (30% weight)
        const fpsRatio = this.currentMetrics.fps / 60;
        if (fpsRatio < 0.5) {
            score -= 30;
            issues.push('Critical FPS issues');
        } else if (fpsRatio < 0.75) {
            score -= 15;
            issues.push('FPS below optimal');
        }

        // Memory health (25% weight)
        const memoryRatio = this.currentMetrics.memoryUsage / this.config.alertThresholds.memoryMB;
        if (memoryRatio > 1) {
            score -= 25;
            issues.push('Critical memory usage');
        } else if (memoryRatio > 0.75) {
            score -= 12;
            issues.push('High memory usage');
        }

        // Stability health (25% weight)
        const recentErrors = this.operationStack.filter(op =>
            performance.now() - op.startTime > 5000
        ).length;
        if (recentErrors > 5) {
            score -= 25;
            issues.push('System instability detected');
        }

        // Performance consistency (20% weight)
        const fpsVariance = this._calculateVariance('frameRate');
        if (fpsVariance > 100) {
            score -= 20;
            issues.push('Inconsistent performance');
        } else if (fpsVariance > 50) {
            score -= 10;
            issues.push('Some performance fluctuation');
        }

        return {
            score: Math.max(0, Math.min(100, score)),
            status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
            issues
        };
    }

    /**
     * Calculate variance for a metric
     * @param {string} type - Metric type
     * @returns {number} Variance
     */
    _calculateVariance(type) {
        const metrics = this.metrics[type];
        if (!metrics || metrics.length < 2) return 0;

        const values = metrics.slice(-60).map(m => m.value);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

        return variance;
    }

    /**
     * Identify critical performance paths
     * @returns {Array} Critical paths
     */
    _identifyCriticalPaths() {
        const paths = [];

        for (const [name, times] of this.metrics.calculationTime.entries()) {
            if (times.length > 5) {
                const totalTime = times.reduce((sum, time) => sum + time, 0);
                const frequency = times.length;
                const impact = totalTime * frequency;

                if (impact > 1000) { // More than 1 second total impact
                    paths.push({
                        operation: name,
                        totalTime,
                        frequency,
                        impact,
                        averageTime: totalTime / frequency
                    });
                }
            }
        }

        return paths.sort((a, b) => b.impact - a.impact);
    }

    /**
     * Identify performance bottlenecks
     * @returns {Array} Bottlenecks
     */
    _identifyBottlenecks() {
        const bottlenecks = [];
        const { warningThresholds } = this.config;

        // Check for consistently slow operations
        for (const [name, times] of this.metrics.calculationTime.entries()) {
            if (times.length > 3) {
                const recentTimes = times.slice(-10);
                const avgTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;

                if (avgTime > warningThresholds.calculationTimeMs) {
                    bottlenecks.push({
                        type: 'slow_operation',
                        operation: name,
                        averageTime: avgTime,
                        threshold: warningThresholds.calculationTimeMs,
                        severity: avgTime > warningThresholds.calculationTimeMs * 2 ? 'high' : 'medium'
                    });
                }
            }
        }

        return bottlenecks;
    }

    /**
     * Get recommendations for specific alert type
     * @param {string} alertType - Type of alert
     * @returns {Array} Recommendations
     */
    _getRecommendationsForAlert(alertType) {
        const recommendations = {
            fps: [
                'Reduce visual effects or animations',
                'Optimize game loop calculations',
                'Consider lowering game tick rate'
            ],
            memory: [
                'Check for memory leaks',
                'Optimize data structures',
                'Clear unused cached data'
            ],
            frameTime: [
                'Profile render operations',
                'Reduce DOM manipulations',
                'Optimize CSS animations'
            ]
        };

        return recommendations[alertType] || [];
    }

    /**
     * Estimate memory usage when navigator.memory is not available
     * @returns {number} Estimated memory usage in MB
     */
    _estimateMemoryUsage() {
        // Rough estimation based on DOM size and operation count
        const domNodes = document.querySelectorAll('*').length;
        const estimatedDOMMemory = domNodes * 0.001; // ~1KB per node estimate
        const operationMemory = this.history.session.totalOperations * 0.0001; // Estimate for operation overhead

        return estimatedDOMMemory + operationMemory;
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceMonitor };
} else if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
}