const puppeteer = require('puppeteer');
const path = require('path');

async function quickValidation() {
    console.log('🔍 Quick Game Validation\n');

    const browser = await puppeteer.launch({
        headless: true
    });

    try {
        const page = await browser.newPage();

        // Collect all console messages
        const logs = [];
        const errors = [];

        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                errors.push(text);
                if (!text.includes('404') && !text.includes('favicon')) {
                    console.log('❌', text);
                }
            }
        });

        page.on('pageerror', error => {
            errors.push(error.message);
            console.log('💥 Page Error:', error.message);
        });

        const gamePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
        await page.goto(gamePath, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check game state
        const gameState = await page.evaluate(() => {
            const results = {
                hasGame: typeof window.game !== 'undefined',
                gameInitialized: window.game?.initialized || false,
                hasCharacter: false,
                currentView: 'unknown',
                modules: [],
                ui: {
                    hasContainer: !!document.getElementById('game-container'),
                    hasGameView: !!document.getElementById('gameView'),
                    visibleElements: []
                }
            };

            // Check character
            if (window.game?.gameState) {
                results.hasCharacter = !!window.game.gameState.get('player');
            }

            // Check current view
            if (window.viewManager) {
                results.currentView = window.viewManager.currentView || 'none';
            }

            // Check loaded modules
            if (window.ModuleManager?.modules) {
                results.modules = Object.keys(window.ModuleManager.modules);
            }

            // Check visible elements
            const gameView = document.getElementById('gameView');
            if (gameView && gameView.children.length > 0) {
                for (let child of gameView.children) {
                    if (child.style.display !== 'none' && child.offsetHeight > 0) {
                        results.ui.visibleElements.push({
                            tag: child.tagName,
                            id: child.id,
                            class: child.className
                        });
                    }
                }
            }

            // Check for main menu
            const mainMenu = document.querySelector('.main-menu-container');
            if (mainMenu) {
                results.ui.hasMainMenu = true;
                results.ui.mainMenuVisible = mainMenu.style.display !== 'none';
            }

            return results;
        });

        console.log('\n📊 GAME STATE:');
        console.log('✅ Game Object:', gameState.hasGame ? 'EXISTS' : 'MISSING');
        console.log('✅ Initialized:', gameState.gameInitialized ? 'YES' : 'NO');
        console.log('👤 Character:', gameState.hasCharacter ? 'EXISTS' : 'NONE');
        console.log('🖼️ Current View:', gameState.currentView);

        console.log('\n📦 LOADED MODULES:', gameState.modules.length);
        if (gameState.modules.length > 0) {
            gameState.modules.forEach(mod => console.log('  -', mod));
        }

        console.log('\n🎨 UI STATE:');
        console.log('Container:', gameState.ui.hasContainer ? '✅' : '❌');
        console.log('GameView:', gameState.ui.hasGameView ? '✅' : '❌');
        console.log('Main Menu:', gameState.ui.hasMainMenu ? '✅' : '❌');
        console.log('Visible Elements:', gameState.ui.visibleElements.length);

        if (gameState.ui.visibleElements.length > 0) {
            console.log('\nVisible UI Components:');
            gameState.ui.visibleElements.forEach(el => {
                console.log(`  - ${el.tag}${el.id ? '#' + el.id : ''}${el.class ? '.' + el.class : ''}`);
            });
        }

        // Test character creation if no character
        if (!gameState.hasCharacter) {
            console.log('\n🎮 TESTING CHARACTER CREATION...');

            const canCreate = await page.evaluate(() => {
                // Check if character creation is available
                if (window.characterCreation) {
                    try {
                        // Try to show the modal
                        window.characterCreation.showModal();
                        return 'modal-shown';
                    } catch (e) {
                        return 'error: ' + e.message;
                    }
                }

                // Check for create character button
                const buttons = Array.from(document.querySelectorAll('button'));
                const createBtn = buttons.find(b =>
                    b.textContent.toLowerCase().includes('create') ||
                    b.textContent.toLowerCase().includes('new')
                );

                if (createBtn) {
                    createBtn.click();
                    return 'button-clicked';
                }

                return 'no-creation-available';
            });

            console.log('Character Creation:', canCreate);
        }

        console.log('\n📈 SUMMARY:');
        const status = gameState.hasGame && gameState.gameInitialized;
        console.log(status ? '✅ GAME IS RUNNING' : '❌ GAME NOT RUNNING');
        console.log('Errors Found:', errors.length);

        if (errors.length > 0 && errors.length <= 5) {
            console.log('\nFirst Few Errors:');
            errors.slice(0, 5).forEach(e => console.log('  -', e.substring(0, 100)));
        }

    } finally {
        await browser.close();
    }
}

quickValidation().catch(console.error);