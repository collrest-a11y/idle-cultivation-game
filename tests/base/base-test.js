/**
 * Base test configuration for all Playwright tests
 * Extends the default test with game-specific helpers
 */

import { test as base } from '@playwright/test';
import { GameHelpers } from '../helpers/game-helpers.js';

export const test = base.extend({
  // Inject game helpers into every test
  gameHelpers: async ({ page }, use) => {
    const helpers = new GameHelpers(page);
    await use(helpers);
  },

  // Auto-navigate to game on each test
  page: async ({ page, baseURL }, use) => {
    // Set up error collection
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.toString());
    });

    // Navigate to game
    await page.goto(baseURL || 'http://localhost:8080');
    
    // Use the page in the test
    await use(page);
    
    // After test, check for errors
    if (errors.length > 0) {
      console.warn('Errors detected during test:', errors);
    }
  },
});

export { expect } from '@playwright/test';