import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { Logger } from './logger.js';

export class ErrorMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.logger = new Logger('ErrorMonitor');

    this.config = {
      wsPort: config.wsPort || process.env.WS_PORT || 3002,
      maxQueueSize: config.maxQueueSize || 100,
      processingDelay: config.processingDelay || 1000,
      deduplicationWindow: config.deduplicationWindow || 5000
    };

    this.errorQueue = [];
    this.processing = false;
    this.recentErrors = new Map();
    this.connections = new Set();
    this.stats = {
      totalErrors: 0,
      processedErrors: 0,
      skippedDuplicates: 0,
      failedFixes: 0
    };

    // User action tracking
    this.actionHistory = [];
    this.maxActionHistory = 50;
  }

  async start() {
    try {
      // Start WebSocket server for game connection
      this.wss = new WebSocketServer({ port: this.config.wsPort });

      this.wss.on('connection', (ws) => {
        this.logger.info('New game connection established');
        this.connections.add(ws);

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message, ws);
          } catch (error) {
            this.logger.error('Failed to parse message:', error);
          }
        });

        ws.on('close', () => {
          this.connections.delete(ws);
          this.logger.info('Game connection closed');
        });

        ws.on('error', (error) => {
          this.logger.error('WebSocket error:', error);
        });

        // Send initialization
        ws.send(JSON.stringify({
          type: 'init',
          message: 'Error monitor connected'
        }));
      });

      this.logger.info(`Error monitor listening on ws://localhost:${this.config.wsPort}`);

      // Start processing loop
      this.startProcessingLoop();

      return true;

    } catch (error) {
      this.logger.error('Failed to start error monitor:', error);
      throw error;
    }
  }

  handleMessage(message, ws) {
    switch (message.type) {
      case 'error':
        this.captureError(message.error, message.context);
        break;

      case 'action':
        this.recordAction(message.action);
        break;

      case 'gameState':
        this.updateGameState(message.state);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  captureError(error, context = {}) {
    try {
      // Add timestamp if not present
      error.timestamp = error.timestamp || Date.now();

      // Add context
      error.context = {
        ...context,
        userActions: this.actionHistory.slice(-10),
        gameState: this.gameState
      };

      // Check for duplicates
      const errorKey = this.getErrorKey(error);
      if (this.recentErrors.has(errorKey)) {
        this.stats.skippedDuplicates++;
        this.logger.debug(`Skipping duplicate error: ${errorKey}`);
        return;
      }

      // Add to recent errors for deduplication
      this.recentErrors.set(errorKey, true);
      setTimeout(() => {
        this.recentErrors.delete(errorKey);
      }, this.config.deduplicationWindow);

      // Add to queue
      if (this.errorQueue.length >= this.config.maxQueueSize) {
        this.logger.warn('Error queue full, removing oldest error');
        this.errorQueue.shift();
      }

      this.errorQueue.push(error);
      this.stats.totalErrors++;

      this.logger.info(`Error captured: ${error.message} (Queue size: ${this.errorQueue.length})`);

      // Emit event
      this.emit('error', error);

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }

    } catch (err) {
      this.logger.error('Failed to capture error:', err);
    }
  }

  recordAction(action) {
    const actionEntry = {
      ...action,
      timestamp: Date.now()
    };

    this.actionHistory.push(actionEntry);

    // Keep history limited
    if (this.actionHistory.length > this.maxActionHistory) {
      this.actionHistory.shift();
    }

    this.logger.debug(`Action recorded: ${action.type}`);
  }

  updateGameState(state) {
    this.gameState = state;
    this.logger.debug('Game state updated');
  }

  async processQueue() {
    if (this.processing || this.errorQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift();

      try {
        this.logger.info(`Processing error: ${error.message}`);

        // Emit for fix service to handle
        this.emit('process', error);

        this.stats.processedErrors++;

        // Add delay between processing
        await this.delay(this.config.processingDelay);

      } catch (err) {
        this.logger.error('Failed to process error:', err);
        this.stats.failedFixes++;
      }
    }

    this.processing = false;
  }

  startProcessingLoop() {
    setInterval(() => {
      if (!this.processing && this.errorQueue.length > 0) {
        this.processQueue();
      }
    }, 5000);
  }

  getErrorKey(error) {
    return `${error.file || 'unknown'}:${error.line || 0}:${error.message}`.substring(0, 200);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  getStats() {
    return {
      ...this.stats,
      queueSize: this.errorQueue.length,
      connections: this.connections.size,
      processing: this.processing,
      recentErrors: this.recentErrors.size
    };
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      this.logger.info('WebSocket server stopped');
    }
  }
}

// Browser injection script
export const browserScript = `
(function() {
  // Connect to error monitor
  const ws = new WebSocket('ws://localhost:${process.env.WS_PORT || 3002}');
  let connected = false;
  const actionQueue = [];

  ws.onopen = () => {
    console.log('🔗 Connected to error monitor');
    connected = true;

    // Send queued actions
    actionQueue.forEach(action => ws.send(JSON.stringify(action)));
    actionQueue.length = 0;
  };

  ws.onerror = (error) => {
    console.error('Error monitor connection failed:', error);
  };

  ws.onclose = () => {
    console.log('Error monitor disconnected');
    connected = false;
  };

  // Capture errors
  window.addEventListener('error', (event) => {
    const error = {
      type: 'error',
      error: {
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      },
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    if (connected) {
      ws.send(JSON.stringify(error));
    } else {
      actionQueue.push(error);
    }
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = {
      type: 'error',
      error: {
        message: 'Unhandled Promise Rejection: ' + event.reason,
        stack: event.reason?.stack,
        timestamp: Date.now()
      }
    };

    if (connected) {
      ws.send(JSON.stringify(error));
    } else {
      actionQueue.push(error);
    }
  });

  // Track user actions
  const trackAction = (type, details) => {
    const action = {
      type: 'action',
      action: {
        type,
        details,
        timestamp: Date.now()
      }
    };

    if (connected) {
      ws.send(JSON.stringify(action));
    } else {
      actionQueue.push(action);
    }
  };

  // Track clicks
  document.addEventListener('click', (event) => {
    trackAction('click', {
      target: event.target.tagName,
      id: event.target.id,
      className: event.target.className,
      text: event.target.textContent?.substring(0, 50)
    });
  });

  // Track form submissions
  document.addEventListener('submit', (event) => {
    trackAction('submit', {
      target: event.target.tagName,
      id: event.target.id
    });
  });

  // Periodic game state updates
  setInterval(() => {
    if (connected && window.game) {
      ws.send(JSON.stringify({
        type: 'gameState',
        state: {
          player: window.game?.gameState?.get('player'),
          level: window.game?.gameState?.get('level'),
          resources: window.game?.gameState?.get('resources')
        }
      }));
    }
  }, 30000); // Every 30 seconds

  console.log('✅ Error monitor script injected');
})();
`;