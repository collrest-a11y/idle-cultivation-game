/**
 * Game Initialization E2E Tests
 * Tests that the game properly initializes all systems and components
 * Issue #123: Comprehensive Test Suite Development
 */

import { test, expect } from '../base/base-test.js';

test.describe('Game Initialization', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await gameHelpers.resetGame();
  });

  test('game loads and initializes all core systems', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();

    // Wait for game state initialization
    const gameState = await page.evaluate(() => ({
      initialized: window.gameState?.initialized,
      hasGameState: !!window.gameState,
      hasEventManager: !!window.eventManager,
      hasErrorManager: !!window.errorManager,
      hasTimeManager: !!window.timeManager,
      hasLoadingManager: !!window.LoadingManager,
      gameLoopRunning: window.gameLoop?.isRunning,
      moduleManagerLoaded: !!window.moduleManager,
      cultivationSystemLoaded: !!window.CultivationSystem,
      combatSystemLoaded: !!window.CombatSystem,
      skillSystemLoaded: !!window.SkillSystem
    }));

    expect(gameState.hasGameState).toBe(true);
    expect(gameState.hasEventManager).toBe(true);
    expect(gameState.hasErrorManager).toBe(true);
    expect(gameState.hasTimeManager).toBe(true);
    expect(gameState.hasLoadingManager).toBe(true);
    expect(gameState.moduleManagerLoaded).toBe(true);
    expect(gameState.cultivationSystemLoaded).toBe(true);
    expect(gameState.combatSystemLoaded).toBe(true);
    expect(gameState.skillSystemLoaded).toBe(true);

    console.log('✅ All core systems loaded successfully');
  });

  test('game properly transitions from loading to character creation', async ({ page, gameHelpers }) => {
    // Should start with loading screen
    await expect(page.locator('#loading-screen')).toBeVisible();

    // Should transition to character creation
    await gameHelpers.waitForGameLoad();
    await expect(page.locator('#character-creation')).toBeVisible({ timeout: 10000 });

    // Loading screen should be hidden
    await expect(page.locator('#loading-screen')).toBeHidden({ timeout: 5000 });
  });

  test('game initializes with clean state when no save exists', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();

    const initialState = await gameHelpers.captureGameState();

    expect(initialState.hasCharacter).toBe(false);
    expect(initialState.player).toBeNull();
    expect(initialState.resources).toBeNull();
  });

  test('game initializes UI components correctly', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Check that main UI elements are present
    await expect(page.locator('.game-header')).toBeVisible();
    await expect(page.locator('.game-content')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeVisible();

    // Check resource display
    await expect(page.locator('#jade-count')).toBeVisible();
    await expect(page.locator('#spirit-crystal-count')).toBeVisible();
    await expect(page.locator('#shard-count')).toBeVisible();

    // Check realm info
    await expect(page.locator('#current-realm')).toBeVisible();
    await expect(page.locator('#current-realm')).toContainText('Body Refinement');

    // Check navigation tabs
    const navButtons = page.locator('.nav-btn');
    await expect(navButtons).toHaveCount(6);
  });

  test('game loop starts and runs correctly', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Wait for game loop to start
    await page.waitForTimeout(1000);

    const gameLoopState = await page.evaluate(() => ({
      isRunning: window.gameLoop?.isRunning,
      tickCount: window.gameLoop?.tickCount || 0,
      lastTick: window.gameLoop?.lastTick || 0
    }));

    expect(gameLoopState.isRunning).toBe(true);
    expect(gameLoopState.lastTick).toBeGreaterThan(0);

    // Wait and verify loop is progressing
    await page.waitForTimeout(2000);

    const updatedState = await page.evaluate(() => ({
      tickCount: window.gameLoop?.tickCount || 0,
      lastTick: window.gameLoop?.lastTick || 0
    }));

    expect(updatedState.tickCount).toBeGreaterThan(gameLoopState.tickCount);
    expect(updatedState.lastTick).toBeGreaterThan(gameLoopState.lastTick);
  });

  test('resource display updates in real time', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Capture initial resource values
    const initialQi = await page.textContent('#qi-progress-text');

    // Wait for idle progression
    await page.waitForTimeout(3000);

    // Check if resources have changed
    const updatedQi = await page.textContent('#qi-progress-text');

    // Should show some progression (even if minimal)
    expect(updatedQi).not.toBe(initialQi);
  });

  test('all navigation tabs initialize correctly', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    const tabs = [
      { button: '[data-tab="cultivation"]', content: '#cultivation-tab' },
      { button: '[data-tab="loadout"]', content: '#loadout-tab' },
      { button: '[data-tab="scriptures"]', content: '#scriptures-tab' },
      { button: '[data-tab="skills"]', content: '#skills-tab' },
      { button: '[data-tab="combat"]', content: '#combat-tab' },
      { button: '[data-tab="sect"]', content: '#sect-tab' }
    ];

    for (const tab of tabs) {
      // Click tab
      await page.click(tab.button);
      await page.waitForTimeout(500);

      // Verify content is visible
      await expect(page.locator(tab.content)).toBeVisible();

      // Verify button is active
      await expect(page.locator(tab.button)).toHaveClass(/active/);
    }
  });

  test('game handles initialization errors gracefully', async ({ page }) => {
    // Inject an error during initialization
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        // Simulate module loading failure
        setTimeout(() => {
          throw new Error('Simulated initialization error');
        }, 1000);
      });
    });

    await page.goto('http://localhost:8080');

    // Should either show error screen or fallback gracefully
    await page.waitForTimeout(5000);

    const hasError = await page.locator('#error-display').isVisible();
    const hasCharacterCreation = await page.locator('#character-creation').isVisible();

    // Should show either error display or character creation (not stuck on loading)
    expect(hasError || hasCharacterCreation).toBe(true);
  });

  test('performance monitoring initializes correctly', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();

    const performanceState = await page.evaluate(() => ({
      hasPerformanceMonitor: !!window.enhancedPerformanceMonitor,
      hasDOMOptimizer: !!window.domQueryOptimizer,
      hasRenderOptimizer: !!window.renderOptimizer,
      hasConsoleSupressor: !!window.consoleErrorSuppressor,
      canGetReport: typeof window.getPerformanceReport === 'function'
    }));

    expect(performanceState.hasPerformanceMonitor).toBe(true);
    expect(performanceState.canGetReport).toBe(true);

    // Try to get performance report
    const report = await page.evaluate(() => window.getPerformanceReport());
    expect(report).toBeDefined();
  });

  test('mobile manager initializes and detects viewport', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();

    const mobileState = await page.evaluate(() => ({
      hasMobileManager: !!window.MobileManager,
      isMobile: window.MobileManager?.isMobile(),
      hasTouch: window.MobileManager?.hasTouch()
    }));

    expect(mobileState.hasMobileManager).toBe(true);
    expect(typeof mobileState.isMobile).toBe('boolean');
    expect(typeof mobileState.hasTouch).toBe('boolean');
  });
});

test.describe('Game State Management', () => {
  test('game state initializes with correct structure', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    const gameState = await gameHelpers.captureGameState();

    expect(gameState.player).toBeDefined();
    expect(gameState.player.level).toBeDefined();
    expect(gameState.player.origin).toBe('dust-road');
    expect(gameState.player.vow).toBe('protect');
    expect(gameState.player.mark).toBe('thunder');

    expect(gameState.resources).toBeDefined();
    expect(gameState.resources.qi).toBeDefined();
    expect(gameState.resources.body).toBeDefined();
  });

  test('game state updates over time', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    const initialState = await gameHelpers.captureGameState();

    // Wait for some progression
    await page.waitForTimeout(5000);

    const updatedState = await gameHelpers.captureGameState();

    // Should see some progression
    if (initialState.resources?.qi !== undefined && updatedState.resources?.qi !== undefined) {
      expect(updatedState.resources.qi).toBeGreaterThanOrEqual(initialState.resources.qi);
    }
  });

  test('event system initializes and processes events', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();

    const eventSystemState = await page.evaluate(() => {
      const hasEventManager = !!window.eventManager;
      let canEmitEvent = false;

      if (window.eventManager) {
        try {
          window.eventManager.emit('test-event', { test: true });
          canEmitEvent = true;
        } catch (e) {
          console.error('Event emission failed:', e);
        }
      }

      return {
        hasEventManager,
        canEmitEvent
      };
    });

    expect(eventSystemState.hasEventManager).toBe(true);
    expect(eventSystemState.canEmitEvent).toBe(true);
  });
});

test.describe('System Health Checks', () => {
  test('no critical errors on startup', async ({ page, gameHelpers }) => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.toString());
    });

    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('404') &&
      !error.includes('Test error detection') // From smoke tests
    );

    expect(criticalErrors.length).toBe(0);

    if (criticalErrors.length > 0) {
      console.error('Critical errors found:', criticalErrors);
    }
  });

  test('memory usage stays within reasonable bounds', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    const initialMemory = await gameHelpers.getMemoryUsage();

    // Let game run for a while
    await page.waitForTimeout(10000);

    const finalMemory = await gameHelpers.getMemoryUsage();

    if (initialMemory && finalMemory) {
      const memoryIncrease = (finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / initialMemory.usedJSHeapSize;

      // Memory shouldn't increase by more than 100% in 10 seconds
      expect(memoryIncrease).toBeLessThan(1.0);

      console.log(`Memory usage: ${initialMemory.usage}% → ${finalMemory.usage}%`);
    }
  });

  test('frame rate stays above minimum threshold', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    const fps = await gameHelpers.measureFPS(3000);

    // Should maintain at least 30 FPS in testing environment
    expect(fps).toBeGreaterThan(30);

    console.log(`Average FPS: ${fps}`);
  });

  test('all required DOM elements exist after initialization', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    const requiredElements = [
      '#game-interface',
      '.game-header',
      '.game-content',
      '.bottom-nav',
      '#cultivation-tab',
      '#loadout-tab',
      '#scriptures-tab',
      '#skills-tab',
      '#combat-tab',
      '#sect-tab'
    ];

    for (const selector of requiredElements) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });
});

test.describe('Offline and Recovery', () => {
  test('game initializes correctly after simulated crash', async ({ page, gameHelpers }) => {
    // Create character first
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Save game
    await gameHelpers.saveGame();

    // Simulate crash by forcing reload without proper shutdown
    await page.evaluate(() => {
      window.stop();
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should restore character and continue normally
    await expect(page.locator('#game-interface')).toBeVisible({ timeout: 10000 });

    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });

  test('game recovers from network interruption', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Simulate network failure
    await page.route('**/*', route => {
      route.abort('internetdisconnected');
    });

    // Wait a moment
    await page.waitForTimeout(2000);

    // Restore network
    await page.unroute('**/*');

    // Game should continue functioning
    await expect(page.locator('#game-interface')).toBeVisible();

    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });
});