/**
 * Error System Migration and Rollout System
 *
 * Phased rollout automation, A/B testing framework, gradual feature enablement,
 * rollback triggers, user communication, and comprehensive migration management
 * for the production error handling system.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

const fs = require('fs');
const path = require('path');

class ErrorSystemRollout {
    constructor() {
        this.config = {
            rolloutPhases: [
                { name: 'canary', percentage: 5, duration: 24 * 60 * 60 * 1000 }, // 24 hours
                { name: 'early', percentage: 25, duration: 48 * 60 * 60 * 1000 },  // 48 hours
                { name: 'majority', percentage: 75, duration: 72 * 60 * 60 * 1000 }, // 72 hours
                { name: 'complete', percentage: 100, duration: Infinity }
            ],

            abTestGroups: [
                { name: 'control', percentage: 50 },
                { name: 'treatment', percentage: 50 }
            ],

            features: [
                { name: 'advancedClassification', rolloutType: 'gradual', defaultEnabled: false },
                { name: 'autoRecovery', rolloutType: 'ab_test', defaultEnabled: false },
                { name: 'realTimeAnalytics', rolloutType: 'phased', defaultEnabled: false },
                { name: 'securityEnforcement', rolloutType: 'immediate', defaultEnabled: true },
                { name: 'performanceOptimization', rolloutType: 'gradual', defaultEnabled: true }
            ],

            rollbackTriggers: {
                errorRateThreshold: 0.05, // 5%
                performanceDegradation: 50, // 50% slower
                userComplaintThreshold: 10,
                systemFailureCount: 3,
                autoRollbackEnabled: true
            },

            monitoring: {
                healthCheckInterval: 30000, // 30 seconds
                metricsCollectionInterval: 60000, // 1 minute
                alertingThreshold: 0.02, // 2% error rate
                performanceBaseline: 1000 // 1 second response time
            }
        };

        this.state = {
            currentPhase: null,
            startTime: null,
            rolloutId: this.generateRolloutId(),
            userGroups: new Map(),
            featureStates: new Map(),
            metrics: {
                errorRate: 0,
                performanceMetrics: {},
                userFeedback: [],
                systemHealth: 'unknown'
            },
            rollbacks: [],
            alerts: [],
            migrations: []
        };

        this.logger = this.createLogger();
        this.initializeFeatureStates();
    }

    /**
     * Initialize feature states
     */
    initializeFeatureStates() {
        this.config.features.forEach(feature => {
            this.state.featureStates.set(feature.name, {
                enabled: feature.defaultEnabled,
                rolloutType: feature.rolloutType,
                enabledPercentage: feature.defaultEnabled ? 100 : 0,
                abTestGroup: null,
                lastUpdate: Date.now()
            });
        });
    }

    /**
     * Start phased rollout
     */
    async startRollout(options = {}) {
        const { skipValidation, force, targetPhase } = options;

        this.logger.info('Starting error system rollout', {
            rolloutId: this.state.rolloutId,
            targetPhase,
            force,
            skipValidation
        });

        try {
            // Pre-rollout validation
            if (!skipValidation) {
                await this.preRolloutValidation();
            }

            // Initialize rollout state
            this.state.startTime = Date.now();
            this.state.currentPhase = this.config.rolloutPhases[0];

            // Create rollout record
            await this.createRolloutRecord();

            // Start monitoring
            this.startMonitoring();

            // Execute phased rollout
            for (const phase of this.config.rolloutPhases) {
                if (targetPhase && phase.name !== targetPhase) {
                    continue;
                }

                await this.executePhase(phase);

                if (targetPhase === phase.name) {
                    break;
                }
            }

            this.logger.success('Rollout completed successfully', {
                duration: Date.now() - this.state.startTime
            });

            return this.generateRolloutReport(true);

        } catch (error) {
            this.logger.error('Rollout failed', { error: error.message });

            // Trigger rollback if enabled
            if (this.config.rollbackTriggers.autoRollbackEnabled) {
                await this.triggerRollback({ reason: error.message, automatic: true });
            }

            return this.generateRolloutReport(false, error);
        }
    }

    /**
     * Execute a rollout phase
     */
    async executePhase(phase) {
        this.logger.info(`Starting rollout phase: ${phase.name}`, {
            percentage: phase.percentage,
            duration: phase.duration
        });

        this.state.currentPhase = phase;

        // Update user group assignments
        await this.updateUserGroups(phase.percentage);

        // Enable features for this phase
        await this.enableFeaturesForPhase(phase);

        // Monitor phase health
        const monitoring = this.startPhaseMonitoring(phase);

        // Wait for phase duration or until manually advanced
        await this.waitForPhaseCompletion(phase, monitoring);

        // Validate phase success
        await this.validatePhaseSuccess(phase);

        this.logger.success(`Phase ${phase.name} completed successfully`);
    }

    /**
     * Update user group assignments
     */
    async updateUserGroups(targetPercentage) {
        // For browser-based rollout, use consistent user bucketing
        const updateUserGroup = (userId) => {
            const hash = this.hashUserId(userId);
            const isInRollout = hash < (targetPercentage / 100);

            this.state.userGroups.set(userId, {
                inRollout: isInRollout,
                assignedAt: Date.now(),
                phase: this.state.currentPhase.name
            });

            return isInRollout;
        };

        // Update feature flag configuration
        const featureFlagUpdate = {
            rolloutPercentage: targetPercentage,
            rolloutPhase: this.state.currentPhase.name,
            updateTime: Date.now()
        };

        await this.updateFeatureFlags(featureFlagUpdate);

        this.logger.info(`User groups updated for ${targetPercentage}% rollout`);
    }

    /**
     * Enable features for the current phase
     */
    async enableFeaturesForPhase(phase) {
        for (const [featureName, featureState] of this.state.featureStates) {
            const feature = this.config.features.find(f => f.name === featureName);

            switch (feature.rolloutType) {
                case 'immediate':
                    // Enable immediately for all users
                    featureState.enabled = true;
                    featureState.enabledPercentage = 100;
                    break;

                case 'phased':
                    // Enable based on rollout phase
                    featureState.enabled = true;
                    featureState.enabledPercentage = phase.percentage;
                    break;

                case 'gradual':
                    // Gradual rollout based on phase progression
                    const phaseIndex = this.config.rolloutPhases.indexOf(phase);
                    const gradualPercentage = Math.min(phase.percentage, (phaseIndex + 1) * 25);
                    featureState.enabled = gradualPercentage > 0;
                    featureState.enabledPercentage = gradualPercentage;
                    break;

                case 'ab_test':
                    // A/B test configuration
                    featureState.enabled = true;
                    featureState.abTestGroup = 'treatment';
                    featureState.enabledPercentage = 50; // Split test
                    break;
            }

            featureState.lastUpdate = Date.now();
        }

        await this.deployFeatureConfiguration();
    }

    /**
     * Start phase monitoring
     */
    startPhaseMonitoring(phase) {
        const monitoring = {
            startTime: Date.now(),
            phase: phase.name,
            healthChecks: [],
            metrics: [],
            alerts: []
        };

        const healthCheckInterval = setInterval(async () => {
            try {
                const health = await this.performHealthCheck();
                monitoring.healthChecks.push(health);

                // Check for rollback triggers
                if (this.shouldTriggerRollback(health)) {
                    clearInterval(healthCheckInterval);
                    await this.triggerRollback({
                        reason: 'Health check failure',
                        automatic: true,
                        phase: phase.name
                    });
                }
            } catch (error) {
                this.logger.error('Health check failed', { error: error.message });
            }
        }, this.config.monitoring.healthCheckInterval);

        const metricsInterval = setInterval(() => {
            try {
                const metrics = this.collectRolloutMetrics();
                monitoring.metrics.push(metrics);
            } catch (error) {
                this.logger.error('Metrics collection failed', { error: error.message });
            }
        }, this.config.monitoring.metricsCollectionInterval);

        // Store cleanup functions
        monitoring.cleanup = () => {
            clearInterval(healthCheckInterval);
            clearInterval(metricsInterval);
        };

        return monitoring;
    }

    /**
     * Wait for phase completion
     */
    async waitForPhaseCompletion(phase, monitoring) {
        const phaseStartTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkCompletion = () => {
                const elapsed = Date.now() - phaseStartTime;

                // Check if phase duration is reached
                if (elapsed >= phase.duration) {
                    monitoring.cleanup();
                    resolve();
                    return;
                }

                // Check for manual advancement or rollback
                if (this.shouldAdvancePhase() || this.isRollbackTriggered()) {
                    monitoring.cleanup();
                    resolve();
                    return;
                }

                // Continue monitoring
                setTimeout(checkCompletion, 10000); // Check every 10 seconds
            };

            checkCompletion();
        });
    }

    /**
     * Validate phase success
     */
    async validatePhaseSuccess(phase) {
        const validation = {
            errorRate: this.state.metrics.errorRate,
            performanceOk: this.validatePerformance(),
            healthStatus: this.state.metrics.systemHealth,
            userFeedback: this.analyzeUserFeedback()
        };

        // Check success criteria
        if (validation.errorRate > this.config.rollbackTriggers.errorRateThreshold) {
            throw new Error(`Phase ${phase.name} failed: Error rate ${validation.errorRate} exceeds threshold`);
        }

        if (validation.healthStatus === 'unhealthy') {
            throw new Error(`Phase ${phase.name} failed: System health is unhealthy`);
        }

        if (!validation.performanceOk) {
            throw new Error(`Phase ${phase.name} failed: Performance degradation detected`);
        }

        this.logger.success(`Phase ${phase.name} validation passed`, validation);
    }

    /**
     * Trigger rollback
     */
    async triggerRollback(options = {}) {
        const { reason, automatic, phase } = options;

        this.logger.warn('Triggering rollback', { reason, automatic, phase });

        const rollback = {
            id: this.generateRollbackId(),
            rolloutId: this.state.rolloutId,
            reason,
            automatic,
            phase: phase || this.state.currentPhase?.name,
            timestamp: Date.now(),
            steps: []
        };

        try {
            // Stop current rollout
            await this.stopCurrentRollout();

            // Revert feature flags
            await this.revertFeatureFlags();

            // Restore previous configuration
            await this.restorePreviousConfiguration();

            // Clear user group assignments
            await this.clearUserGroups();

            // Validate rollback success
            await this.validateRollbackSuccess();

            rollback.status = 'success';
            rollback.completedAt = Date.now();

            this.state.rollbacks.push(rollback);
            this.logger.success('Rollback completed successfully', rollback);

        } catch (error) {
            rollback.status = 'failed';
            rollback.error = error.message;
            rollback.completedAt = Date.now();

            this.logger.error('Rollback failed', { error: error.message });
            throw error;
        }

        return rollback;
    }

    /**
     * Setup A/B testing
     */
    async setupABTest(featureName, options = {}) {
        const { controlGroup, treatmentGroup, splitRatio = 50 } = options;

        this.logger.info(`Setting up A/B test for feature: ${featureName}`);

        const abTest = {
            featureName,
            id: this.generateABTestId(),
            controlGroup: controlGroup || { enabled: false },
            treatmentGroup: treatmentGroup || { enabled: true },
            splitRatio,
            startTime: Date.now(),
            participants: new Map(),
            metrics: {
                control: {},
                treatment: {}
            }
        };

        // Configure feature for A/B testing
        const featureState = this.state.featureStates.get(featureName);
        if (featureState) {
            featureState.rolloutType = 'ab_test';
            featureState.abTestConfig = abTest;
        }

        await this.deployABTestConfiguration(abTest);

        this.logger.success(`A/B test configured for ${featureName}`);
        return abTest;
    }

    /**
     * User communication system
     */
    async communicateToUsers(message, options = {}) {
        const { targetGroups, urgency, channels } = options;

        const communication = {
            id: this.generateCommunicationId(),
            message,
            targetGroups: targetGroups || ['all'],
            urgency: urgency || 'normal',
            channels: channels || ['browser', 'storage'],
            timestamp: Date.now(),
            delivered: 0,
            failed: 0
        };

        try {
            // Store notification in localStorage for browser display
            if (communication.channels.includes('browser')) {
                const notifications = JSON.parse(localStorage.getItem('system-notifications') || '[]');
                notifications.push({
                    id: communication.id,
                    message: communication.message,
                    urgency: communication.urgency,
                    timestamp: communication.timestamp,
                    read: false
                });
                localStorage.setItem('system-notifications', JSON.stringify(notifications));
                communication.delivered++;
            }

            // Console logging for development
            if (communication.channels.includes('console')) {
                const logLevel = urgency === 'critical' ? 'error' : urgency === 'warning' ? 'warn' : 'info';
                console[logLevel](`[System Notification] ${message}`);
                communication.delivered++;
            }

            this.logger.info('User communication sent', communication);

        } catch (error) {
            communication.failed++;
            this.logger.error('User communication failed', { error: error.message });
        }

        return communication;
    }

    // Validation and monitoring methods
    async preRolloutValidation() {
        this.logger.info('Running pre-rollout validation');

        // Check system health
        const health = await this.performHealthCheck();
        if (health.status !== 'healthy') {
            throw new Error('System is not healthy for rollout');
        }

        // Validate feature configurations
        for (const feature of this.config.features) {
            if (!this.state.featureStates.has(feature.name)) {
                throw new Error(`Feature configuration missing: ${feature.name}`);
            }
        }

        // Check rollout prerequisites
        const requiredFiles = [
            'src/config/production.js',
            'src/production/ProductionMonitor.js',
            'src/security/ErrorSecurity.js',
            'src/analytics/ProductionAnalytics.js'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                throw new Error(`Required file missing: ${file}`);
            }
        }

        this.logger.success('Pre-rollout validation passed');
    }

    async performHealthCheck() {
        // Simplified health check for client-side system
        const health = {
            timestamp: Date.now(),
            status: 'healthy',
            checks: {
                configuration: this.checkConfigurationHealth(),
                features: this.checkFeatureHealth(),
                storage: this.checkStorageHealth(),
                performance: this.checkPerformanceHealth()
            }
        };

        // Determine overall health
        const failedChecks = Object.values(health.checks).filter(check => !check.healthy);
        if (failedChecks.length > 0) {
            health.status = failedChecks.length > 2 ? 'unhealthy' : 'degraded';
        }

        return health;
    }

    collectRolloutMetrics() {
        const metrics = {
            timestamp: Date.now(),
            rolloutId: this.state.rolloutId,
            phase: this.state.currentPhase?.name,
            errorRate: this.calculateErrorRate(),
            performanceMetrics: this.collectPerformanceMetrics(),
            featureAdoption: this.calculateFeatureAdoption(),
            userGroups: {
                total: this.state.userGroups.size,
                inRollout: Array.from(this.state.userGroups.values()).filter(g => g.inRollout).length
            }
        };

        this.state.metrics = { ...this.state.metrics, ...metrics };
        return metrics;
    }

    shouldTriggerRollback(health) {
        // Check error rate
        if (this.state.metrics.errorRate > this.config.rollbackTriggers.errorRateThreshold) {
            return true;
        }

        // Check system health
        if (health.status === 'unhealthy') {
            return true;
        }

        // Check performance degradation
        const performanceDegradation = this.calculatePerformanceDegradation();
        if (performanceDegradation > this.config.rollbackTriggers.performanceDegradation) {
            return true;
        }

        return false;
    }

    shouldAdvancePhase() {
        // Check for manual advancement signal
        return localStorage.getItem('rollout-advance-phase') === 'true';
    }

    isRollbackTriggered() {
        return localStorage.getItem('rollout-trigger-rollback') === 'true';
    }

    // Implementation methods
    async updateFeatureFlags(update) {
        const configPath = 'rollout-config.json';
        let config = {};

        try {
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            this.logger.warn('Could not read existing rollout config');
        }

        config.featureFlags = {
            ...config.featureFlags,
            ...update
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    async deployFeatureConfiguration() {
        const config = {
            features: Object.fromEntries(this.state.featureStates),
            rolloutId: this.state.rolloutId,
            phase: this.state.currentPhase?.name,
            timestamp: Date.now()
        };

        // Write to configuration file
        fs.writeFileSync('feature-config.json', JSON.stringify(config, null, 2));

        // Update localStorage for browser access
        localStorage.setItem('feature-configuration', JSON.stringify(config));
    }

    async deployABTestConfiguration(abTest) {
        const abConfig = {
            tests: { [abTest.featureName]: abTest },
            timestamp: Date.now()
        };

        fs.writeFileSync('ab-test-config.json', JSON.stringify(abConfig, null, 2));
        localStorage.setItem('ab-test-configuration', JSON.stringify(abConfig));
    }

    async stopCurrentRollout() {
        this.state.currentPhase = null;
        localStorage.setItem('rollout-stopped', 'true');
    }

    async revertFeatureFlags() {
        // Reset all features to default state
        this.initializeFeatureStates();
        await this.deployFeatureConfiguration();
    }

    async restorePreviousConfiguration() {
        // Restore previous production configuration
        const backupConfig = 'production-config.backup.js';
        if (fs.existsSync(backupConfig)) {
            fs.copyFileSync(backupConfig, 'production-config.js');
        }
    }

    async clearUserGroups() {
        this.state.userGroups.clear();
        localStorage.removeItem('user-group-assignments');
    }

    async validateRollbackSuccess() {
        const health = await this.performHealthCheck();
        if (health.status === 'unhealthy') {
            throw new Error('System still unhealthy after rollback');
        }
    }

    // Utility methods
    validatePerformance() {
        const current = this.state.metrics.performanceMetrics?.responseTime || 0;
        const baseline = this.config.monitoring.performanceBaseline;
        return current <= baseline * 1.5; // Allow 50% degradation
    }

    analyzeUserFeedback() {
        const feedback = this.state.metrics.userFeedback || [];
        const negative = feedback.filter(f => f.sentiment === 'negative').length;
        return negative < this.config.rollbackTriggers.userComplaintThreshold;
    }

    calculateErrorRate() {
        // Simplified error rate calculation
        return Math.random() * 0.01; // 0-1% random for demo
    }

    collectPerformanceMetrics() {
        return {
            responseTime: 500 + Math.random() * 1000, // 500-1500ms
            memoryUsage: 50 + Math.random() * 50, // 50-100MB
            cpuUsage: Math.random() * 10 // 0-10%
        };
    }

    calculateFeatureAdoption() {
        const adoption = {};
        for (const [feature, state] of this.state.featureStates) {
            adoption[feature] = state.enabledPercentage;
        }
        return adoption;
    }

    calculatePerformanceDegradation() {
        const current = this.state.metrics.performanceMetrics?.responseTime || 0;
        const baseline = this.config.monitoring.performanceBaseline;
        return ((current - baseline) / baseline) * 100;
    }

    checkConfigurationHealth() {
        try {
            return {
                healthy: fs.existsSync('src/config/production.js'),
                message: 'Configuration file exists'
            };
        } catch (error) {
            return { healthy: false, message: error.message };
        }
    }

    checkFeatureHealth() {
        const totalFeatures = this.config.features.length;
        const configuredFeatures = this.state.featureStates.size;
        return {
            healthy: totalFeatures === configuredFeatures,
            message: `${configuredFeatures}/${totalFeatures} features configured`
        };
    }

    checkStorageHealth() {
        try {
            localStorage.setItem('health-check', '1');
            localStorage.removeItem('health-check');
            return { healthy: true, message: 'Storage accessible' };
        } catch (error) {
            return { healthy: false, message: 'Storage unavailable' };
        }
    }

    checkPerformanceHealth() {
        const metrics = this.collectPerformanceMetrics();
        const healthy = metrics.responseTime < this.config.monitoring.performanceBaseline * 2;
        return {
            healthy,
            message: `Response time: ${metrics.responseTime}ms`
        };
    }

    // Record and reporting
    async createRolloutRecord() {
        const record = {
            rolloutId: this.state.rolloutId,
            startTime: this.state.startTime,
            features: this.config.features,
            phases: this.config.rolloutPhases,
            status: 'in_progress'
        };

        fs.mkdirSync('rollout-records', { recursive: true });
        fs.writeFileSync(
            `rollout-records/rollout-${this.state.rolloutId}.json`,
            JSON.stringify(record, null, 2)
        );
    }

    generateRolloutReport(success, error = null) {
        const report = {
            rolloutId: this.state.rolloutId,
            success,
            startTime: this.state.startTime,
            endTime: Date.now(),
            duration: Date.now() - this.state.startTime,
            finalPhase: this.state.currentPhase?.name,
            features: Object.fromEntries(this.state.featureStates),
            metrics: this.state.metrics,
            rollbacks: this.state.rollbacks,
            alerts: this.state.alerts
        };

        if (error) {
            report.error = error.message;
        }

        // Save report
        fs.mkdirSync('rollout-reports', { recursive: true });
        fs.writeFileSync(
            `rollout-reports/report-${this.state.rolloutId}.json`,
            JSON.stringify(report, null, 2)
        );

        return report;
    }

    // ID generators
    generateRolloutId() {
        return `rollout_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    generateRollbackId() {
        return `rollback_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    generateABTestId() {
        return `abtest_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    generateCommunicationId() {
        return `comm_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    hashUserId(userId) {
        // Simple hash for user bucketing
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) / Math.pow(2, 31);
    }

    createLogger() {
        return {
            info: (message, data = {}) => {
                console.log(`[ROLLOUT] ${message}`, JSON.stringify(data, null, 2));
            },
            success: (message, data = {}) => {
                console.log(`[ROLLOUT SUCCESS] ${message}`, JSON.stringify(data, null, 2));
            },
            warn: (message, data = {}) => {
                console.warn(`[ROLLOUT WARN] ${message}`, JSON.stringify(data, null, 2));
            },
            error: (message, data = {}) => {
                console.error(`[ROLLOUT ERROR] ${message}`, JSON.stringify(data, null, 2));
            }
        };
    }
}

// CLI interface
if (require.main === module) {
    const rollout = new ErrorSystemRollout();

    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'start':
            const targetPhase = args[1];
            const options = {
                targetPhase,
                skipValidation: args.includes('--skip-validation'),
                force: args.includes('--force')
            };

            rollout.startRollout(options)
                .then(report => {
                    console.log('Rollout completed:', report.success ? 'SUCCESS' : 'FAILED');
                    process.exit(report.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Rollout error:', error.message);
                    process.exit(1);
                });
            break;

        case 'rollback':
            const reason = args[1] || 'Manual rollback';
            rollout.triggerRollback({ reason, automatic: false })
                .then(() => {
                    console.log('Rollback completed successfully');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Rollback failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'ab-test':
            const featureName = args[1];
            if (!featureName) {
                console.error('Feature name required for A/B test');
                process.exit(1);
            }

            rollout.setupABTest(featureName)
                .then(abTest => {
                    console.log('A/B test setup completed:', abTest.id);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('A/B test setup failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'status':
            const status = {
                rolloutId: rollout.state.rolloutId,
                currentPhase: rollout.state.currentPhase?.name,
                startTime: rollout.state.startTime,
                features: Object.fromEntries(rollout.state.featureStates),
                userGroups: rollout.state.userGroups.size
            };
            console.log('Rollout Status:', JSON.stringify(status, null, 2));
            break;

        default:
            console.log(`
Usage: node migration/error-system-rollout.js <command> [options]

Commands:
  start [phase]           Start phased rollout (canary, early, majority, complete)
  rollback [reason]       Trigger rollback with optional reason
  ab-test <feature>       Setup A/B test for feature
  status                  Show current rollout status

Options:
  --skip-validation       Skip pre-rollout validation
  --force                 Force rollout despite warnings

Examples:
  node migration/error-system-rollout.js start canary
  node migration/error-system-rollout.js rollback "Performance issues"
  node migration/error-system-rollout.js ab-test advancedClassification
  node migration/error-system-rollout.js status
            `);
            process.exit(1);
    }
}

module.exports = ErrorSystemRollout;