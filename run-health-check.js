const puppeteer = require('puppeteer');

async function runHealthCheck() {
    console.log('🏥 Running Health Check on Idle Cultivation Game...\n');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Capture console logs
        const logs = [];
        const errors = [];

        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            if (msg.type() === 'error') {
                errors.push(text);
            }
        });

        page.on('pageerror', error => {
            errors.push(error.toString());
        });

        // Navigate to page
        console.log('📂 Loading game...');
        await page.goto('http://localhost:8080/index.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for game initialization
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Run health check
        console.log('🔍 Running health check...\n');

        const healthReport = await page.evaluate(async () => {
            // Check if health check system exists
            if (typeof window.HealthCheck === 'undefined') {
                return { error: 'Health check system not loaded' };
            }

            // Run all health checks
            await window.HealthCheck.runAllChecks();
            return window.HealthCheck.getReport();
        });

        // Display results
        if (healthReport.error) {
            console.error('❌ Error:', healthReport.error);
        } else {
            console.log('='.repeat(60));
            console.log('HEALTH CHECK REPORT');
            console.log('='.repeat(60));

            // Overall status
            const statusEmoji = {
                'healthy': '✅',
                'warning': '⚠️',
                'critical': '🚨',
                'error': '❌',
                'unknown': '❓'
            };

            console.log(`\n🏥 Overall Status: ${statusEmoji[healthReport.status] || '❓'} ${healthReport.status?.toUpperCase() || 'UNKNOWN'}`);
            console.log(`📝 ${healthReport.message || 'No message'}\n`);

            // Summary
            console.log('📊 Summary:');
            if (healthReport.summary) {
                console.log(`  ✅ Healthy: ${healthReport.summary.healthy || 0}`);
                console.log(`  ⚠️  Warning: ${healthReport.summary.warning || 0}`);
                console.log(`  🚨 Critical: ${healthReport.summary.critical || 0}`);
                console.log(`  ❌ Error: ${healthReport.summary.error || 0}`);
                console.log(`  ❓ Unknown: ${healthReport.summary.unknown || 0}`);
            }

            // Individual checks
            console.log('\n🔍 Individual Checks:');
            console.log('-'.repeat(60));

            if (healthReport.results && Array.isArray(healthReport.results)) {
                healthReport.results.forEach(check => {
                    const emoji = statusEmoji[check.status] || '❓';
                    console.log(`${emoji} ${check.name}: ${check.status}`);
                    console.log(`   ${check.message}`);

                    // Show details for non-healthy checks
                    if (check.status !== 'healthy' && check.details) {
                        console.log(`   Details: ${JSON.stringify(check.details, null, 2).replace(/\n/g, '\n   ')}`);
                    }
                });
            } else {
                console.log('No individual check results available');
            }

            // Critical errors
            if (healthReport.criticalErrors && healthReport.criticalErrors.length > 0) {
                console.log('\n🚨 Critical Errors:');
                healthReport.criticalErrors.forEach((error, i) => {
                    console.log(`  ${i + 1}. ${error.name}: ${error.message}`);
                });
            }

            // Warnings
            if (healthReport.warnings && healthReport.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                healthReport.warnings.forEach((warning, i) => {
                    console.log(`  ${i + 1}. ${warning.name}: ${warning.message}`);
                });
            }

            // System info
            console.log('\n💻 System Info:');
            if (healthReport.uptime) {
                console.log(`  Uptime: ${(healthReport.uptime / 1000).toFixed(2)}s`);
            }
            if (healthReport.timestamp) {
                console.log(`  Checked at: ${new Date(healthReport.timestamp).toLocaleString()}`);
            }
        }

        // Check for JavaScript errors
        if (errors.length > 0) {
            console.log('\n❌ JavaScript Errors Detected:');
            errors.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ No JavaScript errors detected');
        }

        // Additional manual checks
        console.log('\n📋 Additional Checks:');

        // Check game initialization
        const gameState = await page.evaluate(() => {
            return {
                hasGame: typeof window.game !== 'undefined',
                hasGameState: typeof window.gameState !== 'undefined',
                hasEventManager: typeof window.eventManager !== 'undefined',
                hasErrorManager: typeof window.errorManager !== 'undefined',
                hasHealthCheck: typeof window.HealthCheck !== 'undefined',
                hasProductionConfig: typeof window.PRODUCTION_CONFIG !== 'undefined'
            };
        });

        Object.entries(gameState).forEach(([key, value]) => {
            const emoji = value ? '✅' : '❌';
            const status = value ? 'Loaded' : 'Not Loaded';
            console.log(`  ${emoji} ${key}: ${status}`);
        });

        // Check UI elements
        const uiState = await page.evaluate(() => {
            return {
                gameInterface: !!document.getElementById('game-interface'),
                gameView: !!document.getElementById('game-view'),
                characterCreation: !!document.getElementById('character-creation'),
                buttonCount: document.querySelectorAll('button').length,
                hasContent: document.body.innerHTML.length > 1000
            };
        });

        console.log('\n🎮 UI State:');
        console.log(`  Game Interface: ${uiState.gameInterface ? '✅ Present' : '❌ Missing'}`);
        console.log(`  Game View: ${uiState.gameView ? '✅ Present' : '❌ Missing'}`);
        console.log(`  Character Creation: ${uiState.characterCreation ? '✅ Present' : '❌ Missing'}`);
        console.log(`  Buttons: ${uiState.buttonCount}`);
        console.log(`  Has Content: ${uiState.hasContent ? '✅ Yes' : '❌ No'}`);

        console.log('\n'.repeat(1));
        console.log('='.repeat(60));
        console.log('HEALTH CHECK COMPLETE');
        console.log('='.repeat(60));

        // Return overall status
        return healthReport.status || 'unknown';

    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return 'error';
    } finally {
        await browser.close();
    }
}

// Run the health check
runHealthCheck().then(status => {
    console.log(`\n🏁 Final Status: ${status}`);
    process.exit(status === 'healthy' ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});