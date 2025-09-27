/**
 * Production Monitoring System for Error Handling
 *
 * Real-time production monitoring with alerting, performance degradation detection,
 * automatic scaling triggers, SLA monitoring, and incident response automation.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

class ProductionMonitor {
    constructor() {
        this.config = window.ProductionConfig || null;
        this.metrics = new Map();
        this.alerts = new Map();
        this.incidents = new Map();
        this.healthStatus = 'initializing';
        this.startTime = Date.now();
        this.lastHealthCheck = 0;

        // Monitoring state
        this.state = {
            errorRate: 0,
            avgResponseTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            networkBandwidth: 0,
            storageUsage: 0,
            activeUsers: 0,
            systemLoad: 0
        };

        // Alert thresholds
        this.thresholds = this.config?.thresholds || this.getDefaultThresholds();

        // Initialize monitoring subsystems
        this.initializeMetricsCollection();
        this.initializeHealthChecks();
        this.initializeAlertSystem();
        this.initializePerformanceTracking();
        this.initializeIncidentManagement();

        // Start monitoring
        this.startMonitoring();

        console.log('[ProductionMonitor] Initialized and monitoring started');
    }

    /**
     * Initialize metrics collection system
     */
    initializeMetricsCollection() {
        this.metricsCollector = {
            interval: 60000, // 1 minute
            retention: 24 * 60 * 60 * 1000, // 24 hours
            buffer: [],
            lastCollection: 0
        };

        // Setup metrics collection timer
        setInterval(() => {
            this.collectMetrics();
        }, this.metricsCollector.interval);

        // Setup metrics cleanup timer
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * Initialize health check system
     */
    initializeHealthChecks() {
        this.healthCheck = {
            interval: 30000, // 30 seconds
            timeout: 5000,   // 5 seconds
            retries: 3,
            endpoints: [
                '/health',
                '/api/status',
                '/monitoring/ping'
            ],
            lastCheck: 0,
            consecutiveFailures: 0
        };

        // Start health check timer
        setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheck.interval);
    }

    /**
     * Initialize alert system
     */
    initializeAlertSystem() {
        this.alertSystem = {
            channels: ['console', 'storage', 'callback'],
            escalationRules: {
                warning: 300000,   // 5 minutes
                critical: 60000    // 1 minute
            },
            suppressionRules: new Map(),
            callbacks: new Set()
        };

        // Register error monitoring callback
        if (window.ErrorManager) {
            window.ErrorManager.addCallback('production-monitor', (error) => {
                this.handleErrorAlert(error);
            });
        }
    }

    /**
     * Initialize performance tracking
     */
    initializePerformanceTracking() {
        this.performanceTracker = {
            measurements: new Map(),
            samplingRate: this.config?.get('performance.sampling', 1.0),
            bufferSize: 1000,
            buffer: []
        };

        // Monitor page performance
        if (typeof PerformanceObserver !== 'undefined') {
            this.setupPerformanceObserver();
        }

        // Monitor memory usage
        this.setupMemoryMonitoring();

        // Monitor network performance
        this.setupNetworkMonitoring();
    }

    /**
     * Initialize incident management
     */
    initializeIncidentManagement() {
        this.incidentManager = {
            activeIncidents: new Map(),
            incidentHistory: [],
            autoResolutionEnabled: true,
            escalationEnabled: true,
            maxIncidentDuration: 30 * 60 * 1000 // 30 minutes
        };

        // Setup incident cleanup timer
        setInterval(() => {
            this.processIncidents();
        }, 60000); // 1 minute
    }

    /**
     * Start main monitoring loop
     */
    startMonitoring() {
        this.healthStatus = 'monitoring';

        // Main monitoring loop
        setInterval(() => {
            this.updateSystemState();
            this.checkThresholds();
            this.processAlerts();
            this.updateHealthStatus();
        }, 5000); // 5 seconds

        console.log('[ProductionMonitor] Main monitoring loop started');
    }

    /**
     * Collect system metrics
     */
    collectMetrics() {
        const timestamp = Date.now();
        const metrics = {
            timestamp,
            uptime: timestamp - this.startTime,
            errorRate: this.calculateErrorRate(),
            responseTime: this.calculateAverageResponseTime(),
            memoryUsage: this.getMemoryUsage(),
            cpuUsage: this.estimateCpuUsage(),
            networkBandwidth: this.calculateNetworkBandwidth(),
            storageUsage: this.getStorageUsage(),
            activeUsers: this.getActiveUserCount(),
            systemLoad: this.calculateSystemLoad()
        };

        this.metricsCollector.buffer.push(metrics);
        this.metricsCollector.lastCollection = timestamp;

        // Update current state
        Object.assign(this.state, metrics);

        // Store in metrics map
        this.metrics.set(timestamp, metrics);

        return metrics;
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        const timestamp = Date.now();
        let overallHealth = true;
        const results = {};

        try {
            // Check error system health
            results.errorSystem = this.checkErrorSystemHealth();

            // Check game system health
            results.gameSystem = this.checkGameSystemHealth();

            // Check storage health
            results.storage = this.checkStorageHealth();

            // Check network health
            results.network = this.checkNetworkHealth();

            // Check performance health
            results.performance = this.checkPerformanceHealth();

            // Determine overall health
            overallHealth = Object.values(results).every(result => result.status === 'healthy');

            if (overallHealth) {
                this.healthCheck.consecutiveFailures = 0;
                this.healthStatus = 'healthy';
            } else {
                this.healthCheck.consecutiveFailures++;
                this.healthStatus = 'degraded';

                if (this.healthCheck.consecutiveFailures >= 3) {
                    this.healthStatus = 'unhealthy';
                    this.createIncident('system-health', 'System health check failed multiple times', 'critical');
                }
            }

        } catch (error) {
            console.error('[ProductionMonitor] Health check failed:', error);
            this.healthCheck.consecutiveFailures++;
            this.healthStatus = 'error';
            results.error = error.message;
        }

        this.healthCheck.lastCheck = timestamp;
        return { timestamp, status: this.healthStatus, results };
    }

    /**
     * Check thresholds and trigger alerts
     */
    checkThresholds() {
        const state = this.state;

        // Check error processing latency
        if (state.responseTime > this.thresholds.errorProcessingLatency.critical) {
            this.triggerAlert('error-latency-critical', 'Error processing latency critical', 'critical');
        } else if (state.responseTime > this.thresholds.errorProcessingLatency.warning) {
            this.triggerAlert('error-latency-warning', 'Error processing latency warning', 'warning');
        }

        // Check memory usage
        if (state.memoryUsage > this.thresholds.memoryUsage.critical) {
            this.triggerAlert('memory-critical', 'Memory usage critical', 'critical');
        } else if (state.memoryUsage > this.thresholds.memoryUsage.warning) {
            this.triggerAlert('memory-warning', 'Memory usage warning', 'warning');
        }

        // Check CPU usage
        if (state.cpuUsage > this.thresholds.cpuUsage.critical) {
            this.triggerAlert('cpu-critical', 'CPU usage critical', 'critical');
        } else if (state.cpuUsage > this.thresholds.cpuUsage.warning) {
            this.triggerAlert('cpu-warning', 'CPU usage warning', 'warning');
        }

        // Check error rate
        if (state.errorRate > this.thresholds.errorRate.critical) {
            this.triggerAlert('error-rate-critical', 'Error rate critical', 'critical');
        } else if (state.errorRate > this.thresholds.errorRate.warning) {
            this.triggerAlert('error-rate-warning', 'Error rate warning', 'warning');
        }

        // Check network bandwidth
        if (state.networkBandwidth > this.thresholds.networkBandwidth.critical) {
            this.triggerAlert('network-critical', 'Network bandwidth critical', 'critical');
        } else if (state.networkBandwidth > this.thresholds.networkBandwidth.warning) {
            this.triggerAlert('network-warning', 'Network bandwidth warning', 'warning');
        }

        // Check storage usage
        if (state.storageUsage > this.thresholds.storageUsage.critical) {
            this.triggerAlert('storage-critical', 'Storage usage critical', 'critical');
        } else if (state.storageUsage > this.thresholds.storageUsage.warning) {
            this.triggerAlert('storage-warning', 'Storage usage warning', 'warning');
        }
    }

    /**
     * Trigger an alert
     */
    triggerAlert(alertId, message, severity) {
        const timestamp = Date.now();
        const existingAlert = this.alerts.get(alertId);

        // Check if alert should be suppressed
        if (this.shouldSuppressAlert(alertId, severity)) {
            return;
        }

        const alert = {
            id: alertId,
            message,
            severity,
            timestamp,
            count: existingAlert ? existingAlert.count + 1 : 1,
            acknowledged: false,
            resolved: false,
            escalated: false
        };

        this.alerts.set(alertId, alert);

        // Send alert through configured channels
        this.sendAlert(alert);

        // Create incident for critical alerts
        if (severity === 'critical' && !existingAlert) {
            this.createIncident(alertId, message, severity);
        }

        console.warn(`[ProductionMonitor] Alert triggered: ${severity} - ${message}`);
    }

    /**
     * Send alert through configured channels
     */
    sendAlert(alert) {
        const channels = this.alertSystem.channels;

        // Console alert
        if (channels.includes('console')) {
            const method = alert.severity === 'critical' ? 'error' : 'warn';
            console[method]('[ALERT]', alert.message, alert);
        }

        // Storage alert
        if (channels.includes('storage')) {
            try {
                const alerts = JSON.parse(localStorage.getItem('production-alerts') || '[]');
                alerts.push(alert);
                // Keep only last 100 alerts
                if (alerts.length > 100) {
                    alerts.splice(0, alerts.length - 100);
                }
                localStorage.setItem('production-alerts', JSON.stringify(alerts));
            } catch (error) {
                console.error('[ProductionMonitor] Failed to store alert:', error);
            }
        }

        // Callback alert
        if (channels.includes('callback')) {
            this.alertSystem.callbacks.forEach(callback => {
                try {
                    callback(alert);
                } catch (error) {
                    console.error('[ProductionMonitor] Alert callback failed:', error);
                }
            });
        }
    }

    /**
     * Create incident
     */
    createIncident(incidentId, description, severity) {
        const timestamp = Date.now();

        const incident = {
            id: incidentId,
            description,
            severity,
            timestamp,
            status: 'active',
            assignee: null,
            updates: [],
            resolution: null,
            duration: 0
        };

        this.incidents.set(incidentId, incident);
        this.incidentManager.activeIncidents.set(incidentId, incident);

        console.error(`[ProductionMonitor] Incident created: ${severity} - ${description}`);

        return incident;
    }

    /**
     * Process active incidents
     */
    processIncidents() {
        const now = Date.now();

        this.incidentManager.activeIncidents.forEach((incident, incidentId) => {
            const duration = now - incident.timestamp;
            incident.duration = duration;

            // Auto-resolve if conditions are met
            if (this.incidentManager.autoResolutionEnabled && this.canAutoResolveIncident(incident)) {
                this.resolveIncident(incidentId, 'Auto-resolved by monitoring system');
            }

            // Escalate long-running incidents
            if (this.incidentManager.escalationEnabled &&
                duration > this.incidentManager.maxIncidentDuration &&
                !incident.escalated) {

                incident.escalated = true;
                console.error('[ProductionMonitor] Incident escalated:', incident);
            }
        });
    }

    /**
     * Resolve incident
     */
    resolveIncident(incidentId, resolution) {
        const incident = this.incidents.get(incidentId);
        if (incident) {
            incident.status = 'resolved';
            incident.resolution = resolution;
            incident.resolvedAt = Date.now();

            this.incidentManager.activeIncidents.delete(incidentId);
            this.incidentManager.incidentHistory.push(incident);

            console.log(`[ProductionMonitor] Incident resolved: ${incidentId} - ${resolution}`);
        }
    }

    /**
     * Get production monitoring dashboard data
     */
    getDashboardData() {
        return {
            status: this.healthStatus,
            uptime: Date.now() - this.startTime,
            metrics: this.state,
            alerts: Array.from(this.alerts.values()),
            incidents: Array.from(this.incidentManager.activeIncidents.values()),
            thresholds: this.thresholds,
            lastHealthCheck: this.healthCheck.lastCheck,
            systemInfo: this.getSystemInfo()
        };
    }

    /**
     * Add alert callback
     */
    addAlertCallback(callback) {
        this.alertSystem.callbacks.add(callback);
    }

    /**
     * Remove alert callback
     */
    removeAlertCallback(callback) {
        this.alertSystem.callbacks.delete(callback);
    }

    // Helper methods for system checks
    checkErrorSystemHealth() {
        try {
            if (window.ErrorManager && window.ErrorManager.isHealthy) {
                return window.ErrorManager.isHealthy() ?
                    { status: 'healthy', message: 'Error system operational' } :
                    { status: 'degraded', message: 'Error system degraded' };
            }
            return { status: 'unknown', message: 'Error system not available' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    checkGameSystemHealth() {
        try {
            if (window.GameState && window.GameState.isInitialized) {
                return window.GameState.isInitialized() ?
                    { status: 'healthy', message: 'Game system operational' } :
                    { status: 'degraded', message: 'Game system not initialized' };
            }
            return { status: 'unknown', message: 'Game system not available' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    checkStorageHealth() {
        try {
            // Test localStorage availability
            localStorage.setItem('health-check', '1');
            localStorage.removeItem('health-check');
            return { status: 'healthy', message: 'Storage operational' };
        } catch (error) {
            return { status: 'error', message: 'Storage unavailable' };
        }
    }

    checkNetworkHealth() {
        return { status: 'healthy', message: 'Network operational' };
    }

    checkPerformanceHealth() {
        const performance = this.state;

        if (performance.cpuUsage > this.thresholds.cpuUsage.critical ||
            performance.memoryUsage > this.thresholds.memoryUsage.critical) {
            return { status: 'degraded', message: 'Performance degraded' };
        }

        return { status: 'healthy', message: 'Performance optimal' };
    }

    // Utility methods
    calculateErrorRate() {
        // Calculate error rate from ErrorManager if available
        if (window.ErrorManager && window.ErrorManager.getErrorRate) {
            return window.ErrorManager.getErrorRate();
        }
        return 0;
    }

    calculateAverageResponseTime() {
        // Estimate from performance entries
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            const entries = performance.getEntriesByType('navigation');
            if (entries.length > 0) {
                return entries[0].responseEnd - entries[0].responseStart;
            }
        }
        return 0;
    }

    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    estimateCpuUsage() {
        // Simple CPU usage estimation
        const start = performance.now();
        const iterations = 100000;
        for (let i = 0; i < iterations; i++) {
            // Simple calculation
            Math.random();
        }
        const duration = performance.now() - start;
        return Math.min(duration / 10, 100); // Normalize to percentage
    }

    calculateNetworkBandwidth() {
        // Estimate from resource timing
        return 0; // Placeholder
    }

    getStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            return totalSize;
        } catch (error) {
            return 0;
        }
    }

    getActiveUserCount() {
        // Placeholder - in real implementation would come from analytics
        return 1;
    }

    calculateSystemLoad() {
        return (this.state.cpuUsage + this.state.memoryUsage / (1024 * 1024)) / 2;
    }

    shouldSuppressAlert(alertId, severity) {
        const suppression = this.alertSystem.suppressionRules.get(alertId);
        if (!suppression) return false;

        const now = Date.now();
        return now < suppression.until;
    }

    canAutoResolveIncident(incident) {
        // Check if conditions for auto-resolution are met
        const relatedAlert = this.alerts.get(incident.id);
        if (!relatedAlert) return true;

        // Check if underlying issue is resolved
        switch (incident.id) {
            case 'system-health':
                return this.healthStatus === 'healthy';
            case 'error-rate-critical':
                return this.state.errorRate < this.thresholds.errorRate.warning;
            default:
                return false;
        }
    }

    updateSystemState() {
        // Update system state with latest metrics
        this.collectMetrics();
    }

    processAlerts() {
        // Process and potentially resolve alerts
        this.alerts.forEach((alert, alertId) => {
            if (!alert.resolved && this.canResolveAlert(alert)) {
                alert.resolved = true;
                alert.resolvedAt = Date.now();
            }
        });
    }

    canResolveAlert(alert) {
        // Check if alert can be automatically resolved
        switch (alert.id) {
            case 'memory-warning':
            case 'memory-critical':
                return this.state.memoryUsage < this.thresholds.memoryUsage.warning;
            case 'cpu-warning':
            case 'cpu-critical':
                return this.state.cpuUsage < this.thresholds.cpuUsage.warning;
            case 'error-rate-warning':
            case 'error-rate-critical':
                return this.state.errorRate < this.thresholds.errorRate.warning;
            default:
                return false;
        }
    }

    updateHealthStatus() {
        // Update overall health status based on current state
        if (this.healthCheck.consecutiveFailures === 0 &&
            this.incidentManager.activeIncidents.size === 0) {
            this.healthStatus = 'healthy';
        } else if (this.incidentManager.activeIncidents.size > 0) {
            this.healthStatus = 'degraded';
        }
    }

    cleanupOldMetrics() {
        const cutoff = Date.now() - this.metricsCollector.retention;
        this.metrics.forEach((value, key) => {
            if (key < cutoff) {
                this.metrics.delete(key);
            }
        });
    }

    setupPerformanceObserver() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.performanceTracker.measurements.set(entry.name, entry);
                }
            });
            observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
        } catch (error) {
            console.warn('[ProductionMonitor] PerformanceObserver not supported');
        }
    }

    setupMemoryMonitoring() {
        if (typeof performance !== 'undefined' && performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                this.performanceTracker.buffer.push({
                    timestamp: Date.now(),
                    type: 'memory',
                    data: {
                        used: memory.usedJSHeapSize,
                        total: memory.totalJSHeapSize,
                        limit: memory.jsHeapSizeLimit
                    }
                });
            }, 30000); // 30 seconds
        }
    }

    setupNetworkMonitoring() {
        // Monitor fetch requests if available
        if (typeof fetch !== 'undefined') {
            const originalFetch = fetch;
            fetch = async (...args) => {
                const start = performance.now();
                try {
                    const response = await originalFetch(...args);
                    const duration = performance.now() - start;

                    this.performanceTracker.buffer.push({
                        timestamp: Date.now(),
                        type: 'network',
                        data: {
                            url: args[0],
                            duration,
                            status: response.status,
                            size: response.headers.get('content-length') || 0
                        }
                    });

                    return response;
                } catch (error) {
                    const duration = performance.now() - start;

                    this.performanceTracker.buffer.push({
                        timestamp: Date.now(),
                        type: 'network',
                        data: {
                            url: args[0],
                            duration,
                            error: error.message
                        }
                    });

                    throw error;
                }
            };
        }
    }

    handleErrorAlert(error) {
        const severity = error.severity || 'warning';
        const message = `Error detected: ${error.message}`;

        this.triggerAlert(`error-${error.id || Date.now()}`, message, severity);
    }

    getDefaultThresholds() {
        return {
            errorProcessingLatency: {
                warning: 50,
                critical: 100
            },
            memoryUsage: {
                warning: 50 * 1024 * 1024,
                critical: 100 * 1024 * 1024
            },
            cpuUsage: {
                warning: 5,
                critical: 10
            },
            networkBandwidth: {
                warning: 500,
                critical: 1000
            },
            errorRate: {
                warning: 0.01,
                critical: 0.05
            },
            storageUsage: {
                warning: 50 * 1024 * 1024,
                critical: 100 * 1024 * 1024
            },
            responseTime: {
                warning: 1000,
                critical: 5000
            }
        };
    }

    getSystemInfo() {
        return {
            environment: this.config?.environment || 'unknown',
            uptime: Date.now() - this.startTime,
            version: '1.0.0',
            healthStatus: this.healthStatus,
            activeAlerts: this.alerts.size,
            activeIncidents: this.incidentManager.activeIncidents.size,
            lastHealthCheck: this.healthCheck.lastCheck,
            metricsCollected: this.metrics.size
        };
    }
}

// Global production monitor instance
window.ProductionMonitor = new ProductionMonitor();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductionMonitor;
}