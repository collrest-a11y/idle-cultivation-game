/**
 * QuestView - Manage quests, achievements, and progress tracking
 * Displays daily/weekly quests, achievements, story progression, and rewards
 */
class QuestView extends GameView {
    constructor(container, options = {}) {
        super(container, options);

        // System references
        this.questSystem = null;
        this.achievementManager = null;

        // UI components
        this.activeQuestsPanel = null;
        this.availableQuestsPanel = null;
        this.achievementsPanel = null;
        this.progressPanel = null;
        this.rewardsPanel = null;

        // Current data
        this.activeQuests = [];
        this.availableQuests = [];
        this.achievements = [];
        this.questProgress = null;
        this.selectedQuest = null;

        // View state
        this.currentTab = 'active';
        this.achievementFilter = 'all';
        this.questFilter = 'all';

        this.refreshRate = 3000; // 3 seconds
    }

    /**
     * Create main content area
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content quest-content';

        // Create tab navigation
        const tabNav = this.createTabNavigation();
        content.appendChild(tabNav);

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'quest-layout';

        // Left column - Quests
        const leftColumn = document.createElement('div');
        leftColumn.className = 'quest-left-column';

        // Right column - Details and Achievements
        const rightColumn = document.createElement('div');
        rightColumn.className = 'quest-right-column';

        // Create panels
        this.activeQuestsPanel = this.createActiveQuestsPanel();
        this.availableQuestsPanel = this.createAvailableQuestsPanel();
        this.achievementsPanel = this.createAchievementsPanel();
        this.progressPanel = this.createProgressPanel();
        this.rewardsPanel = this.createRewardsPanel();

        // Organize panels
        leftColumn.appendChild(this.activeQuestsPanel);
        leftColumn.appendChild(this.availableQuestsPanel);

        rightColumn.appendChild(this.progressPanel);
        rightColumn.appendChild(this.achievementsPanel);
        rightColumn.appendChild(this.rewardsPanel);

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
        nav.className = 'quest-tabs';

        const tabs = [
            { id: 'active', label: 'Active Quests', icon: 'icon-quest-active' },
            { id: 'available', label: 'Available Quests', icon: 'icon-quest-new' },
            { id: 'achievements', label: 'Achievements', icon: 'icon-achievement' },
            { id: 'completed', label: 'Completed', icon: 'icon-check' }
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
     * Create active quests panel
     */
    createActiveQuestsPanel() {
        const panel = document.createElement('div');
        panel.className = 'quest-panel active-quests-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-quest-active"></span> Active Quests</h3>
            <div class="quest-controls">
                <select class="quest-filter">
                    <option value="all">All Quests</option>
                    <option value="daily">Daily Quests</option>
                    <option value="weekly">Weekly Quests</option>
                    <option value="story">Story Quests</option>
                    <option value="special">Special Events</option>
                </select>
                <button class="btn btn-secondary auto-complete-btn">
                    <span class="icon-auto"></span> Auto Complete
                </button>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content active-quests-content';

        // Quest list
        const questList = document.createElement('div');
        questList.className = 'quest-list active-quest-list';
        content.appendChild(questList);

        // Progress summary
        const progressSummary = document.createElement('div');
        progressSummary.className = 'progress-summary';
        content.appendChild(progressSummary);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const filterSelect = header.querySelector('.quest-filter');
        const autoCompleteBtn = header.querySelector('.auto-complete-btn');

        filterSelect.addEventListener('change', (e) => this.filterQuests(e.target.value));
        autoCompleteBtn.addEventListener('click', () => this.autoCompleteQuests());

        return panel;
    }

    /**
     * Create available quests panel
     */
    createAvailableQuestsPanel() {
        const panel = document.createElement('div');
        panel.className = 'quest-panel available-quests-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-quest-new"></span> Available Quests';

        const content = document.createElement('div');
        content.className = 'panel-content available-quests-content';

        // Available quest list
        const questList = document.createElement('div');
        questList.className = 'quest-list available-quest-list';
        content.appendChild(questList);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create achievements panel
     */
    createAchievementsPanel() {
        const panel = document.createElement('div');
        panel.className = 'quest-panel achievements-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-achievement"></span> Achievements</h3>
            <div class="achievement-controls">
                <select class="achievement-filter">
                    <option value="all">All Achievements</option>
                    <option value="cultivation">Cultivation</option>
                    <option value="combat">Combat</option>
                    <option value="collection">Collection</option>
                    <option value="social">Social</option>
                    <option value="special">Special</option>
                </select>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content achievements-content';

        // Achievement stats
        const achievementStats = document.createElement('div');
        achievementStats.className = 'achievement-stats';
        content.appendChild(achievementStats);

        // Achievement list
        const achievementList = document.createElement('div');
        achievementList.className = 'achievement-list';
        content.appendChild(achievementList);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listener
        const filterSelect = header.querySelector('.achievement-filter');
        filterSelect.addEventListener('change', (e) => this.filterAchievements(e.target.value));

        return panel;
    }

    /**
     * Create progress panel
     */
    createProgressPanel() {
        const panel = document.createElement('div');
        panel.className = 'quest-panel progress-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-progress"></span> Quest Details';

        const content = document.createElement('div');
        content.className = 'panel-content progress-content';

        // Default content
        const defaultContent = document.createElement('div');
        defaultContent.className = 'default-content';
        defaultContent.innerHTML = `
            <div class="no-selection">
                <span class="icon-quest"></span>
                <p>Select a quest to view details</p>
            </div>
        `;
        content.appendChild(defaultContent);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create rewards panel
     */
    createRewardsPanel() {
        const panel = document.createElement('div');
        panel.className = 'quest-panel rewards-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-gift"></span> Pending Rewards';

        const content = document.createElement('div');
        content.className = 'panel-content rewards-content';

        // Reward list
        const rewardList = document.createElement('div');
        rewardList.className = 'reward-list';
        content.appendChild(rewardList);

        // Claim all button
        const claimAllBtn = document.createElement('button');
        claimAllBtn.className = 'btn btn-primary claim-all-btn';
        claimAllBtn.innerHTML = '<span class="icon-gift"></span> Claim All Rewards';
        claimAllBtn.addEventListener('click', () => this.claimAllRewards());
        content.appendChild(claimAllBtn);

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
            active: [this.activeQuestsPanel, this.progressPanel, this.rewardsPanel],
            available: [this.availableQuestsPanel, this.progressPanel],
            achievements: [this.achievementsPanel],
            completed: [this.progressPanel] // Would show completed quests
        };

        // Hide all panels
        [this.activeQuestsPanel, this.availableQuestsPanel, this.achievementsPanel, this.progressPanel, this.rewardsPanel]
            .forEach(panel => panel.style.display = 'none');

        // Show panels for current tab
        const activePanels = panels[this.currentTab] || [];
        activePanels.forEach(panel => panel.style.display = 'block');
    }

    /**
     * Load quest data
     */
    async loadData() {
        try {
            // Get system references - these would be properly integrated
            this.questSystem = window.questSystem; // Placeholder
            this.achievementManager = window.achievementManager; // Placeholder

            // Load quest data
            this.activeQuests = this.questSystem?.getActiveQuests() || [];
            this.availableQuests = this.questSystem?.getAvailableQuests() || [];
            this.achievements = this.achievementManager?.getAchievements() || [];
            this.questProgress = this.questSystem?.getProgressSummary() || {};

            console.log('QuestView: Data loaded successfully');

        } catch (error) {
            console.error('QuestView: Failed to load data', error);
            this.createMockData();
        }
    }

    /**
     * Create mock data for development
     */
    createMockData() {
        this.activeQuests = [
            {
                id: 'daily_cultivation',
                name: 'Daily Cultivation',
                type: 'daily',
                description: 'Cultivate for 30 minutes',
                objectives: [
                    {
                        id: 'cultivate_time',
                        description: 'Cultivate for 30 minutes',
                        progress: 18,
                        target: 30,
                        unit: 'minutes'
                    }
                ],
                rewards: [
                    { type: 'experience', amount: 500 },
                    { type: 'jade', amount: 100 }
                ],
                timeLeft: 3600 * 6, // 6 hours
                difficulty: 'easy',
                status: 'active'
            },
            {
                id: 'weekly_breakthrough',
                name: 'Weekly Breakthrough',
                type: 'weekly',
                description: 'Achieve 3 breakthroughs this week',
                objectives: [
                    {
                        id: 'breakthrough_count',
                        description: 'Achieve breakthroughs',
                        progress: 1,
                        target: 3,
                        unit: 'breakthroughs'
                    }
                ],
                rewards: [
                    { type: 'experience', amount: 2000 },
                    { type: 'crystals', amount: 50 },
                    { type: 'technique_scroll', amount: 1 }
                ],
                timeLeft: 3600 * 24 * 3, // 3 days
                difficulty: 'medium',
                status: 'active'
            },
            {
                id: 'story_first_realm',
                name: 'Path of Ascension',
                type: 'story',
                description: 'Reach the Foundation Building realm',
                objectives: [
                    {
                        id: 'reach_realm',
                        description: 'Reach Foundation Building realm',
                        progress: 0,
                        target: 1,
                        unit: 'realm'
                    }
                ],
                rewards: [
                    { type: 'experience', amount: 5000 },
                    { type: 'jade', amount: 1000 },
                    { type: 'rare_pill', amount: 3 }
                ],
                difficulty: 'hard',
                status: 'active'
            }
        ];

        this.availableQuests = [
            {
                id: 'collect_herbs',
                name: 'Herb Collection',
                type: 'gathering',
                description: 'Collect 50 spiritual herbs',
                requirements: { level: 10 },
                rewards: [
                    { type: 'experience', amount: 300 },
                    { type: 'jade', amount: 75 }
                ],
                difficulty: 'easy'
            },
            {
                id: 'defeat_bandits',
                name: 'Bandit Subjugation',
                type: 'combat',
                description: 'Defeat 10 mountain bandits',
                requirements: { level: 15, power: 500 },
                rewards: [
                    { type: 'experience', amount: 800 },
                    { type: 'jade', amount: 200 },
                    { type: 'weapon', rarity: 'uncommon' }
                ],
                difficulty: 'medium'
            }
        ];

        this.achievements = [
            {
                id: 'first_cultivation',
                name: 'First Steps',
                description: 'Begin your cultivation journey',
                category: 'cultivation',
                progress: 1,
                target: 1,
                completed: true,
                rewards: [
                    { type: 'experience', amount: 100 },
                    { type: 'title', name: 'Novice Cultivator' }
                ]
            },
            {
                id: 'realm_master',
                name: 'Realm Master',
                description: 'Reach 10 different cultivation realms',
                category: 'cultivation',
                progress: 2,
                target: 10,
                completed: false,
                rewards: [
                    { type: 'experience', amount: 10000 },
                    { type: 'title', name: 'Realm Walker' }
                ]
            },
            {
                id: 'scripture_collector',
                name: 'Scripture Collector',
                description: 'Collect 100 different scriptures',
                category: 'collection',
                progress: 23,
                target: 100,
                completed: false,
                rewards: [
                    { type: 'crystals', amount: 100 },
                    { type: 'legendary_scripture', amount: 1 }
                ]
            },
            {
                id: 'sect_leader',
                name: 'Sect Leader',
                description: 'Become a sect leader',
                category: 'social',
                progress: 0,
                target: 1,
                completed: false,
                rewards: [
                    { type: 'title', name: 'Sect Master' },
                    { type: 'special_ability', name: 'Leadership Aura' }
                ]
            }
        ];

        this.questProgress = {
            dailyQuestsCompleted: 2,
            dailyQuestsTotal: 5,
            weeklyQuestsCompleted: 1,
            weeklyQuestsTotal: 3,
            storyQuestsCompleted: 8,
            storyQuestsTotal: 25,
            achievementsUnlocked: 15,
            achievementsTotal: 150
        };
    }

    /**
     * Render view content
     */
    renderContent() {
        this.renderActiveQuests();
        this.renderAvailableQuests();
        this.renderAchievements();
        this.renderPendingRewards();
        this.updatePanelVisibility();
    }

    /**
     * Render active quests
     */
    renderActiveQuests() {
        const questList = this.activeQuestsPanel.querySelector('.active-quest-list');
        const progressSummary = this.activeQuestsPanel.querySelector('.progress-summary');

        if (!questList) return;

        // Clear existing content
        questList.innerHTML = '';

        // Filter quests based on current filter
        let filteredQuests = this.activeQuests;
        if (this.questFilter !== 'all') {
            filteredQuests = this.activeQuests.filter(quest => quest.type === this.questFilter);
        }

        // Render quest cards
        filteredQuests.forEach(quest => {
            const questCard = this.createQuestCard(quest, true);
            questList.appendChild(questCard);
        });

        // Render progress summary
        if (progressSummary && this.questProgress) {
            progressSummary.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">Daily Progress</div>
                        <div class="summary-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(this.questProgress.dailyQuestsCompleted / this.questProgress.dailyQuestsTotal) * 100}%"></div>
                            </div>
                            <div class="progress-text">${this.questProgress.dailyQuestsCompleted}/${this.questProgress.dailyQuestsTotal}</div>
                        </div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Weekly Progress</div>
                        <div class="summary-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(this.questProgress.weeklyQuestsCompleted / this.questProgress.weeklyQuestsTotal) * 100}%"></div>
                            </div>
                            <div class="progress-text">${this.questProgress.weeklyQuestsCompleted}/${this.questProgress.weeklyQuestsTotal}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Show empty state if no quests
        if (filteredQuests.length === 0) {
            questList.innerHTML = '<div class="empty-state">No active quests</div>';
        }
    }

    /**
     * Render available quests
     */
    renderAvailableQuests() {
        const questList = this.availableQuestsPanel.querySelector('.available-quest-list');
        if (!questList) return;

        questList.innerHTML = '';

        this.availableQuests.forEach(quest => {
            const questCard = this.createQuestCard(quest, false);
            questList.appendChild(questCard);
        });

        if (this.availableQuests.length === 0) {
            questList.innerHTML = '<div class="empty-state">No available quests</div>';
        }
    }

    /**
     * Create quest card
     */
    createQuestCard(quest, isActive) {
        const card = document.createElement('div');
        card.className = `quest-card ${quest.type}-quest difficulty-${quest.difficulty} ${isActive ? 'active' : 'available'}`;
        card.dataset.questId = quest.id;

        const timeLeft = quest.timeLeft ? this.formatTime(quest.timeLeft) : null;

        card.innerHTML = `
            <div class="quest-header">
                <div class="quest-name">${quest.name}</div>
                <div class="quest-type ${quest.type}">${this.capitalizeFirst(quest.type)}</div>
                <div class="quest-difficulty ${quest.difficulty}">${this.capitalizeFirst(quest.difficulty)}</div>
            </div>
            <div class="quest-description">${quest.description}</div>
            ${isActive && quest.objectives ? `
                <div class="quest-objectives">
                    ${quest.objectives.map(obj => `
                        <div class="objective-item">
                            <div class="objective-description">${obj.description}</div>
                            <div class="objective-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(obj.progress / obj.target) * 100}%"></div>
                                    <div class="progress-text">${obj.progress}/${obj.target} ${obj.unit}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${quest.requirements && !isActive ? `
                <div class="quest-requirements">
                    <span class="requirements-label">Requirements:</span>
                    ${Object.entries(quest.requirements).map(([req, value]) => `
                        <span class="requirement-item">${this.capitalizeFirst(req)}: ${value}</span>
                    `).join('')}
                </div>
            ` : ''}
            <div class="quest-rewards">
                <span class="rewards-label">Rewards:</span>
                <div class="reward-items">
                    ${quest.rewards.map(reward => `
                        <div class="reward-item">
                            <span class="reward-icon icon-${reward.type}"></span>
                            <span class="reward-amount">${reward.amount || reward.name || reward.rarity}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ${timeLeft ? `
                <div class="quest-timer">
                    <span class="timer-icon icon-clock"></span>
                    <span class="timer-text">Time left: ${timeLeft}</span>
                </div>
            ` : ''}
            <div class="quest-actions">
                ${isActive ? `
                    <button class="btn btn-primary view-details-btn">View Details</button>
                    <button class="btn btn-secondary abandon-btn">Abandon</button>
                    ${this.canCompleteQuest(quest) ? '<button class="btn btn-success complete-btn">Complete</button>' : ''}
                ` : `
                    <button class="btn btn-primary accept-btn ${this.canAcceptQuest(quest) ? '' : 'disabled'}">
                        ${this.canAcceptQuest(quest) ? 'Accept Quest' : 'Requirements Not Met'}
                    </button>
                `}
            </div>
        `;

        // Add event listeners
        const viewBtn = card.querySelector('.view-details-btn');
        const abandonBtn = card.querySelector('.abandon-btn');
        const completeBtn = card.querySelector('.complete-btn');
        const acceptBtn = card.querySelector('.accept-btn');

        viewBtn?.addEventListener('click', () => this.selectQuest(quest));
        abandonBtn?.addEventListener('click', () => this.abandonQuest(quest.id));
        completeBtn?.addEventListener('click', () => this.completeQuest(quest.id));
        acceptBtn?.addEventListener('click', () => this.acceptQuest(quest.id));

        return card;
    }

    /**
     * Render achievements
     */
    renderAchievements() {
        const achievementStats = this.achievementsPanel.querySelector('.achievement-stats');
        const achievementList = this.achievementsPanel.querySelector('.achievement-list');

        if (!achievementList) return;

        // Render achievement statistics
        if (achievementStats && this.questProgress) {
            const completedAchievements = this.achievements.filter(a => a.completed).length;
            const completionRate = ((completedAchievements / this.achievements.length) * 100).toFixed(1);

            achievementStats.innerHTML = `
                <div class="achievement-overview">
                    <div class="achievement-stat">
                        <div class="stat-value">${completedAchievements}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="achievement-stat">
                        <div class="stat-value">${this.achievements.length}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="achievement-stat">
                        <div class="stat-value">${completionRate}%</div>
                        <div class="stat-label">Completion</div>
                    </div>
                </div>
            `;
        }

        // Filter achievements
        let filteredAchievements = this.achievements;
        if (this.achievementFilter !== 'all') {
            filteredAchievements = this.achievements.filter(achievement => achievement.category === this.achievementFilter);
        }

        // Render achievement cards
        achievementList.innerHTML = '';
        filteredAchievements.forEach(achievement => {
            const achievementCard = this.createAchievementCard(achievement);
            achievementList.appendChild(achievementCard);
        });

        if (filteredAchievements.length === 0) {
            achievementList.innerHTML = '<div class="empty-state">No achievements in this category</div>';
        }
    }

    /**
     * Create achievement card
     */
    createAchievementCard(achievement) {
        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.completed ? 'completed' : 'in-progress'} category-${achievement.category}`;

        const progressPercent = (achievement.progress / achievement.target) * 100;

        card.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-icon">
                    <span class="icon-${achievement.category}"></span>
                </div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-category">${this.capitalizeFirst(achievement.category)}</div>
                </div>
                <div class="achievement-status ${achievement.completed ? 'completed' : 'in-progress'}">
                    ${achievement.completed ? 'Completed' : 'In Progress'}
                </div>
            </div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-text">${achievement.progress}/${achievement.target}</div>
            </div>
            <div class="achievement-rewards">
                <span class="rewards-label">Rewards:</span>
                <div class="reward-items">
                    ${achievement.rewards.map(reward => `
                        <div class="reward-item">
                            <span class="reward-icon icon-${reward.type}"></span>
                            <span class="reward-text">${reward.amount || reward.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ${achievement.completed ? `
                <div class="achievement-actions">
                    <button class="btn btn-success claim-achievement-btn">Claim Rewards</button>
                </div>
            ` : ''}
        `;

        // Add event listener
        const claimBtn = card.querySelector('.claim-achievement-btn');
        claimBtn?.addEventListener('click', () => this.claimAchievementReward(achievement.id));

        return card;
    }

    /**
     * Render pending rewards
     */
    renderPendingRewards() {
        const rewardList = this.rewardsPanel.querySelector('.reward-list');
        const claimAllBtn = this.rewardsPanel.querySelector('.claim-all-btn');

        if (!rewardList) return;

        // Get completed quests and achievements with unclaimed rewards
        const pendingRewards = this.getPendingRewards();

        rewardList.innerHTML = '';

        if (pendingRewards.length === 0) {
            rewardList.innerHTML = '<div class="empty-state">No pending rewards</div>';
            claimAllBtn.disabled = true;
        } else {
            pendingRewards.forEach(reward => {
                const rewardCard = this.createRewardCard(reward);
                rewardList.appendChild(rewardCard);
            });
            claimAllBtn.disabled = false;
        }
    }

    /**
     * Create reward card
     */
    createRewardCard(reward) {
        const card = document.createElement('div');
        card.className = 'reward-card';

        card.innerHTML = `
            <div class="reward-header">
                <div class="reward-source">${reward.source}</div>
                <div class="reward-type">${reward.type}</div>
            </div>
            <div class="reward-items">
                ${reward.items.map(item => `
                    <div class="reward-item">
                        <span class="reward-icon icon-${item.type}"></span>
                        <span class="reward-amount">${item.amount || item.name}</span>
                    </div>
                `).join('')}
            </div>
            <div class="reward-actions">
                <button class="btn btn-primary claim-reward-btn" data-reward-id="${reward.id}">
                    Claim
                </button>
            </div>
        `;

        // Add event listener
        const claimBtn = card.querySelector('.claim-reward-btn');
        claimBtn.addEventListener('click', () => this.claimReward(reward.id));

        return card;
    }

    /**
     * Select quest to show details
     */
    selectQuest(quest) {
        this.selectedQuest = quest;

        const progressContent = this.progressPanel.querySelector('.progress-content');
        progressContent.innerHTML = `
            <div class="quest-details">
                <div class="details-header">
                    <h4>${quest.name}</h4>
                    <div class="quest-badges">
                        <span class="badge type-badge ${quest.type}">${this.capitalizeFirst(quest.type)}</span>
                        <span class="badge difficulty-badge ${quest.difficulty}">${this.capitalizeFirst(quest.difficulty)}</span>
                    </div>
                </div>
                <div class="details-description">
                    <p>${quest.description}</p>
                </div>
                ${quest.objectives ? `
                    <div class="details-objectives">
                        <h5>Objectives:</h5>
                        ${quest.objectives.map(obj => `
                            <div class="objective-detail">
                                <div class="objective-text">${obj.description}</div>
                                <div class="objective-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${(obj.progress / obj.target) * 100}%"></div>
                                    </div>
                                    <div class="progress-numbers">${obj.progress}/${obj.target} ${obj.unit}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="details-rewards">
                    <h5>Rewards:</h5>
                    <div class="reward-grid">
                        ${quest.rewards.map(reward => `
                            <div class="reward-detail">
                                <span class="reward-icon icon-${reward.type}"></span>
                                <span class="reward-text">${reward.amount || reward.name || reward.rarity}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${quest.timeLeft ? `
                    <div class="details-timer">
                        <h5>Time Remaining:</h5>
                        <div class="timer-display">${this.formatTime(quest.timeLeft)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Action methods
     */
    async acceptQuest(questId) {
        if (!this.canAcceptQuest(this.availableQuests.find(q => q.id === questId))) {
            return;
        }

        try {
            console.log(`Accepting quest: ${questId}`);
            // This would call the actual quest system
            this.showNotification('Quest accepted!', 'success');
            this.refresh();
        } catch (error) {
            console.error('QuestView: Failed to accept quest', error);
            this.showNotification('Failed to accept quest: ' + error.message, 'error');
        }
    }

    async abandonQuest(questId) {
        try {
            console.log(`Abandoning quest: ${questId}`);
            // This would call the actual quest system
            this.showNotification('Quest abandoned', 'warning');
            this.refresh();
        } catch (error) {
            console.error('QuestView: Failed to abandon quest', error);
            this.showNotification('Failed to abandon quest: ' + error.message, 'error');
        }
    }

    async completeQuest(questId) {
        try {
            console.log(`Completing quest: ${questId}`);
            // This would call the actual quest system
            this.showNotification('Quest completed!', 'success');
            this.refresh();
        } catch (error) {
            console.error('QuestView: Failed to complete quest', error);
            this.showNotification('Failed to complete quest: ' + error.message, 'error');
        }
    }

    async claimAchievementReward(achievementId) {
        try {
            console.log(`Claiming achievement reward: ${achievementId}`);
            // This would call the actual achievement system
            this.showNotification('Achievement reward claimed!', 'success');
            this.refresh();
        } catch (error) {
            console.error('QuestView: Failed to claim achievement reward', error);
            this.showNotification('Failed to claim reward: ' + error.message, 'error');
        }
    }

    async claimReward(rewardId) {
        try {
            console.log(`Claiming reward: ${rewardId}`);
            this.showNotification('Reward claimed!', 'success');
            this.renderPendingRewards();
        } catch (error) {
            console.error('QuestView: Failed to claim reward', error);
            this.showNotification('Failed to claim reward: ' + error.message, 'error');
        }
    }

    async claimAllRewards() {
        try {
            console.log('Claiming all rewards');
            this.showNotification('All rewards claimed!', 'success');
            this.renderPendingRewards();
        } catch (error) {
            console.error('QuestView: Failed to claim all rewards', error);
            this.showNotification('Failed to claim rewards: ' + error.message, 'error');
        }
    }

    autoCompleteQuests() {
        console.log('Auto-completing eligible quests');
        // This would automatically complete quests that can be completed
        this.showNotification('Auto-completion started', 'info');
    }

    filterQuests(filter) {
        this.questFilter = filter;
        this.renderActiveQuests();
    }

    filterAchievements(filter) {
        this.achievementFilter = filter;
        this.renderAchievements();
    }

    /**
     * Utility methods
     */
    canAcceptQuest(quest) {
        if (!quest || !quest.requirements) return true;

        // Mock implementation - would check actual player stats
        return true;
    }

    canCompleteQuest(quest) {
        if (!quest.objectives) return false;

        return quest.objectives.every(obj => obj.progress >= obj.target);
    }

    getPendingRewards() {
        // Mock implementation - would return actual pending rewards
        return [
            {
                id: 'reward1',
                source: 'Daily Cultivation',
                type: 'Quest',
                items: [
                    { type: 'experience', amount: 500 },
                    { type: 'jade', amount: 100 }
                ]
            }
        ];
    }

    formatTime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
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
    module.exports = { QuestView };
} else if (typeof window !== 'undefined') {
    window.QuestView = QuestView;
}