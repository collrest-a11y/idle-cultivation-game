/**
 * LoadingProgress - Visual component for displaying progressive loading status
 * Shows phase-based progress with detailed module loading feedback
 */
class LoadingProgress {
    constructor(containerElement) {
        this.container = containerElement;
        this.progressiveLoader = null;
        this.eventManager = null;

        // UI elements (will be created)
        this.loadingOverlay = null;
        this.progressBar = null;
        this.phaseIndicator = null;
        this.moduleList = null;
        this.statusText = null;
        this.phaseList = null;

        // Animation state
        this.animationFrame = null;
        this.dotCount = 0;
        this.lastDotUpdate = 0;

        // Visibility state
        this.isVisible = false;
    }

    /**
     * Initialize the loading progress UI
     * @param {Object} systems - Core system references
     */
    initialize(systems) {
        this.progressiveLoader = systems.progressiveLoader;
        this.eventManager = systems.eventManager;

        // Create UI elements
        this._createLoadingUI();

        // Set up event listeners if we have an event manager
        if (this.eventManager) {
            this._setupEventListeners();
        }

        // Set up progressive loader callbacks
        if (this.progressiveLoader) {
            this.progressiveLoader.setCallbacks({
                onPhaseStart: (data) => this._onPhaseStart(data),
                onPhaseComplete: (data) => this._onPhaseComplete(data),
                onModuleLoaded: (data) => this._onModuleLoaded(data),
                onModuleFailed: (data) => this._onModuleFailed(data),
                onComplete: (data) => this._onComplete(data),
                onError: (error) => this._onError(error)
            });
        }
    }

    /**
     * Show the loading UI
     */
    show() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            this.isVisible = true;
            this._startAnimation();
        }
    }

    /**
     * Hide the loading UI
     */
    hide() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
            this.isVisible = false;
            this._stopAnimation();
        }
    }

    /**
     * Update progress display
     * @param {number} progress - Progress value (0-1)
     * @param {string} text - Status text
     */
    updateProgress(progress, text) {
        if (this.progressBar) {
            const percentage = Math.round(progress * 100);
            this.progressBar.style.width = `${percentage}%`;
            this.progressBar.setAttribute('aria-valuenow', percentage);
            this.progressBar.textContent = `${percentage}%`;
        }

        if (this.statusText && text) {
            this.statusText.textContent = text;
        }
    }

    /**
     * Create the loading UI elements
     * @private
     */
    _createLoadingUI() {
        // Create overlay
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.setAttribute('role', 'dialog');
        this.loadingOverlay.setAttribute('aria-label', 'Game Loading');

        // Create loading content container
        const loadingContent = document.createElement('div');
        loadingContent.className = 'loading-content';

        // Title
        const title = document.createElement('h2');
        title.className = 'loading-title';
        title.textContent = 'Idle Cultivation Game';
        loadingContent.appendChild(title);

        // Subtitle
        const subtitle = document.createElement('p');
        subtitle.className = 'loading-subtitle';
        subtitle.textContent = 'Initializing...';
        loadingContent.appendChild(subtitle);

        // Phase indicators
        this.phaseList = document.createElement('div');
        this.phaseList.className = 'phase-list';
        loadingContent.appendChild(this.phaseList);

        // Progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';

        const progressBarOuter = document.createElement('div');
        progressBarOuter.className = 'progress-bar-outer';
        progressBarOuter.setAttribute('role', 'progressbar');
        progressBarOuter.setAttribute('aria-valuemin', '0');
        progressBarOuter.setAttribute('aria-valuemax', '100');
        progressBarOuter.setAttribute('aria-valuenow', '0');

        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar-inner';
        this.progressBar.style.width = '0%';
        this.progressBar.textContent = '0%';

        progressBarOuter.appendChild(this.progressBar);
        progressContainer.appendChild(progressBarOuter);
        loadingContent.appendChild(progressContainer);

        // Status text
        this.statusText = document.createElement('p');
        this.statusText.className = 'loading-status';
        this.statusText.textContent = 'Preparing to load...';
        this.statusText.setAttribute('aria-live', 'polite');
        loadingContent.appendChild(this.statusText);

        // Phase indicator (current phase details)
        this.phaseIndicator = document.createElement('div');
        this.phaseIndicator.className = 'phase-indicator';
        loadingContent.appendChild(this.phaseIndicator);

        // Module list (detailed loading info)
        this.moduleList = document.createElement('div');
        this.moduleList.className = 'module-list';
        loadingContent.appendChild(this.moduleList);

        // Assemble and add to container
        this.loadingOverlay.appendChild(loadingContent);
        this.container.appendChild(this.loadingOverlay);

        // Initially hidden
        this.loadingOverlay.style.display = 'none';

        // Add styles
        this._injectStyles();
    }

    /**
     * Set up event listeners for progressive loader
     * @private
     */
    _setupEventListeners() {
        // Listen for organized event to set up phase indicators
        this.eventManager.on('progressiveLoader:organized', (data) => {
            this._createPhaseIndicators(data.phases);
        });
    }

    /**
     * Create phase indicator elements
     * @private
     */
    _createPhaseIndicators(phases) {
        this.phaseList.innerHTML = '';

        Object.entries(phases).forEach(([phaseKey, phaseConfig]) => {
            const phaseItem = document.createElement('div');
            phaseItem.className = 'phase-item';
            phaseItem.dataset.phase = phaseKey;

            const phaseIcon = document.createElement('span');
            phaseIcon.className = 'phase-icon';
            phaseIcon.textContent = '○'; // Pending

            const phaseName = document.createElement('span');
            phaseName.className = 'phase-name';
            phaseName.textContent = phaseConfig.name;

            const phaseCount = document.createElement('span');
            phaseCount.className = 'phase-count';
            phaseCount.textContent = `(${phaseConfig.modules.length} modules)`;

            phaseItem.appendChild(phaseIcon);
            phaseItem.appendChild(phaseName);
            phaseItem.appendChild(phaseCount);

            this.phaseList.appendChild(phaseItem);
        });
    }

    /**
     * Phase start callback
     * @private
     */
    _onPhaseStart(data) {
        // Update phase indicator
        if (this.phaseIndicator) {
            this.phaseIndicator.innerHTML = `
                <h3>${data.name}</h3>
                <p>${data.description}</p>
                <p class="phase-modules">Loading ${data.moduleCount} modules...</p>
            `;
        }

        // Update phase list item
        const phaseItem = this.phaseList?.querySelector(`[data-phase="${data.phase}"]`);
        if (phaseItem) {
            phaseItem.classList.add('active');
            const icon = phaseItem.querySelector('.phase-icon');
            if (icon) {
                icon.textContent = '◐'; // Loading
            }
        }

        // Update overall progress
        this.updateProgress(data.progress, data.description);
    }

    /**
     * Phase complete callback
     * @private
     */
    _onPhaseComplete(data) {
        // Update phase list item
        const phaseItem = this.phaseList?.querySelector(`[data-phase="${data.phase}"]`);
        if (phaseItem) {
            phaseItem.classList.remove('active');
            phaseItem.classList.add('complete');
            const icon = phaseItem.querySelector('.phase-icon');
            if (icon) {
                icon.textContent = '●'; // Complete
            }
        }

        // Update overall progress
        this.updateProgress(data.progress, `${data.results.loaded.length} modules loaded`);
    }

    /**
     * Module loaded callback
     * @private
     */
    _onModuleLoaded(data) {
        // Add to module list
        if (this.moduleList) {
            const moduleItem = document.createElement('div');
            moduleItem.className = 'module-item success';
            moduleItem.textContent = `✓ ${data.moduleName}`;
            this.moduleList.appendChild(moduleItem);

            // Keep only last 5 items
            while (this.moduleList.children.length > 5) {
                this.moduleList.removeChild(this.moduleList.firstChild);
            }
        }

        // Update progress
        this.updateProgress(data.progress, `Loaded ${data.moduleName}...`);
    }

    /**
     * Module failed callback
     * @private
     */
    _onModuleFailed(data) {
        // Add to module list
        if (this.moduleList) {
            const moduleItem = document.createElement('div');
            moduleItem.className = 'module-item error';
            moduleItem.textContent = `✗ ${data.moduleName} - ${data.error}`;
            this.moduleList.appendChild(moduleItem);

            // Keep only last 5 items
            while (this.moduleList.children.length > 5) {
                this.moduleList.removeChild(this.moduleList.firstChild);
            }
        }

        // Update status
        if (!data.required) {
            this.updateProgress(null, `Failed: ${data.moduleName} (non-critical)`);
        }
    }

    /**
     * Loading complete callback
     * @private
     */
    _onComplete(data) {
        this.updateProgress(1, 'Loading complete!');

        // Show completion message briefly
        if (this.phaseIndicator) {
            this.phaseIndicator.innerHTML = `
                <h3>✓ Loading Complete</h3>
                <p>Loaded ${data.loadedModules} modules in ${data.totalTime.toFixed(0)}ms</p>
                ${data.failedModules > 0 ? `<p class="warning">${data.failedModules} non-critical modules failed</p>` : ''}
            `;
        }

        // Hide after a short delay
        setTimeout(() => {
            this.hide();
        }, 1000);
    }

    /**
     * Error callback
     * @private
     */
    _onError(error) {
        if (this.phaseIndicator) {
            this.phaseIndicator.innerHTML = `
                <h3>✗ Loading Failed</h3>
                <p class="error">${error.message}</p>
                <p>Please refresh the page to try again.</p>
            `;
        }

        if (this.statusText) {
            this.statusText.textContent = 'Loading failed';
            this.statusText.className = 'loading-status error';
        }
    }

    /**
     * Start animation loop for loading dots
     * @private
     */
    _startAnimation() {
        if (this.animationFrame) return;

        const animate = (timestamp) => {
            if (!this.isVisible) return;

            // Update dots every 500ms
            if (timestamp - this.lastDotUpdate > 500) {
                this.dotCount = (this.dotCount + 1) % 4;
                const dots = '.'.repeat(this.dotCount);

                if (this.statusText && !this.statusText.textContent.includes('✓') && !this.statusText.textContent.includes('✗')) {
                    const baseText = this.statusText.textContent.replace(/\.+$/, '');
                    this.statusText.textContent = baseText + dots;
                }

                this.lastDotUpdate = timestamp;
            }

            this.animationFrame = requestAnimationFrame(animate);
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Stop animation loop
     * @private
     */
    _stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Inject CSS styles for the loading UI
     * @private
     */
    _injectStyles() {
        if (document.getElementById('loading-progress-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'loading-progress-styles';
        styles.textContent = `
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }

            .loading-content {
                max-width: 600px;
                width: 90%;
                padding: 40px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 15px;
                border: 2px solid rgba(255, 215, 0, 0.3);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                color: #fff;
            }

            .loading-title {
                font-size: 32px;
                margin: 0 0 10px 0;
                text-align: center;
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-weight: bold;
            }

            .loading-subtitle {
                text-align: center;
                color: #aaa;
                margin: 0 0 30px 0;
                font-size: 16px;
            }

            .phase-list {
                margin: 20px 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .phase-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 5px;
                transition: all 0.3s ease;
            }

            .phase-item.active {
                background: rgba(255, 215, 0, 0.1);
                border-left: 3px solid #ffd700;
            }

            .phase-item.complete {
                background: rgba(0, 255, 0, 0.05);
                opacity: 0.7;
            }

            .phase-icon {
                font-size: 20px;
                width: 24px;
                text-align: center;
            }

            .phase-item.active .phase-icon {
                animation: pulse 1s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .phase-name {
                flex: 1;
                font-weight: 500;
            }

            .phase-count {
                font-size: 12px;
                color: #888;
            }

            .progress-container {
                margin: 30px 0;
            }

            .progress-bar-outer {
                width: 100%;
                height: 30px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                overflow: hidden;
                position: relative;
            }

            .progress-bar-inner {
                height: 100%;
                background: linear-gradient(90deg, #ffd700, #ffed4e);
                border-radius: 15px;
                transition: width 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: #000;
                font-size: 14px;
            }

            .loading-status {
                text-align: center;
                color: #ccc;
                margin: 15px 0;
                min-height: 24px;
                font-size: 14px;
            }

            .loading-status.error {
                color: #ff6b6b;
            }

            .phase-indicator {
                margin: 20px 0;
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }

            .phase-indicator h3 {
                margin: 0 0 10px 0;
                color: #ffd700;
                font-size: 20px;
            }

            .phase-indicator p {
                margin: 5px 0;
                color: #bbb;
            }

            .phase-indicator .warning {
                color: #ffa500;
            }

            .phase-indicator .error {
                color: #ff6b6b;
            }

            .phase-modules {
                font-style: italic;
                font-size: 14px;
            }

            .module-list {
                margin: 15px 0;
                max-height: 120px;
                overflow-y: auto;
                font-size: 12px;
                font-family: monospace;
            }

            .module-item {
                padding: 4px 8px;
                margin: 2px 0;
                border-radius: 3px;
                animation: slideIn 0.3s ease;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .module-item.success {
                color: #90EE90;
            }

            .module-item.error {
                color: #ff6b6b;
                background: rgba(255, 107, 107, 0.1);
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Cleanup and destroy the component
     */
    destroy() {
        this._stopAnimation();
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LoadingProgress };
} else if (typeof window !== 'undefined') {
    window.LoadingProgress = LoadingProgress;
}