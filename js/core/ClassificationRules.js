/**
 * ClassificationRules.js - Rule-based classification engine for error handling
 * Provides flexible rule system for error classification with priority and conditions
 */

class ClassificationRules {
    constructor() {
        this.rules = this.initializeRules();
        this.customRules = [];
        this.ruleStats = new Map();

        // Rule evaluation context
        this.evaluationContext = {
            gameState: null,
            userActivity: null,
            systemHealth: null,
            timestamp: Date.now()
        };
    }

    /**
     * Get all classification rules
     * @returns {Array} Array of classification rules
     */
    getRules() {
        return [...this.rules, ...this.customRules].sort((a, b) => b.priority - a.priority);
    }

    /**
     * Initialize default classification rules
     */
    initializeRules() {
        return [
            // Critical System Rules
            ...this.createCriticalSystemRules(),

            // Save System Rules
            ...this.createSaveSystemRules(),

            // Progression System Rules
            ...this.createProgressionRules(),

            // UI System Rules
            ...this.createUIRules(),

            // Performance Rules
            ...this.createPerformanceRules(),

            // Network Rules
            ...this.createNetworkRules(),

            // Memory Rules
            ...this.createMemoryRules(),

            // Validation Rules
            ...this.createValidationRules(),

            // Fallback Rules
            ...this.createFallbackRules()
        ];
    }

    /**
     * Critical System Rules
     */
    createCriticalSystemRules() {
        return [
            {
                id: 'critical_boot_failure',
                name: 'Critical Boot Failure Rule',
                priority: 1000,
                conditions: [
                    {
                        type: 'message_contains',
                        values: ['initialization failed', 'bootstrap error', 'critical startup'],
                        operator: 'OR'
                    },
                    {
                        type: 'stack_contains',
                        values: ['initialize', 'bootstrap', 'startup'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'CORE',
                    strategy: 'RESTART'
                },
                confidence: 0.95,
                metadata: {
                    immediateAction: true,
                    userNotification: true,
                    emergencySave: true
                }
            },
            {
                id: 'unhandled_critical_error',
                name: 'Unhandled Critical Error Rule',
                priority: 950,
                conditions: [
                    {
                        type: 'message_contains',
                        values: ['unhandled', 'fatal', 'uncaught'],
                        operator: 'OR'
                    },
                    {
                        type: 'context_check',
                        property: 'criticalSystem',
                        operator: 'EQUALS',
                        value: true
                    }
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'CORE',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.9,
                metadata: {
                    escalate: true,
                    emergencySave: true
                }
            },
            {
                id: 'security_violation_rule',
                name: 'Security Violation Rule',
                priority: 900,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /security|unauthorized|permission.*denied|access.*violation/i
                    }
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'CORE',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.95
            }
        ];
    }

    /**
     * Save System Rules
     */
    createSaveSystemRules() {
        return [
            {
                id: 'save_corruption_rule',
                name: 'Save Corruption Detection Rule',
                priority: 850,
                conditions: [
                    {
                        type: 'message_contains',
                        values: ['corrupt', 'checksum', 'verification failed'],
                        operator: 'OR'
                    },
                    {
                        type: 'system_involved',
                        systems: ['save', 'storage'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'SAVE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.9
            },
            {
                id: 'storage_quota_rule',
                name: 'Storage Quota Rule',
                priority: 800,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /quota.*exceeded|storage.*full|not.*enough.*space/i
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'SAVE',
                    strategy: 'RETRY'
                },
                confidence: 0.95,
                metadata: {
                    suggestedAction: 'cleanup_storage'
                }
            },
            {
                id: 'save_migration_rule',
                name: 'Save Migration Rule',
                priority: 750,
                conditions: [
                    {
                        type: 'message_contains',
                        values: ['migration', 'version mismatch', 'incompatible save'],
                        operator: 'OR'
                    },
                    {
                        type: 'context_check',
                        property: 'operation',
                        operator: 'EQUALS',
                        value: 'migration'
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'SAVE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.85
            }
        ];
    }

    /**
     * Progression System Rules
     */
    createProgressionRules() {
        return [
            {
                id: 'cp_overflow_rule',
                name: 'CP Overflow Rule',
                priority: 700,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /cp.*overflow|cultivation.*point.*exceed|number.*too.*large/i
                    },
                    {
                        type: 'stack_contains',
                        values: ['calculateCP', 'CultivationProgress'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'PROGRESSION',
                    strategy: 'FALLBACK'
                },
                confidence: 0.9,
                metadata: {
                    suggestedAction: 'reset_cp_safe_value'
                }
            },
            {
                id: 'realm_advancement_rule',
                name: 'Realm Advancement Error Rule',
                priority: 650,
                conditions: [
                    {
                        type: 'message_contains',
                        values: ['realm', 'advancement', 'breakthrough', 'stage transition'],
                        operator: 'OR'
                    },
                    {
                        type: 'context_check',
                        property: 'operation',
                        operator: 'CONTAINS',
                        value: 'advance'
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'PROGRESSION',
                    strategy: 'RETRY'
                },
                confidence: 0.8
            },
            {
                id: 'negative_cp_rule',
                name: 'Negative CP Rule',
                priority: 680,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /negative.*cp|cp.*below.*zero/i
                    },
                    {
                        type: 'custom_function',
                        function: (error, context, analysis) => {
                            return context.cpValue && context.cpValue < 0;
                        }
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'PROGRESSION',
                    strategy: 'FALLBACK'
                },
                confidence: 0.95
            }
        ];
    }

    /**
     * UI System Rules
     */
    createUIRules() {
        return [
            {
                id: 'render_failure_rule',
                name: 'Render Failure Rule',
                priority: 600,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /render.*fail|animation.*frame.*error|ui.*update.*crash/i
                    },
                    {
                        type: 'stack_contains',
                        values: ['requestAnimationFrame', 'UIManager', 'render'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'UI',
                    strategy: 'FALLBACK'
                },
                confidence: 0.85
            },
            {
                id: 'dom_error_rule',
                name: 'DOM Error Rule',
                priority: 550,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /cannot.*read.*property.*of.*null|element.*not.*found/i
                    },
                    {
                        type: 'stack_contains',
                        values: ['querySelector', 'getElementById', 'appendChild'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'UI',
                    strategy: 'RETRY'
                },
                confidence: 0.8
            }
        ];
    }

    /**
     * Performance Rules
     */
    createPerformanceRules() {
        return [
            {
                id: 'memory_pressure_rule',
                name: 'Memory Pressure Rule',
                priority: 800,
                conditions: [
                    {
                        type: 'context_threshold',
                        property: 'memoryUsage',
                        operator: 'GREATER_THAN',
                        value: 100 * 1024 * 1024 // 100MB
                    },
                    {
                        type: 'message_contains',
                        values: ['memory', 'heap', 'gc pressure'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'MEMORY',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.9
            },
            {
                id: 'cpu_spike_rule',
                name: 'CPU Spike Rule',
                priority: 700,
                conditions: [
                    {
                        type: 'context_threshold',
                        property: 'cpuUsage',
                        operator: 'GREATER_THAN',
                        value: 80
                    },
                    {
                        type: 'message_regex',
                        pattern: /cpu.*spike|high.*cpu|performance.*degrad/i
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'PERFORMANCE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.85
            },
            {
                id: 'frame_drop_rule',
                name: 'Frame Drop Rule',
                priority: 600,
                conditions: [
                    {
                        type: 'context_threshold',
                        property: 'fps',
                        operator: 'LESS_THAN',
                        value: 30
                    },
                    {
                        type: 'message_contains',
                        values: ['frame drop', 'fps', 'frame rate'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'PERFORMANCE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.75
            }
        ];
    }

    /**
     * Network Rules
     */
    createNetworkRules() {
        return [
            {
                id: 'network_timeout_rule',
                name: 'Network Timeout Rule',
                priority: 500,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /timeout|connection.*timeout|request.*timeout/i
                    },
                    {
                        type: 'stack_contains',
                        values: ['fetch', 'XMLHttpRequest'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'NETWORK',
                    strategy: 'RETRY'
                },
                confidence: 0.85
            },
            {
                id: 'connection_lost_rule',
                name: 'Connection Lost Rule',
                priority: 550,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /connection.*lost|network.*error|offline/i
                    },
                    {
                        type: 'context_check',
                        property: 'navigator.onLine',
                        operator: 'EQUALS',
                        value: false
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'NETWORK',
                    strategy: 'FALLBACK'
                },
                confidence: 0.9
            }
        ];
    }

    /**
     * Memory Rules
     */
    createMemoryRules() {
        return [
            {
                id: 'out_of_memory_rule',
                name: 'Out of Memory Rule',
                priority: 950,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /out.*of.*memory|memory.*exhausted|heap.*overflow/i
                    }
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'MEMORY',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.98
            },
            {
                id: 'memory_leak_rule',
                name: 'Memory Leak Rule',
                priority: 800,
                conditions: [
                    {
                        type: 'message_contains',
                        values: ['memory leak', 'gc pressure'],
                        operator: 'OR'
                    },
                    {
                        type: 'custom_function',
                        function: (error, context, analysis) => {
                            return context.memoryGrowthRate && context.memoryGrowthRate > 10; // 10MB/min
                        }
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'MEMORY',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.85
            }
        ];
    }

    /**
     * Validation Rules
     */
    createValidationRules() {
        return [
            {
                id: 'data_validation_rule',
                name: 'Data Validation Rule',
                priority: 400,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /validation.*fail|invalid.*data|schema.*violation/i
                    },
                    {
                        type: 'stack_contains',
                        values: ['validate', 'DataValidator'],
                        operator: 'OR'
                    }
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'VALIDATION',
                    strategy: 'FALLBACK'
                },
                confidence: 0.8
            }
        ];
    }

    /**
     * Fallback Rules
     */
    createFallbackRules() {
        return [
            {
                id: 'error_severity_high',
                name: 'High Severity Fallback',
                priority: 100,
                conditions: [
                    {
                        type: 'message_regex',
                        pattern: /critical|fatal|severe|emergency/i
                    }
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'CORE',
                    strategy: 'RETRY'
                },
                confidence: 0.6
            },
            {
                id: 'default_fallback',
                name: 'Default Fallback Rule',
                priority: 1,
                conditions: [
                    {
                        type: 'always_true'
                    }
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'CORE',
                    strategy: 'RETRY'
                },
                confidence: 0.3
            }
        ];
    }

    /**
     * Evaluate rules against error and context
     * @param {Array} analysisResults - Results from pattern analysis
     * @param {Object} context - Error context
     * @returns {Object} Best matching rule result
     */
    evaluateRules(analysisResults, context) {
        const matchingRules = [];

        for (const rule of this.getRules()) {
            if (this.evaluateRuleConditions(rule.conditions, analysisResults, context)) {
                matchingRules.push({
                    rule: rule.id,
                    name: rule.name,
                    priority: rule.priority,
                    classification: rule.classification,
                    confidence: rule.confidence,
                    metadata: rule.metadata || {}
                });

                // Update rule statistics
                this.updateRuleStats(rule.id, true);
            } else {
                this.updateRuleStats(rule.id, false);
            }
        }

        // Return highest priority match
        if (matchingRules.length > 0) {
            return matchingRules[0]; // Already sorted by priority
        }

        // Return default fallback
        return {
            rule: 'default_fallback',
            name: 'Default Fallback',
            priority: 1,
            classification: {
                severity: 'MEDIUM',
                system: 'CORE',
                strategy: 'RETRY'
            },
            confidence: 0.3,
            metadata: { fallback: true }
        };
    }

    /**
     * Evaluate rule conditions
     * @param {Array} conditions - Rule conditions
     * @param {Object} analysisResults - Analysis results
     * @param {Object} context - Error context
     * @returns {boolean} Whether conditions are met
     */
    evaluateRuleConditions(conditions, analysisResults, context) {
        if (!conditions || conditions.length === 0) {
            return false;
        }

        for (const condition of conditions) {
            if (!this.evaluateCondition(condition, analysisResults, context)) {
                return false; // All conditions must be true (AND logic)
            }
        }

        return true;
    }

    /**
     * Evaluate single condition
     * @param {Object} condition - Condition to evaluate
     * @param {Object} analysisResults - Analysis results
     * @param {Object} context - Error context
     * @returns {boolean} Whether condition is met
     */
    evaluateCondition(condition, analysisResults, context) {
        const error = analysisResults.normalizedError || context.error;

        switch (condition.type) {
            case 'always_true':
                return true;

            case 'message_contains':
                if (!error || !error.message) return false;
                const message = error.message.toLowerCase();
                if (condition.operator === 'OR') {
                    return condition.values.some(value =>
                        message.includes(value.toLowerCase())
                    );
                } else {
                    return condition.values.every(value =>
                        message.includes(value.toLowerCase())
                    );
                }

            case 'message_regex':
                if (!error || !error.message) return false;
                return condition.pattern.test(error.message);

            case 'stack_contains':
                if (!error || !error.stack) return false;
                const stack = error.stack.toLowerCase();
                if (condition.operator === 'OR') {
                    return condition.values.some(value =>
                        stack.includes(value.toLowerCase())
                    );
                } else {
                    return condition.values.every(value =>
                        stack.includes(value.toLowerCase())
                    );
                }

            case 'context_check':
                const contextValue = this.getNestedProperty(context, condition.property);
                switch (condition.operator) {
                    case 'EQUALS':
                        return contextValue === condition.value;
                    case 'NOT_EQUALS':
                        return contextValue !== condition.value;
                    case 'CONTAINS':
                        return String(contextValue).toLowerCase().includes(
                            String(condition.value).toLowerCase()
                        );
                    default:
                        return false;
                }

            case 'context_threshold':
                const thresholdValue = this.getNestedProperty(context, condition.property);
                if (typeof thresholdValue !== 'number') return false;

                switch (condition.operator) {
                    case 'GREATER_THAN':
                        return thresholdValue > condition.value;
                    case 'LESS_THAN':
                        return thresholdValue < condition.value;
                    case 'EQUALS':
                        return thresholdValue === condition.value;
                    default:
                        return false;
                }

            case 'system_involved':
                const involvedSystems = context.systems || [];
                if (condition.operator === 'OR') {
                    return condition.systems.some(system =>
                        involvedSystems.includes(system)
                    );
                } else {
                    return condition.systems.every(system =>
                        involvedSystems.includes(system)
                    );
                }

            case 'custom_function':
                if (typeof condition.function === 'function') {
                    try {
                        return condition.function(error, context, analysisResults);
                    } catch (e) {
                        console.warn('Error in custom rule function:', e);
                        return false;
                    }
                }
                return false;

            default:
                console.warn('Unknown condition type:', condition.type);
                return false;
        }
    }

    /**
     * Get nested property from object
     * @param {Object} obj - Object to search
     * @param {string} path - Property path (e.g., 'navigator.onLine')
     * @returns {*} Property value
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Add custom rule
     * @param {Object} rule - Rule object
     */
    addRule(rule) {
        if (!this.validateRule(rule)) {
            throw new Error('Invalid rule structure');
        }

        this.customRules.push(rule);
        console.log(`ClassificationRules: Added custom rule ${rule.id}`);
    }

    /**
     * Remove rule by ID
     * @param {string} id - Rule ID
     */
    removeRule(id) {
        const defaultIndex = this.rules.findIndex(rule => rule.id === id);
        if (defaultIndex !== -1) {
            console.warn('Cannot remove default rule:', id);
            return false;
        }

        const customIndex = this.customRules.findIndex(rule => rule.id === id);
        if (customIndex !== -1) {
            this.customRules.splice(customIndex, 1);
            console.log(`ClassificationRules: Removed custom rule ${id}`);
            return true;
        }

        return false;
    }

    /**
     * Validate rule structure
     * @param {Object} rule - Rule to validate
     * @returns {boolean} Whether rule is valid
     */
    validateRule(rule) {
        if (!rule.id || !rule.name || !rule.conditions || !rule.classification) {
            return false;
        }

        if (!Array.isArray(rule.conditions)) {
            return false;
        }

        if (!rule.classification.severity || !rule.classification.system || !rule.classification.strategy) {
            return false;
        }

        return true;
    }

    /**
     * Update rule statistics
     * @param {string} ruleId - Rule ID
     * @param {boolean} matched - Whether rule matched
     */
    updateRuleStats(ruleId, matched) {
        if (!this.ruleStats.has(ruleId)) {
            this.ruleStats.set(ruleId, { matches: 0, evaluations: 0 });
        }

        const stats = this.ruleStats.get(ruleId);
        stats.evaluations++;
        if (matched) {
            stats.matches++;
        }
    }

    /**
     * Get rule statistics
     * @returns {Object} Rule statistics
     */
    getStatistics() {
        const stats = {
            totalRules: this.getRules().length,
            defaultRules: this.rules.length,
            customRules: this.customRules.length,
            ruleMatches: {}
        };

        for (const [ruleId, ruleStats] of this.ruleStats.entries()) {
            stats.ruleMatches[ruleId] = {
                ...ruleStats,
                accuracy: ruleStats.evaluations > 0 ? ruleStats.matches / ruleStats.evaluations : 0
            };
        }

        return stats;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassificationRules;
} else {
    window.ClassificationRules = ClassificationRules;
}