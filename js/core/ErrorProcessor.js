/**
 * ErrorProcessor - Production-Optimized Error Processing Engine
 *
 * High-performance error processing with batching, throttling, memory management,
 * and production-specific optimizations for the error handling system.
 *
 * @version 1.0.0
 * @since 2025-09-26
 */

class ErrorProcessor {
    constructor() {
        this.config = window.ProductionConfig || null;
        this.isProduction = this.config?.environment === 'production';

        // Performance-optimized configuration
        this.processingConfig = {
            batchSize: this.isProduction ? 20 : 10,
            flushInterval: this.isProduction ? 10000 : 5000, // 10s prod, 5s dev
            throttleWindow: 1000, // 1 second
            maxBufferSize: this.isProduction ? 200 : 100,
            memoryCleanupInterval: 60000, // 1 minute
            compressionEnabled: this.isProduction,
            asyncProcessing: true,
            priorityLevels: ['critical', 'error', 'warning', 'info'],
            deduplicationEnabled: true
        };

        // Processing state
        this.state = {
            errorBuffer: [],
            processingQueue: [],
            throttleMap: new Map(),
            processedCount: 0,
            lastFlush: 0,
            isProcessing: false,
            performance: {
                processingTime: 0,
                queueSize: 0,
                memoryUsage: 0
            }
        };

        // Deduplication cache
        this.deduplicationCache = new Map();
        this.cacheCleanupInterval = 300000; // 5 minutes

        // Worker pool for async processing
        this.workerPool = null;
        this.maxWorkers = this.isProduction ? 2 : 1;

        // Initialize processing engine
        this.initializeProcessor();
    }

    /**
     * Initialize the error processor
     */
    initializeProcessor() {
        // Setup automatic flushing
        setInterval(() => {
            this.flushErrorBuffer();
        }, this.processingConfig.flushInterval);

        // Setup memory cleanup
        setInterval(() => {
            this.performMemoryCleanup();
        }, this.processingConfig.memoryCleanupInterval);

        // Setup cache cleanup
        setInterval(() => {
            this.cleanupDeduplicationCache();
        }, this.cacheCleanupInterval);

        // Initialize worker pool if supported
        if (typeof Worker !== 'undefined' && this.processingConfig.asyncProcessing) {
            this.initializeWorkerPool();
        }

        console.log('[ErrorProcessor] Production-optimized error processor initialized');
    }

    /**
     * Process error with performance optimizations
     */
    async processError(error, metadata = {}) {
        const startTime = performance.now();

        try {
            // Early return for throttled errors
            if (this.isErrorThrottled(error)) {
                return { processed: false, reason: 'throttled' };
            }

            // Normalize error object
            const normalizedError = this.normalizeError(error, metadata);

            // Check for duplicates
            if (this.processingConfig.deduplicationEnabled && this.isDuplicateError(normalizedError)) {
                this.updateDuplicateCount(normalizedError);
                return { processed: false, reason: 'duplicate' };
            }

            // Add to processing buffer
            const buffered = this.addToBuffer(normalizedError);

            // Trigger immediate processing for critical errors
            if (normalizedError.priority === 'critical') {
                await this.flushErrorBuffer();
            }

            const processingTime = performance.now() - startTime;
            this.updatePerformanceMetrics(processingTime);

            return { processed: true, buffered, processingTime };

        } catch (processingError) {
            console.error('[ErrorProcessor] Error processing failed:', processingError);
            return { processed: false, reason: 'processing_error', error: processingError.message };
        }
    }

    /**
     * Add error to processing buffer
     */
    addToBuffer(error) {
        // Check buffer size limits
        if (this.state.errorBuffer.length >= this.processingConfig.maxBufferSize) {
            // Emergency flush for buffer overflow
            this.flushErrorBuffer();
        }

        // Add timestamp and processing metadata
        const enrichedError = {
            ...error,
            bufferedAt: Date.now(),
            processingId: this.generateProcessingId(),
            memorySnapshot: this.getMemorySnapshot()
        };

        this.state.errorBuffer.push(enrichedError);

        // Update queue size metric
        this.state.performance.queueSize = this.state.errorBuffer.length;

        return true;
    }

    /**
     * Flush error buffer and process errors in batches
     */
    async flushErrorBuffer() {
        if (this.state.isProcessing || this.state.errorBuffer.length === 0) {
            return;
        }

        this.state.isProcessing = true;
        const flushStartTime = performance.now();

        try {
            // Sort errors by priority
            const sortedErrors = this.prioritizeErrors(this.state.errorBuffer);

            // Process in batches
            const batches = this.createBatches(sortedErrors, this.processingConfig.batchSize);

            for (const batch of batches) {
                await this.processBatch(batch);
            }

            // Clear processed errors from buffer
            this.state.errorBuffer = [];
            this.state.lastFlush = Date.now();

            const flushTime = performance.now() - flushStartTime;
            console.log(`[ErrorProcessor] Flushed ${sortedErrors.length} errors in ${flushTime.toFixed(2)}ms`);

        } catch (error) {
            console.error('[ErrorProcessor] Buffer flush failed:', error);
        } finally {
            this.state.isProcessing = false;
        }
    }

    /**
     * Process a batch of errors
     */
    async processBatch(batch) {
        const batchStartTime = performance.now();

        try {
            // Use worker pool if available
            if (this.workerPool && batch.length > 5) {
                await this.processWithWorkers(batch);
            } else {
                await this.processSequentially(batch);
            }

            const batchTime = performance.now() - batchStartTime;
            this.state.performance.processingTime += batchTime;
            this.state.processedCount += batch.length;

        } catch (error) {
            console.error('[ErrorProcessor] Batch processing failed:', error);
        }
    }

    /**
     * Process errors sequentially
     */
    async processSequentially(errors) {
        for (const error of errors) {
            try {
                await this.processIndividualError(error);
            } catch (processingError) {
                console.error('[ErrorProcessor] Individual error processing failed:', processingError);
            }
        }
    }

    /**
     * Process individual error with all handlers
     */
    async processIndividualError(error) {
        // Security sanitization
        if (window.ErrorSecurity) {
            error.sanitized = window.ErrorSecurity.sanitizeErrorData(error);
        }

        // Classification
        if (window.ErrorClassifier && this.config?.isFeatureEnabled('advancedClassification')) {
            error.classification = await window.ErrorClassifier.classifyError(error);
        }

        // Analytics collection
        if (window.ProductionAnalytics) {
            window.ProductionAnalytics.collectErrorData(error);
        }

        // Monitoring alerts
        if (window.ProductionMonitor) {
            if (error.priority === 'critical') {
                window.ProductionMonitor.triggerAlert(`critical-error-${error.processingId}`, error.message, 'critical');
            }
        }

        // Recovery actions
        if (window.ErrorRecovery && this.config?.isFeatureEnabled('autoRecovery')) {
            await window.ErrorRecovery.attemptRecovery(error);
        }

        // Persistence (if needed)
        if (this.shouldPersistError(error)) {
            this.persistError(error);
        }
    }

    /**
     * Check if error should be throttled
     */
    isErrorThrottled(error) {
        const errorKey = this.generateErrorKey(error);
        const now = Date.now();
        const lastSeen = this.state.throttleMap.get(errorKey);

        if (lastSeen && (now - lastSeen) < this.processingConfig.throttleWindow) {
            return true;
        }

        this.state.throttleMap.set(errorKey, now);
        return false;
    }

    /**
     * Check for duplicate errors
     */
    isDuplicateError(error) {
        const errorKey = this.generateErrorKey(error);
        const cacheEntry = this.deduplicationCache.get(errorKey);

        if (cacheEntry) {
            const timeDiff = Date.now() - cacheEntry.lastSeen;
            // Consider as duplicate if seen within 5 minutes
            return timeDiff < 300000;
        }

        return false;
    }

    /**
     * Update duplicate count
     */
    updateDuplicateCount(error) {
        const errorKey = this.generateErrorKey(error);
        const cacheEntry = this.deduplicationCache.get(errorKey) || { count: 0, lastSeen: 0 };

        cacheEntry.count++;
        cacheEntry.lastSeen = Date.now();
        this.deduplicationCache.set(errorKey, cacheEntry);
    }

    /**
     * Normalize error object for consistent processing
     */
    normalizeError(error, metadata) {
        const baseError = {
            message: error.message || 'Unknown error',
            stack: error.stack || '',
            name: error.name || 'Error',
            timestamp: Date.now(),
            source: 'ErrorProcessor',
            ...metadata
        };

        // Determine priority
        baseError.priority = this.determinePriority(baseError);

        // Add environment context
        baseError.environment = this.config?.environment || 'unknown';

        // Add performance context
        baseError.performance = {
            memoryUsage: this.getMemoryUsage(),
            timestamp: performance.now()
        };

        return baseError;
    }

    /**
     * Determine error priority
     */
    determinePriority(error) {
        // Critical errors
        if (error.name === 'ReferenceError' ||
            error.name === 'TypeError' && error.stack?.includes('Cannot read property') ||
            error.message?.includes('critical') ||
            error.fatal === true) {
            return 'critical';
        }

        // Error level
        if (error.name === 'Error' || error.level === 'error') {
            return 'error';
        }

        // Warning level
        if (error.level === 'warning' || error.level === 'warn') {
            return 'warning';
        }

        // Default to info
        return 'info';
    }

    /**
     * Prioritize errors for processing order
     */
    prioritizeErrors(errors) {
        return errors.sort((a, b) => {
            const priorities = { critical: 0, error: 1, warning: 2, info: 3 };
            return priorities[a.priority] - priorities[b.priority];
        });
    }

    /**
     * Create processing batches
     */
    createBatches(errors, batchSize) {
        const batches = [];
        for (let i = 0; i < errors.length; i += batchSize) {
            batches.push(errors.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Initialize worker pool for async processing
     */
    initializeWorkerPool() {
        try {
            // Create inline worker for error processing
            const workerScript = `
                self.onmessage = function(e) {
                    const { errors, config } = e.data;

                    // Process errors in worker thread
                    const processed = errors.map(error => {
                        return {
                            ...error,
                            processed: true,
                            workerProcessedAt: Date.now()
                        };
                    });

                    self.postMessage({ processed });
                };
            `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);

            this.workerPool = [];
            for (let i = 0; i < this.maxWorkers; i++) {
                this.workerPool.push(new Worker(workerUrl));
            }

            console.log(`[ErrorProcessor] Worker pool initialized with ${this.maxWorkers} workers`);

        } catch (error) {
            console.warn('[ErrorProcessor] Worker pool initialization failed:', error);
            this.workerPool = null;
        }
    }

    /**
     * Process errors using worker pool
     */
    async processWithWorkers(errors) {
        if (!this.workerPool || this.workerPool.length === 0) {
            return this.processSequentially(errors);
        }

        return new Promise((resolve, reject) => {
            const worker = this.workerPool[0]; // Use first available worker

            worker.onmessage = (e) => {
                const { processed } = e.data;
                // Handle processed errors
                resolve(processed);
            };

            worker.onerror = (error) => {
                console.error('[ErrorProcessor] Worker error:', error);
                reject(error);
            };

            worker.postMessage({
                errors,
                config: this.processingConfig
            });
        });
    }

    /**
     * Perform memory cleanup
     */
    performMemoryCleanup() {
        const beforeCleanup = this.getMemoryUsage();

        // Clean throttle map
        const now = Date.now();
        const throttleThreshold = now - (this.processingConfig.throttleWindow * 5);

        for (const [key, timestamp] of this.state.throttleMap.entries()) {
            if (timestamp < throttleThreshold) {
                this.state.throttleMap.delete(key);
            }
        }

        // Force garbage collection if available
        if (typeof gc !== 'undefined') {
            gc();
        }

        const afterCleanup = this.getMemoryUsage();
        const cleaned = beforeCleanup - afterCleanup;

        if (cleaned > 1024 * 1024) { // More than 1MB cleaned
            console.log(`[ErrorProcessor] Memory cleanup: ${(cleaned / 1024 / 1024).toFixed(2)}MB freed`);
        }
    }

    /**
     * Clean deduplication cache
     */
    cleanupDeduplicationCache() {
        const cutoff = Date.now() - this.cacheCleanupInterval;
        let removed = 0;

        for (const [key, entry] of this.deduplicationCache.entries()) {
            if (entry.lastSeen < cutoff) {
                this.deduplicationCache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`[ErrorProcessor] Deduplication cache cleanup: ${removed} entries removed`);
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(processingTime) {
        this.state.performance.processingTime = processingTime;
        this.state.performance.queueSize = this.state.errorBuffer.length;
        this.state.performance.memoryUsage = this.getMemoryUsage();
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.state.performance,
            processedCount: this.state.processedCount,
            bufferSize: this.state.errorBuffer.length,
            throttleMapSize: this.state.throttleMap.size,
            deduplicationCacheSize: this.deduplicationCache.size,
            averageProcessingTime: this.state.processedCount > 0 ?
                this.state.performance.processingTime / this.state.processedCount : 0,
            lastFlush: this.state.lastFlush
        };
    }

    /**
     * Check if error should be persisted
     */
    shouldPersistError(error) {
        // Only persist critical and error level messages in production
        if (this.isProduction) {
            return error.priority === 'critical' || error.priority === 'error';
        }

        // Persist all levels in development
        return true;
    }

    /**
     * Persist error to storage
     */
    persistError(error) {
        try {
            const errorLog = JSON.parse(localStorage.getItem('error-log') || '[]');

            // Limit stored errors
            const maxStoredErrors = this.isProduction ? 100 : 50;
            if (errorLog.length >= maxStoredErrors) {
                errorLog.splice(0, errorLog.length - maxStoredErrors + 1);
            }

            errorLog.push({
                id: error.processingId,
                message: error.message,
                priority: error.priority,
                timestamp: error.timestamp,
                environment: error.environment
            });

            localStorage.setItem('error-log', JSON.stringify(errorLog));

        } catch (storageError) {
            console.warn('[ErrorProcessor] Error persistence failed:', storageError);
        }
    }

    // Utility methods
    generateErrorKey(error) {
        // Create a unique key for error deduplication
        const key = `${error.name}-${error.message}-${error.source || 'unknown'}`;
        return btoa(key).substring(0, 32); // Base64 encode and truncate
    }

    generateProcessingId() {
        return `proc_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    getMemorySnapshot() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
}

// Global instance
window.ErrorProcessor = new ErrorProcessor();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorProcessor;
}