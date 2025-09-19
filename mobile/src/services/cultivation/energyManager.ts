/**
 * Energy Manager - Advanced qi/energy management with regeneration mechanics
 * Handles qi consumption, regeneration, and energy efficiency systems
 */

import {
  CultivationState,
  CultivationResources,
  CultivationTechnique,
  CultivationRealm,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import { cultivationService } from './cultivationService';

interface EnergySource {
  id: string;
  name: string;
  baseRate: number;
  multiplier: number;
  conditions: {
    minLevel?: number;
    maxLevel?: number;
    realm?: string;
    timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  };
  description: string;
}

interface EnergyDrain {
  source: string;
  rate: number;
  description: string;
  canOptimize: boolean;
}

interface EnergyEfficiency {
  current: number;
  maximum: number;
  factors: {
    cultivation: number;
    technique: number;
    environment: number;
    health: number;
  };
  recommendations: string[];
}

interface QiRegeneration {
  baseRate: number;
  bonusRate: number;
  totalRate: number;
  sources: EnergySource[];
  drains: EnergyDrain[];
  efficiency: EnergyEfficiency;
  nextRegenTime: number;
}

class EnergyManager {
  private energySources: Map<string, EnergySource> = new Map();
  private readonly REGEN_INTERVAL = 1000; // 1 second
  private readonly TIME_CYCLE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initializeEnergySources();
  }

  /**
   * Initialize energy sources with different regeneration rates
   */
  private initializeEnergySources(): void {
    // Base natural regeneration
    this.energySources.set('natural', {
      id: 'natural',
      name: 'Natural Recovery',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE,
      multiplier: 1.0,
      conditions: {},
      description: 'Basic qi regeneration from breathing and rest',
    });

    // Meditation regeneration
    this.energySources.set('meditation', {
      id: 'meditation',
      name: 'Meditation State',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 2,
      multiplier: 1.5,
      conditions: {},
      description: 'Enhanced regeneration during meditation',
    });

    // Environmental regeneration
    this.energySources.set('spiritual_environment', {
      id: 'spiritual_environment',
      name: 'Spiritual Environment',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 0.5,
      multiplier: 1.2,
      conditions: {},
      description: 'Bonus regeneration from spiritual-rich environment',
    });

    // Time-based regeneration
    this.energySources.set('dawn_qi', {
      id: 'dawn_qi',
      name: 'Dawn Qi Surge',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 3,
      multiplier: 2.0,
      conditions: { timeOfDay: 'dawn' },
      description: 'Peak qi absorption during dawn hours',
    });

    this.energySources.set('night_cultivation', {
      id: 'night_cultivation',
      name: 'Night Cultivation',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 1.5,
      multiplier: 1.3,
      conditions: { timeOfDay: 'night' },
      description: 'Enhanced yin qi absorption during night',
    });

    // Realm-specific sources
    this.energySources.set('core_resonance', {
      id: 'core_resonance',
      name: 'Golden Core Resonance',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 4,
      multiplier: 2.5,
      conditions: { realm: 'Core Formation' },
      description: 'Golden core generates internal qi',
    });

    this.energySources.set('nascent_soul_generation', {
      id: 'nascent_soul_generation',
      name: 'Nascent Soul Generation',
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 8,
      multiplier: 4.0,
      conditions: { realm: 'Nascent Soul' },
      description: 'Nascent soul continuously generates qi',
    });
  }

  /**
   * Calculate current qi regeneration rate
   */
  calculateQiRegeneration(
    state: CultivationState,
    resources: CultivationResources,
    isCultivating: boolean = false
  ): QiRegeneration {
    const activeSources = this.getActiveSources(state, isCultivating);
    const activeDrains = this.getActiveDrains(state, isCultivating);

    let totalRegenRate = 0;
    let bonusRate = 0;

    // Calculate base regeneration from all active sources
    activeSources.forEach(source => {
      const sourceRate = this.calculateSourceRate(source, state);
      totalRegenRate += sourceRate;

      if (source.id !== 'natural') {
        bonusRate += sourceRate;
      }
    });

    // Apply efficiency multiplier
    const efficiency = this.calculateEnergyEfficiency(state, resources);
    totalRegenRate *= efficiency.current;

    // Subtract drains
    activeDrains.forEach(drain => {
      totalRegenRate -= drain.rate;
    });

    // Ensure non-negative rate
    totalRegenRate = Math.max(0, totalRegenRate);

    return {
      baseRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE,
      bonusRate,
      totalRate: totalRegenRate,
      sources: activeSources,
      drains: activeDrains,
      efficiency,
      nextRegenTime: Date.now() + this.REGEN_INTERVAL,
    };
  }

  /**
   * Get active energy sources based on current state
   */
  private getActiveSources(state: CultivationState, isCultivating: boolean): EnergySource[] {
    const activeSources: EnergySource[] = [];
    const currentTimeOfDay = this.getCurrentTimeOfDay();

    this.energySources.forEach(source => {
      if (this.isSourceActive(source, state, currentTimeOfDay, isCultivating)) {
        activeSources.push(source);
      }
    });

    return activeSources;
  }

  /**
   * Check if energy source is active
   */
  private isSourceActive(
    source: EnergySource,
    state: CultivationState,
    timeOfDay: string,
    isCultivating: boolean
  ): boolean {
    const { conditions } = source;

    // Check realm condition
    if (conditions.realm && conditions.realm !== state.currentRealm) {
      return false;
    }

    // Check level conditions
    const averageLevel = (state.stats.qi.level + state.stats.body.level) / 2;
    if (conditions.minLevel && averageLevel < conditions.minLevel) {
      return false;
    }
    if (conditions.maxLevel && averageLevel > conditions.maxLevel) {
      return false;
    }

    // Check time of day condition
    if (conditions.timeOfDay && conditions.timeOfDay !== timeOfDay) {
      return false;
    }

    // Special conditions
    if (source.id === 'meditation' && !isCultivating) {
      return false; // Meditation regeneration only when cultivating
    }

    return true;
  }

  /**
   * Calculate regeneration rate for a specific source
   */
  private calculateSourceRate(source: EnergySource, state: CultivationState): number {
    let rate = source.baseRate * source.multiplier;

    // Apply level scaling
    const averageLevel = (state.stats.qi.level + state.stats.body.level) / 2;
    const levelMultiplier = 1 + (averageLevel / 1000);
    rate *= levelMultiplier;

    // Apply realm scaling
    const realmData = cultivationService.getRealmData(state.currentRealm);
    if (realmData) {
      const realmMultiplier = 1 + realmData.benefits.cultivationSpeedBonus;
      rate *= realmMultiplier;
    }

    return rate;
  }

  /**
   * Get active energy drains
   */
  private getActiveDrains(state: CultivationState, isCultivating: boolean): EnergyDrain[] {
    const drains: EnergyDrain[] = [];

    if (isCultivating && state.activeTechnique) {
      const techniqueData = cultivationService.getTechniqueData(state.activeTechnique);
      if (techniqueData) {
        drains.push({
          source: 'technique_consumption',
          rate: techniqueData.resourceCost.qi,
          description: `${techniqueData.name} qi consumption`,
          canOptimize: true,
        });
      }
    }

    // Environmental drains
    if (this.isInHarshEnvironment(state)) {
      drains.push({
        source: 'harsh_environment',
        rate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * 0.2,
        description: 'Harsh environment qi drain',
        canOptimize: false,
      });
    }

    return drains;
  }

  /**
   * Calculate energy efficiency
   */
  private calculateEnergyEfficiency(state: CultivationState, resources: CultivationResources): EnergyEfficiency {
    const factors = {
      cultivation: this.calculateCultivationFactor(state),
      technique: this.calculateTechniqueFactor(state),
      environment: this.calculateEnvironmentFactor(state),
      health: this.calculateHealthFactor(state, resources),
    };

    const current = Object.values(factors).reduce((sum, factor) => sum * factor, 1.0);
    const maximum = 2.0; // Maximum possible efficiency

    const recommendations = this.generateEfficiencyRecommendations(factors);

    return {
      current: Math.min(current, maximum),
      maximum,
      factors,
      recommendations,
    };
  }

  /**
   * Calculate cultivation level factor
   */
  private calculateCultivationFactor(state: CultivationState): number {
    const averageLevel = (state.stats.qi.level + state.stats.body.level) / 2;
    return 0.8 + (averageLevel / 1000) * 0.4; // 0.8 to 1.2 range
  }

  /**
   * Calculate technique efficiency factor
   */
  private calculateTechniqueFactor(state: CultivationState): number {
    if (!state.activeTechnique) return 1.0;

    const techniqueData = cultivationService.getTechniqueData(state.activeTechnique);
    if (!techniqueData) return 1.0;

    // Higher rarity techniques are more efficient
    const rarityBonus = {
      common: 1.0,
      rare: 1.1,
      epic: 1.2,
      legendary: 1.3,
    };

    return rarityBonus[techniqueData.rarity] || 1.0;
  }

  /**
   * Calculate environment factor
   */
  private calculateEnvironmentFactor(state: CultivationState): number {
    // Simplified environmental factor
    const realmData = cultivationService.getRealmData(state.currentRealm);
    if (!realmData) return 1.0;

    // Higher realms have better qi environments
    const realmBonus = {
      mortal: 1.0,
      cultivator: 1.1,
      immortal: 1.2,
    };

    return realmBonus[realmData.type] || 1.0;
  }

  /**
   * Calculate health/condition factor
   */
  private calculateHealthFactor(state: CultivationState, resources: CultivationResources): number {
    // Qi ratio affects efficiency
    const qiRatio = resources.qi.current / resources.qi.max;

    if (qiRatio > 0.8) return 1.1; // High qi = better efficiency
    if (qiRatio > 0.5) return 1.0; // Normal efficiency
    if (qiRatio > 0.2) return 0.9; // Low qi = reduced efficiency
    return 0.7; // Very low qi = poor efficiency
  }

  /**
   * Generate efficiency improvement recommendations
   */
  private generateEfficiencyRecommendations(factors: any): string[] {
    const recommendations: string[] = [];

    if (factors.cultivation < 1.0) {
      recommendations.push('Increase cultivation levels to improve qi efficiency');
    }

    if (factors.technique < 1.1) {
      recommendations.push('Use higher rarity techniques for better qi efficiency');
    }

    if (factors.health < 1.0) {
      recommendations.push('Maintain higher qi levels for optimal efficiency');
    }

    if (factors.environment < 1.1) {
      recommendations.push('Seek spiritual environments to enhance qi absorption');
    }

    return recommendations;
  }

  /**
   * Apply qi regeneration over time
   */
  regenerateQi(
    resources: CultivationResources,
    regenData: QiRegeneration,
    deltaTime: number
  ): { newCurrent: number; overflow: number } {
    const regenAmount = regenData.totalRate * (deltaTime / 1000);
    const newCurrent = Math.min(resources.qi.current + regenAmount, resources.qi.max);
    const overflow = Math.max(0, resources.qi.current + regenAmount - resources.qi.max);

    return { newCurrent, overflow };
  }

  /**
   * Calculate qi consumption for technique
   */
  calculateTechniqueConsumption(
    technique: CultivationTechnique,
    state: CultivationState,
    deltaTime: number
  ): number {
    let consumption = technique.resourceCost.qi * (deltaTime / 1000);

    // Apply efficiency modifiers
    const efficiency = this.calculateEnergyEfficiency(state, {} as CultivationResources);
    consumption /= efficiency.current;

    return consumption;
  }

  /**
   * Optimize energy usage
   */
  optimizeEnergyUsage(state: CultivationState, resources: CultivationResources): {
    recommendedTechnique: string | null;
    energySettings: {
      meditation: boolean;
      environmentBonus: boolean;
    };
    estimatedImprovement: number;
  } {
    const currentRegen = this.calculateQiRegeneration(state, resources, state.isCultivating);

    // Find most efficient technique
    const availableTechniques = cultivationService.getAvailableTechniques(state);
    let bestTechnique: CultivationTechnique | null = null;
    let bestEfficiency = 0;

    availableTechniques.forEach(technique => {
      const consumption = this.calculateTechniqueConsumption(technique, state, 1000);
      const efficiency = technique.effects.qiMultiplier / consumption;

      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestTechnique = technique;
      }
    });

    return {
      recommendedTechnique: bestTechnique?.id || null,
      energySettings: {
        meditation: !state.isCultivating && resources.qi.current < resources.qi.max * 0.8,
        environmentBonus: true,
      },
      estimatedImprovement: bestEfficiency / (currentRegen.totalRate || 1),
    };
  }

  /**
   * Helper methods
   */
  private getCurrentTimeOfDay(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
  }

  private isInHarshEnvironment(state: CultivationState): boolean {
    // Simplified - could be based on location or other factors
    return false;
  }

  /**
   * Get qi capacity for current state
   */
  calculateQiCapacity(state: CultivationState): number {
    const realmData = cultivationService.getRealmData(state.currentRealm);
    if (!realmData) return CULTIVATION_CONSTANTS.QI_CAPACITY_BASE;

    const baseCapacity = CULTIVATION_CONSTANTS.QI_CAPACITY_BASE;
    const realmMultiplier = realmData.benefits.qiCapacityMultiplier;
    const stageMultiplier = 1 + (state.currentStage * 0.1);
    const levelMultiplier = 1 + ((state.stats.qi.level + state.stats.body.level) / 2) * 0.05;

    return Math.floor(baseCapacity * realmMultiplier * stageMultiplier * levelMultiplier);
  }

  /**
   * Check if qi is sufficient for action
   */
  canPerformAction(
    currentQi: number,
    requiredQi: number,
    reservePercentage: number = 0.1
  ): boolean {
    const reserve = currentQi * reservePercentage;
    return (currentQi - reserve) >= requiredQi;
  }

  /**
   * Get qi status description
   */
  getQiStatusDescription(current: number, max: number): {
    status: string;
    color: string;
    description: string;
  } {
    const ratio = current / max;

    if (ratio >= 0.9) {
      return {
        status: 'Abundant',
        color: '#4CAF50',
        description: 'Qi flows freely, optimal cultivation conditions',
      };
    } else if (ratio >= 0.7) {
      return {
        status: 'Sufficient',
        color: '#8BC34A',
        description: 'Good qi levels, cultivation proceeding well',
      };
    } else if (ratio >= 0.5) {
      return {
        status: 'Moderate',
        color: '#FF9800',
        description: 'Moderate qi levels, consider rest or meditation',
      };
    } else if (ratio >= 0.3) {
      return {
        status: 'Low',
        color: '#F44336',
        description: 'Low qi levels, cultivation efficiency reduced',
      };
    } else {
      return {
        status: 'Depleted',
        color: '#9E9E9E',
        description: 'Qi nearly exhausted, immediate rest required',
      };
    }
  }
}

// Export singleton instance
export const energyManager = new EnergyManager();

// Export types
export type { EnergySource, EnergyDrain, EnergyEfficiency, QiRegeneration };