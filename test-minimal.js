const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Minimal test for event listeners...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Only listen for our specific debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CHARACTER DEBUG:') || text.includes('CLICK DEBUG:') || text.includes('EVENT DEBUG:')) {
        console.log('BROWSER:', text);
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Inject debugging code to see what's happening
    await page.evaluate(() => {
      console.log('CHARACTER DEBUG: Injecting debug code...');

      // Check if DOMContentLoaded has fired
      console.log('CHARACTER DEBUG: Document ready state:', document.readyState);

      // Check if our elements exist
      const fragmentChoices = document.querySelectorAll('.fragment-choice');
      const beginBtn = document.getElementById('begin-cultivation');
      const charCreation = document.getElementById('character-creation');

      console.log('CHARACTER DEBUG: Fragment choices found:', fragmentChoices.length);
      console.log('CHARACTER DEBUG: Begin button found:', !!beginBtn);
      console.log('CHARACTER DEBUG: Character creation found:', !!charCreation);

      if (beginBtn) {
        console.log('CHARACTER DEBUG: Begin button disabled:', beginBtn.disabled);
      }

      // Try to manually add a simple click listener to test
      if (fragmentChoices.length > 0) {
        const testButton = fragmentChoices[0];
        console.log('CHARACTER DEBUG: Adding test listener to first button:', testButton.dataset.choice);

        testButton.addEventListener('click', (e) => {
          console.log('CLICK DEBUG: Test listener fired! Choice:', testButton.dataset.choice);
          e.stopPropagation();
        });

        // Also try to trigger it manually
        console.log('CHARACTER DEBUG: Triggering test click...');
        testButton.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🎯 Testing actual button clicks...');

    // Try clicking with Puppeteer
    await page.click('button[data-choice="dust-road"]');
    console.log('✅ Clicked dust-road button');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if anything changed
    const result = await page.evaluate(() => {
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');
      return {
        dustRoadClass: dustRoadBtn ? dustRoadBtn.className : null,
        dustRoadActive: dustRoadBtn ? dustRoadBtn.classList.contains('active') : false
      };
    });

    console.log('Result after click:', result);

    // Keep browser open for inspection
    console.log('\n🔍 Browser will stay open for 8 seconds...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    await browser.close();
    console.log('✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();