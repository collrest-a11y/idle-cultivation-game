---
name: CP-Progression-Systems
description: Comprehensive Combat Power progression systems unlocked through cultivation advancement
status: draft
created: 2025-09-17T00:00:00.000Z
updated: 2025-09-17T00:00:00.000Z
---

# CP Progression Systems: Cultivation-Themed Power Advancement

## Executive Summary

Design comprehensive Combat Power progression systems that unlock as players advance through cultivation realms. Each system provides unique CP bonuses while maintaining thematic consistency with xianxia/wuxia cultivation novels. Systems include traditional equipment (mounts, wings, accessories, runes) and cultivation-specific mechanics (meridians, dantian, bloodlines, pills, constellations).

---

## System Unlock Timeline by Cultivation Realm

```typescript
interface RealmUnlocks {
  [realm: string]: {
    systems: string[];
    cpBase: number;
    features: string[];
  };
}

const CULTIVATION_UNLOCKS = {
  "Body Refinement": {
    systems: ["basic_equipment", "accessories_tier1"],
    cpBase: 100,
    features: ["equipment_slots", "basic_accessories"]
  },
  "Qi Condensation": {
    systems: ["rune_system", "meridian_opening"],
    cpBase: 500,
    features: ["weapon_runes", "meridian_points_12"]
  },
  "Foundation": {
    systems: ["mount_system", "dantian_expansion", "pill_system"],
    cpBase: 2000,
    features: ["spirit_mounts", "dantian_cultivation", "pill_refinement"]
  },
  "Core Formation": {
    systems: ["wing_system", "bloodline_awakening", "accessories_tier2"],
    cpBase: 8000,
    features: ["flight_capabilities", "bloodline_powers", "advanced_accessories"]
  },
  "Nascent Soul": {
    systems: ["soul_cultivation", "constellation_map", "divine_runes"],
    cpBase: 25000,
    features: ["soul_manifestation", "star_charts", "legendary_runes"]
  },
  "Soul Transformation": {
    systems: ["immortal_physique", "dao_comprehension", "cosmic_wings"],
    cpBase: 100000,
    features: ["immortal_body", "dao_insights", "transcendent_forms"]
  }
};
```

---

## 1. Mount System (Unlocked: Foundation Realm)

### **Mount Categories & Evolution**
```typescript
interface Mount {
  id: string;
  name: string;
  category: MountCategory;
  tier: number;                    // 1-10 tiers
  level: number;                   // 1-100 levels per tier
  experience: number;
  requiredRealm: string;
  cpBonus: number;

  stats: {
    speed: number;                 // Movement speed bonus
    endurance: number;             // Stamina for extended travel
    combat: number;                // Combat CP contribution
    special: number;               // Unique ability strength
  };

  abilities: MountAbility[];
  materials: EvolutionMaterials;
  appearance: MountAppearance;
}

enum MountCategory {
  TERRESTRIAL = "terrestrial",     // Land-based mounts
  AQUATIC = "aquatic",            // Water-based mounts
  AERIAL = "aerial",              // Flying mounts (higher tier)
  SPIRITUAL = "spiritual",        // Energy-based mounts
  LEGENDARY = "legendary",        // Mythical creatures
  DIVINE = "divine"               // Celestial beings
}

const MOUNT_PROGRESSION = {
  // Terrestrial Mounts (Foundation+)
  spirit_wolf: {
    name: "Spirit Wolf",
    category: MountCategory.TERRESTRIAL,
    tier: 1,
    requiredRealm: "Foundation",
    baseCP: 200,
    evolution: {
      tier2: "dire_wolf",
      tier3: "shadow_wolf",
      tier4: "celestial_wolf"
    },
    abilities: [
      { name: "Pack Leader", effect: "10% bonus when hunting in groups" },
      { name: "Spirit Sense", effect: "Detect rare materials nearby" }
    ]
  },

  // Aerial Mounts (Core Formation+)
  cloud_crane: {
    name: "Cloud Crane",
    category: MountCategory.AERIAL,
    tier: 3,
    requiredRealm: "Core Formation",
    baseCP: 800,
    evolution: {
      tier4: "storm_crane",
      tier5: "heaven_crane",
      tier6: "immortal_crane"
    },
    abilities: [
      { name: "Wind Walking", effect: "Bypass terrain obstacles" },
      { name: "Cloud Sight", effect: "Reveal hidden areas from above" }
    ]
  },

  // Legendary Mounts (Nascent Soul+)
  azure_dragon: {
    name: "Azure Dragon Hatchling",
    category: MountCategory.LEGENDARY,
    tier: 5,
    requiredRealm: "Nascent Soul",
    baseCP: 5000,
    evolution: {
      tier6: "young_azure_dragon",
      tier7: "mature_azure_dragon",
      tier8: "ancient_azure_dragon",
      tier9: "sovereign_azure_dragon",
      tier10: "celestial_azure_dragon"
    },
    abilities: [
      { name: "Dragon's Might", effect: "Intimidate lower-tier monsters" },
      { name: "Azure Flames", effect: "Deal damage while traveling" },
      { name: "Storm Call", effect: "Weather manipulation abilities" }
    ]
  }
};
```

### **Mount Cultivation System**
```typescript
interface MountCultivation {
  feedingSystem: {
    materials: {
      "spirit_grass": { expGain: 10, cpBonus: 1 },
      "celestial_fruit": { expGain: 50, cpBonus: 5 },
      "dragon_blood_pill": { expGain: 200, cpBonus: 20 }
    };

    dailyFeeding: {
      maxFeeds: 5,
      vipBonus: 2,                 // +2 feeds per VIP level
      sectBonus: 1                 // Sect stable bonus
    };
  };

  evolution: {
    requirements: {
      level: 100,                  // Max level current tier
      materials: EvolutionMaterials,
      cpThreshold: number,         // Player CP requirement
      questCompletion?: string     // Special evolution quest
    };

    success: {
      baseRate: 0.80,             // 80% base success
      improvementItems: {
        "evolution_stone": 0.10,   // +10% success
        "divine_blessing": 0.15    // +15% success
      }
    };
  };

  bondingSystem: {
    dailyInteraction: {
      riding: { bondGain: 5, cpBonus: 0.01 },
      grooming: { bondGain: 3, appearanceBonus: true },
      training: { bondGain: 8, abilityImprovement: true }
    };

    bondLevels: {
      1: { cpMultiplier: 1.0, abilities: 1 },
      5: { cpMultiplier: 1.1, abilities: 2 },
      10: { cpMultiplier: 1.2, abilities: 3, specialUnlock: true },
      15: { cpMultiplier: 1.3, abilities: 4, evolutionBonus: true },
      20: { cpMultiplier: 1.5, abilities: 5, legendaryForm: true }
    };
  };
}
```

---

## 2. Wing System (Unlocked: Core Formation Realm)

### **Wing Categories & Manifestations**
```typescript
interface Wings {
  id: string;
  name: string;
  category: WingCategory;
  tier: number;                    // 1-12 tiers
  level: number;                   // 1-150 levels per tier
  requiredRealm: string;
  cpBonus: number;

  attributes: {
    flight: number;                // Flight speed and duration
    agility: number;               // Dodge and mobility in combat
    elemental: number;             // Elemental damage bonus
    divine: number;                // Resistance to higher-tier attacks
  };

  featherCount: number;            // Wing feathers for upgrades
  materials: WingMaterials;
  visualEffects: WingEffects;
}

enum WingCategory {
  MORTAL = "mortal",              // Basic cultivator wings
  SPIRIT = "spirit",              // Elemental-infused wings
  DIVINE = "divine",              // Heavenly blessed wings
  DEMON = "demon",                // Dark cultivation wings
  PHOENIX = "phoenix",            // Fire-based legendary wings
  DRAGON = "dragon",              // Wind/storm legendary wings
  CHAOS = "chaos",                // Void/time manipulation wings
  CELESTIAL = "celestial"         // Transcendent wings
}

const WING_PROGRESSION = {
  // Basic Wings (Core Formation)
  wind_feather_wings: {
    name: "Wind Feather Wings",
    category: WingCategory.MORTAL,
    tier: 1,
    requiredRealm: "Core Formation",
    baseCP: 300,
    attributes: { flight: 20, agility: 15, elemental: 5, divine: 0 },
    materials: {
      upgrade: ["wind_essence", "spirit_feather", "cultivation_crystals"],
      evolution: ["storm_core", "celestial_wind", "wing_evolution_stone"]
    }
  },

  // Elemental Wings (Nascent Soul)
  phoenix_flame_wings: {
    name: "Phoenix Flame Wings",
    category: WingCategory.PHOENIX,
    tier: 6,
    requiredRealm: "Nascent Soul",
    baseCP: 3000,
    attributes: { flight: 80, agility: 60, elemental: 120, divine: 40 },
    specialAbilities: [
      { name: "Phoenix Rebirth", effect: "Revive with 50% HP once per day" },
      { name: "Flame Trail", effect: "Leave damaging fire behind while flying" },
      { name: "Solar Charge", effect: "Gain CP during daylight hours" }
    ]
  },

  // Transcendent Wings (Soul Transformation)
  celestial_void_wings: {
    name: "Celestial Void Wings",
    category: WingCategory.CELESTIAL,
    tier: 12,
    requiredRealm: "Soul Transformation",
    baseCP: 25000,
    attributes: { flight: 200, agility: 180, elemental: 300, divine: 250 },
    specialAbilities: [
      { name: "Void Step", effect: "Teleport through space instantly" },
      { name: "Time Dilation", effect: "Slow time during combat" },
      { name: "Celestial Judgment", effect: "Massive AoE divine damage" }
    ]
  }
};
```

### **Wing Cultivation Mechanics**
```typescript
interface WingCultivation {
  featherGathering: {
    sources: {
      "daily_flight": { feathers: 5, cpGain: 10 },
      "aerial_combat": { feathers: 15, cpGain: 25 },
      "sky_meditation": { feathers: 8, cpGain: 20 },
      "wind_trials": { feathers: 30, cpGain: 50 }
    };

    wingFeatherTypes: {
      "wind_feather": { commonDrop: true, basicUpgrades: true },
      "flame_feather": { elementalWings: true, fireBonus: true },
      "void_feather": { legendaryWings: true, transcendentPower: true },
      "celestial_feather": { divineWings: true, ultimatePower: true }
    };
  };

  flightTraining: {
    courses: {
      "agility_course": {
        duration: 30,
        rewards: { agility: 2, feathers: 3 },
        requirements: { cpMin: 5000 }
      },
      "speed_trial": {
        duration: 60,
        rewards: { flight: 5, feathers: 8 },
        requirements: { cpMin: 15000 }
      },
      "divine_ascension": {
        duration: 180,
        rewards: { divine: 10, feathers: 20 },
        requirements: { cpMin: 50000, wingTier: 8 }
      }
    };
  };

  wingTransformation: {
    evolutionPath: {
      mortal: ["spirit", "divine"],
      spirit: ["phoenix", "dragon", "demon"],
      divine: ["celestial"],
      phoenix: ["celestial"],
      dragon: ["chaos", "celestial"],
      chaos: ["celestial"]
    };

    transformationRequirements: {
      materials: WingEvolutionMaterials,
      trials: string[],             // Required completion of specific trials
      cpThreshold: number,
      timeGate: number              // Hours of wing cultivation
    };
  };
}
```

---

## 3. Accessories System (Progressive Unlocks)

### **Accessory Categories & Slots**
```typescript
interface AccessorySystem {
  slots: {
    rings: {
      count: number;               // Unlocks with realm advancement
      maxCount: 10;                // End-game maximum
      unlockSchedule: {
        "Body Refinement": 2,
        "Qi Condensation": 4,
        "Foundation": 6,
        "Core Formation": 8,
        "Nascent Soul": 10
      };
    };

    amulets: {
      count: number;
      maxCount: 5;
      unlockSchedule: {
        "Qi Condensation": 1,
        "Foundation": 2,
        "Core Formation": 3,
        "Nascent Soul": 4,
        "Soul Transformation": 5
      };
    };

    talismans: {
      count: number;
      maxCount: 8;
      unlockSchedule: {
        "Foundation": 2,
        "Core Formation": 4,
        "Nascent Soul": 6,
        "Soul Transformation": 8
      };
    };

    charms: {
      count: number;
      maxCount: 6;
      unlockSchedule: {
        "Core Formation": 2,
        "Nascent Soul": 4,
        "Soul Transformation": 6
      };
    };
  };
}

interface Accessory {
  id: string;
  name: string;
  type: AccessoryType;
  tier: number;                    // 1-15 tiers
  level: number;                   // 1-200 levels
  cpBonus: number;

  primaryStat: {
    type: string;                  // "attack", "defense", "speed", "cultivation"
    value: number;
  };

  secondaryStats: {
    [stat: string]: number;
  };

  setBonus?: {
    setName: string;
    requiredPieces: number;
    bonuses: SetBonus[];
  };

  enchantments: Enchantment[];
  materials: AccessoryMaterials;
}

enum AccessoryType {
  // Rings (Power & Combat)
  POWER_RING = "power_ring",
  DEFENSE_RING = "defense_ring",
  SPEED_RING = "speed_ring",
  CULTIVATION_RING = "cultivation_ring",

  // Amulets (Major Bonuses)
  LIFE_AMULET = "life_amulet",
  MANA_AMULET = "mana_amulet",
  PROTECTION_AMULET = "protection_amulet",
  FORTUNE_AMULET = "fortune_amulet",

  // Talismans (Elemental & Special)
  FIRE_TALISMAN = "fire_talisman",
  WATER_TALISMAN = "water_talisman",
  EARTH_TALISMAN = "earth_talisman",
  AIR_TALISMAN = "air_talisman",
  VOID_TALISMAN = "void_talisman",

  // Charms (Utility & Passive)
  EXPERIENCE_CHARM = "experience_charm",
  LUCK_CHARM = "luck_charm",
  RESURRECTION_CHARM = "resurrection_charm",
  TELEPORTATION_CHARM = "teleportation_charm"
}
```

### **Accessory Set Systems**
```typescript
const ACCESSORY_SETS = {
  // Low-Tier Sets (Foundation Realm)
  spirit_guardian_set: {
    name: "Spirit Guardian Set",
    pieces: ["guardian_ring", "protection_amulet", "earth_talisman"],
    bonuses: {
      2: { cpBonus: 200, defenseBonus: 0.15 },
      3: { cpBonus: 500, damageReduction: 0.10, healingBonus: 0.20 }
    }
  },

  // Mid-Tier Sets (Nascent Soul)
  celestial_storm_set: {
    name: "Celestial Storm Set",
    pieces: [
      "storm_ring", "lightning_ring", "celestial_amulet",
      "air_talisman", "void_talisman", "speed_charm"
    ],
    bonuses: {
      2: { cpBonus: 1000, lightningDamage: 0.25 },
      4: { cpBonus: 2500, attackSpeed: 0.30, criticalChance: 0.15 },
      6: { cpBonus: 5000, stormMastery: true, chainLightning: true }
    }
  },

  // End-Game Sets (Soul Transformation)
  immortal_dao_set: {
    name: "Immortal Dao Set",
    pieces: [
      "dao_ring_yin", "dao_ring_yang", "harmony_amulet", "balance_amulet",
      "creation_talisman", "destruction_talisman", "time_charm", "space_charm"
    ],
    bonuses: {
      2: { cpBonus: 5000, daoInsight: 0.20 },
      4: { cpBonus: 12000, realityManipulation: 0.15 },
      6: { cpBonus: 25000, timeControl: true },
      8: { cpBonus: 50000, immortalBody: true, daoMastery: true }
    }
  }
};
```

---

## 4. Enhanced Rune System

### **Rune Categories & Socket System**
```typescript
interface RuneSystem {
  socketTypes: {
    weapon: { maxSockets: 6, unlockProgression: RealmUnlocks },
    armor: { maxSockets: 8, unlockProgression: RealmUnlocks },
    accessory: { maxSockets: 4, unlockProgression: RealmUnlocks },
    mount: { maxSockets: 3, unlockProgression: RealmUnlocks },
    wings: { maxSockets: 5, unlockProgression: RealmUnlocks }
  };

  runeCategories: {
    combat: RuneType[],           // Damage, defense, speed
    cultivation: RuneType[],      // Experience, breakthrough
    utility: RuneType[],          // Resource gathering, luck
    elemental: RuneType[],        // Fire, water, earth, air, void
    divine: RuneType[],          // Transcendent powers
    set: RuneType[]              // Set-based bonuses
  };
}

interface Rune {
  id: string;
  name: string;
  category: RuneCategory;
  tier: number;                    // 1-20 tiers
  level: number;                   // 1-300 levels
  cpBonus: number;

  primaryEffect: {
    type: string;
    value: number;
    scaling: number;               // Per level scaling
  };

  secondaryEffects: RuneEffect[];

  setInformation?: {
    setName: string;
    setBonus: SetBonusEffect[];
  };

  restrictions: {
    socketType: string[];
    realmRequirement: string;
    cpRequirement: number;
  };
}

const RUNE_EXAMPLES = {
  // Combat Runes
  berserker_rage_rune: {
    name: "Berserker's Rage Rune",
    category: "combat",
    tier: 8,
    cpBonus: 800,
    primaryEffect: { type: "damage_increase", value: 0.25, scaling: 0.01 },
    secondaryEffects: [
      { type: "attack_speed", value: 0.15 },
      { type: "life_steal", value: 0.08 }
    ],
    restrictions: { socketType: ["weapon"], realmRequirement: "Core Formation" }
  },

  // Cultivation Runes
  enlightenment_rune: {
    name: "Enlightenment Rune",
    category: "cultivation",
    tier: 12,
    cpBonus: 1500,
    primaryEffect: { type: "cultivation_speed", value: 0.50, scaling: 0.02 },
    secondaryEffects: [
      { type: "breakthrough_chance", value: 0.20 },
      { type: "wisdom_gain", value: 0.30 }
    ],
    restrictions: { socketType: ["accessory"], realmRequirement: "Nascent Soul" }
  },

  // Divine Runes
  celestial_authority_rune: {
    name: "Celestial Authority Rune",
    category: "divine",
    tier: 20,
    cpBonus: 10000,
    primaryEffect: { type: "divine_power", value: 1.0, scaling: 0.05 },
    secondaryEffects: [
      { type: "fear_immunity", value: 1.0 },
      { type: "lower_realm_dominance", value: 0.75 },
      { type: "heavenly_protection", value: 0.40 }
    ],
    setInformation: {
      setName: "Seven Heavens Authority",
      setBonus: [
        { pieces: 3, effect: "heaven_gate_access" },
        { pieces: 5, effect: "celestial_court_member" },
        { pieces: 7, effect: "heaven_emperor_blessing" }
      ]
    },
    restrictions: {
      socketType: ["weapon", "armor", "accessory"],
      realmRequirement: "Soul Transformation",
      cpRequirement: 100000
    }
  }
};
```

---

## 5. Cultivation-Specific CP Systems

### **Meridian System (Unlocked: Qi Condensation)**
```typescript
interface MeridianSystem {
  meridianPoints: {
    total: 108,                    // Traditional acupuncture points
    unlocked: number,
    categories: {
      major: { count: 12, cpPerPoint: 50 },      // Major meridians
      minor: { count: 36, cpPerPoint: 25 },      // Minor meridians
      micro: { count: 60, cpPerPoint: 10 }       // Micro meridians
    }
  };

  openingRequirements: {
    materials: { "meridian_opening_pill": 1, "spirit_needles": 2 },
    timeRequired: 3600,            // 1 hour meditation
    successRate: 0.70,             // Base 70% success
    failurePenalty: { hp: 0.10, cultivationDelay: 3600 }
  };

  meridianNetworks: {
    "heart_network": {
      points: ["heart_1", "heart_2", "heart_3", "pericardium_1"],
      bonus: { cpMultiplier: 1.1, lifeForce: 0.20 }
    },
    "liver_network": {
      points: ["liver_1", "liver_2", "liver_3", "gallbladder_1"],
      bonus: { detoxification: 0.30, poisonResistance: 0.50 }
    },
    "complete_circulation": {
      points: "all_major_meridians",
      bonus: { cpMultiplier: 1.5, transcendentInsight: true }
    }
  };
}
```

### **Dantian Cultivation (Unlocked: Foundation Realm)**
```typescript
interface DantianSystem {
  dantianTypes: {
    lower: {
      name: "Lower Dantian (Essence)",
      location: "below_navel",
      unlockRealm: "Foundation",
      capacity: number,            // Energy storage
      cpContribution: number,
      specializations: ["physical_power", "endurance", "vitality"]
    },

    middle: {
      name: "Middle Dantian (Energy)",
      location: "heart_center",
      unlockRealm: "Core Formation",
      capacity: number,
      cpContribution: number,
      specializations: ["spiritual_power", "elemental_control", "healing"]
    },

    upper: {
      name: "Upper Dantian (Spirit)",
      location: "between_eyebrows",
      unlockRealm: "Nascent Soul",
      capacity: number,
      cpContribution: number,
      specializations: ["mental_power", "divine_insight", "soul_manipulation"]
    }
  };

  expansionMethods: {
    meditation: { capacityGain: 10, cpGain: 5, timeRequired: 1800 },
    pillConsumption: { capacityGain: 50, cpGain: 25, materials: "dantian_pills" },
    treasureRefinement: { capacityGain: 200, cpGain: 100, materials: "rare_treasures" }
  };

  harmonyBonus: {
    twoHarmony: { cpMultiplier: 1.2, balanceBonus: 0.15 },
    threeHarmony: { cpMultiplier: 1.8, perfectBalance: true, enlightenmentChance: 0.10 }
  };
}
```

### **Soul Cultivation (Unlocked: Nascent Soul)**
```typescript
interface SoulCultivation {
  soulStages: {
    formation: {
      name: "Soul Formation",
      cpBase: 5000,
      abilities: ["soul_projection", "spiritual_communication"],
      requirements: { realm: "Nascent Soul", meditation: 100 }
    },

    manifestation: {
      name: "Soul Manifestation",
      cpBase: 15000,
      abilities: ["physical_soul_form", "soul_combat", "possession_resistance"],
      requirements: { soulFormation: true, divineInsight: 50 }
    },

    transcendence: {
      name: "Soul Transcendence",
      cpBase: 50000,
      abilities: ["soul_immortality", "reincarnation_control", "karma_manipulation"],
      requirements: { soulManifestation: true, daoComprehension: 100 }
    }
  };

  soulTechniques: {
    "soul_splitting": {
      effect: "Create multiple soul fragments for parallel cultivation",
      cpCost: 1000,
      benefits: { cultivationSpeed: 2.0, multitasking: true }
    },

    "soul_devouring": {
      effect: "Absorb defeated enemies' soul essence",
      cpCost: 2000,
      benefits: { permanentCPGain: true, abilityAbsorption: true },
      risks: { karmaBacklash: true, soulCorruption: 0.10 }
    }
  };
}
```

---

## 6. Constellation/Star Map System (Unlocked: Nascent Soul)

### **Celestial Navigation & Power**
```typescript
interface ConstellationSystem {
  starCharts: {
    northern: {
      constellations: ["great_bear", "dragon", "phoenix", "turtle"],
      theme: "protection_and_wisdom",
      cpBonus: { base: 2000, perStar: 100 }
    },

    southern: {
      constellations: ["fire_bird", "earth_ox", "metal_tiger", "water_snake"],
      theme: "elemental_mastery",
      cpBonus: { base: 2500, perStar: 120 }
    },

    eastern: {
      constellations: ["rising_sun", "dawn_crane", "morning_lotus", "spring_dragon"],
      theme: "growth_and_renewal",
      cpBonus: { base: 1800, perStar: 90 }
    },

    western: {
      constellations: ["setting_moon", "autumn_tiger", "harvest_maiden", "winter_phoenix"],
      theme: "completion_and_transcendence",
      cpBonus: { base: 3000, perStar: 150 }
    },

    central: {
      constellations: ["pole_star", "celestial_emperor", "void_center", "dao_origin"],
      theme: "supreme_authority",
      cpBonus: { base: 5000, perStar: 300 }
    }
  };

  starActivation: {
    requirements: {
      observation: {
        nightMeditation: 7,        // 7 consecutive nights
        astronomicalEvents: 1,     // Witness meteor shower, eclipse, etc.
        celestialAlignment: true   // Stars must be properly aligned
      },

      materials: {
        "star_essence": 10,
        "celestial_crystal": 5,
        "void_stone": 1
      },

      ritual: {
        location: "mountain_peak",
        timeWindow: "midnight_to_dawn",
        weatherRequirement: "clear_sky",
        duration: 14400            // 4 hours
      }
    };

    benefits: {
      permanentCP: number,
      passiveAbilities: string[],
      celestialInsight: number,
      divineProtection: number
    };
  };

  constellationSets: {
    "four_guardians": {
      stars: ["azure_dragon", "white_tiger", "red_phoenix", "black_turtle"],
      bonus: { cpMultiplier: 1.3, elementalImmunity: 0.50 }
    },

    "seven_stars_of_power": {
      stars: ["dubhe", "merak", "phecda", "megrez", "alioth", "mizar", "alkaid"],
      bonus: { cpMultiplier: 1.5, sevenStarStrike: true }
    },

    "twenty_eight_mansions": {
      stars: "all_lunar_mansions",
      bonus: { cpMultiplier: 2.0, celestialEmperorBlessing: true, fateManipulation: true }
    }
  };
}
```

---

## 7. Bloodline/Heritage System (Unlocked: Core Formation)

### **Ancestral Power Awakening**
```typescript
interface BloodlineSystem {
  bloodlineTypes: {
    mortal: {
      name: "Mortal Bloodline",
      cpMultiplier: 1.0,
      awakening: false,
      potential: "limited"
    },

    spiritual: {
      name: "Spiritual Beast Bloodline",
      subtypes: ["wolf", "tiger", "dragon", "phoenix", "turtle"],
      cpMultiplier: 1.2,
      awakening: true,
      abilities: ["beast_transformation", "natural_instincts"]
    },

    elemental: {
      name: "Elemental Bloodline",
      subtypes: ["fire", "water", "earth", "air", "lightning", "ice"],
      cpMultiplier: 1.3,
      awakening: true,
      abilities: ["elemental_mastery", "environmental_adaptation"]
    },

    divine: {
      name: "Divine Bloodline",
      subtypes: ["celestial", "infernal", "void", "time", "space"],
      cpMultiplier: 1.5,
      awakening: true,
      abilities: ["divine_authority", "reality_manipulation"]
    },

    primordial: {
      name: "Primordial Bloodline",
      subtypes: ["creation", "destruction", "chaos", "order"],
      cpMultiplier: 2.0,
      awakening: true,
      abilities: ["universe_shaping", "law_creation"]
    }
  };

  awakeningProcess: {
    triggers: [
      "life_death_experience",
      "extreme_emotion",
      "bloodline_awakening_pill",
      "ancestral_site_meditation",
      "combat_desperation"
    ],

    requirements: {
      realm: "Core Formation",
      cp: 10000,
      specialMaterials: ["bloodline_catalyst", "ancestral_memory_stone"],
      ritualLocation: "family_shrine_or_sacred_ground"
    },

    stages: {
      dormant: { cpBonus: 0, abilities: [] },
      stirring: { cpBonus: 500, abilities: ["enhanced_senses"] },
      awakened: { cpBonus: 2000, abilities: ["bloodline_power_basic"] },
      mature: { cpBonus: 5000, abilities: ["bloodline_power_advanced"] },
      transcendent: { cpBonus: 15000, abilities: ["bloodline_power_ultimate"] }
    }
  };

  bloodlineInheritance: {
    parentBloodlines: {
      both: { inheritanceChance: 0.80, fusionPossible: true },
      one: { inheritanceChance: 0.60, mutationChance: 0.10 },
      none: { inheritanceChance: 0.05, randomAwakening: true }
    },

    generationEffects: {
      first: { purityBonus: 1.0 },
      second: { purityBonus: 0.9, stabilityBonus: 0.1 },
      third: { purityBonus: 0.8, adaptabilityBonus: 0.2 },
      diluted: { purityBonus: 0.5, versatilityBonus: 0.5 }
    }
  };
}
```

---

## 8. Pill Refinement & Consumption System (Unlocked: Foundation Realm)

### **Alchemy Enhancement for CP Progression**
```typescript
interface PillSystem {
  pillCategories: {
    cultivation: {
      purpose: "enhance_cultivation_speed",
      effects: { cultivationSpeed: 0.20, breakthroughChance: 0.15 },
      duration: 3600              // 1 hour
    },

    combat: {
      purpose: "temporary_combat_boost",
      effects: { cpBoost: 1000, combatEfficiency: 0.30 },
      duration: 1800              // 30 minutes
    },

    healing: {
      purpose: "restore_vitality",
      effects: { hpRestore: 1.0, statusCleanse: true },
      duration: 0                 // Instant
    },

    transformation: {
      purpose: "permanent_enhancement",
      effects: { permanentCPGain: 100, attributeBonus: 0.05 },
      duration: 0,                // Permanent
      dailyLimit: 3
    },

    breakthrough: {
      purpose: "assist_realm_advancement",
      effects: { breakthroughSuccess: 0.25, realmStabilization: true },
      duration: 0,
      restrictions: { onePerBreakthrough: true }
    }
  };

  refinementProcess: {
    furnaceTypes: {
      bronze: { successRate: 0.60, maxTier: 3, cpRequirement: 1000 },
      silver: { successRate: 0.70, maxTier: 6, cpRequirement: 5000 },
      gold: { successRate: 0.80, maxTier: 9, cpRequirement: 15000 },
      platinum: { successRate: 0.90, maxTier: 12, cpRequirement: 50000 },
      divine: { successRate: 0.95, maxTier: 15, cpRequirement: 100000 }
    };

    refinementStages: {
      preparation: { duration: 300, failureRisk: 0.05 },
      heating: { duration: 1800, temperatureControl: true },
      fusion: { duration: 3600, materialHarmony: true },
      condensation: { duration: 1200, purityRefinement: true },
      completion: { duration: 600, finalStabilization: true }
    };

    qualityFactors: {
      alchemistLevel: { weight: 0.30 },
      materialQuality: { weight: 0.25 },
      furnaceGrade: { weight: 0.20 },
      refinementTechnique: { weight: 0.15 },
      environmentalFactors: { weight: 0.10 }
    };
  };

  pillGrades: {
    inferior: { effectReduction: 0.50, sideEffectChance: 0.20 },
    common: { effectReduction: 0.80, sideEffectChance: 0.10 },
    superior: { effectReduction: 1.0, sideEffectChance: 0.05 },
    perfect: { effectReduction: 1.20, sideEffectChance: 0.0 },
    divine: { effectReduction: 1.50, sideEffectChance: 0.0, bonusEffects: true }
  };
}

const PILL_RECIPES = {
  // Foundation Realm Pills
  body_strengthening_pill: {
    name: "Body Strengthening Pill",
    tier: 2,
    materials: {
      herbs: ["iron_grass", "bone_flower"],
      minerals: ["strength_crystal"],
      catalysts: ["earth_essence"]
    },
    effects: { permanentCPGain: 50, bodyAttributeBonus: 0.02 },
    refinementTime: 7200,
    difficulty: "moderate"
  },

  // Core Formation Pills
  nascent_soul_condensing_pill: {
    name: "Nascent Soul Condensing Pill",
    tier: 8,
    materials: {
      herbs: ["soul_lotus", "spirit_ginseng"],
      minerals: ["soul_crystal", "void_stone"],
      catalysts: ["nascent_essence", "divine_water"]
    },
    effects: {
      breakthroughSuccess: 0.40,
      soulStabilization: true,
      permanentCPGain: 2000
    },
    refinementTime: 86400,        // 24 hours
    difficulty: "extremely_hard",
    restrictions: { nascent_soul_breakthrough_only: true }
  },

  // Soul Transformation Pills
  immortality_foundation_pill: {
    name: "Immortality Foundation Pill",
    tier: 15,
    materials: {
      herbs: ["immortal_peach", "wisdom_tree_leaf"],
      minerals: ["dao_crystal", "time_essence"],
      catalysts: ["celestial_dew", "karma_seed", "fate_thread"]
    },
    effects: {
      permanentCPGain: 10000,
      immortalityFoundation: true,
      daoInsightBonus: 1.0,
      karmaStabilization: true
    },
    refinementTime: 259200,       // 72 hours
    difficulty: "legendary",
    restrictions: {
      soul_transformation_only: true,
      lifetime_limit: 1
    }
  }
};
```

---

## 9. Additional Thematic CP Systems

### **Dao Comprehension System (Soul Transformation+)**
```typescript
interface DaoSystem {
  daoAspects: {
    "dao_of_sword": {
      cpBonus: 5000,
      abilities: ["sword_intent", "cutting_all_things", "ten_thousand_sword_formation"],
      comprehensionStages: ["glimpse", "understanding", "mastery", "unity"]
    },

    "dao_of_time": {
      cpBonus: 15000,
      abilities: ["time_acceleration", "time_reversal", "temporal_lock"],
      comprehensionStages: ["past_sight", "present_mastery", "future_glimpse", "time_lord"]
    },

    "dao_of_creation": {
      cpBonus: 25000,
      abilities: ["matter_creation", "life_generation", "universe_spawning"],
      comprehensionStages: ["simple_creation", "complex_forms", "living_beings", "world_creation"]
    }
  };

  comprehensionMethods: {
    meditation: { progressGain: 1, timeRequired: 3600 },
    combat: { progressGain: 5, applicationBased: true },
    enlightenment: { progressGain: 50, randomTrigger: true },
    inheritance: { progressGain: 100, masterTransmission: true }
  };
}
```

### **Karma & Merit System**
```typescript
interface KarmaSystem {
  karmaActions: {
    positive: {
      "save_life": { karmaGain: 100, meritGain: 10 },
      "help_junior": { karmaGain: 20, meritGain: 2 },
      "sect_contribution": { karmaGain: 50, meritGain: 5 },
      "charity": { karmaGain: 10, meritGain: 1 }
    },

    negative: {
      "kill_innocent": { karmaLoss: -200, demeritGain: -20 },
      "betray_sect": { karmaLoss: -500, demeritGain: -50 },
      "demonic_cultivation": { karmaLoss: -100, demeritGain: -10 },
      "steal": { karmaLoss: -50, demeritGain: -5 }
    }
  };

  karmaEffects: {
    excellent: { cpMultiplier: 1.3, luckBonus: 0.20, tribulationReduction: 0.30 },
    good: { cpMultiplier: 1.1, luckBonus: 0.10, tribulationReduction: 0.15 },
    neutral: { cpMultiplier: 1.0, luckBonus: 0.0, tribulationReduction: 0.0 },
    bad: { cpMultiplier: 0.9, luckPenalty: -0.10, tribulationIncrease: 0.15 },
    evil: { cpMultiplier: 0.7, luckPenalty: -0.20, heartDemonRisk: 0.30 }
  };
}
```

### **Tribulation System (Major Realm Breakthroughs)**
```typescript
interface TribulationSystem {
  tribulationTypes: {
    "heavenly_thunder": {
      realm: "Core Formation",
      waves: 9,
      cpRequirement: 10000,
      survivalReward: { cpBonus: 2000, thunderResistance: 0.50 }
    },

    "heart_demon": {
      realm: "Nascent Soul",
      waves: 7,
      cpRequirement: 25000,
      survivalReward: { cpBonus: 5000, mentalFortitude: 1.0, illusionImmunity: true }
    },

    "void_tribulation": {
      realm: "Soul Transformation",
      waves: 12,
      cpRequirement: 100000,
      survivalReward: { cpBonus: 20000, voidMastery: true, realityAnchor: true }
    }
  };

  preparationMethods: {
    "tribulation_pills": { survivalBonus: 0.20, costInJade: 1000 },
    "protective_formations": { damageReduction: 0.30, costInMaterials: "high" },
    "sect_support": { powerBonus: 0.15, requiresSectLevel: 5 },
    "karma_protection": { difficultyReduction: 0.25, requiresGoodKarma: 1000 }
  };
}
```

---

## System Integration & Balance

### **CP Contribution by System**
```typescript
interface CPBreakdown {
  base: {
    cultivation: "30%",           // Qi, Body, Dual levels
    equipment: "25%",             // Weapons, armor, accessories
    scriptures: "20%"             // Gacha scriptures
  };

  enhancement: {
    mount: "8%",                  // Mount bonuses
    wings: "8%",                  // Wing system
    runes: "5%",                  // Socket enhancements
    bloodline: "4%"               // Bloodline awakening
  };

  advanced: {
    meridians: "3%",              // Acupuncture points
    dantian: "3%",                // Energy centers
    soul: "3%",                   // Soul cultivation
    constellations: "2%",         // Star chart completion
    dao: "2%",                    // Dao comprehension
    pills: "2%",                  // Permanent pill effects
    karma: "1%"                   // Karma multiplier
  };
}
```

### **Unlock Progression Timeline**
```typescript
const SYSTEM_UNLOCK_TIMELINE = {
  "Body Refinement": ["equipment", "accessories_basic", "pill_consumption"],
  "Qi Condensation": ["runes_basic", "meridians", "crafting_participation"],
  "Foundation": ["mount_system", "dantian_lower", "pill_refinement", "sect_advanced"],
  "Core Formation": ["wings_basic", "bloodline_awakening", "accessories_advanced", "formations"],
  "Nascent Soul": ["soul_cultivation", "constellations", "wings_advanced", "divine_runes"],
  "Soul Transformation": ["dao_comprehension", "immortal_systems", "cosmic_wings", "tribulations"]
};
```

This comprehensive CP progression system provides multiple interconnected paths for power advancement, each unlocking at appropriate cultivation stages and offering unique gameplay mechanics that reinforce the cultivation theme while providing diverse progression opportunities for different player preferences.