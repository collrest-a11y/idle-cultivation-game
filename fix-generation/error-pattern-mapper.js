/**
 * Error Pattern Mapping System
 * Part of the Automated Validation & Fix Loop
 *
 * Maps detected errors to appropriate fix strategies based on patterns and context
 */

class ErrorPatternMapper {
  constructor() {
    this.patterns = this.initializePatterns();
    this.strategies = this.initializeStrategies();
    this.mappingHistory = [];
  }

  /**
   * Map an error to the best fix strategy
   */
  mapErrorToStrategy(error, context = {}) {
    console.log(`[PatternMapper] Mapping ${error.type} to fix strategy`);

    // First check for exact component match
    const componentStrategy = this.getComponentStrategy(error);
    if (componentStrategy) {
      return this.enhanceStrategy(componentStrategy, error, context);
    }

    // Then check pattern matching
    const patternStrategy = this.getPatternStrategy(error);
    if (patternStrategy) {
      return this.enhanceStrategy(patternStrategy, error, context);
    }

    // Finally, use severity-based fallback
    return this.getFallbackStrategy(error);
  }

  /**
   * Initialize error patterns
   */
  initializePatterns() {
    return {
      // Critical game-breaking patterns
      characterCreation: {
        pattern: /Begin.*button.*not.*enabled|character.*creation.*failed/i,
        component: 'character-creation',
        strategies: ['state-fix', 'event-handler-fix', 'polling-fix'],
        priority: 'CRITICAL'
      },

      saveSystemFailure: {
        pattern: /save.*failed|localStorage.*error|quota.*exceeded/i,
        component: 'save-system',
        strategies: ['storage-fix', 'compression-fix', 'migration-fix'],
        priority: 'HIGH'
      },

      gameStateCorruption: {
        pattern: /state.*corrupted|invalid.*game.*state|undefined.*state/i,
        component: 'game-state',
        strategies: ['state-recovery', 'state-validation', 'state-reset'],
        priority: 'CRITICAL'
      },

      // JavaScript errors
      undefinedProperty: {
        pattern: /Cannot\s+read\s+prop(?:erty|erties)\s+['"]?(\w+)['"]?\s+of\s+(undefined|null)/,
        strategies: ['null-check', 'optional-chaining', 'default-value'],
        priority: 'HIGH'
      },

      notAFunction: {
        pattern: /(\w+)\s+is\s+not\s+a\s+function/,
        strategies: ['function-stub', 'method-binding', 'type-check'],
        priority: 'HIGH'
      },

      referenceError: {
        pattern: /(\w+)\s+is\s+not\s+defined/,
        strategies: ['variable-declaration', 'import-fix', 'global-definition'],
        priority: 'HIGH'
      },

      // Network and async errors
      networkFailure: {
        pattern: /Failed\s+to\s+fetch|Network\s+request\s+failed|ERR_NETWORK/,
        strategies: ['retry-logic', 'offline-fallback', 'cache-first'],
        priority: 'MEDIUM'
      },

      timeoutError: {
        pattern: /timeout|timed\s+out|deadline\s+exceeded/i,
        strategies: ['increase-timeout', 'async-optimization', 'chunking'],
        priority: 'MEDIUM'
      },

      // Performance issues
      memoryLeak: {
        pattern: /memory\s+leak|heap\s+size|out\s+of\s+memory/i,
        strategies: ['cleanup-listeners', 'clear-cache', 'garbage-collection'],
        priority: 'HIGH'
      },

      performanceDegradation: {
        pattern: /slow|lag|fps.*low|performance/i,
        strategies: ['debounce', 'throttle', 'optimization', 'lazy-loading'],
        priority: 'MEDIUM'
      },

      // UI/UX errors
      elementNotFound: {
        pattern: /element.*not.*found|querySelector.*null|cannot.*find.*element/i,
        strategies: ['element-creation', 'wait-for-element', 'dom-ready-check'],
        priority: 'MEDIUM'
      },

      eventHandlerError: {
        pattern: /event.*handler|listener.*error|addEventListener/i,
        strategies: ['event-delegation', 'handler-wrapper', 'event-validation'],
        priority: 'MEDIUM'
      },

      // Validation errors
      validationFailure: {
        pattern: /validation.*failed|invalid.*input|constraint.*violation/i,
        strategies: ['input-sanitization', 'validation-rules', 'error-boundaries'],
        priority: 'LOW'
      }
    };
  }

  /**
   * Initialize fix strategies
   */
  initializeStrategies() {
    return {
      // State management strategies
      'state-fix': {
        name: 'State Management Fix',
        description: 'Fix state tracking and updates',
        generate: (error, context) => ({
          fixType: 'patch',
          code: this.generateStateFixCode(error, context),
          confidence: 85
        })
      },

      'event-handler-fix': {
        name: 'Event Handler Fix',
        description: 'Fix event handling and propagation',
        generate: (error, context) => ({
          fixType: 'injection',
          code: this.generateEventHandlerCode(error, context),
          confidence: 75
        })
      },

      'polling-fix': {
        name: 'Polling Fix',
        description: 'Add polling mechanism for state checks',
        generate: (error, context) => ({
          fixType: 'patch',
          code: this.generatePollingCode(error, context),
          confidence: 70
        })
      },

      // Error handling strategies
      'null-check': {
        name: 'Null Check Guard',
        description: 'Add null/undefined checks',
        generate: (error, context) => ({
          fixType: 'wrapper',
          code: this.generateNullCheckCode(error, context),
          confidence: 90
        })
      },

      'optional-chaining': {
        name: 'Optional Chaining',
        description: 'Use optional chaining operator',
        generate: (error, context) => ({
          fixType: 'replacement',
          code: this.generateOptionalChainingCode(error, context),
          confidence: 85
        })
      },

      'default-value': {
        name: 'Default Value',
        description: 'Provide default values for undefined',
        generate: (error, context) => ({
          fixType: 'injection',
          code: this.generateDefaultValueCode(error, context),
          confidence: 80
        })
      },

      // Function strategies
      'function-stub': {
        name: 'Function Stub',
        description: 'Create missing function stub',
        generate: (error, context) => ({
          fixType: 'patch',
          code: this.generateFunctionStubCode(error, context),
          confidence: 60
        })
      },

      'method-binding': {
        name: 'Method Binding',
        description: 'Fix method binding issues',
        generate: (error, context) => ({
          fixType: 'replacement',
          code: this.generateMethodBindingCode(error, context),
          confidence: 75
        })
      },

      // Network strategies
      'retry-logic': {
        name: 'Retry Logic',
        description: 'Add retry mechanism for failed requests',
        generate: (error, context) => ({
          fixType: 'wrapper',
          code: this.generateRetryLogicCode(error, context),
          confidence: 85
        })
      },

      'offline-fallback': {
        name: 'Offline Fallback',
        description: 'Provide offline functionality',
        generate: (error, context) => ({
          fixType: 'patch',
          code: this.generateOfflineFallbackCode(error, context),
          confidence: 70
        })
      },

      // Performance strategies
      'cleanup-listeners': {
        name: 'Cleanup Event Listeners',
        description: 'Remove unused event listeners',
        generate: (error, context) => ({
          fixType: 'patch',
          code: this.generateCleanupCode(error, context),
          confidence: 80
        })
      },

      'debounce': {
        name: 'Debounce',
        description: 'Add debouncing to frequent calls',
        generate: (error, context) => ({
          fixType: 'wrapper',
          code: this.generateDebounceCode(error, context),
          confidence: 85
        })
      },

      'throttle': {
        name: 'Throttle',
        description: 'Add throttling to limit execution',
        generate: (error, context) => ({
          fixType: 'wrapper',
          code: this.generateThrottleCode(error, context),
          confidence: 85
        })
      },

      // Storage strategies
      'storage-fix': {
        name: 'Storage Fix',
        description: 'Fix localStorage issues',
        generate: (error, context) => ({
          fixType: 'replacement',
          code: this.generateStorageFixCode(error, context),
          confidence: 75
        })
      },

      'compression-fix': {
        name: 'Data Compression',
        description: 'Compress data before storage',
        generate: (error, context) => ({
          fixType: 'wrapper',
          code: this.generateCompressionCode(error, context),
          confidence: 70
        })
      }
    };
  }

  /**
   * Get strategy based on component
   */
  getComponentStrategy(error) {
    // Special handling for known critical bugs
    if (error.component === 'character-creation' &&
        error.issue?.includes('Begin button not enabled')) {
      return {
        strategies: ['state-fix', 'event-handler-fix', 'polling-fix'],
        priority: 'CRITICAL',
        specificFix: true
      };
    }

    // Component-specific strategies
    const componentStrategies = {
      'save-system': ['storage-fix', 'compression-fix'],
      'game-state': ['state-fix', 'state-validation'],
      'ui': ['element-creation', 'event-handler-fix'],
      'network': ['retry-logic', 'offline-fallback']
    };

    if (componentStrategies[error.component]) {
      return {
        strategies: componentStrategies[error.component],
        priority: error.severity || 'MEDIUM'
      };
    }

    return null;
  }

  /**
   * Get strategy based on pattern matching
   */
  getPatternStrategy(error) {
    const errorText = error.message || error.type || error.issue || '';

    for (const [key, pattern] of Object.entries(this.patterns)) {
      if (pattern.pattern.test(errorText)) {
        return {
          strategies: pattern.strategies,
          priority: pattern.priority,
          patternMatch: key
        };
      }
    }

    return null;
  }

  /**
   * Get fallback strategy based on severity
   */
  getFallbackStrategy(error) {
    const severityStrategies = {
      'CRITICAL': ['wrapper', 'state-recovery'],
      'HIGH': ['null-check', 'wrapper'],
      'MEDIUM': ['default-value', 'retry-logic'],
      'LOW': ['logging', 'monitoring']
    };

    return {
      strategies: severityStrategies[error.severity] || ['wrapper'],
      priority: error.severity || 'LOW',
      fallback: true
    };
  }

  /**
   * Enhance strategy with context
   */
  enhanceStrategy(strategy, error, context) {
    // Add specific fixes for known issues
    if (strategy.specificFix) {
      strategy.recommendedFix = this.getSpecificFix(error);
    }

    // Add confidence scoring
    strategy.confidence = this.calculateStrategyConfidence(strategy, error, context);

    // Add execution order
    strategy.executionOrder = this.prioritizeStrategies(strategy.strategies);

    // Record mapping
    this.recordMapping(error, strategy);

    return strategy;
  }

  /**
   * Get specific fix for known issues
   */
  getSpecificFix(error) {
    if (error.component === 'character-creation') {
      return {
        name: 'Character Creation Button Fix',
        description: 'Comprehensive fix for Begin button not enabling',
        code: this.getCharacterCreationFix()
      };
    }

    return null;
  }

  /**
   * Calculate confidence for strategy selection
   */
  calculateStrategyConfidence(strategy, error, context) {
    let confidence = 50; // Base confidence

    // Exact component match
    if (!strategy.fallback) {
      confidence += 20;
    }

    // Pattern match quality
    if (strategy.patternMatch) {
      confidence += 15;
    }

    // Specific fix available
    if (strategy.specificFix) {
      confidence += 25;
    }

    // Context availability
    if (context && Object.keys(context).length > 0) {
      confidence += 10;
    }

    return Math.min(100, confidence);
  }

  /**
   * Prioritize strategies for execution
   */
  prioritizeStrategies(strategies) {
    const priorityMap = {
      'state-fix': 1,
      'null-check': 2,
      'event-handler-fix': 3,
      'retry-logic': 4,
      'wrapper': 5,
      'default-value': 6,
      'polling-fix': 7
    };

    return strategies.sort((a, b) => {
      const aPriority = priorityMap[a] || 99;
      const bPriority = priorityMap[b] || 99;
      return aPriority - bPriority;
    });
  }

  /**
   * Record mapping for learning
   */
  recordMapping(error, strategy) {
    this.mappingHistory.push({
      error: {
        type: error.type,
        component: error.component,
        severity: error.severity
      },
      strategy: {
        strategies: strategy.strategies,
        confidence: strategy.confidence,
        priority: strategy.priority
      },
      timestamp: Date.now()
    });

    // Limit history
    if (this.mappingHistory.length > 1000) {
      this.mappingHistory.shift();
    }
  }

  /**
   * Generate state fix code
   */
  generateStateFixCode(error, context) {
    return `
// State management fix for ${error.component || 'unknown component'}
(function fixState() {
  // Ensure state object exists
  if (!window.gameState) {
    window.gameState = {};
  }

  // Add state validation
  const validateState = () => {
    const requiredFields = ${JSON.stringify(context.requiredFields || ['player', 'resources'])};
    requiredFields.forEach(field => {
      if (!window.gameState[field]) {
        console.warn(\`Missing state field: \${field}\`);
        window.gameState[field] = {};
      }
    });
  };

  // Run validation
  validateState();

  // Monitor state changes
  const originalSet = window.gameState.set || (() => {});
  window.gameState.set = function(key, value) {
    console.log(\`[StateFix] Setting \${key}\`);
    originalSet.call(this, key, value);
    validateState();
  };
})();`;
  }

  /**
   * Generate event handler code
   */
  generateEventHandlerCode(error, context) {
    return `
// Event handler fix
document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('${context.selector || 'button'}');
  elements.forEach(element => {
    // Remove old handlers
    const clone = element.cloneNode(true);
    element.parentNode.replaceChild(clone, element);

    // Add new handler
    clone.addEventListener('click', function(e) {
      try {
        // Original handler logic
        ${context.handlerCode || '// Handler implementation'}
      } catch (error) {
        console.error('[EventHandler] Error:', error);
      }
    });
  });
});`;
  }

  /**
   * Generate character creation fix
   */
  getCharacterCreationFix() {
    return `
// Comprehensive Character Creation Fix
(function fixCharacterCreation() {
  console.log('[CharacterFix] Applying comprehensive fix');

  // Global state tracking
  window.characterSelections = window.characterSelections || {
    origin: null,
    vow: null,
    mark: null
  };

  // Fix button state management
  function updateBeginButton() {
    const btn = document.getElementById('begin-cultivation');
    if (!btn) return;

    const hasAll = !!(
      window.characterSelections.origin &&
      window.characterSelections.vow &&
      window.characterSelections.mark
    );

    btn.disabled = !hasAll;
    if (hasAll) {
      btn.classList.add('enabled');
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      console.log('[CharacterFix] Button enabled with all selections');
    }
  }

  // Intercept all choice clicks
  document.querySelectorAll('.fragment-choice').forEach(choice => {
    choice.addEventListener('click', function() {
      const container = this.closest('.fragment-choices');
      const category = container?.dataset.category;
      const value = this.dataset.choice;

      if (category && value) {
        window.characterSelections[category] = value;
        console.log(\`[CharacterFix] Selected \${category}: \${value}\`);
        updateBeginButton();
      }
    });
  });

  // Polling fallback
  setInterval(updateBeginButton, 250);

  // Initial check
  updateBeginButton();
})();`;
  }

  /**
   * Generate other fix codes...
   */
  generateNullCheckCode(error, context) {
    const variable = context.variable || 'obj';
    const property = context.property || 'property';

    return `
// Null check guard
if (${variable} && ${variable}.${property}) {
  // Safe to use ${variable}.${property}
  ${context.originalCode || `// Original code using ${variable}.${property}`}
} else {
  console.warn('[NullCheck] ${variable}.${property} is undefined');
  ${context.fallbackCode || '// Fallback behavior'}
}`;
  }

  generatePollingCode(error, context) {
    return `
// Polling mechanism for ${context.target || 'state check'}
(function pollState() {
  const interval = setInterval(() => {
    if (${context.condition || 'true'}) {
      ${context.action || '// Action when condition is met'}
      clearInterval(interval);
    }
  }, ${context.interval || 500});

  // Cleanup after timeout
  setTimeout(() => clearInterval(interval), ${context.timeout || 30000});
})();`;
  }

  generateRetryLogicCode(error, context) {
    return `
// Retry logic for network requests
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && i < maxRetries - 1) {
        throw new Error(\`HTTP \${response.status}\`);
      }
      return response;
    } catch (error) {
      lastError = error;
      console.log(\`[Retry] Attempt \${i + 1} failed, retrying...\`);
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }

  throw lastError;
}`;
  }

  /**
   * Analyze patterns for optimization
   */
  analyzePatterns() {
    const analysis = {
      totalMappings: this.mappingHistory.length,
      byComponent: {},
      byStrategy: {},
      successRate: {}
    };

    this.mappingHistory.forEach(record => {
      // Count by component
      const comp = record.error.component || 'unknown';
      analysis.byComponent[comp] = (analysis.byComponent[comp] || 0) + 1;

      // Count by strategy
      record.strategy.strategies.forEach(strat => {
        analysis.byStrategy[strat] = (analysis.byStrategy[strat] || 0) + 1;
      });
    });

    return analysis;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorPatternMapper;
}