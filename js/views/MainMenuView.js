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
            console.log('MainMenuView: Loading data...');

            // Load player data with error handling
            try {
                this.playerData = this.gameState?.get('player') || null;
                if (!this.playerData) {
                    console.log('MainMenuView: No player data found, creating mock data');
                    this.playerData = this.createMockPlayerData();
                }
            } catch (playerError) {
                console.warn('MainMenuView: Error loading player data:', playerError);
                this.playerData = this.createMockPlayerData();
            }

            // Load game progress with error handling
            try {
                this.gameProgress = this.calculateGameProgress();
            } catch (progressError) {
                console.warn('MainMenuView: Error calculating game progress:', progressError);
                this.gameProgress = this._createDefaultGameProgress();
            }

            // Load notifications with error handling
            try {
                this.notifications = this.getRecentNotifications() || [];
                if (!Array.isArray(this.notifications)) {
                    console.warn('MainMenuView: Notifications is not an array, resetting to empty');
                    this.notifications = [];
                }
            } catch (notificationError) {
                console.warn('MainMenuView: Error loading notifications:', notificationError);
                this.notifications = [];
            }

            // Load system status with error handling
            try {
                this.systemStatus = this.getSystemStatus();
            } catch (statusError) {
                console.warn('MainMenuView: Error loading system status:', statusError);
                this.systemStatus = { autoSave: true, offlineProgress: true, notifications: true };
            }

            console.log('MainMenuView: Data loaded successfully');

        } catch (error) {
            console.error('MainMenuView: Failed to load data', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'loadData'
                }, 'ui');
            }
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
        try {
            if (!this.notificationsPanel) {
                console.warn('MainMenuView: Notifications panel not available for rendering');
                return;
            }

            const notificationsList = this.notificationsPanel.querySelector('.notifications-list');
            if (!notificationsList) {
                console.warn('MainMenuView: Notifications list container not found');
                return;
            }

            // Clear existing content
            notificationsList.innerHTML = '';

            // Ensure notifications is an array
            if (!Array.isArray(this.notifications)) {
                console.warn('MainMenuView: Notifications is not an array, resetting to empty');
                this.notifications = [];
            }

            if (this.notifications.length === 0) {
                notificationsList.innerHTML = '<div class="empty-notifications">No new notifications</div>';
            } else {
                // Render up to 5 notifications with error handling
                const notificationsToShow = this.notifications.slice(0, 5);
                let renderedCount = 0;

                notificationsToShow.forEach((notification, index) => {
                    try {
                        const notificationItem = this.createNotificationItem(notification);
                        if (notificationItem) {
                            notificationsList.appendChild(notificationItem);
                            renderedCount++;
                        }
                    } catch (renderError) {
                        console.error(`MainMenuView: Error rendering notification ${index}:`, renderError);
                        if (window.errorManager) {
                            window.errorManager.reportError(renderError, {
                                component: 'MainMenuView',
                                method: 'renderNotifications',
                                notificationIndex: index
                            }, 'ui');
                        }
                    }
                });

                // Show "more" indicator if there are additional notifications
                if (this.notifications.length > 5) {
                    try {
                        const moreItem = document.createElement('div');
                        moreItem.className = 'more-notifications';
                        const additionalCount = this.notifications.length - 5;
                        moreItem.textContent = `${additionalCount} more notification${additionalCount > 1 ? 's' : ''}...`;
                        notificationsList.appendChild(moreItem);
                    } catch (moreError) {
                        console.error('MainMenuView: Error creating more notifications indicator:', moreError);
                    }
                }

                console.log(`MainMenuView: Rendered ${renderedCount} notifications`);
            }
        } catch (error) {
            console.error('MainMenuView: Error rendering notifications:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'renderNotifications'
                }, 'ui');
            }

            // Fallback: show error message
            try {
                if (this.notificationsPanel) {
                    const notificationsList = this.notificationsPanel.querySelector('.notifications-list');
                    if (notificationsList) {
                        notificationsList.innerHTML = '<div class="error-notifications">Error loading notifications</div>';
                    }
                }
            } catch (fallbackError) {
                console.error('MainMenuView: Error showing fallback notification message:', fallbackError);
            }
        }
    }

    /**
     * Create notification item
     */
    createNotificationItem(notification) {
        try {
            if (!notification || typeof notification !== 'object') {
                console.warn('MainMenuView: Invalid notification data provided');
                return null;
            }

            // Validate required fields and provide defaults
            const safeNotification = {
                id: notification.id || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: notification.type || 'info',
                title: notification.title || 'Notification',
                message: notification.message || '',
                timestamp: notification.timestamp || Date.now(),
                read: notification.read || false
            };

            const item = document.createElement('div');
            item.className = `notification-item ${safeNotification.type} ${safeNotification.read ? 'read' : 'unread'}`;

            let timeAgo;
            try {
                timeAgo = this.formatTimeAgo(safeNotification.timestamp);
            } catch (timeError) {
                console.warn('MainMenuView: Error formatting notification time:', timeError);
                timeAgo = 'Recently';
            }

            // Safely escape HTML content
            const safeTitle = this._escapeHtml(safeNotification.title);
            const safeMessage = this._escapeHtml(safeNotification.message);
            const safeType = this._escapeHtml(safeNotification.type);

            item.innerHTML = `
                <div class="notification-icon">
                    <span class="icon-${safeType}"></span>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${safeTitle}</div>
                    <div class="notification-message">${safeMessage}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-actions">
                    <button class="btn btn-sm dismiss-btn" data-notification-id="${safeNotification.id}">
                        <span class="icon-x"></span>
                    </button>
                </div>
            `;

            // Add event listener with error handling
            const dismissBtn = item.querySelector('.dismiss-btn');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', (e) => {
                    try {
                        e.stopPropagation();
                        this.dismissNotification(safeNotification.id);
                    } catch (dismissError) {
                        console.error('MainMenuView: Error dismissing notification:', dismissError);
                        if (window.errorManager) {
                            window.errorManager.reportError(dismissError, {
                                component: 'MainMenuView',
                                method: 'dismissNotification',
                                notificationId: safeNotification.id
                            }, 'ui');
                        }
                    }
                });
            }

            // Mark as read when clicked with error handling
            if (!safeNotification.read) {
                item.addEventListener('click', () => {
                    try {
                        this.markNotificationAsRead(safeNotification.id);
                    } catch (readError) {
                        console.error('MainMenuView: Error marking notification as read:', readError);
                        if (window.errorManager) {
                            window.errorManager.reportError(readError, {
                                component: 'MainMenuView',
                                method: 'markNotificationAsRead',
                                notificationId: safeNotification.id
                            }, 'ui');
                        }
                    }
                });
            }

            return item;
        } catch (error) {
            console.error('MainMenuView: Error creating notification item:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'createNotificationItem'
                }, 'ui');
            }
            return null;
        }
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
        try {
            const clearedCount = Array.isArray(this.notifications) ? this.notifications.length : 0;
            this.notifications = [];
            this.renderNotifications();
            console.log(`MainMenuView: Cleared ${clearedCount} notifications`);
        } catch (error) {
            console.error('MainMenuView: Error clearing notifications:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'clearAllNotifications'
                }, 'ui');
            }
            // Force clear even if error occurred
            this.notifications = [];
        }
    }

    dismissNotification(notificationId) {
        try {
            if (!notificationId) {
                console.warn('MainMenuView: Cannot dismiss notification without ID');
                return;
            }

            if (!Array.isArray(this.notifications)) {
                console.warn('MainMenuView: Notifications is not an array, cannot dismiss');
                this.notifications = [];
                return;
            }

            const initialLength = this.notifications.length;
            this.notifications = this.notifications.filter(n => n && n.id !== notificationId);
            const newLength = this.notifications.length;

            if (initialLength === newLength) {
                console.warn(`MainMenuView: Notification ${notificationId} not found for dismissal`);
            } else {
                console.log(`MainMenuView: Dismissed notification ${notificationId}`);
            }

            this.renderNotifications();
        } catch (error) {
            console.error('MainMenuView: Error dismissing notification:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'dismissNotification',
                    notificationId
                }, 'ui');
            }
        }
    }

    markNotificationAsRead(notificationId) {
        try {
            if (!notificationId) {
                console.warn('MainMenuView: Cannot mark notification as read without ID');
                return;
            }

            if (!Array.isArray(this.notifications)) {
                console.warn('MainMenuView: Notifications is not an array, cannot mark as read');
                this.notifications = [];
                return;
            }

            const notification = this.notifications.find(n => n && n.id === notificationId);
            if (notification) {
                notification.read = true;
                console.log(`MainMenuView: Marked notification ${notificationId} as read`);
                this.renderNotifications();
            } else {
                console.warn(`MainMenuView: Notification ${notificationId} not found to mark as read`);
            }
        } catch (error) {
            console.error('MainMenuView: Error marking notification as read:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'markNotificationAsRead',
                    notificationId
                }, 'ui');
            }
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

    /**
     * Create default game progress
     */
    _createDefaultGameProgress() {
        return {
            cultivation: { current: 'Unknown', progress: 0 },
            scriptures: { collected: 0, total: 100 },
            achievements: { unlocked: 0, total: 50 },
            quests: { active: 0, completed: 0 }
        };
    }

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text || '');
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        try {
            if (!message) {
                console.warn('MainMenuView: Cannot show notification without message');
                return;
            }

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = String(message);

            // Add some basic styles for visibility
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
                color: white;
                border-radius: 4px;
                z-index: 10000;
                max-width: 300px;
                word-wrap: break-word;
            `;

            if (document.body) {
                document.body.appendChild(notification);

                setTimeout(() => {
                    try {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    } catch (removeError) {
                        console.warn('MainMenuView: Error removing notification:', removeError);
                    }
                }, 3000);
            } else {
                console.warn('MainMenuView: Document body not available for notification');
            }
        } catch (error) {
            console.error('MainMenuView: Error showing notification:', error);
            if (window.errorManager) {
                window.errorManager.reportError(error, {
                    component: 'MainMenuView',
                    method: 'showNotification',
                    message,
                    type
                }, 'ui');
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MainMenuView };
} else if (typeof window !== 'undefined') {
    window.MainMenuView = MainMenuView;
}