/**
 * ErrorPatterns.js - Comprehensive error patterns for cultivation game
 * Defines specific error patterns for intelligent classification and recovery
 */

class ErrorPatterns {
    constructor() {
        this.patterns = this.initializePatterns();
        this.patternCategories = {
            SAVE_SYSTEM: 'save_system',
            PROGRESSION: 'progression',
            UI_SYSTEM: 'ui_system',
            PERFORMANCE: 'performance',
            NETWORK: 'network',
            VALIDATION: 'validation',
            CRITICAL: 'critical'
        };
    }

    /**
     * Get all error patterns
     * @returns {Array} Array of error patterns
     */
    getPatterns() {
        return this.patterns;
    }

    /**
     * Get patterns by category
     * @param {string} category - Pattern category
     * @returns {Array} Filtered patterns
     */
    getPatternsByCategory(category) {
        return this.patterns.filter(pattern => pattern.category === category);
    }

    /**
     * Initialize comprehensive error patterns
     */
    initializePatterns() {
        return [
            // Save System Error Patterns
            ...this.createSaveSystemPatterns(),

            // Progression System Error Patterns
            ...this.createProgressionPatterns(),

            // UI System Error Patterns
            ...this.createUIPatterns(),

            // Performance Error Patterns
            ...this.createPerformancePatterns(),

            // Network Error Patterns
            ...this.createNetworkPatterns(),

            // Validation Error Patterns
            ...this.createValidationPatterns(),

            // Critical System Error Patterns
            ...this.createCriticalPatterns()
        ];
    }

    /**
     * Save System Error Patterns
     */
    createSaveSystemPatterns() {
        return [
            {
                id: 'save_corruption_detected',
                name: 'Save Data Corruption',
                category: this.patternCategories.SAVE_SYSTEM,
                priority: 95,
                messagePatterns: [
                    /save.*corrupt/i,
                    /invalid.*save.*data/i,
                    /save.*verification.*fail/i,
                    /checksum.*mismatch/i
                ],
                stackPatterns: [
                    /SaveManager/i,
                    /GameSaveSystem/i,
                    /validateSave/i
                ],
                contextPatterns: {
                    operation: /save|load/i,
                    system: /save/i
                },
                classification: {
                    severity: 'CRITICAL',
                    system: 'SAVE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.95,
                recoveryHints: [
                    'Restore from backup save',
                    'Run save repair utilities',
                    'Reset to last valid checkpoint'
                ]
            },
            {
                id: 'storage_quota_exceeded',
                name: 'Storage Quota Exceeded',
                category: this.patternCategories.SAVE_SYSTEM,
                priority: 85,
                messagePatterns: [
                    /quota.*exceeded/i,
                    /storage.*full/i,
                    /not.*enough.*space/i,
                    /localStorage.*quota/i
                ],
                stackPatterns: [
                    /localStorage/i,
                    /setItem/i
                ],
                contextPatterns: {
                    operation: /save/i
                },
                classification: {
                    severity: 'HIGH',
                    system: 'SAVE',
                    strategy: 'RETRY'
                },
                confidence: 0.9,
                recoveryHints: [
                    'Clear old save data',
                    'Compress save data',
                    'Use alternative storage'
                ]
            },
            {
                id: 'save_version_mismatch',
                name: 'Save Version Mismatch',
                category: this.patternCategories.SAVE_SYSTEM,
                priority: 80,
                messagePatterns: [
                    /version.*mismatch/i,
                    /incompatible.*save/i,
                    /save.*version.*unsupported/i,
                    /migration.*failed/i
                ],
                stackPatterns: [
                    /MigrationManager/i,
                    /versionCheck/i
                ],
                contextPatterns: {
                    operation: /load|migration/i
                },
                classification: {
                    severity: 'HIGH',
                    system: 'SAVE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.85,
                recoveryHints: [
                    'Run save migration',
                    'Create backup before migration',
                    'Reset to compatible version'
                ]
            },

            // CP Progression System Error Patterns
            {
                id: 'cp_calculation_overflow',
                name: 'CP Calculation Overflow',
                category: this.patternCategories.PROGRESSION,
                priority: 90,
                messagePatterns: [
                    /cp.*overflow/i,
                    /cultivation.*point.*exceed/i,
                    /number.*too.*large/i,
                    /infinity.*cp/i
                ],
                stackPatterns: [
                    /calculateCP/i,
                    /CultivationProgress/i,
                    /ProgressionManager/i
                ],
                contextPatterns: {
                    system: /progression|cultivation/i,
                    operation: /calculate|update/i
                },
                classification: {
                    severity: 'HIGH',
                    system: 'PROGRESSION',
                    strategy: 'FALLBACK'
                },
                confidence: 0.9,
                recoveryHints: [
                    'Reset CP to safe value',
                    'Use BigNumber calculations',
                    'Apply CP caps'
                ]
            },
            {
                id: 'cultivation_stage_error',
                name: 'Cultivation Stage Transition Error',
                category: this.patternCategories.PROGRESSION,
                priority: 85,
                messagePatterns: [
                    /stage.*transition.*fail/i,
                    /invalid.*cultivation.*stage/i,
                    /realm.*advancement.*error/i,
                    /breakthrough.*failed/i
                ],
                stackPatterns: [
                    /advanceStage/i,
                    /checkBreakthrough/i,
                    /RealmManager/i
                ],
                contextPatterns: {
                    operation: /advance|breakthrough|stage/i
                },
                classification: {
                    severity: 'HIGH',
                    system: 'PROGRESSION',
                    strategy: 'RETRY'
                },
                confidence: 0.85,
                recoveryHints: [
                    'Validate stage requirements',
                    'Reset to previous stage',
                    'Recalculate progression'
                ]
            },
            {
                id: 'resource_generation_failure',
                name: 'Resource Generation Failure',
                category: this.patternCategories.PROGRESSION,
                priority: 75,
                messagePatterns: [
                    /resource.*generation.*fail/i,
                    /qi.*calculation.*error/i,
                    /energy.*production.*stop/i,
                    /idle.*progress.*halt/i
                ],
                stackPatterns: [
                    /ResourceManager/i,
                    /generateResources/i,
                    /calculateIdleProgress/i
                ],
                contextPatterns: {
                    operation: /generate|calculate|idle/i,
                    system: /resource|progression/i
                },
                classification: {
                    severity: 'MEDIUM',
                    system: 'PROGRESSION',
                    strategy: 'RETRY'
                },
                confidence: 0.8,
                recoveryHints: [
                    'Restart resource generation',
                    'Validate calculation formulas',
                    'Reset idle timers'
                ]
            }
        ];
    }

    /**
     * Additional pattern creation methods
     */
    createProgressionPatterns() {
        return [
            {
                id: 'cp_negative_value',
                name: 'Negative CP Value Error',
                category: this.patternCategories.PROGRESSION,
                priority: 85,
                messagePatterns: [
                    /negative.*cp/i,
                    /cp.*below.*zero/i,
                    /invalid.*negative.*cultivation/i
                ],
                stackPatterns: [
                    /setCultivationPoints/i,
                    /updateCP/i
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'PROGRESSION',
                    strategy: 'FALLBACK'
                },
                confidence: 0.9
            },
            {
                id: 'realm_progression_stuck',
                name: 'Realm Progression Stuck',
                category: this.patternCategories.PROGRESSION,
                priority: 70,
                messagePatterns: [
                    /realm.*stuck/i,
                    /progression.*halt/i,
                    /advancement.*blocked/i
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'PROGRESSION',
                    strategy: 'RETRY'
                },
                confidence: 0.75
            }
        ];
    }

    createUIPatterns() {
        return [
            {
                id: 'render_loop_failure',
                name: 'Render Loop Failure',
                category: this.patternCategories.UI_SYSTEM,
                priority: 80,
                messagePatterns: [
                    /render.*loop.*fail/i,
                    /animation.*frame.*error/i,
                    /ui.*update.*crash/i,
                    /requestAnimationFrame.*error/i
                ],
                stackPatterns: [
                    /requestAnimationFrame/i,
                    /UIManager/i,
                    /AnimationManager/i
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'UI',
                    strategy: 'FALLBACK'
                },
                confidence: 0.85
            },
            {
                id: 'dom_manipulation_error',
                name: 'DOM Manipulation Error',
                category: this.patternCategories.UI_SYSTEM,
                priority: 75,
                messagePatterns: [
                    /cannot.*read.*property.*of.*null/i,
                    /element.*not.*found/i,
                    /dom.*manipulation.*fail/i,
                    /querySelector.*null/i
                ],
                stackPatterns: [
                    /querySelector/i,
                    /getElementById/i,
                    /appendChild/i
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'UI',
                    strategy: 'RETRY'
                },
                confidence: 0.8
            },
            {
                id: 'animation_system_failure',
                name: 'Animation System Failure',
                category: this.patternCategories.UI_SYSTEM,
                priority: 65,
                messagePatterns: [
                    /animation.*fail/i,
                    /css.*transition.*error/i,
                    /keyframe.*error/i
                ],
                stackPatterns: [
                    /AnimationManager/i,
                    /animate/i
                ],
                classification: {
                    severity: 'LOW',
                    system: 'UI',
                    strategy: 'FALLBACK'
                },
                confidence: 0.7
            }
        ];
    }

    createPerformancePatterns() {
        return [
            {
                id: 'memory_leak_detected',
                name: 'Memory Leak Detected',
                category: this.patternCategories.PERFORMANCE,
                priority: 90,
                messagePatterns: [
                    /memory.*leak/i,
                    /heap.*size.*exceed/i,
                    /out.*of.*memory/i,
                    /gc.*pressure/i
                ],
                stackPatterns: [
                    /PerformanceMonitor/i,
                    /memoryUsage/i
                ],
                contextPatterns: {
                    memoryUsage: value => value > 100 * 1024 * 1024 // > 100MB
                },
                classification: {
                    severity: 'CRITICAL',
                    system: 'MEMORY',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.95
            },
            {
                id: 'cpu_spike_detected',
                name: 'CPU Spike Detected',
                category: this.patternCategories.PERFORMANCE,
                priority: 80,
                messagePatterns: [
                    /cpu.*spike/i,
                    /high.*cpu.*usage/i,
                    /performance.*degradation/i,
                    /frame.*drop/i
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'PERFORMANCE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.8
            },
            {
                id: 'frame_rate_degradation',
                name: 'Frame Rate Degradation',
                category: this.patternCategories.PERFORMANCE,
                priority: 70,
                messagePatterns: [
                    /fps.*drop/i,
                    /frame.*rate.*low/i,
                    /performance.*issue/i
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

    createNetworkPatterns() {
        return [
            {
                id: 'network_timeout',
                name: 'Network Request Timeout',
                category: this.patternCategories.NETWORK,
                priority: 75,
                messagePatterns: [
                    /network.*timeout/i,
                    /request.*timeout/i,
                    /connection.*timeout/i,
                    /fetch.*timeout/i
                ],
                stackPatterns: [
                    /fetch/i,
                    /XMLHttpRequest/i
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'NETWORK',
                    strategy: 'RETRY'
                },
                confidence: 0.85
            },
            {
                id: 'connection_lost',
                name: 'Connection Lost',
                category: this.patternCategories.NETWORK,
                priority: 80,
                messagePatterns: [
                    /connection.*lost/i,
                    /network.*error/i,
                    /offline/i,
                    /no.*internet/i
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

    createValidationPatterns() {
        return [
            {
                id: 'data_validation_failure',
                name: 'Data Validation Failure',
                category: this.patternCategories.VALIDATION,
                priority: 75,
                messagePatterns: [
                    /validation.*fail/i,
                    /invalid.*data/i,
                    /schema.*violation/i,
                    /type.*mismatch/i
                ],
                stackPatterns: [
                    /validate/i,
                    /DataValidator/i
                ],
                classification: {
                    severity: 'MEDIUM',
                    system: 'VALIDATION',
                    strategy: 'FALLBACK'
                },
                confidence: 0.8
            },
            {
                id: 'state_integrity_error',
                name: 'State Integrity Error',
                category: this.patternCategories.VALIDATION,
                priority: 85,
                messagePatterns: [
                    /state.*integrity/i,
                    /corrupted.*state/i,
                    /invalid.*game.*state/i
                ],
                classification: {
                    severity: 'HIGH',
                    system: 'CORE',
                    strategy: 'FALLBACK'
                },
                confidence: 0.9
            }
        ];
    }

    createCriticalPatterns() {
        return [
            {
                id: 'system_initialization_failure',
                name: 'System Initialization Failure',
                category: this.patternCategories.CRITICAL,
                priority: 100,
                messagePatterns: [
                    /initialization.*fail/i,
                    /system.*startup.*error/i,
                    /critical.*system.*error/i,
                    /bootstrap.*fail/i
                ],
                stackPatterns: [
                    /initialize/i,
                    /bootstrap/i,
                    /startup/i
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'CORE',
                    strategy: 'RESTART'
                },
                confidence: 0.95
            },
            {
                id: 'unrecoverable_error',
                name: 'Unrecoverable System Error',
                category: this.patternCategories.CRITICAL,
                priority: 100,
                messagePatterns: [
                    /unrecoverable/i,
                    /fatal.*error/i,
                    /system.*crash/i,
                    /emergency.*shutdown/i
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'CORE',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.98
            },
            {
                id: 'security_violation',
                name: 'Security Violation',
                category: this.patternCategories.CRITICAL,
                priority: 95,
                messagePatterns: [
                    /security.*violation/i,
                    /unauthorized.*access/i,
                    /permission.*denied/i,
                    /security.*error/i
                ],
                classification: {
                    severity: 'CRITICAL',
                    system: 'CORE',
                    strategy: 'IMMEDIATE'
                },
                confidence: 0.9
            }
        ];
    }

    /**
     * Pattern utilities
     */

    /**
     * Find matching patterns for an error
     * @param {Object} error - Normalized error object
     * @param {Object} context - Error context
     * @returns {Array} Matching patterns
     */
    findMatches(error, context = {}) {
        const matches = [];

        for (const pattern of this.patterns) {
            const score = this.calculatePatternScore(pattern, error, context);
            if (score > 0) {
                matches.push({
                    pattern: pattern.id,
                    name: pattern.name,
                    category: pattern.category,
                    score: score,
                    confidence: pattern.confidence,
                    classification: pattern.classification
                });
            }
        }

        return matches.sort((a, b) => b.score - a.score);
    }

    /**
     * Calculate pattern matching score
     * @param {Object} pattern - Pattern to test
     * @param {Object} error - Error object
     * @param {Object} context - Context object
     * @returns {number} Matching score (0-1)
     */
    calculatePatternScore(pattern, error, context) {
        let score = 0;
        let maxScore = 0;

        // Message pattern matching
        if (pattern.messagePatterns) {
            maxScore += 0.4;
            for (const msgPattern of pattern.messagePatterns) {
                if (msgPattern.test(error.message)) {
                    score += 0.4;
                    break;
                }
            }
        }

        // Stack trace pattern matching
        if (pattern.stackPatterns && error.stack) {
            maxScore += 0.3;
            for (const stackPattern of pattern.stackPatterns) {
                if (stackPattern.test(error.stack)) {
                    score += 0.3;
                    break;
                }
            }
        }

        // Context pattern matching
        if (pattern.contextPatterns) {
            maxScore += 0.3;
            let contextMatch = false;

            for (const [key, expectedPattern] of Object.entries(pattern.contextPatterns)) {
                if (context[key]) {
                    if (typeof expectedPattern === 'function') {
                        if (expectedPattern(context[key])) {
                            contextMatch = true;
                            break;
                        }
                    } else if (expectedPattern instanceof RegExp) {
                        if (expectedPattern.test(String(context[key]))) {
                            contextMatch = true;
                            break;
                        }
                    } else if (context[key] === expectedPattern) {
                        contextMatch = true;
                        break;
                    }
                }
            }

            if (contextMatch) {
                score += 0.3;
            }
        }

        return maxScore > 0 ? score / maxScore : 0;
    }

    /**
     * Get pattern by ID
     * @param {string} id - Pattern ID
     * @returns {Object|null} Pattern object
     */
    getPatternById(id) {
        return this.patterns.find(pattern => pattern.id === id) || null;
    }

    /**
     * Add custom pattern
     * @param {Object} pattern - Pattern object
     */
    addPattern(pattern) {
        // Validate pattern structure
        if (!pattern.id || !pattern.name || !pattern.classification) {
            throw new Error('Invalid pattern structure');
        }

        this.patterns.push(pattern);
        console.log(`ErrorPatterns: Added custom pattern ${pattern.id}`);
    }

    /**
     * Remove pattern by ID
     * @param {string} id - Pattern ID
     */
    removePattern(id) {
        const index = this.patterns.findIndex(pattern => pattern.id === id);
        if (index !== -1) {
            this.patterns.splice(index, 1);
            console.log(`ErrorPatterns: Removed pattern ${id}`);
        }
    }

    /**
     * Get statistics about patterns
     * @returns {Object} Pattern statistics
     */
    getStatistics() {
        const stats = {
            totalPatterns: this.patterns.length,
            byCategory: {},
            bySeverity: {},
            bySystem: {}
        };

        this.patterns.forEach(pattern => {
            // Count by category
            stats.byCategory[pattern.category] = (stats.byCategory[pattern.category] || 0) + 1;

            // Count by severity
            const severity = pattern.classification.severity;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

            // Count by system
            const system = pattern.classification.system;
            stats.bySystem[system] = (stats.bySystem[system] || 0) + 1;
        });

        return stats;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorPatterns;
} else {
    window.ErrorPatterns = ErrorPatterns;
}