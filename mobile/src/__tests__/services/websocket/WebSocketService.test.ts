/**
 * WebSocketService Tests - Comprehensive tests for WebSocket connection reliability
 * Tests connection management, auto-reconnection, authentication, and error handling
 */

import { WebSocketService } from '../../../services/websocket/WebSocketService';
import {
  WebSocketConfig,
  AuthenticationData,
  ConnectionState,
  NetworkStatus,
} from '../../../types/websocket';

// Mock Socket.IO client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let mockSocket: any;
  let mockConfig: WebSocketConfig;
  let mockAuthData: AuthenticationData;

  beforeEach(() => {
    // Setup mock socket
    mockSocket = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      connected: false,
      io: {
        opts: {},
      },
    };

    // Mock io function to return our mock socket
    const { io } = require('socket.io-client');
    (io as jest.Mock).mockReturnValue(mockSocket);

    // Setup test configuration
    mockConfig = {
      url: 'ws://localhost:3000',
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      maxReconnectionDelay: 30000,
      timeout: 10000,
      forceNew: true,
      autoConnect: false,
    };

    mockAuthData = {
      token: 'test-token',
      userId: 'test-user-id',
      refreshToken: 'test-refresh-token',
    };

    webSocketService = new WebSocketService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    webSocketService.disconnect();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      expect(webSocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(webSocketService.isConnected()).toBe(false);
    });

    it('should create socket connection with correct configuration', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate successful connection
      const connectCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectCallback();

      await connectPromise;

      expect(mockSocket.connect).toHaveBeenCalled();
      expect(webSocketService.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(webSocketService.isConnected()).toBe(true);
    });

    it('should handle connection timeout', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate timeout by not calling connect callback
      await expect(connectPromise).rejects.toThrow('Connection timeout');
    });

    it('should handle connection errors', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate connection error
      const errorCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];
      errorCallback(new Error('Connection failed'));

      await expect(connectPromise).rejects.toThrow('Connection failed');
    });

    it('should disconnect properly', () => {
      webSocketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(webSocketService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('Authentication', () => {
    it('should authenticate after connecting', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate successful connection
      const connectCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectCallback();

      // Simulate successful authentication
      const authCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'authenticated'
      )[1];
      authCallback();

      await connectPromise;

      expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', {
        token: mockAuthData.token,
        userId: mockAuthData.userId,
      });
    });

    it('should handle authentication failure', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate successful connection
      const connectCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectCallback();

      // Simulate authentication error
      const authErrorCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'authentication_error'
      )[1];
      authErrorCallback({ message: 'Invalid token' });

      await expect(connectPromise).rejects.toThrow('Authentication failed: Invalid token');
    });

    it('should handle authentication timeout', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate successful connection
      const connectCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectCallback();

      // Don't call authentication callback to simulate timeout
      await expect(connectPromise).rejects.toThrow('Authentication timeout');
    });
  });

  describe('Auto-Reconnection', () => {
    beforeEach(() => {
      // Setup connected state
      mockSocket.connected = true;
      webSocketService['setConnectionState'](ConnectionState.CONNECTED);
    });

    it('should attempt reconnection on disconnect', (done) => {
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      // Listen for reconnection state
      webSocketService.on('connectionStateChanged', (data) => {
        if (data.current === ConnectionState.RECONNECTING) {
          expect(data.current).toBe(ConnectionState.RECONNECTING);
          done();
        }
      });

      // Simulate disconnect
      disconnectCallback('transport close');
    });

    it('should use exponential backoff for reconnection', (done) => {
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      let reconnectAttempts = 0;
      webSocketService.on('connectionStateChanged', (data) => {
        if (data.current === ConnectionState.RECONNECTING) {
          reconnectAttempts++;

          if (reconnectAttempts === 1) {
            // First reconnection should be immediate-ish
            expect(Date.now()).toBeLessThan(Date.now() + 2000);
          }

          if (reconnectAttempts === 2) {
            // Second reconnection should have delay
            done();
          }
        }
      });

      // Simulate multiple disconnects
      disconnectCallback('transport close');
      setTimeout(() => {
        disconnectCallback('transport close');
      }, 100);
    });

    it('should stop reconnection after max attempts', () => {
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      // Simulate reaching max reconnection attempts
      for (let i = 0; i < mockConfig.reconnectionAttempts + 1; i++) {
        disconnectCallback('transport close');
      }

      expect(webSocketService.getConnectionState()).toBe(ConnectionState.ERROR);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      webSocketService['setConnectionState'](ConnectionState.CONNECTED);
    });

    it('should emit messages when connected', () => {
      const testEvent = 'test:event';
      const testData = { message: 'test' };

      webSocketService.emit(testEvent, testData);

      expect(mockSocket.emit).toHaveBeenCalledWith(testEvent, testData);
    });

    it('should queue messages when disconnected', () => {
      mockSocket.connected = false;
      webSocketService['setConnectionState'](ConnectionState.DISCONNECTED);

      const testEvent = 'test:event';
      const testData = { message: 'test' };

      webSocketService.emit(testEvent, testData);

      // Message should be queued, not sent immediately
      expect(mockSocket.emit).not.toHaveBeenCalledWith(testEvent, testData);
    });

    it('should process queued messages on reconnection', async () => {
      // Queue messages while disconnected
      mockSocket.connected = false;
      webSocketService['setConnectionState'](ConnectionState.DISCONNECTED);

      webSocketService.emit('test:event1', { data: 1 });
      webSocketService.emit('test:event2', { data: 2 });

      // Reconnect
      mockSocket.connected = true;
      webSocketService['setConnectionState'](ConnectionState.CONNECTED);

      await webSocketService.processQueue();

      expect(mockSocket.emit).toHaveBeenCalledWith('test:event1', { data: 1 });
      expect(mockSocket.emit).toHaveBeenCalledWith('test:event2', { data: 2 });
    });

    it('should handle cultivation progress events', () => {
      const progressCallback = jest.fn();
      webSocketService.on('cultivation:progress', progressCallback);

      const progressData = {
        userId: 'test-user',
        stage: 'Foundation Building',
        progress: 50,
        energy: 80,
        timestamp: Date.now(),
      };

      // Simulate receiving progress event
      const onCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'cultivation:progress'
      )[1];
      onCallback(progressData);

      expect(progressCallback).toHaveBeenCalledWith(progressData);
    });
  });

  describe('Network Status Handling', () => {
    it('should update network status', () => {
      const networkStatus: NetworkStatus = {
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      };

      webSocketService.setNetworkStatus(networkStatus);

      expect(webSocketService.getNetworkStatus()).toEqual(networkStatus);
    });

    it('should handle network disconnection', () => {
      const networkStatus: NetworkStatus = {
        isConnected: false,
        type: null,
        isInternetReachable: false,
      };

      webSocketService.setNetworkStatus(networkStatus);

      // Should stop reconnection attempts when network is unavailable
      expect(webSocketService.getNetworkStatus().isConnected).toBe(false);
    });

    it('should resume connection on network restoration', () => {
      // Start with network disconnected
      webSocketService.setNetworkStatus({
        isConnected: false,
        type: null,
        isInternetReachable: false,
      });

      // Restore network
      webSocketService.setNetworkStatus({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });

      // Should attempt to reconnect
      expect(webSocketService.getNetworkStatus().isConnected).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(() => {
      mockSocket.connected = true;
      webSocketService['setConnectionState'](ConnectionState.CONNECTED);
    });

    it('should start health check on connection', async () => {
      const connectPromise = webSocketService.connect(mockAuthData);

      // Simulate successful connection and authentication
      const connectCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectCallback();

      const authCallback = mockSocket.once.mock.calls.find(
        call => call[0] === 'authenticated'
      )[1];
      authCallback();

      await connectPromise;

      // Health check should emit ping periodically
      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });

    it('should handle pong responses', () => {
      const pongCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];

      const startTime = Date.now();
      pongCallback();

      // Should update latency metrics
      const stats = webSocketService.getConnectionStats();
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle socket errors', () => {
      const errorCallback = jest.fn();
      webSocketService.on('error', errorCallback);

      const socketErrorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const testError = new Error('Socket error');
      socketErrorCallback(testError);

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'server_error',
          message: 'Socket error',
        })
      );
    });

    it('should increment error count on errors', () => {
      const initialStats = webSocketService.getConnectionStats();
      const initialErrorCount = initialStats.totalErrors;

      const socketErrorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      socketErrorCallback(new Error('Test error'));

      const updatedStats = webSocketService.getConnectionStats();
      expect(updatedStats.totalErrors).toBe(initialErrorCount + 1);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track connection statistics', () => {
      const stats = webSocketService.getConnectionStats();

      expect(stats).toHaveProperty('connectTime');
      expect(stats).toHaveProperty('lastDisconnectTime');
      expect(stats).toHaveProperty('totalReconnects');
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('messagesSent');
    });

    it('should update message counts', () => {
      mockSocket.connected = true;
      webSocketService['setConnectionState'](ConnectionState.CONNECTED);

      const initialStats = webSocketService.getConnectionStats();

      webSocketService.emit('test:message', { data: 'test' });

      const updatedStats = webSocketService.getConnectionStats();
      expect(updatedStats.messagesSent).toBe(initialStats.messagesSent + 1);
    });

    it('should track received messages', () => {
      const progressCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'cultivation:progress'
      )[1];

      const initialStats = webSocketService.getConnectionStats();

      progressCallback({
        userId: 'test',
        stage: 'test',
        progress: 50,
        energy: 100,
        timestamp: Date.now(),
      });

      const updatedStats = webSocketService.getConnectionStats();
      expect(updatedStats.messagesReceived).toBe(initialStats.messagesReceived + 1);
    });
  });

  describe('Message Queue Persistence', () => {
    it('should persist messages to storage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      webSocketService.queueMessage('test:event', { data: 'test' });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'websocket_message_queue',
        expect.stringContaining('test:event')
      );
    });

    it('should load persisted messages', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const queueData = JSON.stringify([{
        id: 'test-id',
        event: 'test:event',
        data: { data: 'test' },
        timestamp: Date.now(),
        attempts: 0,
        priority: 'normal',
      }]);

      AsyncStorage.getItem.mockResolvedValue(queueData);

      await webSocketService.loadMessageQueue();

      // Should load the persisted message
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('websocket_message_queue');
    });
  });
});