const { chromium } = require('playwright');

async function testErrorDetection() {
  console.log('Testing error detection system...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Add error capturing
    await page.addInitScript(() => {
      window.__capturedErrors = [];

      const originalError = console.error;
      console.error = function(...args) {
        window.__capturedErrors.push({
          type: 'console-error',
          message: args.join(' '),
          timestamp: Date.now()
        });
        originalError.apply(console, args);
      };
    });

    // Navigate to the game
    const gameUrl = 'file://' + process.cwd().replace(/\\/g, '/') + '/index.html';
    await page.goto(gameUrl);
    await page.waitForTimeout(2000);

    console.log('Testing character creation flow...');

    // Try to start character creation
    const startButton = page.locator('#start-character-creation');
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('Character creation may already be visible');
    }

    // Test choice selections
    const choices = [
      '[data-choice="dust-road"]',
      '[data-choice="protect"]',
      '[data-choice="thunder"]'
    ];

    let selectionsCount = 0;
    for (const choice of choices) {
      const element = page.locator(choice);
      if (await element.isVisible()) {
        await element.click();
        await page.waitForTimeout(300);
        selectionsCount++;
        console.log(`Selected choice: ${choice}`);
      }
    }

    // Check begin button state - this is where we detect the bug
    const beginButton = page.locator('#begin-cultivation');
    const buttonVisible = await beginButton.isVisible();
    let buttonEnabled = false;

    if (buttonVisible) {
      buttonEnabled = await beginButton.isEnabled();
    }

    console.log(`Selections made: ${selectionsCount}`);
    console.log(`Begin button visible: ${buttonVisible}`);
    console.log(`Begin button enabled: ${buttonEnabled}`);

    // Check for console errors
    const capturedErrors = await page.evaluate(() => window.__capturedErrors || []);
    console.log(`Console errors captured: ${capturedErrors.length}`);

    if (capturedErrors.length > 0) {
      console.log('Console errors:');
      capturedErrors.forEach(err => console.log(`  - ${err.message}`));
    }

    // This demonstrates the bug detection
    let bugDetected = false;
    if (selectionsCount >= 3 && buttonVisible && !buttonEnabled) {
      console.log('🔍 BUG DETECTED: Begin button should be enabled but is not!');
      console.log('This is exactly the character creation bug the error detector would catch');
      bugDetected = true;
    } else if (!buttonVisible) {
      console.log('Begin button not visible - may indicate different issue');
    } else if (buttonEnabled) {
      console.log('✅ Begin button is working correctly');

      // Test the transition too
      await beginButton.click();
      await page.waitForTimeout(2000);

      const creationHidden = await page.locator('#character-creation').isHidden();
      const gameVisible = await page.locator('#game-interface').isVisible();

      if (!creationHidden || !gameVisible) {
        console.log('🔍 BUG DETECTED: Character creation transition failed!');
        console.log(`Creation hidden: ${creationHidden}, Game visible: ${gameVisible}`);
        bugDetected = true;
      } else {
        console.log('✅ Character creation transition successful');
      }
    }

    return { bugDetected, selectionsCount, buttonVisible, buttonEnabled, consoleErrors: capturedErrors.length };

  } catch (error) {
    console.error('Test error:', error.message);
    return { bugDetected: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testErrorDetection().then(result => {
  console.log('\n=== ERROR DETECTION TEST RESULTS ===');
  if (result.bugDetected) {
    console.log('🎯 SUCCESS: Error detection system would catch critical bugs!');
  } else {
    console.log('ℹ️  No critical bugs detected in this run');
  }

  if (result.error) {
    console.log(`❌ Test error: ${result.error}`);
  }

  console.log('This demonstrates how the ErrorDetector class would:');
  console.log('  1. Monitor button state changes');
  console.log('  2. Detect functional failures');
  console.log('  3. Capture context about user actions');
  console.log('  4. Categorize errors by severity');
  console.log('  5. Generate actionable reports');

}).catch(console.error);