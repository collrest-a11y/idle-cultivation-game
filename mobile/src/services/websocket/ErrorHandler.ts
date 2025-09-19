/**
 * ErrorHandler - Comprehensive error handling and recovery system for WebSocket connections
 * Provides error classification, recovery strategies, and user-friendly error reporting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WebSocketError,
  WebSocketErrorType,
  ConnectionState,
  NetworkStatus,
} from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export interface ErrorContext {
  connectionState: ConnectionState;
  networkStatus: NetworkStatus;
  attemptCount: number;
  lastSuccessfulConnection: number;
  userAction?: string;
}

export interface RecoveryStrategy {
  type: 'immediate' | 'delayed' | 'manual' | 'fallback';
  delay?: number;
  maxAttempts?: number;
  fallbackAction?: string;
  userAction?: string;
}

export interface ErrorReport {
  error: WebSocketError;
  context: ErrorContext;
  strategy: RecoveryStrategy;
  timestamp: number;
  resolved: boolean;
  resolutionTime?: number;
}

export interface ErrorHandlerConfig {
  maxRetryAttempts: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  errorReportingEnabled: boolean;
  userNotificationsEnabled: boolean;
  persistErrorLogs: boolean;
  logRetentionDays: number;
}

export class ErrorHandler {
  private eventEmitter: EventEmitter;
  private config: ErrorHandlerConfig;
  private errorReports: ErrorReport[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private lastError: WebSocketError | null = null;
  private isRecovering = false;
  private currentContext: ErrorContext;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.eventEmitter = new EventEmitter();
    this.config = {
      maxRetryAttempts: 5,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      errorReportingEnabled: true,
      userNotificationsEnabled: true,
      persistErrorLogs: true,
      logRetentionDays: 7,
      ...config,
    };

    this.currentContext = {
      connectionState: ConnectionState.DISCONNECTED,
      networkStatus: { isConnected: false, type: null, isInternetReachable: null },
      attemptCount: 0,
      lastSuccessfulConnection: 0,
    };

    this.loadPersistedErrors();
  }

  /**
   * Handle a WebSocket error with appropriate recovery strategy
   */
  public async handleError(
    error: WebSocketError,
    context: Partial<ErrorContext> = {}
  ): Promise<RecoveryStrategy> {
    this.lastError = error;
    this.currentContext = { ...this.currentContext, ...context };

    // Classify error and determine recovery strategy
    const strategy = this.determineRecoveryStrategy(error, this.currentContext);

    // Create error report
    const report: ErrorReport = {
      error,
      context: this.currentContext,
      strategy,
      timestamp: Date.now(),
      resolved: false,
    };

    this.errorReports.push(report);
    await this.persistErrorReport(report);

    // Execute recovery strategy
    await this.executeRecoveryStrategy(strategy, report);

    // Emit error event for UI handling
    this.eventEmitter.emit('error', { error, strategy, report });

    return strategy;
  }

  /**
   * Determine appropriate recovery strategy based on error type and context
   */
  private determineRecoveryStrategy(
    error: WebSocketError,
    context: ErrorContext
  ): RecoveryStrategy {
    const errorKey = `${error.type}_${error.message}`;
    const attemptCount = this.recoveryAttempts.get(errorKey) || 0;

    // Check if max attempts exceeded
    if (attemptCount >= this.config.maxRetryAttempts) {
      return {
        type: 'manual',
        userAction: 'Please check your connection and try again manually',
      };
    }

    switch (error.type) {
      case WebSocketErrorType.CONNECTION_FAILED:
        return this.handleConnectionFailure(error, context, attemptCount);

      case WebSocketErrorType.AUTHENTICATION_FAILED:
        return this.handleAuthenticationFailure(error, context, attemptCount);

      case WebSocketErrorType.NETWORK_ERROR:
        return this.handleNetworkError(error, context, attemptCount);

      case WebSocketErrorType.TIMEOUT:
        return this.handleTimeoutError(error, context, attemptCount);

      case WebSocketErrorType.SERVER_ERROR:
        return this.handleServerError(error, context, attemptCount);

      case WebSocketErrorType.INVALID_DATA:
        return this.handleInvalidDataError(error, context, attemptCount);

      default:
        return this.handleUnknownError(error, context, attemptCount);
    }
  }

  /**
   * Handle connection failure errors
   */
  private handleConnectionFailure(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    if (!context.networkStatus.isConnected) {
      return {
        type: 'manual',
        userAction: 'Please check your internet connection',
      };
    }

    if (attemptCount < 3) {
      return {
        type: 'delayed',
        delay: this.calculateBackoffDelay(attemptCount),
        maxAttempts: 3,
      };
    }

    return {
      type: 'fallback',
      fallbackAction: 'switch_to_polling',
      userAction: 'Switching to fallback connection mode',
    };
  }

  /**
   * Handle authentication failure errors
   */
  private handleAuthenticationFailure(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    if (attemptCount === 0) {
      return {
        type: 'immediate',
        userAction: 'Refreshing authentication token',
      };
    }

    return {
      type: 'manual',
      userAction: 'Please log in again',
    };
  }

  /**
   * Handle network error
   */
  private handleNetworkError(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    if (!context.networkStatus.isConnected) {
      return {
        type: 'manual',
        userAction: 'Waiting for network connection',
      };
    }

    return {
      type: 'delayed',
      delay: this.calculateBackoffDelay(attemptCount),
      maxAttempts: this.config.maxRetryAttempts,
    };
  }

  /**
   * Handle timeout errors
   */
  private handleTimeoutError(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    if (attemptCount < 2) {
      return {
        type: 'immediate',
      };
    }

    return {
      type: 'delayed',
      delay: this.calculateBackoffDelay(attemptCount),
      maxAttempts: 3,
    };
  }

  /**
   * Handle server errors
   */
  private handleServerError(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    // Server errors might be temporary
    if (attemptCount < 2) {
      return {
        type: 'delayed',
        delay: 5000, // Wait 5 seconds for server issues
      };
    }

    return {
      type: 'manual',
      userAction: 'Server is experiencing issues. Please try again later.',
    };
  }

  /**
   * Handle invalid data errors
   */
  private handleInvalidDataError(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    // Invalid data errors are usually not recoverable automatically
    return {
      type: 'manual',
      userAction: 'Data error occurred. Please refresh the app.',
    };
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(
    error: WebSocketError,
    context: ErrorContext,
    attemptCount: number
  ): RecoveryStrategy {
    if (attemptCount < 1) {
      return {
        type: 'delayed',
        delay: 2000,
      };
    }

    return {
      type: 'manual',
      userAction: 'An unexpected error occurred. Please try again.',
    };
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy,
    report: ErrorReport
  ): Promise<void> {
    const errorKey = `${report.error.type}_${report.error.message}`;

    switch (strategy.type) {
      case 'immediate':
        this.eventEmitter.emit('recovery:immediate', { strategy, report });
        break;

      case 'delayed':
        if (strategy.delay) {
          await this.scheduleDelayedRecovery(strategy.delay, report);
        }
        break;

      case 'fallback':
        this.eventEmitter.emit('recovery:fallback', { strategy, report });
        break;

      case 'manual':
        this.eventEmitter.emit('recovery:manual', { strategy, report });
        if (this.config.userNotificationsEnabled && strategy.userAction) {
          this.showUserNotification(strategy.userAction, 'error');
        }
        break;
    }

    // Increment attempt counter
    const currentAttempts = this.recoveryAttempts.get(errorKey) || 0;
    this.recoveryAttempts.set(errorKey, currentAttempts + 1);
  }

  /**
   * Schedule delayed recovery
   */
  private async scheduleDelayedRecovery(delay: number, report: ErrorReport): Promise<void> {
    this.isRecovering = true;

    setTimeout(() => {
      this.isRecovering = false;
      this.eventEmitter.emit('recovery:delayed', { delay, report });
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attemptCount: number): number {
    const delay = this.config.baseRetryDelay * Math.pow(2, attemptCount);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(delay + jitter, this.config.maxRetryDelay);
  }

  /**
   * Mark error as resolved
   */
  public markErrorResolved(errorId: string): void {
    const report = this.errorReports.find(r =>
      `${r.error.type}_${r.timestamp}` === errorId
    );

    if (report) {
      report.resolved = true;
      report.resolutionTime = Date.now();
      this.persistErrorReport(report);
      this.eventEmitter.emit('error:resolved', report);
    }
  }

  /**
   * Clear error state for successful recovery
   */
  public clearErrorState(): void {
    this.recoveryAttempts.clear();
    this.lastError = null;
    this.isRecovering = false;
    this.currentContext.attemptCount = 0;
    this.currentContext.lastSuccessfulConnection = Date.now();

    this.eventEmitter.emit('error:cleared');
  }

  /**
   * Update connection context
   */
  public updateContext(context: Partial<ErrorContext>): void {
    this.currentContext = { ...this.currentContext, ...context };
  }

  /**
   * Get current error state
   */
  public getErrorState(): {
    lastError: WebSocketError | null;
    isRecovering: boolean;
    context: ErrorContext;
    recentErrors: ErrorReport[];
  } {
    return {
      lastError: this.lastError,
      isRecovering: this.isRecovering,
      context: this.currentContext,
      recentErrors: this.errorReports.slice(-10),
    };
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    resolvedErrors: number;
    errorsByType: Record<string, number>;
    averageResolutionTime: number;
  } {
    const resolvedReports = this.errorReports.filter(r => r.resolved);
    const errorsByType: Record<string, number> = {};

    this.errorReports.forEach(report => {
      errorsByType[report.error.type] = (errorsByType[report.error.type] || 0) + 1;
    });

    const totalResolutionTime = resolvedReports.reduce((sum, report) => {
      return sum + (report.resolutionTime! - report.timestamp);
    }, 0);

    return {
      totalErrors: this.errorReports.length,
      resolvedErrors: resolvedReports.length,
      errorsByType,
      averageResolutionTime: resolvedReports.length > 0
        ? totalResolutionTime / resolvedReports.length
        : 0,
    };
  }

  /**
   * Show user notification
   */
  private showUserNotification(message: string, type: 'error' | 'warning' | 'info'): void {
    // In a real app, this would trigger platform-specific notifications
    console.log(`[${type.toUpperCase()}] ${message}`);
    this.eventEmitter.emit('notification', { message, type });
  }

  /**
   * Persist error report to local storage
   */
  private async persistErrorReport(report: ErrorReport): Promise<void> {
    if (!this.config.persistErrorLogs) {
      return;
    }

    try {
      const key = `error_log_${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));
    } catch (error) {
      console.error('Failed to persist error report:', error);
    }
  }

  /**
   * Load persisted errors from storage
   */
  private async loadPersistedErrors(): Promise<void> {
    if (!this.config.persistErrorLogs) {
      return;
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      const errorKeys = keys.filter(key => key.startsWith('error_log_'));

      for (const key of errorKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const report: ErrorReport = JSON.parse(data);

          // Check if error is within retention period
          const age = Date.now() - report.timestamp;
          const maxAge = this.config.logRetentionDays * 24 * 60 * 60 * 1000;

          if (age > maxAge) {
            await AsyncStorage.removeItem(key);
          } else {
            this.errorReports.push(report);
          }
        }
      }

      // Sort by timestamp
      this.errorReports.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Failed to load persisted errors:', error);
    }
  }

  /**
   * Clean up old error logs
   */
  public async cleanupOldErrors(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.logRetentionDays * 24 * 60 * 60 * 1000);

    // Remove from memory
    this.errorReports = this.errorReports.filter(report => report.timestamp > cutoffTime);

    // Remove from storage
    if (this.config.persistErrorLogs) {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const errorKeys = keys.filter(key => key.startsWith('error_log_'));

        for (const key of errorKeys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const report: ErrorReport = JSON.parse(data);
            if (report.timestamp <= cutoffTime) {
              await AsyncStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.error('Failed to cleanup old errors:', error);
      }
    }
  }

  /**
   * Export error reports for debugging
   */
  public exportErrorReports(): string {
    return JSON.stringify({
      errorReports: this.errorReports,
      stats: this.getErrorStats(),
      config: this.config,
      exportTime: Date.now(),
    }, null, 2);
  }

  /**
   * Subscribe to error handler events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from error handler events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.eventEmitter.removeAllListeners();
    this.recoveryAttempts.clear();
  }
}