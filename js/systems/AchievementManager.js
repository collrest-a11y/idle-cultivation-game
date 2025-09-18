/**
 * AchievementManager - Comprehensive achievement tracking and progression system
 * Handles achievement unlocking, progress monitoring, and milestone celebrations
 */
class AchievementManager {
    constructor(gameState, eventManager, saveManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.saveManager = saveManager;

        // Achievement state
        this.achievementState = {
            unlockedAchievements: new Map(),
            progressTracking: new Map(),
            achievementPoints: 0,
            totalAchievements: 0,
            hiddenAchievementsFound: 0,
            lastUnlockTime: 0
        };

        // Achievement checking configuration
        this.checkingConfig = {
            batchCheckInterval: 5000, // 5 seconds
            realTimeChecking: true,
            retroactiveChecking: true,
            maxBatchSize: 10
        };

        // Achievement condition handlers
        this.conditionHandlers = new Map();
        this.customCheckers = new Map();

        // Statistics and analytics
        this.statistics = {
            totalChecks: 0,
            totalUnlocks: 0,
            averageUnlockTime: 0,
            rareUnlocks: 0,
            perfectUnlocks: 0,
            categoryProgress: new Map(),
            pointsEarned: 0
        };

        // Performance tracking
        this.lastBatchCheck = Date.now();
        this.pendingChecks = new Set();
        this.isChecking = false;

        this.isInitialized = false;
        this.isActive = false;

        console.log('AchievementManager: Initialized');
    }

    /**
     * Initialize the achievement manager
     */
    async initialize() {
        try {
            // Load achievement data
            if (!window.ACHIEVEMENTS) {
                console.error('AchievementManager: Achievement data not loaded');
                return false;
            }

            // Load saved achievement state
            const savedState = this.gameState.get('achievementState');
            if (savedState) {
                this.achievementState = { ...this.achievementState, ...savedState };
                // Convert arrays back to Maps if necessary
                if (Array.isArray(savedState.unlockedAchievements)) {
                    this.achievementState.unlockedAchievements = new Map(savedState.unlockedAchievements);
                }
                if (Array.isArray(savedState.progressTracking)) {
                    this.achievementState.progressTracking = new Map(savedState.progressTracking);
                }
            }

            // Load statistics
            const savedStats = this.gameState.get('achievementStats');
            if (savedStats) {
                this.statistics = { ...this.statistics, ...savedStats };
                if (Array.isArray(savedStats.categoryProgress)) {
                    this.statistics.categoryProgress = new Map(savedStats.categoryProgress);
                }
            }

            // Set up condition handlers
            this._setupConditionHandlers();

            // Set up custom checkers
            this._setupCustomCheckers();

            // Set up event listeners
            this._setupEventListeners();

            // Initialize achievement tracking
            this._initializeAchievementTracking();

            // Perform retroactive checking if enabled
            if (this.checkingConfig.retroactiveChecking) {
                await this._performRetroactiveCheck();
            }

            // Start batch checking system
            this._startBatchChecking();

            this.isInitialized = true;
            this.isActive = true;

            // Emit initialization event
            this.eventManager.emit('achievementManager:initialized', {
                totalAchievements: this.achievementState.totalAchievements,
                unlockedCount: this.achievementState.unlockedAchievements.size,
                achievementPoints: this.achievementState.achievementPoints
            });

            console.log('AchievementManager: Initialization complete');
            return true;

        } catch (error) {
            console.error('AchievementManager: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Check a specific achievement
     * @param {string} achievementId - Achievement ID to check
     * @returns {boolean} Whether achievement was unlocked
     */
    checkAchievement(achievementId) {
        if (!this.isActive) return false;

        try {
            const achievement = window.ACHIEVEMENTS[achievementId];
            if (!achievement) {
                console.warn('AchievementManager: Achievement not found:', achievementId);
                return false;
            }

            // Skip if already unlocked
            if (this.achievementState.unlockedAchievements.has(achievementId)) {
                return false;
            }

            // Check achievement conditions
            const isUnlocked = this._checkAchievementConditions(achievement);

            if (isUnlocked) {
                this._unlockAchievement(achievement);
                return true;
            }

            return false;

        } catch (error) {
            console.error('AchievementManager: Failed to check achievement:', error);
            return false;
        }
    }

    /**
     * Check all achievements (batch check)
     * @param {Array} achievementIds - Specific achievements to check (optional)
     * @returns {Array} Newly unlocked achievements
     */
    checkAllAchievements(achievementIds = null) {
        if (!this.isActive || this.isChecking) return [];

        this.isChecking = true;
        const newlyUnlocked = [];

        try {
            const achievementsToCheck = achievementIds || Object.keys(window.ACHIEVEMENTS);

            for (const achievementId of achievementsToCheck) {
                if (this.checkAchievement(achievementId)) {
                    newlyUnlocked.push(achievementId);
                }

                // Respect batch size limits
                if (newlyUnlocked.length >= this.checkingConfig.maxBatchSize) {
                    break;
                }
            }

            this.statistics.totalChecks += achievementsToCheck.length;
            this.lastBatchCheck = Date.now();

        } catch (error) {
            console.error('AchievementManager: Batch check failed:', error);
        } finally {
            this.isChecking = false;
        }

        return newlyUnlocked;
    }

    /**
     * Get unlocked achievements
     * @param {Object} filters - Filter options
     * @returns {Array} Array of unlocked achievement data
     */
    getUnlockedAchievements(filters = {}) {
        const unlocked = [];

        for (const [achievementId, unlockData] of this.achievementState.unlockedAchievements) {
            const achievement = window.ACHIEVEMENTS[achievementId];
            if (!achievement) continue;

            // Apply filters
            if (filters.category && achievement.category !== filters.category) {
                continue;
            }
            if (filters.rarity && achievement.rarity.name !== filters.rarity) {
                continue;
            }
            if (filters.hidden !== undefined && achievement.hidden !== filters.hidden) {
                continue;
            }

            unlocked.push({
                ...achievement,
                unlockData: unlockData
            });
        }

        // Sort by unlock time (most recent first)
        unlocked.sort((a, b) => b.unlockData.timestamp - a.unlockData.timestamp);

        return unlocked;
    }

    /**
     * Get achievement progress for achievements in progress
     * @param {string} category - Filter by category (optional)
     * @returns {Array} Array of achievements with progress
     */
    getAchievementProgress(category = null) {
        const progress = [];

        for (const [achievementId, achievement] of Object.entries(window.ACHIEVEMENTS)) {
            // Skip unlocked achievements
            if (this.achievementState.unlockedAchievements.has(achievementId)) {
                continue;
            }

            // Skip hidden achievements
            if (achievement.hidden) {
                continue;
            }

            // Apply category filter
            if (category && achievement.category !== category) {
                continue;
            }

            // Calculate progress
            const progressData = this._calculateAchievementProgress(achievement);
            if (progressData && progressData.percentage > 0) {
                progress.push({
                    ...achievement,
                    progress: progressData
                });
            }
        }

        // Sort by progress percentage (highest first)
        progress.sort((a, b) => b.progress.percentage - a.progress.percentage);

        return progress;
    }

    /**
     * Get achievement statistics and summary
     * @returns {Object} Achievement statistics
     */
    getAchievementSummary() {
        const total = Object.keys(window.ACHIEVEMENTS).length;
        const unlocked = this.achievementState.unlockedAchievements.size;
        const hidden = Object.values(window.ACHIEVEMENTS).filter(a => a.hidden).length;
        const hiddenUnlocked = this._getHiddenUnlockedCount();

        // Calculate category breakdown
        const categoryBreakdown = {};
        for (const category of Object.values(window.ACHIEVEMENT_CATEGORIES)) {
            const categoryAchievements = Object.values(window.ACHIEVEMENTS)
                .filter(a => a.category === category);
            const categoryUnlocked = categoryAchievements
                .filter(a => this.achievementState.unlockedAchievements.has(a.id)).length;

            categoryBreakdown[category] = {
                total: categoryAchievements.length,
                unlocked: categoryUnlocked,
                percentage: categoryAchievements.length > 0 ?
                    (categoryUnlocked / categoryAchievements.length) * 100 : 0
            };
        }

        // Calculate rarity breakdown
        const rarityBreakdown = {};
        for (const rarity of Object.values(window.ACHIEVEMENT_RARITIES)) {
            const rarityAchievements = Object.values(window.ACHIEVEMENTS)
                .filter(a => a.rarity.name === rarity.name);
            const rarityUnlocked = rarityAchievements
                .filter(a => this.achievementState.unlockedAchievements.has(a.id)).length;

            rarityBreakdown[rarity.name] = {
                total: rarityAchievements.length,
                unlocked: rarityUnlocked,
                percentage: rarityAchievements.length > 0 ?
                    (rarityUnlocked / rarityAchievements.length) * 100 : 0
            };
        }

        return {
            overview: {
                totalAchievements: total,
                unlockedAchievements: unlocked,
                completionPercentage: (unlocked / total) * 100,
                achievementPoints: this.achievementState.achievementPoints,
                hiddenAchievements: hidden,
                hiddenUnlocked: hiddenUnlocked
            },
            categories: categoryBreakdown,
            rarities: rarityBreakdown,
            statistics: { ...this.statistics },
            recentUnlocks: this._getRecentUnlocks(5)
        };
    }

    /**
     * Manually trigger achievement check for specific event
     * @param {string} eventType - Event type that occurred
     * @param {Object} eventData - Event data
     */
    onGameEvent(eventType, eventData) {
        if (!this.isActive) return;

        // Add to pending checks for batch processing
        if (this.checkingConfig.realTimeChecking) {
            this.pendingChecks.add({ eventType, eventData, timestamp: Date.now() });
        }

        // Immediate check for critical events
        const criticalEvents = [
            'cultivation:breakthrough',
            'combat:victory',
            'gacha:legendaryPull',
            'sect:promotion'
        ];

        if (criticalEvents.includes(eventType)) {
            this._performImmediateCheck(eventType, eventData);
        }
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isActive: this.isActive,
            isInitialized: this.isInitialized,
            isChecking: this.isChecking,
            unlockedCount: this.achievementState.unlockedAchievements.size,
            totalAchievements: Object.keys(window.ACHIEVEMENTS || {}).length,
            achievementPoints: this.achievementState.achievementPoints,
            pendingChecks: this.pendingChecks.size,
            lastBatchCheck: this.lastBatchCheck,
            statistics: this.statistics
        };
    }

    // Private methods

    /**
     * Set up condition handlers for different achievement types
     */
    _setupConditionHandlers() {
        const handlers = new Map();

        // Stat-based condition handler
        handlers.set('stat', (achievement, gameState) => {
            const currentValue = gameState.get(achievement.conditions.stat);
            const targetValue = achievement.conditions.value;
            const operator = achievement.conditions.operator || '>=';

            switch (operator) {
                case '>=':
                    return currentValue >= targetValue;
                case '>':
                    return currentValue > targetValue;
                case '==':
                    return currentValue === targetValue;
                case '!=':
                    return currentValue !== targetValue;
                case '<=':
                    return currentValue <= targetValue;
                case '<':
                    return currentValue < targetValue;
                default:
                    return false;
            }
        });

        // Custom condition handler
        handlers.set('custom', (achievement, gameState) => {
            const checkerName = achievement.conditions.check;
            const checker = this.customCheckers.get(checkerName);

            if (checker) {
                return checker(achievement.conditions.params, gameState);
            }

            console.warn('AchievementManager: Custom checker not found:', checkerName);
            return false;
        });

        this.conditionHandlers = handlers;
    }

    /**
     * Set up custom achievement checkers
     */
    _setupCustomCheckers() {
        const checkers = new Map();

        // Check if player has scripture of specific rarity
        checkers.set('hasScriptureOfRarity', (params, gameState) => {
            const scriptures = gameState.get('scriptures.collection') || [];
            return scriptures.some(scripture => scripture.rarity === params.rarity);
        });

        // Check realm advancement
        checkers.set('realmAdvancement', (params, gameState) => {
            const currentRealm = gameState.get('realm.current');
            const realmData = window.CULTIVATION_REALMS || {};

            for (const [realmName, data] of Object.entries(realmData)) {
                if (realmName === currentRealm && data.level >= params.minRealm) {
                    return true;
                }
            }
            return false;
        });

        // Check perfect breakthrough
        checkers.set('perfectBreakthrough', (params, gameState) => {
            const stats = gameState.get('cultivationStats') || {};
            if (params.firstAttempt) {
                return stats.perfectBreakthroughs > 0 && stats.failedBreakthroughs === 0;
            }
            return stats.perfectBreakthroughs > 0;
        });

        // Check speed run achievement
        checkers.set('speedRun', (params, gameState) => {
            const playTime = gameState.get('meta.totalPlayTime') || 0;
            const qiLevel = gameState.get('cultivation.qi.level') || 0;
            const bodyLevel = gameState.get('cultivation.body.level') || 0;
            const maxLevel = Math.max(qiLevel, bodyLevel);

            return maxLevel >= params.level && playTime <= params.timeLimit;
        });

        this.customCheckers = checkers;
    }

    /**
     * Set up event listeners for achievement tracking
     */
    _setupEventListeners() {
        // Listen to all game events for achievement checking
        this.eventManager.on('gameState:propertyChanged', (data) => {
            this.onGameEvent('gameState:propertyChanged', data);
        });

        this.eventManager.on('cultivation:breakthrough', (data) => {
            this.onGameEvent('cultivation:breakthrough', data);
        });

        this.eventManager.on('combat:victory', (data) => {
            this.onGameEvent('combat:victory', data);
        });

        this.eventManager.on('gacha:pull', (data) => {
            this.onGameEvent('gacha:pull', data);
        });

        this.eventManager.on('sect:activity', (data) => {
            this.onGameEvent('sect:activity', data);
        });

        this.eventManager.on('questSystem:questCompleted', (data) => {
            this.onGameEvent('questSystem:questCompleted', data);
        });
    }

    /**
     * Initialize achievement tracking for all achievements
     */
    _initializeAchievementTracking() {
        this.achievementState.totalAchievements = Object.keys(window.ACHIEVEMENTS).length;

        // Initialize progress tracking for stat-based achievements
        for (const [achievementId, achievement] of Object.entries(window.ACHIEVEMENTS)) {
            if (achievement.conditions.type === 'stat' && !this.achievementState.unlockedAchievements.has(achievementId)) {
                this.achievementState.progressTracking.set(achievementId, {
                    startTime: Date.now(),
                    lastCheck: 0,
                    progress: 0
                });
            }
        }
    }

    /**
     * Perform retroactive achievement checking
     */
    async _performRetroactiveCheck() {
        console.log('AchievementManager: Performing retroactive achievement check...');

        const newlyUnlocked = this.checkAllAchievements();

        if (newlyUnlocked.length > 0) {
            console.log(`AchievementManager: Retroactively unlocked ${newlyUnlocked.length} achievements`);

            // Emit batch unlock event
            this.eventManager.emit('achievementManager:batchUnlock', {
                achievements: newlyUnlocked,
                retroactive: true
            });
        }
    }

    /**
     * Start the batch checking system
     */
    _startBatchChecking() {
        setInterval(() => {
            if (this.pendingChecks.size > 0) {
                this._processPendingChecks();
            }

            // Periodic full check
            const now = Date.now();
            if (now - this.lastBatchCheck >= this.checkingConfig.batchCheckInterval) {
                this.checkAllAchievements();
            }
        }, this.checkingConfig.batchCheckInterval);
    }

    /**
     * Process pending achievement checks
     */
    _processPendingChecks() {
        const relevantAchievements = this._getRelevantAchievements(this.pendingChecks);

        if (relevantAchievements.length > 0) {
            this.checkAllAchievements(relevantAchievements);
        }

        this.pendingChecks.clear();
    }

    /**
     * Get achievements relevant to pending events
     * @param {Set} pendingEvents - Pending events
     * @returns {Array} Relevant achievement IDs
     */
    _getRelevantAchievements(pendingEvents) {
        const relevant = new Set();

        for (const event of pendingEvents) {
            // Map events to potentially relevant achievements
            // This is a simplified mapping - in practice, you'd want more sophisticated logic

            if (event.eventType.startsWith('cultivation:')) {
                for (const [id, achievement] of Object.entries(window.ACHIEVEMENTS)) {
                    if (achievement.category === window.ACHIEVEMENT_CATEGORIES.CULTIVATION) {
                        relevant.add(id);
                    }
                }
            }

            if (event.eventType.startsWith('combat:')) {
                for (const [id, achievement] of Object.entries(window.ACHIEVEMENTS)) {
                    if (achievement.category === window.ACHIEVEMENT_CATEGORIES.COMBAT) {
                        relevant.add(id);
                    }
                }
            }
        }

        return Array.from(relevant);
    }

    /**
     * Perform immediate check for critical events
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    _performImmediateCheck(eventType, eventData) {
        // Immediate checking logic for time-sensitive achievements
        const relevantAchievements = this._getRelevantAchievements([{ eventType, eventData }]);
        this.checkAllAchievements(relevantAchievements);
    }

    /**
     * Check if achievement conditions are met
     * @param {Object} achievement - Achievement to check
     * @returns {boolean} Whether conditions are met
     */
    _checkAchievementConditions(achievement) {
        const handler = this.conditionHandlers.get(achievement.conditions.type);

        if (handler) {
            return handler(achievement, this.gameState);
        }

        console.warn('AchievementManager: Unknown condition type:', achievement.conditions.type);
        return false;
    }

    /**
     * Unlock an achievement
     * @param {Object} achievement - Achievement to unlock
     */
    _unlockAchievement(achievement) {
        const unlockData = {
            timestamp: Date.now(),
            gameState: this._captureRelevantGameState(achievement),
            conditions: achievement.conditions
        };

        // Add to unlocked achievements
        this.achievementState.unlockedAchievements.set(achievement.id, unlockData);

        // Update points
        this.achievementState.achievementPoints += achievement.rarity.points;

        // Update statistics
        this.statistics.totalUnlocks++;
        this.statistics.pointsEarned += achievement.rarity.points;
        this._updateCategoryProgress(achievement.category);

        // Award achievement rewards
        if (achievement.rewards) {
            this._awardAchievementRewards(achievement.rewards, achievement);
        }

        // Save state
        this._saveAchievementState();

        // Emit unlock event
        this.eventManager.emit('achievementManager:achievementUnlocked', {
            achievement: achievement,
            unlockData: unlockData,
            isHidden: achievement.hidden,
            points: achievement.rarity.points
        });

        // Check for rare achievement unlock
        if (achievement.rarity.points >= 100) {
            this.statistics.rareUnlocks++;
            this.eventManager.emit('achievementManager:rareAchievementUnlocked', {
                achievement: achievement
            });
        }

        console.log(`AchievementManager: Achievement unlocked: ${achievement.name} (${achievement.rarity.points} points)`);
    }

    /**
     * Calculate achievement progress for display
     * @param {Object} achievement - Achievement to calculate progress for
     * @returns {Object|null} Progress data or null
     */
    _calculateAchievementProgress(achievement) {
        if (achievement.conditions.type === 'stat') {
            const currentValue = this.gameState.get(achievement.conditions.stat) || 0;
            const targetValue = achievement.conditions.value;

            if (typeof currentValue === 'number' && typeof targetValue === 'number') {
                const percentage = Math.min((currentValue / targetValue) * 100, 100);

                return {
                    current: currentValue,
                    target: targetValue,
                    percentage: Math.round(percentage),
                    isComplete: percentage >= 100
                };
            }
        }

        // For other condition types, progress might not be easily calculable
        return null;
    }

    /**
     * Award achievement rewards
     * @param {Object} rewards - Rewards to award
     * @param {Object} achievement - Achievement that was unlocked
     */
    _awardAchievementRewards(rewards, achievement) {
        // Use RewardManager if available
        if (window.rewardManager) {
            window.rewardManager.awardRewards(rewards, {
                source: 'achievement',
                achievementId: achievement.id,
                rarity: achievement.rarity.name
            });
        } else {
            // Fallback reward distribution
            this._awardRewardsFallback(rewards);
        }
    }

    /**
     * Fallback method for awarding rewards
     * @param {Object} rewards - Rewards to award
     */
    _awardRewardsFallback(rewards) {
        for (const [rewardType, amount] of Object.entries(rewards)) {
            switch (rewardType) {
                case 'jade':
                    this.gameState.increment('player.jade', amount);
                    break;
                case 'spiritCrystals':
                    this.gameState.increment('player.spiritCrystals', amount);
                    break;
                case 'shards':
                    this.gameState.increment('player.shards', amount);
                    break;
                case 'title':
                    // Handle title rewards
                    this.gameState.update({
                        'player.title': amount
                    });
                    break;
                default:
                    console.log(`AchievementManager: Unhandled reward type: ${rewardType}`);
            }
        }
    }

    /**
     * Capture relevant game state for achievement unlock
     * @param {Object} achievement - Achievement being unlocked
     * @returns {Object} Relevant game state snapshot
     */
    _captureRelevantGameState(achievement) {
        const snapshot = {
            playerLevel: Math.max(
                this.gameState.get('cultivation.qi.level') || 0,
                this.gameState.get('cultivation.body.level') || 0
            ),
            totalPlayTime: this.gameState.get('meta.totalPlayTime') || 0,
            timestamp: Date.now()
        };

        // Add category-specific data
        switch (achievement.category) {
            case window.ACHIEVEMENT_CATEGORIES.CULTIVATION:
                snapshot.cultivation = this.gameState.get('cultivation');
                snapshot.realm = this.gameState.get('realm');
                break;
            case window.ACHIEVEMENT_CATEGORIES.COMBAT:
                snapshot.combat = this.gameState.get('combat');
                break;
            case window.ACHIEVEMENT_CATEGORIES.COLLECTION:
                snapshot.scriptures = this.gameState.get('scriptureStats');
                snapshot.gacha = this.gameState.get('gachaStats');
                break;
        }

        return snapshot;
    }

    /**
     * Update category progress statistics
     * @param {string} category - Achievement category
     */
    _updateCategoryProgress(category) {
        const current = this.statistics.categoryProgress.get(category) || 0;
        this.statistics.categoryProgress.set(category, current + 1);
    }

    /**
     * Get count of unlocked hidden achievements
     * @returns {number} Hidden achievement count
     */
    _getHiddenUnlockedCount() {
        let count = 0;
        for (const [achievementId] of this.achievementState.unlockedAchievements) {
            const achievement = window.ACHIEVEMENTS[achievementId];
            if (achievement && achievement.hidden) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get recent achievement unlocks
     * @param {number} limit - Maximum number to return
     * @returns {Array} Recent unlocks
     */
    _getRecentUnlocks(limit = 5) {
        const unlocks = [];

        for (const [achievementId, unlockData] of this.achievementState.unlockedAchievements) {
            const achievement = window.ACHIEVEMENTS[achievementId];
            if (achievement) {
                unlocks.push({
                    achievement: achievement,
                    unlockData: unlockData
                });
            }
        }

        // Sort by unlock time (most recent first)
        unlocks.sort((a, b) => b.unlockData.timestamp - a.unlockData.timestamp);

        return unlocks.slice(0, limit);
    }

    /**
     * Save achievement state to game state
     */
    _saveAchievementState() {
        // Convert Maps to arrays for serialization
        const stateToSave = {
            ...this.achievementState,
            unlockedAchievements: Array.from(this.achievementState.unlockedAchievements),
            progressTracking: Array.from(this.achievementState.progressTracking)
        };

        const statsToSave = {
            ...this.statistics,
            categoryProgress: Array.from(this.statistics.categoryProgress)
        };

        this.gameState.update({
            achievementState: stateToSave,
            achievementStats: statsToSave
        }, { source: 'achievementManager' });
    }
}

// Create singleton instance
const achievementManager = new AchievementManager(
    window.gameState,
    window.eventManager,
    window.saveManager
);

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AchievementManager, achievementManager };
} else if (typeof window !== 'undefined') {
    window.AchievementManager = AchievementManager;
    window.achievementManager = achievementManager;
}