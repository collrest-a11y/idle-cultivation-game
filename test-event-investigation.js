const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Investigating event handling...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for ALL console messages to see everything
    page.on('console', msg => {
      console.log('BROWSER:', msg.text());
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Add comprehensive debugging
    await page.evaluate(() => {
      console.log('EVENT DEBUG: Adding comprehensive debugging...');

      // Check all event listeners on the first button
      const firstButton = document.querySelector('button[data-choice="dust-road"]');
      if (firstButton) {
        console.log('EVENT DEBUG: Found first button:', firstButton.dataset.choice);

        // Override addEventListener to see what's being added
        const originalAddEventListener = firstButton.addEventListener;
        firstButton.addEventListener = function(type, listener, options) {
          console.log('EVENT DEBUG: addEventListener called for', type);
          return originalAddEventListener.call(this, type, listener, options);
        };

        // Add a capturing listener to see if events are being stopped
        firstButton.addEventListener('click', (e) => {
          console.log('EVENT DEBUG: Capturing click listener fired');
          console.log('EVENT DEBUG: Event target:', e.target.dataset.choice);
          console.log('EVENT DEBUG: Event stopped?', e.defaultPrevented);
        }, true);

        // Add a regular listener
        firstButton.addEventListener('click', (e) => {
          console.log('EVENT DEBUG: Regular click listener fired');
        }, false);
      }
    });

    console.log('🎯 Testing single button click...');

    // Click the button
    await page.click('button[data-choice="dust-road"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check what happened
    const result = await page.evaluate(() => {
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');
      return {
        hasActiveClass: dustRoadBtn ? dustRoadBtn.classList.contains('active') : false,
        className: dustRoadBtn ? dustRoadBtn.className : null
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