const puppeteer = require('puppeteer');
const path = require('path');

async function debugSaveError() {
    console.log('Debugging SaveManager validation errors...\n');

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true
    });

    try {
        const page = await browser.newPage();

        // Capture SaveManager errors specifically
        page.on('console', async msg => {
            const text = msg.text();
            if (text.includes('SaveManager') || text.includes('validation') || text.includes('invalid data')) {
                console.log('SaveManager Error:', text);

                // Get more details
                try {
                    const args = await Promise.all(msg.args().map(arg =>
                        arg.jsonValue().catch(() => arg.toString())
                    ));

                    if (args.length > 1) {
                        console.log('Error details:', args);
                    }
                } catch (e) {
                    // Ignore
                }
            }
        });

        const gamePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
        await page.goto(gamePath);

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check what SaveManager is trying to save
        const saveData = await page.evaluate(() => {
            // Check localStorage
            const keys = Object.keys(localStorage);
            const saveKey = keys.find(k => k.includes('Save') || k.includes('save'));

            // Try to get game state
            let gameStateData = null;
            if (window.game && window.game.gameState) {
                try {
                    gameStateData = window.game.gameState.getAll();
                } catch (e) {
                    gameStateData = { error: e.message };
                }
            }

            // Check SaveManager
            let saveManagerInfo = null;
            if (window.SaveManager) {
                saveManagerInfo = {
                    exists: true,
                    instance: !!window.saveManager
                };
            }

            // Check DataValidator
            let validatorInfo = null;
            if (window.DataValidator) {
                validatorInfo = {
                    exists: true,
                    instance: !!window.dataValidator,
                    methods: window.dataValidator ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.dataValidator)) : []
                };
            }

            return {
                localStorageKeys: keys,
                saveKey,
                savedData: saveKey ? localStorage.getItem(saveKey) : null,
                gameStateData,
                saveManagerInfo,
                validatorInfo
            };
        });

        console.log('\n=== Save System Debug Info ===');
        console.log('LocalStorage keys:', saveData.localStorageKeys);
        console.log('SaveManager:', saveData.saveManagerInfo);
        console.log('DataValidator:', saveData.validatorInfo);

        if (saveData.gameStateData) {
            console.log('GameState data keys:', Object.keys(saveData.gameStateData));
        }

        // Try to trigger a save
        console.log('\n=== Attempting to trigger save ===');
        const saveResult = await page.evaluate(() => {
            if (window.saveManager && window.saveManager.save) {
                try {
                    // Get the data that would be saved
                    const gameState = window.game?.gameState?.getAll() || {};
                    console.log('Data to save:', gameState);

                    // Try to save
                    const result = window.saveManager.save(gameState);
                    return { success: true, result };
                } catch (e) {
                    return { success: false, error: e.message, stack: e.stack };
                }
            } else {
                return { success: false, error: 'SaveManager not available' };
            }
        });

        console.log('Save attempt result:', saveResult);

        console.log('\nKeeping browser open for inspection...');
        await new Promise(resolve => setTimeout(resolve, 15000));

    } finally {
        await browser.close();
    }
}

debugSaveError().catch(console.error);