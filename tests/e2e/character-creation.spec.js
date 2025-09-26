/**
 * Character Creation E2E Tests
 * Tests the critical character creation flow that was previously broken
 * Issue #123: Comprehensive Test Suite Development
 */

import { test, expect } from '../base/base-test.js';

test.describe('Character Creation', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    // Clear any existing character data
    await gameHelpers.resetGame();

    // Ensure we're at the character creation screen
    await gameHelpers.waitForGameLoad();
    await expect(page.locator('#character-creation')).toBeVisible();
  });

  test('all origin/vow/mark combinations can create character (27 total)', async ({ page, gameHelpers }) => {
    const origins = ['dust-road', 'ink-pavilion', 'exiled-heir', 'hermit'];
    const vows = ['protect', 'pursue', 'break', 'settle'];
    const marks = ['thunder', 'frost', 'twin', 'hollow'];

    let combinationCount = 0;

    for (const origin of origins) {
      for (const vow of vows) {
        for (const mark of marks) {
          combinationCount++;

          // Reset game state for each test
          await gameHelpers.resetGame();
          await expect(page.locator('#character-creation')).toBeVisible();

          // Select choices in order
          await page.click(`[data-choice="${origin}"]`);
          await page.waitForTimeout(100); // Small delay for UI update

          await page.click(`[data-choice="${vow}"]`);
          await page.waitForTimeout(100);

          await page.click(`[data-choice="${mark}"]`);
          await page.waitForTimeout(500); // Wait for button state update

          // CRITICAL TEST: Verify begin button enables after all selections
          const beginBtn = page.locator('#begin-cultivation');
          await expect(beginBtn).toBeVisible();
          await expect(beginBtn).toBeEnabled({ timeout: 2000 });

          // Create character
          await beginBtn.click();

          // Verify successful transition to game
          await expect(page.locator('#character-creation')).toBeHidden({ timeout: 5000 });
          await expect(page.locator('#game-interface')).toBeVisible({ timeout: 5000 });

          // Verify character data is saved
          const gameState = await gameHelpers.captureGameState();
          expect(gameState.hasCharacter).toBe(true);
          expect(gameState.player).toBeDefined();

          console.log(`✅ Combination ${combinationCount}: ${origin}/${vow}/${mark} - SUCCESS`);
        }
      }
    }

    console.log(`🎉 All ${combinationCount} character combinations tested successfully!`);
  });

  test('begin button remains disabled until all selections made', async ({ page }) => {
    const beginBtn = page.locator('#begin-cultivation');

    // Initially disabled
    await expect(beginBtn).toBeDisabled();

    // Still disabled after first selection
    await page.click('[data-choice="dust-road"]');
    await expect(beginBtn).toBeDisabled();

    // Still disabled after second selection
    await page.click('[data-choice="protect"]');
    await expect(beginBtn).toBeDisabled();

    // Only enabled after all three selections
    await page.click('[data-choice="thunder"]');
    await expect(beginBtn).toBeEnabled({ timeout: 2000 });
  });

  test('selections are visually highlighted when clicked', async ({ page }) => {
    // Test origin selection highlighting
    const dustRoadBtn = page.locator('[data-choice="dust-road"]');
    await dustRoadBtn.click();
    await expect(dustRoadBtn).toHaveClass(/selected|active/);

    // Test vow selection highlighting
    const protectBtn = page.locator('[data-choice="protect"]');
    await protectBtn.click();
    await expect(protectBtn).toHaveClass(/selected|active/);

    // Test mark selection highlighting
    const thunderBtn = page.locator('[data-choice="thunder"]');
    await thunderBtn.click();
    await expect(thunderBtn).toHaveClass(/selected|active/);
  });

  test('can change selections before creating character', async ({ page }) => {
    const beginBtn = page.locator('#begin-cultivation');

    // Make initial selections
    await page.click('[data-choice="dust-road"]');
    await page.click('[data-choice="protect"]');
    await page.click('[data-choice="thunder"]');
    await expect(beginBtn).toBeEnabled();

    // Change origin selection
    await page.click('[data-choice="ink-pavilion"]');
    await expect(beginBtn).toBeEnabled(); // Should still be enabled

    // Change vow selection
    await page.click('[data-choice="pursue"]');
    await expect(beginBtn).toBeEnabled(); // Should still be enabled

    // Change mark selection
    await page.click('[data-choice="frost"]');
    await expect(beginBtn).toBeEnabled(); // Should still be enabled

    // Verify can still create character with new selections
    await beginBtn.click();
    await expect(page.locator('#game-interface')).toBeVisible({ timeout: 5000 });
  });

  test('character creation handles rapid clicking', async ({ page, gameHelpers }) => {
    // Rapidly click selections
    await page.click('[data-choice="hermit"]');
    await page.click('[data-choice="settle"]');
    await page.click('[data-choice="hollow"]');

    // Wait a moment for UI to stabilize
    await page.waitForTimeout(1000);

    const beginBtn = page.locator('#begin-cultivation');
    await expect(beginBtn).toBeEnabled();

    // Rapidly click begin button (should only create one character)
    await Promise.all([
      beginBtn.click(),
      beginBtn.click(),
      beginBtn.click()
    ]);

    // Should successfully transition only once
    await expect(page.locator('#game-interface')).toBeVisible({ timeout: 5000 });

    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });

  test('character creation persists through page reload', async ({ page, gameHelpers }) => {
    // Create character
    await gameHelpers.createCharacter('exiled-heir', 'break', 'twin');

    // Verify game is showing
    await expect(page.locator('#game-interface')).toBeVisible();

    // Reload page
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should load directly to game, not character creation
    await expect(page.locator('#game-interface')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#character-creation')).not.toBeVisible();

    const gameState = await gameHelpers.captureGameState();
    expect(gameState.hasCharacter).toBe(true);
  });

  test('character creation shows proper error handling', async ({ page }) => {
    // Test with no selections - should show proper state
    const beginBtn = page.locator('#begin-cultivation');
    await expect(beginBtn).toBeDisabled();

    // Try to click disabled button (should not cause errors)
    await beginBtn.click({ force: true });

    // Should still be on character creation screen
    await expect(page.locator('#character-creation')).toBeVisible();
    await expect(page.locator('#game-interface')).not.toBeVisible();
  });

  test('all character choice buttons are clickable and responsive', async ({ page }) => {
    const origins = ['dust-road', 'ink-pavilion', 'exiled-heir', 'hermit'];
    const vows = ['protect', 'pursue', 'break', 'settle'];
    const marks = ['thunder', 'frost', 'twin', 'hollow'];

    // Test all origin buttons
    for (const origin of origins) {
      const btn = page.locator(`[data-choice="${origin}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
      await btn.click();
      await expect(btn).toHaveClass(/selected|active/);
    }

    // Test all vow buttons
    for (const vow of vows) {
      const btn = page.locator(`[data-choice="${vow}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
      await btn.click();
      await expect(btn).toHaveClass(/selected|active/);
    }

    // Test all mark buttons
    for (const mark of marks) {
      const btn = page.locator(`[data-choice="${mark}"]`);
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
      await btn.click();
      await expect(btn).toHaveClass(/selected|active/);
    }
  });

  test('character creation modal displays proper content', async ({ page }) => {
    // Check main title
    await expect(page.locator('#character-creation h2')).toHaveText('Memory Fragments');

    // Check prologue text
    await expect(page.locator('.prologue-text')).toContainText('The lantern flickers with your memories');

    // Check section headers
    await expect(page.locator('.fragment-section').first()).toContainText('Origin');
    await expect(page.locator('.fragment-section').nth(1)).toContainText('Vow');
    await expect(page.locator('.fragment-section').nth(2)).toContainText('Mark of Fate');

    // Check begin button exists
    await expect(page.locator('#begin-cultivation')).toBeVisible();
    await expect(page.locator('#begin-cultivation')).toHaveText('Begin Cultivation');
  });
});

test.describe('Character Creation Edge Cases', () => {
  test('handles missing character data gracefully', async ({ page, gameHelpers }) => {
    // Clear all storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should show character creation
    await expect(page.locator('#character-creation')).toBeVisible();
  });

  test('character creation works with slow network', async ({ page, gameHelpers }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    // Should still work
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
    await expect(page.locator('#game-interface')).toBeVisible({ timeout: 10000 });
  });

  test('character creation survives tab focus changes', async ({ page, gameHelpers }) => {
    // Start character creation
    await page.click('[data-choice="dust-road"]');
    await page.click('[data-choice="protect"]');

    // Simulate tab losing focus
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Complete character creation
    await page.click('[data-choice="thunder"]');
    const beginBtn = page.locator('#begin-cultivation');
    await expect(beginBtn).toBeEnabled();
    await beginBtn.click();

    await expect(page.locator('#game-interface')).toBeVisible();
  });
});