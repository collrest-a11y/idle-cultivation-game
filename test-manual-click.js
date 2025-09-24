const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing manual click triggers...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for our debug messages
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CHARACTER DEBUG:') || text.includes('MANUAL DEBUG:')) {
        console.log('BROWSER:', text);
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load and handlers to be set up
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🎯 Testing manual onclick trigger...');

    // Try to manually trigger the onclick function
    const result = await page.evaluate(() => {
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');
      console.log('MANUAL DEBUG: Found button:', !!dustRoadBtn);
      console.log('MANUAL DEBUG: Button has onclick:', typeof dustRoadBtn.onclick);

      if (dustRoadBtn && dustRoadBtn.onclick) {
        console.log('MANUAL DEBUG: Manually calling onclick...');
        dustRoadBtn.onclick({
          preventDefault: () => console.log('MANUAL DEBUG: preventDefault called')
        });

        // Check if active class was added
        return {
          hasActiveClass: dustRoadBtn.classList.contains('active'),
          className: dustRoadBtn.className
        };
      } else {
        return { error: 'Button or onclick not found' };
      }
    });

    console.log('Manual onclick result:', result);

    // Also try clicking with Puppeteer but force the click
    console.log('🎯 Testing forced Puppeteer click...');

    await page.evaluate(() => {
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');
      if (dustRoadBtn) {
        console.log('MANUAL DEBUG: Forcing click event...');
        dustRoadBtn.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const afterForcedClick = await page.evaluate(() => {
      const dustRoadBtn = document.querySelector('button[data-choice="dust-road"]');
      return {
        hasActiveClass: dustRoadBtn ? dustRoadBtn.classList.contains('active') : false,
        className: dustRoadBtn ? dustRoadBtn.className : null
      };
    });

    console.log('After forced click:', afterForcedClick);

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