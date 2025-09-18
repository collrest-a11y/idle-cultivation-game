/**
 * SectView - Manage sect affairs, activities, and member interactions
 * Displays sect information, member rankings, activities, contributions, and shop
 */
class SectView extends GameView {
    constructor(container, options = {}) {
        super(container, options);

        // System references
        this.sectSystem = null;
        this.sectManager = null;
        this.sectActivities = null;
        this.sectCompetition = null;

        // UI components
        this.sectInfoPanel = null;
        this.memberPanel = null;
        this.activitiesPanel = null;
        this.contributionPanel = null;
        this.shopPanel = null;

        // Current data
        this.sectData = null;
        this.memberData = null;
        this.playerContribution = null;
        this.sectActivitiesData = null;
        this.shopData = null;

        // View state
        this.currentTab = 'overview';

        this.refreshRate = 5000; // 5 seconds
    }

    /**
     * Create main content area
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content sect-content';

        // Create tab navigation
        const tabNav = this.createTabNavigation();
        content.appendChild(tabNav);

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'sect-layout';

        // Left column - Sect Info and Members
        const leftColumn = document.createElement('div');
        leftColumn.className = 'sect-left-column';

        // Right column - Activities and Shop
        const rightColumn = document.createElement('div');
        rightColumn.className = 'sect-right-column';

        // Create panels
        this.sectInfoPanel = this.createSectInfoPanel();
        this.memberPanel = this.createMemberPanel();
        this.activitiesPanel = this.createActivitiesPanel();
        this.contributionPanel = this.createContributionPanel();
        this.shopPanel = this.createShopPanel();

        // Organize panels
        leftColumn.appendChild(this.sectInfoPanel);
        leftColumn.appendChild(this.memberPanel);

        rightColumn.appendChild(this.activitiesPanel);
        rightColumn.appendChild(this.contributionPanel);
        rightColumn.appendChild(this.shopPanel);

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
        nav.className = 'sect-tabs';

        const tabs = [
            { id: 'overview', label: 'Sect Overview', icon: 'icon-temple' },
            { id: 'members', label: 'Members', icon: 'icon-users' },
            { id: 'activities', label: 'Activities', icon: 'icon-activity' },
            { id: 'shop', label: 'Sect Shop', icon: 'icon-shop' }
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
     * Create sect info panel
     */
    createSectInfoPanel() {
        const panel = document.createElement('div');
        panel.className = 'sect-panel info-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-temple"></span> Sect Information';

        const content = document.createElement('div');
        content.className = 'panel-content info-content';

        // Sect header
        const sectHeader = document.createElement('div');
        sectHeader.className = 'sect-header';
        content.appendChild(sectHeader);

        // Sect stats
        const sectStats = document.createElement('div');
        sectStats.className = 'sect-stats';
        content.appendChild(sectStats);

        // Sect description
        const sectDescription = document.createElement('div');
        sectDescription.className = 'sect-description';
        content.appendChild(sectDescription);

        // Sect benefits
        const sectBenefits = document.createElement('div');
        sectBenefits.className = 'sect-benefits';
        content.appendChild(sectBenefits);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create member panel
     */
    createMemberPanel() {
        const panel = document.createElement('div');
        panel.className = 'sect-panel member-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-users"></span> Sect Members</h3>
            <div class="member-controls">
                <select class="member-sort">
                    <option value="rank">Sort by Rank</option>
                    <option value="contribution">Sort by Contribution</option>
                    <option value="power">Sort by Power</option>
                    <option value="level">Sort by Level</option>
                </select>
                <button class="btn btn-secondary invite-btn">
                    <span class="icon-plus"></span> Invite
                </button>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content member-content';

        // Player's rank and contribution
        const playerStatus = document.createElement('div');
        playerStatus.className = 'player-status';
        content.appendChild(playerStatus);

        // Member list
        const memberList = document.createElement('div');
        memberList.className = 'member-list';
        content.appendChild(memberList);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const sortSelect = header.querySelector('.member-sort');
        const inviteBtn = header.querySelector('.invite-btn');

        sortSelect.addEventListener('change', (e) => this.sortMembers(e.target.value));
        inviteBtn.addEventListener('click', () => this.openInviteModal());

        return panel;
    }

    /**
     * Create activities panel
     */
    createActivitiesPanel() {
        const panel = document.createElement('div');
        panel.className = 'sect-panel activities-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-activity"></span> Sect Activities';

        const content = document.createElement('div');
        content.className = 'panel-content activities-content';

        // Daily missions
        const dailyMissions = document.createElement('div');
        dailyMissions.className = 'activity-section daily-missions';

        const dailyHeader = document.createElement('h4');
        dailyHeader.innerHTML = '<span class="icon-calendar"></span> Daily Missions';
        dailyMissions.appendChild(dailyHeader);

        const dailyList = document.createElement('div');
        dailyList.className = 'mission-list daily-list';
        dailyMissions.appendChild(dailyList);

        // Weekly events
        const weeklyEvents = document.createElement('div');
        weeklyEvents.className = 'activity-section weekly-events';

        const weeklyHeader = document.createElement('h4');
        weeklyHeader.innerHTML = '<span class="icon-event"></span> Weekly Events';
        weeklyEvents.appendChild(weeklyHeader);

        const weeklyList = document.createElement('div');
        weeklyList.className = 'event-list weekly-list';
        weeklyEvents.appendChild(weeklyList);

        // Sect competitions
        const competitions = document.createElement('div');
        competitions.className = 'activity-section competitions';

        const competitionHeader = document.createElement('h4');
        competitionHeader.innerHTML = '<span class="icon-competition"></span> Competitions';
        competitions.appendChild(competitionHeader);

        const competitionList = document.createElement('div');
        competitionList.className = 'competition-list';
        competitions.appendChild(competitionList);

        content.appendChild(dailyMissions);
        content.appendChild(weeklyEvents);
        content.appendChild(competitions);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create contribution panel
     */
    createContributionPanel() {
        const panel = document.createElement('div');
        panel.className = 'sect-panel contribution-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-contribution"></span> Contribution';

        const content = document.createElement('div');
        content.className = 'panel-content contribution-content';

        // Contribution stats
        const contributionStats = document.createElement('div');
        contributionStats.className = 'contribution-stats';
        content.appendChild(contributionStats);

        // Contribution methods
        const contributionMethods = document.createElement('div');
        contributionMethods.className = 'contribution-methods';

        const methodsHeader = document.createElement('h4');
        methodsHeader.textContent = 'Contribute to Sect';
        contributionMethods.appendChild(methodsHeader);

        const methodsList = document.createElement('div');
        methodsList.className = 'methods-list';

        // Add contribution methods
        const resourceContribution = this.createContributionMethod({
            id: 'resources',
            name: 'Donate Resources',
            description: 'Donate jade and crystals to the sect',
            icon: 'icon-jade',
            multiplier: 1
        });

        const spiritStoneContribution = this.createContributionMethod({
            id: 'spirit-stones',
            name: 'Donate Spirit Stones',
            description: 'High-value contribution method',
            icon: 'icon-stone',
            multiplier: 5
        });

        const taskContribution = this.createContributionMethod({
            id: 'tasks',
            name: 'Complete Sect Tasks',
            description: 'Help with sect infrastructure',
            icon: 'icon-task',
            multiplier: 3
        });

        methodsList.appendChild(resourceContribution);
        methodsList.appendChild(spiritStoneContribution);
        methodsList.appendChild(taskContribution);
        contributionMethods.appendChild(methodsList);

        content.appendChild(contributionMethods);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create contribution method
     */
    createContributionMethod(method) {
        const element = document.createElement('div');
        element.className = 'contribution-method';

        element.innerHTML = `
            <div class="method-icon">
                <span class="${method.icon}"></span>
            </div>
            <div class="method-info">
                <div class="method-name">${method.name}</div>
                <div class="method-description">${method.description}</div>
                <div class="method-multiplier">Contribution: x${method.multiplier}</div>
            </div>
            <div class="method-actions">
                <input type="number" class="contribution-amount" placeholder="Amount" min="1">
                <button class="btn btn-primary contribute-btn" data-method="${method.id}">
                    Contribute
                </button>
            </div>
        `;

        // Add click handler
        const contributeBtn = element.querySelector('.contribute-btn');
        contributeBtn.addEventListener('click', () => {
            const amount = element.querySelector('.contribution-amount').value;
            this.makeContribution(method.id, parseInt(amount) || 0);
        });

        return element;
    }

    /**
     * Create shop panel
     */
    createShopPanel() {
        const panel = document.createElement('div');
        panel.className = 'sect-panel shop-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-shop"></span> Sect Shop</h3>
            <div class="shop-controls">
                <div class="contribution-points">
                    <span class="icon-contribution"></span>
                    <span class="points-amount">0</span>
                    <span class="points-label">Contribution Points</span>
                </div>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content shop-content';

        // Shop categories
        const shopCategories = document.createElement('div');
        shopCategories.className = 'shop-categories';

        const categories = ['techniques', 'pills', 'materials', 'equipment'];
        categories.forEach(category => {
            const categoryBtn = document.createElement('button');
            categoryBtn.className = `category-btn ${category === 'techniques' ? 'active' : ''}`;
            categoryBtn.dataset.category = category;
            categoryBtn.textContent = this.capitalizeFirst(category);
            categoryBtn.addEventListener('click', () => this.switchShopCategory(category));
            shopCategories.appendChild(categoryBtn);
        });

        // Shop items
        const shopItems = document.createElement('div');
        shopItems.className = 'shop-items';

        content.appendChild(shopCategories);
        content.appendChild(shopItems);

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
            overview: [this.sectInfoPanel, this.contributionPanel],
            members: [this.memberPanel],
            activities: [this.activitiesPanel],
            shop: [this.shopPanel]
        };

        // Hide all panels
        [this.sectInfoPanel, this.memberPanel, this.activitiesPanel, this.contributionPanel, this.shopPanel]
            .forEach(panel => panel.style.display = 'none');

        // Show panels for current tab
        const activePanels = panels[this.currentTab] || [];
        activePanels.forEach(panel => panel.style.display = 'block');
    }

    /**
     * Load sect data
     */
    async loadData() {
        try {
            // Get system references
            const sectModule = window.game?.moduleManager?.getModule('sect');
            this.sectSystem = sectModule?.sectSystem;
            this.sectManager = sectModule?.sectManager;
            this.sectActivities = sectModule?.sectActivities;
            this.sectCompetition = sectModule?.sectCompetition;

            if (!this.sectSystem) {
                throw new Error('Sect system not available');
            }

            // Load sect data
            this.sectData = this.sectSystem.getSectInfo();
            this.memberData = this.sectManager?.getMembers();
            this.playerContribution = this.sectSystem.getPlayerContribution();
            this.sectActivitiesData = this.sectActivities?.getActivities();
            this.shopData = this.sectSystem.getShopItems();

            console.log('SectView: Data loaded successfully');

        } catch (error) {
            console.error('SectView: Failed to load data', error);
            this.createMockData();
        }
    }

    /**
     * Create mock data for development
     */
    createMockData() {
        this.sectData = {
            name: 'Azure Dragon Sect',
            level: 3,
            memberCount: 45,
            maxMembers: 50,
            totalContribution: 125000,
            rank: 7,
            description: 'A prestigious sect focused on balanced cultivation and mutual support among disciples.',
            benefits: [
                { type: 'cultivation_speed', value: '+15% Cultivation Speed' },
                { type: 'resource_bonus', value: '+10% Resource Generation' },
                { type: 'technique_access', value: 'Access to Rare Techniques' }
            ],
            leader: 'Elder Mystique',
            founded: '2 years ago'
        };

        this.memberData = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            name: `Member ${i + 1}`,
            rank: i < 3 ? ['Elder', 'Core Disciple', 'Inner Disciple'][i] : 'Outer Disciple',
            level: 30 - i,
            power: 2000 - (i * 50),
            contribution: 10000 - (i * 200),
            joinDate: new Date(Date.now() - (i * 86400000 * 30)),
            online: Math.random() > 0.7
        }));

        this.playerContribution = {
            total: 5500,
            points: 2750,
            rank: 8,
            weeklyContribution: 350,
            monthlyContribution: 1200
        };

        this.sectActivitiesData = {
            dailyMissions: [
                {
                    id: 'daily1',
                    name: 'Cultivation Practice',
                    description: 'Cultivate for 2 hours',
                    progress: 75,
                    maxProgress: 100,
                    reward: { contribution: 50, jade: 100 },
                    completed: false
                },
                {
                    id: 'daily2',
                    name: 'Resource Gathering',
                    description: 'Collect 1000 jade',
                    progress: 1000,
                    maxProgress: 1000,
                    reward: { contribution: 30, experience: 500 },
                    completed: true
                }
            ],
            weeklyEvents: [
                {
                    id: 'weekly1',
                    name: 'Sect War',
                    description: 'Compete against rival sects',
                    timeLeft: 3600 * 24 * 3,
                    participants: 25,
                    reward: { contribution: 500, crystals: 25 }
                }
            ],
            competitions: [
                {
                    id: 'comp1',
                    name: 'Inner Sect Tournament',
                    type: 'combat',
                    status: 'active',
                    participants: 16,
                    reward: { contribution: 1000, technique: 'Lightning Palm' }
                }
            ]
        };

        this.shopData = {
            techniques: [
                {
                    id: 'tech1',
                    name: 'Azure Dragon Fist',
                    rarity: 'rare',
                    cost: 1000,
                    description: 'Powerful combat technique',
                    requirements: { rank: 'Inner Disciple' }
                }
            ],
            pills: [
                {
                    id: 'pill1',
                    name: 'Qi Enhancement Pill',
                    cost: 200,
                    effect: '+10% Qi for 1 hour',
                    stock: 50
                }
            ],
            materials: [
                {
                    id: 'mat1',
                    name: 'Dragon Scale',
                    cost: 500,
                    description: 'Rare crafting material',
                    stock: 10
                }
            ],
            equipment: [
                {
                    id: 'eq1',
                    name: 'Sect Robes',
                    cost: 800,
                    stats: { defense: 15, cultivation: 5 },
                    requirements: { level: 25 }
                }
            ]
        };
    }

    /**
     * Render view content
     */
    renderContent() {
        this.renderSectInfo();
        this.renderMembers();
        this.renderActivities();
        this.renderContribution();
        this.renderShop();
        this.updatePanelVisibility();
    }

    /**
     * Render sect information
     */
    renderSectInfo() {
        if (!this.sectData) return;

        const infoContent = this.sectInfoPanel.querySelector('.info-content');
        const sectHeader = infoContent.querySelector('.sect-header');
        const sectStats = infoContent.querySelector('.sect-stats');
        const sectDescription = infoContent.querySelector('.sect-description');
        const sectBenefits = infoContent.querySelector('.sect-benefits');

        // Sect header
        sectHeader.innerHTML = `
            <div class="sect-banner">
                <div class="sect-name">${this.sectData.name}</div>
                <div class="sect-level">Level ${this.sectData.level}</div>
                <div class="sect-rank">Rank #${this.sectData.rank}</div>
            </div>
            <div class="sect-leader">
                <span class="leader-title">Leader:</span>
                <span class="leader-name">${this.sectData.leader}</span>
            </div>
        `;

        // Sect stats
        sectStats.innerHTML = `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Members:</span>
                    <span class="stat-value">${this.sectData.memberCount}/${this.sectData.maxMembers}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Contribution:</span>
                    <span class="stat-value">${this.formatNumber(this.sectData.totalContribution)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Founded:</span>
                    <span class="stat-value">${this.sectData.founded}</span>
                </div>
            </div>
        `;

        // Sect description
        sectDescription.innerHTML = `
            <h4>About Our Sect</h4>
            <p>${this.sectData.description}</p>
        `;

        // Sect benefits
        sectBenefits.innerHTML = `
            <h4>Sect Benefits</h4>
            <div class="benefits-list">
                ${this.sectData.benefits.map(benefit => `
                    <div class="benefit-item">
                        <span class="benefit-icon icon-${benefit.type}"></span>
                        <span class="benefit-text">${benefit.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render members
     */
    renderMembers() {
        if (!this.memberData) return;

        const memberContent = this.memberPanel.querySelector('.member-content');
        const playerStatus = memberContent.querySelector('.player-status');
        const memberList = memberContent.querySelector('.member-list');

        // Player status
        const playerMember = this.memberData.find(m => m.name === 'Player') || this.memberData[7]; // Mock player
        playerStatus.innerHTML = `
            <div class="player-member-card">
                <div class="member-header">
                    <div class="member-name">You</div>
                    <div class="member-rank">${playerMember.rank}</div>
                    <div class="online-status online">Online</div>
                </div>
                <div class="member-stats">
                    <div class="stat-item">
                        <span class="stat-label">Level:</span>
                        <span class="stat-value">${playerMember.level}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Power:</span>
                        <span class="stat-value">${this.formatNumber(playerMember.power)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Contribution:</span>
                        <span class="stat-value">${this.formatNumber(this.playerContribution.total)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Rank:</span>
                        <span class="stat-value">#${this.playerContribution.rank}</span>
                    </div>
                </div>
            </div>
        `;

        // Member list
        memberList.innerHTML = '';
        this.memberData.slice(0, 15).forEach(member => {
            const memberCard = this.createMemberCard(member);
            memberList.appendChild(memberCard);
        });
    }

    /**
     * Create member card
     */
    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'member-card';

        const joinedDays = Math.floor((Date.now() - member.joinDate.getTime()) / (1000 * 60 * 60 * 24));

        card.innerHTML = `
            <div class="member-header">
                <div class="member-name">${member.name}</div>
                <div class="member-rank">${member.rank}</div>
                <div class="online-status ${member.online ? 'online' : 'offline'}">
                    ${member.online ? 'Online' : 'Offline'}
                </div>
            </div>
            <div class="member-stats">
                <div class="stat-row">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${member.level}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Power:</span>
                    <span class="stat-value">${this.formatNumber(member.power)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Contribution:</span>
                    <span class="stat-value">${this.formatNumber(member.contribution)}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">Joined:</span>
                    <span class="stat-value">${joinedDays} days ago</span>
                </div>
            </div>
            <div class="member-actions">
                <button class="btn btn-secondary btn-sm view-profile-btn">Profile</button>
                <button class="btn btn-outline btn-sm message-btn">Message</button>
            </div>
        `;

        // Add event listeners
        const profileBtn = card.querySelector('.view-profile-btn');
        const messageBtn = card.querySelector('.message-btn');

        profileBtn.addEventListener('click', () => this.viewMemberProfile(member));
        messageBtn.addEventListener('click', () => this.sendMessage(member));

        return card;
    }

    /**
     * Render activities
     */
    renderActivities() {
        if (!this.sectActivitiesData) return;

        const activitiesContent = this.activitiesPanel.querySelector('.activities-content');

        // Daily missions
        const dailyList = activitiesContent.querySelector('.daily-list');
        dailyList.innerHTML = '';
        this.sectActivitiesData.dailyMissions.forEach(mission => {
            const missionCard = this.createMissionCard(mission);
            dailyList.appendChild(missionCard);
        });

        // Weekly events
        const weeklyList = activitiesContent.querySelector('.weekly-list');
        weeklyList.innerHTML = '';
        this.sectActivitiesData.weeklyEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            weeklyList.appendChild(eventCard);
        });

        // Competitions
        const competitionList = activitiesContent.querySelector('.competition-list');
        competitionList.innerHTML = '';
        this.sectActivitiesData.competitions.forEach(competition => {
            const competitionCard = this.createCompetitionCard(competition);
            competitionList.appendChild(competitionCard);
        });
    }

    /**
     * Create mission card
     */
    createMissionCard(mission) {
        const card = document.createElement('div');
        card.className = `mission-card ${mission.completed ? 'completed' : ''}`;

        const progressPercent = (mission.progress / mission.maxProgress) * 100;

        card.innerHTML = `
            <div class="mission-header">
                <div class="mission-name">${mission.name}</div>
                <div class="mission-status ${mission.completed ? 'completed' : 'active'}">
                    ${mission.completed ? 'Completed' : 'Active'}
                </div>
            </div>
            <div class="mission-description">${mission.description}</div>
            <div class="mission-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    <div class="progress-text">${mission.progress}/${mission.maxProgress}</div>
                </div>
            </div>
            <div class="mission-rewards">
                <span class="rewards-label">Rewards:</span>
                ${Object.entries(mission.reward).map(([type, amount]) => `
                    <span class="reward-item">
                        <span class="icon-${type}"></span>
                        <span>${amount}</span>
                    </span>
                `).join('')}
            </div>
            <div class="mission-actions">
                ${mission.completed ?
                    '<button class="btn btn-success btn-sm claim-btn">Claim Rewards</button>' :
                    '<button class="btn btn-primary btn-sm start-btn">Start Mission</button>'
                }
            </div>
        `;

        // Add event listeners
        const actionBtn = card.querySelector('.claim-btn') || card.querySelector('.start-btn');
        actionBtn?.addEventListener('click', () => {
            if (mission.completed) {
                this.claimMissionReward(mission.id);
            } else {
                this.startMission(mission.id);
            }
        });

        return card;
    }

    /**
     * Create event card
     */
    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';

        const timeLeft = this.formatTime(event.timeLeft);

        card.innerHTML = `
            <div class="event-header">
                <div class="event-name">${event.name}</div>
                <div class="event-time">Ends in: ${timeLeft}</div>
            </div>
            <div class="event-description">${event.description}</div>
            <div class="event-info">
                <div class="info-item">
                    <span class="info-label">Participants:</span>
                    <span class="info-value">${event.participants}</span>
                </div>
            </div>
            <div class="event-rewards">
                <span class="rewards-label">Rewards:</span>
                ${Object.entries(event.reward).map(([type, amount]) => `
                    <span class="reward-item">
                        <span class="icon-${type}"></span>
                        <span>${amount}</span>
                    </span>
                `).join('')}
            </div>
            <div class="event-actions">
                <button class="btn btn-primary participate-btn">Participate</button>
            </div>
        `;

        // Add event listener
        const participateBtn = card.querySelector('.participate-btn');
        participateBtn.addEventListener('click', () => this.participateInEvent(event.id));

        return card;
    }

    /**
     * Create competition card
     */
    createCompetitionCard(competition) {
        const card = document.createElement('div');
        card.className = `competition-card status-${competition.status}`;

        card.innerHTML = `
            <div class="competition-header">
                <div class="competition-name">${competition.name}</div>
                <div class="competition-status ${competition.status}">${this.capitalizeFirst(competition.status)}</div>
            </div>
            <div class="competition-info">
                <div class="info-item">
                    <span class="info-label">Type:</span>
                    <span class="info-value">${this.capitalizeFirst(competition.type)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Participants:</span>
                    <span class="info-value">${competition.participants}</span>
                </div>
            </div>
            <div class="competition-rewards">
                <span class="rewards-label">Rewards:</span>
                ${Object.entries(competition.reward).map(([type, amount]) => `
                    <span class="reward-item">
                        <span class="icon-${type}"></span>
                        <span>${amount}</span>
                    </span>
                `).join('')}
            </div>
            <div class="competition-actions">
                <button class="btn btn-primary join-competition-btn">Join Competition</button>
            </div>
        `;

        // Add event listener
        const joinBtn = card.querySelector('.join-competition-btn');
        joinBtn.addEventListener('click', () => this.joinCompetition(competition.id));

        return card;
    }

    /**
     * Render contribution
     */
    renderContribution() {
        if (!this.playerContribution) return;

        const contributionStats = this.contributionPanel.querySelector('.contribution-stats');

        contributionStats.innerHTML = `
            <div class="contribution-overview">
                <h4>Your Contribution</h4>
                <div class="contribution-grid">
                    <div class="contribution-item">
                        <div class="contribution-label">Total Contribution</div>
                        <div class="contribution-value">${this.formatNumber(this.playerContribution.total)}</div>
                    </div>
                    <div class="contribution-item">
                        <div class="contribution-label">Available Points</div>
                        <div class="contribution-value">${this.formatNumber(this.playerContribution.points)}</div>
                    </div>
                    <div class="contribution-item">
                        <div class="contribution-label">Sect Rank</div>
                        <div class="contribution-value">#${this.playerContribution.rank}</div>
                    </div>
                    <div class="contribution-item">
                        <div class="contribution-label">This Week</div>
                        <div class="contribution-value">${this.formatNumber(this.playerContribution.weeklyContribution)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render shop
     */
    renderShop() {
        if (!this.shopData) return;

        // Update contribution points display
        const pointsAmount = this.shopPanel.querySelector('.points-amount');
        pointsAmount.textContent = this.formatNumber(this.playerContribution?.points || 0);

        // Render shop items for default category
        this.renderShopCategory('techniques');
    }

    /**
     * Switch shop category
     */
    switchShopCategory(category) {
        // Update category buttons
        const categoryButtons = this.shopPanel.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Render items for selected category
        this.renderShopCategory(category);
    }

    /**
     * Render shop category items
     */
    renderShopCategory(category) {
        const shopItems = this.shopPanel.querySelector('.shop-items');
        const items = this.shopData[category] || [];

        shopItems.innerHTML = '';

        if (items.length === 0) {
            shopItems.innerHTML = '<div class="empty-category">No items available</div>';
            return;
        }

        items.forEach(item => {
            const itemCard = this.createShopItemCard(item, category);
            shopItems.appendChild(itemCard);
        });
    }

    /**
     * Create shop item card
     */
    createShopItemCard(item, category) {
        const card = document.createElement('div');
        card.className = 'shop-item-card';

        const canAfford = (this.playerContribution?.points || 0) >= item.cost;
        const meetsRequirements = this.checkItemRequirements(item);

        card.innerHTML = `
            <div class="item-header">
                <div class="item-name ${item.rarity ? `rarity-${item.rarity}` : ''}">${item.name}</div>
                <div class="item-cost">
                    <span class="cost-amount">${item.cost}</span>
                    <span class="cost-currency icon-contribution"></span>
                </div>
            </div>
            <div class="item-description">${item.description || item.effect || ''}</div>
            ${item.stats ? `
                <div class="item-stats">
                    ${Object.entries(item.stats).map(([stat, value]) => `
                        <div class="stat-item">
                            <span class="stat-name">${this.capitalizeFirst(stat)}:</span>
                            <span class="stat-value">+${value}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${item.requirements ? `
                <div class="item-requirements">
                    <span class="req-label">Requirements:</span>
                    ${Object.entries(item.requirements).map(([req, value]) => `
                        <span class="req-item ${meetsRequirements ? 'met' : 'unmet'}">
                            ${this.capitalizeFirst(req)}: ${value}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            ${item.stock !== undefined ? `
                <div class="item-stock">Stock: ${item.stock}</div>
            ` : ''}
            <div class="item-actions">
                <button class="btn btn-primary purchase-btn"
                    ${!canAfford || !meetsRequirements ? 'disabled' : ''}
                    data-item-id="${item.id}" data-category="${category}">
                    ${!canAfford ? 'Insufficient Points' :
                      !meetsRequirements ? 'Requirements Not Met' :
                      'Purchase'}
                </button>
            </div>
        `;

        // Add event listener
        const purchaseBtn = card.querySelector('.purchase-btn');
        purchaseBtn.addEventListener('click', () => this.purchaseItem(item.id, category));

        return card;
    }

    /**
     * Action methods
     */
    async makeContribution(method, amount) {
        if (amount <= 0) return;

        try {
            console.log(`Making contribution: ${method}, amount: ${amount}`);
            // This would call the actual sect system
            this.showNotification(`Contributed ${amount} successfully!`, 'success');
            this.refresh();
        } catch (error) {
            console.error('SectView: Contribution failed', error);
            this.showNotification('Contribution failed: ' + error.message, 'error');
        }
    }

    async purchaseItem(itemId, category) {
        try {
            console.log(`Purchasing item: ${itemId} from category: ${category}`);
            // This would call the actual sect shop system
            this.showNotification('Item purchased successfully!', 'success');
            this.refresh();
        } catch (error) {
            console.error('SectView: Purchase failed', error);
            this.showNotification('Purchase failed: ' + error.message, 'error');
        }
    }

    sortMembers(sortBy) {
        console.log(`Sorting members by: ${sortBy}`);
        // Implementation would sort and re-render members
        this.renderMembers();
    }

    openInviteModal() {
        console.log('Opening invite modal');
        // Implementation would open invite interface
    }

    viewMemberProfile(member) {
        console.log(`Viewing profile for: ${member.name}`);
        // Implementation would show member profile modal
    }

    sendMessage(member) {
        console.log(`Sending message to: ${member.name}`);
        // Implementation would open messaging interface
    }

    startMission(missionId) {
        console.log(`Starting mission: ${missionId}`);
        this.showNotification('Mission started!', 'success');
    }

    claimMissionReward(missionId) {
        console.log(`Claiming reward for mission: ${missionId}`);
        this.showNotification('Rewards claimed!', 'success');
    }

    participateInEvent(eventId) {
        console.log(`Participating in event: ${eventId}`);
        this.showNotification('Joined event!', 'success');
    }

    joinCompetition(competitionId) {
        console.log(`Joining competition: ${competitionId}`);
        this.showNotification('Joined competition!', 'success');
    }

    checkItemRequirements(item) {
        // Mock implementation - would check actual player stats
        return true;
    }

    /**
     * Utility methods
     */
    formatNumber(num) {
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
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
    module.exports = { SectView };
} else if (typeof window !== 'undefined') {
    window.SectView = SectView;
}