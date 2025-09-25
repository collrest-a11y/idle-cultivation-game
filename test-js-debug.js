const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing JavaScript event handlers...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for console messages
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.text());
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Checking event handlers...');

    // Check if event handlers exist
    const eventInfo = await page.evaluate(() => {
      const fragmentChoices = document.querySelectorAll('.fragment-choice');
      const beginBtn = document.getElementById('begin-cultivation');

      console.log('Fragment choices found:', fragmentChoices.length);
      console.log('Begin button found:', !!beginBtn);

      // Test click handler manually
      if (fragmentChoices.length > 0) {
        console.log('Testing manual click...');

        // Simulate clicking the first choice
        const firstChoice = fragmentChoices[0];
        console.log('First choice data-choice:', firstChoice.dataset.choice);
        console.log('First choice class:', firstChoice.className);

        // Create and dispatch click event
        const clickEvent = new Event('click', { bubbles: true });
        firstChoice.dispatchEvent(clickEvent);

        console.log('After click - First choice class:', firstChoice.className);
      }

      return {
        fragmentChoicesCount: fragmentChoices.length,
        beginButtonExists: !!beginBtn,
        beginButtonDisabled: beginBtn ? beginBtn.disabled : null
      };
    });

    console.log('Event info:', eventInfo);

    // Now try clicking with Puppeteer
    console.log('🎯 Testing Puppeteer clicks...');

    await page.click('button[data-choice="dust-road"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check state after Puppeteer click
    const afterClick = await page.evaluate(() => {
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');
      const beginBtn = document.getElementById('begin-cultivation');

      return {
        dustRoadClass: dustRoadBtn ? dustRoadBtn.className : null,
        beginBtnDisabled: beginBtn ? beginBtn.disabled : null
      };
    });

    console.log('After Puppeteer click:', afterClick);

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