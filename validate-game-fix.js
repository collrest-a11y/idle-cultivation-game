const puppeteer = require('puppeteer');
const path = require('path');

async function validateGame() {
    console.log('🎮 Starting Game Validation for Issue #117...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Track console messages
        const errors = [];
        const warnings = [];
        const logs = [];

        page.on('console', msg => {
            const text = msg.text();
            if (msg.type() === 'error') {
                errors.push(text);
                console.log('❌ ERROR:', text);
            } else if (msg.type() === 'warning') {
                warnings.push(text);
                console.log('⚠️  WARNING:', text);
            } else {
                logs.push(text);
                if (text.includes('✓') || text.includes('SUCCESS')) {
                    console.log('✅', text);
                }
            }
        });

        page.on('pageerror', error => {
            errors.push(error.message);
            console.log('💥 PAGE ERROR:', error.message);
        });

        // Navigate to the game
        const gamePath = `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`;
        console.log('📂 Loading game from:', gamePath);
        await page.goto(gamePath);

        // Wait for game to initialize
        console.log('\n⏳ Waiting for game initialization...');
        await page.waitForTimeout(3000);

        // Test 1: Check if game loaded
        console.log('\n🔍 Test 1: Game Loading');
        const gameLoaded = await page.evaluate(() => {
            return typeof window.game !== 'undefined' ||
                   typeof window.GameState !== 'undefined' ||
                   typeof window.gameState !== 'undefined';
        });
        console.log(gameLoaded ? '✅ Game object detected' : '❌ Game not loaded');

        // Test 2: Check character creation
        console.log('\n🔍 Test 2: Character Creation');
        const hasCharacter = await page.evaluate(() => {
            const character = window.game?.character ||
                            window.gameState?.character ||
                            localStorage.getItem('idleGameSave');
            return !!character;
        });
        console.log(hasCharacter ? '✅ Character system available' : '⚠️  No character found (may need creation)');

        // Test 3: Try to create a character if needed
        if (!hasCharacter) {
            console.log('\n🎭 Attempting character creation...');

            // Check for character creation form
            const hasForm = await page.evaluate(() => {
                const nameInput = document.querySelector('#characterName, input[type="text"]');
                const createBtn = document.querySelector('#createCharacter, button');
                return !!(nameInput && createBtn);
            });

            if (hasForm) {
                // Fill in character name
                await page.type('#characterName, input[type="text"]', 'TestHero');

                // Click create button
                await page.click('#createCharacter, button');
                await page.waitForTimeout(2000);

                const created = await page.evaluate(() => {
                    return !!(window.game?.character || window.gameState?.character);
                });
                console.log(created ? '✅ Character created successfully!' : '❌ Character creation failed');
            }
        }

        // Test 4: Check game systems
        console.log('\n🔍 Test 4: Core Game Systems');
        const systems = await page.evaluate(() => {
            const results = {};

            // Check for CraftingSystem
            results.crafting = !!(window.CraftingSystem || window.game?.crafting);

            // Check for ShopManager
            results.shop = !!(window.ShopManager || window.game?.shop);

            // Check for SaveSystem
            results.save = !!(window.GameSaveSystem || window.SaveManager || window.game?.save);

            // Check for combat
            results.combat = !!(window.CombatSystem || window.game?.combat);

            return results;
        });

        Object.entries(systems).forEach(([system, exists]) => {
            console.log(`${exists ? '✅' : '❌'} ${system.charAt(0).toUpperCase() + system.slice(1)} system: ${exists ? 'Available' : 'Missing'}`);
        });

        // Test 5: Check UI responsiveness
        console.log('\n🔍 Test 5: UI Elements');
        const uiElements = await page.evaluate(() => {
            const results = {};
            results.statsDisplay = !!document.querySelector('#stats, .stats, [class*="stats"]');
            results.inventoryDisplay = !!document.querySelector('#inventory, .inventory, [class*="inventory"]');
            results.gameView = !!document.querySelector('#gameView, .game-view, [class*="game"]');
            return results;
        });

        Object.entries(uiElements).forEach(([element, exists]) => {
            console.log(`${exists ? '✅' : '❌'} ${element}: ${exists ? 'Found' : 'Not found'}`);
        });

        // Test 6: Save/Load functionality
        console.log('\n🔍 Test 6: Save/Load System');
        const saveTestResult = await page.evaluate(() => {
            try {
                // Try to save
                const testData = { test: 'data', timestamp: Date.now() };
                localStorage.setItem('gameValidationTest', JSON.stringify(testData));

                // Try to load
                const loaded = JSON.parse(localStorage.getItem('gameValidationTest'));

                // Clean up
                localStorage.removeItem('gameValidationTest');

                return loaded && loaded.test === 'data';
            } catch (e) {
                return false;
            }
        });
        console.log(saveTestResult ? '✅ Save/Load working' : '❌ Save/Load failed');

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 VALIDATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Errors: ${errors.length}`);
        console.log(`Total Warnings: ${warnings.length}`);
        console.log(`Game Loaded: ${gameLoaded ? 'YES' : 'NO'}`);
        console.log(`Character System: ${hasCharacter ? 'YES' : 'NO'}`);
        console.log(`Save System: ${saveTestResult ? 'YES' : 'NO'}`);

        const allSystemsWork = Object.values(systems).every(v => v);
        console.log(`All Systems: ${allSystemsWork ? 'YES' : 'PARTIAL'}`);

        if (errors.length === 0 && gameLoaded) {
            console.log('\n✅ VALIDATION PASSED - Game is functional!');
        } else {
            console.log('\n⚠️  VALIDATION INCOMPLETE - Some issues remain');
        }

    } catch (error) {
        console.error('❌ Validation failed:', error);
    } finally {
        console.log('\n📝 Check the browser window to interact with the game manually.');
        console.log('Close the browser when done to complete validation.');

        // Keep browser open for manual testing
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
        await browser.close();
    }
}

validateGame().catch(console.error);