/**
 * QuestIntegration - Coordination system for quests, achievements, and rewards
 * Manages initialization, cross-system communication, and unified progression tracking
 */
class QuestIntegration {
    constructor(gameState, eventManager, saveManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.saveManager = saveManager;

        // System references
        this.questSystem = null;
        this.achievementManager = null;
        this.rewardManager = null;

        // Integration state
        this.integrationState = {
            systemsInitialized: {
                questSystem: false,
                achievementManager: false,
                rewardManager: false
            },
            crossSystemEvents: new Map(),
            progressTracking: new Map(),
            lastSyncTime: 0
        };

        // Performance tracking
        this.performanceMetrics = {
            eventProcessingTime: [],
            systemResponseTimes: new Map(),
            totalEventsProcessed: 0,
            errorCount: 0
        };

        // Integration configuration
        this.config = {
            autoInitialize: true,
            syncInterval: 30000, // 30 seconds
            batchEventProcessing: true,
            maxEventQueue: 100,
            enablePerformanceTracking: true
        };

        this.isInitialized = false;
        this.isActive = false;

        console.log('QuestIntegration: Initialized');
    }

    /**
     * Initialize the quest integration system
     */
    async initialize() {
        try {
            // Load quest data if not already loaded
            if (!window.QUEST_TEMPLATES || !window.ACHIEVEMENTS) {
                console.error('QuestIntegration: Quest/Achievement data not loaded');
                return false;
            }

            // Get system references
            this.questSystem = window.questSystem;
            this.achievementManager = window.achievementManager;
            this.rewardManager = window.rewardManager;

            if (!this.questSystem || !this.achievementManager || !this.rewardManager) {
                console.error('QuestIntegration: Required systems not available');
                return false;
            }

            // Initialize subsystems in order
            await this._initializeSubsystems();

            // Set up cross-system event handlers
            this._setupCrossSystemEvents();

            // Set up progress synchronization
            this._setupProgressSync();

            // Set up performance monitoring
            if (this.config.enablePerformanceTracking) {
                this._setupPerformanceMonitoring();
            }

            // Start integration loops
            this._startIntegrationLoops();

            this.isInitialized = true;
            this.isActive = true;

            // Emit integration ready event
            this.eventManager.emit('questIntegration:initialized', {
                systemsReady: this._getAllSystemsReady(),
                timestamp: Date.now()
            });

            console.log('QuestIntegration: Initialization complete');
            return true;

        } catch (error) {
            console.error('QuestIntegration: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Process game event across all quest/achievement systems
     * @param {string} eventType - Type of event
     * @param {Object} eventData - Event data
     */
    processGameEvent(eventType, eventData) {
        if (!this.isActive) return;

        const startTime = performance.now();

        try {
            // Update quest progress
            if (this.questSystem && this.integrationState.systemsInitialized.questSystem) {
                this.questSystem.updateQuestProgress(eventType, eventData);
            }

            // Check achievements
            if (this.achievementManager && this.integrationState.systemsInitialized.achievementManager) {
                this.achievementManager.onGameEvent(eventType, eventData);
            }

            // Track cross-system interactions
            this._trackCrossSystemEvent(eventType, eventData);

            // Update performance metrics
            if (this.config.enablePerformanceTracking) {
                const processingTime = performance.now() - startTime;
                this._updatePerformanceMetrics(eventType, processingTime);
            }

        } catch (error) {
            console.error('QuestIntegration: Failed to process game event:', error);
            this.performanceMetrics.errorCount++;
        }
    }

    /**
     * Get unified progress summary
     * @returns {Object} Complete progress summary
     */
    getProgressSummary() {
        const summary = {
            timestamp: Date.now(),
            quests: {},
            achievements: {},
            rewards: {},
            integration: {}
        };

        try {
            // Quest progress
            if (this.questSystem) {
                summary.quests = {
                    active: this.questSystem.getActiveQuests(),
                    statistics: this.questSystem.getStatistics(),
                    debug: this.questSystem.getDebugInfo()
                };
            }

            // Achievement progress
            if (this.achievementManager) {
                summary.achievements = {
                    summary: this.achievementManager.getAchievementSummary(),
                    unlocked: this.achievementManager.getUnlockedAchievements({ limit: 10 }),
                    progress: this.achievementManager.getAchievementProgress(),
                    debug: this.achievementManager.getDebugInfo()
                };
            }

            // Reward information
            if (this.rewardManager) {
                summary.rewards = {
                    statistics: this.rewardManager.getStatistics(),
                    activeBonuses: this.rewardManager.getActiveBonuses(),
                    debug: this.rewardManager.getDebugInfo()
                };
            }

            // Integration metrics
            summary.integration = {
                systemsReady: this._getAllSystemsReady(),
                performance: this._getPerformanceSummary(),
                crossSystemEvents: this.integrationState.crossSystemEvents.size,
                lastSyncTime: this.integrationState.lastSyncTime
            };

        } catch (error) {
            console.error('QuestIntegration: Failed to get progress summary:', error);
            summary.error = error.message;
        }

        return summary;
    }

    /**
     * Force sync all systems
     */
    async forceSyncAll() {
        try {
            console.log('QuestIntegration: Starting forced sync...');

            // Sync quest system
            if (this.questSystem) {
                this.questSystem.refreshAllQuests();
            }

            // Sync achievement system
            if (this.achievementManager) {
                this.achievementManager.checkAllAchievements();
            }

            // Update reward modifiers
            if (this.rewardManager) {
                // Force update of global modifiers
                this.rewardManager._updateGlobalModifiers();
            }

            this.integrationState.lastSyncTime = Date.now();

            // Emit sync complete event
            this.eventManager.emit('questIntegration:syncComplete', {
                timestamp: this.integrationState.lastSyncTime
            });

            console.log('QuestIntegration: Forced sync complete');

        } catch (error) {
            console.error('QuestIntegration: Forced sync failed:', error);
        }
    }

    /**
     * Get system health status
     * @returns {Object} Health status for all systems
     */
    getSystemHealth() {
        return {
            integration: {
                isActive: this.isActive,
                isInitialized: this.isInitialized,
                errorCount: this.performanceMetrics.errorCount,
                lastSyncTime: this.integrationState.lastSyncTime
            },
            questSystem: this.questSystem ? this.questSystem.getDebugInfo() : null,
            achievementManager: this.achievementManager ? this.achievementManager.getDebugInfo() : null,
            rewardManager: this.rewardManager ? this.rewardManager.getDebugInfo() : null,
            performance: this._getPerformanceSummary()
        };
    }

    /**
     * Handle quest completion with cross-system effects
     * @param {Object} quest - Completed quest
     * @param {Object} rewards - Quest rewards
     */
    handleQuestCompletion(quest, rewards) {
        try {
            // Check for quest-related achievements
            this._checkQuestAchievements(quest);

            // Apply any special quest completion effects
            this._applyQuestCompletionEffects(quest, rewards);

            // Update cross-system statistics
            this._updateCrossSystemStats('questCompleted', { quest, rewards });

            // Emit cross-system event
            this.eventManager.emit('questIntegration:questCompleted', {
                quest: quest,
                rewards: rewards,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('QuestIntegration: Failed to handle quest completion:', error);
        }
    }

    /**
     * Handle achievement unlock with cross-system effects
     * @param {Object} achievement - Unlocked achievement
     * @param {Object} unlockData - Achievement unlock data
     */
    handleAchievementUnlock(achievement, unlockData) {
        try {
            // Check for achievement-related quest progression
            this._checkAchievementQuests(achievement);

            // Apply any special achievement effects
            this._applyAchievementEffects(achievement, unlockData);

            // Update cross-system statistics
            this._updateCrossSystemStats('achievementUnlocked', { achievement, unlockData });

            // Emit cross-system event
            this.eventManager.emit('questIntegration:achievementUnlocked', {
                achievement: achievement,
                unlockData: unlockData,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('QuestIntegration: Failed to handle achievement unlock:', error);
        }
    }

    /**
     * Get debug information for all systems
     * @returns {Object} Complete debug information
     */
    getDebugInfo() {
        return {
            integration: {
                isActive: this.isActive,
                isInitialized: this.isInitialized,
                systemsReady: this._getAllSystemsReady(),
                config: this.config,
                performanceMetrics: this.performanceMetrics
            },
            systems: {
                quest: this.questSystem?.getDebugInfo() || null,
                achievement: this.achievementManager?.getDebugInfo() || null,
                reward: this.rewardManager?.getDebugInfo() || null
            },
            integrationState: {
                ...this.integrationState,
                crossSystemEvents: this.integrationState.crossSystemEvents.size,
                progressTracking: this.integrationState.progressTracking.size
            }
        };
    }

    // Private methods

    /**
     * Initialize all subsystems in proper order
     */
    async _initializeSubsystems() {
        // Initialize reward manager first (needed by others)
        if (this.rewardManager && !this.integrationState.systemsInitialized.rewardManager) {
            const rewardSuccess = await this.rewardManager.initialize();
            this.integrationState.systemsInitialized.rewardManager = rewardSuccess;
            console.log(`QuestIntegration: RewardManager initialization ${rewardSuccess ? 'successful' : 'failed'}`);
        }

        // Initialize quest system
        if (this.questSystem && !this.integrationState.systemsInitialized.questSystem) {
            const questSuccess = await this.questSystem.initialize();
            this.integrationState.systemsInitialized.questSystem = questSuccess;
            console.log(`QuestIntegration: QuestSystem initialization ${questSuccess ? 'successful' : 'failed'}`);
        }

        // Initialize achievement manager last (may depend on others)
        if (this.achievementManager && !this.integrationState.systemsInitialized.achievementManager) {
            const achievementSuccess = await this.achievementManager.initialize();
            this.integrationState.systemsInitialized.achievementManager = achievementSuccess;
            console.log(`QuestIntegration: AchievementManager initialization ${achievementSuccess ? 'successful' : 'failed'}`);
        }
    }

    /**
     * Set up cross-system event handlers
     */
    _setupCrossSystemEvents() {
        // Quest completion events
        this.eventManager.on('questSystem:questCompleted', (data) => {
            this.handleQuestCompletion(data.quest, data.rewards);
        });

        // Achievement unlock events
        this.eventManager.on('achievementManager:achievementUnlocked', (data) => {
            this.handleAchievementUnlock(data.achievement, data.unlockData);
        });

        // Reward distribution events
        this.eventManager.on('rewardManager:rewardsAwarded', (data) => {
            this._trackRewardDistribution(data);
        });

        // Game state changes that affect multiple systems
        this.eventManager.on('cultivation:breakthrough', (data) => {
            this.processGameEvent('cultivation:breakthrough', data);
        });

        this.eventManager.on('combat:victory', (data) => {
            this.processGameEvent('combat:victory', data);
        });

        this.eventManager.on('gacha:pull', (data) => {
            this.processGameEvent('gacha:pull', data);
        });

        this.eventManager.on('sect:activity', (data) => {
            this.processGameEvent('sect:activity', data);
        });
    }

    /**
     * Set up progress synchronization
     */
    _setupProgressSync() {
        // Periodic sync of all systems
        setInterval(() => {
            this._performPeriodicSync();
        }, this.config.syncInterval);

        // Sync on significant game events
        this.eventManager.on('gameState:saved', () => {
            this._performSaveSync();
        });
    }

    /**
     * Set up performance monitoring
     */
    _setupPerformanceMonitoring() {
        // Track event processing times
        this.eventManager.on('*', (data) => {
            if (data.type.startsWith('questIntegration:')) {
                return; // Don't track our own events to avoid recursion
            }

            const systemName = data.type.split(':')[0];
            if (['questSystem', 'achievementManager', 'rewardManager'].includes(systemName)) {
                this._trackSystemPerformance(systemName, data);
            }
        });
    }

    /**
     * Start integration monitoring loops
     */
    _startIntegrationLoops() {
        // Health check loop
        setInterval(() => {
            this._performHealthCheck();
        }, 60000); // Every minute

        // Performance cleanup loop
        setInterval(() => {
            this._cleanupPerformanceMetrics();
        }, 300000); // Every 5 minutes
    }

    /**
     * Check for quest-related achievements
     * @param {Object} quest - Completed quest
     */
    _checkQuestAchievements(quest) {
        // Specific achievement checks based on quest completion
        const relevantAchievements = [
            'progression_questmaster',
            'progression_first_realm'
        ];

        if (this.achievementManager) {
            this.achievementManager.checkAllAchievements(relevantAchievements);
        }
    }

    /**
     * Check for achievement-related quests
     * @param {Object} achievement - Unlocked achievement
     */
    _checkAchievementQuests(achievement) {
        // Check if any active quests care about achievement unlocks
        if (this.questSystem) {
            const activeQuests = this.questSystem._getAllActiveQuests();
            for (const quest of activeQuests) {
                if (quest.objective.type === window.OBJECTIVE_TYPES.EARN_ACHIEVEMENTS) {
                    quest.objective.current += 1;
                }
            }
        }
    }

    /**
     * Apply quest completion effects
     * @param {Object} quest - Completed quest
     * @param {Object} rewards - Quest rewards
     */
    _applyQuestCompletionEffects(quest, rewards) {
        // Check for special quest completion effects
        if (quest.category === window.QUEST_CATEGORIES.CULTIVATION) {
            // Cultivation quests might provide temporary cultivation bonuses
            if (this.rewardManager && Math.random() < 0.1) { // 10% chance
                this.rewardManager.addRewardBonus(`quest_completion_${quest.id}`, {
                    name: 'Cultivation Focus',
                    description: 'Temporary cultivation bonus from quest completion',
                    multipliers: { experience: 1.2 },
                    duration: 1800000, // 30 minutes
                    source: 'quest_completion'
                });
            }
        }

        if (quest.type === window.QUEST_TYPES.WEEKLY) {
            // Weekly quests provide longer-lasting bonuses
            if (this.rewardManager) {
                this.rewardManager.addRewardBonus(`weekly_completion_${quest.id}`, {
                    name: 'Weekly Achievement',
                    description: 'Extended reward bonus from weekly quest',
                    multipliers: {
                        jade: 1.1,
                        spiritCrystals: 1.1
                    },
                    duration: 7200000, // 2 hours
                    source: 'weekly_quest'
                });
            }
        }
    }

    /**
     * Apply achievement effects
     * @param {Object} achievement - Unlocked achievement
     * @param {Object} unlockData - Achievement unlock data
     */
    _applyAchievementEffects(achievement, unlockData) {
        // Apply special achievement rewards if they exist
        if (achievement.rewards && achievement.rewards.special && this.rewardManager) {
            this.rewardManager.applySpecialEffect(
                achievement.rewards.special,
                { achievementId: achievement.id },
                achievement.rewards.specialDuration || 3600000
            );
        }

        // High-rarity achievements might trigger quest generation
        if (achievement.rarity.points >= 100 && this.questSystem) {
            // Rare achievements might unlock special quests
            console.log(`QuestIntegration: Rare achievement unlocked, checking for special quests`);
        }
    }

    /**
     * Track cross-system events
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    _trackCrossSystemEvent(eventType, eventData) {
        const eventKey = `${eventType}_${Date.now()}`;
        this.integrationState.crossSystemEvents.set(eventKey, {
            type: eventType,
            data: eventData,
            timestamp: Date.now(),
            systemsAffected: this._getAffectedSystems(eventType)
        });

        // Cleanup old events
        if (this.integrationState.crossSystemEvents.size > this.config.maxEventQueue) {
            const oldestKey = this.integrationState.crossSystemEvents.keys().next().value;
            this.integrationState.crossSystemEvents.delete(oldestKey);
        }
    }

    /**
     * Track reward distribution
     * @param {Object} rewardData - Reward distribution data
     */
    _trackRewardDistribution(rewardData) {
        // Track reward distribution patterns for analytics
        this.integrationState.progressTracking.set(`reward_${rewardData.rewardId}`, {
            type: 'reward',
            source: rewardData.source,
            timestamp: rewardData.timestamp,
            value: this._calculateRewardValue(rewardData.rewards)
        });
    }

    /**
     * Update cross-system statistics
     * @param {string} eventType - Type of event
     * @param {Object} eventData - Event data
     */
    _updateCrossSystemStats(eventType, eventData) {
        const stats = this.gameState.get('questIntegrationStats') || {
            questsCompleted: 0,
            achievementsUnlocked: 0,
            totalRewardValue: 0,
            crossSystemEvents: 0
        };

        switch (eventType) {
            case 'questCompleted':
                stats.questsCompleted++;
                stats.totalRewardValue += this._calculateRewardValue(eventData.rewards);
                break;
            case 'achievementUnlocked':
                stats.achievementsUnlocked++;
                break;
        }

        stats.crossSystemEvents++;
        this.gameState.set('questIntegrationStats', stats);
    }

    /**
     * Calculate reward value for analytics
     * @param {Object} rewards - Reward object
     * @returns {number} Calculated value
     */
    _calculateRewardValue(rewards) {
        let value = 0;
        const valueWeights = {
            jade: 1,
            spiritCrystals: 3,
            shards: 10,
            experience: 0.1
        };

        for (const [rewardType, amount] of Object.entries(rewards)) {
            if (typeof amount === 'number') {
                value += amount * (valueWeights[rewardType] || 1);
            }
        }

        return value;
    }

    /**
     * Get systems affected by an event type
     * @param {string} eventType - Event type
     * @returns {Array} Affected system names
     */
    _getAffectedSystems(eventType) {
        const systemMap = {
            'cultivation:': ['questSystem', 'achievementManager', 'rewardManager'],
            'combat:': ['questSystem', 'achievementManager'],
            'gacha:': ['questSystem', 'achievementManager'],
            'sect:': ['questSystem', 'achievementManager', 'rewardManager'],
            'gameState:': ['questSystem', 'achievementManager']
        };

        for (const [prefix, systems] of Object.entries(systemMap)) {
            if (eventType.startsWith(prefix)) {
                return systems;
            }
        }

        return [];
    }

    /**
     * Check if all systems are ready
     * @returns {boolean} Whether all systems are initialized
     */
    _getAllSystemsReady() {
        const systems = this.integrationState.systemsInitialized;
        return systems.questSystem && systems.achievementManager && systems.rewardManager;
    }

    /**
     * Update performance metrics
     * @param {string} eventType - Event type
     * @param {number} processingTime - Processing time in milliseconds
     */
    _updatePerformanceMetrics(eventType, processingTime) {
        this.performanceMetrics.eventProcessingTime.push({
            eventType: eventType,
            time: processingTime,
            timestamp: Date.now()
        });

        this.performanceMetrics.totalEventsProcessed++;

        // Keep only recent metrics
        if (this.performanceMetrics.eventProcessingTime.length > 1000) {
            this.performanceMetrics.eventProcessingTime.shift();
        }
    }

    /**
     * Track system performance
     * @param {string} systemName - System name
     * @param {Object} eventData - Event data
     */
    _trackSystemPerformance(systemName, eventData) {
        if (!this.performanceMetrics.systemResponseTimes.has(systemName)) {
            this.performanceMetrics.systemResponseTimes.set(systemName, []);
        }

        const systemMetrics = this.performanceMetrics.systemResponseTimes.get(systemName);
        systemMetrics.push({
            timestamp: Date.now(),
            eventType: eventData.type
        });

        // Keep only recent metrics
        if (systemMetrics.length > 100) {
            systemMetrics.shift();
        }
    }

    /**
     * Get performance summary
     * @returns {Object} Performance summary
     */
    _getPerformanceSummary() {
        const recentEvents = this.performanceMetrics.eventProcessingTime.slice(-100);
        const avgProcessingTime = recentEvents.length > 0 ?
            recentEvents.reduce((sum, event) => sum + event.time, 0) / recentEvents.length : 0;

        return {
            totalEventsProcessed: this.performanceMetrics.totalEventsProcessed,
            averageProcessingTime: avgProcessingTime,
            errorCount: this.performanceMetrics.errorCount,
            systemResponseTimes: Object.fromEntries(this.performanceMetrics.systemResponseTimes)
        };
    }

    /**
     * Perform periodic sync
     */
    _performPeriodicSync() {
        if (!this._getAllSystemsReady()) return;

        try {
            // Check for any desync issues and fix them
            this._checkSystemSync();

            // Update last sync time
            this.integrationState.lastSyncTime = Date.now();

        } catch (error) {
            console.error('QuestIntegration: Periodic sync failed:', error);
        }
    }

    /**
     * Perform save sync
     */
    _performSaveSync() {
        // Ensure all systems save their state when game state is saved
        try {
            if (this.questSystem) {
                this.questSystem._saveQuestState();
            }
            if (this.achievementManager) {
                this.achievementManager._saveAchievementState();
            }
            if (this.rewardManager) {
                this.rewardManager._saveRewardState();
            }
        } catch (error) {
            console.error('QuestIntegration: Save sync failed:', error);
        }
    }

    /**
     * Check system synchronization
     */
    _checkSystemSync() {
        // Check for any inconsistencies between systems
        // This is where you'd implement cross-system validation
    }

    /**
     * Perform health check
     */
    _performHealthCheck() {
        const health = this.getSystemHealth();

        // Log warnings for any unhealthy systems
        if (!health.integration.isActive) {
            console.warn('QuestIntegration: Integration system is not active');
        }

        if (health.integration.errorCount > 10) {
            console.warn(`QuestIntegration: High error count: ${health.integration.errorCount}`);
        }
    }

    /**
     * Clean up performance metrics
     */
    _cleanupPerformanceMetrics() {
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

        // Clean up old event processing times
        this.performanceMetrics.eventProcessingTime = this.performanceMetrics.eventProcessingTime
            .filter(event => event.timestamp > cutoffTime);

        // Clean up old system response times
        for (const [systemName, metrics] of this.performanceMetrics.systemResponseTimes) {
            const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
            this.performanceMetrics.systemResponseTimes.set(systemName, filteredMetrics);
        }
    }
}

// Create singleton instance
const questIntegration = new QuestIntegration(
    window.gameState,
    window.eventManager,
    window.saveManager
);

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestIntegration, questIntegration };
} else if (typeof window !== 'undefined') {
    window.QuestIntegration = QuestIntegration;
    window.questIntegration = questIntegration;
}