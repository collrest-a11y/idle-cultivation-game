const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--allow-file-access-from-files']
    });

    const page = await browser.newPage();

    page.on('console', msg => console.log(msg.text()));

    const filePath = `file:///${path.resolve(__dirname, 'validate-game.html').replace(/\\/g, '/')}`;
    await page.goto(filePath);

    await new Promise(resolve => setTimeout(resolve, 3000));

    await browser.close();
})();