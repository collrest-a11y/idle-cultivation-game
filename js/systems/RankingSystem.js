/**
 * RankingSystem - ELO-based ranking system with leaderboards and seasonal resets
 * Manages combat rankings, ELO calculations, tier progression, and seasonal rewards
 */
class RankingSystem {
    constructor(gameState, eventManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;

        // Ranking configuration
        this.config = window.RANKING_CONFIG || {
            STARTING_RATING: 1000,
            K_FACTOR: 32,
            SEASON_LENGTH: 30 * 24 * 60 * 60 * 1000, // 30 days
            TIERS: {
                BRONZE: { min: 0, max: 1199, name: 'Bronze', color: '#CD7F32' },
                SILVER: { min: 1200, max: 1399, name: 'Silver', color: '#C0C0C0' },
                GOLD: { min: 1400, max: 1599, name: 'Gold', color: '#FFD700' },
                PLATINUM: { min: 1600, max: 1799, name: 'Platinum', color: '#E5E4E2' },
                DIAMOND: { min: 1800, max: 1999, name: 'Diamond', color: '#B9F2FF' },
                MASTER: { min: 2000, max: 2199, name: 'Master', color: '#800080' },
                GRANDMASTER: { min: 2200, max: 2399, name: 'Grandmaster', color: '#DC143C' },
                LEGEND: { min: 2400, max: 9999, name: 'Legend', color: '#FFD700' }
            },
            REWARDS: {
                BRONZE: { jade: 100, spiritCrystals: 5 },
                SILVER: { jade: 250, spiritCrystals: 15 },
                GOLD: { jade: 500, spiritCrystals: 25 },
                PLATINUM: { jade: 1000, spiritCrystals: 50 },
                DIAMOND: { jade: 2000, spiritCrystals: 100 },
                MASTER: { jade: 4000, spiritCrystals: 200, title: 'Combat Master' },
                GRANDMASTER: { jade: 8000, spiritCrystals: 400, title: 'Combat Grandmaster' },
                LEGEND: { jade: 15000, spiritCrystals: 750, title: 'Legendary Fighter', technique: 'legend_exclusive' }
            }
        };

        // Player ranking data
        this.playerRanking = {
            currentRating: this.config.STARTING_RATING,
            peakRating: this.config.STARTING_RATING,
            currentTier: this._getTierFromRating(this.config.STARTING_RATING),
            peakTier: this._getTierFromRating(this.config.STARTING_RATING),
            wins: 0,
            losses: 0,
            winStreak: 0,
            longestWinStreak: 0,
            gamesPlayed: 0,
            rankingHistory: []
        };

        // Season data
        this.seasonData = {
            currentSeason: 1,
            seasonStartTime: Date.now(),
            seasonEndTime: Date.now() + this.config.SEASON_LENGTH,
            previousSeasonRating: this.config.STARTING_RATING,
            seasonWins: 0,
            seasonLosses: 0,
            seasonPeakRating: this.config.STARTING_RATING,
            claimedSeasonRewards: false
        };

        // Leaderboard (for future multiplayer expansion)
        this.leaderboard = new Map();

        // Statistics
        this.statistics = {
            totalRatingGained: 0,
            totalRatingLost: 0,
            averageOpponentRating: this.config.STARTING_RATING,
            biggestUpset: { ratingDifference: 0, gained: 0 },
            longestWinStreak: 0,
            highestRating: this.config.STARTING_RATING,
            seasonsCompleted: 0
        };

        this.isInitialized = false;

        console.log('RankingSystem: Initialized');
    }

    /**
     * Initialize the ranking system
     */
    async initialize() {
        try {
            // Load player ranking data
            const savedRanking = this.gameState.get('playerRanking');
            if (savedRanking) {
                this.playerRanking = {
                    ...this.playerRanking,
                    ...savedRanking
                };
            }

            // Load season data
            const savedSeason = this.gameState.get('seasonData');
            if (savedSeason) {
                this.seasonData = {
                    ...this.seasonData,
                    ...savedSeason
                };
            }

            // Load statistics
            const savedStats = this.gameState.get('rankingStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Check if season has ended
            this._checkSeasonEnd();

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;

            this.eventManager.emit('ranking:initialized', {
                playerRanking: this.playerRanking,
                seasonData: this.seasonData,
                statistics: this.statistics
            });

            console.log('RankingSystem: Initialization complete');

        } catch (error) {
            console.error('RankingSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Update ratings after a match
     * @param {string} playerId - Player ID
     * @param {string} opponentId - Opponent ID (for multiplayer)
     * @param {string} result - Match result ('victory', 'defeat')
     * @param {Object} options - Additional options
     */
    updateRatings(playerId, opponentId, result, options = {}) {
        if (!this.isInitialized) {
            throw new Error('RankingSystem not initialized');
        }

        const config = {
            opponentRating: this.config.STARTING_RATING, // Default for AI opponents
            isRanked: true,
            gameType: 'standard',
            ...options
        };

        if (!config.isRanked) {
            return; // Don't update ratings for unranked matches
        }

        const playerRating = this.playerRanking.currentRating;
        const opponentRating = config.opponentRating;

        // Calculate ELO change
        const ratingChange = this._calculateELOChange(playerRating, opponentRating, result);

        // Update player rating
        const oldRating = this.playerRanking.currentRating;
        const oldTier = this.playerRanking.currentTier;

        this.playerRanking.currentRating = Math.max(0, this.playerRanking.currentRating + ratingChange);
        this.playerRanking.gamesPlayed++;

        // Update wins/losses and streaks
        if (result === 'victory') {
            this.playerRanking.wins++;
            this.seasonData.seasonWins++;
            this.playerRanking.winStreak++;
            this.playerRanking.longestWinStreak = Math.max(
                this.playerRanking.longestWinStreak,
                this.playerRanking.winStreak
            );
        } else if (result === 'defeat') {
            this.playerRanking.losses++;
            this.seasonData.seasonLosses++;
            this.playerRanking.winStreak = 0;
        }

        // Update peak ratings
        if (this.playerRanking.currentRating > this.playerRanking.peakRating) {
            this.playerRanking.peakRating = this.playerRanking.currentRating;
            this.statistics.highestRating = this.playerRanking.currentRating;
        }

        if (this.playerRanking.currentRating > this.seasonData.seasonPeakRating) {
            this.seasonData.seasonPeakRating = this.playerRanking.currentRating;
        }

        // Update tier
        const newTier = this._getTierFromRating(this.playerRanking.currentRating);
        this.playerRanking.currentTier = newTier;

        if (this._compareTiers(newTier, this.playerRanking.peakTier) > 0) {
            this.playerRanking.peakTier = newTier;
        }

        // Add to rating history
        this.playerRanking.rankingHistory.push({
            timestamp: Date.now(),
            oldRating: oldRating,
            newRating: this.playerRanking.currentRating,
            change: ratingChange,
            result: result,
            opponentRating: opponentRating,
            tier: newTier
        });

        // Limit history size
        if (this.playerRanking.rankingHistory.length > 100) {
            this.playerRanking.rankingHistory = this.playerRanking.rankingHistory.slice(-50);
        }

        // Update statistics
        this._updateStatistics(ratingChange, opponentRating, result);

        // Check for tier promotion/demotion
        if (oldTier.name !== newTier.name) {
            this._handleTierChange(oldTier, newTier);
        }

        // Save data
        this._saveRankingData();

        this.eventManager.emit('ranking:updated', {
            oldRating: oldRating,
            newRating: this.playerRanking.currentRating,
            ratingChange: ratingChange,
            oldTier: oldTier,
            newTier: newTier,
            result: result,
            winStreak: this.playerRanking.winStreak
        });

        return {
            oldRating: oldRating,
            newRating: this.playerRanking.currentRating,
            ratingChange: ratingChange,
            newTier: newTier,
            tierChanged: oldTier.name !== newTier.name
        };
    }

    /**
     * Get current player rating
     * @returns {number} Current rating
     */
    getPlayerRating() {
        return this.playerRanking.currentRating;
    }

    /**
     * Get player ranking data
     * @returns {Object} Player ranking information
     */
    getPlayerRanking() {
        return {
            ...this.playerRanking,
            winRate: this.playerRanking.gamesPlayed > 0 ?
                this.playerRanking.wins / this.playerRanking.gamesPlayed : 0,
            seasonWinRate: (this.seasonData.seasonWins + this.seasonData.seasonLosses) > 0 ?
                this.seasonData.seasonWins / (this.seasonData.seasonWins + this.seasonData.seasonLosses) : 0
        };
    }

    /**
     * Get current season information
     * @returns {Object} Season data
     */
    getSeasonData() {
        return {
            ...this.seasonData,
            timeRemaining: Math.max(0, this.seasonData.seasonEndTime - Date.now()),
            progress: Math.min(1, (Date.now() - this.seasonData.seasonStartTime) / this.config.SEASON_LENGTH)
        };
    }

    /**
     * Get tier information for a rating
     * @param {number} rating - Rating to check
     * @returns {Object} Tier information
     */
    getTierInfo(rating = null) {
        const targetRating = rating !== null ? rating : this.playerRanking.currentRating;
        const tier = this._getTierFromRating(targetRating);

        return {
            ...tier,
            progress: this._getTierProgress(targetRating, tier),
            nextTier: this._getNextTier(tier),
            ratingToNextTier: this._getRatingToNextTier(targetRating, tier)
        };
    }

    /**
     * Get leaderboard (for future multiplayer)
     * @param {Object} options - Leaderboard options
     * @returns {Array} Leaderboard entries
     */
    getLeaderboard(options = {}) {
        const config = {
            limit: 50,
            includeSelf: true,
            tier: 'all',
            ...options
        };

        // For single-player, return player's position relative to historical data
        const entries = [];

        // Add player entry
        if (config.includeSelf) {
            entries.push({
                rank: 1, // In single-player, player is always rank 1
                playerId: 'player',
                name: 'Player',
                rating: this.playerRanking.currentRating,
                tier: this.playerRanking.currentTier,
                wins: this.playerRanking.wins,
                losses: this.playerRanking.losses,
                winRate: this.playerRanking.gamesPlayed > 0 ?
                    this.playerRanking.wins / this.playerRanking.gamesPlayed : 0,
                winStreak: this.playerRanking.winStreak
            });
        }

        return entries;
    }

    /**
     * Claim season rewards
     * @returns {Object} Claimed rewards
     */
    claimSeasonRewards() {
        if (this.seasonData.claimedSeasonRewards) {
            return {
                success: false,
                reason: 'already_claimed'
            };
        }

        const tier = this._getTierFromRating(this.seasonData.seasonPeakRating);
        const rewards = this.config.REWARDS[tier.name.toUpperCase()] || this.config.REWARDS.BRONZE;

        // Award rewards
        if (rewards.jade) {
            this.gameState.increment('player.jade', rewards.jade);
        }
        if (rewards.spiritCrystals) {
            this.gameState.increment('player.spiritCrystals', rewards.spiritCrystals);
        }
        if (rewards.title) {
            // Add title to available titles (implementation depends on title system)
            const availableTitles = this.gameState.get('player.availableTitles') || [];
            if (!availableTitles.includes(rewards.title)) {
                availableTitles.push(rewards.title);
                this.gameState.set('player.availableTitles', availableTitles);
            }
        }

        this.seasonData.claimedSeasonRewards = true;
        this._saveRankingData();

        this.eventManager.emit('ranking:season_rewards_claimed', {
            tier: tier,
            rewards: rewards,
            seasonPeakRating: this.seasonData.seasonPeakRating
        });

        return {
            success: true,
            rewards: rewards,
            tier: tier
        };
    }

    /**
     * Start new season manually (admin function)
     */
    startNewSeason() {
        this._startNewSeason();
    }

    /**
     * Get ranking statistics
     * @returns {Object} Ranking statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save data on game state save
        this.eventManager.on('gameState:save', () => {
            this._saveRankingData();
        });

        // Check season end periodically
        setInterval(() => {
            this._checkSeasonEnd();
        }, 60000); // Check every minute
    }

    /**
     * Calculate ELO rating change
     * @param {number} playerRating - Player's current rating
     * @param {number} opponentRating - Opponent's rating
     * @param {string} result - Match result
     * @returns {number} Rating change
     */
    _calculateELOChange(playerRating, opponentRating, result) {
        // Expected score for player
        const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

        // Actual score (1 for win, 0 for loss)
        const actualScore = result === 'victory' ? 1 : 0;

        // Rating change
        const ratingChange = Math.round(this.config.K_FACTOR * (actualScore - expectedScore));

        return ratingChange;
    }

    /**
     * Get tier from rating
     * @param {number} rating - Rating value
     * @returns {Object} Tier information
     */
    _getTierFromRating(rating) {
        for (const [tierKey, tierData] of Object.entries(this.config.TIERS)) {
            if (rating >= tierData.min && rating <= tierData.max) {
                return { ...tierData, key: tierKey };
            }
        }

        // Fallback to Bronze
        return { ...this.config.TIERS.BRONZE, key: 'BRONZE' };
    }

    /**
     * Get progress within current tier
     * @param {number} rating - Current rating
     * @param {Object} tier - Tier information
     * @returns {number} Progress (0.0 to 1.0)
     */
    _getTierProgress(rating, tier) {
        if (tier.max === 9999) { // Legend tier has no upper bound
            return 1.0;
        }

        const tierRange = tier.max - tier.min;
        const progressInTier = rating - tier.min;

        return Math.max(0, Math.min(1, progressInTier / tierRange));
    }

    /**
     * Get next tier
     * @param {Object} currentTier - Current tier
     * @returns {Object|null} Next tier or null if at highest
     */
    _getNextTier(currentTier) {
        const tiers = Object.keys(this.config.TIERS);
        const currentIndex = tiers.findIndex(key => key === currentTier.key);

        if (currentIndex === -1 || currentIndex === tiers.length - 1) {
            return null; // At highest tier
        }

        const nextTierKey = tiers[currentIndex + 1];
        return { ...this.config.TIERS[nextTierKey], key: nextTierKey };
    }

    /**
     * Get rating needed to reach next tier
     * @param {number} rating - Current rating
     * @param {Object} tier - Current tier
     * @returns {number} Rating needed
     */
    _getRatingToNextTier(rating, tier) {
        const nextTier = this._getNextTier(tier);
        if (!nextTier) {
            return 0; // Already at highest tier
        }

        return Math.max(0, nextTier.min - rating);
    }

    /**
     * Compare two tiers
     * @param {Object} tier1 - First tier
     * @param {Object} tier2 - Second tier
     * @returns {number} -1, 0, or 1 for comparison
     */
    _compareTiers(tier1, tier2) {
        const tiers = Object.keys(this.config.TIERS);
        const index1 = tiers.findIndex(key => key === tier1.key);
        const index2 = tiers.findIndex(key => key === tier2.key);

        if (index1 < index2) return -1;
        if (index1 > index2) return 1;
        return 0;
    }

    /**
     * Handle tier change
     * @param {Object} oldTier - Previous tier
     * @param {Object} newTier - New tier
     */
    _handleTierChange(oldTier, newTier) {
        const comparison = this._compareTiers(newTier, oldTier);

        if (comparison > 0) {
            // Promotion
            this.eventManager.emit('ranking:tier_promoted', {
                oldTier: oldTier,
                newTier: newTier,
                rating: this.playerRanking.currentRating
            });

            // Award promotion bonus (small jade bonus)
            const promotionBonus = Math.floor(newTier.min * 0.1);
            this.gameState.increment('player.jade', promotionBonus);

        } else if (comparison < 0) {
            // Demotion
            this.eventManager.emit('ranking:tier_demoted', {
                oldTier: oldTier,
                newTier: newTier,
                rating: this.playerRanking.currentRating
            });
        }
    }

    /**
     * Update statistics
     * @param {number} ratingChange - Rating change from match
     * @param {number} opponentRating - Opponent's rating
     * @param {string} result - Match result
     */
    _updateStatistics(ratingChange, opponentRating, result) {
        if (ratingChange > 0) {
            this.statistics.totalRatingGained += ratingChange;
        } else {
            this.statistics.totalRatingLost += Math.abs(ratingChange);
        }

        // Update average opponent rating
        const totalGames = this.playerRanking.gamesPlayed;
        this.statistics.averageOpponentRating =
            (this.statistics.averageOpponentRating * (totalGames - 1) + opponentRating) / totalGames;

        // Check for biggest upset (beating much stronger opponent)
        if (result === 'victory' && opponentRating > this.playerRanking.currentRating) {
            const ratingDifference = opponentRating - this.playerRanking.currentRating;
            if (ratingDifference > this.statistics.biggestUpset.ratingDifference) {
                this.statistics.biggestUpset = {
                    ratingDifference: ratingDifference,
                    gained: ratingChange
                };
            }
        }

        // Update longest win streak
        this.statistics.longestWinStreak = Math.max(
            this.statistics.longestWinStreak,
            this.playerRanking.winStreak
        );
    }

    /**
     * Check if season has ended
     */
    _checkSeasonEnd() {
        if (Date.now() >= this.seasonData.seasonEndTime) {
            this._startNewSeason();
        }
    }

    /**
     * Start a new season
     */
    _startNewSeason() {
        // Award season rewards if not claimed
        if (!this.seasonData.claimedSeasonRewards && this.seasonData.seasonWins > 0) {
            this.claimSeasonRewards();
        }

        // Archive previous season
        const previousSeason = { ...this.seasonData };

        // Reset season data
        this.seasonData = {
            currentSeason: this.seasonData.currentSeason + 1,
            seasonStartTime: Date.now(),
            seasonEndTime: Date.now() + this.config.SEASON_LENGTH,
            previousSeasonRating: this.playerRanking.currentRating,
            seasonWins: 0,
            seasonLosses: 0,
            seasonPeakRating: this.playerRanking.currentRating,
            claimedSeasonRewards: false
        };

        // Soft rating reset (move toward starting rating)
        const resetFactor = 0.1; // 10% reset toward starting rating
        this.playerRanking.currentRating = Math.floor(
            this.playerRanking.currentRating * (1 - resetFactor) +
            this.config.STARTING_RATING * resetFactor
        );

        // Update tier after rating reset
        this.playerRanking.currentTier = this._getTierFromRating(this.playerRanking.currentRating);

        // Update statistics
        this.statistics.seasonsCompleted++;

        this._saveRankingData();

        this.eventManager.emit('ranking:new_season_started', {
            season: this.seasonData.currentSeason,
            previousSeason: previousSeason,
            newRating: this.playerRanking.currentRating,
            resetAmount: this.playerRanking.currentRating - previousSeason.seasonPeakRating
        });

        console.log(`RankingSystem: Season ${this.seasonData.currentSeason} started`);
    }

    /**
     * Save ranking data to game state
     */
    _saveRankingData() {
        this.gameState.update({
            playerRanking: this.playerRanking,
            seasonData: this.seasonData,
            rankingStats: this.statistics
        }, { source: 'ranking:save' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RankingSystem };
} else if (typeof window !== 'undefined') {
    window.RankingSystem = RankingSystem;
}