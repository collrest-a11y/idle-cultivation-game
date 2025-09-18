/**
 * ScriptureView - Manage scripture collection, gacha, and study interface
 * Displays scripture inventory, equipped scriptures, gacha system, and enhancement interface
 */
class ScriptureView extends GameView {
    constructor(container, options = {}) {
        super(container, options);

        // System references
        this.scriptureManager = null;
        this.gachaSystem = null;
        this.enhancementSystem = null;

        // UI components
        this.collectionPanel = null;
        this.equippedPanel = null;
        this.gachaPanel = null;
        this.enhancementPanel = null;
        this.detailsPanel = null;

        // Current data
        this.scriptureCollection = null;
        this.equippedScriptures = null;
        this.selectedScripture = null;

        // View state
        this.currentTab = 'collection';
        this.sortBy = 'power';
        this.filterBy = { rarity: 'all', category: 'all' };

        this.refreshRate = 3000; // 3 seconds
    }

    /**
     * Create main content area
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content scripture-content';

        // Create tab navigation
        const tabNav = this.createTabNavigation();
        content.appendChild(tabNav);

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'scripture-layout';

        // Left column - Collection and Details
        const leftColumn = document.createElement('div');
        leftColumn.className = 'scripture-left-column';

        // Right column - Equipped and Actions
        const rightColumn = document.createElement('div');
        rightColumn.className = 'scripture-right-column';

        // Create panels
        this.collectionPanel = this.createCollectionPanel();
        this.equippedPanel = this.createEquippedPanel();
        this.gachaPanel = this.createGachaPanel();
        this.enhancementPanel = this.createEnhancementPanel();
        this.detailsPanel = this.createDetailsPanel();

        // Organize panels
        leftColumn.appendChild(this.collectionPanel);
        leftColumn.appendChild(this.detailsPanel);

        rightColumn.appendChild(this.equippedPanel);
        rightColumn.appendChild(this.gachaPanel);
        rightColumn.appendChild(this.enhancementPanel);

        layout.appendChild(leftColumn);
        layout.appendChild(rightColumn);
        content.appendChild(layout);

        return content;
    }

    /**
     * Create tab navigation
     */
    createTabNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'scripture-tabs';

        const tabs = [
            { id: 'collection', label: 'Collection', icon: 'icon-library' },
            { id: 'gacha', label: 'Scripture Gacha', icon: 'icon-dice' },
            { id: 'enhancement', label: 'Enhancement', icon: 'icon-star' }
        ];

        tabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.className = `tab-button ${tab.id === this.currentTab ? 'active' : ''}`;
            tabButton.dataset.tab = tab.id;
            tabButton.innerHTML = `<span class="${tab.icon}"></span> ${tab.label}`;

            tabButton.addEventListener('click', () => this.switchTab(tab.id));
            nav.appendChild(tabButton);
        });

        return nav;
    }

    /**
     * Create collection panel
     */
    createCollectionPanel() {
        const panel = document.createElement('div');
        panel.className = 'scripture-panel collection-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-library"></span> Scripture Collection</h3>
            <div class="collection-controls">
                <select class="sort-select">
                    <option value="power">Sort by Power</option>
                    <option value="rarity">Sort by Rarity</option>
                    <option value="level">Sort by Level</option>
                    <option value="name">Sort by Name</option>
                </select>
                <select class="filter-select">
                    <option value="all">All Rarities</option>
                    <option value="legendary">Legendary</option>
                    <option value="epic">Epic</option>
                    <option value="rare">Rare</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="common">Common</option>
                </select>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content collection-content';

        // Scripture grid
        const scriptureGrid = document.createElement('div');
        scriptureGrid.className = 'scripture-grid';
        content.appendChild(scriptureGrid);

        // Collection stats
        const collectionStats = document.createElement('div');
        collectionStats.className = 'collection-stats';
        content.appendChild(collectionStats);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const sortSelect = header.querySelector('.sort-select');
        const filterSelect = header.querySelector('.filter-select');

        sortSelect.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.renderCollection();
        });

        filterSelect.addEventListener('change', (e) => {
            this.filterBy.rarity = e.target.value;
            this.renderCollection();
        });

        return panel;
    }

    /**
     * Create equipped panel
     */
    createEquippedPanel() {
        const panel = document.createElement('div');
        panel.className = 'scripture-panel equipped-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-equipped"></span> Equipped Scriptures';

        const content = document.createElement('div');
        content.className = 'panel-content equipped-content';

        // Equipment slots
        const slots = [
            { id: 'primary', name: 'Primary Scripture', description: 'Main cultivation scripture' },
            { id: 'secondary', name: 'Secondary Scripture', description: 'Support cultivation scripture' },
            { id: 'passive1', name: 'Passive I', description: 'First passive effect' },
            { id: 'passive2', name: 'Passive II', description: 'Second passive effect' },
            { id: 'passive3', name: 'Passive III', description: 'Third passive effect' }
        ];

        slots.forEach(slot => {
            const slotElement = this.createEquipmentSlot(slot);
            content.appendChild(slotElement);
        });

        // Total effects summary
        const effectsSummary = document.createElement('div');
        effectsSummary.className = 'effects-summary';
        content.appendChild(effectsSummary);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create equipment slot
     */
    createEquipmentSlot(slot) {
        const slotElement = document.createElement('div');
        slotElement.className = 'equipment-slot';
        slotElement.dataset.slotId = slot.id;

        slotElement.innerHTML = `
            <div class="slot-header">
                <div class="slot-name">${slot.name}</div>
                <div class="slot-description">${slot.description}</div>
            </div>
            <div class="slot-content">
                <div class="empty-slot">
                    <span class="icon-plus"></span>
                    <span>Empty Slot</span>
                </div>
            </div>
            <div class="slot-actions">
                <button class="btn btn-secondary btn-sm equip-btn" style="display: none;">Equip</button>
                <button class="btn btn-outline btn-sm unequip-btn" style="display: none;">Unequip</button>
            </div>
        `;

        // Add click handler for equipping
        slotElement.addEventListener('click', () => {
            if (this.selectedScripture) {
                this.equipScripture(this.selectedScripture.id, slot.id);
            }
        });

        return slotElement;
    }

    /**
     * Create gacha panel
     */
    createGachaPanel() {
        const panel = document.createElement('div');
        panel.className = 'scripture-panel gacha-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-dice"></span> Scripture Gacha';

        const content = document.createElement('div');
        content.className = 'panel-content gacha-content';

        // Gacha options
        const gachaOptions = document.createElement('div');
        gachaOptions.className = 'gacha-options';

        const singlePull = this.createGachaOption({
            id: 'single',
            name: 'Single Pull',
            cost: 100,
            currency: 'jade',
            description: '1 scripture, guaranteed Common or better'
        });

        const tenPull = this.createGachaOption({
            id: 'ten',
            name: '10-Pull',
            cost: 900,
            currency: 'jade',
            description: '10 scriptures, guaranteed Rare or better',
            discount: '10% discount'
        });

        const premiumPull = this.createGachaOption({
            id: 'premium',
            name: 'Premium Pull',
            cost: 50,
            currency: 'crystals',
            description: '1 scripture, guaranteed Uncommon or better'
        });

        gachaOptions.appendChild(singlePull);
        gachaOptions.appendChild(tenPull);
        gachaOptions.appendChild(premiumPull);

        // Rate display
        const rateDisplay = document.createElement('div');
        rateDisplay.className = 'gacha-rates';
        rateDisplay.innerHTML = `
            <h4>Drop Rates</h4>
            <div class="rate-list">
                <div class="rate-item legendary">Legendary: 1%</div>
                <div class="rate-item epic">Epic: 4%</div>
                <div class="rate-item rare">Rare: 15%</div>
                <div class="rate-item uncommon">Uncommon: 30%</div>
                <div class="rate-item common">Common: 50%</div>
            </div>
        `;

        content.appendChild(gachaOptions);
        content.appendChild(rateDisplay);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create gacha option
     */
    createGachaOption(option) {
        const element = document.createElement('div');
        element.className = 'gacha-option';

        element.innerHTML = `
            <div class="option-header">
                <div class="option-name">${option.name}</div>
                ${option.discount ? `<div class="option-discount">${option.discount}</div>` : ''}
            </div>
            <div class="option-cost">
                <span class="cost-amount">${option.cost}</span>
                <span class="cost-currency icon-${option.currency}"></span>
            </div>
            <div class="option-description">${option.description}</div>
            <button class="btn btn-primary pull-btn" data-pull-type="${option.id}">
                Pull
            </button>
        `;

        // Add click handler
        const pullButton = element.querySelector('.pull-btn');
        pullButton.addEventListener('click', () => this.performGacha(option.id));

        return element;
    }

    /**
     * Create enhancement panel
     */
    createEnhancementPanel() {
        const panel = document.createElement('div');
        panel.className = 'scripture-panel enhancement-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-star"></span> Scripture Enhancement';

        const content = document.createElement('div');
        content.className = 'panel-content enhancement-content';

        // Selected scripture for enhancement
        const selectedSection = document.createElement('div');
        selectedSection.className = 'enhancement-selected';
        selectedSection.innerHTML = `
            <div class="selected-label">Select scripture to enhance:</div>
            <div class="selected-scripture">
                <div class="no-selection">No scripture selected</div>
            </div>
        `;

        // Enhancement options
        const enhancementOptions = document.createElement('div');
        enhancementOptions.className = 'enhancement-options';

        const levelUpOption = this.createEnhancementOption({
            id: 'levelup',
            name: 'Level Up',
            description: 'Increase scripture level and power',
            icon: 'icon-arrow-up'
        });

        const awakenOption = this.createEnhancementOption({
            id: 'awaken',
            name: 'Awaken',
            description: 'Unlock additional effects and higher level cap',
            icon: 'icon-star'
        });

        enhancementOptions.appendChild(levelUpOption);
        enhancementOptions.appendChild(awakenOption);

        content.appendChild(selectedSection);
        content.appendChild(enhancementOptions);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create enhancement option
     */
    createEnhancementOption(option) {
        const element = document.createElement('div');
        element.className = 'enhancement-option';

        element.innerHTML = `
            <div class="option-icon">
                <span class="${option.icon}"></span>
            </div>
            <div class="option-info">
                <div class="option-name">${option.name}</div>
                <div class="option-description">${option.description}</div>
                <div class="option-cost"></div>
            </div>
            <button class="btn btn-primary enhance-btn" data-enhance-type="${option.id}" disabled>
                ${option.name}
            </button>
        `;

        // Add click handler
        const enhanceButton = element.querySelector('.enhance-btn');
        enhanceButton.addEventListener('click', () => this.performEnhancement(option.id));

        return element;
    }

    /**
     * Create details panel
     */
    createDetailsPanel() {
        const panel = document.createElement('div');
        panel.className = 'scripture-panel details-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-info"></span> Scripture Details';

        const content = document.createElement('div');
        content.className = 'panel-content details-content';

        const noSelection = document.createElement('div');
        noSelection.className = 'no-selection';
        noSelection.innerHTML = `
            <div class="selection-prompt">
                <span class="icon-click"></span>
                <p>Select a scripture to view details</p>
            </div>
        `;

        content.appendChild(noSelection);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab buttons
        const tabButtons = this.element.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });

        // Show/hide panels based on tab
        this.updatePanelVisibility();
    }

    /**
     * Update panel visibility based on current tab
     */
    updatePanelVisibility() {
        const panels = {
            collection: [this.collectionPanel, this.detailsPanel, this.equippedPanel],
            gacha: [this.gachaPanel],
            enhancement: [this.enhancementPanel, this.detailsPanel]
        };

        // Hide all panels
        [this.collectionPanel, this.equippedPanel, this.gachaPanel, this.enhancementPanel, this.detailsPanel]
            .forEach(panel => panel.style.display = 'none');

        // Show panels for current tab
        const activePanels = panels[this.currentTab] || [];
        activePanels.forEach(panel => panel.style.display = 'block');
    }

    /**
     * Load scripture data
     */
    async loadData() {
        try {
            // Get system references (these would be properly integrated in a real implementation)
            this.scriptureManager = window.scriptureManager; // Placeholder
            this.gachaSystem = window.gachaSystem; // Placeholder
            this.enhancementSystem = window.enhancementSystem; // Placeholder

            // Load scripture collection
            this.scriptureCollection = this.scriptureManager?.getCollection() || [];
            this.equippedScriptures = this.scriptureManager?.getEquipped() || {};

            console.log('ScriptureView: Data loaded successfully');

        } catch (error) {
            console.error('ScriptureView: Failed to load data', error);
            // Create mock data for development
            this.createMockData();
        }
    }

    /**
     * Create mock data for development
     */
    createMockData() {
        this.scriptureCollection = [
            {
                id: 'basic_qi_gathering',
                name: 'Basic Qi Gathering Manual',
                rarity: 'common',
                level: 5,
                maxLevel: 20,
                power: 150,
                category: 'cultivation',
                effects: [
                    { type: 'qi_speed', value: '+15% Qi cultivation speed' },
                    { type: 'qi_capacity', value: '+10% Qi capacity' }
                ]
            },
            {
                id: 'iron_body_technique',
                name: 'Iron Body Technique',
                rarity: 'uncommon',
                level: 3,
                maxLevel: 40,
                power: 280,
                category: 'body',
                effects: [
                    { type: 'body_strength', value: '+20% Body strength' },
                    { type: 'defense', value: '+15% Defense' }
                ]
            }
        ];

        this.equippedScriptures = {
            primary: null,
            secondary: null,
            passive1: this.scriptureCollection[0],
            passive2: null,
            passive3: null
        };
    }

    /**
     * Render view content
     */
    renderContent() {
        this.renderCollection();
        this.renderEquipped();
        this.renderGacha();
        this.renderEnhancement();
        this.updatePanelVisibility();
    }

    /**
     * Render scripture collection
     */
    renderCollection() {
        const scriptureGrid = this.collectionPanel.querySelector('.scripture-grid');
        const collectionStats = this.collectionPanel.querySelector('.collection-stats');

        if (!scriptureGrid || !this.scriptureCollection) return;

        // Clear existing content
        scriptureGrid.innerHTML = '';

        // Filter and sort scriptures
        let filteredScriptures = [...this.scriptureCollection];

        if (this.filterBy.rarity !== 'all') {
            filteredScriptures = filteredScriptures.filter(s => s.rarity === this.filterBy.rarity);
        }

        // Sort scriptures
        filteredScriptures.sort((a, b) => {
            switch (this.sortBy) {
                case 'power': return b.power - a.power;
                case 'rarity': return this.getRarityOrder(b.rarity) - this.getRarityOrder(a.rarity);
                case 'level': return b.level - a.level;
                case 'name': return a.name.localeCompare(b.name);
                default: return 0;
            }
        });

        // Render scriptures
        filteredScriptures.forEach(scripture => {
            const scriptureElement = this.createScriptureCard(scripture);
            scriptureGrid.appendChild(scriptureElement);
        });

        // Render collection stats
        this.renderCollectionStats(collectionStats);
    }

    /**
     * Create scripture card
     */
    createScriptureCard(scripture) {
        const card = document.createElement('div');
        card.className = `scripture-card rarity-${scripture.rarity} ${this.selectedScripture?.id === scripture.id ? 'selected' : ''}`;
        card.dataset.scriptureId = scripture.id;

        card.innerHTML = `
            <div class="scripture-header">
                <div class="scripture-name">${scripture.name}</div>
                <div class="scripture-rarity">${this.capitalizeFirst(scripture.rarity)}</div>
            </div>
            <div class="scripture-stats">
                <div class="stat-item">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${scripture.level}/${scripture.maxLevel}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Power:</span>
                    <span class="stat-value">${scripture.power}</span>
                </div>
            </div>
            <div class="scripture-effects">
                ${scripture.effects.map(effect => `
                    <div class="effect-item">${effect.value}</div>
                `).join('')}
            </div>
        `;

        // Add click handler
        card.addEventListener('click', () => {
            this.selectScripture(scripture);
        });

        return card;
    }

    /**
     * Render equipped scriptures
     */
    renderEquipped() {
        if (!this.equippedScriptures) return;

        Object.entries(this.equippedScriptures).forEach(([slotId, scripture]) => {
            const slotElement = this.equippedPanel.querySelector(`[data-slot-id="${slotId}"]`);
            if (!slotElement) return;

            const slotContent = slotElement.querySelector('.slot-content');
            const unequipBtn = slotElement.querySelector('.unequip-btn');

            if (scripture) {
                slotContent.innerHTML = `
                    <div class="equipped-scripture rarity-${scripture.rarity}">
                        <div class="scripture-name">${scripture.name}</div>
                        <div class="scripture-level">Level ${scripture.level}</div>
                        <div class="scripture-power">Power: ${scripture.power}</div>
                    </div>
                `;
                unequipBtn.style.display = 'inline-block';
            } else {
                slotContent.innerHTML = `
                    <div class="empty-slot">
                        <span class="icon-plus"></span>
                        <span>Empty Slot</span>
                    </div>
                `;
                unequipBtn.style.display = 'none';
            }
        });

        // Render effects summary
        this.renderEffectsSummary();
    }

    /**
     * Render effects summary
     */
    renderEffectsSummary() {
        const effectsSummary = this.equippedPanel.querySelector('.effects-summary');
        if (!effectsSummary) return;

        // Calculate total effects from equipped scriptures
        const totalEffects = this.calculateTotalEffects();

        effectsSummary.innerHTML = `
            <h4>Total Effects</h4>
            <div class="effects-list">
                ${Object.entries(totalEffects).map(([type, value]) => `
                    <div class="effect-item">
                        <span class="effect-type">${this.formatEffectType(type)}:</span>
                        <span class="effect-value">${value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render gacha interface
     */
    renderGacha() {
        // Update player resources
        const playerResources = this.gameState?.get('resources') || { jade: 1000, crystals: 50 };

        this.gachaPanel.querySelectorAll('.gacha-option').forEach(option => {
            const pullButton = option.querySelector('.pull-btn');
            const costAmount = option.querySelector('.cost-amount');
            const costCurrency = option.querySelector('.cost-currency');

            const pullType = pullButton.dataset.pullType;
            const cost = this.getGachaCost(pullType);

            const canAfford = playerResources[cost.currency] >= cost.amount;
            pullButton.disabled = !canAfford;
            pullButton.textContent = canAfford ? 'Pull' : 'Insufficient Resources';
        });
    }

    /**
     * Render enhancement interface
     */
    renderEnhancement() {
        const selectedSection = this.enhancementPanel.querySelector('.enhancement-selected');
        const selectedScripture = selectedSection.querySelector('.selected-scripture');

        if (this.selectedScripture) {
            selectedScripture.innerHTML = `
                <div class="selected-card rarity-${this.selectedScripture.rarity}">
                    <div class="scripture-name">${this.selectedScripture.name}</div>
                    <div class="scripture-level">Level ${this.selectedScripture.level}/${this.selectedScripture.maxLevel}</div>
                    <div class="scripture-power">Power: ${this.selectedScripture.power}</div>
                </div>
            `;

            // Update enhancement options
            this.updateEnhancementOptions();
        } else {
            selectedScripture.innerHTML = '<div class="no-selection">No scripture selected</div>';
            this.disableEnhancementOptions();
        }
    }

    /**
     * Action methods
     */
    selectScripture(scripture) {
        // Update selection
        this.selectedScripture = scripture;

        // Update visual selection
        this.collectionPanel.querySelectorAll('.scripture-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.scriptureId === scripture.id);
        });

        // Render details
        this.renderScriptureDetails(scripture);

        // Update enhancement panel
        this.renderEnhancement();
    }

    renderScriptureDetails(scripture) {
        const detailsContent = this.detailsPanel.querySelector('.details-content');

        detailsContent.innerHTML = `
            <div class="scripture-details">
                <div class="details-header rarity-${scripture.rarity}">
                    <h4>${scripture.name}</h4>
                    <div class="rarity-badge">${this.capitalizeFirst(scripture.rarity)}</div>
                </div>
                <div class="details-stats">
                    <div class="stat-row">
                        <span class="stat-label">Level:</span>
                        <span class="stat-value">${scripture.level} / ${scripture.maxLevel}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Power:</span>
                        <span class="stat-value">${scripture.power}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Category:</span>
                        <span class="stat-value">${this.capitalizeFirst(scripture.category)}</span>
                    </div>
                </div>
                <div class="details-effects">
                    <h5>Effects:</h5>
                    ${scripture.effects.map(effect => `
                        <div class="effect-detail">
                            <span class="effect-icon icon-${effect.type}"></span>
                            <span class="effect-text">${effect.value}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="details-actions">
                    <button class="btn btn-primary equip-selected-btn">Equip Scripture</button>
                    <button class="btn btn-secondary enhance-selected-btn">Enhance</button>
                </div>
            </div>
        `;

        // Add action handlers
        const equipBtn = detailsContent.querySelector('.equip-selected-btn');
        const enhanceBtn = detailsContent.querySelector('.enhance-selected-btn');

        equipBtn?.addEventListener('click', () => this.showEquipModal(scripture));
        enhanceBtn?.addEventListener('click', () => this.switchTab('enhancement'));
    }

    async performGacha(pullType) {
        try {
            // This would call the actual gacha system
            console.log(`Performing ${pullType} gacha pull`);

            // Mock gacha result
            const result = this.mockGachaPull(pullType);
            this.showGachaResult(result);

        } catch (error) {
            console.error('ScriptureView: Gacha failed', error);
            this.showNotification('Gacha pull failed: ' + error.message, 'error');
        }
    }

    async equipScripture(scriptureId, slotId) {
        try {
            if (this.scriptureManager) {
                await this.scriptureManager.equipScripture(scriptureId, slotId);
                this.renderEquipped();
                this.showNotification('Scripture equipped successfully', 'success');
            }
        } catch (error) {
            console.error('ScriptureView: Failed to equip scripture', error);
            this.showNotification('Failed to equip scripture: ' + error.message, 'error');
        }
    }

    async performEnhancement(enhanceType) {
        try {
            if (this.enhancementSystem && this.selectedScripture) {
                await this.enhancementSystem.enhance(this.selectedScripture.id, enhanceType);
                this.refresh();
                this.showNotification('Enhancement successful', 'success');
            }
        } catch (error) {
            console.error('ScriptureView: Enhancement failed', error);
            this.showNotification('Enhancement failed: ' + error.message, 'error');
        }
    }

    /**
     * Utility methods
     */
    getRarityOrder(rarity) {
        const order = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
        return order[rarity] || 0;
    }

    calculateTotalEffects() {
        const effects = {};
        Object.values(this.equippedScriptures).forEach(scripture => {
            if (scripture?.effects) {
                scripture.effects.forEach(effect => {
                    if (!effects[effect.type]) effects[effect.type] = 0;
                    // This would properly parse and sum the effect values
                    effects[effect.type] += 1; // Simplified
                });
            }
        });
        return effects;
    }

    formatEffectType(type) {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getGachaCost(pullType) {
        const costs = {
            single: { amount: 100, currency: 'jade' },
            ten: { amount: 900, currency: 'jade' },
            premium: { amount: 50, currency: 'crystals' }
        };
        return costs[pullType] || costs.single;
    }

    mockGachaPull(pullType) {
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const weights = [50, 30, 15, 4, 1];

        const numPulls = pullType === 'ten' ? 10 : 1;
        const results = [];

        for (let i = 0; i < numPulls; i++) {
            const rarity = this.weightedRandom(rarities, weights);
            results.push({
                id: `scripture_${Date.now()}_${i}`,
                name: `Test Scripture ${i + 1}`,
                rarity,
                level: 1,
                power: 100 * this.getRarityOrder(rarity)
            });
        }

        return results;
    }

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }

        return items[items.length - 1];
    }

    updateEnhancementOptions() {
        // Enable/disable enhancement options based on selected scripture
        const enhanceButtons = this.enhancementPanel.querySelectorAll('.enhance-btn');
        enhanceButtons.forEach(btn => {
            btn.disabled = !this.selectedScripture;
        });
    }

    disableEnhancementOptions() {
        const enhanceButtons = this.enhancementPanel.querySelectorAll('.enhance-btn');
        enhanceButtons.forEach(btn => {
            btn.disabled = true;
        });
    }

    showGachaResult(results) {
        // Create and show gacha result modal
        const modal = document.createElement('div');
        modal.className = 'gacha-result-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Gacha Results</h3>
                <div class="results-grid">
                    ${results.map(scripture => `
                        <div class="result-item rarity-${scripture.rarity}">
                            <div class="result-name">${scripture.name}</div>
                            <div class="result-rarity">${this.capitalizeFirst(scripture.rarity)}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary close-modal">Continue</button>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 5000);
    }

    showEquipModal(scripture) {
        // Show modal to select equipment slot
        // Implementation would depend on UI framework
        console.log('Show equip modal for:', scripture.name);
    }

    renderCollectionStats(container) {
        const totalScriptures = this.scriptureCollection.length;
        const rarityStats = {};

        this.scriptureCollection.forEach(scripture => {
            if (!rarityStats[scripture.rarity]) rarityStats[scripture.rarity] = 0;
            rarityStats[scripture.rarity]++;
        });

        container.innerHTML = `
            <div class="collection-summary">
                <div class="total-count">Total: ${totalScriptures} scriptures</div>
                <div class="rarity-breakdown">
                    ${Object.entries(rarityStats).map(([rarity, count]) => `
                        <div class="rarity-stat rarity-${rarity}">
                            ${this.capitalizeFirst(rarity)}: ${count}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showNotification(message, type = 'info') {
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
    module.exports = { ScriptureView };
} else if (typeof window !== 'undefined') {
    window.ScriptureView = ScriptureView;
}