/**
 * AnimationManager - Handles JavaScript-controlled animations and transitions
 * Provides performance-optimized animations with reduced motion support
 */
class AnimationManager {
    constructor() {
        this.eventManager = null;
        this.performanceMonitor = null;
        this.isReducedMotion = false;
        this.performanceMode = false;

        // Animation queues and state
        this.activeAnimations = new Map();
        this.animationQueue = [];
        this.animationFrameId = null;

        // Animation settings
        this.settings = {
            enableParticles: true,
            enableTransitions: true,
            enableEffects: true,
            maxParticles: 50,
            animationQuality: 'high' // 'low', 'medium', 'high'
        };

        // Performance tracking
        this.animationStats = {
            totalAnimations: 0,
            activeCount: 0,
            droppedFrames: 0,
            avgExecutionTime: 0
        };

        // Check for reduced motion preference
        this._checkReducedMotion();

        // Bind methods
        this.animate = this.animate.bind(this);
        this.runAnimationLoop = this.runAnimationLoop.bind(this);
    }

    /**
     * Initialize the animation manager
     * @param {Object} context - Game context
     */
    initialize(context) {
        this.eventManager = context.eventManager;
        this.performanceMonitor = context.performanceMonitor;

        // Listen for performance changes
        if (this.eventManager) {
            this.eventManager.on('performance:alert', (data) => {
                if (data.severity === 'critical') {
                    this.enablePerformanceMode();
                }
            });

            this.eventManager.on('game:visibilityChange', (data) => {
                if (data.hidden) {
                    this.pauseAnimations();
                } else {
                    this.resumeAnimations();
                }
            });
        }

        // Start animation loop
        this.startAnimationLoop();

        console.log('AnimationManager: Initialized');
    }

    /**
     * Animate an element with specified parameters
     * @param {HTMLElement|string} element - Element or selector
     * @param {Object} options - Animation options
     * @returns {Promise} Animation completion promise
     */
    animate(element, options = {}) {
        return new Promise((resolve, reject) => {
            // Handle element selection
            const targetElement = typeof element === 'string'
                ? document.querySelector(element)
                : element;

            if (!targetElement) {
                reject(new Error('Animation target not found'));
                return;
            }

            // Skip animation if reduced motion is enabled
            if (this.isReducedMotion) {
                resolve();
                return;
            }

            // Skip complex animations in performance mode
            if (this.performanceMode && options.skipInPerformanceMode) {
                resolve();
                return;
            }

            const animationId = this._generateAnimationId();
            const animation = {
                id: animationId,
                element: targetElement,
                options: this._normalizeOptions(options),
                startTime: performance.now(),
                resolve,
                reject,
                completed: false
            };

            // Execute animation
            this._executeAnimation(animation);
        });
    }

    /**
     * Add CSS animation class with automatic cleanup
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} animationClass - CSS animation class
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Animation completion promise
     */
    addAnimationClass(element, animationClass, duration = 300) {
        return new Promise((resolve) => {
            const targetElement = typeof element === 'string'
                ? document.querySelector(element)
                : element;

            if (!targetElement || this.isReducedMotion) {
                resolve();
                return;
            }

            // Add animation class
            targetElement.classList.add(animationClass);

            // Remove class after duration
            setTimeout(() => {
                targetElement.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    }

    /**
     * Create particle effect
     * @param {Object} options - Particle effect options
     */
    createParticleEffect(options = {}) {
        if (!this.settings.enableParticles || this.isReducedMotion || this.performanceMode) {
            return;
        }

        const config = {
            count: options.count || 10,
            source: options.source || { x: 50, y: 50 },
            target: options.target || { x: 50, y: 10 },
            color: options.color || 'var(--gfl-primary)',
            size: options.size || 4,
            duration: options.duration || 2000,
            type: options.type || 'cultivation'
        };

        // Check particle limit
        const currentParticles = document.querySelectorAll('.particle').length;
        if (currentParticles >= this.settings.maxParticles) {
            return;
        }

        for (let i = 0; i < config.count; i++) {
            this._createParticle(config, i);
        }
    }

    /**
     * Animate progress bar with smooth transitions
     * @param {HTMLElement|string} progressBar - Progress bar element
     * @param {number} fromValue - Starting value (0-100)
     * @param {number} toValue - End value (0-100)
     * @param {number} duration - Animation duration in ms
     * @returns {Promise} Animation completion promise
     */
    animateProgress(progressBar, fromValue, toValue, duration = 1000) {
        return new Promise((resolve) => {
            const element = typeof progressBar === 'string'
                ? document.querySelector(progressBar)
                : progressBar;

            if (!element) {
                resolve();
                return;
            }

            const progressFill = element.querySelector('.progress-fill') || element;
            const startTime = performance.now();
            const valueRange = toValue - fromValue;

            const updateProgress = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easedProgress = this._easeOutCubic(progress);
                const currentValue = fromValue + (valueRange * easedProgress);

                progressFill.style.width = `${currentValue}%`;

                // Add glow effect if significant progress
                if (valueRange > 20) {
                    progressFill.classList.add('animate-progress-glow');
                }

                if (progress < 1) {
                    requestAnimationFrame(updateProgress);
                } else {
                    setTimeout(() => {
                        progressFill.classList.remove('animate-progress-glow');
                    }, 2000);
                    resolve();
                }
            };

            requestAnimationFrame(updateProgress);
        });
    }

    /**
     * Show floating text animation
     * @param {Object} options - Text animation options
     */
    showFloatingText(options = {}) {
        if (this.isReducedMotion || this.performanceMode) {
            return;
        }

        const config = {
            text: options.text || '+1',
            x: options.x || 50,
            y: options.y || 50,
            color: options.color || 'var(--gfl-success)',
            fontSize: options.fontSize || '16px',
            duration: options.duration || 2000,
            distance: options.distance || 50
        };

        const textElement = document.createElement('div');
        textElement.className = 'floating-text';
        textElement.textContent = config.text;

        Object.assign(textElement.style, {
            position: 'fixed',
            left: `${config.x}px`,
            top: `${config.y}px`,
            color: config.color,
            fontSize: config.fontSize,
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: '10000',
            userSelect: 'none',
            fontFamily: 'Orbitron, monospace'
        });

        document.body.appendChild(textElement);

        // Animate the text
        this.animate(textElement, {
            keyframes: [
                {
                    opacity: 0,
                    transform: 'translateY(0px) scale(0.8)'
                },
                {
                    opacity: 1,
                    transform: `translateY(-${config.distance/2}px) scale(1.2)`,
                    offset: 0.3
                },
                {
                    opacity: 0,
                    transform: `translateY(-${config.distance}px) scale(1)`
                }
            ],
            duration: config.duration,
            easing: 'ease-out'
        }).finally(() => {
            textElement.remove();
        });
    }

    /**
     * Create ripple effect on element
     * @param {HTMLElement} element - Target element
     * @param {Object} options - Ripple options
     */
    createRippleEffect(element, options = {}) {
        if (this.isReducedMotion || !this.settings.enableEffects) {
            return;
        }

        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;

        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';

        Object.assign(ripple.style, {
            position: 'absolute',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: options.color || 'rgba(255, 255, 255, 0.6)',
            transform: 'scale(0)',
            left: `${(options.x || rect.width/2) - size/2}px`,
            top: `${(options.y || rect.height/2) - size/2}px`,
            pointerEvents: 'none',
            zIndex: '1000'
        });

        // Ensure element has relative positioning
        const originalPosition = element.style.position;
        if (!originalPosition || originalPosition === 'static') {
            element.style.position = 'relative';
        }

        element.appendChild(ripple);

        // Animate the ripple
        ripple.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(1)', opacity: 0 }
        ], {
            duration: options.duration || 600,
            easing: 'ease-out'
        }).addEventListener('finish', () => {
            ripple.remove();
            if (!originalPosition || originalPosition === 'static') {
                element.style.position = originalPosition;
            }
        });
    }

    /**
     * Enable performance mode (reduced animations)
     */
    enablePerformanceMode() {
        this.performanceMode = true;
        document.body.classList.add('performance-mode');
        this.settings.enableParticles = false;
        this.settings.animationQuality = 'low';

        console.log('AnimationManager: Performance mode enabled');
    }

    /**
     * Disable performance mode
     */
    disablePerformanceMode() {
        this.performanceMode = false;
        document.body.classList.remove('performance-mode');
        this.settings.enableParticles = true;
        this.settings.animationQuality = 'high';

        console.log('AnimationManager: Performance mode disabled');
    }

    /**
     * Pause all animations
     */
    pauseAnimations() {
        document.documentElement.style.setProperty('--anim-play-state', 'paused');
        this.isPaused = true;
    }

    /**
     * Resume all animations
     */
    resumeAnimations() {
        document.documentElement.style.setProperty('--anim-play-state', 'running');
        this.isPaused = false;
    }

    /**
     * Get animation statistics
     * @returns {Object} Animation statistics
     */
    getStats() {
        return {
            ...this.animationStats,
            activeAnimations: this.activeAnimations.size,
            queueLength: this.animationQueue.length,
            isReducedMotion: this.isReducedMotion,
            performanceMode: this.performanceMode,
            settings: { ...this.settings }
        };
    }

    // Private methods

    /**
     * Check for reduced motion preference
     */
    _checkReducedMotion() {
        this.isReducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (this.isReducedMotion) {
            console.log('AnimationManager: Reduced motion detected');
        }
    }

    /**
     * Generate unique animation ID
     * @returns {string} Animation ID
     */
    _generateAnimationId() {
        return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Normalize animation options
     * @param {Object} options - Raw options
     * @returns {Object} Normalized options
     */
    _normalizeOptions(options) {
        return {
            duration: options.duration || 300,
            easing: options.easing || 'ease',
            delay: options.delay || 0,
            keyframes: options.keyframes || null,
            transform: options.transform || null,
            opacity: options.opacity !== undefined ? options.opacity : null,
            skipInPerformanceMode: options.skipInPerformanceMode || false
        };
    }

    /**
     * Execute animation on element
     * @param {Object} animation - Animation configuration
     */
    _executeAnimation(animation) {
        const { element, options, id, resolve, reject } = animation;

        try {
            let animationInstance;

            if (options.keyframes) {
                // Use Web Animations API for keyframes
                animationInstance = element.animate(options.keyframes, {
                    duration: options.duration,
                    easing: options.easing,
                    delay: options.delay
                });
            } else {
                // Use CSS transitions for simple transforms
                const transitions = [];

                if (options.transform) {
                    element.style.transform = options.transform;
                    transitions.push('transform');
                }

                if (options.opacity !== null) {
                    element.style.opacity = options.opacity;
                    transitions.push('opacity');
                }

                if (transitions.length > 0) {
                    element.style.transition = transitions.map(prop =>
                        `${prop} ${options.duration}ms ${options.easing}`
                    ).join(', ');
                }

                // Create a fake animation object for consistency
                animationInstance = {
                    addEventListener: (event, callback) => {
                        if (event === 'finish') {
                            setTimeout(callback, options.duration + options.delay);
                        }
                    }
                };
            }

            // Store animation
            this.activeAnimations.set(id, {
                ...animation,
                instance: animationInstance
            });

            // Handle completion
            animationInstance.addEventListener('finish', () => {
                this.activeAnimations.delete(id);
                this.animationStats.totalAnimations++;
                resolve();
            });

            // Handle errors
            if (animationInstance.addEventListener) {
                animationInstance.addEventListener('cancel', () => {
                    this.activeAnimations.delete(id);
                    reject(new Error('Animation cancelled'));
                });
            }

        } catch (error) {
            reject(error);
        }
    }

    /**
     * Create a single particle
     * @param {Object} config - Particle configuration
     * @param {number} index - Particle index
     */
    _createParticle(config, index) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random positioning and timing
        const angle = (Math.PI * 2 * index) / config.count + (Math.random() - 0.5) * 0.5;
        const distance = 20 + Math.random() * 30;
        const endX = config.target.x + Math.cos(angle) * distance;
        const endY = config.target.y + Math.sin(angle) * distance;

        Object.assign(particle.style, {
            position: 'fixed',
            left: `${config.source.x}px`,
            top: `${config.source.y}px`,
            width: `${config.size}px`,
            height: `${config.size}px`,
            background: config.color,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: '9999'
        });

        document.body.appendChild(particle);

        // Animate particle
        const duration = config.duration + (Math.random() - 0.5) * 500;

        particle.animate([
            {
                transform: 'translate(0, 0) scale(0)',
                opacity: 0
            },
            {
                transform: `translate(${(endX - config.source.x) * 0.3}px, ${(endY - config.source.y) * 0.3}px) scale(1)`,
                opacity: 1,
                offset: 0.3
            },
            {
                transform: `translate(${endX - config.source.x}px, ${endY - config.source.y}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).addEventListener('finish', () => {
            particle.remove();
        });
    }

    /**
     * Start animation loop for performance monitoring
     */
    startAnimationLoop() {
        if (this.animationFrameId) {
            return;
        }

        this.runAnimationLoop();
    }

    /**
     * Animation loop for performance monitoring
     */
    runAnimationLoop() {
        const startTime = performance.now();

        // Update animation statistics
        this.animationStats.activeCount = this.activeAnimations.size;

        // Clean up finished animations
        for (const [id, animation] of this.activeAnimations) {
            if (performance.now() - animation.startTime > animation.options.duration + 1000) {
                this.activeAnimations.delete(id);
            }
        }

        const endTime = performance.now();
        this.animationStats.avgExecutionTime = endTime - startTime;

        // Continue loop
        this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    }

    /**
     * Stop animation loop
     */
    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Easing function - ease out cubic
     * @param {number} t - Time value (0-1)
     * @returns {number} Eased value
     */
    _easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimationManager };
} else if (typeof window !== 'undefined') {
    window.AnimationManager = AnimationManager;
}