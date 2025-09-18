/**
 * ProgressBar - Animated progress indicator component
 * Extends BaseComponent with progress tracking and animation
 */
class ProgressBar extends BaseComponent {
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'progress-bar',
            value: 0,
            min: 0,
            max: 100,
            animated: true,
            striped: false,
            showLabel: true,
            showPercentage: true,
            showValue: false,
            labelTemplate: '{percentage}%',
            size: 'medium', // small, medium, large
            variant: 'primary', // primary, secondary, success, warning, danger, info
            orientation: 'horizontal', // horizontal, vertical
            precision: 1,
            animationDuration: 300,
            indeterminate: false,
            segments: null, // Array for multi-segment progress
            gradient: false,
            pulse: false,
            smooth: true
        };
    }

    getInitialState() {
        return {
            currentValue: this.options.value,
            targetValue: this.options.value,
            isAnimating: false,
            animationStart: 0,
            animationDuration: 0
        };
    }

    createElement() {
        // Create main container
        this.element = document.createElement('div');
        this.element.className = `progress-bar-container ${this.options.className} progress-${this.options.size} progress-${this.options.variant} progress-${this.options.orientation}`;
        this.element.id = this.id;

        // ARIA attributes
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-valuemin', this.options.min);
        this.element.setAttribute('aria-valuemax', this.options.max);
        this.element.setAttribute('aria-valuenow', this.state.currentValue);

        // Label
        if (this.options.label) {
            this.element.setAttribute('aria-label', this.options.label);
        }

        // Create progress track
        this.track = document.createElement('div');
        this.track.className = 'progress-track';
        this.element.appendChild(this.track);

        // Create progress fill
        this.fill = document.createElement('div');
        this.fill.className = 'progress-fill';

        // Apply variant styling
        if (this.options.striped) {
            this.fill.classList.add('progress-striped');
        }

        if (this.options.animated) {
            this.fill.classList.add('progress-animated');
        }

        if (this.options.gradient) {
            this.fill.classList.add('progress-gradient');
        }

        if (this.options.pulse) {
            this.fill.classList.add('progress-pulse');
        }

        this.track.appendChild(this.fill);

        // Create segments if specified
        if (this.options.segments) {
            this.createSegments();
        }

        // Create label
        if (this.options.showLabel) {
            this.createLabel();
        }

        // Handle indeterminate state
        if (this.options.indeterminate) {
            this.element.classList.add('progress-indeterminate');
        }

        this.render();
    }

    createSegments() {
        this.segments = [];
        this.segmentContainer = document.createElement('div');
        this.segmentContainer.className = 'progress-segments';
        this.track.appendChild(this.segmentContainer);

        for (let i = 0; i < this.options.segments.length; i++) {
            const segment = this.options.segments[i];
            const segmentElement = document.createElement('div');
            segmentElement.className = `progress-segment progress-segment-${segment.variant || this.options.variant}`;
            segmentElement.style.width = `${segment.width || (100 / this.options.segments.length)}%`;

            if (segment.label) {
                segmentElement.setAttribute('title', segment.label);
            }

            this.segmentContainer.appendChild(segmentElement);
            this.segments.push({
                element: segmentElement,
                ...segment
            });
        }
    }

    createLabel() {
        this.label = document.createElement('div');
        this.label.className = 'progress-label';
        this.element.appendChild(this.label);
    }

    render() {
        // Update ARIA attributes
        this.element.setAttribute('aria-valuenow', this.state.currentValue);

        // Calculate percentage
        const percentage = this.getPercentage(this.state.currentValue);

        // Update fill width/height
        if (this.options.orientation === 'horizontal') {
            this.fill.style.width = `${percentage}%`;
            this.fill.style.height = '100%';
        } else {
            this.fill.style.height = `${percentage}%`;
            this.fill.style.width = '100%';
        }

        // Update segments if present
        if (this.segments) {
            this.updateSegments();
        }

        // Update label
        if (this.label) {
            this.updateLabel();
        }

        // Handle indeterminate state
        if (this.options.indeterminate) {
            this.fill.style.width = '100%';
            this.fill.style.height = '100%';
        }
    }

    updateSegments() {
        let accumulatedValue = this.options.min;

        for (const segment of this.segments) {
            const segmentMax = Math.min(accumulatedValue + segment.value, this.options.max);
            const segmentProgress = Math.max(0, Math.min(this.state.currentValue - accumulatedValue, segment.value));
            const segmentPercentage = (segmentProgress / segment.value) * 100;

            segment.element.style.opacity = segmentProgress > 0 ? '1' : '0.3';

            // Add inner fill for segment
            if (!segment.innerFill) {
                segment.innerFill = document.createElement('div');
                segment.innerFill.className = 'progress-segment-fill';
                segment.element.appendChild(segment.innerFill);
            }

            if (this.options.orientation === 'horizontal') {
                segment.innerFill.style.width = `${segmentPercentage}%`;
                segment.innerFill.style.height = '100%';
            } else {
                segment.innerFill.style.height = `${segmentPercentage}%`;
                segment.innerFill.style.width = '100%';
            }

            accumulatedValue = segmentMax;
        }
    }

    updateLabel() {
        let labelText = this.options.labelTemplate;
        const percentage = this.getPercentage(this.state.currentValue);
        const value = this.state.currentValue;
        const max = this.options.max;
        const min = this.options.min;

        // Replace template variables
        labelText = labelText
            .replace('{percentage}', percentage.toFixed(this.options.precision))
            .replace('{value}', value.toFixed(this.options.precision))
            .replace('{max}', max.toString())
            .replace('{min}', min.toString())
            .replace('{remaining}', (max - value).toFixed(this.options.precision));

        this.label.textContent = labelText;
    }

    /**
     * Set progress value with optional animation
     */
    setValue(value, options = {}) {
        const clampedValue = this.clampValue(value);

        if (clampedValue === this.state.currentValue) {
            return;
        }

        const config = {
            animated: this.options.animated && this.options.smooth,
            duration: this.options.animationDuration,
            easing: 'ease-out',
            ...options
        };

        this.setState({ targetValue: clampedValue });

        if (config.animated && !this.options.indeterminate) {
            this.animateToValue(clampedValue, config);
        } else {
            this.setState({ currentValue: clampedValue });
            this.render();
        }

        this.emit('progress:changed', {
            value: clampedValue,
            percentage: this.getPercentage(clampedValue),
            previous: this.state.currentValue
        });
    }

    /**
     * Animate to target value
     */
    animateToValue(targetValue, config) {
        if (this.state.isAnimating) {
            this.stopAnimation();
        }

        const startValue = this.state.currentValue;
        const startTime = performance.now();

        this.setState({
            isAnimating: true,
            animationStart: startTime,
            animationDuration: config.duration
        });

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / config.duration, 1);

            // Apply easing
            const easedProgress = this.applyEasing(progress, config.easing);

            // Calculate current value
            const currentValue = startValue + (targetValue - startValue) * easedProgress;

            this.setState({ currentValue }, { render: false });
            this.render();

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.setState({
                    currentValue: targetValue,
                    isAnimating: false
                });
                this.emit('progress:animation-complete', {
                    value: targetValue,
                    percentage: this.getPercentage(targetValue)
                });
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Stop current animation
     */
    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.setState({ isAnimating: false });
    }

    /**
     * Apply easing function
     */
    applyEasing(progress, easing) {
        switch (easing) {
            case 'linear':
                return progress;
            case 'ease-in':
                return progress * progress;
            case 'ease-out':
                return 1 - (1 - progress) * (1 - progress);
            case 'ease-in-out':
                return progress < 0.5
                    ? 2 * progress * progress
                    : 1 - 2 * (1 - progress) * (1 - progress);
            case 'bounce':
                if (progress < 1/2.75) {
                    return 7.5625 * progress * progress;
                } else if (progress < 2/2.75) {
                    return 7.5625 * (progress -= 1.5/2.75) * progress + 0.75;
                } else if (progress < 2.5/2.75) {
                    return 7.5625 * (progress -= 2.25/2.75) * progress + 0.9375;
                } else {
                    return 7.5625 * (progress -= 2.625/2.75) * progress + 0.984375;
                }
            default:
                return progress;
        }
    }

    /**
     * Increment value by amount
     */
    increment(amount = 1, options = {}) {
        const newValue = this.state.currentValue + amount;
        this.setValue(newValue, options);
    }

    /**
     * Decrement value by amount
     */
    decrement(amount = 1, options = {}) {
        const newValue = this.state.currentValue - amount;
        this.setValue(newValue, options);
    }

    /**
     * Set to minimum value
     */
    setMin(options = {}) {
        this.setValue(this.options.min, options);
    }

    /**
     * Set to maximum value
     */
    setMax(options = {}) {
        this.setValue(this.options.max, options);
    }

    /**
     * Reset to initial value
     */
    reset(options = {}) {
        this.setValue(this.options.value, options);
    }

    /**
     * Set indeterminate state
     */
    setIndeterminate(indeterminate = true) {
        this.options.indeterminate = indeterminate;
        this.element.classList.toggle('progress-indeterminate', indeterminate);

        if (indeterminate) {
            this.stopAnimation();
        }

        this.render();
    }

    /**
     * Update configuration
     */
    updateConfig(options) {
        const oldMax = this.options.max;
        const oldMin = this.options.min;

        this.options = { ...this.options, ...options };

        // Update ARIA attributes if min/max changed
        if (options.min !== undefined) {
            this.element.setAttribute('aria-valuemin', this.options.min);
        }

        if (options.max !== undefined) {
            this.element.setAttribute('aria-valuemax', this.options.max);
        }

        // Adjust current value if range changed
        if (options.min !== undefined || options.max !== undefined) {
            const clampedValue = this.clampValue(this.state.currentValue);
            if (clampedValue !== this.state.currentValue) {
                this.setState({ currentValue: clampedValue });
            }
        }

        // Update appearance classes
        if (options.variant) {
            this.element.className = this.element.className.replace(/progress-\w+/g, '');
            this.element.classList.add(`progress-${options.variant}`);
        }

        if (options.striped !== undefined) {
            this.fill.classList.toggle('progress-striped', options.striped);
        }

        if (options.animated !== undefined) {
            this.fill.classList.toggle('progress-animated', options.animated);
        }

        if (options.gradient !== undefined) {
            this.fill.classList.toggle('progress-gradient', options.gradient);
        }

        if (options.pulse !== undefined) {
            this.fill.classList.toggle('progress-pulse', options.pulse);
        }

        this.render();
    }

    /**
     * Get current value
     */
    getValue() {
        return this.state.currentValue;
    }

    /**
     * Get percentage of completion
     */
    getPercentage(value = this.state.currentValue) {
        if (this.options.max === this.options.min) {
            return 100;
        }
        return ((value - this.options.min) / (this.options.max - this.options.min)) * 100;
    }

    /**
     * Check if progress is complete
     */
    isComplete() {
        return this.state.currentValue >= this.options.max;
    }

    /**
     * Check if currently animating
     */
    isAnimating() {
        return this.state.isAnimating;
    }

    /**
     * Clamp value to valid range
     */
    clampValue(value) {
        return Math.max(this.options.min, Math.min(this.options.max, value));
    }

    /**
     * Add pulse effect
     */
    pulse(duration = 1000) {
        this.element.classList.add('progress-pulse-effect');
        setTimeout(() => {
            this.element.classList.remove('progress-pulse-effect');
        }, duration);
    }

    /**
     * Flash effect for notifications
     */
    flash(variant = 'success', duration = 500) {
        const originalVariant = this.options.variant;
        this.updateConfig({ variant });

        setTimeout(() => {
            this.updateConfig({ variant: originalVariant });
        }, duration);
    }

    onDestroy() {
        this.stopAnimation();
    }

    /**
     * Static factory method for quick creation
     */
    static create(container, options = {}) {
        return new ProgressBar(container, options);
    }

    /**
     * Static method for countdown progress bar
     */
    static countdown(container, seconds, options = {}) {
        const progressBar = new ProgressBar(container, {
            ...options,
            value: 100,
            animated: true,
            labelTemplate: '{remaining}s remaining'
        });

        const interval = setInterval(() => {
            const remaining = progressBar.getValue() - (100 / seconds);
            if (remaining <= 0) {
                clearInterval(interval);
                progressBar.setValue(0);
                if (options.onComplete) {
                    options.onComplete();
                }
            } else {
                progressBar.setValue(remaining);
            }
        }, 1000);

        return progressBar;
    }

    /**
     * Static method for loading progress simulation
     */
    static loading(container, options = {}) {
        const progressBar = new ProgressBar(container, {
            ...options,
            value: 0,
            indeterminate: false,
            animated: true
        });

        let progress = 0;
        const increment = Math.random() * 10 + 5; // 5-15% increments

        const simulate = () => {
            progress += Math.random() * increment;
            if (progress >= 100) {
                progressBar.setValue(100);
                if (options.onComplete) {
                    options.onComplete();
                }
            } else {
                progressBar.setValue(progress);
                setTimeout(simulate, Math.random() * 500 + 200); // 200-700ms intervals
            }
        };

        simulate();
        return progressBar;
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressBar };
} else if (typeof window !== 'undefined') {
    window.ProgressBar = ProgressBar;
}