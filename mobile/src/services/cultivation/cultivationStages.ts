/**
 * Cultivation Stages System - Manages progression rates and stage-specific mechanics
 * Handles different progression rates for each cultivation stage and realm
 */

import {
  CultivationState,
  CultivationRealm,
  CultivationTechnique,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import { CULTIVATION_REALMS } from './cultivationData';

interface StageProgression {
  stageNumber: number;
  progressionRate: number;
  difficultyMultiplier: number;
  requirements: {
    minQiLevel: number;
    minBodyLevel: number;
    experienceThreshold: number;
  };
  bonuses: {
    qiCapacityBonus: number;
    cultivationSpeedBonus: number;
    breakthroughChanceBonus: number;
  };
  description: string;
}

interface RealmStageConfig {
  realmName: string;
  stages: StageProgression[];
  realmBonuses: {
    earlyStageBonus: number; // Bonus for stages 1-3
    midStageBonus: number;   // Bonus for stages 4-6
    lateStageBonus: number;  // Bonus for stages 7-10
  };
  bottlenecks: number[]; // Stage numbers that are particularly difficult
}

class CultivationStagesManager {
  private stageConfigs: Map<string, RealmStageConfig> = new Map();

  constructor() {
    this.initializeStageConfigs();
  }

  /**
   * Initialize stage configurations for all realms
   */
  private initializeStageConfigs(): void {
    // Body Refinement - Early mortal stages
    this.stageConfigs.set('Body Refinement', {
      realmName: 'Body Refinement',
      stages: this.generateStageProgressions(10, {
        baseRate: 1.0,
        difficultyGrowth: 1.1,
        bonusGrowth: 0.05,
      }),
      realmBonuses: {
        earlyStageBonus: 0.2,
        midStageBonus: 0.1,
        lateStageBonus: 0.05,
      },
      bottlenecks: [5, 9], // Mid and near-peak stages
    });

    // Qi Gathering - Learning to manipulate qi
    this.stageConfigs.set('Qi Gathering', {
      realmName: 'Qi Gathering',
      stages: this.generateStageProgressions(10, {
        baseRate: 0.9,
        difficultyGrowth: 1.15,
        bonusGrowth: 0.08,
      }),
      realmBonuses: {
        earlyStageBonus: 0.15,
        midStageBonus: 0.2,
        lateStageBonus: 0.1,
      },
      bottlenecks: [4, 7, 10],
    });

    // Foundation Building - Building cultivation foundation
    this.stageConfigs.set('Foundation Building', {
      realmName: 'Foundation Building',
      stages: this.generateStageProgressions(10, {
        baseRate: 0.8,
        difficultyGrowth: 1.2,
        bonusGrowth: 0.1,
      }),
      realmBonuses: {
        earlyStageBonus: 0.1,
        midStageBonus: 0.15,
        lateStageBonus: 0.2,
      },
      bottlenecks: [3, 6, 9],
    });

    // Core Formation - Major cultivator milestone
    this.stageConfigs.set('Core Formation', {
      realmName: 'Core Formation',
      stages: this.generateStageProgressions(9, {
        baseRate: 0.7,
        difficultyGrowth: 1.25,
        bonusGrowth: 0.12,
      }),
      realmBonuses: {
        earlyStageBonus: 0.05,
        midStageBonus: 0.1,
        lateStageBonus: 0.25,
      },
      bottlenecks: [3, 6, 9], // Core condensation phases
    });

    // Nascent Soul - Soul development
    this.stageConfigs.set('Nascent Soul', {
      realmName: 'Nascent Soul',
      stages: this.generateStageProgressions(9, {
        baseRate: 0.6,
        difficultyGrowth: 1.3,
        bonusGrowth: 0.15,
      }),
      realmBonuses: {
        earlyStageBonus: 0.0,
        midStageBonus: 0.15,
        lateStageBonus: 0.3,
      },
      bottlenecks: [3, 6, 9],
    });

    // Soul Transformation - Transcending mortality
    this.stageConfigs.set('Soul Transformation', {
      realmName: 'Soul Transformation',
      stages: this.generateStageProgressions(9, {
        baseRate: 0.5,
        difficultyGrowth: 1.35,
        bonusGrowth: 0.18,
      }),
      realmBonuses: {
        earlyStageBonus: 0.0,
        midStageBonus: 0.1,
        lateStageBonus: 0.4,
      },
      bottlenecks: [3, 6, 9],
    });

    // Immortal realms with extreme difficulty
    this.addImmortalRealmConfigs();
  }

  /**
   * Add configurations for immortal realms
   */
  private addImmortalRealmConfigs(): void {
    const immortalRealms = ['Void Refining', 'Body Integration', 'Mahayana'];

    immortalRealms.forEach((realm, index) => {
      this.stageConfigs.set(realm, {
        realmName: realm,
        stages: this.generateStageProgressions(9, {
          baseRate: 0.4 - (index * 0.05),
          difficultyGrowth: 1.4 + (index * 0.05),
          bonusGrowth: 0.2 + (index * 0.05),
        }),
        realmBonuses: {
          earlyStageBonus: 0.0,
          midStageBonus: 0.05,
          lateStageBonus: 0.5 + (index * 0.1),
        },
        bottlenecks: [3, 6, 9],
      });
    });

    // True Immortal - Ultimate realm
    this.stageConfigs.set('True Immortal', {
      realmName: 'True Immortal',
      stages: this.generateStageProgressions(99, {
        baseRate: 0.2,
        difficultyGrowth: 1.02, // Much slower growth due to many stages
        bonusGrowth: 0.01,
      }),
      realmBonuses: {
        earlyStageBonus: 0.0,
        midStageBonus: 0.0,
        lateStageBonus: 1.0,
      },
      bottlenecks: [9, 19, 29, 39, 49, 59, 69, 79, 89, 99], // Every 10 stages
    });
  }

  /**
   * Generate stage progressions for a realm
   */
  private generateStageProgressions(
    stageCount: number,
    config: {
      baseRate: number;
      difficultyGrowth: number;
      bonusGrowth: number;
    }
  ): StageProgression[] {
    const stages: StageProgression[] = [];

    for (let i = 1; i <= stageCount; i++) {
      const progressionRate = config.baseRate * Math.pow(config.difficultyGrowth, -(i - 1));
      const difficultyMultiplier = Math.pow(config.difficultyGrowth, i - 1);

      stages.push({
        stageNumber: i,
        progressionRate,
        difficultyMultiplier,
        requirements: {
          minQiLevel: Math.floor(10 * i * difficultyMultiplier),
          minBodyLevel: Math.floor(8 * i * difficultyMultiplier),
          experienceThreshold: Math.floor(1000 * difficultyMultiplier),
        },
        bonuses: {
          qiCapacityBonus: config.bonusGrowth * i,
          cultivationSpeedBonus: config.bonusGrowth * 0.5 * i,
          breakthroughChanceBonus: config.bonusGrowth * 0.3 * i,
        },
        description: this.generateStageDescription(i, stageCount),
      });
    }

    return stages;
  }

  /**
   * Generate description for a stage
   */
  private generateStageDescription(stage: number, maxStages: number): string {
    const percentage = (stage / maxStages) * 100;

    if (percentage <= 30) {
      return `Early ${this.getStagePhase(stage)} - Foundation building phase`;
    } else if (percentage <= 70) {
      return `Mid ${this.getStagePhase(stage)} - Steady progression phase`;
    } else {
      return `Late ${this.getStagePhase(stage)} - Mastery phase`;
    }
  }

  /**
   * Get stage phase name
   */
  private getStagePhase(stage: number): string {
    const phases = [
      'Initial', 'Early', 'Lower', 'Mid-Lower', 'Middle',
      'Mid-Upper', 'Upper', 'Late', 'Peak', 'Perfection'
    ];

    return phases[Math.min(stage - 1, phases.length - 1)];
  }

  /**
   * Get stage configuration for a specific realm and stage
   */
  getStageConfig(realm: string, stage: number): StageProgression | null {
    const realmConfig = this.stageConfigs.get(realm);
    if (!realmConfig) return null;

    return realmConfig.stages.find(s => s.stageNumber === stage) || null;
  }

  /**
   * Get realm stage configuration
   */
  getRealmConfig(realm: string): RealmStageConfig | null {
    return this.stageConfigs.get(realm) || null;
  }

  /**
   * Calculate stage-modified cultivation speed
   */
  calculateStageModifiedSpeed(
    baseSpeed: number,
    realm: string,
    stage: number,
    technique: CultivationTechnique | null
  ): number {
    const stageConfig = this.getStageConfig(realm, stage);
    const realmConfig = this.getRealmConfig(realm);

    if (!stageConfig || !realmConfig) return baseSpeed;

    let modifiedSpeed = baseSpeed * stageConfig.progressionRate;

    // Apply realm bonuses based on stage
    const stageCount = realmConfig.stages.length;
    const stageRatio = stage / stageCount;

    if (stageRatio <= 0.3) {
      modifiedSpeed *= (1 + realmConfig.realmBonuses.earlyStageBonus);
    } else if (stageRatio <= 0.7) {
      modifiedSpeed *= (1 + realmConfig.realmBonuses.midStageBonus);
    } else {
      modifiedSpeed *= (1 + realmConfig.realmBonuses.lateStageBonus);
    }

    // Apply bottleneck penalties
    if (realmConfig.bottlenecks.includes(stage)) {
      modifiedSpeed *= 0.5; // 50% penalty for bottleneck stages
    }

    // Apply technique synergy
    if (technique) {
      const synergyBonus = this.calculateTechniqueStageSynergy(technique, realm, stage);
      modifiedSpeed *= (1 + synergyBonus);
    }

    return modifiedSpeed;
  }

  /**
   * Calculate technique synergy with current stage
   */
  private calculateTechniqueStageSynergy(
    technique: CultivationTechnique,
    realm: string,
    stage: number
  ): number {
    // Techniques work better in their intended realm
    const techniqueRealm = technique.unlockRequirements.realm;
    if (techniqueRealm && techniqueRealm === realm) {
      return 0.2; // 20% bonus for matching realm
    }

    // Dual cultivation techniques work better in later stages
    if (technique.type === 'dual' && stage >= 5) {
      return 0.15;
    }

    // Specialized techniques work better in early stages
    if ((technique.type === 'qi' || technique.type === 'body') && stage <= 3) {
      return 0.1;
    }

    return 0;
  }

  /**
   * Check if stage advancement is possible
   */
  canAdvanceStage(state: CultivationState): boolean {
    const stageConfig = this.getStageConfig(state.currentRealm, state.currentStage);
    if (!stageConfig) return false;

    return (
      state.stats.qi.level >= stageConfig.requirements.minQiLevel &&
      state.stats.body.level >= stageConfig.requirements.minBodyLevel
    );
  }

  /**
   * Get next stage requirements
   */
  getNextStageRequirements(realm: string, currentStage: number): StageProgression | null {
    return this.getStageConfig(realm, currentStage + 1);
  }

  /**
   * Calculate stage advancement cost
   */
  calculateStageAdvancementCost(realm: string, stage: number): { qi: number; spiritStones: number } {
    const realmData = CULTIVATION_REALMS[realm];
    const stageConfig = this.getStageConfig(realm, stage);

    if (!realmData || !stageConfig) {
      return { qi: 0, spiritStones: 0 };
    }

    const baseCost = realmData.breakthroughCost.base * Math.pow(realmData.breakthroughCost.multiplier, stage - 1);
    const stageCost = baseCost * stageConfig.difficultyMultiplier;

    return {
      qi: Math.floor(stageCost * 0.6),
      spiritStones: Math.floor(stageCost * 0.4),
    };
  }

  /**
   * Get stage progress percentage
   */
  getStageProgressPercentage(state: CultivationState): number {
    const currentStageConfig = this.getStageConfig(state.currentRealm, state.currentStage);
    const nextStageConfig = this.getNextStageRequirements(state.currentRealm, state.currentStage);

    if (!currentStageConfig || !nextStageConfig) return 100;

    const qiProgress = Math.min(
      state.stats.qi.level / nextStageConfig.requirements.minQiLevel,
      1
    );
    const bodyProgress = Math.min(
      state.stats.body.level / nextStageConfig.requirements.minBodyLevel,
      1
    );

    return Math.min(qiProgress, bodyProgress) * 100;
  }

  /**
   * Get all stages for a realm
   */
  getAllStagesForRealm(realm: string): StageProgression[] {
    const config = this.getRealmConfig(realm);
    return config ? config.stages : [];
  }

  /**
   * Check if current stage is a bottleneck
   */
  isBottleneckStage(realm: string, stage: number): boolean {
    const config = this.getRealmConfig(realm);
    return config ? config.bottlenecks.includes(stage) : false;
  }

  /**
   * Get stage name/title
   */
  getStageTitle(realm: string, stage: number): string {
    const stageConfig = this.getStageConfig(realm, stage);
    if (!stageConfig) return `Stage ${stage}`;

    const maxStages = this.getRealmConfig(realm)?.stages.length || 10;
    return `${this.getStagePhase(stage)} Stage (${stage}/${maxStages})`;
  }

  /**
   * Calculate total realm progression percentage
   */
  getRealmProgressPercentage(state: CultivationState): number {
    const realmConfig = this.getRealmConfig(state.currentRealm);
    if (!realmConfig) return 0;

    const totalStages = realmConfig.stages.length;
    const completedStages = state.currentStage - 1;
    const currentStageProgress = this.getStageProgressPercentage(state) / 100;

    return ((completedStages + currentStageProgress) / totalStages) * 100;
  }
}

// Export singleton instance
export const cultivationStagesManager = new CultivationStagesManager();

// Export types for external use
export type { StageProgression, RealmStageConfig };