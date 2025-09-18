/**
 * CultivationView - Display and manage cultivation progress, techniques, and breakthroughs
 * Shows dual-path cultivation (Qi and Body), realm progression, and technique management
 */
class CultivationView extends GameView {
    constructor(container, options = {}) {
        super(container, options);

        // Cultivation system references
        this.cultivationSystem = null;
        this.realmManager = null;
        this.techniqueManager = null;

        // UI components
        this.realmProgressPanel = null;
        this.cultivationPathsPanel = null;
        this.techniquesPanel = null;
        this.breakthroughPanel = null;
        this.statisticsPanel = null;

        // Current data
        this.cultivationData = null;
        this.realmData = null;
        this.techniqueData = null;

        // Settings
        this.autoRefresh = true;
        this.refreshRate = 2000; // 2 seconds for real-time cultivation updates
    }

    /**
     * Create main content area
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content cultivation-content';

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'cultivation-layout';

        // Left column - Progress and Techniques
        const leftColumn = document.createElement('div');
        leftColumn.className = 'cultivation-left-column';

        // Right column - Actions and Stats
        const rightColumn = document.createElement('div');
        rightColumn.className = 'cultivation-right-column';

        // Create panels
        this.realmProgressPanel = this.createRealmProgressPanel();
        this.cultivationPathsPanel = this.createCultivationPathsPanel();
        this.techniquesPanel = this.createTechniquesPanel();
        this.breakthroughPanel = this.createBreakthroughPanel();
        this.statisticsPanel = this.createStatisticsPanel();

        // Organize panels
        leftColumn.appendChild(this.realmProgressPanel);
        leftColumn.appendChild(this.cultivationPathsPanel);
        leftColumn.appendChild(this.techniquesPanel);

        rightColumn.appendChild(this.breakthroughPanel);
        rightColumn.appendChild(this.statisticsPanel);

        layout.appendChild(leftColumn);
        layout.appendChild(rightColumn);
        content.appendChild(layout);

        return content;
    }

    /**
     * Create realm progress panel
     */
    createRealmProgressPanel() {
        const panel = document.createElement('div');
        panel.className = 'cultivation-panel realm-progress-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-mountain"></span> Cultivation Realm';

        const content = document.createElement('div');
        content.className = 'panel-content realm-content';

        // Current realm display
        const realmDisplay = document.createElement('div');
        realmDisplay.className = 'current-realm';
        content.appendChild(realmDisplay);

        // Realm progress bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'realm-progress-container';

        const progressLabel = document.createElement('div');
        progressLabel.className = 'progress-label';
        progressLabel.textContent = 'Minor Stage Progress';

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar realm-progress-bar';

        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressBar.appendChild(progressFill);

        const progressText = document.createElement('div');
        progressText.className = 'progress-text';
        progressBar.appendChild(progressText);

        progressContainer.appendChild(progressLabel);
        progressContainer.appendChild(progressBar);
        content.appendChild(progressContainer);

        // Next realm preview
        const nextRealmPreview = document.createElement('div');
        nextRealmPreview.className = 'next-realm-preview';
        content.appendChild(nextRealmPreview);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create cultivation paths panel
     */
    createCultivationPathsPanel() {
        const panel = document.createElement('div');
        panel.className = 'cultivation-panel paths-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-yin-yang"></span> Cultivation Paths';

        const content = document.createElement('div');
        content.className = 'panel-content paths-content';

        // Qi cultivation path
        const qiPath = this.createPathDisplay('qi', 'Qi Cultivation', 'icon-energy');
        content.appendChild(qiPath);

        // Body cultivation path
        const bodyPath = this.createPathDisplay('body', 'Body Cultivation', 'icon-muscle');
        content.appendChild(bodyPath);

        // Dual cultivation path (if unlocked)
        const dualPath = this.createPathDisplay('dual', 'Dual Cultivation', 'icon-balance');
        content.appendChild(dualPath);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create individual path display
     */
    createPathDisplay(pathType, title, icon) {
        const pathContainer = document.createElement('div');
        pathContainer.className = `cultivation-path ${pathType}-path`;
        pathContainer.dataset.pathType = pathType;

        const pathHeader = document.createElement('div');
        pathHeader.className = 'path-header';
        pathHeader.innerHTML = `<span class="${icon}"></span> ${title}`;

        const pathContent = document.createElement('div');
        pathContent.className = 'path-content';

        // Level and experience
        const levelDisplay = document.createElement('div');
        levelDisplay.className = 'level-display';

        const levelText = document.createElement('span');
        levelText.className = 'level-text';
        levelDisplay.appendChild(levelText);

        const expBar = document.createElement('div');
        expBar.className = 'experience-bar';

        const expFill = document.createElement('div');
        expFill.className = 'experience-fill';
        expBar.appendChild(expFill);

        const expText = document.createElement('div');
        expText.className = 'experience-text';
        expBar.appendChild(expText);

        // Rate display
        const rateDisplay = document.createElement('div');
        rateDisplay.className = 'rate-display';

        pathContent.appendChild(levelDisplay);
        pathContent.appendChild(expBar);
        pathContent.appendChild(rateDisplay);

        pathContainer.appendChild(pathHeader);
        pathContainer.appendChild(pathContent);

        return pathContainer;
    }

    /**
     * Create techniques panel
     */
    createTechniquesPanel() {
        const panel = document.createElement('div');
        panel.className = 'cultivation-panel techniques-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-scroll"></span> Cultivation Techniques';

        const content = document.createElement('div');
        content.className = 'panel-content techniques-content';

        // Active techniques
        const activeSection = document.createElement('div');
        activeSection.className = 'techniques-section active-techniques';

        const activeHeader = document.createElement('h4');
        activeHeader.textContent = 'Active Techniques';
        activeSection.appendChild(activeHeader);

        const activeList = document.createElement('div');
        activeList.className = 'technique-list active-list';
        activeSection.appendChild(activeList);

        // Available techniques
        const availableSection = document.createElement('div');
        availableSection.className = 'techniques-section available-techniques';

        const availableHeader = document.createElement('h4');
        availableHeader.textContent = 'Available Techniques';
        availableSection.appendChild(availableHeader);

        const availableList = document.createElement('div');
        availableList.className = 'technique-list available-list';
        availableSection.appendChild(availableList);

        content.appendChild(activeSection);
        content.appendChild(availableSection);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create breakthrough panel
     */
    createBreakthroughPanel() {
        const panel = document.createElement('div');
        panel.className = 'cultivation-panel breakthrough-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-star"></span> Breakthrough';

        const content = document.createElement('div');
        content.className = 'panel-content breakthrough-content';

        // Breakthrough requirements
        const requirements = document.createElement('div');
        requirements.className = 'breakthrough-requirements';
        content.appendChild(requirements);

        // Breakthrough button
        const breakthroughButton = document.createElement('button');
        breakthroughButton.className = 'btn btn-primary breakthrough-btn';
        breakthroughButton.innerHTML = '<span class="icon-arrow-up"></span> Attempt Breakthrough';
        breakthroughButton.addEventListener('click', () => this.attemptBreakthrough());
        content.appendChild(breakthroughButton);

        // Success chance display
        const chanceDisplay = document.createElement('div');
        chanceDisplay.className = 'breakthrough-chance';
        content.appendChild(chanceDisplay);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create statistics panel
     */
    createStatisticsPanel() {
        const panel = document.createElement('div');
        panel.className = 'cultivation-panel statistics-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-chart"></span> Cultivation Statistics';

        const content = document.createElement('div');
        content.className = 'panel-content statistics-content';

        // Statistics list
        const statsList = document.createElement('div');
        statsList.className = 'statistics-list';
        content.appendChild(statsList);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Setup view-specific event listeners
     */
    setupViewEventListeners() {
        // Listen for cultivation updates
        this.on('cultivation:progress', (data) => {
            this.onCultivationProgress(data);
        });

        this.on('cultivation:breakthrough', (data) => {
            this.onBreakthrough(data);
        });

        this.on('cultivation:techniqueChanged', (data) => {
            this.onTechniqueChanged(data);
        });

        this.on('realm:changed', (data) => {
            this.onRealmChanged(data);
        });
    }

    /**
     * Load cultivation data
     */
    async loadData() {
        try {
            // Get system references
            this.cultivationSystem = window.game?.moduleManager?.getModule('cultivation')?.cultivationIntegration?.cultivationSystem;
            this.realmManager = window.game?.moduleManager?.getModule('cultivation')?.cultivationIntegration?.realmManager;
            this.techniqueManager = window.game?.moduleManager?.getModule('cultivation')?.cultivationIntegration?.techniqueManager;

            if (!this.cultivationSystem) {
                throw new Error('Cultivation system not available');
            }

            // Load current cultivation data
            this.cultivationData = this.cultivationSystem.getCultivationState();
            this.realmData = this.realmManager?.getCurrentRealm();
            this.techniqueData = this.techniqueManager?.getActiveTechniques();

            console.log('CultivationView: Data loaded successfully');

        } catch (error) {
            console.error('CultivationView: Failed to load data', error);
            throw error;
        }
    }

    /**
     * Render view content
     */
    renderContent() {
        if (!this.cultivationData) {
            return;
        }

        this.renderRealmProgress();
        this.renderCultivationPaths();
        this.renderTechniques();
        this.renderBreakthroughPanel();
        this.renderStatistics();
    }

    /**
     * Render realm progress
     */
    renderRealmProgress() {
        const realmContent = this.realmProgressPanel.querySelector('.realm-content');
        if (!realmContent || !this.realmData) return;

        // Current realm display
        const currentRealm = realmContent.querySelector('.current-realm');
        currentRealm.innerHTML = `
            <div class="realm-name">${this.realmData.name || 'Unknown Realm'}</div>
            <div class="realm-stage">Stage ${this.realmData.minorStage || 1} of ${this.realmData.maxStages || 10}</div>
            <div class="realm-description">${this.realmData.description || ''}</div>
        `;

        // Progress bar
        const progressFill = realmContent.querySelector('.progress-fill');
        const progressText = realmContent.querySelector('.progress-text');

        if (this.realmData.progress !== undefined) {
            const progress = Math.min(100, Math.max(0, this.realmData.progress));
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress.toFixed(1)}%`;
        }

        // Next realm preview
        const nextRealmPreview = realmContent.querySelector('.next-realm-preview');
        if (this.realmData.nextRealm) {
            nextRealmPreview.innerHTML = `
                <div class="next-realm-label">Next Realm:</div>
                <div class="next-realm-name">${this.realmData.nextRealm.name}</div>
                <div class="next-realm-requirements">
                    Requirements: ${this.formatRequirements(this.realmData.nextRealm.requirements)}
                </div>
            `;
            nextRealmPreview.style.display = 'block';
        } else {
            nextRealmPreview.style.display = 'none';
        }
    }

    /**
     * Render cultivation paths
     */
    renderCultivationPaths() {
        if (!this.cultivationData) return;

        // Render each path
        this.renderPath('qi', this.cultivationData.qi);
        this.renderPath('body', this.cultivationData.body);
        this.renderPath('dual', this.cultivationData.dual);
    }

    /**
     * Render individual cultivation path
     */
    renderPath(pathType, pathData) {
        const pathElement = this.cultivationPathsPanel.querySelector(`[data-path-type="${pathType}"]`);
        if (!pathElement || !pathData) return;

        // Special handling for dual cultivation
        if (pathType === 'dual' && !pathData.unlocked) {
            pathElement.style.display = 'none';
            return;
        } else {
            pathElement.style.display = 'block';
        }

        const levelText = pathElement.querySelector('.level-text');
        const expFill = pathElement.querySelector('.experience-fill');
        const expText = pathElement.querySelector('.experience-text');
        const rateDisplay = pathElement.querySelector('.rate-display');

        // Level display
        levelText.textContent = `Level ${pathData.level || 0}`;

        // Experience bar
        if (pathData.experience !== undefined && pathData.experienceToNext !== undefined) {
            const expProgress = pathData.experienceToNext > 0 ?
                (pathData.experience / pathData.experienceToNext) * 100 : 0;
            expFill.style.width = `${Math.min(100, expProgress)}%`;
            expText.textContent = `${this.formatNumber(pathData.experience)} / ${this.formatNumber(pathData.experienceToNext)}`;
        }

        // Rate display
        const rate = pathData.currentRate || pathData.baseRate || 0;
        const multiplier = pathData.currentMultiplier || 1;
        rateDisplay.innerHTML = `
            <div class="base-rate">Base Rate: ${this.formatNumber(rate)}/s</div>
            <div class="current-multiplier">Multiplier: ${multiplier.toFixed(2)}x</div>
            <div class="effective-rate">Effective: ${this.formatNumber(rate * multiplier)}/s</div>
        `;
    }

    /**
     * Render techniques
     */
    renderTechniques() {
        const activeList = this.techniquesPanel.querySelector('.active-list');
        const availableList = this.techniquesPanel.querySelector('.available-list');

        if (!activeList || !availableList) return;

        // Clear existing content
        activeList.innerHTML = '';
        availableList.innerHTML = '';

        if (this.techniqueData) {
            // Render active techniques
            this.techniqueData.active?.forEach(technique => {
                const techniqueElement = this.createTechniqueElement(technique, true);
                activeList.appendChild(techniqueElement);
            });

            // Render available techniques
            this.techniqueData.available?.forEach(technique => {
                const techniqueElement = this.createTechniqueElement(technique, false);
                availableList.appendChild(techniqueElement);
            });
        }

        // Show empty state if no techniques
        if (!activeList.children.length) {
            activeList.innerHTML = '<div class="empty-state">No active techniques</div>';
        }
        if (!availableList.children.length) {
            availableList.innerHTML = '<div class="empty-state">No available techniques</div>';
        }
    }

    /**
     * Create technique element
     */
    createTechniqueElement(technique, isActive) {
        const element = document.createElement('div');
        element.className = `technique-item ${isActive ? 'active' : 'available'}`;
        element.dataset.techniqueId = technique.id;

        const rarity = technique.rarity || 'common';
        element.classList.add(`rarity-${rarity}`);

        element.innerHTML = `
            <div class="technique-header">
                <div class="technique-name">${technique.name}</div>
                <div class="technique-rarity">${this.capitalizeFirst(rarity)}</div>
            </div>
            <div class="technique-description">${technique.description || ''}</div>
            <div class="technique-effects">
                ${this.formatTechniqueEffects(technique.effects)}
            </div>
            <div class="technique-actions">
                ${isActive ?
                    '<button class="btn btn-secondary btn-sm deactivate-technique">Deactivate</button>' :
                    '<button class="btn btn-primary btn-sm activate-technique">Activate</button>'
                }
            </div>
        `;

        // Add click handlers
        const actionButton = element.querySelector('.btn');
        if (actionButton) {
            actionButton.addEventListener('click', () => {
                if (isActive) {
                    this.deactivateTechnique(technique.id);
                } else {
                    this.activateTechnique(technique.id);
                }
            });
        }

        return element;
    }

    /**
     * Render breakthrough panel
     */
    renderBreakthroughPanel() {
        const requirements = this.breakthroughPanel.querySelector('.breakthrough-requirements');
        const button = this.breakthroughPanel.querySelector('.breakthrough-btn');
        const chanceDisplay = this.breakthroughPanel.querySelector('.breakthrough-chance');

        if (!this.realmData || !requirements) return;

        // Check if breakthrough is available
        const canBreakthrough = this.realmData.canBreakthrough;
        const breakthroughRequirements = this.realmData.breakthroughRequirements;

        if (canBreakthrough && breakthroughRequirements) {
            requirements.innerHTML = `
                <h4>Breakthrough Requirements</h4>
                <div class="requirements-list">
                    ${this.formatBreakthroughRequirements(breakthroughRequirements)}
                </div>
            `;

            // Show success chance
            const successChance = this.realmData.breakthroughChance || 0;
            chanceDisplay.innerHTML = `
                <div class="success-chance">
                    Success Chance: <span class="chance-value">${(successChance * 100).toFixed(1)}%</span>
                </div>
            `;

            button.disabled = false;
            button.textContent = 'Attempt Breakthrough';
        } else {
            requirements.innerHTML = '<div class="no-breakthrough">No breakthrough available</div>';
            chanceDisplay.innerHTML = '';
            button.disabled = true;
            button.textContent = 'Requirements Not Met';
        }
    }

    /**
     * Render statistics
     */
    renderStatistics() {
        const statsList = this.statisticsPanel.querySelector('.statistics-list');
        if (!statsList || !this.cultivationSystem) return;

        const stats = this.cultivationSystem.getStatistics();

        statsList.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Cultivation Time:</span>
                <span class="stat-value">${this.formatTime(stats.totalCultivationTime || 0)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Qi Breakthroughs:</span>
                <span class="stat-value">${stats.qiBreakthroughs || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Body Breakthroughs:</span>
                <span class="stat-value">${stats.bodyBreakthroughs || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Perfect Breakthroughs:</span>
                <span class="stat-value">${stats.perfectBreakthroughs || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Failed Breakthroughs:</span>
                <span class="stat-value">${stats.failedBreakthroughs || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Pills Consumed:</span>
                <span class="stat-value">${stats.pillsConsumed || 0}</span>
            </div>
        `;
    }

    /**
     * Event handlers
     */
    onCultivationProgress(data) {
        this.cultivationData = data;
        this.renderCultivationPaths();
    }

    onBreakthrough(data) {
        // Show breakthrough result notification
        this.showNotification(
            data.success ? 'Breakthrough Successful!' : 'Breakthrough Failed',
            data.success ? 'success' : 'error'
        );
        this.refresh();
    }

    onTechniqueChanged(data) {
        this.renderTechniques();
    }

    onRealmChanged(data) {
        this.realmData = data;
        this.renderRealmProgress();
        this.renderBreakthroughPanel();
    }

    /**
     * Action methods
     */
    async attemptBreakthrough() {
        try {
            if (this.realmManager) {
                await this.realmManager.attemptBreakthrough();
            }
        } catch (error) {
            console.error('CultivationView: Breakthrough failed', error);
            this.showNotification('Breakthrough failed: ' + error.message, 'error');
        }
    }

    async activateTechnique(techniqueId) {
        try {
            if (this.techniqueManager) {
                await this.techniqueManager.activateTechnique(techniqueId);
            }
        } catch (error) {
            console.error('CultivationView: Failed to activate technique', error);
            this.showNotification('Failed to activate technique: ' + error.message, 'error');
        }
    }

    async deactivateTechnique(techniqueId) {
        try {
            if (this.techniqueManager) {
                await this.techniqueManager.deactivateTechnique(techniqueId);
            }
        } catch (error) {
            console.error('CultivationView: Failed to deactivate technique', error);
            this.showNotification('Failed to deactivate technique: ' + error.message, 'error');
        }
    }

    /**
     * Utility methods
     */
    formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(0);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }

    formatRequirements(requirements) {
        if (!requirements) return 'None';
        return Object.entries(requirements)
            .map(([key, value]) => `${this.capitalizeFirst(key)}: ${value}`)
            .join(', ');
    }

    formatTechniqueEffects(effects) {
        if (!effects || !Array.isArray(effects)) return '';
        return effects.map(effect => `
            <div class="effect-item">
                <span class="effect-type">${effect.type}:</span>
                <span class="effect-value">${effect.value}</span>
            </div>
        `).join('');
    }

    formatBreakthroughRequirements(requirements) {
        return Object.entries(requirements)
            .map(([key, req]) => `
                <div class="requirement-item ${req.met ? 'met' : 'unmet'}">
                    <span class="req-name">${this.capitalizeFirst(key)}:</span>
                    <span class="req-progress">${req.current} / ${req.required}</span>
                </div>
            `).join('');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CultivationView };
} else if (typeof window !== 'undefined') {
    window.CultivationView = CultivationView;
}