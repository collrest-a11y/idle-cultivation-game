/**
 * SectCompetition - Inter-sect competitions, tournaments, and warfare
 * Handles sect wars, tournaments, territory control, and diplomatic relations
 */
class SectCompetition {
    constructor(gameState, eventManager, sectSystem, sectManager) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.sectSystem = sectSystem;
        this.sectManager = sectManager;

        // Competition state
        this.competitionState = {
            activeEvents: new Map(),
            scheduledEvents: new Map(),
            eventHistory: [],
            territoryMap: new Map(),
            diplomacyRelations: new Map()
        };

        // War and conflict tracking
        this.warfareState = {
            activeWars: new Map(),
            warDeclarations: new Map(),
            battleHistory: [],
            militaryStrength: new Map()
        };

        // Tournament system
        this.tournamentState = {
            activeTournaments: new Map(),
            tournamentQueue: [],
            championHistory: [],
            seasonalEvents: new Map()
        };

        // Performance metrics
        this.competitionMetrics = {
            warsParticipated: 0,
            warsWon: 0,
            warsLost: 0,
            tournamentsWon: 0,
            tournamentsParticipated: 0,
            territoriesConquered: 0,
            territoriesLost: 0,
            prestigeGained: 0,
            alliancesFormed: 0
        };

        this.isInitialized = false;
        this.updateInterval = 60000; // 1 minute
        this.lastUpdate = Date.now();

        console.log('SectCompetition: Initialized');
    }

    /**
     * Initialize the competition system
     */
    async initialize() {
        try {
            // Load competition state
            const savedState = this.gameState.get('sectCompetition');
            if (savedState) {
                this.competitionState = {
                    ...this.competitionState,
                    activeEvents: new Map(savedState.activeEvents || []),
                    scheduledEvents: new Map(savedState.scheduledEvents || []),
                    eventHistory: savedState.eventHistory || [],
                    territoryMap: new Map(savedState.territoryMap || []),
                    diplomacyRelations: new Map(savedState.diplomacyRelations || [])
                };
            }

            // Load warfare state
            const savedWarfare = this.gameState.get('sectWarfare');
            if (savedWarfare) {
                this.warfareState = {
                    ...this.warfareState,
                    activeWars: new Map(savedWarfare.activeWars || []),
                    warDeclarations: new Map(savedWarfare.warDeclarations || []),
                    battleHistory: savedWarfare.battleHistory || [],
                    militaryStrength: new Map(savedWarfare.militaryStrength || [])
                };
            }

            // Load tournament state
            const savedTournaments = this.gameState.get('sectTournaments');
            if (savedTournaments) {
                this.tournamentState = {
                    ...this.tournamentState,
                    activeTournaments: new Map(savedTournaments.activeTournaments || []),
                    tournamentQueue: savedTournaments.tournamentQueue || [],
                    championHistory: savedTournaments.championHistory || [],
                    seasonalEvents: new Map(savedTournaments.seasonalEvents || [])
                };
            }

            // Load metrics
            const savedMetrics = this.gameState.get('competitionMetrics');
            if (savedMetrics) {
                this.competitionMetrics = { ...this.competitionMetrics, ...savedMetrics };
            }

            // Set up event listeners
            this._setupEventListeners();

            // Initialize competition data
            if (window.COMPETITION_EVENTS && window.DIPLOMACY_RELATIONS) {
                this.competitionData = window.COMPETITION_EVENTS;
                this.diplomacyData = window.DIPLOMACY_RELATIONS;
                console.log('SectCompetition: Loaded competition definitions');
            } else {
                console.warn('SectCompetition: Competition data not loaded');
            }

            this.isInitialized = true;
            console.log('SectCompetition: Initialization complete');
            return true;

        } catch (error) {
            console.error('SectCompetition: Initialization failed:', error);
            return false;
        }
    }

    /**
     * Declare war on another sect
     * @param {string} targetSectId - Target sect ID
     * @param {string} reason - Reason for war
     * @param {Object} options - War options
     * @returns {Object} Declaration result
     */
    async declareWar(targetSectId, reason = '', options = {}) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this.sectManager._checkPermission('declare_war');
            if (!hasPermission) {
                return this._error('Insufficient permissions to declare war', 'NO_PERMISSION');
            }

            // Get target sect
            const targetSect = this.sectSystem.sectRegistry.get(targetSectId);
            if (!targetSect) {
                return this._error('Target sect not found', 'TARGET_NOT_FOUND');
            }

            // Cannot declare war on own sect
            if (targetSectId === currentSect.id) {
                return this._error('Cannot declare war on own sect', 'INVALID_TARGET');
            }

            // Check if already at war
            const existingWar = this._findActiveWar(currentSect.id, targetSectId);
            if (existingWar) {
                return this._error('Already at war with this sect', 'ALREADY_AT_WAR');
            }

            // Check current relations
            const currentRelation = this._getDiplomaticRelation(currentSect.id, targetSectId);
            if (currentRelation === 'alliance') {
                return this._error('Cannot declare war on allied sect', 'ALLIED_SECT');
            }

            // Check war requirements
            const warData = this.competitionData.sect_war;
            const validation = this._validateWarDeclaration(currentSect, targetSect, warData);
            if (!validation.valid) {
                return this._error(validation.reason, 'WAR_INVALID');
            }

            // Create war declaration
            const warDeclaration = {
                id: `war_${currentSect.id}_${targetSectId}_${Date.now()}`,
                aggressorSectId: currentSect.id,
                defenderSectId: targetSectId,
                reason: reason,
                declaredAt: Date.now(),
                warStartTime: Date.now() + warData.requirements.declaration, // 24 hour preparation
                duration: warData.duration,
                phases: [...warData.phases],
                currentPhase: 0,
                status: 'declared',
                declaredBy: this._getPlayerInfo(),
                options: options
            };

            // Add to war declarations
            this.warfareState.warDeclarations.set(warDeclaration.id, warDeclaration);

            // Update diplomatic relations
            this._setDiplomaticRelation(currentSect.id, targetSectId, 'war');

            // Log war declaration
            this.sectManager._logActivity(currentSect.id, 'war_declared', {
                targetSectId: targetSectId,
                targetSectName: targetSect.name,
                reason: reason,
                warId: warDeclaration.id,
                declaredBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit war declaration event
            this.eventManager.emit('sectWar:declared', {
                warId: warDeclaration.id,
                aggressorSect: currentSect,
                defenderSect: targetSect,
                declaration: warDeclaration
            });

            console.log(`SectCompetition: War declared on ${targetSect.name}`);

            return {
                success: true,
                message: `War declared on ${targetSect.name}`,
                warId: warDeclaration.id,
                preparationTime: warData.requirements.declaration,
                warDeclaration: warDeclaration
            };

        } catch (error) {
            console.error('SectCompetition: War declaration failed:', error);
            return this._error(error.message, 'DECLARATION_FAILED');
        }
    }

    /**
     * Create or join a tournament
     * @param {string} tournamentType - Type of tournament
     * @param {Object} options - Tournament options
     * @returns {Object} Tournament result
     */
    async createTournament(tournamentType, options = {}) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Get tournament data
            const tournamentData = this.competitionData.grand_tournament; // Using grand tournament as template
            if (!tournamentData) {
                return this._error('Invalid tournament type', 'INVALID_TOURNAMENT');
            }

            // Check requirements
            const validation = this._validateTournamentCreation(currentSect, tournamentData);
            if (!validation.valid) {
                return this._error(validation.reason, 'TOURNAMENT_INVALID');
            }

            // Check entry fee
            const entryFee = tournamentData.requirements.entryFee;
            if (entryFee) {
                const canAfford = this._checkSectResources(currentSect, entryFee);
                if (!canAfford.valid) {
                    return this._error(`Cannot afford entry fee: ${canAfford.missing.join(', ')}`, 'INSUFFICIENT_RESOURCES');
                }
            }

            // Create tournament instance
            const tournament = {
                id: `tournament_${tournamentType}_${Date.now()}`,
                type: tournamentType,
                name: options.name || `${tournamentData.name} ${new Date().getFullYear()}`,
                description: tournamentData.description,
                createdBy: currentSect.id,
                createdAt: Date.now(),
                startTime: Date.now() + (24 * 60 * 60 * 1000), // Start in 24 hours
                duration: tournamentData.duration,
                status: 'registration',

                // Participants
                participants: new Map(),
                maxParticipants: tournamentData.participants.max,
                minParticipants: tournamentData.participants.min,

                // Categories and brackets
                categories: tournamentData.categories,
                brackets: new Map(),

                // Rewards
                rewards: tournamentData.rewards,

                // Configuration
                entryFee: entryFee,
                rules: options.rules || {},
                requirements: tournamentData.requirements
            };

            // Register creating sect
            tournament.participants.set(currentSect.id, {
                sectId: currentSect.id,
                sectName: currentSect.name,
                registeredAt: Date.now(),
                registeredBy: this._getPlayerInfo(),
                categories: options.categories || ['qi_cultivation']
            });

            // Deduct entry fee
            if (entryFee) {
                this._deductSectResources(currentSect, entryFee);
            }

            // Add to active tournaments
            this.tournamentState.activeTournaments.set(tournament.id, tournament);

            // Log tournament creation
            this.sectManager._logActivity(currentSect.id, 'tournament_created', {
                tournamentId: tournament.id,
                tournamentName: tournament.name,
                tournamentType: tournamentType,
                createdBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit tournament creation event
            this.eventManager.emit('tournament:created', {
                tournamentId: tournament.id,
                tournament: tournament,
                createdBy: currentSect
            });

            console.log(`SectCompetition: Created tournament ${tournament.name}`);

            return {
                success: true,
                message: `Created tournament: ${tournament.name}`,
                tournamentId: tournament.id,
                tournament: tournament
            };

        } catch (error) {
            console.error('SectCompetition: Tournament creation failed:', error);
            return this._error(error.message, 'TOURNAMENT_FAILED');
        }
    }

    /**
     * Join an existing tournament
     * @param {string} tournamentId - Tournament to join
     * @param {Object} options - Join options
     * @returns {Object} Join result
     */
    async joinTournament(tournamentId, options = {}) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Get tournament
            const tournament = this.tournamentState.activeTournaments.get(tournamentId);
            if (!tournament) {
                return this._error('Tournament not found', 'TOURNAMENT_NOT_FOUND');
            }

            // Check if already participating
            if (tournament.participants.has(currentSect.id)) {
                return this._error('Already participating in this tournament', 'ALREADY_JOINED');
            }

            // Check registration status
            if (tournament.status !== 'registration') {
                return this._error('Tournament registration is closed', 'REGISTRATION_CLOSED');
            }

            // Check capacity
            if (tournament.participants.size >= tournament.maxParticipants) {
                return this._error('Tournament is full', 'TOURNAMENT_FULL');
            }

            // Check entry fee
            if (tournament.entryFee) {
                const canAfford = this._checkSectResources(currentSect, tournament.entryFee);
                if (!canAfford.valid) {
                    return this._error(`Cannot afford entry fee: ${canAfford.missing.join(', ')}`, 'INSUFFICIENT_RESOURCES');
                }
            }

            // Check requirements
            const validation = this._validateTournamentJoin(currentSect, tournament);
            if (!validation.valid) {
                return this._error(validation.reason, 'JOIN_INVALID');
            }

            // Register sect
            tournament.participants.set(currentSect.id, {
                sectId: currentSect.id,
                sectName: currentSect.name,
                registeredAt: Date.now(),
                registeredBy: this._getPlayerInfo(),
                categories: options.categories || ['qi_cultivation']
            });

            // Deduct entry fee
            if (tournament.entryFee) {
                this._deductSectResources(currentSect, tournament.entryFee);
            }

            // Log tournament join
            this.sectManager._logActivity(currentSect.id, 'tournament_joined', {
                tournamentId: tournamentId,
                tournamentName: tournament.name,
                joinedBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit join event
            this.eventManager.emit('tournament:joined', {
                tournamentId: tournamentId,
                tournament: tournament,
                joinedBy: currentSect
            });

            console.log(`SectCompetition: Joined tournament ${tournament.name}`);

            return {
                success: true,
                message: `Joined tournament: ${tournament.name}`,
                tournament: tournament,
                participantCount: tournament.participants.size
            };

        } catch (error) {
            console.error('SectCompetition: Tournament join failed:', error);
            return this._error(error.message, 'JOIN_FAILED');
        }
    }

    /**
     * Establish diplomatic relation with another sect
     * @param {string} targetSectId - Target sect ID
     * @param {string} relationType - Type of relation
     * @param {Object} terms - Relation terms
     * @returns {Object} Diplomacy result
     */
    async establishDiplomacy(targetSectId, relationType, terms = {}) {
        try {
            const currentSect = this.sectSystem.getCurrentSect();
            if (!currentSect) {
                return this._error('Not a member of any sect', 'NOT_IN_SECT');
            }

            // Check permissions
            const hasPermission = this.sectManager._checkPermission('form_alliances');
            if (!hasPermission) {
                return this._error('Insufficient permissions for diplomacy', 'NO_PERMISSION');
            }

            // Get target sect
            const targetSect = this.sectSystem.sectRegistry.get(targetSectId);
            if (!targetSect) {
                return this._error('Target sect not found', 'TARGET_NOT_FOUND');
            }

            // Cannot establish relations with own sect
            if (targetSectId === currentSect.id) {
                return this._error('Cannot establish relations with own sect', 'INVALID_TARGET');
            }

            // Get relation data
            const relationData = this.diplomacyData[relationType];
            if (!relationData) {
                return this._error('Invalid relation type', 'INVALID_RELATION');
            }

            // Check requirements
            const validation = this._validateDiplomaticRelation(currentSect, targetSect, relationData);
            if (!validation.valid) {
                return this._error(validation.reason, 'DIPLOMACY_INVALID');
            }

            // Check current relations
            const currentRelation = this._getDiplomaticRelation(currentSect.id, targetSectId);
            if (currentRelation === 'war') {
                return this._error('Cannot establish peaceful relations during war', 'AT_WAR');
            }

            // Create relation
            const relation = {
                id: `relation_${currentSect.id}_${targetSectId}_${Date.now()}`,
                type: relationType,
                sectA: currentSect.id,
                sectB: targetSectId,
                establishedAt: Date.now(),
                establishedBy: this._getPlayerInfo(),
                terms: terms,
                status: 'proposed',
                benefits: relationData.benefits,
                restrictions: relationData.restrictions
            };

            // For single player, auto-accept NPC sect relations
            if (this._isNPCSect(targetSectId)) {
                relation.status = 'active';
                this._setDiplomaticRelation(currentSect.id, targetSectId, relationType);
                this._applyDiplomaticBenefits(currentSect, relationData.benefits);

                // Update metrics
                if (relationType === 'alliance') {
                    this.competitionMetrics.alliancesFormed++;
                }
            }

            // Store relation
            const relationKey = this._getDiplomaticKey(currentSect.id, targetSectId);
            this.competitionState.diplomacyRelations.set(relationKey, relation);

            // Log diplomacy
            this.sectManager._logActivity(currentSect.id, 'diplomacy_established', {
                targetSectId: targetSectId,
                targetSectName: targetSect.name,
                relationType: relationType,
                relationId: relation.id,
                establishedBy: this._getPlayerInfo().name
            });

            // Save state
            this._saveState();

            // Emit diplomacy event
            this.eventManager.emit('diplomacy:established', {
                relationId: relation.id,
                relation: relation,
                sectA: currentSect,
                sectB: targetSect
            });

            console.log(`SectCompetition: Established ${relationType} with ${targetSect.name}`);

            return {
                success: true,
                message: `Established ${relationData.name} with ${targetSect.name}`,
                relationId: relation.id,
                relation: relation
            };

        } catch (error) {
            console.error('SectCompetition: Diplomacy failed:', error);
            return this._error(error.message, 'DIPLOMACY_FAILED');
        }
    }

    /**
     * Get available competitions
     * @returns {Array} Available competitions
     */
    getAvailableCompetitions() {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return [];
        }

        const competitions = [];

        // Add tournament opportunities
        for (const [tournamentId, tournament] of this.tournamentState.activeTournaments) {
            if (tournament.status === 'registration' && !tournament.participants.has(currentSect.id)) {
                competitions.push({
                    type: 'tournament',
                    id: tournamentId,
                    name: tournament.name,
                    description: tournament.description,
                    participants: tournament.participants.size,
                    maxParticipants: tournament.maxParticipants,
                    entryFee: tournament.entryFee,
                    startTime: tournament.startTime,
                    canJoin: this._canJoinTournament(currentSect, tournament)
                });
            }
        }

        // Add war opportunities (other sects to declare war on)
        for (const [sectId, sect] of this.sectSystem.sectRegistry) {
            if (sectId !== currentSect.id) {
                const currentRelation = this._getDiplomaticRelation(currentSect.id, sectId);
                if (currentRelation !== 'war' && currentRelation !== 'alliance') {
                    competitions.push({
                        type: 'war',
                        id: sectId,
                        name: `War against ${sect.name}`,
                        description: `Declare war on ${sect.name} for territory and resources`,
                        targetSect: sect,
                        currentRelation: currentRelation,
                        canDeclare: this._canDeclareWar(currentSect, sect)
                    });
                }
            }
        }

        return competitions;
    }

    /**
     * Get active competitions for current sect
     * @returns {Array} Active competitions
     */
    getActiveCompetitions() {
        const currentSect = this.sectSystem.getCurrentSect();
        if (!currentSect) {
            return [];
        }

        const active = [];

        // Active wars
        for (const [warId, war] of this.warfareState.activeWars) {
            if (war.aggressorSectId === currentSect.id || war.defenderSectId === currentSect.id) {
                active.push({
                    type: 'war',
                    id: warId,
                    ...war,
                    timeRemaining: Math.max(0, (war.warStartTime + war.duration) - Date.now()),
                    currentPhase: war.phases[war.currentPhase]
                });
            }
        }

        // Active tournaments
        for (const [tournamentId, tournament] of this.tournamentState.activeTournaments) {
            if (tournament.participants.has(currentSect.id)) {
                active.push({
                    type: 'tournament',
                    id: tournamentId,
                    ...tournament,
                    timeRemaining: Math.max(0, (tournament.startTime + tournament.duration) - Date.now()),
                    isParticipating: true
                });
            }
        }

        return active.sort((a, b) => a.startTime - b.startTime);
    }

    /**
     * Update competitions (called by game loop)
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
            // Process war declarations that should start
            this._processWarDeclarations();

            // Update active wars
            this._updateActiveWars();

            // Update tournaments
            this._updateTournaments();

            // Process expired diplomatic relations
            this._updateDiplomaticRelations();

            this.lastUpdate = now;

        } catch (error) {
            console.error('SectCompetition: Update failed:', error);
        }
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Listen for sect events
        this.eventManager.on('sect:created', (data) => {
            this._onSectCreated(data);
        });

        this.eventManager.on('sect:disbanded', (data) => {
            this._onSectDisbanded(data);
        });
    }

    /**
     * Validate war declaration
     * @param {Object} aggressorSect - Aggressor sect
     * @param {Object} defenderSect - Defender sect
     * @param {Object} warData - War data
     * @returns {Object} Validation result
     */
    _validateWarDeclaration(aggressorSect, defenderSect, warData) {
        // Check minimum members
        if (aggressorSect.memberCount < warData.requirements.minMembers) {
            return { valid: false, reason: `Sect must have at least ${warData.requirements.minMembers} members to declare war` };
        }

        if (defenderSect.memberCount < warData.requirements.minMembers) {
            return { valid: false, reason: 'Target sect does not meet minimum member requirement for war' };
        }

        // Check cooldown
        const lastWar = this._getLastWarTime(aggressorSect.id);
        if (lastWar && (Date.now() - lastWar) < warData.requirements.cooldown) {
            const remainingCooldown = warData.requirements.cooldown - (Date.now() - lastWar);
            return { valid: false, reason: `War cooldown active for ${this._formatTime(remainingCooldown)}` };
        }

        return { valid: true };
    }

    /**
     * Validate tournament creation
     * @param {Object} sect - Creating sect
     * @param {Object} tournamentData - Tournament data
     * @returns {Object} Validation result
     */
    _validateTournamentCreation(sect, tournamentData) {
        // Check minimum members
        if (sect.memberCount < tournamentData.requirements.minMembers) {
            return { valid: false, reason: `Sect must have at least ${tournamentData.requirements.minMembers} members` };
        }

        // Check cooldown
        const lastTournament = this._getLastTournamentTime(sect.id);
        if (lastTournament && (Date.now() - lastTournament) < tournamentData.requirements.cooldown) {
            const remainingCooldown = tournamentData.requirements.cooldown - (Date.now() - lastTournament);
            return { valid: false, reason: `Tournament cooldown active for ${this._formatTime(remainingCooldown)}` };
        }

        return { valid: true };
    }

    /**
     * Validate tournament join
     * @param {Object} sect - Joining sect
     * @param {Object} tournament - Tournament
     * @returns {Object} Validation result
     */
    _validateTournamentJoin(sect, tournament) {
        // Check minimum members
        if (sect.memberCount < tournament.requirements.minMembers) {
            return { valid: false, reason: `Sect must have at least ${tournament.requirements.minMembers} members` };
        }

        return { valid: true };
    }

    /**
     * Validate diplomatic relation
     * @param {Object} sectA - First sect
     * @param {Object} sectB - Second sect
     * @param {Object} relationData - Relation data
     * @returns {Object} Validation result
     */
    _validateDiplomaticRelation(sectA, sectB, relationData) {
        // Check prestige requirements
        if (relationData.requirements && relationData.requirements.minPrestige) {
            if (sectA.prestige < relationData.requirements.minPrestige) {
                return { valid: false, reason: `Requires ${relationData.requirements.minPrestige} prestige` };
            }
        }

        // Check trust level (for multiplayer)
        if (relationData.requirements && relationData.requirements.trustLevel) {
            // For single player, assume sufficient trust with NPC sects
            if (!this._isNPCSect(sectB.id)) {
                return { valid: false, reason: 'Insufficient trust level' };
            }
        }

        return { valid: true };
    }

    /**
     * Process war declarations that should start
     */
    _processWarDeclarations() {
        const now = Date.now();
        const startingWars = [];

        for (const [declarationId, declaration] of this.warfareState.warDeclarations) {
            if (declaration.status === 'declared' && now >= declaration.warStartTime) {
                startingWars.push(declarationId);
            }
        }

        for (const declarationId of startingWars) {
            this._startWar(declarationId);
        }
    }

    /**
     * Start a war from declaration
     * @param {string} declarationId - War declaration ID
     */
    _startWar(declarationId) {
        try {
            const declaration = this.warfareState.warDeclarations.get(declarationId);
            if (!declaration) return;

            // Create active war
            const war = {
                ...declaration,
                status: 'active',
                startedAt: Date.now(),
                endTime: Date.now() + declaration.duration,
                currentPhase: 0,
                phaseStartTime: Date.now(),
                battleResults: [],
                territoryChanges: []
            };

            // Move to active wars
            this.warfareState.activeWars.set(declarationId, war);
            this.warfareState.warDeclarations.delete(declarationId);

            // Log war start
            const aggressorSect = this.sectSystem.sectRegistry.get(declaration.aggressorSectId);
            const defenderSect = this.sectSystem.sectRegistry.get(declaration.defenderSectId);

            if (aggressorSect) {
                this.sectManager._logActivity(aggressorSect.id, 'war_started', {
                    warId: declarationId,
                    targetSectName: defenderSect ? defenderSect.name : 'Unknown',
                    phase: war.phases[0].name
                });
            }

            // Emit war start event
            this.eventManager.emit('sectWar:started', {
                warId: declarationId,
                war: war,
                aggressorSect: aggressorSect,
                defenderSect: defenderSect
            });

            console.log(`SectCompetition: War started between ${aggressorSect?.name} and ${defenderSect?.name}`);

        } catch (error) {
            console.error('SectCompetition: Start war failed:', error);
        }
    }

    /**
     * Update active wars
     */
    _updateActiveWars() {
        const now = Date.now();
        const completedWars = [];

        for (const [warId, war] of this.warfareState.activeWars) {
            // Check if war should end
            if (now >= war.endTime) {
                completedWars.push(warId);
                continue;
            }

            // Check phase progression
            const currentPhase = war.phases[war.currentPhase];
            if (currentPhase && now >= (war.phaseStartTime + currentPhase.duration)) {
                this._advanceWarPhase(warId);
            }
        }

        for (const warId of completedWars) {
            this._completeWar(warId);
        }
    }

    /**
     * Advance war to next phase
     * @param {string} warId - War ID
     */
    _advanceWarPhase(warId) {
        const war = this.warfareState.activeWars.get(warId);
        if (!war) return;

        war.currentPhase++;
        war.phaseStartTime = Date.now();

        if (war.currentPhase >= war.phases.length) {
            // War ended, determine winner
            this._completeWar(warId);
        } else {
            // Emit phase change event
            this.eventManager.emit('sectWar:phaseChanged', {
                warId: warId,
                war: war,
                newPhase: war.phases[war.currentPhase]
            });
        }
    }

    /**
     * Complete a war
     * @param {string} warId - War ID
     */
    _completeWar(warId) {
        try {
            const war = this.warfareState.activeWars.get(warId);
            if (!war) return;

            // Determine winner (simplified for single player)
            const aggressorSect = this.sectSystem.sectRegistry.get(war.aggressorSectId);
            const defenderSect = this.sectSystem.sectRegistry.get(war.defenderSectId);

            // For single player, determine based on sect strength
            const aggressorStrength = this._calculateSectStrength(aggressorSect);
            const defenderStrength = this._calculateSectStrength(defenderSect);

            const isPlayerAggressor = war.aggressorSectId === this.sectSystem.getCurrentSect()?.id;
            const isPlayerDefender = war.defenderSectId === this.sectSystem.getCurrentSect()?.id;

            let winner, loser;
            if (isPlayerAggressor || isPlayerDefender) {
                // Player involved - add some randomness but favor player slightly
                const playerBonus = 1.2;
                const playerStrength = isPlayerAggressor ? aggressorStrength * playerBonus : defenderStrength * playerBonus;
                const enemyStrength = isPlayerAggressor ? defenderStrength : aggressorStrength;

                const winChance = playerStrength / (playerStrength + enemyStrength);
                const playerWins = Math.random() < winChance;

                if (isPlayerAggressor) {
                    winner = playerWins ? aggressorSect : defenderSect;
                    loser = playerWins ? defenderSect : aggressorSect;
                } else {
                    winner = playerWins ? defenderSect : aggressorSect;
                    loser = playerWins ? aggressorSect : defenderSect;
                }
            } else {
                // NPC vs NPC
                winner = aggressorStrength > defenderStrength ? aggressorSect : defenderSect;
                loser = aggressorStrength > defenderStrength ? defenderSect : aggressorSect;
            }

            // Apply war results
            this._applyWarResults(war, winner, loser);

            // Update metrics if player was involved
            if (isPlayerAggressor || isPlayerDefender) {
                this.competitionMetrics.warsParticipated++;
                const playerSect = isPlayerAggressor ? aggressorSect : defenderSect;
                if (winner.id === playerSect.id) {
                    this.competitionMetrics.warsWon++;
                } else {
                    this.competitionMetrics.warsLost++;
                }
            }

            // Move to history
            this.warfareState.battleHistory.push({
                ...war,
                completedAt: Date.now(),
                winner: winner.id,
                loser: loser.id
            });

            // Clean up
            this.warfareState.activeWars.delete(warId);

            // Reset diplomatic relations
            this._setDiplomaticRelation(war.aggressorSectId, war.defenderSectId, 'hostility');

            // Emit war completion event
            this.eventManager.emit('sectWar:completed', {
                warId: warId,
                war: war,
                winner: winner,
                loser: loser
            });

            console.log(`SectCompetition: War completed - ${winner.name} defeated ${loser.name}`);

        } catch (error) {
            console.error('SectCompetition: Complete war failed:', error);
        }
    }

    /**
     * Apply war results
     * @param {Object} war - War object
     * @param {Object} winner - Winning sect
     * @param {Object} loser - Losing sect
     */
    _applyWarResults(war, winner, loser) {
        const warData = this.competitionData.sect_war;
        const rewards = warData.rewards;

        // Winner gets rewards
        if (rewards.winner) {
            // Territory
            if (rewards.winner.territory) {
                this._transferTerritory(loser.id, winner.id, rewards.winner.territory);
                this.competitionMetrics.territoriesConquered += rewards.winner.territory;
            }

            // Prestige
            if (rewards.winner.prestige) {
                winner.prestige = (winner.prestige || 0) + rewards.winner.prestige;
                this.competitionMetrics.prestigeGained += rewards.winner.prestige;
            }

            // Resources
            if (rewards.winner.resources) {
                for (const [resource, amount] of Object.entries(rewards.winner.resources)) {
                    winner.treasury[resource] = (winner.treasury[resource] || 0) + amount;
                }
            }

            // Titles
            if (rewards.winner.titles) {
                if (!winner.titles) winner.titles = [];
                winner.titles.push(...rewards.winner.titles);
            }
        }

        // Loser gets participation rewards
        if (rewards.participants) {
            if (rewards.participants.prestige) {
                loser.prestige = (loser.prestige || 0) + rewards.participants.prestige;
            }
        }
    }

    /**
     * Update tournaments
     */
    _updateTournaments() {
        const now = Date.now();
        const startingTournaments = [];
        const completedTournaments = [];

        for (const [tournamentId, tournament] of this.tournamentState.activeTournaments) {
            if (tournament.status === 'registration' && now >= tournament.startTime) {
                startingTournaments.push(tournamentId);
            } else if (tournament.status === 'active' && now >= (tournament.startTime + tournament.duration)) {
                completedTournaments.push(tournamentId);
            }
        }

        for (const tournamentId of startingTournaments) {
            this._startTournament(tournamentId);
        }

        for (const tournamentId of completedTournaments) {
            this._completeTournament(tournamentId);
        }
    }

    /**
     * Start a tournament
     * @param {string} tournamentId - Tournament ID
     */
    _startTournament(tournamentId) {
        try {
            const tournament = this.tournamentState.activeTournaments.get(tournamentId);
            if (!tournament) return;

            // Check minimum participants
            if (tournament.participants.size < tournament.minParticipants) {
                // Cancel tournament
                this._cancelTournament(tournamentId, 'Insufficient participants');
                return;
            }

            tournament.status = 'active';
            tournament.actualStartTime = Date.now();

            // Generate brackets for each category
            this._generateTournamentBrackets(tournament);

            // Emit tournament start event
            this.eventManager.emit('tournament:started', {
                tournamentId: tournamentId,
                tournament: tournament
            });

            console.log(`SectCompetition: Tournament ${tournament.name} started with ${tournament.participants.size} participants`);

        } catch (error) {
            console.error('SectCompetition: Start tournament failed:', error);
        }
    }

    /**
     * Complete a tournament
     * @param {string} tournamentId - Tournament ID
     */
    _completeTournament(tournamentId) {
        try {
            const tournament = this.tournamentState.activeTournaments.get(tournamentId);
            if (!tournament) return;

            // Determine winners for each category
            const winners = this._determineTournamentWinners(tournament);

            // Distribute rewards
            this._distributeTournamentRewards(tournament, winners);

            // Update metrics if player participated
            const currentSect = this.sectSystem.getCurrentSect();
            if (currentSect && tournament.participants.has(currentSect.id)) {
                this.competitionMetrics.tournamentsParticipated++;

                // Check if player won any category
                for (const winner of Object.values(winners)) {
                    if (winner.sectId === currentSect.id) {
                        this.competitionMetrics.tournamentsWon++;
                        break;
                    }
                }
            }

            // Move to history
            this.tournamentState.championHistory.push({
                tournamentId: tournamentId,
                name: tournament.name,
                completedAt: Date.now(),
                winners: winners,
                participantCount: tournament.participants.size
            });

            // Clean up
            this.tournamentState.activeTournaments.delete(tournamentId);

            // Emit completion event
            this.eventManager.emit('tournament:completed', {
                tournamentId: tournamentId,
                tournament: tournament,
                winners: winners
            });

            console.log(`SectCompetition: Tournament ${tournament.name} completed`);

        } catch (error) {
            console.error('SectCompetition: Complete tournament failed:', error);
        }
    }

    /**
     * Helper methods for various calculations and operations
     */

    _calculateSectStrength(sect) {
        if (!sect) return 0;

        let strength = sect.memberCount * 10; // Base strength from members
        strength += (sect.prestige || 0) * 0.1; // Prestige contributes
        strength += (sect.militaryStrength || 0); // Military buildings/training

        return strength;
    }

    _getDiplomaticRelation(sectA, sectB) {
        const key = this._getDiplomaticKey(sectA, sectB);
        const relation = this.competitionState.diplomacyRelations.get(key);
        return relation ? relation.type : 'neutral';
    }

    _setDiplomaticRelation(sectA, sectB, type) {
        const key = this._getDiplomaticKey(sectA, sectB);
        const existing = this.competitionState.diplomacyRelations.get(key);

        if (existing) {
            existing.type = type;
            existing.lastUpdated = Date.now();
        } else {
            this.competitionState.diplomacyRelations.set(key, {
                type: type,
                sectA: sectA,
                sectB: sectB,
                establishedAt: Date.now()
            });
        }
    }

    _getDiplomaticKey(sectA, sectB) {
        return sectA < sectB ? `${sectA}_${sectB}` : `${sectB}_${sectA}`;
    }

    _findActiveWar(sectA, sectB) {
        for (const war of this.warfareState.activeWars.values()) {
            if ((war.aggressorSectId === sectA && war.defenderSectId === sectB) ||
                (war.aggressorSectId === sectB && war.defenderSectId === sectA)) {
                return war;
            }
        }
        return null;
    }

    _getLastWarTime(sectId) {
        let lastTime = 0;
        for (const war of this.warfareState.battleHistory) {
            if (war.aggressorSectId === sectId || war.defenderSectId === sectId) {
                lastTime = Math.max(lastTime, war.completedAt || 0);
            }
        }
        return lastTime;
    }

    _getLastTournamentTime(sectId) {
        let lastTime = 0;
        for (const tournament of this.tournamentState.championHistory) {
            if (tournament.participants && tournament.participants.has(sectId)) {
                lastTime = Math.max(lastTime, tournament.completedAt || 0);
            }
        }
        return lastTime;
    }

    _isNPCSect(sectId) {
        // For single player, assume all other sects are NPC
        return sectId !== this.sectSystem.getCurrentSect()?.id;
    }

    _canJoinTournament(sect, tournament) {
        return sect.memberCount >= tournament.requirements.minMembers;
    }

    _canDeclareWar(aggressorSect, targetSect) {
        const warData = this.competitionData.sect_war;
        return aggressorSect.memberCount >= warData.requirements.minMembers &&
               targetSect.memberCount >= warData.requirements.minMembers;
    }

    _checkSectResources(sect, cost) {
        const missing = [];
        for (const [resource, amount] of Object.entries(cost)) {
            const available = sect.treasury[resource] || 0;
            if (available < amount) {
                missing.push(`${resource}: ${amount - available} needed`);
            }
        }
        return { valid: missing.length === 0, missing: missing };
    }

    _deductSectResources(sect, cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            sect.treasury[resource] = Math.max(0, (sect.treasury[resource] || 0) - amount);
        }
    }

    _formatTime(milliseconds) {
        const hours = Math.floor(milliseconds / (60 * 60 * 1000));
        const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    _getPlayerInfo() {
        return { id: 'player', name: 'Player' };
    }

    _saveState() {
        this.gameState.update({
            sectCompetition: {
                activeEvents: Array.from(this.competitionState.activeEvents.entries()),
                scheduledEvents: Array.from(this.competitionState.scheduledEvents.entries()),
                eventHistory: this.competitionState.eventHistory,
                territoryMap: Array.from(this.competitionState.territoryMap.entries()),
                diplomacyRelations: Array.from(this.competitionState.diplomacyRelations.entries())
            },
            sectWarfare: {
                activeWars: Array.from(this.warfareState.activeWars.entries()),
                warDeclarations: Array.from(this.warfareState.warDeclarations.entries()),
                battleHistory: this.warfareState.battleHistory,
                militaryStrength: Array.from(this.warfareState.militaryStrength.entries())
            },
            sectTournaments: {
                activeTournaments: Array.from(this.tournamentState.activeTournaments.entries()),
                tournamentQueue: this.tournamentState.tournamentQueue,
                championHistory: this.tournamentState.championHistory,
                seasonalEvents: Array.from(this.tournamentState.seasonalEvents.entries())
            },
            competitionMetrics: this.competitionMetrics
        }, { source: 'SectCompetition' });
    }

    _error(message, code) {
        return { success: false, error: message, code: code };
    }

    // Placeholder methods for complex tournament logic
    _generateTournamentBrackets(tournament) {
        // Would generate competition brackets
    }

    _determineTournamentWinners(tournament) {
        // Would simulate tournament and determine winners
        const winners = {};
        for (const category of tournament.categories) {
            // For now, randomly select a winner
            const participants = Array.from(tournament.participants.values());
            const randomWinner = participants[Math.floor(Math.random() * participants.length)];
            winners[category.name] = randomWinner;
        }
        return winners;
    }

    _distributeTournamentRewards(tournament, winners) {
        // Would distribute rewards to winners
    }

    _cancelTournament(tournamentId, reason) {
        const tournament = this.tournamentState.activeTournaments.get(tournamentId);
        if (tournament) {
            // Refund entry fees
            this.tournamentState.activeTournaments.delete(tournamentId);
            console.log(`SectCompetition: Cancelled tournament ${tournament.name} - ${reason}`);
        }
    }

    _transferTerritory(fromSectId, toSectId, amount) {
        // Would handle territory transfer between sects
    }

    _applyDiplomaticBenefits(sect, benefits) {
        // Would apply diplomatic relation benefits
    }

    _updateDiplomaticRelations() {
        // Would handle expiring relations, trust changes, etc.
    }

    _onSectCreated(data) {
        // Initialize diplomatic relations for new sect
    }

    _onSectDisbanded(data) {
        // Clean up relations and competitions involving disbanded sect
        const sectId = data.sectId;

        // Remove from all active competitions
        this.competitionState.diplomacyRelations.forEach((relation, key) => {
            if (relation.sectA === sectId || relation.sectB === sectId) {
                this.competitionState.diplomacyRelations.delete(key);
            }
        });

        // Cancel any wars involving this sect
        for (const [warId, war] of this.warfareState.activeWars) {
            if (war.aggressorSectId === sectId || war.defenderSectId === sectId) {
                this.warfareState.activeWars.delete(warId);
            }
        }
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SectCompetition };
} else if (typeof window !== 'undefined') {
    window.SectCompetition = SectCompetition;
}