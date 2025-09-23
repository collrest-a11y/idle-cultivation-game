/**
 * Background Processor - Handles cultivation processing when app is minimized
 * Manages foreground/background state transitions and offline progress calculation
 */

import { AppState, AppStateStatus } from 'react-native';
import BackgroundJob from 'react-native-background-job';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CultivationState,
  BackgroundProcessingConfig,
  CultivationEvent,
  CULTIVATION_CONSTANTS,
} from '../../types/cultivation';
import { offlineProgressCalculator } from './offlineProgressCalculator';

interface BackgroundTask {
  id: string;
  type: 'cultivation' | 'qi_regen' | 'auto_save';
  interval: number;
  enabled: boolean;
  lastExecution: number;
}

interface AppStateTransition {
  from: AppStateStatus;
  to: AppStateStatus;
  timestamp: number;
}

interface BackgroundProcessingState {
  isBackgroundProcessingActive: boolean;
  lastForegroundTime: number;
  lastBackgroundTime: number;
  totalBackgroundTime: number;
  backgroundSessions: number;
  tasks: BackgroundTask[];
}

class BackgroundProcessor {
  private appState: AppStateStatus = 'active';
  private processingState: BackgroundProcessingState;
  private stateTransitions: AppStateTransition[] = [];
  private backgroundJobStarted = false;
  private eventListeners: Map<CultivationEvent, Function[]> = new Map();

  // Storage keys
  private readonly STORAGE_KEY = 'cultivation_background_state';
  private readonly LAST_APP_TIME_KEY = 'cultivation_last_app_time';

  constructor() {
    this.processingState = {
      isBackgroundProcessingActive: false,
      lastForegroundTime: Date.now(),
      lastBackgroundTime: 0,
      totalBackgroundTime: 0,
      backgroundSessions: 0,
      tasks: this.initializeTasks(),
    };

    this.initializeAppStateHandling();
  }

  /**
   * Initialize background tasks
   */
  private initializeTasks(): BackgroundTask[] {
    return [
      {
        id: 'cultivation_progress',
        type: 'cultivation',
        interval: 5000, // 5 seconds
        enabled: true,
        lastExecution: 0,
      },
      {
        id: 'qi_regeneration',
        type: 'qi_regen',
        interval: 1000, // 1 second
        enabled: true,
        lastExecution: 0,
      },
      {
        id: 'auto_save',
        type: 'auto_save',
        interval: 30000, // 30 seconds
        enabled: true,
        lastExecution: 0,
      },
    ];
  }

  /**
   * Initialize app state change handling
   */
  private initializeAppStateHandling(): void {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Handle app state changes
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    const previousState = this.appState;
    const now = Date.now();

    // Record state transition
    this.stateTransitions.push({
      from: previousState,
      to: nextAppState,
      timestamp: now,
    });

    // Keep only recent transitions
    this.stateTransitions = this.stateTransitions.slice(-10);

    this.appState = nextAppState;

    if (previousState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
      await this.handleAppGoingToBackground();
    } else if ((previousState === 'background' || previousState === 'inactive') && nextAppState === 'active') {
      await this.handleAppComingToForeground();
    }
  }

  /**
   * Handle app going to background
   */
  private async handleAppGoingToBackground(): Promise<void> {
    const now = Date.now();

    this.processingState.lastForegroundTime = now;
    this.processingState.lastBackgroundTime = now;
    this.processingState.backgroundSessions += 1;

    // Save current time
    await AsyncStorage.setItem(this.LAST_APP_TIME_KEY, now.toString());

    // Start background processing
    this.startBackgroundProcessing();

    this.emitEvent('app_backgrounded', { timestamp: now });
  }

  /**
   * Handle app coming to foreground
   */
  private async handleAppComingToForeground(): Promise<void> {
    const now = Date.now();
    const backgroundDuration = now - this.processingState.lastBackgroundTime;

    this.processingState.totalBackgroundTime += backgroundDuration;

    // Stop background processing
    this.stopBackgroundProcessing();

    // Calculate and apply offline progress
    const lastAppTime = await this.getLastAppTime();
    if (lastAppTime && now - lastAppTime > 60000) { // Only if offline for more than 1 minute
      this.emitEvent('offline_progress_available', {
        timeOffline: now - lastAppTime,
        backgroundDuration,
      });
    }

    this.emitEvent('app_foregrounded', {
      timestamp: now,
      backgroundDuration,
      totalBackgroundTime: this.processingState.totalBackgroundTime,
    });
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    if (this.backgroundJobStarted) return;

    try {
      BackgroundJob.start({
        jobKey: 'cultivation_background',
        period: 15000, // Execute every 15 seconds
      });

      this.backgroundJobStarted = true;
      this.processingState.isBackgroundProcessingActive = true;

      console.log('Background cultivation processing started');
    } catch (error) {
      console.error('Failed to start background processing:', error);
    }
  }

  /**
   * Stop background processing
   */
  private stopBackgroundProcessing(): void {
    if (!this.backgroundJobStarted) return;

    try {
      BackgroundJob.stop({
        jobKey: 'cultivation_background',
      });

      this.backgroundJobStarted = false;
      this.processingState.isBackgroundProcessingActive = false;

      console.log('Background cultivation processing stopped');
    } catch (error) {
      console.error('Failed to stop background processing:', error);
    }
  }

  /**
   * Execute background tasks
   */
  private async executeBackgroundTasks(): Promise<void> {
    const now = Date.now();

    for (const task of this.processingState.tasks) {
      if (!task.enabled) continue;

      if (now - task.lastExecution >= task.interval) {
        await this.executeTask(task);
        task.lastExecution = now;
      }
    }
  }

  /**
   * Execute a specific background task
   */
  private async executeTask(task: BackgroundTask): Promise<void> {
    try {
      switch (task.type) {
        case 'cultivation':
          await this.processCultivationInBackground();
          break;
        case 'qi_regen':
          await this.processQiRegenerationInBackground();
          break;
        case 'auto_save':
          await this.performAutoSave();
          break;
      }
    } catch (error) {
      console.error(`Background task ${task.id} failed:`, error);
    }
  }

  /**
   * Process cultivation in background (limited functionality)
   */
  private async processCultivationInBackground(): Promise<void> {
    // Background cultivation processing is limited to prevent battery drain
    // Mainly just tracking time and preparing for offline calculation

    const cultivationData = await this.loadCultivationState();
    if (!cultivationData) return;

    if (cultivationData.isCultivating) {
      // Simply update the last update time
      cultivationData.lastUpdateTime = Date.now();
      await this.saveCultivationState(cultivationData);
    }
  }

  /**
   * Process qi regeneration in background
   */
  private async processQiRegenerationInBackground(): Promise<void> {
    const cultivationData = await this.loadCultivationState();
    if (!cultivationData) return;

    // Simple qi regeneration calculation
    const now = Date.now();
    const deltaTime = now - cultivationData.lastUpdateTime;

    if (deltaTime > 0) {
      const regenAmount = CULTIVATION_CONSTANTS.BASE_QI_REGEN_RATE * (deltaTime / 1000);
      cultivationData.currentQi = Math.min(cultivationData.currentQi + regenAmount, cultivationData.maxQi);
      cultivationData.lastUpdateTime = now;

      await this.saveCultivationState(cultivationData);
    }
  }

  /**
   * Perform auto-save in background
   */
  private async performAutoSave(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.processingState)
      );
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  /**
   * Load cultivation state from storage
   */
  private async loadCultivationState(): Promise<CultivationState | null> {
    try {
      const stored = await AsyncStorage.getItem('cultivation-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.state || null;
      }
    } catch (error) {
      console.error('Failed to load cultivation state:', error);
    }
    return null;
  }

  /**
   * Save cultivation state to storage
   */
  private async saveCultivationState(state: CultivationState): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem('cultivation-store');
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.state.state = state;
        await AsyncStorage.setItem('cultivation-store', JSON.stringify(parsed));
      }
    } catch (error) {
      console.error('Failed to save cultivation state:', error);
    }
  }

  /**
   * Get last app time from storage
   */
  private async getLastAppTime(): Promise<number | null> {
    try {
      const stored = await AsyncStorage.getItem(this.LAST_APP_TIME_KEY);
      return stored ? parseInt(stored, 10) : null;
    } catch (error) {
      console.error('Failed to get last app time:', error);
      return null;
    }
  }

  /**
   * Public methods for external use
   */

  /**
   * Enable or disable background processing
   */
  setBackgroundProcessingEnabled(enabled: boolean): void {
    if (enabled && this.appState !== 'active') {
      this.startBackgroundProcessing();
    } else if (!enabled) {
      this.stopBackgroundProcessing();
    }
  }

  /**
   * Enable or disable specific background task
   */
  setTaskEnabled(taskId: string, enabled: boolean): void {
    const task = this.processingState.tasks.find(t => t.id === taskId);
    if (task) {
      task.enabled = enabled;
    }
  }

  /**
   * Get background processing status
   */
  getBackgroundProcessingStatus(): {
    isActive: boolean;
    appState: AppStateStatus;
    lastForegroundTime: number;
    totalBackgroundTime: number;
    backgroundSessions: number;
    tasks: BackgroundTask[];
  } {
    return {
      isActive: this.processingState.isBackgroundProcessingActive,
      appState: this.appState,
      lastForegroundTime: this.processingState.lastForegroundTime,
      totalBackgroundTime: this.processingState.totalBackgroundTime,
      backgroundSessions: this.processingState.backgroundSessions,
      tasks: [...this.processingState.tasks],
    };
  }

  /**
   * Get app state transition history
   */
  getStateTransitionHistory(): AppStateTransition[] {
    return [...this.stateTransitions];
  }

  /**
   * Calculate offline progress manually
   */
  async calculateOfflineProgress(state: CultivationState, config: BackgroundProcessingConfig): Promise<any> {
    const lastAppTime = await this.getLastAppTime();
    if (!lastAppTime) return null;

    const timeOffline = Date.now() - lastAppTime;
    if (timeOffline < 60000) return null; // Less than 1 minute

    return offlineProgressCalculator.calculateDetailedProgress(timeOffline, state, config);
  }

  /**
   * Event system for background processing
   */
  addEventListener(event: CultivationEvent, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: CultivationEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: CultivationEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopBackgroundProcessing();
    this.eventListeners.clear();
    AppState.removeEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): {
    averageBackgroundSessionDuration: number;
    totalBackgroundTime: number;
    backgroundSessions: number;
    taskExecutionCounts: Record<string, number>;
  } {
    const avgSessionDuration = this.processingState.backgroundSessions > 0
      ? this.processingState.totalBackgroundTime / this.processingState.backgroundSessions
      : 0;

    const taskCounts: Record<string, number> = {};
    this.processingState.tasks.forEach(task => {
      taskCounts[task.id] = Math.floor(
        (Date.now() - task.lastExecution) / task.interval
      );
    });

    return {
      averageBackgroundSessionDuration: avgSessionDuration,
      totalBackgroundTime: this.processingState.totalBackgroundTime,
      backgroundSessions: this.processingState.backgroundSessions,
      taskExecutionCounts: taskCounts,
    };
  }

  /**
   * Battery optimization helpers
   */
  optimizeForBattery(): void {
    // Reduce background task frequency for battery optimization
    this.processingState.tasks.forEach(task => {
      switch (task.type) {
        case 'cultivation':
          task.interval = Math.max(task.interval, 10000); // Minimum 10 seconds
          break;
        case 'qi_regen':
          task.interval = Math.max(task.interval, 5000); // Minimum 5 seconds
          break;
        case 'auto_save':
          task.interval = Math.max(task.interval, 60000); // Minimum 1 minute
          break;
      }
    });
  }

  resetBatteryOptimization(): void {
    // Reset to default intervals
    this.processingState.tasks = this.initializeTasks();
  }
}

// Export singleton instance
export const backgroundProcessor = new BackgroundProcessor();

// Export types
export type { BackgroundTask, AppStateTransition, BackgroundProcessingState };