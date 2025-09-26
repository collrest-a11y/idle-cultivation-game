/**
 * Game-specific helper functions for Playwright tests
 * Part of the Automated Validation & Fix Loop System
 */

export class GameHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for the game to fully load and initialize
   */
  async waitForGameLoad() {
    // Wait for either character creation or game interface
    await this.page.waitForSelector('#character-creation, #game-interface', { 
      timeout: 10000 
    });
    
    // Wait for game state initialization
    await this.page.waitForFunction(
      () => window.gameState && window.gameState.initialized,
      { timeout: 10000 }
    ).catch(() => {
      // Game state might not be initialized if we're at character creation
      console.log('Game state not yet initialized - likely at character creation');
    });
  }

  /**
   * Create a new character with specified attributes
   */
  async createCharacter(origin, vow, mark) {
    // Ensure we're at character creation
    const isCharacterCreation = await this.page.locator('#character-creation').isVisible();
    if (!isCharacterCreation) {
      throw new Error('Not at character creation screen');
    }

    // Select origin
    await this.page.click(`[data-choice="${origin}"]`);
    await this.page.waitForTimeout(100);
    
    // Select vow
    await this.page.click(`[data-choice="${vow}"]`);
    await this.page.waitForTimeout(100);
    
    // Select mark
    await this.page.click(`[data-choice="${mark}"]`);
    await this.page.waitForTimeout(500); // Wait for button to enable
    
    // Click begin cultivation
    const beginBtn = this.page.locator('#begin-cultivation');
    await beginBtn.waitFor({ state: 'visible' });
    
    // Check if button is enabled
    const isEnabled = await beginBtn.isEnabled();
    if (!isEnabled) {
      throw new Error('Begin button not enabled after all selections');
    }
    
    await beginBtn.click();
    
    // Wait for transition to game
    await this.page.waitForSelector('#game-interface', { timeout: 5000 });
  }

  /**
   * Capture current game state for validation
   */
  async captureGameState() {
    return await this.page.evaluate(() => {
      return {
        player: window.gameState?.get('player'),
        resources: window.gameState?.get('resources'),
        errors: window.errorManager?.getErrors?.() || [],
        hasCharacter: localStorage.getItem('idleCultivation_hasCharacter') === 'true',
        currentView: window.viewManager?.currentView
      };
    });
  }

  /**
   * Check for console errors
   */
  async checkForErrors() {
    const errors = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console-error',
          text: msg.text(),
          location: msg.location()
        });
      }
    });
    
    this.page.on('pageerror', error => {
      errors.push({
        type: 'page-error',
        message: error.message,
        stack: error.stack
      });
    });
    
    // Wait a bit to collect errors
    await this.page.waitForTimeout(1000);
    
    return errors;
  }

  /**
   * Clear game data and reset
   */
  async resetGame() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.reload();
    await this.waitForGameLoad();
  }

  /**
   * Save current game state
   */
  async saveGame() {
    return await this.page.evaluate(() => {
      if (window.gameState && typeof window.gameState.save === 'function') {
        window.gameState.save();
        return { success: true };
      }
      return { success: false, error: 'Save function not available' };
    });
  }

  /**
   * Navigate to a specific view
   */
  async navigateTo(view) {
    const selector = `[data-view="${view}"]`;
    await this.page.click(selector);
    await this.page.waitForTimeout(500); // Wait for view transition
  }

  /**
   * Get current FPS
   */
  async measureFPS(duration = 3000) {
    const fps = await this.page.evaluate((duration) => {
      return new Promise((resolve) => {
        let frames = 0;
        let startTime = performance.now();
        
        function countFrame() {
          frames++;
          const elapsed = performance.now() - startTime;
          
          if (elapsed < duration) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(Math.round(frames / (elapsed / 1000)));
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    }, duration);
    
    return fps;
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage() {
    return await this.page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          usage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(2)
        };
      }
      return null;
    });
  }

  /**
   * Take a screenshot with metadata
   */
  async captureScreenshot(name, fullPage = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `test-results/screenshots/${name}-${timestamp}.png`;
    
    await this.page.screenshot({ 
      path,
      fullPage
    });
    
    return path;
  }
}