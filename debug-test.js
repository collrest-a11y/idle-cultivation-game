const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      devtools: true
    });
    const page = await browser.newPage();

    // Enable console logging with better error details
    page.on('console', msg => {
      const args = msg.args();
      if (args.length > 0) {
        Promise.all(args.map(arg => {
          try {
            return arg.jsonValue();
          } catch (error) {
            return arg.toString();
          }
        })).then(values => {
          console.log('CONSOLE:', ...values);
        });
      } else {
        console.log('CONSOLE:', msg.text());
      }
    });

    // Listen for all errors with stack traces
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.name, error.message);
      console.log('Stack:', error.stack);
    });

    page.on('error', error => {
      console.log('❌ ERROR:', error.message);
    });

    const indexPath = path.join(__dirname, 'index.html');
    console.log('🚀 Loading game with detailed debugging...');

    await page.goto(`file://${indexPath}`);
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Try to see what errors we can capture
    const errors = await page.evaluate(() => {
      return window.gameErrors || [];
    });

    console.log('Captured errors:', errors);

    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
})();