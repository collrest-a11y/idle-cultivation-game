/**
 * Button - Enhanced button component with states, animations, and accessibility
 * Extends BaseComponent with button-specific functionality
 */
class Button extends BaseComponent {
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'btn',
            text: '',
            type: 'button', // button, submit, reset
            variant: 'primary', // primary, secondary, success, warning, danger, info, light, dark
            size: 'medium', // small, medium, large
            disabled: false,
            loading: false,
            icon: null,
            iconPosition: 'left', // left, right, top, bottom
            tooltip: null,
            ripple: true,
            outline: false,
            rounded: false,
            block: false, // Full width
            pressed: false, // Toggle button state
            badge: null,
            confirmText: null, // Show confirmation dialog
            cooldown: 0, // Cooldown in milliseconds
            hotkey: null, // Keyboard shortcut
            loadingText: 'Loading...',
            iconOnly: false,
            animate: true
        };
    }

    getInitialState() {
        return {
            isPressed: this.options.pressed,
            isLoading: this.options.loading,
            isDisabled: this.options.disabled,
            cooldownRemaining: 0,
            isCooldownActive: false,
            ripples: []
        };
    }

    createElement() {
        // Create button element
        this.element = document.createElement('button');
        this.element.type = this.options.type;
        this.element.className = this.buildClassName();
        this.element.id = this.id;

        // Set initial disabled state
        this.element.disabled = this.state.isDisabled || this.state.isLoading;

        // ARIA attributes
        this.element.setAttribute('role', 'button');

        if (this.options.pressed !== null) {
            this.element.setAttribute('aria-pressed', this.state.isPressed.toString());
        }

        if (this.options.tooltip) {
            this.element.setAttribute('aria-describedby', `${this.id}-tooltip`);
        }

        // Create button content
        this.createContent();

        // Create tooltip if specified
        if (this.options.tooltip) {
            this.createTooltip();
        }

        // Create badge if specified
        if (this.options.badge) {
            this.createBadge();
        }

        // Setup hotkey
        if (this.options.hotkey) {
            this.setupHotkey();
        }
    }

    buildClassName() {
        const classes = [
            this.options.className,
            `btn-${this.options.variant}`,
            `btn-${this.options.size}`
        ];

        if (this.options.outline) {
            classes.push('btn-outline');
        }

        if (this.options.rounded) {
            classes.push('btn-rounded');
        }

        if (this.options.block) {
            classes.push('btn-block');
        }

        if (this.options.iconOnly) {
            classes.push('btn-icon-only');
        }

        if (this.state.isPressed) {
            classes.push('btn-pressed');
        }

        if (this.state.isLoading) {
            classes.push('btn-loading');
        }

        if (this.state.isCooldownActive) {
            classes.push('btn-cooldown');
        }

        return classes.filter(Boolean).join(' ');
    }

    createContent() {
        // Clear existing content
        this.element.innerHTML = '';

        // Create content wrapper
        this.contentWrapper = document.createElement('span');
        this.contentWrapper.className = 'btn-content';

        // Loading spinner
        if (this.state.isLoading) {
            this.createLoadingSpinner();
        }

        // Icon
        if (this.options.icon && (this.options.iconPosition === 'left' || this.options.iconPosition === 'top')) {
            this.createIcon();
        }

        // Text
        if (this.options.text && !this.options.iconOnly) {
            this.createText();
        }

        // Icon (right/bottom position)
        if (this.options.icon && (this.options.iconPosition === 'right' || this.options.iconPosition === 'bottom')) {
            this.createIcon();
        }

        this.element.appendChild(this.contentWrapper);

        // Ripple container
        if (this.options.ripple) {
            this.rippleContainer = document.createElement('span');
            this.rippleContainer.className = 'btn-ripple-container';
            this.element.appendChild(this.rippleContainer);
        }
    }

    createIcon() {
        this.iconElement = document.createElement('span');
        this.iconElement.className = `btn-icon ${this.options.icon} icon-${this.options.iconPosition}`;
        this.contentWrapper.appendChild(this.iconElement);
    }

    createText() {
        this.textElement = document.createElement('span');
        this.textElement.className = 'btn-text';
        this.textElement.textContent = this.state.isLoading ? this.options.loadingText : this.options.text;
        this.contentWrapper.appendChild(this.textElement);
    }

    createLoadingSpinner() {
        this.spinnerElement = document.createElement('span');
        this.spinnerElement.className = 'btn-spinner';
        this.spinnerElement.innerHTML = '<span class="spinner"></span>';
        this.contentWrapper.appendChild(this.spinnerElement);
    }

    createTooltip() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'btn-tooltip';
        this.tooltipElement.id = `${this.id}-tooltip`;
        this.tooltipElement.textContent = this.options.tooltip;
        this.tooltipElement.setAttribute('role', 'tooltip');
        this.element.appendChild(this.tooltipElement);
    }

    createBadge() {
        this.badgeElement = document.createElement('span');
        this.badgeElement.className = 'btn-badge';
        this.badgeElement.textContent = this.options.badge;
        this.element.appendChild(this.badgeElement);
    }

    render() {
        // Update class name
        this.element.className = this.buildClassName();

        // Update disabled state
        this.element.disabled = this.state.isDisabled || this.state.isLoading || this.state.isCooldownActive;

        // Update ARIA attributes
        if (this.options.pressed !== null) {
            this.element.setAttribute('aria-pressed', this.state.isPressed.toString());
        }

        // Update content
        this.createContent();

        // Update badge
        if (this.badgeElement && this.options.badge) {
            this.badgeElement.textContent = this.options.badge;
        }

        // Update cooldown display
        if (this.state.isCooldownActive && this.state.cooldownRemaining > 0) {
            this.showCooldownProgress();
        }
    }

    setupEventListeners() {
        // Click handler
        this.addEventListener('click', this.handleClick.bind(this));

        // Ripple effect
        if (this.options.ripple) {
            this.addEventListener('mousedown', this.handleRipple.bind(this));
            this.addEventListener('touchstart', this.handleRipple.bind(this));
        }

        // Tooltip handlers
        if (this.tooltipElement) {
            this.addEventListener('mouseenter', this.showTooltip.bind(this));
            this.addEventListener('mouseleave', this.hideTooltip.bind(this));
            this.addEventListener('focus', this.showTooltip.bind(this));
            this.addEventListener('blur', this.hideTooltip.bind(this));
        }

        // Keyboard support
        this.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    setupHotkey() {
        if (!this.options.hotkey) return;

        this.hotkeyHandler = (e) => {
            if (this.matchesHotkey(e, this.options.hotkey)) {
                e.preventDefault();
                this.click();
            }
        };

        document.addEventListener('keydown', this.hotkeyHandler);
    }

    matchesHotkey(event, hotkey) {
        const keys = hotkey.toLowerCase().split('+');
        const modifiers = {
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey,
            meta: event.metaKey
        };

        // Check modifiers
        for (const key of keys) {
            if (key === 'ctrl' && !modifiers.ctrl) return false;
            if (key === 'alt' && !modifiers.alt) return false;
            if (key === 'shift' && !modifiers.shift) return false;
            if (key === 'meta' && !modifiers.meta) return false;
        }

        // Check main key
        const mainKey = keys[keys.length - 1];
        return event.key.toLowerCase() === mainKey || event.code.toLowerCase() === mainKey;
    }

    async handleClick(e) {
        if (this.state.isDisabled || this.state.isLoading || this.state.isCooldownActive) {
            e.preventDefault();
            return;
        }

        // Confirmation dialog
        if (this.options.confirmText) {
            const confirmed = await this.showConfirmation();
            if (!confirmed) {
                return;
            }
        }

        // Toggle pressed state if it's a toggle button
        if (this.options.pressed !== null) {
            this.setState({ isPressed: !this.state.isPressed });
        }

        // Start cooldown if specified
        if (this.options.cooldown > 0) {
            this.startCooldown();
        }

        // Emit click event
        this.emit('button:click', {
            buttonId: this.id,
            pressed: this.state.isPressed,
            disabled: this.state.isDisabled
        });

        // Call onClick handler if provided
        if (this.options.onClick) {
            try {
                await this.options.onClick.call(this, e);
            } catch (error) {
                console.error('Button onClick error:', error);
            }
        }
    }

    handleKeydown(e) {
        // Space and Enter should trigger click
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.click();
        }
    }

    handleRipple(e) {
        if (!this.rippleContainer || this.state.isDisabled) return;

        const rect = this.element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = (e.clientX || e.touches[0].clientX) - rect.left - size / 2;
        const y = (e.clientY || e.touches[0].clientY) - rect.top - size / 2;

        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        this.rippleContainer.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    showTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.opacity = '1';
            this.tooltipElement.style.visibility = 'visible';
        }
    }

    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.opacity = '0';
            this.tooltipElement.style.visibility = 'hidden';
        }
    }

    async showConfirmation() {
        if (window.Modal) {
            return await Modal.confirm(this.options.confirmText, 'Confirm Action');
        } else {
            return confirm(this.options.confirmText);
        }
    }

    startCooldown() {
        this.setState({
            isCooldownActive: true,
            cooldownRemaining: this.options.cooldown
        });

        const startTime = Date.now();
        const updateCooldown = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, this.options.cooldown - elapsed);

            this.setState({ cooldownRemaining: remaining });

            if (remaining > 0) {
                this.cooldownTimer = requestAnimationFrame(updateCooldown);
            } else {
                this.setState({ isCooldownActive: false });
                this.emit('button:cooldown-complete', { buttonId: this.id });
            }
        };

        this.cooldownTimer = requestAnimationFrame(updateCooldown);
    }

    showCooldownProgress() {
        if (!this.cooldownProgressElement) {
            this.cooldownProgressElement = document.createElement('div');
            this.cooldownProgressElement.className = 'btn-cooldown-progress';
            this.element.appendChild(this.cooldownProgressElement);
        }

        const progress = (this.options.cooldown - this.state.cooldownRemaining) / this.options.cooldown;
        this.cooldownProgressElement.style.width = `${progress * 100}%`;
    }

    /**
     * Set button text
     */
    setText(text) {
        this.options.text = text;
        if (this.textElement) {
            this.textElement.textContent = text;
        }
    }

    /**
     * Set button icon
     */
    setIcon(icon) {
        this.options.icon = icon;
        this.render();
    }

    /**
     * Set loading state
     */
    setLoading(loading = true) {
        this.setState({ isLoading: loading });
        this.render();
    }

    /**
     * Set disabled state
     */
    setDisabled(disabled = true) {
        this.setState({ isDisabled: disabled });
        this.render();
    }

    /**
     * Set pressed state (for toggle buttons)
     */
    setPressed(pressed = true) {
        if (this.options.pressed !== null) {
            this.setState({ isPressed: pressed });
            this.render();
        }
    }

    /**
     * Toggle pressed state
     */
    toggle() {
        this.setPressed(!this.state.isPressed);
    }

    /**
     * Update badge
     */
    setBadge(badge) {
        this.options.badge = badge;
        if (badge && !this.badgeElement) {
            this.createBadge();
        } else if (!badge && this.badgeElement) {
            this.badgeElement.remove();
            this.badgeElement = null;
        } else if (this.badgeElement) {
            this.badgeElement.textContent = badge;
        }
    }

    /**
     * Update variant
     */
    setVariant(variant) {
        this.options.variant = variant;
        this.render();
    }

    /**
     * Programmatically click the button
     */
    click() {
        if (!this.state.isDisabled && !this.state.isLoading && !this.state.isCooldownActive) {
            this.element.click();
        }
    }

    /**
     * Flash effect
     */
    flash(variant = 'success', duration = 500) {
        const originalVariant = this.options.variant;
        this.setVariant(variant);

        setTimeout(() => {
            this.setVariant(originalVariant);
        }, duration);
    }

    /**
     * Pulse animation
     */
    pulse(count = 1) {
        let pulseCount = 0;
        const doPulse = () => {
            this.element.classList.add('btn-pulse');
            setTimeout(() => {
                this.element.classList.remove('btn-pulse');
                pulseCount++;
                if (pulseCount < count) {
                    setTimeout(doPulse, 100);
                }
            }, 300);
        };
        doPulse();
    }

    /**
     * Check if button is enabled
     */
    isEnabled() {
        return !this.state.isDisabled && !this.state.isLoading && !this.state.isCooldownActive;
    }

    /**
     * Check if button is loading
     */
    isLoading() {
        return this.state.isLoading;
    }

    /**
     * Check if button is pressed (for toggle buttons)
     */
    isPressed() {
        return this.state.isPressed;
    }

    onDestroy() {
        // Clean up cooldown timer
        if (this.cooldownTimer) {
            cancelAnimationFrame(this.cooldownTimer);
        }

        // Remove hotkey listener
        if (this.hotkeyHandler) {
            document.removeEventListener('keydown', this.hotkeyHandler);
        }

        // Remove cooldown progress element
        if (this.cooldownProgressElement) {
            this.cooldownProgressElement.remove();
        }
    }

    /**
     * Static factory methods
     */
    static create(container, options = {}) {
        return new Button(container, options);
    }

    static primary(container, text, onClick) {
        return Button.create(container, {
            text,
            variant: 'primary',
            onClick
        });
    }

    static secondary(container, text, onClick) {
        return Button.create(container, {
            text,
            variant: 'secondary',
            onClick
        });
    }

    static danger(container, text, onClick) {
        return Button.create(container, {
            text,
            variant: 'danger',
            onClick
        });
    }

    static icon(container, icon, onClick) {
        return Button.create(container, {
            icon,
            iconOnly: true,
            onClick
        });
    }

    static toggle(container, text, pressed = false) {
        return Button.create(container, {
            text,
            pressed,
            variant: 'secondary'
        });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Button };
} else if (typeof window !== 'undefined') {
    window.Button = Button;
}