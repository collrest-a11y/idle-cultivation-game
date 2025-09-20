/**
 * CultivationEventSystem - Specialized event system for cultivation-related WebSocket events
 * Handles real-time cultivation progress, breakthroughs, energy regeneration, and synchronization
 */

import {
  CultivationProgress,
  BreakthroughEvent,
  EnergyRegeneration,
  WebSocketEventData,
  IWebSocketService,
} from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export interface CultivationState {
  userId: string;
  currentStage: string;
  progress: number;
  energy: number;
  maxEnergy: number;
  regenRate: number;
  lastUpdate: number;
  isActive: boolean;
}

export interface CultivationSettings {
  autoBreakthrough: boolean;
  progressUpdateInterval: number;
  energyUpdateInterval: number;
  syncInterval: number;
  notificationsEnabled: boolean;
}

export interface BreakthroughRequirement {
  stage: string;
  requiredProgress: number;
  requiredEnergy: number;
  prerequisites: string[];
  rewards: any[];
}

export interface CultivationEvent {
  type: 'progress' | 'breakthrough' | 'energy' | 'sync' | 'offline' | 'error';
  data: any;
  timestamp: number;
}

export class CultivationEventSystem {
  private webSocketService: IWebSocketService;
  private eventEmitter: EventEmitter;
  private cultivationState: CultivationState | null = null;
  private settings: CultivationSettings;
  private eventHistory: CultivationEvent[] = [];
  private progressTimer: NodeJS.Timeout | null = null;
  private energyTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private lastServerSync = 0;
  private offlineProgressBuffer: CultivationProgress[] = [];

  constructor(webSocketService: IWebSocketService) {
    this.webSocketService = webSocketService;
    this.eventEmitter = new EventEmitter();
    this.settings = {
      autoBreakthrough: true,
      progressUpdateInterval: 1000, // 1 second
      energyUpdateInterval: 5000,   // 5 seconds
      syncInterval: 30000,          // 30 seconds
      notificationsEnabled: true,
    };

    this.setupWebSocketEventHandlers();
  }

  /**
   * Initialize cultivation event system
   */
  public async initialize(userId: string): Promise<void> {
    try {
      // Request initial cultivation state from server
      await this.requestCultivationSync(userId);
      this.startPeriodicSync();
    } catch (error) {
      console.error('Failed to initialize cultivation event system:', error);
      this.emitCultivationEvent('error', { error: error instanceof Error ? error.message : 'Initialization failed' });
    }
  }

  /**
   * Setup WebSocket event handlers for cultivation events
   */
  private setupWebSocketEventHandlers(): void {
    // Handle cultivation progress updates from server
    this.webSocketService.on('cultivation:progress', (data: CultivationProgress) => {
      this.handleProgressUpdate(data);
    });

    // Handle breakthrough events from server
    this.webSocketService.on('cultivation:breakthrough', (data: BreakthroughEvent) => {
      this.handleBreakthroughEvent(data);
    });

    // Handle energy regeneration updates from server
    this.webSocketService.on('energy:regenerated', (data: EnergyRegeneration) => {
      this.handleEnergyUpdate(data);
    });

    // Handle cultivation synchronization
    this.webSocketService.on('cultivation:sync', (data: any) => {
      this.handleCultivationSync(data);
    });

    // Handle connection state changes
    this.webSocketService.on('connectionStateChanged', (data: any) => {
      this.handleConnectionStateChange(data);
    });
  }

  /**
   * Handle cultivation progress updates
   */
  private handleProgressUpdate(data: CultivationProgress): void {
    if (!this.cultivationState || data.userId !== this.cultivationState.userId) {
      return;
    }

    const previousProgress = this.cultivationState.progress;
    const previousStage = this.cultivationState.currentStage;

    // Update cultivation state
    this.cultivationState.progress = data.progress;
    this.cultivationState.energy = data.energy;
    this.cultivationState.lastUpdate = data.timestamp;

    // Check for stage progression
    if (data.stage !== previousStage) {
      this.cultivationState.currentStage = data.stage;
    }

    // Emit progress event
    this.emitCultivationEvent('progress', {
      previousProgress,
      currentProgress: data.progress,
      progressDelta: data.progress - previousProgress,
      stage: data.stage,
      energy: data.energy,
    });

    // Check if breakthrough is available
    if (this.settings.autoBreakthrough) {
      this.checkBreakthroughAvailability();
    }
  }

  /**
   * Handle breakthrough events
   */
  private handleBreakthroughEvent(data: BreakthroughEvent): void {
    if (!this.cultivationState || data.userId !== this.cultivationState.userId) {
      return;
    }

    // Update cultivation state
    this.cultivationState.currentStage = data.toStage;
    this.cultivationState.progress = 0; // Reset progress for new stage
    this.cultivationState.lastUpdate = data.timestamp;

    // Emit breakthrough event
    this.emitCultivationEvent('breakthrough', {
      fromStage: data.fromStage,
      toStage: data.toStage,
      rewards: data.rewards,
      timestamp: data.timestamp,
    });

    // Show notification if enabled
    if (this.settings.notificationsEnabled) {
      this.showBreakthroughNotification(data);
    }
  }

  /**
   * Handle energy regeneration updates
   */
  private handleEnergyUpdate(data: EnergyRegeneration): void {
    if (!this.cultivationState || data.userId !== this.cultivationState.userId) {
      return;
    }

    const previousEnergy = this.cultivationState.energy;

    // Update energy state
    this.cultivationState.energy = data.currentEnergy;
    this.cultivationState.maxEnergy = data.maxEnergy;
    this.cultivationState.regenRate = data.regenRate;
    this.cultivationState.lastUpdate = data.timestamp;

    // Emit energy event
    this.emitCultivationEvent('energy', {
      previousEnergy,
      currentEnergy: data.currentEnergy,
      maxEnergy: data.maxEnergy,
      regenRate: data.regenRate,
      energyDelta: data.currentEnergy - previousEnergy,
    });
  }

  /**
   * Handle cultivation synchronization
   */
  private handleCultivationSync(data: any): void {
    if (data.cultivationState) {
      this.cultivationState = data.cultivationState;
      this.lastServerSync = Date.now();

      this.emitCultivationEvent('sync', {
        state: this.cultivationState,
        syncTime: this.lastServerSync,
      });
    }

    // Process any offline progress
    if (data.offlineProgress) {
      this.processOfflineProgress(data.offlineProgress);
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(data: any): void {
    if (data.current === 'connected' && data.previous !== 'connected') {
      // Connection restored, sync cultivation state
      if (this.cultivationState) {
        this.requestCultivationSync(this.cultivationState.userId);
      }

      // Process any buffered offline progress
      this.processOfflineProgressBuffer();
    } else if (data.current === 'disconnected') {
      // Connection lost, start buffering progress locally
      this.startOfflineMode();
    }
  }

  /**
   * Start cultivation session
   */
  public startCultivation(): void {
    if (!this.cultivationState) {
      throw new Error('Cultivation state not initialized');
    }

    this.cultivationState.isActive = true;

    // Start local progress tracking
    this.startProgressTracking();
    this.startEnergyTracking();

    // Notify server
    this.webSocketService.emit('cultivation:start', {
      userId: this.cultivationState.userId,
      timestamp: Date.now(),
    });

    this.emitCultivationEvent('cultivation_started', {
      userId: this.cultivationState.userId,
    });
  }

  /**
   * Stop cultivation session
   */
  public stopCultivation(): void {
    if (!this.cultivationState) {
      return;
    }

    this.cultivationState.isActive = false;

    // Stop local tracking
    this.stopProgressTracking();
    this.stopEnergyTracking();

    // Notify server
    this.webSocketService.emit('cultivation:stop', {
      userId: this.cultivationState.userId,
      timestamp: Date.now(),
    });

    this.emitCultivationEvent('cultivation_stopped', {
      userId: this.cultivationState.userId,
    });
  }

  /**
   * Trigger breakthrough manually
   */
  public async triggerBreakthrough(): Promise<void> {
    if (!this.cultivationState) {
      throw new Error('Cultivation state not initialized');
    }

    const canBreakthrough = await this.checkBreakthroughAvailability();
    if (!canBreakthrough) {
      throw new Error('Breakthrough requirements not met');
    }

    // Send breakthrough request to server
    this.webSocketService.emit('cultivation:breakthrough', {
      userId: this.cultivationState.userId,
      currentStage: this.cultivationState.currentStage,
      progress: this.cultivationState.progress,
      energy: this.cultivationState.energy,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if breakthrough is available
   */
  private async checkBreakthroughAvailability(): Promise<boolean> {
    if (!this.cultivationState) {
      return false;
    }

    // In a real implementation, this would check breakthrough requirements
    // For now, we'll simulate breakthrough availability based on progress
    const canBreakthrough = this.cultivationState.progress >= 100;

    if (canBreakthrough) {
      this.emitCultivationEvent('breakthrough_available', {
        stage: this.cultivationState.currentStage,
        progress: this.cultivationState.progress,
      });
    }

    return canBreakthrough;
  }

  /**
   * Start local progress tracking
   */
  private startProgressTracking(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    this.progressTimer = setInterval(() => {
      if (this.cultivationState && this.cultivationState.isActive) {
        this.updateLocalProgress();
      }
    }, this.settings.progressUpdateInterval);
  }

  /**
   * Stop local progress tracking
   */
  private stopProgressTracking(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  /**
   * Start local energy tracking
   */
  private startEnergyTracking(): void {
    if (this.energyTimer) {
      clearInterval(this.energyTimer);
    }

    this.energyTimer = setInterval(() => {
      if (this.cultivationState) {
        this.updateLocalEnergy();
      }
    }, this.settings.energyUpdateInterval);
  }

  /**
   * Stop local energy tracking
   */
  private stopEnergyTracking(): void {
    if (this.energyTimer) {
      clearInterval(this.energyTimer);
      this.energyTimer = null;
    }
  }

  /**
   * Update local progress (for offline calculation)
   */
  private updateLocalProgress(): void {
    if (!this.cultivationState || !this.cultivationState.isActive) {
      return;
    }

    // Simple progress calculation (in real game, this would be more complex)
    const progressIncrement = 0.1; // Base progress per second
    const energyCost = 0.5; // Energy cost per progress increment

    if (this.cultivationState.energy >= energyCost) {
      this.cultivationState.progress += progressIncrement;
      this.cultivationState.energy -= energyCost;
      this.cultivationState.lastUpdate = Date.now();

      // Buffer progress for offline scenarios
      if (!this.webSocketService.isConnected()) {
        this.bufferOfflineProgress();
      }
    }
  }

  /**
   * Update local energy regeneration
   */
  private updateLocalEnergy(): void {
    if (!this.cultivationState) {
      return;
    }

    const timeSinceUpdate = Date.now() - this.cultivationState.lastUpdate;
    const energyRegen = (timeSinceUpdate / 1000) * this.cultivationState.regenRate;

    this.cultivationState.energy = Math.min(
      this.cultivationState.maxEnergy,
      this.cultivationState.energy + energyRegen
    );
    this.cultivationState.lastUpdate = Date.now();
  }

  /**
   * Buffer offline progress
   */
  private bufferOfflineProgress(): void {
    if (!this.cultivationState) {
      return;
    }

    const progressData: CultivationProgress = {
      userId: this.cultivationState.userId,
      stage: this.cultivationState.currentStage,
      progress: this.cultivationState.progress,
      energy: this.cultivationState.energy,
      timestamp: Date.now(),
    };

    this.offlineProgressBuffer.push(progressData);

    // Limit buffer size
    if (this.offlineProgressBuffer.length > 100) {
      this.offlineProgressBuffer.shift();
    }
  }

  /**
   * Process offline progress buffer when connection is restored
   */
  private processOfflineProgressBuffer(): void {
    if (this.offlineProgressBuffer.length === 0) {
      return;
    }

    // Send buffered progress to server
    this.webSocketService.emit('cultivation:offline_sync', {
      userId: this.cultivationState?.userId,
      progressBuffer: this.offlineProgressBuffer,
      timestamp: Date.now(),
    });

    this.offlineProgressBuffer = [];
  }

  /**
   * Process server-calculated offline progress
   */
  private processOfflineProgress(offlineProgress: any): void {
    this.emitCultivationEvent('offline', {
      progress: offlineProgress,
      calculationTime: Date.now(),
    });
  }

  /**
   * Start offline mode
   */
  private startOfflineMode(): void {
    // Continue local calculations when offline
    if (this.cultivationState && this.cultivationState.isActive) {
      // Local progress will continue via existing timers
      this.emitCultivationEvent('offline_mode_started', {
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Request cultivation synchronization from server
   */
  private requestCultivationSync(userId: string): void {
    this.webSocketService.emit('cultivation:request_sync', {
      userId,
      lastUpdate: this.cultivationState?.lastUpdate || 0,
      timestamp: Date.now(),
    });
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    this.syncTimer = setInterval(() => {
      if (this.cultivationState && this.webSocketService.isConnected()) {
        this.requestCultivationSync(this.cultivationState.userId);
      }
    }, this.settings.syncInterval);
  }

  /**
   * Stop periodic synchronization
   */
  private stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Show breakthrough notification
   */
  private showBreakthroughNotification(data: BreakthroughEvent): void {
    // In a real app, this would trigger a platform-specific notification
    console.log(`Breakthrough achieved! ${data.fromStage} → ${data.toStage}`);
  }

  /**
   * Emit cultivation event
   */
  private emitCultivationEvent(type: CultivationEvent['type'], data: any): void {
    const event: CultivationEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    this.eventHistory.push(event);

    // Limit event history size
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    this.eventEmitter.emit(type, event);
    this.eventEmitter.emit('cultivation_event', event);
  }

  /**
   * Get current cultivation state
   */
  public getCultivationState(): CultivationState | null {
    return this.cultivationState ? { ...this.cultivationState } : null;
  }

  /**
   * Update cultivation settings
   */
  public updateSettings(newSettings: Partial<CultivationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get cultivation settings
   */
  public getSettings(): CultivationSettings {
    return { ...this.settings };
  }

  /**
   * Get recent cultivation events
   */
  public getRecentEvents(limit: number = 50): CultivationEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Subscribe to cultivation events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from cultivation events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopProgressTracking();
    this.stopEnergyTracking();
    this.stopPeriodicSync();
    this.eventEmitter.removeAllListeners();
  }
}