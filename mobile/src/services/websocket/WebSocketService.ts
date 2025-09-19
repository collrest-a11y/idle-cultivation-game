/**
 * WebSocketService - Main WebSocket connection service for real-time cultivation system
 * Handles connection management, authentication, and real-time event communication
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  IWebSocketService,
  ConnectionState,
  WebSocketConfig,
  AuthenticationData,
  ConnectionStats,
  WebSocketEventData,
  QueuedMessage,
  NetworkStatus,
  WebSocketError,
  WebSocketErrorType,
  BackoffConfig,
} from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export class WebSocketService implements IWebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private authData: AuthenticationData | null = null;
  private eventEmitter: EventEmitter;
  private messageQueue: QueuedMessage[] = [];
  private networkStatus: NetworkStatus = {
    isConnected: false,
    type: null,
    isInternetReachable: null,
  };
  private connectionStats: ConnectionStats = {
    connectTime: null,
    lastDisconnectTime: null,
    totalReconnects: 0,
    totalErrors: 0,
    averageLatency: 0,
    messagesReceived: 0,
    messagesSent: 0,
  };
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private backoffConfig: BackoffConfig = {
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
  };
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private latencyHistory: number[] = [];

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network status monitoring
   */
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const previousStatus = this.networkStatus;
      this.networkStatus = {
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      };

      // Handle network status changes
      if (previousStatus.isConnected && !this.networkStatus.isConnected) {
        this.handleNetworkDisconnection();
      } else if (!previousStatus.isConnected && this.networkStatus.isConnected) {
        this.handleNetworkReconnection();
      }
    });
  }

  /**
   * Connect to WebSocket server with authentication
   */
  public async connect(authData: AuthenticationData): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTING) {
      return;
    }

    this.authData = authData;
    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      await this.createSocketConnection();
      await this.authenticateConnection();
      this.setupEventHandlers();
      this.startHealthCheck();
      await this.processQueue();
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.clearReconnectionTimer();
    this.stopHealthCheck();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.connectionStats.lastDisconnectTime = Date.now();
  }

  /**
   * Manually trigger reconnection
   */
  public async reconnect(): Promise<void> {
    if (!this.authData) {
      throw new Error('No authentication data available for reconnection');
    }

    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await this.connect(this.authData);
  }

  /**
   * Create Socket.IO connection
   */
  private async createSocketConnection(): Promise<void> {
    const socketConfig = {
      timeout: this.config.timeout,
      forceNew: this.config.forceNew,
      autoConnect: this.config.autoConnect,
      transports: ['websocket', 'polling'],
      auth: this.authData ? { token: this.authData.token } : undefined,
    };

    this.socket = io(this.config.url, socketConfig);

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create socket connection'));
        return;
      }

      const connectTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.timeout);

      this.socket.once('connect', () => {
        clearTimeout(connectTimeout);
        this.connectionStats.connectTime = Date.now();
        this.reconnectAttempts = 0;
        this.setConnectionState(ConnectionState.CONNECTED);
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(connectTimeout);
        reject(error);
      });
    });
  }

  /**
   * Authenticate the WebSocket connection
   */
  private async authenticateConnection(): Promise<void> {
    if (!this.socket || !this.authData) {
      throw new Error('Socket or authentication data not available');
    }

    return new Promise((resolve, reject) => {
      const authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      this.socket!.emit('authenticate', {
        token: this.authData!.token,
        userId: this.authData!.userId,
      });

      this.socket!.once('authenticated', () => {
        clearTimeout(authTimeout);
        resolve();
      });

      this.socket!.once('authentication_error', (error) => {
        clearTimeout(authTimeout);
        reject(new Error(`Authentication failed: ${error.message}`));
      });
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      this.setConnectionState(ConnectionState.DISCONNECTED);
      this.connectionStats.lastDisconnectTime = Date.now();
      this.eventEmitter.emit('disconnect', { reason });

      if (reason === 'io server disconnect') {
        // Server-initiated disconnect, don't reconnect automatically
        return;
      }

      this.scheduleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      this.handleConnectionError(error);
    });

    // Cultivation events
    this.socket.on('cultivation:progress', (data) => {
      this.connectionStats.messagesReceived++;
      this.eventEmitter.emit('cultivation:progress', data);
    });

    this.socket.on('cultivation:breakthrough', (data) => {
      this.connectionStats.messagesReceived++;
      this.eventEmitter.emit('cultivation:breakthrough', data);
    });

    this.socket.on('energy:regenerated', (data) => {
      this.connectionStats.messagesReceived++;
      this.eventEmitter.emit('energy:regenerated', data);
    });

    // Health check events
    this.socket.on('pong', () => {
      const latency = Date.now() - this.lastPingTime;
      this.updateLatencyHistory(latency);
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.handleSocketError(error);
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.connectionStats.totalErrors++;

    const wsError: WebSocketError = {
      type: WebSocketErrorType.CONNECTION_FAILED,
      message: error.message,
      originalError: error,
      timestamp: Date.now(),
      retryable: true,
    };

    this.setConnectionState(ConnectionState.ERROR);
    this.eventEmitter.emit('error', wsError);
    this.scheduleReconnection();
  }

  /**
   * Handle socket-specific errors
   */
  private handleSocketError(error: any): void {
    const wsError: WebSocketError = {
      type: WebSocketErrorType.SERVER_ERROR,
      message: error.message || 'Unknown socket error',
      originalError: error,
      timestamp: Date.now(),
      retryable: true,
    };

    this.eventEmitter.emit('error', wsError);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(): void {
    if (this.reconnectionTimer || !this.networkStatus.isConnected) {
      return;
    }

    if (this.reconnectAttempts >= this.config.reconnectionAttempts) {
      this.setConnectionState(ConnectionState.ERROR);
      return;
    }

    const delay = this.calculateBackoffDelay();
    this.setConnectionState(ConnectionState.RECONNECTING);

    this.reconnectionTimer = setTimeout(async () => {
      this.reconnectionTimer = null;
      this.reconnectAttempts++;
      this.connectionStats.totalReconnects++;

      try {
        if (this.authData) {
          await this.connect(this.authData);
        }
      } catch (error) {
        // Reconnection failed, will be handled by error handlers
      }
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(): number {
    const delay = Math.min(
      this.backoffConfig.initialDelay * Math.pow(this.backoffConfig.multiplier, this.reconnectAttempts),
      this.backoffConfig.maxDelay
    );

    if (this.backoffConfig.jitter) {
      return delay + Math.random() * 1000;
    }

    return delay;
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  /**
   * Start health check mechanism
   */
  private startHealthCheck(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.isConnected()) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, 10000); // Ping every 10 seconds
  }

  /**
   * Stop health check mechanism
   */
  private stopHealthCheck(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Update latency history for health monitoring
   */
  private updateLatencyHistory(latency: number): void {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 10) {
      this.latencyHistory.shift();
    }

    this.connectionStats.averageLatency =
      this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
  }

  /**
   * Handle network disconnection
   */
  private handleNetworkDisconnection(): void {
    if (this.connectionState === ConnectionState.CONNECTED) {
      this.setConnectionState(ConnectionState.DISCONNECTED);
    }
    this.clearReconnectionTimer();
  }

  /**
   * Handle network reconnection
   */
  private handleNetworkReconnection(): void {
    if (this.authData && this.connectionState !== ConnectionState.CONNECTED) {
      this.scheduleReconnection();
    }
  }

  /**
   * Set connection state and emit events
   */
  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState;
    this.connectionState = state;

    if (previousState !== state) {
      this.eventEmitter.emit('connectionStateChanged', {
        previous: previousState,
        current: state,
      });
    }
  }

  // Public interface methods

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && this.socket?.connected === true;
  }

  public on<T extends keyof WebSocketEventData>(
    event: T,
    callback: (data: WebSocketEventData[T]) => void
  ): void {
    this.eventEmitter.on(event as string, callback);
  }

  public off<T extends keyof WebSocketEventData>(
    event: T,
    callback: (data: WebSocketEventData[T]) => void
  ): void {
    this.eventEmitter.off(event as string, callback);
  }

  public emit(event: string, data: any): void {
    if (this.isConnected() && this.socket) {
      this.socket.emit(event, data);
      this.connectionStats.messagesSent++;
    } else {
      this.queueMessage(event, data);
    }
  }

  public queueMessage(event: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    const message: QueuedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      data,
      timestamp: Date.now(),
      attempts: 0,
      priority,
    };

    this.messageQueue.push(message);
    this.saveMessageQueue();
  }

  public async processQueue(): Promise<void> {
    if (!this.isConnected() || this.messageQueue.length === 0) {
      return;
    }

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        if (this.socket) {
          this.socket.emit(message.event, message.data);
          this.connectionStats.messagesSent++;
        }
      } catch (error) {
        // Re-queue failed messages with attempt increment
        message.attempts++;
        if (message.attempts < 3) {
          this.messageQueue.push(message);
        }
      }
    }

    await this.saveMessageQueue();
  }

  public clearQueue(): void {
    this.messageQueue = [];
    this.saveMessageQueue();
  }

  public setNetworkStatus(status: NetworkStatus): void {
    this.networkStatus = status;
  }

  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Save message queue to local storage
   */
  private async saveMessageQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('websocket_message_queue', JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Failed to save message queue:', error);
    }
  }

  /**
   * Load message queue from local storage
   */
  public async loadMessageQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('websocket_message_queue');
      if (queueData) {
        this.messageQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Failed to load message queue:', error);
    }
  }
}