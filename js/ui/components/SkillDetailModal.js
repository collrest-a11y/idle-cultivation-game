/**
 * SkillDetailModal - Comprehensive skill information and action modal
 * Provides detailed skill information, upgrade options, and evolution paths
 */
class SkillDetailModal extends BaseComponent {
    constructor(container, eventManager, skillSystem) {
        super('skill-detail-modal', container);

        this.eventManager = eventManager;
        this.skillSystem = skillSystem;

        // Modal state
        this.state = {
            isOpen: false,
            currentSkill: null,
            skillData: null,
            canAfford: false,
            canUpgrade: false,
            evolutionPaths: [],
            synergies: []
        };

        // UI elements
        this.elements = {
            modal: null,
            backdrop: null,
            closeBtn: null,
            skillIcon: null,
            skillName: null,
            skillDescription: null,
            levelInfo: null,
            effectsTable: null,
            costsInfo: null,
            actionButtons: null,
            evolutionSection: null,
            synergySection: null
        };

        // Animation state
        this.isAnimating = false;
        this.animationDuration = 300;

        // Bind methods
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleBackdropClick = this.handleBackdropClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleUpgrade = this.handleUpgrade.bind(this);
        this.handleUnlock = this.handleUnlock.bind(this);

        console.log('SkillDetailModal: Initialized');
    }

    /**
     * Initialize the modal
     */
    async initialize() {
        try {
            await super.initialize();

            // Create modal structure
            this._createModalStructure();

            // Set up event listeners
            this._setupEventListeners();

            // Set up accessibility
            this._setupAccessibility();

            console.log('SkillDetailModal: Initialization complete');

        } catch (error) {
            console.error('SkillDetailModal: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Show the modal with skill details
     * @param {string} skillId - ID of the skill to display
     */
    async show(skillId) {
        if (this.isAnimating || this.state.isOpen) {
            return;
        }

        try {
            // Load skill data
            await this._loadSkillData(skillId);

            if (!this.state.skillData) {
                console.warn('SkillDetailModal: Skill data not found for', skillId);
                return;
            }

            // Show modal
            this.isAnimating = true;
            this.state.isOpen = true;

            // Render content
            this._renderSkillDetails();

            // Show modal with animation
            this.elements.modal.style.display = 'flex';
            this.elements.modal.setAttribute('aria-hidden', 'false');

            // Animate in
            await this._animateIn();

            // Focus first interactive element
            this._focusFirstElement();

            this.isAnimating = false;

            // Emit show event
            this.eventManager.emit('skillDetailModal:shown', {
                skillId: this.state.currentSkill,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('SkillDetailModal: Failed to show modal:', error);
            this.isAnimating = false;
            this.hide();
        }
    }

    /**
     * Hide the modal
     */
    async hide() {
        if (this.isAnimating || !this.state.isOpen) {
            return;
        }

        try {
            this.isAnimating = true;

            // Animate out
            await this._animateOut();

            // Hide modal
            this.elements.modal.style.display = 'none';
            this.elements.modal.setAttribute('aria-hidden', 'true');

            // Reset state
            this.state.isOpen = false;
            this.state.currentSkill = null;
            this.state.skillData = null;

            this.isAnimating = false;

            // Emit hide event
            this.eventManager.emit('skillDetailModal:hidden', {
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('SkillDetailModal: Failed to hide modal:', error);
            this.isAnimating = false;
        }
    }

    /**
     * Update the modal content if currently showing a skill
     */
    async refresh() {
        if (!this.state.isOpen || !this.state.currentSkill) {
            return;
        }

        try {
            await this._loadSkillData(this.state.currentSkill);
            this._renderSkillDetails();

        } catch (error) {
            console.error('SkillDetailModal: Failed to refresh:', error);
        }
    }

    // Private methods

    /**
     * Create the modal structure
     */
    _createModalStructure() {
        const modalHTML = `
            <div class="skill-detail-modal" aria-hidden="true" role="dialog" aria-labelledby="skill-modal-title" aria-modal="true">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <header class="modal-header">
                        <div class="skill-header-info">
                            <div class="skill-icon-large" id="skill-modal-icon">⭐</div>
                            <div class="skill-title-section">
                                <h2 class="skill-title" id="skill-modal-title">Skill Name</h2>
                                <div class="skill-meta">
                                    <span class="skill-category" id="skill-modal-category">Category</span>
                                    <span class="skill-rarity" id="skill-modal-rarity">Rarity</span>
                                </div>
                            </div>
                        </div>
                        <button class="modal-close-btn" aria-label="Close skill details">✕</button>
                    </header>

                    <div class="modal-body">
                        <!-- Skill Description -->
                        <section class="skill-description-section">
                            <h3>Description</h3>
                            <p class="skill-description" id="skill-modal-description">
                                Skill description goes here...
                            </p>
                        </section>

                        <!-- Current Level & Progress -->
                        <section class="skill-level-section">
                            <h3>Current Level</h3>
                            <div class="level-info" id="skill-level-info">
                                <div class="level-display">
                                    <span class="current-level">1</span>
                                    <span class="level-separator">/</span>
                                    <span class="max-level">10</span>
                                </div>
                                <div class="level-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: 20%"></div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Effects Table -->
                        <section class="skill-effects-section">
                            <h3>Effects</h3>
                            <div class="effects-table" id="skill-effects-table">
                                <!-- Effects will be populated here -->
                            </div>
                        </section>

                        <!-- Upgrade Costs -->
                        <section class="skill-costs-section" id="skill-costs-section">
                            <h3>Upgrade Cost</h3>
                            <div class="costs-info" id="skill-costs-info">
                                <!-- Cost information will be populated here -->
                            </div>
                        </section>

                        <!-- Evolution Paths -->
                        <section class="skill-evolution-section" id="skill-evolution-section" style="display: none;">
                            <h3>Evolution Paths</h3>
                            <div class="evolution-paths" id="skill-evolution-paths">
                                <!-- Evolution options will be populated here -->
                            </div>
                        </section>

                        <!-- Synergies -->
                        <section class="skill-synergy-section" id="skill-synergy-section" style="display: none;">
                            <h3>Synergies</h3>
                            <div class="synergy-list" id="skill-synergy-list">
                                <!-- Synergy information will be populated here -->
                            </div>
                        </section>

                        <!-- Tags -->
                        <section class="skill-tags-section">
                            <h3>Tags</h3>
                            <div class="skill-tags" id="skill-modal-tags">
                                <!-- Tags will be populated here -->
                            </div>
                        </section>
                    </div>

                    <footer class="modal-footer">
                        <div class="action-buttons" id="skill-action-buttons">
                            <!-- Action buttons will be populated here -->
                        </div>
                    </footer>
                </div>
            </div>
        `;

        this.container.innerHTML = modalHTML;

        // Cache element references
        this.elements = {
            modal: this.container.querySelector('.skill-detail-modal'),
            backdrop: this.container.querySelector('.modal-backdrop'),
            closeBtn: this.container.querySelector('.modal-close-btn'),
            skillIcon: this.container.querySelector('#skill-modal-icon'),
            skillName: this.container.querySelector('#skill-modal-title'),
            skillCategory: this.container.querySelector('#skill-modal-category'),
            skillRarity: this.container.querySelector('#skill-modal-rarity'),
            skillDescription: this.container.querySelector('#skill-modal-description'),
            levelInfo: this.container.querySelector('#skill-level-info'),
            effectsTable: this.container.querySelector('#skill-effects-table'),
            costsSection: this.container.querySelector('#skill-costs-section'),
            costsInfo: this.container.querySelector('#skill-costs-info'),
            actionButtons: this.container.querySelector('#skill-action-buttons'),
            evolutionSection: this.container.querySelector('#skill-evolution-section'),
            evolutionPaths: this.container.querySelector('#skill-evolution-paths'),
            synergySection: this.container.querySelector('#skill-synergy-section'),
            synergyList: this.container.querySelector('#skill-synergy-list'),
            skillTags: this.container.querySelector('#skill-modal-tags')
        };
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Close button
        this.elements.closeBtn.addEventListener('click', this.hide);

        // Backdrop click
        this.elements.backdrop.addEventListener('click', this.handleBackdropClick);

        // Keyboard events
        document.addEventListener('keydown', this.handleKeydown);

        // Skill system events
        this.eventManager.on('skillSystem:skillUnlocked', () => {
            if (this.state.isOpen) {
                this.refresh();
            }
        });

        this.eventManager.on('skillSystem:skillLevelUp', () => {
            if (this.state.isOpen) {
                this.refresh();
            }
        });
    }

    /**
     * Set up accessibility features
     */
    _setupAccessibility() {
        // Trap focus within modal when open
        this.elements.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this._handleTabNavigation(e);
            }
        });

        // Set initial ARIA attributes
        this.elements.modal.setAttribute('aria-hidden', 'true');
    }

    /**
     * Load skill data from the skill system
     */
    async _loadSkillData(skillId) {
        try {
            if (!window.SkillData || !this.skillSystem.isReady()) {
                return;
            }

            this.state.currentSkill = skillId;

            // Get skill definition
            const skillDef = window.SkillData.SKILL_DEFINITIONS[skillId];
            if (!skillDef) {
                throw new Error(`Skill definition not found: ${skillId}`);
            }

            // Get current skill state from manager
            const skillManager = this.skillSystem.getSkillManager();
            const isUnlocked = skillManager._isSkillUnlocked(skillId);
            const currentLevel = skillManager._getSkillLevel(skillId);

            // Get category and rarity data
            const category = window.SkillData.SKILL_CATEGORIES[skillDef.category];
            const rarity = window.SkillData.SKILL_RARITIES[skillDef.rarity];

            // Calculate costs and affordability
            const costs = this._calculateCosts(skillDef, currentLevel);
            const canAfford = this._canAffordCosts(costs);
            const canUpgrade = isUnlocked && currentLevel < skillDef.maxLevel && canAfford;

            // Get evolution paths
            const evolutionPaths = this._getEvolutionPaths(skillId);

            // Get synergies
            const synergies = this._getSkillSynergies(skillId);

            // Store complete skill data
            this.state.skillData = {
                ...skillDef,
                category,
                rarity,
                isUnlocked,
                currentLevel,
                costs,
                canAfford,
                canUpgrade,
                evolutionPaths,
                synergies
            };

        } catch (error) {
            console.error('SkillDetailModal: Failed to load skill data:', error);
            this.state.skillData = null;
        }
    }

    /**
     * Render skill details in the modal
     */
    _renderSkillDetails() {
        if (!this.state.skillData) {
            return;
        }

        const skill = this.state.skillData;

        // Update header
        this.elements.skillIcon.textContent = skill.icon;
        this.elements.skillName.textContent = skill.name;
        this.elements.skillCategory.textContent = skill.category.name;
        this.elements.skillRarity.textContent = skill.rarity.name;
        this.elements.skillRarity.style.color = skill.rarity.color;

        // Update description
        this.elements.skillDescription.textContent = skill.description;

        // Update level info
        this._renderLevelInfo(skill);

        // Update effects table
        this._renderEffectsTable(skill);

        // Update costs
        this._renderCosts(skill);

        // Update action buttons
        this._renderActionButtons(skill);

        // Update evolution paths
        this._renderEvolutionPaths(skill);

        // Update synergies
        this._renderSynergies(skill);

        // Update tags
        this._renderTags(skill);
    }

    /**
     * Render level information
     */
    _renderLevelInfo(skill) {
        const levelDisplay = this.elements.levelInfo.querySelector('.level-display');
        const progressBar = this.elements.levelInfo.querySelector('.progress-fill');

        levelDisplay.querySelector('.current-level').textContent = skill.currentLevel;
        levelDisplay.querySelector('.max-level').textContent = skill.maxLevel;

        const progressPercent = (skill.currentLevel / skill.maxLevel) * 100;
        progressBar.style.width = `${progressPercent}%`;

        // Add level indicator classes
        this.elements.levelInfo.className = 'level-info';
        if (skill.currentLevel === 0) {
            this.elements.levelInfo.classList.add('level-zero');
        } else if (skill.currentLevel === skill.maxLevel) {
            this.elements.levelInfo.classList.add('level-max');
        }
    }

    /**
     * Render effects table
     */
    _renderEffectsTable(skill) {
        let effectsHTML = '<div class="effects-grid">';

        for (const [category, effects] of Object.entries(skill.effects)) {
            effectsHTML += `<div class="effect-category">
                <h4 class="effect-category-title">${this._formatCategoryName(category)}</h4>
                <div class="effect-list">`;

            for (const [effectType, effectData] of Object.entries(effects)) {
                const currentValue = this._calculateEffectValue(effectData, skill.currentLevel);
                const nextValue = skill.currentLevel < skill.maxLevel ?
                    this._calculateEffectValue(effectData, skill.currentLevel + 1) : null;

                effectsHTML += `
                    <div class="effect-item">
                        <span class="effect-name">${this._formatEffectName(effectType)}</span>
                        <span class="effect-value">
                            ${this._formatEffectValue(currentValue, effectType)}
                            ${nextValue !== null ? `
                                <span class="effect-next">
                                    → ${this._formatEffectValue(nextValue, effectType)}
                                </span>
                            ` : ''}
                        </span>
                    </div>
                `;
            }

            effectsHTML += '</div></div>';
        }

        effectsHTML += '</div>';
        this.elements.effectsTable.innerHTML = effectsHTML;
    }

    /**
     * Render action buttons
     */
    _renderActionButtons(skill) {
        let buttonsHTML = '';

        if (!skill.isUnlocked) {
            // Unlock button
            const canUnlock = this._canAffordUnlock(skill);
            buttonsHTML += `
                <button class="btn btn-primary ${canUnlock ? '' : 'disabled'}"
                        id="unlock-skill-btn"
                        ${canUnlock ? '' : 'disabled'}>
                    <span>🔓</span> Unlock Skill
                </button>
            `;
        } else if (skill.canUpgrade) {
            // Upgrade button
            buttonsHTML += `
                <button class="btn btn-primary" id="upgrade-skill-btn">
                    <span>⬆️</span> Upgrade (+1 Level)
                </button>
            `;
        }

        // Add to loadout button (if unlocked and not in loadout)
        if (skill.isUnlocked) {
            const inLoadout = this.skillSystem.isSkillInLoadout(skill.id);
            if (!inLoadout) {
                buttonsHTML += `
                    <button class="btn btn-secondary" id="add-to-loadout-btn">
                        <span>➕</span> Add to Loadout
                    </button>
                `;
            } else {
                buttonsHTML += `
                    <button class="btn btn-secondary" id="remove-from-loadout-btn">
                        <span>➖</span> Remove from Loadout
                    </button>
                `;
            }
        }

        // Cancel button
        buttonsHTML += `
            <button class="btn btn-tertiary" id="close-modal-btn">
                Close
            </button>
        `;

        this.elements.actionButtons.innerHTML = buttonsHTML;

        // Add event listeners to new buttons
        this._setupActionButtonListeners();
    }

    /**
     * Set up action button event listeners
     */
    _setupActionButtonListeners() {
        const unlockBtn = this.container.querySelector('#unlock-skill-btn');
        const upgradeBtn = this.container.querySelector('#upgrade-skill-btn');
        const addToLoadoutBtn = this.container.querySelector('#add-to-loadout-btn');
        const removeFromLoadoutBtn = this.container.querySelector('#remove-from-loadout-btn');
        const closeBtn = this.container.querySelector('#close-modal-btn');

        if (unlockBtn) {
            unlockBtn.addEventListener('click', this.handleUnlock);
        }

        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', this.handleUpgrade);
        }

        if (addToLoadoutBtn) {
            addToLoadoutBtn.addEventListener('click', () => {
                this._addToLoadout();
            });
        }

        if (removeFromLoadoutBtn) {
            removeFromLoadoutBtn.addEventListener('click', () => {
                this._removeFromLoadout();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', this.hide);
        }
    }

    /**
     * Handle skill unlock
     */
    async handleUnlock() {
        if (!this.state.skillData || this.state.skillData.isUnlocked) {
            return;
        }

        try {
            const result = await this.skillSystem.unlockSkill(this.state.currentSkill, {
                fragmentsCost: this.state.skillData.costs.fragments
            });

            if (result.success) {
                // Show success notification
                this._showNotification('Skill unlocked successfully!', 'success');

                // Refresh modal
                await this.refresh();

                // Emit unlock event
                this.eventManager.emit('skillDetailModal:skillUnlocked', {
                    skillId: this.state.currentSkill,
                    skill: result.skill
                });

            } else {
                this._showNotification(result.error, 'error');
            }

        } catch (error) {
            console.error('SkillDetailModal: Unlock failed:', error);
            this._showNotification('Failed to unlock skill', 'error');
        }
    }

    /**
     * Handle skill upgrade
     */
    async handleUpgrade() {
        if (!this.state.skillData || !this.state.skillData.canUpgrade) {
            return;
        }

        try {
            const result = await this.skillSystem.levelUpSkill(this.state.currentSkill, {
                skillPointsCost: this.state.skillData.costs.skillPoints
            });

            if (result.success) {
                // Show success notification
                this._showNotification(`Skill upgraded to level ${result.newLevel}!`, 'success');

                // Refresh modal
                await this.refresh();

                // Emit upgrade event
                this.eventManager.emit('skillDetailModal:skillUpgraded', {
                    skillId: this.state.currentSkill,
                    newLevel: result.newLevel,
                    skill: result.skill
                });

            } else {
                this._showNotification(result.error, 'error');
            }

        } catch (error) {
            console.error('SkillDetailModal: Upgrade failed:', error);
            this._showNotification('Failed to upgrade skill', 'error');
        }
    }

    // Event handlers
    handleBackdropClick(e) {
        if (e.target === this.elements.backdrop) {
            this.hide();
        }
    }

    handleKeydown(e) {
        if (!this.state.isOpen) {
            return;
        }

        if (e.key === 'Escape') {
            this.hide();
        }
    }

    // Animation methods
    async _animateIn() {
        if (this.animationManager) {
            await this.animationManager.slideUp(this.elements.modal.querySelector('.modal-content'), this.animationDuration);
        }
    }

    async _animateOut() {
        if (this.animationManager) {
            await this.animationManager.slideDown(this.elements.modal.querySelector('.modal-content'), this.animationDuration);
        }
    }

    // Helper methods (placeholder implementations)
    _calculateCosts(skillDef, currentLevel) { return { fragments: 10, skillPoints: 5 }; }
    _canAffordCosts(costs) { return true; }
    _canAffordUnlock(skill) { return true; }
    _getEvolutionPaths(skillId) { return []; }
    _getSkillSynergies(skillId) { return []; }
    _calculateEffectValue(effectData, level) { return 0; }
    _formatCategoryName(category) { return category; }
    _formatEffectName(effectType) { return effectType; }
    _formatEffectValue(value, effectType) { return value.toString(); }
    _renderCosts(skill) { /* Implementation */ }
    _renderEvolutionPaths(skill) { /* Implementation */ }
    _renderSynergies(skill) { /* Implementation */ }
    _renderTags(skill) { /* Implementation */ }
    _addToLoadout() { /* Implementation */ }
    _removeFromLoadout() { /* Implementation */ }
    _showNotification(message, type) { /* Implementation */ }
    _focusFirstElement() { /* Implementation */ }
    _handleTabNavigation(e) { /* Implementation */ }
}

// Export
if (typeof window !== 'undefined') {
    window.SkillDetailModal = SkillDetailModal;
}