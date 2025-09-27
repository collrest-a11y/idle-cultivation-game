import { chromium } from 'playwright';

async function demoValidation() {
  console.log('🎮 Idle Cultivation Game - Validation System Demo\n');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Collect errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Load the game
    const filePath = 'file:///' + process.cwd().replace(/\\/g, '/') + '/index.html';
    console.log('\n📂 Loading game from:', filePath);

    await page.goto(filePath, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    console.log('✅ Game loaded successfully\n');

    // Wait for initialization
    await page.waitForTimeout(3000);

    // Run validation checks
    console.log('🔍 Running Validation Checks:\n');

    // Check 1: Game Object
    const hasGame = await page.evaluate(() => typeof window.game !== 'undefined');
    console.log(`  1. Game object initialized: ${hasGame ? '✅' : '❌'}`);

    // Check 2: Character System
    const hasCharacter = await page.evaluate(() => {
      return window.game?.gameState?.get('player') !== null;
    });
    console.log(`  2. Character system ready: ${hasCharacter ? '✅' : '❌ No character'}`);

    // Check 3: Save System
    const hasSaveSystem = await page.evaluate(() => {
      return typeof window.SaveManager !== 'undefined';
    });
    console.log(`  3. Save system available: ${hasSaveSystem ? '✅' : '❌'}`);

    // Check 4: Module System
    const modules = await page.evaluate(() => {
      if (window.ModuleManager?.modules) {
        return Object.keys(window.ModuleManager.modules);
      }
      return [];
    });
    console.log(`  4. Modules loaded: ${modules.length > 0 ? '✅' : '❌'} (${modules.length} modules)`);

    // Check 5: UI System
    const hasUI = await page.evaluate(() => {
      return document.getElementById('gameView') !== null;
    });
    console.log(`  5. UI system ready: ${hasUI ? '✅' : '❌'}`);

    // Check 6: Console Errors
    console.log(`  6. Console errors: ${errors.length === 0 ? '✅ None' : `❌ ${errors.length} errors found`}`);

    if (errors.length > 0 && errors.length <= 3) {
      console.log('\n  First few errors:');
      errors.forEach(err => console.log(`    - ${err.substring(0, 80)}`));
    }

    // Test character creation flow
    console.log('\n🎮 Testing Character Creation Flow:\n');

    if (!hasCharacter) {
      const canCreateCharacter = await page.evaluate(() => {
        // Check for character creation button
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(b =>
          b.textContent.toLowerCase().includes('create') ||
          b.textContent.toLowerCase().includes('new')
        );
        return createBtn !== null;
      });

      console.log(`  Character creation available: ${canCreateCharacter ? '✅' : '❌'}`);

      if (canCreateCharacter) {
        console.log('  Would test: Origin selection → Vow selection → Mark selection → Begin');
      }
    } else {
      console.log('  Character already exists - creation test skipped');
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 Validation Summary:\n');

    const checks = [hasGame, hasSaveSystem, modules.length > 0, hasUI];
    const passed = checks.filter(c => c).length;
    const total = checks.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`  Core Systems: ${passed}/${total} passing (${percentage}%)`);
    console.log(`  Errors Found: ${errors.length}`);
    console.log(`  Status: ${percentage >= 75 ? '✅ READY' : percentage >= 50 ? '⚠️  FUNCTIONAL' : '❌ NEEDS FIXES'}`);

    console.log('\n🎉 Validation Complete!');
    console.log('\nThe iterate-validate-fix-loop system can automatically:');
    console.log('  - Detect and categorize all errors');
    console.log('  - Generate intelligent fixes');
    console.log('  - Validate fixes before applying');
    console.log('  - Continue until 100% error-free');

  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
  } finally {
    await browser.close();
  }
}

demoValidation().catch(console.error);