/**
 * NetworkMonitor - Monitor network connectivity and quality for WebSocket connections
 * Provides network state tracking, quality assessment, and connection recommendations
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { NetworkStatus } from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export interface NetworkQuality {
  strength: 'poor' | 'fair' | 'good' | 'excellent';
  recommendedAction: 'disconnect' | 'reduce_frequency' | 'normal' | 'high_frequency';
  estimatedBandwidth: number; // in kbps
  latency: number; // in ms
}

export interface NetworkEvent {
  previous: NetworkStatus;
  current: NetworkStatus;
  quality: NetworkQuality;
  timestamp: number;
}

export class NetworkMonitor {
  private currentStatus: NetworkStatus;
  private eventEmitter: EventEmitter;
  private unsubscribe: (() => void) | null = null;
  private qualityHistory: NetworkQuality[] = [];
  private latencyTests: number[] = [];
  private bandwidthTests: number[] = [];
  private isMonitoring = false;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.currentStatus = {
      isConnected: false,
      type: null,
      isInternetReachable: null,
    };
  }

  /**
   * Start monitoring network changes
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkStateChange(state);
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      this.handleNetworkStateChange(state);
    });
  }

  /**
   * Stop monitoring network changes
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    const previousStatus = { ...this.currentStatus };

    this.currentStatus = {
      isConnected: state.isConnected ?? false,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
    };

    // Assess network quality
    const quality = this.assessNetworkQuality(state);
    this.updateQualityHistory(quality);

    // Create network event
    const networkEvent: NetworkEvent = {
      previous: previousStatus,
      current: this.currentStatus,
      quality,
      timestamp: Date.now(),
    };

    // Emit events based on changes
    this.emitNetworkEvents(previousStatus, this.currentStatus, networkEvent);
  }

  /**
   * Assess network quality based on connection state and performance
   */
  private assessNetworkQuality(state: NetInfoState): NetworkQuality {
    let strength: NetworkQuality['strength'] = 'poor';
    let recommendedAction: NetworkQuality['recommendedAction'] = 'disconnect';
    let estimatedBandwidth = 0;
    let latency = 999;

    if (!state.isConnected) {
      return {
        strength: 'poor',
        recommendedAction: 'disconnect',
        estimatedBandwidth: 0,
        latency: 999,
      };
    }

    // Estimate quality based on connection type and details
    switch (state.type) {
      case NetInfoStateType.wifi:
        if (state.details && 'strength' in state.details) {
          const wifiStrength = state.details.strength as number;
          if (wifiStrength >= -40) {
            strength = 'excellent';
            recommendedAction = 'high_frequency';
            estimatedBandwidth = 50000; // 50 Mbps
            latency = 10;
          } else if (wifiStrength >= -60) {
            strength = 'good';
            recommendedAction = 'normal';
            estimatedBandwidth = 25000; // 25 Mbps
            latency = 20;
          } else if (wifiStrength >= -80) {
            strength = 'fair';
            recommendedAction = 'reduce_frequency';
            estimatedBandwidth = 10000; // 10 Mbps
            latency = 50;
          } else {
            strength = 'poor';
            recommendedAction = 'disconnect';
            estimatedBandwidth = 1000; // 1 Mbps
            latency = 100;
          }
        } else {
          // Default WiFi quality when strength is not available
          strength = 'good';
          recommendedAction = 'normal';
          estimatedBandwidth = 20000; // 20 Mbps
          latency = 25;
        }
        break;

      case NetInfoStateType.cellular:
        if (state.details && 'cellularGeneration' in state.details) {
          const generation = state.details.cellularGeneration;
          switch (generation) {
            case '5g':
              strength = 'excellent';
              recommendedAction = 'high_frequency';
              estimatedBandwidth = 100000; // 100 Mbps
              latency = 5;
              break;
            case '4g':
              strength = 'good';
              recommendedAction = 'normal';
              estimatedBandwidth = 25000; // 25 Mbps
              latency = 30;
              break;
            case '3g':
              strength = 'fair';
              recommendedAction = 'reduce_frequency';
              estimatedBandwidth = 3000; // 3 Mbps
              latency = 100;
              break;
            case '2g':
              strength = 'poor';
              recommendedAction = 'disconnect';
              estimatedBandwidth = 200; // 200 kbps
              latency = 300;
              break;
            default:
              strength = 'fair';
              recommendedAction = 'reduce_frequency';
              estimatedBandwidth = 5000; // 5 Mbps
              latency = 80;
          }
        } else {
          // Default cellular quality
          strength = 'fair';
          recommendedAction = 'reduce_frequency';
          estimatedBandwidth = 10000; // 10 Mbps
          latency = 60;
        }
        break;

      case NetInfoStateType.ethernet:
        strength = 'excellent';
        recommendedAction = 'high_frequency';
        estimatedBandwidth = 100000; // 100 Mbps
        latency = 5;
        break;

      default:
        strength = 'fair';
        recommendedAction = 'reduce_frequency';
        estimatedBandwidth = 5000; // 5 Mbps
        latency = 100;
    }

    // Adjust based on internet reachability
    if (state.isInternetReachable === false) {
      strength = 'poor';
      recommendedAction = 'disconnect';
      estimatedBandwidth = 0;
      latency = 999;
    }

    return {
      strength,
      recommendedAction,
      estimatedBandwidth,
      latency,
    };
  }

  /**
   * Update quality history for trend analysis
   */
  private updateQualityHistory(quality: NetworkQuality): void {
    this.qualityHistory.push(quality);

    // Keep only the last 20 quality assessments
    if (this.qualityHistory.length > 20) {
      this.qualityHistory.shift();
    }
  }

  /**
   * Emit appropriate network events
   */
  private emitNetworkEvents(
    previous: NetworkStatus,
    current: NetworkStatus,
    event: NetworkEvent
  ): void {
    // Emit general network change event
    this.eventEmitter.emit('networkChange', event);

    // Emit specific connection events
    if (!previous.isConnected && current.isConnected) {
      this.eventEmitter.emit('networkConnected', event);
    } else if (previous.isConnected && !current.isConnected) {
      this.eventEmitter.emit('networkDisconnected', event);
    }

    // Emit quality change events
    const qualityChanged = this.hasQualityChanged();
    if (qualityChanged) {
      this.eventEmitter.emit('qualityChanged', event);
    }

    // Emit type change events
    if (previous.type !== current.type) {
      this.eventEmitter.emit('connectionTypeChanged', {
        from: previous.type,
        to: current.type,
        event,
      });
    }
  }

  /**
   * Check if network quality has significantly changed
   */
  private hasQualityChanged(): boolean {
    if (this.qualityHistory.length < 2) {
      return false;
    }

    const current = this.qualityHistory[this.qualityHistory.length - 1];
    const previous = this.qualityHistory[this.qualityHistory.length - 2];

    return current.strength !== previous.strength ||
           current.recommendedAction !== previous.recommendedAction;
  }

  /**
   * Perform latency test
   */
  public async performLatencyTest(testUrl: string = 'https://www.google.com'): Promise<number> {
    try {
      const startTime = Date.now();
      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const endTime = Date.now();

      if (response.ok) {
        const latency = endTime - startTime;
        this.updateLatencyHistory(latency);
        return latency;
      }

      throw new Error('Latency test failed');
    } catch (error) {
      console.error('Latency test error:', error);
      return 999; // High latency on error
    }
  }

  /**
   * Update latency history
   */
  private updateLatencyHistory(latency: number): void {
    this.latencyTests.push(latency);

    // Keep only the last 10 latency tests
    if (this.latencyTests.length > 10) {
      this.latencyTests.shift();
    }
  }

  /**
   * Get average latency from recent tests
   */
  public getAverageLatency(): number {
    if (this.latencyTests.length === 0) {
      return 0;
    }

    const sum = this.latencyTests.reduce((acc, latency) => acc + latency, 0);
    return Math.round(sum / this.latencyTests.length);
  }

  /**
   * Get current network quality assessment
   */
  public getCurrentQuality(): NetworkQuality | null {
    return this.qualityHistory.length > 0
      ? this.qualityHistory[this.qualityHistory.length - 1]
      : null;
  }

  /**
   * Get quality trend (improving, stable, degrading)
   */
  public getQualityTrend(): 'improving' | 'stable' | 'degrading' | 'unknown' {
    if (this.qualityHistory.length < 3) {
      return 'unknown';
    }

    const recent = this.qualityHistory.slice(-3);
    const strengths = recent.map(q => this.getStrengthScore(q.strength));

    const trend = strengths[2] - strengths[0];

    if (trend > 0) return 'improving';
    if (trend < 0) return 'degrading';
    return 'stable';
  }

  /**
   * Convert strength to numeric score for trend analysis
   */
  private getStrengthScore(strength: NetworkQuality['strength']): number {
    switch (strength) {
      case 'poor': return 1;
      case 'fair': return 2;
      case 'good': return 3;
      case 'excellent': return 4;
      default: return 0;
    }
  }

  /**
   * Get current network status
   */
  public getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if network is suitable for WebSocket connection
   */
  public isNetworkSuitableForWebSocket(): boolean {
    const quality = this.getCurrentQuality();
    return quality ? quality.recommendedAction !== 'disconnect' : false;
  }

  /**
   * Get recommended WebSocket configuration based on network quality
   */
  public getRecommendedWebSocketConfig(): Partial<any> {
    const quality = this.getCurrentQuality();

    if (!quality) {
      return {};
    }

    switch (quality.recommendedAction) {
      case 'high_frequency':
        return {
          pingInterval: 10000,  // 10 seconds
          pingTimeout: 5000,    // 5 seconds
          upgradeTimeout: 10000,
          transports: ['websocket', 'polling'],
        };

      case 'normal':
        return {
          pingInterval: 25000,  // 25 seconds
          pingTimeout: 10000,   // 10 seconds
          upgradeTimeout: 15000,
          transports: ['websocket', 'polling'],
        };

      case 'reduce_frequency':
        return {
          pingInterval: 60000,  // 60 seconds
          pingTimeout: 20000,   // 20 seconds
          upgradeTimeout: 30000,
          transports: ['polling', 'websocket'], // Prefer polling for unstable connections
        };

      case 'disconnect':
        return {
          autoConnect: false,
        };

      default:
        return {};
    }
  }

  /**
   * Subscribe to network events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from network events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }
}