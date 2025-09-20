/**
 * Cultivation Services - Central export for all cultivation system components
 */

// Core services
export { cultivationService } from './cultivationService';
export { offlineProgressCalculator, OfflineUtils } from './offlineProgressCalculator';
export { cultivationStagesManager } from './cultivationStages';
export { breakthroughSystem } from './breakthroughSystem';
export { energyManager } from './energyManager';
export { backgroundProcessor } from './backgroundProcessor';

// Data exports
export {
  CULTIVATION_REALMS,
  CULTIVATION_TECHNIQUES,
  REALM_ORDER,
  calculateExperienceRequired,
  getBottleneckMultiplier,
  calculateQiCapacity,
} from './cultivationData';

// Type exports
export type { StageProgression, RealmStageConfig } from './cultivationStages';
export type { BreakthroughRequirement, BreakthroughValidation, TribulationEvent } from './breakthroughSystem';
export type { EnergySource, EnergyDrain, EnergyEfficiency, QiRegeneration } from './energyManager';
export type { BackgroundTask, AppStateTransition, BackgroundProcessingState } from './backgroundProcessor';