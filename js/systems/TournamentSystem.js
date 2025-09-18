/**
 * TournamentSystem - Tournament management with brackets and competitions
 * Handles tournament creation, bracket generation, participant management, and rewards
 */
class TournamentSystem {
    constructor(gameState, eventManager, combatSystem, powerCalculator, rankingSystem) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.combatSystem = combatSystem;
        this.powerCalculator = powerCalculator;
        this.rankingSystem = rankingSystem;

        // Tournament configuration
        this.config = window.TOURNAMENT_CONFIG || {
            TYPES: {
                DAILY: {
                    id: 'daily',
                    name: 'Daily Tournament',
                    description: 'Daily competition with modest rewards',
                    duration: 24 * 60 * 60 * 1000,
                    maxParticipants: 64,
                    entryRequirement: { minPower: 100, entryCost: { jade: 50 } },
                    rewards: {
                        first: { jade: 1000, spiritCrystals: 50, title: 'Daily Champion' },
                        second: { jade: 500, spiritCrystals: 25 },
                        third: { jade: 250, spiritCrystals: 15 },
                        participation: { jade: 25, spiritCrystals: 5 }
                    }
                }
            },
            BRACKETS: {
                SINGLE_ELIMINATION: {
                    id: 'single_elimination',
                    name: 'Single Elimination',
                    description: 'One loss eliminates the participant',
                    allowedParticipants: [8, 16, 32, 64, 128, 256]
                }
            }
        };

        // Active tournaments
        this.activeTournaments = new Map();

        // Tournament history
        this.tournamentHistory = [];

        // Player tournament data
        this.playerTournamentData = {
            tournamentsEntered: 0,
            tournamentsWon: 0,
            tournamentWins: 0,
            tournamentLosses: 0,
            bestFinish: null,
            titles: [],
            totalRewardsEarned: { jade: 0, spiritCrystals: 0 }
        };

        // Tournament statistics
        this.statistics = {
            totalTournaments: 0,
            averageParticipants: 0,
            mostPopularType: null,
            completionRate: 0
        };

        this.isInitialized = false;

        console.log('TournamentSystem: Initialized');
    }

    /**
     * Initialize the tournament system
     */
    async initialize() {
        try {
            // Load player tournament data
            const savedPlayerData = this.gameState.get('playerTournamentData');
            if (savedPlayerData) {
                this.playerTournamentData = {
                    ...this.playerTournamentData,
                    ...savedPlayerData
                };
            }

            // Load tournament statistics
            const savedStats = this.gameState.get('tournamentStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Load tournament history
            const savedHistory = this.gameState.get('tournamentHistory');
            if (savedHistory) {
                this.tournamentHistory = savedHistory;
            }

            // Set up event listeners
            this._setupEventListeners();

            // Start automatic tournament scheduling
            this._scheduleAutomaticTournaments();

            this.isInitialized = true;

            this.eventManager.emit('tournament:initialized', {
                playerData: this.playerTournamentData,
                statistics: this.statistics,
                activeTournaments: this.activeTournaments.size
            });

            console.log('TournamentSystem: Initialization complete');

        } catch (error) {
            console.error('TournamentSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Create a new tournament
     * @param {string} type - Tournament type
     * @param {Object} options - Tournament options
     * @returns {Object} Tournament creation result
     */
    createTournament(type, options = {}) {
        if (!this.isInitialized) {
            throw new Error('TournamentSystem not initialized');
        }

        const tournamentType = this.config.TYPES[type.toUpperCase()];
        if (!tournamentType) {
            return {
                success: false,
                reason: 'invalid_tournament_type'
            };
        }

        const config = {
            bracketType: 'single_elimination',
            autoStart: true,
            generateAIOpponents: true,
            ...options
        };

        // Create tournament instance
        const tournamentId = this._generateTournamentId(type);
        const tournament = this._createTournamentInstance(tournamentId, tournamentType, config);

        // Generate AI participants if needed
        if (config.generateAIOpponents) {
            this._generateAIParticipants(tournament);
        }

        // Add to active tournaments
        this.activeTournaments.set(tournamentId, tournament);

        // Update statistics
        this.statistics.totalTournaments++;
        this._updateMostPopularType(type);

        this.eventManager.emit('tournament:created', {
            tournamentId: tournamentId,
            tournament: this._getPublicTournamentData(tournament),
            type: type
        });

        console.log(`TournamentSystem: Created ${type} tournament ${tournamentId}`);

        return {
            success: true,
            tournamentId: tournamentId,
            tournament: this._getPublicTournamentData(tournament)
        };
    }

    /**
     * Join a tournament
     * @param {string} tournamentId - Tournament ID
     * @returns {Object} Join result
     */
    joinTournament(tournamentId) {
        if (!this.isInitialized) {
            throw new Error('TournamentSystem not initialized');
        }

        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) {
            return {
                success: false,
                reason: 'tournament_not_found'
            };
        }

        if (tournament.state !== 'registration') {
            return {
                success: false,
                reason: 'registration_closed'
            };
        }

        // Check if player is already registered
        if (tournament.participants.some(p => p.id === 'player')) {
            return {
                success: false,
                reason: 'already_registered'
            };
        }

        // Check entry requirements
        const requirementCheck = this._checkEntryRequirements(tournament);
        if (!requirementCheck.valid) {
            return {
                success: false,
                reason: 'requirements_not_met',
                details: requirementCheck
            };
        }

        // Pay entry cost
        if (tournament.config.entryRequirement.entryCost) {
            const cost = tournament.config.entryRequirement.entryCost;
            if (cost.jade) {
                this.gameState.increment('player.jade', -cost.jade);
            }
            if (cost.spiritCrystals) {
                this.gameState.increment('player.spiritCrystals', -cost.spiritCrystals);
            }
        }

        // Add player to tournament
        const playerData = this._createPlayerParticipant();
        tournament.participants.push(playerData);
        tournament.participantCount++;

        // Update player statistics
        this.playerTournamentData.tournamentsEntered++;

        this.eventManager.emit('tournament:joined', {
            tournamentId: tournamentId,
            tournament: this._getPublicTournamentData(tournament),
            playerData: playerData
        });

        // Check if tournament should start
        this._checkTournamentStart(tournament);

        return {
            success: true,
            tournament: this._getPublicTournamentData(tournament),
            position: tournament.participants.length
        };
    }

    /**
     * Start a tournament manually
     * @param {string} tournamentId - Tournament ID
     * @returns {Object} Start result
     */
    startTournament(tournamentId) {
        if (!this.isInitialized) {
            throw new Error('TournamentSystem not initialized');
        }

        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) {
            return {
                success: false,
                reason: 'tournament_not_found'
            };
        }

        if (tournament.state !== 'registration') {
            return {
                success: false,
                reason: 'tournament_already_started'
            };
        }

        if (tournament.participants.length < 2) {
            return {
                success: false,
                reason: 'insufficient_participants'
            };
        }

        this._startTournament(tournament);

        return {
            success: true,
            tournament: this._getPublicTournamentData(tournament)
        };
    }

    /**
     * Get available tournaments
     * @param {Object} filters - Filter options
     * @returns {Array} Available tournaments
     */
    getAvailableTournaments(filters = {}) {
        const config = {
            state: 'registration', // 'registration', 'in_progress', 'completed', 'all'
            type: 'all',
            ...filters
        };

        const tournaments = [];

        for (const [id, tournament] of this.activeTournaments) {
            if (config.state !== 'all' && tournament.state !== config.state) {
                continue;
            }

            if (config.type !== 'all' && tournament.type !== config.type) {
                continue;
            }

            tournaments.push({
                id: id,
                ...this._getPublicTournamentData(tournament)
            });
        }

        return tournaments;
    }

    /**
     * Get tournament details
     * @param {string} tournamentId - Tournament ID
     * @returns {Object|null} Tournament details
     */
    getTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) {
            return null;
        }

        return {
            id: tournamentId,
            ...this._getPublicTournamentData(tournament)
        };
    }

    /**
     * Get player tournament data
     * @returns {Object} Player tournament statistics
     */
    getPlayerTournamentData() {
        return {
            ...this.playerTournamentData,
            winRate: this.playerTournamentData.tournamentWins + this.playerTournamentData.tournamentLosses > 0 ?
                this.playerTournamentData.tournamentWins /
                (this.playerTournamentData.tournamentWins + this.playerTournamentData.tournamentLosses) : 0,
            championshipRate: this.playerTournamentData.tournamentsEntered > 0 ?
                this.playerTournamentData.tournamentsWon / this.playerTournamentData.tournamentsEntered : 0
        };
    }

    /**
     * Get tournament statistics
     * @returns {Object} Tournament statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Get tournament history
     * @param {Object} options - History options
     * @returns {Array} Tournament history
     */
    getTournamentHistory(options = {}) {
        const config = {
            limit: 20,
            playerOnly: false,
            ...options
        };

        let history = [...this.tournamentHistory];

        if (config.playerOnly) {
            history = history.filter(t => t.playerParticipated);
        }

        return history.slice(-config.limit);
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Handle combat results for tournament matches
        this.eventManager.on('combat:ended', (data) => {
            this._handleTournamentMatchResult(data);
        });

        // Save data on game state save
        this.eventManager.on('gameState:save', () => {
            this._saveTournamentData();
        });

        // Clean up completed tournaments periodically
        setInterval(() => {
            this._cleanupCompletedTournaments();
        }, 300000); // Every 5 minutes
    }

    /**
     * Schedule automatic tournaments
     */
    _scheduleAutomaticTournaments() {
        // Schedule daily tournaments
        const scheduleDaily = () => {
            const now = new Date();
            const nextDaily = new Date(now);
            nextDaily.setHours(12, 0, 0, 0); // Noon each day

            if (nextDaily <= now) {
                nextDaily.setDate(nextDaily.getDate() + 1);
            }

            const timeUntilDaily = nextDaily.getTime() - now.getTime();

            setTimeout(() => {
                this.createTournament('daily', { autoStart: false });
                scheduleDaily(); // Schedule the next one
            }, timeUntilDaily);
        };

        scheduleDaily();

        console.log('TournamentSystem: Automatic tournament scheduling started');
    }

    /**
     * Generate tournament ID
     * @param {string} type - Tournament type
     * @returns {string} Tournament ID
     */
    _generateTournamentId(type) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6);
        return `${type}_${timestamp}_${random}`;
    }

    /**
     * Create tournament instance
     * @param {string} id - Tournament ID
     * @param {Object} type - Tournament type configuration
     * @param {Object} config - Tournament options
     * @returns {Object} Tournament instance
     */
    _createTournamentInstance(id, type, config) {
        return {
            id: id,
            type: type.id,
            name: type.name,
            description: type.description,
            config: type,
            options: config,

            state: 'registration', // 'registration', 'in_progress', 'completed'
            startTime: null,
            endTime: null,
            registrationDeadline: Date.now() + (type.duration * 0.1), // 10% of duration for registration

            participants: [],
            participantCount: 0,
            maxParticipants: type.maxParticipants,

            bracket: null,
            currentRound: 0,
            totalRounds: 0,

            matches: [],
            results: {},

            rewards: type.rewards,
            winner: null,
            finalStandings: []
        };
    }

    /**
     * Generate AI participants for tournament
     * @param {Object} tournament - Tournament instance
     */
    _generateAIParticipants(tournament) {
        const playerPower = this.powerCalculator.calculatePlayerPower();
        const slotsToFill = this._getOptimalParticipantCount(tournament) - 1; // -1 for player slot

        for (let i = 0; i < slotsToFill; i++) {
            // Generate AI opponent with power similar to player
            const powerVariance = 0.4; // ±40% of player power
            const aiPower = playerPower * (0.6 + Math.random() * 0.8);

            const aiParticipant = this._generateAIParticipant(i, aiPower);
            tournament.participants.push(aiParticipant);
            tournament.participantCount++;
        }

        console.log(`TournamentSystem: Generated ${slotsToFill} AI participants for tournament ${tournament.id}`);
    }

    /**
     * Get optimal participant count for tournament
     * @param {Object} tournament - Tournament instance
     * @returns {number} Optimal participant count
     */
    _getOptimalParticipantCount(tournament) {
        const bracketConfig = this.config.BRACKETS[tournament.options.bracketType.toUpperCase()];
        if (!bracketConfig) {
            return 8; // Default
        }

        const allowedCounts = bracketConfig.allowedParticipants;
        const maxParticipants = tournament.maxParticipants;

        // Find the largest allowed count that doesn't exceed max
        for (let i = allowedCounts.length - 1; i >= 0; i--) {
            if (allowedCounts[i] <= maxParticipants) {
                return allowedCounts[i];
            }
        }

        return allowedCounts[0]; // Fallback to smallest
    }

    /**
     * Generate AI participant
     * @param {number} index - Participant index
     * @param {number} targetPower - Target power level
     * @returns {Object} AI participant
     */
    _generateAIParticipant(index, targetPower) {
        const names = [
            'Iron Fist Chen', 'Sword Saint Li', 'Thunder Palm Wang', 'Mystic Dragon Zhou',
            'Flame Phoenix Liu', 'Ice Lotus Zhang', 'Wind Blade Wu', 'Earth Shield Zhao',
            'Lightning Spear Sun', 'Shadow Step Xu', 'Golden Core Ma', 'Silver Moon Qin',
            'Jade Emperor Yang', 'Crystal Heart Lin', 'Steel Mountain Gao', 'Void Walker Feng'
        ];

        const name = names[index % names.length] || `Cultivator ${index + 1}`;

        // Generate cultivation stats based on target power
        const avgLevel = Math.sqrt(targetPower / 10);
        const qiLevel = Math.floor(avgLevel * (0.8 + Math.random() * 0.4));
        const bodyLevel = Math.floor(avgLevel * (0.8 + Math.random() * 0.4));

        return {
            id: `ai_${index}_${Date.now()}`,
            type: 'ai',
            name: name,
            power: targetPower,
            cultivation: {
                qi: { level: qiLevel },
                body: { level: bodyLevel },
                realm: this._determineRealmFromLevel((qiLevel + bodyLevel) / 2),
                stage: Math.max(1, Math.floor(((qiLevel + bodyLevel) / 2) / 20) + 1)
            },
            isEliminated: false,
            currentRound: 1,
            wins: 0,
            losses: 0
        };
    }

    /**
     * Determine cultivation realm from level
     * @param {number} avgLevel - Average cultivation level
     * @returns {string} Cultivation realm
     */
    _determineRealmFromLevel(avgLevel) {
        if (avgLevel < 50) return 'Body Refinement';
        if (avgLevel < 150) return 'Qi Gathering';
        if (avgLevel < 300) return 'Foundation Building';
        if (avgLevel < 600) return 'Core Formation';
        return 'Nascent Soul';
    }

    /**
     * Create player participant data
     * @returns {Object} Player participant
     */
    _createPlayerParticipant() {
        const playerPower = this.powerCalculator.calculatePlayerPower();
        const cultivation = this.gameState.get('cultivation');
        const realm = this.gameState.get('realm');

        return {
            id: 'player',
            type: 'player',
            name: 'Player',
            power: playerPower,
            cultivation: cultivation,
            realm: realm,
            isEliminated: false,
            currentRound: 1,
            wins: 0,
            losses: 0
        };
    }

    /**
     * Check entry requirements
     * @param {Object} tournament - Tournament instance
     * @returns {Object} Requirement check result
     */
    _checkEntryRequirements(tournament) {
        const requirements = tournament.config.entryRequirement;
        const playerPower = this.powerCalculator.calculatePlayerPower();

        // Check minimum power
        if (requirements.minPower && playerPower < requirements.minPower) {
            return {
                valid: false,
                reason: 'insufficient_power',
                required: requirements.minPower,
                current: playerPower
            };
        }

        // Check entry cost
        if (requirements.entryCost) {
            const cost = requirements.entryCost;

            if (cost.jade) {
                const currentJade = this.gameState.get('player.jade') || 0;
                if (currentJade < cost.jade) {
                    return {
                        valid: false,
                        reason: 'insufficient_jade',
                        required: cost.jade,
                        current: currentJade
                    };
                }
            }

            if (cost.spiritCrystals) {
                const currentCrystals = this.gameState.get('player.spiritCrystals') || 0;
                if (currentCrystals < cost.spiritCrystals) {
                    return {
                        valid: false,
                        reason: 'insufficient_crystals',
                        required: cost.spiritCrystals,
                        current: currentCrystals
                    };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Check if tournament should start
     * @param {Object} tournament - Tournament instance
     */
    _checkTournamentStart(tournament) {
        if (tournament.state !== 'registration') {
            return;
        }

        const shouldStart = tournament.options.autoStart &&
            (tournament.participantCount >= tournament.maxParticipants ||
             Date.now() >= tournament.registrationDeadline);

        if (shouldStart) {
            this._startTournament(tournament);
        }
    }

    /**
     * Start tournament
     * @param {Object} tournament - Tournament instance
     */
    _startTournament(tournament) {
        if (tournament.participants.length < 2) {
            // Cancel tournament due to insufficient participants
            this._cancelTournament(tournament);
            return;
        }

        tournament.state = 'in_progress';
        tournament.startTime = Date.now();

        // Generate bracket
        this._generateBracket(tournament);

        // Start first round
        this._startTournamentRound(tournament, 1);

        this.eventManager.emit('tournament:started', {
            tournamentId: tournament.id,
            tournament: this._getPublicTournamentData(tournament),
            participantCount: tournament.participantCount
        });

        console.log(`TournamentSystem: Tournament ${tournament.id} started with ${tournament.participantCount} participants`);
    }

    /**
     * Generate tournament bracket
     * @param {Object} tournament - Tournament instance
     */
    _generateBracket(tournament) {
        const participants = [...tournament.participants];

        // Shuffle participants for random seeding
        for (let i = participants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [participants[i], participants[j]] = [participants[j], participants[i]];
        }

        // Calculate rounds needed
        tournament.totalRounds = Math.ceil(Math.log2(participants.length));

        // Create bracket structure
        tournament.bracket = {
            participants: participants,
            rounds: []
        };

        // Generate round 1 matches
        const round1Matches = [];
        for (let i = 0; i < participants.length; i += 2) {
            if (i + 1 < participants.length) {
                round1Matches.push({
                    participant1: participants[i],
                    participant2: participants[i + 1],
                    winner: null,
                    completed: false
                });
            } else {
                // Bye (advance automatically)
                round1Matches.push({
                    participant1: participants[i],
                    participant2: null,
                    winner: participants[i],
                    completed: true,
                    bye: true
                });
            }
        }

        tournament.bracket.rounds.push(round1Matches);

        // Generate remaining rounds (empty for now)
        for (let round = 2; round <= tournament.totalRounds; round++) {
            tournament.bracket.rounds.push([]);
        }
    }

    /**
     * Start tournament round
     * @param {Object} tournament - Tournament instance
     * @param {number} roundNumber - Round number to start
     */
    _startTournamentRound(tournament, roundNumber) {
        tournament.currentRound = roundNumber;

        const matches = tournament.bracket.rounds[roundNumber - 1];

        // Process matches
        for (const match of matches) {
            if (match.bye) {
                continue; // Skip bye matches
            }

            if (match.participant1.id === 'player' || match.participant2.id === 'player') {
                // Player match - start combat
                const opponent = match.participant1.id === 'player' ? match.participant2 : match.participant1;
                this._startTournamentMatch(tournament, match, opponent);
            } else {
                // AI vs AI - simulate result
                setTimeout(() => {
                    this._simulateAIMatch(tournament, match);
                }, 1000 + Math.random() * 3000); // 1-4 second delay
            }
        }

        this.eventManager.emit('tournament:round_started', {
            tournamentId: tournament.id,
            round: roundNumber,
            matches: matches.length
        });
    }

    /**
     * Start tournament match involving player
     * @param {Object} tournament - Tournament instance
     * @param {Object} match - Match data
     * @param {Object} opponent - Player's opponent
     */
    _startTournamentMatch(tournament, match, opponent) {
        // Store match context for when combat ends
        match.combatId = null;
        match.isPlayerMatch = true;

        // Convert opponent to combat format
        const combatOpponent = {
            id: opponent.id,
            name: opponent.name,
            description: `Tournament participant from ${opponent.cultivation.realm}`,
            powerLevel: 'medium',
            cultivation: opponent.cultivation,
            power: opponent.power,
            ai: { aggression: 0.7, technique_usage: 0.6, retreat_threshold: 0.1 },
            abilities: ['basic_attack', 'defend', 'technique'],
            loot: null // No loot in tournaments
        };

        // Start combat
        const combatResult = this.combatSystem.startCombat(combatOpponent, {
            type: 'tournament',
            allowRetreat: false
        });

        if (combatResult.success) {
            match.combatId = combatResult.combatId;

            this.eventManager.emit('tournament:match_started', {
                tournamentId: tournament.id,
                combatId: combatResult.combatId,
                opponent: opponent,
                round: tournament.currentRound
            });
        } else {
            // Combat failed to start - player loses by default
            this._completeTournamentMatch(tournament, match, opponent);
        }
    }

    /**
     * Simulate AI vs AI match
     * @param {Object} tournament - Tournament instance
     * @param {Object} match - Match data
     */
    _simulateAIMatch(tournament, match) {
        const participant1 = match.participant1;
        const participant2 = match.participant2;

        // Calculate win probability based on power difference
        const powerRatio = participant1.power / participant2.power;
        const winProbability = 1 / (1 + Math.pow(2, -(powerRatio - 1) * 5));

        const winner = Math.random() < winProbability ? participant1 : participant2;
        const loser = winner === participant1 ? participant2 : participant1;

        this._completeTournamentMatch(tournament, match, winner);
    }

    /**
     * Handle tournament match result from combat system
     * @param {Object} combatData - Combat end data
     */
    _handleTournamentMatchResult(combatData) {
        // Find tournament and match for this combat
        let tournament = null;
        let match = null;

        for (const [id, t] of this.activeTournaments) {
            if (t.state === 'in_progress') {
                const currentRoundMatches = t.bracket.rounds[t.currentRound - 1];
                for (const m of currentRoundMatches) {
                    if (m.combatId === combatData.combatId) {
                        tournament = t;
                        match = m;
                        break;
                    }
                }
                if (match) break;
            }
        }

        if (!tournament || !match) {
            return; // Not a tournament match
        }

        // Determine winner
        let winner, loser;
        if (combatData.result === 'victory') {
            winner = match.participant1.id === 'player' ? match.participant1 : match.participant2;
            loser = match.participant1.id === 'player' ? match.participant2 : match.participant1;
        } else {
            winner = match.participant1.id === 'player' ? match.participant2 : match.participant1;
            loser = match.participant1.id === 'player' ? match.participant1 : match.participant2;
        }

        this._completeTournamentMatch(tournament, match, winner);

        // Update player tournament stats
        if (combatData.result === 'victory') {
            this.playerTournamentData.tournamentWins++;
        } else {
            this.playerTournamentData.tournamentLosses++;
        }
    }

    /**
     * Complete tournament match
     * @param {Object} tournament - Tournament instance
     * @param {Object} match - Match data
     * @param {Object} winner - Match winner
     */
    _completeTournamentMatch(tournament, match, winner) {
        match.winner = winner;
        match.completed = true;

        const loser = match.participant1 === winner ? match.participant2 : match.participant1;

        // Update participant records
        winner.wins++;
        if (loser) {
            loser.losses++;
            loser.isEliminated = true;
        }

        this.eventManager.emit('tournament:match_completed', {
            tournamentId: tournament.id,
            match: match,
            winner: winner,
            round: tournament.currentRound
        });

        // Check if round is complete
        this._checkRoundCompletion(tournament);
    }

    /**
     * Check if current round is complete
     * @param {Object} tournament - Tournament instance
     */
    _checkRoundCompletion(tournament) {
        const currentRoundMatches = tournament.bracket.rounds[tournament.currentRound - 1];
        const completedMatches = currentRoundMatches.filter(m => m.completed);

        if (completedMatches.length === currentRoundMatches.length) {
            // Round complete
            this._completeRound(tournament);
        }
    }

    /**
     * Complete current round and advance tournament
     * @param {Object} tournament - Tournament instance
     */
    _completeRound(tournament) {
        const currentRoundMatches = tournament.bracket.rounds[tournament.currentRound - 1];

        this.eventManager.emit('tournament:round_completed', {
            tournamentId: tournament.id,
            round: tournament.currentRound,
            results: currentRoundMatches
        });

        if (tournament.currentRound >= tournament.totalRounds) {
            // Tournament complete
            this._completeTournament(tournament);
        } else {
            // Generate next round
            this._generateNextRound(tournament);
            this._startTournamentRound(tournament, tournament.currentRound + 1);
        }
    }

    /**
     * Generate next round matches
     * @param {Object} tournament - Tournament instance
     */
    _generateNextRound(tournament) {
        const currentRoundMatches = tournament.bracket.rounds[tournament.currentRound - 1];
        const nextRoundIndex = tournament.currentRound;
        const nextRoundMatches = [];

        // Get winners from current round
        const winners = currentRoundMatches.map(match => match.winner).filter(w => w !== null);

        // Create next round matches
        for (let i = 0; i < winners.length; i += 2) {
            if (i + 1 < winners.length) {
                nextRoundMatches.push({
                    participant1: winners[i],
                    participant2: winners[i + 1],
                    winner: null,
                    completed: false
                });
            } else {
                // Bye (shouldn't happen in proper bracket)
                nextRoundMatches.push({
                    participant1: winners[i],
                    participant2: null,
                    winner: winners[i],
                    completed: true,
                    bye: true
                });
            }
        }

        tournament.bracket.rounds[nextRoundIndex] = nextRoundMatches;
    }

    /**
     * Complete tournament
     * @param {Object} tournament - Tournament instance
     */
    _completeTournament(tournament) {
        tournament.state = 'completed';
        tournament.endTime = Date.now();

        // Determine final standings
        this._calculateFinalStandings(tournament);

        // Award rewards
        this._awardTournamentRewards(tournament);

        // Add to history
        this._addToTournamentHistory(tournament);

        // Update statistics
        this.statistics.completionRate = (this.statistics.completionRate * (this.statistics.totalTournaments - 1) + 1) / this.statistics.totalTournaments;

        this.eventManager.emit('tournament:completed', {
            tournamentId: tournament.id,
            tournament: this._getPublicTournamentData(tournament),
            winner: tournament.winner,
            finalStandings: tournament.finalStandings
        });

        console.log(`TournamentSystem: Tournament ${tournament.id} completed`);
    }

    /**
     * Calculate final standings
     * @param {Object} tournament - Tournament instance
     */
    _calculateFinalStandings(tournament) {
        const participants = tournament.participants;

        // Sort by wins (descending), then by losses (ascending)
        participants.sort((a, b) => {
            if (a.wins !== b.wins) {
                return b.wins - a.wins;
            }
            return a.losses - b.losses;
        });

        tournament.finalStandings = participants.map((participant, index) => ({
            position: index + 1,
            participant: participant,
            wins: participant.wins,
            losses: participant.losses
        }));

        tournament.winner = participants[0];

        // Update player best finish
        const playerStanding = tournament.finalStandings.find(s => s.participant.id === 'player');
        if (playerStanding) {
            if (!this.playerTournamentData.bestFinish || playerStanding.position < this.playerTournamentData.bestFinish) {
                this.playerTournamentData.bestFinish = playerStanding.position;
            }

            if (playerStanding.position === 1) {
                this.playerTournamentData.tournamentsWon++;
            }
        }
    }

    /**
     * Award tournament rewards
     * @param {Object} tournament - Tournament instance
     */
    _awardTournamentRewards(tournament) {
        const playerStanding = tournament.finalStandings.find(s => s.participant.id === 'player');
        if (!playerStanding) {
            return; // Player didn't participate
        }

        const position = playerStanding.position;
        let rewards = null;

        // Determine rewards based on position
        if (position === 1 && tournament.rewards.first) {
            rewards = tournament.rewards.first;
        } else if (position === 2 && tournament.rewards.second) {
            rewards = tournament.rewards.second;
        } else if (position === 3 && tournament.rewards.third) {
            rewards = tournament.rewards.third;
        } else if (position <= 8 && tournament.rewards.top8) {
            rewards = tournament.rewards.top8;
        } else if (tournament.rewards.participation) {
            rewards = tournament.rewards.participation;
        }

        if (rewards) {
            // Award jade
            if (rewards.jade) {
                this.gameState.increment('player.jade', rewards.jade);
                this.playerTournamentData.totalRewardsEarned.jade += rewards.jade;
            }

            // Award spirit crystals
            if (rewards.spiritCrystals) {
                this.gameState.increment('player.spiritCrystals', rewards.spiritCrystals);
                this.playerTournamentData.totalRewardsEarned.spiritCrystals += rewards.spiritCrystals;
            }

            // Award title
            if (rewards.title) {
                if (!this.playerTournamentData.titles.includes(rewards.title)) {
                    this.playerTournamentData.titles.push(rewards.title);

                    const availableTitles = this.gameState.get('player.availableTitles') || [];
                    if (!availableTitles.includes(rewards.title)) {
                        availableTitles.push(rewards.title);
                        this.gameState.set('player.availableTitles', availableTitles);
                    }
                }
            }

            this.eventManager.emit('tournament:rewards_awarded', {
                tournamentId: tournament.id,
                position: position,
                rewards: rewards
            });
        }
    }

    /**
     * Add tournament to history
     * @param {Object} tournament - Tournament instance
     */
    _addToTournamentHistory(tournament) {
        const playerStanding = tournament.finalStandings.find(s => s.participant.id === 'player');

        const historyEntry = {
            id: tournament.id,
            name: tournament.name,
            type: tournament.type,
            startTime: tournament.startTime,
            endTime: tournament.endTime,
            participantCount: tournament.participantCount,
            winner: tournament.winner,
            playerParticipated: !!playerStanding,
            playerPosition: playerStanding ? playerStanding.position : null,
            playerWins: playerStanding ? playerStanding.wins : 0,
            playerLosses: playerStanding ? playerStanding.losses : 0
        };

        this.tournamentHistory.push(historyEntry);

        // Limit history size
        if (this.tournamentHistory.length > 50) {
            this.tournamentHistory = this.tournamentHistory.slice(-30);
        }
    }

    /**
     * Cancel tournament
     * @param {Object} tournament - Tournament instance
     */
    _cancelTournament(tournament) {
        tournament.state = 'cancelled';
        tournament.endTime = Date.now();

        // Refund entry fees
        const playerParticipant = tournament.participants.find(p => p.id === 'player');
        if (playerParticipant && tournament.config.entryRequirement.entryCost) {
            const cost = tournament.config.entryRequirement.entryCost;
            if (cost.jade) {
                this.gameState.increment('player.jade', cost.jade);
            }
            if (cost.spiritCrystals) {
                this.gameState.increment('player.spiritCrystals', cost.spiritCrystals);
            }
        }

        this.eventManager.emit('tournament:cancelled', {
            tournamentId: tournament.id,
            reason: 'insufficient_participants'
        });
    }

    /**
     * Get public tournament data
     * @param {Object} tournament - Tournament instance
     * @returns {Object} Public tournament data
     */
    _getPublicTournamentData(tournament) {
        return {
            name: tournament.name,
            description: tournament.description,
            type: tournament.type,
            state: tournament.state,
            startTime: tournament.startTime,
            endTime: tournament.endTime,
            registrationDeadline: tournament.registrationDeadline,
            participantCount: tournament.participantCount,
            maxParticipants: tournament.maxParticipants,
            currentRound: tournament.currentRound,
            totalRounds: tournament.totalRounds,
            entryRequirement: tournament.config.entryRequirement,
            rewards: tournament.rewards,
            winner: tournament.winner,
            finalStandings: tournament.finalStandings || [],
            bracket: tournament.bracket
        };
    }

    /**
     * Update most popular tournament type
     * @param {string} type - Tournament type
     */
    _updateMostPopularType(type) {
        // Simple implementation - could be more sophisticated
        this.statistics.mostPopularType = type;
    }

    /**
     * Clean up completed tournaments
     */
    _cleanupCompletedTournaments() {
        const now = Date.now();
        const cleanupDelay = 24 * 60 * 60 * 1000; // 24 hours

        for (const [id, tournament] of this.activeTournaments) {
            if ((tournament.state === 'completed' || tournament.state === 'cancelled') &&
                tournament.endTime && (now - tournament.endTime > cleanupDelay)) {

                this.activeTournaments.delete(id);
                console.log(`TournamentSystem: Cleaned up tournament ${id}`);
            }
        }
    }

    /**
     * Save tournament data
     */
    _saveTournamentData() {
        this.gameState.update({
            playerTournamentData: this.playerTournamentData,
            tournamentStats: this.statistics,
            tournamentHistory: this.tournamentHistory
        }, { source: 'tournament:save' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TournamentSystem };
} else if (typeof window !== 'undefined') {
    window.TournamentSystem = TournamentSystem;
}