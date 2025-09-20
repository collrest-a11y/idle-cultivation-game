/**
 * Combat Data - Configuration for combat system, power calculations, and opponents
 * Contains formulas, opponent definitions, and combat mechanics constants
 */

// Combat action types and their properties
const COMBAT_ACTIONS = {
    ATTACK: {
        id: 'attack',
        name: 'Attack',
        description: 'Basic physical or qi-based attack',
        baseDamageMultiplier: 1.0,
        accuracy: 0.9,
        critChance: 0.05,
        qiCost: 0,
        cooldown: 0
    },
    DEFEND: {
        id: 'defend',
        name: 'Defend',
        description: 'Reduce incoming damage and build qi',
        damageReduction: 0.5,
        qiGain: 10,
        accuracy: 1.0,
        critChance: 0,
        qiCost: 0,
        cooldown: 0
    },
    TECHNIQUE: {
        id: 'technique',
        name: 'Technique',
        description: 'Use a cultivation technique in combat',
        baseDamageMultiplier: 1.5,
        accuracy: 0.8,
        critChance: 0.1,
        qiCost: 20,
        cooldown: 2
    },
    RETREAT: {
        id: 'retreat',
        name: 'Retreat',
        description: 'Attempt to flee from combat',
        successChance: 0.7,
        qiCost: 5,
        cooldown: 0
    },
    SPECIAL: {
        id: 'special',
        name: 'Special Ability',
        description: 'Unique technique based on cultivation realm',
        baseDamageMultiplier: 2.0,
        accuracy: 0.75,
        critChance: 0.15,
        qiCost: 50,
        cooldown: 5
    }
};

// Status effects that can be applied during combat
const COMBAT_STATUS_EFFECTS = {
    POISONED: {
        id: 'poisoned',
        name: 'Poisoned',
        description: 'Takes damage over time',
        damagePerTurn: 0.05, // 5% of max health per turn
        duration: 5,
        stackable: true,
        maxStacks: 3
    },
    BLEEDING: {
        id: 'bleeding',
        name: 'Bleeding',
        description: 'Takes physical damage over time',
        damagePerTurn: 0.03,
        duration: 3,
        stackable: true,
        maxStacks: 5
    },
    STUNNED: {
        id: 'stunned',
        name: 'Stunned',
        description: 'Cannot act for one turn',
        skipTurn: true,
        duration: 1,
        stackable: false
    },
    EMPOWERED: {
        id: 'empowered',
        name: 'Empowered',
        description: 'Increased damage output',
        damageMultiplier: 1.3,
        duration: 3,
        stackable: false
    },
    PROTECTED: {
        id: 'protected',
        name: 'Protected',
        description: 'Reduced incoming damage',
        damageReduction: 0.25,
        duration: 3,
        stackable: false
    },
    QI_DISRUPTED: {
        id: 'qi_disrupted',
        name: 'Qi Disrupted',
        description: 'Cannot use techniques',
        preventTechniques: true,
        duration: 2,
        stackable: false
    }
};

// Power calculation formulas
const COMBAT_FORMULAS = {
    // Base power calculation from cultivation levels
    basePower: (qiLevel, bodyLevel, realm, stage) => {
        const realmData = window.CULTIVATION_REALMS ? window.CULTIVATION_REALMS[realm] : null;

        // Base power from cultivation levels
        const qiPower = qiLevel * 10;
        const bodyPower = bodyLevel * 8;
        const basePower = qiPower + bodyPower;

        // Realm multiplier
        let realmMultiplier = 1.0;
        if (realmData) {
            const qiCapacity = realmData.benefits.qiCapacityMultiplier || 1.0;
            const bodyStrength = realmData.benefits.bodyStrengthMultiplier || 1.0;
            realmMultiplier = (qiCapacity + bodyStrength) / 2;
        }

        // Stage bonus
        const stageMultiplier = 1 + (stage * 0.05);

        return Math.round(basePower * realmMultiplier * stageMultiplier);
    },

    // Scripture power contribution
    scripturePower: (equippedScriptures) => {
        if (!equippedScriptures || !Array.isArray(equippedScriptures)) {
            return 0;
        }

        let scripturePower = 0;
        equippedScriptures.forEach(scripture => {
            if (scripture && scripture.power) {
                // Scripture power contributes differently based on type
                let contribution = scripture.power;
                if (scripture.category === 'combat') {
                    contribution *= 1.5; // Combat scriptures more effective
                } else if (scripture.category === 'utility') {
                    contribution *= 0.7; // Utility scriptures less combat effective
                }
                scripturePower += contribution;
            }
        });

        return Math.round(scripturePower);
    },

    // Equipment power contribution
    equipmentPower: (equipment) => {
        if (!equipment || typeof equipment !== 'object') {
            return 0;
        }

        let equipPower = 0;
        Object.values(equipment).forEach(item => {
            if (item && item.combatPower) {
                equipPower += item.combatPower;
            }
        });

        return Math.round(equipPower);
    },

    // Total combat power calculation
    totalCombatPower: (qiLevel, bodyLevel, realm, stage, scriptures, equipment, modifiers = {}) => {
        const base = COMBAT_FORMULAS.basePower(qiLevel, bodyLevel, realm, stage);
        const scriptureBonus = COMBAT_FORMULAS.scripturePower(scriptures);
        const equipmentBonus = COMBAT_FORMULAS.equipmentPower(equipment);

        let total = base + scriptureBonus + equipmentBonus;

        // Apply modifiers
        if (modifiers.powerMultiplier) {
            total *= modifiers.powerMultiplier;
        }
        if (modifiers.flatBonus) {
            total += modifiers.flatBonus;
        }

        return Math.round(total);
    },

    // Health calculation
    maxHealth: (bodyLevel, realm, stage, modifiers = {}) => {
        const baseHealth = 100 + (bodyLevel * 15);
        const realmData = window.CULTIVATION_REALMS ? window.CULTIVATION_REALMS[realm] : null;

        let realmMultiplier = 1.0;
        if (realmData && realmData.benefits.bodyStrengthMultiplier) {
            realmMultiplier = realmData.benefits.bodyStrengthMultiplier;
        }

        const stageBonus = 1 + (stage * 0.03);
        let total = Math.round(baseHealth * realmMultiplier * stageBonus);

        if (modifiers.healthMultiplier) {
            total *= modifiers.healthMultiplier;
        }
        if (modifiers.flatHealthBonus) {
            total += modifiers.flatHealthBonus;
        }

        return total;
    },

    // Qi capacity in combat
    maxQi: (qiLevel, realm, stage, modifiers = {}) => {
        const baseQi = 50 + (qiLevel * 8);
        const realmData = window.CULTIVATION_REALMS ? window.CULTIVATION_REALMS[realm] : null;

        let realmMultiplier = 1.0;
        if (realmData && realmData.benefits.qiCapacityMultiplier) {
            realmMultiplier = realmData.benefits.qiCapacityMultiplier;
        }

        const stageBonus = 1 + (stage * 0.04);
        let total = Math.round(baseQi * realmMultiplier * stageBonus);

        if (modifiers.qiMultiplier) {
            total *= modifiers.qiMultiplier;
        }
        if (modifiers.flatQiBonus) {
            total += modifiers.flatQiBonus;
        }

        return total;
    },

    // Damage calculation
    calculateDamage: (attackerPower, defenderPower, action, critical = false, modifiers = {}) => {
        const actionData = COMBAT_ACTIONS[action] || COMBAT_ACTIONS.ATTACK;

        // Base damage is difference in power with action multiplier
        let baseDamage = (attackerPower - defenderPower * 0.3) * actionData.baseDamageMultiplier;
        baseDamage = Math.max(1, baseDamage); // Minimum 1 damage

        // Critical hit
        if (critical) {
            baseDamage *= 2.0;
        }

        // Apply modifiers
        if (modifiers.damageMultiplier) {
            baseDamage *= modifiers.damageMultiplier;
        }
        if (modifiers.flatDamageBonus) {
            baseDamage += modifiers.flatDamageBonus;
        }

        // Reduced randomness for better accuracy (±5%)
        const randomFactor = 0.95 + (Math.random() * 0.1);

        return Math.round(baseDamage * randomFactor);
    },

    // Initiative calculation (determines turn order)
    initiative: (qiLevel, bodyLevel, realm, stage, modifiers = {}) => {
        const baseInitiative = (qiLevel + bodyLevel) / 2;
        const realmBonus = stage * 2;
        let total = baseInitiative + realmBonus;

        if (modifiers.initiativeBonus) {
            total += modifiers.initiativeBonus;
        }

        // Add randomness
        total += Math.random() * 20;

        return total;
    }
};

// AI opponent definitions grouped by power level
const COMBAT_OPPONENTS = {
    // Weak opponents for new players
    ROGUE_CULTIVATORS: [
        {
            id: 'weak_rogue',
            name: 'Wandering Rogue',
            description: 'A desperate cultivator who has fallen to the demonic path',
            powerLevel: 'weak',
            cultivation: {
                qi: { level: 5 },
                body: { level: 3 },
                realm: 'Body Refinement',
                stage: 2
            },
            ai: {
                aggression: 0.6,
                technique_usage: 0.2,
                retreat_threshold: 0.2
            },
            loot: {
                jade: { min: 10, max: 25 },
                spiritCrystals: { min: 1, max: 3 },
                items: ['spirit_stone', 'healing_pill'],
                chance: 0.3
            },
            abilities: ['basic_attack', 'desperate_strike']
        },
        {
            id: 'failed_disciple',
            name: 'Failed Sect Disciple',
            description: 'A former sect disciple cast out for poor talent',
            powerLevel: 'weak',
            cultivation: {
                qi: { level: 8 },
                body: { level: 5 },
                realm: 'Body Refinement',
                stage: 4
            },
            ai: {
                aggression: 0.4,
                technique_usage: 0.4,
                retreat_threshold: 0.3
            },
            loot: {
                jade: { min: 15, max: 35 },
                spiritCrystals: { min: 2, max: 5 },
                items: ['sect_manual', 'cultivation_pill'],
                chance: 0.4
            },
            abilities: ['basic_attack', 'sect_technique', 'defend']
        }
    ],

    // Medium strength opponents
    SECT_DISCIPLES: [
        {
            id: 'outer_disciple',
            name: 'Outer Sect Disciple',
            description: 'A promising young cultivator from a minor sect',
            powerLevel: 'medium',
            cultivation: {
                qi: { level: 25 },
                body: { level: 20 },
                realm: 'Qi Gathering',
                stage: 3
            },
            ai: {
                aggression: 0.5,
                technique_usage: 0.6,
                retreat_threshold: 0.25
            },
            loot: {
                jade: { min: 50, max: 100 },
                spiritCrystals: { min: 5, max: 12 },
                items: ['technique_scroll', 'spirit_wine'],
                chance: 0.5
            },
            abilities: ['basic_attack', 'qi_blast', 'spiritual_shield', 'retreat']
        },
        {
            id: 'inner_disciple',
            name: 'Inner Sect Disciple',
            description: 'An elite disciple with access to advanced techniques',
            powerLevel: 'medium',
            cultivation: {
                qi: { level: 45 },
                body: { level: 35 },
                realm: 'Foundation Building',
                stage: 2
            },
            ai: {
                aggression: 0.7,
                technique_usage: 0.8,
                retreat_threshold: 0.15
            },
            loot: {
                jade: { min: 100, max: 200 },
                spiritCrystals: { min: 10, max: 25 },
                items: ['rare_technique', 'foundation_pill'],
                chance: 0.6
            },
            abilities: ['basic_attack', 'foundation_strike', 'qi_barrier', 'flying_sword']
        }
    ],

    // Strong opponents for advanced players
    ELITE_CULTIVATORS: [
        {
            id: 'core_elder',
            name: 'Core Formation Elder',
            description: 'A powerful elder with a golden core',
            powerLevel: 'strong',
            cultivation: {
                qi: { level: 120 },
                body: { level: 90 },
                realm: 'Core Formation',
                stage: 5
            },
            ai: {
                aggression: 0.8,
                technique_usage: 0.9,
                retreat_threshold: 0.1
            },
            loot: {
                jade: { min: 300, max: 600 },
                spiritCrystals: { min: 25, max: 50 },
                items: ['golden_core_technique', 'immortal_pill'],
                chance: 0.7
            },
            abilities: ['basic_attack', 'golden_core_blast', 'divine_barrier', 'sword_rain', 'core_explosion']
        },
        {
            id: 'nascent_master',
            name: 'Nascent Soul Master',
            description: 'A transcendent being with nascent soul power',
            powerLevel: 'strong',
            cultivation: {
                qi: { level: 250 },
                body: { level: 180 },
                realm: 'Nascent Soul',
                stage: 3
            },
            ai: {
                aggression: 0.9,
                technique_usage: 0.95,
                retreat_threshold: 0.05
            },
            loot: {
                jade: { min: 500, max: 1000 },
                spiritCrystals: { min: 50, max: 100 },
                items: ['nascent_technique', 'soul_pill', 'immortal_artifact'],
                chance: 0.8
            },
            abilities: ['basic_attack', 'soul_strike', 'reality_bend', 'teleport_attack', 'soul_scream']
        }
    ],

    // Boss-level opponents
    LEGENDARY_BEINGS: [
        {
            id: 'ancient_demon',
            name: 'Ancient Demon Lord',
            description: 'A primordial demon from the ancient era',
            powerLevel: 'legendary',
            cultivation: {
                qi: { level: 500 },
                body: { level: 400 },
                realm: 'Soul Transformation',
                stage: 8
            },
            ai: {
                aggression: 1.0,
                technique_usage: 1.0,
                retreat_threshold: 0.0
            },
            loot: {
                jade: { min: 1000, max: 2500 },
                spiritCrystals: { min: 100, max: 250 },
                items: ['demon_core', 'ancient_technique', 'legendary_artifact'],
                chance: 0.9
            },
            abilities: ['basic_attack', 'demon_claw', 'hell_fire', 'soul_devour', 'dimension_rend', 'apocalypse']
        },
        {
            id: 'immortal_emperor',
            name: 'Immortal Emperor',
            description: 'A true immortal who has transcended mortal limits',
            powerLevel: 'legendary',
            cultivation: {
                qi: { level: 1000 },
                body: { level: 800 },
                realm: 'True Immortal',
                stage: 15
            },
            ai: {
                aggression: 0.95,
                technique_usage: 1.0,
                retreat_threshold: 0.0
            },
            loot: {
                jade: { min: 2000, max: 5000 },
                spiritCrystals: { min: 250, max: 500 },
                items: ['immortal_core', 'supreme_technique', 'emperor_artifact'],
                chance: 1.0
            },
            abilities: ['basic_attack', 'immortal_strike', 'time_stop', 'reality_rewrite', 'creation', 'annihilation']
        }
    ]
};

// Tournament configurations
const TOURNAMENT_CONFIG = {
    TYPES: {
        DAILY: {
            id: 'daily',
            name: 'Daily Tournament',
            description: 'Daily competition with modest rewards',
            duration: 24 * 60 * 60 * 1000, // 24 hours
            maxParticipants: 64,
            entryRequirement: {
                minPower: 100,
                entryCost: { jade: 50 }
            },
            rewards: {
                first: { jade: 1000, spiritCrystals: 50, title: 'Daily Champion' },
                second: { jade: 500, spiritCrystals: 25 },
                third: { jade: 250, spiritCrystals: 15 },
                participation: { jade: 25, spiritCrystals: 5 }
            }
        },
        WEEKLY: {
            id: 'weekly',
            name: 'Weekly Grand Tournament',
            description: 'Weekly tournament with significant rewards',
            duration: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxParticipants: 256,
            entryRequirement: {
                minPower: 500,
                entryCost: { jade: 200, spiritCrystals: 10 }
            },
            rewards: {
                first: { jade: 5000, spiritCrystals: 250, title: 'Grand Champion', technique: 'tournament_exclusive' },
                second: { jade: 2500, spiritCrystals: 125 },
                third: { jade: 1000, spiritCrystals: 75 },
                top8: { jade: 500, spiritCrystals: 25 },
                participation: { jade: 100, spiritCrystals: 10 }
            }
        },
        SPECIAL: {
            id: 'special',
            name: 'Special Event Tournament',
            description: 'Rare tournament with unique rules and rewards',
            duration: 3 * 24 * 60 * 60 * 1000, // 3 days
            maxParticipants: 128,
            entryRequirement: {
                minPower: 1000,
                entryCost: { jade: 500, spiritCrystals: 25 }
            },
            rewards: {
                first: { jade: 10000, spiritCrystals: 500, title: 'Legendary Champion', artifact: 'legendary' },
                second: { jade: 5000, spiritCrystals: 250 },
                third: { jade: 2000, spiritCrystals: 125 },
                top8: { jade: 1000, spiritCrystals: 50 },
                participation: { jade: 250, spiritCrystals: 25 }
            }
        }
    },

    BRACKETS: {
        SINGLE_ELIMINATION: {
            id: 'single_elimination',
            name: 'Single Elimination',
            description: 'One loss eliminates the participant',
            allowedParticipants: [8, 16, 32, 64, 128, 256]
        },
        DOUBLE_ELIMINATION: {
            id: 'double_elimination',
            name: 'Double Elimination',
            description: 'Participants must lose twice to be eliminated',
            allowedParticipants: [8, 16, 32, 64]
        },
        ROUND_ROBIN: {
            id: 'round_robin',
            name: 'Round Robin',
            description: 'Everyone fights everyone else',
            allowedParticipants: [4, 6, 8, 12, 16]
        }
    }
};

// Ranking system configuration
const RANKING_CONFIG = {
    STARTING_RATING: 1000,
    K_FACTOR: 32, // ELO rating change sensitivity

    TIERS: {
        BRONZE: { min: 0, max: 1199, name: 'Bronze', color: '#CD7F32' },
        SILVER: { min: 1200, max: 1399, name: 'Silver', color: '#C0C0C0' },
        GOLD: { min: 1400, max: 1599, name: 'Gold', color: '#FFD700' },
        PLATINUM: { min: 1600, max: 1799, name: 'Platinum', color: '#E5E4E2' },
        DIAMOND: { min: 1800, max: 1999, name: 'Diamond', color: '#B9F2FF' },
        MASTER: { min: 2000, max: 2199, name: 'Master', color: '#800080' },
        GRANDMASTER: { min: 2200, max: 2399, name: 'Grandmaster', color: '#DC143C' },
        LEGEND: { min: 2400, max: 9999, name: 'Legend', color: '#FFD700' }
    },

    SEASON_LENGTH: 30 * 24 * 60 * 60 * 1000, // 30 days

    REWARDS: {
        BRONZE: { jade: 100, spiritCrystals: 5 },
        SILVER: { jade: 250, spiritCrystals: 15 },
        GOLD: { jade: 500, spiritCrystals: 25 },
        PLATINUM: { jade: 1000, spiritCrystals: 50 },
        DIAMOND: { jade: 2000, spiritCrystals: 100 },
        MASTER: { jade: 4000, spiritCrystals: 200, title: 'Combat Master' },
        GRANDMASTER: { jade: 8000, spiritCrystals: 400, title: 'Combat Grandmaster' },
        LEGEND: { jade: 15000, spiritCrystals: 750, title: 'Legendary Fighter', technique: 'legend_exclusive' }
    }
};

// Export all data structures
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COMBAT_ACTIONS,
        COMBAT_STATUS_EFFECTS,
        COMBAT_FORMULAS,
        COMBAT_OPPONENTS,
        TOURNAMENT_CONFIG,
        RANKING_CONFIG
    };
} else if (typeof window !== 'undefined') {
    window.COMBAT_ACTIONS = COMBAT_ACTIONS;
    window.COMBAT_STATUS_EFFECTS = COMBAT_STATUS_EFFECTS;
    window.COMBAT_FORMULAS = COMBAT_FORMULAS;
    window.COMBAT_OPPONENTS = COMBAT_OPPONENTS;
    window.TOURNAMENT_CONFIG = TOURNAMENT_CONFIG;
    window.RANKING_CONFIG = RANKING_CONFIG;
}