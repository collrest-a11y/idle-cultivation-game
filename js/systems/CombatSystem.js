/**
 * CombatSystem - Turn-based combat engine with action queuing and state management
 * Handles combat mechanics, turn order, damage calculation, and victory conditions
 */
class CombatSystem {
    constructor(gameState, eventManager, powerCalculator) {
        this.gameState = gameState;
        this.eventManager = eventManager;
        this.powerCalculator = powerCalculator;

        // Combat state
        this.currentCombat = null;
        this.combatId = 0;

        // Combat statistics
        this.statistics = {
            combatsStarted: 0,
            combatsWon: 0,
            combatsLost: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            averageCombatDuration: 0,
            criticalHits: 0,
            perfectVictories: 0 // No damage taken
        };

        this.isInitialized = false;

        console.log('CombatSystem: Initialized');
    }

    /**
     * Initialize the combat system
     */
    async initialize() {
        try {
            // Load combat statistics
            const savedStats = this.gameState.get('combatStats');
            if (savedStats) {
                this.statistics = {
                    ...this.statistics,
                    ...savedStats
                };
            }

            // Set up event listeners
            this._setupEventListeners();

            this.isInitialized = true;

            this.eventManager.emit('combat:initialized', {
                statistics: this.statistics
            });

            console.log('CombatSystem: Initialization complete');

        } catch (error) {
            console.error('CombatSystem: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start a new combat encounter
     * @param {Object} opponent - Opponent data
     * @param {Object} options - Combat options
     * @returns {Object} Combat initialization result
     */
    startCombat(opponent, options = {}) {
        if (!this.isInitialized) {
            throw new Error('CombatSystem not initialized');
        }

        if (this.currentCombat) {
            throw new Error('Combat already in progress');
        }

        const config = {
            type: 'pve', // 'pve' or 'pvp'
            allowRetreat: true,
            timeLimit: 300000, // 5 minutes
            ...options
        };

        // Create combat instance
        this.combatId++;
        this.currentCombat = this._createCombatInstance(opponent, config);

        // Update statistics
        this.statistics.combatsStarted++;

        // Initialize combat
        this._initializeCombatants();
        this._calculateTurnOrder();

        this.eventManager.emit('combat:started', {
            combatId: this.combatId,
            player: this.currentCombat.player,
            opponent: this.currentCombat.opponent,
            turnOrder: this.currentCombat.turnOrder,
            config: config
        });

        console.log(`CombatSystem: Combat ${this.combatId} started against ${opponent.name}`);

        return {
            success: true,
            combatId: this.combatId,
            combat: this._getPublicCombatState()
        };
    }

    /**
     * Execute a combat action
     * @param {string} action - Action type
     * @param {Object} actionData - Action parameters
     * @returns {Object} Action result
     */
    executeAction(action, actionData = {}) {
        if (!this.currentCombat) {
            throw new Error('No combat in progress');
        }

        if (this.currentCombat.state !== 'in_progress') {
            throw new Error('Combat is not in progress');
        }

        // Validate it's the player's turn
        const currentTurn = this.currentCombat.turnOrder[this.currentCombat.currentTurnIndex];
        if (currentTurn !== 'player') {
            throw new Error('Not player turn');
        }

        // Validate and execute action
        const actionResult = this._executePlayerAction(action, actionData);

        // Check for combat end conditions
        this._checkCombatEnd();

        // Process AI turn if combat continues
        if (this.currentCombat && this.currentCombat.state === 'in_progress') {
            setTimeout(() => {
                this._processAITurn();
            }, 1000); // 1 second delay for AI action
        }

        return actionResult;
    }

    /**
     * Attempt to retreat from combat
     * @returns {Object} Retreat result
     */
    attemptRetreat() {
        if (!this.currentCombat) {
            throw new Error('No combat in progress');
        }

        if (!this.currentCombat.config.allowRetreat) {
            return {
                success: false,
                reason: 'retreat_not_allowed'
            };
        }

        // Calculate retreat chance based on relative power and current health
        const playerPower = this.currentCombat.player.power;
        const opponentPower = this.currentCombat.opponent.power;
        const healthRatio = this.currentCombat.player.currentHealth / this.currentCombat.player.maxHealth;

        let retreatChance = 0.5; // Base 50% chance

        // Higher chance if opponent is much stronger
        if (opponentPower > playerPower * 1.5) {
            retreatChance += 0.3;
        }

        // Lower chance if opponent is weaker
        if (playerPower > opponentPower * 1.5) {
            retreatChance -= 0.2;
        }

        // Health affects retreat chance
        retreatChance += (1 - healthRatio) * 0.2;

        retreatChance = Math.max(0.1, Math.min(0.9, retreatChance));

        const success = Math.random() < retreatChance;

        if (success) {
            this._endCombat('retreated');

            this.eventManager.emit('combat:retreated', {
                combatId: this.combatId,
                chance: retreatChance
            });

            return {
                success: true,
                chance: retreatChance
            };
        } else {
            // Failed retreat counts as a turn
            this._advanceTurn();

            this.eventManager.emit('combat:retreat_failed', {
                combatId: this.combatId,
                chance: retreatChance
            });

            return {
                success: false,
                reason: 'failed_attempt',
                chance: retreatChance
            };
        }
    }

    /**
     * Get current combat state (public view)
     * @returns {Object|null} Combat state or null if no combat
     */
    getCurrentCombat() {
        if (!this.currentCombat) {
            return null;
        }

        return this._getPublicCombatState();
    }

    /**
     * Get combat statistics
     * @returns {Object} Combat statistics
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * End current combat (admin/debug function)
     * @param {string} result - Combat result
     */
    forceEndCombat(result = 'cancelled') {
        if (this.currentCombat) {
            this._endCombat(result);
        }
    }

    // Private methods

    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Save statistics on game state save
        this.eventManager.on('gameState:save', () => {
            this._saveStatistics();
        });

        // Handle time-based events
        this.eventManager.on('combat:turn_timeout', (data) => {
            if (data.combatId === this.combatId) {
                this._handleTurnTimeout();
            }
        });
    }

    /**
     * Create a new combat instance
     * @param {Object} opponent - Opponent data
     * @param {Object} config - Combat configuration
     * @returns {Object} Combat instance
     */
    _createCombatInstance(opponent, config) {
        const playerData = this._getPlayerCombatData();
        const opponentData = this._getOpponentCombatData(opponent);

        return {
            id: this.combatId,
            state: 'initializing', // 'initializing', 'in_progress', 'ended'
            result: null, // 'victory', 'defeat', 'retreated', 'timeout'
            startTime: Date.now(),
            endTime: null,
            config: config,

            player: playerData,
            opponent: opponentData,

            turnOrder: [],
            currentTurnIndex: 0,
            turnNumber: 1,

            combatLog: [],
            statusEffects: {
                player: [],
                opponent: []
            },

            lastActionTime: Date.now(),
            turnTimeLimit: 30000 // 30 seconds per turn
        };
    }

    /**
     * Get player combat data
     * @returns {Object} Player combat data
     */
    _getPlayerCombatData() {
        const powerCalc = this.powerCalculator.calculatePlayerPower({ breakdown: true });
        const combatStats = this.powerCalculator.calculateCombatStats(
            this.powerCalculator._getPlayerData()
        );

        return {
            type: 'player',
            name: 'Player', // Could be customizable
            power: powerCalc.total,
            powerBreakdown: powerCalc.breakdown,

            maxHealth: combatStats.maxHealth,
            currentHealth: combatStats.maxHealth,
            maxQi: combatStats.maxQi,
            currentQi: combatStats.maxQi,
            initiative: combatStats.initiative,

            actionCooldowns: {},
            lastAction: null,

            abilities: this._getPlayerAbilities(),
            modifiers: combatStats.modifiers
        };
    }

    /**
     * Get opponent combat data
     * @param {Object} opponent - Opponent definition
     * @returns {Object} Opponent combat data
     */
    _getOpponentCombatData(opponent) {
        const opponentEntity = {
            cultivation: opponent.cultivation,
            equippedScriptures: opponent.scriptures || [],
            equipment: opponent.equipment || {}
        };

        const powerCalc = this.powerCalculator.calculateTotalPower(opponentEntity, { breakdown: true });
        const combatStats = this.powerCalculator.calculateCombatStats(opponentEntity);

        return {
            type: 'opponent',
            id: opponent.id,
            name: opponent.name,
            description: opponent.description,
            powerLevel: opponent.powerLevel,

            power: powerCalc.total,
            powerBreakdown: powerCalc.breakdown,

            maxHealth: combatStats.maxHealth,
            currentHealth: combatStats.maxHealth,
            maxQi: combatStats.maxQi,
            currentQi: combatStats.maxQi,
            initiative: combatStats.initiative,

            actionCooldowns: {},
            lastAction: null,

            abilities: opponent.abilities || ['basic_attack'],
            ai: opponent.ai || { aggression: 0.5, technique_usage: 0.3, retreat_threshold: 0.2 },
            modifiers: combatStats.modifiers,

            loot: opponent.loot
        };
    }

    /**
     * Get available abilities for the player
     * @returns {Array} Available abilities
     */
    _getPlayerAbilities() {
        const abilities = ['basic_attack', 'defend'];

        // Add abilities based on cultivation realm
        const realm = this.gameState.get('realm.current');
        const realmData = window.CULTIVATION_REALMS ? window.CULTIVATION_REALMS[realm] : null;

        if (realmData && realmData.abilities) {
            abilities.push(...realmData.abilities);
        }

        // Add technique-based abilities
        const equippedScriptures = this.gameState.get('scriptures.equipped') || {};
        Object.values(equippedScriptures).forEach(scriptureId => {
            if (scriptureId) {
                abilities.push('technique'); // Generic technique ability
            }
        });

        return [...new Set(abilities)]; // Remove duplicates
    }

    /**
     * Initialize combatants for the fight
     */
    _initializeCombatants() {
        this.currentCombat.state = 'in_progress';

        // Apply any pre-combat effects
        this._applyInitialEffects();

        this.eventManager.emit('combat:combatants_initialized', {
            combatId: this.combatId,
            player: this.currentCombat.player,
            opponent: this.currentCombat.opponent
        });
    }

    /**
     * Calculate turn order based on initiative
     */
    _calculateTurnOrder() {
        const playerInitiative = this.currentCombat.player.initiative;
        const opponentInitiative = this.currentCombat.opponent.initiative;

        // Simple turn order: highest initiative goes first, then alternating
        if (playerInitiative >= opponentInitiative) {
            this.currentCombat.turnOrder = ['player', 'opponent'];
        } else {
            this.currentCombat.turnOrder = ['opponent', 'player'];
        }

        this.currentCombat.currentTurnIndex = 0;

        this.eventManager.emit('combat:turn_order_calculated', {
            combatId: this.combatId,
            turnOrder: this.currentCombat.turnOrder,
            playerInitiative: playerInitiative,
            opponentInitiative: opponentInitiative
        });
    }

    /**
     * Execute a player action
     * @param {string} action - Action type
     * @param {Object} actionData - Action parameters
     * @returns {Object} Action result
     */
    _executePlayerAction(action, actionData) {
        const combat = this.currentCombat;
        const player = combat.player;
        const opponent = combat.opponent;

        // Validate action availability
        const actionValidation = this._validateAction(action, actionData, player);
        if (!actionValidation.valid) {
            return {
                success: false,
                reason: actionValidation.reason,
                message: actionValidation.message
            };
        }

        // Execute the action
        const actionResult = this._performAction(action, actionData, player, opponent);

        // Apply action costs and cooldowns
        this._applyActionCosts(action, actionData, player);

        // Process status effects
        this._processStatusEffects('player');

        // Add to combat log
        this._addToCombatLog({
            actor: 'player',
            action: action,
            result: actionResult,
            timestamp: Date.now()
        });

        // Advance turn
        this._advanceTurn();

        this.eventManager.emit('combat:action_executed', {
            combatId: this.combatId,
            actor: 'player',
            action: action,
            result: actionResult,
            combatState: this._getPublicCombatState()
        });

        return {
            success: true,
            result: actionResult,
            combatState: this._getPublicCombatState()
        };
    }

    /**
     * Process AI turn
     */
    _processAITurn() {
        if (!this.currentCombat || this.currentCombat.state !== 'in_progress') {
            return;
        }

        const combat = this.currentCombat;
        const currentTurn = combat.turnOrder[combat.currentTurnIndex];

        if (currentTurn !== 'opponent') {
            return;
        }

        const opponent = combat.opponent;
        const player = combat.player;

        // AI decision making
        const aiAction = this._selectAIAction(opponent, player);

        // Execute AI action
        const actionResult = this._performAction(aiAction.action, aiAction.data, opponent, player);

        // Apply costs and effects
        this._applyActionCosts(aiAction.action, aiAction.data, opponent);
        this._processStatusEffects('opponent');

        // Add to combat log
        this._addToCombatLog({
            actor: 'opponent',
            action: aiAction.action,
            result: actionResult,
            timestamp: Date.now()
        });

        // Check for combat end
        this._checkCombatEnd();

        // Advance turn if combat continues
        if (this.currentCombat && this.currentCombat.state === 'in_progress') {
            this._advanceTurn();
        }

        this.eventManager.emit('combat:ai_action_executed', {
            combatId: this.combatId,
            action: aiAction.action,
            result: actionResult,
            combatState: this._getPublicCombatState()
        });
    }

    /**
     * Select AI action based on opponent AI configuration
     * @param {Object} opponent - Opponent data
     * @param {Object} player - Player data
     * @returns {Object} Selected action
     */
    _selectAIAction(opponent, player) {
        const ai = opponent.ai;
        const healthRatio = opponent.currentHealth / opponent.maxHealth;
        const playerHealthRatio = player.currentHealth / player.maxHealth;

        // Retreat logic
        if (healthRatio < ai.retreat_threshold && Math.random() < 0.3) {
            return { action: 'retreat', data: {} };
        }

        // Defend if low on health
        if (healthRatio < 0.3 && Math.random() < 0.4) {
            return { action: 'defend', data: {} };
        }

        // Use technique based on AI settings
        if (opponent.currentQi >= 20 && Math.random() < ai.technique_usage) {
            const techniques = opponent.abilities.filter(ability =>
                ability !== 'basic_attack' && ability !== 'defend' && ability !== 'retreat'
            );

            if (techniques.length > 0) {
                const technique = techniques[Math.floor(Math.random() * techniques.length)];
                return { action: 'technique', data: { technique: technique } };
            }
        }

        // Default to basic attack with some aggression-based variation
        if (Math.random() < ai.aggression) {
            return { action: 'attack', data: { aggressive: true } };
        } else {
            return { action: 'attack', data: {} };
        }
    }

    /**
     * Validate if an action can be performed
     * @param {string} action - Action type
     * @param {Object} actionData - Action data
     * @param {Object} actor - Actor performing the action
     * @returns {Object} Validation result
     */
    _validateAction(action, actionData, actor) {
        const actionConfig = window.COMBAT_ACTIONS[action.toUpperCase()];

        if (!actionConfig) {
            return {
                valid: false,
                reason: 'invalid_action',
                message: `Unknown action: ${action}`
            };
        }

        // Check cooldown
        const cooldownKey = action;
        const lastUsed = actor.actionCooldowns[cooldownKey] || 0;
        const cooldownTime = actionConfig.cooldown * 1000; // Convert to milliseconds

        if (Date.now() - lastUsed < cooldownTime) {
            return {
                valid: false,
                reason: 'on_cooldown',
                message: `Action is on cooldown`
            };
        }

        // Check qi cost
        if (actor.currentQi < actionConfig.qiCost) {
            return {
                valid: false,
                reason: 'insufficient_qi',
                message: `Not enough qi (need ${actionConfig.qiCost}, have ${actor.currentQi})`
            };
        }

        // Check status effect restrictions
        const statusEffects = this.currentCombat.statusEffects[actor.type === 'player' ? 'player' : 'opponent'];
        for (const effect of statusEffects) {
            if (effect.preventTechniques && action === 'technique') {
                return {
                    valid: false,
                    reason: 'status_prevented',
                    message: 'Qi disruption prevents technique use'
                };
            }

            if (effect.skipTurn) {
                return {
                    valid: false,
                    reason: 'stunned',
                    message: 'Cannot act while stunned'
                };
            }
        }

        return { valid: true };
    }

    /**
     * Perform a combat action
     * @param {string} action - Action type
     * @param {Object} actionData - Action data
     * @param {Object} actor - Actor performing action
     * @param {Object} target - Target of action
     * @returns {Object} Action result
     */
    _performAction(action, actionData, actor, target) {
        const actionConfig = window.COMBAT_ACTIONS[action.toUpperCase()] || window.COMBAT_ACTIONS.ATTACK;

        switch (action.toLowerCase()) {
            case 'attack':
                return this._performAttack(actor, target, actionData);

            case 'defend':
                return this._performDefend(actor, actionData);

            case 'technique':
                return this._performTechnique(actor, target, actionData);

            case 'retreat':
                return this._performRetreat(actor);

            default:
                return this._performAttack(actor, target, actionData);
        }
    }

    /**
     * Perform basic attack
     * @param {Object} actor - Attacker
     * @param {Object} target - Target
     * @param {Object} actionData - Action parameters
     * @returns {Object} Attack result
     */
    _performAttack(actor, target, actionData) {
        const actionConfig = window.COMBAT_ACTIONS.ATTACK;

        // Calculate hit chance
        const hitRoll = Math.random();
        const accuracy = actionConfig.accuracy * (actionData.aggressive ? 0.9 : 1.0);

        if (hitRoll > accuracy) {
            return {
                type: 'miss',
                damage: 0,
                message: `${actor.name} attacks but misses!`
            };
        }

        // Calculate critical hit
        const critRoll = Math.random();
        const critChance = actionConfig.critChance * (actionData.aggressive ? 1.5 : 1.0);
        const isCritical = critRoll < critChance;

        // Calculate damage
        const damage = window.COMBAT_FORMULAS.calculateDamage(
            actor.power,
            target.power,
            'ATTACK',
            isCritical,
            actor.modifiers
        );

        // Apply damage
        target.currentHealth = Math.max(0, target.currentHealth - damage);

        // Update statistics
        if (actor.type === 'player') {
            this.statistics.totalDamageDealt += damage;
            if (isCritical) {
                this.statistics.criticalHits++;
            }
        } else {
            this.statistics.totalDamageReceived += damage;
        }

        return {
            type: isCritical ? 'critical_hit' : 'hit',
            damage: damage,
            remainingHealth: target.currentHealth,
            message: `${actor.name} ${isCritical ? 'critically ' : ''}attacks for ${damage} damage!`
        };
    }

    /**
     * Perform defend action
     * @param {Object} actor - Defender
     * @param {Object} actionData - Action parameters
     * @returns {Object} Defend result
     */
    _performDefend(actor, actionData) {
        const actionConfig = window.COMBAT_ACTIONS.DEFEND;

        // Restore qi
        const qiGain = actionConfig.qiGain;
        actor.currentQi = Math.min(actor.maxQi, actor.currentQi + qiGain);

        // Apply temporary defense boost
        this._applyStatusEffect(actor, {
            id: 'defending',
            name: 'Defending',
            damageReduction: actionConfig.damageReduction,
            duration: 1, // Lasts until next turn
            temporary: true
        });

        return {
            type: 'defend',
            qiGain: qiGain,
            message: `${actor.name} takes a defensive stance and recovers ${qiGain} qi!`
        };
    }

    /**
     * Perform technique action
     * @param {Object} actor - Technique user
     * @param {Object} target - Target
     * @param {Object} actionData - Action parameters
     * @returns {Object} Technique result
     */
    _performTechnique(actor, target, actionData) {
        const actionConfig = window.COMBAT_ACTIONS.TECHNIQUE;

        // For now, techniques are enhanced attacks
        // In the future, specific techniques could have unique effects

        const hitRoll = Math.random();
        if (hitRoll > actionConfig.accuracy) {
            return {
                type: 'miss',
                damage: 0,
                message: `${actor.name}'s technique misses!`
            };
        }

        const critRoll = Math.random();
        const isCritical = critRoll < actionConfig.critChance;

        const damage = window.COMBAT_FORMULAS.calculateDamage(
            actor.power,
            target.power,
            'TECHNIQUE',
            isCritical,
            actor.modifiers
        );

        target.currentHealth = Math.max(0, target.currentHealth - damage);

        // Update statistics
        if (actor.type === 'player') {
            this.statistics.totalDamageDealt += damage;
            if (isCritical) {
                this.statistics.criticalHits++;
            }
        } else {
            this.statistics.totalDamageReceived += damage;
        }

        return {
            type: isCritical ? 'critical_technique' : 'technique',
            damage: damage,
            remainingHealth: target.currentHealth,
            message: `${actor.name} uses a powerful technique for ${damage} damage!`
        };
    }

    /**
     * Perform retreat action (for AI)
     * @param {Object} actor - Actor attempting to retreat
     * @returns {Object} Retreat result
     */
    _performRetreat(actor) {
        if (actor.type === 'player') {
            return this.attemptRetreat();
        }

        // AI retreat logic
        const retreatChance = 0.7; // AI has 70% base retreat chance
        const success = Math.random() < retreatChance;

        if (success) {
            this._endCombat('opponent_retreated');
            return {
                type: 'retreat_success',
                message: `${actor.name} successfully retreats from combat!`
            };
        } else {
            return {
                type: 'retreat_failed',
                message: `${actor.name} fails to retreat!`
            };
        }
    }

    /**
     * Apply action costs and cooldowns
     * @param {string} action - Action performed
     * @param {Object} actionData - Action data
     * @param {Object} actor - Actor who performed action
     */
    _applyActionCosts(action, actionData, actor) {
        const actionConfig = window.COMBAT_ACTIONS[action.toUpperCase()] || window.COMBAT_ACTIONS.ATTACK;

        // Apply qi cost
        actor.currentQi = Math.max(0, actor.currentQi - actionConfig.qiCost);

        // Set cooldown
        if (actionConfig.cooldown > 0) {
            actor.actionCooldowns[action] = Date.now();
        }

        // Update last action
        actor.lastAction = {
            action: action,
            timestamp: Date.now()
        };
    }

    /**
     * Apply status effect to an actor
     * @param {Object} actor - Target actor
     * @param {Object} effect - Status effect
     */
    _applyStatusEffect(actor, effect) {
        const effectsList = this.currentCombat.statusEffects[actor.type === 'player' ? 'player' : 'opponent'];

        // Check if effect is stackable
        if (!effect.stackable) {
            // Remove existing instances of the same effect
            const existingIndex = effectsList.findIndex(e => e.id === effect.id);
            if (existingIndex !== -1) {
                effectsList.splice(existingIndex, 1);
            }
        }

        // Add new effect
        effectsList.push({
            ...effect,
            startTime: Date.now(),
            remainingDuration: effect.duration
        });
    }

    /**
     * Process status effects for an actor
     * @param {string} actorType - 'player' or 'opponent'
     */
    _processStatusEffects(actorType) {
        const effectsList = this.currentCombat.statusEffects[actorType];
        const actor = actorType === 'player' ? this.currentCombat.player : this.currentCombat.opponent;

        // Process each effect
        for (let i = effectsList.length - 1; i >= 0; i--) {
            const effect = effectsList[i];

            // Apply damage over time effects
            if (effect.damagePerTurn) {
                const damage = Math.floor(actor.maxHealth * effect.damagePerTurn);
                actor.currentHealth = Math.max(0, actor.currentHealth - damage);

                this._addToCombatLog({
                    actor: 'system',
                    action: 'status_damage',
                    result: {
                        target: actorType,
                        effect: effect.name,
                        damage: damage
                    },
                    timestamp: Date.now()
                });
            }

            // Reduce duration
            effect.remainingDuration--;

            // Remove expired effects
            if (effect.remainingDuration <= 0) {
                effectsList.splice(i, 1);
            }
        }
    }

    /**
     * Check for combat end conditions
     */
    _checkCombatEnd() {
        if (!this.currentCombat || this.currentCombat.state !== 'in_progress') {
            return;
        }

        const player = this.currentCombat.player;
        const opponent = this.currentCombat.opponent;

        // Check for death
        if (player.currentHealth <= 0) {
            this._endCombat('defeat');
            return;
        }

        if (opponent.currentHealth <= 0) {
            this._endCombat('victory');
            return;
        }

        // Check for timeout
        const combatDuration = Date.now() - this.currentCombat.startTime;
        if (combatDuration > this.currentCombat.config.timeLimit) {
            this._endCombat('timeout');
            return;
        }
    }

    /**
     * End the current combat
     * @param {string} result - Combat result
     */
    _endCombat(result) {
        if (!this.currentCombat) {
            return;
        }

        this.currentCombat.state = 'ended';
        this.currentCombat.result = result;
        this.currentCombat.endTime = Date.now();

        const duration = this.currentCombat.endTime - this.currentCombat.startTime;

        // Update statistics
        if (result === 'victory') {
            this.statistics.combatsWon++;

            // Check for perfect victory
            if (this.currentCombat.player.currentHealth === this.currentCombat.player.maxHealth) {
                this.statistics.perfectVictories++;
            }

            // Process victory rewards
            this._processVictoryRewards();

        } else if (result === 'defeat') {
            this.statistics.combatsLost++;
        }

        // Update average combat duration
        const totalCombats = this.statistics.combatsWon + this.statistics.combatsLost;
        if (totalCombats > 0) {
            this.statistics.averageCombatDuration =
                (this.statistics.averageCombatDuration * (totalCombats - 1) + duration) / totalCombats;
        }

        // Save statistics
        this._saveStatistics();

        this.eventManager.emit('combat:ended', {
            combatId: this.combatId,
            result: result,
            duration: duration,
            player: this.currentCombat.player,
            opponent: this.currentCombat.opponent,
            statistics: this.statistics
        });

        console.log(`CombatSystem: Combat ${this.combatId} ended with result: ${result}`);

        // Clear current combat
        this.currentCombat = null;
    }

    /**
     * Process victory rewards
     */
    _processVictoryRewards() {
        const opponent = this.currentCombat.opponent;

        if (!opponent.loot) {
            return;
        }

        const rewards = {};

        // Calculate jade reward
        if (opponent.loot.jade) {
            const jade = Math.floor(
                opponent.loot.jade.min +
                Math.random() * (opponent.loot.jade.max - opponent.loot.jade.min)
            );
            rewards.jade = jade;
            this.gameState.increment('player.jade', jade);
        }

        // Calculate spirit crystals reward
        if (opponent.loot.spiritCrystals) {
            const crystals = Math.floor(
                opponent.loot.spiritCrystals.min +
                Math.random() * (opponent.loot.spiritCrystals.max - opponent.loot.spiritCrystals.min)
            );
            rewards.spiritCrystals = crystals;
            this.gameState.increment('player.spiritCrystals', crystals);
        }

        // Roll for item drops
        if (opponent.loot.items && opponent.loot.chance) {
            if (Math.random() < opponent.loot.chance) {
                const item = opponent.loot.items[Math.floor(Math.random() * opponent.loot.items.length)];
                rewards.item = item;
                // Item would be added to inventory (not implemented yet)
            }
        }

        this.eventManager.emit('combat:rewards_received', {
            combatId: this.combatId,
            rewards: rewards
        });
    }

    /**
     * Advance to next turn
     */
    _advanceTurn() {
        this.currentCombat.currentTurnIndex =
            (this.currentCombat.currentTurnIndex + 1) % this.currentCombat.turnOrder.length;

        if (this.currentCombat.currentTurnIndex === 0) {
            this.currentCombat.turnNumber++;
        }

        this.currentCombat.lastActionTime = Date.now();

        this.eventManager.emit('combat:turn_advanced', {
            combatId: this.combatId,
            currentTurn: this.currentCombat.turnOrder[this.currentCombat.currentTurnIndex],
            turnNumber: this.currentCombat.turnNumber
        });
    }

    /**
     * Handle turn timeout
     */
    _handleTurnTimeout() {
        if (!this.currentCombat || this.currentCombat.state !== 'in_progress') {
            return;
        }

        const currentTurn = this.currentCombat.turnOrder[this.currentCombat.currentTurnIndex];

        if (currentTurn === 'player') {
            // Auto-defend on player timeout
            this.executeAction('defend');
        }
        // AI turns are handled automatically, so no timeout action needed
    }

    /**
     * Add entry to combat log
     * @param {Object} logEntry - Log entry
     */
    _addToCombatLog(logEntry) {
        this.currentCombat.combatLog.push(logEntry);

        // Limit log size to prevent memory issues
        if (this.currentCombat.combatLog.length > 100) {
            this.currentCombat.combatLog = this.currentCombat.combatLog.slice(-50);
        }
    }

    /**
     * Apply initial combat effects
     */
    _applyInitialEffects() {
        // Apply any pre-combat buffs or effects
        // This could include sect bonuses, temporary effects, etc.
    }

    /**
     * Get public combat state (safe for UI display)
     * @returns {Object} Public combat state
     */
    _getPublicCombatState() {
        if (!this.currentCombat) {
            return null;
        }

        return {
            id: this.currentCombat.id,
            state: this.currentCombat.state,
            result: this.currentCombat.result,
            turnNumber: this.currentCombat.turnNumber,
            currentTurn: this.currentCombat.turnOrder[this.currentCombat.currentTurnIndex],

            player: {
                name: this.currentCombat.player.name,
                power: this.currentCombat.player.power,
                currentHealth: this.currentCombat.player.currentHealth,
                maxHealth: this.currentCombat.player.maxHealth,
                currentQi: this.currentCombat.player.currentQi,
                maxQi: this.currentCombat.player.maxQi,
                abilities: this.currentCombat.player.abilities,
                actionCooldowns: this.currentCombat.player.actionCooldowns
            },

            opponent: {
                id: this.currentCombat.opponent.id,
                name: this.currentCombat.opponent.name,
                description: this.currentCombat.opponent.description,
                powerLevel: this.currentCombat.opponent.powerLevel,
                power: this.currentCombat.opponent.power,
                currentHealth: this.currentCombat.opponent.currentHealth,
                maxHealth: this.currentCombat.opponent.maxHealth,
                currentQi: this.currentCombat.opponent.currentQi,
                maxQi: this.currentCombat.opponent.maxQi
            },

            statusEffects: this.currentCombat.statusEffects,
            combatLog: this.currentCombat.combatLog.slice(-10), // Last 10 entries

            config: this.currentCombat.config
        };
    }

    /**
     * Save combat statistics to game state
     */
    _saveStatistics() {
        this.gameState.update({
            combatStats: this.statistics
        }, { source: 'combat:save' });
    }
}

// Export for ES6 modules and global usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CombatSystem };
} else if (typeof window !== 'undefined') {
    window.CombatSystem = CombatSystem;
}