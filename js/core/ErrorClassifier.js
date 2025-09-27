/**
 * ErrorClassifier.js - Intelligent error classification and fingerprinting system
 * Provides advanced error categorization with pattern matching and confidence scoring
 */

class ErrorClassifier {
    constructor() {
        this.patterns = null;
        this.rules = null;
        this.learningData = {
            patternHistory: new Map(),
            successfulRecoveries: new Map(),
            confidenceAdjustments: new Map(),
            newPatterns: []
        };

        // Classification configuration
        this.config = {
            confidenceThreshold: 0.7,
            patternMatchWeight: 0.4,
            contextWeight: 0.3,
            historyWeight: 0.3,
            maxPatternHistory: 10000,
            learningEnabled: true,
            fingerprinting: true
        };

        // Classification schemas
        this.severityLevels = {
            CRITICAL: { level: 4, weight: 1.0, immediate: true },
            HIGH: { level: 3, weight: 0.8, immediate: false },
            MEDIUM: { level: 2, weight: 0.6, immediate: false },
            LOW: { level: 1, weight: 0.4, immediate: false },
            INFO: { level: 0, weight: 0.2, immediate: false }
        };

        this.systemCategories = {
            CORE: { critical: true, recoverable: false },
            SAVE: { critical: true, recoverable: true },
            PROGRESSION: { critical: false, recoverable: true },
            UI: { critical: false, recoverable: true },
            NETWORK: { critical: false, recoverable: true },
            MEMORY: { critical: true, recoverable: false }
        };

        this.recoveryStrategies = {
            IMMEDIATE: { delay: 0, retries: 0, aggressive: true },
            RETRY: { delay: 1000, retries: 3, aggressive: false },
            FALLBACK: { delay: 500, retries: 1, aggressive: false },
            RESTART: { delay: 5000, retries: 1, aggressive: true },
            IGNORE: { delay: 0, retries: 0, aggressive: false }
        };

        // Pattern matching engines
        this.stackTraceEngine = new StackTraceAnalyzer();
        this.messageEngine = new MessagePatternEngine();
        this.contextEngine = new ContextAnalyzer();
        this.fingerprintEngine = new ErrorFingerprintEngine();

        // Statistics
        this.stats = {
            totalClassifications: 0,
            accurateClassifications: 0,
            patternMatches: 0,
            confidenceScores: [],
            averageProcessingTime: 0,
            systemTypeDistribution: new Map(),
            severityDistribution: new Map()
        };

        this.initialize();
    }

    /**
     * Initialize the classifier with patterns and rules
     */
    async initialize() {
        try {
            // Import patterns and rules
            await this.loadPatterns();
            await this.loadRules();

            // Load learning data from storage
            await this.loadLearningData();

            console.log('ErrorClassifier: Initialized successfully');
        } catch (error) {
            console.error('ErrorClassifier: Initialization failed:', error);
            // Create minimal fallback patterns
            this.patterns = this.createFallbackPatterns();
            this.rules = this.createFallbackRules();
        }
    }

    /**
     * Main classification method
     * @param {Error|Object} error - Error to classify
     * @param {Object} context - Additional context information
     * @returns {Object} Classification result
     */
    classify(error, context = {}) {
        const startTime = performance.now();

        try {
            // Normalize error input
            const normalizedError = this.normalizeError(error);

            // Generate error fingerprint
            const fingerprint = this.generateFingerprint(normalizedError, context);

            // Check for existing classification
            const cachedResult = this.getCachedClassification(fingerprint);
            if (cachedResult && cachedResult.confidence > this.config.confidenceThreshold) {
                this.updateStatistics(performance.now() - startTime, cachedResult);
                return this.enhanceClassification(cachedResult, context);
            }

            // Perform multi-engine analysis
            const analysisResults = {
                stackTrace: this.stackTraceEngine.analyze(normalizedError, context),
                message: this.messageEngine.analyze(normalizedError, context),
                context: this.contextEngine.analyze(normalizedError, context),
                patterns: this.matchPatterns(normalizedError, context)
            };

            // Apply classification rules
            const ruleResults = this.applyClassificationRules(analysisResults, context);

            // Calculate confidence score
            const confidence = this.calculateConfidence(analysisResults, ruleResults);

            // Determine final classification
            const classification = this.categorizeError(analysisResults, ruleResults, confidence);

            // Enhance with metadata
            const result = {
                severity: classification.severity,
                system: classification.system,
                strategy: classification.strategy,
                confidence: confidence,
                fingerprint: fingerprint,
                patterns: analysisResults.patterns,
                timestamp: Date.now(),
                metadata: {
                    isKnownError: classification.isKnownError,
                    similarErrorCount: this.getSimilarErrorCount(fingerprint),
                    lastOccurrence: this.getLastOccurrence(fingerprint),
                    recoverySuccessRate: this.getRecoverySuccessRate(fingerprint),
                    processingTime: performance.now() - startTime
                }
            };

            // Learn from this classification
            if (this.config.learningEnabled) {
                this.updateLearningData(normalizedError, context, result);
            }

            // Cache the result
            this.cacheClassification(fingerprint, result);

            // Update statistics
            this.updateStatistics(result.metadata.processingTime, result);

            return result;

        } catch (classificationError) {
            console.error('ErrorClassifier: Classification failed:', classificationError);

            // Return fallback classification
            return this.createFallbackClassification(error, context);
        }
    }

    /**
     * Normalize error input to standard format
     */
    normalizeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name || 'UnknownError',
                message: error.message || 'Unknown error message',
                stack: error.stack || null,
                code: error.code || null,
                type: 'Error'
            };
        }

        if (typeof error === 'string') {
            return {
                name: 'StringError',
                message: error,
                stack: null,
                code: null,
                type: 'String'
            };
        }

        if (typeof error === 'object' && error !== null) {
            return {
                name: error.name || 'ObjectError',
                message: error.message || error.toString() || 'Object error',
                stack: error.stack || null,
                code: error.code || null,
                type: 'Object',
                originalError: error
            };
        }

        return {
            name: 'UnknownError',
            message: String(error),
            stack: null,
            code: null,
            type: 'Unknown'
        };
    }

    /**
     * Generate unique error fingerprint for deduplication
     */
    generateFingerprint(normalizedError, context) {
        if (!this.config.fingerprinting) {
            return `temp_${Date.now()}_${Math.random()}`;
        }

        return this.fingerprintEngine.generate(normalizedError, context);
    }

    /**
     * Match error against known patterns
     */
    matchPatterns(normalizedError, context) {
        const matches = [];

        if (!this.patterns) return matches;

        for (const pattern of this.patterns) {
            const match = this.evaluatePattern(pattern, normalizedError, context);
            if (match.score > 0) {
                matches.push({
                    pattern: pattern.id,
                    name: pattern.name,
                    score: match.score,
                    confidence: match.confidence,
                    details: match.details
                });
            }
        }

        // Sort by score descending
        return matches.sort((a, b) => b.score - a.score);
    }

    /**
     * Evaluate single pattern against error
     */
    evaluatePattern(pattern, normalizedError, context) {
        let score = 0;
        let confidence = 0;
        const details = {};

        // Message pattern matching
        if (pattern.messagePatterns) {
            const messageMatch = this.messageEngine.matchPatterns(
                normalizedError.message,
                pattern.messagePatterns
            );
            score += messageMatch.score * 0.4;
            confidence += messageMatch.confidence * 0.4;
            details.messageMatch = messageMatch;
        }

        // Stack trace pattern matching
        if (pattern.stackPatterns && normalizedError.stack) {
            const stackMatch = this.stackTraceEngine.matchPatterns(
                normalizedError.stack,
                pattern.stackPatterns
            );
            score += stackMatch.score * 0.3;
            confidence += stackMatch.confidence * 0.3;
            details.stackMatch = stackMatch;
        }

        // Context pattern matching
        if (pattern.contextPatterns) {
            const contextMatch = this.contextEngine.matchPatterns(
                context,
                pattern.contextPatterns
            );
            score += contextMatch.score * 0.3;
            confidence += contextMatch.confidence * 0.3;
            details.contextMatch = contextMatch;
        }

        return { score, confidence, details };
    }

    /**
     * Apply classification rules to analysis results
     */
    applyClassificationRules(analysisResults, context) {
        if (!this.rules) return { severity: 'MEDIUM', system: 'CORE', strategy: 'RETRY' };

        const ruleResults = [];

        for (const rule of this.rules) {
            if (this.evaluateRuleConditions(rule.conditions, analysisResults, context)) {
                ruleResults.push({
                    rule: rule.id,
                    priority: rule.priority,
                    severity: rule.classification.severity,
                    system: rule.classification.system,
                    strategy: rule.classification.strategy,
                    confidence: rule.confidence || 0.8
                });
            }
        }

        // Sort by priority and return best match
        ruleResults.sort((a, b) => b.priority - a.priority);

        return ruleResults.length > 0 ? ruleResults[0] : {
            severity: 'MEDIUM',
            system: 'CORE',
            strategy: 'RETRY',
            confidence: 0.5
        };
    }

    /**
     * Calculate overall confidence score
     */
    calculateConfidence(analysisResults, ruleResults) {
        let confidence = 0;
        let weights = 0;

        // Pattern matching confidence
        if (analysisResults.patterns.length > 0) {
            const avgPatternConfidence = analysisResults.patterns
                .reduce((sum, p) => sum + p.confidence, 0) / analysisResults.patterns.length;
            confidence += avgPatternConfidence * this.config.patternMatchWeight;
            weights += this.config.patternMatchWeight;
        }

        // Rule matching confidence
        if (ruleResults.confidence) {
            confidence += ruleResults.confidence * (1 - this.config.patternMatchWeight);
            weights += (1 - this.config.patternMatchWeight);
        }

        // Context analysis confidence
        if (analysisResults.context && analysisResults.context.confidence) {
            confidence += analysisResults.context.confidence * this.config.contextWeight;
            weights += this.config.contextWeight;
        }

        // Historical confidence adjustments
        const historyAdjustment = this.getHistoryConfidenceAdjustment(analysisResults);
        confidence += historyAdjustment * this.config.historyWeight;
        weights += this.config.historyWeight;

        return weights > 0 ? Math.min(confidence / weights, 1.0) : 0.5;
    }

    /**
     * Categorize error based on analysis and rules
     */
    categorizeError(analysisResults, ruleResults, confidence) {
        // Start with rule-based classification
        let classification = {
            severity: ruleResults.severity || 'MEDIUM',
            system: ruleResults.system || 'CORE',
            strategy: ruleResults.strategy || 'RETRY',
            isKnownError: false
        };

        // Override with pattern-based classification if higher confidence
        if (analysisResults.patterns.length > 0) {
            const bestPattern = analysisResults.patterns[0];
            if (bestPattern.confidence > ruleResults.confidence) {
                const pattern = this.getPatternById(bestPattern.pattern);
                if (pattern && pattern.classification) {
                    classification = {
                        ...classification,
                        ...pattern.classification,
                        isKnownError: true
                    };
                }
            }
        }

        // Adjust based on context
        classification = this.adjustClassificationForContext(classification, analysisResults.context);

        // Validate classification
        classification = this.validateClassification(classification);

        return classification;
    }

    /**
     * Adjust classification based on context
     */
    adjustClassificationForContext(classification, contextAnalysis) {
        if (!contextAnalysis) return classification;

        // Upgrade severity for critical game states
        if (contextAnalysis.criticalGameState) {
            classification.severity = this.upgradeSeverity(classification.severity);
        }

        // Adjust strategy based on user activity
        if (contextAnalysis.userActive === false) {
            // Less aggressive recovery when user is inactive
            if (classification.strategy === 'IMMEDIATE') {
                classification.strategy = 'RETRY';
            }
        }

        // Adjust system category based on context
        if (contextAnalysis.systemInvolved) {
            classification.system = contextAnalysis.systemInvolved;
        }

        return classification;
    }

    /**
     * Validate and sanitize classification
     */
    validateClassification(classification) {
        // Ensure valid severity
        if (!this.severityLevels[classification.severity]) {
            classification.severity = 'MEDIUM';
        }

        // Ensure valid system
        if (!this.systemCategories[classification.system]) {
            classification.system = 'CORE';
        }

        // Ensure valid strategy
        if (!this.recoveryStrategies[classification.strategy]) {
            classification.strategy = 'RETRY';
        }

        // Ensure critical errors have appropriate strategies
        if (classification.severity === 'CRITICAL') {
            if (classification.strategy === 'IGNORE') {
                classification.strategy = 'IMMEDIATE';
            }
        }

        return classification;
    }

    /**
     * Create fallback classification for errors
     */
    createFallbackClassification(error, context) {
        const normalizedError = this.normalizeError(error);

        return {
            severity: 'MEDIUM',
            system: 'CORE',
            strategy: 'RETRY',
            confidence: 0.3,
            fingerprint: this.generateFingerprint(normalizedError, context),
            patterns: [],
            timestamp: Date.now(),
            metadata: {
                isKnownError: false,
                similarErrorCount: 0,
                lastOccurrence: null,
                recoverySuccessRate: 0,
                processingTime: 0,
                fallback: true
            }
        };
    }

    /**
     * Update learning data from classifications
     */
    updateLearningData(normalizedError, context, result) {
        const fingerprint = result.fingerprint;

        // Update pattern history
        if (!this.learningData.patternHistory.has(fingerprint)) {
            this.learningData.patternHistory.set(fingerprint, []);
        }

        const history = this.learningData.patternHistory.get(fingerprint);
        history.push({
            timestamp: Date.now(),
            error: normalizedError,
            context: context,
            classification: result,
            confidence: result.confidence
        });

        // Maintain history size
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }

        // Detect new patterns
        if (result.confidence < 0.6 && result.patterns.length === 0) {
            this.detectNewPattern(normalizedError, context, result);
        }
    }

    /**
     * Detect and learn new error patterns
     */
    detectNewPattern(normalizedError, context, result) {
        // Look for similar errors
        const similarErrors = this.findSimilarErrors(normalizedError, context);

        if (similarErrors.length >= 3) {
            // Create new pattern
            const newPattern = this.createPatternFromSimilarErrors(similarErrors);
            this.learningData.newPatterns.push(newPattern);

            console.log('ErrorClassifier: Detected new pattern:', newPattern.id);
        }
    }

    /**
     * Get cached classification if available
     */
    getCachedClassification(fingerprint) {
        const history = this.learningData.patternHistory.get(fingerprint);
        if (history && history.length > 0) {
            const latest = history[history.length - 1];
            return latest.classification;
        }
        return null;
    }

    /**
     * Cache classification result
     */
    cacheClassification(fingerprint, result) {
        // Classifications are cached through learning data update
        // This is a placeholder for explicit caching if needed
    }

    /**
     * Update classification statistics
     */
    updateStatistics(processingTime, result) {
        this.stats.totalClassifications++;
        this.stats.confidenceScores.push(result.confidence);

        // Update average processing time
        const totalTime = this.stats.averageProcessingTime * (this.stats.totalClassifications - 1) + processingTime;
        this.stats.averageProcessingTime = totalTime / this.stats.totalClassifications;

        // Update distribution stats
        const systemCount = this.stats.systemTypeDistribution.get(result.system) || 0;
        this.stats.systemTypeDistribution.set(result.system, systemCount + 1);

        const severityCount = this.stats.severityDistribution.get(result.severity) || 0;
        this.stats.severityDistribution.set(result.severity, severityCount + 1);

        // Keep only recent confidence scores
        if (this.stats.confidenceScores.length > 1000) {
            this.stats.confidenceScores = this.stats.confidenceScores.slice(-1000);
        }
    }

    /**
     * Load patterns from external source
     */
    async loadPatterns() {
        try {
            if (typeof window !== 'undefined' && window.ErrorPatterns) {
                this.patterns = window.ErrorPatterns.getPatterns();
            } else {
                // Fallback patterns
                this.patterns = this.createFallbackPatterns();
            }
        } catch (error) {
            console.warn('ErrorClassifier: Failed to load patterns:', error);
            this.patterns = this.createFallbackPatterns();
        }
    }

    /**
     * Load classification rules
     */
    async loadRules() {
        try {
            if (typeof window !== 'undefined' && window.ClassificationRules) {
                this.rules = window.ClassificationRules.getRules();
            } else {
                // Fallback rules
                this.rules = this.createFallbackRules();
            }
        } catch (error) {
            console.warn('ErrorClassifier: Failed to load rules:', error);
            this.rules = this.createFallbackRules();
        }
    }

    /**
     * Load learning data from storage
     */
    async loadLearningData() {
        try {
            const stored = localStorage.getItem('errorClassifierLearning');
            if (stored) {
                const data = JSON.parse(stored);
                this.learningData.patternHistory = new Map(data.patternHistory || []);
                this.learningData.successfulRecoveries = new Map(data.successfulRecoveries || []);
                this.learningData.confidenceAdjustments = new Map(data.confidenceAdjustments || []);
                this.learningData.newPatterns = data.newPatterns || [];
            }
        } catch (error) {
            console.warn('ErrorClassifier: Failed to load learning data:', error);
        }
    }

    /**
     * Save learning data to storage
     */
    saveLearningData() {
        try {
            const data = {
                patternHistory: Array.from(this.learningData.patternHistory.entries()),
                successfulRecoveries: Array.from(this.learningData.successfulRecoveries.entries()),
                confidenceAdjustments: Array.from(this.learningData.confidenceAdjustments.entries()),
                newPatterns: this.learningData.newPatterns
            };
            localStorage.setItem('errorClassifierLearning', JSON.stringify(data));
        } catch (error) {
            console.warn('ErrorClassifier: Failed to save learning data:', error);
        }
    }

    /**
     * Get classification statistics
     */
    getStatistics() {
        const avgConfidence = this.stats.confidenceScores.length > 0
            ? this.stats.confidenceScores.reduce((a, b) => a + b, 0) / this.stats.confidenceScores.length
            : 0;

        return {
            ...this.stats,
            averageConfidence: avgConfidence,
            patternCacheSize: this.learningData.patternHistory.size,
            newPatternsDetected: this.learningData.newPatterns.length,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Export classification data
     */
    exportClassificationData() {
        return {
            timestamp: Date.now(),
            config: this.config,
            statistics: this.getStatistics(),
            learningData: {
                patternHistory: Array.from(this.learningData.patternHistory.entries()),
                newPatterns: this.learningData.newPatterns
            }
        };
    }

    /**
     * Create minimal fallback patterns
     */
    createFallbackPatterns() {
        return [
            {
                id: 'critical_system_failure',
                name: 'Critical System Failure',
                messagePatterns: [/critical|fatal|system.*fail/i],
                classification: { severity: 'CRITICAL', system: 'CORE', strategy: 'RESTART' }
            },
            {
                id: 'save_error',
                name: 'Save System Error',
                messagePatterns: [/save|storage|quota/i],
                classification: { severity: 'HIGH', system: 'SAVE', strategy: 'RETRY' }
            },
            {
                id: 'ui_error',
                name: 'UI Error',
                messagePatterns: [/render|dom|ui|display/i],
                classification: { severity: 'MEDIUM', system: 'UI', strategy: 'FALLBACK' }
            }
        ];
    }

    /**
     * Create minimal fallback rules
     */
    createFallbackRules() {
        return [
            {
                id: 'default_critical',
                priority: 100,
                conditions: { severity: 'critical' },
                classification: { severity: 'CRITICAL', system: 'CORE', strategy: 'IMMEDIATE' },
                confidence: 0.9
            },
            {
                id: 'default_fallback',
                priority: 1,
                conditions: {},
                classification: { severity: 'MEDIUM', system: 'CORE', strategy: 'RETRY' },
                confidence: 0.5
            }
        ];
    }

    // Additional utility methods would go here...
    // Including: upgradeSeverity, getPatternById, evaluateRuleConditions,
    // findSimilarErrors, estimateMemoryUsage, etc.
}

// Sub-engines for specialized analysis
class StackTraceAnalyzer {
    analyze(error, context) {
        if (!error.stack) return { confidence: 0, details: {} };

        const lines = error.stack.split('\n');
        const analysis = {
            depth: lines.length,
            gameFiles: [],
            systemFiles: [],
            confidence: 0.7
        };

        lines.forEach(line => {
            if (line.includes('game.') || line.includes('cultivation.')) {
                analysis.gameFiles.push(line.trim());
            } else if (line.includes('system') || line.includes('core')) {
                analysis.systemFiles.push(line.trim());
            }
        });

        return analysis;
    }

    matchPatterns(stack, patterns) {
        // Pattern matching implementation
        return { score: 0.5, confidence: 0.6 };
    }
}

class MessagePatternEngine {
    analyze(error, context) {
        const message = error.message.toLowerCase();
        const analysis = {
            keywords: this.extractKeywords(message),
            sentiment: this.analyzeSentiment(message),
            confidence: 0.8
        };

        return analysis;
    }

    matchPatterns(message, patterns) {
        let bestScore = 0;
        let confidence = 0;

        for (const pattern of patterns) {
            if (pattern instanceof RegExp) {
                const match = pattern.test(message);
                if (match) {
                    bestScore = Math.max(bestScore, 0.9);
                    confidence = 0.9;
                }
            } else if (typeof pattern === 'string') {
                if (message.includes(pattern.toLowerCase())) {
                    bestScore = Math.max(bestScore, 0.7);
                    confidence = 0.7;
                }
            }
        }

        return { score: bestScore, confidence };
    }

    extractKeywords(message) {
        const keywords = [];
        const commonWords = ['error', 'failed', 'cannot', 'undefined', 'null'];

        commonWords.forEach(word => {
            if (message.includes(word)) {
                keywords.push(word);
            }
        });

        return keywords;
    }

    analyzeSentiment(message) {
        const negativeWords = ['error', 'fail', 'crash', 'corrupt', 'invalid'];
        let score = 0;

        negativeWords.forEach(word => {
            if (message.includes(word)) score++;
        });

        return score > 2 ? 'very_negative' : score > 0 ? 'negative' : 'neutral';
    }
}

class ContextAnalyzer {
    analyze(error, context) {
        const analysis = {
            criticalGameState: this.isCriticalGameState(context),
            userActive: this.isUserActive(context),
            systemInvolved: this.identifySystem(context),
            confidence: 0.6
        };

        return analysis;
    }

    matchPatterns(context, patterns) {
        // Context pattern matching implementation
        return { score: 0.4, confidence: 0.5 };
    }

    isCriticalGameState(context) {
        return context.duringBattle || context.duringSave || context.duringLoad;
    }

    isUserActive(context) {
        const now = Date.now();
        return context.lastUserAction && (now - context.lastUserAction < 10000);
    }

    identifySystem(context) {
        if (context.source) {
            if (context.source.includes('save')) return 'SAVE';
            if (context.source.includes('ui')) return 'UI';
            if (context.source.includes('network')) return 'NETWORK';
        }
        return null;
    }
}

class ErrorFingerprintEngine {
    generate(error, context) {
        const components = [
            error.name || 'unknown',
            this.hashMessage(error.message),
            this.hashStack(error.stack),
            this.hashContext(context)
        ];

        return components.join('_');
    }

    hashMessage(message) {
        if (!message) return 'nomsg';

        // Simple hash of first 50 chars
        return message.substring(0, 50)
            .replace(/\d+/g, 'N')  // Replace numbers
            .replace(/['"]/g, '')  // Remove quotes
            .toLowerCase();
    }

    hashStack(stack) {
        if (!stack) return 'nostack';

        // Hash first few lines
        const lines = stack.split('\n').slice(0, 3);
        return lines.join('|').substring(0, 100);
    }

    hashContext(context) {
        if (!context || Object.keys(context).length === 0) return 'noctx';

        const keys = Object.keys(context).sort();
        return keys.slice(0, 5).join(',');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ErrorClassifier,
        StackTraceAnalyzer,
        MessagePatternEngine,
        ContextAnalyzer,
        ErrorFingerprintEngine
    };
} else {
    window.ErrorClassifier = ErrorClassifier;
    window.StackTraceAnalyzer = StackTraceAnalyzer;
    window.MessagePatternEngine = MessagePatternEngine;
    window.ContextAnalyzer = ContextAnalyzer;
    window.ErrorFingerprintEngine = ErrorFingerprintEngine;
}