const puppeteer = require('puppeteer');

async function testRealGameFlow() {
    console.log('🔍 REAL GAME FLOW TEST - Testing actual gameplay\n');
    console.log('This test will attempt to:\n');
    console.log('1. Load the game');
    console.log('2. Create a character');
    console.log('3. Enter the game');
    console.log('4. Interact with game elements');
    console.log('5. Save and load');
    console.log('\n' + '='.repeat(60) + '\n');

    const browser = await puppeteer.launch({
        headless: false,  // Show browser so we can see what's happening
        slowMo: 100,      // Slow down actions so we can observe
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const results = {
        pageLoads: false,
        characterCreationVisible: false,
        canSelectOrigin: false,
        canSelectVow: false,
        canSelectMark: false,
        beginButtonEnabled: false,
        characterCreated: false,
        gameInterfaceShown: false,
        gameElementsPresent: false,
        errorsFound: []
    };

    try {
        const page = await browser.newPage();

        // Capture all console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                results.errorsFound.push(msg.text());
                console.log('❌ Console Error:', msg.text());
            }
        });

        page.on('pageerror', error => {
            results.errorsFound.push(error.toString());
            console.log('❌ Page Error:', error.toString());
        });

        // 1. Load the game
        console.log('📂 Step 1: Loading game...');
        await page.goto('http://localhost:8080/index.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        results.pageLoads = true;
        console.log('✅ Page loaded\n');

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Check what's visible
        console.log('👁️ Step 2: Checking initial state...');

        const initialState = await page.evaluate(() => {
            return {
                characterCreation: document.getElementById('character-creation'),
                gameInterface: document.getElementById('game-interface'),
                characterCreationVisible: document.getElementById('character-creation')?.style.display !== 'none',
                gameInterfaceVisible: document.getElementById('game-interface')?.style.display !== 'none',
                title: document.title,
                hasCharacter: localStorage.getItem('idleCultivation_hasCharacter') === 'true'
            };
        });

        console.log('Initial State:');
        console.log(`  - Title: ${initialState.title}`);
        console.log(`  - Character Creation: ${initialState.characterCreationVisible ? '✅ Visible' : '❌ Hidden'}`);
        console.log(`  - Game Interface: ${initialState.gameInterfaceVisible ? '✅ Visible' : '❌ Hidden'}`);
        console.log(`  - Has Existing Character: ${initialState.hasCharacter ? 'Yes' : 'No'}\n`);

        results.characterCreationVisible = initialState.characterCreationVisible;

        // 3. Try to create a character
        if (!initialState.hasCharacter) {
            console.log('🎮 Step 3: Attempting character creation...');

            // Check for fragment buttons
            const fragmentButtons = await page.$$('.fragment-choice');
            console.log(`  Found ${fragmentButtons.length} fragment choice buttons`);

            if (fragmentButtons.length >= 3) {
                // Select origin
                console.log('  Selecting origin...');
                const originButton = await page.$('[data-choice="dust-road"]');
                if (originButton) {
                    await originButton.click();
                    results.canSelectOrigin = true;
                    console.log('  ✅ Origin selected');
                } else {
                    console.log('  ❌ Origin button not found');
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                // Select vow
                console.log('  Selecting vow...');
                const vowButton = await page.$('[data-choice="protect"]');
                if (vowButton) {
                    await vowButton.click();
                    results.canSelectVow = true;
                    console.log('  ✅ Vow selected');
                } else {
                    console.log('  ❌ Vow button not found');
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                // Select mark
                console.log('  Selecting mark...');
                const markButton = await page.$('[data-choice="thunder"]');
                if (markButton) {
                    await markButton.click();
                    results.canSelectMark = true;
                    console.log('  ✅ Mark selected');
                } else {
                    console.log('  ❌ Mark button not found');
                }

                // Wait longer for polling to catch up
                console.log('  ⏱️ Waiting for state update...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check if begin button is enabled
                const beginButton = await page.$('#begin-cultivation');
                if (beginButton) {
                    const isDisabled = await page.evaluate(btn => btn.disabled, beginButton);
                    results.beginButtonEnabled = !isDisabled;

                    if (!isDisabled) {
                        console.log('  📍 Begin button enabled, clicking...');
                        await beginButton.click();
                        console.log('  ✅ Clicked Begin Cultivation');

                        // Wait for transition
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Check if character was created
                        const afterCreation = await page.evaluate(() => {
                            return {
                                characterCreationHidden: document.getElementById('character-creation')?.style.display === 'none',
                                gameInterfaceVisible: document.getElementById('game-interface')?.style.display !== 'none',
                                hasCharacter: localStorage.getItem('idleCultivation_hasCharacter') === 'true',
                                title: document.title
                            };
                        });

                        results.characterCreated = afterCreation.hasCharacter;
                        results.gameInterfaceShown = afterCreation.gameInterfaceVisible;

                        console.log('\n  After clicking Begin:');
                        console.log(`    - Character Creation: ${afterCreation.characterCreationHidden ? '✅ Hidden' : '❌ Still visible'}`);
                        console.log(`    - Game Interface: ${afterCreation.gameInterfaceVisible ? '✅ Visible' : '❌ Hidden'}`);
                        console.log(`    - Character Saved: ${afterCreation.hasCharacter ? '✅ Yes' : '❌ No'}`);
                        console.log(`    - Title: ${afterCreation.title}`);
                    } else {
                        console.log('  ❌ Begin button is disabled!');
                    }
                } else {
                    console.log('  ❌ Begin button not found');
                }
            } else {
                console.log('  ❌ Not enough fragment buttons found');
            }
        } else {
            console.log('🎮 Step 3: Character already exists, checking game state...');
            results.characterCreated = true;
            results.gameInterfaceShown = initialState.gameInterfaceVisible;
        }

        // 4. Check game elements
        console.log('\n🎯 Step 4: Checking game elements...');
        const gameElements = await page.evaluate(() => {
            return {
                buttons: document.querySelectorAll('button').length,
                gameView: !!document.getElementById('game-view'),
                statsDisplay: !!document.querySelector('.stats-display'),
                resourceDisplay: !!document.querySelector('.resources'),
                navigationButtons: document.querySelectorAll('.nav-button').length,
                gameModules: {
                    cultivation: typeof window.CultivationSystem !== 'undefined',
                    combat: typeof window.CombatSystem !== 'undefined',
                    skills: typeof window.SkillSystem !== 'undefined'
                }
            };
        });

        console.log('  Game Elements:');
        console.log(`    - Buttons: ${gameElements.buttons}`);
        console.log(`    - Game View: ${gameElements.gameView ? '✅ Present' : '❌ Missing'}`);
        console.log(`    - Stats Display: ${gameElements.statsDisplay ? '✅ Present' : '❌ Missing'}`);
        console.log(`    - Resources: ${gameElements.resourceDisplay ? '✅ Present' : '❌ Missing'}`);
        console.log(`    - Navigation: ${gameElements.navigationButtons} buttons`);
        console.log('  Game Modules:');
        console.log(`    - Cultivation: ${gameElements.gameModules.cultivation ? '✅' : '❌'}`);
        console.log(`    - Combat: ${gameElements.gameModules.combat ? '✅' : '❌'}`);
        console.log(`    - Skills: ${gameElements.gameModules.skills ? '✅' : '❌'}`);

        results.gameElementsPresent = gameElements.buttons > 0;

        // 5. Test save/load
        console.log('\n💾 Step 5: Testing save system...');
        const saveTest = await page.evaluate(() => {
            try {
                // Try to save
                if (window.gameState && window.gameState.save) {
                    window.gameState.save();
                    return { saved: true, error: null };
                }
                return { saved: false, error: 'Save function not found' };
            } catch (err) {
                return { saved: false, error: err.message };
            }
        });

        if (saveTest.saved) {
            console.log('  ✅ Save successful');
        } else {
            console.log(`  ❌ Save failed: ${saveTest.error}`);
        }

        // Wait to observe
        console.log('\n⏱️ Keeping browser open for 10 seconds to observe...');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        results.errorsFound.push(error.message);
    } finally {
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60) + '\n');

        const passedTests = Object.entries(results)
            .filter(([key, value]) => key !== 'errorsFound' && value === true);
        const failedTests = Object.entries(results)
            .filter(([key, value]) => key !== 'errorsFound' && value === false);

        console.log(`✅ Passed: ${passedTests.length}/9 tests`);
        passedTests.forEach(([key]) => {
            console.log(`  ✅ ${key}`);
        });

        console.log(`\n❌ Failed: ${failedTests.length}/9 tests`);
        failedTests.forEach(([key]) => {
            console.log(`  ❌ ${key}`);
        });

        if (results.errorsFound.length > 0) {
            console.log(`\n⚠️ Errors Found: ${results.errorsFound.length}`);
            results.errorsFound.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
            });
        }

        const success = passedTests.length >= 7 && results.errorsFound.length === 0;
        console.log(`\n🏁 Overall Result: ${success ? '✅ PASS' : '❌ FAIL'}`);

        await browser.close();
        process.exit(success ? 0 : 1);
    }
}

// Start server reminder
console.log('⚠️  Make sure server is running: python -m http.server 8080\n');

// Run test
testRealGameFlow().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});