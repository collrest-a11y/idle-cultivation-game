// Game State and Core Systems
class IdleCultivationGame {
    constructor() {
        this.gameState = null;
        this.tickRate = 1000; // 1 second
        this.lastTick = Date.now();
        this.isGameLoaded = false;

        // Initialize enhanced save system first
        this.initializeSaveSystem();
    }

    async initializeSaveSystem() {
        try {
            // Initialize the enhanced save system
            if (window.gameSaveSystem) {
                await window.gameSaveSystem.initialize(this);
                console.log('Game: Enhanced save system initialized');
            }

            // Load game or create new state
            this.gameState = await this.loadGame() || this.createNewGameState();

            // Set up the rest of the game
            this.initializeEventListeners();
            this.startGameLoop();

            if (this.gameState.tutorial.completed) {
                this.showGameInterface();
            } else {
                this.showCharacterCreation();
            }

            this.isGameLoaded = true;
            console.log('Game: Initialization complete');

        } catch (error) {
            console.error('Game: Initialization failed:', error);

            // Fallback to basic initialization
            console.log('Game: Falling back to basic initialization');
            this.gameState = this.loadGameBasic() || this.createNewGameState();
            this.initializeEventListeners();
            this.startGameLoop();

            if (this.gameState.tutorial.completed) {
                this.showGameInterface();
            } else {
                this.showCharacterCreation();
            }
        }
    }

    createNewGameState() {
        return {
            player: {
                jade: 500, // Starting premium currency
                spiritCrystals: 100, // Starting soft currency
                shards: 0, // Metaprogression currency
                power: 1.0, // Total combat power
                offlineTime: 0
            },
            cultivation: {
                qi: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                body: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 100,
                    baseRate: 1.0,
                    multiplier: 1.0
                },
                dual: {
                    level: 0,
                    experience: 0,
                    experienceRequired: 200,
                    baseRate: 0.5,
                    multiplier: 1.0,
                    unlocked: false
                }
            },
            realm: {
                current: "Body Refinement",
                stage: 1,
                maxStage: 10,
                breakthroughProgress: 0,
                breakthroughRequired: 1000
            },
            character: {
                origin: null,
                vow: null,
                mark: null,
                modifiers: {}
            },
            loadout: {
                slots: {
                    qi: null,
                    body: null,
                    dual: null,
                    extra1: null,
                    extra2: null
                },
                stats: {
                    flatDamage: 0,
                    damageMultiplier: 1.0,
                    attackSpeed: 1.0,
                    critChance: 0.05,
                    critMultiplier: 2.0,
                    lifesteal: 0,
                    damageReduction: 0
                }
            },
            scriptures: {
                collection: [],
                nextId: 1
            },
            gacha: {
                pityCounter: 0,
                currentBanner: 'standard'
            },
            combat: {
                wins: 0,
                losses: 0,
                streak: 0,
                rank: 1000
            },
            sect: {
                id: null,
                name: null,
                contribution: 0,
                buffs: [],
                rituals: []
            },
            quests: {
                daily: [],
                weekly: [],
                achievements: [],
                lastDailyReset: Date.now(),
                lastWeeklyReset: Date.now()
            },
            metaProgression: {
                unlockedNodes: [],
                availablePoints: 0
            },
            tutorial: {
                completed: false,
                currentStep: 0,
                completedSteps: []
            },
            settings: {
                autoSave: true,
                notifications: true,
                reducedEffects: false
            },
            lastSave: Date.now(),
            timePlayed: 0
        };
    }

    // Character Creation System
    initializeEventListeners() {
        // Character Creation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('fragment-choice')) {
                this.handleFragmentChoice(e.target);
            }
        });

        document.getElementById('begin-cultivation')?.addEventListener('click', () => {
            this.completeCharacterCreation();
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Cultivation Actions
        document.getElementById('meditate-btn')?.addEventListener('click', () => {
            this.activateMeditation();
        });

        document.getElementById('breakthrough-btn')?.addEventListener('click', () => {
            this.attemptBreakthrough();
        });

        // Gacha System
        document.getElementById('single-pull')?.addEventListener('click', () => {
            this.performGachaPull(1);
        });

        document.getElementById('ten-pull')?.addEventListener('click', () => {
            this.performGachaPull(10);
        });

        // Banner Selection
        document.querySelectorAll('.banner-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchBanner(e.target.dataset.banner);
            });
        });

        // Scripture Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterScriptures(e.target.dataset.filter);
            });
        });

        // Combat System
        document.getElementById('find-opponent')?.addEventListener('click', () => {
            this.findOpponent();
        });

        document.getElementById('practice-duel')?.addEventListener('click', () => {
            this.startPracticeDuel();
        });

        document.getElementById('ranked-duel')?.addEventListener('click', () => {
            this.startRankedDuel();
        });

        // Sect System
        document.getElementById('find-sect')?.addEventListener('click', () => {
            this.findSect();
        });

        document.getElementById('create-sect')?.addEventListener('click', () => {
            this.createSect();
        });

        document.getElementById('donate-crystals')?.addEventListener('click', () => {
            this.donateCrystals();
        });

        document.getElementById('leave-sect')?.addEventListener('click', () => {
            this.leaveSect();
        });
    }

    handleFragmentChoice(element) {
        const category = element.parentElement.dataset.category;
        const choice = element.dataset.choice;

        // Remove previous selection in this category
        element.parentElement.querySelectorAll('.fragment-choice').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select new choice
        element.classList.add('selected');

        // Store choice
        this.gameState.character[category] = choice;

        // Apply modifiers based on choice
        this.applyCharacterModifiers(category, choice);

        // Check if all choices are made
        this.checkCharacterCreationComplete();
    }

    applyCharacterModifiers(category, choice) {
        const modifiers = this.getCharacterModifiers();
        const choiceData = modifiers[category][choice];

        if (choiceData) {
            // Roll rarity for this choice
            const rarity = this.rollRarity();
            const multiplier = this.getRarityMultiplier(rarity);

            // Apply base modifiers
            Object.keys(choiceData.base).forEach(key => {
                if (!this.gameState.character.modifiers[key]) {
                    this.gameState.character.modifiers[key] = 0;
                }
                this.gameState.character.modifiers[key] += choiceData.base[key] * multiplier;
            });

            // Apply special effects based on rarity
            if (rarity >= 3 && choiceData.special) { // Rare or higher
                Object.keys(choiceData.special).forEach(key => {
                    if (!this.gameState.character.modifiers[key]) {
                        this.gameState.character.modifiers[key] = 0;
                    }
                    this.gameState.character.modifiers[key] += choiceData.special[key];
                });
            }
        }
    }

    getCharacterModifiers() {
        return {
            origin: {
                'dust-road': {
                    base: { flatDamage: 5, lifesteal: 0.02 },
                    special: { bleedChance: 0.1 }
                },
                'ink-pavilion': {
                    base: { damageMultiplier: 0.1, qiRate: 0.2 },
                    special: { critToMana: 0.5 }
                },
                'exiled-heir': {
                    base: { jadeBonus: 0.1, shopDiscount: 0.05 },
                    special: { pityBonus: 10 }
                },
                'hermit': {
                    base: { dualProgress: 0.1, attackSpeed: -0.1 },
                    special: { dualSynergyBonus: 1 }
                }
            },
            vow: {
                'protect': {
                    base: { damageReduction: 0.05 },
                    special: { guardBreakResist: 0.3 }
                },
                'pursue': {
                    base: { critChance: 0.03 },
                    special: { skillCritBonus: 0.1 }
                },
                'break': {
                    base: { armorPen: 0.1 },
                    special: { shieldBreaker: 0.2 }
                },
                'settle': {
                    base: { resourceBonus: 0.15 },
                    special: { bossReward: 0.25 }
                }
            },
            mark: {
                'thunder': {
                    base: { firstStrikeMult: 0.5, stunChance: 0.02 },
                    special: { burstDamage: 1.0 }
                },
                'frost': {
                    base: { trueDamage: 3, slowChance: 0.1 },
                    special: { frostWindow: 5 }
                },
                'twin': {
                    base: { crossScaling: 0.1, attackSpeed: 0.1 },
                    special: { dualHarmony: 0.2 }
                },
                'hollow': {
                    base: { shardGain: 0.1 },
                    special: { onHitShards: 0.05 }
                }
            }
        };
    }

    checkCharacterCreationComplete() {
        const { origin, vow, mark } = this.gameState.character;
        const beginBtn = document.getElementById('begin-cultivation');

        if (origin && vow && mark) {
            beginBtn.disabled = false;
            beginBtn.classList.add('pulse');
        }
    }

    completeCharacterCreation() {
        this.gameState.tutorial.completed = true;
        this.hideCharacterCreation();
        this.showGameInterface();
        this.startTutorialProgression();
        this.initializeQuests();
        this.saveGame();
    }

    // Cultivation System
    startTutorialProgression() {
        // Give starting scripture based on Mark of Fate
        const startingScripture = this.generateStartingScripture();
        this.addScripture(startingScripture);

        // Set initial cultivation rates
        this.updateCultivationRates();

        // Show tutorial messages
        this.showTutorialMessage("Welcome to the path of cultivation. Your journey begins now...");
    }

    generateStartingScripture() {
        const mark = this.gameState.character.mark;
        const scriptureTemplates = {
            thunder: {
                name: "Lightning Palm Manual",
                type: "qi",
                rarity: 2, // Uncommon
                stats: { damageMultiplier: 0.15, critChance: 0.02 },
                description: "Basic qi cultivation technique focusing on speed and precision."
            },
            frost: {
                name: "Iron Body Foundation",
                type: "body",
                rarity: 2,
                stats: { flatDamage: 8, damageReduction: 0.03 },
                description: "Fundamental body strengthening method."
            },
            twin: {
                name: "Harmony Breathing Technique",
                type: "dual",
                rarity: 3, // Rare
                stats: { damageMultiplier: 0.1, flatDamage: 5 },
                description: "Balances qi and body cultivation in perfect harmony."
            },
            hollow: {
                name: "Void Meditation Scripture",
                type: "utility",
                rarity: 2,
                stats: { shardGain: 0.1, resourceBonus: 0.05 },
                description: "Utility technique for resource gathering."
            }
        };

        const template = scriptureTemplates[mark];
        return this.createScripture(template);
    }

    updateCultivationRates() {
        const { qi, body, dual } = this.gameState.cultivation;
        const modifiers = this.gameState.character.modifiers;

        // Apply character modifiers
        qi.multiplier = 1.0 + (modifiers.qiRate || 0);
        body.multiplier = 1.0 + (modifiers.bodyRate || 0);

        // Apply loadout bonuses
        this.calculateLoadoutBonuses();
    }

    // Gacha System Implementation
    performGachaPull(count) {
        const cost = count === 1 ? 100 : 1000;

        if (this.gameState.player.jade < cost) {
            this.showMessage("Not enough Jade!");
            return;
        }

        this.gameState.player.jade -= cost;
        const results = [];

        for (let i = 0; i < count; i++) {
            this.gameState.gacha.pityCounter++;
            const scripture = this.generateRandomScripture();
            results.push(scripture);
            this.addScripture(scripture);

            // Reset pity on legendary
            if (scripture.rarity >= 5) {
                this.gameState.gacha.pityCounter = 0;
            }
        }

        this.showGachaResults(results);
        this.updateUI();
        this.saveGame();
    }

    generateRandomScripture() {
        const rarity = this.rollScriptureRarity();
        const type = this.rollScriptureType();
        const template = this.getRandomScriptureTemplate(type, rarity);

        return this.createScripture({
            ...template,
            rarity: rarity,
            type: type
        });
    }

    rollScriptureRarity() {
        const pity = this.gameState.gacha.pityCounter;
        let baseRates = [55, 25, 12, 6, 2]; // Common, Uncommon, Rare, Epic, Legendary

        // Soft pity at 20 pulls
        if (pity >= 20) {
            baseRates[4] *= 2; // Double legendary chance
        }

        // Hard pity at 80 pulls
        if (pity >= 80) {
            return 5; // Guaranteed legendary
        }

        const roll = Math.random() * 100;
        let cumulative = 0;

        for (let i = 0; i < baseRates.length; i++) {
            cumulative += baseRates[i];
            if (roll <= cumulative) {
                return i + 1;
            }
        }

        return 1; // Fallback to common
    }

    rollScriptureType() {
        const types = ['qi', 'body', 'dual', 'utility'];
        const weights = [30, 30, 25, 15]; // Weighted distribution

        const roll = Math.random() * 100;
        let cumulative = 0;

        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (roll <= cumulative) {
                return types[i];
            }
        }

        return 'qi';
    }

    getRandomScriptureTemplate(type, rarity) {
        const templates = this.getScriptureTemplates();
        const typeTemplates = templates[type];
        const rarityTemplates = typeTemplates.filter(t => t.minRarity <= rarity);

        return rarityTemplates[Math.floor(Math.random() * rarityTemplates.length)];
    }

    getScriptureTemplates() {
        return {
            qi: [
                {
                    name: "Basic Qi Circulation",
                    minRarity: 1,
                    baseStats: { damageMultiplier: 0.1 },
                    scaling: { damageMultiplier: 0.05 }
                },
                {
                    name: "Thunder Palm Technique",
                    minRarity: 2,
                    baseStats: { damageMultiplier: 0.15, critChance: 0.02 },
                    scaling: { damageMultiplier: 0.07, critChance: 0.01 }
                },
                {
                    name: "Celestial Sword Art",
                    minRarity: 4,
                    baseStats: { damageMultiplier: 0.3, critChance: 0.05, critMultiplier: 0.2 },
                    scaling: { damageMultiplier: 0.1, critChance: 0.02, critMultiplier: 0.1 }
                },
                {
                    name: "Divine Lightning Scripture",
                    minRarity: 5,
                    baseStats: { damageMultiplier: 0.5, critChance: 0.1, attackSpeed: 0.2 },
                    scaling: { damageMultiplier: 0.15, critChance: 0.03, attackSpeed: 0.05 }
                }
            ],
            body: [
                {
                    name: "Iron Skin Training",
                    minRarity: 1,
                    baseStats: { flatDamage: 5, damageReduction: 0.02 },
                    scaling: { flatDamage: 3, damageReduction: 0.01 }
                },
                {
                    name: "Stone Fist Manual",
                    minRarity: 2,
                    baseStats: { flatDamage: 8, lifesteal: 0.03 },
                    scaling: { flatDamage: 4, lifesteal: 0.015 }
                },
                {
                    name: "Diamond Body Scripture",
                    minRarity: 4,
                    baseStats: { flatDamage: 15, damageReduction: 0.1, lifesteal: 0.05 },
                    scaling: { flatDamage: 8, damageReduction: 0.03, lifesteal: 0.02 }
                },
                {
                    name: "Immortal Physique Art",
                    minRarity: 5,
                    baseStats: { flatDamage: 25, damageReduction: 0.15, lifesteal: 0.1 },
                    scaling: { flatDamage: 12, damageReduction: 0.05, lifesteal: 0.03 }
                }
            ],
            dual: [
                {
                    name: "Harmony Breathing",
                    minRarity: 2,
                    baseStats: { damageMultiplier: 0.08, flatDamage: 4 },
                    scaling: { damageMultiplier: 0.04, flatDamage: 2 }
                },
                {
                    name: "Yin-Yang Cultivation",
                    minRarity: 3,
                    baseStats: { damageMultiplier: 0.12, flatDamage: 6, attackSpeed: 0.05 },
                    scaling: { damageMultiplier: 0.06, flatDamage: 3, attackSpeed: 0.02 }
                },
                {
                    name: "Primordial Unity Scripture",
                    minRarity: 5,
                    baseStats: { damageMultiplier: 0.2, flatDamage: 12, attackSpeed: 0.1, critChance: 0.05 },
                    scaling: { damageMultiplier: 0.1, flatDamage: 6, attackSpeed: 0.03, critChance: 0.02 }
                }
            ],
            utility: [
                {
                    name: "Meditation Scroll",
                    minRarity: 1,
                    baseStats: { shardGain: 0.05 },
                    scaling: { shardGain: 0.02 }
                },
                {
                    name: "Treasure Finding Art",
                    minRarity: 2,
                    baseStats: { resourceBonus: 0.1, shardGain: 0.03 },
                    scaling: { resourceBonus: 0.05, shardGain: 0.015 }
                },
                {
                    name: "Cosmic Insight Manual",
                    minRarity: 4,
                    baseStats: { resourceBonus: 0.2, shardGain: 0.1, experienceBonus: 0.15 },
                    scaling: { resourceBonus: 0.1, shardGain: 0.05, experienceBonus: 0.05 }
                }
            ]
        };
    }

    createScripture(template) {
        const rarity = template.rarity || 1;
        const rarityMultiplier = this.getRarityMultiplier(rarity);

        const scripture = {
            id: this.gameState.scriptures.nextId++,
            name: template.name,
            type: template.type,
            rarity: rarity,
            level: 1,
            maxLevel: rarity * 10,
            stats: {},
            description: template.description || `A ${this.getRarityName(rarity)} ${template.type} scripture.`,
            equipped: false
        };

        // Calculate stats based on template and rarity
        Object.keys(template.baseStats || {}).forEach(stat => {
            const baseValue = template.baseStats[stat];
            const scaling = template.scaling ? template.scaling[stat] || 0 : 0;
            scripture.stats[stat] = baseValue + (scaling * (rarity - 1));
        });

        // Apply rarity multiplier
        Object.keys(scripture.stats).forEach(stat => {
            scripture.stats[stat] *= rarityMultiplier;
        });

        return scripture;
    }

    getRarityMultiplier(rarity) {
        const multipliers = [1.0, 1.0, 1.2, 1.5, 2.0, 3.0];
        return multipliers[rarity] || 1.0;
    }

    getRarityName(rarity) {
        const names = ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        return names[rarity] || 'Unknown';
    }

    addScripture(scripture) {
        // Check for duplicates
        const existing = this.gameState.scriptures.collection.find(s =>
            s.name === scripture.name && s.rarity === scripture.rarity
        );

        if (existing) {
            // Convert to shards or upgrade
            const shardValue = scripture.rarity * 10;
            this.gameState.player.shards += shardValue;
            this.showMessage(`Duplicate scripture converted to ${shardValue} shards!`);
        } else {
            this.gameState.scriptures.collection.push(scripture);
        }
    }

    // Combat System
    calculateLoadoutBonuses() {
        const stats = {
            flatDamage: 0,
            damageMultiplier: 1.0,
            attackSpeed: 1.0,
            critChance: 0.05,
            critMultiplier: 2.0,
            lifesteal: 0,
            damageReduction: 0,
            armorPen: 0,
            shardGain: 0,
            resourceBonus: 0
        };

        // Add character modifiers
        Object.keys(this.gameState.character.modifiers).forEach(key => {
            if (stats.hasOwnProperty(key)) {
                if (key === 'damageMultiplier' || key === 'attackSpeed' || key === 'critMultiplier') {
                    stats[key] += this.gameState.character.modifiers[key];
                } else {
                    stats[key] += this.gameState.character.modifiers[key];
                }
            }
        });

        // Add equipped scripture bonuses
        Object.values(this.gameState.loadout.slots).forEach(scriptureId => {
            if (scriptureId) {
                const scripture = this.getScriptureById(scriptureId);
                if (scripture) {
                    Object.keys(scripture.stats).forEach(stat => {
                        if (stats.hasOwnProperty(stat)) {
                            if (stat === 'damageMultiplier' || stat === 'attackSpeed' || stat === 'critMultiplier') {
                                stats[stat] += scripture.stats[stat];
                            } else {
                                stats[stat] += scripture.stats[stat];
                            }
                        }
                    });
                }
            }
        });

        this.gameState.loadout.stats = stats;
        this.calculateTotalPower();
    }

    calculateTotalPower() {
        // Use proper combat power calculation if COMBAT_FORMULAS is available
        if (window.COMBAT_FORMULAS && window.COMBAT_FORMULAS.totalCombatPower) {
            const { qi, body } = this.gameState.cultivation;
            const realm = this.gameState.realm.current;
            const stage = this.gameState.realm.stage;

            // Convert scriptures to the format expected by combat formulas
            const equippedScriptures = [];
            Object.values(this.gameState.loadout.slots).forEach(scriptureId => {
                if (scriptureId) {
                    const scripture = this.getScriptureById(scriptureId);
                    if (scripture) {
                        // Calculate scripture power based on its stats
                        let power = 0;
                        Object.entries(scripture.stats).forEach(([stat, value]) => {
                            if (stat === 'damageMultiplier') {
                                power += value * 50; // Convert multiplier to power points
                            } else if (stat === 'flatDamage') {
                                power += value * 2;
                            } else if (stat === 'critChance') {
                                power += value * 100; // Convert percentage to power
                            } else if (stat === 'critMultiplier') {
                                power += (value - 1) * 30; // Bonus multiplier to power
                            } else {
                                power += Math.abs(value) * 10; // Generic stat conversion
                            }
                        });

                        equippedScriptures.push({
                            power: Math.round(power),
                            category: scripture.type === 'utility' ? 'utility' : 'combat'
                        });
                    }
                }
            });

            // Calculate modifiers from character and equipment
            const modifiers = {
                powerMultiplier: 1.0,
                flatBonus: 0
            };

            // Apply character modifiers as power bonuses
            Object.entries(this.gameState.character.modifiers).forEach(([key, value]) => {
                if (key === 'damageMultiplier') {
                    modifiers.powerMultiplier += value;
                } else if (key === 'flatDamage') {
                    modifiers.flatBonus += value * 2;
                } else {
                    modifiers.flatBonus += Math.abs(value) * 10;
                }
            });

            // Use the proper formula
            this.gameState.player.power = window.COMBAT_FORMULAS.totalCombatPower(
                qi.level, body.level, realm, stage, equippedScriptures, {}, modifiers
            );
        } else {
            // Fallback to enhanced basic calculation
            const stats = this.gameState.loadout.stats;
            const { qi, body } = this.gameState.cultivation;
            const realm = this.gameState.realm;

            // Enhanced base power calculation
            const basePower = (qi.level * 10) + (body.level * 8);
            const realmMultiplier = 1 + (realm.stage * 0.03);
            const equipmentPower = (10 + stats.flatDamage) * stats.damageMultiplier * stats.attackSpeed;
            const critFactor = 1 + (stats.critChance * (stats.critMultiplier - 1));

            this.gameState.player.power = Math.round((basePower * realmMultiplier) + (equipmentPower * critFactor));
        }
    }

    // Realm and Progression System
    attemptBreakthrough() {
        const { realm, cultivation } = this.gameState;
        const requiredPower = this.getBreakthroughRequirement();

        if (this.gameState.player.power >= requiredPower) {
            if (realm.stage < realm.maxStage) {
                realm.stage++;
                this.showMessage(`Breakthrough successful! Advanced to ${realm.current} ${realm.stage}`);
            } else {
                this.advanceRealm();
            }
            this.updateBreakthroughProgress();
        } else {
            this.showMessage(`Insufficient power. Need ${requiredPower.toFixed(1)} power.`);
        }

        this.updateUI();
        this.saveGame();
    }

    advanceRealm() {
        const realmProgression = [
            { name: "Body Refinement", stages: 10 },
            { name: "Qi Condensation", stages: 10 },
            { name: "Foundation", stages: 5 },
            { name: "Core Formation", stages: 3 },
            { name: "Nascent Soul", stages: 3 },
            { name: "Soul Transformation", stages: 1 }
        ];

        const currentIndex = realmProgression.findIndex(r => r.name === this.gameState.realm.current);
        if (currentIndex < realmProgression.length - 1) {
            const nextRealm = realmProgression[currentIndex + 1];
            this.gameState.realm.current = nextRealm.name;
            this.gameState.realm.stage = 1;
            this.gameState.realm.maxStage = nextRealm.stages;

            // Unlock features based on realm
            this.unlockRealmFeatures(nextRealm.name);

            this.showMessage(`Realm breakthrough! Welcome to ${nextRealm.name}!`);
        }
    }

    unlockRealmFeatures(realmName) {
        if (realmName === "Foundation") {
            this.gameState.cultivation.dual.unlocked = true;
            this.showMessage("Dual Cultivation unlocked!");

            // Update UI to show dual path as unlocked
            const dualPath = document.getElementById('dual-path');
            if (dualPath) {
                dualPath.classList.remove('locked');
                dualPath.innerHTML = `
                    <div class="card-header">
                        <h3 class="card-title">Dual Cultivation</h3>
                        <div class="stat-value" id="dual-level">Level ${this.gameState.cultivation.dual.level}</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="dual-progress"></div>
                    </div>
                    <div class="path-stats">
                        <div class="stat-item">
                            <div class="stat-label">Progress</div>
                            <div class="stat-value" id="dual-progress-text">0/200</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Per Second</div>
                            <div class="stat-value" id="dual-per-second">0.5</div>
                        </div>
                    </div>
                `;
            }

            // Update dual slot in loadout
            const dualSlot = document.querySelector('[data-slot="dual"]');
            if (dualSlot) {
                dualSlot.classList.remove('locked');
                dualSlot.querySelector('.slot-content').innerHTML = `
                    <div class="empty-slot">Drop dual scripture here</div>
                `;
            }
        }
        // Add more feature unlocks here
    }

    getBreakthroughRequirement() {
        const base = 100;
        const stage = this.gameState.realm.stage;
        return base * Math.pow(1.5, stage);
    }

    // Game Loop and Idle System
    startGameLoop() {
        setInterval(() => {
            this.gameLoop();
        }, this.tickRate);
    }

    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - this.lastTick) / 1000; // Convert to seconds

        if (this.gameState.tutorial.completed) {
            this.processCultivation(deltaTime);
            this.processIdleRewards(deltaTime);
            this.checkQuestResets();
            this.updateUI();

            // Auto-save every 30 seconds
            if (this.gameState.settings.autoSave && now - this.gameState.lastSave > 30000) {
                this.saveGame();
            }
        }

        this.lastTick = now;
        this.gameState.timePlayed += deltaTime;
    }

    processCultivation(deltaTime) {
        const { qi, body, dual } = this.gameState.cultivation;

        // Process Qi cultivation
        this.processCultivationPath(qi, deltaTime);

        // Process Body cultivation
        this.processCultivationPath(body, deltaTime);

        // Process Dual cultivation (if unlocked)
        if (dual.unlocked) {
            this.processCultivationPath(dual, deltaTime);
        }
    }

    processCultivationPath(path, deltaTime) {
        const gainRate = path.baseRate * path.multiplier;
        const experience = gainRate * deltaTime;

        path.experience += experience;

        // Level up check
        while (path.experience >= path.experienceRequired) {
            path.experience -= path.experienceRequired;
            path.level++;
            path.experienceRequired = Math.floor(path.experienceRequired * 1.2);

            // Increase cultivation speed slightly each level
            path.baseRate *= 1.05;
        }
    }

    processIdleRewards(deltaTime) {
        // Calculate cultivation-based resource generation
        const { qi, body, dual } = this.gameState.cultivation;
        const realm = this.gameState.realm;
        const loadoutStats = this.gameState.loadout.stats;

        // Spirit Crystal generation based on cultivation level and realm
        const baseQiRate = qi.level * 0.1; // 0.1 crystals per second per qi level
        const baseBodyRate = body.level * 0.05; // Body cultivation contributes less to crystal generation
        const realmMultiplier = 1 + (realm.stage * 0.1); // 10% bonus per realm stage
        const bonusRate = loadoutStats.resourceBonus || 0;

        let crystalRate = (baseQiRate + baseBodyRate) * realmMultiplier * (1 + bonusRate);

        // Apply sect bonuses if in a sect
        if (this.gameState.sect.id && this.gameState.sect.buffs) {
            this.gameState.sect.buffs.forEach(buff => {
                if (buff.name === "Resource Gathering") {
                    crystalRate *= (1 + buff.value);
                }
            });
        }

        // Minimum generation rate (even at low levels)
        crystalRate = Math.max(0.1, crystalRate);

        const crystalGain = crystalRate * deltaTime;
        this.gameState.player.spiritCrystals += crystalGain;

        // Jade generation (much slower, only at higher levels)
        if (qi.level >= 10 || body.level >= 10) {
            const jadeRate = Math.max(0, (qi.level + body.level - 20) * 0.01) * realmMultiplier;
            if (jadeRate > 0) {
                const jadeGain = jadeRate * deltaTime;
                this.gameState.player.jade += jadeGain;
            }
        }

        // Shard generation from high-level cultivation and special equipment
        let shardRate = loadoutStats.shardGain || 0;

        // Additional shard generation from dual cultivation
        if (dual.unlocked && dual.level > 0) {
            shardRate += dual.level * 0.01; // 0.01 shards per second per dual level
        }

        // Realm-based shard generation (only at higher realms)
        const realmIndex = ["Body Refinement", "Qi Condensation", "Foundation", "Core Formation", "Nascent Soul", "Soul Transformation"].indexOf(realm.current);
        if (realmIndex >= 2) { // Foundation realm and above
            shardRate += (realmIndex - 1) * 0.02;
        }

        if (shardRate > 0) {
            const shardGain = shardRate * deltaTime;
            this.gameState.player.shards += shardGain;
        }

        // Material generation (for crafting system integration)
        if (window.craftingSystem && window.craftingSystem.isInitialized) {
            // Generate basic materials at low rates
            const materialRates = {
                spirit_stone: Math.max(0.01, qi.level * 0.005),
                iron_ore: Math.max(0.005, body.level * 0.003),
                spirit_herb: Math.max(0.008, (qi.level + body.level) * 0.002)
            };

            Object.entries(materialRates).forEach(([material, rate]) => {
                const materialGain = rate * deltaTime;
                if (Math.random() < materialGain) {
                    window.craftingSystem.addMaterial(material, 1);
                }
            });
        }
    }

    // Offline Progress Calculation
    calculateOfflineProgress() {
        const offlineTime = Date.now() - this.gameState.lastSave;
        const maxOfflineTime = 12 * 60 * 60 * 1000; // 12 hours max
        const effectiveOfflineTime = Math.min(offlineTime, maxOfflineTime) / 1000; // Convert to seconds

        if (effectiveOfflineTime > 60) { // Only show if offline for more than 1 minute
            const offlineRewards = this.calculateOfflineRewards(effectiveOfflineTime);
            this.showOfflineProgressModal(offlineRewards, effectiveOfflineTime);
        }
    }

    calculateOfflineRewards(timeSeconds) {
        const rewards = {
            qiLevels: 0,
            bodyLevels: 0,
            dualLevels: 0,
            spiritCrystals: 0,
            shards: 0
        };

        // Simulate cultivation progress
        const qi = { ...this.gameState.cultivation.qi };
        const body = { ...this.gameState.cultivation.body };
        const dual = { ...this.gameState.cultivation.dual };

        // Process in chunks to avoid infinite loops
        const chunkSize = 60; // 1 minute chunks
        const chunks = Math.floor(timeSeconds / chunkSize);

        for (let i = 0; i < chunks; i++) {
            this.processCultivationPath(qi, chunkSize);
            this.processCultivationPath(body, chunkSize);
            if (dual.unlocked) {
                this.processCultivationPath(dual, chunkSize);
            }
        }

        rewards.qiLevels = qi.level - this.gameState.cultivation.qi.level;
        rewards.bodyLevels = body.level - this.gameState.cultivation.body.level;
        rewards.dualLevels = dual.level - this.gameState.cultivation.dual.level;

        // Calculate resource gains
        const baseRate = 1.0;
        const bonusRate = this.gameState.loadout.stats.resourceBonus || 0;
        rewards.spiritCrystals = (baseRate * (1 + bonusRate)) * timeSeconds;

        const shardRate = this.gameState.loadout.stats.shardGain || 0;
        rewards.shards = shardRate * timeSeconds;

        return rewards;
    }

    // UI Update Functions
    updateUI() {
        if (!this.gameState.tutorial.completed) return;

        this.updateResourceDisplay();
        this.updateCultivationDisplay();
        this.updateLoadoutDisplay();
        this.updateRealmDisplay();
        this.updateGachaDisplay();
        this.updateCombatDisplay();
        this.updateSectDisplay();
    }

    updateResourceDisplay() {
        document.getElementById('jade-count').textContent = Math.floor(this.gameState.player.jade);
        document.getElementById('spirit-crystal-count').textContent = Math.floor(this.gameState.player.spiritCrystals);
        document.getElementById('shard-count').textContent = Math.floor(this.gameState.player.shards);
    }

    updateCultivationDisplay() {
        const { qi, body, dual } = this.gameState.cultivation;

        // Qi path
        this.updatePathDisplay('qi', qi);

        // Body path
        this.updatePathDisplay('body', body);

        // Dual path
        if (dual.unlocked) {
            document.getElementById('dual-path').classList.remove('locked');
            this.updatePathDisplay('dual', dual);
        }
    }

    updatePathDisplay(pathName, pathData) {
        const progressPercent = (pathData.experience / pathData.experienceRequired) * 100;
        document.getElementById(`${pathName}-progress`).style.width = `${progressPercent}%`;
        document.getElementById(`${pathName}-level`).textContent = `Level ${pathData.level}`;
        document.getElementById(`${pathName}-progress-text`).textContent =
            `${Math.floor(pathData.experience)}/${pathData.experienceRequired}`;
        document.getElementById(`${pathName}-per-second`).textContent =
            (pathData.baseRate * pathData.multiplier).toFixed(1);
    }

    updateLoadoutDisplay() {
        const stats = this.gameState.loadout.stats;

        document.getElementById('flat-damage').textContent = Math.floor(stats.flatDamage);
        document.getElementById('damage-mult').textContent = `${stats.damageMultiplier.toFixed(2)}x`;
        document.getElementById('attack-speed').textContent = stats.attackSpeed.toFixed(2);
        document.getElementById('crit-chance').textContent = `${(stats.critChance * 100).toFixed(1)}%`;
        document.getElementById('total-dps').textContent = Math.floor(this.gameState.player.power);

        // Update breakthrough button
        const breakthroughBtn = document.getElementById('breakthrough-btn');
        const requiredPower = this.getBreakthroughRequirement();
        breakthroughBtn.disabled = this.gameState.player.power < requiredPower;

        if (this.gameState.player.power >= requiredPower) {
            breakthroughBtn.textContent = "Breakthrough Available!";
            breakthroughBtn.classList.add('pulse');
        } else {
            breakthroughBtn.textContent = `Breakthrough (${requiredPower.toFixed(0)} power needed)`;
            breakthroughBtn.classList.remove('pulse');
        }
    }

    updateRealmDisplay() {
        document.getElementById('current-realm').textContent =
            `${this.gameState.realm.current} ${this.gameState.realm.stage}`;
    }

    updateGachaDisplay() {
        document.getElementById('pity-counter').textContent = this.gameState.gacha.pityCounter;

        // Update pull button states
        const singleBtn = document.getElementById('single-pull');
        const tenBtn = document.getElementById('ten-pull');

        singleBtn.disabled = this.gameState.player.jade < 100;
        tenBtn.disabled = this.gameState.player.jade < 1000;
    }

    updateCombatDisplay() {
        document.getElementById('combat-wins').textContent = this.gameState.combat.wins;
        document.getElementById('combat-losses').textContent = this.gameState.combat.losses;
        document.getElementById('combat-streak').textContent = this.gameState.combat.streak;
        document.getElementById('combat-rank').textContent = this.gameState.combat.rank;
    }

    showDuelResult(duel) {
        const { opponent, result, rewards, type } = duel;
        const modal = document.createElement('div');
        modal.className = 'modal';

        const resultText = result.victory ? 'Victory!' : 'Defeat!';
        const resultClass = result.victory ? 'victory' : 'defeat';

        modal.innerHTML = `
            <div class="modal-content">
                <h2 class="${resultClass}">${resultText}</h2>
                <div class="duel-summary">
                    <h3>vs ${opponent.name}</h3>
                    <p>Opponent Power: ${opponent.power.toFixed(1)}</p>
                    <p>Combat lasted ${result.rounds} rounds</p>
                    <div class="hp-results">
                        <div>Your HP: ${result.playerHP.toFixed(0)}/100</div>
                        <div>Opponent HP: ${result.opponentHP.toFixed(0)}/100</div>
                    </div>
                </div>

                <div class="rewards-section">
                    <h3>Rewards</h3>
                    <div class="reward-list">
                        <div>Spirit Crystals: +${rewards.spiritCrystals}</div>
                        <div>Shards: +${rewards.shards}</div>
                        ${rewards.jade > 0 ? `<div>Jade: +${rewards.jade}</div>` : ''}
                    </div>
                </div>

                <div class="combat-log">
                    <h4>Combat Log</h4>
                    <div class="log-content">
                        ${result.log.slice(-10).map(entry => `<div>${entry}</div>`).join('')}
                    </div>
                </div>

                <button onclick="this.parentElement.parentElement.remove()" class="btn-primary">Continue</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Update combat log in game
        const combatLog = document.getElementById('combat-log');
        combatLog.innerHTML = `
            <div class="last-combat ${resultClass}">
                <h4>Last Duel: vs ${opponent.name}</h4>
                <p>${resultText} - ${result.rounds} rounds</p>
                <p>Rewards: ${rewards.spiritCrystals} crystals, ${rewards.shards} shards</p>
            </div>
        `;
    }

    // Combat System Implementation
    findOpponent() {
        // Simulate finding an opponent with similar power level
        const playerPower = this.gameState.player.power;
        const opponentPower = playerPower * (0.8 + Math.random() * 0.4); // ±20% variance

        const opponent = this.generateOpponent(opponentPower);
        this.startDuel(opponent, 'casual');
    }

    startPracticeDuel() {
        // Practice against AI with no consequences
        const opponent = this.generateOpponent(this.gameState.player.power);
        opponent.name = "Training Dummy";
        this.startDuel(opponent, 'practice');
    }

    startRankedDuel() {
        // Ranked match affects rank and gives better rewards
        const playerRank = this.gameState.combat.rank;
        const opponentRank = playerRank + Math.floor((Math.random() - 0.5) * 200);
        const opponentPower = this.calculatePowerFromRank(opponentRank);

        const opponent = this.generateOpponent(opponentPower);
        opponent.rank = opponentRank;
        this.startDuel(opponent, 'ranked');
    }

    generateOpponent(targetPower) {
        // Use proper opponent data if available
        if (window.COMBAT_OPPONENTS) {
            let opponentPool = [];

            // Select opponents based on power level
            if (targetPower < 100) {
                opponentPool = window.COMBAT_OPPONENTS.ROGUE_CULTIVATORS || [];
            } else if (targetPower < 500) {
                opponentPool = window.COMBAT_OPPONENTS.SECT_DISCIPLES || [];
            } else if (targetPower < 2000) {
                opponentPool = window.COMBAT_OPPONENTS.ELITE_CULTIVATORS || [];
            } else {
                opponentPool = window.COMBAT_OPPONENTS.LEGENDARY_BEINGS || [];
            }

            if (opponentPool.length > 0) {
                const template = opponentPool[Math.floor(Math.random() * opponentPool.length)];

                // Calculate power using proper formulas
                const opponentPower = window.COMBAT_FORMULAS ?
                    window.COMBAT_FORMULAS.totalCombatPower(
                        template.cultivation.qi.level,
                        template.cultivation.body.level,
                        template.cultivation.realm,
                        template.cultivation.stage,
                        [],
                        {},
                        {}
                    ) : targetPower;

                return {
                    ...template,
                    power: opponentPower,
                    actualPower: opponentPower
                };
            }
        }

        // Fallback to simple generation
        const names = [
            "Iron Fist Zhang", "Flowing River Li", "Thunder Palm Wang",
            "Silent Blade Chen", "Burning Soul Liu", "Jade Mountain Wu",
            "Crimson Tiger Zhao", "Azure Dragon Lin", "Golden Phoenix Yu"
        ];

        return {
            name: names[Math.floor(Math.random() * names.length)],
            power: targetPower,
            realm: this.calculateRealmFromPower(targetPower),
            loot: this.generateBasicLoot(targetPower)
        };
    }

    generateBasicLoot(power) {
        const baseRewards = Math.max(1, Math.floor(power / 10));
        return {
            jade: { min: baseRewards * 5, max: baseRewards * 15 },
            spiritCrystals: { min: baseRewards, max: baseRewards * 3 },
            items: ['spirit_stone', 'cultivation_pill'],
            chance: Math.min(0.8, 0.3 + (power / 1000))
        };
    }

    generateOpponentStats(power) {
        // Generate balanced stats that sum to approximately the target power
        const baseDamage = 10 + Math.floor(power * 0.3);
        const multiplier = 1 + (power * 0.002);
        const attackSpeed = 0.8 + Math.random() * 0.4;
        const critChance = 0.05 + Math.random() * 0.15;

        return {
            flatDamage: baseDamage,
            damageMultiplier: multiplier,
            attackSpeed: attackSpeed,
            critChance: critChance,
            critMultiplier: 2.0 + Math.random() * 0.5,
            hp: 100 + Math.floor(power * 0.5)
        };
    }

    calculatePowerFromRank(rank) {
        // Higher rank = higher power (inverse relationship)
        const basePower = 50;
        const rankMultiplier = Math.max(0.1, (2000 - rank) / 1000);
        return basePower * rankMultiplier * (1 + Math.random() * 0.2);
    }

    calculateRealmFromPower(power) {
        if (power < 20) return "Body Refinement";
        if (power < 50) return "Qi Condensation";
        if (power < 100) return "Foundation";
        if (power < 200) return "Core Formation";
        if (power < 500) return "Nascent Soul";
        return "Soul Transformation";
    }

    startDuel(opponent, type) {
        const playerPower = this.gameState.player.power;
        const opponentPower = opponent.power;
        const duelResult = this.simulateCombat(playerPower, opponentPower, opponent.name);

        const duel = {
            id: Date.now(),
            opponent: opponent,
            type: type,
            result: duelResult,
            timestamp: Date.now(),
            rewards: this.calculateDuelRewards(duelResult, type, opponent)
        };

        this.processDuelResult(duel);
        this.showDuelResult(duel);
    }

    simulateCombat(playerPower, opponentPower, opponentName = 'Opponent') {
        const combatLog = [];

        // Calculate health properly based on power
        let playerHP, opponentHP;
        if (window.COMBAT_FORMULAS && window.COMBAT_FORMULAS.maxHealth) {
            // Estimate levels from power (rough approximation)
            const playerBodyLevel = Math.floor(playerPower / 20);
            const opponentBodyLevel = Math.floor(opponentPower / 20);
            playerHP = window.COMBAT_FORMULAS.maxHealth(playerBodyLevel, this.gameState.realm.current, this.gameState.realm.stage);
            opponentHP = window.COMBAT_FORMULAS.maxHealth(opponentBodyLevel, "Body Refinement", 1);
        } else {
            // Fallback health calculation
            playerHP = 100 + Math.floor(playerPower * 0.5);
            opponentHP = 100 + Math.floor(opponentPower * 0.5);
        }

        const maxRounds = 30;
        let round = 0;

        while (playerHP > 0 && opponentHP > 0 && round < maxRounds) {
            round++;

            // Player attack
            const playerDamage = this.calculateDamage(playerPower, opponentPower, 'ATTACK');
            opponentHP -= playerDamage;
            combatLog.push(`Round ${round}: You deal ${playerDamage} damage`);

            if (opponentHP <= 0) break;

            // Opponent attack
            const opponentDamage = this.calculateDamage(opponentPower, playerPower, 'ATTACK');
            playerHP -= opponentDamage;
            combatLog.push(`Round ${round}: ${opponentName} deals ${opponentDamage} damage`);
        }

        const victory = opponentHP <= 0;
        const result = {
            victory: victory,
            playerHP: Math.max(0, playerHP),
            opponentHP: Math.max(0, opponentHP),
            rounds: round,
            log: combatLog
        };

        return result;
    }

    calculateDamage(attackerPower, defenderPower, actionType = 'ATTACK', isCritical = null) {
        // Use proper combat formulas if available
        if (window.COMBAT_FORMULAS && window.COMBAT_FORMULAS.calculateDamage) {
            // Determine critical hit if not specified
            if (isCritical === null) {
                const critChance = this.gameState.loadout.stats.critChance || 0.05;
                isCritical = Math.random() < critChance;
            }

            return window.COMBAT_FORMULAS.calculateDamage(
                attackerPower, defenderPower, actionType, isCritical, this.gameState.loadout.stats
            );
        } else {
            // Fallback calculation with proper power-based damage
            const stats = this.gameState.loadout.stats;
            const baseDamage = Math.max(1, attackerPower - (defenderPower * 0.3));

            // Apply action multiplier
            let actionMultiplier = 1.0;
            if (actionType === 'TECHNIQUE') actionMultiplier = 1.5;
            else if (actionType === 'SPECIAL') actionMultiplier = 2.0;

            let damage = baseDamage * actionMultiplier;

            // Apply critical hit
            if (isCritical === null) {
                const critRoll = Math.random();
                isCritical = critRoll < (stats.critChance || 0.05);
            }

            if (isCritical) {
                damage *= (stats.critMultiplier || 2.0);
            }

            // Add variance
            damage *= (0.9 + Math.random() * 0.2);

            return Math.round(damage);
        }
    }

    processDuelResult(duel) {
        const { result, type, rewards } = duel;

        // Update combat record
        if (result.victory) {
            this.gameState.combat.wins++;
            this.gameState.combat.streak++;
        } else {
            this.gameState.combat.losses++;
            this.gameState.combat.streak = 0;
        }

        // Update rank for ranked matches
        if (type === 'ranked') {
            if (result.victory) {
                this.gameState.combat.rank = Math.max(1, this.gameState.combat.rank - 10);
            } else {
                this.gameState.combat.rank = Math.min(10000, this.gameState.combat.rank + 5);
            }
        }

        // Apply currency rewards
        this.gameState.player.spiritCrystals += rewards.spiritCrystals;
        this.gameState.player.shards += rewards.shards;
        if (rewards.jade > 0) {
            this.gameState.player.jade += rewards.jade;
        }

        // Process material and item rewards
        if (rewards.materials && rewards.materials.length > 0) {
            rewards.materials.forEach(material => {
                // Materials are already added to crafting system in calculateDuelRewards
                console.log(`Received ${material.quantity}x ${material.name}`);
            });
        }

        if (rewards.items && rewards.items.length > 0) {
            rewards.items.forEach(item => {
                // Handle rare item drops
                this.eventManager.emit('inventory:rare_item_received', item);
                console.log(`Received rare item: ${item.name}`);
            });
        }

        this.updateUI();
        this.saveGame();
    }

    calculateDuelRewards(result, type, opponent) {
        const rewards = {
            spiritCrystals: 0,
            shards: 0,
            jade: 0,
            materials: [],
            items: []
        };

        if (!result.victory) {
            // Consolation prizes for losing
            rewards.spiritCrystals = Math.floor(5 + Math.random() * 5);
            return rewards;
        }

        // Base rewards based on opponent power and type
        const opponentPower = opponent.power || 50;
        const powerMultiplier = Math.max(0.5, opponentPower / 100);

        // Currency rewards
        rewards.spiritCrystals = Math.floor((15 + Math.random() * 10) * powerMultiplier);
        rewards.shards = Math.floor((2 + Math.random() * 2) * powerMultiplier);

        if (type === 'ranked') {
            rewards.spiritCrystals = Math.floor(rewards.spiritCrystals * 1.5);
            rewards.shards = Math.floor(rewards.shards * 1.5);
            rewards.jade = Math.floor((3 + Math.random() * 5) * powerMultiplier);
        }

        // Bonus for win streak
        const streakMultiplier = 1 + (this.gameState.combat.streak * 0.1);
        rewards.spiritCrystals = Math.floor(rewards.spiritCrystals * streakMultiplier);
        rewards.shards = Math.floor(rewards.shards * streakMultiplier);

        // Material drops based on opponent loot table
        if (opponent.loot) {
            this.rollForLootDrops(opponent.loot, rewards);
        } else {
            // Default material drops
            this.rollForBasicMaterials(opponentPower, rewards);
        }

        // Rare item drops (low chance)
        this.rollForRareItems(opponentPower, type, rewards);

        // Perfect victory bonus (no damage taken)
        if (result.playerHP === 100 || (result.playerHP / 100 >= 0.95)) {
            rewards.spiritCrystals = Math.floor(rewards.spiritCrystals * 1.25);
            rewards.shards += Math.floor(1 + Math.random() * 2);
        }

        return rewards;
    }

    rollForLootDrops(lootTable, rewards) {
        // Process loot from COMBAT_OPPONENTS data
        if (lootTable.jade && Math.random() < 0.5) {
            const jadeAmount = Math.floor(
                lootTable.jade.min + Math.random() * (lootTable.jade.max - lootTable.jade.min)
            );
            rewards.jade += jadeAmount;
        }

        if (lootTable.spiritCrystals && Math.random() < 0.7) {
            const crystalAmount = Math.floor(
                lootTable.spiritCrystals.min + Math.random() * (lootTable.spiritCrystals.max - lootTable.spiritCrystals.min)
            );
            rewards.spiritCrystals += crystalAmount;
        }

        if (lootTable.items && lootTable.chance && Math.random() < lootTable.chance) {
            const item = lootTable.items[Math.floor(Math.random() * lootTable.items.length)];
            rewards.items.push({
                id: item,
                name: this.getItemName(item),
                type: 'material',
                quantity: 1
            });
        }
    }

    rollForBasicMaterials(opponentPower, rewards) {
        const materialChances = {
            spirit_stone: 0.4,
            cultivation_pill: 0.25,
            iron_ore: 0.3,
            spirit_herb: 0.35,
            beast_core: 0.15
        };

        // Higher power opponents drop better materials more often
        const powerBonus = Math.min(0.3, opponentPower / 500);

        Object.entries(materialChances).forEach(([material, chance]) => {
            const adjustedChance = chance + powerBonus;
            if (Math.random() < adjustedChance) {
                const quantity = Math.floor(1 + Math.random() * 3);
                rewards.materials.push({
                    id: material,
                    name: this.getItemName(material),
                    quantity: quantity
                });

                // Add to crafting system if available
                if (window.craftingSystem && window.craftingSystem.isInitialized) {
                    window.craftingSystem.addMaterial(material, quantity);
                }
            }
        });
    }

    rollForRareItems(opponentPower, combatType, rewards) {
        let rareChance = 0.05; // Base 5% chance

        // Increase chance based on opponent power
        rareChance += Math.min(0.15, opponentPower / 1000);

        // Bonus for ranked combat
        if (combatType === 'ranked') {
            rareChance *= 1.5;
        }

        if (Math.random() < rareChance) {
            const rareItems = [
                { id: 'spirit_essence', name: 'Spirit Essence', type: 'material' },
                { id: 'mystic_crystal', name: 'Mystic Crystal', type: 'material' },
                { id: 'refined_iron', name: 'Refined Iron', type: 'material' },
                { id: 'enhancement_stone', name: 'Enhancement Stone', type: 'material' }
            ];

            // Higher power = better rare items
            let availableItems = rareItems;
            if (opponentPower > 200) {
                availableItems = availableItems.concat([
                    { id: 'dragon_scale', name: 'Dragon Scale', type: 'material' },
                    { id: 'phoenix_feather', name: 'Phoenix Feather', type: 'material' }
                ]);
            }

            const rareItem = availableItems[Math.floor(Math.random() * availableItems.length)];
            rewards.items.push({
                ...rareItem,
                quantity: 1,
                rarity: 'rare'
            });

            // Add to crafting system if available
            if (window.craftingSystem && window.craftingSystem.isInitialized && rareItem.type === 'material') {
                window.craftingSystem.addMaterial(rareItem.id, 1);
            }
        }
    }

    getItemName(itemId) {
        const itemNames = {
            spirit_stone: 'Spirit Stone',
            cultivation_pill: 'Cultivation Pill',
            iron_ore: 'Iron Ore',
            spirit_herb: 'Spirit Herb',
            beast_core: 'Beast Core',
            spirit_essence: 'Spirit Essence',
            mystic_crystal: 'Mystic Crystal',
            refined_iron: 'Refined Iron',
            enhancement_stone: 'Enhancement Stone',
            dragon_scale: 'Dragon Scale',
            phoenix_feather: 'Phoenix Feather',
            healing_pill: 'Healing Pill',
            sect_manual: 'Sect Manual',
            technique_scroll: 'Technique Scroll',
            spirit_wine: 'Spirit Wine',
            rare_technique: 'Rare Technique',
            foundation_pill: 'Foundation Pill',
            golden_core_technique: 'Golden Core Technique',
            immortal_pill: 'Immortal Pill',
            nascent_technique: 'Nascent Soul Technique',
            soul_pill: 'Soul Pill',
            immortal_artifact: 'Immortal Artifact'
        };

        return itemNames[itemId] || itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Sect System Implementation
    findSect() {
        // Simulate finding available sects
        const availableSects = this.generateAvailableSects();
        this.showSectSelectionModal(availableSects);
    }

    generateAvailableSects() {
        const sectNames = [
            "Celestial Harmony Sect", "Iron Mountain Brotherhood", "Flowing River Academy",
            "Azure Sky Pavilion", "Crimson Phoenix Hall", "Silent Thunder Monastery",
            "Golden Lotus Society", "Jade Sword Sect", "Eternal Flame Guild"
        ];

        const sects = [];
        for (let i = 0; i < 5; i++) {
            const sect = {
                id: Math.random().toString(36).substr(2, 9),
                name: sectNames[Math.floor(Math.random() * sectNames.length)],
                members: Math.floor(Math.random() * 50) + 10,
                maxMembers: 50,
                level: Math.floor(Math.random() * 10) + 1,
                buffs: this.generateSectBuffs(),
                description: "A powerful sect seeking dedicated cultivators.",
                requirements: {
                    minPower: Math.floor(Math.random() * 100) + 10,
                    minRealm: "Body Refinement"
                }
            };
            sects.push(sect);
        }

        return sects;
    }

    generateSectBuffs() {
        const possibleBuffs = [
            { name: "Cultivation Speed", description: "+10% cultivation rate", value: 0.1 },
            { name: "Combat Power", description: "+5% damage multiplier", value: 0.05 },
            { name: "Resource Gathering", description: "+15% spirit crystal gain", value: 0.15 },
            { name: "Critical Focus", description: "+2% critical chance", value: 0.02 },
            { name: "Breakthrough Insight", description: "-10% breakthrough requirements", value: 0.1 }
        ];

        const selectedBuffs = [];
        const numBuffs = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numBuffs; i++) {
            const buff = possibleBuffs[Math.floor(Math.random() * possibleBuffs.length)];
            if (!selectedBuffs.find(b => b.name === buff.name)) {
                selectedBuffs.push(buff);
            }
        }

        return selectedBuffs;
    }

    createSect() {
        const cost = 1000; // Spirit crystals
        if (this.gameState.player.spiritCrystals < cost) {
            this.showMessage("Need 1000 Spirit Crystals to create a sect!");
            return;
        }

        const sectName = prompt("Enter sect name:");
        if (!sectName || sectName.trim() === "") {
            return;
        }

        this.gameState.player.spiritCrystals -= cost;
        this.joinSect({
            id: Math.random().toString(36).substr(2, 9),
            name: sectName.trim(),
            members: 1,
            maxMembers: 50,
            level: 1,
            buffs: [{ name: "New Sect Blessing", description: "+5% cultivation rate", value: 0.05 }],
            isLeader: true
        });

        this.showMessage(`Created sect: ${sectName}!`);
    }

    joinSect(sect) {
        this.gameState.sect = {
            id: sect.id,
            name: sect.name,
            contribution: 0,
            buffs: sect.buffs,
            rituals: this.generateSectRituals(),
            isLeader: sect.isLeader || false
        };

        this.applySectBuffs();
        this.updateSectDisplay();
    }

    applySectBuffs() {
        // Apply sect buffs to cultivation and combat
        this.gameState.sect.buffs.forEach(buff => {
            switch (buff.name) {
                case "Cultivation Speed":
                case "New Sect Blessing":
                    this.gameState.cultivation.qi.multiplier += buff.value;
                    this.gameState.cultivation.body.multiplier += buff.value;
                    break;
                case "Combat Power":
                    this.gameState.loadout.stats.damageMultiplier += buff.value;
                    break;
                case "Resource Gathering":
                    // Applied in processIdleRewards
                    break;
                case "Critical Focus":
                    this.gameState.loadout.stats.critChance += buff.value;
                    break;
            }
        });
    }

    generateSectRituals() {
        return [
            {
                id: 1,
                name: "Ritual of Harmony",
                description: "Collective meditation to boost cultivation",
                cost: 500,
                progress: 0,
                target: 5000,
                reward: "All members gain +20% cultivation for 24 hours",
                timeLeft: 24 * 60 * 60 * 1000, // 24 hours
                participants: []
            },
            {
                id: 2,
                name: "Treasure Hunt Ritual",
                description: "Combine resources to unlock rare scriptures",
                cost: 200,
                progress: 0,
                target: 2000,
                reward: "All members receive a random Rare+ scripture",
                timeLeft: 12 * 60 * 60 * 1000, // 12 hours
                participants: []
            }
        ];
    }

    donateCrystals() {
        const amount = parseInt(prompt("How many Spirit Crystals to donate?") || "0");
        if (amount <= 0 || amount > this.gameState.player.spiritCrystals) {
            this.showMessage("Invalid donation amount!");
            return;
        }

        this.gameState.player.spiritCrystals -= amount;
        this.gameState.sect.contribution += amount;

        // Advance random ritual
        const activeRituals = this.gameState.sect.rituals.filter(r => r.progress < r.target);
        if (activeRituals.length > 0) {
            const ritual = activeRituals[Math.floor(Math.random() * activeRituals.length)];
            ritual.progress += amount;

            if (ritual.progress >= ritual.target) {
                this.completeRitual(ritual);
            }
        }

        this.showMessage(`Donated ${amount} Spirit Crystals to the sect!`);
        this.updateUI();
        this.saveGame();
    }

    completeRitual(ritual) {
        this.showMessage(`Sect ritual "${ritual.name}" completed! ${ritual.reward}`);

        // Apply ritual rewards
        if (ritual.name === "Ritual of Harmony") {
            // Temporary cultivation boost
            const originalQiMult = this.gameState.cultivation.qi.multiplier;
            const originalBodyMult = this.gameState.cultivation.body.multiplier;

            this.gameState.cultivation.qi.multiplier *= 1.2;
            this.gameState.cultivation.body.multiplier *= 1.2;

            setTimeout(() => {
                this.gameState.cultivation.qi.multiplier = originalQiMult;
                this.gameState.cultivation.body.multiplier = originalBodyMult;
                this.showMessage("Ritual of Harmony effect has worn off.");
            }, ritual.timeLeft);
        } else if (ritual.name === "Treasure Hunt Ritual") {
            // Give rare scripture
            const rareScripture = this.generateRandomScripture();
            rareScripture.rarity = Math.max(3, rareScripture.rarity); // Ensure at least rare
            this.addScripture(rareScripture);
            this.showMessage(`Received ${rareScripture.name} from ritual!`);
        }

        // Reset ritual
        ritual.progress = 0;
        ritual.timeLeft = ritual.name === "Ritual of Harmony" ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    }

    leaveSect() {
        if (confirm("Are you sure you want to leave your sect?")) {
            this.gameState.sect = {
                id: null,
                name: null,
                contribution: 0,
                buffs: [],
                rituals: []
            };

            // Remove sect buffs and recalculate
            this.updateCultivationRates();
            this.calculateLoadoutBonuses();

            this.updateSectDisplay();
            this.showMessage("Left sect.");
        }
    }

    updateSectDisplay() {
        const sectStatus = document.getElementById('sect-status');
        const sectDetails = document.getElementById('sect-details');

        if (this.gameState.sect.id) {
            sectStatus.querySelector('.no-sect').style.display = 'none';
            sectDetails.classList.remove('hidden');

            document.getElementById('sect-name').textContent = this.gameState.sect.name;
            document.getElementById('sect-contribution').textContent = this.gameState.sect.contribution;

            // Update buffs
            const buffList = document.getElementById('sect-buff-list');
            buffList.innerHTML = this.gameState.sect.buffs.map(buff =>
                `<div class="buff-item">${buff.name}: ${buff.description}</div>`
            ).join('') || '<p>No active buffs</p>';

            // Update rituals
            const ritualList = document.getElementById('sect-ritual-list');
            ritualList.innerHTML = this.gameState.sect.rituals.map(ritual => {
                const progressPercent = (ritual.progress / ritual.target) * 100;
                return `
                    <div class="ritual-item">
                        <h5>${ritual.name}</h5>
                        <p>${ritual.description}</p>
                        <div class="ritual-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <span>${ritual.progress}/${ritual.target}</span>
                        </div>
                        <p class="ritual-reward">Reward: ${ritual.reward}</p>
                    </div>
                `;
            }).join('');
        } else {
            sectStatus.querySelector('.no-sect').style.display = 'block';
            sectDetails.classList.add('hidden');
        }
    }

    showSectSelectionModal(sects) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Available Sects</h2>
                <div class="sect-list">
                    ${sects.map(sect => `
                        <div class="sect-option" data-sect-id="${sect.id}">
                            <h3>${sect.name}</h3>
                            <p>Members: ${sect.members}/${sect.maxMembers} | Level: ${sect.level}</p>
                            <p>Requirements: ${sect.requirements.minPower} Power, ${sect.requirements.minRealm}+</p>
                            <div class="sect-buffs">
                                ${sect.buffs.map(buff => `<span class="buff-tag">${buff.name}</span>`).join('')}
                            </div>
                            <button onclick="game.requestJoinSect('${sect.id}', '${sect.name}', ${JSON.stringify(sect).replace(/"/g, '&quot;')})" class="btn-primary">
                                ${this.gameState.player.power >= sect.requirements.minPower ? 'Join' : 'Power Too Low'}
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-secondary">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    requestJoinSect(sectId, sectName, sectData) {
        if (typeof sectData === 'string') {
            sectData = JSON.parse(sectData.replace(/&quot;/g, '"'));
        }

        this.joinSect(sectData);
        this.showMessage(`Joined ${sectName}!`);

        // Close modal
        document.querySelector('.modal').remove();
    }

    // Quest System Implementation
    initializeQuests() {
        this.generateDailyQuests();
        this.generateWeeklyQuests();
        this.generateAchievements();
    }

    generateDailyQuests() {
        const questTemplates = [
            {
                id: 'cultivate_time',
                name: 'Dedicated Cultivation',
                description: 'Cultivate for 10 minutes',
                type: 'time',
                target: 600, // 10 minutes in seconds
                progress: 0,
                reward: { spiritCrystals: 50, shards: 2 }
            },
            {
                id: 'win_duels',
                name: 'Prove Your Strength',
                description: 'Win 3 duels',
                type: 'wins',
                target: 3,
                progress: 0,
                reward: { spiritCrystals: 30, jade: 10 }
            },
            {
                id: 'pull_scriptures',
                name: 'Seek Knowledge',
                description: 'Pull 5 scriptures',
                type: 'pulls',
                target: 5,
                progress: 0,
                reward: { spiritCrystals: 25, shards: 3 }
            },
            {
                id: 'donate_sect',
                name: 'Sect Contribution',
                description: 'Donate 200 Spirit Crystals to sect',
                type: 'donation',
                target: 200,
                progress: 0,
                reward: { jade: 15, shards: 5 }
            }
        ];

        // Reset daily quests
        this.gameState.quests.daily = [];

        // Select 3 random daily quests
        const shuffled = questTemplates.sort(() => Math.random() - 0.5);
        for (let i = 0; i < 3; i++) {
            const quest = { ...shuffled[i] };
            quest.id = `daily_${quest.id}_${Date.now()}_${i}`;
            quest.isDaily = true;
            this.gameState.quests.daily.push(quest);
        }
    }

    generateWeeklyQuests() {
        const questTemplates = [
            {
                id: 'reach_realm',
                name: 'Ascension Path',
                description: 'Reach the next realm',
                type: 'realm',
                target: 1,
                progress: 0,
                reward: { jade: 100, shards: 20 }
            },
            {
                id: 'win_streak',
                name: 'Unstoppable Force',
                description: 'Achieve a 10 win streak',
                type: 'streak',
                target: 10,
                progress: 0,
                reward: { jade: 75, shards: 15 }
            },
            {
                id: 'collect_legendary',
                name: 'Legendary Seeker',
                description: 'Obtain a Legendary scripture',
                type: 'legendary',
                target: 1,
                progress: 0,
                reward: { jade: 200, shards: 50 }
            },
            {
                id: 'power_threshold',
                name: 'Power Cultivation',
                description: 'Reach 500 total power',
                type: 'power',
                target: 500,
                progress: 0,
                reward: { jade: 150, shards: 30 }
            }
        ];

        // Reset weekly quests if it's been a week
        if (this.gameState.quests.weekly.length === 0) {
            const shuffled = questTemplates.sort(() => Math.random() - 0.5);
            for (let i = 0; i < 2; i++) {
                const quest = { ...shuffled[i] };
                quest.id = `weekly_${quest.id}_${Date.now()}_${i}`;
                quest.isWeekly = true;
                this.gameState.quests.weekly.push(quest);
            }
        }
    }

    generateAchievements() {
        if (this.gameState.quests.achievements.length === 0) {
            const achievements = [
                {
                    id: 'first_victory',
                    name: 'First Victory',
                    description: 'Win your first duel',
                    type: 'wins',
                    target: 1,
                    progress: 0,
                    reward: { jade: 50, shards: 10 },
                    completed: false
                },
                {
                    id: 'hundred_wins',
                    name: 'Battle Master',
                    description: 'Win 100 duels',
                    type: 'wins',
                    target: 100,
                    progress: 0,
                    reward: { jade: 500, shards: 100 },
                    completed: false
                },
                {
                    id: 'foundation_realm',
                    name: 'Foundation Seeker',
                    description: 'Reach Foundation Realm',
                    type: 'realm_name',
                    target: 'Foundation',
                    progress: 0,
                    reward: { jade: 200, shards: 50 },
                    completed: false
                },
                {
                    id: 'sect_master',
                    name: 'Sect Master',
                    description: 'Create your own sect',
                    type: 'sect_create',
                    target: 1,
                    progress: 0,
                    reward: { jade: 300, shards: 75 },
                    completed: false
                }
            ];

            this.gameState.quests.achievements = achievements;
        }
    }

    checkQuestResets() {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const oneWeekMs = 7 * oneDayMs;

        // Reset daily quests
        if (now - this.gameState.quests.lastDailyReset > oneDayMs) {
            this.gameState.quests.lastDailyReset = now;
            this.generateDailyQuests();
            this.showMessage("Daily quests have been reset!");
        }

        // Reset weekly quests
        if (now - this.gameState.quests.lastWeeklyReset > oneWeekMs) {
            this.gameState.quests.lastWeeklyReset = now;
            this.generateWeeklyQuests();
            this.showMessage("Weekly quests have been reset!");
        }
    }

    updateQuestProgress(type, amount = 1) {
        const allQuests = [
            ...this.gameState.quests.daily,
            ...this.gameState.quests.weekly,
            ...this.gameState.quests.achievements
        ];

        allQuests.forEach(quest => {
            if (quest.type === type && !quest.completed) {
                quest.progress += amount;

                if (quest.progress >= quest.target) {
                    this.completeQuest(quest);
                }
            }
        });
    }

    completeQuest(quest) {
        quest.completed = true;
        quest.progress = quest.target;

        // Apply rewards
        Object.keys(quest.reward).forEach(resource => {
            if (this.gameState.player[resource] !== undefined) {
                this.gameState.player[resource] += quest.reward[resource];
            }
        });

        const questType = quest.isDaily ? 'Daily' : quest.isWeekly ? 'Weekly' : 'Achievement';
        this.showMessage(`${questType} Quest Complete: ${quest.name}! Rewards claimed.`);

        this.updateUI();
        this.saveGame();
    }

    // Override relevant methods to trigger quest updates
    processDuelResult(duel) {
        const { result, type, rewards } = duel;

        // Update combat record
        if (result.victory) {
            this.gameState.combat.wins++;
            this.gameState.combat.streak++;
            this.updateQuestProgress('wins', 1);
            this.updateQuestProgress('streak', this.gameState.combat.streak);
        } else {
            this.gameState.combat.losses++;
            this.gameState.combat.streak = 0;
        }

        // Update rank for ranked matches
        if (type === 'ranked') {
            if (result.victory) {
                this.gameState.combat.rank = Math.max(1, this.gameState.combat.rank - 10);
            } else {
                this.gameState.combat.rank = Math.min(10000, this.gameState.combat.rank + 5);
            }
        }

        // Apply rewards
        this.gameState.player.spiritCrystals += rewards.spiritCrystals;
        this.gameState.player.shards += rewards.shards;
        if (rewards.jade > 0) {
            this.gameState.player.jade += rewards.jade;
        }

        this.updateUI();
        this.saveGame();
    }

    performGachaPull(count) {
        const cost = count === 1 ? 100 : 1000;

        if (this.gameState.player.jade < cost) {
            this.showMessage("Not enough Jade!");
            return;
        }

        this.gameState.player.jade -= cost;
        const results = [];

        for (let i = 0; i < count; i++) {
            this.gameState.gacha.pityCounter++;
            const scripture = this.generateRandomScripture();
            results.push(scripture);
            this.addScripture(scripture);

            // Update quest progress
            this.updateQuestProgress('pulls', 1);
            if (scripture.rarity >= 5) {
                this.updateQuestProgress('legendary', 1);
            }

            // Reset pity on legendary
            if (scripture.rarity >= 5) {
                this.gameState.gacha.pityCounter = 0;
            }
        }

        this.showGachaResults(results);
        this.updateUI();
        this.saveGame();
    }

    donateCrystals() {
        const amount = parseInt(prompt("How many Spirit Crystals to donate?") || "0");
        if (amount <= 0 || amount > this.gameState.player.spiritCrystals) {
            this.showMessage("Invalid donation amount!");
            return;
        }

        this.gameState.player.spiritCrystals -= amount;
        this.gameState.sect.contribution += amount;

        // Update quest progress
        this.updateQuestProgress('donation', amount);

        // Advance random ritual
        const activeRituals = this.gameState.sect.rituals.filter(r => r.progress < r.target);
        if (activeRituals.length > 0) {
            const ritual = activeRituals[Math.floor(Math.random() * activeRituals.length)];
            ritual.progress += amount;

            if (ritual.progress >= ritual.target) {
                this.completeRitual(ritual);
            }
        }

        this.showMessage(`Donated ${amount} Spirit Crystals to the sect!`);
        this.updateUI();
        this.saveGame();
    }

    createSect() {
        const cost = 1000; // Spirit crystals
        if (this.gameState.player.spiritCrystals < cost) {
            this.showMessage("Need 1000 Spirit Crystals to create a sect!");
            return;
        }

        const sectName = prompt("Enter sect name:");
        if (!sectName || sectName.trim() === "") {
            return;
        }

        this.gameState.player.spiritCrystals -= cost;
        this.joinSect({
            id: Math.random().toString(36).substr(2, 9),
            name: sectName.trim(),
            members: 1,
            maxMembers: 50,
            level: 1,
            buffs: [{ name: "New Sect Blessing", description: "+5% cultivation rate", value: 0.05 }],
            isLeader: true
        });

        // Update quest progress
        this.updateQuestProgress('sect_create', 1);

        this.showMessage(`Created sect: ${sectName}!`);
    }

    advanceRealm() {
        const realmProgression = [
            { name: "Body Refinement", stages: 10 },
            { name: "Qi Condensation", stages: 10 },
            { name: "Foundation", stages: 5 },
            { name: "Core Formation", stages: 3 },
            { name: "Nascent Soul", stages: 3 },
            { name: "Soul Transformation", stages: 1 }
        ];

        const currentIndex = realmProgression.findIndex(r => r.name === this.gameState.realm.current);
        if (currentIndex < realmProgression.length - 1) {
            const nextRealm = realmProgression[currentIndex + 1];
            this.gameState.realm.current = nextRealm.name;
            this.gameState.realm.stage = 1;
            this.gameState.realm.maxStage = nextRealm.stages;

            // Update quest progress
            this.updateQuestProgress('realm', 1);
            this.updateQuestProgress('realm_name', nextRealm.name);

            // Unlock features based on realm
            this.unlockRealmFeatures(nextRealm.name);

            this.showMessage(`Realm breakthrough! Welcome to ${nextRealm.name}!`);
        }
    }

    processCultivation(deltaTime) {
        const { qi, body, dual } = this.gameState.cultivation;

        // Track cultivation time for quests
        this.updateQuestProgress('time', deltaTime);

        // Process Qi cultivation
        this.processCultivationPath(qi, deltaTime);

        // Process Body cultivation
        this.processCultivationPath(body, deltaTime);

        // Process Dual cultivation (if unlocked)
        if (dual.unlocked) {
            this.processCultivationPath(dual, deltaTime);
        }
    }

    calculateTotalPower() {
        const stats = this.gameState.loadout.stats;
        const baseDPS = (10 + stats.flatDamage) * stats.damageMultiplier * stats.attackSpeed;
        const critFactor = 1 + (stats.critChance * (stats.critMultiplier - 1));
        this.gameState.player.power = baseDPS * critFactor;

        // Update power quest progress
        this.updateQuestProgress('power', this.gameState.player.power);
    }

    // Utility Functions
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    switchBanner(bannerName) {
        this.gameState.gacha.currentBanner = bannerName;

        document.querySelectorAll('.banner-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-banner="${bannerName}"]`).classList.add('active');
    }

    filterScriptures(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Filter scripture display (implementation depends on scripture UI)
        this.renderScriptureGrid(filter);
    }

    renderScriptureGrid(filter = 'all') {
        const grid = document.getElementById('scripture-grid');
        grid.innerHTML = '';

        let scriptures = this.gameState.scriptures.collection;
        if (filter !== 'all') {
            scriptures = scriptures.filter(s => s.type === filter);
        }

        scriptures.forEach(scripture => {
            const scriptureElement = this.createScriptureElement(scripture);
            grid.appendChild(scriptureElement);
        });
    }

    createScriptureElement(scripture) {
        const element = document.createElement('div');
        element.className = `scripture-card rarity-${this.getRarityName(scripture.rarity).toLowerCase()}`;
        element.innerHTML = `
            <div class="scripture-header">
                <div class="scripture-name">${scripture.name}</div>
                <div class="scripture-rarity">${this.getRarityName(scripture.rarity)}</div>
            </div>
            <div class="scripture-stats">
                ${Object.entries(scripture.stats).map(([stat, value]) =>
                    `<div class="scripture-stat">
                        <span class="scripture-stat-name">${stat}</span>
                        <span class="scripture-stat-value">${value}</span>
                    </div>`
                ).join('')}
            </div>
            <div class="scripture-level">Level ${scripture.level}/${scripture.maxLevel}</div>
            <button class="equip-btn" onclick="game.equipScripture(${scripture.id})">
                ${scripture.equipped ? 'Unequip' : 'Equip'}
            </button>
        `;

        return element;
    }

    equipScripture(scriptureId) {
        const scripture = this.getScriptureById(scriptureId);
        if (!scripture) return;

        // Find appropriate slot
        const slotName = this.findBestSlot(scripture);
        if (slotName) {
            // Unequip current scripture in slot
            const currentId = this.gameState.loadout.slots[slotName];
            if (currentId) {
                const currentScripture = this.getScriptureById(currentId);
                if (currentScripture) {
                    currentScripture.equipped = false;
                }
            }

            // Equip new scripture
            this.gameState.loadout.slots[slotName] = scriptureId;
            scripture.equipped = true;

            this.calculateLoadoutBonuses();
            this.updateUI();
            this.saveGame();
        }
    }

    findBestSlot(scripture) {
        // Try type-specific slot first
        if (scripture.type === 'qi' && !this.gameState.loadout.slots.qi) {
            return 'qi';
        }
        if (scripture.type === 'body' && !this.gameState.loadout.slots.body) {
            return 'body';
        }
        if (scripture.type === 'dual' && !this.gameState.loadout.slots.dual &&
            this.gameState.cultivation.dual.unlocked) {
            return 'dual';
        }

        // Try extra slots
        if (!this.gameState.loadout.slots.extra1) {
            return 'extra1';
        }
        if (!this.gameState.loadout.slots.extra2) {
            return 'extra2';
        }

        // Fallback to replacing same type
        if (scripture.type === 'qi') return 'qi';
        if (scripture.type === 'body') return 'body';
        if (scripture.type === 'dual' && this.gameState.cultivation.dual.unlocked) return 'dual';

        return 'extra1'; // Final fallback
    }

    getScriptureById(id) {
        return this.gameState.scriptures.collection.find(s => s.id === id);
    }

    // Special Actions
    activateMeditation() {
        // 2x cultivation speed for 5 minutes
        const cost = 50; // Spirit crystals

        if (this.gameState.player.spiritCrystals >= cost) {
            this.gameState.player.spiritCrystals -= cost;

            // Apply meditation buff
            this.gameState.cultivation.qi.multiplier *= 2;
            this.gameState.cultivation.body.multiplier *= 2;
            if (this.gameState.cultivation.dual.unlocked) {
                this.gameState.cultivation.dual.multiplier *= 2;
            }

            // Remove buff after 5 minutes
            setTimeout(() => {
                this.gameState.cultivation.qi.multiplier /= 2;
                this.gameState.cultivation.body.multiplier /= 2;
                if (this.gameState.cultivation.dual.unlocked) {
                    this.gameState.cultivation.dual.multiplier /= 2;
                }
                this.showMessage("Meditation effect has worn off.");
            }, 5 * 60 * 1000);

            this.showMessage("Meditation activated! 2x cultivation speed for 5 minutes.");
            this.updateUI();
            this.saveGame();
        } else {
            this.showMessage("Not enough Spirit Crystals for meditation!");
        }
    }

    // UI Helper Functions
    showCharacterCreation() {
        document.getElementById('character-creation').style.display = 'flex';
        document.getElementById('game-interface').classList.add('hidden');
    }

    hideCharacterCreation() {
        document.getElementById('character-creation').style.display = 'none';
    }

    showGameInterface() {
        document.getElementById('game-interface').classList.remove('hidden');
        this.updateUI();
        this.renderScriptureGrid();
        this.calculateOfflineProgress();
    }

    showMessage(message) {
        // Create or update message display
        let messageDiv = document.getElementById('game-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'game-message';
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #d4af37, #b8941f);
                color: #1a1a2e;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: bold;
                z-index: 2000;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(messageDiv);
        }

        messageDiv.textContent = message;
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(-50%) translateY(0)';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 3000);
    }

    showTutorialMessage(message) {
        this.showMessage(message);
    }

    showGachaResults(results) {
        // Create modal to show gacha results
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Scripture Obtained!</h2>
                <div class="gacha-results">
                    ${results.map(scripture => `
                        <div class="result-item rarity-${this.getRarityName(scripture.rarity).toLowerCase()}">
                            <h3>${scripture.name}</h3>
                            <p class="rarity">${this.getRarityName(scripture.rarity)} ${scripture.type}</p>
                            <div class="stats">
                                ${Object.entries(scripture.stats).map(([stat, value]) =>
                                    `<div>${stat}: ${value}</div>`
                                ).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn-primary">Continue</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showOfflineProgressModal(rewards, timeOffline) {
        const hours = Math.floor(timeOffline / 3600);
        const minutes = Math.floor((timeOffline % 3600) / 60);

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Welcome Back!</h2>
                <p>You were away for ${hours}h ${minutes}m</p>
                <div class="offline-rewards">
                    <h3>Offline Progress:</h3>
                    ${rewards.qiLevels > 0 ? `<div>Qi Levels: +${rewards.qiLevels}</div>` : ''}
                    ${rewards.bodyLevels > 0 ? `<div>Body Levels: +${rewards.bodyLevels}</div>` : ''}
                    ${rewards.dualLevels > 0 ? `<div>Dual Levels: +${rewards.dualLevels}</div>` : ''}
                    <div>Spirit Crystals: +${Math.floor(rewards.spiritCrystals)}</div>
                    ${rewards.shards > 0 ? `<div>Shards: +${Math.floor(rewards.shards)}</div>` : ''}
                </div>
                <button onclick="game.claimOfflineRewards(${JSON.stringify(rewards).replace(/"/g, '&quot;')}); this.parentElement.parentElement.remove();" class="btn-primary">Claim Rewards</button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    claimOfflineRewards(rewards) {
        // Apply offline rewards
        this.gameState.cultivation.qi.level += rewards.qiLevels;
        this.gameState.cultivation.body.level += rewards.bodyLevels;
        this.gameState.cultivation.dual.level += rewards.dualLevels;
        this.gameState.player.spiritCrystals += rewards.spiritCrystals;
        this.gameState.player.shards += rewards.shards;

        // Recalculate cultivation rates and power
        this.updateCultivationRates();
        this.calculateLoadoutBonuses();

        this.updateUI();
        this.saveGame();
    }

    // Enhanced Save/Load System
    async saveGame(options = {}) {
        try {
            this.gameState.lastSave = Date.now();

            // Use enhanced save system if available
            if (window.gameSaveSystem && window.gameSaveSystem.isInitialized) {
                return await window.gameSaveSystem.saveGame(options);
            } else {
                // Fallback to basic save
                return this.saveGameBasic(options);
            }
        } catch (error) {
            console.error('Game: Save failed:', error);
            // Emergency fallback
            return this.emergencySave();
        }
    }

    async loadGame(options = {}) {
        try {
            // Use enhanced save system if available
            if (window.gameSaveSystem && window.gameSaveSystem.isInitialized) {
                return await window.gameSaveSystem.loadGame(options);
            } else {
                // Fallback to basic load
                return this.loadGameBasic(options);
            }
        } catch (error) {
            console.error('Game: Load failed:', error);
            return null;
        }
    }

    // Fallback methods for basic save/load
    saveGameBasic(options = {}) {
        try {
            this.gameState.lastSave = Date.now();
            localStorage.setItem('idleCultivationSave', JSON.stringify(this.gameState));
            return true;
        } catch (e) {
            console.error('Failed to save game (basic):', e);
            return false;
        }
    }

    loadGameBasic(options = {}) {
        try {
            const saveData = localStorage.getItem('idleCultivationSave');
            if (saveData) {
                const loaded = JSON.parse(saveData);
                // Validate and migrate save data if needed
                return this.migrateSaveData(loaded);
            }
        } catch (e) {
            console.error('Failed to load game (basic):', e);
        }
        return null;
    }

    emergencySave() {
        try {
            console.log('Game: Performing emergency save');
            this.gameState.lastSave = Date.now();
            localStorage.setItem('idleCultivationSave_emergency', JSON.stringify(this.gameState));
            return true;
        } catch (error) {
            console.error('Game: Emergency save failed:', error);
            return false;
        }
    }

    migrateSaveData(saveData) {
        // Add any missing properties from new game state
        const newState = this.createNewGameState();
        return this.deepMerge(newState, saveData);
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    // Utility Functions
    rollRarity() {
        const roll = Math.random() * 100;
        if (roll < 2) return 5; // Legendary
        if (roll < 8) return 4; // Epic
        if (roll < 20) return 3; // Rare
        if (roll < 45) return 2; // Uncommon
        return 1; // Common
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    window.game = new IdleCultivationGame();
});

// Add CSS for new elements
const additionalCSS = `
.gacha-results {
    display: grid;
    gap: 15px;
    margin: 20px 0;
}

.result-item {
    background: linear-gradient(145deg, #2a2a3e, #1e1e32);
    border: 2px solid #4a4a6a;
    border-radius: 10px;
    padding: 15px;
    text-align: center;
}

.result-item h3 {
    margin-bottom: 5px;
    color: #e8e8e8;
}

.result-item .rarity {
    font-weight: bold;
    margin-bottom: 10px;
}

.result-item .stats {
    font-size: 0.9em;
    color: #c0c0c0;
}

.offline-rewards {
    background: linear-gradient(145deg, #2a2a3e, #1e1e32);
    border: 2px solid #4a4a6a;
    border-radius: 10px;
    padding: 20px;
    margin: 20px 0;
}

.offline-rewards h3 {
    color: #d4af37;
    margin-bottom: 15px;
}

.offline-rewards div {
    margin: 5px 0;
    padding: 5px 0;
    border-bottom: 1px solid #3a3a4e;
}

.scripture-card {
    background: linear-gradient(145deg, #2a2a3e, #1e1e32);
    border: 2px solid #4a4a6a;
    border-radius: 10px;
    padding: 15px;
    transition: all 0.3s ease;
}

.scripture-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.scripture-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.scripture-header h4 {
    color: #e8e8e8;
    margin: 0;
}

.scripture-header .rarity {
    font-size: 0.8em;
    font-weight: bold;
}

.scripture-stats {
    font-size: 0.9em;
    color: #c0c0c0;
    margin-bottom: 10px;
}

.scripture-stats div {
    margin: 2px 0;
}

.scripture-level {
    font-size: 0.8em;
    color: #d4af37;
    margin-bottom: 10px;
}

.equip-btn {
    width: 100%;
    padding: 8px;
    background: linear-gradient(135d, #4a4a6a, #3a3a5a);
    border: 1px solid #6a6a8a;
    border-radius: 5px;
    color: #e8e8e8;
    cursor: pointer;
    transition: all 0.3s ease;
}

.equip-btn:hover {
    background: linear-gradient(135deg, #5a5a7a, #4a4a6a);
    border-color: #c9a96e;
}

#game-message {
    pointer-events: none;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);