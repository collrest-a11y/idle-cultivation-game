/**
 * Modal - Accessible modal dialog component with focus management
 * Extends BaseComponent with modal-specific functionality
 */
class Modal extends BaseComponent {
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            className: 'modal',
            backdrop: true,
            closeOnEscape: true,
            closeOnBackdrop: true,
            focusOnOpen: true,
            restoreFocus: true,
            animated: true,
            size: 'medium', // small, medium, large, fullscreen
            position: 'center', // center, top, bottom
            destroyOnClose: false,
            autoShow: false,
            maxWidth: null,
            maxHeight: null,
            padding: true,
            scrollable: false
        };
    }

    getInitialState() {
        return {
            isOpen: false,
            isAnimating: false,
            previousFocus: null
        };
    }

    createElement() {
        // Create modal container
        this.element = document.createElement('div');
        this.element.className = `modal ${this.options.className}`;
        this.element.id = this.id;

        // Set initial state
        this.element.style.display = 'none';
        this.element.style.position = 'fixed';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.zIndex = '1000';

        // ARIA attributes
        this.element.setAttribute('role', 'dialog');
        this.element.setAttribute('aria-modal', 'true');
        this.element.setAttribute('aria-hidden', 'true');

        if (this.options.title) {
            this.element.setAttribute('aria-labelledby', `${this.id}-title`);
        }

        // Create backdrop
        if (this.options.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'modal-backdrop';
            this.element.appendChild(this.backdrop);
        }

        // Create dialog container
        this.dialog = document.createElement('div');
        this.dialog.className = `modal-dialog modal-${this.options.size}`;
        this.element.appendChild(this.dialog);

        // Create content container
        this.content = document.createElement('div');
        this.content.className = 'modal-content';
        this.dialog.appendChild(this.content);

        // Create header if title provided
        if (this.options.title || this.options.showCloseButton !== false) {
            this.createHeader();
        }

        // Create body
        this.body = document.createElement('div');
        this.body.className = 'modal-body';
        this.content.appendChild(this.body);

        // Create footer if buttons provided
        if (this.options.buttons && this.options.buttons.length > 0) {
            this.createFooter();
        }

        // Apply size and position classes
        this.dialog.classList.add(`modal-position-${this.options.position}`);

        if (this.options.maxWidth) {
            this.dialog.style.maxWidth = this.options.maxWidth;
        }

        if (this.options.maxHeight) {
            this.dialog.style.maxHeight = this.options.maxHeight;
        }

        if (this.options.scrollable) {
            this.content.classList.add('modal-scrollable');
        }

        if (!this.options.padding) {
            this.body.classList.add('modal-body-no-padding');
        }

        // Auto show if requested
        if (this.options.autoShow) {
            setTimeout(() => this.show(), 0);
        }
    }

    createHeader() {
        this.header = document.createElement('div');
        this.header.className = 'modal-header';
        this.content.appendChild(this.header);

        // Title
        if (this.options.title) {
            this.titleElement = document.createElement('h2');
            this.titleElement.className = 'modal-title';
            this.titleElement.id = `${this.id}-title`;
            this.titleElement.textContent = this.options.title;
            this.header.appendChild(this.titleElement);
        }

        // Close button
        if (this.options.showCloseButton !== false) {
            this.closeButton = document.createElement('button');
            this.closeButton.className = 'modal-close';
            this.closeButton.innerHTML = '&times;';
            this.closeButton.setAttribute('aria-label', 'Close modal');
            this.closeButton.type = 'button';
            this.header.appendChild(this.closeButton);
        }
    }

    createFooter() {
        this.footer = document.createElement('div');
        this.footer.className = 'modal-footer';
        this.content.appendChild(this.footer);

        // Create buttons
        this.buttons = [];
        for (const buttonConfig of this.options.buttons) {
            const button = document.createElement('button');
            button.className = `btn ${buttonConfig.className || 'btn-secondary'}`;
            button.textContent = buttonConfig.text;
            button.type = 'button';

            if (buttonConfig.id) {
                button.id = buttonConfig.id;
            }

            if (buttonConfig.disabled) {
                button.disabled = true;
            }

            // Add click handler
            if (buttonConfig.onClick) {
                button.addEventListener('click', (e) => {
                    buttonConfig.onClick.call(this, e, this);
                });
            }

            // Auto-close button
            if (buttonConfig.autoClose !== false) {
                button.addEventListener('click', () => {
                    this.close();
                });
            }

            this.footer.appendChild(button);
            this.buttons.push(button);
        }
    }

    render() {
        // Update content if provided
        if (this.options.content) {
            if (typeof this.options.content === 'string') {
                this.body.innerHTML = this.options.content;
            } else if (this.options.content instanceof HTMLElement) {
                this.body.innerHTML = '';
                this.body.appendChild(this.options.content);
            }
        }

        // Update title if changed
        if (this.titleElement && this.options.title) {
            this.titleElement.textContent = this.options.title;
        }
    }

    setupEventListeners() {
        // Close button
        if (this.closeButton) {
            this.addEventListener('click', (e) => {
                if (e.target === this.closeButton) {
                    this.close();
                }
            });
        }

        // Backdrop click
        if (this.backdrop && this.options.closeOnBackdrop) {
            this.addEventListener('click', (e) => {
                if (e.target === this.backdrop || e.target === this.element) {
                    this.close();
                }
            });
        }

        // Escape key
        if (this.options.closeOnEscape) {
            this.escapeHandler = (e) => {
                if (e.key === 'Escape' && this.state.isOpen) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this.escapeHandler);
        }

        // Focus trap
        this.focusHandler = (e) => {
            if (this.state.isOpen && e.key === 'Tab') {
                this.handleFocusTrap(e);
            }
        };
        document.addEventListener('keydown', this.focusHandler);
    }

    /**
     * Show the modal
     */
    async show() {
        if (this.state.isOpen || this.state.isAnimating) {
            return;
        }

        this.setState({ isAnimating: true });

        // Store current focus
        if (this.options.restoreFocus) {
            this.setState({ previousFocus: document.activeElement });
        }

        // Show element
        this.element.style.display = 'flex';
        this.element.setAttribute('aria-hidden', 'false');

        // Register with UI Manager
        if (this.options.uiManager) {
            this.options.uiManager.registerModal(this);
        }

        // Trigger animation
        if (this.options.animated) {
            this.element.classList.add('modal-show');

            // Wait for animation
            await this.waitForAnimation();
        }

        this.setState({
            isOpen: true,
            isAnimating: false
        }, { render: false });

        // Focus management
        if (this.options.focusOnOpen) {
            this.focusFirstElement();
        }

        // Emit events
        this.emit('modal:shown', { modalId: this.id });
        this.onShow();

        // Prevent body scroll
        if (this.options.backdrop) {
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide the modal
     */
    async hide() {
        if (!this.state.isOpen || this.state.isAnimating) {
            return;
        }

        this.setState({ isAnimating: true });

        // Trigger animation
        if (this.options.animated) {
            this.element.classList.add('modal-hide');
            this.element.classList.remove('modal-show');

            // Wait for animation
            await this.waitForAnimation();
        }

        // Hide element
        this.element.style.display = 'none';
        this.element.setAttribute('aria-hidden', 'true');
        this.element.classList.remove('modal-hide');

        this.setState({
            isOpen: false,
            isAnimating: false
        }, { render: false });

        // Restore focus
        if (this.options.restoreFocus && this.state.previousFocus) {
            this.state.previousFocus.focus();
            this.setState({ previousFocus: null }, { render: false });
        }

        // Unregister with UI Manager
        if (this.options.uiManager) {
            this.options.uiManager.unregisterModal(this);
        }

        // Restore body scroll
        if (this.options.backdrop) {
            document.body.style.overflow = '';
        }

        // Emit events
        this.emit('modal:hidden', { modalId: this.id });
        this.onHide();

        // Auto destroy if configured
        if (this.options.destroyOnClose) {
            this.destroy();
        }
    }

    /**
     * Close the modal (alias for hide)
     */
    close() {
        return this.hide();
    }

    /**
     * Toggle modal visibility
     */
    toggle() {
        return this.state.isOpen ? this.hide() : this.show();
    }

    /**
     * Set modal content
     */
    setContent(content) {
        this.options.content = content;
        this.render();
    }

    /**
     * Set modal title
     */
    setTitle(title) {
        this.options.title = title;
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
    }

    /**
     * Add button to footer
     */
    addButton(buttonConfig) {
        if (!this.footer) {
            this.createFooter();
        }

        const button = document.createElement('button');
        button.className = `btn ${buttonConfig.className || 'btn-secondary'}`;
        button.textContent = buttonConfig.text;
        button.type = 'button';

        if (buttonConfig.onClick) {
            button.addEventListener('click', (e) => {
                buttonConfig.onClick.call(this, e, this);
            });
        }

        if (buttonConfig.autoClose !== false) {
            button.addEventListener('click', () => this.close());
        }

        this.footer.appendChild(button);
        this.buttons.push(button);

        return button;
    }

    /**
     * Focus first focusable element
     */
    focusFirstElement() {
        const focusableElements = this.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Handle focus trap for accessibility
     */
    handleFocusTrap(e) {
        const focusableElements = this.element.querySelectorAll(
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
     * Wait for CSS animation to complete
     */
    waitForAnimation() {
        return new Promise((resolve) => {
            const onAnimationEnd = () => {
                this.element.removeEventListener('animationend', onAnimationEnd);
                this.element.removeEventListener('transitionend', onAnimationEnd);
                resolve();
            };

            this.element.addEventListener('animationend', onAnimationEnd);
            this.element.addEventListener('transitionend', onAnimationEnd);

            // Fallback timeout
            setTimeout(resolve, 300);
        });
    }

    /**
     * Check if modal is open
     */
    isOpen() {
        return this.state.isOpen;
    }

    /**
     * Check if modal is animating
     */
    isAnimating() {
        return this.state.isAnimating;
    }

    onDestroy() {
        // Remove global event listeners
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
        }

        if (this.focusHandler) {
            document.removeEventListener('keydown', this.focusHandler);
        }

        // Restore body scroll if needed
        if (this.state.isOpen && this.options.backdrop) {
            document.body.style.overflow = '';
        }

        // Unregister from UI Manager
        if (this.options.uiManager && this.state.isOpen) {
            this.options.uiManager.unregisterModal(this);
        }
    }

    /**
     * Static factory method for quick modal creation
     */
    static create(options = {}) {
        const container = document.body;
        return new Modal(container, options);
    }

    /**
     * Static method for simple alert modal
     */
    static alert(message, title = 'Alert') {
        return Modal.create({
            title: title,
            content: message,
            buttons: [
                { text: 'OK', className: 'btn-primary' }
            ],
            autoShow: true,
            destroyOnClose: true
        });
    }

    /**
     * Static method for confirmation modal
     */
    static confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            Modal.create({
                title: title,
                content: message,
                buttons: [
                    {
                        text: 'Cancel',
                        className: 'btn-secondary',
                        onClick: () => resolve(false)
                    },
                    {
                        text: 'OK',
                        className: 'btn-primary',
                        onClick: () => resolve(true)
                    }
                ],
                autoShow: true,
                destroyOnClose: true,
                closeOnBackdrop: false
            });
        });
    }

    /**
     * Static method for prompt modal
     */
    static prompt(message, defaultValue = '', title = 'Input') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control';
            input.value = defaultValue;
            input.placeholder = message;

            const container = document.createElement('div');
            if (message) {
                const label = document.createElement('label');
                label.textContent = message;
                label.className = 'form-label';
                container.appendChild(label);
            }
            container.appendChild(input);

            const modal = Modal.create({
                title: title,
                content: container,
                buttons: [
                    {
                        text: 'Cancel',
                        className: 'btn-secondary',
                        onClick: () => resolve(null)
                    },
                    {
                        text: 'OK',
                        className: 'btn-primary',
                        onClick: () => resolve(input.value)
                    }
                ],
                autoShow: true,
                destroyOnClose: true,
                closeOnBackdrop: false,
                focusOnOpen: true
            });

            // Focus input after modal is shown
            modal.on('modal:shown', () => {
                input.focus();
                input.select();
            });

            // Submit on Enter
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    resolve(input.value);
                    modal.close();
                }
            });
        });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Modal };
} else if (typeof window !== 'undefined') {
    window.Modal = Modal;
}