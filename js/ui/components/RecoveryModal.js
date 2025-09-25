/**
 * RecoveryModal - UI component for save data recovery and corruption handling
 * Provides user-friendly options for recovering from corrupted or invalid save states
 */
class RecoveryModal {
    constructor() {
        this.isOpen = false;
        this.recoveryOptions = [];
        this.corruptionInfo = null;
        this.onRecover = null;
        this.modalElement = null;

        console.log('RecoveryModal initialized');
    }

    /**
     * Show the recovery modal with corruption information
     * @param {Object} corruptionInfo - Information about the corruption
     * @param {Array} recoveryOptions - Available recovery options
     * @param {Function} onRecover - Callback when recovery option is selected
     */
    show(corruptionInfo, recoveryOptions = [], onRecover = null) {
        this.corruptionInfo = corruptionInfo;
        this.recoveryOptions = recoveryOptions;
        this.onRecover = onRecover;
        this.isOpen = true;

        this._render();
        this._attachEventListeners();

        console.log('RecoveryModal: Shown with corruption info:', corruptionInfo);
    }

    /**
     * Hide the recovery modal
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }

        this.isOpen = false;
        this.corruptionInfo = null;
        this.recoveryOptions = [];
        this.onRecover = null;

        console.log('RecoveryModal: Hidden');
    }

    /**
     * Render the modal UI
     * @private
     */
    _render() {
        // Remove existing modal if present
        if (this.modalElement) {
            this.modalElement.remove();
        }

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'recovery-modal-overlay';
        modal.innerHTML = `
            <div class="recovery-modal">
                <div class="recovery-modal-header">
                    <h2>Save Data Recovery</h2>
                    <button class="recovery-modal-close" aria-label="Close">&times;</button>
                </div>

                <div class="recovery-modal-body">
                    ${this._renderCorruptionInfo()}
                    ${this._renderRecoveryOptions()}
                </div>

                <div class="recovery-modal-footer">
                    <p class="recovery-modal-warning">
                        <strong>Important:</strong> Choose a recovery option to continue.
                        Your save data appears to be corrupted or invalid.
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modalElement = modal;
    }

    /**
     * Render corruption information section
     * @private
     * @returns {string} HTML for corruption info
     */
    _renderCorruptionInfo() {
        if (!this.corruptionInfo) {
            return '<p>Save data validation failed.</p>';
        }

        const { severity, issues, isRecoverable } = this.corruptionInfo;

        const severityClass = {
            'minor': 'severity-minor',
            'moderate': 'severity-moderate',
            'severe': 'severity-severe',
            'none': 'severity-none'
        }[severity] || 'severity-unknown';

        return `
            <div class="corruption-info">
                <h3>Corruption Details</h3>
                <div class="corruption-severity ${severityClass}">
                    <strong>Severity:</strong> ${severity.charAt(0).toUpperCase() + severity.slice(1)}
                </div>

                ${isRecoverable ?
                    '<p class="corruption-recoverable">This corruption is recoverable.</p>' :
                    '<p class="corruption-unrecoverable">This corruption may require starting a new game.</p>'
                }

                ${issues && issues.length > 0 ? `
                    <div class="corruption-issues">
                        <h4>Issues Found:</h4>
                        <ul>
                            ${issues.slice(0, 5).map(issue => `<li>${this._escapeHtml(issue)}</li>`).join('')}
                            ${issues.length > 5 ? `<li><em>...and ${issues.length - 5} more issues</em></li>` : ''}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render recovery options section
     * @private
     * @returns {string} HTML for recovery options
     */
    _renderRecoveryOptions() {
        if (!this.recoveryOptions || this.recoveryOptions.length === 0) {
            return `
                <div class="recovery-options">
                    <h3>Recovery Options</h3>
                    <p>No recovery options available. You may need to start a new game.</p>
                    <button class="recovery-option-btn recovery-new-game" data-action="newGame">
                        Start New Game
                    </button>
                </div>
            `;
        }

        return `
            <div class="recovery-options">
                <h3>Recovery Options</h3>
                <p>Choose a recovery method to restore your game:</p>

                <div class="recovery-option-list">
                    ${this.recoveryOptions.map((option, index) => `
                        <div class="recovery-option">
                            <button class="recovery-option-btn" data-action="${option.action}" data-index="${index}">
                                <span class="recovery-option-icon">${this._getOptionIcon(option.type)}</span>
                                <span class="recovery-option-content">
                                    <strong class="recovery-option-title">${this._escapeHtml(option.title)}</strong>
                                    <span class="recovery-option-desc">${this._escapeHtml(option.description)}</span>
                                </span>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Get icon for recovery option type
     * @private
     * @param {string} type - Option type
     * @returns {string} Icon HTML
     */
    _getOptionIcon(type) {
        const icons = {
            'repair': '🔧',
            'backup': '💾',
            'rollback': '⏮️',
            'default': '🔄',
            'newGame': '✨'
        };

        return icons[type] || icons.default;
    }

    /**
     * Attach event listeners to modal elements
     * @private
     */
    _attachEventListeners() {
        if (!this.modalElement) return;

        // Close button
        const closeBtn = this.modalElement.querySelector('.recovery-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this._handleClose());
        }

        // Recovery option buttons
        const optionBtns = this.modalElement.querySelectorAll('.recovery-option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this._handleOptionClick(e));
        });

        // Click outside to close (but warn user)
        this.modalElement.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this._handleClose();
            }
        });
    }

    /**
     * Handle close button click
     * @private
     */
    _handleClose() {
        if (confirm('Are you sure you want to close without recovering? This may leave the game in an invalid state.')) {
            this.hide();
        }
    }

    /**
     * Handle recovery option click
     * @private
     * @param {Event} event - Click event
     */
    _handleOptionClick(event) {
        const btn = event.currentTarget;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);

        console.log('RecoveryModal: Option selected:', action, index);

        // Disable all buttons to prevent double-click
        const allBtns = this.modalElement.querySelectorAll('.recovery-option-btn');
        allBtns.forEach(b => b.disabled = true);

        // Show loading state
        btn.classList.add('loading');
        btn.innerHTML = '<span class="spinner">⏳</span> Processing...';

        // Call recovery callback
        if (this.onRecover) {
            const option = this.recoveryOptions[index] || { action };

            this.onRecover(option).then(success => {
                if (success) {
                    // Recovery successful, close modal
                    this.hide();
                } else {
                    // Recovery failed, re-enable buttons
                    allBtns.forEach(b => b.disabled = false);
                    btn.classList.remove('loading');
                    this._render(); // Re-render to restore original buttons
                    this._attachEventListeners();

                    alert('Recovery failed. Please try another option.');
                }
            }).catch(error => {
                console.error('RecoveryModal: Recovery error:', error);
                allBtns.forEach(b => b.disabled = false);
                btn.classList.remove('loading');
                this._render();
                this._attachEventListeners();

                alert('An error occurred during recovery: ' + error.message);
            });
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Create default recovery options based on available data
     * @param {Object} context - Recovery context
     * @returns {Array} Recovery options
     */
    static createDefaultOptions(context = {}) {
        const options = [];

        // Option 1: Attempt automatic repair
        if (context.isRecoverable) {
            options.push({
                type: 'repair',
                action: 'repair',
                title: 'Automatic Repair',
                description: 'Attempt to automatically fix corrupted data. May result in some data loss.'
            });
        }

        // Option 2: Load from backup
        if (context.hasBackup) {
            options.push({
                type: 'backup',
                action: 'loadBackup',
                title: 'Restore from Backup',
                description: 'Load the most recent backup save. You may lose recent progress.'
            });
        }

        // Option 3: Rollback to snapshot
        if (context.hasSnapshots) {
            options.push({
                type: 'rollback',
                action: 'rollback',
                title: 'Rollback to Previous State',
                description: 'Restore from an automatic snapshot. Recent changes will be lost.'
            });
        }

        // Option 4: Start fresh
        options.push({
            type: 'default',
            action: 'loadDefault',
            title: 'Load Default State',
            description: 'Start with a fresh default state. All progress will be lost.'
        });

        // Option 5: New game
        options.push({
            type: 'newGame',
            action: 'newGame',
            title: 'Start New Game',
            description: 'Begin a completely new game. All data will be reset.'
        });

        return options;
    }

    /**
     * Add CSS styles to the document
     */
    static injectStyles() {
        if (document.getElementById('recovery-modal-styles')) {
            return; // Already injected
        }

        const styles = document.createElement('style');
        styles.id = 'recovery-modal-styles';
        styles.textContent = `
            .recovery-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .recovery-modal {
                background: var(--bg-secondary, #1a1a1a);
                border: 2px solid var(--border-color, #444);
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s;
            }

            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .recovery-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .recovery-modal-header h2 {
                margin: 0;
                color: var(--text-primary, #fff);
                font-size: 1.5rem;
            }

            .recovery-modal-close {
                background: none;
                border: none;
                color: var(--text-secondary, #aaa);
                font-size: 2rem;
                cursor: pointer;
                padding: 0;
                width: 2rem;
                height: 2rem;
                line-height: 2rem;
                transition: color 0.2s;
            }

            .recovery-modal-close:hover {
                color: var(--text-primary, #fff);
            }

            .recovery-modal-body {
                padding: 1.5rem;
            }

            .corruption-info {
                margin-bottom: 2rem;
                padding: 1rem;
                background: var(--bg-tertiary, #2a2a2a);
                border-radius: 8px;
            }

            .corruption-info h3 {
                margin-top: 0;
                color: var(--text-primary, #fff);
            }

            .corruption-severity {
                padding: 0.5rem;
                margin: 1rem 0;
                border-radius: 4px;
            }

            .severity-minor { background: #2d4a2d; color: #8bc34a; }
            .severity-moderate { background: #4a3d2d; color: #ffa726; }
            .severity-severe { background: #4a2d2d; color: #ef5350; }

            .corruption-recoverable {
                color: #8bc34a;
                font-weight: bold;
            }

            .corruption-unrecoverable {
                color: #ef5350;
                font-weight: bold;
            }

            .corruption-issues ul {
                margin: 0.5rem 0;
                padding-left: 1.5rem;
            }

            .corruption-issues li {
                color: var(--text-secondary, #aaa);
                margin: 0.25rem 0;
            }

            .recovery-options {
                margin-bottom: 1rem;
            }

            .recovery-options h3 {
                margin-top: 0;
                color: var(--text-primary, #fff);
            }

            .recovery-option-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                margin-top: 1rem;
            }

            .recovery-option-btn {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: var(--bg-tertiary, #2a2a2a);
                border: 2px solid var(--border-color, #444);
                border-radius: 8px;
                color: var(--text-primary, #fff);
                cursor: pointer;
                transition: all 0.2s;
                text-align: left;
            }

            .recovery-option-btn:hover:not(:disabled) {
                background: var(--bg-hover, #3a3a3a);
                border-color: var(--accent-color, #64b5f6);
                transform: translateY(-2px);
            }

            .recovery-option-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .recovery-option-btn.loading {
                justify-content: center;
            }

            .recovery-option-icon {
                font-size: 2rem;
                flex-shrink: 0;
            }

            .recovery-option-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .recovery-option-title {
                font-size: 1.1rem;
                color: var(--text-primary, #fff);
            }

            .recovery-option-desc {
                font-size: 0.9rem;
                color: var(--text-secondary, #aaa);
            }

            .recovery-modal-footer {
                padding: 1rem 1.5rem;
                border-top: 1px solid var(--border-color, #444);
                background: var(--bg-tertiary, #2a2a2a);
            }

            .recovery-modal-warning {
                margin: 0;
                color: var(--text-secondary, #aaa);
                font-size: 0.9rem;
            }

            .recovery-new-game {
                margin-top: 1rem;
            }

            .spinner {
                animation: spin 1s linear infinite;
                display: inline-block;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Inject styles when class is loaded
if (typeof document !== 'undefined') {
    RecoveryModal.injectStyles();
}

// Create singleton instance
const recoveryModal = new RecoveryModal();

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RecoveryModal, recoveryModal };
} else if (typeof window !== 'undefined') {
    window.RecoveryModal = RecoveryModal;
    window.recoveryModal = recoveryModal;
}