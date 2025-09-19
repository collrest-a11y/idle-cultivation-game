/**
 * Offline Progress Calculator - Advanced algorithms for idle gameplay
 * Handles complex offline progression with efficiency curves and resource management
 */

import {
  CultivationState,
  OfflineProgressResult,
  BackgroundProcessingConfig,
  CultivationTechnique,
  CultivationRealm,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import { cultivationService } from './cultivationService';

interface OfflineSession {
  startTime: number;
  endTime: number;
  duration: number;
  efficiency: number;
  qiProgress: number;
  bodyProgress: number;
  resourceConsumption: {
    qi: number;
    spiritStones: number;
  };
  resourceGeneration: {
    qi: number;
    spiritStones: number;
  };
}

interface DetailedOfflineResult extends OfflineProgressResult {
  sessions: OfflineSession[];
  totalSessions: number;
  averageEfficiency: number;
  levelUpsAchieved: {
    qi: number;
    body: number;
  };
  bottlenecksEncountered: number;
  recommendedActions: string[];
}

class OfflineProgressCalculator {
  private readonly SESSION_DURATION = 3600 * 1000; // 1 hour in milliseconds
  private readonly MAX_SESSIONS = 24; // Maximum 24 hours

  /**
   * Calculate detailed offline progress with session-based approach
   */
  calculateDetailedProgress(
    timeOffline: number,
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): DetailedOfflineResult {
    const maxOfflineMs = config.maxOfflineHours * 3600 * 1000;
    const effectiveTimeMs = Math.min(timeOffline, maxOfflineMs);

    // Break offline time into sessions for more accurate calculation
    const sessions = this.breakIntoSessions(effectiveTimeMs, state, config);

    // Calculate progress for each session
    const calculatedSessions = sessions.map(session =>
      this.calculateSessionProgress(session, state, config)
    );

    // Aggregate results
    const result = this.aggregateSessionResults(calculatedSessions, timeOffline);

    return result;
  }

  /**
   * Break offline time into manageable sessions
   */
  private breakIntoSessions(
    totalTime: number,
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): OfflineSession[] {
    const sessions: OfflineSession[] = [];
    const sessionCount = Math.min(
      Math.ceil(totalTime / this.SESSION_DURATION),
      this.MAX_SESSIONS
    );

    const sessionDuration = totalTime / sessionCount;

    for (let i = 0; i < sessionCount; i++) {
      const startTime = i * sessionDuration;
      const endTime = startTime + sessionDuration;

      // Calculate efficiency for this session
      const efficiency = this.calculateSessionEfficiency(
        i,
        sessionCount,
        config.efficiencyDecayRate,
        config.minEfficiency
      );

      sessions.push({
        startTime,
        endTime,
        duration: sessionDuration,
        efficiency,
        qiProgress: 0,
        bodyProgress: 0,
        resourceConsumption: { qi: 0, spiritStones: 0 },
        resourceGeneration: { qi: 0, spiritStones: 0 },
      });
    }

    return sessions;
  }

  /**
   * Calculate efficiency for a specific session
   */
  private calculateSessionEfficiency(
    sessionIndex: number,
    totalSessions: number,
    decayRate: number,
    minEfficiency: number
  ): number {
    // Efficiency starts at 100% and decays over time
    const timeRatio = sessionIndex / totalSessions;
    const efficiency = 1 - (timeRatio * decayRate);

    return Math.max(minEfficiency, efficiency);
  }

  /**
   * Calculate progress for a single session
   */
  private calculateSessionProgress(
    session: OfflineSession,
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): OfflineSession {
    const realmData = cultivationService.getRealmData(state.currentRealm);
    const techniqueData = state.activeTechnique
      ? cultivationService.getTechniqueData(state.activeTechnique)
      : null;

    if (!techniqueData || !realmData) {
      return session; // No progress without technique
    }

    // Calculate base cultivation speed
    const baseCultivationSpeed = cultivationService.calculateCultivationSpeed(
      CULTIVATION_CONSTANTS.BASE_CULTIVATION_SPEED,
      techniqueData,
      realmData,
      state.currentStage
    );

    // Apply session efficiency
    const effectiveSpeed = baseCultivationSpeed * session.efficiency;

    // Calculate progress in seconds
    const sessionSeconds = session.duration / 1000;
    const baseProgress = effectiveSpeed * sessionSeconds;

    // Apply technique multipliers
    const qiProgress = baseProgress * techniqueData.effects.qiMultiplier;
    const bodyProgress = baseProgress * techniqueData.effects.bodyMultiplier;

    // Calculate resource consumption
    const qiConsumption = techniqueData.resourceCost.qi * sessionSeconds;
    const spiritStoneConsumption = techniqueData.resourceCost.spiritStones * (sessionSeconds / 3600);

    // Calculate resource generation
    const qiGeneration = CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * sessionSeconds;
    const spiritStoneGeneration = this.calculatePassiveSpiritStoneGeneration(sessionSeconds, state);

    // Apply bottleneck effects
    const bottleneckMultiplier = this.getBottleneckMultiplier(state.stats.qi.level, state.stats.body.level);

    return {
      ...session,
      qiProgress: qiProgress * bottleneckMultiplier,
      bodyProgress: bodyProgress * bottleneckMultiplier,
      resourceConsumption: {
        qi: qiConsumption,
        spiritStones: spiritStoneConsumption,
      },
      resourceGeneration: {
        qi: qiGeneration,
        spiritStones: spiritStoneGeneration,
      },
    };
  }

  /**
   * Calculate passive spirit stone generation
   */
  private calculatePassiveSpiritStoneGeneration(sessionSeconds: number, state: CultivationState): number {
    const baseRate = 0.1; // Base rate per hour
    const realmMultiplier = this.getRealmSpiritStoneMultiplier(state.currentRealm);
    const levelBonus = Math.log(state.stats.qi.level + state.stats.body.level + 1) / 10;

    const hourlyRate = baseRate * realmMultiplier * (1 + levelBonus);
    return (sessionSeconds / 3600) * hourlyRate;
  }

  /**
   * Get spirit stone generation multiplier based on realm
   */
  private getRealmSpiritStoneMultiplier(realm: string): number {
    const multipliers: Record<string, number> = {
      'Body Refinement': 1.0,
      'Qi Gathering': 1.2,
      'Foundation Building': 1.5,
      'Core Formation': 2.0,
      'Nascent Soul': 3.0,
      'Soul Transformation': 4.0,
      'Void Refining': 6.0,
      'Body Integration': 8.0,
      'Mahayana': 12.0,
      'True Immortal': 20.0,
    };

    return multipliers[realm] || 1.0;
  }

  /**
   * Calculate combined bottleneck multiplier
   */
  private getBottleneckMultiplier(qiLevel: number, bodyLevel: number): number {
    const qiBottleneck = cultivationService.isInBottleneck(qiLevel) ? 0.5 : 1.0;
    const bodyBottleneck = cultivationService.isInBottleneck(bodyLevel) ? 0.5 : 1.0;

    // Use the worse bottleneck effect
    return Math.min(qiBottleneck, bodyBottleneck);
  }

  /**
   * Aggregate results from all sessions
   */
  private aggregateSessionResults(sessions: OfflineSession[], originalTimeOffline: number): DetailedOfflineResult {
    const totalQiGained = sessions.reduce((sum, session) => sum + session.qiProgress, 0);
    const totalBodyGained = sessions.reduce((sum, session) => sum + session.bodyProgress, 0);

    const totalQiConsumed = sessions.reduce((sum, session) => sum + session.resourceConsumption.qi, 0);
    const totalSpiritStonesConsumed = sessions.reduce((sum, session) => sum + session.resourceConsumption.spiritStones, 0);

    const totalQiGenerated = sessions.reduce((sum, session) => sum + session.resourceGeneration.qi, 0);
    const totalSpiritStonesGenerated = sessions.reduce((sum, session) => sum + session.resourceGeneration.spiritStones, 0);

    const averageEfficiency = sessions.reduce((sum, session) => sum + session.efficiency, 0) / sessions.length;

    // Calculate net resource changes
    const netQiGain = totalQiGenerated - totalQiConsumed;
    const netSpiritStoneGain = totalSpiritStonesGenerated - totalSpiritStonesConsumed;

    // Count bottlenecks encountered
    const bottlenecksEncountered = sessions.filter(session => session.efficiency < 0.8).length;

    // Generate recommendations
    const recommendedActions = this.generateRecommendations(sessions, averageEfficiency);

    return {
      timeOffline: originalTimeOffline,
      qiGained: Math.max(0, totalQiGained),
      bodyGained: Math.max(0, totalBodyGained),
      resourcesGained: {
        qi: Math.max(0, netQiGain),
        spiritStones: Math.max(0, netSpiritStoneGain),
      },
      breakthroughsAchieved: 0, // No automatic breakthroughs offline
      efficiencyUsed: averageEfficiency,
      sessions,
      totalSessions: sessions.length,
      averageEfficiency,
      levelUpsAchieved: {
        qi: this.estimateLevelUps(totalQiGained, 'qi'),
        body: this.estimateLevelUps(totalBodyGained, 'body'),
      },
      bottlenecksEncountered,
      recommendedActions,
    };
  }

  /**
   * Estimate level ups from experience gained
   */
  private estimateLevelUps(experienceGained: number, type: 'qi' | 'body'): number {
    let levelUps = 0;
    let currentExp = experienceGained;
    let currentLevel = 1; // Simplified estimation

    while (currentExp > 0) {
      const expRequired = cultivationService.calculateExperienceToNext(currentLevel, 'Body Refinement');
      if (currentExp >= expRequired) {
        currentExp -= expRequired;
        levelUps++;
        currentLevel++;
      } else {
        break;
      }

      // Prevent infinite loops
      if (levelUps > 100) break;
    }

    return levelUps;
  }

  /**
   * Generate recommendations based on offline session performance
   */
  private generateRecommendations(sessions: OfflineSession[], averageEfficiency: number): string[] {
    const recommendations: string[] = [];

    if (averageEfficiency < 0.5) {
      recommendations.push('Consider staying online more frequently to maintain cultivation efficiency');
    }

    if (sessions.some(session => session.resourceConsumption.spiritStones > session.resourceGeneration.spiritStones)) {
      recommendations.push('Your spirit stone consumption exceeds generation - consider switching techniques');
    }

    if (sessions.length >= 12) { // More than 12 hours offline
      recommendations.push('Long offline periods reduce efficiency - consider checking in more frequently');
    }

    const lowEfficiencySessions = sessions.filter(session => session.efficiency < 0.3).length;
    if (lowEfficiencySessions > sessions.length / 2) {
      recommendations.push('Efficiency dropped significantly - offline cultivation is less effective for extended periods');
    }

    if (recommendations.length === 0) {
      recommendations.push('Offline cultivation was efficient - good progress achieved');
    }

    return recommendations;
  }

  /**
   * Quick offline calculation for simple scenarios
   */
  calculateQuickOfflineProgress(
    timeOffline: number,
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): OfflineProgressResult {
    // Use the existing service method for simple cases
    return cultivationService.calculateOfflineProgress(timeOffline, state, config);
  }

  /**
   * Calculate optimal offline time for maximum efficiency
   */
  calculateOptimalOfflineTime(
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): number {
    // Find the point where efficiency drops below 70%
    const targetEfficiency = 0.7;
    const decayRate = config.efficiencyDecayRate;

    // Solve: 1 - (t / maxHours) * decayRate = targetEfficiency
    // t = maxHours * (1 - targetEfficiency) / decayRate

    const optimalHours = config.maxOfflineHours * (1 - targetEfficiency) / decayRate;
    return Math.max(1, Math.min(optimalHours, config.maxOfflineHours)) * 3600 * 1000; // Convert to milliseconds
  }

  /**
   * Predict offline progress without actually applying it
   */
  predictOfflineProgress(
    timeOffline: number,
    state: CultivationState,
    config: BackgroundProcessingConfig
  ): DetailedOfflineResult {
    // Create a copy of state to avoid mutations
    const stateCopy: CultivationState = JSON.parse(JSON.stringify(state));
    return this.calculateDetailedProgress(timeOffline, stateCopy, config);
  }
}

// Export singleton instance
export const offlineProgressCalculator = new OfflineProgressCalculator();

// Export utility functions for external use
export const OfflineUtils = {
  formatOfflineTime: (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },

  formatProgress: (progress: number): string => {
    if (progress >= 1000000) {
      return `${(progress / 1000000).toFixed(1)}M`;
    }
    if (progress >= 1000) {
      return `${(progress / 1000).toFixed(1)}K`;
    }
    return Math.floor(progress).toString();
  },

  calculateEfficiencyColor: (efficiency: number): string => {
    if (efficiency >= 0.8) return '#4CAF50'; // Green
    if (efficiency >= 0.6) return '#FF9800'; // Orange
    if (efficiency >= 0.4) return '#F44336'; // Red
    return '#9E9E9E'; // Gray
  },

  getEfficiencyDescription: (efficiency: number): string => {
    if (efficiency >= 0.9) return 'Excellent';
    if (efficiency >= 0.7) return 'Good';
    if (efficiency >= 0.5) return 'Fair';
    if (efficiency >= 0.3) return 'Poor';
    return 'Very Poor';
  },
};