/**
 * IntegrationMonitor - Advanced integration monitoring and health tracking
 * Extends PerformanceMonitor with integration-specific metrics and validation
 */
class IntegrationMonitor {
    constructor(options = {}) {
        this.performanceMonitor = options.performanceMonitor;
        this.eventManager = options.eventManager;
        this.isActive = false;

        // Integration-specific metrics
        this.integrationMetrics = {
            systemHealth: new Map(),
            testResults: new Map(),
            crossSystemOperations: new Map(),
            eventPropagation: new Map(),
            dataFlow: new Map(),
            integrationErrors: new Map()
        };

        // System registry
        this.systems = new Map([
            ['cultivation', { name: 'Cultivation System', dependencies: ['realm', 'technique'] }],
            ['scripture', { name: 'Scripture System', dependencies: ['enhancement', 'gacha'] }],
            ['combat', { name: 'Combat System', dependencies: ['cultivation', 'technique'] }],
            ['sect', { name: 'Sect System', dependencies: ['cultivation', 'combat'] }],
            ['quest', { name: 'Quest System', dependencies: ['achievement', 'reward'] }],
            ['skill', { name: 'Skill System', dependencies: ['cultivation', 'gacha'] }],
            ['gacha', { name: 'Gacha System', dependencies: ['scripture', 'skill'] }],
            ['enhancement', { name: 'Enhancement System', dependencies: ['scripture'] }],
            ['realm', { name: 'Realm System', dependencies: [] }],
            ['technique', { name: 'Technique System', dependencies: ['cultivation'] }],
            ['reward', { name: 'Reward System', dependencies: [] }],
            ['achievement', { name: 'Achievement System', dependencies: ['quest'] }]
        ]);

        // Health thresholds
        this.healthThresholds = {
            excellent: 95,
            good: 80,
            fair: 60,
            poor: 0
        };

        // Integration test configurations
        this.testConfigurations = {
            dataFlowValidation: {
                timeout: 5000,
                retries: 3,
                criticalPaths: [
                    'cultivation -> scripture',
                    'combat -> sect',
                    'quest -> achievement -> reward',
                    'gacha -> skill -> cultivation'
                ]
            },
            performanceValidation: {
                maxFrameTime: 16.67, // 60 FPS
                maxOperationTime: 10, // 10ms
                maxMemoryIncrease: 5 // 5MB per hour
            },
            eventPropagationValidation: {
                maxPropagationTime: 100, // 100ms
                maxQueueDepth: 1000,
                criticalEvents: [
                    'cultivation:levelUp',
                    'combat:victory',
                    'sect:promotion',
                    'quest:completion'
                ]
            }
        };

        // Error categorization
        this.errorCategories = {
            integration: 'Cross-system communication failures',
            validation: 'Data validation and consistency errors',
            performance: 'Performance threshold violations',
            propagation: 'Event propagation failures',
            dependency: 'System dependency violations',
            timeout: 'Operation timeout errors'
        };

        // Monitoring state
        this.monitoringInterval = null;
        this.healthCheckInterval = null;
        this.lastHealthCheck = 0;
        this.integrationHistory = [];
        this.maxHistorySize = 1000;

        // Event tracking
        this.eventTracker = new Map();
        this.propagationTimes = new Map();
    }

    /**
     * Initialize the integration monitor
     */
    async initialize() {
        try {
            console.log('IntegrationMonitor: Initializing...');

            // Validate dependencies
            if (!this.performanceMonitor) {
                throw new Error('PerformanceMonitor is required');
            }

            // Initialize system health tracking
            this.initializeSystemHealth();

            // Setup event listeners
            this.setupEventListeners();

            // Start monitoring loops
            this.startMonitoring();

            this.isActive = true;
            console.log('IntegrationMonitor: Initialized successfully');

            if (this.eventManager) {
                this.eventManager.emit('integrationMonitor:initialized', {
                    systems: Array.from(this.systems.keys()),
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            console.error('IntegrationMonitor: Initialization failed', error);
            throw error;
        }
    }

    /**
     * Initialize system health tracking
     */
    initializeSystemHealth() {
        for (const [systemId, systemInfo] of this.systems) {
            this.integrationMetrics.systemHealth.set(systemId, {
                id: systemId,
                name: systemInfo.name,
                health: 100,
                status: 'healthy',
                lastCheck: Date.now(),
                dependencies: systemInfo.dependencies,
                metrics: {
                    responseTime: 0,
                    errorRate: 0,
                    throughput: 0,
                    availability: 100
                },
                issues: []
            });
        }
    }

    /**
     * Setup event listeners for integration monitoring
     */
    setupEventListeners() {
        if (!this.eventManager) return;

        // Track all system events for propagation analysis
        const eventTypes = [
            'cultivation:*', 'scripture:*', 'combat:*', 'sect:*',
            'quest:*', 'skill:*', 'gacha:*', 'enhancement:*',
            'realm:*', 'technique:*', 'reward:*', 'achievement:*',
            'integration:*', 'performance:*'
        ];

        eventTypes.forEach(eventType => {
            if (eventType.includes('*')) {
                // For wildcard events, we'll track them when they occur
                const prefix = eventType.replace('*', '');
                this.trackEventPrefix(prefix);
            } else {
                this.eventManager.on(eventType, (data) => {
                    this.trackEventPropagation(eventType, data);
                });
            }
        });

        // Listen for performance alerts
        this.eventManager.on('performance:alert', (data) => {
            this.handlePerformanceAlert(data);
        });
    }

    /**
     * Track event propagation for analysis
     */
    trackEventPropagation(eventType, data) {
        const eventId = this.generateEventId();
        const timestamp = Date.now();

        const eventData = {
            id: eventId,
            type: eventType,
            timestamp,
            source: data.source || 'unknown',
            data: data,
            propagationPath: [data.source || 'unknown'],
            startTime: timestamp,
            endTime: null,
            duration: null,
            failed: false,
            errors: []
        };

        this.eventTracker.set(eventId, eventData);

        // Track propagation timing
        this.measureEventPropagation(eventId, eventType);

        // Update event propagation metrics
        this.updateEventMetrics(eventType, eventData);
    }

    /**
     * Measure event propagation timing
     */
    measureEventPropagation(eventId, eventType) {
        const startTime = performance.now();

        // Set timeout to mark event as completed
        setTimeout(() => {
            const eventData = this.eventTracker.get(eventId);
            if (eventData && !eventData.endTime) {
                eventData.endTime = Date.now();
                eventData.duration = performance.now() - startTime;

                // Check if propagation time exceeds threshold
                if (eventData.duration > this.testConfigurations.eventPropagationValidation.maxPropagationTime) {
                    this.recordIntegrationError('propagation', {
                        event: eventType,
                        duration: eventData.duration,
                        threshold: this.testConfigurations.eventPropagationValidation.maxPropagationTime
                    });
                }

                this.updatePropagationMetrics(eventType, eventData.duration);
            }
        }, this.testConfigurations.eventPropagationValidation.maxPropagationTime + 50);
    }

    /**
     * Start monitoring loops
     */
    startMonitoring() {
        // Health check every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000);

        // Integration metrics update every 5 seconds
        this.monitoringInterval = setInterval(() => {
            this.updateIntegrationMetrics();
        }, 5000);

        // Initial health check
        this.performHealthCheck();
    }

    /**
     * Perform comprehensive system health check
     */
    async performHealthCheck() {
        const startTime = performance.now();

        try {
            for (const [systemId, healthData] of this.integrationMetrics.systemHealth) {
                await this.checkSystemHealth(systemId, healthData);
            }

            this.lastHealthCheck = Date.now();

            // Emit health update event
            if (this.eventManager) {
                this.eventManager.emit('integration:healthUpdate', {
                    systems: Array.from(this.integrationMetrics.systemHealth.values()),
                    overallHealth: this.calculateOverallHealth(),
                    timestamp: this.lastHealthCheck
                });
            }

        } catch (error) {
            console.error('IntegrationMonitor: Health check failed', error);
            this.recordIntegrationError('health_check', { error: error.message });
        }

        const duration = performance.now() - startTime;
        console.log(`IntegrationMonitor: Health check completed in ${duration.toFixed(2)}ms`);
    }

    /**
     * Check individual system health
     */
    async checkSystemHealth(systemId, healthData) {
        const startTime = performance.now();
        let health = 100;
        const issues = [];

        try {
            // Check if system module exists and is responding
            const systemModule = this.getSystemModule(systemId);
            if (!systemModule) {
                health -= 50;
                issues.push('System module not found');
            }

            // Check dependencies
            for (const depId of healthData.dependencies) {
                const depHealth = this.integrationMetrics.systemHealth.get(depId);
                if (!depHealth || depHealth.health < 50) {
                    health -= 10;
                    issues.push(`Dependency ${depId} unhealthy`);
                }
            }

            // Check performance metrics
            if (this.performanceMonitor) {
                const perfSummary = this.performanceMonitor.getPerformanceSummary();

                // Check FPS
                if (perfSummary.current.fps < 30) {
                    health -= 15;
                    issues.push('Low FPS detected');
                }

                // Check memory usage
                if (perfSummary.current.memoryUsage > 150) {
                    health -= 10;
                    issues.push('High memory usage');
                }
            }

            // Check error rates
            const errorRate = this.calculateSystemErrorRate(systemId);
            if (errorRate > 0.1) { // More than 10% error rate
                health -= 20;
                issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
            }

            // Update health data
            healthData.health = Math.max(0, health);
            healthData.status = this.getHealthStatus(health);
            healthData.lastCheck = Date.now();
            healthData.issues = issues;
            healthData.metrics.responseTime = performance.now() - startTime;
            healthData.metrics.errorRate = errorRate;

        } catch (error) {
            console.error(`IntegrationMonitor: Failed to check ${systemId} health`, error);
            healthData.health = 0;
            healthData.status = 'critical';
            healthData.issues = ['Health check failed: ' + error.message];
        }
    }

    /**
     * Get system module reference
     */
    getSystemModule(systemId) {
        // Try to find the system in common locations
        const possibleNames = [
            `${systemId}System`,
            `${systemId}Manager`,
            `${systemId.charAt(0).toUpperCase() + systemId.slice(1)}System`,
            `${systemId.charAt(0).toUpperCase() + systemId.slice(1)}Manager`
        ];

        for (const name of possibleNames) {
            if (typeof window !== 'undefined' && window[name]) {
                return window[name];
            }
        }

        return null;
    }

    /**
     * Calculate system error rate
     */
    calculateSystemErrorRate(systemId) {
        const errors = this.integrationMetrics.integrationErrors.get(systemId) || [];
        const recentErrors = errors.filter(error =>
            Date.now() - error.timestamp < 300000 // Last 5 minutes
        );

        // Estimate total operations (simplified)
        const totalOperations = Math.max(100, recentErrors.length * 10);
        return recentErrors.length / totalOperations;
    }

    /**
     * Get health status from score
     */
    getHealthStatus(health) {
        if (health >= this.healthThresholds.excellent) return 'excellent';
        if (health >= this.healthThresholds.good) return 'healthy';
        if (health >= this.healthThresholds.fair) return 'warning';
        return 'critical';
    }

    /**
     * Calculate overall system health
     */
    calculateOverallHealth() {
        const healthValues = Array.from(this.integrationMetrics.systemHealth.values());
        if (healthValues.length === 0) return 0;

        const totalHealth = healthValues.reduce((sum, system) => sum + system.health, 0);
        return Math.round(totalHealth / healthValues.length);
    }

    /**
     * Update integration metrics
     */
    updateIntegrationMetrics() {
        try {
            // Update event propagation statistics
            this.updateEventPropagationStats();

            // Update cross-system operation metrics
            this.updateCrossSystemMetrics();

            // Clean up old tracking data
            this.cleanupOldData();

        } catch (error) {
            console.error('IntegrationMonitor: Failed to update metrics', error);
        }
    }

    /**
     * Update event propagation statistics
     */
    updateEventPropagationStats() {
        const now = Date.now();
        const recentEvents = Array.from(this.eventTracker.values()).filter(event =>
            now - event.timestamp < 60000 // Last minute
        );

        const eventsPerSecond = recentEvents.length / 60;
        const completedEvents = recentEvents.filter(event => event.endTime);
        const avgPropagationTime = completedEvents.length > 0
            ? completedEvents.reduce((sum, event) => sum + event.duration, 0) / completedEvents.length
            : 0;

        const failedEvents = recentEvents.filter(event => event.failed).length;

        // Store metrics for dashboard
        this.integrationMetrics.eventPropagation.set('current', {
            eventsPerSecond,
            avgPropagationTime,
            failedEvents,
            totalEvents: recentEvents.length,
            timestamp: now
        });
    }

    /**
     * Record integration error
     */
    recordIntegrationError(category, errorData) {
        const error = {
            id: this.generateErrorId(),
            category,
            timestamp: Date.now(),
            data: errorData,
            severity: this.categorizeErrorSeverity(category, errorData)
        };

        const systemErrors = this.integrationMetrics.integrationErrors.get(category) || [];
        systemErrors.push(error);
        this.integrationMetrics.integrationErrors.set(category, systemErrors);

        // Emit error event
        if (this.eventManager) {
            this.eventManager.emit('integration:error', error);
        }

        console.warn('IntegrationMonitor: Integration error recorded', error);
    }

    /**
     * Categorize error severity
     */
    categorizeErrorSeverity(category, errorData) {
        switch (category) {
            case 'propagation':
                return errorData.duration > 500 ? 'critical' : 'warning';
            case 'performance':
                return errorData.value > errorData.threshold * 2 ? 'critical' : 'warning';
            case 'dependency':
                return 'critical';
            case 'timeout':
                return 'critical';
            default:
                return 'warning';
        }
    }

    /**
     * Get system health data
     */
    async getSystemHealth() {
        return {
            overall: this.calculateOverallHealth(),
            systems: Array.from(this.integrationMetrics.systemHealth.values()),
            lastCheck: this.lastHealthCheck,
            isMonitoring: this.isActive
        };
    }

    /**
     * Get integration test results
     */
    async getTestResults() {
        return {
            results: Array.from(this.integrationMetrics.testResults.values()),
            summary: this.calculateTestSummary(),
            coverage: this.calculateTestCoverage()
        };
    }

    /**
     * Get performance metrics for integration
     */
    async getPerformanceMetrics() {
        if (!this.performanceMonitor) {
            return { error: 'PerformanceMonitor not available' };
        }

        const perfSummary = this.performanceMonitor.getPerformanceSummary();
        const profilingData = this.performanceMonitor.getProfilingData();

        return {
            current: perfSummary.current,
            averages: perfSummary.averages,
            operations: profilingData.operations,
            integrationSpecific: this.getIntegrationPerformanceMetrics()
        };
    }

    /**
     * Get integration-specific performance metrics
     */
    getIntegrationPerformanceMetrics() {
        const crossSystemOps = Array.from(this.integrationMetrics.crossSystemOperations.values());

        return {
            crossSystemOperations: crossSystemOps.length,
            avgCrossSystemTime: crossSystemOps.length > 0
                ? crossSystemOps.reduce((sum, op) => sum + op.duration, 0) / crossSystemOps.length
                : 0,
            eventPropagation: this.integrationMetrics.eventPropagation.get('current') || {}
        };
    }

    /**
     * Get error monitoring data
     */
    async getErrorData() {
        const errors = new Map();

        for (const [category, categoryErrors] of this.integrationMetrics.integrationErrors) {
            const recentErrors = categoryErrors.filter(error =>
                Date.now() - error.timestamp < 3600000 // Last hour
            );
            errors.set(category, recentErrors);
        }

        return {
            errors,
            summary: this.calculateErrorSummary(errors),
            trends: this.calculateErrorTrends()
        };
    }

    /**
     * Get event propagation data
     */
    async getEventPropagationData() {
        const recentEvents = Array.from(this.eventTracker.values()).filter(event =>
            Date.now() - event.timestamp < 300000 // Last 5 minutes
        );

        return {
            recentEvents,
            metrics: this.integrationMetrics.eventPropagation.get('current') || {},
            propagationPaths: this.analyzePropagationPaths(recentEvents)
        };
    }

    /**
     * Handle performance alert from PerformanceMonitor
     */
    handlePerformanceAlert(alertData) {
        this.recordIntegrationError('performance', {
            type: alertData.type,
            value: alertData.value,
            threshold: alertData.threshold,
            severity: alertData.severity
        });
    }

    /**
     * Clean up old tracking data
     */
    cleanupOldData() {
        const cutoffTime = Date.now() - 3600000; // 1 hour ago

        // Clean event tracker
        for (const [eventId, eventData] of this.eventTracker) {
            if (eventData.timestamp < cutoffTime) {
                this.eventTracker.delete(eventId);
            }
        }

        // Clean error data
        for (const [category, errors] of this.integrationMetrics.integrationErrors) {
            const recentErrors = errors.filter(error => error.timestamp >= cutoffTime);
            this.integrationMetrics.integrationErrors.set(category, recentErrors);
        }
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isActive = false;

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('IntegrationMonitor: Stopped');
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Placeholder methods for complex calculations
    calculateTestSummary() {
        return { passed: 0, failed: 0, total: 0, coverage: 0 };
    }

    calculateTestCoverage() {
        return 0;
    }

    calculateErrorSummary(errors) {
        return { total: 0, critical: 0, warning: 0 };
    }

    calculateErrorTrends() {
        return [];
    }

    analyzePropagationPaths(events) {
        return {};
    }

    updateCrossSystemMetrics() {
        // Implementation for cross-system metrics
    }

    updateEventMetrics(eventType, eventData) {
        // Implementation for event metrics updates
    }

    updatePropagationMetrics(eventType, duration) {
        // Implementation for propagation metrics
    }

    trackEventPrefix(prefix) {
        // Implementation for tracking wildcard events
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IntegrationMonitor };
} else if (typeof window !== 'undefined') {
    window.IntegrationMonitor = IntegrationMonitor;
}