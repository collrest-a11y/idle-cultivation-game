/**
 * WebSocket Types and Interfaces for Idle Cultivation Game
 * Defines all types for real-time cultivation system communication
 */

import { Socket } from 'socket.io-client';

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// Network status
export interface NetworkStatus {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

// Connection configuration
export interface WebSocketConfig {
  url: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  maxReconnectionDelay: number;
  timeout: number;
  forceNew: boolean;
  autoConnect: boolean;
}

// Authentication data for WebSocket connection
export interface AuthenticationData {
  token: string;
  userId: string;
  refreshToken?: string;
}

// Connection statistics
export interface ConnectionStats {
  connectTime: number | null;
  lastDisconnectTime: number | null;
  totalReconnects: number;
  totalErrors: number;
  averageLatency: number;
  messagesReceived: number;
  messagesSent: number;
}

// Cultivation-specific event types
export interface CultivationProgress {
  userId: string;
  stage: string;
  progress: number;
  energy: number;
  timestamp: number;
}

export interface BreakthroughEvent {
  userId: string;
  fromStage: string;
  toStage: string;
  timestamp: number;
  rewards?: any[];
}

export interface EnergyRegeneration {
  userId: string;
  currentEnergy: number;
  maxEnergy: number;
  regenRate: number;
  timestamp: number;
}

// WebSocket event data types
export interface WebSocketEventData {
  'cultivation:progress': CultivationProgress;
  'cultivation:breakthrough': BreakthroughEvent;
  'energy:regenerated': EnergyRegeneration;
  'cultivation:sync': any;
  'error': { message: string; code?: string };
  'disconnect': { reason: string };
  'connect': {};
  'reconnect': { attempts: number };
}

// Message queue item for offline scenarios
export interface QueuedMessage {
  id: string;
  event: string;
  data: any;
  timestamp: number;
  attempts: number;
  priority: 'low' | 'normal' | 'high';
}

// WebSocket service interface
export interface IWebSocketService {
  // Connection management
  connect(authData: AuthenticationData): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  // State getters
  getConnectionState(): ConnectionState;
  getConnectionStats(): ConnectionStats;
  isConnected(): boolean;

  // Event handling
  on<T extends keyof WebSocketEventData>(
    event: T,
    callback: (data: WebSocketEventData[T]) => void
  ): void;
  off<T extends keyof WebSocketEventData>(
    event: T,
    callback: (data: WebSocketEventData[T]) => void
  ): void;
  emit(event: string, data: any): void;

  // Message queue
  queueMessage(event: string, data: any, priority?: 'low' | 'normal' | 'high'): void;
  processQueue(): Promise<void>;
  clearQueue(): void;

  // Network monitoring
  setNetworkStatus(status: NetworkStatus): void;
  getNetworkStatus(): NetworkStatus;
}

// Connection manager interface
export interface IConnectionManager {
  initialize(config: WebSocketConfig): void;
  getSocket(): Socket | null;
  createConnection(authData: AuthenticationData): Promise<Socket>;
  destroyConnection(): void;
  setupReconnection(): void;
  handleConnectionError(error: Error): void;
}

// Event emitter for internal communication
export interface WebSocketEventEmitter {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
}

// Configuration for exponential backoff
export interface BackoffConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
}

// Error types
export enum WebSocketErrorType {
  CONNECTION_FAILED = 'connection_failed',
  AUTHENTICATION_FAILED = 'authentication_failed',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  INVALID_DATA = 'invalid_data',
  SERVER_ERROR = 'server_error',
}

export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  originalError?: Error;
  timestamp: number;
  retryable: boolean;
}

// Health check interface
export interface ConnectionHealth {
  isHealthy: boolean;
  latency: number;
  lastPingTime: number;
  consecutiveFailures: number;
}