/**
 * FunctionalErrorDetector - Detects when game features don't work as expected
 * Focuses on functional failures like the character creation bug where UI elements
 * don't respond correctly to user interactions even without console errors
 */
export class FunctionalErrorDetector {
  constructor() {
    this.errors = [];
    this.testResults = new Map();
  }

  /**
   * Main detection method - runs all functional tests
   */
  async detectAllErrors(page) {
    this.errors = [];

    const characterErrors = await this.detectCharacterCreationErrors(page);
    const saveLoadErrors = await this.detectSaveLoadErrors(page);
    const uiErrors = await this.detectUIErrors(page);
    const stateErrors = await this.detectGameStateErrors(page);

    this.errors.push(...characterErrors, ...saveLoadErrors, ...uiErrors, ...stateErrors);
    return this.errors;
  }

  /**
   * Specifically detect the character creation Begin button bug and related issues
   */
  async detectCharacterCreationErrors(page) {
    const errors = [];

    try {
      // First check if character creation screen is visible
      const creationVisible = await page.locator('#character-creation').isVisible();
      if (!creationVisible) {
        // If we're already in game, skip character creation tests
        const gameVisible = await page.locator('#game-interface').isVisible();
        if (gameVisible) {
          return errors; // Already past character creation
        }

        errors.push({
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'character-creation',
          issue: 'Character creation screen not visible when expected',
          expectedState: 'visible',
          actualState: 'hidden',
          timestamp: Date.now()
        });
        return errors;
      }

      // Test 1: Initial state - Begin button should be disabled
      const beginButton = page.locator('#begin-cultivation');
      const beginExists = await beginButton.count() > 0;

      if (!beginExists) {
        errors.push({
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'character-creation',
          issue: 'Begin cultivation button not found',
          expectedState: 'exists',
          actualState: 'missing',
          timestamp: Date.now()
        });
        return errors;
      }

      const initiallyDisabled = await beginButton.isDisabled();
      if (!initiallyDisabled) {
        errors.push({
          type: 'functional-error',
          severity: 'HIGH',
          component: 'character-creation',
          issue: 'Begin button enabled before making all selections',
          expectedState: 'disabled initially',
          actualState: 'enabled initially',
          timestamp: Date.now()
        });
      }

      // Test 2: Make all required selections
      const choices = [
        { selector: '[data-choice="dust-road"]', name: 'Origin Path' },
        { selector: '[data-choice="protect"]', name: 'Motivation' },
        { selector: '[data-choice="thunder"]', name: 'Affinity' }
      ];

      for (const choice of choices) {
        const choiceElement = page.locator(choice.selector);
        const choiceExists = await choiceElement.count() > 0;

        if (!choiceExists) {
          errors.push({
            type: 'functional-error',
            severity: 'CRITICAL',
            component: 'character-creation',
            issue: `Choice element not found: ${choice.name}`,
            selector: choice.selector,
            timestamp: Date.now()
          });
          continue;
        }

        // Click the choice
        await choiceElement.click();
        await page.waitForTimeout(100); // Give time for state update

        // Verify it was selected
        const isSelected = await choiceElement.evaluate(el => el.classList.contains('selected'));
        if (!isSelected) {
          errors.push({
            type: 'functional-error',
            severity: 'HIGH',
            component: 'character-creation',
            issue: `Choice not selected after click: ${choice.name}`,
            selector: choice.selector,
            expectedState: 'selected',
            actualState: 'not selected',
            timestamp: Date.now()
          });
        }
      }

      // Test 3: Critical test - Begin button should now be enabled
      await page.waitForTimeout(500); // Give time for all state updates
      const enabledAfterSelections = await beginButton.isEnabled();

      if (!enabledAfterSelections) {
        errors.push({
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'character-creation',
          issue: 'Begin button not enabled after all selections made',
          expectedState: 'enabled',
          actualState: 'disabled',
          selections: {
            dustRoad: await page.locator('[data-choice="dust-road"]').evaluate(el => el.classList.contains('selected')),
            protect: await page.locator('[data-choice="protect"]').evaluate(el => el.classList.contains('selected')),
            thunder: await page.locator('[data-choice="thunder"]').evaluate(el => el.classList.contains('selected'))
          },
          timestamp: Date.now()
        });
      }

      // Test 4: Test character creation completion (only if button is enabled)
      if (enabledAfterSelections) {
        await beginButton.click();
        await page.waitForTimeout(2000); // Give time for character creation to complete

        const creationHiddenAfter = await page.locator('#character-creation').isHidden();
        const gameVisibleAfter = await page.locator('#game-interface').isVisible();

        if (!creationHiddenAfter) {
          errors.push({
            type: 'functional-error',
            severity: 'HIGH',
            component: 'character-creation',
            issue: 'Character creation screen not hidden after completion',
            expectedState: 'hidden',
            actualState: 'visible',
            timestamp: Date.now()
          });
        }

        if (!gameVisibleAfter) {
          errors.push({
            type: 'functional-error',
            severity: 'CRITICAL',
            component: 'character-creation',
            issue: 'Game interface not shown after character creation',
            expectedState: 'game interface visible',
            actualState: 'game interface hidden',
            timestamp: Date.now()
          });
        }

        // Test 5: Verify game state was properly initialized
        const gameState = await page.evaluate(() => {
          return {
            hasPlayer: window.gameState?.get('player') != null,
            hasResources: window.gameState?.get('resources') != null,
            playerName: window.gameState?.get('player')?.name
          };
        });

        if (!gameState.hasPlayer) {
          errors.push({
            type: 'functional-error',
            severity: 'CRITICAL',
            component: 'character-creation',
            issue: 'Player data not initialized after character creation',
            expectedState: 'player data exists',
            actualState: 'player data missing',
            timestamp: Date.now()
          });
        }

        if (!gameState.hasResources) {
          errors.push({
            type: 'functional-error',
            severity: 'HIGH',
            component: 'character-creation',
            issue: 'Resources not initialized after character creation',
            expectedState: 'resources exist',
            actualState: 'resources missing',
            timestamp: Date.now()
          });
        }
      }

    } catch (error) {
      errors.push({
        type: 'functional-error',
        severity: 'CRITICAL',
        component: 'character-creation',
        issue: 'Exception during character creation testing',
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    }

    return errors;
  }

  /**
   * Detect save/load functionality errors
   */
  async detectSaveLoadErrors(page) {
    const errors = [];

    try {
      // Check if we have game state to save
      const hasGameState = await page.evaluate(() => {
        return window.gameState != null && typeof window.gameState.save === 'function';
      });

      if (!hasGameState) {
        errors.push({
          type: 'functional-error',
          severity: 'HIGH',
          component: 'save-system',
          issue: 'Game state system not available',
          expectedState: 'gameState object with save method exists',
          actualState: 'gameState missing or invalid',
          timestamp: Date.now()
        });
        return errors;
      }

      // Test save functionality
      const saveResult = await page.evaluate(() => {
        try {
          const beforeSave = {
            player: window.gameState.get('player'),
            resources: window.gameState.get('resources')
          };

          window.gameState.save();

          return {
            success: true,
            beforeSave,
            hasLocalStorage: localStorage.getItem('gameState') != null
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stack: error.stack
          };
        }
      });

      if (!saveResult.success) {
        errors.push({
          type: 'functional-error',
          severity: 'HIGH',
          component: 'save-system',
          issue: 'Save operation failed',
          error: saveResult.error,
          stack: saveResult.stack,
          timestamp: Date.now()
        });
      } else if (!saveResult.hasLocalStorage) {
        errors.push({
          type: 'functional-error',
          severity: 'HIGH',
          component: 'save-system',
          issue: 'Save did not persist to localStorage',
          expectedState: 'data in localStorage',
          actualState: 'no data in localStorage',
          timestamp: Date.now()
        });
      }

      // Test load functionality by reloading page
      await page.reload();
      await page.waitForTimeout(2000);

      const loadResult = await page.evaluate(() => {
        return {
          gameStateExists: window.gameState != null,
          hasPlayer: window.gameState?.get('player') != null,
          hasResources: window.gameState?.get('resources') != null,
          hasLocalStorageData: localStorage.getItem('gameState') != null
        };
      });

      if (!loadResult.gameStateExists) {
        errors.push({
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'save-system',
          issue: 'Game state not restored after page reload',
          expectedState: 'gameState object exists',
          actualState: 'gameState missing',
          timestamp: Date.now()
        });
      } else {
        if (!loadResult.hasPlayer) {
          errors.push({
            type: 'functional-error',
            severity: 'HIGH',
            component: 'save-system',
            issue: 'Player data not restored from save',
            expectedState: 'player data loaded',
            actualState: 'player data missing',
            timestamp: Date.now()
          });
        }

        if (!loadResult.hasResources) {
          errors.push({
            type: 'functional-error',
            severity: 'MEDIUM',
            component: 'save-system',
            issue: 'Resources not restored from save',
            expectedState: 'resources loaded',
            actualState: 'resources missing',
            timestamp: Date.now()
          });
        }
      }

    } catch (error) {
      errors.push({
        type: 'functional-error',
        severity: 'HIGH',
        component: 'save-system',
        issue: 'Exception during save/load testing',
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    }

    return errors;
  }

  /**
   * Detect UI functionality errors beyond basic visibility
   */
  async detectUIErrors(page) {
    const errors = [];

    try {
      // Check for critical interactive elements
      const criticalElements = [
        { selector: '#begin-cultivation', name: 'Begin Cultivation Button', context: 'character-creation' },
        { selector: '[data-choice]', name: 'Character Choices', context: 'character-creation', shouldHaveMultiple: true },
        { selector: '#game-interface', name: 'Game Interface', context: 'main-game' },
        { selector: '#cultivation-section', name: 'Cultivation Section', context: 'main-game' }
      ];

      for (const element of criticalElements) {
        const elements = page.locator(element.selector);
        const count = await elements.count();

        if (count === 0) {
          // Element completely missing - but only error if we're in the right context
          const inCorrectContext = await this.isInContext(page, element.context);

          if (inCorrectContext) {
            errors.push({
              type: 'functional-error',
              severity: 'HIGH',
              component: 'ui-elements',
              issue: `Critical UI element missing: ${element.name}`,
              selector: element.selector,
              context: element.context,
              timestamp: Date.now()
            });
          }
        } else if (element.shouldHaveMultiple && count < 2) {
          errors.push({
            type: 'functional-error',
            severity: 'MEDIUM',
            component: 'ui-elements',
            issue: `Expected multiple ${element.name} but found ${count}`,
            selector: element.selector,
            expectedCount: 'multiple (>=2)',
            actualCount: count,
            timestamp: Date.now()
          });
        } else {
          // Element exists, test interactivity
          const firstElement = elements.first();

          const isInteractive = await firstElement.evaluate(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            return {
              hasSize: rect.width > 0 && rect.height > 0,
              isVisible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
              hasPointerEvents: style.pointerEvents !== 'none',
              isClickable: el.tagName === 'BUTTON' || el.onclick != null || el.getAttribute('data-choice') != null
            };
          });

          if (!isInteractive.hasSize) {
            errors.push({
              type: 'functional-error',
              severity: 'MEDIUM',
              component: 'ui-elements',
              issue: `${element.name} has zero dimensions`,
              selector: element.selector,
              timestamp: Date.now()
            });
          }

          if (!isInteractive.isVisible) {
            const inCorrectContext = await this.isInContext(page, element.context);
            if (inCorrectContext) {
              errors.push({
                type: 'functional-error',
                severity: 'MEDIUM',
                component: 'ui-elements',
                issue: `${element.name} not visible when expected`,
                selector: element.selector,
                context: element.context,
                timestamp: Date.now()
              });
            }
          }

          if (!isInteractive.hasPointerEvents) {
            errors.push({
              type: 'functional-error',
              severity: 'LOW',
              component: 'ui-elements',
              issue: `${element.name} has pointer-events: none`,
              selector: element.selector,
              timestamp: Date.now()
            });
          }
        }
      }

    } catch (error) {
      errors.push({
        type: 'functional-error',
        severity: 'MEDIUM',
        component: 'ui-elements',
        issue: 'Exception during UI testing',
        error: error.message,
        timestamp: Date.now()
      });
    }

    return errors;
  }

  /**
   * Detect game state validation errors
   */
  async detectGameStateErrors(page) {
    const errors = [];

    try {
      const stateValidation = await page.evaluate(() => {
        const results = {
          gameStateExists: window.gameState != null,
          hasRequiredMethods: false,
          hasValidStructure: false,
          dataConsistency: []
        };

        if (results.gameStateExists) {
          const requiredMethods = ['get', 'set', 'save', 'load'];
          results.hasRequiredMethods = requiredMethods.every(method =>
            typeof window.gameState[method] === 'function'
          );

          // Check data structure
          const player = window.gameState.get('player');
          const resources = window.gameState.get('resources');

          if (player) {
            if (!player.name || typeof player.name !== 'string') {
              results.dataConsistency.push('Player name invalid or missing');
            }
            if (player.level == null || typeof player.level !== 'number') {
              results.dataConsistency.push('Player level invalid or missing');
            }
            if (!player.path || typeof player.path !== 'string') {
              results.dataConsistency.push('Player cultivation path invalid or missing');
            }
          } else {
            results.dataConsistency.push('Player data missing from game state');
          }

          if (resources) {
            const requiredResources = ['qi', 'spiritStones'];
            for (const resource of requiredResources) {
              if (resources[resource] == null || typeof resources[resource] !== 'number') {
                results.dataConsistency.push(`Resource ${resource} invalid or missing`);
              }
            }
          } else {
            // Only error if we should have resources (i.e., character has been created)
            if (player) {
              results.dataConsistency.push('Resources missing from game state');
            }
          }

          results.hasValidStructure = results.dataConsistency.length === 0;
        }

        return results;
      });

      if (!stateValidation.gameStateExists) {
        errors.push({
          type: 'functional-error',
          severity: 'CRITICAL',
          component: 'game-state',
          issue: 'Game state system not initialized',
          expectedState: 'gameState object exists',
          actualState: 'gameState missing',
          timestamp: Date.now()
        });
      } else {
        if (!stateValidation.hasRequiredMethods) {
          errors.push({
            type: 'functional-error',
            severity: 'HIGH',
            component: 'game-state',
            issue: 'Game state missing required methods',
            expectedMethods: ['get', 'set', 'save', 'load'],
            timestamp: Date.now()
          });
        }

        stateValidation.dataConsistency.forEach(issue => {
          errors.push({
            type: 'functional-error',
            severity: 'MEDIUM',
            component: 'game-state',
            issue: 'Data consistency violation: ' + issue,
            timestamp: Date.now()
          });
        });
      }

    } catch (error) {
      errors.push({
        type: 'functional-error',
        severity: 'HIGH',
        component: 'game-state',
        issue: 'Exception during game state validation',
        error: error.message,
        timestamp: Date.now()
      });
    }

    return errors;
  }

  /**
   * Helper method to determine current context
   */
  async isInContext(page, context) {
    try {
      switch (context) {
        case 'character-creation':
          return await page.locator('#character-creation').isVisible();
        case 'main-game':
          return await page.locator('#game-interface').isVisible();
        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get all detected errors
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
   * Get summary of functional errors
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
   * Clear all detected errors
   */
  clear() {
    this.errors = [];
    this.testResults.clear();
  }
}