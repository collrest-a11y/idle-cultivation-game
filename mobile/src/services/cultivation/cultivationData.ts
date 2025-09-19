/**
 * Cultivation Data - Static configuration adapted for React Native
 * Contains all the progression curves, costs, and benefits for the cultivation system
 */

import {
  CultivationRealm,
  CultivationTechnique,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';

// Cultivation realm definitions with authentic Xianxia terminology
export const CULTIVATION_REALMS: Record<string, CultivationRealm> = {
  'Body Refinement': {
    id: 'body_refinement',
    name: 'Body Refinement',
    type: 'mortal',
    minorStages: 10,
    description: 'Strengthening the mortal flesh and bones',
    breakthroughCost: {
      base: 1000,
      multiplier: 1.5,
    },
    requirements: {
      qi: { level: 0 },
      body: { level: 0 },
    },
    benefits: {
      qiCapacityMultiplier: 1.0,
      bodyStrengthMultiplier: 1.0,
      cultivationSpeedBonus: 0.0,
    },
    abilities: [],
  },
  'Qi Gathering': {
    id: 'qi_gathering',
    name: 'Qi Gathering',
    type: 'mortal',
    minorStages: 10,
    description: 'Learning to sense and gather spiritual qi',
    breakthroughCost: {
      base: 5000,
      multiplier: 1.6,
    },
    requirements: {
      qi: { level: 50 },
      body: { level: 30 },
    },
    benefits: {
      qiCapacityMultiplier: 2.0,
      bodyStrengthMultiplier: 1.5,
      cultivationSpeedBonus: 0.1,
    },
    abilities: ['qi_sense', 'basic_meditation'],
  },
  'Foundation Building': {
    id: 'foundation_building',
    name: 'Foundation Building',
    type: 'mortal',
    minorStages: 10,
    description: 'Building a solid foundation for future cultivation',
    breakthroughCost: {
      base: 25000,
      multiplier: 1.7,
    },
    requirements: {
      qi: { level: 150 },
      body: { level: 100 },
    },
    benefits: {
      qiCapacityMultiplier: 5.0,
      bodyStrengthMultiplier: 3.0,
      cultivationSpeedBonus: 0.25,
    },
    abilities: ['qi_manipulation', 'spiritual_sense'],
  },
  'Core Formation': {
    id: 'core_formation',
    name: 'Core Formation',
    type: 'cultivator',
    minorStages: 9,
    description: 'Forming a golden core within the dantian',
    breakthroughCost: {
      base: 100000,
      multiplier: 1.8,
    },
    requirements: {
      qi: { level: 300 },
      body: { level: 200 },
    },
    benefits: {
      qiCapacityMultiplier: 10.0,
      bodyStrengthMultiplier: 6.0,
      cultivationSpeedBonus: 0.5,
    },
    abilities: ['golden_core', 'flying', 'qi_shields'],
  },
  'Nascent Soul': {
    id: 'nascent_soul',
    name: 'Nascent Soul',
    type: 'cultivator',
    minorStages: 9,
    description: 'Nurturing the nascent soul within the core',
    breakthroughCost: {
      base: 500000,
      multiplier: 2.0,
    },
    requirements: {
      qi: { level: 600 },
      body: { level: 400 },
    },
    benefits: {
      qiCapacityMultiplier: 25.0,
      bodyStrengthMultiplier: 15.0,
      cultivationSpeedBonus: 1.0,
    },
    abilities: ['nascent_soul', 'teleportation', 'soul_attacks'],
  },
  'Soul Transformation': {
    id: 'soul_transformation',
    name: 'Soul Transformation',
    type: 'cultivator',
    minorStages: 9,
    description: 'Transforming the soul to transcend mortality',
    breakthroughCost: {
      base: 2000000,
      multiplier: 2.2,
    },
    requirements: {
      qi: { level: 1200 },
      body: { level: 800 },
    },
    benefits: {
      qiCapacityMultiplier: 50.0,
      bodyStrengthMultiplier: 35.0,
      cultivationSpeedBonus: 2.0,
    },
    abilities: ['soul_manifestation', 'divine_sense', 'space_manipulation'],
  },
  'Void Refining': {
    id: 'void_refining',
    name: 'Void Refining',
    type: 'immortal',
    minorStages: 9,
    description: 'Refining the void to comprehend the laws',
    breakthroughCost: {
      base: 10000000,
      multiplier: 2.5,
    },
    requirements: {
      qi: { level: 2500 },
      body: { level: 1600 },
    },
    benefits: {
      qiCapacityMultiplier: 100.0,
      bodyStrengthMultiplier: 70.0,
      cultivationSpeedBonus: 4.0,
    },
    abilities: ['void_comprehension', 'law_manipulation', 'pocket_dimensions'],
  },
  'Body Integration': {
    id: 'body_integration',
    name: 'Body Integration',
    type: 'immortal',
    minorStages: 9,
    description: 'Integrating body and soul into one',
    breakthroughCost: {
      base: 50000000,
      multiplier: 3.0,
    },
    requirements: {
      qi: { level: 5000 },
      body: { level: 3200 },
    },
    benefits: {
      qiCapacityMultiplier: 200.0,
      bodyStrengthMultiplier: 150.0,
      cultivationSpeedBonus: 8.0,
    },
    abilities: ['perfect_body', 'immortal_regeneration', 'reality_alteration'],
  },
  'Mahayana': {
    id: 'mahayana',
    name: 'Mahayana',
    type: 'immortal',
    minorStages: 9,
    description: 'The great vehicle to transcend all realms',
    breakthroughCost: {
      base: 250000000,
      multiplier: 4.0,
    },
    requirements: {
      qi: { level: 10000 },
      body: { level: 6400 },
    },
    benefits: {
      qiCapacityMultiplier: 500.0,
      bodyStrengthMultiplier: 350.0,
      cultivationSpeedBonus: 15.0,
    },
    abilities: ['universal_comprehension', 'creation', 'true_immortality'],
  },
  'True Immortal': {
    id: 'true_immortal',
    name: 'True Immortal',
    type: 'immortal',
    minorStages: 99,
    description: 'Beyond mortal comprehension',
    breakthroughCost: {
      base: 1000000000,
      multiplier: 5.0,
    },
    requirements: {
      qi: { level: 20000 },
      body: { level: 12800 },
    },
    benefits: {
      qiCapacityMultiplier: 1000.0,
      bodyStrengthMultiplier: 750.0,
      cultivationSpeedBonus: 30.0,
    },
    abilities: ['omniscience', 'omnipotence', 'eternal_existence'],
  },
};

// Cultivation techniques with different focuses and effects
export const CULTIVATION_TECHNIQUES: Record<string, CultivationTechnique> = {
  'Heaven and Earth Mantra': {
    id: 'heaven_earth_mantra',
    name: 'Heaven and Earth Mantra',
    rarity: 'common',
    type: 'dual',
    description: 'A basic technique that cultivates both qi and body in harmony',
    unlockRequirements: {},
    effects: {
      qiMultiplier: 1.1,
      bodyMultiplier: 1.1,
      dualCultivationBonus: 0.05,
    },
    resourceCost: {
      qi: 1.0,
      spiritStones: 0,
    },
  },
  'Iron Body Manual': {
    id: 'iron_body_manual',
    name: 'Iron Body Manual',
    rarity: 'common',
    type: 'body',
    description: 'Focuses on strengthening the physical body',
    unlockRequirements: {
      realm: 'Body Refinement',
    },
    effects: {
      qiMultiplier: 0.8,
      bodyMultiplier: 1.5,
      physicalDefenseBonus: 0.1,
    },
    resourceCost: {
      qi: 0.8,
      spiritStones: 0,
    },
  },
  'Spiritual Qi Absorption': {
    id: 'spiritual_qi_absorption',
    name: 'Spiritual Qi Absorption',
    rarity: 'common',
    type: 'qi',
    description: 'Enhances spiritual qi gathering and refinement',
    unlockRequirements: {
      realm: 'Qi Gathering',
    },
    effects: {
      qiMultiplier: 1.5,
      bodyMultiplier: 0.8,
      qiCapacityBonus: 0.1,
    },
    resourceCost: {
      qi: 1.2,
      spiritStones: 0,
    },
  },
  'Azure Dragon Body Technique': {
    id: 'azure_dragon_body',
    name: 'Azure Dragon Body Technique',
    rarity: 'rare',
    type: 'body',
    description: 'Channel the power of the Azure Dragon',
    unlockRequirements: {
      realm: 'Foundation Building',
      body: { level: 120 },
    },
    effects: {
      qiMultiplier: 1.0,
      bodyMultiplier: 2.0,
      elementalAffinityBonus: 0.15,
      physicalDefenseBonus: 0.2,
    },
    resourceCost: {
      qi: 1.5,
      spiritStones: 1,
    },
  },
  'Golden Core Meditation': {
    id: 'golden_core_meditation',
    name: 'Golden Core Meditation',
    rarity: 'rare',
    type: 'qi',
    description: 'Advanced meditation technique for core formation',
    unlockRequirements: {
      realm: 'Core Formation',
      qi: { level: 350 },
    },
    effects: {
      qiMultiplier: 2.2,
      bodyMultiplier: 1.0,
      breakthroughChanceBonus: 0.1,
      qiCapacityBonus: 0.25,
    },
    resourceCost: {
      qi: 2.0,
      spiritStones: 2,
    },
  },
  'Nine Heavens Thunder Technique': {
    id: 'nine_heavens_thunder',
    name: 'Nine Heavens Thunder Technique',
    rarity: 'epic',
    type: 'qi',
    description: 'Harness the power of heavenly thunder',
    unlockRequirements: {
      realm: 'Nascent Soul',
      qi: { level: 700 },
    },
    effects: {
      qiMultiplier: 3.0,
      bodyMultiplier: 1.2,
      combatPowerBonus: 0.5,
    },
    resourceCost: {
      qi: 3.0,
      spiritStones: 5,
    },
  },
  'Primordial Chaos Body': {
    id: 'primordial_chaos_body',
    name: 'Primordial Chaos Body',
    rarity: 'epic',
    type: 'body',
    description: 'Return to the primordial state of chaos',
    unlockRequirements: {
      realm: 'Soul Transformation',
      body: { level: 900 },
    },
    effects: {
      qiMultiplier: 1.5,
      bodyMultiplier: 3.5,
      chaosAffinityBonus: 0.3,
      adaptabilityBonus: 0.4,
    },
    resourceCost: {
      qi: 2.5,
      spiritStones: 5,
    },
  },
  'Eternal Dao Heart Sutra': {
    id: 'eternal_dao_heart',
    name: 'Eternal Dao Heart Sutra',
    rarity: 'legendary',
    type: 'dual',
    description: 'The supreme technique of the eternal dao',
    unlockRequirements: {
      realm: 'Void Refining',
      qi: { level: 3000 },
      body: { level: 2000 },
    },
    effects: {
      qiMultiplier: 4.0,
      bodyMultiplier: 4.0,
      dualCultivationBonus: 0.5,
      daoComprehensionBonus: 0.3,
      breakthroughChanceBonus: 0.25,
    },
    resourceCost: {
      qi: 4.0,
      spiritStones: 10,
    },
  },
};

// Realm progression order
export const REALM_ORDER: string[] = [
  'Body Refinement',
  'Qi Gathering',
  'Foundation Building',
  'Core Formation',
  'Nascent Soul',
  'Soul Transformation',
  'Void Refining',
  'Body Integration',
  'Mahayana',
  'True Immortal',
];

// Level-based bottlenecks (harder to progress at certain levels)
export const LEVEL_BOTTLENECKS: number[] = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

// Experience calculation formulas
export const calculateExperienceRequired = (currentLevel: number, realm?: string): number => {
  const baseExp = CULTIVATION_CONSTANTS.EXP_BASE;
  const growthRate = CULTIVATION_CONSTANTS.EXP_GROWTH_RATE;
  const exponentialFactor = Math.pow(currentLevel, CULTIVATION_CONSTANTS.EXP_EXPONENTIAL_FACTOR);
  let requiredExp = Math.floor(baseExp * Math.pow(growthRate, currentLevel) * exponentialFactor);

  // Apply bottleneck mechanics
  const bottleneckMultiplier = getBottleneckMultiplier(currentLevel);
  requiredExp *= bottleneckMultiplier;

  return Math.floor(requiredExp);
};

// Bottleneck multiplier calculation
export const getBottleneckMultiplier = (level: number): number => {
  for (const bottleneck of LEVEL_BOTTLENECKS) {
    if (level >= bottleneck && level < bottleneck + 10) {
      // 50% slower progression during bottleneck
      return 0.5;
    }
  }
  return 1.0;
};

// Qi capacity calculation
export const calculateQiCapacity = (realm: string, stage: number, level: number): number => {
  const baseCapacity = CULTIVATION_CONSTANTS.QI_CAPACITY_BASE;
  const realmData = CULTIVATION_REALMS[realm];
  const realmMultiplier = realmData?.benefits?.qiCapacityMultiplier || 1.0;
  const stageMultiplier = 1 + (stage * 0.1);
  const levelMultiplier = 1 + (level * 0.05);

  return Math.floor(baseCapacity * realmMultiplier * stageMultiplier * levelMultiplier);
};