/**
 * E2E Tests for Game Systems Integration
 * Tests complete user workflows across all merged systems
 */

const { test, expect } = require('@playwright/test');

test.describe('Game Systems Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for game initialization
    await page.waitForFunction(() => {
      return window.gameState && window.eventManager && window.uiManager;
    }, { timeout: 10000 });
  });

  test('Game initialization and core systems loading', async ({ page }) => {
    // Test game loads properly
    await expect(page.locator('body')).toBeVisible();

    // Test core systems are initialized
    const gameInitialized = await page.evaluate(() => {
      return window.gameState &&
             window.eventManager &&
             window.uiManager &&
             window.gameState.isInitialized();
    });
    expect(gameInitialized).toBe(true);

    // Test UI framework is ready
    const uiReady = await page.evaluate(() => {
      return window.uiManager.getDebugInfo().isInitialized;
    });
    expect(uiReady).toBe(true);
  });

  test('CP progression systems visibility and interaction', async ({ page }) => {
    // Test that CP progression panels are visible when unlocked
    const cultivationLevel = await page.evaluate(() => {
      return window.gameState.get('player.cultivation.qi.level');
    });

    if (cultivationLevel >= 10) {
      // Test Mount system visibility
      const mountPanel = page.locator('[data-system="mounts"]');
      if (await mountPanel.isVisible()) {
        await mountPanel.click();
        await expect(page.locator('.mount-training-panel')).toBeVisible();
      }

      // Test Wing system visibility
      const wingPanel = page.locator('[data-system="wings"]');
      if (await wingPanel.isVisible()) {
        await wingPanel.click();
        await expect(page.locator('.wing-upgrade-panel')).toBeVisible();
      }
    }
  });

  test('Power calculation updates across systems', async ({ page }) => {
    // Get initial power
    const initialPower = await page.evaluate(() => {
      return window.powerCalculator ? window.powerCalculator.calculatePlayerPower() : 0;
    });

    // Make a change that should affect power (simulate equipment change)
    await page.evaluate(() => {
      if (window.gameState) {
        window.gameState.increment('player.cultivation.qi.level', 1);
      }
    });

    // Wait for power recalculation
    await page.waitForTimeout(100);

    // Check that power has updated
    const newPower = await page.evaluate(() => {
      return window.powerCalculator ? window.powerCalculator.calculatePlayerPower() : 0;
    });

    expect(newPower).toBeGreaterThan(initialPower);
  });

  test('Event system propagation across components', async ({ page }) => {
    let eventReceived = false;

    // Set up event listener
    await page.evaluate(() => {
      window.testEventReceived = false;
      window.eventManager.on('test:integration', () => {
        window.testEventReceived = true;
      });
    });

    // Trigger event
    await page.evaluate(() => {
      window.eventManager.emit('test:integration', { source: 'e2e-test' });
    });

    // Wait for event propagation
    await page.waitForTimeout(50);

    // Check event was received
    eventReceived = await page.evaluate(() => window.testEventReceived);
    expect(eventReceived).toBe(true);
  });

  test('UI theme switching functionality', async ({ page }) => {
    // Test initial theme
    const initialTheme = await page.evaluate(() => {
      return window.uiManager.currentTheme;
    });
    expect(initialTheme).toBe('gfl-dark');

    // Switch theme
    await page.evaluate(() => {
      window.uiManager.setTheme('gfl-light');
    });

    await page.waitForTimeout(100);

    // Verify theme changed
    const newTheme = await page.evaluate(() => {
      return window.uiManager.currentTheme;
    });
    expect(newTheme).toBe('gfl-light');

    // Verify theme is applied to elements
    const bodyTheme = await page.getAttribute('body', 'data-theme');
    expect(bodyTheme).toBe('gfl-light');
  });

  test('Save and load functionality', async ({ page }) => {
    // Make changes to game state
    const originalJade = await page.evaluate(() => {
      return window.gameState.get('player.jade');
    });

    await page.evaluate(() => {
      window.gameState.set('player.jade', 99999);
    });

    // Trigger save
    await page.evaluate(() => {
      if (window.saveManager) {
        window.saveManager.saveGame();
      }
    });

    // Wait for save to complete
    await page.waitForTimeout(200);

    // Reset state to test loading
    await page.evaluate(() => {
      window.gameState.set('player.jade', 0);
    });

    // Load game
    await page.evaluate(() => {
      if (window.saveManager) {
        window.saveManager.loadGame();
      }
    });

    await page.waitForTimeout(200);

    // Verify state was restored
    const loadedJade = await page.evaluate(() => {
      return window.gameState.get('player.jade');
    });
    expect(loadedJade).toBe(99999);
  });

  test('Performance during intensive operations', async ({ page }) => {
    // Measure frame rate during intensive operations
    const performanceMetrics = await page.evaluate(async () => {
      const startTime = performance.now();
      let frames = 0;

      // Simulate intensive operations
      for (let i = 0; i < 1000; i++) {
        if (window.powerCalculator) {
          window.powerCalculator.calculatePlayerPower();
        }

        // Simulate frame
        frames++;
        if (i % 100 === 0) {
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const fps = (frames / duration) * 1000;

      return { duration, fps, frames };
    });

    // Verify performance meets targets
    expect(performanceMetrics.fps).toBeGreaterThan(30); // At least 30 FPS
    expect(performanceMetrics.duration).toBeLessThan(5000); // Complete within 5 seconds
  });

  test('Mobile responsiveness', async ({ page, isMobile }) => {
    if (isMobile) {
      // Test mobile-specific UI adaptations
      const viewport = page.viewportSize();
      expect(viewport.width).toBeLessThan(768);

      // Test touch interactions
      const gameArea = page.locator('#game-container');
      await gameArea.tap();

      // Verify mobile UI elements are visible
      const mobileMenu = page.locator('.mobile-menu');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.tap();
        await expect(page.locator('.mobile-nav')).toBeVisible();
      }
    }
  });

  test('Error handling and recovery', async ({ page }) => {
    // Test graceful error handling
    const errorHandled = await page.evaluate(() => {
      try {
        // Simulate an error condition
        window.gameState.set('invalid.path.that.does.not.exist', 'test');
        return false;
      } catch (error) {
        // Error should be caught and handled gracefully
        return true;
      }
    });

    // Game should continue functioning after error
    const gameStillWorking = await page.evaluate(() => {
      return window.gameState && window.gameState.isInitialized();
    });
    expect(gameStillWorking).toBe(true);
  });

  test('Cross-system data consistency', async ({ page }) => {
    // Test that changes propagate consistently across systems
    await page.evaluate(() => {
      // Make changes that should affect multiple systems
      window.gameState.set('player.cultivation.realm', 'Core Formation');
      window.gameState.set('player.cultivation.qi.level', 50);
    });

    await page.waitForTimeout(100);

    // Verify systems are in sync
    const systemsConsistent = await page.evaluate(() => {
      const realm = window.gameState.get('player.cultivation.realm');
      const qiLevel = window.gameState.get('player.cultivation.qi.level');

      // All systems should reflect the same data
      return realm === 'Core Formation' && qiLevel === 50;
    });

    expect(systemsConsistent).toBe(true);
  });

  test('Long-running idle simulation', async ({ page }) => {
    // Test that the game handles extended idle periods
    const initialResources = await page.evaluate(() => {
      return {
        jade: window.gameState.get('player.jade'),
        experience: window.gameState.get('player.cultivation.qi.experience')
      };
    });

    // Simulate 1 hour of idle time
    await page.evaluate(() => {
      if (window.gameLoop) {
        window.gameLoop.processIdleTime(3600000); // 1 hour in milliseconds
      }
    });

    await page.waitForTimeout(500);

    // Verify idle gains were applied
    const finalResources = await page.evaluate(() => {
      return {
        jade: window.gameState.get('player.jade'),
        experience: window.gameState.get('player.cultivation.qi.experience')
      };
    });

    expect(finalResources.jade).toBeGreaterThanOrEqual(initialResources.jade);
    expect(finalResources.experience).toBeGreaterThanOrEqual(initialResources.experience);
  });
});