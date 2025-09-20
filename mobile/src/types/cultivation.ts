/**
 * Cultivation System Types
 * TypeScript definitions for the cultivation system including realms, techniques, and progression
 */

// Core cultivation realm types
export type RealmType = 'mortal' | 'cultivator' | 'immortal';

export interface CultivationRealm {
  id: string;
  name: string;
  type: RealmType;
  minorStages: number;
  description: string;
  breakthroughCost: {
    base: number;
    multiplier: number;
  };
  requirements: {
    qi: { level: number };
    body: { level: number };
  };
  benefits: {
    qiCapacityMultiplier: number;
    bodyStrengthMultiplier: number;
    cultivationSpeedBonus: number;
  };
  abilities: string[];
}

// Cultivation technique types
export type TechniqueRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type TechniqueType = 'qi' | 'body' | 'dual';

export interface CultivationTechnique {
  id: string;
  name: string;
  rarity: TechniqueRarity;
  type: TechniqueType;
  description: string;
  unlockRequirements: {
    realm?: string;
    qi?: { level: number };
    body?: { level: number };
  };
  effects: {
    qiMultiplier: number;
    bodyMultiplier: number;
    dualCultivationBonus?: number;
    elementalAffinityBonus?: number;
    physicalDefenseBonus?: number;
    qiCapacityBonus?: number;
    breakthroughChanceBonus?: number;
    combatPowerBonus?: number;
    chaosAffinityBonus?: number;
    adaptabilityBonus?: number;
    daoComprehensionBonus?: number;
  };
  resourceCost: {
    qi: number;
    spiritStones: number;
  };
}

// Core cultivation stats
export interface CultivationStats {
  qi: {
    level: number;
    experience: number;
    experienceToNext: number;
  };
  body: {
    level: number;
    experience: number;
    experienceToNext: number;
  };
}

// Current cultivation state
export interface CultivationState {
  // Core progression
  stats: CultivationStats;
  currentRealm: string;
  currentStage: number;

  // Active technique
  activeTechnique: string | null;
  unlockedTechniques: string[];

  // Resources
  currentQi: number;
  maxQi: number;
  spiritStones: number;

  // Cultivation status
  isCultivating: boolean;
  cultivationStartTime: number | null;
  lastUpdateTime: number;

  // Background processing
  lastOfflineTime: number | null;
  offlineProgressCalculated: boolean;

  // Breakthrough tracking
  breakthroughProgress: number;
  breakthroughAttempts: number;
  lastBreakthroughTime: number | null;
}

// Resource management
export interface CultivationResources {
  qi: {
    current: number;
    max: number;
    regenRate: number;
    lastRegenTime: number;
  };
  spiritStones: number;
  pills: {
    [pillType: string]: number;
  };
}

// Offline progress calculation result
export interface OfflineProgressResult {
  timeOffline: number;
  qiGained: number;
  bodyGained: number;
  resourcesGained: {
    qi: number;
    spiritStones: number;
  };
  breakthroughsAchieved: number;
  efficiencyUsed: number;
}

// Breakthrough attempt result
export interface BreakthroughResult {
  success: boolean;
  newRealm?: string;
  newStage?: number;
  resourcesConsumed: {
    qi: number;
    spiritStones: number;
  };
  bonusGained?: {
    qiCapacity: number;
    cultivationSpeed: number;
  };
}

// Cultivation technique effects for active use
export interface ActiveTechniqueEffects {
  qiMultiplier: number;
  bodyMultiplier: number;
  resourceConsumption: {
    qiPerSecond: number;
    spiritStonesPerHour: number;
  };
  bonusEffects: {
    dualCultivationBonus: number;
    breakthroughChanceBonus: number;
    elementalAffinityBonus: number;
  };
}

// Background processing configuration
export interface BackgroundProcessingConfig {
  enabled: boolean;
  maxOfflineHours: number;
  efficiencyDecayRate: number;
  minEfficiency: number;
  autoSaveInterval: number;
}

// Cultivation event types for notifications and tracking
export type CultivationEvent =
  | 'cultivation_started'
  | 'cultivation_stopped'
  | 'level_up_qi'
  | 'level_up_body'
  | 'realm_breakthrough'
  | 'stage_breakthrough'
  | 'technique_unlocked'
  | 'offline_progress_calculated'
  | 'resource_depleted'
  | 'bottleneck_reached';

export interface CultivationEventData {
  type: CultivationEvent;
  timestamp: number;
  data: any;
}

// Store state for Zustand
export interface CultivationStore {
  // State
  state: CultivationState;
  resources: CultivationResources;
  config: BackgroundProcessingConfig;

  // Actions
  startCultivation: (technique?: string) => void;
  stopCultivation: () => void;
  switchTechnique: (techniqueId: string) => boolean;
  attemptBreakthrough: () => Promise<BreakthroughResult>;
  calculateOfflineProgress: () => OfflineProgressResult;
  updateCultivationProgress: () => void;

  // Resource management
  consumeQi: (amount: number) => boolean;
  consumeSpiritStones: (amount: number) => boolean;
  regenerateQi: () => void;

  // Getters
  getCurrentRealmData: () => CultivationRealm | null;
  getActiveTechniqueData: () => CultivationTechnique | null;
  getCultivationSpeed: () => number;
  getBreakthroughChance: () => number;
  canBreakthrough: () => boolean;

  // Persistence
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;

  // Events
  addEventListener: (event: CultivationEvent, callback: (data: CultivationEventData) => void) => void;
  removeEventListener: (event: CultivationEvent, callback: (data: CultivationEventData) => void) => void;
}

// Configuration constants
export const CULTIVATION_CONSTANTS = {
  // Base rates
  BASE_QI_REGEN_RATE: 1.0, // qi per second
  BASE_CULTIVATION_SPEED: 1.0, // experience per second

  // Timing
  UPDATE_INTERVAL: 1000, // milliseconds
  SAVE_INTERVAL: 30000, // milliseconds

  // Offline progression
  MAX_OFFLINE_HOURS: 24,
  MIN_OFFLINE_EFFICIENCY: 0.3,
  EFFICIENCY_DECAY_RATE: 0.7,

  // Breakthrough
  BASE_BREAKTHROUGH_CHANCE: 0.5,
  MAX_BREAKTHROUGH_CHANCE: 0.95,
  MIN_BREAKTHROUGH_CHANCE: 0.05,

  // Experience formulas
  EXP_BASE: 100,
  EXP_GROWTH_RATE: 1.15,
  EXP_EXPONENTIAL_FACTOR: 1.2,

  // Resource limits
  MAX_SPIRIT_STONES: 999999,
  QI_CAPACITY_BASE: 100,
} as const;