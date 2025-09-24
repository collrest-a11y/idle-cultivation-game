/**
 * SafeModeUI - Minimal UI for safe mode gameplay
 * Provides basic, playable interface with minimal dependencies
 */
class SafeModeUI {
    constructor(safeMode) {
        this.safeMode = safeMode;
        this.container = null;
        this.isActive = false;
    }

    /**
     * Initialize and show the safe mode UI
     */
    async initialize() {
        console.log('[SafeModeUI] Initializing safe mode UI...');

        // Create container
        this.container = document.createElement('div');
        this.container.id = 'safe-mode-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            z-index: 9999;
            overflow-y: auto;
        `;

        // Build UI
        this._buildUI();

        // Append to body
        document.body.appendChild(this.container);

        // Set up event listeners
        this._setupEventListeners();

        this.isActive = true;
        console.log('[SafeModeUI] Safe mode UI initialized');
    }

    /**
     * Build the safe mode UI structure
     */
    _buildUI() {
        const state = this.safeMode.getState();

        this.container.innerHTML = `
            <div style="
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                color: #e8e8e8;
                font-family: Arial, sans-serif;
            ">
                <!-- Safe Mode Banner -->
                <div style="
                    background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
                    border: 2px solid #ff8787;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                ">
                    <h1 style="margin: 0 0 10px 0; color: #fff;">⚠️ SAFE MODE ACTIVE</h1>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #fff;">
                        The game failed to load normally. You're running in Safe Mode with basic features.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #ffd6d6;">
                        Failure Count: ${state.failureCount}/${this.safeMode.maxFailures} |
                        Recovery Attempts: ${state.recoveryAttempts}/${this.safeMode.maxRecoveryAttempts}
                    </p>
                </div>

                <!-- Main Game Area -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">

                    <!-- Cultivation Card -->
                    <div style="
                        background: linear-gradient(145deg, #2a2a3e, #1e1e32);
                        border: 2px solid #4a4a6a;
                        border-radius: 12px;
                        padding: 25px;
                    ">
                        <h2 style="color: #d4af37; margin-top: 0;">Cultivation Progress</h2>

                        <div style="margin: 20px 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>Level:</span>
                                <span id="safe-level" style="color: #d4af37; font-weight: bold;">1</span>
                            </div>

                            <div style="
                                background: #0f0f1e;
                                border-radius: 8px;
                                height: 24px;
                                overflow: hidden;
                                border: 1px solid #4a4a6a;
                            ">
                                <div id="safe-exp-bar" style="
                                    background: linear-gradient(90deg, #d4af37, #c9a96e);
                                    height: 100%;
                                    width: 0%;
                                    transition: width 0.3s ease;
                                "></div>
                            </div>

                            <div style="text-align: center; margin-top: 8px; font-size: 14px; color: #a8a8a8;">
                                <span id="safe-exp-text">0 / 100</span>
                            </div>
                        </div>

                        <button id="safe-meditate-btn" style="
                            width: 100%;
                            background: linear-gradient(135deg, #4a4a6a, #3a3a5a);
                            border: 2px solid #d4af37;
                            color: #e8e8e8;
                            padding: 15px;
                            border-radius: 8px;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.borderColor='#c9a96e'" onmouseout="this.style.borderColor='#d4af37'">
                            ⚡ Meditate
                        </button>
                    </div>

                    <!-- Resources Card -->
                    <div style="
                        background: linear-gradient(145deg, #2a2a3e, #1e1e32);
                        border: 2px solid #4a4a6a;
                        border-radius: 12px;
                        padding: 25px;
                    ">
                        <h2 style="color: #d4af37; margin-top: 0;">Resources</h2>

                        <div style="margin: 20px 0;">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 15px;
                                background: rgba(0,0,0,0.3);
                                border-radius: 8px;
                                margin-bottom: 12px;
                            ">
                                <div>
                                    <div style="font-size: 14px; color: #a8a8a8;">Qi Energy</div>
                                    <div id="safe-qi" style="font-size: 24px; color: #6bc4ff; font-weight: bold;">0</div>
                                </div>
                                <div style="font-size: 32px;">✨</div>
                            </div>

                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 15px;
                                background: rgba(0,0,0,0.3);
                                border-radius: 8px;
                            ">
                                <div>
                                    <div style="font-size: 14px; color: #a8a8a8;">Spirit Stones</div>
                                    <div id="safe-stones" style="font-size: 24px; color: #d4af37; font-weight: bold;">100</div>
                                </div>
                                <div style="font-size: 32px;">💎</div>
                            </div>
                        </div>

                        <div style="
                            background: rgba(212, 175, 55, 0.1);
                            border: 1px solid #d4af37;
                            border-radius: 8px;
                            padding: 12px;
                            font-size: 14px;
                            color: #c9a96e;
                        ">
                            💡 Resources regenerate automatically while you play
                        </div>
                    </div>
                </div>

                <!-- Recovery Options Card -->
                <div style="
                    background: linear-gradient(145deg, #2a2a3e, #1e1e32);
                    border: 2px solid #4a4a6a;
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 20px;
                ">
                    <h2 style="color: #d4af37; margin-top: 0;">Recovery Options</h2>

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <button id="safe-restart-btn" style="
                            background: linear-gradient(135deg, #4a6a4a, #3a5a3a);
                            border: 2px solid #6bc46b;
                            color: #e8e8e8;
                            padding: 15px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.borderColor='#7fd47f'" onmouseout="this.style.borderColor='#6bc46b'">
                            🔄 Retry Normal Mode
                        </button>

                        <button id="safe-clear-save-btn" style="
                            background: linear-gradient(135deg, #6b4a4a, #5a3a3a);
                            border: 2px solid #ff6b6b;
                            color: #e8e8e8;
                            padding: 15px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.borderColor='#ff8787'" onmouseout="this.style.borderColor='#ff6b6b'">
                            🗑️ Clear Save & Restart
                        </button>

                        <button id="safe-export-btn" style="
                            background: linear-gradient(135deg, #4a4a6a, #3a3a5a);
                            border: 2px solid #6b9bc4;
                            color: #e8e8e8;
                            padding: 15px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.borderColor='#7fb0d4'" onmouseout="this.style.borderColor='#6b9bc4'">
                            💾 Export Safe State
                        </button>
                    </div>

                    <div style="
                        background: rgba(107, 180, 196, 0.1);
                        border: 1px solid #6bb4c4;
                        border-radius: 8px;
                        padding: 15px;
                        font-size: 14px;
                        color: #a8c8d4;
                    ">
                        <strong>ℹ️ What to try:</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>Retry Normal Mode - Attempt to load the full game again</li>
                            <li>Clear Save - Reset all data and start fresh (cannot be undone)</li>
                            <li>Export State - Save your current safe mode progress</li>
                        </ul>
                    </div>
                </div>

                <!-- Error Information -->
                <details style="
                    background: linear-gradient(145deg, #2a2a3e, #1e1e32);
                    border: 2px solid #4a4a6a;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <summary style="cursor: pointer; color: #d4af37; font-size: 18px; font-weight: bold;">
                        🔍 Error Details & History
                    </summary>
                    <div id="safe-error-info" style="margin-top: 20px; font-size: 14px;">
                        <div style="margin-bottom: 15px;">
                            <strong style="color: #ff8787;">Failure History:</strong>
                            <div id="safe-failure-list" style="
                                background: rgba(0,0,0,0.3);
                                border-radius: 8px;
                                padding: 12px;
                                margin-top: 8px;
                                max-height: 300px;
                                overflow-y: auto;
                            ">
                                ${this._renderFailureHistory(state.failureHistory)}
                            </div>
                        </div>
                    </div>
                </details>

                <!-- Footer -->
                <div style="text-align: center; padding: 20px; color: #a8a8a8; font-size: 14px;">
                    Safe Mode ensures you can always play, even when the full game fails to load
                </div>
            </div>
        `;
    }

    /**
     * Render failure history HTML
     */
    _renderFailureHistory(history) {
        if (!history || history.length === 0) {
            return '<p style="color: #6bc46b;">No failures recorded</p>';
        }

        return history.map((failure, index) => {
            const date = new Date(failure.timestamp);
            return `
                <div style="
                    background: rgba(255,107,107,0.1);
                    border-left: 3px solid #ff6b6b;
                    padding: 10px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                ">
                    <div style="font-weight: bold; color: #ff8787;">Failure #${index + 1} - ${failure.context}</div>
                    <div style="color: #ffa8a8; font-size: 12px; margin-top: 4px;">${date.toLocaleString()}</div>
                    <div style="color: #c8c8c8; margin-top: 8px;">${failure.error}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Meditate button
        const meditateBtn = document.getElementById('safe-meditate-btn');
        if (meditateBtn) {
            meditateBtn.addEventListener('click', () => {
                this.safeMode.meditate();
                this._showNotification('Meditation complete! +' + (this.safeMode.safeState.cultivation.level * 5) + ' experience');
            });
        }

        // Restart button
        const restartBtn = document.getElementById('safe-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', async () => {
                if (confirm('Attempt to restart in normal mode? This will reload the page.')) {
                    await this.safeMode.attemptNormalRestart();
                }
            });
        }

        // Clear save button
        const clearSaveBtn = document.getElementById('safe-clear-save-btn');
        if (clearSaveBtn) {
            clearSaveBtn.addEventListener('click', () => {
                if (confirm('⚠️ WARNING: This will delete all your save data!\n\nThis cannot be undone. Are you sure?')) {
                    if (confirm('Are you REALLY sure? All progress will be lost!')) {
                        this._clearAllData();
                        window.location.reload();
                    }
                }
            });
        }

        // Export button
        const exportBtn = document.getElementById('safe-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this._exportSafeState();
            });
        }

        // Safe mode update events
        this.safeMode.on('safeMode:update', (data) => {
            this._updateUI(data.state);
        });

        this.safeMode.on('safeMode:levelUp', (data) => {
            this._showNotification(`🎉 Level Up! Now level ${data.level}`);
        });

        this.safeMode.on('safeMode:meditate', (data) => {
            this._updateUI(this.safeMode.safeState);
        });
    }

    /**
     * Update UI elements
     */
    _updateUI(state) {
        // Update level
        const levelEl = document.getElementById('safe-level');
        if (levelEl) {
            levelEl.textContent = state.cultivation.level;
        }

        // Update experience bar
        const expBar = document.getElementById('safe-exp-bar');
        const expText = document.getElementById('safe-exp-text');
        if (expBar && expText) {
            const percentage = (state.cultivation.experience / state.cultivation.experienceRequired) * 100;
            expBar.style.width = percentage + '%';
            expText.textContent = `${Math.floor(state.cultivation.experience)} / ${state.cultivation.experienceRequired}`;
        }

        // Update resources
        const qiEl = document.getElementById('safe-qi');
        const stonesEl = document.getElementById('safe-stones');
        if (qiEl) {
            qiEl.textContent = Math.floor(state.resources.qi);
        }
        if (stonesEl) {
            stonesEl.textContent = Math.floor(state.resources.spiritStones);
        }
    }

    /**
     * Show notification message
     */
    _showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #d4af37, #c9a96e);
            color: #1a1a2e;
            padding: 15px 25px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Export safe state as JSON
     */
    _exportSafeState() {
        const state = this.safeMode.getState();
        const exportData = JSON.stringify(state, null, 2);

        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `idle-cultivation-safemode-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);

        this._showNotification('Safe state exported successfully!');
    }

    /**
     * Clear all game data
     */
    _clearAllData() {
        try {
            // Clear all localStorage
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('idleCultivation')) {
                    localStorage.removeItem(key);
                }
            });

            console.log('[SafeModeUI] All game data cleared');
            this._showNotification('All data cleared. Reloading...');
        } catch (error) {
            console.error('[SafeModeUI] Failed to clear data:', error);
            this._showNotification('Failed to clear data: ' + error.message);
        }
    }

    /**
     * Hide safe mode UI
     */
    hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isActive = false;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    @media (max-width: 768px) {
        #safe-mode-container > div {
            padding: 10px !important;
        }
        #safe-mode-container > div > div {
            grid-template-columns: 1fr !important;
        }
    }
`;
document.head.appendChild(style);

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeModeUI;
} else if (typeof window !== 'undefined') {
    window.SafeModeUI = SafeModeUI;
}