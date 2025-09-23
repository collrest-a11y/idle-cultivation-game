/**
 * AuthenticationService - Handle WebSocket authentication and token management
 * Integrates with the existing authentication system for secure WebSocket connections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthenticationData,
  WebSocketError,
  WebSocketErrorType,
} from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export interface TokenInfo {
  token: string;
  refreshToken?: string;
  userId: string;
  expiresAt: number;
  scope: string[];
}

export interface AuthenticationResult {
  success: boolean;
  authData?: AuthenticationData;
  error?: WebSocketError;
}

export class AuthenticationService {
  private eventEmitter: EventEmitter;
  private tokenInfo: TokenInfo | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'websocket_auth_token';
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Initialize authentication service and load stored tokens
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadStoredToken();
      if (this.tokenInfo && this.isTokenValid()) {
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      console.error('Failed to initialize authentication service:', error);
    }
  }

  /**
   * Authenticate with credentials and get WebSocket auth data
   */
  public async authenticate(credentials: {
    username?: string;
    email?: string;
    password?: string;
    token?: string; // For token-based auth
  }): Promise<AuthenticationResult> {
    try {
      let authResponse;

      if (credentials.token) {
        // Token-based authentication
        authResponse = await this.authenticateWithToken(credentials.token);
      } else if (credentials.username || credentials.email) {
        // Credential-based authentication
        authResponse = await this.authenticateWithCredentials(credentials);
      } else {
        throw new Error('Invalid authentication credentials');
      }

      if (authResponse.success && authResponse.tokenInfo) {
        this.tokenInfo = authResponse.tokenInfo;
        await this.storeToken(this.tokenInfo);
        this.scheduleTokenRefresh();

        const authData: AuthenticationData = {
          token: this.tokenInfo.token,
          userId: this.tokenInfo.userId,
          refreshToken: this.tokenInfo.refreshToken,
        };

        this.eventEmitter.emit('authenticated', authData);

        return {
          success: true,
          authData,
        };
      }

      throw new Error(authResponse.error || 'Authentication failed');
    } catch (error) {
      const authError: WebSocketError = {
        type: WebSocketErrorType.AUTHENTICATION_FAILED,
        message: error instanceof Error ? error.message : 'Authentication failed',
        originalError: error instanceof Error ? error : undefined,
        timestamp: Date.now(),
        retryable: true,
      };

      this.eventEmitter.emit('authentication_error', authError);

      return {
        success: false,
        error: authError,
      };
    }
  }

  /**
   * Authenticate using existing token
   */
  private async authenticateWithToken(token: string): Promise<{
    success: boolean;
    tokenInfo?: TokenInfo;
    error?: string;
  }> {
    try {
      // In a real app, this would validate the token with your backend
      // For now, we'll simulate token validation
      const response = await this.validateTokenWithBackend(token);

      if (response.valid) {
        return {
          success: true,
          tokenInfo: response.tokenInfo,
        };
      }

      return {
        success: false,
        error: 'Invalid token',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Authenticate using username/email and password
   */
  private async authenticateWithCredentials(credentials: {
    username?: string;
    email?: string;
    password?: string;
  }): Promise<{
    success: boolean;
    tokenInfo?: TokenInfo;
    error?: string;
  }> {
    try {
      // In a real app, this would authenticate with your backend API
      const response = await this.authenticateWithBackend(credentials);

      if (response.success && response.tokenInfo) {
        return {
          success: true,
          tokenInfo: response.tokenInfo,
        };
      }

      return {
        success: false,
        error: response.error || 'Authentication failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication request failed',
      };
    }
  }

  /**
   * Simulate backend token validation (replace with actual API call)
   */
  private async validateTokenWithBackend(token: string): Promise<{
    valid: boolean;
    tokenInfo?: TokenInfo;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo purposes, assume token is valid if it's not empty
    // In real implementation, make HTTP request to your auth API
    if (token && token.length > 10) {
      return {
        valid: true,
        tokenInfo: {
          token,
          userId: 'user_' + Math.random().toString(36).substr(2, 9),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          scope: ['cultivation', 'profile', 'social'],
        },
      };
    }

    return { valid: false };
  }

  /**
   * Simulate backend authentication (replace with actual API call)
   */
  private async authenticateWithBackend(credentials: {
    username?: string;
    email?: string;
    password?: string;
  }): Promise<{
    success: boolean;
    tokenInfo?: TokenInfo;
    error?: string;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo purposes, assume authentication succeeds for non-empty credentials
    // In real implementation, make HTTP request to your auth API
    if ((credentials.username || credentials.email) && credentials.password) {
      const token = 'ws_token_' + Math.random().toString(36).substr(2, 20);
      const refreshToken = 'refresh_' + Math.random().toString(36).substr(2, 20);

      return {
        success: true,
        tokenInfo: {
          token,
          refreshToken,
          userId: 'user_' + Math.random().toString(36).substr(2, 9),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          scope: ['cultivation', 'profile', 'social'],
        },
      };
    }

    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<AuthenticationResult> {
    if (!this.tokenInfo || !this.tokenInfo.refreshToken) {
      const error: WebSocketError = {
        type: WebSocketErrorType.AUTHENTICATION_FAILED,
        message: 'No refresh token available',
        timestamp: Date.now(),
        retryable: false,
      };

      return {
        success: false,
        error,
      };
    }

    try {
      const response = await this.refreshTokenWithBackend(this.tokenInfo.refreshToken);

      if (response.success && response.tokenInfo) {
        this.tokenInfo = response.tokenInfo;
        await this.storeToken(this.tokenInfo);
        this.scheduleTokenRefresh();

        const authData: AuthenticationData = {
          token: this.tokenInfo.token,
          userId: this.tokenInfo.userId,
          refreshToken: this.tokenInfo.refreshToken,
        };

        this.eventEmitter.emit('token_refreshed', authData);

        return {
          success: true,
          authData,
        };
      }

      throw new Error(response.error || 'Token refresh failed');
    } catch (error) {
      const refreshError: WebSocketError = {
        type: WebSocketErrorType.AUTHENTICATION_FAILED,
        message: error instanceof Error ? error.message : 'Token refresh failed',
        originalError: error instanceof Error ? error : undefined,
        timestamp: Date.now(),
        retryable: true,
      };

      this.eventEmitter.emit('token_refresh_error', refreshError);

      return {
        success: false,
        error: refreshError,
      };
    }
  }

  /**
   * Simulate backend token refresh (replace with actual API call)
   */
  private async refreshTokenWithBackend(refreshToken: string): Promise<{
    success: boolean;
    tokenInfo?: TokenInfo;
    error?: string;
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo purposes, assume refresh succeeds if refresh token exists
    // In real implementation, make HTTP request to your auth API
    if (refreshToken) {
      const newToken = 'ws_token_' + Math.random().toString(36).substr(2, 20);
      const newRefreshToken = 'refresh_' + Math.random().toString(36).substr(2, 20);

      return {
        success: true,
        tokenInfo: {
          token: newToken,
          refreshToken: newRefreshToken,
          userId: this.tokenInfo!.userId,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          scope: this.tokenInfo!.scope,
        },
      };
    }

    return {
      success: false,
      error: 'Invalid refresh token',
    };
  }

  /**
   * Get current authentication data for WebSocket connection
   */
  public getCurrentAuthData(): AuthenticationData | null {
    if (!this.tokenInfo || !this.isTokenValid()) {
      return null;
    }

    return {
      token: this.tokenInfo.token,
      userId: this.tokenInfo.userId,
      refreshToken: this.tokenInfo.refreshToken,
    };
  }

  /**
   * Check if current token is valid and not expired
   */
  public isTokenValid(): boolean {
    if (!this.tokenInfo) {
      return false;
    }

    return Date.now() < this.tokenInfo.expiresAt;
  }

  /**
   * Check if token is about to expire and needs refresh
   */
  public shouldRefreshToken(): boolean {
    if (!this.tokenInfo) {
      return false;
    }

    return Date.now() > (this.tokenInfo.expiresAt - this.REFRESH_THRESHOLD);
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenInfo) {
      return;
    }

    const refreshTime = this.tokenInfo.expiresAt - this.REFRESH_THRESHOLD;
    const delay = refreshTime - Date.now();

    if (delay > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, delay);
    }
  }

  /**
   * Store token information securely
   */
  private async storeToken(tokenInfo: TokenInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokenInfo));
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  /**
   * Load stored token information
   */
  private async loadStoredToken(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        this.tokenInfo = JSON.parse(storedData);
      }
    } catch (error) {
      console.error('Failed to load stored token:', error);
    }
  }

  /**
   * Clear stored authentication data
   */
  public async logout(): Promise<void> {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.tokenInfo = null;

    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored token:', error);
    }

    this.eventEmitter.emit('logged_out');
  }

  /**
   * Get token expiration information
   */
  public getTokenExpiration(): { expiresAt: number; expiresIn: number } | null {
    if (!this.tokenInfo) {
      return null;
    }

    return {
      expiresAt: this.tokenInfo.expiresAt,
      expiresIn: this.tokenInfo.expiresAt - Date.now(),
    };
  }

  /**
   * Subscribe to authentication events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from authentication events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }
}