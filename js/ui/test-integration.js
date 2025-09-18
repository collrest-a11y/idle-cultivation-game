/**
 * Integration Test for UI Framework with GameState and EventManager
 * Tests the interaction between UI components and core game systems
 */

class UIIntegrationTester {
    constructor() {
        this.tests = [];
        this.results = [];
        this.container = null;
    }

    async runTests() {
        console.log('🧪 Starting UI Integration Tests...');

        // Create test container
        this.createTestContainer();

        // Initialize core systems
        await this.initializeSystems();

        // Run individual tests
        await this.testUIManagerInitialization();
        await this.testComponentRegistration();
        await this.testModalIntegration();
        await this.testTabContainerPersistence();
        await this.testProgressBarAnimations();
        await this.testButtonInteractions();
        await this.testEventFlow();
        await this.testResponsiveSystem();
        await this.testThemeSystem();

        // Display results
        this.displayResults();

        // Cleanup
        this.cleanup();

        return this.results;
    }

    createTestContainer() {
        this.container = document.createElement('div');
        this.container.id = 'ui-test-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            padding: 20px;
            box-sizing: border-box;
            color: white;
            font-family: monospace;
            overflow-y: auto;
        `;

        const header = document.createElement('h2');
        header.textContent = 'UI Framework Integration Tests';
        header.style.margin = '0 0 20px 0';
        this.container.appendChild(header);

        this.testArea = document.createElement('div');
        this.testArea.style.cssText = `
            flex: 1;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        `;
        this.container.appendChild(this.testArea);

        this.resultsArea = document.createElement('div');
        this.resultsArea.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            height: 200px;
            overflow-y: auto;
        `;
        this.container.appendChild(this.resultsArea);

        document.body.appendChild(this.container);
    }

    async initializeSystems() {
        this.log('Initializing core systems...');

        try {
            // Initialize UIManager
            await window.uiManager.init({
                eventManager: window.eventManager,
                gameState: window.gameState,
                enablePerformanceMonitoring: true
            });

            // Connect GameState with EventManager
            window.gameState.setEventManager(window.eventManager);

            this.log('✅ Core systems initialized successfully');
            return true;
        } catch (error) {
            this.log(`❌ Failed to initialize systems: ${error.message}`);
            return false;
        }
    }

    async testUIManagerInitialization() {
        this.log('\n🔧 Testing UIManager initialization...');

        try {
            const debugInfo = window.uiManager.getDebugInfo();

            this.assert(debugInfo.isInitialized, 'UIManager should be initialized');
            this.assert(debugInfo.registeredThemes.includes('gfl-dark'), 'Should have gfl-dark theme');
            this.assert(debugInfo.currentTheme === 'gfl-dark', 'Should default to gfl-dark theme');
            this.assert(debugInfo.currentBreakpoint, 'Should detect current breakpoint');

            this.log('✅ UIManager initialization test passed');
        } catch (error) {
            this.log(`❌ UIManager initialization test failed: ${error.message}`);
        }
    }

    async testComponentRegistration() {
        this.log('\n📋 Testing component registration...');

        try {
            // Create a test button
            const button = new Button(this.testArea, {
                text: 'Test Button',
                variant: 'primary'
            });

            // Register with UIManager
            window.uiManager.registerComponent(button);

            // Mount the button
            button.mount();

            // Verify registration
            const components = window.uiManager.getAllComponents();
            this.assert(components.length > 0, 'Should have registered components');

            const retrievedButton = window.uiManager.getComponent(button.id);
            this.assert(retrievedButton === button, 'Should retrieve the correct component');

            const buttonComponents = window.uiManager.getComponentsByType('Button');
            this.assert(buttonComponents.includes(button), 'Should find button by type');

            // Test theme application
            this.assert(button.element.getAttribute('data-theme') === 'gfl-dark', 'Should apply current theme');

            // Cleanup
            window.uiManager.destroyComponent(button.id);

            this.log('✅ Component registration test passed');
        } catch (error) {
            this.log(`❌ Component registration test failed: ${error.message}`);
        }
    }

    async testModalIntegration() {
        this.log('\n🔲 Testing Modal integration...');

        try {
            let eventReceived = false;

            // Listen for modal events
            const unsubscribe = window.eventManager.on('modal:shown', () => {
                eventReceived = true;
            });

            // Create and show modal
            const modal = Modal.create({
                title: 'Test Modal',
                content: 'This is a test modal for integration testing.',
                buttons: [
                    { text: 'Close', className: 'btn-secondary' }
                ]
            });

            await modal.show();

            // Wait for event
            await this.wait(100);

            this.assert(eventReceived, 'Should emit modal:shown event');
            this.assert(modal.isOpen(), 'Modal should be open');
            this.assert(document.body.style.overflow === 'hidden', 'Should prevent body scroll');

            // Test focus management
            const focusableElements = modal.element.querySelectorAll('button');
            this.assert(focusableElements.length > 0, 'Should have focusable elements');

            // Close modal
            await modal.hide();
            this.assert(!modal.isOpen(), 'Modal should be closed');

            // Cleanup
            unsubscribe();
            modal.destroy();

            this.log('✅ Modal integration test passed');
        } catch (error) {
            this.log(`❌ Modal integration test failed: ${error.message}`);
        }
    }

    async testTabContainerPersistence() {
        this.log('\n📑 Testing TabContainer state persistence...');

        try {
            const storageKey = 'test-tab-container';

            // Create tab container with persistence
            const tabContainer = new TabContainer(this.testArea, {
                persistState: true,
                storageKey: storageKey,
                tabs: [
                    { title: 'Tab 1', content: 'Content 1' },
                    { title: 'Tab 2', content: 'Content 2' },
                    { title: 'Tab 3', content: 'Content 3' }
                ]
            });

            tabContainer.mount();

            // Change active tab
            tabContainer.setActiveTab(1);
            await this.wait(100);

            this.assert(tabContainer.getActiveIndex() === 1, 'Should change active tab');

            // Simulate page reload by creating new instance
            tabContainer.destroy();

            const newTabContainer = new TabContainer(this.testArea, {
                persistState: true,
                storageKey: storageKey,
                tabs: [
                    { title: 'Tab 1', content: 'Content 1' },
                    { title: 'Tab 2', content: 'Content 2' },
                    { title: 'Tab 3', content: 'Content 3' }
                ]
            });

            newTabContainer.mount();

            this.assert(newTabContainer.getActiveIndex() === 1, 'Should restore persisted state');

            // Cleanup
            newTabContainer.destroy();
            localStorage.removeItem(storageKey);

            this.log('✅ TabContainer persistence test passed');
        } catch (error) {
            this.log(`❌ TabContainer persistence test failed: ${error.message}`);
        }
    }

    async testProgressBarAnimations() {
        this.log('\n📊 Testing ProgressBar animations...');

        try {
            let animationComplete = false;

            // Create progress bar
            const progressBar = new ProgressBar(this.testArea, {
                value: 0,
                max: 100,
                animated: true,
                showLabel: true
            });

            progressBar.mount();

            // Listen for animation complete event
            const unsubscribe = progressBar.on('progress:animation-complete', () => {
                animationComplete = true;
            });

            // Set value to trigger animation
            progressBar.setValue(75);

            // Wait for animation
            await this.wait(500);

            this.assert(progressBar.getValue() === 75, 'Should update value');
            this.assert(animationComplete, 'Should complete animation');

            const percentage = progressBar.getPercentage();
            this.assert(percentage === 75, 'Should calculate correct percentage');

            // Test increment
            progressBar.increment(10);
            await this.wait(100);
            this.assert(progressBar.getValue() === 85, 'Should increment value');

            // Cleanup
            unsubscribe();
            progressBar.destroy();

            this.log('✅ ProgressBar animation test passed');
        } catch (error) {
            this.log(`❌ ProgressBar animation test failed: ${error.message}`);
        }
    }

    async testButtonInteractions() {
        this.log('\n🔘 Testing Button interactions...');

        try {
            let clickReceived = false;
            let cooldownComplete = false;

            // Create button with cooldown
            const button = new Button(this.testArea, {
                text: 'Test Button',
                variant: 'primary',
                cooldown: 200,
                onClick: () => {
                    clickReceived = true;
                }
            });

            button.mount();

            // Listen for cooldown complete
            const unsubscribe = button.on('button:cooldown-complete', () => {
                cooldownComplete = true;
            });

            // Test click
            button.click();
            await this.wait(50);

            this.assert(clickReceived, 'Should receive click event');
            this.assert(!button.isEnabled(), 'Should be disabled during cooldown');

            // Wait for cooldown
            await this.wait(250);

            this.assert(cooldownComplete, 'Should complete cooldown');
            this.assert(button.isEnabled(), 'Should be enabled after cooldown');

            // Test state changes
            button.setLoading(true);
            this.assert(button.isLoading(), 'Should set loading state');
            this.assert(!button.isEnabled(), 'Should be disabled when loading');

            button.setLoading(false);
            this.assert(!button.isLoading(), 'Should clear loading state');

            // Cleanup
            unsubscribe();
            button.destroy();

            this.log('✅ Button interaction test passed');
        } catch (error) {
            this.log(`❌ Button interaction test failed: ${error.message}`);
        }
    }

    async testEventFlow() {
        this.log('\n⚡ Testing event flow between components and game state...');

        try {
            let gameStateChanged = false;
            let uiEventReceived = false;

            // Listen for game state changes
            const gameStateUnsubscribe = window.eventManager.on('gameState:changed', () => {
                gameStateChanged = true;
            });

            // Listen for UI events
            const uiUnsubscribe = window.eventManager.on('button:click', () => {
                uiEventReceived = true;
            });

            // Create button that modifies game state
            const button = new Button(this.testArea, {
                text: 'Add Jade',
                variant: 'success',
                onClick: () => {
                    window.gameState.increment('player.jade', 100);
                }
            });

            button.mount();

            // Test initial value
            const initialJade = window.gameState.get('player.jade');
            this.assert(typeof initialJade === 'number', 'Should have initial jade value');

            // Click button to trigger state change
            button.click();
            await this.wait(50);

            const newJade = window.gameState.get('player.jade');
            this.assert(newJade === initialJade + 100, 'Should update game state');
            this.assert(gameStateChanged, 'Should emit gameState:changed event');
            this.assert(uiEventReceived, 'Should emit button:click event');

            // Cleanup
            gameStateUnsubscribe();
            uiUnsubscribe();
            button.destroy();

            this.log('✅ Event flow test passed');
        } catch (error) {
            this.log(`❌ Event flow test failed: ${error.message}`);
        }
    }

    async testResponsiveSystem() {
        this.log('\n📱 Testing responsive system...');

        try {
            const initialBreakpoint = window.uiManager.currentBreakpoint;
            this.assert(initialBreakpoint, 'Should detect initial breakpoint');

            // Test theme application to components
            const button = new Button(this.testArea, {
                text: 'Responsive Test',
                responsive: true
            });

            button.mount();
            window.uiManager.registerComponent(button);

            // Verify breakpoint class is applied
            const breakpointClass = `breakpoint-${initialBreakpoint}`;
            this.assert(
                button.element.classList.contains(breakpointClass),
                `Should have breakpoint class: ${breakpointClass}`
            );

            // Cleanup
            window.uiManager.destroyComponent(button.id);

            this.log('✅ Responsive system test passed');
        } catch (error) {
            this.log(`❌ Responsive system test failed: ${error.message}`);
        }
    }

    async testThemeSystem() {
        this.log('\n🎨 Testing theme system...');

        try {
            const initialTheme = window.uiManager.currentTheme;
            this.assert(initialTheme === 'gfl-dark', 'Should start with gfl-dark theme');

            // Create component to test theme application
            const button = new Button(this.testArea, {
                text: 'Theme Test',
                variant: 'primary'
            });

            button.mount();
            window.uiManager.registerComponent(button);

            // Verify initial theme
            this.assert(
                button.element.getAttribute('data-theme') === 'gfl-dark',
                'Should have dark theme applied'
            );

            // Switch to light theme
            window.uiManager.setTheme('gfl-light');
            await this.wait(50);

            this.assert(
                window.uiManager.currentTheme === 'gfl-light',
                'Should switch to light theme'
            );

            this.assert(
                button.element.getAttribute('data-theme') === 'gfl-light',
                'Should apply light theme to component'
            );

            // Switch back to dark theme
            window.uiManager.setTheme('gfl-dark');
            await this.wait(50);

            // Cleanup
            window.uiManager.destroyComponent(button.id);

            this.log('✅ Theme system test passed');
        } catch (error) {
            this.log(`❌ Theme system test failed: ${error.message}`);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.log(message);
        if (this.resultsArea) {
            const line = document.createElement('div');
            line.textContent = message;
            line.style.marginBottom = '2px';
            if (message.includes('✅')) {
                line.style.color = '#2ed573';
            } else if (message.includes('❌')) {
                line.style.color = '#ff4757';
            } else if (message.includes('🧪') || message.includes('🔧') || message.includes('📋')) {
                line.style.color = '#00d4ff';
                line.style.fontWeight = 'bold';
            }
            this.resultsArea.appendChild(line);
            this.resultsArea.scrollTop = this.resultsArea.scrollHeight;
        }
    }

    displayResults() {
        const passedCount = this.results.filter(r => r.passed).length;
        const totalCount = this.results.length;

        this.log(`\n📊 Test Summary: ${passedCount}/${totalCount} tests passed`);

        if (passedCount === totalCount) {
            this.log('🎉 All tests passed! UI Framework integration is working correctly.');
        } else {
            this.log('⚠️ Some tests failed. Please check the implementation.');
        }

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close Tests';
        closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
        `;
        closeButton.onclick = () => this.cleanup();
        this.container.appendChild(closeButton);
    }

    cleanup() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Clear any test data from localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('test-')) {
                localStorage.removeItem(key);
            }
        });

        console.log('🧹 Test cleanup completed');
    }
}

// Auto-run tests if this script is loaded
if (typeof window !== 'undefined') {
    window.UIIntegrationTester = UIIntegrationTester;

    // Add test runner to global scope for manual execution
    window.runUITests = async function() {
        const tester = new UIIntegrationTester();
        return await tester.runTests();
    };

    // Auto-run if all dependencies are available
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.uiManager && window.eventManager && window.gameState &&
                window.BaseComponent && window.Modal && window.TabContainer &&
                window.ProgressBar && window.Button) {
                console.log('🚀 UI Framework dependencies detected. Run window.runUITests() to test integration.');
            }
        }, 1000);
    });
}

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UIIntegrationTester };
}