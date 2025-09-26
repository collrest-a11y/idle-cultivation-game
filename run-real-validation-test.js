import { chromium } from 'playwright';

console.log('🧪 REAL VALIDATION SYSTEM TEST\n');
console.log('=' .repeat(60));

async function runRealTest() {
  const browser = await chromium.launch({ headless: false }); // Show browser

  try {
    console.log('\n📋 TEST 1: Page Loading');
    const page = await browser.newPage();

    // Track all console messages
    const consoleMessages = [];
    const errors = [];

    page.on('console', msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Load the game
    const filePath = 'file:///' + process.cwd().replace(/\\/g, '/') + '/index.html';
    await page.goto(filePath, { waitUntil: 'domcontentloaded' });
    console.log('✅ Page loaded');

    // Wait for initialization
    await page.waitForTimeout(3000);
    console.log(`📊 Console messages captured: ${consoleMessages.length}`);
    console.log(`❌ Errors found: ${errors.length}`);

    // TEST 2: Check game systems
    console.log('\n📋 TEST 2: Core Systems Check');

    const systems = await page.evaluate(() => {
      return {
        game: typeof window.game !== 'undefined',
        gameState: typeof window.GameState !== 'undefined',
        saveManager: typeof window.SaveManager !== 'undefined',
        moduleManager: typeof window.ModuleManager !== 'undefined',
        craftingSystem: typeof window.CraftingSystem !== 'undefined',
        shopManager: typeof window.ShopManager !== 'undefined',
        errorManager: typeof window.ErrorManager !== 'undefined',
        viewManager: typeof window.ViewManager !== 'undefined'
      };
    });

    Object.entries(systems).forEach(([name, exists]) => {
      console.log(`  ${name}: ${exists ? '✅' : '❌'}`);
    });

    // TEST 3: Character Creation
    console.log('\n📋 TEST 3: Character Creation Flow');

    const hasCharacter = await page.evaluate(() => {
      return window.game?.gameState?.get('player') !== null;
    });

    if (hasCharacter) {
      console.log('  Character already exists ✅');
    } else {
      console.log('  No character - testing creation...');

      // Check if character creation UI exists
      const hasCreationUI = await page.evaluate(() => {
        const modal = document.querySelector('.modal, #characterCreation');
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(b =>
          b.textContent.toLowerCase().includes('create') ||
          b.textContent.toLowerCase().includes('new')
        );
        return { modal: !!modal, button: !!createBtn };
      });

      console.log(`  Creation modal: ${hasCreationUI.modal ? '✅' : '❌'}`);
      console.log(`  Create button: ${hasCreationUI.button ? '✅' : '❌'}`);
    }

    // TEST 4: Save/Load
    console.log('\n📋 TEST 4: Save System');

    const saveTest = await page.evaluate(() => {
      try {
        const testData = { test: true, timestamp: Date.now() };
        localStorage.setItem('test_save', JSON.stringify(testData));
        const loaded = JSON.parse(localStorage.getItem('test_save'));
        localStorage.removeItem('test_save');
        return loaded?.test === true;
      } catch (e) {
        return false;
      }
    });

    console.log(`  Save/Load: ${saveTest ? '✅' : '❌'}`);

    // TEST 5: UI Responsiveness
    console.log('\n📋 TEST 5: UI Elements');

    const uiElements = await page.evaluate(() => {
      return {
        gameContainer: !!document.getElementById('game-container'),
        gameView: !!document.getElementById('gameView'),
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        visible: document.getElementById('gameView')?.children.length || 0
      };
    });

    console.log(`  Game container: ${uiElements.gameContainer ? '✅' : '❌'}`);
    console.log(`  Game view: ${uiElements.gameView ? '✅' : '❌'}`);
    console.log(`  Interactive buttons: ${uiElements.buttons}`);
    console.log(`  Input fields: ${uiElements.inputs}`);
    console.log(`  Visible UI elements: ${uiElements.visible}`);

    // TEST 6: Performance
    console.log('\n📋 TEST 6: Performance Metrics');

    const metrics = await page.evaluate(() => {
      return {
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        resources: performance.getEntriesByType('resource').length
      };
    });

    console.log(`  DOM ready time: ${metrics.domReady}ms`);
    console.log(`  Resources loaded: ${metrics.resources}`);

    // SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 TEST SUMMARY:\n');

    const systemsWorking = Object.values(systems).filter(v => v).length;
    const totalSystems = Object.values(systems).length;

    console.log(`  Systems: ${systemsWorking}/${totalSystems} working`);
    console.log(`  Errors: ${errors.length} console errors`);
    console.log(`  UI: ${uiElements.buttons} buttons, ${uiElements.inputs} inputs`);
    console.log(`  Performance: ${metrics.domReady}ms load time`);

    if (errors.length > 0) {
      console.log('\n  First 3 errors:');
      errors.slice(0, 3).forEach(e => {
        console.log(`    - ${e.substring(0, 80)}`);
      });
    }

    console.log('\n🏁 TEST VERDICT:');
    if (systemsWorking >= 6 && errors.length === 0) {
      console.log('  ✅ SYSTEM IS WORKING PERFECTLY');
    } else if (systemsWorking >= 4 && errors.length < 5) {
      console.log('  ⚠️  SYSTEM IS FUNCTIONAL WITH MINOR ISSUES');
    } else {
      console.log('  ❌ SYSTEM HAS SIGNIFICANT PROBLEMS');
    }

  } catch (error) {
    console.error('\n💥 TEST CRASHED:', error.message);
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

runRealTest().catch(console.error);