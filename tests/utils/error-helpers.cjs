/**
 * Error Testing Utilities and Helpers
 * Provides comprehensive error injection, validation, and measurement tools for Playwright tests
 */

/**
 * Error injection utilities for creating various types of errors
 */
class ErrorInjector {
    constructor(page) {
        this.page = page;
        this.injectedErrors = [];
        this.errorCallbacks = new Map();
    }

    /**
     * Inject JavaScript runtime error
     */
    async injectJavaScriptError(message = 'Injected test error', delay = 0) {
        const errorCode = `
            setTimeout(() => {
                throw new Error('${message}');
            }, ${delay});
        `;

        await this.page.evaluate(errorCode);
        this.injectedErrors.push({ type: 'javascript', message, timestamp: Date.now() });
    }

    /**
     * Inject reference error (undefined variable)
     */
    async injectReferenceError(variableName = 'undefinedTestVariable', delay = 0) {
        const errorCode = `
            setTimeout(() => {
                ${variableName}.someMethod();
            }, ${delay});
        `;

        await this.page.evaluate(errorCode);
        this.injectedErrors.push({ type: 'reference', variable: variableName, timestamp: Date.now() });
    }

    /**
     * Inject network error by intercepting requests
     */
    async injectNetworkError(urlPattern = '**/api/**', statusCode = 500) {
        await this.page.route(urlPattern, route => {
            route.abort('failed');
        });

        this.injectedErrors.push({ type: 'network', pattern: urlPattern, timestamp: Date.now() });
    }

    /**
     * Inject memory pressure by creating large objects
     */
    async injectMemoryPressure(sizeMB = 100) {
        const memoryCode = `
            window.testMemoryLeak = [];
            for (let i = 0; i < ${sizeMB}; i++) {
                window.testMemoryLeak.push(new Array(1024 * 1024).fill('x'));
            }
        `;

        await this.page.evaluate(memoryCode);
        this.injectedErrors.push({ type: 'memory', sizeMB, timestamp: Date.now() });
    }

    /**
     * Inject DOM manipulation error
     */
    async injectDOMError(selector = '#nonexistent-element') {
        const domCode = `
            document.querySelector('${selector}').innerHTML = 'test';
        `;

        await this.page.evaluate(domCode);
        this.injectedErrors.push({ type: 'dom', selector, timestamp: Date.now() });
    }

    /**
     * Inject local storage corruption
     */
    async injectStorageCorruption() {
        const storageCode = `
            localStorage.setItem('gameData', 'corrupted{invalid:json}');
            localStorage.setItem('playerState', '{"invalid": json}');
        `;

        await this.page.evaluate(storageCode);
        this.injectedErrors.push({ type: 'storage', timestamp: Date.now() });
    }

    /**
     * Clear all injected errors and cleanup
     */
    async cleanup() {
        await this.page.evaluate(() => {
            if (window.testMemoryLeak) {
                delete window.testMemoryLeak;
            }
        });

        await this.page.unrouteAll();
        this.injectedErrors = [];
    }

    /**
     * Get list of all injected errors
     */
    getInjectedErrors() {
        return [...this.injectedErrors];
    }
}

/**
 * State verification utilities for validating game state
 */
class StateValidator {
    constructor(page) {
        this.page = page;
    }

    /**
     * Validate game state integrity
     */
    async validateGameState() {
        return await this.page.evaluate(() => {
            const gameState = window.gameState;
            if (!gameState) return { valid: false, reason: 'GameState not found' };

            const checks = {
                hasPlayer: !!gameState.player,
                hasProgress: !!gameState.progress,
                hasResources: !!gameState.resources,
                hasValidTimestamp: gameState.lastUpdate && gameState.lastUpdate > 0
            };

            const valid = Object.values(checks).every(check => check);
            return { valid, checks, state: gameState };
        });
    }

    /**
     * Validate save data integrity
     */
    async validateSaveData() {
        return await this.page.evaluate(() => {
            try {
                const saveData = localStorage.getItem('gameData');
                if (!saveData) return { valid: false, reason: 'No save data found' };

                const parsed = JSON.parse(saveData);
                const checks = {
                    validJSON: true,
                    hasVersion: !!parsed.version,
                    hasTimestamp: !!parsed.timestamp,
                    hasPlayerData: !!parsed.player
                };

                const valid = Object.values(checks).every(check => check);
                return { valid, checks, data: parsed };
            } catch (error) {
                return { valid: false, reason: 'Invalid JSON', error: error.message };
            }
        });
    }

    /**
     * Validate UI state consistency
     */
    async validateUIState() {
        const elements = await this.page.evaluate(() => {
            return {
                gameContainer: !!document.querySelector('#game-container'),
                playerInfo: !!document.querySelector('.player-info'),
                errorDashboard: !!document.querySelector('.error-dashboard'),
                notifications: !!document.querySelector('.notifications')
            };
        });

        return {
            valid: Object.values(elements).every(exists => exists),
            elements
        };
    }
}

/**
 * Performance measurement utilities
 */
class PerformanceMonitor {
    constructor(page) {
        this.page = page;
        this.measurements = [];
    }

    /**
     * Start performance measurement
     */
    async startMeasurement(label) {
        await this.page.evaluate((label) => {
            performance.mark(`${label}-start`);
        }, label);
    }

    /**
     * End performance measurement
     */
    async endMeasurement(label) {
        const duration = await this.page.evaluate((label) => {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);

            const measure = performance.getEntriesByName(label)[0];
            return measure ? measure.duration : 0;
        }, label);

        this.measurements.push({ label, duration, timestamp: Date.now() });
        return duration;
    }

    /**
     * Measure memory usage
     */
    async measureMemory() {
        return await this.page.evaluate(() => {
            if (performance.memory) {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        });
    }

    /**
     * Get all measurements
     */
    getMeasurements() {
        return [...this.measurements];
    }

    /**
     * Clear measurements
     */
    clearMeasurements() {
        this.measurements = [];
    }
}

/**
 * Error monitoring utilities
 */
class ErrorMonitor {
    constructor(page) {
        this.page = page;
        this.capturedErrors = [];
        this.isListening = false;
    }

    /**
     * Start listening for errors
     */
    async startListening() {
        if (this.isListening) return;

        // Listen for console errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.capturedErrors.push({
                    type: 'console',
                    message: msg.text(),
                    timestamp: Date.now()
                });
            }
        });

        // Listen for page errors
        this.page.on('pageerror', error => {
            this.capturedErrors.push({
                type: 'pageerror',
                message: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });
        });

        // Inject error listener into the page
        await this.page.addInitScript(() => {
            window.testErrorCapture = [];
            window.addEventListener('error', (event) => {
                window.testErrorCapture.push({
                    type: 'error',
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    timestamp: Date.now()
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                window.testErrorCapture.push({
                    type: 'unhandledrejection',
                    reason: event.reason?.toString() || 'Unknown rejection',
                    timestamp: Date.now()
                });
            });
        });

        this.isListening = true;
    }

    /**
     * Stop listening for errors
     */
    stopListening() {
        this.isListening = false;
        this.page.removeAllListeners('console');
        this.page.removeAllListeners('pageerror');
    }

    /**
     * Get captured errors from both Playwright and page
     */
    async getCapturedErrors() {
        const pageErrors = await this.page.evaluate(() => {
            return window.testErrorCapture || [];
        });

        return {
            playwrightErrors: [...this.capturedErrors],
            pageErrors: pageErrors,
            totalCount: this.capturedErrors.length + pageErrors.length
        };
    }

    /**
     * Clear captured errors
     */
    async clearCapturedErrors() {
        this.capturedErrors = [];
        await this.page.evaluate(() => {
            window.testErrorCapture = [];
        });
    }

    /**
     * Wait for specific error to occur
     */
    async waitForError(errorPattern, timeout = 5000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const errors = await this.getCapturedErrors();
            const allErrors = [...errors.playwrightErrors, ...errors.pageErrors];

            const foundError = allErrors.find(error => {
                if (typeof errorPattern === 'string') {
                    return error.message?.includes(errorPattern);
                } else if (errorPattern instanceof RegExp) {
                    return errorPattern.test(error.message || '');
                }
                return false;
            });

            if (foundError) {
                return foundError;
            }

            await this.page.waitForTimeout(100);
        }

        throw new Error(`Error pattern '${errorPattern}' not found within ${timeout}ms`);
    }
}

/**
 * Screenshot comparison utilities
 */
class ScreenshotComparator {
    constructor(page) {
        this.page = page;
    }

    /**
     * Take screenshot with error overlay
     */
    async takeErrorScreenshot(fileName) {
        return await this.page.screenshot({
            path: `tests/screenshots/errors/${fileName}`,
            fullPage: true
        });
    }

    /**
     * Compare screenshots before and after error
     */
    async compareErrorRecovery(beforeFileName, afterFileName) {
        const before = await this.page.screenshot({ fullPage: true });
        const after = await this.page.screenshot({ fullPage: true });

        // Simple comparison - in real scenario, use image comparison library
        return {
            beforeSize: before.length,
            afterSize: after.length,
            identical: before.equals(after)
        };
    }
}

/**
 * Test data generators for creating consistent test scenarios
 */
class TestDataGenerator {
    /**
     * Generate corrupted save data
     */
    static generateCorruptedSaveData() {
        return [
            '{"invalid": json}',
            '{incomplete',
            'null',
            '{"version": null}',
            '{"player": {"hp": "invalid"}}',
            ''
        ];
    }

    /**
     * Generate various error scenarios
     */
    static generateErrorScenarios() {
        return [
            {
                name: 'Division by zero',
                code: 'let result = 10 / 0; console.log(result);',
                expected: 'Infinity'
            },
            {
                name: 'Null pointer access',
                code: 'let obj = null; obj.property;',
                expected: 'TypeError'
            },
            {
                name: 'Array index out of bounds',
                code: 'let arr = [1,2,3]; arr[100].method();',
                expected: 'TypeError'
            },
            {
                name: 'Circular reference',
                code: 'let a = {}; a.self = a; JSON.stringify(a);',
                expected: 'TypeError'
            }
        ];
    }

    /**
     * Generate performance stress scenarios
     */
    static generateStressScenarios() {
        return [
            {
                name: 'Large array creation',
                code: 'new Array(10000000).fill(Math.random())',
                memoryImpact: 'high'
            },
            {
                name: 'Infinite loop (controlled)',
                code: 'let i = 0; while(i < 100000) { i++; Math.random(); }',
                cpuImpact: 'high'
            },
            {
                name: 'DOM manipulation stress',
                code: 'for(let i = 0; i < 1000; i++) { document.body.appendChild(document.createElement("div")); }',
                domImpact: 'high'
            }
        ];
    }
}

/**
 * Helper functions for common test operations
 */
class TestHelpers {
    /**
     * Wait for game to fully load
     */
    static async waitForGameLoad(page, timeout = 10000) {
        await page.waitForFunction(() => {
            return window.gameState && window.gameState.initialized === true;
        }, { timeout });
    }

    /**
     * Initialize fresh game state
     */
    static async initializeFreshGame(page) {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            if (window.gameState) {
                window.gameState.reset();
            }
        });

        await page.reload();
        await this.waitForGameLoad(page);
    }

    /**
     * Create saved game state for testing
     */
    static async createTestSaveData(page, playerLevel = 1, resources = {}) {
        const saveData = {
            version: '1.0.0',
            timestamp: Date.now(),
            player: {
                level: playerLevel,
                experience: playerLevel * 100,
                name: 'TestPlayer'
            },
            resources: {
                gold: 1000,
                spirit: 500,
                ...resources
            },
            progress: {
                currentLocation: 'starting-village',
                completedQuests: []
            }
        };

        await page.evaluate((data) => {
            localStorage.setItem('gameData', JSON.stringify(data));
        }, saveData);

        return saveData;
    }

    /**
     * Trigger specific game events for testing
     */
    static async triggerGameEvent(page, eventType, eventData = {}) {
        return await page.evaluate((type, data) => {
            if (window.eventManager) {
                return window.eventManager.trigger(type, data);
            }
            return false;
        }, eventType, eventData);
    }

    /**
     * Get current error handler statistics
     */
    static async getErrorHandlerStats(page) {
        return await page.evaluate(() => {
            if (window.errorManager) {
                return {
                    totalErrors: window.errorManager.statistics.totalErrors,
                    criticalErrors: window.errorManager.statistics.criticalErrors,
                    recoveredErrors: window.errorManager.statistics.recoveredErrors,
                    errorLog: window.errorManager.errorLog.slice(-10) // Last 10 errors
                };
            }
            return null;
        });
    }
}

module.exports = {
    ErrorInjector,
    StateValidator,
    PerformanceMonitor,
    ErrorMonitor,
    ScreenshotComparator,
    TestDataGenerator,
    TestHelpers
};