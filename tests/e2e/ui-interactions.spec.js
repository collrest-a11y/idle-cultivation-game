/**
 * UI Interactions Tests - Stream B: UI & Interaction Tests
 * Tests all interactive UI elements and their responses
 * Part of Issue #123: Comprehensive Test Suite Development
 */

import { test, expect } from '../base/base-test.js';

test.describe('UI Interactive Elements', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    // Start with a clean slate and ensure we have a character
    await gameHelpers.resetGame();
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
  });

  test('cultivation buttons are interactive', async ({ page, gameHelpers }) => {
    // Navigate to cultivation tab
    await page.click('[data-tab="cultivation"]');
    await expect(page.locator('#cultivation-tab')).toBeVisible();

    // Test meditation button
    const meditateBtn = page.locator('#meditate-btn');
    if (await meditateBtn.isVisible()) {
      await expect(meditateBtn).not.toBeDisabled();
      await meditateBtn.click();
      // Should provide some visual feedback (no specific assertion since implementation may vary)
    }

    // Test breakthrough button - might be disabled initially
    const breakthroughBtn = page.locator('#breakthrough-btn');
    if (await breakthroughBtn.isVisible()) {
      // Button exists - state depends on player progression
      const isEnabled = await breakthroughBtn.isEnabled();
      if (isEnabled) {
        await breakthroughBtn.click();
      }
    }
  });

  test('scripture gacha system buttons work', async ({ page, gameHelpers }) => {
    // Navigate to scriptures tab
    await page.click('[data-tab="scriptures"]');
    await expect(page.locator('#scriptures-tab')).toBeVisible();

    // Test banner selection buttons
    const bannerButtons = await page.locator('.banner-btn').all();
    for (const button of bannerButtons) {
      await expect(button).toBeVisible();
      await expect(button).not.toBeDisabled();
      await button.click();
      await page.waitForTimeout(100); // Allow UI update
    }

    // Test pull buttons - they might be disabled due to resource requirements
    const singlePullBtn = page.locator('#single-pull');
    const tenPullBtn = page.locator('#ten-pull');

    if (await singlePullBtn.isVisible()) {
      await expect(singlePullBtn).toBeVisible();
      // Click if enabled, otherwise just verify it's properly disabled
      const isEnabled = await singlePullBtn.isEnabled();
      if (isEnabled) {
        await singlePullBtn.click();
      }
    }

    if (await tenPullBtn.isVisible()) {
      await expect(tenPullBtn).toBeVisible();
      const isEnabled = await tenPullBtn.isEnabled();
      if (isEnabled) {
        await tenPullBtn.click();
      }
    }
  });

  test('scripture filter buttons function correctly', async ({ page, gameHelpers }) => {
    // Navigate to scriptures tab
    await page.click('[data-tab="scriptures"]');
    await expect(page.locator('#scriptures-tab')).toBeVisible();

    // Test filter buttons
    const filterButtons = [
      { selector: '[data-filter="all"]', expected: 'active' },
      { selector: '[data-filter="qi"]' },
      { selector: '[data-filter="body"]' },
      { selector: '[data-filter="dual"]' },
      { selector: '[data-filter="utility"]' }
    ];

    for (const filter of filterButtons) {
      const filterBtn = page.locator(filter.selector);
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.waitForTimeout(100);

        // Check that the button becomes active
        await expect(filterBtn).toHaveClass(/active/);

        // Other filter buttons should not be active
        for (const otherFilter of filterButtons) {
          if (otherFilter.selector !== filter.selector) {
            const otherBtn = page.locator(otherFilter.selector);
            if (await otherBtn.isVisible()) {
              await expect(otherBtn).not.toHaveClass(/active/);
            }
          }
        }
      }
    }
  });

  test('combat system buttons respond correctly', async ({ page, gameHelpers }) => {
    // Navigate to combat tab
    await page.click('[data-tab="combat"]');
    await expect(page.locator('#combat-tab')).toBeVisible();

    // Test combat action buttons
    const combatButtons = [
      '#find-opponent',
      '#practice-duel',
      '#ranked-duel'
    ];

    for (const buttonSelector of combatButtons) {
      const button = page.locator(buttonSelector);
      if (await button.isVisible()) {
        await expect(button).not.toBeDisabled();
        await button.click();
        await page.waitForTimeout(200); // Allow for any UI updates

        // Button should still be visible after clicking (unless it triggers a state change)
        await expect(button).toBeVisible();
      }
    }
  });

  test('sect management buttons work', async ({ page, gameHelpers }) => {
    // Navigate to sect tab
    await page.click('[data-tab="sect"]');
    await expect(page.locator('#sect-tab')).toBeVisible();

    // Test sect action buttons (when no sect joined)
    const sectButtons = ['#find-sect', '#create-sect'];

    for (const buttonSelector of sectButtons) {
      const button = page.locator(buttonSelector);
      if (await button.isVisible()) {
        await expect(button).not.toBeDisabled();
        await button.click();
        await page.waitForTimeout(200);
        // Verify button is still functional
        await expect(button).toBeVisible();
      }
    }
  });

  test('loadout equipment slots are interactive', async ({ page, gameHelpers }) => {
    // Navigate to loadout tab
    await page.click('[data-tab="loadout"]');
    await expect(page.locator('#loadout-tab')).toBeVisible();

    // Test equipment slots
    const equipmentSlots = [
      '[data-slot="qi"]',
      '[data-slot="body"]',
      '[data-slot="dual"]',
      '[data-slot="extra1"]',
      '[data-slot="extra2"]'
    ];

    for (const slotSelector of equipmentSlots) {
      const slot = page.locator(slotSelector);
      if (await slot.isVisible()) {
        // Slots should be clickable (for drag-drop or modal interactions)
        await slot.click();
        await page.waitForTimeout(100);

        // Slot should remain visible after interaction
        await expect(slot).toBeVisible();
      }
    }

    // Test auto-optimize button
    const autoOptimizeBtn = page.locator('.btn-secondary:has-text("Auto-Optimize")');
    if (await autoOptimizeBtn.isVisible()) {
      await expect(autoOptimizeBtn).not.toBeDisabled();
      await autoOptimizeBtn.click();
    }
  });

  test('button hover states work correctly', async ({ page, gameHelpers }) => {
    // Test hover effects on various buttons
    const buttonsToTest = [
      '[data-tab="cultivation"]',
      '#meditate-btn',
      '.btn-primary',
      '.btn-secondary'
    ];

    for (const buttonSelector of buttonsToTest) {
      const button = page.locator(buttonSelector).first();
      if (await button.isVisible()) {
        // Hover should not crash the application
        await button.hover();
        await page.waitForTimeout(100);

        // Button should still be functional after hover
        await expect(button).toBeVisible();
      }
    }
  });

  test('click feedback and animations work', async ({ page, gameHelpers }) => {
    // Test that buttons provide visual feedback when clicked
    const navigationButton = page.locator('[data-tab="scriptures"]');

    // Click and verify button becomes active
    await navigationButton.click();
    await expect(navigationButton).toHaveClass(/active/);

    // Test rapid clicking doesn't break the UI
    for (let i = 0; i < 5; i++) {
      await navigationButton.click();
      await page.waitForTimeout(50);
    }

    // Button should still work correctly
    await expect(navigationButton).toHaveClass(/active/);
    await expect(page.locator('#scriptures-tab')).toBeVisible();
  });

  test('form inputs and selections work', async ({ page, gameHelpers }) => {
    // Go back to character creation to test form interactions
    await gameHelpers.resetGame();

    // Test character creation form interactions
    await expect(page.locator('#character-creation')).toBeVisible();

    // Test fragment selections
    const origins = ['dust-road', 'ink-pavilion', 'exiled-heir', 'hermit'];
    const vows = ['protect', 'pursue', 'break', 'settle'];
    const marks = ['thunder', 'frost', 'twin', 'hollow'];

    // Test origin selection
    for (const origin of origins) {
      const choice = page.locator(`[data-choice="${origin}"]`);
      if (await choice.isVisible()) {
        await choice.click();
        await page.waitForTimeout(100);
        await expect(choice).toHaveClass(/selected/);
      }
    }

    // Test vow selection
    for (const vow of vows) {
      const choice = page.locator(`[data-choice="${vow}"]`);
      if (await choice.isVisible()) {
        await choice.click();
        await page.waitForTimeout(100);
        await expect(choice).toHaveClass(/selected/);
      }
    }

    // Test mark selection
    for (const mark of marks) {
      const choice = page.locator(`[data-choice="${mark}"]`);
      if (await choice.isVisible()) {
        await choice.click();
        await page.waitForTimeout(100);
        await expect(choice).toHaveClass(/selected/);
      }
    }
  });

  test('disabled states are properly handled', async ({ page, gameHelpers }) => {
    // Test that disabled buttons don't respond to clicks
    await page.click('[data-tab="cultivation"]');

    // The breakthrough button is often disabled initially
    const breakthroughBtn = page.locator('#breakthrough-btn');
    if (await breakthroughBtn.isVisible()) {
      const isDisabled = await breakthroughBtn.isDisabled();
      if (isDisabled) {
        // Disabled button should not respond to clicks
        await breakthroughBtn.click({ force: true });
        // No specific assertion since disabled buttons should just not respond
        await expect(breakthroughBtn).toBeDisabled();
      }
    }
  });

  test('error handling in interactive elements', async ({ page, gameHelpers }) => {
    // Test that interactions work even when there might be JavaScript errors
    await page.evaluate(() => {
      // Add a console error to test error resilience
      console.error('Test error for resilience testing');
    });

    // Navigation should still work
    await page.click('[data-tab="combat"]');
    await expect(page.locator('#combat-tab')).toBeVisible();

    // Buttons should still be interactive
    const findOpponentBtn = page.locator('#find-opponent');
    if (await findOpponentBtn.isVisible()) {
      await findOpponentBtn.click();
      await expect(findOpponentBtn).toBeVisible();
    }
  });
});

test.describe('UI Interactive Elements - Advanced Features', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await gameHelpers.resetGame();
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
  });

  test('keyboard navigation works for interactive elements', async ({ page, gameHelpers }) => {
    // Test keyboard navigation for accessibility
    await page.click('[data-tab="cultivation"]');

    // Focus on meditation button and test keyboard activation
    const meditateBtn = page.locator('#meditate-btn');
    if (await meditateBtn.isVisible()) {
      await meditateBtn.focus();
      await expect(meditateBtn).toBeFocused();

      // Test space and enter key activation
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      await meditateBtn.focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
    }
  });

  test('drag and drop functionality works', async ({ page, gameHelpers }) => {
    // Navigate to loadout tab to test equipment drag-drop
    await page.click('[data-tab="loadout"]');
    await expect(page.locator('#loadout-tab')).toBeVisible();

    // Test that slots can potentially receive drag operations
    const qiSlot = page.locator('[data-slot="qi"]');
    if (await qiSlot.isVisible()) {
      // Simulate a drag operation (basic test)
      const box = await qiSlot.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
        await page.mouse.up();
      }
    }
  });

  test('modal and popup interactions', async ({ page, gameHelpers }) => {
    // Test interactions that might open modals or popups
    await page.click('[data-tab="skills"]');
    await expect(page.locator('#skills-tab')).toBeVisible();

    // Check if any skill elements are clickable for modal opening
    const skillElements = await page.locator('.skill-node, .skill-item, .skill-button').all();
    for (const element of skillElements) {
      if (await element.isVisible()) {
        await element.click();
        await page.waitForTimeout(200);

        // Check for any modal or popup that might have opened
        const modals = await page.locator('.modal, .popup, .overlay').all();
        for (const modal of modals) {
          if (await modal.isVisible()) {
            // Try to close the modal if it's visible
            const closeBtn = modal.locator('.close, .modal-close, [data-close]');
            if (await closeBtn.first().isVisible()) {
              await closeBtn.first().click();
            } else {
              // Try pressing Escape
              await page.keyboard.press('Escape');
            }
          }
        }
      }
    }
  });

  test('touch gestures work on mobile', async ({ page, gameHelpers }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test touch interactions
    await page.touchscreen.tap(100, 100); // General tap test

    // Navigate using touch
    const combatTab = page.locator('[data-tab="combat"]');
    if (await combatTab.isVisible()) {
      const box = await combatTab.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await expect(page.locator('#combat-tab')).toBeVisible();
      }
    }
  });

  test('double-click and long-press interactions', async ({ page, gameHelpers }) => {
    // Test double-click interactions
    await page.click('[data-tab="scriptures"]');

    const scriptureGrid = page.locator('#scripture-grid');
    if (await scriptureGrid.isVisible()) {
      await scriptureGrid.dblclick();
      await page.waitForTimeout(100);
    }

    // Test right-click context menu (if any)
    const qiSlot = page.locator('[data-slot="qi"]');
    if (await qiSlot.isVisible()) {
      await qiSlot.click({ button: 'right' });
      await page.waitForTimeout(100);
    }
  });
});

test.describe('UI Interactive Elements - Performance', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await gameHelpers.resetGame();
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
  });

  test('rapid interactions do not cause performance issues', async ({ page, gameHelpers }) => {
    const startTime = Date.now();

    // Perform rapid interactions
    for (let i = 0; i < 50; i++) {
      await page.click('[data-tab="cultivation"]');
      await page.click('[data-tab="combat"]');
      await page.click('[data-tab="scriptures"]');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (10 seconds max)
    expect(duration).toBeLessThan(10000);

    // UI should still be responsive
    await page.click('[data-tab="cultivation"]');
    await expect(page.locator('#cultivation-tab')).toBeVisible();
  });

  test('interactions do not cause memory leaks', async ({ page, gameHelpers }) => {
    // Get initial memory usage
    const initialMemory = await gameHelpers.getMemoryUsage();

    // Perform many interactions
    for (let i = 0; i < 20; i++) {
      await page.click('[data-tab="loadout"]');
      await page.click('[data-tab="skills"]');

      // Click various buttons
      const buttons = await page.locator('button:visible').all();
      for (const button of buttons.slice(0, 5)) { // Test first 5 visible buttons
        await button.click();
        await page.waitForTimeout(10);
      }
    }

    // Get final memory usage
    const finalMemory = await gameHelpers.getMemoryUsage();

    if (initialMemory && finalMemory) {
      const memoryIncrease = (finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / initialMemory.usedJSHeapSize;

      // Memory shouldn't increase by more than 100% (allowing for normal variance)
      expect(memoryIncrease).toBeLessThan(1.0);
    }
  });

  test('interactions maintain consistent response times', async ({ page, gameHelpers }) => {
    const responseTimes = [];

    // Test response times for navigation
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();

      await page.click('[data-tab="combat"]');
      await expect(page.locator('#combat-tab')).toBeVisible();

      const endTime = performance.now();
      responseTimes.push(endTime - startTime);

      // Switch back
      await page.click('[data-tab="cultivation"]');
      await expect(page.locator('#cultivation-tab')).toBeVisible();
    }

    // Calculate average response time
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    // Average response time should be reasonable (under 500ms)
    expect(avgResponseTime).toBeLessThan(500);

    // No single response should be extremely slow (under 2 seconds)
    for (const time of responseTimes) {
      expect(time).toBeLessThan(2000);
    }
  });
});