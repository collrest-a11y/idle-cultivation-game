/**
 * Render Optimizer - Created for Issue #119
 * Optimizes UI render cycles and event handlers for better responsiveness
 */
class RenderOptimizer {
    constructor() {
        this.frameRequestId = null;
        this.renderQueue = new Set();
        this.eventHandlers = new Map();
        this.throttledFunctions = new Map();
        this.debouncedFunctions = new Map();
        this.renderStats = {
            framesRendered: 0,
            averageFrameTime: 0,
            skippedFrames: 0,
            queueSize: 0,
            startTime: performance.now()
        };
        this.isRendering = false;
        this.maxFrameTime = 16.67; // Target 60 FPS

        this.init();
    }

    init() {
        console.log('🎨 RenderOptimizer: Initializing render optimization...');
        this.startRenderLoop();
    }

    /**
     * Add a component to the render queue
     */
    queueRender(component, priority = 1) {
        if (!component || typeof component.render !== 'function') {
            console.warn('RenderOptimizer: Invalid component for rendering');
            return;
        }

        const renderItem = {
            component,
            priority,
            timestamp: performance.now(),
            id: component.id || `component_${Date.now()}_${Math.random()}`
        };

        this.renderQueue.add(renderItem);
        this.renderStats.queueSize = this.renderQueue.size;
    }

    /**
     * Start the optimized render loop
     */
    startRenderLoop() {
        const renderFrame = (timestamp) => {
            if (this.isRendering) {
                this.frameRequestId = requestAnimationFrame(renderFrame);
                return;
            }

            this.isRendering = true;
            const frameStartTime = performance.now();

            try {
                this.processRenderQueue(frameStartTime);
            } catch (error) {
                console.error('RenderOptimizer: Render error:', error);
            }

            const frameTime = performance.now() - frameStartTime;
            this.updateRenderStats(frameTime);

            this.isRendering = false;
            this.frameRequestId = requestAnimationFrame(renderFrame);
        };

        this.frameRequestId = requestAnimationFrame(renderFrame);
    }

    /**
     * Process the render queue within frame budget
     */
    processRenderQueue(frameStartTime) {
        if (this.renderQueue.size === 0) return;

        // Sort by priority (higher priority first)
        const sortedQueue = Array.from(this.renderQueue).sort((a, b) => b.priority - a.priority);
        const processedItems = [];

        for (const item of sortedQueue) {
            const currentTime = performance.now();
            const elapsedTime = currentTime - frameStartTime;

            // Check if we have enough time left in this frame
            if (elapsedTime >= this.maxFrameTime && processedItems.length > 0) {
                this.renderStats.skippedFrames++;
                break;
            }

            try {
                // Render the component
                item.component.render();
                processedItems.push(item);
            } catch (error) {
                console.error(`RenderOptimizer: Failed to render component ${item.id}:`, error);
                processedItems.push(item); // Remove from queue even if failed
            }
        }

        // Remove processed items from queue
        processedItems.forEach(item => this.renderQueue.delete(item));
        this.renderStats.queueSize = this.renderQueue.size;
    }

    /**
     * Update render statistics
     */
    updateRenderStats(frameTime) {
        this.renderStats.framesRendered++;

        // Calculate rolling average
        const alpha = 0.1; // Smoothing factor
        this.renderStats.averageFrameTime =
            this.renderStats.averageFrameTime * (1 - alpha) + frameTime * alpha;
    }

    /**
     * Create a throttled version of a function
     */
    throttle(func, delay = 16, id = null) {
        const throttleId = id || `throttle_${Date.now()}_${Math.random()}`;

        if (this.throttledFunctions.has(throttleId)) {
            return this.throttledFunctions.get(throttleId);
        }

        let inThrottle = false;
        const throttledFunc = function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, delay);
            }
        };

        this.throttledFunctions.set(throttleId, throttledFunc);
        return throttledFunc;
    }

    /**
     * Create a debounced version of a function
     */
    debounce(func, delay = 100, id = null) {
        const debounceId = id || `debounce_${Date.now()}_${Math.random()}`;

        if (this.debouncedFunctions.has(debounceId)) {
            return this.debouncedFunctions.get(debounceId);
        }

        let timeoutId;
        const debouncedFunc = function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };

        this.debouncedFunctions.set(debounceId, debouncedFunc);
        return debouncedFunc;
    }

    /**
     * Optimize event handlers for better performance
     */
    optimizeEventHandler(element, eventType, handler, options = {}) {
        if (!element || !eventType || !handler) {
            console.warn('RenderOptimizer: Invalid event handler parameters');
            return;
        }

        const { throttle = false, debounce = false, passive = true } = options;
        let optimizedHandler = handler;

        // Apply throttling if requested
        if (throttle) {
            const delay = typeof throttle === 'number' ? throttle : 16;
            optimizedHandler = this.throttle(handler, delay, `${eventType}_${element.id || 'element'}`);
        }

        // Apply debouncing if requested
        if (debounce) {
            const delay = typeof debounce === 'number' ? debounce : 100;
            optimizedHandler = this.debounce(handler, delay, `${eventType}_${element.id || 'element'}`);
        }

        // Add event listener with optimized options
        const eventOptions = {
            passive: passive && ['scroll', 'wheel', 'touchmove'].includes(eventType),
            once: options.once || false,
            capture: options.capture || false
        };

        element.addEventListener(eventType, optimizedHandler, eventOptions);

        // Store reference for cleanup
        const handlerId = `${element.id || 'element'}_${eventType}_${Date.now()}`;
        this.eventHandlers.set(handlerId, {
            element,
            eventType,
            handler: optimizedHandler,
            options: eventOptions
        });

        return handlerId;
    }

    /**
     * Remove an optimized event handler
     */
    removeEventHandler(handlerId) {
        const handler = this.eventHandlers.get(handlerId);
        if (handler) {
            handler.element.removeEventListener(handler.eventType, handler.handler, handler.options);
            this.eventHandlers.delete(handlerId);
        }
    }

    /**
     * Clean up all resources
     */
    cleanup() {
        // Cancel render loop
        if (this.frameRequestId) {
            cancelAnimationFrame(this.frameRequestId);
            this.frameRequestId = null;
        }

        // Clear render queue
        this.renderQueue.clear();

        // Remove all event handlers
        this.eventHandlers.forEach((handler, handlerId) => {
            this.removeEventHandler(handlerId);
        });

        // Clear function caches
        this.throttledFunctions.clear();
        this.debouncedFunctions.clear();

        console.log('🎨 RenderOptimizer: Cleanup completed');
    }

    /**
     * Get performance statistics
     */
    getStats() {
        const totalTime = performance.now() - this.renderStats.startTime;
        const fps = this.renderStats.framesRendered > 0
            ? Math.round(this.renderStats.framesRendered / (totalTime / 1000))
            : 0;

        return {
            framesRendered: this.renderStats.framesRendered,
            averageFrameTime: Math.round(this.renderStats.averageFrameTime * 100) / 100,
            skippedFrames: this.renderStats.skippedFrames,
            currentQueueSize: this.renderStats.queueSize,
            fps: fps,
            totalRunTime: Math.round(totalTime),
            eventHandlers: this.eventHandlers.size,
            throttledFunctions: this.throttledFunctions.size,
            debouncedFunctions: this.debouncedFunctions.size
        };
    }

    /**
     * Log performance report
     */
    generateReport() {
        const stats = this.getStats();
        console.log('🎨 Render Optimizer Performance Report:');
        console.log(`   Frames Rendered: ${stats.framesRendered}`);
        console.log(`   Average Frame Time: ${stats.averageFrameTime}ms`);
        console.log(`   Skipped Frames: ${stats.skippedFrames}`);
        console.log(`   Current FPS: ${stats.fps}`);
        console.log(`   Queue Size: ${stats.currentQueueSize}`);
        console.log(`   Event Handlers: ${stats.eventHandlers}`);
        console.log(`   Optimized Functions: ${stats.throttledFunctions + stats.debouncedFunctions}`);
        return stats;
    }
}

// Initialize global render optimizer
if (typeof window !== 'undefined') {
    window.renderOptimizer = new RenderOptimizer();

    // Add utility functions to window
    window.queueRender = (component, priority) => window.renderOptimizer.queueRender(component, priority);
    window.throttle = (func, delay, id) => window.renderOptimizer.throttle(func, delay, id);
    window.debounce = (func, delay, id) => window.renderOptimizer.debounce(func, delay, id);
    window.optimizeEventHandler = (element, eventType, handler, options) =>
        window.renderOptimizer.optimizeEventHandler(element, eventType, handler, options);
}