const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing complete character creation flow with forced clicks...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for our debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CHARACTER DEBUG:') || text.includes('Character creation completed:')) {
        console.log('BROWSER:', text);
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    console.log('🕐 Waiting for setup to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🎯 Testing complete selection sequence with forced clicks...');

    // Force click all three choices using JavaScript
    await page.evaluate(() => {
      console.log('CHARACTER DEBUG: Forcing origin selection...');
      const originBtn = document.querySelector('button[data-choice="dust-road"]');
      if (originBtn) originBtn.click();
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    await page.evaluate(() => {
      console.log('CHARACTER DEBUG: Forcing vow selection...');
      const vowBtn = document.querySelector('button[data-choice="protect"]');
      if (vowBtn) vowBtn.click();
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    await page.evaluate(() => {
      console.log('CHARACTER DEBUG: Forcing mark selection...');
      const markBtn = document.querySelector('button[data-choice="thunder"]');
      if (markBtn) markBtn.click();
    });

    console.log('✅ All choices made, waiting for polling to detect...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if begin button is enabled
    const buttonState = await page.evaluate(() => {
      const beginBtn = document.getElementById('begin-cultivation');
      return {
        disabled: beginBtn ? beginBtn.disabled : null,
        className: beginBtn ? beginBtn.className : null,
        hasOnclick: typeof beginBtn.onclick === 'function'
      };
    });

    console.log('Button state after all selections:', buttonState);

    if (!buttonState.disabled) {
      console.log('🎉 SUCCESS! Begin button is enabled! Testing completion...');

      // Click the begin button
      await page.evaluate(() => {
        console.log('CHARACTER DEBUG: Clicking begin cultivation button...');
        const beginBtn = document.getElementById('begin-cultivation');
        if (beginBtn && beginBtn.onclick) {
          beginBtn.onclick();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check final state
      const finalState = await page.evaluate(() => {
        const charCreation = document.getElementById('character-creation');
        const gameInterface = document.getElementById('game-interface');
        return {
          charCreationDisplay: charCreation ? charCreation.style.display : null,
          charCreationHidden: charCreation ?
            (charCreation.style.display === 'none' || charCreation.classList.contains('hidden')) : false,
          gameInterfaceVisible: gameInterface ?
            (!gameInterface.classList.contains('hidden') && gameInterface.style.display !== 'none') : false,
          gameInterfaceClass: gameInterface ? gameInterface.className : null,
          gameInterfaceDisplay: gameInterface ? gameInterface.style.display : null
        };
      });

      console.log('Final state after begin button click:', finalState);

      if (finalState.charCreationHidden && finalState.gameInterfaceVisible) {
        console.log('🎉🎉🎉 COMPLETE SUCCESS! Character creation flow works perfectly!');
        console.log('   ✅ Character creation is hidden');
        console.log('   ✅ Main game interface is visible');
        console.log('   ✅ Full transition completed');
      } else if (finalState.charCreationHidden) {
        console.log('🎉 SUCCESS! Character creation completed but game interface may still be loading...');
      } else {
        console.log('⚠️ Partial success: Begin button worked but transition may have issues');
      }
    } else {
      console.log('❌ Begin button is still disabled after all selections');
    }

    // Keep browser open for inspection
    console.log('\n🔍 Browser will stay open for 15 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    await browser.close();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();