/**
 * ErrorDetector - Comprehensive error detection system
 * Captures console errors, page errors, unhandled rejections, network failures,
 * performance issues, and functional bugs
 */
export class ErrorDetector {
  constructor() {
    this.errors = [];
    this.listeners = new Set();
    this.categories = {
      CRITICAL: [],    // Game-breaking
      HIGH: [],        // Feature failures
      MEDIUM: [],      // UX issues
      LOW: []          // Warnings
    };
    this.page = null;
    this.memoryInterval = null;
    this.uiCheckInterval = null;
    this.isDestroyed = false;
    this.errorDeduplicationMap = new Map();
  }

  async initialize(page) {
    this.page = page;
    await this.setupErrorCapture();
    await this.setupNetworkMonitoring();
    await this.setupPerformanceMonitoring();
    await this.setupUIMonitoring();
    console.log('[ErrorDetector] Initialized with multi-layer error capture');
  }

  async setupErrorCapture() {
    if (!this.page) return;

    // Console error monitoring
    this.page.on('console', msg => {
      const msgType = msg.type();
      if (['error', 'warn'].includes(msgType)) {
        this.captureError({
          type: 'console-error',
          severity: msgType === 'error' ? 'HIGH' : 'MEDIUM',
          message: msg.text(),
          location: msg.location(),
          timestamp: Date.now(),
          context: {
            msgType,
            args: msg.args().length
          }
        });
      }
    });

    // Page error monitoring (JavaScript exceptions)
    this.page.on('pageerror', error => {
      this.captureError({
        type: 'page-error',
        severity: 'CRITICAL',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        context: {
          errorName: error.name,
          fileName: error.fileName,
          lineNumber: error.lineNumber,
          columnNumber: error.columnNumber
        }
      });
    });

    // Unhandled promise rejections
    await this.page.evaluateOnNewDocument(() => {
      window.addEventListener('unhandledrejection', event => {
        window.__capturedErrors = window.__capturedErrors || [];
        window.__capturedErrors.push({
          type: 'unhandled-rejection',
          severity: 'HIGH',
          reason: event.reason?.toString() || 'Unknown rejection reason',
          timestamp: Date.now(),
          context: {
            reasonType: typeof event.reason,
            promiseState: 'rejected'
          }
        });
      });

      // Also capture handled but logged errors
      const originalError = console.error;
      console.error = function(...args) {
        window.__capturedErrors = window.__capturedErrors || [];
        window.__capturedErrors.push({
          type: 'console-logged-error',
          severity: 'MEDIUM',
          message: args.join(' '),
          timestamp: Date.now(),
          context: {
            argCount: args.length,
            source: 'console.error'
          }
        });
        originalError.apply(console, args);
      };
    });

    // Periodic collection of client-side captured errors
    this.clientErrorInterval = setInterval(async () => {
      if (this.isDestroyed) return;

      try {
        const clientErrors = await this.page.evaluate(() => {
          const errors = window.__capturedErrors || [];
          window.__capturedErrors = []; // Clear after collection
          return errors;
        });

        clientErrors.forEach(error => this.captureError(error));
      } catch (e) {
        // Page might be navigating or closed
      }
    }, 1000);
  }

  async setupNetworkMonitoring() {
    if (!this.page) return;

    // Request failures
    this.page.on('requestfailed', request => {
      const failure = request.failure();
      this.captureError({
        type: 'network-failure',
        severity: request.url().includes('api') || request.url().includes('.js') ? 'HIGH' : 'MEDIUM',
        url: request.url(),
        method: request.method(),
        failure: failure?.errorText || 'Unknown failure',
        timestamp: Date.now(),
        context: {
          resourceType: request.resourceType(),
          isNavigationRequest: request.isNavigationRequest()
        }
      });
    });

    // HTTP error responses
    this.page.on('response', response => {
      if (response.status() >= 400) {
        const severity = response.status() >= 500 ? 'HIGH' :
                        response.status() === 404 ? 'MEDIUM' : 'MEDIUM';

        this.captureError({
          type: 'http-error',
          severity,
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now(),
          context: {
            headers: response.headers(),
            fromServiceWorker: response.fromServiceWorker()
          }
        });
      }
    });
  }

  async setupPerformanceMonitoring() {
    if (!this.page) return;

    // Memory monitoring
    this.memoryInterval = setInterval(async () => {
      if (this.isDestroyed) return;

      try {
        const metrics = await this.page.evaluate(() => {
          if (performance.memory) {
            return {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });

        if (metrics) {
          const usage = metrics.usedJSHeapSize / metrics.jsHeapSizeLimit;
          if (usage > 0.9) {
            this.captureError({
              type: 'memory-pressure',
              severity: usage > 0.95 ? 'CRITICAL' : 'HIGH',
              metrics,
              usage: `${(usage * 100).toFixed(2)}%`,
              timestamp: Date.now(),
              context: {
                heapGrowth: metrics.usedJSHeapSize - metrics.totalJSHeapSize
              }
            });
          }
        }
      } catch (e) {
        // Page might be closed or navigating
      }
    }, 5000);

    // FPS and performance monitoring
    await this.page.evaluateOnNewDocument(() => {
      let lastTime = performance.now();
      let frames = 0;
      let fps = 60;
      let lagSpikes = 0;

      function measureFPS() {
        frames++;
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTime;

        if (deltaTime >= 1000) {
          fps = Math.round((frames * 1000) / deltaTime);

          window.__capturedErrors = window.__capturedErrors || [];

          if (fps < 30) {
            window.__capturedErrors.push({
              type: 'low-fps',
              severity: fps < 15 ? 'HIGH' : 'MEDIUM',
              fps,
              timestamp: Date.now(),
              context: {
                frameCount: frames,
                measurementDuration: deltaTime
              }
            });
          }

          // Detect lag spikes
          if (deltaTime > 100) {
            lagSpikes++;
            if (lagSpikes > 3) {
              window.__capturedErrors.push({
                type: 'performance-lag',
                severity: 'MEDIUM',
                lagDuration: deltaTime,
                consecutiveSpikes: lagSpikes,
                timestamp: Date.now()
              });
            }
          } else {
            lagSpikes = 0;
          }

          frames = 0;
          lastTime = currentTime;
        }
        requestAnimationFrame(measureFPS);
      }

      // Start FPS monitoring after page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          requestAnimationFrame(measureFPS);
        });
      } else {
        requestAnimationFrame(measureFPS);
      }
    });
  }

  async setupUIMonitoring() {
    if (!this.page) return;

    this.uiCheckInterval = setInterval(async () => {
      if (this.isDestroyed) return;

      try {
        const uiErrors = await this.page.evaluate(() => {
          const errors = [];

          // Check critical game elements
          const criticalElements = [
            '#game-interface',
            '#character-creation',
            '#game-view'
          ];

          for (const selector of criticalElements) {
            const element = document.querySelector(selector);
            if (element) {
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);

              // Check if element should be visible but has zero dimensions
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                if (rect.width === 0 || rect.height === 0) {
                  errors.push({
                    type: 'zero-dimension-element',
                    severity: 'MEDIUM',
                    selector,
                    dimensions: { width: rect.width, height: rect.height },
                    style: {
                      display: style.display,
                      visibility: style.visibility,
                      opacity: style.opacity
                    }
                  });
                }
              }
            } else {
              // Critical element missing entirely
              errors.push({
                type: 'missing-critical-element',
                severity: 'HIGH',
                selector,
                context: {
                  expectedElement: true,
                  actualElement: false
                }
              });
            }
          }

          // Check for functional button states
          const beginButton = document.querySelector('#begin-cultivation');
          if (beginButton) {
            const isDisabled = beginButton.disabled;
            const selectedChoices = document.querySelectorAll('[data-choice].selected').length;

            // If all choices are made but button is still disabled, that's an error
            if (selectedChoices >= 3 && isDisabled) {
              errors.push({
                type: 'functional-button-error',
                severity: 'CRITICAL',
                component: 'character-creation',
                issue: 'Begin button disabled despite all selections made',
                selectedChoices,
                buttonState: isDisabled,
                timestamp: Date.now()
              });
            }
          }

          // Check for overlapping interactive elements
          const interactiveElements = document.querySelectorAll('button, a, input, [data-choice]');
          const overlaps = [];

          for (let i = 0; i < interactiveElements.length; i++) {
            const elem1 = interactiveElements[i];
            const rect1 = elem1.getBoundingClientRect();

            if (rect1.width === 0 || rect1.height === 0) continue;

            for (let j = i + 1; j < interactiveElements.length; j++) {
              const elem2 = interactiveElements[j];
              const rect2 = elem2.getBoundingClientRect();

              if (rect2.width === 0 || rect2.height === 0) continue;

              // Check for overlap
              if (!(rect1.right < rect2.left ||
                    rect2.right < rect1.left ||
                    rect1.bottom < rect2.top ||
                    rect2.bottom < rect1.top)) {
                overlaps.push({
                  type: 'overlapping-elements',
                  severity: 'MEDIUM',
                  elements: [elem1.tagName, elem2.tagName],
                  rects: [rect1, rect2]
                });
              }
            }
          }

          errors.push(...overlaps);
          return errors;
        });

        uiErrors.forEach(error => {
          error.timestamp = Date.now();
          this.captureError(error);
        });
      } catch (e) {
        // Page might be closed or navigating
      }
    }, 2000);
  }

  captureError(error) {
    if (!error || this.isDestroyed) return;

    // Error deduplication
    const errorKey = `${error.type}-${error.message}-${error.severity}`;
    const lastSeen = this.errorDeduplicationMap.get(errorKey);
    const now = Date.now();

    // Don't capture duplicate errors within 5 seconds
    if (lastSeen && (now - lastSeen) < 5000) {
      return;
    }
    this.errorDeduplicationMap.set(errorKey, now);

    // Add comprehensive context
    error.context = {
      ...error.context,
      url: this.page?.url(),
      timestamp: error.timestamp || Date.now(),
      userAgent: 'playwright-test',
      id: this.generateErrorId()
    };

    // Determine severity if not provided
    const severity = error.severity || this.determineSeverity(error);
    error.severity = severity;

    // Categorize error
    this.categories[severity].push(error);
    this.errors.push(error);

    // Notify listeners
    this.notifyListeners(error);

    // Log for debugging
    console.log(`[ErrorDetector][${severity}] ${error.type}: ${error.message || error.type}`);
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  determineSeverity(error) {
    // Game-breaking errors
    if (error.type === 'page-error' ||
        error.type === 'functional-button-error' ||
        error.message?.includes('Cannot read') ||
        error.message?.includes('is not defined') ||
        error.message?.includes('is not a function')) {
      return 'CRITICAL';
    }

    // Feature failures
    if (error.type === 'network-failure' ||
        error.type === 'http-error' ||
        error.type === 'unhandled-rejection' ||
        error.type === 'missing-critical-element' ||
        error.type === 'memory-pressure' ||
        (error.fps && error.fps < 20)) {
      return 'HIGH';
    }

    // UX issues
    if (error.type === 'console-error' ||
        error.type === 'console-logged-error' ||
        error.type === 'overlapping-elements' ||
        error.type === 'zero-dimension-element' ||
        error.type === 'low-fps') {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  notifyListeners(error) {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getErrors(severity = null) {
    if (severity) {
      return this.categories[severity] || [];
    }
    return [...this.errors];
  }

  getSummary() {
    return {
      total: this.errors.length,
      critical: this.categories.CRITICAL.length,
      high: this.categories.HIGH.length,
      medium: this.categories.MEDIUM.length,
      low: this.categories.LOW.length,
      categories: Object.keys(this.categories).map(severity => ({
        severity,
        count: this.categories[severity].length,
        errors: this.categories[severity].slice(-5) // Last 5 errors per category
      })),
      recentErrors: this.errors.slice(-10) // Last 10 errors overall
    };
  }

  clear() {
    this.errors = [];
    Object.keys(this.categories).forEach(key => {
      this.categories[key] = [];
    });
    this.errorDeduplicationMap.clear();
  }

  destroy() {
    this.isDestroyed = true;

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    if (this.uiCheckInterval) {
      clearInterval(this.uiCheckInterval);
      this.uiCheckInterval = null;
    }

    if (this.clientErrorInterval) {
      clearInterval(this.clientErrorInterval);
      this.clientErrorInterval = null;
    }

    this.listeners.clear();
    console.log('[ErrorDetector] Destroyed and cleaned up');
  }

  // Method to capture functional errors from external detectors
  captureFunctionalError(error) {
    this.captureError({
      ...error,
      type: 'functional-error',
      timestamp: Date.now()
    });
  }
}