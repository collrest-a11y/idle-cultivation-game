/**
 * UIManager - Centralized UI component management system
 * Handles component registration, lifecycle, theming, and responsive behavior
 */
class UIManager {
    constructor() {
        if (UIManager.instance) {
            return UIManager.instance;
        }

        this.components = new Map(); // id -> component
        this.componentTypes = new Map(); // type -> Set of components
        this.modals = new Set(); // Active modals
        this.eventManager = null;
        this.gameState = null;

        // Theme management
        this.currentTheme = 'gfl-dark';
        this.themes = new Map();

        // Responsive breakpoints
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1440,
            wide: 1920
        };

        this.currentBreakpoint = 'desktop';

        // Performance monitoring
        this.performanceMonitor = {
            enabled: false,
            componentRenderTimes: new Map(),
            frameRate: 0,
            lastFrameTime: 0
        };

        // Accessibility settings
        this.a11y = {
            reducedMotion: false,
            highContrast: false,
            screenReader: false,
            keyboardNavigation: true
        };

        // Focus management
        this.focusStack = [];
        this.focusTrap = null;

        // Initialization flags
        this.isInitialized = false;
        this.isDestroyed = false;

        UIManager.instance = this;
    }

    /**
     * Initialize the UI Manager
     */
    async init(options = {}) {
        if (this.isInitialized) {
            return;
        }

        try {
            // Set dependencies
            this.eventManager = options.eventManager || window.eventManager;
            this.gameState = options.gameState || window.gameState;

            // Initialize themes
            this.initializeThemes();

            // Setup responsive system
            this.setupResponsiveSystem();

            // Setup accessibility
            this.setupAccessibility();

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Setup performance monitoring
            if (options.enablePerformanceMonitoring) {
                this.enablePerformanceMonitoring();
            }

            this.isInitialized = true;

            console.log('UIManager: Initialized successfully');

            if (this.eventManager) {
                this.eventManager.emit('uiManager:initialized', {
                    theme: this.currentTheme,
                    breakpoint: this.currentBreakpoint,
                    accessibility: this.a11y
                });
            }
        } catch (error) {
            console.error('UIManager: Initialization failed', error);
            throw error;
        }
    }

    /**
     * Register a component with the manager
     */
    registerComponent(component) {
        if (!component || !component.id) {
            throw new Error('UIManager: Component must have an id');
        }

        const componentType = component.constructor.name;

        // Store component
        this.components.set(component.id, component);

        // Track by type
        if (!this.componentTypes.has(componentType)) {
            this.componentTypes.set(componentType, new Set());
        }
        this.componentTypes.get(componentType).add(component);

        // Apply current theme
        this.applyThemeToComponent(component);

        // Apply responsive settings
        this.applyResponsiveToComponent(component);

        console.log(`UIManager: Registered ${componentType} component with id: ${component.id}`);

        if (this.eventManager) {
            this.eventManager.emit('uiManager:componentRegistered', {
                componentId: component.id,
                componentType: componentType
            });
        }
    }

    /**
     * Unregister a component from the manager
     */
    unregisterComponent(componentId) {
        const component = this.components.get(componentId);
        if (!component) {
            return;
        }

        const componentType = component.constructor.name;

        // Remove from type tracking
        if (this.componentTypes.has(componentType)) {
            this.componentTypes.get(componentType).delete(component);
            if (this.componentTypes.get(componentType).size === 0) {
                this.componentTypes.delete(componentType);
            }
        }

        // Remove from modals if it's a modal
        this.modals.delete(component);

        // Remove from components
        this.components.delete(componentId);

        console.log(`UIManager: Unregistered ${componentType} component with id: ${componentId}`);

        if (this.eventManager) {
            this.eventManager.emit('uiManager:componentUnregistered', {
                componentId: componentId,
                componentType: componentType
            });
        }
    }

    /**
     * Get component by ID
     */
    getComponent(componentId) {
        return this.components.get(componentId);
    }

    /**
     * Get all components of a specific type
     */
    getComponentsByType(componentType) {
        return Array.from(this.componentTypes.get(componentType) || []);
    }

    /**
     * Get all registered components
     */
    getAllComponents() {
        return Array.from(this.components.values());
    }

    /**
     * Create and register a component
     */
    createComponent(ComponentClass, container, options = {}) {
        const component = new ComponentClass(container, {
            ...options,
            eventManager: this.eventManager,
            gameState: this.gameState,
            uiManager: this
        });

        this.registerComponent(component);
        return component;
    }

    /**
     * Destroy a component
     */
    destroyComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            this.unregisterComponent(componentId);
            if (component.destroy) {
                component.destroy();
            }
        }
    }

    /**
     * Theme Management
     */
    initializeThemes() {
        // Register default GFL theme
        this.registerTheme('gfl-dark', {
            name: 'Girls\' Frontline Dark',
            primaryColor: '#00d4ff',
            secondaryColor: '#4fc3f7',
            backgroundColor: '#0a0e1a',
            textColor: '#ffffff',
            variables: {
                '--primary-bg': '#0a0e1a',
                '--secondary-bg': '#1a1f2e',
                '--tertiary-bg': '#252d42',
                '--accent-primary': '#00d4ff',
                '--accent-secondary': '#4fc3f7',
                '--text-primary': '#ffffff',
                '--text-secondary': '#b8c5d6',
                '--text-muted': '#6c7b7f'
            }
        });

        // Register light theme variant
        this.registerTheme('gfl-light', {
            name: 'Girls\' Frontline Light',
            primaryColor: '#0066cc',
            secondaryColor: '#0099ff',
            backgroundColor: '#f8fafc',
            textColor: '#1a202c',
            variables: {
                '--primary-bg': '#f8fafc',
                '--secondary-bg': '#edf2f7',
                '--tertiary-bg': '#e2e8f0',
                '--accent-primary': '#0066cc',
                '--accent-secondary': '#0099ff',
                '--text-primary': '#1a202c',
                '--text-secondary': '#4a5568',
                '--text-muted': '#718096'
            }
        });
    }

    /**
     * Register a new theme
     */
    registerTheme(id, theme) {
        this.themes.set(id, theme);
        console.log(`UIManager: Registered theme: ${id}`);
    }

    /**
     * Switch to a different theme
     */
    setTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.warn(`UIManager: Theme not found: ${themeId}`);
            return;
        }

        this.currentTheme = themeId;

        // Apply CSS variables
        const root = document.documentElement;
        for (const [property, value] of Object.entries(theme.variables)) {
            root.style.setProperty(property, value);
        }

        // Apply theme to all components
        for (const component of this.components.values()) {
            this.applyThemeToComponent(component);
        }

        console.log(`UIManager: Switched to theme: ${themeId}`);

        if (this.eventManager) {
            this.eventManager.emit('uiManager:themeChanged', {
                previousTheme: this.currentTheme,
                newTheme: themeId,
                theme: theme
            });
        }
    }

    /**
     * Apply current theme to a component
     */
    applyThemeToComponent(component) {
        if (component.element) {
            component.element.setAttribute('data-theme', this.currentTheme);
        }
    }

    /**
     * Responsive System
     */
    setupResponsiveSystem() {
        // Set initial breakpoint
        this.updateBreakpoint();

        // Listen for resize events
        const resizeObserver = new ResizeObserver((entries) => {
            this.updateBreakpoint();
        });

        resizeObserver.observe(document.body);

        // Fallback for older browsers
        window.addEventListener('resize', () => {
            this.updateBreakpoint();
        });
    }

    /**
     * Update current breakpoint
     */
    updateBreakpoint() {
        const width = window.innerWidth;
        let newBreakpoint;

        if (width < this.breakpoints.mobile) {
            newBreakpoint = 'mobile';
        } else if (width < this.breakpoints.tablet) {
            newBreakpoint = 'tablet';
        } else if (width < this.breakpoints.desktop) {
            newBreakpoint = 'desktop';
        } else {
            newBreakpoint = 'wide';
        }

        if (newBreakpoint !== this.currentBreakpoint) {
            const previousBreakpoint = this.currentBreakpoint;
            this.currentBreakpoint = newBreakpoint;

            // Apply responsive settings to all components
            for (const component of this.components.values()) {
                this.applyResponsiveToComponent(component);
            }

            console.log(`UIManager: Breakpoint changed to: ${newBreakpoint}`);

            if (this.eventManager) {
                this.eventManager.emit('uiManager:breakpointChanged', {
                    previousBreakpoint,
                    newBreakpoint,
                    width
                });
            }
        }
    }

    /**
     * Apply responsive settings to a component
     */
    applyResponsiveToComponent(component) {
        if (component.element) {
            component.element.setAttribute('data-breakpoint', this.currentBreakpoint);

            // Remove old breakpoint classes
            for (const breakpoint of Object.keys(this.breakpoints)) {
                component.element.classList.remove(`breakpoint-${breakpoint}`);
            }

            // Add current breakpoint class
            component.element.classList.add(`breakpoint-${this.currentBreakpoint}`);
        }
    }

    /**
     * Modal Management
     */
    registerModal(modal) {
        this.modals.add(modal);
        this.manageFocus(modal);
    }

    /**
     * Unregister modal
     */
    unregisterModal(modal) {
        this.modals.delete(modal);
        this.restoreFocus(modal);
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        for (const modal of this.modals) {
            if (modal.close) {
                modal.close();
            }
        }
    }

    /**
     * Focus Management
     */
    manageFocus(modal) {
        // Store current focus
        this.focusStack.push(document.activeElement);

        // Set focus trap
        this.focusTrap = modal;
    }

    /**
     * Restore focus after modal closes
     */
    restoreFocus(modal) {
        if (this.focusTrap === modal) {
            this.focusTrap = null;

            // Restore previous focus
            const previousFocus = this.focusStack.pop();
            if (previousFocus && previousFocus.focus) {
                previousFocus.focus();
            }
        }
    }

    /**
     * Accessibility Setup
     */
    setupAccessibility() {
        // Check for reduced motion preference
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.a11y.reducedMotion = mediaQuery.matches;

            mediaQuery.addEventListener('change', (e) => {
                this.a11y.reducedMotion = e.matches;
                this.updateAccessibilitySettings();
            });
        }

        // Check for high contrast preference
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-contrast: high)');
            this.a11y.highContrast = mediaQuery.matches;

            mediaQuery.addEventListener('change', (e) => {
                this.a11y.highContrast = e.matches;
                this.updateAccessibilitySettings();
            });
        }

        // Detect screen reader
        this.a11y.screenReader = this.detectScreenReader();

        this.updateAccessibilitySettings();
    }

    /**
     * Update accessibility settings
     */
    updateAccessibilitySettings() {
        const root = document.documentElement;

        // Apply reduced motion
        root.classList.toggle('reduced-motion', this.a11y.reducedMotion);

        // Apply high contrast
        root.classList.toggle('high-contrast', this.a11y.highContrast);

        // Apply screen reader mode
        root.classList.toggle('screen-reader', this.a11y.screenReader);

        // Notify components
        for (const component of this.components.values()) {
            if (component.onAccessibilityUpdate) {
                component.onAccessibilityUpdate(this.a11y);
            }
        }

        if (this.eventManager) {
            this.eventManager.emit('uiManager:accessibilityChanged', this.a11y);
        }
    }

    /**
     * Detect screen reader
     */
    detectScreenReader() {
        // Basic screen reader detection
        return !!(
            navigator.userAgent.match(/NVDA|JAWS|VoiceOver|ORCA/i) ||
            window.speechSynthesis ||
            window.navigator.userAgent.indexOf('Trident') > -1
        );
    }

    /**
     * Performance Monitoring
     */
    enablePerformanceMonitoring() {
        this.performanceMonitor.enabled = true;

        // Monitor frame rate
        let frameCount = 0;
        let startTime = performance.now();

        const measureFrameRate = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - startTime >= 1000) {
                this.performanceMonitor.frameRate = frameCount;
                frameCount = 0;
                startTime = currentTime;
            }

            requestAnimationFrame(measureFrameRate);
        };

        requestAnimationFrame(measureFrameRate);

        console.log('UIManager: Performance monitoring enabled');
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const componentStats = {};
        for (const component of this.components.values()) {
            if (component.getPerformanceStats) {
                componentStats[component.id] = component.getPerformanceStats();
            }
        }

        return {
            frameRate: this.performanceMonitor.frameRate,
            componentCount: this.components.size,
            componentStats,
            memoryUsage: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : null
        };
    }

    /**
     * Global event listeners
     */
    setupGlobalEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modals.size > 0) {
                // Close topmost modal on escape
                const modals = Array.from(this.modals);
                const topModal = modals[modals.length - 1];
                if (topModal.close) {
                    topModal.close();
                }
            }
        });

        // Focus trap for modals
        document.addEventListener('keydown', (e) => {
            if (this.focusTrap && e.key === 'Tab') {
                this.handleFocusTrap(e);
            }
        });
    }

    /**
     * Handle focus trap for accessibility
     */
    handleFocusTrap(e) {
        if (!this.focusTrap || !this.focusTrap.element) {
            return;
        }

        const focusableElements = this.focusTrap.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Destroy the UI Manager
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }

        // Destroy all components
        for (const component of this.components.values()) {
            if (component.destroy) {
                component.destroy();
            }
        }

        this.components.clear();
        this.componentTypes.clear();
        this.modals.clear();
        this.focusStack = [];
        this.focusTrap = null;

        this.isDestroyed = true;
        this.isInitialized = false;

        console.log('UIManager: Destroyed');
    }

    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            componentCount: this.components.size,
            modalCount: this.modals.size,
            currentTheme: this.currentTheme,
            currentBreakpoint: this.currentBreakpoint,
            accessibility: this.a11y,
            performanceStats: this.getPerformanceStats(),
            registeredThemes: Array.from(this.themes.keys()),
            componentTypes: Array.from(this.componentTypes.keys())
        };
    }
}

// Create singleton instance
const uiManager = new UIManager();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIManager, uiManager };
} else if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
    window.uiManager = uiManager;
}