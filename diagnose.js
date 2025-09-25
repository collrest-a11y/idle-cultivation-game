const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--allow-file-access-from-files']
    });

    const page = await browser.newPage();

    // Inject error tracking before page loads
    await page.evaluateOnNewDocument(() => {
        window.gameErrors = [];
        const originalConsoleError = console.error;
        console.error = function(...args) {
            window.gameErrors.push(args.join(' '));
            originalConsoleError.apply(console, args);
        };
    });

    page.on('pageerror', error => {
        console.log('=== PAGE ERROR ===');
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);
        console.log('==================');
    });

    const filePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
    await page.goto(filePath);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get errors
    const errors = await page.evaluate(() => window.gameErrors);

    if (errors && errors.length > 0) {
        console.log('\n=== Game Errors ===');
        errors.forEach((err, i) => {
            console.log(`[${i+1}] ${err}`);
        });
    }

    await browser.close();
})();