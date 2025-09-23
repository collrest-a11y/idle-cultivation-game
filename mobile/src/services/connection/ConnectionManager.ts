/**
 * ConnectionManager - Advanced connection management for WebSocket
 * Handles connection lifecycle, authentication, and reliability features
 */

import { Socket, io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IConnectionManager,
  WebSocketConfig,
  AuthenticationData,
  ConnectionHealth,
  WebSocketError,
  WebSocketErrorType,
} from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export class ConnectionManager implements IConnectionManager {
  private socket: Socket | null = null;
  private config: WebSocketConfig | null = null;
  private eventEmitter: EventEmitter;
  private connectionHealth: ConnectionHealth = {
    isHealthy: true,
    latency: 0,
    lastPingTime: 0,
    consecutiveFailures: 0,
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private authenticationRetries = 0;
  private maxAuthRetries = 3;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Initialize connection manager with configuration
   */
  public initialize(config: WebSocketConfig): void {
    this.config = config;
  }

  /**
   * Get current socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Create a new WebSocket connection with authentication
   */
  public async createConnection(authData: AuthenticationData): Promise<Socket> {
    if (!this.config) {
      throw new Error('ConnectionManager not initialized');
    }

    // Store auth data for potential reconnections
    await this.storeAuthData(authData);

    // Create socket with authentication
    const socketOptions = {
      timeout: this.config.timeout,
      forceNew: this.config.forceNew,
      autoConnect: false, // We'll connect manually
      transports: ['websocket', 'polling'] as const,
      auth: {
        token: authData.token,
        userId: authData.userId,
      },
      query: {
        version: '1.0.0',
        platform: 'react-native',
      },
    };

    this.socket = io(this.config.url, socketOptions);
    this.setupConnectionHandlers();

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create socket'));
        return;
      }

      const connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config!.timeout);

      // Handle successful connection
      this.socket.once('connect', () => {
        clearTimeout(connectionTimeout);
        this.authenticationRetries = 0;
        this.resetConnectionHealth();
        this.startHealthCheck();
        this.eventEmitter.emit('connected');
        resolve(this.socket!);
      });

      // Handle connection errors
      this.socket.once('connect_error', (error) => {
        clearTimeout(connectionTimeout);
        this.handleConnectionError(error);
        reject(error);
      });

      // Attempt connection
      this.socket.connect();
    });
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    // Authentication handling
    this.socket.on('authenticated', () => {
      this.eventEmitter.emit('authenticated');
    });

    this.socket.on('authentication_error', (error) => {
      this.handleAuthenticationError(error);
    });

    // Health monitoring
    this.socket.on('pong', (latency) => {
      this.updateConnectionHealth(latency);
    });

    // Disconnection handling
    this.socket.on('disconnect', (reason) => {
      this.stopHealthCheck();
      this.eventEmitter.emit('disconnected', { reason });
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.handleSocketError(error);
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      this.resetConnectionHealth();
      this.startHealthCheck();
      this.eventEmitter.emit('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      this.handleReconnectionError(error);
    });

    this.socket.on('reconnect_failed', () => {
      this.eventEmitter.emit('reconnect_failed');
    });
  }

  /**
   * Handle authentication errors with retry logic
   */
  private handleAuthenticationError(error: any): void {
    this.authenticationRetries++;

    if (this.authenticationRetries >= this.maxAuthRetries) {
      const authError: WebSocketError = {
        type: WebSocketErrorType.AUTHENTICATION_FAILED,
        message: `Authentication failed after ${this.maxAuthRetries} attempts: ${error.message}`,
        originalError: error,
        timestamp: Date.now(),
        retryable: false,
      };

      this.eventEmitter.emit('authentication_failed', authError);
      return;
    }

    // Retry authentication with stored data
    this.retryAuthentication();
  }

  /**
   * Retry authentication with stored credentials
   */
  private async retryAuthentication(): Promise<void> {
    try {
      const authData = await this.getStoredAuthData();
      if (authData && this.socket) {
        setTimeout(() => {
          this.socket?.emit('authenticate', {
            token: authData.token,
            userId: authData.userId,
          });
        }, 1000 * this.authenticationRetries); // Exponential backoff
      }
    } catch (error) {
      console.error('Failed to retry authentication:', error);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: any): void {
    this.connectionHealth.consecutiveFailures++;

    const connectionError: WebSocketError = {
      type: WebSocketErrorType.CONNECTION_FAILED,
      message: error.message || 'Connection failed',
      originalError: error,
      timestamp: Date.now(),
      retryable: true,
    };

    this.eventEmitter.emit('connection_error', connectionError);
  }

  /**
   * Handle socket errors
   */
  private handleSocketError(error: any): void {
    const socketError: WebSocketError = {
      type: WebSocketErrorType.SERVER_ERROR,
      message: error.message || 'Socket error',
      originalError: error,
      timestamp: Date.now(),
      retryable: true,
    };

    this.eventEmitter.emit('socket_error', socketError);
  }

  /**
   * Handle reconnection errors
   */
  private handleReconnectionError(error: any): void {
    this.connectionHealth.consecutiveFailures++;

    const reconnectionError: WebSocketError = {
      type: WebSocketErrorType.NETWORK_ERROR,
      message: `Reconnection failed: ${error.message}`,
      originalError: error,
      timestamp: Date.now(),
      retryable: true,
    };

    this.eventEmitter.emit('reconnection_error', reconnectionError);
  }

  /**
   * Destroy the current connection
   */
  public destroyConnection(): void {
    this.stopHealthCheck();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.resetConnectionHealth();
    this.authenticationRetries = 0;
  }

  /**
   * Setup automatic reconnection logic
   */
  public setupReconnection(): void {
    if (!this.socket || !this.config) return;

    // Configure Socket.IO's built-in reconnection
    this.socket.io.opts.reconnection = true;
    this.socket.io.opts.reconnectionAttempts = this.config.reconnectionAttempts;
    this.socket.io.opts.reconnectionDelay = this.config.reconnectionDelay;
    this.socket.io.opts.reconnectionDelayMax = this.config.maxReconnectionDelay;
  }

  /**
   * Handle connection errors by triggering appropriate recovery
   */
  public handleConnectionError(error: Error): void {
    this.handleConnectionError(error);
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 15000); // Check every 15 seconds
  }

  /**
   * Stop health check monitoring
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform health check by pinging the server
   */
  private performHealthCheck(): void {
    if (!this.socket || !this.socket.connected) {
      this.connectionHealth.isHealthy = false;
      return;
    }

    this.connectionHealth.lastPingTime = Date.now();
    this.socket.emit('ping', this.connectionHealth.lastPingTime);

    // Check for ping timeout
    setTimeout(() => {
      const timeSinceLastPing = Date.now() - this.connectionHealth.lastPingTime;
      if (timeSinceLastPing > 10000) { // 10 second timeout
        this.connectionHealth.isHealthy = false;
        this.connectionHealth.consecutiveFailures++;
        this.eventEmitter.emit('health_check_failed');
      }
    }, 10000);
  }

  /**
   * Update connection health metrics
   */
  private updateConnectionHealth(latency: number): void {
    this.connectionHealth.latency = latency;
    this.connectionHealth.isHealthy = latency < 5000; // 5 second threshold
    this.connectionHealth.consecutiveFailures = 0;
  }

  /**
   * Reset connection health to initial state
   */
  private resetConnectionHealth(): void {
    this.connectionHealth = {
      isHealthy: true,
      latency: 0,
      lastPingTime: 0,
      consecutiveFailures: 0,
    };
  }

  /**
   * Store authentication data securely
   */
  private async storeAuthData(authData: AuthenticationData): Promise<void> {
    try {
      await AsyncStorage.setItem('websocket_auth_data', JSON.stringify(authData));
    } catch (error) {
      console.error('Failed to store auth data:', error);
    }
  }

  /**
   * Retrieve stored authentication data
   */
  private async getStoredAuthData(): Promise<AuthenticationData | null> {
    try {
      const data = await AsyncStorage.getItem('websocket_auth_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve auth data:', error);
      return null;
    }
  }

  /**
   * Get current connection health
   */
  public getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  /**
   * Subscribe to connection manager events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from connection manager events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }
}