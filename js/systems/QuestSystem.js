/**
 * QuestSystem - Comprehensive quest management with generation, tracking, and rewards
 * Handles daily/weekly quests, milestone quests, and quest chains
 */
class QuestSystem {
    constructor(gameState, eventManager, saveManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.saveManager = saveManager;

        // Quest state
        this.questState = {
            activeQuests: {
                daily: [],
                weekly: [],
                milestone: [],
                chain: [],
                special: []
            },
            completedQuests: [],
            failedQuests: [],
            abandonedQuests: [],
            lastDailyRefresh: 0,
            lastWeeklyRefresh: 0,
            questIdCounter: 1
        };

        // Quest progress tracking
        this.progressTrackers = new Map();
        this.objectiveHandlers = new Map();

        // Quest generation settings
        this.generationSettings = {
            playerLevel: 1,
            difficultyScaling: true,
            categoryWeights: new Map(),
            excludedCategories: new Set()
        };

        // Statistics
        this.statistics = {
            totalGenerated: 0,
            totalCompleted: 0,
            totalFailed: 0,
            totalAbandoned: 0,
            completionRate: 0,
            averageCompletionTime: 0,
            favoriteCategory: null,
            perfectQuests: 0
        };

        // Performance tracking
        this.lastUpdateTime = Date.now();
        this.updateInterval = 1000; // 1 second
        this.isActive = false;
        this.isInitialized = false;

        console.log('QuestSystem: Initialized');
    }

    /**
     * Initialize the quest system
     */
    async initialize() {
        try {
            // Load quest data
            if (!window.QUEST_TEMPLATES) {
                console.error('QuestSystem: Quest data not loaded');
                return false;
            }

            // Load saved quest state
            const savedState = this.gameState.get('questState');
            if (savedState) {
                this.questState = { ...this.questState, ...savedState };
            }

            // Load statistics
            const savedStats = this.gameState.get('questStats');
            if (savedStats) {
                this.statistics = { ...this.statistics, ...savedStats };
            }

            // Set up objective handlers
            this._setupObjectiveHandlers();

            // Set up event listeners
            this._setupEventListeners();

            // Initialize quest generation settings
            this._updateGenerationSettings();

            // Check for quest refreshes
            this._checkQuestRefreshes();

            // Start progress tracking
            this._startProgressTracking();

            this.isInitialized = true;
            this.isActive = true;

            // Emit initialization event
            this.eventManager.emit('questSystem:initialized', {
                activeQuests: this._getActiveQuestCount(),
                completedQuests: this.statistics.totalCompleted
            });

            console.log('QuestSystem: Initialization complete');
            return true;

        } catch (error) {
            console.error('QuestSystem: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Generate daily quests
     */
    generateDailyQuests() {
        try {
            const config = window.DAILY_QUEST_CONFIG;
            if (!config) {
                console.error('QuestSystem: Daily quest config not found');
                return;
            }

            // Clear existing daily quests
            this.questState.activeQuests.daily = [];

            // Generate new daily quests
            const questsToGenerate = Math.min(config.maxActiveQuests, 3);
            const generatedQuests = [];

            for (let i = 0; i < questsToGenerate; i++) {
                const quest = this._generateQuest(window.QUEST_TYPES.DAILY);
                if (quest) {
                    generatedQuests.push(quest);
                }
            }

            this.questState.activeQuests.daily = generatedQuests;
            this.questState.lastDailyRefresh = Date.now();

            // Update statistics
            this.statistics.totalGenerated += generatedQuests.length;

            // Save state
            this._saveQuestState();

            // Emit event
            this.eventManager.emit('questSystem:dailyQuestsGenerated', {
                quests: generatedQuests,
                count: generatedQuests.length
            });

            console.log(`QuestSystem: Generated ${generatedQuests.length} daily quests`);

        } catch (error) {
            console.error('QuestSystem: Failed to generate daily quests:', error);
        }
    }

    /**
     * Generate weekly quests
     */
    generateWeeklyQuests() {
        try {
            const config = window.WEEKLY_QUEST_CONFIG;
            if (!config) {
                console.error('QuestSystem: Weekly quest config not found');
                return;
            }

            // Clear existing weekly quests
            this.questState.activeQuests.weekly = [];

            // Generate new weekly quests
            const questsToGenerate = Math.min(config.maxActiveQuests, 2);
            const generatedQuests = [];

            for (let i = 0; i < questsToGenerate; i++) {
                const quest = this._generateQuest(window.QUEST_TYPES.WEEKLY);
                if (quest) {
                    generatedQuests.push(quest);
                }
            }

            this.questState.activeQuests.weekly = generatedQuests;
            this.questState.lastWeeklyRefresh = Date.now();

            // Update statistics
            this.statistics.totalGenerated += generatedQuests.length;

            // Save state
            this._saveQuestState();

            // Emit event
            this.eventManager.emit('questSystem:weeklyQuestsGenerated', {
                quests: generatedQuests,
                count: generatedQuests.length
            });

            console.log(`QuestSystem: Generated ${generatedQuests.length} weekly quests`);

        } catch (error) {
            console.error('QuestSystem: Failed to generate weekly quests:', error);
        }
    }

    /**
     * Complete a quest
     * @param {string} questId - Quest ID to complete
     * @returns {Object} Completion result with rewards
     */
    completeQuest(questId) {
        try {
            const quest = this.getActiveQuest(questId);
            if (!quest) {
                console.warn('QuestSystem: Quest not found for completion:', questId);
                return null;
            }

            // Check if quest is actually completable
            if (!this._isQuestComplete(quest)) {
                console.warn('QuestSystem: Quest not ready for completion:', questId);
                return null;
            }

            // Calculate rewards
            const rewards = this._calculateQuestRewards(quest);

            // Award rewards through RewardManager
            if (window.rewardManager) {
                window.rewardManager.awardRewards(rewards, {
                    source: 'quest',
                    questId: questId,
                    questType: quest.type
                });
            } else {
                // Fallback reward distribution
                this._awardRewardsFallback(rewards);
            }

            // Move quest to completed
            this._moveQuestToCompleted(quest);

            // Update statistics
            this.statistics.totalCompleted++;
            this._updateCompletionRate();
            this._updateAverageCompletionTime(quest);

            // Check for quest chains
            this._checkQuestChains(quest);

            // Save state
            this._saveQuestState();

            // Emit completion event
            this.eventManager.emit('questSystem:questCompleted', {
                quest: quest,
                rewards: rewards,
                statistics: this.statistics
            });

            console.log(`QuestSystem: Quest completed: ${quest.name}`);
            return {
                quest: quest,
                rewards: rewards,
                success: true
            };

        } catch (error) {
            console.error('QuestSystem: Failed to complete quest:', error);
            return null;
        }
    }

    /**
     * Abandon a quest
     * @param {string} questId - Quest ID to abandon
     * @returns {boolean} Success status
     */
    abandonQuest(questId) {
        try {
            const quest = this.getActiveQuest(questId);
            if (!quest) {
                return false;
            }

            // Check if quest can be abandoned
            if (quest.type === window.QUEST_TYPES.MILESTONE || quest.unAbandonable) {
                console.warn('QuestSystem: Quest cannot be abandoned:', questId);
                return false;
            }

            // Remove from active quests
            this._removeFromActiveQuests(quest);

            // Add to abandoned quests
            quest.abandonedAt = Date.now();
            this.questState.abandonedQuests.push(quest);

            // Update statistics
            this.statistics.totalAbandoned++;

            // Save state
            this._saveQuestState();

            // Emit event
            this.eventManager.emit('questSystem:questAbandoned', {
                quest: quest
            });

            console.log(`QuestSystem: Quest abandoned: ${quest.name}`);
            return true;

        } catch (error) {
            console.error('QuestSystem: Failed to abandon quest:', error);
            return false;
        }
    }

    /**
     * Get an active quest by ID
     * @param {string} questId - Quest ID
     * @returns {Object|null} Quest object or null
     */
    getActiveQuest(questId) {
        for (const category of Object.keys(this.questState.activeQuests)) {
            const quest = this.questState.activeQuests[category].find(q => q.id === questId);
            if (quest) {
                return quest;
            }
        }
        return null;
    }

    /**
     * Get all active quests
     * @returns {Object} Active quests by category
     */
    getActiveQuests() {
        return {
            daily: [...this.questState.activeQuests.daily],
            weekly: [...this.questState.activeQuests.weekly],
            milestone: [...this.questState.activeQuests.milestone],
            chain: [...this.questState.activeQuests.chain],
            special: [...this.questState.activeQuests.special]
        };
    }

    /**
     * Get quest statistics
     * @returns {Object} Quest statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Update quest progress based on game events
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    updateQuestProgress(eventType, eventData) {
        if (!this.isActive) return;

        try {
            // Get all active quests
            const allQuests = this._getAllActiveQuests();

            // Update progress for relevant quests
            for (const quest of allQuests) {
                if (this._isQuestRelevantToEvent(quest, eventType, eventData)) {
                    this._updateQuestObjective(quest, eventType, eventData);
                }
            }

            // Save updated state
            this._saveQuestState();

        } catch (error) {
            console.error('QuestSystem: Failed to update quest progress:', error);
        }
    }

    /**
     * Force refresh all quest pools
     */
    refreshAllQuests() {
        this.generateDailyQuests();
        this.generateWeeklyQuests();

        this.eventManager.emit('questSystem:allQuestsRefreshed', {
            timestamp: Date.now()
        });
    }

    /**
     * Get debug information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isActive: this.isActive,
            isInitialized: this.isInitialized,
            activeQuestCount: this._getActiveQuestCount(),
            lastDailyRefresh: this.questState.lastDailyRefresh,
            lastWeeklyRefresh: this.questState.lastWeeklyRefresh,
            statistics: this.statistics,
            progressTrackers: this.progressTrackers.size,
            objectiveHandlers: this.objectiveHandlers.size
        };
    }

    // Private methods

    /**
     * Generate a quest based on type and player state
     * @param {string} questType - Type of quest to generate
     * @returns {Object|null} Generated quest or null
     */
    _generateQuest(questType) {
        try {
            // Get available templates for quest type
            const availableTemplates = this._getAvailableTemplates(questType);
            if (availableTemplates.length === 0) {
                console.warn('QuestSystem: No available templates for type:', questType);
                return null;
            }

            // Select random template
            const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];

            // Create quest instance from template
            const quest = this._createQuestFromTemplate(template, questType);

            return quest;

        } catch (error) {
            console.error('QuestSystem: Failed to generate quest:', error);
            return null;
        }
    }

    /**
     * Get available quest templates for a type
     * @param {string} questType - Quest type
     * @returns {Array} Available templates
     */
    _getAvailableTemplates(questType) {
        const allTemplates = [];

        // Collect templates from all categories
        for (const category of Object.keys(window.QUEST_TEMPLATES)) {
            if (this.generationSettings.excludedCategories.has(category)) {
                continue;
            }

            const categoryTemplates = window.QUEST_TEMPLATES[category]
                .filter(template => template.type === questType)
                .filter(template => this._meetsRequirements(template.requirements));

            allTemplates.push(...categoryTemplates);
        }

        return allTemplates;
    }

    /**
     * Check if player meets quest requirements
     * @param {Object} requirements - Quest requirements
     * @returns {boolean} Whether requirements are met
     */
    _meetsRequirements(requirements) {
        if (!requirements) return true;

        // Check minimum level
        if (requirements.minLevel !== undefined) {
            const playerLevel = this._getPlayerLevel();
            if (playerLevel < requirements.minLevel) {
                return false;
            }
        }

        // Check sect membership
        if (requirements.sectMember) {
            const sectId = this.gameState.get('sect.id');
            if (!sectId) {
                return false;
            }
        }

        // Check tutorial state
        if (requirements.tutorial) {
            const tutorialCompleted = this.gameState.get('tutorial.completed');
            const currentStep = this.gameState.get('tutorial.currentStep');
            if (tutorialCompleted || currentStep > 5) {
                return false; // Skip tutorial quests if tutorial is done
            }
        }

        return true;
    }

    /**
     * Create quest instance from template
     * @param {Object} template - Quest template
     * @param {string} questType - Quest type
     * @returns {Object} Quest instance
     */
    _createQuestFromTemplate(template, questType) {
        const quest = {
            id: `quest_${this.questState.questIdCounter++}`,
            templateId: template.id,
            name: template.name,
            description: template.description,
            type: questType,
            category: this._getTemplateCategory(template),
            createdAt: Date.now(),
            expiresAt: this._calculateExpirationTime(questType),

            // Objective setup
            objective: {
                ...template.objective,
                current: 0
            },

            // Reward setup with scaling
            rewards: this._scaleRewards(template.rewards, questType),

            // Progress tracking
            progress: {
                started: false,
                completed: false,
                failed: false,
                startTime: null,
                completionTime: null
            },

            // Metadata
            difficulty: this._calculateDifficulty(template, questType),
            estimatedTime: this._estimateCompletionTime(template, questType)
        };

        // Apply target scaling if applicable
        if (Array.isArray(template.objective.target)) {
            const difficultyIndex = this._getDifficultyIndex(quest.difficulty);
            quest.objective.target = template.objective.target[difficultyIndex];
        }

        // Format description with target
        quest.description = quest.description.replace('{target}', quest.objective.target);

        return quest;
    }

    /**
     * Get template category
     * @param {Object} template - Quest template
     * @returns {string} Category name
     */
    _getTemplateCategory(template) {
        for (const [category, templates] of Object.entries(window.QUEST_TEMPLATES)) {
            if (templates.includes(template)) {
                return category;
            }
        }
        return window.QUEST_CATEGORIES.SPECIAL;
    }

    /**
     * Calculate quest expiration time
     * @param {string} questType - Quest type
     * @returns {number} Expiration timestamp
     */
    _calculateExpirationTime(questType) {
        const now = Date.now();

        switch (questType) {
            case window.QUEST_TYPES.DAILY:
                return now + (24 * 60 * 60 * 1000); // 24 hours
            case window.QUEST_TYPES.WEEKLY:
                return now + (7 * 24 * 60 * 60 * 1000); // 7 days
            case window.QUEST_TYPES.MILESTONE:
                return null; // No expiration
            case window.QUEST_TYPES.CHAIN:
                return now + (3 * 24 * 60 * 60 * 1000); // 3 days
            default:
                return now + (24 * 60 * 60 * 1000);
        }
    }

    /**
     * Scale quest rewards based on player level and difficulty
     * @param {Object} baseRewards - Base reward amounts
     * @param {string} questType - Quest type
     * @returns {Object} Scaled rewards
     */
    _scaleRewards(baseRewards, questType) {
        const scaling = window.REWARD_SCALING;
        if (!scaling) return baseRewards;

        const playerLevel = this._getPlayerLevel();
        const levelMultiplier = 1 + (playerLevel * scaling.LEVEL_MULTIPLIER);
        const typeMultiplier = scaling.QUEST_TYPE_MULTIPLIER[questType] || 1.0;

        const scaledRewards = {};

        for (const [rewardType, amount] of Object.entries(baseRewards)) {
            if (typeof amount === 'number') {
                scaledRewards[rewardType] = Math.floor(amount * levelMultiplier * typeMultiplier);
            } else if (Array.isArray(amount)) {
                // Scale array of rewards
                scaledRewards[rewardType] = amount.map(amt =>
                    Math.floor(amt * levelMultiplier * typeMultiplier)
                );
            } else {
                // Keep non-numeric rewards as-is
                scaledRewards[rewardType] = amount;
            }
        }

        return scaledRewards;
    }

    /**
     * Calculate quest difficulty
     * @param {Object} template - Quest template
     * @param {string} questType - Quest type
     * @returns {string} Difficulty level
     */
    _calculateDifficulty(template, questType) {
        // Default difficulty logic
        const playerLevel = this._getPlayerLevel();

        if (questType === window.QUEST_TYPES.DAILY) {
            return playerLevel < 10 ? 'Easy' : 'Normal';
        } else if (questType === window.QUEST_TYPES.WEEKLY) {
            return playerLevel < 15 ? 'Normal' : 'Hard';
        }

        return 'Normal';
    }

    /**
     * Get difficulty index for array access
     * @param {string} difficulty - Difficulty name
     * @returns {number} Difficulty index
     */
    _getDifficultyIndex(difficulty) {
        const difficultyMap = {
            'Trivial': 0,
            'Easy': 0,
            'Normal': 1,
            'Hard': 2,
            'Expert': 3,
            'Legendary': 3
        };
        return difficultyMap[difficulty] || 1;
    }

    /**
     * Set up objective handlers for different event types
     */
    _setupObjectiveHandlers() {
        const handlers = new Map();

        // Cultivation objective handlers
        handlers.set(window.OBJECTIVE_TYPES.GAIN_QI_EXP, this._handleQiExperienceObjective.bind(this));
        handlers.set(window.OBJECTIVE_TYPES.GAIN_BODY_EXP, this._handleBodyExperienceObjective.bind(this));
        handlers.set(window.OBJECTIVE_TYPES.BREAKTHROUGH_QI, this._handleQiBreakthroughObjective.bind(this));
        handlers.set(window.OBJECTIVE_TYPES.BREAKTHROUGH_BODY, this._handleBodyBreakthroughObjective.bind(this));

        // Combat objective handlers
        handlers.set(window.OBJECTIVE_TYPES.WIN_DUELS, this._handleWinDuelsObjective.bind(this));
        handlers.set(window.OBJECTIVE_TYPES.WIN_STREAK, this._handleWinStreakObjective.bind(this));

        // Collection objective handlers
        handlers.set(window.OBJECTIVE_TYPES.GACHA_PULLS, this._handleGachaPullsObjective.bind(this));
        handlers.set(window.OBJECTIVE_TYPES.COLLECT_JADE, this._handleCollectJadeObjective.bind(this));
        handlers.set(window.OBJECTIVE_TYPES.COLLECT_CRYSTALS, this._handleCollectCrystalsObjective.bind(this));

        // Social objective handlers
        handlers.set(window.OBJECTIVE_TYPES.SECT_CONTRIBUTION, this._handleSectContributionObjective.bind(this));

        this.objectiveHandlers = handlers;
    }

    /**
     * Set up event listeners for quest progress tracking
     */
    _setupEventListeners() {
        // Cultivation events
        this.eventManager.on('cultivation:experienceGained', (data) => {
            this.updateQuestProgress('cultivation:experienceGained', data);
        });

        this.eventManager.on('cultivation:breakthrough', (data) => {
            this.updateQuestProgress('cultivation:breakthrough', data);
        });

        // Combat events
        this.eventManager.on('combat:victory', (data) => {
            this.updateQuestProgress('combat:victory', data);
        });

        this.eventManager.on('combat:streak', (data) => {
            this.updateQuestProgress('combat:streak', data);
        });

        // Gacha events
        this.eventManager.on('gacha:pull', (data) => {
            this.updateQuestProgress('gacha:pull', data);
        });

        // Resource events
        this.eventManager.on('gameState:propertyChanged', (data) => {
            if (data.path.startsWith('player.')) {
                this.updateQuestProgress('resource:changed', data);
            }
        });

        // Sect events
        this.eventManager.on('sect:contribution', (data) => {
            this.updateQuestProgress('sect:contribution', data);
        });

        // Time-based events
        this.eventManager.on('gameLoop:update', () => {
            this._checkQuestRefreshes();
            this._updateTimeBasedObjectives();
        });
    }

    /**
     * Check if quests need refreshing
     */
    _checkQuestRefreshes() {
        const now = Date.now();

        // Check daily refresh
        const dailyConfig = window.DAILY_QUEST_CONFIG;
        if (dailyConfig && (now - this.questState.lastDailyRefresh) >= dailyConfig.refreshTime) {
            this.generateDailyQuests();
        }

        // Check weekly refresh
        const weeklyConfig = window.WEEKLY_QUEST_CONFIG;
        if (weeklyConfig && (now - this.questState.lastWeeklyRefresh) >= weeklyConfig.refreshTime) {
            this.generateWeeklyQuests();
        }
    }

    /**
     * Update quest objective progress
     * @param {Object} quest - Quest to update
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    _updateQuestObjective(quest, eventType, eventData) {
        const handler = this.objectiveHandlers.get(quest.objective.type);
        if (handler) {
            handler(quest, eventData);

            // Check if quest is now complete
            if (this._isQuestComplete(quest)) {
                this.eventManager.emit('questSystem:questReady', {
                    quest: quest
                });
            }
        }
    }

    /**
     * Handle Qi experience objective
     * @param {Object} quest - Quest object
     * @param {Object} eventData - Event data
     */
    _handleQiExperienceObjective(quest, eventData) {
        if (eventData.data && eventData.data.type === 'qi') {
            quest.objective.current += eventData.data.amount || 0;
        }
    }

    /**
     * Handle Body experience objective
     * @param {Object} quest - Quest object
     * @param {Object} eventData - Event data
     */
    _handleBodyExperienceObjective(quest, eventData) {
        if (eventData.data && eventData.data.type === 'body') {
            quest.objective.current += eventData.data.amount || 0;
        }
    }

    /**
     * Handle gacha pulls objective
     * @param {Object} quest - Quest object
     * @param {Object} eventData - Event data
     */
    _handleGachaPullsObjective(quest, eventData) {
        quest.objective.current += 1;
    }

    /**
     * Handle win duels objective
     * @param {Object} quest - Quest object
     * @param {Object} eventData - Event data
     */
    _handleWinDuelsObjective(quest, eventData) {
        if (eventData.data && eventData.data.result === 'victory') {
            quest.objective.current += 1;
        }
    }

    /**
     * Check if quest is complete
     * @param {Object} quest - Quest to check
     * @returns {boolean} Whether quest is complete
     */
    _isQuestComplete(quest) {
        return quest.objective.current >= quest.objective.target;
    }

    /**
     * Check if quest is relevant to an event
     * @param {Object} quest - Quest to check
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     * @returns {boolean} Whether quest is relevant
     */
    _isQuestRelevantToEvent(quest, eventType, eventData) {
        // Map objective types to event types
        const relevantEvents = {
            [window.OBJECTIVE_TYPES.GAIN_QI_EXP]: ['cultivation:experienceGained'],
            [window.OBJECTIVE_TYPES.GAIN_BODY_EXP]: ['cultivation:experienceGained'],
            [window.OBJECTIVE_TYPES.BREAKTHROUGH_QI]: ['cultivation:breakthrough'],
            [window.OBJECTIVE_TYPES.BREAKTHROUGH_BODY]: ['cultivation:breakthrough'],
            [window.OBJECTIVE_TYPES.WIN_DUELS]: ['combat:victory'],
            [window.OBJECTIVE_TYPES.WIN_STREAK]: ['combat:streak'],
            [window.OBJECTIVE_TYPES.GACHA_PULLS]: ['gacha:pull'],
            [window.OBJECTIVE_TYPES.COLLECT_JADE]: ['resource:changed'],
            [window.OBJECTIVE_TYPES.COLLECT_CRYSTALS]: ['resource:changed'],
            [window.OBJECTIVE_TYPES.SECT_CONTRIBUTION]: ['sect:contribution']
        };

        const events = relevantEvents[quest.objective.type];
        return events && events.includes(eventType);
    }

    /**
     * Get player level for scaling
     * @returns {number} Player level
     */
    _getPlayerLevel() {
        const qiLevel = this.gameState.get('cultivation.qi.level') || 0;
        const bodyLevel = this.gameState.get('cultivation.body.level') || 0;
        return Math.max(qiLevel, bodyLevel);
    }

    /**
     * Get all active quests as a flat array
     * @returns {Array} All active quests
     */
    _getAllActiveQuests() {
        const allQuests = [];
        for (const category of Object.keys(this.questState.activeQuests)) {
            allQuests.push(...this.questState.activeQuests[category]);
        }
        return allQuests;
    }

    /**
     * Get total count of active quests
     * @returns {number} Total active quest count
     */
    _getActiveQuestCount() {
        return this._getAllActiveQuests().length;
    }

    /**
     * Save quest state to game state
     */
    _saveQuestState() {
        this.gameState.update({
            questState: this.questState,
            questStats: this.statistics
        }, { source: 'questSystem' });
    }

    /**
     * Start progress tracking loop
     */
    _startProgressTracking() {
        setInterval(() => {
            this._updateTimeBasedObjectives();
        }, this.updateInterval);
    }

    /**
     * Update time-based quest objectives
     */
    _updateTimeBasedObjectives() {
        // Implementation for time-based objectives like meditation time, play time, etc.
        // This would track continuous activities
    }

    /**
     * Move quest to completed list
     * @param {Object} quest - Quest to move
     */
    _moveQuestToCompleted(quest) {
        // Remove from active quests
        this._removeFromActiveQuests(quest);

        // Mark as completed and add to completed list
        quest.progress.completed = true;
        quest.progress.completionTime = Date.now();
        this.questState.completedQuests.push(quest);
    }

    /**
     * Remove quest from active quest lists
     * @param {Object} quest - Quest to remove
     */
    _removeFromActiveQuests(quest) {
        for (const category of Object.keys(this.questState.activeQuests)) {
            const index = this.questState.activeQuests[category].findIndex(q => q.id === quest.id);
            if (index !== -1) {
                this.questState.activeQuests[category].splice(index, 1);
                break;
            }
        }
    }

    /**
     * Calculate quest rewards
     * @param {Object} quest - Quest to calculate rewards for
     * @returns {Object} Calculated rewards
     */
    _calculateQuestRewards(quest) {
        let rewards = { ...quest.rewards };

        // Apply difficulty scaling if applicable
        if (Array.isArray(quest.rewards.jade)) {
            const difficultyIndex = this._getDifficultyIndex(quest.difficulty);
            rewards = {};
            for (const [rewardType, amounts] of Object.entries(quest.rewards)) {
                if (Array.isArray(amounts)) {
                    rewards[rewardType] = amounts[difficultyIndex];
                } else {
                    rewards[rewardType] = amounts;
                }
            }
        }

        return rewards;
    }

    /**
     * Award rewards using fallback method
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
                default:
                    console.log(`QuestSystem: Unhandled reward type: ${rewardType}`);
            }
        }
    }

    /**
     * Update generation settings based on player state
     */
    _updateGenerationSettings() {
        this.generationSettings.playerLevel = this._getPlayerLevel();

        // Update category weights based on player progress
        // More advanced players might get different quest distributions
    }

    /**
     * Update completion rate statistics
     */
    _updateCompletionRate() {
        const total = this.statistics.totalCompleted + this.statistics.totalFailed + this.statistics.totalAbandoned;
        if (total > 0) {
            this.statistics.completionRate = (this.statistics.totalCompleted / total) * 100;
        }
    }

    /**
     * Update average completion time
     * @param {Object} quest - Completed quest
     */
    _updateAverageCompletionTime(quest) {
        if (quest.progress.startTime && quest.progress.completionTime) {
            const completionTime = quest.progress.completionTime - quest.progress.startTime;

            // Simple moving average
            if (this.statistics.averageCompletionTime === 0) {
                this.statistics.averageCompletionTime = completionTime;
            } else {
                this.statistics.averageCompletionTime =
                    (this.statistics.averageCompletionTime + completionTime) / 2;
            }
        }
    }

    /**
     * Check and handle quest chains
     * @param {Object} completedQuest - The completed quest
     */
    _checkQuestChains(completedQuest) {
        // Implementation for quest chain progression
        // This would check if the completed quest is part of a chain
        // and potentially generate the next quest in the chain
    }

    /**
     * Estimate quest completion time
     * @param {Object} template - Quest template
     * @param {string} questType - Quest type
     * @returns {number} Estimated time in milliseconds
     */
    _estimateCompletionTime(template, questType) {
        // Basic estimation logic
        const baseTime = {
            [window.QUEST_TYPES.DAILY]: 30 * 60 * 1000, // 30 minutes
            [window.QUEST_TYPES.WEEKLY]: 2 * 60 * 60 * 1000, // 2 hours
            [window.QUEST_TYPES.MILESTONE]: 60 * 60 * 1000 // 1 hour
        };

        return baseTime[questType] || baseTime[window.QUEST_TYPES.DAILY];
    }
}

// Create singleton instance
const questSystem = new QuestSystem(
    window.gameState,
    window.eventManager,
    window.saveManager
);

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QuestSystem, questSystem };
} else if (typeof window !== 'undefined') {
    window.QuestSystem = QuestSystem;
    window.questSystem = questSystem;
}