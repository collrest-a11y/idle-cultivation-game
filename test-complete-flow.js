const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing complete character creation flow...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for console messages and errors
    page.on('console', msg => {
      if (msg.text().includes('ERROR') || msg.text().includes('Failed') || msg.text().includes('CRITICAL')) {
        console.log('❌ CONSOLE ERROR:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🎯 Testing character creation flow...');

    // Step 1: Make character creation choices
    await page.click('button[data-choice="dust-road"]');
    console.log('✅ Selected origin: dust-road');

    await page.click('button[data-choice="protect"]');
    console.log('✅ Selected vow: protect');

    await page.click('button[data-choice="thunder"]');
    console.log('✅ Selected mark: thunder');

    // Step 2: Click begin cultivation
    await page.click('#begin-cultivation');
    console.log('✅ Clicked Begin Cultivation');

    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Check final state
    const result = await page.evaluate(() => {
      const gameInterface = document.getElementById('game-interface');
      const characterCreation = document.getElementById('character-creation');

      return {
        characterCreationHidden: characterCreation ?
          (characterCreation.style.display === 'none' || characterCreation.classList.contains('hidden')) : false,
        gameInterfaceVisible: gameInterface ?
          (!gameInterface.classList.contains('hidden') && gameInterface.style.display !== 'none') : false,
        gameInterfaceExists: !!gameInterface,
        characterCreationExists: !!characterCreation,
        title: document.title
      };
    });

    console.log('\n📊 Flow Test Results:');
    console.log('Character Creation Hidden:', result.characterCreationHidden);
    console.log('Game Interface Visible:', result.gameInterfaceVisible);
    console.log('Game Interface Exists:', result.gameInterfaceExists);
    console.log('Character Creation Exists:', result.characterCreationExists);
    console.log('Title:', result.title);

    if (result.characterCreationHidden && result.gameInterfaceVisible) {
      console.log('\n🎉 SUCCESS: Character creation flow works correctly!');
      console.log('   ✅ Character creation is hidden');
      console.log('   ✅ Main game interface is visible');
    } else if (result.characterCreationHidden && !result.gameInterfaceVisible) {
      console.log('\n⚠️ PARTIAL SUCCESS: Character creation hidden but game interface not visible');
    } else {
      console.log('\n❌ FAILED: Character creation flow did not work correctly');
    }

    // Keep browser open for 5 seconds for inspection
    console.log('\n🔍 Browser will stay open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await browser.close();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();