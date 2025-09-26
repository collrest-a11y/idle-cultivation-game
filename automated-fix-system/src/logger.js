import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
fs.ensureDirSync(logsDir);

// Custom format for console output
const consoleFormat = winston.format.printf(({ level, message, label, timestamp }) => {
  const colors = {
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[36m',
    debug: '\x1b[37m',
    reset: '\x1b[0m'
  };

  const color = colors[level] || colors.reset;
  return `${colors.reset}[${timestamp}] ${color}${level.toUpperCase()}${colors.reset} [${label}]: ${message}`;
});

// Create base logger configuration
const createLogger = (label) => {
  const loggers = [];

  // Console transport
  loggers.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.label({ label }),
        consoleFormat
      )
    })
  );

  // File transport for all logs
  if (process.env.LOG_TO_FILE === 'true') {
    loggers.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'),
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.label({ label }),
          winston.format.json()
        )
      })
    );

    // Separate error log
    loggers.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: parseInt(process.env.LOG_MAX_SIZE || '10485760'),
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.label({ label }),
          winston.format.json()
        )
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: loggers,
    exitOnError: false
  });
};

export class Logger {
  constructor(label) {
    this.logger = createLogger(label);
    this.label = label;
  }

  info(message, ...args) {
    this.logger.info(this.formatMessage(message, args));
  }

  warn(message, ...args) {
    this.logger.warn(this.formatMessage(message, args));
  }

  error(message, ...args) {
    this.logger.error(this.formatMessage(message, args));
  }

  debug(message, ...args) {
    this.logger.debug(this.formatMessage(message, args));
  }

  formatMessage(message, args) {
    if (args.length === 0) return message;

    // Handle error objects
    if (args[0] instanceof Error) {
      return `${message} ${args[0].message}\n${args[0].stack}`;
    }

    // Handle objects
    if (typeof args[0] === 'object') {
      try {
        return `${message} ${JSON.stringify(args[0], null, 2)}`;
      } catch (e) {
        return `${message} [Complex Object]`;
      }
    }

    // Handle multiple arguments
    return `${message} ${args.join(' ')}`;
  }

  // Log a metric
  metric(name, value, tags = {}) {
    this.logger.info('METRIC', {
      name,
      value,
      tags,
      timestamp: Date.now()
    });
  }

  // Start a timer
  startTimer() {
    const start = Date.now();
    return {
      end: (message) => {
        const duration = Date.now() - start;
        this.info(`${message} (${duration}ms)`);
        return duration;
      }
    };
  }
}

// Global error handler
process.on('uncaughtException', (error) => {
  const logger = new Logger('SYSTEM');
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('SYSTEM');
  logger.error('Unhandled rejection:', reason);
});