/**
 * Cultivation Service - Business logic for cultivation system
 * Handles calculations, validations, and core cultivation mechanics
 */

import {
  CultivationState,
  CultivationRealm,
  CultivationTechnique,
  OfflineProgressResult,
  BackgroundProcessingConfig,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import {
  CULTIVATION_REALMS,
  CULTIVATION_TECHNIQUES,
  REALM_ORDER,
  calculateExperienceRequired,
  getBottleneckMultiplier,
  calculateQiCapacity,
} from './cultivationData';

class CultivationService {
  // Realm management
  getRealmData(realmName: string): CultivationRealm | null {
    return CULTIVATION_REALMS[realmName] || null;
  }

  getTechniqueData(techniqueId: string): CultivationTechnique | null {
    return CULTIVATION_TECHNIQUES[techniqueId] || null;
  }

  getNextRealm(currentRealm: string): string | null {
    const currentIndex = REALM_ORDER.indexOf(currentRealm);
    if (currentIndex === -1 || currentIndex === REALM_ORDER.length - 1) {
      return null;
    }
    return REALM_ORDER[currentIndex + 1];
  }

  getPreviousRealm(currentRealm: string): string | null {
    const currentIndex = REALM_ORDER.indexOf(currentRealm);
    if (currentIndex <= 0) {
      return null;
    }
    return REALM_ORDER[currentIndex - 1];
  }

  // Experience and level calculations
  calculateExperienceToNext(currentLevel: number, realm: string): number {
    return calculateExperienceRequired(currentLevel + 1, realm);
  }

  processLevelUps(state: CultivationState): void {
    // Process qi level ups
    while (state.stats.qi.experience >= state.stats.qi.experienceToNext) {
      state.stats.qi.experience -= state.stats.qi.experienceToNext;
      state.stats.qi.level += 1;
      state.stats.qi.experienceToNext = this.calculateExperienceToNext(state.stats.qi.level, state.currentRealm);

      // Update qi capacity when leveling up
      state.maxQi = calculateQiCapacity(state.currentRealm, state.currentStage, state.stats.qi.level);
    }

    // Process body level ups
    while (state.stats.body.experience >= state.stats.body.experienceToNext) {
      state.stats.body.experience -= state.stats.body.experienceToNext;
      state.stats.body.level += 1;
      state.stats.body.experienceToNext = this.calculateExperienceToNext(state.stats.body.level, state.currentRealm);
    }
  }

  // Cultivation speed calculation
  calculateCultivationSpeed(
    baseRate: number,
    technique: CultivationTechnique | null,
    realm: CultivationRealm | null,
    stage: number
  ): number {
    let speed = baseRate;

    // Technique multiplier
    if (technique) {
      speed *= (technique.effects.qiMultiplier + technique.effects.bodyMultiplier) / 2;
    }

    // Realm bonus
    if (realm) {
      speed *= (1 + realm.benefits.cultivationSpeedBonus);
    }

    // Stage bonus (diminishing returns)
    speed *= (1 + (stage * 0.02));

    return speed;
  }

  // Breakthrough chance calculation
  calculateBreakthroughChance(
    qiLevel: number,
    bodyLevel: number,
    realm: CultivationRealm | null,
    stage: number,
    technique: CultivationTechnique | null
  ): number {
    if (!realm) return 0;

    // Base chance (50% for meeting requirements exactly)
    let chance = CULTIVATION_CONSTANTS.BASE_BREAKTHROUGH_CHANCE;

    // Stat bonus (higher stats = better chance)
    const qiRequirement = realm.requirements.qi?.level || 0;
    const bodyRequirement = realm.requirements.body?.level || 0;

    if (qiLevel >= qiRequirement && bodyLevel >= bodyRequirement) {
      const qiBonus = Math.min((qiLevel - qiRequirement) / qiRequirement, 1.0) * 0.2;
      const bodyBonus = Math.min((bodyLevel - bodyRequirement) / bodyRequirement, 1.0) * 0.2;
      chance += qiBonus + bodyBonus;
    } else {
      return 0; // Can't breakthrough without meeting requirements
    }

    // Technique bonus
    if (technique?.effects?.breakthroughChanceBonus) {
      chance += technique.effects.breakthroughChanceBonus;
    }

    // Stage penalty (harder to breakthrough at higher stages)
    chance -= (stage - 1) * 0.05;

    return Math.max(
      CULTIVATION_CONSTANTS.MIN_BREAKTHROUGH_CHANCE,
      Math.min(CULTIVATION_CONSTANTS.MAX_BREAKTHROUGH_CHANCE, chance)
    );
  }

  // Technique requirement validation
  meetsTechniqueRequirements(technique: CultivationTechnique, state: CultivationState): boolean {
    const { unlockRequirements } = technique;

    // Check realm requirement
    if (unlockRequirements.realm) {
      const realmIndex = REALM_ORDER.indexOf(state.currentRealm);
      const requiredRealmIndex = REALM_ORDER.indexOf(unlockRequirements.realm);
      if (realmIndex < requiredRealmIndex) {
        return false;
      }
    }

    // Check qi level requirement
    if (unlockRequirements.qi && state.stats.qi.level < unlockRequirements.qi.level) {
      return false;
    }

    // Check body level requirement
    if (unlockRequirements.body && state.stats.body.level < unlockRequirements.body.level) {
      return false;
    }

    return true;
  }

  // Offline progress calculation
  calculateOfflineProgress(
    timeOffline: number,
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): OfflineProgressResult {
    const maxOfflineMs = config.maxOfflineHours * 3600 * 1000;
    const effectiveTimeMs = Math.min(timeOffline, maxOfflineMs);
    const effectiveHours = effectiveTimeMs / (3600 * 1000);

    // Efficiency decreases over time offline
    const efficiencyFactor = Math.max(
      config.minEfficiency,
      1 - (effectiveHours / config.maxOfflineHours) * config.efficiencyDecayRate
    );

    // Get cultivation data
    const realmData = this.getRealmData(state.currentRealm);
    const techniqueData = state.activeTechnique ? this.getTechniqueData(state.activeTechnique) : null;

    if (!techniqueData) {
      return {
        timeOffline: effectiveTimeMs,
        qiGained: 0,
        bodyGained: 0,
        resourcesGained: { qi: 0, spiritStones: 0 },
        breakthroughsAchieved: 0,
        efficiencyUsed: 0,
      };
    }

    // Calculate base cultivation speed
    const cultivationSpeed = this.calculateCultivationSpeed(
      CULTIVATION_CONSTANTS.BASE_CULTIVATION_SPEED,
      techniqueData,
      realmData,
      state.currentStage
    );

    // Calculate progression
    const effectiveSeconds = effectiveTimeMs / 1000;
    const baseProgression = cultivationSpeed * effectiveSeconds;
    const finalProgression = baseProgression * efficiencyFactor;

    // Split between qi and body based on technique
    const qiRatio = techniqueData.effects.qiMultiplier / (techniqueData.effects.qiMultiplier + techniqueData.effects.bodyMultiplier);
    const bodyRatio = 1 - qiRatio;

    const qiGained = finalProgression * qiRatio;
    const bodyGained = finalProgression * bodyRatio;

    // Calculate resource gains (minimal for offline)
    const qiResourceGained = Math.floor(effectiveHours * CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 3600);
    const spiritStonesGained = Math.floor(effectiveHours * 0.1); // Small passive gain

    return {
      timeOffline: effectiveTimeMs,
      qiGained,
      bodyGained,
      resourcesGained: {
        qi: qiResourceGained,
        spiritStones: spiritStonesGained,
      },
      breakthroughsAchieved: 0, // No automatic breakthroughs offline
      efficiencyUsed: efficiencyFactor,
    };
  }

  // Dual cultivation synergy calculation
  calculateDualCultivationSynergy(qiLevel: number, bodyLevel: number): number {
    const levelDifference = Math.abs(qiLevel - bodyLevel);
    const averageLevel = (qiLevel + bodyLevel) / 2;

    if (averageLevel === 0) return 0;

    // Better synergy when levels are close
    const balanceBonus = Math.max(0, 1 - (levelDifference / averageLevel));

    // Synergy increases with overall level
    const levelBonus = Math.log(averageLevel + 1) / 10;

    return balanceBonus * levelBonus;
  }

  // Resource efficiency calculation
  calculateResourceEfficiency(
    qiCurrent: number,
    qiMax: number,
    spiritStones: number,
    technique: CultivationTechnique | null
  ): number {
    let efficiency = 1.0;

    // Qi efficiency (less qi = reduced efficiency)
    const qiRatio = qiCurrent / qiMax;
    if (qiRatio < 0.5) {
      efficiency *= 0.5 + (qiRatio * 1.0); // Efficiency drops when qi is low
    }

    // Spirit stone bonus
    if (technique && technique.resourceCost.spiritStones > 0) {
      const spiritStoneBonus = Math.min(spiritStones * 0.001, 0.5); // Cap at 50% bonus
      efficiency += spiritStoneBonus;
    }

    return efficiency;
  }

  // Bottleneck detection
  isInBottleneck(level: number): boolean {
    return getBottleneckMultiplier(level) < 1.0;
  }

  // Get all available techniques for current state
  getAvailableTechniques(state: CultivationState): CultivationTechnique[] {
    return Object.values(CULTIVATION_TECHNIQUES).filter(technique =>
      this.meetsTechniqueRequirements(technique, state)
    );
  }

  // Get recommended technique based on current state
  getRecommendedTechnique(state: CultivationState): CultivationTechnique | null {
    const available = this.getAvailableTechniques(state);

    if (available.length === 0) return null;

    // Simple recommendation: highest rarity available
    const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4 };

    return available.reduce((best, current) => {
      const currentScore = rarityOrder[current.rarity];
      const bestScore = rarityOrder[best.rarity];
      return currentScore > bestScore ? current : best;
    });
  }

  // Calculate breakthrough cost
  calculateBreakthroughCost(realm: CultivationRealm, stage: number): { qi: number; spiritStones: number } {
    const baseCost = realm.breakthroughCost.base * Math.pow(realm.breakthroughCost.multiplier, stage - 1);

    return {
      qi: Math.floor(baseCost * 0.7),
      spiritStones: Math.floor(baseCost * 0.3),
    };
  }

  // Validate cultivation state
  validateState(state: CultivationState): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate realm exists
    if (!CULTIVATION_REALMS[state.currentRealm]) {
      errors.push(`Invalid realm: ${state.currentRealm}`);
    }

    // Validate stage
    const realmData = CULTIVATION_REALMS[state.currentRealm];
    if (realmData && (state.currentStage < 1 || state.currentStage > realmData.minorStages)) {
      errors.push(`Invalid stage ${state.currentStage} for realm ${state.currentRealm}`);
    }

    // Validate technique
    if (state.activeTechnique && !CULTIVATION_TECHNIQUES[state.activeTechnique]) {
      errors.push(`Invalid technique: ${state.activeTechnique}`);
    }

    // Validate levels are non-negative
    if (state.stats.qi.level < 0 || state.stats.body.level < 0) {
      errors.push('Levels cannot be negative');
    }

    // Validate resources
    if (state.currentQi < 0 || state.maxQi <= 0 || state.spiritStones < 0) {
      errors.push('Invalid resource values');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const cultivationService = new CultivationService();