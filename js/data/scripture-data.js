/**
 * Scripture Data - Comprehensive database of cultivable scriptures
 * Contains scripture definitions, rarity tiers, gacha pools, and enhancement mechanics
 */

// Scripture rarity definitions with progression benefits
const SCRIPTURE_RARITIES = {
    "Common": {
        id: "common",
        color: "#9ca3af", // Gray
        dropRate: 0.50,
        maxLevel: 20,
        basePower: 100,
        enhancementCost: {
            baseJade: 100,
            multiplier: 1.2
        },
        awakeningCost: {
            jade: 1000,
            crystals: 50
        },
        statBonus: {
            cultivation: 0.05,
            qi: 0.03,
            body: 0.03
        }
    },
    "Uncommon": {
        id: "uncommon",
        color: "#10b981", // Green
        dropRate: 0.30,
        maxLevel: 40,
        basePower: 200,
        enhancementCost: {
            baseJade: 200,
            multiplier: 1.3
        },
        awakeningCost: {
            jade: 2500,
            crystals: 100
        },
        statBonus: {
            cultivation: 0.08,
            qi: 0.05,
            body: 0.05
        }
    },
    "Rare": {
        id: "rare",
        color: "#3b82f6", // Blue
        dropRate: 0.15,
        maxLevel: 60,
        basePower: 400,
        enhancementCost: {
            baseJade: 500,
            multiplier: 1.4
        },
        awakeningCost: {
            jade: 5000,
            crystals: 200
        },
        statBonus: {
            cultivation: 0.12,
            qi: 0.08,
            body: 0.08
        }
    },
    "Epic": {
        id: "epic",
        color: "#8b5cf6", // Purple
        dropRate: 0.04,
        maxLevel: 80,
        basePower: 800,
        enhancementCost: {
            baseJade: 1000,
            multiplier: 1.5
        },
        awakeningCost: {
            jade: 10000,
            crystals: 500
        },
        statBonus: {
            cultivation: 0.18,
            qi: 0.12,
            body: 0.12
        }
    },
    "Legendary": {
        id: "legendary",
        color: "#f59e0b", // Orange
        dropRate: 0.009,
        maxLevel: 100,
        basePower: 1600,
        enhancementCost: {
            baseJade: 2500,
            multiplier: 1.6
        },
        awakeningCost: {
            jade: 25000,
            crystals: 1000
        },
        statBonus: {
            cultivation: 0.25,
            qi: 0.18,
            body: 0.18
        }
    },
    "Mythical": {
        id: "mythical",
        color: "#ef4444", // Red
        dropRate: 0.001,
        maxLevel: 120,
        basePower: 3200,
        enhancementCost: {
            baseJade: 5000,
            multiplier: 1.8
        },
        awakeningCost: {
            jade: 50000,
            crystals: 2500
        },
        statBonus: {
            cultivation: 0.35,
            qi: 0.25,
            body: 0.25
        }
    }
};

// Scripture categories with different focus areas
const SCRIPTURE_CATEGORIES = {
    "Qi Technique": {
        id: "qi",
        description: "Techniques focusing on spiritual energy cultivation",
        statBonus: { qi: 1.5, body: 0.5, cultivation: 1.0 }
    },
    "Body Technique": {
        id: "body",
        description: "Techniques focusing on physical strengthening",
        statBonus: { qi: 0.5, body: 1.5, cultivation: 1.0 }
    },
    "Dual Cultivation": {
        id: "dual",
        description: "Balanced techniques for both qi and body",
        statBonus: { qi: 1.0, body: 1.0, cultivation: 1.2 }
    },
    "Support": {
        id: "support",
        description: "Utility techniques providing special effects",
        statBonus: { qi: 0.8, body: 0.8, cultivation: 0.8 }
    }
};

// Comprehensive scripture database with authentic Xianxia names and effects
const SCRIPTURE_DATABASE = {
    // === COMMON SCRIPTURES ===
    "Basic Breathing Method": {
        id: "basic_breathing",
        name: "Basic Breathing Method",
        rarity: "Common",
        category: "Qi Technique",
        description: "The most fundamental qi cultivation method, teaching proper breathing patterns",
        lore: "Every cultivator's first step on the path of immortality. Simple yet essential.",
        unlockRequirements: {},
        baseStats: {
            qiBonus: 0.05,
            bodyBonus: 0.0,
            cultivationSpeed: 0.03
        },
        specialEffects: {
            "Steady Foundation": "Reduces qi cultivation failures by 10%"
        },
        school: "Universal",
        element: "None"
    },
    "Iron Body Training": {
        id: "iron_body_training",
        name: "Iron Body Training",
        rarity: "Common",
        category: "Body Technique",
        description: "Fundamental body strengthening exercises using resistance training",
        lore: "Forge your flesh like iron through relentless training and discipline.",
        unlockRequirements: {},
        baseStats: {
            qiBonus: 0.0,
            bodyBonus: 0.05,
            cultivationSpeed: 0.03
        },
        specialEffects: {
            "Hardened Skin": "Increases physical damage resistance by 5%"
        },
        school: "Universal",
        element: "Earth"
    },
    "Harmony of Five Elements": {
        id: "harmony_five_elements",
        name: "Harmony of Five Elements",
        rarity: "Common",
        category: "Dual Cultivation",
        description: "Balances the five classical elements within the cultivator",
        lore: "Metal, Wood, Water, Fire, and Earth - understand their cycle to find balance.",
        unlockRequirements: {},
        baseStats: {
            qiBonus: 0.03,
            bodyBonus: 0.03,
            cultivationSpeed: 0.04
        },
        specialEffects: {
            "Elemental Balance": "Reduces all elemental damage by 5%"
        },
        school: "Five Element Sect",
        element: "Multi"
    },
    "Meditation of the Calm Mind": {
        id: "meditation_calm_mind",
        name: "Meditation of the Calm Mind",
        rarity: "Common",
        category: "Support",
        description: "Teaches mental discipline and focus enhancement",
        lore: "A calm mind is like still water - it reflects the truth clearly.",
        unlockRequirements: {},
        baseStats: {
            qiBonus: 0.02,
            bodyBonus: 0.02,
            cultivationSpeed: 0.02
        },
        specialEffects: {
            "Clear Thoughts": "Increases breakthrough success chance by 5%"
        },
        school: "Temple of Serenity",
        element: "None"
    },

    // === UNCOMMON SCRIPTURES ===
    "Flowing River Qi Method": {
        id: "flowing_river_qi",
        name: "Flowing River Qi Method",
        rarity: "Uncommon",
        category: "Qi Technique",
        description: "Channels qi like a flowing river, smooth and continuous",
        lore: "Like water that shapes the hardest stone, persistent qi flow overcomes all obstacles.",
        unlockRequirements: {
            cultivation: { qi: { level: 20 } }
        },
        baseStats: {
            qiBonus: 0.08,
            bodyBonus: 0.02,
            cultivationSpeed: 0.05
        },
        specialEffects: {
            "Fluid Qi": "Qi regeneration increased by 15%",
            "Smooth Flow": "Reduces qi cultivation costs by 10%"
        },
        school: "River Valley Academy",
        element: "Water"
    },
    "Mountain Endurance Technique": {
        id: "mountain_endurance",
        name: "Mountain Endurance Technique",
        rarity: "Uncommon",
        category: "Body Technique",
        description: "Builds endurance and resilience like an immovable mountain",
        lore: "Stand firm against ten thousand storms, unmoved like the eternal peaks.",
        unlockRequirements: {
            cultivation: { body: { level: 20 } }
        },
        baseStats: {
            qiBonus: 0.02,
            bodyBonus: 0.08,
            cultivationSpeed: 0.05
        },
        specialEffects: {
            "Mountain's Endurance": "Increases stamina by 20%",
            "Steady as Stone": "Reduces negative status effects by 15%"
        },
        school: "Stone Mountain Sect",
        element: "Earth"
    },
    "Wind Walker's Grace": {
        id: "wind_walker_grace",
        name: "Wind Walker's Grace",
        rarity: "Uncommon",
        category: "Dual Cultivation",
        description: "Combines lightness techniques with qi manipulation",
        lore: "Move like the wind - swift, unpredictable, and leaving no trace.",
        unlockRequirements: {
            cultivation: { qi: { level: 15 }, body: { level: 15 } }
        },
        baseStats: {
            qiBonus: 0.05,
            bodyBonus: 0.05,
            cultivationSpeed: 0.06
        },
        specialEffects: {
            "Wind Step": "Increases movement speed by 25%",
            "Graceful Motion": "Improves dodge chance by 10%"
        },
        school: "Wind Walker Clan",
        element: "Air"
    },
    "Herb Gathering Wisdom": {
        id: "herb_gathering_wisdom",
        name: "Herb Gathering Wisdom",
        rarity: "Uncommon",
        category: "Support",
        description: "Knowledge of spiritual herbs and their cultivation effects",
        lore: "Nature provides all we need - wisdom lies in knowing what to take and what to leave.",
        unlockRequirements: {
            realm: "Qi Gathering"
        },
        baseStats: {
            qiBonus: 0.03,
            bodyBonus: 0.03,
            cultivationSpeed: 0.04
        },
        specialEffects: {
            "Herbal Knowledge": "Increases pill effectiveness by 20%",
            "Natural Harmony": "Reduces resource costs by 10%"
        },
        school: "Medicine Valley",
        element: "Wood"
    },

    // === RARE SCRIPTURES ===
    "Celestial Star Qi Absorption": {
        id: "celestial_star_qi",
        name: "Celestial Star Qi Absorption",
        rarity: "Rare",
        category: "Qi Technique",
        description: "Draws power from celestial bodies during cultivation",
        lore: "The stars are distant suns, each containing infinite qi. Learn to call upon their light.",
        unlockRequirements: {
            cultivation: { qi: { level: 50 } },
            realm: "Foundation Building"
        },
        baseStats: {
            qiBonus: 0.12,
            bodyBonus: 0.03,
            cultivationSpeed: 0.08
        },
        specialEffects: {
            "Starlight Qi": "Night cultivation is 50% more effective",
            "Celestial Connection": "Qi capacity increased by 25%",
            "Stellar Guidance": "Breakthrough chances increased by 8%"
        },
        school: "Stargazer Pavilion",
        element: "Light"
    },
    "Adamant Bone Forging": {
        id: "adamant_bone_forging",
        name: "Adamant Bone Forging",
        rarity: "Rare",
        category: "Body Technique",
        description: "Transforms bones into material harder than steel",
        lore: "When flesh fails, bones endure. When bones are adamant, nothing can break you.",
        unlockRequirements: {
            cultivation: { body: { level: 50 } },
            realm: "Foundation Building"
        },
        baseStats: {
            qiBonus: 0.03,
            bodyBonus: 0.12,
            cultivationSpeed: 0.08
        },
        specialEffects: {
            "Adamant Bones": "Physical damage reduction increased by 30%",
            "Unbreakable Will": "Immunity to bone-breaking attacks",
            "Steel Endurance": "Reduces injury recovery time by 40%"
        },
        school: "Iron Bone Hall",
        element: "Metal"
    },
    "Yin-Yang Circulation Manual": {
        id: "yin_yang_circulation",
        name: "Yin-Yang Circulation Manual",
        rarity: "Rare",
        category: "Dual Cultivation",
        description: "Balances opposing forces for perfect cultivation harmony",
        lore: "In darkness find light, in light acknowledge darkness. Balance is the key to transcendence.",
        unlockRequirements: {
            cultivation: { qi: { level: 40 }, body: { level: 40 } },
            realm: "Foundation Building"
        },
        baseStats: {
            qiBonus: 0.08,
            bodyBonus: 0.08,
            cultivationSpeed: 0.10
        },
        specialEffects: {
            "Perfect Balance": "Dual cultivation efficiency increased by 40%",
            "Yin-Yang Harmony": "Eliminates cultivation path conflicts",
            "Opposing Unity": "Converts 10% of damage taken into qi"
        },
        school: "Ancient Dao Academy",
        element: "Balance"
    },
    "Formation Master's Basics": {
        id: "formation_master_basics",
        name: "Formation Master's Basics",
        rarity: "Rare",
        category: "Support",
        description: "Fundamental knowledge of formation arrays and spiritual patterns",
        lore: "Reality is but a canvas - formations are the brush strokes that reshape the world.",
        unlockRequirements: {
            cultivation: { qi: { level: 60 } },
            realm: "Foundation Building"
        },
        baseStats: {
            qiBonus: 0.06,
            bodyBonus: 0.04,
            cultivationSpeed: 0.06
        },
        specialEffects: {
            "Formation Sight": "Can see and analyze spiritual formations",
            "Qi Efficiency": "All qi costs reduced by 15%",
            "Array Mastery": "Can create basic cultivation formations"
        },
        school: "Formation Guild",
        element: "Space"
    },

    // === EPIC SCRIPTURES ===
    "Nine Heavens Lightning Scripture": {
        id: "nine_heavens_lightning",
        name: "Nine Heavens Lightning Scripture",
        rarity: "Epic",
        category: "Qi Technique",
        description: "Harnesses the devastating power of celestial lightning",
        lore: "When the heavens roar, the wise listen. When they strike, the prepared survive.",
        unlockRequirements: {
            cultivation: { qi: { level: 100 } },
            realm: "Core Formation"
        },
        baseStats: {
            qiBonus: 0.18,
            bodyBonus: 0.05,
            cultivationSpeed: 0.12
        },
        specialEffects: {
            "Lightning Qi": "Cultivation speed increases during storms by 100%",
            "Thunder Body": "Body automatically absorbs lightning damage",
            "Heaven's Wrath": "Breakthrough failures trigger beneficial lightning tempering",
            "Storm Affinity": "Can cultivate using lightning as a resource"
        },
        school: "Lightning Peak Sect",
        element: "Lightning"
    },
    "Primordial Dragon Body": {
        id: "primordial_dragon_body",
        name: "Primordial Dragon Body",
        rarity: "Epic",
        category: "Body Technique",
        description: "Awakens the ancient dragon bloodline within",
        lore: "Before the first emperor, dragons ruled the heavens. Their blood still flows in rare few.",
        unlockRequirements: {
            cultivation: { body: { level: 100 } },
            realm: "Core Formation"
        },
        baseStats: {
            qiBonus: 0.05,
            bodyBonus: 0.18,
            cultivationSpeed: 0.12
        },
        specialEffects: {
            "Dragon Scales": "Immunity to physical attacks below certain threshold",
            "Ancient Bloodline": "Regeneration speed increased by 200%",
            "Dragon's Might": "Intimidation aura affects weaker cultivators",
            "Scale Armor": "Natural armor that grows stronger with level"
        },
        school: "Dragon Bloodline Clan",
        element: "Primal"
    },
    "Chaos-Order Paradox Method": {
        id: "chaos_order_paradox",
        name: "Chaos-Order Paradox Method",
        rarity: "Epic",
        category: "Dual Cultivation",
        description: "Embraces both chaos and order to transcend conventional limits",
        lore: "In perfect order, find chaos. In pure chaos, discover order. Truth lies in the paradox.",
        unlockRequirements: {
            cultivation: { qi: { level: 80 }, body: { level: 80 } },
            realm: "Core Formation"
        },
        baseStats: {
            qiBonus: 0.12,
            bodyBonus: 0.12,
            cultivationSpeed: 0.15
        },
        specialEffects: {
            "Paradox State": "Can cultivate two opposing techniques simultaneously",
            "Chaos Adaptation": "Adapts to any cultivation environment instantly",
            "Order's Structure": "Breakthrough chances cannot fall below 25%",
            "Reality Flux": "Small chance to gain random beneficial effects"
        },
        school: "Paradox Monastery",
        element: "Chaos"
    },
    "Void Comprehension Scripture": {
        id: "void_comprehension",
        name: "Void Comprehension Scripture",
        rarity: "Epic",
        category: "Support",
        description: "Teaches understanding of the void between all things",
        lore: "The void is not empty - it is full of infinite possibility waiting to be shaped.",
        unlockRequirements: {
            cultivation: { qi: { level: 120 } },
            realm: "Core Formation"
        },
        baseStats: {
            qiBonus: 0.10,
            bodyBonus: 0.08,
            cultivationSpeed: 0.10
        },
        specialEffects: {
            "Void Walking": "Can enter void spaces for accelerated cultivation",
            "Space Comprehension": "Understanding of spatial laws increased",
            "Null Absorption": "Can absorb and nullify enemy techniques",
            "Dimensional Storage": "Personal void storage space unlocked"
        },
        school: "Void Temple",
        element: "Void"
    },

    // === LEGENDARY SCRIPTURES ===
    "Eternal Dao Heart Sutra": {
        id: "eternal_dao_heart",
        name: "Eternal Dao Heart Sutra",
        rarity: "Legendary",
        category: "Dual Cultivation",
        description: "The supreme technique of the eternal dao, transcending mortal limitations",
        lore: "The Dao that can be named is not the eternal Dao. Yet within this scripture lies a glimpse of the infinite.",
        unlockRequirements: {
            cultivation: { qi: { level: 200 }, body: { level: 200 } },
            realm: "Nascent Soul"
        },
        baseStats: {
            qiBonus: 0.25,
            bodyBonus: 0.25,
            cultivationSpeed: 0.20
        },
        specialEffects: {
            "Dao Heart": "Immunity to heart demons and inner turmoil",
            "Eternal Qi": "Qi naturally regenerates to full over time",
            "Transcendent Body": "Body slowly becomes more perfect",
            "Dao Comprehension": "Gradually understand fundamental laws",
            "Reality Anchor": "Cannot be affected by reality-altering effects"
        },
        school: "Ancient Dao Sect",
        element: "Dao"
    },
    "World Tree Incarnation": {
        id: "world_tree_incarnation",
        name: "World Tree Incarnation",
        rarity: "Legendary",
        category: "Body Technique",
        description: "Transforms the body into a vessel for the World Tree's power",
        lore: "The World Tree connects all realms. To become one with it is to touch infinity.",
        unlockRequirements: {
            cultivation: { body: { level: 250 } },
            realm: "Nascent Soul"
        },
        baseStats: {
            qiBonus: 0.10,
            bodyBonus: 0.30,
            cultivationSpeed: 0.18
        },
        specialEffects: {
            "Root Network": "Connected to all plant life within vast radius",
            "Life Force": "Can draw energy from living things around you",
            "Growth": "Body continues growing stronger without limits",
            "Nature's Blessing": "All natural environments boost cultivation",
            "World Anchor": "Provides stability to local reality"
        },
        school: "Nature's Heart Monastery",
        element: "Life"
    },
    "Stellar Forge Qi Manual": {
        id: "stellar_forge_qi",
        name: "Stellar Forge Qi Manual",
        rarity: "Legendary",
        category: "Qi Technique",
        description: "Channels the qi-forging power of stellar cores",
        lore: "Stars are forges where qi is born. Learn their secrets and forge your own destiny.",
        unlockRequirements: {
            cultivation: { qi: { level: 250 } },
            realm: "Nascent Soul"
        },
        baseStats: {
            qiBonus: 0.30,
            bodyBonus: 0.10,
            cultivationSpeed: 0.18
        },
        specialEffects: {
            "Stellar Core": "Internal qi becomes as dense as stellar matter",
            "Fusion Mastery": "Can fuse different types of qi together",
            "Nuclear Qi": "Qi regeneration creates fusion reactions",
            "Star Birth": "Can create new sources of qi in the environment",
            "Supernova": "Emergency technique releases devastating qi burst"
        },
        school: "Cosmic Forge Sect",
        element: "Nuclear"
    },
    "Time-Space Mastery Chronicle": {
        id: "time_space_mastery",
        name: "Time-Space Mastery Chronicle",
        rarity: "Legendary",
        category: "Support",
        description: "Grants mastery over the fundamental forces of time and space",
        lore: "Time flows like a river, space bends like cloth. Masters can redirect rivers and reshape cloth.",
        unlockRequirements: {
            cultivation: { qi: { level: 200 } },
            realm: "Soul Transformation"
        },
        baseStats: {
            qiBonus: 0.18,
            bodyBonus: 0.15,
            cultivationSpeed: 0.15
        },
        specialEffects: {
            "Time Dilation": "Can accelerate personal time flow for cultivation",
            "Space Folding": "Travel instantly between known locations",
            "Temporal Anchor": "Can create save points in time",
            "Dimensional Mastery": "Access to multiple dimensional spaces",
            "Causality Shield": "Immune to time-based attacks and paradoxes"
        },
        school: "Chrono-Spatial Academy",
        element: "Time"
    },

    // === MYTHICAL SCRIPTURES ===
    "Origin Codex of Creation": {
        id: "origin_codex_creation",
        name: "Origin Codex of Creation",
        rarity: "Mythical",
        category: "Dual Cultivation",
        description: "Contains the fundamental laws used to create the universe",
        lore: "Before the first word was spoken, before the first light shone, these laws existed. Now they can be yours.",
        unlockRequirements: {
            cultivation: { qi: { level: 500 }, body: { level: 500 } },
            realm: "Void Refining"
        },
        baseStats: {
            qiBonus: 0.35,
            bodyBonus: 0.35,
            cultivationSpeed: 0.25
        },
        specialEffects: {
            "Creation Force": "Can create matter and energy from void",
            "Universal Laws": "Understanding of all fundamental forces",
            "Reality Shaping": "Can alter local reality within limits",
            "Existence Mastery": "Control over life and death",
            "Origin Power": "All other techniques become more effective",
            "Creator's Authority": "Command over lower cultivation levels"
        },
        school: "Primordial Origin",
        element: "Creation"
    },
    "Akashic Records Interface": {
        id: "akashic_records",
        name: "Akashic Records Interface",
        rarity: "Mythical",
        category: "Support",
        description: "Provides access to the universal repository of all knowledge",
        lore: "Every thought, every action, every possibility is recorded in the Akashic Records. Now you can read them.",
        unlockRequirements: {
            cultivation: { qi: { level: 400 } },
            realm: "Body Integration"
        },
        baseStats: {
            qiBonus: 0.25,
            bodyBonus: 0.20,
            cultivationSpeed: 0.20
        },
        specialEffects: {
            "All Knowledge": "Instantly learn any technique you encounter",
            "Past Sight": "Can view historical events and learn from them",
            "Future Glimpse": "Occasionally see possible future outcomes",
            "Universal Translation": "Understand all languages and scripts",
            "Memory Palace": "Perfect recall of all experiences",
            "Wisdom of Ages": "Access to cultivation advice from ancient masters"
        },
        school: "Akashic Library",
        element: "Knowledge"
    }
};

// Gacha pool definitions with balanced rates
const GACHA_POOLS = {
    "Standard": {
        id: "standard",
        name: "Standard Scripture Pool",
        description: "The basic pool containing all standard scriptures",
        cost: { jade: 100 },
        guaranteedRarity: null,
        pitySystem: {
            softPity: 75,
            hardPity: 90,
            legendaryPity: 180
        },
        rateModifiers: {
            "Common": 1.0,
            "Uncommon": 1.0,
            "Rare": 1.0,
            "Epic": 1.0,
            "Legendary": 1.0,
            "Mythical": 0.5 // Reduced chance for mythical
        },
        availableScriptures: "all"
    },
    "Premium": {
        id: "premium",
        name: "Premium Scripture Pool",
        description: "Enhanced rates for higher rarity scriptures",
        cost: { crystals: 50 },
        guaranteedRarity: "Rare",
        pitySystem: {
            softPity: 50,
            hardPity: 70,
            legendaryPity: 140
        },
        rateModifiers: {
            "Common": 0.6,
            "Uncommon": 0.8,
            "Rare": 1.3,
            "Epic": 1.5,
            "Legendary": 2.0,
            "Mythical": 1.0
        },
        availableScriptures: "all"
    },
    "Qi Focus": {
        id: "qi_focus",
        name: "Qi Technique Focus",
        description: "Increased chances for qi-focused techniques",
        cost: { jade: 150 },
        guaranteedRarity: "Uncommon",
        pitySystem: {
            softPity: 60,
            hardPity: 80,
            legendaryPity: 160
        },
        categoryBonus: {
            "Qi Technique": 3.0,
            "Dual Cultivation": 1.2,
            "Body Technique": 0.3,
            "Support": 0.7
        },
        availableScriptures: "filtered"
    },
    "Body Focus": {
        id: "body_focus",
        name: "Body Technique Focus",
        description: "Increased chances for body-focused techniques",
        cost: { jade: 150 },
        guaranteedRarity: "Uncommon",
        pitySystem: {
            softPity: 60,
            hardPity: 80,
            legendaryPity: 160
        },
        categoryBonus: {
            "Body Technique": 3.0,
            "Dual Cultivation": 1.2,
            "Qi Technique": 0.3,
            "Support": 0.7
        },
        availableScriptures: "filtered"
    },
    "Event Limited": {
        id: "event_limited",
        name: "Limited Time Event",
        description: "Special event pool with exclusive scriptures",
        cost: { crystals: 75 },
        guaranteedRarity: "Epic",
        pitySystem: {
            softPity: 40,
            hardPity: 60,
            legendaryPity: 120
        },
        rateModifiers: {
            "Common": 0.3,
            "Uncommon": 0.5,
            "Rare": 0.8,
            "Epic": 2.0,
            "Legendary": 3.0,
            "Mythical": 2.0
        },
        availableScriptures: "event",
        timeLimit: true
    }
};

// Scripture set bonuses for synergy system
const SCRIPTURE_SETS = {
    "Elemental Mastery": {
        id: "elemental_mastery",
        name: "Elemental Mastery Set",
        description: "Mastery over the classical elements",
        requiredScriptures: {
            elements: ["Water", "Fire", "Earth", "Air", "Metal"]
        },
        setBonus: {
            2: { elementalDamage: 0.15, elementalResistance: 0.10 },
            3: { elementalDamage: 0.25, elementalResistance: 0.20, cultivationSpeed: 0.10 },
            5: { elementalDamage: 0.50, elementalResistance: 0.35, cultivationSpeed: 0.20, elementalMastery: true }
        }
    },
    "Ancient Wisdom": {
        id: "ancient_wisdom",
        name: "Ancient Wisdom Set",
        description: "Knowledge passed down from ancient masters",
        requiredScriptures: {
            schools: ["Ancient Dao Academy", "Ancient Dao Sect", "Primordial Origin"]
        },
        setBonus: {
            2: { cultivationSpeed: 0.20, breakthroughChance: 0.10 },
            3: { cultivationSpeed: 0.35, breakthroughChance: 0.20, experienceBonus: 0.25 }
        }
    },
    "Dragon Heritage": {
        id: "dragon_heritage",
        name: "Dragon Heritage Set",
        description: "Power of the ancient dragon bloodlines",
        requiredScriptures: {
            keywords: ["Dragon", "Primal", "Ancient"]
        },
        setBonus: {
            2: { physicalPower: 0.30, qi: 0.15 },
            3: { physicalPower: 0.50, qi: 0.25, dragonAura: true }
        }
    },
    "Cosmic Understanding": {
        id: "cosmic_understanding",
        name: "Cosmic Understanding Set",
        description: "Comprehension of universal forces",
        requiredScriptures: {
            elements: ["Light", "Void", "Time", "Space", "Nuclear"]
        },
        setBonus: {
            2: { cosmicAffinity: 0.20, realityStability: 0.15 },
            3: { cosmicAffinity: 0.35, realityStability: 0.25, universalLaws: 0.15 },
            4: { cosmicAffinity: 0.55, realityStability: 0.40, universalLaws: 0.30, cosmicMastery: true }
        }
    }
};

// Enhancement formulas and mechanics
const ENHANCEMENT_FORMULAS = {
    // Calculate enhancement cost
    enhancementCost: (scripture, targetLevel) => {
        const rarity = SCRIPTURE_RARITIES[scripture.rarity];
        const currentLevel = scripture.level || 1;
        let totalCost = { jade: 0, crystals: 0 };

        for (let level = currentLevel; level < targetLevel; level++) {
            const levelCost = Math.floor(rarity.enhancementCost.baseJade * Math.pow(rarity.enhancementCost.multiplier, level));
            totalCost.jade += levelCost;

            // Crystals required at higher levels
            if (level > 20) {
                totalCost.crystals += Math.floor(levelCost / 100);
            }
        }

        return totalCost;
    },

    // Calculate scripture power at given level
    scripturepower: (scripture, level = null) => {
        const currentLevel = level || scripture.level || 1;
        const rarity = SCRIPTURE_RARITIES[scripture.rarity];
        const basePower = rarity.basePower;

        // Power grows exponentially with level
        const levelMultiplier = Math.pow(1.1, currentLevel - 1);

        // Awakening bonus
        const awakeningBonus = scripture.awakening ? 1.5 : 1.0;

        return Math.floor(basePower * levelMultiplier * awakeningBonus);
    },

    // Calculate stat bonuses from scripture
    calculateStatBonus: (scripture, level = null) => {
        const currentLevel = level || scripture.level || 1;
        const rarity = SCRIPTURE_RARITIES[scripture.rarity];
        const category = SCRIPTURE_CATEGORIES[scripture.category];
        const scriptureData = SCRIPTURE_DATABASE[scripture.name];

        if (!scriptureData) return { qi: 0, body: 0, cultivation: 0 };

        const baseBonus = {
            qi: scriptureData.baseStats.qiBonus || 0,
            body: scriptureData.baseStats.bodyBonus || 0,
            cultivation: scriptureData.baseStats.cultivationSpeed || 0
        };

        // Apply level scaling
        const levelMultiplier = 1 + (currentLevel - 1) * 0.05;

        // Apply rarity multiplier
        const rarityMultiplier = {
            qi: rarity.statBonus.qi,
            body: rarity.statBonus.body,
            cultivation: rarity.statBonus.cultivation
        };

        // Apply category focus
        const categoryMultiplier = category.statBonus;

        // Calculate final bonuses
        const finalBonus = {
            qi: baseBonus.qi * levelMultiplier * rarityMultiplier.qi * categoryMultiplier.qi,
            body: baseBonus.body * levelMultiplier * rarityMultiplier.body * categoryMultiplier.body,
            cultivation: baseBonus.cultivation * levelMultiplier * rarityMultiplier.cultivation * categoryMultiplier.cultivation
        };

        return finalBonus;
    },

    // Calculate awakening requirements
    awakeningRequirements: (scripture) => {
        const rarity = SCRIPTURE_RARITIES[scripture.rarity];
        const levelRequirement = Math.floor(rarity.maxLevel * 0.5);

        return {
            level: levelRequirement,
            cost: rarity.awakeningCost,
            materials: {
                awakening_stone: 1,
                essence_of_cultivation: rarity.id === 'common' ? 5 : rarity.id === 'uncommon' ? 10 : 25
            }
        };
    }
};

// Export all data structures
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SCRIPTURE_RARITIES,
        SCRIPTURE_CATEGORIES,
        SCRIPTURE_DATABASE,
        GACHA_POOLS,
        SCRIPTURE_SETS,
        ENHANCEMENT_FORMULAS
    };
} else if (typeof window !== 'undefined') {
    window.SCRIPTURE_RARITIES = SCRIPTURE_RARITIES;
    window.SCRIPTURE_CATEGORIES = SCRIPTURE_CATEGORIES;
    window.SCRIPTURE_DATABASE = SCRIPTURE_DATABASE;
    window.GACHA_POOLS = GACHA_POOLS;
    window.SCRIPTURE_SETS = SCRIPTURE_SETS;
    window.ENHANCEMENT_FORMULAS = ENHANCEMENT_FORMULAS;
}