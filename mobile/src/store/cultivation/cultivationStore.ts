/**
 * Cultivation Store - Zustand store for cultivation state management
 * Handles all cultivation-related state, actions, and persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CultivationStore,
  CultivationState,
  CultivationResources,
  BackgroundProcessingConfig,
  CultivationEvent,
  CultivationEventData,
  BreakthroughResult,
  OfflineProgressResult,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import { cultivationService } from '../../services/cultivation/cultivationService';

// Initial state
const createInitialState = (): CultivationState => ({
  stats: {
    qi: {
      level: 1,
      experience: 0,
      experienceToNext: CULTIVATION_CONSTANTS.EXP_BASE,
    },
    body: {
      level: 1,
      experience: 0,
      experienceToNext: CULTIVATION_CONSTANTS.EXP_BASE,
    },
  },
  currentRealm: 'Body Refinement',
  currentStage: 1,
  activeTechnique: null,
  unlockedTechniques: ['Heaven and Earth Mantra'],
  currentQi: CULTIVATION_CONSTANTS.QI_CAPACITY_BASE,
  maxQi: CULTIVATION_CONSTANTS.QI_CAPACITY_BASE,
  spiritStones: 0,
  isCultivating: false,
  cultivationStartTime: null,
  lastUpdateTime: Date.now(),
  lastOfflineTime: null,
  offlineProgressCalculated: false,
  breakthroughProgress: 0,
  breakthroughAttempts: 0,
  lastBreakthroughTime: null,
});

const createInitialResources = (): CultivationResources => ({
  qi: {
    current: CULTIVATION_CONSTANTS.QI_CAPACITY_BASE,
    max: CULTIVATION_CONSTANTS.QI_CAPACITY_BASE,
    regenRate: CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE,
    lastRegenTime: Date.now(),
  },
  spiritStones: 0,
  pills: {},
});

const createInitialConfig = (): BackgroundProcessingConfig => ({
  enabled: true,
  maxOfflineHours: CULTIVATION_CONSTANTS.MAX_OFFLINE_HOURS,
  efficiencyDecayRate: CULTIVATION_CONSTANTS.EFFICIENCY_DECAY_RATE,
  minEfficiency: CULTIVATION_CONSTANTS.MIN_OFFLINE_EFFICIENCY,
  autoSaveInterval: CULTIVATION_CONSTANTS.SAVE_INTERVAL,
});

// Event management
class EventManager {
  private listeners: Map<CultivationEvent, Set<(data: CultivationEventData) => void>> = new Map();

  addEventListener(event: CultivationEvent, callback: (data: CultivationEventData) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  removeEventListener(event: CultivationEvent, callback: (data: CultivationEventData) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: CultivationEvent, data: any) {
    const eventData: CultivationEventData = {
      type: event,
      timestamp: Date.now(),
      data,
    };
    this.listeners.get(event)?.forEach(callback => callback(eventData));
  }
}

const eventManager = new EventManager();

// Create the store
export const useCultivationStore = create<CultivationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      state: createInitialState(),
      resources: createInitialResources(),
      config: createInitialConfig(),

      // Actions
      startCultivation: (technique?: string) => {
        const { state, resources } = get();

        if (state.isCultivating) return;

        // Switch technique if provided
        if (technique && technique !== state.activeTechnique) {
          if (!get().switchTechnique(technique)) {
            return; // Failed to switch technique
          }
        }

        // Ensure we have an active technique
        const currentTechnique = technique || state.activeTechnique || state.unlockedTechniques[0];

        set(state => ({
          state: {
            ...state.state,
            isCultivating: true,
            cultivationStartTime: Date.now(),
            activeTechnique: currentTechnique,
            lastUpdateTime: Date.now(),
          },
        }));

        eventManager.emit('cultivation_started', { technique: currentTechnique });
      },

      stopCultivation: () => {
        const { state } = get();

        if (!state.isCultivating) return;

        // Calculate final progress before stopping
        get().updateCultivationProgress();

        set(state => ({
          state: {
            ...state.state,
            isCultivating: false,
            cultivationStartTime: null,
            lastUpdateTime: Date.now(),
          },
        }));

        eventManager.emit('cultivation_stopped', {});
      },

      switchTechnique: (techniqueId: string): boolean => {
        const { state } = get();

        if (!state.unlockedTechniques.includes(techniqueId)) {
          return false; // Technique not unlocked
        }

        const techniqueData = cultivationService.getTechniqueData(techniqueId);
        if (!techniqueData) {
          return false; // Invalid technique
        }

        // Check if requirements are met
        if (!cultivationService.meetsTechniqueRequirements(techniqueData, state)) {
          return false; // Requirements not met
        }

        set(state => ({
          state: {
            ...state.state,
            activeTechnique: techniqueId,
            lastUpdateTime: Date.now(),
          },
        }));

        return true;
      },

      attemptBreakthrough: async (): Promise<BreakthroughResult> => {
        const { state, resources } = get();

        if (!get().canBreakthrough()) {
          return {
            success: false,
            resourcesConsumed: { qi: 0, spiritStones: 0 },
          };
        }

        const breakthroughChance = get().getBreakthroughChance();
        const success = Math.random() < breakthroughChance;

        const realmData = get().getCurrentRealmData();
        const cost = realmData?.breakthroughCost.base * Math.pow(realmData.breakthroughCost.multiplier, state.currentStage - 1) || 0;

        // Consume resources
        const resourcesConsumed = {
          qi: Math.floor(cost * 0.7),
          spiritStones: Math.floor(cost * 0.3),
        };

        get().consumeQi(resourcesConsumed.qi);
        get().consumeSpiritStones(resourcesConsumed.spiritStones);

        let result: BreakthroughResult = {
          success,
          resourcesConsumed,
        };

        if (success) {
          const newStage = state.currentStage + 1;
          const maxStages = realmData?.minorStages || 10;

          if (newStage > maxStages) {
            // Breakthrough to next realm
            const nextRealm = cultivationService.getNextRealm(state.currentRealm);
            if (nextRealm) {
              const newRealmData = cultivationService.getRealmData(nextRealm);
              set(state => ({
                state: {
                  ...state.state,
                  currentRealm: nextRealm,
                  currentStage: 1,
                  maxQi: Math.floor(state.state.maxQi * (newRealmData?.benefits.qiCapacityMultiplier || 1)),
                  breakthroughAttempts: 0,
                  lastBreakthroughTime: Date.now(),
                },
              }));

              result.newRealm = nextRealm;
              result.newStage = 1;
              eventManager.emit('realm_breakthrough', { newRealm: nextRealm });
            }
          } else {
            // Breakthrough to next stage
            set(state => ({
              state: {
                ...state.state,
                currentStage: newStage,
                breakthroughAttempts: 0,
                lastBreakthroughTime: Date.now(),
              },
            }));

            result.newStage = newStage;
            eventManager.emit('stage_breakthrough', { newStage });
          }

          // Calculate bonuses
          const bonusGained = {
            qiCapacity: Math.floor(state.maxQi * 0.1),
            cultivationSpeed: 0.05,
          };

          result.bonusGained = bonusGained;
        } else {
          // Failed breakthrough
          set(state => ({
            state: {
              ...state.state,
              breakthroughAttempts: state.state.breakthroughAttempts + 1,
            },
          }));
        }

        await get().saveState();
        return result;
      },

      calculateOfflineProgress: (): OfflineProgressResult => {
        const { state, config } = get();

        if (!state.lastOfflineTime || state.offlineProgressCalculated) {
          return {
            timeOffline: 0,
            qiGained: 0,
            bodyGained: 0,
            resourcesGained: { qi: 0, spiritStones: 0 },
            breakthroughsAchieved: 0,
            efficiencyUsed: 1,
          };
        }

        const timeOffline = Date.now() - state.lastOfflineTime;
        const result = cultivationService.calculateOfflineProgress(
          timeOffline,
          state,
          config
        );

        // Apply the calculated progress
        set(state => {
          const newState = { ...state.state };
          newState.stats.qi.experience += result.qiGained;
          newState.stats.body.experience += result.bodyGained;
          newState.spiritStones += result.resourcesGained.spiritStones;
          newState.offlineProgressCalculated = true;

          // Level up if needed
          cultivationService.processLevelUps(newState);

          return {
            state: newState,
            resources: {
              ...state.resources,
              qi: {
                ...state.resources.qi,
                current: Math.min(state.resources.qi.current + result.resourcesGained.qi, state.resources.qi.max),
              },
              spiritStones: state.resources.spiritStones + result.resourcesGained.spiritStones,
            },
          };
        });

        eventManager.emit('offline_progress_calculated', result);
        return result;
      },

      updateCultivationProgress: () => {
        const { state, resources } = get();

        if (!state.isCultivating || !state.activeTechnique) return;

        const now = Date.now();
        const deltaTime = (now - state.lastUpdateTime) / 1000; // Convert to seconds

        if (deltaTime < 0.1) return; // Too small interval

        const cultivationSpeed = get().getCultivationSpeed();
        const techniqueData = get().getActiveTechniqueData();

        if (!techniqueData) return;

        // Calculate progress gains
        const qiGain = cultivationSpeed * deltaTime * techniqueData.effects.qiMultiplier;
        const bodyGain = cultivationSpeed * deltaTime * techniqueData.effects.bodyMultiplier;

        // Calculate resource consumption
        const qiCost = techniqueData.resourceCost.qi * deltaTime;
        const spiritStoneCost = techniqueData.resourceCost.spiritStones * (deltaTime / 3600); // per hour

        // Check if we have enough resources
        if (resources.qi.current < qiCost) {
          get().stopCultivation();
          eventManager.emit('resource_depleted', { resource: 'qi' });
          return;
        }

        if (spiritStoneCost > 0 && resources.spiritStones < spiritStoneCost) {
          get().stopCultivation();
          eventManager.emit('resource_depleted', { resource: 'spiritStones' });
          return;
        }

        // Apply progress and consume resources
        set(state => {
          const newState = { ...state.state };
          newState.stats.qi.experience += qiGain;
          newState.stats.body.experience += bodyGain;
          newState.lastUpdateTime = now;

          // Process level ups
          const oldQiLevel = newState.stats.qi.level;
          const oldBodyLevel = newState.stats.body.level;

          cultivationService.processLevelUps(newState);

          // Emit level up events
          if (newState.stats.qi.level > oldQiLevel) {
            eventManager.emit('level_up_qi', { newLevel: newState.stats.qi.level });
          }
          if (newState.stats.body.level > oldBodyLevel) {
            eventManager.emit('level_up_body', { newLevel: newState.stats.body.level });
          }

          return {
            state: newState,
            resources: {
              ...state.resources,
              qi: {
                ...state.resources.qi,
                current: state.resources.qi.current - qiCost,
              },
              spiritStones: state.resources.spiritStones - spiritStoneCost,
            },
          };
        });
      },

      // Resource management
      consumeQi: (amount: number): boolean => {
        const { resources } = get();

        if (resources.qi.current < amount) {
          return false;
        }

        set(state => ({
          resources: {
            ...state.resources,
            qi: {
              ...state.resources.qi,
              current: state.resources.qi.current - amount,
            },
          },
        }));

        return true;
      },

      consumeSpiritStones: (amount: number): boolean => {
        const { resources } = get();

        if (resources.spiritStones < amount) {
          return false;
        }

        set(state => ({
          resources: {
            ...state.resources,
            spiritStones: state.resources.spiritStones - amount,
          },
        }));

        return true;
      },

      regenerateQi: () => {
        const { resources } = get();
        const now = Date.now();
        const deltaTime = (now - resources.qi.lastRegenTime) / 1000;

        if (deltaTime < 1) return; // Regenerate only once per second

        const regenAmount = resources.qi.regenRate * deltaTime;
        const newCurrent = Math.min(resources.qi.current + regenAmount, resources.qi.max);

        set(state => ({
          resources: {
            ...state.resources,
            qi: {
              ...state.resources.qi,
              current: newCurrent,
              lastRegenTime: now,
            },
          },
        }));
      },

      // Getters
      getCurrentRealmData: () => {
        const { state } = get();
        return cultivationService.getRealmData(state.currentRealm);
      },

      getActiveTechniqueData: () => {
        const { state } = get();
        if (!state.activeTechnique) return null;
        return cultivationService.getTechniqueData(state.activeTechnique);
      },

      getCultivationSpeed: () => {
        const { state } = get();
        const techniqueData = get().getActiveTechniqueData();
        const realmData = get().getCurrentRealmData();

        return cultivationService.calculateCultivationSpeed(
          CULTIVATION_CONSTANTS.BASE_CULTIVATION_SPEED,
          techniqueData,
          realmData,
          state.currentStage
        );
      },

      getBreakthroughChance: () => {
        const { state } = get();
        const techniqueData = get().getActiveTechniqueData();
        const realmData = get().getCurrentRealmData();

        return cultivationService.calculateBreakthroughChance(
          state.stats.qi.level,
          state.stats.body.level,
          realmData,
          state.currentStage,
          techniqueData
        );
      },

      canBreakthrough: () => {
        const { state } = get();
        const realmData = get().getCurrentRealmData();

        if (!realmData) return false;

        return (
          state.stats.qi.level >= realmData.requirements.qi.level &&
          state.stats.body.level >= realmData.requirements.body.level
        );
      },

      // Persistence
      saveState: async () => {
        // Zustand persist middleware handles this automatically
        // This is just for manual save triggers
        try {
          const { state, resources, config } = get();
          await AsyncStorage.setItem(
            'cultivation-store',
            JSON.stringify({ state, resources, config, version: 1 })
          );
        } catch (error) {
          console.error('Failed to save cultivation state:', error);
        }
      },

      loadState: async () => {
        try {
          const stored = await AsyncStorage.getItem('cultivation-store');
          if (stored) {
            const parsed = JSON.parse(stored);
            // Handle state migration if needed
            set(parsed);
          }
        } catch (error) {
          console.error('Failed to load cultivation state:', error);
        }
      },

      // Events
      addEventListener: (event: CultivationEvent, callback: (data: CultivationEventData) => void) => {
        eventManager.addEventListener(event, callback);
      },

      removeEventListener: (event: CultivationEvent, callback: (data: CultivationEventData) => void) => {
        eventManager.removeEventListener(event, callback);
      },
    }),
    {
      name: 'cultivation-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Mark that we were offline
          state.state.lastOfflineTime = state.state.lastUpdateTime;
          state.state.offlineProgressCalculated = false;
          state.state.isCultivating = false; // Stop cultivation when app restarts
          state.state.cultivationStartTime = null;
        }
      },
    }
  )
);

// Auto-update hook for cultivation progress
export const useCultivationAutoUpdate = () => {
  const updateProgress = useCultivationStore(state => state.updateCultivationProgress);
  const regenerateQi = useCultivationStore(state => state.regenerateQi);
  const isCultivating = useCultivationStore(state => state.state.isCultivating);

  useEffect(() => {
    if (!isCultivating) return;

    const interval = setInterval(() => {
      updateProgress();
      regenerateQi();
    }, CULTIVATION_CONSTANTS.UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [isCultivating, updateProgress, regenerateQi]);
};

// Export the event manager for external use
export { eventManager as cultivationEventManager };