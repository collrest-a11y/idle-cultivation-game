/**
 * MessageQueue - Reliable message queuing for offline scenarios
 * Handles message persistence, prioritization, and automatic retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedMessage, NetworkStatus } from '../../types/websocket';
import { EventEmitter } from '../../utils/EventEmitter';

export interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryBackoffBase: number;
  persistenceKey: string;
  priorityLevels: Record<string, number>;
}

export interface QueueStats {
  totalMessages: number;
  pendingMessages: number;
  failedMessages: number;
  processingRate: number;
  lastProcessedAt: number;
}

export interface MessageResult {
  success: boolean;
  messageId: string;
  error?: Error;
  retryAfter?: number;
}

export type MessageProcessor = (message: QueuedMessage) => Promise<MessageResult>;

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private failedQueue: QueuedMessage[] = [];
  private processing = false;
  private eventEmitter: EventEmitter;
  private config: QueueConfig;
  private stats: QueueStats;
  private messageProcessor: MessageProcessor | null = null;
  private processingTimer: NodeJS.Timeout | null = null;
  private networkStatus: NetworkStatus;

  constructor(config: Partial<QueueConfig> = {}) {
    this.eventEmitter = new EventEmitter();
    this.config = {
      maxQueueSize: 1000,
      maxRetries: 3,
      retryBackoffBase: 2000, // 2 seconds base delay
      persistenceKey: 'websocket_message_queue',
      priorityLevels: {
        high: 3,
        normal: 2,
        low: 1,
      },
      ...config,
    };

    this.stats = {
      totalMessages: 0,
      pendingMessages: 0,
      failedMessages: 0,
      processingRate: 0,
      lastProcessedAt: 0,
    };

    this.networkStatus = {
      isConnected: false,
      type: null,
      isInternetReachable: null,
    };
  }

  /**
   * Initialize message queue and load persisted messages
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadPersistedMessages();
      this.updateStats();
      this.startPeriodicProcessing();
    } catch (error) {
      console.error('Failed to initialize message queue:', error);
    }
  }

  /**
   * Set the message processor function
   */
  public setMessageProcessor(processor: MessageProcessor): void {
    this.messageProcessor = processor;
  }

  /**
   * Add a message to the queue
   */
  public async enqueue(
    event: string,
    data: any,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const message: QueuedMessage = {
      id: this.generateMessageId(),
      event,
      data,
      timestamp: Date.now(),
      attempts: 0,
      priority,
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      await this.removeOldestLowPriorityMessage();
    }

    this.queue.push(message);
    this.sortQueueByPriority();
    this.updateStats();

    await this.persistMessages();

    this.eventEmitter.emit('messageQueued', message);

    // Try to process immediately if connected
    if (this.networkStatus.isConnected && !this.processing) {
      this.processQueue();
    }

    return message.id;
  }

  /**
   * Process queued messages
   */
  public async processQueue(): Promise<void> {
    if (this.processing || !this.messageProcessor || !this.networkStatus.isConnected) {
      return;
    }

    this.processing = true;
    const startTime = Date.now();
    let processedCount = 0;

    try {
      while (this.queue.length > 0 && this.networkStatus.isConnected) {
        const message = this.queue.shift()!;

        try {
          const result = await this.messageProcessor(message);

          if (result.success) {
            processedCount++;
            this.eventEmitter.emit('messageProcessed', { message, result });
          } else {
            await this.handleFailedMessage(message, result.error);
          }
        } catch (error) {
          await this.handleFailedMessage(message, error as Error);
        }

        // Small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      this.processing = false;
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processedCount, processingTime);
      await this.persistMessages();
    }
  }

  /**
   * Handle failed message processing
   */
  private async handleFailedMessage(message: QueuedMessage, error?: Error): Promise<void> {
    message.attempts++;

    if (message.attempts < this.config.maxRetries) {
      // Calculate retry delay with exponential backoff
      const delay = this.config.retryBackoffBase * Math.pow(2, message.attempts - 1);

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;

      setTimeout(() => {
        this.queue.unshift(message); // Add to front for immediate retry
        this.sortQueueByPriority();
      }, delay + jitter);

      this.eventEmitter.emit('messageRetry', { message, error, delay });
    } else {
      // Move to failed queue after max retries
      this.failedQueue.push(message);
      this.stats.failedMessages++;
      this.eventEmitter.emit('messageFailed', { message, error });
    }
  }

  /**
   * Retry failed messages
   */
  public async retryFailedMessages(): Promise<void> {
    const retryMessages = [...this.failedQueue];
    this.failedQueue = [];

    for (const message of retryMessages) {
      message.attempts = 0; // Reset attempt count
      await this.enqueue(message.event, message.data, message.priority);
    }

    this.eventEmitter.emit('failedMessagesRetried', { count: retryMessages.length });
  }

  /**
   * Clear all failed messages
   */
  public async clearFailedMessages(): Promise<void> {
    const count = this.failedQueue.length;
    this.failedQueue = [];
    this.stats.failedMessages = 0;
    await this.persistMessages();
    this.eventEmitter.emit('failedMessagesCleared', { count });
  }

  /**
   * Remove a specific message from the queue
   */
  public async removeMessage(messageId: string): Promise<boolean> {
    const queueIndex = this.queue.findIndex(msg => msg.id === messageId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      await this.persistMessages();
      this.updateStats();
      return true;
    }

    const failedIndex = this.failedQueue.findIndex(msg => msg.id === messageId);
    if (failedIndex !== -1) {
      this.failedQueue.splice(failedIndex, 1);
      this.stats.failedMessages--;
      await this.persistMessages();
      return true;
    }

    return false;
  }

  /**
   * Clear entire queue
   */
  public async clearQueue(): Promise<void> {
    const totalCleared = this.queue.length + this.failedQueue.length;
    this.queue = [];
    this.failedQueue = [];
    this.updateStats();
    await this.persistMessages();
    this.eventEmitter.emit('queueCleared', { count: totalCleared });
  }

  /**
   * Get queue status and statistics
   */
  public getQueueStatus(): {
    pending: QueuedMessage[];
    failed: QueuedMessage[];
    stats: QueueStats;
    isProcessing: boolean;
  } {
    return {
      pending: [...this.queue],
      failed: [...this.failedQueue],
      stats: { ...this.stats },
      isProcessing: this.processing,
    };
  }

  /**
   * Update network status to influence processing
   */
  public setNetworkStatus(status: NetworkStatus): void {
    const wasConnected = this.networkStatus.isConnected;
    this.networkStatus = status;

    // Start processing when network becomes available
    if (!wasConnected && status.isConnected && this.queue.length > 0) {
      this.processQueue();
    }

    this.eventEmitter.emit('networkStatusChanged', status);
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueueByPriority(): void {
    this.queue.sort((a, b) => {
      const priorityA = this.config.priorityLevels[a.priority] || 0;
      const priorityB = this.config.priorityLevels[b.priority] || 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      return a.timestamp - b.timestamp; // Older messages first within same priority
    });
  }

  /**
   * Remove oldest low-priority message to make room
   */
  private async removeOldestLowPriorityMessage(): Promise<void> {
    // Find the oldest low-priority message
    let oldestIndex = -1;
    let oldestTimestamp = Date.now();

    for (let i = this.queue.length - 1; i >= 0; i--) {
      const message = this.queue[i];
      if (message.priority === 'low' && message.timestamp < oldestTimestamp) {
        oldestIndex = i;
        oldestTimestamp = message.timestamp;
      }
    }

    if (oldestIndex !== -1) {
      const removed = this.queue.splice(oldestIndex, 1)[0];
      this.eventEmitter.emit('messageDropped', removed);
    } else {
      // If no low-priority messages, remove oldest normal priority
      const removed = this.queue.shift();
      if (removed) {
        this.eventEmitter.emit('messageDropped', removed);
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update queue statistics
   */
  private updateStats(): void {
    this.stats.pendingMessages = this.queue.length;
    this.stats.totalMessages = this.stats.pendingMessages + this.stats.failedMessages;
  }

  /**
   * Update processing rate statistics
   */
  private updateProcessingStats(processed: number, timeMs: number): void {
    if (timeMs > 0) {
      this.stats.processingRate = (processed / timeMs) * 1000; // Messages per second
    }
    this.stats.lastProcessedAt = Date.now();
  }

  /**
   * Start periodic processing for queued messages
   */
  private startPeriodicProcessing(): void {
    this.processingTimer = setInterval(() => {
      if (this.networkStatus.isConnected && this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop periodic processing
   */
  public stopPeriodicProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Persist messages to local storage
   */
  private async persistMessages(): Promise<void> {
    try {
      const queueData = {
        queue: this.queue,
        failedQueue: this.failedQueue,
        stats: this.stats,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(this.config.persistenceKey, JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to persist messages:', error);
    }
  }

  /**
   * Load persisted messages from local storage
   */
  private async loadPersistedMessages(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.config.persistenceKey);
      if (data) {
        const queueData = JSON.parse(data);
        this.queue = queueData.queue || [];
        this.failedQueue = queueData.failedQueue || [];
        this.stats = { ...this.stats, ...queueData.stats };

        // Remove expired messages (older than 24 hours)
        const expiredThreshold = Date.now() - (24 * 60 * 60 * 1000);
        this.queue = this.queue.filter(msg => msg.timestamp > expiredThreshold);
        this.failedQueue = this.failedQueue.filter(msg => msg.timestamp > expiredThreshold);

        this.sortQueueByPriority();
      }
    } catch (error) {
      console.error('Failed to load persisted messages:', error);
    }
  }

  /**
   * Get messages by priority
   */
  public getMessagesByPriority(priority: 'low' | 'normal' | 'high'): QueuedMessage[] {
    return this.queue.filter(msg => msg.priority === priority);
  }

  /**
   * Get messages by event type
   */
  public getMessagesByEvent(event: string): QueuedMessage[] {
    return this.queue.filter(msg => msg.event === event);
  }

  /**
   * Subscribe to queue events
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from queue events
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(event, callback);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopPeriodicProcessing();
    this.eventEmitter.removeAllListeners();
  }
}