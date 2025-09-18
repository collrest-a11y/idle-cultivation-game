/**
 * DuelManager - PvP dueling system with matchmaking and AI opponents
 * Handles player vs player duels, AI opponent generation, and matchmaking logic
 */
class DuelManager {
    constructor(gameState, eventManager, combatSystem, powerCalculator, rankingSystem) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.combatSystem = combatSystem;
        this.powerCalculator = powerCalculator;
        this.rankingSystem = rankingSystem;

        // Duel state
        this.activeDuels = new Map();
        this.duelQueue = [];
        this.aiOpponents = new Map();

        // Matchmaking configuration
        this.matchmakingConfig = {
            maxPowerVariance: 0.3, // 30% power difference allowed
            maxRatingDifference: 200, // ELO rating difference
            queueTimeout: 60000, // 1 minute queue timeout
            aiOpponentChance: 0.7, // 70% chance to match against AI when no players available
            enableCrossRealm: true // Allow matches across different cultivation realms
        };

        // Duel statistics
        this.statistics = {
            totalDuels: 0,
            playerVsPlayer: 0,
            playerVsAI: 0,
            successfulMatches: 0,
            averageMatchmakingTime: 0,
            queueTimeouts: 0
        };

        this.isInitialized = false;

        console.log('DuelManager: Initialized');
    }

    /**
     * Initialize the duel manager
     */
    async initialize() {
        try {
            // Load duel statistics
            const savedStats = this.gameState.get('duelStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Generate AI opponents pool
            await this._generateAIOpponentsPool();

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;

            this.eventManager.emit('duel:manager_initialized', {
                aiOpponentsCount: this.aiOpponents.size,
                statistics: this.statistics
            });

            console.log('DuelManager: Initialization complete');

        } catch (error) {
            console.error('DuelManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Queue player for matchmaking
     * @param {Object} options - Matchmaking options
     * @returns {Object} Queue result
     */
    queueForDuel(options = {}) {
        if (!this.isInitialized) {
            throw new Error('DuelManager not initialized');
        }

        const config = {
            preferredOpponentType: 'any', // 'player', 'ai', 'any'
            allowAI: true,
            maxWaitTime: this.matchmakingConfig.queueTimeout,
            powerVariance: this.matchmakingConfig.maxPowerVariance,
            ...options
        };

        const playerPower = this.powerCalculator.calculatePlayerPower();
        const playerRating = this.rankingSystem.getPlayerRating();

        const queueEntry = {
            playerId: 'player', // In single-player this is always 'player'
            playerPower: playerPower,
            playerRating: playerRating,
            config: config,
            queueTime: Date.now(),
            timeout: Date.now() + config.maxWaitTime
        };

        // Check for immediate match
        const immediateMatch = this._findImmediateMatch(queueEntry);
        if (immediateMatch) {
            return this._createDuel(queueEntry, immediateMatch);
        }

        // Add to queue
        this.duelQueue.push(queueEntry);

        // Set timeout for queue entry
        setTimeout(() => {
            this._handleQueueTimeout(queueEntry);
        }, config.maxWaitTime);

        this.eventManager.emit('duel:queued', {
            playerPower: playerPower,
            playerRating: playerRating,
            estimatedWaitTime: this._estimateWaitTime(queueEntry)
        });

        return {
            success: true,
            queued: true,
            estimatedWaitTime: this._estimateWaitTime(queueEntry),
            queuePosition: this.duelQueue.length
        };
    }

    /**
     * Cancel queue for dueling
     * @returns {Object} Cancel result
     */
    cancelQueue() {
        const queueIndex = this.duelQueue.findIndex(entry => entry.playerId === 'player');

        if (queueIndex === -1) {
            return {
                success: false,
                reason: 'not_in_queue'
            };
        }

        this.duelQueue.splice(queueIndex, 1);

        this.eventManager.emit('duel:queue_cancelled', {});

        return {
            success: true
        };
    }

    /**
     * Challenge a specific AI opponent
     * @param {string} opponentId - AI opponent ID
     * @returns {Object} Challenge result
     */
    challengeAIOpponent(opponentId) {
        if (!this.isInitialized) {
            throw new Error('DuelManager not initialized');
        }

        const opponent = this.aiOpponents.get(opponentId);
        if (!opponent) {
            return {
                success: false,
                reason: 'opponent_not_found'
            };
        }

        // Check if player meets requirements
        const playerPower = this.powerCalculator.calculatePlayerPower();
        const powerComparison = this.powerCalculator.comparePower(
            this.powerCalculator._getPlayerData(),
            opponent
        );

        // Prevent challenging opponents that are too powerful
        if (powerComparison.ratio < 0.1) { // Less than 10% of opponent's power
            return {
                success: false,
                reason: 'opponent_too_powerful',
                recommendedPower: Math.floor(opponent.power * 0.1)
            };
        }

        // Create direct duel
        const duelResult = this._createDirectDuel('player', opponent);

        this.eventManager.emit('duel:ai_challenged', {
            opponentId: opponentId,
            opponent: opponent,
            playerPower: playerPower,
            opponentPower: opponent.power
        });

        return duelResult;
    }

    /**
     * Get available AI opponents for the player
     * @param {Object} filters - Filtering options
     * @returns {Array} Available opponents
     */
    getAvailableOpponents(filters = {}) {
        const config = {
            powerLevel: 'any', // 'weak', 'medium', 'strong', 'legendary', 'any'
            maxPowerRatio: 5.0, // Don't show opponents more than 5x player power
            minPowerRatio: 0.2, // Don't show opponents less than 20% player power
            maxResults: 20,
            ...filters
        };

        const playerPower = this.powerCalculator.calculatePlayerPower();
        const opponents = [];

        for (const [id, opponent] of this.aiOpponents) {
            // Power filtering
            const powerRatio = playerPower / opponent.power;
            if (powerRatio < config.minPowerRatio || powerRatio > config.maxPowerRatio) {
                continue;
            }

            // Power level filtering
            if (config.powerLevel !== 'any' && opponent.powerLevel !== config.powerLevel) {
                continue;
            }

            opponents.push({
                id: id,
                name: opponent.name,
                description: opponent.description,
                powerLevel: opponent.powerLevel,
                power: opponent.power,
                cultivation: opponent.cultivation,
                winRate: this._getOpponentWinRate(id),
                difficulty: this._calculateDifficulty(playerPower, opponent.power)
            });
        }

        // Sort by difficulty (closest to player power first)
        opponents.sort((a, b) => {
            const diffA = Math.abs(a.power - playerPower);
            const diffB = Math.abs(b.power - playerPower);
            return diffA - diffB;
        });

        return opponents.slice(0, config.maxResults);
    }

    /**
     * Get current queue status
     * @returns {Object} Queue status
     */
    getQueueStatus() {
        const playerInQueue = this.duelQueue.find(entry => entry.playerId === 'player');

        if (!playerInQueue) {
            return {
                inQueue: false,
                queueLength: this.duelQueue.length,
                estimatedWaitTime: 0
            };
        }

        const waitTime = Date.now() - playerInQueue.queueTime;
        const remainingTime = Math.max(0, playerInQueue.timeout - Date.now());

        return {
            inQueue: true,
            queueLength: this.duelQueue.length,
            waitTime: waitTime,
            remainingTime: remainingTime,
            estimatedWaitTime: this._estimateWaitTime(playerInQueue)
        };
    }

    /**
     * Get duel statistics
     * @returns {Object} Duel statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Force refresh AI opponents pool
     */
    async refreshAIOpponents() {
        this.aiOpponents.clear();
        await this._generateAIOpponentsPool();

        this.eventManager.emit('duel:ai_pool_refreshed', {
            count: this.aiOpponents.size
        });
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Handle combat end to update duel results
        this.eventManager.on('combat:ended', (data) => {
            this._handleDuelResult(data);
        });

        // Save statistics
        this.eventManager.on('gameState:save', () => {
            this._saveStatistics();
        });

        // Process matchmaking queue periodically
        setInterval(() => {
            this._processMatchmakingQueue();
        }, 5000); // Every 5 seconds
    }

    /**
     * Generate AI opponents pool
     */
    async _generateAIOpponentsPool() {
        // Generate opponents across different power levels
        const playerPower = this.powerCalculator.calculatePlayerPower();

        // Generate weak opponents (50-80% of player power)
        for (let i = 0; i < 5; i++) {
            const opponent = this._generateAIOpponent('weak', playerPower * (0.5 + Math.random() * 0.3));
            this.aiOpponents.set(opponent.id, opponent);
        }

        // Generate medium opponents (80-120% of player power)
        for (let i = 0; i < 8; i++) {
            const opponent = this._generateAIOpponent('medium', playerPower * (0.8 + Math.random() * 0.4));
            this.aiOpponents.set(opponent.id, opponent);
        }

        // Generate strong opponents (120-200% of player power)
        for (let i = 0; i < 5; i++) {
            const opponent = this._generateAIOpponent('strong', playerPower * (1.2 + Math.random() * 0.8));
            this.aiOpponents.set(opponent.id, opponent);
        }

        // Generate legendary opponents (200-500% of player power)
        for (let i = 0; i < 3; i++) {
            const opponent = this._generateAIOpponent('legendary', playerPower * (2.0 + Math.random() * 3.0));
            this.aiOpponents.set(opponent.id, opponent);
        }

        console.log(`DuelManager: Generated ${this.aiOpponents.size} AI opponents`);
    }

    /**
     * Generate a single AI opponent
     * @param {string} powerLevel - Power level category
     * @param {number} targetPower - Target power level
     * @returns {Object} Generated opponent
     */
    _generateAIOpponent(powerLevel, targetPower) {
        const opponentTemplates = window.COMBAT_OPPONENTS;
        let templatePool = [];

        // Select appropriate templates based on power level
        if (opponentTemplates) {
            switch (powerLevel) {
                case 'weak':
                    templatePool = opponentTemplates.ROGUE_CULTIVATORS || [];
                    break;
                case 'medium':
                    templatePool = opponentTemplates.SECT_DISCIPLES || [];
                    break;
                case 'strong':
                    templatePool = opponentTemplates.ELITE_CULTIVATORS || [];
                    break;
                case 'legendary':
                    templatePool = opponentTemplates.LEGENDARY_BEINGS || [];
                    break;
            }
        }

        // Fallback template if no templates available
        if (templatePool.length === 0) {
            templatePool = [{
                id: 'generated_opponent',
                name: 'Wandering Cultivator',
                description: 'A mysterious cultivator seeking challenges',
                powerLevel: powerLevel,
                cultivation: { qi: { level: 10 }, body: { level: 8 }, realm: 'Body Refinement', stage: 1 },
                ai: { aggression: 0.5, technique_usage: 0.3, retreat_threshold: 0.2 },
                loot: { jade: { min: 10, max: 30 }, spiritCrystals: { min: 1, max: 5 } },
                abilities: ['basic_attack', 'defend']
            }];
        }

        const baseTemplate = templatePool[Math.floor(Math.random() * templatePool.length)];

        // Scale the opponent to match target power
        const scaledOpponent = this._scaleOpponentToTargetPower(baseTemplate, targetPower);

        // Generate unique ID
        scaledOpponent.id = `ai_${powerLevel}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        return scaledOpponent;
    }

    /**
     * Scale opponent stats to match target power
     * @param {Object} template - Base opponent template
     * @param {number} targetPower - Target power level
     * @returns {Object} Scaled opponent
     */
    _scaleOpponentToTargetPower(template, targetPower) {
        const scaledOpponent = JSON.parse(JSON.stringify(template)); // Deep clone

        // Calculate current power
        const currentPower = this.powerCalculator.calculateTotalPower(scaledOpponent);

        if (currentPower === 0) {
            return scaledOpponent;
        }

        // Calculate scaling factor
        const scaleFactor = Math.sqrt(targetPower / currentPower);

        // Scale cultivation levels
        if (scaledOpponent.cultivation) {
            if (scaledOpponent.cultivation.qi) {
                scaledOpponent.cultivation.qi.level = Math.max(1, Math.floor(
                    scaledOpponent.cultivation.qi.level * scaleFactor
                ));
            }
            if (scaledOpponent.cultivation.body) {
                scaledOpponent.cultivation.body.level = Math.max(1, Math.floor(
                    scaledOpponent.cultivation.body.level * scaleFactor
                ));
            }

            // Adjust realm based on scaled levels
            const avgLevel = (scaledOpponent.cultivation.qi?.level + scaledOpponent.cultivation.body?.level) / 2;
            scaledOpponent.cultivation.realm = this._determineRealmFromLevel(avgLevel);
            scaledOpponent.cultivation.stage = Math.max(1, Math.min(10,
                Math.floor(avgLevel / 10) + 1
            ));
        }

        // Recalculate power to verify
        const newPower = this.powerCalculator.calculateTotalPower(scaledOpponent);
        scaledOpponent.power = newPower;

        return scaledOpponent;
    }

    /**
     * Determine cultivation realm from average level
     * @param {number} avgLevel - Average cultivation level
     * @returns {string} Cultivation realm
     */
    _determineRealmFromLevel(avgLevel) {
        if (avgLevel < 50) return 'Body Refinement';
        if (avgLevel < 150) return 'Qi Gathering';
        if (avgLevel < 300) return 'Foundation Building';
        if (avgLevel < 600) return 'Core Formation';
        if (avgLevel < 1200) return 'Nascent Soul';
        if (avgLevel < 2500) return 'Soul Transformation';
        if (avgLevel < 5000) return 'Void Refining';
        if (avgLevel < 10000) return 'Body Integration';
        if (avgLevel < 20000) return 'Mahayana';
        return 'True Immortal';
    }

    /**
     * Find immediate match for a queue entry
     * @param {Object} queueEntry - Player queue entry
     * @returns {Object|null} Matched opponent or null
     */
    _findImmediateMatch(queueEntry) {
        // For single-player game, we primarily match against AI
        if (queueEntry.config.allowAI) {
            return this._findSuitableAIOpponent(queueEntry);
        }

        return null;
    }

    /**
     * Find suitable AI opponent for a player
     * @param {Object} queueEntry - Player queue entry
     * @returns {Object|null} Suitable AI opponent or null
     */
    _findSuitableAIOpponent(queueEntry) {
        const suitableOpponents = [];

        for (const [id, opponent] of this.aiOpponents) {
            const powerRatio = queueEntry.playerPower / opponent.power;
            const powerWithinRange = powerRatio >= (1 - queueEntry.config.powerVariance) &&
                                   powerRatio <= (1 + queueEntry.config.powerVariance);

            if (powerWithinRange) {
                suitableOpponents.push({ id, opponent, powerRatio });
            }
        }

        if (suitableOpponents.length === 0) {
            return null;
        }

        // Select opponent closest to player power
        suitableOpponents.sort((a, b) => {
            const diffA = Math.abs(1 - a.powerRatio);
            const diffB = Math.abs(1 - b.powerRatio);
            return diffA - diffB;
        });

        return {
            type: 'ai',
            opponent: suitableOpponents[0].opponent
        };
    }

    /**
     * Create a duel between players/AI
     * @param {Object} player1 - First player/entry
     * @param {Object} match - Matched opponent data
     * @returns {Object} Duel creation result
     */
    _createDuel(player1, match) {
        const duelId = `duel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        // Remove from queue
        const queueIndex = this.duelQueue.findIndex(entry => entry.playerId === player1.playerId);
        if (queueIndex !== -1) {
            this.duelQueue.splice(queueIndex, 1);
        }

        // Start combat
        const combatResult = this.combatSystem.startCombat(match.opponent, {
            type: match.type === 'ai' ? 'pve' : 'pvp',
            allowRetreat: true
        });

        if (combatResult.success) {
            this.activeDuels.set(duelId, {
                id: duelId,
                combatId: combatResult.combatId,
                player1: player1.playerId,
                opponent: match.opponent,
                opponentType: match.type,
                startTime: Date.now()
            });

            // Update statistics
            this.statistics.totalDuels++;
            this.statistics.successfulMatches++;
            if (match.type === 'ai') {
                this.statistics.playerVsAI++;
            } else {
                this.statistics.playerVsPlayer++;
            }

            const waitTime = Date.now() - player1.queueTime;
            this.statistics.averageMatchmakingTime =
                (this.statistics.averageMatchmakingTime * (this.statistics.successfulMatches - 1) + waitTime) /
                this.statistics.successfulMatches;

            this.eventManager.emit('duel:started', {
                duelId: duelId,
                combatId: combatResult.combatId,
                opponent: match.opponent,
                opponentType: match.type,
                matchmakingTime: waitTime
            });

            return {
                success: true,
                duelId: duelId,
                combatId: combatResult.combatId,
                opponent: match.opponent,
                matchmakingTime: waitTime
            };
        }

        return {
            success: false,
            reason: 'combat_start_failed'
        };
    }

    /**
     * Create a direct duel (no matchmaking)
     * @param {string} playerId - Player ID
     * @param {Object} opponent - Opponent data
     * @returns {Object} Duel result
     */
    _createDirectDuel(playerId, opponent) {
        const combatResult = this.combatSystem.startCombat(opponent, {
            type: 'pve',
            allowRetreat: true
        });

        if (combatResult.success) {
            const duelId = `direct_duel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

            this.activeDuels.set(duelId, {
                id: duelId,
                combatId: combatResult.combatId,
                player1: playerId,
                opponent: opponent,
                opponentType: 'ai',
                startTime: Date.now(),
                direct: true
            });

            // Update statistics
            this.statistics.totalDuels++;
            this.statistics.playerVsAI++;

            this.eventManager.emit('duel:direct_started', {
                duelId: duelId,
                combatId: combatResult.combatId,
                opponent: opponent
            });

            return {
                success: true,
                duelId: duelId,
                combatId: combatResult.combatId
            };
        }

        return {
            success: false,
            reason: 'combat_start_failed'
        };
    }

    /**
     * Handle duel result when combat ends
     * @param {Object} combatData - Combat end data
     */
    _handleDuelResult(combatData) {
        // Find the duel associated with this combat
        let duelId = null;
        for (const [id, duel] of this.activeDuels) {
            if (duel.combatId === combatData.combatId) {
                duelId = id;
                break;
            }
        }

        if (!duelId) {
            return; // Not a duel combat
        }

        const duel = this.activeDuels.get(duelId);
        const duration = Date.now() - duel.startTime;

        // Update rankings if it was against another player (not applicable in single-player)
        if (duel.opponentType === 'player') {
            this.rankingSystem.updateRatings(duel.player1, duel.opponent.id, combatData.result);
        }

        // Clean up
        this.activeDuels.delete(duelId);

        this.eventManager.emit('duel:ended', {
            duelId: duelId,
            combatId: combatData.combatId,
            result: combatData.result,
            duration: duration,
            opponent: duel.opponent,
            opponentType: duel.opponentType
        });
    }

    /**
     * Process matchmaking queue periodically
     */
    _processMatchmakingQueue() {
        if (this.duelQueue.length === 0) {
            return;
        }

        // Process each queue entry
        for (let i = this.duelQueue.length - 1; i >= 0; i--) {
            const entry = this.duelQueue[i];

            // Check for timeout
            if (Date.now() > entry.timeout) {
                this._handleQueueTimeout(entry);
                continue;
            }

            // Try to find a match
            const match = this._findImmediateMatch(entry);
            if (match) {
                this._createDuel(entry, match);
            }
        }
    }

    /**
     * Handle queue timeout
     * @param {Object} entry - Queue entry that timed out
     */
    _handleQueueTimeout(entry) {
        const queueIndex = this.duelQueue.findIndex(e => e === entry);
        if (queueIndex !== -1) {
            this.duelQueue.splice(queueIndex, 1);
        }

        this.statistics.queueTimeouts++;

        // Offer AI opponent as fallback
        if (entry.config.allowAI) {
            const aiOpponent = this._findSuitableAIOpponent(entry);
            if (aiOpponent) {
                this.eventManager.emit('duel:queue_timeout_ai_offered', {
                    opponent: aiOpponent.opponent,
                    playerPower: entry.playerPower
                });
                return;
            }
        }

        this.eventManager.emit('duel:queue_timeout', {
            waitTime: Date.now() - entry.queueTime
        });
    }

    /**
     * Estimate wait time for queue entry
     * @param {Object} entry - Queue entry
     * @returns {number} Estimated wait time in milliseconds
     */
    _estimateWaitTime(entry) {
        // For single-player, wait time is usually very short since we match against AI
        if (entry.config.allowAI) {
            return 1000; // 1 second
        }

        return 30000; // 30 seconds for player-only matches (not applicable in single-player)
    }

    /**
     * Get opponent win rate (for display purposes)
     * @param {string} opponentId - Opponent ID
     * @returns {number} Win rate (0.0 to 1.0)
     */
    _getOpponentWinRate(opponentId) {
        // This could be tracked in the future
        // For now, return a simulated win rate based on opponent type
        const opponent = this.aiOpponents.get(opponentId);
        if (!opponent) return 0.5;

        switch (opponent.powerLevel) {
            case 'weak': return 0.3 + Math.random() * 0.2; // 30-50%
            case 'medium': return 0.4 + Math.random() * 0.2; // 40-60%
            case 'strong': return 0.6 + Math.random() * 0.2; // 60-80%
            case 'legendary': return 0.8 + Math.random() * 0.15; // 80-95%
            default: return 0.5;
        }
    }

    /**
     * Calculate difficulty rating
     * @param {number} playerPower - Player power
     * @param {number} opponentPower - Opponent power
     * @returns {string} Difficulty rating
     */
    _calculateDifficulty(playerPower, opponentPower) {
        const ratio = opponentPower / playerPower;

        if (ratio < 0.7) return 'Easy';
        if (ratio < 0.9) return 'Moderate';
        if (ratio < 1.1) return 'Balanced';
        if (ratio < 1.5) return 'Hard';
        if (ratio < 2.0) return 'Very Hard';
        return 'Extreme';
    }

    /**
     * Save duel statistics
     */
    _saveStatistics() {
        this.gameState.update({
            duelStats: this.statistics
        }, { source: 'duel:save' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DuelManager };
} else if (typeof window !== 'undefined') {
    window.DuelManager = DuelManager;
}