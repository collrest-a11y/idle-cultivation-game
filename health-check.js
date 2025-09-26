/**
 * Health Check System for Idle Cultivation Game
 * Monitors system health and reports critical issues
 */

class HealthCheckSystem {
    constructor() {
        this.checks = new Map();
        this.results = new Map();
        this.isRunning = false;
        this.checkInterval = 60000; // 1 minute
        this.intervalId = null;
        this.criticalErrors = [];
        this.warnings = [];

        this.initializeChecks();
    }

    /**
     * Initialize all health checks
     */
    initializeChecks() {
        // Core Systems
        this.registerCheck('core-systems', async () => {
            const checks = {
                gameState: typeof window.gameState === 'object',
                eventManager: typeof window.eventManager === 'object',
                errorManager: typeof window.errorManager === 'object',
                moduleManager: typeof window.moduleManager === 'object',
                saveSystem: typeof window.GameSaveSystem === 'function'
            };

            const passed = Object.values(checks).every(v => v);
            return {
                status: passed ? 'healthy' : 'critical',
                details: checks,
                message: passed ? 'All core systems operational' : 'Core system failures detected'
            };
        });

        // Memory Usage
        this.registerCheck('memory', async () => {
            if (performance.memory) {
                const used = performance.memory.usedJSHeapSize;
                const limit = performance.memory.jsHeapSizeLimit;
                const percentage = (used / limit) * 100;

                return {
                    status: percentage < 70 ? 'healthy' : percentage < 85 ? 'warning' : 'critical',
                    details: {
                        used: Math.round(used / 1048576) + 'MB',
                        limit: Math.round(limit / 1048576) + 'MB',
                        percentage: percentage.toFixed(2) + '%'
                    },
                    message: `Memory usage: ${percentage.toFixed(2)}%`
                };
            }

            return {
                status: 'unknown',
                details: {},
                message: 'Memory monitoring not available'
            };
        });

        // Save System
        this.registerCheck('save-system', async () => {
            try {
                const testData = { test: true, timestamp: Date.now() };
                const key = 'healthCheck_test';

                // Test write
                localStorage.setItem(key, JSON.stringify(testData));

                // Test read
                const retrieved = JSON.parse(localStorage.getItem(key));

                // Cleanup
                localStorage.removeItem(key);

                const success = retrieved && retrieved.test === testData.test;

                return {
                    status: success ? 'healthy' : 'critical',
                    details: { canWrite: true, canRead: success },
                    message: success ? 'Save system operational' : 'Save system failure'
                };
            } catch (error) {
                return {
                    status: 'critical',
                    details: { error: error.message },
                    message: 'Save system error: ' + error.message
                };
            }
        });

        // UI Components
        this.registerCheck('ui-components', async () => {
            const components = {
                gameView: !!document.getElementById('game-view'),
                gameInterface: !!document.getElementById('game-interface'),
                characterCreation: !!document.getElementById('character-creation'),
                hasButtons: document.querySelectorAll('button').length > 0,
                hasContent: document.body.innerHTML.length > 1000
            };

            const critical = components.gameView || components.gameInterface;
            const passed = critical && components.hasContent;

            return {
                status: passed ? 'healthy' : 'warning',
                details: components,
                message: passed ? 'UI components loaded' : 'Some UI components missing'
            };
        });

        // Performance
        this.registerCheck('performance', async () => {
            const metrics = {
                fps: this.calculateFPS(),
                loadTime: performance.timing ?
                    performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
                domNodes: document.getElementsByTagName('*').length,
                eventListeners: this.countEventListeners()
            };

            const isHealthy = metrics.fps > 30 &&
                             metrics.loadTime < 5000 &&
                             metrics.domNodes < 10000;

            return {
                status: isHealthy ? 'healthy' : metrics.fps < 20 ? 'critical' : 'warning',
                details: metrics,
                message: `FPS: ${metrics.fps}, Load: ${metrics.loadTime}ms, DOM: ${metrics.domNodes} nodes`
            };
        });

        // Game State Integrity
        this.registerCheck('game-state', async () => {
            if (!window.gameState) {
                return {
                    status: 'critical',
                    details: {},
                    message: 'Game state not initialized'
                };
            }

            try {
                const state = window.gameState.getState();
                const hasPlayer = state?.player?.character?.created;
                const hasResources = state?.resources !== undefined;
                const valid = window.gameState.validate ? window.gameState.validate() : true;

                return {
                    status: valid ? 'healthy' : 'warning',
                    details: {
                        hasPlayer,
                        hasResources,
                        stateSize: JSON.stringify(state).length
                    },
                    message: valid ? 'Game state valid' : 'Game state validation warnings'
                };
            } catch (error) {
                return {
                    status: 'critical',
                    details: { error: error.message },
                    message: 'Game state error: ' + error.message
                };
            }
        });

        // Network Connectivity
        this.registerCheck('network', async () => {
            const online = navigator.onLine;

            return {
                status: online ? 'healthy' : 'warning',
                details: {
                    online,
                    connection: navigator.connection ? {
                        effectiveType: navigator.connection.effectiveType,
                        downlink: navigator.connection.downlink,
                        rtt: navigator.connection.rtt
                    } : 'unknown'
                },
                message: online ? 'Network connected' : 'Network offline'
            };
        });

        // Error Rate
        this.registerCheck('error-rate', async () => {
            const errorCount = window.errorManager?.getErrorCount?.() || 0;
            const errorRate = window.errorManager?.getErrorRate?.() || 0;

            return {
                status: errorCount === 0 ? 'healthy' : errorRate < 0.01 ? 'warning' : 'critical',
                details: {
                    totalErrors: errorCount,
                    errorRate: errorRate.toFixed(4),
                    lastError: window.errorManager?.getLastError?.()
                },
                message: `Error count: ${errorCount}, Rate: ${(errorRate * 100).toFixed(2)}%`
            };
        });
    }

    /**
     * Register a health check
     */
    registerCheck(name, checkFn) {
        this.checks.set(name, checkFn);
    }

    /**
     * Run a single health check
     */
    async runCheck(name) {
        const check = this.checks.get(name);
        if (!check) return null;

        try {
            const result = await check();
            result.timestamp = Date.now();
            result.name = name;
            this.results.set(name, result);

            // Track critical errors and warnings
            if (result.status === 'critical') {
                this.criticalErrors.push({ name, ...result });
            } else if (result.status === 'warning') {
                this.warnings.push({ name, ...result });
            }

            return result;
        } catch (error) {
            const errorResult = {
                name,
                status: 'error',
                details: { error: error.message },
                message: `Check failed: ${error.message}`,
                timestamp: Date.now()
            };
            this.results.set(name, errorResult);
            this.criticalErrors.push(errorResult);
            return errorResult;
        }
    }

    /**
     * Run all health checks
     */
    async runAllChecks() {
        this.criticalErrors = [];
        this.warnings = [];

        const promises = Array.from(this.checks.keys()).map(name => this.runCheck(name));
        await Promise.all(promises);

        return this.getReport();
    }

    /**
     * Start periodic health checks
     */
    start(interval = this.checkInterval) {
        if (this.isRunning) return;

        this.isRunning = true;
        this.checkInterval = interval;

        // Run initial check
        this.runAllChecks();

        // Set up periodic checks
        this.intervalId = setInterval(() => {
            this.runAllChecks();
        }, this.checkInterval);

        console.log(`Health check system started (interval: ${interval}ms)`);
    }

    /**
     * Stop periodic health checks
     */
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('Health check system stopped');
    }

    /**
     * Get health report
     */
    getReport() {
        const results = Array.from(this.results.values());
        const summary = {
            healthy: results.filter(r => r.status === 'healthy').length,
            warning: results.filter(r => r.status === 'warning').length,
            critical: results.filter(r => r.status === 'critical').length,
            error: results.filter(r => r.status === 'error').length,
            unknown: results.filter(r => r.status === 'unknown').length
        };

        const overallStatus = summary.critical > 0 ? 'critical' :
                             summary.error > 0 ? 'error' :
                             summary.warning > 2 ? 'warning' : 'healthy';

        return {
            status: overallStatus,
            summary,
            results,
            criticalErrors: this.criticalErrors,
            warnings: this.warnings,
            timestamp: Date.now(),
            uptime: performance.now(),
            message: this.getStatusMessage(overallStatus, summary)
        };
    }

    /**
     * Get status message
     */
    getStatusMessage(status, summary) {
        switch (status) {
            case 'healthy':
                return 'All systems operational';
            case 'warning':
                return `${summary.warning} warnings detected, monitoring situation`;
            case 'critical':
                return `${summary.critical} critical issues detected, immediate attention required`;
            case 'error':
                return `${summary.error} errors detected, system unstable`;
            default:
                return 'Status unknown';
        }
    }

    /**
     * Calculate current FPS
     */
    calculateFPS() {
        // Simple FPS calculation based on requestAnimationFrame
        let fps = 60;
        let lastTime = performance.now();
        let frames = 0;

        const measure = () => {
            frames++;
            const currentTime = performance.now();
            if (currentTime >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                frames = 0;
                lastTime = currentTime;
            }
        };

        // Measure for a short time
        for (let i = 0; i < 10; i++) {
            requestAnimationFrame(measure);
        }

        return fps;
    }

    /**
     * Count event listeners
     */
    countEventListeners() {
        // Estimate based on common event targets
        let count = 0;
        const elements = document.querySelectorAll('*');

        // Check a sample of elements
        const sample = Math.min(100, elements.length);
        for (let i = 0; i < sample; i++) {
            const element = elements[i];
            // Check for common event properties
            if (element.onclick || element.onchange || element.onsubmit) count++;
        }

        // Extrapolate
        return Math.round((count / sample) * elements.length);
    }

    /**
     * Export health report as JSON
     */
    exportReport() {
        const report = this.getReport();
        const json = JSON.stringify(report, null, 2);

        // Create download link
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return report;
    }
}

// Initialize and expose globally
window.HealthCheck = new HealthCheckSystem();

// Auto-start in production
if (window.PRODUCTION_CONFIG?.monitoring?.enablePerformanceMonitoring) {
    window.HealthCheck.start(window.PRODUCTION_CONFIG.monitoring.performanceReportInterval || 60000);
}

// Add console commands for debugging
window.checkHealth = async () => {
    const report = await window.HealthCheck.runAllChecks();
    console.table(report.results);
    console.log('Overall Status:', report.status);
    console.log('Message:', report.message);
    return report;
};

window.exportHealthReport = () => {
    return window.HealthCheck.exportReport();
};

console.log('Health check system initialized. Use checkHealth() to run manual check.');