const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Starting game test...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for console messages
    page.on('console', msg => {
      console.log('CONSOLE:', msg.text());
    });

    // Listen for errors
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
    });

    const indexPath = path.join(__dirname, 'index.html');
    console.log('📱 Loading:', indexPath);

    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to interact with character creation to get to main game
    try {
      // Click first choice in each category
      await page.click('button[data-choice="dust-road"]');
      await page.click('button[data-choice="protect"]');
      await page.click('button[data-choice="thunder"]');

      // Click begin cultivation button
      await page.click('#begin-cultivation');

      console.log('🎮 Attempted to complete character creation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('⚠️ Could not complete character creation:', error.message);
    }

    // Check for error messages and game state
    const result = await page.evaluate(() => {
      const gameInterface = document.getElementById('game-interface');
      const characterCreation = document.getElementById('character-creation');

      return {
        title: document.title,
        hasErrorMessage: document.body.innerHTML.includes('Game Failed to Load'),
        hasGameInterface: !!gameInterface,
        hasCharacterCreation: !!characterCreation,
        gameInterfaceVisible: gameInterface ? !gameInterface.classList.contains('hidden') : false,
        characterCreationVisible: characterCreation ? !characterCreation.classList.contains('hidden') && characterCreation.style.display !== 'none' : false,
        bodyContent: document.body.innerHTML.substring(0, 1000),
        visibleElements: Array.from(document.querySelectorAll('*')).filter(el =>
          el.offsetWidth > 0 && el.offsetHeight > 0
        ).map(el => el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.replace(/ /g, '.') : '')).slice(0, 10)
      };
    });

    console.log('\n📊 Test Results:');
    console.log('Title:', result.title);
    console.log('Has Error Message:', result.hasErrorMessage);
    console.log('Has Game Interface:', result.hasGameInterface);
    console.log('Game Interface Visible:', result.gameInterfaceVisible);
    console.log('Has Character Creation:', result.hasCharacterCreation);
    console.log('Character Creation Visible:', result.characterCreationVisible);
    console.log('Visible Elements:', result.visibleElements);

    if (result.hasErrorMessage) {
      console.log('❌ GAME FAILED TO LOAD');
      console.log('Error content preview:', result.bodyContent);
    } else if (result.gameInterfaceVisible || result.characterCreationVisible) {
      console.log('✅ GAME LOADED AND VISIBLE');
    } else if (result.hasGameInterface || result.hasCharacterCreation) {
      console.log('⚠️ GAME EXISTS BUT NOT VISIBLE');
      console.log('Body content preview:', result.bodyContent.substring(0, 500));
    } else {
      console.log('❌ GAME NOT FOUND');
    }

    // Keep browser open for 10 seconds for manual inspection
    console.log('\n🔍 Browser will stay open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();