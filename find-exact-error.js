const puppeteer = require('puppeteer');
const path = require('path');

async function findError() {
    console.log('Finding exact error location...\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true
    });

    try {
        const page = await browser.newPage();

        // Enable detailed console logging
        await page.evaluateOnNewDocument(() => {
            // Override console.error to get stack traces
            const originalError = console.error;
            console.error = function(...args) {
                const stack = new Error().stack;
                originalError.apply(console, [...args, '\nSTACK:', stack]);
            };
        });

        // Capture detailed error info
        page.on('console', async msg => {
            if (msg.type() === 'error') {
                const text = msg.text();

                if (text.includes("reading 'name'")) {
                    console.log('=' .repeat(60));
                    console.log('FOUND THE ERROR!');
                    console.log('=' .repeat(60));
                    console.log('Error text:', text);

                    // Try to get more details
                    const args = await Promise.all(msg.args().map(arg =>
                        arg.jsonValue().catch(() => arg.toString())
                    ));

                    console.log('\nArguments:', args);

                    // Get the stack trace
                    if (args.length > 0) {
                        const stackIndex = args.findIndex(arg =>
                            typeof arg === 'string' && arg.includes('STACK:')
                        );
                        if (stackIndex !== -1) {
                            console.log('\nStack trace:');
                            console.log(args[stackIndex]);
                        }
                    }

                    console.log('\nLocation:', msg.location());
                }
            }
        });

        page.on('pageerror', error => {
            if (error.message.includes("reading 'name'")) {
                console.log('=' .repeat(60));
                console.log('PAGE ERROR WITH NAME ACCESS!');
                console.log('=' .repeat(60));
                console.log('Message:', error.message);
                console.log('\nStack:', error.stack);
            }
        });

        // Load the page
        const gamePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
        await page.goto(gamePath);

        // Wait to capture errors
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Also check in console
        const result = await page.evaluate(() => {
            // Try to trigger the error if it hasn't occurred yet
            if (window.game) {
                try {
                    // Try to access things that might cause the error
                    if (window.game.moduleManager) {
                        console.log('ModuleManager exists');
                    }
                    if (window.game._validateCoreSystemsReady) {
                        console.log('Trying to validate core systems...');
                        // Don't actually call it, just check it exists
                    }
                } catch (e) {
                    return {
                        error: true,
                        message: e.message,
                        stack: e.stack
                    };
                }
            }
            return { error: false };
        });

        if (result.error) {
            console.log('\nError caught in evaluate:');
            console.log('Message:', result.message);
            console.log('Stack:', result.stack);
        }

        console.log('\nWaiting 10 seconds for any additional errors...');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } finally {
        await browser.close();
    }
}

findError().catch(console.error);