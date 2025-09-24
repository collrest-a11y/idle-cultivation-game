const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing polling debug...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for our debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CHARACTER DEBUG:') || text.includes('POLLING DEBUG:')) {
        console.log('BROWSER:', text);
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Add debug logging to the polling function
    await page.evaluate(() => {
      // Override the checkButtonStates function to add debug logging
      if (window.checkButtonStates) {
        const originalCheck = window.checkButtonStates;
        window.checkButtonStates = function() {
          console.log('POLLING DEBUG: Checking button states...');

          // Debug the selectors
          const originActive = document.querySelector('[data-category="origin"] .fragment-choice.active');
          const vowActive = document.querySelector('[data-category="vow"] .fragment-choice.active');
          const markActive = document.querySelector('[data-category="mark"] .fragment-choice.active');

          console.log('POLLING DEBUG: originActive:', originActive ? originActive.dataset.choice : 'none');
          console.log('POLLING DEBUG: vowActive:', vowActive ? vowActive.dataset.choice : 'none');
          console.log('POLLING DEBUG: markActive:', markActive ? markActive.dataset.choice : 'none');

          return originalCheck();
        };
      }
    });

    console.log('🎯 Testing single button click...');

    // Click one button and see what happens
    await page.click('button[data-choice="dust-road"]');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check what the polling function sees
    const debugResult = await page.evaluate(() => {
      // Check the state manually
      const originActive = document.querySelector('[data-category="origin"] .fragment-choice.active');
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');

      return {
        dustRoadClass: dustRoadBtn ? dustRoadBtn.className : null,
        originActiveFound: !!originActive,
        originActiveChoice: originActive ? originActive.dataset.choice : null,
        allOriginButtons: Array.from(document.querySelectorAll('[data-category="origin"] .fragment-choice')).map(btn => ({
          choice: btn.dataset.choice,
          class: btn.className,
          active: btn.classList.contains('active')
        }))
      };
    });

    console.log('Debug result:', debugResult);

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