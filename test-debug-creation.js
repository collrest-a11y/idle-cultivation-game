const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Debug character creation flow...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Checking initial state...');

    // Check initial button state
    const initialState = await page.evaluate(() => {
      const beginBtn = document.getElementById('begin-cultivation');
      const charCreation = document.getElementById('character-creation');
      const gameInterface = document.getElementById('game-interface');

      return {
        buttonExists: !!beginBtn,
        buttonDisabled: beginBtn ? beginBtn.disabled : null,
        buttonText: beginBtn ? beginBtn.textContent : null,
        charCreationVisible: charCreation ? charCreation.style.display !== 'none' : false,
        gameInterfaceHidden: gameInterface ? gameInterface.classList.contains('hidden') : false
      };
    });

    console.log('Initial state:', initialState);

    console.log('🎯 Making choices...');

    // Step 1: Make character creation choices
    await page.click('button[data-choice="dust-road"]');
    console.log('✅ Selected origin: dust-road');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.click('button[data-choice="protect"]');
    console.log('✅ Selected vow: protect');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.click('button[data-choice="thunder"]');
    console.log('✅ Selected mark: thunder');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check button state after choices
    const afterChoices = await page.evaluate(() => {
      const beginBtn = document.getElementById('begin-cultivation');
      return {
        buttonDisabled: beginBtn ? beginBtn.disabled : null,
        buttonClass: beginBtn ? beginBtn.className : null,
        selectedChoices: {
          origin: document.querySelector('button[data-choice="dust-road"]')?.classList.contains('selected'),
          vow: document.querySelector('button[data-choice="protect"]')?.classList.contains('selected'),
          mark: document.querySelector('button[data-choice="thunder"]')?.classList.contains('selected')
        }
      };
    });

    console.log('After choices state:', afterChoices);

    if (!afterChoices.buttonDisabled) {
      console.log('🎯 Button is enabled, clicking...');

      // Step 2: Click begin cultivation
      await page.click('#begin-cultivation');
      console.log('✅ Clicked Begin Cultivation');

      // Wait for transition
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check final state
      const finalState = await page.evaluate(() => {
        const gameInterface = document.getElementById('game-interface');
        const characterCreation = document.getElementById('character-creation');

        return {
          characterCreationDisplay: characterCreation ? characterCreation.style.display : null,
          gameInterfaceClass: gameInterface ? gameInterface.className : null,
          gameInterfaceDisplay: gameInterface ? gameInterface.style.display : null
        };
      });

      console.log('Final state:', finalState);
    } else {
      console.log('❌ Button is still disabled after making choices');
    }

    // Keep browser open for 10 seconds for inspection
    console.log('\n🔍 Browser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
    console.log('✅ Debug completed');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
})();