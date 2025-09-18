/**
 * SectActivities - Collaborative cultivation activities and group mechanics
 * Handles group meditation, technique sharing, resource gathering, and other sect activities
 */
class SectActivities {
    constructor(gameState, eventManager, sectSystem, sectManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.sectSystem = sectSystem;
        this.sectManager = sectManager;

        // Activity state
        this.activityState = {
            activeActivities: new Map(),
            scheduledActivities: new Map(),
            participantData: new Map(),
            cooldowns: new Map()
        };

        // Activity results cache
        this.resultsCache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes

        // Performance tracking
        this.activityMetrics = {
            activitiesCompleted: 0,
            totalParticipants: 0,
            averageParticipation: 0,
            benefitsDistributed: 0
        };

        this.isInitialized = false;
        this.updateInterval = 30000; // 30 seconds
        this.lastUpdate = Date.now();

        console.log('SectActivities: Initialized');
    }

    /**
     * Initialize the sect activities system
     */
    async initialize() {
        try {
            // Load activity state
            const savedState = this.gameState.get('sectActivities');
            if (savedState) {
                this.activityState = {
                    ...this.activityState,
                    activeActivities: new Map(savedState.activeActivities || []),
                    scheduledActivities: new Map(savedState.scheduledActivities || []),
                    participantData: new Map(savedState.participantData || []),
                    cooldowns: new Map(savedState.cooldowns || [])
                };
            }

            // Load metrics
            const savedMetrics = this.gameState.get('sectActivityMetrics');
            if (savedMetrics) {
                this.activityMetrics = { ...this.activityMetrics, ...savedMetrics };
            }

            // Set up event listeners
            this._setupEventListeners();

            // Initialize activity data
            if (window.SECT_ACTIVITIES) {
                this.activityData = window.SECT_ACTIVITIES;
                console.log('SectActivities: Loaded activity definitions');
            } else {
                console.warn('SectActivities: Activity data not loaded');
            }

            this.isInitialized = true;
            console.log('SectActivities: Initialization complete');
            return true;

        } catch (error) {
            console.error('SectActivities: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Start a sect activity
     * @param {string} activityId - Activity to start
     * @param {Object} options - Activity options
     * @returns {Object} Start result
     */
    async startActivity(activityId, options = {}) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Get activity data
            const activityData = this.activityData[activityId];
            if (!activityData) {
                return this._error('Invalid activity type', 'INVALID_ACTIVITY');
            }

            // Check permissions
            const hasPermission = this._checkActivityPermission(activityData);
            if (!hasPermission.valid) {
                return this._error(hasPermission.reason, 'NO_PERMISSION');
            }

            // Check cooldown
            const cooldownKey = `${currentSect.id}_${activityId}`;
            const lastActivity = this.activityState.cooldowns.get(cooldownKey) || 0;
            const timeSinceLastActivity = Date.now() - lastActivity;

            if (timeSinceLastActivity < activityData.requirements.cooldown) {
                const remainingCooldown = activityData.requirements.cooldown - timeSinceLastActivity;
                return this._error(`Activity on cooldown for ${this._formatTime(remainingCooldown)}`, 'ON_COOLDOWN');
            }

            // Check sect resources
            if (activityData.cost) {
                const canAfford = this._checkSectResources(currentSect, activityData.cost);
                if (!canAfford.valid) {
                    return this._error(`Insufficient sect resources: ${canAfford.missing.join(', ')}`, 'INSUFFICIENT_RESOURCES');
                }
            }

            // Generate activity instance
            const activityInstance = this._createActivityInstance(activityId, activityData, options);

            // Deduct costs
            if (activityData.cost) {
                this._deductSectResources(currentSect, activityData.cost);
            }

            // Add to active activities
            this.activityState.activeActivities.set(activityInstance.id, activityInstance);

            // Set cooldown
            this.activityState.cooldowns.set(cooldownKey, Date.now());

            // Initialize participant tracking
            this.activityState.participantData.set(activityInstance.id, {
                participants: new Set([this._getPlayerId()]),
                startedBy: this._getPlayerId(),
                contributions: new Map()
            });

            // Log activity start
            this.sectManager._logActivity(currentSect.id, 'activity_started', {
                activityId: activityId,
                activityName: activityData.name,
                instanceId: activityInstance.id,
                startedBy: this._getPlayerInfo().name,
                duration: activityData.requirements.duration
            });

            // Save state
            this._saveState();

            // Emit activity start event
            this.eventManager.emit('sectActivity:started', {
                sectId: currentSect.id,
                activityId: activityId,
                instance: activityInstance,
                startedBy: this._getPlayerInfo()
            });

            console.log(`SectActivities: Started ${activityData.name} (${activityInstance.id})`);

            return {
                success: true,
                message: `Started ${activityData.name}`,
                instance: activityInstance,
                duration: activityData.requirements.duration
            };

        } catch (error) {
            console.error('SectActivities: Start activity failed:', error);
            return this._error(error.message, 'START_FAILED');
        }
    }

    /**
     * Join an ongoing activity
     * @param {string} instanceId - Activity instance to join
     * @returns {Object} Join result
     */
    async joinActivity(instanceId) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Get activity instance
            const instance = this.activityState.activeActivities.get(instanceId);
            if (!instance) {
                return this._error('Activity not found or already completed', 'ACTIVITY_NOT_FOUND');
            }

            // Check if activity belongs to current sect
            if (instance.sectId !== currentSect.id) {
                return this._error('Activity belongs to different sect', 'WRONG_SECT');
            }

            // Get participant data
            const participantData = this.activityState.participantData.get(instanceId);
            if (!participantData) {
                return this._error('Participant data not found', 'DATA_ERROR');
            }

            const playerId = this._getPlayerId();

            // Check if already participating
            if (participantData.participants.has(playerId)) {
                return this._error('Already participating in this activity', 'ALREADY_JOINED');
            }

            // Check capacity
            const activityData = this.activityData[instance.activityId];
            if (participantData.participants.size >= activityData.requirements.maxParticipants) {
                return this._error('Activity is at maximum capacity', 'ACTIVITY_FULL');
            }

            // Check role requirements
            const playerRole = currentSect.playerRole;
            const roleData = window.SECT_ROLES[playerRole];
            const minRoleData = window.SECT_ROLES[activityData.requirements.minRole];

            if (roleData.level < minRoleData.level) {
                return this._error('Insufficient role level to join this activity', 'INSUFFICIENT_ROLE');
            }

            // Add participant
            participantData.participants.add(playerId);
            participantData.contributions.set(playerId, {
                joinedAt: Date.now(),
                contribution: 0,
                bonuses: {}
            });

            // Update activity instance
            instance.currentParticipants = participantData.participants.size;

            // Log join
            this.sectManager._logActivity(currentSect.id, 'activity_joined', {
                activityId: instance.activityId,
                instanceId: instanceId,
                joinedBy: this._getPlayerInfo().name,
                participantCount: participantData.participants.size
            });

            // Save state
            this._saveState();

            // Emit join event
            this.eventManager.emit('sectActivity:memberJoined', {
                sectId: currentSect.id,
                instanceId: instanceId,
                instance: instance,
                joinedBy: this._getPlayerInfo(),
                participantCount: participantData.participants.size
            });

            console.log(`SectActivities: Joined ${activityData.name} (${instanceId})`);

            return {
                success: true,
                message: `Joined ${activityData.name}`,
                instance: instance,
                participantCount: participantData.participants.size
            };

        } catch (error) {
            console.error('SectActivities: Join activity failed:', error);
            return this._error(error.message, 'JOIN_FAILED');
        }
    }

    /**
     * Leave an ongoing activity
     * @param {string} instanceId - Activity instance to leave
     * @returns {Object} Leave result
     */
    async leaveActivity(instanceId) {
        try {
            const instance = this.activityState.activeActivities.get(instanceId);
            if (!instance) {
                return this._error('Activity not found', 'ACTIVITY_NOT_FOUND');
            }

            const participantData = this.activityState.participantData.get(instanceId);
            if (!participantData) {
                return this._error('Participant data not found', 'DATA_ERROR');
            }

            const playerId = this._getPlayerId();

            // Check if participating
            if (!participantData.participants.has(playerId)) {
                return this._error('Not participating in this activity', 'NOT_PARTICIPATING');
            }

            // Calculate partial rewards if applicable
            const partialRewards = this._calculatePartialRewards(instance, playerId, participantData);

            // Remove participant
            participantData.participants.delete(playerId);
            participantData.contributions.delete(playerId);

            // Update instance
            instance.currentParticipants = participantData.participants.size;

            // Check if activity should be canceled due to insufficient participants
            const activityData = this.activityData[instance.activityId];
            if (participantData.participants.size < activityData.requirements.minParticipants) {
                await this._cancelActivity(instanceId, 'Insufficient participants after member left');
            }

            // Award partial rewards
            if (partialRewards) {
                this._awardRewards(partialRewards);
            }

            // Save state
            this._saveState();

            // Emit leave event
            this.eventManager.emit('sectActivity:memberLeft', {
                instanceId: instanceId,
                leftBy: this._getPlayerInfo(),
                participantCount: participantData.participants.size,
                partialRewards: partialRewards
            });

            console.log(`SectActivities: Left activity ${instanceId}`);

            return {
                success: true,
                message: 'Left activity',
                partialRewards: partialRewards
            };

        } catch (error) {
            console.error('SectActivities: Leave activity failed:', error);
            return this._error(error.message, 'LEAVE_FAILED');
        }
    }

    /**
     * Get list of available activities
     * @returns {Array} Available activities
     */
    getAvailableActivities() {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return [];
        }

        const playerRole = currentSect.playerRole;
        const roleData = window.SECT_ROLES[playerRole];
        const activities = [];

        for (const [activityId, activityData] of Object.entries(this.activityData)) {
            // Check role requirements
            const minRoleData = window.SECT_ROLES[activityData.requirements.minRole];
            if (roleData.level < minRoleData.level) {
                continue;
            }

            // Check cooldown
            const cooldownKey = `${currentSect.id}_${activityId}`;
            const lastActivity = this.activityState.cooldowns.get(cooldownKey) || 0;
            const timeSinceLastActivity = Date.now() - lastActivity;
            const onCooldown = timeSinceLastActivity < activityData.requirements.cooldown;

            // Check sect resources
            let canAfford = true;
            if (activityData.cost) {
                const resourceCheck = this._checkSectResources(currentSect, activityData.cost);
                canAfford = resourceCheck.valid;
            }

            activities.push({
                id: activityId,
                ...activityData,
                available: !onCooldown && canAfford,
                cooldownRemaining: onCooldown ? activityData.requirements.cooldown - timeSinceLastActivity : 0,
                canAfford: canAfford
            });
        }

        return activities.sort((a, b) => {
            if (a.available && !b.available) return -1;
            if (!a.available && b.available) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get list of active activities
     * @returns {Array} Active activities
     */
    getActiveActivities() {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return [];
        }

        const activeActivities = [];

        for (const [instanceId, instance] of this.activityState.activeActivities) {
            if (instance.sectId === currentSect.id) {
                const participantData = this.activityState.participantData.get(instanceId);
                const activityData = this.activityData[instance.activityId];

                activeActivities.push({
                    instanceId: instanceId,
                    ...instance,
                    activityData: activityData,
                    participants: participantData ? Array.from(participantData.participants) : [],
                    isParticipating: participantData ? participantData.participants.has(this._getPlayerId()) : false,
                    timeRemaining: Math.max(0, instance.endTime - Date.now()),
                    progress: this._calculateActivityProgress(instance)
                });
            }
        }

        return activeActivities.sort((a, b) => a.endTime - b.endTime);
    }

    /**
     * Update activities (called by game loop)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.isInitialized) {
            return;
        }

        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }

        try {
            // Process completed activities
            this._processCompletedActivities();

            // Update activity progress
            this._updateActivityProgress();

            // Clean up old data
            this._cleanupOldData();

            this.lastUpdate = now;

        } catch (error) {
            console.error('SectActivities: Update failed:', error);
        }
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Listen for cultivation progress during activities
        this.eventManager.on('cultivation:experienceGained', (data) => {
            this._onCultivationProgress(data);
        });

        // Listen for sect events
        this.eventManager.on('sect:memberJoined', (data) => {
            this._onMemberJoined(data);
        });

        this.eventManager.on('sect:memberLeft', (data) => {
            this._onMemberLeft(data);
        });
    }

    /**
     * Check if player has permission to start activity
     * @param {Object} activityData - Activity data
     * @returns {Object} Permission check result
     */
    _checkActivityPermission(activityData) {
        const currentSect = this.sectSystem.getCurrentSect();
        const playerRole = currentSect.playerRole;
        const roleData = window.SECT_ROLES[playerRole];
        const minRoleData = window.SECT_ROLES[activityData.requirements.minRole];

        if (roleData.level < minRoleData.level) {
            return {
                valid: false,
                reason: `Requires ${minRoleData.name} role or higher`
            };
        }

        return { valid: true };
    }

    /**
     * Check sect resources
     * @param {Object} sect - Sect object
     * @param {Object} cost - Resource cost
     * @returns {Object} Resource check result
     */
    _checkSectResources(sect, cost) {
        const missing = [];

        for (const [resource, amount] of Object.entries(cost)) {
            const available = sect.treasury[resource] || 0;
            if (available < amount) {
                missing.push(`${resource}: ${amount - available} needed`);
            }
        }

        return {
            valid: missing.length === 0,
            missing: missing
        };
    }

    /**
     * Deduct resources from sect treasury
     * @param {Object} sect - Sect object
     * @param {Object} cost - Resources to deduct
     */
    _deductSectResources(sect, cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            sect.treasury[resource] = Math.max(0, (sect.treasury[resource] || 0) - amount);
        }
    }

    /**
     * Create activity instance
     * @param {string} activityId - Activity ID
     * @param {Object} activityData - Activity data
     * @param {Object} options - Options
     * @returns {Object} Activity instance
     */
    _createActivityInstance(activityId, activityData, options) {
        const currentSect = this.sectSystem.getCurrentSect();
        const startTime = Date.now();
        const endTime = startTime + activityData.requirements.duration;

        return {
            id: `activity_${activityId}_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
            activityId: activityId,
            sectId: currentSect.id,
            startTime: startTime,
            endTime: endTime,
            duration: activityData.requirements.duration,
            currentParticipants: 1,
            maxParticipants: activityData.requirements.maxParticipants,
            minParticipants: activityData.requirements.minParticipants,
            status: 'active',
            startedBy: this._getPlayerId(),
            options: options
        };
    }

    /**
     * Process completed activities
     */
    _processCompletedActivities() {
        const now = Date.now();
        const completedActivities = [];

        for (const [instanceId, instance] of this.activityState.activeActivities) {
            if (now >= instance.endTime) {
                completedActivities.push(instanceId);
            }
        }

        for (const instanceId of completedActivities) {
            this._completeActivity(instanceId);
        }
    }

    /**
     * Complete an activity
     * @param {string} instanceId - Instance to complete
     */
    async _completeActivity(instanceId) {
        try {
            const instance = this.activityState.activeActivities.get(instanceId);
            const participantData = this.activityState.participantData.get(instanceId);

            if (!instance || !participantData) {
                console.warn(`SectActivities: Missing data for activity ${instanceId}`);
                return;
            }

            const activityData = this.activityData[instance.activityId];
            const sect = this.sectSystem.sectRegistry.get(instance.sectId);

            // Check if minimum participants were maintained
            const hasMinParticipants = participantData.participants.size >= activityData.requirements.minParticipants;

            if (hasMinParticipants) {
                // Calculate rewards
                const rewards = this._calculateActivityRewards(instance, activityData, participantData);

                // Distribute rewards
                await this._distributeRewards(rewards, participantData.participants);

                // Apply sect benefits
                this._applySectBenefits(sect, activityData.benefits.sect, participantData.participants.size);

                // Update metrics
                this.activityMetrics.activitiesCompleted++;
                this.activityMetrics.totalParticipants += participantData.participants.size;
                this.activityMetrics.benefitsDistributed += rewards.totalValue || 0;

                // Log completion
                this.sectManager._logActivity(sect.id, 'activity_completed', {
                    activityId: instance.activityId,
                    instanceId: instanceId,
                    participantCount: participantData.participants.size,
                    duration: instance.duration,
                    rewards: rewards
                });

                // Emit completion event
                this.eventManager.emit('sectActivity:completed', {
                    sectId: sect.id,
                    instanceId: instanceId,
                    instance: instance,
                    participantCount: participantData.participants.size,
                    rewards: rewards
                });

                console.log(`SectActivities: Completed ${activityData.name} with ${participantData.participants.size} participants`);
            } else {
                // Activity failed due to insufficient participants
                await this._cancelActivity(instanceId, 'Insufficient participants at completion');
            }

        } catch (error) {
            console.error('SectActivities: Complete activity failed:', error);
        }
    }

    /**
     * Cancel an activity
     * @param {string} instanceId - Instance to cancel
     * @param {string} reason - Cancellation reason
     */
    async _cancelActivity(instanceId, reason) {
        try {
            const instance = this.activityState.activeActivities.get(instanceId);
            const participantData = this.activityState.participantData.get(instanceId);

            if (instance && participantData) {
                const sect = this.sectSystem.sectRegistry.get(instance.sectId);

                // Log cancellation
                this.sectManager._logActivity(sect.id, 'activity_cancelled', {
                    activityId: instance.activityId,
                    instanceId: instanceId,
                    reason: reason,
                    participantCount: participantData.participants.size
                });

                // Emit cancellation event
                this.eventManager.emit('sectActivity:cancelled', {
                    sectId: sect.id,
                    instanceId: instanceId,
                    instance: instance,
                    reason: reason
                });
            }

            // Clean up
            this.activityState.activeActivities.delete(instanceId);
            this.activityState.participantData.delete(instanceId);

            console.log(`SectActivities: Cancelled activity ${instanceId} - ${reason}`);

        } catch (error) {
            console.error('SectActivities: Cancel activity failed:', error);
        }
    }

    /**
     * Calculate activity rewards
     * @param {Object} instance - Activity instance
     * @param {Object} activityData - Activity data
     * @param {Object} participantData - Participant data
     * @returns {Object} Rewards calculation
     */
    _calculateActivityRewards(instance, activityData, participantData) {
        const baseRewards = activityData.benefits.participants;
        const participantCount = participantData.participants.size;

        // Calculate participation bonus (more participants = better rewards)
        const participationBonus = Math.min(1.5, 1 + (participantCount - activityData.requirements.minParticipants) * 0.1);

        // Calculate sect type bonus
        const sect = this.sectSystem.sectRegistry.get(instance.sectId);
        const sectTypeData = window.SECT_TYPES[sect.type];
        const sectBonus = this._getSectActivityBonus(sectTypeData, instance.activityId);

        const rewards = {};
        let totalValue = 0;

        for (const [rewardType, baseAmount] of Object.entries(baseRewards)) {
            const finalAmount = Math.floor(baseAmount * participationBonus * sectBonus);
            rewards[rewardType] = finalAmount;
            totalValue += finalAmount;
        }

        return {
            ...rewards,
            totalValue: totalValue,
            participationBonus: participationBonus,
            sectBonus: sectBonus
        };
    }

    /**
     * Distribute rewards to participants
     * @param {Object} rewards - Rewards to distribute
     * @param {Set} participants - Participant set
     */
    async _distributeRewards(rewards, participants) {
        // For single player, just check if player participated
        if (participants.has(this._getPlayerId())) {
            this._awardRewards(rewards);
        }
    }

    /**
     * Award rewards to player
     * @param {Object} rewards - Rewards to award
     */
    _awardRewards(rewards) {
        for (const [rewardType, amount] of Object.entries(rewards)) {
            if (rewardType === 'totalValue' || rewardType === 'participationBonus' || rewardType === 'sectBonus') {
                continue; // Skip metadata
            }

            switch (rewardType) {
                case 'qiGainMultiplier':
                    // Apply temporary cultivation bonus
                    this._applyTemporaryBonus('qi_gain', amount, 60 * 60 * 1000); // 1 hour
                    break;
                case 'cultivationSpeedBonus':
                    this._applyTemporaryBonus('cultivation_speed', amount, 2 * 60 * 60 * 1000); // 2 hours
                    break;
                case 'harmonyPoints':
                case 'knowledgePoints':
                case 'teamworkPoints':
                case 'coordinationPoints':
                    // Award to player stats (could create new stat categories)
                    this.gameState.increment(`player.${rewardType}`, amount);
                    break;
                case 'techniqueXpGain':
                    // Award technique experience
                    this.eventManager.emit('technique:awardExperience', {
                        amount: amount,
                        source: 'sect_activity'
                    });
                    break;
                case 'combatXpGain':
                    // Award combat experience
                    this.eventManager.emit('combat:awardExperience', {
                        amount: amount,
                        source: 'sect_activity'
                    });
                    break;
                default:
                    // Default to player resource
                    this.gameState.increment(`player.${rewardType}`, amount);
                    break;
            }
        }
    }

    /**
     * Apply sect benefits
     * @param {Object} sect - Sect object
     * @param {Object} benefits - Sect benefits
     * @param {number} participantCount - Number of participants
     */
    _applySectBenefits(sect, benefits, participantCount) {
        if (!benefits) return;

        for (const [benefitType, baseAmount] of Object.entries(benefits)) {
            const scaledAmount = Math.floor(baseAmount * Math.sqrt(participantCount));

            switch (benefitType) {
                case 'cohesionIncrease':
                    sect.cohesion = (sect.cohesion || 0) + scaledAmount;
                    break;
                case 'prestigeGain':
                    sect.prestige = (sect.prestige || 0) + scaledAmount;
                    break;
                case 'knowledgePool':
                    sect.knowledgePool = (sect.knowledgePool || 0) + scaledAmount;
                    break;
                case 'resourceStockpile':
                    sect.treasury.jade = (sect.treasury.jade || 0) + scaledAmount;
                    break;
                case 'militaryStrength':
                    sect.militaryStrength = (sect.militaryStrength || 0) + scaledAmount;
                    break;
                default:
                    // Store in sect stats
                    if (!sect.stats) sect.stats = {};
                    sect.stats[benefitType] = (sect.stats[benefitType] || 0) + scaledAmount;
                    break;
            }
        }
    }

    /**
     * Apply temporary bonus to player
     * @param {string} bonusType - Type of bonus
     * @param {number} amount - Bonus amount
     * @param {number} duration - Duration in milliseconds
     */
    _applyTemporaryBonus(bonusType, amount, duration) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        const bonusId = `activity_${bonusType}_${Date.now()}`;
        currentSect.activeBuffs = currentSect.activeBuffs || new Map();

        currentSect.activeBuffs.set(bonusId, {
            type: bonusType,
            value: amount,
            source: 'sect_activity',
            startTime: Date.now(),
            endTime: Date.now() + duration
        });

        // Emit bonus event
        this.eventManager.emit('sectActivity:bonusApplied', {
            bonusId: bonusId,
            type: bonusType,
            value: amount,
            duration: duration
        });
    }

    /**
     * Get sect activity bonus for specific activities
     * @param {Object} sectTypeData - Sect type data
     * @param {string} activityId - Activity ID
     * @returns {number} Bonus multiplier
     */
    _getSectActivityBonus(sectTypeData, activityId) {
        if (!sectTypeData || !sectTypeData.specialties) {
            return 1.0;
        }

        // Check if activity aligns with sect specialties
        const activitySpecialties = {
            group_meditation: 'balanced_cultivation',
            technique_sharing: 'technique_research',
            resource_gathering: 'resource_gathering',
            formation_training: 'combat_prowess',
            sect_tournament: 'combat_prowess'
        };

        const activitySpecialty = activitySpecialties[activityId];
        if (activitySpecialty && sectTypeData.specialties.includes(activitySpecialty)) {
            return 1.3; // 30% bonus for specialized activities
        }

        return 1.0;
    }

    /**
     * Calculate partial rewards for leaving early
     * @param {Object} instance - Activity instance
     * @param {string} playerId - Player ID
     * @param {Object} participantData - Participant data
     * @returns {Object|null} Partial rewards
     */
    _calculatePartialRewards(instance, playerId, participantData) {
        const contribution = participantData.contributions.get(playerId);
        if (!contribution) return null;

        const timeParticipated = Date.now() - contribution.joinedAt;
        const participationRatio = Math.min(1.0, timeParticipated / instance.duration);

        // Only award partial rewards if participated for at least 25% of duration
        if (participationRatio < 0.25) {
            return null;
        }

        const activityData = this.activityData[instance.activityId];
        const baseRewards = activityData.benefits.participants;
        const partialRewards = {};

        for (const [rewardType, baseAmount] of Object.entries(baseRewards)) {
            partialRewards[rewardType] = Math.floor(baseAmount * participationRatio * 0.5); // 50% penalty for early leave
        }

        return partialRewards;
    }

    /**
     * Calculate activity progress
     * @param {Object} instance - Activity instance
     * @returns {number} Progress percentage (0-100)
     */
    _calculateActivityProgress(instance) {
        const elapsed = Date.now() - instance.startTime;
        const progress = Math.min(100, (elapsed / instance.duration) * 100);
        return Math.floor(progress);
    }

    /**
     * Update activity progress
     */
    _updateActivityProgress() {
        // Could update visual progress, apply incremental benefits, etc.
        // For now, just maintain the activity states
    }

    /**
     * Clean up old data
     */
    _cleanupOldData() {
        const now = Date.now();
        const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

        // Clean up completed activity cache
        for (const [key, data] of this.resultsCache) {
            if (now - data.timestamp > this.cacheTimeout) {
                this.resultsCache.delete(key);
            }
        }

        // Clean up old cooldowns
        for (const [key, timestamp] of this.activityState.cooldowns) {
            if (now - timestamp > cleanupThreshold) {
                this.activityState.cooldowns.delete(key);
            }
        }
    }

    /**
     * Handle cultivation progress during activities
     * @param {Object} data - Event data
     */
    _onCultivationProgress(data) {
        // Could apply activity bonuses to cultivation
        // Will integrate with cultivation system bonuses
    }

    /**
     * Handle member joined sect
     * @param {Object} data - Event data
     */
    _onMemberJoined(data) {
        // Could send welcome message about available activities
    }

    /**
     * Handle member left sect
     * @param {Object} data - Event data
     */
    _onMemberLeft(data) {
        // Remove from all active activities
        const memberId = data.member.id;

        for (const [instanceId, participantData] of this.activityState.participantData) {
            if (participantData.participants.has(memberId)) {
                participantData.participants.delete(memberId);
                participantData.contributions.delete(memberId);

                // Update instance participant count
                const instance = this.activityState.activeActivities.get(instanceId);
                if (instance) {
                    instance.currentParticipants = participantData.participants.size;

                    // Check if activity should be canceled
                    const activityData = this.activityData[instance.activityId];
                    if (participantData.participants.size < activityData.requirements.minParticipants) {
                        this._cancelActivity(instanceId, 'Member left, insufficient participants');
                    }
                }
            }
        }
    }

    /**
     * Get player ID
     * @returns {string} Player ID
     */
    _getPlayerId() {
        return 'player'; // In multiplayer, this would be unique
    }

    /**
     * Get player info
     * @returns {Object} Player info
     */
    _getPlayerInfo() {
        return {
            id: 'player',
            name: 'Player'
        };
    }

    /**
     * Format time duration
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted time
     */
    _formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Save current state
     */
    _saveState() {
        this.gameState.update({
            sectActivities: {
                activeActivities: Array.from(this.activityState.activeActivities.entries()),
                scheduledActivities: Array.from(this.activityState.scheduledActivities.entries()),
                participantData: Array.from(this.activityState.participantData.entries()),
                cooldowns: Array.from(this.activityState.cooldowns.entries())
            },
            sectActivityMetrics: this.activityMetrics
        }, { source: 'SectActivities' });
    }

    /**
     * Create error result
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @returns {Object} Error result
     */
    _error(message, code) {
        return {
            success: false,
            error: message,
            code: code
        };
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectActivities };
} else if (typeof window !== 'undefined') {
    window.SectActivities = SectActivities;
}