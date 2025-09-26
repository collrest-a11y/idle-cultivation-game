/**
 * SkillTreeComponent - Interactive skill tree interface with drag-and-drop loadout management
 * Provides comprehensive skill management with visual feedback and accessibility
 */
class SkillTreeComponent extends BaseComponent {
    constructor(container, eventManager, skillSystem) {
        super(container, { id: 'skill-tree', eventManager, skillSystem });

        this.eventManager = eventManager;
        this.skillSystem = skillSystem;

        // Component state
        this.state = {
            selectedCategory: 'all',
            selectedSkill: null,
            loadout: [],
            availableSkills: new Map(),
            skillData: new Map(),
            filter: 'all',
            sortBy: 'rarity',
            showOnlyUnlocked: false
        };

        // UI references
        this.elements = {
            categoryTabs: null,
            filterControls: null,
            skillGrid: null,
            loadoutSlots: null,
            skillDetails: null,
            synergyDisplay: null,
            progressBars: null
        };

        // Animation and performance
        this.animationManager = window.animationManager;
        this.lastRenderTime = 0;
        this.renderThrottle = 16; // 60fps

        // Accessibility
        this.isKeyboardNavigating = false;
        this.focusedElement = null;

        // Bind methods
        this.handleSkillClick = this.handleSkillClick.bind(this);
        this.handleLoadoutDrop = this.handleLoadoutDrop.bind(this);
        this.handleCategoryChange = this.handleCategoryChange.bind(this);
        this.handleKeyboardNavigation = this.handleKeyboardNavigation.bind(this);

        console.log('SkillTreeComponent: Initialized');
    }

    /**
     * Create the component's DOM element (required by BaseComponent)
     */
    createElement() {
        // Create container element
        this.element = document.createElement('div');
        this.element.className = 'skill-tree-component';
        this.element.id = 'skill-tree-component';
    }

    /**
     * Render the component (required by BaseComponent)
     */
    render() {
        if (this.element && this.skillData) {
            this._createSkillTreeUI();
        }
    }

    /**
     * Initialize the skill tree component
     */
    async initialize() {
        try {
            // Don't call super.initialize() as it expects different behavior
            this.isInitialized = false;

            // Load skill data
            await this._loadSkillData();

            // Create the UI structure
            this._createSkillTreeUI();

            // Set up event listeners
            this._setupEventListeners();

            // Set up accessibility
            this._setupAccessibility();

            // Initial render
            await this._refreshSkillData();

            this.isInitialized = true;
            console.log('SkillTreeComponent: Initialization complete');

        } catch (error) {
            console.error('SkillTreeComponent: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Update component state and UI
     */
    update(deltaTime) {
        if (!this.isInitialized) return;

        // Throttle updates for performance
        const now = performance.now();
        if (now - this.lastRenderTime < this.renderThrottle) {
            return;
        }

        try {
            // Update skill progress animations
            this._updateProgressAnimations();

            // Update synergy highlights
            this._updateSynergyHighlights();

            // Update loadout validation
            this._updateLoadoutValidation();

            this.lastRenderTime = now;

        } catch (error) {
            console.error('SkillTreeComponent: Update failed:', error);
        }
    }

    /**
     * Refresh skill data from skill system
     */
    async refreshData() {
        if (!this.skillSystem.isReady()) {
            return;
        }

        try {
            await this._refreshSkillData();
            this._renderSkillGrid();
            this._renderLoadout();
            this._updateSynergyDisplay();

        } catch (error) {
            console.error('SkillTreeComponent: Data refresh failed:', error);
        }
    }

    /**
     * Set selected skill and show details
     * @param {string} skillId - ID of the skill to select
     */
    selectSkill(skillId) {
        const skill = this.state.skillData.get(skillId);
        if (!skill) return;

        this.state.selectedSkill = skillId;
        this._renderSkillDetails(skill);
        this._highlightSkillInGrid(skillId);

        // Emit selection event
        this.eventManager.emit('skillTree:skillSelected', {
            skillId,
            skill,
            timestamp: Date.now()
        });
    }

    /**
     * Add skill to loadout
     * @param {string} skillId - ID of the skill to add
     * @returns {boolean} Whether the skill was added successfully
     */
    addToLoadout(skillId) {
        if (this.state.loadout.length >= this._getMaxLoadoutSize()) {
            this._showNotification('Loadout is full', 'warning');
            return false;
        }

        if (this.state.loadout.includes(skillId)) {
            this._showNotification('Skill already in loadout', 'warning');
            return false;
        }

        const skill = this.state.skillData.get(skillId);
        if (!skill || !skill.isUnlocked) {
            this._showNotification('Skill is not unlocked', 'error');
            return false;
        }

        this.state.loadout.push(skillId);
        this._updateLoadout();
        return true;
    }

    /**
     * Remove skill from loadout
     * @param {string} skillId - ID of the skill to remove
     */
    removeFromLoadout(skillId) {
        const index = this.state.loadout.indexOf(skillId);
        if (index !== -1) {
            this.state.loadout.splice(index, 1);
            this._updateLoadout();
        }
    }

    // Private methods

    /**
     * Load skill data from SkillData
     */
    async _loadSkillData() {
        if (typeof window.SkillData === 'undefined') {
            throw new Error('SkillData not loaded');
        }

        this.skillData = window.SkillData;
        console.log('SkillTreeComponent: Skill data loaded');
    }

    /**
     * Create the main UI structure
     */
    _createSkillTreeUI() {
        this.container.innerHTML = `
            <div class="skill-tree-container">
                <!-- Header with category tabs and filters -->
                <div class="skill-tree-header">
                    <div class="category-tabs" role="tablist" aria-label="Skill Categories">
                        <button class="category-tab active" data-category="all" role="tab" aria-selected="true">
                            <span class="tab-icon">📋</span>
                            <span class="tab-text">All Skills</span>
                        </button>
                        ${Object.values(this.skillData.SKILL_CATEGORIES).map(category => `
                            <button class="category-tab" data-category="${category.id}" role="tab" aria-selected="false">
                                <span class="tab-icon">${category.icon}</span>
                                <span class="tab-text">${category.name}</span>
                            </button>
                        `).join('')}
                    </div>

                    <div class="filter-controls">
                        <div class="filter-group">
                            <label for="skill-filter">Filter:</label>
                            <select id="skill-filter" class="filter-select">
                                <option value="all">All Skills</option>
                                <option value="unlocked">Unlocked Only</option>
                                <option value="affordable">Can Afford</option>
                                <option value="in-loadout">In Loadout</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="skill-sort">Sort by:</label>
                            <select id="skill-sort" class="filter-select">
                                <option value="rarity">Rarity</option>
                                <option value="level">Level</option>
                                <option value="category">Category</option>
                                <option value="name">Name</option>
                            </select>
                        </div>

                        <button class="btn btn-secondary btn-small" id="refresh-skills">
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>

                <!-- Main content area -->
                <div class="skill-tree-content">
                    <!-- Left panel: Skill grid -->
                    <div class="skill-grid-panel">
                        <div class="skill-grid" role="grid" aria-label="Available Skills">
                            <!-- Skills will be populated here -->
                        </div>
                    </div>

                    <!-- Center panel: Skill details -->
                    <div class="skill-details-panel">
                        <div class="skill-details" id="skill-details">
                            <div class="no-selection">
                                <div class="no-selection-icon">✋</div>
                                <h3>Select a Skill</h3>
                                <p>Click on a skill to view its details, effects, and upgrade information.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Right panel: Loadout and synergies -->
                    <div class="loadout-panel">
                        <div class="loadout-section">
                            <div class="loadout-header">
                                <h3>Active Loadout</h3>
                                <span class="loadout-count">
                                    <span id="loadout-count">0</span>/<span id="max-loadout">6</span>
                                </span>
                            </div>

                            <div class="loadout-slots" id="loadout-slots" role="list" aria-label="Skill Loadout">
                                <!-- Loadout slots will be populated here -->
                            </div>

                            <div class="loadout-actions">
                                <button class="btn btn-secondary btn-small" id="clear-loadout">
                                    Clear All
                                </button>
                                <button class="btn btn-primary btn-small" id="optimize-loadout">
                                    Auto-Optimize
                                </button>
                            </div>
                        </div>

                        <div class="synergy-section">
                            <h3>Active Synergies</h3>
                            <div class="synergy-list" id="synergy-list">
                                <div class="no-synergies">
                                    <p>No active synergies</p>
                                    <small>Combine compatible skills to unlock powerful synergy effects!</small>
                                </div>
                            </div>
                        </div>

                        <div class="loadout-stats">
                            <h4>Total Effects</h4>
                            <div class="effect-summary" id="effect-summary">
                                <!-- Effect totals will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Cache element references
        this.elements = {
            categoryTabs: this.container.querySelectorAll('.category-tab'),
            filterControls: this.container.querySelector('.filter-controls'),
            skillGrid: this.container.querySelector('.skill-grid'),
            loadoutSlots: this.container.querySelector('#loadout-slots'),
            skillDetails: this.container.querySelector('#skill-details'),
            synergyDisplay: this.container.querySelector('#synergy-list'),
            effectSummary: this.container.querySelector('#effect-summary')
        };
    }

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Category tab clicks
        this.elements.categoryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.handleCategoryChange(category);
            });
        });

        // Filter controls
        const filterSelect = this.container.querySelector('#skill-filter');
        const sortSelect = this.container.querySelector('#skill-sort');

        filterSelect.addEventListener('change', (e) => {
            this.state.filter = e.target.value;
            this._renderSkillGrid();
        });

        sortSelect.addEventListener('change', (e) => {
            this.state.sortBy = e.target.value;
            this._renderSkillGrid();
        });

        // Refresh button
        const refreshBtn = this.container.querySelector('#refresh-skills');
        refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });

        // Loadout actions
        const clearBtn = this.container.querySelector('#clear-loadout');
        const optimizeBtn = this.container.querySelector('#optimize-loadout');

        clearBtn.addEventListener('click', () => {
            this._clearLoadout();
        });

        optimizeBtn.addEventListener('click', () => {
            this._optimizeLoadout();
        });

        // Skill system events
        this.eventManager.on('skillSystem:skillUnlocked', () => {
            this.refreshData();
        });

        this.eventManager.on('skillSystem:skillLevelUp', () => {
            this.refreshData();
        });

        this.eventManager.on('skillSystem:loadoutChanged', () => {
            this.refreshData();
        });
    }

    /**
     * Set up accessibility features
     */
    _setupAccessibility() {
        // Keyboard navigation
        this.container.addEventListener('keydown', this.handleKeyboardNavigation);

        // Focus management
        this.container.addEventListener('focusin', (e) => {
            this.isKeyboardNavigating = true;
            this.focusedElement = e.target;
        });

        this.container.addEventListener('focusout', (e) => {
            if (!this.container.contains(e.relatedTarget)) {
                this.isKeyboardNavigating = false;
                this.focusedElement = null;
            }
        });

        // Screen reader announcements
        this._createAriaLiveRegion();
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(e) {
        if (!this.isKeyboardNavigating) return;

        switch (e.key) {
            case 'Enter':
            case ' ':
                if (e.target.classList.contains('skill-card')) {
                    e.preventDefault();
                    this.handleSkillClick(e);
                }
                break;

            case 'ArrowRight':
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'ArrowDown':
                this._handleArrowNavigation(e);
                break;

            case 'Escape':
                this._clearSelection();
                break;
        }
    }

    /**
     * Handle category change
     */
    handleCategoryChange(category) {
        // Update active tab
        this.elements.categoryTabs.forEach(tab => {
            const isActive = tab.dataset.category === category;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive);
        });

        this.state.selectedCategory = category;
        this._renderSkillGrid();

        // Announce to screen readers
        this._announceToScreenReader(`Switched to ${category === 'all' ? 'all skills' : category + ' category'}`);
    }

    /**
     * Handle skill card click
     */
    handleSkillClick(e) {
        const skillCard = e.currentTarget;
        const skillId = skillCard.dataset.skillId;

        if (!skillId) return;

        // Handle different click actions based on modifiers
        if (e.ctrlKey || e.metaKey) {
            // Add/remove from loadout
            if (this.state.loadout.includes(skillId)) {
                this.removeFromLoadout(skillId);
            } else {
                this.addToLoadout(skillId);
            }
        } else {
            // Select skill for details
            this.selectSkill(skillId);
        }
    }

    /**
     * Refresh skill data from the skill system
     */
    async _refreshSkillData() {
        if (!this.skillSystem.isReady()) {
            return;
        }

        try {
            // Get current loadout
            this.state.loadout = this.skillSystem.getCurrentLoadout();

            // Get skill data from manager
            const skillManager = this.skillSystem.getSkillManager();

            // Update available skills map
            this.state.availableSkills.clear();
            this.state.skillData.clear();

            for (const [skillId, skillDef] of Object.entries(this.skillData.SKILL_DEFINITIONS)) {
                // Get current skill state
                const isUnlocked = skillManager._isSkillUnlocked(skillId);
                const currentLevel = skillManager._getSkillLevel(skillId);
                const isInLoadout = this.state.loadout.includes(skillId);

                const skillData = {
                    ...skillDef,
                    isUnlocked,
                    currentLevel,
                    isInLoadout,
                    canAfford: this._canAffordSkill(skillId),
                    canUpgrade: this._canUpgradeSkill(skillId),
                    effects: this._calculateSkillEffects(skillDef, currentLevel)
                };

                this.state.skillData.set(skillId, skillData);
                this.state.availableSkills.set(skillId, skillData);
            }

        } catch (error) {
            console.error('SkillTreeComponent: Failed to refresh skill data:', error);
        }
    }

    /**
     * Render the skill grid
     */
    _renderSkillGrid() {
        if (!this.elements.skillGrid) return;

        // Filter skills based on current settings
        const filteredSkills = this._getFilteredSkills();

        // Sort skills
        const sortedSkills = this._sortSkills(filteredSkills);

        // Generate skill cards HTML
        const skillCardsHTML = sortedSkills.map(skill => this._createSkillCardHTML(skill)).join('');

        this.elements.skillGrid.innerHTML = skillCardsHTML;

        // Add event listeners to skill cards
        this.elements.skillGrid.querySelectorAll('.skill-card').forEach(card => {
            card.addEventListener('click', this.handleSkillClick);

            // Add drag support for loadout management
            this._setupSkillCardDrag(card);
        });

        // Update accessibility attributes
        this.elements.skillGrid.setAttribute('aria-rowcount', Math.ceil(sortedSkills.length / 4));
    }

    /**
     * Create HTML for a skill card
     */
    _createSkillCardHTML(skill) {
        const rarity = this.skillData.SKILL_RARITIES[skill.rarity];
        const category = this.skillData.SKILL_CATEGORIES[skill.category];

        return `
            <div class="skill-card ${skill.rarity} ${skill.isUnlocked ? 'unlocked' : 'locked'} ${skill.isInLoadout ? 'in-loadout' : ''}"
                 data-skill-id="${skill.id}"
                 role="gridcell"
                 tabindex="0"
                 aria-label="${skill.name} - ${rarity.name} ${category.name} skill"
                 draggable="${skill.isUnlocked}">

                <div class="skill-card-header">
                    <div class="skill-icon">${skill.icon}</div>
                    <div class="skill-rarity-indicator" style="background-color: ${rarity.color}"></div>
                    ${skill.isInLoadout ? '<div class="in-loadout-indicator">✓</div>' : ''}
                </div>

                <div class="skill-card-content">
                    <h4 class="skill-name">${skill.name}</h4>
                    <div class="skill-category">${category.name}</div>

                    <div class="skill-level">
                        Level ${skill.currentLevel}/${skill.maxLevel}
                        ${skill.currentLevel > 0 ? `
                            <div class="skill-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(skill.currentLevel / skill.maxLevel) * 100}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="skill-description">${skill.description}</div>

                    ${!skill.isUnlocked ? `
                        <div class="unlock-cost">
                            💎 ${this._getSkillCost(skill.id)} fragments
                        </div>
                    ` : skill.canUpgrade ? `
                        <div class="upgrade-cost">
                            ⭐ ${this._getUpgradeCost(skill.id)} skill points
                        </div>
                    ` : ''}
                </div>

                <div class="skill-card-footer">
                    <div class="skill-tags">
                        ${skill.tags.map(tag => `<span class="skill-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get filtered skills based on current filter settings
     */
    _getFilteredSkills() {
        let skills = Array.from(this.state.skillData.values());

        // Filter by category
        if (this.state.selectedCategory !== 'all') {
            skills = skills.filter(skill => skill.category === this.state.selectedCategory);
        }

        // Apply additional filters
        switch (this.state.filter) {
            case 'unlocked':
                skills = skills.filter(skill => skill.isUnlocked);
                break;
            case 'affordable':
                skills = skills.filter(skill => skill.canAfford);
                break;
            case 'in-loadout':
                skills = skills.filter(skill => skill.isInLoadout);
                break;
        }

        return skills;
    }

    /**
     * Sort skills based on current sort setting
     */
    _sortSkills(skills) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'transcendent'];

        return skills.sort((a, b) => {
            switch (this.state.sortBy) {
                case 'rarity':
                    return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
                case 'level':
                    return b.currentLevel - a.currentLevel;
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'name':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    }

    /**
     * Additional helper methods for skill management, loadout handling, etc.
     * (Implementation continues with remaining methods...)
     */

    // Placeholder implementations for helper methods
    _canAffordSkill(skillId) { return true; }
    _canUpgradeSkill(skillId) { return true; }
    _calculateSkillEffects(skillDef, level) { return {}; }
    _getSkillCost(skillId) { return 10; }
    _getUpgradeCost(skillId) { return 5; }
    _getMaxLoadoutSize() { return 6; }
    _updateLoadout() { /* Implementation */ }
    _clearLoadout() { /* Implementation */ }
    _optimizeLoadout() { /* Implementation */ }
    _showNotification(message, type) { /* Implementation */ }
    _announceToScreenReader(message) { /* Implementation */ }
    _createAriaLiveRegion() { /* Implementation */ }

    // ... (Additional methods would continue here)
}

// Export
if (typeof window !== 'undefined') {
    window.SkillTreeComponent = SkillTreeComponent;
}