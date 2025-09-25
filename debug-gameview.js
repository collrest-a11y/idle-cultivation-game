const puppeteer = require('puppeteer');
const path = require('path');

async function debugGameView() {
    console.log('Debugging GameView render errors...\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true
    });

    try {
        const page = await browser.newPage();

        // Capture detailed error information
        page.on('console', async msg => {
            const text = msg.text();
            if (text.includes('GameView') && text.includes('Render failed')) {
                console.log('GameView Error:', text);

                // Try to get the actual error
                const args = await Promise.all(msg.args().map(arg =>
                    arg.jsonValue().catch(() => arg.toString())
                ));

                if (args.length > 1) {
                    console.log('Error details:', args[1]);
                }
            }
        });

        page.on('pageerror', error => {
            if (error.message.includes('GameView')) {
                console.log('Page error:', error.message);
                console.log('Stack:', error.stack);
            }
        });

        const gamePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
        await page.goto(gamePath);

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check GameView state
        const viewInfo = await page.evaluate(() => {
            const results = {};

            // Check if GameView class exists
            results.GameViewClass = typeof window.GameView;

            // Check if MainMenuView exists
            results.MainMenuViewClass = typeof window.MainMenuView;

            // Check ViewManager
            if (window.ViewManager) {
                results.ViewManagerClass = 'exists';
                if (window.viewManager) {
                    results.viewManagerInstance = 'exists';
                    results.currentView = window.viewManager.currentView;
                    results.views = Object.keys(window.viewManager.views || {});
                }
            }

            // Check for game container
            results.gameContainer = !!document.getElementById('game-container');
            results.gameView = !!document.getElementById('gameView');

            // Check what's in gameView
            const gameViewEl = document.getElementById('gameView');
            if (gameViewEl) {
                results.gameViewHTML = gameViewEl.innerHTML.substring(0, 200);
                results.gameViewChildren = gameViewEl.children.length;
            }

            // Try to get the error from GameView
            if (window.gameView) {
                results.gameViewInstance = 'exists';
                try {
                    // Try to render manually
                    if (window.gameView.render) {
                        window.gameView.render();
                        results.renderAttempt = 'success';
                    }
                } catch (e) {
                    results.renderAttempt = 'failed';
                    results.renderError = e.message;
                    results.renderStack = e.stack;
                }
            }

            return results;
        });

        console.log('\n=== GameView Debug Info ===');
        if (viewInfo) {
            console.log('GameView class:', viewInfo.GameViewClass);
            console.log('MainMenuView class:', viewInfo.MainMenuViewClass);
            console.log('ViewManager:', viewInfo.ViewManagerClass);
            console.log('viewManager instance:', viewInfo.viewManagerInstance);
            console.log('Current view:', viewInfo.currentView);
            console.log('Available views:', viewInfo.views);
            console.log('Game container:', viewInfo.gameContainer);
            console.log('Game view element:', viewInfo.gameView);
            console.log('Game view children:', viewInfo.gameViewChildren);
        } else {
            console.log('Failed to get view info');
        }

        if (viewInfo.renderError) {
            console.log('\n=== Render Error ===');
            console.log('Error:', viewInfo.renderError);
            console.log('Stack:', viewInfo.renderStack);
        }

        console.log('\nKeeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 15000));

    } finally {
        await browser.close();
    }
}

debugGameView().catch(console.error);