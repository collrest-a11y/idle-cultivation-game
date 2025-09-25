
/**
 * DOM Query Optimizer - Created by Performance Optimization
 * Caches frequently accessed DOM elements to reduce query time
 */
class DOMQueryOptimizer {
    constructor() {
        this.elementCache = new Map();
        this.queryStats = {
            cacheHits: 0,
            cacheMisses: 0,
            totalQueries: 0
        };
        this.init();
    }

    init() {
        // Override common DOM query methods
        this.originalGetElementById = document.getElementById;
        this.originalQuerySelector = document.querySelector;
        this.originalQuerySelectorAll = document.querySelectorAll;

        const self = this;

        document.getElementById = function(id) {
            return self.getCachedElement(`#${id}`, () => self.originalGetElementById.call(this, id));
        };

        document.querySelector = function(selector) {
            return self.getCachedElement(selector, () => self.originalQuerySelector.call(this, selector));
        };
    }

    getCachedElement(selector, queryFn) {
        this.queryStats.totalQueries++;

        if (this.elementCache.has(selector)) {
            const cached = this.elementCache.get(selector);
            // Verify element is still in DOM
            if (cached && document.contains(cached)) {
                this.queryStats.cacheHits++;
                return cached;
            } else {
                this.elementCache.delete(selector);
            }
        }

        this.queryStats.cacheMisses++;
        const element = queryFn();
        if (element) {
            this.elementCache.set(selector, element);
        }
        return element;
    }

    clearCache() {
        this.elementCache.clear();
    }

    getStats() {
        const hitRate = this.queryStats.totalQueries > 0
            ? (this.queryStats.cacheHits / this.queryStats.totalQueries * 100).toFixed(1)
            : 0;
        return {
            ...this.queryStats,
            hitRate: `${hitRate}%`,
            cacheSize: this.elementCache.size
        };
    }
}

// Initialize DOM optimizer
if (typeof window !== 'undefined') {
    window.domQueryOptimizer = new DOMQueryOptimizer();
}
