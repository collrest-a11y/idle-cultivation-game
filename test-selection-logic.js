const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Testing selection logic...');

    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('SELECTION DEBUG:') || msg.text().includes('ERROR')) {
        console.log('BROWSER:', msg.text());
      }
    });

    const indexPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${indexPath}`);

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Add debugging to the existing event handlers
    await page.evaluate(() => {
      // Add debugging to the global scope
      window.debugSelections = {
        origin: null,
        vow: null,
        mark: null
      };

      // Check if the event handlers are working by overriding them
      const fragmentChoices = document.querySelectorAll('.fragment-choice');
      console.log('SELECTION DEBUG: Found', fragmentChoices.length, 'fragment choices');

      fragmentChoices.forEach((button, index) => {
        const category = button.closest('.fragment-choices').dataset.category;
        const choice = button.dataset.choice;
        console.log(`SELECTION DEBUG: Button ${index} - category: "${category}", choice: "${choice}"`);

        // Add a test click handler
        button.addEventListener('click', (e) => {
          console.log(`SELECTION DEBUG: Clicked button with category: "${category}", choice: "${choice}"`);
          window.debugSelections[category] = choice;
          console.log('SELECTION DEBUG: Current selections:', window.debugSelections);

          // Check if all selections are made
          const allSelected = window.debugSelections.origin && window.debugSelections.vow && window.debugSelections.mark;
          console.log('SELECTION DEBUG: All selected?', allSelected);

          const beginBtn = document.getElementById('begin-cultivation');
          if (allSelected) {
            console.log('SELECTION DEBUG: Enabling begin button');
            beginBtn.disabled = false;
          } else {
            console.log('SELECTION DEBUG: Begin button still disabled');
          }
        });
      });
    });

    console.log('🎯 Testing click sequence...');

    // Test clicking each category
    await page.click('button[data-choice="dust-road"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.click('button[data-choice="protect"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.click('button[data-choice="thunder"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check final state
    const finalState = await page.evaluate(() => {
      const beginBtn = document.getElementById('begin-cultivation');
      return {
        debugSelections: window.debugSelections,
        beginBtnDisabled: beginBtn ? beginBtn.disabled : null,
        beginBtnClass: beginBtn ? beginBtn.className : null
      };
    });

    console.log('Final state:', finalState);

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