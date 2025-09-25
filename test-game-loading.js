const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('🎮 Testing game loading...');
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--allow-file-access-from-files']
    });

    const page = await browser.newPage();

    // Capture console logs
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.error('❌ PAGE ERROR:', text);
        } else if (type === 'warning') {
            console.warn('⚠️ PAGE WARNING:', text);
        } else {
            console.log(`📄 [${type}]:`, text);
        }
    });

    // Capture page errors
    page.on('pageerror', error => {
        console.error('🔴 PAGE CRASH:', error.message);
    });

    const filePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
    console.log('Loading:', filePath);

    try {
        await page.goto(filePath, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait a bit for any initialization
        await page.waitForTimeout(3000);

        // Check what's visible
        const loadingVisible = await page.$eval('#loading-screen', el =>
            !el.classList.contains('hidden')
        ).catch(() => false);

        const errorVisible = await page.$eval('#error-display', el =>
            !el.classList.contains('hidden')
        ).catch(() => false);

        const gameVisible = await page.$eval('#app', el =>
            el.style.display !== 'none' && el.offsetParent !== null
        ).catch(() => false);

        const characterCreationVisible = await page.$eval('#character-creation', el =>
            el.style.display === 'block'
        ).catch(() => false);

        // Check for any error text
        const errorText = await page.$eval('.error-message', el => el.textContent).catch(() => null);
        const bodyText = await page.$eval('body', el => el.innerText).catch(() => '');

        console.log('\n📊 Game State:');
        console.log('- Loading Screen:', loadingVisible ? '✓ Visible' : '✗ Hidden');
        console.log('- Error Display:', errorVisible ? '✓ Visible' : '✗ Hidden');
        console.log('- Game App:', gameVisible ? '✓ Visible' : '✗ Hidden');
        console.log('- Character Creation:', characterCreationVisible ? '✓ Visible' : '✗ Hidden');

        if (errorText) {
            console.log('\n❌ Error Message:', errorText);
        }

        if (!loadingVisible && !errorVisible && !gameVisible && !characterCreationVisible) {
            console.log('\n🔴 BLANK PAGE DETECTED!');
            console.log('Body text:', bodyText.substring(0, 500));
        }

        // Check for JavaScript errors in console
        const logs = await page.evaluate(() => {
            return window.consoleErrors || [];
        });

        if (logs.length > 0) {
            console.log('\n❌ JavaScript Errors Found:', logs);
        }

    } catch (error) {
        console.error('Failed to load page:', error);
    }

    console.log('\n⏸️ Keeping browser open for inspection...');
    // Don't close browser so we can inspect
})();