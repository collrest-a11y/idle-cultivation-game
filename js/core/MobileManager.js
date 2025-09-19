/**
 * MobileManager - Handles mobile device detection, responsive behavior, and touch optimization
 * Provides adaptive UI behavior for different device types and screen sizes
 */
class MobileManager {
    constructor() {
        this.eventManager = null;
        this.performanceMonitor = null;

        // Device detection
        this.deviceInfo = {
            isMobile: false,
            isTablet: false,
            isDesktop: false,
            isTouch: false,
            isIOS: false,
            isAndroid: false,
            hasNotch: false,
            screenSize: 'desktop',
            orientation: 'portrait',
            pixelRatio: 1
        };

        // Screen breakpoints
        this.breakpoints = {
            xs: 320,
            sm: 480,
            md: 768,
            lg: 1024,
            xl: 1200
        };

        // Touch and interaction state
        this.touchState = {
            isEnabled: false,
            lastTouchTime: 0,
            touchPoints: 0,
            gestureRecognition: false
        };

        // Performance settings based on device
        this.performanceSettings = {
            animationsEnabled: true,
            particlesEnabled: true,
            highQualityEffects: true,
            reducedMotion: false,
            batteryOptimization: false
        };

        // Responsive behavior settings
        this.responsiveSettings = {
            autoHideUI: false,
            compactMode: false,
            touchOptimization: false,
            adaptiveNavigation: false,
            smartScaling: true
        };

        // Initialize device detection
        this._detectDevice();
        this._setupEventListeners();
        this._applyInitialOptimizations();
    }

    /**
     * Initialize the mobile manager
     * @param {Object} context - Game context
     */
    initialize(context) {
        this.eventManager = context.eventManager;
        this.performanceMonitor = context.performanceMonitor;

        // Apply responsive classes to body
        this._applyResponsiveClasses();

        // Set up performance monitoring
        this._setupPerformanceMonitoring();

        // Initialize touch handling
        if (this.deviceInfo.isTouch) {
            this._initializeTouchHandling();
        }

        // Set up viewport handling
        this._setupViewport();

        console.log('MobileManager: Initialized for', this.deviceInfo.screenSize, 'device');
    }

    /**
     * Get current device information
     * @returns {Object} Device information
     */
    getDeviceInfo() {
        return {
            ...this.deviceInfo,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                availableHeight: window.screen.availHeight
            },
            supportedFeatures: this._getSupportedFeatures()
        };
    }

    /**
     * Check if device is mobile
     * @returns {boolean} Whether device is mobile
     */
    isMobile() {
        return this.deviceInfo.isMobile;
    }

    /**
     * Check if device supports touch
     * @returns {boolean} Whether device supports touch
     */
    isTouch() {
        return this.deviceInfo.isTouch;
    }

    /**
     * Get current screen size category
     * @returns {string} Screen size category
     */
    getScreenSize() {
        return this.deviceInfo.screenSize;
    }

    /**
     * Enable or disable touch optimizations
     * @param {boolean} enabled - Whether to enable touch optimizations
     */
    setTouchOptimization(enabled) {
        this.responsiveSettings.touchOptimization = enabled;

        if (enabled) {
            document.body.classList.add('touch-optimized');
            this._applyTouchOptimizations();
        } else {
            document.body.classList.remove('touch-optimized');
            this._removeTouchOptimizations();
        }

        console.log(`MobileManager: Touch optimization ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable or disable compact mode
     * @param {boolean} enabled - Whether to enable compact mode
     */
    setCompactMode(enabled) {
        this.responsiveSettings.compactMode = enabled;

        if (enabled) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }

        if (this.eventManager) {
            this.eventManager.emit('mobile:compactModeChanged', { enabled });
        }

        console.log(`MobileManager: Compact mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable or disable performance optimizations for mobile
     * @param {boolean} enabled - Whether to enable optimizations
     */
    setPerformanceOptimization(enabled) {
        this.performanceSettings.batteryOptimization = enabled;

        if (enabled) {
            document.body.classList.add('mobile-performance-mode');
            this._applyPerformanceOptimizations();
        } else {
            document.body.classList.remove('mobile-performance-mode');
            this._removePerformanceOptimizations();
        }

        console.log(`MobileManager: Performance optimization ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        const orientationChanged = this.deviceInfo.orientation !== newOrientation;

        if (orientationChanged) {
            this.deviceInfo.orientation = newOrientation;

            // Update screen size category
            this._updateScreenSize();

            // Apply orientation-specific optimizations
            this._applyOrientationOptimizations();

            if (this.eventManager) {
                this.eventManager.emit('mobile:orientationChanged', {
                    orientation: newOrientation,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                });
            }

            console.log(`MobileManager: Orientation changed to ${newOrientation}`);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const oldScreenSize = this.deviceInfo.screenSize;
        this._updateScreenSize();

        if (oldScreenSize !== this.deviceInfo.screenSize) {
            this._applyResponsiveClasses();

            if (this.eventManager) {
                this.eventManager.emit('mobile:screenSizeChanged', {
                    from: oldScreenSize,
                    to: this.deviceInfo.screenSize,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                });
            }

            console.log(`MobileManager: Screen size changed from ${oldScreenSize} to ${this.deviceInfo.screenSize}`);
        }
    }

    /**
     * Optimize touch targets for current device
     */
    optimizeTouchTargets() {
        if (!this.deviceInfo.isTouch) return;

        const minTouchSize = this.deviceInfo.isMobile ? 44 : 32;

        document.querySelectorAll('.btn, button, .nav-link, .tab-button').forEach(element => {
            const style = window.getComputedStyle(element);
            const width = parseFloat(style.width);
            const height = parseFloat(style.height);

            if (width < minTouchSize || height < minTouchSize) {
                element.style.minWidth = `${minTouchSize}px`;
                element.style.minHeight = `${minTouchSize}px`;
                element.classList.add('touch-optimized');
            }
        });

        console.log('MobileManager: Touch targets optimized');
    }

    /**
     * Show or hide mobile debug information
     * @param {boolean} show - Whether to show debug info
     */
    showDebugInfo(show = true) {
        const existingDebug = document.querySelector('.mobile-debug-info');

        if (existingDebug) {
            existingDebug.remove();
        }

        if (show) {
            const debugElement = document.createElement('div');
            debugElement.className = 'mobile-debug-info';
            debugElement.style.cssText = `
                position: fixed;
                top: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 8px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                pointer-events: none;
                white-space: pre-line;
            `;

            const updateDebugInfo = () => {
                debugElement.textContent = [
                    `Screen: ${this.deviceInfo.screenSize}`,
                    `Size: ${window.innerWidth}x${window.innerHeight}`,
                    `DPR: ${window.devicePixelRatio}`,
                    `Touch: ${this.deviceInfo.isTouch}`,
                    `Orientation: ${this.deviceInfo.orientation}`,
                    `Mobile: ${this.deviceInfo.isMobile}`,
                    `Platform: ${this.deviceInfo.isIOS ? 'iOS' : this.deviceInfo.isAndroid ? 'Android' : 'Other'}`
                ].join('\n');
            };

            updateDebugInfo();
            document.body.appendChild(debugElement);

            // Update debug info on resize
            const resizeHandler = () => updateDebugInfo();
            window.addEventListener('resize', resizeHandler);
            window.addEventListener('orientationchange', resizeHandler);
        }
    }

    /**
     * Get recommended settings for current device
     * @returns {Object} Recommended settings
     */
    getRecommendedSettings() {
        const recommendations = {
            performance: {},
            ui: {},
            features: {}
        };

        // Performance recommendations
        if (this.deviceInfo.isMobile) {
            recommendations.performance = {
                animationQuality: 'medium',
                particleCount: 'low',
                effectQuality: 'medium',
                frameRate: 30
            };
        } else {
            recommendations.performance = {
                animationQuality: 'high',
                particleCount: 'high',
                effectQuality: 'high',
                frameRate: 60
            };
        }

        // UI recommendations
        if (this.deviceInfo.isTouch) {
            recommendations.ui = {
                touchTargetSize: 'large',
                spacing: 'comfortable',
                feedback: 'haptic'
            };
        }

        // Feature recommendations
        if (this.deviceInfo.screenSize === 'xs' || this.deviceInfo.screenSize === 'sm') {
            recommendations.features = {
                compactMode: true,
                autoHideUI: true,
                simplifiedNavigation: true
            };
        }

        return recommendations;
    }

    // Private methods

    /**
     * Detect device characteristics
     */
    _detectDevice() {
        const userAgent = navigator.userAgent;
        const width = window.innerWidth;

        // Basic device detection
        this.deviceInfo.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        this.deviceInfo.isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
        this.deviceInfo.isDesktop = !this.deviceInfo.isMobile && !this.deviceInfo.isTablet;

        // Touch detection
        this.deviceInfo.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Platform detection
        this.deviceInfo.isIOS = /iPad|iPhone|iPod/.test(userAgent);
        this.deviceInfo.isAndroid = /Android/.test(userAgent);

        // Notch detection (approximation)
        this.deviceInfo.hasNotch = this.deviceInfo.isIOS &&
            (window.screen.height === 812 || window.screen.height === 896 || window.screen.height === 844);

        // Screen size classification
        this._updateScreenSize();

        // Orientation
        this.deviceInfo.orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

        // Pixel ratio
        this.deviceInfo.pixelRatio = window.devicePixelRatio || 1;

        // Check for reduced motion preference
        this.performanceSettings.reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Update screen size classification
     */
    _updateScreenSize() {
        const width = window.innerWidth;

        if (width <= this.breakpoints.xs) {
            this.deviceInfo.screenSize = 'xs';
        } else if (width <= this.breakpoints.sm) {
            this.deviceInfo.screenSize = 'sm';
        } else if (width <= this.breakpoints.md) {
            this.deviceInfo.screenSize = 'md';
        } else if (width <= this.breakpoints.lg) {
            this.deviceInfo.screenSize = 'lg';
        } else {
            this.deviceInfo.screenSize = 'xl';
        }
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Resize and orientation handling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 500);
        });

        // Visibility change for performance optimization
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._enableBatteryOptimization();
            } else {
                this._disableBatteryOptimization();
            }
        });

        // Touch event listeners for mobile optimization
        if (this.deviceInfo.isTouch) {
            document.addEventListener('touchstart', (e) => {
                this.touchState.lastTouchTime = Date.now();
                this.touchState.touchPoints = e.touches.length;
            }, { passive: true });
        }
    }

    /**
     * Apply initial optimizations based on device
     */
    _applyInitialOptimizations() {
        // Auto-enable touch optimization on touch devices
        if (this.deviceInfo.isTouch) {
            this.setTouchOptimization(true);
        }

        // Auto-enable compact mode on small screens
        if (this.deviceInfo.screenSize === 'xs' || this.deviceInfo.screenSize === 'sm') {
            this.setCompactMode(true);
        }

        // Auto-enable performance optimizations on mobile
        if (this.deviceInfo.isMobile) {
            this.setPerformanceOptimization(true);
        }
    }

    /**
     * Apply responsive classes to document body
     */
    _applyResponsiveClasses() {
        const body = document.body;

        // Remove existing classes
        body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
        body.classList.remove('screen-xs', 'screen-sm', 'screen-md', 'screen-lg', 'screen-xl');
        body.classList.remove('touch-device', 'no-touch-device');
        body.classList.remove('ios-device', 'android-device');
        body.classList.remove('portrait', 'landscape');

        // Add device type classes
        if (this.deviceInfo.isMobile) body.classList.add('device-mobile');
        if (this.deviceInfo.isTablet) body.classList.add('device-tablet');
        if (this.deviceInfo.isDesktop) body.classList.add('device-desktop');

        // Add screen size class
        body.classList.add(`screen-${this.deviceInfo.screenSize}`);

        // Add touch classes
        body.classList.add(this.deviceInfo.isTouch ? 'touch-device' : 'no-touch-device');

        // Add platform classes
        if (this.deviceInfo.isIOS) body.classList.add('ios-device');
        if (this.deviceInfo.isAndroid) body.classList.add('android-device');

        // Add orientation class
        body.classList.add(this.deviceInfo.orientation);

        // Add safe area support if needed
        if (this.deviceInfo.hasNotch) {
            body.classList.add('has-notch', 'safe-area-support');
        }
    }

    /**
     * Initialize touch handling
     */
    _initializeTouchHandling() {
        this.touchState.isEnabled = true;

        // Prevent default touch behaviors where appropriate
        document.addEventListener('touchmove', (e) => {
            // Allow scrolling but prevent other gestures on game elements
            if (e.target.closest('.game-container')) {
                const element = e.target.closest('.scrollable, .modal-body, .tab-content');
                if (!element) {
                    e.preventDefault();
                }
            }
        }, { passive: false });

        // Add touch feedback to interactive elements
        this._addTouchFeedback();
    }

    /**
     * Add touch feedback to interactive elements
     */
    _addTouchFeedback() {
        const interactiveElements = document.querySelectorAll('.btn, button, .nav-link, .tab-button');

        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });

            element.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('touch-active');
                }, 150);
            }, { passive: true });

            element.addEventListener('touchcancel', function() {
                this.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    /**
     * Set up viewport handling
     */
    _setupViewport() {
        // Set appropriate viewport meta tag if not already set
        let viewportMeta = document.querySelector('meta[name="viewport"]');

        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }

        // Set optimal viewport configuration
        const viewportContent = [
            'width=device-width',
            'initial-scale=1.0',
            'minimum-scale=1.0',
            'maximum-scale=5.0',
            'user-scalable=yes',
            'viewport-fit=cover'
        ].join(', ');

        viewportMeta.content = viewportContent;

        // Handle viewport height changes (mobile keyboards, etc.)
        this._handleViewportHeight();
    }

    /**
     * Handle viewport height changes
     */
    _handleViewportHeight() {
        // CSS custom property for actual viewport height
        const updateViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        updateViewportHeight();
        window.addEventListener('resize', updateViewportHeight);
    }

    /**
     * Apply touch optimizations
     */
    _applyTouchOptimizations() {
        // Increase touch target sizes
        this.optimizeTouchTargets();

        // Add touch-specific CSS classes
        document.body.classList.add('touch-optimized');

        // Enable touch scrolling optimizations
        document.querySelectorAll('.scrollable').forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overflowScrolling = 'touch';
        });
    }

    /**
     * Remove touch optimizations
     */
    _removeTouchOptimizations() {
        document.body.classList.remove('touch-optimized');

        document.querySelectorAll('.touch-optimized').forEach(element => {
            element.classList.remove('touch-optimized');
            element.style.minWidth = '';
            element.style.minHeight = '';
        });
    }

    /**
     * Apply performance optimizations
     */
    _applyPerformanceOptimizations() {
        this.performanceSettings.animationsEnabled = false;
        this.performanceSettings.particlesEnabled = false;
        this.performanceSettings.highQualityEffects = false;

        document.body.classList.add('mobile-performance-mode');
    }

    /**
     * Remove performance optimizations
     */
    _removePerformanceOptimizations() {
        this.performanceSettings.animationsEnabled = true;
        this.performanceSettings.particlesEnabled = true;
        this.performanceSettings.highQualityEffects = true;

        document.body.classList.remove('mobile-performance-mode');
    }

    /**
     * Apply orientation-specific optimizations
     */
    _applyOrientationOptimizations() {
        document.body.classList.remove('portrait', 'landscape');
        document.body.classList.add(this.deviceInfo.orientation);

        if (this.deviceInfo.orientation === 'landscape' && this.deviceInfo.isMobile) {
            // Optimize for landscape mobile
            document.body.classList.add('mobile-landscape');
        } else {
            document.body.classList.remove('mobile-landscape');
        }
    }

    /**
     * Set up performance monitoring
     */
    _setupPerformanceMonitoring() {
        if (!this.performanceMonitor) return;

        // Monitor performance specifically for mobile devices
        if (this.deviceInfo.isMobile) {
            this.performanceMonitor.setDetailedProfiling(false); // Reduce overhead
        }
    }

    /**
     * Enable battery optimization
     */
    _enableBatteryOptimization() {
        if (this.deviceInfo.isMobile) {
            document.body.classList.add('battery-optimization');
            this.performanceSettings.batteryOptimization = true;
        }
    }

    /**
     * Disable battery optimization
     */
    _disableBatteryOptimization() {
        document.body.classList.remove('battery-optimization');
        this.performanceSettings.batteryOptimization = false;
    }

    /**
     * Get supported features
     * @returns {Object} Supported features
     */
    _getSupportedFeatures() {
        return {
            touch: 'ontouchstart' in window,
            deviceMotion: 'DeviceMotionEvent' in window,
            deviceOrientation: 'DeviceOrientationEvent' in window,
            vibration: 'vibrate' in navigator,
            fullscreen: 'requestFullscreen' in document.documentElement,
            orientation: 'orientation' in screen,
            batteryAPI: 'getBattery' in navigator,
            serviceWorker: 'serviceWorker' in navigator,
            webGL: !!window.WebGLRenderingContext,
            localStorage: 'localStorage' in window,
            sessionStorage: 'sessionStorage' in window,
            indexedDB: 'indexedDB' in window
        };
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileManager };
} else if (typeof window !== 'undefined') {
    window.MobileManager = MobileManager;
}