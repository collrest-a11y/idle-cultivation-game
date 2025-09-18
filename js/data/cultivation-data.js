/**
 * Cultivation Data - Static configuration for realms, techniques, and formulas
 * Contains all the progression curves, costs, and benefits for the cultivation system
 */

// Cultivation realm definitions with authentic Xianxia terminology
const CULTIVATION_REALMS = {
    // Mortal Realms
    "Body Refinement": {
        id: "body_refinement",
        type: "mortal",
        minorStages: 10,
        description: "Strengthening the mortal flesh and bones",
        breakthroughCost: {
            base: 1000,
            multiplier: 1.5
        },
        requirements: {
            qi: { level: 0 },
            body: { level: 0 }
        },
        benefits: {
            qiCapacityMultiplier: 1.0,
            bodyStrengthMultiplier: 1.0,
            cultivationSpeedBonus: 0.0
        },
        abilities: []
    },
    "Qi Gathering": {
        id: "qi_gathering",
        type: "mortal",
        minorStages: 10,
        description: "Learning to sense and gather spiritual qi",
        breakthroughCost: {
            base: 5000,
            multiplier: 1.6
        },
        requirements: {
            qi: { level: 50 },
            body: { level: 30 }
        },
        benefits: {
            qiCapacityMultiplier: 2.0,
            bodyStrengthMultiplier: 1.5,
            cultivationSpeedBonus: 0.1
        },
        abilities: ["qi_sense", "basic_meditation"]
    },
    "Foundation Building": {
        id: "foundation_building",
        type: "mortal",
        minorStages: 10,
        description: "Building a solid foundation for future cultivation",
        breakthroughCost: {
            base: 25000,
            multiplier: 1.7
        },
        requirements: {
            qi: { level: 150 },
            body: { level: 100 }
        },
        benefits: {
            qiCapacityMultiplier: 5.0,
            bodyStrengthMultiplier: 3.0,
            cultivationSpeedBonus: 0.25
        },
        abilities: ["qi_manipulation", "spiritual_sense"]
    },
    "Core Formation": {
        id: "core_formation",
        type: "cultivator",
        minorStages: 9,
        description: "Forming a golden core within the dantian",
        breakthroughCost: {
            base: 100000,
            multiplier: 1.8
        },
        requirements: {
            qi: { level: 300 },
            body: { level: 200 }
        },
        benefits: {
            qiCapacityMultiplier: 10.0,
            bodyStrengthMultiplier: 6.0,
            cultivationSpeedBonus: 0.5
        },
        abilities: ["golden_core", "flying", "qi_shields"]
    },
    "Nascent Soul": {
        id: "nascent_soul",
        type: "cultivator",
        minorStages: 9,
        description: "Nurturing the nascent soul within the core",
        breakthroughCost: {
            base: 500000,
            multiplier: 2.0
        },
        requirements: {
            qi: { level: 600 },
            body: { level: 400 }
        },
        benefits: {
            qiCapacityMultiplier: 25.0,
            bodyStrengthMultiplier: 15.0,
            cultivationSpeedBonus: 1.0
        },
        abilities: ["nascent_soul", "teleportation", "soul_attacks"]
    },
    "Soul Transformation": {
        id: "soul_transformation",
        type: "cultivator",
        minorStages: 9,
        description: "Transforming the soul to transcend mortality",
        breakthroughCost: {
            base: 2000000,
            multiplier: 2.2
        },
        requirements: {
            qi: { level: 1200 },
            body: { level: 800 }
        },
        benefits: {
            qiCapacityMultiplier: 50.0,
            bodyStrengthMultiplier: 35.0,
            cultivationSpeedBonus: 2.0
        },
        abilities: ["soul_manifestation", "divine_sense", "space_manipulation"]
    },
    "Void Refining": {
        id: "void_refining",
        type: "immortal",
        minorStages: 9,
        description: "Refining the void to comprehend the laws",
        breakthroughCost: {
            base: 10000000,
            multiplier: 2.5
        },
        requirements: {
            qi: { level: 2500 },
            body: { level: 1600 }
        },
        benefits: {
            qiCapacityMultiplier: 100.0,
            bodyStrengthMultiplier: 70.0,
            cultivationSpeedBonus: 4.0
        },
        abilities: ["void_comprehension", "law_manipulation", "pocket_dimensions"]
    },
    "Body Integration": {
        id: "body_integration",
        type: "immortal",
        minorStages: 9,
        description: "Integrating body and soul into one",
        breakthroughCost: {
            base: 50000000,
            multiplier: 3.0
        },
        requirements: {
            qi: { level: 5000 },
            body: { level: 3200 }
        },
        benefits: {
            qiCapacityMultiplier: 200.0,
            bodyStrengthMultiplier: 150.0,
            cultivationSpeedBonus: 8.0
        },
        abilities: ["perfect_body", "immortal_regeneration", "reality_alteration"]
    },
    "Mahayana": {
        id: "mahayana",
        type: "immortal",
        minorStages: 9,
        description: "The great vehicle to transcend all realms",
        breakthroughCost: {
            base: 250000000,
            multiplier: 4.0
        },
        requirements: {
            qi: { level: 10000 },
            body: { level: 6400 }
        },
        benefits: {
            qiCapacityMultiplier: 500.0,
            bodyStrengthMultiplier: 350.0,
            cultivationSpeedBonus: 15.0
        },
        abilities: ["universal_comprehension", "creation", "true_immortality"]
    },
    "True Immortal": {
        id: "true_immortal",
        type: "immortal",
        minorStages: 99,
        description: "Beyond mortal comprehension",
        breakthroughCost: {
            base: 1000000000,
            multiplier: 5.0
        },
        requirements: {
            qi: { level: 20000 },
            body: { level: 12800 }
        },
        benefits: {
            qiCapacityMultiplier: 1000.0,
            bodyStrengthMultiplier: 750.0,
            cultivationSpeedBonus: 30.0
        },
        abilities: ["omniscience", "omnipotence", "eternal_existence"]
    }
};

// Cultivation techniques with different focuses and effects
const CULTIVATION_TECHNIQUES = {
    // Basic techniques available from start
    "Heaven and Earth Mantra": {
        id: "heaven_earth_mantra",
        rarity: "common",
        type: "dual",
        description: "A basic technique that cultivates both qi and body in harmony",
        unlockRequirements: {},
        effects: {
            qiMultiplier: 1.1,
            bodyMultiplier: 1.1,
            dualCultivationBonus: 0.05
        },
        resourceCost: {
            qi: 1.0,
            spiritStones: 0
        }
    },
    "Iron Body Manual": {
        id: "iron_body_manual",
        rarity: "common",
        type: "body",
        description: "Focuses on strengthening the physical body",
        unlockRequirements: {
            realm: "Body Refinement"
        },
        effects: {
            qiMultiplier: 0.8,
            bodyMultiplier: 1.5,
            physicalDefenseBonus: 0.1
        },
        resourceCost: {
            qi: 0.8,
            spiritStones: 0
        }
    },
    "Spiritual Qi Absorption": {
        id: "spiritual_qi_absorption",
        rarity: "common",
        type: "qi",
        description: "Enhances spiritual qi gathering and refinement",
        unlockRequirements: {
            realm: "Qi Gathering"
        },
        effects: {
            qiMultiplier: 1.5,
            bodyMultiplier: 0.8,
            qiCapacityBonus: 0.1
        },
        resourceCost: {
            qi: 1.2,
            spiritStones: 0
        }
    },
    // Rare techniques
    "Azure Dragon Body Technique": {
        id: "azure_dragon_body",
        rarity: "rare",
        type: "body",
        description: "Channel the power of the Azure Dragon",
        unlockRequirements: {
            realm: "Foundation Building",
            body: { level: 120 }
        },
        effects: {
            qiMultiplier: 1.0,
            bodyMultiplier: 2.0,
            elementalAffinityBonus: 0.15,
            physicalDefenseBonus: 0.2
        },
        resourceCost: {
            qi: 1.5,
            spiritStones: 1
        }
    },
    "Golden Core Meditation": {
        id: "golden_core_meditation",
        rarity: "rare",
        type: "qi",
        description: "Advanced meditation technique for core formation",
        unlockRequirements: {
            realm: "Core Formation",
            qi: { level: 350 }
        },
        effects: {
            qiMultiplier: 2.2,
            bodyMultiplier: 1.0,
            breakthroughChanceBonus: 0.1,
            qiCapacityBonus: 0.25
        },
        resourceCost: {
            qi: 2.0,
            spiritStones: 2
        }
    },
    // Epic techniques
    "Nine Heavens Thunder Technique": {
        id: "nine_heavens_thunder",
        rarity: "epic",
        type: "qi",
        description: "Harness the power of heavenly thunder",
        unlockRequirements: {
            realm: "Nascent Soul",
            qi: { level: 700 }
        },
        effects: {
            qiMultiplier: 3.0,
            bodyMultiplier: 1.2,
            lightningAffinityBonus: 0.3,
            combatPowerBonus: 0.5
        },
        resourceCost: {
            qi: 3.0,
            spiritStones: 5
        }
    },
    "Primordial Chaos Body": {
        id: "primordial_chaos_body",
        rarity: "epic",
        type: "body",
        description: "Return to the primordial state of chaos",
        unlockRequirements: {
            realm: "Soul Transformation",
            body: { level: 900 }
        },
        effects: {
            qiMultiplier: 1.5,
            bodyMultiplier: 3.5,
            chaosAffinityBonus: 0.3,
            adaptabilityBonus: 0.4
        },
        resourceCost: {
            qi: 2.5,
            spiritStones: 5
        }
    },
    // Legendary techniques
    "Eternal Dao Heart Sutra": {
        id: "eternal_dao_heart",
        rarity: "legendary",
        type: "dual",
        description: "The supreme technique of the eternal dao",
        unlockRequirements: {
            realm: "Void Refining",
            qi: { level: 3000 },
            body: { level: 2000 }
        },
        effects: {
            qiMultiplier: 4.0,
            bodyMultiplier: 4.0,
            dualCultivationBonus: 0.5,
            daoComprehensionBonus: 0.3,
            breakthroughChanceBonus: 0.25
        },
        resourceCost: {
            qi: 4.0,
            spiritStones: 10
        }
    }
};

// Resource definitions and costs
const CULTIVATION_RESOURCES = {
    "Qi": {
        id: "qi",
        description: "Spiritual energy used for cultivation",
        naturalRegenRate: 1.0, // per second
        maxCapacityFormula: (realm, stage) => {
            const baseCapacity = 100;
            const realmMultiplier = CULTIVATION_REALMS[realm]?.benefits?.qiCapacityMultiplier || 1.0;
            const stageMultiplier = 1 + (stage * 0.1);
            return Math.floor(baseCapacity * realmMultiplier * stageMultiplier);
        }
    },
    "Spirit Stones": {
        id: "spirit_stones",
        description: "Crystallized spiritual energy for enhanced cultivation",
        sources: ["combat", "missions", "trading", "mining"],
        uses: ["technique_enhancement", "breakthrough_assistance", "pill_creation"]
    },
    "Cultivation Pills": {
        id: "pills",
        description: "Alchemical aids for cultivation",
        types: {
            "Qi Gathering Pill": {
                effect: { qiMultiplier: 1.5, duration: 3600 },
                cost: { spiritStones: 10 }
            },
            "Body Strengthening Pill": {
                effect: { bodyMultiplier: 1.5, duration: 3600 },
                cost: { spiritStones: 10 }
            },
            "Breakthrough Pill": {
                effect: { breakthroughChanceBonus: 0.2 },
                cost: { spiritStones: 50 }
            }
        }
    }
};

// Cultivation formulas for progression calculations
const CULTIVATION_FORMULAS = {
    // Experience required for next level
    experienceRequired: (currentLevel) => {
        const baseExp = 100;
        const growthRate = 1.15;
        const exponentialFactor = Math.pow(currentLevel, 1.2);
        return Math.floor(baseExp * Math.pow(growthRate, currentLevel) * exponentialFactor);
    },

    // Cultivation speed calculation
    cultivationSpeed: (baseRate, technique, realm, stage, resources) => {
        let speed = baseRate;

        // Technique multiplier
        if (technique) {
            const techniqueData = CULTIVATION_TECHNIQUES[technique];
            if (techniqueData) {
                speed *= (techniqueData.effects.qiMultiplier + techniqueData.effects.bodyMultiplier) / 2;
            }
        }

        // Realm bonus
        const realmData = CULTIVATION_REALMS[realm];
        if (realmData) {
            speed *= (1 + realmData.benefits.cultivationSpeedBonus);
        }

        // Stage bonus (diminishing returns)
        speed *= (1 + (stage * 0.02));

        // Resource efficiency
        if (resources.spiritStones > 0) {
            speed *= (1 + Math.min(resources.spiritStones * 0.01, 2.0)); // Cap at 3x speed
        }

        return speed;
    },

    // Breakthrough success chance
    breakthroughChance: (qi, body, realm, stage, technique, resources) => {
        const realmData = CULTIVATION_REALMS[realm];
        if (!realmData) return 0;

        // Base chance (50% for meeting requirements exactly)
        let chance = 0.5;

        // Stat bonus (higher stats = better chance)
        const qiRequirement = realmData.requirements.qi?.level || 0;
        const bodyRequirement = realmData.requirements.body?.level || 0;

        if (qi >= qiRequirement && body >= bodyRequirement) {
            const qiBonus = Math.min((qi - qiRequirement) / qiRequirement, 1.0) * 0.2;
            const bodyBonus = Math.min((body - bodyRequirement) / bodyRequirement, 1.0) * 0.2;
            chance += qiBonus + bodyBonus;
        } else {
            return 0; // Can't breakthrough without meeting requirements
        }

        // Technique bonus
        const techniqueData = CULTIVATION_TECHNIQUES[technique];
        if (techniqueData?.effects?.breakthroughChanceBonus) {
            chance += techniqueData.effects.breakthroughChanceBonus;
        }

        // Resource assistance
        if (resources.breakthroughPills > 0) {
            chance += Math.min(resources.breakthroughPills * 0.1, 0.3); // Cap at 30% bonus
        }

        // Stage penalty (harder to breakthrough at higher stages)
        chance -= (stage - 1) * 0.05;

        return Math.max(0.05, Math.min(0.95, chance)); // Clamp between 5% and 95%
    },

    // Offline progression calculation
    offlineProgression: (timeOffline, cultivationSpeed, qi, body, technique) => {
        const maxOfflineHours = 24; // Cap offline progression
        const effectiveHours = Math.min(timeOffline / 3600, maxOfflineHours);

        // Efficiency decreases over time offline
        const efficiencyFactor = Math.max(0.3, 1 - (effectiveHours / maxOfflineHours) * 0.7);

        // Calculate progression
        const baseProgression = cultivationSpeed * effectiveHours * 3600; // Convert back to seconds
        const finalProgression = baseProgression * efficiencyFactor;

        return {
            qiGain: finalProgression * 0.6, // 60% to qi
            bodyGain: finalProgression * 0.4, // 40% to body
            efficiencyUsed: efficiencyFactor
        };
    },

    // Dual cultivation synergy
    dualCultivationSynergy: (qiLevel, bodyLevel) => {
        const levelDifference = Math.abs(qiLevel - bodyLevel);
        const averageLevel = (qiLevel + bodyLevel) / 2;

        // Better synergy when levels are close
        const balanceBonus = Math.max(0, 1 - (levelDifference / averageLevel));

        // Synergy increases with overall level
        const levelBonus = Math.log(averageLevel + 1) / 10;

        return balanceBonus * levelBonus;
    }
};

// Bottleneck and plateau mechanics
const CULTIVATION_BOTTLENECKS = {
    // Level-based bottlenecks (harder to progress at certain levels)
    levelBottlenecks: [50, 100, 200, 500, 1000, 2000, 5000, 10000],

    // Bottleneck effects
    getBottleneckMultiplier: (level) => {
        for (const bottleneck of CULTIVATION_BOTTLENECKS.levelBottlenecks) {
            if (level >= bottleneck && level < bottleneck + 10) {
                // 50% slower progression during bottleneck
                return 0.5;
            }
        }
        return 1.0;
    },

    // Plateau detection (when progress becomes very slow)
    isInPlateau: (recentProgress, expectedProgress) => {
        return recentProgress < expectedProgress * 0.1; // Less than 10% of expected
    }
};

// Achievement and milestone definitions
const CULTIVATION_ACHIEVEMENTS = {
    "First Steps": {
        id: "first_steps",
        description: "Reach Qi Gathering realm",
        requirement: { realm: "Qi Gathering" },
        reward: { spiritStones: 100 }
    },
    "Solid Foundation": {
        id: "solid_foundation",
        description: "Reach Foundation Building realm",
        requirement: { realm: "Foundation Building" },
        reward: { spiritStones: 500, technique: "Azure Dragon Body Technique" }
    },
    "Golden Core": {
        id: "golden_core",
        description: "Form your golden core",
        requirement: { realm: "Core Formation" },
        reward: { spiritStones: 2000, technique: "Golden Core Meditation" }
    },
    "Balanced Cultivator": {
        id: "balanced_cultivator",
        description: "Reach level 100 in both qi and body cultivation",
        requirement: { qi: { level: 100 }, body: { level: 100 } },
        reward: { spiritStones: 1000, technique: "Heaven and Earth Mantra" }
    },
    "Lightning Speed": {
        id: "lightning_speed",
        description: "Breakthrough 3 stages in one day",
        requirement: { breakthroughsInDay: 3 },
        reward: { spiritStones: 1500 }
    }
};

// Export all data structures
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CULTIVATION_REALMS,
        CULTIVATION_TECHNIQUES,
        CULTIVATION_RESOURCES,
        CULTIVATION_FORMULAS,
        CULTIVATION_BOTTLENECKS,
        CULTIVATION_ACHIEVEMENTS
    };
} else if (typeof window !== 'undefined') {
    window.CULTIVATION_REALMS = CULTIVATION_REALMS;
    window.CULTIVATION_TECHNIQUES = CULTIVATION_TECHNIQUES;
    window.CULTIVATION_RESOURCES = CULTIVATION_RESOURCES;
    window.CULTIVATION_FORMULAS = CULTIVATION_FORMULAS;
    window.CULTIVATION_BOTTLENECKS = CULTIVATION_BOTTLENECKS;
    window.CULTIVATION_ACHIEVEMENTS = CULTIVATION_ACHIEVEMENTS;
}