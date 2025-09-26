/**
 * StateValidator - Validates game state integrity and consistency
 * Ensures the game state maintains proper structure and data relationships
 */
export class StateValidator {
  constructor() {
    this.errors = [];
    this.validationRules = new Map();
    this.setupValidationRules();
  }

  /**
   * Setup validation rules for different aspects of game state
   */
  setupValidationRules() {
    // Player validation rules
    this.validationRules.set('player', {
      required: ['name', 'level', 'path', 'motivation', 'affinity'],
      types: {
        name: 'string',
        level: 'number',
        path: 'string',
        motivation: 'string',
        affinity: 'string',
        qi: 'number',
        cultivationProgress: 'number'
      },
      constraints: {
        level: { min: 0, max: 1000 },
        qi: { min: 0 },
        cultivationProgress: { min: 0, max: 100 }
      },
      validValues: {
        path: ['dust-road', 'noble-birth', 'hidden-master'],
        motivation: ['protect', 'power', 'knowledge'],
        affinity: ['thunder', 'earth', 'fire', 'water', 'wind']
      }
    });

    // Resources validation rules
    this.validationRules.set('resources', {
      required: ['qi', 'spiritStones'],
      types: {
        qi: 'number',
        spiritStones: 'number',
        herbs: 'number',
        artifacts: 'number'
      },
      constraints: {
        qi: { min: 0 },
        spiritStones: { min: 0 },
        herbs: { min: 0 },
        artifacts: { min: 0 }
      }
    });

    // Settings validation rules
    this.validationRules.set('settings', {
      required: [],
      types: {
        autoSave: 'boolean',
        soundEnabled: 'boolean',
        musicEnabled: 'boolean',
        notifications: 'boolean'
      }
    });

    // Progress validation rules
    this.validationRules.set('progress', {
      required: [],
      types: {
        totalPlayTime: 'number',
        achievements: 'object',
        milestones: 'object'
      },
      constraints: {
        totalPlayTime: { min: 0 }
      }
    });
  }

  /**
   * Main validation method - validates all aspects of game state
   */
  async validateGameState(page) {
    this.errors = [];

    const gameState = await this.extractGameState(page);

    if (!gameState) {
      this.addError({
        type: 'state-error',
        severity: 'CRITICAL',
        component: 'game-state',
        issue: 'Game state not accessible or not initialized'
      });
      return this.errors;
    }

    await this.validateStateStructure(gameState);
    await this.validateDataTypes(gameState);
    await this.validateDataConstraints(gameState);
    await this.validateDataRelationships(gameState);
    await this.validateStateConsistency(gameState);
    await this.validateSaveLoadIntegrity(page, gameState);

    return this.errors;
  }

  /**
   * Extract game state from the page
   */
  async extractGameState(page) {
    try {
      return await page.evaluate(() => {
        if (!window.gameState || typeof window.gameState.get !== 'function') {
          return null;
        }

        // Extract all major state components
        const state = {
          player: window.gameState.get('player'),
          resources: window.gameState.get('resources'),
          settings: window.gameState.get('settings'),
          progress: window.gameState.get('progress'),
          _meta: {
            hasGameState: true,
            gameStateType: typeof window.gameState,
            availableMethods: Object.getOwnPropertyNames(window.gameState).filter(prop =>
              typeof window.gameState[prop] === 'function'
            )
          }
        };

        return state;
      });
    } catch (error) {
      this.addError({
        type: 'state-error',
        severity: 'CRITICAL',
        component: 'state-extraction',
        issue: 'Failed to extract game state from page',
        error: error.message
      });
      return null;
    }
  }

  /**
   * Validate the overall structure of the game state
   */
  async validateStateStructure(gameState) {
    const expectedComponents = ['player', 'resources'];
    const optionalComponents = ['settings', 'progress'];

    // Check for required components
    for (const component of expectedComponents) {
      if (!gameState[component]) {
        this.addError({
          type: 'state-error',
          severity: 'HIGH',
          component: 'state-structure',
          issue: `Required state component missing: ${component}`,
          expectedComponent: component,
          availableComponents: Object.keys(gameState).filter(key => !key.startsWith('_'))
        });
      }
    }

    // Validate component structure against rules
    for (const [componentName, component] of Object.entries(gameState)) {
      if (componentName.startsWith('_')) continue; // Skip meta data

      if (this.validationRules.has(componentName)) {
        const rules = this.validationRules.get(componentName);

        // Check required fields
        for (const requiredField of rules.required) {
          if (component && (component[requiredField] === undefined || component[requiredField] === null)) {
            this.addError({
              type: 'state-error',
              severity: 'HIGH',
              component: 'state-structure',
              issue: `Required field missing in ${componentName}: ${requiredField}`,
              componentName,
              requiredField,
              availableFields: component ? Object.keys(component) : []
            });
          }
        }
      }
    }
  }

  /**
   * Validate data types throughout the game state
   */
  async validateDataTypes(gameState) {
    for (const [componentName, component] of Object.entries(gameState)) {
      if (componentName.startsWith('_') || !component) continue;

      if (this.validationRules.has(componentName)) {
        const rules = this.validationRules.get(componentName);

        for (const [fieldName, expectedType] of Object.entries(rules.types || {})) {
          if (component[fieldName] !== undefined) {
            const actualType = typeof component[fieldName];

            if (actualType !== expectedType) {
              this.addError({
                type: 'state-error',
                severity: 'MEDIUM',
                component: 'data-types',
                issue: `Type mismatch in ${componentName}.${fieldName}`,
                componentName,
                fieldName,
                expectedType,
                actualType,
                value: component[fieldName]
              });
            }

            // Special validation for objects
            if (expectedType === 'object' && component[fieldName] !== null) {
              if (actualType !== 'object' || Array.isArray(component[fieldName])) {
                this.addError({
                  type: 'state-error',
                  severity: 'MEDIUM',
                  component: 'data-types',
                  issue: `Expected object but got ${actualType} for ${componentName}.${fieldName}`,
                  componentName,
                  fieldName,
                  expectedType: 'object (not array)',
                  actualType,
                  isArray: Array.isArray(component[fieldName])
                });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Validate data constraints (min/max values, ranges, etc.)
   */
  async validateDataConstraints(gameState) {
    for (const [componentName, component] of Object.entries(gameState)) {
      if (componentName.startsWith('_') || !component) continue;

      if (this.validationRules.has(componentName)) {
        const rules = this.validationRules.get(componentName);

        // Validate numeric constraints
        for (const [fieldName, constraints] of Object.entries(rules.constraints || {})) {
          const value = component[fieldName];

          if (value !== undefined && typeof value === 'number') {
            if (constraints.min !== undefined && value < constraints.min) {
              this.addError({
                type: 'state-error',
                severity: 'MEDIUM',
                component: 'data-constraints',
                issue: `Value below minimum for ${componentName}.${fieldName}`,
                componentName,
                fieldName,
                value,
                minAllowed: constraints.min,
                constraint: 'minimum'
              });
            }

            if (constraints.max !== undefined && value > constraints.max) {
              this.addError({
                type: 'state-error',
                severity: 'MEDIUM',
                component: 'data-constraints',
                issue: `Value above maximum for ${componentName}.${fieldName}`,
                componentName,
                fieldName,
                value,
                maxAllowed: constraints.max,
                constraint: 'maximum'
              });
            }
          }
        }

        // Validate valid values (enums)
        for (const [fieldName, validValues] of Object.entries(rules.validValues || {})) {
          const value = component[fieldName];

          if (value !== undefined && !validValues.includes(value)) {
            this.addError({
              type: 'state-error',
              severity: 'HIGH',
              component: 'data-constraints',
              issue: `Invalid value for ${componentName}.${fieldName}`,
              componentName,
              fieldName,
              value,
              validValues,
              constraint: 'enumeration'
            });
          }
        }
      }
    }
  }

  /**
   * Validate relationships between different parts of the state
   */
  async validateDataRelationships(gameState) {
    const { player, resources } = gameState;

    if (player && resources) {
      // Player level should correspond to reasonable resource amounts
      if (player.level && resources.qi) {
        const expectedMaxQi = player.level * 100; // Rough estimation
        if (resources.qi > expectedMaxQi * 10) { // Allow 10x buffer for edge cases
          this.addError({
            type: 'state-error',
            severity: 'LOW',
            component: 'data-relationships',
            issue: 'Player qi seems disproportionately high for level',
            playerLevel: player.level,
            playerQi: resources.qi,
            expectedMaxQi
          });
        }
      }

      // Cultivation progress should match player qi
      if (player.cultivationProgress !== undefined && resources.qi !== undefined) {
        if (player.cultivationProgress > 0 && resources.qi === 0) {
          this.addError({
            type: 'state-error',
            severity: 'MEDIUM',
            component: 'data-relationships',
            issue: 'Player has cultivation progress but no qi',
            cultivationProgress: player.cultivationProgress,
            qi: resources.qi
          });
        }
      }
    }

    // Character creation consistency
    if (player) {
      const requiredCreationFields = ['path', 'motivation', 'affinity'];
      const missingFields = requiredCreationFields.filter(field => !player[field]);

      if (missingFields.length > 0 && missingFields.length < requiredCreationFields.length) {
        this.addError({
          type: 'state-error',
          severity: 'HIGH',
          component: 'data-relationships',
          issue: 'Incomplete character creation data',
          missingFields,
          presentFields: requiredCreationFields.filter(field => player[field])
        });
      }
    }
  }

  /**
   * Validate state consistency (no contradictions)
   */
  async validateStateConsistency(gameState) {
    const { player, resources, settings, progress } = gameState;

    // Check for impossible states
    if (player && player.level === 0 && resources && resources.qi > 1000) {
      this.addError({
        type: 'state-error',
        severity: 'MEDIUM',
        component: 'state-consistency',
        issue: 'Level 0 player with high qi amount (impossible state)',
        playerLevel: player.level,
        qi: resources.qi
      });
    }

    // Check for negative values where they shouldn't be
    ['qi', 'spiritStones', 'herbs', 'artifacts'].forEach(resource => {
      if (resources && resources[resource] < 0) {
        this.addError({
          type: 'state-error',
          severity: 'HIGH',
          component: 'state-consistency',
          issue: `Negative resource value: ${resource}`,
          resource,
          value: resources[resource]
        });
      }
    });

    // Check progress consistency
    if (progress && progress.totalPlayTime) {
      if (progress.totalPlayTime < 0) {
        this.addError({
          type: 'state-error',
          severity: 'MEDIUM',
          component: 'state-consistency',
          issue: 'Negative total play time',
          totalPlayTime: progress.totalPlayTime
        });
      }
    }

    // Check settings consistency
    if (settings) {
      const booleanSettings = ['autoSave', 'soundEnabled', 'musicEnabled', 'notifications'];
      booleanSettings.forEach(setting => {
        if (settings[setting] !== undefined && typeof settings[setting] !== 'boolean') {
          this.addError({
            type: 'state-error',
            severity: 'LOW',
            component: 'state-consistency',
            issue: `Setting should be boolean: ${setting}`,
            setting,
            value: settings[setting],
            type: typeof settings[setting]
          });
        }
      });
    }
  }

  /**
   * Validate save/load integrity
   */
  async validateSaveLoadIntegrity(page, originalState) {
    try {
      // Test save operation
      const saveResult = await page.evaluate(() => {
        try {
          if (!window.gameState || typeof window.gameState.save !== 'function') {
            return { success: false, error: 'No save function available' };
          }

          const beforeSave = JSON.stringify(window.gameState.get('player'));
          window.gameState.save();

          return {
            success: true,
            beforeSave,
            hasLocalStorage: localStorage.getItem('gameState') !== null
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      if (!saveResult.success) {
        this.addError({
          type: 'state-error',
          severity: 'HIGH',
          component: 'save-load-integrity',
          issue: 'Save operation failed',
          error: saveResult.error
        });
        return;
      }

      if (!saveResult.hasLocalStorage) {
        this.addError({
          type: 'state-error',
          severity: 'HIGH',
          component: 'save-load-integrity',
          issue: 'Save did not persist to localStorage'
        });
      }

      // Test load by reloading page
      await page.reload();
      await page.waitForTimeout(2000);

      const loadedState = await this.extractGameState(page);

      if (!loadedState) {
        this.addError({
          type: 'state-error',
          severity: 'CRITICAL',
          component: 'save-load-integrity',
          issue: 'State not restored after page reload'
        });
        return;
      }

      // Compare critical data
      if (originalState.player && loadedState.player) {
        const criticalFields = ['name', 'level', 'path', 'motivation', 'affinity'];

        for (const field of criticalFields) {
          if (originalState.player[field] !== loadedState.player[field]) {
            this.addError({
              type: 'state-error',
              severity: 'HIGH',
              component: 'save-load-integrity',
              issue: `Player field not preserved through save/load: ${field}`,
              field,
              originalValue: originalState.player[field],
              loadedValue: loadedState.player[field]
            });
          }
        }
      }

      if (originalState.resources && loadedState.resources) {
        const resourceFields = ['qi', 'spiritStones'];

        for (const field of resourceFields) {
          if (originalState.resources[field] !== loadedState.resources[field]) {
            this.addError({
              type: 'state-error',
              severity: 'MEDIUM',
              component: 'save-load-integrity',
              issue: `Resource not preserved through save/load: ${field}`,
              field,
              originalValue: originalState.resources[field],
              loadedValue: loadedState.resources[field]
            });
          }
        }
      }

    } catch (error) {
      this.addError({
        type: 'state-error',
        severity: 'HIGH',
        component: 'save-load-integrity',
        issue: 'Exception during save/load integrity test',
        error: error.message
      });
    }
  }

  /**
   * Add an error to the collection
   */
  addError(error) {
    this.errors.push({
      ...error,
      timestamp: Date.now()
    });
  }

  /**
   * Get all state validation errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity) {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Get errors by component
   */
  getErrorsByComponent(component) {
    return this.errors.filter(error => error.component === component);
  }

  /**
   * Get summary of validation errors
   */
  getSummary() {
    const summary = {
      total: this.errors.length,
      bySeverity: {
        CRITICAL: this.getErrorsBySeverity('CRITICAL').length,
        HIGH: this.getErrorsBySeverity('HIGH').length,
        MEDIUM: this.getErrorsBySeverity('MEDIUM').length,
        LOW: this.getErrorsBySeverity('LOW').length
      },
      byComponent: {}
    };

    // Group by component
    this.errors.forEach(error => {
      const component = error.component || 'unknown';
      if (!summary.byComponent[component]) {
        summary.byComponent[component] = 0;
      }
      summary.byComponent[component]++;
    });

    return summary;
  }

  /**
   * Get validation rules for a specific component
   */
  getValidationRules(componentName) {
    return this.validationRules.get(componentName);
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(componentName, rules) {
    const existingRules = this.validationRules.get(componentName) || {};
    this.validationRules.set(componentName, { ...existingRules, ...rules });
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }
}