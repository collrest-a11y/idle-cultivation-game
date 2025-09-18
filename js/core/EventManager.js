/**
 * EventManager - Centralized event system for pub/sub pattern
 * Supports typed events, priority ordering, async handling, and debugging
 */
class EventManager {
    constructor() {
        this.listeners = new Map(); // eventType -> Set of listeners
        this.eventHistory = []; // For debugging
        this.maxHistorySize = 100;
        this.performanceMetrics = new Map(); // eventType -> { count, totalTime }
        this.isEnabled = true;
        this.debugMode = false;
    }

    /**
     * Subscribe to an event type
     * @param {string} eventType - The event type to listen for
     * @param {Function} listener - The callback function
     * @param {Object} options - Optional configuration
     * @param {number} options.priority - Higher priority listeners are called first (default: 0)
     * @param {boolean} options.once - Remove listener after first call (default: false)
     * @param {Object} options.context - The 'this' context for the listener
     */
    on(eventType, listener, options = {}) {
        if (!this.isEnabled) return;

        if (typeof eventType !== 'string' || typeof listener !== 'function') {
            throw new Error('EventManager.on: eventType must be string and listener must be function');
        }

        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }

        const listenerData = {
            callback: listener,
            priority: options.priority || 0,
            once: options.once || false,
            context: options.context || null,
            id: this._generateListenerId()
        };

        this.listeners.get(eventType).add(listenerData);

        if (this.debugMode) {
            console.log(`EventManager: Registered listener for '${eventType}' with priority ${listenerData.priority}`);
        }

        // Return unsubscribe function
        return () => this.off(eventType, listenerData.id);
    }

    /**
     * Subscribe to an event type, but only fire once
     * @param {string} eventType - The event type to listen for
     * @param {Function} listener - The callback function
     * @param {Object} options - Optional configuration
     */
    once(eventType, listener, options = {}) {
        return this.on(eventType, listener, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event type
     * @param {string} eventType - The event type
     * @param {string|Function} listenerOrId - The listener function or listener ID
     */
    off(eventType, listenerOrId) {
        if (!this.listeners.has(eventType)) return;

        const listeners = this.listeners.get(eventType);

        if (typeof listenerOrId === 'string') {
            // Remove by ID
            for (const listenerData of listeners) {
                if (listenerData.id === listenerOrId) {
                    listeners.delete(listenerData);
                    break;
                }
            }
        } else {
            // Remove by function reference
            for (const listenerData of listeners) {
                if (listenerData.callback === listenerOrId) {
                    listeners.delete(listenerData);
                    break;
                }
            }
        }

        if (listeners.size === 0) {
            this.listeners.delete(eventType);
        }

        if (this.debugMode) {
            console.log(`EventManager: Removed listener for '${eventType}'`);
        }
    }

    /**
     * Emit an event to all listeners
     * @param {string} eventType - The event type
     * @param {*} data - The event data
     * @param {Object} options - Optional configuration
     * @param {boolean} options.async - Whether to handle listeners asynchronously
     */
    async emit(eventType, data = null, options = {}) {
        if (!this.isEnabled || !this.listeners.has(eventType)) {
            return;
        }

        const startTime = performance.now();
        const listeners = Array.from(this.listeners.get(eventType));

        // Sort by priority (higher first)
        listeners.sort((a, b) => b.priority - a.priority);

        const eventData = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            source: 'EventManager'
        };

        // Add to history for debugging
        this._addToHistory(eventData);

        if (this.debugMode) {
            console.log(`EventManager: Emitting '${eventType}' to ${listeners.length} listeners`, data);
        }

        const listenersToRemove = [];

        if (options.async) {
            // Handle listeners asynchronously
            await Promise.all(listeners.map(async (listenerData) => {
                try {
                    const result = listenerData.context
                        ? listenerData.callback.call(listenerData.context, eventData)
                        : listenerData.callback(eventData);

                    if (result instanceof Promise) {
                        await result;
                    }

                    if (listenerData.once) {
                        listenersToRemove.push(listenerData);
                    }
                } catch (error) {
                    console.error(`EventManager: Error in async listener for '${eventType}':`, error);
                }
            }));
        } else {
            // Handle listeners synchronously
            for (const listenerData of listeners) {
                try {
                    const result = listenerData.context
                        ? listenerData.callback.call(listenerData.context, eventData)
                        : listenerData.callback(eventData);

                    // If listener returns a promise, we'll let it resolve without waiting
                    if (result instanceof Promise) {
                        result.catch(error => {
                            console.error(`EventManager: Error in promise from listener for '${eventType}':`, error);
                        });
                    }

                    if (listenerData.once) {
                        listenersToRemove.push(listenerData);
                    }
                } catch (error) {
                    console.error(`EventManager: Error in listener for '${eventType}':`, error);
                }
            }
        }

        // Remove one-time listeners
        const eventListeners = this.listeners.get(eventType);
        for (const listenerData of listenersToRemove) {
            eventListeners.delete(listenerData);
        }

        // Update performance metrics
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        this._updatePerformanceMetrics(eventType, executionTime);
    }

    /**
     * Remove all listeners for a specific event type
     * @param {string} eventType - The event type
     */
    removeAllListeners(eventType) {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }

        if (this.debugMode) {
            console.log(`EventManager: Removed all listeners${eventType ? ` for '${eventType}'` : ''}`);
        }
    }

    /**
     * Get the number of listeners for an event type
     * @param {string} eventType - The event type
     * @returns {number} Number of listeners
     */
    listenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).size : 0;
    }

    /**
     * Get all registered event types
     * @returns {string[]} Array of event types
     */
    getEventTypes() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Enable or disable the event system
     * @param {boolean} enabled - Whether to enable the event system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.debugMode) {
            console.log(`EventManager: ${enabled ? 'Enabled' : 'Disabled'}`);
        }
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} debug - Whether to enable debug mode
     */
    setDebugMode(debug) {
        this.debugMode = debug;
        console.log(`EventManager: Debug mode ${debug ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get event history for debugging
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Array of recent events
     */
    getEventHistory(limit = 10) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Get performance metrics for events
     * @returns {Object} Performance metrics by event type
     */
    getPerformanceMetrics() {
        const metrics = {};
        for (const [eventType, data] of this.performanceMetrics) {
            metrics[eventType] = {
                count: data.count,
                totalTime: data.totalTime,
                averageTime: data.totalTime / data.count
            };
        }
        return metrics;
    }

    /**
     * Clear performance metrics
     */
    clearPerformanceMetrics() {
        this.performanceMetrics.clear();
    }

    /**
     * Clear event history
     */
    clearEventHistory() {
        this.eventHistory = [];
    }

    // Private methods

    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _addToHistory(eventData) {
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    _updatePerformanceMetrics(eventType, executionTime) {
        if (!this.performanceMetrics.has(eventType)) {
            this.performanceMetrics.set(eventType, { count: 0, totalTime: 0 });
        }

        const metrics = this.performanceMetrics.get(eventType);
        metrics.count++;
        metrics.totalTime += executionTime;
    }
}

// Create singleton instance
const eventManager = new EventManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventManager, eventManager };
} else if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
    window.eventManager = eventManager;
}