const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing full sequence with debug logging...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for our debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CHARACTER DEBUG:')) {
        console.log('BROWSER:', text);
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log('🎯 Testing complete selection sequence...');

    // Select origin
    console.log('Clicking origin: dust-road');
    await page.click('button[data-choice="dust-road"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Select vow
    console.log('Clicking vow: protect');
    await page.click('button[data-choice="protect"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Select mark
    console.log('Clicking mark: thunder');
    await page.click('button[data-choice="thunder"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

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
      console.log('🎯 Button is enabled! Testing click...');
      await page.click('#begin-cultivation');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if transition happened
      const finalState = await page.evaluate(() => {
        const charCreation = document.getElementById('character-creation');
        const gameInterface = document.getElementById('game-interface');
        return {
          charCreationDisplay: charCreation ? charCreation.style.display : null,
          gameInterfaceHidden: gameInterface ? gameInterface.classList.contains('hidden') : null
        };
      });

      console.log('Final state after button click:', finalState);
    } else {
      console.log('❌ Button is still disabled after all selections');
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