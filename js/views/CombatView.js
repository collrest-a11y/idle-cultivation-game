/**
 * CombatView - Display and manage combat activities, dueling, and tournaments
 * Shows combat interface, opponent selection, rankings, and combat history
 */
class CombatView extends GameView {
    constructor(container, options = {}) {
        super(container, options);

        // System references
        this.combatSystem = null;
        this.duelManager = null;
        this.tournamentSystem = null;
        this.rankingSystem = null;

        // UI components
        this.combatStatusPanel = null;
        this.opponentPanel = null;
        this.combatLogPanel = null;
        this.rankingsPanel = null;
        this.tournamentPanel = null;

        // Current data
        this.playerStats = null;
        this.currentOpponent = null;
        this.combatHistory = [];
        this.rankings = null;
        this.tournaments = null;

        // Combat state
        this.isInCombat = false;
        this.activeDuel = null;
        this.selectedOpponent = null;

        this.refreshRate = 1000; // 1 second for combat updates
    }

    /**
     * Create main content area
     */
    createContent() {
        const content = document.createElement('main');
        content.className = 'view-content combat-content';

        // Create tab navigation
        const tabNav = this.createTabNavigation();
        content.appendChild(tabNav);

        // Create main layout
        const layout = document.createElement('div');
        layout.className = 'combat-layout';

        // Left column - Combat Interface
        const leftColumn = document.createElement('div');
        leftColumn.className = 'combat-left-column';

        // Right column - Rankings and Tournaments
        const rightColumn = document.createElement('div');
        rightColumn.className = 'combat-right-column';

        // Create panels
        this.combatStatusPanel = this.createCombatStatusPanel();
        this.opponentPanel = this.createOpponentPanel();
        this.combatLogPanel = this.createCombatLogPanel();
        this.rankingsPanel = this.createRankingsPanel();
        this.tournamentPanel = this.createTournamentPanel();

        // Organize panels
        leftColumn.appendChild(this.combatStatusPanel);
        leftColumn.appendChild(this.opponentPanel);
        leftColumn.appendChild(this.combatLogPanel);

        rightColumn.appendChild(this.rankingsPanel);
        rightColumn.appendChild(this.tournamentPanel);

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
        nav.className = 'combat-tabs';

        const tabs = [
            { id: 'duel', label: 'Dueling', icon: 'icon-swords' },
            { id: 'tournament', label: 'Tournaments', icon: 'icon-trophy' },
            { id: 'rankings', label: 'Rankings', icon: 'icon-leaderboard' }
        ];

        tabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.className = `tab-button ${tab.id === 'duel' ? 'active' : ''}`;
            tabButton.dataset.tab = tab.id;
            tabButton.innerHTML = `<span class="${tab.icon}"></span> ${tab.label}`;

            tabButton.addEventListener('click', () => this.switchTab(tab.id));
            nav.appendChild(tabButton);
        });

        return nav;
    }

    /**
     * Create combat status panel
     */
    createCombatStatusPanel() {
        const panel = document.createElement('div');
        panel.className = 'combat-panel status-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-user"></span> Combat Status';

        const content = document.createElement('div');
        content.className = 'panel-content status-content';

        // Player stats
        const playerStats = document.createElement('div');
        playerStats.className = 'player-stats';
        content.appendChild(playerStats);

        // Combat power display
        const powerDisplay = document.createElement('div');
        powerDisplay.className = 'power-display';
        content.appendChild(powerDisplay);

        // Current match status
        const matchStatus = document.createElement('div');
        matchStatus.className = 'match-status';
        content.appendChild(matchStatus);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Create opponent selection panel
     */
    createOpponentPanel() {
        const panel = document.createElement('div');
        panel.className = 'combat-panel opponent-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-target"></span> Select Opponent</h3>
            <div class="opponent-controls">
                <button class="btn btn-secondary refresh-opponents-btn">
                    <span class="icon-refresh"></span> Refresh
                </button>
                <select class="difficulty-select">
                    <option value="easy">Easy Opponents</option>
                    <option value="medium">Medium Opponents</option>
                    <option value="hard">Hard Opponents</option>
                    <option value="extreme">Extreme Opponents</option>
                </select>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content opponent-content';

        // Opponent list
        const opponentList = document.createElement('div');
        opponentList.className = 'opponent-list';
        content.appendChild(opponentList);

        // Selected opponent details
        const selectedOpponent = document.createElement('div');
        selectedOpponent.className = 'selected-opponent';
        content.appendChild(selectedOpponent);

        // Combat actions
        const combatActions = document.createElement('div');
        combatActions.className = 'combat-actions';
        combatActions.innerHTML = `
            <button class="btn btn-primary challenge-btn" disabled>
                <span class="icon-sword"></span> Challenge
            </button>
            <button class="btn btn-danger retreat-btn" style="display: none;">
                <span class="icon-shield"></span> Retreat
            </button>
        `;
        content.appendChild(combatActions);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const refreshBtn = header.querySelector('.refresh-opponents-btn');
        const difficultySelect = header.querySelector('.difficulty-select');
        const challengeBtn = combatActions.querySelector('.challenge-btn');
        const retreatBtn = combatActions.querySelector('.retreat-btn');

        refreshBtn.addEventListener('click', () => this.refreshOpponents());
        difficultySelect.addEventListener('change', (e) => this.setDifficulty(e.target.value));
        challengeBtn.addEventListener('click', () => this.startDuel());
        retreatBtn.addEventListener('click', () => this.retreatFromDuel());

        return panel;
    }

    /**
     * Create combat log panel
     */
    createCombatLogPanel() {
        const panel = document.createElement('div');
        panel.className = 'combat-panel log-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-scroll"></span> Combat Log</h3>
            <div class="log-controls">
                <button class="btn btn-secondary clear-log-btn">Clear</button>
                <select class="log-filter">
                    <option value="all">All Events</option>
                    <option value="attacks">Attacks Only</option>
                    <option value="damage">Damage Only</option>
                    <option value="results">Results Only</option>
                </select>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content log-content';

        // Combat log container
        const logContainer = document.createElement('div');
        logContainer.className = 'combat-log-container';

        const logList = document.createElement('div');
        logList.className = 'combat-log-list';
        logContainer.appendChild(logList);

        content.appendChild(logContainer);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const clearBtn = header.querySelector('.clear-log-btn');
        const filterSelect = header.querySelector('.log-filter');

        clearBtn.addEventListener('click', () => this.clearCombatLog());
        filterSelect.addEventListener('change', (e) => this.filterCombatLog(e.target.value));

        return panel;
    }

    /**
     * Create rankings panel
     */
    createRankingsPanel() {
        const panel = document.createElement('div');
        panel.className = 'combat-panel rankings-panel';

        const header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <h3><span class="icon-leaderboard"></span> Rankings</h3>
            <div class="ranking-controls">
                <select class="ranking-type">
                    <option value="power">Power Rankings</option>
                    <option value="wins">Win Rate</option>
                    <option value="streak">Win Streak</option>
                    <option value="tournament">Tournament Points</option>
                </select>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'panel-content rankings-content';

        // Player's current rank
        const playerRank = document.createElement('div');
        playerRank.className = 'player-rank';
        content.appendChild(playerRank);

        // Rankings list
        const rankingsList = document.createElement('div');
        rankingsList.className = 'rankings-list';
        content.appendChild(rankingsList);

        panel.appendChild(header);
        panel.appendChild(content);

        // Add event listeners
        const typeSelect = header.querySelector('.ranking-type');
        typeSelect.addEventListener('change', (e) => this.loadRankings(e.target.value));

        return panel;
    }

    /**
     * Create tournament panel
     */
    createTournamentPanel() {
        const panel = document.createElement('div');
        panel.className = 'combat-panel tournament-panel';

        const header = document.createElement('h3');
        header.className = 'panel-header';
        header.innerHTML = '<span class="icon-trophy"></span> Tournaments';

        const content = document.createElement('div');
        content.className = 'panel-content tournament-content';

        // Active tournaments
        const activeTournaments = document.createElement('div');
        activeTournaments.className = 'active-tournaments';

        const tournamentsHeader = document.createElement('h4');
        tournamentsHeader.textContent = 'Active Tournaments';
        activeTournaments.appendChild(tournamentsHeader);

        const tournamentsList = document.createElement('div');
        tournamentsList.className = 'tournaments-list';
        activeTournaments.appendChild(tournamentsList);

        // Tournament history
        const tournamentHistory = document.createElement('div');
        tournamentHistory.className = 'tournament-history';

        const historyHeader = document.createElement('h4');
        historyHeader.textContent = 'Tournament History';
        tournamentHistory.appendChild(historyHeader);

        const historyList = document.createElement('div');
        historyList.className = 'history-list';
        tournamentHistory.appendChild(historyList);

        content.appendChild(activeTournaments);
        content.appendChild(tournamentHistory);

        panel.appendChild(header);
        panel.appendChild(content);

        return panel;
    }

    /**
     * Switch between tabs
     */
    switchTab(tabId) {
        // Update tab buttons
        const tabButtons = this.element.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabId);
        });

        // Show/hide panels based on tab
        this.updatePanelVisibility(tabId);
    }

    /**
     * Update panel visibility based on current tab
     */
    updatePanelVisibility(tabId) {
        const panels = {
            duel: [this.combatStatusPanel, this.opponentPanel, this.combatLogPanel],
            tournament: [this.combatStatusPanel, this.tournamentPanel],
            rankings: [this.rankingsPanel]
        };

        // Hide all panels
        [this.combatStatusPanel, this.opponentPanel, this.combatLogPanel, this.rankingsPanel, this.tournamentPanel]
            .forEach(panel => panel.style.display = 'none');

        // Show panels for current tab
        const activePanels = panels[tabId] || [];
        activePanels.forEach(panel => panel.style.display = 'block');
    }

    /**
     * Load combat data
     */
    async loadData() {
        try {
            // Get system references
            this.combatSystem = window.game?.moduleManager?.getModule('combat')?.combatSystem;
            this.duelManager = window.duelManager; // Placeholder
            this.tournamentSystem = window.tournamentSystem; // Placeholder
            this.rankingSystem = window.rankingSystem; // Placeholder

            // Load player combat stats
            this.playerStats = this.combatSystem?.getPlayerStats() || this.createMockPlayerStats();

            // Load opponents
            this.refreshOpponents();

            // Load rankings
            this.loadRankings('power');

            // Load tournaments
            this.loadTournaments();

            console.log('CombatView: Data loaded successfully');

        } catch (error) {
            console.error('CombatView: Failed to load data', error);
            this.createMockData();
        }
    }

    /**
     * Create mock data for development
     */
    createMockData() {
        this.playerStats = this.createMockPlayerStats();
        this.createMockOpponents();
        this.createMockRankings();
        this.createMockTournaments();
    }

    createMockPlayerStats() {
        return {
            name: 'Player',
            level: 25,
            power: 1250,
            health: 100,
            maxHealth: 100,
            attack: 85,
            defense: 70,
            speed: 60,
            wins: 23,
            losses: 7,
            winStreak: 3,
            rank: 847,
            tournamentPoints: 1520
        };
    }

    createMockOpponents() {
        this.opponents = [
            {
                id: 'npc1',
                name: 'Iron Fist Zhang',
                level: 23,
                power: 1100,
                difficulty: 'easy',
                winRate: 0.65,
                reward: { experience: 150, jade: 50 }
            },
            {
                id: 'npc2',
                name: 'Swift Blade Li',
                level: 26,
                power: 1300,
                difficulty: 'medium',
                winRate: 0.55,
                reward: { experience: 200, jade: 80 }
            },
            {
                id: 'npc3',
                name: 'Demon Crusher Wang',
                level: 30,
                power: 1800,
                difficulty: 'hard',
                winRate: 0.35,
                reward: { experience: 300, jade: 150 }
            }
        ];
    }

    createMockRankings() {
        this.rankings = Array.from({ length: 20 }, (_, i) => ({
            rank: i + 1,
            name: `Player ${i + 1}`,
            level: 20 + Math.floor(Math.random() * 20),
            power: 1000 + Math.floor(Math.random() * 2000),
            wins: Math.floor(Math.random() * 100),
            winRate: (Math.random() * 0.4 + 0.4).toFixed(2)
        }));
    }

    createMockTournaments() {
        this.tournaments = [
            {
                id: 'weekly',
                name: 'Weekly Arena',
                type: 'elimination',
                status: 'active',
                timeLeft: 3600 * 24 * 2, // 2 days
                participants: 128,
                maxParticipants: 128,
                reward: { jade: 1000, crystals: 50 }
            },
            {
                id: 'monthly',
                name: 'Grand Championship',
                type: 'league',
                status: 'registration',
                timeLeft: 3600 * 24 * 7, // 7 days
                participants: 45,
                maxParticipants: 256,
                reward: { jade: 5000, crystals: 200, title: 'Champion' }
            }
        ];
    }

    /**
     * Render view content
     */
    renderContent() {
        this.renderCombatStatus();
        this.renderOpponents();
        this.renderCombatLog();
        this.renderRankings();
        this.renderTournaments();
        this.updatePanelVisibility('duel');
    }

    /**
     * Render combat status
     */
    renderCombatStatus() {
        if (!this.playerStats) return;

        const statusContent = this.combatStatusPanel.querySelector('.status-content');
        const playerStats = statusContent.querySelector('.player-stats');
        const powerDisplay = statusContent.querySelector('.power-display');
        const matchStatus = statusContent.querySelector('.match-status');

        // Player stats
        playerStats.innerHTML = `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Level:</span>
                    <span class="stat-value">${this.playerStats.level}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Attack:</span>
                    <span class="stat-value">${this.playerStats.attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Defense:</span>
                    <span class="stat-value">${this.playerStats.defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Speed:</span>
                    <span class="stat-value">${this.playerStats.speed}</span>
                </div>
            </div>
        `;

        // Power display
        powerDisplay.innerHTML = `
            <div class="power-indicator">
                <div class="power-label">Combat Power</div>
                <div class="power-value">${this.formatNumber(this.playerStats.power)}</div>
            </div>
            <div class="health-bar">
                <div class="health-label">Health</div>
                <div class="health-progress">
                    <div class="health-fill" style="width: ${(this.playerStats.health / this.playerStats.maxHealth) * 100}%"></div>
                    <div class="health-text">${this.playerStats.health}/${this.playerStats.maxHealth}</div>
                </div>
            </div>
        `;

        // Match status
        if (this.isInCombat) {
            matchStatus.innerHTML = `
                <div class="in-combat">
                    <span class="status-indicator active"></span>
                    <span class="status-text">In Combat vs ${this.currentOpponent?.name || 'Unknown'}</span>
                </div>
            `;
        } else {
            matchStatus.innerHTML = `
                <div class="combat-record">
                    <div class="record-item">
                        <span class="record-label">Wins:</span>
                        <span class="record-value win">${this.playerStats.wins}</span>
                    </div>
                    <div class="record-item">
                        <span class="record-label">Losses:</span>
                        <span class="record-value loss">${this.playerStats.losses}</span>
                    </div>
                    <div class="record-item">
                        <span class="record-label">Win Streak:</span>
                        <span class="record-value streak">${this.playerStats.winStreak}</span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Render opponents list
     */
    renderOpponents() {
        const opponentList = this.opponentPanel.querySelector('.opponent-list');
        if (!opponentList || !this.opponents) return;

        opponentList.innerHTML = '';

        this.opponents.forEach(opponent => {
            const opponentElement = this.createOpponentCard(opponent);
            opponentList.appendChild(opponentElement);
        });
    }

    /**
     * Create opponent card
     */
    createOpponentCard(opponent) {
        const card = document.createElement('div');
        card.className = `opponent-card difficulty-${opponent.difficulty} ${this.selectedOpponent?.id === opponent.id ? 'selected' : ''}`;
        card.dataset.opponentId = opponent.id;

        const powerComparison = this.comparePower(opponent.power, this.playerStats.power);

        card.innerHTML = `
            <div class="opponent-header">
                <div class="opponent-name">${opponent.name}</div>
                <div class="opponent-level">Level ${opponent.level}</div>
            </div>
            <div class="opponent-stats">
                <div class="power-comparison ${powerComparison.class}">
                    <span class="power-value">${this.formatNumber(opponent.power)}</span>
                    <span class="power-indicator">${powerComparison.indicator}</span>
                </div>
                <div class="win-rate">Win Rate: ${(opponent.winRate * 100).toFixed(0)}%</div>
            </div>
            <div class="opponent-rewards">
                <div class="reward-item">
                    <span class="icon-experience"></span>
                    <span>${opponent.reward.experience} XP</span>
                </div>
                <div class="reward-item">
                    <span class="icon-jade"></span>
                    <span>${opponent.reward.jade} Jade</span>
                </div>
            </div>
        `;

        // Add click handler
        card.addEventListener('click', () => {
            this.selectOpponent(opponent);
        });

        return card;
    }

    /**
     * Render combat log
     */
    renderCombatLog() {
        const logList = this.combatLogPanel.querySelector('.combat-log-list');
        if (!logList) return;

        if (this.combatHistory.length === 0) {
            logList.innerHTML = '<div class="empty-log">No combat history</div>';
            return;
        }

        logList.innerHTML = '';

        this.combatHistory.slice(-20).forEach(entry => {
            const logEntry = this.createLogEntry(entry);
            logList.appendChild(logEntry);
        });

        // Auto-scroll to bottom
        logList.scrollTop = logList.scrollHeight;
    }

    /**
     * Create log entry
     */
    createLogEntry(entry) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${entry.type}`;

        const timestamp = new Date(entry.timestamp).toLocaleTimeString();

        logEntry.innerHTML = `
            <div class="log-timestamp">${timestamp}</div>
            <div class="log-message">${entry.message}</div>
            ${entry.damage ? `<div class="log-damage">${entry.damage} damage</div>` : ''}
        `;

        return logEntry;
    }

    /**
     * Render rankings
     */
    renderRankings() {
        const rankingsContent = this.rankingsPanel.querySelector('.rankings-content');
        const playerRank = rankingsContent.querySelector('.player-rank');
        const rankingsList = rankingsContent.querySelector('.rankings-list');

        if (!this.rankings) return;

        // Player's current rank
        playerRank.innerHTML = `
            <div class="player-rank-display">
                <div class="rank-number">#${this.playerStats.rank}</div>
                <div class="rank-details">
                    <div class="player-name">${this.playerStats.name}</div>
                    <div class="player-power">${this.formatNumber(this.playerStats.power)} Power</div>
                </div>
            </div>
        `;

        // Rankings list
        rankingsList.innerHTML = '';

        this.rankings.slice(0, 10).forEach(player => {
            const rankEntry = this.createRankEntry(player);
            rankingsList.appendChild(rankEntry);
        });
    }

    /**
     * Create rank entry
     */
    createRankEntry(player) {
        const entry = document.createElement('div');
        entry.className = 'rank-entry';

        entry.innerHTML = `
            <div class="rank-position">#${player.rank}</div>
            <div class="rank-info">
                <div class="player-name">${player.name}</div>
                <div class="player-stats">
                    <span class="power">${this.formatNumber(player.power)} Power</span>
                    <span class="level">Level ${player.level}</span>
                    <span class="wins">${player.wins} Wins</span>
                </div>
            </div>
            <div class="rank-winrate">${(player.winRate * 100).toFixed(0)}%</div>
        `;

        return entry;
    }

    /**
     * Render tournaments
     */
    renderTournaments() {
        const tournamentsList = this.tournamentPanel.querySelector('.tournaments-list');
        if (!tournamentsList || !this.tournaments) return;

        tournamentsList.innerHTML = '';

        this.tournaments.forEach(tournament => {
            const tournamentCard = this.createTournamentCard(tournament);
            tournamentsList.appendChild(tournamentCard);
        });
    }

    /**
     * Create tournament card
     */
    createTournamentCard(tournament) {
        const card = document.createElement('div');
        card.className = `tournament-card status-${tournament.status}`;

        const timeLeft = this.formatTime(tournament.timeLeft);

        card.innerHTML = `
            <div class="tournament-header">
                <div class="tournament-name">${tournament.name}</div>
                <div class="tournament-status ${tournament.status}">${this.capitalizeFirst(tournament.status)}</div>
            </div>
            <div class="tournament-info">
                <div class="info-item">
                    <span class="info-label">Type:</span>
                    <span class="info-value">${this.capitalizeFirst(tournament.type)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Participants:</span>
                    <span class="info-value">${tournament.participants}/${tournament.maxParticipants}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Time Left:</span>
                    <span class="info-value">${timeLeft}</span>
                </div>
            </div>
            <div class="tournament-rewards">
                <h5>Rewards:</h5>
                <div class="reward-list">
                    ${Object.entries(tournament.reward).map(([type, amount]) => `
                        <div class="reward-item">
                            <span class="icon-${type}"></span>
                            <span>${amount}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="tournament-actions">
                ${tournament.status === 'registration' ?
                    '<button class="btn btn-primary join-tournament-btn">Join Tournament</button>' :
                    tournament.status === 'active' ?
                        '<button class="btn btn-success view-tournament-btn">View Bracket</button>' :
                        '<button class="btn btn-secondary tournament-ended-btn" disabled>Ended</button>'
                }
            </div>
        `;

        // Add event listeners
        const joinBtn = card.querySelector('.join-tournament-btn');
        const viewBtn = card.querySelector('.view-tournament-btn');

        joinBtn?.addEventListener('click', () => this.joinTournament(tournament.id));
        viewBtn?.addEventListener('click', () => this.viewTournament(tournament.id));

        return card;
    }

    /**
     * Action methods
     */
    refreshOpponents() {
        // This would call the actual opponent generation system
        console.log('Refreshing opponents...');
        this.createMockOpponents();
        this.renderOpponents();
    }

    selectOpponent(opponent) {
        this.selectedOpponent = opponent;

        // Update visual selection
        this.opponentPanel.querySelectorAll('.opponent-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.opponentId === opponent.id);
        });

        // Update selected opponent details
        const selectedSection = this.opponentPanel.querySelector('.selected-opponent');
        selectedSection.innerHTML = `
            <div class="selected-opponent-details">
                <h4>Selected: ${opponent.name}</h4>
                <div class="opponent-analysis">
                    <div class="analysis-item">
                        <span class="analysis-label">Power Difference:</span>
                        <span class="analysis-value ${this.comparePower(opponent.power, this.playerStats.power).class}">
                            ${this.comparePower(opponent.power, this.playerStats.power).text}
                        </span>
                    </div>
                    <div class="analysis-item">
                        <span class="analysis-label">Estimated Win Chance:</span>
                        <span class="analysis-value">${this.calculateWinChance(opponent)}%</span>
                    </div>
                </div>
            </div>
        `;

        // Enable challenge button
        const challengeBtn = this.opponentPanel.querySelector('.challenge-btn');
        challengeBtn.disabled = false;
    }

    async startDuel() {
        if (!this.selectedOpponent) return;

        try {
            this.isInCombat = true;
            this.currentOpponent = this.selectedOpponent;

            // Update UI
            this.renderCombatStatus();
            const challengeBtn = this.opponentPanel.querySelector('.challenge-btn');
            const retreatBtn = this.opponentPanel.querySelector('.retreat-btn');
            challengeBtn.style.display = 'none';
            retreatBtn.style.display = 'inline-block';

            // Add combat start to log
            this.addCombatLogEntry({
                type: 'combat-start',
                message: `Combat started against ${this.currentOpponent.name}`,
                timestamp: Date.now()
            });

            // Start combat simulation
            this.simulateCombat();

        } catch (error) {
            console.error('CombatView: Failed to start duel', error);
            this.showNotification('Failed to start duel: ' + error.message, 'error');
        }
    }

    async retreatFromDuel() {
        this.isInCombat = false;
        this.currentOpponent = null;

        // Update UI
        this.renderCombatStatus();
        const challengeBtn = this.opponentPanel.querySelector('.challenge-btn');
        const retreatBtn = this.opponentPanel.querySelector('.retreat-btn');
        challengeBtn.style.display = 'inline-block';
        retreatBtn.style.display = 'none';

        // Add retreat to log
        this.addCombatLogEntry({
            type: 'retreat',
            message: 'Retreated from combat',
            timestamp: Date.now()
        });
    }

    simulateCombat() {
        // Simple combat simulation for demonstration
        const combatTurns = 5 + Math.floor(Math.random() * 10);
        let currentTurn = 0;

        const combatInterval = setInterval(() => {
            if (!this.isInCombat || currentTurn >= combatTurns) {
                clearInterval(combatInterval);
                if (this.isInCombat) {
                    this.endCombat();
                }
                return;
            }

            // Simulate combat turn
            const playerDamage = 10 + Math.floor(Math.random() * 20);
            const opponentDamage = 8 + Math.floor(Math.random() * 15);

            this.addCombatLogEntry({
                type: 'attack',
                message: `You deal ${playerDamage} damage to ${this.currentOpponent.name}`,
                damage: playerDamage,
                timestamp: Date.now()
            });

            setTimeout(() => {
                this.addCombatLogEntry({
                    type: 'defense',
                    message: `${this.currentOpponent.name} deals ${opponentDamage} damage to you`,
                    damage: opponentDamage,
                    timestamp: Date.now()
                });
            }, 500);

            currentTurn++;
        }, 1000);
    }

    endCombat() {
        const victory = Math.random() < this.calculateWinChance(this.currentOpponent) / 100;

        this.addCombatLogEntry({
            type: victory ? 'victory' : 'defeat',
            message: victory ? 'Victory!' : 'Defeat!',
            timestamp: Date.now()
        });

        // Update stats
        if (victory) {
            this.playerStats.wins++;
            this.playerStats.winStreak++;
        } else {
            this.playerStats.losses++;
            this.playerStats.winStreak = 0;
        }

        this.isInCombat = false;
        this.currentOpponent = null;
        this.renderCombatStatus();

        // Reset UI
        const challengeBtn = this.opponentPanel.querySelector('.challenge-btn');
        const retreatBtn = this.opponentPanel.querySelector('.retreat-btn');
        challengeBtn.style.display = 'inline-block';
        retreatBtn.style.display = 'none';

        this.showNotification(victory ? 'Victory!' : 'Defeat!', victory ? 'success' : 'error');
    }

    addCombatLogEntry(entry) {
        this.combatHistory.push(entry);
        this.renderCombatLog();
    }

    clearCombatLog() {
        this.combatHistory = [];
        this.renderCombatLog();
    }

    filterCombatLog(filter) {
        // Filter implementation
        console.log(`Filtering combat log by: ${filter}`);
    }

    setDifficulty(difficulty) {
        console.log(`Setting difficulty to: ${difficulty}`);
        this.refreshOpponents();
    }

    loadRankings(type) {
        console.log(`Loading rankings by: ${type}`);
        // This would call the actual ranking system
        this.renderRankings();
    }

    loadTournaments() {
        console.log('Loading tournaments...');
        // This would call the actual tournament system
        this.renderTournaments();
    }

    joinTournament(tournamentId) {
        console.log(`Joining tournament: ${tournamentId}`);
        this.showNotification('Joined tournament successfully', 'success');
    }

    viewTournament(tournamentId) {
        console.log(`Viewing tournament: ${tournamentId}`);
        // This would open a tournament bracket view
    }

    /**
     * Utility methods
     */
    comparePower(opponentPower, playerPower) {
        const ratio = opponentPower / playerPower;

        if (ratio < 0.8) {
            return { class: 'much-weaker', indicator: '<<', text: 'Much Weaker' };
        } else if (ratio < 0.9) {
            return { class: 'weaker', indicator: '<', text: 'Weaker' };
        } else if (ratio <= 1.1) {
            return { class: 'equal', indicator: '≈', text: 'Equal' };
        } else if (ratio <= 1.2) {
            return { class: 'stronger', indicator: '>', text: 'Stronger' };
        } else {
            return { class: 'much-stronger', indicator: '>>', text: 'Much Stronger' };
        }
    }

    calculateWinChance(opponent) {
        const powerRatio = this.playerStats.power / opponent.power;
        const baseChance = Math.min(90, Math.max(10, powerRatio * 50));
        return Math.round(baseChance);
    }

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
    module.exports = { CombatView };
} else if (typeof window !== 'undefined') {
    window.CombatView = CombatView;
}