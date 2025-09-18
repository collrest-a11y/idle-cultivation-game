/**
 * MainMenuView - Primary navigation hub for the game
 * Displays game overview, navigation to all views, player status, and quick actions
 */
class MainMenuView extends GameView {
    constructor(container, options = {}) {
        super(container, options);

        // UI components
        this.playerStatusPanel = null;
        this.navigationPanel = null;
        this.overviewPanel = null;
        this.notificationsPanel = null;
        this.quickActionsPanel = null;

        // Current data
        this.playerData = null;
        this.gameProgress = null;
        this.notifications = [];
        this.systemStatus = null;

        // Settings
        this.autoRefresh = true;
        this.refreshRate = 2000; // 2 seconds for real-time updates
    }

    /**
     * Get default options
     */
    getDefaultOptions() {
        return {
            ...super.getDefaultOptions(),
            showHeader: false, // Main menu doesn't need a header
            showFooter: true
        };
    }

    /**
     * Create main content area
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content main-menu-content';

        // Create welcome header
        const welcomeHeader = this.createWelcomeHeader();
        content.appendChild(welcomeHeader);

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'main-menu-layout';

        // Top row - Player Status and Quick Actions
        const topRow = document.createElement('div');
        topRow.className = 'main-menu-top-row';

        // Middle row - Navigation
        const middleRow = document.createElement('div');
        middleRow.className = 'main-menu-middle-row';

        // Bottom row - Overview and Notifications
        const bottomRow = document.createElement('div');
        bottomRow.className = 'main-menu-bottom-row';

        // Create panels
        this.playerStatusPanel = this.createPlayerStatusPanel();
        this.quickActionsPanel = this.createQuickActionsPanel();
        this.navigationPanel = this.createNavigationPanel();
        this.overviewPanel = this.createOverviewPanel();
        this.notificationsPanel = this.createNotificationsPanel();

        // Organize panels
        topRow.appendChild(this.playerStatusPanel);
        topRow.appendChild(this.quickActionsPanel);

        middleRow.appendChild(this.navigationPanel);

        bottomRow.appendChild(this.overviewPanel);
        bottomRow.appendChild(this.notificationsPanel);

        layout.appendChild(topRow);
        layout.appendChild(middleRow);
        layout.appendChild(bottomRow);
        content.appendChild(layout);

        return content;
    }

    /**
     * Create welcome header
     */
    createWelcomeHeader() {
        const header = document.createElement('div');
        header.className = 'welcome-header';

        const time = new Date();
        const timeOfDay = time.getHours() < 12 ? 'Morning' : time.getHours() < 18 ? 'Afternoon' : 'Evening';

        header.innerHTML = `
            <div class="welcome-message">
                <h1>Good ${timeOfDay}, Cultivator</h1>
                <p class="welcome-subtitle">Continue your path to immortality</p>
            </div>
            <div class="game-logo">
                <div class="logo-text">Idle Cultivation</div>
                <div class="logo-subtitle">Ashes on the Wind</div>
            </div>
        `;

        return header;
    }

    /**
     * Create player status panel
     */
    createPlayerStatusPanel() {
        const panel = document.createElement('div');
        panel.className = 'main-menu-panel player-status-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-user"></span> Player Status';

        const content = document.createElement('div');
        content.className = 'panel-content player-status-content';

        // Player avatar and basic info
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        content.appendChild(playerInfo);

        // Cultivation progress
        const cultivationProgress = document.createElement('div');
        cultivationProgress.className = 'cultivation-progress';
        content.appendChild(cultivationProgress);

        // Resource display
        const resourceDisplay = document.createElement('div');
        resourceDisplay.className = 'resource-display';
        content.appendChild(resourceDisplay);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create quick actions panel
     */
    createQuickActionsPanel() {
        const panel = document.createElement('div');
        panel.className = 'main-menu-panel quick-actions-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-lightning"></span> Quick Actions';

        const content = document.createElement('div');
        content.className = 'panel-content quick-actions-content';

        const actions = [
            {
                id: 'cultivate',
                name: 'Quick Cultivate',
                description: 'Start cultivation session',
                icon: 'icon-meditation',
                action: () => this.quickCultivate()
            },
            {
                id: 'breakthrough',
                name: 'Attempt Breakthrough',
                description: 'Try to advance realm',
                icon: 'icon-star',
                action: () => this.attemptBreakthrough()
            },
            {
                id: 'gacha',
                name: 'Pull Scripture',
                description: 'Single scripture pull',
                icon: 'icon-dice',
                action: () => this.quickGacha()
            },
            {
                id: 'duel',
                name: 'Quick Duel',
                description: 'Fight suitable opponent',
                icon: 'icon-sword',
                action: () => this.quickDuel()
            }
        ];

        const actionGrid = document.createElement('div');
        actionGrid.className = 'action-grid';

        actions.forEach(action => {
            const actionCard = this.createActionCard(action);
            actionGrid.appendChild(actionCard);
        });

        content.appendChild(actionGrid);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create action card
     */
    createActionCard(action) {
        const card = document.createElement('div');
        card.className = 'action-card';

        card.innerHTML = `
            <div class="action-icon">
                <span class="${action.icon}"></span>
            </div>
            <div class="action-info">
                <div class="action-name">${action.name}</div>
                <div class="action-description">${action.description}</div>
            </div>
        `;

        card.addEventListener('click', action.action);

        return card;
    }

    /**
     * Create navigation panel
     */
    createNavigationPanel() {
        const panel = document.createElement('div');
        panel.className = 'main-menu-panel navigation-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-compass"></span> Game Sections';

        const content = document.createElement('div');
        content.className = 'panel-content navigation-content';

        const navigationOptions = [
            {
                id: 'cultivation',
                name: 'Cultivation',
                description: 'Manage your cultivation progress and techniques',
                icon: 'icon-meditation',
                color: '#4fc3f7',
                badge: null
            },
            {
                id: 'scripture',
                name: 'Scripture Study',
                description: 'Collect and study ancient scriptures',
                icon: 'icon-scroll',
                color: '#66bb6a',
                badge: { text: 'New!', type: 'success' }
            },
            {
                id: 'combat',
                name: 'Combat Arena',
                description: 'Test your strength against other cultivators',
                icon: 'icon-sword',
                color: '#ef5350',
                badge: null
            },
            {
                id: 'sect',
                name: 'Sect Affairs',
                description: 'Participate in sect activities and missions',
                icon: 'icon-temple',
                color: '#ab47bc',
                badge: { text: '3', type: 'notification' }
            },
            {
                id: 'quest',
                name: 'Quests & Achievements',
                description: 'Complete quests and unlock achievements',
                icon: 'icon-quest',
                color: '#ffa726',
                badge: { text: '!', type: 'urgent' }
            }
        ];

        const navigationGrid = document.createElement('div');
        navigationGrid.className = 'navigation-grid';

        navigationOptions.forEach(option => {
            const navCard = this.createNavigationCard(option);
            navigationGrid.appendChild(navCard);
        });

        content.appendChild(navigationGrid);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create navigation card
     */
    createNavigationCard(option) {
        const card = document.createElement('div');
        card.className = 'navigation-card';
        card.style.borderLeftColor = option.color;

        card.innerHTML = `
            <div class="nav-card-header">
                <div class="nav-icon" style="color: ${option.color}">
                    <span class="${option.icon}"></span>
                </div>
                <div class="nav-info">
                    <div class="nav-name">${option.name}</div>
                    <div class="nav-description">${option.description}</div>
                </div>
                ${option.badge ? `
                    <div class="nav-badge ${option.badge.type}">
                        ${option.badge.text}
                    </div>
                ` : ''}
            </div>
            <div class="nav-card-footer">
                <span class="nav-hint">Click to explore</span>
                <span class="nav-arrow icon-arrow-right"></span>
            </div>
        `;

        card.addEventListener('click', () => {
            if (this.viewManager) {
                this.viewManager.navigateTo(option.id);
            }
        });

        return card;
    }

    /**
     * Create overview panel
     */
    createOverviewPanel() {
        const panel = document.createElement('div');
        panel.className = 'main-menu-panel overview-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-dashboard"></span> Game Overview';

        const content = document.createElement('div');
        content.className = 'panel-content overview-content';

        // Progress summary
        const progressSummary = document.createElement('div');
        progressSummary.className = 'progress-summary';
        content.appendChild(progressSummary);

        // Recent activities
        const recentActivities = document.createElement('div');
        recentActivities.className = 'recent-activities';

        const activitiesHeader = document.createElement('h4');
        activitiesHeader.textContent = 'Recent Activities';
        recentActivities.appendChild(activitiesHeader);

        const activitiesList = document.createElement('div');
        activitiesList.className = 'activities-list';
        recentActivities.appendChild(activitiesList);

        content.appendChild(recentActivities);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create notifications panel
     */
    createNotificationsPanel() {
        const panel = document.createElement('div');
        panel.className = 'main-menu-panel notifications-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-bell"></span> Notifications</h3>
            <div class="notification-controls">
                <button class="btn btn-secondary btn-sm clear-all-btn">Clear All</button>
                <button class="btn btn-outline btn-sm settings-btn">
                    <span class="icon-settings"></span>
                </button>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content notifications-content';

        const notificationsList = document.createElement('div');
        notificationsList.className = 'notifications-list';
        content.appendChild(notificationsList);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const clearAllBtn = header.querySelector('.clear-all-btn');
        const settingsBtn = header.querySelector('.settings-btn');

        clearAllBtn.addEventListener('click', () => this.clearAllNotifications());
        settingsBtn.addEventListener('click', () => this.openNotificationSettings());

        return panel;
    }

    /**
     * Create footer with additional info
     */
    createFooter() {
        const footer = document.createElement('footer');
        footer.className = 'view-footer main-menu-footer';

        footer.innerHTML = `
            <div class="footer-stats">
                <div class="stat-item">
                    <span class="stat-label">Session Time:</span>
                    <span class="stat-value session-time">0h 0m</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Playtime:</span>
                    <span class="stat-value total-time">0h 0m</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Last Save:</span>
                    <span class="stat-value last-save">Just now</span>
                </div>
            </div>
            <div class="footer-actions">
                <button class="btn btn-secondary save-btn">
                    <span class="icon-save"></span> Save Game
                </button>
                <button class="btn btn-outline settings-btn">
                    <span class="icon-settings"></span> Settings
                </button>
            </div>
        `;

        // Add event listeners
        const saveBtn = footer.querySelector('.save-btn');
        const settingsBtn = footer.querySelector('.settings-btn');

        saveBtn.addEventListener('click', () => this.saveGame());
        settingsBtn.addEventListener('click', () => this.openSettings());

        return footer;
    }

    /**
     * Load main menu data
     */
    async loadData() {
        try {
            // Load player data
            this.playerData = this.gameState?.get('player') || this.createMockPlayerData();

            // Load game progress
            this.gameProgress = this.calculateGameProgress();

            // Load notifications
            this.notifications = this.getRecentNotifications();

            // Load system status
            this.systemStatus = this.getSystemStatus();

            console.log('MainMenuView: Data loaded successfully');

        } catch (error) {
            console.error('MainMenuView: Failed to load data', error);
            this.createMockData();
        }
    }

    /**
     * Create mock data for development
     */
    createMockData() {
        this.playerData = this.createMockPlayerData();
        this.gameProgress = {
            cultivation: { current: 'Body Refinement', progress: 65 },
            scriptures: { collected: 23, total: 150 },
            achievements: { unlocked: 15, total: 100 },
            quests: { active: 5, completed: 47 }
        };
        this.notifications = [
            {
                id: 1,
                type: 'achievement',
                title: 'Achievement Unlocked',
                message: 'First Breakthrough completed',
                timestamp: Date.now() - 300000,
                read: false
            },
            {
                id: 2,
                type: 'quest',
                title: 'Quest Complete',
                message: 'Daily Cultivation quest completed',
                timestamp: Date.now() - 600000,
                read: false
            },
            {
                id: 3,
                type: 'sect',
                title: 'Sect Mission',
                message: 'New sect mission available',
                timestamp: Date.now() - 900000,
                read: true
            }
        ];
    }

    createMockPlayerData() {
        return {
            name: 'Wandering Cultivator',
            level: 25,
            realm: 'Body Refinement',
            realmStage: 8,
            power: 1250,
            resources: {
                jade: 5430,
                crystals: 127,
                experience: 15750,
                spiritStones: 45
            },
            stats: {
                qi: 850,
                body: 720,
                cultivation: 1125
            }
        };
    }

    /**
     * Render view content
     */
    renderContent() {
        this.renderPlayerStatus();
        this.renderOverview();
        this.renderNotifications();
        this.updateSessionInfo();
    }

    /**
     * Render player status
     */
    renderPlayerStatus() {
        if (!this.playerData) return;

        const statusContent = this.playerStatusPanel.querySelector('.player-status-content');
        const playerInfo = statusContent.querySelector('.player-info');
        const cultivationProgress = statusContent.querySelector('.cultivation-progress');
        const resourceDisplay = statusContent.querySelector('.resource-display');

        // Player info
        playerInfo.innerHTML = `
            <div class="player-avatar">
                <div class="avatar-icon">
                    <span class="icon-user-circle"></span>
                </div>
                <div class="level-badge">${this.playerData.level}</div>
            </div>
            <div class="player-details">
                <div class="player-name">${this.playerData.name}</div>
                <div class="player-realm">${this.playerData.realm} (Stage ${this.playerData.realmStage})</div>
                <div class="player-power">Power: ${this.formatNumber(this.playerData.power)}</div>
            </div>
        `;

        // Cultivation progress
        cultivationProgress.innerHTML = `
            <div class="cultivation-stats">
                <div class="cult-stat">
                    <span class="stat-icon icon-energy"></span>
                    <span class="stat-label">Qi:</span>
                    <span class="stat-value">${this.formatNumber(this.playerData.stats.qi)}</span>
                </div>
                <div class="cult-stat">
                    <span class="stat-icon icon-muscle"></span>
                    <span class="stat-label">Body:</span>
                    <span class="stat-value">${this.formatNumber(this.playerData.stats.body)}</span>
                </div>
                <div class="cult-stat">
                    <span class="stat-icon icon-meditation"></span>
                    <span class="stat-label">Cultivation:</span>
                    <span class="stat-value">${this.formatNumber(this.playerData.stats.cultivation)}</span>
                </div>
            </div>
        `;

        // Resource display
        resourceDisplay.innerHTML = `
            <div class="resource-grid">
                <div class="resource-item">
                    <span class="resource-icon icon-jade"></span>
                    <span class="resource-amount">${this.formatNumber(this.playerData.resources.jade)}</span>
                </div>
                <div class="resource-item">
                    <span class="resource-icon icon-crystal"></span>
                    <span class="resource-amount">${this.formatNumber(this.playerData.resources.crystals)}</span>
                </div>
                <div class="resource-item">
                    <span class="resource-icon icon-experience"></span>
                    <span class="resource-amount">${this.formatNumber(this.playerData.resources.experience)}</span>
                </div>
                <div class="resource-item">
                    <span class="resource-icon icon-stone"></span>
                    <span class="resource-amount">${this.formatNumber(this.playerData.resources.spiritStones)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render overview
     */
    renderOverview() {
        if (!this.gameProgress) return;

        const overviewContent = this.overviewPanel.querySelector('.overview-content');
        const progressSummary = overviewContent.querySelector('.progress-summary');
        const activitiesList = overviewContent.querySelector('.activities-list');

        // Progress summary
        progressSummary.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-icon icon-meditation"></div>
                    <div class="summary-info">
                        <div class="summary-label">Cultivation</div>
                        <div class="summary-value">${this.gameProgress.cultivation.current}</div>
                        <div class="summary-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${this.gameProgress.cultivation.progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon icon-scroll"></div>
                    <div class="summary-info">
                        <div class="summary-label">Scriptures</div>
                        <div class="summary-value">${this.gameProgress.scriptures.collected}/${this.gameProgress.scriptures.total}</div>
                        <div class="summary-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(this.gameProgress.scriptures.collected / this.gameProgress.scriptures.total) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon icon-achievement"></div>
                    <div class="summary-info">
                        <div class="summary-label">Achievements</div>
                        <div class="summary-value">${this.gameProgress.achievements.unlocked}/${this.gameProgress.achievements.total}</div>
                        <div class="summary-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(this.gameProgress.achievements.unlocked / this.gameProgress.achievements.total) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="summary-item">
                    <div class="summary-icon icon-quest"></div>
                    <div class="summary-info">
                        <div class="summary-label">Quests</div>
                        <div class="summary-value">${this.gameProgress.quests.active} Active</div>
                        <div class="summary-subtext">${this.gameProgress.quests.completed} Completed</div>
                    </div>
                </div>
            </div>
        `;

        // Recent activities
        const recentActivities = this.getRecentActivities();
        activitiesList.innerHTML = '';

        if (recentActivities.length === 0) {
            activitiesList.innerHTML = '<div class="empty-activities">No recent activities</div>';
        } else {
            recentActivities.forEach(activity => {
                const activityItem = this.createActivityItem(activity);
                activitiesList.appendChild(activityItem);
            });
        }
    }

    /**
     * Create activity item
     */
    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';

        const timeAgo = this.formatTimeAgo(activity.timestamp);

        item.innerHTML = `
            <div class="activity-icon ${activity.type}">
                <span class="icon-${activity.type}"></span>
            </div>
            <div class="activity-info">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${timeAgo}</div>
            </div>
        `;

        return item;
    }

    /**
     * Render notifications
     */
    renderNotifications() {
        const notificationsList = this.notificationsPanel.querySelector('.notifications-list');

        notificationsList.innerHTML = '';

        if (this.notifications.length === 0) {
            notificationsList.innerHTML = '<div class="empty-notifications">No new notifications</div>';
        } else {
            this.notifications.slice(0, 5).forEach(notification => {
                const notificationItem = this.createNotificationItem(notification);
                notificationsList.appendChild(notificationItem);
            });

            if (this.notifications.length > 5) {
                const moreItem = document.createElement('div');
                moreItem.className = 'more-notifications';
                moreItem.textContent = `${this.notifications.length - 5} more notifications...`;
                notificationsList.appendChild(moreItem);
            }
        }
    }

    /**
     * Create notification item
     */
    createNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`;

        const timeAgo = this.formatTimeAgo(notification.timestamp);

        item.innerHTML = `
            <div class="notification-icon">
                <span class="icon-${notification.type}"></span>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
            <div class="notification-actions">
                <button class="btn btn-sm dismiss-btn" data-notification-id="${notification.id}">
                    <span class="icon-x"></span>
                </button>
            </div>
        `;

        // Add event listener
        const dismissBtn = item.querySelector('.dismiss-btn');
        dismissBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismissNotification(notification.id);
        });

        // Mark as read when clicked
        if (!notification.read) {
            item.addEventListener('click', () => {
                this.markNotificationAsRead(notification.id);
            });
        }

        return item;
    }

    /**
     * Update session info in footer
     */
    updateSessionInfo() {
        const sessionTime = this.footer?.querySelector('.session-time');
        const totalTime = this.footer?.querySelector('.total-time');
        const lastSave = this.footer?.querySelector('.last-save');

        if (sessionTime && this.gameState) {
            const sessionStart = this.gameState.get('meta.sessionStart') || Date.now();
            const sessionSeconds = Math.floor((Date.now() - sessionStart) / 1000);
            sessionTime.textContent = this.formatDuration(sessionSeconds);
        }

        if (totalTime && this.gameState) {
            const totalPlayTime = this.gameState.get('meta.totalPlayTime') || 0;
            totalTime.textContent = this.formatDuration(totalPlayTime);
        }

        if (lastSave && this.gameState) {
            const lastSaveTime = this.gameState.get('meta.lastSaved') || Date.now();
            lastSave.textContent = this.formatTimeAgo(lastSaveTime);
        }
    }

    /**
     * Quick action methods
     */
    quickCultivate() {
        console.log('Starting quick cultivation session');
        this.showNotification('Cultivation session started', 'success');
    }

    attemptBreakthrough() {
        console.log('Attempting breakthrough');
        // Check if breakthrough is possible
        const canBreakthrough = true; // Mock check
        if (canBreakthrough) {
            this.showNotification('Breakthrough attempted!', 'info');
        } else {
            this.showNotification('Breakthrough requirements not met', 'warning');
        }
    }

    quickGacha() {
        console.log('Performing quick gacha pull');
        // Mock gacha result
        const result = ['Common Scripture', 'Rare Pill', 'Uncommon Technique'][Math.floor(Math.random() * 3)];
        this.showNotification(`Obtained: ${result}`, 'success');
    }

    quickDuel() {
        console.log('Starting quick duel');
        this.showNotification('Searching for suitable opponent...', 'info');
        setTimeout(() => {
            const result = Math.random() > 0.5 ? 'Victory!' : 'Defeat!';
            this.showNotification(result, result === 'Victory!' ? 'success' : 'error');
        }, 2000);
    }

    /**
     * Notification methods
     */
    clearAllNotifications() {
        this.notifications = [];
        this.renderNotifications();
    }

    dismissNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.renderNotifications();
    }

    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.renderNotifications();
        }
    }

    openNotificationSettings() {
        console.log('Opening notification settings');
    }

    /**
     * Footer action methods
     */
    saveGame() {
        console.log('Saving game...');
        if (this.gameState) {
            this.gameState.save();
            this.showNotification('Game saved successfully', 'success');
        }
    }

    openSettings() {
        console.log('Opening game settings');
    }

    /**
     * Data calculation methods
     */
    calculateGameProgress() {
        // Mock implementation - would calculate actual progress
        return {
            cultivation: { current: 'Body Refinement', progress: 65 },
            scriptures: { collected: 23, total: 150 },
            achievements: { unlocked: 15, total: 100 },
            quests: { active: 5, completed: 47 }
        };
    }

    getRecentNotifications() {
        // Mock implementation - would get actual notifications
        return this.notifications || [];
    }

    getRecentActivities() {
        // Mock implementation
        return [
            {
                type: 'cultivation',
                text: 'Gained 250 Qi cultivation experience',
                timestamp: Date.now() - 300000
            },
            {
                type: 'achievement',
                text: 'Unlocked "First Breakthrough" achievement',
                timestamp: Date.now() - 600000
            },
            {
                type: 'quest',
                text: 'Completed "Daily Cultivation" quest',
                timestamp: Date.now() - 900000
            }
        ];
    }

    getSystemStatus() {
        return {
            autoSave: true,
            offlineProgress: true,
            notifications: true
        };
    }

    /**
     * Utility methods
     */
    formatNumber(num) {
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
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
    module.exports = { MainMenuView };
} else if (typeof window !== 'undefined') {
    window.MainMenuView = MainMenuView;
}