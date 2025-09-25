/**
 * Save/Load System E2E Tests
 * Tests the critical save/load functionality with various states and corruption scenarios
 * Issue #123: Comprehensive Test Suite Development
 */

import { test, expect } from '../base/base-test.js';

test.describe('Save/Load System', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await gameHelpers.resetGame();
  });

  test('can save and load basic game state', async ({ page, gameHelpers }) => {
    // Create character
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Wait for initial progression
    await page.waitForTimeout(3000);

    // Capture state before save
    const beforeSave = await gameHelpers.captureGameState();
    expect(beforeSave.hasCharacter).toBe(true);
    expect(beforeSave.player).toBeDefined();

    // Save game
    const saveResult = await gameHelpers.saveGame();
    expect(saveResult.success).toBe(true);

    // Reload page
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should load directly to game, not character creation
    await expect(page.locator('#game-interface')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#character-creation')).not.toBeVisible();

    // Verify loaded state matches saved state
    const afterLoad = await gameHelpers.captureGameState();
    expect(afterLoad.hasCharacter).toBe(true);
    expect(afterLoad.player.origin).toBe(beforeSave.player.origin);
    expect(afterLoad.player.vow).toBe(beforeSave.player.vow);
    expect(afterLoad.player.mark).toBe(beforeSave.player.mark);
  });

  test('save/load preserves character progression', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('ink-pavilion', 'pursue', 'frost');

    // Let game progress significantly
    await page.waitForTimeout(10000);

    const beforeSave = await gameHelpers.captureGameState();
    const beforeQi = beforeSave.resources?.qi || 0;

    // Save game
    await gameHelpers.saveGame();

    // Reload and verify progression is preserved
    await page.reload();
    await gameHelpers.waitForGameLoad();

    const afterLoad = await gameHelpers.captureGameState();
    const afterQi = afterLoad.resources?.qi || 0;

    // Should preserve progression within reasonable bounds
    expect(Math.abs(afterQi - beforeQi)).toBeLessThan(beforeQi * 0.1); // Within 10%

    console.log(`Qi preserved: ${beforeQi} → ${afterQi}`);
  });

  test('handles corrupted save data gracefully', async ({ page, gameHelpers }) => {
    // Create character first
    await gameHelpers.createCharacter('exiled-heir', 'break', 'twin');

    // Corrupt save data
    await page.evaluate(() => {
      localStorage.setItem('gameState', 'corrupted_json_data');
      localStorage.setItem('idleCultivation_hasCharacter', 'true'); // Still claim to have character
    });

    // Reload page
    await page.reload();

    // Should gracefully handle corruption and show character creation
    await gameHelpers.waitForGameLoad();
    await expect(page.locator('#character-creation')).toBeVisible({ timeout: 10000 });

    // Should not show error screen
    await expect(page.locator('#error-display')).not.toBeVisible();
  });

  test('handles missing save data gracefully', async ({ page, gameHelpers }) => {
    // Create character and save
    await gameHelpers.createCharacter('hermit', 'settle', 'hollow');
    await gameHelpers.saveGame();

    // Delete save data but keep character flag
    await page.evaluate(() => {
      localStorage.removeItem('gameState');
      // Keep hasCharacter flag to test this specific scenario
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should handle missing data gracefully
    const hasCharCreation = await page.locator('#character-creation').isVisible();
    const hasGameInterface = await page.locator('#game-interface').isVisible();

    // Should show either character creation or game interface, not be stuck
    expect(hasCharCreation || hasGameInterface).toBe(true);
  });

  test('autosave functionality works correctly', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Wait for progression and potential autosave
    await page.waitForTimeout(5000);

    // Check if autosave occurred by checking localStorage
    const hasSaveData = await page.evaluate(() => {
      return localStorage.getItem('gameState') !== null;
    });

    expect(hasSaveData).toBe(true);

    // Reload without explicit save
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should still load game data
    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });

  test('save data versioning and migration', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Inject old version save data format
    await page.evaluate(() => {
      const oldFormatData = {
        version: '1.0.0', // Old version
        player: { name: 'Test', level: 1 },
        // Missing some new fields
      };
      localStorage.setItem('gameState', JSON.stringify(oldFormatData));
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should handle old format gracefully
    const isWorking = await page.locator('#game-interface, #character-creation').isVisible();
    expect(isWorking).toBe(true);
  });

  test('save/load handles different character combinations', async ({ page, gameHelpers }) => {
    const testCombinations = [
      ['dust-road', 'protect', 'thunder'],
      ['ink-pavilion', 'pursue', 'frost'],
      ['exiled-heir', 'break', 'twin'],
      ['hermit', 'settle', 'hollow']
    ];

    for (const [origin, vow, mark] of testCombinations) {
      // Reset and create character
      await gameHelpers.resetGame();
      await gameHelpers.createCharacter(origin, vow, mark);

      // Wait for progression
      await page.waitForTimeout(2000);

      // Save
      await gameHelpers.saveGame();

      // Reload
      await page.reload();
      await gameHelpers.waitForGameLoad();

      // Verify correct character loaded
      const gameState = await gameHelpers.captureGameState();
      expect(gameState.player.origin).toBe(origin);
      expect(gameState.player.vow).toBe(vow);
      expect(gameState.player.mark).toBe(mark);

      console.log(`✅ Save/Load verified for ${origin}/${vow}/${mark}`);
    }
  });

  test('handles save corruption during gameplay', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Simulate save corruption during gameplay
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        if (key === 'gameState' && Math.random() < 0.5) {
          // Sometimes corrupt the save
          originalSetItem.call(this, key, 'corrupted_data');
        } else {
          originalSetItem.call(this, key, value);
        }
      };
    });

    // Let game run and potentially save
    await page.waitForTimeout(5000);

    // Try to reload
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should handle corruption gracefully
    const isWorking = await page.locator('#game-interface, #character-creation').isVisible();
    expect(isWorking).toBe(true);
  });

  test('save data persists across browser sessions', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('ink-pavilion', 'pursue', 'frost');

    // Progress the game
    await page.waitForTimeout(3000);
    const beforeSave = await gameHelpers.captureGameState();

    // Save game
    await gameHelpers.saveGame();

    // Simulate new browser session by clearing session storage but keeping localStorage
    await page.evaluate(() => {
      sessionStorage.clear();
      // Clear any in-memory state
      if (window.gameState) {
        delete window.gameState;
      }
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should load from localStorage
    const afterLoad = await gameHelpers.captureGameState();
    expect(afterLoad.hasCharacter).toBe(true);
    expect(afterLoad.player.origin).toBe(beforeSave.player.origin);
  });

  test('large save data handling', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('exiled-heir', 'break', 'twin');

    // Simulate large amount of game data
    await page.evaluate(() => {
      const largeData = {
        player: { level: 1000, experience: 999999999 },
        resources: { qi: 999999999, body: 999999999 },
        inventory: new Array(1000).fill({ id: 1, quantity: 999 }),
        achievements: new Array(500).fill({ id: 1, unlocked: true }),
        history: new Array(10000).fill('combat log entry')
      };

      if (window.gameState) {
        Object.assign(window.gameState.state, largeData);
        window.gameState.save();
      }
    });

    // Reload with large save data
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should handle large data without crashing
    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });

  test('concurrent save operations', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('hermit', 'settle', 'hollow');

    // Trigger multiple rapid saves
    await page.evaluate(async () => {
      if (window.gameState && typeof window.gameState.save === 'function') {
        const savePromises = [];
        for (let i = 0; i < 10; i++) {
          savePromises.push(window.gameState.save());
        }
        await Promise.all(savePromises.map(p => p.catch(e => console.log('Save failed:', e))));
      }
    });

    // Reload
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should still work correctly
    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });
});

test.describe('Save/Load Edge Cases', () => {
  test('handles quota exceeded errors', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Mock localStorage quota exceeded
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function() {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      };
    });

    // Try to save (should handle gracefully)
    const saveResult = await page.evaluate(() => {
      if (window.gameState && typeof window.gameState.save === 'function') {
        try {
          window.gameState.save();
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }
      return { success: false, error: 'No save function' };
    });

    // Should handle quota error gracefully
    expect(saveResult.success).toBe(false);

    // Game should still be playable
    await expect(page.locator('#game-interface')).toBeVisible();
  });

  test('handles save data with special characters', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Inject save data with special characters
    await page.evaluate(() => {
      const specialData = {
        playerName: '测试用户👤🎮',
        notes: 'Special chars: ñáéíóú αβγδε 日本語 한국어',
        unicode: '\u{1F600}\u{1F601}\u{1F602}'
      };

      if (window.gameState) {
        Object.assign(window.gameState.state, specialData);
        window.gameState.save();
      }
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should handle special characters correctly
    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });

  test('migration from empty/minimal save data', async ({ page, gameHelpers }) => {
    // Start with minimal save data
    await page.evaluate(() => {
      localStorage.setItem('gameState', '{}');
      localStorage.setItem('idleCultivation_hasCharacter', 'false');
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should show character creation for empty data
    await expect(page.locator('#character-creation')).toBeVisible({ timeout: 10000 });
  });

  test('save integrity validation', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');

    // Wait for save
    await page.waitForTimeout(2000);

    // Validate save data structure
    const saveValidation = await page.evaluate(() => {
      const saveData = localStorage.getItem('gameState');
      if (!saveData) return { valid: false, reason: 'No save data' };

      try {
        const parsed = JSON.parse(saveData);

        // Check required fields
        if (!parsed.player) return { valid: false, reason: 'Missing player data' };
        if (!parsed.resources) return { valid: false, reason: 'Missing resources data' };

        return { valid: true, size: saveData.length };
      } catch (e) {
        return { valid: false, reason: 'Invalid JSON: ' + e.message };
      }
    });

    expect(saveValidation.valid).toBe(true);
    expect(saveValidation.size).toBeGreaterThan(0);
  });

  test('recovery from partial save corruption', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('ink-pavilion', 'pursue', 'frost');

    // Create partial corruption (valid JSON but missing fields)
    await page.evaluate(() => {
      const partialData = {
        player: { origin: 'dust-road' }, // Missing other required fields
        // Missing resources entirely
        timestamp: Date.now()
      };
      localStorage.setItem('gameState', JSON.stringify(partialData));
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should either recover with defaults or show character creation
    const isWorking = await page.locator('#game-interface, #character-creation').isVisible();
    expect(isWorking).toBe(true);
  });
});