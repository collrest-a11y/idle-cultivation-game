const puppeteer = require('puppeteer');
const path = require('path');

async function runValidation() {
    console.log('='.repeat(60));
    console.log('STARTING REAL GAME VALIDATION');
    console.log('='.repeat(60));

    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Collect ALL errors and warnings
        const errors = [];
        const warnings = [];
        const logs = [];

        page.on('console', msg => {
            const text = msg.text();
            const type = msg.type();

            if (type === 'error') {
                errors.push({
                    text,
                    location: msg.location(),
                    args: msg.args()
                });
                console.log('❌ ERROR:', text);
            } else if (type === 'warning') {
                warnings.push(text);
                console.log('⚠️  WARNING:', text);
            } else {
                logs.push(text);
                if (text.includes('✓') || text.includes('SUCCESS') || text.includes('initialized')) {
                    console.log('📝', text);
                }
            }
        });

        page.on('pageerror', error => {
            errors.push({
                text: error.message,
                stack: error.stack
            });
            console.log('💥 PAGE ERROR:', error.message);
        });

        // Navigate to game
        const gamePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
        console.log('\n📂 Loading:', gamePath);

        await page.goto(gamePath, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for potential initialization
        console.log('\n⏳ Waiting for initialization...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Test 1: Basic page load
        console.log('\n' + '='.repeat(40));
        console.log('TEST 1: BASIC PAGE LOAD');
        console.log('='.repeat(40));

        const title = await page.title();
        console.log('Page title:', title);

        const hasContent = await page.evaluate(() => {
            return document.body && document.body.innerHTML.length > 0;
        });
        console.log('Has content:', hasContent ? 'YES' : 'NO');

        // Test 2: Check for game objects
        console.log('\n' + '='.repeat(40));
        console.log('TEST 2: GAME OBJECTS');
        console.log('='.repeat(40));

        const gameObjects = await page.evaluate(() => {
            const checks = {
                game: typeof window.game,
                GameState: typeof window.GameState,
                gameState: typeof window.gameState,
                GameManager: typeof window.GameManager,
                ErrorManager: typeof window.ErrorManager,
                EventManager: typeof window.EventManager,
                ModuleManager: typeof window.ModuleManager,
                CraftingSystem: typeof window.CraftingSystem,
                ShopManager: typeof window.ShopManager,
                GameSaveSystem: typeof window.GameSaveSystem
            };
            return checks;
        });

        for (const [obj, type] of Object.entries(gameObjects)) {
            const status = type !== 'undefined' ? '✅' : '❌';
            console.log(`${status} ${obj}: ${type}`);
        }

        // Test 3: Check UI elements
        console.log('\n' + '='.repeat(40));
        console.log('TEST 3: UI ELEMENTS');
        console.log('='.repeat(40));

        const uiElements = await page.evaluate(() => {
            const elements = {
                gameContainer: document.getElementById('game-container'),
                gameView: document.getElementById('gameView'),
                mainMenu: document.querySelector('.main-menu'),
                characterCreation: document.querySelector('#characterCreation'),
                characterName: document.querySelector('#characterName'),
                createButton: document.querySelector('#createCharacter'),
                statsDisplay: document.querySelector('#stats, .stats'),
                inventoryDisplay: document.querySelector('#inventory, .inventory'),
                anyButton: document.querySelectorAll('button').length,
                anyInput: document.querySelectorAll('input').length
            };

            const results = {};
            for (const [name, element] of Object.entries(elements)) {
                if (name === 'anyButton' || name === 'anyInput') {
                    results[name] = element;
                } else {
                    results[name] = !!element;
                }
            }
            return results;
        });

        for (const [element, exists] of Object.entries(uiElements)) {
            if (typeof exists === 'number') {
                console.log(`${exists > 0 ? '✅' : '❌'} ${element}: ${exists}`);
            } else {
                console.log(`${exists ? '✅' : '❌'} ${element}: ${exists ? 'Found' : 'Not found'}`);
            }
        }

        // Test 4: Try character creation
        console.log('\n' + '='.repeat(40));
        console.log('TEST 4: CHARACTER CREATION');
        console.log('='.repeat(40));

        // Check if we need to create a character
        const needsCharacter = await page.evaluate(() => {
            const nameInput = document.querySelector('#characterName');
            const createBtn = document.querySelector('#createCharacter');
            return !!(nameInput && createBtn);
        });

        if (needsCharacter) {
            console.log('Character creation form found, attempting to create...');

            // Type character name
            await page.type('#characterName', 'TestHero');
            console.log('✓ Typed character name');

            // Click create button
            await page.click('#createCharacter');
            console.log('✓ Clicked create button');

            // Wait for potential character creation
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Check if character was created
            const hasCharacter = await page.evaluate(() => {
                return !!(window.game?.character ||
                         window.gameState?.character ||
                         localStorage.getItem('idleGameSave'));
            });

            console.log(hasCharacter ? '✅ Character created!' : '❌ Character creation failed');
        } else {
            console.log('No character creation form found');

            // Check if character exists
            const hasCharacter = await page.evaluate(() => {
                return !!(window.game?.character ||
                         window.gameState?.character ||
                         localStorage.getItem('idleGameSave'));
            });
            console.log('Character exists:', hasCharacter ? 'YES' : 'NO');
        }

        // Test 5: Check localStorage
        console.log('\n' + '='.repeat(40));
        console.log('TEST 5: LOCAL STORAGE');
        console.log('='.repeat(40));

        const storageInfo = await page.evaluate(() => {
            const keys = Object.keys(localStorage);
            const saveData = localStorage.getItem('idleGameSave');
            let saveSize = 0;
            let hasValidSave = false;

            if (saveData) {
                saveSize = saveData.length;
                try {
                    const parsed = JSON.parse(saveData);
                    hasValidSave = true;
                } catch (e) {
                    hasValidSave = false;
                }
            }

            return {
                keyCount: keys.length,
                keys: keys.slice(0, 10), // First 10 keys
                hasSaveData: !!saveData,
                saveSize,
                hasValidSave
            };
        });

        console.log('Storage keys:', storageInfo.keyCount);
        console.log('Has save data:', storageInfo.hasSaveData ? 'YES' : 'NO');
        if (storageInfo.hasSaveData) {
            console.log('Save size:', storageInfo.saveSize, 'bytes');
            console.log('Valid JSON:', storageInfo.hasValidSave ? 'YES' : 'NO');
        }
        console.log('Keys:', storageInfo.keys.join(', '));

        // SUMMARY
        console.log('\n' + '='.repeat(60));
        console.log('VALIDATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Errors: ${errors.length}`);
        console.log(`Total Warnings: ${warnings.length}`);
        console.log(`Total Logs: ${logs.length}`);

        if (errors.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            errors.slice(0, 10).forEach((err, i) => {
                console.log(`${i + 1}. ${err.text}`);
                if (err.stack) {
                    console.log('   Stack:', err.stack.split('\n')[0]);
                }
            });
            if (errors.length > 10) {
                console.log(`... and ${errors.length - 10} more errors`);
            }
        }

        // Determine pass/fail
        const passed = errors.length === 0 && hasContent;
        console.log('\n' + '='.repeat(60));
        console.log(passed ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED');
        console.log('='.repeat(60));

        // Keep browser open for 10 seconds to observe
        console.log('\nBrowser will close in 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('❌ Validation script error:', error);
    } finally {
        await browser.close();
        process.exit(0);
    }
}

runValidation().catch(console.error);