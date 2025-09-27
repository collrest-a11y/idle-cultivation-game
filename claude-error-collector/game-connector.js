/**
 * Claude Error Connector
 * Add this script to your game to send errors to the collector
 *
 * Usage:
 * <script src="claude-error-collector/game-connector.js"></script>
 */

(function() {
    'use strict';

    // Configuration
    const COLLECTOR_URL = 'http://localhost:8081/claude-error-collector/';
    const COLLECTOR_WINDOW_NAME = 'ClaudeErrorCollector';

    let collectorWindow = null;
    let errorQueue = [];
    let userActions = [];
    const MAX_ACTIONS = 20;
    const MAX_QUEUE_SIZE = 100;

    // Try to find existing collector window
    function findCollectorWindow() {
        try {
            // Try to access the collector window
            if (collectorWindow && !collectorWindow.closed) {
                return collectorWindow;
            }

            // Try to open/find by name
            collectorWindow = window.open('', COLLECTOR_WINDOW_NAME);
            if (collectorWindow && collectorWindow.location.href.includes('claude-error-collector')) {
                return collectorWindow;
            }
        } catch (e) {
            // Cross-origin or other errors
        }
        return null;
    }

    // Send error to collector
    function sendToCollector(data) {
        const collector = findCollectorWindow();
        if (collector) {
            try {
                collector.postMessage(data, '*');
                return true;
            } catch (e) {
                console.error('Failed to send to collector:', e);
            }
        }

        // Queue if collector not available
        errorQueue.push(data);
        if (errorQueue.length > MAX_QUEUE_SIZE) {
            errorQueue.shift();
        }

        return false;
    }

    // Capture errors
    window.addEventListener('error', (event) => {
        const errorData = {
            type: 'game-error',
            error: {
                message: event.message,
                file: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                userActions: userActions.slice(-10),
                gameState: captureGameState(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        };

        sendToCollector(errorData);

        // Log to console as well
        console.error('📍 Error captured for Claude:', errorData.error);
    });

    // Capture promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const errorData = {
            type: 'game-error',
            error: {
                message: 'Unhandled Promise Rejection: ' + event.reason,
                stack: event.reason?.stack || String(event.reason),
                userActions: userActions.slice(-10),
                gameState: captureGameState(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        };

        sendToCollector(errorData);
    });

    // Track user actions
    function trackAction(action) {
        userActions.push(action);
        if (userActions.length > MAX_ACTIONS) {
            userActions.shift();
        }

        // Send to collector
        sendToCollector({
            type: 'user-action',
            action: action
        });
    }

    // Track clicks
    document.addEventListener('click', (event) => {
        const target = event.target;
        const action = `Click: ${target.tagName}${target.id ? '#' + target.id : ''}${target.className ? '.' + target.className.split(' ')[0] : ''} "${target.textContent?.substring(0, 30) || ''}"`;
        trackAction(action);
    }, true);

    // Track form submissions
    document.addEventListener('submit', (event) => {
        const form = event.target;
        trackAction(`Submit form: ${form.id || form.name || 'unnamed'}`);
    }, true);

    // Track input changes
    document.addEventListener('change', (event) => {
        const input = event.target;
        if (input.tagName === 'INPUT' || input.tagName === 'SELECT') {
            trackAction(`Change: ${input.id || input.name || input.tagName} = "${input.value?.substring(0, 30) || ''}"`)
        }
    }, true);

    // Capture game state
    function captureGameState() {
        const state = {};

        // Try to capture common game state
        try {
            if (window.game) {
                state.game = {
                    initialized: window.game.initialized,
                    running: window.game.running,
                    paused: window.game.paused,
                    version: window.game.version
                };
            }

            if (window.gameState || window.game?.gameState) {
                const gs = window.gameState || window.game.gameState;
                if (gs.get) {
                    state.player = gs.get('player');
                    state.level = gs.get('level');
                    state.resources = gs.get('resources');
                    state.saveData = gs.get('lastSave');
                }
            }

            // Capture any global variables that might be relevant
            if (window.player) state.player = { level: window.player.level, hp: window.player.hp };
            if (window.resources) state.resources = window.resources;
            if (window.inventory) state.inventorySize = window.inventory.length;

            // Performance metrics
            if (window.performance) {
                state.performance = {
                    memory: window.performance.memory?.usedJSHeapSize,
                    timing: window.performance.timing?.loadEventEnd - window.performance.timing?.navigationStart
                };
            }

            // Current view/screen
            state.currentView = document.querySelector('[data-view]')?.dataset.view || 'unknown';
            state.activeModals = Array.from(document.querySelectorAll('.modal.active')).map(m => m.id);

        } catch (e) {
            // Ignore errors in capturing state
        }

        return state;
    }

    // Periodically flush error queue
    setInterval(() => {
        if (errorQueue.length > 0) {
            const collector = findCollectorWindow();
            if (collector) {
                while (errorQueue.length > 0) {
                    const data = errorQueue.shift();
                    try {
                        collector.postMessage(data, '*');
                    } catch (e) {
                        // Put it back if failed
                        errorQueue.unshift(data);
                        break;
                    }
                }
            }
        }
    }, 5000);

    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.id = 'claude-error-indicator';
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        background: rgba(74, 222, 128, 0.9);
        color: black;
        border-radius: 15px;
        font-family: monospace;
        font-size: 11px;
        z-index: 99999;
        cursor: pointer;
        transition: all 0.3s;
        user-select: none;
    `;
    indicator.innerHTML = '🤖 Claude Connected';
    indicator.title = 'Click to open error collector';

    // Click to open collector
    indicator.addEventListener('click', () => {
        collectorWindow = window.open(COLLECTOR_URL, COLLECTOR_WINDOW_NAME,
            'width=1200,height=800,menubar=no,toolbar=no');
    });

    // Flash on error
    window.addEventListener('error', () => {
        indicator.style.background = 'rgba(248, 113, 113, 0.9)';
        indicator.innerHTML = '🤖 Error Captured!';
        setTimeout(() => {
            indicator.style.background = 'rgba(74, 222, 128, 0.9)';
            indicator.innerHTML = '🤖 Claude Connected';
        }, 2000);
    });

    document.body.appendChild(indicator);

    // Enhanced error capture for PM system
    const originalConsoleError = console.error;
    console.error = function(...args) {
        originalConsoleError.apply(console, args);

        // Capture console errors too
        const errorData = {
            type: 'game-error',
            error: {
                message: 'Console Error: ' + args.map(a => String(a)).join(' '),
                file: 'console',
                line: 0,
                column: 0,
                stack: new Error().stack,
                userActions: userActions.slice(-10),
                gameState: captureGameState(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        };

        sendToCollector(errorData);
    };

    // Console message
    console.log('%c🤖 Claude Error Connector Active', 'background: #4ade80; color: black; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
    console.log('Errors will be sent to the Claude Error Collector window');
    console.log('Click the green indicator in the bottom-right to open the collector');
    console.log('Errors can be converted to PM issues for structured fixes');

})();