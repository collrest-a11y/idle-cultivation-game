/**
 * SectSystem - Core sect mechanics and functionality
 * Handles sect creation, membership, hierarchy, and basic operations
 */
class SectSystem {
    constructor(gameState, eventManager, saveManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.saveManager = saveManager;

        // Core sect state
        this.sectState = {
            currentSect: null,
            playerRole: null,
            playerContribution: 0,
            joinDate: null,
            lastActivity: Date.now()
        };

        // Global sect registry (for multiplayer or NPC sects)
        this.sectRegistry = new Map();
        this.nextSectId = 1;

        // Active sect buffs and modifiers
        this.activeBuffs = new Map();
        this.activePenalties = new Map();

        // Performance tracking
        this.lastUpdateTime = Date.now();
        this.updateInterval = 60000; // 1 minute

        // Statistics
        this.statistics = {
            sectsCreated: 0,
            sectsJoined: 0,
            sectionsLeft: 0,
            totalContribution: 0,
            activitiesParticipated: 0,
            leadershipTime: 0
        };

        this.isInitialized = false;
        this.isActive = false;

        console.log('SectSystem: Initialized');
    }

    /**
     * Initialize the sect system
     */
    async initialize() {
        try {
            // Load sect data from game state
            const savedSectState = this.gameState.get('sect');
            if (savedSectState) {
                this.sectState = { ...this.sectState, ...savedSectState };
            }

            // Load sect statistics
            const savedStats = this.gameState.get('sectStats');
            if (savedStats) {
                this.statistics = { ...this.statistics, ...savedStats };
            }

            // Load sect registry (for persistent sects)
            const savedRegistry = this.gameState.get('sectRegistry');
            if (savedRegistry) {
                this.sectRegistry = new Map(savedRegistry);
                this.nextSectId = Math.max(...Array.from(this.sectRegistry.keys()), 0) + 1;
            }

            // Set up event listeners
            this._setupEventListeners();

            // Initialize sect data if available
            if (window.SECT_ROLES && window.SECT_TYPES) {
                this.sectRoles = window.SECT_ROLES;
                this.sectTypes = window.SECT_TYPES;
                this.sectFacilities = window.SECT_FACILITIES;
                console.log('SectSystem: Loaded sect data definitions');
            } else {
                console.warn('SectSystem: Sect data not loaded, some features may be unavailable');
            }

            this.isInitialized = true;
            this.isActive = true;

            // Emit initialization event
            this.eventManager.emit('sectSystem:initialized', {
                hasCurrentSect: !!this.sectState.currentSect,
                playerRole: this.sectState.playerRole
            });

            console.log('SectSystem: Initialization complete');
            return true;

        } catch (error) {
            console.error('SectSystem: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Create a new sect
     * @param {Object} sectConfig - Sect configuration
     * @returns {Object} Creation result
     */
    async createSect(sectConfig) {
        try {
            const {
                name,
                description,
                type,
                emblem,
                policies = {},
                initialMembers = []
            } = sectConfig;

            // Validate sect creation
            const validation = this._validateSectCreation(sectConfig);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error,
                    code: 'VALIDATION_FAILED'
                };
            }

            // Check if player can afford sect creation
            const sectTypeData = this.sectTypes[type];
            const cost = sectTypeData.foundingCost;

            const canAfford = this._checkResourceRequirements(cost);
            if (!canAfford.valid) {
                return {
                    success: false,
                    error: `Insufficient resources: ${canAfford.missing.join(', ')}`,
                    code: 'INSUFFICIENT_RESOURCES'
                };
            }

            // Generate unique sect ID
            const sectId = this._generateSectId();

            // Create sect object
            const newSect = {
                id: sectId,
                name: name,
                description: description,
                type: type,
                emblem: emblem || this._getDefaultEmblem(type),
                founder: this._getPlayerInfo(),
                createdAt: Date.now(),

                // Membership
                members: new Map(),
                memberCount: 0,
                maxMembers: sectTypeData.maxMembers,

                // Resources and facilities
                treasury: {
                    jade: 0,
                    spiritCrystals: 0,
                    specialResources: {}
                },
                facilities: new Map(),
                territories: new Map(),

                // Progression and status
                level: 1,
                prestige: 0,
                reputation: { good: 0, evil: 0, neutral: 100 },

                // Activities and events
                activities: {
                    scheduled: [],
                    active: [],
                    history: []
                },

                // Policies and governance
                policies: {
                    recruitment: 'open', // open, invitation, closed
                    membershipFees: { jade: 0, spiritCrystals: 0 },
                    contributionRequirements: {},
                    disciplinaryRules: {},
                    ...policies
                },

                // Diplomacy
                relations: new Map(),
                alliances: new Set(),
                enemies: new Set(),

                // Statistics
                statistics: {
                    totalMembersEver: 0,
                    competitionsWon: 0,
                    competitionsLost: 0,
                    territoriesConquered: 0,
                    alliancesFormed: 0,
                    warsWon: 0,
                    totalContributions: 0
                }
            };

            // Deduct creation costs
            this._deductResources(cost);

            // Add founder as Sect Master
            this._addMemberToSect(newSect, this._getPlayerInfo(), 'sect_master');

            // Initialize required facilities
            this._initializeRequiredFacilities(newSect);

            // Register the sect
            this.sectRegistry.set(sectId, newSect);

            // Update player's sect status
            this.sectState.currentSect = sectId;
            this.sectState.playerRole = 'sect_master';
            this.sectState.playerContribution = 0;
            this.sectState.joinDate = Date.now();

            // Update statistics
            this.statistics.sectsCreated++;
            this.statistics.sectsJoined++;

            // Save state
            this._saveState();

            // Emit creation event
            this.eventManager.emit('sect:created', {
                sectId: sectId,
                sect: newSect,
                founder: this._getPlayerInfo()
            });

            console.log(`SectSystem: Created sect "${name}" (${sectId})`);

            return {
                success: true,
                sectId: sectId,
                sect: newSect,
                message: `Successfully created sect "${name}"`
            };

        } catch (error) {
            console.error('SectSystem: Sect creation failed:', error);
            return {
                success: false,
                error: error.message,
                code: 'CREATION_FAILED'
            };
        }
    }

    /**
     * Join an existing sect
     * @param {string} sectId - Sect ID to join
     * @param {string} applicationMessage - Optional application message
     * @returns {Object} Join result
     */
    async joinSect(sectId, applicationMessage = '') {
        try {
            // Check if player is already in a sect
            if (this.sectState.currentSect) {
                return {
                    success: false,
                    error: 'Already member of a sect. Leave current sect first.',
                    code: 'ALREADY_IN_SECT'
                };
            }

            // Get target sect
            const sect = this.sectRegistry.get(sectId);
            if (!sect) {
                return {
                    success: false,
                    error: 'Sect not found',
                    code: 'SECT_NOT_FOUND'
                };
            }

            // Check sect capacity
            if (sect.memberCount >= sect.maxMembers) {
                return {
                    success: false,
                    error: 'Sect is at maximum capacity',
                    code: 'SECT_FULL'
                };
            }

            // Check recruitment policy
            const canJoin = this._checkJoinEligibility(sect, this._getPlayerInfo());
            if (!canJoin.valid) {
                return {
                    success: false,
                    error: canJoin.reason,
                    code: 'JOIN_DENIED'
                };
            }

            // Determine starting role
            const startingRole = this._determineStartingRole(sect, this._getPlayerInfo());

            // Add player to sect
            this._addMemberToSect(sect, this._getPlayerInfo(), startingRole);

            // Update player's sect status
            this.sectState.currentSect = sectId;
            this.sectState.playerRole = startingRole;
            this.sectState.playerContribution = 0;
            this.sectState.joinDate = Date.now();

            // Pay membership fees if required
            if (sect.policies.membershipFees) {
                this._deductResources(sect.policies.membershipFees);
            }

            // Update statistics
            this.statistics.sectsJoined++;

            // Save state
            this._saveState();

            // Emit join event
            this.eventManager.emit('sect:memberJoined', {
                sectId: sectId,
                member: this._getPlayerInfo(),
                role: startingRole,
                applicationMessage: applicationMessage
            });

            console.log(`SectSystem: Joined sect ${sect.name} as ${startingRole}`);

            return {
                success: true,
                sect: sect,
                role: startingRole,
                message: `Successfully joined ${sect.name} as ${this.sectRoles[startingRole].name}`
            };

        } catch (error) {
            console.error('SectSystem: Join sect failed:', error);
            return {
                success: false,
                error: error.message,
                code: 'JOIN_FAILED'
            };
        }
    }

    /**
     * Leave current sect
     * @param {string} reason - Reason for leaving
     * @returns {Object} Leave result
     */
    async leaveSect(reason = '') {
        try {
            if (!this.sectState.currentSect) {
                return {
                    success: false,
                    error: 'Not a member of any sect',
                    code: 'NOT_IN_SECT'
                };
            }

            const sect = this.sectRegistry.get(this.sectState.currentSect);
            if (!sect) {
                // Clean up invalid sect reference
                this.sectState.currentSect = null;
                this.sectState.playerRole = null;
                this._saveState();

                return {
                    success: true,
                    message: 'Cleaned up invalid sect reference'
                };
            }

            const playerInfo = this._getPlayerInfo();
            const currentRole = this.sectState.playerRole;

            // Check if leaving would disband the sect
            const isFounder = sect.founder.id === playerInfo.id;
            const isSectMaster = currentRole === 'sect_master';

            if (isFounder && sect.memberCount === 1) {
                // Disband the sect
                return await this._disbandSect(sect, reason);
            } else if (isSectMaster && sect.memberCount > 1) {
                // Transfer leadership before leaving
                const successor = this._findSuccessor(sect);
                if (successor) {
                    this._transferLeadership(sect, successor);
                }
            }

            // Remove player from sect
            this._removeMemberFromSect(sect, playerInfo);

            // Calculate contribution rewards/penalties
            const contributionRewards = this._calculateContributionRewards();
            if (contributionRewards.rewards) {
                this._awardResources(contributionRewards.rewards);
            }

            // Clear player's sect status
            const oldSectName = sect.name;
            this.sectState.currentSect = null;
            this.sectState.playerRole = null;
            this.sectState.playerContribution = 0;
            this.sectState.joinDate = null;

            // Clear active buffs
            this.activeBuffs.clear();

            // Update statistics
            this.statistics.sectionsLeft++;

            // Save state
            this._saveState();

            // Emit leave event
            this.eventManager.emit('sect:memberLeft', {
                sectId: sect.id,
                member: playerInfo,
                role: currentRole,
                reason: reason,
                contributionRewards: contributionRewards
            });

            console.log(`SectSystem: Left sect ${oldSectName}`);

            return {
                success: true,
                message: `Left ${oldSectName}`,
                contributionRewards: contributionRewards
            };

        } catch (error) {
            console.error('SectSystem: Leave sect failed:', error);
            return {
                success: false,
                error: error.message,
                code: 'LEAVE_FAILED'
            };
        }
    }

    /**
     * Get current sect information
     * @returns {Object|null} Current sect data
     */
    getCurrentSect() {
        if (!this.sectState.currentSect) {
            return null;
        }

        const sect = this.sectRegistry.get(this.sectState.currentSect);
        if (!sect) {
            // Clean up invalid reference
            this.sectState.currentSect = null;
            this.sectState.playerRole = null;
            this._saveState();
            return null;
        }

        return {
            ...sect,
            playerRole: this.sectState.playerRole,
            playerContribution: this.sectState.playerContribution,
            joinDate: this.sectState.joinDate,
            activeBuffs: Array.from(this.activeBuffs.entries()),
            timeInSect: Date.now() - this.sectState.joinDate
        };
    }

    /**
     * Get list of available sects to join
     * @param {Object} filters - Search and filter options
     * @returns {Array} Available sects
     */
    getAvailableSects(filters = {}) {
        const {
            type = null,
            minPrestige = 0,
            maxPrestige = Infinity,
            hasOpenRecruitment = true,
            minMembers = 0,
            maxMembers = Infinity
        } = filters;

        const availableSects = [];

        for (const [sectId, sect] of this.sectRegistry) {
            // Skip current sect
            if (sectId === this.sectState.currentSect) {
                continue;
            }

            // Apply filters
            if (type && sect.type !== type) continue;
            if (sect.prestige < minPrestige || sect.prestige > maxPrestige) continue;
            if (sect.memberCount < minMembers || sect.memberCount > maxMembers) continue;
            if (hasOpenRecruitment && sect.policies.recruitment !== 'open') continue;

            // Check if sect has capacity
            if (sect.memberCount >= sect.maxMembers) continue;

            // Check basic eligibility
            const eligibility = this._checkJoinEligibility(sect, this._getPlayerInfo());
            if (!eligibility.valid) continue;

            availableSects.push({
                id: sectId,
                name: sect.name,
                description: sect.description,
                type: sect.type,
                memberCount: sect.memberCount,
                maxMembers: sect.maxMembers,
                prestige: sect.prestige,
                recruitment: sect.policies.recruitment,
                membershipFees: sect.policies.membershipFees
            });
        }

        return availableSects.sort((a, b) => b.prestige - a.prestige);
    }

    /**
     * Contribute resources to sect
     * @param {Object} resources - Resources to contribute
     * @returns {Object} Contribution result
     */
    async contributeResources(resources) {
        try {
            if (!this.sectState.currentSect) {
                return {
                    success: false,
                    error: 'Not a member of any sect',
                    code: 'NOT_IN_SECT'
                };
            }

            const sect = this.sectRegistry.get(this.sectState.currentSect);
            if (!sect) {
                return {
                    success: false,
                    error: 'Sect not found',
                    code: 'SECT_NOT_FOUND'
                };
            }

            // Validate resources
            const canAfford = this._checkResourceRequirements(resources);
            if (!canAfford.valid) {
                return {
                    success: false,
                    error: `Insufficient resources: ${canAfford.missing.join(', ')}`,
                    code: 'INSUFFICIENT_RESOURCES'
                };
            }

            // Calculate contribution value and bonuses
            const contributionValue = this._calculateContributionValue(resources);
            const roleMultiplier = this.sectRoles[this.sectState.playerRole]?.benefits.contributionMultiplier || 1.0;
            const finalContribution = Math.floor(contributionValue * roleMultiplier);

            // Deduct resources from player
            this._deductResources(resources);

            // Add resources to sect treasury
            for (const [resource, amount] of Object.entries(resources)) {
                sect.treasury[resource] = (sect.treasury[resource] || 0) + amount;
            }

            // Update player contribution
            this.sectState.playerContribution += finalContribution;
            this.statistics.totalContribution += finalContribution;

            // Update sect statistics
            sect.statistics.totalContributions += finalContribution;

            // Award contribution benefits
            const benefits = this._calculateContributionBenefits(finalContribution);
            this._applyContributionBenefits(benefits);

            // Save state
            this._saveState();

            // Emit contribution event
            this.eventManager.emit('sect:resourceContributed', {
                sectId: sect.id,
                member: this._getPlayerInfo(),
                resources: resources,
                contributionValue: finalContribution,
                benefits: benefits
            });

            console.log(`SectSystem: Contributed ${JSON.stringify(resources)} (value: ${finalContribution})`);

            return {
                success: true,
                contributionValue: finalContribution,
                totalContribution: this.sectState.playerContribution,
                benefits: benefits,
                message: `Contributed resources worth ${finalContribution} contribution points`
            };

        } catch (error) {
            console.error('SectSystem: Resource contribution failed:', error);
            return {
                success: false,
                error: error.message,
                code: 'CONTRIBUTION_FAILED'
            };
        }
    }

    /**
     * Update sect system (called by game loop)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.isActive || !this.isInitialized) {
            return;
        }

        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }

        try {
            // Update sect buffs and benefits
            this._updateSectBuffs();

            // Process ongoing activities
            this._processOngoingActivities();

            // Update sect prestige and reputation
            this._updateSectPrestige();

            // Process facility maintenance
            this._processFacilityMaintenance();

            // Update player activity timestamp
            if (this.sectState.currentSect) {
                this.sectState.lastActivity = now;
            }

            this.lastUpdateTime = now;

        } catch (error) {
            console.error('SectSystem: Update failed:', error);
        }
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Listen for cultivation progress to award sect benefits
        this.eventManager.on('cultivation:experienceGained', (data) => {
            this._onCultivationProgress(data);
        });

        // Listen for realm breakthroughs
        this.eventManager.on('realm:breakthrough', (data) => {
            this._onRealmBreakthrough(data);
        });

        // Listen for game state changes
        this.eventManager.on('gameState:loaded', () => {
            this._onGameStateLoaded();
        });
    }

    /**
     * Validate sect creation parameters
     * @param {Object} sectConfig - Sect configuration
     * @returns {Object} Validation result
     */
    _validateSectCreation(sectConfig) {
        const { name, type } = sectConfig;

        // Check name
        if (!name || name.trim().length < 3) {
            return { valid: false, error: 'Sect name must be at least 3 characters long' };
        }

        if (name.length > 50) {
            return { valid: false, error: 'Sect name cannot exceed 50 characters' };
        }

        // Check for duplicate names
        for (const sect of this.sectRegistry.values()) {
            if (sect.name.toLowerCase() === name.toLowerCase().trim()) {
                return { valid: false, error: 'A sect with this name already exists' };
            }
        }

        // Check type
        if (!type || !this.sectTypes[type]) {
            return { valid: false, error: 'Invalid sect type' };
        }

        // Check if player is already in a sect
        if (this.sectState.currentSect) {
            return { valid: false, error: 'Already member of a sect' };
        }

        // Check player cultivation level requirements
        const playerInfo = this._getPlayerInfo();
        const typeData = this.sectTypes[type];

        // Add any additional validation based on sect type requirements
        if (typeData.requirements) {
            // Could add checks for minimum cultivation level, resources, etc.
        }

        return { valid: true };
    }

    /**
     * Check if player can afford resource requirements
     * @param {Object} requirements - Resource requirements
     * @returns {Object} Affordability check result
     */
    _checkResourceRequirements(requirements) {
        const missing = [];

        for (const [resource, amount] of Object.entries(requirements)) {
            const current = this.gameState.get(`player.${resource}`) || 0;
            if (current < amount) {
                missing.push(`${resource}: ${amount - current} needed`);
            }
        }

        return {
            valid: missing.length === 0,
            missing: missing
        };
    }

    /**
     * Deduct resources from player
     * @param {Object} resources - Resources to deduct
     */
    _deductResources(resources) {
        for (const [resource, amount] of Object.entries(resources)) {
            this.gameState.increment(`player.${resource}`, -amount);
        }
    }

    /**
     * Award resources to player
     * @param {Object} resources - Resources to award
     */
    _awardResources(resources) {
        for (const [resource, amount] of Object.entries(resources)) {
            this.gameState.increment(`player.${resource}`, amount);
        }
    }

    /**
     * Get player information
     * @returns {Object} Player info object
     */
    _getPlayerInfo() {
        return {
            id: 'player', // In multiplayer, this would be unique player ID
            name: 'Player', // Could be customizable
            cultivationLevel: this.gameState.get('cultivation.qi.level') || 0,
            bodyLevel: this.gameState.get('cultivation.body.level') || 0,
            realm: this.gameState.get('realm.current') || 'Body Refinement',
            power: this.gameState.get('player.power') || 1.0,
            joinedAt: Date.now()
        };
    }

    /**
     * Generate unique sect ID
     * @returns {string} Unique sect ID
     */
    _generateSectId() {
        return `sect_${this.nextSectId++}_${Date.now()}`;
    }

    /**
     * Get default emblem for sect type
     * @param {string} type - Sect type
     * @returns {string} Default emblem
     */
    _getDefaultEmblem(type) {
        const emblems = {
            orthodox: '⚡',
            demonic: '🔥',
            righteous: '☀️',
            merchant: '💰',
            hermit: '🏔️'
        };
        return emblems[type] || '⭐';
    }

    /**
     * Add member to sect
     * @param {Object} sect - Sect object
     * @param {Object} member - Member info
     * @param {string} role - Member role
     */
    _addMemberToSect(sect, member, role) {
        const memberData = {
            ...member,
            role: role,
            joinedAt: Date.now(),
            contribution: 0,
            lastActive: Date.now()
        };

        sect.members.set(member.id, memberData);
        sect.memberCount++;
        sect.statistics.totalMembersEver++;
    }

    /**
     * Remove member from sect
     * @param {Object} sect - Sect object
     * @param {Object} member - Member info
     */
    _removeMemberFromSect(sect, member) {
        sect.members.delete(member.id);
        sect.memberCount--;
    }

    /**
     * Check join eligibility
     * @param {Object} sect - Sect object
     * @param {Object} member - Member info
     * @returns {Object} Eligibility result
     */
    _checkJoinEligibility(sect, member) {
        // Check recruitment policy
        if (sect.policies.recruitment === 'closed') {
            return { valid: false, reason: 'Sect recruitment is closed' };
        }

        // Check cultivation requirements (if any)
        // This can be expanded based on sect policies

        return { valid: true };
    }

    /**
     * Determine starting role for new member
     * @param {Object} sect - Sect object
     * @param {Object} member - Member info
     * @returns {string} Starting role
     */
    _determineStartingRole(sect, member) {
        // Default starting role is probationary
        return 'probationary';
    }

    /**
     * Save current state
     */
    _saveState() {
        this.gameState.update({
            sect: this.sectState,
            sectStats: this.statistics,
            sectRegistry: Array.from(this.sectRegistry.entries())
        }, { source: 'SectSystem' });
    }

    /**
     * Handle cultivation progress events
     * @param {Object} data - Event data
     */
    _onCultivationProgress(data) {
        if (this.sectState.currentSect && this.activeBuffs.size > 0) {
            // Apply sect cultivation bonuses if any
            // This would integrate with the cultivation system
        }
    }

    /**
     * Handle realm breakthrough events
     * @param {Object} data - Event data
     */
    _onRealmBreakthrough(data) {
        if (this.sectState.currentSect) {
            // Award sect contribution for breakthroughs
            const contributionBonus = 100 * data.newRealm.level;
            this.sectState.playerContribution += contributionBonus;

            this.eventManager.emit('sect:breakthroughContribution', {
                contribution: contributionBonus,
                realm: data.newRealm
            });
        }
    }

    /**
     * Handle game state loaded event
     */
    _onGameStateLoaded() {
        // Reinitialize sect system after save load
        this.initialize().catch(error => {
            console.error('SectSystem: Failed to reinitialize after load:', error);
        });
    }

    /**
     * Calculate contribution value for resources
     * @param {Object} resources - Resources contributed
     * @returns {number} Contribution value
     */
    _calculateContributionValue(resources) {
        let value = 0;

        // Base resource values (can be customized)
        const resourceValues = {
            jade: 1,
            spiritCrystals: 10,
            // Add more resources as needed
        };

        for (const [resource, amount] of Object.entries(resources)) {
            const resourceValue = resourceValues[resource] || 1;
            value += amount * resourceValue;
        }

        return value;
    }

    /**
     * Calculate contribution benefits
     * @param {number} contribution - Contribution amount
     * @returns {Object} Benefits object
     */
    _calculateContributionBenefits(contribution) {
        const benefits = {
            experience: Math.floor(contribution * 0.1),
            prestige: Math.floor(contribution * 0.05),
            // Add more benefits based on contribution
        };

        return benefits;
    }

    /**
     * Apply contribution benefits to player
     * @param {Object} benefits - Benefits to apply
     */
    _applyContributionBenefits(benefits) {
        if (benefits.experience) {
            // Award cultivation experience
            this.eventManager.emit('cultivation:awardExperience', {
                amount: benefits.experience,
                source: 'sect_contribution'
            });
        }

        if (benefits.prestige) {
            // Award prestige (this could be a new player stat)
            this.gameState.increment('player.prestige', benefits.prestige);
        }
    }

    /**
     * Update sect buffs and benefits
     */
    _updateSectBuffs() {
        if (!this.sectState.currentSect) {
            return;
        }

        const sect = this.sectRegistry.get(this.sectState.currentSect);
        if (!sect) {
            return;
        }

        // Clear old buffs
        this.activeBuffs.clear();

        // Apply role-based benefits
        const roleData = this.sectRoles[this.sectState.playerRole];
        if (roleData && roleData.benefits) {
            this.activeBuffs.set('role_cultivation', {
                type: 'cultivation_speed',
                value: roleData.benefits.cultivationBonus || 0,
                source: 'role'
            });
        }

        // Apply sect type benefits
        const sectTypeData = this.sectTypes[sect.type];
        if (sectTypeData && sectTypeData.bonuses) {
            for (const [bonusType, value] of Object.entries(sectTypeData.bonuses)) {
                this.activeBuffs.set(`sect_${bonusType}`, {
                    type: bonusType,
                    value: value,
                    source: 'sect_type'
                });
            }
        }

        // Apply facility benefits
        for (const facility of sect.facilities.values()) {
            if (facility.benefits) {
                for (const [benefitType, value] of Object.entries(facility.benefits)) {
                    const buffKey = `facility_${facility.id}_${benefitType}`;
                    this.activeBuffs.set(buffKey, {
                        type: benefitType,
                        value: value,
                        source: 'facility'
                    });
                }
            }
        }
    }

    /**
     * Process ongoing activities
     */
    _processOngoingActivities() {
        // This would handle ongoing sect activities
        // Will be implemented in SectActivities.js
    }

    /**
     * Update sect prestige
     */
    _updateSectPrestige() {
        // This would handle prestige calculations
        // Based on member activities, achievements, etc.
    }

    /**
     * Process facility maintenance
     */
    _processFacilityMaintenance() {
        // This would handle facility upkeep costs
        // And degrade facilities if not maintained
    }

    /**
     * Initialize required facilities for new sect
     * @param {Object} sect - Sect object
     */
    _initializeRequiredFacilities(sect) {
        const sectTypeData = this.sectTypes[sect.type];

        for (const facilityId of sectTypeData.facilities.required) {
            const facilityData = this.sectFacilities[facilityId];
            if (facilityData) {
                const facility = {
                    id: facilityId,
                    level: 1,
                    ...facilityData,
                    constructedAt: Date.now()
                };
                sect.facilities.set(facilityId, facility);
            }
        }
    }

    /**
     * Find successor for sect leadership
     * @param {Object} sect - Sect object
     * @returns {Object|null} Successor member
     */
    _findSuccessor(sect) {
        // Find highest-ranking member to transfer leadership to
        let bestSuccessor = null;
        let highestRoleLevel = 0;

        for (const member of sect.members.values()) {
            const roleData = this.sectRoles[member.role];
            if (roleData && roleData.level > highestRoleLevel) {
                highestRoleLevel = roleData.level;
                bestSuccessor = member;
            }
        }

        return bestSuccessor;
    }

    /**
     * Transfer leadership to another member
     * @param {Object} sect - Sect object
     * @param {Object} successor - New leader
     */
    _transferLeadership(sect, successor) {
        // Update successor to sect master
        const memberData = sect.members.get(successor.id);
        if (memberData) {
            memberData.role = 'sect_master';
            sect.members.set(successor.id, memberData);
        }

        console.log(`SectSystem: Transferred leadership to ${successor.name}`);
    }

    /**
     * Disband a sect
     * @param {Object} sect - Sect to disband
     * @param {string} reason - Reason for disbanding
     * @returns {Object} Disband result
     */
    async _disbandSect(sect, reason) {
        try {
            // Distribute remaining treasury to members
            this._distributeTreasury(sect);

            // Remove sect from registry
            this.sectRegistry.delete(sect.id);

            // Clear player's sect status
            this.sectState.currentSect = null;
            this.sectState.playerRole = null;
            this.sectState.playerContribution = 0;
            this.sectState.joinDate = null;

            // Clear buffs
            this.activeBuffs.clear();

            // Save state
            this._saveState();

            // Emit disband event
            this.eventManager.emit('sect:disbanded', {
                sectId: sect.id,
                sectName: sect.name,
                reason: reason,
                founder: sect.founder
            });

            console.log(`SectSystem: Disbanded sect ${sect.name}`);

            return {
                success: true,
                message: `Sect ${sect.name} has been disbanded`,
                treasuryReturned: sect.treasury
            };

        } catch (error) {
            console.error('SectSystem: Disband failed:', error);
            return {
                success: false,
                error: error.message,
                code: 'DISBAND_FAILED'
            };
        }
    }

    /**
     * Distribute sect treasury to members
     * @param {Object} sect - Sect object
     */
    _distributeTreasury(sect) {
        if (sect.memberCount === 1) {
            // Return all to the last member (founder)
            this._awardResources(sect.treasury);
        } else {
            // Distribute based on contribution (for multiplayer)
            // For now, just return to founder
            this._awardResources(sect.treasury);
        }
    }

    /**
     * Calculate contribution rewards for leaving
     * @returns {Object} Rewards calculation
     */
    _calculateContributionRewards() {
        const contribution = this.sectState.playerContribution;

        if (contribution <= 0) {
            return { rewards: null };
        }

        // Convert contribution to rewards
        const rewards = {
            jade: Math.floor(contribution * 0.1),
            spiritCrystals: Math.floor(contribution * 0.01)
        };

        return { rewards };
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectSystem };
} else if (typeof window !== 'undefined') {
    window.SectSystem = SectSystem;
}