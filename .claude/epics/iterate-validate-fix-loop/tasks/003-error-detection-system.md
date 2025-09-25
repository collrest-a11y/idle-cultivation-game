---
name: Error Detection System Implementation
status: open
created: 2025-09-25T19:37:00Z
updated: 2025-09-25T20:15:00Z
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/124
priority: P0
effort: 2d
dependencies: [001]
---

# Task 003: Error Detection System Implementation

## Objective
Build a comprehensive error detection system that captures ALL types of errors - not just console errors, but also UI failures, network issues, performance problems, and functional bugs.

## Background
Current validation only checks console errors, missing critical functional failures like the character creation bug. We need multi-layered error detection.

## Acceptance Criteria

### Required
- [ ] Console error capture (errors, warnings, logs)
- [ ] Network request failure detection
- [ ] JavaScript exception handling
- [ ] UI element visibility/interaction failures
- [ ] Performance degradation detection
- [ ] Memory leak identification
- [ ] Accessibility violation detection
- [ ] Cross-browser inconsistency detection
- [ ] Error categorization and prioritization
- [ ] Error context capture (stack traces, DOM state)
- [ ] Real-time error streaming
- [ ] Error persistence and retrieval

### Nice to Have
- [ ] Error pattern recognition
- [ ] Automated error classification
- [ ] Error impact analysis
- [ ] Error reproduction steps generation

## Technical Implementation

### 1. Core Error Detector
```javascript
// validation/error-detector.js
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
  }

  async initialize(page) {
    this.page = page;
    await this.setupErrorCapture();
    await this.setupNetworkMonitoring();
    await this.setupPerformanceMonitoring();
    await this.setupUIMonitoring();
  }

  async setupErrorCapture() {
    // Console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.captureError({
          type: 'console-error',
          severity: 'HIGH',
          message: msg.text(),
          location: msg.location(),
          timestamp: Date.now()
        });
      }
    });

    // Page errors
    this.page.on('pageerror', error => {
      this.captureError({
        type: 'page-error',
        severity: 'CRITICAL',
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // Unhandled rejections
    await this.page.evaluateOnNewDocument(() => {
      window.addEventListener('unhandledrejection', event => {
        window.__capturedErrors = window.__capturedErrors || [];
        window.__capturedErrors.push({
          type: 'unhandled-rejection',
          reason: event.reason,
          promise: event.promise,
          timestamp: Date.now()
        });
      });
    });
  }

  async setupNetworkMonitoring() {
    this.page.on('requestfailed', request => {
      this.captureError({
        type: 'network-failure',
        severity: request.url().includes('api') ? 'HIGH' : 'MEDIUM',
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: Date.now()
      });
    });

    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.captureError({
          type: 'http-error',
          severity: response.status() >= 500 ? 'HIGH' : 'MEDIUM',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now()
        });
      }
    });
  }

  async setupPerformanceMonitoring() {
    // Memory monitoring
    this.memoryInterval = setInterval(async () => {
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
            severity: 'HIGH',
            metrics,
            usage: `${(usage * 100).toFixed(2)}%`,
            timestamp: Date.now()
          });
        }
      }
    }, 5000);

    // FPS monitoring
    await this.page.evaluateOnNewDocument(() => {
      let lastTime = performance.now();
      let frames = 0;
      let fps = 60;

      function measureFPS() {
        frames++;
        const currentTime = performance.now();
        if (currentTime >= lastTime + 1000) {
          fps = Math.round((frames * 1000) / (currentTime - lastTime));
          if (fps < 30) {
            window.__capturedErrors = window.__capturedErrors || [];
            window.__capturedErrors.push({
              type: 'low-fps',
              fps,
              timestamp: Date.now()
            });
          }
          frames = 0;
          lastTime = currentTime;
        }
        requestAnimationFrame(measureFPS);
      }
      requestAnimationFrame(measureFPS);
    });
  }

  async setupUIMonitoring() {
    // Element visibility checks
    this.uiCheckInterval = setInterval(async () => {
      const uiErrors = await this.page.evaluate(() => {
        const errors = [];
        
        // Check critical elements
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
            
            // Check if element is actually visible
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              if (rect.width === 0 || rect.height === 0) {
                errors.push({
                  type: 'zero-dimension-element',
                  selector,
                  dimensions: { width: rect.width, height: rect.height }
                });
              }
            }
          }
        }

        // Check for overlapping elements
        const interactiveElements = document.querySelectorAll('button, a, input');
        for (let i = 0; i < interactiveElements.length; i++) {
          const elem1 = interactiveElements[i];
          const rect1 = elem1.getBoundingClientRect();
          
          for (let j = i + 1; j < interactiveElements.length; j++) {
            const elem2 = interactiveElements[j];
            const rect2 = elem2.getBoundingClientRect();
            
            if (this.rectsOverlap(rect1, rect2)) {
              errors.push({
                type: 'overlapping-elements',
                elements: [elem1.outerHTML, elem2.outerHTML]
              });
            }
          }
        }

        return errors;
      });

      uiErrors.forEach(error => {
        this.captureError({
          ...error,
          severity: 'MEDIUM',
          timestamp: Date.now()
        });
      });
    }, 2000);
  }

  captureError(error) {
    // Add context
    error.context = {
      url: this.page.url(),
      viewport: this.page.viewportSize(),
      userAgent: this.page.evaluate(() => navigator.userAgent)
    };

    // Categorize
    const severity = error.severity || this.determineSeverity(error);
    this.categories[severity].push(error);
    this.errors.push(error);

    // Notify listeners
    this.notifyListeners(error);

    // Log for debugging
    console.log(`[${severity}] ${error.type}: ${error.message || error.type}`);
  }

  determineSeverity(error) {
    // Game-breaking errors
    if (error.type === 'page-error' || 
        error.message?.includes('Cannot read') ||
        error.message?.includes('is not defined')) {
      return 'CRITICAL';
    }
    
    // Feature failures
    if (error.type === 'network-failure' ||
        error.type === 'http-error' ||
        error.fps < 20) {
      return 'HIGH';
    }
    
    // UX issues
    if (error.type === 'console-error' ||
        error.type === 'overlapping-elements') {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  notifyListeners(error) {
    this.listeners.forEach(listener => listener(error));
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getErrors(severity = null) {
    if (severity) {
      return this.categories[severity];
    }
    return this.errors;
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
        errors: this.categories[severity]
      }))
    };
  }

  clear() {
    this.errors = [];
    Object.keys(this.categories).forEach(key => {
      this.categories[key] = [];
    });
  }

  destroy() {
    clearInterval(this.memoryInterval);
    clearInterval(this.uiCheckInterval);
    this.listeners.clear();
  }
}
```

### 2. Functional Error Detection
```javascript
// validation/functional-error-detector.js
export class FunctionalErrorDetector {
  async detectCharacterCreationErrors(page) {
    const errors = [];

    // Test button enablement
    await page.click('[data-choice="dust-road"]');
    await page.click('[data-choice="protect"]');
    await page.click('[data-choice="thunder"]');

    const beginButton = page.locator('#begin-cultivation');
    const isEnabled = await beginButton.isEnabled();
    
    if (!isEnabled) {
      errors.push({
        type: 'functional-error',
        severity: 'CRITICAL',
        component: 'character-creation',
        issue: 'Begin button not enabled after all selections',
        expectedState: 'enabled',
        actualState: 'disabled',
        timestamp: Date.now()
      });
    }

    // Test character creation completion
    if (isEnabled) {
      await beginButton.click();
      await page.waitForTimeout(2000);
      
      const creationHidden = await page.locator('#character-creation').isHidden();
      const gameVisible = await page.locator('#game-interface').isVisible();
      
      if (!creationHidden || !gameVisible) {
        errors.push({
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'character-creation',
          issue: 'Failed to transition to game after character creation',
          characterCreationHidden: creationHidden,
          gameInterfaceVisible: gameVisible,
          timestamp: Date.now()
        });
      }
    }

    return errors;
  }

  async detectSaveLoadErrors(page) {
    const errors = [];
    
    // Save current state
    const beforeSave = await page.evaluate(() => ({
      player: window.gameState?.get('player'),
      resources: window.gameState?.get('resources')
    }));

    // Attempt save
    const saveResult = await page.evaluate(() => {
      try {
        window.gameState?.save();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (!saveResult.success) {
      errors.push({
        type: 'functional-error',
        severity: 'HIGH',
        component: 'save-system',
        issue: 'Save failed',
        error: saveResult.error,
        timestamp: Date.now()
      });
    }

    // Reload and verify
    await page.reload();
    await page.waitForTimeout(2000);

    const afterLoad = await page.evaluate(() => ({
      player: window.gameState?.get('player'),
      resources: window.gameState?.get('resources')
    }));

    if (!afterLoad.player || !afterLoad.resources) {
      errors.push({
        type: 'functional-error',
        severity: 'CRITICAL',
        component: 'save-system',
        issue: 'Game state not restored after reload',
        timestamp: Date.now()
      });
    }

    return errors;
  }
}
```

### 3. Error Aggregator
```javascript
// validation/error-aggregator.js
export class ErrorAggregator {
  constructor() {
    this.detectors = [];
    this.allErrors = [];
  }

  addDetector(detector) {
    this.detectors.push(detector);
  }

  async collectAllErrors() {
    this.allErrors = [];
    
    for (const detector of this.detectors) {
      const errors = await detector.getErrors();
      this.allErrors.push(...errors);
    }

    return this.prioritizeErrors(this.allErrors);
  }

  prioritizeErrors(errors) {
    const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    return errors.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.severity);
      const bPriority = priorityOrder.indexOf(b.severity);
      return aPriority - bPriority;
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.allErrors.length,
        bySeverity: {}
      },
      errors: this.allErrors,
      recommendations: this.generateRecommendations()
    };

    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      report.summary.bySeverity[severity] = 
        this.allErrors.filter(e => e.severity === severity).length;
    });

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const criticalCount = this.allErrors.filter(e => e.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      recommendations.push({
        priority: 'URGENT',
        action: 'Fix all CRITICAL errors before deployment',
        count: criticalCount
      });
    }

    const functionalErrors = this.allErrors.filter(e => e.type === 'functional-error');
    if (functionalErrors.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Address functional failures in core features',
        components: [...new Set(functionalErrors.map(e => e.component))]
      });
    }

    return recommendations;
  }
}
```

## Integration Example
```javascript
// validation/run-detection.js
import { ErrorDetector } from './error-detector';
import { FunctionalErrorDetector } from './functional-error-detector';
import { ErrorAggregator } from './error-aggregator';

export async function runErrorDetection(page) {
  const errorDetector = new ErrorDetector();
  const functionalDetector = new FunctionalErrorDetector();
  const aggregator = new ErrorAggregator();

  // Initialize detectors
  await errorDetector.initialize(page);
  aggregator.addDetector(errorDetector);
  aggregator.addDetector(functionalDetector);

  // Run tests
  const characterErrors = await functionalDetector.detectCharacterCreationErrors(page);
  const saveErrors = await functionalDetector.detectSaveLoadErrors(page);

  // Collect all errors
  const allErrors = await aggregator.collectAllErrors();
  const report = aggregator.generateReport();

  // Clean up
  errorDetector.destroy();

  return report;
}
```

## Success Metrics
- Detects 100% of critical bugs (including character creation)
- < 1% false positive rate
- Error categorization accuracy > 95%
- Real-time error detection latency < 100ms
- Complete error context captured for debugging

## Notes
- Focus on functional errors, not just technical errors
- Ensure error detection doesn't impact performance
- Consider error deduplication for repeated errors
- Store error history for trend analysis