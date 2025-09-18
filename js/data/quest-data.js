/**
 * Quest Data - Comprehensive quest and achievement definitions
 * Includes quest templates, rewards, achievements, and progression data
 */

// Quest Categories and Types
const QUEST_CATEGORIES = {
    CULTIVATION: 'cultivation',
    COMBAT: 'combat',
    SOCIAL: 'social',
    EXPLORATION: 'exploration',
    CRAFTING: 'crafting',
    COLLECTION: 'collection',
    TUTORIAL: 'tutorial',
    SPECIAL: 'special'
};

const QUEST_TYPES = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MILESTONE: 'milestone',
    CHAIN: 'chain',
    HIDDEN: 'hidden',
    EVENT: 'event'
};

const QUEST_DIFFICULTIES = {
    TRIVIAL: { multiplier: 0.5, name: 'Trivial' },
    EASY: { multiplier: 0.8, name: 'Easy' },
    NORMAL: { multiplier: 1.0, name: 'Normal' },
    HARD: { multiplier: 1.5, name: 'Hard' },
    EXPERT: { multiplier: 2.0, name: 'Expert' },
    LEGENDARY: { multiplier: 3.0, name: 'Legendary' }
};

// Objective Types for quests
const OBJECTIVE_TYPES = {
    // Cultivation objectives
    GAIN_QI_EXP: 'gain_qi_exp',
    GAIN_BODY_EXP: 'gain_body_exp',
    BREAKTHROUGH_QI: 'breakthrough_qi',
    BREAKTHROUGH_BODY: 'breakthrough_body',
    MEDITATE_TIME: 'meditate_time',
    REACH_REALM: 'reach_realm',

    // Combat objectives
    WIN_DUELS: 'win_duels',
    DEFEAT_OPPONENTS: 'defeat_opponents',
    WIN_STREAK: 'win_streak',
    TOURNAMENT_WINS: 'tournament_wins',

    // Social objectives
    JOIN_SECT: 'join_sect',
    SECT_CONTRIBUTION: 'sect_contribution',
    SECT_ACTIVITY: 'sect_activity',
    MENTOR_STUDENTS: 'mentor_students',

    // Collection objectives
    COLLECT_JADE: 'collect_jade',
    COLLECT_CRYSTALS: 'collect_crystals',
    COLLECT_SHARDS: 'collect_shards',
    COLLECT_SCRIPTURES: 'collect_scriptures',

    // Gacha/Scripture objectives
    GACHA_PULLS: 'gacha_pulls',
    OBTAIN_RARITY: 'obtain_rarity',
    ENHANCE_SCRIPTURE: 'enhance_scripture',
    EQUIP_LOADOUT: 'equip_loadout',

    // Time-based objectives
    PLAY_TIME: 'play_time',
    LOGIN_DAYS: 'login_days',
    IDLE_TIME: 'idle_time',

    // Meta objectives
    COMPLETE_QUESTS: 'complete_quests',
    EARN_ACHIEVEMENTS: 'earn_achievements'
};

// Quest Templates for Generation
const QUEST_TEMPLATES = {
    [QUEST_CATEGORIES.CULTIVATION]: [
        {
            id: 'daily_qi_cultivation',
            name: 'Daily Qi Cultivation',
            description: 'Cultivate your Qi path to gain {target} experience points',
            type: QUEST_TYPES.DAILY,
            objective: {
                type: OBJECTIVE_TYPES.GAIN_QI_EXP,
                target: [500, 1000, 2000, 5000],
                current: 0
            },
            rewards: {
                jade: [50, 100, 200, 500],
                spiritCrystals: [10, 25, 50, 100]
            },
            requirements: {
                minLevel: 0
            }
        },
        {
            id: 'daily_body_cultivation',
            name: 'Daily Body Cultivation',
            description: 'Strengthen your body by gaining {target} body cultivation experience',
            type: QUEST_TYPES.DAILY,
            objective: {
                type: OBJECTIVE_TYPES.GAIN_BODY_EXP,
                target: [500, 1000, 2000, 5000],
                current: 0
            },
            rewards: {
                jade: [50, 100, 200, 500],
                spiritCrystals: [10, 25, 50, 100]
            },
            requirements: {
                minLevel: 0
            }
        },
        {
            id: 'weekly_breakthrough',
            name: 'Weekly Breakthrough',
            description: 'Achieve {target} breakthroughs in any cultivation path',
            type: QUEST_TYPES.WEEKLY,
            objective: {
                type: OBJECTIVE_TYPES.BREAKTHROUGH_QI,
                target: [1, 2, 3, 5],
                current: 0,
                alternative: OBJECTIVE_TYPES.BREAKTHROUGH_BODY
            },
            rewards: {
                jade: [200, 500, 1000, 2000],
                spiritCrystals: [50, 100, 200, 500],
                shards: [1, 2, 5, 10]
            },
            requirements: {
                minLevel: 5
            }
        },
        {
            id: 'meditation_marathon',
            name: 'Meditation Marathon',
            description: 'Meditate continuously for {target} minutes',
            type: QUEST_TYPES.WEEKLY,
            objective: {
                type: OBJECTIVE_TYPES.MEDITATE_TIME,
                target: [30, 60, 120, 300],
                current: 0
            },
            rewards: {
                jade: [100, 300, 700, 1500],
                spiritCrystals: [25, 75, 150, 300],
                cultivationBonus: [0.1, 0.15, 0.25, 0.5]
            },
            requirements: {
                minLevel: 1
            }
        }
    ],

    [QUEST_CATEGORIES.COMBAT]: [
        {
            id: 'daily_duels',
            name: 'Daily Combat Training',
            description: 'Win {target} duels against other cultivators',
            type: QUEST_TYPES.DAILY,
            objective: {
                type: OBJECTIVE_TYPES.WIN_DUELS,
                target: [3, 5, 10, 15],
                current: 0
            },
            rewards: {
                jade: [75, 150, 300, 600],
                spiritCrystals: [15, 30, 60, 120]
            },
            requirements: {
                minLevel: 2
            }
        },
        {
            id: 'win_streak_challenge',
            name: 'Winning Streak',
            description: 'Achieve a win streak of {target} consecutive victories',
            type: QUEST_TYPES.WEEKLY,
            objective: {
                type: OBJECTIVE_TYPES.WIN_STREAK,
                target: [5, 10, 20, 30],
                current: 0
            },
            rewards: {
                jade: [300, 750, 1500, 3000],
                spiritCrystals: [75, 150, 300, 600],
                shards: [2, 5, 10, 20]
            },
            requirements: {
                minLevel: 5
            }
        }
    ],

    [QUEST_CATEGORIES.SOCIAL]: [
        {
            id: 'sect_contribution',
            name: 'Sect Devotion',
            description: 'Contribute {target} points to your sect',
            type: QUEST_TYPES.WEEKLY,
            objective: {
                type: OBJECTIVE_TYPES.SECT_CONTRIBUTION,
                target: [100, 250, 500, 1000],
                current: 0
            },
            rewards: {
                jade: [150, 400, 800, 1600],
                spiritCrystals: [30, 80, 160, 320],
                sectReputation: [10, 25, 50, 100]
            },
            requirements: {
                sectMember: true
            }
        }
    ],

    [QUEST_CATEGORIES.COLLECTION]: [
        {
            id: 'daily_gacha',
            name: 'Daily Scripture Search',
            description: 'Perform {target} gacha pulls to find new scriptures',
            type: QUEST_TYPES.DAILY,
            objective: {
                type: OBJECTIVE_TYPES.GACHA_PULLS,
                target: [1, 3, 5, 10],
                current: 0
            },
            rewards: {
                jade: [25, 75, 125, 250],
                spiritCrystals: [5, 15, 25, 50]
            },
            requirements: {
                minLevel: 1
            }
        },
        {
            id: 'jade_collector',
            name: 'Jade Collection',
            description: 'Accumulate {target} jade through various activities',
            type: QUEST_TYPES.WEEKLY,
            objective: {
                type: OBJECTIVE_TYPES.COLLECT_JADE,
                target: [1000, 2500, 5000, 10000],
                current: 0
            },
            rewards: {
                spiritCrystals: [50, 125, 250, 500],
                shards: [1, 3, 6, 12],
                jadeBonus: [0.05, 0.1, 0.15, 0.25]
            },
            requirements: {
                minLevel: 3
            }
        },
        {
            id: 'scripture_collector',
            name: 'Scripture Collector',
            description: 'Obtain {target} new scriptures of Epic rarity or higher',
            type: QUEST_TYPES.WEEKLY,
            objective: {
                type: OBJECTIVE_TYPES.OBTAIN_RARITY,
                target: [1, 2, 3, 5],
                current: 0,
                filters: { minRarity: 'Epic' }
            },
            rewards: {
                jade: [500, 1250, 2500, 5000],
                spiritCrystals: [100, 250, 500, 1000],
                shards: [3, 7, 15, 30]
            },
            requirements: {
                minLevel: 10
            }
        }
    ],

    [QUEST_CATEGORIES.TUTORIAL]: [
        {
            id: 'first_cultivation',
            name: 'Path of Cultivation',
            description: 'Begin your cultivation journey by gaining your first level',
            type: QUEST_TYPES.MILESTONE,
            objective: {
                type: OBJECTIVE_TYPES.GAIN_QI_EXP,
                target: 100,
                current: 0
            },
            rewards: {
                jade: 100,
                spiritCrystals: 50,
                tutorial: true
            },
            requirements: {
                tutorial: true
            }
        },
        {
            id: 'first_gacha',
            name: 'First Scripture',
            description: 'Perform your first scripture pull from the gacha system',
            type: QUEST_TYPES.MILESTONE,
            objective: {
                type: OBJECTIVE_TYPES.GACHA_PULLS,
                target: 1,
                current: 0
            },
            rewards: {
                jade: 200,
                spiritCrystals: 100,
                tutorial: true
            },
            requirements: {
                tutorial: true
            }
        }
    ]
};

// Achievement Categories
const ACHIEVEMENT_CATEGORIES = {
    CULTIVATION: 'cultivation',
    COMBAT: 'combat',
    COLLECTION: 'collection',
    SOCIAL: 'social',
    PROGRESSION: 'progression',
    SPECIAL: 'special',
    HIDDEN: 'hidden'
};

const ACHIEVEMENT_RARITIES = {
    COMMON: { name: 'Common', points: 10, color: '#8B8680' },
    UNCOMMON: { name: 'Uncommon', points: 25, color: '#5CB85C' },
    RARE: { name: 'Rare', points: 50, color: '#5BC0DE' },
    EPIC: { name: 'Epic', points: 100, color: '#A855F7' },
    LEGENDARY: { name: 'Legendary', points: 250, color: '#F59E0B' },
    MYTHIC: { name: 'Mythic', points: 500, color: '#EF4444' }
};

// Achievement Definitions
const ACHIEVEMENTS = {
    // Cultivation Achievements
    cultivation_first_breakthrough: {
        id: 'cultivation_first_breakthrough',
        name: 'First Breakthrough',
        description: 'Achieve your first cultivation breakthrough',
        category: ACHIEVEMENT_CATEGORIES.CULTIVATION,
        rarity: ACHIEVEMENT_RARITIES.COMMON,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'cultivationStats.totalBreakthroughs',
            value: 1,
            operator: '>='
        },
        rewards: {
            jade: 200,
            spiritCrystals: 100,
            title: 'Breakthrough Novice'
        }
    },

    cultivation_qi_master: {
        id: 'cultivation_qi_master',
        name: 'Qi Cultivation Master',
        description: 'Reach level 50 in Qi cultivation',
        category: ACHIEVEMENT_CATEGORIES.CULTIVATION,
        rarity: ACHIEVEMENT_RARITIES.RARE,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'cultivation.qi.level',
            value: 50,
            operator: '>='
        },
        rewards: {
            jade: 1000,
            spiritCrystals: 500,
            shards: 5,
            title: 'Qi Master'
        }
    },

    cultivation_body_master: {
        id: 'cultivation_body_master',
        name: 'Body Cultivation Master',
        description: 'Reach level 50 in Body cultivation',
        category: ACHIEVEMENT_CATEGORIES.CULTIVATION,
        rarity: ACHIEVEMENT_RARITIES.RARE,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'cultivation.body.level',
            value: 50,
            operator: '>='
        },
        rewards: {
            jade: 1000,
            spiritCrystals: 500,
            shards: 5,
            title: 'Body Master'
        }
    },

    cultivation_dual_unlock: {
        id: 'cultivation_dual_unlock',
        name: 'Dual Cultivation Awakened',
        description: 'Unlock the path of dual cultivation',
        category: ACHIEVEMENT_CATEGORIES.CULTIVATION,
        rarity: ACHIEVEMENT_RARITIES.EPIC,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'cultivation.dual.unlocked',
            value: true,
            operator: '=='
        },
        rewards: {
            jade: 2000,
            spiritCrystals: 1000,
            shards: 10,
            title: 'Dual Path Walker'
        }
    },

    cultivation_transcendent: {
        id: 'cultivation_transcendent',
        name: 'Transcendent Cultivator',
        description: 'Reach the highest cultivation realm',
        category: ACHIEVEMENT_CATEGORIES.CULTIVATION,
        rarity: ACHIEVEMENT_RARITIES.MYTHIC,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'realm.current',
            value: 'Transcendent',
            operator: '=='
        },
        rewards: {
            jade: 10000,
            spiritCrystals: 5000,
            shards: 50,
            title: 'Transcendent One'
        }
    },

    // Combat Achievements
    combat_first_victory: {
        id: 'combat_first_victory',
        name: 'First Victory',
        description: 'Win your first duel',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        rarity: ACHIEVEMENT_RARITIES.COMMON,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'combat.wins',
            value: 1,
            operator: '>='
        },
        rewards: {
            jade: 150,
            spiritCrystals: 75,
            title: 'Duelist'
        }
    },

    combat_warrior: {
        id: 'combat_warrior',
        name: 'Seasoned Warrior',
        description: 'Win 100 duels',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        rarity: ACHIEVEMENT_RARITIES.UNCOMMON,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'combat.wins',
            value: 100,
            operator: '>='
        },
        rewards: {
            jade: 500,
            spiritCrystals: 250,
            shards: 2,
            title: 'Seasoned Warrior'
        }
    },

    combat_undefeated: {
        id: 'combat_undefeated',
        name: 'Undefeated Champion',
        description: 'Achieve a 50-win streak',
        category: ACHIEVEMENT_CATEGORIES.COMBAT,
        rarity: ACHIEVEMENT_RARITIES.LEGENDARY,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'combat.streak',
            value: 50,
            operator: '>='
        },
        rewards: {
            jade: 5000,
            spiritCrystals: 2500,
            shards: 25,
            title: 'Undefeated Champion'
        }
    },

    // Collection Achievements
    collection_first_scripture: {
        id: 'collection_first_scripture',
        name: 'Scripture Seeker',
        description: 'Obtain your first scripture',
        category: ACHIEVEMENT_CATEGORIES.COLLECTION,
        rarity: ACHIEVEMENT_RARITIES.COMMON,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'scriptureStats.totalScriptures',
            value: 1,
            operator: '>='
        },
        rewards: {
            jade: 100,
            spiritCrystals: 50
        }
    },

    collection_legendary_scripture: {
        id: 'collection_legendary_scripture',
        name: 'Legendary Collector',
        description: 'Obtain your first Legendary scripture',
        category: ACHIEVEMENT_CATEGORIES.COLLECTION,
        rarity: ACHIEVEMENT_RARITIES.EPIC,
        hidden: false,
        conditions: {
            type: 'custom',
            check: 'hasScriptureOfRarity',
            params: { rarity: 'Legendary' }
        },
        rewards: {
            jade: 3000,
            spiritCrystals: 1500,
            shards: 15,
            title: 'Legendary Collector'
        }
    },

    collection_hundred_scriptures: {
        id: 'collection_hundred_scriptures',
        name: 'Scripture Hoarder',
        description: 'Collect 100 different scriptures',
        category: ACHIEVEMENT_CATEGORIES.COLLECTION,
        rarity: ACHIEVEMENT_RARITIES.RARE,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'scriptureStats.totalScriptures',
            value: 100,
            operator: '>='
        },
        rewards: {
            jade: 1500,
            spiritCrystals: 750,
            shards: 8,
            title: 'Scripture Hoarder'
        }
    },

    // Social Achievements
    social_sect_member: {
        id: 'social_sect_member',
        name: 'Sect Initiate',
        description: 'Join your first sect',
        category: ACHIEVEMENT_CATEGORIES.SOCIAL,
        rarity: ACHIEVEMENT_RARITIES.COMMON,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'sect.id',
            value: null,
            operator: '!='
        },
        rewards: {
            jade: 300,
            spiritCrystals: 150,
            title: 'Sect Member'
        }
    },

    social_sect_elder: {
        id: 'social_sect_elder',
        name: 'Sect Elder',
        description: 'Contribute 10,000 points to your sect',
        category: ACHIEVEMENT_CATEGORIES.SOCIAL,
        rarity: ACHIEVEMENT_RARITIES.EPIC,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'sect.contribution',
            value: 10000,
            operator: '>='
        },
        rewards: {
            jade: 2500,
            spiritCrystals: 1250,
            shards: 12,
            title: 'Sect Elder'
        }
    },

    // Progression Achievements
    progression_first_realm: {
        id: 'progression_first_realm',
        name: 'Realm Ascension',
        description: 'Advance to the next cultivation realm',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        rarity: ACHIEVEMENT_RARITIES.UNCOMMON,
        hidden: false,
        conditions: {
            type: 'custom',
            check: 'realmAdvancement',
            params: { minRealm: 1 }
        },
        rewards: {
            jade: 400,
            spiritCrystals: 200,
            shards: 1,
            title: 'Realm Walker'
        }
    },

    progression_questmaster: {
        id: 'progression_questmaster',
        name: 'Quest Master',
        description: 'Complete 100 quests',
        category: ACHIEVEMENT_CATEGORIES.PROGRESSION,
        rarity: ACHIEVEMENT_RARITIES.RARE,
        hidden: false,
        conditions: {
            type: 'stat',
            stat: 'questStats.totalCompleted',
            value: 100,
            operator: '>='
        },
        rewards: {
            jade: 2000,
            spiritCrystals: 1000,
            shards: 10,
            title: 'Quest Master'
        }
    },

    // Hidden Achievements
    hidden_perfect_breakthrough: {
        id: 'hidden_perfect_breakthrough',
        name: 'Perfect Harmony',
        description: 'Achieve a perfect breakthrough on your first attempt',
        category: ACHIEVEMENT_CATEGORIES.HIDDEN,
        rarity: ACHIEVEMENT_RARITIES.LEGENDARY,
        hidden: true,
        conditions: {
            type: 'custom',
            check: 'perfectBreakthrough',
            params: { firstAttempt: true }
        },
        rewards: {
            jade: 5000,
            spiritCrystals: 2500,
            shards: 25,
            title: 'Perfect Harmony',
            special: 'cultivation_efficiency_bonus'
        }
    },

    hidden_speed_runner: {
        id: 'hidden_speed_runner',
        name: 'Lightning Ascension',
        description: 'Reach level 25 in any cultivation path within 1 hour of play time',
        category: ACHIEVEMENT_CATEGORIES.HIDDEN,
        rarity: ACHIEVEMENT_RARITIES.EPIC,
        hidden: true,
        conditions: {
            type: 'custom',
            check: 'speedRun',
            params: { level: 25, timeLimit: 3600000 }
        },
        rewards: {
            jade: 3000,
            spiritCrystals: 1500,
            shards: 15,
            title: 'Lightning Ascension',
            special: 'experience_multiplier'
        }
    }
};

// Reward Types and Scaling
const REWARD_TYPES = {
    JADE: 'jade',
    SPIRIT_CRYSTALS: 'spiritCrystals',
    SHARDS: 'shards',
    EXPERIENCE: 'experience',
    ITEMS: 'items',
    TITLES: 'titles',
    BUFFS: 'buffs',
    UNLOCKS: 'unlocks'
};

const REWARD_SCALING = {
    LEVEL_MULTIPLIER: 0.1, // 10% increase per level
    DIFFICULTY_MULTIPLIER: {
        [QUEST_DIFFICULTIES.TRIVIAL.name]: 0.5,
        [QUEST_DIFFICULTIES.EASY.name]: 0.8,
        [QUEST_DIFFICULTIES.NORMAL.name]: 1.0,
        [QUEST_DIFFICULTIES.HARD.name]: 1.5,
        [QUEST_DIFFICULTIES.EXPERT.name]: 2.0,
        [QUEST_DIFFICULTIES.LEGENDARY.name]: 3.0
    },
    QUEST_TYPE_MULTIPLIER: {
        [QUEST_TYPES.DAILY]: 1.0,
        [QUEST_TYPES.WEEKLY]: 2.5,
        [QUEST_TYPES.MILESTONE]: 1.5,
        [QUEST_TYPES.CHAIN]: 1.2,
        [QUEST_TYPES.HIDDEN]: 3.0,
        [QUEST_TYPES.EVENT]: 2.0
    }
};

// Quest Chain Definitions
const QUEST_CHAINS = {
    cultivation_mastery: {
        id: 'cultivation_mastery',
        name: 'Path to Mastery',
        description: 'A journey through the fundamentals of cultivation',
        category: QUEST_CATEGORIES.CULTIVATION,
        quests: ['first_cultivation', 'qi_breakthrough', 'body_training', 'dual_awakening'],
        rewards: {
            completion: {
                jade: 5000,
                spiritCrystals: 2500,
                shards: 25,
                title: 'Cultivation Master'
            }
        }
    },

    combat_tournament: {
        id: 'combat_tournament',
        name: 'Tournament Champion',
        description: 'Rise through the ranks in combat competitions',
        category: QUEST_CATEGORIES.COMBAT,
        quests: ['first_victory', 'win_streak', 'tournament_entry', 'championship'],
        rewards: {
            completion: {
                jade: 7500,
                spiritCrystals: 3750,
                shards: 40,
                title: 'Tournament Champion'
            }
        }
    }
};

// Daily Quest Pool Configuration
const DAILY_QUEST_CONFIG = {
    maxActiveQuests: 3,
    refreshTime: 24 * 60 * 60 * 1000, // 24 hours
    categories: [
        { category: QUEST_CATEGORIES.CULTIVATION, weight: 40 },
        { category: QUEST_CATEGORIES.COMBAT, weight: 25 },
        { category: QUEST_CATEGORIES.COLLECTION, weight: 25 },
        { category: QUEST_CATEGORIES.SOCIAL, weight: 10 }
    ]
};

// Weekly Quest Pool Configuration
const WEEKLY_QUEST_CONFIG = {
    maxActiveQuests: 2,
    refreshTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    categories: [
        { category: QUEST_CATEGORIES.CULTIVATION, weight: 30 },
        { category: QUEST_CATEGORIES.COMBAT, weight: 20 },
        { category: QUEST_CATEGORIES.COLLECTION, weight: 30 },
        { category: QUEST_CATEGORIES.SOCIAL, weight: 20 }
    ]
};

// Export all data
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QUEST_CATEGORIES,
        QUEST_TYPES,
        QUEST_DIFFICULTIES,
        OBJECTIVE_TYPES,
        QUEST_TEMPLATES,
        ACHIEVEMENT_CATEGORIES,
        ACHIEVEMENT_RARITIES,
        ACHIEVEMENTS,
        REWARD_TYPES,
        REWARD_SCALING,
        QUEST_CHAINS,
        DAILY_QUEST_CONFIG,
        WEEKLY_QUEST_CONFIG
    };
} else if (typeof window !== 'undefined') {
    window.QUEST_CATEGORIES = QUEST_CATEGORIES;
    window.QUEST_TYPES = QUEST_TYPES;
    window.QUEST_DIFFICULTIES = QUEST_DIFFICULTIES;
    window.OBJECTIVE_TYPES = OBJECTIVE_TYPES;
    window.QUEST_TEMPLATES = QUEST_TEMPLATES;
    window.ACHIEVEMENT_CATEGORIES = ACHIEVEMENT_CATEGORIES;
    window.ACHIEVEMENT_RARITIES = ACHIEVEMENT_RARITIES;
    window.ACHIEVEMENTS = ACHIEVEMENTS;
    window.REWARD_TYPES = REWARD_TYPES;
    window.REWARD_SCALING = REWARD_SCALING;
    window.QUEST_CHAINS = QUEST_CHAINS;
    window.DAILY_QUEST_CONFIG = DAILY_QUEST_CONFIG;
    window.WEEKLY_QUEST_CONFIG = WEEKLY_QUEST_CONFIG;
}