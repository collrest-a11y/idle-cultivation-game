/**
 * Production Configuration System for Error Handling
 *
 * Enterprise-level error handling configuration with environment-specific settings,
 * feature flags, performance thresholds, and compliance controls.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

class ProductionConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.buildConfiguration();
        this.featureFlags = this.initializeFeatureFlags();
        this.thresholds = this.definePerformanceThresholds();
        this.compliance = this.setupComplianceSettings();
        this.monitoring = this.configureMonitoring();

        // Validate configuration on initialization
        this.validateConfiguration();

        // Initialize runtime state
        this.runtime = {
            startTime: Date.now(),
            configVersion: '1.0.0',
            lastUpdate: Date.now(),
            healthStatus: 'initializing'
        };

        console.log('[ProductionConfig] Initialized for environment:', this.environment);
    }

    /**
     * Detect the current deployment environment
     */
    detectEnvironment() {
        // Check various environment indicators
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const userAgent = navigator.userAgent;

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
            return 'development';
        }

        if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        }

        if (hostname.includes('preview') || hostname.includes('beta')) {
            return 'preview';
        }

        // Production indicators
        if (protocol === 'https:' && !hostname.includes('dev')) {
            return 'production';
        }

        return 'development'; // Default fallback
    }

    /**
     * Build environment-specific configuration
     */
    buildConfiguration() {
        const baseConfig = {
            // Core error handling settings
            errorHandling: {
                enabled: true,
                maxRetries: 3,
                retryDelay: 1000,
                timeout: 30000,
                batchSize: 100,
                bufferLimit: 1000
            },

            // Logging configuration
            logging: {
                level: 'info',
                console: true,
                remote: false,
                maxLogSize: 1024 * 1024, // 1MB
                retention: 7 * 24 * 60 * 60 * 1000 // 7 days
            },

            // Performance settings
            performance: {
                monitoring: true,
                sampling: 1.0,
                metrics: true,
                tracing: false,
                profiling: false
            },

            // Security settings
            security: {
                sanitization: true,
                encryption: false,
                anonymization: false,
                auditLogging: false
            },

            // UI/UX settings
            ui: {
                notifications: true,
                dashboard: false,
                animations: true,
                sounds: false,
                accessibility: true
            }
        };

        // Environment-specific overrides
        const environmentOverrides = {
            development: {
                logging: {
                    level: 'debug',
                    console: true,
                    remote: false
                },
                performance: {
                    tracing: true,
                    profiling: true
                },
                ui: {
                    dashboard: true,
                    notifications: true
                }
            },

            staging: {
                logging: {
                    level: 'info',
                    console: true,
                    remote: true
                },
                performance: {
                    sampling: 0.5,
                    tracing: true
                },
                security: {
                    auditLogging: true
                },
                ui: {
                    dashboard: true
                }
            },

            preview: {
                logging: {
                    level: 'warn',
                    remote: true
                },
                performance: {
                    sampling: 0.1
                },
                security: {
                    sanitization: true,
                    auditLogging: true
                }
            },

            production: {
                logging: {
                    level: 'error',
                    console: false,
                    remote: true
                },
                performance: {
                    sampling: 0.01,
                    metrics: true,
                    tracing: false,
                    profiling: false
                },
                security: {
                    sanitization: true,
                    encryption: true,
                    anonymization: true,
                    auditLogging: true
                },
                ui: {
                    dashboard: false,
                    notifications: false,
                    sounds: false
                }
            }
        };

        // Deep merge base config with environment overrides
        return this.deepMerge(baseConfig, environmentOverrides[this.environment] || {});
    }

    /**
     * Initialize feature flags for gradual rollout
     */
    initializeFeatureFlags() {
        const flags = {
            // Error handling features
            advancedClassification: this.environment !== 'production' ? 1.0 : 0.1,
            autoRecovery: this.environment !== 'production' ? 1.0 : 0.05,
            predictiveAnalysis: this.environment === 'development' ? 1.0 : 0.0,

            // UI features
            errorDashboard: this.environment !== 'production' ? 1.0 : 0.0,
            realTimeNotifications: this.environment !== 'production' ? 1.0 : 0.1,
            errorAnimations: this.environment !== 'production' ? 1.0 : 0.5,

            // Performance features
            backgroundProcessing: 1.0,
            compressionEnabled: this.environment === 'production' ? 1.0 : 0.5,
            cacheOptimization: 1.0,

            // Security features
            dataEncryption: this.environment === 'production' ? 1.0 : 0.0,
            accessControl: this.environment === 'production' ? 1.0 : 0.0,
            auditTrail: this.environment === 'production' ? 1.0 : 0.5,

            // Analytics features
            userBehaviorTracking: this.environment === 'production' ? 1.0 : 0.1,
            performanceAnalytics: 1.0,
            businessIntelligence: this.environment === 'production' ? 1.0 : 0.0
        };

        // Add user-based rollout logic
        const userId = this.getUserId();
        if (userId) {
            // Use consistent hash for user-based rollouts
            const userHash = this.hashUserId(userId);

            // Adjust flags based on user segment
            Object.keys(flags).forEach(flag => {
                if (flags[flag] < 1.0) {
                    flags[flag] = userHash < flags[flag] ? 1.0 : 0.0;
                }
            });
        }

        return flags;
    }

    /**
     * Define performance thresholds and alerting rules
     */
    definePerformanceThresholds() {
        return {
            // Error processing performance
            errorProcessingLatency: {
                warning: 50,    // 50ms
                critical: 100   // 100ms
            },

            // Memory usage limits
            memoryUsage: {
                warning: 50 * 1024 * 1024,   // 50MB
                critical: 100 * 1024 * 1024  // 100MB
            },

            // CPU usage thresholds
            cpuUsage: {
                warning: 5,    // 5%
                critical: 10   // 10%
            },

            // Network bandwidth limits
            networkBandwidth: {
                warning: 500,   // 500 bytes/second
                critical: 1000  // 1KB/second
            },

            // Error rate thresholds
            errorRate: {
                warning: 0.01,  // 1%
                critical: 0.05  // 5%
            },

            // Storage usage limits
            storageUsage: {
                warning: 50 * 1024 * 1024,   // 50MB
                critical: 100 * 1024 * 1024  // 100MB
            },

            // Response time limits
            responseTime: {
                warning: 1000,  // 1 second
                critical: 5000  // 5 seconds
            }
        };
    }

    /**
     * Setup compliance and privacy settings
     */
    setupComplianceSettings() {
        return {
            // Data privacy settings
            dataPrivacy: {
                piiDetection: this.environment === 'production',
                dataAnonymization: this.environment === 'production',
                dataRetention: this.environment === 'production' ? 30 : 7, // days
                rightToErasure: this.environment === 'production'
            },

            // Security compliance
            security: {
                dataEncryption: this.environment === 'production',
                accessLogging: this.environment !== 'development',
                sessionTracking: this.environment === 'production',
                vulnerabilityScanning: true
            },

            // Regulatory compliance
            regulations: {
                gdpr: this.environment === 'production',
                ccpa: this.environment === 'production',
                hipaa: false, // Not applicable for gaming
                sox: false    // Not applicable for gaming
            },

            // Audit requirements
            audit: {
                errorTracking: true,
                accessControl: this.environment === 'production',
                dataChanges: this.environment !== 'development',
                systemChanges: true
            }
        };
    }

    /**
     * Configure monitoring and alerting
     */
    configureMonitoring() {
        return {
            // Health check configuration
            healthCheck: {
                interval: 30000, // 30 seconds
                timeout: 5000,   // 5 seconds
                retries: 3,
                endpoints: [
                    '/health',
                    '/api/status',
                    '/monitoring/ping'
                ]
            },

            // Metrics collection
            metrics: {
                enabled: true,
                interval: 60000, // 1 minute
                retention: 24 * 60 * 60 * 1000, // 24 hours
                aggregation: 'average'
            },

            // Alerting configuration
            alerting: {
                enabled: this.environment === 'production',
                channels: ['email', 'slack', 'webhook'],
                thresholds: this.thresholds,
                escalation: {
                    warning: 300000,   // 5 minutes
                    critical: 60000    // 1 minute
                }
            },

            // Performance monitoring
            performance: {
                realUserMonitoring: this.environment === 'production',
                syntheticMonitoring: this.environment !== 'development',
                apmEnabled: this.environment === 'production'
            }
        };
    }

    /**
     * Check if a feature is enabled for the current user
     */
    isFeatureEnabled(featureName) {
        const flag = this.featureFlags[featureName];
        return flag !== undefined ? flag >= 1.0 : false;
    }

    /**
     * Get configuration value with fallback
     */
    get(path, defaultValue = null) {
        return this.getNestedValue(this.config, path) || defaultValue;
    }

    /**
     * Update configuration at runtime
     */
    updateConfig(path, value) {
        this.setNestedValue(this.config, path, value);
        this.runtime.lastUpdate = Date.now();
        this.validateConfiguration();
    }

    /**
     * Validate configuration integrity
     */
    validateConfiguration() {
        const requiredPaths = [
            'errorHandling.enabled',
            'logging.level',
            'performance.monitoring',
            'security.sanitization'
        ];

        for (const path of requiredPaths) {
            if (this.getNestedValue(this.config, path) === undefined) {
                throw new Error(`Required configuration missing: ${path}`);
            }
        }

        this.runtime.healthStatus = 'healthy';
    }

    /**
     * Get system information for debugging
     */
    getSystemInfo() {
        return {
            environment: this.environment,
            configVersion: this.runtime.configVersion,
            uptime: Date.now() - this.runtime.startTime,
            lastUpdate: this.runtime.lastUpdate,
            healthStatus: this.runtime.healthStatus,
            featureFlags: Object.keys(this.featureFlags).reduce((acc, key) => {
                acc[key] = this.isFeatureEnabled(key);
                return acc;
            }, {})
        };
    }

    // Utility methods
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    getUserId() {
        // Try to get user ID from various sources
        return localStorage.getItem('userId') ||
               sessionStorage.getItem('userId') ||
               null;
    }

    hashUserId(userId) {
        // Simple hash function for consistent user bucketing
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) / Math.pow(2, 31); // Normalize to 0-1
    }
}

// Global configuration instance
window.ProductionConfig = new ProductionConfig();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductionConfig;
}