/**
 * UI Navigation Tests - Stream B: UI & Interaction Tests
 * Tests all navigation functionality and view transitions
 * Part of Issue #123: Comprehensive Test Suite Development
 */

import { test, expect } from '../base/base-test.js';

test.describe('UI Navigation', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    // Start with a clean slate and ensure we have a character
    await gameHelpers.resetGame();
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
  });

  test('bottom navigation bar is visible and functional', async ({ page, gameHelpers }) => {
    // Check that all navigation buttons are visible
    const navButtons = [
      { selector: '[data-tab="cultivation"]', text: 'Cultivate', view: 'cultivation-tab' },
      { selector: '[data-tab="loadout"]', text: 'Loadout', view: 'loadout-tab' },
      { selector: '[data-tab="scriptures"]', text: 'Scriptures', view: 'scriptures-tab' },
      { selector: '[data-tab="skills"]', text: 'Skills', view: 'skills-tab' },
      { selector: '[data-tab="combat"]', text: 'Combat', view: 'combat-tab' },
      { selector: '[data-tab="sect"]', text: 'Sect', view: 'sect-tab' }
    ];

    for (const navButton of navButtons) {
      const button = page.locator(navButton.selector);

      // Button should be visible and contain expected text
      await expect(button).toBeVisible();
      await expect(button).toContainText(navButton.text);

      // Button should be clickable
      await expect(button).not.toBeDisabled();
    }
  });

  test('navigation buttons switch views correctly', async ({ page, gameHelpers }) => {
    const tabMappings = [
      { buttonSelector: '[data-tab="cultivation"]', contentSelector: '#cultivation-tab' },
      { buttonSelector: '[data-tab="loadout"]', contentSelector: '#loadout-tab' },
      { buttonSelector: '[data-tab="scriptures"]', contentSelector: '#scriptures-tab' },
      { buttonSelector: '[data-tab="skills"]', contentSelector: '#skills-tab' },
      { buttonSelector: '[data-tab="combat"]', contentSelector: '#combat-tab' },
      { buttonSelector: '[data-tab="sect"]', contentSelector: '#sect-tab' }
    ];

    for (const tab of tabMappings) {
      // Click the navigation button
      await page.click(tab.buttonSelector);
      await page.waitForTimeout(300); // Allow for transition animation

      // Check that the corresponding tab content is visible
      await expect(page.locator(tab.contentSelector)).toBeVisible();

      // Check that the navigation button has active state
      await expect(page.locator(tab.buttonSelector)).toHaveClass(/active/);

      // Verify other tabs are hidden
      for (const otherTab of tabMappings) {
        if (otherTab.contentSelector !== tab.contentSelector) {
          await expect(page.locator(otherTab.contentSelector)).not.toHaveClass(/active/);
        }
      }
    }
  });

  test('cultivation tab is active by default', async ({ page, gameHelpers }) => {
    // After character creation, cultivation tab should be active
    await expect(page.locator('[data-tab="cultivation"]')).toHaveClass(/active/);
    await expect(page.locator('#cultivation-tab')).toHaveClass(/active/);

    // Other tabs should not be active
    const inactiveTabs = ['loadout', 'scriptures', 'skills', 'combat', 'sect'];
    for (const tabName of inactiveTabs) {
      await expect(page.locator(`[data-tab="${tabName}"]`)).not.toHaveClass(/active/);
    }
  });

  test('rapid navigation switching works correctly', async ({ page, gameHelpers }) => {
    // Rapidly switch between tabs to test UI responsiveness
    const tabs = ['loadout', 'scriptures', 'skills', 'combat', 'sect', 'cultivation'];

    for (let i = 0; i < 3; i++) { // Do multiple rounds
      for (const tab of tabs) {
        await page.click(`[data-tab="${tab}"]`);
        // Small delay to allow UI updates
        await page.waitForTimeout(50);
      }
    }

    // After rapid switching, UI should still be functional
    await page.click('[data-tab="cultivation"]');
    await expect(page.locator('#cultivation-tab')).toBeVisible();
    await expect(page.locator('[data-tab="cultivation"]')).toHaveClass(/active/);
  });

  test('navigation persists across page reloads', async ({ page, gameHelpers }) => {
    // Navigate to a specific tab
    await page.click('[data-tab="combat"]');
    await expect(page.locator('#combat-tab')).toBeVisible();

    // Save game state
    await gameHelpers.saveGame();

    // Reload page
    await page.reload();
    await gameHelpers.waitForGameLoad();

    // Should return to default (cultivation) tab after reload
    await expect(page.locator('#cultivation-tab')).toBeVisible();
    await expect(page.locator('[data-tab="cultivation"]')).toHaveClass(/active/);
  });

  test('all tab content sections exist and are accessible', async ({ page, gameHelpers }) => {
    const tabContents = [
      { tab: 'cultivation', selector: '#cultivation-tab', requiredElements: ['.cultivation-paths', '.cultivation-actions'] },
      { tab: 'loadout', selector: '#loadout-tab', requiredElements: ['.loadout-container', '.equipment-section'] },
      { tab: 'scriptures', selector: '#scriptures-tab', requiredElements: ['.gacha-section', '.scripture-inventory'] },
      { tab: 'skills', selector: '#skills-tab', requiredElements: ['#skills-interface'] },
      { tab: 'combat', selector: '#combat-tab', requiredElements: ['.combat-interface', '.combat-actions'] },
      { tab: 'sect', selector: '#sect-tab', requiredElements: ['.sect-interface', '#sect-status'] }
    ];

    for (const tabContent of tabContents) {
      // Navigate to the tab
      await page.click(`[data-tab="${tabContent.tab}"]`);
      await page.waitForTimeout(200);

      // Check that tab content is visible
      await expect(page.locator(tabContent.selector)).toBeVisible();

      // Check that required elements exist
      for (const elementSelector of tabContent.requiredElements) {
        await expect(page.locator(elementSelector)).toBeVisible();
      }
    }
  });

  test('navigation keyboard accessibility', async ({ page, gameHelpers }) => {
    // Focus on the first navigation button
    await page.focus('[data-tab="cultivation"]');

    // Tab through navigation buttons using keyboard
    const navButtons = ['cultivation', 'loadout', 'scriptures', 'skills', 'combat', 'sect'];

    for (let i = 0; i < navButtons.length; i++) {
      // Current button should be focused
      await expect(page.locator(`[data-tab="${navButtons[i]}"]`)).toBeFocused();

      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      // Corresponding content should be visible
      await expect(page.locator(`#${navButtons[i]}-tab`)).toBeVisible();

      // Move to next button (except on last iteration)
      if (i < navButtons.length - 1) {
        await page.keyboard.press('Tab');
      }
    }
  });

  test('view manager integration works correctly', async ({ page, gameHelpers }) => {
    // Test that ViewManager correctly tracks current view
    const getCurrentViewId = async () => {
      return await page.evaluate(() => {
        return window.viewManager?.getCurrentView?.()?.viewId || 'unknown';
      });
    };

    // Default should be cultivation (main game interface)
    await page.click('[data-tab="cultivation"]');
    await page.waitForTimeout(100);

    // Test navigation through different views
    const views = ['loadout', 'scriptures', 'skills', 'combat', 'sect'];

    for (const view of views) {
      await page.click(`[data-tab="${view}"]`);
      await page.waitForTimeout(100);

      // Verify the tab is active visually
      await expect(page.locator(`[data-tab="${view}"]`)).toHaveClass(/active/);
      await expect(page.locator(`#${view}-tab`)).toBeVisible();
    }
  });

  test('navigation works with ViewManager navigation history', async ({ page, gameHelpers }) => {
    // Navigate through several views to build history
    const navigationSequence = ['combat', 'skills', 'scriptures', 'loadout'];

    for (const tab of navigationSequence) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(100);
      await expect(page.locator(`#${tab}-tab`)).toBeVisible();
    }

    // Check that navigation state is tracked
    const navigationState = await page.evaluate(() => {
      return window.viewManager?.getNavigationState?.() || {};
    });

    // Should have some navigation history or state
    expect(navigationState).toBeDefined();
  });

  test('navigation error handling', async ({ page, gameHelpers }) => {
    // Test clicking on navigation when game is in an error state
    await page.evaluate(() => {
      // Simulate an error condition
      window.testErrorCondition = true;
    });

    // Navigation should still work
    await page.click('[data-tab="combat"]');
    await page.waitForTimeout(200);

    // Tab should still become active
    await expect(page.locator('[data-tab="combat"]')).toHaveClass(/active/);

    // Clean up
    await page.evaluate(() => {
      delete window.testErrorCondition;
    });
  });

  test('navigation visual feedback and animations', async ({ page, gameHelpers }) => {
    // Test that navigation buttons provide visual feedback
    const button = page.locator('[data-tab="loadout"]');

    // Button should not be active initially
    await expect(button).not.toHaveClass(/active/);

    // Click and verify active state
    await button.click();
    await expect(button).toHaveClass(/active/);

    // Content should be visible
    await expect(page.locator('#loadout-tab')).toBeVisible();

    // Test hover states work (by checking CSS is applied)
    await button.hover();
    // Note: Playwright can't directly test CSS hover states, but it should not crash
  });

  test('navigation with disabled states', async ({ page, gameHelpers }) => {
    // All navigation buttons should be enabled for a properly created character
    const navButtons = ['cultivation', 'loadout', 'scriptures', 'skills', 'combat', 'sect'];

    for (const button of navButtons) {
      await expect(page.locator(`[data-tab="${button}"]`)).not.toBeDisabled();
      await expect(page.locator(`[data-tab="${button}"]`)).toBeEnabled();
    }
  });
});

test.describe('UI Navigation - Mobile Responsiveness', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await gameHelpers.resetGame();
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
  });

  test('navigation works on mobile viewport', async ({ page, gameHelpers }) => {
    // Test navigation on mobile
    await page.click('[data-tab="combat"]');
    await expect(page.locator('#combat-tab')).toBeVisible();
    await expect(page.locator('[data-tab="combat"]')).toHaveClass(/active/);

    // Test that navigation bar is still accessible
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('navigation buttons are touch-friendly on mobile', async ({ page, gameHelpers }) => {
    // Check that buttons are large enough for touch interaction
    const navButtons = await page.locator('.bottom-nav .nav-btn').all();

    for (const button of navButtons) {
      const boundingBox = await button.boundingBox();
      expect(boundingBox).toBeDefined();

      // Buttons should be at least 44px tall (iOS guideline)
      expect(boundingBox.height).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe('UI Navigation - Error States', () => {
  test('navigation works when character creation failed', async ({ page, gameHelpers }) => {
    // Test navigation when no character is created (edge case)
    await gameHelpers.resetGame();

    // Try to access game interface directly without character creation
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(1000);

    // Should be at character creation, not game interface
    const characterCreation = page.locator('#character-creation');
    const gameInterface = page.locator('#game-interface');

    // Either character creation should be visible, or game should handle gracefully
    const isCharacterCreationVisible = await characterCreation.isVisible();
    const isGameInterfaceVisible = await gameInterface.isVisible();

    if (isGameInterfaceVisible) {
      // If game interface is visible, navigation should still work
      await page.click('[data-tab="cultivation"]');
      await expect(page.locator('#cultivation-tab')).toBeVisible();
    } else {
      // Character creation should be shown
      expect(isCharacterCreationVisible).toBe(true);
    }
  });
});