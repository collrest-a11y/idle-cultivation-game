/**
 * Breakthrough System - Advanced breakthrough mechanics with requirements validation
 * Handles stage advancement, realm breakthroughs, and tribulation mechanics
 */

import {
  CultivationState,
  CultivationRealm,
  CultivationTechnique,
  BreakthroughResult,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import { CULTIVATION_REALMS, REALM_ORDER } from './cultivationData';
import { cultivationStagesManager } from './cultivationStages';

interface BreakthroughRequirement {
  type: 'level' | 'resource' | 'time' | 'special';
  description: string;
  met: boolean;
  current: number;
  required: number;
  unit?: string;
}

interface BreakthroughValidation {
  canBreakthrough: boolean;
  requirements: BreakthroughRequirement[];
  successChance: number;
  cost: {
    qi: number;
    spiritStones: number;
  };
  potentialRewards: {
    qiCapacityIncrease: number;
    cultivationSpeedBonus: number;
    newAbilities: string[];
  };
  warnings: string[];
}

interface TribulationEvent {
  type: 'heavenly_tribulation' | 'inner_demon' | 'dao_heart_test';
  difficulty: number;
  description: string;
  requirements: {
    willpower: number;
    preparation: number;
  };
  rewards: {
    experienceBonus: number;
    abilityUnlock?: string;
  };
  penalties: {
    failureCost: number;
    injuryRisk: number;
  };
}

class BreakthroughSystem {
  /**
   * Validate breakthrough requirements
   */
  validateBreakthrough(state: CultivationState): BreakthroughValidation {
    const realmData = CULTIVATION_REALMS[state.currentRealm];
    const maxStages = realmData?.minorStages || 10;

    // Determine breakthrough type
    const isRealmBreakthrough = state.currentStage >= maxStages;

    if (isRealmBreakthrough) {
      return this.validateRealmBreakthrough(state);
    } else {
      return this.validateStageBreakthrough(state);
    }
  }

  /**
   * Validate stage breakthrough within current realm
   */
  private validateStageBreakthrough(state: CultivationState): BreakthroughValidation {
    const realmData = CULTIVATION_REALMS[state.currentRealm];
    const nextStage = state.currentStage + 1;
    const stageConfig = cultivationStagesManager.getStageConfig(state.currentRealm, nextStage);

    if (!realmData || !stageConfig) {
      return this.createFailedValidation('Invalid realm or stage configuration');
    }

    const requirements: BreakthroughRequirement[] = [
      {
        type: 'level',
        description: 'Qi Cultivation Level',
        met: state.stats.qi.level >= stageConfig.requirements.minQiLevel,
        current: state.stats.qi.level,
        required: stageConfig.requirements.minQiLevel,
      },
      {
        type: 'level',
        description: 'Body Cultivation Level',
        met: state.stats.body.level >= stageConfig.requirements.minBodyLevel,
        current: state.stats.body.level,
        required: stageConfig.requirements.minBodyLevel,
      },
    ];

    // Add time-based requirement for bottleneck stages
    if (cultivationStagesManager.isBottleneckStage(state.currentRealm, nextStage)) {
      const timeSinceLastBreakthrough = Date.now() - (state.lastBreakthroughTime || 0);
      const requiredTime = 3600000; // 1 hour minimum

      requirements.push({
        type: 'time',
        description: 'Time Since Last Breakthrough',
        met: timeSinceLastBreakthrough >= requiredTime,
        current: Math.floor(timeSinceLastBreakthrough / 60000),
        required: Math.floor(requiredTime / 60000),
        unit: 'minutes',
      });
    }

    const cost = cultivationStagesManager.calculateStageAdvancementCost(state.currentRealm, nextStage);

    // Add resource requirements
    requirements.push(
      {
        type: 'resource',
        description: 'Qi Energy',
        met: state.currentQi >= cost.qi,
        current: state.currentQi,
        required: cost.qi,
      },
      {
        type: 'resource',
        description: 'Spirit Stones',
        met: state.spiritStones >= cost.spiritStones,
        current: state.spiritStones,
        required: cost.spiritStones,
      }
    );

    const canBreakthrough = requirements.every(req => req.met);
    const successChance = this.calculateStageBreakthroughChance(state, stageConfig);

    return {
      canBreakthrough,
      requirements,
      successChance,
      cost,
      potentialRewards: {
        qiCapacityIncrease: Math.floor(state.maxQi * stageConfig.bonuses.qiCapacityBonus),
        cultivationSpeedBonus: stageConfig.bonuses.cultivationSpeedBonus,
        newAbilities: [],
      },
      warnings: this.generateStageBreakthroughWarnings(state, nextStage),
    };
  }

  /**
   * Validate realm breakthrough to next major realm
   */
  private validateRealmBreakthrough(state: CultivationState): BreakthroughValidation {
    const currentRealmData = CULTIVATION_REALMS[state.currentRealm];
    const nextRealmName = this.getNextRealm(state.currentRealm);
    const nextRealmData = nextRealmName ? CULTIVATION_REALMS[nextRealmName] : null;

    if (!currentRealmData || !nextRealmData) {
      return this.createFailedValidation('Cannot advance beyond current realm');
    }

    const requirements: BreakthroughRequirement[] = [
      {
        type: 'level',
        description: 'Qi Cultivation Level',
        met: state.stats.qi.level >= nextRealmData.requirements.qi.level,
        current: state.stats.qi.level,
        required: nextRealmData.requirements.qi.level,
      },
      {
        type: 'level',
        description: 'Body Cultivation Level',
        met: state.stats.body.level >= nextRealmData.requirements.body.level,
        current: state.stats.body.level,
        required: nextRealmData.requirements.body.level,
      },
    ];

    // Add special requirements for higher realms
    if (nextRealmData.type === 'cultivator') {
      requirements.push({
        type: 'special',
        description: 'Dao Heart Stability',
        met: state.breakthroughAttempts <= 3, // Limited failed attempts
        current: 3 - state.breakthroughAttempts,
        required: 3,
        unit: 'remaining attempts',
      });
    }

    if (nextRealmData.type === 'immortal') {
      const dualCultivationBalance = Math.abs(state.stats.qi.level - state.stats.body.level);
      const maxImbalance = Math.max(state.stats.qi.level, state.stats.body.level) * 0.1;

      requirements.push({
        type: 'special',
        description: 'Cultivation Balance',
        met: dualCultivationBalance <= maxImbalance,
        current: dualCultivationBalance,
        required: maxImbalance,
        unit: 'level difference',
      });
    }

    const cost = this.calculateRealmBreakthroughCost(currentRealmData, nextRealmData);

    requirements.push(
      {
        type: 'resource',
        description: 'Qi Energy',
        met: state.currentQi >= cost.qi,
        current: state.currentQi,
        required: cost.qi,
      },
      {
        type: 'resource',
        description: 'Spirit Stones',
        met: state.spiritStones >= cost.spiritStones,
        current: state.spiritStones,
        required: cost.spiritStones,
      }
    );

    const canBreakthrough = requirements.every(req => req.met);
    const successChance = this.calculateRealmBreakthroughChance(state, nextRealmData);

    return {
      canBreakthrough,
      requirements,
      successChance,
      cost,
      potentialRewards: {
        qiCapacityIncrease: Math.floor(state.maxQi * (nextRealmData.benefits.qiCapacityMultiplier - 1)),
        cultivationSpeedBonus: nextRealmData.benefits.cultivationSpeedBonus,
        newAbilities: nextRealmData.abilities,
      },
      warnings: this.generateRealmBreakthroughWarnings(state, nextRealmName),
    };
  }

  /**
   * Attempt breakthrough execution
   */
  async attemptBreakthrough(state: CultivationState): Promise<BreakthroughResult> {
    const validation = this.validateBreakthrough(state);

    if (!validation.canBreakthrough) {
      return {
        success: false,
        resourcesConsumed: { qi: 0, spiritStones: 0 },
      };
    }

    // Check for tribulation events
    const tribulation = this.checkForTribulation(state);
    if (tribulation) {
      return this.handleTribulationBreakthrough(state, validation, tribulation);
    }

    // Normal breakthrough attempt
    return this.executeNormalBreakthrough(state, validation);
  }

  /**
   * Execute normal breakthrough without tribulation
   */
  private async executeNormalBreakthrough(
    state: CultivationState,
    validation: BreakthroughValidation
  ): Promise<BreakthroughResult> {
    const success = Math.random() < validation.successChance;

    const result: BreakthroughResult = {
      success,
      resourcesConsumed: validation.cost,
    };

    if (success) {
      const realmData = CULTIVATION_REALMS[state.currentRealm];
      const maxStages = realmData?.minorStages || 10;

      if (state.currentStage >= maxStages) {
        // Realm breakthrough
        const nextRealm = this.getNextRealm(state.currentRealm);
        if (nextRealm) {
          result.newRealm = nextRealm;
          result.newStage = 1;
        }
      } else {
        // Stage breakthrough
        result.newStage = state.currentStage + 1;
      }

      result.bonusGained = {
        qiCapacity: validation.potentialRewards.qiCapacityIncrease,
        cultivationSpeed: validation.potentialRewards.cultivationSpeedBonus,
      };
    }

    return result;
  }

  /**
   * Handle tribulation breakthrough
   */
  private async handleTribulationBreakthrough(
    state: CultivationState,
    validation: BreakthroughValidation,
    tribulation: TribulationEvent
  ): Promise<BreakthroughResult> {
    // Tribulation adds extra challenge but also extra rewards
    const tribulationSuccess = this.resolveTribulation(state, tribulation);
    const baseSuccess = Math.random() < validation.successChance;

    const success = tribulationSuccess && baseSuccess;

    const result: BreakthroughResult = {
      success,
      resourcesConsumed: {
        qi: validation.cost.qi * (tribulationSuccess ? 1 : 1.5),
        spiritStones: validation.cost.spiritStones,
      },
    };

    if (success) {
      const realmData = CULTIVATION_REALMS[state.currentRealm];
      const maxStages = realmData?.minorStages || 10;

      if (state.currentStage >= maxStages) {
        const nextRealm = this.getNextRealm(state.currentRealm);
        if (nextRealm) {
          result.newRealm = nextRealm;
          result.newStage = 1;
        }
      } else {
        result.newStage = state.currentStage + 1;
      }

      // Enhanced rewards from successful tribulation
      result.bonusGained = {
        qiCapacity: Math.floor(validation.potentialRewards.qiCapacityIncrease * 1.5),
        cultivationSpeed: validation.potentialRewards.cultivationSpeedBonus * 1.2,
      };
    }

    return result;
  }

  /**
   * Check if tribulation should occur
   */
  private checkForTribulation(state: CultivationState): TribulationEvent | null {
    const realmData = CULTIVATION_REALMS[state.currentRealm];
    const maxStages = realmData?.minorStages || 10;

    // Tribulations occur for realm breakthroughs or major stages
    if (state.currentStage >= maxStages) {
      const nextRealm = this.getNextRealm(state.currentRealm);
      const nextRealmData = nextRealm ? CULTIVATION_REALMS[nextRealm] : null;

      if (nextRealmData?.type === 'cultivator') {
        return this.createHeavenlyTribulation('moderate');
      } else if (nextRealmData?.type === 'immortal') {
        return this.createHeavenlyTribulation('severe');
      }
    }

    // Minor tribulations for bottleneck stages
    if (cultivationStagesManager.isBottleneckStage(state.currentRealm, state.currentStage + 1)) {
      if (Math.random() < 0.3) { // 30% chance
        return this.createInnerDemonTribulation();
      }
    }

    return null;
  }

  /**
   * Create heavenly tribulation event
   */
  private createHeavenlyTribulation(severity: 'minor' | 'moderate' | 'severe'): TribulationEvent {
    const severityConfig = {
      minor: { difficulty: 0.3, description: 'Minor Thunder Tribulation' },
      moderate: { difficulty: 0.5, description: 'Nine Heavens Thunder Tribulation' },
      severe: { difficulty: 0.8, description: 'Destroying Heaven Thunder Tribulation' },
    };

    const config = severityConfig[severity];

    return {
      type: 'heavenly_tribulation',
      difficulty: config.difficulty,
      description: config.description,
      requirements: {
        willpower: Math.floor(config.difficulty * 100),
        preparation: Math.floor(config.difficulty * 50),
      },
      rewards: {
        experienceBonus: config.difficulty * 1000,
        abilityUnlock: severity === 'severe' ? 'thunder_resistance' : undefined,
      },
      penalties: {
        failureCost: config.difficulty * 500,
        injuryRisk: config.difficulty * 0.2,
      },
    };
  }

  /**
   * Create inner demon tribulation event
   */
  private createInnerDemonTribulation(): TribulationEvent {
    return {
      type: 'inner_demon',
      difficulty: 0.4,
      description: 'Inner Demon Manifestation',
      requirements: {
        willpower: 40,
        preparation: 20,
      },
      rewards: {
        experienceBonus: 500,
      },
      penalties: {
        failureCost: 200,
        injuryRisk: 0.1,
      },
    };
  }

  /**
   * Resolve tribulation outcome
   */
  private resolveTribulation(state: CultivationState, tribulation: TribulationEvent): boolean {
    // Simple resolution based on state and tribulation difficulty
    const willpowerScore = Math.min(state.stats.qi.level + state.stats.body.level, 100);
    const preparationScore = Math.min(state.spiritStones / 100, 50);

    const totalScore = willpowerScore + preparationScore;
    const requiredScore = tribulation.requirements.willpower + tribulation.requirements.preparation;

    const successChance = Math.min(totalScore / requiredScore, 0.95);

    return Math.random() < successChance;
  }

  /**
   * Helper methods
   */
  private getNextRealm(currentRealm: string): string | null {
    const currentIndex = REALM_ORDER.indexOf(currentRealm);
    if (currentIndex === -1 || currentIndex === REALM_ORDER.length - 1) {
      return null;
    }
    return REALM_ORDER[currentIndex + 1];
  }

  private createFailedValidation(reason: string): BreakthroughValidation {
    return {
      canBreakthrough: false,
      requirements: [],
      successChance: 0,
      cost: { qi: 0, spiritStones: 0 },
      potentialRewards: {
        qiCapacityIncrease: 0,
        cultivationSpeedBonus: 0,
        newAbilities: [],
      },
      warnings: [reason],
    };
  }

  private calculateStageBreakthroughChance(state: CultivationState, stageConfig: any): number {
    let chance = CULTIVATION_CONSTANTS.BASE_BREAKTHROUGH_CHANCE;

    // Higher level bonus
    const averageLevel = (state.stats.qi.level + state.stats.body.level) / 2;
    const levelBonus = Math.min(averageLevel / 1000, 0.3);
    chance += levelBonus;

    // Technique bonus
    // This would be calculated if we had the active technique

    // Attempt penalty
    chance -= state.breakthroughAttempts * 0.05;

    return Math.max(0.05, Math.min(0.95, chance));
  }

  private calculateRealmBreakthroughChance(state: CultivationState, nextRealmData: CultivationRealm): number {
    let chance = CULTIVATION_CONSTANTS.BASE_BREAKTHROUGH_CHANCE * 0.8; // Lower base chance for realm breakthroughs

    // Requirement overfulfillment bonus
    const qiOverfulfillment = state.stats.qi.level / nextRealmData.requirements.qi.level;
    const bodyOverfulfillment = state.stats.body.level / nextRealmData.requirements.body.level;

    const overfulfillmentBonus = Math.min((qiOverfulfillment + bodyOverfulfillment - 2) * 0.1, 0.3);
    chance += overfulfillmentBonus;

    // Dual cultivation balance bonus
    const balance = 1 - Math.abs(state.stats.qi.level - state.stats.body.level) / Math.max(state.stats.qi.level, state.stats.body.level);
    chance += balance * 0.1;

    return Math.max(0.05, Math.min(0.95, chance));
  }

  private calculateRealmBreakthroughCost(
    currentRealm: CultivationRealm,
    nextRealm: CultivationRealm
  ): { qi: number; spiritStones: number } {
    const baseCost = nextRealm.breakthroughCost.base;

    return {
      qi: Math.floor(baseCost * 0.6),
      spiritStones: Math.floor(baseCost * 0.4),
    };
  }

  private generateStageBreakthroughWarnings(state: CultivationState, nextStage: number): string[] {
    const warnings: string[] = [];

    if (cultivationStagesManager.isBottleneckStage(state.currentRealm, nextStage)) {
      warnings.push('This is a bottleneck stage - progression will be slower');
    }

    if (state.breakthroughAttempts > 2) {
      warnings.push('Multiple failed attempts may affect future breakthrough chances');
    }

    return warnings;
  }

  private generateRealmBreakthroughWarnings(state: CultivationState, nextRealm: string): string[] {
    const warnings: string[] = [];
    const nextRealmData = CULTIVATION_REALMS[nextRealm];

    if (nextRealmData?.type === 'cultivator') {
      warnings.push('Entering the cultivator path - tribulations may occur');
    }

    if (nextRealmData?.type === 'immortal') {
      warnings.push('Immortal realm breakthrough - extreme tribulations expected');
    }

    const qiBodyDifference = Math.abs(state.stats.qi.level - state.stats.body.level);
    if (qiBodyDifference > 50) {
      warnings.push('Large imbalance between qi and body cultivation may cause instability');
    }

    return warnings;
  }
}

// Export singleton instance
export const breakthroughSystem = new BreakthroughSystem();

// Export types
export type { BreakthroughRequirement, BreakthroughValidation, TribulationEvent };