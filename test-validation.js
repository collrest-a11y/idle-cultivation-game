import { chromium } from 'playwright';

async function testValidation() {
  console.log('🧪 Testing Validation System\n');

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    const filePath = 'file:///' + process.cwd().replace(/\\/g, '/') + '/index.html';
    console.log(`📍 Attempting to navigate to ${filePath}`);
    await page.goto(filePath, {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    });

    console.log('✅ Successfully loaded page');

    // Check for game initialization
    const hasGame = await page.evaluate(() => {
      return typeof window.game !== 'undefined';
    });

    console.log(`🎮 Game object exists: ${hasGame}`);

    // Check for errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log(`\n❌ Found ${errors.length} console errors:`);
      errors.slice(0, 5).forEach(err => console.log(`  - ${err.substring(0, 100)}`));
    } else {
      console.log('✅ No console errors detected');
    }

    console.log('\n🎉 Validation system is working!');

  } catch (error) {
    console.error('❌ Validation test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testValidation().catch(console.error);