/**
 * BaseComponent - Base class for all UI components
 * Provides lifecycle management, event handling, and state management
 */
class BaseComponent {
    constructor(container, options = {}) {
        if (new.target === BaseComponent) {
            throw new Error('BaseComponent is abstract and cannot be instantiated directly');
        }

        this.container = container;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.element = null;
        this.children = new Map();
        this.isDestroyed = false;
        this.isMounted = false;
        this.isVisible = true;

        // State management
        this.state = this.getInitialState();
        this.stateListeners = new Set();

        // Event management
        this.eventHandlers = new Map();
        this.eventManager = this.options.eventManager || window.eventManager;
        this.gameState = this.options.gameState || window.gameState;

        // Generate unique component ID
        this.id = this.options.id || this.generateComponentId();

        // Performance tracking
        this.performanceStats = {
            renderCount: 0,
            lastRenderTime: 0,
            totalRenderTime: 0
        };

        this.init();
    }

    /**
     * Initialize the component - called in constructor
     */
    init() {
        try {
            this.createElement();
            this.setupEventListeners();
            this.onInit();
        } catch (error) {
            console.error(`${this.constructor.name}: Initialization failed`, error);
            throw error;
        }
    }

    /**
     * Abstract method to get default options
     * Must be implemented by subclasses
     */
    getDefaultOptions() {
        return {
            className: '',
            attributes: {},
            responsive: true,
            accessible: true
        };
    }

    /**
     * Abstract method to get initial state
     * Can be overridden by subclasses
     */
    getInitialState() {
        return {};
    }

    /**
     * Abstract method called during initialization
     * Can be overridden by subclasses
     */
    onInit() {
        // Override in subclasses
    }

    /**
     * Create the component's DOM element
     * Must be implemented by subclasses
     */
    createElement() {
        throw new Error('createElement must be implemented by subclasses');
    }

    /**
     * Render the component
     * Must be implemented by subclasses
     */
    render() {
        throw new Error('render must be implemented by subclasses');
    }

    /**
     * Mount the component to the DOM
     */
    mount() {
        if (this.isDestroyed) {
            throw new Error('Cannot mount destroyed component');
        }

        if (this.isMounted) {
            return this;
        }

        const startTime = performance.now();

        try {
            if (this.container && this.element) {
                this.container.appendChild(this.element);
                this.isMounted = true;
                this.onMount();

                // Mount children
                for (const child of this.children.values()) {
                    if (child.mount) {
                        child.mount();
                    }
                }

                // Emit mount event
                this.emit('component:mounted', { componentId: this.id });
            }
        } catch (error) {
            console.error(`${this.constructor.name}: Mount failed`, error);
            throw error;
        } finally {
            this.updatePerformanceStats('mount', startTime);
        }

        return this;
    }

    /**
     * Unmount the component from the DOM
     */
    unmount() {
        if (!this.isMounted) {
            return this;
        }

        try {
            // Unmount children first
            for (const child of this.children.values()) {
                if (child.unmount) {
                    child.unmount();
                }
            }

            this.onUnmount();

            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.isMounted = false;

            // Emit unmount event
            this.emit('component:unmounted', { componentId: this.id });
        } catch (error) {
            console.error(`${this.constructor.name}: Unmount failed`, error);
        }

        return this;
    }

    /**
     * Update the component's state
     */
    setState(updates, options = {}) {
        if (this.isDestroyed) {
            return;
        }

        const previousState = { ...this.state };

        if (typeof updates === 'function') {
            this.state = { ...this.state, ...updates(this.state) };
        } else {
            this.state = { ...this.state, ...updates };
        }

        // Notify state listeners
        for (const listener of this.stateListeners) {
            try {
                listener(this.state, previousState);
            } catch (error) {
                console.error(`${this.constructor.name}: State listener error`, error);
            }
        }

        // Auto-render if requested
        if (options.render !== false) {
            this.forceUpdate();
        }

        this.onStateChange(this.state, previousState);
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     */
    onStateChange(newState, previousState) {
        // Override in subclasses
    }

    /**
     * Add a state change listener
     */
    addStateListener(listener) {
        this.stateListeners.add(listener);
        return () => this.stateListeners.delete(listener);
    }

    /**
     * Force component update/re-render
     */
    forceUpdate() {
        if (this.isDestroyed || !this.isMounted) {
            return;
        }

        const startTime = performance.now();

        try {
            this.performanceStats.renderCount++;
            this.render();
            this.onUpdate();
        } catch (error) {
            console.error(`${this.constructor.name}: Update failed`, error);
        } finally {
            this.updatePerformanceStats('render', startTime);
        }
    }

    /**
     * Show the component
     */
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.isVisible = true;
            this.onShow();
            this.emit('component:shown', { componentId: this.id });
        }
        return this;
    }

    /**
     * Hide the component
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.isVisible = false;
            this.onHide();
            this.emit('component:hidden', { componentId: this.id });
        }
        return this;
    }

    /**
     * Toggle component visibility
     */
    toggle() {
        return this.isVisible ? this.hide() : this.show();
    }

    /**
     * Add a child component
     */
    addChild(key, component) {
        if (this.children.has(key)) {
            this.removeChild(key);
        }

        this.children.set(key, component);

        if (this.isMounted && component.mount) {
            component.mount();
        }

        return this;
    }

    /**
     * Remove a child component
     */
    removeChild(key) {
        const child = this.children.get(key);
        if (child) {
            if (child.destroy) {
                child.destroy();
            }
            this.children.delete(key);
        }
        return this;
    }

    /**
     * Get a child component
     */
    getChild(key) {
        return this.children.get(key);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Override in subclasses
    }

    /**
     * Add event listener to component element
     */
    addEventListener(event, handler, options = {}) {
        if (!this.element) {
            return;
        }

        const wrappedHandler = (e) => {
            try {
                handler.call(this, e);
            } catch (error) {
                console.error(`${this.constructor.name}: Event handler error`, error);
            }
        };

        this.element.addEventListener(event, wrappedHandler, options);

        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add({ handler, wrappedHandler, options });

        return this;
    }

    /**
     * Remove event listener from component element
     */
    removeEventListener(event, handler) {
        if (!this.element || !this.eventHandlers.has(event)) {
            return;
        }

        const listeners = this.eventHandlers.get(event);
        for (const listenerData of listeners) {
            if (listenerData.handler === handler) {
                this.element.removeEventListener(event, listenerData.wrappedHandler, listenerData.options);
                listeners.delete(listenerData);
                break;
            }
        }

        if (listeners.size === 0) {
            this.eventHandlers.delete(event);
        }

        return this;
    }

    /**
     * Emit event through EventManager
     */
    emit(eventType, data = {}) {
        if (this.eventManager) {
            this.eventManager.emit(eventType, {
                ...data,
                component: this.id,
                componentType: this.constructor.name
            });
        }
    }

    /**
     * Subscribe to EventManager events
     */
    on(eventType, handler, options = {}) {
        if (this.eventManager) {
            return this.eventManager.on(eventType, handler, options);
        }
    }

    /**
     * Set CSS class on element
     */
    addClass(className) {
        if (this.element && className) {
            this.element.classList.add(className);
        }
        return this;
    }

    /**
     * Remove CSS class from element
     */
    removeClass(className) {
        if (this.element && className) {
            this.element.classList.remove(className);
        }
        return this;
    }

    /**
     * Toggle CSS class on element
     */
    toggleClass(className) {
        if (this.element && className) {
            this.element.classList.toggle(className);
        }
        return this;
    }

    /**
     * Set attribute on element
     */
    setAttribute(name, value) {
        if (this.element) {
            this.element.setAttribute(name, value);
        }
        return this;
    }

    /**
     * Get attribute from element
     */
    getAttribute(name) {
        return this.element ? this.element.getAttribute(name) : null;
    }

    /**
     * Set ARIA attribute for accessibility
     */
    setAriaAttribute(name, value) {
        return this.setAttribute(`aria-${name}`, value);
    }

    /**
     * Generate unique component ID
     */
    generateComponentId() {
        return `component-${this.constructor.name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(operation, startTime) {
        const duration = performance.now() - startTime;
        this.performanceStats.lastRenderTime = duration;
        this.performanceStats.totalRenderTime += duration;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            averageRenderTime: this.performanceStats.renderCount > 0
                ? this.performanceStats.totalRenderTime / this.performanceStats.renderCount
                : 0
        };
    }

    /**
     * Lifecycle method called after mount
     */
    onMount() {
        // Override in subclasses
    }

    /**
     * Lifecycle method called after update
     */
    onUpdate() {
        // Override in subclasses
    }

    /**
     * Lifecycle method called before unmount
     */
    onUnmount() {
        // Override in subclasses
    }

    /**
     * Lifecycle method called when component is shown
     */
    onShow() {
        // Override in subclasses
    }

    /**
     * Lifecycle method called when component is hidden
     */
    onHide() {
        // Override in subclasses
    }

    /**
     * Destroy the component and clean up resources
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }

        try {
            // Destroy children first
            for (const child of this.children.values()) {
                if (child.destroy) {
                    child.destroy();
                }
            }
            this.children.clear();

            // Unmount if mounted
            if (this.isMounted) {
                this.unmount();
            }

            // Remove all event listeners
            for (const [event, listeners] of this.eventHandlers) {
                for (const listenerData of listeners) {
                    this.element?.removeEventListener(event, listenerData.wrappedHandler, listenerData.options);
                }
            }
            this.eventHandlers.clear();

            // Clear state listeners
            this.stateListeners.clear();

            // Remove element from DOM
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.onDestroy();

            // Mark as destroyed
            this.isDestroyed = true;
            this.element = null;
            this.container = null;

            // Emit destroy event
            this.emit('component:destroyed', { componentId: this.id });
        } catch (error) {
            console.error(`${this.constructor.name}: Destroy failed`, error);
        }
    }

    /**
     * Lifecycle method called during destroy
     */
    onDestroy() {
        // Override in subclasses
    }

    /**
     * Check if component is destroyed
     */
    isDestroyed() {
        return this.isDestroyed;
    }

    /**
     * Check if component is mounted
     */
    isMounted() {
        return this.isMounted;
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            id: this.id,
            type: this.constructor.name,
            isMounted: this.isMounted,
            isDestroyed: this.isDestroyed,
            isVisible: this.isVisible,
            childCount: this.children.size,
            stateListenerCount: this.stateListeners.size,
            eventHandlerCount: Array.from(this.eventHandlers.values()).reduce((total, set) => total + set.size, 0),
            performanceStats: this.getPerformanceStats(),
            state: this.state
        };
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseComponent };
} else if (typeof window !== 'undefined') {
    window.BaseComponent = BaseComponent;
}