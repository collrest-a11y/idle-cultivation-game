---
name: Roguelite-Skills-System
description: Dynamic skill progression system with gacha integration and cultivation-gated advancement
status: draft
created: 2025-09-17T00:00:00.000Z
updated: 2025-09-17T00:00:00.000Z
---

# Roguelite Skills System: Dynamic Progression & Build Diversity

## Executive Summary

Implement a comprehensive roguelite skills system where players progressively unlock and upgrade abilities through cultivation advancement and gacha acquisition. Each player's journey creates a unique build through branching skill paths, synergy combinations, and evolution mechanics. Skills integrate seamlessly with all existing systems while providing endless customization possibilities.

---

## 1. Skill System Foundation

### **Core Skill Categories**
```typescript
interface SkillSystem {
  categories: {
    combat: {
      branches: ["offensive", "defensive", "utility"],
      unlockRealm: "Body Refinement",
      maxSkills: 50,
      focus: "direct_combat_enhancement"
    },

    cultivation: {
      branches: ["qi_mastery", "body_mastery", "dual_mastery"],
      unlockRealm: "Qi Condensation",
      maxSkills: 40,
      focus: "cultivation_speed_and_efficiency"
    },

    spiritual: {
      branches: ["soul_arts", "divine_arts", "void_arts"],
      unlockRealm: "Foundation",
      maxSkills: 45,
      focus: "advanced_spiritual_techniques"
    },

    crafting: {
      branches: ["creation", "refinement", "innovation"],
      unlockRealm: "Foundation",
      maxSkills: 35,
      focus: "crafting_mastery_and_efficiency"
    },

    social: {
      branches: ["leadership", "diplomacy", "manipulation"],
      unlockRealm: "Core Formation",
      maxSkills: 30,
      focus: "sect_and_player_interactions"
    },

    transcendent: {
      branches: ["dao_insights", "cosmic_understanding", "reality_mastery"],
      unlockRealm: "Nascent Soul",
      maxSkills: 25,
      focus: "ultimate_cultivation_abilities"
    }
  };
}

interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  branch: string;
  tier: number;                    // 1-10 skill tiers
  level: number;                   // 1-100 skill levels
  maxLevel: number;

  requirements: {
    cultivation: {
      realm: string;
      cpMinimum: number;
    };
    prerequisites: string[];        // Required skills
    materials?: SkillMaterial[];    // Upgrade materials
    questCompletion?: string;       // Unlock quest
  };

  effects: {
    passive: SkillEffect[];         // Always active
    active: SkillAbility[];         // Triggered abilities
    synergies: SkillSynergy[];      // Interactions with other skills
  };

  acquisition: {
    method: "gacha" | "progression" | "quest" | "discovery";
    rarity: number;                 // 1-5 star rarity
    gachaWeight: number;            // Drop rate influence
  };

  evolution: {
    canEvolve: boolean;
    evolutionPath: string[];        // Next tier options
    evolutionRequirements: EvolutionRequirement[];
  };
}
```

---

## 2. Skill Acquisition Methods

### **Gacha Integration with Skill Discovery**
```typescript
interface SkillGacha {
  banners: {
    standard: {
      skillPool: "all_unlocked_skills",
      rates: {
        tier1: 0.45,               // Common skills
        tier2: 0.30,               // Uncommon skills
        tier3: 0.15,               // Rare skills
        tier4: 0.08,               // Epic skills
        tier5: 0.02                // Legendary skills
      },
      guarantees: {
        tier3Plus: 10,             // Every 10 pulls
        tier4Plus: 50,             // Every 50 pulls
        tier5: 200                 // Pity at 200 pulls
      }
    },

    cultivation_focused: {
      skillPool: "cultivation_and_spiritual_skills",
      rateUp: {
        cultivation: 2.0,          // 2x rate for cultivation skills
        spiritual: 1.5             // 1.5x rate for spiritual skills
      },
      exclusives: ["transcendent_cultivation_techniques"],
      duration: "2_weeks"
    },

    combat_mastery: {
      skillPool: "combat_and_crafting_skills",
      rateUp: {
        combat: 2.0,
        crafting: 1.5
      },
      exclusives: ["legendary_weapon_techniques"],
      duration: "2_weeks"
    },

    divine_enlightenment: {
      skillPool: "transcendent_skills_only",
      minimumTier: 3,
      rates: {
        tier3: 0.40,
        tier4: 0.35,
        tier5: 0.25
      },
      requirements: {
        realm: "Nascent Soul",
        vipLevel: 5
      },
      cost: { jade: 300, crystals: 0 }
    }
  };

  skillFragments: {
    acquisition: {
      gachaDuplicates: true,       // Duplicates become fragments
      dailyMissions: true,         // Fragments as quest rewards
      bossDefeats: true,           // Boss-specific skill fragments
      eventRewards: true           // Limited-time events
    },

    uses: {
      skillUpgrade: {
        fragments: 10,             // 10 fragments = 1 skill level
        conversion: "same_skill_only"
      },
      skillUnlock: {
        fragments: 100,            // 100 fragments = unlock new skill
        conversion: "category_specific"
      },
      evolution: {
        fragments: 500,            // 500 fragments = skill evolution
        conversion: "exact_skill_match"
      }
    };
  };
}
```

### **Progressive Skill Unlocks**
```typescript
interface SkillProgression {
  cultivationGates: {
    "Body Refinement": {
      baseSkills: ["basic_strike", "iron_skin", "meditation_focus"],
      branchUnlocks: ["combat_offense", "combat_defense"],
      maxTier: 2
    },

    "Qi Condensation": {
      baseSkills: ["qi_manipulation", "energy_burst", "spirit_sense"],
      branchUnlocks: ["cultivation_qi", "spiritual_soul"],
      maxTier: 4,
      advancedFeatures: ["skill_synergies", "basic_evolution"]
    },

    "Foundation": {
      baseSkills: ["foundation_mastery", "dual_path_insight", "array_basics"],
      branchUnlocks: ["cultivation_dual", "crafting_creation", "spiritual_divine"],
      maxTier: 6,
      advancedFeatures: ["skill_combinations", "branch_specialization"]
    },

    "Core Formation": {
      baseSkills: ["core_authority", "leadership_aura", "domain_creation"],
      branchUnlocks: ["social_leadership", "spiritual_void", "crafting_innovation"],
      maxTier: 8,
      advancedFeatures: ["skill_mastery", "legendary_evolution"]
    },

    "Nascent Soul": {
      baseSkills: ["soul_manifestation", "reality_touch", "dao_glimpse"],
      branchUnlocks: ["transcendent_all"],
      maxTier: 10,
      advancedFeatures: ["transcendent_skills", "dao_integration"]
    }
  };

  discoveryMethods: {
    exploration: {
      hiddenAreas: "secret_skill_discoveries",
      ancientRuins: "lost_technique_recovery",
      mysticEncounters: "mentor_skill_transmission"
    },

    achievement: {
      combatMilestones: "combat_skill_unlocks",
      craftingMastery: "crafting_skill_unlocks",
      socialAccomplishments: "leadership_skill_unlocks"
    },

    experimentation: {
      skillCombination: "discover_synergy_skills",
      failedEvolution: "unlock_alternate_paths",
      randomChance: "serendipitous_discoveries"
    }
  };
}
```

---

## 3. Skill Categories & Examples

### **Combat Skills Branch**
```typescript
const COMBAT_SKILLS = {
  // Offensive Branch
  offensive: {
    basic_strike: {
      name: "Basic Strike",
      tier: 1,
      unlockRealm: "Body Refinement",
      effects: {
        passive: [{ type: "damage_increase", value: 0.10 }],
        active: [{ name: "Power Strike", cpCost: 50, multiplier: 1.5 }]
      },
      evolution: {
        paths: ["crushing_blow", "precise_strike", "elemental_strike"],
        requirements: { level: 50, combatExperience: 1000 }
      }
    },

    crushing_blow: {
      name: "Crushing Blow",
      tier: 3,
      evolution_from: "basic_strike",
      effects: {
        passive: [{ type: "damage_increase", value: 0.25 }],
        active: [
          { name: "Devastating Strike", cpCost: 200, multiplier: 3.0 },
          { name: "Armor Shatter", cpCost: 150, armorPen: 0.50 }
        ]
      },
      synergies: [
        { skill: "iron_skin", bonus: "unstoppable_force" },
        { skill: "weapon_mastery", bonus: "critical_devastation" }
      ]
    },

    ten_thousand_sword_formation: {
      name: "Ten Thousand Sword Formation",
      tier: 10,
      unlockRealm: "Soul Transformation",
      acquisition: { method: "gacha", rarity: 5 },
      effects: {
        passive: [{ type: "sword_mastery", value: 2.0 }],
        active: [
          { name: "Sword Rain", cpCost: 5000, aoe: true, multiplier: 10.0 },
          { name: "Eternal Sword Domain", cpCost: 10000, duration: 300 }
        ]
      },
      requirements: {
        prerequisites: ["sword_intent", "blade_mastery", "formation_understanding"],
        dao: "dao_of_sword"
      }
    }
  },

  // Defensive Branch
  defensive: {
    iron_skin: {
      name: "Iron Skin",
      tier: 1,
      effects: {
        passive: [{ type: "damage_reduction", value: 0.05 }],
        active: [{ name: "Iron Body", cpCost: 100, reduction: 0.30, duration: 60 }]
      },
      evolution: {
        paths: ["diamond_body", "elemental_resistance", "adaptive_defense"]
      }
    },

    immortal_physique: {
      name: "Immortal Physique",
      tier: 9,
      unlockRealm: "Soul Transformation",
      effects: {
        passive: [
          { type: "damage_reduction", value: 0.50 },
          { type: "regeneration", value: 0.10 },
          { type: "status_immunity", value: 1.0 }
        ],
        active: [
          { name: "Undying Will", cpCost: 0, effect: "death_immunity_1minute" },
          { name: "Phoenix Rebirth", cpCost: 20000, effect: "full_restoration" }
        ]
      }
    }
  }
};
```

### **Cultivation Skills Branch**
```typescript
const CULTIVATION_SKILLS = {
  qi_mastery: {
    qi_circulation: {
      name: "Qi Circulation",
      tier: 1,
      effects: {
        passive: [{ type: "cultivation_speed", value: 0.15 }],
        active: [{ name: "Qi Burst", effect: "1hour_2x_cultivation" }]
      },
      evolution: {
        paths: ["perfect_circulation", "elemental_qi", "primordial_qi"]
      }
    },

    heaven_and_earth_absorption: {
      name: "Heaven and Earth Absorption",
      tier: 7,
      effects: {
        passive: [
          { type: "cultivation_speed", value: 0.80 },
          { type: "environmental_bonus", value: 0.30 },
          { type: "resource_generation", value: 0.25 }
        ],
        active: [
          { name: "Cosmic Absorption", effect: "absorb_all_nearby_energy" },
          { name: "Void Breathing", effect: "cultivate_in_impossible_places" }
        ]
      },
      synergies: [
        { skill: "meditation_mastery", bonus: "enlightenment_chance" },
        { skill: "dao_comprehension", bonus: "natural_dao_insight" }
      ]
    }
  },

  body_mastery: {
    muscle_refinement: {
      name: "Muscle Refinement",
      tier: 2,
      effects: {
        passive: [
          { type: "body_cultivation_speed", value: 0.20 },
          { type: "physical_strength", value: 0.15 }
        ]
      }
    },

    divine_physique_transformation: {
      name: "Divine Physique Transformation",
      tier: 8,
      effects: {
        passive: [
          { type: "body_cultivation_speed", value: 1.0 },
          { type: "physical_perfection", value: 1.0 },
          { type: "size_manipulation", value: 1.0 }
        ],
        active: [
          { name: "Giant Form", effect: "10x_size_and_strength" },
          { name: "Microscopic Form", effect: "molecular_level_existence" }
        ]
      }
    }
  }
};
```

### **Spiritual Skills Branch**
```typescript
const SPIRITUAL_SKILLS = {
  soul_arts: {
    soul_sight: {
      name: "Soul Sight",
      tier: 2,
      unlockRealm: "Foundation",
      effects: {
        passive: [{ type: "see_souls", value: 1.0 }],
        active: [{ name: "Soul Analysis", effect: "reveal_enemy_weaknesses" }]
      }
    },

    soul_dominion: {
      name: "Soul Dominion",
      tier: 9,
      unlockRealm: "Soul Transformation",
      effects: {
        passive: [{ type: "soul_authority", value: 1.0 }],
        active: [
          { name: "Soul Command", effect: "control_weaker_souls" },
          { name: "Soul Harvest", effect: "absorb_defeated_soul_power" },
          { name: "Soul Army", effect: "summon_soul_servants" }
        ]
      }
    }
  },

  divine_arts: {
    divine_insight: {
      name: "Divine Insight",
      tier: 4,
      effects: {
        passive: [{ type: "divine_knowledge", value: 0.30 }],
        active: [{ name: "Future Glimpse", effect: "see_1minute_into_future" }]
      }
    },

    mandate_of_heaven: {
      name: "Mandate of Heaven",
      tier: 10,
      acquisition: { method: "gacha", rarity: 5 },
      effects: {
        passive: [{ type: "heavenly_authority", value: 1.0 }],
        active: [
          { name: "Divine Judgment", effect: "call_down_heavenly_punishment" },
          { name: "Celestial Decree", effect: "alter_local_reality_laws" },
          { name: "Heaven's Blessing", effect: "grant_divine_protection" }
        ]
      },
      requirements: {
        karma: 10000,
        dao: "dao_of_justice",
        celestialApproval: true
      }
    }
  }
};
```

### **Transcendent Skills Branch**
```typescript
const TRANSCENDENT_SKILLS = {
  dao_insights: {
    dao_comprehension: {
      name: "Dao Comprehension",
      tier: 5,
      unlockRealm: "Nascent Soul",
      effects: {
        passive: [{ type: "dao_insight_speed", value: 0.50 }],
        active: [{ name: "Dao Meditation", effect: "accelerated_dao_understanding" }]
      }
    },

    dao_manifestation: {
      name: "Dao Manifestation",
      tier: 8,
      effects: {
        passive: [{ type: "dao_authority", value: 1.0 }],
        active: [
          { name: "Law Enforcement", effect: "impose_dao_upon_reality" },
          { name: "Principle Creation", effect: "create_new_natural_laws" }
        ]
      }
    }
  },

  reality_mastery: {
    space_manipulation: {
      name: "Space Manipulation",
      tier: 6,
      effects: {
        passive: [{ type: "spatial_awareness", value: 1.0 }],
        active: [
          { name: "Teleportation", cpCost: 500 },
          { name: "Spatial Fold", effect: "create_pocket_dimensions" }
        ]
      }
    },

    universe_creation: {
      name: "Universe Creation",
      tier: 10,
      acquisition: { method: "discovery", questLine: "become_universe_god" },
      effects: {
        passive: [{ type: "cosmic_authority", value: 1.0 }],
        active: [
          { name: "Big Bang", effect: "create_personal_universe" },
          { name: "Reality Engine", effect: "control_all_natural_laws" },
          { name: "Multiverse Access", effect: "travel_between_realities" }
        ]
      },
      requirements: {
        allDaoMastery: true,
        cpRequirement: 1000000,
        cosmicApproval: true
      }
    }
  }
};
```

---

## 4. Skill Synergy & Combination System

### **Synergy Mechanics**
```typescript
interface SkillSynergy {
  types: {
    enhancement: {
      description: "Skills boost each other's effectiveness",
      examples: [
        {
          skills: ["qi_circulation", "meditation_mastery"],
          bonus: { cultivationSpeed: 0.25, enlightenmentChance: 0.10 }
        },
        {
          skills: ["iron_skin", "weapon_mastery", "combat_reflexes"],
          bonus: { perfectDefense: true, counterAttackChance: 0.30 }
        }
      ]
    },

    fusion: {
      description: "Skills combine to create new abilities",
      examples: [
        {
          skills: ["fire_mastery", "sword_techniques"],
          result: "flaming_sword_arts",
          newAbilities: ["phoenix_blade", "inferno_slash"]
        },
        {
          skills: ["soul_sight", "time_manipulation"],
          result: "karmic_vision",
          newAbilities: ["past_life_reading", "destiny_alteration"]
        }
      ]
    },

    evolution_unlock: {
      description: "Skills unlock new evolution paths",
      examples: [
        {
          skills: ["basic_strike", "qi_circulation", "iron_skin"],
          unlocks: "martial_dao_path",
          evolutions: ["dao_fist", "perfect_warrior", "martial_god"]
        }
      ]
    },

    resonance: {
      description: "Skills create passive field effects",
      examples: [
        {
          skills: ["divine_insight", "soul_dominion", "mandate_of_heaven"],
          effect: "celestial_court_aura",
          radius: 1000,
          benefits: "all_allies_gain_divine_protection"
        }
      ]
    }
  };

  discoveryMethods: {
    experimentation: {
      method: "try_skill_combinations_in_combat",
      successRate: 0.05,
      cooldown: 86400
    },

    enlightenment: {
      method: "meditation_with_multiple_skills_active",
      successRate: 0.15,
      requirements: { meditationMastery: 50 }
    },

    guidance: {
      method: "learn_from_sect_masters_or_npcs",
      successRate: 0.80,
      cost: { jade: 1000, spiritCrystals: 5000 }
    },

    gacha: {
      method: "rare_synergy_manuals_from_pulls",
      rarity: 4,
      directTeaching: true
    }
  };
}
```

### **Build Specialization Paths**
```typescript
interface BuildArchetypes {
  martial_artist: {
    coreSkills: ["weapon_mastery", "combat_reflexes", "iron_skin"],
    advancement: ["perfect_technique", "martial_dao", "weapon_spirit_unity"],
    playstyle: "high_physical_damage_and_defense",
    uniqueFeatures: ["weapon_evolution", "combat_intuition", "martial_domains"]
  },

  spiritual_scholar: {
    coreSkills: ["dao_comprehension", "divine_insight", "cosmic_understanding"],
    advancement: ["reality_manipulation", "universe_creation", "omniscience"],
    playstyle: "knowledge_based_power_and_utility",
    uniqueFeatures: ["reality_alteration", "information_dominance", "teaching_abilities"]
  },

  demon_cultivator: {
    coreSkills: ["soul_devouring", "blood_arts", "fear_mastery"],
    advancement: ["demonic_transformation", "soul_dominion", "hell_lord"],
    playstyle: "high_risk_high_reward_power_growth",
    uniqueFeatures: ["rapid_advancement", "soul_abilities", "karma_immunity"]
  },

  crafting_master: {
    coreSkills: ["creation_mastery", "material_understanding", "innovation_genius"],
    advancement: ["divine_crafting", "reality_forging", "universe_engineering"],
    playstyle: "support_through_superior_equipment",
    uniqueFeatures: ["unique_item_creation", "mass_production", "economic_dominance"]
  },

  sect_leader: {
    coreSkills: ["leadership_aura", "diplomatic_mastery", "organization_genius"],
    advancement: ["empire_building", "civilization_creation", "species_evolution"],
    playstyle: "power_through_followers_and_influence",
    uniqueFeatures: ["follower_empowerment", "large_scale_projects", "political_dominance"]
  },

  balanced_cultivator: {
    coreSkills: ["harmony_mastery", "adaptation", "universal_understanding"],
    advancement: ["perfect_balance", "omnipotent_foundation", "transcendent_unity"],
    playstyle: "jack_of_all_trades_master_of_balance",
    uniqueFeatures: ["no_weaknesses", "universal_compatibility", "perfect_adaptation"]
  }
};
```

---

## 5. Skill Evolution & Mastery

### **Evolution System**
```typescript
interface SkillEvolution {
  evolutionTypes: {
    linear: {
      description: "Direct upgrade path",
      example: "basic_strike → power_strike → crushing_blow → devastating_impact"
    },

    branching: {
      description: "Multiple evolution options",
      example: "basic_strike → [crushing_blow, precise_strike, elemental_strike]"
    },

    fusion: {
      description: "Combine multiple skills",
      example: "fire_mastery + water_mastery → steam_mastery"
    },

    transcendence: {
      description: "Qualitative transformation",
      example: "any_sword_skill → dao_of_sword (requires enlightenment)"
    }
  };

  evolutionRequirements: {
    usage: {
      description: "Use skill X times successfully",
      typical: 10000,
      legendary: 100000
    },

    mastery: {
      description: "Reach maximum skill level",
      requirement: "level_100_in_prerequisite_skills"
    },

    enlightenment: {
      description: "Random chance during use",
      baseChance: 0.001,
      modifiers: ["meditation_bonus", "dao_comprehension", "divine_insight"]
    },

    materials: {
      description: "Consume evolution materials",
      examples: ["evolution_stone", "dao_crystal", "transcendence_pill"]
    },

    trials: {
      description: "Complete specific challenges",
      examples: ["defeat_higher_realm_enemy", "survive_tribulation", "create_perfect_item"]
    }
  };

  masteryLevels: {
    beginner: { level: "1-20", bonus: 1.0, features: ["basic_usage"] },
    apprentice: { level: "21-40", bonus: 1.2, features: ["efficiency_improvement"] },
    adept: { level: "41-60", bonus: 1.5, features: ["cost_reduction"] },
    expert: { level: "61-80", bonus: 2.0, features: ["new_techniques"] },
    master: { level: "81-100", bonus: 3.0, features: ["teaching_ability"] },
    grandmaster: { level: "101+", bonus: 5.0, features: ["skill_creation"] }
  };
}
```

### **Skill Point Economy**
```typescript
interface SkillPointSystem {
  acquisition: {
    cultivation: {
      pointsPerLevel: {
        qi: 2,
        body: 2,
        dual: 3
      },
      realmBreakthrough: {
        minor: 10,
        major: 50
      }
    },

    combat: {
      victory: 1,
      perfect_victory: 3,
      higher_realm_defeat: 10,
      boss_defeat: 25
    },

    achievements: {
      first_time: 5,
      mastery: 20,
      legendary: 100
    },

    daily_activities: {
      meditation: 2,
      crafting: 1,
      hunting: 1,
      sect_contribution: 3
    },

    gacha: {
      duplicate_skills: 5,
      fragment_conversion: 1,
      special_events: 50
    }
  };

  spending: {
    skill_upgrade: {
      tier1: 1,
      tier2: 2,
      tier3: 5,
      tier4: 10,
      tier5: 20,
      tier6: 40,
      tier7: 80,
      tier8: 160,
      tier9: 320,
      tier10: 640
    },

    skill_unlock: {
      basic: 10,
      advanced: 50,
      legendary: 200,
      transcendent: 1000
    },

    special_features: {
      extra_skill_slot: 100,
      synergy_discovery: 75,
      evolution_attempt: 25,
      mastery_acceleration: 50
    }
  };

  limits: {
    active_skills: {
      base: 10,
      cultivation_bonus: 1,        // +1 per major realm
      vip_bonus: 1,               // +1 per 3 VIP levels
      special_unlocks: 5          // Special achievements
    },

    passive_skills: {
      unlimited: true,
      synergy_limits: 5           // Max 5 synergy combinations active
    }
  };
}
```

---

## 6. Cultivation-Gated Progression

### **Realm-Based Skill Unlocks**
```typescript
interface CultivationGating {
  realmUnlocks: {
    "Body Refinement": {
      skillCategories: ["combat_basic"],
      maxTier: 2,
      skillSlots: 5,
      specialFeatures: []
    },

    "Qi Condensation": {
      skillCategories: ["combat_advanced", "cultivation_basic"],
      maxTier: 4,
      skillSlots: 8,
      specialFeatures: ["skill_synergy", "basic_evolution"]
    },

    "Foundation": {
      skillCategories: ["spiritual_basic", "crafting_basic"],
      maxTier: 6,
      skillSlots: 12,
      specialFeatures: ["skill_fusion", "advanced_synergy"]
    },

    "Core Formation": {
      skillCategories: ["social_basic", "spiritual_advanced"],
      maxTier: 8,
      skillSlots: 16,
      specialFeatures: ["transcendent_evolution", "skill_teaching"]
    },

    "Nascent Soul": {
      skillCategories: ["transcendent_basic"],
      maxTier: 10,
      skillSlots: 20,
      specialFeatures: ["dao_integration", "reality_manipulation"]
    },

    "Soul Transformation": {
      skillCategories: ["transcendent_advanced"],
      maxTier: 10,
      skillSlots: 25,
      specialFeatures: ["universal_access", "skill_creation"]
    }
  };

  progressiveUnlocks: {
    gacha_access: {
      "Body Refinement": ["basic_skill_gacha"],
      "Qi Condensation": ["standard_skill_gacha"],
      "Foundation": ["advanced_skill_gacha"],
      "Core Formation": ["elite_skill_gacha"],
      "Nascent Soul": ["legendary_skill_gacha"],
      "Soul Transformation": ["transcendent_skill_gacha"]
    },

    discovery_methods: {
      "Body Refinement": ["basic_exploration"],
      "Qi Condensation": ["ruin_exploration", "mentor_teaching"],
      "Foundation": ["sect_techniques", "ancient_inheritances"],
      "Core Formation": ["divine_encounters", "dao_enlightenment"],
      "Nascent Soul": ["cosmic_discoveries", "universal_secrets"],
      "Soul Transformation": ["reality_manipulation", "creation_powers"]
    }
  };
}
```

---

## 7. Unique Player Progression Examples

### **Example Player Journey: "The Sword Saint"**
```typescript
const playerJourney_SwordSaint = {
  characterCreation: {
    origin: "ink_pavilion",          // Study focus
    vow: "pursue",                   // Pursue Hidden Law
    mark: "thunder"                  // Thunder Whisper (Qi)
  },

  earlyGame: {
    firstSkills: ["basic_strike", "meditation_focus", "qi_circulation"],
    gachaLuck: ["precise_strike"],   // Rare early pull
    specialization: "sword_techniques"
  },

  midGame: {
    skillEvolution: "precise_strike → perfect_thrust → heaven_piercing_strike",
    synergies: ["qi_circulation + sword_intent", "meditation + sword_dao"],
    majorUnlock: "dao_of_sword",
    buildIdentity: "lightning_sword_master"
  },

  endGame: {
    transcendentSkills: ["ten_thousand_sword_formation", "sword_cuts_reality"],
    uniqueCombination: "lightning_dao + sword_dao + thunder_mark",
    ultimateAbility: "thunder_god_sword_emperor",
    playstyleResult: "instakill_most_enemies_with_single_strike"
  }
};
```

### **Example Player Journey: "The Crafting Empress"**
```typescript
const playerJourney_CraftingEmpress = {
  characterCreation: {
    origin: "exiled_heir",           // Resource focus
    vow: "settle",                   // Settle a Debt
    mark: "hollow"                   // Hollow Gourd (Utility)
  },

  earlyGame: {
    firstSkills: ["material_understanding", "basic_creation", "resource_efficiency"],
    gachaFocus: "crafting_banners",
    specialization: "all_crafting_professions"
  },

  midGame: {
    skillSynergies: ["innovation + material_mastery", "creation + divine_insight"],
    uniqueDiscovery: "universal_crafting_principle",
    economicDominance: "control_server_equipment_market"
  },

  endGame: {
    transcendentSkills: ["reality_forging", "universe_engineering", "item_dao"],
    uniqueAchievement: "create_artifacts_that_grant_immortality",
    playstyleResult: "economic_and_technological_supremacy"
  }
};
```

---

## 8. System Integration & Balance

### **Skill System Integration**
```typescript
interface SystemIntegration {
  with_combat: {
    skills_affect: ["damage", "defense", "speed", "special_abilities"],
    combat_feeds_back: ["skill_experience", "evolution_chances", "synergy_discovery"]
  },

  with_cultivation: {
    skills_affect: ["cultivation_speed", "breakthrough_chance", "technique_power"],
    cultivation_feeds_back: ["skill_unlocks", "tier_access", "evolution_potential"]
  },

  with_crafting: {
    skills_affect: ["success_rate", "quality_chance", "innovation_potential"],
    crafting_feeds_back: ["skill_materials", "technique_discovery", "mastery_items"]
  },

  with_social: {
    skills_affect: ["sect_leadership", "diplomacy", "teaching_ability"],
    social_feeds_back: ["skill_sharing", "group_synergies", "collective_advancement"]
  },

  with_monetization: {
    gacha_integration: "skill_acquisition_primary_motivator",
    vip_benefits: ["skill_slots", "evolution_bonuses", "gacha_rates"],
    battle_pass: "skill_progression_rewards"
  };
}

interface BalancingMechanisms {
  power_scaling: {
    diminishing_returns: "higher_tier_skills_cost_exponentially_more",
    synergy_limits: "maximum_5_active_synergies",
    evolution_gates: "require_specific_achievements_and_materials"
  },

  acquisition_balance: {
    guaranteed_progression: "cultivation_always_grants_basic_skills",
    gacha_supplementation: "gacha_provides_variety_not_necessity",
    discovery_rewards: "exploration_grants_unique_skills"
  },

  build_diversity: {
    no_optimal_build: "different_skills_excel_in_different_situations",
    rock_paper_scissors: "builds_counter_each_other",
    continuous_evolution: "new_synergies_discovered_over_time"
  };
}
```

This roguelite skills system ensures that every player's cultivation journey is unique, with meaningful choices at every step. The integration with gacha provides excitement and variety while maintaining fair progression for all players. The branching paths and synergy systems create endless build possibilities, encouraging experimentation and replayability.