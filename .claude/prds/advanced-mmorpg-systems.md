---
name: Advanced-MMORPG-Systems
description: Comprehensive monster hunting, crafting, trading, and monetization systems for idle cultivation game
status: draft
created: 2025-09-17T00:00:00.000Z
updated: 2025-09-17T00:00:00.000Z
---

# Advanced MMORPG Systems: Comprehensive Game Expansion

## Executive Summary

Transform the idle cultivation game into a full-featured MMORPG with PvE monster hunting, interdependent crafting systems, player trading, scheduled boss events, VIP progression, and comprehensive monetization. All systems unified under Combat Power (CP) as the universal measurement metric.

---

## 1. Combat Power (CP) Universal System

### **CP as Universal Measurement**
```typescript
interface CombatPower {
  totalCP: number;                    // Overall power rating
  breakdown: {
    baseCP: number;                   // From cultivation levels
    equipmentCP: number;              // From weapons/armor/accessories
    scriptureCP: number;              // From scripture bonuses
    craftingCP: number;               // From crafted items
    vipCP: number;                    // From VIP bonuses
    sectCP: number;                   // From sect buffs
    temporaryCP: number;              // From consumables/buffs
  };
}
```

### **CP Calculation Formula**
```typescript
calculateTotalCP(player: Player): number {
  const baseCP = (player.cultivation.qi.level * 10) +
                 (player.cultivation.body.level * 10) +
                 (player.cultivation.dual.level * 15);

  const equipmentCP = player.equipment.reduce((total, item) => total + item.cp, 0);
  const scriptureCP = player.scriptures.equipped.reduce((total, scripture) => total + scripture.cp, 0);
  const craftingCP = player.craftedItems.reduce((total, item) => total + item.cp, 0);

  // Apply multipliers
  const vipMultiplier = getVIPMultiplier(player.vip.level);
  const sectMultiplier = getSectMultiplier(player.sect.buffs);

  return Math.floor((baseCP + equipmentCP + scriptureCP + craftingCP) * vipMultiplier * sectMultiplier);
}
```

---

## 2. Monster Hunting & PvE System

### **Monster Categories & Zones**

#### **Regular Monsters** (Idle Farming)
```typescript
interface Monster {
  id: string;
  name: string;
  level: number;
  requiredCP: number;
  zone: ZoneType;
  respawnTime: number;          // Seconds
  dropTable: DropTable;
  experience: number;
  spiritCrystals: number;
  rareMaterials: MaterialDrop[];
}

enum ZoneType {
  MORTAL_FOREST = "mortal_forest",           // CP 1-1000
  SPIRIT_MOUNTAINS = "spirit_mountains",     // CP 1000-5000
  DEMON_WASTELAND = "demon_wasteland",       // CP 5000-15000
  CELESTIAL_REALM = "celestial_realm",       // CP 15000-50000
  VOID_TERRITORIES = "void_territories",     // CP 50000+
}
```

#### **Zone Progression System**
```typescript
const ZONE_REQUIREMENTS = {
  [ZoneType.MORTAL_FOREST]: { minCP: 1, maxCP: 1000, unlockRealm: "Body Refinement" },
  [ZoneType.SPIRIT_MOUNTAINS]: { minCP: 1000, maxCP: 5000, unlockRealm: "Qi Condensation" },
  [ZoneType.DEMON_WASTELAND]: { minCP: 5000, maxCP: 15000, unlockRealm: "Foundation" },
  [ZoneType.CELESTIAL_REALM]: { minCP: 15000, maxCP: 50000, unlockRealm: "Core Formation" },
  [ZoneType.VOID_TERRITORIES]: { minCP: 50000, maxCP: 999999, unlockRealm: "Nascent Soul" }
};
```

#### **Monster Examples**
```typescript
const MONSTER_DATABASE = {
  // Mortal Forest (CP 1-1000)
  forest_wolf: {
    name: "Forest Wolf",
    level: 5,
    requiredCP: 50,
    dropTable: {
      guaranteed: [{ material: "wolf_pelt", quantity: [1, 3] }],
      rare: [
        { material: "wolf_fang", chance: 0.15, quantity: 1 },
        { material: "spirit_essence", chance: 0.05, quantity: 1 }
      ]
    }
  },

  iron_boar: {
    name: "Iron-Hide Boar",
    level: 15,
    requiredCP: 150,
    dropTable: {
      guaranteed: [{ material: "boar_hide", quantity: [2, 4] }],
      rare: [
        { material: "iron_bristle", chance: 0.20, quantity: [1, 2] },
        { material: "earth_crystal", chance: 0.08, quantity: 1 }
      ]
    }
  },

  // Spirit Mountains (CP 1000-5000)
  mountain_tiger: {
    name: "Spirit Mountain Tiger",
    level: 35,
    requiredCP: 1500,
    dropTable: {
      guaranteed: [{ material: "tiger_bone", quantity: [1, 2] }],
      rare: [
        { material: "spirit_tiger_core", chance: 0.12, quantity: 1 },
        { material: "mountain_jade", chance: 0.06, quantity: 1 }
      ]
    }
  },

  // Demon Wasteland (CP 5000-15000)
  shadow_wraith: {
    name: "Shadow Wraith",
    level: 60,
    requiredCP: 8000,
    dropTable: {
      guaranteed: [{ material: "shadow_essence", quantity: [2, 3] }],
      rare: [
        { material: "wraith_core", chance: 0.10, quantity: 1 },
        { material: "void_crystal", chance: 0.04, quantity: 1 }
      ]
    }
  }
};
```

### **Idle Hunting Mechanics**
```typescript
interface HuntingSession {
  playerId: string;
  zone: ZoneType;
  targetMonster: string;
  startTime: Date;
  duration: number;              // Hours
  efficiency: number;            // Based on CP vs Monster requirement
  boosts: {
    vipBonus: number;           // VIP hunting speed bonus
    sectBonus: number;          // Sect hunting buffs
    consumables: number;        // Temporary boosts
  };
}

function calculateHuntingRewards(session: HuntingSession): HuntingRewards {
  const monster = MONSTER_DATABASE[session.targetMonster];
  const killsPerHour = Math.max(1, Math.floor(session.efficiency * 10));
  const totalKills = killsPerHour * session.duration;

  const rewards = {
    materials: {},
    experience: totalKills * monster.experience,
    spiritCrystals: totalKills * monster.spiritCrystals
  };

  // Apply drop table calculations
  for (let i = 0; i < totalKills; i++) {
    processDropTable(monster.dropTable, rewards.materials);
  }

  // Apply all bonuses
  applyHuntingBonuses(rewards, session.boosts);

  return rewards;
}
```

---

## 3. Interdependent Crafting System

### **Four Crafting Professions**

#### **Blacksmithing** (Weapons & Armor)
```typescript
interface BlacksmithRecipe {
  id: string;
  name: string;
  tier: number;                    // 1-10 tiers
  requiredLevel: number;           // Blacksmith profession level
  materials: {
    primary: { material: string; quantity: number }[];     // Ores, metals
    secondary: { material: string; quantity: number }[];   // From other professions
    catalyst: { material: string; quantity: number }[];    // Rare materials
  };
  craftingTime: number;           // Minutes
  successRate: number;            // Base success rate
  resultCP: number;               // Combat Power of crafted item
  durability: number;             // Item longevity
}

const BLACKSMITH_RECIPES = {
  iron_sword_t1: {
    name: "Iron Sword (Tier 1)",
    tier: 1,
    requiredLevel: 1,
    materials: {
      primary: [{ material: "iron_ore", quantity: 5 }],
      secondary: [{ material: "spirit_oil", quantity: 1 }],    // From Alchemy
      catalyst: [{ material: "flame_crystal", quantity: 1 }]
    },
    craftingTime: 30,
    successRate: 0.85,
    resultCP: 50,
    durability: 100
  },

  spirit_armor_t3: {
    name: "Spirit-Forged Armor (Tier 3)",
    tier: 3,
    requiredLevel: 25,
    materials: {
      primary: [
        { material: "spirit_steel", quantity: 8 },
        { material: "mithril_ore", quantity: 3 }
      ],
      secondary: [
        { material: "enhancement_rune", quantity: 2 },        // From Rune Mastery
        { material: "protection_array", quantity: 1 }         // From Array Masters
      ],
      catalyst: [{ material: "dragon_scale", quantity: 1 }]
    },
    craftingTime: 180,
    successRate: 0.65,
    resultCP: 450,
    durability: 500
  }
};
```

#### **Alchemy** (Consumables & Enhancements)
```typescript
interface AlchemyRecipe {
  id: string;
  name: string;
  tier: number;
  requiredLevel: number;
  materials: {
    herbs: { material: string; quantity: number }[];
    minerals: { material: string; quantity: number }[];
    essences: { material: string; quantity: number }[];     // From monster hunting
    components: { material: string; quantity: number }[];   // From other professions
  };
  craftingTime: number;
  successRate: number;
  result: {
    type: "consumable" | "enhancement" | "material";
    effects: AlchemyEffect[];
    duration?: number;             // For temporary effects
  };
}

interface AlchemyEffect {
  type: "cp_boost" | "hunting_speed" | "crafting_success" | "experience_gain";
  value: number;
  duration?: number;
}

const ALCHEMY_RECIPES = {
  spirit_crystal_potion: {
    name: "Spirit Crystal Potion",
    tier: 1,
    requiredLevel: 5,
    materials: {
      herbs: [{ material: "spirit_grass", quantity: 3 }],
      minerals: [{ material: "crystal_dust", quantity: 2 }],
      essences: [{ material: "spirit_essence", quantity: 1 }]
    },
    craftingTime: 45,
    successRate: 0.80,
    result: {
      type: "consumable",
      effects: [{ type: "cp_boost", value: 50, duration: 3600 }]
    }
  },

  weapon_enhancement_oil: {
    name: "Weapon Enhancement Oil",
    tier: 2,
    requiredLevel: 15,
    materials: {
      herbs: [{ material: "fire_lotus", quantity: 2 }],
      minerals: [{ material: "mana_crystal", quantity: 1 }],
      essences: [{ material: "flame_essence", quantity: 2 }],
      components: [{ material: "refined_metal_powder", quantity: 1 }]  // From Blacksmithing
    },
    craftingTime: 90,
    successRate: 0.70,
    result: {
      type: "enhancement",
      effects: [{ type: "weapon_damage", value: 0.15 }]    // 15% damage boost
    }
  }
};
```

#### **Array Masters** (Formations & Buffs)
```typescript
interface ArrayRecipe {
  id: string;
  name: string;
  tier: number;
  requiredLevel: number;
  materials: {
    cores: { material: string; quantity: number }[];        // Energy sources
    inscriptions: { material: string; quantity: number }[]; // From Rune Mastery
    catalysts: { material: string; quantity: number }[];    // Rare materials
    stabilizers: { material: string; quantity: number }[];  // From Alchemy
  };
  craftingTime: number;
  successRate: number;
  result: {
    type: "formation" | "enhancement_array" | "defensive_array";
    effects: ArrayEffect[];
    radius: number;               // Effective range
    duration: number;             // Active time
    cpRequirement: number;        // Minimum CP to activate
  };
}

interface ArrayEffect {
  type: "sect_cp_boost" | "hunting_efficiency" | "crafting_speed" | "cultivation_rate";
  value: number;
  targetType: "individual" | "sect" | "area";
}

const ARRAY_RECIPES = {
  cultivation_formation: {
    name: "Minor Cultivation Formation",
    tier: 1,
    requiredLevel: 10,
    materials: {
      cores: [{ material: "spirit_core", quantity: 4 }],
      inscriptions: [{ material: "basic_rune_stone", quantity: 8 }],
      catalysts: [{ material: "formation_jade", quantity: 1 }],
      stabilizers: [{ material: "stability_potion", quantity: 2 }]
    },
    craftingTime: 120,
    successRate: 0.75,
    result: {
      type: "formation",
      effects: [{ type: "cultivation_rate", value: 0.20, targetType: "area" }],
      radius: 100,
      duration: 7200,             // 2 hours
      cpRequirement: 500
    }
  }
};
```

#### **Rune Mastery** (Enchantments & Inscriptions)
```typescript
interface RuneRecipe {
  id: string;
  name: string;
  tier: number;
  requiredLevel: number;
  materials: {
    stones: { material: string; quantity: number }[];       // Base materials
    inks: { material: string; quantity: number }[];         // From Alchemy
    powers: { material: string; quantity: number }[];       // Monster essences
    focuses: { material: string; quantity: number }[];      // From Array Masters
  };
  craftingTime: number;
  successRate: number;
  result: {
    type: "weapon_rune" | "armor_rune" | "accessory_rune" | "inscription_material";
    effects: RuneEffect[];
    socketTypes: string[];       // Compatible equipment types
    cpBonus: number;
  };
}

interface RuneEffect {
  type: "damage_increase" | "defense_boost" | "speed_enhancement" | "special_ability";
  value: number;
  condition?: string;           // Activation condition
}

const RUNE_RECIPES = {
  sharpness_rune: {
    name: "Rune of Sharpness",
    tier: 1,
    requiredLevel: 8,
    materials: {
      stones: [{ material: "rune_stone", quantity: 2 }],
      inks: [{ material: "spirit_ink", quantity: 3 }],
      powers: [{ material: "blade_essence", quantity: 1 }],
      focuses: [{ material: "focus_crystal", quantity: 1 }]
    },
    craftingTime: 60,
    successRate: 0.80,
    result: {
      type: "weapon_rune",
      effects: [{ type: "damage_increase", value: 0.10 }],
      socketTypes: ["sword", "spear", "blade"],
      cpBonus: 25
    }
  }
};
```

### **Profession Leveling System**
```typescript
interface ProfessionProgress {
  level: number;                 // 1-100 profession level
  experience: number;
  experienceRequired: number;
  specializations: string[];     // Unlocked sub-paths
  bonuses: {
    successRate: number;         // Bonus to crafting success
    speedBonus: number;          // Faster crafting
    qualityChance: number;       // Chance for higher quality results
    materialEfficiency: number;  // Chance to save materials
  };
}

function calculateCraftingSuccess(recipe: Recipe, profession: ProfessionProgress, vipLevel: number): CraftingResult {
  let successRate = recipe.successRate;
  successRate += profession.bonuses.successRate;
  successRate += getVIPCraftingBonus(vipLevel);

  const qualityRoll = Math.random();
  const quality = qualityRoll < profession.bonuses.qualityChance ? "superior" : "normal";

  return {
    success: Math.random() < successRate,
    quality: quality,
    bonusCP: quality === "superior" ? recipe.resultCP * 0.2 : 0
  };
}
```

---

## 4. Trading System

### **Player-to-Player Trading**
```typescript
interface TradeOffer {
  id: string;
  sellerId: string;
  buyerId?: string;
  item: TradableItem;
  price: {
    currency: "spirit_crystals" | "jade" | "shards";
    amount: number;
  };
  tradeType: "direct_sale" | "auction" | "barter";
  expiryTime: Date;
  status: "active" | "sold" | "expired" | "cancelled";
}

interface TradableItem {
  type: "material" | "equipment" | "consumable" | "rune" | "scripture";
  itemId: string;
  quantity: number;
  quality: "normal" | "superior" | "perfect";
  attributes?: any;              // Item-specific data
}
```

### **Market System**
```typescript
interface MarketSystem {
  // Global marketplace
  listings: TradeOffer[];

  // Price tracking
  priceHistory: {
    [itemId: string]: {
      date: Date;
      averagePrice: number;
      volume: number;
    }[];
  };

  // Search and filter functionality
  searchFilters: {
    itemType: string[];
    priceRange: [number, number];
    quality: string[];
    cpRange: [number, number];
  };
}

// Market fees and taxes
const MARKET_CONFIG = {
  listingFee: 0.02,              // 2% of listing price
  sellTax: 0.05,                 // 5% transaction tax
  vipDiscounts: {
    1: 0.01,                     // VIP 1: 1% discount
    5: 0.03,                     // VIP 5: 3% discount
    10: 0.05                     // VIP 10: 5% discount
  },
  maxListings: {
    base: 5,                     // Base listing slots
    vipBonus: 2                  // +2 per VIP level
  }
};
```

### **Sect Trading & Resource Sharing**
```typescript
interface SectTreasury {
  resources: {
    [material: string]: number;
  };
  contributionTracking: {
    [playerId: string]: {
      deposited: { [material: string]: number };
      withdrawn: { [material: string]: number };
      contributionScore: number;
    };
  };
  permissions: {
    deposit: "all" | "officers" | "leader";
    withdraw: "officers" | "leader";
    limits: {
      [material: string]: {
        dailyLimit: number;
        rankRequirement: string;
      };
    };
  };
}
```

---

## 5. Scheduled Boss Battle System

### **Boss Types & Scheduling**

#### **World Bosses** (Server-Wide Events)
```typescript
interface WorldBoss {
  id: string;
  name: string;
  level: number;
  totalHP: number;
  currentHP: number;
  requiredCP: number;
  phases: BossPhase[];
  rewards: WorldBossRewards;
  schedule: {
    spawnTimes: string[];        // Daily spawn times (UTC)
    duration: number;            // Minutes until despawn
    cooldown: number;            // Hours between spawns
  };
  participants: {
    [playerId: string]: {
      damageDealt: number;
      participation: number;
      lastAttack: Date;
    };
  };
}

interface BossPhase {
  hpThreshold: number;           // HP % when phase activates
  specialAbilities: string[];
  damageMultiplier: number;
  defenseMultiplier: number;
}

const WORLD_BOSS_SCHEDULE = {
  ancient_dragon: {
    name: "Ancient Flame Dragon",
    level: 80,
    totalHP: 10000000,
    requiredCP: 15000,
    schedule: {
      spawnTimes: ["12:00", "20:00"],    // Noon and 8 PM UTC
      duration: 30,
      cooldown: 8
    },
    rewards: {
      participation: {
        spiritCrystals: [500, 2000],     // Based on damage contribution
        jade: [20, 100],
        materials: ["dragon_scale", "flame_core", "ancient_bone"]
      },
      ranking: {
        top1: { jade: 500, title: "Dragonslayer", exclusive_material: "dragon_heart" },
        top10: { jade: 200, exclusive_material: "dragon_blood" },
        top100: { jade: 50, material_bonus: 2.0 }
      }
    }
  }
};
```

#### **Sect Bosses** (Guild Events)
```typescript
interface SectBoss {
  id: string;
  name: string;
  level: number;
  totalHP: number;
  currentHP: number;
  requiredSectLevel: number;
  summonCost: {
    spiritCrystals: number;
    materials: { [material: string]: number };
  };
  duration: number;              // Minutes
  rewards: SectBossRewards;
  cooldown: number;              // Hours
}

const SECT_BOSS_DATABASE = {
  shadow_lord: {
    name: "Shadow Lord of the Abyss",
    level: 60,
    totalHP: 2000000,
    requiredSectLevel: 5,
    summonCost: {
      spiritCrystals: 5000,
      materials: {
        "shadow_essence": 50,
        "void_crystal": 10,
        "summoning_stone": 1
      }
    },
    duration: 45,
    rewards: {
      sectRewards: {
        sectExp: 1000,
        sectBuffUpgrade: true,
        uniqueMaterials: ["shadow_lord_core", "abyssal_fragment"]
      },
      memberRewards: {
        spiritCrystals: [200, 800],
        shards: [10, 40],
        materials: ["shadow_essence", "void_shard"]
      }
    },
    cooldown: 24
  }
};
```

### **Action Combat System for Bosses**
```typescript
interface BossAction {
  playerId: string;
  actionType: "attack" | "defend" | "skill" | "item";
  timestamp: Date;
  cooldown: number;              // Seconds until next action

  // Action specifics
  targetPhase?: number;          // Boss phase targeting
  skillId?: string;              // Skill/ability used
  itemId?: string;               // Consumable used

  // Results
  damage: number;
  effectsApplied: string[];
  cpCost: number;                // CP consumed for action
}

interface BossEngagement {
  bossId: string;
  startTime: Date;
  endTime?: Date;
  participants: {
    [playerId: string]: {
      totalDamage: number;
      actionsUsed: number;
      cpSpent: number;
      survivalTime: number;       // Seconds before elimination
      specialAchievements: string[];
    };
  };
  phases: {
    phaseNumber: number;
    startTime: Date;
    endTime?: Date;
    topDamagers: string[];       // Player IDs
  }[];
}
```

---

## 6. VIP System

### **VIP Level Progression**
```typescript
interface VIPSystem {
  level: number;                 // 0-15 VIP levels
  currentPoints: number;
  pointsToNext: number;
  lifetimeSpent: number;         // Total money spent (USD)
  benefits: VIPBenefits;
  expiryDate?: Date;             // For time-limited VIP
}

interface VIPBenefits {
  // Core bonuses
  cpMultiplier: number;          // 1% per VIP level
  huntingSpeed: number;          // 2% per VIP level
  craftingSuccess: number;       // 1% per VIP level
  gachaRates: number;            // 0.5% per VIP level for rare+

  // Resource bonuses
  spiritCrystalGain: number;     // 5% per VIP level
  offlineTimeBonus: number;      // +1 hour per VIP level (max +15)
  marketSlots: number;           // +2 trade slots per VIP level

  // Exclusive features
  exclusiveShop: boolean;        // VIP 3+
  autoHunting: boolean;          // VIP 5+
  instantCrafting: boolean;      // VIP 8+
  bossRevive: boolean;           // VIP 10+

  // Daily/weekly bonuses
  dailyJade: number;             // 10 jade per VIP level
  weeklyPackages: string[];     // Exclusive item packages
  monthlyBonus: number;          // Large monthly reward
}

const VIP_REQUIREMENTS = {
  1: { spent: 10, benefits: { cpMultiplier: 1.01, huntingSpeed: 1.02, dailyJade: 10 } },
  2: { spent: 30, benefits: { cpMultiplier: 1.02, huntingSpeed: 1.04, dailyJade: 20 } },
  3: { spent: 60, benefits: { cpMultiplier: 1.03, huntingSpeed: 1.06, dailyJade: 30, exclusiveShop: true } },
  5: { spent: 150, benefits: { cpMultiplier: 1.05, huntingSpeed: 1.10, dailyJade: 50, autoHunting: true } },
  8: { spent: 400, benefits: { cpMultiplier: 1.08, huntingSpeed: 1.16, dailyJade: 80, instantCrafting: true } },
  10: { spent: 800, benefits: { cpMultiplier: 1.10, huntingSpeed: 1.20, dailyJade: 100, bossRevive: true } },
  15: { spent: 2000, benefits: { cpMultiplier: 1.15, huntingSpeed: 1.30, dailyJade: 150, allFeatures: true } }
};
```

### **VIP Point Acquisition**
```typescript
interface VIPPointSources {
  directPurchase: {
    packages: {
      [packageId: string]: {
        usdCost: number;
        vipPoints: number;
        bonusItems: Item[];
      };
    };
  };

  monthlyCard: {
    cost: 4.99;                  // USD monthly
    dailyJade: 100;
    vipPoints: 500;              // Monthly total
    duration: 30;                // Days
  };

  battlePass: {
    cost: 9.99;                  // USD seasonal
    vipPoints: 1000;
    exclusiveRewards: Item[];
    duration: 90;                // Days
  };
}
```

---

## 7. Cash Shop & Monetization

### **Currency Structure**
```typescript
interface GameCurrency {
  jade: {
    type: "premium";
    sources: ["purchase", "events", "vip_daily", "achievements"];
    uses: ["gacha", "shop", "speed_ups", "revives"];
  };

  spiritCrystals: {
    type: "soft";
    sources: ["idle_gain", "hunting", "combat", "quests"];
    uses: ["crafting", "sect_activities", "basic_shop"];
  };

  shards: {
    type: "meta";
    sources: ["duplicates", "events", "high_tier_content"];
    uses: ["meta_progression", "exclusive_items", "advanced_upgrades"];
  };

  vipPoints: {
    type: "loyalty";
    sources: ["real_money_purchases"];
    uses: ["vip_level_progression"];
  };
}
```

### **Shop Categories**

#### **Premium Shop** (Jade Currency)
```typescript
const PREMIUM_SHOP = {
  // Gacha & Summoning
  gacha: {
    single_pull: { cost: 100, item: "single_scripture_pull" },
    ten_pull: { cost: 1000, item: "ten_scripture_pull", bonus: "guaranteed_rare" },
    premium_banner: { cost: 150, item: "premium_scripture_pull", rateUp: true }
  },

  // Time Skips & Boosts
  speedUps: {
    cultivation_boost: { cost: 50, effect: "2x_cultivation_1hour" },
    hunting_boost: { cost: 75, effect: "2x_hunting_efficiency_2hours" },
    crafting_boost: { cost: 25, effect: "instant_crafting_5uses" }
  },

  // Exclusive Items
  exclusives: {
    legendary_material_box: { cost: 500, items: ["rare_materials_selection"] },
    cp_boost_potion: { cost: 200, effect: "permanent_cp_boost_100" },
    revival_stone: { cost: 300, effect: "boss_battle_revive" }
  },

  // Slots & Capacity
  expansions: {
    inventory_expansion: { cost: 100, effect: "+20_inventory_slots" },
    market_slots: { cost: 150, effect: "+3_market_listing_slots" },
    auto_hunting_slot: { cost: 250, effect: "+1_auto_hunting_slot" }
  }
};
```

#### **VIP Exclusive Shop**
```typescript
const VIP_SHOP = {
  // VIP 3+ Only
  tier1: {
    enhanced_materials: { cost: 200, vipRequired: 3 },
    rare_cultivation_pills: { cost: 300, vipRequired: 3 },
    sect_development_items: { cost: 400, vipRequired: 3 }
  },

  // VIP 5+ Only
  tier2: {
    legendary_equipment_fragments: { cost: 800, vipRequired: 5 },
    boss_summoning_items: { cost: 600, vipRequired: 5 },
    advanced_runes: { cost: 700, vipRequired: 5 }
  },

  // VIP 10+ Only
  tier3: {
    mythical_artifacts: { cost: 2000, vipRequired: 10 },
    realm_breakthrough_tokens: { cost: 1500, vipRequired: 10 },
    exclusive_titles: { cost: 1000, vipRequired: 10 }
  }
};
```

### **Gacha System Expansion**
```typescript
interface GachaSystem {
  banners: {
    standard: {
      rates: { legendary: 0.02, epic: 0.06, rare: 0.12, uncommon: 0.25, common: 0.55 };
      pity: { soft: 20, hard: 80 };
      cost: { single: 100, ten: 1000 };
    };

    premium: {
      rates: { legendary: 0.03, epic: 0.09, rare: 0.18, uncommon: 0.25, common: 0.45 };
      pity: { soft: 15, hard: 60 };
      cost: { single: 150, ten: 1500 };
      features: ["guaranteed_epic_per_10", "exclusive_items"];
    };

    limited: {
      rates: { legendary: 0.05, epic: 0.10, rare: 0.20, uncommon: 0.25, common: 0.40 };
      pity: { soft: 10, hard: 40 };
      cost: { single: 200, ten: 2000 };
      duration: "7_days";
      features: ["exclusive_legendary", "time_limited"];
    };
  };

  // Guaranteed mechanics
  guarantees: {
    epic_per_10: true,           // Every 10-pull guarantees epic+
    legendary_pity: true,        // Hard pity system
    vip_rate_bonus: true,        // VIP bonus rates
    first_time_bonus: true       // 2x rates for first purchase
  };
}
```

### **Monetization Packages**
```typescript
const MONETIZATION_PACKAGES = {
  // Starter Packages
  beginner_pack: {
    cost: 0.99,
    oneTime: true,
    contents: {
      jade: 500,
      spiritCrystals: 1000,
      materials: ["starter_material_box"],
      bonuses: ["7_day_cultivation_boost"]
    }
  },

  // Growth Packages
  growth_fund: {
    cost: 19.99,
    oneTime: true,
    unlocks: "achievement_based_rewards",
    totalValue: 50,              // USD equivalent value
    requirements: ["reach_foundation_realm", "complete_100_hunts", "craft_epic_item"]
  },

  // Subscription Services
  monthly_card: {
    cost: 4.99,
    duration: 30,
    dailyRewards: {
      jade: 100,
      spiritCrystals: 500,
      vipPoints: 15
    },
    bonuses: ["daily_auto_hunt", "2x_offline_progress"]
  },

  battle_pass: {
    cost: 9.99,
    duration: 90,
    levels: 100,
    rewards: {
      free: ["basic_materials", "spirit_crystals", "small_jade_amounts"],
      premium: ["exclusive_scriptures", "legendary_materials", "large_jade_amounts", "cosmetics"]
    }
  },

  // Whale Packages
  supreme_cultivator: {
    cost: 99.99,
    contents: {
      jade: 15000,
      vipPoints: 10000,
      exclusiveItems: ["mythical_scripture", "legendary_equipment_set"],
      bonuses: ["30_day_premium_benefits", "exclusive_title"]
    }
  }
};
```

---

## 8. System Integration & Balance

### **Cross-System Dependencies**
```typescript
interface SystemIntegration {
  // CP affects all systems
  cpGating: {
    hunting: "monster_cp_requirements",
    crafting: "recipe_cp_minimums",
    bosses: "participation_thresholds",
    trading: "high_value_item_restrictions"
  };

  // Material flow between systems
  materialSources: {
    hunting: ["basic_materials", "essences", "rare_drops"],
    crafting: ["refined_materials", "components", "enhancement_items"],
    bosses: ["unique_materials", "high_tier_resources"],
    events: ["limited_materials", "seasonal_items"]
  };

  // Economic balance
  economicSinks: {
    crafting: "material_consumption",
    trading: "market_fees",
    bosses: "participation_costs",
    vip: "premium_purchases"
  };
}
```

### **Daily/Weekly Content Loop**
```typescript
interface ContentLoop {
  daily: {
    hunting: "complete_hunting_sessions",
    crafting: "craft_daily_items",
    trading: "market_transactions",
    bosses: "world_boss_participation",
    vip: "claim_daily_benefits"
  };

  weekly: {
    sectBosses: "participate_in_sect_boss",
    marketReset: "refresh_exclusive_items",
    rankings: "calculate_weekly_rankings",
    events: "special_event_content"
  };

  monthly: {
    seasonReset: "new_battle_pass_season",
    vipRewards: "monthly_vip_packages",
    metaProgression: "unlock_new_content_tiers"
  };
}
```

This comprehensive system creates a deep, interconnected MMORPG experience where all systems support each other through the universal CP measurement, creating multiple progression paths and monetization opportunities while maintaining engaging gameplay loops.