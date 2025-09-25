/**
 * Production Configuration for Idle Cultivation Game
 * This file contains all production-specific settings and configurations
 */

window.PRODUCTION_CONFIG = {
    // Environment
    environment: 'production',
    version: '1.0.0',
    buildDate: new Date().toISOString(),

    // Performance Settings
    performance: {
        enableOptimizations: true,
        maxFPS: 60,
        renderThrottle: 16, // ms
        autoRefreshRate: 10000, // 10 seconds
        minRefreshInterval: 5000, // 5 seconds minimum
        maxRefreshesPerMinute: 6,
        enableLazyLoading: true,
        enableCaching: true,
        cacheTimeout: 300000, // 5 minutes
        enableRequestBatching: true,
        batchInterval: 100, // ms
        maxConcurrentRequests: 3
    },

    // Error Handling
    errorHandling: {
        enableErrorBoundaries: true,
        enableFallbackUI: true,
        maxRetries: 3,
        retryDelay: 1000, // ms
        enableErrorReporting: true,
        errorReportingEndpoint: '/api/errors',
        suppressNonCriticalErrors: true,
        enableRecoveryMode: true,
        logLevel: 'warn' // 'debug', 'info', 'warn', 'error'
    },

    // Data Validation
    validation: {
        enableInputValidation: true,
        enableStateValidation: true,
        enableDataIntegrity: true,
        maxInputLength: 1000,
        sanitizeUserInput: true,
        validateOnSave: true,
        validateOnLoad: true,
        strictMode: true
    },

    // Save System
    saveSystem: {
        autoSaveInterval: 30000, // 30 seconds
        enableCompression: true,
        compressionMethod: 'lz-string',
        maxSaveSlots: 5,
        enableCloudSave: false,
        enableLocalBackup: true,
        backupRetentionDays: 7,
        enableSaveValidation: true,
        enableMigrations: true
    },

    // UI/UX
    ui: {
        enableAnimations: true,
        animationDuration: 300, // ms
        enableTransitions: true,
        transitionDuration: 200, // ms
        enableKeyboardShortcuts: true,
        enableAccessibility: true,
        enableMobileOptimizations: true,
        enableTouchOptimizations: true,
        showLoadingIndicators: true,
        loadingIndicatorDelay: 500 // ms
    },

    // Security
    security: {
        enableCSP: true,
        enableXSSProtection: true,
        enableInputSanitization: true,
        maxRequestSize: 1048576, // 1MB
        enableRateLimiting: true,
        rateLimitPerMinute: 60,
        enableSessionValidation: true,
        sessionTimeout: 3600000 // 1 hour
    },

    // Monitoring
    monitoring: {
        enablePerformanceMonitoring: true,
        enableErrorMonitoring: true,
        enableUsageAnalytics: false, // Disabled by default for privacy
        performanceReportInterval: 60000, // 1 minute
        enableMemoryMonitoring: true,
        memoryWarningThreshold: 0.8, // 80% usage
        enableNetworkMonitoring: true,
        slowRequestThreshold: 3000 // 3 seconds
    },

    // Feature Flags
    features: {
        enableSkillTree: true,
        enableCombat: true,
        enableSects: true,
        enableGacha: true,
        enableQuests: true,
        enablePvP: false,
        enableGuilds: false,
        enableMarketplace: false,
        enableAchievements: true,
        enableLeaderboards: false,
        enableEvents: true,
        enableSeasonalContent: true
    },

    // Game Balance
    balance: {
        experienceMultiplier: 1.0,
        resourceMultiplier: 1.0,
        difficultyMultiplier: 1.0,
        maxLevel: 100,
        maxRealm: 10,
        maxSkillLevel: 20,
        enableBalanceValidation: true,
        enableAntiCheat: true
    },

    // API Configuration
    api: {
        baseUrl: window.location.origin,
        apiVersion: 'v1',
        timeout: 10000, // 10 seconds
        enableRetries: true,
        maxRetries: 3,
        retryDelay: 1000,
        enableCache: true,
        cacheTimeout: 60000 // 1 minute
    },

    // Logging
    logging: {
        enableConsoleLogging: false,
        enableFileLogging: false,
        logRotationSize: 10485760, // 10MB
        logRetentionDays: 7,
        logLevel: 'warn',
        enableStackTraces: true,
        enableTimestamps: true,
        enableUserIdentification: false
    },

    // Deployment
    deployment: {
        enableMinification: true,
        enableBundling: true,
        enableCompression: true,
        enableCDN: false,
        cdnUrl: '',
        enableServiceWorker: false,
        enablePWA: false,
        enableOfflineMode: false
    }
};

// Apply production configuration
(function applyProductionConfig() {
    const config = window.PRODUCTION_CONFIG;

    // Set logging level
    if (config.logging.enableConsoleLogging === false) {
        // Override console methods in production
        const noop = () => {};
        console.log = config.logging.logLevel === 'debug' ? console.log : noop;
        console.info = ['debug', 'info'].includes(config.logging.logLevel) ? console.info : noop;
        console.debug = config.logging.logLevel === 'debug' ? console.debug : noop;
    }

    // Apply error handling configuration
    if (config.errorHandling.enableErrorBoundaries) {
        window.addEventListener('error', function(event) {
            if (config.errorHandling.enableErrorReporting) {
                // Report error to monitoring service
                reportError(event.error, {
                    message: event.message,
                    source: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            }

            // Prevent error from bubbling if non-critical
            if (config.errorHandling.suppressNonCriticalErrors && !isCriticalError(event.error)) {
                event.preventDefault();
            }
        });

        window.addEventListener('unhandledrejection', function(event) {
            if (config.errorHandling.enableErrorReporting) {
                reportError(event.reason, {
                    type: 'unhandledRejection',
                    promise: event.promise
                });
            }

            // Prevent rejection from bubbling if non-critical
            if (config.errorHandling.suppressNonCriticalErrors && !isCriticalError(event.reason)) {
                event.preventDefault();
            }
        });
    }

    // Apply performance optimizations
    if (config.performance.enableOptimizations) {
        // Throttle scroll events
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(function() {
                // Handle scroll
            }, config.performance.renderThrottle);
        }, { passive: true });

        // Throttle resize events
        let resizeTimeout;
        window.addEventListener('resize', function() {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(function() {
                // Handle resize
            }, config.performance.renderThrottle);
        });
    }

    // Helper function to determine if error is critical
    function isCriticalError(error) {
        if (!error) return false;

        const criticalPatterns = [
            /Cannot read prop/i,
            /undefined is not/i,
            /null is not/i,
            /Failed to fetch/i,
            /Network error/i,
            /SyntaxError/i,
            /ReferenceError/i,
            /TypeError.*undefined/i
        ];

        const message = error.message || error.toString();
        return criticalPatterns.some(pattern => pattern.test(message));
    }

    // Helper function to report errors
    function reportError(error, context = {}) {
        if (!config.errorHandling.enableErrorReporting) return;

        const errorData = {
            message: error?.message || 'Unknown error',
            stack: error?.stack || '',
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            version: config.version
        };

        // Log to console in development
        if (config.environment !== 'production' || config.logging.logLevel === 'debug') {
            console.error('Error reported:', errorData);
        }

        // Send to error reporting endpoint
        if (config.errorHandling.errorReportingEndpoint) {
            fetch(config.errorHandling.errorReportingEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
            }).catch(() => {
                // Silently fail if error reporting fails
            });
        }
    }

    // Export configuration for use in other modules
    window.getProductionConfig = function(path) {
        const keys = path.split('.');
        let value = config;
        for (const key of keys) {
            value = value[key];
            if (value === undefined) return undefined;
        }
        return value;
    };

    console.info('Production configuration applied:', config.version);
})();