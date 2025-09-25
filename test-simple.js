const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--allow-file-access-from-files']
    });

    const page = await browser.newPage();

    page.on('console', msg => console.log(`[${msg.type()}]:`, msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

    const filePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;

    await page.goto(filePath);

    // Get detailed error info
    const errors = await page.evaluate(() => {
        return window.gameErrors || [];
    });

    console.log('Errors found:', errors);

    // Check game state
    const gameState = await page.evaluate(() => {
        return {
            safeMode: window.safeMode ? 'exists' : 'missing',
            progressiveLoader: window.progressiveLoader ? 'exists' : 'missing',
            loadingProgress: window.loadingProgress ? 'exists' : 'missing',
            game: window.game ? 'exists' : 'missing'
        };
    });

    console.log('Game state:', gameState);
})();