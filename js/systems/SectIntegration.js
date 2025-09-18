/**
 * SectIntegration - Coordination and integration hub for all sect systems
 * Manages interaction between sect components and other game systems
 */
class SectIntegration {
    constructor() {
        // Core references
        this.gameState = null;
        this.eventManager = null;
        this.saveManager = null;

        // Sect system components
        this.sectSystem = null;
        this.sectManager = null;
        this.sectActivities = null;
        this.sectCompetition = null;

        // Other game systems
        this.cultivationSystem = null;
        this.enhancementSystem = null;
        this.scriptureSystem = null;

        // Integration state
        this.integrationState = {
            activeIntegrations: new Set(),
            cultivationBonuses: new Map(),
            resourceFlows: new Map(),
            eventListeners: new Map(),
            crossSystemEffects: new Map()
        };

        // Performance tracking
        this.performanceMetrics = {
            bonusesApplied: 0,
            eventsProcessed: 0,
            systemInteractions: 0,
            integrationErrors: 0
        };

        this.isInitialized = false;
        this.updateInterval = 10000; // 10 seconds
        this.lastUpdate = Date.now();

        console.log('SectIntegration: Initialized');
    }

    /**
     * Initialize the integration system with all dependencies
     * @param {Object} dependencies - All system dependencies
     */
    async initialize(dependencies) {
        try {
            // Set core references
            this.gameState = dependencies.gameState;
            this.eventManager = dependencies.eventManager;
            this.saveManager = dependencies.saveManager;

            // Set sect system references
            this.sectSystem = dependencies.sectSystem;
            this.sectManager = dependencies.sectManager;
            this.sectActivities = dependencies.sectActivities;
            this.sectCompetition = dependencies.sectCompetition;

            // Set other game system references
            this.cultivationSystem = dependencies.cultivationSystem;
            this.enhancementSystem = dependencies.enhancementSystem;
            this.scriptureSystem = dependencies.scriptureSystem;

            // Validate dependencies
            if (!this._validateDependencies()) {
                throw new Error('Missing required dependencies');
            }

            // Load integration state
            const savedState = this.gameState.get('sectIntegration');
            if (savedState) {
                this.integrationState = {
                    ...this.integrationState,
                    activeIntegrations: new Set(savedState.activeIntegrations || []),
                    cultivationBonuses: new Map(savedState.cultivationBonuses || []),
                    resourceFlows: new Map(savedState.resourceFlows || []),
                    crossSystemEffects: new Map(savedState.crossSystemEffects || [])
                };
            }

            // Load performance metrics
            const savedMetrics = this.gameState.get('integrationMetrics');
            if (savedMetrics) {
                this.performanceMetrics = { ...this.performanceMetrics, ...savedMetrics };
            }

            // Set up comprehensive event system
            this._setupIntegrationEvents();

            // Initialize cross-system integrations
            this._initializeCultivationIntegration();
            this._initializeEnhancementIntegration();
            this._initializeScriptureIntegration();
            this._initializeResourceIntegration();

            this.isInitialized = true;

            // Emit integration ready event
            this.eventManager.emit('sectIntegration:initialized', {
                activeIntegrations: Array.from(this.integrationState.activeIntegrations),
                systemsConnected: this._getConnectedSystems()
            });

            console.log('SectIntegration: Initialization complete');
            return true;

        } catch (error) {
            console.error('SectIntegration: Initialization failed:', error);
            this.performanceMetrics.integrationErrors++;
            return false;
        }
    }

    /**
     * Apply sect bonuses to cultivation system
     * @param {string} bonusType - Type of bonus to apply
     * @param {number} value - Bonus value
     * @param {Object} options - Bonus options
     */
    applyCultivationBonus(bonusType, value, options = {}) {
        try {
            if (!this.cultivationSystem || !this.sectSystem.getCurrentSect()) {
                return;
            }

            const bonusId = `sect_${bonusType}_${Date.now()}`;
            const bonus = {
                id: bonusId,
                type: bonusType,
                value: value,
                source: 'sect',
                appliedAt: Date.now(),
                duration: options.duration || Infinity,
                stackable: options.stackable || false,
                conditions: options.conditions || {}
            };

            // Store bonus in integration state
            this.integrationState.cultivationBonuses.set(bonusId, bonus);

            // Apply to cultivation system if it supports bonus application
            if (this.cultivationSystem.applyBonus) {
                this.cultivationSystem.applyBonus(bonus);
            }

            // Track performance
            this.performanceMetrics.bonusesApplied++;
            this.performanceMetrics.systemInteractions++;

            // Emit bonus application event
            this.eventManager.emit('sectIntegration:bonusApplied', {
                bonusId: bonusId,
                bonus: bonus,
                targetSystem: 'cultivation'
            });

            console.log(`SectIntegration: Applied cultivation bonus ${bonusType} (${value})`);

        } catch (error) {
            console.error('SectIntegration: Apply cultivation bonus failed:', error);
            this.performanceMetrics.integrationErrors++;
        }
    }

    /**
     * Remove expired or completed bonuses
     * @param {string} bonusId - Bonus ID to remove
     */
    removeCultivationBonus(bonusId) {
        try {
            const bonus = this.integrationState.cultivationBonuses.get(bonusId);
            if (!bonus) return;

            // Remove from cultivation system
            if (this.cultivationSystem.removeBonus) {
                this.cultivationSystem.removeBonus(bonusId);
            }

            // Remove from integration state
            this.integrationState.cultivationBonuses.delete(bonusId);

            // Emit bonus removal event
            this.eventManager.emit('sectIntegration:bonusRemoved', {
                bonusId: bonusId,
                bonus: bonus,
                targetSystem: 'cultivation'
            });

            console.log(`SectIntegration: Removed cultivation bonus ${bonusId}`);

        } catch (error) {
            console.error('SectIntegration: Remove cultivation bonus failed:', error);
            this.performanceMetrics.integrationErrors++;
        }
    }

    /**
     * Handle sect contribution to player progression
     * @param {Object} contributionData - Contribution details
     */
    processSectContribution(contributionData) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) return;

            const { type, amount, target } = contributionData;

            switch (type) {
                case 'cultivation_experience':
                    this._awardCultivationExperience(amount, target);
                    break;

                case 'enhancement_materials':
                    this._awardEnhancementMaterials(amount, target);
                    break;

                case 'scripture_fragments':
                    this._awardScriptureFragments(amount, target);
                    break;

                case 'prestige_points':
                    this._awardPrestige(amount);
                    break;

                default:
                    console.warn(`SectIntegration: Unknown contribution type: ${type}`);
                    break;
            }

            // Track performance
            this.performanceMetrics.systemInteractions++;

        } catch (error) {
            console.error('SectIntegration: Process sect contribution failed:', error);
            this.performanceMetrics.integrationErrors++;
        }
    }

    /**
     * Calculate combined bonuses from sect membership
     * @returns {Object} Combined bonuses
     */
    calculateSectBonuses() {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return { cultivation: {}, enhancement: {}, scripture: {}, resources: {} };
            }

            const bonuses = {
                cultivation: {},
                enhancement: {},
                scripture: {},
                resources: {}
            };

            // Role-based bonuses
            const roleData = window.SECT_ROLES?.[currentSect.playerRole];
            if (roleData && roleData.benefits) {
                this._addRoleBonuses(bonuses, roleData.benefits);
            }

            // Sect type bonuses
            const sectTypeData = window.SECT_TYPES?.[currentSect.type];
            if (sectTypeData && sectTypeData.bonuses) {
                this._addSectTypeBonuses(bonuses, sectTypeData.bonuses);
            }

            // Facility bonuses
            if (currentSect.facilities) {
                for (const facility of currentSect.facilities.values()) {
                    if (facility.benefits) {
                        this._addFacilityBonuses(bonuses, facility.benefits, facility.level);
                    }
                }
            }

            // Activity bonuses (temporary)
            if (currentSect.activeBuffs) {
                for (const buff of currentSect.activeBuffs.values()) {
                    if (this._isBuffActive(buff)) {
                        this._addActivityBonuses(bonuses, buff);
                    }
                }
            }

            // Diplomatic bonuses
            this._addDiplomaticBonuses(bonuses, currentSect.id);

            return bonuses;

        } catch (error) {
            console.error('SectIntegration: Calculate sect bonuses failed:', error);
            this.performanceMetrics.integrationErrors++;
            return { cultivation: {}, enhancement: {}, scripture: {}, resources: {} };
        }
    }

    /**
     * Sync sect data with game state
     */
    syncSectData() {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                // Clear sect data if no current sect
                this.gameState.update({
                    sect: {
                        id: null,
                        name: null,
                        contribution: 0,
                        buffs: [],
                        lastDonation: 0
                    }
                }, { source: 'SectIntegration' });
                return;
            }

            // Update basic sect info in game state
            this.gameState.update({
                sect: {
                    id: currentSect.id,
                    name: currentSect.name,
                    type: currentSect.type,
                    role: currentSect.playerRole,
                    contribution: currentSect.playerContribution || 0,
                    joinDate: currentSect.joinDate,
                    prestige: currentSect.prestige || 0,
                    memberCount: currentSect.memberCount,
                    buffs: this._getActiveSectBuffs(),
                    lastActivity: Date.now()
                }
            }, { source: 'SectIntegration' });

            // Update sect-derived stats
            this._updateDerivedStats(currentSect);

        } catch (error) {
            console.error('SectIntegration: Sync sect data failed:', error);
            this.performanceMetrics.integrationErrors++;
        }
    }

    /**
     * Handle system events and route them appropriately
     * @param {string} eventType - Event type
     * @param {Object} eventData - Event data
     */
    handleCrossSystemEvent(eventType, eventData) {
        try {
            this.performanceMetrics.eventsProcessed++;

            switch (eventType) {
                case 'cultivation:experienceGained':
                    this._onCultivationProgress(eventData);
                    break;

                case 'cultivation:breakthrough':
                    this._onCultivationBreakthrough(eventData);
                    break;

                case 'enhancement:success':
                    this._onEnhancementSuccess(eventData);
                    break;

                case 'scripture:acquired':
                    this._onScriptureAcquired(eventData);
                    break;

                case 'gacha:pull':
                    this._onGachaPull(eventData);
                    break;

                case 'combat:victory':
                    this._onCombatVictory(eventData);
                    break;

                default:
                    // Log unknown events for debugging
                    console.debug(`SectIntegration: Unhandled event ${eventType}`);
                    break;
            }

        } catch (error) {
            console.error(`SectIntegration: Handle event ${eventType} failed:`, error);
            this.performanceMetrics.integrationErrors++;
        }
    }

    /**
     * Update sect integration (called by game loop)
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
            // Update active bonuses
            this._updateActiveBonuses();

            // Process resource flows
            this._processResourceFlows();

            // Sync sect data
            this.syncSectData();

            // Clean up expired effects
            this._cleanupExpiredEffects();

            // Update performance metrics
            this._updatePerformanceMetrics();

            this.lastUpdate = now;

        } catch (error) {
            console.error('SectIntegration: Update failed:', error);
            this.performanceMetrics.integrationErrors++;
        }
    }

    // Private methods

    /**
     * Validate that all required dependencies are present
     * @returns {boolean} Dependencies valid
     */
    _validateDependencies() {
        const required = ['gameState', 'eventManager', 'sectSystem'];

        for (const dep of required) {
            if (!this[dep]) {
                console.error(`SectIntegration: Missing required dependency: ${dep}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Set up comprehensive event integration
     */
    _setupIntegrationEvents() {
        // Listen to cultivation events
        this.eventManager.on('cultivation:experienceGained', (data) => {
            this.handleCrossSystemEvent('cultivation:experienceGained', data);
        });

        this.eventManager.on('realm:breakthrough', (data) => {
            this.handleCrossSystemEvent('cultivation:breakthrough', data);
        });

        // Listen to enhancement events
        this.eventManager.on('enhancement:success', (data) => {
            this.handleCrossSystemEvent('enhancement:success', data);
        });

        // Listen to scripture events
        this.eventManager.on('scripture:acquired', (data) => {
            this.handleCrossSystemEvent('scripture:acquired', data);
        });

        // Listen to gacha events
        this.eventManager.on('gacha:pull', (data) => {
            this.handleCrossSystemEvent('gacha:pull', data);
        });

        // Listen to sect-specific events
        this.eventManager.on('sect:memberJoined', (data) => {
            this._onSectMembershipChange(data, 'joined');
        });

        this.eventManager.on('sect:memberLeft', (data) => {
            this._onSectMembershipChange(data, 'left');
        });

        this.eventManager.on('sectActivity:completed', (data) => {
            this._onSectActivityCompleted(data);
        });

        this.eventManager.on('sectWar:completed', (data) => {
            this._onSectWarCompleted(data);
        });

        console.log('SectIntegration: Event listeners established');
    }

    /**
     * Initialize cultivation system integration
     */
    _initializeCultivationIntegration() {
        if (!this.cultivationSystem) {
            console.warn('SectIntegration: Cultivation system not available');
            return;
        }

        this.integrationState.activeIntegrations.add('cultivation');

        // Apply initial sect bonuses to cultivation
        const bonuses = this.calculateSectBonuses();
        if (bonuses.cultivation) {
            for (const [bonusType, value] of Object.entries(bonuses.cultivation)) {
                if (value > 0) {
                    this.applyCultivationBonus(bonusType, value, { duration: Infinity });
                }
            }
        }

        console.log('SectIntegration: Cultivation integration initialized');
    }

    /**
     * Initialize enhancement system integration
     */
    _initializeEnhancementIntegration() {
        if (!this.enhancementSystem) {
            console.warn('SectIntegration: Enhancement system not available');
            return;
        }

        this.integrationState.activeIntegrations.add('enhancement');
        console.log('SectIntegration: Enhancement integration initialized');
    }

    /**
     * Initialize scripture system integration
     */
    _initializeScriptureIntegration() {
        if (!this.scriptureSystem) {
            console.warn('SectIntegration: Scripture system not available');
            return;
        }

        this.integrationState.activeIntegrations.add('scripture');
        console.log('SectIntegration: Scripture integration initialized');
    }

    /**
     * Initialize resource flow integration
     */
    _initializeResourceIntegration() {
        this.integrationState.activeIntegrations.add('resources');

        // Set up automatic resource flows between player and sect
        this._setupResourceFlows();

        console.log('SectIntegration: Resource integration initialized');
    }

    /**
     * Set up resource flows
     */
    _setupResourceFlows() {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Set up contribution-based resource sharing
        const flowId = 'sect_resource_sharing';
        this.integrationState.resourceFlows.set(flowId, {
            id: flowId,
            type: 'bidirectional',
            source: 'player',
            target: 'sect',
            rate: 0.01, // 1% of resources per hour
            conditions: {
                minContribution: 100,
                roleLevel: 2
            },
            active: true
        });
    }

    /**
     * Add role-based bonuses
     * @param {Object} bonuses - Bonuses object to modify
     * @param {Object} roleBenefits - Role benefits
     */
    _addRoleBonuses(bonuses, roleBenefits) {
        if (roleBenefits.cultivationBonus) {
            bonuses.cultivation.speedMultiplier = (bonuses.cultivation.speedMultiplier || 1) + roleBenefits.cultivationBonus;
        }

        if (roleBenefits.contributionMultiplier) {
            bonuses.resources.contributionMultiplier = roleBenefits.contributionMultiplier;
        }

        if (roleBenefits.resourceSharing) {
            bonuses.resources.sharingBonus = roleBenefits.resourceSharing;
        }
    }

    /**
     * Add sect type bonuses
     * @param {Object} bonuses - Bonuses object to modify
     * @param {Object} sectBonuses - Sect type bonuses
     */
    _addSectTypeBonuses(bonuses, sectBonuses) {
        if (sectBonuses.cultivationSpeed) {
            bonuses.cultivation.speedMultiplier = (bonuses.cultivation.speedMultiplier || 1) + sectBonuses.cultivationSpeed;
        }

        if (sectBonuses.techniqueEfficiency) {
            bonuses.enhancement.techniqueBonus = sectBonuses.techniqueEfficiency;
        }

        if (sectBonuses.resourceGeneration) {
            bonuses.resources.generationBonus = sectBonuses.resourceGeneration;
        }

        if (sectBonuses.combatPower) {
            bonuses.cultivation.combatBonus = sectBonuses.combatPower;
        }
    }

    /**
     * Add facility bonuses
     * @param {Object} bonuses - Bonuses object to modify
     * @param {Object} facilityBenefits - Facility benefits
     * @param {number} level - Facility level
     */
    _addFacilityBonuses(bonuses, facilityBenefits, level = 1) {
        const levelMultiplier = 1 + (level - 1) * 0.1; // 10% bonus per level

        if (facilityBenefits.cultivationSpeedBonus) {
            const bonus = facilityBenefits.cultivationSpeedBonus * levelMultiplier;
            bonuses.cultivation.speedMultiplier = (bonuses.cultivation.speedMultiplier || 1) + bonus;
        }

        if (facilityBenefits.techniqueEfficiency) {
            const bonus = facilityBenefits.techniqueEfficiency * levelMultiplier;
            bonuses.enhancement.techniqueBonus = (bonuses.enhancement.techniqueBonus || 0) + bonus;
        }

        if (facilityBenefits.breakthroughChance) {
            const bonus = facilityBenefits.breakthroughChance * levelMultiplier;
            bonuses.cultivation.breakthroughBonus = (bonuses.cultivation.breakthroughBonus || 0) + bonus;
        }
    }

    /**
     * Add activity-based bonuses
     * @param {Object} bonuses - Bonuses object to modify
     * @param {Object} buff - Activity buff
     */
    _addActivityBonuses(bonuses, buff) {
        switch (buff.type) {
            case 'qi_gain':
                bonuses.cultivation.qiGainMultiplier = (bonuses.cultivation.qiGainMultiplier || 1) + buff.value;
                break;
            case 'cultivation_speed':
                bonuses.cultivation.speedMultiplier = (bonuses.cultivation.speedMultiplier || 1) + buff.value;
                break;
            case 'enhancement_success':
                bonuses.enhancement.successBonus = (bonuses.enhancement.successBonus || 0) + buff.value;
                break;
        }
    }

    /**
     * Add diplomatic bonuses
     * @param {Object} bonuses - Bonuses object to modify
     * @param {string} sectId - Sect ID
     */
    _addDiplomaticBonuses(bonuses, sectId) {
        if (!this.sectCompetition) return;

        // Get diplomatic relations and apply bonuses
        // This would be expanded based on alliance benefits, etc.
    }

    /**
     * Check if buff is still active
     * @param {Object} buff - Buff object
     * @returns {boolean} Is active
     */
    _isBuffActive(buff) {
        return buff.endTime > Date.now();
    }

    /**
     * Award cultivation experience
     * @param {number} amount - Experience amount
     * @param {string} target - Target cultivation type
     */
    _awardCultivationExperience(amount, target = 'qi') {
        if (!this.cultivationSystem) return;

        this.eventManager.emit('cultivation:awardExperience', {
            amount: amount,
            type: target,
            source: 'sect_contribution'
        });
    }

    /**
     * Award enhancement materials
     * @param {Object} materials - Materials to award
     * @param {string} target - Target material type
     */
    _awardEnhancementMaterials(materials, target) {
        for (const [material, amount] of Object.entries(materials)) {
            this.gameState.increment(`enhancementMaterials.${material}`, amount);
        }
    }

    /**
     * Award scripture fragments
     * @param {number} amount - Fragment amount
     * @param {string} target - Target scripture type
     */
    _awardScriptureFragments(amount, target) {
        this.gameState.increment('player.scriptureFragments', amount);
    }

    /**
     * Award prestige points
     * @param {number} amount - Prestige amount
     */
    _awardPrestige(amount) {
        this.gameState.increment('player.prestige', amount);
    }

    /**
     * Get active sect buffs
     * @returns {Array} Active buffs
     */
    _getActiveSectBuffs() {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect || !currentSect.activeBuffs) {
            return [];
        }

        const activeBuffs = [];
        for (const [buffId, buff] of currentSect.activeBuffs) {
            if (this._isBuffActive(buff)) {
                activeBuffs.push({
                    id: buffId,
                    type: buff.type,
                    value: buff.value,
                    timeRemaining: buff.endTime - Date.now()
                });
            }
        }

        return activeBuffs;
    }

    /**
     * Update derived stats based on sect membership
     * @param {Object} sect - Current sect
     */
    _updateDerivedStats(sect) {
        // Update player stats that derive from sect membership
        const bonuses = this.calculateSectBonuses();

        // Update cultivation rate modifiers
        if (bonuses.cultivation.speedMultiplier) {
            this.gameState.set('cultivation.sectSpeedBonus', bonuses.cultivation.speedMultiplier - 1);
        }

        // Update resource generation bonuses
        if (bonuses.resources.generationBonus) {
            this.gameState.set('player.sectResourceBonus', bonuses.resources.generationBonus);
        }
    }

    /**
     * Update active bonuses
     */
    _updateActiveBonuses() {
        const now = Date.now();
        const expiredBonuses = [];

        // Check cultivation bonuses for expiration
        for (const [bonusId, bonus] of this.integrationState.cultivationBonuses) {
            if (bonus.duration !== Infinity && now >= (bonus.appliedAt + bonus.duration)) {
                expiredBonuses.push(bonusId);
            }
        }

        // Remove expired bonuses
        for (const bonusId of expiredBonuses) {
            this.removeCultivationBonus(bonusId);
        }
    }

    /**
     * Process resource flows
     */
    _processResourceFlows() {
        const now = Date.now();
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        for (const [flowId, flow] of this.integrationState.resourceFlows) {
            if (!flow.active) continue;

            // Check conditions
            if (!this._checkResourceFlowConditions(flow)) continue;

            // Calculate flow amount (per hour, adjusted for update interval)
            const hourlyRate = flow.rate;
            const updateRate = this.updateInterval / (60 * 60 * 1000); // Convert to hours
            const flowAmount = hourlyRate * updateRate;

            // Apply flow
            this._applyResourceFlow(flow, flowAmount);
        }
    }

    /**
     * Check resource flow conditions
     * @param {Object} flow - Resource flow
     * @returns {boolean} Conditions met
     */
    _checkResourceFlowConditions(flow) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return false;

        if (flow.conditions.minContribution && currentSect.playerContribution < flow.conditions.minContribution) {
            return false;
        }

        if (flow.conditions.roleLevel) {
            const roleData = window.SECT_ROLES[currentSect.playerRole];
            if (!roleData || roleData.level < flow.conditions.roleLevel) {
                return false;
            }
        }

        return true;
    }

    /**
     * Apply resource flow
     * @param {Object} flow - Resource flow
     * @param {number} amount - Flow amount
     */
    _applyResourceFlow(flow, amount) {
        // This would implement actual resource transfer
        // For now, just track that flows are happening
        this.performanceMetrics.systemInteractions++;
    }

    /**
     * Clean up expired effects
     */
    _cleanupExpiredEffects() {
        const now = Date.now();
        const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

        // Clean up old cross-system effects
        for (const [effectId, effect] of this.integrationState.crossSystemEffects) {
            if (now - effect.createdAt > cleanupThreshold) {
                this.integrationState.crossSystemEffects.delete(effectId);
            }
        }
    }

    /**
     * Update performance metrics
     */
    _updatePerformanceMetrics() {
        // Calculate average events per minute
        this.performanceMetrics.averageEventsPerMinute =
            this.performanceMetrics.eventsProcessed / ((Date.now() - this.performanceMetrics.startTime) / 60000);

        // Save metrics
        this.gameState.update({
            integrationMetrics: this.performanceMetrics
        }, { source: 'SectIntegration' });
    }

    /**
     * Get list of connected systems
     * @returns {Array} Connected systems
     */
    _getConnectedSystems() {
        const systems = [];

        if (this.cultivationSystem) systems.push('cultivation');
        if (this.enhancementSystem) systems.push('enhancement');
        if (this.scriptureSystem) systems.push('scripture');
        if (this.sectSystem) systems.push('sect');
        if (this.sectManager) systems.push('sectManager');
        if (this.sectActivities) systems.push('sectActivities');
        if (this.sectCompetition) systems.push('sectCompetition');

        return systems;
    }

    /**
     * Event handlers for cross-system integration
     */

    _onCultivationProgress(data) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Award sect contribution for cultivation progress
        const contributionGain = Math.floor(data.amount * 0.1); // 10% of experience as contribution
        if (contributionGain > 0) {
            this.sectSystem.sectState.playerContribution += contributionGain;

            this.eventManager.emit('sect:contributionGained', {
                amount: contributionGain,
                source: 'cultivation_progress',
                totalContribution: this.sectSystem.sectState.playerContribution
            });
        }
    }

    _onCultivationBreakthrough(data) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Major contribution for breakthroughs
        const contributionGain = 500 * data.newRealm.level;
        this.sectSystem.sectState.playerContribution += contributionGain;

        // Award sect prestige
        currentSect.prestige = (currentSect.prestige || 0) + 50;

        this.eventManager.emit('sect:memberBreakthrough', {
            member: this._getPlayerInfo(),
            realm: data.newRealm,
            contributionGain: contributionGain,
            prestigeGain: 50
        });
    }

    _onEnhancementSuccess(data) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Small contribution for successful enhancements
        const contributionGain = 10 * (data.level || 1);
        this.sectSystem.sectState.playerContribution += contributionGain;
    }

    _onScriptureAcquired(data) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Contribution based on scripture rarity
        const rarityContribution = {
            common: 5,
            uncommon: 15,
            rare: 50,
            epic: 150,
            legendary: 500
        };

        const contributionGain = rarityContribution[data.rarity] || 5;
        this.sectSystem.sectState.playerContribution += contributionGain;
    }

    _onGachaPull(data) {
        // Could award contribution for gacha activity
    }

    _onCombatVictory(data) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Award contribution for combat victories
        const contributionGain = 25;
        this.sectSystem.sectState.playerContribution += contributionGain;
    }

    _onSectMembershipChange(data, changeType) {
        if (changeType === 'joined') {
            // Reinitialize integrations when joining a sect
            this._initializeCultivationIntegration();
            this.syncSectData();
        } else if (changeType === 'left') {
            // Clean up sect bonuses when leaving
            this._clearAllSectBonuses();
            this.syncSectData();
        }
    }

    _onSectActivityCompleted(data) {
        // Process activity completion benefits
        if (data.rewards) {
            this.processSectContribution({
                type: 'cultivation_experience',
                amount: data.rewards.experienceGain || 0,
                target: 'qi'
            });
        }
    }

    _onSectWarCompleted(data) {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) return;

        // Award massive contribution for war participation
        const contributionGain = 1000;
        this.sectSystem.sectState.playerContribution += contributionGain;

        // Additional rewards for victory
        if (data.winner && data.winner.id === currentSect.id) {
            const victoryBonus = 2000;
            this.sectSystem.sectState.playerContribution += victoryBonus;
        }
    }

    /**
     * Clear all sect bonuses
     */
    _clearAllSectBonuses() {
        // Remove all cultivation bonuses
        for (const bonusId of this.integrationState.cultivationBonuses.keys()) {
            this.removeCultivationBonus(bonusId);
        }

        // Clear other system bonuses
        this.integrationState.crossSystemEffects.clear();
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
     * Save current state
     */
    _saveState() {
        this.gameState.update({
            sectIntegration: {
                activeIntegrations: Array.from(this.integrationState.activeIntegrations),
                cultivationBonuses: Array.from(this.integrationState.cultivationBonuses.entries()),
                resourceFlows: Array.from(this.integrationState.resourceFlows.entries()),
                crossSystemEffects: Array.from(this.integrationState.crossSystemEffects.entries())
            }
        }, { source: 'SectIntegration' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectIntegration };
} else if (typeof window !== 'undefined') {
    window.SectIntegration = SectIntegration;
}