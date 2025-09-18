/**
 * CombatIntegration - System coordinator for all combat-related systems
 * Manages initialization, communication, and coordination between combat systems
 */
class CombatIntegration {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Combat system instances
        this.powerCalculator = null;
        this.combatSystem = null;
        this.duelManager = null;
        this.rankingSystem = null;
        this.tournamentSystem = null;

        // Integration state
        this.isInitialized = false;
        this.initializationOrder = [
            'powerCalculator',
            'rankingSystem',
            'combatSystem',
            'duelManager',
            'tournamentSystem'
        ];

        // Integration statistics
        this.statistics = {
            totalCombats: 0,
            totalDuels: 0,
            totalTournaments: 0,
            systemUptime: 0,
            lastMaintenanceTime: 0
        };

        // System health monitoring
        this.healthStatus = {
            powerCalculator: 'unknown',
            combatSystem: 'unknown',
            duelManager: 'unknown',
            rankingSystem: 'unknown',
            tournamentSystem: 'unknown',
            overall: 'unknown'
        };

        console.log('CombatIntegration: Initialized');
    }

    /**
     * Initialize all combat systems
     */
    async initialize() {
        try {
            console.log('CombatIntegration: Starting system initialization...');

            // Load integration statistics
            const savedStats = this.gameState.get('combatIntegrationStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Initialize systems in dependency order
            await this._initializePowerCalculator();
            await this._initializeRankingSystem();
            await this._initializeCombatSystem();
            await this._initializeDuelManager();
            await this._initializeTournamentSystem();

            // Set up cross-system event handlers
            this._setupCrossSystemEvents();

            // Start health monitoring
            this._startHealthMonitoring();

            // Start maintenance scheduling
            this._scheduleMaintenance();

            this.isInitialized = true;
            this.statistics.systemUptime = Date.now();

            this.eventManager.emit('combat:integration_initialized', {
                systems: this._getSystemStatus(),
                statistics: this.statistics
            });

            console.log('CombatIntegration: All systems initialized successfully');

        } catch (error) {
            console.error('CombatIntegration: Initialization failed:', error);
            this._handleInitializationError(error);
            throw error;
        }
    }

    /**
     * Get system status overview
     * @returns {Object} System status information
     */
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            healthStatus: { ...this.healthStatus },
            systems: this._getSystemStatus(),
            statistics: { ...this.statistics },
            uptime: this.isInitialized ? Date.now() - this.statistics.systemUptime : 0
        };
    }

    /**
     * Start a quick combat encounter
     * @param {Object} opponent - Opponent data
     * @param {Object} options - Combat options
     * @returns {Object} Combat result
     */
    async startQuickCombat(opponent, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Combat systems not initialized');
        }

        const config = {
            updateRanking: true,
            awardRewards: true,
            ...options
        };

        try {
            // Start combat
            const combatResult = this.combatSystem.startCombat(opponent, config);

            if (combatResult.success) {
                this.statistics.totalCombats++;

                // Update ranking if configured
                if (config.updateRanking && combatResult.result) {
                    const opponentRating = this._estimateOpponentRating(opponent);
                    this.rankingSystem.updateRatings('player', opponent.id, combatResult.result, {
                        opponentRating: opponentRating
                    });
                }

                this._saveStatistics();
            }

            return combatResult;

        } catch (error) {
            console.error('CombatIntegration: Quick combat failed:', error);
            throw error;
        }
    }

    /**
     * Queue for PvP duel
     * @param {Object} options - Duel options
     * @returns {Object} Queue result
     */
    queueForDuel(options = {}) {
        if (!this.isInitialized) {
            throw new Error('Combat systems not initialized');
        }

        try {
            const result = this.duelManager.queueForDuel(options);

            if (result.success) {
                this.statistics.totalDuels++;
                this._saveStatistics();
            }

            return result;

        } catch (error) {
            console.error('CombatIntegration: Duel queue failed:', error);
            throw error;
        }
    }

    /**
     * Join a tournament
     * @param {string} tournamentId - Tournament ID
     * @returns {Object} Join result
     */
    joinTournament(tournamentId) {
        if (!this.isInitialized) {
            throw new Error('Combat systems not initialized');
        }

        try {
            const result = this.tournamentSystem.joinTournament(tournamentId);

            if (result.success) {
                this.statistics.totalTournaments++;
                this._saveStatistics();
            }

            return result;

        } catch (error) {
            console.error('CombatIntegration: Tournament join failed:', error);
            throw error;
        }
    }

    /**
     * Get player's current combat power
     * @param {Object} options - Calculation options
     * @returns {number} Combat power
     */
    getPlayerPower(options = {}) {
        if (!this.powerCalculator) {
            throw new Error('PowerCalculator not initialized');
        }

        return this.powerCalculator.calculatePlayerPower(options);
    }

    /**
     * Get comprehensive combat summary
     * @returns {Object} Combat summary
     */
    getCombatSummary() {
        if (!this.isInitialized) {
            return null;
        }

        const playerPower = this.powerCalculator.calculatePlayerPower();
        const playerRanking = this.rankingSystem.getPlayerRanking();
        const combatStats = this.combatSystem.getStatistics();
        const duelStats = this.duelManager.getStatistics();
        const tournamentData = this.tournamentSystem.getPlayerTournamentData();

        return {
            power: {
                current: playerPower,
                tier: this.powerCalculator.getPowerTier(playerPower),
                breakdown: this.powerCalculator.calculatePlayerPower({ breakdown: true })
            },
            ranking: {
                ...playerRanking,
                tier: this.rankingSystem.getTierInfo(),
                season: this.rankingSystem.getSeasonData()
            },
            combat: combatStats,
            duels: duelStats,
            tournaments: tournamentData,
            currentCombat: this.combatSystem.getCurrentCombat(),
            queueStatus: this.duelManager.getQueueStatus(),
            availableTournaments: this.tournamentSystem.getAvailableTournaments(),
            availableOpponents: this.duelManager.getAvailableOpponents()
        };
    }

    /**
     * Perform system maintenance
     * @param {Object} options - Maintenance options
     */
    async performMaintenance(options = {}) {
        const config = {
            clearCaches: true,
            optimizeData: true,
            validateIntegrity: true,
            ...options
        };

        console.log('CombatIntegration: Starting maintenance...');

        try {
            if (config.clearCaches) {
                this.powerCalculator?.clearCache();
            }

            if (config.optimizeData) {
                await this._optimizeSystemData();
            }

            if (config.validateIntegrity) {
                await this._validateSystemIntegrity();
            }

            this.statistics.lastMaintenanceTime = Date.now();
            this._saveStatistics();

            this.eventManager.emit('combat:maintenance_completed', {
                timestamp: Date.now(),
                options: config
            });

            console.log('CombatIntegration: Maintenance completed');

        } catch (error) {
            console.error('CombatIntegration: Maintenance failed:', error);
            throw error;
        }
    }

    /**
     * Reset combat systems (admin function)
     * @param {Object} options - Reset options
     */
    async resetSystems(options = {}) {
        const config = {
            preserveRankings: true,
            preserveTournamentHistory: true,
            preserveStatistics: false,
            ...options
        };

        console.warn('CombatIntegration: Resetting combat systems...');

        try {
            // Reset individual systems
            if (this.combatSystem) {
                this.combatSystem.forceEndCombat('system_reset');
            }

            if (this.duelManager) {
                this.duelManager.cancelQueue();
                await this.duelManager.refreshAIOpponents();
            }

            if (this.powerCalculator) {
                this.powerCalculator.clearCache();
            }

            if (!config.preserveRankings && this.rankingSystem) {
                this.rankingSystem.startNewSeason();
            }

            if (!config.preserveStatistics) {
                this.statistics = {
                    totalCombats: 0,
                    totalDuels: 0,
                    totalTournaments: 0,
                    systemUptime: Date.now(),
                    lastMaintenanceTime: Date.now()
                };
            }

            this._saveStatistics();

            this.eventManager.emit('combat:systems_reset', {
                timestamp: Date.now(),
                options: config
            });

            console.log('CombatIntegration: Systems reset completed');

        } catch (error) {
            console.error('CombatIntegration: Reset failed:', error);
            throw error;
        }
    }

    // Private methods

    /**
     * Initialize PowerCalculator
     */
    async _initializePowerCalculator() {
        if (!window.PowerCalculator) {
            throw new Error('PowerCalculator class not found');
        }

        this.powerCalculator = new window.PowerCalculator(this.gameState, this.eventManager);
        this.healthStatus.powerCalculator = 'healthy';

        console.log('CombatIntegration: PowerCalculator initialized');
    }

    /**
     * Initialize RankingSystem
     */
    async _initializeRankingSystem() {
        if (!window.RankingSystem) {
            throw new Error('RankingSystem class not found');
        }

        this.rankingSystem = new window.RankingSystem(this.gameState, this.eventManager);
        await this.rankingSystem.initialize();
        this.healthStatus.rankingSystem = 'healthy';

        console.log('CombatIntegration: RankingSystem initialized');
    }

    /**
     * Initialize CombatSystem
     */
    async _initializeCombatSystem() {
        if (!window.CombatSystem) {
            throw new Error('CombatSystem class not found');
        }

        this.combatSystem = new window.CombatSystem(
            this.gameState,
            this.eventManager,
            this.powerCalculator
        );
        await this.combatSystem.initialize();
        this.healthStatus.combatSystem = 'healthy';

        console.log('CombatIntegration: CombatSystem initialized');
    }

    /**
     * Initialize DuelManager
     */
    async _initializeDuelManager() {
        if (!window.DuelManager) {
            throw new Error('DuelManager class not found');
        }

        this.duelManager = new window.DuelManager(
            this.gameState,
            this.eventManager,
            this.combatSystem,
            this.powerCalculator,
            this.rankingSystem
        );
        await this.duelManager.initialize();
        this.healthStatus.duelManager = 'healthy';

        console.log('CombatIntegration: DuelManager initialized');
    }

    /**
     * Initialize TournamentSystem
     */
    async _initializeTournamentSystem() {
        if (!window.TournamentSystem) {
            throw new Error('TournamentSystem class not found');
        }

        this.tournamentSystem = new window.TournamentSystem(
            this.gameState,
            this.eventManager,
            this.combatSystem,
            this.powerCalculator,
            this.rankingSystem
        );
        await this.tournamentSystem.initialize();
        this.healthStatus.tournamentSystem = 'healthy';

        console.log('CombatIntegration: TournamentSystem initialized');
    }

    /**
     * Set up cross-system event handlers
     */
    _setupCrossSystemEvents() {
        // Combat end events should update rankings
        this.eventManager.on('combat:ended', (data) => {
            if (data.result === 'victory' || data.result === 'defeat') {
                // This is handled by individual systems, but we can add integration logic here
                this._handleCombatEnd(data);
            }
        });

        // Ranking changes should trigger power recalculation
        this.eventManager.on('ranking:updated', (data) => {
            this.powerCalculator?.clearCache();
        });

        // Tournament completions should update rankings
        this.eventManager.on('tournament:completed', (data) => {
            this._handleTournamentCompletion(data);
        });

        // Monitor system health
        this.eventManager.on('error', (error) => {
            this._handleSystemError(error);
        });

        console.log('CombatIntegration: Cross-system events configured');
    }

    /**
     * Handle combat end event
     * @param {Object} data - Combat end data
     */
    _handleCombatEnd(data) {
        // Integration logic for combat completion
        if (data.result === 'victory') {
            // Could trigger achievements, update quest progress, etc.
            this.eventManager.emit('combat:integration:victory', data);
        }
    }

    /**
     * Handle tournament completion
     * @param {Object} data - Tournament completion data
     */
    _handleTournamentCompletion(data) {
        // Integration logic for tournament completion
        this.eventManager.emit('combat:integration:tournament_completed', data);
    }

    /**
     * Handle system error
     * @param {Object} error - Error data
     */
    _handleSystemError(error) {
        console.error('CombatIntegration: System error detected:', error);

        // Update health status based on error
        if (error.system) {
            this.healthStatus[error.system] = 'error';
        }

        this._updateOverallHealth();
    }

    /**
     * Start health monitoring
     */
    _startHealthMonitoring() {
        setInterval(() => {
            this._checkSystemHealth();
        }, 30000); // Every 30 seconds

        console.log('CombatIntegration: Health monitoring started');
    }

    /**
     * Check system health
     */
    _checkSystemHealth() {
        // Check each system's health
        const systems = ['powerCalculator', 'combatSystem', 'duelManager', 'rankingSystem', 'tournamentSystem'];

        for (const systemName of systems) {
            const system = this[systemName];
            if (system) {
                try {
                    // Basic health check - if system responds, it's healthy
                    if (system.isInitialized !== false) {
                        this.healthStatus[systemName] = 'healthy';
                    } else {
                        this.healthStatus[systemName] = 'unhealthy';
                    }
                } catch (error) {
                    this.healthStatus[systemName] = 'error';
                    console.error(`CombatIntegration: Health check failed for ${systemName}:`, error);
                }
            } else {
                this.healthStatus[systemName] = 'missing';
            }
        }

        this._updateOverallHealth();
    }

    /**
     * Update overall health status
     */
    _updateOverallHealth() {
        const statuses = Object.values(this.healthStatus).filter(status => status !== 'overall');

        if (statuses.every(status => status === 'healthy')) {
            this.healthStatus.overall = 'healthy';
        } else if (statuses.some(status => status === 'error' || status === 'missing')) {
            this.healthStatus.overall = 'critical';
        } else {
            this.healthStatus.overall = 'degraded';
        }
    }

    /**
     * Schedule maintenance
     */
    _scheduleMaintenance() {
        // Schedule daily maintenance
        const scheduleNext = () => {
            const now = new Date();
            const nextMaintenance = new Date(now);
            nextMaintenance.setHours(3, 0, 0, 0); // 3 AM daily

            if (nextMaintenance <= now) {
                nextMaintenance.setDate(nextMaintenance.getDate() + 1);
            }

            const timeUntilMaintenance = nextMaintenance.getTime() - now.getTime();

            setTimeout(async () => {
                try {
                    await this.performMaintenance();
                } catch (error) {
                    console.error('CombatIntegration: Scheduled maintenance failed:', error);
                }
                scheduleNext(); // Schedule the next maintenance
            }, timeUntilMaintenance);
        };

        scheduleNext();
        console.log('CombatIntegration: Maintenance scheduled');
    }

    /**
     * Get system status
     * @returns {Object} System status
     */
    _getSystemStatus() {
        return {
            powerCalculator: !!this.powerCalculator,
            combatSystem: !!this.combatSystem,
            duelManager: !!this.duelManager,
            rankingSystem: !!this.rankingSystem,
            tournamentSystem: !!this.tournamentSystem
        };
    }

    /**
     * Estimate opponent rating for ranking calculations
     * @param {Object} opponent - Opponent data
     * @returns {number} Estimated rating
     */
    _estimateOpponentRating(opponent) {
        if (opponent.rating) {
            return opponent.rating;
        }

        // Estimate based on power level
        const powerLevelToRating = {
            'weak': 800,
            'medium': 1000,
            'strong': 1300,
            'legendary': 1800
        };

        return powerLevelToRating[opponent.powerLevel] || 1000;
    }

    /**
     * Handle initialization error
     * @param {Error} error - Initialization error
     */
    _handleInitializationError(error) {
        this.healthStatus.overall = 'critical';

        this.eventManager.emit('combat:integration_error', {
            error: error.message,
            timestamp: Date.now()
        });
    }

    /**
     * Optimize system data
     */
    async _optimizeSystemData() {
        // Cleanup old data, compact structures, etc.
        console.log('CombatIntegration: Optimizing system data...');

        // Example optimizations
        if (this.duelManager) {
            await this.duelManager.refreshAIOpponents();
        }

        if (this.powerCalculator) {
            this.powerCalculator.clearCache();
        }
    }

    /**
     * Validate system integrity
     */
    async _validateSystemIntegrity() {
        console.log('CombatIntegration: Validating system integrity...');

        // Check that all systems are properly connected
        if (!this.powerCalculator || !this.combatSystem || !this.duelManager ||
            !this.rankingSystem || !this.tournamentSystem) {
            throw new Error('Not all systems are initialized');
        }

        // Check data consistency
        const playerPower = this.powerCalculator.calculatePlayerPower();
        if (isNaN(playerPower) || playerPower < 0) {
            throw new Error('Invalid player power calculation');
        }

        const playerRating = this.rankingSystem.getPlayerRating();
        if (isNaN(playerRating) || playerRating < 0) {
            throw new Error('Invalid player rating');
        }
    }

    /**
     * Save integration statistics
     */
    _saveStatistics() {
        this.gameState.update({
            combatIntegrationStats: this.statistics
        }, { source: 'combat:integration' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CombatIntegration };
} else if (typeof window !== 'undefined') {
    window.CombatIntegration = CombatIntegration;
}