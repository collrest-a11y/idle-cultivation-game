const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--allow-file-access-from-files']
    });

    const page = await browser.newPage();

    let errorCount = 0;
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            errorCount++;
            console.error(`[ERROR ${errorCount}]:`, text.substring(0, 200));
        }
    });

    const filePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
    console.log('Loading:', filePath);

    await page.goto(filePath);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check what's visible
    const isVisible = await page.evaluate(() => {
        const loading = document.querySelector('#loading-screen');
        const error = document.querySelector('#error-display');
        const charCreation = document.querySelector('#character-creation');
        const app = document.querySelector('#app');

        return {
            loading: loading && !loading.classList.contains('hidden'),
            error: error && !error.classList.contains('hidden'),
            charCreation: charCreation && charCreation.style.display === 'block',
            app: app && app.style.display !== 'none',
            bodyText: document.body.innerText.substring(0, 200)
        };
    });

    console.log('\n📊 Game State:');
    console.log('Loading Screen:', isVisible.loading ? '✓' : '✗');
    console.log('Error Display:', isVisible.error ? '✓' : '✗');
    console.log('Character Creation:', isVisible.charCreation ? '✓' : '✗');
    console.log('App Visible:', isVisible.app ? '✓' : '✗');
    console.log('Total Errors:', errorCount);

    if (!isVisible.loading && !isVisible.error && !isVisible.charCreation && !isVisible.app) {
        console.log('\n🔴 BLANK PAGE!');
        console.log('Body:', isVisible.bodyText);
    }

    console.log('\nKeeping browser open...');
})();