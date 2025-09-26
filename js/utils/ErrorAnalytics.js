/**
 * ErrorAnalytics - Advanced error pattern detection and analytics system
 * Provides comprehensive error analysis, trends, and insights for debugging
 */
class ErrorAnalytics {
    constructor() {
        this.errors = [];
        this.patterns = new Map();
        this.metrics = {
            totalErrors: 0,
            criticalErrors: 0,
            warningErrors: 0,
            recoveredErrors: 0,
            errorRate: 0,
            recoveryRate: 0,
            averageResolutionTime: 0
        };

        // Time-based tracking
        this.timeWindows = {
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };

        // Pattern detection settings
        this.patternConfig = {
            minOccurrences: 3,
            timeWindow: 60 * 60 * 1000, // 1 hour
            similarityThreshold: 0.8,
            stackTraceDepth: 5
        };

        // Performance tracking
        this.performanceHistory = [];
        this.memoryUsageHistory = [];

        // Error categorization rules
        this.categoryRules = {
            network: ['fetch', 'xhr', 'websocket', 'network', 'cors', 'timeout'],
            ui: ['undefined', 'null', 'element', 'dom', 'querySelector', 'click'],
            memory: ['memory', 'heap', 'allocation', 'garbage', 'oom'],
            performance: ['slow', 'timeout', 'blocked', 'lag', 'freeze'],
            storage: ['localstorage', 'indexeddb', 'quota', 'storage', 'session'],
            validation: ['invalid', 'required', 'format', 'type', 'validation'],
            security: ['cors', 'csp', 'xss', 'csrf', 'unauthorized']
        };

        this.init();
    }

    /**
     * Initialize the analytics system
     */
    init() {
        // Set up periodic analysis
        this.analysisInterval = setInterval(() => {
            this.performPeriodicAnalysis();
        }, 30000); // Every 30 seconds

        // Set up memory monitoring
        this.memoryInterval = setInterval(() => {
            this.trackMemoryUsage();
        }, 10000); // Every 10 seconds

        console.log('ErrorAnalytics: Initialized');
    }

    /**
     * Record a new error for analysis
     */
    recordError(error) {
        try {
            const enhancedError = this.enhanceError(error);
            this.errors.push(enhancedError);

            // Maintain error history limit
            if (this.errors.length > 1000) {
                this.errors = this.errors.slice(-1000);
            }

            // Update real-time metrics
            this.updateMetrics();

            // Detect patterns
            this.detectPatterns(enhancedError);

            // Check for critical conditions
            this.checkCriticalConditions();

        } catch (err) {
            console.error('ErrorAnalytics: Failed to record error', err);
        }
    }

    /**
     * Enhance error with additional metadata
     */
    enhanceError(error) {
        const enhanced = {
            ...error,
            id: error.id || this.generateErrorId(),
            timestamp: error.timestamp || Date.now(),
            category: error.category || this.categorizeError(error),
            fingerprint: this.generateFingerprint(error),
            stackDepth: this.getStackDepth(error.stack),
            userAgent: navigator.userAgent,
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            memoryUsage: this.getCurrentMemoryUsage(),
            performanceMetrics: this.getCurrentPerformanceMetrics()
        };

        return enhanced;
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Categorize error based on message and context
     */
    categorizeError(error) {
        const message = (error.message || '').toLowerCase();
        const stack = (error.stack || '').toLowerCase();
        const searchText = `${message} ${stack}`;

        for (const [category, keywords] of Object.entries(this.categoryRules)) {
            if (keywords.some(keyword => searchText.includes(keyword))) {
                return category;
            }
        }

        return 'general';
    }

    /**
     * Generate error fingerprint for grouping similar errors
     */
    generateFingerprint(error) {
        const message = this.normalizeMessage(error.message || '');
        const stackTop = this.getStackTop(error.stack);
        const type = error.name || 'Error';

        return this.hashString(`${type}:${message}:${stackTop}`);
    }

    /**
     * Normalize error message for pattern matching
     */
    normalizeMessage(message) {
        return message
            .replace(/\d+/g, 'N') // Replace numbers with N
            .replace(/['"]/g, '') // Remove quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .toLowerCase()
            .trim();
    }

    /**
     * Get top stack frame for fingerprinting
     */
    getStackTop(stack) {
        if (!stack) return '';

        const lines = stack.split('\n').slice(1, 3); // Take first 2 frames
        return lines.map(line => {
            // Extract function and file info, normalize line numbers
            return line.replace(/:\d+:\d+/g, ':N:N').trim();
        }).join('|');
    }

    /**
     * Get stack trace depth
     */
    getStackDepth(stack) {
        if (!stack) return 0;
        return stack.split('\n').length - 1;
    }

    /**
     * Simple hash function for fingerprints
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Detect error patterns
     */
    detectPatterns(error) {
        const fingerprint = error.fingerprint;
        const now = Date.now();

        // Initialize pattern tracking for this fingerprint
        if (!this.patterns.has(fingerprint)) {
            this.patterns.set(fingerprint, {
                count: 0,
                firstSeen: now,
                lastSeen: now,
                occurrences: [],
                category: error.category,
                severity: error.severity,
                examples: []
            });
        }

        const pattern = this.patterns.get(fingerprint);
        pattern.count++;
        pattern.lastSeen = now;
        pattern.occurrences.push(now);

        // Keep only recent occurrences
        const cutoff = now - this.patternConfig.timeWindow;
        pattern.occurrences = pattern.occurrences.filter(time => time >= cutoff);

        // Store example errors
        if (pattern.examples.length < 5) {
            pattern.examples.push({
                message: error.message,
                stack: error.stack,
                timestamp: error.timestamp,
                context: error.context
            });
        }

        // Check if this is a new pattern worth alerting
        if (pattern.occurrences.length >= this.patternConfig.minOccurrences) {
            this.handlePattern(fingerprint, pattern);
        }
    }

    /**
     * Handle detected pattern
     */
    handlePattern(fingerprint, pattern) {
        const frequency = pattern.occurrences.length / (this.patternConfig.timeWindow / (60 * 1000)); // errors per minute

        // High frequency pattern detection
        if (frequency > 5) { // More than 5 errors per minute
            console.warn(`ErrorAnalytics: High frequency error pattern detected`, {
                fingerprint,
                frequency: `${frequency.toFixed(1)}/min`,
                count: pattern.count,
                category: pattern.category
            });

            // Emit pattern event if event manager is available
            this.emitPatternEvent('high-frequency', fingerprint, pattern);
        }

        // Recurring pattern detection
        if (pattern.count >= 10 && this.isRecurringPattern(pattern.occurrences)) {
            console.warn(`ErrorAnalytics: Recurring error pattern detected`, {
                fingerprint,
                totalCount: pattern.count,
                category: pattern.category
            });

            this.emitPatternEvent('recurring', fingerprint, pattern);
        }
    }

    /**
     * Check if pattern shows recurring behavior
     */
    isRecurringPattern(occurrences) {
        if (occurrences.length < 5) return false;

        // Check if errors occur at regular intervals
        const intervals = [];
        for (let i = 1; i < occurrences.length; i++) {
            intervals.push(occurrences[i] - occurrences[i - 1]);
        }

        // Calculate variance in intervals
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);

        // If standard deviation is low relative to average, it's recurring
        return stdDev < avgInterval * 0.3;
    }

    /**
     * Emit pattern event
     */
    emitPatternEvent(type, fingerprint, pattern) {
        // Create custom event for pattern detection
        const event = new CustomEvent('errorPattern', {
            detail: {
                type,
                fingerprint,
                pattern: {
                    count: pattern.count,
                    category: pattern.category,
                    severity: pattern.severity,
                    firstSeen: pattern.firstSeen,
                    lastSeen: pattern.lastSeen,
                    frequency: pattern.occurrences.length / (this.patternConfig.timeWindow / (60 * 1000))
                }
            }
        });

        window.dispatchEvent(event);
    }

    /**
     * Update metrics
     */
    updateMetrics() {
        const now = Date.now();
        const recentErrors = this.getErrorsInTimeWindow('1h');

        this.metrics.totalErrors = this.errors.length;
        this.metrics.criticalErrors = this.errors.filter(e => e.severity === 'critical' || e.severity === 'error').length;
        this.metrics.warningErrors = this.errors.filter(e => e.severity === 'warning').length;
        this.metrics.recoveredErrors = this.errors.filter(e => e.recovered).length;

        // Calculate error rate (errors per hour)
        this.metrics.errorRate = recentErrors.length;

        // Calculate recovery rate
        this.metrics.recoveryRate = this.metrics.totalErrors > 0
            ? (this.metrics.recoveredErrors / this.metrics.totalErrors) * 100
            : 0;

        // Calculate average resolution time
        this.metrics.averageResolutionTime = this.calculateAverageResolutionTime();
    }

    /**
     * Get errors within a specific time window
     */
    getErrorsInTimeWindow(window) {
        const cutoff = Date.now() - this.timeWindows[window];
        return this.errors.filter(error => error.timestamp >= cutoff);
    }

    /**
     * Calculate average resolution time for recovered errors
     */
    calculateAverageResolutionTime() {
        const recoveredErrors = this.errors.filter(e => e.recovered && e.recoveryTime);
        if (recoveredErrors.length === 0) return 0;

        const totalTime = recoveredErrors.reduce((sum, error) => {
            return sum + (error.recoveryTime - error.timestamp);
        }, 0);

        return totalTime / recoveredErrors.length;
    }

    /**
     * Perform periodic analysis
     */
    performPeriodicAnalysis() {
        try {
            this.updateMetrics();
            this.analyzeErrorTrends();
            this.cleanupOldData();
            this.trackPerformanceMetrics();

        } catch (error) {
            console.error('ErrorAnalytics: Periodic analysis failed', error);
        }
    }

    /**
     * Analyze error trends
     */
    analyzeErrorTrends() {
        const windows = ['5m', '15m', '1h'];
        const trends = {};

        windows.forEach(window => {
            const errors = this.getErrorsInTimeWindow(window);
            const criticalCount = errors.filter(e => e.severity === 'critical' || e.severity === 'error').length;

            trends[window] = {
                total: errors.length,
                critical: criticalCount,
                rate: errors.length / (this.timeWindows[window] / (60 * 1000)) // per minute
            };
        });

        // Detect escalating error rates
        if (trends['5m'].rate > trends['15m'].rate * 2 && trends['5m'].total > 5) {
            this.emitTrendEvent('escalating', trends);
        }

        // Detect error spikes
        if (trends['5m'].critical > 3 && trends['15m'].critical < 2) {
            this.emitTrendEvent('critical-spike', trends);
        }
    }

    /**
     * Emit trend event
     */
    emitTrendEvent(type, trends) {
        const event = new CustomEvent('errorTrend', {
            detail: { type, trends, timestamp: Date.now() }
        });

        window.dispatchEvent(event);
    }

    /**
     * Clean up old data
     */
    cleanupOldData() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

        // Remove old errors
        this.errors = this.errors.filter(error => error.timestamp >= cutoff);

        // Clean up old patterns
        for (const [fingerprint, pattern] of this.patterns.entries()) {
            if (pattern.lastSeen < cutoff) {
                this.patterns.delete(fingerprint);
            }
        }

        // Clean up performance history
        this.performanceHistory = this.performanceHistory.filter(entry => entry.timestamp >= cutoff);
        this.memoryUsageHistory = this.memoryUsageHistory.filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Track performance metrics
     */
    trackPerformanceMetrics() {
        const metrics = this.getCurrentPerformanceMetrics();

        this.performanceHistory.push({
            timestamp: Date.now(),
            ...metrics
        });

        // Keep only last 1000 entries
        if (this.performanceHistory.length > 1000) {
            this.performanceHistory = this.performanceHistory.slice(-1000);
        }
    }

    /**
     * Get current performance metrics
     */
    getCurrentPerformanceMetrics() {
        const perf = performance;
        const timing = perf.timing;

        return {
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            pageLoadTime: timing.loadEventEnd - timing.loadEventStart,
            resourceLoadTime: timing.loadEventStart - timing.domContentLoadedEventEnd,
            renderTime: timing.domComplete - timing.domLoading
        };
    }

    /**
     * Track memory usage
     */
    trackMemoryUsage() {
        const memory = this.getCurrentMemoryUsage();

        this.memoryUsageHistory.push({
            timestamp: Date.now(),
            ...memory
        });

        // Keep only last 1000 entries
        if (this.memoryUsageHistory.length > 1000) {
            this.memoryUsageHistory = this.memoryUsageHistory.slice(-1000);
        }
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }

        return { used: 0, total: 0, limit: 0 };
    }

    /**
     * Check for critical conditions
     */
    checkCriticalConditions() {
        const recentErrors = this.getErrorsInTimeWindow('5m');
        const criticalErrors = recentErrors.filter(e => e.severity === 'critical' || e.severity === 'error');

        // Check for error storm (many errors in short time)
        if (recentErrors.length > 20) {
            this.emitCriticalEvent('error-storm', {
                count: recentErrors.length,
                timeWindow: '5m'
            });
        }

        // Check for critical error burst
        if (criticalErrors.length > 5) {
            this.emitCriticalEvent('critical-burst', {
                count: criticalErrors.length,
                timeWindow: '5m'
            });
        }

        // Check memory conditions
        const memory = this.getCurrentMemoryUsage();
        if (memory.used > memory.limit * 0.9) {
            this.emitCriticalEvent('memory-critical', {
                used: memory.used,
                limit: memory.limit,
                percentage: (memory.used / memory.limit) * 100
            });
        }
    }

    /**
     * Emit critical event
     */
    emitCriticalEvent(type, data) {
        const event = new CustomEvent('criticalCondition', {
            detail: { type, data, timestamp: Date.now() }
        });

        window.dispatchEvent(event);
        console.error(`ErrorAnalytics: Critical condition detected - ${type}`, data);
    }

    /**
     * Get comprehensive statistics
     */
    getStatistics() {
        return {
            ...this.metrics,
            patterns: this.patterns.size,
            categories: this.getCategoryBreakdown(),
            trends: this.getErrorTrends(),
            performance: this.getPerformanceSummary(),
            memory: this.getMemorySummary()
        };
    }

    /**
     * Get error breakdown by category
     */
    getCategoryBreakdown() {
        const breakdown = {};

        this.errors.forEach(error => {
            const category = error.category || 'general';
            breakdown[category] = (breakdown[category] || 0) + 1;
        });

        return breakdown;
    }

    /**
     * Get error trends for different time windows
     */
    getErrorTrends() {
        const trends = {};

        Object.keys(this.timeWindows).forEach(window => {
            const errors = this.getErrorsInTimeWindow(window);
            trends[window] = {
                total: errors.length,
                critical: errors.filter(e => e.severity === 'critical' || e.severity === 'error').length,
                warnings: errors.filter(e => e.severity === 'warning').length,
                recovered: errors.filter(e => e.recovered).length
            };
        });

        return trends;
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        if (this.performanceHistory.length === 0) return null;

        const recent = this.performanceHistory.slice(-10); // Last 10 entries
        const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

        return {
            averageLoadTime: avg(recent.map(p => p.loadTime)),
            averageRenderTime: avg(recent.map(p => p.renderTime)),
            samples: recent.length
        };
    }

    /**
     * Get memory summary
     */
    getMemorySummary() {
        if (this.memoryUsageHistory.length === 0) return null;

        const recent = this.memoryUsageHistory.slice(-10); // Last 10 entries
        const current = recent[recent.length - 1];

        return {
            current: current,
            trend: this.calculateMemoryTrend(recent),
            samples: recent.length
        };
    }

    /**
     * Calculate memory usage trend
     */
    calculateMemoryTrend(samples) {
        if (samples.length < 2) return 'stable';

        const first = samples[0].used;
        const last = samples[samples.length - 1].used;
        const change = ((last - first) / first) * 100;

        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    /**
     * Get pattern analysis
     */
    getPatternAnalysis() {
        const patterns = Array.from(this.patterns.entries()).map(([fingerprint, pattern]) => ({
            fingerprint,
            count: pattern.count,
            category: pattern.category,
            severity: pattern.severity,
            firstSeen: pattern.firstSeen,
            lastSeen: pattern.lastSeen,
            frequency: pattern.occurrences.length / (this.patternConfig.timeWindow / (60 * 1000)),
            isRecurring: this.isRecurringPattern(pattern.occurrences),
            examples: pattern.examples.slice(0, 3) // First 3 examples
        }));

        // Sort by frequency
        patterns.sort((a, b) => b.frequency - a.frequency);

        return patterns;
    }

    /**
     * Export analytics data
     */
    exportData() {
        return {
            timestamp: Date.now(),
            metrics: this.metrics,
            patterns: this.getPatternAnalysis(),
            trends: this.getErrorTrends(),
            performance: this.getPerformanceSummary(),
            memory: this.getMemorySummary(),
            categoryBreakdown: this.getCategoryBreakdown(),
            recentErrors: this.errors.slice(-50), // Last 50 errors
            config: this.patternConfig
        };
    }

    /**
     * Reset analytics data
     */
    reset() {
        this.errors = [];
        this.patterns.clear();
        this.performanceHistory = [];
        this.memoryUsageHistory = [];
        this.updateMetrics();

        console.log('ErrorAnalytics: Data reset');
    }

    /**
     * Destroy the analytics system
     */
    destroy() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }

        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }

        this.reset();
        console.log('ErrorAnalytics: Destroyed');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorAnalytics;
}

// Global registration
window.ErrorAnalytics = ErrorAnalytics;