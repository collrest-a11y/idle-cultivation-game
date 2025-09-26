---
name: Comprehensive Test Suite Development
status: open
created: 2025-09-25T19:36:00Z
updated: 2025-09-25T20:15:00Z
priority: P0
effort: 3d
dependencies: [001]
github: https://github.com/collrest-a11y/idle-cultivation-game/issues/123
---

# Task 002: Comprehensive Test Suite Development

## Objective
Create a comprehensive test suite that validates all critical game functionality through real browser interactions, ensuring the game actually works as intended, not just that it loads without console errors.

## Background
The character creation bug that made the game unplayable was missed by existing validation. We need tests that verify actual user workflows.

## Acceptance Criteria

### Required
- [ ] Character creation flow fully tested (all paths)
- [ ] Game initialization validated
- [ ] Save/load functionality tested
- [ ] UI element interaction tests
- [ ] Game state progression tests
- [ ] Resource management tests
- [ ] Combat mechanics validation
- [ ] Skill system tests
- [ ] Navigation between all views tested
- [ ] Cross-browser compatibility verified
- [ ] Memory leak detection tests
- [ ] Performance baseline tests

### Nice to Have
- [ ] Visual regression tests
- [ ] Accessibility tests
- [ ] Mobile responsiveness tests
- [ ] Localization tests

## Test Categories

### 1. Character Creation Tests
```javascript
// tests/e2e/character-creation.spec.js
import { test, expect } from '../base/base-test';

test.describe('Character Creation', () => {
  test('can create character with all combinations', async ({ page, gameHelpers }) => {
    const origins = ['dust-road', 'mountain-peak', 'riverside'];
    const vows = ['protect', 'power', 'transcend'];
    const marks = ['thunder', 'frost', 'flame'];

    for (const origin of origins) {
      for (const vow of vows) {
        for (const mark of marks) {
          await page.reload();
          await page.evaluate(() => localStorage.clear());
          
          // Select choices
          await page.click(`[data-choice="${origin}"]`);
          await page.click(`[data-choice="${vow}"]`);
          await page.click(`[data-choice="${mark}"]`);
          
          // Verify begin button enables
          const beginBtn = page.locator('#begin-cultivation');
          await expect(beginBtn).toBeEnabled();
          
          // Create character
          await beginBtn.click();
          
          // Verify transition to game
          await expect(page.locator('#character-creation')).toBeHidden();
          await expect(page.locator('#game-interface')).toBeVisible();
          
          // Verify character data saved
          const savedData = await page.evaluate(() => 
            localStorage.getItem('idleCultivation_hasCharacter')
          );
          expect(savedData).toBe('true');
        }
      }
    }
  });

  test('begin button disabled until all selections made', async ({ page }) => {
    const beginBtn = page.locator('#begin-cultivation');
    await expect(beginBtn).toBeDisabled();
    
    await page.click('[data-choice="dust-road"]');
    await expect(beginBtn).toBeDisabled();
    
    await page.click('[data-choice="protect"]');
    await expect(beginBtn).toBeDisabled();
    
    await page.click('[data-choice="thunder"]');
    await expect(beginBtn).toBeEnabled();
  });
});
```

### 2. Game State Tests
```javascript
// tests/e2e/game-state.spec.js
test.describe('Game State Management', () => {
  test('game initializes correctly', async ({ page, gameHelpers }) => {
    await gameHelpers.waitForGameLoad();
    
    const gameState = await page.evaluate(() => ({
      initialized: window.gameState?.initialized,
      hasPlayer: !!window.gameState?.get('player'),
      hasResources: !!window.gameState?.get('resources'),
      hasCultivation: !!window.CultivationSystem,
      hasCombat: !!window.CombatSystem,
      hasSkills: !!window.SkillSystem,
    }));
    
    expect(gameState.initialized).toBe(true);
    expect(gameState.hasPlayer).toBe(true);
    expect(gameState.hasResources).toBe(true);
    expect(gameState.hasCultivation).toBe(true);
    expect(gameState.hasCombat).toBe(true);
    expect(gameState.hasSkills).toBe(true);
  });

  test('game progresses over time', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
    
    const initialState = await gameHelpers.captureGameState();
    await page.waitForTimeout(5000); // Wait for idle progression
    const finalState = await gameHelpers.captureGameState();
    
    // Verify some progression occurred
    expect(finalState.resources.qi).toBeGreaterThan(initialState.resources.qi || 0);
  });
});
```

### 3. Save/Load Tests
```javascript
// tests/e2e/save-load.spec.js
test.describe('Save/Load System', () => {
  test('can save and load game', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
    
    // Progress the game
    await page.waitForTimeout(3000);
    const beforeSave = await gameHelpers.captureGameState();
    
    // Save game
    await page.evaluate(() => window.gameState.save());
    
    // Reload page
    await page.reload();
    await gameHelpers.waitForGameLoad();
    
    // Verify loaded state matches
    const afterLoad = await gameHelpers.captureGameState();
    expect(afterLoad.player.level).toBe(beforeSave.player.level);
    expect(afterLoad.resources.qi).toBeCloseTo(beforeSave.resources.qi, 1);
  });

  test('handles corrupted save data gracefully', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('gameState', 'corrupted_data');
    });
    
    await page.reload();
    // Should not crash, should show character creation
    await expect(page.locator('#character-creation')).toBeVisible();
  });
});
```

### 4. UI Interaction Tests
```javascript
// tests/e2e/ui-interaction.spec.js
test.describe('UI Interactions', () => {
  test('all navigation buttons work', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
    
    const navButtons = [
      { selector: '[data-view="cultivation"]', view: 'cultivation-view' },
      { selector: '[data-view="combat"]', view: 'combat-view' },
      { selector: '[data-view="skills"]', view: 'skills-view' },
      { selector: '[data-view="inventory"]', view: 'inventory-view' },
    ];
    
    for (const nav of navButtons) {
      await page.click(nav.selector);
      await expect(page.locator(`#${nav.view}`)).toBeVisible();
    }
  });

  test('buttons respond to clicks', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
    
    // Test cultivation button
    const cultivateBtn = page.locator('#cultivate-btn');
    if (await cultivateBtn.isVisible()) {
      const clickCount = await page.evaluate(() => {
        let count = 0;
        document.querySelector('#cultivate-btn').addEventListener('click', () => count++);
        return count;
      });
      
      await cultivateBtn.click();
      const newCount = await page.evaluate(() => count);
      expect(newCount).toBeGreaterThan(clickCount);
    }
  });
});
```

### 5. Cross-Browser Tests
```javascript
// tests/e2e/cross-browser.spec.js
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`works in ${browserName}`, async ({ page, browserName }) => {
      await expect(page).toHaveTitle(/Idle Cultivation/);
      
      // Test critical functionality
      const gameLoaded = await page.evaluate(() => 
        typeof window.gameState !== 'undefined'
      );
      expect(gameLoaded).toBe(true);
    });
  });
});
```

### 6. Performance Tests
```javascript
// tests/e2e/performance.spec.js
test.describe('Performance', () => {
  test('no memory leaks during gameplay', async ({ page, gameHelpers }) => {
    await gameHelpers.createCharacter('dust-road', 'protect', 'thunder');
    
    const getMemory = () => page.evaluate(() => 
      performance.memory ? performance.memory.usedJSHeapSize : 0
    );
    
    const initialMemory = await getMemory();
    
    // Simulate extended gameplay
    for (let i = 0; i < 10; i++) {
      await page.click('[data-view="combat"]');
      await page.click('[data-view="cultivation"]');
      await page.waitForTimeout(1000);
    }
    
    const finalMemory = await getMemory();
    const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
    
    // Memory shouldn't increase by more than 50%
    expect(memoryIncrease).toBeLessThan(0.5);
  });

  test('page loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#game-interface, #character-creation');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });
});
```

## Test Execution Plan

### Local Development
```bash
# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- character-creation

# Run in headed mode for debugging
npm run test:e2e -- --headed

# Run specific browser
npm run test:e2e -- --project=chromium
```

### CI/CD
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v2
        if: failure()
        with:
          name: test-results
          path: test-results/
```

## Success Metrics
- 100% of critical user paths tested
- All tests pass in all 4 browsers
- Character creation bug detected by tests
- Test execution < 5 minutes
- Zero false positives
- 95%+ code coverage for UI interactions

## Notes
- Focus on user-facing functionality, not internals
- Tests should be independent and idempotent
- Use data-testid attributes for reliable selectors
- Consider test data management strategy