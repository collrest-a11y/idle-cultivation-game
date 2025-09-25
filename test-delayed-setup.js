const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing delayed character creation setup...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for our debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CHARACTER DEBUG:') || text.includes('Game is ready!') || text.includes('Button clicked')) {
        console.log('BROWSER:', text);
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    console.log('🕐 Waiting for delayed character creation setup...');
    // Wait for the game to initialize AND the character creation to be set up
    await new Promise(resolve => setTimeout(resolve, 7000));

    console.log('🎯 Testing character creation after delayed setup...');

    // Test clicking all three choices
    console.log('Clicking origin: dust-road');
    await page.click('button[data-choice="dust-road"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Clicking vow: protect');
    await page.click('button[data-choice="protect"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Clicking mark: thunder');
    await page.click('button[data-choice="thunder"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check final button state
    const buttonState = await page.evaluate(() => {
      const beginBtn = document.getElementById('begin-cultivation');
      return {
        disabled: beginBtn ? beginBtn.disabled : null,
        className: beginBtn ? beginBtn.className : null
      };
    });

    console.log('Final button state:', buttonState);

    if (!buttonState.disabled) {
      console.log('🎉 SUCCESS! Button is enabled! Testing complete flow...');

      await page.click('#begin-cultivation');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if transition happened
      const finalState = await page.evaluate(() => {
        const charCreation = document.getElementById('character-creation');
        const gameInterface = document.getElementById('game-interface');
        return {
          charCreationHidden: charCreation ?
            (charCreation.style.display === 'none' || charCreation.classList.contains('hidden')) : false,
          gameInterfaceVisible: gameInterface ?
            (!gameInterface.classList.contains('hidden') && gameInterface.style.display !== 'none') : false
        };
      });

      console.log('Final state after completion:', finalState);

      if (finalState.charCreationHidden && finalState.gameInterfaceVisible) {
        console.log('🎉🎉🎉 COMPLETE SUCCESS! Character creation flow works!');
      } else {
        console.log('⚠️ Partial success: Button worked but transition may have issues');
      }
    } else {
      console.log('❌ Button is still disabled after delayed setup');
    }

    // Keep browser open for inspection
    console.log('\n🔍 Browser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();