/**
 * WebSocketManager - Main orchestrator for all WebSocket services
 * Coordinates connection management, authentication, error handling, and cultivation events
 */

import {
  WebSocketConfig,
  AuthenticationData,
  ConnectionState,
  NetworkStatus,
  IWebSocketService,
} from '../../types/websocket';
import { WebSocketService } from './WebSocketService';
import { AuthenticationService } from './AuthenticationService';
import { NetworkMonitor } from '../connection/NetworkMonitor';
import { ConnectionManager } from '../connection/ConnectionManager';
import { MessageQueue } from './MessageQueue';
import { CultivationEventSystem } from './CultivationEventSystem';
import { ErrorHandler } from './ErrorHandler';
import { EventEmitter } from '../../utils/EventEmitter';

export interface WebSocketManagerConfig {
  websocket: WebSocketConfig;
  enableCultivationEvents: boolean;
  enableErrorRecovery: boolean;
  enableNetworkMonitoring: boolean;
  enableOfflineQueue: boolean;
}

export interface ManagerStats {
  connectionUptime: number;
  totalReconnections: number;
  messagesProcessed: number;
  errorCount: number;
  lastConnectionTime: number;
}

export class WebSocketManager {
  private webSocketService: WebSocketService;
  private authService: AuthenticationService;
  private networkMonitor: NetworkMonitor;
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private cultivationEvents: CultivationEventSystem;
  private errorHandler: ErrorHandler;
  private eventEmitter: EventEmitter;
  private config: WebSocketManagerConfig;
  private isInitialized = false;
  private stats: ManagerStats;

  constructor(config: WebSocketManagerConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();

    // Initialize statistics
    this.stats = {
      connectionUptime: 0,
      totalReconnections: 0,
      messagesProcessed: 0,
      errorCount: 0,
      lastConnectionTime: 0,
    };

    // Initialize services
    this.initializeServices();
    this.setupServiceIntegration();
  }

  /**
   * Initialize all WebSocket services
   */
  private initializeServices(): void {
    // Core WebSocket service
    this.webSocketService = new WebSocketService(this.config.websocket);

    // Authentication service
    this.authService = new AuthenticationService();

    // Network monitoring (if enabled)
    if (this.config.enableNetworkMonitoring) {
      this.networkMonitor = new NetworkMonitor();
    }

    // Connection management
    this.connectionManager = new ConnectionManager();
    this.connectionManager.initialize(this.config.websocket);

    // Message queue (if enabled)
    if (this.config.enableOfflineQueue) {
      this.messageQueue = new MessageQueue();
    }

    // Cultivation event system (if enabled)
    if (this.config.enableCultivationEvents) {
      this.cultivationEvents = new CultivationEventSystem(this.webSocketService);
    }

    // Error handling (if enabled)
    if (this.config.enableErrorRecovery) {
      this.errorHandler = new ErrorHandler();
    }
  }

  /**
   * Setup integration between services
   */
  private setupServiceIntegration(): void {
    // Network monitor integration
    if (this.networkMonitor) {
      this.networkMonitor.on('networkChange', (event) => {
        this.webSocketService.setNetworkStatus(event.current);
        if (this.messageQueue) {
          this.messageQueue.setNetworkStatus(event.current);
        }
      });

      this.networkMonitor.on('networkDisconnected', () => {
        this.handleNetworkDisconnection();
      });

      this.networkMonitor.on('networkConnected', () => {
        this.handleNetworkReconnection();
      });
    }

    // WebSocket service integration
    this.webSocketService.on('connectionStateChanged', (data) => {
      this.handleConnectionStateChange(data);
    });

    this.webSocketService.on('error', (error) => {
      this.handleWebSocketError(error);
    });

    // Authentication service integration
    this.authService.on('authenticated', (authData) => {
      this.eventEmitter.emit('authenticated', authData);
    });

    this.authService.on('token_refreshed', (authData) => {
      this.eventEmitter.emit('token_refreshed', authData);
    });

    this.authService.on('authentication_error', (error) => {
      this.handleAuthenticationError(error);
    });

    // Message queue integration
    if (this.messageQueue) {
      this.messageQueue.setMessageProcessor(async (message) => {
        try {
          this.webSocketService.emit(message.event, message.data);
          this.stats.messagesProcessed++;
          return { success: true, messageId: message.id };
        } catch (error) {
          return {
            success: false,
            messageId: message.id,
            error: error as Error,
          };
        }
      });
    }

    // Error handler integration
    if (this.errorHandler) {
      this.errorHandler.on('recovery:immediate', () => {
        this.attemptImmediateRecovery();
      });

      this.errorHandler.on('recovery:delayed', (data) => {
        this.scheduleDelayedRecovery(data.delay);
      });

      this.errorHandler.on('recovery:fallback', () => {
        this.activateFallbackMode();
      });
    }
  }

  /**
   * Initialize the WebSocket manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize authentication service
      await this.authService.initialize();

      // Initialize message queue
      if (this.messageQueue) {
        await this.messageQueue.initialize();
      }

      // Start network monitoring
      if (this.networkMonitor) {
        this.networkMonitor.startMonitoring();
      }

      this.isInitialized = true;
      this.eventEmitter.emit('initialized');
    } catch (error) {
      this.eventEmitter.emit('initialization_error', error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket server with authentication
   */
  public async connect(credentials?: {
    username?: string;
    email?: string;
    password?: string;
    token?: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('WebSocketManager not initialized');
    }

    try {
      let authData: AuthenticationData;

      if (credentials) {
        // Authenticate with provided credentials
        const authResult = await this.authService.authenticate(credentials);
        if (!authResult.success || !authResult.authData) {
          throw new Error('Authentication failed');
        }
        authData = authResult.authData;
      } else {
        // Use existing authentication
        const existingAuth = this.authService.getCurrentAuthData();
        if (!existingAuth) {
          throw new Error('No authentication data available');
        }
        authData = existingAuth;
      }

      // Connect WebSocket with authentication
      await this.webSocketService.connect(authData);

      // Initialize cultivation events if enabled
      if (this.cultivationEvents) {
        await this.cultivationEvents.initialize(authData.userId);
      }

      this.stats.lastConnectionTime = Date.now();
      this.eventEmitter.emit('connected', authData);
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.webSocketService.disconnect();

    if (this.cultivationEvents) {
      this.cultivationEvents.destroy();
    }

    this.eventEmitter.emit('disconnected');
  }

  /**
   * Reconnect to WebSocket server
   */
  public async reconnect(): Promise<void> {
    this.stats.totalReconnections++;
    await this.webSocketService.reconnect();
  }

  /**
   * Handle network disconnection
   */
  private handleNetworkDisconnection(): void {
    if (this.errorHandler) {
      this.errorHandler.updateContext({
        networkStatus: { isConnected: false, type: null, isInternetReachable: null },
      });
    }

    this.eventEmitter.emit('network_disconnected');
  }

  /**
   * Handle network reconnection
   */
  private handleNetworkReconnection(): void {
    if (this.errorHandler) {
      this.errorHandler.updateContext({
        networkStatus: { isConnected: true, type: 'wifi', isInternetReachable: true },
      });
    }

    // Attempt to reconnect if we were previously connected
    if (this.webSocketService.getConnectionState() === ConnectionState.DISCONNECTED) {
      this.attemptImmediateRecovery();
    }

    this.eventEmitter.emit('network_reconnected');
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionStateChange(data: any): void {
    if (this.errorHandler) {
      this.errorHandler.updateContext({
        connectionState: data.current,
      });

      // Clear error state on successful connection
      if (data.current === ConnectionState.CONNECTED) {
        this.errorHandler.clearErrorState();
      }
    }

    this.eventEmitter.emit('connection_state_changed', data);
  }

  /**
   * Handle WebSocket errors
   */
  private handleWebSocketError(error: any): void {
    this.stats.errorCount++;

    if (this.errorHandler) {
      this.errorHandler.handleError(error, {
        connectionState: this.webSocketService.getConnectionState(),
        networkStatus: this.webSocketService.getNetworkStatus(),
        attemptCount: this.stats.totalReconnections,
        lastSuccessfulConnection: this.stats.lastConnectionTime,
      });
    }

    this.eventEmitter.emit('error', error);
  }

  /**
   * Handle authentication errors
   */
  private handleAuthenticationError(error: any): void {
    this.eventEmitter.emit('authentication_error', error);

    // Disconnect on authentication failure
    this.disconnect();
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.stats.errorCount++;
    this.eventEmitter.emit('connection_error', error);
  }

  /**
   * Attempt immediate recovery
   */
  private async attemptImmediateRecovery(): Promise<void> {
    try {
      await this.reconnect();
    } catch (error) {
      console.error('Immediate recovery failed:', error);
    }
  }

  /**
   * Schedule delayed recovery
   */
  private scheduleDelayedRecovery(delay: number): void {
    setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        console.error('Delayed recovery failed:', error);
      }
    }, delay);
  }

  /**
   * Activate fallback mode
   */
  private activateFallbackMode(): void {
    // Switch to polling transport or other fallback mechanisms
    this.eventEmitter.emit('fallback_mode_activated');
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): {
    isConnected: boolean;
    state: ConnectionState;
    networkStatus: NetworkStatus;
    stats: ManagerStats;
  } {
    return {
      isConnected: this.webSocketService.isConnected(),
      state: this.webSocketService.getConnectionState(),
      networkStatus: this.webSocketService.getNetworkStatus(),
      stats: { ...this.stats },
    };
  }

  /**
   * Get cultivation events system (if enabled)
   */
  public getCultivationEvents(): CultivationEventSystem | null {
    return this.cultivationEvents || null;
  }

  /**
   * Get authentication service
   */
  public getAuthService(): AuthenticationService {
    return this.authService;
  }

  /**
   * Get message queue (if enabled)
   */
  public getMessageQueue(): MessageQueue | null {
    return this.messageQueue || null;
  }

  /**
   * Get error handler (if enabled)
   */
  public getErrorHandler(): ErrorHandler | null {
    return this.errorHandler || null;
  }

  /**
   * Get network monitor (if enabled)
   */
  public getNetworkMonitor(): NetworkMonitor | null {
    return this.networkMonitor || null;
  }

  /**
   * Send message through WebSocket
   */
  public emit(event: string, data: any): void {
    this.webSocketService.emit(event, data);
  }

  /**
   * Subscribe to WebSocket events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (event.startsWith('cultivation:') && this.cultivationEvents) {
      this.cultivationEvents.on(event, callback);
    } else {
      this.webSocketService.on(event as any, callback);
    }
  }

  /**
   * Unsubscribe from WebSocket events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    if (event.startsWith('cultivation:') && this.cultivationEvents) {
      this.cultivationEvents.off(event, callback);
    } else {
      this.webSocketService.off(event as any, callback);
    }
  }

  /**
   * Subscribe to manager events
   */
  public onManagerEvent(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from manager events
   */
  public offManagerEvent(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Cleanup and destroy all services
   */
  public destroy(): void {
    if (this.cultivationEvents) {
      this.cultivationEvents.destroy();
    }

    if (this.messageQueue) {
      this.messageQueue.destroy();
    }

    if (this.networkMonitor) {
      this.networkMonitor.stopMonitoring();
    }

    if (this.errorHandler) {
      this.errorHandler.destroy();
    }

    this.webSocketService.disconnect();
    this.eventEmitter.removeAllListeners();
    this.isInitialized = false;
  }
}