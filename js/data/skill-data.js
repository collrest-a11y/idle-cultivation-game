/**
 * Skill Data Definitions - Balanced progression curves and effects
 * Contains all skill definitions, categories, synergies, and evolution paths
 */

// Skill Categories with progression gates
const SKILL_CATEGORIES = {
    cultivation: {
        id: 'cultivation',
        name: 'Cultivation Arts',
        icon: '⚡',
        description: 'Skills that enhance cultivation speed and efficiency',
        unlockRealm: 'body_refinement'
    },
    combat: {
        id: 'combat',
        name: 'Combat Techniques',
        icon: '⚔️',
        description: 'Skills that improve combat power and abilities',
        unlockRealm: 'body_refinement'
    },
    progression: {
        id: 'progression',
        name: 'Progression Arts',
        icon: '📈',
        description: 'Skills that boost resource generation and progression',
        unlockRealm: 'foundation'
    },
    utility: {
        id: 'utility',
        name: 'Utility Arts',
        icon: '🔧',
        description: 'General utility and support skills',
        unlockRealm: 'body_refinement'
    },
    mastery: {
        id: 'mastery',
        name: 'Mastery Arts',
        icon: '🏆',
        description: 'Advanced skills that enhance other skills',
        unlockRealm: 'core_formation'
    },
    transcendent: {
        id: 'transcendent',
        name: 'Transcendent Arts',
        icon: '✨',
        description: 'Legendary skills with unique effects',
        unlockRealm: 'nascent_soul'
    }
};

// Skill Rarities with balanced acquisition rates
const SKILL_RARITIES = {
    common: {
        id: 'common',
        name: 'Common',
        color: '#8e8e93',
        fragmentCost: { base: 10, increment: 2 },
        dropRate: 0.70,
        maxLevel: 5
    },
    uncommon: {
        id: 'uncommon',
        name: 'Uncommon',
        color: '#34c759',
        fragmentCost: { base: 25, increment: 5 },
        dropRate: 0.20,
        maxLevel: 8
    },
    rare: {
        id: 'rare',
        name: 'Rare',
        color: '#007aff',
        fragmentCost: { base: 50, increment: 8 },
        dropRate: 0.08,
        maxLevel: 10
    },
    epic: {
        id: 'epic',
        name: 'Epic',
        color: '#af52de',
        fragmentCost: { base: 100, increment: 12 },
        dropRate: 0.015,
        maxLevel: 12
    },
    legendary: {
        id: 'legendary',
        name: 'Legendary',
        color: '#ff9500',
        fragmentCost: { base: 200, increment: 20 },
        dropRate: 0.004,
        maxLevel: 15
    },
    transcendent: {
        id: 'transcendent',
        name: 'Transcendent',
        color: '#ff3b30',
        fragmentCost: { base: 500, increment: 50 },
        dropRate: 0.001,
        maxLevel: 20
    }
};

// Core Skill Definitions with balanced progression
const SKILL_DEFINITIONS = {
    // === CULTIVATION CATEGORY ===

    // Common Cultivation Skills
    qi_flow_enhancement: {
        id: 'qi_flow_enhancement',
        name: 'Qi Flow Enhancement',
        category: 'cultivation',
        rarity: 'common',
        description: 'Improves the natural flow of qi through your meridians',
        maxLevel: 5,
        unlockRequirements: {
            realm: 'body_refinement',
            level: 1
        },
        effects: {
            cultivation: {
                qiSpeedMultiplier: { base: 0.08, perLevel: 0.04 }
            }
        },
        costs: {
            fragments: { base: 10, perLevel: 2 },
            skillPoints: { base: 1, perLevel: 1 }
        },
        icon: '💨',
        tags: ['passive', 'qi', 'speed']
    },

    body_tempering_focus: {
        id: 'body_tempering_focus',
        name: 'Body Tempering Focus',
        category: 'cultivation',
        rarity: 'common',
        description: 'Enhances physical cultivation through concentrated effort',
        maxLevel: 5,
        unlockRequirements: {
            realm: 'body_refinement',
            level: 1
        },
        effects: {
            cultivation: {
                bodySpeedMultiplier: { base: 0.08, perLevel: 0.04 }
            }
        },
        costs: {
            fragments: { base: 10, perLevel: 2 },
            skillPoints: { base: 1, perLevel: 1 }
        },
        icon: '💪',
        tags: ['passive', 'body', 'speed']
    },

    // Uncommon Cultivation Skills
    dual_circulation: {
        id: 'dual_circulation',
        name: 'Dual Circulation',
        category: 'cultivation',
        rarity: 'uncommon',
        description: 'Simultaneously cultivates both qi and body paths',
        maxLevel: 8,
        unlockRequirements: {
            realm: 'foundation',
            skills: ['qi_flow_enhancement', 'body_tempering_focus']
        },
        effects: {
            cultivation: {
                qiSpeedMultiplier: { base: 0.06, perLevel: 0.03 },
                bodySpeedMultiplier: { base: 0.06, perLevel: 0.03 },
                dualSynergy: { base: 0.10, perLevel: 0.05 }
            }
        },
        costs: {
            fragments: { base: 25, perLevel: 5 },
            skillPoints: { base: 2, perLevel: 2 }
        },
        icon: '🔄',
        tags: ['passive', 'dual', 'synergy']
    },

    meditation_mastery: {
        id: 'meditation_mastery',
        name: 'Meditation Mastery',
        category: 'cultivation',
        rarity: 'uncommon',
        description: 'Extends and enhances meditation effects',
        maxLevel: 8,
        unlockRequirements: {
            realm: 'foundation',
            level: 5
        },
        effects: {
            cultivation: {
                meditationDuration: { base: 1.2, perLevel: 0.1 },
                meditationPower: { base: 1.15, perLevel: 0.05 }
            }
        },
        costs: {
            fragments: { base: 25, perLevel: 5 },
            skillPoints: { base: 2, perLevel: 2 }
        },
        icon: '🧘',
        tags: ['active', 'meditation', 'enhancement']
    },

    // === COMBAT CATEGORY ===

    // Common Combat Skills
    basic_strike: {
        id: 'basic_strike',
        name: 'Basic Strike',
        category: 'combat',
        rarity: 'common',
        description: 'Fundamental combat technique that improves attack power',
        maxLevel: 5,
        unlockRequirements: {
            realm: 'body_refinement',
            level: 3
        },
        effects: {
            combat: {
                flatDamage: { base: 5, perLevel: 3 },
                attackSpeed: { base: 0.02, perLevel: 0.01 }
            }
        },
        costs: {
            fragments: { base: 10, perLevel: 2 },
            skillPoints: { base: 1, perLevel: 1 }
        },
        icon: '👊',
        tags: ['active', 'damage', 'basic']
    },

    defensive_stance: {
        id: 'defensive_stance',
        name: 'Defensive Stance',
        category: 'combat',
        rarity: 'common',
        description: 'Improves defensive capabilities and damage reduction',
        maxLevel: 5,
        unlockRequirements: {
            realm: 'body_refinement',
            level: 3
        },
        effects: {
            combat: {
                damageReduction: { base: 0.05, perLevel: 0.02 },
                healthBonus: { base: 0.08, perLevel: 0.04 }
            }
        },
        costs: {
            fragments: { base: 10, perLevel: 2 },
            skillPoints: { base: 1, perLevel: 1 }
        },
        icon: '🛡️',
        tags: ['passive', 'defense', 'survival']
    },

    // Rare Combat Skills
    lightning_palm: {
        id: 'lightning_palm',
        name: 'Lightning Palm',
        category: 'combat',
        rarity: 'rare',
        description: 'Lightning-infused attack with chance to stun enemies',
        maxLevel: 10,
        unlockRequirements: {
            realm: 'core_formation',
            skills: ['basic_strike'],
            attributes: { qi: 50 }
        },
        effects: {
            combat: {
                flatDamage: { base: 15, perLevel: 8 },
                criticalChance: { base: 0.05, perLevel: 0.02 },
                stunChance: { base: 0.08, perLevel: 0.02 }
            }
        },
        costs: {
            fragments: { base: 50, perLevel: 8 },
            skillPoints: { base: 3, perLevel: 3 }
        },
        icon: '⚡',
        tags: ['active', 'elemental', 'stun']
    },

    // === PROGRESSION CATEGORY ===

    // Uncommon Progression Skills
    resource_gathering: {
        id: 'resource_gathering',
        name: 'Resource Gathering',
        category: 'progression',
        rarity: 'uncommon',
        description: 'Increases efficiency of resource acquisition',
        maxLevel: 8,
        unlockRequirements: {
            realm: 'foundation',
            level: 10
        },
        effects: {
            progression: {
                jadeMultiplier: { base: 0.10, perLevel: 0.05 },
                crystalMultiplier: { base: 0.08, perLevel: 0.04 },
                fragmentDropRate: { base: 0.02, perLevel: 0.01 }
            }
        },
        costs: {
            fragments: { base: 25, perLevel: 5 },
            skillPoints: { base: 2, perLevel: 2 }
        },
        icon: '💎',
        tags: ['passive', 'resource', 'efficiency']
    },

    breakthrough_insight: {
        id: 'breakthrough_insight',
        name: 'Breakthrough Insight',
        category: 'progression',
        rarity: 'rare',
        description: 'Reduces breakthrough requirements and improves success rates',
        maxLevel: 10,
        unlockRequirements: {
            realm: 'foundation',
            level: 15,
            breakthroughs: 3
        },
        effects: {
            progression: {
                breakthroughCostReduction: { base: 0.05, perLevel: 0.02 },
                breakthroughSuccessRate: { base: 0.03, perLevel: 0.02 }
            }
        },
        costs: {
            fragments: { base: 50, perLevel: 8 },
            skillPoints: { base: 3, perLevel: 3 }
        },
        icon: '🔥',
        tags: ['passive', 'breakthrough', 'efficiency']
    },

    // === UTILITY CATEGORY ===

    auto_cultivation: {
        id: 'auto_cultivation',
        name: 'Auto Cultivation',
        category: 'utility',
        rarity: 'rare',
        description: 'Automatically switches between optimal cultivation paths',
        maxLevel: 10,
        unlockRequirements: {
            realm: 'core_formation',
            skills: ['dual_circulation']
        },
        effects: {
            utility: {
                autoOptimization: { base: 0.85, perLevel: 0.02 },
                efficiencyBonus: { base: 0.05, perLevel: 0.02 }
            }
        },
        costs: {
            fragments: { base: 50, perLevel: 8 },
            skillPoints: { base: 3, perLevel: 3 }
        },
        icon: '🤖',
        tags: ['passive', 'automation', 'optimization']
    },

    // === MASTERY CATEGORY ===

    skill_amplification: {
        id: 'skill_amplification',
        name: 'Skill Amplification',
        category: 'mastery',
        rarity: 'epic',
        description: 'Amplifies the effects of other skills in your loadout',
        maxLevel: 12,
        unlockRequirements: {
            realm: 'nascent_soul',
            skills: ['meditation_mastery', 'resource_gathering'],
            totalSkillLevels: 50
        },
        effects: {
            mastery: {
                skillEffectMultiplier: { base: 0.08, perLevel: 0.03 },
                synergyBonus: { base: 0.05, perLevel: 0.02 }
            }
        },
        costs: {
            fragments: { base: 100, perLevel: 12 },
            skillPoints: { base: 5, perLevel: 4 }
        },
        icon: '📡',
        tags: ['passive', 'amplification', 'synergy']
    },

    // === TRANSCENDENT CATEGORY ===

    dao_comprehension: {
        id: 'dao_comprehension',
        name: 'Dao Comprehension',
        category: 'transcendent',
        rarity: 'transcendent',
        description: 'Fundamental understanding that enhances all aspects of cultivation',
        maxLevel: 20,
        unlockRequirements: {
            realm: 'soul_transformation',
            skills: ['skill_amplification', 'breakthrough_insight'],
            totalSkillLevels: 100
        },
        effects: {
            transcendent: {
                universalMultiplier: { base: 0.10, perLevel: 0.05 },
                daoInsight: { base: 0.02, perLevel: 0.01 },
                transcendenceBonus: { base: 0.01, perLevel: 0.005 }
            }
        },
        costs: {
            fragments: { base: 500, perLevel: 50 },
            skillPoints: { base: 10, perLevel: 8 }
        },
        icon: '☯️',
        tags: ['passive', 'universal', 'transcendent']
    }
};

// Skill Synergies - combinations that provide bonus effects
const SKILL_SYNERGIES = {
    basic_warrior: {
        id: 'basic_warrior',
        name: 'Basic Warrior',
        description: 'Foundation combat synergy',
        requiredSkills: ['basic_strike', 'defensive_stance'],
        minLevels: { 'basic_strike': 3, 'defensive_stance': 3 },
        effects: {
            combat: {
                damageBonus: 0.15,
                survivalBonus: 0.10
            }
        },
        icon: '⚔️🛡️'
    },

    cultivation_master: {
        id: 'cultivation_master',
        name: 'Cultivation Master',
        description: 'Enhanced cultivation through focus and technique',
        requiredSkills: ['qi_flow_enhancement', 'body_tempering_focus', 'meditation_mastery'],
        minLevels: { 'qi_flow_enhancement': 5, 'body_tempering_focus': 5, 'meditation_mastery': 3 },
        effects: {
            cultivation: {
                totalSpeedMultiplier: 0.25,
                breakthroughBonus: 0.10
            }
        },
        icon: '💨💪🧘'
    },

    resource_tycoon: {
        id: 'resource_tycoon',
        name: 'Resource Tycoon',
        description: 'Master of resource acquisition and management',
        requiredSkills: ['resource_gathering', 'breakthrough_insight'],
        minLevels: { 'resource_gathering': 5, 'breakthrough_insight': 5 },
        effects: {
            progression: {
                resourceMultiplier: 0.30,
                efficiencyBonus: 0.15
            }
        },
        icon: '💎🔥'
    },

    lightning_warrior: {
        id: 'lightning_warrior',
        name: 'Lightning Warrior',
        description: 'Swift and deadly combat specialist',
        requiredSkills: ['lightning_palm', 'basic_strike'],
        minLevels: { 'lightning_palm': 5, 'basic_strike': 5 },
        effects: {
            combat: {
                criticalDamage: 0.40,
                attackSpeed: 0.20,
                elementalBonus: 0.15
            }
        },
        icon: '⚡👊'
    },

    transcendent_master: {
        id: 'transcendent_master',
        name: 'Transcendent Master',
        description: 'Ultimate mastery over all aspects of cultivation',
        requiredSkills: ['dao_comprehension', 'skill_amplification', 'dual_circulation'],
        minLevels: { 'dao_comprehension': 10, 'skill_amplification': 8, 'dual_circulation': 8 },
        effects: {
            transcendent: {
                universalMastery: 0.50,
                synergyAmplification: 0.25,
                daoUnderstanding: 0.20
            }
        },
        icon: '☯️📡🔄'
    }
};

// Skill Evolution Paths - how skills can transform and upgrade
const SKILL_EVOLUTIONS = {
    basic_strike: [
        {
            target: 'advanced_strike',
            requirements: {
                level: 5,
                realm: 'foundation',
                conditions: ['win_10_combats']
            }
        },
        {
            target: 'lightning_palm',
            requirements: {
                level: 5,
                realm: 'core_formation',
                skills: ['qi_flow_enhancement'],
                attributes: { qi: 50 }
            }
        }
    ],

    qi_flow_enhancement: [
        {
            target: 'perfect_qi_circulation',
            requirements: {
                level: 5,
                realm: 'core_formation',
                skills: ['meditation_mastery']
            }
        }
    ],

    meditation_mastery: [
        {
            target: 'enlightened_meditation',
            requirements: {
                level: 8,
                realm: 'nascent_soul',
                conditions: ['complete_100_meditations']
            }
        }
    ]
};

// Skill Acquisition Methods and Rates
const SKILL_ACQUISITION = {
    // Fragment drop rates by activity
    dropRates: {
        cultivation: {
            base: 0.02,
            perHour: 0.01,
            bonusPerRealm: 0.005
        },
        combat: {
            base: 0.05,
            perVictory: 0.02,
            streakBonus: 0.001
        },
        gacha: {
            standard: {
                common: 0.70,
                uncommon: 0.20,
                rare: 0.08,
                epic: 0.015,
                legendary: 0.004,
                transcendent: 0.001
            },
            focused: {
                // Higher rates for focused category
                multiplier: 1.5
            }
        }
    },

    // Progression costs balanced for long-term play
    progressionBalance: {
        fragmentsPerHour: {
            early: 5,    // Body Refinement
            mid: 15,     // Foundation/Core Formation
            late: 30,    // Nascent Soul+
            endgame: 50  // Soul Transformation+
        },
        skillPointsPerLevel: {
            base: 1,
            increment: 0.1
        },
        maxLoadoutSlots: {
            body_refinement: 3,
            foundation: 4,
            core_formation: 5,
            nascent_soul: 6,
            soul_transformation: 7,
            void_refinement: 8
        }
    }
};

// Balance Configuration
const BALANCE_CONFIG = {
    // Global multipliers for tuning
    effectMultipliers: {
        cultivation: 1.0,
        combat: 1.0,
        progression: 1.0,
        utility: 1.0,
        mastery: 1.0,
        transcendent: 1.0
    },

    // Acquisition rate multipliers
    acquisitionMultipliers: {
        fragments: 1.0,
        skillPoints: 1.0,
        dropRates: 1.0
    },

    // Performance targets
    performanceTargets: {
        maxCalculationTime: 16, // 16ms for 60fps
        maxUIUpdateTime: 8,     // 8ms for smooth UI
        cacheExpirationTime: 30000 // 30 seconds
    }
};

// Export all data for use by skill system
if (typeof window !== 'undefined') {
    window.SkillData = {
        SKILL_CATEGORIES,
        SKILL_RARITIES,
        SKILL_DEFINITIONS,
        SKILL_SYNERGIES,
        SKILL_EVOLUTIONS,
        SKILL_ACQUISITION,
        BALANCE_CONFIG
    };
}

// Also support module exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SKILL_CATEGORIES,
        SKILL_RARITIES,
        SKILL_DEFINITIONS,
        SKILL_SYNERGIES,
        SKILL_EVOLUTIONS,
        SKILL_ACQUISITION,
        BALANCE_CONFIG
    };
}