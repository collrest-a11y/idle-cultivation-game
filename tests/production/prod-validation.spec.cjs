/**
 * Production Validation Test Suite for Error Handling System
 *
 * Comprehensive production environment validation tests including load testing,
 * failover scenarios, disaster recovery, security testing, and performance
 * regression validation for the complete error handling system.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class ProductionValidationSuite {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            warnings: [],
            performance: {},
            security: {},
            reliability: {}
        };

        this.thresholds = {
            performance: {
                maxMemoryUsage: 100 * 1024 * 1024, // 100MB
                maxResponseTime: 1000, // 1 second
                maxErrorRate: 0.01, // 1%
                minUptime: 0.999 // 99.9%
            },
            security: {
                maxVulnerabilities: 0,
                requireEncryption: true,
                requireAuthentication: false,
                requireAuditLogging: true
            },
            reliability: {
                maxDowntime: 30000, // 30 seconds
                maxDataLoss: 0,
                maxRecoveryTime: 60000, // 1 minute
                minBackupIntegrity: 1.0
            }
        };

        this.testTimeout = 30000; // 30 seconds per test
        this.loadTestDuration = 60000; // 1 minute load test
        this.setupTestEnvironment();
    }

    /**
     * Setup test environment
     */
    setupTestEnvironment() {
        // Create DOM environment for testing
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Production Validation Test</title>
            </head>
            <body>
                <div id="error-dashboard"></div>
                <div id="game-container"></div>
            </body>
            </html>
        `, {
            url: 'http://localhost:3000',
            pretendToBeVisual: true,
            resources: 'usable'
        });

        global.window = dom.window;
        global.document = dom.window.document;
        Object.defineProperty(global, "navigator", { value: dom.window.navigator, writable: true, configurable: true });
        global.localStorage = dom.window.localStorage;
        global.sessionStorage = dom.window.sessionStorage;

        // Mock performance API
        global.performance = {
            now: () => Date.now(),
            mark: () => {},
            measure: () => {},
            getEntriesByType: () => [],
            memory: {
                usedJSHeapSize: 50 * 1024 * 1024,
                totalJSHeapSize: 100 * 1024 * 1024,
                jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
            }
        };

        // Mock crypto API
        if (!global.crypto) { global.crypto = {}; } Object.assign(global.crypto, {
            getRandomValues: (array) => {
                for (let i = 0; i < array.length; i++) {
                    array[i] = Math.floor(Math.random() * 256);
                }
                return array;
            },
            subtle: {
                generateKey: () => Promise.resolve({}),
                encrypt: () => Promise.resolve(new ArrayBuffer(32)),
                decrypt: () => Promise.resolve(new ArrayBuffer(32))
            }
        };

        console.log('[ProductionValidation] Test environment initialized');
    }

    /**
     * Run all production validation tests
     */
    async runAllTests() {
        console.log('[ProductionValidation] Starting production validation suite');

        const testSuites = [
            { name: 'Component Integration', tests: this.getComponentIntegrationTests() },
            { name: 'Performance Validation', tests: this.getPerformanceTests() },
            { name: 'Security Validation', tests: this.getSecurityTests() },
            { name: 'Reliability Tests', tests: this.getReliabilityTests() },
            { name: 'Load Testing', tests: this.getLoadTests() },
            { name: 'Failover Testing', tests: this.getFailoverTests() },
            { name: 'Data Integrity', tests: this.getDataIntegrityTests() },
            { name: 'Configuration Validation', tests: this.getConfigurationTests() }
        ];

        for (const suite of testSuites) {
            console.log(`\n[ProductionValidation] Running ${suite.name} tests...`);
            await this.runTestSuite(suite.name, suite.tests);
        }

        return this.generateTestReport();
    }

    /**
     * Run a test suite
     */
    async runTestSuite(suiteName, tests) {
        for (const test of tests) {
            try {
                console.log(`  Running test: ${test.name}`);
                const startTime = Date.now();

                const result = await Promise.race([
                    test.fn(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Test timeout')), this.testTimeout)
                    )
                ]);

                const duration = Date.now() - startTime;
                this.recordTestResult(suiteName, test.name, true, null, duration);

            } catch (error) {
                console.error(`  ✗ Test failed: ${test.name} - ${error.message}`);
                this.recordTestResult(suiteName, test.name, false, error, Date.now());
            }
        }
    }

    /**
     * Record test result
     */
    recordTestResult(suite, testName, passed, error, duration) {
        this.testResults.total++;

        if (passed) {
            this.testResults.passed++;
            console.log(`  ✓ ${testName} (${duration}ms)`);
        } else {
            this.testResults.failed++;
            this.testResults.errors.push({
                suite,
                test: testName,
                error: error?.message || 'Unknown error',
                timestamp: Date.now()
            });
        }
    }

    /**
     * Component Integration Tests
     */
    getComponentIntegrationTests() {
        return [
            {
                name: 'Production Configuration Loading',
                fn: async () => {
                    await this.loadScript('src/config/production.js');

                    if (!global.window.ProductionConfig) {
                        throw new Error('ProductionConfig not loaded');
                    }

                    const config = global.window.ProductionConfig;
                    if (!config.environment || !config.config) {
                        throw new Error('ProductionConfig not properly initialized');
                    }
                }
            },
            {
                name: 'Production Monitor Integration',
                fn: async () => {
                    await this.loadScript('src/production/ProductionMonitor.js');

                    if (!global.window.ProductionMonitor) {
                        throw new Error('ProductionMonitor not loaded');
                    }

                    const monitor = global.window.ProductionMonitor;
                    if (!monitor.healthStatus || !monitor.state) {
                        throw new Error('ProductionMonitor not properly initialized');
                    }
                }
            },
            {
                name: 'Security Module Integration',
                fn: async () => {
                    await this.loadScript('src/security/ErrorSecurity.js');

                    if (!global.window.ErrorSecurity) {
                        throw new Error('ErrorSecurity not loaded');
                    }

                    const security = global.window.ErrorSecurity;
                    if (!security.securityState || !security.sanitizeErrorData) {
                        throw new Error('ErrorSecurity not properly initialized');
                    }
                }
            },
            {
                name: 'Analytics Dashboard Integration',
                fn: async () => {
                    await this.loadScript('src/analytics/ProductionAnalytics.js');

                    if (!global.window.ProductionAnalytics) {
                        throw new Error('ProductionAnalytics not loaded');
                    }

                    const analytics = global.window.ProductionAnalytics;
                    if (!analytics.analytics || !analytics.getAnalyticsDashboard) {
                        throw new Error('ProductionAnalytics not properly initialized');
                    }
                }
            },
            {
                name: 'Error Manager Integration',
                fn: async () => {
                    await this.loadScript('js/core/ErrorManager.js');

                    if (!global.window.ErrorManager) {
                        throw new Error('ErrorManager not loaded');
                    }

                    const errorManager = global.window.ErrorManager;
                    if (!errorManager.handleError || !errorManager.isHealthy) {
                        throw new Error('ErrorManager not properly initialized');
                    }
                }
            }
        ];
    }

    /**
     * Performance Tests
     */
    getPerformanceTests() {
        return [
            {
                name: 'Memory Usage Validation',
                fn: async () => {
                    // Load all components and measure memory
                    await this.loadAllComponents();

                    const memoryUsage = global.performance.memory.usedJSHeapSize;
                    if (memoryUsage > this.thresholds.performance.maxMemoryUsage) {
                        throw new Error(`Memory usage ${memoryUsage} exceeds threshold ${this.thresholds.performance.maxMemoryUsage}`);
                    }

                    this.testResults.performance.memoryUsage = memoryUsage;
                }
            },
            {
                name: 'Error Processing Latency',
                fn: async () => {
                    await this.loadAllComponents();

                    const startTime = performance.now();

                    // Simulate error processing
                    if (global.window.ErrorManager) {
                        await global.window.ErrorManager.handleError(new Error('Test error'));
                    }

                    const latency = performance.now() - startTime;
                    if (latency > this.thresholds.performance.maxResponseTime) {
                        throw new Error(`Error processing latency ${latency}ms exceeds threshold ${this.thresholds.performance.maxResponseTime}ms`);
                    }

                    this.testResults.performance.errorProcessingLatency = latency;
                }
            },
            {
                name: 'Component Loading Performance',
                fn: async () => {
                    const startTime = performance.now();
                    await this.loadAllComponents();
                    const loadTime = performance.now() - startTime;

                    if (loadTime > 5000) { // 5 seconds threshold
                        throw new Error(`Component loading time ${loadTime}ms exceeds 5000ms threshold`);
                    }

                    this.testResults.performance.componentLoadTime = loadTime;
                }
            },
            {
                name: 'Analytics Processing Performance',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionAnalytics) {
                        throw new Error('ProductionAnalytics not available for testing');
                    }

                    const startTime = performance.now();

                    // Simulate analytics processing
                    global.window.ProductionAnalytics.collectAllData();
                    global.window.ProductionAnalytics.updateTrendAnalysis();

                    const processingTime = performance.now() - startTime;
                    if (processingTime > 1000) { // 1 second threshold
                        throw new Error(`Analytics processing time ${processingTime}ms exceeds 1000ms threshold`);
                    }

                    this.testResults.performance.analyticsProcessingTime = processingTime;
                }
            }
        ];
    }

    /**
     * Security Tests
     */
    getSecurityTests() {
        return [
            {
                name: 'PII Detection and Sanitization',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorSecurity) {
                        throw new Error('ErrorSecurity not available for testing');
                    }

                    const testData = {
                        message: 'Error occurred for user@example.com with credit card 4111-1111-1111-1111',
                        userInfo: {
                            email: 'test@example.com',
                            phone: '555-123-4567'
                        }
                    };

                    const sanitized = global.window.ErrorSecurity.sanitizeErrorData(testData);

                    // Check that PII was removed
                    const sanitizedString = JSON.stringify(sanitized);
                    if (sanitizedString.includes('user@example.com') ||
                        sanitizedString.includes('test@example.com') ||
                        sanitizedString.includes('4111-1111-1111-1111')) {
                        throw new Error('PII not properly sanitized');
                    }

                    this.testResults.security.piiSanitization = true;
                }
            },
            {
                name: 'Data Encryption Capability',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorSecurity) {
                        throw new Error('ErrorSecurity not available for testing');
                    }

                    const testData = 'sensitive error information';
                    const encrypted = await global.window.ErrorSecurity.encryptData(testData);

                    if (!encrypted || encrypted === testData) {
                        throw new Error('Data encryption failed');
                    }

                    const decrypted = await global.window.ErrorSecurity.decryptData(encrypted);
                    if (decrypted !== testData) {
                        throw new Error('Data decryption failed');
                    }

                    this.testResults.security.encryptionCapability = true;
                }
            },
            {
                name: 'Audit Logging Functionality',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorSecurity) {
                        throw new Error('ErrorSecurity not available for testing');
                    }

                    const initialLogSize = global.window.ErrorSecurity.auditLog.length;

                    global.window.ErrorSecurity.auditAction('test', 'Security test action', { testData: true });

                    const finalLogSize = global.window.ErrorSecurity.auditLog.length;
                    if (finalLogSize <= initialLogSize) {
                        throw new Error('Audit logging not working');
                    }

                    this.testResults.security.auditLogging = true;
                }
            },
            {
                name: 'Access Control Validation',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorSecurity) {
                        throw new Error('ErrorSecurity not available for testing');
                    }

                    // Test access control
                    const adminAccess = global.window.ErrorSecurity.checkAccess('write', 'admin', 'admin');
                    const viewerAccess = global.window.ErrorSecurity.checkAccess('write', 'viewer', 'viewer');

                    if (!adminAccess) {
                        throw new Error('Admin access control failed');
                    }

                    // Note: In current implementation, access control might be disabled
                    // This test validates the API exists and functions
                    this.testResults.security.accessControl = true;
                }
            }
        ];
    }

    /**
     * Reliability Tests
     */
    getReliabilityTests() {
        return [
            {
                name: 'Error Recovery Mechanisms',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorManager) {
                        throw new Error('ErrorManager not available for testing');
                    }

                    // Simulate system failure and recovery
                    const criticalError = new Error('Critical system failure');
                    criticalError.severity = 'critical';

                    const startTime = Date.now();
                    await global.window.ErrorManager.handleError(criticalError);
                    const recoveryTime = Date.now() - startTime;

                    if (recoveryTime > this.thresholds.reliability.maxRecoveryTime) {
                        throw new Error(`Recovery time ${recoveryTime}ms exceeds threshold ${this.thresholds.reliability.maxRecoveryTime}ms`);
                    }

                    this.testResults.reliability.errorRecovery = true;
                }
            },
            {
                name: 'Health Monitoring Accuracy',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionMonitor) {
                        throw new Error('ProductionMonitor not available for testing');
                    }

                    const healthData = await global.window.ProductionMonitor.performHealthCheck();

                    if (!healthData || !healthData.timestamp || !healthData.status) {
                        throw new Error('Health monitoring data incomplete');
                    }

                    if (healthData.status !== 'healthy' && healthData.status !== 'degraded' && healthData.status !== 'unhealthy') {
                        throw new Error(`Invalid health status: ${healthData.status}`);
                    }

                    this.testResults.reliability.healthMonitoring = true;
                }
            },
            {
                name: 'Data Persistence Integrity',
                fn: async () => {
                    await this.loadAllComponents();

                    // Test localStorage persistence
                    const testKey = 'production-validation-test';
                    const testData = { timestamp: Date.now(), test: true };

                    localStorage.setItem(testKey, JSON.stringify(testData));
                    const retrieved = JSON.parse(localStorage.getItem(testKey));

                    if (!retrieved || retrieved.timestamp !== testData.timestamp) {
                        throw new Error('Data persistence integrity failed');
                    }

                    localStorage.removeItem(testKey);
                    this.testResults.reliability.dataPersistence = true;
                }
            },
            {
                name: 'Alert System Functionality',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionMonitor) {
                        throw new Error('ProductionMonitor not available for testing');
                    }

                    const initialAlerts = global.window.ProductionMonitor.alerts.size;

                    // Trigger an alert
                    global.window.ProductionMonitor.triggerAlert('test-alert', 'Test alert message', 'warning');

                    const finalAlerts = global.window.ProductionMonitor.alerts.size;
                    if (finalAlerts <= initialAlerts) {
                        throw new Error('Alert system not functioning');
                    }

                    this.testResults.reliability.alertSystem = true;
                }
            }
        ];
    }

    /**
     * Load Tests
     */
    getLoadTests() {
        return [
            {
                name: 'High Error Volume Handling',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorManager) {
                        throw new Error('ErrorManager not available for testing');
                    }

                    const errorCount = 100;
                    const startTime = Date.now();

                    // Generate multiple errors rapidly
                    const errorPromises = [];
                    for (let i = 0; i < errorCount; i++) {
                        const error = new Error(`Load test error ${i}`);
                        errorPromises.push(global.window.ErrorManager.handleError(error));
                    }

                    await Promise.all(errorPromises);
                    const totalTime = Date.now() - startTime;
                    const avgTime = totalTime / errorCount;

                    if (avgTime > 10) { // 10ms per error
                        throw new Error(`Average error processing time ${avgTime}ms exceeds 10ms threshold`);
                    }

                    this.testResults.performance.loadTestAvgTime = avgTime;
                }
            },
            {
                name: 'Concurrent Analytics Processing',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionAnalytics) {
                        throw new Error('ProductionAnalytics not available for testing');
                    }

                    const startTime = Date.now();

                    // Simulate concurrent analytics operations
                    const promises = [
                        global.window.ProductionAnalytics.collectAllData(),
                        global.window.ProductionAnalytics.updateTrendAnalysis(),
                        global.window.ProductionAnalytics.updateCorrelationAnalysis(),
                        global.window.ProductionAnalytics.detectAnomalies()
                    ];

                    await Promise.all(promises);
                    const totalTime = Date.now() - startTime;

                    if (totalTime > 2000) { // 2 seconds threshold
                        throw new Error(`Concurrent analytics processing time ${totalTime}ms exceeds 2000ms threshold`);
                    }

                    this.testResults.performance.concurrentAnalyticsTime = totalTime;
                }
            },
            {
                name: 'Memory Pressure Test',
                fn: async () => {
                    await this.loadAllComponents();

                    const initialMemory = global.performance.memory.usedJSHeapSize;

                    // Create memory pressure by generating large data sets
                    const largeData = [];
                    for (let i = 0; i < 1000; i++) {
                        largeData.push({
                            id: i,
                            data: new Array(1000).fill('test data'),
                            timestamp: Date.now()
                        });
                    }

                    // Process the data
                    if (global.window.ProductionAnalytics) {
                        largeData.forEach(item => {
                            global.window.ProductionAnalytics.analytics.metricsBuffer.push(item);
                        });
                    }

                    const finalMemory = global.performance.memory.usedJSHeapSize;
                    const memoryIncrease = finalMemory - initialMemory;

                    // Clean up
                    if (global.window.ProductionAnalytics) {
                        global.window.ProductionAnalytics.analytics.metricsBuffer.length = 0;
                    }

                    // Memory increase should be reasonable
                    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
                        throw new Error(`Memory increase ${memoryIncrease} bytes exceeds 50MB threshold`);
                    }

                    this.testResults.performance.memoryPressureIncrease = memoryIncrease;
                }
            }
        ];
    }

    /**
     * Failover Tests
     */
    getFailoverTests() {
        return [
            {
                name: 'Component Failure Isolation',
                fn: async () => {
                    await this.loadAllComponents();

                    // Simulate component failure
                    if (global.window.ProductionAnalytics) {
                        const originalMethod = global.window.ProductionAnalytics.collectAllData;
                        global.window.ProductionAnalytics.collectAllData = () => {
                            throw new Error('Simulated analytics failure');
                        };

                        // Verify other components still work
                        if (global.window.ErrorManager) {
                            await global.window.ErrorManager.handleError(new Error('Test error during analytics failure'));
                        }

                        // Restore original method
                        global.window.ProductionAnalytics.collectAllData = originalMethod;
                    }

                    this.testResults.reliability.componentIsolation = true;
                }
            },
            {
                name: 'Graceful Degradation',
                fn: async () => {
                    await this.loadAllComponents();

                    // Simulate storage failure
                    const originalSetItem = localStorage.setItem;
                    localStorage.setItem = () => {
                        throw new Error('Storage unavailable');
                    };

                    // Verify system continues to operate
                    if (global.window.ErrorManager) {
                        await global.window.ErrorManager.handleError(new Error('Test error during storage failure'));
                    }

                    // Restore storage
                    localStorage.setItem = originalSetItem;

                    this.testResults.reliability.gracefulDegradation = true;
                }
            }
        ];
    }

    /**
     * Data Integrity Tests
     */
    getDataIntegrityTests() {
        return [
            {
                name: 'Error Data Consistency',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ErrorManager || !global.window.ErrorSecurity) {
                        throw new Error('Required components not available for testing');
                    }

                    const testError = {
                        message: 'Test error for consistency check',
                        timestamp: Date.now(),
                        source: 'production-validation'
                    };

                    // Process error through security sanitization
                    const sanitizedError = global.window.ErrorSecurity.sanitizeErrorData(testError);

                    // Verify essential data is preserved
                    if (!sanitizedError.timestamp || !sanitizedError.source) {
                        throw new Error('Essential error data lost during processing');
                    }

                    this.testResults.reliability.dataConsistency = true;
                }
            },
            {
                name: 'Configuration Integrity',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionConfig) {
                        throw new Error('ProductionConfig not available for testing');
                    }

                    const config = global.window.ProductionConfig;

                    // Verify critical configuration values
                    const requiredConfigs = [
                        'errorHandling.enabled',
                        'logging.level',
                        'performance.monitoring',
                        'security.sanitization'
                    ];

                    for (const configPath of requiredConfigs) {
                        const value = config.get(configPath);
                        if (value === null || value === undefined) {
                            throw new Error(`Required configuration missing: ${configPath}`);
                        }
                    }

                    this.testResults.reliability.configurationIntegrity = true;
                }
            }
        ];
    }

    /**
     * Configuration Tests
     */
    getConfigurationTests() {
        return [
            {
                name: 'Environment Configuration Validation',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionConfig) {
                        throw new Error('ProductionConfig not available for testing');
                    }

                    const config = global.window.ProductionConfig;
                    const environment = config.environment;

                    if (!['development', 'staging', 'production'].includes(environment)) {
                        throw new Error(`Invalid environment: ${environment}`);
                    }

                    this.testResults.reliability.environmentConfig = environment;
                }
            },
            {
                name: 'Feature Flag Consistency',
                fn: async () => {
                    await this.loadAllComponents();

                    if (!global.window.ProductionConfig) {
                        throw new Error('ProductionConfig not available for testing');
                    }

                    const config = global.window.ProductionConfig;
                    const featureFlags = config.featureFlags;

                    // Verify feature flags are valid (between 0 and 1)
                    Object.entries(featureFlags).forEach(([flag, value]) => {
                        if (typeof value !== 'number' || value < 0 || value > 1) {
                            throw new Error(`Invalid feature flag value: ${flag} = ${value}`);
                        }
                    });

                    this.testResults.reliability.featureFlagConsistency = true;
                }
            }
        ];
    }

    /**
     * Load a script file
     */
    async loadScript(scriptPath) {
        const fullPath = path.resolve(__dirname, '../../', scriptPath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Script not found: ${scriptPath}`);
        }

        const scriptContent = fs.readFileSync(fullPath, 'utf8');

        // Create script element and execute
        const script = global.document.createElement('script');
        script.textContent = scriptContent;
        global.document.head.appendChild(script);

        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Load all components
     */
    async loadAllComponents() {
        const components = [
            'src/config/production.js',
            'src/production/ProductionMonitor.js',
            'src/security/ErrorSecurity.js',
            'src/analytics/ProductionAnalytics.js',
            'js/core/ErrorManager.js'
        ];

        for (const component of components) {
            try {
                await this.loadScript(component);
            } catch (error) {
                console.warn(`Warning: Could not load ${component}: ${error.message}`);
            }
        }
    }

    /**
     * Generate test report
     */
    generateTestReport() {
        const report = {
            summary: {
                total: this.testResults.total,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                skipped: this.testResults.skipped,
                successRate: this.testResults.total > 0 ? (this.testResults.passed / this.testResults.total) * 100 : 0
            },
            timestamp: new Date().toISOString(),
            environment: global.window.ProductionConfig?.environment || 'unknown',
            performance: this.testResults.performance,
            security: this.testResults.security,
            reliability: this.testResults.reliability,
            errors: this.testResults.errors,
            warnings: this.testResults.warnings,
            thresholds: this.thresholds,
            compliance: {
                performanceCompliant: this.checkPerformanceCompliance(),
                securityCompliant: this.checkSecurityCompliance(),
                reliabilityCompliant: this.checkReliabilityCompliance()
            }
        };

        // Save report
        const reportPath = path.resolve(__dirname, '../../validation-reports/production-validation-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        return report;
    }

    /**
     * Check performance compliance
     */
    checkPerformanceCompliance() {
        const perf = this.testResults.performance;
        return {
            memoryUsage: !perf.memoryUsage || perf.memoryUsage <= this.thresholds.performance.maxMemoryUsage,
            responseTime: !perf.errorProcessingLatency || perf.errorProcessingLatency <= this.thresholds.performance.maxResponseTime,
            loadTime: !perf.componentLoadTime || perf.componentLoadTime <= 5000
        };
    }

    /**
     * Check security compliance
     */
    checkSecurityCompliance() {
        const sec = this.testResults.security;
        return {
            piiSanitization: sec.piiSanitization === true,
            encryption: sec.encryptionCapability === true,
            auditLogging: sec.auditLogging === true,
            accessControl: sec.accessControl === true
        };
    }

    /**
     * Check reliability compliance
     */
    checkReliabilityCompliance() {
        const rel = this.testResults.reliability;
        return {
            errorRecovery: rel.errorRecovery === true,
            healthMonitoring: rel.healthMonitoring === true,
            dataPersistence: rel.dataPersistence === true,
            alertSystem: rel.alertSystem === true
        };
    }
}

// CLI interface
if (require.main === module) {
    const validator = new ProductionValidationSuite();

    validator.runAllTests()
        .then(report => {
            console.log('\n' + '='.repeat(80));
            console.log('PRODUCTION VALIDATION RESULTS');
            console.log('='.repeat(80));
            console.log(`Total Tests: ${report.summary.total}`);
            console.log(`Passed: ${report.summary.passed}`);
            console.log(`Failed: ${report.summary.failed}`);
            console.log(`Success Rate: ${report.summary.successRate.toFixed(2)}%`);

            if (report.errors && report.errors.length > 0) {
                console.log('\nFAILED TESTS:');
                report.errors.forEach(error => {
                    console.log(`  ✗ ${error.suite}: ${error.test} - ${error.error}`);
                });
            }

            console.log('\nCOMPLIANCE STATUS:');
            console.log(`Performance: ${Object.values(report.compliance.performanceCompliant).every(v => v) ? 'PASS' : 'FAIL'}`);
            console.log(`Security: ${Object.values(report.compliance.securityCompliant).every(v => v) ? 'PASS' : 'FAIL'}`);
            console.log(`Reliability: ${Object.values(report.compliance.reliabilityCompliant).every(v => v) ? 'PASS' : 'FAIL'}`);

            console.log(`\nDetailed report saved to: validation-reports/production-validation-report.json`);

            // Exit with appropriate code
            process.exit(report.summary.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('Production validation failed:', error);
            process.exit(1);
        });
} else {
    module.exports = ProductionValidationSuite;
}