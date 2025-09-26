/**
 * UIErrorDetector - Specialized UI element visibility and interaction checking
 * Focuses on detecting when UI elements don't behave as expected for user interactions
 */
export class UIErrorDetector {
  constructor() {
    this.errors = [];
    this.criticalElements = new Map();
    this.setupCriticalElements();
  }

  /**
   * Define critical UI elements and their expected behaviors
   */
  setupCriticalElements() {
    this.criticalElements.set('character-creation', {
      requiredElements: [
        { selector: '#character-creation', name: 'Character Creation Container' },
        { selector: '#begin-cultivation', name: 'Begin Cultivation Button' },
        { selector: '[data-choice="dust-road"]', name: 'Dust Road Choice' },
        { selector: '[data-choice="protect"]', name: 'Protect Choice' },
        { selector: '[data-choice="thunder"]', name: 'Thunder Affinity Choice' }
      ],
      interactiveElements: [
        { selector: '#begin-cultivation', name: 'Begin Button', initialState: 'disabled' },
        { selector: '[data-choice]', name: 'Character Choices', clickable: true }
      ]
    });

    this.criticalElements.set('main-game', {
      requiredElements: [
        { selector: '#game-interface', name: 'Game Interface' },
        { selector: '#cultivation-section', name: 'Cultivation Section' },
        { selector: '#resources-display', name: 'Resources Display' }
      ],
      interactiveElements: [
        { selector: '.cultivation-action', name: 'Cultivation Actions', clickable: true }
      ]
    });
  }

  /**
   * Main UI error detection method
   */
  async detectUIErrors(page) {
    this.errors = [];

    const currentContext = await this.getCurrentContext(page);
    await this.checkElementVisibility(page, currentContext);
    await this.checkInteractivity(page, currentContext);
    await this.checkLayoutIssues(page);
    await this.checkAccessibility(page);
    await this.checkResponsiveness(page);

    return this.errors;
  }

  /**
   * Determine current UI context
   */
  async getCurrentContext(page) {
    try {
      const contexts = {
        'character-creation': await page.locator('#character-creation').isVisible(),
        'main-game': await page.locator('#game-interface').isVisible()
      };

      // Return the active context
      for (const [context, isActive] of Object.entries(contexts)) {
        if (isActive) return context;
      }

      return 'unknown';
    } catch (error) {
      this.addError({
        type: 'ui-error',
        severity: 'MEDIUM',
        component: 'context-detection',
        issue: 'Failed to determine UI context',
        error: error.message
      });
      return 'unknown';
    }
  }

  /**
   * Check element visibility and presence
   */
  async checkElementVisibility(page, context) {
    if (!this.criticalElements.has(context)) return;

    const contextElements = this.criticalElements.get(context);

    for (const element of contextElements.requiredElements) {
      try {
        const locator = page.locator(element.selector);
        const count = await locator.count();

        if (count === 0) {
          this.addError({
            type: 'ui-error',
            severity: 'HIGH',
            component: 'element-presence',
            issue: `Required element not found: ${element.name}`,
            selector: element.selector,
            context,
            expectedCount: '≥1',
            actualCount: 0
          });
          continue;
        }

        // Check visibility of the first element
        const isVisible = await locator.first().isVisible();
        if (!isVisible) {
          // Double-check with detailed visibility analysis
          const visibilityDetails = await locator.first().evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);

            return {
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              hasHiddenParent: this.hasHiddenParent(el)
            };
          });

          this.addError({
            type: 'ui-error',
            severity: 'MEDIUM',
            component: 'element-visibility',
            issue: `Required element not visible: ${element.name}`,
            selector: element.selector,
            context,
            visibilityDetails
          });
        }

        // Check for zero-dimension elements that should have size
        const dimensions = await locator.first().evaluate(el => {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });

        if (dimensions.width === 0 || dimensions.height === 0) {
          this.addError({
            type: 'ui-error',
            severity: 'MEDIUM',
            component: 'element-dimensions',
            issue: `Element has zero dimensions: ${element.name}`,
            selector: element.selector,
            context,
            dimensions
          });
        }

      } catch (error) {
        this.addError({
          type: 'ui-error',
          severity: 'HIGH',
          component: 'element-check',
          issue: `Error checking element: ${element.name}`,
          selector: element.selector,
          error: error.message
        });
      }
    }
  }

  /**
   * Check interactivity of UI elements
   */
  async checkInteractivity(page, context) {
    if (!this.criticalElements.has(context)) return;

    const contextElements = this.criticalElements.get(context);

    for (const element of contextElements.interactiveElements || []) {
      try {
        const locator = page.locator(element.selector);
        const count = await locator.count();

        if (count === 0) continue; // Already handled in visibility check

        const firstElement = locator.first();

        // Check if element is actually interactive
        const interactivityCheck = await firstElement.evaluate((el, elementConfig) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const isButton = el.tagName === 'BUTTON';
          const hasClickHandler = el.onclick != null || el.getAttribute('data-choice') != null;
          const hasTabIndex = el.tabIndex >= 0;

          return {
            isInViewport: rect.top >= 0 && rect.left >= 0 &&
                         rect.bottom <= window.innerHeight &&
                         rect.right <= window.innerWidth,
            pointerEvents: style.pointerEvents,
            cursor: style.cursor,
            isButton,
            hasClickHandler,
            hasTabIndex,
            isDisabled: el.disabled,
            computedDisplay: style.display,
            computedVisibility: style.visibility
          };
        }, element);

        // Check for non-interactive elements that should be interactive
        if (element.clickable && !interactivityCheck.hasClickHandler && !interactivityCheck.isButton) {
          this.addError({
            type: 'ui-error',
            severity: 'HIGH',
            component: 'element-interactivity',
            issue: `Element should be clickable but has no click handler: ${element.name}`,
            selector: element.selector,
            context,
            interactivityCheck
          });
        }

        // Check for disabled pointer events
        if (interactivityCheck.pointerEvents === 'none' && element.clickable) {
          this.addError({
            type: 'ui-error',
            severity: 'MEDIUM',
            component: 'element-interactivity',
            issue: `Interactive element has pointer-events: none: ${element.name}`,
            selector: element.selector,
            context
          });
        }

        // Check element state expectations
        if (element.initialState === 'disabled') {
          const allChoicesSelected = await page.evaluate(() => {
            return document.querySelectorAll('[data-choice].selected').length >= 3;
          });

          const isDisabled = interactivityCheck.isDisabled;

          // If all choices are selected but button is still disabled, that's the bug we're looking for
          if (allChoicesSelected && isDisabled) {
            this.addError({
              type: 'ui-error',
              severity: 'CRITICAL',
              component: 'element-state',
              issue: `Begin button should be enabled after all selections: ${element.name}`,
              selector: element.selector,
              context,
              expectedState: 'enabled',
              actualState: 'disabled',
              allChoicesSelected,
              interactivityCheck
            });
          }
        }

        // Test actual clickability
        if (element.clickable && interactivityCheck.isInViewport) {
          try {
            const clickResult = await firstElement.evaluate(el => {
              // Simulate a click test without actually clicking
              const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });

              return {
                canDispatchEvent: true,
                elementAcceptsClick: !el.disabled,
                hasEventListeners: el.onclick != null || el.getAttribute('data-choice') != null
              };
            });

            if (!clickResult.elementAcceptsClick && element.clickable) {
              this.addError({
                type: 'ui-error',
                severity: 'MEDIUM',
                component: 'element-clickability',
                issue: `Element appears clickable but rejects clicks: ${element.name}`,
                selector: element.selector,
                context,
                clickResult
              });
            }

          } catch (clickError) {
            this.addError({
              type: 'ui-error',
              severity: 'LOW',
              component: 'click-test',
              issue: `Cannot test clickability: ${element.name}`,
              selector: element.selector,
              error: clickError.message
            });
          }
        }

      } catch (error) {
        this.addError({
          type: 'ui-error',
          severity: 'MEDIUM',
          component: 'interactivity-check',
          issue: `Error checking interactivity: ${element.name}`,
          selector: element.selector,
          error: error.message
        });
      }
    }
  }

  /**
   * Check for layout issues like overlapping elements
   */
  async checkLayoutIssues(page) {
    try {
      const layoutIssues = await page.evaluate(() => {
        const issues = [];
        const interactiveElements = Array.from(document.querySelectorAll('button, [data-choice], input, a'));

        // Check for overlapping interactive elements
        for (let i = 0; i < interactiveElements.length; i++) {
          for (let j = i + 1; j < interactiveElements.length; j++) {
            const elem1 = interactiveElements[i];
            const elem2 = interactiveElements[j];

            const rect1 = elem1.getBoundingClientRect();
            const rect2 = elem2.getBoundingClientRect();

            // Skip zero-dimension elements
            if (rect1.width === 0 || rect1.height === 0 || rect2.width === 0 || rect2.height === 0) {
              continue;
            }

            // Check for overlap
            const overlapping = !(rect1.right < rect2.left ||
                                rect2.right < rect1.left ||
                                rect1.bottom < rect2.top ||
                                rect2.bottom < rect1.top);

            if (overlapping) {
              issues.push({
                type: 'overlapping-elements',
                element1: {
                  tag: elem1.tagName,
                  id: elem1.id,
                  class: elem1.className,
                  rect: rect1
                },
                element2: {
                  tag: elem2.tagName,
                  id: elem2.id,
                  class: elem2.className,
                  rect: rect2
                }
              });
            }
          }
        }

        // Check for elements outside viewport
        interactiveElements.forEach(elem => {
          const rect = elem.getBoundingClientRect();
          const style = window.getComputedStyle(elem);

          if (style.display !== 'none' && style.visibility !== 'hidden') {
            if (rect.right < 0 || rect.bottom < 0 ||
                rect.left > window.innerWidth || rect.top > window.innerHeight) {
              issues.push({
                type: 'element-outside-viewport',
                element: {
                  tag: elem.tagName,
                  id: elem.id,
                  class: elem.className,
                  rect: rect
                },
                viewport: {
                  width: window.innerWidth,
                  height: window.innerHeight
                }
              });
            }
          }
        });

        return issues;
      });

      layoutIssues.forEach(issue => {
        this.addError({
          type: 'ui-error',
          severity: issue.type === 'overlapping-elements' ? 'MEDIUM' : 'LOW',
          component: 'layout',
          issue: issue.type === 'overlapping-elements' ? 'Interactive elements overlap' : 'Element outside viewport',
          details: issue
        });
      });

    } catch (error) {
      this.addError({
        type: 'ui-error',
        severity: 'LOW',
        component: 'layout-check',
        issue: 'Error during layout analysis',
        error: error.message
      });
    }
  }

  /**
   * Check basic accessibility issues
   */
  async checkAccessibility(page) {
    try {
      const accessibilityIssues = await page.evaluate(() => {
        const issues = [];

        // Check for buttons without text content
        const buttons = document.querySelectorAll('button');
        buttons.forEach((button, index) => {
          const hasText = button.textContent.trim().length > 0;
          const hasAriaLabel = button.getAttribute('aria-label');
          const hasTitle = button.getAttribute('title');

          if (!hasText && !hasAriaLabel && !hasTitle) {
            issues.push({
              type: 'button-no-accessible-name',
              element: {
                tag: button.tagName,
                id: button.id,
                class: button.className,
                index
              }
            });
          }
        });

        // Check for missing form labels
        const inputs = document.querySelectorAll('input');
        inputs.forEach((input, index) => {
          const hasLabel = document.querySelector(`label[for="${input.id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledBy = input.getAttribute('aria-labelledby');

          if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && input.id) {
            issues.push({
              type: 'input-no-label',
              element: {
                tag: input.tagName,
                id: input.id,
                type: input.type,
                index
              }
            });
          }
        });

        return issues;
      });

      accessibilityIssues.forEach(issue => {
        this.addError({
          type: 'ui-error',
          severity: 'LOW',
          component: 'accessibility',
          issue: issue.type === 'button-no-accessible-name' ? 'Button has no accessible name' : 'Input has no label',
          details: issue
        });
      });

    } catch (error) {
      this.addError({
        type: 'ui-error',
        severity: 'LOW',
        component: 'accessibility-check',
        issue: 'Error during accessibility analysis',
        error: error.message
      });
    }
  }

  /**
   * Check responsive design issues
   */
  async checkResponsiveness(page) {
    try {
      // Test at different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      const originalViewport = page.viewportSize();

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500); // Let layout settle

        const responsiveIssues = await page.evaluate((viewportName) => {
          const issues = [];

          // Check for horizontal scroll
          if (document.body.scrollWidth > window.innerWidth) {
            issues.push({
              type: 'horizontal-overflow',
              viewport: viewportName,
              bodyWidth: document.body.scrollWidth,
              viewportWidth: window.innerWidth
            });
          }

          // Check for elements cut off
          const interactiveElements = document.querySelectorAll('button, [data-choice]');
          interactiveElements.forEach(elem => {
            const rect = elem.getBoundingClientRect();
            if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
              issues.push({
                type: 'element-cutoff',
                viewport: viewportName,
                element: {
                  tag: elem.tagName,
                  id: elem.id,
                  class: elem.className
                },
                rect: rect
              });
            }
          });

          return issues;
        }, viewport.name);

        responsiveIssues.forEach(issue => {
          this.addError({
            type: 'ui-error',
            severity: 'MEDIUM',
            component: 'responsive-design',
            issue: issue.type === 'horizontal-overflow' ? 'Page has horizontal scroll' : 'Element cut off at viewport size',
            details: issue
          });
        });
      }

      // Restore original viewport
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }

    } catch (error) {
      this.addError({
        type: 'ui-error',
        severity: 'LOW',
        component: 'responsive-check',
        issue: 'Error during responsive design analysis',
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
   * Get all UI errors
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
   * Get summary of UI errors
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
   * Clear all errors
   */
  clear() {
    this.errors = [];
  }
}